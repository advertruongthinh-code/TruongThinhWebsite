export const ADVERTISING_LAYOUT_ALGORITHM_VERSION = "advertising-grid-v14";
const ADVERTISING_IDEAL_SLOT_WIDTH = 220;
const ADVERTISING_MIN_COLUMNS = 2;
const ADVERTISING_MAX_COLUMNS = 4;

const DEFAULT_DATASET_VERSION = "2026-09-09.2";
const DEFAULT_LANDSCAPE_THRESHOLD = 1.25;
const CAPTION_METRICS_VERSION = "advertising-caption-v2";
export const ADVERTISING_SEARCH_OPERATION_BUDGET = 300000;
const SEARCH_WINDOW_SIZE = 64;
const SEARCH_CANDIDATE_LIMIT = 20;
const SEARCH_BACKTRACK_DEPTH = 24;
const ORGANIC_RHYTHM_WINDOW = 12;

function layoutMedia(card) {
  if (card?.mediaItems === undefined) return card?.media;
  if (!Array.isArray(card.mediaItems) || card.mediaItems.length === 0) return null;
  const coverId = card.coverMediaId ?? card.mediaItems[0]?.id;
  return card.mediaItems.find((item) => item?.id === coverId) ?? null;
}

function mediaControlStripHeight(card) {
  return Array.isArray(card?.mediaItems) && card.mediaItems.length >= 2 ? 44 : 0;
}

function mediaRatioBand(card) {
  const media = layoutMedia(card);
  const ratio = media?.height / media?.width;
  return ratio >= 1.15 ? "high" : ratio <= 0.9 ? "low" : "medium";
}

export function scoreAdvertisingOrganicRhythm(items, limit = ORGANIC_RHYTHM_WINDOW) {
  const cards = items.map((item) => item?.card || item).filter(Boolean);
  const bands = cards.slice(0, limit).map(mediaRatioBand);
  const counts = cards.reduce((result, card) => {
    const band = mediaRatioBand(card);
    result[band] += 1;
    return result;
  }, { high: 0, low: 0, medium: 0 });
  let highLowTransitions = 0;
  let repeatedBandPairs = 0;
  let currentBand = null;
  let currentRun = 0;
  let longestRun = 0;
  for (let index = 0; index < bands.length; index += 1) {
    const band = bands[index];
    const previous = bands[index - 1];
    if ((band === "high" && previous === "low") || (band === "low" && previous === "high")) highLowTransitions += 1;
    if (band === previous && band !== "medium") repeatedBandPairs += 1;
    if (band === "medium") {
      currentBand = null;
      currentRun = 0;
    } else if (band === currentBand) {
      currentRun += 1;
      longestRun = Math.max(longestRun, currentRun);
    } else {
      currentBand = band;
      currentRun = 1;
      longestRun = Math.max(longestRun, currentRun);
    }
  }
  const targetApplicable = counts.high >= 2 && counts.low >= 2;
  const targetMet = targetApplicable ? bands.includes("high") && bands.includes("low") && longestRun <= 4 : null;
  return {
    firstBands: bands,
    highLowTransitions,
    longestRun,
    score: highLowTransitions * 100 - repeatedBandPairs * 10 - longestRun,
    targetApplicable,
    targetMet,
  };
}

export function solveAdvertisingOrganicPresentationOrder(cards, presentationOrderIds) {
  if (!Array.isArray(cards) || !Array.isArray(presentationOrderIds)) return null;
  const cardById = new Map(cards.map((card) => [card.id, card]));
  if (presentationOrderIds.length !== cardById.size
    || new Set(presentationOrderIds).size !== cardById.size
    || presentationOrderIds.some((id) => !cardById.has(id))) return null;
  const requested = presentationOrderIds.map((id) => cardById.get(id));
  const pinnedSuggestion = requested[0]?.kind === "suggestion" ? requested[0] : null;
  const movable = pinnedSuggestion ? requested.slice(1) : requested;
  const baseline = scoreAdvertisingOrganicRhythm(requested);
  if (!baseline.targetApplicable || requested.length < 3) {
    return {
      cards: requested,
      applied: false,
      fallbackReason: "insufficient-ratio-pool",
    };
  }
  const queues = {
    high: movable.filter((card) => mediaRatioBand(card) === "high"),
    low: movable.filter((card) => mediaRatioBand(card) === "low"),
    medium: movable.filter((card) => mediaRatioBand(card) === "medium"),
  };
  const ordered = pinnedSuggestion ? [pinnedSuggestion] : [];
  const usedIds = new Set(pinnedSuggestion ? [pinnedSuggestion.id] : []);
  const firstPriorityBand = movable.find((card) => ["high", "low"].includes(mediaRatioBand(card)));
  let nextHighLow = firstPriorityBand ? mediaRatioBand(firstPriorityBand) : "high";
  for (let index = ordered.length; index < Math.min(ORGANIC_RHYTHM_WINDOW, requested.length); index += 1) {
    const lastBand = ordered.length ? mediaRatioBand(ordered.at(-1)) : null;
    const lastRun = (() => {
      let count = 0;
      for (let offset = ordered.length - 1; offset >= 0 && mediaRatioBand(ordered[offset]) === lastBand; offset -= 1) count += 1;
      return count;
    })();
    let band;
    if (queues.medium.length && index > 0 && (index % 4 === 3 || lastRun >= 3)) band = "medium";
    else if (queues[nextHighLow].length) band = nextHighLow;
    else if (queues[nextHighLow === "high" ? "low" : "high"].length) band = nextHighLow === "high" ? "low" : "high";
    else if (queues.medium.length) band = "medium";
    else break;
    const card = queues[band].shift();
    ordered.push(card);
    usedIds.add(card.id);
    if (band === "high" || band === "low") nextHighLow = band === "high" ? "low" : "high";
  }
  requested.forEach((card) => {
    if (!usedIds.has(card.id)) ordered.push(card);
  });
  const score = scoreAdvertisingOrganicRhythm(ordered);
  return {
    cards: ordered,
    applied: ordered.some((card, index) => card.id !== requested[index]?.id),
    fallbackReason: score.targetMet === false ? "soft-rhythm-target-unreachable" : null,
  };
}

export function normalizeAdvertisingProductSettings(settings) {
  if (settings !== undefined && (!settings || typeof settings !== "object" || Array.isArray(settings))) {
    throw new Error("Invalid advertising settings: expected an object");
  }
  return {};
}

export function normalizeAdvertisingSettings(settings) {
  if (settings === undefined) return { landscapeThreshold: DEFAULT_LANDSCAPE_THRESHOLD };
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error("Invalid advertising settings: expected an object");
  }
  const landscapeThreshold = Object.hasOwn(settings, "landscapeThreshold")
    ? settings.landscapeThreshold
    : DEFAULT_LANDSCAPE_THRESHOLD;
  if (typeof landscapeThreshold !== "number" || !Number.isFinite(landscapeThreshold) || landscapeThreshold <= 1) {
    throw new Error("Invalid advertising settings.landscapeThreshold: expected a finite number greater than 1");
  }
  return { landscapeThreshold };
}

