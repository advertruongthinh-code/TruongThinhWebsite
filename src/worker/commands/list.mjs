// GET /api/admin/list?type=&status=&cursor= (CMS plan P1, Q9; part 2 K11): 100 rows a page by position, then id, one D1 query.
// trash writes updated_by and trashed_at, so a trashed row's updated_by is who trashed it (no audit_log join).
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
      .prepare("SELECT id, name, status, version, pending, position, updated_at, updated_by, trashed_at, en_missing, slug_vi, json_extract(data, '$.published') AS published, json_extract(data, '$.productIds[0]') AS product, EXISTS (SELECT 1 FROM record_media m JOIN variants v ON v.key = m.variant_key WHERE m.type = records.type AND m.id = records.id AND v.status = 'error') AS variant_error FROM records WHERE type = ? AND (? = '' OR status = ?) AND (position > ? OR (position = ? AND id > ?)) ORDER BY position, id LIMIT ?")
      .bind(type, status, status, position, position, match[2], PAGE + 1)
      .all();
    const rows = results.slice(0, PAGE);
    const last = rows.at(-1);
    return json({
      items: rows.map((row) => ({
        id: row.id, name: row.name, status: row.status, version: row.version, pending: row.pending, updatedAt: row.updated_at, updatedBy: row.updated_by,
        enMissing: row.en_missing === 1, variantError: row.variant_error === 1,
        ...(row.status === "trashed" ? { trashedBy: row.updated_by, trashedAt: row.trashed_at } : {}),
        // Editor content panel (E12): staging link, News order by date, card product groups.
        ...(row.slug_vi ? { slugVi: row.slug_vi } : {}),
        ...(type === "news" && row.published ? { published: row.published } : {}),
        ...(type === "advertising-card" && row.product ? { product: row.product } : {}),
      })),
      next: results.length > PAGE ? `${last.position}|${last.id}` : null,
    });
  },
};
