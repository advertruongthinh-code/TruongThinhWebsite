import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
try {
  // Điện thoại cao 780px: nút suggestion cuối nằm dưới mép màn hình nhưng vẫn phải đẩy theo sóng 0.4s (detail R6).
  const page = await browser.newPage({ viewport: { width: 412, height: 780 }, isMobile: true, hasTouch: true });
  await page.goto(`${process.env.BASE_URL || "http://127.0.0.1:8787"}/vi/advertising-products/?photo=kiosk-posm-07`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-advertising-photo-view]:not([hidden]) [data-advertising-suggestion-tag]");
  const pushes = await page.evaluate(async () => {
    const t0 = performance.now(), log = [];
    const buttons = [...document.querySelectorAll("[data-advertising-photo-view]:not([hidden]) [data-advertising-suggestion-tag]")];
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node.dataset?.advertisingSuggestionImageLayer === "next") log.push([buttons.indexOf(record.target), performance.now() - t0]);
    }))).observe(document.body, { childList: true, subtree: true });
    await new Promise(resolve => setTimeout(resolve, 11000));
    return { count: buttons.length, below: buttons.at(-1).getBoundingClientRect().bottom > innerHeight, log };
  });
  assert.ok(pushes.below, "the last suggestion starts below the fold");
  const order = pushes.log.map(([index]) => index);
  assert.deepEqual(order, [...Array(2 * pushes.count).keys()].map(index => index % pushes.count), `wave order ${order}`);
  pushes.log.slice(1).forEach(([index, time], step) => {
    if (index) assert.ok(Math.abs(time - pushes.log[step][1] - 400) < 150, `button ${index} gap ${time - pushes.log[step][1]}`);
  });
  console.log(`suggestion wave: ${pushes.count} buttons push in order, 0.4s apart, including below the fold`);
} finally {
  await browser.close();
}
