// Masonry layout cache, visitor side (plan T3): replay result shape, rejection cases, stack fallback.
import assert from "node:assert/strict";
import { test } from "node:test";
import { compileMasonryLayout } from "../../src/site/masonry/layout.mjs";
import { packBand, LAYOUT_BANDS } from "../../src/site/masonry/packer.mjs";
import { poolSignature, replayLayout, stackLayout, variantIndex, verifyLayout } from "../../src/site/masonry/replay.mjs";

const card = (id, width, height) => ({ id, category: "c", sourceOrder: Number(id.slice(1)), media: { src: `/${id}.jpg`, width, height } });
// 12 cards, 2 of them wide; packed on 4:35 so the replay crosses at least one trimmed or levelled pair.
const RATIOS = [[100, 150], [100, 80], [2000, 1000], [100, 130], [100, 100], [100, 170], [100, 90], [1800, 1000], [100, 140], [100, 75], [100, 120], [100, 110]];
const cards = RATIOS.map(([w, h], i) => card(`a${i}`, w, h));
const encode = (entries) => entries.map(({ card: entry, column, span }) => cards.indexOf(entry) * 8 + (span === 1 ? column : 4 + column));
const entries = encode(packBand(cards, LAYOUT_BANDS[4]).entries);

test("replay returns the layout shape runtime reads, with 2-column wide cards and no holes", () => {
  const layout = replayLayout({ entries, cards, layoutViewportWidth: 1440 });
  const reference = compileMasonryLayout({ layoutViewportWidth: 1440, cards: [], categoryOrder: [] });
  for (const field of ["columns", "outer", "interCardGap", "availableWidth", "gridWidth", "cardWidth", "settings", "spacing"]) {
    assert.deepEqual(layout[field], reference[field], field);
  }
  assert.deepEqual(layout.holes, []);
  assert.equal(layout.diagnostics.source, "cache");
  assert.equal(layout.placements.filter(({ width }) => width === 2).length, 2);
  assert.ok(layout.placements.every((p, i) => p.index === i && p.captionPixelHeight === 0 && p.pixelHeight === p.mediaPixelHeight));
  assert.match(layout.coordinateHash, /^[0-9a-f]{8}$/);
  assert.ok(verifyLayout(layout).ok);
});

test("replay rejects variants that do not fit the catalog or the grid", () => {
  const replay = (patch, at = 1440, list = cards) => replayLayout({ entries: patch, cards: list, layoutViewportWidth: at });
  assert.equal(replay(entries.slice(1)), null, "missing card");
  assert.equal(replay([...entries, entries[0]]), null, "duplicate card");
  assert.equal(replay([...entries, 99 * 8]), null, "index outside the catalog");
  const three = encode(packBand(cards, LAYOUT_BANDS[1]).entries);
  assert.ok(replay(three, 800));
  assert.equal(replay(three.map((entry) => (entry & 7) >= 4 ? (entry & ~7) + 6 : entry), 800), null, "code 6 on a 3-column grid");
  assert.equal(replay(entries.map((entry) => (entry & 7) >= 4 ? entry : (entry & ~7) + 4)), null, "2-column card that is not wide");
  const narrowed = cards.map((entry) => (entry.media.width >= 1618 ? card(entry.id, 100, 100) : entry));
  assert.equal(replay(entries, 1440, narrowed), null, "cache of another catalog");
  assert.notEqual(poolSignature(narrowed), poolSignature(cards));
});

test("stackLayout puts every card in one column without holes", () => {
  for (const width of [384, 768, 1440]) {
    const layout = stackLayout({ order: cards, layoutViewportWidth: width });
    assert.equal(layout.diagnostics.source, "stack");
    assert.ok(layout.placements.every(({ width: span }) => span === 1));
    assert.equal(layout.placements.length, cards.length);
    assert.ok(verifyLayout(layout).ok);
  }
});

test("verifyLayout catches a hole and an over-cap trim", () => {
  const layout = replayLayout({ entries, cards, layoutViewportWidth: 1440 });
  const moved = { ...layout, placements: layout.placements.map((p, i) => (i === 5 ? { ...p, y: p.y + 4 } : p)) };
  assert.equal(verifyLayout(moved).ok, false);
  const cut = { ...layout, placements: layout.placements.map((p, i) => (i === 0 ? { ...p, mediaBleed: p.mediaPixelHeight * 0.06 } : p)) };
  assert.equal(verifyLayout(cut).ok, false);
});

test("variantIndex is stable per seed and inside the variant count", () => {
  assert.equal(variantIndex("seed-1", 20), variantIndex("seed-1", 20));
  for (let i = 0; i < 100; i += 1) assert.ok(variantIndex(`s${i}`, 8) < 8);
});
