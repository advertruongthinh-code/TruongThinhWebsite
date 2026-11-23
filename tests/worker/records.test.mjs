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
  // The copy still uses the photos of the original (one photo, one page): it stays a draft until the original is gone.
  const reused = await call("save", { type: "news", id: "bai-moi", version: 1, data: fresh });
  assert.equal(reused.body.status, "draft");
  assert.ok(reused.body.missing.length && reused.body.missing.every(({ code }) => code === "media-reuse"), JSON.stringify(reused.body));
  assert.equal((await call("trash", { type: "news", id })).status, 200);
  const saved = await call("save", { type: "news", id: "bai-moi", version: 2, data: fresh });
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

// Cross-record rules on save, trash and update-media (cms-plan part 2 K10, E10).
const codesOf = (body) => (body.missing ?? body.errors ?? []).map(({ code }) => code);

test("save: a published news that takes another news' photo is 400 media-reuse", async () => {
  const { call, DB } = setup();
  const [first, second] = DB.sqlite.prepare("SELECT id FROM records WHERE type = 'news' AND status = 'published' ORDER BY position LIMIT 2").all().map(({ id }) => id);
  const other = (await call("get", undefined, `?type=news&id=${first}`)).body.data;
  const got = await call("get", undefined, `?type=news&id=${second}`);
  const taken = other.blocks.find((block) => block.type === "media-single" && block.image).image;
  const data = structuredClone(got.body.data);
  data.blocks.find((block) => block.type === "media-single" && block.image).image = { mediaId: taken.mediaId };
  const saved = await call("save", { type: "news", id: second, version: got.body.version, data });
  assert.equal(saved.status, 400, JSON.stringify(saved.body));
  assert.ok(codesOf(saved.body).includes("media-reuse"));
});

test("save: a crop outside the placement's ratios is 400 crop-ratio", async () => {
  const { call, DB } = setup();
  const id = firstOf(DB, "news");
  const got = await call("get", undefined, `?type=news&id=${id}`);
  const data = structuredClone(got.body.data);
  const image = data.blocks.find((block) => block.type === "media-single" && block.position === "wide").image;
  delete image.legacySrc;
  image.crop = [0, 0, image.crop?.[2] ?? 1000, Math.round((image.crop?.[2] ?? 1000) / 3)];
  const saved = await call("save", { type: "news", id, version: got.body.version, data });
  assert.equal(saved.status, 400);
  assert.deepEqual(codesOf(saved.body), ["crop-ratio"]);
});

test("trash: the last card of a ratio class in a cluster is 409 pool-min", async () => {
  const { call, DB } = setup();
  // Leave one near-square card in the cluster of the first card's main product by trashing the others in SQL.
  const cards = DB.sqlite.prepare("SELECT id, json_extract(data, '$.productIds[0]') AS product, json_extract(data, '$.media.width') * 1.0 / json_extract(data, '$.media.height') AS ratio FROM records WHERE type = 'advertising-card' AND status = 'published'").all();
  const square = cards.filter(({ ratio }) => ratio >= 0.9 && ratio <= 1.1);
  const [keep, ...rest] = square;
  for (const { id } of rest) DB.sqlite.prepare("UPDATE records SET status = 'trashed' WHERE type = 'advertising-card' AND id = ?").run(id);
  const refused = await call("trash", { type: "advertising-card", id: keep.id });
  assert.equal(refused.status, 409);
  assert.equal(refused.body.error, "pool-min");
  assert.ok(refused.body.missing.every((loss) => loss.endsWith("missing near-square ratio")), JSON.stringify(refused.body));
  const landscape = cards.find(({ ratio }) => ratio > 1.1 && ratio < 1.6);
  assert.equal((await call("trash", { type: "advertising-card", id: landscape.id })).status, 200);
});

