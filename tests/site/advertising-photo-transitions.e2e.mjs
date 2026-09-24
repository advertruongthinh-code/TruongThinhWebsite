import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CARDS } from "../../src/site/advertising-products/catalog.mjs";
import { ADVERTISING_TAG_REGISTRY } from "../../src/site/advertising-products/photo-tags.mjs";

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
    path: "src/site/advertising-products/catalog-runtime.mjs",
    sha256: await sha256(path.join(root, "src/site/advertising-products/catalog-runtime.mjs")),
  },
  output: {
    path: ".site-output/advertising-products/catalog-runtime.mjs",
    sha256: await sha256(path.join(root, ".site-output/advertising-products/catalog-runtime.mjs")),
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
const { chromium } = await import("playwright");
const results = [];
const A = "kiosk-posm-07";
const B = "mobile-retail-04";
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
const tagLabels = new Map(ADVERTISING_TAG_REGISTRY.map((tag) => [tag.id, { vi: tag.labelVi, en: tag.labelEn }]));

const href = (route) => new URL(route, baseUrl).href;
const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const snapshot = () => ({
  url: location.href,
  hero: document.querySelector("[data-advertising-photo-image]")?.dataset.advertisingPhotoId || null,
  heroSrc: document.querySelector("[data-advertising-photo-image]")?.currentSrc || null,
  clones: [...document.querySelectorAll("[data-advertising-photo-morph]")].map((node) => ({ id: node.dataset.advertisingPhotoId, src: node.currentSrc, rect: node.getBoundingClientRect().toJSON() })),
  locked: [document.body.style.overflow, document.documentElement.style.overflow],
});
async function settle(page, predicate, argument) {
  await page.waitForFunction(predicate, argument, { timeout: 8_000 });
  await page.evaluate(frame);
  await page.waitForFunction(predicate, argument, { timeout: 8_000 });
  return page.evaluate(snapshot);
}
async function ready(page, id) {
  await settle(page, (expected) => document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoId === expected && document.querySelector("[data-advertising-photo-image]")?.complete, id);
}
async function openA(page) {
  await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
  await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id, { scrollIntoView: true }), A);
  const card = page.locator(`[data-advertising-card="${A}"] > a`);
  await card.click();
  await ready(page, A);
}
async function chooseB(page, beforeClick) {
  await page.locator('[data-advertising-suggestion-tag="use-sampling"]').click();
  await page.waitForFunction(() => new URL(location.href).searchParams.get("tag") === "use-sampling");
  const link = page.locator(`[data-advertising-related-card="${B}"] > a`);
  await link.waitFor();
  await link.scrollIntoViewIfNeeded();
  await page.waitForFunction((id) => {
    const image = document.querySelector(`[data-advertising-related-card="${id}"] img`);
    return image?.complete && image.naturalWidth > 0 && Boolean(image.currentSrc);
  }, B);
  await beforeClick?.();
  await link.click();
}
async function caseRun(name, viewport, fn, { allowedIssues = [] } = {}) {
  if (p13BaselineOnly || (p13GateOnly && !p13RegressionCases.has(name))) return;
  if (selectedCase && selectedCase !== name) return;
  const context = await browser.newContext({ viewport, locale: "vi-VN" });
  const page = await context.newPage();
  if (p13GateOnly) await installSynchronousHandlerProbe(page);
  const issues = [];
  page.on("pageerror", (error) => issues.push(`pageerror:${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") issues.push(`console:${message.text()}`); });
  let stage = "start";
  try {
    const evidence = await fn(page, (value) => { stage = value; });
    const unexpectedIssues = issues.filter((issue) => !allowedIssues.includes(issue));
    assert.deepEqual(unexpectedIssues, [], `${name}: runtime diagnostics ${unexpectedIssues.join(" | ")}`);
    results.push({ name, viewport, status: "PASS", evidence });
  } catch (error) {
    await mkdir(failureDir, { recursive: true });
    const screenshot = path.join(failureDir, `${name.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`);
    await page.screenshot({ path: screenshot }).catch(() => {});
    const probe = await page.evaluate(() => window.__ttRelatedMorphProbe?.events || null).catch(() => null);
    results.push({ name, viewport, status: "FAIL", stage, error: String(error?.stack || error), screenshot, probe });
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
      photo: document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoId || null,
      photoHidden: document.querySelector("[data-advertising-photo-view]")?.hidden ?? null,
      gridHidden: document.querySelector("[data-project-index]")?.hidden ?? null,
      clone: [...document.querySelectorAll("[data-advertising-photo-morph]")]
        .map((node) => [node.dataset.advertisingPhotoId, getComputedStyle(node).transform, getComputedStyle(node).opacity]),
      bodyPhoto: document.body.classList.contains("is-advertising-photo"),
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
  await page.waitForTimeout(60);
  return page.evaluate(() => {
    const probe = window.__ttP13InputTiming;
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
  await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
  await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id, { scrollIntoView: true }), A);
  await page.waitForFunction((id) => {
    const image = document.querySelector(`[data-advertising-card="${id}"] img`);
    return image?.complete && image.naturalWidth > 0 && Boolean(image.currentSrc);
  }, A);
}

async function prepareRelatedTarget(page) {
  await ready(page, A);
  const tag = page.locator('[data-advertising-suggestion-tag="use-sampling"]');
  if (new URL(page.url()).searchParams.get("tag") !== "use-sampling") await tag.click();
  await page.waitForFunction(() => new URL(location.href).searchParams.get("tag") === "use-sampling");
  const link = page.locator(`[data-advertising-related-card="${B}"] > a`);
  await link.waitFor();
  await link.scrollIntoViewIfNeeded();
  await page.waitForFunction((id) => {
    const image = document.querySelector(`[data-advertising-related-card="${id}"] img`);
    return image?.complete && image.naturalWidth > 0 && Boolean(image.currentSrc);
  }, B);
}

async function measureTransition(page, flow) {
  if (flow === "parent-to-photo") {
    await ensureParentTarget(page);
    const selector = `[data-advertising-card="${A}"] > a`;
    await armInputTimingProbe(page, selector);
    await page.locator(selector).click();
    const timing = await readInputTimingProbe(page);
    await ready(page, A);
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    return timing;
  }
  if (flow === "related-to-photo") {
    await prepareRelatedTarget(page);
    const selector = `[data-advertising-related-card="${B}"] > a`;
    await armInputTimingProbe(page, selector);
    await page.locator(selector).click();
    const timing = await readInputTimingProbe(page);
    await ready(page, B);
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    return timing;
  }
  const selector = 'header .desktop-nav a[href="/vi/advertising-products/"]';
  await ready(page, A);
  await armInputTimingProbe(page, selector);
  await page.locator(selector).click();
  const timing = await readInputTimingProbe(page);
  await page.waitForFunction(() => !new URL(location.href).searchParams.has("photo")
    && document.querySelector("[data-advertising-photo-view]")?.hidden);
  await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
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
        };
      };
      const record = { id: node.dataset.advertisingCard || node.dataset.advertisingRelatedCard, inserted: read(), frames: [] };
      probe.records.push(record);
      const started = performance.now();
      const sample = () => {
        record.frames.push({ elapsed: performance.now() - started, ...read() });
        if (performance.now() - started < 460 && node.isConnected) requestAnimationFrame(sample);
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

async function installMorphEndpointProbe(page) {
  await page.addInitScript(() => {
    const nativeAnimate = Element.prototype.animate;
    window.__ttP13MorphEndpoints = [];
    Element.prototype.animate = function patchedAnimate(keyframes, options) {
      const animation = nativeAnimate.call(this, keyframes, options);
      if (!this.matches?.("[data-advertising-photo-morph]")) return animation;
      const clone = this;
      animation.addEventListener("finish", () => {
        const endpoint = {
          id: clone.dataset.advertisingPhotoId,
          finishedAt: performance.now(),
          cloneRect: clone.getBoundingClientRect().toJSON(),
          transformEnd: getComputedStyle(clone).transform,
        };
        queueMicrotask(() => {
          const target = document.querySelector(`[data-advertising-photo-image][data-advertising-photo-id="${endpoint.id}"]`);
          endpoint.revealedAt = performance.now();
          endpoint.targetRect = target?.getBoundingClientRect().toJSON() || null;
          endpoint.targetVisibility = target ? getComputedStyle(target).visibility : null;
          window.__ttP13MorphEndpoints.push(endpoint);
        });
      }, { once: true });
      return animation;
    };
  });
}

async function installHistoryMorphProbe(page) {
  await page.addInitScript(() => {
    const nativeAnimate = Element.prototype.animate;
    window.__ttHistoryMorphs = [];
    Element.prototype.animate = function measuredHistoryMorph(keyframes, options) {
      const animation = nativeAnimate.call(this, keyframes, options);
      if (!this.matches?.("[data-advertising-photo-morph]")) return animation;
      const clone = this;
      const record = {
        canceledAt: null,
        duration: Number(typeof options === "number" ? options : options?.duration),
        finishedAt: null,
        frames: [],
        id: clone.dataset.advertisingPhotoId,
        clientWidthAtStart: document.documentElement.clientWidth,
        lockedAtStart: [document.body.style.overflow, document.documentElement.style.overflow],
        src: clone.currentSrc || clone.src,
        startedAt: performance.now(),
      };
      window.__ttHistoryMorphs.push(record);
      const sample = () => {
        record.frames.push({
          at: performance.now(),
          clientWidth: document.documentElement.clientWidth,
          connected: clone.isConnected,
          currentTime: Number(animation.currentTime),
          locked: [document.body.style.overflow, document.documentElement.style.overflow],
          rect: clone.getBoundingClientRect().toJSON(),
        });
        if (clone.isConnected && performance.now() - record.startedAt < 1_000) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
      animation.addEventListener("finish", () => {
        record.finishedAt = performance.now();
        record.finishRect = clone.getBoundingClientRect().toJSON();
        const target = [...document.images].find((node) => node !== clone && node.style.visibility === "hidden");
        Object.defineProperty(record, "targetNode", { configurable: true, value: target, writable: true });
        record.targetId = target?.dataset.advertisingPhotoId
          || target?.closest("[data-advertising-card]")?.dataset.advertisingCard
          || target?.closest("[data-advertising-related-card]")?.dataset.advertisingRelatedCard;
        record.targetRect = target?.getBoundingClientRect().toJSON() || null;
        queueMicrotask(() => {
          record.targetVisibility = target ? getComputedStyle(target).visibility : null;
          record.targetRectAfterSettle = target?.getBoundingClientRect().toJSON() || null;
          record.lockedAfterSettle = [document.body.style.overflow, document.documentElement.style.overflow];
        });
      }, { once: true });
      animation.addEventListener("cancel", () => { record.canceledAt = performance.now(); }, { once: true });
      return animation;
    };
  });
}

async function installBackdropMorphProbe(page) {
  await page.addInitScript(() => {
    const nativeAnimate = Element.prototype.animate;
    window.__ttP4BackdropMorphs = { records: [] };
    Element.prototype.animate = function measuredBackdropMorph(keyframes, options) {
      const animation = nativeAnimate.call(this, keyframes, options);
      const kind = this.matches?.("[data-advertising-photo-background]")
        ? "backdrop"
        : this.matches?.("[data-advertising-photo-morph]") ? "morph" : null;
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
        nodePhotoId: this.dataset.advertisingPhotoId || null,
        photoId: document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoId || null,
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
    const backdrop = document.querySelector("[data-advertising-photo-background]");
    const hero = document.querySelector("[data-advertising-photo-image]");
    const heroFrame = hero?.closest(".advertising-photo-view__hero-frame");
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
      heroId: hero?.dataset.advertisingPhotoId || null,
      heroFrameBackground: heroFrame ? getComputedStyle(heroFrame).backgroundColor : null,
      heroSrc: hero?.currentSrc || hero?.src || null,
      locked: [document.body.style.overflow, document.documentElement.style.overflow],
      records: (window.__ttP4BackdropMorphs?.records || []).map((record) => ({ ...record })),
      scrollY: window.scrollY,
      viewId: document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoId || null,
    };
  });
}

function assertSequentialBackdrop({ during, foregroundSettled, lingerMidpoint, lingerFinished, scrollDuringLinger }, { duration, label, targetId }) {
  const backdropStart = during.records.find((record) => record.kind === "backdrop" && record.photoId === targetId);
  const morphStart = during.records.find((record) => record.kind === "morph");
  assert(backdropStart, `${label}: real morph did not start a backdrop animation`);
  assert(morphStart, `${label}: fixture did not create a real photo morph`);
  assert(morphStart.finishedAt && backdropStart.startedAt >= morphStart.finishedAt,
    `${label}: backdrop must wait for foreground settle ${JSON.stringify({ backdropStart, morphStart })}`);
  assert.equal(morphStart.duration, duration, `${label}: foreground duration`);
  assert.equal(backdropStart.duration, 1200, `${label}: long settling zoom-out`);
  assert.equal(Number(backdropStart.keyframes[0].opacity), 0, `${label}: backdrop fades in from white`);
  assert.equal(foregroundSettled.viewId, targetId, `${label}: foreground settled wrong detail identity`);
  assert.equal(foregroundSettled.heroId, targetId, `${label}: foreground settled wrong hero identity`);
  assert.equal(foregroundSettled.backdropSrc, foregroundSettled.heroSrc, `${label}: backdrop retained wrong photo at foreground settle`);
  assert.equal(foregroundSettled.activeBackdropAnimations, 1,
    `${label}: backdrop did not linger after foreground settle ${JSON.stringify(foregroundSettled.records)}`);
  assert.deepEqual(foregroundSettled.locked, ["", ""], `${label}: foreground settle did not release scroll lease`);
  assert(scrollDuringLinger.after > scrollDuringLinger.before,
    `${label}: user could not scroll during backdrop linger ${JSON.stringify(scrollDuringLinger)}`);
  assert.notDeepEqual(lingerMidpoint.backdropStyle, foregroundSettled.backdropStyle,
    `${label}: backdrop did not continue zoom-blur during linger`);
  assert.notEqual(lingerMidpoint.backdropStyle.transform, foregroundSettled.backdropStyle.transform,
    `${label}: lingering zoom-out must remain visible after opacity settles`);
  assert.equal(lingerFinished.activeBackdropAnimations, 0, `${label}: backdrop survived its duration`);
  assert.equal(lingerFinished.viewId, targetId, `${label}: final detail identity`);
  assert.equal(lingerFinished.heroId, targetId, `${label}: final hero identity`);
  assert.equal(lingerFinished.backdropSrc, lingerFinished.heroSrc, `${label}: backdrop retained wrong photo`);
}

function assertHistoryMorph(record, { id, src }, label) {
  assert(record, `${label}: history morph was not created`);
  assert.equal(record.id, id, `${label}: clone identity`);
  assert.equal(record.src, src, `${label}: clone source`);
  assert.equal(record.duration, 400, `${label}: duration`);
  assert.equal(record.canceledAt, null, `${label}: morph was canceled`);
  assert(record.finishedAt - record.startedAt >= 200, `${label}: morph ended before its midpoint`);
  assert(record.frames.length > 2, `${label}: morph did not survive more than one frame`);
  assert(record.frames.some(({ currentTime }) => currentTime > 60 && currentTime < 260),
    `${label}: no animated midpoint ${JSON.stringify(record.frames.map(({ currentTime, connected }) => ({ currentTime, connected })))}`);
  assert.deepEqual(record.lockedAtStart, ["hidden", "hidden"], `${label}: scroll was not locked at start`);
  assert(record.frames.filter(({ currentTime }) => currentTime < 260)
    .every(({ locked }) => locked[0] === "hidden" && locked[1] === "hidden"), `${label}: scroll unlocked before settle`);
  assert.equal(record.targetId, id, `${label}: destination identity`);
  assert.equal(record.targetVisibility, "visible", `${label}: destination stayed hidden`);
  assert.deepEqual(record.lockedAfterSettle, ["", ""], `${label}: scroll lease was not released`);
  const endpointDelta = ["left", "top", "width", "height"]
    .map((key) => record.finishRect[key] - record.targetRectAfterSettle[key]);
  assert(endpointDelta.every((delta) => Math.abs(delta) <= 2), `${label}: endpoint mismatch ${JSON.stringify({
    endpointDelta,
    finishRect: record.finishRect,
    targetRect: record.targetRect,
    targetRectAfterSettle: record.targetRectAfterSettle,
  })}`);
}

async function completedHistoryMorph(page, index) {
  await page.waitForFunction((position) => {
    const record = window.__ttHistoryMorphs?.[position];
    return record && (record.finishedAt || record.canceledAt);
  }, index);
  await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
  return page.evaluate((position) => {
    const record = window.__ttHistoryMorphs[position];
    const identity = (node) => node.dataset.advertisingPhotoId
      || node.closest("[data-advertising-card]")?.dataset.advertisingCard
      || node.closest("[data-advertising-related-card]")?.dataset.advertisingRelatedCard;
    const target = record.targetNode?.isConnected ? record.targetNode : [...document.images]
      .filter((node) => identity(node) === record.targetId)
      .map((node) => ({ node, rect: node.getBoundingClientRect() }))
      .sort((left, right) => Math.abs(left.rect.left - record.targetRect.left)
        + Math.abs(left.rect.top - record.targetRect.top)
        - Math.abs(right.rect.left - record.targetRect.left)
        - Math.abs(right.rect.top - record.targetRect.top))[0]?.node;
    record.targetVisibility = target ? getComputedStyle(target).visibility : null;
    record.targetRectAfterSettle = target?.getBoundingClientRect().toJSON() || null;
    record.lockedAfterSettle = [document.body.style.overflow, document.documentElement.style.overflow];
    record.clientWidthAfterSettle = document.documentElement.clientWidth;
    return record;
  }, index);
}

async function installRelatedMediaProbe(page) {
  await page.addInitScript(() => {
    const probe = { records: [] };
    const capture = (image) => {
      const card = image.closest("[data-advertising-related-card]");
      if (!card || image.dataset.p13MediaObserved) return;
      image.dataset.p13MediaObserved = "true";
      const record = { id: card.dataset.advertisingRelatedCard, frames: [] };
      probe.records.push(record);
      const started = performance.now();
      const sample = () => {
        const style = getComputedStyle(image);
        record.frames.push({
          elapsed: performance.now() - started,
          opacity: Number(style.opacity),
          duration: style.transitionDuration,
          easing: style.transitionTimingFunction,
        });
        if (performance.now() - started < 3_000 && image.isConnected) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    };
    new MutationObserver((entries) => entries.forEach((entry) => entry.addedNodes.forEach((added) => {
      if (!(added instanceof Element)) return;
      if (added.matches("[data-advertising-related-card] img")) capture(added);
      added.querySelectorAll("[data-advertising-related-card] img").forEach(capture);
    }))).observe(document, { childList: true, subtree: true });
    window.__ttP13RelatedMedia = probe;
  });
}

function assertMediaFade(record, label) {
  assert(record?.frames.length > 3, `${label}: media fade was not sampled`);
  const first = record.frames[0];
  const middle = record.frames.find(({ opacity }) => opacity > 0.05 && opacity < 0.95);
  const last = record.frames.at(-1);
  assert(first.opacity <= 0.05 && middle?.opacity > first.opacity && middle.opacity < 1 && last.opacity >= 0.99,
    `${label}: opacity did not travel 0 to 1 ${JSON.stringify({ first, middle, last })}`);
  assert(first.duration.split(",").includes("0.6s") && first.easing.split(",").includes("ease-out"),
    `${label}: media timing differs from 0.6s ease-out ${JSON.stringify(first)}`);
  return { id: record.id, first, middle, last };
}

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
  assert(middle && Math.abs(middle.y - first.y) > 1 && Math.abs(last.y - middle.y) > 1,
    `${label}: missing visible 400ms travel ${JSON.stringify({ first, middle, last, frames: moved.frames.length })}`);
  assert(first.duration.split(",").includes("0.4s"), `${label}: duration is ${first.duration}`);
  assert(first.delay.split(",").every((value) => value === "0s"), `${label}: transition has delay ${first.delay}`);
  assert(first.easing.split(",").includes("ease"), `${label}: easing is ${first.easing}`);
  return { id: moved.id, first, middle, last };
}

const browser = await chromium.launch({ headless: true });
try {
  if (p13BaselineOnly) await runP13Baseline(browser);
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
      const link = page.locator(`[data-advertising-related-card="${id}"] > a`);
      await link.scrollIntoViewIfNeeded();
      await page.waitForFunction((photoId) => {
        const image = document.querySelector(`[data-advertising-related-card="${photoId}"] img`);
        return image?.complete && image.naturalWidth > 0;
      }, id);
      // Native activation retains focus on the clicked card, unlike element.click().
      if (scenario.input === "keyboard") {
        await link.focus();
        await link.press("Enter");
      } else await link.click();
      await ready(page, id);
      await page.waitForTimeout(650);
      const state = await page.evaluate((photoId) => ({
        clones: document.querySelectorAll("[data-advertising-photo-morph]").length,
        staleCards: document.querySelectorAll(`[data-advertising-related-card="${photoId}"]`).length,
        focusInDetail: document.activeElement === document.querySelector("[data-advertising-photo-info]"),
      }), id);
      assert.equal(state.staleCards, 0, `${id}: selected photo remains in shuffled related grid`);
      assert.equal(state.clones, 0, "completed transition must remove its clone");
      assert.equal(state.focusInDetail, true, "activation must hand focus to the new detail");
      evidence.push({ ...scenario, ...state });
    }
    return evidence;
  });
  await caseRun("viewer-control-affordances", { width: 1329, height: 912 }, async (page, stage) => {
    await page.goto(href("/vi/advertising-products/?category=signage-raised-letters&photo=signage-raised-letters-01"));
    await ready(page, "signage-raised-letters-01");
    await page.locator("[data-advertising-photo-expand]").click();
    const controls = Object.fromEntries(["close", "zoom-in", "zoom-out", "zoom-reset"].map((name) => [name, page.locator(`[data-advertising-photo-${name}]`)]));
    const read = (control) => control.evaluate((node) => {
      const style = getComputedStyle(node);
      return { background: style.backgroundColor, color: style.color, disabled: node.disabled,
        outline: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth),
        width: node.clientWidth, radius: style.borderRadius };
    });
    const shade = (color) => Number(color.match(/[\d.]+/)[0]);
    const evidence = [];
    const checkDisabled = async (control, enabled) => {
      await page.mouse.move(500, 350);
      await page.waitForTimeout(180);
      const normal = await read(control);
      assert(normal.disabled, "zoom limit must use native disabled state");
      assert(shade(normal.color) - shade((await read(enabled)).color) >= 60, "disabled icon must be visibly lighter");
      await control.hover();
      await page.waitForTimeout(180);
      assert.deepEqual(await read(control), normal, "disabled control must not respond to hover");
      evidence.push({ disabled: normal });
    };
    const activate = async (control, label) => {
      stage(label);
      await page.mouse.move(500, 350);
      await page.waitForTimeout(180);
      const normal = await read(control);
      assert.equal(normal.radius, "0px", "keep square design");
      assert(normal.width >= 44, "keep usable hit target");
      await control.hover();
      await page.waitForTimeout(180);
      const hovered = await read(control);
      assert(shade(normal.background) - shade(hovered.background) >= 20, `${label}: hover needs clear tonal change`);
      const bounds = await control.boundingBox();
      assert(bounds, `${label}: control has no pointer target`);
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.mouse.down();
      let pressed = await read(control);
      for (let attempt = 0; attempt < 6 && shade(hovered.background) - shade(pressed.background) < 12; attempt += 1) {
        await page.waitForTimeout(100);
        pressed = await read(control);
      }
      assert(shade(hovered.background) - shade(pressed.background) >= 12,
        `${label}: press needs distinct feedback ${JSON.stringify({ hovered, pressed })}`);
      await page.mouse.up();
      await page.waitForTimeout(250);
      evidence.push({ label, normal, hovered, pressed });
    };
    await checkDisabled(controls["zoom-out"], controls["zoom-in"]);
    await activate(controls["zoom-in"], "zoom-to-cover");
    await activate(controls["zoom-in"], "zoom-to-limit");
    await checkDisabled(controls["zoom-in"], controls["zoom-out"]);
    assert(await controls["zoom-reset"].isVisible(), "reset must appear at maximum zoom");
    await activate(controls["zoom-reset"], "reset");
    await page.keyboard.press("Tab");
    const focused = await page.locator(":focus").evaluate((node) => ({ outline: getComputedStyle(node).outlineStyle, width: parseFloat(getComputedStyle(node).outlineWidth) }));
    assert(focused.outline !== "none" && focused.width >= 2, "keyboard focus needs a clear ring");
    await activate(controls.close, "close");
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-dialog]").open);
    assert.equal(await page.locator("[data-advertising-photo-dialog]").evaluate((node) => node.open), false);
    return evidence;
  });
  await caseRun("p13-position-stuffing-and-remount", { width: 1329, height: 912 }, async (page, stage) => {
    stage("parent-prepaint");
    await installStuffingProbe(page, "[data-advertising-card]", "[data-project-grid]");
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(520);
    const parentRecords = await page.evaluate(() => window.__ttP13Stuffing.records);
    const parentStuffing = assertStuffingRecord(parentRecords, "parent stuffing", () => 0);

    stage("cached-remount");
    const firstId = parentStuffing.id;
    const farId = ADVERTISING_CARDS.at(-1).id;
    const initial = await page.locator(`[data-advertising-card="${firstId}"]`).evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const grid = node.closest("[data-project-grid]").getBoundingClientRect();
      return { x: rect.left - grid.left, y: rect.top - grid.top };
    });
    await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id, { focus: false, scrollIntoView: true }), farId);
    await page.waitForFunction((id) => !document.querySelector(`[data-advertising-card="${id}"]`), firstId);
    await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id, { focus: false, scrollIntoView: true }), firstId);
    await page.waitForFunction((id) => document.querySelector(`[data-advertising-card="${id}"]`), firstId);
    const remount = await page.locator(`[data-advertising-card="${firstId}"]`).evaluate(async (node) => {
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
        domCount: document.querySelectorAll("[data-project-grid] [data-advertising-card]").length,
      };
    });
    assert(Math.abs(remount.first.left - initial.x) <= 1 && Math.abs(remount.first.top - initial.y) <= 1, "cached remount lost its coordinate");
    assert(Math.abs(remount.second.left - remount.first.left) <= 0.1 && Math.abs(remount.second.top - remount.first.top) <= 0.1, "cached remount animated from a column head");
    assert.equal(remount.runningAnimations, 0, "cached remount retained position motion");
    assert(remount.domCount > 0 && remount.domCount < ADVERTISING_CARDS.length, `cached remount DOM is unbounded: ${remount.domCount}`);

    stage("related-prepaint");
    const relatedContext = await browser.newContext({ viewport: { width: 1329, height: 912 }, locale: "vi-VN" });
    const relatedPage = await relatedContext.newPage();
    await installStuffingProbe(relatedPage, "[data-advertising-related-card]", "[data-advertising-photo-related-grid]");
    await installRelatedMediaProbe(relatedPage);
    await relatedPage.goto(href(`/vi/advertising-products/?photo=${A}`), { waitUntil: "domcontentloaded" });
    await ready(relatedPage, A);
    await relatedPage.waitForTimeout(750);
    const relatedState = await relatedPage.evaluate(() => ({
      records: window.__ttP13Stuffing.records,
      primary: document.querySelector("[data-advertising-photo-primary]").getBoundingClientRect().toJSON(),
      gap: Number.parseFloat(getComputedStyle(document.querySelector("[data-advertising-photo-view]")).getPropertyValue("--advertising-photo-gap")),
    }));
    const relatedStuffing = assertStuffingRecord(relatedState.records, "related stuffing", (_record, first) => first.x < relatedState.primary.width ? relatedState.primary.height + relatedState.gap : 0);
    const initialRelatedIds = new Set(relatedState.records.map(({ id }) => id));
    const initialMediaId = relatedState.records[0]?.id;
    assert(initialMediaId, "initial related window has no media fixture");
    await relatedPage.locator(`[data-advertising-related-card="${initialMediaId}"]`).scrollIntoViewIfNeeded();
    await relatedPage.waitForFunction((id) => document.querySelector(`[data-advertising-related-card="${id}"] img`)?.classList.contains("is-advertising-media-ready"), initialMediaId);
    await relatedPage.waitForTimeout(650);
    const initialMediaRecords = await relatedPage.evaluate(() => window.__ttP13RelatedMedia.records);
    const completedInitialMediaRecords = initialMediaRecords.filter((record) => (
      initialRelatedIds.has(record.id)
      && record.frames[0]?.opacity <= 0.05
      && record.frames.at(-1)?.opacity >= 0.99
    ));
    const completedInitialMedia = completedInitialMediaRecords.find((record) => record.id === initialMediaId);
    assert(completedInitialMedia, `related initial media never reached opacity 1 ${JSON.stringify(initialMediaRecords.map((record) => ({ id: record.id, first: record.frames[0], last: record.frames.at(-1) })))}`);
    const initialMedia = assertMediaFade(completedInitialMedia, "related initial media");
    // Framing tags remain supported as deep links after the detail chips were removed.
    await relatedPage.goto(href(`/vi/advertising-products/?photo=${A}&tag=format-portrait`), { waitUntil: "domcontentloaded" });
    await ready(relatedPage, A);
    await relatedPage.waitForTimeout(420);
    const tagState = await relatedPage.evaluate(() => ({
      records: window.__ttP13Stuffing.records,
      primary: document.querySelector("[data-advertising-photo-primary]").getBoundingClientRect().toJSON(),
      gap: Number.parseFloat(getComputedStyle(document.querySelector("[data-advertising-photo-view]")).getPropertyValue("--advertising-photo-gap")),
    }));
    const tagStuffing = assertStuffingRecord(tagState.records, "tag stuffing", (_record, first) => first.x < tagState.primary.width ? tagState.primary.height + tagState.gap : 0);
    await relatedPage.locator('[data-advertising-suggestion-tag="format-portrait"][aria-pressed="true"]').click();
    await relatedPage.waitForFunction(() => !new URL(location.href).searchParams.has("tag"));
    stage("related-cached-remount");
    await relatedPage.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await relatedPage.waitForFunction((records) => records.some((record) => (
      !document.querySelector(`[data-advertising-related-card="${record.id}"]`)
    )), completedInitialMediaRecords);
    const remountMedia = await relatedPage.evaluate((records) => records.find((record) => (
      !document.querySelector(`[data-advertising-related-card="${record.id}"]`)
    )) || null, completedInitialMediaRecords);
    assert(remountMedia, "bottom virtual window retained every completed portrait fixture");
    await relatedPage.evaluate(() => window.scrollTo(0, 0));
    await relatedPage.waitForFunction((id) => document.querySelector(`[data-advertising-related-card="${id}"] img`), remountMedia.id);
    await relatedPage.waitForFunction((id) => window.__ttP13RelatedMedia.records.filter((record) => record.id === id).length >= 2, remountMedia.id);
    await relatedPage.waitForTimeout(700);
    const remountedMediaRecord = await relatedPage.evaluate((id) => window.__ttP13RelatedMedia.records.filter((record) => record.id === id).at(-1), remountMedia.id);
    const remountedMedia = assertMediaFade(remountedMediaRecord, "related cached remount media");
    const relatedRemount = await relatedPage.locator(`[data-advertising-related-card="${remountMedia.id}"]`).evaluate(async (node) => {
      const first = node.getBoundingClientRect().toJSON();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const second = node.getBoundingClientRect().toJSON();
      return { first, second, positionAnimations: node.getAnimations().filter((animation) => animation.playState === "running").length, domCount: document.querySelectorAll("[data-advertising-related-card]").length };
    });
    assert(Math.abs(relatedRemount.first.left - relatedRemount.second.left) <= 0.1 && Math.abs(relatedRemount.first.top - relatedRemount.second.top) <= 0.1,
      "related cached remount replayed position stuffing");
    assert.equal(relatedRemount.positionAnimations, 0, "related cached remount retained position motion");
    assert(relatedRemount.domCount > 0 && relatedRemount.domCount < ADVERTISING_CARDS.length, `related cached remount DOM is unbounded: ${relatedRemount.domCount}`);
    await relatedContext.close();

    stage("filter-interruption-resize");
    await page.evaluate(() => window.scrollTo(0, 0));
    const beforeFilter = await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-advertising-card]")]
      .filter((node) => !node.hidden).map((node) => ({ id: node.dataset.advertisingCard, rect: node.getBoundingClientRect().toJSON() })));
    const filter = page.locator('[data-advertising-filter="kiosk-posm"]');
    // Sample in the same task as the activated control so the assertion measures
    // the seeded first frame, not arbitrary transition progress after Playwright's
    // pointer action has yielded one or more animation frames.
    await filter.evaluate((control) => control.click());
    const during = await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-advertising-card]")]
      .filter((node) => !node.hidden).map((node) => ({ id: node.dataset.advertisingCard, rect: node.getBoundingClientRect().toJSON() })));
    const beforeById = new Map(beforeFilter.map((card) => [card.id, card.rect]));
    const retainedStarts = during.filter((card) => beforeById.has(card.id));
    const retainedDeltas = retainedStarts.map((card) => {
      const before = beforeById.get(card.id);
      return { id: card.id, left: card.rect.left - before.left, top: card.rect.top - before.top };
    });
    assert(retainedStarts.length > 0 && retainedDeltas.every(({ left, top }) => Math.abs(left) <= 1 && Math.abs(top) <= 1),
      `filter layout did not retain the current visual positions at input ${JSON.stringify(retainedDeltas)}`);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.locator('[data-advertising-filter="all"]').click();
    await page.waitForTimeout(450);
    const interrupted = await page.evaluate(() => ({
      activeFilter: document.querySelector('[data-advertising-filter][aria-current="true"]')?.dataset.advertisingFilter,
      clones: document.querySelectorAll("[data-advertising-photo-morph]").length,
      running: [...document.querySelectorAll("[data-project-grid] [data-advertising-card]")]
        .flatMap((node) => node.getAnimations()).filter((animation) => animation.playState === "running").length,
      domCount: document.querySelectorAll("[data-project-grid] [data-advertising-card]").length,
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
    await page.locator(`[data-advertising-card="${A}"] > a`).click();
    await ready(page, A);
    const reduced = await page.evaluate(() => ({
      clones: document.querySelectorAll("[data-advertising-photo-morph]").length,
      runningTransforms: [...document.querySelectorAll("[data-advertising-card], [data-advertising-related-card]")]
        .flatMap((node) => node.getAnimations()).filter((animation) => animation.playState === "running").length,
      photo: document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoId,
    }));
    assert.deepEqual(reduced, { clones: 0, runningTransforms: 0, photo: A });
    return { parentStuffing, relatedStuffing, tagStuffing, initialMedia, remountedMedia, relatedRemount, remount, interrupted, reduced };
  });
  await caseRun("morph-frame-identity", { width: 1440, height: 900 }, async (page, stage) => {
    stage("open-A");
    await installMorphEndpointProbe(page);
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
    await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id, { scrollIntoView: true }), A);
    await page.waitForFunction((id) => {
      const image = document.querySelector(`[data-advertising-card="${id}"] img`);
      return image?.complete && image.naturalWidth > 0 && Boolean(image.currentSrc);
    }, A);
    await page.locator(`[data-advertising-card="${A}"] > a`).scrollIntoViewIfNeeded();
    const source = await page.locator(`[data-advertising-card="${A}"] img`).evaluate((node) => ({ id: node.closest("[data-advertising-card]")?.dataset.advertisingCard, src: node.currentSrc, rect: node.getBoundingClientRect().toJSON() }));
    await page.evaluate(() => {
      const probe = { added: [] };
      const capture = (node) => probe.added.push({
        id: node.dataset.advertisingPhotoId,
        src: node.currentSrc || node.src,
        rect: node.getBoundingClientRect().toJSON(),
        cloneCount: document.querySelectorAll("[data-advertising-photo-morph]").length,
        targetVisibility: getComputedStyle(document.querySelector("[data-advertising-photo-image]")).visibility,
      });
      probe.observer = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches("[data-advertising-photo-morph]")) capture(node);
        node.querySelectorAll?.("[data-advertising-photo-morph]").forEach(capture);
      })));
      probe.observer.observe(document.body, { childList: true, subtree: true });
      window.__ttAdvertisingMorphProbe = probe;
    });
    await page.locator(`[data-advertising-card="${A}"] > a`).click();
    const start = await page.evaluate(snapshot);
    await page.evaluate(frame);
    const mid = await page.evaluate(snapshot);
    await ready(page, A);
    await page.waitForFunction(() => window.__ttAdvertisingMorphProbe?.added.length > 0);
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    const added = await page.evaluate(() => {
      window.__ttAdvertisingMorphProbe.observer.disconnect();
      return window.__ttAdvertisingMorphProbe.added;
    });
    const end = await page.evaluate(snapshot);
    assert.equal(end.hero, A); assert.equal(source.id, A);
    assert.equal(end.clones.length, 0);
    assert.equal(await page.locator("[data-site-header] [data-advertising-photo-morph]").count(), 0);
    const observed = [...added, ...start.clones, ...mid.clones];
    assert(observed.length > 0, `no observable morph clone ${JSON.stringify({ source, start, mid })}`);
    assert(observed.every((clone) => clone.id === A && clone.src === source.src), `stale morph identity ${JSON.stringify({ source, start, mid })}`);
    assert(added.every((clone) => clone.cloneCount === 1 && clone.targetVisibility === "hidden"), `target flashed or clone duplicated on first morph frame ${JSON.stringify(added)}`);
    const firstClone = added[0];
    const firstFrameDelta = {
      left: firstClone.rect.left - source.rect.left,
      top: firstClone.rect.top - source.rect.top,
      width: firstClone.rect.width - source.rect.width,
      height: firstClone.rect.height - source.rect.height,
    };
    assert([firstFrameDelta.left, firstFrameDelta.top, firstFrameDelta.width, firstFrameDelta.height]
      .every((delta) => Math.abs(delta) <= 2),
    `first clone frame did not preserve the clicked image viewport geometry ${JSON.stringify({ source, firstClone, firstFrameDelta })}`);
    stage("scrolled-related-endpoint");
    await page.locator('[data-advertising-suggestion-tag="use-sampling"]').click();
    await page.waitForFunction(() => new URL(location.href).searchParams.get("tag") === "use-sampling");
    const relatedLink = page.locator(`[data-advertising-related-card="${B}"] > a`);
    await relatedLink.waitFor();
    await page.waitForFunction((id) => {
      const image = document.querySelector(`[data-advertising-related-card="${id}"] img`);
      return image?.complete && image.naturalWidth > 0 && Boolean(image.currentSrc);
    }, B);
    await page.mouse.move(5, 700);
    await page.mouse.wheel(0, 500);
    await page.waitForFunction(() => (window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY) > 100);
    await page.evaluate(async () => {
      let previous = NaN;
      let stable = 0;
      while (stable < 3) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const current = window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY;
        stable = Math.abs(current - previous) <= 0.1 ? stable + 1 : 0;
        previous = current;
      }
    });
    const relatedScroll = await page.evaluate(() => window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY);
    await relatedLink.click();
    await page.waitForFunction((id) => document.querySelector(`[data-advertising-photo-morph][data-advertising-photo-id="${id}"]`), B);
    const morphScrollStart = await page.evaluate(() => ({
      logical: window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY,
      native: scrollY,
      overflow: [document.body.style.overflow, document.documentElement.style.overflow],
    }));
    await page.mouse.wheel(0, 160);
    await page.keyboard.press("PageDown");
    const morphScrollEnd = await page.evaluate(() => ({
      logical: window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY,
      native: scrollY,
    }));
    await ready(page, B);
    await page.waitForFunction((id) => window.__ttP13MorphEndpoints.some((entry) => entry.id === id && entry.targetRect), B);
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    const endpoint = await page.evaluate((id) => window.__ttP13MorphEndpoints.findLast((entry) => entry.id === id), B);
    const revealedTarget = await page.evaluate(() => {
      const target = document.querySelector('[data-advertising-photo-image][data-advertising-photo-id="mobile-retail-04"]');
      return { at: performance.now(), rect: target?.getBoundingClientRect().toJSON() || null, visibility: target ? getComputedStyle(target).visibility : null };
    });
    assert(relatedScroll > 0, `related click did not exercise restored scroll geometry: ${relatedScroll}`);
    assert.deepEqual(morphScrollStart.overflow, ["hidden", "hidden"],
      `morph did not acquire the shared scroll lease: ${JSON.stringify(morphScrollStart)}`);
    assert(Math.abs(morphScrollEnd.logical - morphScrollStart.logical) <= 0.1
      && Math.abs(morphScrollEnd.native - morphScrollStart.native) <= 0.1,
    `wheel or scroll key changed the viewport during morph: ${JSON.stringify({ morphScrollStart, morphScrollEnd })}`);
    const releasedScrollStart = await page.evaluate(() => window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY);
    await page.mouse.wheel(0, 160);
    await page.waitForFunction((start) => Math.abs((window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY) - start) >= 100, releasedScrollStart);
    const releasedScrollEnd = await page.evaluate(() => window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY);
    assert.equal(revealedTarget.visibility, "visible", "photo target remained hidden after clone removal");
    const endpointDelta = {
      elapsedMs: revealedTarget.at - endpoint.finishedAt,
      left: endpoint.cloneRect.left - revealedTarget.rect.left,
      top: endpoint.cloneRect.top - revealedTarget.rect.top,
      width: endpoint.cloneRect.width - revealedTarget.rect.width,
      height: endpoint.cloneRect.height - revealedTarget.rect.height,
    };
    assert([endpointDelta.left, endpointDelta.top, endpointDelta.width, endpointDelta.height].every((delta) => Math.abs(delta) <= 2),
      `finished clone did not meet the revealed photo target ${JSON.stringify({ relatedScroll, endpoint, revealedTarget, endpointDelta })}`);
    return { source, firstClone, firstFrameDelta, start, mid, end, relatedScroll, morphScrollStart, morphScrollEnd, releasedScrollStart, releasedScrollEnd, endpoint, revealedTarget, endpointDelta };
  });

  await caseRun("viewer-morph-lock-handoff", { width: 1440, height: 900 }, async (page, stage) => {
    stage("open-during-morph");
    await openA(page);
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    await page.evaluate(() => {
      const motion = window.TruongThinhMotion;
      const lock = motion.lockLogicalScroll.bind(motion);
      const unlock = motion.unlockLogicalScroll.bind(motion);
      window.__ttViewerMorphLocks = [];
      motion.lockLogicalScroll = () => {
        const scrollY = lock();
        window.__ttViewerMorphLocks.push({ type: "lock", at: performance.now(), body: document.body.style.overflow, html: document.documentElement.style.overflow });
        return scrollY;
      };
      motion.unlockLogicalScroll = (scrollY) => {
        const result = unlock(scrollY);
        window.__ttViewerMorphLocks.push({ type: "unlock", at: performance.now(), body: document.body.style.overflow, html: document.documentElement.style.overflow });
        return result;
      };
    });
    const baseline = await page.evaluate(() => ({ body: document.body.style.overflow, html: document.documentElement.style.overflow }));
    await chooseB(page);
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-morph]")
      && document.querySelector("[data-advertising-photo-expand]")?.offsetParent);
    const beforeExpand = await page.evaluate(() => ({
      clones: document.querySelectorAll("[data-advertising-photo-morph]").length,
      body: getComputedStyle(document.body).overflow,
      html: getComputedStyle(document.documentElement).overflow,
    }));
    assert.equal(beforeExpand.clones, 1, "expand fixture did not catch an active photo morph");
    await page.locator("[data-advertising-photo-expand]").evaluate((node) => node.click());
    await page.waitForTimeout(450);
    await page.locator("[data-advertising-photo-image]").evaluate((node) => node.dispatchEvent(new Event("load")));
    await page.waitForTimeout(200);
    const during = await page.evaluate(() => ({
      dialogOpen: document.querySelector("[data-advertising-photo-dialog]")?.open === true,
      body: getComputedStyle(document.body).overflow,
      html: getComputedStyle(document.documentElement).overflow,
      bodyInline: document.body.style.overflow,
      htmlInline: document.documentElement.style.overflow,
      clones: document.querySelectorAll("[data-advertising-photo-morph]").length,
      locks: window.__ttViewerMorphLocks,
    }));
    assert.equal(during.dialogOpen, true, "viewer closed while the morph lock settled");
    assert(during.bodyInline === "hidden" || during.htmlInline === "hidden", "viewer lost document scroll lock after morph settlement");
    assert.equal(during.clones, 0, "viewer handoff retained the obsolete morph clone");

    stage("cancel-releases");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.open === false);
    const afterCancel = await page.evaluate(() => ({ body: document.body.style.overflow, html: document.documentElement.style.overflow }));
    assert.deepEqual(afterCancel, baseline, "dialog cancel did not release the viewer lock");

    stage("reduced-motion-releases");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("[data-advertising-photo-expand]").evaluate((node) => node.click());
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.open === true);
    const reducedLocked = await page.evaluate(() => ({ body: getComputedStyle(document.body).overflow, html: getComputedStyle(document.documentElement).overflow }));
    assert(reducedLocked.body === "hidden" || reducedLocked.html === "hidden", "reduced-motion viewer did not acquire its lock");
    await page.locator("[data-advertising-photo-close]").click();
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.open === false);
    const afterReduced = await page.evaluate(() => ({ body: document.body.style.overflow, html: document.documentElement.style.overflow }));
    assert.deepEqual(afterReduced, baseline, "reduced-motion close did not release the viewer lock");

    stage("image-error-releases");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.locator("[data-advertising-photo-expand]").evaluate((node) => node.click());
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.open === true);
    await page.locator("[data-advertising-photo-expanded-image]").evaluate((node) => node.dispatchEvent(new Event("error")));
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.open === false);
    const afterError = await page.evaluate(() => ({ body: document.body.style.overflow, html: document.documentElement.style.overflow }));
    assert.deepEqual(afterError, baseline, "viewer image error did not release the viewer lock");
    return { beforeExpand, during, afterCancel, reducedLocked, afterReduced, afterError };
  });

  await caseRun("history-back-forward-morph", { width: 1440, height: 900 }, async (page, stage) => {
    await installHistoryMorphProbe(page);
    stage("detail-back-forward");
    await openA(page);
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    const aSrc = await page.locator("[data-advertising-photo-image]").evaluate((node) => node.currentSrc);
    await chooseB(page);
    await ready(page, B);
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    const bSrc = await page.locator("[data-advertising-photo-image]").evaluate((node) => node.currentSrc);
    await page.evaluate(() => { window.__ttHistoryMorphs.length = 0; });

    await page.mouse.move(1400, 20);
    await page.goBack();
    await ready(page, A);
    const detailBack = await completedHistoryMorph(page, 0);
    assertHistoryMorph(detailBack, { id: B, src: bSrc }, "detail B to A Back");

    await page.mouse.move(1400, 20);
    await page.goForward();
    await ready(page, B);
    const detailForward = await completedHistoryMorph(page, 1);
    assertHistoryMorph(detailForward, { id: A, src: aSrc }, "detail A to B Forward");

    stage("grid-back-forward");
    await openA(page);
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    await page.evaluate(() => { window.__ttHistoryMorphs.length = 0; });
    await page.mouse.move(1400, 20);
    await page.goBack();
    await page.waitForFunction((id) => !new URL(location.href).searchParams.has("photo")
      && document.activeElement?.closest("[data-advertising-card]")?.dataset.advertisingCard === id, A);
    const gridBack = await completedHistoryMorph(page, 0);
    assertHistoryMorph(gridBack, { id: A, src: aSrc }, "detail A to grid Back");

    await page.mouse.move(1400, 20);
    await page.goForward();
    await ready(page, A);
    const gridForward = await completedHistoryMorph(page, 1);
    assertHistoryMorph(gridForward, { id: A, src: aSrc }, "grid to detail A Forward");

    stage("deep-link-no-source");
    await page.goto(href(`/vi/advertising-products/?photo=${A}`), { waitUntil: "domcontentloaded" });
    await ready(page, A);
    assert.equal(await page.evaluate(() => window.__ttHistoryMorphs.length), 0, "deep link created a morph without a grid source");

    stage("reduced-motion-history");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openA(page);
    await page.evaluate(() => { window.__ttHistoryMorphs.length = 0; });
    await page.goBack();
    await page.waitForFunction(() => !new URL(location.href).searchParams.has("photo"));
    await page.goForward();
    await ready(page, A);
    const reduced = await page.evaluate(() => ({
      clones: document.querySelectorAll("[data-advertising-photo-morph]").length,
      locks: [document.body.style.overflow, document.documentElement.style.overflow],
      records: window.__ttHistoryMorphs.length,
    }));
    assert.deepEqual(reduced, { clones: 0, locks: ["", ""], records: 0 });
    return { detailBack, detailForward, gridBack, gridForward, reduced };
  });

  await caseRun("history-pointer-retained-morph", { width: 1440, height: 900 }, async (page, stage) => {
    await installHistoryMorphProbe(page);
    stage("detail-back-pointer-retained");
    await openA(page);
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    await chooseB(page);
    await ready(page, B);
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    const bSrc = await page.locator("[data-advertising-photo-image]").evaluate((node) => node.currentSrc);
    await page.evaluate(() => { window.__ttHistoryMorphs.length = 0; });

    await page.goBack();
    await ready(page, A);
    const detailBack = await completedHistoryMorph(page, 0);
    assertHistoryMorph(detailBack, { id: B, src: bSrc }, "detail B to A Back with retained pointer");
    return { detailBack };
  });

  await caseRun("history-grid-pointer-retained-morph", { width: 1440, height: 900 }, async (page, stage) => {
    await installHistoryMorphProbe(page);
    stage("detail-to-grid-pointer-retained");
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
    const firstLink = page.locator("[data-advertising-card] > a").first();
    const photoId = await firstLink.evaluate((node) => node.closest("[data-advertising-card]")?.dataset.advertisingCard);
    await firstLink.click();
    await ready(page, photoId);
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    const source = await page.locator("[data-advertising-photo-image]").evaluate((node) => node.currentSrc);
    await page.evaluate(() => { window.__ttHistoryMorphs.length = 0; });

    await page.goBack();
    await page.waitForFunction((id) => !new URL(location.href).searchParams.has("photo")
      && document.activeElement?.closest("[data-advertising-card]")?.dataset.advertisingCard === id, photoId);
    const gridBack = await completedHistoryMorph(page, 0);
    assertHistoryMorph(gridBack, { id: photoId, src: source }, "detail to parent grid Back with retained pointer");
    return { gridBack, photoId };
  });

  await caseRun("history-grid-scrollbar-resize", { width: 1010, height: 900 }, async (page, stage) => {
    await installHistoryMorphProbe(page);
    await page.addInitScript(() => {
      addEventListener("DOMContentLoaded", () => {
        const root = document.documentElement;
        const nativeClientWidth = root.clientWidth;
        Object.defineProperty(root, "clientWidth", {
          configurable: true,
          get: () => window.__ttViewportClientWidth
            ?? nativeClientWidth - (document.body.style.overflow === "hidden" ? 0 : 10),
        });
        new MutationObserver(() => dispatchEvent(new Event("resize")))
          .observe(document.body, { attributeFilter: ["style"], attributes: true });
      }, { once: true });
    });
    stage("grid-back-visible-scrollbar");
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
    await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id, { scrollIntoView: true }), A);
    await page.locator(`[data-advertising-card="${A}"] > a`).evaluate((node) => node.click());
    await ready(page, A);
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    const aSrc = await page.locator("[data-advertising-photo-image]").evaluate((node) => node.currentSrc);
    const clientWidthBefore = await page.evaluate(() => document.documentElement.clientWidth);
    await page.evaluate(() => { window.__ttHistoryMorphs.length = 0; });
    await page.mouse.move(1000, 20);

    await page.goBack();
    await page.waitForFunction((id) => !new URL(location.href).searchParams.has("photo")
      && document.activeElement?.closest("[data-advertising-card]")?.dataset.advertisingCard === id, A);
    const gridBack = await completedHistoryMorph(page, 0);
    assert(gridBack.clientWidthAtStart > clientWidthBefore, "scroll lock did not expose the visible scrollbar width change");
    assert.equal(gridBack.clientWidthAfterSettle, clientWidthBefore, "scrollbar width was not restored after settle");
    assertHistoryMorph(gridBack, { id: A, src: aSrc }, "detail A to grid Back with visible scrollbar");

    stage("grid-back-real-resize-cancels");
    await page.locator(`[data-advertising-card="${A}"] > a`).evaluate((node) => node.click());
    await ready(page, A);
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    await page.evaluate(() => { window.__ttHistoryMorphs.length = 0; });
    await page.goBack();
    await page.waitForSelector("[data-advertising-photo-morph]");
    await page.evaluate(() => {
      window.__ttViewportClientWidth = 1020;
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 1020 });
      dispatchEvent(new Event("resize"));
    });
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    await page.waitForFunction(() => window.__ttHistoryMorphs[0]?.canceledAt || window.__ttHistoryMorphs[0]?.finishedAt);
    const realResize = await page.evaluate(() => ({
      canceledAt: window.__ttHistoryMorphs[0]?.canceledAt,
      locks: [document.body.style.overflow, document.documentElement.style.overflow],
    }));
    assert(realResize.canceledAt, "real viewport resize did not cancel the grid morph");
    assert.deepEqual(realResize.locks, ["", ""], "real viewport resize did not release the scroll lease");
    return { clientWidthBefore, gridBack, realResize };
  });

  await caseRun("morph-backdrop-lifecycle", { width: 1440, height: 900 }, async (page, stage) => {
    await installBackdropMorphProbe(page);
    const clearProbe = () => page.evaluate(() => { window.__ttP4BackdropMorphs.records.length = 0; });
    const captureTransition = async (targetId) => {
      await page.waitForFunction(() => {
        const kinds = new Set((window.__ttP4BackdropMorphs?.records || []).map(({ kind }) => kind));
        return kinds.has("backdrop") && kinds.has("morph");
      });
      const during = await readBackdropMorphState(page);
      await page.waitForFunction(({ id }) => {
        const record = (window.__ttP4BackdropMorphs?.records || [])
          .find((entry) => entry.kind === "backdrop" && entry.photoId === id);
        if (!record) return false;
        const animation = document.querySelector("[data-advertising-photo-background]")?.getAnimations()
          .find(({ playState }) => playState === "pending" || playState === "running");
        const foreground = (window.__ttP4BackdropMorphs?.records || [])
          .find((entry) => entry.kind === "morph")?.duration;
        return animation && Number(animation.currentTime) >= Number(foreground) * 0.25;
      }, { id: targetId });
      const eraseMidpoint = await readBackdropMorphState(page);
      await ready(page, targetId);
      await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
      await page.evaluate(frame);
      const foregroundSettled = await readBackdropMorphState(page);
      const scrollBefore = await page.evaluate(() =>
        window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY);
      await page.mouse.wheel(0, 240);
      await page.evaluate(frame);
      const scrollDuringLinger = {
        after: await page.evaluate(() => window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY),
        before: scrollBefore,
      };
      await page.waitForTimeout(100);
      await page.evaluate(frame);
      const lingerMidpoint = await readBackdropMorphState(page);
      await page.waitForTimeout(1200);
      await page.evaluate(frame);
      return {
        during,
        eraseMidpoint,
        foregroundSettled,
        lingerFinished: await readBackdropMorphState(page),
        lingerMidpoint,
        scrollDuringLinger,
      };
    };
    const evidence = {};

    stage("direct-load-static");
    await page.goto(href(`/vi/advertising-products/?photo=${A}`), { waitUntil: "domcontentloaded" });
    await ready(page, A);
    await page.evaluate(frame);
    evidence.direct = await readBackdropMorphState(page);

    stage("reduced-motion-static");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await ensureParentTarget(page);
    await page.locator(`[data-advertising-card="${A}"] > a`).click();
    await ready(page, A);
    await page.evaluate(frame);
    evidence.reduced = await readBackdropMorphState(page);

    stage("missing-source-static");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await ensureParentTarget(page);
    await page.locator(`[data-advertising-card="${A}"] img`).evaluate((node) => { node.removeAttribute("src"); });
    await page.locator(`[data-advertising-card="${A}"] > a`).click();
    await ready(page, A);
    await page.evaluate(frame);
    evidence.missingSource = await readBackdropMorphState(page);

    stage("grid-morph");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await ensureParentTarget(page);
    await page.locator(`[data-advertising-card="${A}"] > a`).click();
    evidence.grid = await captureTransition(A);

    stage("related-morph");
    await clearProbe();
    await chooseB(page);
    evidence.related = await captureTransition(B);

    stage("history-back-morph");
    await clearProbe();
    await page.goBack();
    evidence.historyBack = await captureTransition(A);

    stage("history-forward-morph");
    await clearProbe();
    await page.goForward();
    evidence.historyForward = await captureTransition(B);

    stage("rapid-history-retarget");
    await clearProbe();
    await page.goBack();
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-morph]"));
    await page.goForward();
    await ready(page, B);
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    await page.evaluate(frame);
    evidence.rapid = await readBackdropMorphState(page);

    assert.equal(evidence.direct.records.length, 0,
      `direct load animated without a real morph ${JSON.stringify(evidence.direct)}`);
    assert.equal(evidence.direct.activeBackdropAnimations, 0, "direct load retained backdrop animation");
    assert.equal(evidence.reduced.records.length, 0,
      `reduced motion animated without a real morph ${JSON.stringify(evidence.reduced)}`);
    assert.equal(evidence.reduced.activeBackdropAnimations, 0, "reduced motion retained backdrop animation");
    assert.equal(evidence.missingSource.records.length, 0,
      `missing source animated without a real morph ${JSON.stringify(evidence.missingSource)}`);
    assert.equal(evidence.missingSource.activeBackdropAnimations, 0, "missing source retained backdrop animation");
    assertSequentialBackdrop(evidence.grid, { duration: 520, label: "grid to detail", targetId: A });
    assertSequentialBackdrop(evidence.related, { duration: 520, label: "related to detail", targetId: B });
    assertSequentialBackdrop(evidence.historyBack, { duration: 400, label: "native Back", targetId: A });
    assertSequentialBackdrop(evidence.historyForward, { duration: 400, label: "native Forward", targetId: B });
    const rapidBackdrops = evidence.rapid.records.filter(({ kind }) => kind === "backdrop");
    const rapidMorphs = evidence.rapid.records.filter(({ kind }) => kind === "morph");
    assert(rapidMorphs.length >= 2, `rapid retarget did not replace an active morph ${JSON.stringify(evidence.rapid.records)}`);
    assert.equal(rapidBackdrops.length, 1,
      `only the settled morph may start backdrop motion ${JSON.stringify(evidence.rapid.records)}`);
    assert(rapidMorphs.slice(0, -1).every(({ canceledAt }) => canceledAt),
      `replaced morph was not canceled ${JSON.stringify(rapidMorphs)}`);
    assert(rapidBackdrops.slice(0, -1).every(({ canceledAt }) => canceledAt),
      `replaced backdrop was not canceled ${JSON.stringify(rapidBackdrops)}`);
    assert.equal(rapidBackdrops.at(-1)?.photoId, B, "rapid retarget started a backdrop for the wrong final photo");
    assert.equal(rapidBackdrops.at(-1)?.duration, 1200, "rapid retarget omitted long backdrop settle");
    assert.equal(evidence.rapid.activeBackdropAnimations, 1, "rapid retarget did not retain only final backdrop linger");
    await page.waitForTimeout(1300);
    await page.evaluate(frame);
    evidence.rapidFinished = await readBackdropMorphState(page);
    assert.equal(evidence.rapidFinished.activeBackdropAnimations, 0, "rapid retarget left final backdrop animation running");
    assert.equal(evidence.rapid.viewId, B, "rapid retarget settled the wrong detail photo");
    assert.equal(evidence.rapid.heroId, B, "rapid retarget settled the wrong hero photo");
    assert.equal(evidence.rapid.backdropSrc, evidence.rapid.heroSrc, "rapid retarget retained the wrong backdrop photo");
    return evidence;
  });

  await caseRun("rapid-related-and-back-mid-morph", { width: 1440, height: 900 }, async (page, stage) => {
    stage("A-to-B"); await openA(page); await chooseB(page, () => page.evaluate(() => {
      const events = [];
      const removals = [];
      const nativeRemove = Element.prototype.remove;
      Element.prototype.remove = function probedRemove() {
        if (this.matches?.('[data-advertising-photo-morph][data-advertising-photo-id="mobile-retail-04"]')) {
          const relatedTarget = document.querySelector('[data-advertising-related-card="mobile-retail-04"] img');
          removals.push({
            at: performance.now(),
            url: location.href,
            relatedOpacity: relatedTarget ? Number(getComputedStyle(relatedTarget).opacity) : null,
            relatedReady: relatedTarget?.classList.contains("is-advertising-media-ready") ?? null,
          });
        }
        return nativeRemove.call(this);
      };
      const capture = (kind, node) => {
        const event = {
          kind,
          at: performance.now(),
          id: node.dataset.advertisingPhotoId,
          src: node.currentSrc || node.src,
          connected: node.isConnected,
          url: location.href,
          rect: node.getBoundingClientRect().toJSON(),
        };
        events.push(event);
        return event;
      };
      const observer = new MutationObserver((records) => records.forEach((record) => {
        record.addedNodes.forEach((node) => { if (node instanceof Element && node.matches("[data-advertising-photo-morph]")) {
          const added = capture("added", node);
          const probe = window.__ttRelatedMorphProbe;
          if (probe.backTriggered && added.id === "mobile-retail-04") probe.reverseFirst = added;
          if (!probe.backScheduled && added.id === "mobile-retail-04" && new URL(location.href).searchParams.get("photo") === "mobile-retail-04") {
            probe.backScheduled = true;
            setTimeout(() => {
              const active = document.querySelector('[data-advertising-photo-morph][data-advertising-photo-id="mobile-retail-04"]');
              if (!active?.isConnected || probe.backTriggered) return;
              probe.beforeBack = capture("before-back", active);
              probe.backTriggered = true;
              history.back();
            }, 100);
          }
        } });
        record.removedNodes.forEach((node) => { if (node instanceof Element && node.matches("[data-advertising-photo-morph]")) capture("removed", node); });
      }));
      observer.observe(document.body, { childList: true, subtree: true });
      window.__ttRelatedMorphProbe = { backScheduled: false, backTriggered: false, beforeBack: null, reverseFirst: null, events, removals, observer };
      // History traversal is asynchronous: compare at handoff, not a frame before popstate.
      const advertising = window.TruongThinhAdvertising;
      const handlePopState = advertising.handlePopState;
      advertising.handlePopState = function measuredHistoryHandoff(...args) {
        const active = document.querySelector('[data-advertising-photo-morph][data-advertising-photo-id="mobile-retail-04"]');
        if (active) window.__ttRelatedMorphProbe.beforeHandoff = capture("before-handoff", active);
        return handlePopState.apply(this, args);
      };
    }));
    stage("back-mid-morph"); await ready(page, A);
    await page.waitForFunction(() => window.__ttRelatedMorphProbe?.reverseFirst);
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    const settled = await page.evaluate(snapshot);
    assert.equal(settled.hero, A); assert.equal(settled.clones.length, 0); assert.deepEqual(settled.locked, ["", ""]);
    const cancelScrollStart = await page.evaluate(() => window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY);
    await page.mouse.wheel(0, 160);
    await page.waitForFunction((start) => Math.abs((window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY) - start) >= 100, cancelScrollStart);
    const cancelScrollEnd = await page.evaluate(() => window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY);
    const probe = await page.evaluate(() => { const probe = window.__ttRelatedMorphProbe; probe?.observer.disconnect(); return { backTriggered: probe?.backTriggered, beforeBack: probe?.beforeBack, beforeHandoff: probe?.beforeHandoff, reverseFirst: probe?.reverseFirst, events: probe?.events || [], removals: probe?.removals || [] }; });
    assert.equal(probe.backTriggered, true, "history.back must run while B clone remains connected");
    assert(probe.events.some((event) => event.kind === "added" && event.id === B && event.url.includes(`photo=${B}`)), "B clone must be observed before Back");
    assert.equal(probe.beforeBack.id, B, "visible clone identity before Back differs from B");
    assert.equal(probe.beforeHandoff?.id, B, "visible clone identity at history handoff differs from B");
    assert.equal(probe.reverseFirst.id, B, "reverse clone identity differs from B");
    const continuityDelta = {
      elapsedMs: probe.reverseFirst.at - probe.beforeHandoff.at,
      left: probe.reverseFirst.rect.left - probe.beforeHandoff.rect.left,
      top: probe.reverseFirst.rect.top - probe.beforeHandoff.rect.top,
      width: probe.reverseFirst.rect.width - probe.beforeHandoff.rect.width,
      height: probe.reverseFirst.rect.height - probe.beforeHandoff.rect.height,
    };
    assert([continuityDelta.left, continuityDelta.top, continuityDelta.width, continuityDelta.height].every((delta) => Math.abs(delta) <= 2),
      `reverse morph did not continue from the visible B clone ${JSON.stringify(continuityDelta)}`);
    const reverseRemoval = probe.removals.findLast(({ relatedOpacity }) => relatedOpacity !== null);
    assert(reverseRemoval?.relatedReady && reverseRemoval.relatedOpacity >= 0.999,
      `reverse target was not fully revealed before clone removal ${JSON.stringify(probe.removals)}`);
    probe.continuityDelta = continuityDelta;
    return { probe, settled, cancelScrollStart, cancelScrollEnd };
  });

  await caseRun("delayed-image-resize-latest-wins", { width: 390, height: 844 }, async (page, stage) => {
    stage("open-A"); await openA(page);
    await page.route("**/*mobile-retail-04*.webp", async (route) => { await new Promise((resolve) => setTimeout(resolve, 700)); await route.continue(); });
    stage("B-and-resize"); await chooseB(page); await page.setViewportSize({ width: 1440, height: 900 });
    await ready(page, B); await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]"));
    const state = await page.evaluate(snapshot);
    assert.equal(state.hero, B); assert.equal(state.clones.length, 0); assert.deepEqual(state.locked, ["", ""]);
    return state;
  });

  await caseRun("animation-dependency-failure-fail-open", { width: 390, height: 844 }, async (page, stage) => {
    stage("abort-gsap");
    await page.route("**/*gsap*", (route) => route.abort());
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.()
      && document.querySelectorAll("[data-project-grid] .advertising-tile").length > 0);
    const state = await page.evaluate(() => ({ grid: document.querySelectorAll("[data-project-grid] .advertising-tile").length, locked: [document.body.style.overflow, document.documentElement.style.overflow] }));
    assert(state.grid > 0, "animation dependency failure did not fail open to a usable grid"); assert.deepEqual(state.locked, ["", ""]);
    return state;
  }, { allowedIssues: ["console:Failed to load resource: net::ERR_FAILED"] });

  await caseRun("active-photo-locale-switch", { width: 390, height: 844 }, async (page, stage) => {
    stage("open-A-tag-B"); await openA(page); await chooseB(page); await ready(page, B);
    const before = await page.evaluate(() => ({ photo: new URL(location.href).searchParams.get("photo"), tag: new URL(location.href).searchParams.get("tag"), category: new URL(location.href).searchParams.get("category"), slot: document.querySelector("[data-advertising-photo-related-grid]")?.dataset.advertisingSuggestionSlot }));
    const switchLocale = async (language) => {
      await page.locator("[data-menu-open]").click();
      await page.waitForFunction(() => document.querySelector("#site-menu")?.open && document.querySelector("#site-menu")?.classList.contains("is-active"));
      await page.locator(`#site-menu [data-language-option="${language}"]`).click();
      await page.waitForFunction((expected) => document.documentElement.lang === expected && !document.querySelector("#site-menu")?.open, language);
      await ready(page, B);
      return page.evaluate(() => ({
        language: document.documentElement.lang,
        photo: new URL(location.href).searchParams.get("photo"),
        tag: new URL(location.href).searchParams.get("tag"),
        category: new URL(location.href).searchParams.get("category"),
        slot: document.querySelector("[data-advertising-photo-related-grid]")?.dataset.advertisingSuggestionSlot,
        hero: document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoId,
        backCount: document.querySelectorAll("[data-advertising-photo-return]").length,
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
      hero: document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoId,
      url: location.href,
      historyLength: history.length,
      slot: document.querySelector("[data-advertising-photo-related-grid]")?.dataset.advertisingSuggestionSlot,
      links: [...document.querySelectorAll("[data-advertising-suggestion-tag]")].map((link) => ({
        tag: link.dataset.advertisingSuggestionTag,
        label: link.querySelector(".advertising-photo-view__suggestion-label")?.textContent?.trim(),
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
    await page.locator("[data-advertising-suggestion-tag]").first().click();
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
      const skeleton = document.querySelector("[data-advertising-cta-skeleton]");
      const cta = document.querySelector("[data-advertising-grid-cta]");
      const frames = [...(skeleton?.querySelectorAll("[data-advertising-cta-frame]") || [])];
      const gridRect = grid?.getBoundingClientRect();
      const ctaRect = cta?.getBoundingClientRect();
      const frameStates = frames.map((node) => {
        const rect = node.getBoundingClientRect();
        const surface = node.querySelector(".advertising-grid__cta-surface");
        const flow = node.querySelector("[data-advertising-flow-preset]");
        return {
          column: Number(node.dataset.advertisingCtaColumn),
          depth: Number(node.dataset.advertisingCtaDepth),
          ratioBand: node.dataset.advertisingCtaRatioBand,
          height: rect.height,
          left: rect.left - gridRect.left,
          maskImage: getComputedStyle(node).maskImage,
          opacity: Number(getComputedStyle(node).opacity),
          targetOpacity: Number(getComputedStyle(node).getPropertyValue("--advertising-cta-frame-opacity")),
          borderWidth: surface ? getComputedStyle(surface).borderTopWidth : null,
          flowPreset: flow?.dataset.advertisingFlowPreset || null,
          flowBackend: flow?.tagName || null,
          flowFilter: flow ? getComputedStyle(flow).filter : null,
          top: rect.top - gridRect.top,
          width: rect.width,
        };
      });
      const visiblePhotos = [...(grid?.querySelectorAll('[role="listitem"][data-advertising-card]') || [])]
        .filter((node) => !node.hidden);
      return {
        columns: Number(skeleton?.dataset.advertisingCtaColumns),
        ctaCount: document.querySelectorAll("[data-advertising-grid-cta]").length,
        ctaTop: ctaRect.top - gridRect.top,
        ctaBottom: ctaRect.bottom - gridRect.top,
        realPhotoBottom: Number(skeleton.dataset.advertisingCtaRealBottom),
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
        semanticIntruders: grid?.querySelectorAll('[role="listitem"]:not([data-advertising-card])').length || 0,
        ready: skeleton?.dataset.advertisingCtaReady === "true",
        signature: skeleton?.dataset.advertisingCtaSignature || null,
        skeletonMaskImage: skeleton ? getComputedStyle(skeleton).maskImage : null,
        skeletonIsTile: skeleton?.classList.contains("advertising-tile") ?? null,
        viewportOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    const assertCta = (state, label) => {
      assert.equal(state.ctaCount, 1, `${label}: business CTA count`);
      assert.equal(state.directChild, true, `${label}: skeleton must be a grid child`);
      assert.equal(state.ready, true, `${label}: skeleton geometry not ready`);
      assert.equal(state.hidden, false, `${label}: skeleton hidden in grid`);
      assert.equal(state.skeletonIsTile, false, `${label}: skeleton entered Masonry items`);
      assert.equal(state.interactiveDescendants, 0, `${label}: skeleton entered focus order`);
      assert(state.frameStates.length >= state.columns && state.frameStates.length <= state.columns * 3,
        `${label}: frame count leaves the bounded one-to-three range per column`);
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
        assert(frames.every((frame) => Math.abs(frame.width - frames[0].width) <= 0.1 && frame.height > 0), `${label}: invalid frame geometry in column ${column}`);
        assert(frames.length >= 1 && frames.length <= 3
          && frames.every((frame) => Math.abs(frame.targetOpacity - 1) <= 0.01),
        `${label}: frame retained local depth opacity instead of the global boundary fade`);
        assert(frames.slice(1).every((frame, index) => frames[index].ratioBand !== frame.ratioBand),
          `${label}: adjacent skeleton ratio bands repeat in column ${column}`);
        assert(frames.every((frame) => frame.maskImage === "none"), `${label}: frame retained a local fade mask`);
        assert(frames.every((frame) => frame.borderWidth === "0px"), `${label}: skeleton surface retained a border`);
        assert(frames.every((frame) => frame.flowBackend === "CANVAS" && frame.flowPreset), `${label}: WebGL Flow canvas or preset is missing`);
        assert(frames.every((frame) => frame.flowFilter === "none"), `${label}: Flow canvas retained a local blur/filter`);
        assert(frames.slice(1).every((frame, index) => frames[index].top < frame.top), `${label}: frame order in column ${column}`);
      }
      assert.match(state.skeletonMaskImage || "", /linear-gradient/i, `${label}: skeleton container lacks the global boundary fade`);
      assert(state.gridHeight + 0.1 >= Math.max(...state.frameStates.map((frame) => frame.top + frame.height)), `${label}: grid height clips skeleton`);
    };

    const matrix = [];
    for (const locale of ["vi", "en"]) {
      for (const width of [320, 390, 820, 1440]) {
        stage(`matrix-${locale}-${width}`);
        await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
        await page.goto(href(`/${locale}/advertising-products/`), { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaReady === "true");
        const state = await readCta();
        assertCta(state, `${locale}-${width}`);
        assert.equal(state.ctaText, locale === "en" ? "The next mark for your brand" : "Dấu ấn tiếp theo dành cho thương hiệu của bạn");
        matrix.push({ locale, width, columns: state.columns, frames: state.frameStates.length, signature: state.signature });
      }
    }

    stage("filter-resize-recompute");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaReady === "true");
    const initial = await readCta();
    const titleMotion = await page.evaluate(async () => {
      const cta = document.querySelector("[data-advertising-grid-cta]");
      const title = cta.querySelector("h2");
      const lines = [...title.querySelectorAll(".motion-line")];
      const before = lines.map((line) => new DOMMatrixReadOnly(getComputedStyle(line).transform).m42);
      const y = cta.getBoundingClientRect().top + window.TruongThinhMotion.getLogicalScroll() - 160;
      window.TruongThinhMotion.setLogicalScroll(y);
      await new Promise((resolve) => setTimeout(resolve, 90));
      const tween = window.gsap.globalTimeline.getChildren(true, true, false)
        .find((item) => item.targets().some((node) => title.contains(node)));
      return { before, middle: lines.map((line) => new DOMMatrixReadOnly(getComputedStyle(line).transform).m42),
        count: lines.length, duration: tween?.duration(), ease: tween?.vars.ease, stagger: tween?.vars.stagger };
    });
    assert(titleMotion.count > 0 && titleMotion.before[0] > titleMotion.middle[0], "CTA lines did not move on entry");
    assert.equal(titleMotion.ease, "power4.out");
    assert.equal(titleMotion.stagger, 0.1);
    assert(Math.abs(titleMotion.duration - (1.9 + 0.1 * (titleMotion.count - 1))) < 0.01, "CTA line timing differs from shared motion");
    await page.waitForTimeout(2100);
    await page.screenshot({ path: path.join(output, "cta-overlay-desktop.png") });
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    await page.evaluate(() => {
      document.querySelector("[data-advertising-cta-frame]").dataset.scrollIdentity = "retained";
      window.dispatchEvent(new Event("scroll"));
    });
    await page.evaluate(frame);
    assert.equal(await page.locator('[data-advertising-cta-frame]').first().getAttribute("data-scroll-identity"), "retained", "scroll rebuilt unchanged skeleton nodes");
    await page.locator('[data-advertising-filter="kiosk-posm"]').click();
    await page.waitForFunction((signature) => document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaSignature !== signature, initial.signature);
    const filtered = await readCta();
    assertCta(filtered, "filtered");
    assert.notEqual(filtered.signature, initial.signature, "filter did not recompute CTA skeleton");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction((columns) => Number(document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaColumns) !== columns, filtered.columns);
    await page.waitForTimeout(450);
    const resized = await readCta();
    assertCta(resized, "resized");

    stage("keyboard-reduced-motion");
    const ctaLink = page.locator("[data-advertising-grid-cta] a");
    await ctaLink.focus();
    assert.equal(await ctaLink.evaluate((node) => document.activeElement === node), true, "CTA link is not keyboard focusable");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaReady === "true");
    const reduced = await page.evaluate(() => {
      const copy = document.querySelector("[data-advertising-grid-cta] .detail-cta__copy");
      const frame = document.querySelector("[data-advertising-cta-frame]");
      return { copyOpacity: getComputedStyle(copy).opacity, frameTransition: getComputedStyle(frame).transitionDuration };
    });
    assert.equal(reduced.copyOpacity, "1", "reduced motion hid CTA copy");
    assert.equal(reduced.frameTransition, "0s", "reduced motion retained skeleton animation");

    stage("detail-cleanup-restore");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id, { scrollIntoView: true }), A);
    await page.locator(`[data-advertising-card="${A}"] > a`).click();
    await ready(page, A);
    assert.deepEqual(await page.evaluate(() => {
      const skeleton = document.querySelector("[data-advertising-cta-skeleton]");
      return { hidden: skeleton?.hidden, frames: skeleton?.childElementCount };
    }), { hidden: true, frames: 0 }, "detail retained grid CTA skeleton");
    await page.goBack();
    await page.waitForFunction(() => document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaReady === "true");
    const restored = await readCta();
    assertCta(restored, "restored");
    return { matrix, initial, titleMotion, filtered, resized, reduced, restored };
  });

  await caseRun("square-controls-hover-and-return", { width: 1440, height: 900 }, async (page, stage) => {
    const assertNoBack = async () => assert.equal(await page.locator("[data-advertising-photo-return]").count(), 0, "standalone Back must be removed");
    stage("parent-no-back");
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
    await assertNoBack();
    stage("open-B"); await openA(page); await chooseB(page); await ready(page, B);
    const expandControl = page.locator("[data-advertising-photo-expand]");
    await assertNoBack();

    const compact = await expandControl.evaluate((node) => ({
      expandBorderRadius: getComputedStyle(node).borderRadius,
      expandRect: node.getBoundingClientRect().toJSON(),
    }));
    assert.equal(compact.expandBorderRadius, "0px");
    assert(Math.abs(compact.expandRect.width - 48) <= 0.1 && Math.abs(compact.expandRect.height - 48) <= 0.1);
    stage("hover-labels");
    await expandControl.hover(); await page.waitForTimeout(300);
    const expandHover = await expandControl.evaluate((node) => ({
      labelOpacity: getComputedStyle(node.querySelector("span")).opacity,
      rect: node.getBoundingClientRect().toJSON(),
      transitionDuration: getComputedStyle(node).transitionDuration,
    }));
    assert(expandHover.rect.width > compact.expandRect.width + 80, "expand label did not reveal to left");
    assert(Math.abs(expandHover.rect.right - compact.expandRect.right) <= 0.1, "expand control moved its right anchor");
    assert.equal(expandHover.labelOpacity, "1");
    assert(expandHover.transitionDuration.includes("0.25s"));

    stage("keyboard-and-reduced-motion");
    await page.mouse.move(1200, 300); await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press("Tab"); await expandControl.focus();
    assert.deepEqual(await expandControl.evaluate((node) => ({
      active: document.activeElement === node,
      focusVisible: node.matches(":focus-visible"),
      tabIndex: node.tabIndex,
    })), { active: true, focusVisible: true, tabIndex: 0 });
    await page.waitForTimeout(300);
    assert.equal(await expandControl.evaluate((node) => getComputedStyle(node.querySelector("span")).opacity), "1");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const reducedMotion = await expandControl.evaluate((node) => ({
      labelOpacity: getComputedStyle(node.querySelector("span")).opacity,
      transitionDuration: getComputedStyle(node).transitionDuration,
    }));
    assert.equal(reducedMotion.labelOpacity, "1"); assert.equal(reducedMotion.transitionDuration, "0s");
    await page.emulateMedia({ reducedMotion: "no-preference" });

    stage("viewer-controls"); await expandControl.click();
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.open);
    await assertNoBack();
    const viewerControls = await page.evaluate(() => [...document.querySelectorAll(
      "[data-advertising-photo-close], [data-advertising-photo-zoom-reset], [data-advertising-photo-zoom-in], [data-advertising-photo-zoom-out]",
    )].map((node) => ({
      disabled: node.disabled,
      hidden: node.hidden,
      rect: node.getBoundingClientRect().toJSON(),
      radius: getComputedStyle(node).borderRadius,
      stroke: getComputedStyle(node.querySelector("svg")).strokeWidth,
    })));
    for (const control of viewerControls.filter((control) => !control.hidden)) {
      assert(Math.abs(control.rect.width - 48) <= 0.1 && Math.abs(control.rect.height - 48) <= 0.1);
      assert.equal(control.radius, "0px"); assert.equal(control.stroke, "1.5px");
    }
    const zoomOut = page.locator("[data-advertising-photo-zoom-out]");
    const disabledBackground = await zoomOut.evaluate((node) => getComputedStyle(node).backgroundColor);
    await zoomOut.hover(); await page.waitForTimeout(300);
    assert.equal(await zoomOut.evaluate((node) => getComputedStyle(node).backgroundColor), disabledBackground,
      "disabled zoom-out received active hover treatment");
    const zoomIn = page.locator("[data-advertising-photo-zoom-in]");
    const zoomBackground = await zoomIn.evaluate((node) => getComputedStyle(node).backgroundColor);
    await zoomIn.hover(); await page.waitForTimeout(300);
    assert.notEqual(await zoomIn.evaluate((node) => getComputedStyle(node).backgroundColor), zoomBackground);
    await zoomIn.click(); await zoomIn.click();
    const reset = page.locator("[data-advertising-photo-zoom-reset]");
    await reset.waitFor({ state: "visible" });
    const resetGlyph = await reset.locator("svg").evaluate((node) => ({
      paths: [...node.querySelectorAll("path")].map((path) => path.getAttribute("d")),
      rect: node.getBoundingClientRect().toJSON(),
    }));
    assert.deepEqual(resetGlyph.paths, ["M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"],
      "reset icon must use the matching low-detail diagonal-arrow glyph");
    assert(Math.abs(resetGlyph.rect.width - 24) <= 0.1 && Math.abs(resetGlyph.rect.height - 24) <= 0.1,
      "reset glyph must keep the shared 24px viewer-control size");
    await page.locator("[data-advertising-photo-close]").click();
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-dialog]")?.open);
    assert.equal(new URL(page.url()).searchParams.get("photo"), B, "viewer close left photo detail");
    await assertNoBack();

    stage("browser-back-forward-chain");
    await page.goBack(); await ready(page, A); await assertNoBack();
    await page.goBack();
    await page.waitForFunction((id) => !new URL(location.href).searchParams.has("photo")
      && document.activeElement?.closest("[data-advertising-card]")?.dataset.advertisingCard === id, A);
    await assertNoBack();
    await page.goForward(); await ready(page, A);
    await page.goForward(); await ready(page, B);

    stage("navbar-return-current-photo");
    await page.locator('[data-site-header] a[href="/vi/advertising-products/"]').click();
    await page.waitForFunction((id) => !new URL(location.href).searchParams.has("photo")
      && document.activeElement?.closest("[data-advertising-card]")?.dataset.advertisingCard === id, B);
    await assertNoBack();

    stage("direct-photo-navbar-fallback");
    await page.goto(href(`/vi/advertising-products/?photo=${B}`), { waitUntil: "domcontentloaded" });
    await ready(page, B);
    await page.locator('[data-site-header] a[href="/vi/advertising-products/"]').click();
    await page.waitForFunction((id) => !new URL(location.href).searchParams.has("photo")
      && document.activeElement?.closest("[data-advertising-card]")?.dataset.advertisingCard === id, B);
    await assertNoBack();

    stage("different-route-unmount");
    await page.goto(href(`/vi/advertising-products/?photo=${B}`), { waitUntil: "domcontentloaded" });
    await ready(page, B);
    await page.locator('[data-site-header] a[href="/vi/commercial/"]').click();
    await page.waitForFunction(() => document.querySelector('[data-barba="container"]')?.dataset.barbaNamespace === "commercial");
    await assertNoBack();
    return { compact, expandHover, reducedMotion, viewerControls };
  });

  await caseRun("skeleton-global-boundary-fade", { width: 1440, height: 900 }, async (page, stage) => {
    stage("grid-skeleton-only");
    await page.goto(href("/vi/advertising-products/"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaReady === "true");
    const state = await page.evaluate(() => {
      const skeleton = document.querySelector("[data-advertising-cta-skeleton]");
      const frames = [...document.querySelectorAll("[data-advertising-cta-frame]")];
      const stateOf = (node) => {
        const style = getComputedStyle(node);
        return {
          animationName: style.animationName,
          maskImage: style.maskImage,
          transform: style.transform,
        };
      };
      return {
        skeleton: stateOf(skeleton),
        frames: frames.map((frame) => ({
          ...stateOf(frame),
          surface: stateOf(frame.querySelector(".advertising-grid__cta-surface")),
        })),
        photoBackdrop: document.querySelector("[data-advertising-photo-background]")?.getAnimations().length ?? 0,
      };
    });
    assert.match(state.skeleton.maskImage, /linear-gradient/i,
      "skeleton fade must be one global-space mask on its container");
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
