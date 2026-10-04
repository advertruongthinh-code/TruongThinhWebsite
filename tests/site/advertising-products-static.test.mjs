import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { ADVERTISING_CATEGORIES, ADVERTISING_DETAIL_LAYOUTS, buildAdvertisingArtifact } from "../../src/site/advertising-products/catalog.mjs";
import { ADVERTISING_LAYOUT_ALGORITHM_VERSION, columnsForWidth, compileAdvertisingProductLayout as compileAdvertisingLayout } from "../../src/site/advertising-products/layout-core.mjs";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const [runtime, index, css, siteCss, prepare, sharedScripts] = await Promise.all([
  read("src/site/advertising-products/catalog-runtime.mjs"),
  read("src/site/advertising-products/index.html"),
  read("src/site/detail.css"),
  read("src/site/style.css"),
  read("scripts/site/prepare-static-assets.mjs"),
  Promise.all(["src/site/motion.js", "src/site/detail.js"].map(read)).then((sources) => sources.join("\n")),
]);
const artifact = buildAdvertisingArtifact();
const advertisingGridStart = css.indexOf(".advertising-grid {");
const advertisingGridEnd = [css.indexOf(".advertising-photo-view", advertisingGridStart), css.indexOf(".advertising-detail {", advertisingGridStart)]
  .filter((index) => index > advertisingGridStart)
  .sort((left, right) => left - right)[0] ?? css.length;
const advertisingCss = css.slice(advertisingGridStart, advertisingGridEnd);
const previousWindow = globalThis.window;
Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: {} });
let compileAdvertisingRelatedLayout;
let selectAdvertisingRelated;
let selectAdvertisingSuggestions;
try {
  ({ compileAdvertisingRelatedLayout, selectAdvertisingRelated, selectAdvertisingSuggestions } = await import("../../src/site/advertising-products/catalog-runtime.mjs"));
} finally {
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: previousWindow });
}

assert.equal((index.match(/data-advertising-filter=/g) || []).length, 7, "all filters remain available without JavaScript");
assert.deepEqual([...index.matchAll(/data-advertising-filter="([^"]+)"/g)].map(([, slug]) => slug),
  ["all", ...ADVERTISING_CATEGORIES.map(({ slug }) => slug)], "All and the six filters keep their canonical order");
