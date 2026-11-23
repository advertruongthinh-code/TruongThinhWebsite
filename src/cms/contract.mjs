// Shared record contract of the CMS (cms-plan Q1, Q5, Q10): record types, names and slugs, and the two error levels the
// Worker and the build both use. Pure module: must not import catalog.mjs (it drags the 733 KB card manifest into the Worker).
import { BLOCK_TYPES, blockEmptyEnHrefs, blockMarksErrors, blockTextFields, validateBlockPage } from "../../scripts/site/blocks.mjs";
import { kindFieldErrors, menuErrors } from "../../scripts/site/block-pages.mjs";
import { heroSlideErrors } from "../../scripts/site/hero-slides.mjs";
import { validateHomeProjects } from "../../scripts/site/home-projects.mjs";
import { validateAdvertisingCardMedia } from "../../src/site/advertising-products/media-contract.mjs";
import { IMAGE_SRC } from "../../scripts/site/lib-pure.mjs";
import { ADVERTISING_CLUSTERS, ADVERTISING_PRODUCTS } from "../../src/site/advertising-products/taxonomy.mjs";
import { layoutErrors } from "./layouts.mjs";
import { mediaRefs } from "./media-ref.mjs";

export const TYPES = ["media", "news", "project", "advertising-card", "hero-slide", "home-projects", "menu", "client-logo", "contact", "page-copy"];
export const SINGLETON_TYPES = ["home-projects", "menu", "contact", "page-copy"];
export const OPEN_TYPES = ["media", "news", "project", "advertising-card", "hero-slide", "home-projects", "menu"];
export const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
export const HERO_PAGES = ["home", "residential", "commercial"];

export function recordName(type, data) {
  if (SINGLETON_TYPES.includes(type)) return "main";
  if (type === "news" || type === "project") return data?.title?.vi;
  if (type === "advertising-card") return data?.titleVi;
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
  const mediaById = ctx.mediaById ?? new Map();
  for (const ref of mediaRefs(type, data)) {
    // legacySrc keeps seeded fields as is, so it must not let a client keep its own src (Q6: legacySrc equals the seeded src).
    if (ref.legacySrc !== undefined) {
      if (typeof ref.legacySrc !== "string" || ref.src !== ref.legacySrc || !IMAGE_SRC.test(ref.src)) errors.push(shape(`${at}: legacySrc must equal src and be a repo image path`, "legacy-src"));
      continue;
    }
    if (ref.mediaId === undefined) { errors.push(shape(`${at}: a media placement needs mediaId`, "media-id")); continue; }
    const media = mediaById.get(ref.mediaId);
    if (!media) errors.push(shape(`${at}: media ${ref.mediaId} does not exist`, "media-unknown"));
    else errors.push(...cropErrors(ref.crop, media, `${at}: media ${ref.mediaId}`));
  }
  // Project card (cms-content R4): card media come from the page's own media; seeded crops (legacySrc) are exempt.
  if (type === "project" && Array.isArray(data.card?.media)) {
    const pageMedia = new Set(mediaRefs("news", data).map((ref) => ref.mediaId));
    for (const [index, ref] of data.card.media.entries()) {
      if (isObject(ref) && ref.legacySrc === undefined && !pageMedia.has(ref.mediaId)) errors.push(shape(`${at}: card.media[${index}] must be a media of this page`, "card-media"));
    }
  }
  return errors;
}

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

// ctx: { checkImage, projects, news (Maps id -> published data), categories }.
export async function fullErrors(type, data, ctx = {}) {
  const at = data?.id ?? type;
  const categories = ctx.categories ?? ADVERTISING_CLUSTERS.map(({ id }) => ({ slug: id }));
  const projects = ctx.projects ?? new Map();
  let messages = [];
  let layout = [];
  if (type === "news" || type === "project") {
    const kind = pageKind(type);
    layout = layoutErrors(kind, data);
    // kindFieldErrors already appends every layout error as text; keep only the field errors and add the missing-level layout ones below.
    // Mark errors are shape errors (shapeErrors reports them); drop their text copy too.
    const reported = new Set([...layout.map(({ message }) => `${at}: ${message}`), ...blockMarksErrors(data, at).map(({ message }) => message)]);
    messages = [
      ...(await validateBlockPage(data, { checkImage: ctx.checkImage, projects, news: ctx.news ?? new Map(), en: "optional" })).filter((message) => !reported.has(message)),
      ...kindFieldErrors(kind, data, at, { en: "optional" }).filter((message) => !reported.has(message)),
      // cms-content R4: a project card always has 2 or more media, so a page without a card is missing them too.
      ...(type === "project" && !(Array.isArray(data.card?.media) && data.card.media.length >= 2) ? [`${at}: card công trình cần ít nhất 2 media`] : []),
    ];
  } else if (type === "hero-slide") {
    messages = [
      ...await heroSlideErrors(data, at, ctx.checkImage),
      ...(HERO_PAGES.includes(data.page) ? [] : [`${at}: page must be ${HERO_PAGES.join(", ")}`]),
    ];
  } else if (type === "home-projects") messages = validateHomeProjects(data.ids, projects);
  else if (type === "menu") messages = menuErrors(data, { projects: [...projects.values()], categories }, "menu");
  else if (type === "advertising-card") {
    const card = deriveCard(data);
    if (!card.tagIds.length) messages.push(`${at}: a card needs tagIds`);
    try { validateAdvertisingCardMedia(card); } catch (error) { messages.push(error.message); }
  } else if (type === "media") messages = mediaErrors(data);
  return [
    ...messages.map(missing),
    ...layout.filter((error) => error.level === "missing").map((error) => ({ ...error, message: `${at}: ${error.message}` })),
  ];
}
