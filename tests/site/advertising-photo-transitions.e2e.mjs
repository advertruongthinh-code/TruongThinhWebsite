import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CARDS, ADVERTISING_CATEGORIES } from "../../src/site/advertising-products/catalog.mjs";
import { matchesFilter } from "../../src/site/masonry/layout.mjs";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultOutput = path.join(root, ".tmp/orchestration/advertising-browse-implementation-20260910");
const requestedOutput = process.env.PHOTO_TRANSITIONS_OUTPUT_DIR?.trim();
const output = requestedOutput ? path.resolve(root, requestedOutput) : defaultOutput;
const reportPath = path.join(output, "cp3-transition-e2e-report.md");
const resultsPath = path.join(output, "cp3-transition-e2e-results.json");
const failureDir = path.join(output, "cp3-transition-failures-r6-rerun");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
const generatedAt = new Date().toISOString();
const sha256 = async (filePath) => createHash("sha256").update(await readFile(filePath)).digest("hex");
const provenance = {
  generatedAt,
  source: {
    path: "src/site/masonry/runtime.mjs",
    sha256: await sha256(path.join(root, "src/site/masonry/runtime.mjs")),
  },
  output: {
    path: ".site-output/masonry/runtime.mjs",
    sha256: await sha256(path.join(root, ".site-output/masonry/runtime.mjs")),
  },
  motionSource: {
    path: "src/site/motion.js",
    sha256: await sha256(path.join(root, "src/site/motion.js")),
  },
  motionOutput: {
    path: ".site-output/motion.js",
    sha256: await sha256(path.join(root, ".site-output/motion.js")),
  },
};
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
// PHOTO_TRANSITIONS_ENGINE=webkit|firefox runs the whole suite on another engine; CI keeps Chromium.
const engine = (await import("playwright"))[process.env.PHOTO_TRANSITIONS_ENGINE || "chromium"];
const results = [];
const A = "kiosk-posm-07";
const B = "mobile-retail-04";
const mediaCardId = "signage-raised-letters-37";
const mediaVideoId = `${mediaCardId}-synthetic-video`;
// Mirrors VISIT_SEED_HANDOFF_KEY; the runtime module needs a window to import.
const visitSeedHandoffKey = "tt-advertising-visit-seed-handoff-v1";
const p13BaselineOnly = process.env.PHOTO_TRANSITIONS_P13_BASELINE === "1";
const p13GateOnly = process.env.PHOTO_TRANSITIONS_P13_GATE === "1";
const selectedCase = process.env.CASE || "";
const p13RegressionCases = new Set([
  "p13-position-stuffing-and-remount",
  "morph-frame-identity",
  "viewer-morph-lock-handoff",
  "history-back-forward-morph",
  "history-pointer-retained-morph",
  "history-grid-pointer-retained-morph",
  "history-grid-scrollbar-resize",
  "rapid-related-and-back-mid-morph",
  "morph-backdrop-lifecycle",
  "delayed-image-resize-latest-wins",
  "related-selected-card-shuffle-cleanup",
]);
// The artifact registry also has the product group tag (taxonomy R7).
const tagLabels = new Map(ADVERTISING_CATALOG_ARTIFACT.tagRegistry.map((tag) => [tag.id, { vi: tag.labelVi, en: tag.labelEn }]));

const href = (route) => new URL(route, baseUrl).href;
const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const snapshot = () => ({
  url: location.href,
  hero: document.querySelector("[data-detail-image]")?.dataset.detailId || null,
  heroSrc: document.querySelector("[data-detail-image]")?.currentSrc || null,
  clones: [...document.querySelectorAll("[data-detail-morph]")].map((node) => ({ id: node.dataset.detailId, src: node.currentSrc, rect: node.getBoundingClientRect().toJSON() })),
  locked: [document.body.style.overflow, document.documentElement.style.overflow],
});
// waitForFunction does not wait for the value of a Promise the predicate returns (a Promise is always truthy so the condition is met on the first try);
// the frame-based wait therefore runs in the page via evaluate.
// Smooth scroll decelerates toward the target; read the logical position only once it has fully stopped.
async function restingScroll(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const read = () => window.TruongThinhMotion.getLogicalScroll();
    const check = (previous) => requestAnimationFrame(() => requestAnimationFrame(() => {
      const current = read();
      if (Math.abs(current - previous) < 0.5) resolve(current);
      else check(current);
    }));
    check(read());
  }));
}
async function settle(page, predicate, argument) {
  await page.waitForFunction(predicate, argument, { timeout: 8_000 });
  await page.evaluate(frame);
  await page.waitForFunction(predicate, argument, { timeout: 8_000 });
  return page.evaluate(snapshot);
}
async function ready(page, id) {
  await settle(page, (expected) => document.querySelector("[data-detail-view]")?.dataset.detailId === expected && document.querySelector("[data-detail-image]")?.complete, id);
}
// Replaces fixed waits: the open detail has finished building related (built across several tasks, advertising-detail R7; the runtime
// sets data-masonry-detail-ready) and the primary reveal has finished (aria-busy is removed in the same task the reveal starts), with no finite animation or GSAP tween unfinished,
// and that state holds across two consecutive frames. It only proves "nothing is running"; a case that needs motion to have started
// must first wait for its own start signal.
async function quiet(page) {
  const settled = await page.evaluate(() => new Promise((resolve) => {
    const deadline = performance.now() + 15_000;
    const busy = () => {
      const view = document.querySelector("[data-detail-view]");
      if (view && !view.hidden && (view.dataset.masonryDetailReady !== "true"
        || view.querySelector(".detail-view__hero-frame[aria-busy]"))) return true;
      // media-hover-zoom is a 5s zoom running continuously in the background on cards in view, not a transition.
      if (document.getAnimations().some((animation) => (animation.playState === "running" || animation.playState === "pending")
        && animation.effect?.getComputedTiming().iterations !== Infinity
        && !animation.effect?.target?.classList.contains("media-hover-zoom"))) return true;
      return Boolean(window.gsap?.globalTimeline.getChildren(false, true, false)
        .some((tween) => !tween.paused() && tween.repeat() !== -1 && tween.totalProgress() < 1));
    };
    const check = () => {
      if (performance.now() > deadline) return resolve(false);
      if (busy()) return requestAnimationFrame(check);
      requestAnimationFrame(() => requestAnimationFrame(() => (busy() ? check() : resolve(true))));
    };
    check();
  }));
  assert(settled, "page did not settle within 15s");
}
// Let the hover transition (150ms) finish before reading the color: wait for the button's own animation, not a fixed number of ms.
const settleHover = (control) => control.evaluate((node) => Promise.all(node.getAnimations().map((animation) => animation.finished.catch(() => {}))));
async function openA(page) {
  await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.TruongThinhMasonry?.getAdapter?.());
  await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id, { scrollIntoView: true }), A);
  const card = page.locator(`[data-masonry-card="${A}"] > a`);
  await card.click();
  await ready(page, A);
}
async function chooseB(page, beforeClick) {
  await page.locator('[data-masonry-suggestion-tag="use-sampling"]').click();
  await page.waitForFunction(() => new URL(location.href).searchParams.get("tag") === "use-sampling");
  const link = page.locator(`[data-masonry-related-card="${B}"] > a`);
  await link.waitFor();
  await link.scrollIntoViewIfNeeded();
  await page.waitForFunction((id) => {
    const image = document.querySelector(`[data-masonry-related-card="${id}"] img`);
    return image?.complete && image.naturalWidth > 0 && Boolean(image.currentSrc);
  }, B);
  await beforeClick?.();
  await link.click();
}

async function m02bFixture(page, locale, direct = false, seed = null) {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  const card = artifact.cards.find((item) => item.id === mediaCardId);
  assert(card, "M02b fixture needs the authored card");
  // Keep only the legacy image as cover, so the fixture does not depend on temporary media (which can add images, videos, set a video as cover).
  card.mediaItems = [{ id: mediaCardId, kind: "image", ...card.media }];
  card.coverMediaId = mediaCardId;
  card.mediaItems.push({
    id: mediaVideoId, kind: "video", src: "/__site_media_card_fixture__/clip-audio-3x2.mp4",
    sourceId: "m00b:test-only:clip-audio-3x2", source: "M00b sealed synthetic fixture",
    sha256: "363907eb9b7c8da2af83cd672087ce0e2d1942e4f7a30350b06ec2583aba4ef4",
    provenance: "Synthetic test-only fixture, not public project media.",
    width: 480, height: 320, posterSrc: "/__site_media_card_fixture__/poster-3x2.webp",
    posterWidth: 480, posterHeight: 320, durationSeconds: 3, hasAudio: true,
    altVi: "Video kiểm thử tổng hợp", altEn: "Synthetic test video",
  });
  await page.route("**/__site_media_card_fixture__/*", (route) => {
    const video = route.request().url().endsWith(".mp4");
    return route.fulfill({
      path: path.join(root, "tests/site/fixtures", video ? "site-media-card-clip-audio-3x2.mp4" : "site-media-card-poster-3x2.webp"),
      contentType: video ? "video/mp4" : "image/webp",
    });
  });
  await page.addInitScript((value) => { window.__TT_ADVERTISING_ARTIFACT__ = value; }, artifact);
  const target = href(`/${locale}/advertising-products/?category=signage-raised-letters${direct ? `&photo=${mediaCardId}` : ""}`);
  // Pin the visit seed through the runtime handoff so the related order (and virtual reachability) is deterministic.
  if (seed) {
    await page.addInitScript(({ key, url, value }) => {
      sessionStorage.setItem(key, JSON.stringify({ version: 1, url, seed: value, expiresAt: Date.now() + 30_000 }));
    }, { key: visitSeedHandoffKey, url: target, value: seed });
  }
  await page.goto(target, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.TruongThinhMasonry?.getAdapter?.());
  if (seed) assert.equal(await page.evaluate(() => window.TruongThinhMasonry.getBrowseState().seed), seed, "M02b fixture seed must be consumed");
  if (direct) await page.locator("[data-detail-view]").waitFor({ state: "visible" });
  else await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id), mediaCardId);
  return card;
}

async function armNoGridMorphProbe(page) {
  await page.evaluate(() => {
    window.__ttM02bProbe?.restore?.();
    const probe = { clones: [], locks: [], frames: [] };
    const capture = (node) => {
      if (!(node instanceof Element)) return;
      if (node.matches("[data-detail-morph]")) probe.clones.push({ id: node.dataset.detailId, at: performance.now() });
      node.querySelectorAll?.("[data-detail-morph]").forEach(capture);
    };
    probe.observer = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach(capture)));
    probe.observer.observe(document.body, { childList: true, subtree: true });
    const motion = window.TruongThinhMotion;
    const lock = motion.lockLogicalScroll;
    motion.lockLogicalScroll = function measuredLock(...args) {
      probe.locks.push({ at: performance.now(), url: location.href });
      return lock.apply(this, args);
    };
    probe.restore = () => { probe.observer.disconnect(); motion.lockLogicalScroll = lock; probe.stopped = true; };
    const sample = () => {
      const photo = (new URL(location.href).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null);
      // Opening from the grid builds detail hidden in the card-touch task and only then shows it (decision phone-frame-budget):
      // the entry's first frame still paints the old view at the old scroll; only a frame that painted the new entry's view counts.
      const shown = Boolean(photo) === !document.querySelector("[data-detail-view]")?.hidden;
      probe.frames.push({ photo, shown,
        y: motion.getLogicalScroll?.() ?? scrollY, nativeY: scrollY,
        cloneCount: document.querySelectorAll("[data-detail-morph]").length });
      // Sample until the evidence is read: detail may show later than a fixed window on a slow machine.
      if (!probe.stopped) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    window.__ttM02bProbe = probe;
  });
}

async function noGridMorphEvidence(page, expectedPhoto, expectedY) {
  // A frame of the target entry only counts once the view has changed to that entry; wait for the probe to record at least one such frame.
  await page.waitForFunction((photo) => window.__ttM02bProbe.frames.some((entry) => entry.photo === photo && entry.shown), expectedPhoto);
  await quiet(page);
  const evidence = await page.evaluate(() => {
    const probe = window.__ttM02bProbe;
    probe.restore();
    return { clones: probe.clones, locks: probe.locks, frames: probe.frames,
      currentClones: document.querySelectorAll("[data-detail-morph]").length,
      currentLocks: [document.body.style.overflow, document.documentElement.style.overflow] };
  });
  assert.equal(evidence.clones.length, 0, `grid/detail transition created a clone: ${JSON.stringify(evidence.clones)}`);
  assert.equal(evidence.currentClones, 0, "grid/detail transition retained a clone");
  assert.equal(evidence.locks.length, 0, `grid/detail transition acquired a scroll lease: ${JSON.stringify(evidence.locks)}`);
  assert.deepEqual(evidence.currentLocks, ["", ""], "grid/detail transition retained scroll lock");
  const entryFrames = evidence.frames.filter(({ photo, shown }) => photo === expectedPhoto && shown);
  assert(entryFrames.length > 0, "no frames observed after navigation reached its history entry");
  assert(entryFrames.every(({ y, cloneCount }) => Math.abs(y - expectedY) <= 1 && cloneCount === 0),
    `history entry painted at another scroll position (expected ${expectedY}): ${JSON.stringify(entryFrames.slice(0, 3))}`);
  return { cloneAdds: evidence.clones.length, lockCalls: evidence.locks.length,
    entryFrames: entryFrames.length, y: entryFrames.at(-1).y };
}
async function caseRun(name, viewport, fn, { allowedIssues = [], contextOptions = {} } = {}) {
  if (p13BaselineOnly || (p13GateOnly && !p13RegressionCases.has(name))) return;
  if (selectedCase && selectedCase !== name) return;
  const recordVideo = name === "history-entry-scroll-offscreen-morph"
    ? { dir: path.join(output, "video"), size: viewport } : undefined;
  const context = await browser.newContext({ viewport, locale: "vi-VN", ...contextOptions, ...(recordVideo && { recordVideo }) });
  const page = await context.newPage();
  if (p13GateOnly) await installSynchronousHandlerProbe(page);
  const issues = [];
  page.on("pageerror", (error) => issues.push(`pageerror:${error.message}`));
  // Firefox reports a Google Fonts request cancelled by navigation (NS_BINDING_ABORTED) as a console error.
  page.on("console", (message) => { if (message.type() === "error" && !/^downloadable font: download failed .*status=2152398850/.test(message.text())) issues.push(`console:${message.text()}`); });
  let stage = "start";
  try {
    const evidence = await fn(page, (value) => { stage = value; });
    const unexpectedIssues = issues.filter((issue) => !allowedIssues.includes(issue));
    assert.deepEqual(unexpectedIssues, [], `${name}: runtime diagnostics ${unexpectedIssues.join(" | ")}`);
    results.push({ name, viewport, status: "PASS", videoPath: await page.video()?.path(), evidence });
  } catch (error) {
    await mkdir(failureDir, { recursive: true });
    const captureName = name === "m02b-related-history-just-viewed-and-scroll" ? `${name}-${viewport.width}x${viewport.height}-${stage}` : name;
    const screenshot = path.join(failureDir, `${captureName.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`);
    await page.screenshot({ path: screenshot }).catch(() => {});
    const probe = await page.evaluate(() => window.__ttRelatedMorphProbe?.events || null).catch(() => null);
    const historyTrace = await page.evaluate(() => ({
      snapshots: window.__ttHistoryScrollTrace || [],
      morphs: window.__ttHistoryMorphs || [],
    })).catch(() => null);
    results.push({ name, viewport, status: "FAIL", stage, error: String(error?.stack || error), screenshot,
      videoPath: await page.video()?.path(), probe, historyTrace,
      relatedEvidence: await page.evaluate(() => window.__ttM02bRelatedEvidence || null).catch(() => null) });
  } finally { await context.close(); }
}

async function installSynchronousHandlerProbe(page) {
  await page.addInitScript(() => {
    const nativeAdd = EventTarget.prototype.addEventListener;
    const nativeRemove = EventTarget.prototype.removeEventListener;
    const byTarget = new WeakMap();
    const captureOf = (options) => typeof options === "boolean" ? options : Boolean(options?.capture);
    const wrapperFor = (target, listener, capture, create) => {
      let byListener = byTarget.get(target);
      if (!byListener && create) byTarget.set(target, byListener = new WeakMap());
      let byCapture = byListener?.get(listener);
      if (!byCapture && create) byListener.set(listener, byCapture = new Map());
      if (!byCapture) return null;
      if (!byCapture.has(capture) && create) {
        byCapture.set(capture, function measuredClickHandler(event) {
          const started = performance.now();
          try {
            return typeof listener === "function" ? listener.call(this, event) : listener.handleEvent.call(listener, event);
          } finally {
            window.__ttP13SyncHandlers.entries.push({ duration: performance.now() - started, target: this instanceof Element ? this.tagName : this.constructor?.name });
          }
        });
      }
      return byCapture.get(capture) || null;
    };
    window.__ttP13SyncHandlers = { entries: [] };
    EventTarget.prototype.addEventListener = function patchedAdd(type, listener, options) {
      if (type !== "click" || !listener) return nativeAdd.call(this, type, listener, options);
      return nativeAdd.call(this, type, wrapperFor(this, listener, captureOf(options), true), options);
    };
    EventTarget.prototype.removeEventListener = function patchedRemove(type, listener, options) {
      if (type !== "click" || !listener) return nativeRemove.call(this, type, listener, options);
      return nativeRemove.call(this, type, wrapperFor(this, listener, captureOf(options), false) || listener, options);
    };
  });
}

