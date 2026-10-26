// Gesture của viewer trong Chromium (docs/specs/advertising-viewer-touch-zoom.md R1-R11): pinch, rubber band,
// hand-off một/hai ngón, tap để zoom, double tap, điểm dừng cho nút, reduced motion, tap để mở, nút ẩn,
// swipe để đóng, Back đóng, vặn hai ngón để xoay. Swipe và tap trên backdrop (L06) nằm ở
// advertising-photo-transitions.e2e.mjs. Touch đi qua CDP để đường
// touch-to-pointer của chính browser chạy. DEVICE_CDP (http://127.0.0.1:9222 sau `adb forward tcp:9222
// localabstract:chrome_devtools_remote`, kèm `adb reverse tcp:8787 tcp:8787`) điều khiển Chrome của điện thoại thật,
// theo hướng nào điện thoại đang cầm.
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
const browser = device ? await chromium.connectOverCDP(device) : await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

const failures = [];
const check = (condition, message) => condition || failures.push(message);

const readState = () => {
  const dialog = document.querySelector("[data-advertising-photo-dialog]");
  const image = document.querySelector("[data-advertising-photo-expanded-image]");
  const viewport = document.querySelector("[data-advertising-photo-viewport]");
  const matrix = new DOMMatrixReadOnly(getComputedStyle(image).transform);
  const box = viewport.getBoundingClientRect();
  return {
    scale: Math.hypot(matrix.a, matrix.b), angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI,
    x: matrix.m41, y: matrix.m42, inside: (() => {
      const shown = image.getBoundingClientRect();
      return shown.left >= box.left - 1 && shown.right <= box.right + 1 && shown.top >= box.top - 1 && shown.bottom <= box.bottom + 1;
    })(),
    cx: box.left + box.width / 2, cy: box.top + box.height / 2,
    fitW: image.clientWidth, fitH: image.clientHeight, vw: viewport.clientWidth, vh: viewport.clientHeight,
    cover: Math.max(viewport.clientWidth / image.clientWidth, viewport.clientHeight / image.clientHeight),
    open: dialog.open, phase: dialog.dataset.advertisingViewerState,
    status: document.querySelector("[data-advertising-photo-zoom-status]").textContent,
    plusDisabled: document.querySelector("[data-advertising-photo-zoom-in]").disabled,
    minusDisabled: document.querySelector("[data-advertising-photo-zoom-out]").disabled,
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

// Điểm ảnh dưới `from` (trước) phải nằm dưới `to` (sau) trên mọi trục mà pan limit không kẹp.
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

// Một trang phone và CDP session của nó. Trên điện thoại thật mỗi lần chạy lấy một tab mới trên màn hình riêng của máy:
// giả lập kích thước khác ở đó làm lệch touch, và reload tab đang zoom sẽ khôi phục page zoom.
async function phonePage({ width, height, reducedMotion = "no-preference" }) {
  const context = device ? browser.contexts()[0]
    : await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion });
  return { page, cdp: await context.newCDPSession(page), close: () => (device ? page.close() : context.close()) };
}

// Ảnh dịch (dx, dy) trên mọi trục mà pan limit để tự do.
function checkMoved(before, after, dx, dy, label) {
  const bound = limits(after);
  for (const [axis, delta] of [["x", dx], ["y", dy]]) {
    if (Math.abs(after[axis]) >= bound[axis] - 0.5) continue;
    const drift = after[axis] - before[axis] - delta;
    check(Math.abs(drift) <= 1, `${label}: image moved ${drift.toFixed(2)}px off the finger on ${axis}`);
  }
}

