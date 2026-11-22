// Back to top (shell, owner 2026-11-13, every device since 2026-11-22): a page with a masonry layout shows an icon-only white 50px button
// once the first screen is passed; a tap or click scrolls to the top and the button goes. Pages without masonry never show it.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node --test tests/site/back-to-top.e2e.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { BASE_URL, VIEWPORTS, launchBrowser, openPage } from "./harness.mjs";

const state = (page) => page.evaluate(() => {
  const button = document.querySelector(".back-to-top");
  const rect = button.getBoundingClientRect();
  return { shown: button.classList.contains("show"), onScreen: rect.right <= innerWidth && rect.width > 0,
    size: [rect.width, rect.height].map(Math.round), background: getComputedStyle(button).backgroundColor,
    label: button.getAttribute("aria-label"), text: button.textContent.trim(), scrollY };
});
const scrollPast = (page) => page.evaluate(() => scrollTo({ top: innerHeight * 3, behavior: "instant" }));

for (const [name, viewport, touch] of [["phone", VIEWPORTS.phone, true], ["PC", VIEWPORTS.desktop, false]]) {
  test(`${name} masonry page: the same white button shows past the first screen and goes back to the top`, async () => {
    const browser = await launchBrowser();
    const { context, page } = await openPage(browser, viewport, { hasTouch: touch, isMobile: touch });
    try {
      await page.goto(`${BASE_URL}/vi/advertising-products/`, { waitUntil: "load" });
      await page.waitForFunction(() => document.querySelector("[data-masonry-item]"));
      assert.equal((await state(page)).shown, false, "hidden on the first screen");
      // PC scrolls through Locomotive, which can still reset the page while it starts: scroll again until the page stays down.
      await page.waitForFunction(() => {
        const top = innerHeight * 3;
        if ((window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY) >= top - 1) return true;
        if (!window.TruongThinhMotion?.setLogicalScroll?.(top)) scrollTo({ top, behavior: "instant" });
        return false;
      }, null, { polling: 500, timeout: 10_000 });
      await page.waitForTimeout(1200);
      const shown = await state(page);
      assert(shown.shown && shown.onScreen, `shown in the corner: ${JSON.stringify(shown)}`);
      assert.deepEqual(shown.size, [50, 50], "50px square on every device");
      assert.equal(shown.background, "rgb(255, 255, 255)", "white on every device");
      assert.equal(shown.text, "", "icon only");
      assert(shown.label, "has an accessible name");
      if (touch) await page.locator(".back-to-top").tap();
      else await page.locator(".back-to-top").click();
      await page.waitForFunction(() => (window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY) === 0, null, { timeout: 5000 });
      await page.waitForFunction(() => !document.querySelector(".back-to-top").classList.contains("show"));
    } finally {
      await context.close();
      await browser.close();
    }
  });
}

test("pages without masonry never show it", async () => {
  const browser = await launchBrowser();
  try {
    for (const [viewport, touch, path] of [[VIEWPORTS.desktop, false, "/vi/about/"], [VIEWPORTS.phone, true, "/vi/about/"]]) {
      const { context, page } = await openPage(browser, viewport, { hasTouch: touch, isMobile: touch });
      await page.goto(`${BASE_URL}${path}`, { waitUntil: "load" });
      await scrollPast(page);
      await page.waitForTimeout(800);
      const result = await state(page);
      assert(!result.shown, `${path} ${touch ? "phone" : "PC"}: ${JSON.stringify(result)}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
});
