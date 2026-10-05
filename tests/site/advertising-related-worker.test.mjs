import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAdvertisingArtifact } from "../../src/site/advertising-products/catalog.mjs";
import {
  advertisingSpacing,
  columnsForWidth,
  normalizeAdvertisingProductSettings,
} from "../../src/site/advertising-products/layout-core.mjs";
import {
  compileAdvertisingRelatedLayout,
  hydrateRelatedLayout,
  solveRelatedRequest,
} from "../../src/site/advertising-products/related-layout.mjs";

const artifact = buildAdvertisingArtifact();
const categoryOrder = artifact.categories.map(({ slug }) => slug);
const DESCRIPTION_HEIGHT = 120;
const MINIMUM_DESCRIPTION_HEIGHT = 64;
const HEROES = ["kiosk-posm-10", "print-decals-11", "kiosk-posm-07", "kiosk-posm-30", "mobile-retail-04", "signage-raised-letters-02"];
// Small (use-sampling), mid (product-kiosk-posm-product-01) and the largest pool (format-landscape) plus an empty one.
const TAGS = [null, "use-sampling", "product-kiosk-posm-product-01", "format-landscape", "no-such-tag"];
const SEEDS = [null, "visit-a", "visit-b"];
// [expected columns, viewport]. columnsForWidth never returns fewer than two columns, so the
// one-column case uses the explicit columns override that both paths accept.
const VIEWPORTS = [
  [1, { columns: 1, layoutViewportWidth: 360, viewportHeight: 740, headerHeight: 72.59375, safeTop: 47, safeBottom: 34, minimumImageZoneHeight: 96 }],
  [2, { layoutViewportWidth: 390, viewportHeight: 844, headerHeight: 72.59375, safeTop: 47, safeBottom: 34, minimumImageZoneHeight: 96 }],
  [3, { layoutViewportWidth: 800, viewportHeight: 1180, headerHeight: 132.78125, safeTop: 24, safeBottom: 20, minimumImageZoneHeight: 96 }],
  [4, { layoutViewportWidth: 1569, viewportHeight: 912, headerHeight: 102.515625, safeTop: 0, safeBottom: 0, minimumImageZoneHeight: 96 }],
];

function suggestionFor(columns, { layoutViewportWidth }) {
  const { outer, interCardGap } = advertisingSpacing(layoutViewportWidth);
  const width = (layoutViewportWidth - 2 * outer - interCardGap * (columns - 1)) / columns;
  return {
    id: "advertising-suggestion", kind: "suggestion", category: categoryOrder[0],
    sourceOrder: 0, rank: 0, layoutSpan: 1, media: { src: "/x.webp", width, height: 260 },
  };
}

// Main thread solves with DOM measurements; the worker gets the same numbers through postMessage.
function solveBoth(source, { primaryMediaId, ...input }) {
  const hero = source.cards.find(({ id }) => id === input.heroId);
  const main = compileAdvertisingRelatedLayout({
    ...input, cards: source.cards, categoryOrder: source.categories.map(({ slug }) => slug),
    datasetVersion: source.datasetVersion, settings: normalizeAdvertisingProductSettings(source.settings),
    primaryMedia: hero.mediaItems.find(({ id }) => id === primaryMediaId) ?? null,
    measureDescriptionHeight: () => DESCRIPTION_HEIGHT,
    measureDescriptionMinimumHeight: () => MINIMUM_DESCRIPTION_HEIGHT,
  });
  const request = { ...input, primaryMediaId, descriptionHeight: DESCRIPTION_HEIGHT, minimumDescriptionHeight: MINIMUM_DESCRIPTION_HEIGHT };
  const solved = structuredClone(solveRelatedRequest(structuredClone(request), source));
  return { main, solved, worker: hydrateRelatedLayout(solved, source.cards, input.suggestionCard) };
}

const PLACEMENT_FIELDS = ["x", "y", "left", "top", "width", "height", "pixelWidth", "pixelHeight", "mediaPixelHeight", "captionPixelHeight", "index"];
const placementView = (placement) => placement && [placement.card.id, ...PLACEMENT_FIELDS.map((field) => placement[field])];
const parityView = ({ primary, layout, cards, suggestionPlacement, photoPlacements }) => ({
  primary,
  columns: layout.columns,
  totalPixelHeight: layout.totalPixelHeight,
  totalHeight: layout.totalHeight,
  coordinateHash: layout.coordinateHash,
  placements: layout.placements.map(placementView),
  cards: cards.map(({ id }) => id),
  suggestionPlacement: placementView(suggestionPlacement),
  photoPlacements: photoPlacements.map(({ card }) => card.id),
});