// R7: màn cảm ứng mở viewer bằng một tap trên primary photo; `double` mở bằng double tap theo thói quen cũ.
async function openViewer(page, touch, { double = false } = {}) {
  const point = await (await page.waitForFunction(() => {
    const image = document.querySelector("[data-advertising-photo-image]");
    if (!image?.complete || !image.naturalWidth) return false;
    const box = image.getBoundingClientRect();
    const x = Math.round(box.left + box.width / 2);
    const y = Math.round(box.top + box.height / 2);
    return image.parentElement.contains(document.elementFromPoint(x, y)) && { x, y };
  })).jsonValue();
  await (double ? touch.doubleTap(point) : touch.tapAt(point));
  await settled(page);
}

// R8: trên màn cảm ứng nút nằm ngoài tầm nhìn nhưng assistive tech vẫn click được.
const press = (page, hook) => page.evaluate((selector) => document.querySelector(selector).click(), `[${hook}]`);

// Viewer không còn nút reset (owner 2026-10-25): bấm - tới khi về Fit, nút - disable ở Fit.
async function resetZoom(page) {
  while (await page.evaluate(() => {
    const zoomOut = document.querySelector("[data-advertising-photo-zoom-out]");
    return !zoomOut.disabled && (zoomOut.click(), true);
  })) await settled(page);
  await settled(page);
}

const settled = (page) => page.waitForFunction(() => {
  const dialog = document.querySelector("[data-advertising-photo-dialog]");
  return dialog?.open && dialog.dataset.advertisingViewerState === "open"
    && document.querySelector("[data-advertising-photo-expanded-image]").getAnimations().length === 0;
});

