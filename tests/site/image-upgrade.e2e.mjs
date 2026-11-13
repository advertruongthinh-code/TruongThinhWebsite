// Images on screen upgrade to the original after the frame-fit version has shown (progressive-loading R10).
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/image-upgrade.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const VARIANT = /-(?:240|480|960|1600|2048)\.(?:jxl|webp)$/;
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const open = async (options = { viewport: { width: 1440, height: 900 } }) => {
  const page = await browser.newPage(options);
  const originals = [];
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith("/assets/content/") && /\.(?:jxl|webp)$/.test(pathname) && !VARIANT.test(pathname)) {
      originals.push({ pathname, at: Date.now() });
    }
  });
  return { page, originals };
};
const pathOf = (page, selector) => page.evaluate((selector) => {
  const image = document.querySelector(selector);
  return image?.currentSrc ? new URL(image.currentSrc).pathname : "";
}, selector);

try {
  // Static page: the hero shows the frame-fit version first, when scrolling stops it switches to the original, and the original loads exactly once.
  {
    const { page, originals } = await open();
    await page.goto(`${base}/vi/residential/`, { waitUntil: "load" });
    const hero = ".detail-hero .hero-slide.is-active img";
    await page.waitForFunction((selector) => document.querySelector(selector)?.closest(".is-media-settled"), hero);
    assert.match(await pathOf(page, hero), VARIANT, "hero shows its fitted variant first");
    // A slow link makes the original arrive in many chunks, so a partial copy can show before the end (R10).
    await (await page.context().newCDPSession(page)).send("Network.emulateNetworkConditions",
      { offline: false, latency: 20, downloadThroughput: 300_000, uploadThroughput: 300_000 });
    // Scroll down continuously for 3s: each switch to the original (srcset left with a single URL with no width) must happen when the page
    // has been still for at least 200ms. Measure by the real scroll position, since the page has not received scroll during the hero intro.
    await page.evaluate(() => {
      window.__upgradeTrace = [];
      window.__upgradeSteps = [];
      let movedAt = performance.now();
      let last;
      const tick = () => {
        const y = window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY;
        if (y !== last) movedAt = performance.now();
        last = y;
        requestAnimationFrame(tick);
      };
      tick();
      new MutationObserver((records) => records.forEach(({ target }) => {
        const srcset = target.getAttribute("srcset");
        if (srcset && !/\s\d+w/.test(srcset)) {
          window.__upgradeTrace.push(Math.round(performance.now() - movedAt));
          window.__upgradeSteps.push(srcset.startsWith("blob:") ? "copy" : "url");
        }
      })).observe(document, { subtree: true, attributes: true, attributeFilter: ["srcset"] });
    });
    await page.mouse.move(720, 450);
    const started = Date.now();
    while (Date.now() - started < 3000) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(80);
    }
    const idle = await page.evaluate(() => window.__upgradeTrace);
    assert.ok(idle.every((ms) => ms >= 200), `an image upgraded while the page scrolled ${JSON.stringify(idle)}`);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction((selector) => {
      const image = document.querySelector(selector);
      // A streamed original ends as a whole copy in a blob (R10).
      return image?.currentSrc && (image.currentSrc.startsWith("blob:") ? image.dataset.originalWhole
        : !/-(?:240|480|960|1600|2048)\.\w+$/.test(image.currentSrc));
    }, hero, { timeout: 20_000 }).catch(async () => assert.fail(`hero stays on its variant ${await pathOf(page, hero)}`));
    const heroOriginal = await page.evaluate((selector) => {
      const image = document.querySelector(selector);
      return new URL(image.currentSrc.startsWith("blob:") ? image.dataset.original : image.currentSrc).pathname;
    }, hero);
    assert.equal(originals.filter(({ pathname }) => pathname === heroOriginal).length, 1, `hero original requested once ${heroOriginal}`);
    // A JXL original with a threshold for the tier on screen shows a partial copy first, then the whole file, both from the one stream (R2, R10).
    const { steps, threshold } = await page.evaluate(async (pathname) => ({ steps: window.__upgradeSteps,
      threshold: (await (await fetch("/assets/content/jxl-thresholds.json")).json())[pathname.slice(1)] }), heroOriginal);
    if (heroOriginal.endsWith(".jxl") && threshold) {
      assert.ok(steps.length >= 2 && steps.every((kind) => kind === "copy"), `hero shows a partial copy, then the whole copy ${JSON.stringify(steps)}`);
    }
    await page.close();
  }

  // Advertising: masonry cards are small frames so they keep the frame-fit version; the large detail image (large frame) upgrades to the original.
  {
    const { page, originals } = await open();
    await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelectorAll("[data-project-grid] [data-masonry-card] img").length > 8);
    await page.waitForTimeout(5000);
    const cards = await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-masonry-card] img")]
      .filter((image) => image.currentSrc).map((image) => new URL(image.currentSrc).pathname));
    assert.ok(cards.length && cards.every((pathname) => VARIANT.test(pathname)), `masonry cards stay on their variant ${JSON.stringify(cards)}`);
    assert.deepEqual(originals.filter(({ pathname }) => cards.some((card) => card.replace(VARIANT, "") === pathname.replace(/\.\w+$/, ""))), [],
      "no masonry card requests its original");
    // Open detail by click (soft route) so the primary reuses the same img when media opens later.
    await page.locator("[data-masonry-card] > a").first().click();
    const primary = "[data-detail-image]";
    await page.waitForFunction((selector) => {
      const image = document.querySelector(selector);
      return image?.currentSrc && !/-(?:240|480|960|1600|2048)\.\w+$/.test(image.currentSrc);
    }, primary, { timeout: 20_000 }).catch(async () => assert.fail(`detail primary stays on its variant ${await pathOf(page, primary)}`));
  // The primary reuses one img: opening other media must show that media, not the previous media's original.
    await page.goBack();
    await page.locator("[data-masonry-card] > a").nth(1).click();
    await page.waitForTimeout(2000);
    const shown = await page.evaluate((selector) => {
      const image = document.querySelector(selector);
      const base = (url) => new URL(url, location.href).pathname.replace(/(?:-(?:240|480|960|1600|2048))?\.\w+$/, "");
      return { current: base(image.currentSrc), src: base(image.src) };
    }, primary);
    assert.equal(shown.current, shown.src, "the primary shows the media it was given");
    await page.close();
  }
  // Related and suggestion cards in detail are masonry cards: they keep the frame-fit version even when a portrait card is taller than 60% of the viewport (owner's PC
  // 1920x940: a 436px related card upgrading to the original froze 200-480ms on each decode, 2026-11-09).
  {
    const { page } = await open({ viewport: { width: 1920, height: 940 } });
    await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "load" });
    await page.locator("[data-masonry-card] > a").first().click();
    await page.waitForTimeout(6000);
    // A small original (no variant larger than the frame) is still a valid candidate; only an original much larger than the frame is a wrong upgrade.
    const cards = await page.evaluate(() => [...document.querySelectorAll("[data-masonry-related-card] img, [data-masonry-suggestion-card] img")]
      .filter((image) => image.currentSrc && image.clientWidth > 0).map((image) => ({ pathname: new URL(image.currentSrc).pathname,
        oversized: image.naturalWidth > 1.5 * image.clientWidth * devicePixelRatio })));
    const upgraded = cards.filter(({ pathname, oversized }) => !VARIANT.test(pathname) && oversized).map(({ pathname }) => pathname);
    assert.ok(cards.length && !upgraded.length, `related cards stay on their variant ${JSON.stringify(upgraded)}`);
    await page.close();
  }
  // Phone home: 9 slides defer the largest 2048 variant and do not load the original (media-delivery R2, owner 2026-10-31);
  // an original slide smaller than 2048 has no 2048 variant, so the original is the largest candidate.
  {
    const { page } = await open({ viewport: { width: 384, height: 724 }, deviceScaleFactor: 1.875, isMobile: true, hasTouch: true });
    await page.goto(`${base}/vi/`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelectorAll(".hero-slide:not(.is-active) img[srcset]").length >= 9, null, { timeout: 10_000 });
    await page.waitForTimeout(1500);
    const hidden = await page.evaluate(() => [...document.querySelectorAll(".hero-slide:not(.is-active) img")].map((image) => ({
      src: new URL(image.currentSrc, location.href).pathname,
      has2048: (image.previousElementSibling?.srcset ?? image.srcset).includes("-2048."),
    })));
    assert.deepEqual(hidden.filter(({ src, has2048 }) => has2048 && !VARIANT.test(src)), [], "hidden slides stay on a variant");
    await page.close();
  }
  console.log("PASS image upgrade");
} finally {
  await browser.close();
}
