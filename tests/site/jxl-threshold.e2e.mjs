// Ảnh JXL hiện khi đủ ngưỡng (progressive-loading R3, R9): proxy chậm trước BASE_URL, Service Worker được bật.
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/jxl-threshold.e2e.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
// JXL đi 20 KB/s theo khúc 2 KB để ngưỡng (khoảng 58% số byte) tới rõ trước load.
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
  // Lần mở đầu: Service Worker đăng ký sau load rồi claim tab.
  await page.goto(`${origin}/vi/residential/`);
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30_000 });

  // Trang tĩnh: khung hero settle lúc tin ngưỡng tới, trước load của ảnh; server nhận một request cho file đó.
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
  assert.ok(hero.settled && hero.settled < hero.load - 200, `hero settles on the threshold, before load ${JSON.stringify(hero)}`);
  assert.equal(jxlRequests.get(hero.src), 1, `hero file requested once ${JSON.stringify([...jxlRequests])}`);

  // Advertising: Kính của card bắt đầu tan khi ảnh còn đang tải (tin ngưỡng), không chờ decode.
  await page.addInitScript(() => {
    window.__glassTrace = [];
    const tick = () => {
      for (const glass of document.querySelectorAll("[data-project-grid] .glass-surface[data-glass-reveal]")) {
        if (glass.__traced || !glass.getAnimations({ subtree: true }).length) continue;
        glass.__traced = true;
        const image = glass.parentElement.querySelector("img");
        window.__glassTrace.push({ complete: image.complete, src: image.currentSrc });
      }
      if (performance.now() < 20_000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto(`${origin}/vi/advertising-products/`);
  await page.waitForFunction(() => window.__glassTrace.length >= 3, null, { timeout: 30_000 });
  const glass = await page.evaluate(() => window.__glassTrace);
  assert.ok(glass.some(({ complete }) => !complete), `card Kính starts dissolving before the photo finishes ${JSON.stringify(glass.slice(0, 5))}`);
  await context.close();
  console.log("PASS jxl threshold");
} finally {
  await browser.close();
  proxy.close();
}
