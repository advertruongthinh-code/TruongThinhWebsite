// Direct photo entry solves related in a module Worker (docs/specs/advertising-detail.md R7):
// W1 the Worker result equals the main-thread layout, W2 any Worker failure falls back to the
// main thread, W3 a reply for a stale input is dropped and the Worker is terminated.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
const selectedCase = process.env.CASE || "";
const seedKey = "tt-advertising-visit-seed-handoff-v1";
const seed = "related-worker-e2e";
const photoRoute = "/vi/advertising-products/?photo=kiosk-posm-10";
const mobile = { width: 390, height: 844 };
const tablet = { width: 800, height: 1180 };
const desktop = { width: 1569, height: 912 };
// Chromium reports the aborted Worker script fetch once; nothing else may reach the console.
const failedRequest = "console:Failed to load resource: net::ERR_FAILED";
const browser = await chromium.launch({ headless: true });
const started = Date.now();
let failed = false;

// worker: "allow" | "abort" (fail the Worker's script fetch) | "absent" (no Worker API) | "hold" (fetch waits for release()).
async function open(viewport, route, { worker = "allow" } = {}) {
  const context = await browser.newContext({ viewport, locale: "vi-VN" });
  const page = await context.newPage();
  const issues = [];
  page.on("pageerror", (error) => issues.push(`pageerror:${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") issues.push(`console:${message.text()}`); });
  const url = new URL(route, baseUrl).href;
  // Pin the visit seed through the runtime handoff so every load gets the same related order.
  await page.addInitScript(({ key, url, value }) => {
    sessionStorage.setItem(key, JSON.stringify({ version: 1, url, seed: value, expiresAt: Date.now() + 30_000 }));
  }, { key: seedKey, url, value: seed });
  const run = { context, page, issues, blocked: false };
  if (worker === "absent") await page.addInitScript(() => { window.Worker = undefined; });
  if (worker === "hold") {
    // Records each Worker reply so the case proves a solved layout arrived and was dropped.
    await page.addInitScript(() => {
      const NativeWorker = window.Worker;
      window.__ttWorkerReplies = [];
      window.Worker = class extends NativeWorker {
        constructor(...args) {
          super(...args);
          this.addEventListener("message", ({ data }) => window.__ttWorkerReplies.push(Boolean(data?.solved)));
        }
      };
    });
    run.gate = new Promise((resolve) => { run.release = resolve; });
    run.held = new Promise((resolve) => { run.hold = resolve; });
    run.closed = new Promise((resolve) => page.on("worker", (handle) => handle.on("close", resolve)));
  }
  if (worker === "abort" || worker === "hold") {
    // The page imports related-layout.mjs as a module first; the second request is the Worker's script.
    let requests = 0;
    await page.route("**/advertising-products/related-layout.mjs", async (route) => {
      if (++requests !== 2) return route.continue();
      run.blocked = true;
      if (worker === "abort") return route.abort();
      run.hold();
      await run.gate;
      return route.continue();
    });
  }
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return run;
}

const marks = (page) => page.evaluate(() => ({
  worker: performance.getEntriesByName("advertising-related:worker").length,
  main: performance.getEntriesByName("advertising-related:main").length,
}));

async function assertSeed(page) {
  await page.waitForFunction(() => window.TruongThinhAdvertising?.getBrowseState?.());
  assert.equal(await page.evaluate(() => window.TruongThinhAdvertising.getBrowseState().seed), seed, "pinned visit seed was not consumed");
}

const readRelated = () => {
  const view = document.querySelector("[data-advertising-photo-view]");
  const grid = view.querySelector("[data-advertising-photo-related-grid]");
  const canvas = view.querySelector("[data-advertising-photo-canvas]");
  const suggestion = view.querySelector("[data-advertising-photo-suggestion]");
  const origin = grid.getBoundingClientRect();
  const box = (node) => {
    const rect = node.getBoundingClientRect();
    return { left: node.style.left, top: node.style.top, x: rect.left - origin.left, y: rect.top - origin.top,
      width: rect.width, height: rect.height, setsize: node.getAttribute("aria-setsize"), posinset: node.getAttribute("aria-posinset") };
  };
  return {
    cards: [...grid.querySelectorAll("[data-advertising-related-card]")]
      .map((node) => ({ id: node.dataset.advertisingRelatedCard, hidden: node.hidden, ...box(node) })),
    relatedHeight: grid.style.getPropertyValue("--advertising-photo-related-height"),
    canvasHeight: canvas.style.getPropertyValue("--advertising-photo-canvas-height"),
    columns: grid.dataset.advertisingRelatedColumns,
    indicatorHidden: view.querySelector("[data-advertising-photo-description-indicator]").hidden,
    suggestion: { hidden: suggestion.hidden, inGrid: suggestion.parentElement === grid, ...box(suggestion) },
  };
};

// Veil lifted, cards mounted, no masonry transition left, and two reads a frame pair apart agree.
async function settledRelated(page) {
  await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
    && document.querySelector("[data-advertising-related-card]:not([hidden])")
    && [...document.querySelectorAll("[data-advertising-photo-related-grid] > *")].every((node) => node.getAnimations().length === 0),
  null, { timeout: 10_000 });
  for (let previous = null; ;) {
    const current = await page.evaluate(readRelated);
    if (previous && JSON.stringify(previous) === JSON.stringify(current)) return current;
    previous = current;
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
}

// A direct load of the same URL with the Worker script blocked: the main-thread reference layout.
async function mainReference(viewport, route) {
  const run = await open(viewport, route, { worker: "abort" });
  try {
    await assertSeed(run.page);
    const snapshot = await settledRelated(run.page);
    assert.ok(run.blocked, "reference load did not block the Worker script");
    assert.deepEqual(await marks(run.page), { worker: 0, main: 1 });
    assertIssues(run.issues, true);
    return snapshot;
  } finally { await run.context.close(); }
}

function assertIssues(issues, allowFailedRequest = false) {
  const allowed = allowFailedRequest ? [failedRequest] : [];
  assert.deepEqual(issues.filter((issue) => !allowed.includes(issue)), [], `runtime diagnostics: ${issues.join(" | ")}`);
  assert.ok(issues.length <= 1, `expected at most one failed request: ${issues.join(" | ")}`);
}

async function caseRun(name, fn) {
  if (selectedCase && !name.startsWith(selectedCase)) return;
  try {
    const evidence = await fn();
    console.log(`PASS ${name}${evidence ? ` ${JSON.stringify(evidence)}` : ""}`);
  } catch (error) {
    failed = true;
    console.log(`FAIL ${name}\n${error?.stack || error}`);
  }
}

try {
  for (const viewport of [mobile, desktop]) {
    await caseRun(`w1-worker-path-${viewport.width}x${viewport.height}`, async () => {
      const run = await open(viewport, photoRoute);
      let snapshot;
      try {
        await assertSeed(run.page);
        snapshot = await settledRelated(run.page);
        assert.deepEqual(await marks(run.page), { worker: 1, main: 0 }, "Worker result was not used");
        assertIssues(run.issues);
      } finally { await run.context.close(); }
      assert.ok(snapshot.cards.some((card) => !card.hidden), "no related card mounted");
      if (viewport === mobile) assert.ok(snapshot.suggestion.inGrid && !snapshot.suggestion.hidden, "suggestion is not a related card");
      assert.deepEqual(await mainReference(viewport, photoRoute), snapshot, "Worker and main-thread layouts differ");
      return { cards: snapshot.cards.length, columns: snapshot.columns, height: snapshot.relatedHeight };
    });
  }

  for (const worker of ["abort", "absent"]) {
    await caseRun(`w2-fail-open-${worker}`, async () => {
      const run = await open(mobile, photoRoute, { worker });
      try {
        await assertSeed(run.page);
        const snapshot = await settledRelated(run.page);
        if (worker === "abort") assert.ok(run.blocked, "Worker script request was not aborted");
        assert.deepEqual(await marks(run.page), { worker: 0, main: 1 });
        assertIssues(run.issues, worker === "abort");
        return { cards: snapshot.cards.filter((card) => !card.hidden).length, issues: run.issues };
      } finally { await run.context.close(); }
    });
  }

  const staleActions = {
    escape: (page) => page.keyboard.press("Escape"),
    resize: (page) => page.setViewportSize(tablet),
    // The route veil takes pointer input, so the toggle goes through the public API like motion.js.
    tag: (page) => page.evaluate(() => {
      const tag = document.querySelector("[data-advertising-suggestion-tag]")?.dataset.advertisingSuggestionTag;
      if (!tag || !window.TruongThinhAdvertising.replaceTag(tag)) throw new Error("no suggestion tag to toggle");
    }),
  };
  for (const [action, act] of Object.entries(staleActions)) {
    await caseRun(`w3-stale-${action}`, async () => {
      const run = await open(mobile, photoRoute, { worker: "hold" });
      let current;
      try {
        const { page } = run;
        await run.held;
        await assertSeed(page);
        // Primary laid out under the veil, related still empty: the solver input is recorded and the Worker waits.
        await page.waitForFunction(() => {
          const view = document.querySelector("[data-advertising-photo-view]");
          return view && !view.hidden && view.style.getPropertyValue("--advertising-photo-primary-height")
            && document.documentElement.classList.contains("route-enter")
            && !document.querySelector("[data-advertising-related-card]");
        }, null, { polling: "raf" });
        await act(page);
        const releasedAt = await page.evaluate(() => performance.now());
        run.release();
        await run.closed;
        const liftedAt = await (await page.waitForFunction(
          () => !document.documentElement.classList.contains("route-enter") && performance.now(),
          null, { polling: "raf", timeout: 5_000 })).jsonValue();
        assert.deepEqual(await page.evaluate(() => window.__ttWorkerReplies), [true], "Worker did not reply for the stale input");
        if (action === "escape") {
          await page.waitForFunction(() => document.querySelectorAll("[data-project-grid] .advertising-tile").length > 0);
          const state = await page.evaluate(() => ({
            photo: new URL(location.href).searchParams.get("photo"),
            gridShown: !document.querySelector("[data-project-grid]").closest(".project-index").hidden
              && document.querySelector("[data-project-grid]").checkVisibility(),
            photoViewHidden: document.querySelector("[data-advertising-photo-view]").hidden,
            visibleRelated: [...document.querySelectorAll("[data-advertising-related-card]")].filter((node) => node.checkVisibility()).length,
          }));
          assert.deepEqual(state, { photo: null, gridShown: true, photoViewHidden: true, visibleRelated: 0 });
          assert.equal((await marks(page)).worker, 0, "stale Worker result was applied");
          assertIssues(run.issues);
          return { veilMs: Math.round(liftedAt - releasedAt) };
        }
        current = { url: page.url(), snapshot: await settledRelated(page), veilMs: Math.round(liftedAt - releasedAt) };
        assert.deepEqual(await marks(page), { worker: 0, main: 1 }, "stale Worker result was applied");
        assert.ok(current.veilMs <= 1500, `route veil lifted ${current.veilMs}ms after release`);
        assertIssues(run.issues);
      } finally { await run.context.close(); }
      const reference = await mainReference(action === "resize" ? tablet : mobile, current.url);
      assert.deepEqual(current.snapshot, reference, "related grid differs from a fresh load of the current state");
      return { url: current.url.replace(baseUrl, ""), cards: reference.cards.length, veilMs: current.veilMs };
    });
  }
} finally {
  await browser.close();
}
console.log(`${failed ? "FAIL" : "PASS"} total ${((Date.now() - started) / 1000).toFixed(1)}s`);
if (failed) process.exitCode = 1;
