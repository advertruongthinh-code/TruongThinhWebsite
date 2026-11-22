// Admin Worker trust boundary (CMS plan Q7, Q9 audit rules): imports the real Worker, runs on the fake D1.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import worker from "../../src/worker/index.js";
import { COMMANDS } from "../../src/worker/router.mjs";
import { json } from "../../src/worker/http.mjs";
import { createD1 } from "./d1-fake.mjs";

const SCHEMA = fileURLToPath(new URL("../../src/db/migrations/0001_cms.sql", import.meta.url));
const TEAM = "https://team.cloudflareaccess.com";
const ORIGIN = "https://admin.example.test";
const NOW = "2026-11-22T00:00:00.000Z";
const b64 = (value) => Buffer.from(typeof value === "string" ? value : value).toString("base64url");

// Commands used only by this test: the task has no real write command yet.
COMMANDS["test-write"] = { method: "POST", run: async () => json({ ok: true }) };
COMMANDS["test-owner"] = { method: "POST", owner: true, run: async () => json({ ok: true }) };

const pair = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["sign", "verify"],
);
const jwk = { ...(await crypto.subtle.exportKey("jwk", pair.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
globalThis.fetch = async (url) => {
  assert.equal(String(url), `${TEAM}/cdn-cgi/access/certs`);
  return new Response(JSON.stringify({ keys: [jwk] }), { headers: { "content-type": "application/json" } });
};

async function token(claims, { key = pair.privateKey, alg = "RS256" } = {}) {
  const head = b64(JSON.stringify({ alg, kid: "k1", typ: "JWT" }));
  const body = b64(JSON.stringify({ iss: TEAM, aud: ["user-aud"], exp: Math.floor(Date.now() / 1000) + 300, ...claims }));
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64(new Uint8Array(signature))}`;
}

function setup({ accounts = [] } = {}) {
  const DB = createD1(SCHEMA);
  for (const [email, role, status] of accounts) {
    DB.sqlite.prepare("INSERT INTO accounts VALUES (?, ?, ?, ?, 'seed', ?, 'seed')").run(email, role, status, NOW, NOW);
  }
  const allow = { limit: async () => ({ success: true }) };
  const env = {
    DB,
    ACCESS_TEAM_DOMAIN: TEAM,
    ACCESS_AUD: "user-aud",
    ACCESS_SERVICE_AUD: "service-aud",
    SERVICE_TOKEN_CLIENT_ID: "client-1.access",
    CMS_BOOTSTRAP_OWNER: "Owner@Example.test",
    ADMIN_WRITE_LIMIT: allow,
    ADMIN_UPLOAD_LIMIT: allow,
    ASSETS: { fetch: async () => new Response("asset") },
  };
  return env;
}

const call = (env, path, { jwt, method = "GET", headers = {}, body } = {}) =>
  worker.fetch(new Request(`${ORIGIN}/api/admin/${path}`, {
    method,
    headers: { ...(jwt ? { "Cf-Access-Jwt-Assertion": jwt } : {}), ...headers },
    body,
  }), env);
const post = (env, path, jwt, headers = { Origin: ORIGIN, "Content-Type": "application/json" }) =>
  call(env, path, { jwt, method: "POST", headers, body: "{}" });
const auditRows = (env) => env.DB.sqlite.prepare("SELECT email, command, result FROM audit_log ORDER BY seq").all().map((row) => ({ ...row }));

test("a valid user JWT of an active account reaches a user command", async () => {
  const env = setup({ accounts: [["staff@example.test", "staff", "active"]] });
  const response = await call(env, "build-status", { jwt: await token({ email: "Staff@Example.test" }) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { paused: false });
});

test("a bad JWT is refused without an audit row", async () => {
  const env = setup({ accounts: [["staff@example.test", "staff", "active"]] });
  const good = await token({ email: "staff@example.test" });
  const [head, body, signature] = good.split(".");
  const other = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign"],
  );
  const cases = {
    "wrong signature": await token({ email: "staff@example.test" }, { key: other.privateKey }),
    "tampered signature": `${head}.${body}.${signature.slice(0, -2)}${signature.at(-2) === "A" ? "B" : "A"}${signature.at(-1)}`,
    "wrong aud": await token({ email: "staff@example.test", aud: ["other"] }),
    "service aud on a user path": await token({ email: "staff@example.test", aud: ["service-aud"] }),
    "wrong iss": await token({ email: "staff@example.test", iss: "https://other.cloudflareaccess.com" }),
    expired: await token({ email: "staff@example.test", exp: Math.floor(Date.now() / 1000) - 1 }),
    "not yet valid": await token({ email: "staff@example.test", nbf: Math.floor(Date.now() / 1000) + 600 }),
    "alg HS256": await token({ email: "staff@example.test" }, { alg: "HS256" }),
    "alg none": await token({ email: "staff@example.test" }, { alg: "none" }),
    "no email": await token({}),
    missing: undefined,
  };
  for (const [label, jwt] of Object.entries(cases)) {
    assert.equal((await call(env, "build-status", { jwt })).status, 403, label);
    assert.equal((await post(env, "test-write", jwt)).status, 403, label);
  }
  assert.deepEqual(auditRows(env), []);
});

test("a locked account is refused", async () => {
  const env = setup({ accounts: [["staff@example.test", "staff", "locked"]] });
  assert.equal((await call(env, "build-status", { jwt: await token({ email: "staff@example.test" }) })).status, 403);
});

test("bootstrap creates the first owner only for CMS_BOOTSTRAP_OWNER on an empty table", async () => {
  const env = setup();
  assert.equal((await call(env, "build-status", { jwt: await token({ email: "someone@example.test" }) })).status, 403);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM accounts").get().n, 0);
  assert.equal((await call(env, "build-status", { jwt: await token({ email: "owner@example.test" }) })).status, 200);
  assert.deepEqual({ ...env.DB.sqlite.prepare("SELECT email, role, status FROM accounts").get() }, { email: "owner@example.test", role: "owner", status: "active" });

  const filled = setup({ accounts: [["staff@example.test", "staff", "active"]] });
  assert.equal((await call(filled, "build-status", { jwt: await token({ email: "owner@example.test" }) })).status, 403);
  assert.equal(filled.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM accounts").get().n, 1);

  // Another account lands between the count and the insert: the bootstrap insert writes nothing and grants nothing.
  const raced = setup();
  const prepare = raced.DB.prepare;
  raced.DB.prepare = (sql) => {
    if (sql.startsWith("INSERT INTO accounts")) raced.DB.sqlite.prepare("INSERT INTO accounts VALUES ('staff@example.test', 'staff', 'active', ?, 's', ?, 's')").run(NOW, NOW);
    return prepare(sql);
  };
  assert.equal((await call(raced, "build-status", { jwt: await token({ email: "owner@example.test" }) })).status, 403);
});

test("nbf allows 60 seconds of clock skew and no more", async () => {
  const env = setup({ accounts: [["staff@example.test", "staff", "active"]] });
  const now = Math.floor(Date.now() / 1000);
  assert.equal((await call(env, "build-status", { jwt: await token({ email: "staff@example.test", nbf: now + 30 }) })).status, 200);
  assert.equal((await call(env, "build-status", { jwt: await token({ email: "staff@example.test", nbf: now + 120 }) })).status, 403);
});

test("the service token reaches only machine paths, and a user JWT never does", async () => {
  const env = setup({ accounts: [["owner@example.test", "owner", "active"]] });
  const service = await token({ aud: ["service-aud"], common_name: "client-1.access" });
  assert.equal((await call(env, "snapshot", { jwt: service })).status, 200);
  assert.equal((await call(env, "snapshot", { jwt: await token({ aud: ["service-aud"], common_name: "other.access" }) })).status, 403);
  assert.equal((await call(env, "snapshot", { jwt: await token({ email: "owner@example.test" }) })).status, 403);
  assert.equal((await call(env, "snapshot", { jwt: await token({ email: "owner@example.test", aud: ["service-aud"] }) })).status, 403);
  assert.equal((await call(env, "build-status", { jwt: service })).status, 403);
});

test("write refusals before the handler each write one audit row", async () => {
  const env = setup({ accounts: [["staff@example.test", "staff", "active"]] });
  const jwt = await token({ email: "staff@example.test" });
  assert.equal((await post(env, "test-write", jwt, { Origin: "https://evil.example", "Content-Type": "application/json" })).status, 403);
  assert.equal((await post(env, "test-write", jwt, { "Content-Type": "application/json" })).status, 403);
  assert.equal((await post(env, "test-write", jwt, { Origin: ORIGIN, "Content-Type": "text/plain" })).status, 415);
  assert.equal((await post(env, "test-owner", jwt)).status, 403);
  assert.equal((await post(env, "test-write", jwt)).status, 200);
  assert.deepEqual(auditRows(env), [
    { email: "staff@example.test", command: "test-write", result: "403 origin" },
    { email: "staff@example.test", command: "test-write", result: "403 origin" },
    { email: "staff@example.test", command: "test-write", result: "415" },
    { email: "staff@example.test", command: "test-owner", result: "403 role" },
  ]);
});

test("rate limits refuse with 429 and an audit row", async () => {
  const env = setup({ accounts: [["owner@example.test", "owner", "active"]] });
  env.ADMIN_WRITE_LIMIT = { limit: async ({ key }) => ({ success: key !== "owner@example.test" }) };
  assert.equal((await post(env, "test-owner", await token({ email: "owner@example.test" }))).status, 429);
  assert.deepEqual(auditRows(env), [{ email: "owner@example.test", command: "test-owner", result: "429" }]);
});

test("routing: unknown command 404, wrong method 405, other paths go to assets, storage errors 503", async () => {
  const env = setup({ accounts: [["owner@example.test", "owner", "active"]] });
  const jwt = await token({ email: "owner@example.test" });
  assert.equal((await call(env, "content/home", { jwt })).status, 404);
  assert.equal((await call(env, "constructor", { jwt })).status, 404);
  assert.equal((await call(env, "test-write", { jwt })).status, 405);
  assert.equal(await (await worker.fetch(new Request(`${ORIGIN}/vi/`), env)).text(), "asset");
  env.DB.sqlite.exec("DROP TABLE settings");
  const broken = await call(env, "build-status", { jwt });
  assert.equal(broken.status, 503);
  assert.deepEqual(await broken.json(), { error: "storage unavailable" });
});

test("dev login works only on a loopback host", async () => {
  const env = { ...setup(), CMS_LOCAL_ADMIN_EMAIL: "admin@localhost" };
  assert.equal((await worker.fetch(new Request("http://127.0.0.1:8788/api/admin/build-status"), env)).status, 200);
  assert.equal((await worker.fetch(new Request("http://admin.localhost:8788/api/admin/build-status"), env)).status, 200);
  assert.equal((await call(env, "build-status")).status, 403);
});
