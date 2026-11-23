// Seeded D1 and a route() caller shared by the E11 command tests.
import { seedSql } from "../../scripts/cms/seed.mjs";
import { route } from "../../src/worker/router.mjs";
import { createD1, MIGRATIONS } from "./d1-fake.mjs";

const SEED = await seedSql({ now: "2026-11-22T00:00:00.000Z" });
const ORIGIN = "http://127.0.0.1:8787";

export function seededEnv({ email = "owner@example.com", role = "owner", seed = true } = {}) {
  const DB = createD1(MIGRATIONS);
  if (seed) DB.sqlite.exec(SEED);
  const env = {
    DB,
    CMS_LOCAL_ADMIN_EMAIL: email,
    ADMIN_WRITE_LIMIT: { limit: async () => ({ success: true }) },
    ADMIN_UPLOAD_LIMIT: { limit: async () => ({ success: true }) },
    ASSETS: { fetch: async () => new Response("asset") },
  };
  const as = (who, whoRole) => DB.sqlite.prepare("INSERT OR REPLACE INTO accounts VALUES (?, ?, 'active', 'x', 'x', 'x', 'x')").run(who, whoRole);
  as(email, role);
  const waits = [];
  const call = async (command, body, query = "") => {
    const init = body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN }, body: JSON.stringify(body) };
    const response = await route(new Request(`${ORIGIN}/api/admin/${command}${query}`, init), env, { waitUntil: (promise) => waits.push(promise) });
    return { status: response.status, body: await response.json() };
  };
  const all = (sql, ...args) => DB.sqlite.prepare(sql).all(...args).map((row) => ({ ...row }));
  const one = (sql, ...args) => { const row = DB.sqlite.prepare(sql).get(...args); return row && { ...row }; };
  const audits = () => all("SELECT email, command, type, id, result FROM audit_log ORDER BY seq").map((a) => `${a.command} ${a.result}`);
  return { env, DB, call, all, one, audits, waits };
}
