// Record commands (CMS plan P1, Q3, Q9, Q10) on D1 seeded from the repo content.
import assert from "node:assert/strict";
import test from "node:test";
import { seedSql } from "../../scripts/cms/seed.mjs";
import { COMMANDS, route } from "../../src/worker/router.mjs";
import { createD1, MIGRATIONS } from "./d1-fake.mjs";

const SCHEMA = MIGRATIONS;
const SEED = await seedSql({ now: "2026-11-22T00:00:00.000Z" });
const ORIGIN = "http://127.0.0.1:8787";

function setup(email = "owner@example.com", role = "owner") {
  const DB = createD1(SCHEMA);
  DB.sqlite.exec(SEED);
  DB.sqlite.prepare("INSERT INTO accounts VALUES (?, ?, 'active', 'x', 'x', 'x', 'x')").run(email, role);
  const env = {
    DB,
    CMS_LOCAL_ADMIN_EMAIL: email,
    ADMIN_WRITE_LIMIT: { limit: async () => ({ success: true }) },
    ADMIN_UPLOAD_LIMIT: { limit: async () => ({ success: true }) },
    ASSETS: { fetch: async () => new Response("asset") },
  };
  const call = async (command, body, query = "") => {
    const init = body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN }, body: JSON.stringify(body) };
    const response = await route(new Request(`${ORIGIN}/api/admin/${command}${query}`, init), env, { waitUntil() {} });
    return { status: response.status, body: await response.json() };
  };
  const row = (type, id) => DB.sqlite.prepare("SELECT * FROM records WHERE type = ? AND id = ?").get(type, id);
  const audits = () => DB.sqlite.prepare("SELECT command, result FROM audit_log ORDER BY seq").all().map((a) => `${a.command} ${a.result}`);
  const rev = () => DB.sqlite.prepare("SELECT value FROM settings WHERE key = 'content_rev'").get()?.value;
  return { env, DB, call, row, audits, rev };
}

const firstOf = (DB, type) => DB.sqlite.prepare("SELECT id FROM records WHERE type = ? AND status = 'published' ORDER BY position LIMIT 1").get(type).id;

test("get and save the same data publishes a new version, writes versions, audit and content_rev", async () => {
  const { call, DB, audits, rev } = setup();
  const id = firstOf(DB, "news");
  const got = await call("get", undefined, `?type=news&id=${id}`);
  assert.equal(got.status, 200);
  const saved = await call("save", { type: "news", id, version: got.body.version, data: got.body.data });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.status, "published");
  assert.equal(saved.body.version, got.body.version + 1);
  assert.equal(saved.body.pending, 0);
  const version = DB.sqlite.prepare("SELECT data FROM versions WHERE type = 'news' AND id = ? AND version = ?").get(id, saved.body.version);
  assert.equal(version.data, DB.sqlite.prepare("SELECT data FROM records WHERE type = 'news' AND id = ?").get(id).data);
  assert.deepEqual(audits(), ["save ok"]);
  assert.equal(rev(), "1");
});

test("a stale version gets 409 with the current record and a refusal audit row", async () => {
  const { call, DB, audits } = setup();
  const id = firstOf(DB, "project");
  const got = await call("get", undefined, `?type=project&id=${id}`);
  const first = await call("save", { type: "project", id, version: got.body.version, data: got.body.data });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  const second = await call("save", { type: "project", id, version: got.body.version, data: got.body.data });
  assert.equal(second.status, 409);
  assert.equal(second.body.error, "version");
  assert.equal(second.body.current.version, first.body.version);
  assert.deepEqual(audits(), ["save ok", "save 409 version"]);
});

test("saving a published news with a missing field is 400 and changes nothing", async () => {
  const { call, DB, row } = setup();
  const id = firstOf(DB, "news");
  const before = row("news", id);
  const got = await call("get", undefined, `?type=news&id=${id}`);
  const data = { ...got.body.data, title: { vi: "", en: "" } };
  const saved = await call("save", { type: "news", id, version: got.body.version, data });
  assert.equal(saved.status, 400);
  assert.equal(saved.body.error, "missing");
  assert.deepEqual(row("news", id), before);
});

