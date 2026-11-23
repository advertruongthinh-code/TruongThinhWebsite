// Variants settle and workflow dispatch (CMS plan P3 item 6, Q6 step 4, Q8).
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { runCron } from "../../src/worker/cron.mjs";
import { dispatchVariants, dispatchWorkflow } from "../../src/worker/dispatch.mjs";
import { settleVariants } from "../../src/worker/variants.mjs";
import { createD1 } from "./d1-fake.mjs";
import { createR2 } from "./r2-fake.mjs";

const SCHEMA = fileURLToPath(new URL("../../src/db/migrations/0001_cms.sql", import.meta.url));
const KEY = "a".repeat(32);
const realFetch = globalThis.fetch;
globalThis.scheduler = { wait: async () => {} }; // no real 1, 2, 4 s waits between retries
afterEach(() => { globalThis.fetch = realFetch; });

function setup() {
  let selects = 0;
  const DB = createD1(SCHEMA, { afterSelect: () => { selects += 1; } });
  const env = { DB, MEDIA_PUBLIC: createR2(), GITHUB_ACTIONS_TOKEN: "token" };
  const record = (type, id, { status = "published", version = 1, live = null, pending = 0, data = {} } = {}) => DB.sqlite
    .prepare("INSERT INTO records (type, id, status, version, live_version, pending, position, name, data, write_id, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'w', 'x', 'x', 'x', 'x')")
    .run(type, id, status, version, live, pending, id, JSON.stringify(data));
  const media = (id, data) => record("media", id, { data: { id, kind: "image", width: 1200, height: 800, ...data } });
  const variant = (key, mediaId, crop, createdAt = new Date().toISOString()) => DB.sqlite
    .prepare("INSERT INTO variants (key, media_id, crop, status, created_at) VALUES (?, ?, ?, 'pending', ?)").run(key, mediaId, crop, createdAt);
  const manifest = (key, sourceWidth, sourceHeight) => env.MEDIA_PUBLIC.put(`v/${key}/manifest.json`, JSON.stringify({ key, sourceWidth, sourceHeight }));
  const one = (sql, ...args) => DB.sqlite.prepare(sql).get(...args);
  const fetches = [];
  globalThis.fetch = async (url, init) => { fetches.push({ url, body: JSON.parse(init.body), headers: init.headers }); return new Response(null, { status: 204 }); };
  return { DB, env, record, media, variant, manifest, one, fetches, selects: () => selects };
}

test("no pending variant costs the cron exactly one query", async () => {
  const { env, selects } = setup();
  const waits = [];
  await runCron({ scheduledTime: Date.parse("2026-11-23T10:01:00Z") }, env, { waitUntil: (promise) => waits.push(promise) });
  await Promise.all(waits);
  assert.equal(selects(), 1);
});

test("a manifest of the right size makes the variant ready and a published record live, raising content_rev", async () => {
  const { env, media, record, variant, manifest, one } = setup();
  media("can-ho-01");
  variant(KEY, "can-ho-01", "0,0,1200,800");
  record("project", "nha", { version: 3, live: 2, pending: 1 });
  env.DB.sqlite.prepare("INSERT INTO record_media (type, id, media_id, variant_key) VALUES ('project', 'nha', 'can-ho-01', ?)").run(KEY);
  await settleVariants(env);
  assert.equal(one("SELECT status FROM variants").status, "pending", "no manifest yet: still pending");
  await manifest(KEY, 1200, 800);
  await settleVariants(env);
  const row = one("SELECT status, error, settled_at FROM variants");
  assert.deepEqual([row.status, row.error], ["ready", null]);
  assert.ok(row.settled_at);
  assert.deepEqual({ ...one("SELECT pending, live_version, version FROM records WHERE id = 'nha'") }, { pending: 0, live_version: 3, version: 3 });
  assert.equal(one("SELECT value FROM settings WHERE key = 'content_rev'").value, "1");
});

