// Filter click while its layout cache is still loading (advertising-masonry R6): the click waits for the cache, and a
// later re-click of the active filter, or opening a card, cancels it so the late cache never overwrites the page state.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".tooling/browsers");
}

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined });
const FILTER_DELAY_MS = 2000;
const gridPath = "/vi/advertising-products/";

const state = (page) => page.evaluate(() => ({
  current: document.querySelector('[aria-current="true"][data-advertising-filter]')?.dataset.advertisingFilter ?? null,
  path: location.pathname,
}));

// 1440 px is band 4:35. The Signage one-filter file is late, the whole-band file later still, so Signage has no cache
// for FILTER_DELAY_MS after the click.
async function openGrid() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const warnings = [];
  page.on("console", (message) => message.type() === "warning" && message.text().includes("[masonry]") && warnings.push(message.text()));
  await page.route("**/layout-cache/4-35/signage.mjs", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, FILTER_DELAY_MS));
    await route.continue();
  });
  await page.route("**/layout-cache/4-35.mjs", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4 * FILTER_DELAY_MS));
    await route.continue();
  });
  await page.goto(`${baseUrl}${gridPath}`);
  await page.waitForSelector("[data-advertising-card] a", { state: "attached" });
  await page.waitForFunction(() => window.TruongThinhMasonry?.getBrowseState?.());
  return { page, warnings };
}

try {
  // Control: the click waits for the cache, then lands once.
  {
    const { page, warnings } = await openGrid();
    await page.locator('[data-advertising-filter="signage"]').click();
    await page.waitForTimeout(FILTER_DELAY_MS / 4);
    assert.deepEqual(await state(page), { current: "all", path: gridPath }, "filter click waits while its cache loads");
    await page.waitForTimeout(FILTER_DELAY_MS + 1500);
    assert.deepEqual(await state(page), { current: "signage", path: `${gridPath}bang-hieu-quang-cao/` }, "filter click lands once its cache arrives");
    assert.deepEqual(warnings, [], "a cache still loading is not a miss");
    await page.close();
  }
  // Re-clicking the active filter cancels the pending click.
  {
    const { page } = await openGrid();
    await page.locator('[data-advertising-filter="signage"]').click();
    await page.waitForTimeout(100);
    await page.locator('[data-advertising-filter="all"]').click();
    await page.waitForTimeout(FILTER_DELAY_MS + 1500);
    assert.deepEqual(await state(page), { current: "all", path: gridPath }, "re-clicking All cancels the pending Signage click");
    await page.close();
  }
  // Opening a card cancels the pending click: the card URL stays.
  {
    const { page } = await openGrid();
    await page.locator('[data-advertising-filter="signage"]').click();
    await page.waitForTimeout(100);
    await page.locator("[data-project-grid] [data-advertising-card]:not([data-advertising-category='signage']) a").first().click();
    await page.waitForFunction(() => location.pathname.includes("/p/"));
    // Opening a card selects the card's own cluster; the late Signage cache must not replace it.
    const browseCategory = () => page.evaluate(() => window.TruongThinhMasonry.getBrowseState().category);
    const opened = { ...(await state(page)), category: await browseCategory() };
    await page.waitForTimeout(FILTER_DELAY_MS + 1500);
    assert.deepEqual({ ...(await state(page)), category: await browseCategory() }, opened,
      "a late cache does not rewrite the open card's URL or history entry");
    await page.close();
  }
  console.log("advertising layout cache pending click: ok");
} finally {
  await browser.close();
}
