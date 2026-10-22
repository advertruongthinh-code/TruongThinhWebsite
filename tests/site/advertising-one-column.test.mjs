import assert from "node:assert/strict";
import { test } from "node:test";
import { ADVERTISING_CARDS, ADVERTISING_CATEGORIES, compileAdvertisingLayout } from "../../src/site/advertising-products/catalog.mjs";
import { inspectAdvertisingGrid } from "./advertising-grid-oracle.mjs";
import { columnsForWidth, computeAdvertisingPhotoGeometry, compileAdvertisingProductLayout, matchesAdvertisingFilter, solveAdvertisingOrganicPresentationOrder } from "../../src/site/advertising-products/layout-core.mjs";

const previousWindow = globalThis.window;
globalThis.window = {};
const { compileAdvertisingRelatedLayout } = await import("../../src/site/advertising-products/catalog-runtime.mjs");
if (previousWindow === undefined) delete globalThis.window;
else globalThis.window = previousWindow;

const categoryOrder = ADVERTISING_CATEGORIES.map(({ slug }) => slug);
const widths = [320, 390, 734, 735, 736, 749, 750, 751, 768, 820, 959, 960, 961, 1024, 1199, 1200, 1201, 1440, 1920, 2560];

function oracleFixture(heights, { caption = 0, seeds = [0, 0] } = {}) {
  const cardWidth = 172.5;
  const interCardGap = 15;
  const placements = heights.map((height, left) => ({
    card: { id: `fixture-${left}`, media: { width: cardWidth, height } },
    left, width: 1, x: left * (cardWidth + interCardGap), y: seeds[left] ? seeds[left] + interCardGap : 0,
    pixelWidth: cardWidth, mediaPixelHeight: height, captionPixelHeight: caption, pixelHeight: height + caption,
  })).sort((a, b) => a.y - b.y || a.x - b.x);
  return { layout: { columns: 2, cardWidth, interCardGap, gridWidth: 360, initialColumnBottoms: seeds, staggerBasis: "image-height" }, placements };
}

test("stagger uses the larger image height and excludes caption height", () => {
  for (const caption of [0, 1000]) {
    const atThreshold = inspectAdvertisingGrid(oracleFixture([480, 600], { caption }));
    assert.equal(atThreshold.valid, true, JSON.stringify(atThreshold.violations));
    const belowThreshold = inspectAdvertisingGrid(oracleFixture([500, 600], { caption }));
    const violation = belowThreshold.violations.find((v) => v.code === "stagger");
    assert.ok(violation, JSON.stringify(belowThreshold.violations));
    assert.equal(violation.required, 120);
    assert.equal(violation.actual, 100);
  }
});

test("D9 keeps the 10 percent preferred threshold and rejects overlap in fallback", () => {
  const preferred = oracleFixture([540, 600]);
  preferred.layout = { ...preferred.layout, staggerMinimumRatio: 0.10, diagnostics: { staggerMode: "preferred" } };
  assert.equal(inspectAdvertisingGrid(preferred).valid, true, "exactly 10 percent of the taller image is valid in the preferred phase");

  const belowPreferred = oracleFixture([541, 600]);
  belowPreferred.layout = { ...belowPreferred.layout, staggerMinimumRatio: 0.10, diagnostics: { staggerMode: "preferred" } };
  const stagger = inspectAdvertisingGrid(belowPreferred).violations.find(({ code }) => code === "stagger");
  assert.ok(stagger, "a distance below 10 percent remains invalid in the preferred phase");
  assert.equal(stagger.required, 60);
  assert.equal(stagger.actual, 59);

  const fallback = oracleFixture([540, 600]);
  fallback.layout = { ...fallback.layout, staggerMinimumRatio: 0.10, diagnostics: { staggerMode: "fallback" } };
  fallback.placements[1] = { ...fallback.placements[1], left: 0, x: 0, y: 0 };
  assert.ok(inspectAdvertisingGrid(fallback).violations.some(({ code }) => code === "overlap"), "aligned fallback never permits physical overlap");
});

test("reserved regions cannot hide visually uneven real-photo tails", () => {
  const result = inspectAdvertisingGrid(oracleFixture([100, 140], { caption: 25.68, seeds: [1000, 0] }));
  const violation = result.violations.find((v) => v.code === "terminal-fill");
  assert.ok(violation);
  assert.equal(violation.actual, 975);
  assert.equal(violation.allowed, 180.68);
});

