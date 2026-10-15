import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { test } from "node:test";
import { ADVERTISING_CARDS, ADVERTISING_CATEGORIES, ADVERTISING_DATASET_VERSION } from "../../src/site/advertising-products/catalog.mjs";
import {
  ADVERTISING_LAYOUT_ALGORITHM_VERSION,
  advertisingSpacing,
  columnsForWidth,
  compileAdvertisingLayout,
  compileAdvertisingProductLayout,
  computeAdvertisingPhotoGeometry,
  getVirtualWindow,
  normalizeAdvertisingSettings,
  scheduleAdvertisingRank,
  scoreAdvertisingOrganicRhythm,
  solveAdvertisingOrganicPresentationOrder,
  validateAdvertisingCards,
} from "../../src/site/advertising-products/layout-core.mjs";
import { ANTI_BRICK_EVENT_DEFINITION, inspectAdvertisingGrid, inspectAdvertisingRhythmEdges } from "./advertising-grid-oracle.mjs";
import { ADVERTISING_MEDIA_CATEGORY_COUNTS } from "../../src/site/advertising-products/media-contract.mjs";
import { validateAdvertisingCardMedia } from "../../src/site/advertising-products/media-contract.mjs";

const previousWindow = globalThis.window;
globalThis.window = {};
const { compileAdvertisingRelatedLayout } = await import("../../src/site/advertising-products/catalog-runtime.mjs");
if (previousWindow === undefined) delete globalThis.window;
else globalThis.window = previousWindow;

const categoryOrder = ADVERTISING_CATEGORIES.map(({ slug }) => slug);
const publicWidths = [320, 390, 768, 1024, 1440, 1920, 2560];
const boundaryWidths = [719, 720, 721, 734, 735, 736, 749, 750, 751, 754, 755, 756, 959, 960, 961, 989, 990, 991, 1004, 1005, 1006, 1199, 1200, 1201, 1244, 1245, 1246, 1479, 1480, 1481, 1569, 1570, 1571];

function fixture(ratios, category = "fixture") {
  return ratios.map(([width, height, layoutSpan], index) => ({
    id: `${category}-${String(index).padStart(4, "0")}`,
    category,
    sourceOrder: index,
    rank: index,
    layoutSpan,
    media: { src: `/${category}-${index}.webp`, width, height },
  }));
}

function wideVideoCoverFixture() {
  const legacy = ADVERTISING_CARDS.find((card) => card.id === "signage-raised-letters-08");
  assert(legacy);
  assert.deepEqual(readWebpSize(new URL(`../../src/site${legacy.media.src}`, import.meta.url)), [1254, 1254]);
  assert.deepEqual(readWebpSize(new URL("./fixtures/site-media-card-poster.webp", import.meta.url)), [640, 360]);
  const image = {
    ...legacy.mediaItems[0], id: `${legacy.id}-wide-image`,
    src: "/__site_media_card_fixture__/poster.webp", width: 640, height: 360,
    sourceId: "m01d:test-only:poster", source: "M00b sealed synthetic fixture",
    sha256: "5e55b48ce48a2de66737178f32d9c19b1c175dabb4d312a7d05ef7d0e9b853ba",
    provenance: "Synthetic test-only fixture, not public media.",
  };
  const video = {
    ...image, id: `${legacy.id}-wide-video`, kind: "video",
    src: "/__site_media_card_fixture__/clip-audio.mp4", sourceId: "m01d:test-only:clip",
    sha256: "853e4939e6a4627cc7777665283b2affab189132243974a4777f5a955338e827",
    posterSrc: image.src, posterWidth: 640, posterHeight: 360,
    durationSeconds: 3, hasAudio: true,
  };
  const card = { ...legacy, mediaItems: [video, image], coverMediaId: video.id };
  assert.equal(validateAdvertisingCardMedia(card).coverMediaId, video.id);
  return card;
}

function wideMediaCount(count) {
  const card = wideVideoCoverFixture();
  const image = card.mediaItems[1];
  const mediaItems = [card.mediaItems[0], ...Array.from({ length: count - 1 }, (_, index) => ({
    ...image, id: `${image.id}-${index + 1}`, src: `${image.src}?r6-r3=${index + 1}`,
    sourceId: `${image.sourceId}:r6-r3:${index + 1}`,
  }))];
  const result = { ...card, mediaItems };
  assert.equal(validateAdvertisingCardMedia(result).mediaItems.length, count);
  return result;
}

for (const count of [2, 5, 6, 7]) {
  test(`R6-R3 ${count} authored media reserve 44px control strip from first grid compile`, () => {
    const card = { ...wideMediaCount(count), rank: 0, sourceOrder: 0 };
    const options = { cards: [card], categoryOrder: [card.category], columns: 2,
      layoutViewportWidth: 320, presentationOrder: [card.id] };
    const first = compileAdvertisingProductLayout(options);
    const second = compileAdvertisingProductLayout(options);
    const placement = first.placements[0];
    assert.equal(placement.mediaPixelHeight, placement.pixelWidth * 9 / 16, "cover ratio applies only to canvas");
    assert.equal(placement.captionPixelHeight, 0);
    assert.equal(placement.pixelHeight, placement.mediaPixelHeight + 44, "card includes 44px below canvas");
    assert.equal(placement.height, placement.pixelHeight);
    assert.equal(first.totalPixelHeight, placement.pixelHeight, "initial solver reserves the complete card");
    assert.equal(second.coordinateHash, first.coordinateHash, "repeat compile keeps geometry stable");
  });
}

test("R6-R3 related placement reserves the same 44px below 16:9 canvas", () => {
  const card = wideMediaCount(7);
  const hero = ADVERTISING_CARDS.find((item) => item.id === "signage-raised-letters-02");
  assert(hero);
  const result = compileAdvertisingRelatedLayout({
    cards: [hero, card], categoryOrder: [card.category], heroId: hero.id,
    columns: 2, layoutViewportWidth: 390, viewportHeight: 844, headerHeight: 70,
  });
  const placement = result.photoPlacements.find((item) => item.card.id === card.id);
  assert(placement);
  assert.equal(placement.mediaPixelHeight, placement.pixelWidth * 9 / 16);
  assert.equal(placement.pixelHeight, placement.mediaPixelHeight + 44);
});

