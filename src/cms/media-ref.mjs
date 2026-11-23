// Media placements of CMS records (cms-plan Q6): variant keys, where each record type holds media, and how the Worker
// rewrites a placement from its media record. Pure module: Worker, build and browser use crypto.subtle, never node:crypto.

export const VARIANT_RECIPE = 1; // bump when sizes, formats or quality change: every key changes
export async function variantKey(hash, crop) {
  const bytes = new TextEncoder().encode(`${hash}|${crop.join(",")}|${VARIANT_RECIPE}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest.slice(0, 16)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const isFullCrop = (media, crop) => !crop || (crop[0] === 0 && crop[1] === 0 && crop[2] === media.width && crop[3] === media.height);

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const list = (value) => (Array.isArray(value) ? value.filter(isObject) : []);

// Placements of one record, in traversal order; each entry is the object inside `data` (mutating it edits the record).
export function mediaRefs(type, data) {
  if (!isObject(data)) return [];
  if (type === "news" || type === "project") return [
    ...(isObject(data.cover) ? [data.cover] : []),
    ...list(data.blocks).flatMap((block) => [...(isObject(block.image) ? [block.image] : []), ...list(block.images)]),
    ...(type === "project" && isObject(data.card) ? list(data.card.media) : []),
  ];
  if (type === "advertising-card") return [...(isObject(data.media) ? [data.media] : []), ...list(data.mediaItems)];
  if (type === "hero-slide" || type === "client-logo") return [data];
  // Image slots of a standard page: the slot objects that are not text (K7).
  if (type === "page-copy") return Object.values(isObject(data.slots) ? data.slots : {}).filter((slot) => isObject(slot) && !Object.hasOwn(slot, "vi"));
  return [];
}

// Rewrites src, width, height and alts of every placement from its media record; client-sent values are not trusted.
// A placement with legacySrc (seed data) or an unknown mediaId is left as is (shapeErrors reports the unknown id).
export async function materialize(type, data, mediaById) {
  const copy = structuredClone(data);
  const uses = new Map();
  for (const ref of mediaRefs(type, copy)) {
    const media = ref.legacySrc === undefined ? mediaById.get(ref.mediaId) : undefined;
    if (!media) continue;
    // A logo is never cropped: its one variant is the whole SVG, and the record keeps only src and viewBox (K9).
    const logo = type === "client-logo";
    const crop = !logo && ref.crop || [0, 0, media.width, media.height];
    const key = media.source === "repo" && isFullCrop(media, crop) ? "" : await variantKey(media.hash, crop);
    const src = key ? `/v/${key}/${media.id}.${logo ? "svg" : "webp"}` : media.path;
    if (logo) Object.assign(ref, { src, viewBox: media.viewBox });
    else Object.assign(ref, { crop, src, width: crop[2], height: crop[3], altVi: media.altVi, altEn: media.altEn });
    uses.set(`${media.id}|${key}`, { mediaId: media.id, key, crop: key ? crop.join(",") : "" });
  }
  return { data: copy, uses: [...uses.values()] };
}
