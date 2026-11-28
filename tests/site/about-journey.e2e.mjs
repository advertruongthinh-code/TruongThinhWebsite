// About journey (detail-pages R3, R9): nine milestones beside one sticky drawing per milestone. From 981px with motion each
// milestone is a stage: when its year passes the line its drawing plays on its own from a white first frame to complete, and
// scrolling back rewinds it, then the previous drawing shows complete; a drawing never stops halfway (owner 2026-11-24).
// Each milestone's rail node sits beside its year and scrolls with it (owner 2026-11-24); the rail runs on past today and
// fades out (owner 2026-11-28). Below 981px each milestone shows its
// own complete drawing. No kicker in the content (owner 2026-11-24); the page ends with the client logos then the CTA.
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

// Per milestone: vertical distance from its node's centre to its year's centre, and the year's top in the viewport.
const nodes = (page) => page.evaluate(() => [...document.querySelectorAll(".about-journey__item")].map((item) => {
  const year = item.querySelector(".about-journey__year").getBoundingClientRect();
  const node = item.querySelector(".about-journey__node")?.getBoundingClientRect();
  return { gap: node ? Math.abs(node.top + node.height / 2 - (year.top + year.height / 2)) : Infinity, top: year.top };
}));

for (const locale of ["", "en/"]) {
  test(`/${locale}about/ ends with the client logos then the CTA, nine milestones, nine drawings, no kicker`, async () => {
    const browser = await launchBrowser();
    const { context, page } = await openPage(browser, VIEWPORTS.desktop);
    try {
      await page.goto(`${BASE_URL}/${locale}about/`, { waitUntil: "load" });
      const order = await page.evaluate(() => {
        const blocks = [...document.querySelectorAll("main > *")];
        return { last: blocks.at(-1).className, before: blocks.at(-2).className,
          cta: document.querySelector("#tu-van a")?.dataset.cta, items: document.querySelectorAll(".about-journey__item").length,
          arts: document.querySelectorAll(".about-journey__art[data-journey-art]").length,
          abf: /\bABF\b/.test(document.body.innerHTML), model: /FN-?353/i.test(document.body.innerHTML),
          years: [...document.querySelectorAll(".about-journey__year")].map((year) => year.textContent.trim()),
          kickers: document.querySelectorAll("main .detail-eyebrow, main [class*='kicker'], #tu-van .detail-cta__copy > p").length,
          sheetSize: /1220|2440/.test(document.querySelector(".about-journey").textContent) };
      });
      assert.match(order.last, /\bdetail-cta\b/);
      assert.match(order.before, /\bclient-logo-marquee\b/);
      assert.equal(order.cta, "about-1");
      assert.equal(order.items, 9);
      assert.equal(order.arts, 9);
      assert.equal(order.years[7], "2021", "the edge bander milestone sits between 2020 and today (owner 2026-11-24)");
      assert.equal(order.abf, false);
      assert.equal(order.model, false, "no machine model number anywhere (owner 2026-11-24)");
      assert.equal(order.kickers, 0, "no kicker in the content (owner 2026-11-24)");
      assert.equal(order.sheetSize, false, "no sheet size written on the 2020 drawing (owner 2026-11-24)");
    } finally {
      await context.close();
      await browser.close();
    }
  });
}

test("1440: a drawing plays to the end on its own once its year passes, and rewinds when scrolling back", async () => {
  const browser = await launchBrowser();
  const { context, page } = await openPage(browser, VIEWPORTS.desktop);
  try {
    await page.goto(`${BASE_URL}/about/`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector(".about-journey")?.classList.contains("is-armed"), null, { timeout: 10_000 });
    await logicalScroll(page, await yearAt(page, 2, 0.7));
    await page.waitForTimeout(2000);
    assert.equal((await art(page, 2)).current, false, "the printer waits for its year");
    const rail = await page.evaluate(() => {
      const box = document.querySelector(".about-journey__rail").getBoundingClientRect();
      const year = [...document.querySelectorAll(".about-journey__year")].at(-1).getBoundingClientRect();
      return { past: box.bottom - (year.top + year.height / 2) };
    });
    assert(rail.past > 100, `the rail runs on past today into the future: ${rail.past}`);
    const before = await nodes(page);
    assert(before.every((n) => n.gap <= 1), `each node sits beside its year: ${before.map((n) => n.gap.toFixed(1))}`);
    await logicalScroll(page, await yearAt(page, 2, 0.5));
    const start = await art(page, 2);
    const after = await nodes(page);
    assert(after[1].top < before[1].top - 50 && after.every((n) => n.gap <= 1), "the nodes scroll with the milestones");
    assert(start.current && start.p < 0.5, `the printer starts near white: ${start.p}`);
    await page.waitForTimeout(2200);
    const done = await art(page, 2);
    assert.equal(done.p, 1, "with no more scrolling the drawing still finishes");
    assert.equal(done.painted, 1, "its colour is painted");
    await logicalScroll(page, await yearAt(page, 3, 0.45));
    await page.waitForTimeout(2200);
    assert.equal((await art(page, 3)).current, true);
    assert.equal((await art(page, 2)).p, 1, "a passed drawing is complete");
    await logicalScroll(page, await yearAt(page, 3, 0.7));
    await page.waitForTimeout(250);
    const rewinding = await art(page, 3);
    assert(rewinding.current && rewinding.p > 0 && rewinding.p < 1, `scrolling back rewinds the shown drawing: ${rewinding.p}`);
    await page.waitForTimeout(1500);
    const back = await art(page, 2);
    assert(back.current && back.p === 1, "then the previous drawing shows complete, not redrawn");
    assert.equal((await art(page, 3)).p, 0);
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
        const aside = journey.querySelector(".about-journey__aside");
        // The thumbs <use> the stage drawings: those stay rendered and visible (unseen 1px box) so brush clips resolve.
        const stage = [...aside.querySelectorAll("[data-journey-art]")].filter((svg) => getComputedStyle(svg).visibility !== "visible").length;
        return { thumbs: thumbs.length, aside: { width: aside.getBoundingClientRect().width, opacity: getComputedStyle(aside).opacity,
          display: getComputedStyle(aside).display }, stage, armed: journey.classList.contains("is-armed"), clipped,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      assert.equal(state.thumbs, 9);
      assert(state.aside.width <= 1 && state.aside.opacity === "0" && state.aside.display !== "none", JSON.stringify(state.aside));
      assert.equal(state.stage, 0, "no stage drawing is hidden from the thumbs");
      assert.equal(state.armed, false);
      assert.equal(state.clipped, 0);
      assert.equal(state.overflow, 0);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
