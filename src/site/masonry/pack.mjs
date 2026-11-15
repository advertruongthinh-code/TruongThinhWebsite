//# allFunctionsCalledOnLoad
// V8 compile hint (see layout.mjs): the first grid pack, on the main thread for the 2:15 band, does not compile lazily.
// Masonry packer: places one card order on one width band with no holes; wide cards span two columns, trimming at most CROP_CAP.
// Pure, no DOM: the grid Workers run one candidate each from 3 columns; the main thread runs the 2:15 band and Worker failures.
import { canSpanTwoColumns, filterRank, layoutMedia, matchesFilter, scoreOrganicRhythm } from "./layout.mjs";
import { shuffleWithSeed } from "./random-order.mjs";
import { CROP_CAP, TRAIL, replayLayout } from "./replay.mjs";

// One stored layout serves a whole band: column bottoms are linear in card width, so checking both band ends covers it.
// Widths are viewport widths; cw values are the card widths at the band ends (rounded outward) and at the scoring width.
export const LAYOUT_BANDS = Object.freeze([
  { key: "2:15", columns: 2, gap: 15, minWidth: 280, maxWidth: 719, refWidth: 390, cwMin: 117.5, cwMax: 337, cwRef: 172.5 },
  { key: "3:15", columns: 3, gap: 15, minWidth: 720, maxWidth: 960, refWidth: 768, cwMin: 220, cwMax: 293.34, cwRef: 229.33 },
  { key: "3:25", columns: 3, gap: 25, minWidth: 961, maxWidth: 1004, refWidth: 982, cwMin: 287, cwMax: 301.34, cwRef: 294 },
  { key: "4:25", columns: 4, gap: 25, minWidth: 1005, maxWidth: 1200, refWidth: 1024, cwMin: 220, cwMax: 268.75, cwRef: 224.75 },
  { key: "4:35", columns: 4, gap: 35, minWidth: 1201, maxWidth: Infinity, refWidth: 1440, cwMin: 256.5, cwMax: Infinity, cwRef: 316.25 },
].map(Object.freeze));
const PARTNER_WINDOW = 12;
const MAX_PARTNERS = 3;
const MAX_DEFER = 20;
const TAIL_GUARD = 12;

const inv = (card) => {
  const media = layoutMedia(card);
  return media.height / media.width;
};
const at = (column, cw) => column.a * cw + column.k;