export function fnv1a32(value) {
  let hash = 0x811c9dc5;
  const bytes = new TextEncoder().encode(value);
  // Indexed loop: the iterator form costs ~25ms per mount on the A05s for the artifact hash.
  for (let index = 0; index < bytes.length; index += 1) {
    hash ^= bytes[index];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function assertCategoryOrder(categoryOrder) {
  if (!Array.isArray(categoryOrder) || new Set(categoryOrder).size !== categoryOrder.length || categoryOrder.some((slug) => typeof slug !== "string" || !slug)) {
    throw new Error("Invalid category order");
  }
}

/**
 * @param {any[]} cards
 * @param {any} [options]
 */
export function validateAdvertisingCards(cards, options = {}) {
  const categoryOrder = options.categoryOrder ?? [], requireRanks = options.requireRanks ?? true, requireNonEmpty = options.requireNonEmpty ?? false;
  if (!Array.isArray(cards)) throw new Error("Advertising cards must be an array");
  if (requireNonEmpty && cards.length === 0) throw new Error("Advertising cards must not be empty");
  assertCategoryOrder(categoryOrder);
  /** @type {Set<string>} */
  const ids = new Set();
  /** @type {Set<string>} */
  const sourcePositions = new Set();

  for (const card of cards) {
    if (!card || typeof card !== "object" || typeof card.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(card.id)) throw new Error("Invalid card id");
    if (ids.has(card.id)) throw new Error(`Duplicate card id: ${card.id}`);
    ids.add(card.id);
    for (const legacyField of ["presentationCanvas", "fitMode", "mediaCandidates"]) {
      if (Object.hasOwn(card, legacyField)) throw new Error(`Legacy card field is not supported: ${legacyField}: ${card.id}`);
    }
    if (Object.hasOwn(card, "layoutSpan") && !["auto", 1, 2].includes(card.layoutSpan)) {
      throw new Error(`Invalid layoutSpan: ${card.id}`);
    }
    if (Object.prototype.hasOwnProperty.call(card, "span")) throw new Error(`Card span is not supported: ${card.id}`);
    if (Object.prototype.hasOwnProperty.call(card, "ratio")) throw new Error(`Fixed card ratio is not supported: ${card.id}`);
    if (!categoryOrder.some((category) => category === card.category)) throw new Error(`Unknown card category: ${card.id}`);
    if (!Number.isInteger(card.sourceOrder) || card.sourceOrder < 0) throw new Error(`Invalid source order: ${card.id}`);
    const sourcePosition = `${card.category}\0${card.sourceOrder}`;
    if (sourcePositions.has(sourcePosition)) throw new Error(`Duplicate category source order: ${card.id}`);
    sourcePositions.add(sourcePosition);
    const media = layoutMedia(card);
    if (typeof media?.src !== "string" || !media.src || !Number.isFinite(media.width) || media.width <= 0 || !Number.isFinite(media.height) || media.height <= 0) {
      throw new Error(`Invalid media dimensions: ${card.id}`);
    }
    if (requireRanks && (!Number.isInteger(card.rank) || card.rank < 0)) throw new Error(`Invalid card rank: ${card.id}`);
  }

  if (requireRanks) {
    const ranks = cards.map((card) => card.rank).sort((left, right) => left - right);
    if (ranks.some((rank, index) => rank !== index)) throw new Error("Cards must have continuous ranks from zero");
    const queues = categoryOrder.map((category) => cards.filter((card) => card.category === category).sort(bySource));
    const expectedIds = [];
    for (let sourceOrder = 0; queues.some((queue) => sourceOrder < queue.length); sourceOrder += 1) {
      for (const queue of queues) {
        if (queue[sourceOrder]) expectedIds.push(queue[sourceOrder].id);
      }
    }
    const rankedIds = [...cards].sort(byRank).map((card) => card.id);
    if (expectedIds.some((id, index) => id !== rankedIds[index])) throw new Error("Cards do not follow the canonical rank schedule");
  }
  return cards;
}

const bySource = (left, right) => left.sourceOrder - right.sourceOrder || left.id.localeCompare(right.id);
const byRank = (left, right) => left.rank - right.rank || left.id.localeCompare(right.id);

/** @param {any[]} cards @param {string[]} categoryOrder @returns {any[]} */
export function scheduleAdvertisingRank(cards, categoryOrder) {
  validateAdvertisingCards(cards, { categoryOrder, requireRanks: false });
  /** @type {any[][]} */
  const queues = categoryOrder.map((category) => cards.filter((card) => card.category === category).sort(bySource));
  const ranked = cards.slice(0, 0);
  while (queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      const card = queue.shift();
      if (card) ranked.push({ ...card, rank: ranked.length });
    }
  }
  return ranked;
}

export function columnsForWidth(layoutViewportWidth) {
  const { outer, interCardGap } = advertisingSpacing(layoutViewportWidth);
  const gridWidth = layoutViewportWidth - (2 * outer);
  return Math.min(ADVERTISING_MAX_COLUMNS, Math.max(ADVERTISING_MIN_COLUMNS,
    Math.floor((gridWidth + interCardGap) / (ADVERTISING_IDEAL_SLOT_WIDTH + interCardGap))));
}

export function advertisingSpacing(layoutViewportWidth) {
  if (!Number.isFinite(layoutViewportWidth) || layoutViewportWidth <= 0) throw new Error("Invalid advertising viewport width");
  const outer = layoutViewportWidth <= 750 ? 15 : layoutViewportWidth <= 1200 ? 25 : 35;
  const interCardGap = layoutViewportWidth <= 960 ? 15 : layoutViewportWidth <= 1200 ? 25 : 35;
  return { outer, interCardGap };
}

export function computeAdvertisingPhotoGeometry(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Advertising photo geometry options must be an object");
  }
  const {
    layoutViewportWidth,
    viewportHeight,
    imageWidth,
    imageHeight,
    headerHeight,
    safeTop = 0,
    safeBottom = 0,
    descriptionHeight: measuredDescriptionHeight = 0,
    minimumDescriptionHeight = 0,
    minimumImageZoneHeight = 0,
  } = options;
  let { columns } = options;
  for (const [name, value] of Object.entries({ layoutViewportWidth, viewportHeight, imageWidth, imageHeight })) {
    if (!Number.isFinite(value) || value <= 0) throw new TypeError(`Invalid advertising photo ${name}: expected a positive finite number`);
  }
  for (const [name, value] of Object.entries({ headerHeight, safeTop, safeBottom, descriptionHeight: measuredDescriptionHeight, minimumDescriptionHeight, minimumImageZoneHeight })) {
    if (!Number.isFinite(value) || value < 0) throw new TypeError(`Invalid advertising photo ${name}: expected a non-negative finite number`);
  }
  if (columns === undefined) columns = columnsForWidth(layoutViewportWidth);
  if (!Number.isInteger(columns) || columns < 1 || columns > ADVERTISING_MAX_COLUMNS) {
    throw new TypeError(`Invalid advertising photo columns: ${String(columns)}`);
  }

  const { outer, interCardGap } = advertisingSpacing(layoutViewportWidth);
  const gridWidth = layoutViewportWidth - (2 * outer);
  const cardWidth = (gridWidth - interCardGap * (columns - 1)) / columns;
  const top = headerHeight + outer + safeTop;
  const belowPeek = 50;
  const span = Math.min(3, columns);
  // Landscape keeps the image beside the info; portrait with every column taken stacks them.
  const mode = span === columns && layoutViewportWidth <= viewportHeight ? "pinterest" : "split";
  // Related cards sit below a full-width primary, so it has no row beside it to peek.
  const heightCap = viewportHeight - top - interCardGap - (span === columns ? 0 : belowPeek) - safeBottom;
  if (gridWidth <= 0 || cardWidth <= 0 || heightCap <= 0) {
    throw new RangeError("Advertising photo geometry is physically impossible for the available viewport");
  }

  const ratio = imageWidth / imageHeight;
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new RangeError("Advertising photo geometry is physically impossible for the intrinsic media ratio");
  }
  const width = span * cardWidth + (span - 1) * interCardGap;
  const internalGap = interCardGap;

  let height;
  let imageZoneWidth;
  let imageZoneHeight;
  let descriptionWidth;
  let descriptionHeight;
  if (mode === "split") {
    const imageColumns = Math.max(1, span - 1);
    imageZoneWidth = imageColumns * cardWidth + (imageColumns - 1) * interCardGap;
    descriptionWidth = cardWidth;
    height = Math.max(heightCap, minimumDescriptionHeight, minimumImageZoneHeight);
    imageZoneHeight = height;
    descriptionHeight = height;
  } else {
    const availableHeight = viewportHeight - top - safeBottom;
    const descriptionCap = Math.min(viewportHeight * 0.28 - internalGap,
      availableHeight - internalGap - 1);
    descriptionHeight = measuredDescriptionHeight > 0
      ? Math.min(measuredDescriptionHeight, descriptionCap)
      : descriptionCap;
    descriptionHeight = Math.max(descriptionHeight, minimumDescriptionHeight);
    imageZoneWidth = width;
    imageZoneHeight = Math.max(minimumImageZoneHeight,
      Math.min(width / ratio, availableHeight - descriptionHeight - internalGap));
    descriptionWidth = width;
    height = imageZoneHeight + descriptionHeight + internalGap;
  }
  if (imageZoneWidth <= 0 || imageZoneHeight <= 0 || descriptionWidth <= 0 || descriptionHeight <= 0) {
    throw new RangeError("Advertising photo geometry is physically impossible for the available viewport");
  }
  const containedImageWidth = Math.min(imageZoneWidth, ratio * imageZoneHeight);
  const containedImageHeight = containedImageWidth / ratio;
  const hasContainOverflow = Math.abs(containedImageWidth - imageZoneWidth) > 0.5
    || Math.abs(containedImageHeight - imageZoneHeight) > 0.5;
  return {
    columns,
    span,
    mode,
    width,
    height,
    top,
    gridWidth,
    cardWidth,
    gap: interCardGap,
    imageWidth: containedImageWidth,
    imageHeight: containedImageHeight,
    imageZoneWidth,
    imageZoneHeight,
    descriptionWidth,
    descriptionHeight,
    hasContainOverflow,
    internalGap,
    heightCap,
    belowPeek,
  };
}

