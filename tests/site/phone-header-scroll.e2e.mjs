// Header đi theo quãng cuộn trên điện thoại (docs/specs/phone-header-scroll.md R1-R4, R6).
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const scrollTo = async (page, y) => {
  await page.evaluate(top => window.scrollTo({ top, behavior: "instant" }), y);
  await frames(page);
};
const headerBox = page => page.evaluate(() => {
  const rect = document.querySelector("[data-site-header]").getBoundingClientRect();
  return { top: Math.round(rect.top), bottom: Math.round(rect.bottom), height: Math.round(rect.height) };
});
const open = async (viewport, touch) => {
  const page = await browser.newPage({ viewport, hasTouch: touch, isMobile: touch, reducedMotion: "reduce" });
  await page.goto(`${origin}/vi/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
  await page.evaluate(() => document.fonts.ready);
  await frames(page);
  return page;
};

try {
  for (const viewport of [{ width: 412, height: 915 }, { width: 915, height: 412 }]) {
    const label = `${viewport.width}x${viewport.height}`;
    const page = await open(viewport, true);
    try {
      assert.equal((await headerBox(page)).top, 0, `${label}: header fully visible at page top`);
      // R6: một chiều cao header trên điện thoại, logo cùng cỡ trước và sau mốc thu gọn 100px.
      const size = () => page.evaluate(() => {
        const header = document.querySelector("[data-site-header]");
        const logo = header.querySelector(".brand-lockup").getBoundingClientRect();
        return { header: header.offsetHeight, logo: [Math.round(logo.width), Math.round(logo.height)] };
      });
      const topSize = await size();
      await scrollTo(page, 150);
      assert.ok(await page.evaluate(() => document.querySelector("[data-site-header]").classList.contains("is-collapsed")));
      assert.deepEqual(await size(), topSize, `${label}: collapsing keeps header and logo size (R6)`);
      await scrollTo(page, 0);
      await scrollTo(page, 30);
      assert.equal((await headerBox(page)).top, -30, `${label}: scrolling 30px shifts the header 30px (R2)`);
      await scrollTo(page, 20);
      assert.equal((await headerBox(page)).top, -20, `${label}: scrolling up 10px reveals 10px again (R2)`);
      await page.waitForTimeout(400);
      assert.equal((await headerBox(page)).top, -20, `${label}: stopping the scroll keeps the position (R3)`);

      await scrollTo(page, 1500);
      assert((await headerBox(page)).bottom <= 0, `${label}: scrolling far hides the header fully`);
      await scrollTo(page, 1490);
      assert.equal((await headerBox(page)).bottom, 10, `${label}: scrolling up 10px reveals 10px`);
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      await scrollTo(page, max);
      assert((await headerBox(page)).bottom <= 0, `${label}: page end does not reveal the header`);

      // Header đang khuất nên bấm bằng DOM; R4 chỉ cần mở rồi đóng menu.
      await page.evaluate(() => document.querySelector("[data-menu-open]").click());
      await page.waitForFunction(() => document.body.classList.contains("menu-open"));
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.body.classList.contains("menu-open"));
      await frames(page);
      assert.equal((await headerBox(page)).top, 0, `${label}: closing the menu shows the full header (R4)`);
      await scrollTo(page, max - 40);
      assert.equal((await headerBox(page)).top, 0, `${label}: scrolling up after the menu keeps the header fully visible`);
    } finally {
      await page.close();
    }
  }

  const desktop = await open({ width: 1440, height: 900 }, false);
  try {
    const tall = await desktop.evaluate(() => document.querySelector("[data-site-header]").offsetHeight);
    await scrollTo(desktop, 150);
    assert.ok(await desktop.evaluate(() => document.querySelector("[data-site-header]").offsetHeight) < tall,
      "1440px mouse: collapsing still shrinks the header (R6 is phone only)");
    await scrollTo(desktop, 0);
    await scrollTo(desktop, 30);
    assert.equal((await headerBox(desktop)).top, 0, "1440px mouse: header follows Shell R3, not the scroll");
    assert.equal(await desktop.evaluate(() => document.querySelector("[data-site-header]").classList.contains("is-follow")), false);
  } finally {
    await desktop.close();
  }
  console.log("phone-header-scroll PASS");
} finally {
  await browser.close();
}
