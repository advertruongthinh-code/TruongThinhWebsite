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
        const middle = Math.min(max - 450, Math.max(700, Math.floor(max * 0.55)));
        await scrollTo(page, middle);
        await scrollTo(page, middle + 350);
        assert(await page.locator("[data-site-header]").evaluate(node => node.classList.contains("is-hidden")),
          `${label}: downward scroll must hide header before bottom`);

        await scrollTo(page, max);
        assert(await page.locator("[data-site-header]").evaluate(node => node.classList.contains("is-hidden")),
          `${label}: reaching bottom must keep header hidden`);

        await page.evaluate(() => { document.body.style.paddingBottom = "400px"; });
        await scrollTo(page, max + 400);
        await page.evaluate(() => { document.body.style.paddingBottom = ""; });
        await page.waitForTimeout(100);
        assert(await page.locator("[data-site-header]").evaluate(node => node.classList.contains("is-hidden")),
          `${label}: content-height clamp must not reveal header`);

        await page.evaluate(() => {
          for (const height of [2000, 1000]) {
            const spacer = document.createElement("div");
            spacer.dataset.headerClampSpacer = "";
            spacer.style.height = `${height}px`;
            document.body.append(spacer);
          }
        });
        const expandedMax = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
        assert(expandedMax > max + 2500,
          `${label}: successive shrink fixture must extend document (${expandedMax}px from ${max}px)`);
        await scrollTo(page, expandedMax - 1500);
        assert(await page.locator("[data-site-header]").evaluate(node => node.classList.contains("is-hidden")),
          `${label}: downward scroll before successive clamps must hide header`);
        await page.evaluate(() => { document.querySelector("[data-header-clamp-spacer]")?.remove(); });
        await page.waitForTimeout(100);
        await page.evaluate(() => { document.querySelector("[data-header-clamp-spacer]")?.remove(); });
        await page.waitForTimeout(100);
        const clamped = await page.evaluate(() => ({
          y: window.scrollY,
          max: document.documentElement.scrollHeight - innerHeight,
        }));
        assert(Math.abs(clamped.y - clamped.max) <= 2,
          `${label}: successive shrink fixture must land at bottom (${JSON.stringify(clamped)})`);
        assert(await page.locator("[data-site-header]").evaluate(node => node.classList.contains("is-hidden")),
          `${label}: successive content-height clamps must not reveal header`);

        // The random Advertising grid can settle shorter after the fixtures; measure again.
        const bottom = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
        await scrollTo(page, bottom - 100);
        await scrollTo(page, bottom - 300);
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
      await page.waitForFunction(() => document.documentElement.classList.contains("has-scroll-smooth"));
      await catalogSettled(page);
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      await page.evaluate(y => window.TruongThinhMotion.setLogicalScroll(y), Math.floor(max / 2));
      await page.mouse.move(720, 500);
      for (let index = 0; index < 6; index += 1) await page.mouse.wheel(0, 600);
      await page.waitForFunction(() => document.querySelector("[data-site-header]")?.classList.contains("is-hidden"),
        null, { timeout: 12_000 });
      await page.evaluate(y => window.TruongThinhMotion.setLogicalScroll(y), max);
      assert(await page.locator("[data-site-header]").evaluate(node => node.classList.contains("is-hidden")),
        `${label}: Locomotive scroll to bottom must keep header hidden`);
      for (let index = 0; index < 6; index += 1) await page.mouse.wheel(0, -600);
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
