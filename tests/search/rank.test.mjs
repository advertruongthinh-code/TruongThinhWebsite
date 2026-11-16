import assert from "node:assert/strict";
import test from "node:test";
import { keywordOnly, rankSearch, suggestProducts } from "../../src/search/rank.mjs";

const config = {
  weights: { text: { sText: 0.45, sMedia: 0.35, k: 0.2 }, image: { sText: 0.3, sMedia: 0.7 } },
  groupTextWeight: 0.3,
  threshold: 0.42,
  keywordMin: 0.4,
};
const catalogOrder = ["a1", "a2", "a3", "a4", "a5", "b1", "b2", "b3", "b4", "b5", "s1", "s2", "c1", "c2", "d1", "d2", "d3", "d4"];
const productOf = (id) => `product-${id[0]}`;
const scores = (map) => catalogOrder.map((id) => [id, ...(map[id] ?? [0, 0])]);
const image = (map) => ({ kind: "image", scores: scores(map) });
const text = (map) => ({ kind: "text", scores: scores(map) });
const rank = (inputs, keyword = new Map()) => rankSearch({ inputs, keyword, config, catalogOrder, productOf });

test("two unrelated images and an unmatched text: two groups interleaved, text unmatched", () => {
  const out = rank([
    text({ a1: [0.1, 0.1] }),
    image({ a1: [0, 0.9], a2: [0, 0.8], a3: [0, 0.7] }),
    image({ a1: [0, 0.9], b1: [0, 0.8], b2: [0, 0.7] }),
  ]);
  assert.deepEqual(out.unmatched, [0]);
  assert.deepEqual(out.groups.map((g) => g.inputIdx), [[1], [2]]);
  assert.deepEqual(out.ids, ["a1", "a2", "b1", "a3", "b2"]);
  assert.deepEqual(out.groups.map((g) => g.ids), [["a1", "a2", "a3"], ["a1", "b1", "b2"]]);
});

test("cards past the top 5 of both groups lead, by mean group score", () => {
  const strong = (prefix) => Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`${prefix}${n}`, [0, 0.9]]));
  const out = rank([
    image({ ...strong("a"), s2: [0, 0.7], s1: [0, 0.8] }),
    image({ ...strong("b"), s2: [0, 0.7], s1: [0, 0.8] }),
  ]);
  assert.equal(out.groups.length, 2);
  assert.deepEqual(out.ids.slice(0, 4), ["s1", "s2", "a1", "b1"]);
  assert.equal(out.ids.length, 12);
});

test("equal scores keep catalog order", () => {
  const out = rank([text({ d3: [1, 1], a2: [1, 1], c1: [1, 1] })]);
  assert.deepEqual(out.ids, ["a2", "c1", "d3"]);
});

test("inputs A-B and B-C link into one group through B", () => {
  const out = rank([
    image({ a1: [0, 0.9], a2: [0, 0.8], b1: [0, 0.7] }),
    image({ a1: [0, 0.9], a2: [0, 0.8], c1: [0, 0.8], c2: [0, 0.8], b2: [0, 0.7] }),
    image({ c1: [0, 0.9], c2: [0, 0.8], d1: [0, 0.7] }),
  ]);
  assert.equal(out.groups.length, 1);
  assert.deepEqual(out.groups[0].inputIdx, [0, 1, 2]);
  assert.deepEqual(new Set(out.ids), new Set(["a1", "a2", "b1", "b2", "c1", "c2", "d1"]));
});

test("a single shared card does not link inputs", () => {
  const out = rank([image({ a1: [0, 0.9], a2: [0, 0.8] }), image({ a1: [0, 0.9], b1: [0, 0.8] })]);
  assert.equal(out.groups.length, 2);
});

test("text-only group scores with keyword K; missing K counts as 0", () => {
  const input = text({ a1: [0.9, 0.7], a2: [0.9, 0.7], a3: [0, 0] });
  const noK = rank([input]);
  assert.deepEqual(noK.ids, ["a1", "a2"]);
  const withK = rank([input], new Map([["a2", 1], ["a3", 1]]));
  assert.deepEqual(withK.ids, ["a2", "a1"]);
});

test("a card with only keyword score stays under the threshold", () => {
  const out = rank([text({ a1: [0, 0] })], new Map([["a1", 1]]));
  assert.deepEqual(out, { ids: [], groups: [], unmatched: [0] });
});