function percentile95(values) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.ceil(ordered.length * 0.95) - 1];
}

async function armInputTimingProbe(page, selector) {
  await page.evaluate((targetSelector) => {
    window.__ttP13InputTiming?.observer?.disconnect();
    const visualSignature = () => JSON.stringify({
      photo: document.querySelector("[data-detail-view]")?.dataset.detailId || null,
      photoHidden: document.querySelector("[data-detail-view]")?.hidden ?? null,
      gridHidden: document.querySelector("[data-project-index]")?.hidden ?? null,
      clone: [...document.querySelectorAll("[data-detail-morph]")]
        .map((node) => [node.dataset.detailId, getComputedStyle(node).transform, getComputedStyle(node).opacity]),
      bodyPhoto: document.body.classList.contains("is-detail"),
    });
    const probe = {
      selector: targetSelector,
      inputAt: null,
      firstFeedbackAt: null,
      handlerTaskEndAt: null,
      longTasks: [],
      syncEntryStart: window.__ttP13SyncHandlers?.entries.length || 0,
      observer: null,
    };
    try {
      probe.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (probe.inputAt !== null && entry.startTime >= probe.inputAt - 1) {
            probe.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
          }
        }
      });
      probe.observer.observe({ type: "longtask", buffered: false });
    } catch {}
    document.addEventListener("click", (event) => {
      if (!event.target.closest(targetSelector)) return;
      const initial = visualSignature();
      probe.inputAt = performance.now();
      setTimeout(() => { probe.handlerTaskEndAt = performance.now(); }, 0);
      const sample = () => {
        if (probe.firstFeedbackAt === null && visualSignature() !== initial) probe.firstFeedbackAt = performance.now();
        if (probe.firstFeedbackAt === null && performance.now() - probe.inputAt < 1_000) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, { capture: true, once: true });
    window.__ttP13InputTiming = probe;
  }, selector);
}

async function readInputTimingProbe(page) {
  await page.waitForFunction(() => window.__ttP13InputTiming?.firstFeedbackAt !== null
    && window.__ttP13InputTiming?.handlerTaskEndAt !== null, null, { timeout: 2_000 });
  return page.evaluate(() => {
    const probe = window.__ttP13InputTiming;
    // PerformanceObserver delivers entries asynchronously; takeRecords fetches the undelivered ones immediately.
    for (const entry of probe.observer?.takeRecords() ?? []) {
      if (probe.inputAt !== null && entry.startTime >= probe.inputAt - 1) probe.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
    }
    probe.observer?.disconnect();
    return {
      inputToFirstFeedbackMs: probe.firstFeedbackAt - probe.inputAt,
      schedulingEnvelopeMs: probe.handlerTaskEndAt - probe.inputAt,
      synchronousHandlerDurationsMs: (window.__ttP13SyncHandlers?.entries || []).slice(probe.syncEntryStart).map(({ duration }) => duration),
      synchronousTasksOver50Ms: probe.longTasks.filter(({ duration }) => duration > 50),
    };
  });
}

async function ensureParentTarget(page) {
  await page.waitForFunction(() => window.TruongThinhMasonry?.getAdapter?.());
  await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id, { scrollIntoView: true }), A);
  await page.waitForFunction((id) => {
    const image = document.querySelector(`[data-masonry-card="${id}"] img`);
    return image?.complete && image.naturalWidth > 0 && Boolean(image.currentSrc);
  }, A);
}

async function prepareRelatedTarget(page) {
  await ready(page, A);
  const tag = page.locator('[data-masonry-suggestion-tag="use-sampling"]');
  if (new URL(page.url()).searchParams.get("tag") !== "use-sampling") await tag.click();
  await page.waitForFunction(() => new URL(location.href).searchParams.get("tag") === "use-sampling");
  const link = page.locator(`[data-masonry-related-card="${B}"] > a`);
  await link.waitFor();
  await link.scrollIntoViewIfNeeded();
  await page.waitForFunction((id) => {
    const image = document.querySelector(`[data-masonry-related-card="${id}"] img`);
    return image?.complete && image.naturalWidth > 0 && Boolean(image.currentSrc);
  }, B);
}

async function measureTransition(page, flow) {
  if (flow === "parent-to-photo") {
    await ensureParentTarget(page);
    const selector = `[data-masonry-card="${A}"] > a`;
    await armInputTimingProbe(page, selector);
    await page.locator(selector).click();
    const timing = await readInputTimingProbe(page);
    await ready(page, A);
    await page.waitForFunction(() => !document.querySelector("[data-detail-morph]"));
    return timing;
  }
  if (flow === "related-to-photo") {
    await prepareRelatedTarget(page);
    const selector = `[data-masonry-related-card="${B}"] > a`;
    await armInputTimingProbe(page, selector);
    await page.locator(selector).click();
    const timing = await readInputTimingProbe(page);
    await ready(page, B);
    await page.waitForFunction(() => !document.querySelector("[data-detail-morph]"));
    return timing;
  }
  const selector = 'header .desktop-nav a[href="/vi/advertising-products/"]';
  await ready(page, A);
  await armInputTimingProbe(page, selector);
  await page.locator(selector).click();
  const timing = await readInputTimingProbe(page);
  await page.waitForFunction(() => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname)
    && document.querySelector("[data-detail-view]")?.hidden);
  await page.waitForFunction(() => !document.querySelector("[data-detail-morph]"));
  return timing;
}

async function prepareFlow(page, flow) {
  if (flow === "parent-to-photo") {
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await ensureParentTarget(page);
    return;
  }
  await page.goto(href(`/vi/advertising-products/?photo=${A}`), { waitUntil: "domcontentloaded" });
  await ready(page, A);
  if (flow === "related-to-photo") await prepareRelatedTarget(page);
}

async function runP13Baseline(browserInstance) {
  const viewport = { width: 1329, height: 912 };
  const flows = ["parent-to-photo", "related-to-photo", "photo-to-parent"];
  const evidence = { protocol: { viewport, warmRunsPerFlow: 20, coldRunsPerFlow: 1, throttle: "none" }, cold: {}, warm: {} };
  for (const flow of flows) {
    const coldContext = await browserInstance.newContext({ viewport, locale: "vi-VN" });
    const coldPage = await coldContext.newPage();
    await installSynchronousHandlerProbe(coldPage);
    await prepareFlow(coldPage, flow);
    evidence.cold[flow] = await measureTransition(coldPage, flow);
    await coldContext.close();

    const context = await browserInstance.newContext({ viewport, locale: "vi-VN" });
    const page = await context.newPage();
    await installSynchronousHandlerProbe(page);
    await prepareFlow(page, flow);
    const samples = [];
    for (let run = 0; run < 20; run += 1) {
      if (run > 0) await prepareFlow(page, flow);
      samples.push(await measureTransition(page, flow));
    }
    await context.close();
    evidence.warm[flow] = {
      samples,
      p95InputToFirstFeedbackMs: percentile95(samples.map(({ inputToFirstFeedbackMs }) => inputToFirstFeedbackMs)),
      maxSchedulingEnvelopeMs: Math.max(...samples.map(({ schedulingEnvelopeMs }) => schedulingEnvelopeMs)),
      maxSynchronousHandlerMs: Math.max(...samples.flatMap(({ synchronousHandlerDurationsMs }) => synchronousHandlerDurationsMs)),
      tasksOver50Ms: samples.flatMap(({ synchronousTasksOver50Ms }) => synchronousTasksOver50Ms),
    };
  }
  const evidenceDir = path.join(output, "evidence");
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(path.join(evidenceDir, "p13-t4-baseline.json"), `${JSON.stringify({ provenance, ...evidence }, null, 2)}\n`, "utf8");
  const passesBudget = Object.values(evidence.warm).every((flow) => flow.p95InputToFirstFeedbackMs <= 100
    && flow.maxSynchronousHandlerMs <= 50 && flow.tasksOver50Ms.length === 0);
  results.push({ name: "p13-t4-warm-baseline", viewport, status: passesBudget ? "PASS" : "FAIL", evidence });
}

async function installRelatedMediaProbe(page) {
  await page.addInitScript(() => {
    const probe = { records: [] };
    const sampling = new WeakSet();
    const capture = (image) => {
      const card = image.closest("[data-masonry-related-card]");
      // A remount from cache reinserts the same node, so dedupe by insertion, not by element.
      if (!card || sampling.has(image)) return;
      sampling.add(image);
      const record = { id: card.dataset.masonryRelatedCard, frames: [] };
      probe.records.push(record);
      const started = performance.now();
      const sample = () => {
        const style = getComputedStyle(image);
        record.frames.push({
          elapsed: performance.now() - started,
          opacity: Number(style.opacity),
          duration: style.transitionDuration,
          easing: style.transitionTimingFunction,
          // Like stuffing: the opacity fade still runs when the main thread is busy and cannot take a frame in between. An image with a skeleton
          // fades with a WAAPI crossfade instead of a CSS transition.
          blur: Boolean(image.style.filter),
          skeleton: Boolean(card.querySelector("[data-masonry-loading-skeleton]")),
          // The Flow frame fades to 0 with the image's fade and stays until the Glass ends: an opaque image under a gone frame is shown, not leaked.
          cover: Number(getComputedStyle(card.querySelector("[data-masonry-loading-skeleton]") || image).opacity),
          fading: image.getAnimations().some((animation) => animation.playState === "running"
            && (animation.transitionProperty === "opacity" || animation.effect?.getKeyframes().some((frame) => "opacity" in frame))),
        });
        // A card still with a skeleton has no media shown yet: sample until the fade finishes, even when the fixture holds the image past 3s.
        if (card.querySelector("[data-masonry-loading-skeleton]")) record.pending = true;
        const elapsed = performance.now() - started;
        if ((elapsed < 3_000 || (record.pending && Number(style.opacity) < 0.99 && elapsed < 15_000))
          && image.isConnected) requestAnimationFrame(sample);
        else sampling.delete(image);
      };
      requestAnimationFrame(sample);
    };
    new MutationObserver((entries) => entries.forEach((entry) => entry.addedNodes.forEach((added) => {
      if (!(added instanceof Element)) return;
      if (added.matches("[data-masonry-related-card] img")) capture(added);
      added.querySelectorAll("[data-masonry-related-card] img").forEach(capture);
    }))).observe(document, { childList: true, subtree: true });
    window.__ttP13RelatedMedia = probe;
  });
}

async function installStuffingProbe(page, selector, gridSelector) {
  await page.addInitScript(({ itemSelector, ownerSelector }) => {
    const probe = { records: [] };
    const capture = (node) => {
      if (node.dataset.p13StuffingObserved) return;
      node.dataset.p13StuffingObserved = "true";
      const grid = node.closest(ownerSelector) || document.querySelector(ownerSelector);
      const read = () => {
        const rect = node.getBoundingClientRect();
        const gridRect = grid?.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          x: gridRect ? rect.left - gridRect.left : rect.left,
          y: gridRect ? rect.top - gridRect.top : rect.top,
          duration: style.transitionDuration,
          delay: style.transitionDelay,
          easing: style.transitionTimingFunction,
          animations: node.getAnimations().filter((animation) => animation.playState === "running").length,
          // A transform transition runs on the compositor: it still slides the full 400ms when the main thread is busy and cannot take a frame in between.
          transformTransitionMs: node.getAnimations().find((animation) => animation.transitionProperty === "transform"
            && animation.playState === "running")?.effect.getTiming().duration ?? null,
        };
      };
      const record = { id: node.dataset.masonryCard || node.dataset.masonryRelatedCard, inserted: read(), frames: [] };
      probe.records.push(record);
      const started = performance.now();
      const sample = () => {
        const elapsed = performance.now() - started;
        record.frames.push({ elapsed, ...read() });
        // A transition only has a start time at the first frame painted after creation: a busy main thread while mounting related makes the card
        // slide later than the 460ms window (issue #507), so keep sampling until the transform transition finishes.
        const moving = node.getAnimations().some((animation) => animation.transitionProperty === "transform"
          && animation.playState === "running");
        if ((elapsed < 460 || (moving && elapsed < 3_000)) && node.isConnected) requestAnimationFrame(sample);
        else record.done = true;
      };
      requestAnimationFrame(sample);
    };
    new MutationObserver((entries) => entries.forEach((entry) => entry.addedNodes.forEach((added) => {
      if (!(added instanceof Element)) return;
      if (added.matches(itemSelector)) capture(added);
      added.querySelectorAll(itemSelector).forEach(capture);
    }))).observe(document, { childList: true, subtree: true });
    window.__ttP13Stuffing = probe;
  }, { itemSelector: selector, ownerSelector: gridSelector });
}

async function installBackdropMorphProbe(page) {
  await page.addInitScript(() => {
    const nativeAnimate = Element.prototype.animate;
    window.__ttP4BackdropMorphs = { records: [] };
    Element.prototype.animate = function measuredBackdropMorph(keyframes, options) {
      const animation = nativeAnimate.call(this, keyframes, options);
      const kind = this.matches?.("[data-detail-background]")
        ? "backdrop"
        : this.matches?.("[data-detail-morph]") ? "morph" : null;
      if (!kind) return animation;
      const record = {
        canceledAt: null,
        duration: Number(typeof options === "number" ? options : options?.duration),
        finishedAt: null,
        kind,
        keyframes: Array.isArray(keyframes) ? keyframes.map(({ backgroundColor, filter, offset, opacity, transform }) => ({
          backgroundColor: backgroundColor || null,
          filter: filter || null,
          offset: offset ?? null,
          opacity: opacity ?? null,
          transform: transform || null,
        })) : null,
        nodePhotoId: this.dataset.detailId || null,
        photoId: document.querySelector("[data-detail-view]")?.dataset.detailId || null,
        src: this.src || this.currentSrc || null,
        startedAt: performance.now(),
      };
      window.__ttP4BackdropMorphs.records.push(record);
      const sample = () => {
        const style = getComputedStyle(this);
        record.frames.push({
          at: performance.now(),
          currentTime: Number(animation.currentTime),
          filter: style.filter,
          locked: [document.body.style.overflow, document.documentElement.style.overflow],
          opacity: style.opacity,
          playState: animation.playState,
          transform: style.transform,
        });
        if (animation.playState === "pending" || animation.playState === "running") requestAnimationFrame(sample);
      };
      record.frames = [];
      requestAnimationFrame(sample);
      animation.addEventListener("finish", () => { record.finishedAt = performance.now(); }, { once: true });
      animation.addEventListener("cancel", () => { record.canceledAt = performance.now(); }, { once: true });
      return animation;
    };
  });
}

async function readBackdropMorphState(page) {
  return page.evaluate(() => {
    const backdrop = document.querySelector("[data-detail-background]");
    const hero = document.querySelector("[data-detail-image]");
    const heroFrame = hero?.closest(".detail-view__hero-frame");
    const backdropStyle = backdrop ? getComputedStyle(backdrop) : null;
    return {
      activeBackdropAnimations: backdrop?.getAnimations()
        .filter(({ playState }) => playState === "pending" || playState === "running").length || 0,
      backdropSrc: backdrop?.currentSrc || backdrop?.src || null,
      backdropStyle: backdropStyle ? {
        filter: backdropStyle.filter,
        opacity: backdropStyle.opacity,
        transform: backdropStyle.transform,
      } : null,
      heroId: hero?.dataset.detailId || null,
      heroFrameBackground: heroFrame ? getComputedStyle(heroFrame).backgroundColor : null,
      heroSrc: hero?.currentSrc || hero?.src || null,
      locked: [document.body.style.overflow, document.documentElement.style.overflow],
      records: (window.__ttP4BackdropMorphs?.records || []).map((record) => ({ ...record })),
      scrollY: window.scrollY,
      viewId: document.querySelector("[data-detail-view]")?.dataset.detailId || null,
    };
  });
}

// The probe samples for at least 460ms from when the card is attached, until the card stops sliding. Wait for the sampling to end instead of a fixed
// mark after navigation: a slow machine attaches the card later than that mark so there would be no sample to compare.
const stuffingSettled = (page) => page.waitForFunction(() => window.__ttP13Stuffing.records.length
  && window.__ttP13Stuffing.records.every((record) => record.done));

function assertStuffingRecord(records, label, expectedHead) {
  const moved = records.find((record) => {
    const first = record.frames[0];
    const last = record.frames.at(-1);
    return first && last && Math.abs(last.y - first.y) > 8;
  });
  assert(moved, `${label}: no card moved from column head to organic target`);
  const first = moved.frames[0];
  const last = moved.frames.at(-1);
  const middle = moved.frames.find(({ elapsed, y }) => elapsed >= 100 && elapsed <= 400
    && Math.abs(y - first.y) > 1 && Math.abs(last.y - y) > 1);
  const head = expectedHead(moved, first);
  assert(Math.abs(first.y - head) <= 1.5, `${label}: first frame was not the destination column head ${JSON.stringify({ id: moved.id, first, head, inserted: moved.inserted, last })}`);
  assert((middle && Math.abs(middle.y - first.y) > 1 && Math.abs(last.y - middle.y) > 1) || first.transformTransitionMs === 400,
    `${label}: missing visible 400ms travel ${JSON.stringify({ first, middle, last, frames: moved.frames.length })}`);
  assert(first.duration.split(",").includes("0.4s"), `${label}: duration is ${first.duration}`);
  assert(first.delay.split(",").every((value) => value === "0s"), `${label}: transition has delay ${first.delay}`);
  assert(first.easing.split(",").includes("ease"), `${label}: easing is ${first.easing}`);
  return { id: moved.id, first, middle, last };
}

