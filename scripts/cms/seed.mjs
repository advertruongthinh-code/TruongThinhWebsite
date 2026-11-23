#!/usr/bin/env node
// Seed SQL for D1 from the repo content files (docs/specs/cms.md R6, CMS plan S3). Prints SQL only; S4 loads it with
// `wrangler d1 execute --file`. Usage: node scripts/cms/seed.mjs --out .tmp/cms/seed.sql [--content <dir>] [--force]
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { fullErrors, recordName, recordSlugs, shapeErrors } from "../../src/cms/contract.mjs";
import { mediaRefs } from "../../src/cms/media-ref.mjs";
import { filesToRecords } from "../../src/cms/projection.mjs";
import { ADVERTISING_MEDIA_MANIFEST } from "../../src/site/advertising-products/media-manifest.mjs";
import { contentDirOf, fileImageCheck } from "../site/content-files.mjs";
import { SLOT_PAGES, slotValues } from "../site/slots.mjs";

const SITE_ROOT = fileURLToPath(new URL("../../src/site/", import.meta.url));
const FILE_NAMES = ["news.json", "projects.json", "hero-slides.json", "home-projects.json", "menu.json"];
const MAX_DATA_CHARS = 90_000; // one D1 statement is at most 100 KB

const HEADER = `-- Refuses to run once the CMS is live: a NULL insert into a NOT NULL column aborts the import.
INSERT INTO settings (key, value) SELECT 'seed_guard', NULL WHERE EXISTS (SELECT 1 FROM settings WHERE key = 'cms_live' AND value = '1');
-- Refuses to wipe anything typed or uploaded through the CMS. This line is left out with --force.
INSERT INTO settings (key, value) SELECT 'seed_guard', NULL WHERE EXISTS (SELECT 1 FROM records WHERE created_by != 'seed');
`;
const WIPE = `DELETE FROM records;
DELETE FROM versions;
DELETE FROM record_media;
DELETE FROM slug_history;
`;

const sql = (value) => (value === null || value === undefined ? "NULL" : typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`);

const fileFact = (src) => {
  const bytes = readFileSync(path.join(SITE_ROOT, src));
  return { hash: `sha256:${createHash("sha256").update(bytes).digest("hex")}`, bytes: bytes.byteLength };
};

export async function seedSql({ contentDir = contentDirOf(SITE_ROOT), force = false, now = new Date().toISOString() } = {}) {
  const files = {
    ...Object.fromEntries(FILE_NAMES.map((name) => [name, JSON.parse(readFileSync(path.join(contentDir, name), "utf8"))])),
    cards: structuredClone(ADVERTISING_MEDIA_MANIFEST),
    // Standard pages: every slot with the text and image the page has now (K7), so the first build after the seed is unchanged.
    "page-copy.json": Object.fromEntries(Object.entries(SLOT_PAGES).map(([id, page]) => [id, { slots: slotValues(readFileSync(path.join(SITE_ROOT, page), "utf8")) }])
      .filter(([, { slots }]) => Object.keys(slots).length)),
  };
  const paths = filesToRecords(files).filter(({ type }) => type === "media").map(({ data }) => data.path);
  const records = filesToRecords(files, new Map(paths.map((src) => [src, fileFact(src)])));
  const mediaById = new Map(records.filter(({ type }) => type === "media").map(({ id, data }) => [id, data]));
  const ctx = {
    mediaById,
    checkImage: fileImageCheck(SITE_ROOT),
    projects: new Map(files["projects.json"].map((page) => [page.id, page])),
    news: new Map(files["news.json"].map((page) => [page.id, page])),
  };
  const errors = [];
  let out = force ? HEADER.split("\n").slice(0, 2).join("\n") + "\n" + WIPE : HEADER + WIPE;
  for (const { type, id, data, position } of records) {
    const json = JSON.stringify(data);
    if (json.length > MAX_DATA_CHARS) throw new Error(`seed: ${type} ${id} data is ${json.length} characters, over ${MAX_DATA_CHARS}`);
    const found = [...await shapeErrors(type, data, { ...ctx, id }), ...await fullErrors(type, data, ctx)];
    errors.push(...found.map((error) => `${type} ${id}: ${error.message}`));
    const slugs = recordSlugs(type, data);
    out += `INSERT INTO records (type, id, status, version, live_version, pending, position, name, slug_vi, slug_en, data, write_id, created_at, created_by, updated_at, updated_by)
VALUES (${[type, id, "published", 1, 1, 0, position, recordName(type, data), slugs.vi, slugs.en, json, "seed", now, "seed", now, "seed"].map(sql).join(", ")});
INSERT INTO versions (type, id, version, status, data, saved_at, saved_by) VALUES (${[type, id, 1, "published", json, now, "seed"].map(sql).join(", ")});
`;
    // Seed placements are repo files at full frame, so every variant key is ''. Seeded legacySrc placements count too.
    const mediaIds = [...new Set(mediaRefs(type, data).map((ref) => ref.mediaId).filter(Boolean))];
    if (mediaIds.length) out += `INSERT INTO record_media (type, id, media_id, variant_key) SELECT ${sql(type)}, ${sql(id)}, value, '' FROM json_each(${sql(JSON.stringify(mediaIds))});\n`;
  }
  if (errors.length) throw new Error(`seed: content has errors\n${errors.join("\n")}`);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { out: { type: "string" }, content: { type: "string" }, force: { type: "boolean", default: false } } });
  if (!values.out) {
    console.error("usage: node scripts/cms/seed.mjs --out <file.sql> [--content <dir>] [--force]");
    process.exit(2);
  }
  try {
    const text = await seedSql({ contentDir: values.content, force: values.force });
    mkdirSync(path.dirname(values.out), { recursive: true });
    writeFileSync(values.out, text);
    console.log(`[cms:seed] wrote ${values.out}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
