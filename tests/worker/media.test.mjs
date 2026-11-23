// Media commands (CMS plan P2, Q6, Q9): upload-media, update-media, media-list, media-file, media-original.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { seedSql } from "../../scripts/cms/seed.mjs";
import { variantKey } from "../../src/cms/media-ref.mjs";
import { dispatchVariants } from "../../src/worker/dispatch.mjs";
import worker from "../../src/worker/index.js";
import { createD1 } from "./d1-fake.mjs";
import { createR2 } from "./r2-fake.mjs";

const SCHEMA = fileURLToPath(new URL("../../src/db/migrations/0001_cms.sql", import.meta.url));
const SEED = await seedSql({ now: "2026-11-22T00:00:00.000Z" });
const ORIGIN = "http://127.0.0.1:8787";
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([40, 0, 0, 0]), Buffer.from("WEBP"), Buffer.alloc(40, 7)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 1)]);
const QUERY = "slugBase=can-ho&width=3000&height=2000&altVi=Phong+khach&altEn=Living+room";

function setup() {
  const DB = createD1(SCHEMA);
  DB.sqlite.exec(SEED);
  DB.sqlite.prepare("INSERT INTO accounts VALUES ('owner@example.com', 'owner', 'active', 'x', 'x', 'x', 'x')").run();
  const env = {
    DB,
    MEDIA_ORIGINALS: createR2(),
    CMS_LOCAL_ADMIN_EMAIL: "owner@example.com",
    ADMIN_WRITE_LIMIT: { limit: async () => ({ success: true }) },
    ADMIN_UPLOAD_LIMIT: { limit: async () => ({ success: true }) },
    ASSETS: { fetch: async () => new Response("asset") },
  };
  const send = (path, init = {}) => worker.fetch(new Request(`${ORIGIN}/api/admin/${path}`, init), env, { waitUntil() {} });
  const upload = (bytes, { type = "image/webp", query = QUERY, length = bytes.length } = {}) => {
    const headers = { "Content-Type": type, Origin: ORIGIN, ...(length === null ? {} : { "Content-Length": String(length) }) };
    return send(`upload-media?${query}`, { method: "POST", headers, body: bytes, duplex: "half" });
  };
  const post = (command, body) => send(command, { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN }, body: JSON.stringify(body) });
  const get = async (path) => {
    const response = await send(path);
    return { status: response.status, headers: response.headers, body: response.headers.get("Content-Type")?.startsWith("application/json") ? await response.json() : Buffer.from(await response.arrayBuffer()) };
  };
  const row = (type, id) => DB.sqlite.prepare("SELECT * FROM records WHERE type = ? AND id = ?").get(type, id);
  const audits = () => DB.sqlite.prepare("SELECT command, result FROM audit_log ORDER BY seq").all().map((a) => `${a.command} ${a.result}`);
  const rev = () => DB.sqlite.prepare("SELECT value FROM settings WHERE key = 'content_rev'").get()?.value;
  return { env, DB, send, upload, post, get, row, audits, rev };
}

const json = async (response) => ({ status: response.status, body: await response.json() });

test("a valid WebP upload writes the original, the media record, a pending variant with a string crop, audit and content_rev", async () => {
  const { upload, env, row, DB, audits, rev } = setup();
  const { status, body } = await json(await upload(WEBP));
  assert.equal(status, 201, JSON.stringify(body));
  assert.equal(body.id, "can-ho-01");
  assert.equal(body.status, "published");
  assert.equal(body.version, 1);
  assert.equal(body.variant.status, "pending");
  const data = JSON.parse(row("media", "can-ho-01").data);
  assert.match(data.originalKey, /^originals\/can-ho-01\/[0-9a-f-]{36}\.webp$/);
  assert.ok(env.MEDIA_ORIGINALS.objects.has(data.originalKey));
  assert.match(data.hash, /^md5:[0-9a-f]{32}$/);
  assert.deepEqual([data.source, data.originalKey, data.mime, data.bytes, data.width, data.height], ["r2", data.originalKey, "image/webp", WEBP.length, 3000, 2000]);
  assert.equal(body.variant.key, await variantKey(data.hash, [0, 0, 3000, 2000]));
  const variant = DB.sqlite.prepare("SELECT * FROM variants WHERE media_id = 'can-ho-01'").get();
  assert.deepEqual([variant.key, variant.crop, variant.status], [body.variant.key, "0,0,3000,2000", "pending"]);
  assert.equal(DB.sqlite.prepare("SELECT COUNT(*) AS n FROM versions WHERE type = 'media' AND id = 'can-ho-01'").get().n, 1);
  assert.deepEqual(audits(), ["upload-media ok"]);
  assert.equal(rev(), "1");
  const second = await json(await upload(WEBP));
  assert.equal(second.body.id, "can-ho-02");
  assert.equal(second.body.variant.status, "pending");
});

