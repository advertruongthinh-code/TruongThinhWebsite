//# allFunctionsCalledOnLoad
// V8 compile hint: compile every function on a background thread at load, so the first card tap does not compile lazily on the main thread
// (about 20% of the click task when opening detail; decision phone-frame-budget).
import { imageFormatReady, responsiveSource, responsiveSrcset } from "../media-lib/responsive-image.mjs";
import {
  MASONRY_LAYOUT_VERSION,
  MASONRY_SEARCH_BUDGET,
  masonrySpacing,
  columnsForWidth,
  computeDetailGeometry,
  compileMasonryLayout,
  fnv1a32,
  getVirtualWindow,
  filterRank,
  matchesFilter,
  normalizeMasonrySettings,
  validateMasonryCards,
} from "./layout.mjs";
import { createDetailViewer } from "./detail-viewer.mjs";
import { bandKey, poolSignature, replayLayout, stackLayout, variantIndex } from "./replay.mjs";
import { mountSuggestionSlides, PUSH_TIMING, suggestionDeck } from "./suggestion-slideshow.mjs";
import { keepLanes, moveStrip, placeStrip, releaseNode, releaseTiming, retargetStrip, stripOffset, trackStripSwipe } from "./strip.mjs";
import { createBrowseSeed, shuffleWithSeed } from "./random-order.mjs";
import {
  createSkeletonFlowFrameLayout,
  readSkeletonBatchConfig,
  createSkeletonFlowRenderer,
  createSkeletonFlowWorkerRenderer,
  createSharedSkeletonFlowLayer,
  skeletonFlowWorkerSupported,
  drawSkeletonFlowAssignment,
  SKELETON_FLOW_CONTEXT_ATTRIBUTES,
  skeletonFlowStill,
} from "./skeleton-flow.mjs";
import { arcGlassGeometry, createGlassSurface, layoutArcGlass, playGlassReveal } from "./glass-surface.mjs";
import { createCtaBatch } from "./cta-batch.mjs";
import { planAroundPinned } from "./detour-path.mjs";
import { createMasonryHost, env, isSizeMorph } from "./host.mjs";
import { loadHls, releaseVideoSource, setVideoSource } from "../media-lib/video-source.mjs";
import { MEDIA_COLORS } from "../media-lib/colors.mjs";
import { DUR, EASE } from "./motion-tokens.mjs";
import {
  breathePhase, clearColorWait, GHOST_FADE_EASING, GHOST_FADE_MS, setColorWait,
} from "./mount-budget.mjs";

let activeInstance;

const startLayoutWorker = () => new Worker(new URL("./layout-worker.mjs", import.meta.url), { type: "module" });
// One compile on a dedicated Worker; null when the Worker or clone fails so the caller compiles synchronously.
const compileInWorker = (options, worker) => new Promise((resolve) => {
  worker.onmessage = ({ data }) => resolve(data);
  worker.onerror = () => resolve(null);
  try {
    worker.postMessage(options);
  } catch {
    resolve(null);
  }
}).finally(() => worker.terminate());
let lastClosedPhotoId = null;
let artifactPromise;
const GEOMETRY_CACHE_LIMIT = 24;
const BROWSE_STATE_KEY = "advertisingBrowse";
export const VISIT_SEED_HANDOFF_KEY = "tt-advertising-visit-seed-handoff-v1";
const VISIT_SEED_HANDOFF_TTL_MS = 30_000;
// Root page and cluster, product pages (taxonomy R4): /<locale>/advertising-products/[<cluster>/[<product>/]].
// The Projects page (projects R2) shares the runtime with the root /<locale>/projects/; group 2 is the root, group 3 is the part after the root.
const ADVERTISING_PATH_PATTERN = /^\/(vi|en)\/(advertising-products|projects)(?:\/((?:[^/]+\/){0,2}))?$/;
const browseBase = (pathname) => pathname.match(ADVERTISING_PATH_PATTERN)?.[2] ?? "advertising-products";
// Card page (media-seo R1): detail has the URL /<locale>/advertising-products/p/<card-id>/; the old ?photo= is still read.
const ADVERTISING_CARD_PATH_PATTERN = /^\/(?:vi|en)\/advertising-products\/p\/([^/]+)\/$/;
// Colors generated at build time from the image file name: [card dominant color, 4 Flow colors light to dark].
const mediaColors = (src) => MEDIA_COLORS[src?.split("/").pop().replace(/\.\w+$/, "")];
const advertisingCardPath = (locale, id) => `/${locale}/advertising-products/p/${encodeURIComponent(id)}/`;
// Dominant color: project cards carry a ready color (build computes it with sharp), ad cards look up MEDIA_COLORS.
const cardColor = (card) => card.color ?? mediaColors(card.media.src)?.[0];
// The 4 colors of the phone wait layer (progressive-loading R9): the file's Flow colors; without a full palette the layer stays the flat fallback color.
const waitColors = (src, fallback = "#e9e6df") => {
  const colors = mediaColors(src)?.slice(1);
  return colors?.length === 4 ? colors : Array(4).fill(fallback);
};
const detailId = (url) => {
  const id = url.pathname.match(ADVERTISING_CARD_PATH_PATTERN)?.[1];
  if (!id) return url.searchParams.get("photo");
  try { return decodeURIComponent(id); } catch { return null; }
};
const skeletonNativeContexts = [];
let skeletonDocumentParked = false;
let skeletonDocumentEventsBound = false;
const skeletonPhone = () => matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0
  || document.documentElement.clientWidth <= 750;
// Wide desktop shows 8-10 CTA frames at once; 12 keeps all of them alive and stays under Chrome's 16-context limit.
// Phones also run every frame in the viewport (owner 2026-10-10), no longer limited to 2.
const SKELETON_CONTEXT_BUDGET = 12;
// Advertising-skeleton R5: Chrome keeps only 4 live WebGL contexts per dedicated worker (measured on RTX 3090, Chrome 155 and
// A04s, Chrome 156: creating a 5th context reclaims the oldest one). PC: all frames draw on one shared context in the worker, then
// transfer the image to the frame's canvas, up to 24 frames. Phone: one context per frame, 4 frames per worker (12 frames);
// a shared context on the A04s drops fps below the R8 gate (measured 26/10).
const SKELETON_SHARED_BUDGET = 24;
// Approved reveal: glass in 0-0.6s, crossfade 0.3-0.9s, glass out 0.6-1.4s; card and primary shorten the duration to 0.6s (owner 19/10).
const MEDIA_REVEAL_MS = 1400;
const CARD_REVEAL_MS = DUR.hover;
// Blur on the loading card image itself (progressive-loading R9); a filter does not re-read the backdrop every frame like backdrop-filter.
const CARD_LOADING_BLUR = "blur(24px)";
// Blur samples transparent pixels outside the image edge, so the fading edge exposes the dominant background color as a dark border (owner 2026-11-09).
// The blurred image is scaled up by this much on each side (1 blur sigma: the frame edge keeps about 16% of the background color) so the faded band falls outside the clipped frame.
const CARD_LOADING_BLEED_PX = 24;
const cardLoadingScale = (node) => {
  const width = Number.parseFloat(node.style.width);
  const height = Number.parseFloat(node.style.getPropertyValue("--masonry-media-height"));
  return width > 0 && height > 0
    ? `${1 + (2 * CARD_LOADING_BLEED_PX) / width} ${1 + (2 * CARD_LOADING_BLEED_PX) / height}`
    : "1";
};
const SKELETON_ASSIGN_BUDGET_MS = 8;
// On phones, hold the card reveal until the swipe stops: otherwise a fast fling would start a Glass reveal for every card that scrolls past.
const PHONE_REVEAL_SCROLL_IDLE_MS = 120;
// A re-attached card with already-loaded media waits this long for the cache (R3 measured decode at one to three frames); past the deadline, if the image has not arrived (cache off
// or cleared), it carries a skeleton like a loading card (R1), never a blank frame.
const REMOUNT_CACHE_WAIT_MS = 150;
const PHONE_SCROLL_SETTLE_MS = 500;
// Card skeleton (advertising-skeleton R4): a card entering the viewport within this window after a scroll event shows the frame and Flow canvas
// immediately without a fade, so a fast swipe still shows the running gradient.
const SKELETON_SCROLL_ENTRY_MS = 250;
// Card frames on phones also run during a swipe: a quarter of the pixels so the GPU holds the fps gate (R8, owner 18/10).
const PHONE_CARD_FLOW = { width: 120, height: 80 };
// Document-wide shared batch Flow layer; null when there is no WebGL so the batch falls back to its own renderer.
let sharedSkeletonFlow;
const disposeSkeletonContext = (record) => {
  if (record.disposed) return;
  record.disposed = true;
  record.canvas.removeEventListener("webglcontextlost", record.onLost);
  record.canvas.removeEventListener("webglcontextrestored", record.onRestored);
  if (record.renderer) record.renderer.destroy();
  else if (record.gl && !record.gl.isContextLost()) record.gl.getExtension("WEBGL_lose_context")?.loseContext();
  record.renderer = null;
  record.gl = null;
};
const pruneSkeletonContexts = (budget) => {
  while (skeletonNativeContexts.length > budget) {
    const index = skeletonNativeContexts.findIndex(record => !record.renderer);
    if (index < 0) break;
    disposeSkeletonContext(skeletonNativeContexts.splice(index, 1)[0]);
  }
};
const rememberSkeletonContext = (canvas, gl, renderer = null) => {
  const record = { canvas, gl, renderer, disposed: false };
  record.onLost = event => event.preventDefault();
  record.onRestored = () => {
    if (!skeletonDocumentParked) activeInstance?.syncSkeletonMotion?.();
  };
  canvas.addEventListener("webglcontextlost", record.onLost);
  canvas.addEventListener("webglcontextrestored", record.onRestored);
  skeletonNativeContexts.push(record);
  if (!skeletonDocumentEventsBound) {
    skeletonDocumentEventsBound = true;
    addEventListener("pagehide", event => {
      skeletonDocumentParked = true;
      if (event.persisted) {
        skeletonNativeContexts.forEach(record => record.renderer?.stop());
        activeInstance?.syncSkeletonMotion?.();
      }
      else skeletonNativeContexts.splice(0).forEach(disposeSkeletonContext);
    });
    addEventListener("pageshow", event => {
      if (!event.persisted) return;
      skeletonDocumentParked = false;
      activeInstance?.syncSkeletonMotion?.();
    });
  }
  return record;
};

function safeSessionStorage() {
  try { return globalThis.sessionStorage || null; }
  catch { return null; }
}

