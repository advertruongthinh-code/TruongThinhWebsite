// scripts/cms/write-deploy-marker.mjs (docs/specs/cms-data.md R6, cms-plan Q6) with a fake aws on PATH.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../../scripts/cms/write-deploy-marker.mjs", import.meta.url));
const VERSION = "0123abcd-0123-4567-89ab-0123456789ab";

function run(log) {
  const dir = mkdtempSync(path.join(tmpdir(), "deploy-marker-test-"));
  writeFileSync(path.join(dir, "aws"), `#!/bin/sh\necho "$@" > "${dir}/args"\ncp "$3" "${dir}/body"\n`);
  chmodSync(path.join(dir, "aws"), 0o755);
  writeFileSync(path.join(dir, "deploy.log"), log);
  const env = { PATH: `${dir}:${process.env.PATH}`, GITHUB_RUN_ID: "42", TT_BUILD_COMMIT: "c".repeat(40), TT_SNAPSHOT_ID: "", R2_PUBLIC_BUCKET: "pub", R2_ENDPOINT: "https://r2.example" };
  const started = Date.now();
  const result = spawnSync(process.execPath, [SCRIPT, path.join(dir, "deploy.log")], { env, encoding: "utf8" });
  const read = (name) => { try { return readFileSync(path.join(dir, name), "utf8"); } catch { return ""; } };
  return { ...result, started, args: read("args").trim().split(" "), body: read("body") };
}

test("a deploy log with a version id writes deploys/<reverse ms>-<run id>.json with no-store", () => {
  const { status, started, args, body } = run(`Uploaded truong-thinh-staging\nCurrent Version ID: ${VERSION}\n`);
  assert.equal(status, 0);
  const key = /^s3:\/\/pub\/deploys\/(\d{13})-42\.json$/.exec(args[3]);
  assert.ok(key, args[3]);
  assert.ok(9999999999999 - Number(key[1]) >= started);
  assert.deepEqual(args.slice(4), ["--endpoint-url", "https://r2.example", "--cache-control", "no-store"]);
  const marker = JSON.parse(body);
  assert.deepEqual({ ...marker, at: undefined }, { versionId: VERSION, commit: "c".repeat(40), snapshotId: null, snapshotAt: null, runId: "42", at: undefined });
  assert.equal(9999999999999 - Number(key[1]), Date.parse(marker.at));
});

test("a deploy log without a version id fails before any upload", () => {
  const { status, stderr, args } = run("Error: deploy failed\n");
  assert.equal(status, 1);
  assert.match(stderr, /no Current Version ID/);
  assert.deepEqual(args, [""]);
});
