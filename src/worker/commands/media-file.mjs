// GET /api/admin/media-file?id= (CMS plan P2, Q9): the original for the editor preview; a repo media redirects to its path.
import { HttpError } from "../http.mjs";
import { originalResponse, readId } from "../media.mjs";

export default {
  method: "GET",
  run: (request, env, _ctx, _actor, url) =>
    originalResponse(request, env, readId(url), {}, (data) => {
      // Only a same-site path: "//host" or a missing path would be an open or broken redirect.
      if (typeof data.path !== "string" || !/^\/(?![\/\\])/.test(data.path)) throw new HttpError(404, { error: "not-found" });
      return new Response(null, { status: 302, headers: { Location: data.path } });
    }),
};