// Packs one base order on one band. Column bottoms are kept as a * cw + k so every check holds for the whole band.
export function packBand(cards, band, { rankOf } = {}) {
  const { columns, gap, cwMin, cwMax, cwRef } = band;
  const isWide = (card) => canSpanTwoColumns(columns, layoutMedia(card));
  const cols = Array.from({ length: columns }, () => ({ a: 0, k: 0, n: 0, trail: [] }));
  const entries = [], demoted = [];
  let maxCrop = 0;
  const lowest = () => cols.reduce((low, column, index) => (at(column, cwRef) < at(cols[low], cwRef) - 1e-9 ? index : low), 0);
  const push = (column, h) => {
    column.k += column.n ? gap : 0;
    column.a += h;
    column.n += 1;
    column.trail.push(h);
    if (column.trail.length > TRAIL) column.trail.shift();
  };
  const putSingle = (card, column) => {
    push(cols[column], inv(card));
    entries.push({ card, column, span: 1 });
  };
  // Trim share needed at card width cw: d / (cw * S); for the open band use the limit da / S.
  const share = (da, dk, S, cw) => (S <= 0 ? (Math.abs(da) < 1e-12 && Math.abs(dk) < 1e-9 ? 0 : Infinity) : cw === Infinity ? Math.abs(da) / S : Math.abs(da * cw + dk) / (cw * S));
  // The longer column must stay longer across the band (trim only shrinks, plan P4).
  const nonNegative = (da, dk) => (cwMax === Infinity ? da >= -1e-12 : da * cwMax + dk >= -1e-9) && da * cwMin + dk >= -1e-9;

  // deep: also try three partners. Only on a wide card's first attempt: retrying the 3-partner search on every deferred
  // card made a few orders take 450-630 ms on 4 columns (cloud, 2026-11-15) for one or two fewer demotions.
  const tryWide = (wide, queue, deep) => {
    const singles = [];
    let headRank;
    for (let i = 0; i < queue.length && singles.length < PARTNER_WINDOW; i += 1) {
      if (isWide(queue[i])) continue;
      if (rankOf) {
        headRank ??= rankOf(queue[i]);
        if (rankOf(queue[i]) !== headRank) break;
      }
      singles.push(i);
    }
    let best = null;
    // Allocation-free: this runs thousands of times per pack. Same arithmetic, order and tie-break (strict <) as simulating
    // push() on copies of the two columns, so the result is bit-identical.
    const heights = singles.map((i) => inv(queue[i]));
    const sideA = [0, 0, 0], sideK = [0, 0, 0], sideN = [0, 0], added = [[0, 0, 0], [0, 0, 0]], addedN = [0, 0];
    const trailSum = (column, side) => {
      const trail = column.trail, length = trail.length + addedN[side];
      let sum = 0;
      for (let index = Math.max(0, length - TRAIL); index < length; index += 1) sum += index < trail.length ? trail[index] : added[side][index - trail.length];
      return sum;
    };
    // picks: up to three (x = index in singles, k = 0 left / 1 right) as flat arguments.
    const consider = (left, count, x0, k0, x1, k1, x2, k2) => {
      const c0 = cols[left], c1 = cols[left + 1];
      sideA[0] = c0.a; sideK[0] = c0.k; sideN[0] = c0.n; addedN[0] = 0;
      sideA[1] = c1.a; sideK[1] = c1.k; sideN[1] = c1.n; addedN[1] = 0;
      let maxI = 0;
      for (let p = 0; p < count; p += 1) {
        const x = p === 0 ? x0 : p === 1 ? x1 : x2, side = p === 0 ? k0 : p === 1 ? k1 : k2, h = heights[x];
        sideK[side] += sideN[side] ? gap : 0;
        sideA[side] += h;
        sideN[side] += 1;
        added[side][addedN[side]++] = h;
        maxI = Math.max(maxI, singles[x]);
      }
      if ((sideN[0] === 0) !== (sideN[1] === 0)) return;
      for (let ref = 0; ref < 2; ref += 1) {
        const longer = 1 - ref;
        const da = sideA[longer] - sideA[ref], dk = sideK[longer] - sideK[ref], S = trailSum(cols[left + longer], longer);
        if (!nonNegative(da, dk)) continue;
        const crop = Math.max(share(da, dk, S, cwMin), share(da, dk, S, cwMax));
        if (crop > CROP_CAP + 1e-9) continue;
        // Least trim first, then fewest and nearest moved cards (owner O3: reorder before trimming).
        const cost = crop + 0.004 * count + 0.0002 * maxI;
        if (!best || cost < best.cost) {
          const picks = [[x0, k0], [x1, k1], [x2, k2]].slice(0, count).map(([x, k]) => ({ i: singles[x], k }));
          best = { left, picks, ref, cost, crop };
        }
      }
    };
    // Exact prune: cost >= 0.004 * count + 0.0002 * singles[last] (crop >= 0, singles ascending, IEEE addition is monotonic) and a
    // candidate replaces best only when strictly cheaper, so once this bound reaches best.cost no later pick in the loop can win.
    const beaten = (count, x) => best !== null && 0.004 * count + 0.0002 * singles[x] >= best.cost;
    const tryPartners = (left, n) => {
      const m = singles.length;
      if (n === 0) consider(left, 0);
      if (n === 1) for (let x = 0; x < m && !beaten(1, x); x += 1) for (let k = 0; k < 2; k += 1) consider(left, 1, x, k);
      if (n === 2) for (let x = 0; x < m; x += 1) for (let y = x + 1; y < m && !beaten(2, y); y += 1) for (let b = 0; b < 4; b += 1) consider(left, 2, x, b & 1, y, (b >> 1) & 1);
      if (n === 3) for (let x = 0; x < m; x += 1) for (let y = x + 1; y < m; y += 1) for (let z = y + 1; z < m && !beaten(3, z); z += 1) for (let b = 0; b < 8; b += 1) consider(left, 3, x, b & 1, y, (b >> 1) & 1, z, (b >> 2) & 1);
    };
    // Up to two partners on every pair first; three only when nothing fits (the costliest search).
    for (let left = 0; left < columns - 1; left += 1) for (let n = 0; n < MAX_PARTNERS; n += 1) tryPartners(left, n);
    if (!best && deep) for (let left = 0; left < columns - 1; left += 1) tryPartners(left, MAX_PARTNERS);
    if (!best) return false;
    const { left, picks, ref, crop } = best;
    const picked = picks.map((pick) => ({ card: queue[pick.i], column: left + pick.k, i: pick.i }));
    picked.slice().sort((x, y) => y.i - x.i).forEach((pick) => queue.splice(pick.i, 1));
    picked.forEach((pick) => putSingle(pick.card, pick.column));
    const base = cols[left + ref], h = inv(wide);
    const a = base.a + 2 * h, k = base.k + (base.n ? gap : 0) + gap * h;
    for (const index of [left, left + 1]) Object.assign(cols[index], { a, k, n: cols[index].n + 1, trail: [] });
    entries.push({ card: wide, column: left, span: 2 });
    maxCrop = Math.max(maxCrop, crop);
    return true;
  };

  const queue = cards.slice();
  // No wide card in the last positions: it would have no partners left to level its pair.
  const guard = Math.min(TAIL_GUARD, queue.length >> 1), tail = queue.length - guard;
  for (let i = queue.length - 1; i >= tail; i -= 1) {
    if (!isWide(queue[i])) continue;
    const [card] = queue.splice(i, 1);
    queue.splice(Math.max(0, tail - (guard >> 1)), 0, card);
  }
  let waiting = null, age = 0;
  while (queue.length || waiting) {
    if (!waiting) {
      const card = queue.shift();
      if (isWide(card)) waiting = card;
      else putSingle(card, lowest());
      continue;
    }
    if (tryWide(waiting, queue, age === 0)) {
      waiting = null;
      age = 0;
      continue;
    }
    const next = queue.findIndex((card) => !isWide(card));
    if (next < 0 || age >= MAX_DEFER) {
      demoted.push(waiting.id);
      putSingle(waiting, lowest());
      waiting = null;
      age = 0;
      continue;
    }
    putSingle(queue.splice(next, 1)[0], lowest());
    age += 1;
  }
  return { entries, demoted, maxCrop };
}

