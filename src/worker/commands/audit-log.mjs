// GET /api/admin/audit-log?cursor=&email=&command= (CMS plan P1, Q9; part 2 K11): newest first, 100 rows a page.
// Staff always see only their own rows: their email filter is forced, whatever the query says.
import { HttpError, json } from "../http.mjs";

const PAGE = 100;

export default {
  method: "GET",
  async run(_request, env, _ctx, actor, url) {
    const cursor = url.searchParams.get("cursor") ?? "";
    const command = url.searchParams.get("command") ?? "";
    const asked = (url.searchParams.get("email") ?? "").toLowerCase();
    if ((cursor && !/^\d{1,15}$/.test(cursor)) || (command && !/^[a-z-]{1,40}$/.test(command)) || asked.length > 254) throw new HttpError(400, { error: "query" });
    const before = cursor ? Number(cursor) : Number.MAX_SAFE_INTEGER;
    const email = actor.role === "owner" ? asked : actor.email;
    const { results } = await env.DB
      .prepare("SELECT seq, at, email, command, type, id, result FROM audit_log WHERE seq < ? AND (? = '' OR email = ?) AND (? = '' OR command = ?) ORDER BY seq DESC LIMIT ?")
      .bind(before, email, email, command, command, PAGE + 1)
      .all();
    const rows = results.slice(0, PAGE);
    return json({ items: rows, next: results.length > PAGE ? String(rows.at(-1).seq) : null });
  },
};
