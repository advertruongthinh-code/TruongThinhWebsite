// POST /api/admin/upload-media (CMS plan P2, Q6, Q9): the body is the file; it streams into the private bucket, never into memory.
import { ID } from "../../cms/contract.mjs";
import { variantKey } from "../../cms/media-ref.mjs";
import { dispatchVariants } from "../dispatch.mjs";
import { auditStatement, HttpError, json } from "../http.mjs";
import { hex, IMAGE_EXT, MAX_UPLOAD_BYTES, MAX_VIDEO_BYTES, nextMediaId, sniff } from "../media.mjs";
import { contentRevStatement, guard, isUniqueId } from "../records.mjs";

const bounded = (value, max) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= max;
const UPLOAD_EXT = { ...IMAGE_EXT, "video/mp4": "mp4" };

export default {
  method: "POST",
  upload: true,
  async run(request, env, ctx, actor, url) {
    const type = request.headers.get("Content-Type");
    const ext = Object.hasOwn(UPLOAD_EXT, type) ? UPLOAD_EXT[type] : undefined;
    if (!ext) throw new HttpError(415, { error: "type" });
    // shortcut: one PUT through the Worker, capped at 95 MB by the 100 MB request body limit of the Cloudflare Free plan; switch to R2 multipart parts when larger videos are needed
    const video = ext === "mp4";
    const length = Number(request.headers.get("Content-Length"));
    if (!Number.isInteger(length) || length <= 0) throw new HttpError(411, { error: "length" });
    if (length > (video ? MAX_VIDEO_BYTES : MAX_UPLOAD_BYTES)) throw new HttpError(413, { error: "too-large" });
    const [slugBase, widthText, heightText, altVi, altEn, durationText, posterId] = ["slugBase", "width", "height", "altVi", "altEn", "duration", "posterId"].map((name) => url.searchParams.get(name) ?? "");
    const duration = Number(durationText);
    if (!ID.test(slugBase) || slugBase.length > 60 || !bounded(widthText, 20000) || !bounded(heightText, 20000) || altVi.length > 300 || altEn.length > 300) throw new HttpError(400, { error: "query" });
    if (video && (!/^\d+(\.\d+)?$/.test(durationText) || !(duration > 0 && duration <= 600) || !ID.test(posterId))) throw new HttpError(400, { error: "query" });
    const [width, height] = [Number(widthText), Number(heightText)];
    if (video) {
      const poster = await env.DB.prepare("SELECT status, data FROM records WHERE type = 'media' AND id = ?").bind(posterId).first();
      const shot = poster && poster.status !== "trashed" ? JSON.parse(poster.data) : null;
      // Only an uploaded raster image can be a poster: repo media have no original in R2 and SVG has no frame size.
      if (shot?.kind !== "image" || shot.source !== "r2" || !Object.hasOwn(IMAGE_EXT, shot.mime)) throw new HttpError(400, { error: "poster" });
      if (Math.abs(shot.width * height - shot.height * width) > 0.01 * shot.width * height) throw new HttpError(400, { error: "poster-ratio" });
    }
    const id = await nextMediaId(env, slugBase);
    const target = { type: "media", id };
    // One key per request: two uploads racing for the same id never overwrite or delete each other's object.
    const writeId = crypto.randomUUID();
    const key = `originals/${id}/${writeId}.${ext}`;
    const object = await env.MEDIA_ORIGINALS.put(key, request.body, { httpMetadata: { contentType: type } });
    const first = await env.MEDIA_ORIGINALS.get(key, { range: { offset: 0, length: 32 } });
    const head = first ? new Uint8Array(await first.arrayBuffer()) : new Uint8Array();
    if (object.size !== length || !sniff(head, ext) || object.checksums?.md5?.byteLength !== 16) {
      await env.MEDIA_ORIGINALS.delete(key);
      throw new HttpError(400, { error: "bytes" }, target);
    }
    const hash = `md5:${hex(object.checksums.md5)}`;
    const variant = await variantKey(hash, [0, 0, width, height]);
    const status = altVi.trim() && altEn.trim() ? "published" : "draft";
    const text = JSON.stringify({ id, kind: video ? "video" : "image", source: "r2", originalKey: key, hash, bytes: length, mime: type, width, height, ...(video ? { duration, posterId } : {}), altVi, altEn, tags: [] });
    const now = new Date().toISOString();
    const G = guard("media", id, writeId);
    let written;
    try {
      written = await env.DB.batch([
        // A video row is written only while its poster is still not trashed, checked in the same batch as the
        // record_media row, so a trash that lands during the upload never leaves a video pointing at a trashed poster.
        env.DB.prepare(`INSERT INTO records (type, id, status, version, live_version, pending, position, name, slug_vi, slug_en, data, write_id, created_at, created_by, updated_at, updated_by) SELECT 'media', ?, ?, 1, 1, 0, 0, ?, NULL, NULL, ?, ?, ?, ?, ?, ?${video ? " WHERE EXISTS (SELECT 1 FROM records WHERE type = 'media' AND id = ? AND status != 'trashed')" : ""}`)
          .bind(id, status, id, text, writeId, now, actor.email, now, actor.email, ...(video ? [posterId] : [])),
        env.DB.prepare(`INSERT INTO versions (type, id, version, status, data, saved_at, saved_by) SELECT 'media', ?, 1, ?, ?, ?, ? WHERE ${G.sql}`).bind(id, status, text, now, actor.email, ...G.args),
        // Identical bytes under another id share the key: that row stays as it is (see Deviations).
        env.DB.prepare(`INSERT INTO variants (key, media_id, crop, status, created_at) SELECT ?, ?, ?, 'pending', ? WHERE ${G.sql} ON CONFLICT (key) DO NOTHING`).bind(variant, id, `0,0,${width},${height}`, now, ...G.args),
        // The poster stays in use while the video exists, so trash of the poster is 409 in-use.
        ...(video ? [env.DB.prepare(`INSERT INTO record_media (type, id, media_id, variant_key) SELECT 'media', ?, ?, '' WHERE ${G.sql}`).bind(id, posterId, ...G.args)] : []),
        contentRevStatement(env, G),
        auditStatement(env, actor, "upload-media", "media", id, "ok", { guard: G }),
      ]);
    } catch (error) {
      await env.MEDIA_ORIGINALS.delete(key);
      if (isUniqueId(error)) throw new HttpError(409, { error: "retry" }, target);
      throw error;
    }
    if (written[0].meta.changes === 0) {
      await env.MEDIA_ORIGINALS.delete(key);
      throw new HttpError(409, { error: "poster" }, target);
    }
    ctx?.waitUntil?.(dispatchVariants(env, [variant]));
    return json({ id, version: 1, status, variant: { key: variant, status: "pending" } }, 201);
  },
};
