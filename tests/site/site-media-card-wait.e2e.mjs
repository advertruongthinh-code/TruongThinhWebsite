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
        id: wait.dataset.mediaId, hidden: wait.hidden, translate: getComputedStyle(wait).translate,
        flow: Boolean(wait.querySelector(":scope > .masonry-grid__cta-frame")),
        overhang: wait.getBoundingClientRect().width - wait.parentElement.getBoundingClientRect().width,
        mask: getComputedStyle(wait).maskImage } };
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
      // Every frame, the opacity of the lane wait layer: it must fade out over the decoded media (a crossfade), never vanish in one frame (owner 2026-11-13).
      await page.evaluate(() => {
        window.__waitOpacities = [];
        const sample = () => {
          const wait = document.querySelector(".card-media__wait");
          if (wait) window.__waitOpacities.push(Number(getComputedStyle(wait).opacity));
          requestAnimationFrame(sample);
        };
        sample();
      });
      const state = await pressState(card, touch ? "swipe" : "arrow");
      assert.equal(state.activeId, `${fixtureId}-wait-1`, `press moves to media 2: ${JSON.stringify(state)}`);
      assert(state.moving > 0, `strip runs within two frames of the press, before the file arrives: ${JSON.stringify(state)}`);
      assert(state.wait && state.wait.id === `${fixtureId}-wait-1` && !state.wait.hidden,
        `incoming lane carries its wait layer: ${JSON.stringify(state)}`);
      if (touch) assert.equal(state.wait.colors, "colors", "phone waits on the color layer");
      else {
        assert(state.wait.frost && state.wait.flow, `PC waits under Flow over frosted glass: ${JSON.stringify(state.wait)}`);
        assert(Math.abs(state.wait.overhang) < 1 && !state.wait.mask.includes("gradient"), `PC lane layer is exactly the lane box, hard edge: ${JSON.stringify(state.wait)}`);
        const running = await card.evaluate((node) => new Promise((resolve) => setTimeout(() => {
          const frame = node.querySelector(".card-media__wait > .masonry-grid__cta-frame");
          resolve(frame ? { ready: frame.classList.contains("is-entry-ready"), backend: frame.querySelector("canvas")?.dataset.masonryFlowBackend } : null);
        }, 600)));
        assert(running?.ready && running.backend && running.backend !== "none", `lane Flow runs: ${JSON.stringify(running)}`);
      }
      assert(await settled(card, `${fixtureId}-wait-1`), "media shows and the wait layer goes once the file has decoded");
      const opacities = await page.evaluate(() => window.__waitOpacities);
      assert(opacities.some((opacity) => opacity > 0.05 && opacity < 0.95), `the wait layer crossfades out: ${JSON.stringify(opacities.slice(-12))}`);
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
      // The queue runs at most 2 downloads at once on a phone, nearest first; a thumbnail scrolled out of the strip loads lazily now that
      // thumbnails keep the media ratio (owner 2026-11-14), so the last media starts once an earlier one ends (checked after the slide).
      assert(["1", "2"].every((id) => requested.has(id)), `the nearest media are queued once the viewed media shows: ${[...requested]}`);
      // Every frame, the opacity of the target lane's wait layer: it must fade out over the decoded media before the strip goes, never be cut
      // by the strip landing (phone showed the image at once, owner 2026-11-13).
      await page.evaluate(() => {
        window.__waitOpacities = [];
        const sample = () => {
          const wait = document.querySelector(".detail-view__strip .card-media__wait");
          if (wait) window.__waitOpacities.push(Number(getComputedStyle(wait).opacity));
          requestAnimationFrame(sample);
        };
        sample();
      });
      const state = await page.evaluate(async () => {
        document.querySelector('[data-detail-media-step="1"]').click();
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        const strip = document.querySelector(".detail-view__strip");
        const wait = strip?.querySelector(".card-media__wait");
        return { moving: strip ? strip.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length : 0,
          wait: wait && { frost: wait.classList.contains("card-media__wait--frost"), colors: wait.dataset.mediaWait || null,
            flow: Boolean(wait.querySelector(":scope > .masonry-grid__cta-frame")) } };
      });
      assert(state.moving > 0, `primary strip runs within two frames of the press: ${JSON.stringify(state)}`);
      assert(state.wait, `target lane carries its wait layer: ${JSON.stringify(state)}`);
      if (touch) assert.equal(state.wait.colors, "colors", "phone waits on the color layer");
      else assert(state.wait.frost && state.wait.flow, `PC waits under Flow over frosted glass: ${JSON.stringify(state.wait)}`);
      await page.waitForFunction(() => !document.querySelector(".detail-view__strip"), null, { timeout: 15_000 });
      assert.match(await page.locator("[data-detail-view] [data-detail-image]").getAttribute("src"), /media-wait=1/);
      for (const end = Date.now() + DELAY_MS * 2; requested.size < 3 && Date.now() < end;) await page.waitForTimeout(100);
      assert.deepEqual([...requested].sort(), ["1", "2", "3"], "every other media is queued once a slot frees");
      const opacities = await page.evaluate(() => window.__waitOpacities);
      assert(opacities.some((opacity) => opacity > 0.05 && opacity < 0.95), `the wait layer crossfades out before the strip goes: ${JSON.stringify(opacities.slice(-12))}`);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}

