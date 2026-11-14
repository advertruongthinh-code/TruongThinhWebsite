// Project page hero and body motion (projects R3, owner 2026-11-14), measured on espaciohomedesign.com/en/projects/* at 1440 and 390:
// the shared section.hero with the project name as kicker above a 1-3 line tagline, a CTA 32px under the title that scrolls to the Zalo block,
// the hero photo zooming 1.2 to 1, words fading in, kicker sliding in, CTA fading in last; facts rise in one by one, the strip slides in from the right.
// The browser samples every frame from the first paint, so the test checks the whole motion, not only the last state.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadBlockContent, pageHref } from "../../scripts/site/block-pages.mjs";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const { projects } = loadBlockContent(fileURLToPath(new URL("../../src/site/", import.meta.url)));
const project = projects[0];
const href = pageHref("projects", "vi", project);
const near = (actual, expected, at, tolerance = 4) => assert.ok(Math.abs(actual - expected) <= tolerance, `${at}: ${actual} not within ${tolerance}px of ${expected}`);

const sampler = () => {
  window.__heroSamples = { zoom: 1, word: 1, kicker: 1, kickerX: 0, cta: 1, fact: 0, strip: 0 };
  const matrix = (element) => new DOMMatrixReadOnly(getComputedStyle(element).transform);
  const tick = () => {
    const samples = window.__heroSamples;
    const media = document.querySelector(".project-hero [data-motion-hero-media]");
    const word = document.querySelector(".project-hero .hero-title .motion-word");
    const kicker = document.querySelector(".project-hero .hero-kicker");
    const cta = document.querySelector(".project-hero .hero-cta");
    const fact = document.querySelector(".blk-facts__item");
    const strip = document.querySelector(".blk-projects");
    if (media) samples.zoom = Math.max(samples.zoom, matrix(media).a);
    if (word) samples.word = Math.min(samples.word, Number(getComputedStyle(word).opacity));
    if (kicker) {
      samples.kicker = Math.min(samples.kicker, Number(getComputedStyle(kicker).opacity));
      samples.kickerX = Math.min(samples.kickerX, matrix(kicker).e);
    }
    if (cta) samples.cta = Math.min(samples.cta, Number(getComputedStyle(cta).opacity));
    if (fact) samples.fact = Math.max(samples.fact, matrix(fact).f);
    if (strip) samples.strip = Math.max(samples.strip, matrix(strip).e);
    if (performance.now() < 12000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const failures = [];
try {
  for (const reducedMotion of ["no-preference", "reduce"]) for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const phone = viewport.width < 600;
    const at = `${href} ${viewport.width}px ${reducedMotion}`;
    const context = await browser.newContext({ viewport, isMobile: phone, hasTouch: phone, reducedMotion });
    await context.addInitScript(sampler);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto(`${origin}${href}`, { waitUntil: "load" });
      await page.waitForTimeout(4500);
      const hero = await page.evaluate(() => {
        const rect = (element) => element.getBoundingClientRect();
        const kicker = document.querySelector(".project-hero .hero-kicker");
        const title = document.querySelector(".project-hero .hero-title");
        const cta = document.querySelector(".project-hero .hero-cta");
        const ink = document.createRange();
        ink.selectNodeContents(title.firstElementChild);
        const style = getComputedStyle(kicker);
        return {
          kickerTag: kicker.tagName, kickerText: kicker.textContent.trim(), kickerSize: style.fontSize, kickerCase: style.textTransform,
          kickerVisible: rect(kicker).width > 10 && style.opacity === "1",
          kickerAboveTitle: rect(kicker).bottom <= rect(title).top + 2,
          ctaGap: Math.round(rect(cta).top - rect(title).bottom),
          ctaCenter: Math.round(rect(cta).left + rect(cta).width / 2 - document.documentElement.clientWidth / 2),
          viewportWidth: document.documentElement.clientWidth,
          ctaSize: getComputedStyle(cta).fontSize,
          titleLeftInk: Math.round(ink.getBoundingClientRect().left),
          zoomEnd: new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".project-hero [data-motion-hero-media]")).transform).a,
          ctaEnd: Number(getComputedStyle(cta).opacity),
          samples: window.__heroSamples,
        };
      });
      assert.equal(hero.kickerTag, "H1", `${at}: project name is the h1`);
      assert.equal(hero.kickerText, project.title.vi, `${at}: kicker is the project name`);
      assert.equal(hero.kickerSize, "16px", `${at}: kicker 16px`);
      assert.equal(hero.kickerCase, "uppercase", `${at}: kicker capitals`);
      assert.ok(hero.kickerVisible && hero.kickerAboveTitle, `${at}: kicker shows above the tagline, also on phone`);
      near(hero.ctaGap, 32, `${at}: CTA under the title`, 6);
      near(hero.ctaCenter, 0, `${at}: CTA centred (page ${hero.viewportWidth}px)`, 2);
      assert.equal(hero.viewportWidth, viewport.width, `${at}: page does not grow wider than the screen`);
      assert.equal(hero.ctaSize, "16px", `${at}: CTA 16px`);
      assert.ok(Math.abs(hero.zoomEnd - 1.005) < 0.01, `${at}: photo settles near scale 1, got ${hero.zoomEnd}`);
      assert.equal(hero.ctaEnd, 1, `${at}: CTA ends visible`);
      if (reducedMotion === "no-preference") {
        const samples = hero.samples;
        assert.ok(samples.zoom > 1.19, `${at}: photo starts at 1.2 ${JSON.stringify(samples)}`);
        assert.ok(samples.word < 0.05, `${at}: tagline words fade in ${JSON.stringify(samples)}`);
        assert.ok(samples.kicker < 0.05 && samples.kickerX < -50, `${at}: kicker slides in from the left ${JSON.stringify(samples)}`);
        assert.ok(samples.cta < 0.05, `${at}: CTA fades in ${JSON.stringify(samples)}`);
      } else {
        assert.ok(hero.samples.word === 1 && hero.samples.cta === 1, `${at}: reduced motion shows the final state at once ${JSON.stringify(hero.samples)}`);
      }

      // The CTA scrolls to the Zalo block.
      await page.click(".project-hero .hero-cta");
      await page.waitForTimeout(2000);
      const contactTop = await page.evaluate(() => Math.round(document.getElementById("lien-he").getBoundingClientRect().top));
      assert.ok(contactTop >= -2 && contactTop < viewport.height / 2, `${at}: CTA brings the Zalo block to the top, top ${contactTop}`);

      if (reducedMotion === "no-preference") {
        // Body motion: scroll through the page so the facts and the strip enter the viewport.
        await page.mouse.move(viewport.width / 2, viewport.height / 2);
        await page.evaluate(() => window.scrollTo(0, 0));
        for (let index = 0; index < 30; index += 1) {
          await page.mouse.wheel(0, 600);
          await page.waitForTimeout(150);
        }
        await page.waitForTimeout(1500);
        const body = await page.evaluate(() => ({
          samples: window.__heroSamples,
          factEnd: Math.max(...[...document.querySelectorAll(".blk-facts__item")].map((item) => new DOMMatrixReadOnly(getComputedStyle(item).transform).f)),
          stripVisible: document.querySelector(".blk-projects").classList.contains("is-motion-inview"),
        }));
        assert.ok(body.samples.fact > 50, `${at}: facts rise 60px ${JSON.stringify(body.samples)}`);
        assert.ok(body.samples.strip > 50, `${at}: strip slides in from 60px right ${JSON.stringify(body.samples)}`);
        assert.ok(body.factEnd < 1 && body.stripVisible, `${at}: facts and strip end in place`);
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
console.log("project-hero-motion e2e PASS: hero geometry, CTA scroll, opening and body motion, 2 viewports, motion and reduced motion");