test("group score mixes text 0.3 and best image 0.7; the threshold applies again", () => {
  const order = ["p", "q", "t", "u"];
  const rows = (map) => order.map((id) => [id, ...(map[id] ?? [0, 0])]);
  const out = rankSearch({
    inputs: [
      { kind: "text", scores: rows({ p: [1, 1], q: [0.9, 0.9], t: [0.7, 0.7] }) },
      { kind: "image", scores: rows({ p: [0, 1], q: [0, 0.9], u: [0, 0.9] }) },
    ],
    keyword: new Map(),
    config,
    catalogOrder: order,
    productOf,
  });
  assert.equal(out.groups.length, 1);
  assert.deepEqual(out.groups[0].inputIdx, [0, 1]);
  assert.deepEqual(out.ids, ["p", "q", "u"]);
});

test("no card reaches the threshold", () => {
  assert.deepEqual(rank([text({ a1: [0.2, 0.2] }), image({})]), { ids: [], groups: [], unmatched: [0, 1] });
});

test("a score of exactly 0.42 passes despite float error", () => {
  assert.deepEqual(rank([image({ a1: [0, 0.6] })]).ids, ["a1"]);
});

test("group name is the most common product in the first 5 cards; ties go to the earlier card", () => {
  const out = rank([text({ a1: [1, 1], b1: [0.99, 1], b2: [0.98, 1], a2: [0.97, 1], c1: [0.96, 1], c2: [0.95, 1] })]);
  assert.deepEqual(out.ids, ["a1", "b1", "b2", "a2", "c1", "c2"]);
  assert.equal(out.groups[0].name, "product-a");
  const out2 = rank([text({ b1: [1, 1], a1: [0.99, 1], a2: [0.98, 1], b2: [0.97, 1], d1: [0.96, 1] })]);
  assert.equal(out2.groups[0].name, "product-b");
});

test("suggestProducts: needs 3 products, returns at most 4 by card count", () => {
  assert.deepEqual(suggestProducts({ ids: ["a1", "a2", "b1", "b2"] }, productOf), []);
  const ids = ["a1", "b1", "b2", "c1", "c2", "c3", "d1", "d2", "e1"];
  assert.deepEqual(suggestProducts({ ids }, (id) => id[0]), ["c", "b", "d", "a"]);
});

test("keywordOnly: K at or above keywordMin, by K then catalog order", () => {
  const keyword = new Map([["a3", 0.4], ["a1", 1], ["b1", 0.39], ["c1", 0.4], ["zz", 1]]);
  assert.deepEqual(keywordOnly(keyword, catalogOrder, config), ["a1", "a3", "c1"]);
});

test("no inputs, and ids missing from catalogOrder, do not break ranking", () => {
  assert.deepEqual(rank([]), { ids: [], groups: [], unmatched: [] });
  const out = rankSearch({
    inputs: [{ kind: "image", scores: [["x", 0, 0.9], ["y", 0, 0.9], ["a1", 0, 0.9]] }],
    config, catalogOrder: ["a1"], productOf,
  });
  assert.deepEqual(out.ids, ["a1", "x", "y"]);
});

test("sharing cards only below the top 5 does not link inputs", () => {
  const strong = (prefix) => Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`${prefix}${n}`, [0, 0.95]]));
  const out = rank([image({ ...strong("a"), s1: [0, 0.8], s2: [0, 0.8] }), image({ ...strong("b"), s1: [0, 0.8], s2: [0, 0.8] })]);
  assert.equal(out.groups.length, 2);
});

test("group name: tie between products that do not include the first card's product", () => {
  const out = rank([text({ a1: [1, 1], b1: [0.9, 1], b2: [0.9, 1], c1: [0.8, 1], c2: [0.8, 1] })]);
  assert.equal(out.groups[0].name, "product-b");
});

test("top 5 ignores the threshold: an input with 1 passing card links through below-threshold cards", () => {
  const out = rank([
    image({ a1: [0, 0.9], a2: [0, 0.5], a3: [0, 0.5] }),
    image({ b1: [0, 0.9], a2: [0, 0.5], a3: [0, 0.5] }),
  ]);
  assert.equal(out.groups.length, 1);
  assert.deepEqual(out.groups[0].inputIdx, [0, 1]);
  assert.deepEqual(out.ids, ["a1", "b1"]);
});

test("zero-score cards never link inputs", () => {
  const out = rank([image({ a1: [0, 0.9] }), image({ b1: [0, 0.9] })]);
  assert.equal(out.groups.length, 2);
});
