import assert from "node:assert/strict";
import { test } from "node:test";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";
import { BASE_URL, VIEWPORTS, launchBrowser, openPage } from "./harness.mjs";

// media-card R4 slideshow (owner 2026-11-13): a card with several media showing more than 1/2 below the navbar stands 4s on an image, then
// steps forward (wrapping, the first media comes in from the right), loaded or not; cards start on a random phase so they never step
// together; the mouse on a card holds it, leaving restarts its 4s, a swipe restarts its 4s; the primary and reduced motion never step.
const fixtureId = "signage-raised-letters-01";
const DELAY_MS = 3_000;

// Every card gets three images (cover plus two copies) so the slideshow has candidates whatever the layout; the fixture card's third
// image answers late, to check it rides in under its wait layer.
function slideArtifact() {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  for (const card of artifact.cards) {
    const cover = card.mediaItems.find((item) => item.id === card.coverMediaId) || card.mediaItems[0];
    if (cover.kind !== "image") continue;
    card.mediaItems = [0, 1, 2].map((index) => index === 0 ? cover : {
      ...cover, id: `${card.id}-slide-${index}`,
      src: `${cover.src}?${card.id === fixtureId && index === 2 ? "slide-wait" : "slide"}=${index}`,
      sourceId: `${cover.sourceId}:test-only:slide-${index}`,
    });
    card.coverMediaId = cover.id;
  }
  return artifact;
}

async function open(viewport, options = {}) {
  const browser = await launchBrowser();
  const { page } = await openPage(browser, viewport, options);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*slide-wait=*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    await route.continue().catch(() => {});
  });
  // Every media change of every card, with its time, and whether the incoming media rode in under a wait layer.
  await page.addInitScript((artifact) => {
    window.__TT_ADVERTISING_ARTIFACT__ = artifact;
    window.__steps = [];
    new MutationObserver((records) => records.forEach(({ target }) => {
      const id = target.dataset.masonryCard;
      if (!id) return;
      window.__steps.push({ id, media: target.dataset.masonryActiveMediaId, t: performance.now(),
        wait: target.querySelector(".card-media__wait")?.dataset.mediaId || null,
        lanes: target.querySelectorAll(".card-media__image--lane").length });
    })).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-masonry-active-media-id"] });
  }, slideArtifact());
  await page.goto(`${BASE_URL}/vi/advertising-products/?category=signage-raised-letters`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
  await page.waitForFunction(() => Boolean(window.TruongThinhMasonry?.getAdapter?.()));
  await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id), fixtureId);
  const card = page.locator(`[data-masonry-card="${fixtureId}"]`);
  await card.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForFunction((id) => document.querySelector(`[data-masonry-card="${id}"] img.is-masonry-media-ready`), fixtureId);
  // The pointer sits at the left margin, outside every card.
  if (!viewport.hasTouch) await page.mouse.move(2, viewport.height / 2);
  const steps = (id = fixtureId) => page.evaluate((cardId) => window.__steps.filter((step) => step.id === cardId), id);
  const now = () => page.evaluate(() => performance.now());
  return { browser, page, card, errors, steps, now };
}