const browser = await engine.launch({ headless: true });
try {
  if (p13BaselineOnly) await runP13Baseline(browser);
  await caseRun("m02b-grid-detail-no-clone-no-jump", { width: 1440, height: 900 }, async (page, stage) => {
    const evidence = [];
    for (const locale of ["vi", "en"]) {
      stage(`${locale}-grid-click`);
      await page.goto(href(`/${locale}/advertising-products/`), { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.TruongThinhMasonry?.getAdapter?.());
      await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id, { scrollIntoView: true }), A);
      const card = page.locator(`[data-masonry-card="${A}"] > a`);
      await card.scrollIntoViewIfNeeded();
      // The masonry Y keeps changing for a few frames after scrolling to the card; only take it after 5 consecutive still frames.
      const gridY = await page.evaluate(() => new Promise((resolve) => {
        let last = NaN;
        let still = 0;
        const tick = () => {
          const y = window.TruongThinhMotion.getLogicalScroll();
          still = y === last ? still + 1 : 0;
          last = y;
          if (still >= 5) resolve(y); else requestAnimationFrame(tick);
        };
        tick();
      }));
      await armNoGridMorphProbe(page);
      await card.click();
      await ready(page, A);
      const detailY = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
      evidence.push({ locale, direction: "click", ...await noGridMorphEvidence(page, A, detailY) });

      stage(`${locale}-grid-back`);
      await armNoGridMorphProbe(page);
      await page.goBack();
      await page.waitForFunction(() => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname));
      evidence.push({ locale, direction: "Back", ...await noGridMorphEvidence(page, null, gridY) });

      stage(`${locale}-grid-forward`);
      await armNoGridMorphProbe(page);
      await page.goForward();
      await ready(page, A);
      evidence.push({ locale, direction: "Forward", ...await noGridMorphEvidence(page, A, detailY) });
    }
    return evidence;
  });

  await caseRun("m02b-one-just-viewed-marker-per-tab", { width: 1440, height: 900 }, async (page, stage) => {
    const readMarkers = () => page.evaluate(() => [...document.querySelectorAll("[data-masonry-card]")]
      .filter((card) => /Vừa xem|Just viewed/.test(card.innerText))
      .map((card) => ({ id: card.dataset.masonryCard, text: card.innerText })));
    const evidence = [];
    for (const locale of ["vi", "en"]) {
      stage(`${locale}-close-A`);
      await page.goto(href(`/${locale}/advertising-products/`), { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.TruongThinhMasonry?.getAdapter?.());
      await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id, { scrollIntoView: true }), A);
      await page.locator(`[data-masonry-card="${A}"] > a`).click();
      await ready(page, A);
      await page.goBack();
      await page.waitForFunction(() => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname)
        && !document.querySelector("[data-detail-morph]"));
      await page.evaluate(frame);
      const first = await readMarkers();
      assert.deepEqual(first.map(({ id }) => id), [A], `${locale}: closing A must mark only A`);
      assert(first[0].text.includes(locale === "vi" ? "Vừa xem" : "Just viewed"), `${locale}: marker label`);

      stage(`${locale}-close-B`);
      await page.evaluate((id) => {
        const card = window.TruongThinhMasonry.getAdapter().ensurePhoto(id, { focus: false, scrollIntoView: false });
        const rect = card.getBoundingClientRect();
        const motion = window.TruongThinhMotion;
        motion.setLogicalScroll(motion.getLogicalScroll() + rect.top - (innerHeight - rect.height) / 2);
      }, B);
      const bCardInViewport = (id) => {
        const card = document.querySelector(`[data-masonry-card="${id}"]`);
        const rect = card?.getBoundingClientRect();
        return Boolean(card && !card.hidden && rect.top >= 0 && rect.bottom <= innerHeight);
      };
      await page.waitForFunction(bCardInViewport, B, { timeout: 5_000 });
      await page.evaluate(frame);
      assert(await page.evaluate(bCardInViewport, B), `${locale}: B must stay within the viewport before click`);
      await page.locator(`[data-masonry-card="${B}"] > a`).click();
      await ready(page, B);
      await page.goBack();
      await page.waitForFunction(() => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname)
        && !document.querySelector("[data-detail-morph]"));
      await page.evaluate(frame);
      const second = await readMarkers();
      assert.deepEqual(second.map(({ id }) => id), [B], `${locale}: B replaces A without a second marker`);
      assert(second[0].text.includes(locale === "vi" ? "Vừa xem" : "Just viewed"), `${locale}: replacement label`);
      await page.goForward();
      await ready(page, B);
      await page.goBack();
      await page.waitForFunction(() => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname)
        && !document.querySelector("[data-detail-morph]"));
      assert.deepEqual((await readMarkers()).map(({ id }) => id), [B], `${locale}: same-tab history keeps latest marker`);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.TruongThinhMasonry?.getAdapter?.());
      assert.deepEqual(await readMarkers(), [], `${locale}: full reload clears runtime marker`);
      evidence.push({ locale, first, second, afterReload: 0 });
    }
    return evidence;
  });

  await caseRun("m02b-entry-media-and-scroll-back-forward", { width: 1543, height: 884 }, async (page, stage) => {
    const evidence = [];
    for (const locale of ["vi", "en"]) {
      stage(`${locale}-grid-video-Y0`);
      const card = await m02bFixture(page, locale);
      const tile = page.locator(`[data-masonry-card="${mediaCardId}"]`);
      await tile.scrollIntoViewIfNeeded();
      await tile.locator(`[data-masonry-media-select="${mediaVideoId}"]`).click();
      await page.waitForFunction(({ id, mediaId }) => document.querySelector(`[data-masonry-card="${id}"]`)?.dataset.masonryActiveMediaId === mediaId,
        { id: mediaCardId, mediaId: mediaVideoId });
      const preClickY = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
      const initialLength = await page.evaluate(() => history.length);
      await tile.locator(":scope > a").click({ position: { x: 60, y: 20 } }); // avoid the 32px hover arrow area at the canvas edge (media-card R3)
      await page.waitForFunction((id) => (new URL(location.href).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) === id, mediaCardId);
      const y0 = await page.evaluate(() => window.TruongThinhMasonry.getBrowseState().grid.scrollY);
      await page.waitForFunction((id) => document.querySelector(`[data-detail-media-select="${id}"]`)?.getAttribute("aria-current") === "true", mediaVideoId);
      assert.equal(await page.evaluate(() => history.length), initialLength + 1, `${locale}: card creates exactly one history entry`);
      stage(`${locale}-detail-image-Y1`);
      await page.locator(`[data-detail-media-select="${card.coverMediaId}"]`).click();
      await page.waitForFunction((id) => document.querySelector(`[data-detail-media-select="${id}"]`)?.getAttribute("aria-current") === "true", card.coverMediaId);
      // The grid Y comes from the random layout, so choose a detail Y that avoids it.
      const target = Math.abs(y0 - 480) > 150 ? 480 : 0;
      // A newly opened detail builds related across several tasks; before that the page is only as tall as the primary and setLogicalScroll is clamped to the bottom.
      await quiet(page);
      await page.evaluate((y) => window.TruongThinhMotion.setLogicalScroll(y), target);
      await page.waitForFunction((y) => Math.abs(window.TruongThinhMotion.getLogicalScroll() - y) <= 1, target);
      const y1 = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
      assert(Math.abs(y0 - y1) > 100, `${locale}: fixture needs distinct entry scroll positions`);
      assert.equal(await page.evaluate(() => history.length), initialLength + 1, `${locale}: media switch must not push history`);

      stage(`${locale}-Back-grid-detail-media`);
      await page.goBack();
      await page.waitForFunction((y) => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname)
        && document.querySelector("[data-detail-view]").hidden && Math.abs(window.TruongThinhMotion.getLogicalScroll() - y) <= 1, y0)
        .catch(() => {}); // if Y is off, the assert below reports the real value
      await quiet(page);
      await restingScroll(page);
      const backY = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
      assert(Math.abs(backY - y0) <= 1, `${locale}: Back restored grid Y ${backY}, expected ${y0} (pre-click ${preClickY})`);
      const gridMedia = await page.locator(`[data-masonry-card="${mediaCardId}"]`).getAttribute("data-masonry-active-media-id");
      // Back to masonry from the card's own detail: the card stands at the media just viewed in detail (media-card R6, owner 2026-10-18).
      assert.equal(gridMedia, card.coverMediaId, `${locale}: Back shows the media last viewed in the detail`);

      stage(`${locale}-Forward-detail-image`);
      await page.goForward();
      await page.waitForFunction((id) => (new URL(location.href).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) === id, mediaCardId);
      await page.waitForFunction((y) => Math.abs(window.TruongThinhMotion.getLogicalScroll() - y) <= 1, y1).catch(() => {});
      await quiet(page);
      await restingScroll(page);
      const forwardY = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
      assert(Math.abs(forwardY - y1) <= 1, `${locale}: Forward restored detail Y ${forwardY}, expected ${y1}`);
      const activeThumb = await page.locator('[data-detail-media-select][aria-current="true"]').getAttribute("data-detail-media-select");
      assert.equal(activeThumb, card.coverMediaId, `${locale}: Forward restores detail entry media`);
      assert.equal(new URL(page.url()).searchParams.has("media"), false, `${locale}: media identity must not enter URL`);
      assert.equal(await page.evaluate(() => history.length), initialLength + 1, `${locale}: Back/Forward must not add entries`);
      evidence.push({ locale, preClickY, y0, y1, gridMedia, activeThumb, historyLength: initialLength + 1 });
    }
    return evidence;
  });

  for (const profile of [
    { name: "desktop", viewport: { width: 1440, height: 900 }, contextOptions: {} },
    { name: "phone-portrait", viewport: { width: 390, height: 844 }, contextOptions: { isMobile: true, hasTouch: true } },
    { name: "phone-landscape", viewport: { width: 844, height: 390 }, contextOptions: { isMobile: true, hasTouch: true } },
  ].flatMap((profile) => ["vi", "en"].map((locale) => ({ ...profile, locale })))) {
    await caseRun("m02b-related-history-just-viewed-and-scroll", profile.viewport, async (page, stage) => {
      const evidence = [];
      const markerFailures = [];
      const activate = async (link) => {
        const position = await link.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          const headerBottom = document.querySelector("header").getBoundingClientRect().bottom;
          return { x: 20, y: Math.max(rect.top + 20, headerBottom + 20) - rect.top };
        });
        await page.evaluate(() => { window.__ttM02bActivation = null; });
        // A landscape related card is taller than the viewport, so locator.tap() scrolls it into view first;
        // html scroll-behavior makes that smooth, and it still runs when the photo resets scroll one task later.
        if (profile.contextOptions.hasTouch) {
          const box = await link.boundingBox();
          const point = [box.x + position.x, box.y + position.y];
          // Same actionability as tap(): the page's route veil must leave that point.
          await page.waitForFunction(([node, x, y]) => node.contains(document.elementFromPoint(x, y)), [await link.elementHandle(), ...point]);
          await page.touchscreen.tap(...point);
        } else await link.click({ position });
        const activation = await page.waitForFunction(() => window.__ttM02bActivation).then((handle) => handle.jsonValue());
        assert(activation?.trusted, "card activation must reach the trusted click observer");
        return activation;
      };
      const positionCard = async (selector) => {
        // Measure the card while still: the related card still runs placement for 0.4s after the photo opens.
        await page.evaluate((target) => new Promise((resolve, reject) => {
          const deadline = performance.now() + 15_000;
          const check = () => {
            const top = document.querySelector(target)?.getBoundingClientRect().top;
            requestAnimationFrame(() => requestAnimationFrame(() => {
              const node = document.querySelector(target);
              if (node && top === node.getBoundingClientRect().top && !node.getAnimations().length) resolve();
              else if (performance.now() > deadline) reject(new Error(`${target} did not come to rest`));
              else check();
            }));
          };
          check();
        }), selector);
        await page.evaluate((target) => {
          const rect = document.querySelector(target).getBoundingClientRect();
          const top = document.querySelector("header").getBoundingClientRect().bottom + 20;
          const motion = window.TruongThinhMotion;
          motion.setLogicalScroll(motion.getLogicalScroll() + rect.top - top);
        }, selector);
        await page.evaluate(frame);
        await page.waitForFunction((target) => {
          const rect = document.querySelector(target)?.getBoundingClientRect();
          const headerBottom = document.querySelector("header").getBoundingClientRect().bottom;
          return rect && Math.max(rect.top, headerBottom) + 30 < Math.min(rect.bottom, innerHeight);
        }, selector);
      };
      const checkMarker = async (locale, expectedId, grid, label) => {
        const markers = await page.evaluate(() => [...document.querySelectorAll("[data-masonry-just-viewed]")].map((node) => {
          const card = node.closest("[data-masonry-card], [data-masonry-related-card]");
          return { id: card.dataset.masonryCard || card.dataset.masonryRelatedCard,
            grid: card.hasAttribute("data-masonry-related-card") ? "related" : "main",
            hidden: Boolean(node.closest("[hidden]")), text: node.textContent };
        }));
        const expected = expectedId ? [{ id: expectedId, grid, hidden: false, text: locale === "vi" ? "Vừa xem" : "Just viewed" }] : [];
        evidence.push({ locale, label, markers });
        if (JSON.stringify(markers) !== JSON.stringify(expected)) markerFailures.push({ locale, label, expected, markers });
        await page.evaluate((value) => { window.__ttM02bRelatedEvidence = value; }, evidence);
      };
      for (const locale of [profile.locale]) {
        stage(`${profile.name}-${locale}-grid-to-A`);
        // The seed keeps A reachable for related virtualization on desktop, where a short related grid pins some cards.
        await m02bFixture(page, locale, false, "m02b-l");
        await page.evaluate(() => {
          document.addEventListener("click", (event) => {
            const card = event.target.closest("[data-masonry-card], [data-masonry-related-card]");
            if (!card) return;
            window.__ttM02bActivation = { id: card.dataset.masonryCard || card.dataset.masonryRelatedCard,
              y: window.TruongThinhMotion.getLogicalScroll(), nativeY: scrollY, trusted: event.isTrusted };
          }, { capture: true });
        });
        await positionCard(`[data-masonry-card="${mediaCardId}"]`);
        const preClickGridY = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
        const initialLength = await page.evaluate(() => history.length);
        const gridActivation = await activate(page.locator(`[data-masonry-card="${mediaCardId}"] > a`));
        await ready(page, mediaCardId);
        const storedGridY = await page.evaluate(() => window.TruongThinhMasonry.getBrowseState().grid.scrollY);
        const gridY = gridActivation.y;
        assert(Math.abs(storedGridY - gridY) <= 1, `${locale}: stored grid Y must match independent click observer`);
        const nextId = await page.locator("[data-masonry-related-card]").first().getAttribute("data-masonry-related-card");
        assert(nextId && nextId !== mediaCardId, "related fixture needs another card");
        await positionCard(`[data-masonry-related-card="${nextId}"]`);
        const preClickDetailY = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());

        stage(`${profile.name}-${locale}-A-to-B`);
        await armNoGridMorphProbe(page);
        const detailActivation = await activate(page.locator(`[data-masonry-related-card="${nextId}"] > a`));
        const ya = detailActivation.y;
        await ready(page, nextId);
        await noGridMorphEvidence(page, nextId, 0);
        await positionCard(`[data-masonry-related-card="${mediaCardId}"]`);
        const yb = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
        assert(Math.abs(ya - yb) > 1, `${locale}: related history needs distinct YA/YB`);
        await checkMarker(locale, mediaCardId, "related", "A-to-B");

        stage(`${profile.name}-${locale}-Back-A-YA`);
        await armNoGridMorphProbe(page);
        await page.goBack();
        await ready(page, mediaCardId);
        const back = await noGridMorphEvidence(page, mediaCardId, ya);
        await checkMarker(locale, nextId, "related", "Back-A");

        stage(`${profile.name}-${locale}-Forward-B-YB`);
        await armNoGridMorphProbe(page);
        await page.goForward();
        await ready(page, nextId);
        const forward = await noGridMorphEvidence(page, nextId, yb);
        await checkMarker(locale, mediaCardId, "related", "Forward-B");
        evidence.push({ profile: profile.name, locale, nextId, preClickGridY, gridActivation, storedGridY,
          gridY, preClickDetailY, detailActivation, ya, yb, back, forward });
        await page.evaluate((value) => { window.__ttM02bRelatedEvidence = value; }, evidence);
        assert.deepEqual(markerFailures, [], `related marker failures: ${JSON.stringify(markerFailures)}`);
        assert.equal(await page.evaluate(() => history.length), initialLength + 2, `${locale}: related history must not add entries`);
        // Detail sits in the card page path (media-seo R1), the query no longer has any parameter.
        assert.deepEqual([...new URL(page.url()).searchParams.keys()], [], `${locale}: no marker/media URL parameter`);

        stage(`${profile.name}-${locale}-related-virtualization-remount`);
        const away = await page.evaluate(({ id, originY }) => {
          window.TruongThinhMasonry.getAdapter().releasePhoto(id);
          const max = document.documentElement.scrollHeight - innerHeight;
          const target = originY > max / 2 ? 0 : max;
          window.TruongThinhMotion.setLogicalScroll(target);
          return { max, target, originY };
        }, { id: mediaCardId, originY: yb });
        evidence.push({ locale, label: "virtual-away", ...away });
        await page.evaluate((value) => { window.__ttM02bRelatedEvidence = value; }, evidence);
        await page.waitForFunction((id) => !document.querySelector(`[data-masonry-related-card="${id}"]`), mediaCardId);
        await checkMarker(locale, null, "related", "offscreen-unmounted");
        await page.evaluate((y) => window.TruongThinhMotion.setLogicalScroll(y), yb);
        await page.waitForFunction((id) => document.querySelector(`[data-masonry-related-card="${id}"]`), mediaCardId);
        await page.evaluate(frame);
        await checkMarker(locale, mediaCardId, "related", "virtual-remount");
        assert(Math.abs(await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll()) - yb) <= 1, `${locale}: marker remount must not scroll`);

        stage(`${profile.name}-${locale}-Back-main-grid`);
        await page.goBack();
        await ready(page, mediaCardId);
        await armNoGridMorphProbe(page);
        await page.goBack();
        await page.waitForFunction(() => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname));
        await noGridMorphEvidence(page, null, gridY);
        await checkMarker(locale, mediaCardId, "main", "Back-main-grid");
        stage(`${profile.name}-${locale}-reload-clears-marker`);
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => window.TruongThinhMasonry?.getAdapter?.());
        await checkMarker(locale, null, "main", "reload");
        evidence.push({ profile: profile.name, locale, gridY, ya, yb, back, forward,
          emulation: await page.evaluate(() => ({ touchPoints: navigator.maxTouchPoints, coarsePointer: matchMedia("(pointer: coarse)").matches, width: innerWidth, height: innerHeight })) });
      }
      assert.deepEqual(markerFailures, [], `related marker failures: ${JSON.stringify(markerFailures)}`);
      return evidence;
    }, { contextOptions: profile.contextOptions });
  }

  await caseRun("m02b-direct-reload-cover", { width: 390, height: 844 }, async (page, stage) => {
    const evidence = [];
    for (const locale of ["vi", "en"]) {
      stage(`${locale}-direct`);
      const card = await m02bFixture(page, locale, true);
      const selected = () => page.locator('[data-detail-media-select][aria-current="true"]')
        .getAttribute("data-detail-media-select");
      assert.equal(await selected(), card.coverMediaId, `${locale}: direct detail starts authored cover`);
      await page.locator(`[data-detail-media-select="${mediaVideoId}"]`).click();
      await page.waitForFunction((id) => document.querySelector(`[data-detail-media-select="${id}"]`)?.getAttribute("aria-current") === "true", mediaVideoId);
      stage(`${locale}-reload`);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction((id) => document.querySelector(`[data-detail-media-select="${id}"]`)?.getAttribute("aria-current") === "true", card.coverMediaId);
      assert.equal(await selected(), card.coverMediaId, `${locale}: reload resets to cover`);
      assert.equal(new URL(page.url()).searchParams.has("media"), false, `${locale}: direct/reload URL remains card-only`);
      evidence.push({ locale, cover: card.coverMediaId, reload: await selected() });
    }
    return evidence;
  });
  // R7: the tap task only writes history, the next task only paints the primary; the related solver and card mount run afterwards.
  await caseRun("related-tap-defers-related", { width: 412, height: 915 }, async (page) => {
    const visibleRelated = () => [...document.querySelectorAll("[data-masonry-related-card]")].filter((card) => !card.hidden).length;
    await page.goto(href("/vi/advertising-products/?photo=kiosk-posm-10"), { waitUntil: "domcontentloaded" });
    await ready(page, "kiosk-posm-10");
    await page.waitForFunction(visibleRelated);
    const link = page.locator("[data-masonry-related-card] > a").first();
    const nextId = await link.evaluate((node) => node.parentElement.dataset.masonryRelatedCard);
    const tapTask = await link.evaluate(async (node) => {
      const photo = () => document.querySelector("[data-detail-view]").dataset.detailId;
      const before = photo();
      node.click();
      const unchanged = photo() === before;
      await new Promise((resolve) => setTimeout(resolve));
      return { unchanged, photo: photo(),
        visibleRelated: [...document.querySelectorAll("[data-masonry-related-card]")].filter((card) => !card.hidden).length };
    });
    assert.deepEqual(tapTask, { unchanged: true, photo: nextId, visibleRelated: 0 },
      "tap task only records history; the primary task leaves related cards to later tasks");
    await ready(page, nextId);
    await page.waitForFunction(visibleRelated);
    return { nextId, tapTask };
  }, { contextOptions: { isMobile: true, hasTouch: true } });
  await caseRun("related-selected-card-shuffle-cleanup", { width: 1569, height: 912 }, async (page, stage) => {
    const evidence = [];
    for (const scenario of [
      { locale: "en", category: "kiosk-posm", from: "03", to: "02", input: "click", width: 1569 },
      { locale: "vi", category: "signage-raised-letters", from: "02", to: "01", input: "click", width: 1922 },
      { locale: "vi", category: "kiosk-posm", from: "03", to: "02", input: "keyboard", width: 390 },
      { locale: "en", category: "kiosk-posm", from: "03", to: "02", input: "click", width: 390, reduced: true },
    ]) {
      const id = `${scenario.category}-${scenario.to}`;
      stage(`${scenario.locale}-${scenario.width}-${scenario.input}-${scenario.reduced ? "reduced" : "motion"}`);
      await page.setViewportSize({ width: scenario.width, height: 912 });
      await page.emulateMedia({ reducedMotion: scenario.reduced ? "reduce" : "no-preference" });
      await page.goto(href(`/${scenario.locale}/advertising-products/?category=${scenario.category}&photo=${scenario.category}-${scenario.from}`));
      await ready(page, `${scenario.category}-${scenario.from}`);
      const link = page.locator(`[data-masonry-related-card="${id}"] > a`);
      // The related order is seeded and virtualized; scan down then up again until the target card mounts.
      // Each step of 0.6 viewport within two frames is a fast swipe (advertising-masonry R7): the runtime only places temporary cards. Wait
      // for temporary cards in the viewport to be replaced by real cards before judging, otherwise the target card never mounts (red at 390, one long column).
      for (let step = 0, direction = 1; step < 120 && !(await link.count()); step += 1) {
        const moved = await page.evaluate((sign) => {
          const before = window.TruongThinhMotion.getLogicalScroll();
          window.TruongThinhMotion.setLogicalScroll(Math.max(0, before + sign * innerHeight * 0.6));
          return before;
        }, direction);
        await page.evaluate(frame);
        await page.waitForFunction(() => ![...document.querySelectorAll(".masonry-ghost")].some((ghost) => {
          const rect = ghost.getBoundingClientRect();
          return ghost.checkVisibility() && rect.bottom > 0 && rect.top < innerHeight;
        }), null, { timeout: 5_000 });
        if (await page.evaluate((before) => Math.abs(window.TruongThinhMotion.getLogicalScroll() - before) < 1, moved)) direction = -direction;
      }
      // Related still places after the primary is ready (cards go from the column start, the full solver in a later task); headless WebKit
      // is slow so the test may measure midway. Wait for the card to be still for 5 consecutive frames before computing the scroll target.
      await link.evaluate((node) => new Promise((resolve) => {
        let last = NaN;
        let still = 0;
        const tick = () => {
          const top = node.getBoundingClientRect().top + window.TruongThinhMotion.getLogicalScroll();
          still = Math.abs(top - last) < 0.5 && !node.parentElement.getAnimations({ subtree: true }).length ? still + 1 : 0;
          last = top;
          if (still >= 5 || !node.isConnected) resolve(); else requestAnimationFrame(tick);
        };
        tick();
      }));
      // Smooth scroll bypasses native scrollIntoView; move the logical scroll to the card instead.
      await link.evaluate((node) => window.TruongThinhMotion.setLogicalScroll(Math.max(0,
        window.TruongThinhMotion.getLogicalScroll() + node.getBoundingClientRect().top - innerHeight / 3)));
      await restingScroll(page);
      await page.waitForFunction((photoId) => {
        const image = document.querySelector(`[data-masonry-related-card="${photoId}"] img`);
        return image?.complete && image.naturalWidth > 0;
      }, id);
      // The runtime only moves focus when it is in related (spec R7). Safari/WebKit does not focus a link on mouse click,
      // so record at click time (capture, before the runtime handler) whether focus is inside related.
      await page.evaluate(() => addEventListener("click", () => {
        window.__ttFocusInRelatedAtClick = Boolean(document.activeElement?.closest("[data-masonry-related-card]"));
      }, { capture: true, once: true }));
      // Native activation keeps focus on the clicked card, unlike element.click().
      if (scenario.input === "keyboard") {
        await link.focus();
        await link.press("Enter");
      } else await link.click();
      await ready(page, id);
      // Clicking a related card rebuilds related across several tasks (advertising-detail R1): wait for the old card to leave related before counting,
      // and wait for the new related to finish building. If it is still there after 5s the assert below goes red.
      await page.waitForFunction((photoId) => !document.querySelector(`[data-masonry-related-card="${photoId}"]`), id, { timeout: 5_000 })
        .catch(() => {});
      await quiet(page);
      const state = await page.evaluate((photoId) => ({
        clones: document.querySelectorAll("[data-detail-morph]").length,
        staleCards: document.querySelectorAll(`[data-masonry-related-card="${photoId}"]`).length,
        focusInDetail: document.activeElement === document.querySelector("[data-detail-info]"),
        focusInRelatedAtClick: window.__ttFocusInRelatedAtClick,
        focusOnBody: document.activeElement === document.body,
      }), id);
      assert.equal(state.staleCards, 0, `${id}: selected photo remains in shuffled related grid`);
      assert.equal(state.clones, 0, "completed transition must remove its clone");
      if (state.focusInRelatedAtClick) assert.equal(state.focusInDetail, true, "activation must hand focus to the new detail");
      else assert.equal(state.focusOnBody, true, "activation without related focus must not move focus");
      evidence.push({ ...scenario, ...state });
    }
    return evidence;
  });
  await caseRun("viewer-control-affordances", { width: 1329, height: 912 }, async (page, stage) => {
    await page.goto(href("/vi/advertising-products/?category=signage-raised-letters&photo=signage-raised-letters-01"));
    await ready(page, "signage-raised-letters-01");
    await page.locator("[data-detail-expand]").click();
    const controls = Object.fromEntries(["close", "zoom-in", "zoom-out"].map((name) => [name, page.locator(`[data-detail-${name}]`)]));
    // Let the 150 ms background transition finish; a heavily loaded runner may lag more than a fixed wait.
    const read = (control) => control.evaluate(async (node) => {
      await Promise.all(node.getAnimations().map((animation) => animation.finished.catch(() => {})));
      const style = getComputedStyle(node);
      return { background: style.backgroundColor, color: style.color, disabled: node.disabled,
        outline: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth),
        width: node.clientWidth, radius: style.borderRadius };
    });
    const shade = (color) => Number(color.match(/[\d.]+/)[0]);
    const evidence = [];
    const checkDisabled = async (control, enabled) => {
      await page.mouse.move(500, 350);
      await page.evaluate(frame);
      const normal = await read(control);
      assert(normal.disabled, "zoom limit must use native disabled state");
      assert(shade(normal.color) - shade((await read(enabled)).color) >= 60, "disabled icon must be visibly lighter");
      await control.hover();
      await page.evaluate(frame);
      assert.deepEqual(await read(control), normal, "disabled control must not respond to hover");
      evidence.push({ disabled: normal });
    };
    const activate = async (control, label) => {
      stage(label);
      await page.mouse.move(500, 350);
      await page.evaluate(frame);
      const normal = await read(control);
      assert.equal(normal.radius, "0px", "keep square design");
      assert.equal(normal.width, 36, "36px white square (primary-video-player R7)");
      await control.hover();
      await page.evaluate(frame);
      const hovered = await read(control);
      assert(shade(normal.background) - shade(hovered.background) >= 20, `${label}: hover needs clear tonal change ${JSON.stringify({ normal, hovered })}`);
      const bounds = await control.boundingBox();
      assert(bounds, `${label}: control has no pointer target`);
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.mouse.down();
      let pressed = await read(control);
      for (let attempt = 0; attempt < 6 && shade(hovered.background) - shade(pressed.background) < 12; attempt += 1) {
        await page.evaluate(frame);
        pressed = await read(control);
      }
      assert(shade(hovered.background) - shade(pressed.background) >= 12,
        `${label}: press needs distinct feedback ${JSON.stringify({ hovered, pressed })}`);
      await page.mouse.up();
      await page.evaluate(frame);
      evidence.push({ label, normal, hovered, pressed });
    };
    await checkDisabled(controls["zoom-out"], controls["zoom-in"]);
    await activate(controls["zoom-in"], "zoom-to-cover");
    await activate(controls["zoom-in"], "zoom-to-limit");
    await checkDisabled(controls["zoom-in"], controls["zoom-out"]);
    assert.equal(await page.locator("[data-detail-zoom-reset]").count(), 0, "the viewer has no reset button (owner 2026-10-25)");
    await activate(controls["zoom-out"], "zoom-out");
    await page.keyboard.press("Tab");
    const focused = await page.locator(":focus").evaluate((node) => ({ outline: getComputedStyle(node).outlineStyle, width: parseFloat(getComputedStyle(node).outlineWidth) }));
    assert(focused.outline !== "none" && focused.width >= 2, "keyboard focus needs a clear ring");
    await activate(controls.close, "close");
    await page.waitForFunction(() => !document.querySelector("[data-detail-dialog]").open);
    assert.equal(await page.locator("[data-detail-dialog]").evaluate((node) => node.open), false);
    return evidence;
  });

  // L06: on an Android phone in landscape, a right swipe right after zoom-in starting on the backdrop
  // (the image is still at fit size mid animation) closes the viewer immediately on pointerdown.
  await caseRun("viewer-backdrop-swipe-stays-open", { width: 838, height: 331 }, async (page, stage) => {
    const cdp = await page.context().newCDPSession(page);
    const dialogOpen = () => page.evaluate(() => document.querySelector("#detail-dialog").open);
    const touch = async (from, to) => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...from, id: 1 }] });
      for (let step = 1; step <= 9; step++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{
          x: from.x + (to.x - from.x) * step / 9, y: from.y + (to.y - from.y) * step / 9, id: 1 }] });
        await page.evaluate(frame);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      // The viewer closes immediately on pointerdown (state closing); otherwise the zoom finishes and returns to open. Wait for one of the two before reading.
      await page.waitForFunction(() => {
        const dialog = document.querySelector("#detail-dialog");
        return !dialog.open || dialog.dataset.viewerState === "open";
      });
      await page.evaluate(frame);
    };
    const evidence = [];
    for (const locale of ["vi", "en"]) {
      stage(`${locale}-swipe-from-backdrop-mid-zoom`);
      await page.goto(href(`/${locale}/advertising-products/?category=kiosk-posm&photo=kiosk-posm-37`));
      await ready(page, "kiosk-posm-37");
      // A touch screen keeps only the expand button for screen readers (viewer touch R7).
      await page.evaluate(() => document.querySelector("[data-detail-expand]").click());
      await page.waitForFunction(() => document.querySelector("#detail-dialog").dataset.viewerState === "open");
      // Fit on a touch screen touches the top and bottom edges (viewer touch R8): the start point is right of the Fit image,
      // which is the backdrop when the zoom animation has just started and becomes the image when the zoom finishes.
      const x = Math.round(await page.evaluate(() => document.querySelector("[data-detail-expanded-image]").getBoundingClientRect().right) + 20);
      await page.evaluate(() => document.querySelector("[data-detail-zoom-in]").click());
      const target = await page.evaluate((x) => document.elementFromPoint(x, 265)?.matches("[data-detail-viewport]"), x);
      assert(target, "swipe must start on the backdrop while the zoom animation runs");
      await touch({ x, y: 265 }, { x, y: 83 });
      assert(await dialogOpen(), "swipe from the backdrop closed the viewer");
      stage(`${locale}-backdrop-tap-closes`);
      await page.evaluate(() => document.querySelector("[data-detail-zoom-out]").click());
      await page.waitForFunction(() => document.querySelector("#detail-dialog").dataset.viewerState === "open");
      await page.touchscreen.tap(20, 300);
      await page.waitForFunction(() => !document.querySelector("#detail-dialog").open);
      evidence.push({ locale, swipeKeptOpen: true, tapClosed: true });
    }
    return evidence;
  }, { contextOptions: { isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 } });
  await caseRun("p13-position-stuffing-and-remount", { width: 1329, height: 912 }, async (page, stage) => {
    stage("parent-prepaint");
    await installStuffingProbe(page, "[data-masonry-card]", "[data-project-grid]");
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await stuffingSettled(page);
    const parentRecords = await page.evaluate(() => window.__ttP13Stuffing.records);
    const parentStuffing = assertStuffingRecord(parentRecords, "parent stuffing", () => 0);

    stage("cached-remount");
    const firstId = parentStuffing.id;
    // The first layout has 0.4s of motion from the column start; read the origin coordinates after the motion stops.
    await page.waitForFunction((id) => document.querySelector(`[data-masonry-card="${id}"]`)?.getAnimations()
      .every(({ playState }) => playState !== "running"), firstId);
    const initial = await page.locator(`[data-masonry-card="${firstId}"]`).evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const grid = node.closest("[data-project-grid]").getBoundingClientRect();
      return { x: rect.left - grid.left, y: rect.top - grid.top };
    });
    // The presentation order is seeded, so the catalog's last card may sit near the top; scroll to the end instead.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForFunction((id) => !document.querySelector(`[data-masonry-card="${id}"]`), firstId);
    await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id, { focus: false, scrollIntoView: true }), firstId);
    await page.waitForFunction((id) => document.querySelector(`[data-masonry-card="${id}"]`), firstId);
    const remount = await page.locator(`[data-masonry-card="${firstId}"]`).evaluate(async (node) => {
      const read = () => {
        const rect = node.getBoundingClientRect();
        const grid = node.closest("[data-project-grid]").getBoundingClientRect();
        return { left: rect.left - grid.left, top: rect.top - grid.top };
      };
      const first = read();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const second = read();
      return {
        first, second,
        runningAnimations: node.getAnimations().filter((animation) => animation.playState === "running").length,
        domCount: document.querySelectorAll("[data-project-grid] [data-masonry-card]").length,
      };
    });
    assert(Math.abs(remount.first.left - initial.x) <= 1 && Math.abs(remount.first.top - initial.y) <= 1, "cached remount lost its coordinate");
    assert(Math.abs(remount.second.left - remount.first.left) <= 0.1 && Math.abs(remount.second.top - remount.first.top) <= 0.1, "cached remount animated from a column head");
    assert.equal(remount.runningAnimations, 0, "cached remount retained position motion");
    assert(remount.domCount > 0 && remount.domCount < ADVERTISING_CARDS.length, `cached remount DOM is unbounded: ${remount.domCount}`);

    stage("related-prepaint");
    const relatedContext = await browser.newContext({ viewport: { width: 1329, height: 912 }, locale: "vi-VN" });
    const relatedPage = await relatedContext.newPage();
    // A related image decoded before the IntersectionObserver's first entry shows immediately (loading-glass R3), without the R2 fade that
    // this step checks; a busy runner swaps the order of those two events (issue #507). Hold the image until the card carries the skeleton.
    const heldMedia = [];
    let mediaReleased = false;
    const mediaPattern = "**/assets/content/**";
    await relatedPage.route(mediaPattern, (route) => {
      if (mediaReleased || route.request().resourceType() !== "image" || route.request().url().includes(`/${A}-`)) return route.continue();
      heldMedia.push(route);
    });
    await installStuffingProbe(relatedPage, "[data-masonry-related-card]", "[data-detail-related-grid]");
    await installRelatedMediaProbe(relatedPage);
    await relatedPage.goto(href(`/vi/advertising-products/?photo=${A}`), { waitUntil: "domcontentloaded" });
    await ready(relatedPage, A);
    await stuffingSettled(relatedPage);
    const relatedState = await relatedPage.evaluate(() => ({
      records: window.__ttP13Stuffing.records,
      primary: document.querySelector("[data-detail-primary]").getBoundingClientRect().toJSON(),
      gap: Number.parseFloat(getComputedStyle(document.querySelector("[data-detail-view]")).getPropertyValue("--detail-gap")),
    }));
    const relatedStuffing = assertStuffingRecord(relatedState.records, "related stuffing", (_record, first) => first.x < relatedState.primary.width ? relatedState.primary.height + relatedState.gap : 0);
    const initialRelatedIds = new Set(relatedState.records.map(({ id }) => id));
    const initialMediaId = relatedState.records[0]?.id;
    assert(initialMediaId, "initial related window has no media fixture");
    // Smooth scroll bypasses native scrollIntoView; move the logical scroll to the card instead.
    await relatedPage.locator(`[data-masonry-related-card="${initialMediaId}"]`).evaluate((node) => window.TruongThinhMotion.setLogicalScroll(Math.max(0,
      window.TruongThinhMotion.getLogicalScroll() + node.getBoundingClientRect().top - innerHeight / 3)));
    // A related card image waiting to load stays hidden under its Flow frame (progressive-loading R9); when the image arrives it shows through the reveal and the frame is removed.
    await relatedPage.waitForFunction((id) => document.querySelector(`[data-masonry-related-card="${id}"] [data-masonry-loading-skeleton]`), initialMediaId);
    mediaReleased = true;
    await Promise.all(heldMedia.splice(0).map((route) => route.continue()));
    await relatedPage.unroute(mediaPattern);
    await relatedPage.waitForFunction((id) => {
      const card = document.querySelector(`[data-masonry-related-card="${id}"]`);
      return card?.querySelector("img")?.naturalWidth && !card.querySelector("[data-masonry-loading-skeleton]");
    }, initialMediaId);
    const initialMedia = await relatedPage.evaluate((id) => window.__ttP13RelatedMedia.records.find((record) => record.id === id), initialMediaId);
    // Under the Flow frame the image stays hidden; it only fades in during the reveal from that frame, never blurred, and ends opaque.
    assert(initialMedia?.frames.length && initialMedia.frames.every((frame) => !frame.blur && (!frame.fading || frame.skeleton)
      && (!frame.skeleton || frame.fading || frame.opacity <= 0.01 || frame.cover <= 0.01))
      && initialMedia.frames.at(-1).opacity >= 0.99,
      `related initial media shows before its reveal from Flow ${JSON.stringify(initialMedia?.frames.filter((frame) => frame.blur || (frame.fading && !frame.skeleton)
        || (frame.skeleton && !frame.fading && frame.opacity > 0.01 && frame.cover > 0.01)).slice(0, 5).concat(initialMedia?.frames.slice(-1) || []))}`);
    // Framing tags are still supported as deep links after the detail chips were removed.
    await relatedPage.goto(href(`/vi/advertising-products/?photo=${A}&tag=format-portrait`), { waitUntil: "domcontentloaded" });
    await ready(relatedPage, A);
    await stuffingSettled(relatedPage);
    const tagState = await relatedPage.evaluate(() => ({
      records: window.__ttP13Stuffing.records,
      primary: document.querySelector("[data-detail-primary]").getBoundingClientRect().toJSON(),
      gap: Number.parseFloat(getComputedStyle(document.querySelector("[data-detail-view]")).getPropertyValue("--detail-gap")),
    }));
    const tagStuffing = assertStuffingRecord(tagState.records, "tag stuffing", (_record, first) => first.x < tagState.primary.width ? tagState.primary.height + tagState.gap : 0);
    await relatedPage.locator('[data-masonry-suggestion-tag="format-portrait"][aria-pressed="true"]').click();
    await relatedPage.waitForFunction(() => !new URL(location.href).searchParams.has("tag"));
    stage("related-cached-remount");
    // A tag deep link reloads the page with its own related order, so choose among the currently mounted cards.
    // loading-glass R3 only applies to media loaded before leaving the viewport, so wait for a card in the first screen to show its image.
    await relatedPage.waitForFunction(() => [...document.querySelectorAll("[data-masonry-related-card]")]
      .filter((node) => node.getBoundingClientRect().top < innerHeight)
      .every((node) => node.querySelector(".masonry-card__foreground.is-masonry-media-ready")));
    const topWindowIds = await relatedPage.evaluate(() => [...document.querySelectorAll("[data-masonry-related-card]")]
      .filter((node) => node.getBoundingClientRect().top < innerHeight).map((node) => ({ id: node.dataset.masonryRelatedCard })));
    // Native scrollTo races the still-decelerating smooth scroll on desktop, so move the logical position and then leave it alone.
    await relatedPage.evaluate(() => window.TruongThinhMotion.setLogicalScroll(document.documentElement.scrollHeight));
    await restingScroll(relatedPage);
    await relatedPage.waitForFunction((records) => records.some((record) => (
      !document.querySelector(`[data-masonry-related-card="${record.id}"]`)
    )), topWindowIds);
    const remountMedia = await relatedPage.evaluate((records) => records.find((record) => (
      !document.querySelector(`[data-masonry-related-card="${record.id}"]`)
    )) || null, topWindowIds);
    assert(remountMedia, "bottom virtual window retained every top-window card");
    const recordsBeforeRemount = await relatedPage.evaluate((id) => window.__ttP13RelatedMedia.records.filter((record) => record.id === id).length, remountMedia.id);
    await relatedPage.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    await restingScroll(relatedPage);
    await relatedPage.waitForFunction((id) => document.querySelector(`[data-masonry-related-card="${id}"] img`), remountMedia.id);
    await relatedPage.waitForFunction(([id, before]) => window.__ttP13RelatedMedia.records.filter((record) => record.id === id).length > before, [remountMedia.id, recordsBeforeRemount]);
    // Image decode can delay when the fade starts, so wait for the sampled fade to finish instead of a fixed wait.
    await relatedPage.waitForFunction((id) => (window.__ttP13RelatedMedia.records.filter((record) => record.id === id).at(-1)?.frames.at(-1)?.opacity ?? 0) >= 0.99, remountMedia.id);
    const remountedMedia = await relatedPage.evaluate((id) => window.__ttP13RelatedMedia.records.filter((record) => record.id === id).at(-1), remountMedia.id);
    // loading-glass R3: already-loaded media shows directly at final opacity when reattached, without a fade (blank while decoding is fine).
    assert(remountedMedia?.frames.length && remountedMedia.frames.at(-1).opacity >= 0.99
      && remountedMedia.frames.every(({ opacity, fading }) => !fading && (opacity <= 0.05 || opacity >= 0.99)),
      `related cached remount media faded instead of showing at once ${JSON.stringify(remountedMedia)}`);
    const relatedRemount = await relatedPage.locator(`[data-masonry-related-card="${remountMedia.id}"]`).evaluate(async (node) => {
      const first = node.getBoundingClientRect().toJSON();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const second = node.getBoundingClientRect().toJSON();
      return { first, second, positionAnimations: node.getAnimations().filter((animation) => animation.playState === "running").length, domCount: document.querySelectorAll("[data-masonry-related-card]").length };
    });
    assert(Math.abs(relatedRemount.first.left - relatedRemount.second.left) <= 0.1 && Math.abs(relatedRemount.first.top - relatedRemount.second.top) <= 0.1,
      "related cached remount replayed position stuffing");
    assert.equal(relatedRemount.positionAnimations, 0, "related cached remount retained position motion");
    assert(relatedRemount.domCount > 0 && relatedRemount.domCount < ADVERTISING_CARDS.length, `related cached remount DOM is unbounded: ${relatedRemount.domCount}`);
    await relatedContext.close();

    stage("filter-interruption-resize");
    await page.evaluate(() => window.scrollTo(0, 0));
    // Read, click and read again in one task so the assertion measures the seeded first frame,
    // not scroll progress or a transition after the page yields a frame.
    const { beforeFilter, during } = await page.evaluate(() => {
      const visible = () => [...document.querySelectorAll("[data-project-grid] [data-masonry-card]")]
        .filter((node) => !node.hidden).map((node) => ({ id: node.dataset.masonryCard, rect: node.getBoundingClientRect().toJSON() }));
      const beforeFilter = visible();
      // Card order is random by seed so filter by the group of the first mounted card, always leaving a card kept to compare positions.
      const category = document.querySelector("[data-project-grid] [data-masonry-card]:not([hidden])").dataset.masonryCategory;
      document.querySelector(`[data-masonry-filter="${category}"]`).click();
      return { beforeFilter, during: visible() };
    });
    const beforeById = new Map(beforeFilter.map((card) => [card.id, card.rect]));
    const retainedStarts = during.filter((card) => beforeById.has(card.id));
    const retainedDeltas = retainedStarts.map((card) => {
      const before = beforeById.get(card.id);
      return { id: card.id, left: card.rect.left - before.left, top: card.rect.top - before.top };
    });
    assert(retainedStarts.length > 0 && retainedDeltas.every(({ left, top }) => Math.abs(left) <= 1 && Math.abs(top) <= 1),
      `filter layout did not retain the current visual positions at input ${JSON.stringify(retainedDeltas)}`);
    await page.evaluate(() => { window.__ttResized = new Promise((resolve) => addEventListener("resize", resolve, { once: true })); });
    await page.setViewportSize({ width: 844, height: 390 });
    await page.locator('[data-masonry-filter="all"]').click();
    await page.waitForFunction(() => document.querySelector('[data-masonry-filter][aria-current="true"]')?.dataset.masonryFilter === "all");
    // The runtime relayouts at the rAF after resize, and the card's 400ms transition starts the frame after: wait for the resize to arrive and pass three frames
    // before trusting that no motion is about to start.
    await page.evaluate(async () => {
      await window.__ttResized;
      for (let index = 0; index < 3; index += 1) await new Promise(requestAnimationFrame);
    });
    await quiet(page);
    const interrupted = await page.evaluate(() => ({
      activeFilter: document.querySelector('[data-masonry-filter][aria-current="true"]')?.dataset.masonryFilter,
      clones: document.querySelectorAll("[data-detail-morph]").length,
      running: [...document.querySelectorAll("[data-project-grid] [data-masonry-card]")]
        .flatMap((node) => node.getAnimations()).filter((animation) => animation.playState === "running").length,
      domCount: document.querySelectorAll("[data-project-grid] [data-masonry-card]").length,
    }));
    assert(during.length > 0, "filter interruption lost the visible motion cohort");
    assert.equal(interrupted.activeFilter, "all", "latest filter input did not win after resize interruption");
    assert.equal(interrupted.clones, 0, "position interruption leaked a photo clone");
    assert.equal(interrupted.running, 0, "position interruption did not clean up after 400ms");
    assert(interrupted.domCount > 0 && interrupted.domCount < ADVERTISING_CARDS.length, `interrupted cohort is unbounded: ${interrupted.domCount}`);

    stage("reduced-motion");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await ensureParentTarget(page);
    await page.locator(`[data-masonry-card="${A}"] > a`).click();
    await ready(page, A);
    const reduced = await page.evaluate(() => ({
      clones: document.querySelectorAll("[data-detail-morph]").length,
      // Reduced motion cuts every transition to 0.01ms, so the related relayout right after opening is not motion.
      runningTransforms: [...document.querySelectorAll("[data-masonry-card], [data-masonry-related-card]")]
        .flatMap((node) => node.getAnimations()).filter((animation) => animation.playState === "running"
          && Number(animation.effect?.getTiming().duration) > 1).length,
      photo: document.querySelector("[data-detail-view]")?.dataset.detailId,
    }));
    assert.deepEqual(reduced, { clones: 0, runningTransforms: 0, photo: A });
    return { parentStuffing, relatedStuffing, tagStuffing, initialMedia, remountedMedia, relatedRemount, remount, interrupted, reduced };
  });
  await caseRun("morph-frame-identity", { width: 1440, height: 900 }, async (page, stage) => {
    stage("related-click-without-grid-morph");
    await openA(page);
    await page.waitForFunction(() => !document.querySelector("[data-detail-morph]"));
    let relatedY = 0;
    await chooseB(page, async () => {
      // The seeded related order may put B in view at the top; scroll partway so the click starts already scrolled.
      await page.evaluate((id) => {
        if (window.TruongThinhMotion.getLogicalScroll() > 0) return;
        const top = document.querySelector(`[data-masonry-related-card="${id}"]`).getBoundingClientRect().top;
        window.TruongThinhMotion.setLogicalScroll(Math.max(1, Math.floor(top / 2)));
      }, B);
      await page.evaluate(frame);
      relatedY = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
      await armNoGridMorphProbe(page);
    });
    await ready(page, B);
    const detailY = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
    const transition = await noGridMorphEvidence(page, B, detailY);
    assert(relatedY > 0, "related click must start from a scrolled detail");
    assert.equal((new URL(page.url()).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null), B);
    assert.equal(new URL(page.url()).searchParams.get("tag"), "use-sampling");
    const scrollStart = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
    // Locomotive moves one notch per wheel event, scaled by OS (Windows 108 px, Linux 43 px); three notches exceed 100 px.
    for (let notch = 0; notch < 3; notch += 1) await page.mouse.wheel(0, 160);
    await page.waitForFunction((start) => window.TruongThinhMotion.getLogicalScroll() - start >= 100, scrollStart);
    return { relatedY, detailY, transition, scrollAfterWheel: await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll()) };
  });
  await caseRun("viewer-morph-lock-handoff", { width: 1440, height: 900 }, async (page, stage) => {
    stage("viewer-open-morph");
    await openA(page);
    await page.waitForFunction(() => !document.querySelector("[data-detail-morph]"));
    await page.evaluate(() => {
      const motion = window.TruongThinhMotion;
      const lock = motion.lockLogicalScroll;
      const unlock = motion.unlockLogicalScroll;
      const animate = Element.prototype.animate;
      window.__ttViewerProbe = { locks: [], animations: [] };
      motion.lockLogicalScroll = function measuredViewerLock(...args) {
        window.__ttViewerProbe.locks.push({ kind: "lock", at: performance.now() });
        return lock.apply(this, args);
      };
      motion.unlockLogicalScroll = function measuredViewerUnlock(...args) {
        window.__ttViewerProbe.locks.push({ kind: "unlock", at: performance.now() });
        return unlock.apply(this, args);
      };
      Element.prototype.animate = function measuredViewerAnimation(keyframes, options) {
        if (this.matches?.("[data-detail-expanded-image]")) {
          window.__ttViewerProbe.animations.push({
            duration: Number(typeof options === "number" ? options : options?.duration),
            state: document.querySelector("[data-detail-dialog]")?.dataset.viewerState,
          });
        }
        return animate.call(this, keyframes, options);
      };
    });
    const baseline = await page.evaluate(() => [document.body.style.overflow, document.documentElement.style.overflow]);
    await page.locator("[data-detail-expand]").click();
    await page.waitForFunction(() => document.querySelector("[data-detail-dialog]")?.open);
    const opening = await page.evaluate(() => ({
      locks: [document.body.style.overflow, document.documentElement.style.overflow],
      animations: window.__ttViewerProbe.animations,
      focus: document.activeElement?.matches("[data-detail-close]"),
    }));
    assert(opening.locks.includes("hidden"), "viewer open must own document scroll lock");
    assert(opening.animations.some(({ duration, state }) => duration === 300 && state === "opening"),
      "primary to viewer open morph must remain");
    assert.equal(opening.focus, true, "viewer open must focus close control");
    await page.waitForFunction(() => document.querySelector("[data-detail-dialog]")?.dataset.viewerState === "open");

    stage("viewer-close-morph");
    await page.locator("[data-detail-close]").click();
    await page.waitForFunction(() => !document.querySelector("[data-detail-dialog]")?.open);
    const closed = await page.evaluate(() => ({
      locks: [document.body.style.overflow, document.documentElement.style.overflow],
      animations: window.__ttViewerProbe.animations,
      focus: document.activeElement?.matches("[data-detail-expand]"),
      lockEvents: window.__ttViewerProbe.locks,
    }));
    assert(closed.animations.some(({ duration, state }) => duration === 250 && state === "closing"),
      "viewer to primary close morph must remain");
    assert.deepEqual(closed.locks, baseline, "viewer close must release document scroll lock");
    assert.equal(closed.focus, true, "viewer close must return focus to expand control");
    assert.deepEqual(closed.lockEvents.map(({ kind }) => kind), ["lock", "unlock"], "viewer lock handoff");

    stage("reduced-motion-and-error-release");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("[data-detail-expand]").click();
    await page.waitForFunction(() => document.querySelector("[data-detail-dialog]")?.open);
    await page.locator("[data-detail-close]").click();
    await page.waitForFunction(() => !document.querySelector("[data-detail-dialog]")?.open);
    const reduced = await page.evaluate(() => ({
      locks: [document.body.style.overflow, document.documentElement.style.overflow],
      animationCount: window.__ttViewerProbe.animations.length,
    }));
    assert.deepEqual(reduced.locks, baseline, "reduced-motion viewer must release lock");
    assert.equal(reduced.animationCount, 2, "reduced-motion viewer must skip open and close morph");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.locator("[data-detail-expand]").click();
    await page.waitForFunction(() => document.querySelector("[data-detail-dialog]")?.open);
    await page.locator("[data-detail-expanded-image]").evaluate((node) => node.dispatchEvent(new Event("error")));
    await page.waitForFunction(() => !document.querySelector("[data-detail-dialog]")?.open);
    const afterError = await page.evaluate(() => [document.body.style.overflow, document.documentElement.style.overflow]);
    assert.deepEqual(afterError, baseline, "viewer image error must release lock");
    return { opening, closed, reduced, afterError };
  });
  await caseRun("history-back-forward-morph", { width: 1440, height: 900 }, async (page, stage) => {
    stage("detail-A-to-B");
    await openA(page);
    await page.waitForFunction(() => !document.querySelector("[data-detail-morph]"));
    const a = await page.evaluate(() => ({
      seed: window.TruongThinhMasonry.getBrowseState().seed,
      y: window.TruongThinhMotion.getLogicalScroll(),
      gridY: window.TruongThinhMasonry.getBrowseState().grid.scrollY,
      length: history.length,
    }));
    // click() may scroll further when the header covers the related card, so record the Y that the click itself sees.
    await chooseB(page, () => page.evaluate(() => addEventListener("click", () => {
      window.__relatedClickY = window.TruongThinhMotion.getLogicalScroll();
    }, { once: true, capture: true })));
    a.y = await page.evaluate(() => window.__relatedClickY);
    await ready(page, B);
    await page.waitForFunction(() => !document.querySelector("[data-detail-morph]"));
    const b = await page.evaluate(() => ({
      seed: window.TruongThinhMasonry.getBrowseState().seed,
      y: window.TruongThinhMotion.getLogicalScroll(),
      length: history.length,
    }));
    assert.equal(b.seed, a.seed, "detail navigation must preserve seed");
    assert.equal(b.length, a.length + 1, "related card creates one history entry");

    stage("Back-A");
    await armNoGridMorphProbe(page);
    await page.goBack();
    await ready(page, A);
    const back = await noGridMorphEvidence(page, A, a.y);
    assert.equal(await page.evaluate(() => window.TruongThinhMasonry.getBrowseState().seed), a.seed, "Back preserves seed");

    stage("Forward-B");
    await armNoGridMorphProbe(page);
    await page.goForward();
    await ready(page, B);
    const forward = await noGridMorphEvidence(page, B, b.y);

    stage("Back-grid-focus");
    await page.goBack();
    await ready(page, A);
    await armNoGridMorphProbe(page);
    await page.goBack();
    await page.waitForFunction((id) => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname)
      && document.activeElement?.closest("[data-masonry-card]")?.dataset.masonryCard === id, A);
    const grid = await noGridMorphEvidence(page, null, a.gridY);
    assert.equal(await page.evaluate(() => history.length), b.length, "Back/Forward must not add history entries");
    return { a, b, back, forward, grid };
  });
  await caseRun("history-entry-scroll-offscreen-morph", { width: 1543, height: 884 }, async (page, stage) => {
    const evidence = [];
    const networkFailures = [];
    page.on("requestfailed", (request) => {
      // Chromium cancels the fetches of lazy images or videos being replaced (srcset/variant/src change, unmount); not a load error.
      if (["image", "media"].includes(request.resourceType()) && request.failure()?.errorText === "net::ERR_ABORTED") return;
      networkFailures.push({ url: request.url(), error: request.failure()?.errorText });
    });
    page.on("response", (response) => {
      if (response.status() >= 400) networkFailures.push({ url: response.url(), status: response.status() });
    });
    for (const locale of ["en", "vi"]) {
      networkFailures.length = 0;
      stage(locale + "-offscreen-grid-fixture");
      await page.goto(href("/" + locale + "/advertising-products/?category=signage-raised-letters"), { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.TruongThinhMasonry?.getAdapter?.());
      await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
      let initial = null;
      for (const candidate of ADVERTISING_CARDS.filter((card) => card.category === "signage")) {
        await page.evaluate((photoId) => window.TruongThinhMasonry.getAdapter().ensurePhoto(photoId), candidate.id);
        initial = await page.evaluate((photoId) => {
          const card = document.querySelector('[data-masonry-card="' + photoId + '"]');
          return { id: photoId, rect: card?.getBoundingClientRect().toJSON() || null,
            seed: window.TruongThinhMasonry.getBrowseState().seed, length: history.length };
        }, candidate.id);
        if (initial.rect?.top > 884) break;
      }
      assert(initial?.rect?.top > 884, locale + ": no offscreen card after checking category candidates");
      const id = initial.id;
      const link = page.locator('[data-masonry-card="' + id + '"] > a');
      await link.scrollIntoViewIfNeeded();
      await page.waitForFunction((photoId) => {
        const image = document.querySelector('[data-masonry-card="' + photoId + '"] img');
        return image?.complete && image.naturalWidth > 0;
      }, id);
      const clickedY = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
      await link.click();
      await ready(page, id);
      await page.waitForFunction(() => !document.querySelector("[data-detail-morph]"));
      // A newly opened detail builds related across several tasks (advertising-detail R7); before the mount task the page is only as tall as the primary,
      // setLogicalScroll(480) is clamped exactly to that bottom (272px at 1543x884) and does not go back up on its own.
      await page.waitForFunction(() => document.querySelector("[data-masonry-related-card]:not([hidden])"));
      await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(480));
      await page.waitForFunction(() => Math.abs(window.TruongThinhMasonry.getBrowseState().detail.scrollY - 480) <= 1);
      const detailY = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());

      stage(locale + "-grid-Y0");
      await page.goBack();
      await page.waitForFunction(() => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname)
        && !document.querySelector("[data-detail-morph]"));
      await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
      await page.waitForFunction(() => Math.abs(window.TruongThinhMotion.getLogicalScroll()) <= 1);
      const grid = await page.evaluate((photoId) => ({
        y: window.TruongThinhMotion.getLogicalScroll(),
        cardTop: document.querySelector('[data-masonry-card="' + photoId + '"]')?.getBoundingClientRect().top ?? null,
        seed: window.TruongThinhMasonry.getBrowseState().seed,
        category: window.TruongThinhMasonry.getBrowseState().category,
        length: history.length,
      }), id);
      assert(grid.cardTop === null || grid.cardTop > 884, locale + ": grid Y0 must keep card offscreen");
      assert(Math.abs(detailY - grid.y) > 100, locale + ": fixture needs distinct Y0/Y1");

      stage(locale + "-Forward-detail-Y1");
      await armNoGridMorphProbe(page);
      await page.goForward();
      await ready(page, id);
      const forward = await noGridMorphEvidence(page, id, detailY);
      const forwardState = await page.evaluate(() => ({
        seed: window.TruongThinhMasonry.getBrowseState().seed,
        category: window.TruongThinhMasonry.getBrowseState().category,
        length: history.length,
      }));

      stage(locale + "-Back-grid-Y0");
      await armNoGridMorphProbe(page);
      await page.goBack();
      await page.waitForFunction(() => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname));
      const back = await noGridMorphEvidence(page, null, grid.y);
      const backState = await page.evaluate(() => ({
        seed: window.TruongThinhMasonry.getBrowseState().seed,
        category: window.TruongThinhMasonry.getBrowseState().category,
        focusId: window.TruongThinhMasonry.getBrowseState().grid.focusId,
        length: history.length,
      }));
      assert.equal(forwardState.seed, initial.seed, locale + ": Forward changed seed");
      assert.equal(backState.seed, initial.seed, locale + ": Back changed seed");
      assert.equal(forwardState.category, "signage", locale + ": Forward changed category");
      assert.equal(backState.category, "signage", locale + ": Back changed category");
      assert.equal(backState.focusId, id, locale + ": Back lost card focus");
      assert.equal(forwardState.length, initial.length + 1, locale + ": click created wrong history length");
      assert.equal(backState.length, forwardState.length, locale + ": traversal added history entry");
      assert.ok(new URL(page.url()).pathname.startsWith("/" + locale + "/advertising-products/"), locale + ": locale changed");
      assert.deepEqual(networkFailures, [], locale + ": fixture/network failure");
      evidence.push({ locale, clickedY, detailY, grid, forward, back, forwardState, backState, networkFailures: [] });
    }
    return evidence;
  });
  await caseRun("history-pointer-retained-morph", { width: 1440, height: 900 }, async (page, stage) => {
    stage("detail-Back-with-pointer-retained");
    await openA(page);
    await page.waitForFunction(() => !document.querySelector("[data-detail-morph]"));
    // click() may scroll further when the header covers the related card, so record the Y that the click itself sees, like the grid case below.
    await chooseB(page, () => page.evaluate(() => addEventListener("click", () => {
      window.__relatedClickY = window.TruongThinhMotion.getLogicalScroll();
    }, { once: true, capture: true })));
    const aY = await page.evaluate(() => window.__relatedClickY);
    await ready(page, B);
    await page.waitForFunction(() => !document.querySelector("[data-detail-morph]"));
    await armNoGridMorphProbe(page);
    await page.goBack();
    await ready(page, A);
    const back = await noGridMorphEvidence(page, A, aY);
    assert.equal((new URL(page.url()).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null), A, "retained pointer Back reached wrong detail");
    return { aY, back };
  });
  await caseRun("history-grid-pointer-retained-morph", { width: 1440, height: 900 }, async (page, stage) => {
    stage("grid-Back-with-pointer-retained");
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.TruongThinhMasonry?.getAdapter?.());
    const link = page.locator("[data-masonry-card] > a").first();
    const photoId = await link.evaluate((node) => node.closest("[data-masonry-card]").dataset.masonryCard);
    await link.scrollIntoViewIfNeeded();
    // click() may scroll again when the header covers the card, so record the Y that the click itself sees.
    await page.evaluate(() => addEventListener("click", () => {
      window.__gridClickY = window.TruongThinhMotion.getLogicalScroll();
    }, { once: true, capture: true }));
    await link.click();
    const gridY = await page.evaluate(() => window.__gridClickY);
    await ready(page, photoId);
    await page.waitForFunction(() => !document.querySelector("[data-detail-morph]"));
    await armNoGridMorphProbe(page);
    await page.goBack();
    await page.waitForFunction((id) => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname)
      && document.activeElement?.closest("[data-masonry-card]")?.dataset.masonryCard === id, photoId);
    const back = await noGridMorphEvidence(page, null, gridY);
    return { photoId, gridY, back };
  });
  await caseRun("history-grid-scrollbar-resize", { width: 1010, height: 900 }, async (page, stage) => {
    await page.addInitScript(() => {
      addEventListener("DOMContentLoaded", () => {
        const root = document.documentElement;
        const nativeClientWidth = root.clientWidth;
        Object.defineProperty(root, "clientWidth", {
          configurable: true,
          get: () => nativeClientWidth - (document.body.style.overflow === "hidden" ? 0 : 10),
        });
      }, { once: true });
    });
    stage("Back-with-visible-scrollbar");
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.TruongThinhMasonry?.getAdapter?.());
    await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id, { scrollIntoView: true }), A);
    // Scroll as click() would, so the grid position that Back restores is the one read here.
    const gridCard = page.locator('[data-masonry-card="' + A + '"] > a');
    await gridCard.scrollIntoViewIfNeeded();
    const gridY = await restingScroll(page);
    await gridCard.click();
    await ready(page, A);
    await page.waitForFunction(() => !document.querySelector("[data-detail-morph]"));
    const clientWidthBefore = await page.evaluate(() => document.documentElement.clientWidth);
    await armNoGridMorphProbe(page);
    await page.goBack();
    await page.waitForFunction(() => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname));
    const back = await noGridMorphEvidence(page, null, gridY);
    const clientWidthAfter = await page.evaluate(() => document.documentElement.clientWidth);
    assert.equal(clientWidthAfter, clientWidthBefore, "Back must not acquire a grid morph scrollbar lease");

    stage("real-viewport-resize");
    await page.setViewportSize({ width: 1020, height: 900 });
    await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id, { scrollIntoView: true }), A);
    await armNoGridMorphProbe(page);
    await page.locator('[data-masonry-card="' + A + '"] > a').click();
    await ready(page, A);
    const detailY = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
    const resized = await noGridMorphEvidence(page, A, detailY);
    assert.equal((new URL(page.url()).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null), A, "resize changed detail identity");
    return { gridY, clientWidthBefore, clientWidthAfter, back, resized };
  });
  await caseRun("morph-backdrop-lifecycle", { width: 1440, height: 900 }, async (page, stage) => {
    await installBackdropMorphProbe(page);
    const read = async (label) => {
      await quiet(page);
      // An in-place crossfade (loading-glass-and-page-entry R4) may fade the backdrop; it must finish and change only opacity.
      await page.waitForFunction(() => !document.querySelector("[data-detail-background]")?.getAnimations()
        .some(({ playState }) => playState === "pending" || playState === "running"), null, { timeout: 5000 });
      const state = await readBackdropMorphState(page);
      const morphs = state.records.filter((record) => record.kind !== "backdrop"
        || record.keyframes?.some(({ backgroundColor, filter, transform }) => backgroundColor || filter || transform));
      assert.deepEqual(morphs, [], label + ": grid/detail started foreground or backdrop morph");
      assert.equal(state.activeBackdropAnimations, 0, label + ": backdrop animation survived");
      assert.deepEqual(state.locked, ["", ""], label + ": grid/detail retained a scroll lease");
      return { label, photo: state.viewId, hero: state.heroId, activeBackdropAnimations: state.activeBackdropAnimations };
    };
    const evidence = [];
    stage("direct-load-static");
    await page.goto(href("/vi/advertising-products/?photo=" + A), { waitUntil: "domcontentloaded" });
    await ready(page, A);
    evidence.push(await read("direct"));
    stage("reduced-motion-static");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await ensureParentTarget(page);
    await page.locator('[data-masonry-card="' + A + '"] > a').click();
    await ready(page, A);
    evidence.push(await read("reduced"));
    stage("grid-click-static");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await ensureParentTarget(page);
    await page.locator('[data-masonry-card="' + A + '"] > a').click();
    await ready(page, A);
    evidence.push(await read("grid"));
    stage("related-click-static");
    await page.evaluate(() => { window.__ttP4BackdropMorphs.records.length = 0; });
    await chooseB(page);
    await ready(page, B);
    evidence.push(await read("related"));
    stage("history-Back-static");
    await page.evaluate(() => { window.__ttP4BackdropMorphs.records.length = 0; });
    await page.goBack();
    await ready(page, A);
    evidence.push(await read("Back"));
    stage("history-Forward-static");
    await page.evaluate(() => { window.__ttP4BackdropMorphs.records.length = 0; });
    await page.goForward();
    await ready(page, B);
    evidence.push(await read("Forward"));
    return evidence;
  });
  await caseRun("rapid-related-and-back-mid-morph", { width: 1440, height: 900 }, async (page, stage) => {
    stage("related-B-then-immediate-Back");
    await openA(page);
    await page.waitForFunction(() => !document.querySelector("[data-detail-morph]"));
    await chooseB(page, () => armNoGridMorphProbe(page));
    await ready(page, B);
    await page.goBack();
    await ready(page, A);
    await quiet(page);
    const state = await page.evaluate(() => {
      const probe = window.__ttM02bProbe;
      probe.restore();
      return {
        photo: document.querySelector("[data-detail-view]")?.dataset.detailId,
        clonesAdded: probe.clones,
        currentClones: document.querySelectorAll("[data-detail-morph]").length,
        locks: probe.locks,
        currentLocks: [document.body.style.overflow, document.documentElement.style.overflow],
      };
    });
    assert.equal(state.photo, A, "rapid Back must settle at A");
    assert.deepEqual(state.clonesAdded, [], "rapid related/Back created a grid/detail clone");
    assert.equal(state.currentClones, 0, "rapid related/Back retained a clone");
    assert.deepEqual(state.locks, [], "rapid related/Back acquired a scroll lease");
    assert.deepEqual(state.currentLocks, ["", ""], "rapid related/Back retained scroll lock");
    const { beforeWheel, room } = await page.evaluate(() => {
      const y = window.TruongThinhMotion.getLogicalScroll();
      return { beforeWheel: y, room: document.documentElement.scrollHeight - innerHeight - y };
    });
    // Locomotive moves one notch per wheel event, scaled by OS (Windows 108 px, Linux 43 px); three notches exceed 100 px.
    // The related card count is seeded so the page sometimes has under 100 px left to scroll down: then scroll up.
    const direction = room >= 100 ? 1 : -1;
    for (let notch = 0; notch < 3; notch += 1) await page.mouse.wheel(0, 160 * direction);
    await page.waitForFunction(([start, dir]) => (window.TruongThinhMotion.getLogicalScroll() - start) * dir >= 100, [beforeWheel, direction]);
    return { state, beforeWheel, direction, afterWheel: await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll()) };
  });
  await caseRun("delayed-image-resize-latest-wins", { width: 390, height: 844 }, async (page, stage) => {
    stage("open-A"); await openA(page);
    await page.route("**/*mobile-retail-04*.webp", async (route) => { await new Promise((resolve) => setTimeout(resolve, 700)); await route.continue(); });
    stage("B-and-resize"); await chooseB(page); await page.setViewportSize({ width: 1440, height: 900 });
    await ready(page, B); await page.waitForFunction(() => !document.querySelector("[data-detail-morph]"));
    const state = await page.evaluate(snapshot);
    assert.equal(state.hero, B); assert.equal(state.clones.length, 0); assert.deepEqual(state.locked, ["", ""]);
    return state;
  });

  await caseRun("animation-dependency-failure-fail-open", { width: 390, height: 844 }, async (page, stage) => {
    stage("abort-gsap");
    await page.route("**/*gsap*", (route) => route.abort());
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.TruongThinhMasonry?.getAdapter?.()
      && document.querySelectorAll("[data-project-grid] .masonry-card").length > 0);
    const state = await page.evaluate(() => ({ grid: document.querySelectorAll("[data-project-grid] .masonry-card").length, locked: [document.body.style.overflow, document.documentElement.style.overflow] }));
    assert(state.grid > 0, "animation dependency failure did not fail open to a usable grid"); assert.deepEqual(state.locked, ["", ""]);
    return state;
  }, { allowedIssues: ["console:Failed to load resource: net::ERR_FAILED"] });

  await caseRun("active-photo-locale-switch", { width: 390, height: 844 }, async (page, stage) => {
    stage("open-A-tag-B"); await openA(page); await chooseB(page); await ready(page, B);
    const before = await page.evaluate(() => ({ photo: (new URL(location.href).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null), tag: new URL(location.href).searchParams.get("tag"), category: new URL(location.href).searchParams.get("category"), slot: document.querySelector("[data-detail-related-grid]")?.dataset.masonrySuggestionSlot }));
    const switchLocale = async (language) => {
      await page.locator("[data-menu-open]").click();
      await page.waitForFunction(() => document.querySelector("#site-menu")?.open && document.querySelector("#site-menu")?.classList.contains("is-active"));
      await page.locator(`#site-menu [data-language-option="${language}"]`).click();
      // A language change covers the veil like a soft route (site-shell R5); the menu only reopens once the veil is removed.
      await page.waitForFunction((expected) => document.documentElement.lang === expected && !document.querySelector("#site-menu")?.open
        && !document.body.classList.contains("is-transitioning"), language);
      await ready(page, B);
      return page.evaluate(() => ({
        language: document.documentElement.lang,
        photo: (new URL(location.href).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null),
        tag: new URL(location.href).searchParams.get("tag"),
        category: new URL(location.href).searchParams.get("category"),
        slot: document.querySelector("[data-detail-related-grid]")?.dataset.masonrySuggestionSlot,
        hero: document.querySelector("[data-detail-view]")?.dataset.detailId,
        backCount: document.querySelectorAll("[data-detail-return]").length,
      }));
    };
    stage("menu-switch-en"); const en = await switchLocale("en");
    stage("menu-switch-vi"); const vi = await switchLocale("vi");
    for (const state of [en, vi]) {
      assert.deepEqual({ photo: state.photo, tag: state.tag, category: state.category, slot: state.slot }, before);
      assert.equal(state.hero, B);
    }
    assert.equal(en.backCount, 0);
    assert.equal(vi.backCount, 0);
    return { before, en, vi };
  });

  await caseRun("related-suggestions-replace-state", { width: 1440, height: 900 }, async (page, stage) => {
    stage("open-B"); await openA(page); await chooseB(page); await ready(page, B);
    const readSuggestions = () => page.evaluate(() => ({
      hero: document.querySelector("[data-detail-view]")?.dataset.detailId,
      url: location.href,
      historyLength: history.length,
      slot: document.querySelector("[data-detail-related-grid]")?.dataset.masonrySuggestionSlot,
      links: [...document.querySelectorAll("[data-masonry-suggestion-tag]")].map((link) => ({
        tag: link.dataset.masonrySuggestionTag,
        label: link.querySelector(".detail-view__suggestion-label")?.textContent?.trim(),
        objectFit: getComputedStyle(link.querySelector("img")).objectFit,
        href: link.href,
      })),
    }));
    const before = await readSuggestions();
    assert.equal(before.links.length, 4, `suggestion link count ${before.links.length}`);
    for (const link of before.links) {
      assert.equal(link.objectFit, "cover");
      assert.equal(link.label, tagLabels.get(link.tag)?.vi, `VI registry label ${link.tag}`);
    }
    stage("reload-stable"); await page.reload({ waitUntil: "domcontentloaded" }); await ready(page, B);
    const reloaded = await readSuggestions();
    assert.deepEqual({ slot: reloaded.slot, links: reloaded.links.map(({ tag, label }) => ({ tag, label })) }, { slot: before.slot, links: before.links.map(({ tag, label }) => ({ tag, label })) });
    stage("replace-tag"); const expectedTag = before.links[0].tag;
    await page.locator("[data-masonry-suggestion-tag]").first().click();
    await page.waitForFunction((tag) => new URL(location.href).searchParams.get("tag") === tag, expectedTag);
    await ready(page, B);
    const tagged = await readSuggestions();
    assert.equal(tagged.hero, B); assert.equal(tagged.historyLength, reloaded.historyLength);
    assert.equal(new URL(tagged.url).searchParams.get("tag"), expectedTag);
    stage("locale-en"); await page.locator("[data-menu-open]").click();
    await page.waitForFunction(() => document.querySelector("#site-menu")?.open);
    await page.locator('#site-menu [data-language-option="en"]').click();
    await page.waitForFunction(() => document.documentElement.lang === "en"); await ready(page, B);
    const english = await readSuggestions();
    for (const link of english.links) assert.equal(link.label, tagLabels.get(link.tag)?.en, `EN registry label ${link.tag}`);
    assert.equal(english.slot, tagged.slot);
    return { before, reloaded, tagged, english };
  });

  await caseRun("grid-cta-skeleton-flow", { width: 1440, height: 900 }, async (page, stage) => {
    const readCta = () => page.evaluate(() => {
      const grid = document.querySelector("[data-project-grid]");
      const skeleton = document.querySelector("[data-masonry-cta-skeleton]");
      const cta = document.querySelector("[data-masonry-grid-cta]");
      const frames = [...(skeleton?.querySelectorAll("[data-masonry-cta-frame]") || [])];
      const gridRect = grid?.getBoundingClientRect();
      const ctaRect = cta?.getBoundingClientRect();
      const frameStates = frames.map((node) => {
        const rect = node.getBoundingClientRect();
        const surface = node.querySelector(".masonry-grid__cta-surface");
        const flow = node.querySelector("[data-masonry-flow-preset]");
        return {
          column: Number(node.dataset.masonryCtaColumn),
          span: Number(node.dataset.masonryCtaSpan),
          depth: Number(node.dataset.masonryCtaDepth),
          ratioBand: node.dataset.masonryCtaRatioBand,
          height: rect.height,
          left: rect.left - gridRect.left,
          maskImage: getComputedStyle(node).maskImage,
          opacity: Number(getComputedStyle(node).opacity),
          targetOpacity: Number(getComputedStyle(node).getPropertyValue("--masonry-cta-frame-opacity")),
          borderWidth: surface ? getComputedStyle(surface).borderTopWidth : null,
          flowPreset: flow?.dataset.masonryFlowPreset || null,
          flowBackend: flow?.tagName || null,
          inView: rect.bottom > 0 && rect.top < innerHeight,
          flowFilter: flow ? getComputedStyle(flow).filter : null,
          top: rect.top - gridRect.top,
          width: rect.width,
        };
      });
      const visiblePhotos = [...(grid?.querySelectorAll('[role="listitem"][data-masonry-card]') || [])]
        .filter((node) => !node.hidden);
      return {
        columns: Number(skeleton?.dataset.masonryCtaColumns),
        ctaCount: document.querySelectorAll("[data-masonry-grid-cta]").length,
        ctaTop: ctaRect.top - gridRect.top,
        ctaBottom: ctaRect.bottom - gridRect.top,
        realPhotoBottom: Number(skeleton.dataset.masonryCtaRealBottom),
        ctaBackground: getComputedStyle(cta).backgroundColor,
        sameSection: cta.parentElement === grid.parentElement,
        ctaText: cta?.querySelector("h2")?.textContent?.replace(/\s+/g, " ").trim(),
        directChild: skeleton?.parentElement === grid,
        frameStates,
        gridHeight: gridRect?.height || 0,
        hidden: skeleton?.hidden ?? null,
        interactiveDescendants: skeleton?.querySelectorAll("a,button,input,select,textarea,[tabindex]").length ?? -1,
        listItems: visiblePhotos.length,
        photoSetSize: Number(visiblePhotos[0]?.getAttribute("aria-setsize")),
        semanticIntruders: grid?.querySelectorAll('[role="listitem"]:not([data-masonry-card])').length || 0,
        ready: skeleton?.dataset.masonryCtaReady === "true",
        signature: skeleton?.dataset.masonryCtaSignature || null,
        // The arc-shaped Kính on the grid section owns the blur and the white at the edge (glass-surface.md R2-R3).
        skeletonGlass: (({ glass = skeleton?.closest(".masonry-section")?.querySelector(":scope > .glass-surface[data-glass-shape=arc]") }) => glass && {
          hidden: glass.hidden,
          tint: getComputedStyle(glass.querySelector(".glass-surface__tint")).backgroundImage,
          blur: getComputedStyle([...glass.querySelectorAll(".glass-surface__step")].at(-1)).backdropFilter,
        })({}),
        skeletonIsTile: skeleton?.classList.contains("masonry-card") ?? null,
        viewportOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        viewportWidth: innerWidth,
        // The skeleton container clips its frame (overflow hidden), so the paint ends at the container bottom.
        skeletonClipBottom: skeleton && getComputedStyle(skeleton).overflowY !== "visible"
          ? skeleton.getBoundingClientRect().bottom - gridRect.top : Infinity,
      };
    });
    const assertCta = (state, label) => {
      assert.equal(state.ctaCount, 1, `${label}: business CTA count`);
      assert.equal(state.directChild, true, `${label}: skeleton must be a grid child`);
      assert.equal(state.ready, true, `${label}: skeleton geometry not ready`);
      assert.equal(state.hidden, false, `${label}: skeleton hidden in grid`);
      assert.equal(state.skeletonIsTile, false, `${label}: skeleton entered Masonry items`);
      assert.equal(state.interactiveDescendants, 0, `${label}: skeleton entered focus order`);
      // P7.1 replaces the depth cap R11: frame count by the glass boundary, at least one frame per column.
      assert(state.frameStates.length >= state.columns,
        `${label}: skeleton needs a frame in every column: ${state.frameStates.length} frames, ${state.columns} columns`);
      assert.equal(new Set(state.frameStates.map((frame) => frame.column)).size, state.columns, `${label}: incomplete columns`);
      assert(state.listItems > 0 && state.listItems <= state.photoSetSize, `${label}: invalid virtualized product count`);
      assert.equal(state.semanticIntruders, 0, `${label}: skeleton changed product semantics/count`);
      assert(state.viewportOverflow <= 1, `${label}: horizontal overflow ${state.viewportOverflow}px`);
      assert.equal(state.sameSection, true, `${label}: CTA must share the grid section`);
      assert(state.ctaTop > state.realPhotoBottom, `${label}: CTA overlaps real photos`);
      assert(state.ctaBottom <= state.gridHeight + 1, `${label}: CTA leaves the skeleton continuation`);
      assert.equal(state.ctaBackground, "rgba(0, 0, 0, 0)", `${label}: CTA obscures continuation frames`);
      for (let column = 0; column < state.columns; column += 1) {
        const frames = state.frameStates.filter((frame) => frame.column === column).sort((a, b) => a.depth - b.depth);
        // Two-column wide frames (plan T6) are wider than one-column frames: compare widths within the same span.
        assert(frames.every((frame) => Math.abs(frame.width - frames.find(({ span }) => span === frame.span).width) <= 0.1 && frame.height > 0), `${label}: invalid frame geometry in column ${column}`);
        assert(frames.length >= 1
          && frames.every((frame) => Math.abs(frame.targetOpacity - 1) <= 0.01),
        `${label}: frame retained local depth opacity instead of the global boundary fade`);
        // Frames that cover the column count too: a two-column frame sits between two frames of its neighbour column.
        const covering = state.frameStates.filter((frame) => frame.column <= column && column < frame.column + frame.span).sort((a, b) => a.top - b.top);
        assert(covering.slice(1).every((frame, index) => covering[index].ratioBand !== frame.ratioBand),
          `${label}: adjacent skeleton ratio bands repeat in column ${column}`);
        assert(frames.every((frame) => frame.maskImage === "none"), `${label}: frame retained a local fade mask`);
        assert(frames.every((frame) => frame.borderWidth === "0px"), `${label}: skeleton surface retained a border`);
        // Skeleton R3: the frame draws the Flow assignment on first entering the viewport.
        assert(frames.every((frame) => !frame.inView || (frame.flowBackend === "CANVAS" && frame.flowPreset)), `${label}: WebGL Flow canvas or preset is missing`);
        assert(frames.every((frame) => !frame.flowBackend || frame.flowFilter === "none"), `${label}: Flow canvas retained a local blur/filter ${JSON.stringify(frames.map((frame) => frame.flowFilter))}`);
        assert(frames.slice(1).every((frame, index) => frames[index].top < frame.top), `${label}: frame order in column ${column}`);
      }
      assert(state.skeletonGlass?.hidden === false && /radial-gradient/i.test(state.skeletonGlass.tint) && /blur/.test(state.skeletonGlass.blur),
        `${label}: skeleton lacks the arc Kính: ${JSON.stringify(state.skeletonGlass)}`);
      // P7.1: a frame may paint past the logical grid bottom by at most one inter-card gap.
      const gap = state.viewportWidth <= 960 ? 15 : state.viewportWidth <= 1200 ? 25 : 35;
      const overflow = Math.min(state.skeletonClipBottom, Math.max(...state.frameStates.map((frame) => frame.top + frame.height))) - state.gridHeight;
      assert(overflow <= gap + 1, `${label}: skeleton paints ${overflow}px past the grid, more than one ${gap}px gap`);
    };

    const matrix = [];
    for (const locale of ["vi", "en"]) {
      for (const width of [320, 390, 820, 1440]) {
        stage(`matrix-${locale}-${width}`);
        await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
        await page.goto(href(`/${locale}/advertising-products/`), { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaReady === "true");
        const state = await readCta();
        assertCta(state, `${locale}-${width}`);
        assert.equal(state.ctaText, locale === "en" ? "The next mark for your brand" : "Dấu ấn tiếp theo dành cho thương hiệu của bạn");
        matrix.push({ locale, width, columns: state.columns, frames: state.frameStates.length, signature: state.signature });
      }
    }

    stage("filter-resize-recompute");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaReady === "true");
    const initial = await readCta();
    const titleMotion = await page.evaluate(async () => {
      const cta = document.querySelector("[data-masonry-grid-cta]");
      const title = cta.querySelector("h2");
      const lines = [...title.querySelectorAll(".motion-line")];
      const before = lines.map((line) => new DOMMatrixReadOnly(getComputedStyle(line).transform).m42);
      const y = cta.getBoundingClientRect().top + window.TruongThinhMotion.getLogicalScroll() - 160;
      window.TruongThinhMotion.setLogicalScroll(y);
      // Wait for the tween's first frame instead of a fixed 90ms: headless WebKit paints in software at only ~8fps
      // on this page (even with backdrop-filter off), so the first frame can land after 90ms. GSAP targets may be non-Node objects.
      const findTween = () => window.gsap.globalTimeline.getChildren(true, true, false)
        .find((item) => item.targets().some((node) => node instanceof Node && title.contains(node)));
      const started = performance.now();
      while (!(findTween()?.time() > 0) && performance.now() - started < 1000) await new Promise(requestAnimationFrame);
      const tween = findTween();
      return { before, middle: lines.map((line) => new DOMMatrixReadOnly(getComputedStyle(line).transform).m42),
        count: lines.length, duration: tween?.duration(), ease: tween?.vars.ease, stagger: tween?.vars.stagger };
    });
    assert(titleMotion.count > 0 && titleMotion.before[0] > titleMotion.middle[0], "CTA lines did not move on entry");
    assert.equal(titleMotion.ease, "power4.out");
    assert.equal(titleMotion.stagger, 0.1);
    assert(Math.abs(titleMotion.duration - (1.9 + 0.1 * (titleMotion.count - 1))) < 0.01, "CTA line timing differs from shared motion");
    await quiet(page);
    await page.screenshot({ path: path.join(output, "cta-overlay-desktop.png") });
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    await page.evaluate(() => {
      document.querySelector("[data-masonry-cta-frame]").dataset.scrollIdentity = "retained";
      window.dispatchEvent(new Event("scroll"));
    });
    await page.evaluate(frame);
    assert.equal(await page.locator('[data-masonry-cta-frame]').first().getAttribute("data-scroll-identity"), "retained", "scroll rebuilt unchanged skeleton nodes");
    await page.locator('[data-masonry-filter="displays-booths"]').click();
    await page.waitForFunction((signature) => document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaSignature !== signature, initial.signature);
    // The CTA slides 0.4s with the cards to the new place after a filter (owner 10/10); only measure once the slide has finished.
    await page.waitForFunction(() => document.querySelector("[data-masonry-grid-cta]").getAnimations().length === 0);
    const filtered = await readCta();
    assertCta(filtered, "filtered");
    assert.notEqual(filtered.signature, initial.signature, "filter did not recompute CTA skeleton");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction((columns) => Number(document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaColumns) !== columns, filtered.columns);
    await page.waitForFunction(() => document.querySelector("[data-masonry-grid-cta]").getAnimations().length === 0);
    const resized = await readCta();
    assertCta(resized, "resized");

    stage("keyboard-reduced-motion");
    const ctaLink = page.locator("[data-masonry-grid-cta] a");
    await ctaLink.focus();
    assert.equal(await ctaLink.evaluate((node) => document.activeElement === node), true, "CTA link is not keyboard focusable");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaReady === "true");
    const reduced = await page.evaluate(() => {
      const copy = document.querySelector("[data-masonry-grid-cta] .detail-cta__copy");
      const frame = document.querySelector("[data-masonry-cta-frame]");
      return { copyOpacity: getComputedStyle(copy).opacity, frameTransition: getComputedStyle(frame).transitionDuration };
    });
    assert.equal(reduced.copyOpacity, "1", "reduced motion hid CTA copy");
    assert.equal(reduced.frameTransition, "0s", "reduced motion retained skeleton animation");

    stage("detail-cleanup-restore");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id, { scrollIntoView: true }), A);
    await page.locator(`[data-masonry-card="${A}"] > a`).click();
    await ready(page, A);
    // Detail reuses the batch for the end of related (CTA R9): the batch leaves the grid and sits inside the detail canvas.
    assert.deepEqual(await page.evaluate(() => {
      const skeleton = document.querySelector("[data-masonry-cta-skeleton]");
      return { host: skeleton?.dataset.masonryCtaHost, inGrid: Boolean(skeleton?.closest("[data-project-grid]")),
        inCanvas: Boolean(skeleton?.closest("[data-detail-canvas]")) };
    }), { host: "detail", inGrid: false, inCanvas: true }, "detail retained grid CTA skeleton");
    await page.goBack();
    await page.waitForFunction(() => document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaReady === "true");
    const restored = await readCta();
    assertCta(restored, "restored");
    return { matrix, initial, titleMotion, filtered, resized, reduced, restored };
  });

  await caseRun("square-controls-hover-and-return", { width: 1440, height: 900 }, async (page, stage) => {
    const assertNoBack = async () => assert.equal(await page.locator("[data-detail-return]").count(), 0, "standalone Back must be removed");
    stage("parent-no-back");
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.TruongThinhMasonry?.getAdapter?.());
    await assertNoBack();
    stage("open-B"); await openA(page); await chooseB(page); await ready(page, B);
    const expandControl = page.locator("[data-detail-expand]");
    await assertNoBack();

    const compact = await expandControl.evaluate((node) => ({
      expandBorderRadius: getComputedStyle(node).borderRadius,
      expandRect: node.getBoundingClientRect().toJSON(),
    }));
    assert.equal(compact.expandBorderRadius, "0px");
    assert(Math.abs(compact.expandRect.width - 36) <= 0.1 && Math.abs(compact.expandRect.height - 36) <= 0.1);
    stage("hover-labels");
    // Software compositing in CI paints slowly, so wait for the hover transition to end instead of a fixed wait.
    await expandControl.hover();
    await page.evaluate(frame);
    await expandControl.evaluate((node) => Promise.all(node.getAnimations({ subtree: true }).map((animation) => animation.finished)));
    const expandHover = await expandControl.evaluate((node) => ({
      label: node.querySelector("span"),
      rect: node.getBoundingClientRect().toJSON(),
    }));
    // The expand button is icon-only, hover does not expand its text (primary-video-player R7).
    assert.equal(expandHover.label, null, "expand has no text label");
    assert(Math.abs(expandHover.rect.width - compact.expandRect.width) <= 0.1, "hover widened the expand control");
    assert(Math.abs(expandHover.rect.right - compact.expandRect.right) <= 0.1, "expand control moved its right anchor");

    stage("keyboard-and-reduced-motion");
    await page.mouse.move(1200, 300); await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press("Tab"); await expandControl.focus();
    assert.deepEqual(await expandControl.evaluate((node) => ({
      active: document.activeElement === node,
      focusVisible: node.matches(":focus-visible"),
      tabIndex: node.tabIndex,
    })), { active: true, focusVisible: true, tabIndex: 0 });
    await page.evaluate(frame);
    await expandControl.evaluate((node) => Promise.all(node.getAnimations({ subtree: true }).map((animation) => animation.finished)));
    assert(Math.abs(await expandControl.evaluate((node) => node.getBoundingClientRect().width) - 36) <= 0.1,
      "keyboard focus widened the expand control");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const reducedMotion = await expandControl.evaluate((node) => ({ transitionDuration: getComputedStyle(node).transitionDuration }));
    assert.equal(reducedMotion.transitionDuration, "0s");
    await page.emulateMedia({ reducedMotion: "no-preference" });

    stage("viewer-controls"); await expandControl.click();
    await page.waitForFunction(() => document.querySelector("[data-detail-dialog]")?.open);
    await assertNoBack();
    const viewerControls = await page.evaluate(() => [...document.querySelectorAll(
      "[data-detail-close], [data-detail-zoom-in], [data-detail-zoom-out]",
    )].map((node) => ({
      disabled: node.disabled,
      hidden: node.hidden,
      rect: node.getBoundingClientRect().toJSON(),
      radius: getComputedStyle(node).borderRadius,
      stroke: getComputedStyle(node.querySelector("svg")).strokeWidth,
    })));
    for (const control of viewerControls.filter((control) => !control.hidden)) {
      assert(Math.abs(control.rect.width - 36) <= 0.1 && Math.abs(control.rect.height - 36) <= 0.1);
      assert.equal(control.radius, "0px"); assert.equal(control.stroke, "2px");
    }
    const zoomOut = page.locator("[data-detail-zoom-out]");
    const disabledBackground = await zoomOut.evaluate((node) => getComputedStyle(node).backgroundColor);
    await zoomOut.hover(); await page.evaluate(frame); await settleHover(zoomOut);
    assert.equal(await zoomOut.evaluate((node) => getComputedStyle(node).backgroundColor), disabledBackground,
      "disabled zoom-out received active hover treatment");
    const zoomIn = page.locator("[data-detail-zoom-in]");
    const zoomBackground = await zoomIn.evaluate((node) => getComputedStyle(node).backgroundColor);
    await zoomIn.hover(); await page.evaluate(frame); await settleHover(zoomIn);
    assert.notEqual(await zoomIn.evaluate((node) => getComputedStyle(node).backgroundColor), zoomBackground);
    assert.equal(await page.locator("[data-detail-zoom-reset]").count(), 0, "the viewer has no reset button (owner 2026-10-25)");
    await page.locator("[data-detail-close]").click();
    await page.waitForFunction(() => !document.querySelector("[data-detail-dialog]")?.open);
    assert.equal((new URL(page.url()).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null), B, "viewer close left photo detail");
    await assertNoBack();

    stage("browser-back-forward-chain");
    await page.goBack(); await ready(page, A); await assertNoBack();
    await page.goBack();
    await page.waitForFunction((id) => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname)
      && document.activeElement?.closest("[data-masonry-card]")?.dataset.masonryCard === id, A);
    await assertNoBack();
    await page.goForward(); await ready(page, A);
    await page.goForward(); await ready(page, B);

    stage("navbar-return-current-photo");
    await page.locator('[data-site-header] a[href="/vi/advertising-products/"]').click();
    await page.waitForFunction((id) => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname)
      && document.activeElement?.closest("[data-masonry-card]")?.dataset.masonryCard === id, B);
    await assertNoBack();

    stage("direct-photo-navbar-fallback");
    await page.goto(href(`/vi/advertising-products/?photo=${B}`), { waitUntil: "domcontentloaded" });
    await ready(page, B);
    await page.locator('[data-site-header] a[href="/vi/advertising-products/"]').click();
    await page.waitForFunction((id) => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname)
      && document.activeElement?.closest("[data-masonry-card]")?.dataset.masonryCard === id, B);
    assert.equal(new URL(page.url()).search, "", "a direct photo has no picked group and lands on All");
    await assertNoBack();

    stage("different-route-unmount");
    await page.goto(href(`/vi/advertising-products/?photo=${B}`), { waitUntil: "domcontentloaded" });
    await ready(page, B);
    await page.locator('[data-site-header] a[href="/vi/commercial/"]').click();
    await page.waitForFunction(() => document.querySelector('[data-barba="container"]')?.dataset.barbaNamespace === "commercial");
    await assertNoBack();
    return { compact, expandHover, reducedMotion, viewerControls };
  });

  await caseRun("navbar-keeps-picked-group", { width: 1440, height: 900 }, async (page, stage) => {
    const group = ADVERTISING_CARDS.find((card) => card.id === A).category;
    // The URL carries the cluster slug per locale (taxonomy R4).
    const groupSlug = ADVERTISING_CATEGORIES.find((category) => category.slug === group).slugVi;
    const openFromGroup = async () => {
      await page.goto(href(`/vi/advertising-products/?category=${group}`), { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.TruongThinhMasonry?.getAdapter?.());
      // A's saved anchor offset must match across stages: a click under the route veil makes Playwright
      // retry with a different scroll alignment, and html scroll-behavior lets it stop midway while scrolling.
      await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter") && !document.body.classList.contains("is-transitioning"));
      await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id)
        .scrollIntoView({ block: "nearest", behavior: "instant" }), A);
      await page.locator(`[data-masonry-card="${A}"] > a`).click();
      await ready(page, A);
    };
    const navbarReturn = async (focusId) => {
      await page.locator('[data-site-header] a[href="/vi/advertising-products/"]').click();
      await page.waitForFunction((id) => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname)
        && document.activeElement?.closest("[data-masonry-card]")?.dataset.masonryCard === id, focusId);
      assert.equal(new URL(page.url()).pathname, `/vi/advertising-products/${groupSlug}/`, "navbar keeps the picked group in the URL");
      assert.equal(await page.locator('[data-masonry-filter][aria-current="true"]').getAttribute("data-masonry-filter"), group,
        "the picked group stays active on the filter rail");
      const cards = await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-masonry-card]")]
        .map((node) => node.dataset.masonryCard));
      assert(cards.length && cards.every((id) => matchesFilter(ADVERTISING_CARDS.find((card) => card.id === id), group)), `masonry only shows ${group}`);
      return page.evaluate((id) => {
        const rect = document.querySelector(`[data-masonry-card="${id}"]`).getBoundingClientRect();
        return { top: rect.top, height: rect.height };
      }, focusId);
    };

    stage("same-photo-keeps-offset");
    await openFromGroup();
    const origin = await page.evaluate(() => window.TruongThinhMasonry.getBrowseState().grid.anchorOffset);
    const sameTop = await navbarReturn(A);
    assert(Math.abs(sameTop.top - origin) <= 2, `A returns to its old offset: ${sameTop.top} != ${origin}`);

    stage("related-in-group-centered");
    await openFromGroup();
    // Every kiosk-posm image has its main product in A's cluster.
    const inGroup = page.locator(`[data-masonry-related-card^="${A.replace(/-\d+$/, "")}-"] > a`).first();
    const C = await inGroup.evaluate((node) => node.parentElement.dataset.masonryRelatedCard);
    await inGroup.scrollIntoViewIfNeeded();
    await inGroup.click();
    await ready(page, C);
    const centered = await navbarReturn(C);
    assert(Math.abs(centered.top - Math.max(0, (900 - centered.height) / 2)) <= 2, `related photo in the group is centered: ${centered.top}`);

    stage("related-outside-group-returns-to-origin");
    await openFromGroup();
    await chooseB(page);
    await ready(page, B);
    const back = await navbarReturn(A);
    assert(Math.abs(back.top - origin) <= 2, `A returns to its old offset: ${back.top} != ${origin}`);

    stage("direct-photo-lands-on-all");
    await page.goto(href(`/vi/advertising-products/?category=${group}&photo=${A}`), { waitUntil: "domcontentloaded" });
    await ready(page, A);
    await page.locator('[data-site-header] a[href="/vi/advertising-products/"]').click();
    await page.waitForFunction((id) => !/\/p\/[^/]+\/$/.test(new URL(location.href).pathname)
      && document.activeElement?.closest("[data-masonry-card]")?.dataset.masonryCard === id, A);
    assert.equal(new URL(page.url()).search, "", "a direct photo has no picked group and lands on All");
    return { group, origin, C };
  });

  await caseRun("skeleton-global-boundary-fade", { width: 1440, height: 900 }, async (page, stage) => {
    stage("grid-skeleton-only");
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaReady === "true");
    const state = await page.evaluate(() => {
      const skeleton = document.querySelector("[data-masonry-cta-skeleton]");
      const frames = [...document.querySelectorAll("[data-masonry-cta-frame]")];
      const stateOf = (node) => {
        const style = getComputedStyle(node);
        return {
          animationName: style.animationName,
          maskImage: style.maskImage,
          transform: style.transform,
        };
      };
      const glass = skeleton.closest(".masonry-section").querySelector(":scope > .glass-surface[data-glass-shape=arc]");
      return {
        skeleton: stateOf(skeleton),
        glass: glass && { hidden: glass.hidden, tint: getComputedStyle(glass.querySelector(".glass-surface__tint")).backgroundImage },
        frames: frames.map((frame) => ({
          ...stateOf(frame),
          surface: stateOf(frame.querySelector(".masonry-grid__cta-surface")),
        })),
        photoBackdrop: document.querySelector("[data-detail-background]")?.getAnimations().length ?? 0,
      };
    });
    assert(state.glass?.hidden === false && /radial-gradient/i.test(state.glass.tint),
      `skeleton boundary must be the arc Kính on its section: ${JSON.stringify(state.glass)}`);
    assert(state.frames.length > 0, "skeleton fixture has no frames");
    assert(state.frames.every(({ maskImage }) => maskImage === "none"),
      "skeleton frame retained a local mask instead of the global boundary fade");
    assert(state.frames.every(({ surface }) => surface.animationName === "none"),
      "skeleton surface retained motion unrelated to its opacity entry");
    assert.equal(state.photoBackdrop, 0,
      "skeleton-only case must not start a photo morph backdrop animation");
    return state;
  });

} finally { await browser.close(); }

