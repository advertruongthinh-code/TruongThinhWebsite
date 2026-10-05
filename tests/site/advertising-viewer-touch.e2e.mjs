// Viewer touch zoom in Chromium (docs/specs/advertising-viewer-touch-zoom.md R1-R6): pinch, rubber band,
// one/two finger hand-off, double tap, stops for buttons, reduced motion. Backdrop swipe and tap (L06) stay in
// advertising-photo-transitions.e2e.mjs. Touch goes through CDP so the
// browser's own touch-to-pointer path runs. DEVICE_CDP (http://127.0.0.1:9222 after `adb forward tcp:9222
// localabstract:chrome_devtools_remote`, with `adb reverse tcp:8787 tcp:8787`) drives a real phone's Chrome instead,
// in whatever orientation the phone is held.
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
const device = process.env.DEVICE_CDP;
const browser = device ? await chromium.connectOverCDP(device) : await chromium.launch({ headless: true });

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

// A phone page and its CDP session. On a real phone each run gets a fresh tab on the phone's own screen:
// emulating another size there misplaces touches, and reloading a zoomed tab restores its page zoom.
async function phonePage({ width, height, reducedMotion = "no-preference" }) {
  const context = device ? browser.contexts()[0]
    : await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion });
  return { page, cdp: await context.newCDPSession(page), close: () => (device ? page.close() : context.close()) };
}

// The image moved by (dx, dy) on every axis the pan limit leaves free.
function checkMoved(before, after, dx, dy, label) {
  const bound = limits(after);
  for (const [axis, delta] of [["x", dx], ["y", dy]]) {
    if (Math.abs(after[axis]) >= bound[axis] - 0.5) continue;
    const drift = after[axis] - before[axis] - delta;
    check(Math.abs(drift) <= 1, `${label}: image moved ${drift.toFixed(2)}px off the finger on ${axis}`);
  }
}

async function openViewer(page, touch) {
  await page.waitForFunction(() => {
    const image = document.querySelector("[data-advertising-photo-image]");
    return image?.complete && image.naturalWidth > 0;
  });
  await touch.tap(page.locator("[data-advertising-photo-expand]"));
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
  const frames = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const send = async (type, touchPoints) => {
    await cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
    await frames();
  };
  // A page zoomed by an earlier gesture moves every later touch, so stop at the first one.
  const unzoomed = async (what) => {
    const scale = await page.evaluate(() => visualViewport.scale);
    if (scale !== 1) throw new Error(`page zoomed to ${scale} before ${what}`);
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
      await unzoomed("a pinch");
      await send("touchStart", [pair(centre, from)[0]]);
      await send("touchStart", pair(centre, from));
      for (let step = 1; step <= steps; step += 1) await send("touchMove", pair(centre, from + (to - from) * step / steps));
      if (!hold) await send("touchEnd", []);
    },
    // Like Playwright's own tap, wait until the element takes the hit: the route veil covers it first.
    async tap(locator) {
      const point = await (await page.waitForFunction((node) => {
        const box = node.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        return node.contains(document.elementFromPoint(x, y)) && { x, y };
      }, await locator.elementHandle())).jsonValue();
      await send("touchStart", [{ ...point, id: 1 }]);
      await send("touchEnd", []);
    },
    // Sent back to back: over adb, a frame wait per event would stretch the taps past the 300ms window.
    async doubleTap(point) {
      await unzoomed("a double tap");
      for (let tap = 0; tap < 2; tap += 1) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...point, id: 1 }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      }
      await frames();
    },
  };
}

