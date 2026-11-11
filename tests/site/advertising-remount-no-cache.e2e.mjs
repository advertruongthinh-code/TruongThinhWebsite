// Continuous jump scrolling with cache off (loading-glass R1, R3, R6): a re-mounted virtualized card leaves no blank frame, a removed card
// holds no image request. Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/advertising-remount-no-cache.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
// Wait for the 150ms cache (REMOUNT_CACHE_WAIT_MS) plus a few lagging frames when the CI machine is busy.
const MAX_WHITE_MS = 400;
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
try {
  const context = await browser.newContext({ viewport: { width: 1170, height: 800 }, deviceScaleFactor: 1.5 });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions",
    { offline: false, latency: 60, downloadThroughput: 6e6 / 8, uploadThroughput: 1e6 });
  await page.addInitScript(() => {
    // Blank card: intersects the viewport, image not shown, no skeleton. Record the length of each blank stretch.
    const since = new WeakMap();
    window.__whiteMs = [];
    window.__pendingRemoved = 0;
    const tick = () => {
      for (const card of document.querySelectorAll("[data-project-grid] [data-masonry-card]")) {
        const { top, bottom, height } = card.getBoundingClientRect();
        const image = [...card.querySelectorAll("img")].find((node) => !node.hidden);
        const white = height > 0 && bottom > 0 && top < innerHeight && image
          && !image.classList.contains("is-masonry-media-ready") && !card.querySelector("[data-masonry-loading-skeleton]");
        if (white && !since.has(card)) since.set(card, performance.now());
        if (!white && since.has(card)) {
          window.__whiteMs.push(performance.now() - since.get(card));
          since.delete(card);
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // A card removed while its img is still loading means the request keeps running after the card leaves the DOM.
    new MutationObserver((records) => records.forEach(({ removedNodes }) => removedNodes.forEach((node) => {
      // A card only moved within the DOM is still connected; do not count it.
      if (node.dataset?.masonryCard === undefined || node.isConnected) return;
      window.__pendingRemoved += [...node.querySelectorAll("img")].filter((image) => !image.complete).length;
    }))).observe(document, { childList: true, subtree: true });
  });
  await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
  await page.waitForTimeout(1500);
  const limit = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  // Jump like dragging the scrollbar: a continuous run with brief pauses in between so cards can mount and then be removed while loading.
  let seed = 7;
  const random = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  let y = 0;
  for (let leg = 0; leg < 24; leg += 1) {
    const target = random() * limit;
    const steps = 2 + Math.floor(random() * 12);
    for (let step = 1; step <= steps; step += 1) {
      await page.evaluate((top) => window.TruongThinhMotion.setLogicalScroll(top), y + (target - y) * step / steps);
      await page.waitForTimeout(16);
    }
    y = target;
    await page.waitForTimeout(random() * 500);
  }
  await page.waitForTimeout(4000);
  const { whiteMs, pendingRemoved } = await page.evaluate(() => ({ whiteMs: window.__whiteMs, pendingRemoved: window.__pendingRemoved }));
  const longest = Math.max(0, ...whiteMs);
  assert.ok(whiteMs.length, "cards remounted while scrolling");
  assert.ok(longest <= MAX_WHITE_MS, `no card stays blank over ${MAX_WHITE_MS}ms, longest ${Math.round(longest)}ms`);
  assert.equal(pendingRemoved, 0, `removed cards drop their pending image requests, ${pendingRemoved} still loading`);
  const stuck = await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-masonry-card]")]
    .filter((card) => {
      const { top, bottom, height } = card.getBoundingClientRect();
      const image = [...card.querySelectorAll("img")].find((node) => !node.hidden);
      return height > 0 && bottom > 0 && top < innerHeight && !image?.classList.contains("is-masonry-media-ready");
    }).map((card) => card.dataset.masonryCard));
  assert.deepEqual(stuck, [], "every visible card shows its image once scrolling stops");
  await context.close();
  console.log(`advertising remount without cache: ${whiteMs.length} blank spans, longest ${Math.round(longest)}ms`);
} finally {
  await browser.close();
}
