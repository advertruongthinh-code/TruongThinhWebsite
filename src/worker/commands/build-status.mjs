// GET /api/admin/build-status (CMS plan Q9); P4 adds deployments, runs and dispatch state.
import { json } from "../http.mjs";

export default {
  method: "GET",
  async run(request, env) {
    const paused = await env.DB.prepare("SELECT value FROM settings WHERE key = 'publish_paused'").first();
    return json({ paused: paused?.value === "1" });
  },
};
