// Daily D1 export, retention and cron schedule (CMS plan Q11, task S5 item 6).
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { exportDatabase, latestBackupAt, pruneBackups } from "../../src/worker/backup.mjs";
import { runCron } from "../../src/worker/cron.mjs";
import { createR2 } from "./r2-fake.mjs";

const env = () => ({ CF_ACCOUNT_ID: "acc", D1_DATABASE_ID: "db", D1_EXPORT_TOKEN: "t", MEDIA_ORIGINALS: createR2() });
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status });
let calls;
const originalFetch = globalThis.fetch;

function stubFetch(apiReplies, dump = "CREATE TABLE records;") {
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: init?.body && JSON.parse(init.body) });
    if (String(url).includes("/d1/database/")) return apiReplies.shift();
    return new Response(dump, { headers: { "Content-Length": String(Buffer.byteLength(dump)) } });
  };
}

beforeEach(() => {
  calls = [];
  globalThis.scheduler = { wait: async () => {} };
  // Workers runtime class; in tests a pass-through stream is enough.
  globalThis.FixedLengthStream = class extends TransformStream {
    constructor() {
      super();
    }
  };
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  delete globalThis.scheduler;
  delete globalThis.FixedLengthStream;
});

test("export polls with the bookmark, then streams the dump into backups/d1/<date>.sql", async () => {
  const e = env();
  stubFetch([reply({ result: { at_bookmark: "b1" } }), reply({ result: { status: "complete", result: { signed_url: "https://x/dump.sql", filename: "dump.sql" } } })]);
  await exportDatabase(e);
  assert.equal(calls[0].url, "https://api.cloudflare.com/client/v4/accounts/acc/d1/database/db/export");
  assert.deepEqual(calls[0].body, { output_format: "polling" });
  assert.deepEqual(calls[1].body, { output_format: "polling", current_bookmark: "b1" });
  assert.equal(calls[2].url, "https://x/dump.sql");
  const key = `backups/d1/${new Date().toISOString().slice(0, 10)}.sql`;
  assert.equal(e.MEDIA_ORIGINALS.objects.get(key).body.toString(), "CREATE TABLE records;");
});

test("an export error throws and writes nothing", async () => {
  const e = env();
  stubFetch([reply({ result: { status: "error", error: "boom" } })]);
  await assert.rejects(exportDatabase(e), /d1 export failed: 200 boom/);
  assert.equal(e.MEDIA_ORIGINALS.objects.size, 0);
});

test("a failed dump download throws and writes nothing", async () => {
  const e = env();
  stubFetch([reply({ result: { status: "complete", result: { signed_url: "https://x/dump.sql" } } })]);
  globalThis.fetch = ((inner) => async (url, init) => (String(url).includes("dump") ? new Response("", { status: 403 }) : inner(url, init)))(globalThis.fetch);
  await assert.rejects(exportDatabase(e), /download failed: 403/);
  assert.equal(e.MEDIA_ORIGINALS.objects.size, 0);
});

test("an API refusal reports the Cloudflare error code, and a dump without length is not written", async () => {
  stubFetch([reply({ result: null, errors: [{ code: 10000, message: "Authentication error" }] }, 403)]);
  await assert.rejects(exportDatabase(env()), /d1 export failed: 403 10000 Authentication error/);
  const e = env();
  stubFetch([reply({ result: { status: "complete", result: { signed_url: "https://x/dump.sql" } } })]);
  globalThis.fetch = ((inner) => async (url, init) => (String(url).includes("dump") ? new Response("x") : inner(url, init)))(globalThis.fetch);
  await assert.rejects(exportDatabase(e), /no known length/);
  assert.equal(e.MEDIA_ORIGINALS.objects.size, 0);
});

test("export gives up after 40 polls", async () => {
  stubFetch(Array.from({ length: 40 }, () => reply({ result: { at_bookmark: "b" } })));
  await assert.rejects(exportDatabase(env()), /timed out/);
  assert.equal(calls.length, 40);
});

test("cron runs the export at 18:00 UTC only", async () => {
  stubFetch([reply({ result: { status: "complete", result: { signed_url: "https://x/dump.sql" } } })]);
  await runCron({ scheduledTime: Date.parse("2026-11-23T18:01:00Z") }, env());
  assert.equal(calls.length, 0);
  const e = env();
  await runCron({ scheduledTime: Date.parse("2026-11-23T18:00:00Z") }, e);
  assert.equal(calls.length, 2);
  assert.equal(e.MEDIA_ORIGINALS.objects.size, 1);
});

test("cron retries the export at minute 33 only while today's file is missing", async () => {
  const e = env();
  stubFetch([reply({ result: { status: "complete", result: { signed_url: "https://x/dump.sql" } } })]);
  await runCron({ scheduledTime: Date.parse("2026-11-23T19:32:00Z") }, e);
  assert.equal(calls.length, 0);
  await runCron({ scheduledTime: Date.parse("2026-11-23T19:33:00Z") }, e);
  assert.equal(e.MEDIA_ORIGINALS.objects.size, 1);
  await runCron({ scheduledTime: Date.parse("2026-11-23T20:33:00Z") }, e);
  assert.equal(calls.length, 2, "today's file exists, no second export");
});

test("prune deletes exports older than 30 days and keeps newer ones; backupAt is the newest upload", async () => {
  const e = env();
  const now = Date.parse("2026-11-23T18:05:00Z");
  const day = (n) => new Date(now - n * 86_400_000);
  const name = (n) => `backups/d1/${day(n).toISOString().slice(0, 10)}.sql`;
  await e.MEDIA_ORIGINALS.put(name(31), "a", { uploaded: day(31) });
  await e.MEDIA_ORIGINALS.put(name(29), "b", { uploaded: day(29) });
  await e.MEDIA_ORIGINALS.put("originals/m1.jpg", "c", { uploaded: day(40) });
  assert.equal(await latestBackupAt(e), day(29).toISOString());
  await pruneBackups(e, now);
  assert.deepEqual([...e.MEDIA_ORIGINALS.objects.keys()].sort(), [name(29), "originals/m1.jpg"]);
  assert.equal(await latestBackupAt(env()), null);
});

test("the D1_DATABASE_ID var matches the D1 binding id in wrangler.toml", async () => {
  const toml = (await import("node:fs")).readFileSync(new URL("../../wrangler.toml", import.meta.url), "utf8");
  const binding = toml.match(/^database_id = "([^"]+)"/m)[1];
  assert.equal(toml.match(/^D1_DATABASE_ID = "([^"]+)"/m)[1], binding);
});
