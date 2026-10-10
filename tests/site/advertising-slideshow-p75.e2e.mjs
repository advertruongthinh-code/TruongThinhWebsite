import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1567, height: 910 } });
  await page.goto(`${process.env.BASE_URL || "http://127.0.0.1:8787"}/vi/advertising-products/?category=kiosk-posm&photo=kiosk-posm-07`, { waitUntil: "networkidle" });
  const button = page.locator('[data-advertising-suggestion-tag="use-sampling"]');
  await button.waitFor();
  await button.scrollIntoViewIfNeeded();
  const image = button.locator('[data-advertising-suggestion-image-layer="current"]');
  const first = await image.getAttribute("src");
  await page.waitForTimeout(8000);
  const second = await image.getAttribute("src");
  assert.notEqual(second, first, "inactive suggestion crossfades to another related image");
  assert.equal(await image.evaluate(el => el.getAnimations().some(animation => animation.effect.getKeyframes()[0].transform === "scale(1.06)")), true,
    "autoplay zooms the new image like the home hero");
  // Bộ thưa (dưới 4 ảnh) vẫn zoom ngay khi hiện, như hero.
  await page.goto(`${process.env.BASE_URL || "http://127.0.0.1:8787"}/vi/advertising-products/?photo=signage-raised-letters-20`, { waitUntil: "networkidle" });
  await page.locator("[data-advertising-suggestion-tag]").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('[data-advertising-suggestion-tag][aria-pressed="false"]')]
    .filter(b => b.getBoundingClientRect().bottom <= innerHeight)
    .map(b => b.querySelector('[data-advertising-suggestion-image-layer="current"]').getAnimations()
      .some(a => a.playState === "running" && a.effect.getKeyframes()[0].transform === "scale(1.06)"))
    .filter(running => !running)), [], "every visible suggestion zooms out on mount, sparse decks included");
  const clocks = await page.evaluate(() => [...document.querySelectorAll("[data-advertising-suggestion-tag]")]
    .map(b => b.querySelector('[data-advertising-suggestion-image-layer="current"]').getAnimations()
      .find(a => a.effect.getKeyframes()[0].transform === "scale(1.06)")?.effect.getTiming().delay));
  clocks.slice(1).forEach((clock, index) => assert.equal(clock - clocks[index], 400,
    `suggestion ${index + 1} trails the one above by 0.4s (wave): ${clocks}`));
  const sparseFirst = await page.evaluate(() => document.querySelector("[data-advertising-suggestion-tag]")
    .querySelector('[data-advertising-suggestion-image-layer="current"]').dataset.advertisingSuggestionPhoto);
  await page.waitForTimeout(7000);
  assert.ok(await page.evaluate(() => document.querySelector('[data-advertising-suggestion-tag] [data-advertising-suggestion-image-layer="current"]')
    .getAnimations().some(a => a.effect.getKeyframes()[0].transform === "scale(1.06)")), `sparse deck (${sparseFirst}) restarts the zoom after the crossfade`);
  await page.goto(`${process.env.BASE_URL || "http://127.0.0.1:8787"}/vi/advertising-products/?category=kiosk-posm&photo=kiosk-posm-07`, { waitUntil: "networkidle" });
  await button.scrollIntoViewIfNeeded();
  await button.click();
  const active = await image.getAttribute("src");
  await page.waitForTimeout(7000);
  assert.equal(await image.getAttribute("src"), active, "active suggestion does not rotate");
  assert.equal(await image.evaluate(el => getComputedStyle(el).opacity), "0");
  await page.goto(`${process.env.BASE_URL || "http://127.0.0.1:8787"}/vi/advertising-products/?category=office-signs-wayfinding&photo=office-signs-wayfinding-04`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-advertising-suggestion-tag]");
  const readSlides = () => [...document.querySelectorAll("[data-advertising-suggestion-tag]")].map(button => ({ tag: button.dataset.advertisingSuggestionTag,
    src: button.querySelector('[data-advertising-suggestion-image-layer="current"]').getAttribute("src") }));
  const before = await page.evaluate(readSlides);
  await page.waitForTimeout(8000);
  const after = await page.evaluate(readSlides);
  assert.equal(before.length, 4);
  before.forEach((item, index) => assert.notEqual(after[index].src, item.src, `${item.tag}: new media fills the sparse deck`));
  await page.waitForFunction(() => document.querySelector('[data-advertising-suggestion-image-layer="next"]'));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => !document.querySelector('[data-advertising-suggestion-image-layer="next"]'));
  const reduced = await page.evaluate(readSlides);
  await page.waitForTimeout(5500);
  assert.deepEqual(await page.evaluate(readSlides), reduced, "live reduced-motion change stops slideshow");
  await page.screenshot({ path: ".tmp/p75-suggestion-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[data-advertising-suggestion-tag]").first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: ".tmp/p75-suggestion-mobile.png" });
  console.log("PASS suggestion push wave with hero zoom, active stays white");
} finally { await browser.close(); }