async function runPhone({ locale, width, height }) {
  const { page, cdp, close } = await phonePage({ width, height });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/${locale}/advertising-products/?photo=${card.id}`, { waitUntil: "domcontentloaded" });
  const touch = touchDriver(page, cdp);
  await openViewer(page, touch);
  const state = () => page.evaluate(readState);
  const start = await state();
  const label = `${locale} ${start.vw}x${start.vh}`;
  const centre = { x: start.cx + 24, y: start.cy + 18 };

  // R1 + R5: pinch 100 -> 200px gives s = 2 under the fingers; status waits for the release.
  await touch.pinch(centre, 100, 200, { hold: true });
  const holding = await state();
  check(near(holding.scale, 2), `${label} R1: pinch 100->200 gave scale ${holding.scale}`);
  check(holding.status === start.status, `${label} R5: status changed mid-pinch (${holding.status})`);
  checkAnchor(start, holding, centre, centre, `${label} R1`);
  // R1: a third finger on the image neither pans nor ends the pinch.
  const third = { x: centre.x, y: centre.y + 40, id: 3 };
  await touch.send("touchStart", [...touch.pair(centre, 200), third]);
  await touch.send("touchMove", [...touch.pair(centre, 200), { ...third, x: third.x + 30 }]);
  const tripled = await state();
  check(Math.abs(tripled.x - holding.x) <= 1 && Math.abs(tripled.y - holding.y) <= 1 && near(tripled.scale, holding.scale),
    `${label} R1: third finger moved the image`);
  await touch.send("touchEnd", [{ ...third, x: third.x + 30 }]);
  await touch.send("touchMove", touch.pair(centre, 260));
  check(near((await state()).scale, 2.6), `${label} R1: pinch stopped following after a third finger`);
  await touch.send("touchEnd", []);
  await settled(page);
  const pinched = await state();
  check(pinched.status === `${Math.round(pinched.scale * 100)}%`, `${label} R5: status ${pinched.status} after release`);
  check(pinched.open && pinched.scroll === start.scroll && pinched.pageZoom === 1,
    `${label} R1: dialog closed, page scrolled or page zoomed`);

  // R5: between Fit and Cover, + goes to Cover and - back to Fit.
  await resetZoom(page);
  await touch.pinch(centre, 100, 50 * (1 + start.cover));
  await settled(page);
  const between = await state();
  check(between.scale > 1.05 && between.scale < between.cover * 0.95, `${label} R5: pinch did not stop between stops (${between.scale})`);
  await touch.tap(page.locator("[data-advertising-photo-zoom-in]"));
  await settled(page);
  check(near((await state()).scale, between.cover), `${label} R5: + from between stops did not reach Cover`);
  await touch.tap(page.locator("[data-advertising-photo-zoom-out]"));
  await settled(page);
  const fitAgain = await state();
  check(near(fitAgain.scale, 1) && fitAgain.minusDisabled && fitAgain.resetDisabled, `${label} R5: - did not return to Fit`);

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
  checkAnchor(over, atMax, centre, centre, `${label} R2`);

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
  await touch.pinch(centre, 80, 120 * start.cover);
  await settled(page);
  const before = await state();
  const room = limits(before);
  check(room.x > 60 || room.y > 60, `${label} R3: no room to pan at ${before.scale}`);
  const finger = { x: centre.x, y: centre.y, id: 1 };
  const at = (point, dx, dy) => ({ ...point, x: point.x + dx, y: point.y + dy });
  await touch.send("touchStart", [finger]);
  await touch.send("touchMove", [at(finger, 20, 12)]);
  const panned = await state();
  checkMoved(before, panned, 20, 12, `${label} R3 one finger`);
  const second = { x: finger.x + 120, y: finger.y + 40, id: 2 };
  await touch.send("touchStart", [at(finger, 20, 12), second]);
  const joined = await state();
  check(Math.abs(joined.x - panned.x) <= 1 && Math.abs(joined.y - panned.y) <= 1 && near(joined.scale, panned.scale),
    `${label} R3: second finger made the image jump`);
  // Both fingers slide together: the pinch starts from the panned transform, so the image follows exactly.
  await touch.send("touchMove", [at(finger, 28, 17), at(second, 8, 5)]);
  const slid = await state();
  check(near(slid.scale, joined.scale), `${label} R3: sliding two fingers changed the scale`);
  checkMoved(joined, slid, 8, 5, `${label} R3 two fingers`);
  await touch.send("touchEnd", [at(second, 8, 5)]);
  const left = await state();
  check(Math.abs(left.x - slid.x) <= 1 && Math.abs(left.y - slid.y) <= 1, `${label} R3: lifting a finger made the image jump`);
  await touch.send("touchMove", [at(finger, -10, -6)]);
  const kept = await state();
  checkMoved(left, kept, -38, -23, `${label} R3 remaining finger`);
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
  await close();
}

// R6: touching mid zoom animation starts from the displayed transform; reduced motion double tap is instant.
async function runMotion() {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const label = `motion ${reducedMotion}`;
    const { page, cdp, close } = await phonePage({ width: 390, height: 844, reducedMotion });
    await page.goto(`${origin}/en/advertising-products/?photo=${card.id}`, { waitUntil: "domcontentloaded" });
    const touch = touchDriver(page, cdp);
    await openViewer(page, touch);
    if (reducedMotion === "reduce") {
      const fit = await page.evaluate(readState);
      await touch.doubleTap({ x: Math.round(fit.cx), y: Math.round(fit.cy) });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
      const after = await page.evaluate(readState);
      check(near(after.scale, after.cover) && after.animations === 0 && after.status === `${Math.round(after.scale * 100)}%`
        && !after.minusDisabled && !after.resetDisabled && !after.plusDisabled,
        `${label}: double tap animated or missed Cover ${JSON.stringify(after)}`);
    } else {
      // Click + and start a pinch once the 200ms zoom has visibly moved (a real phone can hold it at 0 for a few frames).
      const sample = await page.evaluate(async () => {
        const image = document.querySelector("[data-advertising-photo-expanded-image]");
        const viewport = document.querySelector("[data-advertising-photo-viewport]");
        const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
        document.querySelector("[data-advertising-photo-zoom-in]").click();
        let shown = new DOMMatrixReadOnly(getComputedStyle(image).transform);
        for (let i = 0; i < 10 && shown.a <= 1; i++) {
          await frame();
          shown = new DOMMatrixReadOnly(getComputedStyle(image).transform);
        }
        const midway = image.getAnimations().length;
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
        return { shown: shown.a, adopted: adopted.a, x: adopted.m41 - shown.m41, y: adopted.m42 - shown.m42, phase, midway, running };
      });
      check(sample.shown > 1 && sample.midway > 0 && sample.phase === "open" && sample.running === 0
        && Math.abs(sample.adopted - sample.shown) < 0.005 && Math.abs(sample.x) <= 1 && Math.abs(sample.y) <= 1,
        `${label}: touch mid zoom jumped ${JSON.stringify(sample)}`);
    }
    await close();
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
  if (!device) await runDesktop();
} catch (error) {
  failures.push(String(error.stack || error));
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], failures.join("\n"));
console.log("advertising-viewer-touch: PASS");
