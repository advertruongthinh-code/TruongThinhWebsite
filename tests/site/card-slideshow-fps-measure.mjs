// Measures the frame cost of the card slideshow (media-card R4): a masonry page with multi-media cards sits still for DURATION_MS,
// once with the slideshow running and once under prefers-reduced-motion (no slideshow), and records the frame gaps and slideshow steps.
// Real phone: DEVICE_CDP=http://127.0.0.1:9222 (after adb forward) runs on the phone's Chrome against BASE_URL.
// Without DEVICE_CDP it runs headless Chromium emulating a 384px phone (for checking the script).
// Usage: node tests/site/card-slideshow-fps-measure.mjs [runs=3]
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:8787";
const PATH = process.env.PAGE_PATH || "/vi/advertising-products/?category=led-displays-lightboxes";
const DURATION_MS = Number(process.env.DURATION_MS || 30_000);
const runs = Number(process.argv[2] || 3);
const device = process.env.DEVICE_CDP;
const out = ".tmp/card-slideshow-fps";
mkdirSync(out, { recursive: true });

const browser = device ? await chromium.connectOverCDP(device) : await chromium.launch();
const context = device ? browser.contexts()[0]
  : await browser.newContext({ viewport: { width: 384, height: 724 }, deviceScaleFactor: 1.875, isMobile: true, hasTouch: true });

async function measure(slideshow) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: slideshow ? "no-preference" : "reduce" }] });
  await page.addInitScript(() => {
    window.__frames = [];
    window.__steps = 0;
    const tick = (now) => { window.__frames.push(now); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    new MutationObserver((records) => { window.__steps += records.length; })
      .observe(document, { subtree: true, attributes: true, attributeFilter: ["data-masonry-active-media-id"] });
  });
  await page.goto(`${BASE}${PATH}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.TruongThinhMasonry?.getAdapter?.()), null, { timeout: 60_000 });
  // Bring the grid under the navbar, then let every visible image load before measuring.
  await page.evaluate(() => document.querySelector("[data-masonry-card]")?.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.waitForTimeout(8_000);
  const result = await page.evaluate(async (duration) => {
    const from = performance.now();
    const steps = window.__steps;
    await new Promise((resolve) => setTimeout(resolve, duration));
    const frames = window.__frames.filter((time) => time >= from);
    const gaps = frames.slice(1).map((time, index) => time - frames[index]).sort((a, b) => a - b);
    const cards = [...document.querySelectorAll("figure.masonry-card[data-masonry-slides]")].filter((card) => {
      const rect = card.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    }).length;
    return { fps: Math.round(frames.length / (duration / 1000) * 10) / 10, p95: Math.round(gaps[Math.floor(gaps.length * 0.95)] ?? 0),
      maxGap: Math.round(gaps.at(-1) ?? 0), over50: gaps.filter((gap) => gap > 50).length, steps: window.__steps - steps, cardsInView: cards };
  }, DURATION_MS);
  await page.close();
  return result;
}

const results = [];
for (let run = 0; run < runs; run++) {
  for (const slideshow of run % 2 ? [false, true] : [true, false]) {
    const result = { slideshow, run, ...await measure(slideshow) };
    results.push(result);
    console.log(JSON.stringify(result));
  }
}
const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
const summary = [true, false].map((slideshow) => {
  const rows = results.filter((row) => row.slideshow === slideshow);
  return { slideshow, fps: median(rows.map((row) => row.fps)), p95: median(rows.map((row) => row.p95)),
    maxGap: median(rows.map((row) => row.maxGap)), over50: median(rows.map((row) => row.over50)), steps: median(rows.map((row) => row.steps)) };
});
console.table(summary);
writeFileSync(`${out}/result-${Date.now()}.json`, JSON.stringify({ base: BASE, path: PATH, device: Boolean(device), results, summary }, null, 2));
if (!device) await browser.close();
else await browser.close().catch(() => {});