const markdown = [
  "# Báo cáo E2E chuyển cảnh ảnh CP3",
  "",
  `Base: ${baseUrl}`,
  `Generated: ${provenance.generatedAt}.`,
  `Runtime source SHA-256: ${provenance.source.sha256}.`,
  `Generated runtime SHA-256: ${provenance.output.sha256}.`,
  `Evidence machine-readable: ${path.relative(root, resultsPath).replaceAll("\\", "/")}.`,
  "",
  "## Phạm vi và attestation",
  "",
  "- Chỉ chạy runner Playwright mới; không build và không sửa source/runtime.",
  "- Đã áp dụng quy trình test-driven-development và browser-testing-with-devtools; runner dùng Chromium cục bộ, không chiếm phiên trình duyệt của main.",
  "- Các điều kiện chờ dựa trên trạng thái DOM/rAF, sự biến mất clone và ổn định ảnh; độ trễ 700 ms chỉ mô phỏng tải ảnh chậm.",
  "- Locale dùng flow người dùng: mở `data-menu-open`, rồi chọn option trong `#site-menu`; giả định cũ click option khi menu đóng đã bị loại khỏi kết luận.",
  "- Case chặn GSAP cho phép riêng lỗi transport `net::ERR_FAILED` do route chủ động abort; vẫn fail nếu adapter/tile không mount, còn lỗi runtime khác vẫn bị chặn.",
  "",
  "| Case | Status | Evidence |",
  "| --- | --- | --- |",
  ...results.map((result) => `| ${result.name} | ${result.status} | ${result.status === "PASS" ? JSON.stringify(result.evidence).slice(0, 500) : `${result.stage}: ${result.error}` } |`),
  "",
  "## Chú thích thuật ngữ",
  "",
  "- **Provenance**: thông tin truy vết thời điểm chạy và các file runtime được băm.",
  "- **SHA-256**: mã băm dùng để nhận diện chính xác nội dung file.",
].join("\n");
await mkdir(output, { recursive: true });
await writeFile(resultsPath, `${JSON.stringify({ baseUrl, output, provenance, results }, null, 2)}\n`, "utf8");
await writeFile(reportPath, markdown, "utf8");
console.log(JSON.stringify({ reportPath, resultsPath, results }, null, 2));
if (results.some((result) => result.status === "FAIL")) process.exitCode = 1;
