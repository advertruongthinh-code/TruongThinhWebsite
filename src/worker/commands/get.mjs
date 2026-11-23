// GET /api/admin/get?type=&id= (CMS plan P1, Q9).
import { HttpError, json } from "../http.mjs";

export default {
  method: "GET",
  async run(_request, env, _ctx, _actor, url) {
    const type = url.searchParams.get("type") ?? "";
    const id = url.searchParams.get("id") ?? "";
    const row = await env.DB.prepare("SELECT status, version, pending, data, updated_at, updated_by FROM records WHERE type = ? AND id = ?").bind(type, id).first();
    if (!row) throw new HttpError(404, { error: "not-found" });
    return json({ type, id, status: row.status, version: row.version, pending: row.pending, data: JSON.parse(row.data), updatedAt: row.updated_at, updatedBy: row.updated_by });
  },
};
