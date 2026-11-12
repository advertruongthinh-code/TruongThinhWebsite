// Shared matrix for every place that has masonry (masonry-reuse step 2, owner approved 2026-11-09): the same scenario runs on the Advertising
// masonry, the Projects masonry and related at detail. A fix in one place that the others do not get turns the matrix red there.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/masonry-hosts.e2e.mjs
// MASONRY_HOSTS=advertising,related and MASONRY_VIEWPORTS=1920x940 run a subset.
import assert from "node:assert/strict";
import { BASE_URL, VIEWPORTS as DEVICES, launchBrowser, openPage } from "./harness.mjs";
const VARIANT = /-(?:240|480|960|1600|2048)\.(?:jxl|webp)$/;

const detailReady = (page) => page.waitForFunction(() => document.querySelector("[data-detail-view]")?.dataset.masonryDetailReady === "true"
  && !document.documentElement.classList.contains("route-enter") && !document.body.classList.contains("is-transitioning"), null, { timeout: 20000 });
const gridReady = (page) => page.waitForFunction(() => document.documentElement.classList.contains("motion-ready")
  && document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaReady === "true", null, { timeout: 20000 });

// Per host: how to open it, grid root; every masonry item carries the shared data-masonry-item marker (masonry-reuse step 3).
const HOSTS = {
  advertising: { root: "[data-project-grid]", card: "[data-masonry-item]",
    open: async (page) => { await page.goto(`${BASE_URL}/vi/advertising-products/`, { waitUntil: "domcontentloaded" }); await gridReady(page); } },
  projects: { root: "[data-project-grid]", card: "[data-masonry-item]",
    open: async (page) => { await page.goto(`${BASE_URL}/vi/projects/`, { waitUntil: "domcontentloaded" }); await gridReady(page); } },
  // As the owner uses it: click a card on the masonry (soft route, CTA switches to detail). Step 5 reloads the page, i.e. a direct entry.
  related: { root: "[data-detail-related-grid]", card: "[data-masonry-item]",
    open: async (page) => {
      await page.goto(`${BASE_URL}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
      await gridReady(page);
      await page.waitForTimeout(800);
      await page.locator("[data-masonry-card]:not([hidden]) > a").first().click();
      await detailReady(page);
    } },
};
// 1920x940: the owner's PC screen, where a portrait card taller than 60% of the viewport (threshold for upgrading to the original) occurs.
const VIEWPORTS = { "1920x940": { width: 1920, height: 940 }, "384x724": DEVICES.a04s };
const pick = (env, all) => {
  const ids = process.env[env] ? process.env[env].split(",") : Object.keys(all);
  ids.forEach((id) => assert.ok(all[id], `${env}: missing ${id}`));
  return ids;
};

// Measured in-page from the first load: the Glass reveal time of the batch still in the DOM while the arc is visible, and the CTA showing
// before entering view.
const firstEntryProbe = () => {
  window.__masonry = { arcOverlap: 0, arcSeen: false, since: null, ctaEarly: false, frames: [], running: false };
  const state = window.__masonry;
  const tick = () => {
    const now = performance.now();
    const tint = document.querySelector('.glass-surface[data-glass-shape="arc"]:not([hidden]) .glass-surface__tint')?.getBoundingClientRect();
    const arcInView = Boolean(tint) && tint.bottom > 0 && tint.top < innerHeight;
    if (arcInView) state.arcSeen = true;
    state.since = arcInView && document.querySelector("[data-masonry-cta-skeleton] .glass-surface[data-glass-reveal]") ? (state.since ?? now) : null;
    state.arcOverlap = Math.max(state.arcOverlap, state.since == null ? 0 : now - state.since);
    const cta = document.querySelector("[data-masonry-grid-cta]");
    // Measure the button itself: the top of the CTA cluster is the batch tail, which sits in the viewport well before the button.
    // Only consider the moment the button just received the reveal class; scrolling elsewhere afterwards, a button already revealed is correct.
    const link = cta?.querySelector("[data-motion-fade]");
    const shown = Boolean(link?.classList.contains("is-motion-inview"));
    // The hidden cluster waiting for the detail batch mount may receive the reveal class and be reset after the mount (R9), so do not check while hidden;
    // bug #755 is caught by ctaShownNow at the moment before the CTA enters view.
    if (shown && !state.shown && link.getBoundingClientRect().top > innerHeight) {
      state.ctaEarly = `${Math.round(link.getBoundingClientRect().top - innerHeight)}px (${state.phase || "load"})`;
    }
    state.shown = shown;
    if (state.running) {
      // Fraction of the card area in the viewport (from the grid root top to the CTA cluster top) covered by real cards, temp cards, primary or the batch
      // frame (16px sample grid). The batch frame fills the staggered grid bottom: random card order sometimes leaves one column 600px longer than
      // the others. A fully empty frame counts as 0, not skipped.
      const root = document.querySelector(state.root)?.getBoundingClientRect();
      const rects = [...document.querySelectorAll(`${state.root} :is(${state.card}), ${state.root} .masonry-ghost, [data-detail-primary], [data-masonry-cta-frame]`)]
        .map((node) => node.getBoundingClientRect()).filter((rect) => rect.bottom > 0 && rect.top < innerHeight && rect.height > 0);
      const zoneBottom = state.zoneBottom - (window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY);
      const bottom = Math.min(innerHeight, root.bottom, zoneBottom);
      let covered = 0;
      let total = 0;
      for (let y = Math.max(0, root.top) + 8; y < bottom; y += 16) {
        for (let x = root.left + 8; x < root.right; x += 16) {
          total += 1;
          if (rects.some((rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)) covered += 1;
        }
      }
      if (total > 0) state.frames.push(covered / total);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
const scrollTo = (page, top) => page.evaluate((y) => window.TruongThinhMotion?.setLogicalScroll?.(y) || window.scrollTo(0, y), top);
// Whether the CTA button has received the reveal class. Before the CTA first enters view it must not be revealed, even when the CTA cluster was temporarily in
// the viewport while waiting for the batch mount (bug #755 at detail: motion ran while the cluster was still hidden at the canvas top).
const ctaShownNow = (page) => page.evaluate(() => Boolean(document.querySelector("[data-masonry-grid-cta] [data-motion-fade]")?.classList.contains("is-motion-inview")));
const coverage = async (page, ms = 300) => {
  await page.evaluate(() => { window.__masonry.frames = []; window.__masonry.running = true; });
  await page.waitForTimeout(ms);
  return page.evaluate(() => { window.__masonry.running = false; return window.__masonry.frames; });
};

const browser = await launchBrowser();
const failures = [];
const check = (label, ok, detail) => { if (!ok) failures.push(`${label}: ${detail}`); };
try {
  for (const viewportId of pick("MASONRY_VIEWPORTS", VIEWPORTS)) {
    for (const hostId of pick("MASONRY_HOSTS", HOSTS)) {
      const host = HOSTS[hostId];
      const label = `${hostId} ${viewportId}`;
      const { context, page } = await openPage(browser, VIEWPORTS[viewportId]);
      await context.addInitScript(firstEntryProbe);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await host.open(page);
      const sel = { root: host.root, card: host.card };
      await page.evaluate((value) => Object.assign(window.__masonry, value), sel);
      await page.waitForTimeout(1500);
      // The bottom of the card area is the CTA cluster top: swipe and rest only within the card area, so the CTA first enters view at step 5.
      const { rootTop, rootBottom, viewport } = await page.evaluate((root) => {
        const rect = document.querySelector(root).getBoundingClientRect();
        const y = window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY;
        const cta = document.querySelector("[data-masonry-grid-cta]")?.getBoundingClientRect();
        return { rootTop: rect.top + y, rootBottom: Math.min(rect.bottom, cta?.top ?? Infinity) + y, viewport: innerHeight };
      }, host.root);

      await page.evaluate((zoneBottom) => { window.__masonry.zoneBottom = zoneBottom; }, rootBottom);
      const phase = (name) => page.evaluate((value) => { window.__masonry.phase = value; }, name);
      await phase("settled");
      // 1. Coverage at rest at a few grid positions: the baseline for the swipe.
      const span = Math.max(0, rootBottom - rootTop - viewport);
      const settled = [];
      for (const share of [0, 0.5, 1]) {
        await scrollTo(page, rootTop + span * share);
        await page.waitForTimeout(2000);
        settled.push(Math.min(...await coverage(page)));
      }
      const floor = Math.min(...settled) - 0.08;
      // The baseline drops on its own when the grid has gaps at rest: guard with a minimum level (staggered grid bottom leaves about 0.6).
      check(label, Math.min(...settled) >= 0.5, `gaps already at rest, coverage ${settled.map((value) => value.toFixed(2)).join("/")}`);

      await phase("fling");
      // 2. A very fast swipe across the whole grid (20 viewports/s, CPU throttled 4x): every frame keeps the coverage level of rest.
      await scrollTo(page, rootTop);
      await page.waitForTimeout(1500);
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.evaluate(() => { window.__masonry.frames = []; window.__masonry.running = true; });
      await page.evaluate(([from, distance, perSecond]) => new Promise((resolve) => {
        const begin = performance.now();
        const frame = (now) => {
          const progress = Math.min(1, (now - begin) / Math.max(1000, 1000 * distance / perSecond));
          window.TruongThinhMotion?.setLogicalScroll?.(from + distance * progress) || window.scrollTo(0, from + distance * progress);
          if (progress < 1) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      }), [rootTop, span, 20 * viewport]);
      const fling = await page.evaluate(() => { window.__masonry.running = false; return window.__masonry.frames; });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      // A grid shorter than two viewports has nothing to swipe: say so in the log, do not skip silently.
      const flingRan = span > viewport;
      if (flingRan) {
        check(label, fling.length > 5, `fast swipe measured only ${fling.length} frames`);
        // Second-worst frame: a lone dropped frame on a busy runner is not a real gap.
        const worstTwo = [...fling].sort((a, b) => a - b)[1] ?? 0;
        check(label, worstTwo >= floor, `fast swipe exposed a gap, second-worst ${worstTwo.toFixed(3)} below ${floor.toFixed(3)}`);
      }

      // 3. Stop: no card may be retained beyond two viewports (the scroll window retention zone).
      await page.waitForTimeout(3000);
      const farthest = await page.evaluate(({ root, card }) => Math.max(0, ...[...document.querySelectorAll(`${root} :is(${card})`)]
        .filter((node) => !node.hidden && node.getClientRects().length)
        .map((node) => { const rect = node.getBoundingClientRect(); return Math.max(-rect.bottom, rect.top - innerHeight); })), sel);
      check(label, farthest <= 2 * viewport + 1, `card still attached ${Math.round(farthest)}px from the viewport`);

      // 4. Cards are small frames: at rest they keep the frame-fitting variant, not the large original (progressive-loading R10).
      await page.waitForTimeout(3000);
      const upgraded = await page.evaluate(({ root, card, variant }) => [...document.querySelectorAll(`${root} :is(${card}) img`)]
        .filter((image) => image.currentSrc && image.clientWidth > 0 && !new RegExp(variant).test(new URL(image.currentSrc).pathname)
          && image.naturalWidth > 1.5 * image.clientWidth * devicePixelRatio)
        .map((image) => new URL(image.currentSrc).pathname), { ...sel, variant: VARIANT.source });
      check(label, !upgraded.length, `card upgraded to original ${JSON.stringify(upgraded)}`);

      // 5. Reload (F5) then drag from top to bottom: the batch frame enters view for the first time before the arc (bug #757 shows only on this
      // path), the batch Glass reveal does not overlap the arc, the CTA does not show before entering view.
      check(label, !await ctaShownNow(page), "CTA shown before entering view");
      // The very first open path (soft route with related) must also be clean: the F5 below reinitializes the measurement.
      const opened = await page.evaluate(() => ({ arcOverlap: window.__masonry.arcOverlap, ctaEarly: window.__masonry.ctaEarly }));
      check(label, opened.arcOverlap <= 100, `Glass reveal still in DOM for ${Math.round(opened.arcOverlap)}ms while the arc is visible (before F5)`);
      check(label, !opened.ctaEarly, `CTA shown early before F5: ${opened.ctaEarly}`);
      check(label, !errors.length, `runtime errors ${JSON.stringify(errors)}`);
      errors.length = 0;
      await page.reload({ waitUntil: "domcontentloaded" });
      await (host.root === "[data-project-grid]" ? gridReady(page) : detailReady(page));
      await page.evaluate((value) => Object.assign(window.__masonry, value, { phase: "end" }), sel);
      await page.waitForTimeout(1500);
      check(label, !await ctaShownNow(page), "after F5: CTA shown before entering view");
      await page.evaluate(async () => {
        const end = () => document.documentElement.scrollHeight - innerHeight;
        let y = 0;
        if (!window.TruongThinhMotion?.setLogicalScroll?.(0)) window.scrollTo(0, 0);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // The bottom is recomputed each step: batch and related can lengthen the page while scrolling.
        while (y < end()) {
          y = Math.min(end(), y + innerHeight / 2);
          if (!window.TruongThinhMotion?.setLogicalScroll?.(y)) window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
      });
      await page.waitForTimeout(2000);
      const end = await page.evaluate(() => ({ arcOverlap: window.__masonry.arcOverlap, arcSeen: window.__masonry.arcSeen, ctaEarly: window.__masonry.ctaEarly,
        ctaShown: Boolean(document.querySelector("[data-masonry-grid-cta] [data-motion-fade]")?.classList.contains("is-motion-inview")) }));
      // 6. No holes (masonry R5): at the grid tail, each card and batch frame sits exactly one gap below the nearest item
      // above it in the same column; tail holes already have filler frames.
      const holes = await page.evaluate(({ root, card }) => {
        const gap = innerWidth <= 960 ? 15 : innerWidth <= 1200 ? 25 : 35;
        const scrollTop = window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY;
        const items = [...document.querySelectorAll(`${root} :is(${card}), [data-masonry-cta-frame]`)]
          .filter((node) => !node.hidden && node.getClientRects().length)
          .map((node) => {
            // Layout position (offset), not rect: the skeleton batch has its own parallax translate.
            let left = 0, top = 0;
            for (let at = node; at; at = at.offsetParent) { left += at.offsetLeft; top += at.offsetTop; }
            const rect = { left, top, right: left + node.offsetWidth, bottom: top + node.offsetHeight };
            return { node, frame: node.matches("[data-masonry-cta-frame]"), rect };
          })
          // Only the zone surely mounted (the virtual window adds one viewport each side), so no card between two measured items is missing.
          .filter(({ rect }) => rect.top >= scrollTop - innerHeight / 2 && rect.bottom <= scrollTop + 1.5 * innerHeight);
        const found = [];
        for (const below of items) {
          const above = items.filter((item) => item !== below && item.rect.bottom <= below.rect.top + 1
            && Math.min(item.rect.right, below.rect.right) - Math.max(item.rect.left, below.rect.left) > 1)
            .sort((a, b) => b.rect.bottom - a.rect.bottom)[0];
          if (!above) continue;
          const expected = gap;
          const actual = below.rect.top - above.rect.bottom;
          if (Math.abs(actual - expected) > 1.5) found.push(`${above.node.dataset.masonryItem || above.node.dataset.masonryCtaSlot}>${below.node.dataset.masonryItem || below.node.dataset.masonryCtaSlot}:${actual.toFixed(1)}`);
        }
        return found;
      }, sel);
      check(label, !holes.length, `holes between items at the grid tail ${JSON.stringify(holes.slice(0, 5))}`);
      check(label, end.arcSeen, "Glass arc never entered view, checking Glass reveal is meaningless");
      check(label, end.arcOverlap <= 100, `Glass reveal still in DOM for ${Math.round(end.arcOverlap)}ms while the arc is visible`);
      check(label, !end.ctaEarly, `CTA shown while the button is still below the viewport ${end.ctaEarly}`);
      check(label, end.ctaShown, "CTA not shown on entering view");
      check(label, !errors.length, `runtime errors after F5 ${JSON.stringify(errors)}`);
      console.log(`${label}: coverage at rest ${settled.map((value) => value.toFixed(2)).join("/")}, swipe ${flingRan ? `worst ${Math.min(...fling).toFixed(2)} (${fling.length} frames)` : `skipped, grid only ${((span + viewport) / viewport).toFixed(1)} viewport`}, farthest ${Math.round(farthest)}px, Glass overlapping arc ${Math.round(end.arcOverlap)}ms`);
      await context.close();
    }
  }
  assert.deepEqual(failures, [], `masonry matrix red:\n${failures.join("\n")}`);
  console.log("PASS masonry hosts");
} finally {
  await browser.close();
}