test("an upload without alts is a draft", async () => {
  const { upload } = setup();
  const { body } = await json(await upload(WEBP, { query: "slugBase=x&width=10&height=10" }));
  assert.equal(body.status, "draft");
});

test("PNG bytes sent as image/webp are 400 and the object is deleted", async () => {
  const { upload, env, row, audits } = setup();
  const { status, body } = await json(await upload(PNG));
  assert.deepEqual([status, body.error], [400, "bytes"]);
  assert.equal(env.MEDIA_ORIGINALS.objects.size, 0);
  assert.equal(row("media", "can-ho-01"), undefined);
  assert.deepEqual(audits(), ["upload-media 400 bytes"]);
});

test("a 26 MB Content-Length is 413 before the body is read", async () => {
  const { upload, env } = setup();
  const body = new ReadableStream({ pull() { throw new Error("body must not be read"); } });
  const response = await upload(body, { length: 26 * 1024 * 1024 });
  assert.equal(response.status, 413);
  assert.equal(env.MEDIA_ORIGINALS.objects.size, 0);
});

test("image/svg+xml is 415, a missing Content-Length is 411", async () => {
  const { upload } = setup();
  assert.equal((await upload(WEBP, { type: "image/svg+xml" })).status, 415);
  const response = await upload(WEBP, { length: null });
  assert.equal(response.status, 411);
});

test("a bad query is 400 and nothing is stored", async () => {
  const { upload, env } = setup();
  for (const query of ["slugBase=Bad_Slug&width=1&height=1", "slugBase=a&width=0&height=1", "slugBase=a&width=1&height=20001", `slugBase=a&width=1&height=1&altVi=${"x".repeat(301)}`]) {
    assert.equal((await upload(WEBP, { query })).status, 400, query);
  }
  assert.equal(env.MEDIA_ORIGINALS.objects.size, 0);
});

test("the 21st upload in a minute is 429 from the limiter", async () => {
  const { upload, env } = setup();
  let calls = 0;
  env.ADMIN_UPLOAD_LIMIT = { limit: async () => ({ success: ++calls <= 20 }) };
  for (let n = 1; n <= 20; n++) assert.equal((await upload(WEBP)).status, 201);
  assert.equal((await upload(WEBP)).status, 429);
});

// A media used by a news (cover plus a legacySrc placement) and by a project (cover).
async function withUsers() {
  const t = setup();
  const { body } = await json(await t.upload(WEBP));
  const placement = (extra = {}) => ({ mediaId: body.id, src: "/v/x.webp", width: 1, height: 1, altVi: "cu", altEn: "old", ...extra });
  const news = t.DB.sqlite.prepare("SELECT id, data FROM records WHERE type = 'news' LIMIT 1").get();
  const project = t.DB.sqlite.prepare("SELECT id, data FROM records WHERE type = 'project' LIMIT 1").get();
  const keep = placement({ legacySrc: "/v/x.webp", altVi: "giu", altEn: "keep" });
  for (const [type, record, data] of [["news", news, { cover: placement(), blocks: [{ image: keep }] }], ["project", project, { cover: placement() }]]) {
    t.DB.sqlite.prepare("UPDATE records SET data = ? WHERE type = ? AND id = ?").run(JSON.stringify({ ...JSON.parse(record.data), ...data }), type, record.id);
    t.DB.sqlite.prepare("INSERT INTO record_media VALUES (?, ?, ?, '')").run(type, record.id, body.id);
  }
  return { ...t, id: body.id, news: news.id, project: project.id, keep };
}

