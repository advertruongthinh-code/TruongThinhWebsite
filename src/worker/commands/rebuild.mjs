// POST /api/admin/rebuild (CMS plan P4, Q9): dispatches a content build by hand, e.g. after a failed one.
import { dispatchBuild } from "../dispatch.mjs";
import { auditStatement, HttpError, json } from "../http.mjs";

export default {
  method: "POST",
  async run(request, env, ctx, actor) {
    const paused = await env.DB.prepare("SELECT value FROM settings WHERE key = 'publish_paused'").first("value");
    if (paused === "1") throw new HttpError(409, { error: "paused" });
    if (!(await dispatchBuild(env))) throw new HttpError(502, { error: "dispatch" });
    await auditStatement(env, actor, "rebuild", null, null, "ok").run();
    return json({}, 202);
  },
};
