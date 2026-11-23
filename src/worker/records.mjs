// Shared helpers of the record commands (CMS plan P1, Q3, Q9, Q10): context for the validators, write guard, slug history.
import { IMAGE_SRC, imageFieldErrors } from "../../scripts/site/lib-pure.mjs";
import { ADVERTISING_CLUSTERS } from "../site/advertising-products/taxonomy.mjs";
import { SINGLETON_TYPES } from "../cms/contract.mjs";
import { isLegacy, mediaRefs } from "../cms/media-ref.mjs";
import { poolEntry, poolLoss } from "../cms/rules.mjs";
import { HttpError } from "./http.mjs";

// cms.md R4: these types only have get and save, are always published, never trashed or created.
export const FIXED_TYPES = [...SINGLETON_TYPES, "page-copy"];

export const CATEGORIES = ADVERTISING_CLUSTERS.map(({ id }) => ({ slug: id }));
export const VARIANT_SRC = /^\/v\/[0-9a-f]{32}\/[a-z0-9-]+\.webp$/;
const SLUG_HISTORY_MAX = 1200;

export async function loadContext(env) {
  const { results } = await env.DB.prepare("SELECT type, id FROM records WHERE type IN ('news', 'project') AND status = 'published'").all();
  const projects = new Map();
  const news = new Map();
  for (const { type, id } of results) (type === "project" ? projects : news).set(id, { id });
  return { projects, news };
}

export async function loadMedia(env, ids) {
  if (!ids.length) return new Map();
  const { results } = await env.DB
    .prepare("SELECT id, data FROM records WHERE type = 'media' AND status != 'trashed' AND id IN (SELECT value FROM json_each(?))")
    .bind(JSON.stringify(ids))
    .all();
  return new Map(results.map((row) => [row.id, JSON.parse(row.data)]));
}

// The Worker reads no file: sizes were written by materialize from the media record.
export const mediaRowCheck = () => async (image, where) => imageFieldErrors(image, where, (src) => IMAGE_SRC.test(src) || VARIANT_SRC.test(src));

// Other live records that place one of these media (K10 media-reuse): Map mediaId -> [{ type, id }].
export async function loadUsage(env, ids, type, id) {
  if (!ids.length) return new Map();
  const { results } = await env.DB
    .prepare("SELECT DISTINCT m.media_id, m.type, m.id FROM record_media m JOIN records r ON r.type = m.type AND r.id = m.id WHERE m.media_id IN (SELECT value FROM json_each(?)) AND r.status != 'trashed' AND NOT (m.type = ? AND m.id = ?)")
    .bind(JSON.stringify(ids), type, id)
    .all();
  const usage = new Map();
  for (const row of results) usage.set(row.media_id, [...(usage.get(row.media_id) ?? []), { type: row.type, id: row.id }]);
  return usage;
}

// Published Advertising cards as pool entries (K10 pool-dup, pool-min): only the fields the rules read, no full JSON.parse.
export async function loadPool(env) {
  const { results } = await env.DB.prepare(`SELECT id, json_extract(data, '$.productIds') AS products,
      coalesce(json_extract(data, '$.media.width'), json_extract(data, '$.mediaItems[0].width')) AS width,
      coalesce(json_extract(data, '$.media.height'), json_extract(data, '$.mediaItems[0].height')) AS height,
      (SELECT json_group_array(k.value) FROM (
        SELECT json_extract(data, '$.media.src') AS value UNION SELECT json_extract(data, '$.media.sourceId')
        UNION SELECT 'm:' || json_extract(data, '$.media.mediaId')
        UNION SELECT json_extract(i.value, '$.src') FROM json_each(data, '$.mediaItems') i
        UNION SELECT json_extract(i.value, '$.sourceId') FROM json_each(data, '$.mediaItems') i
        UNION SELECT 'm:' || json_extract(i.value, '$.mediaId') FROM json_each(data, '$.mediaItems') i) k WHERE k.value IS NOT NULL) AS keys
    FROM records WHERE type = 'advertising-card' AND status = 'published'`).all();
  return results.map((row) => ({
    ...poolEntry({ id: row.id, productIds: JSON.parse(row.products ?? "[]"), media: { width: row.width, height: row.height } }),
    keys: new Set(JSON.parse(row.keys)),
  }));
}

export async function validationContext(env, type, data, id) {
  const ids = [...new Set(mediaRefs(type, data).map((place) => place.mediaId).filter((mediaId) => typeof mediaId === "string"))];
  const [mediaById, context, usage, pool] = await Promise.all([
    loadMedia(env, ids), loadContext(env), loadUsage(env, ids, type, id), type === "advertising-card" ? loadPool(env) : undefined,
  ]);
  return { id, mediaById, ...context, usage, pool, categories: CATEGORIES, checkImage: mediaRowCheck(mediaById) };
}

// Every statement after the conditional UPDATE of a batch appends this, so it writes only when that UPDATE wrote.
export const guard = (type, id, writeId) => ({
  sql: "EXISTS (SELECT 1 FROM records WHERE type = ? AND id = ? AND write_id = ?)",
  args: [type, id, writeId],
});

