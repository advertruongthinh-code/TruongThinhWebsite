// Workflow dispatch of the admin Worker (CMS plan Q8, P3). dispatchBuild stays a placeholder until P4.
export const VARIANT_LOT = 8;
const DISPATCHES = "https://api.github.com/repos/advertruongthinh-code/TruongThinhWebsite/actions/workflows";
const RETRY_MS = [1000, 2000, 4000];
const wait = (ms) => (globalThis.scheduler?.wait ? scheduler.wait(ms) : new Promise((resolve) => setTimeout(resolve, ms)));

// Four calls at most (retries after 1, 2, 4 s); true clears settings.dispatch_error, false records it.
export async function dispatchWorkflow(env, file, inputs) {
  let status = "no-token";
  if (env.GITHUB_ACTIONS_TOKEN) {
    for (let attempt = 0; attempt <= RETRY_MS.length; attempt += 1) {
      if (attempt) await wait(RETRY_MS[attempt - 1]);
      const response = await fetch(`${DISPATCHES}/${file}/dispatches`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.GITHUB_ACTIONS_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "tt-cms" },
        body: JSON.stringify({ ref: "main", inputs }),
      }).catch(() => null);
      if (response?.ok) {
        await env.DB.prepare("DELETE FROM settings WHERE key = 'dispatch_error'").run();
        return true;
      }
      status = response ? response.status : "network";
    }
  }
  await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('dispatch_error', ?)").bind(`${new Date().toISOString()} ${file} ${status}`).run();
  return false;
}

export async function dispatchVariants(env, keys) {
  const { results } = await env.DB.prepare("SELECT v.key, v.media_id, v.crop, json_extract(r.data, '$.source') AS source, json_extract(r.data, '$.path') AS path FROM variants v JOIN records r ON r.type = 'media' AND r.id = v.media_id WHERE v.key IN (SELECT value FROM json_each(?))")
    .bind(JSON.stringify(keys)).all();
  const items = results.map((row) => ({ m: row.media_id, c: row.crop.split(",").map(Number), p: row.source === "repo" ? row.path : undefined }));
  for (let start = 0; start < items.length; start += VARIANT_LOT) {
    await dispatchWorkflow(env, "cms-variants.yml", { items: JSON.stringify(items.slice(start, start + VARIANT_LOT)) });
  }
}

export async function dispatchBuild(_env) {}
