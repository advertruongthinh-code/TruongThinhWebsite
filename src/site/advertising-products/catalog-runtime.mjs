//# allFunctionsCalledOnLoad
// Compile hint của V8: compile mọi hàm ở thread nền lúc tải, để lần chạm card đầu không compile lazy trên main thread
// (khoảng 20% task click khi mở detail; decision phone-frame-budget).
import { responsiveSrcset, tierAutoSizes, tierSizes, tierSource } from "./responsive-image.mjs";
import {
  ADVERTISING_LAYOUT_ALGORITHM_VERSION,
  ADVERTISING_SEARCH_OPERATION_BUDGET,
  advertisingSpacing,
  columnsForWidth,
  computeAdvertisingPhotoGeometry,
  compileAdvertisingProductLayout,
  fnv1a32,
  getVirtualWindow,
  advertisingFilterRank,
  matchesAdvertisingFilter,
  normalizeAdvertisingProductSettings,
  validateAdvertisingCards,
} from "./layout-core.mjs";
import { createAdvertisingPhotoViewer } from "./photo-viewer.mjs";
import { mountSuggestionSlides, suggestionDeck } from "./suggestion-slideshow.mjs";
import { createAdvertisingSeed, shuffleWithSeed } from "./random-order.mjs";
import {
  createSkeletonFlowFrameLayout,
  createSkeletonFlowRenderer,
  createSkeletonFlowWorkerRenderer,
  createSharedSkeletonFlowLayer,
  skeletonFlowWorkerSupported,
  drawSkeletonFlowAssignment,
  SKELETON_FLOW_CONTEXT_ATTRIBUTES,
  skeletonFlowStill,
} from "./skeleton-flow.mjs";
import { arcGlassGeometry, createGlassSurface, layoutArcGlass, playGlassReveal } from "./glass-surface.mjs";

let activeInstance;

const startLayoutWorker = () => new Worker(new URL("./layout-worker.mjs", import.meta.url), { type: "module" });
// Một lần compile trên Worker riêng; null khi Worker hoặc clone lỗi để caller compile đồng bộ.
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
const CAPTION_METRICS_VERSION = "advertising-caption-v2";
const ADVERTISING_BROWSE_STATE_KEY = "advertisingBrowse";
export const ADVERTISING_VISIT_SEED_HANDOFF_KEY = "tt-advertising-visit-seed-handoff-v1";
const ADVERTISING_VISIT_SEED_HANDOFF_TTL_MS = 30_000;
// Trang gốc và trang cụm, sản phẩm (taxonomy R4): /<locale>/advertising-products/[<cụm>/[<sản phẩm>/]].
const ADVERTISING_PATH_PATTERN = /^\/(vi|en)\/advertising-products(?:\/((?:[^/]+\/){0,2}))?$/;
// Trang card (media-seo R1): detail có URL /<locale>/advertising-products/p/<card-id>/; ?photo= cũ vẫn đọc được.
const ADVERTISING_CARD_PATH_PATTERN = /^\/(?:vi|en)\/advertising-products\/p\/([^/]+)\/$/;
const advertisingCardPath = (locale, id) => `/${locale}/advertising-products/p/${encodeURIComponent(id)}/`;
const advertisingPhotoId = (url) => {
  const id = url.pathname.match(ADVERTISING_CARD_PATH_PATTERN)?.[1];
  if (!id) return url.searchParams.get("photo");
  try { return decodeURIComponent(id); } catch { return null; }
};
const skeletonNativeContexts = [];
let skeletonDocumentParked = false;
let skeletonDocumentEventsBound = false;
const skeletonPhone = () => matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0
  || document.documentElement.clientWidth <= 750;
// Desktop rộng hiển thị 8-10 frame CTA cùng lúc; 12 giữ tất cả còn sống và vẫn dưới giới hạn 16 context của Chrome.
// Điện thoại cũng chạy mọi khung trong viewport (owner 2026-10-10), không còn giới hạn 2.
const SKELETON_CONTEXT_BUDGET = 12;
// Reveal đã duyệt: glass trong 0-0.6s, crossfade 0.3-0.9s, glass ra 0.6-1.4s; card và primary thu thời lượng về 0.6s (owner 19/10).
const MEDIA_REVEAL_MS = 1400;
const CARD_REVEAL_MS = 600;
const SKELETON_ASSIGN_BUDGET_MS = 8;
// Điện thoại giữ reveal của card đến khi swipe dừng: một cú fling nhanh nếu không sẽ bắt đầu reveal Kính cho từng card lướt qua.
const PHONE_REVEAL_SCROLL_IDLE_MS = 120;
const PHONE_SCROLL_SETTLE_MS = 500;
// Khung card trên điện thoại chạy cả lúc vuốt: một phần tư số pixel để GPU giữ gate fps (R8, owner 18/10).
const PHONE_CARD_FLOW = { width: 120, height: 80 };
// Layer Flow chung của batch theo document; null khi không có WebGL thì batch về renderer riêng.
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

export function writeAdvertisingVisitSeedHandoff(storage, targetUrl, seed, { now = Date.now() } = {}) {
  const url = normalizedHandoffUrl(targetUrl);
  if (!storage || !url || typeof seed !== "string" || !seed || seed.length > 128 || !Number.isFinite(now)) return false;
  try {
    storage.setItem(ADVERTISING_VISIT_SEED_HANDOFF_KEY, JSON.stringify({
      version: 1,
      url,
      seed,
      expiresAt: now + ADVERTISING_VISIT_SEED_HANDOFF_TTL_MS,
    }));
    return true;
  } catch {
    return false;
  }
}

export function consumeAdvertisingVisitSeedHandoff(storage, {
  targetUrl,
  navigationType,
  now = Date.now(),
} = {}) {
  let serialized;
  try { serialized = storage?.getItem(ADVERTISING_VISIT_SEED_HANDOFF_KEY); }
  catch { return null; }
  try { storage?.removeItem(ADVERTISING_VISIT_SEED_HANDOFF_KEY); }
  catch { /* Giá trị đọc được vẫn được validate và dùng cho lần khởi tạo này. */ }
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

const finiteScroll = (value) => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);
const optionalFinite = (value) => value === null || value === undefined || value === ""
  ? null
  : Number.isFinite(Number(value)) ? Number(value) : null;
const nullableId = (value) => typeof value === "string" && value ? value : null;

export function isAdvertisingQueryOnlyNavigation(previousHref, nextHref) {
  let previous;
  let next;
  try {
    previous = new URL(previousHref);
    next = new URL(nextHref, previous);
  } catch {
    return false;
  }
  // Đổi filter giờ đổi cả path cụm, sản phẩm; cùng locale thì vẫn là điều hướng tại chỗ.
  const previousLocale = previous.pathname.match(ADVERTISING_PATH_PATTERN)?.[1];
  return previous.origin === next.origin
    && Boolean(previousLocale)
    && next.pathname.match(ADVERTISING_PATH_PATTERN)?.[1] === previousLocale
    && previous.pathname + previous.search !== next.pathname + next.search;
}

// ?category= nhận id cụm, slug VI/EN, slug nhóm cũ (taxonomy R4) hoặc id sản phẩm; trả id filter hoặc null.
const resolveAdvertisingFilter = (value, categories, cards) =>
  categories.find((entry) => [entry.slug, entry.slugVi, entry.slugEn, entry.legacySlug].includes(value))?.slug
  ?? (cards.some((card) => card.productIds?.includes(value)) ? value : null);

// Trang cụm, sản phẩm (taxonomy R4) đặt filter theo path; pages là artifact.pages (vi, en là path sau gốc).
// Mục query (sản phẩm chưa có trang, R5) mượn path cụm nên không đặt filter theo path.
const advertisingPathFilter = (pathname, pages) => {
  const [, locale, rest] = pathname.match(ADVERTISING_PATH_PATTERN) || [];
  return rest ? pages.find((page) => !page.query && `${page[locale]}/` === rest)?.filter ?? null : null;
};

export function parseAdvertisingBrowseLocation(input, { cards = [], categories = [], pages = [], tagRegistry = [] } = {}) {
  const url = input instanceof URL ? input : new URL(input, "https://invalid.local");
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const tagIds = new Set(tagRegistry.map((entry) => entry.id));
  const requestedPhoto = advertisingPhotoId(url);
  const photoRecord = cardById.get(requestedPhoto);
  const requestedCategory = url.searchParams.get("category");
  const category = photoRecord?.category || resolveAdvertisingFilter(requestedCategory, categories, cards)
    || advertisingPathFilter(url.pathname, pages) || "all";
  const requestedTag = url.searchParams.get("tag");
  return {
    category,
    photo: photoRecord?.id || null,
    tag: photoRecord && tagIds.has(requestedTag) ? requestedTag : null,
  };
}

export function serializeAdvertisingBrowseLocation(input, browse = {}, categories = [], pages = []) {
  const url = input instanceof URL ? new URL(input.href) : new URL(input, "https://invalid.local");
  for (const key of ["category", "photo", "tag"]) url.searchParams.delete(key);
  // Filter có trang (taxonomy R4) ghi thành path theo slug của locale; sản phẩm chưa có trang (R5) ghi path cụm kèm
  // ?category=; filter không có mục nào về gốc kèm ?category=.
  const locale = url.pathname.match(ADVERTISING_PATH_PATTERN)?.[1];
  // Detail ghi path trang card, không kèm category (media-seo R1).
  if (locale && browse.photo) {
    url.pathname = advertisingCardPath(locale, browse.photo);
    if (browse.tag) url.searchParams.set("tag", browse.tag);
    return url;
  }
  const page = locale && pages.find((entry) => entry.filter === (browse.category || "all"));
  if (locale) url.pathname = `/${locale}/advertising-products/${page?.[locale] ? `${page[locale]}/` : ""}`;
  // Cụm ghi slug theo locale của URL; id sản phẩm ghi nguyên.
  const entry = categories.find((item) => item.slug === browse.category);
  const category = entry?.[url.pathname.startsWith("/en/") ? "slugEn" : "slugVi"] ?? browse.category;
  if (category && category !== "all" && (!page || page.query)) url.searchParams.set("category", category);
  if (browse.photo) url.searchParams.set("photo", browse.photo);
  if (browse.tag) url.searchParams.set("tag", browse.tag);
  return url;
}

const compareRelatedSource = (left, right) =>
  left.sourceOrder - right.sourceOrder || left.id.localeCompare(right.id);

export function selectAdvertisingRelated({ cards = [], categoryOrder = [], heroId, tag = null, seed = null } = {}) {
  const hero = cards.find((card) => card.id === heroId);
  if (!hero) return [];
  // Tầng điểm build sẵn trong artifact (taxonomy R7); card cùng cụm còn lại (điểm 0) là tầng cuối.
  const cardById = new Map(cards.map((card) => [card.id, card]));
  let tiers = (hero.related || []).map((ids) => ids.map((id) => cardById.get(id)).filter(Boolean));
  const scored = new Set(tiers.flat());
  tiers.push(cards.filter((card) => card.id !== hero.id && !scored.has(card) && card.category === hero.category)
    .sort(compareRelatedSource));
  if (tag) {
    const hasTag = (card) => Array.isArray(card.tagIds) && card.tagIds.includes(tag);
    const ranked = new Set(tiers.flat());
    const categoryRank = new Map(categoryOrder.map((category, index) => [category, index]));
    // Card mang tag ngoài láng giềng xếp sau, theo thứ tự cụm rồi sourceOrder như trước.
    const rest = cards.filter((card) => card.id !== hero.id && !ranked.has(card) && hasTag(card)).sort((left, right) =>
      (categoryRank.get(left.category) ?? Number.MAX_SAFE_INTEGER)
        - (categoryRank.get(right.category) ?? Number.MAX_SAFE_INTEGER)
      || compareRelatedSource(left, right));
    tiers = [...tiers.map((tier) => tier.filter(hasTag)), rest];
  }
  // Seed chỉ xáo trong một tầng để thứ tự điểm giữ nguyên.
  return tiers.flatMap((tier, index) => seed === null
    ? tier
    : shuffleWithSeed(tier, seed, `related:${heroId}:${tag || "all"}:${index}`));
}

// Nút gợi ý lấy từ sản phẩm (tag nhóm product, taxonomy R7) và tag của ảnh.
const SUGGESTION_TAG_GROUPS = new Set(["product", "variant", "use"]);

