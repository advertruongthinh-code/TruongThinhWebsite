import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../../src/search/worker.mjs";

const call = (path, method = "POST") => worker.fetch(new Request(`https://x.test${path}`, { method }), {});

const assertHeaders = (res) => {
  assert.equal(res.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
};

test("POST /api/search is unavailable until the real search ships", async () => {
  const res = await call("/api/search");
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { status: "unavailable" });
  assertHeaders(res);
});

test("other /api/* paths are not found", async () => {
  const res = await call("/api/khac");
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { status: "not_found" });
  assertHeaders(res);
});

test("GET /api/search is method_not_allowed", async () => {
  const res = await call("/api/search", "GET");
  assert.equal(res.status, 405);
  assert.deepEqual(await res.json(), { status: "method_not_allowed" });
  assertHeaders(res);
});
