const EPSILON = 0.05;

export const ANTI_BRICK_EVENT_DEFINITION =
  "For each adjacent column pair and edge kind, pair every edge with its nearest opposite-column different-item edge, deduplicate unordered item pairs, use leftY-rightY, sort by max(leftY,rightY) then stable IDs, and quantize with Math.round(offset/(0.125W)).";

function finite(value) {
  return Number.isFinite(value);
}

function compareIds(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareCards(a, b) {
  return a.y - b.y || a.x - b.x || compareIds(a.id, b.id);
}

function unorderedIds(a, b) {
  return a < b ? [a, b] : [b, a];
}

function nearestOpposite(edge, candidates) {
  let nearest = null;
  for (const candidate of candidates) {
    if (candidate.id === edge.id) continue;
    if (
      !nearest ||
      Math.abs(candidate.y - edge.y) < Math.abs(nearest.y - edge.y) ||
      (Math.abs(candidate.y - edge.y) === Math.abs(nearest.y - edge.y) &&
        (candidate.y < nearest.y ||
          (candidate.y === nearest.y && compareIds(candidate.id, nearest.id) < 0)))
    ) {
      nearest = candidate;
    }
  }
  return nearest;
}

function inspectAntiBrick(leftEdges, rightEdges, edgeKind, columns, cardWidth, add) {
  const eventsByPair = new Map();

  function consider(edge, candidates, edgeIsLeft) {
    const nearest = nearestOpposite(edge, candidates);
    if (!nearest) return;

    const left = edgeIsLeft ? edge : nearest;
    const right = edgeIsLeft ? nearest : edge;
    const ids = unorderedIds(left.id, right.id);
    const key = ids.join("\u0000");
    const candidate = {
      ids,
      offset: left.y - right.y,
      eventY: Math.max(left.y, right.y),
    };
    const current = eventsByPair.get(key);
    if (
      !current ||
      Math.abs(candidate.offset) < Math.abs(current.offset) ||
      (Math.abs(candidate.offset) === Math.abs(current.offset) && candidate.eventY < current.eventY)
    ) {
      eventsByPair.set(key, candidate);
    }
  }

  for (const edge of leftEdges) consider(edge, rightEdges, true);
  for (const edge of rightEdges) consider(edge, leftEdges, false);

  const quantum = 0.125 * cardWidth;
  const events = [...eventsByPair.values()]
    .map((event) => ({ ...event, level: Math.round(event.offset / quantum) }))
    .sort(
      (a, b) =>
        a.eventY - b.eventY ||
        compareIds(a.ids[0], b.ids[0]) ||
        compareIds(a.ids[1], b.ids[1]),
    );

  for (let index = 2; index < events.length; index += 1) {
    const window = events.slice(index - 2, index + 1);
    if (window.every(({ level }) => level === window[0].level)) {
      add("brick-same-level", {
        ids: [...new Set(window.flatMap(({ ids }) => ids))],
        columns,
        edgeKind,
        levels: window.map(({ level }) => level),
      });
    }
  }

  for (let index = 5; index < events.length; index += 1) {
    const window = events.slice(index - 5, index + 1);
    const levels = window.map(({ level }) => level);
    if (
      levels[0] !== levels[1] &&
      levels[0] === levels[2] &&
      levels[0] === levels[4] &&
      levels[1] === levels[3] &&
      levels[1] === levels[5]
    ) {
      add("brick-ababab", {
        ids: [...new Set(window.flatMap(({ ids }) => ids))],
        columns,
        edgeKind,
        levels,
      });
    }
  }
}

export function inspectAdvertisingRhythmEdges({ leftEdges, rightEdges, cardWidth } = {}) {
  const violations = [];
  if (!Array.isArray(leftEdges) || !Array.isArray(rightEdges) || !finite(cardWidth) || cardWidth <= 0) {
    return { valid: false, violations: [{ code: "invalid-input" }] };
  }
  inspectAntiBrick(leftEdges, rightEdges, "card", [0, 1], cardWidth, (code, detail) => violations.push({ code, ...detail }));
  return { valid: violations.length === 0, violations };
}

function inspectNearestStagger(leftEdges, rightEdges, edgeKind, columns, cardWidth, add, imageHeightBasis = false, staggerMinimumRatio = 0.20) {

  function inspect(edges, candidates) {
    for (const edge of edges) {
      const nearest = nearestOpposite(edge, candidates);
      const minimumStagger = imageHeightBasis && nearest
        ? staggerMinimumRatio * Math.max(edge.imageHeight, nearest.imageHeight)
        : 0.25 * cardWidth;
      if (!nearest || Math.abs(edge.y - nearest.y) + EPSILON >= minimumStagger) continue;
      add("stagger", {
        ids: [edge.id, nearest.id],
        columns,
        edgeKind,
        required: minimumStagger,
        actual: Math.abs(edge.y - nearest.y),
      });
    }
  }

  inspect(leftEdges, rightEdges);
  inspect(rightEdges, leftEdges);
}

export function inspectAdvertisingGrid({ layout, placements } = {}) {
  const violations = [];
  const seenViolations = new Set();
  const add = (code, detail = {}) => {
    const violation = { code, ...detail };
    const key = JSON.stringify(violation);
    if (!seenViolations.has(key)) {
      seenViolations.add(key);
      violations.push(violation);
    }
  };

  if (!layout || !Array.isArray(placements)) {
    add("invalid-input", { ids: [], columns: [] });
    return { valid: false, order: [], violations };
  }

  const { columns, cardWidth, interCardGap, gridWidth } = layout;
  if (
    !Number.isInteger(columns) ||
    columns < (layout.staggerBasis === "image-height" ? 1 : 2) ||
    columns > 4 ||
    !finite(cardWidth) ||
    cardWidth <= 0 ||
    !finite(interCardGap) ||
    interCardGap < 0 ||
    !finite(gridWidth) ||
    gridWidth <= 0
  ) {
    add("invalid-layout", { ids: [], columns: [] });
    return { valid: false, order: [], violations };
  }

  const expectedGridWidth = columns * cardWidth + (columns - 1) * interCardGap;
  if (Math.abs(gridWidth - expectedGridWidth) > EPSILON) {
    add("grid-width", { ids: [], columns: [], expected: expectedGridWidth, actual: gridWidth });
  }

  const ids = new Set();
  const cards = [];
  for (const placement of placements) {
    const id = typeof placement?.card?.id === "string" ? placement.card.id : "";
    if (!id || ids.has(id)) {
      add("invalid-id", { ids: id ? [id] : [], columns: [] });
      continue;
    }
    ids.add(id);

    const span = placement.width;
    const left = placement.left;
    const cardColumns = Number.isInteger(left) && Number.isInteger(span)
      ? Array.from({ length: span }, (_, offset) => left + offset)
      : [];
    if (
      !Number.isInteger(span) ||
      (span !== 1 && span !== 2) ||
      !Number.isInteger(left) ||
      left < 0 ||
      left + span > columns
    ) {
      add("invalid-span", { ids: [id], columns: cardColumns });
      continue;
    }

    const numericFields = [
      placement.x,
      placement.y,
      placement.pixelWidth,
      placement.mediaPixelHeight,
      placement.captionPixelHeight,
      placement.pixelHeight,
    ];
    if (numericFields.some((value) => !finite(value)) || placement.y < 0) {
      add("invalid-bounds", { ids: [id], columns: cardColumns });
      continue;
    }

    const expectedX = left * (cardWidth + interCardGap);
    const expectedPixelWidth = span * cardWidth + (span - 1) * interCardGap;
    if (Math.abs(placement.x - expectedX) > EPSILON) {
      add("x-position", { ids: [id], columns: cardColumns, expected: expectedX, actual: placement.x });
    }
    if (Math.abs(placement.pixelWidth - expectedPixelWidth) > EPSILON) {
      add("span-width", {
        ids: [id],
        columns: cardColumns,
        expected: expectedPixelWidth,
        actual: placement.pixelWidth,
      });
    }
    if (placement.x < -EPSILON || placement.x + placement.pixelWidth > gridWidth + EPSILON) {
      add("horizontal-overflow", { ids: [id], columns: cardColumns });
    }

    const mediaWidth = placement.card?.media?.width;
    const mediaHeight = placement.card?.media?.height;
    if (!finite(mediaWidth) || mediaWidth <= 0 || !finite(mediaHeight) || mediaHeight <= 0) {
      add("invalid-ratio", { ids: [id], columns: cardColumns });
    } else {
      const expectedMediaHeight = placement.pixelWidth * mediaHeight / mediaWidth;
      if (Math.abs(placement.mediaPixelHeight - expectedMediaHeight) > EPSILON) {
        add("natural-ratio", {
          ids: [id],
          columns: cardColumns,
          expected: expectedMediaHeight,
          actual: placement.mediaPixelHeight,
        });
      }
    }
    if (
      placement.mediaPixelHeight <= 0 ||
      placement.captionPixelHeight < 0 ||
      placement.pixelHeight <= 0 ||
      Math.abs(
        placement.pixelHeight - (placement.mediaPixelHeight + placement.captionPixelHeight)
      ) > EPSILON
    ) {
      add("vertical-bounds", { ids: [id], columns: cardColumns });
    }

    cards.push({
      ...placement,
      id,
      media: placement.card.media,
      span,
      cardColumns,
      imageBottom: placement.y + placement.mediaPixelHeight,
      bottom: placement.y + placement.pixelHeight,
    });
  }

  const orderedCards = [...cards].sort(compareCards);
  const order = orderedCards.map(({ id }) => id);
  if (cards.map(({ id }) => id).some((id, index) => id !== order[index])) {
    add("order-mismatch", { ids: cards.map(({ id }) => id), columns: [], expected: order });
  }

  for (let first = 0; first < cards.length; first += 1) {
    for (let second = first + 1; second < cards.length; second += 1) {
      const a = cards[first];
      const b = cards[second];
      const horizontal = Math.min(a.x + a.pixelWidth, b.x + b.pixelWidth) - Math.max(a.x, b.x);
      const vertical = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
      if (horizontal > EPSILON && vertical > EPSILON) {
        add("overlap", { ids: [a.id, b.id], columns: [...new Set([...a.cardColumns, ...b.cardColumns])] });
      }
    }
  }

  const byColumn = Array.from({ length: columns }, () => []);
  const initialColumnBottoms = layout.initialColumnBottoms === undefined
    ? Array(columns).fill(0)
    : layout.initialColumnBottoms;
  if (!Array.isArray(initialColumnBottoms) || initialColumnBottoms.length !== columns || initialColumnBottoms.some((bottom) => !finite(bottom) || bottom < 0)) {
    add("initial-column-bottoms", { ids: [], columns: [] });
    return { valid: false, order: [], violations };
  }
  for (const card of cards) {
    for (const column of card.cardColumns) byColumn[column].push(card);
  }
  for (const columnCards of byColumn) columnCards.sort(compareCards);

  for (const card of orderedCards) {
    if (card.span === 1) {
      const sequence = byColumn[card.left];
      const index = sequence.indexOf(card);
      if (index === 0) {
        const initialBottom = initialColumnBottoms[card.left];
        const expected = initialBottom ? initialBottom + interCardGap : 0;
        if (Math.abs(card.y - expected) > EPSILON) {
          add("first-column-start", { ids: [card.id], columns: [card.left], expected, actual: card.y });
        }
      } else {
        const expected = sequence[index - 1].bottom + interCardGap;
        if (Math.abs(card.y - expected) > EPSILON) {
          add("span1-gap", { ids: [sequence[index - 1].id, card.id], columns: [card.left], expected, actual: card.y });
        }
      }
      continue;
    }

    const leftSequence = byColumn[card.left];
    const rightSequence = byColumn[card.left + 1];
    const leftIndex = leftSequence.indexOf(card);
    const rightIndex = rightSequence.indexOf(card);
    const leftPrevious = leftIndex > 0 ? leftSequence[leftIndex - 1] : null;
    const rightPrevious = rightIndex > 0 ? rightSequence[rightIndex - 1] : null;
    const bridgeColumns = [card.left, card.left + 1];

    const leftBottom = leftPrevious?.bottom ?? initialColumnBottoms[card.left];
    const rightBottom = rightPrevious?.bottom ?? initialColumnBottoms[card.left + 1];
    const leftHasSurface = Boolean(leftPrevious) || leftBottom > 0;
    const rightHasSurface = Boolean(rightPrevious) || rightBottom > 0;
    if (!leftHasSurface && !rightHasSurface) {
      if (Math.abs(card.y) > EPSILON) add("first-column-start", { ids: [card.id], columns: bridgeColumns, expected: 0, actual: card.y });
      continue;
    }
    if (!leftHasSurface || !rightHasSurface) {
      add("bridge-empty-column", {
        ids: [leftPrevious?.id, rightPrevious?.id, card.id].filter(Boolean),
        columns: bridgeColumns,
      });
      continue;
    }

    const highBottom = Math.max(leftBottom, rightBottom);
    const lowBottom = Math.min(leftBottom, rightBottom);
    const expected = highBottom + interCardGap;
    if (Math.abs(card.y - expected) > EPSILON) {
      add("bridge-top", {
        ids: [leftPrevious?.id, rightPrevious?.id, card.id].filter(Boolean),
        columns: bridgeColumns,
        expected,
        actual: card.y,
      });
    }
    const excessGap = Math.max(0, card.y - lowBottom - interCardGap);
    if (excessGap > 0.5 * cardWidth + EPSILON) {
      add("bridge-cavity", {
        ids: [leftPrevious?.id, rightPrevious?.id, card.id].filter(Boolean),
        columns: bridgeColumns,
        allowed: 0.5 * cardWidth + EPSILON,
        actual: excessGap,
      });
    }
  }

  const edgeKinds = [
    ["image", "imageBottom"],
    ["card", "bottom"],
  ];
  const imageHeightBasis = layout.staggerBasis === "image-height";
  const staggerMinimumRatio = imageHeightBasis && Number.isFinite(layout.staggerMinimumRatio)
    ? layout.staggerMinimumRatio
    : 0.20;
  const allowsAlignedFallback = imageHeightBasis && layout.diagnostics?.staggerMode === "fallback";
  for (let leftColumn = 0; leftColumn < columns - 1; leftColumn += 1) {
    const rightColumn = leftColumn + 1;
    const pairColumns = [leftColumn, rightColumn];
    for (const [edgeKind, property] of edgeKinds) {
      const leftEdges = byColumn[leftColumn].map((card) => ({ id: card.id, y: card[property], imageHeight: card.mediaPixelHeight }));
      const rightEdges = byColumn[rightColumn].map((card) => ({ id: card.id, y: card[property], imageHeight: card.mediaPixelHeight }));
      if (!allowsAlignedFallback && (!imageHeightBasis || edgeKind === "image")) inspectNearestStagger(leftEdges, rightEdges, edgeKind, pairColumns, cardWidth, add, imageHeightBasis, staggerMinimumRatio);
      if (!allowsAlignedFallback) inspectAntiBrick(leftEdges, rightEdges, edgeKind, pairColumns, cardWidth, add);
    }

    const leftTerminal = byColumn[leftColumn].reduce(
      (best, card) => (!best || card.bottom > best.bottom ? card : best),
      null,
    );
    const rightTerminal = byColumn[rightColumn].reduce(
      (best, card) => (!best || card.bottom > best.bottom ? card : best),
      null,
    );
    if (!allowsAlignedFallback && leftTerminal && rightTerminal && leftTerminal.id !== rightTerminal.id) {
      const minimumStagger = imageHeightBasis ? staggerMinimumRatio * Math.max(leftTerminal.mediaPixelHeight, rightTerminal.mediaPixelHeight) : 0.25 * cardWidth;
      const distance = Math.abs(imageHeightBasis ? leftTerminal.imageBottom - rightTerminal.imageBottom : leftTerminal.bottom - rightTerminal.bottom);
      if (distance + EPSILON < minimumStagger) {
        add("terminal-stagger", {
          ids: [leftTerminal.id, rightTerminal.id],
          columns: pairColumns,
          required: minimumStagger,
          actual: distance,
        });
      }
    }
  }

  if (imageHeightBasis) {
    const realByColumn = byColumn.map((sequence) => sequence.filter((card) => card.card?.kind !== "suggestion"));
    const realCards = cards.filter((card) => card.card?.kind !== "suggestion");
    const terminals = realByColumn.map((sequence, column) => {
      const card = sequence.at(-1);
      return card ? { ...card, contributionBottom: card.bottom } : null;
    }).filter(Boolean);
    if (terminals.length > 1) {
      const spread = Math.max(...terminals.map((card) => card.contributionBottom)) - Math.min(...terminals.map((card) => card.contributionBottom));
      const allowed = Math.max(...terminals.map((card) => card.pixelHeight)) + interCardGap;
      if (spread > allowed + EPSILON) add("terminal-fill", { ids: terminals.map((card) => card.id), actual: spread, allowed });
    }
    if (realCards.length >= columns) {
      realByColumn.forEach((sequence, column) => {
        if (!sequence.length) add("empty-column", { columns: [column] });
      });
    }
  }

  return { valid: violations.length === 0, order, violations };
}
