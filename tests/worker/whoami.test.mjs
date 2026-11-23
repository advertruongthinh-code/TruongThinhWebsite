// whoami and the ADMIN_ORIGIN write check (cms-editor R1, CMS plan E12).
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { route } from "../../src/worker/router.mjs";
import { createD1 } from "./d1-fake.mjs";

const SCHEMA = fileURLToPath(new URL("../../src/db/migrations/0001_cms.sql", import.meta.url));
const ORIGIN = "http://127.0.0.1:8787";
const env = (vars = {}) => ({
  DB: createD1(SCHEMA),
  CMS_LOCAL_ADMIN_EMAIL: "owner@example.com",
  ADMIN_WRITE_LIMIT: { limit: async () => ({ success: true }) },
  ADMIN_UPLOAD_LIMIT: { limit: async () => ({ success: true }) },
  ...vars,
});
const call = async (vars, command, init) => {
  const response = await route(new Request(`${ORIGIN}/api/admin/${command}`, init), env(vars), { waitUntil() {} });
  return { status: response.status, body: await response.json() };
};

test("whoami returns the caller and the staging origin", async () => {
  assert.deepEqual(await call({ STAGING_ORIGIN_PUBLIC: "https://staging.example" }, "whoami"),
    { status: 200, body: { email: "owner@example.com", role: "owner", stagingOrigin: "https://staging.example" } });
  assert.equal((await call({}, "whoami", { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN }, body: "{}" })).status, 405);
});

test("a write must come from ADMIN_ORIGIN when it is set, else from the request's own origin", async () => {
  const write = { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN }, body: JSON.stringify({ type: "project", ids: [] }) };
  assert.deepEqual(await call({ ADMIN_ORIGIN: "https://admin.example" }, "trash", write), { status: 403, body: { error: "403 origin" } });
  assert.notEqual((await call({}, "trash", write)).status, 403);
  assert.notEqual((await call({ ADMIN_ORIGIN: ORIGIN }, "trash", write)).status, 403);
});
