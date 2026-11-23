// GET /api/admin/build-status (CMS plan Q9, P4): publish state, deployment markers, recent CI runs, token expiry.
import { latestBackupAt } from "../backup.mjs";
import { WORKFLOWS } from "../dispatch.mjs";
import { json } from "../http.mjs";

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

export default {
  method: "GET",
  async run(request, env, ctx, actor) {
    const setting = (key) => env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first("value");
    const [paused, dispatchError, lastSaveAt, deployments, github, backupAt, rollbackRuns] = await Promise.all([
      setting("publish_paused"),
      env.DB.prepare("SELECT value FROM settings WHERE key IN ('dispatch_error:ci.yml', 'dispatch_error:cms-variants.yml') ORDER BY key LIMIT 1").first("value"),
      env.DB.prepare("SELECT MAX(updated_at) AS at FROM records WHERE status = 'published' AND type != 'media'").first("at"),
      readDeployments(env).catch(() => []),
      readRuns(env).catch(() => ({ runs: null, tokenExpiresAt: null })),
      latestBackupAt(env).catch(() => null),
      readRollbackRuns(env).catch(() => null),
    ]);
    return json({
      paused: paused === "1",
      dispatchError: dispatchError ?? null,
      lastSaveAt: lastSaveAt ?? null,
      deployments,
      runs: github.runs,
      rollbackRuns,
      tokenExpiresAt: github.tokenExpiresAt,
      backupAt,
      ...(actor.role === "owner" ? { accessDrift: null } : {}),
    });
  },
};