test("a pending key older than 45 minutes becomes error timeout; a size mismatch becomes error size", async () => {
  const { env, media, variant, manifest, one } = setup();
  media("old-01");
  media("tall-01");
  variant(KEY, "old-01", "0,0,1200,800", new Date(Date.now() - 46 * 60_000).toISOString());
  variant("b".repeat(32), "tall-01", "0,0,1200,800");
  await manifest("b".repeat(32), 800, 1200);
  await settleVariants(env);
  assert.deepEqual({ ...one("SELECT status, error FROM variants WHERE key = ?", KEY) }, { status: "error", error: "timeout" });
  assert.deepEqual({ ...one("SELECT status, error FROM variants WHERE key = ?", "b".repeat(32)) }, { status: "error", error: "size" });
});

test("dispatchVariants sends 9 keys as two runs of 8 and 1, with numeric crops and p only for repo media", async () => {
  const { env, media, variant, fetches } = setup();
  media("repo-01", { source: "repo", path: "/assets/content/projects/repo-01.webp" });
  media("r2-01", { source: "r2", originalKey: "originals/r2-01/x.webp" });
  const keys = Array.from({ length: 9 }, (_, index) => index.toString(16).padStart(32, "0"));
  keys.forEach((key, index) => variant(key, index ? "r2-01" : "repo-01", `${index},0,100,100`));
  await dispatchVariants(env, keys);
  assert.equal(fetches.length, 2);
  assert.match(fetches[0].url, /\/repos\/advertruongthinh-code\/TruongThinhWebsite\/actions\/workflows\/cms-variants\.yml\/dispatches$/);
  assert.equal(fetches[0].headers["User-Agent"], "tt-cms");
  assert.equal(fetches[0].body.ref, "main");
  const lots = fetches.map((call) => JSON.parse(call.body.inputs.items));
  assert.deepEqual(lots.map((lot) => lot.length), [8, 1]);
  const items = lots.flat();
  assert.deepEqual(items.find((item) => item.m === "repo-01"), { m: "repo-01", c: [0, 0, 100, 100], p: "/assets/content/projects/repo-01.webp" });
  assert.deepEqual(items.find((item) => item.m === "r2-01"), { m: "r2-01", c: [1, 0, 100, 100] });
});

test("GitHub failing four times records dispatch_error; a later success clears it; no token never calls GitHub", async () => {
  const { env, one, fetches } = setup();
  globalThis.fetch = async () => { fetches.push(1); return new Response("", { status: 500 }); };
  assert.equal(await dispatchWorkflow(env, "cms-variants.yml", { items: "[]" }), false);
  assert.equal(fetches.length, 4);
  assert.match(one("SELECT value FROM settings WHERE key = 'dispatch_error:cms-variants.yml'").value, /^\d{4}-\d\d-\d\dT\S+ cms-variants\.yml 500$/);
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await dispatchWorkflow(env, "cms-variants.yml", { items: "[]" }), true);
  assert.equal(one("SELECT value FROM settings WHERE key = 'dispatch_error:cms-variants.yml'"), undefined);
  fetches.length = 0;
  globalThis.fetch = async () => { fetches.push(1); return new Response(null, { status: 204 }); };
  assert.equal(await dispatchWorkflow({ DB: env.DB }, "cms-variants.yml", { items: "[]" }), false);
  assert.equal(fetches.length, 0);
  assert.match(one("SELECT value FROM settings WHERE key = 'dispatch_error:cms-variants.yml'").value, / cms-variants\.yml no-token$/);
});

test("a 4xx answer is not retried, and a variants success leaves a failed build dispatch recorded", async () => {
  const { env, one, fetches } = setup();
  env.DB.sqlite.prepare("INSERT INTO settings VALUES ('dispatch_error:ci.yml', 'x ci.yml 500')").run();
  globalThis.fetch = async () => { fetches.push(1); return new Response("", { status: 422 }); };
  assert.equal(await dispatchWorkflow(env, "cms-variants.yml", { items: "[]" }), false);
  assert.equal(fetches.length, 1);
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await dispatchWorkflow(env, "cms-variants.yml", { items: "[]" }), true);
  assert.equal(one("SELECT value FROM settings WHERE key = 'dispatch_error:ci.yml'").value, "x ci.yml 500");
});
