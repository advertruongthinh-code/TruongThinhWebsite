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
  console.log("PASS suggestion crossfade with hero zoom, active stays white");
} finally { await browser.close(); }