// Bottom edges that line up with the nearest bottom in the right-hand column (within 10% of the taller card).
export function staggerViolations(layout) {
  const edges = Array.from({ length: layout.columns }, () => []);
  for (const p of layout.placements) for (let column = p.left; column < p.left + p.width; column += 1) edges[column].push(p);
  let violations = 0;
  for (let column = 0; column < layout.columns - 1; column += 1) {
    for (const p of edges[column]) {
      if (p.width === 2 && p.left === column) continue;
      const bottom = p.y + p.pixelHeight;
      let near = null;
      for (const q of edges[column + 1]) {
        if (q === p) continue;
        const d = Math.abs(q.y + q.pixelHeight - bottom);
        if (!near || d < near.d) near = { d, q };
      }
      if (near && near.d < 0.1 * Math.max(p.pixelHeight, near.q.pixelHeight)) violations += 1;
    }
  }
  return violations;
}

// Fixed number of base orders the visitor packs per filter and band, keeping the best (plan C2): one order alone left about 1 in 5
// orders off the organic rhythm and demoted wide cards on 4 columns; four brought stagger back to the old build cache level. A
// count, never a time budget, so a slow phone draws the same grid as a fast one and Back returns to it.
export const LIVE_CANDIDATES = 4;
const compareScore = (x, y) => x.demoted - y.demoted || x.organicMiss - y.organicMiss || x.stagger - y.stagger || x.crop - y.crop || x.s - y.s;

// A visit's card order for one filter: shuffled by seed and scope, then stably sorted by rank (taxonomy R1). Shared by the
// packer's candidates and the runtime's one-column fallback.
export const seededOrder = (items, seed, scope, rankOf) => shuffleWithSeed(items, seed, scope).sort((x, y) => rankOf(x) - rankOf(y));

// The part of a filter's cards the packer needs, small enough to post to the Worker: i = index in cards.
export const livePool = (cards, filter) => cards.flatMap((card, i) => {
  if (!matchesFilter(card, filter)) return [];
  const { width, height } = layoutMedia(card);
  return [{ i, id: card.id, media: { width, height }, rank: filterRank(card, filter) }];
});

// One base order s of a filter pool packed on one band for a visit seed. pool: { i, id, media, rank } in catalog order, i = index in
// the caller's cards. The same input always gives the same candidate.
export function packCandidate({ pool, band, seed, filter }, s) {
  const at = new Map(pool.map((card, j) => [card, j]));
  const order = seededOrder(pool, seed, `grid:${filter}:${s}`, (card) => card.rank);
  const packed = packBand(order, band, { rankOf: (card) => card.rank });
  const local = packed.entries.map(({ card, column, span }) => at.get(card) * 8 + (span === 1 ? column : 4 + column));
  const layout = replayLayout({ entries: local, cards: pool, layoutViewportWidth: band.refWidth, hash: false });
  return {
    s, demoted: packed.demoted.length, organicMiss: scoreOrganicRhythm(order).targetMet === false ? 1 : 0,
    stagger: layout ? staggerViolations(layout) : Infinity, crop: packed.maxCrop,
    entries: local.map((entry) => pool[entry >> 3].i * 8 + (entry & 7)),
  };
}

// Entries (i * 8 + code, the replayLayout format) of the best candidate.
export const bestEntries = (candidates) => candidates.reduce((best, candidate) => (compareScore(candidate, best) < 0 ? candidate : best)).entries;

export const packLive = (job) => bestEntries(Array.from({ length: LIVE_CANDIDATES }, (_, s) => packCandidate(job, s)));
