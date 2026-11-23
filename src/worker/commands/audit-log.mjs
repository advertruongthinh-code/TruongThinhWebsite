// GET /api/admin/audit-log?cursor= (CMS plan P1, Q9): newest first, 100 rows a page; staff see only their own rows.
import { HttpError, json } from "../http.mjs";

const PAGE = 100;

export default {
  method: "GET",
  async run(_request, env, _ctx, actor, url) {
    const cursor = url.searchParams.get("cursor") ?? "";
    if (cursor && !/^\d{1,15}$/.test(cursor)) throw new HttpError(400, { error: "query" });
    const before = cursor ? Number(cursor) : Number.MAX_SAFE_INTEGER;
    const staff = actor.role !== "owner";
    const { results } = await env.DB
      .prepare(`SELECT seq, at, email, command, type, id, result FROM audit_log WHERE seq < ?${staff ? " AND email = ?" : ""} ORDER BY seq DESC LIMIT ?`)
      .bind(...(staff ? [before, actor.email, PAGE + 1] : [before, PAGE + 1]))
      .all();
    const rows = results.slice(0, PAGE);
    return json({ items: rows, next: results.length > PAGE ? String(rows.at(-1).seq) : null });
  },
};
