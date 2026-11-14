// Shared helper for browser tests (ci-test-suites R12). Not a test: the name has no `.e2e.` or `.test.`, so no runner collects it.
import path from "node:path";

export const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8787";

export const VIEWPORTS = Object.freeze({
  desktop: Object.freeze({ width: 1440, height: 900 }),
  phone: Object.freeze({ width: 390, height: 844, isMobile: true, hasTouch: true }),
  a04s: Object.freeze({ width: 384, height: 724, deviceScaleFactor: 1.875, isMobile: true, hasTouch: true }),
});

// Width band every web UI task must check (AGENTS.md principles, evidence-qa-handoff step 5): phone, tablet, laptop, wide PC.
export const SWEEP_WIDTHS = Object.freeze([384, 768, 1024, 1280, 1440, 1920]);

// Viewport for any width: under 600px it is a touch phone (overlay scrollbar, takes no width), like a real device.
export const viewportAt = (width, height = 900) => (width < 600
  ? { width, height, isMobile: true, hasTouch: true }
  : { width, height });

// The browsers path must be set before the dynamic import: Playwright reads it once, when the module loads.
export async function launchBrowser(options) {
  process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
  const { chromium } = await import("playwright");
  return chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined, ...options });
}

// A viewport entry carries the size plus the device options (isMobile, hasTouch, deviceScaleFactor) for the context.
export async function openPage(browser, viewport, contextOptions) {
  const { width, height, ...device } = viewport;
  const context = await browser.newContext({ viewport: { width, height }, ...device, ...contextOptions });
  return { context, page: await context.newPage() };
}

export const frames = (page, count = 2) => page.evaluate(async (n) => {
  for (let i = 0; i < n; i++) await new Promise(requestAnimationFrame);
}, count);

// Wait for all running CSS transitions to end instead of a fixed sleep: two frames for style recalculation to start the
// transition, then wait until no transition is running (including the delay phase).
export const settleTransitions = async (page) => {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(() => !document.getAnimations()
    .some((animation) => animation instanceof CSSTransition && animation.playState === "running"), null, { timeout: 5_000 });
};

// Pins the masonry random order (media-card R4) for every direct visit in this page or context, so a test that needs a
// given layout does not depend on the per-visit seed. It writes the same sessionStorage handoff the language switch uses
// (VISIT_SEED_HANDOFF_KEY in src/site/masonry/runtime.mjs, which cannot be imported in Node). The runtime reads it only
// on a "navigate" load, so reload still reseeds and Back still restores the history seed, as in production.
export const pinBrowseSeed = (target, seed) => target.addInitScript(([key, value]) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ version: 1, url: location.href.split("#")[0], seed: value, expiresAt: Date.now() + 30_000 }));
  } catch { /* Storage blocked: the visit keeps its random seed. */ }
}, ["tt-advertising-visit-seed-handoff-v1", seed]);