export function selectAdvertisingSuggestions({ cards = [], heroId, activeTag = null, limit = 4, tagRegistry = [] } = {}) {
  const hero = cards.find((card) => card.id === heroId);
  if (!hero) return [];
  const tagById = new Map(tagRegistry.map((tag) => [tag.id, tag]));
  const validCards = cards.filter((card) => card.media?.src
    && Number(card.media.width) > 0
    && Number(card.media.height) > 0);
  // Gom card theo tag một lượt: lọc lại toàn bộ card cho từng tag của registry là phần nặng của task dựng primary.
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
  // Tag cũ trùng nhãn với sản phẩm chỉ giữ một nút: nút đầu tiên, trừ khi tag sau đang bật.
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

export function compileAdvertisingRelatedLayout({
  cards = [], categoryOrder = [], columns: requestedColumns, datasetVersion, heroId,
  layoutViewportWidth, viewportHeight = 900, headerHeight = 0, safeTop = 0, safeBottom = 0,
  settings, measureDescriptionHeight, measureDescriptionMinimumHeight, minimumImageZoneHeight = 0,
  suggestionCard = null, tag = null, seed = null, primaryMedia = null,
  compile = compileAdvertisingProductLayout,
} = {}) {
  const hero = cards.find((card) => card.id === heroId);
  if (!hero) throw new Error("Related layout requires a known photo");
  const related = selectAdvertisingRelated({ cards, categoryOrder, heroId, tag, seed });
  const preferredColumns = Number.isInteger(requestedColumns) && requestedColumns >= 1 && requestedColumns <= 4
    ? requestedColumns : columnsForWidth(layoutViewportWidth);
  const columns = preferredColumns;
  const geometryOptions = {
    layoutViewportWidth, viewportHeight, columns, headerHeight, safeTop, safeBottom,
    imageWidth: primaryMedia?.width || hero.media.width,
    imageHeight: primaryMedia?.height || hero.media.height, minimumImageZoneHeight,
  };
  const basePrimary = computeAdvertisingPhotoGeometry(geometryOptions);
  const primary = typeof measureDescriptionHeight === "function" || typeof measureDescriptionMinimumHeight === "function"
    ? computeAdvertisingPhotoGeometry({ ...geometryOptions,
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
    ? Math.ceil(ADVERTISING_SEARCH_OPERATION_BUDGET / 2)
    : ADVERTISING_SEARCH_OPERATION_BUDGET;
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
    const remainingBudget = ADVERTISING_SEARCH_OPERATION_BUDGET - spent;
    if (!isSearchExhausted || !canTryBelowPrimary || remainingBudget <= 0) {
      if (error?.diagnostic) {
        error.diagnostic = {
          ...error.diagnostic,
          operations: spent,
          budget: ADVERTISING_SEARCH_OPERATION_BUDGET,
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
          budget: ADVERTISING_SEARCH_OPERATION_BUDGET,
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
    budget: ADVERTISING_SEARCH_OPERATION_BUDGET,
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

export function readAdvertisingBrowseHistoryState(browserState) {
  if (!browserState || typeof browserState !== "object") return null;
  const direct = browserState[ADVERTISING_BROWSE_STATE_KEY];
  if (direct) return normalizeBrowseHistoryState(direct);
  const index = Number(browserState.index);
  const stored = Number.isInteger(index)
    ? browserState.states?.[index]?.data?.[ADVERTISING_BROWSE_STATE_KEY]
    : null;
  return stored ? normalizeBrowseHistoryState(stored) : null;
}

export function createAdvertisingBrowseHistoryController({
  cards = [],
  categories = [],
  pages = [],
  tagRegistry = [],
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
  createSeed = createAdvertisingSeed,
  sessionStorage = safeSessionStorage(),
  now = Date.now,
  getLogicalScroll = () => 0,
  onApply = () => {},
} = {}) {
  const schema = { cards, categories, pages, tagRegistry };
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const nativeHistory = browserHistory || globalThis.history;
  const href = getHref || (() => globalThis.location.href);
  let currentHref = href();
  const initialLocation = parseAdvertisingBrowseLocation(currentHref, schema);
  const barbaHistoryReady = () => {
    const entry = barbaHistory?.current;
    return Boolean(entry && entry.data && typeof entry.data === "object");
  };
  const navigationType = getNavigationType?.();
  const initialHistory = readAdvertisingBrowseHistoryState(nativeHistory?.state)
    || (navigationType === "back_forward" || historyFallback
      ? readAdvertisingBrowseHistoryState(restoredHistoryState)
      : null);
  const matchesLocation = (stored, located) => Boolean(stored)
    && stored.category === located.category
    && stored.photo === located.photo
    && stored.tag === located.tag;
  const matchingInitialHistory = matchesLocation(initialHistory, initialLocation);
  const isReload = navigationType === "reload";
  const localeHandoffSeed = consumeAdvertisingVisitSeedHandoff(sessionStorage, {
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
  const canonicalInitialUrl = serializeAdvertisingBrowseLocation(currentHref, current, categories, pages);
  const suppliedInitialUrl = new URL(currentHref);
  if (`${canonicalInitialUrl.pathname}${canonicalInitialUrl.search}` !== `${suppliedInitialUrl.pathname}${suppliedInitialUrl.search}`) {
    if (barbaHistoryReady() && typeof barbaHistory.store === "function") {
      barbaHistory.store({ [ADVERTISING_BROWSE_STATE_KEY]: current });
    }
    nativeHistory?.replaceState?.({
      ...(nativeHistory.state || {}),
      [ADVERTISING_BROWSE_STATE_KEY]: current,
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
    const stored = readAdvertisingBrowseHistoryState(barbaHistoryReady()
      ? barbaHistory.current.data : nativeHistory?.state);
    if (stored && JSON.stringify(stored) === JSON.stringify(current)) return;
    if (barbaHistoryReady() && typeof barbaHistory.store === "function") {
      barbaHistory.store({ [ADVERTISING_BROWSE_STATE_KEY]: current });
      return;
    }
    if (nativeHistory?.replaceState) {
      nativeHistory.replaceState({
        ...(nativeHistory.state || {}),
        [ADVERTISING_BROWSE_STATE_KEY]: current,
      }, "", href());
    }
  };
  const write = (action, browse, reason) => {
    const normalized = normalizeBrowseHistoryState(browse);
    const url = serializeAdvertisingBrowseLocation(href(), normalized, categories, pages);
    if (barbaHistoryReady() && typeof barbaHistory.add === "function") {
      barbaHistory.add(url.href, "barba", action, {
        [ADVERTISING_BROWSE_STATE_KEY]: normalized,
      });
    } else if (nativeHistory) {
      const method = action === "push" ? "pushState" : "replaceState";
      nativeHistory[method]?.({
        ...(nativeHistory.state || {}),
        [ADVERTISING_BROWSE_STATE_KEY]: normalized,
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
    // Đổi ngôn ngữ tại chỗ dùng replaceState: đồng bộ để popState kế tiếp so với URL /en/ thật.
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
      if (!isAdvertisingQueryOnlyNavigation(previousHref || currentHref, nextHref)) return false;
      const fromHistory = readAdvertisingBrowseHistoryState(event?.state);
      const fromLocation = parseAdvertisingBrowseLocation(nextHref, schema);
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
      const valid = category === "all" || resolveAdvertisingFilter(category, categories, cards) === category;
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
      // Từ một photo, navbar giữ nhóm đã chọn trên masonry nguồn; vào thẳng photo hoặc grid nhóm thì về All.
      const category = (current.photo && current.grid.category) || "all";
      // Related photo nằm ngoài nhóm đó không có trong masonry, nên quay về photo đã mở từ nó.
      const focusId = matchesAdvertisingFilter(cardById.get(viewedId), category) ? viewedId : current.grid.focusId;
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
  : import("./catalog-artifact.mjs").then(({ ADVERTISING_CATALOG_ARTIFACT }) => ADVERTISING_CATALOG_ARTIFACT));

// Mô tả và related của card nằm riêng trong catalog-detail.mjs (artifact chỉ giữ phần grid cần). Artifact đã đủ trường
// (test chèn artifact đầy đủ) thì bỏ qua; ngược lại gắn trường còn thiếu vào card theo id.
let detailPromise;
const loadCardDetail = () => detailPromise ||= import("./catalog-detail.mjs").then(({ default: detail }) => detail);
const attachCardDetail = (cards) => {
  if (cards.every((card) => card.descriptionVi !== undefined)) return Promise.resolve();
  return loadCardDetail().then((detail) => {
    for (const card of cards) if (card.descriptionVi === undefined && detail[card.id]) Object.assign(card, detail[card.id]);
  });
};

let warmWorker;
// Gọi trước mount (route mềm gọi lúc bấm link): tải artifact và khởi động layout Worker song song với veil phủ.
export const preloadAdvertisingCatalog = () => {
  warmWorker ||= startLayoutWorker();
  loadArtifact().catch(() => {});
};

const currentLocale = () => document.documentElement.lang === "en" ? "en" : "vi";

function surfaceAdvertisingLayoutStatus(grid, layout) {
  const diagnosticCode = layout?.diagnostics?.code;
  delete grid.dataset.advertisingLayoutError;
  if (diagnosticCode === "needs-media") {
    grid.dataset.advertisingLayoutStatus = diagnosticCode;
    grid.dataset.advertisingLayoutDiagnostic = JSON.stringify(layout.diagnostics);
    return;
  }
  delete grid.dataset.advertisingLayoutStatus;
  delete grid.dataset.advertisingLayoutDiagnostic;
}

export function compileAdvertisingGeometry({ grid, options, compile = compileAdvertisingProductLayout }) {
  try {
    const layout = compile(options);
    const diagnosticCode = Reflect.get(layout?.diagnostics ?? {}, "code");
    if (diagnosticCode && diagnosticCode !== "needs-media") {
      throw Object.assign(new Error(`Advertising layout diagnostic: ${diagnosticCode}`), {
        code: diagnosticCode,
        diagnostic: layout.diagnostics,
      });
    }
    surfaceAdvertisingLayoutStatus(grid, layout);
    return layout;
  } catch (error) {
    const code = error?.code || error?.diagnostic?.code || "compile-failed";
    grid.dataset.advertisingLayoutError = code;
    grid.dataset.advertisingLayoutStatus = "failed";
    grid.dataset.advertisingLayoutDiagnostic = JSON.stringify(error?.diagnostic || { code, message: error?.message });
    console.error("[advertising-products] layout compilation failed", error);
    throw error;
  }
}

function createPhotoMedia(record, locale, { suggestion = false } = {}) {
  // Giữ vòng đời preload/class LazySizes đã cam kết cho các card ảo hóa.
  // Native loading riêng có ngưỡng viewport khác (design-system/motion.md).
  const image = document.createElement("img");
  image.className = suggestion
    ? "advertising-card-media__image media-hover-zoom"
    : "advertising-tile__foreground advertising-card-media__image media-hover-zoom lazyload";
  image.loading = "lazy";
  image.decoding = "async";
  image.width = record.media.width;
  image.height = record.media.height;
  const srcset = responsiveSrcset(record.media.src, record.media.width);
  if (suggestion) {
    if (srcset) {
      image.sizes = tierAutoSizes(image, "auto, 50vw");
      image.srcset = srcset;
    }
    image.src = record.media.src;
    image.alt = "";
    if (record.media.suggestionPosition) image.style.objectPosition = record.media.suggestionPosition;
  } else {
    if (srcset) {
      image.dataset.sizes = "auto";
      image.dataset.srcset = srcset;
    }
    image.dataset.src = record.media.src;
    image.alt = locale === "en" ? record.media.altEn : record.media.altVi;
  }
  return image;
}

function syncJustViewedMarker(figure, locale, marked) {
  const media = figure.querySelector(".advertising-card-media");
  if (!media) return;
  let marker = media.querySelector("[data-advertising-just-viewed]");
  if (!marked) {
    marker?.remove();
    return;
  }
  if (!marker) {
    marker = document.createElement("span");
    marker.className = "advertising-card-media__just-viewed";
    marker.dataset.advertisingJustViewed = "";
    media.append(marker);
  }
  marker.textContent = locale === "en" ? "Just viewed" : "Vừa xem";
}

function createPhotoCard(record, locale, onMediaLoaded, related, initialMediaId = null, onMediaChange = () => {},
  onPendingChange = () => {}) {
  const figure = document.createElement("figure");
  figure.className = "project-tile advertising-tile";
  figure.dataset[related ? "advertisingRelatedCard" : "advertisingCard"] = record.id;
  figure.dataset.advertisingCategory = record.category;
  const link = document.createElement("a");
  link.className = "advertising-card-interactive media-hover-zoom-trigger";
  link.href = advertisingCardPath(locale, record.id);
  const media = document.createElement("div");
  media.className = "project-tile__media advertising-tile__media--natural advertising-card-media";
  const image = createPhotoMedia(record, locale);
  media.append(image);
  link.append(media);
  figure.append(link);
  const items = record.mediaItems;
  const hasCarousel = Array.isArray(items) && items.length > 1;
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
    let pointerStart = null;
    let suppressClickUntil = 0;
    const el = (tag, className, dataKey, attrs = {}) => {
      const node = document.createElement(tag);
      node.className = className;
      if (dataKey) node.dataset[dataKey] = "";
      Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, value));
      if (tag === "button") node.type = "button";
      return node;
    };
    media.classList.add("advertising-card-media--carousel");
    image.classList.remove("media-hover-zoom");
    image.hidden = !useLegacyCover;
    if (useLegacyCover) {
      image.dataset.advertisingMediaItem = items[coverIndex].id;
      figure.dataset.advertisingActiveMediaId = items[coverIndex].id;
    }

    // Frame skeleton là phần nhìn thấy; node này chỉ giữ trạng thái loading cho công nghệ hỗ trợ.
    const loading = el("span", "advertising-card-media__loading sr-only", "advertisingMediaLoading",
      { role: "status", "aria-label": english ? "Loading media" : "Đang tải media" });
    const duration = el("span", "advertising-card-media__duration", "advertisingMediaDuration");
    const playback = el("button", "advertising-card-media__playback", "advertisingMediaPlayback");
    loading.hidden = duration.hidden = playback.hidden = true;
    media.append(loading, duration);
    figure.append(playback);

    const indicator = el("div", "advertising-card-media__indicator", "advertisingMediaIndicator",
      { role: "group", "aria-label": english ? "Card media" : "Media của thẻ" });
    const numericIndicator = items.length >= 7;
    if (hasCarousel) playback.classList.add("advertising-card-media__playback--carousel");
    const buttons = hasCarousel && !numericIndicator ? items.map((item, index) => {
      const button = el("button", "advertising-card-media__dot", "", { "aria-label": english
        ? `Show media ${index + 1} of ${items.length}`
        : `Xem media ${index + 1} trên ${items.length}` });
      button.dataset.advertisingMediaSelect = item.id;
      indicator.append(button);
      return button;
    }) : [];
    let previousButton;
    let nextButton;
    let countStatus;
    if (numericIndicator) {
      indicator.classList.add("advertising-card-media__indicator--numeric");
      previousButton = el("button", "advertising-card-media__step advertising-card-media__step--previous",
        "advertisingMediaPrev", { "aria-label": english ? "Previous media" : "Media trước" });
      countStatus = el("span", "advertising-card-media__count", "advertisingMediaCount",
        { role: "status", "aria-live": "polite", "aria-atomic": "true" });
      nextButton = el("button", "advertising-card-media__step advertising-card-media__step--next",
        "advertisingMediaNext", { "aria-label": english ? "Next media" : "Media tiếp" });
      indicator.append(previousButton, countStatus, nextButton);
    }
    if (hasCarousel) figure.append(indicator);

    const updateIndicator = (index) => {
      buttons.forEach((button, buttonIndex) => button.setAttribute("aria-current", String(buttonIndex === index)));
      if (!numericIndicator) return;
      countStatus.textContent = `${index + 1}/${items.length}`;
      countStatus.setAttribute("aria-label", english
        ? `Media ${index + 1} of ${items.length}`
        : `Media ${index + 1} trên ${items.length}`);
      previousButton.disabled = index === 0;
      nextButton.disabled = index === items.length - 1;
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
      loading.hidden = ready || failedImage || loadedVideoPoster;
      onPendingChange(figure);
      if (ready) {
        layer.classList.add("is-advertising-media-ready");
        if (layer instanceof HTMLImageElement) {
          lastReadyImageIndex = activeIndex;
          if (items[coverIndex].kind === "video" && figure.dataset.advertisingMediaLoaded !== "true") {
            figure.dataset.advertisingMediaLoaded = "true";
            onMediaLoaded(figure);
          }
        }
      }
    };
    image.addEventListener("load", updateLoading);
    image.addEventListener("lazyloaded", updateLoading);
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
      let layer = layers.get(item.id);
      if (!layer) {
        layer = document.createElement(item.kind === "video" ? "video" : "img");
        layer.className = "advertising-tile__foreground advertising-card-media__image";
        layer.dataset.advertisingMediaItem = item.id;
        layer.width = item.width;
        layer.height = item.height;
        if (item.kind === "video") {
          layer.muted = true;
          layer.defaultMuted = true;
          layer.playsInline = true;
          layer.preload = "metadata";
          layer.poster = item.posterSrc;
          layer.src = item.src;
          layer.setAttribute("aria-label", english ? item.altEn : item.altVi);
          layer.addEventListener("loadeddata", updateLoading);
          layer.addEventListener("pause", () => { playback.textContent = english ? "Play" : "Phát"; });
          layer.addEventListener("play", () => { playback.textContent = english ? "Pause" : "Tạm dừng"; });
        } else {
          layer.loading = "lazy";
          layer.decoding = "async";
          layer.alt = english ? item.altEn : item.altVi;
          const srcset = responsiveSrcset(item.src, item.width);
          if (srcset) {
            layer.sizes = tierAutoSizes(layer, "auto, 50vw");
            layer.srcset = srcset;
          }
          layer.src = item.src;
          layer.addEventListener("load", updateLoading);
        }
        layer.addEventListener("error", () => {
          if (item.kind === "image") {
            failedImages.add(item.id);
            const fallback = imageFallbackIndex();
            if (activeIndex === index && fallback >= 0 && fallback !== index) {
              setActive(fallback);
              return;
            }
          }
          if (item.kind === "video" && !posterStatus.has(item.id)) {
            posterStatus.set(item.id, "loading");
            const probe = new Image();
            probe.addEventListener("load", () => {
              posterStatus.set(item.id, "loaded");
              if (activeIndex === index) updateLoading();
            }, { once: true });
            probe.addEventListener("error", () => {
              posterStatus.set(item.id, "failed");
              if (activeIndex !== index) return;
              const fallback = imageFallbackIndex();
              if (fallback >= 0 && fallback !== index) setActive(fallback);
              else updateLoading();
            }, { once: true });
            probe.src = item.posterSrc;
          }
          if (activeIndex !== index) return;
          if (item.kind === "video") playback.hidden = true;
          updateLoading();
        });
        layers.set(item.id, layer);
        media.prepend(layer);
      }
      layer.hidden = false;
      figure.dataset.advertisingActiveMediaId = item.id;
      updateIndicator(index);
      duration.hidden = item.kind !== "video";
      playback.hidden = item.kind !== "video" || Boolean(layer.error);
      if (item.kind === "video") {
        const seconds = Math.ceil(item.durationSeconds);
        duration.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
        playback.textContent = english ? "Play" : "Phát";
      }
      updateLoading();
    };
    figure.advertisingPendingMediaId = () => loading.hidden ? null : items[activeIndex].id;
    figure.advertisingSetMediaId = (id) => {
      const index = items.findIndex((item) => item.id === id);
      if (index >= 0) setActive(index);
    };
    const selectMedia = (index) => {
      setActive(index);
      onMediaChange(figure.dataset.advertisingActiveMediaId);
    };
    buttons.forEach((button, index) => button.addEventListener("click", () => selectMedia(index)));
    if (numericIndicator) {
      previousButton.addEventListener("click", () => selectMedia(activeIndex - 1));
      nextButton.addEventListener("click", () => selectMedia(activeIndex + 1));
    }
    playback.addEventListener("click", () => {
      const video = layers.get(items[activeIndex].id);
      if (!(video instanceof HTMLVideoElement)) return;
      if (video.paused) void video.play().catch(() => {});
      else video.pause();
    });
    const swipe = (dx, dy) => {
      if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
      selectMedia(activeIndex + (dx < 0 ? 1 : -1));
      suppressClickUntil = performance.now() + 400;
    };
    if (hasCarousel) {
      // Pointer events bao gồm cả touch; touch-action: pan-y để swipe ngang cho handler này.
      link.addEventListener("pointerdown", (event) => {
        suppressClickUntil = 0;
        pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
      });
      link.addEventListener("pointerup", (event) => {
        if (!pointerStart || pointerStart.id !== event.pointerId) return;
        const dx = event.clientX - pointerStart.x;
        const dy = event.clientY - pointerStart.y;
        pointerStart = null;
        swipe(dx, dy);
      });
      link.addEventListener("pointercancel", () => { pointerStart = null; });
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
    image.addEventListener("error", () => {
      failed = true;
      onPendingChange(figure);
    });
    listenForMediaLoad(figure, image, onMediaLoaded);
  }
  syncJustViewedMarker(figure, locale, lastClosedPhotoId === record.id
    && (related || !document.body.classList.contains("is-advertising-photo")));
  return figure;
}

function listenForMediaLoad(figure, media, onMediaLoaded) {
  const markLoaded = () => {
    if (figure.dataset.advertisingMediaLoaded === "true") return;
    figure.dataset.advertisingMediaLoaded = "true";
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

// Ảnh LazySizes rộng bằng card: ghi sizes từ solver để lúc unveil không đọc offsetWidth từng ảnh (forced layout).
// Ảnh đã tải chỉ nâng sizes, không hạ.
function sizeLazyImage(node, placement) {
  const image = node.querySelector("img[data-sizes]");
  if (!image) return;
  // Mạng chậm thì ảnh chưa tải lấy nửa bề rộng (image-adaptive R3).
  const sizes = tierSizes(image, Math.ceil(placement.pixelWidth));
  image.dataset.sizes = sizes;
  if (image.hasAttribute("sizes") && !(Number.parseFloat(image.sizes) >= Number.parseFloat(sizes))) image.sizes = sizes;
}

function sizeNode(node, placement, setSize) {
  node.style.width = `${placement.pixelWidth}px`;
  sizeLazyImage(node, placement);
  node.style.height = `${placement.pixelHeight}px`;
  node.style.setProperty("--advertising-media-height", `${placement.mediaPixelHeight}px`);
  node.style.setProperty("--advertising-caption-height", `${placement.captionPixelHeight}px`);
  node.dataset.advertisingSpan = String(placement.width);
  node.setAttribute("role", "listitem");
  node.setAttribute("aria-posinset", String(placement.index + 1));
  node.setAttribute("aria-setsize", String(setSize));
}

function createMasonry(grid, positions, getHeight, { itemSelector = ".advertising-tile", getId = (node) => node.dataset.advertisingCard } = {}) {
  const masonry = new window.Masonry(grid, {
    itemSelector,
    initLayout: false,
    resize: false,
    transitionDuration: "0.4s",
    stagger: 0,
  });
  masonry._getItemLayoutPosition = (item) => positions.get(getId(item.element)) || { x: 0, y: 0 };
  masonry._getContainerSize = () => ({ height: getHeight() });
  // Outlayer đọc vị trí đầu bằng getComputedStyle rồi ghi transition cho từng card, nên mỗi card ép một lượt style
  // (rAF Masonry 46-66ms trên A04s). Runtime đã ghi left/top inline bằng px; motion chỉ chạy trên transform nên
  // inline trùng computed. Card chưa có vị trí inline vẫn đọc computed như cũ.
  const itemize = masonry._itemize;
  masonry._itemize = function (elements) {
    const items = itemize.call(this, elements);
    for (const item of items) {
      const readComputed = item.getPosition;
      item.getPosition = function () {
        const { left, top } = this.element.style;
        if (!left.endsWith("px") || !top.endsWith("px")) return readComputed.call(this);
        this.position.x = parseFloat(left) - this.layout.size.paddingLeft;
        this.position.y = parseFloat(top) - this.layout.size.paddingTop;
      };
    }
    return items;
  };
  return masonry;
}

export async function mountAdvertisingCatalog(container = document.querySelector('[data-barba-namespace="advertising-products"]'), { signal, scroll, softNavigation = false } = {}) {
  if (!container || activeInstance?.container === container) return activeInstance?.cleanup || (() => {});
  activeInstance?.cleanup();
  const startupHistory = window.__ttAdvertisingBrowseStartupHistory;
  delete window.__ttAdvertisingBrowseStartupHistory;

  const grid = container.querySelector("[data-project-grid]");
  const filters = container.querySelector(".project-filters");
  if (!grid || !filters) return () => {};
  const ctaSkeleton = grid.querySelector("[data-advertising-cta-skeleton]");
  const gridCta = container.querySelector("[data-advertising-grid-cta]");
  const gridCtaHeading = gridCta?.querySelector("h2");
  const gridCtaCopy = gridCta?.querySelector(".detail-cta__copy");
  const siteFooter = container.querySelector("footer.site-footer");
  const gridSection = grid.closest(".project-index");
  const gridSectionStyleTarget = gridSection instanceof HTMLElement ? gridSection : null;
  const arcGlass = gridSectionStyleTarget?.appendChild(Object.assign(createGlassSurface("arc"), { hidden: true }));
  const photoView = container.querySelector("[data-advertising-photo-view]");
  // Lần đầu hiện detail, Blink parse lazy các khai báo CSS khớp photo view ngay trong task chạm card. Đọc computed
  // style lúc rảnh để parse trước; style lần đầu giảm khoảng 3 lần (decision phone-frame-budget).
  if (photoView?.hidden) globalThis.requestIdleCallback?.(() => {
    if (photoView.hidden) for (const node of [photoView, ...photoView.querySelectorAll("*")]) getComputedStyle(node).color;
  });
  const photoCanvas = photoView?.querySelector("[data-advertising-photo-canvas]");
  const photoPrimary = photoView?.querySelector("[data-advertising-photo-primary]");
  const photoImage = photoView?.querySelector("[data-advertising-photo-image]");
  const photoVideo = photoView?.querySelector("[data-advertising-photo-video]");
  const photoAudioToggle = photoView?.querySelector("[data-advertising-photo-audio-toggle]");
  let photoMediaThumbs = null;
  const photoBackground = photoView?.querySelector("[data-advertising-photo-background]");
  // Kính đều phủ lên backdrop cover; CSS chỉ hiện nó khi photo contain để lại khoảng trống xung quanh.
  // Không có bước blur: ảnh backdrop tự mang blur (detail.css), nên không thể lộ đường nối giữa các tile.
  const photoGlass = createGlassSurface("even", 0);
  photoBackground?.after(photoGlass);
  const photoCategory = photoView?.querySelector("[data-advertising-photo-category]");
  const photoDescription = photoView?.querySelector("[data-advertising-photo-description]");
  const photoDescriptionPager = photoView?.querySelector("[data-advertising-photo-description-pager]");
  const photoDescriptionPage = photoView?.querySelector("[data-advertising-photo-description-page]");
  const photoDescriptionIndicator = photoView?.querySelector("[data-advertising-photo-description-indicator]");
  const photoInfo = photoView?.querySelector("[data-advertising-photo-info]");
  const relatedGrid = photoView?.querySelector("[data-advertising-photo-related-grid]");
  const suggestionNode = photoView?.querySelector("[data-advertising-photo-suggestion]");
  const suggestionTitle = suggestionNode?.querySelector("[data-advertising-photo-related-title]");
  const photoExpand = photoView?.querySelector("[data-advertising-photo-expand]");
  const photoDialog = photoView?.querySelector("[data-advertising-photo-dialog]");
  const photoExpandedImage = photoView?.querySelector("[data-advertising-photo-expanded-image]");
  const photoViewport = photoView?.querySelector("[data-advertising-photo-viewport]");
  const photoClose = photoView?.querySelector("[data-advertising-photo-close]");
  const photoZoomIn = photoView?.querySelector("[data-advertising-photo-zoom-in]");
  const photoZoomOut = photoView?.querySelector("[data-advertising-photo-zoom-out]");
  const photoZoomReset = photoView?.querySelector("[data-advertising-photo-zoom-reset]");
  const photoZoomStatus = photoView?.querySelector("[data-advertising-photo-zoom-status]");

  // Khởi động Worker song song với lúc tải artifact; lần compile đầu (grid hoặc related) dùng nó, các lần sau mở Worker mới.
  let idleWorker = warmWorker || startLayoutWorker();
  warmWorker = undefined;
  const takeWorker = () => {
    const worker = idleWorker || startLayoutWorker();
    idleWorker = undefined;
    return worker;
  };
  const artifact = await loadArtifact();
  if (!artifact || typeof artifact !== "object") {
    const error = new Error("Advertising artifact must be an object");
    console.error("[advertising-products] artifact validation failed", error);
    throw error;
  }
  if (artifact.layoutAlgorithmVersion !== ADVERTISING_LAYOUT_ALGORITHM_VERSION) {
    const error = new Error(`Unsupported advertising layout algorithm: ${artifact.layoutAlgorithmVersion}`);
    console.error("[advertising-products] artifact validation failed", error);
    throw error;
  }
  let settings;
  try {
    settings = normalizeAdvertisingProductSettings(artifact.settings);
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
    validateAdvertisingCards(cards, { categoryOrder, requireNonEmpty: true });
  } catch (error) {
    console.error("[advertising-products] artifact validation failed", error);
    throw error;
  }
  // Giữ nguyên tham chiếu artifact đã generate làm cache identity; không clone, chỉ gắn thêm trường detail vào card.
  const artifactCacheIdentity = artifact;
  if (signal?.aborted) return () => {};
  if (typeof window.Masonry !== "function") {
    const error = new Error("Advertising catalog requires Masonry 4.2.2 before mount");
    console.error("[advertising-products] dependency readiness failed", error);
    throw error;
  }
  const controller = new AbortController();
  // Detail (mô tả, related) tải ngay khi ảnh 8 card đầu xong (tối đa 6 s) để không tranh băng thông với chúng; showPhoto chờ nếu chưa xong.
  let detailLoaded = false;
  let detailReady;
  const ensureDetail = () => detailReady ||= attachCardDetail(cards).catch(() => {}).then(() => { detailLoaded = true; });
  const prefetchDetail = (tries = 0) => {
    if (controller.signal.aborted) return;
    const images = [...document.querySelectorAll("[data-advertising-card] img")].slice(0, 8);
    if (tries >= 24 || (images.length === 8 && images.every((image) => image.complete))) ensureDetail();
    else setTimeout(prefetchDetail, 250, tries + 1);
  };
  prefetchDetail();
  // Giữ sẵn số đo CSS khi script shell không khởi động được.
  if (!document.querySelector(".site-viewport-metrics")) {
    const probe = document.createElement("div");
    probe.className = "site-viewport-metrics";
    probe.setAttribute("aria-hidden", "true");
    document.body.append(probe);
  }
  const getLayoutViewportHeight = () => scroll?.getViewportMetrics?.().layoutHeight
    || document.querySelector(".site-viewport-metrics")?.getBoundingClientRect().height
    || innerHeight;
  // Cùng công thức với getViewportMetrics().visible nhưng không đọc probe. Đọc visualViewport vẫn ép style recalc,
  // nên giữ số đo tới khi viewport đổi (decision phone-frame-budget).
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
  document.body.classList.add("is-advertising-browse");
  let locale = currentLocale();
  const reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = reducedMotionQuery.matches;
  const geometries = new Map();
  let geometryPending = false;
  const rendered = new Map();
  const gridMediaById = new Map();
  const relatedMediaById = new Map();
  const positions = new Map();
  const retainedPhotoIds = new Set();
  const relatedRendered = new Map();
  const relatedPositions = new Map();
  let relatedMasonry;
  let relatedPixelHeight = 0;
  let relatedMotionFrame = 0;
  let relatedMotionTimer = 0;
  let relatedLayout;
  let activePhotoId = null;
  let activePrimaryMediaId = null;
  let detailRenderGeneration = 0;
  let relatedLayoutKey = "";
  let relatedCompile = compileAdvertisingProductLayout;
  // Khi mở photo (showPhoto), mỗi pha một task: "primary" dàn primary không có related; "warm"
  // chạy solver trên vài card để lần chạy đầy đủ không phải trả giá cho code lạnh; "related" chạy
  // solver đầy đủ, giữ geometry của primary và để việc mount card cho task kế tiếp.
  let directEntryPhase = "";
  let relatedMeasuredGeometry = null;
  let suggestionSlots = [];
  let suggestionSlotHeroId = "";
  let stopSuggestionSlides;
  let descriptionSource = "";
  let descriptionPages = [""];
  let descriptionPageIndex = 0;
  let descriptionPointer = null;
  const photoViewer = createAdvertisingPhotoViewer({
    getVisibleViewport,
    closeButton: photoClose,
    dialog: photoDialog,
    expandButton: photoExpand,
    expandedImage: photoExpandedImage,
    heroImage: photoImage,
    resetButton: photoZoomReset,
    scroll,
    signal: controller.signal,
    viewport: photoViewport,
    zoomInButton: photoZoomIn,
    zoomOutButton: photoZoomOut,
    zoomStatus: photoZoomStatus,
  });
  // Media key đã tải một lần: card remount hoán chúng vào mà không cần Kính khi bản cache của nó đến.
  const loadedMediaKeys = new Set();
  const visibleMediaCards = new Set();
  const mediaKey = (node) => node.dataset.advertisingRelatedCard
    ? `related:${node.dataset.advertisingRelatedCard}` : `grid:${node.dataset.advertisingCard}`;
  const mediaLayers = (node) => [...node.querySelectorAll(".advertising-tile__foreground")];
  // Hiện ngay ở opacity cuối, không qua transition opacity của CSS (R3): đọc style để chốt `none` trước khi trả lại.
  const showMedia = (node) => mediaLayers(node).forEach((media) => {
    media.style.setProperty("transition", "none", "important");
    media.classList.add("is-advertising-media-ready");
    getComputedStyle(media).opacity;
    media.style.removeProperty("transition");
  });
  const handleMediaLoaded = (node) => {
    const id = mediaKey(node);
    const seen = loadedMediaKeys.has(id);
    loadedMediaKeys.add(id);
    if (!cardSkeletons.has(node) || seen) {
      dropCardSkeleton(node);
      showMedia(node);
    } else revealCard(node);
  };
  // Reduced motion vẫn observe: skeleton loading chỉ hiện trên card đang trong view.
  const mediaObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const node = entry.target;
      const id = mediaKey(node);
      if (!id) return;
      // Card gắn lại có media đã tải: unveil ngay từ entry đầu, không chờ nhịp throttle của LazySizes, để bản cache
      // sẵn trước khi card vào viewport (loading-glass R3).
      if (loadedMediaKeys.has(id)) {
        mediaLayers(node).forEach((media) => media.classList.contains("lazyload") && window.lazySizes?.loader?.unveil(media));
      }
      if (entry.intersectionRatio === 0) {
        // Card bị dời trong DOM (restoreCanonicalDomOrder) báo một entry rỗng không có rootBounds rồi entry thật
        // ngay sau; bỏ skeleton ở đây làm nó chớp lại từ opacity 0.
        if (!entry.rootBounds && node.isConnected) return;
        visibleMediaCards.delete(id);
        // Màu của skeleton gắn với media id, nên bỏ nó ở đây vẫn giữ màu cho entry kế tiếp.
        dropCardSkeleton(node);
        return;
      }
      if (!entry.isIntersecting) return;
      visibleMediaCards.add(id);
      attachCardSkeleton(node);
    });
  }, { threshold: 0 });
  const observeMediaCard = (node) => mediaObserver.observe(node);
  const releaseMediaCard = (node) => {
    const id = mediaKey(node);
    node.querySelectorAll("video").forEach((video) => video.pause());
    mediaObserver.unobserve(node);
    visibleMediaCards.delete(id);
    dropCardSkeleton(node);
  };
  // Filter sản phẩm (id "<cụm>/<slug>") vẫn đánh dấu cụm của nó trên rail.
  const isRailCurrent = (slug) => filter === slug || filter.startsWith(`${slug}/`);
  // Rail hai tầng (taxonomy R3): cụm đang chọn hiện hàng chip; mục sản phẩm đúng filter có aria-current.
  const chipGroups = [...container.querySelectorAll("[data-advertising-chips]")];
  // Phần tử hiện sau khi bấm rail dùng lại nhịp entrance Advertising ([Motion](design-system/motion.md)); reduced motion vào thẳng trạng thái cuối.
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
    filters.querySelectorAll("[data-advertising-filter]").forEach((item) => {
      item.setAttribute("aria-current", String(isRailCurrent(item.dataset.advertisingFilter)));
    });
    container.querySelectorAll("[data-advertising-product]").forEach((item) => {
      item.setAttribute("aria-current", String(item.dataset.advertisingProduct === filter));
    });
    chipGroups.forEach((group) => {
      const wasHidden = group.hidden;
      group.hidden = !isRailCurrent(group.dataset.advertisingChips);
      // Chip hiện cùng nhịp filter rail lúc tải trang (y 20, 1s expo.out, stagger 0.15s), sau kicker 0.3s; đổi sản phẩm trong cụm không chạy lại.
      // Hàng dài thì ép tổng độ trễ so le tối đa 0.6s để chip cuối không hiện muộn.
      if (animate && wasHidden && !group.hidden) {
        const chips = [...group.querySelectorAll(".rail-chip")];
        enterFrom(chips, "translate3d(0, 20px, 0)", { duration: 1000, easing: "cubic-bezier(0.16, 1, 0.3, 1)", delay: 300, stagger: Math.min(150, 600 / Math.max(1, chips.length - 1)) });
      }
      // Hàng chip cuộn ngang trên điện thoại: đưa chip đang chọn vào khung, chỉ trục ngang để không kéo trang.
      const current = group.hidden ? null : group.querySelector('[aria-current="true"]');
      if (current) group.scrollLeft += current.getBoundingClientRect().left - group.getBoundingClientRect().left - parseFloat(getComputedStyle(group).paddingLeft);
    });
  };
  let filter = resolveAdvertisingFilter(new URLSearchParams(location.search).get("category"), categories, cards)
    || advertisingPathFilter(location.pathname, pages) || "all";
  let currentVisualY = window.scrollY;
  let usesVisualScroll = false;
  let geometry;
  let masonry;
  let scrollFrame = 0;
  let resizeFrame = 0;
  let lastResizeAt = -Infinity;
  let layoutFrame = 0;
  let motionUntil = 0;
  let lastScrollAt = 0;
  let scrollActive = false;
  // Fling bận làm khoảng cách giữa hai scroll event vượt 120ms, nên đo thời gian một mình thấy "đã dừng" giữa fling;
  // có scrollend thì chờ nó, rồi vẫn giữ 120ms như cũ. Scroll do layout hoặc code (mở detail nhảy về y=0)
  // không bắn scrollend, nên quá PHONE_SCROLL_SETTLE_MS không có scroll event thì coi là đã dừng.
  const phoneScrollWait = () => scrollActive && performance.now() - lastScrollAt < PHONE_SCROLL_SETTLE_MS
    ? PHONE_REVEAL_SCROLL_IDLE_MS : lastScrollAt + PHONE_REVEAL_SCROLL_IDLE_MS - performance.now();
  let motionTimer = 0;
  let pendingScroll = false;
  let lastMeasuredGridWidth = 0;
  let lastLayoutViewportWidth = 0;
  let lastGeometrySignature = "";
  let gridPixelHeight = 0;
  let announcedPageHeight = -1;
  let ctaGeometryHash = "";
  let lastCtaViewportHeight = 0;
  let ctaCopyKey = "";
  let ctaCopyMetrics = { baseline: 0, below: 0 };
  // Một inline box kích thước 0 ở cuối heading nằm trên baseline của dòng cuối.
  const ctaBaselineProbe = document.createElement("span");
  ctaBaselineProbe.style.cssText = "display: inline-block; width: 0; height: 0;";
  const measureCtaCopy = () => {
    const last = [...gridCtaHeading.querySelectorAll("*")]
      .filter((node) => !node.children.length && node.textContent.trim()).at(-1);
    (last || gridCtaHeading).append(ctaBaselineProbe);
    const line = last?.closest(".motion-line");
    // Đo trạng thái đã reveal: bỏ offset reveal hiện tại của dòng, rồi đặt nó lên 0.1em như detail.js.
    const reveal = line ? new DOMMatrixReadOnly(getComputedStyle(line).transform).m42
      + 0.1 * Number.parseFloat(getComputedStyle(gridCtaHeading).fontSize) : 0;
    const copyRect = gridCtaCopy.getBoundingClientRect();
    const baseline = ctaBaselineProbe.getBoundingClientRect().top - copyRect.top - reveal;
    ctaBaselineProbe.remove();
    return { baseline, below: copyRect.height - baseline };
  };
  // Thu heading vừa đủ để khoảng trống dưới baseline cuối đủ dùng, không nhỏ hơn 1.3rem.
  const fitGridCtaHeading = (room) => {
    gridCtaHeading.style.removeProperty("font-size");
    const css = measureCtaCopy();
    if (css.below <= room) return css;
    const cssSize = Number.parseFloat(getComputedStyle(gridCtaHeading).fontSize);
    const minSize = 1.3 * Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    gridCtaHeading.style.fontSize = `${minSize}px`;
    const floor = measureCtaCopy();
    if (floor.below >= room || cssSize <= minSize) return floor;
    // Khoảng trống dưới baseline tăng tuyến tính theo font size.
    gridCtaHeading.style.fontSize = `${minSize + (cssSize - minSize) * (room - floor.below) / (css.below - floor.below)}px`;
    return measureCtaCopy();
  };
  // Phần copy chậm hơn trang 10% và về offset 0 tại giới hạn cuộn.
  const syncCtaParallax = () => {
    if (!gridCtaCopy || !siteFooter) return;
    // CTA chỉ cao bằng copy (text 200%, landscape) không còn chỗ phía trên, và clip của nó sẽ cắt heading.
    const offset = reduced || activePhotoId ? 0
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
      [...filters.querySelectorAll("[data-advertising-filter]")]
        .filter((control) => control instanceof HTMLAnchorElement)
        .map((control) => [control.dataset.advertisingFilter, control]),
    );
    entries.forEach((entry) => {
      let control = existing.get(entry.slug);
      if (!control) {
        control = document.createElement("a");
        control.className = "project-filter";
        control.dataset.advertisingFilter = entry.slug;
        filters.append(control);
      }
      control.href = `/${locale}/advertising-products/${entry.slug === "all" ? "" : `${locale === "en" ? entry.slugEn : entry.slugVi}/`}`;
      control.dataset.en = entry.titleEn;
      control.textContent = locale === "en" ? entry.titleEn : entry.titleVi;
    });
    syncRail();
    for (const cardMap of [rendered, relatedRendered]) {
      cardMap.forEach((node, id) => {
        const record = cards.find((card) => card.id === id);
        if (!record) return;
        const english = locale === "en";
        const link = node.querySelector("a");
        const image = node.querySelector(".advertising-tile__foreground");
        const caption = node.querySelector("figcaption");
        if (link) link.href = advertisingCardPath(locale, record.id);
        if (image) image.alt = english ? record.media.altEn : record.media.altVi;
        if (caption) caption.textContent = english ? record.titleEn : record.titleVi;
        syncJustViewedMarker(node, locale, lastClosedPhotoId === id
          && (cardMap === relatedRendered ? Boolean(activePhotoId) : !activePhotoId));
      });
    }
  };
  updateLocalizedContent();
  ctaSkeleton?.replaceChildren();
  grid.replaceChildren(...(ctaSkeleton ? [ctaSkeleton] : []));
  grid.classList.add("advertising-grid");
  grid.setAttribute("role", "list");
  relatedGrid?.setAttribute("role", "list");

  const geometryRequest = (targetFilter) => {
    const categoryPool = cards.filter((card) => matchesAdvertisingFilter(card, targetFilter));
    // Ngẫu nhiên trong từng hạng, hạng 1 (sản phẩm chính) đứng trước (taxonomy R1).
    const presentationOrder = shuffleWithSeed(
      categoryPool,
      browseHistory.current.seed,
      `grid:${targetFilter}`,
    ).sort((left, right) => advertisingFilterRank(left, targetFilter) - advertisingFilterRank(right, targetFilter)).map(({ id }) => id);
    const compileOptions = {
      layoutViewportWidth: document.documentElement.clientWidth,
      filter: targetFilter,
      cards,
      categoryOrder,
      datasetVersion: artifact.datasetVersion,
      settings,
      presentationOrder,
      organicOrder: true,
    };
    const key = [
      artifactCacheIdentity.datasetVersion,
      artifactCacheIdentity.layoutAlgorithmVersion,
      CAPTION_METRICS_VERSION,
      targetFilter,
      compileOptions.layoutViewportWidth,
      presentationOrder.join(","),
    ].join(":");
    return { key, compileOptions };
  };
  const cacheGeometry = (key, layout) => {
    if (geometries.size >= GEOMETRY_CACHE_LIMIT) geometries.delete(geometries.keys().next().value);
    geometries.set(key, layout);
  };
  // Compile lần đầu chạy trong Worker để không thành long task khi chuyển trang trên phone Android (decision phone-frame-budget);
  // Worker lỗi thì geometryFor compile đồng bộ như cũ.
  const prewarmGeometry = async (targetFilter) => {
    const { key, compileOptions } = geometryRequest(targetFilter);
    if (geometries.has(key)) return;
    const layout = (await compileInWorker(compileOptions, takeWorker()))?.layout;
    const code = Reflect.get(layout?.diagnostics ?? {}, "code");
    if (layout && (!code || code === "needs-media") && !geometries.has(key)) cacheGeometry(key, layout);
  };
  const geometryFor = (targetFilter) => {
    const { key, compileOptions } = geometryRequest(targetFilter);
    let layout = geometries.get(key);
    if (layout) {
      geometries.delete(key);
      geometries.set(key, layout);
      surfaceAdvertisingLayoutStatus(grid, layout);
      return layout;
    }
    layout = compileAdvertisingGeometry({ grid, options: compileOptions });
    cacheGeometry(key, layout);
    return layout;
  };

  const virtualWindow = () => {
    const gridTop = grid.getBoundingClientRect().top + currentVisualY;
    const visible = getVisibleViewport();
    const windowed = getVirtualWindow(geometry, {
      scrollTop: Math.max(0, currentVisualY + visible.top - gridTop),
      viewportHeight: visible.height,
      overscan: visible.height,
    });
    const visiblePlacements = [...windowed.items];
    const keep = new Set(visiblePlacements.map((placement) => placement.card.id));
    const focusedNode = [...rendered.values()].find((node) => node === document.activeElement || node.contains(document.activeElement));
    if (focusedNode && !keep.has(focusedNode.dataset.advertisingCard)) {
      const focusedPlacement = geometry.placements.find((placement) => placement.card.id === focusedNode.dataset.advertisingCard);
      if (focusedPlacement) visiblePlacements.push(focusedPlacement);
      keep.add(focusedNode.dataset.advertisingCard);
    }
    for (const id of retainedPhotoIds) {
      if (keep.has(id)) continue;
      const retainedPlacement = geometry.placements.find((placement) => placement.card.id === id);
      if (!retainedPlacement) continue;
      visiblePlacements.push(retainedPlacement);
      keep.add(id);
    }
    return { keep, visiblePlacements };
  };
  const sameMembers = (left, right) => left.size === right.size && [...left].every((item) => right.has(item));
  const coordinateChanged = (nextPositions) => [...rendered.entries()].some(([id, node]) => {
    if (node.hidden) return false;
    const previous = positions.get(id);
    const next = nextPositions.get(id);
    return previous && next && (previous.x !== next.x || previous.y !== next.y);
  });
  const restoreCanonicalDomOrder = () => {
    if (!geometry) return;
    const placementIndex = new Map(geometry.placements.map((placement) => [placement.card.id, placement.index]));
    const activeElement = grid.contains(document.activeElement) ? document.activeElement : null;
    const orderedNodes = [...rendered.entries()]
      .sort(([leftId], [rightId]) => (placementIndex.get(leftId) ?? Number.MAX_SAFE_INTEGER) - (placementIndex.get(rightId) ?? Number.MAX_SAFE_INTEGER) || leftId.localeCompare(rightId))
      .map(([, node]) => node);
    let cursor = grid.firstElementChild;
    for (const node of orderedNodes) {
      if (node === cursor) {
        cursor = cursor.nextElementSibling;
        continue;
      }
      // moveBefore giữ transition fade của skeleton; insertBefore tháo node nên opacity nhảy thẳng tới đích.
      (grid.isConnected && grid.moveBefore ? grid.moveBefore : grid.insertBefore).call(grid, node, cursor);
    }
    if (activeElement?.isConnected && document.activeElement !== activeElement) activeElement.focus({ preventScroll: true });
  };
  const pruneMotionCohort = () => {
    if (!geometry) return;
    const { keep } = virtualWindow();
    for (const [id, node] of rendered) {
      if (keep.has(id)) {
        node.hidden = false;
        continue;
      }
      releaseMediaCard(node);
      node.remove();
      rendered.delete(id);
    }
    restoreCanonicalDomOrder();
  };
  // Card đổi cỡ cùng nhịp với vị trí: con của card co giãn từ cỡ cũ quanh góc trên trái của card, nên card lớn
  // lên không phủ item kế bên giữa lúc trượt (owner 10/10). Masonry giữ `transform`, nên scale nằm ở con.
  const isSizeMorph = (animation) => Boolean(animation.effect?.getKeyframes?.()[0]?.scale);
  const morphSize = (node, from) => {
    const sx = from.w / node.offsetWidth;
    const sy = from.h / node.offsetHeight;
    if (Math.abs(sx - 1) <= 0.01 && Math.abs(sy - 1) <= 0.01) return;
    for (const child of node.children) {
      const transformOrigin = `${-child.offsetLeft}px ${-child.offsetTop}px`;
      child.animate([{ scale: `${sx} ${sy}`, transformOrigin }, { scale: "1 1", transformOrigin }], { duration: 400, easing: "ease" });
    }
  };
  const cancelMasonryTransitions = (instance = masonry) => {
    instance?.items.forEach((item) => {
      for (const child of item.element.children) child.getAnimations().forEach((animation) => isSizeMorph(animation) && animation.cancel());
      item.disableTransition();
      item._transn.ingProperties = {};
      item._transn.clean = {};
      item._transn.onEnd = {};
      item.element.style.transform = "";
      item.layoutPosition();
    });
  };
  // Vị trí đã tính sẵn; Masonry chỉ cần cho chuyển động. Layout tức thì bỏ qua nó để không đo lại mọi card
  // (getSize) trong frame cuộn và task Back (decision phone-frame-budget). Ghi left/top như Masonry: grid không padding.
  const placeRendered = () => {
    for (const [id, node] of rendered) {
      const position = positions.get(id);
      if (!position) continue;
      const left = `${position.x}px`;
      const top = `${position.y}px`;
      if (node.style.left !== left) node.style.left = left;
      if (node.style.top !== top) node.style.top = top;
    }
  };
  // Thời gian còn lại của transition transform (Masonry) và lượt co giãn đang chạy trên card.
  const remainingMotion = () => {
    let remaining = 0;
    masonry?.items.forEach((item) => {
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
    motionTimer = 0;
    if (performance.now() < motionUntil) {
      motionTimer = setTimeout(settleMotion, Math.max(0, motionUntil - performance.now()));
      return;
    }
    // Raster vùng mới sau cú cuộn xa giữ frame, transition bắt đầu trễ so với hẹn 400ms; cắt ngang lúc đó làm card
    // đứng rồi nhảy thẳng tới chỗ mới (masonry R6). Chờ phần còn lại; tab ẩn không chạy frame nên đặt luôn.
    const remaining = document.hidden ? 0 : remainingMotion();
    if (remaining > 0) {
      motionUntil = performance.now() + remaining;
      motionTimer = setTimeout(settleMotion, remaining);
      return;
    }
    motionUntil = 0;
    cancelMasonryTransitions();
    pruneMotionCohort();
    if (pendingScroll) {
      pendingScroll = false;
      renderWindow();
      return;
    }
    placeRendered();
  };
  const cancelMotion = () => {
    // Không có motion đang chạy: settleMotion đã hủy transition và dọn cohort; duyệt lại mọi card chỉ tốn task mở detail.
    if (!layoutFrame && !motionTimer && !motionUntil && !pendingScroll) return;
    if (layoutFrame) cancelAnimationFrame(layoutFrame);
    layoutFrame = 0;
    if (motionTimer) clearTimeout(motionTimer);
    motionTimer = 0;
    motionUntil = 0;
    pendingScroll = false;
    cancelMasonryTransitions();
    pruneMotionCohort();
  };
  const visualCoordinates = () => {
    const gridRect = grid.getBoundingClientRect();
    const coordinates = new Map();
    for (const [id, node] of rendered) {
      if (node.hidden) continue;
      const rect = node.getBoundingClientRect();
      // Cỡ đang thấy, kể cả lượt co giãn đang chạy (morphSize).
      const link = node.firstElementChild;
      const scaleY = link?.offsetHeight ? link.getBoundingClientRect().height / link.offsetHeight : 1;
      coordinates.set(id, { x: rect.left - gridRect.left, y: rect.top - gridRect.top,
        w: link?.getBoundingClientRect().width || rect.width, h: node.offsetHeight * scaleY });
    }
    coordinates.gridTop = gridRect.top;
    return coordinates;
  };

  const skeletonMotionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  const visibleSkeletonFrames = new Set();
  const skeletonFlowByFrame = new Map();
  const skeletonLeaseByFrame = new Map();
  const skeletonAssignmentByFrame = new Map();
  const skeletonFrameBySlot = new Map();
  const skeletonPhaseBySlot = new Map();
  const skeletonEntryFrames = new Map();
  // Slot batch và media đang tải giữ nguyên lượt vẽ trong một trạng thái trang (advertising-skeleton R3).
  const skeletonAssignmentByKey = new Map();
  // Theo key chứ không theo frame: card ra vào view tạo frame mới cho cùng media, nên cache theo frame luôn trượt.
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
  // Skeleton loading chạy trên related card và cả primary; batch CTA được xóa khi đang mở photo.
  const skeletonMotionAllowed = () => !skeletonDocumentParked && !document.hidden
    && !skeletonMotionPreference.matches
    && !document.body.classList.contains("motion-paused") && !document.body.classList.contains("menu-open");
  const skeletonCanLoop = (frame) => visibleSkeletonFrames.has(frame) && skeletonMotionAllowed();
  const settleSkeletonCanvas = (frame) => {
    const canvas = frame.querySelector('[data-advertising-flow-backend="webgl"]');
    if (!canvas) return;
    canvas.style.transition = "none";
    canvas.style.opacity = "1";
    canvas.getAnimations().forEach((animation) => {
      if (animation.transitionProperty === "opacity") animation.cancel();
    });
  };
  const loadingSkeletonFrames = new Set();
  const skeletonFrames = () => [...skeletonFrameBySlot.values(), ...loadingSkeletonFrames];
  const skeletonKey = (frame) => frame.dataset.advertisingCtaSlot
    ?? `media:${frame.dataset.advertisingLoadingSkeleton}`;
  const skeletonPhase = (frame) => skeletonPhaseBySlot.get(skeletonKey(frame))
    ?? skeletonAssignmentByFrame.get(frame).phase;
  // Không có renderer live, canvas hiện ảnh tĩnh của chính Flow tại pha đã lưu (R5).
  const createSkeletonCanvas = (frame, canvas = document.createElement("canvas")) => {
    const assignment = skeletonAssignmentByFrame.get(frame);
    const { preset, anchorPermutation, direction, speedScale } = assignment;
    const phase = skeletonPhase(frame);
    // Remount dùng lại ảnh tĩnh đã vẽ lúc release; chỉ khi sang pha khác mới tốn một lần render CPU.
    const cached = skeletonStillByKey.get(skeletonKey(frame));
    const still = cached?.assignment === assignment && cached.phase === phase
      ? cached.still
      : skeletonFlowStill(preset, phase);
    skeletonStillByKey.set(skeletonKey(frame), { assignment, phase, still });
    canvas.className = "advertising-grid__cta-flow";
    canvas.dataset.advertisingFlowPreset = preset.id;
    canvas.dataset.advertisingFlowAnchorPermutation = anchorPermutation.join(",");
    canvas.dataset.advertisingFlowPhase = String(assignment.phase);
    canvas.dataset.advertisingFlowDirection = String(direction);
    canvas.dataset.advertisingFlowSpeedScale = speedScale.toFixed(3);
    canvas.dataset.advertisingFlowBackend = "none";
    canvas.style.backgroundColor = preset.colors[3];
    canvas.style.backgroundImage = still;
    canvas.style.backgroundSize = "100% 100%";
    canvas.style.filter = preset.finish.soften ? `blur(${preset.finish.soften}px)` : "none";
    canvas.style.transform = `scale(${1 + preset.finish.soften / 200})`;
    canvas.setAttribute("aria-hidden", "true");
    // Canvas tràn ra ngoài surface 8% mỗi bên; surface hiện cùng ảnh tĩnh dưới canvas đang mờ dần.
    const surface = frame.querySelector(".advertising-grid__cta-surface");
    surface.style.backgroundColor = preset.colors[3];
    surface.style.backgroundImage = still;
    surface.style.backgroundSize = "116% 116%";
    surface.style.backgroundPosition = "center";
    return canvas;
  };
  const createSkeletonFrame = () => {
    const frame = document.createElement("span");
    frame.className = "advertising-grid__cta-frame";
    const surface = document.createElement("span");
    surface.className = "advertising-grid__cta-surface";
    frame.append(surface);
    return frame;
  };
  // Kề nhau: cùng cột phía trên hoặc dưới, hoặc cột kế tiếp chồng lên theo chiều dọc (R3).
  // `rects` giữ các rect đọc trước mọi lần append canvas, nên một batch vẽ chỉ ép một layout.
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
      assignment = drawSkeletonFlowAssignment({ neighbors: skeletonNeighbors(frame, rects) });
      skeletonAssignmentByKey.set(key, assignment);
      skeletonPhaseBySlot.delete(key);
    }
    skeletonAssignmentByFrame.set(frame, assignment);
    frame.querySelector(".advertising-grid__cta-surface").append(createSkeletonCanvas(frame));
  };
  // Mọi khung batch vẽ trên một canvas WebGL chung nửa độ phân giải (advertising-skeleton R5).
  const sharedFlowFor = (frame) => {
    const container = frame.closest(".advertising-grid__cta-skeleton");
    if (!container) return null;
    if (sharedSkeletonFlow === undefined) {
      sharedSkeletonFlow = createSharedSkeletonFlowLayer();
      addEventListener("pagehide", (event) => { if (!event.persisted) sharedSkeletonFlow?.dispose(); });
    }
    // Batch dựng lại xóa hoặc thêm khung sau canvas; canvas phải là con cuối để nằm trên khung, dưới Kính và CTA.
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
      const surface = frame.querySelector(".advertising-grid__cta-surface");
      // Đang reveal thì canvas chung theo opacity của surface; xong reveal thì 1 (R4).
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
    // Vuốt nhanh làm rAF main thread còn khoảng 12fps trên A04s: vẽ trong worker thì Flow chạy đều (R8, owner 19/10).
    const renderer = (!lease && createSkeletonFlowWorkerRenderer(canvas, options)) || createSkeletonFlowRenderer(canvas, options);
    canvas.dataset.advertisingFlowBackend = renderer?.backend || "fallback";
    skeletonFlowByFrame.set(frame, renderer);
    if (renderer?.context) {
      const record = lease || rememberSkeletonContext(canvas, renderer.context, renderer);
      record.renderer = renderer;
      skeletonLeaseByFrame.set(frame, record);
    }
    if (oldCanvas && oldCanvas !== canvas) oldCanvas.replaceWith(canvas);
    if (!canvas.isConnected) frame.querySelector(".advertising-grid__cta-surface")?.append(canvas);
    // Vẽ một lần khi canvas được lease nằm trong frame; không có paint nào chen giữa, nên vẫn thấy frame đầu.
    renderer?.draw(performance.now());
    requestAnimationFrame(() => {
      if (!canvas.isConnected || skeletonFlowByFrame.get(frame) !== renderer
        || document.hidden || skeletonMotionPreference.matches) return;
      canvas.style.transition = "opacity 300ms ease-out";
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
  // `rects` đọc trước khi assignSkeleton append canvas; đọc lại sau đó ép thêm một style recalc.
  const syncSkeletonRenderers = (rects) => {
    const budget = SKELETON_CONTEXT_BUDGET;
    const eligible = skeletonMotionAllowed();
    const keep = new Set();
    for (const frame of skeletonFlowByFrame.keys()) {
      if (visibleSkeletonFrames.has(frame) && keep.size < budget) keep.add(frame);
    }
    // Frame card và CTA nằm trong container khác nhau, nên xếp theo vị trí viewport. Dùng lại rect đã đọc
    // trước khi append canvas: đọc lại ép thêm một layout (phone Android, decision phone-frame-budget).
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
    // Release trước khi cấp phát để xoay điện thoại không bao giờ chồng ngân sách context.
    for (const frame of skeletonFlowByFrame.keys()) {
      if (!keep.has(frame)) releaseSkeletonRenderer(frame);
    }
    pruneSkeletonContexts(budget);
    skeletonMountWanted = keep;
    if ([...keep].some((frame) => !skeletonFlowByFrame.has(frame))) scheduleSkeletonMount();
  };
  // Một context mới, rồi shader và noise, mỗi thứ tốn hàng chục ms trên phone Android (R8): mọi renderer
  // mount trong task riêng sau frame, context mới một task trước nó; ảnh tĩnh hiện trong lúc đó.
  // Máy không phải điện thoại mount không chờ scroll dừng, nên Flow chạy khi đang giữ scrollbar (R5).
  let skeletonMountWanted = new Set();
  let skeletonMountTimer = 0;
  // Compile shader và tạo context làm đứng frame của card slide 0.4s, nên mount chờ nó kết thúc. Khung batch
  // trên điện thoại còn chờ swipe dừng (R5 "cuộn mượt thắng"); khung card mount ngay lúc vuốt (owner 18/10).
  const skeletonMountWait = (frame) => Math.max(motionUntil - performance.now(),
    skeletonPhone() && frame.dataset.advertisingCtaFrame ? phoneScrollWait() : 0);
  const pendingSkeletonMounts = () => [...skeletonMountWanted].filter((node) => node.isConnected && !skeletonFlowByFrame.has(node));
  const scheduleSkeletonMount = () => {
    if (skeletonMountTimer || controller.signal.aborted) return;
    const wait = Math.min(...pendingSkeletonMounts().map(skeletonMountWait));
    skeletonMountTimer = setTimeout(() => {
      skeletonMountTimer = 0;
      const pending = pendingSkeletonMounts();
      const frame = pending.find((node) => skeletonMountWait(node) <= 0);
      // Chỉ còn khung batch đang chờ cuộn dừng: hẹn lại theo thời gian chờ nhỏ nhất.
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
      // Worker tự tạo context ngoài main thread, không cần tạo trước.
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
      // Vượt ngân sách hoặc mất context thì không mount gì; lần đổi visibility kế tiếp thử lại.
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
      frame.classList.add("is-entry-ready");
      revealedSkeletonSlots.add(skeletonKey(frame));
      // Frame batch vào như ảnh card: Flow hiện dưới Kính trên frame trống trong 0.6s (skeleton R4).
      if (frame.dataset.advertisingCtaFrame) {
        pending.glass = cardRevealGlass(frame);
        pending.animations = [...crossfadeLayers([], [frame.querySelector(".advertising-grid__cta-surface")], CARD_REVEAL_MS),
          ...(pending.glass ? playGlassReveal(pending.glass, CARD_REVEAL_MS) : [])];
        Promise.all(pending.animations.map(({ finished }) => finished)).then(settle, () => {});
        return;
      }
      frame.addEventListener("transitionend", pending.settle);
      pending.fallback = setTimeout(settle, 650);
    });
    skeletonEntryFrames.set(frame, pending);
  };
  // rAF của scheduleSkeletonSync chung task với frame cuộn và layout masonry; ảnh tĩnh render CPU ở task sau, nếu
  // không task frame vượt 50ms trên phone Android lúc vuốt nhanh (R8, decision phone-frame-budget).
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
    // Mỗi ảnh tĩnh là một lần render CPU; mở detail có thể cần hơn chục cái cùng lúc. Vượt ngân sách
    // thì phần còn lại sang task sau, frame chưa có assignment chưa vào entry (decision phone-frame-budget).
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
        frame.dataset.advertisingFlowState = "paused";
        renderer?.stop();
        return;
      }
      if (!visibleSkeletonFrames.has(frame)) {
        // Khung đã hiện giữ nguyên khi ra vào viewport, như card ảnh đã tải (skeleton R4); chạy lại thì nháy trắng dưới Kính.
        cancelSkeletonEntry(frame);
        frame.classList.remove("is-looping");
        frame.dataset.advertisingFlowState = "paused";
        renderer?.stop();
        return;
      }
      if (document.hidden || document.body.classList.contains("motion-paused")) {
        cancelSkeletonEntry(frame);
        settleSkeletonCanvas(frame);
        frame.classList.remove("is-looping");
        frame.dataset.advertisingFlowState = "paused";
        renderer?.stop();
        return;
      }
      if (!skeletonAssignmentByFrame.has(frame)) return;
      if (skeletonCanLoop(frame)) {
        // Flow chạy từ frame đầu tiên của entry Kính (R4).
        if (!frame.classList.contains("is-entry-ready")) startSkeletonEntry(frame);
        frame.classList.toggle("is-looping", Boolean(renderer));
        frame.dataset.advertisingFlowState = renderer ? "running" : "paused";
        renderer?.start();
        return;
      }
      cancelSkeletonEntry(frame);
      frame.classList.remove("is-looping");
      frame.dataset.advertisingFlowState = "paused";
      renderer?.stop();
    });
  };
  let skeletonAssignTimer = 0;
  const scheduleSkeletonAssign = () => {
    if (skeletonAssignTimer || controller.signal.aborted) return;
    // Chạy trong idle sau frame: layout đã sạch nên đọc rect không ép style, và ngân sách vừa phần rảnh của frame
    // thay vì một task 17ms chen giữa hai frame lúc vuốt nhanh trên A05s cũ (decision phone-frame-budget). Luôn gán ít
    // nhất một khung mỗi lượt để không treo khi idle hết hạn.
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
  // Class body đổi ngay trong task chạm card (is-advertising-photo); đồng bộ ở frame kế để đọc rect không ép thêm
  // một lần style và layout trong task đó (decision phone-frame-budget).
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
  // Media đang tải hiện chính frame skeleton cuối masonry (loading-glass-and-page-entry R1, R5).
  const attachLoadingSkeleton = (host, mediaId, before = null) => {
    const frame = createSkeletonFrame();
    frame.dataset.advertisingLoadingSkeleton = mediaId;
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
  // Bước crossfade của reveal đã duyệt: layer cũ mờ từ opacity hiện tại, layer mới từ 0.
  const crossfadeLayers = (from, to, total) => {
    const scale = total / MEDIA_REVEAL_MS;
    const timing = { delay: 300 * scale, duration: 600 * scale, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "both" };
    // Đọc hết opacity trước lần ghi đầu, nên cả crossfade chỉ tốn một lần style recalc.
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
  // Kính phủ lên media chỉ cho reveal (R2, R4): cuối cùng trong media box, trên photo và skeleton.
  const revealGlass = (host) => {
    const glass = createGlassSurface("even", 3);
    glass.dataset.glassReveal = "";
    host?.append(glass);
    return glass;
  };
  // Kính reveal bất kỳ còn trong DOM khi cung đang thấy làm Chrome bỏ blur các bậc của cung (skeleton R4):
  // cung vào viewport thì gỡ Kính reveal của grid, card và frame chỉ còn crossfade.
  let arcInView = false;
  const arcTint = arcGlass?.querySelector(".glass-surface__tint");
  const arcObserver = arcTint && new IntersectionObserver(([entry]) => {
    arcInView = entry.isIntersecting;
    if (arcInView) grid.querySelectorAll(".glass-surface[data-glass-reveal]").forEach((glass) => glass.remove());
  });
  arcObserver?.observe(arcTint);
  controller.signal.addEventListener("abort", () => arcObserver?.disconnect(), { once: true });
  const cardRevealGlass = (host) => (arcInView ? null : revealGlass(host));
  // Media tải sau skeleton reveal dưới Kính trong 0.6s; media đã tải thì hiện ngay
  // (loading-glass-and-page-entry R1-R3).
  const cardSkeletons = new Map();
  const attachCardSkeleton = (node) => {
    const mediaId = node.advertisingPendingMediaId?.();
    // Card gắn lại có media đã tải thì không skeleton (loading-glass R3).
    if (cardSkeletons.has(node) || !mediaId || loadedMediaKeys.has(mediaKey(node))) return;
    const frame = attachLoadingSkeleton(node.querySelector(".advertising-card-media"), mediaId);
    cardSkeletons.set(node, { frame, revealing: false, animations: [] });
  };
  const dropCardSkeleton = (node) => {
    const entry = cardSkeletons.get(node);
    if (!entry) return;
    cardSkeletons.delete(node);
    entry.animations.forEach((animation) => animation.cancel());
    mediaLayers(node).forEach((media) => media.style.removeProperty("transition"));
    entry.glass?.remove();
    if (entry.frame) detachLoadingSkeleton(entry.frame);
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
      entry = { frame: null, revealing: false, animations: [] };
      cardSkeletons.set(node, entry);
    }
    entry.revealing = true;
    // Chỉ swap photo đã decode để crossfade không bao giờ vẽ frame decode dở (R2).
    const decoded = layer instanceof HTMLImageElement ? layer.decode().catch(() => {}) : Promise.resolve();
    decoded.then(() => {
      // Card rời view lúc decode thì skeleton đã bị drop; vẫn phải hiện ảnh, không thì kẹt opacity 0.
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
      layers.forEach((media) => {
        media.style.setProperty("transition", "none", "important");
        media.classList.add("is-advertising-media-ready");
      });
      entry.glass = cardRevealGlass(node.querySelector(".advertising-card-media"));
      entry.animations = [...crossfadeLayers(entry.frame ? [entry.frame] : [], layers, CARD_REVEAL_MS),
        ...(entry.glass ? playGlassReveal(entry.glass, CARD_REVEAL_MS) : [])];
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
    if (!ctaSkeleton) return;
    ctaSkeleton.hidden = true;
    ctaSkeleton.replaceChildren();
    gridCta?.style.removeProperty("--advertising-cta-tail-height");
    if (arcGlass) arcGlass.hidden = true;
    delete ctaSkeleton.dataset.advertisingCtaColumns;
    delete ctaSkeleton.dataset.advertisingCtaReady;
    delete ctaSkeleton.dataset.advertisingCtaSignature;
  };
  // Khung batch, cụm CTA và Kính cung trượt từ vị trí cũ cùng nhịp transform 0.4s ease của card masonry, nên cả
  // trang đọc như một masonry khi resize hay đổi filter (owner 10/10). Dùng `translate` để không đè transform
  // parallax của CTA.
  const slideFrom = (node, before) => {
    if (!before || !node.isConnected) return;
    const after = node.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    // Khung batch co giãn từ cỡ cũ như card (morphSize); cụm CTA và Kính chỉ trượt.
    const scale = node.dataset.advertisingCtaFrame && after.width && after.height
      ? `${before.width / after.width} ${before.height / after.height}` : "1 1";
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && scale === "1 1") return;
    node.animate([{ translate: `${dx}px ${dy}px`, scale, transformOrigin: "0 0" }, { translate: "0 0", scale: "1 1", transformOrigin: "0 0" }],
      { duration: 400, easing: "ease" });
  };
  const cancelCtaSlides = (nodes) => [...nodes].forEach((node) => node.getAnimations().forEach((animation) => {
    if (animation.effect?.getKeyframes?.()[0]?.translate) animation.cancel();
  }));
  const ctaSlideNodes = () => [...skeletonFrameBySlot.values(), gridCta, arcGlass].filter(Boolean);
  const renderCtaSkeleton = ({ slide = false } = {}) => {
    if (!ctaSkeleton || !geometry || activePhotoId) {
      gridPixelHeight = geometry?.totalPixelHeight || 0;
      clearCtaSkeleton();
      return;
    }
    // Đọc vị trí đang thấy (kể cả lượt trượt trước) rồi mới hủy lượt đó.
    const slideOrigins = slide ? new Map(ctaSlideNodes().map((node) => [node, node.getBoundingClientRect()])) : null;
    cancelCtaSlides(slideOrigins?.keys() || []);
    const gap = geometry.interCardGap;
    const ctaTop = geometry.totalPixelHeight + gap;
    gridSectionStyleTarget?.style.setProperty("--advertising-cta-top", `${ctaTop}px`);
    const viewportHeight = getLayoutViewportHeight();
    lastCtaViewportHeight = viewportHeight;
    const footerHeight = siteFooter?.offsetHeight || 0;
    const room = viewportHeight / 2 - footerHeight - gap;
    const copyKey = `${room}:${gridCtaCopy?.clientWidth}:${document.documentElement.lang}`;
    if (gridCtaHeading && gridCtaCopy && copyKey !== ctaCopyKey) {
      ctaCopyKey = copyKey;
      ctaCopyMetrics = fitGridCtaHeading(room);
      // CSS đặt copy theo dynamic viewport, nên thanh địa chỉ không bao giờ dựng lại batch.
      gridCta.style.setProperty("--advertising-cta-footer-height", `${footerHeight}px`);
      gridCta.style.setProperty("--advertising-cta-copy-below", `${ctaCopyMetrics.below}px`);
      requestAnimationFrame(() => { gridCta.dataset.advertisingCtaSettled = "true"; });
    }
    // Baseline cuối nằm D phía trên đáy batch; cửa sổ quá thấp thì nút giữ cách nó một gap.
    const baselineGap = Math.max(viewportHeight / 2 - footerHeight, gap + ctaCopyMetrics.below);
    const tailHeight = Math.max(Math.ceil(geometry.cardWidth * 0.25) + 1,
      viewportHeight - gap - footerHeight, Math.ceil(baselineGap + ctaCopyMetrics.baseline));
    const nextCtaGeometryHash = `${geometry.coordinateHash}:${tailHeight.toFixed(3)}`;
    if (ctaGeometryHash === nextCtaGeometryHash) return;
    gridCta?.style.setProperty("--advertising-cta-tail-height", `${tailHeight}px`);
    const ctaHeight = gridCta?.offsetHeight || 0;
    const gridBottom = ctaTop + ctaHeight;
    // Batch kết thúc ngay trên footer.
    const skeletonBoundaryBottom = gridBottom;
    const fragment = document.createDocumentFragment();
    const frameLayout = createSkeletonFlowFrameLayout({
      columnBottoms: geometry.columnBottoms,
      columns: geometry.columns,
      cardWidth: geometry.cardWidth,
      gap: geometry.interCardGap,
      boundaryBottom: skeletonBoundaryBottom,
      seed: browseHistory.current.seed,
      bandAssignments: skeletonRatioBandBySlot,
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
    frameLayout.forEach(({ slot, column, depth, band, top, height }) => {
        let frame = skeletonFrameBySlot.get(slot);
        if (!frame) {
          frame = createSkeletonFrame();
          frame.dataset.advertisingCtaSlot = slot;
          // Slot quay lại hiện màu ngay; slot mới vẽ khi lần đầu vào view.
          if (skeletonAssignmentByKey.has(slot)) assignSkeleton(frame);
          if (revealedSkeletonSlots.has(slot)) frame.classList.add("is-entry-ready");
          fragment.append(frame);
          skeletonFrameBySlot.set(slot, frame);
        }
        frame.dataset.advertisingCtaFrame = "true";
        frame.dataset.advertisingCtaColumn = String(column);
        frame.dataset.advertisingCtaDepth = String(depth);
        frame.dataset.advertisingCtaRatioBand = band;
        frame.dataset.advertisingCtaSlot = slot;
        frame.style.left = `${column * (geometry.cardWidth + geometry.interCardGap)}px`;
        frame.style.top = `${top}px`;
        frame.style.width = `${geometry.cardWidth}px`;
        frame.style.height = `${height}px`;
        frame.style.setProperty("--advertising-cta-frame-opacity", "1");
    });
    gridPixelHeight = gridBottom;
    ctaGeometryHash = nextCtaGeometryHash;
    ctaSkeleton.append(fragment);
    ctaSkeleton.hidden = false;
    ctaSkeleton.dataset.advertisingCtaColumns = String(geometry.columns);
    ctaSkeleton.dataset.advertisingCtaReady = "true";
    ctaSkeleton.dataset.advertisingCtaRealBottom = String(geometry.totalPixelHeight);
    ctaSkeleton.dataset.advertisingCtaSignature = `${ctaGeometryHash}:${gridPixelHeight.toFixed(3)}`;
    if (arcGlass) {
      // Cụm CTA (từ đầu heading đến cuối link) tại giới hạn cuộn, nơi parallax bằng 0.
      const clusterBottom = skeletonBoundaryBottom - baselineGap + ctaCopyMetrics.below;
      // Hiện trước khi đo: box ẩn không có width.
      arcGlass.hidden = false;
      layoutArcGlass(arcGlass, arcGlassGeometry({
        width: arcGlass.clientWidth,
        batchBottom: skeletonBoundaryBottom,
        realBottom: geometry.totalPixelHeight,
        cardWidth: geometry.cardWidth,
        clusterTop: clusterBottom - ctaCopyMetrics.baseline - ctaCopyMetrics.below,
        clusterBottom,
      }));
    }
    ctaSkeleton.style.height = `${skeletonBoundaryBottom}px`;
    grid.style.height = `${gridPixelHeight}px`;
    ctaSkeleton.querySelectorAll("[data-advertising-cta-frame]").forEach((frame) => {
      if (skeletonObserver) skeletonObserver.observe(frame);
      else visibleSkeletonFrames.add(frame);
    });
    syncSkeletonMotion();
    syncCtaParallax();
    // Kính cung đổi hình theo bề rộng mới; nó trượt theo độ dời của cụm CTA.
    if (slideOrigins && gridCta && arcGlass) {
      const cta = slideOrigins.get(gridCta);
      const glass = slideOrigins.get(arcGlass);
      if (cta && glass) slideOrigins.set(arcGlass, new DOMRect(arcGlass.getBoundingClientRect().left,
        arcGlass.getBoundingClientRect().top + cta.top - gridCta.getBoundingClientRect().top));
    }
    // Khung mới xuất phát ngay dưới khung đứng trước nó trong layout cũ, như item kế tiếp của masonry cũ.
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

  const renderWindow = ({ animate = false, origins: visualOrigins } = {}) => {
    if (!geometry || activePhotoId) return;
    let origins = visualOrigins;
    renderCtaSkeleton({ slide: animate && hasLaidOut && !reduced });
    // Grid đổi chiều cao làm trình duyệt kẹp scroll (đang ở cuối trang); card phải xuất phát từ chỗ đang thấy trên
    // màn, nếu không chúng bay lệch đúng bằng độ kẹp rồi giật về (đo trên PC, vòng 26).
    if (origins?.gridTop !== undefined) {
      const shift = origins.gridTop - grid.getBoundingClientRect().top;
      if (shift) origins = new Map([...origins].map(([id, origin]) => [id, { ...origin, y: origin.y + shift }]));
    }
    if (layoutFrame && !animate) return;
    if (layoutFrame) {
      cancelAnimationFrame(layoutFrame);
      layoutFrame = 0;
    }
    const { keep: normalKeep, visiblePlacements } = virtualWindow();
    const currentKeep = new Set(rendered.keys());
    const membershipChanged = !sameMembers(currentKeep, normalKeep);
    const geometrySignature = geometry.coordinateHash;
    const geometryChanged = geometrySignature !== lastGeometrySignature;
    if (hasLaidOut && !membershipChanged && !geometryChanged) return;
    const nextPositions = new Map(geometry.placements.map((placement) => [placement.card.id, { x: placement.x, y: placement.y }]));
    const hasCoordinateDiff = coordinateChanged(nextPositions);
    if (hasLaidOut && !membershipChanged && !hasCoordinateDiff && !geometryChanged) return;
    const shouldAnimate = animate && (membershipChanged || hasCoordinateDiff || !hasLaidOut);
    const retainCohort = shouldAnimate && !reduced;
    const keep = retainCohort ? new Set([...currentKeep, ...normalKeep]) : normalKeep;
    const created = new Set();
    const seeded = new Set();
    if (origins && shouldAnimate && !reduced) {
      for (const [id, node] of rendered) {
        const origin = origins.get(id);
        if (!origin || node.hidden) continue;
        node.style.left = `${origin.x}px`;
        node.style.top = `${origin.y}px`;
        node.style.transform = "none";
      }
    }
    positions.clear();
    nextPositions.forEach((position, id) => positions.set(id, position));
    for (const [id] of rendered) {
      if (!positions.has(id) && origins?.has(id)) positions.set(id, origins.get(id));
    }

    for (const [id, node] of rendered) {
      if (keep.has(id) || node === document.activeElement || node.contains(document.activeElement)) continue;
      releaseMediaCard(node);
      node.remove();
      rendered.delete(id);
    }
    const fragment = document.createDocumentFragment();
    for (const placement of visiblePlacements) {
      let node = rendered.get(placement.card.id);
      if (!node) {
        const id = placement.card.id;
        const initialMediaId = gridMediaById.get(id)
          || (browseHistory.current.grid.focusId === id ? browseHistory.current.grid.mediaId : null);
        node = createPhotoCard(placement.card, locale, handleMediaLoaded, false, initialMediaId,
          (mediaId) => gridMediaById.set(id, mediaId), syncCardSkeleton);
        rendered.set(placement.card.id, node);
        observeMediaCard(node);
        created.add(placement.card.id);
        const origin = origins?.get(placement.card.id) || (shouldAnimate && !reduced ? { x: placement.x, y: 0 } : null);
        if (origin) {
          node.style.left = `${origin.x}px`;
          node.style.top = `${origin.y}px`;
          seeded.add(placement.card.id);
        }
        fragment.append(node);
      }
      sizeNode(node, placement, geometry.placements.length);
      node.hidden = false;
    }
    if (fragment.childNodes.length) grid.append(fragment);
    for (const [id, node] of rendered) node.hidden = retainCohort && !normalKeep.has(id);
    if (!retainCohort) restoreCanonicalDomOrder();
    if (seeded.size) void grid.offsetHeight;
    grid.style.height = `${gridPixelHeight}px`;
    const applyLayout = () => {
      if (!shouldAnimate || reduced) placeRendered();
      else {
        if (!masonry) masonry = createMasonry(grid, positions, () => gridPixelHeight);
        // Thiếu option này Outlayer coi lần layout đầu là tức thì: lần dựng đầu mất motion từ đầu cột.
        masonry.options.layoutInstant = false;
        masonry.options.transitionDuration = "0.4s";
        masonry.reloadItems();
        masonry.items.forEach((item) => {
          item.isLayoutInstant = item.element.hidden || (created.has(item.element.dataset.advertisingCard) && !seeded.has(item.element.dataset.advertisingCard));
        });
        masonry.layout();
        for (const [id, node] of rendered) if (!node.hidden && origins?.get(id)?.w) morphSize(node, origins.get(id));
      }
      hasLaidOut = true;
      lastGeometrySignature = geometrySignature;
      if (shouldAnimate && !reduced) {
        motionUntil = performance.now() + 400;
        if (motionTimer) clearTimeout(motionTimer);
        motionTimer = setTimeout(settleMotion, 400);
      }
      window.lazySizes?.loader?.checkElems?.();
      // site:layout chạy Locomotive update(), giữa lúc scroll làm trang nhảy tiến một bước; card bị hoán đổi do
      // ảo hóa giữ nguyên chiều cao trang, nên chỉ khi chiều cao đổi mới báo layout (scroll-feel R1).
      const pageHeight = (grid.closest("[data-scroll-container]") || document.documentElement).offsetHeight;
      if (pageHeight !== announcedPageHeight) {
        announcedPageHeight = pageHeight;
        window.dispatchEvent(new CustomEvent("site:layout"));
      }
    };
    if (seeded.size && animate && !reduced) {
      void grid.offsetHeight;
      layoutFrame = requestAnimationFrame(() => {
        layoutFrame = 0;
        applyLayout();
      });
      return;
    }
    applyLayout();
  };

  const focusVirtualPlacement = (placement, { focus = true, scrollIntoView = true } = {}) => {
    let node = rendered.get(placement.card.id);
    if (!node) {
      const id = placement.card.id;
      const initialMediaId = gridMediaById.get(id)
        || (browseHistory.current.grid.focusId === id ? browseHistory.current.grid.mediaId : null);
      node = createPhotoCard(placement.card, locale, handleMediaLoaded, false, initialMediaId,
        (mediaId) => gridMediaById.set(id, mediaId), syncCardSkeleton);
      rendered.set(placement.card.id, node);
      observeMediaCard(node);
      grid.append(node);
    }
    node.hidden = false;
    sizeNode(node, placement, geometry.placements.length);
    restoreCanonicalDomOrder();
    // Relayout tức thì giữa transition sẽ chồng transform đang chạy lên top mới.
    cancelMasonryTransitions();
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
    const { outer, interCardGap } = advertisingSpacing(layoutViewportWidth);
    const projectIndex = grid.closest(".project-index");
    projectIndex?.style.setProperty("--advertising-outer", `${outer}px`);
    projectIndex?.style.setProperty("--advertising-gap", `${interCardGap}px`);
    grid.style.setProperty("--advertising-gap", `${interCardGap}px`);
    const gridWidth = grid.clientWidth;
    if (!gridWidth) return;
    lastMeasuredGridWidth = gridWidth;
    lastLayoutViewportWidth = layoutViewportWidth;
    geometry = geometryFor(filter);
    renderWindow({ animate, origins });
  };

  // Title và kicker theo trang của filter (taxonomy R4); data-vi, data-en giữ cho lần đổi ngôn ngữ sau.
  const syncPageHeading = ({ animate = false } = {}) => {
    const page = pages.find((entry) => entry.filter === filter) || pages.find((entry) => entry.filter === "all");
    if (!page) return;
    const english = locale === "en";
    for (const [node, vi, en] of [
      [document.querySelector("title"), page.titleVi, page.titleEn],
      [container.querySelector("[data-motion-hero-kicker]"), page.labelVi, page.labelEn],
    ]) {
      if (!node) continue;
      node.dataset.vi = vi;
      node.dataset.en = en;
      const text = english ? en : vi;
      const changed = node.textContent !== text;
      node.textContent = text;
      // Kicker đổi chữ vào lại như entrance Advertising: opacity 0 và x -60px, 0.6s --ease.
      if (animate && changed && node.hasAttribute("data-motion-hero-kicker")) {
        enterFrom([node], "translate3d(-60px, 0, 0)", { duration: 600, easing: "cubic-bezier(0, 0, 0.26, 1)" });
      }
    }
  };
  const setActiveFilter = (nextFilter, { animate = false } = {}) => {
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
    syncPageHeading({ animate });
    measure({ animate, origins });
  };
  const getLogicalScroll = () => scroll?.getLogicalScroll?.() ?? currentVisualY;
  const setLogicalScroll = (scrollY) => scroll?.setLogicalScroll?.(scrollY) ?? false;
  const ensurePhoto = (id, { focus = false, scrollIntoView = false } = {}) => {
    const card = cards.find((entry) => entry.id === id);
    if (!card) return null;
    if (!matchesAdvertisingFilter(card, filter)) setActiveFilter(card.category);
    if (!geometry) measure();
    const placement = geometry?.placements.find((entry) => entry.card.id === id);
    if (!placement) return null;
    retainedPhotoIds.add(id);
    focusVirtualPlacement(placement, { focus, scrollIntoView });
    return rendered.get(id) || null;
  };
  const categoryById = new Map(categories.map((category) => [category.slug, category]));
  const showDescriptionPage = (index = descriptionPageIndex) => {
    const last = Math.max(0, descriptionPages.length - 1);
    descriptionPageIndex = Math.min(last, Math.max(0, index));
    if (photoDescription) photoDescription.textContent = descriptionPages[descriptionPageIndex] || "";
    if (photoDescriptionPager) {
      photoDescriptionPager.dataset.pageIndex = String(descriptionPageIndex);
      photoDescriptionPager.dataset.pageCount = String(descriptionPages.length);
    }
    if (photoDescriptionIndicator) {
      const current = descriptionPageIndex + 1;
      const total = descriptionPages.length;
      const pageLabel = (page) => locale === "en" ? `Description page ${page} of ${total}` : `Trang mô tả ${page} trên ${total}`;
      photoDescriptionIndicator.hidden = total <= 1;
      photoDescriptionIndicator.setAttribute("aria-label", pageLabel(current));
      // Tối đa năm trang hiện một dot mỗi trang; nhiều hơn thì dùng "n / N".
      if (total > 5) photoDescriptionIndicator.textContent = `${current} / ${total}`;
      else {
        if (photoDescriptionIndicator.children.length !== total) {
          photoDescriptionIndicator.replaceChildren(...descriptionPages.map((_, index) => {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.dataset.advertisingPhotoDescriptionDot = String(index);
            return dot;
          }));
        }
        [...photoDescriptionIndicator.children].forEach((dot, index) => {
          dot.setAttribute("aria-label", pageLabel(index + 1));
          dot.setAttribute("aria-current", String(index === descriptionPageIndex));
        });
      }
    }
  };
  const paginateDescription = () => {
    if (!photoDescription || !photoDescriptionPager || !photoDescriptionPage) return;
    const words = descriptionSource.trim().split(/\s+/).filter(Boolean);
    const available = Math.floor(photoDescriptionPager.clientHeight);
    if (!words.length || available <= 0) {
      descriptionPages = [descriptionSource];
      showDescriptionPage(0);
      return;
    }
    const pages = [];
    let start = 0;
    // Hầu hết mô tả vừa một trang: một layout thay vì tìm kiếm.
    photoDescription.textContent = words.join(" ");
    if (photoDescription.scrollHeight <= available + 1) {
      pages.push(photoDescription.textContent);
      start = words.length;
    }
    while (start < words.length) {
      // Binary search trang dài nhất vừa khít: mỗi lần probe ép một layout.
      let best = start + 1;
      let low = start + 2;
      let high = words.length;
      while (low <= high) {
        const end = (low + high) >> 1;
        photoDescription.textContent = words.slice(start, end).join(" ");
        if (photoDescription.scrollHeight > available + 1) high = end - 1;
        else {
          best = end;
          low = end + 1;
        }
      }
      pages.push(words.slice(start, best).join(" "));
      start = best;
    }
    descriptionPages = pages.length ? pages : [descriptionSource];
    showDescriptionPage(Math.min(descriptionPageIndex, descriptionPages.length - 1));
  };
  const turnDescriptionPage = (direction) => {
    if (descriptionPages.length <= 1) return false;
    const next = Math.min(descriptionPages.length - 1, Math.max(0, descriptionPageIndex + direction));
    if (next === descriptionPageIndex) return false;
    showDescriptionPage(next);
    return true;
  };
  const renderSuggestionLinks = (browse, english) => {
    if (!suggestionNode) return;
    const heroChanged = suggestionSlotHeroId !== browse.photo;
    if (heroChanged) {
      stopSuggestionSlides?.();
      suggestionSlotHeroId = browse.photo;
      suggestionSlots = selectAdvertisingSuggestions({
        cards,
        heroId: browse.photo,
        activeTag: browse.tag,
        tagRegistry: artifact.tagRegistry || [],
      });
      const links = document.createElement("div");
      links.className = "advertising-photo-view__suggestion-links";
      suggestionSlots.forEach(({ card, tag }, index) => {
        const link = document.createElement("button");
        link.type = "button";
        link.className = "advertising-photo-view__suggestion-link advertising-card-interactive advertising-card-media";
        link.dataset.advertisingSuggestionTag = tag.id;
        link.dataset.advertisingSuggestionIndex = String(index);
        const first = suggestionDeck(tag.id, cards.filter(candidate => candidate.tagIds?.includes(tag.id)))[0] || card;
        link.dataset.advertisingSuggestionRepresentative = first.id;
        const image = createPhotoMedia(first, locale, { suggestion: true });
        image.dataset.advertisingSuggestionImageLayer = "current";
        image.dataset.advertisingSuggestionPhoto = first.id;
        const label = document.createElement("span");
        label.className = "advertising-photo-view__suggestion-label";
        // Span ôm chữ để gạch chân hover dài đúng bằng dòng chữ (rule chung với portal, style.css).
        label.append(document.createElement("span"));
        link.append(image, label);
        links.append(link);
      });
      const previousLinks = suggestionNode.querySelector(".advertising-photo-view__suggestion-links");
      if (previousLinks) resizeObserver.unobserve(previousLinks);
      suggestionNode.replaceChildren(...[suggestionTitle, links].filter(Boolean));
      resizeObserver.observe(links);
      stopSuggestionSlides = mountSuggestionSlides(suggestionNode, {
        cards, isReduced: () => reduced, signal: controller.signal,
        createImage: card => createPhotoMedia(card, locale, { suggestion: true }),
      });
    }
    suggestionNode.querySelectorAll("[data-advertising-suggestion-tag]").forEach((link) => {
      const slot = suggestionSlots.find(({ tag }) => tag.id === link.dataset.advertisingSuggestionTag);
      if (!slot) return;
      link.setAttribute("aria-pressed", String(browse.tag === slot.tag.id));
      link.querySelector(".advertising-photo-view__suggestion-label > span").textContent = english ? slot.tag.labelEn : slot.tag.labelVi;
    });
    suggestionNode.hidden = suggestionSlots.length === 0;
    suggestionNode.dataset.advertisingRelatedItem = "advertising-suggestion";
    suggestionNode.dataset.rank = "0";
    suggestionNode.dataset.sourceOrder = "0";
  };
  const syncLocaleLinks = (browse) => {
    document.querySelectorAll("[data-language-option]").forEach((link) => {
      link.href = serializeAdvertisingBrowseLocation(link.href, browse, categories, pages).href;
    });
  };
  const clearRelatedCards = () => {
    cancelRelatedMotion();
    relatedMasonry?.destroy();
    relatedMasonry = null;
    relatedRendered.forEach((node) => {
      releaseMediaCard(node);
      node.remove();
    });
    relatedRendered.clear();
    relatedPositions.clear();
    relatedLayoutKey = "";
    relatedMeasuredGeometry = null;
  };
  // Card đã đặt kích thước theo relatedLayout nào; cùng layout thì cuộn không ghi lại.
  const relatedSized = new WeakMap();
  const ensureRelatedPhoto = (id) => {
    const placement = relatedLayout?.photoPlacements.find((entry) => entry.card.id === id);
    if (!placement || !relatedGrid) return null;
    let node = relatedRendered.get(id);
    if (!node) {
      node = createPhotoCard(placement.card, locale, handleMediaLoaded, true,
        relatedMediaById.get(id), (mediaId) => relatedMediaById.set(id, mediaId), syncCardSkeleton);
      relatedRendered.set(id, node);
      observeMediaCard(node);
      relatedGrid.append(node);
      setPlacementStyle(node, placement);
      node.dataset.advertisingRelatedItem = id;
    } else if (relatedSized.get(node) === relatedLayout) return node;
    relatedSized.set(node, relatedLayout);
    node.style.width = `${placement.pixelWidth}px`;
    sizeLazyImage(node, placement);
    node.style.height = `${placement.pixelHeight}px`;
    node.style.setProperty("--advertising-media-height", `${placement.mediaPixelHeight}px`);
    node.dataset.advertisingPlacementIndex = String(placement.index);
    node.setAttribute("role", "listitem");
    node.setAttribute("aria-posinset", String(placement.index + 1));
    node.setAttribute("aria-setsize", String(relatedLayout.layout.placements.length));
    return node;
  };
  const ensureSuggestionCard = () => {
    const placement = relatedLayout?.suggestionPlacement;
    if (!placement || !suggestionNode) return null;
    suggestionNode.hidden = false;
    suggestionNode.style.width = `${placement.pixelWidth}px`;
    suggestionNode.style.height = `${placement.pixelHeight}px`;
    suggestionNode.dataset.advertisingPlacementIndex = String(placement.index);
    suggestionNode.setAttribute("role", "listitem");
    suggestionNode.setAttribute("aria-posinset", String(placement.index + 1));
    suggestionNode.setAttribute("aria-setsize", String(relatedLayout.layout.placements.length));
    return suggestionNode;
  };
  const restoreRelatedDomOrder = () => {
    if (!relatedLayout || !relatedGrid) return;
    const focused = relatedGrid.contains(document.activeElement) ? document.activeElement : null;
    let cursor = relatedGrid.firstElementChild;
    for (const placement of relatedLayout.layout.placements) {
      const node = placement.card.kind === "suggestion" ? suggestionNode : relatedRendered.get(placement.card.id);
      if (!node) continue;
      if (node === cursor) cursor = cursor.nextElementSibling;
      else relatedGrid.insertBefore(node, cursor);
    }
    if (focused?.isConnected && document.activeElement !== focused) focused.focus({ preventScroll: true });
  };
  const relatedVisualCoordinates = () => {
    const rect = relatedGrid.getBoundingClientRect();
    const nodes = [...relatedRendered];
    if (relatedLayout?.suggestionPlacement && suggestionNode?.dataset.advertisingRelatedItem && !suggestionNode.hidden) {
      nodes.push([suggestionNode.dataset.advertisingRelatedItem, suggestionNode]);
    }
    return new Map(nodes.filter(([, node]) => !node.hidden)
      .map(([id, node]) => {
        const position = node.getBoundingClientRect();
        return [id, { x: position.left - rect.left, y: position.top - rect.top }];
      }));
  };
  const cancelRelatedMotion = () => {
    if (relatedMotionFrame) cancelAnimationFrame(relatedMotionFrame);
    if (relatedMotionTimer) clearTimeout(relatedMotionTimer);
    relatedMotionFrame = 0;
    relatedMotionTimer = 0;
    cancelMasonryTransitions(relatedMasonry || null);
  };
  const renderRelatedWindow = ({ animate = false, origins } = {}) => {
    if (!relatedLayout || !relatedGrid || photoView?.hidden) return;
    // Vào thẳng thì related card mount trong task riêng; scroll hoặc resize trước đó không được mount chúng khi chưa animate.
    if (!animate && (relatedMotionFrame || relatedMotionTimer || directEntryPhase)) return;
    const gridTop = relatedGrid.getBoundingClientRect().top + getLogicalScroll();
    const visible = getVisibleViewport();
    const windowed = getVirtualWindow(relatedLayout.layout, {
      overscan: visible.height,
      scrollTop: Math.max(0, getLogicalScroll() + visible.top - gridTop),
      viewportHeight: visible.height,
    });
    const normalKeep = new Set(windowed.items.map((placement) => placement.card.id));
    const suggestionId = relatedLayout.suggestionPlacement?.card.id;
    if (suggestionId && suggestionNode?.contains(document.activeElement)) normalKeep.add(suggestionId);
    const keepSuggestion = Boolean(suggestionId && normalKeep.has(suggestionId));
    const validPhotoIds = new Set(relatedLayout.photoPlacements.map((placement) => placement.card.id));
    const anchorId = browseHistory?.current?.detail?.anchorId;
    if (validPhotoIds.has(anchorId)) normalKeep.add(anchorId);
    for (const [id, node] of relatedRendered) {
      if (!node.contains(document.activeElement)) continue;
      if (validPhotoIds.has(id)) normalKeep.add(id);
      else photoInfo?.focus({ preventScroll: true });
    }
    for (const id of retainedPhotoIds) {
      if (validPhotoIds.has(id)) normalKeep.add(id);
    }
    const normalPhotoKeep = new Set([...normalKeep].filter((id) => id !== suggestionId));
    if (!animate
      && sameMembers(new Set(relatedRendered.keys()), normalPhotoKeep)
      && (!suggestionId || suggestionNode?.hidden === !keepSuggestion)) return;
    const motion = animate && !reduced;
    const keep = motion ? new Set([...relatedRendered.keys(), ...normalPhotoKeep]) : normalPhotoKeep;
    relatedPositions.clear();
    for (const placement of relatedLayout.layout.placements) relatedPositions.set(placement.card.id, { x: placement.x, y: placement.y });
    normalPhotoKeep.forEach(ensureRelatedPhoto);
    if (keepSuggestion) ensureSuggestionCard();
    // Chưa đặt trong related grid (pha primary của direct-entry) thì nó ẩn cho đến khi solver đặt.
    else if (suggestionNode) suggestionNode.hidden = suggestionId || suggestionNode.parentElement === relatedGrid ? true : suggestionSlots.length === 0;
    for (const [id, node] of relatedRendered) {
      if (keep.has(id)) {
        node.hidden = !normalKeep.has(id);
        if (!relatedPositions.has(id)) relatedPositions.set(id, origins?.get(id) || { x: 0, y: 0 });
      } else {
        releaseMediaCard(node);
        node.remove();
        relatedRendered.delete(id);
      }
    }
    for (const [id, node] of relatedRendered) {
      const destination = relatedPositions.get(id);
      if (!destination || node.hidden) continue;
      const columnHead = destination.x < relatedLayout.primary.width
        ? relatedLayout.primary.height + relatedLayout.primary.gap : 0;
      const origin = motion ? origins?.get(id) || { x: destination.x, y: columnHead } : destination;
      // Chỉ ghi khi đổi: cuộn related ghi lại mọi card đang mount ở mỗi lần cửa sổ đổi.
      const left = `${origin.x}px`;
      const top = `${origin.y}px`;
      if (node.style.left !== left) node.style.left = left;
      if (node.style.top !== top) node.style.top = top;
      if (node.style.transform !== "none") node.style.transform = "none";
    }
    if (keepSuggestion && suggestionNode) {
      const destination = relatedPositions.get(suggestionId);
      const origin = motion ? origins?.get(suggestionId) || destination : destination;
      suggestionNode.style.left = `${origin.x}px`;
      suggestionNode.style.top = `${origin.y}px`;
      suggestionNode.style.transform = "none";
    }
    restoreRelatedDomOrder();
    // Không motion thì vị trí đã ghi ở trên; bỏ Masonry như placeRendered, vì layout() đo lại mọi card (getSize)
    // trong lúc cuộn related, long task trên phone Android (decision phone-frame-budget).
    if (!motion) {
      relatedGrid.style.height = `${relatedPixelHeight}px`;
      return;
    }
    void relatedGrid.offsetHeight;
    relatedMotionFrame = requestAnimationFrame(() => {
      relatedMotionFrame = 0;
      if (!relatedMasonry) relatedMasonry = createMasonry(relatedGrid, relatedPositions, () => relatedPixelHeight, {
        itemSelector: "[data-advertising-related-item]",
        getId: (node) => node.dataset.advertisingRelatedItem,
      });
      relatedMasonry.options.layoutInstant = false;
      relatedMasonry.options.transitionDuration = "0.4s";
      relatedMasonry.reloadItems();
      relatedMasonry.items.forEach((item) => { item.isLayoutInstant = item.element.hidden; });
      relatedMasonry.layout();
      relatedMotionTimer = setTimeout(() => {
        relatedMotionTimer = 0;
        cancelMasonryTransitions(relatedMasonry);
        renderRelatedWindow();
      }, 400);
    });
  };
  const relatedTypographyKey = () => [document.documentElement, photoInfo, photoDescription]
    .map((node) => node ? getComputedStyle(node).fontSize : "").join(":");
  const layoutRelated = (browse) => {
    if (!relatedGrid || !photoPrimary || !photoCanvas) return;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = getLayoutViewportHeight();
    const typographyKey = relatedTypographyKey();
    const nextLayoutKey = `${browse.seed}:${browse.photo}:${activePrimaryMediaId}:${browse.tag || "all"}:${locale}:${viewportWidth}:${viewportHeight}:${typographyKey}`;
    if (nextLayoutKey === relatedLayoutKey) {
      renderRelatedWindow();
      return;
    }
    const origins = relatedLayoutKey && directEntryPhase !== "primary" ? relatedVisualCoordinates() : undefined;
    cancelRelatedMotion();
    const { outer, interCardGap } = advertisingSpacing(viewportWidth);
    const columns = columnsForWidth(viewportWidth);
    const suggestionInRelated = columns <= 3;
    const gridWidth = viewportWidth - (2 * outer);
    const suggestionWidth = (gridWidth - interCardGap * (columns - 1)) / columns;
    photoView.style.setProperty("--gutter", `${outer}px`);
    // Header trên detail luôn thu gọn: padding 10px trên, dưới và viền 1px (advertising-detail R10).
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
    photoView.dataset.advertisingPhotoLayout = suggestionInRelated ? "pinterest" : "split";
    let suggestionHeight = 0;
    // Trong related grid, suggestion là một related card: pha primary nhường nó cho pha solver.
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
    let needsDescriptionIndicator = false;
    // Solver hỏi chiều cao tự nhiên rồi chiều cao tối thiểu ở cùng bề rộng: đo một lần cho cả hai, mỗi lần đo
    // ép một lượt style và layout của info (decision phone-frame-budget).
    const infoMeasures = new Map();
    const measureInfoOnce = (width, mode) => {
      photoView.dataset.advertisingPhotoLayout = mode;
      const previousWidth = photoInfo.style.width;
      const previousHeight = photoInfo.style.height;
      const previousText = photoDescription.textContent;
      const previousIndicatorHidden = photoDescriptionIndicator.hidden;
      try {
        photoInfo.style.width = `${width}px`;
        photoInfo.style.height = "auto";
        photoDescription.textContent = descriptionSource;
        photoDescriptionIndicator.hidden = true;
        // Đổi ngôn ngữ chạy transition scale(0.9) trên main: rect co theo scale nên chia lại bằng bề rộng đã đặt,
        // nếu không info thấp hơn 10% và mô tả bị cắt.
        const infoRect = photoInfo.getBoundingClientRect();
        const naturalHeight = Math.ceil(infoRect.width ? infoRect.height * width / infoRect.width : infoRect.height);
        const controls = [...photoInfo.children].filter(node => node !== photoDescriptionPager
          && !node.hidden);
        const controlsHeight = controls.reduce((sum, node) => {
          const style = getComputedStyle(node);
          return sum + node.offsetHeight + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
        }, 0);
        const lineHeight = parseFloat(getComputedStyle(photoDescription).lineHeight);
        const gap = parseFloat(getComputedStyle(photoInfo).rowGap) || 0;
        return {
          naturalHeight,
          floor: Math.ceil(controlsHeight + lineHeight + controls.length * gap) + 1,
          indicatorHeight: Math.ceil(parseFloat(getComputedStyle(photoDescriptionIndicator).lineHeight)) + gap,
        };
      } finally {
        photoInfo.style.width = previousWidth;
        photoInfo.style.height = previousHeight;
        photoDescription.textContent = previousText;
        photoDescriptionIndicator.hidden = previousIndicatorHidden;
      }
    };
    const measureInfo = (width, mode, basePrimary = null) => {
      if (!photoInfo) return 0;
      const key = `${width}:${mode}`;
      if (!infoMeasures.has(key)) infoMeasures.set(key, measureInfoOnce(width, mode));
      else photoView.dataset.advertisingPhotoLayout = mode;
      const { naturalHeight, floor, indicatorHeight } = infoMeasures.get(key);
      if (!basePrimary) return naturalHeight;
      needsDescriptionIndicator = naturalHeight > Math.max(basePrimary.descriptionHeight, floor);
      return floor + (needsDescriptionIndicator ? indicatorHeight : 0);
    };
    const expandStyle = photoExpand ? getComputedStyle(photoExpand) : null;
    const imageControlMinimum = expandStyle ? Math.ceil(Math.max(photoExpand.offsetHeight,
      2 * parseFloat(expandStyle.lineHeight) + parseFloat(expandStyle.getPropertyValue("--image-action-edge-padding")))
      + 2 * (parseFloat(expandStyle.bottom) || 0)) : 0;
    relatedLayout = compileAdvertisingRelatedLayout({
      cards: directEntryPhase === "primary" ? cards.filter((card) => card.id === browse.photo)
        : directEntryPhase === "warm" ? cards.filter((card, index) => index < 12 || card.id === browse.photo) : cards,
      categoryOrder, columns,
      datasetVersion: artifact.datasetVersion, heroId: browse.photo,
      layoutViewportWidth: viewportWidth, viewportHeight, headerHeight,
      safeTop: parseFloat(viewStyle.getPropertyValue("--advertising-safe-top")) || 0,
      safeBottom: parseFloat(viewStyle.getPropertyValue("--advertising-safe-bottom")) || 0,
      settings, suggestionCard, tag: browse.tag,
      seed: browse.seed,
      primaryMedia: cards.find((card) => card.id === browse.photo)?.mediaItems?.find((item) => item.id === activePrimaryMediaId),
      measureDescriptionHeight: measureInfo,
      measureDescriptionMinimumHeight: measureInfo,
      minimumImageZoneHeight: imageControlMinimum,
      compile: relatedCompile,
    });
    relatedLayoutKey = nextLayoutKey;
    const primary = relatedLayout.primary;
    photoView.dataset.advertisingPhotoLayout = primary.mode;
    photoView.dataset.advertisingPrimarySpan = String(primary.span);
    photoView.dataset.advertisingPhotoGlass = String(primary.hasContainOverflow);
    for (const [key, value] of Object.entries({
      top: primary.top, gap: primary.gap, "primary-width": primary.width, "primary-height": primary.height,
      "image-width": primary.imageWidth, "image-height": primary.imageHeight,
      "image-zone-width": primary.imageZoneWidth, "image-zone-height": primary.imageZoneHeight,
      "description-width": primary.descriptionWidth, "description-height": primary.descriptionHeight,
      "internal-gap": primary.internalGap,
    })) photoView.style.setProperty(`--advertising-photo-${key}`, `${value}px`);
    relatedMeasuredGeometry = { viewportWidth, viewportHeight, typographyKey };
    relatedGrid.dataset.advertisingRelatedColumns = String(relatedLayout.layout.columns);
    const height = Math.max(primary.height, relatedLayout.layout.totalPixelHeight);
    relatedGrid.style.setProperty("--advertising-photo-related-height", `${height}px`);
    photoCanvas.style.setProperty("--advertising-photo-canvas-height", `${height}px`);
    relatedPixelHeight = height;
    photoDescriptionIndicator.hidden = !needsDescriptionIndicator;
    if (directEntryPhase === "related" || directEntryPhase === "warm") {
      // Đã đo nhưng chưa đặt: giữ nó ngoài mọi frame vẽ trước task mount.
      if (suggestionInRelated && suggestionNode) suggestionNode.hidden = true;
      return;
    }
    if (directEntryPhase === "primary") {
      // Ẩn, chưa đặt: task mount animate chúng từ vị trí gốc.
      relatedRendered.forEach((node) => { node.hidden = true; });
      if (suggestionNode?.parentElement === relatedGrid) suggestionNode.hidden = true;
      return;
    }
    paginateDescription();
    renderRelatedWindow({ animate: true, origins });
  };
  // Primary đổi bên trong frame của chính nó (loading-glass-and-page-entry R4, R5): photo đang tải
  // hiện skeleton ngay, photo đã cache thì crossfade lên photo đang hiển thị.
  const heroFrame = photoImage?.parentElement;
  let primaryReveal = null;
  const settlePrimaryReveal = () => {
    if (!primaryReveal) return;
    const { frame, animations, glass } = primaryReveal;
    primaryReveal = null;
    animations.forEach((animation) => animation.cancel());
    glass?.remove();
    if (frame) detachLoadingSkeleton(frame);
    delete heroFrame.dataset.advertisingPhotoLoading;
    heroFrame.removeAttribute("aria-busy");
  };
  // Primary chạy đúng reveal của card tải chậm (loading-glass-and-page-entry R4): Kính ba bậc hiện trên skeleton, dưới
  // Kính skeleton mờ đi còn ảnh và nền vùng dư hiện lên, rồi Kính tan, cùng CARD_REVEAL_MS.
  const playPrimaryReveal = (reveal, incoming) => {
    if (primaryReveal !== reveal) return;
    // Ảnh decode xong trước khi photo view hiện (mở từ grid): chờ để Kính đo được hero.
    if (photoView.hidden) {
      requestAnimationFrame(() => playPrimaryReveal(reveal, incoming));
      return;
    }
    if (reduced) {
      settlePrimaryReveal();
      return;
    }
    // Bỏ trạng thái loading cùng task với animation: tách ra thì giữa hai task có frame ảnh mới hiện đủ
    // rồi mới chạy reveal từ 0 (lỗi chớp khi Back, Forward).
    delete heroFrame.dataset.advertisingPhotoLoading;
    heroFrame.removeAttribute("aria-busy");
    reveal.glass = revealGlass(heroFrame);
    reveal.animations = [...crossfadeLayers([reveal.frame], incoming, CARD_REVEAL_MS),
      ...playGlassReveal(reveal.glass, CARD_REVEAL_MS)];
    Promise.all(reveal.animations.map(({ finished }) => finished))
      .then(() => primaryReveal === reveal && settlePrimaryReveal(), () => {});
  };
  const renderPrimaryMedia = (record, item) => {
    const english = locale === "en";
    const video = item.kind === "video";
    const source = video ? null : tierSource(photoImage, item.src, item.width);
    const changed = !video && photoImage.getAttribute("src") !== source;
    if (changed || video) settlePrimaryReveal();
    activePrimaryMediaId = item.id;
    photoView.dataset.advertisingActiveMediaId = item.id;
    photoVideo.pause();
    photoVideo.muted = true;
    photoVideo.defaultMuted = true;
    photoVideo.hidden = !video;
    photoImage.hidden = video;
    photoExpand.hidden = video;
    photoAudioToggle.hidden = !video || item.hasAudio === false;
    if (video) {
      photoVideo.width = item.width;
      photoVideo.height = item.height;
      photoVideo.poster = item.posterSrc;
      photoVideo.setAttribute("aria-label", english ? item.altEn : item.altVi);
      if (photoVideo.getAttribute("src") !== item.src) photoVideo.src = item.src;
      void photoVideo.play().catch(() => {});
    } else {
      photoVideo.removeAttribute("src");
      photoVideo.load();
      photoImage.width = item.width;
      photoImage.height = item.height;
      photoImage.alt = english ? item.altEn : item.altVi;
      photoImage.loading = "eager";
      photoImage.fetchPriority = "high";
      photoImage.src = source;
    }
    updateAudioLabel();
    if (photoBackground) {
      // Markup để lazy để placeholder không tải khi detail ẩn; gán nguồn thật rồi mới eager, như ảnh chính.
      photoBackground.src = video ? item.posterSrc : source;
      photoBackground.loading = "eager";
      photoBackground.dataset.advertisingPhotoId = record.id;
    }
    if (changed) {
      // Ảnh có sẵn hay chưa đều chạy motion card tải chậm (loading-glass-and-page-entry R4): ảnh và nền cũ ẩn ngay,
      // skeleton phủ khung tới khi ảnh mới decode xong; ảnh có sẵn chỉ làm skeleton đứng ngắn hơn.
      const reveal = { frame: attachLoadingSkeleton(heroFrame, item.id, photoVideo.nextSibling), animations: [], glass: null };
      primaryReveal = reveal;
      heroFrame.setAttribute("aria-busy", "true");
      heroFrame.dataset.advertisingPhotoLoading = "true";
      // decode() reject khi lỗi hoặc khi nguồn mới hơn thay thế nguồn này.
      photoImage.decode().then(() => playPrimaryReveal(reveal, [photoImage, photoBackground].filter(Boolean)),
        () => primaryReveal === reveal && settlePrimaryReveal());
    }
    photoViewer.setRecord(video ? null : { ...record, media: item });
    photoMediaThumbs?.querySelectorAll("[data-advertising-photo-media-select]").forEach((button) => {
      button.setAttribute("aria-current", String(button.dataset.advertisingPhotoMediaSelect === item.id));
    });
  };
  const renderPrimaryThumbs = (record) => {
    const items = record.mediaItems || [];
    const authored = items.length > 1 || items.some((item) => item.id !== record.id
      || item.kind !== "image" || item.src !== record.media.src);
    if (!authored) {
      photoMediaThumbs?.remove();
      photoMediaThumbs = null;
      return;
    }
    const english = locale === "en";
    if (!photoMediaThumbs) {
      photoMediaThumbs = document.createElement("div");
      photoMediaThumbs.className = "advertising-photo-view__media-thumbs";
      photoMediaThumbs.dataset.advertisingPhotoMediaThumbs = "";
      photoMediaThumbs.setAttribute("role", "group");
      photoDescriptionPager.before(photoMediaThumbs);
    }
    photoMediaThumbs.setAttribute("aria-label", english ? "Product media" : "Media sản phẩm");
    photoMediaThumbs.replaceChildren();
    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.advertisingPhotoMediaSelect = item.id;
      button.setAttribute("aria-label", english
        ? `Show ${item.kind === "video" ? "video" : "image"} ${index + 1} of ${items.length}: ${item.altEn}`
        : `Xem ${item.kind === "video" ? "video" : "ảnh"} ${index + 1} trên ${items.length}: ${item.altVi}`);
      const image = document.createElement("img");
      image.loading = "lazy";
      const thumbSrcset = item.kind === "video" ? "" : responsiveSrcset(item.src, item.width);
      if (thumbSrcset) {
        image.sizes = tierAutoSizes(image, "auto, 25vw");
        image.srcset = thumbSrcset;
      }
      image.src = item.kind === "video" ? item.posterSrc : item.src;
      image.alt = "";
      button.append(image);
      if (item.kind === "video") {
        button.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>');
      }
      button.addEventListener("click", () => {
        if (activePrimaryMediaId === item.id) return;
        renderPrimaryMedia(record, item);
        browseHistory.captureDetail({ ...browseHistory.current.detail, mediaId: item.id, scrollY: getLogicalScroll() });
        browseHistory.persistCurrent();
        relatedLayoutKey = "";
        layoutRelated(browseHistory.current);
      });
      photoMediaThumbs.append(button);
    });
  };
  photoAudioToggle?.addEventListener("click", () => {
    if (!photoVideo || photoVideo.hidden || photoAudioToggle.hidden) return;
    if (photoVideo.muted || photoVideo.volume === 0) {
      if (photoVideo.volume === 0) photoVideo.volume = 1;
      photoVideo.muted = false;
      if (photoVideo.paused) void photoVideo.play().catch(() => {});
    } else photoVideo.muted = true;
    updateAudioLabel();
  }, { signal: controller.signal });
  const updateAudioLabel = () => {
    const label = photoVideo.muted || photoVideo.volume === 0 ? locale === "en" ? "Unmute" : "Bật tiếng"
      : locale === "en" ? "Mute" : "Tắt tiếng";
    photoAudioToggle.textContent = label;
    photoAudioToggle.setAttribute("aria-label", label);
  };
  photoVideo?.addEventListener("volumechange", updateAudioLabel, { signal: controller.signal });
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
    clearCtaSkeleton();
    syncLocaleLinks(browse);
    photoView.dataset.advertisingPhotoId = record.id;
    photoImage.dataset.advertisingPhotoId = record.id;
    rendered.forEach((card) => syncJustViewedMarker(card, locale, false));
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
    browseHistory.captureDetail({ ...browse.detail, mediaId: selected.id });
    descriptionSource = (english ? record.descriptionEn : record.descriptionVi) || "";
    descriptionPageIndex = 0;
    if (photoDescription) photoDescription.textContent = descriptionSource;
    const category = categoryById.get(record.category);
    if (photoCategory) photoCategory.textContent = english ? category?.titleEn : category?.titleVi;
    renderSuggestionLinks(browse, english);
    if (reveal) revealPhotoView(browse, generation);
    return true;
  };
  // Hiện photo view rồi layout và khôi phục scroll; tách khỏi renderPhoto để mở từ grid dựng DOM ở task chạm card
  // và hiện ở task sau (decision phone-frame-budget).
  const revealPhotoView = (browse, generation) => {
    // Ẩn grid trước khi đổi class body: style của class mới không phải tính lại cho cả grid (CPU 4x: 8ms thay vì 15ms).
    if (gridSection) gridSection.hidden = true;
    document.body.classList.add("is-advertising-photo");
    document.body.dataset.advertisingPhotoActive = "true";
    // Ghi trước khi hiện các giá trị layoutRelated sẽ ghi, để lần layout đầu của detail đã gồm chúng
    // và không bị ép style lần hai (decision phone-frame-budget).
    const layoutWidth = document.documentElement.clientWidth;
    photoView.style.setProperty("--gutter", `${advertisingSpacing(layoutWidth).outer}px`);
    photoView.dataset.advertisingPhotoLayout ??= columnsForWidth(layoutWidth) <= 3 ? "pinterest" : "split";
    photoView.hidden = false;
    layoutRelated(browse);
    relatedRendered.forEach((card, id) => syncJustViewedMarker(card, locale, lastClosedPhotoId === id));
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
  // Mỗi pha là một task riêng để không pha nào chặn input quá 50ms trên phone Android (docs/specs/advertising-detail.md R7):
  // primary không có related, warm-up solver trên vài card, solver đầy đủ, rồi mount card.
  // Scroll được khôi phục cần toàn bộ chiều cao trong một lượt.
  const nextTask = () => new Promise((resolve) => setTimeout(resolve));
  // Task ngay sau frame: style và layout còn bẩn của pha trước đã tính trong frame, không bị ép lại trong task mount.
  const afterNextFrame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
  // Solver đầy đủ của related là long task trên phone Android (decision phone-frame-budget): chạy layoutRelated với compile
  // giả, mỗi lần compile còn thiếu thì tính trên Worker rồi chạy lại; số đo DOM vẫn ở main thread. Trả false khi bị
  // thay; Worker lỗi thì compile đồng bộ.
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
        relatedCompile = compileAdvertisingProductLayout;
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
    // Chỉ photo khác mới hoãn; đổi tag hoặc locale giữ related card trên màn hình.
    const deferRelated = browse.photo !== activePhotoId && !browse.detail.scrollY && !browse.detail.anchorId;
    const origins = deferRelated && relatedLayoutKey ? relatedVisualCoordinates() : undefined;
    // Mở từ grid: dựng DOM detail đang ẩn, task sau mới hiện và layout.
    const fromGrid = deferRelated && photoView?.hidden;
    // Bấm card grid: task của cú bấm chỉ ghi history; dựng primary ở task sau để task input dưới 50ms trên phone Android.
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
    for (const phase of deferRelated ? ["warm", "pages", "related", ""] : []) {
      // Mount related đọc vị trí grid: chờ frame để không gộp style của pha related vào task mount (task 50-59ms trên A04s).
      await (phase ? nextTask() : afterNextFrame());
      if (generation !== detailRenderGeneration || controller.signal.aborted || !activePhotoId) return;
      // Phân trang ép một layout mỗi probe, nên nó có task riêng: gộp với warm thành task 55ms trên A05s cũ.
      if (phase === "pages") {
        paginateDescription();
        continue;
      }
      directEntryPhase = phase;
      if (phase === "related") {
        if (!await layoutRelatedInWorker(browseHistory.current, generation)) return;
      } else if (phase) {
        relatedLayoutKey = "";
        layoutRelated(browseHistory.current);
      } else {
        renderRelatedWindow({ animate: true, origins });
        // Báo layout sau motion 400ms của related: gộp vào frame Masonry và LazySizes của task mount thì các lượt đo
        // của motion.js ép style còn bẩn, frame 50-120ms trên A04s (decision phone-frame-budget).
        setTimeout(() => window.dispatchEvent(new CustomEvent("site:layout")), 400);
      }
    }
  };
  const restoreGridEntry = (browse, reason) => {
    const previousPhotoId = activePhotoId;
    const generation = ++detailRenderGeneration;
    photoViewer.close({ restoreFocus: false });
    settlePrimaryReveal();
    if (previousPhotoId) lastClosedPhotoId = previousPhotoId;
    rendered.forEach((card, id) => syncJustViewedMarker(card, locale, lastClosedPhotoId === id));
    activePhotoId = null;
    activePrimaryMediaId = null;
    photoVideo?.pause();
    clearRelatedCards();
    syncLocaleLinks(browse);
    if (photoView) delete photoView.dataset.advertisingPhotoId;
    if (photoView) delete photoView.dataset.advertisingPhotoLayout;
    if (photoView) delete photoView.dataset.advertisingPhotoGlass;
    if (photoImage) delete photoImage.dataset.advertisingPhotoId;
    photoView && (photoView.hidden = true);
    if (gridSection) {
      gridSection.hidden = false;
      // Ép layout ngay: bỏ content-visibility: hidden của grid rồi thêm card trong cùng task, Chromium có lúc để
      // card không có box (vào thẳng ?photo= rồi bấm navbar), nên rect đo ra 0, không cuộn và focus tới card.
      void gridSection.offsetHeight;
    }
    document.body.classList.remove("is-advertising-photo");
    delete document.body.dataset.advertisingPhotoActive;
    const focusId = browse.grid.focusId;
    if (browse.category !== filter) setActiveFilter(browse.category);
    if (!geometry) measure();
    const node = focusId ? ensurePhoto(focusId) : null;
    if (node && browse.grid.mediaId) {
      gridMediaById.set(focusId, browse.grid.mediaId);
      node.advertisingSetMediaId?.(browse.grid.mediaId);
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
    const link = focusId ? rendered.get(focusId)?.querySelector("a") : null;
    link?.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      if (generation !== detailRenderGeneration || controller.signal.aborted) return;
      window.dispatchEvent(new CustomEvent("site:layout"));
    });
  };
  // Chrome âm thầm bỏ các lần ghi history vượt 200 mỗi 10 s, làm mất các push photo sau một lần scroll.
  // Scroll được ghi tối đa mỗi 300 ms; lần ghi đang chờ bị bỏ khi entry đổi.
  let persistTimer = 0;
  // Push đang chờ của một lần tap related (R7); scroll không được ghi cho đến khi nó hạ cánh.
  let relatedOpenTimer = 0;
  controller.signal.addEventListener("abort", () => clearTimeout(relatedOpenTimer), { once: true });
  // Lần ghi bị throttle có thể bỏ lỡ scroll cuối trước Back/Forward; nhớ nó theo từng entry Barba.
  const entryScroll = new Map();
  const entryIndex = () => window.history.state?.index;
  const browseHistory = createAdvertisingBrowseHistoryController({
    cards,
    categories,
    pages,
    tagRegistry: artifact.tagRegistry || [],
    barbaHistory: window.barba?.history,
    browserHistory: window.history,
    restoredHistoryState: startupHistory?.state,
    historyFallback: startupHistory?.historyFallback === true,
    softNavigation,
    getHref: () => window.location.href,
    getLogicalScroll,
    onApply({ action, browse, reason }) {
      clearTimeout(persistTimer);
      persistTimer = 0;
      if (action === "push") entryScroll.delete(entryIndex());
      if (action === "pop" && entryScroll.has(entryIndex())) {
        const scrollY = entryScroll.get(entryIndex());
        browse = browse.photo
          ? { ...browse, detail: { ...browse.detail, scrollY } }
          : { ...browse, grid: { ...browse.grid, scrollY } };
      }
      // Mở hoặc đóng photo và Back/Forward bắt đầu một trạng thái trang mới: frame vẽ lại (skeleton R3).
      resetSkeletonAssignments();
      // showPhoto và restoreGridEntry tự đồng bộ link locale.
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
    getCardLink: (id) => rendered.get(id)?.querySelector("a") || null,
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
    const visualSlots = [...rendered.entries()]
      .filter(([, node]) => !node.hidden)
      .map(([id]) => visualOrigins?.get(id) || positions.get(id))
      .filter(Boolean)
      .sort((left, right) => left.y - right.y || left.x - right.x);
    for (const [id, node] of rendered) {
      const position = visualOrigins?.get(id) || positions.get(id);
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
    if (layoutFrame || performance.now() < motionUntil) {
      pendingScroll = true;
      return;
    }
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      // Resize ở cuối trang kẹp scroll ngay khi grid đổi chiều cao, sau khi frame này đã được hẹn; đặt card tức thì
      // lúc chúng đang trượt làm card bay lệch (vòng 26), nên hoãn tới khi trượt xong như scroll trong lúc chuyển.
      if (layoutFrame || performance.now() < motionUntil) {
        pendingScroll = true;
        return;
      }
      renderWindow();
      renderRelatedWindow();
      // Khung vào ra layout viewport đã do skeletonObserver báo; chạy mỗi frame cuộn tốn khoảng 10ms trên A05s cũ.
      // Chỉ khi pinch-zoom, vùng thấy (visual viewport) mới lệch khỏi vùng IntersectionObserver đo.
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
  const updateVisualScroll = (event) => {
    const y = Number(event.detail?.y);
    if (!Number.isFinite(y)) return;
    currentVisualY = Math.max(0, y);
    usesVisualScroll = true;
    syncCtaParallax();
    scheduleScroll();
    scheduleBrowsePersistence();
    renderRelatedWindow();
  };
  const updateNativeScroll = () => {
    if (usesVisualScroll && window.scrollY === 0) return;
    currentVisualY = window.scrollY;
    usesVisualScroll = false;
    scheduleScroll();
    scheduleBrowsePersistence();
    // Ghi transform sau mọi lần đọc scroll, nếu không lần đọc kế tiếp ép style recalc giữa scroll event.
    syncCtaParallax();
  };
  const scheduleResize = () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      const viewportHeight = getLayoutViewportHeight();
      const viewportWidth = document.documentElement.clientWidth;
      if (activePhotoId) {
        // Detail dựng sẵn nhưng còn ẩn (mở từ grid): task hiện detail tự layout; đo lúc ẩn chỉ ra cỡ 0 và tốn một frame.
        if (photoView?.hidden) return;
        const geometryAlreadyMeasured = relatedMeasuredGeometry
          && relatedMeasuredGeometry.viewportHeight === viewportHeight
          && relatedMeasuredGeometry.viewportWidth === viewportWidth
          && relatedMeasuredGeometry.typographyKey === relatedTypographyKey();
        if (geometryAlreadyMeasured) {
          renderRelatedWindow();
          return;
        }
        layoutRelated(browseHistory.current);
        window.dispatchEvent(new CustomEvent("site:layout"));
        return;
      }
      // Mount còn chờ geometry từ Worker và sẽ tự measure.
      if (geometryPending) return;
      if (grid.clientWidth !== lastMeasuredGridWidth || document.documentElement.clientWidth !== lastLayoutViewportWidth) {
        const origins = visualCoordinates();
        // Card chưa mount (ngoài virtual window) xuất phát từ chỗ của nó trong layout cũ, không từ đầu grid,
        // nên cả masonry trượt như một khối (đo trên PC, vòng 28).
        geometry?.placements.forEach(({ card, x, y, pixelWidth: w, pixelHeight: h }) => origins.has(card.id) || origins.set(card.id, { x, y, w, h }));
        cancelMotion();
        // Đang kéo cạnh cửa sổ (relayout bề rộng liên tiếp dưới 250ms): đặt thẳng vị trí mỗi frame, không trượt. Mỗi lần
        // relayout tốn khoảng 100ms nên trượt 0.4s bị khởi động lại liên tục, item kẹt giữa layout cũ và mới, chồng
        // nhau (đo trên PC, vòng 44). Resize đơn lẻ vẫn trượt.
        const now = performance.now();
        const dragging = now - lastResizeAt < 250;
        lastResizeAt = now;
        if (dragging) cancelCtaSlides(ctaSlideNodes());
        measure({ animate: !dragging, origins });
      } else if (!ctaGeometryHash || viewportHeight !== lastCtaViewportHeight) {
        renderCtaSkeleton();
        window.dispatchEvent(new CustomEvent("site:layout"));
      }
      // Thanh địa chỉ ẩn, hiện chỉ đổi innerHeight (batch theo svh không dựng lại): parallax CTA phải tính lại theo innerHeight mới.
      syncCtaParallax();
      scheduleScroll();
    });
  };

  grid.addEventListener("click", (event) => {
    const link = event.target.closest("[data-advertising-card] > a");
    if (!link || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const card = link.closest("[data-advertising-card]");
    if (!card) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const rect = card.getBoundingClientRect();
    const activeId = card.dataset.advertisingActiveMediaId;
    browseHistory.captureGrid({
      anchorOffset: rect.top,
      focusId: card.dataset.advertisingCard,
      mediaId: activeId || null,
      scrollY: getLogicalScroll(),
      viewportWidth: document.documentElement.clientWidth,
    });
    // Scroll ngay trước tap chưa kịp vào entryScroll (scroll event đến frame sau); Back phải về đúng Y lúc tap.
    entryScroll.delete(entryIndex());
    browseHistory.openPhoto(card.dataset.advertisingCard, activeId || null);
  }, { signal: controller.signal });
  grid.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !geometry) return;
    const item = event.target instanceof Element ? event.target.closest("[data-advertising-card]") : null;
    if (!item || !grid.contains(item)) return;
    const currentIndex = geometry.placements.findIndex((placement) => placement.card.id === item.dataset.advertisingCard);
    const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= geometry.placements.length) return;
    const nextPlacement = geometry.placements[nextIndex];
    const nextNode = rendered.get(nextPlacement.card.id);
    if (nextNode && !nextNode.hidden) return;
    event.preventDefault();
    focusVirtualPlacement(nextPlacement);
  }, { signal: controller.signal });

  const onRailClick = (event) => {
    const control = event.target.closest("[data-advertising-filter], [data-advertising-product]");
    if (!control || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const nextFilter = control.dataset.advertisingFilter ?? control.dataset.advertisingProduct;
    if (nextFilter === filter) return;
    if (grid.contains(document.activeElement)) control.focus();
    browseHistory.replaceCategory(nextFilter);
    setActiveFilter(nextFilter, { animate: true });
  };
  filters.addEventListener("click", onRailClick, { signal: controller.signal });
  chipGroups.forEach((group) => group.addEventListener("click", onRailClick, { signal: controller.signal }));
  // Chrome không scroll link bị che một phần khi focus; giữ filter đang focus nguyên vẹn trên rail mobile.
  filters.addEventListener("focusin", (event) => {
    event.target.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, { signal: controller.signal });
  relatedGrid?.addEventListener("click", (event) => {
    const link = event.target.closest("[data-advertising-related-card] > a");
    if (!link || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const node = link.closest("[data-advertising-related-card]");
    const nextId = node?.dataset.advertisingRelatedCard;
    if (!nextId || nextId === browseHistory.current.photo) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const activeId = node.dataset.advertisingActiveMediaId;
    const rect = node.getBoundingClientRect();
    browseHistory.captureDetail({
      anchorId: nextId,
      anchorOffset: rect.top,
      mediaId: activePrimaryMediaId,
      scrollY: getLogicalScroll(),
      viewportWidth: document.documentElement.clientWidth,
    });
    // Task tap chỉ lưu anchor; entry mới và primary của nó đến ở task kế tiếp (R7).
    // Focus rời related card ngay bây giờ, khi style còn sạch, nên không ép recalc.
    if (relatedGrid.contains(document.activeElement)) photoInfo?.focus({ preventScroll: true });
    // Back trả về Y của lần tap, nên scroll còn đang lắng đến lúc push không ghi đè nó.
    if (entryIndex() !== undefined) entryScroll.set(entryIndex(), getLogicalScroll());
    const fromPhoto = browseHistory.current.photo;
    clearTimeout(relatedOpenTimer);
    relatedOpenTimer = setTimeout(() => {
      relatedOpenTimer = 0;
      if (!controller.signal.aborted && browseHistory.current.photo === fromPhoto) browseHistory.openPhoto(nextId, activeId || null);
    });
  }, { signal: controller.signal });
  relatedGrid?.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !relatedLayout) return;
    const item = event.target instanceof Element ? event.target.closest("[data-advertising-related-card]") : null;
    if (!item || !relatedGrid.contains(item)) return;
    const placements = relatedLayout.photoPlacements;
    const currentIndex = placements.findIndex((placement) => placement.card.id === item.dataset.advertisingRelatedCard);
    const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= placements.length) return;
    const nextId = placements[nextIndex].card.id;
    const nextNode = relatedRendered.get(nextId);
    if (nextNode) return;
    event.preventDefault();
    ensureRelatedPhoto(nextId)?.querySelector("a")?.focus({ preventScroll: true });
    restoreRelatedDomOrder();
  }, { signal: controller.signal });
  photoDescriptionIndicator?.addEventListener("click", (event) => {
    const dot = event.target.closest("[data-advertising-photo-description-dot]");
    if (dot) showDescriptionPage(Number(dot.dataset.advertisingPhotoDescriptionDot));
  }, { signal: controller.signal });
  photoDescriptionPager?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (turnDescriptionPage(event.key === "ArrowRight" ? 1 : -1)) event.preventDefault();
  }, { signal: controller.signal });
  photoDescriptionPager?.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 18) return;
    if (turnDescriptionPage(event.deltaX > 0 ? 1 : -1)) event.preventDefault();
  }, { passive: false, signal: controller.signal });
  photoDescriptionPager?.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    descriptionPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
  }, { signal: controller.signal });
  photoDescriptionPager?.addEventListener("pointermove", (event) => {
    if (!descriptionPointer || descriptionPointer.id !== event.pointerId) return;
    const deltaX = event.clientX - descriptionPointer.x;
    const deltaY = event.clientY - descriptionPointer.y;
    if (!descriptionPointer.horizontal && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
      descriptionPointer.horizontal = true;
      try {
        photoDescriptionPager.setPointerCapture?.(event.pointerId);
      } catch {
        // Chuỗi pointer tổng hợp và pointer bị cancel không sở hữu capture.
      }
    }
    if (descriptionPointer.horizontal) event.preventDefault();
  }, { signal: controller.signal });
  const clearDescriptionPointer = (event, { turnPage = false } = {}) => {
    if (!descriptionPointer || descriptionPointer.id !== event.pointerId) return;
    const deltaX = event.clientX - descriptionPointer.x;
    const horizontal = descriptionPointer.horizontal;
    descriptionPointer = null;
    try {
      if (photoDescriptionPager.hasPointerCapture?.(event.pointerId)) photoDescriptionPager.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer bị cancel hoặc tổng hợp có thể đã release capture.
    }
    if (turnPage && horizontal && Math.abs(deltaX) >= 36) turnDescriptionPage(deltaX < 0 ? 1 : -1);
  };
  photoDescriptionPager?.addEventListener("pointerup", (event) => clearDescriptionPointer(event, { turnPage: true }), { signal: controller.signal });
  photoDescriptionPager?.addEventListener("pointercancel", clearDescriptionPointer, { signal: controller.signal });
  suggestionNode?.addEventListener("click", (event) => {
    const link = event.target.closest("[data-advertising-suggestion-tag]");
    if (!link || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const tag = link.dataset.advertisingSuggestionTag;
    const nextTag = browseHistory.current.tag === tag ? null : tag;
    if (!browseHistory.replaceTag(nextTag)) return;
    requestAnimationFrame(() => {
      const nextLink = [...suggestionNode.querySelectorAll("[data-advertising-suggestion-tag]")]
        .find((node) => node.dataset.advertisingSuggestionTag === nextTag);
      (nextLink || photoInfo)?.focus({ preventScroll: true });
    });
  }, { signal: controller.signal });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented || photoDialog?.open
      || document.querySelector('#site-menu')?.open || !browseHistory.current.photo) return;
    event.preventDefault();
    if (!browseHistory.escapeDirectPhoto()) history.back();
  }, { signal: controller.signal });
  addEventListener("site:scroll", updateVisualScroll, { signal: controller.signal });
  addEventListener("scroll", () => { lastScrollAt = performance.now(); scrollActive = "onscrollend" in window; }, { passive: true, signal: controller.signal });
  addEventListener("scrollend", () => { scrollActive = false; }, { signal: controller.signal });
  addEventListener("scroll", updateNativeScroll, { passive: true, signal: controller.signal });
  addEventListener("scroll", renderRelatedWindow, { passive: true, signal: controller.signal });
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
    // Giữ entry đích native trong khi Barba vẫn sở hữu index đi ra.
    if (!window.history.state?.ttAdvertisingHistoryFallback) captureScroll();
    if (pendingLocaleSeedHandoff) {
      writeAdvertisingVisitSeedHandoff(
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
    updateLocalizedContent();
    if (browseHistory.current.photo) renderPhoto(browseHistory.current, "locale");
  }, { signal: controller.signal });
  let observedCtaHeight = gridCta?.offsetHeight || 0;
  let observedCopySize = "";
  const resizeObserver = new ResizeObserver((entries) => {
    if (activePhotoId && !suggestionNode?.hidden
      && entries.some(entry => entry.target.matches(".advertising-photo-view__suggestion-links"))
      && suggestionNode.scrollHeight > suggestionNode.offsetHeight + 1) {
      relatedLayoutKey = "";
      relatedMeasuredGeometry = null;
    }
    // Heading hoặc link làm dịch mép copy (style trễ, đổi font) làm số đo CTA không còn hợp lệ. Grid ẩn khi mở
    // detail rồi hiện lại cùng cỡ thì giữ số đo, để task Back không fit lại heading (decision phone-frame-budget).
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
    // Số đo web font làm dịch baseline CTA mà không đổi kích thước box heading.
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
      photoVideo.pause();
      photoVideo.removeAttribute("src");
      photoVideo.load();
    }
    photoViewer.cleanup();
    clearRelatedCards();
    skeletonObserver?.disconnect();
    visibleSkeletonFrames.clear();
    resizeObserver.disconnect();
    mediaObserver.disconnect();
    masonry?.destroy();
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    if (layoutFrame) cancelAnimationFrame(layoutFrame);
    if (motionTimer) clearTimeout(motionTimer);
    retainedPhotoIds.clear();
    settlePrimaryReveal();
    [...cardSkeletons.keys()].forEach(dropCardSkeleton);
    cancelAnimationFrame(skeletonSyncFrame);
    clearCtaSkeleton();
    arcGlass?.remove();
    photoGlass.remove();
    document.body.classList.remove("is-advertising-browse", "is-advertising-photo");
    delete document.body.dataset.advertisingPhotoActive;
    if (activeInstance?.container === container) activeInstance = undefined;
  };
  signal?.addEventListener("abort", cleanup, { once: true });
  // Chờ geometry từ Worker trước khi lộ adapter: lệnh adapter (ensurePhoto) trong lúc chờ sẽ đo và đặt scroll
  // rồi bị lần measure của mount ghi đè.
  if (!browseHistory.current.photo) {
    geometryPending = true;
    await prewarmGeometry(filter);
    geometryPending = false;
    if (controller.signal.aborted) return cleanup;
  }
  activeInstance = { adapter, browseHistory, container, cleanup, photoViewer, syncSkeletonMotion };
  if (browseHistory.current.photo) {
    // Grid ở trạng thái ẩn dưới photo; ensurePhoto đo nó khi quay lại.
    retainedPhotoIds.add(browseHistory.current.photo);
    // Mỗi bước dưới đây là một task riêng để không bước nào chặn input quá 50ms trên phone Android (R7, showPhoto).
    await nextTask();
    if (controller.signal.aborted) return cleanup;
    // Trả trước chi phí style và layout của chế độ photo trước việc primary; ẩn để không frame chưa có kích thước nào được vẽ.
    document.body.classList.add("is-advertising-photo");
    if (gridSection) gridSection.hidden = true;
    if (photoView) {
      photoView.hidden = false;
      photoView.style.visibility = "hidden";
    }
    // Suggestion chỉ dựng lại khi có hero mới, nên renderPhoto dùng lại chúng.
    renderSuggestionLinks(browseHistory.current, locale === "en");
    getLayoutViewportHeight();
    await nextTask();
    photoView?.style.removeProperty("visibility");
    if (controller.signal.aborted) return cleanup;
    await showPhoto(browseHistory.current, "direct");
    await nextTask();
    if (controller.signal.aborted) return cleanup;
  } else {
    // Id ?photo= không xác định thì quay về grid, mà index.html đã ẩn trước layout đầu tiên.
    document.body.classList.remove("is-advertising-photo");
    measure({ animate: true });
    restoreGridEntry(browseHistory.current, "direct");
  }
  browseHistory.persistCurrent();
  return cleanup;
}