test("R6-R3 singleton and malformed authored lists retain existing boundaries", () => {
  const card = wideMediaCount(2);
  const singleton = { ...card, mediaItems: [card.mediaItems[0]], rank: 0, sourceOrder: 0 };
  assert.equal(validateAdvertisingCardMedia(singleton).mediaItems.length, 1);
  const layout = compileAdvertisingProductLayout({ cards: [singleton], categoryOrder: [singleton.category],
    columns: 2, layoutViewportWidth: 390, presentationOrder: [singleton.id] });
  const placement = layout.placements[0];
  assert.equal(placement.pixelHeight, placement.mediaPixelHeight, "singleton has no control strip");
  for (const mediaItems of [[], null]) {
    assert.throws(() => validateAdvertisingCards([{ ...singleton, mediaItems }],
      { categoryOrder: [singleton.category], requireRanks: false }), /media dimensions/i);
  }
});

test("M01d grid uses valid 16:9 video cover while legacy metadata stays square", () => {
  const card = { ...wideVideoCoverFixture(), rank: 0, sourceOrder: 0 };
  const layout = compileAdvertisingProductLayout({
    cards: [card], categoryOrder: [card.category], columns: 2,
    layoutViewportWidth: 390, presentationOrder: [card.id],
  });
  assert.equal(card.media.width, card.media.height, "legacy media is real square metadata");
  assert.equal(layout.placements.length, 1);
  const placement = layout.placements[0];
  assert.ok(Math.abs(placement.mediaPixelHeight - placement.pixelWidth * 9 / 16) <= 1,
    `grid frame must use 16:9 cover: ${placement.pixelWidth}x${placement.mediaPixelHeight}`);
});

test("M01d related uses valid 16:9 cover and leaves primary legacy geometry alone", () => {
  const card = wideVideoCoverFixture();
  const hero = ADVERTISING_CARDS.find((item) => item.id === "signage-raised-letters-02");
  assert(hero);
  const result = compileAdvertisingRelatedLayout({
    cards: [hero, card], categoryOrder: [card.category], heroId: hero.id,
    columns: 2, layoutViewportWidth: 390, viewportHeight: 844, headerHeight: 70,
  });
  const placement = result.photoPlacements.find((item) => item.card.id === card.id);
  assert(placement, "wide fixture is selected as related media");
  assert.ok(Math.abs(placement.mediaPixelHeight - placement.pixelWidth * 9 / 16) <= 1,
    `related frame must use 16:9 cover: ${placement.pixelWidth}x${placement.mediaPixelHeight}`);
});

test("M01d original 192 cards retain coordinate hash, order and no filler", () => {
  const order = ADVERTISING_CARDS.map((card) => card.id);
  for (const [layoutViewportWidth, expectedHash] of [[390, "2847b6b9"], [1440, "b1eb12cf"]]) {
    const layout = compileAdvertisingProductLayout({
      cards: ADVERTISING_CARDS, categoryOrder, datasetVersion: ADVERTISING_DATASET_VERSION,
      columns: columnsForWidth(layoutViewportWidth), layoutViewportWidth, presentationOrder: order,
    });
    assert.equal(layout.coordinateHash, expectedHash);
    assert.deepEqual(layout.diagnostics.placementOrder, order);
    assert.equal(layout.placements.length, 192);
    assert.equal(layout.placements.some(({ card }) => card.kind === "suggestion"), false);
  }
});

function organicTightBudgetOptions() {
  const heights = [130, 60, 180, 150, 60, 130, 220, 150, 75, 150, 220, 180, 150, 180, 220, 60, 220, 150, 220];
  const cards = fixture(heights.map((height) => [100, height]), "organic-tight");
  const presentationOrder = [17, 5, 11, 2, 16, 6, 9, 3, 13, 1, 18, 4, 15, 7, 8, 14, 12, 0, 10]
    .map((index) => cards[index].id);
  return { cards, categoryOrder: ["organic-tight"], columns: 4, layoutViewportWidth: 1024, presentationOrder };
}

function readWebpSize(filePath) {
  const bytes = readFileSync(filePath);
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", `${filePath} is a RIFF file`);
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", `${filePath} is a WebP file`);
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.subarray(offset, offset + 4).toString("ascii");
    const size = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (type === "VP8X") return [bytes.readUIntLE(data + 4, 3) + 1, bytes.readUIntLE(data + 7, 3) + 1];
    if (type === "VP8 ") return [bytes.readUInt16LE(data + 6) & 0x3fff, bytes.readUInt16LE(data + 8) & 0x3fff];
    if (type === "VP8L") return [1 + bytes[data + 1] + ((bytes[data + 2] & 0x3f) << 8), 1 + ((bytes[data + 2] >> 6) | (bytes[data + 3] << 2) | ((bytes[data + 4] & 0x0f) << 10))];
    offset = data + size + (size % 2);
  }
  throw new Error(`Missing WebP dimensions: ${filePath}`);
}

function assertGrid(layout, label, expectedCount) {
  assert.equal(layout.placements.length, expectedCount, `${label} places every card`);
  const inspection = inspectAdvertisingGrid({ layout, placements: layout.placements });
  assert.equal(inspection.valid, true, `${label} passes independent geometry oracle: ${JSON.stringify(inspection.violations.slice(0, 3))}`);
  assert.deepEqual(layout.placements.map(({ index }) => index), layout.placements.map((_, index) => index), `${label} indexes visual order`);
}

function geometryAt(viewport) {
  const { outer, interCardGap } = advertisingSpacing(viewport);
  const gridWidth = viewport - 2 * outer;
  const columns = viewport < 720 ? 2 : viewport < 1005 ? 3 : 4;
  return { outer, interCardGap, gridWidth, columns, cardWidth: (gridWidth - interCardGap * (columns - 1)) / columns };
}

