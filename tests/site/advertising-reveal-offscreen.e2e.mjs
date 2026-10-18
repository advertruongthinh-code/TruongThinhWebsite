// Hồi quy: card rời viewport khi đang chờ decode() phải hiện ảnh, không kẹt opacity 0 thành lỗ trống
// (docs/specs/loading-glass-and-page-entry.md R6).
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true });
try {
  const width = 1440, height = 900;
  const page = await browser.newPage({ viewport: { width, height } });
  // Decode chậm như phone Android để card kịp rời viewport trước khi decode xong.
  await page.addInitScript(() => {
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function () {
      return new Promise((resolve) => setTimeout(resolve, 1200)).then(() => decode.call(this));
    };
  });
  await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "load" });
  await page.waitForTimeout(800);
  const wheel = async (dy, steps) => {
    await page.mouse.move(width / 2, height / 2);
    for (let step = 0; step < steps; step++) {
      await page.mouse.wheel(0, dy);
      await page.waitForTimeout(40);
    }
  };
  for (let burst = 0; burst < 8; burst++) {
    await wheel(150, 4);
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(4000);
  await wheel(-150, 60);
  await page.waitForTimeout(4000);
  const stuck = await page.evaluate(() => [...document.querySelectorAll(".advertising-tile")].filter((card) => {
    const image = card.querySelector("img.advertising-tile__foreground:not([hidden])");
    return image?.complete && image.naturalWidth > 0 && !image.classList.contains("is-advertising-media-ready");
  }).map((card) => card.dataset.advertisingCard || card.dataset.advertisingRelatedCard));
  assert.deepEqual(stuck, [], "loaded media stuck hidden after leaving the viewport during decode");
  console.log("advertising-reveal-offscreen: pass");
} finally {
  await browser.close();
}
