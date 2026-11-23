// Workflow dispatch of the admin Worker (CMS plan Q8, P3, P4).
export const VARIANT_LOT = 8;
export const WORKFLOWS = "https://api.github.com/repos/advertruongthinh-code/TruongThinhWebsite/actions/workflows";
const RETRY_MS = [1000, 2000, 4000];
const wait = (ms) => (globalThis.scheduler?.wait ? scheduler.wait(ms) : new Promise((resolve) => setTimeout(resolve, ms)));

// One settings key per workflow, so a variants dispatch never clears or hides a failed build dispatch.
export const dispatchErrorKey = (file) => `dispatch_error:${file}`;
const retriable = (status) => status === "network" || status === 429 || status >= 500;

// Four calls at most (retries after 1, 2, 4 s, only for 5xx, 429 and network errors); true clears that workflow's error, false records it.
export async function dispatchWorkflow(env, file, inputs) {
  let status = "no-token";
  if (env.GITHUB_ACTIONS_TOKEN) {
    for (let attempt = 0; attempt <= RETRY_MS.length; attempt += 1) {
      if (attempt && !retriable(status)) break;
      if (attempt) await wait(RETRY_MS[attempt - 1]);
      const response = await fetch(`${WORKFLOWS}/${file}/dispatches`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.GITHUB_ACTIONS_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "tt-cms" },
        body: JSON.stringify({ ref: "main", inputs }),
      }).catch(() => null);
      if (response?.ok) {
        await env.DB.prepare("DELETE FROM settings WHERE key = ?").bind(dispatchErrorKey(file)).run();
        return true;
      }
      status = response ? response.status : "network";
    }
  }
  await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind(dispatchErrorKey(file), `${new Date().toISOString()} ${file} ${status}`).run();
  return false;
}

export async function dispatchVariants(env, keys) {
  const { results } = await env.DB.prepare("SELECT v.key, v.media_id, v.crop, json_extract(r.data, '$.source') AS source, json_extract(r.data, '$.path') AS path, json_extract(r.data, '$.kind') AS kind FROM variants v JOIN records r ON r.type = 'media' AND r.id = v.media_id WHERE v.key IN (SELECT value FROM json_each(?))")
    .bind(JSON.stringify(keys)).all();
  const item = (row) => ({ m: row.media_id, c: row.crop.split(",").map(Number), p: row.source === "repo" ? row.path : undefined });
  // A video is one dispatch of its own (the job needs up to 90 minutes), never part of an image lot.
  const videos = results.filter((row) => row.kind === "video").map((row) => [{ ...item(row), k: "video" }]);
  const items = results.filter((row) => row.kind !== "video").map(item);
  const lots = [];
  for (let start = 0; start < items.length; start += VARIANT_LOT) lots.push(items.slice(start, start + VARIANT_LOT));
  lots.push(...videos);
  // In parallel: each failing lot may wait 7 s of retries, and waitUntil has a time limit.
  await Promise.all(lots.map((lot) => dispatchWorkflow(env, "cms-variants.yml", { items: JSON.stringify(lot) })));
}

// Content build (Q8): a command never calls GitHub; it sets build_wanted to the content_rev its batch raised, and Cron sends
// at most one ci.yml dispatch a minute (many quick saves give one build). where: a guard ({ sql, args }) for a batch statement.
export const wantBuildStatement = (env, where = { sql: "1", args: [] }) => env.DB
  .prepare(`INSERT INTO settings (key, value) SELECT 'build_wanted', COALESCE((SELECT value FROM settings WHERE key = 'content_rev'), '0') WHERE ${where.sql} ON CONFLICT (key) DO UPDATE SET value = excluded.value`)
  .bind(...where.args);
export const wantBuild = (env) => wantBuildStatement(env).run();

const buildState = async (env) => Object.fromEntries((await env.DB
  .prepare("SELECT key, value FROM settings WHERE key IN ('publish_paused', 'build_wanted', 'build_sent', ?)").bind(dispatchErrorKey("ci.yml")).all()).results
  .map((row) => [row.key, row.value]));

// Paused publishing never calls GitHub and returns "paused"; after unpausing, Cron sends the wanted build. A sent dispatch
// records build_sent, so a "Dựng lại" by hand also covers the wanted build.
export async function dispatchBuild(env, state) {
  const { publish_paused: paused, build_wanted: wanted } = state ?? await buildState(env);
  if (paused === "1") return "paused";
  const sent = await dispatchWorkflow(env, "ci.yml", { content: "true" });
  if (sent && wanted) await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('build_sent', ?)").bind(wanted).run();
  return sent;
}

// Cron every minute: dispatch when a build is wanted and not yet sent; after a failed ci.yml dispatch, retry only at
// minutes divisible by 5 (also for a failed "Dựng lại").
export async function flushBuild(env, minute) {
  const state = await buildState(env);
  const failed = state[dispatchErrorKey("ci.yml")];
  if (failed ? minute % 5 !== 0 : !state.build_wanted || state.build_wanted === state.build_sent) return;
  await dispatchBuild(env, state);
}