assert.doesNotMatch(sharedScripts, /Math\.random|random-order|shuffle/, "grid routes outside Advertising are never randomized");
assert.equal((index.match(/<noscript>/g) || []).length, 1, "no-JS fallback remains available");
assert.match(prepare, /buildAdvertisingArtifact\(\)/, "prepare step builds the output artifact");
assert.match(prepare, /catalog-artifact\.mjs/, "artifact is output-only");
assert.match(prepare, /compileAdvertisingLayout/, "prepare step uses the pure layout compiler for preflight");
assert.match(prepare, /\[320, 390, 768, 1024, 1440, 1920, 2560\]/, "public preflight covers every required viewport width");
assert.ok(prepare.indexOf("const artifact = buildAdvertisingArtifact();") < prepare.indexOf("await rm(outputRoot"), "artifact validation precedes destructive output cleanup");
assert.match(runtime, /catalog-artifact\.mjs/, "runtime reads generated artifact");
assert.equal(artifact.layoutAlgorithmVersion, ADVERTISING_LAYOUT_ALGORITHM_VERSION);
assert.deepEqual(artifact.settings, {}, "public artifact has no Auto threshold setting");
assert.ok(!Object.hasOwn(artifact, "layouts"), "artifact has no fixed-column layout table");
assert.ok(artifact.cards.every((card) => !Object.hasOwn(card, "layoutSpan")), "public content no longer requires or exposes span choices");
assert.ok(artifact.cards.every((card) => !Object.hasOwn(card, "fitMode") && !Object.hasOwn(card, "presentationCanvas")), "artifact cards do not carry legacy canvas fields");
const kioskFairIds = ["kiosk-posm-25", "kiosk-posm-26", "kiosk-posm-27", "kiosk-posm-28", "kiosk-posm-29", "kiosk-posm-30"];
assert.ok(kioskFairIds.every((id) => artifact.cards.some((card) => card.id === id)), "accepted trade-fair kiosk images appear in the parent-grid artifact");
const kioskDetailSources = [
  ADVERTISING_DETAIL_LAYOUTS["kiosk-posm"].heroSourceId,
  ...ADVERTISING_DETAIL_LAYOUTS["kiosk-posm"].sections.flatMap((section) => section.sourceIds ?? []),
];
assert.ok(kioskFairIds.every((id) => kioskDetailSources.includes(artifact.cards.find((card) => card.id === id)?.media.sourceId)), "accepted trade-fair kiosk images appear in the detail layout");
assert.ok(kioskFairIds.every((id) => !Object.hasOwn(artifact.cards.find((card) => card.id === id), "title")), "accepted trade-fair kiosk cards add no image title");
assert.match(advertisingCss, /\.advertising-grid \{[\s\S]*?--advertising-gap: 15px;/, "mobile grid uses the 15px gap band");
assert.match(advertisingCss, /\.detail-page \.project-index \{[\s\S]*?--advertising-outer: 15px;[\s\S]*?width: calc\(100% - \(2 \* var\(--advertising-outer\)\)\);/, "grid derives symmetric outer bands from one runtime-owned token without a wide-screen content cap");
assert.match(advertisingCss, /@media \(min-width: 751px\)[\s\S]*?--advertising-outer: 25px;/, "middle no-script outer band starts at 751px");
assert.match(advertisingCss, /@media \(min-width: 961px\)[\s\S]*?--advertising-gap: 25px;/, "middle gap band starts at 961px");
assert.match(advertisingCss, /@media \(min-width: 1201px\)[\s\S]*?--advertising-gap: 35px;[\s\S]*?--advertising-outer: 35px;/, "wide no-script viewport uses 35px gap and outer bands");
assert.match(runtime, /advertisingSpacing\(layoutViewportWidth\)[\s\S]*?--advertising-outer[\s\S]*?--advertising-gap[\s\S]*?grid\.clientWidth/, "runtime resolves spacing from document client width before measuring the grid");
assert.match(index, /data-project-grid[\s\S]*?<div[^>]+data-advertising-cta-skeleton[^>]+aria-hidden="true"[\s\S]*?<\/div>\s*<\/div>\s*<section\s+class="detail-cta"/, "the CTA overlays the continuation in the same project section outside the product list");
assert.doesNotMatch(index, /class="detail-cta__skeleton"/, "legacy three-column decoration is removed");
assert.match(runtime, /geometry\.columnBottoms[\s\S]*?dataset\.advertisingCtaFrame/, "CTA continuation starts from the compiled column frontiers");
assert.doesNotMatch(runtime + advertisingCss, /skeleton-dev|skeleton-flow-devtools|createSkeletonFlowDevtools/, "temporary skeleton editor must not ship");
assert.equal(existsSync(new URL("../../src/site/advertising-products/skeleton-flow-devtools.mjs", import.meta.url)), false, "temporary editor module is removed, not merely disabled");
assert.match(runtime, /const skeletonFlowAssignmentBySlot = new Map\(\)[\s\S]*?const skeletonRatioBandBySlot = new Map\(\)/, "each document load starts a fresh batch skeleton assignment scope");
assert.match(runtime, /bandAssignments: skeletonRatioBandBySlot[\s\S]*?frameLayout\.forEach\(\(\{ slot, band \}\) => skeletonRatioBandBySlot\.set\(slot, band\)\)/, "responsive solving preserves each existing skeleton slot's ratio band");
assert.match(runtime, /gridPixelHeight[\s\S]*?createMasonry\(grid, positions, \(\) => gridPixelHeight\)/, "Masonry owns the complete photo and skeleton height");
assert.doesNotMatch(index, /data-advertising-photo-back(?:\s|=|>)/, "photo state does not expose a dedicated Back control");
assert.doesNotMatch(runtime, /\bphotoBack\b/, "photo runtime does not retain dedicated Back behavior");
assert.doesNotMatch(css, /\.advertising-photo-view__back(?:\s|:|\{|,)/, "photo CSS does not retain the removed Back control");
assert.match(index, /data-advertising-photo-description-pager[\s\S]*data-advertising-photo-description-page[\s\S]*data-advertising-photo-description-indicator/,
  "R15 exposes a description pager and accessible page indicator");
const photoInfoMarkup = index.slice(index.indexOf("data-advertising-photo-info"), index.indexOf("data-advertising-photo-related aria-label"));
const relatedGridMarkup = index.slice(index.indexOf("data-advertising-photo-related-grid"), index.indexOf("data-advertising-photo-dialog"));
assert.doesNotMatch(photoInfoMarkup, /data-advertising-photo-suggestion/, "R15 primary info no longer owns the suggestion block");
assert.match(relatedGridMarkup, /data-advertising-photo-suggestion/, "R15 keeps the synthetic suggestion inside the related grid");
assert.match(css, /\.advertising-photo-view__primary\s*\{[^}]*height:\s*var\(--advertising-photo-primary-height\);/,
  "full-span primary follows its measured natural height");
assert.doesNotMatch(css, /\[data-advertising-photo-layout="pinterest"\][\s\S]*?\.advertising-photo-view__primary\s*\{[^}]*block-size:\s*100dvh;/,
  "full-span primary is not forced to fill the viewport");
assert.match(css, /advertising-photo-view__info\s*\{[^}]*overflow:\s*(?:clip|hidden);[^}]*overscroll-behavior:\s*auto;/s,
  "description pagination replaces the inner scroller and never traps vertical scroll");
assert.match(css, /data-advertising-photo-description-pager[^}]*touch-action:\s*pan-y;/s,
  "inline description pager reserves vertical touch gestures for the document");
assert.match(runtime, /primary\.span\s*===\s*(?:primary\.columns|layout\.columns|relatedLayout\.layout\.columns|columns)[\s\S]*?["']pinterest["']/,
  "Pinterest mode derives from primary span equalling total columns");
for (const token of ["ArrowLeft", "ArrowRight", "deltaX", "pointermove"]) {
  assert.match(runtime, new RegExp(token), `description pager runtime is missing ${token}`);
}
assert.match(runtime, /kind:\s*["']suggestion["']/, "suggestion is identified as a synthetic grid card");
assert.match(runtime, /rank:\s*0/, "synthetic suggestion owns rank zero");
assert.match(runtime, /sourceOrder:\s*0/, "synthetic suggestion owns sourceOrder zero");
assert.match(index, /data-advertising-photo-expand[\s\S]*?<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/, "photo expand uses the simple two-arrow icon");
assert.match(index, /data-advertising-photo-zoom-reset[\s\S]*?<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/, "photo reset uses the matching two-arrow icon");
assert.match(css, /\.detail-page \.project-index:has\(\.advertising-grid__cta-skeleton\),\s*\.advertising-photo-view__hero-frame\s*\{[\s\S]*?--advertising-glass-blur:\s*28px;[\s\S]*?--advertising-glass-saturation:\s*1\.08;[\s\S]*?--advertising-glass-brightness:\s*1\.04;[\s\S]*?--advertising-glass-tint:\s*rgba\(255, 255, 255, 0\.12\);/, "skeleton boundary and photo overflow share the exact glass token contract");
assert.match(css, /\.detail-page \.project-index:has\(\.advertising-grid__cta-skeleton:not\(\[hidden\]\)\)::before,\s*\[data-advertising-photo-glass="true"\] \.advertising-photo-view__hero-frame::after\s*\{[\s\S]*?backdrop-filter:\s*blur\(var\(--advertising-glass-blur\)\)\s+saturate\(var\(--advertising-glass-saturation\)\)\s+brightness\(var\(--advertising-glass-brightness\)\)/, "shared glass consumers use the full blur, saturation, and brightness filter only when contain leaves photo overflow");
assert.match(css, /\.detail-page \.project-index:has\(\.advertising-grid__cta-skeleton:not\(\[hidden\]\)\)::before\s*\{[\s\S]*?left:\s*calc\(-1 \* var\(--advertising-outer\)\);[\s\S]*?width:\s*calc\(100% \+ \(2 \* var\(--advertising-outer\)\)\);/, "skeleton glass reaches both viewport edges without moving the grid");
assert.doesNotMatch(css, /\[data-advertising-photo-background\][^{]*\{[^}]*filter:\s*blur\(/, "photo overflow does not fake glass by blurring its source image");
assert.doesNotMatch(runtime, /photoBackground\.style\.filter|filter:\s*"blur\(/, "photo overflow motion leaves blur ownership to the shared glass surface");
  assert.match(css, /\.advertising-photo-view__image-action\s*\{[\s\S]*?--image-action-edge-padding:\s*14px;/, "photo image action defines balanced horizontal edge padding");
  assert.match(css, /\.advertising-photo-view__image-action span\s*\{[\s\S]*?calc\(var\(--image-action-edge-padding\) \+ 3px\)/, "expanded photo action balances real text ink against the icon path");
assert.match(css, /\.advertising-grid__cta-skeleton[\s\S]*?position:\s*absolute;[\s\S]*?pointer-events:\s*none;/, "CTA skeleton is a non-interactive spatial layer in the grid");
assert.match(css, /\.advertising-grid__cta-frame[\s\S]*?opacity:\s*var\(--advertising-cta-frame-opacity\);/, "each continuation frame owns its progressive spatial fade");
assert.match(css, /\.advertising-grid__cta-surface \{[\s\S]*?border:\s*0;/, "skeleton surfaces have no visible frame border");
assert.doesNotMatch(advertisingCss, /grid-template-columns|column-count/, "product CSS does not create a second column algorithm");
assert.doesNotMatch(index, /<figcaption\b/, "Advertising no-script cards have no image captions");
assert.doesNotMatch(runtime, /createElement\("figcaption"\)/, "related cards have no image captions");
assert.doesNotMatch(runtime, /data-advertising-photo-title/, "photo runtime does not render an image title");
assert.doesNotMatch(index, /data-advertising-photo-title|id="du-an-title"/, "Advertising markup has no image or grid title");
assert.match(index, /data-advertising-photo-info[^>]*aria-label="Thông tin ảnh sản phẩm quảng cáo"/, "photo information retains an accessible region label");
assert.match(photoInfoMarkup, /data-advertising-photo-description[\s\S]*?data-advertising-photo-cta/, "CTA remains in primary information after the description pager");
assert.doesNotMatch(index + runtime, /data-advertising-photo-tag-reset|advertisingSuggestionSlot|measureSuggestionHeight/, "standalone reset and legacy suggestion slot are absent");
assert.match(runtime, /suggestionPlacement/, "R15 exposes the synthetic suggestion placement in the related grid");
assert.match(siteCss, /--media-label-overlay:\s*rgba\(0, 0, 0, 0\.4\);/, "portal and suggestion share the measured Pinterest inactive overlay token");
assert.match(siteCss, /\.portal-shade \{[\s\S]*?background: var\(--media-label-overlay\);/, "homepage portal uses the shared inactive overlay");
assert.match(css, /\.advertising-photo-view__suggestion-link::after \{[\s\S]*?background: var\(--media-label-overlay\);/, "inactive suggestion uses the same overlay");
assert.match(css, /advertising-photo-view__suggestion-links \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/, "suggestions use one full-width row per button");
assert.match(css, /suggestion-link\[aria-pressed="true"\] \{[\s\S]*?background: var\(--white\);/, "only the active suggestion exposes the white surface");
assert.match(css, /suggestion-link\[aria-pressed="true"\] \{[\s\S]*?border-color: var\(--ink\);[\s\S]*?background: var\(--white\);/, "only the active suggestion exposes the ink border and white surface");
assert.match(css, /suggestion-link\[aria-pressed="true"\] img \{[\s\S]*?opacity: 0 !important;[\s\S]*?transform: none !important;/, "active suggestion hides and resets the full-frame photo");
assert.match(css, /suggestion-link\[aria-pressed="true"\] \.advertising-photo-view__suggestion-label \{\s*color: var\(--ink\);\s*\}/, "active suggestion keeps a readable ink fallback without text clipping");
assert.doesNotMatch(css, /--advertising-suggestion-image|background-clip:\s*text/, "active suggestion uses plain ink text without an image mask");
assert.doesNotMatch(css, /suggestion-link:hover:not\(\[aria-pressed="true"\]\)::after\s*\{[^}]*filter:/, "inactive suggestion hover does not change overlay darkness");
assert.doesNotMatch(siteCss, /service-portal:hover \.portal-shade\s*\{[^}]*background:/, "portal hover does not change overlay darkness");
assert.match(css, /suggestion-link \{[\s\S]*?transition: background-color 250ms ease-out, border-color 250ms ease-out;/, "active state crossfades its surface and border without layout change");
assert.match(css, /advertising-photo-view__info \[data-advertising-photo-description\] \{[\s\S]*?font-size: 1rem;/, "description text scales with the root font size without redesigning the category eyebrow");
assert.doesNotMatch(advertisingCss, /advertising-grid \.advertising-tile figcaption|\[data-advertising-related-card\] figcaption/, "Advertising CSS reserves no caption space");
assert.match(advertisingCss, /\.advertising-tile \{[\s\S]*?contain: layout;/, "tile layout containment preserves the external focus-visible outline");
assert.doesNotMatch(advertisingCss, /\.advertising-tile \{[^}]*contain:\s*layout paint;/s, "tile paint containment cannot clip the focus-visible outline");
assert.match(advertisingCss, /advertising-tile__media--natural[\s\S]*?background: transparent;/, "natural media has no frame surface");
assert.match(advertisingCss, /\.advertising-tile img[\s\S]*?display: block;[\s\S]*?width: 100%;[\s\S]*?height: auto;/, "natural media keeps intrinsic ratio without crop or stretch");
assert.match(advertisingCss, /advertising-tile img\.is-advertising-media-ready[\s\S]*?opacity: 1;/, "natural media keeps the accepted entrance state");
assert.match(siteCss, /\.media-hover-zoom-trigger:not\(\[aria-pressed="true"\]\):hover \.media-hover-zoom\s*\{[\s\S]*?transform: scale\(1\.15\);/, "inactive advertising media inherits the shared project-card hover zoom");
assert.doesNotMatch(advertisingCss, /object-fit|advertising-tile__backplate|data-media-fit|media--canvas/, "Advertising browse media has no crop, canvas, fit, or backplate selectors");
assert.ok(!existsSync(new URL("../../src/site/advertising-products/catalog-artifact.mjs", import.meta.url)), "source tree does not contain a generated artifact");

const categoryOrder = artifact.categories.map((entry) => entry.slug);
const samplingHero = artifact.cards.find((card) => card.id === "kiosk-posm-07");
const samplingCrossGroup = artifact.cards.find((card) => card.id === "mobile-retail-04");
assert.ok(samplingHero && samplingCrossGroup, "authored sampling fixtures are missing");
const suggestions = selectAdvertisingSuggestions({ cards: artifact.cards, heroId: samplingHero.id, tagRegistry: artifact.tagRegistry });
assert.ok(suggestions.length > 0 && suggestions.length <= 4, "suggestion tile should expose no more than four contextual labels with valid media");
assert.deepEqual(
  suggestions.map(({ card, tag }) => [tag.id, card.id]),
  selectAdvertisingSuggestions({ cards: artifact.cards, heroId: samplingHero.id, tagRegistry: artifact.tagRegistry }).map(({ card, tag }) => [tag.id, card.id]),
  "suggestion labels and representative photos must remain stable for a hero ID",
);
assert.ok(suggestions.every(({ card, tag }) => card.tagIds.includes(tag.id)
  && card.media.src && card.media.width > 0 && card.media.height > 0), "each suggestion representative must match its authored tag and have valid media");
for (const { card, tag } of suggestions) {
  const alternativeExists = artifact.cards.some((candidate) => candidate.id !== samplingHero.id && candidate.tagIds.includes(tag.id));
  if (alternativeExists) assert.notEqual(card.id, samplingHero.id, `suggestion ${tag.id} should not reuse the hero when another representative exists`);
}
const externalActive = selectAdvertisingSuggestions({ cards: artifact.cards, heroId: samplingHero.id, activeTag: "format-square", tagRegistry: artifact.tagRegistry });
const externalActiveSlot = externalActive.find(({ tag }) => tag.id === "format-square");
assert.equal(externalActive.length, 4, "an active URL tag keeps the fixed four suggestion slots");
assert.ok(externalActiveSlot, "an active URL tag outside the normal product/use list stays visible for toggle-off");
assert.ok(externalActiveSlot.card.media.src, "an externally active tag keeps its image-backed toggle");
assert.equal(new Set(externalActive.map(({ tag }) => tag.id)).size, 4, "an active URL tag appears once among four unique suggestion slots");
assert.deepEqual(
  externalActive.map(({ card, tag }) => [tag.id, card.id]),
  selectAdvertisingSuggestions({ cards: artifact.cards, heroId: samplingHero.id, activeTag: "format-square", tagRegistry: artifact.tagRegistry })
    .map(({ card, tag }) => [tag.id, card.id]),
  "active URL slots remain deterministic without prepending the active tag",
);
const mobileSuggestions = selectAdvertisingSuggestions({ cards: artifact.cards, heroId: samplingCrossGroup.id, tagRegistry: artifact.tagRegistry });
const mobileAuthoredTags = new Set(samplingCrossGroup.tagIds);
assert.ok(mobileSuggestions.every(({ card, tag }) => mobileAuthoredTags.has(tag.id)
  || card.category === samplingCrossGroup.category), "fallback suggestions must stay inside the hero category");
assert.ok(mobileSuggestions.every(({ card, tag }) => card.category === samplingCrossGroup.category
  || mobileAuthoredTags.has(tag.id)
  || tag.group === "use"), "cross-category representatives require a hero-authored or shared-use tag");
assert.match(runtime, /advertising-photo-view__suggestion-links[\s\S]*advertising-photo-view__suggestion-link[\s\S]*advertising-photo-view__suggestion-label/, "suggestion tile renders the approved link and label hooks");
assert.match(runtime, /function createPhotoMedia[\s\S]*advertising-card-media__image/, "grid and suggestion media share one media helper");
assert.match(runtime, /link\.className = "advertising-card-interactive media-hover-zoom-trigger"[\s\S]*advertising-card-media[\s\S]*createPhotoMedia\(record, locale\)/, "grid cards opt into the shared media interaction");
assert.match(runtime, /advertising-photo-view__suggestion-link advertising-card-interactive advertising-card-media[\s\S]*createPhotoMedia\(card, locale, \{ suggestion: true \}\)/, "suggestion buttons reuse the shared media interaction");
assert.doesNotMatch(runtime, /startSuggestionMotion|advertising-suggestion-image|scale\(1\.06\)/, "suggestions do not run a second hover or slideshow motion provider");
assert.match(runtime, /"internal-gap": primary\.internalGap/, "detail runtime passes the span-three internal gap to CSS");
assert.match(siteCss, /media-hover-zoom-trigger:not\(\[aria-pressed="true"\]\):hover \.media-hover-zoom[\s\S]*?media-hover-zoom-trigger:not\(\[aria-pressed="true"\]\):focus-visible \.media-hover-zoom[\s\S]*?transform: scale\(1\.15\)/, "inactive grid and suggestion media share the same hover and focus zoom contract");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*advertising-card-media__image[\s\S]*transform: none !important;/, "shared media zoom has a reduced-motion path");
assert.match(runtime, /const nextTag = browseHistory\.current\.tag === tag \? null : tag/, "clicking the current suggestion tag should toggle it off through replaceState history");
const sameCategory = selectAdvertisingRelated({ cards: artifact.cards, categoryOrder, heroId: samplingHero.id });
assert.ok(sameCategory.length > 0 && sameCategory.every((card) => card.category === samplingHero.category && card.id !== samplingHero.id));
assert.deepEqual(
  sameCategory.map((card) => [card.sourceOrder, card.id]),
  [...sameCategory].sort((left, right) => left.sourceOrder - right.sourceOrder || left.id.localeCompare(right.id)).map((card) => [card.sourceOrder, card.id]),
  "reset/no-tag order is stable within the hero category",
);
const samplingRelated = selectAdvertisingRelated({ cards: artifact.cards, categoryOrder, heroId: samplingHero.id, tag: "use-sampling" });
assert.ok(samplingRelated.some((card) => card.id === samplingCrossGroup.id), "authored sampling tag must cross category groups");
assert.ok(samplingRelated.every((card) => card.id !== samplingHero.id), "hero cannot appear in related results");
assert.deepEqual(
  samplingRelated.map((card) => [categoryOrder.indexOf(card.category), card.sourceOrder, card.id]),
  [...samplingRelated]
    .sort((left, right) => categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category) || left.sourceOrder - right.sourceOrder || left.id.localeCompare(right.id))
    .map((card) => [categoryOrder.indexOf(card.category), card.sourceOrder, card.id]),
  "tagged related order is stable across category, source order, and ID",
);
assert.equal(new Set(samplingRelated.map((card) => card.id)).size, samplingRelated.length, "duplicate tag IDs cannot duplicate related cards");
assert.deepEqual(
  selectAdvertisingRelated({
    cards: artifact.cards.map((card) => card.id === samplingCrossGroup.id ? { ...card, tagIds: [...card.tagIds, "use-sampling"] } : card),
    categoryOrder,
    heroId: samplingHero.id,
    tag: "use-sampling",
  }).map((card) => card.id),
  samplingRelated.map((card) => card.id),
  "duplicate authored tags do not alter stable related order",
);
assert.deepEqual(selectAdvertisingRelated({ cards: artifact.cards, categoryOrder, heroId: samplingHero.id, tag: "no-result" }), [], "unknown/no-result tag yields a real empty state");
let relatedSolverCards;
const relatedLayout = compileAdvertisingRelatedLayout({
  cards: artifact.cards,
  categoryOrder,
  compile(options) {
    relatedSolverCards = options.cards;
    return compileAdvertisingLayout(options);
  },
  datasetVersion: artifact.datasetVersion,
  heroId: samplingHero.id,
  layoutViewportWidth: 1440,
  viewportHeight: 900,
  headerHeight: 102.515625,
  settings: artifact.settings,
  tag: "use-sampling",
});
assert.deepEqual(relatedLayout.layout.initialColumnBottoms, Array.from({ length: relatedLayout.layout.columns }, (_, column) =>
  column < relatedLayout.primary.span ? relatedLayout.primary.height : 0),
"related seeds reserve only the primary after D8-B");
assert.equal(relatedLayout.cards[0], samplingRelated[0], "related adapter preserves canonical card identity");
assert.ok(relatedLayout.photoPlacements.every((placement) =>
  placement.width === 1 && placement.card === artifact.cards.find((card) => card.id === placement.card.id)),
"related layout uses one column without replacing source photo identity");
assert.equal(relatedLayout.photoPlacements.length, samplingRelated.length);
assert.deepEqual(relatedSolverCards.map((card) => card.sourceOrder), relatedSolverCards.map((_, index) => index), "private solver source order follows stable insertion order");
assert.deepEqual(relatedSolverCards.map((card) => card.rank), relatedSolverCards.map((_, index) => index), "private solver rank follows stable insertion order");
assert.ok(relatedLayout.photoPlacements.every((placement) => {
  const canonical = artifact.cards.find((card) => card.id === placement.card.id);
  return placement.card === canonical
    && placement.card.media.width === canonical.media.width
    && placement.card.media.height === canonical.media.height;
}), "actual photo placements retain canonical identity and intrinsic dimensions");

const overlaps = (left, right) => left.x < right.x + right.pixelWidth - 0.05
  && right.x < left.x + left.pixelWidth - 0.05
  && left.y < right.y + right.pixelHeight - 0.05
  && right.y < left.y + left.pixelHeight - 0.05;
const assertNoOverlap = (compiled, label) => {
  const placements = compiled.photoPlacements;
  for (let left = 0; left < placements.length; left += 1) {
    for (let right = left + 1; right < placements.length; right += 1) {
      assert.ok(!overlaps(placements[left], placements[right]), `${label}: ${placements[left].card.id} overlaps ${placements[right].card.id}`);
    }
  }
};
const zeroRelatedLayout = compileAdvertisingRelatedLayout({
  cards: artifact.cards,
  categoryOrder,
  datasetVersion: artifact.datasetVersion,
  heroId: samplingHero.id,
  layoutViewportWidth: 390,
  settings: artifact.settings,
  tag: "no-result",
});
const oneRelatedLayout = compileAdvertisingRelatedLayout({
  cards: [samplingHero, sameCategory[0]],
  categoryOrder,
  datasetVersion: artifact.datasetVersion,
  heroId: samplingHero.id,
  layoutViewportWidth: 768,
  settings: artifact.settings,
});
assert.equal(zeroRelatedLayout.photoPlacements.length, 0, "empty results leave the related grid without a synthetic suggestion");
assert.equal(zeroRelatedLayout.layout.placements.length, 0);
assert.equal(oneRelatedLayout.photoPlacements.length, 1, "one-result layout keeps one real photo without a suggestion reservation");
assert.equal(oneRelatedLayout.layout.placements.length, 1);
assertNoOverlap(zeroRelatedLayout, "zero-related layout");
assertNoOverlap(oneRelatedLayout, "one-related layout");
assertNoOverlap(relatedLayout, "many-related layout");

const sparsePeek = compileAdvertisingRelatedLayout({
  cards: artifact.cards.filter((card) => ["kiosk-posm-01", "kiosk-posm-13"].includes(card.id)), categoryOrder, datasetVersion: artifact.datasetVersion,
  heroId: "kiosk-posm-01", tag: "product-kiosk-posm-product-01",
  layoutViewportWidth: 1569, viewportHeight: 912, headerHeight: 102.515625,
  settings: artifact.settings, measureDescriptionHeight: () => 320,
});
assert.equal(sparsePeek.photoPlacements.length, 1, "D14 sparse fixture contains exactly one real photo");
assert.equal(sparsePeek.layout.columns, 4, "D14 sparse fixture keeps four columns");
assert.equal(sparsePeek.photoPlacements[0].y, 0, "D14 single photo stays alongside primary");
assert.ok(sparsePeek.photoPlacements[0].x >= sparsePeek.primary.width + sparsePeek.primary.gap - 0.1,
  "D14 single photo occupies column four without requiring a second photo below");
const tabletSpan3 = compileAdvertisingRelatedLayout({
  cards: artifact.cards, categoryOrder, datasetVersion: artifact.datasetVersion,
  heroId: "mobile-retail-04", tag: "use-sampling",
  layoutViewportWidth: 810, viewportHeight: 1180, headerHeight: 132.78125,
  settings: artifact.settings, measureDescriptionHeight: () => 537,
});
assert.ok(tabletSpan3.primary.height <= 1180, "full-span Pinterest group stays within one dynamic viewport");
assert.equal(tabletSpan3.primary.mode, "pinterest", "span3 switches to Pinterest layout when it fills all three columns");
assert.ok(tabletSpan3.primary.descriptionHeight + tabletSpan3.primary.internalGap <= 1180 * 0.28,
  "Pinterest description and gap stay within the viewport-based 28% cap");
assert.ok(Math.abs(tabletSpan3.primary.imageHeight - tabletSpan3.primary.imageZoneHeight) <= 0.1,
  "Pinterest image has no top or bottom overflow");
assert.ok(Math.abs(tabletSpan3.primary.imageZoneHeight + tabletSpan3.primary.internalGap
  + tabletSpan3.primary.descriptionHeight - tabletSpan3.primary.height) <= 0.01,
"Pinterest image, gap, and description exactly fill the group");
assert.equal(tabletSpan3.layout.columns, columnsForWidth(810), "tablet span3 keeps the fixed responsive column count");
assert.equal(tabletSpan3.primary.span, 3, "tablet primary reserves all three responsive columns");
assert.equal(tabletSpan3.photoPlacements.length, 3, "tablet span3 retains every related real photo");
assert.ok(tabletSpan3.photoPlacements.every((placement) => placement.y >= tabletSpan3.primary.height + tabletSpan3.primary.gap - 0.1),
  "tablet span3 keeps this sparse fixture below the primary");
assert.deepEqual(tabletSpan3.layout.diagnostics.attempts.map(({ mode }) => mode), ["alongside"],
  "tablet span3 requires one bounded solver pass because no side column remains");
assert.ok(tabletSpan3.layout.diagnostics.attempts.reduce((total, attempt) => total + attempt.operations, 0) <= 300000,
  "tablet span3 attempts stay within the fixed search budget");
assert.equal(tabletSpan3.layout.diagnostics.budget, 300000, "tablet span3 reports the aggregate search budget");
assertNoOverlap(tabletSpan3, "tablet span3 related photos");
const singleColumnPeek = compileAdvertisingRelatedLayout({
  cards: artifact.cards, categoryOrder, datasetVersion: artifact.datasetVersion,
  heroId: samplingHero.id, columns: 1, layoutViewportWidth: 390, viewportHeight: 844,
  headerHeight: 87.5, settings: artifact.settings,
});
const firstSinglePhoto = singleColumnPeek.photoPlacements[0];
assert.ok(firstSinglePhoto, "one-column related layout retains a real photo");
assertNoOverlap(singleColumnPeek, "one-column related photos");
assert.equal(singleColumnPeek.layout.columnBottoms[0], Math.max(...singleColumnPeek.photoPlacements.map((item) => item.y + item.pixelHeight)),
  "one-column frontier contains only real photos");

let scrollbarDesktopColumns;
const scrollbarDesktopLayout = compileAdvertisingRelatedLayout({
  cards: artifact.cards,
  categoryOrder,
  columns: 3,
  compile(options) {
    scrollbarDesktopColumns = options.columns;
    return compileAdvertisingLayout(options);
  },
  datasetVersion: artifact.datasetVersion,
  heroId: samplingHero.id,
  layoutViewportWidth: 951,
  viewportHeight: 900,
  headerHeight: 85.390625,
  settings: artifact.settings,
});
assert.ok(scrollbarDesktopColumns <= 3, "related columns respect the responsive width and bounded fallback");
assert.ok(scrollbarDesktopLayout.primary.span <= scrollbarDesktopColumns, "primary is recomputed for the accepted column count");
assertNoOverlap(scrollbarDesktopLayout, "scrollbar desktop related layout");

console.log(`[advertising-products-static] ${ADVERTISING_LAYOUT_ALGORITHM_VERSION} boundary, CTA continuation, related adapter, spacing, typography, and natural media contract passed`);
