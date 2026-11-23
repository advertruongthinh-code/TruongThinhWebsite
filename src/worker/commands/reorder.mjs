// POST /api/admin/reorder (CMS plan part 2 K11, E11): { type, ids, scope? } puts every non-trashed record of a type (for
// advertising-card: every card whose main product is scope) in the order of ids. One UPDATE writes all positions, so the
// change is atomic and needs no per-row statement (D1 query limit). version and updated_at stay: order is not in data.
// Two reorders at once: the later one wins without 409, since the set of ids did not change.
import { ID } from "../../cms/contract.mjs";
import { ADVERTISING_PRODUCTS } from "../../site/advertising-products/taxonomy.mjs";
import { dispatchBuild } from "../dispatch.mjs";
import { auditStatement, HttpError, json, readJson } from "../http.mjs";
import { contentRevStatement } from "../records.mjs";

export const REORDER_TYPES = ["project", "advertising-card", "client-logo", "hero-slide"];
const STEP = 1024;
const MAX_IDS = 1000;
const ALWAYS = { sql: "1", args: [] };

export default {
  method: "POST",
  async run(request, env, ctx, actor) {
    const { type, ids, scope } = await readJson(request);
    if (!REORDER_TYPES.includes(type)) throw new HttpError(400, { error: "type" });
    const scoped = type === "advertising-card";
    if (!Array.isArray(ids) || ids.length > MAX_IDS || !ids.every((id) => typeof id === "string" && ID.test(id)) || new Set(ids).size !== ids.length
      || (scoped ? !ADVERTISING_PRODUCTS.some(({ id }) => id === scope) : scope !== undefined)) throw new HttpError(400, { error: "shape" }, { type, id: null });
    const { results } = await env.DB
      .prepare(`SELECT id, status, position FROM records WHERE type = ? AND status != 'trashed'${scoped ? " AND json_extract(data, '$.productIds[0]') = ?" : ""} ORDER BY position, id`)
      .bind(...(scoped ? [type, scope] : [type]))
      .all();
    const current = new Set(results.map((row) => row.id));
    if (current.size !== ids.length || !ids.every((id) => current.has(id))) throw new HttpError(409, { error: "stale" }, { type, id: null });
    // A product's cards keep the positions they hold among all cards; any other type is renumbered (i + 1) * 1024.
    const positions = scoped ? results.map((row) => row.position) : ids.map((_, index) => (index + 1) * STEP);
    const order = JSON.stringify(ids.map((id, index) => ({ id, p: positions[index] })));
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("UPDATE records SET position = (SELECT json_extract(value, '$.p') FROM json_each(?1) WHERE json_extract(value, '$.id') = records.id) WHERE type = ?2 AND status != 'trashed' AND id IN (SELECT json_extract(value, '$.id') FROM json_each(?1))")
        .bind(order, type),
      contentRevStatement(env, ALWAYS),
      // build-status reads it: a new order not yet on staging keeps the release button off.
      env.DB.prepare("INSERT INTO settings (key, value) VALUES ('last_save_at', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(now),
      auditStatement(env, actor, "reorder", type, scoped ? scope : null, "ok", { detail: `${ids.length}` }),
    ]);
    if (results.some((row) => row.status === "published")) ctx?.waitUntil?.(dispatchBuild(env));
    return json({});
  },
};
