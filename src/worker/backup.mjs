// Daily D1 export to the private bucket and its 30-day retention (CMS plan Q11, task S5; docs/specs/cms.md R6).
const PREFIX = "backups/d1/";
const KEEP_DAYS = 30;
const DAY_MS = 86_400_000;

// Polls the D1 export REST API, then streams the dump into R2; the dump is never read into memory.
export async function exportDatabase(env) {
  const api = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/d1/database/${env.D1_DATABASE_ID}/export`;
  let body = { output_format: "polling" };
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await fetch(api, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.D1_EXPORT_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const { result } = await response.json();
    if (!response.ok || result?.status === "error") throw new Error(`d1 export failed: ${response.status} ${result?.error ?? ""}`);
    if (result?.status === "complete") {
      const dump = await fetch(result.result.signed_url);
      if (!dump.ok) throw new Error(`d1 export download failed: ${dump.status}`);
      await env.MEDIA_ORIGINALS.put(`${PREFIX}${new Date().toISOString().slice(0, 10)}.sql`, dump.body);
      return;
    }
    body = { output_format: "polling", current_bookmark: result.at_bookmark };
    await scheduler.wait(5000);
  }
  throw new Error("d1 export timed out");
}

const listBackups = async (env) => (await env.MEDIA_ORIGINALS.list({ prefix: PREFIX, limit: 100 })).objects;

// Deletes exports whose file date is older than 30 days, at most 30 per run.
export async function pruneBackups(env, now = Date.now()) {
  const old = (await listBackups(env))
    .filter(({ key }) => now - Date.parse(key.slice(PREFIX.length, PREFIX.length + 10)) > KEEP_DAYS * DAY_MS)
    .slice(0, 30)
    .map(({ key }) => key);
  if (old.length) await env.MEDIA_ORIGINALS.delete(old);
}

// ISO time of the newest export, or null; build-status shows it and the admin warns past two days.
export async function latestBackupAt(env) {
  const times = (await listBackups(env)).map(({ uploaded }) => new Date(uploaded).getTime());
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}