// Pointer event từ CDP touch tới ở các frame kế tiếp, nên mỗi lần gửi chờ hai frame rồi mới trả về.
function touchDriver(page, cdp) {
  const frames = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const send = async (type, touchPoints) => {
    await cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
    await frames();
  };
  // Trang bị zoom bởi gesture trước làm lệch mọi touch sau, nên dừng ở lần đầu tiên.
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
    // Hai ngón tay giãn từ `from` đến `to` px quanh `centre`, thả ra trừ khi `hold`.
    async pinch(centre, from, to, { hold = false, steps = 8 } = {}) {
      await unzoomed("a pinch");
      await send("touchStart", [pair(centre, from)[0]]);
      await send("touchStart", pair(centre, from));
      for (let step = 1; step <= steps; step += 1) await send("touchMove", pair(centre, from + (to - from) * step / steps));
      if (!hold) await send("touchEnd", []);
    },
    // Hai ngón cách nhau `distance` quanh `centre`, đường nối quay từ `from` tới `to` độ, thả ra trừ khi `hold`.
    async twist(centre, distance, from, to, { hold = false, steps = 8 } = {}) {
      await unzoomed("a twist");
      const at = (degrees) => {
        const dx = Math.cos(degrees * Math.PI / 180) * distance / 2;
        const dy = Math.sin(degrees * Math.PI / 180) * distance / 2;
        return [{ x: centre.x - dx, y: centre.y - dy, id: 1 }, { x: centre.x + dx, y: centre.y + dy, id: 2 }];
      };
      await send("touchStart", [at(from)[0]]);
      await send("touchStart", at(from));
      for (let step = 1; step <= steps; step += 1) await send("touchMove", at(from + (to - from) * step / steps));
      if (!hold) await send("touchEnd", []);
    },
    async tapAt(point) {
      await send("touchStart", [{ ...point, id: 1 }]);
      await send("touchEnd", []);
    },
    // Như tap của Playwright, chờ đến khi element nhận hit: route veil che nó trước.
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
    // Gửi liên tiếp: qua adb, chờ frame cho mỗi event sẽ kéo giãn các tap vượt cửa sổ 300ms.
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
  await openViewer(page, touch, { double: true });
  const state = () => page.evaluate(readState);
  const start = await state();
  const label = `${locale} ${start.vw}x${start.vh}`;
  // R7, R8: không có nút hiển thị trên primary hay trong viewer, và trang không zoom khi double tap.
  const visibleButtons = await page.evaluate(() => ["expand", "close", "zoom-in", "zoom-out"]
    .filter((hook) => document.querySelector(`[data-advertising-photo-${hook}]`).getBoundingClientRect().width > 1));
  check(visibleButtons.length === 0 && start.pageZoom === 1, `${label} R7/R8: visible ${visibleButtons}, page zoom ${start.pageZoom}`);
  // R4, R7: tap thứ hai của double tap mở viewer bị nuốt, ảnh vẫn ở Fit.
  check(start.scale === 1 && start.x === 0 && start.y === 0, `${label} R7: double tap open zoomed the image ${start.scale}`);
  const centre = { x: start.cx + 24, y: start.cy + 18 };

  // R1 + R5: pinch 100 -> 200px cho s = 2 dưới các ngón; status chờ đến khi thả.
  await touch.pinch(centre, 100, 200, { hold: true });
  const holding = await state();
  check(near(holding.scale, 2), `${label} R1: pinch 100->200 gave scale ${holding.scale}`);
  check(holding.status === start.status, `${label} R5: status changed mid-pinch (${holding.status})`);
  checkAnchor(start, holding, centre, centre, `${label} R1`);
  // R1: ngón thứ ba trên ảnh không pan cũng không kết thúc pinch.
  const third = { x: centre.x, y: centre.y + 40, id: 3 };
  await touch.send("touchStart", [...touch.pair(centre, 200), third]);
  await touch.send("touchMove", [...touch.pair(centre, 200), { ...third, x: third.x + 30 }]);
  const tripled = await state();
  check(Math.abs(tripled.x - holding.x) <= 1 && Math.abs(tripled.y - holding.y) <= 1 && near(tripled.scale, holding.scale),
    `${label} R1: third finger moved the image`);
  await touch.send("touchEnd", [{ ...third, x: third.x + 30 }]);
  // 230px giữ s = 2.3 dưới Max (2 × Cover) cả khi Fit chạm cạnh màn hình ngang.
  await touch.send("touchMove", touch.pair(centre, 230));
  check(near((await state()).scale, 2.3), `${label} R1: pinch stopped following after a third finger`);
  await touch.send("touchEnd", []);
  await settled(page);
  const pinched = await state();
  check(pinched.status === `${Math.round(pinched.scale * 100)}%`, `${label} R5: status ${pinched.status} after release`);
  check(pinched.open && pinched.scroll === start.scroll && pinched.pageZoom === 1,
    `${label} R1: dialog closed, page scrolled or page zoomed`);

  // R5: giữa Fit và Cover, + sang Cover và - về Fit.
  await resetZoom(page);
  await touch.pinch(centre, 100, 50 * (1 + start.cover));
  await settled(page);
  const between = await state();
  check(between.scale > 1.05 && between.scale < between.cover * 0.95, `${label} R5: pinch did not stop between stops (${between.scale})`);
  await press(page, "data-advertising-photo-zoom-in");
  await settled(page);
  check(near((await state()).scale, between.cover), `${label} R5: + from between stops did not reach Cover`);
  await press(page, "data-advertising-photo-zoom-out");
  await settled(page);
  const fitAgain = await state();
  check(near(fitAgain.scale, 1) && fitAgain.minusDisabled, `${label} R5: - did not return to Fit`);

  // R2: pinch xa quá Max giữ tối đa 15% vượt, rồi bật lại về Max.
  await resetZoom(page);
  await touch.pinch(centre, 30, 300, { hold: true });
  const over = await state();
  const max = 2 * over.cover;
  // Cover ở đây tính từ clientWidth đã làm tròn, của runtime từ kích thước fit float: cho phép 1%.
  check(over.scale > max && over.scale <= max * 1.15 * 1.01, `${label} R2: over Max held at ${over.scale} (Max ${max})`);
  await touch.send("touchEnd", []);
  await settled(page);
  const atMax = await state();
  check(near(atMax.scale, max) && atMax.plusDisabled, `${label} R2: release over Max settled at ${atMax.scale}`);
  checkAnchor(over, atMax, centre, centre, `${label} R2`);

  // R2: pinch vào dưới Fit giữ ít nhất 0.85, rồi bật lại về Fit ở giữa.
  await resetZoom(page);
  await touch.pinch(centre, 300, 40, { hold: true });
  const under = await state();
  check(under.scale < 1 && under.scale >= 0.85 - 1e-6, `${label} R2: under Fit held at ${under.scale}`);
  await touch.send("touchEnd", []);
  await settled(page);
  const back = await state();
  check(back.scale === 1 && back.x === 0 && back.y === 0 && back.open, `${label} R2: release under Fit settled at ${back.scale}`);

  // R3: một ngón pan, ngón thứ hai vào và rời không giật, ngón cuối tiếp tục pan.
  await touch.pinch(centre, 80, 120 * start.cover);
  await settled(page);
  const before = await state();
  const room = limits(before);
  check(room.x > 60 || room.y > 60, `${label} R3: no room to pan at ${before.scale}`);
  const finger = { x: centre.x, y: centre.y, id: 1 };
  const at = (point, dx, dy) => ({ ...point, x: point.x + dx, y: point.y + dy });
  await touch.send("touchStart", [finger]);
  // R3: di trong vùng chết 10px không pan.
  await touch.send("touchMove", [at(finger, 6, 4)]);
  const still = await state();
  check(Math.abs(still.x - before.x) <= 0.5 && Math.abs(still.y - before.y) <= 0.5, `${label} R3: 7px finger jitter panned the image`);
  await touch.send("touchMove", [at(finger, 20, 12)]);
  const panned = await state();
  checkMoved(before, panned, 20, 12, `${label} R3 one finger`);
  const second = { x: finger.x + 120, y: finger.y + 40, id: 2 };
  await touch.send("touchStart", [at(finger, 20, 12), second]);
  const joined = await state();
  check(Math.abs(joined.x - panned.x) <= 1 && Math.abs(joined.y - panned.y) <= 1 && near(joined.scale, panned.scale),
    `${label} R3: second finger made the image jump`);
  // Cả hai ngón trượt cùng nhau: pinch bắt đầu từ transform đã pan, nên ảnh bám sát chính xác.
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

  // R4: một tap Fit -> Cover tại điểm tap, tap nữa về lại Fit ở giữa.
  await resetZoom(page);
  const fit = await state();
  const tapPoint = { x: Math.round(fit.cx + fit.fitW * 0.25), y: Math.round(fit.cy + fit.fitH * 0.2) };
  await touch.tapAt(tapPoint);
  await settled(page);
  const covered = await state();
  check(near(covered.scale, covered.cover), `${label} R4: tap at Fit gave ${covered.scale}, Cover ${covered.cover}`);
  checkAnchor(fit, covered, tapPoint, tapPoint, `${label} R4`);
  await page.waitForTimeout(350);
  await touch.tapAt(tapPoint);
  await settled(page);
  const unzoomed = await state();
  check(unzoomed.scale === 1 && unzoomed.x === 0 && unzoomed.y === 0 && unzoomed.open, `${label} R4: second tap did not return to Fit`);

  // R4: double tap chỉ zoom một lần; tap thứ hai lệch vài px không pan, không về Fit.
  await page.waitForTimeout(350);
  await touch.doubleTap(tapPoint);
  await settled(page);
  const doubled = await state();
  check(near(doubled.scale, doubled.cover) && Math.abs(doubled.x - covered.x) <= 1 && Math.abs(doubled.y - covered.y) <= 1,
    `${label} R4: double tap did not zoom once to Cover ${JSON.stringify(doubled)}`);
  await page.waitForTimeout(350);
  await touch.tapAt(tapPoint);
  await settled(page);

  // R11: pinch zoom kèm vặn nhẹ 15° không xoay ảnh.
  await touch.twist({ x: fit.cx, y: fit.cy }, 160, 0, 15, { hold: true });
  check(Math.abs((await state()).angle) <= 0.5, `${label} R11: a 15 degree twist rotated the image`);
  await touch.send("touchEnd", []);
  await settled(page);

  // R11: vặn 70° theo tay, buông thì hít về 90° và ảnh xoay vừa khung; vặn thêm 30° thì về lại 90°.
  // R11: quá ngưỡng 20° ảnh xoay theo tay tính từ ngưỡng: vặn 70° cho 50°.
  await touch.twist({ x: fit.cx, y: fit.cy }, 160, 0, 70, { hold: true });
  const twisting = await state();
  check(Math.abs(twisting.angle - 50) <= 1, `${label} R11: image did not follow the twist (${twisting.angle})`);
  await touch.send("touchEnd", []);
  await settled(page);
  const turned = await state();
  // Màn dọc: ảnh ngang xoay vừa khung. Màn ngang: giữ cỡ đang thấy, s tính theo khung mới nên lớn hơn Fit.
  const portrait = fit.vh > fit.vw;
  check(Math.abs(turned.angle - 90) <= 0.5 && turned.open && (portrait ? near(turned.scale, 1) && turned.inside : turned.scale > 1),
    `${label} R11: release did not snap to 90 degrees in range ${JSON.stringify(turned)}`);
  await touch.twist({ x: fit.cx, y: fit.cy }, 160, 0, 30);
  await settled(page);
  if (!portrait) {
    await touch.tapAt({ x: Math.round(fit.cx), y: Math.round(fit.cy) });
    await settled(page);
    // Qua cửa sổ double tap để lần chạm kế là swipe, không bị nuốt.
    await page.waitForTimeout(350);
  }
  const single = await state();
  check(Math.abs(single.angle - 90) <= 0.5 && single.scale === 1 && single.inside,
    `${label} R11: 30 degree twist did not return to a fitting 90 ${JSON.stringify(single)}`);

  // R9: swipe ngắn chậm bật lại; swipe dài đóng về primary và ở lại detail.
  const url = page.url();
  const swipeImage = async (distance, steps) => {
    const from = { x: Math.round(single.cx), y: Math.round(single.cy), id: 1 };
    await touch.send("touchStart", [from]);
    for (let step = 1; step <= steps; step += 1) await touch.send("touchMove", [{ ...from, y: from.y + distance * step / steps }]);
  };
  await swipeImage(single.vh * 0.05, 6);
  const dragged = await page.evaluate(() => ({ y: new DOMMatrixReadOnly(getComputedStyle(
    document.querySelector("[data-advertising-photo-expanded-image]")).transform).m42,
  opacity: getComputedStyle(document.querySelector("[data-advertising-photo-dialog]"), "::backdrop").opacity }));
  check(Math.abs(dragged.y - single.vh * 0.05) <= 1 && Number(dragged.opacity) < 1,
    `${label} R9: image or backdrop did not follow the swipe ${JSON.stringify(dragged)}`);
  await page.waitForTimeout(150);
  await touch.send("touchMove", [{ x: Math.round(single.cx), y: Math.round(single.cy + single.vh * 0.05), id: 1 }]);
  await touch.send("touchEnd", []);
  await settled(page);
  const sprung = await state();
  check(sprung.open && Math.abs(sprung.y) < 0.5 && near(sprung.scale, 1) && Math.abs(sprung.angle - 90) <= 0.5,
    `${label} R9: short swipe did not spring back ${JSON.stringify(sprung)}`);
  await swipeImage(single.vh * 0.3, 6);
  await touch.send("touchEnd", []);
  await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-dialog]").open);
  const closed = await state();
  check(page.url() === url && closed.scroll === start.scroll && Math.abs(closed.angle) <= 0.5,
    `${label} R9/R11: swipe close left detail, scrolled or kept the rotation`);

  // R10: Back chỉ đóng viewer; Back kế tiếp rời detail như trước.
  await page.waitForTimeout(100);
  await openViewer(page, touch);
  await page.evaluate(() => history.back());
  await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-dialog]").open);
  await page.waitForTimeout(300);
  check(page.url() === url && !(await page.locator("[data-advertising-photo-view]").isHidden()),
    `${label} R10: Back left detail instead of closing the viewer`);
  // Vào trực tiếp: trang trước detail là bất cứ thứ gì có trước lần tải.
  await page.evaluate(() => { setTimeout(() => history.back(), 0); }); // rời trang: trả về trước khi unload
  await page.waitForURL((next) => next.href !== url, { timeout: 5000 })
    .catch(() => check(false, `${label} R10: second Back did not leave detail`));

  check(errors.length === 0, `${label}: page errors ${errors.join(" | ")}`);
  await close();
}

