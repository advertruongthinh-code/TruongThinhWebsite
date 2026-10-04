// Checkpoint A report: organic score and fallback reasons for uniform and hard pools.
// Run: node tests/site/advertising-solver-report.mjs
import { ADVERTISING_CARDS, ADVERTISING_CATEGORIES } from "../../src/site/advertising-products/catalog.mjs";
import { compileAdvertisingProductLayout } from "../../src/site/advertising-products/layout-core.mjs";
import { shuffleWithSeed } from "../../src/site/advertising-products/random-order.mjs";
import { inspectAdvertisingGrid } from "./advertising-grid-oracle.mjs";

const fixture = (name, count, ratios) => Array.from({ length: count }, (_, index) => {
  const [width, height] = ratios[index % ratios.length];
  return { id: `${name}-${index}`, category: name, sourceOrder: index, rank: index, tagIds: [],
    media: { src: `/${name}-${index}.webp`, width, height, altVi: "", altEn: "" } };
});
const pools = [
  ["uniform-square-24", fixture("uniform-square-24", 24, [[1, 1]])],
  ["uniform-portrait-24", fixture("uniform-portrait-24", 24, [[3, 4]])],
  ["uniform-landscape-24", fixture("uniform-landscape-24", 24, [[4, 3]])],
  ["hard-1", fixture("hard-1", 1, [[1, 30]])],
  ["hard-2", fixture("hard-2", 2, [[1, 30], [30, 1]])],
  ["hard-3", fixture("hard-3", 3, [[1, 30], [30, 1], [1, 1]])],
  ["hard-extreme-100", fixture("hard-extreme-100", 100, [[3, 4], [4, 3], [1, 30], [30, 1], [1, 1], [5, 7]])],
  ...["all", ...ADVERTISING_CATEGORIES.map(({ slug }) => slug)].map(slug => [`catalog-${slug}`,
    ADVERTISING_CARDS, slug]),
];
const rows = [];
for (const [name, cards, filter = cards[0].category] of pools) {
  for (const width of [320, 390, 768, 1440, 2560]) {
    for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
      const pool = filter === "all" ? cards : cards.filter(card => card.category === filter);
      const presentationOrder = shuffleWithSeed(pool, seed, `grid:${filter}`).map(({ id }) => id);
      let row = { name, width, seed, n: pool.length };
      try {
        const layout = compileAdvertisingProductLayout({ cards, categoryOrder: [...new Set(cards.map(card => card.category))],
          filter, layoutViewportWidth: width, presentationOrder, organicOrder: true });
        const d = layout.diagnostics;
        row = { ...row, valid: inspectAdvertisingGrid({ layout, placements: layout.placements }).valid,
          score: d.organicRhythm.actual.score, target: d.organicRhythm.actual.targetMet,
          organicFallback: d.organicRhythm.fallbackReason, staggerFallback: d.fallbackUsed ? d.fallbackReason : null,
          ops: d.operations };
      } catch (error) {
        row.error = error.diagnostic?.code || error.message;
      }
      rows.push(row);
    }
  }
}
const summary = new Map();
for (const row of rows) {
  const s = summary.get(row.name) || { n: row.n, runs: 0, invalid: 0, errors: 0, minScore: Infinity, maxScore: -Infinity, maxOps: 0, target: {}, organic: {}, stagger: {} };
  s.runs += 1;
  if (row.error) { s.errors += 1; summary.set(row.name, s); continue; }
  if (!row.valid) s.invalid += 1;
  s.minScore = Math.min(s.minScore, row.score);
  s.maxScore = Math.max(s.maxScore, row.score);
  s.maxOps = Math.max(s.maxOps, row.ops);
  for (const [key, value] of [["target", row.target], ["organic", row.organicFallback], ["stagger", row.staggerFallback]]) {
    s[key][String(value)] = (s[key][String(value)] || 0) + 1;
  }
  summary.set(row.name, s);
}
console.table([...summary].map(([name, s]) => ({ name, n: s.n, runs: s.runs, invalid: s.invalid, errors: s.errors,
  score: `${s.minScore}..${s.maxScore}`, maxOps: s.maxOps, target: JSON.stringify(s.target),
  organic: JSON.stringify(s.organic), stagger: JSON.stringify(s.stagger) })));
if (rows.some(row => row.error || !row.valid)) process.exitCode = 1;
