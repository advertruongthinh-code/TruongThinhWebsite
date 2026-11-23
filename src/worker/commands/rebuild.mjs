// POST /api/admin/rebuild (CMS plan P4, Q9): dispatches a content build by hand, e.g. after a failed one.
import { dispatchBuild } from "../dispatch.mjs";
import { auditStatement, HttpError, json } from "../http.mjs";

export default {
  method: "POST",
  async run(request, env, ctx, actor) {
    const result = await dispatchBuild(env);
    if (result === "paused") throw new HttpError(409, { error: "paused" });
    if (!result) throw new HttpError(502, { error: "dispatch" });
    await auditStatement(env, actor, "rebuild", null, null, "ok").run();
    return json({}, 202);
  },
};
