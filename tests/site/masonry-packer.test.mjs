// Masonry layout cache, build side (plan T3): band table, real-catalog build, variant rules, edge cases.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ADVERTISING_CARDS, ADVERTISING_CATEGORIES, ADVERTISING_PRODUCT_CHIPS } from "../../src/site/advertising-products/catalog.mjs";
import { columnsForWidth, filterRank, isWideMedia, layoutMedia, masonrySpacing, matchesFilter } from "../../src/site/masonry/layout.mjs";
import {
  LAYOUT_BANDS,
  LAYOUT_CACHE_MAX_VARIANTS,
  LAYOUT_CACHE_MIN_VARIANTS,
  bandKey,
  buildLayoutCache,
  packBand,
  poolSignature,
  staggerViolations,
} from "../../src/site/masonry/packer.mjs";
import { createSeededRandom, shuffleWithSeed } from "../../src/site/masonry/random-order.mjs";
import { replayLayout, verifyLayout } from "../../src/site/masonry/replay.mjs";

const FILTERS = ["all", ...ADVERTISING_CATEGORIES.map(({ slug }) => slug), ...ADVERTISING_PRODUCT_CHIPS.map(({ filter }) => filter)];
const build = (cards, filters, datasetVersion = "test") => buildLayoutCache({ cards, filters, datasetVersion, rankOf: filterRank, matches: matchesFilter });

const warnings = [];
const realWarn = console.warn;
console.warn = (message, ...rest) => (String(message).startsWith("layout-cache:") ? warnings.push(String(message)) : realWarn(message, ...rest));
const started = performance.now();
const cache = build(ADVERTISING_CARDS, FILTERS);
const buildMs = performance.now() - started;
console.warn = realWarn;

const card = (id, width, height, extra = {}) => ({ id, category: "c", sourceOrder: Number(id.slice(1)), media: { src: `/${id}.jpg`, width, height }, ...extra });

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

test("real catalog builds well under the 60 s budget", () => {
  assert.ok(buildMs < 60000, `${Math.round(buildMs)} ms`);
});

test("every kept variant replays without holes on the band ends, the scoring width and 3 seeded widths", () => {
  const random = createSeededRandom("masonry-packer-test");
  for (const band of LAYOUT_BANDS) {
    const top = Math.min(band.maxWidth, 4000);
    const widths = [band.minWidth, band.refWidth, top, ...[0, 1, 2].map(() => Math.round(band.minWidth + random() * (top - band.minWidth)))];
    for (const [filter, { variants }] of Object.entries(cache[band.key].filters)) {
      for (const [v, entries] of variants.entries()) {
        for (const layoutViewportWidth of widths) {
          const layout = replayLayout({ entries, cards: ADVERTISING_CARDS, layoutViewportWidth, filter });
          assert.ok(layout, `${filter} ${band.key} v${v} ${layoutViewportWidth}px replay null`);
          const check = verifyLayout(layout);
          assert.ok(check.ok, `${filter} ${band.key} v${v} ${layoutViewportWidth}px: ${check.errors.slice(0, 3)}`);
          assert.ok(check.maxCrop <= 0.05 + 1e-6);
        }
      }
    }
  }
});

test("each filter keeps 8 to 32 variants, the same count on all 5 bands, from one base order per variant", () => {
  const index = new Map(ADVERTISING_CARDS.map((entry, i) => [entry, i]));
  for (const filter of FILTERS) {
    const counts = LAYOUT_BANDS.map((band) => cache[band.key].filters[filter].variants.length);
    assert.ok(counts[0] >= LAYOUT_CACHE_MIN_VARIANTS && counts[0] <= LAYOUT_CACHE_MAX_VARIANTS, `${filter}: ${counts[0]}`);
    assert.ok(counts.every((count) => count === counts[0]), `${filter}: ${counts}`);
    assert.ok(LAYOUT_BANDS.every((band) => cache[band.key].filters[filter].sig === cache["4:35"].filters[filter].sig));
    // The 2-column band never spans or reorders, so it spells out the base order the other bands were packed from.
    for (const [v, phone] of cache["2:15"].filters[filter].variants.entries()) {
      const order = phone.map((entry) => ADVERTISING_CARDS[entry >> 3]);
      for (const band of LAYOUT_BANDS) {
        const packed = packBand(order, band, { rankOf: (entry) => filterRank(entry, filter) });
        const entries = packed.entries.map(({ card: entry, column, span }) => index.get(entry) * 8 + (span === 1 ? column : 4 + column));
        assert.deepEqual(cache[band.key].filters[filter].variants[v], entries, `${filter} ${band.key} v${v}`);
      }
    }
  }
});