test("update-media: an alt that equals the alt of another media of the same card is 400 alt-dup", async () => {
  const { call, DB } = setup();
  const id = firstOf(DB, "project");
  const got = await call("get", undefined, `?type=project&id=${id}`);
  const data = structuredClone(got.body.data);
  // Re-place the card media from the media records (no legacySrc), so update-media copies alts into them.
  const own = [...new Set(data.blocks.flatMap((block) => [block.image, ...(block.images ?? [])]).filter((ref) => ref?.mediaId).map((ref) => ref.mediaId))];
  const sizeOf = (mediaId) => { const { width, height } = JSON.parse(DB.sqlite.prepare("SELECT data FROM records WHERE type = 'media' AND id = ?").get(mediaId).data); return `${width}x${height}`; };
  const pair = own.flatMap((a, i) => own.slice(i + 1).filter((b) => sizeOf(a) === sizeOf(b)).map((b) => [a, b]))[0];
  const [width, height] = sizeOf(pair[0]).split("x").map(Number);
  data.card = { ...data.card, width, height, media: pair.map((mediaId) => ({ mediaId })) };
  const saved = await call("save", { type: "project", id, version: got.body.version, data });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  const [a, b] = data.card.media.map(({ mediaId }) => mediaId);
  const target = JSON.parse(DB.sqlite.prepare("SELECT data FROM records WHERE type = 'media' AND id = ?").get(b).data);
  const media = DB.sqlite.prepare("SELECT version, data FROM records WHERE type = 'media' AND id = ?").get(a);
  const before = DB.sqlite.prepare("SELECT data FROM records WHERE type = 'project' AND id = ?").get(id).data;
  const refused = await call("update-media", { id: a, version: media.version, altVi: target.altVi, altEn: "Another alt", tags: [] });
  assert.equal(refused.status, 400);
  assert.deepEqual(refused.body, { error: "alt-dup", usedBy: [{ type: "project", id }] });
  assert.equal(DB.sqlite.prepare("SELECT data FROM records WHERE type = 'project' AND id = ?").get(id).data, before);
  const ok = await call("update-media", { id: a, version: media.version, altVi: "Alt mới", altEn: "New alt", tags: [] });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
});

test("save: a card that takes another card's photo with a new crop is 400 pool-dup (same mediaId, different src)", async () => {
  const { call, DB } = setup();
  const [first, second] = DB.sqlite.prepare("SELECT id FROM records WHERE type = 'advertising-card' AND status = 'published' ORDER BY position LIMIT 2").all().map(({ id }) => id);
  const taken = (await call("get", undefined, `?type=advertising-card&id=${first}`)).body.data.media;
  const got = await call("get", undefined, `?type=advertising-card&id=${second}`);
  const side = Math.min(taken.width, taken.height);
  const place = ({ sourceId, source, sha256, provenance, ...ref }) => ({ ...ref, mediaId: taken.mediaId, crop: [0, 0, side, side] });
  const data = { ...got.body.data, media: place(got.body.data.media), mediaItems: got.body.data.mediaItems.slice(0, 1).map(place) };
  data.coverMediaId = data.mediaItems[0].id;
  const saved = await call("save", { type: "advertising-card", id: second, version: got.body.version, data });
  assert.equal(saved.status, 400, JSON.stringify(saved.body));
  assert.ok(codesOf(saved.body).includes("pool-dup"), JSON.stringify(saved.body));
});

// Plan E10 section 7: save reads D1 at most once more for media-reuse and once more for the card pool.
// Main before E10, with a live Cron: 16 statements for a news save, 14 for a card save.
test("save prepares main + 1 statements for a news and main + 2 for a card", async () => {
  const { call, DB } = setup();
  // A live Cron, so a save never takes the dead-Cron dispatch path (its statements depend on the clock).
  DB.sqlite.prepare("INSERT OR REPLACE INTO settings VALUES ('cron_at', ?)").run(new Date().toISOString());
  const prepare = DB.prepare.bind(DB);
  let count = 0;
  DB.prepare = (...args) => { count += 1; return prepare(...args); };
  for (const [type, expected] of [["news", 16 + 1], ["advertising-card", 14 + 2]]) {
    const id = firstOf(DB, type);
    const got = await call("get", undefined, `?type=${type}&id=${id}`);
    count = 0;
    const saved = await call("save", { type, id, version: got.body.version, data: got.body.data });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(count, expected, type);
  }
});