test("update-media rewrites the alts in every record that uses it, keeps legacySrc and versions, raises content_rev", async () => {
  const t = await withUsers();
  const versions = ["news", "project"].map((type) => t.DB.sqlite.prepare("SELECT version FROM records WHERE type = ? LIMIT 1").get(type).version);
  const before = t.rev();
  const { status, body } = await json(await t.post("update-media", { id: t.id, version: 1, altVi: "Moi", altEn: "New", tags: ["a"] }));
  assert.deepEqual([status, body], [200, { version: 2, status: "published", updatedRecords: 2 }]);
  const news = JSON.parse(t.row("news", t.news).data);
  assert.deepEqual([news.cover.altVi, news.cover.altEn], ["Moi", "New"]);
  assert.deepEqual([news.blocks[0].image.altVi, news.blocks[0].image.altEn], ["giu", "keep"]);
  assert.deepEqual([JSON.parse(t.row("project", t.project).data).cover.altVi], ["Moi"]);
  assert.deepEqual(["news", "project"].map((type) => t.DB.sqlite.prepare("SELECT version FROM records WHERE type = ? LIMIT 1").get(type).version), versions);
  assert.deepEqual(JSON.parse(t.row("media", t.id).data).tags, ["a"]);
  assert.equal(Number(t.rev()), Number(before) + 1);
  assert.deepEqual(t.audits().at(-1), "update-media ok");
});

test("clearing an alt of a media in use is 409 in-use; a stale version is 409 version", async () => {
  const t = await withUsers();
  const cleared = await json(await t.post("update-media", { id: t.id, version: 1, altVi: "", altEn: "New", tags: [] }));
  assert.deepEqual([cleared.status, cleared.body.error], [409, "in-use"]);
  assert.equal(JSON.parse(t.row("media", t.id).data).altVi, "Phong khach");
  const stale = await json(await t.post("update-media", { id: t.id, version: 7, altVi: "a", altEn: "b", tags: [] }));
  assert.deepEqual([stale.status, stale.body.error, stale.body.current.version], [409, "version", 1]);
});

test("update-media on an unused media may clear an alt and then it is a draft; an errored variant goes back to pending", async () => {
  const t = setup();
  const { body } = await json(await t.upload(WEBP));
  t.DB.sqlite.prepare("UPDATE variants SET status = 'error', error = 'size' WHERE media_id = ?").run(body.id);
  const done = await json(await t.post("update-media", { id: body.id, version: 1, altVi: "", altEn: "x", tags: [] }));
  assert.deepEqual([done.status, done.body.status], [200, "draft"]);
  const variant = t.DB.sqlite.prepare("SELECT status, error FROM variants WHERE media_id = ?").get(body.id);
  assert.deepEqual({ ...variant }, { status: "pending", error: null });
});

test("update-media is 409 retry and writes nothing when a user record is saved meanwhile", async () => {
  const t = await withUsers();
  const batch = t.DB.batch;
  t.DB.batch = (statements) => {
    t.DB.sqlite.prepare("UPDATE records SET write_id = 'other-save', data = json_set(data, '$.x', 1) WHERE type = 'news' AND id = ?").run(t.news);
    return batch(statements);
  };
  const { status, body } = await json(await t.post("update-media", { id: t.id, version: 1, altVi: "Moi", altEn: "New", tags: [] }));
  assert.deepEqual([status, body.error], [409, "retry"]);
  assert.equal(JSON.parse(t.row("news", t.news).data).x, 1);
  assert.equal(t.row("media", t.id).version, 1);
});

test("a media used by more than 37 records is 409 too-many-uses", async () => {
  const t = await withUsers();
  for (let n = 0; n < 41; n++) t.DB.sqlite.prepare("INSERT INTO record_media VALUES ('news', ?, ?, '')").run(`extra-${n}`, t.id);
  for (let n = 0; n < 41; n++) {
    t.DB.sqlite.prepare("INSERT INTO records SELECT type, ?, status, prev_status, version, live_version, pending, position, ?, NULL, NULL, data, write_id, created_at, created_by, updated_at, updated_by, trashed_at FROM records WHERE type = 'news' AND id = ?").run(`extra-${n}`, `extra-${n}`, t.news);
  }
  const { status, body } = await json(await t.post("update-media", { id: t.id, version: 1, altVi: "a", altEn: "b", tags: [] }));
  assert.deepEqual([status, body.error], [409, "too-many-uses"]);
});

