// POST /api/admin/rollback (CMS plan P6; cms.md R6): owner only, rolls staging back to one of the 10 latest deployments
// and pauses publishing until resume-publish. The Worker only dispatches rollback.yml; the Cloudflare token stays in GitHub.
import { dispatchWorkflow } from "../dispatch.mjs";
import { auditStatement, HttpError, json, readJson } from "../http.mjs";
import { readDeployments } from "./build-status.mjs";

const VERSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default {
  method: "POST",
  owner: true,
  async run(request, env, ctx, actor) {
    const { versionId } = await readJson(request);
    if (typeof versionId !== "string" || !VERSION_ID.test(versionId)) throw new HttpError(400, { error: "shape" });
    const deployments = await readDeployments(env);
    // The newest marker is what staging already runs; a rollback goes to an older one only.
    if (!deployments.slice(1).some((marker) => marker.versionId === versionId)) throw new HttpError(400, { error: "version" });
    await env.DB.batch([
      env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('publish_paused', '1')"),
      auditStatement(env, actor, "rollback", null, versionId, "ok"),
    ]);
    // Publishing stays paused on a failed dispatch: the owner sees 502 and presses again.
    if (!(await dispatchWorkflow(env, "rollback.yml", { version_id: versionId }))) throw new HttpError(502, { error: "dispatch" });
    return json({ paused: true }, 202);
  },
};
