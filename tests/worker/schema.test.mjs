import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createD1 } from "./d1-fake.mjs";

const SCHEMA = fileURLToPath(new URL("../../src/db/migrations/0001_cms.sql", import.meta.url));
const NOW = "2026-11-22T00:00:00.000Z";

const insertNews = (db, id, status, slugVi) =>
  db.prepare(
    `INSERT INTO records (type, id, status, version, position, name, slug_vi, data, write_id, created_at, created_by, updated_at, updated_by)
     VALUES ('news', ?, ?, 1, 0, ?, ?, '{}', 'w', ?, 'seed', ?, 'seed')`,
  ).bind(id, status, id, slugVi, NOW, NOW).run();

test("schema loads into the fake D1", async () => {
  const db = createD1(SCHEMA);
  const { results } = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
  assert.deepEqual(
    results.map((row) => row.name).filter((name) => !name.startsWith("sqlite_")),
    ["accounts", "audit_log", "record_media", "records", "settings", "slug_history", "variants", "versions"],
  );
});

test("slug is unique per type among records outside the trash", async () => {
  const db = createD1(SCHEMA);
  await insertNews(db, "a", "published", "trung-slug");
  await assert.rejects(insertNews(db, "b", "published", "trung-slug"), /UNIQUE/);
  await insertNews(db, "c", "trashed", "trung-slug");
  await insertNews(db, "d", "trashed", "trung-slug");
});

test("STRICT rejects a wrong type and json_valid rejects broken data", async () => {
  const db = createD1(SCHEMA);
  await assert.rejects(
    db.prepare(
      `INSERT INTO records (type, id, status, version, position, name, data, write_id, created_at, created_by, updated_at, updated_by)
       VALUES ('news', 'x', 'draft', 'one', 0, 'x', '{}', 'w', ?, 's', ?, 's')`,
    ).bind(NOW, NOW).run(),
    /cannot store TEXT value in INTEGER column/,
  );
  await assert.rejects(
    db.prepare(
      `INSERT INTO records (type, id, status, version, position, name, data, write_id, created_at, created_by, updated_at, updated_by)
       VALUES ('news', 'x', 'draft', 1, 0, 'x', '{broken', 'w', ?, 's', ?, 's')`,
    ).bind(NOW, NOW).run(),
    /CHECK constraint failed/,
  );
});

test("conditional update with a stale version changes nothing", async () => {
  const db = createD1(SCHEMA);
  await insertNews(db, "a", "draft", "a");
  const stale = await db.prepare("UPDATE records SET version = version + 1 WHERE type = 'news' AND id = 'a' AND version = ?").bind(7).run();
  assert.equal(stale.meta.changes, 0);
  const fresh = await db.prepare("UPDATE records SET version = version + 1 WHERE type = 'news' AND id = 'a' AND version = ?").bind(1).run();
  assert.equal(fresh.meta.changes, 1);
});

test("batch rolls back every statement when a later one fails", async () => {
  const db = createD1(SCHEMA);
  await assert.rejects(
    db.batch([
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").bind("publish_paused", "0"),
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").bind("seed_guard", null),
    ]),
    /NOT NULL/,
  );
  assert.equal(await db.prepare("SELECT value FROM settings WHERE key = 'publish_paused'").first(), null);
  const results = await db.batch([
    db.prepare("INSERT INTO settings (key, value) VALUES ('publish_paused', '0')"),
    db.prepare("SELECT key, value FROM settings"),
  ]);
  assert.deepEqual(results[0], { results: [], meta: { changes: 1 } });
  assert.deepEqual(results[1].results.map((row) => ({ ...row })), [{ key: "publish_paused", value: "0" }]);
});

test("a JSON id list inserts through json_each", async () => {
  const db = createD1(SCHEMA);
  await db.prepare("INSERT INTO record_media (type, id, media_id, variant_key) SELECT 'news', 'a', value, '' FROM json_each(?)")
    .bind(JSON.stringify(["m1", "m2"])).run();
  const { results } = await db.prepare("SELECT media_id FROM record_media ORDER BY media_id").all();
  assert.deepEqual(results.map((row) => row.media_id), ["m1", "m2"]);
});

test("record_media keeps one row per media and variant pair", async () => {
  const db = createD1(SCHEMA);
  const add = () => db.prepare("INSERT INTO record_media (type, id, media_id, variant_key) VALUES ('news', 'a', 'm1', '')").run();
  await add();
  await assert.rejects(add(), /UNIQUE/);
});

test("afterSelect runs after each standalone SELECT", async () => {
  const seen = [];
  const db = createD1(SCHEMA, { afterSelect: (sql, n) => seen.push(n) });
  await db.prepare("SELECT 1").first();
  await db.prepare("SELECT 1").all();
  await db.batch([db.prepare("SELECT 1")]);
  assert.deepEqual(seen, [1, 2]);
});
