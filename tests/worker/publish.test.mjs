// Publishing from the Worker (CMS plan P4 item 6): dispatchBuild, retryBuild, rebuild, build-status.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { seedSql } from "../../scripts/cms/seed.mjs";
import { runCron } from "../../src/worker/cron.mjs";
import buildStatus from "../../src/worker/commands/build-status.mjs";
import snapshot from "../../src/worker/commands/snapshot.mjs";
import { dispatchBuild } from "../../src/worker/dispatch.mjs";
import { route } from "../../src/worker/router.mjs";
import { createD1 } from "./d1-fake.mjs";
import { createR2 } from "./r2-fake.mjs";

const SCHEMA = fileURLToPath(new URL("../../src/db/migrations/0001_cms.sql", import.meta.url));
const SEED = await seedSql({ now: "2026-11-22T00:00:00.000Z" });
const ORIGIN = "http://127.0.0.1:8787";
const realFetch = globalThis.fetch;
globalThis.scheduler = { wait: async () => {} };
afterEach(() => { globalThis.fetch = realFetch; });

function setup({ status, headers = {}, runs = [] } = {}) {
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
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? "GET", body: init.body, headers: init.headers });
    if (init.method === "POST") return new Response(null, { status: status ?? 204 });
    return new Response(JSON.stringify({ workflow_runs: runs }), { status: status ?? 200, headers });
  };
  const waits = [];
  const ctx = { waitUntil: (promise) => waits.push(promise) };
  const call = async (command, body, query = "") => {
    const init = body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN }, body: JSON.stringify(body) };
    const response = await route(new Request(`${ORIGIN}/api/admin/${command}${query}`, init), env, ctx);
    await Promise.all(waits);
    return { status: response.status, body: await response.json() };
  };
  const setting = (key) => DB.sqlite.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value;
  const put = (key, value) => DB.sqlite.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
  const cron = async (time) => {
    await runCron({ scheduledTime: Date.parse(`2026-11-23T${time}:00Z`) }, env, ctx);
    await Promise.all(waits);
  };
  const saveNews = async () => {
    const { id } = DB.sqlite.prepare("SELECT id FROM records WHERE type = 'news' AND status = 'published' ORDER BY position LIMIT 1").get();
    const got = await call("get", undefined, `?type=news&id=${id}`);
    calls.length = 0;
    return call("save", { type: "news", id, version: got.body.version, data: got.body.data });
  };
  return { env, calls, call, setting, put, cron, saveNews };
}

test("saving a published record dispatches ci.yml once with content true and a User-Agent", async () => {
  const { saveNews, calls } = setup();
  assert.equal((await saveNews()).status, 200);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/workflows\/ci\.yml\/dispatches$/);
  assert.equal(calls[0].body, '{"ref":"main","inputs":{"content":"true"}}');
  assert.equal(calls[0].headers["User-Agent"], "tt-cms");
});

test("GitHub 500 gives exactly four calls and a dispatch_error; a later success clears it", async () => {
  const { saveNews, calls, setting, env } = setup({ status: 500 });
  await saveNews();
  assert.equal(calls.length, 4);
  assert.match(setting("dispatch_error:ci.yml"), /^\S+ ci\.yml 500$/);
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await dispatchBuild(env), true);
  assert.equal(setting("dispatch_error:ci.yml"), undefined);
});

test("paused: snapshot 423, rebuild 409, save still 200 without a dispatch", async () => {
  const { saveNews, call, put, calls, env } = setup();
  put("publish_paused", "1");
  assert.equal((await saveNews()).status, 200);
  assert.equal(calls.length, 0);
  assert.equal((await call("rebuild", {})).status, 409);
  assert.equal(calls.length, 0);
  const refused = await snapshot.run(new Request("https://x/api/admin/snapshot"), env).catch((error) => error);
  assert.equal(refused.status, 423);
});

test("rebuild dispatches and answers 202, or 502 when GitHub keeps failing", async () => {
  const ok = setup();
  assert.equal((await ok.call("rebuild", {})).status, 202);
  assert.equal(ok.calls.length, 1);
  const bad = setup({ status: 500 });
  assert.equal((await bad.call("rebuild", {})).status, 502);
});

test("build-status: staff has no accessDrift, owner has null; GitHub failure keeps 200 with runs null", async () => {
  // The local dev login is always owner, so the staff case calls the handler with a staff actor.
  const staff = await buildStatus.run(new Request(`${ORIGIN}/api/admin/build-status`), setup().env, null, { email: "s@example.com", role: "staff" });
  assert.equal(staff.status, 200);
  assert.equal("accessDrift" in (await staff.json()), false);
  const owner = await setup({ status: 500 }).call("build-status", undefined);
  assert.equal(owner.status, 200);
  assert.equal(owner.body.accessDrift, null);
  assert.equal(owner.body.runs, null);
  assert.equal(owner.body.tokenExpiresAt, null);
  assert.deepEqual(owner.body.rollbackRuns, []);
});

test("build-status reads runs, token expiry, deployments, dispatchError and lastSaveAt", async () => {
  const run = { id: 7, status: "completed", conclusion: "success", event: "workflow_dispatch", display_title: "CMS content build", created_at: "t", html_url: "u" };
  const { call, env, put } = setup({ runs: [{ ...run, extra: 1 }], headers: { "github-authentication-token-expiration": "2027-01-01 00:00:00 UTC" } });
  // Key order (a, b) differs from upload order: the newest upload comes first.
  await env.MEDIA_PUBLIC.put("deploys/b.json", JSON.stringify({ versionId: "b" }), { uploaded: new Date("2026-11-02") });
  await env.MEDIA_PUBLIC.put("deploys/a.json", JSON.stringify({ versionId: "a" }), { uploaded: new Date("2026-11-01") });
  put("dispatch_error:ci.yml", "t ci.yml 401");
  const { body } = await call("build-status", undefined);
  assert.deepEqual(body.runs, [run]);
  assert.equal(body.tokenExpiresAt, "2027-01-01T00:00:00.000Z");
  assert.deepEqual(body.deployments.map((d) => d.versionId), ["b", "a"]);
  assert.equal(body.dispatchError, "t ci.yml 401");
  assert.equal(body.paused, false);
  assert.equal(body.lastSaveAt, "2026-11-22T00:00:00.000Z");
});

test("cron retries a failed ci.yml dispatch at minute 05 only; cms-variants errors and pause do not retry", async () => {
  const { cron, put, calls, setting } = setup();
  put("dispatch_error:ci.yml", "t ci.yml 500");
  await cron("10:06");
  assert.equal(calls.length, 0);
  await cron("18:05"); // daily job minute: the backup keeps the subrequest budget
  assert.equal(calls.length, 0);
  await cron("10:05");
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /ci\.yml\/dispatches$/);
  assert.equal(setting("dispatch_error:ci.yml"), undefined);
  calls.length = 0;
  put("dispatch_error:cms-variants.yml", "t cms-variants.yml 500");
  await cron("10:05");
  assert.equal(calls.length, 0);
  put("dispatch_error:ci.yml", "t ci.yml 500");
  put("publish_paused", "1");
  await cron("10:05");
  assert.equal(calls.length, 0);
});
