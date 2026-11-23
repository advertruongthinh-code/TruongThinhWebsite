// Accounts and Access policy sync (CMS plan P7; cms.md R2, cms-editor-ops.md R6), against a fake Access API.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkAccessDrift } from "../../src/worker/access.mjs";
import { COMMANDS, route } from "../../src/worker/router.mjs";
import { createD1 } from "./d1-fake.mjs";

const SCHEMA = fileURLToPath(new URL("../../src/db/migrations/0001_cms.sql", import.meta.url));
const ORIGIN = "http://127.0.0.1:8787";
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

// The fake policy keeps a non-email rule and extra fields that every PUT must carry over unchanged.
function setup({ accounts = [["a@example.com", "owner", "active"]], fail = null } = {}) {
  const DB = createD1(SCHEMA);
  for (const [email, role, status] of accounts) DB.sqlite.prepare("INSERT INTO accounts VALUES (?, ?, ?, 'x', 'x', 'x', 'x')").run(email, role, status);
  const policy = {
    id: "p1", name: "CMS admin owner", decision: "allow", precedence: 1, session_duration: "24h", exclude: [], require: [],
    include: [{ email_domain: { domain: "example.org" } }, ...accounts.filter(([, , status]) => status === "active").map(([email]) => ({ email: { email } }))],
    created_at: "x",
  };
  const puts = [];
  globalThis.fetch = async (url, init = {}) => {
    assert.equal(String(url), "https://api.cloudflare.com/client/v4/accounts/acc/access/apps/app1/policies/p1");
    assert.equal(init.headers.Authorization, "Bearer t");
    const method = init.method ?? "GET";
    if (fail === method) return new Response("{}", { status: 500 });
    if (method === "PUT") {
      const body = JSON.parse(init.body);
      puts.push(body);
      Object.assign(policy, body);
    }
    return new Response(JSON.stringify({ success: true, result: policy }), { status: 200 });
  };
  const env = {
    DB,
    CF_ACCOUNT_ID: "acc",
    ACCESS_API_TOKEN: "t",
    ACCESS_APP_ID: "app1",
    ACCESS_POLICY_ID: "p1",
    CMS_LOCAL_ADMIN_EMAIL: "a@example.com",
    ADMIN_WRITE_LIMIT: { limit: async () => ({ success: true }) },
    ADMIN_UPLOAD_LIMIT: { limit: async () => ({ success: true }) },
    ASSETS: { fetch: async () => new Response("asset") },
  };
  const call = async (command, body) => {
    const init = body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN }, body: JSON.stringify(body) };
    const response = await route(new Request(`${ORIGIN}/api/admin/${command}`, init), env, {});
    return { status: response.status, body: await response.json() };
  };
  const rows = () => DB.sqlite.prepare("SELECT email, role, status FROM accounts ORDER BY email").all().map((row) => `${row.email} ${row.role} ${row.status}`);
  const emails = () => policy.include.filter((rule) => rule.email).map((rule) => rule.email.email);
  const audits = () => DB.sqlite.prepare("SELECT command, id, result FROM audit_log ORDER BY seq").all().map((row) => `${row.command} ${row.id} ${row.result}`);
  return { env, call, rows, emails, audits, puts, policy };
}

// route() refuses staff with 403 and an audit row "403 role" for owner commands (tests/worker/auth.test.mjs).
test("account commands are owner-only", () => {
  for (const name of ["account-add", "account-update", "account-list"]) assert.equal(COMMANDS[name].owner, true, name);
});

test("account-add writes Access first, then D1, and keeps the other policy rules and fields", async () => {
  const t = setup();
  const result = await t.call("account-add", { email: "  New@Example.com ", role: "staff" });
  assert.equal(result.status, 201);
  assert.deepEqual(t.rows(), ["a@example.com owner active", "new@example.com staff active"]);
  assert.deepEqual(t.emails(), ["a@example.com", "new@example.com"]);
  assert.deepEqual(t.puts[0].include[0], { email_domain: { domain: "example.org" } });
  assert.deepEqual(Object.keys(t.puts[0]).sort(), ["decision", "exclude", "include", "name", "precedence", "require", "session_duration"]);
  assert.deepEqual(t.audits(), ["account-add new@example.com ok"]);
  assert.equal((await t.call("account-add", { email: "new@example.com", role: "owner" })).status, 409);
  assert.equal((await t.call("account-add", { email: "not-an-email", role: "staff" })).status, 400);
  assert.equal((await t.call("account-add", { email: "b@example.com", role: "admin" })).status, 400);
});

