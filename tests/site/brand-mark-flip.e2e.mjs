// brand.md Motion: mark đổi màu bằng cách lật từng dải quanh trục dọc dải, song song cạnh trái tam giác,
// cyan trước đen sau; chỉ transform, opacity để GPU chạy; đổi hướng giữa chừng quay ngược các dải.
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/brand-mark-flip.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
// DOM: đen, vàng, magenta, cyan.
const cmyk = ["rgb(43, 42, 41)", "rgb(255, 237, 0)", "rgb(229, 9, 127)", "rgb(0, 160, 227)"];
const white = cmyk.map(() => "rgb(255, 255, 255)");

// Dừng mọi animation của lớp lật tại `at` ms rồi đọc trạng thái từng dải.
const readFlip = (at) => {
  const root = document.querySelector("#header-logo .brand-lockup__mark-flip");
  if (!root) return null;
  const bands = [...root.children];
  bands.forEach((band) => band.querySelectorAll(":scope > span").forEach((face) => face.getAnimations().forEach((animation) => {
    animation.pause();
    animation.currentTime = at;
  })));
  const turned = (face) => Math.abs(new DOMMatrixReadOnly(getComputedStyle(face).transform).m11 - 1) > 1e-7;
  return {
    front: bands.map((band) => band.children[0].dataset.fill),
    back: bands.map((band) => band.children[1].dataset.fill),
    frontTurned: bands.map((band) => turned(band.children[0])),
    backShown: bands.map((band) => Number(getComputedStyle(band.children[1]).opacity) > 0),
    props: [...root.querySelectorAll("span")].flatMap((face) => face.getAnimations())
      .flatMap((animation) => animation.effect.getKeyframes().flatMap((frame) => Object.keys(frame)))
      .filter((key) => !["offset", "easing", "composite", "computedOffset"].includes(key)),
    markHidden: getComputedStyle(document.querySelector("#header-logo .brand-lockup__mark")).visibility === "hidden",
  };
};
// Trục của mỗi dải tính độc lập từ path: điểm giữa đoạn chân dải, đổi sang px trong khung lớp lật.
const readAxes = () => {
  const mark = document.querySelector("#header-logo .brand-lockup__mark");
  const box = mark.getBBox();
  const root = document.querySelector("#header-logo .brand-lockup__mark-flip");
  const width = root.offsetWidth;
  const height = root.offsetHeight;
  return [...mark.querySelectorAll("path")].map((item, index) => {
    const length = item.getTotalLength();
    const points = Array.from({ length: 401 }, (_, step) => item.getPointAtLength((length * step) / 400));
    const foot = Math.max(...points.map((point) => point.y));
    const xs = points.filter((point) => foot - point.y < 0.5).map((point) => point.x);
    const axis = [((Math.min(...xs) + Math.max(...xs)) / 2 - box.x) / box.width * width, (foot - box.y) / box.height * height];
    const face = root.children[index].children[0];
    const origin = getComputedStyle(face).transformOrigin.split(" ").map(Number.parseFloat);
    const perspective = getComputedStyle(root.children[index]).perspectiveOrigin.split(" ").map(Number.parseFloat);
    return { axis, origin, perspective };
  });
};

