// About journey (detail-pages R3, R9): a 1220 x 2440 nesting sheet sticks beside six milestones; from 981px with motion each milestone
// cuts its group of parts, otherwise the sheet is drawn complete. The page ends with the client logos then the CTA.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node --test tests/site/about-journey.e2e.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { BASE_URL, VIEWPORTS, launchBrowser, openPage, viewportAt } from "./harness.mjs";

const logicalScroll = (page, top) => page.waitForFunction((target) => {
  const now = window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY;
  if (Math.abs(now - target) < 2) return true;
  if (!window.TruongThinhMotion?.setLogicalScroll?.(target)) scrollTo({ top: target, behavior: "instant" });
  return false;
}, top, { polling: 300, timeout: 10_000 });

// Logical scroll that puts the year of milestone n (1-based) at the given share of the viewport height.
const yearAt = (page, n, share) => page.evaluate(([index, at]) => {
  const year = document.querySelectorAll(".about-journey__year")[index - 1];
  const now = window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY;
  return Math.round(year.getBoundingClientRect().top + now - innerHeight * at);
}, [n, share]);

const drawn = (page) => page.evaluate(() => [...document.querySelectorAll(".about-journey__stage")]
  .filter((group) => group.classList.contains("is-drawn")).map((group) => Number(group.dataset.journeyPart)));

for (const locale of ["", "en/"]) {
  test(`/${locale}about/ ends with the client logos then the CTA, six milestones`, async () => {
    const browser = await launchBrowser();
    const { context, page } = await openPage(browser, VIEWPORTS.desktop);
    try {
      await page.goto(`${BASE_URL}/${locale}about/`, { waitUntil: "load" });
      const order = await page.evaluate(() => {
        const blocks = [...document.querySelectorAll("main > *")];
        return { last: blocks.at(-1).className, before: blocks.at(-2).className,
          cta: document.querySelector("#tu-van a")?.dataset.cta, items: document.querySelectorAll(".about-journey__item").length,
          stages: document.querySelectorAll(".about-journey__svg--portrait .about-journey__stage").length };
      });
      assert.match(order.last, /\bdetail-cta\b/);
      assert.match(order.before, /\bclient-logo-marquee\b/);
      assert.equal(order.cta, "about-1");
      assert.equal(order.items, 6);
      assert.equal(order.stages, 6);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}

test("1440: each milestone cuts its group one way, the sheet stays pinned", async () => {
  const browser = await launchBrowser();
  const { context, page } = await openPage(browser, VIEWPORTS.desktop);
  try {
    await page.goto(`${BASE_URL}/about/`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector(".about-journey")?.classList.contains("is-armed"), null, { timeout: 10_000 });
    assert.deepEqual(await drawn(page), [], "nothing is cut above the journey");
    await logicalScroll(page, await yearAt(page, 2, 0.45));
    await page.waitForTimeout(800);
    assert.deepEqual(await drawn(page), [1, 2], "milestones 1-2 cut their groups");
    const sheetTop = () => page.evaluate(() => document.querySelector(".about-journey__sheet").getBoundingClientRect().top);
    const pinned = await sheetTop();
    await logicalScroll(page, await yearAt(page, 4, 0.45));
    await page.waitForTimeout(800);
    assert(Math.abs((await sheetTop()) - pinned) < 2, "the sheet does not move while the list scrolls");
    assert.equal(await page.locator(".about-journey__item.is-current .about-journey__year").textContent(), "2016");
    await logicalScroll(page, await yearAt(page, 6, 0.45));
    await page.waitForTimeout(800);
    assert.deepEqual(await drawn(page), [1, 2, 3, 4, 5, 6]);
    await logicalScroll(page, await yearAt(page, 1, 0.9));
    await page.waitForTimeout(500);
    assert.deepEqual(await drawn(page), [1, 2, 3, 4, 5, 6], "scrolling back keeps the cut parts");
  } finally {
    await context.close();
    await browser.close();
  }
});

test("1180 then 820 (tablet turned): the one-column journey shows every milestone in ink", async () => {
  const browser = await launchBrowser();
  const { context, page } = await openPage(browser, { width: 1180, height: 820 });
  try {
    await page.goto(`${BASE_URL}/about/`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector(".about-journey")?.classList.contains("is-armed"), null, { timeout: 10_000 });
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.waitForTimeout(800);
    const colors = await page.evaluate(() => [...new Set([...document.querySelectorAll(".about-journey__item")]
      .map((item) => getComputedStyle(item).color))]);
    assert.deepEqual(colors, ["rgb(32, 33, 32)"]);
  } finally {
    await context.close();
    await browser.close();
  }
});

test("reduced motion at 1440: the sheet is drawn complete, no milestone dimmed", async () => {
  const browser = await launchBrowser();
  const { context, page } = await openPage(browser, VIEWPORTS.desktop, { reducedMotion: "reduce" });
  try {
    await page.goto(`${BASE_URL}/about/`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const state = await page.evaluate(() => {
      const journey = document.querySelector(".about-journey");
      const part = getComputedStyle(journey.querySelector(".about-journey__svg--portrait .about-journey__part"));
      return { armed: journey.classList.contains("is-armed"), dash: part.strokeDasharray, fill: part.fill,
        waste: getComputedStyle(journey.querySelector(".about-journey__svg--portrait .about-journey__waste")).opacity,
        colors: [...new Set([...journey.querySelectorAll(".about-journey__year")].map((year) => getComputedStyle(year).color))] };
    });
    assert.equal(state.armed, false);
    assert.equal(state.dash, "none");
    assert.equal(state.fill, "rgb(243, 243, 241)");
    assert.equal(state.waste, "1");
    assert.deepEqual(state.colors, ["rgb(32, 33, 32)"]);
  } finally {
    await context.close();
    await browser.close();
  }
});

for (const width of [320, 390, 768]) {
  test(`${width}px: the landscape sheet sits above the milestones, nothing overflows`, async () => {
    const browser = await launchBrowser();
    const { context, page } = await openPage(browser, viewportAt(width, 844));
    try {
      await page.goto(`${BASE_URL}/about/`, { waitUntil: "load" });
      const state = await page.evaluate(() => {
        const journey = document.querySelector(".about-journey");
        const shown = (selector) => getComputedStyle(journey.querySelector(selector)).display !== "none";
        const sheet = journey.querySelector(".about-journey__svg--landscape").getBoundingClientRect();
        const list = journey.querySelector(".about-journey__list").getBoundingClientRect();
        const clipped = [...journey.querySelectorAll(".about-journey__year, .about-journey__copy")]
          .filter((node) => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1).length;
        return { landscape: shown(".about-journey__svg--landscape"), portrait: shown(".about-journey__svg--portrait"),
          above: sheet.bottom <= list.top, width: sheet.width, armed: journey.classList.contains("is-armed"), clipped,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      assert.equal(state.landscape, true);
      assert.equal(state.portrait, false);
      assert.equal(state.above, true);
      assert(state.width > width * 0.8, `sheet ${state.width}px wide`);
      assert.equal(state.armed, false);
      assert.equal(state.clipped, 0);
      assert.equal(state.overflow, 0);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