test("account-add answers 502 and leaves D1 unchanged when Access fails", async () => {
  const t = setup({ fail: "PUT" });
  const result = await t.call("account-add", { email: "new@example.com", role: "staff" });
  assert.deepEqual(result, { status: 502, body: { error: "access" } });
  assert.deepEqual(t.rows(), ["a@example.com owner active"]);
  assert.deepEqual(t.audits(), ["account-add new@example.com 502 access"]);
});

test("the last active owner cannot be locked or made staff", async () => {
  const t = setup({ accounts: [["a@example.com", "owner", "active"], ["s@example.com", "staff", "active"]] });
  assert.deepEqual(await t.call("account-update", { email: "a@example.com", status: "locked" }), { status: 409, body: { error: "last-owner" } });
  assert.equal((await t.call("account-update", { email: "a@example.com", role: "staff" })).status, 409);
  assert.deepEqual(t.rows(), ["a@example.com owner active", "s@example.com staff active"]);
  assert.equal(t.puts.length, 0);
});

test("an owner may lock themself while another owner stays active", async () => {
  const t = setup({ accounts: [["a@example.com", "owner", "active"], ["b@example.com", "owner", "active"]] });
  assert.equal((await t.call("account-update", { email: "a@example.com", status: "locked" })).status, 200);
  assert.deepEqual(t.emails(), ["b@example.com"]);
});

test("lock writes D1 first, then removes the email from the policy; an Access error answers accessSynced false", async () => {
  const t = setup({ accounts: [["a@example.com", "owner", "active"], ["s@example.com", "staff", "active"]] });
  assert.deepEqual((await t.call("account-update", { email: "s@example.com", status: "locked" })).body,
    { email: "s@example.com", role: "staff", status: "locked", accessSynced: true });
  assert.deepEqual(t.emails(), ["a@example.com"]);

  const failing = setup({ accounts: [["a@example.com", "owner", "active"], ["s@example.com", "staff", "active"]], fail: "PUT" });
  const result = await failing.call("account-update", { email: "s@example.com", status: "locked" });
  assert.equal(result.status, 200);
  assert.equal(result.body.accessSynced, false);
  assert.deepEqual(failing.rows(), ["a@example.com owner active", "s@example.com staff locked"]);
  assert.deepEqual(failing.audits(), ["account-update s@example.com ok", "account-update s@example.com access-not-synced"]);
});

test("reopen adds to Access first; an Access error answers 502 and keeps the lock", async () => {
  const failing = setup({ accounts: [["a@example.com", "owner", "active"], ["s@example.com", "staff", "locked"]], fail: "PUT" });
  assert.equal((await failing.call("account-update", { email: "s@example.com", status: "active" })).status, 502);
  assert.deepEqual(failing.rows(), ["a@example.com owner active", "s@example.com staff locked"]);

  const t = setup({ accounts: [["a@example.com", "owner", "active"], ["s@example.com", "staff", "locked"]] });
  assert.equal((await t.call("account-update", { email: "s@example.com", status: "active", role: "owner" })).status, 200);
  assert.deepEqual(t.rows(), ["a@example.com owner active", "s@example.com owner active"]);
  assert.deepEqual(t.emails(), ["a@example.com", "s@example.com"]);
});

test("a role change alone does not call Access", async () => {
  const t = setup({ accounts: [["a@example.com", "owner", "active"], ["s@example.com", "staff", "active"]] });
  assert.equal((await t.call("account-update", { email: "s@example.com", role: "owner" })).status, 200);
  assert.equal(t.puts.length, 0);
  assert.equal((await t.call("account-update", { email: "x@example.com", role: "owner" })).status, 404);
});

test("account-list returns rows, the caller and the stored drift", async () => {
  const t = setup({ accounts: [["a@example.com", "owner", "active"], ["s@example.com", "staff", "active"]] });
  t.policy.include.push({ email: { email: "extra@example.com" } });
  t.policy.include = t.policy.include.filter((rule) => rule.email?.email !== "s@example.com");
  await checkAccessDrift(t.env);
  const { body } = await t.call("account-list");
  assert.equal(body.me, "a@example.com");
  assert.deepEqual(body.items.map((row) => row.email), ["a@example.com", "s@example.com"]);
  assert.deepEqual(body.accessDrift, { onlyAccess: ["extra@example.com"], onlyAccounts: ["s@example.com"] });

  const synced = setup();
  await checkAccessDrift(synced.env);
  assert.equal((await synced.call("account-list")).body.accessDrift, null);
});

test("two owners demoting each other at once leave one active owner", async () => {
  const t = setup({ accounts: [["a@example.com", "owner", "active"], ["b@example.com", "owner", "active"]] });
  const results = await Promise.all([
    t.call("account-update", { email: "a@example.com", role: "staff" }),
    t.call("account-update", { email: "b@example.com", role: "staff" }),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
  assert.equal(t.rows().filter((row) => row.endsWith("owner active")).length, 1);
});
