// Back to top (shell, owner 2026-11-13; phones only, owner 2026-11-22): on a phone a page with a masonry layout shows an icon-only white
// 50px button once the page is below the masonry top; a tap glides back to the masonry top (owner 2026-11-23) and the button goes.
// Pages without masonry never show it.
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

for (const [name, viewport, touch] of [["phone", VIEWPORTS.phone, true]]) {
  test(`${name} masonry page: the white button shows below the masonry top and goes back to it`, async () => {
    const browser = await launchBrowser();
    const { context, page } = await openPage(browser, viewport, { hasTouch: touch, isMobile: touch });
    try {
      await page.goto(`${BASE_URL}/advertising-products/`, { waitUntil: "load" });
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
      assert.deepEqual(shown.size, [50, 50], "50px square");
      assert.equal(shown.background, "rgb(255, 255, 255)", "white");
      assert.equal(shown.text, "", "icon only");
      assert(await page.evaluate(() => Number(getComputedStyle(document.querySelector(".back-to-top")).zIndex)
        < Number(getComputedStyle(document.querySelector(".search-host")).zIndex)), "its shadow stays under the search bar");
      assert(shown.label, "has an accessible name");
      if (touch) await page.locator(".back-to-top").tap();
      else await page.locator(".back-to-top").click();
      // The grid's top lands one outer margin under the header, which comes back while the page moves up.
      await page.waitForFunction(() => {
        const grid = document.querySelector("[data-project-grid]").getBoundingClientRect().top;
        const header = Math.max(0, document.querySelector("[data-site-header]").getBoundingClientRect().bottom);
        const outer = Number.parseFloat(getComputedStyle(document.querySelector(".masonry-section")).getPropertyValue("--masonry-outer"));
        return Math.abs(grid - header - outer) <= 2;
      }, null, { timeout: 5000 });
      await page.waitForFunction(() => !document.querySelector(".back-to-top").classList.contains("show"));
      // Just below the masonry top it shows again (after the 600ms glide has ended).
      await page.waitForTimeout(700);
      await page.evaluate(() => scrollBy({ top: 40, behavior: "instant" }));
      await page.waitForFunction(() => document.querySelector(".back-to-top").classList.contains("show"), null, { timeout: 3000 });
    } finally {
      await context.close();
      await browser.close();
    }
  });
}

test("PC never shows it (owner 2026-11-22)", async () => {
  const browser = await launchBrowser();
  const { context, page } = await openPage(browser, VIEWPORTS.desktop, { hasTouch: false, isMobile: false });
  try {
    await page.goto(`${BASE_URL}/advertising-products/`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector("[data-masonry-item]"));
    await page.evaluate(() => window.TruongThinhMotion?.setLogicalScroll?.(innerHeight * 3) || scrollTo({ top: innerHeight * 3 }));
    await page.waitForTimeout(1500);
    const result = await state(page);
    assert(!result.shown && result.size[0] === 0, `PC: ${JSON.stringify(result)}`);
  } finally {
    await context.close();
    await browser.close();
  }
});

test("pages without masonry never show it", async () => {
  const browser = await launchBrowser();
  try {
    for (const [viewport, touch, path] of [[VIEWPORTS.desktop, false, "/about/"], [VIEWPORTS.phone, true, "/about/"]]) {
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

// Regression (owner 2026-11-22): a card page hides the search bar, and the phone button used to be placed by the hidden bar, off screen.
for (const [name, viewport] of [["portrait", VIEWPORTS.phone], ["landscape", { width: VIEWPORTS.phone.height, height: VIEWPORTS.phone.width }]]) {
  test(`phone ${name} card page: the button stays at the right edge`, async () => {
    const browser = await launchBrowser();
    const { context, page } = await openPage(browser, viewport, { hasTouch: true, isMobile: true });
    try {
      await page.goto(`${BASE_URL}/advertising-products/p/kiosk-posm-01/`, { waitUntil: "load" });
      await page.waitForFunction(() => document.querySelector("[data-masonry-item]"));
      await page.waitForFunction(() => {
        scrollTo({ top: innerHeight * 3, behavior: "instant" });
        return document.querySelector(".back-to-top").classList.contains("show");
      }, null, { polling: 500, timeout: 10_000 });
      await page.waitForTimeout(1200);
      const { onScreen, rightGap } = await page.evaluate(() => {
        const rect = document.querySelector(".back-to-top").getBoundingClientRect();
        return { onScreen: rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight, rightGap: Math.round(innerWidth - rect.right) };
      });
      assert(onScreen && rightGap === 16, `on screen at the right edge: ${JSON.stringify({ onScreen, rightGap })}`);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}

// Owner 2026-11-23 (search-bar R5): on a phone, portrait and landscape, the floating search bar and the button share one row lined
// up with the grid: bar from the grid's left edge, 10px gap, button on the grid's right edge, input row and button bottoms equal.
for (const [name, viewport] of [["portrait", VIEWPORTS.phone], ["landscape", { width: VIEWPORTS.phone.height, height: VIEWPORTS.phone.width }]]) {
  test(`phone ${name} Advertising root: the button shares the floating bar's row, lined up with the grid`, async () => {
    const browser = await launchBrowser();
    const { context, page } = await openPage(browser, viewport, { hasTouch: true, isMobile: true });
    try {
      await page.goto(`${BASE_URL}/advertising-products/`, { waitUntil: "load" });
      await page.waitForFunction(() => document.querySelector("[data-masonry-item]"));
      await page.waitForFunction(() => {
        scrollTo({ top: innerHeight * 3, behavior: "instant" });
        return document.querySelector(".back-to-top").classList.contains("show") && document.body.dataset.searchPlace === "float";
      }, null, { polling: 500, timeout: 10_000 });
      await page.waitForTimeout(1200);
      const box = await page.evaluate(() => {
        const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
        const grid = rect("[data-project-grid]");
        const shell = rect(".search-host .search-bar__shell");
        const button = rect(".back-to-top");
        const hit = document.elementFromPoint(button.left + 25, button.top + 25)?.closest(".back-to-top") !== null;
        return { barLeft: shell.left - grid.left, gap: button.left - shell.right, buttonRight: button.right - grid.right,
          shellBottom: shell.bottom - button.bottom, hit };
      });
      for (const key of ["barLeft", "gap", "buttonRight", "shellBottom"]) box[key] = Math.round(box[key]);
      assert.equal(box.barLeft, 0, `bar on the grid's left edge: ${JSON.stringify(box)}`);
      assert.equal(box.gap, 10, `10px between bar and button: ${JSON.stringify(box)}`);
      assert.equal(box.buttonRight, 0, `button on the grid's right edge: ${JSON.stringify(box)}`);
      assert.equal(box.shellBottom, 0, `same bottom: ${JSON.stringify(box)}`);
      assert(box.hit, "the button takes taps");
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
