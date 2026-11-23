// Admin Worker of the CMS (docs/specs/cms.md R1): admin API only; every other path is a static asset.
import { runCron } from "./cron.mjs";
import { route } from "./router.mjs";

export default {
  fetch: (request, env, ctx) => route(request, env, ctx),
  scheduled: (event, env, ctx) => runCron(event, env, ctx),
};
