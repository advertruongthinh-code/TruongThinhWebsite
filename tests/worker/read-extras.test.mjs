// retry-variant, context and the read fields of get, list, audit-log, build-status (CMS plan part 2 K11, E11).
import assert from "node:assert/strict";
import test from "node:test";
import { isStagingBehind } from "../../src/worker/commands/build-status.mjs";
import { COMMANDS } from "../../src/worker/router.mjs";
import { seededEnv } from "./worker-env.mjs";

const key = (char) => char.repeat(32);

// Three placements of one project, each on its own variant.
function withVariants(t, statuses = ["ready", "pending", "error"]) {
  const project = t.one("SELECT id FROM records WHERE type = 'project' ORDER BY position LIMIT 1").id;
  const media = t.one("SELECT id FROM records WHERE type = 'media' LIMIT 1").id;
  statuses.forEach((status, index) => {
    const k = key("abc"[index]);
    t.DB.sqlite.prepare("INSERT INTO variants (key, media_id, crop, status, error, created_at) VALUES (?, ?, '0,0,1,1', ?, ?, '2026-11-22T00:00:00.000Z')").run(k, media, status, status === "error" ? "timeout" : null);
    t.DB.sqlite.prepare("INSERT INTO record_media (type, id, media_id, variant_key) VALUES ('project', ?, ?, ?)").run(project, media, k);
  });
  return { project, media };
}

test("get lists every variant the record uses", async () => {
  const t = seededEnv();
  const { project, media } = withVariants(t);
  const got = await t.call("get", undefined, `?type=project&id=${project}`);
  assert.equal(got.status, 200);
  assert.deepEqual(got.body.variants, [
    { key: key("a"), mediaId: media, status: "ready", error: null },
    { key: key("b"), mediaId: media, status: "pending", error: null },
    { key: key("c"), mediaId: media, status: "error", error: "timeout" },
  ]);
  assert.equal((await t.call("get", undefined, "?type=project&id=no-such")).status, 404);
});

test("retry-variant: error goes back to pending and is dispatched; ready is 409, unknown 404; each has an audit row", async () => {
  const t = seededEnv();
  withVariants(t);
  const ok = await t.call("retry-variant", { key: key("c") });
  assert.equal(ok.status, 202);
  assert.deepEqual(t.one("SELECT status, error FROM variants WHERE key = ?", key("c")), { status: "pending", error: null });
  await Promise.all(t.waits);
  assert.ok(t.one("SELECT value FROM settings WHERE key = 'dispatch_error:cms-variants.yml'"), "dispatch was attempted");
  assert.deepEqual((await t.call("retry-variant", { key: key("a") })).body, { error: "not-error" });
  assert.equal((await t.call("retry-variant", { key: key("d") })).status, 404);
  assert.equal((await t.call("retry-variant", { key: "short" })).status, 400);
  assert.equal((await t.call("retry-variant", null)).status, 400, "a null body is a 400 with an audit row, not a 503");
  assert.deepEqual(t.one("SELECT status FROM variants WHERE key = ?", key("a")), { status: "ready" });
  assert.deepEqual(t.audits(), ["retry-variant ok", "retry-variant 409 not-error", "retry-variant 404 not-found", "retry-variant 400 shape", "retry-variant 400 shape"]);
});

test("list gives enMissing from the column, variantError, and who trashed a trashed record", async () => {
  const t = seededEnv();
  const { project } = withVariants(t);
  const news = t.one("SELECT id FROM records WHERE type = 'news' ORDER BY position LIMIT 1").id;
  const got = await t.call("get", undefined, `?type=news&id=${news}`);
  const data = { ...got.body.data, description: { ...got.body.data.description, en: "" } };
  const saved = await t.call("save", { type: "news", id: news, version: got.body.version, data });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(t.one("SELECT en_missing FROM records WHERE type = 'news' AND id = ?", news).en_missing, 1);
  const items = (await t.call("list", undefined, "?type=news")).body.items;
  assert.deepEqual(items.filter((item) => item.enMissing).map((item) => item.id), [news]);
  const projects = (await t.call("list", undefined, "?type=project")).body.items;
  assert.deepEqual(projects.filter((item) => item.variantError).map((item) => item.id), [project]);
  const other = projects.find((item) => item.id !== project && !["menu"].includes(item.id));
  t.DB.sqlite.prepare("UPDATE records SET status = 'trashed', prev_status = 'published', trashed_at = '2026-11-23T01:00:00.000Z', updated_by = 'staff@example.com' WHERE type = 'project' AND id = ?").run(other.id);
  const trashed = (await t.call("list", undefined, "?type=project&status=trashed")).body.items;
  assert.deepEqual(trashed.map(({ id, trashedBy, trashedAt }) => ({ id, trashedBy, trashedAt })), [{ id: other.id, trashedBy: "staff@example.com", trashedAt: "2026-11-23T01:00:00.000Z" }]);
  assert.equal(projects[0].trashedBy, undefined);
});

test("list gives the editor slugVi, the News date and the card's main product", async () => {
  const t = seededEnv();
  const news = t.one("SELECT id, slug_vi, json_extract(data, '$.published') AS published FROM records WHERE type = 'news' ORDER BY position LIMIT 1");
  const item = (await t.call("list", undefined, "?type=news")).body.items.find((entry) => entry.id === news.id);
  assert.deepEqual([item.slugVi, item.published, item.product], [news.slug_vi, news.published, undefined]);
  const card = t.one("SELECT id, json_extract(data, '$.productIds[0]') AS product FROM records WHERE type = 'advertising-card' ORDER BY position LIMIT 1");
  const listed = (await t.call("list", undefined, "?type=advertising-card")).body.items[0];
  assert.deepEqual([listed.id, listed.product, listed.slugVi, listed.published], [card.id, card.product, undefined, undefined]);
  assert.ok(card.product);
});