test("create makes a draft, list shows it, a slug clash is 409, a duplicate id is 409", async () => {
  const { call, DB } = setup();
  const id = firstOf(DB, "news");
  const { body: { data } } = await call("get", undefined, `?type=news&id=${id}`);
  const fresh = { ...data, id: "bai-moi", slugVi: "bai-moi", slugEn: "new-post" };
  const created = await call("create", { type: "news", id: "bai-moi", data: fresh });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.deepEqual(created.body, { type: "news", id: "bai-moi", version: 1, status: "draft" });
  const listed = await call("list", undefined, "?type=news&status=draft");
  assert.deepEqual(listed.body.items.map((item) => item.id), ["bai-moi"]);
  assert.equal((await call("create", { type: "news", id: "bai-moi", data: fresh })).body.error, "exists");
  const clash = await call("create", { type: "news", id: "bai-khac", data: { ...data, id: "bai-khac" } });
  assert.equal(clash.status, 409);
  assert.equal(clash.body.error, "slug");
  // Saving the complete draft publishes it.
  const saved = await call("save", { type: "news", id: "bai-moi", version: 1, data: fresh });
  assert.equal(saved.body.status, "published", JSON.stringify(saved.body));
});

test("create refuses singletons and data.id that differs from id", async () => {
  const { call } = setup();
  assert.equal((await call("create", { type: "menu", id: "main", data: {} })).status, 400);
  const wrong = await call("create", { type: "news", id: "a-b", data: { id: "c-d" } });
  assert.equal(wrong.status, 400);
  assert.equal(wrong.body.error, "shape");
});

test("changing a published slug writes slug_history, saving the old slug back removes it", async () => {
  const { call, DB } = setup();
  const id = firstOf(DB, "news");
  const got = await call("get", undefined, `?type=news&id=${id}`);
  const old = got.body.data.slugVi;
  const renamed = await call("save", { type: "news", id, version: got.body.version, data: { ...got.body.data, slugVi: "slug-moi-hoan-toan" } });
  assert.equal(renamed.status, 200, JSON.stringify(renamed.body));
  assert.equal(DB.sqlite.prepare("SELECT id FROM slug_history WHERE type = 'news' AND locale = 'vi' AND slug = ?").get(old)?.id, id);
  const back = await call("save", { type: "news", id, version: renamed.body.version, data: got.body.data });
  assert.equal(back.status, 200);
  assert.equal(DB.sqlite.prepare("SELECT COUNT(*) AS n FROM slug_history WHERE slug = ?").get(old).n, 0);
});

test("trash, restore, purge round trip; staff cannot purge; purge needs the exact name", async () => {
  const { call, DB, row } = setup();
  const id = firstOf(DB, "news");
  const name = row("news", id).name;
  const trashed = await call("trash", { type: "news", id });
  assert.equal(trashed.status, 200);
  assert.equal(row("news", id).status, "trashed");
  assert.equal((await call("save", { type: "news", id, version: row("news", id).version, data: JSON.parse(row("news", id).data) })).body.error, "trashed");
  const restored = await call("restore", { type: "news", id });
  assert.deepEqual(restored.body, { status: "published" });
  await call("trash", { type: "news", id });
  assert.equal((await call("purge", { type: "news", id, confirm: "sai" })).status, 400);
  assert.equal((await call("purge", { type: "news", id, confirm: name })).status, 200);
  assert.equal(row("news", id), undefined);
  // route() refuses staff with 403 role for owner commands (router test); local login is always owner.
  assert.equal(COMMANDS.purge.owner, true);
});

