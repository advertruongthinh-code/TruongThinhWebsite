// Related cards do not pass through primary, and do not tuck under the pinned suggestion, when rearranged (advertising-cta-center-parallax R10,
// advertising-detail R5).
// Sample rects every frame while toggling the suggestion tag on and off and resizing 1569 -> 820 -> 1569; the hero is picked from the masonry at runtime.
// The test must meet at least one case of a card going from the column beside primary to below primary with a detour running, otherwise it fails.
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
const heroLimit = Number(process.env.DETOUR_HEROES || 10);
const detourTarget = 3;

const CARDS = "[data-masonry-related-card]:not([hidden]), [data-masonry-suggestion-card]:not([hidden])";

// Start sampling; resolve after the first rAF frame so the action does not fall into the measurement window.
// Sample until the "related-detour" animation ends and Masonry is still, capped at `cap` ms.
const startSampler = (page, cap) => page.evaluate(({ cap, cards }) => new Promise((started) => {
  const primary = document.querySelector(".detail-view__primary");
  const grid = document.querySelector("[data-detail-related-grid]");
  const nodes = () => [...document.querySelectorAll(cards)].filter((node) => node.closest("[data-detail-related-grid]"));
  const box = (node) => { const r = node.getBoundingClientRect(); return { x: r.left, y: r.top, right: r.right, bottom: r.bottom }; };
  const snapshot = () => Object.fromEntries(nodes().map((node) => [node.dataset.masonryRelatedItem || "suggestion", box(node)]));
  const pinned = () => { const node = grid?.querySelector("[data-detail-suggestion]"); return node && !node.hidden ? node : null; };
  const state = { primary: Boolean(primary && grid), overlaps: [], pinnedOverlaps: [], detours: 0, sampled: 0, before: primary ? snapshot() : {}, primaryBefore: primary && box(primary), done: false };
  window.__detourSample = state;
  if (!state.primary) { state.done = true; started(); return; }
  const start = performance.now();
  let frames = 0;
  let still = 0;
  const tick = () => {
    const p = primary.getBoundingClientRect();
    const pin = pinned();
    const s = pin?.getBoundingClientRect();
    let moving = false;
    for (const node of nodes()) {
      state.sampled += 1;
      const animations = node.getAnimations();
      if (animations.some((animation) => animation.id === "related-detour")) { state.detours += 1; moving = true; }
      if (animations.length || node.style.transition) moving = true;
      const r = node.getBoundingClientRect();
      const x = Math.min(r.right, p.right) - Math.max(r.left, p.left);
      const y = Math.min(r.bottom, p.bottom) - Math.max(r.top, p.top);
      if (x > 0.5 && y > 0.5) state.overlaps.push({ id: node.dataset.masonryRelatedItem, x, y });
      if (s && node !== pin && !pin.contains(node)) {
        const sx = Math.min(r.right, s.right) - Math.max(r.left, s.left);
        const sy = Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top);
        if (sx > 0.5 && sy > 0.5) state.pinnedOverlaps.push({ id: node.dataset.masonryRelatedItem, x: sx, y: sy });
      }
    }
    frames += 1;
    if (frames === 1) started();
    still = moving ? 0 : still + 1;
    // Wait at least 6 frames for the action to trigger motion, then stop after 6 consecutive still frames.
    if (performance.now() - start < cap && (frames < 12 || still < 6)) requestAnimationFrame(tick);
    else { state.after = snapshot(); state.primaryAfter = box(primary); state.done = true; }
  };
  requestAnimationFrame(tick);
}), { cap, cards: CARDS });

const collect = async (page) => {
  await page.waitForFunction(() => window.__detourSample?.done, null, { timeout: 5000 });
  return page.evaluate(() => window.__detourSample);
};

// Number of cards going from the column beside primary (left >= primary's right edge) to below primary (top >= primary's bottom).
const besideToBelow = ({ before, after, primaryBefore, primaryAfter }) => Object.keys(after || {}).filter((id) =>
  before[id] && before[id].x >= primaryBefore.right - 1 && after[id].y >= primaryAfter.bottom - 1).length;

