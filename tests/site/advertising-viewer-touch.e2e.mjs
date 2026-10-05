// Viewer touch zoom in Chromium (docs/specs/advertising-viewer-touch-zoom.md R1-R6): pinch, rubber band,
// one/two finger hand-off, double tap, stops for buttons, reduced motion. Backdrop swipe and tap (L06) stay in
// advertising-photo-transitions.e2e.mjs. Touch goes through CDP so the
// browser's own touch-to-pointer path runs; BASE_URL may point at a real device's forwarded server.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CARDS } from "../../src/site/advertising-products/catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const card = ADVERTISING_CARDS[0];
const browser = await chromium.launch({ headless: true });

const failures = [];
const check = (condition, message) => condition || failures.push(message);

const readState = () => {
  const dialog = document.querySelector("[data-advertising-photo-dialog]");
  const image = document.querySelector("[data-advertising-photo-expanded-image]");
  const viewport = document.querySelector("[data-advertising-photo-viewport]");
  const matrix = new DOMMatrixReadOnly(getComputedStyle(image).transform);
  const box = viewport.getBoundingClientRect();
  return {
    scale: matrix.a, x: matrix.m41, y: matrix.m42,
    cx: box.left + box.width / 2, cy: box.top + box.height / 2,
    fitW: image.clientWidth, fitH: image.clientHeight, vw: viewport.clientWidth, vh: viewport.clientHeight,
    cover: Math.max(viewport.clientWidth / image.clientWidth, viewport.clientHeight / image.clientHeight),
    open: dialog.open, phase: dialog.dataset.advertisingViewerState,
    status: document.querySelector("[data-advertising-photo-zoom-status]").textContent,
    plusDisabled: document.querySelector("[data-advertising-photo-zoom-in]").disabled,
    minusDisabled: document.querySelector("[data-advertising-photo-zoom-out]").disabled,
    resetDisabled: document.querySelector("[data-advertising-photo-zoom-reset]").disabled,
    scroll: window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY,
    pageZoom: visualViewport.scale,
    animations: image.getAnimations().length,
  };
};

const near = (a, b, tolerance = 0.01) => Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(b));
const limits = (state, scale = state.scale) => ({
  x: Math.max(0, (state.fitW * scale - state.vw) / 2),
  y: Math.max(0, (state.fitH * scale - state.vh) / 2),
});

// The image point under `from` (before) must sit under `to` (after) on every axis the pan limit did not clamp.
function checkAnchor(before, after, from, to, label) {
  const bound = limits(after);
  for (const [axis, centre, pan] of [["x", "cx", "x"], ["y", "cy", "y"]]) {
    const local = (from[axis] - before[centre] - before[pan]) / before.scale;
    const desired = to[axis] - after[centre] - after.scale * local;
    if (Math.abs(desired) > bound[axis] - 0.5) continue;
    const drift = after[centre] + after[pan] + after.scale * local - to[axis];
    check(Math.abs(drift) <= 1, `${label}: anchor drifted ${drift.toFixed(2)}px on ${axis}`);
  }
}

async function openViewer(page) {
  await page.waitForFunction(() => {
    const image = document.querySelector("[data-advertising-photo-image]");
    return image?.complete && image.naturalWidth > 0;
  });
  await page.locator("[data-advertising-photo-expand]").tap();
  await settled(page);
}

// Reset is disabled at Fit, so click it only when there is something to reset.
async function resetZoom(page) {
  await page.evaluate(() => {
    const reset = document.querySelector("[data-advertising-photo-zoom-reset]");
    if (!reset.disabled) reset.click();
  });
  await settled(page);
}

const settled = (page) => page.waitForFunction(() => {
  const dialog = document.querySelector("[data-advertising-photo-dialog]");
  return dialog?.open && dialog.dataset.advertisingViewerState === "open"
    && document.querySelector("[data-advertising-photo-expanded-image]").getAnimations().length === 0;
});

