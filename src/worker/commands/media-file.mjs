// GET /api/admin/media-file?id= (CMS plan P2, Q9): the original for the editor preview; a repo media redirects to its path.
import { originalResponse, readId } from "../media.mjs";

export default {
  method: "GET",
  run: (request, env, _ctx, _actor, url) =>
    originalResponse(request, env, readId(url), {}, (data) => new Response(null, { status: 302, headers: { Location: data.path } })),
};
