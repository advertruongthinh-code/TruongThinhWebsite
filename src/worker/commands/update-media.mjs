// shortcut: at most 37 records per media are patched in one call (D1 Free allows 50 queries per invocation), page the patch when a media is used by more
// POST /api/admin/update-media (CMS plan P2, Q9): alts and tags of a media; the alts are copied into the records that use it.
import { ID } from "../../cms/contract.mjs";
import { dispatchVariants, wantBuild } from "../dispatch.mjs";
import { auditStatement, HttpError, json, readJson } from "../http.mjs";
import { patchAlt } from "../media.mjs";
import { contentRevStatement, guard } from "../records.mjs";

// 37 keeps the conflict path (re-read, refusal audit row) under the 50 queries of D1 Free.
const MAX_USES = 37;
const validTags = (tags) => Array.isArray(tags) && tags.length <= 20 && tags.every((tag) => typeof tag === "string" && tag.length >= 1 && tag.length <= 40);

export default {
  method: "POST",
  async run(request, env, ctx, actor) {
    const { id, version, altVi, altEn, tags } = await readJson(request);
    if (typeof id !== "string" || !ID.test(id) || !Number.isInteger(version) || ![altVi, altEn].every((alt) => typeof alt === "string" && alt.length <= 300) || !validTags(tags)) throw new HttpError(400, { error: "shape" });
    const target = { type: "media", id };
    const readRow = () => env.DB.prepare("SELECT status, version, data, updated_at, updated_by FROM records WHERE type = 'media' AND id = ?").bind(id).first();
    const stale = (current) => new HttpError(409, { error: "version", current: { version: current.version, data: JSON.parse(current.data), updatedBy: current.updated_by, updatedAt: current.updated_at } }, target);
    const row = await readRow();
    if (!row) throw new HttpError(404, { error: "not-found" }, target);
    if (row.status === "trashed") throw new HttpError(409, { error: "trashed" }, target);
    if (row.version !== version) throw stale(row);
    const { results: users } = await env.DB
      .prepare("SELECT r.type, r.id, r.status, r.data, r.write_id FROM records r WHERE EXISTS (SELECT 1 FROM record_media m WHERE m.type = r.type AND m.id = r.id AND m.media_id = ?) AND r.type != 'media' LIMIT 38")
      .bind(id).all();
    if (users.length > MAX_USES) throw new HttpError(409, { error: "too-many-uses" }, target);
    const filled = Boolean(altVi.trim() && altEn.trim());
    if (!filled && users.length) throw new HttpError(409, { error: "in-use" }, target);
    const media = { ...JSON.parse(row.data), altVi, altEn, tags };
    const status = filled ? "published" : "draft";
    const text = JSON.stringify(media);
    const failed = media.source === "r2"
      ? await env.DB.prepare("SELECT key FROM variants WHERE media_id = ? AND crop = ? AND status = 'error'").bind(id, `0,0,${media.width},${media.height}`).first()
      : null;
    const newVersion = row.version + 1;
    const writeId = crypto.randomUUID();
    const now = new Date().toISOString();
    const G = guard("media", id, writeId);
    const patched = users.map((user) => ({ ...user, text: JSON.stringify(patchAlt(user.type, JSON.parse(user.data), id, altVi, altEn)) }));
    const [update] = await env.DB.batch([
      // Writes nothing (so the guard stops the batch) when a user record was saved or patched after it was read.
      env.DB.prepare("UPDATE records SET version = ?, live_version = ?, status = ?, data = ?, write_id = ?, updated_at = ?, updated_by = ? WHERE type = 'media' AND id = ? AND version = ? AND status != 'trashed' AND NOT EXISTS (SELECT 1 FROM json_each(?) j LEFT JOIN records r ON r.type = json_extract(j.value, '$.t') AND r.id = json_extract(j.value, '$.i') WHERE r.write_id IS NOT json_extract(j.value, '$.w'))")
        .bind(newVersion, newVersion, status, text, writeId, now, actor.email, id, version, JSON.stringify(users.map((user) => ({ t: user.type, i: user.id, w: user.write_id })))),
      env.DB.prepare(`INSERT INTO versions (type, id, version, status, data, saved_at, saved_by) SELECT 'media', ?, ?, ?, ?, ?, ? WHERE ${G.sql}`).bind(id, newVersion, status, text, now, actor.email, ...G.args),
      // The users keep their version: only the alt copies change (plan P2), so their versions rows are not rewritten.
      ...patched.map((user) => env.DB.prepare(`UPDATE records SET data = ?, write_id = ? WHERE type = ? AND id = ? AND ${G.sql}`).bind(user.text, writeId, user.type, user.id, ...G.args)),
      ...(failed ? [env.DB.prepare(`UPDATE variants SET status = 'pending', error = NULL, created_at = ? WHERE key = ? AND status = 'error' AND ${G.sql}`).bind(now, failed.key, ...G.args)] : []),
      contentRevStatement(env, G),
      auditStatement(env, actor, "update-media", "media", id, "ok", { guard: G }),
    ]);
    if (update.meta.changes !== 1) {
      const current = await readRow();
      if (!current) throw new HttpError(404, { error: "not-found" }, target);
      if (current.status === "trashed") throw new HttpError(409, { error: "trashed" }, target);
      if (current.version === version) throw new HttpError(409, { error: "retry" }, target);
      throw stale(current);
    }
    if (patched.some((user) => user.status === "published")) ctx?.waitUntil?.(wantBuild(env));
    if (failed) ctx?.waitUntil?.(dispatchVariants(env, [failed.key]));
    return json({ version: newVersion, status, updatedRecords: patched.length });
  },
};
