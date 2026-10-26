//# allFunctionsCalledOnLoad
// Phần chỉ detail (photo view) cần: chọn related, suggestion, dàn layout related và photo viewer. Tách khỏi
// catalog-runtime.mjs để không nằm trong đợt tải của 8 card đầu; runtime tải lazy cùng catalog-detail.mjs
// (static-release R1). Compile hint dòng đầu như runtime vì các hàm này chạy ngay lần chạm card đầu.
import {
  ADVERTISING_SEARCH_OPERATION_BUDGET,
  columnsForWidth,
  computeAdvertisingPhotoGeometry,
  compileAdvertisingProductLayout,
  fnv1a32,
} from "./layout-core.mjs";
import { shuffleWithSeed } from "./random-order.mjs";

export { createAdvertisingPhotoViewer } from "./photo-viewer.mjs";

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