function assertOneColumn(layout, label) {
  assert.ok(layout.placements.every((p) => p.width === 1), `${label}: every item occupies one column`);
  for (const p of layout.placements) {
    assert.ok(Math.abs(p.pixelWidth - layout.cardWidth) < 0.05, `${label}: natural width`);
    assert.ok(Math.abs(p.mediaPixelHeight - p.pixelWidth * p.card.media.height / p.card.media.width) < 0.05, `${label}: natural height`);
  }
  assert.ok(layout.diagnostics.operations <= 300000, `${label}: operation budget`);
  for (const p of layout.placements) {
    const reservedBottom = layout.initialColumnBottoms[p.left];
    if (reservedBottom > 0) assert.ok(p.y >= reservedBottom + layout.interCardGap - 0.05, `${label}: reserved primary area remains clear`);
  }
}

function viewportForWidth(layoutViewportWidth) {
  if (layoutViewportWidth <= 750) return { layoutViewportWidth, viewportHeight: layoutViewportWidth <= 320 ? 740 : 844, headerHeight: 72.59375 };
  if (layoutViewportWidth <= 960) return { layoutViewportWidth, viewportHeight: 1180, headerHeight: 132.78125 };
  if (layoutViewportWidth <= 1200) return { layoutViewportWidth, viewportHeight: 768, headerHeight: 85.390625 };
  return { layoutViewportWidth, viewportHeight: layoutViewportWidth >= 1920 ? 1440 : 912, headerHeight: 102.515625 };
}

function overlaps(a, b) {
  return Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.05
    && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0.05;
}

function assertSourceOrderShortestFrontier(layout, cards, label) {
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const orderedCards = layout.diagnostics.placementOrder.map((id) => cardsById.get(id));
  const placementsById = new Map(layout.placements.map((placement) => [placement.card.id, placement]));
  const columnBottoms = layout.initialColumnBottoms.slice();
  assert.ok(orderedCards.every(Boolean), `${label}: placement order references only result cards`);
  assert.deepEqual(new Set(layout.diagnostics.placementOrder), new Set(cards.map(({ id }) => id)),
    `${label}: placement order preserves every source card`);
  for (const card of orderedCards) {
    const placement = placementsById.get(card.id);
    assert.ok(placement, `${label}: missing ${card.id}`);
    const frontier = columnBottoms.map((bottom) => bottom ? bottom + layout.interCardGap : 0);
    const minimumY = Math.min(...frontier);
    const expectedLeft = frontier.findIndex((y) => Math.abs(y - minimumY) <= 1e-9);
    assert.ok(Math.abs(placement.y - minimumY) <= 0.05,
      `${label}: ${card.id} y=${placement.y} skipped shortest y=${minimumY}`);
    assert.equal(placement.left, expectedLeft,
      `${label}: ${card.id} did not use the leftmost shortest column`);
    columnBottoms[placement.left] = placement.y + placement.pixelHeight;
  }
}

function assertRelated(result, label) {
  assertOneColumn(result.layout, label);
  assert.equal(result.primary.columns, result.layout.columns, `${label}: primary recomputed for final columns`);
  assert.equal(result.layout.placements.length, result.cards.length, `${label}: solver contains only real photos`);
  assert.equal(result.photoPlacements.length, result.cards.length, `${label}: photo placements contain every related photo`);
  assert.ok(result.layout.placements.every((placement) => placement.card.kind !== "suggestion"), `${label}: suggestion is not a fake solver card`);
  assert.deepEqual(result.photoPlacements.map((placement) => placement.card.id).sort(), result.cards.map((card) => card.id).sort(), `${label}: real-photo IDs preserved`);
  assertSourceOrderShortestFrontier(result.layout, result.cards, label);

  const attempts = result.layout.diagnostics.attempts;
  assert.ok(attempts.length >= 1 && attempts.length <= 2, `${label}: related layout uses alongside and at most one below-primary fallback`);
  assert.equal(attempts[0].mode, "alongside", `${label}: related diagnostics identify the continuous branch`);
  assert.ok(attempts.every((attempt) => attempt.columns === result.layout.columns), `${label}: attempts preserve the fixed column count`);
  if (attempts[1]) {
    assert.equal(attempts[1].mode, "below-primary", `${label}: sparse fallback starts a real next row`);
    assert.ok(result.photoPlacements.every((placement) => placement.y >= result.primary.height + result.primary.gap - 0.05),
      `${label}: below-primary fallback does not occupy primary columns`);
  }
  assert.equal(result.layout.diagnostics.operations, attempts.reduce((sum, attempt) => sum + attempt.operations, 0), `${label}: attempts share one operation budget`);
  assert.equal(result.layout.diagnostics.budget, 300000, `${label}: aggregate diagnostic keeps the total operation budget`);
}