function normalizedHandoffUrl(value) {
  try {
    const url = new URL(value, globalThis.location?.href || "https://local.invalid/");
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

export function writeVisitSeedHandoff(storage, targetUrl, seed, { now = Date.now() } = {}) {
  const url = normalizedHandoffUrl(targetUrl);
  if (!storage || !url || typeof seed !== "string" || !seed || seed.length > 128 || !Number.isFinite(now)) return false;
  try {
    storage.setItem(VISIT_SEED_HANDOFF_KEY, JSON.stringify({
      version: 1,
      url,
      seed,
      expiresAt: now + VISIT_SEED_HANDOFF_TTL_MS,
    }));
    return true;
  } catch {
    return false;
  }
}

export function consumeVisitSeedHandoff(storage, {
  targetUrl,
  navigationType,
  now = Date.now(),
} = {}) {
  let serialized;
  try { serialized = storage?.getItem(VISIT_SEED_HANDOFF_KEY); }
  catch { return null; }
  try { storage?.removeItem(VISIT_SEED_HANDOFF_KEY); }
  catch { /* Value read is still validated and used for this initialization. */ }
  if (!serialized || navigationType !== "navigate" || !Number.isFinite(now)) return null;
  try {
    const handoff = JSON.parse(serialized);
    if (handoff?.version !== 1 || typeof handoff.seed !== "string" || !handoff.seed
      || handoff.seed.length > 128 || !Number.isFinite(handoff.expiresAt) || handoff.expiresAt < now
      || handoff.url !== normalizedHandoffUrl(targetUrl)) return null;
    return handoff.seed;
  } catch {
    return null;
  }
}

// Video duration as m:ss; the card and the detail player share this so both places show the same total duration.
const formatVideoTime = (seconds, round = Math.floor) => {
  const whole = Math.max(0, round(Number(seconds) || 0));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};
const finiteScroll = (value) => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);
const optionalFinite = (value) => value === null || value === undefined || value === ""
  ? null
  : Number.isFinite(Number(value)) ? Number(value) : null;
const nullableId = (value) => typeof value === "string" && value ? value : null;

// pages: the Projects page treats the path as a filter only when it matches a filter page; any other /projects/<slug>/ is a project detail page.
export function isQueryOnlyNavigation(previousHref, nextHref, pages = null) {
  let previous;
  let next;
  try {
    previous = new URL(previousHref);
    next = new URL(nextHref, previous);
  } catch {
    return false;
  }
  // Changing the filter now also changes the cluster, product path; within the same locale it is still in-place navigation.
  const [, previousLocale, previousBase] = previous.pathname.match(ADVERTISING_PATH_PATTERN) || [];
  const [, , nextBase, nextRest] = next.pathname.match(ADVERTISING_PATH_PATTERN) || [];
  // The ad page and the Projects page share a path pattern but are two different pages: a different root is not an in-place filter change.
  if (previousBase !== nextBase) return false;
  if (nextBase === "projects" && nextRest && !pages?.some((page) => `${page[previousLocale]}/` === nextRest)) return false;
  return previous.origin === next.origin
    && Boolean(previousLocale)
    && next.pathname.match(ADVERTISING_PATH_PATTERN)?.[1] === previousLocale
    && previous.pathname + previous.search !== next.pathname + next.search;
}

// ?category= accepts a cluster id, VI/EN slug, legacy group slug (taxonomy R4) or product id; returns the filter id or null.
const resolveFilter = (value, categories, cards) =>
  categories.find((entry) => [entry.slug, entry.slugVi, entry.slugEn, entry.legacySlug].includes(value))?.slug
  ?? (cards.some((card) => card.productIds?.includes(value)) ? value : null);

// Cluster, product pages (taxonomy R4) set the filter by path; pages is artifact.pages (vi, en are the path after the root).
const advertisingPathFilter = (pathname, pages) => {
  const [, locale, , rest] = pathname.match(ADVERTISING_PATH_PATTERN) || [];
  return rest ? pages.find((page) => `${page[locale]}/` === rest)?.filter ?? null : null;
};

// photos: false (Projects page, no detail view) ignores ?photo= and the card page path.
export function parseBrowseLocation(input, { cards = [], categories = [], pages = [], tagRegistry = [], photos = true } = {}) {
  const url = input instanceof URL ? input : new URL(input, "https://invalid.local");
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const tagIds = new Set(tagRegistry.map((entry) => entry.id));
  const requestedPhoto = photos ? detailId(url) : null;
  const photoRecord = cardById.get(requestedPhoto);
  const requestedCategory = url.searchParams.get("category");
  const category = photoRecord?.category || resolveFilter(requestedCategory, categories, cards)
    || advertisingPathFilter(url.pathname, pages) || "all";
  const requestedTag = url.searchParams.get("tag");
  return {
    category,
    photo: photoRecord?.id || null,
    tag: photoRecord && tagIds.has(requestedTag) ? requestedTag : null,
  };
}

export function serializeBrowseLocation(input, browse = {}, categories = [], pages = []) {
  const url = input instanceof URL ? new URL(input.href) : new URL(input, "https://invalid.local");
  for (const key of ["category", "photo", "tag"]) url.searchParams.delete(key);
  // A filter with a page (taxonomy R4) is written as a path using the locale's slug; a filter with no entry goes back to the root with ?category=.
  const locale = url.pathname.match(ADVERTISING_PATH_PATTERN)?.[1];
  // Detail writes the card page path, without category (media-seo R1).
  if (locale && browse.photo) {
    url.pathname = advertisingCardPath(locale, browse.photo);
    if (browse.tag) url.searchParams.set("tag", browse.tag);
    return url;
  }
  const page = locale && pages.find((entry) => entry.filter === (browse.category || "all"));
  if (locale) url.pathname = `/${locale}/${browseBase(url.pathname)}/${page?.[locale] ? `${page[locale]}/` : ""}`;
  // Cluster writes the slug for the URL's locale; product id is written as is.
  const entry = categories.find((item) => item.slug === browse.category);
  const category = entry?.[url.pathname.startsWith("/en/") ? "slugEn" : "slugVi"] ?? browse.category;
  if (category && category !== "all" && !page) url.searchParams.set("category", category);
  if (browse.photo) url.searchParams.set("photo", browse.photo);
  if (browse.tag) url.searchParams.set("tag", browse.tag);
  return url;
}

const compareRelatedSource = (left, right) =>
  left.sourceOrder - right.sourceOrder || left.id.localeCompare(right.id);

export function selectRelated({ cards = [], categoryOrder = [], heroId, tag = null, seed = null } = {}) {
  const hero = cards.find((card) => card.id === heroId);
  if (!hero) return [];
  // Score tiers prebuilt in the artifact (taxonomy R7); the remaining cards in the same cluster (score 0) are the last tier.
  const cardById = new Map(cards.map((card) => [card.id, card]));
  let tiers = (hero.related || []).map((ids) => ids.map((id) => cardById.get(id)).filter(Boolean));
  const scored = new Set(tiers.flat());
  tiers.push(cards.filter((card) => card.id !== hero.id && !scored.has(card) && card.category === hero.category)
    .sort(compareRelatedSource));
  if (tag) {
    const hasTag = (card) => Array.isArray(card.tagIds) && card.tagIds.includes(tag);
    const ranked = new Set(tiers.flat());
    const categoryRank = new Map(categoryOrder.map((category, index) => [category, index]));
    // Cards with tags outside the neighbors come after, in cluster order then sourceOrder as before.
    const rest = cards.filter((card) => card.id !== hero.id && !ranked.has(card) && hasTag(card)).sort((left, right) =>
      (categoryRank.get(left.category) ?? Number.MAX_SAFE_INTEGER)
        - (categoryRank.get(right.category) ?? Number.MAX_SAFE_INTEGER)
      || compareRelatedSource(left, right));
    tiers = [...tiers.map((tier) => tier.filter(hasTag)), rest];
  }
  // The seed shuffles only within a tier so the score order is preserved.
  return tiers.flatMap((tier, index) => seed === null
    ? tier
    : shuffleWithSeed(tier, seed, `related:${heroId}:${tag || "all"}:${index}`));
}

// Suggestion buttons come from the product (product group tag, taxonomy R7) and the image's tags.
const SUGGESTION_TAG_GROUPS = new Set(["product", "variant", "use"]);

export function selectSuggestions({ cards = [], heroId, activeTag = null, limit = 4, tagRegistry = [] } = {}) {
  const hero = cards.find((card) => card.id === heroId);
  if (!hero) return [];
  const tagById = new Map(tagRegistry.map((tag) => [tag.id, tag]));
  const validCards = cards.filter((card) => card.media?.src
    && Number(card.media.width) > 0
    && Number(card.media.height) > 0);
  // Group cards by tag in one pass: re-filtering all cards for each registry tag is the heavy part of the primary build task.
  const cardsByTag = new Map();
  for (const card of validCards) {
    for (const tagId of new Set(card.tagIds)) {
      if (!cardsByTag.has(tagId)) cardsByTag.set(tagId, []);
      cardsByTag.get(tagId).push(card);
    }
  }
  cardsByTag.forEach((list) => list.sort(compareRelatedSource));
  const matchingCards = (tagId) => cardsByTag.get(tagId) || [];
  const authored = (hero.tagIds || [])
    .map((tagId) => tagById.get(tagId))
    .filter((tag) => tag && SUGGESTION_TAG_GROUPS.has(tag.group) && matchingCards(tag.id).length > 0);
  const authoredIds = new Set(authored.map((tag) => tag.id));
  const contextual = tagRegistry
    .filter((tag) => !authoredIds.has(tag.id)
      && SUGGESTION_TAG_GROUPS.has(tag.group)
      && matchingCards(tag.id).some((card) => card.category === hero.category))
    .map((tag) => ({ tag, hash: fnv1a32(`${hero.id}:${tag.id}`) }))
    .sort((left, right) => left.hash - right.hash || left.tag.id.localeCompare(right.tag.id))
    .map(({ tag }) => tag);
  const active = tagById.get(activeTag);
  const suggestions = [...authored, ...contextual];
  const suggestionLimit = Math.max(0, Number(limit) || 0);
  if (active && matchingCards(active.id).length > 0 && suggestionLimit > 0) {
    const activeIndex = suggestions.findIndex((tag) => tag.id === active.id);
    if (activeIndex >= suggestionLimit) suggestions.splice(activeIndex, 1);
    if (activeIndex < 0 || activeIndex >= suggestionLimit) suggestions.splice(suggestionLimit - 1, 0, active);
  }
  // A legacy tag whose label matches a product keeps only one button: the first, unless the later tag is active.
  const byLabel = new Map();
  for (const tag of suggestions) {
    if (!byLabel.has(tag.labelVi) || tag.id === active?.id) byLabel.set(tag.labelVi, tag);
  }
  const uniqueSuggestions = [...byLabel.values()];
  const usedRepresentatives = new Set();
  return uniqueSuggestions.slice(0, suggestionLimit).map((tag) => {
    const matches = matchingCards(tag.id);
    const sameCategory = matches.filter((card) => card.category === hero.category);
    const canCrossCategory = authoredIds.has(tag.id) || tag.group === "use";
    const representative = sameCategory.find((card) => card.id !== hero.id && !usedRepresentatives.has(card.id))
      || (canCrossCategory && matches.find((card) => card.id !== hero.id && !usedRepresentatives.has(card.id)))
      || sameCategory.find((card) => card.id !== hero.id)
      || (canCrossCategory && matches.find((card) => card.id !== hero.id))
      || matches[0];
    usedRepresentatives.add(representative.id);
    return { card: representative, tag };
  });
}

export function compileRelatedLayout({
  cards = [], categoryOrder = [], columns: requestedColumns, datasetVersion, heroId,
  layoutViewportWidth, viewportHeight = 900, headerHeight = 0, safeTop = 0, safeBottom = 0,
  settings, measureDescriptionHeight, measureDescriptionMinimumHeight, minimumImageZoneHeight = 0,
  suggestionCard = null, tag = null, seed = null, primaryMedia = null,
  compile = compileMasonryLayout,
} = {}) {
  const hero = cards.find((card) => card.id === heroId);
  if (!hero) throw new Error("Related layout requires a known photo");
  const related = selectRelated({ cards, categoryOrder, heroId, tag, seed });
  const preferredColumns = Number.isInteger(requestedColumns) && requestedColumns >= 1 && requestedColumns <= 4
    ? requestedColumns : columnsForWidth(layoutViewportWidth);
  const columns = preferredColumns;
  const geometryOptions = {
    layoutViewportWidth, viewportHeight, columns, headerHeight, safeTop, safeBottom,
    imageWidth: primaryMedia?.width || hero.media.width,
    imageHeight: primaryMedia?.height || hero.media.height, minimumImageZoneHeight,
  };
  const basePrimary = computeDetailGeometry(geometryOptions);
  const primary = typeof measureDescriptionHeight === "function" || typeof measureDescriptionMinimumHeight === "function"
    ? computeDetailGeometry({ ...geometryOptions,
      descriptionHeight: typeof measureDescriptionHeight === "function" ? measureDescriptionHeight(basePrimary.descriptionWidth, basePrimary.mode) : 0,
      minimumDescriptionHeight: typeof measureDescriptionMinimumHeight === "function" ? measureDescriptionMinimumHeight(basePrimary.descriptionWidth, basePrimary.mode, basePrimary) : 0 })
    : basePrimary;
  const { gap } = primary;
  const hasSuggestion = suggestionCard?.kind === "suggestion" && primary.span === columns;
  const singlePhotoBesidePrimary = !hasSuggestion && related.length === 1 && primary.span < columns;
  const initialColumnBottoms = Array.from({ length: columns }, (_, index) => index < primary.span ? primary.height : 0);
  const solverCategory = categoryOrder[0];
  const solverSource = hasSuggestion ? [suggestionCard, ...related] : related;
  const solverCards = solverSource.map((card, index) => ({
    ...card, category: solverCategory, rank: index, sourceOrder: index,
  }));
  const terminalPhotoPeek = related.length && !singlePhotoBesidePrimary ? {
    primaryWidth: primary.width, primaryHeight: primary.height, primaryTop: primary.top,
    viewportHeight, safeBottom, belowPeek: primary.belowPeek, gap,
  } : undefined;
  const attempts = [];
  const canTryBelowPrimary = solverCards.length > 1 && primary.span < columns;
  const alongsideBudget = canTryBelowPrimary
    ? Math.ceil(MASONRY_SEARCH_BUDGET / 2)
    : MASONRY_SEARCH_BUDGET;
  const compileAttempt = (mode, seed, operationBudget, attemptCards = solverCards) => {
    try {
      const compiled = compile({
        cards: attemptCards, categoryOrder, columns, datasetVersion, filter: "all",
        initialColumnBottoms: seed, layoutViewportWidth, operationBudget,
        settings, terminalPhotoPeek, continuousDetail: true,
        presentationOrder: attemptCards.map(({ id }) => id),
        organicOrder: true,
      });
      attempts.push({ mode, columns, operations: compiled.diagnostics.operations, operationBudget });
      return compiled;
    } catch (error) {
      const operations = Number(error?.diagnostic?.operations);
      attempts.push({ mode, columns, operations: Number.isFinite(operations) ? operations : operationBudget, operationBudget });
      throw error;
    }
  };
  let layout;
  try {
    layout = compileAttempt("alongside", initialColumnBottoms, alongsideBudget);
  } catch (error) {
    const isSearchExhausted = error?.code === "search-exhausted";
    const spent = attempts.reduce((total, attempt) => total + attempt.operations, 0);
    const remainingBudget = MASONRY_SEARCH_BUDGET - spent;
    if (!isSearchExhausted || !canTryBelowPrimary || remainingBudget <= 0) {
      if (error?.diagnostic) {
        error.diagnostic = {
          ...error.diagnostic,
          operations: spent,
          budget: MASONRY_SEARCH_BUDGET,
          attempts,
        };
      }
      throw error;
    }
    const belowPrimaryInitialColumnBottoms = Array.from({ length: columns }, () => primary.height);
    try {
      layout = compileAttempt("below-primary", belowPrimaryInitialColumnBottoms, remainingBudget);
    } catch (fallbackError) {
      if (fallbackError?.diagnostic) {
        fallbackError.diagnostic = {
          ...fallbackError.diagnostic,
          operations: attempts.reduce((total, attempt) => total + attempt.operations, 0),
          budget: MASONRY_SEARCH_BUDGET,
          attempts,
        };
      }
      throw fallbackError;
    }
  }
  layout.diagnostics = {
    ...layout.diagnostics,
    preferredColumns,
    operations: attempts.reduce((total, attempt) => total + attempt.operations, 0),
    budget: MASONRY_SEARCH_BUDGET,
    attempts,
  };
  const original = new Map(solverSource.map((card) => [card.id, card]));
  layout.placements = layout.placements.map((placement) => ({ ...placement, card: original.get(placement.card.id) }));
  const suggestionPlacement = hasSuggestion
    ? layout.placements.find((placement) => placement.card.id === suggestionCard.id)
    : undefined;
  const photoPlacements = layout.placements.filter((placement) => placement !== suggestionPlacement);
  return {
    cards: related, layout, primary, suggestionPlacement, photoPlacements,
  };
}

const normalizeBrowseHistoryState = (value = {}) => ({
  category: nullableId(value.category) || "all",
  directPhotoRootId: nullableId(value.directPhotoRootId),
  photo: nullableId(value.photo),
  tag: nullableId(value.tag),
  seed: nullableId(value.seed),
  grid: {
    category: nullableId(value.grid?.category),
    anchorOffset: optionalFinite(value.grid?.anchorOffset),
    focusId: nullableId(value.grid?.focusId),
    mediaId: nullableId(value.grid?.mediaId),
    scrollY: finiteScroll(value.grid?.scrollY),
    viewportWidth: optionalFinite(value.grid?.viewportWidth),
  },
  detail: {
    anchorId: nullableId(value.detail?.anchorId),
    anchorOffset: optionalFinite(value.detail?.anchorOffset),
    mediaId: nullableId(value.detail?.mediaId),
    scrollY: finiteScroll(value.detail?.scrollY),
    viewportWidth: optionalFinite(value.detail?.viewportWidth),
  },
});

export function readBrowseHistoryState(browserState) {
  if (!browserState || typeof browserState !== "object") return null;
  const direct = browserState[BROWSE_STATE_KEY];
  if (direct) return normalizeBrowseHistoryState(direct);
  const index = Number(browserState.index);
  const stored = Number.isInteger(index)
    ? browserState.states?.[index]?.data?.[BROWSE_STATE_KEY]
    : null;
  return stored ? normalizeBrowseHistoryState(stored) : null;
}

export function createBrowseHistoryController({
  cards = [],
  categories = [],
  pages = [],
  tagRegistry = [],
  photos = true,
  barbaHistory,
  browserHistory,
  restoredHistoryState,
  historyFallback = false,
  softNavigation = false,
  getHref,
  getNavigationType = () => {
    try { return globalThis.performance?.getEntriesByType?.("navigation")?.[0]?.type || null; }
    catch { return null; }
  },
  createSeed = createBrowseSeed,
  sessionStorage = safeSessionStorage(),
  now = Date.now,
  getLogicalScroll = () => 0,
  onApply = () => {},
} = {}) {
  const schema = { cards, categories, pages, tagRegistry, photos };
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const nativeHistory = browserHistory || globalThis.history;
  const href = getHref || (() => globalThis.location.href);
  let currentHref = href();
  const initialLocation = parseBrowseLocation(currentHref, schema);
  const barbaHistoryReady = () => {
    const entry = barbaHistory?.current;
    return Boolean(entry && entry.data && typeof entry.data === "object");
  };
  const navigationType = getNavigationType?.();
  const initialHistory = readBrowseHistoryState(nativeHistory?.state)
    || (navigationType === "back_forward" || historyFallback
      ? readBrowseHistoryState(restoredHistoryState)
      : null);
  const matchesLocation = (stored, located) => Boolean(stored)
    && stored.category === located.category
    && stored.photo === located.photo
    && stored.tag === located.tag;
  const matchingInitialHistory = matchesLocation(initialHistory, initialLocation);
  const isReload = navigationType === "reload";
  const localeHandoffSeed = consumeVisitSeedHandoff(sessionStorage, {
    targetUrl: currentHref,
    navigationType,
    now: now(),
  });
  const preservedSeed = matchingInitialHistory
    && (softNavigation || historyFallback || navigationType !== "navigate")
    && initialHistory.seed;
  const initialSeed = isReload
    ? createSeed()
    : preservedSeed || localeHandoffSeed || createSeed();
  let current = normalizeBrowseHistoryState({
    ...(matchingInitialHistory ? initialHistory : {}),
    ...initialLocation,
    seed: initialSeed,
    directPhotoRootId: matchingInitialHistory
      ? initialHistory.directPhotoRootId
      : initialLocation.photo,
    grid: matchingInitialHistory ? initialHistory.grid : undefined,
    detail: matchingInitialHistory ? initialHistory.detail : undefined,
  });
  const canonicalInitialUrl = serializeBrowseLocation(currentHref, current, categories, pages);
  const suppliedInitialUrl = new URL(currentHref);
  if (`${canonicalInitialUrl.pathname}${canonicalInitialUrl.search}` !== `${suppliedInitialUrl.pathname}${suppliedInitialUrl.search}`) {
    if (barbaHistoryReady() && typeof barbaHistory.store === "function") {
      barbaHistory.store({ [BROWSE_STATE_KEY]: current });
    }
    nativeHistory?.replaceState?.({
      ...(nativeHistory.state || {}),
      [BROWSE_STATE_KEY]: current,
    }, "", `${canonicalInitialUrl.pathname}${canonicalInitialUrl.search}`);
    currentHref = canonicalInitialUrl.href;
  }

  const snapshotWithScroll = (browse = current) => normalizeBrowseHistoryState({
    ...browse,
    grid: browse.photo ? browse.grid : {
      ...browse.grid,
      scrollY: finiteScroll(getLogicalScroll()),
    },
    detail: {
      ...browse.detail,
      scrollY: browse.photo ? finiteScroll(getLogicalScroll()) : browse.detail.scrollY,
    },
  });
  const storeCurrent = () => {
    current = snapshotWithScroll();
    const stored = readBrowseHistoryState(barbaHistoryReady()
      ? barbaHistory.current.data : nativeHistory?.state);
    if (stored && JSON.stringify(stored) === JSON.stringify(current)) return;
    if (barbaHistoryReady() && typeof barbaHistory.store === "function") {
      barbaHistory.store({ [BROWSE_STATE_KEY]: current });
      return;
    }
    if (nativeHistory?.replaceState) {
      nativeHistory.replaceState({
        ...(nativeHistory.state || {}),
        [BROWSE_STATE_KEY]: current,
      }, "", href());
    }
  };
  const write = (action, browse, reason) => {
    const normalized = normalizeBrowseHistoryState(browse);
    const url = serializeBrowseLocation(href(), normalized, categories, pages);
    if (barbaHistoryReady() && typeof barbaHistory.add === "function") {
      barbaHistory.add(url.href, "barba", action, {
        [BROWSE_STATE_KEY]: normalized,
      });
    } else if (nativeHistory) {
      const method = action === "push" ? "pushState" : "replaceState";
      nativeHistory[method]?.({
        ...(nativeHistory.state || {}),
        [BROWSE_STATE_KEY]: normalized,
      }, "", `${url.pathname}${url.search}`);
    }
    current = normalized;
    currentHref = url.href;
    onApply({ action, browse: current, reason, url });
    return current;
  };

  return {
    captureDetail({ anchorId, anchorOffset, mediaId = current.detail.mediaId, scrollY = getLogicalScroll(), viewportWidth } = {}) {
      current = normalizeBrowseHistoryState({
        ...current,
        detail: { anchorId, anchorOffset, mediaId, scrollY, viewportWidth },
      });
      return this.current;
    },
    captureGrid({ anchorOffset, focusId, mediaId = current.grid.mediaId, scrollY = getLogicalScroll(), viewportWidth } = {}) {
      current = normalizeBrowseHistoryState({
        ...current,
        grid: { anchorOffset, focusId, mediaId, scrollY, viewportWidth },
      });
      return this.current;
    },
    get current() {
      return normalizeBrowseHistoryState(current);
    },
    get currentHref() {
      return currentHref;
    },
    // In-place locale change uses replaceState: synchronous so the next popState compares against the real /en/ URL.
    syncHref() {
      currentHref = href();
    },
    escapeDirectPhoto() {
      if (!current.directPhotoRootId || current.photo !== current.directPhotoRootId) return false;
      const card = cardById.get(current.photo);
      storeCurrent();
      write("replace", {
        ...current,
        category: card?.category || current.category,
        directPhotoRootId: null,
        photo: null,
        tag: null,
        grid: { ...current.grid, focusId: current.photo },
      }, "escape");
      return true;
    },
    persistCurrent() {
      storeCurrent();
      return this.current;
    },
    handlePopState(event, previousHref, nextHref = href()) {
      if (!isQueryOnlyNavigation(previousHref || currentHref, nextHref, pages)) return false;
      const fromHistory = readBrowseHistoryState(event?.state);
      const fromLocation = parseBrowseLocation(nextHref, schema);
      current = normalizeBrowseHistoryState({
        ...(matchesLocation(fromHistory, fromLocation) ? fromHistory : {}),
        ...fromLocation,
      });
      currentHref = new URL(nextHref).href;
      onApply({ action: "pop", browse: current, reason: "history", url: new URL(nextHref) });
      return true;
    },
    openPhoto(photoId, mediaId = null) {
      const card = cardById.get(photoId);
      if (!card) return false;
      if (current.photo === photoId) return this.current;
      if (!current.photo) {
        current = normalizeBrowseHistoryState({
          ...current,
          grid: {
            ...current.grid,
            category: current.category,
            focusId: photoId,
            scrollY: finiteScroll(getLogicalScroll()),
          },
        });
      }
      storeCurrent();
      return write("push", {
        ...current,
        category: card.category,
        photo: photoId,
        detail: {
          anchorId: null,
          anchorOffset: null,
          mediaId,
          scrollY: 0,
          viewportWidth: optionalFinite(globalThis.innerWidth),
        },
      }, "photo");
    },
    replaceCategory(category) {
      const valid = category === "all" || resolveFilter(category, categories, cards) === category;
      if (!valid) return false;
      storeCurrent();
      return write("replace", { ...current, category }, "category");
    },
    replaceTag(tag) {
      const valid = tag === null || tagRegistry.some((entry) => entry.id === tag);
      if (!valid) return false;
      storeCurrent();
      return write("replace", { ...current, tag }, "tag");
    },
    returnToGrid({ reason = "navbar" } = {}) {
      const viewedId = current.photo || current.grid.focusId;
      // From a photo, the navbar keeps the group selected on the source masonry; going straight to a photo or a group grid goes to All.
      const category = (current.photo && current.grid.category) || "all";
      // A related photo outside that group is not in the masonry, so it returns to the photo it was opened from.
      const focusId = matchesFilter(cardById.get(viewedId), category) ? viewedId : current.grid.focusId;
      const returningToOrigin = focusId === current.grid.focusId;
      storeCurrent();
      return write("push", {
        ...current,
        category,
        directPhotoRootId: null,
        photo: null,
        tag: null,
        grid: { ...current.grid, focusId, anchorOffset: returningToOrigin ? current.grid.anchorOffset : null },
      }, reason);
    },
  };
}

const loadArtifact = () => artifactPromise ||= (window.__TT_ADVERTISING_ARTIFACT__
  ? Promise.resolve(window.__TT_ADVERTISING_ARTIFACT__)
  : import("../advertising-products/catalog-artifact.mjs").then(({ ADVERTISING_CATALOG_ARTIFACT }) => ADVERTISING_CATALOG_ARTIFACT));

// Card description and related live separately in catalog-detail.mjs (the artifact keeps only the grid part). If the artifact already has all fields
// (tests inject a full artifact) skip; otherwise attach each missing field to the card by id (an edited CMS card already has
// a new description and only takes related).
let detailPromise;
const loadCardDetail = () => detailPromise ||= import("../advertising-products/catalog-detail.mjs").then(({ default: detail }) => detail);
const attachCardDetail = (cards) => {
  if (cards.every((card) => card.descriptionVi !== undefined)) return Promise.resolve();
  return loadCardDetail().then((detail) => {
    for (const card of cards) Object.entries(detail[card.id] ?? {}).forEach(([key, value]) => (card[key] ??= value));
  });
};

// Masonry layout cache (advertising-masonry R6): files are keyed by URL, so a preload before mount and every mount share
// one import. A load error, a wrong version or a 4 s timeout settles to null: the grid stacks one column. The import
// keeps running past the timeout; a late file still lands in layoutCacheSettled and the grid relayouts once.
const LAYOUT_CACHE_TIMEOUT_MS = 4000;
const layoutCacheLoads = new Map();
const layoutCacheImports = new Map();
const layoutCacheSettled = new Map();
const layoutCacheUrl = (template, band, filter = "") => template
  && template.replace("{band}", band.replace(":", "-")).replace("{filter}", filter);
// Import without a time limit; resolves to the cache or null.
const loadLayoutCache = (url) => {
  if (!url) return Promise.resolve(null);
  if (!layoutCacheLoads.has(url)) {
    layoutCacheLoads.set(url, import(url)
      .then((module) => (module.default?.version === MASONRY_LAYOUT_VERSION ? module.default : null))
      .catch(() => null)
      .then((cache) => {
        if (cache || !layoutCacheSettled.has(url)) layoutCacheSettled.set(url, cache);
        return cache;
      }));
  }
  return layoutCacheLoads.get(url);
};
// The same import, bounded by the timeout: what mount and filter changes wait for.
const importLayoutCache = (url) => {
  if (!url) return Promise.resolve(null);
  if (!layoutCacheImports.has(url)) {
    let timer;
    const timeout = new Promise((resolve) => { timer = setTimeout(resolve, LAYOUT_CACHE_TIMEOUT_MS, null); });
    layoutCacheImports.set(url, Promise.race([loadLayoutCache(url), timeout]).then((cache) => {
      clearTimeout(timer);
      if (!layoutCacheSettled.has(url)) layoutCacheSettled.set(url, cache);
      return cache;
    }));
  }
  return layoutCacheImports.get(url);
};
// Filter of the first grid paint: ?category= first, then the cluster or product page path, else all.
const initialFilter = ({ categories, cards, pages }) => resolveFilter(new URLSearchParams(location.search).get("category"), categories, cards)
  || advertisingPathFilter(location.pathname, pages || []) || "all";

let warmWorker;
// Called before mount (soft route, called when a link is clicked): load the artifact and start the layout Worker in parallel with the veil covering. hls.js
// loads right away when the artifact has video (video-delivery R3): waiting for the first video card means on slow 4G the library arrives after the card is
// already shown (measured on cloud 2026-10-25 over HTTP/2: 2/64 videos did not start in time).
export const preloadMasonry = () => {
  // Only related masonry compiles in the Worker now; a direct card page needs it at once, a grid page warms it later.
  if (detailId(new URL(location.href))) warmWorker ||= startLayoutWorker();
  loadArtifact().then((artifact) => {
    if (artifact.cards.some((card) => card.mediaItems?.some((item) => item.hlsSrc))) void loadHls();
    // Layout cache step 1: the one-filter file of this width band, in parallel with the vendor scripts. A direct card
    // page keeps the grid hidden, so its cache waits until the grid is needed.
    if (!detailId(new URL(location.href))) {
      void importLayoutCache(layoutCacheUrl(artifact.layoutCacheFilterUrl, bandKey(document.documentElement.clientWidth), initialFilter(artifact)));
    }
  }).catch(() => {});
};

const currentLocale = () => document.documentElement.lang === "en" ? "en" : "vi";

function surfaceLayoutStatus(grid, layout) {
  const diagnosticCode = layout?.diagnostics?.code;
  delete grid.dataset.masonryLayoutError;
  if (diagnosticCode === "needs-media") {
    grid.dataset.masonryLayoutStatus = diagnosticCode;
    grid.dataset.masonryLayoutDiagnostic = JSON.stringify(layout.diagnostics);
    return;
  }
  delete grid.dataset.masonryLayoutStatus;
  delete grid.dataset.masonryLayoutDiagnostic;
}

export function compileMasonryGeometry({ grid, options, compile = compileMasonryLayout }) {
  try {
    const layout = compile(options);
    const diagnosticCode = Reflect.get(layout?.diagnostics ?? {}, "code");
    if (diagnosticCode && diagnosticCode !== "needs-media") {
      throw Object.assign(new Error(`Advertising layout diagnostic: ${diagnosticCode}`), {
        code: diagnosticCode,
        diagnostic: layout.diagnostics,
      });
    }
    surfaceLayoutStatus(grid, layout);
    return layout;
  } catch (error) {
    const code = error?.code || error?.diagnostic?.code || "compile-failed";
    grid.dataset.masonryLayoutError = code;
    grid.dataset.masonryLayoutStatus = "failed";
    grid.dataset.masonryLayoutDiagnostic = JSON.stringify(error?.diagnostic || { code, message: error?.message });
    console.error("[advertising-products] layout compilation failed", error);
    throw error;
  }
}

// Source width of the primary blur background (blur filter 100px): detail smaller than the blur radius is no longer visible.
const BACKGROUND_SOURCE_WIDTH = 240;

function createPhotoMedia(record, locale, { suggestion = false, native = false } = {}) {
  // Keep the LazySizes preload/class lifecycle committed for virtualized cards.
  // Native loading alone has a different viewport threshold (design-system/motion.md).
  // Related uses native lazy (owner 2026-10-26): LazySizes' rAF checkElems takes 13-24ms in the related mount frame
  // on the A04s (decision phone-frame-budget).
  const image = document.createElement("img");
  image.className = suggestion
    ? "card-media__image media-hover-zoom"
    : `masonry-card__foreground card-media__image${native ? "" : " lazyload"}`;
  image.loading = "lazy";
  image.decoding = "async";
  image.width = record.media.width;
  image.height = record.media.height;
  const srcset = responsiveSrcset(record.media.src, record.media.width);
  if (suggestion) {
    if (srcset) {
      image.sizes = "auto, 50vw";
      image.srcset = srcset;
    }
    image.src = responsiveSource(record.media.src);
    image.alt = "";
  } else if (native) {
    // data-sizes lets sizeLazyImage write sizes from the solver; with sizes "auto", parseFloat gives NaN so the first write always runs.
    if (srcset) {
      image.dataset.sizes = "auto";
      image.sizes = "auto";
      image.srcset = srcset;
    }
    image.src = responsiveSource(record.media.src);
    image.alt = locale === "en" ? record.media.altEn : record.media.altVi;
  } else {
    if (srcset) {
      image.dataset.sizes = "auto";
      image.dataset.srcset = srcset;
    }
    image.dataset.src = responsiveSource(record.media.src);
    image.alt = locale === "en" ? record.media.altEn : record.media.altVi;
  }
  return image;
}

// Displayable media: image decoded, video with a frame or a decoded poster; an error also ends the wait so the strip does not hang.
function whenMediaReady(node) {
  if (node instanceof HTMLVideoElement) {
    if (node.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve();
    const poster = new Image();
    poster.src = node.poster;
    return Promise.race([poster.decode().catch(() => new Promise(() => {})), new Promise((resolve) => {
      node.addEventListener("loadeddata", resolve, { once: true });
      node.addEventListener("error", resolve, { once: true });
    })]);
  }
  if (!(node instanceof HTMLImageElement)) return Promise.resolve();
  node.loading = "eager";
  return node.decode().catch(() => {});
}

function syncJustViewedMarker(figure, locale, marked) {
  const media = figure.querySelector(".card-media");
  if (!media) return;
  let marker = media.querySelector("[data-masonry-just-viewed]");
  if (!marked) {
    marker?.remove();
    return;
  }
  if (!marker) {
    marker = document.createElement("span");
    marker.className = "card-media__just-viewed";
    marker.dataset.masonryJustViewed = "";
    media.append(marker);
  }
  marker.textContent = locale === "en" ? "Just viewed" : "Vừa xem";
}

// Fast scrolling (dragging the scrollbar, middle-mouse autoscroll) leaves video cards with only a poster: past 3000px/s a card crosses the whole
// overscan of one viewport before it can load the first segment, so attaching an HLS player then is wasted work. When scrolling slows, attach, one card
// per frame.
const FAST_SCROLL_PX_PER_S = 3000;
let fastScroll = false;
let videoSourceFrame = 0;
const deferredVideoSources = new Map();
const flushVideoSources = () => {
  videoSourceFrame = 0;
  const [[video, attach] = []] = deferredVideoSources;
  if (fastScroll || !video) return;
  deferredVideoSources.delete(video);
  if (video.isConnected) {
    // The schedule may have called play() before a source existed; attaching a source reruns the load algorithm and cancels that call, so play again.
    const resume = !video.paused;
    attach();
    if (resume && video.paused) void video.play().catch(() => {});
  }
  videoSourceFrame = requestAnimationFrame(flushVideoSources);
};
const setFastScroll = (value) => {
  fastScroll = value;
  if (!value && !videoSourceFrame) videoSourceFrame = requestAnimationFrame(flushVideoSources);
};
const setCardVideoSource = (video, attach) => {
  if (fastScroll) deferredVideoSources.set(video, attach);
  else attach();
};

function createPhotoCard(record, locale, onMediaLoaded, related, initialMediaId = null, onMediaChange = () => {},
  onPendingChange = () => {}) {
  const figure = document.createElement("figure");
  figure.className = "masonry-card";
  figure.dataset[related ? "masonryRelatedCard" : "masonryCard"] = record.id;
  figure.dataset.masonryCategory = record.category;
  const link = document.createElement("a");
  // Masonry and related cards do not zoom media on hover (owner 2026-10-18).
  link.className = "card-interactive";
  link.href = record.href?.[locale] ?? advertisingCardPath(locale, record.id);
  const media = document.createElement("div");
  media.className = "masonry-card__media masonry-card__media--natural card-media";
  // The image's dominant color fills the frame while the image has received no bytes; the blurred then sharp image covers it (progressive-loading R9).
  const color = cardColor(record);
  if (color) media.style.backgroundColor = color;
  const image = createPhotoMedia(record, locale, { native: related });
  media.append(image);
  link.append(media);
  figure.append(link);
  const items = record.mediaItems;
  const hasCarousel = Array.isArray(items) && items.length > 1;
  // Common marker of every masonry item (masonry-reuse step 3): head-inline, CMS overlay, tests read this marker instead of
  // listing each card type.
  figure.dataset.masonryItem = record.id;
  figure.dataset.masonryKind = hasCarousel ? "multi" : items?.[0]?.kind === "video" ? "video" : "photo";
  const hasSingletonOverride = Array.isArray(items) && items.length === 1
    && (items[0].kind !== "image" || items[0].src !== record.media.src);
  if (hasCarousel || hasSingletonOverride) {
    const english = locale === "en";
    const coverIndex = Math.max(0, items.findIndex((item) => item.id === record.coverMediaId));
    const selectedIndex = items.findIndex((item) => item.id === initialMediaId);
    const initialIndex = selectedIndex >= 0 ? selectedIndex : coverIndex;
    const useLegacyCover = items[coverIndex].kind === "image" && items[coverIndex].src === record.media.src;
    const layers = new Map(useLegacyCover ? [[items[coverIndex].id, image]] : []);
    let activeIndex = useLegacyCover ? coverIndex : -1;
    let lastReadyImageIndex = -1;
    const failedImages = new Set();
    const posterStatus = new Map();
    let suppressClickUntil = 0;
    const el = (tag, className, dataKey, attrs = {}) => {
      const node = document.createElement(tag);
      node.className = className;
      if (dataKey) node.dataset[dataKey] = "";
      Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, value));
      if (tag === "button") node.type = "button";
      return node;
    };
    media.classList.add("card-media--carousel");
    image.hidden = !useLegacyCover;
    if (useLegacyCover) {
      image.dataset.masonryMediaItem = items[coverIndex].id;
      figure.dataset.masonryActiveMediaId = items[coverIndex].id;
    }

    // The skeleton frame is the visible part; this node only holds the loading state for assistive technology.
    const loading = el("span", "card-media__loading sr-only", "masonryMediaLoading",
      { role: "status", "aria-label": english ? "Loading media" : "Đang tải media" });
    loading.hidden = true;
    media.append(loading);

    // Pill row at the bottom inside the media (owner 2026-11-10): dots or counter centred; cards show no video duration.
    const indicator = el("div", "card-media__indicator", "masonryMediaIndicator",
      { role: "group", "aria-label": english ? "Card media" : "Media của thẻ" });
    // 2-5 media use dots; from 6 media an i/N counter takes the dots' place (owner 2026-10-18); arrows on hover or a swipe
    // change media. Dots or the counter sit in one pill (owner 2026-10-26).
    const numericIndicator = items.length >= 6;
    const pill = indicator.appendChild(el("span", "card-media__pill"));
    const buttons = hasCarousel && !numericIndicator ? items.map((item, index) => {
      const button = el("button", "card-media__dot", "", { "aria-label": english
        ? `Show media ${index + 1} of ${items.length}`
        : `Xem media ${index + 1} trên ${items.length}` });
      button.dataset.masonryMediaSelect = item.id;
      pill.append(button);
      return button;
    }) : [];
    let countStatus;
    if (numericIndicator) {
      countStatus = el("span", "card-media__count", "masonryMediaCount",
        { role: "status", "aria-live": "polite", "aria-atomic": "true" });
      pill.append(countStatus);
    }
    // The hover arrows reuse the primary's media strip arrows (Pinterest pin), hidden on the first and last media.
    const hoverSteps = hasCarousel ? [-1, 1].map((step) => {
      const button = el("button", `detail-view__media-step detail-view__media-step--${step < 0 ? "prev" : "next"}`,
        "", { "aria-label": step < 0 ? english ? "Previous media" : "Media trước" : english ? "Next media" : "Media tiếp" });
      button.dataset.masonryMediaHoverStep = String(step);
      button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${step < 0 ? "M16 1 5 12l11 11" : "M8 1l11 11L8 23"}" /></svg>`;
      return button;
    }) : [];
    if (hasCarousel) figure.append(indicator, ...hoverSteps);

    const updateIndicator = (index) => {
      buttons.forEach((button, buttonIndex) => button.setAttribute("aria-current", String(buttonIndex === index)));
      hoverSteps.forEach((button) => {
        const target = index + Number(button.dataset.masonryMediaHoverStep);
        button.hidden = target < 0 || target >= items.length;
      });
      if (!numericIndicator) return;
      countStatus.textContent = `${index + 1}/${items.length}`;
      countStatus.setAttribute("aria-label", english
        ? `Media ${index + 1} of ${items.length}`
        : `Media ${index + 1} trên ${items.length}`);
    };

    const isReady = (layer) => layer instanceof HTMLVideoElement
      ? layer.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      : layer.complete && layer.naturalWidth > 0;
    const imageFallbackIndex = () => {
      const previous = layers.get(items[lastReadyImageIndex]?.id);
      if (previous instanceof HTMLImageElement && isReady(previous)) return lastReadyImageIndex;
      const cover = layers.get(items[coverIndex].id);
      if (cover instanceof HTMLImageElement && isReady(cover)) return coverIndex;
      return items.findIndex((item) => item.kind === "image" && !failedImages.has(item.id));
    };
    const updateLoading = () => {
      const layer = layers.get(items[activeIndex].id);
      const ready = Boolean(layer && isReady(layer));
      const failedImage = layer instanceof HTMLImageElement && failedImages.has(items[activeIndex].id);
      const loadedVideoPoster = layer instanceof HTMLVideoElement && posterStatus.get(items[activeIndex].id) === "loaded";
      // An active item with an error and setActive has no fallback left: shared error marker, hide the controls (media-card R5).
      const failed = !ready && (failedImage
        || (layer instanceof HTMLVideoElement && posterStatus.get(items[activeIndex].id) === "failed"));
      media.classList.toggle("is-media-error", failed);
      indicator.hidden = failed;
      if (failed) hoverSteps.forEach((node) => { node.hidden = true; });
      loading.setAttribute("aria-label", failed ? english ? "Couldn't load media" : "Không tải được media"
        : english ? "Loading media" : "Đang tải media");
      loading.hidden = ready || loadedVideoPoster;
      onPendingChange(figure);
      if (ready) {
        layer.classList.add("is-masonry-media-ready");
        if (layer instanceof HTMLImageElement) {
          lastReadyImageIndex = activeIndex;
          if (items[coverIndex].kind === "video" && figure.dataset.masonryMediaLoaded !== "true") {
            figure.dataset.masonryMediaLoaded = "true";
            onMediaLoaded(figure);
          }
        }
      }
    };
    image.addEventListener("load", updateLoading);
    image.addEventListener("lazyloaded", updateLoading);
    // The head script sets .is-media-error per failed img, including layers that are no longer active; the card decides from the active item.
    media.addEventListener("error", updateLoading, true);
    // Layers are created on demand: the active item, or the strip's neighbors on hover, swipe (media-card R3).
    const layerFor = (index) => {
      const item = items[index];
      let layer = layers.get(item.id);
      if (layer) return layer;
      layer = document.createElement(item.kind === "video" ? "video" : "img");
      layer.className = "masonry-card__foreground card-media__image";
      layer.dataset.masonryMediaItem = item.id;
      layer.width = item.width;
      layer.height = item.height;
      if (item.kind === "video") {
        layer.muted = true;
        layer.defaultMuted = true;
        layer.playsInline = true;
        // Early start (owner 2026-10-25): a card entering the DOM one viewport away from the screen loads and decodes ahead so that
        // on entering the screen only play remains; measured on PC: a video starting mid-scroll made an 82ms Commit.
        layer.preload = "auto";
        layer.poster = item.posterSrc;
        // A card shows at most ~440 CSS px so cap at the 480 tier (video-delivery R2) or the cardSrc file when there is no Media Source.
        setCardVideoSource(layer, () => setVideoSource(layer, item, { file: item.cardSrc || item.src, capWidth: 480 }));
        layer.setAttribute("aria-label", english ? item.altEn : item.altVi);
        layer.addEventListener("loadeddata", updateLoading);
        // When a video ends the card moves to the next video in the playlist in data order, and after the last it wraps to the first; images
        // are not in the playlist, and a single-video card loops itself (R4, owner 2026-10-18).
        layer.addEventListener("ended", () => {
          if (activeIndex !== index) return;
          const videos = items.flatMap((entry, position) => entry.kind === "video" ? [position] : []);
          const next = videos[(videos.indexOf(index) + 1) % videos.length];
          if (next === index) {
            layer.currentTime = 0;
            void layer.play().catch(() => {});
            return;
          }
          selectMedia(next);
        });
      } else {
        layer.loading = "lazy";
        layer.decoding = "async";
        layer.alt = english ? item.altEn : item.altVi;
        const srcset = responsiveSrcset(item.src, item.width);
        if (srcset) {
          layer.sizes = "auto, 50vw";
          layer.srcset = srcset;
        }
        layer.src = responsiveSource(item.src);
        layer.addEventListener("load", updateLoading);
      }
      layer.addEventListener("error", () => {
        if (item.kind === "image") {
          failedImages.add(item.id);
          const fallback = imageFallbackIndex();
          if (shownIndex() === index && fallback >= 0 && fallback !== index) {
            setActive(fallback);
            return;
          }
        }
        if (item.kind === "video" && !posterStatus.has(item.id)) {
          posterStatus.set(item.id, "loading");
          const probe = new Image();
          probe.addEventListener("load", () => {
            posterStatus.set(item.id, "loaded");
            if (shownIndex() === index) updateLoading();
          }, { once: true });
          probe.addEventListener("error", () => {
            posterStatus.set(item.id, "failed");
            if (shownIndex() !== index) return;
            const fallback = imageFallbackIndex();
            if (fallback >= 0 && fallback !== index) setActive(fallback);
            else updateLoading();
          }, { once: true });
          probe.src = item.posterSrc;
        }
        if (shownIndex() !== index) return;
        updateLoading();
      });
      layers.set(item.id, layer);
      layer.hidden = true;
      media.prepend(layer);
      return layer;
    };
    const setActive = (nextIndex) => {
      const index = Math.max(0, Math.min(items.length - 1, nextIndex));
      if (failedImages.has(items[index].id) || posterStatus.get(items[index].id) === "failed") {
        const fallback = imageFallbackIndex();
        if (fallback >= 0 && fallback !== index) return setActive(fallback);
      }
      if (index === activeIndex && layers.has(items[index].id)) return;
      const previous = layers.get(items[activeIndex]?.id);
      if (previous instanceof HTMLVideoElement) previous.pause();
      if (previous) previous.hidden = true;
      activeIndex = index;
      const item = items[index];
      const layer = layerFor(index);
      layer.hidden = false;
      figure.dataset.masonryActiveMediaId = item.id;
      updateIndicator(index);
      updateLoading();
    };
    figure.advertisingPendingMediaId = () => loading.hidden || media.classList.contains("is-media-error")
      ? null : items[activeIndex].id;
    // A video waits on its poster like an image (progressive-loading R9).
    figure.advertisingWaitColors = () => {
      const item = items[activeIndex];
      return waitColors(item.kind === "video" ? item.posterSrc : item.src, color);
    };
    figure.advertisingActiveVideo = () => {
      const layer = layers.get(items[activeIndex]?.id);
      return layer instanceof HTMLVideoElement && !layer.error ? layer : null;
    };
    figure.advertisingSetMediaId = (id, videoTime = 0) => {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return;
      setActive(index);
      const layer = layers.get(id);
      if (videoTime && layer instanceof HTMLVideoElement) layer.currentTime = videoTime;
    };
    // Continuous strip (owner 2026-10-19): old and new media are joined, only the position shifts, clipped at the canvas; the strip slides
    // only after the new media has decoded, so no background shows or fade runs mid-load. A manual drag sets the strip `offset` before release.
    // Each lane is { nodes, slot, index }; `stripTo` is the offset the strip is heading to; `pendingIndex` is a press waiting for its media
    // to decode while the strip keeps moving (media-card R3, interruptible strip).
    let lanes = [];
    let laneAnimations = [];
    let slideToken = 0;
    let stripTo = 0;
    let pendingIndex = null;
    // The media the card shows or is about to show: a pending press wins, so a late error of the media it left is stale.
    function shownIndex() { return pendingIndex ?? activeIndex; }
    const canvasWidth = () => media.clientWidth;
    const reducedMotion = () => env.reducedMotion.matches;
    const settleLanes = () => {
      slideToken += 1;
      laneAnimations.forEach((animation) => animation.cancel());
      laneAnimations = [];
      const active = layers.get(items[activeIndex]?.id);
      lanes.forEach(({ nodes: [layer] }) => {
        layer.classList.remove("card-media__image--lane", "card-media__image--beside");
        layer.style.translate = "";
        layer.hidden = layer !== active;
      });
      lanes = [];
    };
    const showLanes = (next, offset) => {
      settleLanes();
      lanes = next;
      lanes.forEach(({ nodes: [layer], slot }) => {
        if (isReady(layer)) layer.classList.add("is-masonry-media-ready");
        layer.hidden = false;
        layer.classList.add("card-media__image--lane");
        layer.classList.toggle("card-media__image--beside", slot !== 0);
      });
      placeStrip(lanes, canvasWidth(), offset);
    };
    const settleWhenDone = () => {
      const token = slideToken;
      laneAnimations.at(-1)?.finished.then(() => { if (token === slideToken) settleLanes(); }, () => {});
    };
    const runLanes = (from, to, timing) => {
      stripTo = to;
      laneAnimations = moveStrip(lanes, canvasWidth(), from, to, timing);
      settleWhenDone();
    };
    const preloadNeighbors = () => [activeIndex - 1, activeIndex + 1].forEach((index) => {
      if (!items[index]) return;
      const layer = layerFor(index);
      void whenMediaReady(layer).then(() => { if (isReady(layer)) layer.classList.add("is-masonry-media-ready"); });
    });
    const slideTo = (index, offset = 0, timing = PUSH_TIMING) => {
      pendingIndex = null;
      const from = activeIndex;
      const outgoing = layers.get(items[from]?.id);
      settleLanes();
      setActive(index);
      onMediaChange(figure.dataset.masonryActiveMediaId);
      // Video schedule recomputed: dots, arrows, swipe change media while the mouse is still in the card (media-card R4).
      figure.dispatchEvent(new Event("masonry-media-change", { bubbles: true }));
      const incoming = layers.get(items[activeIndex]?.id);
      if (!outgoing || !incoming || outgoing === incoming || reducedMotion()) return;
      const direction = activeIndex > from ? 1 : -1;
      showLanes([{ nodes: [outgoing], slot: 0, index: from }, { nodes: [incoming], slot: direction, index: activeIndex }], offset);
      stripTo = -direction * canvasWidth();
      const token = slideToken;
      void whenMediaReady(incoming).then(() => {
        // A newer press waiting for its media takes over this slide before it starts.
        if (token !== slideToken || pendingIndex !== null) return;
        if (isReady(incoming)) incoming.classList.add("is-masonry-media-ready");
        runLanes(offset, -direction * canvasWidth(), timing);
      });
    };
    // Rule 2 of the interruptible strip: only the lanes on screen stay (keepLanes), the others leave the strip like settleLanes does; a
    // target without a lane joins right after the outermost lane in the press direction.
    const steerLanes = (index, incoming) => {
      const width = canvasWidth();
      const current = lanes.find((entry) => entry.index === index);
      if (index === activeIndex && current && -current.slot * width === stripTo) return;
      const { kept, slot } = keepLanes(lanes, { index, direction: index > activeIndex ? 1 : -1, width, offset: stripOffset(lanes, width) });
      lanes.filter((entry) => !kept.includes(entry)).forEach(({ nodes: [layer] }) => {
        releaseNode(layer);
        layer.classList.remove("card-media__image--lane", "card-media__image--beside");
        layer.hidden = true;
      });
      let lane = kept.find((entry) => entry.index === index);
      if (!lane) {
        lane = { nodes: [incoming], slot, index };
        kept.push(lane);
        incoming.classList.add("card-media__image--lane", "card-media__image--beside");
        if (isReady(incoming)) incoming.classList.add("is-masonry-media-ready");
      }
      lanes = kept;
      const toPx = -lane.slot * width;
      // setActive pauses the outgoing video and hides its layer; the strip keeps every lane visible until it settles.
      setActive(index);
      if (activeIndex !== index) return settleLanes();
      lanes.forEach(({ nodes: [node] }) => { node.hidden = false; });
      figure.dispatchEvent(new Event("masonry-media-change", { bubbles: true }));
      const from = stripOffset(lanes, width);
      slideToken += 1;
      laneAnimations = retargetStrip(lanes, { toPx, width, sameDirection: Math.sign(stripTo - from) === Math.sign(toPx - from) });
      stripTo = toPx;
      settleWhenDone();
    };
    // Rule 5: the strip keeps heading to its current target until the new target has decoded; if it settled meanwhile, this is a fresh slide.
    // The dots, counter and active id change on the press (R3); the active layer changes when the strip steers.
    const retargetMedia = (nextIndex) => {
      const index = Math.max(0, Math.min(items.length - 1, nextIndex));
      const item = items[index];
      if (failedImages.has(item.id) || posterStatus.get(item.id) === "failed") return slideTo(index);
      pendingIndex = index;
      figure.dataset.masonryActiveMediaId = item.id;
      updateIndicator(index);
      onMediaChange(item.id);
      const incoming = layerFor(index);
      void whenMediaReady(incoming).then(() => {
        if (pendingIndex !== index) return;
        pendingIndex = null;
        // A strip that has not started moving takes the plain path, as before the strip was interruptible.
        if (laneAnimations.length) steerLanes(index, incoming);
        else slideTo(index);
      });
    };
    // A press while the strip is in flight retargets it; a swipe release (non-zero offset) or reduced motion takes the plain path.
    const selectMedia = (index, offset = 0, timing = PUSH_TIMING) => {
      if (lanes.length && !offset && !reducedMotion()) retargetMedia(index);
      else slideTo(index, offset, timing);
    };
    // Card removed mid-slide (virtualization): drop the pending press and every lane so no translate is left behind.
    figure.advertisingSettleStrip = () => {
      const pending = pendingIndex;
      pendingIndex = null;
      settleLanes();
      if (pending !== null) setActive(pending);
    };
    buttons.forEach((button, index) => button.addEventListener("click", () => selectMedia(index)));
    hoverSteps.forEach((button) => button.addEventListener("click",
      () => selectMedia((pendingIndex ?? activeIndex) + Number(button.dataset.masonryMediaHoverStep))));
    if (hasCarousel) {
      figure.addEventListener("pointerenter", preloadNeighbors);
      // Pointer events include touch; touch-action: pan-y leaves horizontal swipes to this handler.
      trackStripSwipe(link, {
        start: () => {
          suppressClickUntil = 0;
          // A drag drops a press still waiting for its media, so a snap-back is not followed by that press.
          if (pendingIndex !== null) {
            pendingIndex = null;
            figure.dataset.masonryActiveMediaId = items[activeIndex].id;
            updateIndicator(activeIndex);
          }
          preloadNeighbors();
        },
        width: canvasWidth,
        canStep: (step) => Boolean(items[activeIndex + step]),
        drag: (offset) => {
          if (reducedMotion()) return;
          showLanes([-1, 0, 1].filter((slot) => items[activeIndex + slot])
            .map((slot) => ({ nodes: [layerFor(activeIndex + slot)], slot, index: activeIndex + slot })), offset);
        },
        release: (step, offset) => {
          suppressClickUntil = performance.now() + 400;
          const width = canvasWidth();
          if (step) selectMedia(activeIndex + step, offset, releaseTiming(width - Math.abs(offset), width));
          else if (lanes.length) runLanes(offset, 0, releaseTiming(Math.abs(offset), width));
        },
      });
      link.addEventListener("click", (event) => {
        if (!event.detail || performance.now() >= suppressClickUntil) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClickUntil = 0;
      });
      updateIndicator(coverIndex);
    }
    if (useLegacyCover && initialIndex === coverIndex) updateLoading();
    else setActive(initialIndex);
    listenForMediaLoad(figure, layers.get(items[activeIndex].id), onMediaLoaded);
  } else {
    let failed = false;
    figure.advertisingPendingMediaId = () => failed || (image.complete && image.naturalWidth > 0)
      ? null : record.coverMediaId;
    figure.advertisingWaitColors = () => waitColors(record.media.src, color);
    image.addEventListener("error", () => {
      failed = true;
      onPendingChange(figure);
    });
    listenForMediaLoad(figure, image, onMediaLoaded);
  }
  syncJustViewedMarker(figure, locale, lastClosedPhotoId === record.id
    && (related || !document.body.classList.contains("is-detail")));
  // Card name inside the media, top left (media-card R3, owner 2026-11-10): CSS shows it only on real-mouse hover, never
  // on touch. The link takes its name from the figcaption via aria-labelledby (WCAG 2.5.3: the visible label is part of
  // the link name); the figcaption is aria-hidden so screen readers do not read it twice. One card can sit in the main
  // grid and in related at once, so related ids carry their own prefix.
  const title = figure.appendChild(document.createElement("figcaption"));
  title.className = "masonry-card__title";
  title.id = `${related ? "advertising-related-title" : "advertising-title"}-${record.id}`;
  title.setAttribute("aria-hidden", "true");
  title.textContent = locale === "en" ? record.titleEn : record.titleVi;
  figure.querySelector(".card-interactive")?.setAttribute("aria-labelledby", title.id);
  return figure;
}

function listenForMediaLoad(figure, media, onMediaLoaded) {
  const markLoaded = () => {
    if (figure.dataset.masonryMediaLoaded === "true") return;
    figure.dataset.masonryMediaLoaded = "true";
    onMediaLoaded(figure);
  };
  if (media instanceof HTMLVideoElement) {
    media.addEventListener("loadeddata", markLoaded, { once: true });
    if (media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) markLoaded();
  } else {
    media.addEventListener("lazyloaded", markLoaded, { once: true });
    media.addEventListener("load", markLoaded, { once: true });
    if (media.complete && media.naturalWidth > 0) markLoaded();
  }
}

function setPlacementStyle(node, placement) {
  node.style.left = `${placement.x}px`;
  node.style.top = `${placement.y}px`;
  node.style.transform = "none";
  node.style.width = `${placement.pixelWidth}px`;
  node.style.height = `${placement.pixelHeight}px`;
}

// A LazySizes image as wide as the card: write sizes from the solver so unveil does not read each image's offsetWidth (forced layout).
// An already-loaded image only raises sizes, never lowers.
function sizeLazyImage(node, placement) {
  const image = node.querySelector("img[data-sizes]");
  if (!image) return;
  const width = Math.ceil(placement.pixelWidth);
  image.dataset.sizes = `${width}px`;
  if (image.hasAttribute("sizes") && !(Number.parseFloat(image.sizes) >= width)) image.sizes = `${width}px`;
}

