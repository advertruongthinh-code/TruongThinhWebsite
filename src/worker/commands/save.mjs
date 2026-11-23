// POST /api/admin/save (CMS plan P1, Q9, Q10; cms.md R4): optimistic version check, validation, one guarded batch.
import { OPEN_TYPES, ID, SINGLETON_TYPES, fullErrors, recordName, recordSlugs, shapeErrors } from "../../cms/contract.mjs";
import { materialize } from "../../cms/media-ref.mjs";
import { dispatchVariants, wantBuildStatement } from "../dispatch.mjs";
import { auditStatement, HttpError, isPlainObject, json, readJson } from "../http.mjs";
import { contentRevStatement, FIXED_TYPES, guard, isUniqueSlug, lastSlide, mediaUses, slugStatements, validationContext } from "../records.mjs";

const MAX_DATA_CHARS = 512_000;

// Statements 2 and 4 to 7 of save (also used by create): versions, record_media, variants, pending, live_version.
export function writeStatements(env, { type, id, version, status, text, usesJson, now, actor, writeId, G }) {
  return [
    env.DB.prepare(`INSERT INTO versions (type, id, version, status, data, saved_at, saved_by) SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${G.sql}`)
      .bind(type, id, version, status, text, now, actor.email, ...G.args),
    env.DB.prepare(`DELETE FROM record_media WHERE type = ? AND id = ? AND ${G.sql}`).bind(type, id, ...G.args),
    env.DB.prepare(`INSERT INTO record_media (type, id, media_id, variant_key) SELECT ?, ?, json_extract(value, '$.m'), json_extract(value, '$.k') FROM json_each(?) WHERE ${G.sql}`)
      .bind(type, id, usesJson, ...G.args),
    env.DB.prepare(`INSERT INTO variants (key, media_id, crop, status, created_at) SELECT json_extract(value, '$.k'), json_extract(value, '$.m'), json_extract(value, '$.c'), 'pending', ? FROM json_each(?) WHERE json_extract(value, '$.k') != '' AND ${G.sql} ON CONFLICT (key) DO UPDATE SET status = 'pending', error = NULL, created_at = excluded.created_at WHERE variants.status = 'error'`)
      .bind(now, usesJson, ...G.args),
    env.DB.prepare("UPDATE records SET pending = (SELECT COUNT(*) FROM record_media m JOIN variants v ON v.key = m.variant_key WHERE m.type = records.type AND m.id = records.id AND v.status != 'ready') WHERE type = ? AND id = ? AND write_id = ?")
      .bind(type, id, writeId),
    env.DB.prepare("UPDATE records SET live_version = version WHERE type = ? AND id = ? AND write_id = ? AND status = 'published' AND pending = 0")
      .bind(type, id, writeId),
  ];
}

// Shape check, materialize, variant keys: shared by save and create.
export async function prepare(env, type, id, data, target) {
  const ctx = await validationContext(env, type, data);
  const shape = await shapeErrors(type, data, { ...ctx, id: SINGLETON_TYPES.includes(type) ? undefined : id });
  if (shape.length) throw new HttpError(400, { error: "shape", errors: shape }, target);
  const { data: next, uses } = await materialize(type, data, ctx.mediaById);
  const keys = uses.map((use) => use.key).filter(Boolean);
  const known = keys.length
    ? new Map((await env.DB.prepare("SELECT key, status FROM variants WHERE key IN (SELECT value FROM json_each(?))").bind(JSON.stringify(keys)).all()).results.map((variant) => [variant.key, variant.status]))
    : new Map();
  const redo = keys.filter((key) => !known.has(key) || known.get(key) === "error");
  return { ctx, next, redo, usesJson: JSON.stringify(mediaUses(type, next, uses)) };
}

