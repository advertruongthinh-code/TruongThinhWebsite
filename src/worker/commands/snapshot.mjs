// GET /api/admin/snapshot for the build (CMS plan Q2, Q12). Workers Free has 10 ms CPU per request, and the whole snapshot
// (1.26 MB on the seed) measured 17-38 ms in S4, so it is served in pages: no query = index, ?type=&page= = one page.
// Pages join stored JSON text without parsing it. collectSnapshot (src/cms/collect-snapshot.mjs) puts them back together.
// The index also carries cronAt for the nightly dead-Cron check (scripts/cms/check-cron.mjs); collectSnapshot leaves it out.
import { HttpError } from "../http.mjs";

export const PAGE_SIZE = 40;
const LIVE = "r.status = 'published' AND r.type != 'media' AND (r.pending = 0 OR r.live_version IS NOT NULL)";
const PAGE_SQL = `SELECT CASE WHEN r.pending = 0 THEN r.data ELSE v.data END AS data
FROM records r
LEFT JOIN versions v ON v.type = r.type AND v.id = r.id AND v.version = r.live_version
WHERE ${LIVE} AND r.type = ?
ORDER BY r.position, r.id LIMIT ${PAGE_SIZE} OFFSET ?`;
const TYPES_SQL = `SELECT r.type AS type, COUNT(*) AS n FROM records r WHERE ${LIVE} GROUP BY r.type ORDER BY r.type`;
// Lets a reader tell that pages come from different moments. settings.content_rev is raised in the same batch as every
// write to records or slug_history (cms-data R2); count and newest updated_at also catch writers that forget it.
const STAMP_SQL = `SELECT COALESCE((SELECT value FROM settings WHERE key = 'content_rev'), '0') || ':' || COUNT(*) || ':' ||
  COALESCE(MAX(updated_at), '') AS stamp FROM records WHERE type != 'media'`;
const REDIRECTS_SQL = "SELECT type, locale, slug, id FROM slug_history ORDER BY type, locale, slug";
const CRON_SQL = "SELECT value FROM settings WHERE key = 'cron_at'";
const HELD_SQL = "SELECT type, id FROM records WHERE status = 'published' AND type != 'media' AND pending > 0 AND live_version IS NULL";

const reply = (text) => new Response(text, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export default {
  method: "GET",
  service: true,
  async run(request, env) {
    const paused = await env.DB.prepare("SELECT value FROM settings WHERE key = 'publish_paused'").first();
    if (paused?.value === "1") throw new HttpError(423, { error: "publish paused" });
    const params = new URL(request.url).searchParams;
    const type = params.get("type");
    if (type === null && !params.has("page")) {
      const [stamp, types, redirects, held, cron] = await env.DB.batch([STAMP_SQL, TYPES_SQL, REDIRECTS_SQL, HELD_SQL, CRON_SQL].map((sql) => env.DB.prepare(sql)));
      const counts = Object.fromEntries(types.results.map((row) => [row.type, row.n]));
      return reply(JSON.stringify({ schema: 1, takenAt: new Date().toISOString(), stamp: stamp.results[0].stamp, pageSize: PAGE_SIZE, types: counts, redirects: redirects.results, held: held.results, cronAt: cron.results[0]?.value ?? null }));
    }
    const pageText = params.get("page") ?? "";
    if (!type || !/^\d{1,6}$/.test(pageText)) throw new HttpError(400, { error: "bad page" });
    const page = Number(pageText);
    const [stamp, rows] = await env.DB.batch([env.DB.prepare(STAMP_SQL), env.DB.prepare(PAGE_SQL).bind(type, page * PAGE_SIZE)]);
    let body = "";
    for (const row of rows.results) body += (body ? "," : "") + row.data;
    return reply(`{"stamp":${JSON.stringify(stamp.results[0].stamp)},"type":${JSON.stringify(type)},"page":${page},"records":[${body}]}`);
  },
};