function sizeNode(node, placement, setSize) {
  node.style.width = `${placement.pixelWidth}px`;
  sizeLazyImage(node, placement);
  node.style.height = `${placement.pixelHeight}px`;
  node.style.setProperty("--masonry-media-height", `${placement.mediaPixelHeight}px`);
  node.dataset.masonrySpan = String(placement.width);
  node.setAttribute("role", "listitem");
  node.setAttribute("aria-posinset", String(placement.index + 1));
  node.setAttribute("aria-setsize", String(setSize));
}

export async function mountMasonry(container = document.querySelector('[data-barba-namespace="advertising-products"]'), { signal, scroll, softNavigation = false, artifact: providedArtifact, viewer = true } = {}) {
  if (!container || activeInstance?.container === container) return activeInstance?.cleanup || (() => {});
  activeInstance?.cleanup();
  const startupHistory = window.__ttBrowseStartupHistory;
  delete window.__ttBrowseStartupHistory;

  const grid = container.querySelector("[data-project-grid]");
  const filters = container.querySelector(".project-filters");
  if (!grid || !filters) return () => {};
  const ctaSkeleton = grid.querySelector("[data-masonry-cta-skeleton]");
  const gridCta = container.querySelector("[data-masonry-grid-cta]");
  const gridCtaHeading = gridCta?.querySelector("h2");
  const gridCtaCopy = gridCta?.querySelector(".detail-cta__copy");
  const siteFooter = container.querySelector("footer.site-footer");
  const gridSection = grid.closest(".masonry-section");
  const gridSectionStyleTarget = gridSection instanceof HTMLElement ? gridSection : null;
  const photoView = container.querySelector("[data-detail-view]");
  // On first detail show, Blink lazily parses the CSS declarations matching the photo view inside the card-tap task. Read computed
  // style at idle to parse ahead; first style cost drops about 3x (decision phone-frame-budget).
  if (photoView?.hidden) globalThis.requestIdleCallback?.(() => {
    if (photoView.hidden) for (const node of [photoView, ...photoView.querySelectorAll("*")]) getComputedStyle(node).color;
  });
  const photoCanvas = photoView?.querySelector("[data-detail-canvas]");
  const photoPrimary = photoView?.querySelector("[data-detail-primary]");
  const photoImage = photoView?.querySelector("[data-detail-image]");
  const photoVideo = photoView?.querySelector("[data-detail-video]");
  const photoAudioToggle = photoView?.querySelector("[data-detail-audio-toggle]");
  const photoPlayer = photoView?.querySelector("[data-detail-player]");
  const photoPlayButton = photoPlayer?.querySelector("[data-detail-play]");
  const photoVolumeGroup = photoPlayer?.querySelector("[data-detail-volume-group]");
  const photoVolume = photoPlayer?.querySelector("[data-detail-volume]");
  const photoProgress = photoPlayer?.querySelector("[data-detail-progress]");
  const photoTimeCurrent = photoPlayer?.querySelector("[data-detail-time-current]");
  const photoTimeTotal = photoPlayer?.querySelector("[data-detail-time-total]");
  const photoMediaSteps = [...(photoView?.querySelectorAll("[data-detail-media-step]") ?? [])];
  let photoMediaThumbs = null;
  const photoBackground = photoView?.querySelector("[data-detail-background]");
  // Glass always covers the cover backdrop; CSS shows it only when the photo is contain and leaves empty space around.
  // No blur step: the backdrop image carries its own blur (detail.css), so no seam between tiles can show.
  const photoGlass = createGlassSurface("even", 0);
  photoBackground?.after(photoGlass);
  const photoCategory = photoView?.querySelector("[data-detail-category]");
  const photoDescription = photoView?.querySelector("[data-detail-description]");
  const photoDescriptionBox = photoView?.querySelector("[data-detail-description-box]");
  const photoDescriptionScroll = photoView?.querySelector("[data-detail-description-scroll]");
  const photoDescriptionBar = photoView?.querySelector("[data-detail-description-bar]");
  const photoInfo = photoView?.querySelector("[data-detail-info]");
  const relatedGrid = photoView?.querySelector("[data-detail-related-grid]");
  const suggestionNode = photoView?.querySelector("[data-detail-suggestion]");
  const suggestionTitle = suggestionNode?.querySelector("[data-detail-related-title]");
  const photoExpand = photoView?.querySelector("[data-detail-expand]");
  const photoDialog = photoView?.querySelector("[data-detail-dialog]");
  const photoExpandedImage = photoView?.querySelector("[data-detail-expanded-image]");
  const photoViewport = photoView?.querySelector("[data-detail-viewport]");
  const photoClose = photoView?.querySelector("[data-detail-close]");
  const photoZoomIn = photoView?.querySelector("[data-detail-zoom-in]");
  const photoZoomOut = photoView?.querySelector("[data-detail-zoom-out]");
  const photoZoomStatus = photoView?.querySelector("[data-detail-zoom-status]");
  const photoViewerThumbs = photoDialog?.querySelector("[data-detail-viewer-thumbs]");

  // Related masonry compiles in a Worker: warmed by preloadMasonry on a card page, else when detail prefetches. Each take
  // opens the next one, so opening detail never waits on the Worker module (Slow 4G, cache off: 3.3 s without related).
  let idleWorker = warmWorker;
  warmWorker = undefined;
  const takeWorker = () => {
    const worker = idleWorker || startLayoutWorker();
    idleWorker = startLayoutWorker();
    return worker;
  };
  // The Projects page passes its own artifact (projects R2); the ad page loads catalog-artifact.mjs.
  const [artifact] = await Promise.all([providedArtifact ?? loadArtifact(), imageFormatReady()]);
  if (!artifact || typeof artifact !== "object") {
    const error = new Error("Advertising artifact must be an object");
    console.error("[advertising-products] artifact validation failed", error);
    throw error;
  }
  if (artifact.layoutAlgorithmVersion !== MASONRY_LAYOUT_VERSION) {
    const error = new Error(`Unsupported advertising layout algorithm: ${artifact.layoutAlgorithmVersion}`);
    console.error("[advertising-products] artifact validation failed", error);
    throw error;
  }
  let settings;
  try {
    settings = normalizeMasonrySettings(artifact.settings);
  } catch (error) {
    console.error("[advertising-products] artifact settings validation failed", error);
    throw error;
  }
  if (!Array.isArray(artifact.categories) || artifact.categories.length === 0) {
    const error = new Error("Advertising artifact categories must not be empty");
    console.error("[advertising-products] artifact validation failed", error);
    throw error;
  }
  const categories = artifact.categories;
  const pages = artifact.pages || [];
  const cards = artifact.cards;
  const categoryOrder = categories.map((entry) => entry?.slug);
  try {
    validateMasonryCards(cards, { categoryOrder, requireNonEmpty: true });
  } catch (error) {
    console.error("[advertising-products] artifact validation failed", error);
    throw error;
  }
  // Keep the reference of the generated artifact as the cache identity; do not clone, only attach the detail fields to the card.
  const artifactCacheIdentity = artifact;
  if (signal?.aborted) return () => {};
  if (typeof window.Masonry !== "function") {
    const error = new Error("Advertising catalog requires Masonry 4.2.2 before mount");
    console.error("[advertising-products] dependency readiness failed", error);
    throw error;
  }
  const controller = new AbortController();
  const ctaBatch = createCtaBatch({ skeleton: ctaSkeleton, cluster: gridCta, arcHome: gridSectionStyleTarget,
    signal: controller.signal, rearm: (root) => window.TruongThinhDetail?.rearmMotion?.(root) });
  const arcGlass = ctaBatch.arc;
  // Frame count and batch frame ratio come from the page attributes (skeleton R1), no code change.
  const skeletonBatchConfig = readSkeletonBatchConfig(ctaSkeleton?.dataset);
  // Detail (description, related) loads as soon as the first 8 card images finish (at most 6 s) so it does not compete for bandwidth with them; showPhoto waits if it is not done.
  let detailLoaded = false;
  let detailReady;
  const ensureDetail = () => detailReady ||= attachCardDetail(cards).catch(() => {}).then(() => { detailLoaded = true; });
  // Layout cache step 2 rides the same moment: the whole-band file, so a filter click no longer waits on the network.
  let bandLayoutsWanted = false;
  const loadBandLayouts = () => {
    if (bandLayoutsWanted) void importLayoutCache(layoutCacheUrl(artifact.layoutCacheBandUrl, bandKey(document.documentElement.clientWidth)));
  };
  const prefetchDetail = (tries = 0) => {
    if (controller.signal.aborted) return;
    const images = [...document.querySelectorAll("[data-masonry-card] img")].slice(0, 8);
    if (tries >= 24 || (images.length === 8 && images.every((image) => image.complete))) {
      if (viewer) {
        ensureDetail();
        idleWorker ||= startLayoutWorker();
      }
      bandLayoutsWanted = true;
      loadBandLayouts();
    } else setTimeout(prefetchDetail, 250, tries + 1);
  };
  if (viewer || artifact.layoutCacheBandUrl) prefetchDetail();
  // Keep the CSS measurements ready for when the shell script cannot start.
  if (!document.querySelector(".site-viewport-metrics")) {
    const probe = document.createElement("div");
    probe.className = "site-viewport-metrics";
    probe.setAttribute("aria-hidden", "true");
    document.body.append(probe);
  }
  const getLayoutViewportHeight = () => scroll?.getViewportMetrics?.().layoutHeight
    || document.querySelector(".site-viewport-metrics")?.getBoundingClientRect().height
    || innerHeight;
  // Same formula as getViewportMetrics().visible but without reading the probe. Reading visualViewport still forces style recalc,
  // so keep the measurement until the viewport changes (decision phone-frame-budget).
  let visibleViewport = null;
  const getVisibleViewport = () => visibleViewport ??= {
    width: window.visualViewport?.width ?? innerWidth,
    height: window.visualViewport?.height ?? innerHeight,
    left: window.visualViewport?.offsetLeft ?? 0,
    top: window.visualViewport?.offsetTop ?? 0,
  };
  const resetVisibleViewport = () => { visibleViewport = null; };
  window.addEventListener("resize", resetVisibleViewport, { signal: controller.signal });
  window.visualViewport?.addEventListener("resize", resetVisibleViewport, { signal: controller.signal });
  window.visualViewport?.addEventListener("scroll", resetVisibleViewport, { signal: controller.signal });
  let locale = currentLocale();
  const reducedMotionQuery = env.reducedMotion;
  let reduced = reducedMotionQuery.matches;
  const geometries = new Map();
  let geometryPending = false;
  const retainedPhotoIds = new Set();
  // Main masonry yard and related in detail: the same state built from the scroll window, build budget, temp cards, LRU wait queue
  // (advertising-masonry R7, masonry-reuse step 7).
  const gridHost = createMasonryHost(grid, {
    create: ({ card: { id }, card }) => createPhotoCard(card, locale, handleMediaLoaded, false,
      gridHost.mediaById.get(id) || (browseHistory.current.grid.focusId === id ? browseHistory.current.grid.mediaId : null),
      (mediaId) => gridHost.mediaById.set(id, mediaId), syncCardSkeleton),
    attach: (node) => observeMediaCard(node),
    detach: (id, node, queue) => detachCard(id, node, queue),
    color: cardColor,
    waitColors: (card) => skeletonPhone() ? waitColors(card.media.src, cardColor(card)) : null,
  });
  const relatedHost = createMasonryHost(relatedGrid, {
    create: ({ card: { id }, card }) => createPhotoCard(card, locale, handleMediaLoaded, true,
      relatedHost.mediaById.get(id), (mediaId) => relatedHost.mediaById.set(id, mediaId), syncCardSkeleton),
    attach: (node, placement) => {
      observeMediaCard(node);
      setPlacementStyle(node, placement);
      node.dataset.masonryRelatedItem = placement.card.id;
    },
    detach: (id, node, queue) => detachCard(id, node, queue),
    color: (card) => mediaColors(card.media.src)?.[0],
    waitColors: (card) => skeletonPhone() ? waitColors(card.media.src, mediaColors(card.media.src)?.[0]) : null,
    masonry: { itemSelector: "[data-masonry-related-item]", getId: (node) => node.dataset.masonryRelatedItem },
  });
  let relatedLayout;
  let activePhotoId = null;
  let activePrimaryMediaId = null;
  // Opening detail from a card playing video: detail continues from the exact second (owner 2026-10-18); renderPhoto uses it once.
  let videoHandoff = null;
  let primaryFailed = false;
  let activePrimaryItem = null;
  let detailRenderGeneration = 0;
  let relatedLayoutKey = "";
  // Tag, window size or related font size changed: drop the wait queue and the next build pass does not bring old cards back (R7).
  let relatedQueueScope = "";
  let relatedQueueStale = false;
  let relatedCompile = compileMasonryLayout;
  // When opening a photo (showPhoto), one task per phase: "primary" lays out the primary without related; "warm"
  // runs the solver on a few cards so the full run does not pay for cold code; "related" runs the
  // full solver, keeps the primary geometry and leaves card mounting to the next task.
  let directEntryPhase = "";
  let relatedMeasuredGeometry = null;
  let suggestionSlots = [];
  let suggestionSlotHeroId = "";
  let stopSuggestionSlides;
  let descriptionThumbHeight = 0;
  const photoViewer = createDetailViewer({
    getVisibleViewport,
    closeButton: photoClose,
    dialog: photoDialog,
    expandButton: photoExpand,
    expandedImage: photoExpandedImage,
    heroImage: photoImage,
    scroll,
    signal: controller.signal,
    viewport: photoViewport,
    zoomInButton: photoZoomIn,
    zoomOutButton: photoZoomOut,
    zoomStatus: photoZoomStatus,
    video: photoVideo,
    player: photoPlayer,
    videoHost: photoDialog?.querySelector("[data-detail-video-host]"),
    onOpen: () => {
      photoView.dataset.detailExpanded = "";
      drawLiveBackground();
    },
  });
  // Media keys loaded once: a remounted card swaps them in without Glass when its cached copy arrives.
  const loadedMediaKeys = new Set();
  const visibleMediaCards = new Set();
  const mediaKey = (node) => node.dataset.masonryRelatedCard
    ? `related:${node.dataset.masonryRelatedCard}` : `grid:${node.dataset.masonryCard}`;
  const mediaLayers = (node) => [...node.querySelectorAll(".masonry-card__foreground")];
  // Show immediately at the final opacity, bypassing the CSS opacity transition (R3): read the style to pin `none` before restoring.
  // All media shown in the same task share one forced style (read opacity once for the whole batch) instead of one per media.
  const mediaToShow = [];
  const removeGhost = (node) => {
    const ghost = node.masonryGhost;
    if (!ghost) return;
    node.masonryGhost = null;
    ghost.remove();
  };
  const flushShownMedia = () => {
    const batch = mediaToShow.splice(0);
    if (!batch.length) return;
    getComputedStyle(batch[0].media).opacity;
    const fading = new Map();
    for (const { node, media } of batch) {
      media.style.removeProperty("transition");
      // The real card replaces the temp card: the image fades in from the temp card's dominant color; with reduced motion it shows directly.
      if (node.masonryGhost && !reduced) {
        const fades = fading.get(node) || [];
        fades.push(media.animate([{ opacity: 0 }, { opacity: 1 }], { duration: GHOST_FADE_MS, easing: GHOST_FADE_EASING }).finished);
        fading.set(node, fades);
      }
    }
    for (const { node } of batch) {
      if (!node.masonryGhost) continue;
      const fades = fading.get(node);
      if (fades) Promise.all(fades).then(() => removeGhost(node), () => removeGhost(node));
      else removeGhost(node);
    }
  };
  const showMedia = (node) => {
    const queued = mediaToShow.length > 0;
    mediaLayers(node).forEach((media) => {
      media.style.setProperty("transition", "none", "important");
      media.classList.add("is-masonry-media-ready");
      mediaToShow.push({ node, media });
    });
    if (!queued && mediaToShow.length) queueMicrotask(flushShownMedia);
  };
  const handleMediaLoaded = (node) => {
    loadedMediaKeys.add(mediaKey(node));
    if (cardSkeletons.has(node)) revealCard(node);
    else showMedia(node);
  };
  // Reduced motion still observes: loading skeleton shows only on cards in view.
  const mediaObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const node = entry.target;
      const id = mediaKey(node);
      if (!id) return;
      // A re-attached card with already-loaded media: unveil immediately from the first entry, without waiting for LazySizes' throttle tick, so the cached copy is
      // ready before the card enters the viewport (loading-glass R3).
      if (loadedMediaKeys.has(id)) {
        mediaLayers(node).forEach((media) => media.classList.contains("lazyload") && window.lazySizes?.loader?.unveil(media));
      }
      if (entry.intersectionRatio === 0) {
        // A card moved in the DOM (restoreCanonicalDomOrder) reports an empty entry with no rootBounds, then the real entry
        // right after; dropping the skeleton here makes it flash again from opacity 0.
        if (!entry.rootBounds && node.isConnected) return;
        visibleMediaCards.delete(id);
        // The skeleton's color is tied to the media id, so dropping it here still keeps the color for the next entry.
        dropCardSkeleton(node);
        return;
      }
      if (!entry.isIntersecting) return;
      visibleMediaCards.add(id);
      scheduleVideoSoon();
      attachCardSkeleton(node);
    });
  }, { threshold: 0 });
  const observeMediaCard = (node) => mediaObserver.observe(node);
  const releaseMediaCard = (node) => {
    const id = mediaKey(node);
    node.advertisingSettleStrip?.();
    node.querySelectorAll("video").forEach(releaseVideoSource);
    // An img detached from the DOM keeps loading: dragging the scrollbar with no cache piles hundreds of requests from removed cards ahead of the visible
    // image. Drop the source so the browser cancels the request.
    node.querySelectorAll("img").forEach((image) => {
      if (image.complete) return;
      image.removeAttribute("srcset");
      image.removeAttribute("src");
    });
    mediaObserver.unobserve(node);
    visibleMediaCards.delete(id);
    dropCardSkeleton(node);
  };
  // Removing a card from the DOM: a card that has shown its image (no longer waiting, no error) goes into the wait queue so re-attaching is instant; other cards
  // are cancelled as before (a half-loaded image drops its source). Video cards do not enter the wait queue: releaseVideoSource drops the source and the source is only re-attached
  // in createPhotoCard; re-attaching the old node would leave only the poster.
  // queue null: the wait queue was just dropped (filter, tag, layout change), so cards removed in that pass do not re-enter either (masonry R7).
  // A card with an img not yet loaded (neighbor layer from preloadNeighbors) does not enter the wait queue: releaseMediaCard drops that img's source,
  // and on re-attach layerFor reuses the sourceless layer and the card gets stuck waiting.
  const detachCard = (id, node, queue) => {
    const keepable = queue && !node.advertisingPendingMediaId?.() && !node.querySelector(".is-media-error, video")
      && mediaLayers(node).some((media) => media.classList.contains("is-masonry-media-ready"))
      && [...node.querySelectorAll("img")].every((image) => image.complete);
    releaseMediaCard(node);
    node.remove();
    if (keepable) queue.put(id, node);
  };
  // A product filter (id "<cluster>/<slug>") still marks its cluster on the rail.
  const isRailCurrent = (slug) => filter === slug || filter.startsWith(`${slug}/`);
  // Two-tier rail (taxonomy R3): the selected cluster shows a chip row; the product entry matching the filter has aria-current.
  const chipGroups = [...container.querySelectorAll("[data-masonry-chips]")];
  // Elements shown after a rail click reuse the Advertising entrance rhythm ([Motion](design-system/motion.md)); reduced motion goes straight to the final state.
  const enterFrom = (nodes, transform, { duration, easing, delay = 0, stagger = 0 }) => {
    if (reducedMotionQuery.matches) return;
    nodes.forEach((node, index) => {
      node.getAnimations().forEach((animation) => animation.cancel());
      node.animate([{ opacity: 0, transform }, { opacity: 1, transform: "none" }], {
        duration, easing, delay: delay + index * stagger, fill: "backwards",
      });
    });
  };
  const syncRail = ({ animate = false } = {}) => {
    filters.querySelectorAll("[data-masonry-filter]").forEach((item) => {
      item.setAttribute("aria-current", String(isRailCurrent(item.dataset.masonryFilter)));
    });
    container.querySelectorAll("[data-masonry-product]").forEach((item) => {
      item.setAttribute("aria-current", String(item.dataset.masonryProduct === filter));
    });
    chipGroups.forEach((group) => {
      const wasHidden = group.hidden;
      group.hidden = !isRailCurrent(group.dataset.masonryChips);
      // Chips appear at the same rhythm as the filter rail on page load (y 20, 1s expo.out, stagger 0.15s), after the 0.3s kicker; changing product within a cluster does not rerun it.
      // For long rows cap the total stagger delay at 0.6s so the last chip does not appear late.
      if (animate && wasHidden && !group.hidden) {
        const chips = [...group.querySelectorAll(".rail-chip")];
        enterFrom(chips, "translate3d(0, 20px, 0)", { duration: 1000, easing: EASE.expoOut, delay: 300, stagger: Math.min(150, 600 / Math.max(1, chips.length - 1)) });
      }
      // The chip row scrolls horizontally on phones: bring the selected chip into the frame, horizontal axis only so the page is not dragged.
      const current = group.hidden ? null : group.querySelector('[aria-current="true"]');
      if (current) group.scrollLeft += current.getBoundingClientRect().left - group.getBoundingClientRect().left - parseFloat(getComputedStyle(group).paddingLeft);
    });
  };
  let filter = initialFilter({ categories, cards, pages });
  let currentVisualY = window.scrollY;
  let usesVisualScroll = false;
  let geometry;
  let scrollFrame = 0;
  let resizeFrame = 0;
  let lastResizeAt = -Infinity;
  let motionUntil = 0;
  let lastScrollAt = 0;
  let scrollActive = false;
  // Both native scroll and Locomotive's site:scroll (PC scrolls with a smooth scroller, window.scrollY stays still); count only when the position changes,
  // because page load also fires a scroll event at an unchanged y.
  let lastScrollEventAt = -Infinity;
  const trackScroll = (readY) => {
    let last = 0;
    return (event) => {
      const y = readY(event);
      if (Math.abs(y - last) > 1) lastScrollEventAt = performance.now();
      last = y;
    };
  };
  const enteringWhileScrolling = () => performance.now() - lastScrollEventAt < SKELETON_SCROLL_ENTRY_MS;
  // A busy fling makes the gap between two scroll events exceed 120ms, so timing alone sees "stopped" mid-fling;
  // when scrollend exists wait for it, then still hold 120ms as before. Scroll caused by layout or code (opening detail jumps to y=0)
  // does not fire scrollend, so with no scroll event past PHONE_SCROLL_SETTLE_MS treat it as stopped.
  const phoneScrollWait = () => scrollActive && performance.now() - lastScrollAt < PHONE_SCROLL_SETTLE_MS
    ? PHONE_REVEAL_SCROLL_IDLE_MS : lastScrollAt + PHONE_REVEAL_SCROLL_IDLE_MS - performance.now();
  let pendingScroll = false;
  // First grid build on a direct load (advertising-masonry R7): only on-screen cards and the first 8 build in that task; the CTA batch
  // waits for its own task (`ctaDeferred`), so no task of the first build blocks input over 50ms on the A04s.
  let firstBuild = false;
  let ctaDeferred = false;
  let lastMeasuredGridWidth = 0;
  let lastLayoutViewportWidth = 0;
  let lastGeometrySignature = "";
  // The geometry that positions reflects; whether the DOM order still matches the placement order.
  let positionsGeometry = null;
  let domOrderDirty = true;
  let announcedPageHeight = -1;
  let announcedGridHeight = -1;
  let ctaGeometryHash = "";
  let ctaBottom = 0;
  let lastCtaViewportHeight = 0;
  let ctaCopyKey = "";
  let ctaCopyMetrics = { baseline: 0, below: 0 };
  // A zero-size inline box at the end of the heading sits on the baseline of the last line.
  const ctaBaselineProbe = document.createElement("span");
  ctaBaselineProbe.style.cssText = "display: inline-block; width: 0; height: 0;";
  const measureCtaCopy = () => {
    const last = [...gridCtaHeading.querySelectorAll("*")]
      .filter((node) => !node.children.length && node.textContent.trim()).at(-1);
    (last || gridCtaHeading).append(ctaBaselineProbe);
    const line = last?.closest(".motion-line");
    // Measure the revealed state: remove the line's current reveal offset, then place it at 0.1em like detail.js.
    const reveal = line ? new DOMMatrixReadOnly(getComputedStyle(line).transform).m42
      + 0.1 * Number.parseFloat(getComputedStyle(gridCtaHeading).fontSize) : 0;
    const copyRect = gridCtaCopy.getBoundingClientRect();
    const baseline = ctaBaselineProbe.getBoundingClientRect().top - copyRect.top - reveal;
    ctaBaselineProbe.remove();
    return { baseline, below: copyRect.height - baseline };
  };
  // Shrink the heading just enough that the space below the last baseline is sufficient, no smaller than 1.3rem.
  const fitGridCtaHeading = (room) => {
    gridCtaHeading.style.removeProperty("font-size");
    const css = measureCtaCopy();
    if (css.below <= room) return css;
    const cssSize = Number.parseFloat(getComputedStyle(gridCtaHeading).fontSize);
    const minSize = 1.3 * Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    gridCtaHeading.style.fontSize = `${minSize}px`;
    const floor = measureCtaCopy();
    if (floor.below >= room || cssSize <= minSize) return floor;
    // The space below the baseline grows linearly with font size.
    gridCtaHeading.style.fontSize = `${minSize + (cssSize - minSize) * (room - floor.below) / (css.below - floor.below)}px`;
    return measureCtaCopy();
  };
  // The copy part is 10% slower than the page and returns to offset 0 at the scroll limit.
  const syncCtaParallax = () => {
    if (!gridCtaCopy || !siteFooter) return;
    // A CTA only as tall as its copy (text 200%, landscape) has no room above, and its clip would cut the heading.
    const offset = reduced || (activePhotoId && !ctaInDetail()) ? 0
      : Math.max((siteFooter.getBoundingClientRect().bottom - innerHeight) * -0.1, -gridCtaCopy.offsetTop);
    gridCtaCopy.style.transform = offset ? `translate3d(0, ${offset.toFixed(2)}px, 0)` : "";
  };
  let hasLaidOut = false;

  const updateLocalizedContent = () => {
    const entries = [
      { slug: "all", titleEn: "All", titleVi: "Tất cả" },
      ...categories,
    ];
    /** @type {Map<string, HTMLAnchorElement>} */
    const existing = new Map(
      [...filters.querySelectorAll("[data-masonry-filter]")]
        .filter((control) => control instanceof HTMLAnchorElement)
        .map((control) => [control.dataset.masonryFilter, control]),
    );
    entries.forEach((entry) => {
      let control = existing.get(entry.slug);
      if (!control) {
        control = document.createElement("a");
        control.className = "project-filter";
        control.dataset.masonryFilter = entry.slug;
        filters.append(control);
      }
      control.href = `/${locale}/${browseBase(location.pathname)}/${entry.slug === "all" ? "" : `${locale === "en" ? entry.slugEn : entry.slugVi}/`}`;
      control.dataset.en = entry.titleEn;
      control.textContent = locale === "en" ? entry.titleEn : entry.titleVi;
    });
    syncRail();
    for (const cardMap of [gridHost.rendered, relatedHost.rendered]) {
      cardMap.forEach((node, id) => {
        const record = cards.find((card) => card.id === id);
        if (!record) return;
        const english = locale === "en";
        const link = node.querySelector("a");
        const image = node.querySelector(".masonry-card__foreground");
        const caption = node.querySelector("figcaption");
        if (link) link.href = record.href?.[locale] ?? advertisingCardPath(locale, record.id);
        if (image) image.alt = english ? record.media.altEn : record.media.altVi;
        if (caption) caption.textContent = english ? record.titleEn : record.titleVi;
        syncJustViewedMarker(node, locale, lastClosedPhotoId === id
          && (cardMap === relatedHost.rendered ? Boolean(activePhotoId) : !activePhotoId));
      });
    }
  };
  updateLocalizedContent();
  ctaSkeleton?.replaceChildren();
  grid.replaceChildren(...(ctaSkeleton ? [ctaSkeleton] : []));
  grid.classList.add("masonry-grid");
  grid.setAttribute("role", "list");
  relatedGrid?.setAttribute("role", "list");

  // Main grid geometry replays a precomputed layout (advertising-masonry R6): no search on the visitor machine. Lookup
  // order: layouts embedded in the artifact (Projects, CMS), the whole-band file, the one-filter file.
  const cachedLayoutEntry = (band, targetFilter) => artifact.layouts?.[band]?.filters?.[targetFilter]
    ?? layoutCacheSettled.get(layoutCacheUrl(artifact.layoutCacheBandUrl, band))?.filters?.[targetFilter]
    ?? layoutCacheSettled.get(layoutCacheUrl(artifact.layoutCacheFilterUrl, band, targetFilter))?.filters?.[targetFilter];
  // Promise while the cache for this width and filter is still loading, null once it is ready, failed or absent.
  const layoutCachePending = (targetFilter) => {
    const band = bandKey(document.documentElement.clientWidth);
    const url = layoutCacheUrl(artifact.layoutCacheFilterUrl, band, targetFilter);
    if (!url || cachedLayoutEntry(band, targetFilter) || layoutCacheSettled.has(url)) return null;
    return importLayoutCache(url);
  };
  // Filter clicks and band changes keep the current layout until the cache arrives, then place cards once (no stack
  // layout in between). The latest request wins.
  let layoutWait = 0;
  // The clicked chip shows its selected look (aria-busy) while the click waits, so a slow cache never reads as a dead click.
  let busyControl = null;
  const cancelLayoutWait = () => {
    layoutWait += 1;
    busyControl?.removeAttribute("aria-busy");
    busyControl = null;
  };
  const whenLayoutReady = (targetFilter, run, control) => {
    cancelLayoutWait();
    const ticket = layoutWait;
    const pending = layoutCachePending(targetFilter);
    if (!pending) return run();
    busyControl = control ?? null;
    busyControl?.setAttribute("aria-busy", "true");
    void pending.then(() => {
      if (ticket === layoutWait && !controller.signal.aborted) run();
    });
  };
  // A stack layout drawn while the cache was missing is replaced once that cache lands (late file, Back/Forward in the
  // first seconds, a band change during a pending click). Only while filter and band are unchanged.
  const relayoutWhenCached = (targetFilter, band) => {
    const urls = [layoutCacheUrl(artifact.layoutCacheFilterUrl, band, targetFilter)];
    if (layoutCacheLoads.has(layoutCacheUrl(artifact.layoutCacheBandUrl, band))) urls.push(layoutCacheUrl(artifact.layoutCacheBandUrl, band));
    for (const url of urls) {
      void loadLayoutCache(url).then(() => {
        // A card is open: the grid is hidden, so closing the card measures it (see staleStackGeometry).
        if (controller.signal.aborted || filter !== targetFilter || geometry?.diagnostics?.source !== "stack"
          || bandKey(document.documentElement.clientWidth) !== band || !cachedLayoutEntry(band, targetFilter)
          || browseHistory.current.photo) return;
        measure();
      });
    }
  };
  // The grid still holds a stack layout although its cache has landed (it landed while a card was open).
  const staleStackGeometry = () => geometry?.diagnostics?.source === "stack"
    && Boolean(cachedLayoutEntry(bandKey(document.documentElement.clientWidth), filter));
  const poolSignatures = new Map();
  const loggedMisses = new Set();
  const geometryRequest = (targetFilter) => {
    const layoutViewportWidth = document.documentElement.clientWidth;
    const band = bandKey(layoutViewportWidth);
    loadBandLayouts();
    const pool = cards.filter((card) => matchesFilter(card, targetFilter));
    const entry = cachedLayoutEntry(band, targetFilter);
    if (entry && !poolSignatures.has(targetFilter)) poolSignatures.set(targetFilter, poolSignature(pool));
    const usable = Boolean(entry?.variants?.length) && entry.sig === poolSignatures.get(targetFilter);
    const variant = usable ? variantIndex(browseHistory.current.seed, entry.variants.length) : null;
    const compile = () => {
      const layout = usable && replayLayout({ entries: entry.variants[variant], cards, layoutViewportWidth, filter: targetFilter, settings });
      if (layout) return layout;
      // Only a declared cache that failed is a miss. No declared cache is stack by design; a cache still loading
      // (Back/Forward in the first seconds) is not a failure either and must stay off console.warn.
      const filterUrl = layoutCacheUrl(artifact.layoutCacheFilterUrl, band, targetFilter);
      const bandUrl = layoutCacheUrl(artifact.layoutCacheBandUrl, band);
      const loading = !entry && !artifact.layouts && (filterUrl || bandUrl)
        && !layoutCacheSettled.has(filterUrl) && !layoutCacheSettled.has(bandUrl);
      const missKey = `${targetFilter}|${band}`;
      if (!entry && !artifact.layouts && (filterUrl || bandUrl)) relayoutWhenCached(targetFilter, band);
      if (loading) console.debug("[masonry] layout cache loading", targetFilter, band);
      else if ((artifact.layouts || filterUrl || bandUrl) && !loggedMisses.has(missKey)) {
        loggedMisses.add(missKey);
        console.warn("[masonry] layout cache miss", targetFilter, band, !entry ? "load" : !usable ? "signature" : "replay");
      }
      // Fallback for the whole grid (owner O3 last step): every card one column, random within each rank (taxonomy R1).
      const order = shuffleWithSeed(pool, browseHistory.current.seed, `grid:${targetFilter}`)
        .sort((left, right) => filterRank(left, targetFilter) - filterRank(right, targetFilter));
      return stackLayout({ order, layoutViewportWidth, filter: targetFilter, settings });
    };
    const key = [
      artifactCacheIdentity.datasetVersion,
      artifactCacheIdentity.layoutAlgorithmVersion,
      targetFilter,
      layoutViewportWidth,
      `${band}:${variant ?? `stack-${browseHistory.current.seed}`}:${usable ? entry.sig : ""}`,
    ].join(":");
    return { key, compile };
  };
  const cacheGeometry = (key, layout) => {
    if (geometries.size >= GEOMETRY_CACHE_LIMIT) geometries.delete(geometries.keys().next().value);
    geometries.set(key, layout);
  };
  const geometryFor = (targetFilter) => {
    const { key, compile } = geometryRequest(targetFilter);
    let layout = geometries.get(key);
    if (layout) {
      geometries.delete(key);
      geometries.set(key, layout);
      surfaceLayoutStatus(grid, layout);
      return layout;
    }
    layout = compileMasonryGeometry({ grid, options: {}, compile });
    cacheGeometry(key, layout);
    return layout;
  };

  // `hysteresis`: a card is removed only when it is more than two viewports away, though it is built only within one viewport at most (R7).
  // `mount` is the id that needs a real card; `keep` is the id that must not be removed.
  let lastWindowY;
  const virtualWindow = ({ hysteresis = false } = {}) => {
    // Reading the rect is one forced layout per frame; caching by currentVisualY drifts while dragging the scrollbar (visual lags logical),
    // so keep the real read; the temp card layer has contain, so dirty layout is left only on newly real cards.
    const gridTop = grid.getBoundingClientRect().top + currentVisualY;
    const visible = getVisibleViewport();
    const scrollTop = Math.max(0, currentVisualY + visible.top - gridTop);
    // Smooth scroll (Locomotive, from 981px) moves the page after this frame's pass, so the window paints one scroll step behind; a long
    // frame makes that step longer than the overscan and opens a gap. Stretch the window ahead by the last step, up to two viewports.
    const step = hysteresis && lastWindowY !== undefined ? currentVisualY - lastWindowY : 0;
    lastWindowY = currentVisualY;
    const lead = Math.max(-2 * visible.height, Math.min(2 * visible.height, step));
    const windowed = getVirtualWindow(geometry, {
      scrollTop: scrollTop + Math.min(0, lead),
      viewportHeight: visible.height + Math.abs(lead),
      overscan: visible.height,
      releaseOverscan: hysteresis ? visible.height * 2 : visible.height,
    });
    const visiblePlacements = [...windowed.items];
    const mount = new Set(visiblePlacements.map((placement) => placement.card.id));
    const keep = hysteresis ? new Set(windowed.retained.map((placement) => placement.card.id)) : new Set(mount);
    const focusedNode = [...gridHost.rendered.values()].find((node) => node === document.activeElement || node.contains(document.activeElement));
    if (focusedNode && !mount.has(focusedNode.dataset.masonryCard)) {
      const focusedPlacement = geometry.placements.find((placement) => placement.card.id === focusedNode.dataset.masonryCard);
      if (focusedPlacement) visiblePlacements.push(focusedPlacement);
      keep.add(focusedNode.dataset.masonryCard);
      mount.add(focusedNode.dataset.masonryCard);
    }
    for (const id of retainedPhotoIds) {
      if (mount.has(id)) continue;
      const retainedPlacement = geometry.placements.find((placement) => placement.card.id === id);
      if (!retainedPlacement) continue;
      visiblePlacements.push(retainedPlacement);
      keep.add(id);
      mount.add(id);
    }
    // Grid-relative bottom of the visible region (scrollTop clamps at the grid top).
    const visibleBottom = currentVisualY + visible.top + visible.height - gridTop;
    return { keep, mount, visiblePlacements, scrollTop, viewportHeight: visible.height, visibleBottom };
  };
  const sameMembers = (left, right) => left.size === right.size && [...left].every((item) => right.has(item));
  const coordinateChanged = (nextPositions) => [...gridHost.rendered.entries()].some(([id, node]) => {
    if (node.hidden) return false;
    const previous = gridHost.positions.get(id);
    const next = nextPositions.get(id);
    return previous && next && (previous.x !== next.x || previous.y !== next.y);
  });
  const restoreCanonicalDomOrder = () => {
    if (!geometry) return;
    const placementIndex = new Map(geometry.placements.map((placement) => [placement.card.id, placement.index]));
    const activeElement = grid.contains(document.activeElement) ? document.activeElement : null;
    const orderedNodes = [...gridHost.rendered.entries()]
      .sort(([leftId], [rightId]) => (placementIndex.get(leftId) ?? Number.MAX_SAFE_INTEGER) - (placementIndex.get(rightId) ?? Number.MAX_SAFE_INTEGER) || leftId.localeCompare(rightId))
      .map(([, node]) => node);
    let cursor = grid.firstElementChild;
    // The temp card layer always sits at the top of the grid, below every card.
    if (cursor === gridHost.ghosts.layer) cursor = cursor.nextElementSibling;
    for (const node of orderedNodes) {
      if (node === cursor) {
        cursor = cursor.nextElementSibling;
        continue;
      }
      // moveBefore keeps the skeleton's fade transition; insertBefore detaches the node so opacity jumps straight to the target.
      (grid.isConnected && grid.moveBefore ? grid.moveBefore : grid.insertBefore).call(grid, node, cursor);
    }
    if (activeElement?.isConnected && document.activeElement !== activeElement) activeElement.focus({ preventScroll: true });
  };
  const pruneMotionCohort = () => {
    if (!geometry) return;
    const { keep, visiblePlacements } = virtualWindow();
    // A card held hidden in the cohort does not pass through the new layout's sizeNode; when revealed it must take the new size, otherwise it keeps the old column width.
    for (const placement of visiblePlacements) {
      const node = gridHost.rendered.get(placement.card.id);
      if (node?.hidden) sizeNode(node, placement, geometry.placements.length);
    }
    for (const [id, node] of gridHost.rendered) {
      if (keep.has(id)) {
        node.hidden = false;
        continue;
      }
      releaseMediaCard(node);
      node.remove();
      gridHost.rendered.delete(id);
    }
    gridHost.ghosts.prune(keep);
    restoreCanonicalDomOrder();
  };
  // A card resizes in step with its position: the card's child scales from the old size around the card's top-left corner, so a growing
  // card does not cover the neighboring item mid-slide (owner 10/10). Masonry owns `transform`, so the scale sits on the child.
  const morphSize = (node, from) => {
    const sx = from.w / node.offsetWidth;
    const sy = from.h / node.offsetHeight;
    if (Math.abs(sx - 1) <= 0.01 && Math.abs(sy - 1) <= 0.01) return;
    for (const child of node.children) {
      const transformOrigin = `${-child.offsetLeft}px ${-child.offsetTop}px`;
      child.animate([{ scale: `${sx} ${sy}`, transformOrigin }, { scale: "1 1", transformOrigin }], { duration: DUR.card, easing: "ease" });
    }
  };
  // Position is precomputed; Masonry only needs to run the motion. Instant layout skips it so it does not re-measure every card
  // (getSize) in the scroll frame and the Back task (decision phone-frame-budget). Write left/top like Masonry: the grid has no padding.
  const placeRendered = () => {
    for (const [id, node] of gridHost.rendered) {
      const position = gridHost.positions.get(id);
      if (!position) continue;
      const left = `${position.x}px`;
      const top = `${position.y}px`;
      if (node.style.left !== left) node.style.left = left;
      if (node.style.top !== top) node.style.top = top;
    }
  };
  // Remaining time of the transform transition (Masonry) and of the running scale pass on the card.
  const remainingMotion = () => {
    let remaining = 0;
    gridHost.masonry?.items.forEach((item) => {
      const animations = [
        ...item.element.getAnimations().filter((animation) => animation.transitionProperty === "transform"),
        ...[...item.element.children].flatMap((child) => child.getAnimations().filter(isSizeMorph)),
      ];
      for (const animation of animations) {
        if (animation.playState !== "running") continue;
        remaining = Math.max(remaining, animation.effect.getComputedTiming().endTime - (Number(animation.currentTime) || 0));
      }
    });
    return remaining;
  };
  const settleMotion = () => {
    gridHost.motionTimer = 0;
    if (performance.now() < motionUntil) {
      gridHost.motionTimer = setTimeout(settleMotion, Math.max(0, motionUntil - performance.now()));
      return;
    }
    // Rasterizing a new region after a long scroll holds the frame, so the transition starts 400ms late relative to schedule; cutting in then makes the card
    // stand still then jump straight to the new place (masonry R6). Wait for the remainder; a hidden tab runs no frames so place it directly.
    const remaining = document.hidden ? 0 : remainingMotion();
    if (remaining > 0) {
      motionUntil = performance.now() + remaining;
      gridHost.motionTimer = setTimeout(settleMotion, remaining);
      return;
    }
    motionUntil = 0;
    gridHost.cancelTransitions();
    pruneMotionCohort();
    if (pendingScroll) {
      pendingScroll = false;
      renderWindow();
      return;
    }
    placeRendered();
  };
  const cancelMotion = () => {
    // No motion running: settleMotion already cancelled the transition and cleaned up the cohort; re-walking every card would only cost the open-detail task.
    if (!gridHost.motionFrame && !gridHost.motionTimer && !motionUntil && !pendingScroll) return;
    gridHost.stopMotion();
    motionUntil = 0;
    pendingScroll = false;
    pruneMotionCohort();
  };
  const visualCoordinates = () => {
    const gridRect = grid.getBoundingClientRect();
    const coordinates = new Map();
    for (const [id, node] of gridHost.rendered) {
      if (node.hidden) continue;
      const rect = node.getBoundingClientRect();
      // Size currently visible, including a running scale pass (morphSize).
      const link = node.firstElementChild;
      const scaleY = link?.offsetHeight ? link.getBoundingClientRect().height / link.offsetHeight : 1;
      coordinates.set(id, { x: rect.left - gridRect.left, y: rect.top - gridRect.top,
        w: link?.getBoundingClientRect().width || rect.width, h: node.offsetHeight * scaleY });
    }
    coordinates.gridTop = gridRect.top;
    return coordinates;
  };

  const skeletonMotionPreference = env.reducedMotion;
  const visibleSkeletonFrames = new Set();
  const skeletonFlowByFrame = new Map();
  const skeletonLeaseByFrame = new Map();
  const sharedFlowAllowed = () => skeletonFlowWorkerSupported() && !skeletonPhone();
  const skeletonAssignmentByFrame = new Map();
  const skeletonFrameBySlot = new Map();
  const skeletonPhaseBySlot = new Map();
  const skeletonEntryFrames = new Map();
  // Batch slots and loading media keep their paint pass within one page state (advertising-skeleton R3).
  const skeletonAssignmentByKey = new Map();
  // By key, not by frame: a card entering and leaving view creates a new frame for the same media, so a per-frame cache always misses.
  const skeletonStillByKey = new Map();
  const resetSkeletonAssignments = () => {
    skeletonAssignmentByKey.clear();
    revealedSkeletonSlots.clear();
  };
  const skeletonRatioBandBySlot = new Map();
  const revealedSkeletonSlots = new Set();
  const resetSkeletonRevealState = () => {
    revealedSkeletonSlots.clear();
    ctaGeometryHash = "";
  };
  const cancelSkeletonEntry = (frame) => {
    const pending = skeletonEntryFrames.get(frame);
    if (!pending) return;
    cancelAnimationFrame(pending.reveal);
    clearTimeout(pending.fallback);
    frame.removeEventListener("transitionend", pending.settle);
    pending.animations.forEach((animation) => animation.cancel());
    pending.glass?.remove();
    skeletonEntryFrames.delete(frame);
  };
  // Loading skeleton runs on related cards and on the primary; the CTA batch is removed while a photo is open.
  const skeletonMotionAllowed = () => !skeletonDocumentParked && !document.hidden
    && !skeletonMotionPreference.matches
    && !document.body.classList.contains("motion-paused") && !document.body.classList.contains("menu-open");
  const skeletonCanLoop = (frame) => visibleSkeletonFrames.has(frame) && skeletonMotionAllowed();
  const settleSkeletonCanvas = (frame) => {
    const canvas = frame.querySelector('[data-masonry-flow-backend="webgl"]');
    if (!canvas) return;
    canvas.style.transition = "none";
    canvas.style.opacity = "1";
    canvas.getAnimations().forEach((animation) => {
      if (animation.transitionProperty === "opacity") animation.cancel();
    });
  };
  const loadingSkeletonFrames = new Set();
  const skeletonFrames = () => [...skeletonFrameBySlot.values(), ...loadingSkeletonFrames];
  const skeletonKey = (frame) => frame.dataset.masonryCtaSlot
    ?? `media:${frame.dataset.masonryLoadingSkeleton}`;
  const skeletonPhase = (frame) => skeletonPhaseBySlot.get(skeletonKey(frame))
    ?? skeletonAssignmentByFrame.get(frame).phase;
  // With no live renderer, the canvas shows Flow's own still image at the saved phase (R5).
  const createSkeletonCanvas = (frame, canvas = document.createElement("canvas")) => {
    const assignment = skeletonAssignmentByFrame.get(frame);
    const { preset, anchorPermutation, direction, speedScale } = assignment;
    const phase = skeletonPhase(frame);
    // Remount reuses the still image drawn at release; only a different phase costs one CPU render.
    const cached = skeletonStillByKey.get(skeletonKey(frame));
    const still = cached?.assignment === assignment && cached.phase === phase
      ? cached.still
      : skeletonFlowStill(preset, phase);
    skeletonStillByKey.set(skeletonKey(frame), { assignment, phase, still });
    canvas.className = "masonry-grid__cta-flow";
    canvas.dataset.masonryFlowPreset = preset.id;
    canvas.dataset.masonryFlowAnchorPermutation = anchorPermutation.join(",");
    canvas.dataset.masonryFlowPhase = String(assignment.phase);
    canvas.dataset.masonryFlowDirection = String(direction);
    canvas.dataset.masonryFlowSpeedScale = speedScale.toFixed(3);
    canvas.dataset.masonryFlowBackend = "none";
    canvas.style.backgroundColor = preset.colors[3];
    canvas.style.backgroundImage = still;
    canvas.style.backgroundSize = "100% 100%";
    canvas.style.filter = preset.finish.soften ? `blur(${preset.finish.soften}px)` : "none";
    canvas.style.transform = `scale(${1 + preset.finish.soften / 200})`;
    canvas.setAttribute("aria-hidden", "true");
    // The canvas overflows the surface by 8% on each side; the surface shows the same still image beneath the fading canvas.
    const surface = frame.querySelector(".masonry-grid__cta-surface");
    surface.style.backgroundColor = preset.colors[3];
    surface.style.backgroundImage = still;
    surface.style.backgroundSize = "116% 116%";
    surface.style.backgroundPosition = "center";
    return canvas;
  };
  const createSkeletonFrame = () => {
    const frame = document.createElement("span");
    frame.className = "masonry-grid__cta-frame";
    const surface = document.createElement("span");
    surface.className = "masonry-grid__cta-surface";
    frame.append(surface);
    return frame;
  };
  // Adjacent: same column above or below, or the next column overlapping vertically (R3).
  // `rects` holds the rects read before any canvas append, so one draw batch forces only one layout.
  const skeletonNeighbors = (frame, rects) => {
    const rectOf = (other) => rects?.get(other) ?? other.getBoundingClientRect();
    const rect = rectOf(frame);
    const reach = Math.max(48, rect.width * 0.25);
    return skeletonFrames().flatMap((other) => {
      const assignment = skeletonAssignmentByFrame.get(other);
      if (other === frame || !assignment) return [];
      const box = rectOf(other);
      const dx = Math.max(0, Math.max(rect.left, box.left) - Math.min(rect.right, box.right));
      const dy = Math.max(0, Math.max(rect.top, box.top) - Math.min(rect.bottom, box.bottom));
      if (!((dx === 0 && dy <= reach) || (dy === 0 && dx <= reach))) return [];
      return [{ preset: assignment.preset, phase: skeletonFlowByFrame.get(other)?.phase ?? skeletonPhase(other) }];
    });
  };
  const assignSkeleton = (frame, rects) => {
    if (skeletonAssignmentByFrame.has(frame)) return;
    const key = skeletonKey(frame);
    let assignment = skeletonAssignmentByKey.get(key);
    if (!assignment) {
      assignment = drawSkeletonFlowAssignment({ neighbors: skeletonNeighbors(frame, rects),
        colors: frame.dataset.masonryFlowColors?.split(" ") });
      skeletonAssignmentByKey.set(key, assignment);
      skeletonPhaseBySlot.delete(key);
    }
    skeletonAssignmentByFrame.set(frame, assignment);
    frame.querySelector(".masonry-grid__cta-surface").append(createSkeletonCanvas(frame));
  };
  // All batch frames draw on one shared half-resolution WebGL canvas (advertising-skeleton R5).
  const sharedFlowFor = (frame) => {
    const container = frame.closest(".masonry-grid__cta-skeleton");
    if (!container) return null;
    if (sharedSkeletonFlow === undefined) {
      sharedSkeletonFlow = createSharedSkeletonFlowLayer();
      addEventListener("pagehide", (event) => { if (!event.persisted) sharedSkeletonFlow?.dispose(); });
    }
    // A rebuilt batch removes or adds frames after the canvas; the canvas must be the last child to sit above the frames, below Glass and the CTA.
    const canvas = sharedSkeletonFlow?.canvas;
    if (canvas && container.lastElementChild !== canvas) container.append(canvas);
    return sharedSkeletonFlow;
  };
  const mountSkeletonRenderer = (frame) => {
    if (skeletonDocumentParked || skeletonFlowByFrame.has(frame)) return;
    const assignment = skeletonAssignmentByFrame.get(frame);
    if (!assignment) return;
    const { preset, direction, speedScale } = assignment;
    const sharedLayer = sharedFlowFor(frame);
    if (sharedLayer) {
      const surface = frame.querySelector(".masonry-grid__cta-surface");
      // While revealing, the shared canvas follows the surface opacity; after the reveal it is 1 (R4).
      const alpha = () => (skeletonEntryFrames.has(frame) ? Number(getComputedStyle(surface).opacity) : 1);
      skeletonFlowByFrame.set(frame, sharedLayer.attach(frame, { preset, initialPhase: skeletonPhase(frame), direction, speedScale, alpha }));
      return;
    }
    const budget = SKELETON_CONTEXT_BUDGET;
    const lease = skeletonNativeContexts.find(record => !record.renderer && !record.gl.isContextLost());
    if (!lease && skeletonNativeContexts.length >= budget) return;
    const oldCanvas = frame.querySelector("canvas");
    const canvas = createSkeletonCanvas(frame, lease?.canvas || oldCanvas || undefined);
    canvas.style.transition = "none";
    canvas.style.opacity = "0";
    canvas.getBoundingClientRect();
    const options = {
      preset,
      initialPhase: skeletonPhase(frame),
      direction,
      speedScale,
      ...(skeletonPhone() ? PHONE_CARD_FLOW : {}),
    };
    // A fast swipe leaves the main-thread rAF at about 12fps on the A04s: drawing in a worker keeps Flow running steadily (R8, owner 19/10).
    const shared = !lease && sharedFlowAllowed();
    const workerRenderer = !lease && createSkeletonFlowWorkerRenderer(canvas, shared ? { ...options, shared: true } : options);
    if (shared && !workerRenderer) return;
    const renderer = workerRenderer || createSkeletonFlowRenderer(canvas, options);
    canvas.dataset.masonryFlowBackend = renderer?.backend || "fallback";
    skeletonFlowByFrame.set(frame, renderer);
    canvas.dataset.masonryFlowContext = shared ? "shared" : "own";
    if (renderer?.context) {
      const record = lease || rememberSkeletonContext(canvas, renderer.context, renderer);
      record.renderer = renderer;
      skeletonLeaseByFrame.set(frame, record);
    }
    if (oldCanvas && oldCanvas !== canvas) oldCanvas.replaceWith(canvas);
    if (!canvas.isConnected) frame.querySelector(".masonry-grid__cta-surface")?.append(canvas);
    // Draw once when the canvas is leased inside the frame; no paint intervenes, so the first frame is still seen.
    renderer?.draw(performance.now());
    // On a fast swipe a card stays in the viewport only about 270ms, so a 300ms fade means Flow never shows (R4); the still image under the canvas
    // is in the same phase so it shows immediately without a jump.
    if (enteringWhileScrolling()) {
      canvas.style.opacity = "1";
      return;
    }
    requestAnimationFrame(() => {
      if (!canvas.isConnected || skeletonFlowByFrame.get(frame) !== renderer
        || document.hidden || skeletonMotionPreference.matches) return;
      canvas.style.transition = `opacity ${DUR.base}ms ease-out`;
      requestAnimationFrame(() => {
        if (canvas.isConnected && skeletonFlowByFrame.get(frame) === renderer
          && !document.hidden && !skeletonMotionPreference.matches) canvas.style.opacity = "1";
      });
    });
  };
  const releaseSkeletonRenderer = (frame) => {
    const renderer = skeletonFlowByFrame.get(frame);
    if (!skeletonFlowByFrame.has(frame)) return;
    if (Number.isFinite(renderer?.phase)) skeletonPhaseBySlot.set(skeletonKey(frame), renderer.phase);
    const lease = skeletonLeaseByFrame.get(frame);
    renderer?.destroy({ releaseContext: !lease });
    if (lease) {
      lease.renderer = null;
      lease.canvas.getAnimations().forEach(animation => animation.cancel());
      skeletonLeaseByFrame.delete(frame);
    }
    skeletonFlowByFrame.delete(frame);
    const oldCanvas = frame.querySelector("canvas");
    if (oldCanvas && skeletonAssignmentByFrame.has(frame)) oldCanvas.replaceWith(createSkeletonCanvas(frame));
  };
  // `rects` is read before assignSkeleton appends the canvas; reading again afterwards forces another style recalc.
  const syncSkeletonRenderers = (rects) => {
    const budget = sharedFlowAllowed() ? SKELETON_SHARED_BUDGET : SKELETON_CONTEXT_BUDGET;
    const eligible = skeletonMotionAllowed();
    const keep = new Set();
    for (const frame of skeletonFlowByFrame.keys()) {
      if (visibleSkeletonFrames.has(frame) && keep.size < budget) keep.add(frame);
    }
    // Card and CTA frames sit in different containers, so order by viewport position. Reuse the rect read
    // before appending the canvas: reading again forces another layout (Android phone, decision phone-frame-budget).
    const prioritized = [...visibleSkeletonFrames]
      .filter((frame) => skeletonAssignmentByFrame.has(frame))
      .map((frame) => ({ frame, rect: rects?.get(frame) ?? frame.getBoundingClientRect() }))
      .sort((left, right) => left.rect.top - right.rect.top || left.rect.left - right.rect.left)
      .map(({ frame }) => frame)
      .filter((frame) => !keep.has(frame));
    if (eligible) for (const frame of prioritized) {
      if (keep.size >= budget) break;
      keep.add(frame);
    }
    // Release before allocating so rotating the phone never stacks the context budget.
    for (const frame of skeletonFlowByFrame.keys()) {
      if (!keep.has(frame)) releaseSkeletonRenderer(frame);
    }
    pruneSkeletonContexts(budget);
    skeletonMountWanted = keep;
    if ([...keep].some((frame) => !skeletonFlowByFrame.has(frame))) scheduleSkeletonMount();
  };
  // A new context, then shader and noise, each cost tens of ms on an Android phone (R8): every renderer
  // mounts in its own task after the frame, with the new context one task before it; the still image shows meanwhile.
  // A non-phone device mounts without waiting for scroll to stop, so Flow runs while the scrollbar is held (R5).
  let skeletonMountWanted = new Set();
  let skeletonMountTimer = 0;
  // Compiling the shader and creating the context stalls the card's 0.4s slide frame, so mount waits for it to finish. Batch frames
  // on phones also wait for the swipe to stop (R5 "smooth scroll wins"); card frames mount immediately during a swipe (owner 18/10).
  const skeletonMountWait = (frame) => Math.max(motionUntil - performance.now(),
    skeletonPhone() && frame.dataset.masonryCtaFrame ? phoneScrollWait() : 0);
  const pendingSkeletonMounts = () => [...skeletonMountWanted].filter((node) => node.isConnected && !skeletonFlowByFrame.has(node));
  const scheduleSkeletonMount = () => {
    if (skeletonMountTimer || controller.signal.aborted) return;
    const wait = Math.min(...pendingSkeletonMounts().map(skeletonMountWait));
    skeletonMountTimer = setTimeout(() => {
      skeletonMountTimer = 0;
      const pending = pendingSkeletonMounts();
      const frame = pending.find((node) => skeletonMountWait(node) <= 0);
      // Only batch frames waiting for scroll to stop remain: reschedule by the smallest wait time.
      if (!frame && pending.length) {
        scheduleSkeletonMount();
        return;
      }
      if (!frame || skeletonDocumentParked || controller.signal.aborted) return;
      if (sharedFlowFor(frame)) {
        mountSkeletonRenderer(frame);
        syncSkeletonMotion();
        return;
      }
      const leased = skeletonNativeContexts.some((record) => !record.renderer && !record.gl.isContextLost());
      // The Worker creates its context off the main thread, no need to create one ahead.
      if (!leased && !skeletonFlowWorkerSupported() && skeletonNativeContexts.length < SKELETON_CONTEXT_BUDGET) {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl", SKELETON_FLOW_CONTEXT_ATTRIBUTES);
        if (gl) {
          rememberSkeletonContext(canvas, gl);
          scheduleSkeletonMount();
          return;
        }
      }
      mountSkeletonRenderer(frame);
      // Over budget or context lost: mount nothing; the next visibility change retries.
      if (skeletonFlowByFrame.has(frame)) syncSkeletonMotion();
    }, Number.isFinite(wait) ? Math.max(0, wait) : 0);
  };
  controller.signal.addEventListener("abort", () => clearTimeout(skeletonMountTimer), { once: true });
  const startSkeletonEntry = (frame) => {
    if (skeletonEntryFrames.has(frame) || frame.classList.contains("is-entry-ready")) return;
    const pending = { reveal: 0, fallback: 0, settle: null, animations: [], glass: null };
    const settle = () => {
      if (skeletonEntryFrames.get(frame) !== pending) return;
      cancelSkeletonEntry(frame);
    };
    pending.settle = (event) => {
      if (event.target === frame && event.propertyName === "opacity") settle();
    };
    pending.reveal = requestAnimationFrame(() => {
      if (!skeletonCanLoop(frame)) {
        skeletonEntryFrames.delete(frame);
        return;
      }
      // A card entering the viewport while scrolling shows immediately: a 0.6s fade is longer than a fast swipe leaves the card in the viewport (R4).
      if (!frame.dataset.masonryCtaFrame && enteringWhileScrolling()) frame.style.transition = "none";
      frame.classList.add("is-entry-ready");
      revealedSkeletonSlots.add(skeletonKey(frame));
      // A batch frame enters like a card image: Flow shows under Glass on the empty frame over 0.6s (skeleton R4).
      if (frame.dataset.masonryCtaFrame) {
        const reveal = playReveal({ to: [frame.querySelector(".masonry-grid__cta-surface")], host: frame });
        pending.glass = reveal.glass;
        pending.animations = reveal.animations;
        reveal.finished.then(settle, () => {});
        return;
      }
      frame.addEventListener("transitionend", pending.settle);
      pending.fallback = setTimeout(settle, 650);
    });
    skeletonEntryFrames.set(frame, pending);
  };
  // The rAF of scheduleSkeletonSync shares a task with the scroll frame and masonry layout; the still image renders on CPU in a later task, otherwise
  // the frame task exceeds 50ms on an Android phone during a fast swipe (R8, decision phone-frame-budget).
  let skeletonSyncInFrame = false;
  let skeletonAssignBudget = SKELETON_ASSIGN_BUDGET_MS;
  const syncSkeletonMotion = () => {
    const visible = getVisibleViewport();
    const rects = new Map();
    for (const frame of skeletonFrames()) {
      const rect = frame.getBoundingClientRect();
      rects.set(frame, rect);
      if (rect.width > 0 && rect.height > 0
        && rect.right > visible.left && rect.left < visible.left + visible.width
        && rect.bottom > visible.top && rect.top < visible.top + visible.height) visibleSkeletonFrames.add(frame);
      else visibleSkeletonFrames.delete(frame);
    }
    // Each still image is one CPU render; opening detail may need more than a dozen at once. Over budget,
    // the rest go to a later task, and a frame without an assignment does not enter the entry yet (decision phone-frame-budget).
    const assignUntil = performance.now() + skeletonAssignBudget;
    let assigned = 0;
    for (const frame of visibleSkeletonFrames) {
      if (skeletonAssignmentByFrame.has(frame)) continue;
      if (skeletonSyncInFrame || (assigned && performance.now() > assignUntil)) {
        scheduleSkeletonAssign();
        break;
      }
      assignSkeleton(frame, rects);
      assigned += 1;
    }
    syncSkeletonRenderers(rects);
    skeletonFrames().forEach((frame) => {
      const renderer = skeletonFlowByFrame.get(frame);
      if (skeletonMotionPreference.matches) {
        cancelSkeletonEntry(frame);
        settleSkeletonCanvas(frame);
        frame.classList.add("is-entry-ready");
        revealedSkeletonSlots.add(skeletonKey(frame));
        frame.classList.remove("is-looping");
        frame.dataset.masonryFlowState = "paused";
        renderer?.stop();
        return;
      }
      if (!visibleSkeletonFrames.has(frame)) {
        // A frame already shown stays as is when entering and leaving the viewport, like a loaded image card (skeleton R4); rerunning it flashes white under Glass.
        cancelSkeletonEntry(frame);
        frame.classList.remove("is-looping");
        frame.dataset.masonryFlowState = "paused";
        renderer?.stop();
        return;
      }
      if (document.hidden || document.body.classList.contains("motion-paused")) {
        cancelSkeletonEntry(frame);
        settleSkeletonCanvas(frame);
        frame.classList.remove("is-looping");
        frame.dataset.masonryFlowState = "paused";
        renderer?.stop();
        return;
      }
      if (!skeletonAssignmentByFrame.has(frame)) return;
      if (skeletonCanLoop(frame)) {
        // Flow runs from the first frame of the Glass entry (R4).
        if (!frame.classList.contains("is-entry-ready")) startSkeletonEntry(frame);
        frame.classList.toggle("is-looping", Boolean(renderer));
        frame.dataset.masonryFlowState = renderer ? "running" : "paused";
        renderer?.start();
        return;
      }
      cancelSkeletonEntry(frame);
      frame.classList.remove("is-looping");
      frame.dataset.masonryFlowState = "paused";
      renderer?.stop();
    });
  };
  let skeletonAssignTimer = 0;
  const scheduleSkeletonAssign = () => {
    if (skeletonAssignTimer || controller.signal.aborted) return;
    // Runs at idle after the frame: layout is clean so reading rects forces no style, and the budget fits the frame's idle part
    // instead of a 17ms task wedged between two frames during a fast swipe on an old A05s (decision phone-frame-budget). Always assign at least
    // one frame per pass so it does not hang when idle expires.
    const run = (deadline) => {
      skeletonAssignTimer = 0;
      if (controller.signal.aborted) return;
      skeletonAssignBudget = Math.min(SKELETON_ASSIGN_BUDGET_MS, deadline?.timeRemaining() ?? SKELETON_ASSIGN_BUDGET_MS);
      syncSkeletonMotion();
      skeletonAssignBudget = SKELETON_ASSIGN_BUDGET_MS;
    };
    skeletonAssignTimer = globalThis.requestIdleCallback?.(run, { timeout: 250 }) ?? setTimeout(run);
  };
  const skeletonObserver = typeof IntersectionObserver === "function"
    ? new IntersectionObserver(syncSkeletonMotion) : null;
  document.addEventListener("visibilitychange", syncSkeletonMotion, { signal: controller.signal });
  // The body class changes right in the card-tap task (is-detail); sync in the next frame so reading rects does not force another
  // style and layout in that task (decision phone-frame-budget).
  const skeletonPauseObserver = new MutationObserver(() => scheduleSkeletonSync());
  skeletonPauseObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  controller.signal.addEventListener("abort", () => skeletonPauseObserver.disconnect(), { once: true });
  skeletonMotionPreference.addEventListener("change", syncSkeletonMotion, { signal: controller.signal });
  let skeletonSyncFrame = 0;
  const scheduleSkeletonSync = () => {
    if (skeletonSyncFrame || controller.signal.aborted) return;
    skeletonSyncFrame = requestAnimationFrame(() => {
      skeletonSyncFrame = 0;
      skeletonSyncInFrame = true;
      syncSkeletonMotion();
      skeletonSyncInFrame = false;
    });
  };
  // Loading media shows the last masonry skeleton frame itself (loading-glass-and-page-entry R1, R5).
  const attachLoadingSkeleton = (host, mediaId, before = null, colors = null) => {
    const frame = createSkeletonFrame();
    frame.dataset.masonryLoadingSkeleton = mediaId;
    // Flow waits for the primary image and carries the image's own 4 colors (advertising-skeleton R3).
    if (colors) frame.dataset.masonryFlowColors = colors.join(" ");
    if (skeletonAssignmentByKey.has(skeletonKey(frame))) assignSkeleton(frame);
    frame.setAttribute("aria-hidden", "true");
    host.insertBefore(frame, before);
    loadingSkeletonFrames.add(frame);
    if (skeletonObserver) skeletonObserver.observe(frame);
    else visibleSkeletonFrames.add(frame);
    scheduleSkeletonSync();
    return frame;
  };
  const detachLoadingSkeleton = (frame) => {
    if (!loadingSkeletonFrames.delete(frame)) return;
    skeletonObserver?.unobserve(frame);
    visibleSkeletonFrames.delete(frame);
    cancelSkeletonEntry(frame);
    skeletonAssignmentByFrame.delete(frame);
    releaseSkeletonRenderer(frame);
    frame.remove();
    scheduleSkeletonSync();
  };
  // Crossfade step of the approved reveal: the old layer fades from its current opacity, the new layer from 0.
  const crossfadeLayers = (from, to, total) => {
    const scale = total / MEDIA_REVEAL_MS;
    const timing = { delay: 300 * scale, duration: 600 * scale, easing: EASE.card, fill: "both" };
    // Read all opacities before the first write, so the whole crossfade costs only one style recalc.
    const opacities = from.map((node) => getComputedStyle(node).opacity);
    return [
      ...from.map((node, index) => {
        const opacity = opacities[index];
        node.style.transition = "none";
        node.style.opacity = opacity;
        return node.animate([{ opacity }, { opacity: 0 }], timing);
      }),
      ...to.map((node) => node.animate([{ opacity: 0 }, { opacity: 1 }], timing)),
    ];
  };
  // One reveal for card, primary and batch frame (masonry-reuse step 8): `from` fades out, `to` shows via the approved
  // crossfade. With `host`, add three-tier Glass at the bottom of the media box, over photo and skeleton (R2, R4), unless the arc CTA is visible:
  // the reveal Glass makes Chrome drop the arc's tier blur (skeleton R4).
  const playReveal = ({ from = [], to = [], host = null }) => {
    let glass = null;
    if (host && !ctaBatch.arcInView) {
      glass = createGlassSurface("even", 3);
      glass.dataset.glassReveal = "";
      host.append(glass);
    }
    const animations = [...crossfadeLayers(from, to, CARD_REVEAL_MS), ...(glass ? playGlassReveal(glass, CARD_REVEAL_MS) : [])];
    const finished = Promise.all(animations.map(({ finished: done }) => done));
    // A cancelled reveal (card leaves view, filter change, teardown) makes `finished` reject; callers that do not need it report no error.
    finished.catch(() => {});
    return { glass, animations, finished };
  };
  // The realtime background of the spare area draws into a 1/8-frame canvas with the last tier's blur then scales up 8x (detail.css): a CSS filter on a
  // scaled-up image is recomputed by the GPU at screen size every frame, a canvas is not.
  const BAKED_SCALE = 8;
  const BAKED_FILTERS = [[100, 1.7, 1.04]]
    .map(([blur, saturate, brightness]) => `blur(${blur / BAKED_SCALE}px) saturate(${saturate}) brightness(${brightness})`);
  // Late-loading media shows under its own blur and the blur melts away over 0.6s once loaded; already-loaded media shows immediately
  // (loading-glass-and-page-entry R1-R3).
  const cardSkeletons = new Map();
  const attachCardSkeleton = (node, waitCache = loadedMediaKeys.has(mediaKey(node))) => {
    const mediaId = node.advertisingPendingMediaId?.();
    if (cardSkeletons.has(node) || !mediaId) return;
    // A re-attached card with already-loaded media waits for the cache, no skeleton (loading-glass R3).
    if (waitCache) {
      setTimeout(() => node.isConnected && visibleMediaCards.has(mediaKey(node)) && attachCardSkeleton(node, false),
        REMOUNT_CACHE_WAIT_MS);
      return;
    }
    // Phone: a flat layer cycling through the image's 4 dominant colors; the image stays hidden until decoded, then fades in (progressive-loading R9).
    const phone = skeletonPhone();
    if (phone) {
      // A temp card hands over its own colors so the layer does not jump when the real card shows a different media than the cover.
      const ghost = node.masonryGhost;
      setColorWait(node, ghost?.dataset.mediaWait
        ? [1, 2, 3, 4].map((index) => ghost.style.getPropertyValue(`--wait-${index}`)) : node.advertisingWaitColors());
    } else {
      // The image shows immediately under its own blur so the browser paints progressively; a filter on the image does not re-read the backdrop every frame like Glass
      // backdrop-filter, so dragging the scrollbar does not drop FPS (progressive-loading R9).
      const scale = cardLoadingScale(node);
      mediaLayers(node).forEach((media) => {
        media.style.filter = CARD_LOADING_BLUR;
        media.style.scale = scale;
      });
      // A blurred card waiting for its image breathes (detail.css, image-wait spec S2); dropCardSkeleton removes it together with the blur.
      node.dataset.masonryMediaLoading = "";
      node.style.setProperty("--breathe-phase", breathePhase());
    }
    // The card has already drawn its wait state over the dominant color (blurred image, or the same color layer in the same phase as the temp card),
    // so the temp card is removed in the next frame, no crossfade (R7).
    if (node.masonryGhost) {
      const ghost = node.masonryGhost;
      node.masonryGhost = null;
      requestAnimationFrame(() => ghost.remove());
    }
    if (!phone) showMedia(node);
    cardSkeletons.set(node, { blur: !phone, colors: phone, revealing: false, animations: [] });
  };
  const dropCardSkeleton = (node) => {
    removeGhost(node);
    const entry = cardSkeletons.get(node);
    if (!entry) return;
    cardSkeletons.delete(node);
    delete node.dataset.masonryMediaLoading;
    if (entry.colors) clearColorWait(node);
    entry.animations.forEach((animation) => animation.cancel());
    mediaLayers(node).forEach((media) => {
      media.style.removeProperty("transition");
      media.style.removeProperty("filter");
      media.style.removeProperty("scale");
    });
  };
  const heldReveals = new Set();
  let revealHoldTimer = 0;
  const releaseHeldReveals = () => {
    const wait = phoneScrollWait();
    if (wait > 0) {
      revealHoldTimer = setTimeout(releaseHeldReveals, wait);
      return;
    }
    revealHoldTimer = 0;
    const nodes = [...heldReveals];
    heldReveals.clear();
    if (!controller.signal.aborted) nodes.forEach((node) => node.isConnected && revealCard(node));
  };
  const revealCard = (node) => {
    let entry = cardSkeletons.get(node);
    if (entry?.revealing) return;
    if (!reduced && skeletonPhone() && phoneScrollWait() > 0) {
      heldReveals.add(node);
      revealHoldTimer ||= setTimeout(releaseHeldReveals, PHONE_REVEAL_SCROLL_IDLE_MS);
      return;
    }
    const id = mediaKey(node);
    const layer = mediaLayers(node).find((media) => !media.hidden);
    const failed = layer instanceof HTMLImageElement && !layer.naturalWidth;
    if (failed || reduced || !visibleMediaCards.has(id)) {
      dropCardSkeleton(node);
      if (!failed) showMedia(node);
      return;
    }
    if (!entry) {
      entry = { blur: false, revealing: false, animations: [] };
      cardSkeletons.set(node, entry);
    }
    entry.revealing = true;
    // Without blur, only swap the decoded photo so the crossfade does not paint a half-decoded frame (R2).
    const decoded = layer instanceof HTMLImageElement ? layer.decode().catch(() => {}) : Promise.resolve();
    decoded.then(() => {
      // A card leaving view during decode has had its skeleton dropped; the image must still show, otherwise it is stuck at opacity 0.
      if (cardSkeletons.get(node) !== entry) {
        if (!cardSkeletons.has(node)) showMedia(node);
        return;
      }
      if (!visibleMediaCards.has(id)) {
        dropCardSkeleton(node);
        showMedia(node);
        return;
      }
      const layers = mediaLayers(node);
      if (entry.colors) {
        // The image fades in over the color layer (kept under it by CSS); the layer is removed when the fade ends. No `fill`: the ready class set here holds opacity 1 afterwards.
        layers.forEach((media) => {
          media.style.setProperty("transition", "none", "important");
          media.classList.add("is-masonry-media-ready");
        });
        entry.animations = layers.map((media) => media.animate([{ opacity: 0 }, { opacity: 1 }],
          { duration: GHOST_FADE_MS, easing: GHOST_FADE_EASING }));
      } else if (entry.blur) {
        // The blur melts to 0 over 0.6s (progressive-loading R9). The breathing stops at exactly that moment: opacity goes from the breathing value to 1 on the same
        // rhythm, no flash; read before removing the attribute because once removed the CSS animation stops and the value read is always 1.
        const from = layers.map((media) => getComputedStyle(media).opacity);
        delete node.dataset.masonryMediaLoading;
        entry.animations = layers.map((media, index) => media.animate(
          [{ filter: CARD_LOADING_BLUR, opacity: from[index], scale: media.style.scale || "1" }, { filter: "none", opacity: 1, scale: "1" }],
          { duration: CARD_REVEAL_MS, easing: EASE.card, fill: "forwards" }));
      } else {
        layers.forEach((media) => {
          media.style.setProperty("transition", "none", "important");
          media.classList.add("is-masonry-media-ready");
        });
        entry.animations = playReveal({ to: layers }).animations;
      }
      Promise.all(entry.animations.map(({ finished }) => finished))
        .then(() => cardSkeletons.get(node) === entry && dropCardSkeleton(node), () => {});
    });
  };
  const syncCardSkeleton = (node) => {
    if (node.advertisingPendingMediaId?.()) {
      if (visibleMediaCards.has(mediaKey(node))) attachCardSkeleton(node);
      return;
    }
    if (cardSkeletons.has(node)) revealCard(node);
  };
  const clearCtaSkeleton = () => {
    ctaGeometryHash = "";
    for (const frame of skeletonFrameBySlot.values()) {
      skeletonObserver?.unobserve(frame);
      visibleSkeletonFrames.delete(frame);
      cancelSkeletonEntry(frame);
      skeletonAssignmentByFrame.delete(frame);
      releaseSkeletonRenderer(frame);
    }
    skeletonFrameBySlot.clear();
    ctaBatch.clear();
  };
  // The batch frame, CTA cluster and arc Glass slide from the old position at the same 0.4s ease transform rhythm as masonry cards, so the whole
  // page reads as one masonry on resize or filter change (owner 10/10). Use `translate` so the CTA's parallax
  // transform is not overridden.
  const slideFrom = (node, before) => {
    if (!before || !node.isConnected) return;
    const after = node.getBoundingClientRect();
    let dx = before.left - after.left;
    let dy = before.top - after.top;
    // The batch frame scales from its old size like a card (morphSize); the CTA cluster and Glass only slide.
    const scale = node.dataset.masonryCtaFrame && after.width && after.height
      ? `${before.width / after.width} ${before.height / after.height}` : "1 1";
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && scale === "1 1") return;
    // In detail the batch frame also goes around the primary like a related card (R10); coordinates are computed from the primary's top-left corner.
    // The CTA cluster and arc Glass span the whole grid, always below the primary: slide straight, do not read the primary rect.
    const box = node.dataset.masonryCtaFrame && ctaInDetail() && photoPrimary?.getBoundingClientRect();
    let corner = null;
    if (box?.width) {
      const size = { width: Math.max(before.width, after.width), height: Math.max(before.height, after.height) };
      // Pinned items as on related cards: the primary, then the pinned suggestion below it (detail R5).
      const pin = suggestionNode?.parentElement === relatedGrid && !suggestionNode.hidden && suggestionNode.getBoundingClientRect();
      const pinned = [{ x: 0, y: 0, width: box.width, height: box.height },
        ...(pin?.width ? [{ x: pin.left - box.left, y: pin.top - box.top, width: pin.width, height: pin.height }] : [])];
      const to = { x: after.left - box.left, y: after.top - box.top };
      const { from, plan } = planAroundPinned({ from: { x: before.left - box.left, y: before.top - box.top }, to, size,
        pinned, gap: relatedLayout?.primary.gap || 0 });
      corner = plan && { translate: `${plan.corner.x - to.x}px ${plan.corner.y - to.y}px`, offset: plan.cornerOffset };
      [dx, dy] = [from.x - to.x, from.y - to.y];
    }
    node.animate([{ translate: `${dx}px ${dy}px`, scale, transformOrigin: "0 0" }, ...(corner ? [corner] : []),
      { translate: "0 0", scale: "1 1", transformOrigin: "0 0" }], { duration: DUR.card, easing: "ease" });
  };
  const cancelCtaSlides = (nodes) => [...nodes].forEach((node) => node.getAnimations().forEach((animation) => {
    if (animation.effect?.getKeyframes?.()[0]?.translate) animation.cancel();
  }));
  const ctaSlideNodes = () => [...skeletonFrameBySlot.values(), gridCta, arcGlass].filter(Boolean);
  // The three CTA nodes (batch, cluster, arc Glass) are one set: in masonry they sit in the grid, in detail they move to the canvas at the end of related
  // (advertising-cta-center-parallax R9). Keeping the nodes means the Flow renderer, per-slot band and measured font size are not lost.
  const ctaInDetail = () => ctaBatch.host === "detail";
  // The batch yard. Going to detail: rerun the enter-view motion after the placement on the canvas (R9). Back to masonry keep the state
  // already shown: scrolling back to the old place with the CTA on screen does not hide then rerun it. In the cluster grid inherit variables from .masonry-section.
  const moveCtaNodes = (host) => ctaBatch.attach(host, host === "detail" && photoCanvas
    ? { skeletonParent: photoCanvas, clusterParent: photoCanvas, replay: true }
    : { skeletonParent: grid, clusterParent: gridSectionStyleTarget });
  // Write only on change: rewriting the same value of an inherited variable can still dirty the style of the whole subtree.
  const setStyleVar = (node, name, value) => {
    if (node && node.style.getPropertyValue(name) !== value) node.style.setProperty(name, value);
  };
  const setCtaHostHeight = (height) => {
    if (ctaInDetail()) setStyleVar(photoCanvas, "--detail-canvas-height", `${height}px`);
    else {
      gridHost.pixelHeight = height;
      grid.style.height = `${height}px`;
    }
  };
  const renderCtaSkeleton = ({ slide = false } = {}) => {
    const detailHost = ctaInDetail();
    const hostGeometry = detailHost ? relatedLayout?.layout : (activePhotoId ? null : geometry);
    if (!ctaSkeleton || !hostGeometry) {
      if (!detailHost) gridHost.pixelHeight = geometry?.totalPixelHeight || 0;
      clearCtaSkeleton();
      return;
    }
    // Each build costs 15-115ms on a slow CPU, so an open-detail pass builds only once, in the task after the related mount task (R9):
    // phases primary, warm, related do not place related yet, the cta phase waits for its own task; while on a photo the grid does not build (the batch goes to detail right away).
    if (detailHost ? directEntryPhase : browseHistory.current?.photo) return;
    // Read the visible position (including the previous slide) before cancelling that pass.
    const slideOrigins = slide ? new Map(ctaSlideNodes().map((node) => [node, node.getBoundingClientRect()])) : null;
    cancelCtaSlides(slideOrigins?.keys() || []);
    const gap = hostGeometry.interCardGap;
    const ctaTop = hostGeometry.totalPixelHeight + gap;
    // Read before any write: reading after writing a variable forces the browser to recompute style mid-task (A04s 60-140ms per build).
    const viewportHeight = getLayoutViewportHeight();
    lastCtaViewportHeight = viewportHeight;
    const footerHeight = siteFooter?.offsetHeight || 0;
    const room = viewportHeight / 2 - footerHeight - gap;
    const copyKey = `${room}:${gridCtaCopy?.clientWidth}:${document.documentElement.lang}`;
    // In detail the variables are set directly on the CTA cluster (the only place that uses them), not on the canvas: a changed inherited variable on the canvas
    // recomputes style for all of related. In the grid the runtime writes the in-between value onto .masonry-section when measuring masonry.
    const ctaVarHost = detailHost ? gridCta : gridSectionStyleTarget;
    setStyleVar(ctaVarHost, "--masonry-cta-top", `${ctaTop}px`);
    if (detailHost) {
      setStyleVar(gridCta, "--masonry-gap", `${gap}px`);
      gridCta?.style.removeProperty("visibility");
    }
    if (gridCtaHeading && gridCtaCopy && copyKey !== ctaCopyKey) {
      ctaCopyKey = copyKey;
      ctaCopyMetrics = fitGridCtaHeading(room);
      // The copy size after fit is the size ResizeObserver is about to report: do not treat it as a change that rebuilds a second time. Read while layout
      // is still clean after fit's measurement, before the variable writes below.
      const copyRect = gridCtaCopy.getBoundingClientRect();
      observedCopySize = `${copyRect.width}x${copyRect.height}`;
      // CSS sets the copy by dynamic viewport, so the address bar never rebuilds the batch.
      gridCta.style.setProperty("--masonry-cta-footer-height", `${footerHeight}px`);
      gridCta.style.setProperty("--masonry-cta-copy-below", `${ctaCopyMetrics.below}px`);
      requestAnimationFrame(() => { gridCta.dataset.masonryCtaSettled = "true"; });
    }
    // The last baseline sits D above the batch bottom; if the window is too short, the button keeps a gap from it.
    const baselineGap = Math.max(viewportHeight / 2 - footerHeight, gap + ctaCopyMetrics.below);
    const tailHeight = Math.max(Math.ceil(hostGeometry.cardWidth * 0.25) + 1,
      viewportHeight - gap - footerHeight, Math.ceil(baselineGap + ctaCopyMetrics.baseline));
    const nextCtaGeometryHash = `${detailHost ? "detail" : "grid"}:${hostGeometry.coordinateHash}:${tailHeight.toFixed(3)}`;
    // Same geometry: layoutRelated just rewrote the canvas height to the related height, so reset the CTA bottom.
    if (ctaGeometryHash === nextCtaGeometryHash) {
      if (detailHost) setCtaHostHeight(ctaBottom);
      return;
    }
    gridCta?.style.setProperty("--masonry-cta-tail-height", `${tailHeight}px`);
    const ctaHeight = gridCta?.offsetHeight || 0;
    // The height just measured is the height ResizeObserver is about to report: do not treat it as a change that rebuilds a second time.
    observedCtaHeight = ctaHeight;
    const gridBottom = ctaTop + ctaHeight;
    ctaBottom = gridBottom;
    // The batch ends right above the footer.
    const skeletonBoundaryBottom = gridBottom;
    const fragment = document.createDocumentFragment();
    const frameLayout = createSkeletonFlowFrameLayout({
      columnBottoms: hostGeometry.columnBottoms,
      columns: hostGeometry.columns,
      cardWidth: hostGeometry.cardWidth,
      gap: hostGeometry.interCardGap,
      boundaryBottom: skeletonBoundaryBottom,
      ...skeletonBatchConfig,
      seed: browseHistory.current.seed,
      bandAssignments: skeletonRatioBandBySlot,
      spanSkeleton: !detailHost,
    });
    frameLayout.forEach(({ slot, band }) => skeletonRatioBandBySlot.set(slot, band));
    const neededSlots = new Set(frameLayout.map(({ slot }) => slot));
    for (const [slot, frame] of skeletonFrameBySlot) {
      if (neededSlots.has(slot)) continue;
      cancelSkeletonEntry(frame);
      skeletonObserver?.unobserve(frame);
      visibleSkeletonFrames.delete(frame);
      skeletonAssignmentByFrame.delete(frame);
      releaseSkeletonRenderer(frame);
      skeletonFrameBySlot.delete(slot);
      revealedSkeletonSlots.delete(slot);
      frame.remove();
    }
    frameLayout.forEach(({ slot, column, span, depth, band, top, height }) => {
        let frame = skeletonFrameBySlot.get(slot);
        if (!frame) {
          frame = createSkeletonFrame();
          frame.dataset.masonryCtaSlot = slot;
          // A slot coming back shows its color immediately; a new slot draws on first entering view.
          if (skeletonAssignmentByKey.has(slot)) assignSkeleton(frame);
          if (revealedSkeletonSlots.has(slot)) frame.classList.add("is-entry-ready");
          fragment.append(frame);
          skeletonFrameBySlot.set(slot, frame);
        }
        frame.dataset.masonryCtaFrame = "true";
        frame.dataset.masonryCtaColumn = String(column);
        frame.dataset.masonryCtaSpan = String(span);
        frame.dataset.masonryCtaDepth = String(depth);
        frame.dataset.masonryCtaRatioBand = band;
        frame.dataset.masonryCtaSlot = slot;
        frame.style.left = `${column * (hostGeometry.cardWidth + hostGeometry.interCardGap)}px`;
        frame.style.top = `${top}px`;
        frame.style.width = `${span * hostGeometry.cardWidth + (span - 1) * hostGeometry.interCardGap}px`;
        frame.style.height = `${height}px`;
        frame.style.setProperty("--masonry-cta-frame-opacity", "1");
    });
    ctaGeometryHash = nextCtaGeometryHash;
    ctaSkeleton.append(fragment);
    ctaSkeleton.hidden = false;
    ctaSkeleton.dataset.masonryCtaColumns = String(hostGeometry.columns);
    ctaSkeleton.dataset.masonryCtaReady = "true";
    ctaSkeleton.dataset.masonryCtaRealBottom = String(hostGeometry.totalPixelHeight);
    ctaSkeleton.dataset.masonryCtaSignature = `${ctaGeometryHash}:${gridBottom.toFixed(3)}`;
    if (arcGlass) {
      // CTA cluster (from heading start to link end) at the scroll limit, where parallax is zero.
      const clusterBottom = skeletonBoundaryBottom - baselineGap + ctaCopyMetrics.below;
      // Show before measuring: a hidden box has no width.
      arcGlass.hidden = false;
      layoutArcGlass(arcGlass, arcGlassGeometry({
        width: arcGlass.clientWidth,
        batchBottom: skeletonBoundaryBottom,
        realBottom: hostGeometry.totalPixelHeight,
        cardWidth: hostGeometry.cardWidth,
        clusterTop: clusterBottom - ctaCopyMetrics.baseline - ctaCopyMetrics.below,
        clusterBottom,
      }));
    }
    ctaSkeleton.style.height = `${skeletonBoundaryBottom}px`;
    setCtaHostHeight(gridBottom);
    ctaBatch.placed();
    ctaSkeleton.querySelectorAll("[data-masonry-cta-frame]").forEach((frame) => {
      if (skeletonObserver) skeletonObserver.observe(frame);
      else visibleSkeletonFrames.add(frame);
    });
    syncSkeletonMotion();
    syncCtaParallax();
    // The arc Glass changes shape with the new width; it slides by the CTA cluster's displacement.
    if (slideOrigins && gridCta && arcGlass) {
      const cta = slideOrigins.get(gridCta);
      const glass = slideOrigins.get(arcGlass);
      if (cta && glass) slideOrigins.set(arcGlass, new DOMRect(arcGlass.getBoundingClientRect().left,
        arcGlass.getBoundingClientRect().top + cta.top - gridCta.getBoundingClientRect().top));
    }
    // The new frame starts right below the frame that preceded it in the old layout, like the next item of the old masonry.
    if (slideOrigins) {
      let previous = null;
      frameLayout.forEach(({ slot }) => {
        const frame = skeletonFrameBySlot.get(slot);
        if (!slideOrigins.has(frame) && previous) {
          const { width, height } = frame.getBoundingClientRect();
          const scale = previous.width / width;
          slideOrigins.set(frame, new DOMRect(previous.left, previous.bottom + gap * scale, previous.width, height * scale));
        }
        previous = slideOrigins.get(frame);
      });
    }
    slideOrigins?.forEach((before, node) => slideFrom(node, before));
  };

  // `scrolling`: a scroll frame does not change geometry, so an already-built CTA batch is not re-measured (each frame's measurement forces layout).
  const renderWindow = ({ animate = false, origins: visualOrigins, scrolling = false } = {}) => {
    if (!geometry || activePhotoId) return;
    let origins = visualOrigins;
    if (ctaDeferred) gridHost.pixelHeight = geometry.totalPixelHeight;
    else if (!scrolling || !ctaGeometryHash) renderCtaSkeleton({ slide: animate && hasLaidOut && !reduced });
    // The grid changing height makes the browser clamp the scroll (at page bottom); cards must start from where they are visible on
    // screen, otherwise they fly off by exactly the clamp amount then snap back (measured on PC, round 26).
    if (origins?.gridTop !== undefined) {
      const shift = origins.gridTop - grid.getBoundingClientRect().top;
      if (shift) origins = new Map([...origins].map(([id, origin]) => [id, { ...origin, y: origin.y + shift }]));
    }
    if (gridHost.motionFrame && !animate) return;
    if (gridHost.motionFrame) {
      cancelAnimationFrame(gridHost.motionFrame);
      gridHost.motionFrame = 0;
    }
    gridHost.cancelGhosts();
    // Normal scroll keeps cards in the hysteresis zone and builds within the frame budget; motion layout (animate) builds and removes by
    // the build zone as before (R7).
    const { keep: normalKeep, mount, visiblePlacements, scrollTop, viewportHeight, visibleBottom } = virtualWindow({ hysteresis: !animate });
    const fastScroll = gridHost.budget.begin(currentVisualY, viewportHeight);
    const currentKeep = new Set(gridHost.rendered.keys());
    const membershipChanged = [...mount].some((id) => !currentKeep.has(id))
      || [...currentKeep, ...gridHost.ghosts.ids()].some((id) => !normalKeep.has(id));
    const geometrySignature = geometry.coordinateHash;
    const geometryChanged = geometrySignature !== lastGeometrySignature;
    if (hasLaidOut && !membershipChanged && !geometryChanged) return;
    // Same geometry and no motion means coordinates are already in positions from last time: do not rebuild the 285-card map every scroll frame.
    const samePositions = hasLaidOut && !geometryChanged && !animate && positionsGeometry === geometry;
    const nextPositions = samePositions ? gridHost.positions : new Map(geometry.placements.map((placement) => [placement.card.id, { x: placement.x, y: placement.y }]));
    const hasCoordinateDiff = samePositions ? false : coordinateChanged(nextPositions);
    if (hasLaidOut && !membershipChanged && !hasCoordinateDiff && !geometryChanged) return;
    const shouldAnimate = animate && (membershipChanged || hasCoordinateDiff || !hasLaidOut);
    const retainCohort = shouldAnimate && !reduced;
    const keep = retainCohort ? new Set([...currentKeep, ...normalKeep]) : normalKeep;
    const created = new Set();
    const seeded = new Set();
    // Real cards built fresh in this frame: forced-keep cards (just opened detail) are always built, the rest by quota, handed out
    // viewport-intersecting and near-screen-center first. The first layout and motion layout build everything. The rest are temp cards.
    let allowed = null;
    // Temp cards keep the coordinates of the old geometry: when geometry changes (window resize, filter) drop them all and rebuild by the new geometry.
    if (animate || geometryChanged) {
      gridHost.ghosts.clear();
      gridHost.detached.clear();
    }
    if (firstBuild) {
      // The rest of the window shows temp cards and mounts within the frame budget after the entry slide (mountGhosts).
      allowed = new Set(visiblePlacements.filter((placement) => placement.index < 8
        || (placement.y < visibleBottom && placement.y + placement.pixelHeight > scrollTop)).map((placement) => placement.card.id));
    } else if (!animate && hasLaidOut) {
      const center = scrollTop + viewportHeight / 2;
      const distance = (placement) => Math.abs(placement.y + placement.pixelHeight / 2 - center);
      const placementOf = new Map(visiblePlacements.map((placement) => [placement.card.id, placement]));
      allowed = gridHost.pickMounts({
        missing: [...placementOf.keys()].filter((id) => !gridHost.rendered.has(id)),
        mustMount: (id) => retainedPhotoIds.has(id),
        distance: (id) => distance(placementOf.get(id)),
        fast: fastScroll,
      });
    }
    if (origins && shouldAnimate && !reduced) {
      for (const [id, node] of gridHost.rendered) {
        const origin = origins.get(id);
        if (!origin || node.hidden) continue;
        node.style.left = `${origin.x}px`;
        node.style.top = `${origin.y}px`;
        node.style.transform = "none";
      }
    }
    if (!samePositions) {
      gridHost.positions.clear();
      nextPositions.forEach((position, id) => gridHost.positions.set(id, position));
      for (const [id] of gridHost.rendered) {
        if (!gridHost.positions.has(id) && origins?.has(id)) gridHost.positions.set(id, origins.get(id));
      }
      positionsGeometry = geometry;
    }

    gridHost.release(keep, { queue: !animate && !geometryChanged });
    gridHost.ghosts.prune(keep);
    // If temp cards still await building, build in the next frame; if that frame already has a scroll rAF running right after, one renderWindow is
    // enough, so reschedule for the next frame so no pass is lost.
    // While cards slide (motion layout), placing new cards would snap the sliding ones: settleMotion runs the pass after the slide.
    const mountGhosts = () => {
      if (gridHost.motionFrame || performance.now() < motionUntil) pendingScroll = true;
      else if (scrollFrame) gridHost.scheduleGhosts(mountGhosts);
      else renderWindow({ scrolling: true });
    };
    for (const [node, { card: { id }, x }] of gridHost.mount(visiblePlacements, { allowed, render: mountGhosts })) {
      created.add(id);
      const origin = origins?.get(id) || (shouldAnimate && !reduced ? { x, y: 0 } : null);
      if (origin) {
        node.style.left = `${origin.x}px`;
        node.style.top = `${origin.y}px`;
        seeded.add(id);
      }
    }
    for (const placement of visiblePlacements) {
      const node = gridHost.rendered.get(placement.card.id);
      if (!node) continue;
      // Same geometry means card size is unchanged: do not rewrite style and aria every scroll frame.
      if (node.advertisingSizedBy !== geometry) {
        sizeNode(node, placement, geometry.placements.length);
        node.advertisingSizedBy = geometry;
      }
      node.hidden = false;
    }
    for (const [id, node] of gridHost.rendered) node.hidden = retainCohort && !normalKeep.has(id);
    // New cards attach at the end of the grid (fragment) so DOM order drifts; removing cards does not. The motion cohort keeps temporary order.
    if (retainCohort) domOrderDirty = true;
    else if (domOrderDirty || created.size) {
      restoreCanonicalDomOrder();
      domOrderDirty = false;
    }
    if (seeded.size) void grid.offsetHeight;
    grid.style.height = `${gridHost.pixelHeight}px`;
    const applyLayout = () => {
      if (!shouldAnimate || reduced) placeRendered();
      else {
        gridHost.layoutMotion((element) => element.hidden
          || (created.has(element.dataset.masonryCard) && !seeded.has(element.dataset.masonryCard)));
        for (const [id, node] of gridHost.rendered) if (!node.hidden && origins?.get(id)?.w) morphSize(node, origins.get(id));
      }
      hasLaidOut = true;
      lastGeometrySignature = geometrySignature;
      if (shouldAnimate && !reduced) {
        motionUntil = performance.now() + DUR.card;
        if (gridHost.motionTimer) clearTimeout(gridHost.motionTimer);
        gridHost.motionTimer = setTimeout(settleMotion, DUR.card);
      }
      // New cards need LazySizes to examine them; already-mounted cards are handled by the IntersectionObserver.
      if (created.size || geometryChanged || shouldAnimate) window.lazySizes?.loader?.checkElems?.();
      // site:layout runs Locomotive update(), which mid-scroll makes the page jump forward one step; cards swapped by
      // virtualization keep the page height, so layout is reported only when the height changes (scroll-feel R1). Reading offsetHeight
      // forces layout, so read it only when the grid height or geometry changes.
      if (geometryChanged || shouldAnimate || gridHost.pixelHeight !== announcedGridHeight) {
        announcedGridHeight = gridHost.pixelHeight;
        const pageHeight = (grid.closest("[data-scroll-container]") || document.documentElement).offsetHeight;
        if (pageHeight !== announcedPageHeight) {
          announcedPageHeight = pageHeight;
          window.dispatchEvent(new CustomEvent("site:layout"));
        }
      }
    };
    if (seeded.size && animate && !reduced) {
      void grid.offsetHeight;
      gridHost.motionFrame = requestAnimationFrame(() => {
        gridHost.motionFrame = 0;
        applyLayout();
      });
      return;
    }
    applyLayout();
  };

  const focusVirtualPlacement = (placement, { focus = true, scrollIntoView = true } = {}) => {
    // Card not built yet (Tab to a card outside the window): build it right away, dropping its temp card.
    const node = gridHost.ensure(placement);
    gridHost.ghosts.drop(placement.card.id);
    node.hidden = false;
    sizeNode(node, placement, geometry.placements.length);
    restoreCanonicalDomOrder();
    // An instant relayout mid-transition would stack the running transform onto the new top.
    gridHost.cancelTransitions();
    placeRendered();
    const anchor = node.querySelector("a");
    if (focus) anchor?.focus({ preventScroll: true });
    if (scrollIntoView) node.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
    renderWindow();
    window.lazySizes?.loader?.checkElems?.();
  };

  const measure = ({ animate = false, origins } = {}) => {
    const layoutViewportWidth = document.documentElement.clientWidth;
    if (!layoutViewportWidth) return;
    const { outer, interCardGap } = masonrySpacing(layoutViewportWidth);
    const projectIndex = grid.closest(".masonry-section");
    projectIndex?.style.setProperty("--masonry-outer", `${outer}px`);
    projectIndex?.style.setProperty("--masonry-gap", `${interCardGap}px`);
    grid.style.setProperty("--masonry-gap", `${interCardGap}px`);
    const gridWidth = grid.clientWidth;
    if (!gridWidth) return;
    lastMeasuredGridWidth = gridWidth;
    lastLayoutViewportWidth = layoutViewportWidth;
    geometry = geometryFor(filter);
    renderWindow({ animate, origins });
  };

  // Title per filter page (taxonomy R4); data-vi, data-en kept for the next locale change.
  // The hero kicker stays still when filtering, keeping the text of the loaded page (owner 2026-11-08).
  const syncPageHeading = () => {
    const page = pages.find((entry) => entry.filter === filter) || pages.find((entry) => entry.filter === "all");
    const node = document.querySelector("title");
    if (!page || !node) return;
    node.dataset.vi = page.titleVi;
    node.dataset.en = page.titleEn;
    node.textContent = locale === "en" ? page.titleEn : page.titleVi;
  };
  const setActiveFilter = (nextFilter, { animate = false } = {}) => {
    cancelLayoutWait();
    if (nextFilter === filter) return;
    const visualOrigins = animate && performance.now() < motionUntil ? visualCoordinates() : undefined;
    const origins = animate ? cachedCoordinates(nextFilter, visualOrigins) : undefined;
    cancelMotion();
    clearCtaSkeleton();
    resetSkeletonRevealState();
    resetSkeletonAssignments();
    skeletonRatioBandBySlot.clear();
    filter = nextFilter;
    syncRail({ animate });
    syncPageHeading();
    measure({ animate, origins });
  };
  const getLogicalScroll = () => scroll?.getLogicalScroll?.() ?? currentVisualY;
  const setLogicalScroll = (scrollY) => scroll?.setLogicalScroll?.(scrollY) ?? false;
  const ensurePhoto = (id, { focus = false, scrollIntoView = false } = {}) => {
    const card = cards.find((entry) => entry.id === id);
    if (!card) return null;
    if (!matchesFilter(card, filter)) setActiveFilter(card.category);
    if (!geometry) measure();
    const placement = geometry?.placements.find((entry) => entry.card.id === id);
    if (!placement) return null;
    retainedPhotoIds.add(id);
    focusVirtualPlacement(placement, { focus, scrollIntoView });
    return gridHost.rendered.get(id) || null;
  };
  const categoryById = new Map(categories.map((category) => [category.slug, category]));
  // The thumbnail strip and description fade at the edge while content remains, the description scrollbar follows scroll position (owner 2026-10-24).
  const syncScrollFade = (node, before, after) => {
    node.toggleAttribute("data-fade-start", before > 1);
    node.toggleAttribute("data-fade-end", after > 1);
  };
  const syncScrollHints = () => {
    for (const strip of [photoMediaThumbs, photoViewerThumbs]) {
      if (!strip) continue;
      const { scrollLeft, scrollWidth, clientWidth } = strip;
      syncScrollFade(strip, scrollLeft, scrollWidth - clientWidth - scrollLeft);
    }
    if (!photoDescriptionScroll) return;
    const { scrollTop, scrollHeight, clientHeight } = photoDescriptionScroll;
    const room = scrollHeight - clientHeight;
    syncScrollFade(photoDescriptionScroll, scrollTop, room - scrollTop);
    photoDescriptionBar.hidden = room <= 1;
    descriptionThumbHeight = Math.max(24, clientHeight * clientHeight / scrollHeight);
    photoDescriptionBar.style.setProperty("--thumb-height", `${descriptionThumbHeight}px`);
    photoDescriptionBar.style.setProperty("--thumb-top", `${room > 1 ? scrollTop / room * (clientHeight - descriptionThumbHeight) : 0}px`);
  };
  // When the frame or content changes size (layout, font, card change, locale change) re-measure after layout, without forcing a separate layout.
  const scrollHintObserver = new ResizeObserver(syncScrollHints);
  if (photoDescriptionScroll) [photoDescriptionScroll, photoDescription].forEach((node) => scrollHintObserver.observe(node));
  if (photoViewerThumbs) scrollHintObserver.observe(photoViewerThumbs);
  photoViewerThumbs?.addEventListener("scroll", syncScrollHints, { passive: true, signal: controller.signal });
  // The viewer thumbnail strip hides itself when the mouse is still for 3s; moving the mouse or pressing a key shows it again. Mouse over the strip or keyboard
  // focus inside the strip keeps it visible (owner 2026-10-26).
  let viewerThumbsTimer = 0;
  const wakeViewerThumbs = () => {
    photoViewerThumbs?.removeAttribute("data-viewer-idle");
    clearTimeout(viewerThumbsTimer);
    viewerThumbsTimer = setTimeout(() => {
      if (!photoViewerThumbs?.matches(":hover, :has(:focus-visible)")) {
        photoViewerThumbs?.setAttribute("data-viewer-idle", "");
      }
    }, 3000);
  };
  photoExpand?.addEventListener("click", wakeViewerThumbs, { signal: controller.signal });
  photoDialog?.addEventListener("pointermove", (event) => {
    if (event.pointerType === "mouse") wakeViewerThumbs();
  }, { signal: controller.signal });
  // Left/right arrows change media like clicking a thumbnail; when the image is zoomed the viewer uses arrows to pan the image (preventDefault).
  photoDialog?.addEventListener("keydown", (event) => {
    wakeViewerThumbs();
    if (event.defaultPrevented || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
      || event.target.matches("input")) return;
    event.preventDefault();
    photoViewerThumbs?.children[primaryIndex() + (event.key === "ArrowRight" ? 1 : -1)]?.click();
  }, { signal: controller.signal });
  // If the viewed thumbnail is outside the frame or in the fade zone, scroll the strip to bring it to the center; a hidden strip (viewer closed) is skipped.
  const keepActiveThumbInView = () => {
    syncScrollHints();
    for (const node of [photoMediaThumbs, photoViewerThumbs]) {
      const button = node?.querySelector('[aria-current="true"]');
      if (!button || !node.clientWidth) continue;
      const strip = node.getBoundingClientRect();
      const box = button.getBoundingClientRect();
      const fade = (name) => node.hasAttribute(name) ? 60 : 0;
      if (box.left >= strip.left + fade("data-fade-start") - 1 && box.right <= strip.right - fade("data-fade-end") + 1) continue;
      node.scrollBy({ left: box.left + box.width / 2 - strip.left - strip.width / 2, behavior: reduced ? "auto" : "smooth" });
    }
  };
  const renderSuggestionLinks = (browse, english) => {
    if (!suggestionNode) return;
    const heroChanged = suggestionSlotHeroId !== browse.photo;
    if (heroChanged) {
      stopSuggestionSlides?.();
      suggestionSlotHeroId = browse.photo;
      suggestionSlots = selectSuggestions({
        cards,
        heroId: browse.photo,
        activeTag: browse.tag,
        tagRegistry: artifact.tagRegistry || [],
      });
      const links = document.createElement("div");
      links.className = "detail-view__suggestion-links";
      suggestionSlots.forEach(({ card, tag }, index) => {
        const link = document.createElement("button");
        link.type = "button";
        link.className = "detail-view__suggestion-link card-interactive card-media";
        link.dataset.mediaFrame = "";
        link.dataset.masonrySuggestionTag = tag.id;
        link.dataset.masonrySuggestionIndex = String(index);
        const first = suggestionDeck(tag.id, cards.filter(candidate => candidate.tagIds?.includes(tag.id)))[0] || card;
        link.dataset.masonrySuggestionRepresentative = first.id;
        const image = createPhotoMedia(first, locale, { suggestion: true });
        image.dataset.masonrySuggestionImageLayer = "current";
        image.dataset.masonrySuggestionPhoto = first.id;
        const label = document.createElement("span");
        label.className = "detail-view__suggestion-label";
        // A span wraps the text so the hover underline is exactly as long as the text line (shared rule with portal, style.css).
        label.append(document.createElement("span"));
        link.append(image, label);
        links.append(link);
      });
      const previousLinks = suggestionNode.querySelector(".detail-view__suggestion-links");
      if (previousLinks) resizeObserver.unobserve(previousLinks);
      suggestionNode.replaceChildren(...[suggestionTitle, links].filter(Boolean));
      resizeObserver.observe(links);
      stopSuggestionSlides = mountSuggestionSlides(suggestionNode, {
        cards, isReduced: () => reduced, signal: controller.signal,
        createImage: card => createPhotoMedia(card, locale, { suggestion: true }),
      });
    }
    suggestionNode.querySelectorAll("[data-masonry-suggestion-tag]").forEach((link) => {
      const slot = suggestionSlots.find(({ tag }) => tag.id === link.dataset.masonrySuggestionTag);
      if (!slot) return;
      link.setAttribute("aria-pressed", String(browse.tag === slot.tag.id));
      link.querySelector(".detail-view__suggestion-label > span").textContent = english ? slot.tag.labelEn : slot.tag.labelVi;
    });
    suggestionNode.hidden = suggestionSlots.length === 0;
    suggestionNode.dataset.masonryRelatedItem = "advertising-suggestion";
    suggestionNode.dataset.rank = "0";
    suggestionNode.dataset.sourceOrder = "0";
  };
  const syncLocaleLinks = (browse) => {
    document.querySelectorAll("[data-language-option]").forEach((link) => {
      link.href = serializeBrowseLocation(link.href, browse, categories, pages).href;
    });
  };
  const clearRelatedCards = () => {
    cancelRelatedMotion();
    relatedHost.masonry?.destroy();
    relatedHost.masonry = null;
    relatedHost.rendered.forEach((node) => {
      releaseMediaCard(node);
      node.remove();
    });
    relatedHost.rendered.clear();
    relatedHost.detached.clear();
    relatedHost.ghosts.clear();
    relatedHost.positions.clear();
    relatedLayoutKey = "";
    relatedMeasuredGeometry = null;
  };
  // Which relatedLayout the card was sized for; the same layout means scrolling does not rewrite it.
  const relatedSized = new WeakMap();
  const ensureRelatedPhoto = (id) => {
    const placement = relatedLayout?.photoPlacements.find((entry) => entry.card.id === id);
    if (!placement || !relatedGrid) return null;
    const node = relatedHost.ensure(placement);
    if (relatedSized.get(node) === relatedLayout) return node;
    relatedSized.set(node, relatedLayout);
    node.style.width = `${placement.pixelWidth}px`;
    sizeLazyImage(node, placement);
    node.style.height = `${placement.pixelHeight}px`;
    node.style.setProperty("--masonry-media-height", `${placement.mediaPixelHeight}px`);
    node.dataset.masonrySpan = String(placement.width);
    node.dataset.masonryPlacementIndex = String(placement.index);
    node.setAttribute("role", "listitem");
    node.setAttribute("aria-posinset", String(placement.index + 1));
    node.setAttribute("aria-setsize", String(relatedLayout.layout.placements.length));
    return node;
  };
  // The suggestion button is as wide as the suggestion cell (single-column grid): pin sizes by the solver instead of "auto". Chrome re-selects the image
  // when the "auto" width changes while a request is running, cancelling then reloading the same URL (issue #655).
  const pinSuggestionSizes = (width) => {
    suggestionNode.querySelectorAll("img[srcset]").forEach((image) => {
      const sizes = `${Math.ceil(width)}px`;
      if (image.sizes !== sizes) image.sizes = sizes;
    });
  };
  const ensureSuggestionCard = () => {
    const placement = relatedLayout?.suggestionPlacement;
    if (!placement || !suggestionNode) return null;
    suggestionNode.hidden = false;
    suggestionNode.style.width = `${placement.pixelWidth}px`;
    suggestionNode.style.height = `${placement.pixelHeight}px`;
    pinSuggestionSizes(placement.pixelWidth);
    suggestionNode.dataset.masonryPlacementIndex = String(placement.index);
    suggestionNode.setAttribute("role", "listitem");
    suggestionNode.setAttribute("aria-posinset", String(placement.index + 1));
    suggestionNode.setAttribute("aria-setsize", String(relatedLayout.layout.placements.length));
    return suggestionNode;
  };
  const restoreRelatedDomOrder = () => {
    if (!relatedLayout || !relatedGrid) return;
    const focused = relatedGrid.contains(document.activeElement) ? document.activeElement : null;
    let cursor = relatedGrid.firstElementChild;
    if (cursor === relatedHost.ghosts.layer) cursor = cursor.nextElementSibling;
    for (const placement of relatedLayout.layout.placements) {
      const node = placement.card.kind === "suggestion" ? suggestionNode : relatedHost.rendered.get(placement.card.id);
      if (!node) continue;
      if (node === cursor) cursor = cursor.nextElementSibling;
      else relatedGrid.insertBefore(node, cursor);
    }
    if (focused?.isConnected && document.activeElement !== focused) focused.focus({ preventScroll: true });
  };
  const relatedVisualCoordinates = () => {
    const rect = relatedGrid.getBoundingClientRect();
    const nodes = [...relatedHost.rendered];
    if (relatedLayout?.suggestionPlacement && suggestionNode?.dataset.masonryRelatedItem && !suggestionNode.hidden) {
      nodes.push([suggestionNode.dataset.masonryRelatedItem, suggestionNode]);
    }
    return new Map(nodes.filter(([, node]) => !node.hidden)
      .map(([id, node]) => {
        const position = node.getBoundingClientRect();
        return [id, { x: position.left - rect.left, y: position.top - rect.top, w: position.width, h: position.height }];
      }));
  };
  // Cards going around the primary run Web Animations on `translate`, separate from Masonry's `transform` (advertising-cta-center-parallax R10).
  const cancelRelatedDetours = () => {
    for (const node of [...relatedHost.rendered.values(), suggestionNode]) {
      node?.getAnimations().forEach((animation) => animation.id === "related-detour" && animation.cancel());
    }
  };
  const cancelRelatedMotion = () => {
    relatedHost.stopMotion();
    cancelRelatedDetours();
  };
  const renderRelatedWindow = ({ animate = false, origins } = {}) => {
    if (!relatedLayout || !relatedGrid || photoView?.hidden) return;
    // On direct entry related cards mount in their own task; a scroll or resize before then must not mount them before they animate.
    if (!animate && (relatedHost.motionFrame || relatedHost.motionTimer || directEntryPhase)) return;
    const gridTop = relatedGrid.getBoundingClientRect().top + getLogicalScroll();
    const visible = getVisibleViewport();
    const relatedScrollTop = Math.max(0, getLogicalScroll() + visible.top - gridTop);
    // Like the main masonry (R7): build within one viewport at most, remove beyond two viewports (does not apply to motion layout).
    const windowed = getVirtualWindow(relatedLayout.layout, {
      overscan: visible.height,
      releaseOverscan: animate ? visible.height : visible.height * 2,
      scrollTop: relatedScrollTop,
      viewportHeight: visible.height,
    });
    const relatedFast = relatedHost.budget.begin(relatedScrollTop, visible.height);
    const normalKeep = new Set(windowed.items.map((placement) => placement.card.id));
    const suggestionId = relatedLayout.suggestionPlacement?.card.id;
    if (suggestionId && suggestionNode?.contains(document.activeElement)) normalKeep.add(suggestionId);
    const keepSuggestion = Boolean(suggestionId && normalKeep.has(suggestionId));
    const validPhotoIds = new Set(relatedLayout.photoPlacements.map((placement) => placement.card.id));
    const anchorId = browseHistory?.current?.detail?.anchorId;
    if (validPhotoIds.has(anchorId)) normalKeep.add(anchorId);
    for (const [id, node] of relatedHost.rendered) {
      if (!node.contains(document.activeElement)) continue;
      if (validPhotoIds.has(id)) normalKeep.add(id);
      else photoInfo?.focus({ preventScroll: true });
    }
    for (const id of retainedPhotoIds) {
      if (validPhotoIds.has(id)) normalKeep.add(id);
    }
    const normalPhotoKeep = new Set([...normalKeep].filter((id) => id !== suggestionId));
    // A card in the hysteresis zone (outside the build zone) that is not mounted is not built; if mounted, keep it.
    const retainedKeep = new Set([...normalPhotoKeep, ...windowed.retained.map((placement) => placement.card.id).filter((id) => validPhotoIds.has(id))]);
    if (!animate
      && [...normalPhotoKeep].every((id) => relatedHost.rendered.has(id))
      && [...relatedHost.rendered.keys(), ...relatedHost.ghosts.ids()].every((id) => retainedKeep.has(id))
      && (!suggestionId || suggestionNode?.hidden === !keepSuggestion)) return;
    const motion = animate && !reduced;
    const keep = motion ? new Set([...relatedHost.rendered.keys(), ...normalPhotoKeep]) : retainedKeep;
    relatedHost.positions.clear();
    for (const placement of relatedLayout.layout.placements) relatedHost.positions.set(placement.card.id, { x: placement.x, y: placement.y });
    // Unmounted cards are built by quota, near-screen-center first; the rest are temp cards (R7). Motion layout builds everything.
    if (animate) relatedHost.ghosts.clear();
    let relatedAllowed = null;
    const placementOf = new Map(relatedLayout.photoPlacements.map((placement) => [placement.card.id, placement]));
    if (!animate) {
      const center = relatedScrollTop + visible.height / 2;
      const distance = (id) => {
        const placement = placementOf.get(id);
        return placement ? Math.abs(placement.y + placement.pixelHeight / 2 - center) : Infinity;
      };
      relatedAllowed = relatedHost.pickMounts({
        missing: [...normalPhotoKeep].filter((id) => !relatedHost.rendered.has(id)),
        mustMount: (id) => retainedPhotoIds.has(id) || id === anchorId,
        distance,
        fast: relatedFast,
      });
    }
    relatedHost.ghosts.prune(keep);
    const photoPlacements = [...normalPhotoKeep].map((id) => placementOf.get(id));
    relatedHost.mount(photoPlacements, { allowed: relatedAllowed, render: () => renderRelatedWindow() });
    // A card already in the yard resizes to the new layout; a card that is still a temp card does not.
    photoPlacements.forEach(({ card: { id } }) => relatedHost.rendered.has(id) && ensureRelatedPhoto(id));
    if (keepSuggestion) ensureSuggestionCard();
    // Not placed in the related grid yet (primary phase of direct-entry) so it stays hidden until the solver places it.
    else if (suggestionNode) suggestionNode.hidden = suggestionId || suggestionNode.parentElement === relatedGrid ? true : suggestionSlots.length === 0;
    for (const [id, node] of relatedHost.rendered) {
      if (!keep.has(id)) continue;
      node.hidden = motion && !normalKeep.has(id);
      if (!relatedHost.positions.has(id)) relatedHost.positions.set(id, origins?.get(id) || { x: 0, y: 0 });
    }
    relatedHost.release(keep, { queue: !relatedQueueStale });
    relatedQueueStale = false;
    // A card with a straight line crossing the primary: place it at the destination right away then slide with `translate` around the right angle (R10).
    const detours = new Map();
    const placementById = motion ? new Map(relatedLayout.layout.placements.map((placement) => [placement.card.id, placement])) : null;
    const suggestionPosition = keepSuggestion && relatedHost.positions.get(suggestionId);
    const suggestionPlacement = relatedLayout.suggestionPlacement;
    const suggestionBox = suggestionPosition && suggestionPlacement ? {
      x: suggestionPosition.x, y: suggestionPosition.y,
      width: suggestionPlacement.pixelWidth, height: suggestionPlacement.pixelHeight,
    } : null;
    // Pinned items: primary, then the pinned suggestion below it; cards go around both, not sliding underneath (owner 2026-11-07).
    const pinned = [{ x: 0, y: 0, width: relatedLayout.primary.width, height: relatedLayout.primary.height },
      ...(suggestionBox ? [suggestionBox] : [])];
    const planDetour = (id, node, origin, destination) => {
      const placement = placementById?.get(id);
      const start = origins?.get(id);
      if (!start || !placement || (start.x === destination.x && start.y === destination.y)) return origin;
      const size = { width: Math.max(start.w || 0, placement.pixelWidth), height: Math.max(start.h || 0, placement.pixelHeight) };
      const { from, plan } = planAroundPinned({ from: start, to: destination, size, pinned, gap: relatedLayout.primary.gap });
      if (!plan) return from;
      detours.set(node, { from, to: destination, plan });
      return destination;
    };
    for (const [id, node] of relatedHost.rendered) {
      const destination = relatedHost.positions.get(id);
      if (!destination || node.hidden) continue;
      // A new card enters from the top of the column: below the primary, or below the suggestion in its column.
      const columnHead = suggestionBox && destination.x < suggestionBox.x + suggestionBox.width
        ? suggestionBox.y + suggestionBox.height + relatedLayout.primary.gap
        : destination.x < relatedLayout.primary.width ? relatedLayout.primary.height + relatedLayout.primary.gap : 0;
      let origin = motion ? origins?.get(id) || { x: destination.x, y: columnHead } : destination;
      if (motion) origin = planDetour(id, node, origin, destination);
      // Write only on change: scrolling related rewrites every mounted card on each window change.
      const left = `${origin.x}px`;
      const top = `${origin.y}px`;
      if (node.style.left !== left) node.style.left = left;
      if (node.style.top !== top) node.style.top = top;
      if (node.style.transform !== "none") node.style.transform = "none";
    }
    // The suggestion pins below the primary, following the primary's bottom in the same frame, no shuffle (advertising-detail R5).
    if (keepSuggestion && suggestionNode) {
      const destination = relatedHost.positions.get(suggestionId);
      suggestionNode.style.left = `${destination.x}px`;
      suggestionNode.style.top = `${destination.y}px`;
      suggestionNode.style.transform = "none";
    }
    restoreRelatedDomOrder();
    // Without motion the position was already written above; drop Masonry like placeRendered, because layout() re-measures every card (getSize)
    // during related scrolling, a long task on an Android phone (decision phone-frame-budget).
    if (!motion) {
      relatedGrid.style.height = `${relatedHost.pixelHeight}px`;
      return;
    }
    void relatedGrid.offsetHeight;
    relatedHost.motionFrame = requestAnimationFrame(() => {
      relatedHost.motionFrame = 0;
      relatedHost.layoutMotion((element) => element.hidden || element === suggestionNode || detours.has(element));
      for (const [node, { from, to, plan }] of detours) {
        node.animate([
          { translate: `${from.x - to.x}px ${from.y - to.y}px` },
          { translate: `${plan.corner.x - to.x}px ${plan.corner.y - to.y}px`, offset: plan.cornerOffset },
          { translate: "0px 0px" },
        ], { id: "related-detour", duration: DUR.card, easing: "ease" });
      }
      relatedHost.motionTimer = setTimeout(() => {
        relatedHost.motionTimer = 0;
        cancelRelatedDetours();
        relatedHost.cancelTransitions();
        renderRelatedWindow();
      }, DUR.card);
    });
  };
  const relatedTypographyKey = () => [document.documentElement, photoInfo, photoDescription]
    .map((node) => node ? getComputedStyle(node).fontSize : "").join(":");
  const layoutRelated = (browse) => {
    if (!relatedGrid || !photoPrimary || !photoCanvas) return;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = getLayoutViewportHeight();
    const typographyKey = relatedTypographyKey();
    const nextLayoutKey = `${browse.seed}:${browse.photo}:${browse.tag || "all"}:${locale}:${viewportWidth}:${viewportHeight}:${typographyKey}`;
    if (nextLayoutKey === relatedLayoutKey) {
      renderRelatedWindow();
      return;
    }
    const queueScope = `${browse.tag || "all"}:${viewportWidth}:${viewportHeight}:${typographyKey}`;
    if (queueScope !== relatedQueueScope) {
      if (relatedQueueScope) {
        relatedHost.detached.clear();
        relatedQueueStale = true;
      }
      relatedQueueScope = queueScope;
    }
    const origins = relatedLayoutKey && directEntryPhase !== "primary" ? relatedVisualCoordinates() : undefined;
    cancelRelatedMotion();
    const { outer, interCardGap } = masonrySpacing(viewportWidth);
    const columns = columnsForWidth(viewportWidth);
    const suggestionInRelated = columns <= 3;
    const gridWidth = viewportWidth - (2 * outer);
    const suggestionWidth = (gridWidth - interCardGap * (columns - 1)) / columns;
    photoView.style.setProperty("--gutter", `${outer}px`);
    // The header on detail is always collapsed: 10px top and bottom padding and a 1px border (advertising-detail R10).
    const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-collapsed-row-height")) + 21;
    const viewStyle = getComputedStyle(photoView);
    const suggestionParent = suggestionInRelated ? relatedGrid : photoInfo;
    if (suggestionNode && suggestionParent && suggestionNode.parentElement !== suggestionParent) {
      const focused = suggestionNode.contains(document.activeElement) ? document.activeElement : null;
      suggestionNode.removeAttribute("role");
      suggestionNode.removeAttribute("aria-posinset");
      suggestionNode.removeAttribute("aria-setsize");
      suggestionNode.style.removeProperty("left");
      suggestionNode.style.removeProperty("top");
      suggestionNode.style.removeProperty("transform");
      suggestionNode.style.removeProperty("position");
      suggestionNode.style.removeProperty("width");
      suggestionNode.style.removeProperty("height");
      suggestionParent.append(suggestionNode);
      focused?.focus({ preventScroll: true });
    }
    photoView.dataset.detailLayout = suggestionInRelated ? "pinterest" : "split";
    let suggestionHeight = 0;
    // In the related grid, the suggestion is a related card: the primary phase leaves it to the solver phase.
    const relatedSuggestion = suggestionInRelated && directEntryPhase !== "primary";
    if (suggestionSlots.length && suggestionNode) {
      suggestionNode.hidden = false;
      suggestionNode.style.width = `${suggestionWidth}px`;
      suggestionNode.style.height = "auto";
    }
    if (relatedSuggestion && suggestionSlots.length && suggestionNode) {
      suggestionHeight = Math.ceil(Math.max(
        suggestionNode.scrollHeight,
        suggestionNode.getBoundingClientRect().height,
      ));
    }
    const suggestionCard = relatedSuggestion && suggestionSlots.length ? {
      id: "advertising-suggestion",
      kind: "suggestion",
      category: categoryOrder[0],
      sourceOrder: 0,
      rank: 0,
      layoutSpan: 1,
      media: {
        src: "/assets/content/projects/advertising-print-decals-cover.webp",
        width: suggestionWidth,
        height: Math.max(1, suggestionHeight),
      },
    } : null;
    // The solver asks for natural height then minimum height at the same width: measure once for both, each measurement
    // forces one style and layout pass of info (decision phone-frame-budget).
    const infoMeasures = new Map();
    const measureInfoOnce = (width, mode) => {
      photoView.dataset.detailLayout = mode;
      const previousWidth = photoInfo.style.width;
      const previousHeight = photoInfo.style.height;
      try {
        photoInfo.style.width = `${width}px`;
        photoInfo.style.height = "auto";
        // A locale change runs a scale(0.9) transition on main: the rect shrinks with the scale so divide again by the set width,
        // otherwise info is 10% shorter and the description is clipped.
        const infoRect = photoInfo.getBoundingClientRect();
        const naturalHeight = Math.ceil(infoRect.width ? infoRect.height * width / infoRect.width : infoRect.height);
        const controls = [...photoInfo.children].filter(node => node !== photoDescriptionBox
          && !node.hidden);
        const controlsHeight = controls.reduce((sum, node) => {
          const style = getComputedStyle(node);
          return sum + node.offsetHeight + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
        }, 0);
        const lineHeight = parseFloat(getComputedStyle(photoDescription).lineHeight);
        const gap = parseFloat(getComputedStyle(photoInfo).rowGap) || 0;
        return {
          naturalHeight,
          // A long description keeps at least three lines so the scroll area stays readable (owner 2026-10-24).
          floor: Math.ceil(controlsHeight + Math.min(3 * lineHeight, photoDescription.offsetHeight)
            + controls.length * gap) + 1,
        };
      } finally {
        photoInfo.style.width = previousWidth;
        photoInfo.style.height = previousHeight;
      }
    };
    const measureInfo = (width, mode, basePrimary = null) => {
      if (!photoInfo) return 0;
      const key = `${width}:${mode}`;
      if (!infoMeasures.has(key)) infoMeasures.set(key, measureInfoOnce(width, mode));
      else photoView.dataset.detailLayout = mode;
      const { naturalHeight, floor } = infoMeasures.get(key);
      return basePrimary ? floor : naturalHeight;
    };
    const expandStyle = photoExpand ? getComputedStyle(photoExpand) : null;
    const imageControlMinimum = expandStyle ? Math.ceil(photoExpand.offsetHeight
      + 2 * (parseFloat(expandStyle.bottom) || 0)) : 0;
    relatedLayout = compileRelatedLayout({
      cards: directEntryPhase === "primary" ? cards.filter((card) => card.id === browse.photo)
        : directEntryPhase === "warm" ? cards.filter((card, index) => index < 12 || card.id === browse.photo) : cards,
      categoryOrder, columns,
      datasetVersion: artifact.datasetVersion, heroId: browse.photo,
      layoutViewportWidth: viewportWidth, viewportHeight, headerHeight,
      safeTop: parseFloat(viewStyle.getPropertyValue("--masonry-safe-top")) || 0,
      safeBottom: parseFloat(viewStyle.getPropertyValue("--masonry-safe-bottom")) || 0,
      settings, suggestionCard, tag: browse.tag,
      seed: browse.seed,
      // The primary frame follows the cover ratio for all of the card's media (like the Pinterest pin media strip): changing media does not change the
      // primary size so related stays still; media of another ratio sits in the middle of the zoom blur background.
      primaryMedia: (({ mediaItems = [], coverMediaId } = {}) => mediaItems.find((item) => item.id === coverMediaId))(
        cards.find((card) => card.id === browse.photo)),
      measureDescriptionHeight: measureInfo,
      measureDescriptionMinimumHeight: measureInfo,
      minimumImageZoneHeight: imageControlMinimum,
      compile: relatedCompile,
    });
    relatedLayoutKey = nextLayoutKey;
    const primary = relatedLayout.primary;
    photoView.dataset.detailLayout = primary.mode;
    photoView.dataset.masonryPrimarySpan = String(primary.span);
    for (const [key, value] of Object.entries({
      top: primary.top, gap: primary.gap, "primary-width": primary.width, "primary-height": primary.height,
      "image-zone-width": primary.imageZoneWidth, "image-zone-height": primary.imageZoneHeight,
      "description-width": primary.descriptionWidth, "description-height": primary.descriptionHeight,
      "internal-gap": primary.internalGap,
    })) photoView.style.setProperty(`--detail-${key}`, `${value}px`);
    if (activePrimaryItem) fitPrimaryMedia(activePrimaryItem);
    relatedMeasuredGeometry = { viewportWidth, viewportHeight, typographyKey };
    relatedGrid.dataset.masonryRelatedColumns = String(relatedLayout.layout.columns);
    const height = Math.max(primary.height, relatedLayout.layout.totalPixelHeight);
    relatedGrid.style.setProperty("--detail-related-height", `${height}px`);
    photoCanvas.style.setProperty("--detail-canvas-height", `${height}px`);
    relatedHost.pixelHeight = height;
    if (directEntryPhase === "related" || directEntryPhase === "warm") {
      // Measured but not placed: keep it out of every frame painted before the mount task.
      if (suggestionInRelated && suggestionNode) suggestionNode.hidden = true;
      return;
    }
    if (directEntryPhase === "primary") {
      // Hidden, not placed: the mount task animates them from the origin position.
      relatedHost.rendered.forEach((node) => { node.hidden = true; });
      if (suggestionNode?.parentElement === relatedGrid) suggestionNode.hidden = true;
      return;
    }
    renderCtaSkeleton({ slide: Boolean(origins) && !reduced });
    renderRelatedWindow({ animate: true, origins });
  };
  // The primary changes inside its own frame (loading-glass-and-page-entry R4, R5): a loading photo
  // shows the skeleton immediately, a cached photo crossfades onto the displayed photo.
  const heroFrame = photoImage?.parentElement;
  let primaryReveal = null;
  const settlePrimaryReveal = () => {
    if (!primaryReveal) return;
    const { frame, animations, glass } = primaryReveal;
    primaryReveal = null;
    animations.forEach((animation) => animation.cancel());
    glass?.remove();
    if (frame) detachLoadingSkeleton(frame);
    clearColorWait(heroFrame);
    delete heroFrame.dataset.detailLoading;
    heroFrame.removeAttribute("aria-busy");
  };
  // The primary runs exactly the slow-loading card reveal (loading-glass-and-page-entry R4): three-tier Glass shows on the skeleton, under
  // the Glass the skeleton fades while the image and spare-area background appear, then the Glass melts, all with CARD_REVEAL_MS.
  const playPrimaryReveal = (reveal, incoming) => {
    if (primaryReveal !== reveal) return;
    // Image decoded before the photo view shows (opened from grid): wait so Glass can measure the hero.
    if (photoView.hidden) {
      requestAnimationFrame(() => playPrimaryReveal(reveal, incoming));
      return;
    }
    if (reduced) {
      settlePrimaryReveal();
      return;
    }
    // Remove the loading state in the same task as the animation: separated, a frame between the two tasks shows the new image fully
    // and only then runs the reveal from 0 (flash bug on Back, Forward).
    delete heroFrame.dataset.detailLoading;
    heroFrame.removeAttribute("aria-busy");
    // Phone: no skeleton and no Glass; the photo (and a video or live background, hidden by CSS while waiting) fades in over the color layer (kept under it by CSS), which
    // settlePrimaryReveal removes. No `fill`: removing data-detail-loading above holds opacity 1 afterwards.
    if (reveal.colors) {
      const shown = [...incoming, ...[photoVideo, liveBackground].filter((node) => node && !node.hidden)];
      reveal.animations = shown.map((node) => node.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: GHOST_FADE_MS, easing: GHOST_FADE_EASING }));
      Promise.all(reveal.animations.map(({ finished }) => finished))
        .then(() => primaryReveal === reveal && settlePrimaryReveal(), () => {});
      return;
    }
    const played = playReveal({ from: [reveal.frame], to: incoming, host: heroFrame });
    reveal.glass = played.glass;
    reveal.animations = played.animations;
    played.finished
      .then(() => primaryReveal === reveal && settlePrimaryReveal(), () => {});
  };
  // Media sits contain inside a cover frame; the spare area shows the zoom blur background (Glass), video included.
  const fitPrimaryMedia = (item) => {
    if (!relatedLayout) return;
    const { imageZoneWidth: zoneWidth, imageZoneHeight: zoneHeight } = relatedLayout.primary;
    const ratio = item.width / item.height;
    const width = Math.min(zoneWidth, ratio * zoneHeight);
    const height = width / ratio;
    photoView.style.setProperty("--detail-image-width", `${width}px`);
    photoView.style.setProperty("--detail-image-height", `${height}px`);
    photoView.dataset.detailGlass = String(!primaryFailed
      && (Math.abs(width - zoneWidth) > 0.5 || Math.abs(height - zoneHeight) > 0.5));
  };
  // Primary media strip (media-card R6, owner 2026-10-19): media clipped at the contain BBox; the real media is hidden until the strip stops and the new media
  // has decoded. Video does not play while the strip runs: the lane is the video's still image.
  let primaryStrip = null;
  // Strip lane and preload image use the same file as the primary. JXL size follows viewport width (fixed within a session, so the file
  // does not change between renders): the primary is no wider than the viewport; the "View larger" viewer still takes the original.
  const primarySource = (item) => item.kind === "video" ? item.posterSrc
    : responsiveSource(item.src, item.width, Math.ceil(innerWidth * devicePixelRatio));
  const primaryWidth = () => parseFloat(photoView.style.getPropertyValue("--detail-image-width"))
    || heroFrame.clientWidth;
  // The currently shown media lane draws synchronously into the canvas so it does not wait for decode; a video with no frame yet uses its poster.
  const currentPrimaryNode = () => {
    const source = photoVideo.hidden ? photoImage : photoVideo;
    const ready = source === photoVideo ? photoVideo.readyState >= 2 : photoImage.complete && photoImage.naturalWidth > 0;
    if (!ready) return Object.assign(document.createElement("img"), { src: photoVideo.hidden ? photoImage.src : photoVideo.poster });
    const canvas = document.createElement("canvas");
    canvas.width = source.videoWidth || source.naturalWidth;
    canvas.height = source.videoHeight || source.naturalHeight;
    canvas.getContext("2d").drawImage(source, 0, 0);
    return canvas;
  };
  const drawable = (node) => node instanceof HTMLVideoElement ? node.readyState >= 2
    : !(node instanceof HTMLImageElement) || (node.complete && node.naturalWidth > 0);
  // Live glass background (owner 2026-10-19): when video plays or the strip slides, the blur background redraws every frame from exactly what is in
  // the media area: cover the media box onto a 1/8-frame canvas, blur with the last tier then scale up 8x.
  // The static background image [data-detail-background] handles the rest.
  const liveBackground = document.createElement("canvas");
  liveBackground.className = "detail-view__live-background";
  liveBackground.hidden = true;
  photoBackground?.after(liveBackground);
  const liveScratch = document.createElement("canvas");
  // Call the callback on the next video frame (browsers lacking requestVideoFrameCallback use the next rAF); returns a cancel function.
  // Things that change with the video are redrawn only when the video has a new frame: each redraw is a screen frame, and a 24 frame/s clip
  // on a 90Hz A04s screen (measured 2026-10-26: a seek bar on rAF pushes the primary to 44 frames/s, hiding the bar leaves 23).
  const nextVideoFrame = (callback) => {
    if (!photoVideo.requestVideoFrameCallback) {
      const id = requestAnimationFrame(callback);
      return () => cancelAnimationFrame(id);
    }
    const id = photoVideo.requestVideoFrameCallback(callback);
    return () => photoVideo.cancelVideoFrameCallback(id);
  };
  // Cancel the pending draw; null when none.
  let cancelLive = null;
  // The sliding strip changes every frame so draw by rAF; video by video frame.
  const queueLive = (videoFrame) => {
    if (videoFrame) cancelLive = nextVideoFrame(drawLiveBackground);
    else {
      const id = requestAnimationFrame(drawLiveBackground);
      cancelLive = () => cancelAnimationFrame(id);
    }
  };
  // Media that has a still frame under the viewer; null when the viewer is closed.
  let liveStill = null;
  const drawLiveBackground = () => {
    cancelLive = null;
    // A page with no detail (Projects, viewer off) has no primary frame to draw.
    if (!photoView) return;
    // With the viewer open the primary frame is only a still zoom blur covering it fully, video is the frame at open time (advertising-detail R9, owner
    // 2026-10-26): draw once per media, even when the media fits the frame exactly (glass false). Each redraw forces the 50px backdrop blur to
    // recompute. Closing the viewer makes `close` redraw at the normal rhythm.
    const still = Boolean(photoDialog?.open);
    if (!still) liveStill = null;
    else if (liveStill === activePrimaryMediaId) return;
    const strip = still ? null : primaryStrip;
    const lanes = strip ? strip.lanes.map(({ nodes: [node] }) => ({ node, x: parseFloat(getComputedStyle(node).translate) || 0 }))
      : [{ node: photoVideo, x: 0 }];
    // A video with no frame yet (just changed source, seeked, looped) keeps the background just drawn instead of flashing back to the static background image.
    liveBackground.hidden = (!still && photoView.dataset.detailGlass !== "true") || (!strip && photoVideo.hidden);
    if (!liveBackground.hidden && (strip || drawable(photoVideo))) {
      const width = Math.max(1, Math.ceil(heroFrame.clientWidth / BAKED_SCALE));
      const height = Math.max(1, Math.ceil(heroFrame.clientHeight / BAKED_SCALE));
      // Draw overflowing the edge by two blur radii so the frame edge does not fade to transparent.
      const bleed = 100 / BAKED_SCALE * 2;
      if (liveBackground.width !== width || liveBackground.height !== height) {
        Object.assign(liveBackground, { width, height });
        Object.assign(liveScratch, { width: width + 2 * bleed, height: height + 2 * bleed });
      }
      const mediaWidth = strip?.width ?? primaryWidth();
      const mediaHeight = parseFloat(photoView.style.getPropertyValue("--detail-image-height")) || heroFrame.clientHeight;
      const scale = Math.max(liveScratch.width / mediaWidth, liveScratch.height / mediaHeight);
      const left = (liveScratch.width - mediaWidth * scale) / 2;
      const top = (liveScratch.height - mediaHeight * scale) / 2;
      const scratch = liveScratch.getContext("2d");
      scratch.clearRect(0, 0, liveScratch.width, liveScratch.height);
      lanes.forEach(({ node, x }) => {
        if (drawable(node)) scratch.drawImage(node, left + x * scale, top, mediaWidth * scale, mediaHeight * scale);
      });
      const context = liveBackground.getContext("2d");
      context.clearRect(0, 0, width, height);
      context.filter = BAKED_FILTERS.at(-1);
      context.drawImage(liveScratch, -bleed, -bleed);
      if (still) liveStill = activePrimaryMediaId;
    }
    if (!still && (strip || !photoVideo.paused)) queueLive(!strip);
  };
  // Draw the next frame immediately (source change, seek, strip close or viewer), after which the draw pass picks its own rhythm.
  const startLiveBackground = () => {
    cancelLive?.();
    queueLive(false);
  };
  // Fade audio at the strip's rhythm (PUSH_TIMING) when video switches between playing and paused (owner 2026-10-19); outside a fade,
  // photoVideo.volume is always the level the viewer chose. If the viewer adjusts sound mid-fade the viewer wins (R11): the fade stops writing
  // volume but still runs the full rhythm so a fade-out still pauses the video.
  let volumeFrame = 0;
  let viewerVolume = 1;
  let volumeOverride = false;
  const stopVolumeFade = () => {
    if (!volumeFrame) return;
    cancelAnimationFrame(volumeFrame);
    volumeFrame = 0;
    photoVideo.volume = viewerVolume;
  };
  const fadeVolume = (direction, done) => {
    const fading = Boolean(volumeFrame);
    if (!fading) viewerVolume = photoVideo.volume;
    cancelAnimationFrame(volumeFrame);
    const from = fading ? photoVideo.volume : direction > 0 ? 0 : viewerVolume;
    const to = direction > 0 ? viewerVolume : 0;
    const start = performance.now();
    volumeOverride = false;
    const step = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / PUSH_TIMING.duration));
      if (!volumeOverride) photoVideo.volume = from + (to - from) * (t < 0.5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2);
      if (t < 1) return void (volumeFrame = requestAnimationFrame(step));
      done?.();
      volumeFrame = 0;
      if (!volumeOverride) photoVideo.volume = viewerVolume;
    };
    step(start);
  };
  // Strip stopped or replaced: bring photoVideo to the target media (strip.apply); if a swipe snaps back the video plays again, with sound fading in.
  const closePrimaryStrip = () => {
    const strip = primaryStrip;
    primaryStrip = null;
    if (strip) {
      if (strip.apply) strip.apply();
      else if (strip.playing) {
        void photoVideo.play().catch(() => {});
        fadeVolume(1);
      }
      strip.animations.forEach((animation) => animation.cancel());
      strip.nodes.forEach((node) => node.remove());
    }
    if (heroFrame) delete heroFrame.dataset.detailSliding;
    startLiveBackground();
  };
  const primaryLaneNode = (item) => Object.assign(document.createElement("img"),
    { alt: "", src: primarySource(item), className: "detail-view__strip-media" });
  // entries: [{ item, slot }], slot 0 is the media currently shown; `offset` is the offset of slot 0 from the frame. Each lane is
  // { nodes, slot, index } like the card strip; `to` is the offset the strip heads to, `pendingId` a press waiting for its media to decode.
  const openPrimaryStrip = (entries, offset = 0) => {
    closePrimaryStrip();
    const width = primaryWidth();
    const clip = document.createElement("div");
    clip.className = "detail-view__strip";
    const items = primaryItems();
    const lanes = entries.map(({ item, slot }) => {
      const media = slot ? primaryLaneNode(item) : currentPrimaryNode();
      media.classList.add("detail-view__strip-media");
      clip.append(media);
      return { slot, nodes: [media], index: items.indexOf(item) };
    });
    photoVideo.after(clip);
    heroFrame.dataset.detailSliding = "";
    const playing = !photoVideo.hidden && !photoVideo.paused;
    primaryStrip = { lanes, width, animations: [], nodes: [clip], dragging: false, playing, apply: null, to: 0, pendingId: null };
    // The video's still image stays in the strip; the sound keeps running and fades with the strip's rhythm, then the video pauses.
    if (playing) fadeVolume(-1, () => photoVideo.pause());
    placeStrip(lanes, width, offset);
    cancelLive?.();
    drawLiveBackground();
    return primaryStrip;
  };
  const runPrimaryStrip = (strip, from, to, timing) => {
    strip.to = to;
    strip.animations = moveStrip(strip.lanes, strip.width, from, to, timing);
    return strip.animations.at(-1).finished;
  };
  // The strip reached its last target: bring the real media there (strip.apply), then remove the strip once that media can show. A retarget
  // (new animations) or a press still waiting for its media takes over instead.
  const landPrimaryStrip = async (strip) => {
    const { animations } = strip;
    // No animation: the strip had not started when a press sent it back to the media it shows.
    try { await animations.at(-1)?.finished; } catch { return; }
    if (primaryStrip !== strip || strip.animations !== animations || strip.pendingId || !strip.apply) return;
    strip.apply();
    Object.assign(strip, { apply: null, playing: false });
    // A video entering the frame plays from the start (R6); the strip is removed when the video has a frame.
    await (photoVideo.hidden ? whenMediaReady(photoImage) : photoVideo.readyState >= 2 || new Promise((resolve) => {
      photoVideo.addEventListener("loadeddata", resolve, { once: true });
      photoVideo.addEventListener("error", resolve, { once: true });
    }));
    if (primaryStrip === strip) closePrimaryStrip();
  };
  // A press while the primary strip has not landed (media-card R3 rules 1 to 5, R6): the strip keeps moving from where it
  // is seen, or stays at rest when it has not started, and turns to the new target once that media has decoded; only the lanes on screen
  // stay (keepLanes), so a target that never showed loses its lane. The sound fade and the video pause belong to the first open and the
  // landing only. Returns false when the press takes the plain path: no strip on its way or a finger on the strip.
  const steerPrimaryStrip = (item, direction) => {
    const strip = primaryStrip;
    if (!strip || strip.dragging || !strip.apply) return false;
    const { width } = strip;
    const index = primaryItems().indexOf(item);
    const node = strip.lanes.find((entry) => entry.index === index)?.nodes[0] ?? primaryLaneNode(item);
    strip.pendingId = item.id;
    void whenMediaReady(node).then(() => {
      if (primaryStrip !== strip || strip.pendingId !== item.id) return;
      strip.pendingId = null;
      const moving = strip.animations.some(({ playState }) => playState === "running");
      // Back to the target the strip already heads to or rests on: the running animation lands, a stopped strip lands now.
      if (strip.lanes.some((entry) => entry.index === index && -entry.slot * width === strip.to)) {
        if (!moving) void landPrimaryStrip(strip);
        return;
      }
      const from = stripOffset(strip.lanes, width);
      const { kept, slot } = keepLanes(strip.lanes, { index, direction, width, offset: from });
      strip.lanes.filter((entry) => !kept.includes(entry))
        .forEach(({ nodes }) => nodes.forEach((entry) => entry !== node && entry.remove()));
      if (!kept.some((entry) => entry.index === index)) {
        kept.push({ nodes: [node], slot, index });
        strip.nodes[0].append(node);
      }
      strip.lanes = kept;
      const toPx = -slot * width;
      // A strip that already stopped on the old target makes a plain slide from rest.
      strip.animations = retargetStrip(strip.lanes, { toPx, width,
        sameDirection: Math.sign(strip.to - from) === Math.sign(toPx - from), timing: moving ? null : PUSH_TIMING });
      strip.to = toPx;
      void landPrimaryStrip(strip);
    });
    return true;
  };
  // `motion` from a drag swipe: the strip is already open, the offset at release and the remaining slide rhythm.
  const renderPrimaryMedia = (record, item, slide = 0, motion = null) => {
    const english = locale === "en";
    const video = item.kind === "video";
    const source = video ? null : primarySource(item);
    // With the viewer open the primary changes directly: the strip is inserted next to photoVideo, but the video may be inside the viewer.
    const sliding = Boolean(slide) && !reduced && !photoView.hidden && !photoDialog?.open;
    const changed = !video && !sliding && photoImage.getAttribute("src") !== source;
    if (changed || video || sliding) settlePrimaryReveal();
    const steered = sliding && !motion && steerPrimaryStrip(item, Math.sign(slide));
    const strip = steered ? primaryStrip : sliding ? motion?.strip ?? openPrimaryStrip([
      { item: activePrimaryItem, slot: 0 }, { item, slot: Math.sign(slide) },
    ]) : null;
    if (!sliding) closePrimaryStrip();
    // Video to video within the same card: time, total, seek bar stay on the old video until the new video runs (owner 2026-10-25).
    videoTimeHold = Boolean(slide) && video && activePrimaryItem?.kind === "video";
    activePrimaryMediaId = item.id;
    activePrimaryItem = item;
    primaryFailed = false;
    heroFrame.classList.remove("is-media-error");
    photoView.dataset.masonryActiveMediaId = item.id;
    // Changing media within the same card keeps the viewer's sound choice like Pinterest; opening a new card goes back to muted.
    if (!slide) {
      photoVideo.muted = true;
      photoVideo.defaultMuted = true;
    }
    photoImage.hidden = video;
    photoExpand.hidden = false;
    photoExpand.toggleAttribute("data-detail-expand-video", video);
    photoPlayer.hidden = !video;
    photoAudioToggle.hidden = photoVolumeGroup.hidden = !video || item.hasAudio === false;
    // While sliding, photoVideo keeps the video being viewed (sound fading out); once the strip stops it switches to the target media.
    const applyVideo = () => {
      stopVolumeFade();
      photoVideo.pause();
      photoVideo.hidden = !video;
      if (!video) {
        releaseVideoSource(photoVideo);
        return;
      }
      photoVideo.width = item.width;
      photoVideo.height = item.height;
      photoVideo.poster = item.posterSrc;
      photoVideo.setAttribute("aria-label", english ? item.altEn : item.altVi);
      if (!setVideoSource(photoVideo, item, { file: item.src }) && slide) photoVideo.currentTime = 0;
      void photoVideo.play().catch(syncVideoPlayer);
      if (strip) fadeVolume(1);
    };
    if (strip) strip.apply = applyVideo;
    else applyVideo();
    if (video) {
      if (!videoTimeHold) photoTimeTotal.textContent = formatVideoTime(item.durationSeconds, Math.ceil);
    } else {
      photoImage.width = item.width;
      photoImage.height = item.height;
      photoImage.alt = english ? item.altEn : item.altVi;
      photoImage.loading = "eager";
      photoImage.fetchPriority = "high";
      photoImage.src = source;
    }
    fitPrimaryMedia(item);
    if (strip && !steered) {
      const from = motion?.offset ?? 0;
      // Wait only for the shown media and the target media; the lane on the other side does not enter the frame.
      void Promise.all(strip.lanes.filter(({ slot }) => slot === 0 || slot === Math.sign(slide))
        .flatMap(({ nodes }) => nodes).map(whenMediaReady))
        .then(() => {
          // A later press took the strip over before it started (steerPrimaryStrip), or sent it back to the media it shows and it landed.
          if (primaryStrip !== strip || strip.pendingId || strip.animations.length || !strip.apply) return;
          void runPrimaryStrip(strip, from, -Math.sign(slide) * strip.width, motion?.timing ?? PUSH_TIMING).catch(() => {});
          return landPrimaryStrip(strip);
        });
    }
    // Images of the two adjacent media enter the cache so a manual drag does not meet an empty lane.
    const neighbors = record.mediaItems || [];
    const at = neighbors.indexOf(item);
    [neighbors[at - 1], neighbors[at + 1]].forEach((entry) => { if (entry) new Image().src = primarySource(entry); });
    syncVideoPlayer();
    syncVideoTime();
    if (photoBackground) {
      // Markup is lazy so the placeholder does not load while detail is hidden; assign the real source then make it eager, like the main image.
      // The background is blurred 100px so size 240 suffices: the primary-size version (up to 2048, the original) is a second large JXL decode, 200-430ms
      // on the owner's PC, stalling the frame each time a related card opens (measured 2026-11-09).
      photoBackground.src = video ? item.posterSrc : responsiveSource(item.src, item.width, BACKGROUND_SOURCE_WIDTH);
      photoBackground.loading = "eager";
      photoBackground.dataset.detailId = record.id;
    }
    if (changed) {
      // Whether the image is available or not, both run the slow-loading card motion (loading-glass-and-page-entry R4): the old image and background hide immediately,
      // the skeleton covers the frame until the new image has decoded; an available image only makes the skeleton stand shorter.
      // Phone: the same color layer as the cards instead of the Flow skeleton (progressive-loading R9).
      const phone = skeletonPhone();
      const waitSrc = video ? item.posterSrc : item.src;
      if (phone) setColorWait(heroFrame, waitColors(waitSrc, cardColor(record)));
      const reveal = { frame: phone ? null : attachLoadingSkeleton(heroFrame, item.id, photoVideo.nextSibling,
        mediaColors(waitSrc)?.slice(1)), colors: phone, animations: [], glass: null };
      primaryReveal = reveal;
      heroFrame.setAttribute("aria-busy", "true");
      heroFrame.dataset.detailLoading = "true";
      // decode() rejects on error or when a newer source replaces this one.
      // The background uses its own 240 file: wait for the background too so it does not show after the reveal on a cold cache; a failed background does not block the reveal.
      Promise.all([photoImage.decode(), photoBackground?.decode().catch(() => {})])
        .then(() => playPrimaryReveal(reveal, [photoImage, photoBackground].filter(Boolean)),
        () => primaryReveal === reveal && settlePrimaryReveal());
    }
    photoViewer.setRecord({ ...record, media: item });
    photoMediaThumbs?.querySelectorAll("[data-detail-media-select]").forEach((button) => {
      button.setAttribute("aria-current", String(button.dataset.detailMediaSelect === item.id));
    });
    photoViewerThumbs?.querySelectorAll("[data-detail-viewer-select]").forEach((button) => {
      button.setAttribute("aria-current", String(button.dataset.detailViewerSelect === item.id));
    });
    // Read the rect in the next frame: that frame's layout must run anyway, so no additional layout pass.
    requestAnimationFrame(keepActiveThumbInView);
    const items = record.mediaItems || [];
    const index = items.indexOf(item);
    photoMediaSteps.forEach((button) => {
      const target = index + Number(button.dataset.detailMediaStep);
      button.hidden = index < 0 || target < 0 || target >= items.length;
    });
  };
  // Every media-change path (thumbnail, arrow, swipe, key) goes through here; the primary keeps its frame so related is not re-laid out.
  const showPrimaryMedia = (item, motion = null) => {
    const record = cards.find((card) => card.id === activePhotoId);
    if (!record || !item || activePrimaryMediaId === item.id) return;
    const items = record.mediaItems || [];
    renderPrimaryMedia(record, item, items.indexOf(item) - items.findIndex((entry) => entry.id === activePrimaryMediaId),
      motion);
    browseHistory.captureDetail({ ...browseHistory.current.detail, mediaId: item.id, scrollY: getLogicalScroll() });
    browseHistory.persistCurrent();
  };
  const primaryItems = () => cards.find((card) => card.id === activePhotoId)?.mediaItems || [];
  const primaryIndex = () => primaryItems().findIndex((entry) => entry.id === activePrimaryMediaId);
  const stepPrimaryMedia = (step) => showPrimaryMedia(primaryItems()[primaryIndex() + step]);
  const renderPrimaryThumbs = (record) => {
    const items = record.mediaItems || [];
    const authored = items.length > 1 || items.some((item) => item.id !== record.id
      || item.kind !== "image" || item.src !== record.media.src);
    if (photoViewerThumbs) {
      photoViewerThumbs.hidden = !authored;
      photoViewerThumbs.replaceChildren();
      photoViewerThumbs.scrollLeft = 0;
    }
    if (!authored) {
      if (photoMediaThumbs) scrollHintObserver.unobserve(photoMediaThumbs);
      photoMediaThumbs?.remove();
      photoMediaThumbs = null;
      return;
    }
    const english = locale === "en";
    if (!photoMediaThumbs) {
      photoMediaThumbs = document.createElement("div");
      photoMediaThumbs.className = "detail-view__media-thumbs";
      photoMediaThumbs.dataset.detailMediaThumbs = "";
      photoMediaThumbs.setAttribute("role", "group");
      photoMediaThumbs.addEventListener("scroll", syncScrollHints, { passive: true });
      scrollHintObserver.observe(photoMediaThumbs);
      photoDescriptionBox.before(photoMediaThumbs);
    }
    photoMediaThumbs.setAttribute("aria-label", english ? "Product media" : "Media sản phẩm");
    photoMediaThumbs.replaceChildren();
    photoMediaThumbs.scrollLeft = 0;
    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.detailMediaSelect = item.id;
      button.setAttribute("aria-label", english
        ? `Show ${item.kind === "video" ? "video" : "image"} ${index + 1} of ${items.length}: ${item.altEn}`
        : `Xem ${item.kind === "video" ? "video" : "ảnh"} ${index + 1} trên ${items.length}: ${item.altVi}`);
      const image = document.createElement("img");
      image.loading = "lazy";
      const thumbSrcset = item.kind === "video" ? "" : responsiveSrcset(item.src, item.width);
      if (thumbSrcset) {
        image.sizes = "auto, 25vw";
        image.srcset = thumbSrcset;
      }
      image.src = item.kind === "video" ? item.posterSrc : responsiveSource(item.src);
      image.alt = "";
      button.append(image);
      if (item.kind === "video") {
        button.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>');
      }
      button.addEventListener("click", () => showPrimaryMedia(item));
      photoMediaThumbs.append(button);
      if (!photoViewerThumbs) return;
      // The viewer strip replaces the two arrows (primary-video-player R8): the viewer slides to that media, the primary changes along.
      const copy = button.cloneNode(true);
      delete copy.dataset.detailMediaSelect;
      copy.dataset.detailViewerSelect = item.id;
      copy.addEventListener("click", () => {
        const step = Math.sign(index - primaryIndex());
        if (step) photoViewer.slideTo({ ...record, media: item }, step, () => showPrimaryMedia(item));
      });
      photoViewerThumbs.append(copy);
    });
  };
  // Primary video player follows the Pinterest pin page (media-card R6): click the video to play/pause, the bottom bar shows on hover,
  // focus or while paused; seek bar, time, sound button and volume bar (owner 2026-10-18).
  // Seek-drag state (R2, below); declared early so syncVideoPlayer, syncVideoTime can read it.
  let scrub = null;
  let pendingSeek = null;
  let videoTimeHold = false;
  const setRangeFill = (range) => range.style.setProperty("--range-fill",
    `${(Number(range.value) / (Number(range.max) || 1)) * 100}%`);
  const syncVideoPlayer = () => {
    const english = locale === "en";
    // The volume bar keeps the level the viewer chose while the sound fades.
    const volume = volumeFrame ? viewerVolume : photoVideo.volume;
    const silent = photoVideo.muted || volume === 0;
    // A playing video paused to drag-seek keeps the playing look, so the play button does not flash.
    const paused = photoVideo.paused && !scrub?.wasPlaying;
    photoPlayer.dataset.masonryVideoPaused = String(paused);
    photoPlayer.dataset.masonryVideoMuted = String(silent);
    photoPlayButton.setAttribute("aria-label", paused ? english ? "Play" : "Phát"
      : english ? "Pause" : "Tạm dừng");
    photoAudioToggle.setAttribute("aria-label", silent ? english ? "Unmute" : "Bật tiếng"
      : english ? "Mute" : "Tắt tiếng");
    photoVolume.value = silent ? 0 : volume;
    setRangeFill(photoVolume);
  };
  const syncVideoTime = () => {
    if (videoTimeHold) return;
    photoProgress.max = photoVideo.duration > 0 ? photoVideo.duration : 1;
    // While dragging the seek: the knob and time follow the hand, not the frame currently shown.
    if (scrub) return;
    photoProgress.value = photoVideo.currentTime;
    setRangeFill(photoProgress);
    photoTimeCurrent.textContent = formatVideoTime(photoVideo.currentTime);
  };
  // timeupdate fires only ~4 times per second so the seek bar steps; while playing, draw per video frame.
  let cancelVideoTime = null;
  const tickVideoTime = () => {
    syncVideoTime();
    cancelVideoTime = photoVideo.paused ? null : nextVideoFrame(tickVideoTime);
  };
  const toggleVideoPlayback = () => {
    if (photoVideo.paused) void photoVideo.play().catch(() => {});
    else photoVideo.pause();
  };
  photoPlayer?.querySelector("[data-detail-play-surface]")
    .addEventListener("click", toggleVideoPlayback, { signal: controller.signal });
  photoPlayButton?.addEventListener("click", toggleVideoPlayback, { signal: controller.signal });
  // Seek drag (primary-video-player R2): the video pauses while dragging, only one seek command at a time and a new command waits for `seeked`;
  // outside the loaded range keep the frame, and on release (change) seek then resume playing if it was playing. The keyboard uses the same path.
  const isBuffered = (time) => Array.from({ length: photoVideo.buffered.length }, (_, index) => index)
    .some((index) => photoVideo.buffered.start(index) <= time && time <= photoVideo.buffered.end(index));
  // Every seek command goes through here, including on release (A04s 2026-10-26: 2 to 3 stacked commands per drag, the release command stacking on the drag command).
  // `seeking` turns off before the `seeked` event runs (inference, not measured): a command sent in that gap drops the pending command, and a late
  // `seeked` does not send a stacked one. A command to the same spot being sought (clicking a point on the bar, arrow keys: input then change with the same
  // value) does not seek a second time.
  const seekTo = (time) => {
    if (time === photoVideo.currentTime) pendingSeek = null;
    else if (photoVideo.seeking) pendingSeek = time;
    else {
      pendingSeek = null;
      photoVideo.currentTime = time;
    }
  };
  photoProgress?.addEventListener("input", () => {
    const time = Number(photoProgress.value);
    if (!scrub) {
      scrub = { wasPlaying: !photoVideo.paused };
      photoVideo.pause();
    }
    setRangeFill(photoProgress);
    photoTimeCurrent.textContent = formatVideoTime(time);
    if (!isBuffered(time)) pendingSeek = null;
    else seekTo(time);
  }, { signal: controller.signal });
  photoProgress?.addEventListener("change", () => {
    if (!scrub) return;
    const { wasPlaying } = scrub;
    scrub = null;
    seekTo(Number(photoProgress.value));
    if (wasPlaying) void photoVideo.play().catch(() => {});
  }, { signal: controller.signal });
  photoVideo?.addEventListener("seeked", () => {
    if (pendingSeek !== null) seekTo(pendingSeek);
  }, { signal: controller.signal });
  // Dragging to 0 mutes but keeps the old volume, so the sound button restores exactly the previous level.
  photoVolume?.addEventListener("input", () => {
    const volume = Number(photoVolume.value);
    if (volumeFrame) volumeOverride = true;
    if (volume > 0) photoVideo.volume = viewerVolume = volume;
    photoVideo.muted = volume === 0;
  }, { signal: controller.signal });
  photoAudioToggle?.addEventListener("click", () => {
    if (!photoVideo || photoVideo.hidden || photoAudioToggle.hidden) return;
    if (volumeFrame) {
      volumeOverride = true;
      photoVideo.volume = viewerVolume;
    }
    if (photoVideo.muted || photoVideo.volume === 0) {
      if (photoVideo.volume === 0) photoVideo.volume = viewerVolume = 1;
      photoVideo.muted = false;
      if (photoVideo.paused) void photoVideo.play().catch(() => {});
    } else photoVideo.muted = true;
    syncVideoPlayer();
  }, { signal: controller.signal });
  // Reloading the source sets `paused` without firing `pause`, only `emptied`; without it the center play button stays stuck hidden (R9).
  for (const type of ["play", "pause", "volumechange", "emptied"]) {
    photoVideo?.addEventListener(type, syncVideoPlayer, { signal: controller.signal });
  }
  for (const type of ["loadedmetadata", "seeked", "emptied"]) {
    photoVideo?.addEventListener(type, syncVideoTime, { signal: controller.signal });
  }
  for (const type of ["play", "seeked", "loadeddata", "emptied"]) {
    photoVideo?.addEventListener(type, startLiveBackground, { signal: controller.signal });
  }
  photoDialog?.addEventListener("close", () => {
    delete photoView.dataset.detailExpanded;
    startLiveBackground();
  }, { signal: controller.signal });
  photoVideo?.addEventListener("play", () => {
    cancelVideoTime?.();
    tickVideoTime();
  }, { signal: controller.signal });
  // A playing video does not fire `playing` again; only a new video (source change then play) releases the held time.
  photoVideo?.addEventListener("playing", () => {
    if (!videoTimeHold) return;
    videoTimeHold = false;
    photoTimeTotal.textContent = formatVideoTime(activePrimaryItem.durationSeconds, Math.ceil);
    syncVideoTime();
  }, { signal: controller.signal });
  // Primary media cannot be shown (image error; video error and poster error too): shared error marker, turn off the blur background
  // (media-card R5); renderPrimaryMedia clears the marker when media changes.
  // The head script sets .is-media-error per failed img in the frame, including the blur background; the primary frame decides from the selected media.
  const syncPrimaryError = () => {
    heroFrame.classList.toggle("is-media-error", primaryFailed);
    if (!primaryFailed) return;
    photoView.dataset.detailGlass = "false";
    photoPlayer.hidden = photoExpand.hidden = true;
  };
  heroFrame?.addEventListener("error", ({ target }) => {
    if (target === photoImage && !photoImage.hidden) primaryFailed = true;
    syncPrimaryError();
  }, { capture: true, signal: controller.signal });
  photoVideo?.addEventListener("error", () => {
    const item = activePrimaryItem;
    if (photoVideo.hidden || !item?.posterSrc) return;
    const probe = new Image();
    probe.addEventListener("error", () => {
      primaryFailed = activePrimaryItem === item;
      syncPrimaryError();
    }, { once: true });
    probe.src = item.posterSrc;
  }, { signal: controller.signal });
  photoMediaSteps.forEach((button) => button.addEventListener("click",
    () => stepPrimaryMedia(Number(button.dataset.detailMediaStep)), { signal: controller.signal }));
  // Viewer just opened: the viewer thumbnail strip scrolls to the media being viewed (the viewer's listener ran first, the dialog is already open).
  photoExpand?.addEventListener("click", () => requestAnimationFrame(keepActiveThumbInView), { signal: controller.signal });
  // Capture on photoView runs before the viewer-open listener on the button: a sliding strip stops at the target media and then the viewer takes the media.
  photoView?.addEventListener("click", (event) => {
    if (primaryStrip && event.target.closest?.("[data-detail-expand]")) closePrimaryStrip();
  }, { capture: true, signal: controller.signal });
  // A touch swipe drags the strip with the finger (R6 like card R3); arrow keys when focus is in the frame change media, the seek bar and
  // volume keep their keys. A finger on the seek bar and volume only seeks and adjusts sound (primary-video-player R10).
  if (heroFrame) trackStripSwipe(heroFrame, {
    accepts: (event) => event.pointerType === "touch" && !event.target.closest("input[type='range']"),
    width: primaryWidth,
    canStep: (step) => Boolean(primaryItems()[primaryIndex() + step]),
    drag: (offset) => {
      if (reduced) return;
      // A strip still sliding from last time: open a new strip from the media currently shown.
      if (primaryStrip?.dragging && !primaryStrip.animations.length) {
        return placeStrip(primaryStrip.lanes, primaryStrip.width, offset);
      }
      const items = primaryItems();
      const index = primaryIndex();
      openPrimaryStrip([-1, 0, 1].filter((slot) => items[index + slot]).map((slot) => ({
        item: items[index + slot], slot,
      })), offset).dragging = true;
    },
    release: (step, offset) => {
      const strip = primaryStrip?.dragging ? primaryStrip : null;
      // The next swipe while the strip waits for media opens a new strip from the media currently shown, not dragging the old strip back.
      if (strip) strip.dragging = false;
      const width = strip?.width ?? primaryWidth();
      if (step) {
        showPrimaryMedia(primaryItems()[primaryIndex() + step],
          strip && { strip, offset, timing: releaseTiming(width - Math.abs(offset), width) });
      } else if (strip) {
        runPrimaryStrip(strip, offset, 0, releaseTiming(Math.abs(offset), width))
          .then(() => { if (primaryStrip === strip) closePrimaryStrip(); }, () => {});
      }
    },
    signal: controller.signal,
  });
  heroFrame?.addEventListener("keydown", (event) => {
    if ((event.key !== "ArrowLeft" && event.key !== "ArrowRight") || event.target.matches("input")) return;
    event.preventDefault();
    stepPrimaryMedia(event.key === "ArrowRight" ? 1 : -1);
  }, { signal: controller.signal });
  const renderPhoto = (browse, reason, phase = "", reveal = true) => {
    const record = cards.find((card) => card.id === browse.photo);
    if (!record || !photoView || !photoImage) return false;
    directEntryPhase = phase;
    const previousPhotoId = activePhotoId;
    if (previousPhotoId && previousPhotoId !== record.id) {
      lastClosedPhotoId = previousPhotoId;
    }
    const generation = ++detailRenderGeneration;
    cancelMotion();
    activePhotoId = record.id;
    // Changing tag within the same photo keeps the batch frames so they slide or go around the primary (CTA R9, R10); changing photo rebuilds.
    if (previousPhotoId !== record.id || !ctaInDetail()) {
      clearCtaSkeleton();
      ctaBatch.rearmOnPlace();
    }
    moveCtaNodes("detail");
    syncLocaleLinks(browse);
    photoView.dataset.detailId = record.id;
    photoImage.dataset.detailId = record.id;
    gridHost.rendered.forEach((card) => syncJustViewedMarker(card, locale, false));
    const english = locale === "en";
    renderPrimaryThumbs(record);
    const initialId = (reason === "direct" && !softNavigation && startupHistory?.historyFallback !== true
      ? null : browse.detail.mediaId)
      || (reason === "locale" && previousPhotoId === record.id ? activePrimaryMediaId : null)
      || record.coverMediaId;
    const selected = record.mediaItems?.find((item) => item.id === initialId)
      || record.mediaItems?.find((item) => item.id === record.coverMediaId)
      || record.media;
    renderPrimaryMedia(record, selected);
    if (videoHandoff?.mediaId === selected.id && selected.kind === "video") photoVideo.currentTime = videoHandoff.time;
    videoHandoff = null;
    browseHistory.captureDetail({ ...browse.detail, mediaId: selected.id });
    if (photoDescription) photoDescription.textContent = (english ? record.descriptionEn : record.descriptionVi) || "";
    if (photoDescriptionScroll) photoDescriptionScroll.scrollTop = 0;
    const category = categoryById.get(record.category);
    if (photoCategory) photoCategory.textContent = english ? category?.titleEn : category?.titleVi;
    renderSuggestionLinks(browse, english);
    if (reveal) revealPhotoView(browse, generation);
    return true;
  };
  // Show the photo view then layout and restore scroll; separate from renderPhoto so opening from the grid builds the DOM in the card-tap task
  // and shows it in a later task (decision phone-frame-budget).
  const revealPhotoView = (browse, generation) => {
    // Hide the grid before changing the body class: the new class's style need not be recomputed for the whole grid (CPU 4x: 8ms instead of 15ms).
    if (gridSection) gridSection.hidden = true;
    document.body.classList.add("is-detail");
    document.body.dataset.detailActive = "true";
    // Write the values layoutRelated will write before showing, so detail's first layout already includes them
    // and is not forced to restyle a second time (decision phone-frame-budget).
    const layoutWidth = document.documentElement.clientWidth;
    photoView.style.setProperty("--gutter", `${masonrySpacing(layoutWidth).outer}px`);
    photoView.dataset.detailLayout ??= columnsForWidth(layoutWidth) <= 3 ? "pinterest" : "split";
    photoView.hidden = false;
    layoutRelated(browse);
    relatedHost.rendered.forEach((card, id) => syncJustViewedMarker(card, locale, lastClosedPhotoId === id));
    let restoredScroll = browse.detail.scrollY;
    if (
      browse.detail.anchorId
      && browse.detail.anchorOffset !== null
      && browse.detail.viewportWidth !== null
      && browse.detail.viewportWidth !== document.documentElement.clientWidth
    ) {
      const anchor = ensureRelatedPhoto(browse.detail.anchorId);
      const anchorRect = anchor?.getBoundingClientRect();
      if (anchorRect) restoredScroll = getLogicalScroll() + anchorRect.top - browse.detail.anchorOffset;
    }
    setLogicalScroll(restoredScroll);
    requestAnimationFrame(() => {
      if (generation !== detailRenderGeneration || controller.signal.aborted) return;
      window.dispatchEvent(new CustomEvent("site:layout"));
    });
  };
  // Each phase is its own task so no phase blocks input over 50ms on an Android phone (docs/specs/advertising-detail.md R7):
  // primary without related, solver warm-up on a few cards, full solver, then mount cards.
  // Restoring scroll needs the full height in one pass.
  const nextTask = () => new Promise((resolve) => setTimeout(resolve));
  // A task right after the frame: the dirty style and layout of the previous phase were computed in the frame, not forced again in the mount task.
  const afterNextFrame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
  // The full related solver is a long task on an Android phone (decision phone-frame-budget): run layoutRelated with a dummy
  // compile, each missing compile is computed on the Worker then rerun; DOM measurement stays on the main thread. Returns false when
  // replaced; on Worker error compile synchronously.
  const layoutRelatedInWorker = async (browse, generation) => {
    const results = new Map();
    for (;;) {
      let pending;
      relatedCompile = (options) => {
        const result = results.get(JSON.stringify(options));
        if (!result) throw (pending = { options });
        if (result.error) throw Object.assign(new Error(result.error.message), result.error);
        return result.layout;
      };
      try {
        relatedLayoutKey = "";
        layoutRelated(browse);
        return true;
      } catch (error) {
        if (!pending || error !== pending) throw error;
      } finally {
        relatedCompile = compileMasonryLayout;
      }
      const result = await compileInWorker(pending.options, takeWorker());
      if (generation !== detailRenderGeneration || controller.signal.aborted || !activePhotoId) return false;
      if (!result) {
        relatedLayoutKey = "";
        layoutRelated(browse);
        return true;
      }
      results.set(JSON.stringify(pending.options), result);
    }
  };
  const showPhoto = async (browse, reason) => {
    if (!detailLoaded) {
      await ensureDetail();
      if (controller.signal.aborted) return;
    }
    // Signal for tests: "true" when every related build phase of this open pass is done, including site:layout after the related motion
    // (if interrupted, the next pass re-sets it).
    if (photoView) photoView.dataset.masonryDetailReady = "false";
    // Only a different photo defers; changing tag or locale keeps related cards on screen.
    const deferRelated = browse.photo !== activePhotoId && !browse.detail.scrollY && !browse.detail.anchorId;
    const origins = deferRelated && relatedLayoutKey ? relatedVisualCoordinates() : undefined;
    // Opening from the grid: build the hidden detail DOM, show and layout in a later task.
    const fromGrid = deferRelated && photoView?.hidden;
    // Click on a grid card: the click's task only writes history; build the primary in a later task so the input task stays under 50ms on an Android phone.
    if (fromGrid && reason === "photo") {
      const pending = ++detailRenderGeneration;
      await nextTask();
      if (pending !== detailRenderGeneration || controller.signal.aborted) return;
    }
    renderPhoto(browse, reason, deferRelated ? "primary" : "", !fromGrid);
    const generation = detailRenderGeneration;
    if (fromGrid) {
      await nextTask();
      if (generation !== detailRenderGeneration || controller.signal.aborted || !activePhotoId) return;
      revealPhotoView(browse, generation);
    }
    for (const phase of deferRelated ? ["warm", "related", ""] : []) {
      // Related mount reads grid positions: wait a frame so the related phase's style is not merged into the mount task (task 50-59ms on the A04s).
      await (phase ? nextTask() : afterNextFrame());
      if (generation !== detailRenderGeneration || controller.signal.aborted || !activePhotoId) return;
      directEntryPhase = phase;
      if (phase === "related") {
        if (!await layoutRelatedInWorker(browseHistory.current, generation)) return;
      } else if (phase) {
        relatedLayoutKey = "";
        layoutRelated(browseHistory.current);
      } else {
        renderRelatedWindow({ animate: true, origins });
        // Report layout after the related 400ms motion: merging into the mount task's Masonry and LazySizes frame makes motion.js's measurement passes
        // force a dirty style, a 50-120ms frame on the A04s (decision phone-frame-budget).
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("site:layout"));
          if (generation === detailRenderGeneration && photoView) photoView.dataset.masonryDetailReady = "true";
        }, DUR.card);
        // The batch CTA at the end of related builds in its own task: sharing the related mount task it is 111ms on the A04s (CTA R9, gate 50ms).
        // The "cta" phase holds an interleaved resize frame so the batch is not built in the same frame as Masonry and LazySizes.
        directEntryPhase = "cta";
        await nextTask();
        if (generation !== detailRenderGeneration || controller.signal.aborted || !activePhotoId) return;
        directEntryPhase = "";
        renderCtaSkeleton();
      }
    }
    if (!deferRelated && photoView) photoView.dataset.masonryDetailReady = "true";
  };
  const restoreGridEntry = (browse, reason) => {
    const previousPhotoId = activePhotoId;
    // Back to masonry from that card's own detail: the card stands at the media just viewed, video at the exact second (owner 2026-10-18).
    const viewedMediaId = previousPhotoId && previousPhotoId === browse.grid.focusId ? activePrimaryMediaId : null;
    const viewedTime = viewedMediaId && photoVideo && !photoVideo.hidden ? photoVideo.currentTime : 0;
    const generation = ++detailRenderGeneration;
    photoViewer.close({ restoreFocus: false });
    settlePrimaryReveal();
    if (previousPhotoId) lastClosedPhotoId = previousPhotoId;
    gridHost.rendered.forEach((card, id) => syncJustViewedMarker(card, locale, lastClosedPhotoId === id));
    activePhotoId = null;
    activePrimaryMediaId = null;
    closePrimaryStrip();
    photoVideo?.pause();
    clearRelatedCards();
    clearCtaSkeleton();
    moveCtaNodes("grid");
    syncLocaleLinks(browse);
    if (photoView) delete photoView.dataset.detailId;
    if (photoView) delete photoView.dataset.detailLayout;
    if (photoView) delete photoView.dataset.detailGlass;
    if (photoView) delete photoView.dataset.masonryDetailReady;
    if (photoImage) delete photoImage.dataset.detailId;
    photoView && (photoView.hidden = true);
    // Force layout now: removing the grid's content-visibility: hidden then adding cards in the same task, Chromium sometimes leaves
    // the card with no box (enter directly at ?photo= then click navbar), so the measured rect is 0, with no scroll and focus to the card.
    // A grid that was never hidden (first build of a direct load) skips this extra layout.
    if (gridSection && (gridSection.hidden || document.body.classList.contains("is-detail"))) {
      gridSection.hidden = false;
      void gridSection.offsetHeight;
    }
    document.body.classList.remove("is-detail");
    delete document.body.dataset.detailActive;
    const focusId = browse.grid.focusId;
    if (browse.category !== filter) setActiveFilter(browse.category);
    if (!geometry || staleStackGeometry()) measure();
    const node = focusId ? ensurePhoto(focusId) : null;
    const gridMediaId = viewedMediaId || browse.grid.mediaId;
    if (node && gridMediaId) {
      gridHost.mediaById.set(focusId, gridMediaId);
      node.advertisingSetMediaId?.(gridMediaId, viewedTime);
    }
    let restoredScrollY;
    if (reason === "navbar" && node && browse.grid.anchorOffset === null) {
      const rect = node.getBoundingClientRect();
      restoredScrollY = getLogicalScroll() + rect.top - Math.max(0, (innerHeight - rect.height) / 2);
    } else if (
      node
      && browse.grid.anchorOffset !== null
      && browse.grid.viewportWidth !== null
      && (reason === "navbar" || browse.grid.viewportWidth !== document.documentElement.clientWidth)
    ) {
      const rect = node.getBoundingClientRect();
      restoredScrollY = getLogicalScroll() + rect.top - browse.grid.anchorOffset;
    } else {
      restoredScrollY = browse.grid.scrollY;
    }
    setLogicalScroll(restoredScrollY);
    const link = focusId ? gridHost.rendered.get(focusId)?.querySelector("a") : null;
    link?.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      if (generation !== detailRenderGeneration || controller.signal.aborted) return;
      window.dispatchEvent(new CustomEvent("site:layout"));
    });
  };
  // Chrome silently drops history writes over 200 per 10 s, losing photo pushes after one scroll.
  // Scroll is written at most every 300 ms; a pending write is dropped when the entry changes.
  let persistTimer = 0;
  // Pending push of a related tap (R7); scroll is not written until it lands.
  let relatedOpenTimer = 0;
  controller.signal.addEventListener("abort", () => clearTimeout(relatedOpenTimer), { once: true });
  // A throttled write can miss the last scroll before Back/Forward; remember it per Barba entry.
  const entryScroll = new Map();
  const entryIndex = () => window.history.state?.index;
  const browseHistory = createBrowseHistoryController({
    cards,
    categories,
    pages,
    tagRegistry: artifact.tagRegistry || [],
    photos: viewer,
    barbaHistory: window.barba?.history,
    browserHistory: window.history,
    restoredHistoryState: startupHistory?.state,
    historyFallback: startupHistory?.historyFallback === true,
    softNavigation,
    getHref: () => window.location.href,
    getLogicalScroll,
    onApply({ action, browse, reason }) {
      // Back/Forward, opening or closing a card: a filter click still waiting for its cache must not overwrite it.
      if (reason !== "category") cancelLayoutWait();
      clearTimeout(persistTimer);
      persistTimer = 0;
      if (action === "push") entryScroll.delete(entryIndex());
      if (action === "pop" && entryScroll.has(entryIndex())) {
        const scrollY = entryScroll.get(entryIndex());
        browse = browse.photo
          ? { ...browse, detail: { ...browse.detail, scrollY } }
          : { ...browse, grid: { ...browse.grid, scrollY } };
      }
      // Opening or closing a photo and Back/Forward start a new page state: frames redraw (skeleton R3).
      resetSkeletonAssignments();
      // showPhoto and restoreGridEntry sync the locale link themselves.
      if (reason === "category") {
        syncLocaleLinks(browse);
        return;
      }
      if (browse.photo) {
        showPhoto(browse, reason);
        return;
      }
      restoreGridEntry(browse, reason);
    },
  });
  const localeHandoffStorage = safeSessionStorage();
  let pendingLocaleSeedHandoff = null;
  document.addEventListener("click", (event) => {
    const anchor = event.target?.closest?.("a[href]");
    if (!anchor || event.defaultPrevented || event.button !== 0
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!anchor.hasAttribute("download") && (!anchor.target || anchor.target === "_self")
      && new URL(anchor.href, location.href).origin === location.origin) {
      browseHistory.persistCurrent();
    }
    const link = anchor.matches("[data-language-option]") ? anchor : null;
    if (!link) return;
    const targetUrl = new URL(link.href, window.location.href);
    const targetLocale = link.dataset.languageOption === "en" ? "en" : "vi";
    if (targetUrl.origin !== window.location.origin || targetLocale === locale
      || targetUrl.pathname.match(ADVERTISING_PATH_PATTERN)?.[1] !== targetLocale) return;
    pendingLocaleSeedHandoff = {
      locale: targetLocale,
      seed: browseHistory.current.seed,
      targetUrl: targetUrl.href,
    };
  }, { capture: true, signal: controller.signal });
  const adapter = {
    ensurePhoto,
    getCardLink: (id) => gridHost.rendered.get(id)?.querySelector("a") || null,
    releasePhoto(id) {
      retainedPhotoIds.delete(id);
      renderWindow();
    },
    retainPhoto(id) {
      if (!cards.some((card) => card.id === id)) return false;
      retainedPhotoIds.add(id);
      ensurePhoto(id);
      return true;
    },
  };
  const cachedCoordinates = (targetFilter, visualOrigins) => {
    const targetGeometry = geometryFor(targetFilter);
    const origins = new Map();
    const visualSlots = [...gridHost.rendered.entries()]
      .filter(([, node]) => !node.hidden)
      .map(([id]) => visualOrigins?.get(id) || gridHost.positions.get(id))
      .filter(Boolean)
      .sort((left, right) => left.y - right.y || left.x - right.x);
    for (const [id, node] of gridHost.rendered) {
      const position = visualOrigins?.get(id) || gridHost.positions.get(id);
      if (!node.hidden && position) origins.set(id, position);
    }
    targetGeometry.placements.forEach((placement, index) => {
      if (origins.has(placement.card.id) || !visualSlots.length) return;
      for (let offset = 0; offset < visualSlots.length; offset += 1) {
        const origin = visualSlots[(index + offset) % visualSlots.length];
        if (origin.x !== placement.x || origin.y !== placement.y) {
          origins.set(placement.card.id, origin);
          return;
        }
      }
    });
    return origins;
  };
  const scheduleScroll = () => {
    if (gridHost.motionFrame || performance.now() < motionUntil) {
      pendingScroll = true;
      return;
    }
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      // A resize at page bottom clamps scroll as soon as the grid changes height, after this frame has been scheduled; placing cards instantly
      // while they are sliding makes them fly off (round 26), so defer until the slide ends like scroll during a transition.
      if (gridHost.motionFrame || performance.now() < motionUntil) {
        pendingScroll = true;
        return;
      }
      renderWindow({ scrolling: true });
      renderRelatedWindow();
      // Frames entering and leaving the layout viewport are already reported by skeletonObserver; running every scroll frame costs about 10ms on an old A05s.
      // Only on pinch-zoom does the visible region (visual viewport) drift from the region IntersectionObserver measures.
      if ((window.visualViewport?.scale ?? 1) > 1) syncSkeletonMotion();
    });
  };
  const captureScroll = () => {
    const browse = browseHistory.current;
    if (browse.photo) browseHistory.captureDetail({ ...browse.detail, scrollY: getLogicalScroll() });
    else browseHistory.captureGrid({ ...browse.grid, scrollY: getLogicalScroll() });
    browseHistory.persistCurrent();
  };
  const scheduleBrowsePersistence = () => {
    if (relatedOpenTimer) return;
    if (entryIndex() !== undefined) entryScroll.set(entryIndex(), getLogicalScroll());
    if (persistTimer || !ADVERTISING_PATH_PATTERN.test(location.pathname)) return;
    persistTimer = setTimeout(() => {
      persistTimer = 0;
      if (!controller.signal.aborted && ADVERTISING_PATH_PATTERN.test(location.pathname)) captureScroll();
    }, 300);
  };
  // Scroll speed between two consecutive scrolls; 150ms with no scroll counts as stopped.
  let scrollSample;
  let scrollIdleTimer = 0;
  const sampleScrollSpeed = (y) => {
    const time = performance.now();
    if (scrollSample) {
      setFastScroll(Math.abs(y - scrollSample.y) / Math.max(1, time - scrollSample.time) * 1000 > FAST_SCROLL_PX_PER_S);
    }
    scrollSample = { y, time };
    clearTimeout(scrollIdleTimer);
    scrollIdleTimer = setTimeout(() => {
      scrollSample = undefined;
      setFastScroll(false);
    }, 150);
  };
  const updateVisualScroll = (event) => {
    const y = Number(event.detail?.y);
    if (!Number.isFinite(y)) return;
    sampleScrollSpeed(y);
    currentVisualY = Math.max(0, y);
    usesVisualScroll = true;
    syncCtaParallax();
    scheduleScroll();
    scheduleBrowsePersistence();
    renderRelatedWindow();
  };
  const updateNativeScroll = () => {
    if (usesVisualScroll && window.scrollY === 0) return;
    sampleScrollSpeed(window.scrollY);
    currentVisualY = window.scrollY;
    usesVisualScroll = false;
    scheduleScroll();
    scheduleBrowsePersistence();
    // Write transform after all scroll reads, otherwise the next read forces a style recalc mid scroll event.
    syncCtaParallax();
  };
  const scheduleResize = () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      const viewportHeight = getLayoutViewportHeight();
      const viewportWidth = document.documentElement.clientWidth;
      if (activePhotoId) {
        // Detail built but still hidden (opened from grid): the task that shows detail lays out itself; measuring while hidden gives size 0 and costs a frame.
        if (photoView?.hidden) return;
        const geometryAlreadyMeasured = relatedMeasuredGeometry
          && relatedMeasuredGeometry.viewportHeight === viewportHeight
          && relatedMeasuredGeometry.viewportWidth === viewportWidth
          && relatedMeasuredGeometry.typographyKey === relatedTypographyKey();
        if (geometryAlreadyMeasured) {
          if (!ctaGeometryHash) renderCtaSkeleton();
          syncCtaParallax();
          renderRelatedWindow();
          return;
        }
        layoutRelated(browseHistory.current);
        window.dispatchEvent(new CustomEvent("site:layout"));
        return;
      }
      // Mount is still waiting for geometry from the Worker and will measure itself. Back during the wait already measured synchronously: resize must run.
      if (geometryPending && !geometry) return;
      // Crossing into another width band: keep the current layout until that band's cache is in, then resize once.
      const bandWait = layoutCachePending(filter);
      if (bandWait) {
        void bandWait.then(() => controller.signal.aborted || scheduleResize());
        return;
      }
      if (grid.clientWidth !== lastMeasuredGridWidth || document.documentElement.clientWidth !== lastLayoutViewportWidth) {
        const origins = visualCoordinates();
        // A card not yet mounted (outside the virtual window) starts from its place in the old layout, not from the grid top,
        // so the whole masonry slides as one block (measured on PC, round 28).
        geometry?.placements.forEach(({ card, x, y, pixelWidth: w, pixelHeight: h }) => origins.has(card.id) || origins.set(card.id, { x, y, w, h }));
        cancelMotion();
        // Dragging a window edge (consecutive width relayouts under 250ms): set positions directly each frame, no sliding. Each
        // relayout costs about 100ms so a 0.4s slide is restarted continuously, items get stuck between the old and new layouts, overlapping
        // each other (measured on PC, round 44). A single resize still slides.
        const now = performance.now();
        const dragging = now - lastResizeAt < 250;
        lastResizeAt = now;
        if (dragging) cancelCtaSlides(ctaSlideNodes());
        measure({ animate: !dragging, origins });
      } else if (!ctaDeferred && (!ctaGeometryHash || viewportHeight !== lastCtaViewportHeight)) {
        renderCtaSkeleton();
        window.dispatchEvent(new CustomEvent("site:layout"));
      }
      // The address bar hiding and showing only changes innerHeight (batch by svh is not rebuilt): CTA parallax must be recomputed for the new innerHeight.
      syncCtaParallax();
      scheduleScroll();
    });
  };

  const handOffVideo = (node) => {
    const video = node.advertisingActiveVideo?.();
    // The video's own id: while a press waits for its media, the card's active id already names the pressed media (media-card R3).
    videoHandoff = video ? { mediaId: video.dataset.masonryMediaItem, time: video.currentTime } : null;
  };
  grid.addEventListener("click", (event) => {
    const link = event.target.closest("[data-masonry-card] > a");
    if (!link || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const card = link.closest("[data-masonry-card]");
    if (!card) return;
    // No detail view (Projects page): links go straight to the detail page through a normal route.
    if (!viewer) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const rect = card.getBoundingClientRect();
    const activeId = card.dataset.masonryActiveMediaId;
    browseHistory.captureGrid({
      anchorOffset: rect.top,
      focusId: card.dataset.masonryCard,
      mediaId: activeId || null,
      scrollY: getLogicalScroll(),
      viewportWidth: document.documentElement.clientWidth,
    });
    // A scroll right before the tap has not yet reached entryScroll (the scroll event arrives next frame); Back must return to the exact Y at the tap.
    entryScroll.delete(entryIndex());
    handOffVideo(card);
    browseHistory.openPhoto(card.dataset.masonryCard, activeId || null);
  }, { signal: controller.signal });
  grid.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !geometry) return;
    const item = event.target instanceof Element ? event.target.closest("[data-masonry-card]") : null;
    if (!item || !grid.contains(item)) return;
    const currentIndex = geometry.placements.findIndex((placement) => placement.card.id === item.dataset.masonryCard);
    const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= geometry.placements.length) return;
    const nextPlacement = geometry.placements[nextIndex];
    const nextNode = gridHost.rendered.get(nextPlacement.card.id);
    if (nextNode && !nextNode.hidden) return;
    event.preventDefault();
    focusVirtualPlacement(nextPlacement);
  }, { signal: controller.signal });

  const onRailClick = (event) => {
    const control = event.target.closest("[data-masonry-filter], [data-masonry-product]");
    if (!control || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const nextFilter = control.dataset.masonryFilter ?? control.dataset.masonryProduct;
    // Clicking the active filter again cancels a click still waiting for its cache.
    if (nextFilter === filter) {
      cancelLayoutWait();
      return;
    }
    if (grid.contains(document.activeElement)) control.focus();
    whenLayoutReady(nextFilter, () => {
      browseHistory.replaceCategory(nextFilter);
      setActiveFilter(nextFilter, { animate: true });
    }, control);
  };
  filters.addEventListener("click", onRailClick, { signal: controller.signal });
  chipGroups.forEach((group) => group.addEventListener("click", onRailClick, { signal: controller.signal }));
  // Chrome does not scroll a partly covered link on focus; keep the focused filter intact on the mobile rail.
  filters.addEventListener("focusin", (event) => {
    event.target.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, { signal: controller.signal });
  relatedGrid?.addEventListener("click", (event) => {
    const link = event.target.closest("[data-masonry-related-card] > a");
    if (!link || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const node = link.closest("[data-masonry-related-card]");
    const nextId = node?.dataset.masonryRelatedCard;
    if (!nextId || nextId === browseHistory.current.photo) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const activeId = node.dataset.masonryActiveMediaId;
    const rect = node.getBoundingClientRect();
    browseHistory.captureDetail({
      anchorId: nextId,
      anchorOffset: rect.top,
      mediaId: activePrimaryMediaId,
      scrollY: getLogicalScroll(),
      viewportWidth: document.documentElement.clientWidth,
    });
    // The tap task only saves the anchor; the new entry and its primary arrive in the next task (R7).
    // Move focus off the related card now, while style is clean, so it forces no recalc.
    if (relatedGrid.contains(document.activeElement)) photoInfo?.focus({ preventScroll: true });
    // Back returns to the Y of the tap, so a scroll still settling by the time of the push does not overwrite it.
    if (entryIndex() !== undefined) entryScroll.set(entryIndex(), getLogicalScroll());
    const fromPhoto = browseHistory.current.photo;
    handOffVideo(node);
    clearTimeout(relatedOpenTimer);
    relatedOpenTimer = setTimeout(() => {
      relatedOpenTimer = 0;
      if (!controller.signal.aborted && browseHistory.current.photo === fromPhoto) browseHistory.openPhoto(nextId, activeId || null);
    });
  }, { signal: controller.signal });
  relatedGrid?.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !relatedLayout) return;
    const item = event.target instanceof Element ? event.target.closest("[data-masonry-related-card]") : null;
    if (!item || !relatedGrid.contains(item)) return;
    const placements = relatedLayout.photoPlacements;
    const currentIndex = placements.findIndex((placement) => placement.card.id === item.dataset.masonryRelatedCard);
    const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= placements.length) return;
    const nextId = placements[nextIndex].card.id;
    const nextNode = relatedHost.rendered.get(nextId);
    if (nextNode) return;
    event.preventDefault();
    ensureRelatedPhoto(nextId)?.querySelector("a")?.focus({ preventScroll: true });
    restoreRelatedDomOrder();
  }, { signal: controller.signal });
  photoDescriptionScroll?.addEventListener("scroll", syncScrollHints, { passive: true, signal: controller.signal });
  // Locomotive captures wheel and keys at the container so the whole page scrolls; when the text can still scroll keep the input in the description.
  photoDescriptionScroll?.addEventListener("wheel", (event) => {
    const { scrollTop, scrollHeight, clientHeight } = photoDescriptionScroll;
    if (event.deltaY < 0 ? scrollTop > 0 : event.deltaY > 0 && scrollTop < scrollHeight - clientHeight - 1) event.stopPropagation();
  }, { passive: true, signal: controller.signal });
  photoDescriptionScroll?.addEventListener("keydown", (event) => {
    if (photoDescriptionScroll.scrollHeight > photoDescriptionScroll.clientHeight + 1
      && ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) event.stopPropagation();
  }, { signal: controller.signal });
  // Dragging the scrollbar thumb: shift the pointer in proportion to the hidden text over the distance the thumb can travel.
  photoDescriptionBar?.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const { scrollTop, scrollHeight, clientHeight } = photoDescriptionScroll;
    const ratio = (scrollHeight - clientHeight) / Math.max(1, clientHeight - descriptionThumbHeight);
    const move = ({ clientY }) => { photoDescriptionScroll.scrollTop = scrollTop + (clientY - event.clientY) * ratio; };
    const end = () => {
      delete photoDescriptionBar.dataset.dragging;
      photoDescriptionBar.removeEventListener("pointermove", move);
    };
    photoDescriptionBar.setPointerCapture(event.pointerId);
    photoDescriptionBar.dataset.dragging = "";
    photoDescriptionBar.addEventListener("pointermove", move);
    photoDescriptionBar.addEventListener("lostpointercapture", end, { once: true });
  }, { signal: controller.signal });
  suggestionNode?.addEventListener("click", (event) => {
    const link = event.target.closest("[data-masonry-suggestion-tag]");
    if (!link || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const tag = link.dataset.masonrySuggestionTag;
    const nextTag = browseHistory.current.tag === tag ? null : tag;
    if (!browseHistory.replaceTag(nextTag)) return;
    requestAnimationFrame(() => {
      const nextLink = [...suggestionNode.querySelectorAll("[data-masonry-suggestion-tag]")]
        .find((node) => node.dataset.masonrySuggestionTag === nextTag);
      (nextLink || photoInfo)?.focus({ preventScroll: true });
    });
  }, { signal: controller.signal });
  // Escape and the back button take the same path (R10): an image entered directly goes back to the group masonry, otherwise go back one entry.
  const leavePhoto = () => {
    if (!browseHistory.escapeDirectPhoto()) history.back();
  };
  photoView?.querySelector("[data-detail-back]")?.addEventListener("click", () => {
    if (browseHistory.current.photo) leavePhoto();
  }, { signal: controller.signal });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented || photoDialog?.open
      || document.querySelector('#site-menu')?.open || !browseHistory.current.photo) return;
    event.preventDefault();
    leavePhoto();
  }, { signal: controller.signal });
  addEventListener("site:scroll", updateVisualScroll, { signal: controller.signal });
  addEventListener("site:scroll", trackScroll(({ detail }) => detail.y), { passive: true, signal: controller.signal });
  addEventListener("scroll", trackScroll(() => scrollY), { passive: true, signal: controller.signal });
  addEventListener("scroll", () => { lastScrollAt = performance.now(); scrollActive = "onscrollend" in window; }, { passive: true, signal: controller.signal });
  addEventListener("scrollend", () => { scrollActive = false; }, { signal: controller.signal });
  addEventListener("scroll", updateNativeScroll, { passive: true, signal: controller.signal });
  addEventListener("scroll", renderRelatedWindow, { passive: true, signal: controller.signal });
  // Card video schedule (media-card R4, owner 2026-10-24): masonry and related in detail (owner 2026-10-25) play every
  // card that is standing on a video and showing more than 1/2 of its height below the navbar; reduced motion plays only the card under the mouse. Each card runs
  // its own video playlist (createPhotoCard, ended event).
  let playingVideos = [];
  let videoScheduleFrame = 0;
  const scheduleVideo = () => {
    // Catalog has no video yet (main 2026-10-26): skip measuring layout every scroll frame.
    if (!playingVideos.length && !document.querySelector("figure.masonry-card video")) return;
    const hovered = matchMedia("(hover: hover)").matches ? document.querySelector("figure.masonry-card:hover") : null;
    const navBottom = Math.max(0, document.querySelector("[data-site-header]")?.getBoundingClientRect().bottom ?? 0);
    const next = [...document.querySelectorAll("figure.masonry-card")].flatMap((figure) => {
      const video = figure.advertisingActiveVideo?.();
      // getClientRects instead of checkVisibility (Safari below 17.4 lacks it): empty when the video or an ancestor is display none.
      if (!video?.getClientRects().length) return [];
      if (reduced) return figure === hovered ? [video] : [];
      const { top, bottom, height } = video.getBoundingClientRect();
      return Math.min(bottom, innerHeight) - Math.max(top, navBottom) > height / 2 ? [video] : [];
    });
    playingVideos.forEach((video) => { if (!next.includes(video)) video.pause(); });
    // A video returning to the schedule resumes from where it stopped. Only one video starts per frame, the rest wait for the next frame
    // (owner 2026-10-25: three videos starting in the same frame make an 82ms Commit on PC).
    const waiting = next.filter((video) => video.paused);
    void waiting[0]?.play().catch(() => {});
    if (waiting.length > 1) scheduleVideoSoon();
    playingVideos = next;
  };
  const scheduleVideoSoon = () => {
    if (videoScheduleFrame) return;
    videoScheduleFrame = requestAnimationFrame(() => {
      videoScheduleFrame = 0;
      scheduleVideo();
    });
  };
  addEventListener("scroll", scheduleVideoSoon, { passive: true, signal: controller.signal });
  addEventListener("site:scroll", scheduleVideoSoon, { signal: controller.signal });
  document.addEventListener("masonry-media-change", scheduleVideoSoon, { signal: controller.signal });
  for (const type of ["pointerover", "pointerout"]) {
    document.addEventListener(type, (event) => {
      const figure = event.pointerType === "mouse" && event.target.closest?.("figure.masonry-card");
      if (!figure?.advertisingActiveVideo?.() || figure.contains(event.relatedTarget)) return;
      scheduleVideoSoon();
    }, { signal: controller.signal });
  }
  reducedMotionQuery.addEventListener("change", ({ matches }) => {
    reduced = matches;
    syncCtaParallax();
  }, { signal: controller.signal });
  addEventListener("resize", scheduleResize, { passive: true, signal: controller.signal });
  window.visualViewport?.addEventListener("resize", scheduleResize, { passive: true, signal: controller.signal });
  window.visualViewport?.addEventListener("scroll", scheduleScroll, { passive: true, signal: controller.signal });
  addEventListener("site:menu-closed", () => {
    const browse = browseHistory.current;
    if (browse.photo || !browse.grid.focusId) return;
    ensurePhoto(browse.grid.focusId)?.querySelector("a")?.focus({ preventScroll: true });
  }, { signal: controller.signal });
  addEventListener("pagehide", () => {
    // Keep the native target entry while Barba still owns the outgoing index.
    if (!window.history.state?.ttAdvertisingHistoryFallback) captureScroll();
    if (pendingLocaleSeedHandoff) {
      writeVisitSeedHandoff(
        localeHandoffStorage,
        pendingLocaleSeedHandoff.targetUrl,
        pendingLocaleSeedHandoff.seed,
      );
      pendingLocaleSeedHandoff = null;
    }
  }, { signal: controller.signal });
  addEventListener("languagechange", () => {
    browseHistory.syncHref();
    const nextLocale = currentLocale();
    if (pendingLocaleSeedHandoff?.locale === nextLocale) pendingLocaleSeedHandoff = null;
    locale = nextLocale;
    gridHost.detached.clear();
    relatedHost.detached.clear();
    updateLocalizedContent();
    if (browseHistory.current.photo) renderPhoto(browseHistory.current, "locale");
  }, { signal: controller.signal });
  let observedCtaHeight = gridCta?.offsetHeight || 0;
  let observedCopySize = "";
  const resizeObserver = new ResizeObserver((entries) => {
    if (activePhotoId && !suggestionNode?.hidden
      && entries.some(entry => entry.target.matches(".detail-view__suggestion-links"))
      && suggestionNode.scrollHeight > suggestionNode.offsetHeight + 1) {
      relatedLayoutKey = "";
      relatedMeasuredGeometry = null;
    }
    // A heading or link shifting the copy edge (late style, font change) invalidates the CTA measurement. The grid hides when opening
    // detail then shows again at the same size, so keep the measurement so the Back task does not re-fit the heading (decision phone-frame-budget).
    const copyEntry = entries.find((entry) => entry.target === gridCtaCopy);
    const copySize = copyEntry && `${copyEntry.contentRect.width}x${copyEntry.contentRect.height}`;
    if (copyEntry?.contentRect.width && copySize !== observedCopySize) {
      observedCopySize = copySize;
      ctaCopyKey = "";
      ctaGeometryHash = "";
    }
    if (entries.some((entry) => entry.target === siteFooter)) ctaGeometryHash = "";
    if (entries.some((entry) => entry.target === gridCta) && gridCta.offsetHeight !== observedCtaHeight) {
      observedCtaHeight = gridCta.offsetHeight;
      ctaGeometryHash = "";
    }
    scheduleResize();
  });
  resizeObserver.observe(grid);
  if (gridCta) resizeObserver.observe(gridCta);
  if (gridCtaCopy) resizeObserver.observe(gridCtaCopy);
  if (siteFooter) resizeObserver.observe(siteFooter);
  if (photoPrimary) resizeObserver.observe(photoPrimary);
  if (photoInfo) [...photoInfo.children].forEach((node) => resizeObserver.observe(node));
  const refreshFontGeometry = () => {
    if (controller.signal.aborted) return;
    // Web font metrics shift the CTA baseline without changing the heading box size.
    ctaCopyKey = "";
    ctaGeometryHash = "";
    if (activePhotoId) {
      relatedLayoutKey = "";
      relatedMeasuredGeometry = null;
    }
    scheduleResize();
  };
  document.fonts?.addEventListener("loadingdone", refreshFontGeometry, { signal: controller.signal });

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    idleWorker?.terminate();
    signal?.removeEventListener("abort", cleanup);
    controller.abort();
    clearTimeout(revealHoldTimer);
    stopSuggestionSlides?.();
    if (photoVideo) {
      closePrimaryStrip();
      photoVideo.pause();
      releaseVideoSource(photoVideo);
    }
    gridHost.rendered.forEach((node) => node.querySelectorAll("video").forEach(releaseVideoSource));
    photoViewer.cleanup();
    clearRelatedCards();
    gridHost.detached.clear();
    skeletonObserver?.disconnect();
    visibleSkeletonFrames.clear();
    resizeObserver.disconnect();
    scrollHintObserver.disconnect();
    mediaObserver.disconnect();
    gridHost.masonry?.destroy();
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    gridHost.cancelGhosts();
    relatedHost.cancelGhosts();
    gridHost.ghosts.destroy();
    relatedHost.ghosts.destroy();
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    if (gridHost.motionFrame) cancelAnimationFrame(gridHost.motionFrame);
    if (gridHost.motionTimer) clearTimeout(gridHost.motionTimer);
    retainedPhotoIds.clear();
    settlePrimaryReveal();
    [...cardSkeletons.keys()].forEach(dropCardSkeleton);
    cancelAnimationFrame(skeletonSyncFrame);
    clearCtaSkeleton();
    photoGlass.remove();
    document.body.classList.remove("is-masonry-browse", "is-detail");
    delete document.body.dataset.detailActive;
    if (activeInstance?.container === container) activeInstance = undefined;
  };
  signal?.addEventListener("abort", cleanup, { once: true });
  // Wait for the layout cache before exposing the adapter: an adapter call (ensurePhoto) during the wait would measure and
  // set the scroll, then the mount's own measure would overwrite it.
  if (!browseHistory.current.photo) {
    geometryPending = true;
    await layoutCachePending(filter);
    // Replay the layout (into the geometry cache) before the build; setup and the first build are separate tasks (R7, 50ms gate on the A04s).
    if (!controller.signal.aborted && document.documentElement.clientWidth) geometryFor(filter);
    await nextTask();
    geometryPending = false;
    if (controller.signal.aborted) return cleanup;
  }
  // Browse mode takes the CTA cluster out of the flow: set it in the task that gives the grid its height, otherwise a painted frame
  // between them moves the footer and CTA into view and back (layout shift).
  document.body.classList.add("is-masonry-browse");
  activeInstance = { adapter, browseHistory, container, cleanup, pages, photoViewer, syncSkeletonMotion };
  if (browseHistory.current.photo) {
    // The grid is hidden under the photo; ensurePhoto measures it on return. Do not solve masonry on the main thread when opening detail
    // (ResizeObserver measuring the hidden grid, 238ms on the A04s): geometry is computed on the Worker after detail finishes, Back takes it from cache.
    geometryPending = true;
    retainedPhotoIds.add(browseHistory.current.photo);
    // Each step below is its own task so no step blocks input over 50ms on an Android phone (R7, showPhoto).
    await nextTask();
    if (controller.signal.aborted) return cleanup;
    // Pay the style and layout cost of photo mode ahead of the primary work; hidden so no frame without a size is painted.
    document.body.classList.add("is-detail");
    if (gridSection) gridSection.hidden = true;
    if (photoView) {
      photoView.hidden = false;
      photoView.style.visibility = "hidden";
    }
    // Suggestions are rebuilt only when there is a new hero, so renderPhoto reuses them.
    renderSuggestionLinks(browseHistory.current, locale === "en");
    getLayoutViewportHeight();
    await nextTask();
    // Reveal the view once the card description exists so showPhoto builds the primary in the same task: no frame paints index.html's default image.
    await ensureDetail();
    photoView?.style.removeProperty("visibility");
    if (controller.signal.aborted) return cleanup;
    await showPhoto(browseHistory.current, "direct");
    await nextTask();
    if (controller.signal.aborted) return cleanup;
    await layoutCachePending(filter);
    geometryPending = false;
    if (controller.signal.aborted) return cleanup;
    // Measure the hidden grid (layout cache replay) in its own task, not inside the Back task (A04s is slower on Back).
    await nextTask();
    if (controller.signal.aborted) return cleanup;
    if (!geometry) measure();
  } else {
    // Unknown ?photo= id goes back to the grid, which index.html hid before the first layout.
    document.body.classList.remove("is-detail");
    // A restore deep in the grid needs the CTA batch's height before the scroll is set: build it in this task as before.
    ctaDeferred = !(browseHistory.current.grid.scrollY > 0) && !browseHistory.current.grid.focusId;
    firstBuild = true;
    measure({ animate: true });
    firstBuild = false;
    restoreGridEntry(browseHistory.current, "direct");
  }
  browseHistory.persistCurrent();
  if (!ctaDeferred) return cleanup;
  // Page motion awaits this mount: let it run in the next task, then the CTA batch below the grid in the task after.
  await nextTask();
  setTimeout(() => {
    ctaDeferred = false;
    if (controller.signal.aborted || activePhotoId || !geometry) return;
    renderCtaSkeleton();
    window.dispatchEvent(new CustomEvent("site:layout"));
  });
  return cleanup;
}

