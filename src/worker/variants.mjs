// settleVariants (CMS plan P3, Q6 step 4): every Cron minute, marks pending variants ready once their manifest.json is in the
// public bucket (error on a size mismatch, after 45 minutes for an image or 90 for a video), recounts pending of the records using them, and publishes.
import { wantBuildStatement } from "./dispatch.mjs";
import { contentRevStatement } from "./records.mjs";

const ALWAYS = { sql: "1", args: [] };
// Published records whose latest version is complete but not yet live.
const GOING_LIVE = "type != 'media' AND status = 'published' AND pending = 0 AND (live_version IS NULL OR live_version != version)";

export async function settleVariants(env, _ctx) {
  const { results } = await env.DB.prepare("SELECT key, media_id, created_at FROM variants WHERE status = 'pending' ORDER BY created_at LIMIT 20").all();
  if (!results.length) return;
  // Two media with identical bytes and crop share a key; the row keeps the first media_id, whose size is the one compared.
  const sizes = new Map((await env.DB.prepare("SELECT id, json_extract(data, '$.width') AS width, json_extract(data, '$.height') AS height, json_extract(data, '$.kind') AS kind FROM records WHERE type = 'media' AND id IN (SELECT value FROM json_each(?))")
    .bind(JSON.stringify(results.map((variant) => variant.media_id))).all()).results.map((media) => [media.id, media]));
  const now = Date.now(), ready = [], failed = [];
  for (const variant of results) {
    const object = await env.MEDIA_PUBLIC.get(`v/${variant.key}/manifest.json`);
    const limit = (sizes.get(variant.media_id)?.kind === "video" ? 90 : 45) * 60_000;
    if (object) {
      // An unreadable manifest counts as a size mismatch, so one bad object never blocks the queue.
      const manifest = await object.json().catch(() => ({})), media = sizes.get(variant.media_id);
      if (media && manifest.sourceWidth === media.width && manifest.sourceHeight === media.height) ready.push(variant.key);
      else failed.push({ k: variant.key, r: "size" });
    } else if (now - Date.parse(variant.created_at) > limit) failed.push({ k: variant.key, r: "timeout" });
  }
  if (!ready.length && !failed.length) return;
  const at = new Date(now).toISOString(), failedJson = JSON.stringify(failed);
  const settled = JSON.stringify([...ready, ...failed.map((item) => item.k)]);
  await env.DB.batch([
    env.DB.prepare("UPDATE variants SET status = 'ready', error = NULL, settled_at = ? WHERE status = 'pending' AND key IN (SELECT value FROM json_each(?))").bind(at, JSON.stringify(ready)),
    env.DB.prepare("UPDATE variants SET status = 'error', error = (SELECT json_extract(value, '$.r') FROM json_each(?) WHERE json_extract(value, '$.k') = variants.key), settled_at = ? WHERE status = 'pending' AND key IN (SELECT json_extract(value, '$.k') FROM json_each(?))").bind(failedJson, at, failedJson),
    env.DB.prepare("UPDATE records SET pending = (SELECT COUNT(*) FROM record_media m JOIN variants v ON v.key = m.variant_key WHERE m.type = records.type AND m.id = records.id AND v.status != 'ready') WHERE EXISTS (SELECT 1 FROM record_media m WHERE m.type = records.type AND m.id = records.id AND m.variant_key IN (SELECT value FROM json_each(?)))").bind(settled),
    // cms-data R2: this batch may write records, so content_rev rises with it; before the want, which copies it.
    contentRevStatement(env, ALWAYS),
    // A record about to go live wants a content build (Q8), in the same batch so a lost isolate cannot drop it.
    wantBuildStatement(env, { sql: `EXISTS (SELECT 1 FROM records WHERE ${GOING_LIVE})`, args: [] }),
    env.DB.prepare(`UPDATE records SET live_version = version WHERE ${GOING_LIVE}`),
  ]);
}