// Pointer events from CDP touches land on the next frames, so each send waits two frames before returning.
function touchDriver(page, cdp) {
  const send = async (type, touchPoints) => {
    await cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  const pair = (centre, distance) => [
    { x: centre.x - distance / 2, y: centre.y, id: 1 },
    { x: centre.x + distance / 2, y: centre.y, id: 2 },
  ];
  return {
    send,
    pair,
    // Two fingers spread from `from` to `to` px apart around `centre`, released unless `hold`.
    async pinch(centre, from, to, { hold = false, steps = 8 } = {}) {
      await send("touchStart", [pair(centre, from)[0]]);
      await send("touchStart", pair(centre, from));
      for (let step = 1; step <= steps; step += 1) await send("touchMove", pair(centre, from + (to - from) * step / steps));
      if (!hold) await send("touchEnd", []);
    },
    async doubleTap(point) {
      for (let tap = 0; tap < 2; tap += 1) {
        await send("touchStart", [{ ...point, id: 1 }]);
        await send("touchEnd", []);
      }
    },
  };
}

async function runPhone({ locale, width, height }) {
  const label = `${locale} ${width}x${height}`;
  const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/${locale}/advertising-products/?photo=${card.id}`, { waitUntil: "domcontentloaded" });
  await openViewer(page);
  const touch = touchDriver(page, await context.newCDPSession(page));
  const state = () => page.evaluate(readState);
  const start = await state();
  const centre = { x: start.cx + 24, y: start.cy + 18 };

  // R1 + R5: pinch 100 -> 200px gives s = 2 under the fingers; status waits for the release.
  await touch.pinch(centre, 100, 200, { hold: true });
  const holding = await state();
  check(near(holding.scale, 2), `${label} R1: pinch 100->200 gave scale ${holding.scale}`);
  check(holding.status === start.status, `${label} R5: status changed mid-pinch (${holding.status})`);
  checkAnchor(start, holding, centre, centre, `${label} R1`);
  await touch.send("touchEnd", []);
  await settled(page);
  const pinched = await state();
  check(pinched.status === `${Math.round(pinched.scale * 100)}%`, `${label} R5: status ${pinched.status} after release`);
  check(pinched.open && pinched.scroll === start.scroll && pinched.pageZoom === 1,
    `${label} R1: dialog closed, page scrolled or page zoomed`);

  // R5: between Fit and Cover, + goes to Cover and - back to Fit.
  if (pinched.scale < pinched.cover) {
    await page.locator("[data-advertising-photo-zoom-in]").tap();
    await settled(page);
    check(near((await state()).scale, pinched.cover), `${label} R5: + from between stops did not reach Cover`);
    await page.locator("[data-advertising-photo-zoom-out]").tap();
    await settled(page);
    const fit = await state();
    check(near(fit.scale, 1) && fit.minusDisabled && fit.resetDisabled, `${label} R5: - did not return to Fit`);
  }

  // R2: pinch far past Max holds at most 15% over, then springs back to Max.
  await resetZoom(page);
  await touch.pinch(centre, 30, 300, { hold: true });
  const over = await state();
  const max = 2 * over.cover;
  // Cover here comes from rounded clientWidth, the runtime's from the float fit size: allow 1%.
  check(over.scale > max && over.scale <= max * 1.15 * 1.01, `${label} R2: over Max held at ${over.scale} (Max ${max})`);
  await touch.send("touchEnd", []);
  await settled(page);
  const atMax = await state();
  check(near(atMax.scale, max) && atMax.plusDisabled, `${label} R2: release over Max settled at ${atMax.scale}`);

  // R2: pinch in below Fit holds at least 0.85, then springs back to Fit centred.
  await resetZoom(page);
  await touch.pinch(centre, 300, 40, { hold: true });
  const under = await state();
  check(under.scale < 1 && under.scale >= 0.85 - 1e-6, `${label} R2: under Fit held at ${under.scale}`);
  await touch.send("touchEnd", []);
  await settled(page);
  const back = await state();
  check(back.scale === 1 && back.x === 0 && back.y === 0 && back.open, `${label} R2: release under Fit settled at ${back.scale}`);

  // R3: one finger pans, a second finger joins and leaves without a jump, the last finger keeps panning.
  await touch.pinch(centre, 100, 180);
  await settled(page);
  const before = await state();
  const finger = { x: centre.x, y: centre.y, id: 1 };
  await touch.send("touchStart", [finger]);
  await touch.send("touchMove", [{ ...finger, x: finger.x + 20, y: finger.y + 12 }]);
  const panned = await state();
  const bound = limits(before);
  check(Math.abs(panned.x - before.x) > 1 || Math.abs(panned.y - before.y) > 1 || (bound.x < 1 && bound.y < 1),
    `${label} R3: one finger did not pan`);
  const second = { x: finger.x + 120, y: finger.y + 40, id: 2 };
  await touch.send("touchStart", [{ ...finger, x: finger.x + 20, y: finger.y + 12 }, second]);
  const joined = await state();
  check(Math.abs(joined.x - panned.x) <= 1 && Math.abs(joined.y - panned.y) <= 1 && near(joined.scale, panned.scale),
    `${label} R3: second finger made the image jump`);
  await touch.send("touchEnd", [second]);
  const left = await state();
  check(Math.abs(left.x - joined.x) <= 1 && Math.abs(left.y - joined.y) <= 1, `${label} R3: lifting a finger made the image jump`);
  await touch.send("touchMove", [{ ...finger, x: finger.x - 10, y: finger.y - 6 }]);
  const kept = await state();
  check(Math.abs(kept.x - left.x) > 1 || Math.abs(kept.y - left.y) > 1 || (bound.x < 1 && bound.y < 1),
    `${label} R3: remaining finger stopped panning`);
  await touch.send("touchEnd", []);
  await settled(page);

  // R4: double tap Fit -> Cover at the tap point, then back to Fit centred; a single tap does nothing.
  await resetZoom(page);
  const fit = await state();
  const tapPoint = { x: Math.round(fit.cx + fit.fitW * 0.25), y: Math.round(fit.cy + fit.fitH * 0.2) };
  await touch.doubleTap(tapPoint);
  await settled(page);
  const covered = await state();
  check(near(covered.scale, covered.cover), `${label} R4: double tap at Fit gave ${covered.scale}, Cover ${covered.cover}`);
  checkAnchor(fit, covered, tapPoint, tapPoint, `${label} R4`);
  await touch.doubleTap(tapPoint);
  await settled(page);
  const unzoomed = await state();
  check(unzoomed.scale === 1 && unzoomed.x === 0 && unzoomed.y === 0 && unzoomed.open, `${label} R4: second double tap did not return to Fit`);
  await touch.send("touchStart", [{ ...tapPoint, id: 1 }]);
  await touch.send("touchEnd", []);
  await page.waitForTimeout(400);
  const single = await state();
  check(single.scale === 1 && single.open, `${label} R4: single tap on the image changed the viewer`);

  check(errors.length === 0, `${label}: page errors ${errors.join(" | ")}`);
  await context.close();
}

// R6: touching mid zoom animation starts from the displayed transform; reduced motion double tap is instant.
async function runMotion() {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const label = `motion ${reducedMotion}`;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion });
    const page = await context.newPage();
    await page.goto(`${origin}/en/advertising-products/?photo=${card.id}`, { waitUntil: "domcontentloaded" });
    await openViewer(page);
    const touch = touchDriver(page, await context.newCDPSession(page));
    if (reducedMotion === "reduce") {
      const fit = await page.evaluate(readState);
      await touch.doubleTap({ x: Math.round(fit.cx), y: Math.round(fit.cy) });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
      const after = await page.evaluate(readState);
      check(near(after.scale, after.cover) && after.animations === 0, `${label}: double tap animated or missed Cover (${after.scale})`);
    } else {
      // Click + and start a pinch two frames later, inside the 200ms zoom, in one task so timing is fixed.
      const sample = await page.evaluate(async () => {
        const image = document.querySelector("[data-advertising-photo-expanded-image]");
        const viewport = document.querySelector("[data-advertising-photo-viewport]");
        const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
        document.querySelector("[data-advertising-photo-zoom-in]").click();
        await frame();
        await frame();
        const shown = new DOMMatrixReadOnly(getComputedStyle(image).transform);
        const box = viewport.getBoundingClientRect();
        const pointer = (type, id, x) => viewport.dispatchEvent(new PointerEvent(type, {
          bubbles: true, cancelable: true, pointerType: "touch", pointerId: id, isPrimary: id === 1,
          clientX: box.left + box.width / 2 + x, clientY: box.top + box.height / 2,
        }));
        pointer("pointerdown", 1, -40);
        pointer("pointerdown", 2, 40);
        const adopted = new DOMMatrixReadOnly(getComputedStyle(image).transform);
        const phase = document.querySelector("[data-advertising-photo-dialog]").dataset.advertisingViewerState;
        const running = image.getAnimations().length;
        pointer("pointerup", 2, 40);
        pointer("pointerup", 1, -40);
        return { shown: shown.a, adopted: adopted.a, x: adopted.m41 - shown.m41, y: adopted.m42 - shown.m42, phase, running };
      });
      check(sample.shown > 1 && sample.phase === "open" && sample.running === 0
        && Math.abs(sample.adopted - sample.shown) < 0.005 && Math.abs(sample.x) <= 1 && Math.abs(sample.y) <= 1,
        `${label}: touch mid zoom jumped ${JSON.stringify(sample)}`);
    }
    await context.close();
  }
}

// Desktop keeps mouse behaviour: double-click on the image does not zoom.
async function runDesktop() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${origin}/vi/advertising-products/?photo=${card.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-image]")?.complete);
  await page.locator("[data-advertising-photo-expand]").click();
  await settled(page);
  await page.locator("[data-advertising-photo-expanded-image]").dblclick();
  await page.waitForTimeout(300);
  const state = await page.evaluate(readState);
  check(state.scale === 1 && state.open, `desktop: double-click changed the viewer (${state.scale})`);
  await context.close();
}

try {
  await runPhone({ locale: "vi", width: 390, height: 844 });
  await runPhone({ locale: "en", width: 844, height: 390 });
  await runMotion();
  await runDesktop();
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], failures.join("\n"));
console.log("advertising-viewer-touch: PASS");
