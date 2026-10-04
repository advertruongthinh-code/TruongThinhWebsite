import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".tooling/browsers");

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });

try {
  for (const [locale, viewport] of [["vi", { width: 390, height: 844 }], ["en", { width: 820, height: 1180 }]]) {
    const page = await browser.newPage({ viewport });
    const url = `${baseUrl}/${locale}/advertising-products/?photo=kiosk-posm-07&tag=format-square`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-advertising-photo-view]:not([hidden]) [data-advertising-suggestion-tag][aria-pressed="true"]');
    const before = await page.evaluate(() => ({
      photo: new URL(location.href).searchParams.get("photo"),
      tag: new URL(location.href).searchParams.get("tag"),
      inInfo: document.querySelector("[data-advertising-photo-info] [data-advertising-photo-suggestion]") !== null,
      inRelated: document.querySelector("[data-advertising-photo-related-grid] [data-advertising-photo-suggestion]") !== null,
      reset: document.querySelectorAll("[data-advertising-photo-tag-reset]").length,
      activeSuggestionCount: document.querySelectorAll('[data-advertising-suggestion-tag][aria-pressed="true"]').length,
      bodyFontSize: Number.parseFloat(getComputedStyle(document.querySelector("[data-advertising-photo-description]")).fontSize),
    }));
    assert.equal(before.photo, "kiosk-posm-07");
    assert.equal(before.tag, "format-square");
    assert.equal(before.inInfo, false, `${locale}: full-span suggestion must be outside primary information`);
    assert.equal(before.inRelated, true, `${locale}: full-span suggestion must be the first related-grid card`);
    assert.equal(before.reset, 0, `${locale}: standalone reset is removed`);
    assert.equal(before.activeSuggestionCount, 1, `${locale}: active filter is represented by exactly one pressed toggle`);
    const alternate = page.locator('[data-advertising-suggestion-tag]:not([aria-pressed="true"])').first();
    const alternateTag = await alternate.getAttribute("data-advertising-suggestion-tag");
    await alternate.click();
    await page.waitForFunction((tag) => new URL(location.href).searchParams.get("tag") === tag, alternateTag);
    await page.waitForFunction((tag) => document.activeElement?.dataset?.advertisingSuggestionTag === tag, alternateTag);
    assert.equal(await page.locator('[data-advertising-suggestion-tag][aria-pressed="true"]').count(), 1, `${locale}: changing tag keeps one active toggle`);
    await page.locator(`[data-advertising-suggestion-tag="${alternateTag}"][aria-pressed="true"]`).press("Enter");
    await page.waitForFunction(() => !new URL(location.href).searchParams.has("tag"));
    await page.waitForFunction(() => document.activeElement === document.querySelector("[data-advertising-photo-info]"));
    const after = await page.evaluate(() => ({ photo: new URL(location.href).searchParams.get("photo"), activeCount: document.querySelectorAll('[data-advertising-suggestion-tag][aria-pressed="true"]').length }));
    assert.equal(after.photo, before.photo, `${locale}: toggle-off keeps the current photo`);
    assert.equal(after.activeCount, 0, `${locale}: toggle-off clears the active semantic state`);
    const zoomed = await page.evaluate(async () => {
      document.documentElement.style.fontSize = "200%";
      window.dispatchEvent(new Event("resize"));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const info = document.querySelector("[data-advertising-photo-info]");
      const description = document.querySelector("[data-advertising-photo-description]");
      const pager = info.querySelector("[data-advertising-photo-description-pager]");
      return {
        bodyFontSize: Number.parseFloat(getComputedStyle(description).fontSize),
        overflowY: getComputedStyle(info).overflowY,
        pagerCount: Number(pager?.dataset.pageCount),
      };
    });
    assert.ok(zoomed.bodyFontSize > before.bodyFontSize, `${locale}: 200% text increases the computed body size`);
    assert.notEqual(zoomed.overflowY, "auto", `${locale}: enlarged info must keep the pager instead of an inner scrollbar`);
    assert.ok(zoomed.pagerCount >= 1, `${locale}: enlarged description pager lost its content`);
    await page.close();
}
const historyPage = await browser.newPage({ viewport: { width: 820, height: 1180 } });
await historyPage.goto(`${baseUrl}/en/advertising-products/`, { waitUntil: "networkidle" });
await historyPage.waitForFunction(() => window.TruongThinhAdvertising?.getBrowseState?.());
const browseState = () => historyPage.evaluate(() => {
  const browse = window.TruongThinhAdvertising.getBrowseState();
  return {
    photo: browse.photo,
    tag: browse.tag,
    url: location.href,
    pressed: [...document.querySelectorAll('[data-advertising-suggestion-tag][aria-pressed="true"]')]
      .map((node) => node.dataset.advertisingSuggestionTag),
  };
});
// Grid order is random per visit, so open whichever single-photo card renders first.
const firstCard = historyPage.locator("[data-advertising-card]:not(:has(.advertising-card-media--carousel)) > a").first();
const openedId = await firstCard.evaluate((node) => node.parentElement.dataset.advertisingCard);
await firstCard.click();
await historyPage.waitForFunction((photo) => window.TruongThinhAdvertising.getBrowseState().photo === photo, openedId);
const opened = await browseState();
assert.deepEqual({ photo: opened.photo, tag: opened.tag, pressed: opened.pressed }, { photo: openedId, tag: null, pressed: [] }, "native photo open records its browse state");
assert.equal(new URL(opened.url).searchParams.get("photo"), openedId, "native photo open writes the photo URL");
const related = historyPage.locator("[data-advertising-related-card] > a").first();
const relatedPhoto = await related.evaluate((node) => node.closest("[data-advertising-related-card]").dataset.advertisingRelatedCard);
await related.click();
await historyPage.waitForFunction((photo) => window.TruongThinhAdvertising.getBrowseState().photo === photo, relatedPhoto);
const selected = historyPage.locator('[data-advertising-suggestion-tag]:not([aria-pressed="true"])').first();
const selectedTag = await selected.getAttribute("data-advertising-suggestion-tag");
await selected.click();
await historyPage.waitForFunction((tag) => window.TruongThinhAdvertising.getBrowseState().tag === tag, selectedTag);
const tagged = await browseState();
assert.deepEqual({ photo: tagged.photo, tag: tagged.tag, pressed: tagged.pressed }, { photo: relatedPhoto, tag: selectedTag, pressed: [selectedTag] }, "tag replacement preserves the current related photo and pressed toggle");
await historyPage.locator(`[data-advertising-suggestion-tag="${selectedTag}"][aria-pressed="true"]`).press("Enter");
await historyPage.waitForFunction(() => window.TruongThinhAdvertising.getBrowseState().tag === null);
await historyPage.goBack({ waitUntil: "networkidle" });
await historyPage.waitForFunction((photo) => window.TruongThinhAdvertising.getBrowseState().photo === photo, openedId);
const back = await browseState();
assert.deepEqual({ photo: back.photo, tag: back.tag, pressed: back.pressed }, { photo: openedId, tag: null, pressed: [] }, "Back restores the opened photo state after replacement");
assert.equal(new URL(back.url).searchParams.get("photo"), openedId, "Back restores the opened photo URL");
await historyPage.goForward({ waitUntil: "networkidle" });
await historyPage.waitForFunction((photo) => window.TruongThinhAdvertising.getBrowseState().photo === photo, relatedPhoto);
const forward = await browseState();
assert.deepEqual({ photo: forward.photo, tag: forward.tag, pressed: forward.pressed }, { photo: relatedPhoto, tag: null, pressed: [] }, "Forward restores the related photo after tag replacement");
assert.equal(new URL(forward.url).searchParams.get("photo"), relatedPhoto, "Forward restores the related photo URL");
await historyPage.close();

  const mobile = await browser.newPage({ viewport: { width: 820, height: 1180 } });
  await mobile.goto(`${baseUrl}/en/advertising-products/?photo=mobile-retail-04&tag=use-sampling`, { waitUntil: "networkidle" });
  await mobile.waitForTimeout(1000);
  const mobileState = await mobile.evaluate(() => ({
    photo: new URL(location.href).searchParams.get("photo"),
    tag: new URL(location.href).searchParams.get("tag"),
    gridSuggestions: document.querySelectorAll("[data-advertising-photo-related-grid] [data-advertising-photo-suggestion]").length,
    related: document.querySelectorAll("[data-advertising-related-card]").length,
  }));
  assert.deepEqual({ photo: mobileState.photo, tag: mobileState.tag }, { photo: "mobile-retail-04", tag: "use-sampling" });
  assert.equal(mobileState.gridSuggestions, 1, "full-span sampling route must have one suggestion in related grid");
  assert.ok(mobileState.related > 0, "mobile sampling route mounts real related photos");
  await mobile.close();
} finally {
  await browser.close();
}