function layoutError(code, detail) {
  const error = new Error(`${code}: ${JSON.stringify(detail)}`);
  error.code = code;
  error.diagnostic = { code, ...detail };
  return error;
}

const comparePlacement = (left, right) => left.y - right.y || left.x - right.x || left.card.id.localeCompare(right.card.id);

function spanColumns(placement) {
  return Array.from({ length: placement.width }, (_, offset) => placement.left + offset);
}

function nearestDifferent(edges, y, id = "") {
  let low = 0;
  let high = edges.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (edges[middle].y < y) low = middle + 1;
    else high = middle;
  }
  let best = null;
  for (let left = low - 1, right = low; left >= 0 || right < edges.length;) {
    const leftDistance = left >= 0 ? Math.abs(edges[left].y - y) : Infinity;
    const rightDistance = right < edges.length ? Math.abs(edges[right].y - y) : Infinity;
    const index = leftDistance <= rightDistance ? left-- : right++;
    const candidate = edges[index];
    if (candidate.id === id) continue;
    if (!best || Math.abs(candidate.y - y) < Math.abs(best.y - y) ||
      (Math.abs(candidate.y - y) === Math.abs(best.y - y) && (candidate.y < best.y || (candidate.y === best.y && candidate.id.localeCompare(best.id) < 0)))) {
      best = candidate;
    }
    const nextDistance = Math.min(
      left >= 0 ? Math.abs(edges[left].y - y) : Infinity,
      right < edges.length ? Math.abs(edges[right].y - y) : Infinity,
    );
    if (best && nextDistance > Math.abs(best.y - y)) break;
  }
  return best;
}

function nearestDifferentIndex(edges, y, id = "") {
  const edge = nearestDifferent(edges, y, id);
  return edge ? edges.indexOf(edge) : -1;
}

function productStaggerViolations(state, placement, columns) {
  let violations = 0;
  const nextColumns = spanColumns(placement);
  for (const column of nextColumns) {
    for (const adjacent of [column - 1, column + 1]) {
      if (adjacent < 0 || adjacent >= columns) continue;
      const y = placement.y + placement.mediaPixelHeight;
      const image = nearestDifferent(state.edges[adjacent].image, y, placement.card.id);
      if (image && Math.abs(image.y - y) + 0.05 < state.staggerMinimumRatio * Math.max(image.imageHeight, placement.mediaPixelHeight)) violations += 1;
      for (const edge of state.edges[adjacent].image) {
        const distance = Math.abs(edge.y - y);
        const previous = nearestDifferent(state.edges[column].image, edge.y, edge.id);
        if (previous && (Math.abs(previous.y - edge.y) < distance || (Math.abs(previous.y - edge.y) === distance && previous.y < y))) continue;
        if (distance + 0.05 < state.staggerMinimumRatio * Math.max(edge.imageHeight, placement.mediaPixelHeight)) violations += 1;
      }
    }
  }
  return violations;
}

function hasGeometryConflict(state, placement, columns, cardWidth) {
  if (state.productLayout) return false;
  const minimum = 0.25 * cardWidth;
  const nextColumns = spanColumns(placement);
  for (const column of nextColumns) {
    for (const adjacent of [column - 1, column + 1]) {
      if (adjacent < 0 || adjacent >= columns) continue;
      const card = nearestDifferent(state.edges[adjacent].card, placement.y + placement.pixelHeight, placement.card.id);
      const image = nearestDifferent(state.edges[adjacent].image, placement.y + placement.mediaPixelHeight, placement.card.id);
      if (image && Math.abs(image.y - placement.y - placement.mediaPixelHeight) + 0.05 < minimum) return true;
      if (card && Math.abs(card.y - placement.y - placement.pixelHeight) + 0.05 < minimum) return true;
    }
  }
  return false;
}

function appendEdges(state, placement) {
  for (const column of spanColumns(placement)) {
    state.edges[column].image.push({ id: placement.card.id, y: placement.y + placement.mediaPixelHeight, imageHeight: placement.mediaPixelHeight });
    state.edges[column].card.push({ id: placement.card.id, y: placement.y + placement.pixelHeight });
  }
}

function rhythmLevels(leftEdges, rightEdges, cardWidth) {
  const events = new Map();
  const consider = (edge, opposite, edgeIsLeft) => {
    const nearest = nearestDifferent(opposite, edge.y, edge.id);
    if (!nearest) return;
    const left = edgeIsLeft ? edge : nearest;
    const right = edgeIsLeft ? nearest : edge;
    const ids = [left.id, right.id].sort();
    const key = ids.join("\0");
    const candidate = { ids, offset: left.y - right.y, eventY: Math.max(left.y, right.y) };
    const current = events.get(key);
    if (!current || Math.abs(candidate.offset) < Math.abs(current.offset) ||
      (Math.abs(candidate.offset) === Math.abs(current.offset) && candidate.eventY < current.eventY)) events.set(key, candidate);
  };
  for (const edge of leftEdges) consider(edge, rightEdges, true);
  for (const edge of rightEdges) consider(edge, leftEdges, false);
  const quantum = 0.125 * cardWidth;
  return [...events.values()]
    .sort((a, b) => a.eventY - b.eventY || a.ids[0].localeCompare(b.ids[0]) || a.ids[1].localeCompare(b.ids[1]))
    .map((event) => Math.round(event.offset / quantum));
}

