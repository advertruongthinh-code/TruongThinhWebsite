import assert from "node:assert/strict";
import { test } from "node:test";
import { DIMS } from "../../src/search/embed-input.mjs";
import { decodeIndex, encodeIndex } from "../../src/search/index-format.mjs";
import { jpegSize } from "../../src/search/jpeg.mjs";
import { normalize, scoreInput } from "../../src/search/score.mjs";

const fakeVec = (seed) => Array.from({ length: DIMS }, (_, i) => Math.sin(seed * 31 + i));

// Each import gets its own module scope, so the per-isolate index cache starts empty.
let fresh = 0;
const loadWorker = async () => (await import(`../../src/search/worker.mjs?fresh=${fresh++}`)).default;

// SOI, a 16-byte APP0, then SOF0 with the given size; padded to `bytes`.
const jpeg = (width, height, bytes = 1000) => {
  const out = new Uint8Array(bytes);
  out.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], 0);
  out.set([0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03], 20);
  return out;
};
const b64 = (bytes) => Buffer.from(bytes).toString("base64");
const IMG = b64(jpeg(768, 512));

const makeIndex = (cards) => {
  const { meta, bin } = encodeIndex(cards);
  return { meta, bin: bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) };
};
const CARDS = [
  { id: "a", text: fakeVec(1), media: [fakeVec(2), fakeVec(3), fakeVec(4)] },
  { id: "b", text: fakeVec(5), media: [fakeVec(6)] },
  { id: "c", text: fakeVec(7), media: [] },
];

const makeEnv = ({ index = makeIndex(CARDS), status = "ok", ai, limit } = {}) => {
  const calls = { assets: 0, ai: [], limit: [] };
  const env = {
    ASSETS: {
      async fetch(url) {
        calls.assets++;
        if (url.endsWith(".json")) return Response.json(status === "ok" ? index.meta : { status });
        return new Response(index.bin);
      },
    },
    AI: {
      async run(model, request) {
        calls.ai.push(request);
        if (ai) return ai(request);
        const n = (request.input ?? request.messages).length;
        return { data: Array.from({ length: n }, (_, i) => ({ embedding: fakeVec(request.input ? 1 : 2 + i) })) };
      },
    },
  };
  const limiter = (name) => ({
    async limit({ key }) {
      calls.limit.push([name, key]);
      return { success: limit?.[name] ?? true };
    },
  });
  env.SEARCH_TEXT_LIMIT = limiter("text");
  env.SEARCH_IMAGE_LIMIT = limiter("image");
  return { env, calls };
};

const post = (worker, env, body, headers = {}) =>
  worker.fetch(
    new Request("https://x.test/api/search", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "CF-Connecting-IP": "203.0.113.9", ...headers },
    }),
    env,
  );

const assertHeaders = (res) => {
  assert.equal(res.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
};

test("other /api/* paths are not found and GET is not allowed", async () => {
  const worker = await loadWorker();
  const missing = await worker.fetch(new Request("https://x.test/api/khac", { method: "POST" }), {});
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { status: "not_found" });
  assertHeaders(missing);
  const get = await worker.fetch(new Request("https://x.test/api/search"), {});
  assert.equal(get.status, 405);
  assert.deepEqual(await get.json(), { status: "method_not_allowed" });
  assertHeaders(get);
});