test("public grid uses one column for all groups and ignores retired span controls", () => {
  for (const width of widths) for (const filter of ["all", ...categoryOrder]) {
    const options = { layoutViewportWidth: width, filter };
    const baseline = compileAdvertisingLayout(options);
    assert.equal(baseline.columns, columnsForWidth(width), "parent retains viewport column count");
    assertOneColumn(baseline, `${filter} ${width}`);
    const filteredCards = ADVERTISING_CARDS
      .filter((c) => matchesAdvertisingFilter(c, filter))
      .sort((a, b) => a.sourceOrder - b.sourceOrder || a.id.localeCompare(b.id));
    assert.equal(baseline.placements.length, filteredCards.length);
    assertSourceOrderShortestFrontier(baseline, filteredCards, `${filter} ${width}`);
    const legacy = compileAdvertisingLayout({ ...options, cards: ADVERTISING_CARDS.map((card, i) => ({ ...card, layoutSpan: ["auto", 1, 2][i % 3] })), settings: { landscapeThreshold: 3 } });
    assert.equal(legacy.coordinateHash, baseline.coordinateHash, "retired controls cannot change geometry or its identity");
    assert.equal(compileAdvertisingLayout(options).coordinateHash, baseline.coordinateHash, "repeat is deterministic");
  }
});

test("related keeps fixed columns and measures its primary description once", () => {
  const measuredWidths = [];
  const options = { cards: ADVERTISING_CARDS, categoryOrder, heroId: "mobile-retail-04", tag: "use-sampling", ...viewportForWidth(1024) };
  const result = compileAdvertisingRelatedLayout({ ...options, measureDescriptionHeight(width) { measuredWidths.push(width); return 537; } });
  assert.equal(result.layout.diagnostics.preferredColumns, 4);
  assert.equal(result.layout.columns, 4);
  assert.deepEqual(result.layout.diagnostics.attempts.map(({ columns }) => columns), [4]);
  assert.deepEqual(result.layout.diagnostics.attempts.map(({ mode }) => mode), ["alongside"]);
  assert.equal(measuredWidths.length, 1, "description measurement is not retried for a removed suggestion reservation");
  assertRelated(result, "fixed related layout");
  assert.deepEqual(result.primary, computeAdvertisingPhotoGeometry({
    ...viewportForWidth(1024), columns: 4,
    imageWidth: ADVERTISING_CARDS.find((card) => card.id === options.heroId).media.width,
    imageHeight: ADVERTISING_CARDS.find((card) => card.id === options.heroId).media.height,
    descriptionHeight: 537,
  }));
  let calls = 0;
  const invalid = new Error("invalid geometry input");
  invalid.diagnostic = { code: "invalid-input" };
  assert.throws(() => compileAdvertisingRelatedLayout({ ...options, compile() { calls += 1; throw invalid; } }), (error) => error === invalid);
  assert.equal(calls, 1);

  let exhaustedCalls = 0;
  let exhaustedColumns;
  const exhausted = new Error("search exhausted");
  exhausted.diagnostic = { code: "search-exhausted", operations: 300000, budget: 300000 };
  assert.throws(() => compileAdvertisingRelatedLayout({
    ...options,
    compile(input) { exhaustedCalls += 1; exhaustedColumns = input.columns; throw exhausted; },
  }), (error) => error === exhausted);
  assert.equal(exhaustedCalls, 1);
  assert.equal(exhaustedColumns, 4);
  assert.equal(exhausted.diagnostic.attempts.length, 1, "spent full budget leaves no retry");
  assert.equal(exhausted.diagnostic.budget, 300000, "failed diagnostic keeps the aggregate budget");

  let narrowCalls = 0;
  let narrowBudget = 0;
  const narrowExhausted = new Error("narrow search exhausted");
  narrowExhausted.diagnostic = { code: "search-exhausted", operations: 10 };
  assert.throws(() => compileAdvertisingRelatedLayout({
    ...options, columns: 1,
    compile(input) { narrowCalls += 1; narrowBudget = input.operationBudget; throw narrowExhausted; },
  }), (error) => error === narrowExhausted);
  assert.equal(narrowCalls, 1, "no below-primary alternative leaves one solver attempt");
  assert.equal(narrowBudget, 300000, "no below-primary alternative keeps the full operation budget");

  let retryCalls = 0;
  const retryBudgets = [];
  const retrySeeds = [];
  const retryExhausted = new Error("retry search exhausted");
  retryExhausted.code = "search-exhausted";
  retryExhausted.diagnostic = { code: "search-exhausted", operations: 10 };
  assert.throws(() => compileAdvertisingRelatedLayout({
    ...options,
    compile(input) {
      retryCalls += 1;
      retryBudgets.push(input.operationBudget);
      retrySeeds.push(input.initialColumnBottoms);
      throw retryExhausted;
    },
  }), (error) => error === retryExhausted);
  assert.equal(retryCalls, 2, "search exhaustion retries once below the primary when columns are free");
  assert.deepEqual(retryBudgets, [150000, 299990], "two attempts share the 300000 operation budget");
  assert.equal(new Set(retrySeeds[1]).size, 1, "fallback seeds every column at the same primary bottom");
  assert.equal(retryExhausted.diagnostic.attempts.length, 2, "failed fallback preserves both attempt diagnostics");
  assert.equal(retryExhausted.diagnostic.operations, 20, "failed fallback reports total consumed operations");
  assert.equal(retryExhausted.diagnostic.budget, 300000, "failed fallback reports the aggregate budget");
});