function knownFeasibleFixture(count = 3000) {
  const viewport = 1440;
  const columns = 4;
  const { outer, interCardGap } = advertisingSpacing(viewport);
  const gridWidth = viewport - 2 * outer;
  const cardWidth = (gridWidth - interCardGap * (columns - 1)) / columns;
  const captionPixelHeight = 27.92;
  const quantum = 0.125 * cardWidth;
  const rowStep = 8 * cardWidth;
  const patterns = [[2, 3, 4], [3, 5, 2], [4, 2, 5], [5, 4, 3]];
  /** @type {number[]} */
  const bottoms = [];
  /** @type {any[]} */
  const cards = [];
  /** @type {any[]} */
  const placements = [];

  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / columns);
    const left = index % columns;
    const deltas = patterns[row % patterns.length];
    const phases = [0, deltas[0] * quantum, (deltas[0] + deltas[1]) * quantum, (deltas[0] + deltas[1] + deltas[2]) * quantum];
    const bottom = (row + 1) * rowStep + phases[left];
    const previousBottom = row ? bottoms[index - columns] : 0;
    const top = row ? previousBottom + interCardGap : 0;
    const pixelHeight = bottom - top;
    const mediaPixelHeight = pixelHeight - captionPixelHeight;
    const card = {
      id: `benchmark-${String(index).padStart(4, "0")}`,
      category: "benchmark",
      sourceOrder: index,
      rank: index,
      layoutSpan: 1,
      media: { src: `/benchmark-${index}.webp`, width: cardWidth, height: mediaPixelHeight },
    };
    bottoms.push(bottom);
    cards.push(card);
    placements.push({ index, card, left, top, width: 1, height: pixelHeight, x: left * (cardWidth + interCardGap), y: top, pixelWidth: cardWidth, mediaPixelHeight, captionPixelHeight, pixelHeight });
  }

  placements.sort((a, b) => a.y - b.y || a.x - b.x || a.card.id.localeCompare(b.card.id));
  placements.forEach((placement, index) => { placement.index = index; });
  const columnBottoms = Array.from({ length: columns }, (_, column) => bottoms.filter((_, index) => index % columns === column).at(-1) ?? 0);
  return {
    cards,
    viewport,
    layout: { columns, cardWidth, interCardGap, gridWidth, placements, columnBottoms, totalPixelHeight: Math.max(...columnBottoms) },
  };
}

test("keeps current data, spacing and columns alongside legacy kernel fixtures", () => {
  assert.equal(ADVERTISING_LAYOUT_ALGORITHM_VERSION, "advertising-grid-v14");
  assert.equal(ADVERTISING_DATASET_VERSION, "2026-09-24.1");
  assert.deepEqual(categoryOrder, ["kiosk-posm", "mobile-retail", "signage-raised-letters", "office-signs-wayfinding", "led-displays-lightboxes", "print-decals"]);
  assert.match(ANTI_BRICK_EVENT_DEFINITION, /nearest opposite-column different-item edge/i);
  assert.deepEqual(normalizeAdvertisingSettings(), { landscapeThreshold: 1.25 });
  assert.throws(() => normalizeAdvertisingSettings({ landscapeThreshold: 1 }), /finite number greater than 1/i);
  assert.equal(ADVERTISING_CARDS.length, 192);
  assert.deepEqual(ADVERTISING_CARDS.map(({ rank }) => rank), Array.from({ length: 192 }, (_, index) => index));
  assert.equal(new Set(ADVERTISING_CARDS.map(({ id }) => id)).size, 192);
  assert.equal(new Set(ADVERTISING_CARDS.map(({ media }) => media.src)).size, 192);
  assert.equal(new Set(ADVERTISING_CARDS.map(({ media }) => media.sourceId)).size, 192);
  for (const category of ADVERTISING_CATEGORIES) {
    const categoryCards = ADVERTISING_CARDS.filter((card) => card.category === category.slug);
    const poolSources = new Set(categoryCards.map((card) => card.media.src));
    assert.equal(category.products.length, ["kiosk-posm", "print-decals", "office-signs-wayfinding"].includes(category.slug) ? 13 : 12, `${category.slug} keeps authored taxonomy products`);
    assert.ok(categoryCards.length >= ADVERTISING_MEDIA_CATEGORY_COUNTS[category.slug], `${category.slug} keeps at least its approved baseline card count`);
    assert.deepEqual(categoryCards.map(({ sourceOrder }) => sourceOrder), Array.from({ length: categoryCards.length }, (_, index) => index), `${category.slug} keeps source order`);
    assert.equal(new Set(categoryCards.map(({ productKey }) => productKey)).size, category.products.length, `${category.slug} covers all taxonomy products`);
    for (const card of categoryCards) {
      const productIndex = Number(card.productKey.slice(-2)) - 1;
      assert.deepEqual([card.titleVi, card.titleEn], [category.products[productIndex].titleVi, category.products[productIndex].titleEn], `${card.id} matches its taxonomy product`);
    }
    assert.ok(poolSources.has(category.cover), `${category.slug} cover reuses its production pool`);
    assert.equal(category.gallery.length, 2, `${category.slug} keeps two detail gallery images`);
    assert.ok(category.gallery.every(([src]) => poolSources.has(src)), `${category.slug} gallery reuses its production pool`);
  }
  const counts = Object.fromEntries(categoryOrder.map(category => [category, ADVERTISING_CARDS.filter(card => card.category === category).length]));
  const maxCategoryCount = Math.max(...Object.values(counts));
  for (let cycle = 0; cycle < maxCategoryCount; cycle += 1) {
    const expected = categoryOrder.filter((category) => cycle < counts[category]);
    assert.deepEqual(ADVERTISING_CARDS.filter(({ sourceOrder }) => sourceOrder === cycle).map(({ category }) => category), expected, `round-robin cycle ${cycle}`);
  }
  for (const card of ADVERTISING_CARDS) {
    assert.equal(card.media.altVi, card.titleVi, `${card.id} keeps Vietnamese alt text`);
    assert.equal(card.media.altEn, card.titleEn, `${card.id} keeps English alt text`);
    assert.deepEqual(readWebpSize(new URL(`../../src/site${card.media.src}`, import.meta.url)), [card.media.width, card.media.height], `${card.id} intrinsic dimensions match its file`);
  }
  for (const viewport of [...publicWidths, ...boundaryWidths]) {
    const expected = geometryAt(viewport);
    assert.equal(columnsForWidth(viewport), expected.columns, `${viewport}px column count`);
    const empty = compileAdvertisingLayout({ layoutViewportWidth: viewport, cards: [], categoryOrder: [] });
    assert.equal(empty.gridWidth, expected.gridWidth, `${viewport}px grid width`);
    assert.equal(empty.cardWidth, expected.cardWidth, `${viewport}px card width`);
    assert.deepEqual(empty.spacing, { outer: expected.outer, interCardGap: expected.interCardGap });
  }
});

