// Regression: at viewports where the primary frame has a fractional width, the media edge must not leave a 1px strip of
// the dark loading fill (owner 2026-11-11, house-number card at 1440). The wall at the right edge of this photo is
// uniformly light, so the last device-pixel column inside the frame must stay as light as the columns next to it.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".tooling/browsers");

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const luminance = (data, width, x, y) => {
  const i = (y * width + x) * 4;
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
};

try {
  for (const width of [1050, 1280, 1440, 1920]) {
    for (const deviceScaleFactor of [1, 2]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor });
      await page.goto(`${baseUrl}/vi/advertising-products/p/office-signs-wayfinding-01/`, { waitUntil: "networkidle" });
      await page.waitForSelector(".detail-view__hero-frame.is-media-settled:not([data-detail-loading])");
      const frame = await page.evaluate(() => {
        const { left, top, right, bottom } = document.querySelector(".detail-view__hero-frame").getBoundingClientRect();
        return { left, top, right, bottom };
      });
      assert.notEqual(frame.right % 1, 0, `${width}: frame width must be fractional to reproduce the bug`);
      const clip = { x: Math.ceil(frame.right) - 8, y: Math.ceil(frame.top) + 20, width: 8, height: 40 };
      const { data, info } = await sharp(await page.screenshot({ clip })).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      // The clip ends at the first whole CSS pixel past the frame, so its last device column holds the edge.
      const edge = info.width - 1;
      const inner = edge - 3 * deviceScaleFactor;
      for (const y of [5, info.height >> 1, info.height - 5]) {
        const edgeLuma = luminance(data, info.width, edge, y);
        const innerLuma = luminance(data, info.width, inner, y);
        assert(edgeLuma > innerLuma - 40,
          `${width}@${deviceScaleFactor}x: dark strip at primary right edge (edge ${edgeLuma.toFixed(0)}, inner ${innerLuma.toFixed(0)})`);
      }
      await page.close();
    }
  }
  console.log("advertising-primary-edge: PASS");
} finally {
  await browser.close();
}
