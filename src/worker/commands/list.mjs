// GET /api/admin/list?type=&status=&cursor= (CMS plan P1, Q9): 100 rows a page by position, then id.
import { OPEN_TYPES } from "../../cms/contract.mjs";
import { HttpError, json } from "../http.mjs";

const PAGE = 100;
const STATUSES = ["", "draft", "published", "trashed"];

export default {
  method: "GET",
  async run(_request, env, _ctx, _actor, url) {
    const type = url.searchParams.get("type") ?? "";
    const status = url.searchParams.get("status") ?? "";
    const cursor = url.searchParams.get("cursor") ?? "";
    const match = cursor ? /^(-?\d{1,9})\|([a-z0-9-]{1,80})$/.exec(cursor) : ["", "-1", ""];
    if (!OPEN_TYPES.includes(type) || !STATUSES.includes(status) || !match) throw new HttpError(400, { error: "query" });
    const position = Number(match[1]);
    const { results } = await env.DB
      .prepare("SELECT id, name, status, version, pending, position, updated_at, updated_by FROM records WHERE type = ? AND (? = '' OR status = ?) AND (position > ? OR (position = ? AND id > ?)) ORDER BY position, id LIMIT ?")
      .bind(type, status, status, position, position, match[2], PAGE + 1)
      .all();
    const rows = results.slice(0, PAGE);
    const last = rows.at(-1);
    return json({
      items: rows.map((row) => ({ id: row.id, name: row.name, status: row.status, version: row.version, pending: row.pending, updatedAt: row.updated_at, updatedBy: row.updated_by })),
      next: results.length > PAGE ? `${last.position}|${last.id}` : null,
    });
  },
};
