// Disk memo of buildLayoutCache (plan T7): a hit skips the 15 s build, any change to cards or filters misses, CI never reads it.
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { buildLayoutCacheMemo, layoutCacheMemoKey } from "../../scripts/site/layout-cache-memo.mjs";
import { filterRank, matchesFilter } from "../../src/site/masonry/layout.mjs";

const card = (id, width, height) => ({ id, category: "c", sourceOrder: Number(id.slice(1)), media: { src: `/${id}.jpg`, width, height } });
const cards = [card("a1", 100, 150), card("a2", 100, 80), card("a3", 2000, 1000), card("a4", 100, 120)];
const args = (extra = {}) => ({ cards, filters: ["all"], datasetVersion: "memo", rankOf: filterRank, matches: matchesFilter, ...extra });
const withDir = (run) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "layout-memo-"));
  try { return run(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};

test("a second call reads the memo and returns the same cache", () => withDir((dir) => {
  const first = buildLayoutCacheMemo(args(), { enabled: true, dir });
  assert.equal(readdirSync(dir).length, 1);
  const second = buildLayoutCacheMemo(args({ rankOf: () => { throw new Error("built again"); } }), { enabled: true, dir });
  assert.deepEqual(second, first);
}));

test("changed cards, filters or dataset version use another key", () => {
  const key = layoutCacheMemoKey(args());
  assert.equal(key, layoutCacheMemoKey(args()));
  assert.notEqual(key, layoutCacheMemoKey(args({ cards: [...cards, card("a5", 100, 100)] })));
  assert.notEqual(key, layoutCacheMemoKey(args({ cards: [card("a1", 100, 151), ...cards.slice(1)] })));
  assert.notEqual(key, layoutCacheMemoKey(args({ filters: ["all", "c"] })));
  assert.notEqual(key, layoutCacheMemoKey(args({ datasetVersion: "other" })));
});

test("disabled (CI) neither reads nor writes the memo", () => withDir((dir) => {
  buildLayoutCacheMemo(args(), { enabled: false, dir });
  assert.deepEqual(readdirSync(dir), []);
}));

test("a missing memo file is rebuilt", () => withDir((dir) => {
  buildLayoutCacheMemo(args(), { enabled: true, dir });
  const [file] = readdirSync(dir);
  rmSync(path.join(dir, file));
  assert.ok(buildLayoutCacheMemo(args(), { enabled: true, dir })["4:35"]);
  assert.equal(readdirSync(dir).length, 1);
}));