function hasBrickLevels(levels) {
  for (let index = 2; index < levels.length; index += 1) {
    if (levels[index] === levels[index - 1] && levels[index] === levels[index - 2]) return true;
  }
  for (let index = 5; index < levels.length; index += 1) {
    if (levels[index] !== levels[index - 1] && levels[index] === levels[index - 2] && levels[index] === levels[index - 4] && levels[index - 1] === levels[index - 3] && levels[index - 1] === levels[index - 5]) return true;
  }
  return false;
}

function hasBrickRhythm(edges, columns, cardWidth) {
  for (let column = 0; column < columns - 1; column += 1) {
    for (const kind of ["image", "card"]) {
      if (hasBrickLevels(rhythmLevels(edges[column][kind], edges[column + 1][kind], cardWidth))) return true;
    }
  }
  return false;
}

function createRhythmTracker(cardWidth) {
  return { cardWidth, nearest: [[], []], contributions: new Map(), events: new Map(), ordered: [], finalizedCount: 0 };
}

function compareRhythmEvent(a, b) {
  return a.eventY - b.eventY || a.ids[0].localeCompare(b.ids[0]) || a.ids[1].localeCompare(b.ids[1]);
}

function insertRhythmEvent(ordered, event) {
  let low = 0;
  let high = ordered.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (compareRhythmEvent(ordered[middle], event) <= 0) low = middle + 1;
    else high = middle;
  }
  ordered.splice(low, 0, event);
  return low;
}

function refreshRhythmPair(tracker, key, changedIndices) {
  const current = tracker.events.get(key);
  if (current) {
    const index = tracker.ordered.indexOf(current);
    if (index >= 0) {
      tracker.ordered.splice(index, 1);
      changedIndices.push(index);
    }
  }
  const candidates = tracker.contributions.get(key);
  if (!candidates?.size) {
    tracker.contributions.delete(key);
    tracker.events.delete(key);
    return;
  }
  const event = [...candidates.values()].sort((a, b) =>
    Math.abs(a.offset) - Math.abs(b.offset) || a.eventY - b.eventY || a.token.localeCompare(b.token),
  )[0];
  tracker.events.set(key, event);
  changedIndices.push(insertRhythmEvent(tracker.ordered, event));
}

function rhythmContribution(side, index, nearestIndex, edgeLists) {
  if (!Number.isInteger(nearestIndex) || nearestIndex < 0) return null;
  const edge = edgeLists[side][index];
  const opposite = edgeLists[1 - side][nearestIndex];
  const left = side === 0 ? edge : opposite;
  const right = side === 0 ? opposite : edge;
  const ids = [left.id, right.id].sort();
  return {
    key: ids.join("\0"),
    value: { token: `${side}:${index}`, ids, offset: left.y - right.y, eventY: Math.max(left.y, right.y) },
  };
}

function setRhythmNearest(tracker, side, index, nearestIndex, edgeLists, changedIndices) {
  const hadNearest = Object.hasOwn(tracker.nearest[side], index);
  const oldNearest = hadNearest ? tracker.nearest[side][index] : undefined;
  if (hadNearest && oldNearest === nearestIndex) return;
  const oldContribution = rhythmContribution(side, index, oldNearest, edgeLists);
  if (oldContribution) {
    tracker.contributions.get(oldContribution.key)?.delete(oldContribution.value.token);
    refreshRhythmPair(tracker, oldContribution.key, changedIndices);
  }
  if (nearestIndex === undefined) delete tracker.nearest[side][index];
  else tracker.nearest[side][index] = nearestIndex;
  const contribution = rhythmContribution(side, index, nearestIndex, edgeLists);
  if (contribution) {
    if (!tracker.contributions.has(contribution.key)) tracker.contributions.set(contribution.key, new Map());
    tracker.contributions.get(contribution.key).set(contribution.value.token, contribution.value);
    refreshRhythmPair(tracker, contribution.key, changedIndices);
  }
}

function appendRhythmSide(tracker, side, index, edgeLists, log, changedIndices) {
  const edge = edgeLists[side][index];
  const opposite = edgeLists[1 - side];
  const nearestIndex = nearestDifferentIndex(opposite, edge.y, edge.id);
  log.push({ side, index, oldNearest: undefined });
  setRhythmNearest(tracker, side, index, nearestIndex, edgeLists, changedIndices);

  const previousSide = edgeLists[side];
  const oppositeNearest = tracker.nearest[1 - side];
  for (let oppositeIndex = oppositeNearest.length - 1; oppositeIndex >= 0; oppositeIndex -= 1) {
    const oppositeEdge = opposite[oppositeIndex];
    if (oppositeEdge.id === edge.id) continue;
    const oldIndex = oppositeNearest[oppositeIndex] ?? -1;
    const oldEdge = oldIndex >= 0 ? previousSide[oldIndex] : null;
    const newDistance = Math.abs(edge.y - oppositeEdge.y);
    const oldDistance = oldEdge ? Math.abs(oldEdge.y - oppositeEdge.y) : Infinity;
    const better = newDistance < oldDistance ||
      (newDistance === oldDistance && (edge.y < oldEdge?.y || (edge.y === oldEdge?.y && edge.id.localeCompare(oldEdge?.id ?? "") < 0)));
    // Edges append in ascending y. Once the new edge loses, it cannot be nearest to an earlier opposite edge.
    if (!better) break;
    log.push({ side: 1 - side, index: oppositeIndex, oldNearest: oldIndex });
    setRhythmNearest(tracker, 1 - side, oppositeIndex, index, edgeLists, changedIndices);
  }
}

function contributionIsFinal(event, tracker, edgeLists, futureEdges) {
  const separator = event.token.indexOf(":");
  const side = Number(event.token.slice(0, separator));
  const index = Number(event.token.slice(separator + 1));
  const nearestIndex = tracker.nearest[side][index];
  const edge = edgeLists[side][index];
  const opposite = edgeLists[1 - side];
  const nearest = opposite[nearestIndex];
  return Boolean(edge && nearest && futureEdges[1 - side] - edge.y >= Math.abs(nearest.y - edge.y));
}

function trackerLevel(tracker, index) {
  return Math.round(tracker.ordered[index].offset / (0.125 * tracker.cardWidth));
}

function finalizedRhythmHasBrick(tracker, edgeLists, futureEdges) {
  if (!edgeLists[0].length || !edgeLists[1].length) return false;
  const frontierY = Math.min(...futureEdges);
  let finalizedCount = tracker.finalizedCount;
  while (finalizedCount < tracker.ordered.length) {
    const event = tracker.ordered[finalizedCount];
    if (event.eventY >= frontierY || !contributionIsFinal(event, tracker, edgeLists, futureEdges)) break;
    finalizedCount += 1;
  }
  for (let end = Math.max(2, tracker.finalizedCount); end < finalizedCount; end += 1) {
    const current = trackerLevel(tracker, end);
    const previous = trackerLevel(tracker, end - 1);
    if (current === previous && current === trackerLevel(tracker, end - 2)) return true;
    if (end >= 5 && current !== previous && current === trackerLevel(tracker, end - 2) && current === trackerLevel(tracker, end - 4) && previous === trackerLevel(tracker, end - 3) && previous === trackerLevel(tracker, end - 5)) return true;
  }
  tracker.finalizedCount = finalizedCount;
  return false;
}