export function unmountMasonry() {
  activeInstance?.cleanup();
}

window.TruongThinhMasonry = {
  canHandlePopState: (previousHref, nextHref) => Boolean(activeInstance)
    && isQueryOnlyNavigation(previousHref || activeInstance.browseHistory.currentHref, nextHref, activeInstance.pages),
  captureDetail: (snapshot) => activeInstance?.browseHistory.captureDetail(snapshot) || null,
  getAdapter: () => activeInstance?.adapter || null,
  getBrowseState: () => activeInstance?.browseHistory.current || null,
  getCurrentHref: () => activeInstance?.browseHistory.currentHref || null,
  handlePopState: (event, previousHref, nextHref) =>
    activeInstance?.browseHistory.handlePopState(event, previousHref, nextHref) || false,
  handleViewerPopState: () => activeInstance?.photoViewer.popState() || false,
  mount: mountMasonry,
  navigatePhoto: (id) => Boolean(activeInstance?.browseHistory.openPhoto(id)),
  navigateQuery: (href, { reason = "navbar" } = {}) => {
    if (!activeInstance) return false;
    const next = new URL(href, window.location.href);
    const photo = detailId(next);
    if (photo) return Boolean(activeInstance.browseHistory.openPhoto(photo));
    if (reason === "navbar") {
      activeInstance.browseHistory.returnToGrid({ reason });
      return true;
    }
    return false;
  },
  replaceTag: (tag) => Boolean(activeInstance?.browseHistory.replaceTag(tag)),
  unmount: unmountMasonry,
};
