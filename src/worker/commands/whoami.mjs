// GET /api/admin/whoami (cms-editor R1, CMS plan E12): the caller's email and role, read once when the editor opens, plus
// the public staging origin for "Mở trên staging" links. A locked or unknown account never gets here (router answers 403).
import { json } from "../http.mjs";

export default {
  method: "GET",
  async run(_request, env, _ctx, actor) {
    return json({ email: actor.email, role: actor.role, stagingOrigin: env.STAGING_ORIGIN_PUBLIC ?? null });
  },
};
