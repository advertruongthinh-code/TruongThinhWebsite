import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { run } from "../../scripts/search/build-index.mjs";
import { DIMS, documentText, mediaInput, modelRequest, readVectors } from "../../src/search/embed-input.mjs";
import { decodeIndex, encodeIndex, quantize, unit } from "../../src/search/index-format.mjs";

const fakeVec = (seed) => Array.from({ length: DIMS }, (_, i) => Math.sin(seed * 31 + i));
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);

test("quantize keeps cosine within 1%", () => {
  const [a, b] = [fakeVec(1), fakeVec(2)];
  const { q, s } = quantize(a);
  const approx = s * dot(Array.from(q), unit(b));
  assert.ok(Math.abs(approx - dot(unit(a), unit(b))) < 0.01);
});

test("encodeIndex and decodeIndex round-trip rows", () => {
  const { meta, bin } = encodeIndex([
    { id: "a", text: fakeVec(1), media: [fakeVec(2), fakeVec(3)] },
    { id: "b", text: fakeVec(4), media: [] },
  ]);
  assert.equal(bin.length, 4 * DIMS);
  const { cards } = decodeIndex(meta, bin.buffer);
  assert.deepEqual(cards.map((c) => [c.id, c.media.length]), [["a", 2], ["b", 0]]);
  assert.deepEqual(Array.from(cards[0].media[1].q), Array.from(quantize(fakeVec(3)).q));
  assert.equal(cards[1].ts, quantize(fakeVec(4)).s);
});

const artifact = {
  products: [{ id: "p1", labelVi: "Bảng hiệu", labelEn: "Signs" }],
  clusters: [{ id: "c1", labelVi: "Biển", labelEn: "Boards" }],
  tagRegistry: [{ id: "p1", group: "product", labelVi: "Bảng hiệu", labelEn: "Signs" }, { id: "t2", group: "format", labelVi: "Ngang", labelEn: "Wide" }],
  cards: ["x", "y"].map((id, n) => ({
    id, titleVi: `T ${id}`, titleEn: "T", descriptionVi: "D", descriptionEn: "E", productIds: ["p1"], clusterIds: ["c1"], tagIds: ["p1", "t2"],
    mediaItems: [
      { kind: "image", src: `/${id}-1.webp`, altVi: "a1", altEn: "b1" },
      { kind: "video", src: "/v.mp4", ...(n === 0 && { posterSrc: "/v.jpg" }), altVi: "a2", altEn: "b2" },
    ],
  })),
};

test("documentText and request shapes", () => {
  assert.equal(documentText(artifact.cards[0], artifact),
    "title: T x | text: D | T | E | a1 | a2 | b1 | b2 | Bảng hiệu | Signs | Biển | Boards | Bảng hiệu | Signs");
  const req = modelRequest(["q", mediaInput({}, "AAA")]);
  assert.equal(req.dimensions, DIMS);
  assert.deepEqual(req.messages[1][0].content, [{ type: "image_url", image_url: { url: "data:image/jpeg;base64,AAA" } }]);
  assert.throws(() => readVectors({ data: [{ embedding: [1, 2] }] }, 1), /dims/);
});

const okFetch = (calls) => async (_url, init) => {
  const n = JSON.parse(init.body).messages.length;
  calls.push(n);
  return { ok: true, json: async () => ({ result: { data: Array.from({ length: n }, (_, i) => ({ embedding: fakeVec(i + 1) })) } }) };
};

test("run indexes every card, video via posterSrc, skipping a video without one", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "idx-"));
  const calls = [];
  const env = { CLOUDFLARE_API_TOKEN: "t", CLOUDFLARE_ACCOUNT_ID: "a" };
  const out = await run({ fetch: okFetch(calls), env, artifact, outDir, readImage: async () => "AAA" });
  assert.equal(out.status, "ok");
  assert.equal(out.meta.cards.length, 2);
  assert.deepEqual(out.meta.cards.map((c) => c.media.length), [2, 1]);
  assert.equal(calls.reduce((a, b) => a + b), 5);
  assert.equal((await readFile(`${outDir}/advertising-index.bin`)).length, 5 * DIMS);
});

test("run retries a failed call then succeeds", async () => {
  let failures = 2;
  const inner = okFetch([]);
  const fetch = async (...args) => (failures-- > 0 ? { ok: false, status: 500 } : inner(...args));
  const env = { CLOUDFLARE_API_TOKEN: "t", CLOUDFLARE_ACCOUNT_ID: "a" };
  const waits = [];
  const sleep = async (ms) => waits.push(ms);
  const out = await run({ fetch, env, artifact, outDir: await mkdtemp(join(tmpdir(), "idx-")), readImage: async () => "AAA", sleep });
  assert.equal(out.status, "ok");
  assert.deepEqual(waits, [1000, 2000]);
});

test("run writes unavailable on missing token or persistent failure", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "idx-"));
  assert.equal((await run({ env: {}, artifact, outDir })).status, "unavailable");
  assert.equal(JSON.parse(await readFile(`${outDir}/advertising-index.json`)).status, "unavailable");
  const env = { CLOUDFLARE_API_TOKEN: "t", CLOUDFLARE_ACCOUNT_ID: "a" };
  let calls = 0;
  const fetch = async () => (calls++, { ok: false, status: 403 });
  const waits = [];
  const out = await run({ fetch, env, artifact, outDir, readImage: async () => "AAA", sleep: async (ms) => waits.push(ms) });
  assert.equal(out.status, "unavailable");
  assert.deepEqual(waits, [1000, 2000, 4000]);
  assert.equal(calls, 4); // 1 call + 3 retries, then the other workers stop
});

test("run throws on duplicate card id", async () => {
  const env = { CLOUDFLARE_API_TOKEN: "t", CLOUDFLARE_ACCOUNT_ID: "a" };
  const dup = { ...artifact, cards: [artifact.cards[0], artifact.cards[0]] };
  await assert.rejects(run({ env, artifact: dup, outDir: tmpdir() }), /duplicate card id/);
});
