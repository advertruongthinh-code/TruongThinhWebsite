// Deployment marker after a staging deploy (docs/specs/cms-data.md R6, cms-plan Q6, Q8): reads the Worker version id from the
// wrangler deploy log and writes deploys/<key>.json to the public bucket. The key sorts newest first.
// Usage: node scripts/cms/write-deploy-marker.mjs <deploy log>
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const env = process.env;
const versionId = /Current Version ID: ([0-9a-f-]{36})/.exec(readFileSync(process.argv[2], "utf8"))?.[1];
if (!versionId) {
  console.error("deploy log has no Current Version ID");
  process.exit(1);
}
const now = Date.now();
const key = `${String(9999999999999 - now).padStart(13, "0")}-${env.GITHUB_RUN_ID}`;
const file = path.join(mkdtempSync(path.join(tmpdir(), "deploy-marker-")), "marker.json");
const marker = { versionId, commit: env.TT_BUILD_COMMIT, snapshotId: env.TT_SNAPSHOT_ID || null, snapshotAt: env.TT_SNAPSHOT_AT || null, runId: env.GITHUB_RUN_ID, at: new Date(now).toISOString() };
writeFileSync(file, `${JSON.stringify(marker)}\n`);
const result = spawnSync("aws", ["s3", "cp", file, `s3://${env.R2_PUBLIC_BUCKET}/deploys/${key}.json`, "--endpoint-url", env.R2_ENDPOINT, "--cache-control", "no-store"], { stdio: ["ignore", "ignore", "inherit"] });
if (result.status !== 0) {
  console.error(`aws exit ${result.status}`);
  process.exit(1);
}
console.log(`deploy marker deploys/${key}.json: ${JSON.stringify(marker)}`);