test("product solver preserves source order and fills the shortest frontier through the tail", () => {
  const cards = [278, 251, 116, 109].map((height, index) => ({ id: `tail-${index}`, category: "test", sourceOrder: index, rank: index, media: { width: 172.5, height, src: "fixture.webp" } }));
  const layout = compileAdvertisingProductLayout({ cards, categoryOrder: ["test"], columns: 2, layoutViewportWidth: 390 });
  assertOneColumn(layout, "terminal branching");
  assert.deepEqual(layout.placements.map(({ card }) => card.id), cards.map(({ id }) => id),
    "visual placement order remains the source order when the shortest frontier alternates columns");
  assert.deepEqual(layout.placements.map(({ left, y }) => [left, Math.round(y * 100) / 100]), [
    [0, 0],
    [1, 0],
    [1, 266],
    [0, 293],
  ], "every next source card uses the lowest available column, including the final two cards");
});

test("related grid keeps only real photos after suggestion moves into primary information", () => {
  const heroId = "kiosk-posm-07";
  for (const width of widths) for (const tag of [null, "use-sampling", "no-results"]) {
    const result = compileAdvertisingRelatedLayout({ cards: ADVERTISING_CARDS, categoryOrder, heroId, tag, ...viewportForWidth(width) });
    assertRelated(result, `related ${width} ${tag}`);
    assert.ok(result.photoPlacements.every((p) => p.card.id !== heroId));
  }
});

test("covers full and sparse related pools with zero, one, and three tagged photos", () => {
  const heroId = "kiosk-posm-07";
  const hero = ADVERTISING_CARDS.find((card) => card.id === heroId);
  const cases = [null, "no-results", "product-kiosk-posm-product-07", "use-sampling"];
  for (const tag of cases) {
    const expectedCount = ADVERTISING_CARDS.filter((card) => card.id !== heroId
      && (tag ? card.tagIds.includes(tag) : card.category === hero.category)).length;
    const result = compileAdvertisingRelatedLayout({
      cards: ADVERTISING_CARDS, categoryOrder, heroId, tag,
      ...viewportForWidth(820),
    });
    assert.equal(result.cards.length, expectedCount, `${tag}: expected related count`);
    assertRelated(result, `pool ${tag}`);
    if (expectedCount === 1) {
      const photo = result.photoPlacements[0];
      if (result.layout.columns > result.primary.span) {
        assert.equal(photo.left, result.primary.span, `${tag}: single real photo uses the first free column`);
        assert.equal(photo.y, 0, `${tag}: single real photo aligns with the primary top`);
      } else {
        assert.ok(photo.x < result.primary.width, `${tag}: single real photo stays below the primary`);
        assert.ok(photo.y >= result.primary.height + result.primary.gap - 0.05, `${tag}: single real photo exposes the required peek`);
      }
    }
  }
});

