// reorder (CMS plan part 2 K11, E11) on D1 seeded from the repo content.
import assert from "node:assert/strict";
import test from "node:test";
import { seededEnv } from "./worker-env.mjs";

const idsOf = (t, type) => t.all("SELECT id FROM records WHERE type = ? AND status != 'trashed' ORDER BY position, id", type).map((row) => row.id);
const positions = (t, type) => t.all("SELECT id, position FROM records WHERE type = ? ORDER BY id", type);

test("reorder writes the new order in one batch, list follows it, version stays, build and audit follow", async () => {
  const t = seededEnv();
  t.DB.sqlite.prepare("INSERT INTO settings VALUES ('cron_at', ?)").run(new Date().toISOString());
  const ids = idsOf(t, "project");
  const versions = t.all("SELECT id, version, updated_at FROM records WHERE type = 'project' ORDER BY id");
  const wanted = [ids[2], ids[0], ids[1], ...ids.slice(3)].reverse();
  const reply = await t.call("reorder", { type: "project", ids: wanted });
  assert.equal(reply.status, 200, JSON.stringify(reply.body));
  const listed = await t.call("list", undefined, "?type=project");
  assert.deepEqual(listed.body.items.map((item) => item.id), wanted);
  assert.deepEqual(t.all("SELECT id, version, updated_at FROM records WHERE type = 'project' ORDER BY id"), versions);
  assert.deepEqual(t.one("SELECT position FROM records WHERE type = 'project' AND id = ?", wanted[0]), { position: 1024 });
  assert.deepEqual(t.audits(), ["reorder ok"]);
  assert.equal(t.one("SELECT value FROM settings WHERE key = 'content_rev'").value, "1");
  assert.ok(t.one("SELECT value FROM settings WHERE key = 'last_save_at'"));
  // The build is wanted for Cron, which is alive, so the command itself sent nothing.
  assert.equal(t.one("SELECT value FROM settings WHERE key = 'build_wanted'").value, "1");
  assert.equal(t.waits.length, 0);
});

test("a record trashed between the read and the batch makes the batch write nothing: 409 stale", async () => {
  const t = seededEnv();
  const ids = idsOf(t, "project");
  const before = positions(t, "project");
  const batch = t.DB.batch;
  t.DB.batch = async (statements) => {
    t.DB.sqlite.prepare("UPDATE records SET status = 'trashed', prev_status = 'published', trashed_at = 'x' WHERE type = 'project' AND id = ?").run(ids[0]);
    return batch(statements);
  };
  const reply = await t.call("reorder", { type: "project", ids: [...ids].reverse() });
  assert.equal(reply.status, 409);
  assert.deepEqual(positions(t, "project"), before);
  assert.deepEqual(t.audits(), ["reorder 409 stale"]);
  for (const key of ["content_rev", "build_wanted", "last_save_at"]) assert.equal(t.one("SELECT value FROM settings WHERE key = ?", key), undefined, key);
});

test("a set that differs from the current one is 409 stale and writes nothing but the refusal row", async () => {
  const t = seededEnv();
  const ids = idsOf(t, "client-logo");
  const before = positions(t, "client-logo");
  for (const wrong of [ids.slice(1), [...ids.slice(1), "not-a-logo"]]) {
    const reply = await t.call("reorder", { type: "client-logo", ids: wrong });
    assert.equal(reply.status, 409);
    assert.deepEqual(reply.body, { error: "stale" });
  }
  assert.deepEqual(positions(t, "client-logo"), before);
  assert.deepEqual(t.audits(), ["reorder 409 stale", "reorder 409 stale"]);
  assert.equal(t.one("SELECT value FROM settings WHERE key = 'content_rev'"), undefined);
});

test("a trashed record is not part of the set", async () => {
  const t = seededEnv();
  const ids = idsOf(t, "client-logo");
  assert.equal((await t.call("trash", { type: "client-logo", id: ids[0] })).status, 200);
  assert.equal((await t.call("reorder", { type: "client-logo", ids })).status, 409);
  assert.equal((await t.call("reorder", { type: "client-logo", ids: ids.slice(1).reverse() })).status, 200);
});

test("news, repeated ids and a missing or extra scope are 400", async () => {
  const t = seededEnv();
  const ids = idsOf(t, "project");
  assert.deepEqual((await t.call("reorder", { type: "news", ids: idsOf(t, "news") })).body, { error: "type" });
  assert.equal((await t.call("reorder", { type: "project", ids: [...ids, ids[0]] })).status, 400);
  assert.equal((await t.call("reorder", { type: "project", ids, scope: "x" })).status, 400);
  assert.equal((await t.call("reorder", { type: "advertising-card", ids: idsOf(t, "advertising-card") })).status, 400);
  assert.equal((await t.call("reorder", { type: "advertising-card", scope: "no/such-product", ids: [] })).status, 400);
});

test("an empty list for a type without records is 200", async () => {
  const t = seededEnv({ seed: false });
  assert.equal((await t.call("reorder", { type: "hero-slide", ids: [] })).status, 200);
});

test("advertising cards are ordered within one product, in the positions that product already holds", async () => {
  const t = seededEnv();
  const scope = "signage/light-boxes";
  const cards = () => t.all("SELECT id, position FROM records WHERE type = 'advertising-card' AND json_extract(data, '$.productIds[0]') = ? ORDER BY position", scope);
  const before = cards();
  const others = t.all("SELECT id, position FROM records WHERE type = 'advertising-card' AND json_extract(data, '$.productIds[0]') != ? ORDER BY id", scope);
  const wanted = before.map((row) => row.id).reverse();
  assert.equal((await t.call("reorder", { type: "advertising-card", scope, ids: wanted })).status, 200);
  assert.deepEqual(cards().map((row) => row.id), wanted);
  assert.deepEqual(cards().map((row) => row.position), before.map((row) => row.position));
  assert.deepEqual(t.all("SELECT id, position FROM records WHERE type = 'advertising-card' AND json_extract(data, '$.productIds[0]') != ? ORDER BY id", scope), others);
  assert.equal((await t.call("reorder", { type: "advertising-card", scope, ids: wanted.slice(1) })).status, 409);
});

test("a reorder of drafts only wants no build and leaves last_save_at alone", async () => {
  const t = seededEnv();
  t.DB.sqlite.exec("UPDATE records SET status = 'draft' WHERE type = 'client-logo'");
  assert.equal((await t.call("reorder", { type: "client-logo", ids: idsOf(t, "client-logo").reverse() })).status, 200);
  await Promise.all(t.waits);
  for (const key of ["build_wanted", "last_save_at", "dispatch_error:ci.yml"]) assert.equal(t.one("SELECT value FROM settings WHERE key = ?", key), undefined, key);
});

test("paused publishing: reorder still writes and never calls GitHub", async () => {
  const t = seededEnv();
  t.DB.sqlite.exec("INSERT INTO settings VALUES ('publish_paused', '1')");
  t.env.GITHUB_ACTIONS_TOKEN = "token";
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return new Response(null, { status: 204 }); };
  try {
    assert.equal((await t.call("reorder", { type: "project", ids: idsOf(t, "project").reverse() })).status, 200);
    await Promise.all(t.waits);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(calls, 0);
});
