// POST /api/admin/purge (CMS plan P1, Q9): owner only, deletes a trashed record for good; R2 objects stay for P8.
import { ID, OPEN_TYPES, SINGLETON_TYPES } from "../../cms/contract.mjs";
import { auditStatement, HttpError, json, readJson } from "../http.mjs";
import { mediaInUse } from "../records.mjs";

export default {
  method: "POST",
  owner: true,
  async run(request, env, _ctx, actor) {
    const { type, id, confirm } = await readJson(request);
    if (!OPEN_TYPES.includes(type) || SINGLETON_TYPES.includes(type) || typeof id !== "string" || !ID.test(id)) throw new HttpError(400, { error: "shape" });
    const target = { type, id };
    const row = await env.DB.prepare("SELECT status, name, data FROM records WHERE type = ? AND id = ?").bind(type, id).first();
    if (!row) throw new HttpError(404, { error: "not-found" }, target);
    // Deviation from plan P1: only a trashed record can be purged, so one click never deletes a live page.
    if (row.status !== "trashed") throw new HttpError(409, { error: "not-trashed" }, target);
    if (confirm !== row.name) throw new HttpError(400, { error: "confirm" }, target);
    if (type === "media") {
      const usedBy = await mediaInUse(env, id);
      if (usedBy.length) throw new HttpError(409, { error: "in-use", usedBy }, target);
    }
    await env.DB.batch([
      auditStatement(env, actor, "purge", type, id, "ok", { detail: row.data }),
      ...["records", "versions", "record_media", "slug_history"].map((table) => env.DB.prepare(`DELETE FROM ${table} WHERE type = ? AND id = ?`).bind(type, id)),
      env.DB.prepare("INSERT INTO settings (key, value) VALUES ('content_rev', '1') ON CONFLICT (key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)"),
    ]);
    return json({});
  },
};
