// POST /api/admin/account-add { email, role } (CMS plan P7; cms.md R2): Access policy first, D1 only after it succeeds.
import { addPolicyEmail } from "../access.mjs";
import { auditStatement, HttpError, json, readJson } from "../http.mjs";

export const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const ROLES = ["owner", "staff"];

export default {
  method: "POST",
  owner: true,
  async run(request, env, _ctx, actor) {
    const body = await readJson(request);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL.test(email) || !ROLES.includes(body.role)) throw new HttpError(400, { error: "shape" });
    const target = { type: "account", id: email };
    if (await env.DB.prepare("SELECT 1 FROM accounts WHERE email = ?").bind(email).first()) throw new HttpError(409, { error: "exists" }, target);
    try {
      await addPolicyEmail(env, email);
    } catch (error) {
      console.error("account-add access", error.message);
      throw new HttpError(502, { error: "access" }, target);
    }
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO accounts (email, role, status, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'active', ?, ?, ?, ?)")
        .bind(email, body.role, now, actor.email, now, actor.email),
      auditStatement(env, actor, "account-add", "account", email, "ok", { detail: body.role }),
    ]);
    return json({ email, role: body.role, status: "active" }, 201);
  },
};
