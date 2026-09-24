import {
  ADVERTISING_LAYOUT_ALGORITHM_VERSION,
  ADVERTISING_SEARCH_OPERATION_BUDGET,
  advertisingSpacing,
  columnsForWidth,
  computeAdvertisingPhotoGeometry,
  compileAdvertisingProductLayout,
  fnv1a32,
  getVirtualWindow,
  normalizeAdvertisingProductSettings,
  validateAdvertisingCards,
} from "./layout-core.mjs";
import { createAdvertisingPhotoViewer } from "./photo-viewer.mjs";
import { mountSuggestionSlides, suggestionDeck } from "./suggestion-slideshow.mjs";
import {
  createSkeletonFlowBatchAssignments,
  createSkeletonFlowFrameLayout,
  createSkeletonFlowRenderer,
  SKELETON_FLOW_PRESETS,
  staticBackground,
} from "./skeleton-flow.mjs";

let activeInstance;
let artifactPromise;
const GEOMETRY_CACHE_LIMIT = 24;
const CAPTION_METRICS_VERSION = "advertising-caption-v2";
const ADVERTISING_BROWSE_STATE_KEY = "advertisingBrowse";
const ADVERTISING_ROOT_PATTERN = /^\/(?:vi|en)\/advertising-products\/?$/;

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
  return previous.origin === next.origin
    && previous.pathname === next.pathname
    && ADVERTISING_ROOT_PATTERN.test(next.pathname)
    && previous.search !== next.search;
}

export function parseAdvertisingBrowseLocation(input, { cards = [], categories = [], tagRegistry = [] } = {}) {
  const url = input instanceof URL ? input : new URL(input, "https://invalid.local");
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const categoryIds = new Set(categories.map((entry) => entry.slug));
  const tagIds = new Set(tagRegistry.map((entry) => entry.id));
  const requestedPhoto = url.searchParams.get("photo");
  const photoRecord = cardById.get(requestedPhoto);
  const requestedCategory = url.searchParams.get("category");
  const category = photoRecord?.category || (categoryIds.has(requestedCategory) ? requestedCategory : "all");
  const requestedTag = url.searchParams.get("tag");
  return {
    category,
    photo: photoRecord?.id || null,
    tag: photoRecord && tagIds.has(requestedTag) ? requestedTag : null,
  };
}

export function serializeAdvertisingBrowseLocation(input, browse = {}) {
  const url = input instanceof URL ? new URL(input.href) : new URL(input, "https://invalid.local");
  for (const key of ["category", "photo", "tag"]) url.searchParams.delete(key);
  if (browse.category && browse.category !== "all") url.searchParams.set("category", browse.category);
  if (browse.photo) url.searchParams.set("photo", browse.photo);
  if (browse.tag) url.searchParams.set("tag", browse.tag);
  return url;
}

const compareRelatedSource = (left, right) =>
  left.sourceOrder - right.sourceOrder || left.id.localeCompare(right.id);

export function selectAdvertisingRelated({ cards = [], categoryOrder = [], heroId, tag = null } = {}) {
  const hero = cards.find((card) => card.id === heroId);
  if (!hero) return [];
  const categoryRank = new Map(categoryOrder.map((category, index) => [category, index]));
  const related = cards.filter((card) => {
    if (card.id === hero.id) return false;
    if (!tag) return card.category === hero.category;
    return Array.isArray(card.tagIds) && card.tagIds.includes(tag);
  });
  if (!tag) return related.sort(compareRelatedSource);
  return related.sort((left, right) =>
    (categoryRank.get(left.category) ?? Number.MAX_SAFE_INTEGER)
      - (categoryRank.get(right.category) ?? Number.MAX_SAFE_INTEGER)
    || compareRelatedSource(left, right));
}