test("media-card R4 slideshow PC: cards step forward every 4s on a random phase, the late media rides in under its wait layer", async () => {
  const { browser, page, errors, steps } = await open(VIEWPORTS.desktop);
  try {
    const start = await page.evaluate(() => performance.now());
    await page.waitForTimeout(15_000);
    const all = await page.evaluate(() => window.__steps);
    const mine = await steps();
    assert(mine.length >= 2, `the fixture card stepped at least twice: ${JSON.stringify(mine)}`);
    assert.deepEqual(mine.slice(0, 3).map((step) => step.media),
      [`${fixtureId}-slide-1`, `${fixtureId}-slide-2`, fixtureId].slice(0, Math.min(3, mine.length)), "steps go forward and wrap");
    const gaps = mine.slice(1).map((step, index) => step.t - mine[index].t);
    assert(gaps.every((gap) => gap >= 4_000 && gap < 5_500), `4s on each media plus the slide: ${gaps}`);
    assert(mine[0].t - start < 7_000, `the first step comes within the random 2-6s phase: ${mine[0].t - start}`);
    // The third image is still in flight when its turn comes: the strip slides at once and it rides in under its wait layer.
    const late = mine.find((step) => step.media === `${fixtureId}-slide-2`);
    assert(late.wait === late.media && late.lanes >= 2, `the late media slides in under its wait layer: ${JSON.stringify(late)}`);
    // Random phase: first steps of the cards spread out, and no two cards step in the same frame.
    assert(new Set(all.map((step) => step.id)).size >= 2, `several cards run the slideshow: ${JSON.stringify(all)}`);
    const firstSteps = [...new Set(all.map((step) => step.id))].map((id) => all.find((step) => step.id === id).t).sort((a, b) => a - b);
    assert(firstSteps.at(-1) - firstSteps[0] > 300, `cards start on different phases: ${firstSteps}`);
    const times = all.map((step) => step.t).sort((a, b) => a - b);
    assert(times.slice(1).every((time, index) => time - times[index] > 8), `one card steps per frame: ${times}`);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test("media-card R4 slideshow PC: the mouse holds the card, leaving restarts its 4s", async () => {
  const { browser, page, card, errors, steps, now } = await open(VIEWPORTS.desktop);
  try {
    await card.hover();
    const before = (await steps()).length;
    await page.waitForTimeout(8_000);
    assert.equal((await steps()).length, before, "no step while the mouse is on the card");
    await page.mouse.move(2, 450);
    const left = await now();
    await page.waitForFunction((count) => window.__steps.filter((step) => step.id === "signage-raised-letters-01").length > count,
      before, { timeout: 8_000 });
    const waited = (await steps()).at(-1).t - left;
    assert(waited >= 3_800 && waited < 5_500, `the card steps 4s after the mouse leaves: ${waited}`);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test("media-card R4 slideshow phone: a swipe moves the card and restarts its 4s", async () => {
  const { browser, page, card, errors, steps } = await open(VIEWPORTS.phone);
  try {
    await page.waitForFunction(() => window.__steps.some((step) => step.id === "signage-raised-letters-01"), null, { timeout: 8_000 });
    await page.waitForTimeout(2_000);
    await card.evaluate((node) => {
      const link = node.querySelector(":scope > a");
      const rect = link.getBoundingClientRect();
      const base = { bubbles: true, cancelable: true, pointerId: 7, pointerType: "touch", isPrimary: true, clientY: rect.top + rect.height / 2 };
      link.dispatchEvent(new PointerEvent("pointerdown", { ...base, clientX: rect.left + rect.width * 0.8 }));
      link.dispatchEvent(new PointerEvent("pointerup", { ...base, clientX: rect.left + rect.width * 0.2 }));
    });
    const swiped = (await steps()).at(-1);
    await page.waitForFunction((t) => window.__steps.some((step) => step.id === "signage-raised-letters-01" && step.t > t + 1),
      swiped.t, { timeout: 8_000 });
    const after = (await steps()).find((step) => step.t > swiped.t + 1);
    assert(after.t - swiped.t >= 3_800, `the next step waits 4s from the swipe: ${after.t - swiped.t}`);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test("media-card R4 slideshow: reduced motion never steps", async () => {
  const { browser, page, errors } = await open(VIEWPORTS.desktop, { reducedMotion: "reduce" });
  try {
    await page.waitForTimeout(7_000);
    assert.deepEqual(await page.evaluate(() => window.__steps), [], "no card steps under reduced motion");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test("media-card R4 slideshow: the primary does not run it", async () => {
  const { browser, page, card, errors } = await open(VIEWPORTS.desktop);
  try {
    await card.locator(":scope > a").click();
    await page.waitForFunction(() => document.body.classList.contains("is-detail"));
    const view = page.locator("[data-detail-view]");
    const first = await view.getAttribute("data-masonry-active-media-id");
    await page.waitForTimeout(7_000);
    assert.equal(await view.getAttribute("data-masonry-active-media-id"), first, "the primary stays on its media");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