function changedRhythmHasBrick(tracker, changedIndices) {
  /** @type {Set<number>} */
  const starts = new Set();
  for (const index of changedIndices) {
    for (let start = Math.max(0, index - 5); start <= Math.min(index + 1, tracker.ordered.length - 1); start += 1) starts.add(start);
  }
  for (const start of starts) {
    if (start + 2 < tracker.ordered.length && trackerLevel(tracker, start) === trackerLevel(tracker, start + 1) && trackerLevel(tracker, start) === trackerLevel(tracker, start + 2)) return true;
    if (start + 5 < tracker.ordered.length && trackerLevel(tracker, start) !== trackerLevel(tracker, start + 1) && trackerLevel(tracker, start) === trackerLevel(tracker, start + 2) && trackerLevel(tracker, start) === trackerLevel(tracker, start + 4) && trackerLevel(tracker, start + 1) === trackerLevel(tracker, start + 3) && trackerLevel(tracker, start + 1) === trackerLevel(tracker, start + 5)) return true;
  }
  return false;
}

function rhythmsHaveBrick(rhythms) {
  return rhythms.some((boundary) => [boundary.image, boundary.card].some((tracker) =>
    hasBrickLevels(tracker.ordered.map((event) => Math.round(event.offset / (0.125 * tracker.cardWidth)))),
  ));
}

function appendRhythms(state, occupied, cardWidth, previousMutableBrick, allowAlignedFallback = false) {
  /** @type {any[]} */
  const logs = [];
  /** @type {Set<number>} */
  const boundaries = new Set();
  let changedBrick = false;
  for (const column of occupied) {
    if (column > 0) boundaries.add(column - 1);
    if (column < state.edges.length - 1) boundaries.add(column);
  }
  for (const boundary of boundaries) {
    for (const kind of ["image", "card"]) {
      const tracker = state.rhythms[boundary][kind];
      const edgeLists = [state.edges[boundary][kind], state.edges[boundary + 1][kind]];
      const log = [];
      const changedIndices = [];
      if (occupied.includes(boundary)) appendRhythmSide(tracker, 0, edgeLists[0].length - 1, edgeLists, log, changedIndices);
      if (occupied.includes(boundary + 1)) appendRhythmSide(tracker, 1, edgeLists[1].length - 1, edgeLists, log, changedIndices);
      logs.push({ tracker, edgeLists, log, finalizedCount: tracker.finalizedCount });
      // Even the shortest future card cannot change a nearest edge behind this bound.
      const futureEdges = [boundary, boundary + 1].map((column) =>
        (state.columnBottoms[column] ? state.columnBottoms[column] + state.interCardGap : 0) + state.minimumMediaHeight + (kind === "card" ? state.captionPixelHeight : 0),
      );
      if (!allowAlignedFallback && finalizedRhythmHasBrick(tracker, edgeLists, futureEdges)) return { conflict: true, logs };
      if (changedRhythmHasBrick(tracker, changedIndices)) changedBrick = true;
    }
  }
  return { conflict: false, logs, mutableBrick: allowAlignedFallback ? false : (previousMutableBrick ? rhythmsHaveBrick(state.rhythms) : changedBrick) };
}

function undoRhythms(logs) {
  for (let trackerIndex = logs.length - 1; trackerIndex >= 0; trackerIndex -= 1) {
    const { tracker, edgeLists, log, finalizedCount } = logs[trackerIndex];
    const changedIndices = [];
    for (let index = log.length - 1; index >= 0; index -= 1) {
      const change = log[index];
      setRhythmNearest(tracker, change.side, change.index, change.oldNearest, edgeLists, changedIndices);
      if (change.oldNearest === undefined && change.index === tracker.nearest[change.side].length - 1) tracker.nearest[change.side].pop();
    }
    tracker.finalizedCount = finalizedCount;
  }
}

function candidatePlacement(card, state, columns, cardWidth, gap, captionPixelHeight, settings) {
  const literalSpan = card?.layoutSpan;
  const widths = literalSpan === 1 || literalSpan === 2 ? [literalSpan] : [1, 2];
  const controlStripHeight = mediaControlStripHeight(card);
  const candidates = [];
  for (const width of widths) {
    const mediaPixelWidth = width * cardWidth + (width - 1) * gap;
    const media = layoutMedia(card);
    const mediaPixelHeight = mediaPixelWidth * media.height / media.width;
    const pixelHeight = mediaPixelHeight + controlStripHeight + captionPixelHeight;
    for (let left = 0; left <= columns - width; left += 1) {
      const occupied = state.columnBottoms.slice(left, left + width);
      if (width === 1) {
        const y = occupied[0] ? occupied[0] + gap : 0;
        candidates.push({ left, y, cavity: 0, width, mediaPixelWidth, mediaPixelHeight, pixelHeight });
        continue;
      }
      const empty = occupied.map((bottom) => bottom === 0);
      if (empty.every(Boolean)) candidates.push({ left, y: 0, cavity: 0, width, mediaPixelWidth, mediaPixelHeight, pixelHeight });
      else if (!empty.some(Boolean)) {
        const high = Math.max(...occupied);
        const low = Math.min(...occupied);
        const y = high + gap;
        const cavity = y - low - gap;
        if (cavity <= 0.5 * cardWidth + 0.05) candidates.push({ left, y, cavity, width, mediaPixelWidth, mediaPixelHeight, pixelHeight });
      }
    }
  }
  const placements = candidates.map(({ left, y, cavity, width, mediaPixelWidth, mediaPixelHeight, pixelHeight }) => ({
    card, left, top: y, width, height: pixelHeight, x: left * (cardWidth + gap), y,
    pixelWidth: mediaPixelWidth, mediaPixelHeight, captionPixelHeight, pixelHeight, cavity,
  }));
  return placements;
}

// Public photos have a fixed span; legacy controls cannot influence geometry or cache identity.
export function compileAdvertisingProductLayout(options = {}) {
  const cards = Array.isArray(options.cards)
    ? options.cards.map((card) => ({ ...card, layoutSpan: 1 }))
    : options.cards;
  const settings = normalizeAdvertisingProductSettings(options.settings);
  const compileOptions = { ...options, cards, settings, captionPixelHeight: options.captionPixelHeight ?? 0, productLayout: true };
  const requestedOrder = options.presentationOrder;
  const totalBudget = options.operationBudget ?? ADVERTISING_SEARCH_OPERATION_BUDGET;
  const canSolveOrganicOrder = options.organicOrder === true
    && Array.isArray(requestedOrder)
    && Number.isInteger(totalBudget)
    && totalBudget >= 1
    && totalBudget <= ADVERTISING_SEARCH_OPERATION_BUDGET;
  if (!canSolveOrganicOrder) {
    const layout = compileAdvertisingLayout(compileOptions);
    return { ...layout, settings };
  }

  const eligibleCards = options.filter && options.filter !== "all"
    ? cards.filter((card) => card.category === options.filter)
    : cards;
  const solution = solveAdvertisingOrganicPresentationOrder(eligibleCards, requestedOrder);
  const hardSafe = compileAdvertisingLayout(compileOptions);
  const hardSafeRhythm = scoreAdvertisingOrganicRhythm(hardSafe.placements);
  const hardSafeSpread = Math.max(0, ...hardSafe.columnBottoms) - Math.min(...hardSafe.columnBottoms);
  let layout = hardSafe;
  let actual = hardSafeRhythm;
  let operations = hardSafe.diagnostics.operations;
  let fallbackReason = solution?.fallbackReason || "order-not-optimized";
  if (solution?.applied && operations < totalBudget) {
    const remainingBudget = totalBudget - operations;
    try {
      const candidate = compileAdvertisingLayout({
        ...compileOptions,
        presentationOrder: solution.cards.map(({ id }) => id),
        operationBudget: remainingBudget,
      });
      operations += candidate.diagnostics.operations;
      const candidateRhythm = scoreAdvertisingOrganicRhythm(candidate.placements);
      const candidateSpread = Math.max(0, ...candidate.columnBottoms) - Math.min(...candidate.columnBottoms);
      if (candidateRhythm.score > hardSafeRhythm.score
        || (candidateRhythm.score === hardSafeRhythm.score && candidateSpread < hardSafeSpread)) {
        layout = candidate;
        actual = candidateRhythm;
        fallbackReason = actual.targetMet === false ? "geometry-placement-order" : null;
      } else {
        fallbackReason = "soft-score-not-improved";
      }
    } catch (error) {
      if (error?.diagnostic?.code !== "search-exhausted") throw error;
      operations += Math.min(remainingBudget, Number(error.diagnostic.operations) || remainingBudget);
      fallbackReason = "hard-safe-requested-order";
    }
  } else if (solution?.applied) {
    fallbackReason = "hard-safe-requested-order";
  }
  layout.diagnostics = {
    ...layout.diagnostics,
    operations,
    budget: totalBudget,
    organicRhythm: { actual, fallbackReason },
  };
  return { ...layout, settings };
}

