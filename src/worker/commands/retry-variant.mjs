// POST /api/admin/retry-variant (CMS plan part 2 K11, E11): a variant in error goes back to pending and is dispatched again.
import { dispatchVariants } from "../dispatch.mjs";
import { auditStatement, HttpError, json, readJson } from "../http.mjs";

export default {
  method: "POST",
  async run(request, env, ctx, actor) {
    const { key } = await readJson(request);
    if (typeof key !== "string" || !/^[0-9a-f]{32}$/.test(key)) throw new HttpError(400, { error: "shape" });
    const now = new Date().toISOString();
    // The audit row is written only when the UPDATE wrote (same batch, same created_at).
    const G = { sql: "EXISTS (SELECT 1 FROM variants WHERE key = ? AND status = 'pending' AND created_at = ?)", args: [key, now] };
    const [update] = await env.DB.batch([
      env.DB.prepare("UPDATE variants SET status = 'pending', error = NULL, run_id = NULL, settled_at = NULL, created_at = ? WHERE key = ? AND status = 'error'").bind(now, key),
      auditStatement(env, actor, "retry-variant", "variant", key, "ok", { guard: G }),
    ]);
    if (update.meta.changes !== 1) {
      const exists = await env.DB.prepare("SELECT 1 FROM variants WHERE key = ?").bind(key).first();
      throw new HttpError(exists ? 409 : 404, { error: exists ? "not-error" : "not-found" }, { type: "variant", id: key });
    }
    // dispatchVariants sends a video as a dispatch of its own (Q6).
    ctx?.waitUntil?.(dispatchVariants(env, [key]));
    return json({}, 202);
  },
};
