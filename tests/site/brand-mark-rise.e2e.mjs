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
    await page.evaluate(() => document.querySelectorAll("#header-logo .brand-lockup__mark path")
      .forEach((item) => item.getAnimations().forEach((animation) => animation.finish())));
    await page.waitForFunction(() => !document.querySelector(".brand-lockup__mark-underlay"));
    console.log(`PASS ${label}: hidden at 0.1s ${early.hidden.map((value) => value.toFixed(1)).join(" / ")}`);
    await context.close();
  }
} finally {
  await browser.close();
}