/**
 * @param {any} [options]
 */
function compileAdvertisingLayoutPhase(options = {}) {
  const productLayout = options?.productLayout === true;
  const staggerMode = options?.staggerMode === "fallback" ? "fallback" : "preferred";
  let layoutViewportWidth = Number.NaN, filter = "all", cards = [], categoryOrder = [], datasetVersion = DEFAULT_DATASET_VERSION;
  let settings, columns, outer, interCardGap, initialColumnBottoms, operationBudget;
  let terminalPhotoPeek, continuousDetail, suppliedCaptionPixelHeight, requestedPresentationOrder;
  try {
    if (!options || typeof options !== "object" || Array.isArray(options)) throw new Error("Advertising layout options must be an object");
    layoutViewportWidth = options.layoutViewportWidth ?? Number.NaN;
    filter = options.filter ?? "all";
    cards = options.cards ?? [];
    requestedPresentationOrder = options.presentationOrder;
    categoryOrder = options.categoryOrder ?? [];
    datasetVersion = options.datasetVersion ?? DEFAULT_DATASET_VERSION;
    settings = normalizeAdvertisingSettings(options.settings);
    columns = options.columns ?? columnsForWidth(layoutViewportWidth);
    operationBudget = options.operationBudget ?? ADVERTISING_SEARCH_OPERATION_BUDGET;
    suppliedCaptionPixelHeight = options.captionPixelHeight;
    if (!Number.isInteger(operationBudget) || operationBudget < 1 || operationBudget > ADVERTISING_SEARCH_OPERATION_BUDGET) throw new Error("Invalid advertising operation budget");
    if (suppliedCaptionPixelHeight !== undefined && (!Number.isFinite(suppliedCaptionPixelHeight) || suppliedCaptionPixelHeight < 0)) throw new Error("Invalid advertising caption height");
    validateAdvertisingCards(cards, { categoryOrder });
    if (!Number.isFinite(layoutViewportWidth) || layoutViewportWidth <= 0) throw new Error("Invalid advertising viewport width");
    if (!Number.isInteger(columns) || columns < (productLayout ? 1 : ADVERTISING_MIN_COLUMNS) || columns > ADVERTISING_MAX_COLUMNS) throw new Error(`Invalid advertising column count: ${columns}`);
    terminalPhotoPeek = options.terminalPhotoPeek;
    continuousDetail = options.continuousDetail ?? false;
    if (typeof continuousDetail !== "boolean") throw new Error("Invalid continuous detail option");
    if (terminalPhotoPeek !== undefined) {
      if (!terminalPhotoPeek || typeof terminalPhotoPeek !== "object" || Array.isArray(terminalPhotoPeek)) throw new Error("Invalid terminal photo peek");
      const fields = ["primaryWidth", "primaryHeight", "primaryTop", "viewportHeight", "safeBottom", "belowPeek", "gap"];
      if (fields.some((field) => !Number.isFinite(terminalPhotoPeek[field]) || terminalPhotoPeek[field] < 0)
        || terminalPhotoPeek.primaryWidth <= 0 || terminalPhotoPeek.primaryHeight <= 0 || terminalPhotoPeek.viewportHeight <= 0 || terminalPhotoPeek.belowPeek <= 0) {
        throw new Error("Invalid terminal photo peek");
      }
      terminalPhotoPeek = Object.fromEntries(fields.map((field) => [field, terminalPhotoPeek[field]]));
    }
    const suppliedInitialColumnBottoms = options.initialColumnBottoms;
    if (suppliedInitialColumnBottoms === undefined) initialColumnBottoms = Array(columns).fill(0);
    else if (!Array.isArray(suppliedInitialColumnBottoms) || suppliedInitialColumnBottoms.length !== columns || suppliedInitialColumnBottoms.some((bottom) => !Number.isFinite(bottom) || bottom < 0)) {
      throw new Error("Invalid initialColumnBottoms: expected one finite non-negative bottom per column");
    } else initialColumnBottoms = suppliedInitialColumnBottoms.slice();
    if (filter !== "all" && !categoryOrder.includes(filter)) throw new Error(`Unknown advertising filter: ${filter}`);
    ({ outer, interCardGap } = advertisingSpacing(layoutViewportWidth));
  } catch (error) {
    throw layoutError("invalid-input", { filter, width: layoutViewportWidth, ids: Array.isArray(cards) ? cards.map((card) => card?.id).filter(Boolean) : [], violation: error.message });
  }

  const availableWidth = layoutViewportWidth - (2 * outer);
  const cardWidth = (availableWidth - interCardGap * (columns - 1)) / columns;
  if (cardWidth <= 0) throw layoutError("invalid-input", { filter, width: layoutViewportWidth, ids: [], violation: "Advertising columns do not fit the viewport" });
  const captionPixelHeight = suppliedCaptionPixelHeight ?? (productLayout ? 0 : 10 + (layoutViewportWidth <= 578 ? 15.68 : 17.92));
  const canonicalPool = (filter === "all" ? cards : cards.filter((card) => card.category === filter)).slice().sort(bySource);
  let pool = canonicalPool;
  if (requestedPresentationOrder !== undefined) {
    const poolById = new Map(canonicalPool.map((card) => [card.id, card]));
    if (!Array.isArray(requestedPresentationOrder)
      || requestedPresentationOrder.length !== canonicalPool.length
      || new Set(requestedPresentationOrder).size !== canonicalPool.length
      || requestedPresentationOrder.some((id) => typeof id !== "string" || !poolById.has(id))) {
      throw layoutError("invalid-input", {
        filter,
        width: layoutViewportWidth,
        ids: Array.isArray(requestedPresentationOrder) ? requestedPresentationOrder : [],
        violation: "presentation order must be an exact permutation of eligible filter IDs",
      });
    }
    pool = requestedPresentationOrder.map((id) => poolById.get(id));
  }
  const realProductCount = pool.filter((card) => card.kind !== "suggestion").length;
  const mediaMinima = pool.map((card) => {
    const span = card.layoutSpan === 2 ? 2 : 1;
    const media = layoutMedia(card);
    return { id: card.id, height: (span * cardWidth + (span - 1) * interCardGap) * media.height / media.width };
  }).sort((a, b) => a.height - b.height || a.id.localeCompare(b.id));
  /** @param {any} state @param {Record<string, any>} [diagnostics] */
  const makeResult = (state, diagnostics = {}) => {
    const placements = state.placements.slice().sort(comparePlacement)
      .map(({ cavity, ...placement }, index) => ({ ...placement, index }));
    const totalPixelHeight = Math.max(0, ...state.columnBottoms);
    const coordinates = placements.map(({ card, left, width, x, y, pixelWidth, mediaPixelHeight, captionPixelHeight: captionHeight, pixelHeight }) => {
      const media = layoutMedia(card);
      return `${card.id}:${card.category}:${card.sourceOrder}:${String(card.layoutSpan ?? "auto")}@${left},${width},${x.toFixed(6)},${y.toFixed(6)},${pixelWidth.toFixed(6)},${mediaPixelHeight.toFixed(6)},${captionHeight.toFixed(6)},${pixelHeight.toFixed(6)},${media.width}x${media.height}`;
    }).join("|");
    const coordinateHash = fnv1a32(`${datasetVersion}:${ADVERTISING_LAYOUT_ALGORITHM_VERSION}:${CAPTION_METRICS_VERSION}:${staggerMode}:${JSON.stringify(settings)}:${filter}:${layoutViewportWidth}:${columns}:${JSON.stringify(initialColumnBottoms)}:${JSON.stringify(terminalPhotoPeek)}:${continuousDetail}:${pool.map(({ id }) => id).join(",")}:${coordinates || "empty"}`).toString(16).padStart(8, "0");
    return { columns, filter, settings, staggerBasis: productLayout ? "image-height" : "column-width", staggerMinimumRatio: productLayout ? 0.10 : null, outer, interCardGap, spacing: { outer, interCardGap }, availableWidth, gridWidth: availableWidth, cardWidth, placements, initialColumnBottoms: initialColumnBottoms.slice(), columnBottoms: state.columnBottoms.slice(), totalHeight: totalPixelHeight, totalPixelHeight, coordinateHash, diagnostics: { ...diagnostics, algorithm: ADVERTISING_LAYOUT_ALGORITHM_VERSION, placementOrder: pool.map(({ id }) => id), staggerMode } };
  };
  const state = {
    productLayout,
    placements: [],
    columnBottoms: initialColumnBottoms.slice(),
    edges: Array.from({ length: columns }, () => ({ image: [], card: [] })),
    rhythms: Array.from({ length: columns - 1 }, () => ({ image: createRhythmTracker(cardWidth), card: createRhythmTracker(cardWidth) })),
    mutableBrick: false,
    interCardGap,
    captionPixelHeight,
    minimumMediaHeight: mediaMinima[0]?.height ?? Infinity,
    staggerMinimumRatio: 0.10,
    enforceStagger: productLayout && staggerMode === "preferred",
    allowAlignedFallback: productLayout && staggerMode === "fallback",
    staggerViolations: 0,
  };
  if (!pool.length) return makeResult(state, { operations: 0 });

  const remaining = pool.slice();
  const placedIds = new Set();
  let minimumMediaIndex = 0;
  let operations = 0;
  let deepest = 0;
  let antiBrickLeafRejects = 0;
  let finalizedBrickRejects = 0;
  let mutableBrickDeferrals = 0;
  let mutableBrickBranches = 0;
  let terminalPhotoPeekRejects = 0;
  let preferredCandidateAttempts = 0;
  let alignedCandidateAttempts = 0;
  const frames = [];
  const consumeOperation = () => {
    if (operations >= operationBudget) throw layoutError("search-exhausted", { filter, width: layoutViewportWidth, ids: remaining.map((item) => item.id), violation: "operation-budget", budget: operationBudget, depth: state.placements.length, operations });
    operations += 1;
  };

  const candidatesAtDepth = () => {
    const candidates = [];
    const seenShapes = new Set();
    const window = productLayout ? Math.min(remaining.length, 1) : Math.min(remaining.length, SEARCH_WINDOW_SIZE);
    for (let cardIndex = 0; cardIndex < window && (productLayout || candidates.length < SEARCH_CANDIDATE_LIMIT); cardIndex += 1) {
      const card = remaining[cardIndex];
      for (const placement of candidatePlacement(card, state, columns, cardWidth, interCardGap, captionPixelHeight, settings)) {
        const shape = `${placement.left}:${placement.mediaPixelHeight}:${card.kind || "photo"}`;
        if (productLayout && seenShapes.has(shape)) continue;
        seenShapes.add(shape);
        consumeOperation();
        if (hasGeometryConflict(state, placement, columns, cardWidth)) continue;
        const staggerViolations = productLayout ? productStaggerViolations(state, placement, columns) : 0;
        if (staggerViolations) alignedCandidateAttempts += 1;
        else preferredCandidateAttempts += 1;
        const columnBottoms = state.columnBottoms.slice();
        for (const column of spanColumns(placement)) columnBottoms[column] = placement.y + placement.pixelHeight;
        const score = productLayout
          ? placement.y
          : Math.max(...columnBottoms) + placement.cavity * 0.25 + (Math.max(...columnBottoms) - Math.min(...columnBottoms)) * 0.001;
        candidates.push({ cardIndex, placement, score, staggerViolations });
        if (!productLayout && candidates.length >= SEARCH_CANDIDATE_LIMIT) break;
      }
    }
    if (productLayout && candidates.length) {
      const minimumY = Math.min(...candidates.map(({ placement }) => placement.y));
      return candidates
        .filter(({ placement }) => Math.abs(placement.y - minimumY) <= 1e-9)
        .sort((a, b) => a.placement.left - b.placement.left || a.staggerViolations - b.staggerViolations)
        .slice(0, 1);
    }
    return candidates.sort((a, b) => a.staggerViolations - b.staggerViolations || a.score - b.score || bySource(a.placement.card, b.placement.card) || a.placement.left - b.placement.left).slice(0, SEARCH_CANDIDATE_LIMIT);
  };

  const apply = (candidate) => {
    const placement = candidate.placement;
    const occupied = spanColumns(placement);
    const snapshot = { candidate, bottoms: occupied.map((column) => state.columnBottoms[column]), edgeLengths: occupied.map((column) => [state.edges[column].image.length, state.edges[column].card.length]), rhythmLogs: [], mutableBrick: state.mutableBrick, minimumMediaIndex, staggerViolations: state.staggerViolations };
    placedIds.add(placement.card.id);
    while (minimumMediaIndex < mediaMinima.length && placedIds.has(mediaMinima[minimumMediaIndex].id)) minimumMediaIndex += 1;
    state.minimumMediaHeight = mediaMinima[minimumMediaIndex]?.height ?? Infinity;
    for (const column of occupied) state.columnBottoms[column] = placement.y + placement.pixelHeight;
    appendEdges(state, placement);
    state.staggerViolations += candidate.staggerViolations;
    const rhythm = appendRhythms(state, occupied, cardWidth, state.mutableBrick, state.allowAlignedFallback);
    snapshot.rhythmLogs = rhythm.logs;
    if (rhythm.conflict) {
      finalizedBrickRejects += 1;
      undoRhythms(snapshot.rhythmLogs);
      placedIds.delete(placement.card.id);
      minimumMediaIndex = snapshot.minimumMediaIndex;
      state.minimumMediaHeight = mediaMinima[minimumMediaIndex]?.height ?? Infinity;
      state.staggerViolations = snapshot.staggerViolations;
      occupied.forEach((column, index) => {
        state.columnBottoms[column] = snapshot.bottoms[index];
        state.edges[column].image.length = snapshot.edgeLengths[index][0];
        state.edges[column].card.length = snapshot.edgeLengths[index][1];
      });
      return null;
    }
    state.mutableBrick = rhythm.mutableBrick;
    remaining.splice(candidate.cardIndex, 1);
    state.placements.push(placement);
    return snapshot;
  };

  const undo = (snapshot) => {
    const placement = state.placements.pop();
    placedIds.delete(placement.card.id);
    minimumMediaIndex = snapshot.minimumMediaIndex;
    state.minimumMediaHeight = mediaMinima[minimumMediaIndex]?.height ?? Infinity;
    const occupied = spanColumns(placement);
    undoRhythms(snapshot.rhythmLogs);
    state.mutableBrick = snapshot.mutableBrick;
    state.staggerViolations = snapshot.staggerViolations;
    occupied.forEach((column, index) => {
      state.columnBottoms[column] = snapshot.bottoms[index];
      state.edges[column].image.length = snapshot.edgeLengths[index][0];
      state.edges[column].card.length = snapshot.edgeLengths[index][1];
    });
    remaining.splice(snapshot.candidate.cardIndex, 0, placement.card);
  };

  while (true) {
    const depth = state.placements.length;
    if (depth === pool.length) {
      const terminals = Array.from({ length: columns }, (_, column) => {
        const placement = state.placements.findLast((item) => item.card.kind !== "suggestion" && spanColumns(item).includes(column));
        return placement ? { placement, bottom: placement.y + placement.pixelHeight } : null;
      }).filter(Boolean);
      const tailSpread = terminals.length ? Math.max(...terminals.map((entry) => entry.bottom)) - Math.min(...terminals.map((entry) => entry.bottom)) : 0;
      const tailsFilled = !productLayout || (
        tailSpread <= Math.max(0, ...terminals.map((entry) => entry.placement.pixelHeight)) + interCardGap + 0.05 &&
        (realProductCount < columns || terminals.length === columns)
      );
      const hasPhotoPeek = terminalPhotoPeek === undefined || state.placements.some((placement) => {
        const imageTop = terminalPhotoPeek.primaryTop + placement.y;
        const visibleHeight = Math.min(
          terminalPhotoPeek.viewportHeight - terminalPhotoPeek.safeBottom,
          imageTop + placement.mediaPixelHeight,
        ) - imageTop;
        return placement.x < terminalPhotoPeek.primaryWidth
          && placement.y >= terminalPhotoPeek.primaryHeight + terminalPhotoPeek.gap - 0.05
          && visibleHeight >= terminalPhotoPeek.belowPeek - 0.05;
      });
      const photoPeekSatisfied = continuousDetail || hasPhotoPeek;
      const packingSatisfied = productLayout || continuousDetail || tailsFilled;
      const staggerSatisfied = state.allowAlignedFallback || state.staggerViolations === 0;
      if (packingSatisfied && photoPeekSatisfied && staggerSatisfied && (state.allowAlignedFallback || !hasBrickRhythm(state.edges, columns, cardWidth))) break;
      if (!hasPhotoPeek) terminalPhotoPeekRejects += 1;
      antiBrickLeafRejects += 1;
    }
    deepest = Math.max(deepest, depth);
    let frame = frames[depth];
    if (!frame) {
      frame = { candidates: candidatesAtDepth(), next: 0, snapshot: null };
      frames[depth] = frame;
    }
    if (frame.next < frame.candidates.length) {
      const candidate = frame.candidates[frame.next++];
      frame.snapshot = apply(candidate);
      if (!frame.snapshot) continue;
      if (!frame.snapshot.mutableBrick && state.mutableBrick && !candidate.allowMutableBrick) {
        undo(frame.snapshot);
        frame.snapshot = null;
        candidate.allowMutableBrick = true;
        frame.candidates.push(candidate);
        mutableBrickDeferrals += 1;
        consumeOperation();
        continue;
      }
      if (candidate.allowMutableBrick && state.mutableBrick) mutableBrickBranches += 1;
      frames.length = depth + 1;
      continue;
    }

    frames.length = depth;
    if (depth === 0 || depth <= deepest - SEARCH_BACKTRACK_DEPTH) {
      throw layoutError("search-exhausted", { filter, width: layoutViewportWidth, ids: remaining.map((card) => card.id), violation: "geometry-stagger-bridge-or-rhythm", budget: operationBudget, depth, deepest, operations });
    }
    const previous = frames[depth - 1];
    undo(previous.snapshot);
    previous.snapshot = null;
  }

  /** @type {Record<string, any>} */
  const diagnostics = { operations, antiBrickLeafRejects, finalizedBrickRejects, mutableBrickDeferrals, mutableBrickBranches, terminalPhotoPeekRejects, preferredCandidateAttempts, alignedCandidateAttempts };
  if (pool.length === 1) {
    diagnostics.code = "needs-media";
    diagnostics.ids = [pool[0].id];
  }
  return makeResult(state, diagnostics);
}

