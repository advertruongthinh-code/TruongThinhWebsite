// Shared record contract of the CMS (cms-plan Q1, Q5, Q10): record types, names and slugs, and the two error levels the
// Worker and the build both use. Pure module: must not import catalog.mjs (it drags the 733 KB card manifest into the Worker).
import { BLOCK_TYPES, blockEmptyEnHrefs, blockMarksErrors, blockTextFields, validateBlockPage } from "../../scripts/site/blocks.mjs";
import { PROJECT_TYPES, kindFieldErrors, menuLinkErrors, menuShapeErrors } from "../../scripts/site/block-pages.mjs";
import { heroSlideErrors } from "../../scripts/site/hero-slides.mjs";
import { validateHomeProjects } from "../../scripts/site/home-projects.mjs";
import { validateAdvertisingCardMedia } from "../../src/site/advertising-products/media-contract.mjs";
import { IMAGE_SRC } from "../../scripts/site/lib-pure.mjs";
import { ADVERTISING_CLUSTERS, ADVERTISING_PRODUCTS } from "../../src/site/advertising-products/taxonomy.mjs";
import { layoutErrors } from "./layouts.mjs";
import { isLegacy, mediaRefs } from "./media-ref.mjs";
import { SLOTS } from "./slots.generated.mjs";
import { marksErrors } from "./inline-marks.mjs";
import { CONTACT_CHANNELS, CTA_KEYS, SLOT_PAGES } from "../../scripts/site/slots.mjs";
import { CONTACT_HREF } from "./links.mjs";

export const TYPES = ["media", "news", "project", "advertising-card", "hero-slide", "home-projects", "menu", "client-logo", "contact", "page-copy"];
export const SINGLETON_TYPES = ["home-projects", "menu", "contact"];
export const OPEN_TYPES = ["media", "news", "project", "advertising-card", "hero-slide", "home-projects", "menu", "page-copy", "contact", "client-logo"];
export const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
export const SVG = "image/svg+xml";
export const HERO_PAGES = ["home", "residential", "commercial"];

export function recordName(type, data) {
  if (SINGLETON_TYPES.includes(type)) return "main";
  if (type === "news" || type === "project") return data?.title?.vi;
  if (type === "advertising-card") return data?.titleVi;
  if (type === "client-logo") return data?.name;
  return data?.id;
}

export const recordSlugs = (type, data) => (type === "news" || type === "project" ? { vi: data?.slugVi || null, en: data?.slugEn || null } : { vi: null, en: null });

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isSize = (value) => Number.isSafeInteger(value) && value > 0;
const shape = (message, code) => ({ message, level: "shape", ...(code ? { code } : {}) });
const missing = (message) => ({ message, level: "missing" });
const pageKind = (type) => (type === "project" ? "projects" : "news");

export function mediaErrors(media) {
  const at = media?.id ?? "media";
  return [
    ...["altVi", "altEn"].filter((field) => typeof media?.[field] !== "string" || !media[field].trim()).map((field) => `${at}: missing ${field}`),
    ...(isSize(media?.width) && isSize(media?.height) ? [] : [`${at}: width and height must be positive integers`]),
    ...(media?.kind === "video" ? [
      ...(typeof media.duration === "number" && media.duration > 0 && media.duration <= 600 ? [] : [`${at}: duration must be a number in (0, 600]`]),
      ...(typeof media.posterId === "string" && ID.test(media.posterId) ? [] : [`${at}: posterId must be a media id`]),
    ] : []),
  ];
}

const cropErrors = (crop, media, where) => {
  if (crop === undefined) return [];
  const [x, y, w, h] = Array.isArray(crop) ? crop : [];
  const ok = Array.isArray(crop) && crop.length === 4 && crop.every(Number.isSafeInteger) && x >= 0 && y >= 0 && w >= 1 && h >= 1
    && x + w <= media.width && y + h <= media.height;
  return ok ? [] : [shape(`${where}: crop must be 4 integers [x, y, w, h] inside ${media.width}x${media.height}`, "crop")];
};

