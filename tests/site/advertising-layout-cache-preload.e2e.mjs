// Head preload of the one-filter layout cache file (advertising-masonry R6): a direct load of a grid page requests the file
// while the page head is parsed, before detail.js finishes, exactly once, and the browser never reports it as unused.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/advertising-layout-cache-preload.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".tooling/browsers");

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined });
// The whole-band file (layout-cache/<band>.mjs) is a later runtime step and not counted here.
// 384 px is band 2:15, 1440 px is band 4:35; the cluster page also checks a non-"all" filter name.
const cases = [
  { width: 384, route: "/vi/advertising-products/", file: "/advertising-products/layout-cache/2-15/all.mjs" },
  { width: 1440, route: "/vi/advertising-products/", file: "/advertising-products/layout-cache/4-35/all.mjs" },
  { width: 1440, route: "/vi/advertising-products/bang-hieu-quang-cao/", file: "/advertising-products/layout-cache/4-35/signage.mjs" },
];

try {
  for (const { width, route, file } of cases) {
    const label = `${width}px ${route}`;
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      const requests = [];
      const warnings = [];
      page.on("request", (request) => /\/layout-cache\/[\d-]+\/[^/]+\.mjs$/.test(request.url()) && requests.push(new URL(request.url()).pathname));
      page.on("console", (message) => message.type() === "warning" && warnings.push(message.text()));
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Network.enable");
      // Regular 4G.
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 170, downloadThroughput: 1_125_000, uploadThroughput: 190_000 });
      await page.goto(`${baseUrl}${route}`);
      await page.waitForSelector("[data-advertising-card] a", { state: "attached" });
      // Chrome reports an unused preload a few seconds after load.
      await page.waitForTimeout(4500);
      const timing = await page.evaluate((cacheFile) => {
        const entries = performance.getEntriesByType("resource");
        const find = (suffix) => entries.find((entry) => entry.name.endsWith(suffix));
        return { cache: find(cacheFile)?.startTime, detailEnd: find("/detail.js")?.responseEnd };
      }, file);
      assert.deepEqual(requests, [file], `${label}: one request, for the file of this band and filter`);
      assert.ok(timing.cache !== undefined && timing.detailEnd !== undefined, `${label}: both resources are in the timeline: ${JSON.stringify(timing)}`);
      assert.ok(timing.cache < timing.detailEnd, `${label}: cache request starts before detail.js finishes: ${JSON.stringify(timing)}`);
      assert.deepEqual(warnings.filter((text) => /preload|\[masonry\]/i.test(text)), [], `${label}: no unused-preload or cache-miss warning`);
    } finally {
      await page.close();
    }
  }
  // A direct card page keeps the grid hidden: no cache request before the grid is needed.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      const head = await (await page.request.get(`${baseUrl}/vi/advertising-products/p/kiosk-posm-01/`)).text();
      assert.ok(!head.includes("layout-cache"), "card page HTML has no cache preload");
    } finally {
      await page.close();
    }
  }
  console.log("advertising-layout-cache-preload: ok");
} finally {
  await browser.close();
}
