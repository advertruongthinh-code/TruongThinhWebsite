import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true });

const inspect = page => page.evaluate(() => {
  const header = document.querySelector("[data-site-header]");
  const nav = header.querySelector("#header-menu-items");
  const links = [...nav.querySelectorAll("li")];
  const rows = links.map(link => Math.round(link.getBoundingClientRect().top));
  const style = getComputedStyle(nav);
  return {
    viewportWidth: innerWidth,
    mediaNarrow: matchMedia("(max-width: 960px)").matches,
    navWidthRule: getComputedStyle(nav).width,
    navInlineStyle: nav.style.cssText,
    mediaMid: matchMedia("(min-width: 961px) and (max-width: 1200px)").matches,
    columns: getComputedStyle(header).gridTemplateColumns,
    hidden: style.display === "none" || style.visibility === "hidden",
    inert: nav.inert,
    headerHeight: header.getBoundingClientRect().height,
    rows: [...new Set(rows)].length,
    scrollWidth: nav.querySelector("ul").scrollWidth,
    clientWidth: nav.querySelector("ul").clientWidth,
    navRect: nav.getBoundingClientRect().toJSON(),
    logoRect: header.querySelector(".brand").getBoundingClientRect().toJSON(),
    menuRect: header.querySelector("[data-menu-open]").getBoundingClientRect().toJSON(),
    logoVisible: header.querySelector(".brand").getBoundingClientRect().width > 0,
    menuVisible: header.querySelector("[data-menu-open]").getBoundingClientRect().width > 0,
  };
});

try {
  for (const locale of ["vi", "en"]) {
    for (const route of ["", "advertising-products/?category=signage-raised-letters&photo=signage-raised-letters-07"]) {
      const page = await browser.newPage({ viewport: { width: 920, height: 910 }, reducedMotion: "reduce" });
      try {
        await page.goto(`${origin}/${locale}/${route}`, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => document.querySelector("#header-menu-items")?.dataset.navMeasured === "true", null, { timeout: 2000 });
        const narrow = await inspect(page);
        assert.equal(narrow.hidden, true, `${locale}/${route}: 920px nav must hide instead of wrapping`);
        assert.equal(narrow.inert, true, `${locale}/${route}: hidden links must leave keyboard order`);
        assert(narrow.headerHeight < 100, `${locale}/${route}: hidden nav must not leave a double-height header`);
        assert(narrow.logoVisible && narrow.menuVisible, `${locale}/${route}: logo and menu stay visible`);

        await page.setViewportSize({ width: 1200, height: 910 });
        await page.waitForTimeout(500);
        const wide = await inspect(page);
        assert.equal(wide.hidden, false, `${locale}/${route}: links should return when they fit: ${JSON.stringify(wide)}`);
        assert.equal(wide.inert, false, `${locale}/${route}: visible links return to keyboard order`);
        assert.equal(wide.rows, 1, `${locale}/${route}: visible links must share a row`);

        await page.evaluate(() => {
          document.documentElement.style.fontSize = "32px";
          window.dispatchEvent(new Event("resize"));
        });
        await page.waitForFunction(() => {
          const nav = document.querySelector("#header-menu-items");
          return nav?.inert && getComputedStyle(nav).visibility === "hidden";
        });
        const enlarged = await inspect(page);
        assert.equal(enlarged.hidden, true, `${locale}/${route}: large text must hide clipped links: ${JSON.stringify(enlarged)}`);
        await page.evaluate(() => {
          document.documentElement.style.removeProperty("font-size");
          window.dispatchEvent(new Event("resize"));
        });
        await page.waitForFunction(() => {
          const nav = document.querySelector("#header-menu-items");
          return nav && !nav.inert && getComputedStyle(nav).visibility === "visible";
        });
        assert.equal((await inspect(page)).rows, 1, `${locale}/${route}: links return after text size resets`);
      } finally {
        await page.close();
      }
    }
  }
  process.stdout.write("[shared-header-single-line] VI/EN, homepage/detail, resize, large text passed\n");
} finally {
  await browser.close();
}