// Derived fields of an Advertising card (cms-plan part 2 K6), set on save over what the client sent. category: the legacySlug
// (else slugEn) of the main product's cluster; productKey: <category>-product-<id> for a new card. A card that already has
// them keeps them (10 seeded cards sit in another category than their main product's cluster; changing that moves cards).
// tagIds: one group-<category>; a framing tag from the cover ratio when none is set. sourceOrder: snapshotToFiles renumbers.
export function deriveCard(data, { products = ADVERTISING_PRODUCTS, clusters = ADVERTISING_CLUSTERS } = {}) {
  const product = products.find(({ id }) => id === data.productIds?.[0]);
  const cluster = clusters.find(({ id }) => id === product?.cluster);
  const category = data.category ?? cluster?.legacySlug ?? cluster?.slugEn;
  const productKey = data.productKey ?? `${category}-product-${data.id}`;
  const cover = data.mediaItems?.find(({ id }) => id === data.coverMediaId) ?? data.mediaItems?.[0] ?? data.media;
  const ratio = cover?.width / cover?.height;
  const tags = (data.tagIds ?? []).filter((tag) => !tag.startsWith("group-"));
  const framing = tags.some((tag) => tag.startsWith("format-")) || !(ratio > 0) ? []
    : [ratio < 0.9 ? "format-portrait" : ratio <= 1.1 ? "format-square" : "format-landscape"];
  return { ...data, category, productKey, tagIds: data.tagIds?.length ? [`group-${category}`, ...tags, ...framing] : [] };
}

// Page copy (cms-plan part 2 K7): one record per standard page; every key is a slot of that page, text checked by its kind's
// marks, media by the placement rules below. An empty slot is valid (the page shows a placeholder).
function pageCopyErrors(data, at) {
  if (!Object.hasOwn(SLOT_PAGES, data.id)) return [shape(`${at}: page-copy id must be ${Object.keys(SLOT_PAGES).join(", ")}`, "page-id")];
  if (!isObject(data.slots)) return [shape(`${at}: slots must be an object`)];
  const errors = [];
  for (const [key, value] of Object.entries(data.slots)) {
    const slot = SLOTS[data.id]?.[key];
    if (!slot) errors.push(shape(`${at}: ${key} is not a slot of this page`, "slot-unknown"));
    else if (!isObject(value)) errors.push(shape(`${at}: ${key} must be an object`));
    else if (slot.kind === "text") errors.push(...marksErrors(value.vi, value.en, slot.marks).map((error) => ({ ...error, message: `${at}: ${key}: ${error.message}` })));
    else if (["vi", "en"].some((side) => Object.hasOwn(value, side))) errors.push(shape(`${at}: ${key} is an image slot`));
  }
  return errors;
}

