// The primary image-wait Flow carries the image's own 4 colors, the batch below the CTA keeps the preset (advertising-skeleton R3, owner 2026-10-31).
// On the phone (A04s viewport) the primary waits on the same 4 colors as a flat layer instead, then the photo fades in over 450ms (progressive-loading R9).
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/advertising-primary-flow-colors.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const { MEDIA_COLORS } = await import(pathToFileURL(path.resolve("src/site/media-lib/colors.mjs")));
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "load" });
  const link = page.locator("[data-masonry-card] > a").first();
  await link.waitFor();
  // Keep the primary image from arriving so the image-wait Flow stays on the frame during the check.
  await page.route("**/assets/content/**", async (route) => {
    if (route.request().resourceType() === "image") await new Promise((resolve) => setTimeout(resolve, 6000));
    await route.continue().catch(() => {});
  });
  await link.click();
  const frame = page.locator("[data-detail-view] [data-masonry-loading-skeleton]").first();
  await frame.waitFor({ state: "attached", timeout: 10_000 });
  const { colors, src } = await frame.evaluate((node) => {
    const view = node.closest("[data-detail-view]");
    const image = view.querySelector("[data-detail-image]");
    return { colors: node.dataset.masonryFlowColors, src: image?.getAttribute("src") || "" };
  });
  const key = src.split("/").pop().replace(/(?:-(?:240|480|960|1600|2048))?\.\w+$/, "");
  assert.ok(MEDIA_COLORS[key], `primary media has colours: ${src}`);
  assert.equal(colors, MEDIA_COLORS[key].slice(1).join(" "), "primary Flow uses the image's four colours");
  const batch = await page.evaluate(() => [...document.querySelectorAll("[data-masonry-cta-frame]")]
    .filter((node) => node.dataset.masonryFlowColors).length);
  assert.equal(batch, 0, "batch frames under the CTA keep the presets");
  await page.close();

  const phone = await browser.newPage({ viewport: { width: 384, height: 800 }, isMobile: true, hasTouch: true });
  await phone.goto(`${base}/vi/advertising-products/`, { waitUntil: "load" });
  const card = phone.locator("[data-masonry-card] > a").first();
  await card.waitFor();
  await phone.route("**/assets/content/**", async (route) => {
    if (route.request().resourceType() === "image") await new Promise((resolve) => setTimeout(resolve, 6000));
    await route.continue().catch(() => {});
  });
  await card.click();
  await phone.waitForFunction(() => document.querySelector("[data-detail-view] [data-detail-image]")?.parentElement.dataset.mediaWait === "colors",
    null, { timeout: 10_000 });
  const waiting = await phone.evaluate(() => {
    const frame = document.querySelector("[data-detail-view] [data-detail-image]").parentElement;
    const style = getComputedStyle(frame);
    return { vars: [1, 2, 3, 4].map((index) => style.getPropertyValue(`--wait-${index}`).trim()),
      skeleton: Boolean(frame.querySelector("[data-masonry-loading-skeleton]")), glass: Boolean(frame.querySelector(".glass-surface[data-glass-reveal]")),
      src: document.querySelector("[data-detail-image]").getAttribute("src") || "" };
  });
  const phoneKey = waiting.src.split("/").pop().replace(/(?:-(?:240|480|960|1600|2048))?\.\w+$/, "");
  assert.ok(MEDIA_COLORS[phoneKey], `phone primary media has colours: ${waiting.src}`);
  assert.deepEqual(waiting.vars, MEDIA_COLORS[phoneKey].slice(1), "phone primary waits on the image's four colours");
  assert.deepEqual([waiting.skeleton, waiting.glass], [false, false], "phone primary has no Flow skeleton or Kính");
  // The photo arrives: it fades in over 450ms, then the layer is removed.
  await phone.waitForFunction(() => document.querySelector("[data-detail-image]").getAnimations()
    .some((animation) => animation.effect.getTiming().duration === 450), null, { timeout: 15_000 });
  await phone.waitForFunction(() => !document.querySelector("[data-detail-image]").parentElement.hasAttribute("data-media-wait"), null, { timeout: 3000 });
  console.log("advertising primary Flow colours passed");
} finally {
  await browser.close();
}
