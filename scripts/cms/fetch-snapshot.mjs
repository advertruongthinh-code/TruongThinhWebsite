// Staging build from the CMS snapshot (docs/specs/cms-data.md R6, cms-plan P5): reads the paged snapshot, writes the projected
// content files over a copy of src/site/content/, and tells the workflow whether staging already runs this commit and snapshot.
// Usage: node scripts/cms/fetch-snapshot.mjs [--out <dir>]. Any failure exits 1; there is no fallback to the repo files.
import { appendFileSync, cpSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { collectSnapshot } from "../../src/cms/collect-snapshot.mjs";
import { snapshotId, snapshotToFiles } from "../../src/cms/projection.mjs";
import { siteRoot } from "../site/lib.mjs";

const env = process.env;
const outArg = process.argv.indexOf("--out");
const out = path.resolve(outArg > 0 ? process.argv[outArg + 1] : ".tmp/snapshot/content");
// Both the admin API and staging sit behind Cloudflare Access; the service token passes their Service Auth policy.
const headers = { "CF-Access-Client-Id": env.CMS_ACCESS_CLIENT_ID ?? "", "CF-Access-Client-Secret": env.CMS_ACCESS_CLIENT_SECRET ?? "", "User-Agent": "tt-cms-ci" };

async function get(query) {
  const response = await fetch(query ? `${env.CMS_SNAPSHOT_URL}?${query}` : env.CMS_SNAPSHOT_URL, { headers });
  if (response.status === 423) throw new Error("publish paused");
  if (response.status !== 200) throw new Error(`snapshot: HTTP ${response.status}`);
  return response.json();
}

// The deployed build-info.json; anything but a JSON 200 (404 on a first deploy, an Access login page) means "not the same build".
async function stagingBuild() {
  if (!env.STAGING_ORIGIN) return {};
  const response = await fetch(`${env.STAGING_ORIGIN}/build-info.json`, { headers });
  return response.ok ? response.json().catch(() => ({})) : {};
}

try {
  const snapshot = await collectSnapshot(get);
  // collectSnapshot keeps the key order schema, takenAt, ..., so the takenAt cut in snapshotId applies to this text.
  const id = await snapshotId(JSON.stringify(snapshot));
  rmSync(out, { recursive: true, force: true });
  cpSync(path.join(siteRoot, "content"), out, { recursive: true });
  for (const [name, value] of Object.entries(snapshotToFiles(snapshot, { mediaOrigin: env.CMS_MEDIA_ORIGIN ?? "" }))) {
    writeFileSync(path.join(out, name), `${JSON.stringify(value, null, 2)}\n`);
  }
  console.log(`held: ${JSON.stringify(snapshot.held ?? [])}`);
  const deployed = await stagingBuild();
  const skip = Boolean(env.TT_BUILD_COMMIT) && deployed.commit === env.TT_BUILD_COMMIT && deployed.snapshotId === id;
  if (skip) console.log("staging already runs this commit and snapshot: skip");
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `content_dir=${out}\nsnapshot_id=${id}\nsnapshot_at=${snapshot.takenAt}\nskip=${skip}\n`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
