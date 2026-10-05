import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const hero = "signage-raised-letters-02";
const tag = "product-signage-raised-letters-product-12";
try {
  for (const locale of ["vi", "en"]) {
    const page = await browser.newPage({ viewport: { width: 1569, height: 912 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:8787/${locale}/advertising-products/?category=signage-raised-letters&photo=${hero}&tag=${tag}`, { waitUntil: "domcontentloaded" });
    const button = page.locator(`[data-advertising-suggestion-tag="${tag}"]`);
    await button.waitFor();
    // Direct loads keep the route veil over the page until mount; a click before then makes Playwright scroll to retry.
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter") && !document.body.classList.contains("is-transitioning"));
    await page.waitForTimeout(600);
    const snapshot = () => page.evaluate(() => {
      const primary = document.querySelector(".advertising-photo-view__primary").getBoundingClientRect();
      const grid = document.querySelector(".advertising-photo-view__related-grid");
      const card = grid.querySelector('[data-advertising-related-card="signage-raised-letters-12"]')?.getBoundingClientRect();
      return {
        primary: { x: primary.x, y: primary.y, width: primary.width, height: primary.height },
        card: card && { x: card.x, y: card.y },
        count: grid.querySelectorAll("figure:not([hidden])").length,
        slots: [...document.querySelectorAll("[data-advertising-suggestion-tag]")].map(e => {
          const r = e.getBoundingClientRect();
          return [e.dataset.advertisingSuggestionTag, r.x, r.y, r.width, r.height];
        }),
        photo: new URL(location.href).searchParams.get("photo"),
      };
    });
    const initial = await snapshot();
    for (let iteration = 0; iteration < 3; iteration++) {
      await button.click();
      await page.waitForTimeout(550);
      assert.equal(await button.getAttribute("aria-pressed"), "false");
      await button.click();
      await page.waitForTimeout(550);
      const settled = await snapshot();
      assert.equal(settled.count, 1);
      assert.equal(settled.photo, hero);
      assert.deepEqual(settled.primary, initial.primary);
      assert.deepEqual(settled.slots, initial.slots);
      assert.ok(settled.card.x > settled.primary.x + settled.primary.width);
      assert.ok(Math.abs(settled.card.y - settled.primary.y) < 0.5);
      await page.waitForTimeout(500);
      assert.deepEqual((await snapshot()).card, settled.card, "No second jump after motion settles");
    }
    await page.setViewportSize({ width: 820, height: 912 });
    await page.waitForTimeout(600);
    const narrow = await snapshot();
    assert.ok(narrow.card.y > narrow.primary.y + narrow.primary.height);
    assert.deepEqual(errors, []);
    console.log(`${locale}: 3 toggle cycles keep column 4; resize moves related below primary`);
    await page.close();
  }
} finally {
  await browser.close();
}