test("product layouts reserve no caption height after image titles are removed", () => {
  const cards = fixture([[4, 3], [3, 4]], "no-caption");
  const layout = compileAdvertisingProductLayout({
    cards,
    categoryOrder: ["no-caption"],
    columns: 2,
    layoutViewportWidth: 390,
  });
  assert.ok(layout.placements.every((placement) => placement.captionPixelHeight === 0));
  assert.ok(layout.placements.every((placement) => placement.pixelHeight === placement.mediaPixelHeight));
});

test("R15 selects Pinterest geometry from full span at every responsive boundary", () => {
  // Viewport dọc: ngang vẫn giữ layout split kể cả full span.
  const viewportHeight = 1100;
  for (const width of [719, 720, 1004, 1005]) {
    const columns = columnsForWidth(width);
    const geometry = computeAdvertisingPhotoGeometry({
      layoutViewportWidth: width,
      viewportHeight,
      columns,
      headerHeight: 90,
      imageWidth: 1600,
      imageHeight: 900,
    });
    const fullSpan = geometry.span === columns;
    assert.equal(geometry.mode, fullSpan ? "pinterest" : "split", `${width}px derives mode from span === columns`);
    if (fullSpan) assert.equal(computeAdvertisingPhotoGeometry({ layoutViewportWidth: width, viewportHeight: width - 1, columns,
      headerHeight: 90, imageWidth: 1600, imageHeight: 900 }).mode, "split", `${width}px landscape keeps split`);
    if (!fullSpan) continue;
    assert.ok(geometry.top + geometry.height <= viewportHeight, `${width}px Pinterest primary fits below the header`);
    assert.ok(geometry.descriptionHeight + geometry.internalGap <= viewportHeight * 0.28,
      `${width}px description and gap stay within the viewport-based 28% cap`);
    assert.ok(Math.abs(geometry.imageHeight - geometry.imageZoneHeight) <= 0.01,
      `${width}px image leaves no top or bottom overflow`);
    assert.ok(Math.abs(geometry.imageZoneHeight + geometry.internalGap + geometry.descriptionHeight - geometry.height) <= 0.01,
      `${width}px image, gap and description exactly fill the primary`);

    const matchingRatio = computeAdvertisingPhotoGeometry({
      layoutViewportWidth: width,
      viewportHeight,
      columns,
      headerHeight: 90,
      imageWidth: geometry.imageZoneWidth,
      imageHeight: geometry.imageZoneHeight,
    });
    assert.equal(geometry.hasContainOverflow, geometry.imageWidth < geometry.imageZoneWidth - 0.5,
      `${width}px glass appears only for real side overflow`);
    assert.equal(matchingRatio.hasContainOverflow, false, `${width}px fitted ratio disables zoom-glass`);
  }
});

test("L04R reserves measured readable primary height before related cards without changing their pool", () => {
  const cards = fixture([[100, 100], [100, 150], [200, 100]], "readable-detail");
  const options = { cards, categoryOrder: ["readable-detail"], heroId: cards[0].id,
    columns: 2, layoutViewportWidth: 390, viewportHeight: 390, headerHeight: 100, seed: 17 };
  const baseline = compileAdvertisingRelatedLayout(options);
  let measurement;
  const readable = compileAdvertisingRelatedLayout({ ...options,
    measureDescriptionHeight: () => 400,
    measureDescriptionMinimumHeight: (width, mode) => { measurement = { width, mode }; return 340; },
    minimumImageZoneHeight: 104 });
  assert.deepEqual(measurement, { width: baseline.primary.descriptionWidth, mode: baseline.primary.mode });
  assert.equal(readable.primary.descriptionHeight, 340);
  assert.ok(readable.primary.imageZoneHeight >= 104);
  assert.equal(readable.layout.columns, baseline.layout.columns);
  assert.deepEqual(readable.photoPlacements.map(p => p.card.id).sort(), baseline.photoPlacements.map(p => p.card.id).sort());
  assert.ok(readable.photoPlacements.every(p => p.y >= readable.primary.height));
  assert.deepEqual(compileAdvertisingRelatedLayout({ ...options, minimumImageZoneHeight: 0 }), baseline);
});

