// Masonry layout cache in a real browser (advertising-masonry R6, plan T7): the grid that people see must come from the
// precomputed cache and pass verifyLayout on its own DOM geometry, wide cards included, and the loading order of the
// cache files, the filter chip while a cache is late, and the late-cache relayout behind an open card must hold.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/masonry-layout-cache.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";
import { columnsForWidth, isWideMedia, layoutMedia, masonrySpacing } from "../../src/site/masonry/layout.mjs";
import { LAYOUT_BANDS } from "../../src/site/masonry/packer.mjs";
import { bandKey, verifyLayout } from "../../src/site/masonry/replay.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined });

const ADVERTISING = "/vi/advertising-products/";
const PROJECTS = "/vi/projects/";
const WIDTHS = [384, 768, 1024, 1201, 1440, 1920];
// Crop is capped at 5% of the media height; the media ratio then drifts by at most 1 / 0.95 - 1.
const MAX_CROP = 0.05;

const open = async (url, width = 1440, { setup, height = 900, ready = true } = {}) => {
  const page = await browser.newPage({ viewport: { width, height } });
  const log = { warnings: [], requests: [] };
  page.on("console", (message) => message.type() === "warning" && message.text().includes("[masonry]") && log.warnings.push(message.text()));
  page.on("request", (request) => log.requests.push({ url: request.url(), at: Date.now() }));
  await setup?.(page, log);
  await page.goto(`${base}${url}`, { waitUntil: "domcontentloaded" });
  // Cards sit at 0,0 until the layout is measured; the CTA skeleton is built from that measure.
  if (ready) await page.waitForSelector("[data-project-grid] [data-masonry-item]", { state: "attached" });
  if (ready) await page.waitForFunction(() => document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaReady === "true", null, { timeout: 30000 });
  return { page, log };
};

// Inline left, top, width and height are the geometry the runtime committed; they do not move while a transition runs.
const snapshot = (page) => page.evaluate(() => {
  const grid = document.querySelector("[data-project-grid]");
  return {
    viewportWidth: document.documentElement.clientWidth,
    gridWidth: grid.clientWidth,
    items: [...grid.querySelectorAll("[data-masonry-item]")].filter((node) => !node.hidden).map((node) => ({
      id: node.dataset.advertisingCard,
      left: Number.parseFloat(node.style.left),
      top: Number.parseFloat(node.style.top),
      width: Number.parseFloat(node.style.width),
      height: Number.parseFloat(node.style.height),
      span: Number(node.dataset.advertisingSpan),
    })),
  };
});

// Wait until the committed geometry stops changing: the entrance staggers cards (0.15 s apart) from the column tops.
const settled = async (page) => {
  let previous = "";
  let stableSince = 0;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const next = JSON.stringify(await snapshot(page));
    if (next !== previous) stableSince = Date.now();
    else if (Date.now() - stableSince >= 1000 && JSON.parse(next).items.length) return JSON.parse(next);
    previous = next;
    await page.waitForTimeout(200);
  }
  throw new Error("grid geometry never settled");
};

const projectCards = (page) => page.evaluate(() => JSON.parse(document.querySelector("[data-project-artifact]").textContent).cards);
const cardsOf = async (page, url) => (url === PROJECTS ? projectCards(page) : ADVERTISING_CATALOG_ARTIFACT.cards);

// The same shape verifyLayout reads from a replay, rebuilt from what the browser holds. The window is a y range, so each
// column holds a prefix of its cards and the first card of every column must sit at 0.
function layoutFromDom(dom, cards) {
  const { outer, interCardGap } = masonrySpacing(dom.viewportWidth);
  const columns = columnsForWidth(dom.viewportWidth);
  const cardWidth = (dom.gridWidth - interCardGap * (columns - 1)) / columns;
  const byId = new Map(cards.map((card) => [card.id, card]));
  const placements = dom.items.map((item) => {
    const card = byId.get(item.id);
    assert.ok(card, `${item.id} is in the catalog`);
    const media = layoutMedia(card);
    const left = Math.round(item.left / (cardWidth + interCardGap));
    assert.ok(Math.abs(item.left - left * (cardWidth + interCardGap)) < 0.5, `${item.id}: left ${item.left} is on a column`);
    assert.ok(Math.abs(item.width - (item.span * cardWidth + (item.span - 1) * interCardGap)) < 0.5, `${item.id}: width ${item.width} matches span ${item.span}`);
    const natural = item.width * media.height / media.width;
    return { card, left, width: item.span, y: item.top, pixelHeight: item.height, mediaPixelHeight: item.height, mediaBleed: Math.max(0, natural - item.height) };
  });
  return { columns, interCardGap, outer, placements };
}