test("text plus two images: one input call, one messages call, a score row per card per input", async () => {
  const worker = await loadWorker();
  const { env, calls } = makeEnv();
  const res = await post(worker, env, { text: "hộp đèn tay vẫy", images: [IMG, IMG] });
  assert.equal(res.status, 200);
  assertHeaders(res);
  const data = await res.json();
  assert.equal(data.status, "ok");
  assert.deepEqual(data.inputs.map((input) => input.kind), ["text", "image", "image"]);
  for (const input of data.inputs) {
    assert.deepEqual(input.scores.map(([id]) => id), ["a", "b", "c"]);
    for (const row of input.scores) {
      assert.equal(row.length, 3);
      for (const x of row.slice(1)) assert.ok(x >= 0 && x <= 1);
    }
  }
  assert.equal(calls.ai.length, 2);
  // The two calls run in parallel, so their order is not part of the contract.
  const [textCall, imageCall] = [calls.ai.find((c) => c.input), calls.ai.find((c) => c.messages)];
  assert.deepEqual(textCall.input, ["task: search result | query: hộp đèn tay vẫy"]);
  assert.equal(imageCall.messages.length, 2);
  assert.deepEqual(imageCall.messages[0][0].content, [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${IMG}` } }]);
  assert.deepEqual(calls.limit, [["image", "203.0.113.9"]]);
});

test("one kind of input makes one model call; text is trimmed and cut to 300 chars", async () => {
  const worker = await loadWorker();
  const { env, calls } = makeEnv();
  assert.equal((await post(worker, env, { text: `  ${"x".repeat(400)}  ` })).status, 200);
  assert.equal(calls.ai.length, 1);
  assert.equal(calls.ai[0].input[0], `task: search result | query: ${"x".repeat(300)}`);
  assert.deepEqual(calls.limit, [["text", "203.0.113.9"]]);
  assert.equal((await post(worker, env, { images: [IMG] })).status, 200);
  assert.equal(calls.ai.length, 2);
  assert.ok(calls.ai[1].messages);
});

test("malformed bodies are 400", async () => {
  const worker = await loadWorker();
  const { env, calls } = makeEnv();
  const png = b64(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const bad = [
    "{not json",
    "[]",
    "null",
    {},
    { text: "   " },
    { text: 5 },
    { images: "x" },
    { images: [IMG, IMG, IMG, IMG, IMG, IMG] },
    { images: [png] },
    { images: [5] },
    { images: ["@@@@"] },
    { images: [b64(jpeg(769, 100))] },
    { images: [b64(jpeg(100, 0))] },
    { images: [b64(jpeg(768, 768, 301 * 1024))] },
  ];
  for (const body of bad) {
    const res = await post(worker, env, body);
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 60));
    assert.deepEqual(await res.json(), { status: "bad_request" });
  }
  assert.equal((await post(worker, env, { images: [b64(jpeg(768, 768, 300 * 1024))] })).status, 200);
  assert.equal(calls.ai.length, 1);
});

test("bodies over 2.2 MB are 413 by header, by length or as a stream without Content-Length", async () => {
  const worker = await loadWorker();
  const { env, calls } = makeEnv();
  assert.equal((await post(worker, env, { text: "a" }, { "content-length": "2200001" })).status, 413);
  const chunk = new Uint8Array(1_000_000).fill(0x61);
  let sent = 0;
  const stream = new ReadableStream({ pull(c) { if (sent++ < 10) c.enqueue(chunk); else c.close(); } });
  const streamed = await worker.fetch(new Request("https://x.test/api/search", { method: "POST", body: stream, duplex: "half" }), env);
  assert.equal(streamed.status, 413);
  assert.ok(sent <= 4, `read ${sent} chunks`);
  const res = await post(worker, env, { text: "a".repeat(2_200_001) });
  assert.equal(res.status, 413);
  assert.deepEqual(await res.json(), { status: "too_large" });
  assert.equal(calls.ai.length, 0);
});

test("rate limited requests are 429 before the model runs; a missing limiter is skipped", async () => {
  const worker = await loadWorker();
  const { env, calls } = makeEnv({ limit: { image: false } });
  const res = await post(worker, env, { images: [IMG] }, { "CF-Connecting-IP": "" });
  assert.equal(res.status, 429);
  assert.deepEqual(await res.json(), { status: "rate_limited" });
  assert.deepEqual(calls.limit, [["image", "unknown"]]);
  assert.equal((await post(worker, env, { text: "a" })).status, 200);
  delete env.SEARCH_IMAGE_LIMIT;
  assert.equal((await post(worker, env, { images: [IMG] })).status, 200);
});

test("unavailable index, model errors and short model output are 503", async () => {
  const unavailable = makeEnv({ status: "unavailable" });
  let res = await post(await loadWorker(), unavailable.env, { text: "a" });
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { status: "unavailable" });
  assert.equal(unavailable.calls.ai.length, 0);

  const throws = makeEnv({ ai: () => { throw new Error("boom"); } });
  res = await post(await loadWorker(), throws.env, { text: "a" });
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { status: "model_error" });

  const short = makeEnv({ ai: () => ({ data: [{ embedding: fakeVec(1) }] }) });
  res = await post(await loadWorker(), short.env, { images: [IMG, IMG] });
  assert.equal(res.status, 503);
});

test("the index is fetched once per isolate and nothing is logged", async (t) => {
  const worker = await loadWorker();
  const { env, calls } = makeEnv();
  const logged = [];
  for (const name of ["log", "info", "warn", "error", "debug"]) t.mock.method(console, name, (...args) => logged.push(args));
  await post(worker, env, { text: "a", images: [IMG] });
  await post(worker, env, { text: "b" });
  await post(worker, env, "{bad");
  assert.equal(calls.assets, 2);
  assert.deepEqual(logged, []);
});

test("scoreInput uses the anchor pair of its kind and averages the two best media", () => {
  const q = fakeVec(2);
  const unitQ = q.map((x) => x / Math.hypot(...q));
  const { meta, bin } = makeIndex(CARDS);
  const decoded = decodeIndex(meta, bin);
  // Text pairs would score everything 0, so a kind mix-up fails.
  const anchors = { "image-text": [0.2, 0.9], "image-image": [-0.5, 1], "text-text": [5, 6], "text-image": [5, 6] };
  const cos = ({ q: v, s: k }) => k * v.reduce((sum, x, i) => sum + x * unitQ[i], 0);
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const [a, b, c] = scoreInput(unitQ, "image", decoded, anchors);
  const media = decoded.cards[0].media.map((m) => normalize(cos(m), anchors["image-image"])).sort((x, y) => y - x);
  assert.equal(a[1], r3(normalize(cos({ q: decoded.cards[0].text, s: decoded.cards[0].ts }), anchors["image-text"])));
  assert.equal(a[2], r3((media[0] + media[1]) / 2));
  assert.equal(b[2], r3(normalize(cos(decoded.cards[1].media[0]), anchors["image-image"])));
  assert.equal(c[2], 0);
  assert.equal(normalize(2, [0, 1]), 1);
  assert.equal(normalize(0.5, [0.25, 0.75]), 0.5);
  assert.equal(normalize(-1, [0, 1]), 0);
  assert.equal(normalize(0.5, [0.4, 0.4]), 0);
});

test("jpegSize reads SOF0-2 and skips fill bytes; rejects other data", () => {
  assert.deepEqual(jpegSize(jpeg(640, 480)), { width: 640, height: 480 });
  const progressive = jpeg(10, 20);
  progressive[21] = 0xc2;
  assert.deepEqual(jpegSize(progressive), { width: 10, height: 20 });
  const fill = new Uint8Array(1000);
  fill.set(jpeg(10, 20).subarray(0, 20), 0);
  fill[20] = 0xff;
  fill.set(jpeg(10, 20).subarray(20, 40), 21);
  assert.deepEqual(jpegSize(fill), { width: 10, height: 20 });
  const sos = jpeg(10, 20);
  sos[21] = 0xda;
  assert.equal(jpegSize(sos), null);
  assert.equal(jpegSize(Uint8Array.from([0x89, 0x50, 0x4e, 0x47])), null);
  assert.equal(jpegSize(jpeg(10, 20).subarray(0, 25)), null);
});

// Owner report 2026-11-17: the same query gave different results; a repeated text query now reuses its vector.
test("a repeated text query reuses its vector for 5 minutes; images always call the model", async (t) => {
  const worker = await loadWorker();
  const { env, calls } = makeEnv();
  const post = (body) => worker.fetch(new Request("https://x/api/search", { method: "POST", body: JSON.stringify(body) }), env);
  const first = await (await post({ text: "hộp đèn" })).json();
  const second = await (await post({ text: "hộp đèn" })).json();
  assert.deepEqual(second, first);
  assert.equal(calls.ai.length, 1);
  await post({ text: "chữ nổi" });
  assert.equal(calls.ai.length, 2);
  await post({ images: [IMG] });
  await post({ images: [IMG] });
  assert.equal(calls.ai.length, 4);
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() + 5 * 60_000 + 1 });
  await post({ text: "hộp đèn" });
  assert.equal(calls.ai.length, 5);
});