try {
  for (const [reducedMotion, width, height] of [["no-preference", 390, 844], ["no-preference", 1440, 900], ["reduce", 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
    const page = await context.newPage();
    const label = `${width}px ${reducedMotion}`;
    await page.goto(`${base}/vi/`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(400));
    await page.waitForFunction(() => document.querySelector("[data-site-header]").classList.contains("is-brand-color"));
    if (reducedMotion === "reduce") {
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const state = await page.evaluate(() => ({
        flip: Boolean(document.querySelector(".brand-lockup__mark-flip")),
        fills: [...document.querySelectorAll("#header-logo .brand-lockup__mark path")].map((item) => getComputedStyle(item).fill),
      }));
      assert.deepEqual(state, { flip: false, fills: cmyk }, `${label}: colour changes at once`);
      console.log(`PASS ${label}: no flip`);
      await context.close();
      continue;
    }
    await page.waitForFunction(() => document.querySelector("#header-logo .brand-lockup__mark-flip"));
    const axes = await page.evaluate(readAxes);
    axes.forEach(({ axis, origin, perspective }, index) => {
      [origin, perspective].forEach((value) => assert.ok(Math.hypot(value[0] - axis[0], value[1] - axis[1]) < 0.75,
        `${label}: band ${index} turns on the axis through its foot midpoint ${JSON.stringify({ axis, origin, perspective })}`));
    });
    assert.ok(new Set(axes.map(({ origin }) => origin[0].toFixed(1))).size === 4, `${label}: every band has its own axis`);

    const start = await page.evaluate(readFlip, 0);
    assert.deepEqual(start.front, white, `${label}: white face shows first`);
    assert.deepEqual(start.back, cmyk, `${label}: CMYK face comes in`);
    assert.ok(start.markHidden, `${label}: inline mark hides while the flip layer runs`);
    assert.deepEqual([...new Set(start.props)].sort(), ["opacity", "transform"], `${label}: only compositor properties animate`);
    // Cyan lật ở 0ms, magenta 80ms, vàng 160ms, đen 240ms.
    const early = await page.evaluate(readFlip, 150);
    assert.deepEqual(early.frontTurned, [false, false, true, true], `${label}: cyan and magenta turn first ${JSON.stringify(early)}`);
    const done = await page.evaluate(readFlip, 700);
    assert.deepEqual(done.backShown, [true, true, true, true], `${label}: every CMYK face shows by 0.7s`);
    await page.evaluate(() => document.querySelectorAll("#header-logo .brand-lockup__mark-flip span")
      .forEach((face) => face.getAnimations().forEach((animation) => animation.finish())));
    await page.waitForFunction(() => !document.querySelector(".brand-lockup__mark-flip"));
    const after = await page.evaluate(() => ({
      hidden: getComputedStyle(document.querySelector("#header-logo .brand-lockup__mark")).visibility,
      fills: [...document.querySelectorAll("#header-logo .brand-lockup__mark path")].map((item) => getComputedStyle(item).fill),
    }));
    assert.deepEqual(after, { hidden: "visible", fills: cmyk }, `${label}: flip layer leaves the CMYK mark`);

    // Chiều về rồi đổi hướng giữa chừng: các dải quay ngược từ góc đang có, cùng lớp lật, rồi về CMYK.
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    await page.waitForFunction(() => document.querySelector("#header-logo .brand-lockup__mark-flip"));
    const back = await page.evaluate(() => [...document.querySelectorAll("#header-logo .brand-lockup__mark-flip > span")]
      .map((band) => [band.children[0].dataset.fill, band.children[1].dataset.fill]));
    assert.deepEqual(back, cmyk.map((color, index) => [color, white[index]]), `${label}: CMYK to white flips the same way`);
    // Đổi hướng sau khoảng 0.15s như lúc cuộn thật.
    await page.evaluate(() => { window.__flipRoot = document.querySelector("#header-logo .brand-lockup__mark-flip"); });
    await page.waitForTimeout(150);
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(400));
    await page.waitForFunction(() => document.querySelector("[data-site-header]").classList.contains("is-brand-color"));
    await page.waitForTimeout(30);
    const reversed = await page.evaluate(() => {
      const root = document.querySelector("#header-logo .brand-lockup__mark-flip");
      const animations = [...(root?.querySelectorAll("span") || [])].flatMap((face) => face.getAnimations());
      return { same: root === window.__flipRoot, rates: [...new Set(animations.map((animation) => animation.playbackRate))] };
    });
    assert.deepEqual(reversed, { same: true, rates: [-1] }, `${label}: mid-flip reversal turns the bands back`);
    await page.waitForFunction(() => !document.querySelector(".brand-lockup__mark-flip"), null, { timeout: 2000 });
    const final = await page.evaluate(() => [...document.querySelectorAll("#header-logo .brand-lockup__mark path")]
      .map((item) => getComputedStyle(item).fill));
    assert.deepEqual(final, cmyk, `${label}: reversal settles on CMYK`);
    console.log(`PASS ${label}: per-band axes, cyan first, compositor only, reversal turns bands back`);
    await context.close();
  }
} finally {
  await browser.close();
}
