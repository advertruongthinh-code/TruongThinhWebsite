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
  const { results } = await env.DB.prepare("SELECT v.key, v.media_id, v.crop, json_extract(r.data, '$.source') AS source, json_extract(r.data, '$.path') AS path FROM variants v JOIN records r ON r.type = 'media' AND r.id = v.media_id WHERE v.key IN (SELECT value FROM json_each(?))")
    .bind(JSON.stringify(keys)).all();
  const items = results.map((row) => ({ m: row.media_id, c: row.crop.split(",").map(Number), p: row.source === "repo" ? row.path : undefined }));
  const lots = [];
  for (let start = 0; start < items.length; start += VARIANT_LOT) lots.push(items.slice(start, start + VARIANT_LOT));
  // In parallel: each failing lot may wait 7 s of retries, and waitUntil has a time limit.
  await Promise.all(lots.map((lot) => dispatchWorkflow(env, "cms-variants.yml", { items: JSON.stringify(lot) })));
}

// Content build (Q8): paused publishing never calls GitHub.
export async function dispatchBuild(env) {
  const paused = await env.DB.prepare("SELECT value FROM settings WHERE key = 'publish_paused'").first("value");
  return paused === "1" ? false : dispatchWorkflow(env, "ci.yml", { content: "true" });
}

// Cron calls this every 5 minutes: a failed ci.yml dispatch is repeated until it succeeds (success clears dispatch_error).
export async function retryBuild(env) {
  const error = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(dispatchErrorKey("ci.yml")).first("value");
  if (error) await dispatchBuild(env);
}
