// POST /api/admin/restore (CMS plan P1, Q3, Q9): back to the status before the trash; a live slug leaves the history.
import { ID, OPEN_TYPES, SINGLETON_TYPES } from "../../cms/contract.mjs";
import { dispatchBuild } from "../dispatch.mjs";
import { auditStatement, HttpError, json, readJson } from "../http.mjs";
import { contentRevStatement, guard, isUniqueSlug } from "../records.mjs";

export default {
  method: "POST",
  async run(request, env, ctx, actor) {
    const { type, id } = await readJson(request);
    if (!OPEN_TYPES.includes(type) || SINGLETON_TYPES.includes(type) || typeof id !== "string" || !ID.test(id)) throw new HttpError(400, { error: "shape" });
    const target = { type, id };
    const row = await env.DB.prepare("SELECT prev_status, slug_vi, slug_en FROM records WHERE type = ? AND id = ? AND status = 'trashed'").bind(type, id).first();
    if (!row) throw new HttpError(404, { error: "not-found" }, target);
    const status = row.prev_status ?? "draft";
    const writeId = crypto.randomUUID();
    const now = new Date().toISOString();
    const G = guard(type, id, writeId);
    const slugDeletes = status === "published"
      ? [["vi", row.slug_vi], ["en", row.slug_en]].filter(([, slug]) => slug)
        .map(([locale, slug]) => env.DB.prepare(`DELETE FROM slug_history WHERE type = ? AND locale = ? AND slug = ? AND ${G.sql}`).bind(type, locale, slug, ...G.args))
      : [];
    let update;
    try {
      [update] = await env.DB.batch([
        env.DB.prepare("UPDATE records SET status = COALESCE(prev_status, 'draft'), prev_status = NULL, trashed_at = NULL, write_id = ?, updated_at = ?, updated_by = ? WHERE type = ? AND id = ? AND status = 'trashed'")
          .bind(writeId, now, actor.email, type, id),
        ...slugDeletes,
        contentRevStatement(env, G),
        auditStatement(env, actor, "restore", type, id, "ok", { guard: G }),
      ]);
    } catch (error) {
      if (isUniqueSlug(error)) throw new HttpError(409, { error: "slug" }, target);
      throw error;
    }
    if (update.meta.changes === 0) throw new HttpError(404, { error: "not-found" }, target);
    if (status === "published") ctx?.waitUntil?.(dispatchBuild(env));
    return json({ status });
  },
};
