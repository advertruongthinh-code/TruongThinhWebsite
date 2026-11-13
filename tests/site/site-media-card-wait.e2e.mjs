import assert from "node:assert/strict";
import { test } from "node:test";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";
import { BASE_URL, VIEWPORTS, launchBrowser, openPage } from "./harness.mjs";

// media-card R3, R5 (owner 2026-11-12): the strip slides at once to a media still loading, which rides in under a wait layer (PC frosted
// glass, phone color layer) until its file has decoded; the shared queue never runs more than its cap plus the viewed media.
const fixtureId = "signage-raised-letters-01";
const DELAY_MS = 2_000;

function slowArtifact() {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  const card = artifact.cards.find((item) => item.id === fixtureId);
  assert(card, "fixture card exists");
  const cover = card.mediaItems.find((item) => item.id === fixtureId);
  card.mediaItems = Array.from({ length: 4 }, (_, index) => index === 0 ? cover : {
    ...cover, id: `${fixtureId}-wait-${index}`, src: `${cover.src}?media-wait=${index}`,
    sourceId: `${cover.sourceId}:test-only:wait-${index}`,
  });
  card.coverMediaId = cover.id;
  return artifact;
}

async function setup(page) {
  const live = { now: 0, max: 0 };
  await page.exposeFunction("__mediaWaitCount", () => live.max);
  await page.route("**/*media-wait=*", async (route) => {
    live.now += 1;
    live.max = Math.max(live.max, live.now);
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    live.now -= 1;
    await route.continue().catch(() => {});
  });
  await page.addInitScript((artifact) => { window.__TT_ADVERTISING_ARTIFACT__ = artifact; }, slowArtifact());
  await page.goto(`${BASE_URL}/vi/advertising-products/?category=signage-raised-letters`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
  await page.waitForFunction(() => Boolean(window.TruongThinhMasonry?.getAdapter?.()));
  await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id), fixtureId);
  const card = page.locator(`[data-masonry-card="${fixtureId}"]`);
  await card.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForFunction((id) => document.querySelector(`[data-masonry-card="${id}"] img.is-masonry-media-ready`), fixtureId);
  return { card, live };
}

// Within a few frames of the press: translate animations run and the incoming lane carries a wait layer.
async function pressState(card, press) {
  return card.evaluate(async (node, how) => {
    const start = performance.now();
    if (how === "arrow") node.querySelector('[data-masonry-media-hover-step="1"]').click();
    else {
      const link = node.querySelector(":scope > a");
      const rect = link.getBoundingClientRect();
      const base = { bubbles: true, cancelable: true, pointerId: 7, pointerType: "touch", isPrimary: true, clientY: rect.top + rect.height / 2 };
      link.dispatchEvent(new PointerEvent("pointerdown", { ...base, clientX: rect.left + rect.width * 0.8 }));
      link.dispatchEvent(new PointerEvent("pointerup", { ...base, clientX: rect.left + rect.width * 0.2 }));
    }
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const moving = node.getAnimations({ subtree: true }).filter((animation) =>
      animation.effect?.getKeyframes().some((frame) => "translate" in frame) && animation.playState === "running");
    const wait = node.querySelector(".card-media__wait");
    return { elapsed: performance.now() - start, moving: moving.length, activeId: node.dataset.masonryActiveMediaId,
      wait: wait && { frost: wait.classList.contains("card-media__wait--frost"), colors: wait.dataset.mediaWait || null,
        id: wait.dataset.mediaId, hidden: wait.hidden, translate: getComputedStyle(wait).translate } };
  }, press);
}

async function settled(card, id) {
  return card.evaluate((node, mediaId) => new Promise((resolve) => {
    const check = () => {
      const layer = node.querySelector(`[data-masonry-media-item="${mediaId}"]`);
      if (layer?.classList.contains("is-masonry-media-ready") && !node.querySelector(".card-media__wait")) resolve(true);
      else setTimeout(check, 50);
    };
    check();
  }), id);
}

