// Cross-record rules of the CMS (cms-plan part 2 K10, E10): one media one page, the Advertising pool, alt of card media and
// link targets. Pure module: the Worker (save, trash, update-media), the build checks and the editor share these functions.
import { blockTextFields } from "../../scripts/site/blocks.mjs";
import { PROJECT_TYPES, menuLinkErrors, menuShapeErrors } from "../../scripts/site/block-pages.mjs";
import { ADVERTISING_CLUSTERS, ADVERTISING_PRODUCTS } from "../site/advertising-products/taxonomy.mjs";
import { linksOf } from "./inline-marks.mjs";
import { resolveLink } from "./links.mjs";
import { mediaRefs } from "./media-ref.mjs";
import { SLOTS } from "./slots.generated.mjs";

const missing = (message, code) => ({ message, level: "missing", code });
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

// One photo, one page (owner 2026-11-13, 2026-11-16). Placeholders wait for the real photo, so any page may show them.
export const isPlaceholder = (src) => /(^|\/)placeholder[^/]*$/.test(String(src ?? ""));
// Owner kinds: "news" and "project" photos stay on their own page and nowhere else; a "page" (standard page) photo may not
// appear on another page; anything else ("other": hero slides, cards, styles) may share a page photo.
const OWN = new Set(["news", "project"]);
export const mayShare = (a, b) => !OWN.has(a) && !OWN.has(b) && !(a === "page" && b === "page");
const ownerKind = (type) => (OWN.has(type) ? type : type === "page-copy" ? "page" : "other");

// Advertising pool (advertising-masonry R2): each cluster keeps a portrait, near-square, landscape and extreme ratio card.
export const RATIO_CLASSES = {
  portrait: (ratio) => ratio < 0.9,
  "near-square": (ratio) => ratio >= 0.9 && ratio <= 1.1,
  landscape: (ratio) => ratio > 1.1,
  extreme: (ratio) => ratio <= 0.625 || ratio >= 1.6,
};
export const missingRatioClasses = (ratios) => Object.entries(RATIO_CLASSES).filter(([, has]) => !ratios.some(has)).map(([name]) => name);

// First two items of one card that share an alt in the same language, as the build reports it; null when none.
// The same media placed twice (a placeholder in a project card) is one media, not two.
export function altDuplicate(cardId, items) {
  const owners = new Map();
  for (const item of items) {
    for (const alt of [`vi:${item.altVi}`, `en:${item.altEn}`]) {
      if (owners.has(alt) && owners.get(alt) !== item.id) return `${cardId} media ${owners.get(alt)} and ${item.id} share alt "${alt.slice(3)}"`;
      owners.set(alt, item.id);
    }
  }
  return null;
}
const cardItems = (type, data) => {
  if (type === "advertising-card") return Array.isArray(data.mediaItems) ? data.mediaItems.filter(isObject) : [];
  return type === "project" && Array.isArray(data.card?.media) ? data.card.media.filter(isObject).map((ref) => ({ ...ref, id: ref.mediaId })) : [];
};
export function altErrors(type, data) {
  const duplicate = altDuplicate(data?.id ?? type, cardItems(type, data ?? {}));
  return duplicate ? [missing(duplicate, "alt-dup")] : [];
}

// Pool entry of a card: { id, clusters, ratio, keys }; keys are the src and sourceId of every media of the card.
export function poolEntry(card, { products = ADVERTISING_PRODUCTS } = {}) {
  const cover = card.media ?? card.mediaItems?.[0];
  const clusters = [...new Set((card.productIds ?? []).map((id) => products.find((product) => product.id === id)?.cluster).filter(Boolean))];
  const keys = new Set([card.media, ...(card.mediaItems ?? [])].filter(isObject).flatMap((item) => [item.src, item.sourceId]).filter((key) => typeof key === "string" && key));
  return { id: card.id, clusters, ratio: cover?.width / cover?.height, keys };
}

