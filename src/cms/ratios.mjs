// Allowed crop ratios per placement (layout-library R7, cms-plan part 2 E10). Pure module: Worker, build and editor share it.
import { isFullCrop, isLegacy } from "./media-ref.mjs";

export const RATIO_TOLERANCE = 0.01;
const R = (w, h) => [w, h];
const WIDE = [R(3, 2), R(4, 3), R(16, 9), R(1, 1)];
const TWO_THIRDS = [R(3, 2), R(4, 3), R(1, 1)];
// Card frames of the masonry (Advertising and project cards, media-card R1).
export const CARD_RATIOS = [R(3, 2), R(2, 3), R(1, 1), R(4, 3), R(3, 4), R(4, 5), R(16, 9), R(2, 1)];
export const RATIOS = {
  "media-single": { wide: WIDE, "left-2-3": TWO_THIRDS, "right-2-3": TWO_THIRDS, video: [R(16, 9)] },
  "media-text": [R(2, 3), R(3, 4)],
  "media-pair": { equal: [R(2, 3), R(3, 4), R(3, 2)], large: [R(3, 2), R(2, 3), R(4, 5)], small: [R(2, 3), R(3, 4), R(1, 1)] },
  "media-carousel": [R(2, 3), R(3, 2), R(3, 4), R(1, 1)],
  card: CARD_RATIOS,
};
// Frame width at the 1920 breakpoint, for the blur warning of the crop editor (E16).
export const FRAME_WIDTH_1920 = { "media-single": { wide: 1500, "left-2-3": 1128, "right-2-3": 1128 }, "media-text": 488, "media-pair": { equal: 733, large: 733, small: 440 }, "media-carousel": 960 };

export const ratioOf = (crop) => crop[2] / crop[3];
export const matchesRatio = (crop, [w, h]) => Math.abs(ratioOf(crop) / (w / h) - 1) <= RATIO_TOLERANCE;
export const ratioLabel = ([w, h]) => `${w}:${h}`;

// Ratios allowed for one placement, or null when the placement has a free frame (cover, hero, slider card, logo, page slot)
// or a position R7 has no row for (media-single 1-2 is not in any locked layout).
export function allowedRatios(type, block, index = 0) {
  if (block === "card") return CARD_RATIOS;
  if (type !== "news" && type !== "project") return null;
  if (block?.type === "media-single") return RATIOS["media-single"][block.position] ?? null;
  if (block?.type === "media-text" || block?.type === "media-carousel") return RATIOS[block.type];
  if (block?.type !== "media-pair") return null;
  if (block.layout === "equal") return RATIOS["media-pair"].equal;
  const large = block.layout === "left-large" ? 0 : block.layout === "right-large" ? 1 : -1;
  return large < 0 ? null : RATIOS["media-pair"][index === large ? "large" : "small"];
}

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const list = (value) => (Array.isArray(value) ? value.filter(isObject) : []);

// Placements whose ratio is checked: [{ ref, ratios, where, pair }]; pair groups the two images of an equal pair.
export function ratioPlacements(type, data) {
  if (!isObject(data)) return [];
  if (type === "advertising-card") return [...(isObject(data.media) ? [data.media] : []), ...list(data.mediaItems)].map((ref) => ({ ref, ratios: CARD_RATIOS, where: "card" }));
  if (type !== "news" && type !== "project") return [];
  const places = list(data.blocks).flatMap((block, at) => [...(isObject(block.image) ? [block.image] : []), ...list(block.images)].map((ref, index) => ({
    ref, ratios: allowedRatios(type, block, index), where: `blocks[${at}]`, ...(block.type === "media-pair" && block.layout === "equal" ? { pair: at } : {}),
  })));
  if (type === "project" && isObject(data.card)) places.push(...list(data.card.media).map((ref) => ({ ref, ratios: CARD_RATIOS, where: "card" })));
  return places.filter(({ ratios }) => ratios);
}

// crop-ratio errors (K10): skipped for a seeded placement (legacySrc) and for the whole frame of a media that predates the CMS.
// mediaById: the placed media (unknown ids are reported by shapeErrors already).
export function ratioErrors(type, data, mediaById, at) {
  const errors = [];
  const pairs = new Map();
  for (const { ref, ratios, where, pair } of ratioPlacements(type, data)) {
    const media = isLegacy(ref) ? undefined : mediaById.get(ref.mediaId);
    if (!media || media.kind === "video") continue;
    const crop = Array.isArray(ref.crop) && ref.crop.length === 4 ? ref.crop : [0, 0, media.width, media.height];
    if (media.source === "repo" && isFullCrop(media, crop)) continue;
    const match = ratios.find((ratio) => matchesRatio(crop, ratio));
    if (!match) errors.push({ message: `${at}: ${where}: media ${ref.mediaId} crop must be ${ratios.map(ratioLabel).join(", ")}`, level: "shape", code: "crop-ratio" });
    else if (pair !== undefined) {
      if (pairs.has(pair) && pairs.get(pair) !== match) errors.push({ message: `${at}: ${where}: both images of an equal pair need the same ratio`, level: "shape", code: "crop-ratio" });
      pairs.set(pair, match);
    }
  }
  return errors;
}
