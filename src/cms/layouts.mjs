// Page layouts of News posts and project pages locked by media count (cms-content R5, cms-plan Q5). Pure module: the build,
// the admin Worker and the editor import it. A layout is a fixed block chain; media blocks take [min..max] media in chain order.
import { LEGACY_LAYOUTS } from "./legacy-layouts.mjs";

const p = { type: "paragraph" };
const facts = { type: "facts-grid" };
const quote = { type: "quote", optional: true };
const text = { type: "media-text", min: 1, max: 1 };
const single = (position, min = 1, fill) => ({ type: "media-single", position, min, max: 1, ...(fill === undefined ? {} : { fill }) });
const pair = (layout, min = 2, fill) => ({ type: "media-pair", layout, min, max: 2, step: 2, ...(fill === undefined ? {} : { fill }) });
const carousel = (min, max, fill) => ({ type: "media-carousel", min, max, ...(fill === undefined ? {} : { fill }) });
const NEWS_END = [{ type: "contact-quick" }, { type: "news-cards" }, { type: "cta-arrow" }];
const START = [{ type: "hero-project", min: 1, max: 1 }, { type: "section-title" }, p];
const END = [{ type: "project-slider" }, { type: "cta-arrow" }, { type: "contact-quick" }];

// fill: lower gets spare media first; default is the slot's index among media blocks, negatives override (Q5 last column).
export const LAYOUTS = {
  "news-2-5": { kind: "news", min: 2, max: 5, chain: [p, single("wide"), p, pair("equal", 0), p, single("right-2-3", 0), p, single("left-2-3", 0), ...NEWS_END] },
  "news-6-11": { kind: "news", min: 6, max: 11, chain: [p, single("wide"), p, pair("equal"), quote, p, single("right-2-3"), p, carousel(2, 5, -1), p, pair("left-large", 0, -2), ...NEWS_END] },
  "news-12-16": { kind: "news", min: 12, max: 16, chain: [p, single("wide"), p, pair("equal"), quote, p, single("right-2-3"), p, carousel(5, 8, -1), p, pair("left-large"), p, pair("right-large", 0, -2), ...NEWS_END] },
  "news-17": { kind: "news", min: 17, max: 30, chain: [p, single("wide"), p, pair("equal"), quote, p, carousel(8, 10, -2), p, pair("left-large"), p, single("right-2-3"), p, pair("right-large", 0, -3), p, carousel(2, 12, -1), ...NEWS_END] },
  "project-4-5": { kind: "projects", min: 4, max: 5, chain: [...START, facts, p, single("wide"), p, single("left-2-3", 0), p, pair("equal"), p, p, ...END] },
  "project-6-7-a": { kind: "projects", min: 6, max: 7, chain: [...START, carousel(3, 4), facts, text, p, single("wide"), p, p, ...END] },
  "project-6-7-b": { kind: "projects", min: 6, max: 7, chain: [...START, facts, text, p, single("left-2-3"), p, carousel(3, 4), p, ...END] },
  "project-8-9": { kind: "projects", min: 8, max: 9, chain: [...START, carousel(3, 4), facts, text, p, single("wide"), p, pair("equal"), p, p, ...END] },
  "project-10-12": { kind: "projects", min: 10, max: 12, chain: [...START, carousel(4, 5, -1), facts, text, p, single("wide"), p, pair("equal"), p, single("left-2-3"), p, single("wide", 0, -2), p, p, ...END] },
  "project-13": { kind: "projects", min: 13, max: 23, chain: [...START, carousel(5, 5), facts, p, pair("equal"), p, pair("left-large"), p, carousel(2, 12), p, single("wide"), p, p, ...END] },
};

