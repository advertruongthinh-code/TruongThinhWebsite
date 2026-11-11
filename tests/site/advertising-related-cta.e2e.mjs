// The masonry's closing CTA at the end of detail's related (advertising-cta-center-parallax R9). The hero is chosen from masonry at run time.
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const { planDetourPath } = await import("../../src/site/masonry/detour-path.mjs");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";

const ready = (page) => page.waitForFunction(() => document.querySelector("[data-detail-view]")?.dataset.masonryDetailReady === "true"
  && !document.documentElement.classList.contains("route-enter") && !document.body.classList.contains("is-transitioning"),
null, { timeout: 20000 });

// Scroll to the end, wait for reveal and parallax to return to 0, measure the baseline of the last text line like advertising-continuation.
const measureEnd = (page) => page.evaluate(async () => {
  const motion = window.TruongThinhMotion;
  const lastScroll = document.documentElement.scrollHeight - innerHeight;
  if (!motion?.setLogicalScroll?.(lastScroll)) window.scrollTo(0, lastScroll);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const heading = document.querySelector("[data-masonry-grid-cta] h2");
  const fontSize = Number.parseFloat(getComputedStyle(heading).fontSize);
  const lines = [...heading.querySelectorAll(".motion-line")];
  for (let wait = 0; wait < 40 && lines.some((line) =>
    Math.abs(new DOMMatrixReadOnly(getComputedStyle(line).transform).m42 + 0.1 * fontSize) > 0.5); wait += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const lastLine = lines.at(-1) || [...heading.querySelectorAll("[data-motion-line-source]")].at(-1);
  const leaf = [...lastLine.querySelectorAll("*")].filter((node) => !node.children.length).at(-1) || lastLine;
  const probe = document.createElement("span");
  probe.style.cssText = "display: inline-block; width: 0; height: 0;";
  leaf.append(probe);
  const baseline = probe.getBoundingClientRect().top;
  probe.remove();
  const batch = document.querySelector("[data-masonry-cta-skeleton]");
  const cta = document.querySelector("[data-masonry-grid-cta]");
  const footer = document.querySelector("footer.site-footer").getBoundingClientRect();
  const link = cta.querySelector(".detail-cta__copy a").getBoundingClientRect();
  const primary = document.querySelector(".detail-view__primary").getBoundingClientRect();
  return {
    host: batch.dataset.masonryCtaHost,
    inCanvas: Boolean(cta.closest("[data-detail-canvas]")),
    frames: batch.querySelectorAll("[data-masonry-cta-frame]").length,
    batchBottom: batch.getBoundingClientRect().bottom,
    ctaTop: cta.getBoundingClientRect().top,
    ctaBottom: cta.getBoundingClientRect().bottom,
    footerTop: footer.top,
    linkBottom: link.bottom,
    baseline, viewportHeight: innerHeight,
    primaryBottom: primary.bottom,
    infoCta: Boolean(document.querySelector("[data-detail-cta]")?.getClientRects().length),
    parallax: new DOMMatrixReadOnly(getComputedStyle(cta.querySelector(".detail-cta__copy")).transform).m42,
    gap: Number.parseFloat(getComputedStyle(document.querySelector("[data-detail-view]")).getPropertyValue("--detail-gap")),
    relatedCards: document.querySelectorAll("[data-masonry-related-card]:not([hidden])").length,
    arc: (() => { const glass = document.querySelector('.glass-surface[data-glass-shape="arc"]');
      return glass && !glass.hidden ? glass.getBoundingClientRect().width : 0; })(),
    viewportWidth: document.documentElement.clientWidth,
  };
});

// Bring the tag into the viewport, click, sample every frame for 900ms. Returns the frames intersecting primary, the number of frames with a translate animation,
// the number of frames that detour (3 keyframes), the path of each frame, and the number of related cards left.
const toggleTag = async (page, tag) => {
  await page.evaluate(() => window.TruongThinhMotion?.setLogicalScroll?.(0) || window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await page.evaluate(() => new Promise((started) => {
    const primary = document.querySelector("[data-detail-primary]");
    const frames = () => [...document.querySelectorAll("[data-masonry-cta-frame]")];
    const box = (node) => node.getBoundingClientRect();
    const p0 = box(primary);
    const before = new Map(frames().map((frame) => [frame, box(frame)]));
    const state = { overlaps: [], slid: new Set(), detoured: new Set(), done: false };
    window.__ctaSample = state;
    const begin = performance.now();
    let first = true;
    const tick = () => {
      const p = box(primary);
      for (const frame of frames()) {
        const r = box(frame);
        const x = Math.min(r.right, p.right) - Math.max(r.left, p.left);
        const y = Math.min(r.bottom, p.bottom) - Math.max(r.top, p.top);
        if (x > 0.5 && y > 0.5) state.overlaps.push({ slot: frame.dataset.masonryCtaFrame, x, y });
        for (const animation of frame.getAnimations()) {
          const keyframes = animation.effect?.getKeyframes?.() || [];
          if (!keyframes[0]?.translate) continue;
          state.slid.add(frame);
          if (keyframes.length === 3) state.detoured.add(frame);
        }
      }
      if (first) { first = false; started(); }
      if (performance.now() - begin < 900) requestAnimationFrame(tick);
      else {
        const p1 = box(primary);
        // The path of each frame, measured from the primary corner, so Node can use a slab test to check which frames must detour.
        state.moves = [...before].filter(([frame]) => frame.isConnected).map(([frame, r]) => {
          const a = box(frame);
          return { from: { x: r.left - p0.left, y: r.top - p0.top }, to: { x: a.left - p1.left, y: a.top - p1.top },
            size: { width: Math.max(r.width, a.width), height: Math.max(r.height, a.height) },
            zone: { width: p1.width, height: p1.height }, detoured: state.detoured.has(frame) };
        });
        state.overlaps = state.overlaps.slice(0, 5);
        state.slid = state.slid.size;
        state.detoured = state.detoured.size;
        state.related = document.querySelectorAll("[data-masonry-related-card]:not([hidden])").length;
        state.done = true;
      }
    };
    requestAnimationFrame(tick);
  }));
  await page.locator(`[data-masonry-suggestion-tag="${tag}"]`).dispatchEvent("click");
  await page.waitForFunction(() => window.__ctaSample?.done, null, { timeout: 5000 });
  return page.evaluate(() => window.__ctaSample);
};

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
try {
  const probe = await browser.newPage({ viewport: { width: 1569, height: 912 } });
  await probe.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
  await probe.waitForSelector("[data-masonry-card]");
  const hero = await probe.$eval("[data-masonry-card]", (node) => node.dataset.masonryCard);
  await probe.close();
  const errors = [];
  for (const [locale, viewport] of [["vi", { width: 1569, height: 912 }], ["en", { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport, ...(viewport.width < 500 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
    page.on("pageerror", (error) => errors.push(`${locale}: ${error.message}`));
    await page.goto(`${baseUrl}/${locale}/advertising-products/?photo=${hero}`, { waitUntil: "domcontentloaded" });
    await ready(page);
    const end = await measureEnd(page);
    const label = `${locale} ${viewport.width}x${viewport.height}`;
    assert.equal(end.host, "detail", `${label}: batch has not moved to detail`);
    assert.ok(end.inCanvas, `${label}: CTA is not in the detail canvas`);
    assert.ok(end.frames > 0, `${label}: batch has no frames`);
    assert.ok(end.infoCta, `${label}: CTA button in primary info is missing`);
    assert.ok(Math.abs(end.arc - end.viewportWidth) <= 1, `${label}: Kính arc does not span the viewport ${end.arc}/${end.viewportWidth}`);
    assert.ok(Math.abs(end.batchBottom - end.footerTop) <= 1.5, `${label}: batch bottom is not flush with the footer ${JSON.stringify(end)}`);
    assert.ok(Math.abs(end.batchBottom - end.ctaBottom) <= 1.5, `${label}: batch bottom differs from CTA bottom ${JSON.stringify(end)}`);
    assert.ok(Math.abs(end.parallax) <= 0.5, `${label}: parallax has not returned to 0 at the end of the page`);
    const shortWindow = Math.abs(end.ctaBottom - end.linkBottom - end.gap) <= 1;
    assert.ok(shortWindow || Math.abs(end.baseline - end.viewportHeight / 2) <= 1, `${label}: baseline is off the viewport center ${JSON.stringify(end)}`);
    assert.ok(end.ctaTop >= end.primaryBottom - 1, `${label}: CTA overlaps primary`);

    // Toggle the tag: batch frames slide with related, no frame intersects primary (R9, R10).
    const tag = await page.$eval("[data-masonry-suggestion-tag]", (node) => node.dataset.masonrySuggestionTag).catch(() => null);
    if (tag) {
      const sample = await toggleTag(page, tag);
      assert.deepEqual(sample.overlaps, [], `${label}: batch frame intersects primary when the tag changes`);
      assert.ok(sample.slid > 0, `${label}: tag changed but no batch frame slid ${JSON.stringify(sample)}`);
      const after = await measureEnd(page);
      assert.ok(Math.abs(after.batchBottom - after.footerTop) <= 1.5, `${label}: after the tag change batch bottom is off the footer`);
      assert.ok(Math.abs(after.batchBottom - after.ctaBottom) <= 1.5, `${label}: after the tag change canvas height is off the CTA`);
      console.log(`${label}: tag ${tag}, ${sample.slid} frames slid, ${sample.detoured} frames detoured`);
    }

    // Back to masonry: the CTA returns to the grid.
    await page.goto(`${baseUrl}/${locale}/advertising-products/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-masonry-cta-skeleton][data-masonry-cta-ready]");
    const grid = await page.evaluate(() => ({
      inGrid: Boolean(document.querySelector("[data-project-grid] [data-masonry-cta-skeleton]")),
      ctaInIndex: Boolean(document.querySelector(".masonry-section [data-masonry-grid-cta]")),
    }));
    assert.ok(grid.inGrid && grid.ctaInIndex, `${label}: CTA is not in the grid when browsing masonry`);
    console.log(`${label}: ${end.relatedCards} related cards, ${end.frames} batch frames, baseline ${(end.baseline - end.viewportHeight / 2).toFixed(2)}px`);
    await page.close();
  }

  // Open detail from masonry then Back on the same page: the host switches back and forth.
  const page = await browser.newPage({ viewport: { width: 1569, height: 912 } });
  page.on("pageerror", (error) => errors.push(`soft: ${error.message}`));
  await page.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-masonry-card] a");
  await page.waitForTimeout(800);
  await page.locator("[data-masonry-card] a").first().click();
  await ready(page);
  assert.equal(await page.getAttribute("[data-masonry-cta-skeleton]", "data-masonry-cta-host"), "detail");
  // The CTA group moved to detail waits for its first view entry like the first time in masonry: not shown while below the screen, shown when scrolled to (R9).
  const ctaReveal = () => page.evaluate(() => {
    const cta = document.querySelector("[data-masonry-grid-cta]");
    return { link: cta.querySelector("[data-motion-fade]").classList.contains("is-motion-inview"),
      lineY: new DOMMatrixReadOnly(getComputedStyle(cta.querySelector("h2 .motion-line")).transform).m42,
      below: cta.getBoundingClientRect().top > innerHeight };
  });
  const armed = await ctaReveal();
  assert.ok(armed.below && !armed.link && armed.lineY > 0, `detail: CTA was shown before entering view ${JSON.stringify(armed)}`);
  const revealed = await measureEnd(page).then(ctaReveal);
  assert.ok(revealed.link && revealed.lineY < 0, `detail: CTA is not shown on entering view ${JSON.stringify(revealed)}`);
  await page.goBack();
  await page.waitForFunction(() => document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaHost === "grid"
    && document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaReady === "true", null, { timeout: 10000 });
  const gridHeight = await page.evaluate(() => {
    const grid = document.querySelector("[data-project-grid]").getBoundingClientRect();
    const cta = document.querySelector("[data-masonry-grid-cta]").getBoundingClientRect();
    return Math.abs(grid.bottom - cta.bottom);
  });
  assert.ok(gridHeight <= 1.5, "Back: grid height differs from CTA bottom");
  await page.close();

  // Find a case where a batch frame has a straight line crossing primary: it must detour (R10). When related is empty the CTA sits right under primary.
  const heroes = await (async () => {
    const list = await browser.newPage({ viewport: { width: 1569, height: 912 } });
    await list.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
    await list.waitForSelector("[data-masonry-card]");
    const ids = await list.$$eval("[data-masonry-card]", (nodes) => nodes.map((node) => node.dataset.masonryCard));
    await list.close();
    return ids.slice(0, Number(process.env.CTA_DETOUR_HEROES || 20));
  })();
  let detourCase = null;
  let emptyCase = null;
  for (const hero of heroes) {
    if (detourCase && emptyCase) break;
    const search = await browser.newPage({ viewport: { width: 1569, height: 912 } });
    search.on("pageerror", (error) => errors.push(`${hero}: ${error.message}`));
    await search.goto(`${baseUrl}/vi/advertising-products/?photo=${hero}`, { waitUntil: "domcontentloaded" });
    await ready(search);
    const tags = await search.$$eval("[data-masonry-suggestion-tag]", (nodes) => nodes.map((node) => node.dataset.masonrySuggestionTag));
    // Every tag of the hero: cases needing a detour usually come from a tag that sharply narrows related (the column next to primary empties).
    for (const searchTag of tags) {
      if (detourCase && emptyCase) break;
      for (let pass = 0; pass < 2; pass++) {
        const sample = await toggleTag(search, searchTag);
        assert.deepEqual(sample.overlaps, [], `${hero} tag ${searchTag}: khung batch giao primary`);
        const needs = sample.moves.filter((move) => planDetourPath(move));
        assert.deepEqual(needs.filter((move) => !move.detoured), [], `${hero} tag ${searchTag}: frame crosses primary without detouring`);
        if (needs.length && !detourCase) detourCase = `${hero} ${searchTag}`;
        if (!sample.related && !emptyCase) {
          const end = await measureEnd(search);
          assert.ok(end.frames > 0 && end.ctaTop >= end.primaryBottom - 1, `${hero} tag ${searchTag}: related is empty but the CTA is misplaced`);
          assert.ok(Math.abs(end.batchBottom - end.footerTop) <= 1.5, `${hero} tag ${searchTag}: related is empty, batch bottom is off the footer`);
          emptyCase = `${hero} ${searchTag}`;
        }
      }
    }
    await search.close();
  }
  assert.ok(detourCase, `none of the ${heroes.length} heroes has a batch frame that must detour around primary`);
  console.log(`batch frames detoured: ${detourCase}; related empty: ${emptyCase || "not encountered"}`);

  // F5 straight into detail then scroll to the end: the Kính reveal of the batch frame or a related card still in the DOM while the arc is visible
  // makes Chrome drop the arc's step blurs, so the arc interior disappears then reappears (owner 2026-11-09; skeleton R4 applies to every masonry).
  {
    const context = await browser.newContext({ viewport: { width: 1569, height: 912 } });
    await context.addInitScript(() => {
      window.__ttArcOverlap = { since: null, max: 0 };
      const tick = () => {
        const tint = document.querySelector('.glass-surface[data-glass-shape="arc"]:not([hidden]) .glass-surface__tint')?.getBoundingClientRect();
        const arcInView = Boolean(tint) && tint.bottom > 0 && tint.top < innerHeight;
        const state = window.__ttArcOverlap;
        const now = performance.now();
        state.since = arcInView && document.querySelector("[data-masonry-cta-skeleton] .glass-surface[data-glass-reveal]") ? (state.since ?? now) : null;
        state.max = Math.max(state.max, state.since == null ? 0 : now - state.since);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const fresh = await context.newPage();
    await fresh.goto(`${baseUrl}/vi/advertising-products/?photo=${hero}`, { waitUntil: "domcontentloaded" });
    await ready(fresh);
    await fresh.evaluate(async () => {
      const motion = window.TruongThinhMotion;
      for (let step = 1; step <= 10; step++) {
        const top = (document.documentElement.scrollHeight - innerHeight) * step / 10;
        if (!motion?.setLogicalScroll?.(top)) window.scrollTo(0, top);
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    });
    const overlap = await fresh.evaluate(() => window.__ttArcOverlap.max);
    // Leave a few frames: the arc's observer reports entering view after the arc frame is exposed; a 0.6s reveal exposes the whole reveal.
    assert.ok(overlap <= 100, `detail F5: Kính reveal still in the DOM ${Math.round(overlap)}ms while the arc is visible`);
    await context.close();
  }

  // Reduced motion: changing the tag places frames directly, the CTA stays flush with the footer.
  const reduced = await browser.newPage({ viewport: { width: 1569, height: 912 }, reducedMotion: "reduce" });
  await reduced.goto(`${baseUrl}/vi/advertising-products/?photo=${hero}`, { waitUntil: "domcontentloaded" });
  await ready(reduced);
  const reducedTag = await reduced.$eval("[data-masonry-suggestion-tag]", (node) => node.dataset.masonrySuggestionTag).catch(() => null);
  if (reducedTag) {
    const sample = await toggleTag(reduced, reducedTag);
    assert.equal(sample.slid, 0, "reduced motion still slides batch frames");
    const end = await measureEnd(reduced);
    assert.ok(Math.abs(end.batchBottom - end.footerTop) <= 1.5, "reduced motion: batch bottom is off the footer");
  }
  await reduced.close();
  assert.deepEqual(errors, []);
  console.log("related CTA: detail and masonry share a single CTA");
} finally {
  await browser.close();
}
