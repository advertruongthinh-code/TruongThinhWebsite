// Veil phủ kín: chữ đổi ngay sang đậm, mark lật sang CMYK; veil mở: chữ đổi ngay, mark lật về màu trang đích; cụm logo
// luôn hiện trên veil (docs/specs/logo-route-crossfade.md R1-R7).
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/logo-route-crossfade.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

// Ghi mỗi frame: animation clip-path (kiểu mọc cũ, phải luôn 0) và tween fill inline trên path của mark (phải 0), màu chữ
// logo, lớp lật mark mới, opacity veil, opacity cụm logo, opacity riêng của mark, chữ, nav, hamburger.
const startRecorder = (selector) => {
  const t0 = performance.now();
  const header = document.querySelector("[data-site-header]");
  const veil = document.querySelector(".route-veil");
  const logo = document.querySelector("#header-logo");
  const parts = [...logo.querySelectorAll(".brand-lockup, .brand-lockup__mark, .brand-lockup__title, .brand-lockup__subtitle"),
    ...header.querySelectorAll(".desktop-nav, .menu-button")];
  const record = { markUnderFlip: 0, rises: 0, tweens: 0, texts: [], flips: [], veilClosed: undefined, veilOpening: undefined, logoMin: 1, partsBelowOne: 0 };
  const seen = new WeakSet();
  let root;
  const tick = () => {
    const now = Math.round(performance.now() - t0);
    const paths = [...document.querySelectorAll("#header-logo .brand-lockup__mark path")];
    paths.forEach((item) =>
      item.getAnimations().forEach((animation) => {
        if (seen.has(animation)) return;
        seen.add(animation);
        if ("clipPath" in animation.effect.getKeyframes()[0]) record.rises += 1;
      }));
    if (paths.some((item) => item.style.fill)) record.tweens += 1;
    const text = getComputedStyle(logo).color;
    if (text !== record.texts.at(-1)?.color) record.texts.push({ at: now, color: text });
    const nextRoot = document.querySelector("#header-logo .brand-lockup__mark-flip");
    // reverse() lúc animation còn pending chỉ đổi playbackRate khi animation hết pending: đọc chiều chạy lúc đó.
    const last = record.flips.at(-1);
    const running = nextRoot === root && root?.lastElementChild.children[0].getAnimations()[0];
    if (last && last.rate === undefined && running && !running.pending) last.rate = running.playbackRate;
    if (nextRoot && nextRoot !== root) {
      const band = nextRoot.lastElementChild;
      record.flips.push({ at: now, front: band.children[0].dataset.fill, back: band.children[1].dataset.fill, rate: undefined });
    }
    root = nextRoot;
    // Lớp lật chạy thì mark gốc phải ẩn; HTML trang đích mount dưới veil không được xóa style ẩn của nó, nếu không
    // mark CMYK gốc lộ viền màu mờ quanh mặt trắng (owner 2026-11-09).
    if (root && getComputedStyle(logo.querySelector(".brand-lockup__mark")).visibility !== "hidden") record.markUnderFlip += 1;
    const opacity = Number(getComputedStyle(veil).opacity);
    record.logoMin = Math.min(record.logoMin, Number(getComputedStyle(logo).opacity));
    record.partsBelowOne += parts.filter((part) => Number(getComputedStyle(part).opacity) < 1).length;
    if (opacity === 1 && record.veilClosed === undefined) record.veilClosed = now;
    if (opacity < 1 && record.veilClosed !== undefined && record.veilOpening === undefined) record.veilOpening = now;
    if (now < 5000) requestAnimationFrame(tick);
  };
  tick();
  window.__logoRecord = record;
  document.querySelector(selector).click();
  record.click = Math.round(performance.now() - t0);
};
const readRecord = (page) => page.evaluate(() => ({
  ...window.__logoRecord,
  final: [...document.querySelector("[data-site-header]").classList].find((name) => name.startsWith("is-brand-")),
}));
const settle = (page) => page.waitForFunction(() =>
  !document.body.classList.contains("is-transitioning") && !document.documentElement.classList.contains("route-enter"));
const open = async (viewport, reducedMotion, route) => {
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  await page.goto(`${origin}${route}`, { waitUntil: "load" });
  await settle(page);
  await page.waitForTimeout(1500);
  return { context, page };
};
// Click bằng script để link trong menu (ẩn ở điện thoại) cũng đi qua Barba như click thật.
const go = async (page, selector) => {
  await page.evaluate(startRecorder, selector);
  await page.waitForTimeout(400);
  await settle(page);
  await page.waitForTimeout(1200);
  return readRecord(page);
};