test("P7.1 keeps suggestion in primary info for split and first in related grid for full-span", () => {
  const cards = fixture([[100, 100], [100, 100], [100, 150], [100, 200]], "continuous-detail");
  const suggestionCard = {
    id: "advertising-suggestion",
    kind: "suggestion",
    category: "continuous-detail",
    sourceOrder: 0,
    rank: 0,
    layoutSpan: 1,
    media: { src: "/suggestion.webp", width: 100, height: 100 },
  };
  const split = compileAdvertisingRelatedLayout({
    cards,
    categoryOrder: ["continuous-detail"],
    heroId: "continuous-detail-0000",
    columns: 4,
    layoutViewportWidth: 1440,
    viewportHeight: 1000,
    headerHeight: 100,
    suggestionCard,
  });
  assert.equal(split.suggestionPlacement, undefined, "split suggestion belongs inside primary info, not related grid");
  assert.deepEqual(split.photoPlacements.map((placement) => placement.card.id).sort(), cards.slice(1).map((card) => card.id).sort(), "split detail retains every related card once");
  assert.equal(split.layout.placements[0].left, 3, "split first real photo starts in column four");
  assert.equal(split.layout.placements[0].y, 0, "split first real photo fills the side-column cavity from the top");

  const result = compileAdvertisingRelatedLayout({
    cards,
    categoryOrder: ["continuous-detail"],
    heroId: "continuous-detail-0000",
    columns: 3,
    layoutViewportWidth: 820,
    viewportHeight: 1000,
    headerHeight: 100,
    suggestionCard,
  });
  const [head, next] = result.layout.placements;
  assert.deepEqual(result.photoPlacements.map((placement) => placement.card.id).sort(), cards.slice(1).map((card) => card.id).sort(), "full-span detail retains every related card once");
  assert.equal(result.suggestionPlacement, head, "full-span suggestion placement is exposed separately from real photos");
  assert.equal(head.card.kind, "suggestion", "first grid item is the synthetic suggestion");
  assert.deepEqual([head.card.rank, head.card.sourceOrder], [0, 0], "suggestion owns rank/sourceOrder zero");
  assert.ok(head.y >= result.primary.height, "full-span suggestion starts after primary");
  assert.notEqual(next.card.kind, "suggestion", "first real photo follows the suggestion");
  assert.ok(result.layout.diagnostics.operations <= 300000, "continuous detail layout stays within the operation budget");
  assert.equal(compileAdvertisingRelatedLayout({
    cards,
    categoryOrder: ["continuous-detail"],
    heroId: "continuous-detail-0000",
    columns: 3,
    layoutViewportWidth: 820,
    viewportHeight: 1000,
    headerHeight: 100,
    suggestionCard,
  }).layout.coordinateHash, result.layout.coordinateHash, "continuous detail layout is deterministic");
});

test("keeps canonical scheduling and rejects invalid card contracts", () => {
  const raw = fixture([[400, 200, 1], [300, 300, 1], [100, 400, 2]], "one").map(({ rank, ...card }) => card);
  const ranked = scheduleAdvertisingRank(raw, ["one"]);
  assert.deepEqual(ranked.map(({ rank }) => rank), [0, 1, 2]);
  assert.equal(validateAdvertisingCards(ranked, { categoryOrder: ["one"] }), ranked);
  assert.throws(() => validateAdvertisingCards([{ ...ranked[0], layoutSpan: 3 }], { categoryOrder: ["one"], requireRanks: false }), /layoutSpan/i);
  assert.throws(() => validateAdvertisingCards([{ ...ranked[0], media: { ...ranked[0].media, width: 0 } }], { categoryOrder: ["one"], requireRanks: false }), /media dimensions/i);
});

test("lets equal-ratio Auto cards choose a span from the local cavity", () => {
  const narrowCavity = fixture([
    [1600, 900, "auto"],
  ], "auto-narrow-cavity");
  const bridgeCavity = fixture([
    [1600, 900, "auto"],
  ], "auto-bridge-cavity");

  const narrow = compileAdvertisingLayout({ layoutViewportWidth: 1024, columns: 3, cards: narrowCavity, categoryOrder: ["auto-narrow-cavity"], initialColumnBottoms: [480, 0, 480] });
  const bridge = compileAdvertisingLayout({ layoutViewportWidth: 1024, columns: 3, cards: bridgeCavity, categoryOrder: ["auto-bridge-cavity"], initialColumnBottoms: [480, 480, 1000] });
  const narrowAuto = narrow.placements.find(({ card }) => card.id === "auto-narrow-cavity-0000");
  const bridgeAuto = bridge.placements.find(({ card }) => card.id === "auto-bridge-cavity-0000");

  assert.equal(narrowAuto.width, 1, "the same 16:9 Auto fills the narrow cavity as span 1");
  assert.equal(bridgeAuto.width, 2, "the same 16:9 Auto bridges equal-height columns as span 2");
  assert.equal(inspectAdvertisingGrid({ layout: narrow, placements: narrow.placements }).valid, true, "narrow-cavity fixture keeps independent geometry valid");
  assert.equal(inspectAdvertisingGrid({ layout: bridge, placements: bridge.placements }).valid, true, "bridge-cavity fixture keeps independent geometry valid");
  assert.ok(narrow.diagnostics.operations <= 300000);
  assert.ok(bridge.diagnostics.operations <= 300000);
});

test("reserves initial column bottoms for a detail hero without a second solver", () => {
  const cards = fixture([[100, 160, 1], [100, 260, 1], [100, 360, 1]], "reserved-detail");
  const base = { layoutViewportWidth: 1440, columns: 4, cards, categoryOrder: ["reserved-detail"] };
  const initialColumnBottoms = [480, 480, 0, 0];
  const reserved = compileAdvertisingLayout({ ...base, initialColumnBottoms });
  const emptyReserved = compileAdvertisingLayout({ ...base, cards: [], initialColumnBottoms });

  assert.deepEqual(reserved.initialColumnBottoms, initialColumnBottoms);
  assert.equal(emptyReserved.totalHeight, 480, "an empty related grid retains the reserved hero height");
  assert.ok(reserved.placements.every((placement) => placement.left >= 2 || placement.y >= 480 + reserved.interCardGap), "related placements cannot overlap the reserved left-half hero");
  assert.equal(inspectAdvertisingGrid({ layout: reserved, placements: reserved.placements }).valid, true, "oracle understands seeded column bottoms");
  assert.notEqual(reserved.coordinateHash, compileAdvertisingLayout(base).coordinateHash, "seed geometry participates in the layout hash");
  assert.throws(() => compileAdvertisingLayout({ ...base, initialColumnBottoms: [480, 480] }), /initialColumnBottoms/i);
  assert.throws(() => compileAdvertisingLayout({ ...base, initialColumnBottoms: [480, -1, 0, 0] }), /initialColumnBottoms/i);
});

