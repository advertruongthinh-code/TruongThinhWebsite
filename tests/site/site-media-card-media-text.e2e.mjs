import assert from "node:assert/strict";
import { test } from "node:test";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";
import { ADVERTISING_MEDIA_MANIFEST } from "../../src/site/advertising-products/media-manifest.mjs";
import { BASE_URL, VIEWPORTS, launchBrowser, openPage } from "./harness.mjs";

// media-card R7 (owner 2026-11-14): the card name stays the card's whatever media is shown; the detail description follows the media
// shown (its own when it has one, the card's for the cover).
const cardId = "kiosk-posm-51";
const record = ADVERTISING_MEDIA_MANIFEST.find(({ id }) => id === cardId);
const { category } = ADVERTISING_CATALOG_ARTIFACT.cards.find(({ id }) => id === cardId);
const descriptionOf = (mediaId) => record.mediaDescriptions[mediaId]?.vi ?? record.descriptionVi;

test("media-card R7: one card name, the detail description follows the media shown", async () => {
  assert(record.mediaItems.length >= 3);
  const browser = await launchBrowser();
  const { page } = await openPage(browser, VIEWPORTS.desktop, { reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(`${BASE_URL}/vi/advertising-products/?category=${category}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.waitForFunction(() => Boolean(window.TruongThinhMasonry?.getAdapter?.()));
    await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id), cardId);
    const card = page.locator(`[data-masonry-card="${cardId}"]`);
    await card.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
    await card.hover();
    const caption = card.locator("figcaption");
    const shown = () => card.getAttribute("data-masonry-active-media-id");
    assert.equal(await caption.textContent(), record.titleVi);
    // Step to a merged media: the card keeps its one name.
    if (await shown() === record.coverMediaId) await card.locator('[data-masonry-media-hover-step="1"]').click();
    const merged = await shown();
    assert.notEqual(merged, record.coverMediaId);
    assert.equal(await caption.textContent(), record.titleVi, "the card name does not change with the media");
    // Detail opens on that media and shows its description; a thumbnail back to the cover shows the card's description.
    await card.locator(":scope > a").click();
    await page.waitForFunction(() => document.body.classList.contains("is-detail"));
    const description = page.locator("[data-detail-description]");
    await page.waitForFunction((text) => document.querySelector("[data-detail-description]")?.textContent === text, descriptionOf(merged));
    await page.locator(`[data-detail-media-select="${record.coverMediaId}"]`).click();
    await page.waitForFunction((text) => document.querySelector("[data-detail-description]")?.textContent === text, record.descriptionVi);
    assert.equal(await description.textContent(), record.descriptionVi);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
