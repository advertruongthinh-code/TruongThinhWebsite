// Page model of the News and project editor (cms-editor R4, CMS plan E13): which media a page holds, which layouts that count
// opens, and how the block chain is rebuilt when the layout or the media list changes. Pure module: the editor and tests import it.
import { LAYOUTS, expandLayout } from "./layouts.mjs";
import { isLegacy } from "./media-ref.mjs";
import { matchesRatio, ratioPlacements } from "./ratios.mjs";

export const kindOf = (type) => (type === "project" ? "projects" : "news");

// Media of a page in block order, the cover left out: { image } or { video } (what a media block holds).
export const pageMedia = (page) => (page.blocks ?? []).flatMap((block) => [
  ...(block.image ? [{ image: block.image }] : []),
  ...(block.video ? [{ video: block.video }] : []),
  ...(block.images ?? []).map((image) => ({ image })),
]);

// Whether two media lists hold the same media in the same order.
const mediaKey = (item) => item.image?.mediaId ?? item.video?.src;
export const sameMedia = (a, b) => a.length === b.length && a.every((item, index) => mediaKey(item) === mediaKey(b[index]));

// Layout tab rows of a kind for a media count (R4): open, or what is missing or too much. The lowest layout always opens.
export function layoutChoices(kind, count) {
  const rows = Object.entries(LAYOUTS).filter(([, row]) => row.kind === kind);
  const lowest = Math.min(...rows.map(([, row]) => row.min));
  return rows.map(([id, { min, max }]) => ({
    id, min, max,
    open: (count >= min && count <= max) || (min === lowest && count < min),
    note: count < min && min !== lowest ? `thêm ${min - count} media để mở` : count > max ? `bớt ${count - max} media hoặc chọn layout lớn hơn` : "",
  }));
}

const empty = () => ({ vi: "", en: "" });
// A block the new layout needs that the page had none of: text empty, so the Còn thiếu tab lists it.
const DEFAULTS = {
  paragraph: () => ({ text: empty() }),
  "section-title": () => ({ text: empty() }),
  quote: () => ({ text: empty() }),
  "media-text": () => ({ text: empty() }),
  "hero-project": () => ({ tagline: [empty()] }),
  "facts-grid": () => ({ items: [{ label: empty(), text: empty() }, { label: empty(), text: empty() }] }),
  "contact-quick": () => ({ title: empty() }),
  "cta-arrow": () => ({ text: empty(), hrefVi: "/", hrefEn: "/en/" }),
};
const SIGNATURE = /^([a-z-]+)(?::([a-z0-9-]+))?(?:#(\d+))?$/;

// The block list of `layoutId` holding `media` (items of pageMedia), or { error } when the count does not fit. Blocks of the same
// type keep their text and id in order; media blocks take media in chain order; `quote` stays only if the page has one.
export function relayout(kind, page, layoutId, media) {
  if (!LAYOUTS[layoutId]) return { error: "layout-unknown" }; // "legacy" pages keep their own blocks until a layout is chosen
  const plan = expandLayout(layoutId, media.length);
  if (plan.error) return plan;
  const old = Map.groupBy(page.blocks ?? [], (block) => block.type);
  const taken = new Set((page.blocks ?? []).map((block) => block.id));
  const freshId = (type) => {
    for (let n = 1; ; n += 1) if (!taken.has(`${type}-${n}`)) return taken.add(`${type}-${n}`) && `${type}-${n}`;
  };
  const hasQuote = old.has("quote");
  let next = 0;
  const blocks = [];
  for (const { signature, optional } of plan.blocks) {
    const [, type, extra, count] = SIGNATURE.exec(signature);
    if (optional && !hasQuote) continue;
    const block = { ...(old.get(type)?.shift() ?? { id: freshId(type), type, ...DEFAULTS[type]?.() }) };
    if (count !== undefined) {
      const items = media.slice(next, next + Number(count));
      next += Number(count);
      for (const field of ["image", "images", "video"]) delete block[field];
      if (type === "media-single") Object.assign(block, items[0], { position: extra });
      else if (type === "media-pair" || type === "media-carousel") Object.assign(block, { images: items.map((item) => item.image) }, extra ? { layout: extra } : {});
      else block.image = items[0].image;
    }
    blocks.push(block);
  }
  return { blocks };
}

// Placements the page just got (no crop that fits their frame) get the largest centred crop at the allowed ratio nearest to the
// media's own (E16 lets the owner move it). A seeded placement and the whole frame of a repo media are exempt like ratioErrors.
// Mutates `data`; mediaById holds the media records. The two images of an equal pair share one ratio.
export function fitCrops(type, data, mediaById) {
  const pairs = new Map();
  for (const { ref, ratios, pair } of ratioPlacements(type, data)) {
    const media = isLegacy(ref) ? undefined : mediaById.get(ref.mediaId);
    if (!media || media.kind === "video") continue;
    if (ref.crop && ratios.some((ratio) => matchesRatio(ref.crop, ratio))) continue;
    if (!ref.crop && media.source === "repo") continue;
    const own = media.width / media.height;
    const [w, h] = pairs.get(pair) ?? ratios.toSorted((a, b) => Math.abs(Math.log(own / (a[0] / a[1]))) - Math.abs(Math.log(own / (b[0] / b[1]))))[0];
    if (pair !== undefined) pairs.set(pair, [w, h]);
    const width = Math.min(media.width, Math.round((media.height * w) / h));
    const height = Math.min(media.height, Math.round((media.width * h) / w));
    ref.crop = own > w / h ? [Math.round((media.width - width) / 2), 0, width, media.height] : [0, Math.round((media.height - height) / 2), media.width, height];
  }
}

// Every { vi, en } text of a block with its path, for the generic text inputs of the Thông tin tab; image refs have altVi, not vi.
export function blockTexts(block, path = []) {
  if (block === null || typeof block !== "object") return [];
  if (typeof block.vi === "string" && typeof block.en === "string") return [{ path, text: block }];
  return Object.entries(block).flatMap(([key, value]) => (["image", "images", "video"].includes(key) ? [] : blockTexts(value, [...path, key])));
}
