// First grid build split into tasks (advertising-masonry R7): on a direct load the task that mounts cards builds only cards on
// screen and the first 8, without the CTA batch; the rest of the window and the CTA batch follow in later tasks, and nothing is left behind.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/masonry-first-build.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".tooling/browsers");

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined });
const cases = [
  { width: 384, height: 730, route: "/vi/advertising-products/" },
  { width: 1440, height: 900, route: "/vi/advertising-products/" },
  { width: 384, height: 730, route: "/vi/projects/" },
];

try {
  for (const { width, height, route } of cases) {
    const label = `${width}px ${route}`;
    const page = await browser.newPage({ viewport: { width, height } });
    try {
      // A MutationObserver callback runs at the end of the task (microtask checkpoint) that inserted the nodes: the first callback that
      // sees cards shows what that task built.
      await page.addInitScript(() => {
        window.__firstBuild = null;
        new MutationObserver(() => {
          if (window.__firstBuild) return;
          const cards = [...document.querySelectorAll("[data-project-grid] [data-masonry-card]")];
          if (!cards.length) return;
          window.__firstBuild = {
            ids: cards.map((card) => card.dataset.masonryCard),
            ctaFrames: document.querySelectorAll("[data-masonry-cta-frame]").length,
          };
        }).observe(document, { childList: true, subtree: true });
      });
      await page.goto(`${baseUrl}${route}`);
      await page.waitForFunction(() => window.__firstBuild && document.querySelector("[data-masonry-cta-frame]")
        && !document.querySelector(".masonry-ghost"), null, { timeout: 15_000 });
      const result = await page.evaluate(() => {
        const grid = document.querySelector("[data-project-grid]");
        const gridTop = grid.getBoundingClientRect().top + scrollY;
        const node = (id) => grid.querySelector(`[data-masonry-card="${CSS.escape(id)}"]`);
        return {
          first: window.__firstBuild,
          scrollY,
          mounted: grid.querySelectorAll("[data-masonry-card]").length,
          // Placement of each first-task card: grid-relative top and height, pool position.
          placed: window.__firstBuild.ids.map((id) => {
            const card = node(id);
            return card && { id, top: parseFloat(card.style.top), height: card.offsetHeight, index: Number(card.getAttribute("aria-posinset")) };
          }),
          viewportBottom: innerHeight - gridTop,
          ctaTop: getComputedStyle(grid.closest(".masonry-section") || grid).getPropertyValue("--masonry-cta-top"),
        };
      });
      assert.equal(result.scrollY, 0, `${label}: page stays at the top`);
      assert.equal(result.first.ctaFrames, 0, `${label}: the CTA batch is not built in the card task`);
      for (const card of result.placed) {
        assert.ok(card, `${label}: a first-task card is still mounted`);
        assert.ok(card.index <= 8 || card.top < result.viewportBottom,
          `${label}: first-task card ${card.id} is on screen or among the first 8: ${JSON.stringify(card)}`);
      }
      assert.ok(result.mounted > result.first.ids.length, `${label}: the rest of the window mounts after the first task (${result.first.ids.length} then ${result.mounted})`);
      assert.match(result.ctaTop, /^\d+(\.\d+)?px$/, `${label}: the CTA batch is placed below the grid`);
    } finally {
      await page.close();
    }
  }
  console.log("masonry-first-build: ok");
} finally {
  await browser.close();
}
