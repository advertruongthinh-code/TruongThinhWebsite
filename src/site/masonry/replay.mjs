// Visitor-side half of the masonry layout cache: places cards from a precomputed variant in one O(n) pass, no search.
// The build-side packer (packer.mjs) imports the shared constants from here; this file must never import packer.mjs.
import {
  MASONRY_LAYOUT_VERSION,
  columnsForWidth,
  comparePlacement,
  coordinateKey,
  fnv1a32,
  isWideMedia,
  layoutMedia,
  masonrySpacing,
  matchesFilter,
  normalizeMasonrySettings,
  placementAt,
} from "./layout.mjs";

// Max share of a card's media height the trim may remove (owner O3 step 2).
export const CROP_CAP = 0.05;
// Cards at the bottom of a column whose media share the trim under a wide card.
export const TRAIL = 3;

export const variantIndex = (seed, count) => fnv1a32(String(seed)) % count;

// Width band of a stored layout: one per (columns, gap) pair; the runtime picks its cache file by it.
export const bandKey = (layoutViewportWidth) => `${columnsForWidth(layoutViewportWidth)}:${masonrySpacing(layoutViewportWidth).interCardGap}`;

// Identity of a filter pool: a cache built for another catalog or another card size must not replay.
export const poolSignature = (poolCards) => fnv1a32(poolCards.map((card) => {
  const media = layoutMedia(card);
  return `${card.id}:${media.width}:${media.height}`;
}).join("|")).toString(16).padStart(8, "0");

function frame(layoutViewportWidth) {
  const columns = columnsForWidth(layoutViewportWidth);
  const { outer, interCardGap } = masonrySpacing(layoutViewportWidth);
  const availableWidth = layoutViewportWidth - 2 * outer;
  return { columns, outer, interCardGap, availableWidth, cardWidth: (availableWidth - interCardGap * (columns - 1)) / columns };
}

function result(f, placed, columnBottoms, { layoutViewportWidth, filter, settings, source }) {
  const placementOrder = placed.map((placement) => placement.card.id);
  const placements = placed.slice().sort(comparePlacement).map(({ cavity, natural, ...placement }, index) => ({ ...placement, index }));
  const totalPixelHeight = Math.max(0, ...columnBottoms);
  const coordinateHash = fnv1a32(`${MASONRY_LAYOUT_VERSION}:${source}:${filter}:${layoutViewportWidth}:${f.columns}:${placementOrder.join(",")}:${coordinateKey(placements) || "empty"}`).toString(16).padStart(8, "0");
  return {
    columns: f.columns, filter, settings: normalizeMasonrySettings(settings), outer: f.outer, interCardGap: f.interCardGap, spacing: { outer: f.outer, interCardGap: f.interCardGap },
    availableWidth: f.availableWidth, gridWidth: f.availableWidth, cardWidth: f.cardWidth, placements, holes: [], initialColumnBottoms: Array(f.columns).fill(0),
    columnBottoms: columnBottoms.slice(), totalHeight: totalPixelHeight, totalPixelHeight, coordinateHash,
    diagnostics: { algorithm: MASONRY_LAYOUT_VERSION, source, placementOrder, operations: 0 },
  };
}