// R6: chạm giữa animation zoom bắt đầu từ transform đang hiển thị; tap và hít góc reduced motion tức thì.
async function runMotion() {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const label = `motion ${reducedMotion}`;
    const { page, cdp, close } = await phonePage({ width: 390, height: 844, reducedMotion });
    await page.goto(`${origin}/en/advertising-products/?photo=${card.id}`, { waitUntil: "domcontentloaded" });
    const touch = touchDriver(page, cdp);
    await openViewer(page, touch);
    if (reducedMotion === "reduce") {
      const fit = await page.evaluate(readState);
      await touch.tapAt({ x: Math.round(fit.cx), y: Math.round(fit.cy) });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
      const after = await page.evaluate(readState);
      check(near(after.scale, after.cover) && after.animations === 0 && after.status === `${Math.round(after.scale * 100)}%`
        && !after.minusDisabled && !after.plusDisabled,
        `${label}: tap animated or missed Cover ${JSON.stringify(after)}`);
      await page.waitForTimeout(350);
      await touch.tapAt({ x: Math.round(fit.cx), y: Math.round(fit.cy) });
      await touch.twist({ x: fit.cx, y: fit.cy }, 160, 0, -80);
      const snapped = await page.evaluate(readState);
      check(Math.abs(snapped.angle + 90) <= 0.5 && snapped.animations === 0,
        `${label}: snap animated or missed -90 degrees ${JSON.stringify(snapped)}`);
    } else {
      // Click + và bắt đầu pinch khi zoom 200ms đã dịch thấy rõ (điện thoại thật có thể giữ ở 0 vài frame).
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

// Desktop giữ hành vi mouse: double-click trên ảnh không zoom.
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
  // R10 trên desktop, và đóng bằng nút bỏ history entry nên Back rời detail.
  const url = page.url();
  await page.evaluate(() => history.back());
  await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-dialog]").open);
  check(page.url() === url, "desktop R10: Back left detail instead of closing the viewer");
  await page.locator("[data-advertising-photo-expand]").click();
  await settled(page);
  await page.locator("[data-advertising-photo-close]").click();
  await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-dialog]").open);
  await page.waitForTimeout(300);
  check(page.url() === url, "desktop R10: closing by button changed the URL");
  // Back trong 250ms animation đóng chỉ ăn entry của viewer, không lùi thêm một entry.
  await page.locator("[data-advertising-photo-expand]").click();
  await settled(page);
  await page.evaluate(() => {
    document.querySelector("[data-advertising-photo-close]").click();
    history.back();
  });
  await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-dialog]").open);
  await page.waitForTimeout(600);
  check(page.url() === url && !(await page.locator("[data-advertising-photo-view]").isHidden()),
    `desktop R10: Back during the close animation left detail (${page.url()})`);
  await page.evaluate(() => { setTimeout(() => history.back(), 0); }); // rời trang: trả về trước khi unload
  await page.waitForURL((next) => next.href !== url, { timeout: 5000 })
    .catch(() => check(false, "desktop R10: Back after a button close did not leave detail"));
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
