// GET /api/admin/media-list?q=&cursor= (CMS plan P2, Q9): 100 media a page, newest update first, then id.
import { HttpError, json } from "../http.mjs";

const PAGE = 100;

export default {
  method: "GET",
  async run(_request, env, _ctx, _actor, url) {
    const q = url.searchParams.get("q") ?? "";
    const cursor = url.searchParams.get("cursor") ?? "";
    const match = cursor ? /^([^|]{1,40})\|([a-z0-9-]{1,80})$/.exec(cursor) : ["", "", ""];
    if (q.length > 100 || !match) throw new HttpError(400, { error: "query" });
    const like = q && `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    const { results } = await env.DB
      .prepare("SELECT id, status, version, data, updated_at FROM records WHERE type = 'media' AND status != 'trashed' AND (? = '' OR id LIKE ? ESCAPE '\\' OR data LIKE ? ESCAPE '\\') AND (? = '' OR updated_at < ? OR (updated_at = ? AND id > ?)) ORDER BY updated_at DESC, id LIMIT ?")
      .bind(like, like, like, match[1], match[1], match[1], match[2], PAGE + 1)
      .all();
    const rows = results.slice(0, PAGE).map((row) => ({ ...row, data: JSON.parse(row.data) }));
    const ids = JSON.stringify(rows.map((row) => row.id));
    const [variants, uses] = await env.DB.batch([
      env.DB.prepare("SELECT media_id, key, crop, status, error FROM variants WHERE media_id IN (SELECT value FROM json_each(?))").bind(ids),
      env.DB.prepare("SELECT media_id, COUNT(DISTINCT type || '/' || id) AS n FROM record_media WHERE media_id IN (SELECT value FROM json_each(?)) GROUP BY media_id").bind(ids),
    ]);
    const used = new Map(uses.results.map((row) => [row.media_id, row.n]));
    const last = rows.at(-1);
    return json({
      items: rows.map((row) => {
        const full = variants.results.find((variant) => variant.media_id === row.id && variant.crop === `0,0,${row.data.width},${row.data.height}`);
        return {
          id: row.id, status: row.status, version: row.version, data: row.data, updatedAt: row.updated_at, usedByCount: used.get(row.id) ?? 0,
          variant: full ? { key: full.key, status: full.status, error: full.error } : null,
        };
      }),
      next: results.length > PAGE ? `${last.updated_at}|${last.id}` : null,
    });
  },
};
