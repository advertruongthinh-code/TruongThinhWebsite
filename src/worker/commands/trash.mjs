// POST /api/admin/trash (CMS plan P1, Q9, Q10): moves a list record to the trash after the cross-record checks.
import { ID, OPEN_TYPES, SINGLETON_TYPES } from "../../cms/contract.mjs";
import { dispatchBuild } from "../dispatch.mjs";
import { auditStatement, HttpError, json, readJson } from "../http.mjs";
import { contentRevStatement, guard, lastSlide, mediaInUse, referencedBy } from "../records.mjs";

export default {
  method: "POST",
  async run(request, env, ctx, actor) {
    const { type, id } = await readJson(request);
    if (!OPEN_TYPES.includes(type) || SINGLETON_TYPES.includes(type) || typeof id !== "string" || !ID.test(id)) throw new HttpError(400, { error: "shape" });
    const target = { type, id };
    const row = await env.DB.prepare("SELECT status, json_extract(data, '$.page') AS page FROM records WHERE type = ? AND id = ?").bind(type, id).first();
    if (!row || row.status === "trashed") throw new HttpError(404, { error: "not-found" }, target);
    if (type === "media") {
      const usedBy = await mediaInUse(env, id);
      if (usedBy.length) throw new HttpError(409, { error: "in-use", usedBy }, target);
    }
    if (type === "project") {
      const home = await env.DB.prepare("SELECT json_extract(data, '$.ids') AS ids FROM records WHERE type = 'home-projects' AND id = 'main'").first();
      const ids = home?.ids ? JSON.parse(home.ids) : [];
      if (Array.isArray(ids) && ids.includes(id) && ids.length - 1 < 3) throw new HttpError(409, { error: "home-projects-min" }, target);
    }
    if (type === "hero-slide" && row.status === "published" && await lastSlide(env, row.page, id)) throw new HttpError(409, { error: "last-slide" }, target);
    const writeId = crypto.randomUUID();
    const now = new Date().toISOString();
    const G = guard(type, id, writeId);
    const [update] = await env.DB.batch([
      env.DB.prepare("UPDATE records SET prev_status = status, status = 'trashed', trashed_at = ?, write_id = ?, updated_at = ?, updated_by = ? WHERE type = ? AND id = ? AND status != 'trashed'")
        .bind(now, writeId, now, actor.email, type, id),
      contentRevStatement(env, G),
      auditStatement(env, actor, "trash", type, id, "ok", { guard: G }),
    ]);
    if (update.meta.changes === 0) throw new HttpError(404, { error: "not-found" }, target);
    if (row.status === "published") ctx?.waitUntil?.(dispatchBuild(env));
    return json({ status: "trashed", referencedBy: await referencedBy(env, type, id) });
  },
};
