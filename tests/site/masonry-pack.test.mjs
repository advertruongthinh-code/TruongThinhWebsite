// Masonry live packer (masonry-live-layout R1, R2): band table, the visitor's best-of-LIVE_CANDIDATES pack on the real catalog, edge cases.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ADVERTISING_CARDS, ADVERTISING_CATEGORIES, ADVERTISING_PRODUCT_CHIPS } from "../../src/site/advertising-products/catalog.mjs";
import { columnsForWidth, filterRank, isWideMedia, layoutMedia, masonrySpacing } from "../../src/site/masonry/layout.mjs";
import { LAYOUT_BANDS, LIVE_CANDIDATES, PHONE_SEEDS, livePool, packBand, packCandidate, packLive, phonePacks, phonePacksStamp, staggerViolations } from "../../src/site/masonry/pack.mjs";
import { createSeededRandom, shuffleWithSeed } from "../../src/site/masonry/random-order.mjs";
import { bandKey, replayLayout, verifyLayout } from "../../src/site/masonry/replay.mjs";

const FILTERS = ["all", ...ADVERTISING_CATEGORIES.map(({ slug }) => slug), ...ADVERTISING_PRODUCT_CHIPS.map(({ filter }) => filter)];
const SEEDS = ["s1", "s2", "s3"];
const card = (id, width, height, extra = {}) => ({ id, category: "c", sourceOrder: Number(id.slice(1)), media: { src: `/${id}.jpg`, width, height }, ...extra });
const pack = (cards, filter, band, seed) => packLive({ pool: livePool(cards, filter), band, seed, filter });
const live = new Map();
for (const filter of FILTERS) for (const band of LAYOUT_BANDS) for (const seed of SEEDS) live.set(`${filter}|${band.key}|${seed}`, pack(ADVERTISING_CARDS, filter, band, seed));

test("band table matches columnsForWidth and masonrySpacing for every width 280-2600", () => {
  for (let width = 280; width <= 2600; width += 1) {
    const key = bandKey(width);
    const band = LAYOUT_BANDS.find((entry) => entry.key === key);
    assert.ok(band, `no band for ${width}px`);
    const { outer, interCardGap } = masonrySpacing(width);
    const columns = columnsForWidth(width);
    assert.equal(key, `${columns}:${interCardGap}`);
    assert.equal(band.columns, columns);
    assert.equal(band.gap, interCardGap);
    assert.ok(width >= band.minWidth && width <= band.maxWidth, `${width}px outside ${key}`);
    const cw = (width - 2 * outer - interCardGap * (columns - 1)) / columns;
    assert.ok(cw >= band.cwMin - 1e-9 && cw <= band.cwMax + 1e-9, `${width}px card width ${cw} outside ${key}`);
  }
});

test("every live pack replays without holes on the band ends, the scoring width and 3 seeded widths", () => {
  const random = createSeededRandom("masonry-pack-test");
  for (const band of LAYOUT_BANDS) {
    const top = Math.min(band.maxWidth, 4000);
    const widths = [band.minWidth, band.refWidth, top, ...[0, 1, 2].map(() => Math.round(band.minWidth + random() * (top - band.minWidth)))];
    for (const filter of FILTERS) for (const seed of SEEDS) {
      const entries = live.get(`${filter}|${band.key}|${seed}`);
      for (const layoutViewportWidth of widths) {
        const layout = replayLayout({ entries, cards: ADVERTISING_CARDS, layoutViewportWidth, filter });
        assert.ok(layout, `${filter} ${band.key} ${seed} ${layoutViewportWidth}px replay null`);
        const check = verifyLayout(layout);
        assert.ok(check.ok, `${filter} ${band.key} ${seed} ${layoutViewportWidth}px: ${check.errors.slice(0, 3)}`);
        assert.ok(check.maxCrop <= 0.05 + 1e-6);
      }
    }
  }
});

test("real catalog: no wide card is demoted in the chosen order", () => {
  for (const filter of FILTERS) for (const band of LAYOUT_BANDS.filter(({ columns }) => columns >= 3)) for (const seed of SEEDS) {
    const entries = live.get(`${filter}|${band.key}|${seed}`);
    const demoted = entries.filter((entry) => (entry & 7) < 4 && isWideMedia(layoutMedia(ADVERTISING_CARDS[entry >> 3])));
    assert.deepEqual(demoted, [], `${filter} ${band.key} ${seed}`);
  }
});

test("one-column cards never cross rank tiers", () => {
  for (const filter of FILTERS) for (const band of LAYOUT_BANDS) for (const seed of SEEDS) {
    const ranks = live.get(`${filter}|${band.key}|${seed}`).map((entry) => ADVERTISING_CARDS[entry >> 3])
      .filter((entry) => !isWideMedia(layoutMedia(entry))).map((entry) => filterRank(entry, filter));
    assert.ok(ranks.every((rank, i) => !i || rank >= ranks[i - 1]), `${filter} ${band.key} ${seed}`);
  }
});

