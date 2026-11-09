// brand.md Motion: mark đổi màu bằng cách lật từng dải quanh trục dọc dải, song song cạnh trái tam giác,
// trắng sang CMYK cyan trước, CMYK sang trắng chạy lùi đúng lượt đó nên đen trước; chỉ transform, opacity để GPU chạy;
// đổi hướng giữa chừng thì tua ngược từ chỗ đang dừng (owner 2026-11-09).
// Thu gọn và mở ra: logo, navbar, nền chạy chung 0.3s expo.out; nền, viền, chữ đổi ngay lúc bắt đầu, không fade; thu
// gọn thì nền co cùng logo; mark lật cùng lúc (owner 2026-11-09).
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
// Ghi lúc header đổi trạng thái thu gọn và lúc lớp lật được chèn, theo performance.now().
const watchPhases = () => {
  const header = document.querySelector("[data-site-header]");
  const logo = document.querySelector("#header-logo");
  const phases = { collapse: [], flip: [], lead: [], surface: [] };
  // Nền và viền vẽ ở ::before để co cùng nhịp FLIP.
  const readSurface = () => ({
    background: getComputedStyle(header, "::before").backgroundColor,
    border: getComputedStyle(header, "::before").borderBottomStyle === "none" ? "none" : getComputedStyle(header, "::before").borderBottomColor,
    text: getComputedStyle(header.querySelector(".menu-button")).color,
  });
  let collapsed = header.classList.contains("is-collapsed");
  new MutationObserver(() => {
    if (header.classList.contains("is-collapsed") === collapsed) return;
    collapsed = !collapsed;
    phases.collapse.push(performance.now());
    // Mẫu giữa nhịp 1, đo trong trang để không lệch theo độ trễ của Playwright.
    setTimeout(() => phases.lead.push({
      ...readSurface(),
      flip: Boolean(document.querySelector(".brand-lockup__mark-flip")),
      // Nền đang co cùng logo: ::before còn dài thêm một đoạn (px) giữa nhịp.
      shift: Number.parseFloat(getComputedStyle(header).getPropertyValue("--header-surface-shift")) || 0,
      fills: [...document.querySelectorAll("#header-logo .brand-lockup__mark path")].map((item) => getComputedStyle(item).fill),
    }), 40);
  }).observe(header, { attributes: true, attributeFilter: ["class"] });
  new MutationObserver((records) => {
    if (records.some((record) => [...record.addedNodes].some((node) => node.classList?.contains("brand-lockup__mark-flip")))) {
      phases.flip.push(performance.now());
      phases.surface.push(readSurface());
    }
  }).observe(logo, { childList: true });
  window.__phases = phases;
};
// Thu gọn và mở ra: lật bắt đầu ngay, cùng frame header đổi class và nền đổi (owner 2026-11-09).
const flipLead = () => {
  const { collapse, flip } = window.__phases;
  return flip.at(-1) - collapse.at(-1);
};

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
    backTurned: bands.map((band) => turned(band.children[1])),
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
    await page.evaluate(watchPhases);
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
    // Đầu nhịp: nền trắng, viền, chữ đậm đổi cùng frame header thu gọn, mark lật ngay, không fade.
    await page.waitForFunction(() => window.__phases.lead.length);
    const lead = await page.evaluate(() => window.__phases.lead[0]);
    assert.equal(lead.flip, true, `${label}: mark flips while logo and navbar move`);
    assert.deepEqual([lead.background, lead.border, lead.text], ["rgb(255, 255, 255)", "rgb(211, 211, 211)", "rgb(47, 47, 47)"], `${label}: surface and text switch as the header beat starts`);
    assert.ok(lead.shift > 0, `${label}: background shrinks with the logo and navbar ${JSON.stringify(lead)}`);
    const collapseLead = await page.evaluate(flipLead);
    assert.ok(collapseLead >= -1 && collapseLead < 20, `${label}: flip starts with the collapse (${collapseLead.toFixed(0)}ms)`);
    assert.deepEqual(await page.evaluate(() => window.__phases.surface.at(-1)), { background: "rgb(255, 255, 255)", border: "rgb(211, 211, 211)", text: "rgb(47, 47, 47)" }, `${label}: background, border and text switch at once with the flip`);
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
    // Bóng mặt dải (owner 2026-11-09): mỗi mặt một lớp bóng, tối nhất lúc mặt xoay ra cạnh, chỉ chạy opacity.
    const shades = await page.evaluate(() => [...document.querySelectorAll("#header-logo .brand-lockup__mark-flip > span > span > span")]
      .map((layer) => layer.getAnimations()[0]?.effect.getKeyframes().map((frame) => frame.opacity)));
    assert.deepEqual(shades, Array.from({ length: 4 }, () => [["0", "0.5"], ["0.5", "0"]]).flat(), `${label}: every face darkens as it turns edge-on`);
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

    // Chiều về: chạy lùi lượt lật, đen trước; rồi đổi hướng giữa chừng thì tua ngược về CMYK.
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    await page.waitForFunction(() => document.querySelector("#header-logo .brand-lockup__mark-flip"));
    const expandLead = await page.evaluate(flipLead);
    // Mở ra: nền trong, chữ trắng đổi ngay lúc navbar bắt đầu chuyển, mark lật cùng lúc (owner 2026-11-09).
    await page.waitForFunction(() => window.__phases.lead.length >= 2);
    const expandSample = await page.evaluate(() => window.__phases.lead.at(-1));
    assert.deepEqual([expandSample.background, expandSample.text], ["rgba(0, 0, 0, 0)", "rgb(255, 255, 255)"], `${label}: clear background and white text switch at once on the way up`);
    assert.ok(expandLead >= -1 && expandLead < 20, `${label}: flip back to white starts with the expand (${expandLead.toFixed(0)}ms)`);
    assert.deepEqual(await page.evaluate(() => window.__phases.surface.at(-1)), { background: "rgba(0, 0, 0, 0)", border: "none", text: "rgb(255, 255, 255)" }, `${label}: surface clears with the flip back`);
    // CMYK sang trắng là lượt trắng sang CMYK chạy lùi từ cuối: cùng mặt, mọi animation rate -1, đen rời trước.
    const back = await page.evaluate(async () => {
      const root = document.querySelector("#header-logo .brand-lockup__mark-flip");
      // reverse() lúc animation còn pending chỉ đổi playbackRate khi animation sẵn sàng; máy bận thì đọc sớm ra rate 1.
      await Promise.all([...root.querySelectorAll("span")].flatMap((face) => face.getAnimations()).map((animation) => animation.ready));
      return {
        faces: [...root.children].map((band) => [band.children[0].dataset.fill, band.children[1].dataset.fill]),
        rates: [...new Set([...root.querySelectorAll("span")].flatMap((face) => face.getAnimations()).map((animation) => animation.playbackRate))],
      };
    });
    assert.deepEqual(back, { faces: white.map((color, index) => [color, cmyk[index]]), rates: [-1] }, `${label}: CMYK to white plays the same flip backwards`);
    // Đổi hướng lúc lật dở (owner 2026-11-09): tua ngược ngay từ chỗ đang dừng, cùng lớp lật, không dựng lượt mới.
    await page.evaluate(() => { window.__flipRoot = document.querySelector("#header-logo .brand-lockup__mark-flip"); });
    await page.waitForTimeout(150);
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(400));
    await page.waitForFunction(() => document.querySelector("[data-site-header]").classList.contains("is-brand-color"));
    await page.waitForTimeout(30);
    const rewinding = await page.evaluate(() => {
      const root = document.querySelector("#header-logo .brand-lockup__mark-flip");
      const animations = [...(root?.querySelectorAll("span") || [])].flatMap((face) => face.getAnimations());
      return {
        same: root === window.__flipRoot,
        paused: animations.some((animation) => animation.playState === "paused"),
        rates: [...new Set(animations.map((animation) => animation.playbackRate))],
      };
    });
    assert.deepEqual(rewinding, { same: true, paused: false, rates: [1] }, `${label}: the running flip rewinds to CMYK from where it is`);
    await page.waitForFunction(() => !document.querySelector(".brand-lockup__mark-flip"), null, { timeout: 1000 });
    const final = await page.evaluate(() => ({
      flips: window.__phases.flip.length,
      fills: [...document.querySelectorAll("#header-logo .brand-lockup__mark path")].map((item) => getComputedStyle(item).fill),
    }));
    assert.deepEqual(final.fills, cmyk, `${label}: reversal settles on CMYK`);
    assert.equal(final.flips, 2, `${label}: rewinding builds no second flip layer`);

    // Đổi hướng ngay sau khi thu gọn: lượt lật vừa bắt đầu tua ngược về trắng, không dựng lượt mới.
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    await page.waitForFunction(() => document.querySelector("#header-logo .brand-lockup__mark-flip"));
    await page.waitForFunction(() => !document.querySelector(".brand-lockup__mark-flip"), null, { timeout: 2000 });
    const flipsBefore = await page.evaluate(() => window.__phases.flip.length);
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(400));
    await page.waitForTimeout(40);
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    await page.waitForTimeout(800);
    const cancelled = await page.evaluate(() => ({
      flips: window.__phases.flip.length,
      fills: [...document.querySelectorAll("#header-logo .brand-lockup__mark path")].map((item) => getComputedStyle(item).fill),
    }));
    assert.deepEqual(cancelled, { flips: flipsBefore + 1, fills: white }, `${label}: turning back right after collapsing rewinds the one flip home`);
    // Về trắng đen lật trước: 150ms sau khi chạy lùi (mốc 680 - 150), đen và vàng đã rời mặt CMYK, cyan chưa.
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(400));
    await page.waitForFunction(() => document.querySelector("#header-logo .brand-lockup__mark-flip"));
    await page.waitForFunction(() => !document.querySelector(".brand-lockup__mark-flip"), null, { timeout: 2000 });
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    await page.waitForFunction(() => document.querySelector("#header-logo .brand-lockup__mark-flip"));
    const leaving = await page.evaluate(readFlip, 530);
    assert.deepEqual(leaving.backTurned, [true, true, false, false], `${label}: black leaves CMYK first on the way to white ${JSON.stringify(leaving)}`);
    console.log(`PASS ${label}: per-band axes, cyan first to CMYK, black first to white, compositor only, interrupted flip rewinds`);
    await context.close();
  }
} finally {
  await browser.close();
}