test("solves bridge, same-bottom, and input-order fixtures across 2 to 4 columns", () => {
  const bridge = fixture([[745, 935, 1], [983, 809, 2], [531, 255, 1], [643, 593, 1], [741, 937, 1]]);
  for (const columns of [2, 3, 4]) {
    const options = { layoutViewportWidth: 1024, columns, cards: bridge, categoryOrder: ["fixture"] };
    const layout = compileAdvertisingLayout(options);
    assertGrid(layout, `bridge fixture ${columns} columns`, bridge.length);
    assert.ok(layout.placements.some(({ width }) => width === 2), `${columns} columns keeps literal span 2`);
    assert.equal(compileAdvertisingLayout({ ...options, cards: [...bridge].reverse() }).coordinateHash, layout.coordinateHash, `${columns} columns ignores input array order`);
    const terminal = layout.placements.reduce((byColumn, placement) => {
      for (let column = placement.left; column < placement.left + placement.width; column += 1) byColumn[column] = placement;
      return byColumn;
    }, Array(columns).fill(null));
    for (let column = 0; column < columns - 1; column += 1) {
      if (!terminal[column] || !terminal[column + 1] || terminal[column].card.id === terminal[column + 1].card.id) continue;
      assert.ok(Math.abs(layout.columnBottoms[column] - layout.columnBottoms[column + 1]) + 0.05 >= 0.25 * layout.cardWidth, `${columns} columns keeps terminal stagger`);
    }
  }

  const layout = compileAdvertisingLayout({ layoutViewportWidth: 1024, columns: 2, cards: bridge, categoryOrder: ["fixture"] });
  const bridgePlacement = layout.placements.find((placement) => placement.width === 2 && placement.y > 0);
  assert.ok(bridgePlacement, "fixture includes a non-initial B1 bridge");
  const brokenPlacements = layout.placements.map((placement) => placement.card.id === bridgePlacement.card.id ? { ...placement, top: placement.top + layout.cardWidth, y: placement.y + layout.cardWidth } : placement);
  const broken = inspectAdvertisingGrid({ layout, placements: brokenPlacements });
  assert.ok(broken.violations.some(({ code }) => code === "bridge-cavity"), "oracle rejects a bridge beyond the 0.5W cavity allowance");
});

test("keeps a repairable anti-brick prefix and backtracks when a conflict becomes irreversible", () => {
  const edges = (side, values) => values.map((y, index) => ({ id: `${side}-${index}`, y }));
  const left = edges("left", [100, 250, 450, 650]);
  const right = edges("right", [150, 350, 550, 750]);
  assert.ok(inspectAdvertisingRhythmEdges({ leftEdges: left, rightEdges: right, cardWidth: 100 }).violations.some(({ code }) => code === "brick-ababab"));
  assert.equal(inspectAdvertisingRhythmEdges({ leftEdges: [...left, { id: "left-repair", y: 700 }], rightEdges: right, cardWidth: 100 }).valid, true, "a future nearest edge repairs the mutable ABABAB prefix");

  const heightsAndSpans = [[225, 1], [225, 2], [75, 1], [175, 1], [225, 2], [75, 1], [35, 2], [175, 1], [175, 2]];
  const cards = heightsAndSpans.map(([pixelHeight, span], index) => ({
    id: `repair-${index}`,
    category: "repair",
    sourceOrder: index,
    rank: index,
    layoutSpan: span,
    media: { src: `/repair-${index}.webp`, width: span === 2 ? 215 : 100, height: pixelHeight - 25.68 },
  }));
  const layout = compileAdvertisingLayout({ layoutViewportWidth: 245, columns: 2, cards, categoryOrder: ["repair"] });
  assertGrid(layout, "repairable prefix fixture", cards.length);
  assert.ok(layout.diagnostics.mutableBrickDeferrals > 0, "mutable brick candidates are deferred, not rejected");
  assert.ok(layout.diagnostics.mutableBrickBranches > 0, "bounded search can enter a mutable brick branch for repair");
  assert.ok(layout.diagnostics.antiBrickLeafRejects + layout.diagnostics.finalizedBrickRejects > 0, "irreversible conflicts backtrack instead of throwing after search");
});

test("prunes irreversible LED rhythm conflicts before permuting unrelated tail cards", () => {
  for (const layoutViewportWidth of [735, 959, 961]) {
    const layout = compileAdvertisingProductLayout({ cards: ADVERTISING_CARDS, categoryOrder, filter: "led-displays-lightboxes", layoutViewportWidth });
    assertGrid(layout, `LED rhythm pruning ${layoutViewportWidth}px`, ADVERTISING_CARDS.filter((card) => card.category === "led-displays-lightboxes").length);
    assert.ok(layout.diagnostics.operations < 1000, "a small LED group must not revisit tens of thousands of irreparable leaves");
  }
});

test("solves the full public All and six-filter width matrix without swallowing failures", () => {
  for (const width of [...new Set([...publicWidths, ...boundaryWidths])]) {
    for (const filter of ["all", ...categoryOrder]) {
      const options = { layoutViewportWidth: width, cards: ADVERTISING_CARDS, categoryOrder, filter };
      const layout = compileAdvertisingProductLayout(options);
      const expectedCount = filter === "all" ? ADVERTISING_CARDS.length : ADVERTISING_CARDS.filter((card) => card.category === filter).length;
      assertGrid(layout, `${filter} ${width}px`, expectedCount);
      assert.equal(compileAdvertisingProductLayout(options).coordinateHash, layout.coordinateHash, `${filter} ${width}px is deterministic`);
      assert.ok(layout.diagnostics.operations <= 300000, `${filter} ${width}px stays within operation budget`);
    }
  }
});