// Aligned bottoms per card at each band's scoring width (owner O9: soft, a score and not a rule). Summed over the filters, the best
// of LIVE_CANDIDATES must beat single random orders on 3+ columns (a small filter alone can tie), and every filter stays under the
// ceiling the old build cache held.
const STAGGER_CEILING = 0.2;
const staggerMean = (orders, band, filter) => orders.reduce((sum, entries) => {
  const layout = replayLayout({ entries, cards: ADVERTISING_CARDS, layoutViewportWidth: band.refWidth, filter });
  return sum + staggerViolations(layout) / layout.placements.length;
}, 0) / orders.length;
test("live packs stagger bottom edges better than single random orders and under the ceiling", () => {
  const index = new Map(ADVERTISING_CARDS.map((entry, i) => [entry, i]));
  const seeds = Array.from({ length: 12 }, (_, s) => `stagger-${s}`);
  const totals = new Map(LAYOUT_BANDS.map(({ key }) => [key, { chosen: 0, random: 0 }]));
  for (const filter of ["all", ...ADVERTISING_CATEGORIES.map(({ slug }) => slug)]) {
    const pool = ADVERTISING_CARDS.filter((entry) => livePool([entry], filter).length);
    const rank = (entry) => filterRank(entry, filter);
    for (const band of LAYOUT_BANDS) {
      const chosen = staggerMean(seeds.map((seed) => pack(ADVERTISING_CARDS, filter, band, seed)), band, filter);
      const random = staggerMean(seeds.map((seed) => {
        const order = shuffleWithSeed(pool, seed, "baseline").sort((x, y) => rank(x) - rank(y));
        return packBand(order, band, { rankOf: rank }).entries.map(({ card: entry, column, span }) => index.get(entry) * 8 + (span === 1 ? column : 4 + column));
      }), band, filter);
      totals.get(band.key).chosen += chosen;
      totals.get(band.key).random += random;
      assert.ok(chosen <= STAGGER_CEILING, `${filter} ${band.key}: ${chosen.toFixed(3)} per card`);
    }
  }
  for (const band of LAYOUT_BANDS.filter(({ columns }) => columns >= 3)) {
    const { chosen, random } = totals.get(band.key);
    assert.ok(chosen < random, `${band.key}: chosen ${chosen.toFixed(3)} vs random ${random.toFixed(3)}`);
  }
});

test("same pool, band and seed always pack the same entries; another seed gives another grid", () => {
  const band = LAYOUT_BANDS[4];
  assert.deepEqual(pack(ADVERTISING_CARDS, "all", band, "s1"), live.get(`all|${band.key}|s1`));
  assert.notDeepEqual(live.get(`all|${band.key}|s1`), live.get(`all|${band.key}|s2`));
  // The main-thread fallback picks from the same candidates, so a Worker failure draws the same grid.
  const job = { pool: livePool(ADVERTISING_CARDS, "all"), band, seed: "s1", filter: "all" };
  const candidates = Array.from({ length: LIVE_CANDIDATES }, (_, s) => packCandidate(job, s));
  assert.ok(candidates.some(({ entries }) => JSON.stringify(entries) === JSON.stringify(live.get(`all|${band.key}|s1`))));
});

test("empty pool packs to no entries", () => {
  for (const band of LAYOUT_BANDS) assert.deepEqual(pack([card("a1", 100, 100)], "missing", band, "s"), []);
});

test("a single wide card on 3+ columns spans the first row; never on the 2-column band", () => {
  const cards = [card("a1", 1618, 1000)];
  assert.deepEqual(pack(cards, "all", LAYOUT_BANDS[4], "s"), [4]);
  assert.deepEqual(pack(cards, "all", LAYOUT_BANDS[1], "s"), [4]);
  assert.deepEqual(pack(cards, "all", LAYOUT_BANDS[0], "s"), [0]);
});

test("a pool of only wide cards stacks them as level 2-column rows", () => {
  const cards = [card("a1", 2000, 1000), card("a2", 1800, 1000), card("a3", 3000, 1000)];
  const { entries, demoted } = packBand(cards, LAYOUT_BANDS[4]);
  assert.deepEqual(demoted, []);
  assert.ok(entries.every(({ span }) => span === 2));
  const layout = replayLayout({ entries: entries.map(({ card: entry, column }) => cards.indexOf(entry) * 8 + 4 + column), cards, layoutViewportWidth: 1440 });
  assert.ok(verifyLayout(layout).ok);
});

test("the golden-ratio threshold: 1618x1000 is wide, 1617x1000 is not", () => {
  const band = LAYOUT_BANDS[4];
  assert.equal(packBand([card("a1", 1618, 1000)], band).entries[0].span, 2);
  assert.equal(packBand([card("a1", 1617, 1000)], band).entries[0].span, 1);
});

test("phone packs: one live 2:15 pack per fixed seed, stamped by card ids and media sizes", () => {
  const filter = FILTERS[1];
  const packs = phonePacks(ADVERTISING_CARDS, filter);
  assert.equal(packs.filter, filter);
  assert.deepEqual(packs.seeds, PHONE_SEEDS);
  assert.equal(new Set(PHONE_SEEDS).size, 8);
  packs.entries.forEach((entries, index) => assert.deepEqual(entries, pack(ADVERTISING_CARDS, filter, LAYOUT_BANDS[0], PHONE_SEEDS[index])));
  assert.equal(packs.stamp, phonePacksStamp(ADVERTISING_CARDS.slice()));
  const resized = ADVERTISING_CARDS.map((entry, index) => (index === 0 ? { ...entry, mediaItems: undefined, media: { ...layoutMedia(entry), height: layoutMedia(entry).height + 1 } } : entry));
  assert.notEqual(phonePacksStamp(resized), packs.stamp, "a media size change changes the stamp");
  assert.notEqual(phonePacksStamp(ADVERTISING_CARDS.slice(1)), packs.stamp, "a removed card changes the stamp");
});