export function unmountAdvertisingCatalog() {
  activeInstance?.cleanup();
}

window.TruongThinhAdvertising = {
  canHandlePopState: (previousHref, nextHref) => Boolean(activeInstance)
    && isAdvertisingQueryOnlyNavigation(previousHref || activeInstance.browseHistory.currentHref, nextHref),
  captureDetail: (snapshot) => activeInstance?.browseHistory.captureDetail(snapshot) || null,
  getAdapter: () => activeInstance?.adapter || null,
  getBrowseState: () => activeInstance?.browseHistory.current || null,
  getCurrentHref: () => activeInstance?.browseHistory.currentHref || null,
  handlePopState: (event, previousHref, nextHref) =>
    activeInstance?.browseHistory.handlePopState(event, previousHref, nextHref) || false,
  handleViewerPopState: () => activeInstance?.photoViewer.popState() || false,
  mount: mountAdvertisingCatalog,
  navigatePhoto: (id) => Boolean(activeInstance?.browseHistory.openPhoto(id)),
  navigateQuery: (href, { reason = "navbar" } = {}) => {
    if (!activeInstance) return false;
    const next = new URL(href, window.location.href);
    const photo = advertisingPhotoId(next);
    if (photo) return Boolean(activeInstance.browseHistory.openPhoto(photo));
    if (reason === "navbar") {
      activeInstance.browseHistory.returnToGrid({ reason });
      return true;
    }
    return false;
  },
  replaceTag: (tag) => Boolean(activeInstance?.browseHistory.replaceTag(tag)),
  unmount: unmountAdvertisingCatalog,
};
