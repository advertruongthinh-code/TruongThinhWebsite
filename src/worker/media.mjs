// Media helpers of the admin Worker (CMS plan P2, Q6, Q9): upload limits, ids, byte sniffing, alt patching, original delivery.
import { ID } from "../cms/contract.mjs";
import { isLegacy, mediaRefs } from "../cms/media-ref.mjs";
import { HttpError } from "./http.mjs";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 95_000_000;
export const IMAGE_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

export const hex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const ascii = (head, from, to) => String.fromCharCode(...head.subarray(from, to));
const startsWith = (head, bytes) => bytes.every((byte, index) => head[index] === byte);

// Checks the first 32 bytes against the declared type (cms-content R3).
export function sniff(head, ext) {
  if (ext === "jpg") return startsWith(head, [0xff, 0xd8, 0xff]);
  if (ext === "png") return startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (ext === "webp") return ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 12) === "WEBP";
  if (ext === "avif") return ascii(head, 4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(head, 8, 12));
  // Any other ftyp brand (HEIC, QuickTime, AVIF) is refused; the real check is the ffprobe of the variants job.
  if (ext === "mp4") return ascii(head, 4, 8) === "ftyp" && !["avif", "avis", "heic", "heix", "hevc", "mif1", "msf1", "qt  "].includes(ascii(head, 8, 12));
  return false;
}

// Smallest two-digit number from 01 not yet used by `<slugBase>-NN`; trashed records keep their id.
export async function nextMediaId(env, slugBase) {
  const { results } = await env.DB.prepare("SELECT id FROM records WHERE type = 'media' AND id LIKE ?").bind(`${slugBase}-%`).all();
  const taken = new Set(results.map((row) => row.id));
  for (let n = 1; n <= 99; n++) {
    const id = `${slugBase}-${String(n).padStart(2, "0")}`;
    if (!taken.has(id)) return id;
  }
  throw new HttpError(409, { error: "ids-full" });
}

// Copy of a record's data with the alts of every placement of `mediaId` replaced; seeded legacySrc placements keep theirs.
export function patchAlt(type, data, mediaId, altVi, altEn) {
  const copy = structuredClone(data);
  for (const ref of mediaRefs(type, copy)) if (ref.mediaId === mediaId && !isLegacy(ref)) Object.assign(ref, { altVi, altEn });
  return copy;
}

export const readId = (url) => {
  const id = url.searchParams.get("id") ?? "";
  if (!ID.test(id)) throw new HttpError(400, { error: "query" });
  return id;
};

// Serves the private original of an `r2` media (honours Range); `onRepo(data)` answers a `repo` media. Only `originals/` keys are read.
export async function originalResponse(request, env, id, extraHeaders, onRepo) {
  const row = await env.DB.prepare("SELECT data FROM records WHERE type = 'media' AND id = ?").bind(id).first();
  if (!row) throw new HttpError(404, { error: "not-found" });
  const data = JSON.parse(row.data);
  if (data.source !== "r2") return onRepo(data);
  if (typeof data.originalKey !== "string" || !data.originalKey.startsWith("originals/")) throw new HttpError(404, { error: "not-found" });
  const head = await env.MEDIA_ORIGINALS.head(data.originalKey);
  if (!head) throw new HttpError(404, { error: "not-found" });
  const headers = {
    "Content-Type": data.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox", "Cross-Origin-Resource-Policy": "same-origin", "Accept-Ranges": "bytes", ...extraHeaders,
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("Range") ?? "");
  if (!range || (!range[1] && !range[2])) {
    const object = await env.MEDIA_ORIGINALS.get(data.originalKey);
    if (!object) throw new HttpError(404, { error: "not-found" });
    return new Response(object.body, { headers: { ...headers, "Content-Length": String(head.size) } });
  }
  const start = range[1] ? Number(range[1]) : Math.max(0, head.size - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), head.size - 1) : head.size - 1;
  if (start >= head.size || start > end) return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${head.size}` } });
  const object = await env.MEDIA_ORIGINALS.get(data.originalKey, { range: { offset: start, length: end - start + 1 } });
  if (!object) throw new HttpError(404, { error: "not-found" });
  return new Response(object.body, { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${head.size}`, "Content-Length": String(end - start + 1) } });
}
