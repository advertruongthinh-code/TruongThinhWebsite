// Daily D1 export to the private bucket and its 30-day retention (CMS plan Q11, task S5; docs/specs/cms.md R6).
// Dumps hold account emails: any handler or sweep over MEDIA_ORIGINALS (media-original, P8 removeOrphans) must stay
// outside backups/ and never serve or delete keys under it.
const PREFIX = "backups/d1/";
const KEEP_DAYS = 30;
const DAY_MS = 86_400_000;

const todayKey = () => `${PREFIX}${new Date().toISOString().slice(0, 10)}.sql`;

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
    const data = await response.json().catch(() => ({}));
    const { result } = data;
    if (!response.ok || result?.status === "error") {
      const reason = result?.error ?? data.errors?.map(({ code, message }) => `${code} ${message}`).join("; ") ?? "";
      throw new Error(`d1 export failed: ${response.status} ${reason}`);
    }
    if (result?.status === "complete") {
      const dump = await fetch(result.result.signed_url);
      if (!dump.ok) throw new Error(`d1 export download failed: ${dump.status}`);
      // R2 put needs a stream of known length; FixedLengthStream gives it without buffering the dump.
      const length = Number(dump.headers.get("Content-Length"));
      if (!length || dump.headers.get("Content-Encoding")) throw new Error("d1 export download has no known length");
      const key = todayKey();
      await env.MEDIA_ORIGINALS.put(key, dump.body.pipeThrough(new FixedLengthStream(length)));
      return;
    }
    body = { output_format: "polling", current_bookmark: result.at_bookmark };
    await scheduler.wait(5000);
  }
  throw new Error("d1 export timed out");
}

// Hourly retry of a failed or missed daily export: runs only while today's file is absent.
export async function exportIfMissing(env) {
  if (!(await env.MEDIA_ORIGINALS.head(todayKey()))) await exportDatabase(env);
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
