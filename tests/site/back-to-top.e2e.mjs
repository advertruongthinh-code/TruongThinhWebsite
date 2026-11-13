// Back to top on phones (shell, owner 2026-11-13): a page with a masonry layout shows an icon-only button once the first screen is passed;
// a tap scrolls to the top and the button goes. PC and pages without masonry never show it.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node --test tests/site/back-to-top.e2e.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { BASE_URL, VIEWPORTS, launchBrowser, openPage } from "./harness.mjs";

const state = (page) => page.evaluate(() => {
  const button = document.querySelector(".back-to-top");
  const rect = button.getBoundingClientRect();
  return { shown: button.classList.contains("show"), display: getComputedStyle(button).display, onScreen: rect.right <= innerWidth && rect.width > 0,
    label: button.getAttribute("aria-label"), text: button.textContent.trim(), scrollY };
});
const scrollPast = (page) => page.evaluate(() => scrollTo({ top: innerHeight * 3, behavior: "instant" }));

test("phone masonry page: the button shows past the first screen and a tap goes back to the top", async () => {
  const browser = await launchBrowser();
  const { context, page } = await openPage(browser, VIEWPORTS.phone, { hasTouch: true, isMobile: true });
  try {
    await page.goto(`${BASE_URL}/vi/advertising-products/`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector("[data-masonry-item]"));
    assert.equal((await state(page)).shown, false, "hidden on the first screen");
    await scrollPast(page);
    await page.waitForTimeout(1200);
    const shown = await state(page);
    assert(shown.shown && shown.onScreen, `shown in the corner: ${JSON.stringify(shown)}`);
    assert.equal(shown.text, "", "icon only");
    assert(shown.label, "has an accessible name");
    await page.locator(".back-to-top").tap();
    await page.waitForFunction(() => scrollY === 0, null, { timeout: 5000 });
    await page.waitForFunction(() => !document.querySelector(".back-to-top").classList.contains("show"));
  } finally {
    await context.close();
    await browser.close();
  }
});

test("PC and phone pages without masonry never show it", async () => {
  const browser = await launchBrowser();
  try {
    for (const [viewport, touch, path] of [[VIEWPORTS.desktop, false, "/vi/advertising-products/"], [VIEWPORTS.phone, true, "/vi/about/"]]) {
      const { context, page } = await openPage(browser, viewport, { hasTouch: touch, isMobile: touch });
      await page.goto(`${BASE_URL}${path}`, { waitUntil: "load" });
      await scrollPast(page);
      await page.waitForTimeout(800);
      const result = await state(page);
      assert(!result.shown && (touch || result.display === "none"), `${path} ${touch ? "phone" : "PC"}: ${JSON.stringify(result)}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
});
