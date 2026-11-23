// POST /api/admin/resume-publish (CMS plan P6; cms.md R6): owner only, ends the pause a rollback set and dispatches a content build.
import { dispatchBuild } from "../dispatch.mjs";
import { auditStatement, json } from "../http.mjs";

export default {
  method: "POST",
  owner: true,
  async run(request, env, ctx, actor) {
    await env.DB.batch([
      env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('publish_paused', '0')"),
      auditStatement(env, actor, "resume-publish", null, null, "ok"),
    ]);
    await dispatchBuild(env);
    return json({ paused: false });
  },
};