test("hashes every geometry input and preserves virtual windows", () => {
  const cards = fixture([[400, 300, "auto"], [300, 400, 1], [500, 300, 2], [700, 600, 1], [900, 500, 2], [600, 800, 1]]);
  const base = { layoutViewportWidth: 1024, cards, categoryOrder: ["fixture"] };
  const layout = compileAdvertisingLayout(base);
  assertGrid(layout, "hash fixture", cards.length);
  assert.notEqual(compileAdvertisingLayout({ ...base, datasetVersion: "different" }).coordinateHash, layout.coordinateHash);
  assert.notEqual(compileAdvertisingLayout({ ...base, settings: { landscapeThreshold: 1.5 } }).coordinateHash, layout.coordinateHash);
  const changedSpan = cards.map((card, index) => index === 0 ? { ...card, layoutSpan: 2 } : card);
  assert.notEqual(compileAdvertisingLayout({ ...base, cards: changedSpan }).coordinateHash, layout.coordinateHash);
  const target = layout.placements.slice(2, 5);
  const top = Math.min(...target.map(({ y }) => y));
  const bottom = Math.max(...target.map(({ y, pixelHeight }) => y + pixelHeight));
  const windowed = getVirtualWindow(layout, { scrollTop: top, viewportHeight: bottom - top, overscan: 0 });
  assert.ok(target.every(({ card }) => windowed.items.some((item) => item.card.id === card.id)));
  assert.equal(windowed.totalHeight, layout.totalPixelHeight);
});

test("returns empty and one-item layouts, and unifies invalid diagnostics", () => {
  const empty = compileAdvertisingLayout({ layoutViewportWidth: 390, cards: [], categoryOrder: [] });
  assertGrid(empty, "empty filter", 0);
  assert.equal(empty.totalPixelHeight, 0);
  const one = fixture([[300, 400, 1]]);
  const oneLayout = compileAdvertisingLayout({ layoutViewportWidth: 390, cards: one, categoryOrder: ["fixture"] });
  assertGrid(oneLayout, "one-item filter", 1);
  assert.equal(oneLayout.diagnostics.code, "needs-media");
  assert.deepEqual(oneLayout.diagnostics.ids, ["fixture-0000"]);

  for (const options of [
    { layoutViewportWidth: 0, cards: [], categoryOrder: [] },
    { layoutViewportWidth: 390, columns: 5, cards: [], categoryOrder: [] },
    { layoutViewportWidth: 390, settings: { landscapeThreshold: 1 }, cards: [], categoryOrder: [] },
    { layoutViewportWidth: 390, filter: "missing", cards: [], categoryOrder: [] },
  ]) {
    assert.throws(() => compileAdvertisingLayout(options), (error) => error.code === "invalid-input" && Boolean(error.diagnostic?.violation));
  }

  const impossible = fixture(Array.from({ length: 6 }, () => [200, 100, 2]));
  assert.throws(
    () => compileAdvertisingLayout({ layoutViewportWidth: 320, cards: impossible, categoryOrder: ["fixture"] }),
    (error) => error.code === "search-exhausted" && error.code !== "proven-infeasible",
    "bounded search does not claim an infeasibility proof",
  );
});

test("D9 reports a shared tiny phase budget without claiming infeasibility", () => {
  const cards = fixture([[100, 100], [100, 100], [100, 100], [100, 100]], "d9-tiny");
  assert.throws(
    () => compileAdvertisingProductLayout({
      cards,
      categoryOrder: ["d9-tiny"],
      columns: 2,
      layoutViewportWidth: 390,
      operationBudget: 1,
    }),
    (error) => error.code === "search-exhausted" && error.diagnostic.budget === 1
      && error.diagnostic.operations <= 1 && error.code !== "proven-infeasible",
  );
});

test("organic order preserves a hard-safe requested layout when only its full budget succeeds", () => {
  const cards = fixture([
    ...Array.from({ length: 5 }, () => [100, 150]),
    ...Array.from({ length: 3 }, () => [100, 60]),
  ], "organic-budget");
  const options = {
    cards, categoryOrder: ["organic-budget"], columns: 4,
    layoutViewportWidth: 1024, presentationOrder: cards.map(({ id }) => id),
    operationBudget: 64,
  };
  const baseline = compileAdvertisingProductLayout(options);
  assertGrid(baseline, "hard-safe requested order", cards.length);
  const layout = compileAdvertisingProductLayout({ ...options, organicOrder: true });
  assertGrid(layout, "organic bounded fallback", cards.length);
  assert.equal(layout.diagnostics.operations, 64);
  assert.ok(layout.diagnostics.operations <= layout.diagnostics.budget);
  assert.deepEqual(layout.diagnostics.placementOrder, baseline.diagnostics.placementOrder);
});

test("organic order keeps the 19-card pool hard-safe at the production operation budget", () => {
  const options = organicTightBudgetOptions();
  const layout = compileAdvertisingProductLayout({ ...options, organicOrder: true });
  assertGrid(layout, "19-card production budget", options.cards.length);
  assert.deepEqual(new Set(layout.placements.map(({ card }) => card.id)), new Set(options.presentationOrder));
  assert.ok(layout.diagnostics.operations <= 300000);
});

test("organic order diagnoses a deliberately insufficient 19-card budget without exceeding it", () => {
  const options = organicTightBudgetOptions();
  const operationBudget = 128;
  assert.throws(
    () => compileAdvertisingProductLayout({ ...options, organicOrder: true, operationBudget }),
    (error) => error.code === "search-exhausted" && error.diagnostic.budget === operationBudget
      && error.diagnostic.operations <= operationBudget,
  );
  const candidateOrder = solveAdvertisingOrganicPresentationOrder(options.cards, options.presentationOrder)
    .cards.map(({ id }) => id);
  const candidate = compileAdvertisingProductLayout({ ...options, presentationOrder: candidateOrder, operationBudget });
  assertGrid(candidate, "19-card alternative under tight budget", options.cards.length);
  assert.ok(candidate.diagnostics.operations <= operationBudget);
});

