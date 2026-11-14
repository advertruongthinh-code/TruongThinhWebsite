// News list head and News article head (news R2, R3; owner 2026-11-14): geometry and opening motion measured on
// espaciohomedesign.com/en/news and /en/news/trends-2026 (1440 and 390). The browser samples every frame from the first paint,
// so the test checks the whole motion (start hidden or zoomed, end settled), not only the last state.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadBlockContent, pageHref } from "../../scripts/site/block-pages.mjs";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const { news } = loadBlockContent(fileURLToPath(new URL("../../src/site/", import.meta.url)));
const article = pageHref("news", "vi", news[0]);

// Espacio numbers (px, page not scrolled): kicker top, then gaps title bottom to filter top and filter bottom to the first card. The title
// height follows the text length (fillText), so the filter and grid are measured from the block above them.
const LIST = {
  1440: { kicker: 241, filterGap: 119, gridGap: 90 },
  390: { kicker: 221, filterGap: 39, gridGap: 30 },
};
const POST = { 1440: { left: 70, width: 1300 }, 390: { left: 30, width: 330 } };
const near = (actual, expected, at, tolerance = 4) => assert.ok(Math.abs(actual - expected) <= tolerance, `${at}: ${actual} not within ${tolerance}px of ${expected}`);

// Records, from the first frame, the largest scale of the title block and the lowest opacity of the first word or line of each group.
const sampler = () => {
  window.__headSamples = { zoom: 1, kicker: 1, title: 1, crumb: 0, line: 0, date: 1 };
  const scaleOf = (element) => (element ? new DOMMatrixReadOnly(getComputedStyle(element).transform).a : 1);
  const lowest = (key, selector) => {
    const element = document.querySelector(selector);
    if (element) window.__headSamples[key] = Math.min(window.__headSamples[key], Number(getComputedStyle(element).opacity));
  };
  const highestY = (key, selector) => {
    const element = document.querySelector(selector);
    if (element) window.__headSamples[key] = Math.max(window.__headSamples[key], new DOMMatrixReadOnly(getComputedStyle(element).transform).f);
  };
  const tick = () => {
    const samples = window.__headSamples;
    samples.zoom = Math.max(samples.zoom, scaleOf(document.querySelector(".blk-article-head__titles")));
    lowest("kicker", ".blk-article-head__kicker .motion-word");
    lowest("title", ".blk-article-head--list .blk-article-head__title .motion-word");
    highestY("crumb", ".blk-article-head__crumb .motion-line");
    highestY("line", ".blk-article-head--post .blk-article-head__title .motion-line");
    lowest("date", ".blk-article-head__date .motion-word");
    if (performance.now() < 6000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const failures = [];
const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
try {
  for (const reducedMotion of ["no-preference", "reduce"]) for (const viewport of viewports) {
    const phone = viewport.width < 600;
    const context = await browser.newContext({ viewport, isMobile: phone, hasTouch: phone, reducedMotion });
    await context.addInitScript(sampler);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      // List head.
      let at = `/vi/news/ ${viewport.width}px ${reducedMotion}`;
      await page.goto(`${origin}/vi/news/`, { waitUntil: "load" });
      await page.waitForTimeout(4500);
      const list = await page.evaluate(() => {
        const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect() ?? { top: -999, bottom: -999 };
        const kicker = rect(".blk-article-head__kicker");
        const title = rect(".blk-article-head--list .blk-article-head__title");
        const filter = rect(".blk-article-head--list .blk-news-filter");
        return {
          kicker: Math.round(kicker.top), titleGap: Math.round(title.top - kicker.bottom),
          filterGap: Math.round(filter.top - title.bottom), gridGap: Math.round(rect(".blk-news-card__media").top - filter.bottom),
          kickerText: document.querySelector(".blk-article-head__kicker")?.textContent.trim(),
          zoomEnd: new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".blk-article-head__titles")).transform).a,
          wordsEnd: Math.min(...[...document.querySelectorAll(".blk-article-head__titles .motion-word")].map((word) => Number(getComputedStyle(word).opacity)), 1),
          samples: window.__headSamples,
        };
      });
      assert.equal(list.kickerText, "Tư vấn và xu hướng", `${at}: kicker text`);
      for (const key of ["kicker", "filterGap", "gridGap"]) near(list[key], LIST[viewport.width][key], `${at} ${key}`);
      near(list.titleGap, 0, `${at} title right under the kicker`, 1);
      assert.ok(Math.abs(list.zoomEnd - 1) < 0.001, `${at}: title block settles at scale 1, got ${list.zoomEnd}`);
      assert.equal(list.wordsEnd, 1, `${at}: kicker and title words end visible`);
      if (reducedMotion === "reduce") {
        assert.ok(list.samples.zoom < 1.001 && list.samples.kicker === 1 && list.samples.title === 1, `${at}: reduced motion shows the final state at once ${JSON.stringify(list.samples)}`);
      } else {
        assert.ok(list.samples.zoom > 1.09, `${at}: title block starts zoomed to 1.1, max ${list.samples.zoom}`);
        assert.ok(list.samples.kicker < 0.05 && list.samples.title < 0.05, `${at}: kicker and title words fade in ${JSON.stringify(list.samples)}`);
      }

      // Article head.
      at = `${article} ${viewport.width}px ${reducedMotion}`;
      await page.goto(`${origin}${article}`, { waitUntil: "load" });
      await page.waitForTimeout(4500);
      const post = await page.evaluate(() => {
        const title = document.querySelector(".blk-article-head--post .blk-article-head__title");
        const range = document.createRange();
        range.selectNodeContents(title);
        const lines = [...document.querySelectorAll(".blk-article-head--post .motion-line")];
        return {
          left: Math.round(range.getBoundingClientRect().left), width: Math.round(title.getBoundingClientRect().width - Number.parseFloat(getComputedStyle(title).paddingLeft) - Number.parseFloat(getComputedStyle(title).paddingRight)),
          linesEnd: Math.max(0, ...lines.map((line) => new DOMMatrixReadOnly(getComputedStyle(line).transform).f)),
          dateEnd: Math.min(1, ...[...document.querySelectorAll(".blk-article-head__date .motion-word")].map((word) => Number(getComputedStyle(word).opacity))),
          samples: window.__headSamples,
        };
      });
      near(post.left, POST[viewport.width].left, `${at} title left`, 2);
      near(post.width, POST[viewport.width].width, `${at} title width`, 2);
      assert.ok(post.linesEnd <= 1, `${at}: crumb and title lines end in place, offset ${post.linesEnd}`);
      assert.equal(post.dateEnd, 1, `${at}: date ends visible`);
      if (reducedMotion === "no-preference") {
        assert.ok(post.samples.crumb > 8 && post.samples.line > 8, `${at}: crumb and title rise line by line ${JSON.stringify(post.samples)}`);
        assert.ok(post.samples.date < 0.05, `${at}: date fades in ${JSON.stringify(post.samples)}`);
      }
      assert.deepEqual(errors, [], `${at}: no page errors`);
    } catch (error) {
      failures.push(error.message);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("news-head-motion e2e PASS: list and article heads, 2 viewports, motion and reduced motion");