export default {
  method: "POST",
  async run(request, env, ctx, actor) {
    const { type, id, version, data } = await readJson(request);
    const single = FIXED_TYPES.includes(type);
    if (!OPEN_TYPES.includes(type) || type === "media" || typeof id !== "string" || !ID.test(id) || (SINGLETON_TYPES.includes(type) && id !== "main") || !Number.isInteger(version) || !isPlainObject(data)) throw new HttpError(400, { error: "shape" });
    const target = { type, id };
    if (JSON.stringify(data).length > MAX_DATA_CHARS) throw new HttpError(400, { error: "too-large" }, target);
    const readRow = () => env.DB.prepare("SELECT status, version, data, live_version, slug_vi, slug_en, json_extract(data, '$.page') AS page, updated_at, updated_by FROM records WHERE type = ? AND id = ?").bind(type, id).first();
    const row = await readRow();
    if (!row) throw new HttpError(404, { error: "not-found" }, target);
    if (row.status === "trashed") throw new HttpError(409, { error: "trashed" }, target);
    const stale = (current) => new HttpError(409, { error: "version", current: { version: current.version, data: JSON.parse(current.data), updatedBy: current.updated_by, updatedAt: current.updated_at } }, target);
    if (row.version !== version) throw stale(row);
    const prepared = await prepare(env, type, id, data, target);
    const missing = await fullErrors(type, prepared.next, prepared.ctx);
    if (missing.length && (row.status === "published" || single)) throw new HttpError(400, { error: "missing", missing }, target);
    const status = missing.length ? "draft" : "published";
    if (type === "hero-slide" && row.status === "published" && (prepared.next.page !== row.page || status !== "published") && await lastSlide(env, row.page, id)) throw new HttpError(409, { error: "last-slide" }, target);
    const newVersion = row.version + 1;
    const writeId = crypto.randomUUID();
    const now = new Date().toISOString();
    const text = JSON.stringify(prepared.next);
    const slugs = recordSlugs(type, prepared.next);
    const G = guard(type, id, writeId);
    const slugRows = await slugStatements(env, {
      type, id, old: { vi: row.slug_vi, en: row.slug_en }, next: slugs,
      wasPublished: row.live_version !== null || row.status === "published", published: status === "published", now, G,
    });
    if (!slugRows) throw new HttpError(409, { error: "slug-history-full" }, target);
    let results;
    try {
      results = await env.DB.batch([
        env.DB.prepare("UPDATE records SET version = ?, status = ?, data = ?, name = ?, slug_vi = ?, slug_en = ?, write_id = ?, updated_at = ?, updated_by = ? WHERE type = ? AND id = ? AND version = ? AND status != 'trashed'")
          .bind(newVersion, status, text, recordName(type, prepared.next) || id, slugs.vi, slugs.en, writeId, now, actor.email, type, id, version),
        ...writeStatements(env, { type, id, version: newVersion, status, text, usesJson: prepared.usesJson, now, actor, writeId, G }),
        ...slugRows,
        contentRevStatement(env, G),
        // Q8: a published save without pending variants wants a content build; Cron dispatches it (no GitHub call here).
        wantBuildStatement(env, { sql: "EXISTS (SELECT 1 FROM records WHERE type = ? AND id = ? AND write_id = ? AND status = 'published' AND pending = 0)", args: G.args }),
        auditStatement(env, actor, "save", type, id, "ok", { guard: G }),
        env.DB.prepare("SELECT pending FROM records WHERE type = ? AND id = ? AND write_id = ?").bind(type, id, writeId),
      ]);
    } catch (error) {
      if (isUniqueSlug(error)) throw new HttpError(409, { error: "slug" }, target);
      throw error;
    }
    if (results[0].meta.changes !== 1) {
      const now = await readRow();
      if (!now) throw new HttpError(404, { error: "not-found" }, target);
      if (now.status === "trashed") throw new HttpError(409, { error: "trashed" }, target);
      throw stale(now);
    }
    const pending = results.at(-1).results[0]?.pending ?? 0;
    if (prepared.redo.length) ctx?.waitUntil?.(dispatchVariants(env, prepared.redo));
    return json({ version: newVersion, status, missing, pending });
  },
};
