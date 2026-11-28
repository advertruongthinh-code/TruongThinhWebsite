// Seed SQL (CMS plan S3): D1 seeded from the repo gives back the same site, and the guards keep CMS data safe.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { seedSql } from "../../scripts/cms/seed.mjs";
import { snapshotToFiles } from "../../src/cms/projection.mjs";
import { collectSnapshot } from "../../src/cms/collect-snapshot.mjs";
import snapshot from "../../src/worker/commands/snapshot.mjs";
import { createD1 } from "../worker/d1-fake.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SCHEMA = path.join(ROOT, "src/db/migrations");
const NOW = "2026-11-22T00:00:00.000Z";
const SEED = await seedSql({ now: NOW });
const FORCED = await seedSql({ now: NOW, force: true });

const seeded = () => {
  const DB = createD1(SCHEMA);
  DB.sqlite.exec(SEED);
  return DB;
};
const count = (DB, sql) => DB.sqlite.prepare(sql).get().n;
const recordCounts = (DB) => Object.fromEntries(DB.sqlite.prepare("SELECT type, COUNT(*) AS n FROM records GROUP BY type").all().map(({ type, n }) => [type, n]));
const tableCounts = (DB) => ["records", "versions", "record_media", "slug_history", "accounts", "audit_log"].map((table) => count(DB, `SELECT COUNT(*) AS n FROM ${table}`));

test("seed holds every open type of the repo", () => {
  const counts = recordCounts(seeded());
  assert.deepEqual(
    { news: counts.news, project: counts.project, "advertising-card": counts["advertising-card"], "hero-slide": counts["hero-slide"], menu: counts.menu, "home-projects": counts["home-projects"] },
    { news: 8, project: 18, "advertising-card": 205, "hero-slide": 25, menu: 1, "home-projects": 1 },
  );
  assert.ok(counts.media > 0);
});

test("every record links its media, and single records use id main", () => {
  const DB = seeded();
  assert.equal(count(DB, "SELECT COUNT(*) AS n FROM records WHERE type IN ('menu', 'home-projects') AND id != 'main'"), 0);
  assert.equal(count(DB, "SELECT COUNT(*) AS n FROM record_media WHERE variant_key != ''"), 0);
  assert.equal(count(DB, "SELECT COUNT(*) AS n FROM record_media rm LEFT JOIN records r ON r.type = 'media' AND r.id = rm.media_id WHERE r.id IS NULL"), 0);
  assert.equal(count(DB, "SELECT COUNT(*) AS n FROM records r WHERE r.type IN ('news', 'project', 'advertising-card', 'hero-slide') AND NOT EXISTS (SELECT 1 FROM record_media rm WHERE rm.type = r.type AND rm.id = r.id)"), 0);
  assert.equal(count(DB, "SELECT COUNT(*) AS n FROM records r JOIN versions v USING (type, id) WHERE v.data != r.data"), 0);
});

test("running the seed twice gives the same rows", () => {
  const DB = seeded();
  const before = tableCounts(DB);
  DB.sqlite.exec(SEED);
  assert.deepEqual(tableCounts(DB), before);
});

test("seed refuses to run once the CMS is live", () => {
  const DB = seeded();
  DB.sqlite.exec("INSERT INTO settings (key, value) VALUES ('cms_live', '1'); UPDATE records SET name = 'changed' WHERE type = 'menu'");
  assert.throws(() => DB.sqlite.exec(FORCED), /NOT NULL/);
  assert.equal(DB.sqlite.prepare("SELECT name FROM records WHERE type = 'menu'").get().name, "changed");
});

test("seed keeps accounts and the audit log", () => {
  const DB = createD1(SCHEMA);
  DB.sqlite.exec(`INSERT INTO accounts VALUES ('a@example.com', 'owner', 'active', '${NOW}', 'seed', '${NOW}', 'seed');
    INSERT INTO audit_log (at, email, command, result) VALUES ('${NOW}', 'a@example.com', 'save', 'ok');`);
  DB.sqlite.exec(SEED);
  assert.deepEqual(tableCounts(DB).slice(4), [1, 1]);
});

test("seed refuses to wipe records written through the CMS unless forced", () => {
  const DB = seeded();
  DB.sqlite.exec("UPDATE records SET created_by = 'a@example.com' WHERE type = 'menu'");
  const before = tableCounts(DB);
  assert.throws(() => DB.sqlite.exec(SEED), /NOT NULL/);
  assert.deepEqual(tableCounts(DB), before);
  DB.sqlite.exec(FORCED);
  assert.equal(count(DB, "SELECT COUNT(*) AS n FROM records WHERE created_by != 'seed'"), 0);
});

test("an apostrophe in the content survives the SQL quoting", () => {
  const DB = seeded();
  const sample = DB.sqlite.prepare("SELECT type, id, data FROM records WHERE data LIKE '%''%' LIMIT 1").get();
  assert.ok(sample, "the repo content has at least one apostrophe");
  assert.match(SEED, /''/);
  assert.equal(JSON.stringify(JSON.parse(sample.data)), sample.data);
});

test("the site built from the seeded D1 snapshot equals the site built from the repo", async () => {
  const DB = seeded();
  const get = async (query) => JSON.parse(await (await snapshot.run(new Request(`https://admin.test/api/admin/snapshot?${query}`), { DB })).text());
  const files = snapshotToFiles(await collectSnapshot(get));
  const work = mkdtempSync(path.join(tmpdir(), "tt-seed-"));
  let before, after;
  try {
    const content = path.join(work, "content");
    cpSync(path.join(ROOT, "src/site/content"), content, { recursive: true });
    for (const [name, value] of Object.entries(files)) writeFileSync(path.join(content, name), JSON.stringify(value, null, 2));
    // Both builds go to their own dirs so a parallel suite never sees the shared .site-output half written.
    // prepare:site only writes to a direct child of the repo root, so the dirs live there.
    const build = (out, env) => execFileSync("pnpm", ["-s", "prepare:site"], { cwd: ROOT, env: { ...process.env, TT_CONTENT_DIR: "", TT_SITE_OUT: out, ...env }, stdio: "pipe" });
    before = mkdtempSync(path.join(ROOT, ".site-output-seed-"));
    after = mkdtempSync(path.join(ROOT, ".site-output-seed-"));
    build(before, {});
    build(after, { TT_CONTENT_DIR: content });
    const diff = execFileSync("diff", ["-r", before, after], { encoding: "utf8" });
    assert.equal(diff, "");
  } finally {
    for (const dir of [work, before, after]) if (dir) rmSync(dir, { recursive: true, force: true });
  }
});
