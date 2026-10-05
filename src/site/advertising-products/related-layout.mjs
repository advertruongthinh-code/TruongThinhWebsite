// Related solver: pure, so it also runs as the module Worker that lays out direct photo entry
// off the main thread (docs/specs/advertising-detail.md R7). Imports nothing that touches the DOM.
import {
  ADVERTISING_SEARCH_OPERATION_BUDGET,
  columnsForWidth,
  computeAdvertisingPhotoGeometry,
  compileAdvertisingProductLayout,
  normalizeAdvertisingProductSettings,
} from "./layout-core.mjs";
import { shuffleWithSeed } from "./random-order.mjs";

export const compareRelatedSource = (left, right) =>
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

export function compileAdvertisingRelatedLayout({
  cards = [], categoryOrder = [], columns: requestedColumns, datasetVersion, heroId,
  layoutViewportWidth, viewportHeight = 900, headerHeight = 0, safeTop = 0, safeBottom = 0,
  settings, measureDescriptionHeight, measureDescriptionMinimumHeight, minimumImageZoneHeight = 0,
  suggestionCard = null, tag = null, seed = null, primaryMedia = null,
  compile = compileAdvertisingProductLayout,
} = {}) {
  const hero = cards.find((card) => card.id === heroId);
  if (!hero) throw new Error("Related layout requires a known photo");
  const relatedPool = selectAdvertisingRelated({ cards, categoryOrder, heroId, tag });
  const related = seed === null
    ? relatedPool
    : shuffleWithSeed(relatedPool, seed, `related:${heroId}:${tag || "all"}`);
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

// Worker side: same solve from plain numbers; measured heights arrive as constants. Cards go
// back as ids so only geometry crosses the thread boundary.
export function solveRelatedRequest({ descriptionHeight, minimumDescriptionHeight, primaryMediaId, ...options }, artifact) {
  const hero = artifact.cards.find((card) => card.id === options.heroId);
  const result = compileAdvertisingRelatedLayout({
    ...options,
    cards: artifact.cards,
    categoryOrder: artifact.categories.map((entry) => entry?.slug),
    datasetVersion: artifact.datasetVersion,
    settings: normalizeAdvertisingProductSettings(artifact.settings),
    primaryMedia: hero?.mediaItems?.find((item) => item.id === primaryMediaId),
    measureDescriptionHeight: () => descriptionHeight,
    measureDescriptionMinimumHeight: () => minimumDescriptionHeight,
  });
  return {
    cards: result.cards.map((card) => card.id),
    primary: result.primary,
    layout: { ...result.layout, placements: result.layout.placements.map((placement) => ({ ...placement, card: { id: placement.card.id } })) },
  };
}

// Main thread side: put the page's own card objects back.
export function hydrateRelatedLayout(solved, cards, suggestionCard = null) {
  const byId = new Map(cards.map((card) => [card.id, card]));
  if (suggestionCard) byId.set(suggestionCard.id, suggestionCard);
  const placements = solved.layout.placements.map((placement) => ({ ...placement, card: byId.get(placement.card.id) }));
  const suggestionPlacement = suggestionCard ? placements.find((placement) => placement.card === suggestionCard) : undefined;
  return {
    cards: solved.cards.map((id) => byId.get(id)),
    layout: { ...solved.layout, placements },
    primary: solved.primary,
    suggestionPlacement,
    photoPlacements: placements.filter((placement) => placement !== suggestionPlacement),
  };
}

if (typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope) {
  const artifact = import("./catalog-artifact.mjs").then(({ ADVERTISING_CATALOG_ARTIFACT }) => ADVERTISING_CATALOG_ARTIFACT);
  self.onmessage = async ({ data }) => {
    try {
      self.postMessage({ solved: solveRelatedRequest(data, await artifact) });
    } catch {
      self.postMessage({});
    }
  };
}
