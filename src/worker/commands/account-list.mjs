// GET /api/admin/account-list (CMS plan P7; cms-editor-ops.md R6): owner only; me marks the caller's own row.
import { json } from "../http.mjs";

export default {
  method: "GET",
  owner: true,
  async run(_request, env, _ctx, actor) {
    const [{ results }, drift] = await Promise.all([
      env.DB.prepare("SELECT email, role, status, updated_at FROM accounts ORDER BY email").all(),
      env.DB.prepare("SELECT value FROM settings WHERE key = 'access_drift'").first("value"),
    ]);
    return json({ items: results, me: actor.email, accessDrift: drift ? JSON.parse(drift) : null });
  },
};
