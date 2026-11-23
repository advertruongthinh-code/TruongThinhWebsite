// POST /api/admin/account-update { email, role?, status? } (CMS plan P7; cms.md R2).
// Lock: D1 first (the Worker refuses the person at once), then Access; an Access error still answers 200 with accessSynced: false,
// and calling lock again retries the removal. Reopen: Access first, D1 only after it succeeds. At least one active owner stays.
import { addPolicyEmail, removePolicyEmail } from "../access.mjs";
import { auditStatement, HttpError, json, readJson } from "../http.mjs";
import { ROLES } from "./account-add.mjs";

const STATUSES = ["active", "locked"];

export default {
  method: "POST",
  owner: true,
  async run(request, env, _ctx, actor) {
    const body = await readJson(request);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || (body.role !== undefined && !ROLES.includes(body.role)) || (body.status !== undefined && !STATUSES.includes(body.status))
      || (body.role === undefined && body.status === undefined)) throw new HttpError(400, { error: "shape" });
    const target = { type: "account", id: email };
    const row = await env.DB.prepare("SELECT role, status FROM accounts WHERE email = ?").bind(email).first();
    if (!row) throw new HttpError(404, { error: "not-found" }, target);
    const role = body.role ?? row.role;
    const status = body.status ?? row.status;
    if (role !== "owner" || status !== "active") {
      const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM accounts WHERE role = 'owner' AND status = 'active' AND email != ?").bind(email).first();
      if (n === 0) throw new HttpError(409, { error: "last-owner" }, target);
    }
    const reopen = status === "active" && row.status !== "active";
    if (reopen) {
      try {
        await addPolicyEmail(env, email);
      } catch (error) {
        console.error("account-update access", error.message);
        throw new HttpError(502, { error: "access" }, target);
      }
    }
    // The audit row is written after Access answers, so a lock that could not reach Access says so.
    await env.DB.prepare("UPDATE accounts SET role = ?, status = ?, updated_at = ?, updated_by = ? WHERE email = ?")
      .bind(role, status, new Date().toISOString(), actor.email, email).run();
    let accessSynced = true;
    if (status === "locked") {
      accessSynced = await removePolicyEmail(env, email).then(() => true, (error) => {
        console.error("account-update access", error.message);
        return false;
      });
    }
    await auditStatement(env, actor, "account-update", "account", email, accessSynced ? "ok" : "ok access-not-synced", { detail: `${role} ${status}` }).run();
    return json({ email, role, status, accessSynced });
  },
};