function assertParity(source, input, label) {
  const { main, solved, worker } = solveBoth(source, input);
  assert.deepEqual(parityView(worker), parityView(main), label);
  const byId = new Map(source.cards.map((card) => [card.id, card]));
  assert.ok(worker.cards.every((card) => byId.get(card.id) === card), `${label}: related cards are the artifact records`);
  assert.ok(worker.layout.placements.every(({ card }, index) => card === main.layout.placements[index].card
    && (card === input.suggestionCard || byId.get(card.id) === card)), `${label}: placements reference the artifact records`);
  return { main, solved };
}

test("worker path output equals the main-thread related solver", () => {
  for (const heroId of HEROES) assert.ok(artifact.cards.some(({ id }) => id === heroId), `${heroId} exists`);
  let cases = 0;
  let suggestionJoined = 0;
  let largestMessage = 0;
  // Full matrix: 6 heroes x 5 tags x 3 seeds x (4 photo-only + 3 suggestion viewports) = 630 cases, about 2 s.
  for (const heroId of HEROES) for (const tag of TAGS) for (const seed of SEEDS) {
    for (const [columns, viewport] of VIEWPORTS) {
      for (const suggestionCard of columns <= 3 ? [null, suggestionFor(columns, viewport)] : [null]) {
        const label = `${heroId} ${tag} ${seed} ${columns}col ${suggestionCard ? "suggestion" : "photos"}`;
        const { main, solved } = assertParity(artifact, { heroId, tag, seed, ...viewport, suggestionCard }, label);
        assert.equal(main.layout.columns, columns, `${label}: viewport gives the intended column count`);
        if (main.suggestionPlacement) suggestionJoined += 1;
        largestMessage = Math.max(largestMessage, JSON.stringify(solved).length);
        cases += 1;
      }
    }
  }
  assert.equal(columnsForWidth(VIEWPORTS[0][1].layoutViewportWidth), 2, "the one-column case really needs the override");
  assert.ok(suggestionJoined > 0, "some cases put the suggestion into the solver");
  assert.ok(largestMessage < 30000, `largest solved message is ${largestMessage} characters`);
  console.log(`[advertising-related-worker] ${cases} cases, ${suggestionJoined} with suggestion, largest message ${largestMessage} characters`);
});

test("worker resolves primaryMediaId to the same primary media as the main thread", () => {
  // No authored card has several media items yet, and the media contract keeps every item at the
  // card ratio. The fixture item uses another ratio only so a wrong lookup changes the geometry.
  const heroId = "kiosk-posm-10";
  const alternateId = `${heroId}-alternate`;
  const multiMedia = {
    ...artifact,
    cards: artifact.cards.map((card) => card.id !== heroId ? card : {
      ...card, mediaItems: [...card.mediaItems, { ...card.mediaItems[0], id: alternateId, width: 1536, height: 1024 }],
    }),
  };
  for (const [columns, viewport] of VIEWPORTS) {
    const label = `${heroId} alternate media ${columns}col`;
    const { main } = assertParity(multiMedia, { heroId, tag: null, seed: "visit-a", ...viewport, suggestionCard: null, primaryMediaId: alternateId }, label);
    const cover = solveBoth(multiMedia, { heroId, tag: null, seed: "visit-a", ...viewport, suggestionCard: null }).main;
    assert.notDeepEqual(main.primary, cover.primary, `${label}: the alternate item drives the primary geometry`);
  }
});

test("worker solve throws for an unknown photo so the worker posts an error", () => {
  assert.throws(() => solveRelatedRequest(structuredClone({
    heroId: "no-such-photo", tag: null, seed: null, ...VIEWPORTS[1][1],
    descriptionHeight: DESCRIPTION_HEIGHT, minimumDescriptionHeight: MINIMUM_DESCRIPTION_HEIGHT,
  }), artifact), /known photo/);
});
