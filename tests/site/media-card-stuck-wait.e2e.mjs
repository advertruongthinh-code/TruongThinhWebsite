import assert from "node:assert/strict";
import { test } from "node:test";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";
import { BASE_URL, VIEWPORTS, launchBrowser, openPage } from "./harness.mjs";

// Owner 2026-11-17: some media of a multi-media card stayed under their wait motion until F5 (PC, search, network cut). A file the shared
// queue started and that never answers must not hold its slot for good, and a media that failed during a network cut loads once the
// network is back.
const fixtureId = "signage-raised-letters-01";
const COUNT = 8;

function artifact(tag = "media-stuck") {
  const value = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  const card = value.cards.find((item) => item.id === fixtureId);
  assert(card, "fixture card exists");
  const cover = card.mediaItems.find((item) => item.id === fixtureId);
  card.mediaItems = Array.from({ length: COUNT }, (_, index) => index === 0 ? cover : {
    ...cover, id: `${fixtureId}-stuck-${index}`, src: `${cover.src}?${tag}=${index}`,
    sourceId: `${cover.sourceId}:test-only:stuck-${index}`,
  });
  card.coverMediaId = cover.id;
  return value;
}

const VIEWS = [["PC 1440", VIEWPORTS.desktop, false], ["phone 390", VIEWPORTS.phone, true]];

async function openCard(page, value) {
  await page.addInitScript((data) => { window.__TT_ADVERTISING_ARTIFACT__ = data; }, value);
  await page.goto(`${BASE_URL}/advertising-products/?category=signage-raised-letters`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
  await page.waitForFunction(() => Boolean(window.TruongThinhMasonry?.getAdapter?.()));
  await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id), fixtureId);
  const card = page.locator(`[data-masonry-card="${fixtureId}"]`);
  await card.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForFunction((id) => document.querySelector(`[data-masonry-card="${id}"] img.is-masonry-media-ready`), fixtureId);
  return card;
}

// Resolves once the media shows with no wait layer over it, or after `ms` with what is there.
const shownWithin = (card, id, ms) => card.evaluate((node, [mediaId, limit]) => new Promise((resolve) => {
  const end = performance.now() + limit;
  const check = () => {
    const layer = node.querySelector(`[data-masonry-media-item="${mediaId}"]`);
    const ready = layer?.classList.contains("is-masonry-media-ready") && !node.querySelector(`.card-media__wait[data-media-id="${mediaId}"]`);
    if (ready || performance.now() > end) resolve({ ready, src: layer?.getAttribute("src") || null, complete: layer?.complete, error: node.querySelector(".is-media-error") !== null });
    else setTimeout(check, 100);
  };
  check();
}), [id, ms]);

for (const [label, viewport, touch] of VIEWS) {
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
      const card = await openCard(page, artifact());
      // Step through every stalled media to the last one, the way the slideshow or a visitor does.
      for (let index = 1; index < COUNT; index += 1) {
        await card.evaluate((node) => node.advertisingAdvance());
        await page.waitForTimeout(700);
      }
      const last = `${fixtureId}-stuck-${COUNT - 1}`;
      assert.equal(await card.getAttribute("data-masonry-active-media-id"), last);
      const shown = await shownWithin(card, last, 15_000);
      assert(shown.ready, `the answered media shows although earlier files never answer: ${JSON.stringify(shown)}`);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}

for (const [label, viewport, touch] of VIEWS) {
  test(`media-card R5 ${label}: a media that failed during a network cut shows once the network is back, without F5`, async () => {
    const browser = await launchBrowser();
    const { context, page } = await openPage(browser, viewport, { hasTouch: touch, isMobile: touch });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      let cut = true;
      let failures = 0;
      await page.route("**/*media-cut=*", (route) => {
        if (!cut) return route.continue();
        failures += 1;
        return route.abort("internetdisconnected");
      });
      const card = await openCard(page, artifact("media-cut"));
      await card.evaluate((node) => node.advertisingAdvance());
      const target = `${fixtureId}-stuck-1`;
      for (const end = Date.now() + 5_000; failures < 2 && Date.now() < end;) await page.waitForTimeout(100);
      assert(failures >= 2, `queue and img both failed during the cut: ${failures}`);
      cut = false;
      const shown = await shownWithin(card, target, 10_000);
      assert(shown.ready, `the media shows once the network is back: ${JSON.stringify(shown)}`);
      assert(!shown.error, "no error marker is left on the card");
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