const openDetail = async (page, locale, hero) => {
  await page.goto(`${baseUrl}/${locale}/advertising-products/?photo=${hero}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("[data-detail-view]")?.dataset.masonryDetailReady === "true"
    && !document.documentElement.classList.contains("route-enter") && !document.body.classList.contains("is-transitioning"),
  null, { timeout: 20000 });
  await page.waitForTimeout(500);
};

// After arranging, every card sits at Masonry's exact inline left/top (1px tolerance) and no detour animation remains.
const assertSettled = async (page, label) => {
  await page.waitForTimeout(500);
  const wrong = await page.evaluate((cards) => {
    const grid = document.querySelector("[data-detail-related-grid]");
    const origin = grid.getBoundingClientRect();
    return [...document.querySelectorAll(cards)].filter((node) => grid.contains(node)).flatMap((node) => {
      const r = node.getBoundingClientRect();
      const dx = r.left - origin.left - grid.clientLeft - Number.parseFloat(node.style.left || 0);
      const dy = r.top - origin.top - grid.clientTop - Number.parseFloat(node.style.top || 0);
      const detour = node.getAnimations().some((animation) => animation.id === "related-detour");
      return Math.abs(dx) > 1 || Math.abs(dy) > 1 || detour ? [{ id: node.dataset.masonryRelatedItem, dx, dy, detour }] : [];
    });
  }, CARDS);
  assert.deepEqual(wrong, [], `${label}: card not back at its exact placement`);
};

const browser = await chromium.launch({ headless: true });
try {
  const probe = await browser.newPage({ viewport: { width: 1569, height: 912 } });
  await probe.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
  await probe.waitForSelector("[data-masonry-card]");
  const heroes = (await probe.$$eval("[data-masonry-card]", (nodes) => nodes.map((node) => node.dataset.masonryCard))).slice(0, heroLimit);
  await probe.close();
  assert.ok(heroes.length, "masonry has no cards");

  const detourHeroes = [];
  const errors = [];
  for (const [index, hero] of heroes.entries()) {
    if (detourHeroes.length >= detourTarget) break;
    const locale = index % 2 ? "en" : "vi";
    const page = await browser.newPage({ viewport: { width: 1569, height: 912 } });
    page.on("pageerror", (error) => errors.push(`${hero}: ${error.message}`));
    await openDetail(page, locale, hero);
    const tags = await page.$$eval("[data-masonry-suggestion-tag]", (nodes) => nodes.map((node) => node.dataset.masonrySuggestionTag));
    let heroDetour = false;
    for (const tag of tags.slice(0, 3)) {
      for (let pass = 0; pass < 2; pass++) {
        await startSampler(page, 1500);
        await page.locator(`[data-masonry-suggestion-tag="${tag}"]`).click();
        const sample = await collect(page);
        const label = `${hero} tag ${tag} pass ${pass + 1}`;
        assert.ok(sample.primary, `${label}: primary or related grid not found`);
        assert.ok(sample.sampled > 0, `${label}: no card could be sampled`);
        assert.deepEqual(sample.overlaps, [], `${label}: card giao primary`);
        if (besideToBelow(sample) && sample.detours) heroDetour = true;
        await assertSettled(page, label);
      }
    }
    for (const width of [820, 1569]) {
      await startSampler(page, 1500);
      await page.setViewportSize({ width, height: 912 });
      const sample = await collect(page);
      assert.deepEqual(sample.overlaps, [], `${hero} resize ${width}: card giao primary`);
      await assertSettled(page, `${hero} resize ${width}`);
    }
    if (heroDetour) detourHeroes.push(hero);
    await page.close();
  }
  assert.ok(detourHeroes.length, `none of the ${heroes.length} heroes has a card going from the column beside primary to below primary with a detour`);

  // Phone 384px: primary spans the full column (pinterest), the suggestion pins in the left column right under primary. Cards do not intersect primary,
  // do not tuck under the suggestion; at least one case of a card detouring around the suggestion must occur.
  let phoneDetours = 0;
  for (const hero of heroes.slice(0, 3)) {
    const phone = await browser.newPage({ viewport: { width: 384, height: 854 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    phone.on("pageerror", (error) => errors.push(`phone ${hero}: ${error.message}`));
    await openDetail(phone, "vi", hero);
    const phoneTags = await phone.$$eval("[data-masonry-suggestion-tag]", (nodes) => nodes.map((node) => node.dataset.masonrySuggestionTag));
    for (const tag of phoneTags.slice(0, 3)) {
      for (let pass = 0; pass < 2; pass++) {
        await startSampler(phone, 1500);
        await phone.locator(`[data-masonry-suggestion-tag="${tag}"]`).tap();
        const sample = await collect(phone);
        const label = `phone ${hero} tag ${tag} pass ${pass + 1}`;
        assert.deepEqual(sample.overlaps, [], `${label}: card giao primary`);
        assert.deepEqual(sample.pinnedOverlaps, [], `${label}: card tucks under the suggestion`);
        phoneDetours += sample.detours;
        await assertSettled(phone, label);
      }
    }
    await phone.close();
  }
  assert.ok(phoneDetours, "phone: no case of a card detouring around the suggestion");

  // Reduced motion: no detour animation.
  const reduced = await browser.newPage({ viewport: { width: 1569, height: 912 }, reducedMotion: "reduce" });
  await openDetail(reduced, "vi", heroes[0]);
  const reducedTag = await reduced.$eval("[data-masonry-suggestion-tag]", (node) => node.dataset.masonrySuggestionTag).catch(() => null);
  if (reducedTag) {
    await startSampler(reduced, 600);
    await reduced.locator(`[data-masonry-suggestion-tag="${reducedTag}"]`).click();
    const { overlaps, detours } = await collect(reduced);
    assert.deepEqual(overlaps, []);
    assert.equal(detours, 0, "reduced motion still runs the detour");
  }
  await reduced.close();
  assert.deepEqual(errors, []);
  console.log(`related detour: ${detourHeroes.length} heroes with a beside-column to below-primary case (${detourHeroes.join(", ")}), no frame intersects primary`);
} finally {
  await browser.close();
}
