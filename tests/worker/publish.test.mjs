// Publishing from the Worker (CMS plan P4 item 6): dispatchBuild, retryBuild, rebuild, build-status.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { seedSql } from "../../scripts/cms/seed.mjs";
import { runCron } from "../../src/worker/cron.mjs";
import buildStatus from "../../src/worker/commands/build-status.mjs";
import snapshot from "../../src/worker/commands/snapshot.mjs";
import { dispatchBuild } from "../../src/worker/dispatch.mjs";
import { route } from "../../src/worker/router.mjs";
import { createD1, MIGRATIONS } from "./d1-fake.mjs";
import { createR2 } from "./r2-fake.mjs";

const SCHEMA = MIGRATIONS;
const SEED = await seedSql({ now: "2026-11-22T00:00:00.000Z" });
const ORIGIN = "http://127.0.0.1:8787";
const realFetch = globalThis.fetch;
globalThis.scheduler = { wait: async () => {} };
afterEach(() => { globalThis.fetch = realFetch; });

function setup({ status, headers = {}, runs = [] } = {}) {
  const DB = createD1(SCHEMA);
  DB.sqlite.exec(SEED);
  DB.sqlite.prepare("INSERT INTO accounts VALUES ('a@example.com', 'owner', 'active', 'x', 'x', 'x', 'x')").run();
  // A live Cron: saves leave the dispatch to it (the dead-Cron tests overwrite cron_at).
  DB.sqlite.prepare("INSERT INTO settings VALUES ('cron_at', ?)").run(new Date().toISOString());
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
  return { env, DB, calls, call, setting, put, cron, saveNews };
}

test("a save never calls GitHub; the next cron minute dispatches ci.yml once with content true and a User-Agent", async () => {
  const { saveNews, calls, cron } = setup();
  assert.equal((await saveNews()).status, 200);
  assert.equal(calls.length, 0);
  await cron("10:06");
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/workflows\/ci\.yml\/dispatches$/);
  assert.equal(calls[0].body, '{"ref":"main","inputs":{"content":"true"}}');
  assert.equal(calls[0].headers["User-Agent"], "tt-cms");
  await cron("10:07");
  assert.equal(calls.length, 1, "nothing new: no second dispatch");
});

test("ten quick saves give one content build; a draft save wants none", async () => {
  const { call, calls, cron, DB } = setup();
  const { id } = DB.sqlite.prepare("SELECT id FROM records WHERE type = 'news' AND status = 'published' ORDER BY position LIMIT 1").get();
  for (let i = 0; i < 10; i += 1) {
    const got = await call("get", undefined, `?type=news&id=${id}`);
    assert.equal((await call("save", { type: "news", id, version: got.body.version, data: got.body.data })).status, 200);
  }
  await cron("10:06");
  assert.equal(calls.filter(({ method }) => method === "POST").length, 1);
  calls.length = 0;
  const { body: { data } } = await call("get", undefined, `?type=news&id=${id}`);
  const fresh = { ...data, id: "zz-nhap", slugVi: "zz-nhap", slugEn: "zz-draft", title: { vi: "", en: "" } };
  assert.equal((await call("create", { type: "news", id: "zz-nhap", data: fresh })).status, 201);
  const saved = await call("save", { type: "news", id: "zz-nhap", version: 1, data: fresh });
  assert.equal(saved.body.status, "draft");
  calls.length = 0;
  await cron("10:07");
  assert.equal(calls.length, 0);
});

test("GitHub 500 gives exactly four calls and a dispatch_error; the retry at minute 10 clears it", async () => {
  const { saveNews, calls, setting, cron } = setup({ status: 500 });
  await saveNews();
  await cron("10:06");
  assert.equal(calls.length, 4);
  assert.match(setting("dispatch_error:ci.yml"), /^\S+ ci\.yml 500$/);
  globalThis.fetch = async (url) => { calls.push({ url: String(url) }); return new Response(null, { status: 204 }); };
  calls.length = 0;
  await cron("10:07");
  assert.equal(calls.length, 0, "after a failure only minutes divisible by 5 retry");
  await cron("10:10");
  assert.equal(calls.length, 1);
  assert.equal(setting("dispatch_error:ci.yml"), undefined);
  await cron("10:11");
  assert.equal(calls.length, 1, "the wanted build was sent");
});