// entries: cardIndex * 8 + code; code 0-3 = one column at that column, 4-6 = two columns starting at code - 4.
// Returns null when the variant does not fit this catalog or geometry; the caller then uses stackLayout.
export function replayLayout({ entries, cards, layoutViewportWidth, filter = "all", settings }) {
  if (!Array.isArray(entries) || !Array.isArray(cards)) return null;
  const f = frame(layoutViewportWidth);
  const { columns, interCardGap: gap, cardWidth } = f;
  const bottoms = Array(columns).fill(0), count = Array(columns).fill(0), trail = Array.from({ length: columns }, () => []);
  const placed = [], seen = new Set();
  for (const entry of entries) {
    const card = cards[entry >> 3], code = entry & 7;
    if (!Number.isInteger(entry) || entry < 0 || !card || seen.has(card) || !matchesFilter(card, filter)) return null;
    seen.add(card);
    if (code < 4) {
      if (code >= columns) return null;
      const p = placementAt(card, code, 1, count[code] ? bottoms[code] + gap : 0, cardWidth, gap);
      p.natural = p.mediaPixelHeight;
      placed.push(p);
      bottoms[code] = p.y + p.pixelHeight;
      count[code] += 1;
      trail[code].push(p);
      if (trail[code].length > TRAIL) trail[code].shift();
      continue;
    }
    const left = code - 4;
    if (columns < 3 || left + 1 >= columns || !isWideMedia(layoutMedia(card))) return null;
    const longer = bottoms[left] > bottoms[left + 1] ? left : left + 1, ref = 2 * left + 1 - longer;
    const d = bottoms[longer] - bottoms[ref];
    if (d > 1e-9) {
      const S = trail[longer].reduce((sum, p) => sum + p.natural, 0);
      if (S <= 0 || d > (CROP_CAP + 1e-6) * S) return null;
      // Trim every trail card by the same share, top to bottom, so the column keeps its gaps.
      let shift = 0;
      for (const p of trail[longer]) {
        const cut = d * p.natural / S;
        p.y -= shift;
        p.top = p.y;
        p.height -= cut;
        p.pixelHeight -= cut;
        p.mediaPixelHeight -= cut;
        p.mediaBleed = cut;
        shift += cut;
      }
      bottoms[longer] -= d;
    }
    const p = placementAt(card, left, 2, count[ref] ? bottoms[ref] + gap : 0, cardWidth, gap);
    p.natural = p.mediaPixelHeight;
    placed.push(p);
    for (const column of [left, left + 1]) {
      bottoms[column] = p.y + p.pixelHeight;
      count[column] += 1;
      trail[column] = [];
    }
  }
  if (cards.reduce((n, card) => n + (matchesFilter(card, filter) ? 1 : 0), 0) !== seen.size) return null;
  return result(f, placed, bottoms, { layoutViewportWidth, filter, settings, source: "cache" });
}

// Fallback for the whole grid (owner O3 last step): every card one column, in `order` (card objects), into the lowest column.
export function stackLayout({ order, layoutViewportWidth, filter = "all", settings }) {
  const f = frame(layoutViewportWidth);
  const bottoms = Array(f.columns).fill(0), count = Array(f.columns).fill(0);
  const placed = order.map((card) => {
    const column = bottoms.indexOf(Math.min(...bottoms));
    const p = placementAt(card, column, 1, count[column] ? bottoms[column] + f.interCardGap : 0, f.cardWidth, f.interCardGap);
    bottoms[column] = p.y + p.pixelHeight;
    count[column] += 1;
    return p;
  });
  return result(f, placed, bottoms, { layoutViewportWidth, filter, settings, source: "stack" });
}

// Build and test check, not called at runtime: no holes, exact gaps, trim within the cap, wide cards on adjacent columns.
// tolerance: px a column may drift; the DOM test passes 0.05 because inline styles carry two decimals.
export function verifyLayout(layout, { tolerance = 0.01 } = {}) {
  const { columns, interCardGap: gap, placements } = layout;
  const errors = [];
  let maxCrop = 0;
  const byColumn = Array.from({ length: columns }, () => []);
  for (const p of placements) {
    if (p.left < 0 || p.left + p.width > columns) errors.push(`${p.card.id}: columns ${p.left}+${p.width} outside ${columns}`);
    for (let column = p.left; column < Math.min(columns, p.left + p.width); column += 1) byColumn[column].push(p);
    const crop = (p.mediaBleed ?? 0) / (p.mediaPixelHeight + (p.mediaBleed ?? 0));
    maxCrop = Math.max(maxCrop, crop);
    if (crop > CROP_CAP + 1e-6) errors.push(`${p.card.id}: crop ${(100 * crop).toFixed(2)}%`);
  }
  byColumn.forEach((list, column) => list.sort((a, b) => a.y - b.y).forEach((p, i) => {
    const expected = i ? list[i - 1].y + list[i - 1].pixelHeight + gap : 0;
    if (Math.abs(p.y - expected) > tolerance) errors.push(`${p.card.id}: column ${column} off by ${(p.y - expected).toFixed(3)}px`);
  }));
  return { ok: errors.length === 0, errors, maxCrop };
}