test("media-list pages media sharing one updated_at without gaps or repeats and gives the full-crop variant", async () => {
  const t = setup();
  t.DB.sqlite.exec("DELETE FROM records WHERE type = 'media'");
  const insert = t.DB.sqlite.prepare("INSERT INTO records VALUES ('media', ?, 'published', NULL, 1, 1, 0, 0, ?, NULL, NULL, ?, 'w', 't', 'u', '2026-11-22T00:00:00.000Z', 'u', NULL)");
  const ids = Array.from({ length: 103 }, (_, n) => `m-${String(n).padStart(3, "0")}`);
  for (const id of ids) insert.run(id, id, JSON.stringify({ id, source: "r2", width: 4, height: 3 }));
  t.DB.sqlite.prepare("INSERT INTO variants (key, media_id, crop, status, error, created_at) VALUES (?, 'm-000', '0,0,4,3', 'error', 'size', 't')").run("a".repeat(32));
  t.DB.sqlite.prepare("INSERT INTO variants (key, media_id, crop, status, created_at) VALUES (?, 'm-000', '0,0,2,2', 'ready', 't')").run("b".repeat(32));
  t.DB.sqlite.prepare("INSERT INTO record_media VALUES ('news', 'n1', 'm-000', ''), ('news', 'n1', 'm-000', 'k'), ('project', 'p1', 'm-000', '')").run();
  const first = await t.get("media-list");
  assert.equal(first.body.items.length, 100);
  assert.ok(first.body.next);
  const second = await t.get(`media-list?cursor=${encodeURIComponent(first.body.next)}`);
  assert.equal(second.body.next, null);
  assert.deepEqual([...first.body.items, ...second.body.items].map((item) => item.id), ids);
  const [head] = first.body.items;
  assert.deepEqual(head.variant, { key: "a".repeat(32), status: "error", error: "size" });
  assert.equal(head.usedByCount, 2);
  assert.equal(first.body.items[1].variant, null);
  assert.equal((await t.get("media-list?q=m-10")).body.items.length, 3);
});

test("media-file returns the original with nosniff and sandbox headers, honours Range, redirects repo media", async () => {
  const t = setup();
  const { body } = await json(await t.upload(WEBP));
  const full = await t.get(`media-file?id=${body.id}`);
  assert.deepEqual([full.status, full.headers.get("Content-Type"), full.body.equals(WEBP)], [200, "image/webp", true]);
  assert.equal(full.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(full.headers.get("Content-Security-Policy"), "sandbox");
  assert.equal(full.headers.get("Cache-Control"), "private, no-store");
  const part = await json2(t.send(`media-file?id=${body.id}`, { headers: { Range: "bytes=4-7" } }));
  assert.deepEqual([part.status, part.range, part.bytes.equals(WEBP.subarray(4, 8))], [206, `bytes 4-7/${WEBP.length}`, true]);
  const repoId = t.DB.sqlite.prepare("SELECT id, json_extract(data, '$.path') AS path FROM records WHERE type = 'media' AND json_extract(data, '$.source') = 'repo' LIMIT 1").get();
  const repo = await t.send(`media-file?id=${repoId.id}`);
  assert.deepEqual([repo.status, repo.headers.get("Location")], [302, repoId.path]);
  assert.equal((await t.send("media-file?id=nope")).status, 404);
});

async function json2(promise) {
  const response = await promise;
  return { status: response.status, range: response.headers.get("Content-Range"), bytes: Buffer.from(await response.arrayBuffer()) };
}

test("media-original answers a service token with bytes and X-Hash, a user session gets 403, and repo media is 404", async () => {
  const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...(await crypto.subtle.exportKey("jwk", pair.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }), { headers: { "content-type": "application/json" } });
  try {
    const t = setup();
    const { body } = await json(await t.upload(WEBP));
    const team = "https://team.cloudflareaccess.com";
    const b64 = (value) => Buffer.from(value).toString("base64url");
    const claims = { iss: team, aud: ["service-aud"], exp: Math.floor(Date.now() / 1000) + 300, common_name: "client-1.access" };
    const signed = `${b64(JSON.stringify({ alg: "RS256", kid: "k1" }))}.${b64(JSON.stringify(claims))}`;
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(signed));
    const service = { ...t.env, CMS_LOCAL_ADMIN_EMAIL: "", ACCESS_TEAM_DOMAIN: team, ACCESS_SERVICE_AUD: "service-aud", SERVICE_TOKEN_CLIENT_ID: "client-1.access" };
    const ask = (id) => worker.fetch(new Request(`https://admin.example.test/api/admin/media-original?id=${id}`, { headers: { "Cf-Access-Jwt-Assertion": `${signed}.${b64(new Uint8Array(signature))}` } }), service, { waitUntil() {} });
    const ok = await ask(body.id);
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("X-Hash"), JSON.parse(t.row("media", body.id).data).hash);
    assert.ok(Buffer.from(await ok.arrayBuffer()).equals(WEBP));
    const repoId = t.DB.sqlite.prepare("SELECT id FROM records WHERE type = 'media' AND json_extract(data, '$.source') = 'repo' LIMIT 1").get().id;
    assert.equal((await ask(repoId)).status, 404);
    assert.equal((await t.send(`media-original?id=${body.id}`)).status, 403);
  } finally {
    globalThis.fetch = realFetch;
  }
});