test("rebuild by hand also sends the wanted build, so cron does not dispatch it again", async () => {
  const { saveNews, call, calls, cron } = setup();
  await saveNews();
  assert.equal((await call("rebuild", {})).status, 202);
  await cron("10:06");
  assert.equal(calls.filter(({ method }) => method === "POST").length, 1);
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
  assert.equal(owner.body.rollbackRuns, null);
});

test("build-status reads runs, token expiry, deployments, dispatchError and lastSaveAt", async () => {
  const run = { id: 7, status: "completed", conclusion: "success", event: "workflow_dispatch", display_title: "CMS content build", created_at: "t", html_url: "u" };
  const { call, env, put } = setup({ runs: [{ ...run, extra: 1 }], headers: { "github-authentication-token-expiration": "2027-01-01 00:00:00 UTC" } });
  // Q6 keys: 9999999999999 - epoch ms, so the newer marker (b) sorts first.
  const key = (at) => `deploys/${9999999999999 - Date.parse(at)}-1.json`;
  await env.MEDIA_PUBLIC.put(key("2026-11-01"), JSON.stringify({ versionId: "a" }));
  await env.MEDIA_PUBLIC.put(key("2026-11-02"), JSON.stringify({ versionId: "b" }));
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

test("dead Cron (cron_at over 5 minutes old): a published save and a build-status read send the wanted build themselves", async () => {
  const { saveNews, call, calls, put, setting } = setup();
  put("cron_at", new Date(Date.now() - 6 * 60_000).toISOString());
  await saveNews();
  assert.equal(calls.filter(({ method }) => method === "POST").length, 1, "the save dispatched without Cron");
  assert.equal(setting("build_sent"), setting("build_wanted"));
  put("cron_at", "");
  put("build_wanted", "x");
  calls.length = 0;
  const status = await call("build-status", undefined);
  assert.equal(status.body.cronStale, true);
  assert.equal(calls.filter(({ method }) => method === "POST").length, 1, "the status page read dispatched without Cron");
});

test("a live Cron: build-status reports cronStale false; a daily job minute writes the heartbeat but sends nothing", async () => {
  const { saveNews, call, calls, cron, put, setting } = setup();
  assert.equal((await call("build-status", undefined)).body.cronStale, false);
  await saveNews();
  put("cron_at", "2026-01-01T00:00:00.000Z");
  await cron("18:05");
  assert.notEqual(setting("cron_at"), "2026-01-01T00:00:00.000Z");
  assert.equal(calls.length, 0);
  await cron("18:06");
  assert.equal(calls.length, 1);
});

test("trash of a published record wants a build in its own batch; trash of a draft does not", async () => {
  const { call, DB, setting } = setup();
  const { id } = DB.sqlite.prepare("SELECT id FROM records WHERE type = 'news' AND status = 'published' ORDER BY position LIMIT 1").get();
  assert.equal((await call("trash", { type: "news", id })).status, 200);
  assert.equal(setting("build_wanted"), setting("content_rev"));
  const rev = setting("build_wanted");
  assert.equal((await call("restore", { type: "news", id })).status, 200);
  assert.notEqual(setting("build_wanted"), rev, "restoring a published record wants a build too");
  DB.sqlite.prepare("UPDATE records SET status = 'draft' WHERE type = 'news' AND id = ?").run(id);
  const before = setting("build_wanted");
  assert.equal((await call("trash", { type: "news", id })).status, 200);
  assert.equal(setting("build_wanted"), before);
});

test("pause, save, resume: exactly one dispatch, and cron adds none", async () => {
  const { saveNews, call, calls, cron, put } = setup();
  put("publish_paused", "1");
  await saveNews();
  await cron("10:06");
  assert.equal(calls.length, 0);
  assert.equal((await call("resume-publish", {})).status, 200);
  await cron("10:07");
  assert.equal(calls.filter(({ method }) => method === "POST").length, 1);
});
