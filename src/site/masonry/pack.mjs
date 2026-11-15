// Masonry packer: places one card order on one width band with no holes; wide cards span two columns, trimming at most CROP_CAP.
// Pure, no DOM: the visitor's layout Worker runs it (packLive) for every band; the main thread only when the Worker fails.
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
    const consider = (left, picks) => {
      const sim = [left, left + 1].map((index) => ({ ...cols[index], trail: cols[index].trail.slice() }));
      for (const pick of picks) push(sim[pick.k], inv(queue[pick.i]));
      if ((sim[0].n === 0) !== (sim[1].n === 0)) return;
      for (const ref of [0, 1]) {
        const longer = sim[1 - ref], base = sim[ref];
        const da = longer.a - base.a, dk = longer.k - base.k, S = longer.trail.reduce((sum, h) => sum + h, 0);
        if (!nonNegative(da, dk)) continue;
        const crop = Math.max(share(da, dk, S, cwMin), share(da, dk, S, cwMax));
        if (crop > CROP_CAP + 1e-9) continue;
        // Least trim first, then fewest and nearest moved cards (owner O3: reorder before trimming).
        const cost = crop + 0.004 * picks.length + 0.0002 * Math.max(0, ...picks.map((pick) => pick.i));
        if (!best || cost < best.cost) best = { left, picks, ref, cost, crop };
      }
    };
    const tryPartners = (left, n) => {
      if (n === 0) consider(left, []);
      if (n === 1) for (const i of singles) for (const k of [0, 1]) consider(left, [{ i, k }]);
      if (n === 2) for (let x = 0; x < singles.length; x += 1) for (let y = x + 1; y < singles.length; y += 1) for (let m = 0; m < 4; m += 1) consider(left, [{ i: singles[x], k: m & 1 }, { i: singles[y], k: (m >> 1) & 1 }]);
      if (n === 3) for (let x = 0; x < singles.length; x += 1) for (let y = x + 1; y < singles.length; y += 1) for (let z = y + 1; z < singles.length; z += 1) for (let m = 0; m < 8; m += 1) consider(left, [{ i: singles[x], k: m & 1 }, { i: singles[y], k: (m >> 1) & 1 }, { i: singles[z], k: (m >> 2) & 1 }]);
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
  const layout = replayLayout({ entries: local, cards: pool, layoutViewportWidth: band.refWidth });
  return {
    s, demoted: packed.demoted.length, organicMiss: scoreOrganicRhythm(order).targetMet === false ? 1 : 0,
    stagger: layout ? staggerViolations(layout) : Infinity, crop: packed.maxCrop,
    entries: local.map((entry) => pool[entry >> 3].i * 8 + (entry & 7)),
  };
}

// Entries (i * 8 + code, the replayLayout format) of the best candidate.
export const bestEntries = (candidates) => candidates.reduce((best, candidate) => (compareScore(candidate, best) < 0 ? candidate : best)).entries;

export const packLive = (job) => bestEntries(Array.from({ length: LIVE_CANDIDATES }, (_, s) => packCandidate(job, s)));