test("list reads a 100-row page with one D1 query", async () => {
  let selects = 0;
  const t = seededEnv();
  const prepare = t.DB.prepare;
  t.DB.prepare = (sql) => { if (/^\s*select/i.test(sql)) selects += 1; return prepare(sql); };
  const listed = await t.call("list", undefined, "?type=advertising-card");
  assert.equal(listed.body.items.length, 100);
  // One for the account lookup of requireActor, one for the page.
  assert.ok(selects <= 2, `${selects} selects`);
});

test("audit-log: staff only ever see their own rows; owner filters by email and command", async () => {
  const t = seededEnv();
  const row = t.DB.sqlite.prepare("INSERT INTO audit_log (at, email, command, result) VALUES ('2026-11-23T00:00:00.000Z', ?, ?, 'ok')");
  row.run("owner@example.com", "save");
  row.run("staff@example.com", "save");
  row.run("staff@example.com", "trash");
  // The local dev login is always owner, so the staff actor is passed straight to the command.
  const url = new URL("http://127.0.0.1/api/admin/audit-log?email=owner@example.com&command=save");
  const staff = await COMMANDS["audit-log"].run(new Request(url), t.env, {}, { email: "staff@example.com", role: "staff" }, url);
  assert.deepEqual((await staff.json()).items.map(({ email, command }) => `${email} ${command}`), ["staff@example.com save"]);
  const byEmail = await t.call("audit-log", undefined, "?email=Staff@example.com&command=save");
  assert.deepEqual(byEmail.body.items.map(({ email, command }) => `${email} ${command}`), ["staff@example.com save"]);
  assert.equal((await t.call("audit-log", undefined, "?command=DROP%20TABLE")).status, 400);
});

test("context returns the data of published news and projects as the build reads it", async () => {
  const t = seededEnv();
  const news = t.one("SELECT id FROM records WHERE type = 'news' ORDER BY position LIMIT 1").id;
  t.DB.sqlite.prepare("UPDATE records SET status = 'draft' WHERE type = 'news' AND id = ?").run(news);
  const reply = await t.call("context");
  assert.equal(reply.status, 200);
  const count = (type) => t.one("SELECT COUNT(*) AS n FROM records WHERE type = ? AND status = 'published'", type).n;
  assert.equal(reply.body.news.length, count("news"));
  assert.equal(reply.body.projects.length, count("project"));
  assert.ok(!reply.body.news.some((item) => item.id === news));
  assert.deepEqual(reply.body.projects[0], JSON.parse(t.one("SELECT data FROM records WHERE type = 'project' AND status = 'published' ORDER BY position, id LIMIT 1").data));
});

test("build-status lists held records and says when staging lags the last save or reorder", async () => {
  const t = seededEnv();
  const project = t.one("SELECT id, name FROM records WHERE type = 'project' ORDER BY position LIMIT 1");
  t.DB.sqlite.prepare("UPDATE records SET pending = 2 WHERE type = 'project' AND id = ?").run(project.id);
  t.env.MEDIA_PUBLIC = { list: async () => ({ objects: [] }), get: async () => null };
  const first = (await t.call("build-status")).body;
  assert.deepEqual(first.held, [{ type: "project", id: project.id, name: project.name, pending: 2 }]);
  assert.equal(first.stagingBehind, true, "no deployment yet");
  const marker = { snapshotAt: "2026-11-23T00:00:00.000Z" };
  t.env.MEDIA_PUBLIC = { list: async () => ({ objects: [{ key: "deploys/1.json" }] }), get: async () => ({ json: async () => marker }) };
  assert.equal((await t.call("build-status")).body.stagingBehind, false, "seed is older than the snapshot");
  const ids = t.all("SELECT id FROM records WHERE type = 'client-logo' ORDER BY position").map((row) => row.id).reverse();
  assert.equal((await t.call("reorder", { type: "client-logo", ids })).status, 200);
  const after = (await t.call("build-status")).body;
  assert.equal(after.lastSaveAt, t.one("SELECT value FROM settings WHERE key = 'last_save_at'").value);
  assert.equal(after.stagingBehind, false, "a reorder just now still has 10 minutes to reach staging");
  t.DB.sqlite.exec("UPDATE settings SET value = '2026-11-23T00:05:00.000Z' WHERE key = 'last_save_at'");
  assert.equal((await t.call("build-status")).body.stagingBehind, true, "saved after the snapshot and not built since");
});

test("stagingBehind: a save after the snapshot counts once it is 10 minutes old, however close to the snapshot it was", () => {
  const deployments = [{ snapshotAt: "2026-11-23T10:00:00.000Z" }];
  const at = (time) => Date.parse(`2026-11-23T${time}Z`);
  assert.equal(isStagingBehind("2026-11-23T10:05:00.000Z", deployments, at("10:14:00")), false);
  assert.equal(isStagingBehind("2026-11-23T10:05:00.000Z", deployments, at("10:16:00")), true);
  assert.equal(isStagingBehind("2026-11-23T09:59:00.000Z", deployments, at("12:00:00")), false);
  assert.equal(isStagingBehind(null, deployments, at("12:00:00")), false);
  assert.equal(isStagingBehind("2026-11-23T09:00:00.000Z", [], at("12:00:00")), true);
});
