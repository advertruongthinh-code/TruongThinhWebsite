// advertising-detail R10: detail ảnh không có hero nên header luôn thu gọn; primary nằm ngay dưới header đó.
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/advertising-photo-header.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const header = () => {
  const node = document.querySelector(".site-header");
  return { collapsed: node.classList.contains("is-collapsed"), height: Math.round(node.getBoundingClientRect().height),
    background: getComputedStyle(node).backgroundColor };
};
try {
  for (const [width, height, mobile, expected, gutter] of [[390, 844, true, 71, 15], [1440, 900, false, 81, 35]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    await page.goto(`${base}/vi/advertising-products/?category=kiosk-posm&photo=kiosk-posm-07`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoLayout);
    await page.waitForTimeout(800);
    const label = `${width}px`;
    const samples = [await page.evaluate(header)];
    for (const y of [400, 0]) {
      await page.evaluate(top => window.TruongThinhMotion.setLogicalScroll(top), y);
      await page.waitForTimeout(500);
      samples.push(await page.evaluate(header));
    }
    assert.deepEqual(samples.filter(item => !item.collapsed || item.height !== expected || item.background !== "rgb(255, 255, 255)"), [],
      `${label}: header stays collapsed, white, ${expected}px on detail ${JSON.stringify(samples)}`);
    const heroTop = await page.evaluate(() => Math.round(document.querySelector("[data-advertising-photo-hero]").getBoundingClientRect().top));
    assert.ok(Math.abs(heroTop - (expected + gutter)) <= 1, `${label}: primary starts ${gutter}px under the collapsed header (top ${heroTop})`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.body.classList.contains("is-advertising-photo"));
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    await page.waitForTimeout(500);
    assert.equal((await page.evaluate(header)).collapsed, false, `${label}: masonry at scrollY 0 restores the tall header`);
    console.log(`PASS ${label}: header ${expected}px, primary top ${heroTop}`);
    await context.close();
  }
} finally {
  await browser.close();
}
