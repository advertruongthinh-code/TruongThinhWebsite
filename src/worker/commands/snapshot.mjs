// GET /api/admin/snapshot for the build (CMS plan Q2). Joins stored JSON text without parsing it: Workers Free has 10 ms CPU.
import { HttpError } from "../http.mjs";

const RECORDS_SQL = `SELECT r.type AS type, CASE WHEN r.pending = 0 THEN r.data ELSE v.data END AS data
FROM records r
LEFT JOIN versions v ON v.type = r.type AND v.id = r.id AND v.version = r.live_version
WHERE r.status = 'published' AND r.type != 'media' AND (r.pending = 0 OR r.live_version IS NOT NULL)
ORDER BY r.type, r.position, r.id`;
const REDIRECTS_SQL = "SELECT type, locale, slug, id FROM slug_history ORDER BY type, locale, slug";
const HELD_SQL = "SELECT type, id FROM records WHERE status = 'published' AND type != 'media' AND pending > 0 AND live_version IS NULL";

export default {
  method: "GET",
  service: true,
  async run(request, env) {
    const paused = await env.DB.prepare("SELECT value FROM settings WHERE key = 'publish_paused'").first();
    if (paused?.value === "1") throw new HttpError(423, { error: "publish paused" });
    const [records, redirects, held] = await env.DB.batch([
      env.DB.prepare(RECORDS_SQL),
      env.DB.prepare(REDIRECTS_SQL),
      env.DB.prepare(HELD_SQL),
    ]);
    let body = "";
    let type = null;
    for (const row of records.results) {
      if (row.type !== type) {
        body += `${type === null ? "" : "],"}${JSON.stringify(row.type)}:[`;
        type = row.type;
      } else {
        body += ",";
      }
      body += row.data;
    }
    if (type !== null) body += "]";
    const text = `{"schema":1,"takenAt":${JSON.stringify(new Date().toISOString())},"records":{${body}},"redirects":${JSON.stringify(redirects.results)},"held":${JSON.stringify(held.results)}}`;
    return new Response(text, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  },
};
