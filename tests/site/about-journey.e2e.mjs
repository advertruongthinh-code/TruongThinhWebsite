// About journey (detail-pages R3, R9): eight milestones beside one sticky drawing per milestone. From 981px with motion each
// drawing is scrubbed by scroll both ways: a white first frame, outlines drawn and colour painted on with brush passes.
// Below 981px each milestone shows its own complete drawing. The page ends with the client logos then the CTA.
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

// Drawing n: its scroll progress, whether it is the shown one, and how far its first brush pass has painted (0 to 1).
const art = (page, n) => page.evaluate((index) => {
  const svg = document.querySelector(`[data-journey-art="${index}"]`);
  const brush = svg.querySelector(".about-journey__brush");
  return { p: Number(svg.style.getPropertyValue("--p") || 0), current: svg.classList.contains("is-current"),
    painted: brush ? 1 - Number(getComputedStyle(brush).strokeDashoffset.match(/-?[\d.]+/)[0]) : null };
}, n);

for (const locale of ["", "en/"]) {
  test(`/${locale}about/ ends with the client logos then the CTA, eight milestones, eight drawings`, async () => {
    const browser = await launchBrowser();
    const { context, page } = await openPage(browser, VIEWPORTS.desktop);
    try {
      await page.goto(`${BASE_URL}/${locale}about/`, { waitUntil: "load" });
      const order = await page.evaluate(() => {
        const blocks = [...document.querySelectorAll("main > *")];
        return { last: blocks.at(-1).className, before: blocks.at(-2).className,
          cta: document.querySelector("#tu-van a")?.dataset.cta, items: document.querySelectorAll(".about-journey__item").length,
          arts: document.querySelectorAll(".about-journey__art[data-journey-art]").length,
          abf: /\bABF\b/.test(document.body.innerHTML) };
      });
      assert.match(order.last, /\bdetail-cta\b/);
      assert.match(order.before, /\bclient-logo-marquee\b/);
      assert.equal(order.cta, "about-1");
      assert.equal(order.items, 8);
      assert.equal(order.arts, 8);
      assert.equal(order.abf, false);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}

test("1440: each drawing starts white, paints on with the scroll and retracts when scrolling back", async () => {
  const browser = await launchBrowser();
  const { context, page } = await openPage(browser, VIEWPORTS.desktop);
  try {
    await page.goto(`${BASE_URL}/about/`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector(".about-journey")?.classList.contains("is-armed"), null, { timeout: 10_000 });
    await logicalScroll(page, await yearAt(page, 2, 0.545));
    await page.waitForTimeout(600);
    const start = await art(page, 2);
    assert.equal(start.current, true, "the printer drawing is shown once its year passes the line");
    assert.equal(start.p, 0, "first frame is plain white");
    assert.equal(start.painted, 0, "no colour before the outlines start");
    await logicalScroll(page, await yearAt(page, 2, 0.3));
    await page.waitForTimeout(600);
    const mid = await art(page, 2);
    assert(mid.p > 0.2 && mid.p < 1, `progress ${mid.p}`);
    await logicalScroll(page, await yearAt(page, 3, 0.45));
    await page.waitForTimeout(600);
    assert.equal((await art(page, 3)).current, true);
    assert.equal((await art(page, 2)).p, 1, "a passed drawing is complete");
    await logicalScroll(page, await yearAt(page, 2, 0.45));
    await page.waitForTimeout(600);
    const back = await art(page, 2);
    assert(back.current && back.p < mid.p, "scrolling back retracts the drawing");
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

test("reduced motion at 1440: drawings are complete, only the swap follows the scroll", async () => {
  const browser = await launchBrowser();
  const { context, page } = await openPage(browser, VIEWPORTS.desktop, { reducedMotion: "reduce" });
  try {
    await page.goto(`${BASE_URL}/about/`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const state = await page.evaluate(() => {
      const journey = document.querySelector(".about-journey");
      return {
        offset: Number(getComputedStyle(journey.querySelector(".about-journey__brush")).strokeDashoffset.match(/-?[\d.]+/)[0]),
        p: [...journey.querySelectorAll("[data-journey-art]")].map((svg) => svg.style.getPropertyValue("--p")) };
    });
    assert.equal(state.offset, 0);
    assert.deepEqual([...new Set(state.p)], ["1.000"]);
  } finally {
    await context.close();
    await browser.close();
  }
});

for (const width of [320, 390, 768]) {
  test(`${width}px: every milestone shows its own complete drawing, nothing overflows`, async () => {
    const browser = await launchBrowser();
    const { context, page } = await openPage(browser, viewportAt(width, 844));
    try {
      await page.goto(`${BASE_URL}/about/`, { waitUntil: "load" });
      const state = await page.evaluate(() => {
        const journey = document.querySelector(".about-journey");
        const thumbs = [...journey.querySelectorAll(".about-journey__item > .about-journey__thumb")]
          .filter((svg) => getComputedStyle(svg).display !== "none" && svg.getBoundingClientRect().height > 80);
        const clipped = [...journey.querySelectorAll(".about-journey__year, .about-journey__copy")]
          .filter((node) => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1).length;
        return { thumbs: thumbs.length, aside: getComputedStyle(journey.querySelector(".about-journey__aside")).display,
          armed: journey.classList.contains("is-armed"), clipped,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      assert.equal(state.thumbs, 8);
      assert.equal(state.aside, "none");
      assert.equal(state.armed, false);
      assert.equal(state.clipped, 0);
      assert.equal(state.overflow, 0);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