// Video upload (CMS plan P9, Q6 "Video"): MP4 with a same-ratio poster image.
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypisom"), Buffer.alloc(60, 3)]);
const AVIF = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypavif"), Buffer.alloc(60, 3)]);
const POSTER_QUERY = "slugBase=poster&width=1600&height=900&altVi=Poster&altEn=Poster";
const videoQuery = (posterId) => `slugBase=clip&width=1920&height=1080&duration=12.5&altVi=Video&altEn=Video${posterId ? `&posterId=${posterId}` : ""}`;

async function withPoster() {
  const t = setup();
  const poster = await json(await t.upload(WEBP, { query: POSTER_QUERY }));
  assert.equal(poster.status, 201);
  return { ...t, posterId: poster.body.id, video: (bytes = MP4, query = videoQuery(poster.body.id)) => t.upload(bytes, { type: "video/mp4", query }) };
}

test("a valid MP4 creates a video media with duration, posterId and one record_media row to the poster", async () => {
  const t = await withPoster();
  const { status, body } = await json(await t.video());
  assert.equal(status, 201, JSON.stringify(body));
  const data = JSON.parse(t.row("media", body.id).data);
  assert.deepEqual([data.kind, data.mime, data.width, data.height, data.duration, data.posterId], ["video", "video/mp4", 1920, 1080, 12.5, t.posterId]);
  assert.match(data.originalKey, /^originals\/clip-01\/[0-9a-f-]{36}\.mp4$/);
  assert.equal(body.variant.key, await variantKey(data.hash, [0, 0, 1920, 1080]));
  assert.deepEqual(t.DB.sqlite.prepare("SELECT media_id, variant_key FROM record_media WHERE type = 'media' AND id = ?").all(body.id).map((r) => ({ ...r })), [{ media_id: t.posterId, variant_key: "" }]);
  const trash = await json(await t.post("trash", { type: "media", id: t.posterId, version: 1 }));
  assert.deepEqual([trash.status, trash.body.error], [409, "in-use"]);
});

test("a video without or with a bad duration or posterId is 400 and nothing is stored", async () => {
  const t = await withPoster();
  const before = t.env.MEDIA_ORIGINALS.objects.size;
  const good = videoQuery(t.posterId);
  for (const query of [videoQuery(""), good.replace("duration=12.5&", ""), good.replace("duration=12.5", "duration=0"), good.replace("duration=12.5", "duration=601"), good.replace("duration=12.5", "duration=abc")]) {
    assert.equal((await t.video(MP4, query)).status, 400, query);
  }
  assert.equal(t.env.MEDIA_ORIGINALS.objects.size, before);
});

