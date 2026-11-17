import assert from "node:assert/strict";
import { test } from "node:test";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";
import { BASE_URL, VIEWPORTS, launchBrowser, openPage } from "./harness.mjs";

// Owner 2026-11-17: some media of a multi-media card stayed under their wait motion until F5. A file the shared queue started and that
// never answers must not hold its slot for good: the other media of the card still load.
const fixtureId = "signage-raised-letters-01";
const COUNT = 8;

function artifact() {
  const value = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  const card = value.cards.find((item) => item.id === fixtureId);
  assert(card, "fixture card exists");
  const cover = card.mediaItems.find((item) => item.id === fixtureId);
  card.mediaItems = Array.from({ length: COUNT }, (_, index) => index === 0 ? cover : {
    ...cover, id: `${fixtureId}-stuck-${index}`, src: `${cover.src}?media-stuck=${index}`,
    sourceId: `${cover.sourceId}:test-only:stuck-${index}`,
  });
  card.coverMediaId = cover.id;
  return value;
}

for (const [label, viewport, touch] of [["PC 1440", VIEWPORTS.desktop, false], ["phone 390", VIEWPORTS.phone, true]]) {
  test(`media-card R5 ${label}: files that never answer do not keep the other media of a card waiting`, async () => {
    const browser = await launchBrowser();
    const { context, page } = await openPage(browser, viewport, { hasTouch: touch, isMobile: touch });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      // Media 1 to COUNT - 2 never answer (a stalled connection); the last media answers at once.
      await page.route("**/*media-stuck=*", (route) => {
        const index = Number(new URL(route.request().url()).searchParams.get("media-stuck"));
        if (index === COUNT - 1) return route.continue();
        return undefined;
      });
      await page.addInitScript((value) => { window.__TT_ADVERTISING_ARTIFACT__ = value; }, artifact());
      await page.goto(`${BASE_URL}/vi/advertising-products/?category=signage-raised-letters`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
      await page.waitForFunction(() => Boolean(window.TruongThinhMasonry?.getAdapter?.()));
      await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id), fixtureId);
      const card = page.locator(`[data-masonry-card="${fixtureId}"]`);
      await card.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
      await page.waitForFunction((id) => document.querySelector(`[data-masonry-card="${id}"] img.is-masonry-media-ready`), fixtureId);
      // Step through every stalled media to the last one, the way the slideshow or a visitor does.
      for (let index = 1; index < COUNT; index += 1) {
        await card.evaluate((node) => node.advertisingAdvance());
        await page.waitForTimeout(700);
      }
      const last = `${fixtureId}-stuck-${COUNT - 1}`;
      assert.equal(await card.getAttribute("data-masonry-active-media-id"), last);
      const shown = await card.evaluate((node, id) => new Promise((resolve) => {
        const end = performance.now() + 15_000;
        const check = () => {
          const layer = node.querySelector(`[data-masonry-media-item="${id}"]`);
          const ready = layer?.classList.contains("is-masonry-media-ready") && !node.querySelector(`.card-media__wait[data-media-id="${id}"]`);
          if (ready || performance.now() > end) resolve({ ready, src: layer?.getAttribute("src") || null });
          else setTimeout(check, 100);
        };
        check();
      }), last);
      assert(shown.ready, `the answered media shows although earlier files never answer: ${JSON.stringify(shown)}`);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