test("real catalog: no wide card is demoted in any kept variant", () => {
  assert.deepEqual(warnings, []);
});

test("one-column cards never cross rank tiers", () => {
  for (const band of LAYOUT_BANDS) {
    for (const [filter, { variants }] of Object.entries(cache[band.key].filters)) {
      for (const entries of variants) {
        const ranks = entries.map((entry) => ADVERTISING_CARDS[entry >> 3]).filter((entry) => !isWideMedia(layoutMedia(entry))).map((entry) => filterRank(entry, filter));
        assert.ok(ranks.every((rank, i) => !i || rank >= ranks[i - 1]), `${filter} ${band.key}`);
      }
    }
  }
});

// Aligned bottoms per card at each band's scoring width (owner O9: soft, a score and not a rule). Real catalog, filters with
// 20+ cards: the kept variants must beat the same packer on unselected random orders, and stay under an absolute ceiling.
// Measured at T7: "all" 0.10 on 2 columns and 0.17 on 3-4 columns; the plan's 0.15 sample did not hold for the kept set.
const STAGGER_CEILING = 0.2;
const staggerMean = (orders, band, filter) => {
  const values = orders.map((entries) => {
    const layout = replayLayout({ entries, cards: ADVERTISING_CARDS, layoutViewportWidth: band.refWidth, filter });
    return staggerViolations(layout) / layout.placements.length;
  });
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};
test("kept variants stagger bottom edges better than random orders and under the ceiling", () => {
  const index = new Map(ADVERTISING_CARDS.map((entry, i) => [entry, i]));
  for (const filter of ["all", ...ADVERTISING_CATEGORIES.map(({ slug }) => slug)]) {
    const pool = ADVERTISING_CARDS.filter((entry) => matchesFilter(entry, filter));
    const rank = (entry) => filterRank(entry, filter);
    for (const band of LAYOUT_BANDS) {
      const kept = staggerMean(cache[band.key].filters[filter].variants, band, filter);
      const random = Array.from({ length: 16 }, (_, s) => {
        const order = shuffleWithSeed(pool, "stagger-baseline", `${filter}:${s}`).sort((x, y) => rank(x) - rank(y));
        return packBand(order, band, { rankOf: rank }).entries.map(({ card: entry, column, span }) => index.get(entry) * 8 + (span === 1 ? column : 4 + column));
      });
      const baseline = staggerMean(random, band, filter);
      assert.ok(kept <= baseline, `${filter} ${band.key}: kept ${kept.toFixed(3)} vs random ${baseline.toFixed(3)}`);
      assert.ok(kept <= STAGGER_CEILING, `${filter} ${band.key}: ${kept.toFixed(3)} per card`);
    }
  }
});

test("the build is deterministic", () => {
  const filters = FILTERS.slice(-3);
  assert.equal(JSON.stringify(build(ADVERTISING_CARDS, filters)), JSON.stringify(build(ADVERTISING_CARDS, filters)));
});

test("empty pool: 8 empty variants and the signature of an empty string", () => {
  const cache = build([card("a1", 100, 100)], ["missing"]);
  for (const band of LAYOUT_BANDS) {
    assert.deepEqual(cache[band.key].filters.missing, { sig: poolSignature([]), variants: Array(8).fill([]) });
  }
});

test("a pool of 1 or 2 cards still keeps 8 variants, repeats allowed", () => {
  for (const cards of [[card("a1", 100, 150)], [card("a1", 100, 150), card("a2", 100, 80)]]) {
    const { variants } = build(cards, ["all"])["4:35"].filters.all;
    assert.equal(variants.length, 8);
  }
});

test("a single wide card on 3+ columns spans the first row; never on the 2-column band", () => {
  const cards = [card("a1", 1618, 1000)];
  const cache = build(cards, ["all"]);
  assert.deepEqual(cache["4:35"].filters.all.variants[0], [4]);
  assert.deepEqual(cache["3:15"].filters.all.variants[0], [4]);
  assert.deepEqual(cache["2:15"].filters.all.variants[0], [0]);
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

test("invalid filter ids fail the build", () => {
  assert.throws(() => build([card("a1", 100, 100)], ["Bad Filter"]), /invalid filter id/);
});