// Clusters that lose a ratio class when the card `id` leaves the pool or is replaced by `next` (a pool entry or null).
export function poolLoss(pool, id, next, clusters = ADVERTISING_CLUSTERS) {
  const after = [...pool.filter((card) => card.id !== id), ...(next ? [next] : [])];
  const ratiosOf = (cards, cluster) => cards.filter((card) => card.clusters.includes(cluster)).map((card) => card.ratio);
  return clusters.flatMap(({ id: cluster }) => {
    const before = missingRatioClasses(ratiosOf(pool, cluster));
    return missingRatioClasses(ratiosOf(after, cluster)).filter((name) => !before.includes(name)).map((name) => `${cluster} missing ${name} ratio`);
  });
}

// Every K1 link of a record's marked text (news, project, page-copy) or menu.
function textLinks(type, data) {
  const values = type === "page-copy"
    ? Object.entries(isObject(data.slots) ? data.slots : {}).filter(([key, value]) => SLOTS[data.id]?.[key]?.kind === "text" && isObject(value)).map(([, value]) => value)
    : type === "news" || type === "project" ? blockTextFields(data).map(([, value]) => value) : [];
  return values.flatMap((value) => [...linksOf(value?.vi), ...linksOf(value?.en)]);
}

// ctx: { projects, news (Maps of published ids), mediaById, usage (Map mediaId -> [{ type, id }] of other records),
// pool (pool entries of published cards, this card included as stored) }. Returns [{ message, level, code }].
export function crossErrors(type, id, data, ctx = {}) {
  if (!isObject(data)) return [];
  const at = data.id ?? type;
  const errors = [...altErrors(type, data)];
  // media-reuse: one media in one news, project or standard page.
  const usage = ctx.usage ?? new Map();
  const kind = ownerKind(type);
  const reported = new Set();
  for (const ref of mediaRefs(type, data)) {
    const media = ctx.mediaById?.get(ref.mediaId);
    if (typeof ref.mediaId !== "string" || reported.has(ref.mediaId) || media?.mime === "image/svg+xml" || isPlaceholder(media?.path ?? ref.src)) continue;
    const other = (usage.get(ref.mediaId) ?? []).find((use) => !(use.type === type && use.id === id) && !mayShare(kind, ownerKind(use.type)));
    if (!other) continue;
    reported.add(ref.mediaId);
    errors.push(missing(`${at}: media ${ref.mediaId} is already used by ${other.type} ${other.id} (one photo, one page)`, "media-reuse"));
  }
  // Advertising pool: no media shared with another card, and no cluster loses a ratio class.
  if (type === "advertising-card" && ctx.pool) {
    const entry = poolEntry(data);
    const clash = ctx.pool.find((card) => card.id !== id && [...entry.keys].some((key) => card.keys.has(key)));
    if (clash) errors.push(missing(`${at}: media already used by card ${clash.id}`, "pool-dup"));
    for (const loss of poolLoss(ctx.pool, id, entry)) errors.push(missing(`${at}: ${loss}`, "pool-min"));
  }
  // link-target: a page link to a record or key that does not exist; contact links render disabled and are not checked here.
  const linkCtx = { projects: ctx.projects ?? new Map(), news: ctx.news ?? new Map(), clusters: ADVERTISING_CLUSTERS.map(({ id: slug }) => ({ slug })), projectTypes: Object.keys(PROJECT_TYPES) };
  if (type === "menu") {
    if (!menuShapeErrors(data, "menu").length) errors.push(...menuLinkErrors(data, linkCtx, "menu").map((message) => missing(message, "link-target")));
  } else {
    for (const link of new Set(textLinks(type, data))) {
      if (link.startsWith("page:") && resolveLink(link, linkCtx) === null) errors.push(missing(`${at}: link ${link} points to a page that does not exist`, "link-target"));
    }
  }
  return errors;
}