const white = "rgb(255, 255, 255)";
const ink = "rgb(47, 47, 47)";
const cyan = "rgb(0, 160, 227)";
// Trên veil (owner 2026-11-09): lúc bấm chữ và mark giữ màu; veil phủ kín thì chữ đổi ngay sang đậm, mark đang trắng thì
// lật sang CMYK; veil bắt đầu mở thì chữ đổi ngay sang tone trang đích, mark lật sang màu trang đích. Không tween màu.
const scenarios = [
  { name: "home to residential", from: "/vi/", link: 'a[href="/vi/residential/"]', texts: [white, ink, white], flip: { front: white, back: cyan, rate: 1 }, final: "is-brand-inverse" },
  { name: "home to advertising", from: "/vi/", link: 'a[href="/vi/advertising-products/"]', texts: [white, ink], flip: { front: white, back: cyan, rate: 1 }, final: "is-brand-color" },
  { name: "advertising to home", from: "/vi/advertising-products/", link: 'a[href="/vi/"]', texts: [ink, white], flip: { front: white, back: cyan, rate: -1 }, final: "is-brand-inverse" },
];
// Một frame: callback GSAP lúc veil phủ kín có thể chạy trước hoặc sau lần đọc của recorder trong cùng frame.
const frame = 40;

try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 412, height: 915 }]) {
    for (const scenario of scenarios) {
      const label = `${viewport.width}px ${scenario.name}`;
      const { context, page } = await open(viewport, "no-preference", scenario.from);
      const record = await go(page, scenario.link);
      const dump = JSON.stringify(record);
      assert.equal(record.rises, 0, `${label}: no rising bands during the route ${dump}`);
      assert.equal(record.tweens, 0, `${label}: mark never tweens its fill ${dump}`);
      assert.equal(record.markUnderFlip, 0, `${label}: original mark stays hidden under the flip layer ${dump}`);
      assert.equal(record.final, scenario.final, `${label}: final mark colour`);
      // Chữ đổi ngay, không tween: chỉ có đúng các màu này, không màu trung gian.
      assert.deepEqual(record.texts.map(({ color }) => color), scenario.texts, `${label}: text switches without a tween ${dump}`);
      const toInk = record.texts.find(({ color }) => color === ink);
      if (scenario.texts[0] !== ink) assert.ok(toInk.at >= record.veilClosed - frame, `${label}: text turns ink once the veil covers ${dump}`);
      const toDestination = record.texts.find(({ color }, index) => index && color !== ink);
      if (toDestination) {
        assert.ok(toDestination.at >= record.veilClosed && toDestination.at <= record.veilOpening, `${label}: text turns to the destination tone as the veil starts to open ${dump}`);
      }
      // Veil phủ kín ít nhất 0.68s (một lượt lật mark) dù trang đích tải ngay, navbar không chớp.
      assert.ok(record.veilOpening - record.veilClosed >= 680 - frame, `${label}: veil stays covered for the minimum hold ${dump}`);
      // Mark lật (không tween) từ lúc veil phủ kín hoặc lúc veil bắt đầu mở, không phải lúc bấm.
      assert.ok(record.flips.length >= 1, `${label}: mark flips ${dump}`);
      const { at, ...flip } = record.flips[0];
      assert.deepEqual(flip, scenario.flip, `${label}: first flip ${dump}`);
      assert.ok(at >= record.veilClosed - frame, `${label}: first flip waits for the full veil ${dump}`);
      // R7: cụm logo luôn hiện trên veil; mark, chữ, nav, hamburger không có opacity riêng.
      assert.equal(record.logoMin, 1, `${label}: logo never fades ${dump}`);
      assert.equal(record.partsBelowOne, 0, `${label}: mark, text, nav, hamburger keep their own opacity`);
      console.log(`PASS ${label}: text switches on the full veil, mark flips, no colour tween`);
      await context.close();
    }
  }

  // R5: bấm link lúc mark đang lật dở (cuộn vừa đổi màu); lúc bấm mark giữ nguyên nên lần lật đang chạy chạy tiếp.
  {
    const { context, page } = await open({ width: 1440, height: 900 }, "no-preference", "/vi/");
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(400));
    await page.waitForFunction(() => document.querySelector("#header-logo .brand-lockup__mark-flip"));
    const state = await page.evaluate(() => {
      const root = document.querySelector("#header-logo .brand-lockup__mark-flip");
      document.querySelector('a[href="/vi/residential/"]').click();
      const after = document.querySelector("#header-logo .brand-lockup__mark-flip");
      return {
        same: after === root,
        running: Boolean(after?.getAnimations({ subtree: true }).some((animation) => animation.playState === "running")),
        tweening: [...document.querySelectorAll("#header-logo .brand-lockup__mark path")].some((item) => item.style.fill),
      };
    });
    assert.deepEqual(state, { same: true, running: true, tweening: false }, "mid-flip: the running flip keeps going at the click");
    await settle(page);
    console.log("PASS mid-flip click: flip keeps running, no colour tween");
    await context.close();
  }

  // R6: reduced motion đổi ngay, không tween màu, không mọc.
  {
    const { context, page } = await open({ width: 412, height: 915 }, "reduce", "/vi/");
    const record = await go(page, 'a[href="/vi/residential/"]');
    assert.deepEqual({ rises: record.rises, tweens: record.tweens, final: record.final }, { rises: 0, tweens: 0, final: "is-brand-inverse" }, "reduced motion");
    assert.equal(record.logoMin, 1, "reduced motion: logo never fades");
    console.log("PASS reduced motion: colour changes at once, logo stays");
    await context.close();
  }
} finally {
  await browser.close();
}