// Opens the photo of the fixture card; `slowCover` also delays the cover, so the primary is still under its first-load wait.
async function openSlowPhoto(page, { slowCover = false } = {}) {
  await page.route("**/*media-wait=*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    await route.continue().catch(() => {});
  });
  const artifact = slowArtifact();
  if (slowCover) {
    const card = artifact.cards.find((item) => item.id === fixtureId);
    card.mediaItems[0] = { ...card.mediaItems[0], src: `${card.mediaItems[0].src}?media-wait=0` };
  }
  await page.addInitScript((value) => { window.__TT_ADVERTISING_ARTIFACT__ = value; }, artifact);
  await page.goto(`${BASE_URL}/vi/advertising-products/?category=signage-raised-letters&photo=${fixtureId}`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-detail-view]").waitFor({ state: "visible" });
}

// media-card R6 (owner 2026-11-13): sliding away from a primary still under its first-load Flow takes that same Flow frame along in its
// lane, so the frame never shows bare (grey) mid-slide.
test("media-card R6 PC 1440: the primary's first-load Flow rides its lane when the viewer slides away", async () => {
  const browser = await launchBrowser();
  const { context, page } = await openPage(browser, VIEWPORTS.desktop);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await openSlowPhoto(page, { slowCover: true });
    await page.waitForFunction(() => {
      const frame = document.querySelector("[data-detail-view] .detail-view__hero-frame > .masonry-grid__cta-frame");
      if (frame) frame.dataset.testFirstLoad = "";
      return Boolean(frame);
    });
    const state = await page.evaluate(async () => {
      document.querySelector('[data-detail-media-step="1"]').click();
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const frame = document.querySelector("[data-test-first-load]");
      return { inLane: Boolean(frame?.closest(".detail-view__strip .card-media__wait")), connected: Boolean(frame?.isConnected),
        lanes: document.querySelectorAll(".detail-view__strip .card-media__wait").length };
    });
    assert(state.inLane && state.lanes === 2, `the first-load Flow frame moved into the leaving lane: ${JSON.stringify(state)}`);
    await page.waitForFunction(() => !document.querySelector(".detail-view__strip"), null, { timeout: 15_000 });
    assert(!(await page.evaluate(() => document.querySelector("[data-test-first-load]")?.isConnected)), "the frame goes with its lane");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
    await browser.close();
  }
});

