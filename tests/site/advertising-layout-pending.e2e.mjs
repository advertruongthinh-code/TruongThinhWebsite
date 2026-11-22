// Filter click while its grid pack is still running (masonry-live-layout R3): the click waits for the pack, and a later
// re-click of the active filter, or opening a card, cancels it so the late pack never overwrites the page state.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { slowPacks } from "./harness.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".tooling/browsers");
}

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined });
// Long enough that the background packing of every chip (it may start the Signage pack before the click) is still running.
const FILTER_DELAY_MS = 6000;
const gridPath = "/vi/advertising-products/";

const state = (page) => page.evaluate(() => ({
  current: document.querySelector('[aria-current="true"][data-masonry-filter]')?.dataset.masonryFilter ?? null,
  path: location.pathname,
}));

// 1440 px is band 4:35. The Signage pack is held for FILTER_DELAY_MS after the click.
async function openGrid() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const warnings = [];
  page.on("console", (message) => message.type() === "warning" && message.text().includes("[masonry]") && warnings.push(message.text()));
  await slowPacks(page, FILTER_DELAY_MS, "signage");
  await page.goto(`${baseUrl}${gridPath}`);
  await page.waitForSelector("[data-masonry-card] a", { state: "attached" });
  await page.waitForFunction(() => window.TruongThinhMasonry?.getBrowseState?.());
  return { page, warnings };
}

try {
  // Control: the click waits for the pack, then lands once.
  {
    const { page, warnings } = await openGrid();
    await page.locator('[data-masonry-filter="signage"]').click();
    await page.waitForTimeout(500);
    assert.deepEqual(await state(page), { current: "all", path: gridPath }, "filter click waits while its pack runs");
    await page.waitForTimeout(FILTER_DELAY_MS + 1500);
    assert.deepEqual(await state(page), { current: "signage", path: `${gridPath}bang-hieu-quang-cao/` }, "filter click lands once its pack arrives");
    assert.deepEqual(warnings, [], "a pack still running warns nothing");
    await page.close();
  }
  // Re-clicking the active filter cancels the pending click.
  {
    const { page } = await openGrid();
    await page.locator('[data-masonry-filter="signage"]').click();
    await page.waitForTimeout(100);
    await page.locator('[data-masonry-filter="all"]').click();
    await page.waitForTimeout(FILTER_DELAY_MS + 1500);
    assert.deepEqual(await state(page), { current: "all", path: gridPath }, "re-clicking All cancels the pending Signage click");
    await page.close();
  }
  // Opening a card cancels the pending click: the card URL stays.
  {
    const { page } = await openGrid();
    await page.locator('[data-masonry-filter="signage"]').click();
    await page.waitForTimeout(100);
    await page.locator("[data-project-grid] [data-masonry-card]:not([data-masonry-category='signage']) a").first().click();
    await page.waitForFunction(() => location.pathname.includes("/p/"));
    // Opening a card selects the card's own cluster; the late Signage pack must not replace it.
    const browseCategory = () => page.evaluate(() => window.TruongThinhMasonry.getBrowseState().category);
    const opened = { ...(await state(page)), category: await browseCategory() };
    await page.waitForTimeout(FILTER_DELAY_MS + 1500);
    assert.deepEqual({ ...(await state(page)), category: await browseCategory() }, opened,
      "a late pack does not rewrite the open card's URL or history entry");
    await page.close();
  }
  console.log("advertising layout pending click: ok");
} finally {
  await browser.close();
}
