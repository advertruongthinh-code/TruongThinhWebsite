// GET /api/admin/media-original?id= (CMS plan P2, Q9): original bytes and X-Hash for the variants job; service token only.
import { HttpError } from "../http.mjs";
import { originalResponse, readId } from "../media.mjs";

export default {
  method: "GET",
  service: true,
  async run(request, env, _ctx, _actor, url) {
    const id = readId(url);
    const row = await env.DB.prepare("SELECT json_extract(data, '$.hash') AS hash FROM records WHERE type = 'media' AND id = ?").bind(id).first();
    // The job reads repo files from its checkout, so a repo media is 404 here.
    return originalResponse(request, env, id, { "X-Hash": row?.hash ?? "" }, () => { throw new HttpError(404, { error: "not-found" }); });
  },
};