// cms-data R2: every batch that writes records or slug_history raises content_rev (snapshot stamp).
export const contentRevStatement = (env, G) => env.DB
  .prepare(`INSERT INTO settings (key, value) SELECT 'content_rev', '1' WHERE ${G.sql} ON CONFLICT (key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)`)
  .bind(...G.args);

// record_media rows of a saved record: materialize uses plus seeded legacySrc placements (S3 review), deduplicated.
export function mediaUses(type, data, uses) {
  const rows = new Map(uses.map((use) => [`${use.mediaId}|${use.key}`, { m: use.mediaId, k: use.key, c: use.crop }]));
  for (const ref of mediaRefs(type, data)) {
    if (isLegacy(ref) && typeof ref.mediaId === "string" && !rows.has(`${ref.mediaId}|`)) rows.set(`${ref.mediaId}|`, { m: ref.mediaId, k: "", c: "" });
  }
  return [...rows.values()];
}

// Q3: old slug into history when it changes on a record that was ever published; the live slug never stays in history.
export async function slugStatements(env, { type, id, old, next, wasPublished, published, now, G }) {
  const statements = [];
  const changed = ["vi", "en"].filter((locale) => old[locale] && old[locale] !== next[locale] && wasPublished);
  if (changed.length) {
    const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM slug_history").first();
    if (n >= SLUG_HISTORY_MAX) return null;
  }
  for (const locale of changed) {
    statements.push(env.DB
      .prepare(`INSERT OR REPLACE INTO slug_history (type, locale, slug, id, changed_at) SELECT ?, ?, ?, ?, ? WHERE ${G.sql}`)
      .bind(type, locale, old[locale], id, now, ...G.args));
  }
  if (published) {
    for (const locale of ["vi", "en"].filter((locale) => next[locale])) {
      statements.push(env.DB.prepare(`DELETE FROM slug_history WHERE type = ? AND locale = ? AND slug = ? AND ${G.sql}`).bind(type, locale, next[locale], ...G.args));
    }
  }
  return statements;
}

// Singletons that still list a project id (trash reply, not a block).
export async function referencedBy(env, type, id) {
  if (type !== "project") return [];
  const { results } = await env.DB.prepare("SELECT type, data FROM records WHERE type IN ('menu', 'home-projects') AND id = 'main'").all();
  // id matches ID (no quote or backslash), so the quoted id appears in the stored JSON only as a string value.
  return results.filter((row) => row.data.includes(JSON.stringify(id))).map((row) => row.type).sort();
}

// Records that use a media: latest version (record_media) and the live version of records still waiting on variants.
export async function mediaInUse(env, id) {
  const [latest, live] = await env.DB.batch([
    env.DB.prepare("SELECT DISTINCT type, id FROM record_media WHERE media_id = ? LIMIT 20").bind(id),
    env.DB.prepare("SELECT r.type, r.id FROM records r JOIN versions v ON v.type = r.type AND v.id = r.id AND v.version = r.live_version WHERE r.status = 'published' AND r.pending > 0 AND instr(v.data, ?) > 0 LIMIT 20")
      .bind(`"mediaId":${JSON.stringify(id)}`),
  ]);
  const seen = new Map([...latest.results, ...live.results].map((row) => [`${row.type}|${row.id}`, { type: row.type, id: row.id }]));
  return [...seen.values()].slice(0, 20);
}

export async function lastSlide(env, page, id) {
  const { n } = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM records WHERE type = 'hero-slide' AND status = 'published' AND json_extract(data, '$.page') = ? AND id != ?")
    .bind(page, id)
    .first();
  return n === 0;
}

const message = (error) => String(error?.message ?? error);
export const isUniqueSlug = (error) => /UNIQUE constraint failed: records\.type, records\.slug_/.test(message(error));
export const isUniqueId = (error) => /UNIQUE constraint failed: records\.type, records\.id/.test(message(error));

// Cross-record rules (Q10) checked before a record leaves the site by trash or purge. row: { status, page }.
export async function trashRefusal(env, type, id, row, target) {
  if (type === "media") {
    const usedBy = await mediaInUse(env, id);
    if (usedBy.length) throw new HttpError(409, { error: "in-use", usedBy }, target);
  }
  if (type === "project") {
    const home = await env.DB.prepare("SELECT json_extract(data, '$.ids') AS ids FROM records WHERE type = 'home-projects' AND id = 'main'").first();
    const ids = home?.ids ? JSON.parse(home.ids) : [];
    if (Array.isArray(ids) && ids.includes(id) && ids.length - 1 < 3) throw new HttpError(409, { error: "home-projects-min" }, target);
  }
  if (type === "advertising-card" && row.status === "published") {
    const loss = poolLoss(await loadPool(env), id, null);
    if (loss.length) throw new HttpError(409, { error: "pool-min", missing: loss }, target);
  }
  if (type === "hero-slide" && row.status === "published" && await lastSlide(env, row.page, id)) throw new HttpError(409, { error: "last-slide" }, target);
}
