import assert from "node:assert/strict";
import { test } from "node:test";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";
import { BASE_URL, VIEWPORTS, launchBrowser, openPage } from "./harness.mjs";

// advertising-detail R9, media-card R6 (owner 2026-11-13): on PC the primary's loading Flow runs only inside the media's contain box, and the
// zoom blur in the spare area blurs that running Flow, as it blurs a playing video; a strip lane still loading shows its Flow there too.
// Run: pnpm dev, then node --test tests/site/primary-flow-zoom-blur.e2e.mjs
const fixtureId = "signage-raised-letters-01";
const DELAY_MS = 4_000;
// The second media arrives much later, so the strip rides onto it while it still loads.
const LANE_DELAY_MS = 20_000;

// Every media of the fixture card waits; the cover keeps its own file so the frame has spare area beside it.
function slowArtifact() {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  const card = artifact.cards.find((item) => item.id === fixtureId);
  assert(card, "fixture card exists");
  const cover = card.mediaItems.find((item) => item.id === fixtureId);
  card.mediaItems = Array.from({ length: 3 }, (_, index) => ({
    ...cover, id: index ? `${fixtureId}-wait-${index}` : cover.id, src: `${cover.src}?media-wait=${index}`,
    sourceId: index ? `${cover.sourceId}:test-only:wait-${index}` : cover.sourceId,
  }));
  card.coverMediaId = cover.id;
  return artifact;
}

// Mean alpha (0..255) of the live blur background and whether it is shown.
const liveState = () => {
  const live = document.querySelector("[data-detail-view] .detail-view__live-background");
  if (!live || live.hidden || getComputedStyle(live).display === "none") return { shown: false, alpha: 0 };
  const data = live.getContext("2d").getImageData(0, 0, live.width, live.height).data;
  let sum = 0;
  for (let index = 3; index < data.length; index += 4) sum += data[index];
  return { shown: true, alpha: sum / (data.length / 4) };
};

test("advertising-detail R9 PC 1440: the loading Flow fits the media box and the zoom blur blurs it", async () => {
  const browser = await launchBrowser();
  const { context, page } = await openPage(browser, VIEWPORTS.desktop);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.route("**/*media-wait=*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, route.request().url().endsWith("media-wait=1") ? LANE_DELAY_MS : DELAY_MS));
      await route.continue().catch(() => {});
    });
    await page.addInitScript((value) => { window.__TT_ADVERTISING_ARTIFACT__ = value; }, slowArtifact());
    // A narrow frame leaves spare area on both sides of the media whatever its ratio.
    await page.setViewportSize({ width: 1440, height: 520 });
    await page.goto(`${BASE_URL}/vi/advertising-products/?category=signage-raised-letters&photo=${fixtureId}`, { waitUntil: "domcontentloaded" });
    await page.locator("[data-detail-view]").waitFor({ state: "visible" });
    await page.waitForFunction(() => document.querySelector("[data-detail-view] .detail-view__hero-frame > .masonry-grid__cta-frame.is-entry-ready"),
      null, { timeout: 5_000 });
    const box = await page.evaluate(() => {
      const view = document.querySelector("[data-detail-view]");
      const frame = view.querySelector(".detail-view__hero-frame > .masonry-grid__cta-frame").getBoundingClientRect();
      const image = view.querySelector("[data-detail-image]").getBoundingClientRect();
      const hero = view.querySelector(".detail-view__hero-frame").getBoundingClientRect();
      return { flow: [frame.x, frame.y, frame.width, frame.height].map(Math.round),
        image: [image.x, image.y, image.width, image.height].map(Math.round), spare: hero.width - image.width > 8 || hero.height - image.height > 8,
        glass: view.querySelector("[data-detail-glass]")?.dataset.detailGlass ?? view.dataset.detailGlass };
    });
    assert(box.spare && box.glass === "true", `fixture leaves spare area: ${JSON.stringify(box)}`);
    assert.deepEqual(box.flow, box.image, "the loading Flow covers exactly the media box");
    const loading = await page.waitForFunction(`(${liveState})().alpha > 200 && (${liveState})()`, null, { timeout: 3_000 })
      .then((handle) => handle.jsonValue(), () => page.evaluate(liveState));
    assert(loading.shown && loading.alpha > 200, `the zoom blur shows the running Flow: ${JSON.stringify(loading)}`);
    // Slide on to a media still loading: its lane Flow keeps feeding the zoom blur while the strip runs.
    await page.waitForFunction(() => !document.querySelector("[data-detail-view] .detail-view__hero-frame > .masonry-grid__cta-frame"),
      null, { timeout: DELAY_MS + 5_000 });
    await page.evaluate(() => document.querySelector('[data-detail-media-step="1"]').click());
    await page.waitForFunction(() => document.querySelector(".detail-view__strip .card-media__wait--flow .is-entry-ready"), null, { timeout: 3_000 });
    await page.waitForTimeout(800);
    const sliding = await page.evaluate(liveState);
    assert(sliding.shown && sliding.alpha > 200, `the zoom blur shows the lane Flow: ${JSON.stringify(sliding)}`);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
    await browser.close();
  }
});