export function selectAdvertisingSuggestions({ cards = [], heroId, activeTag = null, limit = 4, tagRegistry = [] } = {}) {
  const hero = cards.find((card) => card.id === heroId);
  if (!hero) return [];
  const tagById = new Map(tagRegistry.map((tag) => [tag.id, tag]));
  const validCards = cards.filter((card) => card.media?.src
    && Number(card.media.width) > 0
    && Number(card.media.height) > 0);
  const matchingCards = (tagId) => validCards
    .filter((card) => card.tagIds?.includes(tagId))
    .sort(compareRelatedSource);
  const authored = (hero.tagIds || [])
    .map((tagId) => tagById.get(tagId))
    .filter((tag) => tag && ["product", "use"].includes(tag.group) && matchingCards(tag.id).length > 0);
  const authoredIds = new Set(authored.map((tag) => tag.id));
  const contextual = tagRegistry
    .filter((tag) => !authoredIds.has(tag.id)
      && ["product", "use"].includes(tag.group)
      && matchingCards(tag.id).some((card) => card.category === hero.category))
    .sort((left, right) => {
      return fnv1a32(`${hero.id}:${left.id}`) - fnv1a32(`${hero.id}:${right.id}`)
        || left.id.localeCompare(right.id);
    });
  const active = tagById.get(activeTag);
  const suggestions = [...authored, ...contextual];
  const suggestionLimit = Math.max(0, Number(limit) || 0);
  if (active && matchingCards(active.id).length > 0 && suggestionLimit > 0) {
    const activeIndex = suggestions.findIndex((tag) => tag.id === active.id);
    if (activeIndex >= suggestionLimit) suggestions.splice(activeIndex, 1);
    if (activeIndex < 0 || activeIndex >= suggestionLimit) suggestions.splice(suggestionLimit - 1, 0, active);
  }
  const uniqueSuggestions = [...new Map(suggestions.map((tag) => [tag.id, tag])).values()];
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
  settings, measureDescriptionHeight, suggestionCard = null, tag = null,
  compile = compileAdvertisingProductLayout,
} = {}) {
  const hero = cards.find((card) => card.id === heroId);
  if (!hero) throw new Error("Related layout requires a known photo");
  const related = selectAdvertisingRelated({ cards, categoryOrder, heroId, tag });
  const preferredColumns = Number.isInteger(requestedColumns) && requestedColumns >= 1 && requestedColumns <= 4
    ? requestedColumns : columnsForWidth(layoutViewportWidth);
  const columns = preferredColumns;
  const geometryOptions = {
    layoutViewportWidth, viewportHeight, columns, headerHeight, safeTop, safeBottom,
    imageWidth: hero.media.width, imageHeight: hero.media.height,
  };
  const basePrimary = computeAdvertisingPhotoGeometry(geometryOptions);
  const primary = typeof measureDescriptionHeight === "function"
    ? computeAdvertisingPhotoGeometry({ ...geometryOptions, descriptionHeight: measureDescriptionHeight(basePrimary.descriptionWidth, basePrimary.mode) })
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
  grid: {
    category: nullableId(value.grid?.category),
    anchorOffset: optionalFinite(value.grid?.anchorOffset),
    focusId: nullableId(value.grid?.focusId),
    scrollY: finiteScroll(value.grid?.scrollY),
    viewportWidth: optionalFinite(value.grid?.viewportWidth),
  },
  detail: {
    anchorId: nullableId(value.detail?.anchorId),
    anchorOffset: optionalFinite(value.detail?.anchorOffset),
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
  tagRegistry = [],
  barbaHistory,
  browserHistory,
  getHref,
  getLogicalScroll = () => 0,
  onApply = () => {},
} = {}) {
  const schema = { cards, categories, tagRegistry };
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const nativeHistory = browserHistory || globalThis.history;
  const href = getHref || (() => globalThis.location.href);
  let currentHref = href();
  const initialLocation = parseAdvertisingBrowseLocation(currentHref, schema);
  const initialHistory = readAdvertisingBrowseHistoryState(nativeHistory?.state);
  const matchesLocation = (stored, located) => Boolean(stored)
    && stored.category === located.category
    && stored.photo === located.photo
    && stored.tag === located.tag;
  let current = normalizeBrowseHistoryState({
    ...(matchesLocation(initialHistory, initialLocation) ? initialHistory : {}),
    ...initialLocation,
    directPhotoRootId: matchesLocation(initialHistory, initialLocation)
      ? initialHistory.directPhotoRootId
      : initialLocation.photo,
    grid: matchesLocation(initialHistory, initialLocation) ? initialHistory.grid : undefined,
    detail: matchesLocation(initialHistory, initialLocation) ? initialHistory.detail : undefined,
  });
  const canonicalInitialUrl = serializeAdvertisingBrowseLocation(currentHref, current);
  const suppliedInitialUrl = new URL(currentHref);
  if (`${canonicalInitialUrl.pathname}${canonicalInitialUrl.search}` !== `${suppliedInitialUrl.pathname}${suppliedInitialUrl.search}`) {
    if (barbaHistory?.store) barbaHistory.store({ [ADVERTISING_BROWSE_STATE_KEY]: current });
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
    if (barbaHistory?.store) {
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
    const url = serializeAdvertisingBrowseLocation(href(), normalized);
    if (barbaHistory?.add) {
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
    captureDetail({ anchorId, anchorOffset, scrollY = getLogicalScroll(), viewportWidth } = {}) {
      current = normalizeBrowseHistoryState({
        ...current,
        detail: { anchorId, anchorOffset, scrollY, viewportWidth },
      });
      return this.current;
    },
    captureGrid({ anchorOffset, focusId, scrollY = getLogicalScroll(), viewportWidth } = {}) {
      current = normalizeBrowseHistoryState({
        ...current,
        grid: { anchorOffset, focusId, scrollY, viewportWidth },
      });
      return this.current;
    },
    get current() {
      return normalizeBrowseHistoryState(current);
    },
    get currentHref() {
      return currentHref;
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
    openPhoto(photoId) {
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
          scrollY: 0,
          viewportWidth: optionalFinite(globalThis.innerWidth),
        },
      }, "photo");
    },
    replaceCategory(category) {
      const valid = category === "all" || categories.some((entry) => entry.slug === category);
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
      const focusId = current.photo || current.grid.focusId;
      const returningToOrigin = focusId === current.grid.focusId;
      const card = cardById.get(focusId);
      storeCurrent();
      return write("push", {
        ...current,
        category: reason === "navbar" ? "all" : card?.category || current.category,
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
  // Keep the contracted LazySizes preload/class lifecycle for virtualized cards.
  // Native loading alone has different viewport thresholds (docs/design/motion.md).
  const image = document.createElement("img");
  image.className = suggestion
    ? "advertising-card-media__image media-hover-zoom"
    : "advertising-tile__foreground advertising-card-media__image media-hover-zoom lazyload";
  image.loading = "lazy";
  image.decoding = "async";
  image.width = record.media.width;
  image.height = record.media.height;
  if (suggestion) {
    image.src = record.media.src;
    image.alt = "";
    if (record.media.suggestionPosition) image.style.objectPosition = record.media.suggestionPosition;
  } else {
    image.dataset.src = record.media.src;
    image.alt = locale === "en" ? record.media.altEn : record.media.altVi;
  }
  return image;
}

function createPhotoCard(record, locale, onMediaLoaded, related) {
  const figure = document.createElement("figure");
  figure.className = "project-tile advertising-tile";
  figure.dataset[related ? "advertisingRelatedCard" : "advertisingCard"] = record.id;
  figure.dataset.advertisingCategory = record.category;
  const link = document.createElement("a");
  link.className = "advertising-card-interactive media-hover-zoom-trigger";
  link.href = `/${locale}/advertising-products/?category=${encodeURIComponent(record.category)}&photo=${encodeURIComponent(record.id)}`;
  const media = document.createElement("div");
  media.className = "project-tile__media advertising-tile__media--natural advertising-card-media";
  const image = createPhotoMedia(record, locale);
  media.append(image);
  link.append(media);
  figure.append(link);
  listenForMediaLoad(figure, image, onMediaLoaded);
  return figure;
}

function listenForMediaLoad(figure, image, onMediaLoaded) {
  const markLoaded = () => {
    if (figure.dataset.advertisingMediaLoaded === "true") return;
    figure.dataset.advertisingMediaLoaded = "true";
    onMediaLoaded(figure);
  };
  image.addEventListener("lazyloaded", markLoaded, { once: true });
  image.addEventListener("load", markLoaded, { once: true });
  if (image.complete && image.naturalWidth > 0) markLoaded();
}

function setPlacementStyle(node, placement) {
  node.style.left = `${placement.x}px`;
  node.style.top = `${placement.y}px`;
  node.style.transform = "none";
  node.style.width = `${placement.pixelWidth}px`;
  node.style.height = `${placement.pixelHeight}px`;
}

function sizeNode(node, placement, setSize) {
  node.style.width = `${placement.pixelWidth}px`;
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
  return masonry;
}

export async function mountAdvertisingCatalog(container = document.querySelector('[data-barba-namespace="advertising-products"]'), { signal, scroll } = {}) {
  if (!container || activeInstance?.container === container) return activeInstance?.cleanup || (() => {});
  activeInstance?.cleanup();

  const grid = container.querySelector("[data-project-grid]");
  const filters = container.querySelector(".project-filters");
  if (!grid || !filters) return () => {};
  const ctaSkeleton = grid.querySelector("[data-advertising-cta-skeleton]");
  const gridCta = container.querySelector("[data-advertising-grid-cta]");
  const gridCtaHeading = gridCta?.querySelector("h2");
  const siteFooter = container.querySelector("footer.site-footer");
  const gridSection = grid.closest(".project-index");
  const gridSectionStyleTarget = gridSection instanceof HTMLElement ? gridSection : null;
  const photoView = container.querySelector("[data-advertising-photo-view]");
  const photoCanvas = photoView?.querySelector("[data-advertising-photo-canvas]");
  const photoPrimary = photoView?.querySelector("[data-advertising-photo-primary]");
  const photoImage = photoView?.querySelector("[data-advertising-photo-image]");
  const photoBackground = photoView?.querySelector("[data-advertising-photo-background]");
  const photoHeroFrame = photoImage?.closest(".advertising-photo-view__hero-frame");
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
  const cards = artifact.cards;
  const categoryOrder = categories.map((entry) => entry?.slug);
  try {
    validateAdvertisingCards(cards, { categoryOrder, requireNonEmpty: true });
  } catch (error) {
    console.error("[advertising-products] artifact validation failed", error);
    throw error;
  }
  let artifactDataHash;
  try {
    artifactDataHash = fnv1a32(JSON.stringify({
      datasetVersion: artifact.datasetVersion,
      layoutAlgorithmVersion: artifact.layoutAlgorithmVersion,
      settings,
      categories,
      cards,
    })).toString(16).padStart(8, "0");
  } catch (error) {
    console.error("[advertising-products] artifact identity validation failed", error);
    throw new Error("Advertising artifact identity must be serializable", { cause: error });
  }
  // Preserve the generated artifact reference as the cache identity; do not clone or mutate it.
  const artifactCacheIdentity = artifact;
  if (signal?.aborted) return () => {};
  if (typeof window.Masonry !== "function") {
    const error = new Error("Advertising catalog requires Masonry 4.2.2 before mount");
    console.error("[advertising-products] dependency readiness failed", error);
    throw error;
  }
  const controller = new AbortController();
  document.body.classList.add("is-advertising-browse");
  let locale = currentLocale();
  const reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = reducedMotionQuery.matches;
  const geometries = new Map();
  const rendered = new Map();
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
  let activeMorph = null;
  let activeBackdropAnimation = null;
  let pendingMorph = null;
  let detailRenderGeneration = 0;
  let relatedLayoutKey = "";
  let relatedMeasuredGeometry = null;
  let suggestionSlots = [];
  let suggestionSlotHeroId = "";
  let stopSuggestionSlides;
  let descriptionSource = "";
  let descriptionPages = [""];
  let descriptionPageIndex = 0;
  let descriptionPointer = null;
  const photoViewer = createAdvertisingPhotoViewer({
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
  const resetPhotoBackground = () => {
    if (!photoBackground) return;
    const animations = photoBackground.getAnimations?.() || [];
    activeBackdropAnimation = null;
    animations.forEach((animation) => animation.cancel());
    photoHeroFrame?.classList.remove("is-photo-morph-backdrop-active");
    photoBackground.style.opacity = "1";
    photoBackground.style.transform = "translate3d(0, 0, 0) scale(1.12)";
  };
  const animatePhotoBackground = (generation) => {
    if (!photoBackground || reduced || typeof photoBackground.animate !== "function") return null;
    const direction = generation % 2 ? 1 : -1;
    const animation = photoBackground.animate([
      {
        offset: 0,
        opacity: 0,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        transform: `translate3d(${direction * -2.2}%, ${direction * 1.2}%, 0) scale(1.26)`,
      },
      {
        offset: 0.35,
        opacity: 1,
        easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        transform: `translate3d(${direction * -0.8}%, ${direction * 0.4}%, 0) scale(1.20)`,
      },
      {
        offset: 1,
        opacity: 1,
        transform: "translate3d(0, 0, 0) scale(1.12)",
      },
    ], { duration: 1200, easing: "linear", fill: "forwards" });
    activeBackdropAnimation = animation;
    photoHeroFrame?.classList.add("is-photo-morph-backdrop-active");
    const cleanup = () => {
      if (activeBackdropAnimation !== animation) return;
      activeBackdropAnimation = null;
      photoHeroFrame?.classList.remove("is-photo-morph-backdrop-active");
      photoBackground.style.opacity = "1";
      animation.cancel();
    };
    animation.addEventListener("finish", cleanup, { once: true });
    animation.addEventListener("cancel", cleanup, { once: true });
    return animation;
  };
  const armedMediaCards = new Set();
  const visibleMediaCards = new Set();
  const mediaRevealFrames = new Map();
  const mediaKey = (node) => node.dataset.advertisingRelatedCard
    ? `related:${node.dataset.advertisingRelatedCard}` : `grid:${node.dataset.advertisingCard}`;
  const mediaLayers = (node) => [...node.querySelectorAll(".advertising-tile__foreground")];
  const cancelMediaReveal = (node) => {
    const id = mediaKey(node);
    const frame = mediaRevealFrames.get(id);
    if (frame) cancelAnimationFrame(frame);
    mediaRevealFrames.delete(id);
    mediaLayers(node).forEach((media) => media.style.removeProperty("transition"));
  };
  const showMedia = (node) => mediaLayers(node)
    .forEach((media) => media.classList.add("is-advertising-media-ready"));
  const revealMedia = (node) => {
    const id = mediaKey(node);
    if (
      !id || node.dataset.advertisingMediaLoaded !== "true" ||
      !visibleMediaCards.has(id) || !armedMediaCards.has(id)
    ) return;
    armedMediaCards.delete(id);
    cancelMediaReveal(node);
    const layers = mediaLayers(node);
    if (layers.some((media) => media.classList.contains("is-advertising-media-ready"))) {
      layers.forEach((media) => {
        media.style.setProperty("transition", "none", "important");
        media.classList.remove("is-advertising-media-ready");
      });
      void node.offsetWidth;
    }
    const restoreFrame = requestAnimationFrame(() => {
      layers.forEach((media) => media.style.removeProperty("transition"));
      void node.offsetWidth;
      const revealFrame = requestAnimationFrame(() => {
        mediaRevealFrames.delete(id);
        if (!node.isConnected || !visibleMediaCards.has(id)) return;
        showMedia(node);
      });
      mediaRevealFrames.set(id, revealFrame);
    });
    mediaRevealFrames.set(id, restoreFrame);
  };
  const handleMediaLoaded = (node) => {
    if (reduced) showMedia(node);
    else revealMedia(node);
  };
  const rectSnapshot = (node) => {
    const rect = node?.getBoundingClientRect?.();
    return rect && rect.width > 0 && rect.height > 0
      ? { height: rect.height, left: rect.left, top: rect.top, width: rect.width }
      : null;
  };
  const documentRectSnapshot = (node) => {
    const rect = rectSnapshot(node);
    return rect ? {
      ...rect,
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY,
    } : null;
  };
  const visiblePhotoSnapshot = (id) => {
    const node = activeMorph?.clone.dataset.advertisingPhotoId === id ? activeMorph.clone : photoImage;
    return { id, rect: rectSnapshot(node), rectSpace: "viewport", src: node?.currentSrc || node?.src };
  };
  const cancelPhotoMorph = () => {
    if (!activeMorph) return;
    const morph = activeMorph;
    activeMorph = null;
    if (morph.endpointFrame) cancelAnimationFrame(morph.endpointFrame);
    morph.clearPending?.();
    morph.backdropAnimation?.cancel?.();
    morph.animation?.cancel?.();
    resetPhotoBackground();
    morph.finish();
  };
  photoExpand?.addEventListener("click", cancelPhotoMorph, { capture: true, signal: controller.signal });
  const runPhotoMorph = ({ photoId, source, sourceRect, sourceRectSpace, sourceUrl, target, releaseIds = [], duration = 400 } = {}) => {
    cancelPhotoMorph();
    const from = sourceRect && sourceRectSpace === "viewport" ? {
      ...sourceRect,
      left: sourceRect.left + window.scrollX,
      top: sourceRect.top + window.scrollY,
    } : sourceRect || documentRectSnapshot(source);
    const mediaCard = target?.closest("[data-advertising-card], [data-advertising-related-card]");
    const relatedCard = mediaCard?.matches("[data-advertising-related-card]") ? mediaCard : null;
    if (relatedCard) {
      const destination = relatedPositions.get(relatedCard.dataset.advertisingRelatedCard);
      if (destination) {
        const item = relatedMasonry?.getItem(relatedCard);
        if (item) item.goTo(destination.x, destination.y);
        else Object.assign(relatedCard.style, { left: `${destination.x}px`, top: `${destination.y}px`, transform: "none" });
      }
    }
    if (reduced || !from || !target || !sourceUrl) {
      target?.style.removeProperty("visibility");
      releaseIds.forEach((id) => retainedPhotoIds.delete(id));
      return false;
    }
    const clone = document.createElement("img");
    clone.dataset.advertisingPhotoMorph = "true";
    if (photoId) clone.dataset.advertisingPhotoId = photoId;
    clone.alt = "";
    clone.src = sourceUrl;
    Object.assign(clone.style, {
      height: `${from.height}px`,
      left: `${from.left}px`,
      margin: "0",
      objectFit: "contain",
      pointerEvents: "none",
      position: "absolute",
      top: `${from.top}px`,
      transformOrigin: "0 0",
      width: `${from.width}px`,
      zIndex: "1200",
    });
    target.style.visibility = "hidden";
    document.body.append(clone);
    let releaseScroll = null;
    const finishMorph = () => {
      target.style.removeProperty("visibility");
      clone.remove();
      releaseIds.forEach((id) => retainedPhotoIds.delete(id));
      releaseScroll?.();
    };
    const measureTarget = () => {
      const transitionValue = target.style.getPropertyValue("transition");
      const transitionPriority = target.style.getPropertyPriority("transition");
      if (mediaCard) target.style.setProperty("transition", "none", "important");
      const rect = documentRectSnapshot(target);
      if (mediaCard) {
        if (transitionValue) target.style.setProperty("transition", transitionValue, transitionPriority);
        else target.style.removeProperty("transition");
      }
      return rect;
    };
    const to = measureTarget();
    if (!to) {
      finishMorph();
      return false;
    }
    const transform = `translate3d(${to.left - from.left}px, ${to.top - from.top}px, 0) scale(${to.width / from.width}, ${to.height / from.height})`;
    const motion = window.TruongThinhMotion;
    const unlockedViewport = {
      clientWidth: document.documentElement.clientWidth,
      innerWidth,
      viewportHeight: window.visualViewport?.height || innerHeight,
    };
    let scrollLocked = false;
    let animation;
    try {
      if (typeof motion?.lockLogicalScroll === "function" && typeof motion.unlockLogicalScroll === "function") {
        const scrollY = motion.lockLogicalScroll();
        scrollLocked = true;
        releaseScroll = () => {
          if (!scrollLocked) return;
          scrollLocked = false;
          motion.unlockLogicalScroll(scrollY);
        };
      }
      animation = clone.animate([
        { transform: "translate3d(0, 0, 0) scale(1, 1)" },
        { transform },
      ], { duration, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" });
    } catch (error) {
      finishMorph();
      throw error;
    }
    const lockedClientWidth = document.documentElement.clientWidth;
    const morph = {
      animation,
      clone,
      finish: finishMorph,
      clearPending: null,
      deferredResize: false,
      endpointFrame: 0,
      lockedViewport: lockedClientWidth === unlockedViewport.clientWidth ? null : {
        clientWidth: lockedClientWidth,
        innerWidth: unlockedViewport.innerWidth,
        viewportHeight: unlockedViewport.viewportHeight,
      },
    };
    activeMorph = morph;
    if (activePhotoId && !photoView.hidden) {
      photoBackground.style.opacity = "0";
      photoHeroFrame?.classList.add("is-photo-morph-backdrop-active");
    }
    if (mediaCard && typeof animation.effect?.setKeyframes === "function") {
      morph.endpointFrame = requestAnimationFrame(() => {
        morph.endpointFrame = 0;
        if (activeMorph !== morph) return;
        if (!relatedCard && !mediaCard.matches(":hover")) return;
        const endpoint = measureTarget();
        if (!endpoint) return;
        const endpointTransform = `translate3d(${endpoint.left - from.left}px, ${endpoint.top - from.top}px, 0) scale(${endpoint.width / from.width}, ${endpoint.height / from.height})`;
        animation.effect.setKeyframes([
          { transform: "translate3d(0, 0, 0) scale(1, 1)" },
          { transform: endpointTransform },
        ]);
      });
    }
    const settle = () => {
      if (activeMorph !== morph) return;
      if (morph.endpointFrame) cancelAnimationFrame(morph.endpointFrame);
      morph.clearPending?.();
      const mediaCard = target.closest("[data-advertising-card], [data-advertising-related-card]");
      if (mediaCard) {
        armedMediaCards.delete(mediaKey(mediaCard));
        cancelMediaReveal(mediaCard);
        target.style.setProperty("transition", "none", "important");
        showMedia(mediaCard);
        void target.offsetWidth;
        target.style.removeProperty("transition");
      }
      finishMorph();
      activeMorph = null;
      if (activePhotoId && !photoView.hidden) animatePhotoBackground(detailRenderGeneration);
      if (morph.deferredResize) scheduleResize();
      if (activePhotoId) renderRelatedWindow();
      else renderWindow();
    };
    animation.addEventListener("finish", () => {
      if (target.complete) return settle();
      // Keep the cached image at its destination while the full image finishes.
      const timer = setTimeout(settle, 4_000);
      target.addEventListener("load", settle, { once: true });
      target.addEventListener("error", settle, { once: true });
      morph.clearPending = () => {
        clearTimeout(timer);
        target.removeEventListener("load", settle);
        target.removeEventListener("error", settle);
      };
    }, { once: true });
    animation.addEventListener("cancel", settle, { once: true });
    return true;
  };
  const mediaObserver = reduced ? null : new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const node = entry.target;
      const id = mediaKey(node);
      if (!id) return;
      if (entry.intersectionRatio === 0) {
        visibleMediaCards.delete(id);
        armedMediaCards.add(id);
        cancelMediaReveal(node);
        return;
      }
      if (!entry.isIntersecting) return;
      visibleMediaCards.add(id);
      revealMedia(node);
    });
  }, { threshold: 0 });
  const observeMediaCard = (node) => {
    const id = mediaKey(node);
    armedMediaCards.add(id);
    mediaObserver?.observe(node);
  };
  const releaseMediaCard = (node) => {
    const id = mediaKey(node);
    mediaObserver?.unobserve(node);
    visibleMediaCards.delete(id);
    armedMediaCards.add(id);
    cancelMediaReveal(node);
  };
  let filter = new URLSearchParams(location.search).get("category") || "all";
  let currentVisualY = window.scrollY;
  let usesVisualScroll = false;
  let geometry;
  let masonry;
  let scrollFrame = 0;
  let browsePersistFrame = 0;
  let resizeFrame = 0;
  let layoutFrame = 0;
  let motionUntil = 0;
  let motionTimer = 0;
  let pendingScroll = false;
  let lastMeasuredGridWidth = 0;
  let lastLayoutViewportWidth = 0;
  let lastGeometrySignature = "";
  let gridPixelHeight = 0;
  let ctaGeometryHash = "";
  const syncGridCtaHeadingMetric = () => {
    if (!gridCta || !gridCtaHeading) return;
    gridCta.style.setProperty(
      "--advertising-cta-heading-half-height",
      `${gridCtaHeading.getBoundingClientRect().height / 2}px`,
    );
  };
  let hasLaidOut = false;
  if (!categories.some((entry) => entry.slug === filter)) filter = "all";

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
    entries.forEach((entry, index) => {
      let control = existing.get(entry.slug);
      if (!control) {
        control = document.createElement("a");
        control.className = "project-filter";
        control.dataset.advertisingFilter = entry.slug;
      }
      control.href = `/${locale}/advertising-products/${entry.slug === "all" ? "" : `?category=${entry.slug}`}`;
      control.dataset.en = entry.titleEn;
      control.textContent = locale === "en" ? entry.titleEn : entry.titleVi;
      control.setAttribute("aria-current", String(filter === entry.slug));
      const current = filters.children[index];
      if (current !== control) filters.insertBefore(control, current || null);
      existing.delete(entry.slug);
    });
    existing.forEach((control) => control.remove());
    rendered.forEach((node, id) => {
      const record = cards.find((card) => card.id === id);
      if (!record) return;
      const english = locale === "en";
      const link = node.querySelector("a");
      const image = node.querySelector(".advertising-tile__foreground");
      const caption = node.querySelector("figcaption");
      if (link) link.href = `/${locale}/advertising-products/?category=${encodeURIComponent(record.category)}&photo=${encodeURIComponent(record.id)}`;
      if (image) image.alt = english ? record.media.altEn : record.media.altVi;
      if (caption) caption.textContent = english ? record.titleEn : record.titleVi;
    });
  };
  updateLocalizedContent();
  ctaSkeleton?.replaceChildren();
  grid.replaceChildren(...(ctaSkeleton ? [ctaSkeleton] : []));
  grid.classList.add("advertising-grid");
  grid.setAttribute("role", "list");
  relatedGrid?.setAttribute("role", "list");

  const geometryFor = (targetFilter) => {
    const compileOptions = {
      layoutViewportWidth: document.documentElement.clientWidth,
      filter: targetFilter,
      cards,
      categoryOrder,
      datasetVersion: artifact.datasetVersion,
      settings,
    };
    const key = [
      artifactCacheIdentity.datasetVersion,
      artifactCacheIdentity.layoutAlgorithmVersion,
      artifactDataHash,
      CAPTION_METRICS_VERSION,
      targetFilter,
      compileOptions.layoutViewportWidth,
    ].join(":");
    let layout = geometries.get(key);
    if (layout) {
      geometries.delete(key);
      geometries.set(key, layout);
      surfaceAdvertisingLayoutStatus(grid, layout);
      return layout;
    }
    layout = compileAdvertisingGeometry({ grid, options: compileOptions });
    if (geometries.size >= GEOMETRY_CACHE_LIMIT) geometries.delete(geometries.keys().next().value);
    geometries.set(key, layout);
    return layout;
  };

  const virtualWindow = () => {
    const gridTop = grid.getBoundingClientRect().top + currentVisualY;
    const windowed = getVirtualWindow(geometry, {
      scrollTop: Math.max(0, currentVisualY - gridTop),
      viewportHeight: innerHeight,
      overscan: innerHeight,
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
      grid.insertBefore(node, cursor);
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
  const cancelMasonryTransitions = (instance = masonry) => {
    instance?.items.forEach((item) => {
      item.disableTransition();
      item._transn.ingProperties = {};
      item._transn.clean = {};
      item._transn.onEnd = {};
      item.element.style.transform = "";
      item.layoutPosition();
    });
  };
  const settleMotion = () => {
    motionTimer = 0;
    if (performance.now() < motionUntil) {
      motionTimer = setTimeout(settleMotion, Math.max(0, motionUntil - performance.now()));
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
    masonry?.reloadItems();
    if (masonry) {
      masonry.options.layoutInstant = true;
      masonry.layout();
    }
  };
  const cancelMotion = () => {
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
      coordinates.set(id, { x: rect.left - gridRect.left, y: rect.top - gridRect.top });
    }
    return coordinates;
  };

  const skeletonMotionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  const visibleSkeletonFrames = new Set();
  const skeletonFlowByFrame = new Map();
  const skeletonAssignmentByFrame = new Map();
  const skeletonEntryFrames = new Map();
  let skeletonFlowBatch;
  let skeletonFlowAssignmentCursor = 0;
  const skeletonFlowAssignmentBySlot = new Map();
  const revealedSkeletonSlots = new Set();
  const rerandomizeSkeletonPresets = () => {
    skeletonFlowBatch = undefined;
    skeletonFlowAssignmentCursor = 0;
    skeletonFlowAssignmentBySlot.clear();
    revealedSkeletonSlots.clear();
    ctaGeometryHash = "";
  };
  const cancelSkeletonEntry = (frame) => {
    const pending = skeletonEntryFrames.get(frame);
    if (!pending) return;
    cancelAnimationFrame(pending.reveal);
    clearTimeout(pending.fallback);
    frame.removeEventListener("transitionend", pending.settle);
    skeletonEntryFrames.delete(frame);
  };
  const skeletonCanLoop = (frame) => visibleSkeletonFrames.has(frame)
    && !document.hidden && !skeletonMotionPreference.matches && !activePhotoId;
  const settleSkeletonCanvas = (frame) => {
    const canvas = frame.querySelector('[data-advertising-flow-backend="webgl"]');
    if (!canvas) return;
    canvas.style.transition = "none";
    canvas.style.opacity = "1";
    canvas.getAnimations().forEach((animation) => {
      if (animation.transitionProperty === "opacity") animation.cancel();
    });
  };
  const createSkeletonCanvas = (assignment) => {
    const { preset, anchorPermutation, phase, direction } = assignment;
    const canvas = document.createElement("canvas");
    canvas.className = "advertising-grid__cta-flow";
    canvas.dataset.advertisingFlowPreset = preset.id;
    canvas.dataset.advertisingFlowAnchorPermutation = anchorPermutation.join(",");
    canvas.dataset.advertisingFlowPhase = String(phase);
    canvas.dataset.advertisingFlowDirection = String(direction);
    canvas.dataset.advertisingFlowBackend = "none";
    canvas.style.backgroundColor = preset.colors[3];
    canvas.style.backgroundImage = staticBackground(preset);
    canvas.style.filter = preset.finish.soften ? `blur(${preset.finish.soften}px)` : "none";
    canvas.style.transform = `scale(${1 + preset.finish.soften / 200})`;
    canvas.setAttribute("aria-hidden", "true");
    return canvas;
  };
  const mountSkeletonRenderer = (frame) => {
    if (skeletonFlowByFrame.has(frame)) return;
    const assignment = skeletonAssignmentByFrame.get(frame);
    if (!assignment) return;
    const { preset, phase, direction } = assignment;
    const canvas = frame.querySelector("canvas") || createSkeletonCanvas(assignment);
    canvas.style.transition = "none";
    canvas.style.opacity = "0";
    canvas.getBoundingClientRect();
    const renderer = createSkeletonFlowRenderer(canvas, {
      preset,
      seed: fnv1a32(`${frame.dataset.advertisingCtaSlot}:${preset.id}`),
      initialPhase: phase,
      direction,
    });
    canvas.dataset.advertisingFlowBackend = renderer?.backend || "fallback";
    renderer?.draw(performance.now());
    skeletonFlowByFrame.set(frame, renderer);
    if (!canvas.isConnected) frame.querySelector(".advertising-grid__cta-surface")?.append(canvas);
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
  const syncSkeletonRenderers = () => {
    if (document.documentElement.clientWidth > 750) return;
    const canKeep = !activePhotoId;
    const keep = new Set();
    if (canKeep) for (const frame of skeletonFlowByFrame.keys()) {
      if (visibleSkeletonFrames.has(frame) && keep.size < 2) keep.add(frame);
    }
    const prioritized = [...visibleSkeletonFrames]
      .sort((left, right) => left.offsetTop - right.offsetTop || left.offsetLeft - right.offsetLeft)
      .filter((frame) => !keep.has(frame));
    if (canKeep && !document.hidden && !skeletonMotionPreference.matches) for (const frame of prioritized) {
      if (keep.size >= 2) break;
      keep.add(frame);
    }
    for (const [frame, renderer] of skeletonFlowByFrame) {
      if (keep.has(frame)) continue;
      renderer?.destroy();
      const oldCanvas = frame.querySelector("canvas");
      const assignment = skeletonAssignmentByFrame.get(frame);
      if (oldCanvas && assignment) oldCanvas.replaceWith(createSkeletonCanvas(assignment));
      skeletonFlowByFrame.delete(frame);
    }
    keep.forEach(mountSkeletonRenderer);
  };
  const startSkeletonEntry = (frame) => {
    if (skeletonEntryFrames.has(frame) || frame.classList.contains("is-entry-ready")) return;
    const pending = { reveal: 0, fallback: 0, settle: null };
    const settle = () => {
      if (skeletonEntryFrames.get(frame) !== pending) return;
      clearTimeout(pending.fallback);
      frame.removeEventListener("transitionend", pending.settle);
      skeletonEntryFrames.delete(frame);
      if (!skeletonCanLoop(frame)) return;
      const renderer = skeletonFlowByFrame.get(frame);
      frame.classList.toggle("is-looping", Boolean(renderer));
      frame.dataset.advertisingFlowState = renderer ? "running" : "paused";
      renderer?.start();
    };
    pending.settle = (event) => {
      if (event.target === frame && event.propertyName === "opacity") settle();
    };
    pending.reveal = requestAnimationFrame(() => {
      if (!skeletonCanLoop(frame)) {
        skeletonEntryFrames.delete(frame);
        return;
      }
      frame.addEventListener("transitionend", pending.settle);
      frame.classList.add("is-entry-ready");
      revealedSkeletonSlots.add(frame.dataset.advertisingCtaSlot);
      pending.fallback = setTimeout(settle, 650);
    });
    skeletonEntryFrames.set(frame, pending);
  };
  const syncSkeletonMotion = () => {
    syncSkeletonRenderers();
    ctaSkeleton?.querySelectorAll("[data-advertising-cta-frame]").forEach((frame) => {
      const renderer = skeletonFlowByFrame.get(frame);
      if (skeletonMotionPreference.matches) {
        cancelSkeletonEntry(frame);
        settleSkeletonCanvas(frame);
        frame.classList.add("is-entry-ready");
        revealedSkeletonSlots.add(frame.dataset.advertisingCtaSlot);
        frame.classList.remove("is-looping");
        frame.dataset.advertisingFlowState = "paused";
        renderer?.stop();
        return;
      }
      if (!visibleSkeletonFrames.has(frame)) {
        cancelSkeletonEntry(frame);
        frame.classList.remove("is-looping", "is-entry-ready");
        revealedSkeletonSlots.delete(frame.dataset.advertisingCtaSlot);
        frame.dataset.advertisingFlowState = "paused";
        renderer?.stop();
        return;
      }
      if (document.hidden || activePhotoId) {
        cancelSkeletonEntry(frame);
        settleSkeletonCanvas(frame);
        frame.classList.remove("is-looping");
        frame.dataset.advertisingFlowState = "paused";
        renderer?.stop();
        return;
      }
      if (skeletonCanLoop(frame)) {
        if (frame.classList.contains("is-entry-ready")) {
          frame.classList.toggle("is-looping", Boolean(renderer));
          frame.dataset.advertisingFlowState = renderer ? "running" : "paused";
          renderer?.start();
        } else startSkeletonEntry(frame);
        return;
      }
      cancelSkeletonEntry(frame);
      frame.classList.remove("is-looping");
      frame.dataset.advertisingFlowState = "paused";
      renderer?.stop();
    });
  };
  const skeletonObserver = typeof IntersectionObserver === "function"
    ? new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) visibleSkeletonFrames.add(target);
        else {
          visibleSkeletonFrames.delete(target);
          revealedSkeletonSlots.delete(target.dataset.advertisingCtaSlot);
        }
      });
      syncSkeletonMotion();
    }) : null;
  document.addEventListener("visibilitychange", syncSkeletonMotion, { signal: controller.signal });
  skeletonMotionPreference.addEventListener("change", syncSkeletonMotion, { signal: controller.signal });
  const clearCtaSkeleton = () => {
    ctaGeometryHash = "";
    skeletonObserver?.disconnect();
    visibleSkeletonFrames.clear();
    skeletonEntryFrames.forEach((_, frame) => cancelSkeletonEntry(frame));
    skeletonFlowByFrame.forEach((renderer) => renderer?.destroy());
    skeletonFlowByFrame.clear();
    skeletonAssignmentByFrame.clear();
    if (!ctaSkeleton) return;
    ctaSkeleton.hidden = true;
    ctaSkeleton.replaceChildren();
    gridCta?.style.removeProperty("--advertising-cta-tail-height");
    gridSectionStyleTarget?.style.removeProperty("--advertising-cta-skeleton-glass-start");
    gridSectionStyleTarget?.style.removeProperty("--advertising-cta-skeleton-fade-start");
    gridSectionStyleTarget?.style.removeProperty("--advertising-cta-skeleton-boundary-bottom");
    delete ctaSkeleton.dataset.advertisingCtaColumns;
    delete ctaSkeleton.dataset.advertisingCtaReady;
    delete ctaSkeleton.dataset.advertisingCtaSignature;
  };
  const renderCtaSkeleton = () => {
    if (!ctaSkeleton || !geometry || activePhotoId) {
      gridPixelHeight = geometry?.totalPixelHeight || 0;
      clearCtaSkeleton();
      return;
    }
    syncGridCtaHeadingMetric();
    const ctaTop = geometry.totalPixelHeight + geometry.interCardGap;
    gridSectionStyleTarget?.style.setProperty("--advertising-cta-top", `${ctaTop}px`);
    const viewportHeight = window.visualViewport?.height || innerHeight;
    const footerStyle = siteFooter ? getComputedStyle(siteFooter) : null;
    const footerGap = Number.parseFloat(footerStyle?.marginBlockStart || footerStyle?.marginTop) || 0;
    const tailHeight = Math.max(Math.ceil(geometry.cardWidth * 0.25) + 1,
      viewportHeight - geometry.interCardGap - footerGap - (siteFooter?.offsetHeight || 0));
    const nextCtaGeometryHash = `${geometry.coordinateHash}:${tailHeight.toFixed(3)}`;
    if (ctaGeometryHash === nextCtaGeometryHash) return;
    gridCta?.style.setProperty("--advertising-cta-tail-height", `${tailHeight}px`);
    const ctaHeight = gridCta?.offsetHeight || 0;
    const ctaStyle = gridCta ? getComputedStyle(gridCta) : null;
    const skeletonRatio = Math.min(0.5, Math.max(0,
      Number.parseFloat(ctaStyle?.getPropertyValue("--advertising-cta-skeleton-ratio")) || 0.382));
    const skeletonFadeEnd = ctaTop + ctaHeight * skeletonRatio;
    const gridBottom = ctaTop + ctaHeight;
    const skeletonBoundaryBottom = gridBottom + geometry.interCardGap;
    skeletonObserver?.disconnect();
    visibleSkeletonFrames.clear();
    skeletonEntryFrames.forEach((_, frame) => cancelSkeletonEntry(frame));
    skeletonFlowByFrame.forEach((renderer) => renderer?.destroy());
    skeletonFlowByFrame.clear();
    skeletonAssignmentByFrame.clear();
    const fragment = document.createDocumentFragment();
    if (!skeletonFlowBatch) {
      skeletonFlowBatch = createSkeletonFlowBatchAssignments({
        count: SKELETON_FLOW_PRESETS.length,
        presets: SKELETON_FLOW_PRESETS,
      });
    }
    const frameLayout = createSkeletonFlowFrameLayout({
      columnBottoms: geometry.columnBottoms,
      columns: geometry.columns,
      cardWidth: geometry.cardWidth,
      gap: geometry.interCardGap,
      boundaryBottom: skeletonBoundaryBottom,
    });
    frameLayout.forEach(({ slot, column, depth, band, top, height }) => {
        const frame = document.createElement("span");
        frame.className = "advertising-grid__cta-frame";
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
        if (revealedSkeletonSlots.has(slot)) frame.classList.add("is-entry-ready");
        const surface = document.createElement("span");
        surface.className = "advertising-grid__cta-surface";
        let assignment = skeletonFlowAssignmentBySlot.get(slot);
        if (!assignment) {
          if (skeletonFlowAssignmentCursor >= skeletonFlowBatch.length) {
            skeletonFlowBatch = createSkeletonFlowBatchAssignments({
              count: SKELETON_FLOW_PRESETS.length,
              presets: SKELETON_FLOW_PRESETS,
            });
            skeletonFlowAssignmentCursor = 0;
          }
          assignment = skeletonFlowBatch[skeletonFlowAssignmentCursor];
          skeletonFlowAssignmentCursor += 1;
          skeletonFlowAssignmentBySlot.set(slot, assignment);
        }
        skeletonAssignmentByFrame.set(frame, assignment);
        surface.style.backgroundColor = assignment.preset.colors[3];
        surface.style.backgroundImage = staticBackground(assignment.preset);
        const canvas = createSkeletonCanvas(assignment);
        if (document.documentElement.clientWidth > 750) {
          const renderer = createSkeletonFlowRenderer(canvas, {
            preset: assignment.preset,
            seed: fnv1a32(`${slot}:${assignment.preset.id}`),
            initialPhase: assignment.phase,
            direction: assignment.direction,
          });
          canvas.dataset.advertisingFlowBackend = renderer?.backend || "fallback";
          renderer?.draw(performance.now());
          skeletonFlowByFrame.set(frame, renderer);
        }
        surface.append(canvas);
        frame.append(surface);
        fragment.append(frame);
    });
    gridPixelHeight = gridBottom;
    const skeletonGlassStart = Math.max(geometry.totalPixelHeight, skeletonFadeEnd - geometry.cardWidth);
    const skeletonFadeLead = Math.min(48, Math.max(1, (skeletonFadeEnd - skeletonGlassStart) * 0.25));
    const skeletonFadeStart = Math.max(
      skeletonGlassStart + skeletonFadeLead,
      skeletonFadeEnd - geometry.cardWidth * 0.5,
    );
    ctaGeometryHash = nextCtaGeometryHash;
    ctaSkeleton.replaceChildren(fragment);
    ctaSkeleton.hidden = false;
    ctaSkeleton.dataset.advertisingCtaColumns = String(geometry.columns);
    ctaSkeleton.dataset.advertisingCtaReady = "true";
    ctaSkeleton.dataset.advertisingCtaRealBottom = String(geometry.totalPixelHeight);
    ctaSkeleton.dataset.advertisingCtaSignature = `${ctaGeometryHash}:${gridPixelHeight.toFixed(3)}`;
    gridSectionStyleTarget?.style.setProperty("--advertising-cta-skeleton-glass-start", `${skeletonGlassStart}px`);
    gridSectionStyleTarget?.style.setProperty("--advertising-cta-skeleton-fade-start", `${skeletonFadeStart}px`);
    gridSectionStyleTarget?.style.setProperty("--advertising-cta-skeleton-boundary-bottom", `${skeletonBoundaryBottom}px`);
    ctaSkeleton.style.height = `${skeletonBoundaryBottom}px`;
    grid.style.height = `${gridPixelHeight}px`;
    ctaSkeleton.querySelectorAll("[data-advertising-cta-frame]").forEach((frame) => {
      if (skeletonObserver) skeletonObserver.observe(frame);
      else visibleSkeletonFrames.add(frame);
    });
    syncSkeletonMotion();
  };

  const renderWindow = ({ animate = false, origins } = {}) => {
    if (!geometry || activePhotoId) return;
    renderCtaSkeleton();
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
        node = createPhotoCard(placement.card, locale, handleMediaLoaded, false);
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
      if (!masonry) masonry = createMasonry(grid, positions, () => gridPixelHeight);
      masonry.options.layoutInstant = !shouldAnimate || reduced;
      masonry.options.transitionDuration = reduced ? 0 : "0.4s";
      masonry.reloadItems();
      masonry.items.forEach((item) => {
        item.isLayoutInstant = !shouldAnimate || item.element.hidden || (created.has(item.element.dataset.advertisingCard) && !seeded.has(item.element.dataset.advertisingCard)) || reduced;
      });
      masonry.layout();
      hasLaidOut = true;
      lastGeometrySignature = geometrySignature;
      if (shouldAnimate && !reduced) {
        motionUntil = performance.now() + 400;
        if (motionTimer) clearTimeout(motionTimer);
        motionTimer = setTimeout(settleMotion, 400);
      }
      window.lazySizes?.loader?.checkElems?.();
      window.dispatchEvent(new CustomEvent("site:layout"));
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
      node = createPhotoCard(placement.card, locale, handleMediaLoaded, false);
      rendered.set(placement.card.id, node);
      observeMediaCard(node);
      grid.append(node);
    }
    node.hidden = false;
    sizeNode(node, placement, geometry.placements.length);
    restoreCanonicalDomOrder();
    if (masonry) {
      masonry.options.layoutInstant = true;
      masonry.reloadItems();
      masonry.layout();
    }
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

  const setActiveFilter = (nextFilter, { animate = false } = {}) => {
    if (nextFilter === filter) return;
    const visualOrigins = animate && performance.now() < motionUntil ? visualCoordinates() : undefined;
    const origins = animate ? cachedCoordinates(nextFilter, visualOrigins) : undefined;
    cancelMotion();
    rerandomizeSkeletonPresets();
    filter = nextFilter;
    filters.querySelectorAll("[data-advertising-filter]").forEach((item) => {
      item.setAttribute("aria-current", String(item.dataset.advertisingFilter === filter));
    });
    measure({ animate, origins });
  };
  const getLogicalScroll = () => scroll?.getLogicalScroll?.() ?? currentVisualY;
  const setLogicalScroll = (scrollY) => {
    const rootStyle = document.documentElement.style;
    const behavior = rootStyle.getPropertyValue("scroll-behavior");
    const priority = rootStyle.getPropertyPriority("scroll-behavior");
    rootStyle.setProperty("scroll-behavior", "auto", "important");
    try {
      return scroll?.setLogicalScroll?.(scrollY) ?? false;
    } finally {
      if (behavior) rootStyle.setProperty("scroll-behavior", behavior, priority);
      else rootStyle.removeProperty("scroll-behavior");
    }
  };
  const ensurePhoto = (id, { focus = false, scrollIntoView = false } = {}) => {
    const card = cards.find((entry) => entry.id === id);
    if (!card) return null;
    if (filter !== card.category && filter !== "all") setActiveFilter(card.category);
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
      photoDescriptionIndicator.textContent = `${current} / ${total}`;
      photoDescriptionIndicator.hidden = total <= 1;
      photoDescriptionIndicator.setAttribute("aria-label", locale === "en"
        ? `Description page ${current} of ${total}`
        : `Trang mô tả ${current} trên ${total}`);
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
    while (start < words.length) {
      let end = start + 1;
      let best = end;
      while (end <= words.length) {
        photoDescription.textContent = words.slice(start, end).join(" ");
        if (photoDescription.scrollHeight > available + 1) break;
        best = end;
        end += 1;
      }
      if (best === start) best = start + 1;
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
        link.className = "advertising-photo-view__suggestion-link advertising-card-interactive advertising-card-media media-hover-zoom-trigger";
        link.dataset.advertisingSuggestionTag = tag.id;
        link.dataset.advertisingSuggestionIndex = String(index);
        const first = suggestionDeck(tag.id, cards.filter(candidate => candidate.tagIds?.includes(tag.id)))[0] || card;
        link.dataset.advertisingSuggestionRepresentative = first.id;
        const image = createPhotoMedia(first, locale, { suggestion: true });
        image.dataset.advertisingSuggestionImageLayer = "current";
        image.dataset.advertisingSuggestionPhoto = first.id;
        const label = document.createElement("span");
        label.className = "advertising-photo-view__suggestion-label";
        link.append(image, label);
        links.append(link);
      });
      suggestionNode.replaceChildren(...[suggestionTitle, links].filter(Boolean));
      stopSuggestionSlides = mountSuggestionSlides(suggestionNode, {
        cards, isReduced: () => reduced, signal: controller.signal,
        createImage: card => createPhotoMedia(card, locale, { suggestion: true }),
      });
    }
    suggestionNode.querySelectorAll("[data-advertising-suggestion-tag]").forEach((link) => {
      const slot = suggestionSlots.find(({ tag }) => tag.id === link.dataset.advertisingSuggestionTag);
      if (!slot) return;
      link.setAttribute("aria-pressed", String(browse.tag === slot.tag.id));
      link.querySelector(".advertising-photo-view__suggestion-label").textContent = english ? slot.tag.labelEn : slot.tag.labelVi;
    });
    suggestionNode.hidden = suggestionSlots.length === 0;
    suggestionNode.dataset.advertisingRelatedItem = "advertising-suggestion";
    suggestionNode.dataset.rank = "0";
    suggestionNode.dataset.sourceOrder = "0";
  };
  const syncLocaleLinks = (browse) => {
    document.querySelectorAll("[data-language-option]").forEach((link) => {
      link.href = serializeAdvertisingBrowseLocation(link.href, browse).href;
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
  const ensureRelatedPhoto = (id) => {
    const placement = relatedLayout?.photoPlacements.find((entry) => entry.card.id === id);
    if (!placement || !relatedGrid) return null;
    let node = relatedRendered.get(id);
    if (!node) {
      node = createPhotoCard(placement.card, locale, handleMediaLoaded, true);
      relatedRendered.set(id, node);
      observeMediaCard(node);
      relatedGrid.append(node);
      setPlacementStyle(node, placement);
      node.dataset.advertisingRelatedItem = id;
    }
    node.style.width = `${placement.pixelWidth}px`;
    node.style.height = `${placement.pixelHeight}px`;
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
    if (!animate && (relatedMotionFrame || relatedMotionTimer)) return;
    const gridTop = relatedGrid.getBoundingClientRect().top + getLogicalScroll();
    const windowed = getVirtualWindow(relatedLayout.layout, {
      overscan: innerHeight,
      scrollTop: Math.max(0, getLogicalScroll() - gridTop),
      viewportHeight: innerHeight,
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
    else if (suggestionNode) suggestionNode.hidden = suggestionId ? true : suggestionSlots.length === 0;
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
      node.style.left = `${origin.x}px`;
      node.style.top = `${origin.y}px`;
      node.style.transform = "none";
    }
    if (keepSuggestion && suggestionNode) {
      const destination = relatedPositions.get(suggestionId);
      const origin = motion ? origins?.get(suggestionId) || destination : destination;
      suggestionNode.style.left = `${origin.x}px`;
      suggestionNode.style.top = `${origin.y}px`;
      suggestionNode.style.transform = "none";
    }
    restoreRelatedDomOrder();
    const applyLayout = () => {
      relatedMotionFrame = 0;
      if (!relatedMasonry) relatedMasonry = createMasonry(relatedGrid, relatedPositions, () => relatedPixelHeight, {
        itemSelector: "[data-advertising-related-item]",
        getId: (node) => node.dataset.advertisingRelatedItem,
      });
      relatedMasonry.options.layoutInstant = !motion;
      relatedMasonry.options.transitionDuration = reduced ? 0 : "0.4s";
      relatedMasonry.reloadItems();
      relatedMasonry.items.forEach((item) => { item.isLayoutInstant = !motion || item.element.hidden; });
      relatedMasonry.layout();
      if (motion) relatedMotionTimer = setTimeout(() => {
        relatedMotionTimer = 0;
        cancelMasonryTransitions(relatedMasonry);
        renderRelatedWindow();
      }, 400);
    };
    if (motion) {
      void relatedGrid.offsetHeight;
      relatedMotionFrame = requestAnimationFrame(applyLayout);
    } else applyLayout();
  };
  const relatedTypographyKey = () => [document.documentElement, photoInfo, photoDescription]
    .map((node) => node ? getComputedStyle(node).fontSize : "").join(":");
  const layoutRelated = (browse) => {
    if (!relatedGrid || !photoPrimary || !photoCanvas) return;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.visualViewport?.height || innerHeight;
    const typographyKey = relatedTypographyKey();
    const nextLayoutKey = `${browse.photo}:${browse.tag || "all"}:${locale}:${viewportWidth}:${viewportHeight}:${typographyKey}`;
    if (nextLayoutKey === relatedLayoutKey) {
      renderRelatedWindow();
      return;
    }
    const origins = relatedLayoutKey ? relatedVisualCoordinates() : undefined;
    cancelRelatedMotion();
    const { outer, interCardGap } = advertisingSpacing(viewportWidth);
    const columns = columnsForWidth(viewportWidth);
    const suggestionInRelated = columns <= 3;
    const gridWidth = viewportWidth - (2 * outer);
    const suggestionWidth = (gridWidth - interCardGap * (columns - 1)) / columns;
    photoView.style.setProperty("--gutter", `${outer}px`);
    const headerPadding = matchMedia("(max-width: 750px)").matches ? 15 : matchMedia("(max-width: 1200px)").matches ? 25 : 35;
    const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-row-height")) + headerPadding;
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
    if (suggestionSlots.length && suggestionNode) {
      suggestionNode.hidden = false;
      suggestionNode.style.width = `${suggestionWidth}px`;
      suggestionNode.style.height = "auto";
      suggestionHeight = Math.ceil(Math.max(
        suggestionNode.scrollHeight,
        suggestionNode.getBoundingClientRect().height,
      ));
    }
    const suggestionCard = suggestionInRelated && suggestionSlots.length ? {
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
    relatedLayout = compileAdvertisingRelatedLayout({
      cards, categoryOrder, columns,
      datasetVersion: artifact.datasetVersion, heroId: browse.photo,
      layoutViewportWidth: viewportWidth, viewportHeight, headerHeight,
      safeTop: parseFloat(viewStyle.getPropertyValue("--advertising-safe-top")) || 0,
      safeBottom: parseFloat(viewStyle.getPropertyValue("--advertising-safe-bottom")) || 0,
      settings, suggestionCard, tag: browse.tag,
      measureDescriptionHeight: (width, mode) => {
        if (!photoInfo) return 0;
        photoView.dataset.advertisingPhotoLayout = mode;
        const previousWidth = photoInfo.style.width;
        const previousHeight = photoInfo.style.height;
        photoInfo.style.width = `${width}px`;
        photoInfo.style.height = "auto";
        const height = Math.ceil(photoInfo.getBoundingClientRect().height);
        photoInfo.style.width = previousWidth;
        photoInfo.style.height = previousHeight;
        return height;
      },
    });
    relatedLayoutKey = nextLayoutKey;
    const primary = relatedLayout.primary;
    const pinterestMode = primary.span === relatedLayout.layout.columns;
    if ((primary.mode === "pinterest") !== pinterestMode) throw new Error("Advertising photo layout mode is inconsistent with its grid span");
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
    paginateDescription();
    renderRelatedWindow({ animate: true, origins });
  };
  const renderPhoto = (browse, reason) => {
    const record = cards.find((card) => card.id === browse.photo);
    if (!record || !photoView || !photoImage) return false;
    const previousPhotoId = activePhotoId;
    const previousHero = previousPhotoId ? visiblePhotoSnapshot(previousPhotoId) : null;
    if (!pendingMorph && !previousPhotoId && reason === "history" && browse.grid.focusId === record.id) {
      const source = ensurePhoto(record.id)?.querySelector("img");
      const rect = rectSnapshot(source);
      const src = source?.currentSrc || source?.src;
      if (rect && src) {
        retainedPhotoIds.add(record.id);
        pendingMorph = { id: record.id, rect, rectSpace: "viewport", src };
      }
    }
    const generation = ++detailRenderGeneration;
    cancelPhotoMorph();
    photoViewer.setRecord(record);
    const requestedMorph = pendingMorph;
    pendingMorph = null;
    cancelMotion();
    activePhotoId = record.id;
    clearCtaSkeleton();
    syncLocaleLinks(browse);
    photoView.dataset.advertisingPhotoId = record.id;
    photoImage.dataset.advertisingPhotoId = record.id;
    document.body.classList.add("is-advertising-photo");
    document.body.dataset.advertisingPhotoActive = "true";
    if (gridSection) gridSection.hidden = true;
    photoView.hidden = false;
    const english = locale === "en";
    photoImage.width = record.media.width;
    photoImage.height = record.media.height;
    photoImage.alt = english ? record.media.altEn : record.media.altVi;
    photoImage.loading = "eager";
    photoImage.fetchPriority = "high";
    photoImage.src = record.media.src;
    if (photoBackground) {
      resetPhotoBackground();
      photoBackground.src = record.media.src;
      photoBackground.dataset.advertisingPhotoId = record.id;
    }
    descriptionSource = english ? record.descriptionEn : record.descriptionVi;
    descriptionPageIndex = 0;
    if (photoDescription) photoDescription.textContent = descriptionSource;
    const category = categoryById.get(record.category);
    if (photoCategory) photoCategory.textContent = english ? category?.titleEn : category?.titleVi;
    renderSuggestionLinks(browse, english);
    layoutRelated(browse);
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
    let target = photoImage;
    let sourceRect = requestedMorph?.rect;
    let sourceRectSpace = requestedMorph?.rectSpace;
    let sourceUrl = requestedMorph?.src;
    let morphPhotoId = requestedMorph?.id;
    const releaseIds = [record.id];
    if (!requestedMorph && previousHero && previousHero.id !== record.id) {
      retainedPhotoIds.add(previousHero.id);
      target = ensureRelatedPhoto(previousHero.id)?.querySelector("img");
      sourceRect = previousHero.rect;
      sourceRectSpace = previousHero.rectSpace;
      sourceUrl = previousHero.src;
      morphPhotoId = previousHero.id;
      releaseIds.push(previousHero.id);
    }
    if (target && sourceRect && sourceUrl) {
      runPhotoMorph({ photoId: morphPhotoId, sourceRect, sourceRectSpace, sourceUrl, target, releaseIds, duration: reason === "history" ? 400 : 520 });
    } else releaseIds.forEach((id) => retainedPhotoIds.delete(id));
    requestAnimationFrame(() => {
      if (generation !== detailRenderGeneration || controller.signal.aborted) return;
      window.dispatchEvent(new CustomEvent("site:layout"));
    });
    return true;
  };
  const restoreGridEntry = (browse, reason) => {
    const previousPhotoId = activePhotoId;
    const previousHero = previousPhotoId ? visiblePhotoSnapshot(previousPhotoId) : null;
    const generation = ++detailRenderGeneration;
    cancelPhotoMorph();
    photoViewer.close({ restoreFocus: false });
    pendingMorph = null;
    const previousHeroRect = previousHero?.rect;
    const previousHeroRectSpace = previousHero?.rectSpace;
    const previousHeroSrc = previousHero?.src;
    activePhotoId = null;
    clearRelatedCards();
    syncLocaleLinks(browse);
    if (photoView) delete photoView.dataset.advertisingPhotoId;
    if (photoView) delete photoView.dataset.advertisingPhotoLayout;
    if (photoView) delete photoView.dataset.advertisingPhotoGlass;
    if (photoImage) delete photoImage.dataset.advertisingPhotoId;
    photoView && (photoView.hidden = true);
    if (gridSection) gridSection.hidden = false;
    document.body.classList.remove("is-advertising-photo");
    delete document.body.dataset.advertisingPhotoActive;
    const focusId = browse.grid.focusId;
    if (browse.category !== filter) setActiveFilter(browse.category);
    const node = focusId ? ensurePhoto(focusId) : null;
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
    const target = previousPhotoId ? rendered.get(previousPhotoId)?.querySelector("img") : null;
    const canMorph = Boolean(target && previousHeroRect && previousHeroSrc);
    if (canMorph) {
      retainedPhotoIds.add(previousPhotoId);
      target.style.visibility = "hidden";
    }
    requestAnimationFrame(() => {
      if (generation !== detailRenderGeneration || controller.signal.aborted) {
        target?.style.removeProperty("visibility");
        if (previousPhotoId) retainedPhotoIds.delete(previousPhotoId);
        return;
      }
      window.dispatchEvent(new CustomEvent("site:layout"));
      if (!canMorph) return;
      requestAnimationFrame(() => {
        if (generation !== detailRenderGeneration || controller.signal.aborted) {
          target.style.removeProperty("visibility");
          retainedPhotoIds.delete(previousPhotoId);
          return;
        }
        runPhotoMorph({
          sourceRect: previousHeroRect,
          sourceRectSpace: previousHeroRectSpace,
          sourceUrl: previousHeroSrc,
          target,
          photoId: previousPhotoId,
          releaseIds: [previousPhotoId],
          duration: 400,
        });
      });
    });
  };
  const browseHistory = createAdvertisingBrowseHistoryController({
    cards,
    categories,
    tagRegistry: artifact.tagRegistry || [],
    barbaHistory: window.barba?.history,
    browserHistory: window.history,
    getHref: () => window.location.href,
    getLogicalScroll,
    onApply({ browse, reason }) {
      if (browsePersistFrame) cancelAnimationFrame(browsePersistFrame);
      browsePersistFrame = 0;
      syncLocaleLinks(browse);
      if (reason === "category") return;
      if (browse.photo) {
        renderPhoto(browse, reason);
        return;
      }
      restoreGridEntry(browse, reason);
    },
  });
  browseHistory.persistCurrent();
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
      renderWindow();
    });
  };
  const scheduleBrowsePersistence = () => {
    if (browsePersistFrame) return;
    browsePersistFrame = requestAnimationFrame(() => {
      browsePersistFrame = 0;
      const browse = browseHistory.current;
      if (browse.photo) browseHistory.captureDetail({ ...browse.detail, scrollY: getLogicalScroll() });
      else browseHistory.captureGrid({ ...browse.grid, scrollY: getLogicalScroll() });
      browseHistory.persistCurrent();
    });
  };
  const updateVisualScroll = (event) => {
    const y = Number(event.detail?.y);
    if (!Number.isFinite(y)) return;
    currentVisualY = Math.max(0, y);
    usesVisualScroll = true;
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
  };
  const scheduleResize = () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      const viewportHeight = window.visualViewport?.height || innerHeight;
      const viewportWidth = document.documentElement.clientWidth;
      const lockedViewport = activeMorph?.lockedViewport;
      if (
        lockedViewport
        && lockedViewport.clientWidth === viewportWidth
        && lockedViewport.innerWidth === innerWidth
        && lockedViewport.viewportHeight === viewportHeight
      ) {
        activeMorph.deferredResize = true;
        return;
      }
      if (activePhotoId) {
        const geometryAlreadyMeasured = relatedMeasuredGeometry
          && relatedMeasuredGeometry.viewportHeight === viewportHeight
          && relatedMeasuredGeometry.viewportWidth === viewportWidth
          && relatedMeasuredGeometry.typographyKey === relatedTypographyKey();
        if (geometryAlreadyMeasured) return;
        cancelPhotoMorph();
        layoutRelated(browseHistory.current);
        window.dispatchEvent(new CustomEvent("site:layout"));
        return;
      }
      if (grid.clientWidth !== lastMeasuredGridWidth || document.documentElement.clientWidth !== lastLayoutViewportWidth) {
        const origins = visualCoordinates();
        cancelPhotoMorph();
        cancelMotion();
        measure({ animate: true, origins });
      } else if (!ctaGeometryHash) {
        renderCtaSkeleton();
        window.dispatchEvent(new CustomEvent("site:layout"));
      }
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
    const image = card.querySelector("img");
    pendingMorph = {
      id: card.dataset.advertisingCard,
      rect: rectSnapshot(image),
      rectSpace: "viewport",
      src: image?.currentSrc || image?.src,
    };
    browseHistory.captureGrid({
      anchorOffset: rect.top,
      focusId: card.dataset.advertisingCard,
      scrollY: getLogicalScroll(),
      viewportWidth: document.documentElement.clientWidth,
    });
    retainedPhotoIds.add(card.dataset.advertisingCard);
    browseHistory.openPhoto(card.dataset.advertisingCard);
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

  filters.addEventListener("click", (event) => {
    const control = event.target.closest("[data-advertising-filter]");
    if (!control || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (control.dataset.advertisingFilter === filter) return;
    if (grid.contains(document.activeElement)) control.focus();
    const nextFilter = control.dataset.advertisingFilter;
    browseHistory.replaceCategory(nextFilter);
    setActiveFilter(nextFilter, { animate: true });
  }, { signal: controller.signal });
  relatedGrid?.addEventListener("click", (event) => {
    const link = event.target.closest("[data-advertising-related-card] > a");
    if (!link || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const node = link.closest("[data-advertising-related-card]");
    const nextId = node?.dataset.advertisingRelatedCard;
    if (!nextId || nextId === browseHistory.current.photo) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const image = node.querySelector("img");
    const rect = node.getBoundingClientRect();
    browseHistory.captureDetail({
      anchorId: nextId,
      anchorOffset: rect.top,
      scrollY: getLogicalScroll(),
      viewportWidth: document.documentElement.clientWidth,
    });
    pendingMorph = { id: nextId, rect: rectSnapshot(image), rectSpace: "viewport", src: image?.currentSrc || image?.src };
    retainedPhotoIds.add(nextId);
    browseHistory.openPhoto(nextId);
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
        // Synthetic pointer sequences and cancelled pointers do not own capture.
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
      // Cancelled and synthetic pointers may already have released capture.
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
    if (event.key !== "Escape" || event.defaultPrevented || photoDialog?.open || !browseHistory.current.photo) return;
    event.preventDefault();
    if (!browseHistory.escapeDirectPhoto()) history.back();
  }, { signal: controller.signal });
  addEventListener("site:scroll", updateVisualScroll, { signal: controller.signal });
  addEventListener("scroll", updateNativeScroll, { passive: true, signal: controller.signal });
  addEventListener("scroll", renderRelatedWindow, { passive: true, signal: controller.signal });
  reducedMotionQuery.addEventListener("change", ({ matches }) => {
    reduced = matches;
  }, { signal: controller.signal });
  addEventListener("resize", scheduleResize, { passive: true, signal: controller.signal });
  window.visualViewport?.addEventListener("resize", scheduleResize, { passive: true, signal: controller.signal });
  addEventListener("site:menu-closed", () => {
    const browse = browseHistory.current;
    if (browse.photo || !browse.grid.focusId) return;
    ensurePhoto(browse.grid.focusId)?.querySelector("a")?.focus({ preventScroll: true });
  }, { signal: controller.signal });
  addEventListener("pagehide", () => {
    if (browsePersistFrame) cancelAnimationFrame(browsePersistFrame);
    browsePersistFrame = 0;
    const browse = browseHistory.current;
    if (browse.photo) browseHistory.captureDetail({ ...browse.detail, scrollY: getLogicalScroll() });
    else browseHistory.captureGrid({ ...browse.grid, scrollY: getLogicalScroll() });
    browseHistory.persistCurrent();
  }, { signal: controller.signal });
  addEventListener("languagechange", () => {
    locale = currentLocale();
    updateLocalizedContent();
    if (browseHistory.current.photo) renderPhoto(browseHistory.current, "locale");
  }, { signal: controller.signal });
  let observedCtaHeight = gridCta?.offsetHeight || 0;
  const resizeObserver = new ResizeObserver((entries) => {
    if (entries.some((entry) => entry.target === gridCtaHeading)) syncGridCtaHeadingMetric();
    if (entries.some((entry) => entry.target === siteFooter)) ctaGeometryHash = "";
    if (entries.some((entry) => entry.target === gridCta) && gridCta.offsetHeight !== observedCtaHeight) {
      observedCtaHeight = gridCta.offsetHeight;
      ctaGeometryHash = "";
    }
    scheduleResize();
  });
  resizeObserver.observe(grid);
  if (gridCta) resizeObserver.observe(gridCta);
  if (gridCtaHeading) resizeObserver.observe(gridCtaHeading);
  if (siteFooter) resizeObserver.observe(siteFooter);
  if (photoPrimary) resizeObserver.observe(photoPrimary);
  if (photoInfo) [...photoInfo.children].forEach((node) => resizeObserver.observe(node));
  const refreshFontGeometry = () => {
    if (controller.signal.aborted || !activePhotoId) return;
    relatedLayoutKey = "";
    relatedMeasuredGeometry = null;
    scheduleResize();
  };
  document.fonts?.ready.then(refreshFontGeometry);
  document.fonts?.addEventListener("loadingdone", refreshFontGeometry, { signal: controller.signal });

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    signal?.removeEventListener("abort", cleanup);
    controller.abort();
    stopSuggestionSlides?.();
    photoViewer.cleanup();
    cancelPhotoMorph();
    resetPhotoBackground();
    clearRelatedCards();
    skeletonObserver?.disconnect();
    visibleSkeletonFrames.clear();
    resizeObserver.disconnect();
    mediaObserver?.disconnect();
    rendered.forEach((node) => cancelMediaReveal(node));
    masonry?.destroy();
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    if (browsePersistFrame) cancelAnimationFrame(browsePersistFrame);
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    if (layoutFrame) cancelAnimationFrame(layoutFrame);
    if (motionTimer) clearTimeout(motionTimer);
    retainedPhotoIds.clear();
    clearCtaSkeleton();
    document.body.classList.remove("is-advertising-browse", "is-advertising-photo");
    delete document.body.dataset.advertisingPhotoActive;
    if (activeInstance?.container === container) activeInstance = undefined;
  };
  signal?.addEventListener("abort", cleanup, { once: true });
  activeInstance = { adapter, browseHistory, container, cleanup };
  measure({ animate: !browseHistory.current.photo });
  if (browseHistory.current.photo) {
    adapter.retainPhoto(browseHistory.current.photo);
    renderPhoto(browseHistory.current, "direct");
  } else {
    restoreGridEntry(browseHistory.current, "direct");
  }
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
  mount: mountAdvertisingCatalog,
  navigatePhoto: (id) => Boolean(activeInstance?.browseHistory.openPhoto(id)),
  navigateQuery: (href, { reason = "navbar" } = {}) => {
    if (!activeInstance) return false;
    const next = new URL(href, window.location.href);
    if (next.searchParams.get("photo")) {
      return Boolean(activeInstance.browseHistory.openPhoto(next.searchParams.get("photo")));
    }
    if (reason === "navbar") {
      activeInstance.browseHistory.returnToGrid({ reason });
      return true;
    }
    return false;
  },
  replaceTag: (tag) => Boolean(activeInstance?.browseHistory.replaceTag(tag)),
  unmount: unmountAdvertisingCatalog,
};
