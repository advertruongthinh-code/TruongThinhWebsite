// Extremely fast swipe in masonry does not stall (advertising-masonry R7, loading-glass R3): cards not built in time show a placeholder in the dominant color,
// each frame builds within the measured quota, and a card is removed only when it leaves the build zone plus one viewport.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/advertising-fast-fling.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const scrollTo = (page, top) => page.evaluate((y) => window.TruongThinhMotion.setLogicalScroll(y), top);
try {
  const context = await browser.newContext({ viewport: { width: 384, height: 724 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  // On a 0.5 GB machine the queue of just-removed cards is only 8, so the jump back to the old spot is still mostly placeholders turning into real cards.
  await page.addInitScript(() => Object.defineProperty(navigator, "deviceMemory", { value: 0.5, configurable: true }));
  await page.addInitScript(() => {
    // Each frame: the part of the viewport covered by real or placeholder cards (sampled on a 12px grid), the number of added cards, the number of placeholders.
    const probe = { frames: [], added: [], ghosts: new Map(), crossfades: 0, running: false };
    window.__probe = probe;
    let added = 0;
    new MutationObserver((records) => records.forEach(({ addedNodes }) => addedNodes.forEach((node) => {
      // A card only moved within the DOM (insertBefore) is not a new card.
      if (node.dataset?.masonryCard !== undefined && !node.__seen) {
        node.__seen = true;
        added += 1;
      }
    }))).observe(document, { childList: true, subtree: true });
    const step = 12;
    const tick = () => {
      if (probe.running) {
        const rects = [...document.querySelectorAll("[data-project-grid] [data-masonry-card], .masonry-ghost")]
          .map((node) => node.getBoundingClientRect()).filter((rect) => rect.bottom > 0 && rect.top < innerHeight && rect.height > 0);
        let covered = 0;
        let total = 0;
        for (let y = step / 2; y < innerHeight; y += step) {
          for (let x = step / 2; x < innerWidth; x += step) {
            total += 1;
            if (rects.some((rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)) covered += 1;
          }
        }
        probe.frames.push(covered / total);
        probe.added.push(added);
        for (const ghost of document.querySelectorAll(".masonry-ghost")) {
          probe.ghosts.set(ghost.dataset.masonryGhost, ghost.dataset.mediaWait === "colors" ? [1, 2, 3, 4].map((index) => ghost.style.getPropertyValue(`--wait-${index}`)) : null);
        }
        probe.crossfades = Math.max(probe.crossfades, document.getAnimations().filter((animation) => {
          const timing = animation.effect?.getTiming?.();
          const frames = animation.effect?.getKeyframes?.() ?? [];
          return timing?.duration === 450 && frames.length === 2 && frames.every((frame) => "opacity" in frame);
        }).length);
      }
      added = 0;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
  await page.waitForTimeout(1500);
  const { limit, viewport } = await page.evaluate(() => ({ limit: document.documentElement.scrollHeight - innerHeight, viewport: innerHeight }));
  // Stop before the final CTA batch: there are no cards there.
  const top = Math.max(0, limit - 3 * viewport);
  assert.ok(top > 20 * viewport, `masonry long enough for a 20 viewport fling, ${Math.round(top / viewport)} viewports`);
  const settle = (ms = 3500) => page.waitForTimeout(ms);
  const coverageHere = async () => {
    await page.evaluate(() => { window.__probe.frames = []; window.__probe.running = true; });
    await page.waitForTimeout(300);
    return page.evaluate(() => { window.__probe.running = false; return Math.min(...window.__probe.frames); });
  };

  // Coverage when every card is built, at a few positions: the baseline for the swipe.
  const settled = [];
  for (const y of [0.2, 0.5, 0.8]) {
    await scrollTo(page, top * y);
    await settle(2500);
    settled.push(await coverageHere());
  }
  // Gaps between cards and the scroll position make coverage fluctuate a few percent; a real empty area makes coverage drop far.
  const floor = Math.min(...settled) - 0.08;
  assert.ok(floor > 0.5, `steady coverage is meaningful, ${settled.map((value) => value.toFixed(3)).join(", ")}`);

  // Hysteresis zone: scroll down 2.2 viewports; cards built at the earlier position that sit more than one viewport above the viewport still remain.
  await scrollTo(page, viewport * 4);
  await settle(2500);
  await page.evaluate(() => document.querySelectorAll("[data-project-grid] [data-masonry-card]").forEach((node) => { node.__before = true; }));
  await scrollTo(page, viewport * 6.2);
  await settle(1500);
  const kept = await page.evaluate(() => {
    const vh = innerHeight;
    const cards = [...document.querySelectorAll("[data-project-grid] [data-masonry-card]")];
    return {
      sameNodeBeyondOneViewport: cards.filter((node) => node.__before && node.getBoundingClientRect().bottom < -vh).length,
      farthest: Math.max(...cards.map((node) => Math.max(-node.getBoundingClientRect().bottom, node.getBoundingClientRect().top - vh))),
    };
  });
  assert.ok(kept.sameNodeBeyondOneViewport > 0, "cards between one and two viewports away keep their node (release zone)");
  assert.ok(kept.farthest <= 2 * viewport + 1, `no card is mounted beyond two viewports, farthest ${Math.round(kept.farthest)}px`);

  // Extremely fast swipe: 20 viewports in 1s, CPU slowed 4x.
  const cdp = await context.newCDPSession(page);
  const start = top * 0.1;
  await scrollTo(page, 0);
  await settle(1500);
  await scrollTo(page, start);
  await settle(2500);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(() => {
    window.__probe.frames = [];
    window.__probe.added = [];
    window.__probe.running = true;
  });
  // Scroll by clock inside the page (20 viewports/s, double the fast-swipe threshold), independent of Playwright latency.
  await page.evaluate(([from, distance]) => new Promise((resolve) => {
    const begin = performance.now();
    const frame = (now) => {
      const progress = Math.min(1, (now - begin) / 1000);
      window.TruongThinhMotion.setLogicalScroll(from + distance * progress);
      if (progress < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  }), [start, 20 * viewport]);
  await page.evaluate(() => { window.__probe.running = false; });
  const fling = await page.evaluate(() => ({
    frames: window.__probe.frames, added: window.__probe.added, ghosts: [...window.__probe.ghosts.entries()],
  }));
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const worst = Math.min(...fling.frames);
  assert.ok(fling.frames.length > 10, `probe saw frames, ${fling.frames.length}`);
  assert.ok(worst >= floor, `every frame keeps the viewport covered by cards or ghosts, worst ${worst.toFixed(3)} below floor ${floor.toFixed(3)}`);
  assert.ok(fling.ghosts.length > 0, "ghost cards held the places of cards not yet mounted");
  const mostAdded = Math.max(...fling.added);
  // No fixed ceiling (loading-glass R10): after a jump or a pause the quota ramps 2, 4, 8, ... per mounting frame, and a fast swipe builds within
  // the measured quota, so a frame never dumps the cards that pass. The probe counts per animation frame, where an idle pass may add a few
  // more, so a frame mounts at most double the frame before it plus 2.
  fling.added.forEach((count, index) => {
    const previous = fling.added[index - 1] ?? 0;
    assert.ok(count <= 2 * previous + 2, `frame ${index} mounted ${count} cards after ${previous}: ${JSON.stringify(fling.added)}`);
  });

  // Stop: every placeholder in the build zone becomes a real card, with the exact dominant color of the card.
  await settle(5000);
  const after = await page.evaluate(async (entries) => {
    const { default: artifact } = await import("/advertising-products/catalog-artifact.mjs");
    const coverOf = new Map(artifact.cards.map((card) => [card.id, card.coverMediaId]));
    const vh = innerHeight;
    const strayGhosts = [...document.querySelectorAll(".masonry-ghost")].filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.bottom > -vh && rect.top < 2 * vh;
    }).length;
    const wrong = [];
    for (const [id, colors] of entries) {
      const card = document.querySelector(`[data-masonry-card="${id}"]`);
      // PC and phone alike: the ghost cycles through the 4 colors of the card's cover (owner 2026-11-15), the card's own wait colors while it shows
      // that cover; a multi-media card that has since moved to another media is not comparable.
      const onCover = !card?.dataset.masonryActiveMediaId || card.dataset.masonryActiveMediaId === coverOf.get(id);
      if (!colors || (card && onCover && colors.join() !== card.advertisingWaitColors().join())) wrong.push(id);
    }
    const blank = [...document.querySelectorAll("[data-project-grid] [data-masonry-card]")].filter((card) => {
      const rect = card.getBoundingClientRect();
      const image = [...card.querySelectorAll("img")].find((node) => !node.hidden);
      return rect.bottom > 0 && rect.top < vh && !card.hasAttribute("data-media-wait") && !image?.classList.contains("is-masonry-media-ready");
    }).length;
    return { strayGhosts, wrong, blank };
  }, fling.ghosts);
  assert.equal(after.strayGhosts, 0, "no placeholder card left in the mount zone once scrolling stops");
  assert.deepEqual(after.wrong, [], "ghost cycles through the 4 wait colours of the card it holds");
  assert.equal(after.blank, 0, "every visible card shows its image once scrolling stops");

  // Images already present: jump straight to the section just viewed, and placeholders turning into real cards fade the image in over 0.45s.
  const back = start + 6 * viewport;
  await scrollTo(page, back);
  await settle(2500);
  await scrollTo(page, 0);
  await settle(1500);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(() => { window.__probe.crossfades = 0; window.__probe.running = true; });
  await scrollTo(page, back);
  await page.waitForTimeout(2500);
  const crossfades = await page.evaluate(() => window.__probe.crossfades);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  assert.ok(crossfades > 0, "cached image fades in over 0.45s when a ghost becomes a real card");
  await context.close();

  // PC (loading-glass R10): at 10 viewports per second without throttling, a temp card in the viewport turns into a real card or leaves the
  // screen within 100 ms. The headless runner's frames jitter (17 ms median, 38 ms p95 even on frames that mount nothing), so CI gates only the
  // median of the per-fling p95 at 8 frames: main measured 150 to 200 ms, this build 0 to 117 ms over 10 runs. The worst ghost is logged only;
  // the 100 ms target is measured on a real PC and the A04s.
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desk = await desktop.newPage();
  await desk.addInitScript(() => {
    const life = new Map();
    window.__ghostLife = { done: [], on: false };
    const tick = (now) => {
      if (window.__ghostLife.on) {
        const seen = new Set();
        for (const ghost of document.querySelectorAll(".masonry-ghost")) {
          // A ghost crossfading under its real card is covered; only a ghost still waiting for its card counts.
          if (document.querySelector(`[data-project-grid] [data-masonry-card="${ghost.dataset.masonryGhost}"]`)) continue;
          const rect = ghost.getBoundingClientRect();
          if (rect.bottom <= 0 || rect.top >= innerHeight) continue;
          seen.add(ghost);
          if (!life.has(ghost)) life.set(ghost, now);
        }
        for (const [ghost, since] of life) {
          if (seen.has(ghost)) continue;
          window.__ghostLife.done.push(now - since);
          life.delete(ghost);
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const p95s = [];
  let worstGhost = 0;
  for (let run = 0; run < 3; run += 1) {
    await desk.goto(`${base}/vi/advertising-products/?fling=${run}`, { waitUntil: "domcontentloaded" });
    await desk.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
    await desk.waitForTimeout(4000);
    await desk.evaluate(() => new Promise((resolve) => {
      window.__ghostLife.on = true;
      const distance = 10 * innerHeight;
      const begin = performance.now();
      const frame = (now) => {
        const progress = Math.min(1, (now - begin) / 1000);
        window.TruongThinhMotion.setLogicalScroll(distance * progress);
        if (progress < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    }));
    await desk.waitForTimeout(1000);
    const lives = (await desk.evaluate(() => window.__ghostLife.done)).sort((a, b) => a - b);
    p95s.push(lives.length ? lives[Math.floor(lives.length * 0.95)] : 0);
    worstGhost = Math.max(worstGhost, lives.at(-1) ?? 0);
  }
  const medianP95 = [...p95s].sort((a, b) => a - b)[1];
  assert.ok(medianP95 <= 134, `PC 10 viewports/s: a temp card on screen turns real within 8 frames (p95 per fling ${p95s.map(Math.round).join(", ")})`);

  // Build zone the same on both sides (advertising-masonry R7): at rest mid-page, real cards reach past the top and bottom edges by about one viewport each.
  // A fresh page jumps straight to the middle, so no card is held above by the hysteresis of an earlier scroll.
  await desk.goto(`${base}/vi/advertising-products/?zone`, { waitUntil: "domcontentloaded" });
  await desk.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
  await desk.waitForTimeout(2500);
  const extent = await desk.evaluate(async () => {
    const middle = (document.documentElement.scrollHeight - innerHeight) / 2;
    window.TruongThinhMotion.setLogicalScroll(middle);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const cards = [...document.querySelectorAll("[data-project-grid] [data-masonry-card]")].filter((node) => !node.hidden).map((node) => node.getBoundingClientRect());
    return { above: -Math.min(...cards.map((rect) => rect.top)), below: Math.max(...cards.map((rect) => rect.bottom)) - innerHeight, viewport: innerHeight };
  });
  assert.ok(extent.above >= 0.8 * extent.viewport && extent.below >= 0.8 * extent.viewport, `real cards reach one viewport past both edges: ${JSON.stringify(extent)}`);
  assert.ok(Math.abs(extent.above - extent.below) <= 0.4 * extent.viewport, `the build zone is the same above and below: ${JSON.stringify(extent)}`);
  await desktop.close();
  console.log(`advertising fast fling PC: p95 ${p95s.map(Math.round).join("/")} ms, worst ${Math.round(worstGhost)} ms, zone above ${Math.round(extent.above)} below ${Math.round(extent.below)}`);
  console.log(`advertising fast fling: worst coverage ${worst.toFixed(3)} (floor ${floor.toFixed(3)}), ${fling.ghosts.length} ghosts, most ${mostAdded} cards mounted per frame, crossfades ${crossfades}`);
} finally {
  await browser.close();
}
