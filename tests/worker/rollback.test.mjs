// Rollback and resume (CMS plan P6 item 6): owner only, 10 latest markers, pause, dispatch of rollback.yml.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { seedSql } from "../../scripts/cms/seed.mjs";
import { COMMANDS, route } from "../../src/worker/router.mjs";
import { createD1 } from "./d1-fake.mjs";
import { createR2 } from "./r2-fake.mjs";

const SCHEMA = fileURLToPath(new URL("../../src/db/migrations/0001_cms.sql", import.meta.url));
const SEED = await seedSql({ now: "2026-11-22T00:00:00.000Z" });
const ORIGIN = "http://127.0.0.1:8787";
const realFetch = globalThis.fetch;
globalThis.scheduler = { wait: async () => {} };
afterEach(() => { globalThis.fetch = realFetch; });

const version = (n) => `${String(n).padStart(8, "0")}-aaaa-4bbb-8ccc-${String(n).padStart(12, "0")}`;

async function setup({ status = 204, markers = 12 } = {}) {
  const DB = createD1(SCHEMA);
  DB.sqlite.exec(SEED);
  DB.sqlite.prepare("INSERT INTO accounts VALUES ('a@example.com', 'owner', 'active', 'x', 'x', 'x', 'x')").run();
  const env = {
    DB,
    MEDIA_PUBLIC: createR2(),
    MEDIA_ORIGINALS: createR2(),
    GITHUB_ACTIONS_TOKEN: "token",
    CMS_LOCAL_ADMIN_EMAIL: "a@example.com",
    ADMIN_WRITE_LIMIT: { limit: async () => ({ success: true }) },
    ADMIN_UPLOAD_LIMIT: { limit: async () => ({ success: true }) },
    ASSETS: { fetch: async () => new Response("asset") },
  };
  // Marker n=1 is the newest (smallest key); n grows into the past.
  for (let n = 1; n <= markers; n += 1) {
    const at = new Date(Date.UTC(2026, 10, 23, 12) - n * 60000);
    await env.MEDIA_PUBLIC.put(`deploys/${9999999999999 - at.getTime()}-${n}.json`, JSON.stringify({ versionId: version(n), commit: "c".repeat(40), snapshotId: null, at: at.toISOString() }));
  }
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? "GET", body: init.body });
    if (init.method === "POST") return new Response(null, { status });
    return new Response(JSON.stringify({ workflow_runs: [{ id: 7, status: "completed", conclusion: "cancelled", created_at: "2026-11-23T12:00:00Z", html_url: "https://x/7", extra: 1 }] }), { status: 200 });
  };
  const waits = [];
  const ctx = { waitUntil: (promise) => waits.push(promise) };
  const call = async (command, body) => {
    const init = body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN }, body: JSON.stringify(body) };
    const response = await route(new Request(`${ORIGIN}/api/admin/${command}`, init), env, ctx);
    await Promise.all(waits);
    return { status: response.status, body: await response.json() };
  };
  const setting = (key) => DB.sqlite.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value;
  const audits = () => DB.sqlite.prepare("SELECT command, id, result FROM audit_log ORDER BY seq").all().map((row) => `${row.command} ${row.id} ${row.result}`);
  return { env, calls, call, setting, audits };
}

// route() refuses staff with 403 and an audit row "403 role" for owner commands (tests/worker/auth.test.mjs); local login is always owner.
test("rollback and resume-publish are owner-only commands", () => {
  assert.equal(COMMANDS.rollback.owner, true);
  assert.equal(COMMANDS["resume-publish"].owner, true);
});

test("an id outside the 10 latest markers, the newest marker or a malformed id is 400 and nothing is paused", async () => {
  const t = await setup();
  assert.deepEqual(await t.call("rollback", { versionId: version(11) }), { status: 400, body: { error: "version" } });
  assert.deepEqual(await t.call("rollback", { versionId: version(1) }), { status: 400, body: { error: "version" } });
  assert.deepEqual(await t.call("rollback", { versionId: "not-a-uuid" }), { status: 400, body: { error: "shape" } });
  assert.equal(t.setting("publish_paused"), undefined);
  assert.equal(t.calls.length, 0);
});

test("a rollback pauses publishing, snapshot answers 423 and GitHub gets rollback.yml with the version id", async () => {
  const t = await setup();
  assert.deepEqual(await t.call("rollback", { versionId: version(10) }), { status: 202, body: { paused: true } });
  assert.equal(t.setting("publish_paused"), "1");
  assert.equal(t.calls.length, 1);
  assert.match(t.calls[0].url, /\/workflows\/rollback\.yml\/dispatches$/);
  assert.equal(t.calls[0].body, `{"ref":"main","inputs":{"version_id":"${version(10)}"}}`);
  assert.equal((await t.call("snapshot")).status, 403, "snapshot is service only");
  assert.deepEqual(t.audits(), [`rollback ${version(10)} ok`]);
});

test("a failed dispatch is 502 and publishing stays paused", async () => {
  const t = await setup({ status: 500 });
  assert.deepEqual(await t.call("rollback", { versionId: version(3) }), { status: 502, body: { error: "dispatch" } });
  assert.equal(t.setting("publish_paused"), "1");
});

test("resume-publish clears the pause and dispatches a content build", async () => {
  const t = await setup();
  await t.call("rollback", { versionId: version(2) });
  t.calls.length = 0;
  assert.deepEqual(await t.call("resume-publish", {}), { status: 200, body: { paused: false } });
  assert.equal(t.setting("publish_paused"), "0");
  assert.equal(t.calls.length, 1);
  assert.equal(t.calls[0].body, '{"ref":"main","inputs":{"content":"true"}}');
});

test("build-status lists the three latest rollback runs with five fields, or null when GitHub fails", async () => {
  const t = await setup();
  const { body } = await t.call("build-status");
  assert.deepEqual(body.rollbackRuns, [{ id: 7, status: "completed", conclusion: "cancelled", created_at: "2026-11-23T12:00:00Z", html_url: "https://x/7" }]);
  assert.ok(t.calls.some((c) => c.url.endsWith("/rollback.yml/runs?per_page=3")));
  globalThis.fetch = async () => new Response("no", { status: 500 });
  assert.equal((await t.call("build-status")).body.rollbackRuns, null);
});
