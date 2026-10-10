// Header đi theo quãng cuộn trên điện thoại (docs/specs/phone-header-scroll.md R1-R4).
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
      assert.equal((await headerBox(page)).top, 0, `${label}: header hiện đủ ở đầu trang`);
      await scrollTo(page, 30);
      assert.equal((await headerBox(page)).top, -30, `${label}: cuộn 30px thì header lệch 30px (R2)`);
      await scrollTo(page, 20);
      assert.equal((await headerBox(page)).top, -20, `${label}: cuộn lên 10px thì lộ lại 10px (R2)`);
      await page.waitForTimeout(400);
      assert.equal((await headerBox(page)).top, -20, `${label}: dừng cuộn thì giữ nguyên (R3)`);

      await scrollTo(page, 1500);
      assert((await headerBox(page)).bottom <= 0, `${label}: cuộn xa thì header khuất hẳn`);
      await scrollTo(page, 1490);
      assert.equal((await headerBox(page)).bottom, 10, `${label}: cuộn lên 10px thì lộ 10px`);
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      await scrollTo(page, max);
      assert((await headerBox(page)).bottom <= 0, `${label}: cuối trang không tự hiện`);

      // Header đang khuất nên bấm bằng DOM; R4 chỉ cần mở rồi đóng menu.
      await page.evaluate(() => document.querySelector("[data-menu-open]").click());
      await page.waitForFunction(() => document.body.classList.contains("menu-open"));
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.body.classList.contains("menu-open"));
      await frames(page);
      assert.equal((await headerBox(page)).top, 0, `${label}: đóng menu thì header hiện đủ (R4)`);
      await scrollTo(page, max - 40);
      assert.equal((await headerBox(page)).top, 0, `${label}: cuộn lên sau menu thì vẫn hiện đủ`);
    } finally {
      await page.close();
    }
  }

  const desktop = await open({ width: 1440, height: 900 }, false);
  try {
    await scrollTo(desktop, 30);
    assert.equal((await headerBox(desktop)).top, 0, "1440px chuột: header theo Shell R3, không đi theo cuộn");
    assert.equal(await desktop.evaluate(() => document.querySelector("[data-site-header]").classList.contains("is-follow")), false);
  } finally {
    await desktop.close();
  }
  console.log("phone-header-scroll PASS");
} finally {
  await browser.close();
}
