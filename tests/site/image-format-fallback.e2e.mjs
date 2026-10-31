// Trình duyệt không giải mã JXL vẫn tải đủ ảnh bằng WebP (owner 2026-10-31; progressive-loading R1).
// Chromium tắt JXLImageFormat đóng vai Firefox. Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/image-format-fallback.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  args: ["--disable-features=JXLImageFormat"] });
const loaded = () => (nodes) => nodes.filter((image) => image.currentSrc)
  .map((image) => ({ src: new URL(image.currentSrc).pathname, ok: image.complete && image.naturalWidth > 0 }));

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const jxl = [];
  page.on("request", (request) => request.url().endsWith(".jxl") && jxl.push(request.url()));

  // Trang tĩnh: <picture> chọn img WebP.
  await page.goto(`${base}/vi/residential/`);
  await page.waitForFunction(() => document.querySelector('img[fetchpriority="high"]')?.closest(".is-media-settled"), null, { timeout: 30_000 });
  const hero = await page.$$eval('img[fetchpriority="high"]', loaded());
  assert.ok(hero.length && hero.every(({ src, ok }) => ok && src.endsWith(".webp")), `static hero loads WebP ${JSON.stringify(hero)}`);

  // Advertising: card, primary, viewer đều dùng WebP và không có dấu lỗi.
  await page.goto(`${base}/vi/advertising-products/`);
  await page.waitForFunction(() => [...document.querySelectorAll("[data-advertising-card] img")].filter((image) => image.naturalWidth).length >= 4,
    null, { timeout: 30_000 });
  const cards = await page.$$eval("[data-advertising-card] img", loaded());
  assert.ok(cards.length && cards.every(({ src }) => src.endsWith(".webp")), `cards use WebP ${JSON.stringify(cards.slice(0, 4))}`);
  await page.evaluate(() => document.querySelector("[data-advertising-card] > a").click());
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-image]")?.naturalWidth, null, { timeout: 30_000 });
  await page.evaluate(() => document.querySelector("[data-advertising-photo-expand]").click());
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-expanded-image]")?.naturalWidth, null, { timeout: 30_000 });
  const detail = await page.$$eval("[data-advertising-photo-image], [data-advertising-photo-expanded-image]", loaded());
  assert.ok(detail.length === 2 && detail.every(({ src, ok }) => ok && src.endsWith(".webp")), `primary and viewer use WebP ${JSON.stringify(detail)}`);
  assert.equal(await page.locator(".is-media-error").count(), 0, "no media error marks");
  assert.deepEqual(jxl, [], "no JXL requests without JXL support");
  console.log("PASS image format fallback");
} finally {
  await browser.close();
}
