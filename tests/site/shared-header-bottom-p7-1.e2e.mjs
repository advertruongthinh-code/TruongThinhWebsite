import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
const routes = ["", "residential/", "commercial/", "advertising-products/", "about/"];
const browser = await chromium.launch({ headless: true });
const failures = [];

async function scrollTo(page, target) {
  await page.evaluate(y => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, y);
  }, target);
  await page.waitForTimeout(80);
}

// Advertising restores its history scroll once the catalog mounts; scroll only after that.
const catalogSettled = page => page.waitForFunction(() => {
  const skeleton = document.querySelector("[data-advertising-cta-skeleton]");
  return !skeleton || skeleton.dataset.advertisingCtaReady === "true";
});

try {
  for (const locale of ["vi", "en"]) {
    for (const route of routes) {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        reducedMotion: "reduce",
      });
      const label = `${locale}/${route || "home"}`;
      try {
        await page.goto(`${baseUrl}/${locale}/${route}`, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready")
          || document.documentElement.classList.contains("motion-fallback"));
        await page.evaluate(() => document.fonts?.ready);
        await catalogSettled(page);
        const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
        assert(max > 1200, `${label}: needs enough scroll range for direction test (${max}px)`);
        const middle = Math.min(max - 700, Math.max(700, Math.floor(max * 0.55)));
        await scrollTo(page, middle);
        await scrollTo(page, middle + 350);
        assert(await page.locator("[data-site-header]").evaluate(node => node.classList.contains("is-hidden")),
          `${label}: downward scroll must hide header before bottom`);

        // motion.md: hiding stops within 1.25 viewport heights of the page end.
        const bottomZone = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight * 1.25);
        await scrollTo(page, Math.ceil(bottomZone) + 20);
        assert(!await page.locator("[data-site-header]").evaluate(node => node.classList.contains("is-hidden")),
          `${label}: bottom zone must reveal header`);
        await scrollTo(page, middle);
        await scrollTo(page, middle + 20);
        await scrollTo(page, middle + 370);
        assert(await page.locator("[data-site-header]").evaluate(node => node.classList.contains("is-hidden")),
          `${label}: downward scroll must hide header again before the bottom zone`);
        await scrollTo(page, max);
        assert(!await page.locator("[data-site-header]").evaluate(node => node.classList.contains("is-hidden")),
          `${label}: reaching bottom must reveal header`);

        await scrollTo(page, middle);
        await scrollTo(page, middle + 20);
        await scrollTo(page, middle + 370);
        await scrollTo(page, middle + 350);
        await scrollTo(page, middle + 150);
        assert(!await page.locator("[data-site-header]").evaluate(node => node.classList.contains("is-hidden")),
          `${label}: real upward scroll past threshold must reveal header`);
        await scrollTo(page, 0);
        assert(!await page.locator("[data-site-header]").evaluate(node => node.classList.contains("is-collapsed")),
          `${label}: top must restore expanded header`);
      } catch (error) {
        failures.push(`${label}: ${error.message}`);
      } finally {
        await page.close();
      }
    }
  }

  for (const route of ["", "advertising-products/"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const label = `desktop/${route || "home"}`;
    try {
      await page.goto(`${baseUrl}/vi/${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.documentElement.classList.contains("has-scroll-smooth")
        && !document.documentElement.classList.contains("route-enter"));
      await catalogSettled(page);
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      await page.evaluate(y => window.TruongThinhMotion.setLogicalScroll(y), Math.floor(max / 2));
      await page.mouse.move(720, 500);
      for (let index = 0; index < 8; index += 1) await page.mouse.wheel(0, 600);
      await page.waitForFunction(() => document.querySelector("[data-site-header]")?.classList.contains("is-hidden"),
        null, { timeout: 12_000 });
      for (let index = 0; index < 8; index += 1) await page.mouse.wheel(0, -600);
      await page.waitForFunction(() => !document.querySelector("[data-site-header]")?.classList.contains("is-hidden"),
        null, { timeout: 12_000 });
      for (let index = 0; index < 8; index += 1) await page.mouse.wheel(0, 600);
      await page.waitForFunction(() => document.querySelector("[data-site-header]")?.classList.contains("is-hidden"),
        null, { timeout: 12_000 });
      await page.evaluate(y => window.TruongThinhMotion.setLogicalScroll(y), max);
      await page.waitForFunction(() => !document.querySelector("[data-site-header]")?.classList.contains("is-hidden"),
        null, { timeout: 12_000 });
    } catch (error) {
      const state = await page.evaluate(() => ({
        classes: document.documentElement.className,
        logical: window.TruongThinhMotion?.getLogicalScroll?.(),
        scrollHeight: document.documentElement.scrollHeight,
        windowScroll: window.scrollY,
      }));
      failures.push(`${label}: ${error.message}; ${JSON.stringify(state)}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

assert.equal(failures.length, 0, `Shared header bottom regressions (${failures.length}):\n${failures.join("\n")}`);
console.log(`Shared header bottom: ${routes.length * 2} native route/locale cells and 2 smooth desktop cells passed`);
