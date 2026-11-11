// Masonry layout cache on card sets the catalog does not have yet (CMS phase): seeded random counts and aspect ratios.
// Each set must build without throwing, replay without holes on every band, keep every card once, and stay inside the crop cap.
import assert from "node:assert/strict";
import { test } from "node:test";
import { isWideMedia } from "../../src/site/masonry/layout.mjs";
import { LAYOUT_BANDS, LAYOUT_CACHE_MAX_VARIANTS, LAYOUT_CACHE_MIN_VARIANTS, buildLayoutCache } from "../../src/site/masonry/packer.mjs";
import { createSeededRandom } from "../../src/site/masonry/random-order.mjs";
import { CROP_CAP, poolSignature, replayLayout, stackLayout, verifyLayout } from "../../src/site/masonry/replay.mjs";

// width / height of one card cover; 1.618 and up is a wide card.
const PROFILES = {
  catalogLike: (random) => (random() < 0.04 ? 1.62 + random() * 0.6 : 0.6 + random() * 0.95),
  manyWide: (random) => (random() < 0.3 ? 1.62 + random() * 1.2 : 0.55 + random()),
  halfWide: (random) => (random() < 0.5 ? 1.62 + random() * 1.4 : 0.5 + random() * 1.1),
  allWide: (random) => 1.62 + random() * 2,
  extreme: (random) => (random() < 0.5 ? 0.25 + random() * 0.4 : 2.5 + random() * 3.5),
  uniform: () => 0.75,
  uniformWide: () => 16 / 9,
  tallOnly: (random) => 0.35 + random() * 0.3,
  thresholdEdge: (random) => (random() < 0.5 ? 1.618 : 1.617),
};
// LAYOUT_FUZZ_COUNTS=150,285,600 runs the long version by hand (about 6 minutes for all profiles).
const COUNTS = (process.env.LAYOUT_FUZZ_COUNTS ?? "1,2,3,5,8,13,21,40,80").split(",").map(Number);
const FILTERS = ["all", "a"];
const matches = (card, filter) => filter === "all" || card.category === filter;

function randomCards(random, count, ratioOf) {
  return Array.from({ length: count }, (_, i) => {
    const height = 600 + Math.floor(random() * 1400);
    return {
      id: `k${i}`,
      category: ["a", "b", "c"][Math.floor(random() * 3)],
      tier: Math.floor(random() * 3),
      sourceOrder: i,
      media: { src: `/k${i}.jpg`, width: Math.round(height * ratioOf(random)), height },
    };
  });
}

for (const [profile, ratioOf] of Object.entries(PROFILES)) {
  test(`random card sets, ${profile}: builds, replays without holes, keeps every card once`, () => {
    const realWarn = console.warn;
    console.warn = (message, ...rest) => (String(message).startsWith("layout-cache: demoted") ? undefined : realWarn(message, ...rest));
    try {
      for (const count of COUNTS) {
        const random = createSeededRandom(`${profile}:${count}`);
        const cards = randomCards(random, count, ratioOf);
        const cache = buildLayoutCache({ cards, filters: FILTERS, datasetVersion: "fuzz", rankOf: (card) => card.tier, matches });
        for (const band of LAYOUT_BANDS) {
          const top = Math.min(band.maxWidth, 4000);
          const widths = [band.minWidth, band.refWidth, top, ...[0, 1].map(() => Math.round(band.minWidth + random() * (top - band.minWidth)))];
          for (const filter of FILTERS) {
            const where = `${profile} ${count} cards ${filter} ${band.key}`;
            const pool = cards.filter((card) => matches(card, filter));
            const { sig, variants } = cache[band.key].filters[filter];
            assert.equal(sig, poolSignature(pool), `${where}: signature`);
            assert.ok(variants.length >= LAYOUT_CACHE_MIN_VARIANTS && variants.length <= LAYOUT_CACHE_MAX_VARIANTS, `${where}: ${variants.length} variants`);
            for (const [v, entries] of variants.entries()) {
              assert.deepEqual(entries.map((entry) => Math.floor(entry / 8)).sort((x, y) => x - y), pool.map((card) => cards.indexOf(card)), `${where} v${v}: every pool card once`);
              for (const layoutViewportWidth of widths) {
                const layout = replayLayout({ entries, cards, layoutViewportWidth, filter });
                assert.ok(layout, `${where} v${v} ${layoutViewportWidth}px: replay null`);
                const check = verifyLayout(layout);
                assert.ok(check.ok, `${where} v${v} ${layoutViewportWidth}px: ${check.errors.slice(0, 3)}`);
                assert.ok(check.maxCrop <= CROP_CAP + 1e-6, `${where} v${v}: crop ${check.maxCrop}`);
                // Phone band: every card is one column, wide or not (owner O8).
                if (band.columns < 3) assert.ok(layout.placements.every((placement) => placement.width === 1), `${where} v${v}: 2-column card on the phone band`);
                else assert.ok(layout.placements.every((placement) => placement.width === 1 || isWideMedia(placement.card.media)), `${where} v${v}: non-wide card spans 2 columns`);
              }
            }
            // The runtime fallback (cache miss, signature mismatch) must also be hole free for the same pool.
            assert.ok(verifyLayout(stackLayout({ order: pool, layoutViewportWidth: band.refWidth, filter })).ok, `${where}: stackLayout`);
          }
        }
      }
    } finally {
      console.warn = realWarn;
    }
  });
}
