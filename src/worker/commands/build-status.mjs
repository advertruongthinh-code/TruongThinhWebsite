// GET /api/admin/build-status (CMS plan Q9, P4; part 2 K11): publish state, deployment markers, recent CI runs, token expiry,
// records held back by pending variants, and whether staging lags the last save.
import { latestBackupAt } from "../backup.mjs";
import { cronStale, flushBuild, WORKFLOWS } from "../dispatch.mjs";
import { json } from "../http.mjs";

const BEHIND_MS = 10 * 60_000;
const GITHUB_CACHE_SECONDS = 30;
const RUN_FIELDS = ["id", "status", "conclusion", "event", "display_title", "created_at", "html_url"];

// Q6 key deploys/<9999999999999 - epoch ms, 13 digits>-<run id>.json lists newest first; one list plus at most ten gets keep the Free subrequest budget.
export async function readDeployments(env) {
  const { objects } = await env.MEDIA_PUBLIC.list({ prefix: "deploys/", limit: 10 });
  const markers = await Promise.all(objects.map(async ({ key }) => (await env.MEDIA_PUBLIC.get(key))?.json().catch(() => null)));
  return markers.filter(Boolean);
}

// GitHub sends "2027-01-01 00:00:00 UTC"; ISO parses in every browser.
const isoExpiry = (value) => {
  const time = value ? Date.parse(value.replace(" UTC", "Z").replace(" ", "T")) : NaN;
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
};

const githubGet = (env, path) => {
  if (!env.GITHUB_ACTIONS_TOKEN) throw new Error("no token");
  return fetch(`${WORKFLOWS}/${path}`, {
    headers: { Authorization: `Bearer ${env.GITHUB_ACTIONS_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "tt-cms" },
    signal: AbortSignal.timeout(5000),
  });
};

async function readRuns(env) {
  const response = await githubGet(env, "ci.yml/runs?branch=main&per_page=5");
  if (!response.ok) throw new Error(`runs ${response.status}`);
  const { workflow_runs: runs } = await response.json();
  return { runs: runs.map((run) => Object.fromEntries(RUN_FIELDS.map((field) => [field, run[field]]))), tokenExpiresAt: isoExpiry(response.headers.get("github-authentication-token-expiration")) };
}

// The three latest rollback.yml runs (P6); null when GitHub cannot be read.
async function readRollbackRuns(env) {
  const response = await githubGet(env, "rollback.yml/runs?per_page=3");
  if (!response.ok) throw new Error(`rollback runs ${response.status}`);
  const { workflow_runs: runs } = await response.json();
  return runs.map((run) => Object.fromEntries(["id", "status", "conclusion", "created_at", "html_url"].map((field) => [field, run[field]])));
}

// Kept 30 s in the Cache API so several open editors do not multiply GitHub calls. Failures are not cached.
async function readGithub(env, origin) {
  const cache = globalThis.caches?.default;
  // Cache API keys belong to the Worker's own hostname.
  const key = new Request(`${origin}/__cache/build-status-github`);
  const hit = await cache?.match(key);
  if (hit) return hit.json();
  const [github, rollbackRuns] = await Promise.all([
    readRuns(env).catch(() => null),
    readRollbackRuns(env).catch(() => null),
  ]);
  const value = { runs: github?.runs ?? null, tokenExpiresAt: github?.tokenExpiresAt ?? null, rollbackRuns };
  if (cache && github && rollbackRuns) await cache.put(key, new Response(JSON.stringify(value), { headers: { "Cache-Control": `max-age=${GITHUB_CACHE_SECONDS}` } }));
  return value;
}

// A save newer than the snapshot of the newest staging deployment, still not built more than 10 minutes after it.
export const isStagingBehind = (lastSaveAt, deployments, now = Date.now()) => {
  if (!lastSaveAt) return false;
  const saved = Date.parse(lastSaveAt);
  const snapshotAt = Date.parse(deployments[0]?.snapshotAt ?? "");
  return (!Number.isFinite(snapshotAt) || saved > snapshotAt) && now - saved > BEHIND_MS;
};

export default {
  method: "GET",
  async run(request, env, ctx, actor) {
    const setting = (key) => env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first("value");
    const [paused, dispatchError, savedAt, orderedAt, held, deployments, github, backupAt, accessDrift, cronAt] = await Promise.all([
      setting("publish_paused"),
      env.DB.prepare("SELECT value FROM settings WHERE key IN ('dispatch_error:ci.yml', 'dispatch_error:cms-variants.yml') ORDER BY key LIMIT 1").first("value"),
      env.DB.prepare("SELECT MAX(updated_at) AS at FROM records WHERE status = 'published' AND type != 'media'").first("at"),
      setting("last_save_at"),
      env.DB.prepare("SELECT type, id, name, pending FROM records WHERE status = 'published' AND type != 'media' AND (pending > 0 OR live_version IS NULL) ORDER BY updated_at DESC LIMIT 50").all(),
      readDeployments(env).catch(() => []),
      readGithub(env, new URL(request.url).origin),
      latestBackupAt(env).catch(() => null),
      setting("access_drift"),
      setting("cron_at"),
    ]);
    // reorder writes settings.last_save_at, since it changes no updated_at.
    const lastSaveAt = [savedAt, orderedAt].filter(Boolean).sort().at(-1) ?? null;
    // Dead Cron fallback (dispatch.mjs CRON_STALE_MS): opening the status page sends a wanted build.
    const stale = cronStale(cronAt);
    if (stale) ctx?.waitUntil?.(flushBuild(env, new Date()).catch((error) => console.error("flushBuild", String(error))));
    return json({
      paused: paused === "1",
      dispatchError: dispatchError ?? null,
      lastSaveAt,
      stagingBehind: isStagingBehind(lastSaveAt, deployments),
      held: held.results,
      cronAt: cronAt ?? null,
      cronStale: stale,
      deployments,
      runs: github.runs,
      rollbackRuns: github.rollbackRuns,
      tokenExpiresAt: github.tokenExpiresAt,
      backupAt,
      ...(actor.role === "owner" ? { accessDrift: accessDrift ? JSON.parse(accessDrift) : null } : {}),
    });
  },
};
