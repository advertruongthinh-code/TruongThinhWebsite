// An image shows only once fully loaded (progressive-loading R3, R9; owner 2026-10-31): a slow proxy in front of BASE_URL.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/image-reveal-complete.e2e.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
// JXL goes at 20 KB/s in 2 KB chunks so the image is still half-loaded long enough to be seen if it leaks early.
const CHUNK = 2048;
const CHUNK_MS = 100;
const jxlRequests = new Map();
const proxy = createServer(async (request, response) => {
  const upstream = await fetch(base + request.url, { headers: { accept: request.headers.accept || "*/*" } });
  const headers = Object.fromEntries([...upstream.headers].filter(([name]) => !["content-encoding", "content-length", "transfer-encoding"].includes(name)));
  const body = Buffer.from(await upstream.arrayBuffer());
  response.writeHead(upstream.status, { ...headers, "content-length": body.length, "cache-control": "no-store" });
  const { pathname } = new URL(request.url, base);
  if (!pathname.endsWith(".jxl")) return response.end(body);
  jxlRequests.set(pathname, (jxlRequests.get(pathname) || 0) + 1);
  for (let offset = 0; offset < body.length && !response.destroyed; offset += CHUNK) {
    response.write(body.subarray(offset, offset + CHUNK));
    await new Promise((resolve) => setTimeout(resolve, CHUNK_MS));
  }
  response.end();
}).listen(0, "127.0.0.1");
await new Promise((resolve) => proxy.once("listening", resolve));
const origin = `http://127.0.0.1:${proxy.address().port}`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

try {
  const context = await browser.newContext({ serviceWorkers: "allow", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  // The site no longer registers a Service Worker; /sw.js only removes a previously installed one.
  await page.goto(`${origin}/vi/residential/`, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0, "site registers no Service Worker");

  // Static page: the hero frame settles after the image load (load then decode); the server receives one request for that file.
  await page.addInitScript(() => {
    window.__heroTrace = {};
    document.addEventListener("load", ({ target }) => {
      if (target.tagName === "IMG" && target.getAttribute("fetchpriority") === "high") window.__heroTrace.load ??= performance.now();
    }, true);
    new MutationObserver(() => {
      const image = document.querySelector('img[fetchpriority="high"]');
      if (image?.closest(".is-media-settled")) window.__heroTrace.settled ??= performance.now();
    }).observe(document, { attributes: true, attributeFilter: ["class"], subtree: true });
  });
  jxlRequests.clear();
  await page.reload();
  await page.waitForFunction(() => window.__heroTrace.load, null, { timeout: 60_000 });
  const hero = await page.evaluate(() => ({ ...window.__heroTrace, src: new URL(document.querySelector('img[fetchpriority="high"]').currentSrc).pathname }));
  assert.ok(hero.src.endsWith(".jxl"), `hero loads JXL ${hero.src}`);
  await page.waitForFunction(() => window.__heroTrace.settled, null, { timeout: 10_000 });
  Object.assign(hero, await page.evaluate(() => window.__heroTrace));
  assert.ok(hero.settled >= hero.load, `hero settles only after load ${JSON.stringify(hero)}`);
  assert.equal(jxlRequests.get(hero.src), 1, `hero file requested once ${JSON.stringify([...jxlRequests])}`);

  // Advertising: a card image starts its reveal from the Flow frame only once the image has finished loading. The reveal starts when
  // the image gets is-masonry-media-ready: PC clears frosted glass on the Flow canvas with no animation on the image (62c63928).
  await page.addInitScript(() => {
    window.__blurTrace = [];
    new MutationObserver((records) => {
      for (const { target } of records) {
        if (target.tagName !== "IMG" || target.__traced || !target.classList.contains("is-masonry-media-ready")
          || !target.closest("[data-project-grid] [data-masonry-card]:has([data-masonry-loading-skeleton])")) continue;
        target.__traced = true;
        window.__blurTrace.push({ complete: target.complete, src: target.currentSrc });
      }
    }).observe(document, { attributes: true, attributeFilter: ["class"], subtree: true });
  });
  await page.goto(`${origin}/vi/advertising-products/`);
  await page.waitForFunction(() => window.__blurTrace.length >= 3, null, { timeout: 30_000 });
  const blur = await page.evaluate(() => window.__blurTrace);
  assert.ok(blur.every(({ complete }) => complete), `card reveals before the photo finishes ${JSON.stringify(blur.slice(0, 5))}`);

  // Viewer: show the existing primary image, switch to the original only once the original has finished loading.
  // The card has an original wider than 1600, so the primary at 1440px takes the 1600 size and the viewer must switch to the original.
  await page.evaluate(() => [...document.querySelectorAll("[data-masonry-card]")]
    // data-srcset exists from the build; srcset only exists after lazysizes, and with a slow proxy the first card may not have it yet (independent of content order).
    .find((card) => card.querySelector("img")?.getAttribute("data-srcset")?.includes("-1600.jxl")).querySelector("a").click());
  await page.waitForFunction(() => {
    const image = document.querySelector("[data-detail-image]");
    return image?.complete && image.naturalWidth && !document.querySelector("[data-detail-loading=true]");
  }, null, { timeout: 60_000 });
  const primary = await page.evaluate(() => new URL(document.querySelector("[data-detail-image]").currentSrc).pathname);
  await page.evaluate(() => {
    const image = document.querySelector("[data-detail-expanded-image]");
    window.__viewerTrace = [];
    new MutationObserver(() => window.__viewerTrace.push({ src: new URL(image.src).pathname, complete: image.complete }))
      .observe(image, { attributes: true, attributeFilter: ["src"] });
    document.querySelector("[data-detail-expand]").click();
  });
  await page.waitForFunction(() => window.__viewerTrace.length >= 2, null, { timeout: 60_000 });
  const viewer = await page.evaluate(() => window.__viewerTrace);
  assert.equal(viewer[0].src, primary, `viewer opens on the primary image ${JSON.stringify({ primary, viewer })}`);
  assert.ok(viewer[1].src === primary.replace(/-1600\.jxl$/, ".jxl") && viewer[1].complete,
    `viewer swaps to the original before it finishes ${JSON.stringify({ primary, viewer })}`);
  assert.equal(jxlRequests.get(viewer[1].src), 1, `original requested once ${JSON.stringify([...jxlRequests])}`);
  await context.close();
  console.log("PASS image reveal complete");
} finally {
  await browser.close();
  proxy.close();
}