// media-card R6 (owner 2026-11-13): in the viewer, a media still loading slides in at once under the same lane wait as the primary strip
// and crossfades to the image once it has decoded.
for (const [label, viewport, touch] of [["PC 1440", VIEWPORTS.desktop, false], ["phone 390", VIEWPORTS.phone, true]]) {
  test(`media-card R6 ${label}: the viewer slides at once onto a loading media under its wait layer`, async () => {
    const browser = await launchBrowser();
    const { context, page } = await openPage(browser, viewport, { hasTouch: touch, isMobile: touch });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await openSlowPhoto(page);
      await page.waitForFunction(() => {
        const image = document.querySelector("[data-detail-view] [data-detail-image]");
        return image?.complete && image.naturalWidth > 0;
      });
      await page.evaluate(() => document.querySelector("[data-detail-expand]").click());
      await page.waitForFunction(() => document.querySelector("[data-detail-dialog]")?.dataset.viewerState === "open"
        || (document.querySelector("[data-detail-dialog]")?.open && !document.querySelector("[data-detail-dialog]").dataset.viewerState));
      await page.evaluate(() => {
        window.__waitOpacities = [];
        window.__flowOnEntry = null;
        const sample = () => {
          const wait = document.querySelector(".detail-dialog__wait");
          if (wait) window.__waitOpacities.push(Number(getComputedStyle(wait).opacity));
          // Owner 2026-11-14: the lane Flow already runs at full strength on the first frame its lane shows on screen.
          const frame = wait?.querySelector(":scope > .masonry-grid__cta-frame");
          if (frame && window.__flowOnEntry === null && wait.getBoundingClientRect().left < innerWidth) {
            window.__flowOnEntry = { opacity: Number(getComputedStyle(frame).opacity), state: frame.dataset.masonryFlowState };
          }
          requestAnimationFrame(sample);
        };
        sample();
      });
      const state = await page.evaluate(async (id) => {
        const thumb = document.querySelector(`[data-detail-viewer-select="${id}"]`);
        const pending = "mediaPending" in thumb.dataset;
        thumb.click();
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        const image = document.querySelector("[data-detail-expanded-image]");
        const wait = document.querySelector(".detail-dialog__wait");
        const box = (node) => { const rect = node.getBoundingClientRect(); return { width: Math.round(rect.width), height: Math.round(rect.height) }; };
        return { moving: image.getAnimations().filter((animation) => animation.playState === "running").length,
          wait: wait && { colors: wait.dataset.mediaWait || null, flow: Boolean(wait.querySelector(":scope > .masonry-grid__cta-frame")),
            moving: wait.getAnimations().filter((animation) => animation.playState === "running").length, box: box(wait) },
          image: box(image), pending };
      }, `${fixtureId}-wait-1`);
      // Owner 2026-11-14: a thumbnail whose media's large file has not loaded runs the light streak.
      assert(state.pending, "the thumbnail of a loading media runs the light streak");
      assert(state.moving > 0, `the viewer strip runs within two frames of the press: ${JSON.stringify(state)}`);
      assert(state.wait && state.wait.moving > 0, `the target carries its wait layer along: ${JSON.stringify(state)}`);
      assert.equal(state.wait.box.height, state.image.height, "the wait layer has the image's fit size");
      if (touch) assert.equal(state.wait.colors, "colors", "phone waits on the color layer");
      else assert(state.wait.flow && state.wait.box.width === state.image.width, `PC waits under Flow at the image box, hard edge: ${JSON.stringify(state)}`);
      await page.waitForFunction(() => !document.querySelector(".detail-dialog__wait"), null, { timeout: 15_000 });
      const shown = await page.evaluate(() => {
        const image = document.querySelector("[data-detail-expanded-image]");
        return { src: image.getAttribute("src"), visibility: getComputedStyle(image).visibility };
      });
      assert.match(shown.src, /media-wait=1/);
      assert.equal(shown.visibility, "visible");
      const opacities = await page.evaluate(() => window.__waitOpacities);
      assert(opacities.some((opacity) => opacity > 0.05 && opacity < 0.95), `the wait layer crossfades out: ${JSON.stringify(opacities.slice(-12))}`);
      if (!touch) {
        const entry = await page.evaluate(() => window.__flowOnEntry);
        assert(entry && entry.opacity === 1 && entry.state === "running", `Flow runs at full strength as its lane enters: ${JSON.stringify(entry)}`);
      }
      // The streak crossfades out once the large file has loaded; both strips drop the mark.
      await page.waitForFunction((id) => [...document.querySelectorAll(`[data-detail-media-select="${id}"], [data-detail-viewer-select="${id}"]`)]
        .every((button) => !("mediaPending" in button.dataset) && !("mediaSettling" in button.dataset)), `${fixtureId}-wait-1`, { timeout: 15_000 });
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
