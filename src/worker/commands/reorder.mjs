// POST /api/admin/reorder (CMS plan part 2 K11, E11): { type, ids, scope? } puts every non-trashed record of a type (for
// advertising-card: every card whose main product is scope) in the order of ids. One UPDATE writes all positions, so the
// change is atomic and needs no per-row statement (D1 query limit). version and updated_at stay: order is not in data.
// The UPDATE also checks the set again, so a save, create or restore between the read and the batch gives 409, not a
// half-applied order. Two reorders at once: the later one wins without 409, since the set of ids did not change.
import { ID } from "../../cms/contract.mjs";
import { ADVERTISING_PRODUCTS } from "../../site/advertising-products/taxonomy.mjs";
import { dispatchBuild } from "../dispatch.mjs";
import { auditStatement, HttpError, json, readJson } from "../http.mjs";
import { contentRevStatement } from "../records.mjs";

export const REORDER_TYPES = ["project", "advertising-card", "client-logo", "hero-slide"];
const STEP = 1024;
const MAX_IDS = 1000;

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
    const published = results.some((row) => row.status === "published");
    // True while the type (or the product's cards) still holds exactly the ids sent; every statement of the batch needs it.
    const inScope = `type = ?2 AND status != 'trashed'${scoped ? " AND json_extract(data, '$.productIds[0]') = ?3" : ""}`;
    const same = `(SELECT COUNT(*) FROM records WHERE ${inScope}) = json_array_length(?1) AND NOT EXISTS (SELECT 1 FROM records WHERE ${inScope} AND id NOT IN (SELECT json_extract(value, '$.id') FROM json_each(?1)))`;
    const args = scoped ? [order, type, scope] : [order, type];
    const G = { sql: `EXISTS (SELECT 1 WHERE ${same.replaceAll("?1", "?").replaceAll("?2", "?").replaceAll("?3", "?")})`, args: scoped ? [type, scope, order, type, scope, order] : [type, order, type, order] };
    const [update] = await env.DB.batch([
      env.DB.prepare(`UPDATE records SET position = (SELECT json_extract(value, '$.p') FROM json_each(?1) WHERE json_extract(value, '$.id') = records.id) WHERE ${inScope} AND id IN (SELECT json_extract(value, '$.id') FROM json_each(?1)) AND ${same}`)
        .bind(...args),
      contentRevStatement(env, G),
      // build-status reads it: a new order of published records not yet on staging shows staging as behind.
      ...(published ? [env.DB.prepare(`INSERT INTO settings (key, value) SELECT 'last_save_at', ? WHERE ${G.sql} ON CONFLICT (key) DO UPDATE SET value = excluded.value`).bind(now, ...G.args)] : []),
      auditStatement(env, actor, "reorder", type, scoped ? scope : null, "ok", { detail: `${ids.length}`, guard: G }),
    ]);
    if (update.meta.changes !== ids.length) throw new HttpError(409, { error: "stale" }, { type, id: null });
    if (published) ctx?.waitUntil?.(dispatchBuild(env));
    return json({});
  },
};