// slots: media blocks of the chain in chain order, each { min, max, step, fill }.
// step 2 means the block takes 0 or 2 (a pair); fill is the order extras are handed out (lower first).
export function assignMedia(count, slots) {
  const counts = slots.map((slot) => slot.min);
  let rest = count - counts.reduce((sum, value) => sum + value, 0);
  if (rest < 0) return { error: "below-min", missing: -rest };
  for (const index of slots.map((_, i) => i).sort((a, b) => slots[a].fill - slots[b].fill || a - b)) {
    let add = Math.min(slots[index].max - counts[index], rest);
    if (slots[index].step === 2) add -= add % 2;
    counts[index] += add;
    rest -= add;
  }
  return rest > 0 ? { error: "over-max", extra: rest } : { counts };
}

export const mediaCount = (block) => (block.image ? 1 : block.video ? 1 : block.images?.length ?? 0);
const hasMedia = (block) => block.image !== undefined || block.video !== undefined || block.images !== undefined;
const sign = (type, position, layout, count) => `${type}${position ? `:${position}` : ""}${layout ? `:${layout}` : ""}${count === undefined ? "" : `#${count}`}`;
export const signature = (block) => sign(block.type, block.position, block.layout, hasMedia(block) ? mediaCount(block) : undefined);

// The expected block signatures of a layout holding mediaCount media; media blocks that get 0 drop with the paragraph right before them.
export function expandLayout(layoutId, mediaCount) {
  const { chain } = LAYOUTS[layoutId];
  const slots = chain.filter((entry) => entry.min !== undefined);
  const assigned = assignMedia(mediaCount, slots.map((slot, index) => ({ ...slot, fill: slot.fill ?? index })));
  if (assigned.error) return assigned;
  const blocks = [];
  for (const entry of chain) {
    const slot = slots.indexOf(entry);
    if (slot === -1) { blocks.push({ signature: sign(entry.type), optional: entry.optional === true }); continue; }
    const count = assigned.counts[slot];
    if (count === 0) { if (blocks.at(-1)?.signature === "paragraph") blocks.pop(); continue; }
    blocks.push({ signature: sign(entry.type, entry.position, entry.layout, count), optional: false });
  }
  return { blocks };
}

// Index of the first page block that breaks the expected chain, or -1. An optional expected block the page lacks is skipped.
function chainBreak(pageBlocks, expected) {
  let at = 0;
  for (const { signature: wanted, optional } of expected) {
    if (optional && pageBlocks[at]?.type !== wanted) continue;
    if (at >= pageBlocks.length || signature(pageBlocks[at]) !== wanted) return at;
    at += 1;
  }
  return at < pageBlocks.length ? at : -1;
}

const chainError = (name, index) => ({ message: `blocks do not match layout ${name} at block ${index}`, level: "shape", code: "layout-chain" });

// Errors of a page's layout field, by the six rules of Q5 in order; stops at the first rule that matches.
export function layoutErrors(kind, page) {
  const names = Object.keys(LAYOUTS).filter((name) => LAYOUTS[name].kind === kind);
  const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
  const legacy = page?.layout === "legacy" ? LEGACY_LAYOUTS[kind]?.[page.id] : undefined;
  if (!names.includes(page?.layout) && !legacy) return [{ message: `layout must be one of ${names.join(", ")}`, level: "shape", code: "layout-unknown" }];
  if (legacy) {
    const index = chainBreak(blocks, legacy.map((wanted) => ({ signature: wanted, optional: false })));
    return index === -1 ? [] : [chainError("legacy", index)];
  }
  const row = LAYOUTS[page.layout];
  const count = blocks.reduce((sum, block) => sum + mediaCount(block), 0);
  const lowest = Math.min(...names.map((name) => LAYOUTS[name].min));
  if (count < row.min && row.min !== lowest) return [{ message: `layout ${page.layout} needs ${row.min - count} more media`, level: "shape", code: "layout-locked", missing: row.min - count }];
  if (count < row.min) return [{ message: `needs at least ${row.min} media, has ${count}`, level: "missing", code: "media-min", missing: row.min - count }];
  if (count > row.max) return [{ message: `layout ${page.layout} holds at most ${row.max} media, has ${count}`, level: "missing", code: "media-max", extra: count - row.max }];
  const index = chainBreak(blocks, expandLayout(page.layout, count).blocks);
  return index === -1 ? [] : [chainError(page.layout, index)];
}
