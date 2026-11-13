// Measures the shared media queue cap (media-card R5, progressive-loading): for each cap, opens a primary with 8 images cold, jumps to the
// 6th image soon after the first shows, and records how long the viewer waits for that image, how long every image takes, and the frames
// lost while they load. The cap is swapped by rewriting media-queue.mjs in flight, so the site itself is unchanged.
// Real phone: DEVICE_CDP=http://127.0.0.1:9222 (after adb forward) runs on the phone's Chrome against BASE_URL (default: the demo).
// Without DEVICE_CDP it runs headless Chromium emulating a 384px phone (for checking the script).
// Usage: node tests/site/media-queue-cap-measure.mjs [caps=2,3,4] [runs=3]
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "https://truong-thinh-demo.truong-thinh-project-tooling.workers.dev";
const CARD = process.env.CARD_ID || "led-displays-lightboxes-43";
const JUMP_INDEX = 5;
const JUMP_AFTER_MS = 600;
const caps = (process.argv[2] || "2,3,4").split(",").map(Number);
const runs = Number(process.argv[3] || 3);
const device = process.env.DEVICE_CDP;
const out = ".tmp/media-queue-cap";
mkdirSync(out, { recursive: true });

const browser = device ? await chromium.connectOverCDP(device) : await chromium.launch();
const context = device ? browser.contexts()[0]
  : await browser.newContext({ viewport: { width: 384, height: 724 }, deviceScaleFactor: 1.875, isMobile: true, hasTouch: true });
let cap = 2;
await context.route("**/media-lib/media-queue.mjs*", async (route) => {
  const response = await route.fetch();
  const body = (await response.text()).replace("PHONE ? 2 : 4", String(cap));
  await route.fulfill({ response, body, headers: { ...response.headers(), "cache-control": "no-store" } });
});

async function measure() {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.clearBrowserCache");
  await page.addInitScript(() => {
    window.__frames = [];
    window.__long = [];
    const tick = (now) => { window.__frames.push(now); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    try {
      new PerformanceObserver((list) => list.getEntries().forEach((entry) => window.__long.push([entry.startTime, entry.duration])))
        .observe({ type: "longtask", buffered: true });
    } catch {}
  });
  await page.goto(`${BASE}/vi/advertising-products/?photo=${CARD}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const image = document.querySelector("[data-detail-view] [data-detail-image]");
    return image?.complete && image.naturalWidth > 0 && !document.querySelector(".detail-view__hero-frame[data-detail-loading]");
  }, null, { timeout: 60_000 });
  const shownAt = await page.evaluate(() => performance.now());
  // The thumbnail row can render after the first image shows (A04s: 8 of 15 runs counted 0).
  await page.waitForFunction(() => document.querySelectorAll("[data-detail-media-select]").length > 1, null, { timeout: 30_000 });
  const count = await page.locator("[data-detail-media-select]").count();
  await page.waitForTimeout(JUMP_AFTER_MS);
  const jump = await page.evaluate(async (index) => {
    const start = performance.now();
    const buttons = document.querySelectorAll("[data-detail-media-select]");
    buttons[Math.min(index, buttons.length - 1)].click();
    await new Promise(requestAnimationFrame);
    const waited = Boolean(document.querySelector(".detail-view__strip .card-media__wait"));
    await new Promise((resolve) => {
      const check = () => document.querySelector(".detail-view__strip") ? setTimeout(check, 16) : resolve();
      check();
    });
    return { waited, ms: Math.round(performance.now() - start), at: start };
  }, JUMP_INDEX);
  // Every primary-size image of the card (one per media; the site asks each URL once).
  const done = await page.waitForFunction((total) => {
    const names = new Set(performance.getEntriesByType("resource").filter((entry) => entry.initiatorType === "img"
      && /\/assets\/content\/.*-(960|1600|2048)\.\w+/.test(entry.name)).map((entry) => entry.name));
    return names.size >= total ? Math.max(...performance.getEntriesByType("resource")
      .filter((entry) => names.has(entry.name)).map((entry) => entry.responseEnd)) : false;
  }, count, { timeout: 90_000, polling: 250 }).then((handle) => handle.jsonValue()).catch(() => null);
  const frames = await page.evaluate(({ from, to }) => {
    const gaps = [];
    for (let i = 1; i < window.__frames.length; i++) {
      if (window.__frames[i] < from || window.__frames[i - 1] > to) continue;
      gaps.push(window.__frames[i] - window.__frames[i - 1]);
    }
    const long = window.__long.filter(([start]) => start >= from && start <= to);
    return { frames: gaps.length, over50: gaps.filter((gap) => gap > 50).length, maxGap: Math.round(Math.max(0, ...gaps)),
      longTasks: long.length, longMs: Math.round(long.reduce((sum, [, duration]) => sum + duration, 0)) };
  }, { from: shownAt, to: Math.max(done ?? shownAt + 90_000, jump.at + jump.ms) });
  // The page really ran with this cap.
  const limit = await page.evaluate(() => import("/media-lib/media-queue.mjs").then((module) => module.MEDIA_QUEUE_LIMIT));
  await page.close();
  return { limit, count, jumpWaited: jump.waited, jumpMs: jump.ms, allMs: done ? Math.round(done - shownAt) : null, ...frames };
}

const results = [];
for (let run = 0; run < runs; run++) {
  // Interleaved so a network change hits every cap alike.
  for (const value of run % 2 ? [...caps].reverse() : caps) {
    cap = value;
    const result = { cap, run, ...await measure() };
    results.push(result);
    console.log(JSON.stringify(result));
  }
}
const median = (values) => {
  const sorted = values.filter((value) => value != null).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};
const summary = caps.map((value) => {
  const rows = results.filter((row) => row.cap === value);
  return { cap: value, jumpMs: median(rows.map((row) => row.jumpMs)), allMs: median(rows.map((row) => row.allMs)),
    over50: median(rows.map((row) => row.over50)), maxGap: median(rows.map((row) => row.maxGap)), longMs: median(rows.map((row) => row.longMs)) };
});
console.table(summary);
writeFileSync(`${out}/result-${Date.now()}.json`, JSON.stringify({ base: BASE, card: CARD, device: Boolean(device), results, summary }, null, 2));
if (!device) await browser.close();
else await browser.close().catch(() => {});
