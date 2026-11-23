// POST /api/admin/purge (CMS plan P1, Q9; cms.md R5): owner only, deletes a record for good, from the trash or directly.
// A record still live goes through the same cross-record rules as trash. R2 objects stay for P8.
import { ID, OPEN_TYPES } from "../../cms/contract.mjs";
import { wantBuildStatement } from "../dispatch.mjs";
import { HttpError, json, readJson } from "../http.mjs";
import { FIXED_TYPES, referencedBy, trashRefusal } from "../records.mjs";

export default {
  method: "POST",
  owner: true,
  async run(request, env, ctx, actor) {
    const { type, id, confirm } = await readJson(request);
    if (!OPEN_TYPES.includes(type) || FIXED_TYPES.includes(type) || typeof id !== "string" || !ID.test(id)) throw new HttpError(400, { error: "shape" });
    const target = { type, id };
    const row = await env.DB.prepare("SELECT status, version, name, data, json_extract(data, '$.page') AS page FROM records WHERE type = ? AND id = ?").bind(type, id).first();
    if (!row) throw new HttpError(404, { error: "not-found" }, target);
    if (confirm !== row.name) throw new HttpError(400, { error: "confirm" }, target);
    if (row.status !== "trashed" || type === "media") await trashRefusal(env, type, id, row, target);
    // The first DELETE holds the version that was read: a save landing in between turns the purge into a 409.
    const gone = "NOT EXISTS (SELECT 1 FROM records WHERE type = ? AND id = ?)";
    const [deleted] = await env.DB.batch([
      env.DB.prepare("DELETE FROM records WHERE type = ? AND id = ? AND version = ? AND status = ?").bind(type, id, row.version, row.status),
      ...["versions", "record_media", "slug_history"].map((table) => env.DB.prepare(`DELETE FROM ${table} WHERE type = ? AND id = ? AND ${gone}`).bind(type, id, type, id)),
      env.DB.prepare(`INSERT INTO audit_log (at, email, command, type, id, result, detail) SELECT ?, ?, 'purge', ?, ?, 'ok', ? WHERE ${gone}`)
        .bind(new Date().toISOString(), actor.email, type, id, row.data, type, id),
      env.DB.prepare(`INSERT INTO settings (key, value) SELECT 'content_rev', '1' WHERE ${gone} ON CONFLICT (key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)`).bind(type, id),
      ...(row.status === "published" ? [wantBuildStatement(env, { sql: gone, args: [type, id] })] : []),
    ]);
    if (deleted.meta.changes !== 1) throw new HttpError(409, { error: "changed" }, target);
    return json({ referencedBy: await referencedBy(env, type, id) });
  },
};
