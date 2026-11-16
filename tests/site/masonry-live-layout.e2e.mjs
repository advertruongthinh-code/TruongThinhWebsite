// Masonry live layout in a real browser (masonry-live-layout R1-R4): the grid people see is packed on their machine and must
// pass verifyLayout on its own DOM geometry, wide cards included; Back returns the same coordinates; a failed Worker packs on
// the main thread; the filter chip while a pack is late and a late pack behind an open card must hold. Search mode (R6) places
// ranked results one column each in score order.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/masonry-live-layout.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";
import { columnsForWidth, isWideMedia, layoutMedia, masonrySpacing } from "../../src/site/masonry/layout.mjs";
import { LAYOUT_BANDS } from "../../src/site/masonry/pack.mjs";
import { bandKey, stackLayout, verifyLayout } from "../../src/site/masonry/replay.mjs";
import { slowPacks } from "./harness.mjs";

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
  if (ready) await page.waitForFunction(() => document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaReady === "true", null, { timeout: 30000 });
  return { page, log };
};

// Inline left, top, width and height are the geometry the runtime committed; they do not move while a transition runs.
const snapshot = (page) => page.evaluate(() => {
  const grid = document.querySelector("[data-project-grid]");
  return {
    viewportWidth: document.documentElement.clientWidth,
    gridWidth: grid.clientWidth,
    items: [...grid.querySelectorAll("[data-masonry-item]")].filter((node) => !node.hidden).map((node) => ({
      id: node.dataset.masonryCard,
      left: Number.parseFloat(node.style.left),
      top: Number.parseFloat(node.style.top),
      width: Number.parseFloat(node.style.width),
      height: Number.parseFloat(node.style.height),
      span: Number(node.dataset.masonrySpan),
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
      // R3: the 2-column band packs on the main thread and boots no grid Worker.
      const workers = await page.evaluate(() => window.__TT_GRID_WORKERS__?.length ?? 0);
      assert.ok(layout.columns === 2 ? workers === 0 : workers > 0, `${url} ${width}px: ${workers} grid Workers`);
      // Wide covers far below the window: mount some by id and read their committed span.
      const wideIds = (await cardsOf(page, url)).filter((card) => isWideMedia(layoutMedia(card))).slice(0, 4).map((card) => card.id);
      const spans = await page.evaluate((ids) => ids.map((id) => {
        const node = window.TruongThinhMasonry.getAdapter().ensurePhoto(id);
        return node && { id, span: Number(node.dataset.masonrySpan), width: Number.parseFloat(node.style.width) };
      }), wideIds);
      for (const entry of spans) assert.ok(entry, `${url} ${width}px: wide cover mounts`);
      assert.deepEqual(spans.map((entry) => entry.span), spans.map(() => (layout.columns >= 3 ? 2 : 1)), `${url} ${width}px: wide covers span`);
      if (url === ADVERTISING && wideIds.length === 0) assert.fail("the catalog has no wide cover to test");
      console.log(`PASS grid geometry ${url} ${width}px: ${layout.placements.length} cards, ${layout.columns} columns`);
      await page.close();
    }
  }

  // 2. Eight loads at 1440 give different first cards from the Worker pack, with no layout cache request; going back to All
  // after a filter click returns the same coordinates (same seed, same pack). A chip click replaces the history entry.
  {
    const firstCards = new Set();
    for (let load = 0; load < 8; load += 1) {
      const { page, log } = await open(ADVERTISING, 1440);
      const dom = await settled(page);
      assertGrid(dom, ADVERTISING_CATALOG_ARTIFACT.cards, `reload ${load}`);
      firstCards.add(dom.items.reduce((first, item) => (item.top < first.top || (item.top === first.top && item.left < first.left) ? item : first)).id);
      assert.deepEqual(log.requests.filter(({ url }) => /layout-cache|packer\.mjs/.test(url)), [], "no build cache or build packer is requested");
      assert.ok(log.requests.some(({ url }) => /\/masonry\/layout-worker\.mjs$/.test(url)), "the grid Worker is loaded");
      if (load === 0) {
        await page.locator('[data-masonry-filter="signage"]').click();
        await page.waitForFunction(() => document.querySelector('[data-masonry-filter="signage"]')?.getAttribute("aria-current") === "true");
        await settled(page);
        await page.locator('[data-masonry-filter="all"]').click();
        await page.waitForFunction(() => document.querySelector('[data-masonry-filter="all"]')?.getAttribute("aria-current") === "true");
        const back = await settled(page);
        const byId = (items) => Object.fromEntries(items.map(({ id, left, top, span }) => [id, [left, top, span]]));
        const common = back.items.filter(({ id }) => dom.items.some((item) => item.id === id));
        assert.ok(common.length >= 8, "All shows the cards seen before");
        assert.deepEqual(byId(common), byId(dom.items.filter(({ id }) => common.some((item) => item.id === id))), "All returns the same coordinates");
        // Real history Back (plan acceptance): open a card, Back; leave for the home page, Back. The grid keeps its coordinates.
        const sameAsBefore = async (label) => {
          const again = await settled(page);
          const shared = again.items.filter(({ id }) => dom.items.some((item) => item.id === id));
          assert.ok(shared.length >= 8, `${label}: the cards seen before are back`);
          assert.deepEqual(byId(shared), byId(dom.items.filter(({ id }) => shared.some((item) => item.id === id))), `${label}: same coordinates`);
        };
        await page.locator("[data-project-grid] [data-masonry-card] a").first().click();
        await page.waitForFunction(() => location.pathname.includes("/p/"));
        await page.goBack();
        await page.waitForFunction(() => !location.pathname.includes("/p/") && !document.body.classList.contains("is-detail"));
        await sameAsBefore("card then Back");
        await page.goto(`${base}/vi/`, { waitUntil: "domcontentloaded" });
        await page.goBack({ waitUntil: "domcontentloaded" });
        await page.waitForSelector("[data-project-grid] [data-masonry-item]", { state: "attached" });
        await sameAsBefore("home page then Back");
      }
      await page.close();
    }
    assert.ok(firstCards.size >= 2, `8 reloads gave one first card only: ${[...firstCards]}`);
    console.log(`PASS 8 reloads: ${firstCards.size} different first cards, no cache request, All, card Back and page Back keep coordinates`);
  }

  // 3. Worker blocked: the main thread packs the same way, so wide cards still span 2 and nothing warns.
  {
    const { page, log } = await open(ADVERTISING, 1440, { setup: (target) => target.route(/\/masonry\/layout-worker\.mjs$/, (route) => route.abort()) });
    const dom = await settled(page);
    const layout = assertGrid(dom, ADVERTISING_CATALOG_ARTIFACT.cards, "blocked Worker");
    assert.ok(layout.placements.length > 8);
    assert.deepEqual(log.warnings, [], "no masonry warning");
    await page.close();
    console.log("PASS blocked Worker: main-thread pack, no hole");
  }
  // 3b. Worker that never answers: after the 1 s pack timeout the main thread packs, so the grid still appears.
  {
    const { page } = await open(ADVERTISING, 1440, { setup: (target) => target.route(/\/masonry\/layout-worker\.mjs$/, (route) => route.fulfill({ contentType: "text/javascript", body: "onmessage = () => {};" })) });
    const dom = await settled(page);
    assertGrid(dom, ADVERTISING_CATALOG_ARTIFACT.cards, "stalled Worker");
    assert.ok(dom.items.length > 8, "the grid shows cards although the Worker never answers");
    await page.close();
    console.log("PASS stalled Worker: grid packed on the main thread after the timeout");
  }

  // 3c. Phone first grid (R3): at 384 the page's prebuilt 2:15 pack places the grid with one of its seeds; a stamp that does not
  // match the cards (page and artifact from different builds) packs live with a fresh seed instead.
  {
    const seedOf = (page) => page.evaluate(() => JSON.stringify(history.state).match(/"seed":"([^"]+)"/)?.[1] ?? null);
    for (const url of [ADVERTISING, PROJECTS]) {
      const { page } = await open(url, 384, { height: 800 });
      const dom = await settled(page);
      assertGrid(dom, await cardsOf(page, url), `${url} prebuilt phone grid`);
      assert.match(await seedOf(page), /^phone-\d$/, `${url}: the phone grid uses a prebuilt seed`);
      if (url === ADVERTISING) {
        // Back to a prebuilt seed takes the same prebuilt entries: same coordinates.
        const at = (items) => Object.fromEntries(items.map(({ id, left, top }) => [id, [left, top]]));
        await page.goto(`${base}/vi/`, { waitUntil: "domcontentloaded" });
        await page.goBack({ waitUntil: "domcontentloaded" });
        await page.waitForSelector("[data-project-grid] [data-masonry-item]", { state: "attached" });
        const again = await settled(page);
        const shared = again.items.filter(({ id }) => dom.items.some((item) => item.id === id));
        assert.ok(shared.length >= 8, "phone Back: the cards seen before are back");
        assert.deepEqual(at(shared), at(dom.items.filter(({ id }) => shared.some((item) => item.id === id))), "phone Back: same coordinates");
      }
      await page.close();
    }
    const { page } = await open(ADVERTISING, 384, { height: 800, setup: (target) => target.route(/\/vi\/advertising-products\/$/, async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace(/"stamp":\d+/, '"stamp":1') });
    }) });
    const dom = await settled(page);
    assertGrid(dom, ADVERTISING_CATALOG_ARTIFACT.cards, "stale phone packs");
    assert.doesNotMatch(await seedOf(page), /^phone-/, "a stale stamp packs live");
    await page.close();
    console.log("PASS phone first grid: prebuilt seed on ads and projects, Back keeps coordinates, stale stamp packs live");
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

  // The background packing of every chip (masonry-live-layout R3) may start the slow signage pack before the click; the delay is
  // long enough that it is still running when the click lands, so the click waits on it either way.
  // 5. Chip feedback while a filter click waits for its pack: the chip takes its selected look (aria-busy) at once, the grid
  // keeps the old layout, and both settle when the pack lands or the click is cancelled.
  {
    const DELAY = 8000;
    const { page } = await open(ADVERTISING, 1440, { setup: (target) => slowPacks(target, DELAY, "signage") });
    const chip = page.locator('[data-masonry-filter="signage"]');
    const state = () => page.evaluate(() => ({
      busy: document.querySelector('[data-masonry-filter="signage"]').getAttribute("aria-busy"),
      signage: document.querySelector('[data-masonry-filter="signage"]').getAttribute("aria-current"),
      all: document.querySelector('[data-masonry-filter="all"]').getAttribute("aria-current"),
    }));
    const before = await settled(page);
    await chip.click();
    await page.waitForTimeout(150);
    assert.deepEqual(await state(), { busy: "true", signage: "false", all: "true" }, "chip is busy, the grid still shows All");
    assert.deepEqual((await snapshot(page)).items, before.items, "grid keeps its layout while the pack runs");
    await page.waitForTimeout(DELAY + 1000);
    assert.deepEqual(await state(), { busy: null, signage: "true", all: "false" }, "the click lands and the busy mark is gone");
    // A packed filter needs no busy mark.
    await page.locator('[data-masonry-filter="all"]').click();
    await page.waitForTimeout(200);
    await page.locator('[data-masonry-filter="signage"]').click();
    await page.waitForTimeout(100);
    assert.equal((await state()).busy, null, "a packed filter needs no busy mark");
    await page.close();
    console.log("PASS chip feedback while the pack runs");
  }
  {
    const DELAY = 8000;
    const { page } = await open(ADVERTISING, 1440, { setup: (target) => slowPacks(target, DELAY, "signage") });
    await settled(page);
    await page.locator('[data-masonry-filter="signage"]').click();
    await page.waitForTimeout(150);
    await page.locator('[data-masonry-filter="all"]').click();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('[data-masonry-filter="signage"]').getAttribute("aria-busy"), null, "cancelling the click clears the busy mark");
    await page.close();
    console.log("PASS chip busy mark cleared by cancel");
  }

  // 6. A direct card page with a slow pack: the card opens without waiting for the grid, and the grid behind it takes the packed
  // layout (wide cards) when the visitor returns.
  {
    const LATE = 4000;
    const heroId = ADVERTISING_CATALOG_ARTIFACT.cards.find((card) => !isWideMedia(layoutMedia(card))).id;
    const started = Date.now();
    const { page } = await open(`${ADVERTISING}?photo=${heroId}`, 1440, { ready: false, setup: (target) => slowPacks(target, LATE) });
    await page.waitForFunction(() => document.querySelector("[data-detail-view]")?.dataset.masonryDetailReady === "true", null, { timeout: 30000 });
    assert.ok(Date.now() - started < LATE + 3000, "the card does not wait for more than the pack");
    await page.waitForTimeout(LATE);
    await page.evaluate(() => document.querySelector('.desktop-nav a[href*="advertising-products"]').click());
    await page.waitForFunction(() => !document.body.classList.contains("is-detail"), null, { timeout: 15000 });
    await settled(page);
    const wideIds = ADVERTISING_CATALOG_ARTIFACT.cards.filter((card) => isWideMedia(layoutMedia(card))).slice(0, 4).map((card) => card.id);
    const spans = await page.evaluate((ids) => ids.map((id) => Number(window.TruongThinhMasonry.getAdapter().ensurePhoto(id)?.dataset.masonrySpan)), wideIds);
    assert.deepEqual(spans, wideIds.map(() => 2), "the packed layout (wide cards) is behind the card");
    await page.close();
    console.log("PASS slow pack with a card open");
  }
  // 7. Search mode (R6): setResults places the ranked ids one column each, card i into the lowest column (stackLayout), with the
  // CTA batch at the end; unknown and repeated ids are skipped; the latest call wins; a band change replays without a pack;
  // pending dims the grid; a late offer relayouts only when pressed; a rail click or clearResults leaves search.
  {
    const all = ADVERTISING_CATALOG_ARTIFACT.cards;
    const wide = all.filter((card) => isWideMedia(layoutMedia(card))).slice(0, 3);
    const ranked = [...wide, ...all.filter((card) => !isWideMedia(layoutMedia(card))).slice(20, 32)].map((card) => card.id);
    const byId = new Map(all.map((card) => [card.id, card]));
    const searchMatches = async (page, ids, label) => {
      const dom = await settled(page);
      const order = ids.map((id) => byId.get(id));
      const expected = stackLayout({ order, layoutViewportWidth: dom.viewportWidth, source: "search" });
      const layout = assertGrid(dom, all, label, { stacked: true });
      assert.deepEqual(layout.placements.map((p) => p.card.id).sort(), [...ids].sort(), `${label}: exactly the results`);
      const want = new Map(expected.placements.map((p) => [p.card.id, p]));
      for (const p of layout.placements) {
        assert.equal(p.left, want.get(p.card.id).left, `${label}: ${p.card.id} column`);
        assert.ok(Math.abs(p.y - want.get(p.card.id).y) < 0.05, `${label}: ${p.card.id} y ${p.y} vs ${want.get(p.card.id).y}`);
      }
      await page.waitForFunction(() => document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaReady === "true", null, { timeout: 15000 });
    };
    const errors = [];
    const { page } = await open(ADVERTISING, 1440, { setup: (target) => target.on("pageerror", (error) => errors.push(error.message)) });
    await settled(page);
    await page.evaluate(() => {
      window.__searchLeft = 0;
      window.addEventListener("masonry:search-left", () => { window.__searchLeft += 1; });
    });
    await page.evaluate(() => window.TruongThinhMasonry.setPending(true));
    assert.equal(await page.locator("[data-project-grid][data-masonry-pending]").count(), 1, "pending marks the grid");
    await page.evaluate((ids) => window.TruongThinhMasonry.setResults([...ids, "no-such-card", ids[0]]), ranked);
    assert.equal(await page.locator("[data-project-grid][data-masonry-pending]").count(), 0, "results clear pending");
    await searchMatches(page, ranked, "search 1440px");
    // Latest call wins while the first is still sliding.
    const second = ranked.slice(4).reverse();
    await page.evaluate(([a, b]) => { window.TruongThinhMasonry.setResults(a); window.TruongThinhMasonry.setResults(b); }, [ranked, second]);
    await searchMatches(page, second, "search latest call");
    // A band change replays the results at the new width.
    await page.setViewportSize({ width: 768, height: 900 });
    await searchMatches(page, second, "search 768px");
    await page.setViewportSize({ width: 1440, height: 900 });
    await searchMatches(page, second, "search back to 1440px");
    // A late offer waits for a press.
    await page.evaluate((ids) => window.TruongThinhMasonry.offerResults(ids), ranked);
    await page.locator("[data-masonry-offer]").waitFor();
    assert.equal(await page.locator("[data-masonry-offer]").textContent(), "Có thêm kết quả gợi ý");
    await searchMatches(page, second, "offer alone keeps the grid");
    await page.locator("[data-masonry-offer]").click();
    assert.equal(await page.locator("[data-masonry-offer]").count(), 0, "the offer goes once pressed");
    await searchMatches(page, ranked, "offer pressed");
    // No results: an empty grid with the CTA batch.
    await page.evaluate(() => window.TruongThinhMasonry.setResults([]));
    await page.waitForFunction(() => !document.querySelector("[data-project-grid] [data-masonry-item]:not([hidden])"), null, { timeout: 15000 });
    await page.waitForFunction(() => document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaReady === "true", null, { timeout: 15000 });
    // A rail click leaves search for that filter and tells the search page.
    await page.evaluate((ids) => window.TruongThinhMasonry.setResults(ids), ranked);
    await searchMatches(page, ranked, "search before rail click");
    await page.locator('[data-masonry-filter="all"]').click();
    await page.waitForFunction(() => window.__searchLeft === 1, null, { timeout: 15000 });
    const browse = await settled(page);
    assertGrid(browse, all, "rail click after search");
    assert.ok(browse.items.length > ranked.length, "the whole filter is back");
    // clearResults returns to the filter too.
    await page.evaluate((ids) => window.TruongThinhMasonry.setResults(ids), second);
    await searchMatches(page, second, "search before clear");
    await page.evaluate(() => window.TruongThinhMasonry.clearResults());
    await page.waitForFunction(() => window.__searchLeft === 2, null, { timeout: 15000 });
    assertGrid(await settled(page), all, "clearResults");
    assert.deepEqual(errors, [], "no page errors");
    await page.close();
    // Phone width: results stay one column each in two columns.
    const phone = await open(ADVERTISING, 384, { height: 800 });
    await settled(phone.page);
    await phone.page.evaluate((ids) => window.TruongThinhMasonry.setResults(ids), ranked);
    await searchMatches(phone.page, ranked, "search 384px");
    await phone.page.close();
    // A call before the grid mounts waits for it.
    const early = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await early.addInitScript((ids) => {
      const timer = setInterval(() => {
        if (!window.TruongThinhMasonry) return;
        clearInterval(timer);
        window.TruongThinhMasonry.setResults(ids);
      });
    }, ranked);
    await early.goto(`${base}${ADVERTISING}`, { waitUntil: "domcontentloaded" });
    await searchMatches(early, ranked, "results set before mount");
    await early.close();
    console.log("PASS search mode");
  }
  console.log("masonry live layout e2e: ok");
} finally {
  await browser.close();
}
