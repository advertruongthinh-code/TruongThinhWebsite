// scripts/cms/fetch-snapshot.mjs (docs/specs/cms-data.md R6, cms-plan P5) against a fake paged snapshot endpoint and staging origin.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { filesToRecords, recordsToSnapshot, snapshotId, snapshotToFiles } from "../../src/cms/projection.mjs";
import { repoFiles } from "../cms/seed.mjs";

const SCRIPT = fileURLToPath(new URL("../../scripts/cms/fetch-snapshot.mjs", import.meta.url));
const SITE_CONTENT = fileURLToPath(new URL("../../src/site/content/", import.meta.url));
const PAGE_SIZE = 40;
const COMMIT = "a".repeat(40);
const snapshot = recordsToSnapshot(filesToRecords(repoFiles()), [{ type: "news", locale: "vi", slug: "slug-cu", id: "x" }], "2026-11-23T00:00:00.000Z");
snapshot.held = [{ type: "project", id: "nha-moi" }];
const counts = Object.fromEntries(Object.entries(snapshot.records).map(([type, rows]) => [type, rows.length]));

// Serves the snapshot the way src/worker/commands/snapshot.mjs pages it; `status` overrides every snapshot answer.
async function serve({ status = 200, buildInfo = null } = {}) {
  const requests = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://x");
    requests.push({ path: url.pathname, query: url.search, id: request.headers["cf-access-client-id"], agent: request.headers["user-agent"] });
    const reply = (code, body) => response.writeHead(code, { "Content-Type": "application/json" }).end(JSON.stringify(body));
    if (url.pathname === "/build-info.json") return buildInfo ? reply(200, buildInfo) : reply(404, {});
    if (status !== 200) return reply(status, { error: status === 423 ? "publish paused" : "boom" });
    const type = url.searchParams.get("type");
    if (type === null) return reply(200, { schema: 1, takenAt: snapshot.takenAt, stamp: "1", pageSize: PAGE_SIZE, types: counts, redirects: snapshot.redirects, held: snapshot.held });
    const page = Number(url.searchParams.get("page"));
    return reply(200, { stamp: "1", type, page, records: snapshot.records[type].slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`, requests, close: () => new Promise((resolve) => server.close(resolve)) };
}

async function run(origin, extraEnv = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "fetch-snapshot-"));
  const out = path.join(dir, "content");
  const outputFile = path.join(dir, "github-output");
  writeFileSync(outputFile, "");
  const env = { PATH: process.env.PATH, CMS_SNAPSHOT_URL: `${origin}/api/admin/snapshot`, CMS_ACCESS_CLIENT_ID: "test-id", CMS_ACCESS_CLIENT_SECRET: "test-secret", CMS_MEDIA_ORIGIN: "https://media.example", GITHUB_OUTPUT: outputFile, TT_BUILD_COMMIT: COMMIT, ...extraEnv };
  const result = await new Promise((resolve) => {
    execFile(process.execPath, [SCRIPT, "--out", out], { env }, (error, stdout, stderr) => resolve({ code: error ? error.code : 0, stdout, stderr }));
  });
  const outputs = Object.fromEntries(readFileSync(outputFile, "utf8").split("\n").filter(Boolean).map((line) => line.split(/=(.*)/s).slice(0, 2)));
  return { ...result, out, outputs };
}

test("200 writes every projected file over a copy of the repo content and reports the snapshot", async () => {
  const server = await serve();
  try {
    const { code, out, outputs, stdout } = await run(server.origin);
    assert.equal(code, 0);
    for (const [name, value] of Object.entries(snapshotToFiles(snapshot, { mediaOrigin: "https://media.example" }))) {
      assert.equal(readFileSync(path.join(out, name), "utf8"), `${JSON.stringify(value, null, 2)}\n`, name);
    }
    assert.equal(readFileSync(path.join(out, "advertising-merged.json"), "utf8"), readFileSync(path.join(SITE_CONTENT, "advertising-merged.json"), "utf8"));
    assert.deepEqual(outputs, { content_dir: out, snapshot_id: await snapshotId(JSON.stringify(snapshot)), snapshot_at: snapshot.takenAt, skip: "false" });
    assert.match(stdout, /nha-moi/);
    assert.ok(server.requests.some(({ query }) => query === "?type=advertising-card&page=1"), "reads more than one page");
    assert.ok(server.requests.every(({ id, agent }) => id === "test-id" && agent === "tt-cms-ci"));
    assert.ok(!server.requests.some(({ path: url }) => url === "/build-info.json"), "no STAGING_ORIGIN, no build-info call");
  } finally { await server.close(); }
});

for (const [status, message] of [[423, /publish paused/], [500, /HTTP 500/]]) {
  test(`snapshot answer ${status} fails the run without writing outputs`, async () => {
    const server = await serve({ status });
    try {
      const { code, stderr, outputs } = await run(server.origin);
      assert.equal(code, 1);
      assert.match(stderr, message);
      assert.deepEqual(outputs, {});
    } finally { await server.close(); }
  });
}

test("staging already running the same commit and snapshot gives skip=true", async () => {
  const id = await snapshotId(JSON.stringify(snapshot));
  const server = await serve({ buildInfo: { commit: COMMIT, snapshotId: id, snapshotAt: snapshot.takenAt } });
  try {
    const same = await run(server.origin, { STAGING_ORIGIN: server.origin });
    assert.equal(same.code, 0);
    assert.equal(same.outputs.skip, "true");
    const newCode = await run(server.origin, { STAGING_ORIGIN: server.origin, TT_BUILD_COMMIT: "b".repeat(40) });
    assert.equal(newCode.outputs.skip, "false");
    assert.ok(server.requests.some(({ path: url, id: client }) => url === "/build-info.json" && client === "test-id"));
  } finally { await server.close(); }
});

test("same commit with another snapshot, a non-JSON or a redirecting build-info gives skip=false", async () => {
  const other = await serve({ buildInfo: { commit: COMMIT, snapshotId: "0".repeat(64), snapshotAt: snapshot.takenAt } });
  const login = createServer((request, response) => response.writeHead(302, { Location: "https://example.invalid/login" }).end());
  const page = createServer((request, response) => response.writeHead(200, { "Content-Type": "text/html" }).end("<html>login</html>"));
  for (const server of [login, page]) await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const originOf = (server) => `http://127.0.0.1:${server.address().port}`;
  try {
    for (const staging of [other.origin, originOf(login), originOf(page)]) {
      const result = await run(other.origin, { STAGING_ORIGIN: staging });
      assert.equal(result.code, 0, staging);
      assert.equal(result.outputs.skip, "false", staging);
    }
  } finally {
    await other.close();
    for (const server of [login, page]) await new Promise((resolve) => server.close(resolve));
  }
});

test("a snapshot URL that redirects fails instead of following it", async () => {
  const hop = createServer((request, response) => response.writeHead(302, { Location: "https://example.invalid/" }).end());
  await new Promise((resolve) => hop.listen(0, "127.0.0.1", resolve));
  try {
    const result = await run(`http://127.0.0.1:${hop.address().port}`);
    assert.equal(result.code, 1);
  } finally {
    await new Promise((resolve) => hop.close(resolve));
  }
});

