// On-page search bar of the advertising pages (advertising-search R6, R7, R9, R10; text part). /api/search is mocked with fixed scores.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node --test tests/site/advertising-search.e2e.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { BASE_URL, SWEEP_WIDTHS, launchBrowser, openPage, viewportAt } from "./harness.mjs";

const PAGE = `${BASE_URL}/vi/advertising-products/`;
const WIDE = { width: 1440, height: 900 };
const PHONE = { width: 384, height: 724, isMobile: true, hasTouch: true };
const VECTOR_IDS = ["kiosk-posm-01", "kiosk-posm-02", "kiosk-posm-03"];

// The Worker answer after `delay` ms: every listed id scores 1 (passes the threshold), nothing else.
const mockApi = (page, { delay = 0, ids = VECTOR_IDS, status = 200 } = {}) => page.route("**/api/search", async (route) => {
  await new Promise((resolve) => setTimeout(resolve, delay));
  const body = status === 200
    ? { status: "ok", inputs: [{ kind: "text", scores: ids.map((id) => [id, 1, 1]) }] }
    : { status: "unavailable" };
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }).catch(() => {});
});

const open = async (browser, viewport = WIDE, url = PAGE, api = { status: 503 }) => {
  const { context, page } = await openPage(browser, viewport);
  await mockApi(page, api);
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector(".search-host .search-bar, [data-search-dock] .search-bar", { timeout: 20000 });
  return { context, page };
};
const search = async (page, text) => {
  await page.fill(".search-bar input", text);
  await page.press(".search-bar input", "Enter");
};
const statusText = (page) => page.locator("[data-search-status]").innerText();
const isDocked = (page) => page.evaluate(() => Boolean(document.querySelector("[data-search-dock] .search-bar")));
// End/Home like a visitor; repeated because the smooth scroller may still be starting after the bar mounts.
const pressUntil = async (page, key, docked) => {
  for (let i = 0; i < 10 && (await isDocked(page)) !== docked; i++) {
    await page.keyboard.press(key);
    await page.waitForTimeout(800);
  }
  assert.equal(await isDocked(page), docked, `${key}: docked ${docked}`);
};
const clickUntil = async (page, selector, arrived) => {
  for (let i = 0; i < 5; i++) {
    await page.click(selector);
    if (await page.waitForFunction(arrived, null, { timeout: 3000 }).then(() => true, () => false)) return;
  }
  assert.fail(`${selector} did not navigate`);
};
const scrollToSlot = (page) => pressUntil(page, "End", true);
const scrollToTop = (page) => pressUntil(page, "Home", false);

test("R6: slow Worker shows keyword results at 0.8 s, then offers the vector results", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, PAGE, { delay: 2000 });
    const start = Date.now();
    await search(page, "hộp đèn");
    await page.waitForFunction(() => /kết quả/i.test(document.querySelector("[data-search-status]").textContent), null, { timeout: 2000 });
    const shownAt = Date.now() - start;
    assert(shownAt >= 700 && shownAt < 1800, `keyword results at ${shownAt} ms`);
    await page.waitForSelector("[data-masonry-offer]", { timeout: 4000 });
    await context.close();
  } finally {
    await browser.close();
  }
});

test("R6, R9: no keyword match keeps the grid pending until the Worker answers empty, then offers Zalo", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, PAGE, { delay: 2000, ids: [] });
    await search(page, "xyzzy qwerty");
    await page.waitForTimeout(1500);
    assert(await page.locator("[data-masonry-pending]").count(), "still pending at 1.5 s");
    await page.waitForFunction(() => !document.querySelector("[data-masonry-pending]"), null, { timeout: 4000 });
    assert.match(await statusText(page), /zalo/i);
    await context.close();
  } finally {
    await browser.close();
  }
});

test("R9: a price question keeps the cards and adds the price invitation", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, PAGE, { status: 503 });
    await search(page, "giá hộp đèn tay vẫy bao nhiêu");
    await page.waitForFunction(() => /kết quả/i.test(document.querySelector("[data-search-status]").textContent));
    assert.match(await statusText(page), /hỏi giá qua zalo/i);
    await context.close();
  } finally {
    await browser.close();
  }
});