for (const [label, viewport, touch] of [["PC 1440", VIEWPORTS.desktop, false], ["phone 390", VIEWPORTS.phone, true]]) {
  test(`media-card R5 ${label}: the strip slides at once onto a loading media under its wait layer, then shows it`, async () => {
    const browser = await launchBrowser();
    const { context, page } = await openPage(browser, viewport, { hasTouch: touch, isMobile: touch });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      const { card } = await setup(page);
      if (!touch) await card.hover();
      const state = await pressState(card, touch ? "swipe" : "arrow");
      assert.equal(state.activeId, `${fixtureId}-wait-1`, `press moves to media 2: ${JSON.stringify(state)}`);
      assert(state.moving > 0, `strip runs within two frames of the press, before the file arrives: ${JSON.stringify(state)}`);
      assert(state.wait && state.wait.id === `${fixtureId}-wait-1` && !state.wait.hidden,
        `incoming lane carries its wait layer: ${JSON.stringify(state)}`);
      if (touch) assert.equal(state.wait.colors, "colors", "phone waits on the color layer");
      else assert(state.wait.frost, "PC waits on frosted glass");
      assert(await settled(card, `${fixtureId}-wait-1`), "media shows and the wait layer goes once the file has decoded");
      const skeleton = await card.evaluate((node) => Boolean(node.querySelector(".masonry-grid__cta-frame")));
      assert(!skeleton, "the card skeleton does not cover a media that waited under its lane layer");
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}

test("media-card R5: the shared queue never runs more than its cap plus the viewed media", async () => {
  const browser = await launchBrowser();
  const { context, page } = await openPage(browser, VIEWPORTS.desktop);
  try {
    const { card, live } = await setup(page);
    await card.hover();
    for (let step = 0; step < 3; step += 1) await card.locator('[data-masonry-media-hover-step="1"]').click();
    await settled(card, `${fixtureId}-wait-3`);
    assert(live.max <= 5, `PC cap 4 plus the viewed media: ${live.max}`);
    const requests = await page.evaluate(() => performance.getEntriesByType("resource")
      .filter((entry) => entry.name.includes("media-wait=")).map((entry) => entry.name));
    assert.equal(new Set(requests).size, requests.length, `no media file is requested twice: ${JSON.stringify(requests)}`);
  } finally {
    await context.close();
    await browser.close();
  }
});

// media-card R6 (owner 2026-11-12): primary loads the media being viewed first, then every other media of the card through the queue; an arrow
// press slides at once, the target lane under its wait layer until the file has decoded.
for (const [label, viewport, touch] of [["PC 1440", VIEWPORTS.desktop, false], ["phone 390", VIEWPORTS.phone, true]]) {
  test(`media-card R6 ${label}: primary queues the other media and slides at once onto a loading one under its wait layer`, async () => {
    const browser = await launchBrowser();
    const { context, page } = await openPage(browser, viewport, { hasTouch: touch, isMobile: touch });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const requested = new Set();
    try {
      await page.route("**/*media-wait=*", async (route) => {
        requested.add(new URL(route.request().url()).searchParams.get("media-wait"));
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        await route.continue().catch(() => {});
      });
      await page.addInitScript((artifact) => { window.__TT_ADVERTISING_ARTIFACT__ = artifact; }, slowArtifact());
      await page.goto(`${BASE_URL}/vi/advertising-products/?category=signage-raised-letters&photo=${fixtureId}`, { waitUntil: "domcontentloaded" });
      await page.locator("[data-detail-view]").waitFor({ state: "visible" });
      await page.waitForFunction(() => {
        const image = document.querySelector("[data-detail-view] [data-detail-image]");
        return image?.complete && image.naturalWidth > 0;
      });
      await page.waitForTimeout(300);
      assert.deepEqual([...requested].sort(), ["1", "2", "3"], "every other media is queued once the viewed media shows");
      const state = await page.evaluate(async () => {
        document.querySelector('[data-detail-media-step="1"]').click();
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        const strip = document.querySelector(".detail-view__strip");
        const wait = strip?.querySelector(".card-media__wait");
        return { moving: strip ? strip.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length : 0,
          wait: wait && { frost: wait.classList.contains("card-media__wait--frost"), colors: wait.dataset.mediaWait || null } };
      });
      assert(state.moving > 0, `primary strip runs within two frames of the press: ${JSON.stringify(state)}`);
      assert(state.wait, `target lane carries its wait layer: ${JSON.stringify(state)}`);
      if (touch) assert.equal(state.wait.colors, "colors", "phone waits on the color layer");
      else assert(state.wait.frost, "PC waits on frosted glass");
      await page.waitForFunction(() => !document.querySelector(".detail-view__strip"), null, { timeout: 15_000 });
      assert.match(await page.locator("[data-detail-view] [data-detail-image]").getAttribute("src"), /media-wait=1/);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
