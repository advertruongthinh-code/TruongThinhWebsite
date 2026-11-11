// Back from a project detail page returns the Projects grid to the same scroll and the same card position
// (projects R2, like the Advertising grid). Covers Back while the route transition still runs, where Barba falls
// back to a native load, and Back after the transition settled (soft Barba route).
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/projects-back-scroll.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";

const viewports = {
  phone: { viewport: { width: 384, height: 724 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1.875 },
  pc: { viewport: { width: 1440, height: 900 } },
};
const gridReady = (page) => page.waitForFunction(() => document.documentElement.classList.contains("motion-ready")
  && document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaReady === "true", null, { timeout: 20000 });
const read = (href) => {
  const card = [...document.querySelectorAll("[data-masonry-item]")].find((node) => node.querySelector("a")?.getAttribute("href") === href);
  return { path: location.pathname, y: Math.round(window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY), top: card ? Math.round(card.getBoundingClientRect().top) : null };
};

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const failures = [];
try {
  for (const [device, options] of Object.entries(viewports)) for (const timing of ["during-transition", "settled"]) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const at = `${device} ${timing}`;
    try {
      await page.goto(`${base}/vi/projects/`, { waitUntil: "load" });
      await gridReady(page);
      await page.waitForTimeout(800);
      await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(Math.round((document.documentElement.scrollHeight - innerHeight) * 0.4)));
      await page.waitForTimeout(1200);
      const card = await page.evaluate(() => {
        const cards = [...document.querySelectorAll("[data-masonry-item]")]
          .map((node) => ({ rect: node.getBoundingClientRect(), href: node.querySelector("a")?.getAttribute("href") }))
          .filter(({ rect, href }) => href && rect.top > 120 && rect.bottom < innerHeight - 40 && rect.width > 40);
        const { rect, href } = cards.sort((a, b) => Math.abs(a.rect.top + a.rect.height / 2 - innerHeight / 2)
          - Math.abs(b.rect.top + b.rect.height / 2 - innerHeight / 2))[0];
        return { href, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
      assert(card?.href, "a project card sits in the viewport");
      const before = await page.evaluate(read, card.href);
      assert(before.y > 100, `grid scrolled before opening a card (${before.y})`);
      if (options.hasTouch) await page.touchscreen.tap(card.x, card.y);
      else await page.mouse.click(card.x, card.y);
      await page.waitForURL((url) => url.pathname === card.href, { timeout: 10000 });
      if (timing === "during-transition") {
        assert(await page.evaluate(() => window.barba?.transitions?.isRunning), "route transition still runs at Back");
      } else {
        await page.waitForFunction(() => !window.barba?.transitions?.isRunning
          && !document.body.classList.contains("is-transitioning"), null, { timeout: 15000 });
        await page.waitForTimeout(500);
      }
      await page.goBack();
      await page.waitForURL((url) => url.pathname === "/vi/projects/", { timeout: 10000 });
      await gridReady(page);
      await page.waitForTimeout(2500);
      const after = await page.evaluate(read, card.href);
      assert(Math.abs(after.y - before.y) <= 2, `scroll ${before.y} -> ${after.y}`);
      assert(after.top !== null && Math.abs(after.top - before.top) <= 2, `card top ${before.top} -> ${after.top}`);
      console.log(`ok ${at}: scroll ${before.y} -> ${after.y}, card top ${before.top} -> ${after.top}`);
    } catch (error) {
      failures.push(`${at}: ${error.message}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures, []);