for (const viewport of [WIDE, PHONE]) {
  test(`R7 at ${viewport.width}px: the bar docks under the CTA heading, stays there to the footer and floats again above`, async () => {
    const browser = await launchBrowser();
    try {
      const { context, page } = await open(browser, viewport);
      assert.equal(await isDocked(page), false, "floats on the first screen");
      await scrollToSlot(page);
      const docked = await page.evaluate(() => {
        const talk = document.querySelector("[data-search-dock] .search-bar__talk");
        const slot = document.querySelector("[data-search-dock]").getBoundingClientRect();
        const bar = document.querySelector("[data-search-dock] .search-bar__shell").getBoundingClientRect();
        const legacy = document.querySelector(".detail-cta .legacy-link");
        return { talk: getComputedStyle(talk).visibility, below: Math.round(bar.top - slot.top) === 2 && Math.round(bar.bottom) <= Math.round(slot.bottom), legacy: legacy && getComputedStyle(legacy).display };
      });
      assert.deepEqual(docked, { talk: "visible", below: true, legacy: "none" });
      await page.fill(".search-bar input", "chữ nổi");
      assert.equal(await page.inputValue(".search-bar input"), "chữ nổi", "typeable when docked");
      await page.locator(".search-bar input").blur();
      await scrollToTop(page);
      if (viewport.hasTouch) {
        // Past the first screen the back-to-top button shows; the floating bar must not cover it.
        await page.evaluate(() => scrollTo({ top: innerHeight * 3, behavior: "instant" }));
        await page.waitForFunction(() => document.querySelector(".back-to-top.show"), null, { timeout: 4000 });
        await page.waitForTimeout(1100);
        const hit = await page.evaluate(() => {
          const rect = document.querySelector(".back-to-top").getBoundingClientRect();
          return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest(".back-to-top") !== null;
        });
        assert(hit, "back-to-top is above the bar");
      }
      await context.close();
    } finally {
      await browser.close();
    }
  });
}

for (const viewport of [WIDE, PHONE]) {
  test(`R7, R9 at ${viewport.width}px: a search from the docked bar shows its status and the Zalo button`, async () => {
    const browser = await launchBrowser();
    try {
      const { context, page } = await open(browser, viewport, PAGE, { ids: [] });
      await scrollToSlot(page);
      await search(page, "xqzw vbnk");
      const zalo = page.locator("[data-search-status] button", { hasText: /zalo/i });
      await zalo.waitFor({ state: "visible", timeout: 5000 });
      const box = await zalo.boundingBox();
      const size = page.viewportSize();
      assert(box && box.height > 0 && box.y + box.height <= size.height && box.x >= 0, `Zalo button on screen: ${JSON.stringify(box)}`);
      assert(await isDocked(page), "still docked");
      assert.match(await page.locator("[data-search-live]").textContent(), /chưa thấy/i, "announced in the live region");
      await context.close();
    } finally {
      await browser.close();
    }
  });
}

test("R10: a #tim= link searches; a language switch keeps the query; Esc and a chip clear it", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, `${PAGE}#tim=${encodeURIComponent("hộp đèn")}`);
    await page.waitForFunction(() => /kết quả/i.test(document.querySelector("[data-search-status]")?.textContent || ""));
    assert.equal(await page.inputValue(".search-bar input"), "hộp đèn");

    await page.click("[data-menu-open]");
    await page.click('[data-language-option="en"]');
    await page.waitForURL(/\/en\/advertising-products\//);
    await page.waitForSelector(".search-bar", { timeout: 20000 });
    await page.waitForFunction(() => /results/i.test(document.querySelector("[data-search-status]").textContent), null, { timeout: 6000 });
    assert.equal(await page.inputValue(".search-bar input"), "hộp đèn");

    await page.press(".search-bar input", "Escape");
    assert.equal(await page.inputValue(".search-bar input"), "");
    assert.equal(await page.locator("[data-search-status]").isHidden(), true);

    await search(page, "hộp đèn");
    await page.waitForFunction(() => /results/i.test(document.querySelector("[data-search-status]").textContent));
    const left = page.evaluate(() => new Promise((resolve) => addEventListener("masonry:search-left", (e) => resolve(e.detail?.reason), { once: true })));
    await page.locator("[data-masonry-filter]").nth(1).click();
    assert.equal(await left, "filter");
    await page.waitForFunction(() => document.querySelector(".search-bar input").value === "");
    await context.close();
  } finally {
    await browser.close();
  }
});

test("R10: soft navigation from the menu does not restore, and leaving the page removes the bar", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, PAGE, { status: 503 });
    await search(page, "hộp đèn");
    await page.waitForFunction(() => /kết quả/i.test(document.querySelector("[data-search-status]").textContent));
    // The grid is still sliding to the results; a click during a page transition is ignored, so click until the route changes.
    await clickUntil(page, "#header-logo", () => !location.pathname.includes("advertising-products"));
    await page.waitForFunction(() => !document.querySelector(".search-bar"), null, { timeout: 8000 });
    await clickUntil(page, '[data-site-header] .desktop-nav a[href="/vi/advertising-products/"]', () => location.pathname.includes("advertising-products"));
    await page.waitForSelector(".search-bar", { timeout: 20000 });
    await page.waitForTimeout(500);
    assert.equal(await page.locator(".search-bar").count(), 1, "exactly one bar");
    assert.equal(await page.inputValue(".search-bar input"), "", "not restored");
    await context.close();
  } finally {
    await browser.close();
  }
});

test("R7: no horizontal scroll at the six widths, floating and docked", async () => {
  const browser = await launchBrowser();
  try {
    for (const width of SWEEP_WIDTHS) {
      const { context, page } = await open(browser, viewportAt(width));
      for (const step of [null, scrollToSlot]) {
        if (step) await step(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert(overflow <= 0, `${width}px ${step ? "docked" : "floating"}: ${overflow}px wider`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
});