test("organic order prefers a hard-safe layout with better rendered rhythm", () => {
  const cards = fixture([
    ...Array.from({ length: 4 }, () => [100, 200]),
    ...Array.from({ length: 4 }, () => [200, 100]),
  ], "organic-quality");
  const options = {
    cards, categoryOrder: ["organic-quality"], columns: 4,
    layoutViewportWidth: 1024, presentationOrder: cards.map(({ id }) => id),
    operationBudget: 128,
  };
  const baseline = compileAdvertisingProductLayout(options);
  const layout = compileAdvertisingProductLayout({ ...options, organicOrder: true });
  assertGrid(layout, "improved organic rhythm", cards.length);
  assert.ok(scoreAdvertisingOrganicRhythm(layout.placements).score > scoreAdvertisingOrganicRhythm(baseline.placements).score);
  assert.ok(layout.diagnostics.operations <= layout.diagnostics.budget);
});

test("organic order solves only the eligible filter pool when the catalog contains other categories", () => {
  const photos = fixture([
    ...Array.from({ length: 5 }, () => [100, 150]),
    ...Array.from({ length: 3 }, () => [100, 60]),
  ], "organic-filter");
  const others = fixture([[100, 100], [100, 100]], "other-filter");
  const cards = scheduleAdvertisingRank([...photos, ...others].map((card) => ({ ...card, layoutSpan: 1 })), ["organic-filter", "other-filter"]);
  const options = {
    cards, categoryOrder: ["organic-filter", "other-filter"], filter: "organic-filter",
    columns: 4, layoutViewportWidth: 1024,
    presentationOrder: photos.map(({ id }) => id), operationBudget: 128,
  };
  const baseline = compileAdvertisingProductLayout(options);
  const layout = compileAdvertisingProductLayout({ ...options, organicOrder: true });
  assertGrid(layout, "eligible filter pool", photos.length);
  assert.deepEqual(new Set(layout.placements.map(({ card }) => card.id)), new Set(photos.map(({ id }) => id)));
  assert.ok(scoreAdvertisingOrganicRhythm(layout.placements).score > scoreAdvertisingOrganicRhythm(baseline.placements).score);
  assert.ok(layout.diagnostics.operations <= layout.diagnostics.budget);
});

test("organic related order keeps the suggestion block first while mixing photo ratios", () => {
  const suggestion = {
    id: "advertising-suggestion", kind: "suggestion", category: "organic-related",
    sourceOrder: 0, rank: 0, layoutSpan: 1,
    media: { src: "/suggestion.webp", width: 100, height: 100 },
  };
  const photos = fixture([
    ...Array.from({ length: 5 }, () => [100, 150]),
    ...Array.from({ length: 3 }, () => [100, 60]),
  ], "organic-related").map((photo) => ({ ...photo, sourceOrder: photo.sourceOrder + 1, rank: photo.rank + 1 }));
  const cards = [suggestion, ...photos];
  const layout = compileAdvertisingProductLayout({
    cards, categoryOrder: ["organic-related"], columns: 2,
    layoutViewportWidth: 390, presentationOrder: cards.map(({ id }) => id),
    organicOrder: true,
  });
  assertGrid(layout, "related suggestion anchor", cards.length);
  assert.equal(layout.placements[0].card.kind, "suggestion");
  assert.ok(layout.diagnostics.organicRhythm.actual.highLowTransitions > 1);
});

test("R11 lets strict shortest-column continuity use the aligned stagger fallback", () => {
  const layout = compileAdvertisingProductLayout({
    cards: ADVERTISING_CARDS,
    categoryOrder,
    filter: "all",
    columns: 3,
    layoutViewportWidth: 820,
  });
  assert.equal(layout.staggerMinimumRatio, 0.10);
  assert.equal(layout.diagnostics.staggerMode, "fallback");
  assert.equal(layout.diagnostics.fallbackUsed, true);
  assert.equal(layout.placements.length, ADVERTISING_CARDS.length);
  assert.ok(layout.diagnostics.preferredAttempts > 0);
  assert.ok(layout.diagnostics.alignedCandidateAttempts > 0);
  assert.ok(layout.diagnostics.operations <= 300000);
  assertGrid(layout, "D9 real mixed public pool", ADVERTISING_CARDS.length);
});

test("proves a feasible 3000-card fixture independently before benchmarking the solver", () => {
  const benchmark = knownFeasibleFixture();
  const oracleStart = performance.now();
  const expectedInspection = inspectAdvertisingGrid({ layout: benchmark.layout, placements: benchmark.layout.placements });
  const oracleMs = performance.now() - oracleStart;
  assert.equal(expectedInspection.valid, true, `independent expected geometry is feasible: ${JSON.stringify(expectedInspection.violations.slice(0, 3))}`);

  const solverStart = performance.now();
  const layout = compileAdvertisingLayout({ layoutViewportWidth: benchmark.viewport, cards: benchmark.cards, categoryOrder: ["benchmark"] });
  const solverMs = performance.now() - solverStart;
  assertGrid(layout, "3000-card benchmark", benchmark.cards.length);
  assert.ok(layout.diagnostics.operations <= 300000, "3000-card solver stays within deterministic operation budget");
  const target = layout.placements.slice(2800, 2821);
  const top = Math.min(...target.map(({ y }) => y));
  const bottom = Math.max(...target.map(({ y, pixelHeight }) => y + pixelHeight));
  const windowed = getVirtualWindow(layout, { scrollTop: top, viewportHeight: bottom - top, overscan: 0 });
  assert.ok(windowed.items.length < 120, "3000-card virtual window stays bounded");
  assert.ok(target.every(({ card }) => windowed.items.some((item) => item.card.id === card.id)), "virtual window retains placements 2800 to 2820");
  console.log(`[advertising-products-layout] 3000 feasible; oracle ${oracleMs.toFixed(1)}ms; solver ${solverMs.toFixed(1)}ms; operations ${layout.diagnostics.operations}`);
});
