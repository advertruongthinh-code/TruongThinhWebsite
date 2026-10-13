// brand.md Motion: lớp màu mới của mark mọc từ chân lên đỉnh từng dải, thứ tự đen, vàng, magenta, cyan, cùng xong ở 1s.
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/brand-mark-rise.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const cmyk = ["rgb(43, 42, 41)", "rgb(255, 237, 0)", "rgb(229, 9, 127)", "rgb(0, 160, 227)"];
const white = cmyk.map(() => "rgb(255, 255, 255)");
// Phần chưa mọc của từng dải (% chiều cao dải) tại thời điểm seek, cùng màu lớp cũ và lớp mới.
const readRise = (at) => {
  const paths = [...document.querySelectorAll("#header-logo .brand-lockup__mark path")];
  paths.forEach((item) => item.getAnimations().forEach((animation) => {
    animation.pause();
    animation.currentTime = at;
  }));
  return {
    hidden: paths.map((item) => Number.parseFloat(getComputedStyle(item).clipPath.match(/inset\(([\d.]+)%/)?.[1] ?? 0)),
    fills: paths.map((item) => getComputedStyle(item).fill),
    underlay: [...document.querySelectorAll("#header-logo .brand-lockup__mark-underlay path")].map((item) => item.getAttribute("fill")),
  };
};
// Dừng mọi animation của mark (lớp mới và slot lớp cũ) tại một thời điểm.
const seekMark = (at) => document.querySelectorAll("#header-logo .brand-lockup__mark path, #header-logo .brand-lockup__mark-underlay g")
  .forEach((item) => item.getAnimations().forEach((animation) => {
    animation.pause();
    animation.currentTime = at;
  }));
// Ẩn mọi thứ khác, nền xám khác cả trắng lẫn bốn màu CMYK để thấy được mép của mọi lớp.
const isolateMark = `html, body { background: rgb(128, 128, 128) !important; } body * { visibility: hidden !important; }
  #header-logo .brand-lockup__mark, #header-logo .brand-lockup__mark *,
  #header-logo .brand-lockup__mark-underlay, #header-logo .brand-lockup__mark-underlay * { visibility: visible !important; }`;
// Ba ảnh cùng một frame: đủ lớp, chỉ lớp mới, chỉ nền. Đếm điểm ảnh lớp mới đang phủ mà lớp cũ làm đổi màu, tức viền
// lớp cũ lộ quanh dải. Bỏ dải 1px CSS ngay dưới mép mọc: lớp cũ cố ý thừa 1px ở đó để không hở khe (motion.js), mép
// antialias của dải mới chồng lên lớp cũ trong dải này là thiết kế. DPR 3 nên 1px CSS là 3 hàng điểm ảnh.
const countFringe = async ([full, newOnly, empty]) => {
  const load = async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = Object.assign(document.createElement("canvas"), { width: image.width, height: image.height });
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, image.width, image.height).data;
  };
  const [a, b, c] = await Promise.all([full, newOnly, empty].map(load));
  const width = await new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.width);
    image.src = `data:image/png;base64,${empty}`;
  });
  const differs = (left, right, at) => [0, 1, 2].some((channel) => Math.abs(left[at + channel] - right[at + channel]) > 8);
  const covered = (at) => at >= 0 && differs(b, c, at);
  let fringe = 0;
  for (let at = 0; at < a.length; at += 4) {
    const row = width * 4;
    if ([0, 1, 2, 3].every((step) => covered(at - step * row)) && differs(a, b, at)) fringe += 1;
  }
  return fringe;
};
const checkEdges = async (page, label) => {
  // Giữ lớp mới ở chân, chờ FLIP của header xong để khung chụp đứng yên.
  await page.evaluate(seekMark, 0);
  await page.waitForTimeout(500);
  const box = await page.locator("#header-logo .brand-lockup__mark").boundingBox();
  const style = await page.addStyleTag({ content: isolateMark });
  const shot = () => page.screenshot({ clip: box }).then((buffer) => buffer.toString("base64"));
  const hide = (selector, hidden) => page.evaluate(([name, value]) => {
    document.querySelector(`#header-logo ${name}`).style.opacity = value ? "0" : "";
  }, [selector, hidden]);
  for (const at of [100, 500, 900]) {
    await page.evaluate(seekMark, at);
    const full = await shot();
    await hide(".brand-lockup__mark-underlay", true);
    const newOnly = await shot();
    await hide(".brand-lockup__mark", true);
    const empty = await shot();
    await hide(".brand-lockup__mark-underlay", false);
    await hide(".brand-lockup__mark", false);
    const fringe = await page.evaluate(countFringe, [full, newOnly, empty]);
    assert.equal(fringe, 0, `${label}: no old-layer pixels around the bands at ${at}ms`);
  }
  await style.evaluate((node) => node.remove());
  console.log(`PASS ${label}: clean band edges at 0.1s, 0.5s, 0.9s`);
};
try {
  for (const [reducedMotion, width, height] of [["no-preference", 390, 844], ["no-preference", 1440, 900], ["reduce", 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion, deviceScaleFactor: 3 });
    const page = await context.newPage();
    const label = `${width}px ${reducedMotion}`;
    await page.goto(`${base}/vi/`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(400));
    await page.waitForFunction(() => document.querySelector("[data-site-header]").classList.contains("is-brand-color"));
    if (reducedMotion === "reduce") {
      // Chrome tính lại fill="var(...)" của path chậm hơn class header, máy bận có thể trễ một frame: chờ hai frame.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const state = await page.evaluate(readRise, 0);
      assert.deepEqual(state, { hidden: [0, 0, 0, 0], fills: cmyk, underlay: [] }, `${label}: colour changes at once`);
      console.log(`PASS ${label}: no rise`);
      await context.close();
      continue;
    }
    await page.waitForFunction(() => document.querySelector(".brand-lockup__mark-underlay"));
    const start = await page.evaluate(readRise, 0);
    const early = await page.evaluate(readRise, 100);
    const late = await page.evaluate(readRise, 999);
    assert.deepEqual(start.underlay, white, `${label}: old white layer stays under the rising CMYK ${JSON.stringify(start)}`);
    assert.deepEqual(start.fills, cmyk, `${label}: new layer carries CMYK`);
    assert.ok(start.hidden.every((value) => value === 100), `${label}: every band starts at its foot ${JSON.stringify(start.hidden)}`);
    assert.ok(early.hidden[0] < early.hidden[1] && early.hidden[1] < early.hidden[2] && early.hidden[3] === 100,
      `${label}: black, yellow, magenta lead, cyan still waits at 0.1s ${JSON.stringify(early.hidden)}`);
    assert.ok(late.hidden.every((value) => value < 0.5), `${label}: every band reaches its top at 1s ${JSON.stringify(late.hidden)}`);
    await checkEdges(page, `${label} white to CMYK`);
    await page.evaluate(() => document.querySelectorAll("#header-logo .brand-lockup__mark path")
      .forEach((item) => item.getAnimations().forEach((animation) => animation.finish())));
    await page.waitForFunction(() => !document.querySelector(".brand-lockup__mark-underlay"));
    // Chiều về: CMYK lùi, trắng mọc lên.
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    await page.waitForFunction(() => document.querySelector(".brand-lockup__mark-underlay"));
    await checkEdges(page, `${label} CMYK to white`);
    console.log(`PASS ${label}: hidden at 0.1s ${early.hidden.map((value) => value.toFixed(1)).join(" / ")}`);
    await context.close();
  }
} finally {
  await browser.close();
}
