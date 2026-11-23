// GET /api/admin/context (CMS plan part 2 K11): data of every published news and project, as the build reads it, for
// the editor preview and the missing-fields tab. Stored JSON text is joined, never parsed (Workers Free CPU, like snapshot).
import { LIVE_DATA_SQL } from "./snapshot.mjs";

export default {
  method: "GET",
  async run(_request, env) {
    const { results } = await env.DB.prepare(`${LIVE_DATA_SQL} AND r.type IN ('news', 'project') ORDER BY r.type, r.position, r.id`).all();
    const join = (type) => results.filter((row) => row.type === type).map((row) => row.data).join(",");
    return new Response(`{"news":[${join("news")}],"projects":[${join("project")}]}`, {
      headers: { "Content-Type": "application/json; charset=UTF-8", "Cache-Control": "no-store" },
    });
  },
};