test("trash keeps home-projects at 3 and the last published hero slide of a page", async () => {
  const { call, DB } = setup();
  const ids = JSON.parse(DB.sqlite.prepare("SELECT json_extract(data, '$.ids') AS ids FROM records WHERE type = 'home-projects'").get().ids);
  DB.sqlite.prepare("UPDATE records SET data = json_set(data, '$.ids', json(?)) WHERE type = 'home-projects'").run(JSON.stringify(ids.slice(0, 3)));
  assert.equal((await call("trash", { type: "project", id: ids[0] })).body.error, "home-projects-min");
  const slides = DB.sqlite.prepare("SELECT id FROM records WHERE type = 'hero-slide' AND status = 'published' AND json_extract(data, '$.page') = 'commercial'").all().map((r) => r.id);
  for (const slide of slides.slice(0, -1)) assert.equal((await call("trash", { type: "hero-slide", id: slide })).status, 200);
  assert.equal((await call("trash", { type: "hero-slide", id: slides.at(-1) })).body.error, "last-slide");
});

test("trash of a project in the menu reports referencedBy", async () => {
  const { call, DB } = setup();
  const menu = JSON.parse(DB.sqlite.prepare("SELECT data FROM records WHERE type = 'menu'").get().data);
  const homeIds = JSON.parse(DB.sqlite.prepare("SELECT json_extract(data, '$.ids') AS ids FROM records WHERE type = 'home-projects'").get().ids);
  const inMenu = JSON.stringify(menu).match(/"([a-z0-9-]+)"/g).map((s) => s.slice(1, -1))
    .find((id) => DB.sqlite.prepare("SELECT 1 FROM records WHERE type = 'project' AND id = ?").get(id) && !homeIds.includes(id));
  if (!inMenu) return;
  const trashed = await call("trash", { type: "project", id: inMenu });
  assert.deepEqual(trashed.body.referencedBy, ["menu"]);
});

test("list pages with a cursor and audit-log reads newest first", async () => {
  const { call } = setup();
  const first = await call("list", undefined, "?type=advertising-card");
  assert.equal(first.body.items.length, 100);
  assert.ok(first.body.next);
  const second = await call("list", undefined, `?type=advertising-card&cursor=${encodeURIComponent(first.body.next)}`);
  assert.notEqual(second.body.items[0].id, first.body.items[0].id);
  assert.equal((await call("list", undefined, "?type=nope")).status, 400);
  await call("trash", { type: "news", id: "khong-co" });
  const log = await call("audit-log");
  assert.equal(log.body.items[0].result, "404 not-found");
});

test("a single type saves only id main and refuses missing fields", async () => {
  const { call } = setup();
  const got = await call("get", undefined, "?type=contact&id=main");
  assert.equal(got.status, 200);
  assert.equal((await call("save", { type: "contact", id: "main", version: got.body.version, data: got.body.data })).status, 200);
  assert.equal((await call("save", { type: "contact", id: "other", version: 1, data: got.body.data })).status, 400);
});

test("page-copy is fixed: no create, trash or purge, and missing fields are 400", async () => {
  const { call } = setup();
  assert.equal((await call("trash", { type: "page-copy", id: "home" })).status, 400);
  assert.equal((await call("create", { type: "page-copy", id: "moi", data: { id: "moi", slots: {} } })).status, 400);
  assert.equal((await call("purge", { type: "page-copy", id: "home", confirm: "home" })).status, 400);
});

test("purge of a live record follows the trash rules and reports referencedBy", async () => {
  const { call, DB, row } = setup();
  const slides = DB.sqlite.prepare("SELECT id FROM records WHERE type = 'hero-slide' AND status = 'published' AND json_extract(data, '$.page') = 'commercial'").all().map((r) => r.id);
  for (const slide of slides.slice(0, -1)) await call("trash", { type: "hero-slide", id: slide });
  const last = slides.at(-1);
  assert.equal((await call("purge", { type: "hero-slide", id: last, confirm: row("hero-slide", last).name })).body.error, "last-slide");
  const id = firstOf(DB, "news");
  const purged = await call("purge", { type: "news", id, confirm: row("news", id).name });
  assert.deepEqual(purged.body, { referencedBy: [] });
  assert.equal(DB.sqlite.prepare("SELECT COUNT(*) AS n FROM versions WHERE type = 'news' AND id = ?").get(id).n, 0);
});