function assertGrid(dom, cards, label, { stacked = false } = {}) {
  const layout = layoutFromDom(dom, cards);
  const check = verifyLayout(layout, { tolerance: 0.05 });
  assert.ok(check.ok, `${label}: ${check.errors.slice(0, 3).join("; ")}`);
  assert.ok(check.maxCrop <= MAX_CROP + 1e-3, `${label}: crop ${check.maxCrop}`);
  // Wide cards (owner O1): from 3 columns a cover of ratio 1.618 or wider spans 2; on 2 columns every card is 1 column.
  for (const { card, width } of layout.placements) {
    const wide = !stacked && layout.columns >= 3 && isWideMedia(layoutMedia(card));
    assert.equal(width, wide ? 2 : 1, `${label}: ${card.id} spans ${width} on ${layout.columns} columns`);
  }
  return layout;
}

try {
  // 1. Geometry from the DOM passes the same check as the build, on both grids and at every band.
  for (const url of [ADVERTISING, PROJECTS]) {
    for (const width of WIDTHS) {
      const { page } = await open(url, width, { height: width < 500 ? 800 : 900 });
      const dom = await settled(page);
      const layout = assertGrid(dom, await cardsOf(page, url), `${url} ${width}px`);
      assert.equal(layout.columns, LAYOUT_BANDS.find((band) => band.key === bandKey(width)).columns);
      // Wide covers far below the window: mount some by id and read their committed span.
      const wideIds = (await cardsOf(page, url)).filter((card) => isWideMedia(layoutMedia(card))).slice(0, 4).map((card) => card.id);
      const spans = await page.evaluate((ids) => ids.map((id) => {
        const node = window.TruongThinhMasonry.getAdapter().ensurePhoto(id);
        return node && { id, span: Number(node.dataset.advertisingSpan), width: Number.parseFloat(node.style.width) };
      }), wideIds);
      for (const entry of spans) assert.ok(entry, `${url} ${width}px: wide cover mounts`);
      assert.deepEqual(spans.map((entry) => entry.span), spans.map(() => (layout.columns >= 3 ? 2 : 1)), `${url} ${width}px: wide covers span`);
      if (url === ADVERTISING && wideIds.length === 0) assert.fail("the catalog has no wide cover to test");
      console.log(`PASS grid geometry ${url} ${width}px: ${layout.placements.length} cards, ${layout.columns} columns`);
      await page.close();
    }
  }

  // 2. Visitors never download the packer; five loads at 1440 give different first cards; the one-filter file comes
  // before the first card, the whole-band file after it, and a filter click after that makes no cache request.
  {
    const firstCards = new Set();
    for (let load = 0; load < 8; load += 1) {
      const { page, log } = await open(ADVERTISING, 1440, {
        setup: (target) => target.addInitScript(() => {
          new MutationObserver((records, observer) => {
            if (!document.querySelector("[data-project-grid] [data-masonry-item]")) return;
            window.__firstCardAt = Date.now();
            observer.disconnect();
          }).observe(document, { childList: true, subtree: true });
        }),
      });
      const dom = await settled(page);
      assertGrid(dom, ADVERTISING_CATALOG_ARTIFACT.cards, `reload ${load}`);
      firstCards.add(dom.items.reduce((first, item) => (item.top < first.top || (item.top === first.top && item.left < first.left) ? item : first)).id);
      assert.deepEqual(log.requests.filter(({ url }) => /packer\.mjs/.test(url)), [], "packer.mjs is build-only");
      if (load === 0) {
        const cacheRequests = () => log.requests.filter(({ url }) => /\/layout-cache\//.test(url));
        await page.waitForFunction(() => performance.getEntriesByType("resource").some((entry) => /layout-cache\/4-35\.mjs/.test(entry.name)), null, { timeout: 20000 });
        const [filterFile, ...rest] = cacheRequests();
        assert.match(filterFile.url, /\/layout-cache\/4-35\/all\.mjs$/, "first cache request is the one-filter file");
        assert.equal(cacheRequests().filter(({ url }) => /4-35\/all\.mjs/.test(url)).length, 1, "the one-filter file is requested once");
        assert.ok(rest.some(({ url }) => /\/layout-cache\/4-35\.mjs$/.test(url)), "the whole-band file follows");
        const firstCardAt = await page.evaluate(() => window.__firstCardAt);
        assert.ok(filterFile.at <= firstCardAt, "the one-filter file is requested before the first card exists");
        const before = cacheRequests().length;
        await page.locator('[data-advertising-filter="signage"]').click();
        await page.waitForFunction(() => document.querySelector('[data-advertising-filter="signage"]')?.getAttribute("aria-current") === "true");
        await settled(page);
        assert.equal(cacheRequests().length, before, "a filter click after the whole-band file arrived requests nothing");
      }
      await page.close();
    }
    assert.ok(firstCards.size >= 2, `8 reloads gave one first card only: ${[...firstCards]}`);
    console.log(`PASS 8 reloads: ${firstCards.size} different first cards, no packer download, cache file order`);
  }

  // 3. Every cache file blocked: the page still builds, every card is one column, no hole, one console warning.
  {
    const { page, log } = await open(ADVERTISING, 1440, { setup: (target) => target.route("**/layout-cache/**", (route) => route.abort()) });
    const dom = await settled(page);
    const layout = assertGrid(dom, ADVERTISING_CATALOG_ARTIFACT.cards, "blocked cache", { stacked: true });
    assert.ok(layout.placements.length > 8);
    assert.equal(log.warnings.filter((text) => text.includes("layout cache miss")).length, 1, "one miss warning");
    await page.close();
    console.log("PASS blocked cache: stack layout, no hole");
  }

  // 4. Resize 1440 -> 1000 -> 768 keeps the layout hole free in each band.
  {
    const { page } = await open(ADVERTISING, 1440);
    await settled(page);
    for (const width of [1000, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForFunction((expected) => document.documentElement.clientWidth === expected, width);
      const dom = await settled(page);
      assertGrid(dom, ADVERTISING_CATALOG_ARTIFACT.cards, `resized to ${width}px`);
    }
    await page.close();
    console.log("PASS resize 1440 -> 1000 -> 768");
  }

  // 5. Chip feedback while a filter click waits for its cache: the chip takes its selected look (aria-busy) at once, the
  // grid keeps the old layout, and both settle when the file lands or the click is cancelled.
  {
    const DELAY = 2500;
    const { page } = await open(ADVERTISING, 1440, {
      setup: async (target) => {
        await target.route("**/layout-cache/4-35/signage.mjs", async (route) => { await new Promise((resolve) => setTimeout(resolve, DELAY)); await route.continue(); });
        await target.route("**/layout-cache/4-35.mjs", async (route) => { await new Promise((resolve) => setTimeout(resolve, 3 * DELAY)); await route.continue(); });
      },
    });
    const chip = page.locator('[data-advertising-filter="signage"]');
    const state = () => page.evaluate(() => ({
      busy: document.querySelector('[data-advertising-filter="signage"]').getAttribute("aria-busy"),
      signage: document.querySelector('[data-advertising-filter="signage"]').getAttribute("aria-current"),
      all: document.querySelector('[data-advertising-filter="all"]').getAttribute("aria-current"),
    }));
    const before = await settled(page);
    await chip.click();
    await page.waitForTimeout(150);
    assert.deepEqual(await state(), { busy: "true", signage: "false", all: "true" }, "chip is busy, the grid still shows All");
    assert.deepEqual((await snapshot(page)).items, before.items, "grid keeps its layout while the cache loads");
    await page.waitForTimeout(DELAY + 1000);
    assert.deepEqual(await state(), { busy: null, signage: "true", all: "false" }, "the click lands and the busy mark is gone");
    // A second click cancelled before the file lands also clears the busy mark (re-click on the active filter).
    await page.locator('[data-advertising-filter="all"]').click();
    await page.waitForTimeout(200);
    await page.locator('[data-advertising-filter="signage"]').click();
    await page.waitForTimeout(100);
    assert.equal((await state()).busy, null, "a cached filter needs no busy mark");
    await page.close();
    console.log("PASS chip feedback while the cache loads");
  }
  {
    const DELAY = 2500;
    const { page } = await open(ADVERTISING, 1440, {
      setup: async (target) => {
        await target.route("**/layout-cache/4-35/signage.mjs", async (route) => { await new Promise((resolve) => setTimeout(resolve, DELAY)); await route.continue(); });
        await target.route("**/layout-cache/4-35.mjs", async (route) => { await new Promise((resolve) => setTimeout(resolve, 3 * DELAY)); await route.continue(); });
      },
    });
    await settled(page);
    await page.locator('[data-advertising-filter="signage"]').click();
    await page.waitForTimeout(150);
    await page.locator('[data-advertising-filter="all"]').click();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('[data-advertising-filter="signage"]').getAttribute("aria-busy"), null, "cancelling the click clears the busy mark");
    await page.close();
    console.log("PASS chip busy mark cleared by cancel");
  }

  // 6. A cache that lands after the 4 s wait, while a card is open, must not lay the hidden grid out behind the card; the
  // grid takes the cached layout when the visitor returns to it.
  {
    const LATE = 6500;
    const heroId = ADVERTISING_CATALOG_ARTIFACT.cards.find((card) => !isWideMedia(layoutMedia(card))).id;
    const { page } = await open(`${ADVERTISING}?photo=${heroId}`, 1440, {
      ready: false,
      setup: async (target) => {
        await target.route("**/layout-cache/4-35/**", async (route) => { await new Promise((resolve) => setTimeout(resolve, LATE)); await route.continue(); });
        await target.route("**/layout-cache/4-35.mjs", async (route) => { await new Promise((resolve) => setTimeout(resolve, LATE)); await route.continue(); });
      },
    });
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingDetailReady === "true", null, { timeout: 30000 });
    // The 4 s wait ends, the stack layout is measured; watch the hidden grid from then on.
    await page.waitForTimeout(4500);
    await page.evaluate(() => {
      window.__gridWrites = 0;
      new MutationObserver((records) => { window.__gridWrites += records.length; })
        .observe(document.querySelector("[data-project-grid]"), { attributes: true, attributeFilter: ["style"], childList: true, subtree: true });
    });
    await page.waitForTimeout(LATE - 4500 + 1500);
    assert.equal(await page.evaluate(() => window.__gridWrites), 0, "the late cache did not touch the hidden grid while the card is open");
    await page.evaluate(() => document.querySelector('.desktop-nav a[href*="advertising-products"]').click());
    await page.waitForFunction(() => !document.body.classList.contains("is-advertising-photo"), null, { timeout: 15000 });
    await settled(page);
    // A stack layout has no 2-column card; the cached one has them (mounted by id, they may sit below the window).
    const wideIds = ADVERTISING_CATALOG_ARTIFACT.cards.filter((card) => isWideMedia(layoutMedia(card))).slice(0, 4).map((card) => card.id);
    const spans = await page.evaluate((ids) => ids.map((id) => Number(window.TruongThinhMasonry.getAdapter().ensurePhoto(id)?.dataset.advertisingSpan)), wideIds);
    assert.deepEqual(spans, wideIds.map(() => 2), "the cached layout (wide cards) replaced the stack layout");
    await page.close();
    console.log("PASS late cache with a card open");
  }
  console.log("masonry layout cache e2e: ok");
} finally {
  await browser.close();
}