test("R8 puts a single filtered photo in the first free column whenever span 3 leaves one available", () => {
  for (const width of [390, 820, 1004, 1005, 1569, 1922]) {
    const result = compileAdvertisingRelatedLayout({
      cards: ADVERTISING_CARDS, categoryOrder, heroId: "signage-raised-letters-02",
      tag: "product-signage-raised-letters-product-12",
      ...viewportForWidth(width),
    });
    assert.equal(result.cards.length, 1);
    assert.equal(result.photoPlacements[0].card.id, "signage-raised-letters-12");
    assertRelated(result, `D14 width ${width}`);
    const photo = result.photoPlacements[0];
    if (result.layout.columns > result.primary.span) {
      assert.equal(photo.left, result.primary.span, `D18 ${width}: use the first free column`);
      assert.equal(photo.y, 0, `D18 ${width}: align with primary top`);
    } else {
      assert.equal(photo.left, 0, `D14 ${width}: full-span primary leaves no free column`);
      assert.ok(Math.abs(photo.y - result.primary.height - result.primary.gap) < 0.05,
        `D14 ${width}: first real photo follows the full-span primary without an empty row`);
    }
  }
});

test("R11 fills column four and keeps sparse photos on the shared shortest frontier", () => {
  const options = {
    cards: ADVERTISING_CARDS,
    categoryOrder,
    heroId: "kiosk-posm-01",
    layoutViewportWidth: 1922,
    viewportHeight: 912,
    headerHeight: 102.515625,
  };
  // Fixture giữ đúng hai ảnh related, độc lập với ảnh bổ sung vào catalog.
  const sparseTwo = compileAdvertisingRelatedLayout({ ...options,
    cards: ADVERTISING_CARDS.filter(({ id }) => ["kiosk-posm-01", "kiosk-posm-02", "kiosk-posm-14"].includes(id)),
    tag: "product-kiosk-posm-product-02" });
  const sparseOne = compileAdvertisingRelatedLayout({ ...options, tag: "product-office-signs-wayfinding-product-10" });
  const full = compileAdvertisingRelatedLayout(options);
  assert.equal(sparseTwo.cards.length, 2);
  const [firstSparsePhoto, secondSparsePhoto] = sparseTwo.photoPlacements;
  assert.equal(firstSparsePhoto?.left, sparseTwo.primary.span,
    "R11 gives the first sparse photo to column four");
  assert.equal(firstSparsePhoto?.y, 0, "R11 aligns the first sparse photo with the primary top");
  assert.equal(secondSparsePhoto?.left, sparseTwo.primary.span,
    "R11 keeps filling column four while it remains the shortest frontier");
  assert.ok(Math.abs(secondSparsePhoto.y - firstSparsePhoto.pixelHeight - sparseTwo.primary.gap) < 0.05,
    "R11 places the second sparse photo directly below the first without a solver-created hole");
  assert.equal(sparseTwo.layout.diagnostics.attempts[0]?.mode, "alongside", "R11 uses the continuous solver branch");
  assert.equal(sparseTwo.layout.diagnostics.staggerMode, "preferred", "R11 keeps the preferred 10 percent stagger phase");
  assert.ok(sparseTwo.layout.diagnostics.operations <= 300000, "R11 stays within the shared operation budget");
  assertRelated(sparseTwo, "R11 sparse-two related layout");

  assert.equal(sparseOne.cards.length, 1);
  assert.equal(sparseOne.photoPlacements[0].left, sparseOne.primary.span, "R8 uses the first column after span3");
  assert.equal(sparseOne.photoPlacements[0].y, 0, "R8 keeps the only photo alongside primary");
  assert.equal(sparseOne.layout.diagnostics.attempts[0]?.mode, "alongside", "R11 keeps one-photo pools in the shared solver");

  assert.ok(full.cards.length > 2);
  assert.ok(full.photoPlacements.some((placement) => placement.left >= full.primary.span && placement.y < full.primary.height),
    "full pools retain their ordinary free-column packing beside span3");
  assert.equal(full.layout.diagnostics.attempts[0]?.mode, "alongside", "R11 keeps full pools in the shared solver");
});

