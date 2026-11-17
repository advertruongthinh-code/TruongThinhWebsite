import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildInputs, fitAnchors, quantile, rng, summarize } from "../../scripts/search/calibrate.mjs";
import { buildAdvertisingArtifact } from "../../src/site/advertising-products/catalog.mjs";
import { DIMS } from "../../src/search/embed-input.mjs";
import { decodeIndex, encodeIndex, unit } from "../../src/search/index-format.mjs";

const fixture = JSON.parse(await readFile(new URL("fixtures/queries.json", import.meta.url), "utf8"));

test("fixture has the R11 query mix and every reference resolves to cards", async () => {
  const count = (type) => fixture.filter((q) => q.type === type).length;
  assert.deepEqual(["keyword", "chat", "typo", "mixed", "en"].map(count), [40, 15, 15, 10, 15]);
  assert.equal(new Set(fixture.map((q) => q.id)).size, fixture.length);
  const queries = await buildInputs(fixture, buildAdvertisingArtifact(), async () => "QUJD");
  for (const q of queries) {
    assert.equal(q.inputs.length, (q.text ? 1 : 0) + (q.images?.length ?? 0), q.id);
    assert.ok(q.inputs.every((input) => input.expect.size > 0), q.id);
  }
});

test("quantile interpolates and rng is seeded", () => {
  assert.equal(quantile([3, 1, 2, 4, 5], 0.5), 3);
  assert.equal(quantile([0, 10], 0.95), 9.5);
  const [a, b] = [rng(7), rng(7)];
  assert.deepEqual([a(), a()], [b(), b()]);
});

test("fitAnchors puts lo at wrong pairs and hi at right pairs", () => {
  const axis = (i) => Array.from({ length: DIMS }, (_, n) => (n === i ? 1 : n === 9 ? 0.2 : 0));
  const { meta, bin } = encodeIndex([0, 1, 2].map((i) => ({ id: `c${i}`, text: axis(i), media: [axis(i)] })));
  const index = decodeIndex(meta, bin.buffer);
  const queries = [{ inputs: [{ kind: "text", vec: unit(axis(0)), expect: new Set(["c0"]) }] }];
  const anchors = fitAnchors(queries, index);
  const [lo, hi] = anchors["text-text"];
  assert.ok(lo < 0.1 && hi > 0.9, JSON.stringify(anchors));
});

test("summarize gates on every type and overall P@5", () => {
  const r = (type, hit, p5) => ({ type, hit, p5 });
  assert.equal(summarize([r("a", true, 1), r("b", true, 0.8)]).pass, true);
  assert.equal(summarize([r("a", true, 1), r("b", false, 1)]).pass, false);
});
