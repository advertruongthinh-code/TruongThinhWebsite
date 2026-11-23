// Snapshot command (CMS plan Q2): string-joined records, held records and redirects.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { route } from "../../src/worker/router.mjs";
import snapshot from "../../src/worker/commands/snapshot.mjs";
import { HttpError } from "../../src/worker/http.mjs";
import { createD1 } from "./d1-fake.mjs";

const SCHEMA = fileURLToPath(new URL("../../src/db/migrations/0001_cms.sql", import.meta.url));
const NOW = "2026-11-22T00:00:00.000Z";

function seed() {
  const DB = createD1(SCHEMA);
  const insert = DB.sqlite.prepare(
    `INSERT INTO records (type, id, status, version, live_version, pending, position, name, data, write_id, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, 'published', 1, ?, ?, ?, ?, ?, 'w', ?, 'seed', ?, 'seed')`,
  );
  insert.run("news", "b", 1, 0, 1, "b", JSON.stringify({ id: "b", title: { vi: "B's" } }), NOW, NOW);
  insert.run("news", "a", 1, 0, 0, "a", JSON.stringify({ id: "a" }), NOW, NOW);
  insert.run("project", "nha-moi", null, 1, 0, "nha-moi", JSON.stringify({ id: "nha-moi" }), NOW, NOW);
  insert.run("menu", "main", 1, 0, 0, "main", JSON.stringify({ featuredProjects: [] }), NOW, NOW);
  insert.run("media", "m1", 1, 0, 0, "m1", JSON.stringify({ id: "m1" }), NOW, NOW);
  DB.sqlite.prepare("INSERT INTO slug_history VALUES ('news', 'vi', 'slug-cu', 'a', ?)").run(NOW);
  return { DB };
}

test("snapshot joins published records by type and position, holds pending records without a live version", async () => {
  const env = seed();
  const response = await snapshot.run(new Request("https://x/api/admin/snapshot"), env);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const body = JSON.parse(await response.text());
  assert.equal(body.schema, 1);
  assert.ok(!Number.isNaN(Date.parse(body.takenAt)));
  assert.deepEqual(body.records.news.map((news) => news.id), ["a", "b"]);
  assert.equal(body.records.news[1].title.vi, "B's");
  assert.deepEqual(body.records.menu, [{ featuredProjects: [] }]);
  assert.equal(body.records.project, undefined);
  assert.equal(body.records.media, undefined);
  assert.deepEqual(body.held, [{ type: "project", id: "nha-moi" }]);
  assert.deepEqual(body.redirects, [{ type: "news", locale: "vi", slug: "slug-cu", id: "a" }]);
});

test("a pending record with a live version uses that version's data", async () => {
  const env = seed();
  env.DB.sqlite.prepare("UPDATE records SET version = 2, live_version = 1, pending = 1, data = ? WHERE id = 'nha-moi'").run(JSON.stringify({ id: "nha-moi", v: 2 }));
  env.DB.sqlite.prepare("INSERT INTO versions VALUES ('project', 'nha-moi', 1, 'published', ?, ?, 'seed')").run(JSON.stringify({ id: "nha-moi", v: 1 }), NOW);
  const body = JSON.parse(await (await snapshot.run(new Request("https://x/"), env)).text());
  assert.deepEqual(body.records.project, [{ id: "nha-moi", v: 1 }]);
  assert.deepEqual(body.held, []);
});

test("an empty database gives an empty snapshot", async () => {
  const body = JSON.parse(await (await snapshot.run(new Request("https://x/"), { DB: createD1(SCHEMA) })).text());
  assert.deepEqual([body.records, body.redirects, body.held], [{}, [], []]);
});

test("paused publishing answers 423", async () => {
  const env = seed();
  env.DB.sqlite.prepare("INSERT INTO settings VALUES ('publish_paused', '1')").run();
  await assert.rejects(snapshot.run(new Request("https://x/"), env), (error) => error instanceof HttpError && error.status === 423);
  const local = { ...env, CMS_LOCAL_ADMIN_EMAIL: "admin@localhost" };
  // A local dev owner is a person, not the service, so the machine path stays closed even locally.
  assert.equal((await route(new Request("http://127.0.0.1/api/admin/snapshot"), local)).status, 403);
});
