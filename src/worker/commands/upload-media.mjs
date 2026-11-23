// POST /api/admin/upload-media (CMS plan P2, Q6, Q9): the body is the file; it streams into the private bucket, never into memory.
import { ID } from "../../cms/contract.mjs";
import { variantKey } from "../../cms/media-ref.mjs";
import { dispatchVariants } from "../dispatch.mjs";
import { auditStatement, HttpError, json } from "../http.mjs";
import { hex, IMAGE_EXT, MAX_UPLOAD_BYTES, nextMediaId, sniff } from "../media.mjs";
import { contentRevStatement, guard, isUniqueId } from "../records.mjs";

const bounded = (value, max) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= max;

export default {
  method: "POST",
  upload: true,
  async run(request, env, ctx, actor, url) {
    const type = request.headers.get("Content-Type");
    const ext = Object.hasOwn(IMAGE_EXT, type) ? IMAGE_EXT[type] : undefined;
    if (!ext) throw new HttpError(415, { error: "type" });
    const length = Number(request.headers.get("Content-Length"));
    if (!Number.isInteger(length) || length <= 0) throw new HttpError(411, { error: "length" });
    if (length > MAX_UPLOAD_BYTES) throw new HttpError(413, { error: "too-large" });
    const [slugBase, widthText, heightText, altVi, altEn] = ["slugBase", "width", "height", "altVi", "altEn"].map((name) => url.searchParams.get(name) ?? "");
    if (!ID.test(slugBase) || slugBase.length > 60 || !bounded(widthText, 20000) || !bounded(heightText, 20000) || altVi.length > 300 || altEn.length > 300) throw new HttpError(400, { error: "query" });
    const [width, height] = [Number(widthText), Number(heightText)];
    const id = await nextMediaId(env, slugBase);
    const target = { type: "media", id };
    const key = `originals/${id}/original.${ext}`;
    const object = await env.MEDIA_ORIGINALS.put(key, request.body, { httpMetadata: { contentType: type } });
    const first = await env.MEDIA_ORIGINALS.get(key, { range: { offset: 0, length: 32 } });
    const head = first ? new Uint8Array(await first.arrayBuffer()) : new Uint8Array();
    if (object.size !== length || !sniff(head, ext)) {
      await env.MEDIA_ORIGINALS.delete(key);
      throw new HttpError(400, { error: "bytes" }, target);
    }
    const hash = `md5:${hex(object.checksums.md5)}`;
    const variant = await variantKey(hash, [0, 0, width, height]);
    const status = altVi && altEn ? "published" : "draft";
    const text = JSON.stringify({ id, kind: "image", source: "r2", originalKey: key, hash, bytes: length, mime: type, width, height, altVi, altEn, tags: [] });
    const writeId = crypto.randomUUID();
    const now = new Date().toISOString();
    const G = guard("media", id, writeId);
    try {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO records (type, id, status, version, live_version, pending, position, name, slug_vi, slug_en, data, write_id, created_at, created_by, updated_at, updated_by) VALUES ('media', ?, ?, 1, 1, 0, 0, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)")
          .bind(id, status, id, text, writeId, now, actor.email, now, actor.email),
        env.DB.prepare(`INSERT INTO versions (type, id, version, status, data, saved_at, saved_by) SELECT 'media', ?, 1, ?, ?, ?, ? WHERE ${G.sql}`).bind(id, status, text, now, actor.email, ...G.args),
        // Identical bytes under another id share the key: that row stays as it is (see Deviations).
        env.DB.prepare(`INSERT INTO variants (key, media_id, crop, status, created_at) SELECT ?, ?, ?, 'pending', ? WHERE ${G.sql} ON CONFLICT (key) DO NOTHING`).bind(variant, id, `0,0,${width},${height}`, now, ...G.args),
        contentRevStatement(env, G),
        auditStatement(env, actor, "upload-media", "media", id, "ok", { guard: G }),
      ]);
    } catch (error) {
      await env.MEDIA_ORIGINALS.delete(key);
      if (isUniqueId(error)) throw new HttpError(409, { error: "retry" }, target);
      throw error;
    }
    ctx?.waitUntil?.(dispatchVariants(env, [variant]));
    return json({ id, version: 1, status, variant: { key: variant, status: "pending" } }, 201);
  },
};