test("an unknown, trashed or non-image poster is 400 poster", async () => {
  const t = await withPoster();
  const first = await json(await t.video());
  const poster = async (id) => (await json(await t.video(MP4, videoQuery(id)))).body.error;
  assert.equal(await poster("nope-01"), "poster");
  assert.equal(await poster(first.body.id), "poster");
  t.DB.sqlite.prepare("UPDATE records SET status = 'trashed' WHERE type = 'media' AND id = ?").run(t.posterId);
  assert.equal(await poster(t.posterId), "poster");
});

test("a 4:3 poster for a 16:9 video is 400 poster-ratio and R2 gets no new object", async () => {
  const t = setup();
  const poster = await json(await t.upload(WEBP, { query: "slugBase=poster&width=1200&height=900&altVi=P&altEn=P" }));
  const before = t.env.MEDIA_ORIGINALS.objects.size;
  const { status, body } = await json(await t.upload(MP4, { type: "video/mp4", query: videoQuery(poster.body.id) }));
  assert.deepEqual([status, body.error], [400, "poster-ratio"]);
  assert.equal(t.env.MEDIA_ORIGINALS.objects.size, before);
});

test("AVIF bytes sent as video/mp4 are 400 bytes and the object is deleted", async () => {
  const t = await withPoster();
  const before = t.env.MEDIA_ORIGINALS.objects.size;
  const { status, body } = await json(await t.video(AVIF));
  assert.deepEqual([status, body.error], [400, "bytes"]);
  assert.equal(t.env.MEDIA_ORIGINALS.objects.size, before);
});

test("a video Content-Length of 96 MB is 413 before the body is read", async () => {
  const t = await withPoster();
  const body = new ReadableStream({ pull() { throw new Error("body must not be read"); } });
  assert.equal((await t.upload(body, { type: "video/mp4", query: videoQuery(t.posterId), length: 96_000_000 })).status, 413);
});

test("dispatchVariants sends one video and two images as two runs; the video run is one item with k video and the full-frame crop", async () => {
  const t = await withPoster();
  const video = await json(await t.video());
  const image = await json(await t.upload(WEBP));
  const keys = [t.DB.sqlite.prepare("SELECT key FROM variants").all().map((row) => row.key)].flat();
  assert.equal(keys.length, 3);
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_url, init) => { calls.push(JSON.parse(JSON.parse(init.body).inputs.items)); return new Response(null, { status: 204 }); };
  try {
    await dispatchVariants({ ...t.env, GITHUB_ACTIONS_TOKEN: "token" }, keys);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.deepEqual(calls.map((items) => items.length).sort(), [1, 2]);
  assert.deepEqual(calls.find((items) => items.length === 1), [{ m: video.body.id, c: [0, 0, 1920, 1080], k: "video" }]);
  assert.ok(calls.find((items) => items.length === 2).every((item) => item.k === undefined && [image.body.id, t.posterId].includes(item.m)));
});

test("update-media of a poster does not rewrite the video record that points at it", async () => {
  const t = await withPoster();
  const video = await json(await t.video());
  const done = await json(await t.post("update-media", { id: t.posterId, version: 1, altVi: "Moi", altEn: "New", tags: [] }));
  assert.deepEqual([done.status, done.body.updatedRecords], [200, 0]);
  assert.equal(t.row("media", video.body.id).version, 1);
});

test("media-file honours Range on a video: 206 with 10 bytes and Content-Range, 200 without Range, Accept-Ranges on both", async () => {
  const t = await withPoster();
  const { body } = await json(await t.video());
  const part = await t.send(`media-file?id=${body.id}`, { headers: { Range: "bytes=0-9" } });
  assert.deepEqual([part.status, part.headers.get("Content-Range"), part.headers.get("Content-Length"), part.headers.get("Accept-Ranges")], [206, `bytes 0-9/${MP4.length}`, "10", "bytes"]);
  assert.ok(Buffer.from(await part.arrayBuffer()).equals(MP4.subarray(0, 10)));
  const full = await t.send(`media-file?id=${body.id}`);
  assert.deepEqual([full.status, full.headers.get("Accept-Ranges"), full.headers.get("Content-Type")], [200, "bytes", "video/mp4"]);
});
