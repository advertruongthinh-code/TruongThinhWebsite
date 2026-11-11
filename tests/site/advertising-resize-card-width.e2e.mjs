// Masonry R6: load ?photo= directly, return to the grid via the navbar, then resize while geometry still waits on the Worker; a card hidden in the cohort
// that is revealed again must take the new column width. Old bug: the card kept the 4-column width (288.5px) in a 3-column layout, overflowing the grid right edge.
// Grid order is random by seed so the bug shows only in some heroes (main after #670: 2/24); run 24 heroes to catch it.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");

const heroCount = Number(process.env.HERO_COUNT || 24);
const browser = await chromium.launch({ headless: true });
const failures = [];
try {
  const probe = await browser.newPage({ viewport: { width: 1329, height: 912 } });
  await probe.goto(`${base}/vi/advertising-products/`, { waitUntil: "networkidle" });
  const heroes = (await probe.$$eval("[data-masonry-card]", (nodes) => nodes.map((node) => node.dataset.masonryCard)))
    .slice(0, heroCount);
  await probe.close();
  assert(heroes.length >= Math.min(heroCount, 4), "grid has cards to open");
  for (const hero of heroes) {
    const page = await browser.newPage({ viewport: { width: 1329, height: 912 } });
    // The Worker returns geometry slowly: resize lands while mount is still waiting (how a thread-throttled long task reproduces it).
    await page.addInitScript(() => {
      const post = Worker.prototype.postMessage;
      Worker.prototype.postMessage = function (...args) { setTimeout(() => post.apply(this, args), 3000); };
    });
    await page.goto(`${base}/vi/advertising-products/?photo=${hero}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-detail-view]")?.dataset.masonryDetailReady === "true",
      null, { timeout: 40000 });
    await page.evaluate(() => document.querySelector('.desktop-nav a[href*="advertising-products"]').click());
    await page.waitForTimeout(300);
    await page.setViewportSize({ width: 800, height: 900 });
    await page.waitForTimeout(2500);
    const report = await page.evaluate(() => {
      const grid = document.querySelector("[data-project-grid]").getBoundingClientRect();
      const widths = new Map();
      const overflow = [];
      for (const node of document.querySelectorAll("[data-masonry-card]:not([hidden])")) {
        const rect = node.getBoundingClientRect();
        if (!rect.width) continue;
        if (rect.right - grid.right > 1) overflow.push(`${node.dataset.masonryCard} right +${Math.round(rect.right - grid.right)}px width ${node.style.width}`);
        const span = node.dataset.masonrySpan;
        widths.set(span, [...(widths.get(span) || []), Math.round(rect.width)]);
      }
      const mixed = [...widths].filter(([, list]) => new Set(list).size > 1).map(([span, list]) => `span ${span}: ${[...new Set(list)].join("/")}px`);
      return { overflow, mixed };
    });
    if (report.overflow.length || report.mixed.length) failures.push(`${hero}: ${[...report.overflow, ...report.mixed].join("; ")}`);
    else console.log(`PASS ${hero}: card widths match 800px columns`);
    await page.close();
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], `cards kept stale width after resize:\n${failures.join("\n")}`);
