import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1569, height: 912 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseUrl}/vi/advertising-products/?photo=kiosk-posm-07&tag=format-square`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector('[data-detail-view]')?.dataset.detailLayout === "split");
  const first = await page.evaluate(() => {
    const suggestion = document.querySelector('[data-detail-suggestion]');
    window.__originalSuggestion = suggestion;
    return {
      count: document.querySelectorAll('[data-detail-suggestion]').length,
      inInfo: Boolean(suggestion?.closest('[data-detail-info]')),
      inRelated: Boolean(suggestion?.closest('[data-detail-related-grid]')),
      pressed: suggestion?.querySelector('[aria-pressed="true"]')?.dataset.masonrySuggestionTag,
      firstRelated: document.querySelector('[data-detail-related-grid]')?.firstElementChild?.hasAttribute('data-masonry-related-card'),
    };
  });
  assert.equal(first.count, 1, "split layout duplicates suggestion UI");
  assert.equal(first.inInfo, true, "split layout must keep suggestion within primary info");
  assert.equal(first.inRelated, false, "split layout must not place suggestion in related grid");
  assert.equal(first.firstRelated, true, "split related grid must start with a real photo card");
  assert.equal(first.pressed, "format-square", "split layout lost the active tag");
  await page.locator('[data-masonry-suggestion-tag="format-square"]').focus();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('[data-detail-view]')?.dataset.detailLayout === "pinterest");
  await page.waitForTimeout(500);
  const full = await page.evaluate(() => {
    const suggestion = document.querySelector('[data-detail-suggestion]');
    return {
      sameNode: suggestion === window.__originalSuggestion,
      count: document.querySelectorAll('[data-detail-suggestion]').length,
      inRelated: Boolean(suggestion?.closest('[data-detail-related-grid]')),
      firstRelated: suggestion === document.querySelector('[data-detail-related-grid]')?.firstElementChild,
      pressed: suggestion?.querySelector('[aria-pressed="true"]')?.dataset.masonrySuggestionTag,
      focused: document.activeElement?.dataset.masonrySuggestionTag,
      search: location.search,
    };
  });
  assert.equal(full.sameNode, true, "resize cloned the suggestion UI");
  assert.equal(full.count, 1, "full-span layout duplicates suggestion UI");
  assert.equal(full.inRelated, true, "full-span layout must place suggestion in related grid");
  assert.equal(full.firstRelated, true, "full-span related grid must start with suggestion UI");
  assert.equal(full.pressed, "format-square", "full-span layout lost the active tag");
  assert.equal(full.focused, "format-square", "resize lost focus within the same suggestion UI");
  assert.equal(new URLSearchParams(full.search).get("tag"), "format-square", "resize changed tag history");

  await page.setViewportSize({ width: 1569, height: 912 });
  await page.waitForFunction(() => document.querySelector('[data-detail-view]')?.dataset.detailLayout === "split");
  const restored = await page.evaluate(() => {
    const suggestion = document.querySelector('[data-detail-suggestion]');
    return {
      sameNode: suggestion === window.__originalSuggestion,
      inInfo: Boolean(suggestion?.closest('[data-detail-info]')),
      pressed: suggestion?.querySelector('[aria-pressed="true"]')?.dataset.masonrySuggestionTag,
      focused: document.activeElement?.dataset.masonrySuggestionTag,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  assert.equal(restored.sameNode, true, "resize back cloned the suggestion UI");
  assert.equal(restored.inInfo, true, "resize back failed to restore split suggestion placement");
  assert.equal(restored.pressed, "format-square", "resize back lost the active tag");
  assert.equal(restored.focused, "format-square", "resize back lost focus within suggestion UI");
  assert(restored.overflow <= 1, `suggestion resize caused ${restored.overflow}px horizontal overflow`);

  await page.evaluate(() => {
    if (!window.TruongThinhMotion?.setLogicalScroll?.(2658)) window.scrollTo(0, 2658);
  });
  await page.waitForFunction(() => (window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY) > 2000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('[data-detail-view]')?.dataset.detailLayout === "pinterest");
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.masonrySuggestionTag), "format-square",
    "deep-scroll split-to-full resize lost focus within suggestion UI");

  await page.goto(`${baseUrl}/vi/advertising-products/?category=kiosk-posm&photo=kiosk-posm-02`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector('[data-detail-view]')?.dataset.detailLayout === "pinterest");
  const focusedSuggestion = page.locator('[data-detail-suggestion] [data-masonry-suggestion-tag]').first();
  await focusedSuggestion.focus();
  const focusedTag = await focusedSuggestion.getAttribute("data-masonry-suggestion-tag");
  await page.evaluate(() => {
    const bottom = document.documentElement.scrollHeight - innerHeight;
    if (!window.TruongThinhMotion?.setLogicalScroll?.(bottom)) window.scrollTo(0, bottom);
  });
  await page.waitForFunction(() => document.querySelector('[data-detail-suggestion]')?.getBoundingClientRect().bottom < 0);
  await page.waitForTimeout(500);
  const retainedFocus = await page.evaluate(() => ({
    tag: document.activeElement?.dataset.masonrySuggestionTag,
    hidden: document.querySelector('[data-detail-suggestion]')?.hidden,
  }));
  assert.equal(retainedFocus.tag, focusedTag, "focused suggestion lost keyboard focus when virtualized offscreen");
  assert.equal(retainedFocus.hidden, false, "focused suggestion was hidden while keyboard focus remained inside it");
  assert.deepEqual(errors, [], "suggestion mode switch logged browser errors");
  console.log("[advertising-suggestion-conditional] split/full-span reparent and active-state checks passed");
} finally {
  await browser.close();
}
