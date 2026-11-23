// POST /api/admin/create (CMS plan P1, Q9): a new draft of a list type; singletons and media are refused.
import { ID, OPEN_TYPES, recordName, recordSlugs } from "../../cms/contract.mjs";
import { dispatchVariants } from "../dispatch.mjs";
import { auditStatement, HttpError, isPlainObject, json, readJson } from "../http.mjs";
import { contentRevStatement, FIXED_TYPES, guard, isUniqueId, isUniqueSlug } from "../records.mjs";
import { prepare, writeStatements } from "./save.mjs";

export default {
  method: "POST",
  async run(request, env, ctx, actor) {
    const { type, id, data } = await readJson(request);
    if (!OPEN_TYPES.includes(type) || type === "media" || FIXED_TYPES.includes(type) || typeof id !== "string" || !ID.test(id) || !isPlainObject(data)) throw new HttpError(400, { error: "shape" });
    const target = { type, id };
    if (JSON.stringify(data).length > 512_000) throw new HttpError(400, { error: "too-large" }, target);
    // Checked first: SQLite may report the slug index before the primary key when both clash.
    if (await env.DB.prepare("SELECT 1 FROM records WHERE type = ? AND id = ?").bind(type, id).first()) throw new HttpError(409, { error: "exists" }, target);
    const prepared = await prepare(env, type, id, data, target);
    const writeId = crypto.randomUUID();
    const now = new Date().toISOString();
    const text = JSON.stringify(prepared.next);
    const slugs = recordSlugs(type, prepared.next);
    const G = guard(type, id, writeId);
    try {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO records (type, id, status, version, live_version, pending, position, name, slug_vi, slug_en, data, write_id, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'draft', 1, NULL, 0, (SELECT COALESCE(MAX(position), -1) + 1 FROM records WHERE type = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(type, id, type, recordName(type, prepared.next) || id, slugs.vi, slugs.en, text, writeId, now, actor.email, now, actor.email),
        ...writeStatements(env, { type, id, version: 1, status: "draft", text, usesJson: prepared.usesJson, now, actor, writeId, G }),
        contentRevStatement(env, G),
        auditStatement(env, actor, "create", type, id, "ok", { guard: G }),
      ]);
    } catch (error) {
      if (isUniqueId(error)) throw new HttpError(409, { error: "exists" }, target);
      if (isUniqueSlug(error)) throw new HttpError(409, { error: "slug" }, target);
      throw error;
    }
    if (prepared.redo.length) ctx?.waitUntil?.(dispatchVariants(env, prepared.redo));
    return json({ type, id, version: 1, status: "draft" }, 201);
  },
};
