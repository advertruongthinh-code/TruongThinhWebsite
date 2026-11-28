// POST /api/admin/retry-variant (CMS plan part 2 K11, E11): a variant in error goes back to pending and is dispatched again.
import { dispatchVariants } from "../dispatch.mjs";
import { auditStatement, HttpError, json, readJson } from "../http.mjs";

export default {
  method: "POST",
  async run(request, env, ctx, actor) {
    const { key } = await readJson(request);
    if (typeof key !== "string" || !/^[0-9a-f]{32}$/.test(key)) throw new HttpError(400, { error: "shape" });
    const update = await env.DB
      .prepare("UPDATE variants SET status = 'pending', error = NULL, run_id = NULL, settled_at = NULL, created_at = ? WHERE key = ? AND status = 'error'")
      .bind(new Date().toISOString(), key)
      .run();
    if (update.meta.changes !== 1) {
      const exists = await env.DB.prepare("SELECT 1 FROM variants WHERE key = ?").bind(key).first();
      throw new HttpError(exists ? 409 : 404, { error: exists ? "not-error" : "not-found" }, { type: "variant", id: key });
    }
    // Written after the UPDATE (not in its batch): only the request whose UPDATE changed the row writes "ok".
    await auditStatement(env, actor, "retry-variant", "variant", key, "ok").run();
    // dispatchVariants sends a video as a dispatch of its own (Q6).
    ctx?.waitUntil?.(dispatchVariants(env, [key]));
    return json({}, 202);
  },
};
