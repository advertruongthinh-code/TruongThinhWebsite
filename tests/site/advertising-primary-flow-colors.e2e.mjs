// Flow chờ ảnh primary mang 4 màu của chính ảnh, lô dưới CTA giữ preset (advertising-skeleton R3, owner 2026-10-31).
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/advertising-primary-flow-colors.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const { MEDIA_COLORS } = await import(pathToFileURL(path.resolve("src/site/advertising-products/media-colors.mjs")));
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "load" });
  const link = page.locator("[data-advertising-card] > a").first();
  await link.waitFor();
  // Giữ ảnh primary chưa về để Flow chờ ảnh còn trên khung lúc kiểm.
  await page.route("**/assets/content/**", async (route) => {
    if (route.request().resourceType() === "image") await new Promise((resolve) => setTimeout(resolve, 6000));
    await route.continue().catch(() => {});
  });
  await link.click();
  const frame = page.locator("[data-advertising-photo-view] [data-advertising-loading-skeleton]").first();
  await frame.waitFor({ state: "attached", timeout: 10_000 });
  const { colors, src } = await frame.evaluate((node) => {
    const view = node.closest("[data-advertising-photo-view]");
    const image = view.querySelector("[data-advertising-photo-image]");
    return { colors: node.dataset.advertisingFlowColors, src: image?.getAttribute("src") || "" };
  });
  const key = src.split("/").pop().replace(/(?:-(?:240|480|960|1600|2048))?\.\w+$/, "");
  assert.ok(MEDIA_COLORS[key], `primary media has colours: ${src}`);
  assert.equal(colors, MEDIA_COLORS[key].slice(1).join(" "), "primary Flow uses the image's four colours");
  const batch = await page.evaluate(() => [...document.querySelectorAll("[data-advertising-cta-frame]")]
    .filter((node) => node.dataset.advertisingFlowColors).length);
  assert.equal(batch, 0, "batch frames under the CTA keep the presets");
  console.log("advertising primary Flow colours passed");
} finally {
  await browser.close();
}