export function compileAdvertisingLayout(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options) || options.productLayout !== true) return compileAdvertisingLayoutPhase(options);
  const totalBudget = options.operationBudget ?? ADVERTISING_SEARCH_OPERATION_BUDGET;
  if (!Number.isInteger(totalBudget) || totalBudget < 1 || totalBudget > ADVERTISING_SEARCH_OPERATION_BUDGET) return compileAdvertisingLayoutPhase(options);
  const preferredBudget = Math.max(1, Math.ceil(totalBudget / 2));
  try {
    const layout = compileAdvertisingLayoutPhase({ ...options, operationBudget: preferredBudget, staggerMode: "preferred" });
    layout.diagnostics = { ...layout.diagnostics, operations: layout.diagnostics.operations, budget: totalBudget, preferredAttempts: layout.diagnostics.operations, fallbackAttempts: 0, fallbackUsed: false, fallbackReason: null, staggerMode: "preferred" };
    return layout;
  } catch (preferredError) {
    if (preferredError?.diagnostic?.code !== "search-exhausted") throw preferredError;
    const preferredAttempts = preferredError.diagnostic.operations;
    const fallbackBudget = totalBudget - preferredAttempts;
    if (fallbackBudget < 1) {
      preferredError.diagnostic = { ...preferredError.diagnostic, budget: totalBudget, preferredAttempts, fallbackAttempts: 0, fallbackUsed: false, fallbackReason: null, staggerMode: "preferred" };
      throw preferredError;
    }
    try {
      const layout = compileAdvertisingLayoutPhase({ ...options, operationBudget: fallbackBudget, staggerMode: "fallback" });
      layout.diagnostics = { ...layout.diagnostics, operations: preferredAttempts + layout.diagnostics.operations, budget: totalBudget, preferredAttempts, fallbackAttempts: layout.diagnostics.operations, fallbackUsed: true, fallbackReason: preferredError.diagnostic.violation, staggerMode: "fallback" };
      return layout;
    } catch (fallbackError) {
      if (fallbackError?.diagnostic?.code === "search-exhausted") {
        fallbackError.diagnostic = { ...fallbackError.diagnostic, operations: preferredAttempts + fallbackError.diagnostic.operations, budget: totalBudget, preferredAttempts, fallbackAttempts: fallbackError.diagnostic.operations, fallbackUsed: true, fallbackReason: preferredError.diagnostic.violation, staggerMode: "fallback" };
      }
      throw fallbackError;
    }
  }
}

export function getVirtualWindow(layout, { scrollTop = 0, viewportHeight = 900, overscan = 900 } = {}) {
  if (!layout?.placements || !Number.isFinite(scrollTop) || !Number.isFinite(viewportHeight) || viewportHeight < 0 || !Number.isFinite(overscan) || overscan < 0) {
    throw new Error("Invalid advertising virtual window input");
  }
  const start = Math.max(0, scrollTop - overscan);
  const end = scrollTop + viewportHeight + overscan;
  return { items: layout.placements.filter((item) => item.y + item.pixelHeight >= start && item.y <= end), totalHeight: layout.totalPixelHeight };
}
