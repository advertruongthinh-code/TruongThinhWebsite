// Build-side half of the masonry layout cache: searches card orders per filter and keeps the best 8 to 32 variants.
// Only the build (and later the CMS admin page) loads this file; public pages replay the result with replay.mjs.
import { scoreOrganicRhythm } from "./layout.mjs";
import { shuffleWithSeed } from "./random-order.mjs";
import { LAYOUT_BANDS, packBand, staggerViolations } from "./pack.mjs";
import { CROP_CAP, bandKey, poolSignature, replayLayout, verifyLayout } from "./replay.mjs";

export { CROP_CAP, bandKey, poolSignature };

// Widest viewport the build self-check replays for the open-ended band (card width 956.25).
const CHECK_MAX_WIDTH = 4000;
export const LAYOUT_CACHE_MIN_VARIANTS = 8;
export const LAYOUT_CACHE_MAX_VARIANTS = 32;
export const STAGGER_SLACK = 1.25;
export const LAYOUT_CACHE_CANDIDATES = 128;

const FILTER_ID = /^[a-z0-9/-]+$/;
const compareScore = (x, y) => x.demoted - y.demoted || x.organicMiss - y.organicMiss || x.stagger - y.stagger || x.crop - y.crop || x.s - y.s;

// -> { [bandKey]: { band, filters: { [filter]: { sig, variants: number[][] } } } }; throws when a kept layout fails its replay check.
export function buildLayoutCache({ cards, filters, datasetVersion, rankOf, matches }) {
  const index = new Map(cards.map((card, i) => [card, i]));
  const cache = Object.fromEntries(LAYOUT_BANDS.map((band) => [band.key, { band: band.key, filters: {} }]));
  for (const filter of filters) {
    if (!FILTER_ID.test(filter)) throw new Error(`layout-cache: invalid filter id ${filter}`);
    const pool = cards.filter((card) => matches(card, filter));
    const rank = (card) => rankOf(card, filter);
    const candidates = [];
    for (let s = 0; s < LAYOUT_CACHE_CANDIDATES; s += 1) {
      const order = shuffleWithSeed(pool, `layout:${datasetVersion}`, `${filter}:${s}`).sort((x, y) => rank(x) - rank(y));
      const candidate = { s, demoted: 0, organicMiss: scoreOrganicRhythm(order).targetMet === false ? 1 : 0, stagger: 0, crop: 0, bands: {}, warnings: [] };
      for (const band of LAYOUT_BANDS) {
        const packed = packBand(order, band, { rankOf: rank });
        const entries = packed.entries.map(({ card, column, span }) => index.get(card) * 8 + (span === 1 ? column : 4 + column));
        const layout = replayLayout({ entries, cards, layoutViewportWidth: band.refWidth, filter });
        if (!layout) throw new Error(`layout-cache: replay failed ${filter} ${band.key} seed ${s}`);
        candidate.demoted += packed.demoted.length;
        candidate.stagger += staggerViolations(layout);
        candidate.crop = Math.max(candidate.crop, packed.maxCrop);
        candidate.bands[band.key] = entries;
        for (const id of packed.demoted) candidate.warnings.push(`layout-cache: demoted ${filter} ${band.key} ${id}`);
      }
      candidate.key = JSON.stringify(candidate.bands);
      candidates.push(candidate);
    }
    candidates.sort(compareScore);
    const eighth = candidates[LAYOUT_CACHE_MIN_VARIANTS - 1];
    const kept = [], keys = new Set();
    for (const [i, candidate] of candidates.entries()) {
      if (kept.length >= LAYOUT_CACHE_MAX_VARIANTS) break;
      // Past the minimum only clean, distinct, nearly as staggered variants (owner O7, O9).
      if (i >= LAYOUT_CACHE_MIN_VARIANTS && (candidate.demoted || keys.has(candidate.key) || candidate.stagger > STAGGER_SLACK * eighth.stagger + 1e-9)) continue;
      kept.push(candidate);
      keys.add(candidate.key);
    }
    for (const candidate of kept) {
      for (const warning of candidate.warnings) console.warn(warning);
      for (const band of LAYOUT_BANDS) {
        for (const layoutViewportWidth of [band.minWidth, band.refWidth, Math.min(band.maxWidth, CHECK_MAX_WIDTH)]) {
          const layout = replayLayout({ entries: candidate.bands[band.key], cards, layoutViewportWidth, filter });
          const check = layout && verifyLayout(layout);
          if (!check?.ok) throw new Error(`layout-cache: self-check failed ${filter} ${band.key} ${layoutViewportWidth}px seed ${candidate.s}: ${check ? check.errors.slice(0, 3).join("; ") : "replay null"}`);
        }
      }
    }
    const sig = poolSignature(pool);
    for (const band of LAYOUT_BANDS) cache[band.key].filters[filter] = { sig, variants: kept.map((candidate) => candidate.bands[band.key]) };
  }
  return cache;
}