test("R11 keeps the use-sampling pool in one continuous coordinate space", () => {
  const options = {
    cards: ADVERTISING_CARDS,
    categoryOrder,
    heroId: "kiosk-posm-30",
    tag: "use-sampling",
    ...viewportForWidth(1569),
  };
  const result = compileAdvertisingRelatedLayout(options);
  const repeated = compileAdvertisingRelatedLayout(options);
  const firstRelatedId = result.cards[0].id;
  const firstRelatedPlacement = result.photoPlacements.find(({ card }) => card.id === firstRelatedId);
  const remainingPlacements = result.photoPlacements.filter(({ card }) => card.id !== firstRelatedId);
  const expectedRemainingIds = result.cards.slice(1).map(({ id }) => id).sort();

  assert.equal(result.cards.length, 4, "R10 fixture keeps four real related photos");
  assertRelated(result, "R10 kiosk-posm-30 use-sampling");
  assert.deepEqual(repeated.photoPlacements, result.photoPlacements, "R10 exact case remains deterministic");
  assert.equal(firstRelatedPlacement?.left, 3, "R10 assigns the first related photo to column four");
  assert.equal(firstRelatedPlacement?.y, 0, "R10 aligns the first related photo with the primary top");
  assert.deepEqual(remainingPlacements.map(({ card }) => card.id).sort(), expectedRemainingIds,
    "R10 preserves each remaining related photo exactly once");
  assert.equal(new Set(result.photoPlacements.map(({ card }) => card.id)).size, result.cards.length,
    "R10 never duplicates a related photo");
  assert.ok(remainingPlacements.some(({ left, y }) => left === 3 && y < result.primary.height),
    "R11 keeps later related photos in the side-column cavity before the primary ends");
  assert.ok(result.layout.diagnostics.operations <= 300000, "R10 stays within the shared operation budget");
  assert.equal(result.layout.diagnostics.attempts[0]?.mode, "alongside",
    "R11 diagnostics name the continuous solver branch");

  // Geometry đọc media item cover (M01d), nên cũng giảm một nửa ở đó như ở field legacy.
  const halve = (media) => ({ ...media, height: Math.max(1, Math.round(media.height / 2)) });
  const changedPinnedMedia = ADVERTISING_CARDS.map((card) => card.id === firstRelatedId ? {
    ...card,
    media: halve(card.media),
    mediaItems: card.mediaItems?.map(halve),
  } : card);
  const changedPinnedGeometry = compileAdvertisingRelatedLayout({ ...options, cards: changedPinnedMedia });
  assert.notEqual(changedPinnedGeometry.layout.coordinateHash, result.layout.coordinateHash,
    "R10 coordinate hash includes the pinned card geometry");
});

test("R10 pins the first related photo when it is a medium ratio", () => {
  const cards = [[1, 1], [2, 3], [3, 2], [2, 3], [3, 2]].map(([width, height], index) => ({ id: `c${index}`, media: { width, height } }));
  const ids = cards.map(({ id }) => id);
  assert.notEqual(solveAdvertisingOrganicPresentationOrder(cards, ids).cards[0].id, "c0", "grid order may move a medium photo");
  assert.equal(solveAdvertisingOrganicPresentationOrder(cards, ids, { pinFirst: true }).cards[0].id, "c0", "related keeps the first photo in column four");
});

