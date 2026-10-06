import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");

function hasSharedMediaTiming({ duration, easing }) {
  return duration.split(",").every((value) => value.trim() === "0.6s")
    && easing.split(",").every((value) => value.trim() === "ease-out");
}

const browser = await chromium.launch({ headless: true });
try {
  for (const locale of ["vi", "en"]) {
    const page = await browser.newPage({ viewport: { width: 1569, height: 912 } });
    for (const detail of [true, false]) {
      const query = detail ? "?category=signage-raised-letters&photo=signage-raised-letters-02&tag=product-signage-raised-letters-product-12" : "";
      await page.goto(`http://127.0.0.1:8787/${locale}/advertising-products/${query}`, { waitUntil: "domcontentloaded" });
      // The direct-load veil blocks pointer input until the page has mounted.
      await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
      const card = page.locator(detail ? "[data-advertising-related-card]" : "[data-advertising-card]").first();
      await card.scrollIntoViewIfNeeded();
      const image = card.locator("img");
      await page.waitForFunction(selector => {
        const image = document.querySelector(selector)?.querySelector("img");
        return image?.complete && image.naturalWidth > 0;
      }, detail ? "[data-advertising-related-card]" : "[data-advertising-card]");
      await image.evaluate(image => image.decode());
      await page.waitForTimeout(700);
      const rect = await card.boundingBox();
      await card.hover();
      await page.waitForTimeout(700);
      const mediaMotion = () => image.evaluate((image) => {
        const style = getComputedStyle(image);
        return {
          scale: new DOMMatrixReadOnly(style.transform).a,
          duration: style.transitionDuration,
          easing: style.transitionTimingFunction,
        };
      });
      const hoverMotion = await mediaMotion();
      assert.ok(Math.abs(hoverMotion.scale - 1.15) < 0.01, `${locale} ${detail ? "detail" : "parent"} hover zoom`);
      assert(hasSharedMediaTiming(hoverMotion), `${locale} ${detail ? "detail" : "parent"} hover uses 600ms ease-out`);
      assert.deepEqual(await card.boundingBox(), rect, "Hover must not shift the card frame");
      await page.mouse.move(0, 0);
      await page.waitForTimeout(700);
      // Slow CI frames can leave the 600ms ease-out a few frames short; wait for it to land.
      await image.evaluate(image => Promise.all(image.getAnimations().map(animation => animation.finished)));
      assert.equal((await mediaMotion()).scale, 1);
      await page.keyboard.press("Tab");
      await card.locator("a").focus();
      await page.waitForTimeout(700);
      const focusMotion = await mediaMotion();
      assert.ok(Math.abs(focusMotion.scale - 1.15) < 0.01, "Keyboard focus matches hover feedback");
      assert(hasSharedMediaTiming(focusMotion), "Keyboard focus keeps 600ms ease-out shared media timing");
      await page.emulateMedia({ reducedMotion: "reduce" });
      const reducedMotion = await mediaMotion();
      assert.equal(reducedMotion.scale, 1, "Reduced motion removes zoom while preserving focus");
      assert.equal(reducedMotion.duration, "0s", "Reduced motion leaves no media transition");
      assert.notEqual(await card.locator("a").evaluate(e => getComputedStyle(e).outlineStyle), "none");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const expectedPhoto = await card.locator("a").evaluate(e => new URL(e.href).searchParams.get("photo"));
      await page.keyboard.press("Enter");
      await page.waitForFunction(id => new URL(location.href).searchParams.get("photo") === id, expectedPhoto);
      assert.equal(await page.locator(".advertising-photo-view").getAttribute("data-advertising-photo-id"), expectedPhoto);
      console.log(`${locale} ${detail ? "detail" : "parent"} hover/focus/reduced/Enter passed`);
    }
    await page.close();
  }
  for (const detail of [true, false]) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    });
    const query = detail ? "?category=signage-raised-letters&photo=signage-raised-letters-02&tag=product-signage-raised-letters-product-12" : "";
    await page.goto(`http://127.0.0.1:8787/vi/advertising-products/${query}`, { waitUntil: "domcontentloaded" });
    // The direct-load veil blocks pointer input until the page has mounted.
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    const selector = detail ? "[data-advertising-related-card]" : "[data-advertising-card]";
    const card = page.locator(selector).first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForFunction(selector => {
      const image = document.querySelector(selector)?.querySelector("img");
      return image?.complete && image.naturalWidth > 0;
    }, selector);
    assert.equal(await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches), false);
    assert.equal(await card.locator("img").evaluate(e => new DOMMatrixReadOnly(getComputedStyle(e).transform).a), 1);
    const expectedPhoto = await card.locator("a").evaluate(e => new URL(e.href).searchParams.get("photo"));
    await card.locator("a").tap();
    await page.waitForFunction(id => new URL(location.href).searchParams.get("photo") === id, expectedPhoto);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    console.log(`mobile ${detail ? "detail" : "parent"} touch opens with no hover dependency`);
    await page.close();
  }
} finally {
  await browser.close();
}