// contact.json (K8): the six channels and the fixed CTA keys, nothing more; href is empty or one of the allowed schemes.
const sameKeys = (value, keys) => isObject(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const isText = (value) => typeof value === "string" && value.trim() !== "";
function contactErrors(data) {
  const errors = [];
  if (!sameKeys(data.channels, CONTACT_CHANNELS)) errors.push(shape(`contact: channels must be exactly ${CONTACT_CHANNELS.join(", ")}`, "contact-channels"));
  else for (const [key, channel] of Object.entries(data.channels)) {
    if (!isObject(channel) || typeof channel.href !== "string" || (channel.href && !CONTACT_HREF.test(channel.href))) errors.push(shape(`contact: ${key}.href must be empty, https://, tel: or mailto:`, "contact-href"));
    else if (channel.text !== undefined && typeof channel.text !== "string") errors.push(shape(`contact: ${key}.text must be text`));
  }
  if (!sameKeys(data.cta, CTA_KEYS)) return [...errors, shape(`contact: cta must be exactly ${CTA_KEYS.join(", ")}`, "contact-cta")];
  for (const [key, cta] of Object.entries(data.cta)) {
    const aria = cta?.aria;
    if (!isObject(cta) || !isText(cta.vi) || !isText(cta.en)) errors.push(shape(`contact: cta ${key} needs vi and en`));
    else if (!CONTACT_CHANNELS.includes(cta.channel)) errors.push(shape(`contact: cta ${key} channel must be one of ${CONTACT_CHANNELS.join(", ")}`, "contact-channel"));
    else if (aria !== undefined && !(isObject(aria) && isText(aria.vi) && isText(aria.en))) errors.push(shape(`contact: cta ${key} aria needs vi and en`));
  }
  return errors;
}

// ctx: { id, mediaById }. mediaById holds media that are not trashed, so a trashed id reads as unknown.
export async function shapeErrors(type, data, ctx = {}) {
  if (!isObject(data)) return [shape(`${type}: data must be an object`)];
  if (!TYPES.includes(type)) return [shape(`unknown type ${type}`)];
  const errors = [];
  if (SINGLETON_TYPES.includes(type)) {
    if (Object.hasOwn(data, "id")) errors.push(shape(`${type}: a single record has no id field`));
  } else if (typeof data.id !== "string" || !ID.test(data.id)) errors.push(shape(`${type}: id must match ${ID}`));
  else if (ctx.id !== undefined && data.id !== ctx.id) errors.push(shape(`${type}: data.id ${data.id} differs from record id ${ctx.id}`));
  const at = data.id ?? type;
  if (type === "news" || type === "project") {
    for (const [index, block] of (Array.isArray(data.blocks) ? data.blocks : []).entries()) {
      if (!BLOCK_TYPES.includes(block?.type)) errors.push(shape(`${at}: blocks[${index}] unknown block type ${block?.type}`));
    }
    errors.push(...layoutErrors(pageKind(type), data).filter((error) => error.level === "shape").map((error) => ({ ...error, message: `${at}: ${error.message}` })));
    errors.push(...blockMarksErrors(data, at));
  }
  if (type === "advertising-card" && !ADVERTISING_PRODUCTS.some(({ id }) => id === data.productIds?.[0])) errors.push(shape(`${at}: a card needs a known main product (productIds[0])`, "card-product"));
  if (type === "page-copy") errors.push(...pageCopyErrors(data, at));
  if (type === "contact") errors.push(...contactErrors(data));
  // Client logo (K9): the name is the alt; src and viewBox come from the SVG media on save; a logo is never cropped.
  if (type === "client-logo") {
    if (typeof data.name !== "string") errors.push(shape(`${at}: name must be a string`, "logo-name"));
    if (data.crop !== undefined) errors.push(shape(`${at}: a logo is not cropped`, "crop"));
  }
  // Menu (cms-content R7): 6 groups, item and link shape; a deleted group is a 400.
  if (type === "menu") errors.push(...menuShapeErrors(data, "menu").map((message) => shape(message, "menu-shape")));
  const mediaById = ctx.mediaById ?? new Map();
  for (const ref of mediaRefs(type, data)) {
    // legacySrc keeps seeded fields as is, so it must not let a client keep its own src (Q6: legacySrc equals the seeded src).
    if (isLegacy(ref)) {
      if (typeof ref.legacySrc !== "string" || ref.src !== ref.legacySrc || !IMAGE_SRC.test(ref.src)) errors.push(shape(`${at}: legacySrc must equal src and be a repo image path`, "legacy-src"));
      continue;
    }
    if (ref.mediaId === undefined) { errors.push(shape(`${at}: a media placement needs mediaId`, "media-id")); continue; }
    const media = mediaById.get(ref.mediaId);
    if (!media) errors.push(shape(`${at}: media ${ref.mediaId} does not exist`, "media-unknown"));
    // SVG media go only into client logos, and a logo takes only SVG (K9).
    // Video media go nowhere in part 1 (cms-plan Q6 "Video"); part 2 opens them to the same renderer.
    else if (media.kind === "video" || (media.mime === SVG) !== (type === "client-logo")) errors.push(shape(`${at}: media ${ref.mediaId} (${media.mime}) cannot be placed in ${type}`, "media-kind"));
    else errors.push(...cropErrors(ref.crop, media, `${at}: media ${ref.mediaId}`));
  }
  // Project card (cms-content R4): card media come from the page's own media; seeded crops (legacySrc) are exempt.
  if (type === "project" && Array.isArray(data.card?.media)) {
    const pageMedia = pageMediaIds(data);
    for (const [index, ref] of data.card.media.entries()) {
      if (isObject(ref) && !isLegacy(ref) && !pageMedia.has(ref.mediaId)) errors.push(shape(`${at}: card.media[${index}] must be a media of this page`, "card-foreign"));
    }
  }
  return errors;
}

// Media ids of a news or project page: cover and every block image (a project card may use only these).
export const pageMediaIds = (data) => new Set(mediaRefs("news", data).map((ref) => ref.mediaId).filter((id) => id !== undefined));

// Required EN fields that are empty (cms-content R2, K3): a news or project record with any of them builds in VI only.
// Image alt EN stays required and is not listed here.
export function enMissing(type, data) {
  if (type !== "news" && type !== "project") return [];
  const empty = (value) => typeof value?.en !== "string" || !value.en.trim();
  return [
    ...["title", "description"].filter((field) => empty(data?.[field])).map((field) => `${field}.en`),
    ...(typeof data?.slugEn === "string" && data.slugEn ? [] : ["slugEn"]),
    ...(type === "project" && data?.seoTitle !== undefined && empty(data.seoTitle) ? ["seoTitle.en"] : []),
    ...blockTextFields(data).filter(([, value]) => empty(value)).map(([field]) => `${field}.en`),
    ...blockEmptyEnHrefs(data),
  ];
}

// ctx: { checkImage, projects, news (Maps id -> published data) }.
export async function fullErrors(type, data, ctx = {}) {
  const at = data?.id ?? type;
  const projects = ctx.projects ?? new Map();
  let messages = [];
  let layout = [];
  const cardMin = [];
  if (type === "news" || type === "project") {
    const kind = pageKind(type);
    layout = layoutErrors(kind, data);
    // kindFieldErrors already appends every layout error as text; keep only the field errors and add the missing-level layout ones below.
    // Mark errors are shape errors (shapeErrors reports them); drop their text copy too.
    const reported = new Set([...layout.map(({ message }) => `${at}: ${message}`), ...blockMarksErrors(data, at).map(({ message }) => message)]);
    messages = [
      ...(await validateBlockPage(data, { checkImage: ctx.checkImage, projects, news: ctx.news ?? new Map(), en: "optional" })).filter((message) => !reported.has(message)),
      ...kindFieldErrors(kind, data, at, { en: "optional" }).filter((message) => !reported.has(message)),
    ];
    // cms-content R4: a project card always has 2 or more media, so a page without a card is missing them too.
    if (type === "project" && !(Array.isArray(data.card?.media) && data.card.media.length >= 2)) cardMin.push({ ...missing(`${at}: card công trình cần ít nhất 2 media`), code: "card-min" });
  } else if (type === "hero-slide") {
    messages = [
      ...await heroSlideErrors(data, at, ctx.checkImage),
      ...(HERO_PAGES.includes(data.page) ? [] : [`${at}: page must be ${HERO_PAGES.join(", ")}`]),
    ];
  } else if (type === "home-projects") messages = validateHomeProjects(data.ids, projects);
  else if (type === "menu") messages = menuShapeErrors(data, "menu").length ? [] : menuLinkErrors(data, {
    projects, news: ctx.news ?? new Map(), clusters: ADVERTISING_CLUSTERS.map(({ id }) => ({ slug: id })), projectTypes: Object.keys(PROJECT_TYPES),
  }, "menu");
  else if (type === "advertising-card") {
    const card = deriveCard(data);
    if (!card.tagIds.length) messages.push(`${at}: a card needs tagIds`);
    try { validateAdvertisingCardMedia(card); } catch (error) { messages.push(error.message); }
  } else if (type === "media") messages = mediaErrors(data);
  else if (type === "client-logo" && !isText(data.name)) messages = [`${at}: logo cần tên (alt)`];
  // A button on a channel without a link renders disabled: the save goes through but the record is not complete.
  else if (type === "contact") messages = Object.entries(data.cta ?? {}).filter(([, cta]) => !data.channels?.[cta?.channel]?.href).map(([key, cta]) => `contact: cta ${key} points to ${cta?.channel}, which has no link`);
  return [
    ...messages.map(missing),
    ...cardMin,
    ...layout.filter((error) => error.level === "missing").map((error) => ({ ...error, message: `${at}: ${error.message}` })),
  ];
}
