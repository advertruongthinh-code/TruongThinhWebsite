// Masonry R6: vào thẳng ?photo=, về grid bằng navbar rồi resize trong lúc geometry còn chờ Worker; card ẩn trong cohort
// lộ lại phải lấy bề rộng cột mới. Lỗi cũ: card giữ bề rộng 4 cột (288.5px) ở layout 3 cột, tràn mép phải grid.
// Thứ tự grid ngẫu nhiên theo seed nên lỗi chỉ hiện ở một phần hero; chạy nhiều hero để bắt.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");

const heroCount = Number(process.env.HERO_COUNT || 12);
const browser = await chromium.launch({ headless: true });
const failures = [];
try {
  const probe = await browser.newPage({ viewport: { width: 1329, height: 912 } });
  await probe.goto(`${base}/vi/advertising-products/`, { waitUntil: "networkidle" });
  const heroes = (await probe.$$eval("[data-advertising-card]", (nodes) => nodes.map((node) => node.dataset.advertisingCard)))
    .slice(0, heroCount);
  await probe.close();
  assert(heroes.length >= Math.min(heroCount, 4), "grid has cards to open");
  for (const hero of heroes) {
    const page = await browser.newPage({ viewport: { width: 1329, height: 912 } });
    // Worker trả geometry chậm: resize rơi vào lúc mount còn chờ (cách thread hạ long task tái hiện).
    await page.addInitScript(() => {
      const post = Worker.prototype.postMessage;
      Worker.prototype.postMessage = function (...args) { setTimeout(() => post.apply(this, args), 3000); };
    });
    await page.goto(`${base}/vi/advertising-products/?photo=${hero}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingDetailReady === "true",
      null, { timeout: 40000 });
    await page.evaluate(() => document.querySelector('.desktop-nav a[href*="advertising-products"]').click());
    await page.waitForTimeout(300);
    await page.setViewportSize({ width: 800, height: 900 });
    await page.waitForTimeout(2500);
    const report = await page.evaluate(() => {
      const grid = document.querySelector("[data-project-grid]").getBoundingClientRect();
      const widths = new Map();
      const overflow = [];
      for (const node of document.querySelectorAll("[data-advertising-card]:not([hidden])")) {
        const rect = node.getBoundingClientRect();
        if (!rect.width) continue;
        if (rect.right - grid.right > 1) overflow.push(`${node.dataset.advertisingCard} right +${Math.round(rect.right - grid.right)}px width ${node.style.width}`);
        const span = node.dataset.advertisingSpan;
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
