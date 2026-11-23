// GET /api/admin/get?type=&id= (CMS plan P1, Q9; part 2 K11): the record plus the variants its placements use.
import { HttpError, json } from "../http.mjs";

export default {
  method: "GET",
  async run(_request, env, _ctx, _actor, url) {
    const type = url.searchParams.get("type") ?? "";
    const id = url.searchParams.get("id") ?? "";
    const [record, variants] = await env.DB.batch([
      env.DB.prepare("SELECT status, version, pending, data, updated_at, updated_by FROM records WHERE type = ? AND id = ?").bind(type, id),
      env.DB.prepare("SELECT DISTINCT v.key, v.media_id AS mediaId, v.status, v.error FROM record_media m JOIN variants v ON v.key = m.variant_key WHERE m.type = ? AND m.id = ? ORDER BY v.key").bind(type, id),
    ]);
    const row = record.results[0];
    if (!row) throw new HttpError(404, { error: "not-found" });
    return json({ type, id, status: row.status, version: row.version, pending: row.pending, data: JSON.parse(row.data), updatedAt: row.updated_at, updatedBy: row.updated_by, variants: variants.results });
  },
};