test("R10 fills column four for every nonempty authored hero and tag pool at N4", () => {
  let checked = 0;
  // Tag product (taxonomy R7) không vào phép kiểm này: pool standees-backdrops-posm của kiosk-posm-11 hết ngân sách
  // cột 4 và xếp dưới primary, như fallback solver đã có ở khoảng 8% lượt duyệt có seed.
  for (const hero of ADVERTISING_CARDS) for (const tag of [null, ...hero.tagIds.filter((id) => !hero.productIds.includes(id))]) {
    const result = compileAdvertisingRelatedLayout({
      cards: ADVERTISING_CARDS,
      categoryOrder,
      heroId: hero.id,
      tag,
      ...viewportForWidth(1569),
    });
    if (result.cards.length === 0) continue;

    assert.equal(result.layout.columns, 4, `${hero.id} ${tag}: R10 fixture uses N4`);
    assert.equal(result.primary.span, 3, `${hero.id} ${tag}: R10 primary spans three columns`);
    assertRelated(result, `${hero.id} ${tag}: R10 authored N4`);
    const firstRelatedId = result.cards[0].id;
    const firstRelatedPlacement = result.photoPlacements.find(({ card }) => card.id === firstRelatedId);
    assert.equal(firstRelatedPlacement?.left, 3, `${hero.id} ${tag}: R10 fills column four`);
    assert.equal(firstRelatedPlacement?.y, 0, `${hero.id} ${tag}: R10 aligns column four with the primary top`);
    const repeated = compileAdvertisingRelatedLayout({
      cards: ADVERTISING_CARDS,
      categoryOrder,
      heroId: hero.id,
      tag,
      ...viewportForWidth(1569),
    });
    assert.equal(repeated.layout.coordinateHash, result.layout.coordinateHash,
      `${hero.id} ${tag}: R10 remains deterministic`);
    checked += 1;
  }
  assert.ok(checked > 0, "R10 checks every nonempty authored N4 pool");
});

test("D9 keeps homogeneous related pools at fixed N with an aligned fallback", () => {
  for (const tag of ["format-square", "use-sampling"]) {
    const options = {
      cards: ADVERTISING_CARDS,
      categoryOrder,
      heroId: "kiosk-posm-07",
      tag,
      ...viewportForWidth(820),
    };
    const result = compileAdvertisingRelatedLayout(options);
    assert.equal(result.layout.columns, 3, `${tag}: D9 keeps fixed N`);
    assert.ok(result.cards.length > 0, `${tag}: real related photos remain`);
    // Bộ sampling đã duyệt dùng ảnh ngang đồng tỷ lệ, nên cũng chọn aligned fallback.
    assert.equal(result.layout.diagnostics.staggerMode, "fallback", `${tag}: D9 selects the expected phase`);
    assert.equal(result.layout.diagnostics.fallbackUsed, true, `${tag}: fallback state is incorrect`);
    assert.ok(result.layout.diagnostics.operations <= 300000, `${tag}: phases exceeded the shared budget`);
    assertRelated(result, `${tag}: D9 fallback`);
    const repeated = compileAdvertisingRelatedLayout(options);
    assert.equal(repeated.layout.coordinateHash, result.layout.coordinateHash, `${tag}: fallback remains deterministic`);
  }
});

test("D9 selects the preferred 10 percent stagger phase for a mixed pool", () => {
  const cards = [
    [100, 100], [100, 140], [100, 100], [100, 140],
  ].map(([width, height], index) => ({
    id: `d9-mixed-${index}`,
    category: "d9-mixed",
    sourceOrder: index,
    rank: index,
    media: { src: `/d9-mixed-${index}.webp`, width, height },
  }));
  const layout = compileAdvertisingProductLayout({
    cards,
    categoryOrder: ["d9-mixed"],
    columns: 2,
    layoutViewportWidth: 390,
  });
  assert.equal(layout.staggerMinimumRatio, 0.10);
  assert.equal(layout.diagnostics.staggerMode, "preferred");
  assert.equal(layout.diagnostics.fallbackUsed, false);
  assert.ok(layout.diagnostics.preferredAttempts > 0);
  assert.ok(layout.diagnostics.operations <= 300000);
  assertOneColumn(layout, "D9 mixed preferred stagger");
});

test("every authored hero and tag combination remains feasible and deterministic", () => {
  let checked = 0;
  for (const hero of ADVERTISING_CARDS) for (const width of [390, 820, 1440]) {
    for (const tag of [null, ...hero.tagIds]) {
      const options = { cards: ADVERTISING_CARDS, categoryOrder, heroId: hero.id, tag, ...viewportForWidth(width) };
      const result = compileAdvertisingRelatedLayout(options);
      assertRelated(result, `${hero.id} ${tag} ${width}`);
      const repeated = compileAdvertisingRelatedLayout(options);
      assert.equal(repeated.layout.coordinateHash, result.layout.coordinateHash);
      assert.deepEqual(repeated.primary, result.primary);
      assert.deepEqual(repeated.photoPlacements, result.photoPlacements);
      checked += 1;
    }
  }
  assert.ok(checked >= ADVERTISING_CARDS.length * 3);
  console.log(`[advertising-one-column] ${checked} authored hero/tag/photo-only cases`);
});
