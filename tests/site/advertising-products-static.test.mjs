import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import vm from "node:vm";
import { ADVERTISING_CATEGORIES, ADVERTISING_PAGES, buildAdvertisingArtifact } from "../../src/site/advertising-products/catalog.mjs";
import { MASONRY_LAYOUT_VERSION, columnsForWidth, compileMasonryLayout } from "../../src/site/masonry/layout.mjs";
import { bandKey } from "../../src/site/masonry/replay.mjs";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const [runtime, index, css, siteCss, prepare, sharedScripts] = await Promise.all([
  read("src/site/masonry/runtime.mjs"),
  Promise.all(["src/site/advertising-products/index.html", "src/site/head-inline.js"].map(read)).then((sources) => sources.join("\n")),
  read("src/site/detail.css"),
  read("src/site/style.css"),
  read("scripts/site/prepare-static-assets.mjs"),
  Promise.all(["src/site/motion.js", "src/site/detail.js", "src/site/index.html"].map(read)).then((sources) => sources.join("\n")),
]);
const artifact = buildAdvertisingArtifact();
const advertisingGridStart = css.indexOf(".masonry-grid {");
const advertisingGridEnd = [css.indexOf(".detail-view", advertisingGridStart), css.indexOf(".advertising-detail {", advertisingGridStart)]
  .filter((index) => index > advertisingGridStart)
  .sort((left, right) => left - right)[0] ?? css.length;
const advertisingCss = css.slice(advertisingGridStart, advertisingGridEnd);
const previousWindow = globalThis.window;
Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: {} });
let compileRelatedLayout;
let selectRelated;
let selectSuggestions;
try {
  ({ compileRelatedLayout, selectRelated, selectSuggestions } = await import("../../src/site/masonry/runtime.mjs"));
} finally {
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: previousWindow });
}

// The rail is generated at build time from taxonomy.mjs (taxonomy R3), so read the built HTML.
const builtIndex = await read(".site-output/advertising-products/index.html");
assert.equal((builtIndex.match(/data-masonry-filter=/g) || []).length, 7, "all filters remain available without JavaScript");
assert.deepEqual([...builtIndex.matchAll(/data-masonry-filter="([^"]+)"/g)].map(([, slug]) => slug),
  ["all", ...ADVERTISING_CATEGORIES.map(({ slug }) => slug)], "All and the six clusters keep taxonomy order");
// The build wraps plain content images in <picture>; images the runtime owns (data-masonry-*, data-detail-*, data-viewer-*)
// must stay bare, or the detail hero frame stops being the parent the runtime inserts its skeleton into (plan T8, B5).
assert.doesNotMatch(builtIndex, /<picture>(?:(?!<\/picture>)[\s\S])*?<img\b[^>]*\sdata-(?:masonry|detail|viewer)-/,
  "runtime-owned images are not wrapped in <picture> by the build");
// The only exception: choosing and shuffling the home hero slides (page-home R3), not a grid.
assert.doesNotMatch(sharedScripts.replace("const first = Math.floor(Math.random() * slides.length);", "")
  .replace("[slide.dataset.slide === first ? -1 : Math.random(), slide]", ""),
  /Math\.random|random-order|shuffle/, "grid routes outside Advertising are never randomized");
assert.equal((index.match(/<noscript>/g) || []).length, 1, "no-JS fallback remains available");
assert.match(css, /@media \(scripting: none\) \{\s*\.project-grid > noscript \{\s*display: contents;/,
  "no-JS fallback markup never renders as text while JavaScript loads the catalog");
assert.match(prepare, /buildAdvertisingArtifact\(\)/, "prepare step builds the output artifact");
assert.match(prepare, /catalog-artifact\.mjs/, "artifact is output-only");
assert.match(prepare, /runtimeSource\.matchAll\(\/from[\s\S]*rel="modulepreload"/, "Advertising pages preload every static runtime import (static-release R1)");
assert.match(builtIndex, /rel="modulepreload" href="\/masonry\/replay\.mjs"/, "the layout cache replay is preloaded with the runtime");
assert.doesNotMatch(builtIndex, /packer\.mjs/, "public pages never load the build-side layout packer (advertising-masonry R6)");
assert.match(prepare, /buildLayoutCache(?:Memo)?\(\{ cards: artifact\.cards, filters: PUBLIC_GRID_FILTERS/, "prepare step builds and self-checks the masonry layout cache for every public filter (static-release R2)");
assert.ok(prepare.indexOf("buildLayoutCacheMemo({") < prepare.indexOf("await rm(outputRoot"), "layout cache self-check precedes destructive output cleanup");
assert.ok(prepare.indexOf("const artifact = buildAdvertisingArtifact();") < prepare.indexOf("await rm(outputRoot"), "artifact validation precedes destructive output cleanup");
assert.match(runtime, /catalog-artifact\.mjs/, "runtime reads generated artifact");
assert.equal(artifact.layoutAlgorithmVersion, MASONRY_LAYOUT_VERSION);
assert.deepEqual(artifact.settings, {}, "public artifact has no Auto threshold setting");
assert.ok(!Object.hasOwn(artifact, "layouts"), "artifact has no fixed-column layout table");
assert.ok(artifact.cards.every((card) => !Object.hasOwn(card, "layoutSpan")), "public content no longer requires or exposes span choices");
assert.ok(artifact.cards.every((card) => !Object.hasOwn(card, "fitMode") && !Object.hasOwn(card, "presentationCanvas")), "artifact cards do not carry legacy canvas fields");
const kioskFairIds = ["kiosk-posm-25", "kiosk-posm-26", "kiosk-posm-27", "kiosk-posm-28", "kiosk-posm-29", "kiosk-posm-30"];
assert.ok(kioskFairIds.every((id) => artifact.cards.some((card) => card.id === id)), "accepted trade-fair kiosk images appear in the parent-grid artifact");
assert.ok(kioskFairIds.every((id) => !Object.hasOwn(artifact.cards.find((card) => card.id === id), "title")), "accepted trade-fair kiosk cards add no image title");
assert.match(advertisingCss, /\.masonry-grid \{[\s\S]*?--masonry-gap: 15px;/, "mobile grid uses the 15px gap band");
assert.match(advertisingCss, /\.detail-page \.masonry-section \{[\s\S]*?--masonry-outer: 15px;[\s\S]*?width: calc\(100% - \(2 \* var\(--masonry-outer\)\)\);/, "grid derives symmetric outer bands from one runtime-owned token without a wide-screen content cap");
assert.match(advertisingCss, /@media \(min-width: 751px\)[\s\S]*?--masonry-outer: 25px;/, "middle no-script outer band starts at 751px");
assert.match(advertisingCss, /@media \(min-width: 961px\)[\s\S]*?--masonry-gap: 25px;/, "middle gap band starts at 961px");
assert.match(advertisingCss, /@media \(min-width: 1201px\)[\s\S]*?--masonry-gap: 35px;[\s\S]*?--masonry-outer: 35px;/, "wide no-script viewport uses 35px gap and outer bands");
assert.match(runtime, /masonrySpacing\(layoutViewportWidth\)[\s\S]*?--masonry-outer[\s\S]*?--masonry-gap[\s\S]*?grid\.clientWidth/, "runtime resolves spacing from document client width before measuring the grid");
assert.match(index, /data-project-grid[\s\S]*?<div[^>]+data-masonry-cta-skeleton[^>]+aria-hidden="true"[\s\S]*?<\/div>\s*<\/div>\s*<section\s+class="detail-cta"/, "the CTA overlays the continuation in the same project section outside the product list");
assert.doesNotMatch(index, /class="detail-cta__skeleton"/, "legacy three-column decoration is removed");
assert.match(runtime, /[gG]eometry\.columnBottoms[\s\S]*?dataset\.masonryCtaFrame/, "CTA continuation starts from the compiled column frontiers");
assert.doesNotMatch(runtime + advertisingCss, /skeleton-dev|skeleton-flow-devtools|createSkeletonFlowDevtools/, "temporary skeleton editor must not ship");
assert.equal(existsSync(new URL("../../src/site/advertising-products/skeleton-flow-devtools.mjs", import.meta.url)), false, "temporary editor module is removed, not merely disabled");
// Module folders must stay outside every Worker-first route (wrangler.toml), or the CMS Worker answers their URLs instead of static assets.
const workerFirstPrefixes = [...(await read("wrangler.toml")).matchAll(/^\s*"(\/[^"*]+)\*?",?\s*$/gm)].map((match) => match[1]);
for (const folder of ["masonry", "media-lib"]) {
  assert.equal(existsSync(new URL(`../../src/site/${folder}/`, import.meta.url)), true, `${folder} module folder exists`);
  assert.deepEqual(workerFirstPrefixes.filter((prefix) => `/${folder}/`.startsWith(prefix)), [], `/${folder}/ is served as a static asset, not by the Worker`);
}
assert.match(runtime, /const skeletonAssignmentByKey = new Map\(\)[\s\S]*?const skeletonRatioBandBySlot = new Map\(\)/, "each document load starts a fresh batch skeleton assignment scope");
assert.match(runtime, /bandAssignments: skeletonRatioBandBySlot[\s\S]*?frameLayout\.forEach\(\(\{ slot, band \}\) => skeletonRatioBandBySlot\.set\(slot, band\)\)/, "responsive solving preserves each existing skeleton slot's ratio band");
assert.match(runtime, /gridHost\.pixelHeight = height[\s\S]*?gridHost\.layoutMotion\(/, "Masonry owns the complete photo and skeleton height");
assert.match(await readFile(new URL("../../src/site/masonry/host.mjs", import.meta.url), "utf8"), /createMasonry\(root, host\.positions, \(\) => host\.pixelHeight/, "each masonry host sizes Masonry from its own pixel height");
// Owner 2026-10-27 reopened the Pinterest-style back button (detail R10): same image-action style, sharing the path with Escape.
assert.match(index, /class="detail-view__image-action detail-view__back"[^>]*data-detail-back/, "photo Back reuses the image-action control");
assert.match(runtime, /data-detail-back[\s\S]*?leavePhoto\(\)[\s\S]*?key !== "Escape"[\s\S]*?leavePhoto\(\)/, "photo Back and Escape share one exit path");
assert.match(index, /data-detail-description-box[\s\S]*data-detail-description-scroll[\s\S]*aria-label="Mô tả ảnh"[\s\S]*data-detail-description-bar aria-hidden="true"/,
  "detail R3 exposes a labelled description scroller and a decorative scrollbar");
const photoInfoMarkup = index.slice(index.indexOf("data-detail-info"), index.indexOf("data-detail-related aria-label"));
const relatedGridMarkup = index.slice(index.indexOf("data-detail-related-grid"), index.indexOf("class=\"detail-dialog\""));
assert.doesNotMatch(photoInfoMarkup, /data-detail-suggestion/, "R15 primary info no longer owns the suggestion block");
assert.match(relatedGridMarkup, /data-detail-suggestion/, "R15 keeps the synthetic suggestion inside the related grid");
assert.match(css, /\.detail-view__primary\s*\{[^}]*height:\s*var\(--detail-primary-height\);/,
  "full-span primary follows its measured natural height");
assert.doesNotMatch(css, /\[data-detail-layout="pinterest"\][\s\S]*?\.detail-view__primary\s*\{[^}]*block-size:\s*100dvh;/,
  "full-span primary is not forced to fill the viewport");
assert.match(css, /detail-view__info\s*\{[^}]*overflow:\s*(?:clip|hidden);[^}]*overscroll-behavior:\s*auto;/s,
  "info itself never scrolls or traps vertical scroll; only the description scrolls");
assert.match(css, /\.detail-view__description-scroll\s*\{[^}]*overflow-y:\s*auto;[^}]*scrollbar-width:\s*none;/s,
  "description scrolls behind its own scrollbar instead of the native one");
assert.match(runtime, /primary\.span\s*===\s*(?:primary\.columns|layout\.columns|relatedLayout\.layout\.columns|columns)[\s\S]*?["']pinterest["']/,
  "Pinterest mode derives from primary span equalling total columns");
for (const token of ["data-fade-start", "data-fade-end", "setPointerCapture", "lostpointercapture"]) {
  assert.match(runtime, new RegExp(token), `description scroll hints runtime is missing ${token}`);
}
assert.match(runtime, /kind:\s*["']suggestion["']/, "suggestion is identified as a synthetic grid card");
assert.match(runtime, /rank:\s*0/, "synthetic suggestion owns rank zero");
assert.match(runtime, /sourceOrder:\s*0/, "synthetic suggestion owns sourceOrder zero");
assert.match(index, /data-detail-expand[\s\S]*?<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/, "photo expand uses the simple two-arrow icon");
assert.doesNotMatch(index, /data-detail-zoom-reset|data-detail-viewer-step/,
  "the viewer has no reset button and no arrows; a thumbnail strip changes media (owner 2026-10-25)");
assert.match(css, /\[data-detail-background\][^{]*\{[^}]*filter:\s*blur\(100px\) saturate\(1\.7\) brightness\(1\.04\);/, "primary background owns its static blur so tab thumbnails do not split the glass");
assert.doesNotMatch(runtime, /photoBackground\.style\.filter|filter:\s*"blur\(/, "photo overflow motion leaves blur ownership to the shared glass surface");
  assert.match(css, /\.detail-view__image-action\s*\{[^}]*?width:\s*36px;[^}]*?height:\s*36px;/, "photo expand is a 36px square (primary-video-player R7)");
  assert.doesNotMatch(index, /data-detail-expand[^>]*>\s*<span/, "photo expand has no text label, only its icon");
assert.match(css, /\.masonry-grid__cta-skeleton[\s\S]*?position:\s*absolute;[\s\S]*?pointer-events:\s*none;/, "CTA skeleton is a non-interactive spatial layer in the grid");
assert.match(css, /\.masonry-grid__cta-frame[\s\S]*?opacity:\s*var\(--masonry-cta-frame-opacity\);/, "each continuation frame owns its progressive spatial fade");
assert.match(css, /\.masonry-grid__cta-surface \{[\s\S]*?border:\s*0;/, "skeleton surfaces have no visible frame border");
assert.doesNotMatch(advertisingCss, /grid-template-columns|column-count/, "product CSS does not create a second column algorithm");
assert.doesNotMatch(index, /<figcaption\b/, "Advertising no-script cards have no image captions");
// Owner 2026-11-09: the main and related masonry cards have names (real mouse hover on Advertising, always shown on Projects).
assert.doesNotMatch(runtime, /if \(!related\) \{\s*const title = figure\.appendChild/, "related cards are no longer excluded from the title");
assert.match(runtime, /const title = figure\.appendChild\(document\.createElement\("figcaption"\)\);\s*title\.className = "masonry-card__title";\s*title\.id = `\$\{related \? "advertising-related-title" : "advertising-title"\}-\$\{record\.id\}`;[\s\S]{0,200}?aria-hidden[\s\S]{0,300}?setAttribute\("aria-labelledby", title\.id\)/, "main-grid and related cards get a title with distinct id prefixes; the link takes its name from it (aria-labelledby) so the visible label is in the accessible name");
// Owner 2026-11-10 (media-card R3): every card UI sits inside the media; a real mouse shows the Pinterest shade and the name on hover, touch shows neither.
assert.match(siteCss, /--media-shade-card: linear-gradient\(180deg, rgba\(17, 17, 17, 0\.4\) 48px, rgba\(17, 17, 17, 0\) 100%\);/, "card shade copies Pinterest: flat 0.4 over 48px, linear fade to the bottom");
assert.match(advertisingCss, /\.masonry-card \.card-media::after \{\s*background: var\(--media-shade-card\);\s*transition: none;\s*\}/, "card shade has no motion and keeps the base opacity 0");
assert.match(advertisingCss, /\.masonry-card__title \{[^}]*position: absolute;[^}]*top: 24px;[^}]*left: 28px;[^}]*font-size: 1rem;[^}]*font-weight: 700;[^}]*line-height: 1\.5;[^}]*opacity: 0;[^}]*-webkit-line-clamp: 1;/, "card name copies Pinterest's board name: 16px bold, 24px line, 24px from the top, 28px from the side, one line, hidden by default");
assert.match(advertisingCss, /@media \(hover: hover\) and \(pointer: fine\) \{\s*\.masonry-card:hover \.card-media::after,\s*\.masonry-card:hover \.masonry-card__title \{\s*opacity: 1;/, "only real-mouse hover shows the shade and the name");
assert.doesNotMatch(advertisingCss + runtime, /card-media__duration|advertisingMediaDuration/, "cards show no video duration pill");
assert.doesNotMatch(advertisingCss, /masonry-grid--captioned|--masonry-caption-height/, "no card reserves a caption strip below the media");
assert.doesNotMatch(sharedScripts, /captions: true/, "projects masonry has no caption option");
assert.doesNotMatch(runtime, /data-detail-title/, "photo runtime does not render an image title");
assert.doesNotMatch(index, /data-detail-title|id="du-an-title"/, "Advertising markup has no image or grid title");
assert.match(index, /data-detail-info[^>]*aria-label="Thông tin ảnh sản phẩm quảng cáo"/, "photo information retains an accessible region label");
assert.match(photoInfoMarkup, /data-detail-description[\s\S]*?data-detail-cta/, "CTA remains in primary information after the description pager");
assert.doesNotMatch(index + runtime, /data-detail-tag-reset|masonrySuggestionSlot|measureSuggestionHeight/, "standalone reset and legacy suggestion slot are absent");
assert.match(runtime, /suggestionPlacement/, "R15 exposes the synthetic suggestion placement in the related grid");
assert.match(siteCss, /--media-label-overlay:\s*rgba\(0, 0, 0, 0\.5\);/, "portal keeps the owner 0.5 overlay token");
assert.match(siteCss, /\.portal-shade \{[\s\S]*?background: var\(--media-label-overlay\);/, "homepage portal uses the shared inactive overlay");
// Owner 2026-10-26: the suggestion button uses an always-visible 0.5 dark layer, not the portal token.
assert.match(css, /\.detail-view__suggestion-link::after \{[^}]*background: rgb\(0 0 0 \/ 0\.5\);[^}]*opacity: 1;/, "inactive suggestion always shows the 0.5 overlay");
assert.match(css, /detail-view__suggestion-links \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/, "suggestions use one full-width row per button");
assert.match(css, /suggestion-link\[aria-pressed="true"\] \{[\s\S]*?background: var\(--white\);/, "only the active suggestion exposes the white surface");
assert.match(css, /suggestion-link\[aria-pressed="true"\] \{[\s\S]*?border-color: var\(--ink\);[\s\S]*?background: var\(--white\);/, "only the active suggestion exposes the ink border and white surface");
assert.match(css, /suggestion-link\[aria-pressed="true"\] img \{[\s\S]*?opacity: 0 !important;[\s\S]*?transform: none !important;/, "active suggestion hides and resets the full-frame photo");
assert.match(css, /suggestion-link\[aria-pressed="true"\] \.detail-view__suggestion-label \{\s*color: var\(--ink\);\s*text-shadow: none;\s*\}/, "active suggestion keeps a readable ink fallback without text clipping or the two-layer shadow");
assert.doesNotMatch(css, /--masonry-suggestion-image|background-clip:\s*text/, "active suggestion uses plain ink text without an image mask");
assert.doesNotMatch(css, /suggestion-link:hover:not\(\[aria-pressed="true"\]\)::after\s*\{[^}]*filter:/, "inactive suggestion hover does not change overlay darkness");
assert.doesNotMatch(siteCss, /service-portal:hover \.portal-shade\s*\{[^}]*background:/, "portal hover does not change overlay darkness");
assert.match(css, /suggestion-link \{[\s\S]*?transition: background-color var\(--dur-quick\) ease-out, border-color var\(--dur-quick\) ease-out;/, "active state crossfades its surface and border without layout change");
assert.match(css, /detail-view__info \[data-detail-description\] \{[\s\S]*?font-size: 1rem;/, "description text scales with the root font size without redesigning the category eyebrow");
assert.doesNotMatch(advertisingCss, /masonry-grid \.masonry-card figcaption|\[data-masonry-related-card\] figcaption/, "Advertising CSS reserves no caption space");
assert.match(advertisingCss, /\.masonry-card \{[\s\S]*?contain: layout;/, "tile layout containment preserves the external focus-visible outline");
assert.doesNotMatch(advertisingCss, /\.masonry-card \{[^}]*contain:\s*layout paint;/s, "tile paint containment cannot clip the focus-visible outline");
assert.match(advertisingCss, /masonry-card__media--natural[\s\S]*?background: transparent;/, "natural media has no frame surface");
// The frame already follows the media's original aspect ratio; the image fills the frame exactly instead of height auto from the rounded pixels of the file being loaded (0.5px bottom seam).
assert.match(advertisingCss, /\.masonry-card img[\s\S]*?display: block;[\s\S]*?width: 100%;[\s\S]*?height: 100%;/, "natural media fills its intrinsic-ratio frame without a sub-pixel gap");
assert.match(advertisingCss, /masonry-card img\.is-masonry-media-ready[\s\S]*?opacity: 1;/, "natural media keeps the accepted entrance state");
assert.match(siteCss, /\.media-hover-zoom-trigger:not\(\[aria-pressed="true"\]\):hover \.media-hover-zoom\s*\{[\s\S]*?transform: scale\(1\.15\);/, "inactive advertising media inherits the shared project-card hover zoom");
// Edge trim (advertising-masonry R5, owner 2026-11-10): images and videos cover the frame, which is shorter than the natural ratio
// by at most 5%; no other fit mode, canvas or backplate.
assert.match(advertisingCss, /\.masonry-card video\.masonry-card__foreground \{[^}]*object-fit: cover;/, "bled media covers its frame without distortion");
assert.equal(advertisingCss.match(/object-fit/g)?.length, 1, "cover on tile media is the only fit rule");
assert.doesNotMatch(advertisingCss, /masonry-card__backplate|data-media-fit|media--canvas/, "Advertising browse media has no canvas, fit, or backplate selectors");
assert.ok(!existsSync(new URL("../../src/site/advertising-products/catalog-artifact.mjs", import.meta.url)), "source tree does not contain a generated artifact");

const categoryOrder = artifact.categories.map((entry) => entry.slug);
const samplingHero = artifact.cards.find((card) => card.id === "kiosk-posm-07");
const samplingCrossGroup = artifact.cards.find((card) => card.id === "mobile-retail-04");
assert.ok(samplingHero && samplingCrossGroup, "authored sampling fixtures are missing");
const suggestions = selectSuggestions({ cards: artifact.cards, heroId: samplingHero.id, tagRegistry: artifact.tagRegistry });
assert.ok(suggestions.length > 0 && suggestions.length <= 4, "suggestion tile should expose no more than four contextual labels with valid media");
assert.deepEqual(
  suggestions.map(({ card, tag }) => [tag.id, card.id]),
  selectSuggestions({ cards: artifact.cards, heroId: samplingHero.id, tagRegistry: artifact.tagRegistry }).map(({ card, tag }) => [tag.id, card.id]),
  "suggestion labels and representative photos must remain stable for a hero ID",
);
assert.ok(suggestions.every(({ card, tag }) => card.tagIds.includes(tag.id)
  && card.media.src && card.media.width > 0 && card.media.height > 0), "each suggestion representative must match its authored tag and have valid media");
for (const { card, tag } of suggestions) {
  const alternativeExists = artifact.cards.some((candidate) => candidate.id !== samplingHero.id && candidate.tagIds.includes(tag.id));
  if (alternativeExists) assert.notEqual(card.id, samplingHero.id, `suggestion ${tag.id} should not reuse the hero when another representative exists`);
}
const externalActive = selectSuggestions({ cards: artifact.cards, heroId: samplingHero.id, activeTag: "format-square", tagRegistry: artifact.tagRegistry });
const externalActiveSlot = externalActive.find(({ tag }) => tag.id === "format-square");
assert.equal(externalActive.length, 4, "an active URL tag keeps the fixed four suggestion slots");
assert.ok(externalActiveSlot, "an active URL tag outside the normal product/use list stays visible for toggle-off");
assert.ok(externalActiveSlot.card.media.src, "an externally active tag keeps its image-backed toggle");
assert.equal(new Set(externalActive.map(({ tag }) => tag.id)).size, 4, "an active URL tag appears once among four unique suggestion slots");
assert.deepEqual(
  externalActive.map(({ card, tag }) => [tag.id, card.id]),
  selectSuggestions({ cards: artifact.cards, heroId: samplingHero.id, activeTag: "format-square", tagRegistry: artifact.tagRegistry })
    .map(({ card, tag }) => [tag.id, card.id]),
  "active URL slots remain deterministic without prepending the active tag",
);
const mobileSuggestions = selectSuggestions({ cards: artifact.cards, heroId: samplingCrossGroup.id, tagRegistry: artifact.tagRegistry });
const mobileAuthoredTags = new Set(samplingCrossGroup.tagIds);
assert.ok(mobileSuggestions.every(({ card, tag }) => mobileAuthoredTags.has(tag.id)
  || card.category === samplingCrossGroup.category), "fallback suggestions must stay inside the hero category");
assert.ok(mobileSuggestions.every(({ card, tag }) => card.category === samplingCrossGroup.category
  || mobileAuthoredTags.has(tag.id)
  || tag.group === "use"), "cross-category representatives require a hero-authored or shared-use tag");
assert.match(runtime, /detail-view__suggestion-links[\s\S]*detail-view__suggestion-link[\s\S]*detail-view__suggestion-label/, "suggestion tile renders the approved link and label hooks");
assert.match(runtime, /function createPhotoMedia[\s\S]*card-media__image/, "grid and suggestion media share one media helper");
assert.match(runtime, /link\.className = "card-interactive";[\s\S]*card-media[\s\S]*createPhotoMedia\(record, locale[,)]/, "grid and related cards keep media still on hover (owner 2026-10-18)");
assert.match(runtime, /detail-view__suggestion-link card-interactive card-media[\s\S]*createPhotoMedia\(card, locale, \{ suggestion: true \}\)/, "suggestion buttons reuse the shared media interaction");
assert.doesNotMatch(runtime, /startSuggestionMotion|advertising-suggestion-image|scale\(1\.06\)/, "suggestions do not run a second hover or slideshow motion provider");
assert.match(runtime, /"internal-gap": primary\.internalGap/, "detail runtime passes the span-three internal gap to CSS");
assert.match(siteCss, /media-hover-zoom-trigger:not\(\[aria-pressed="true"\]\):hover \.media-hover-zoom[\s\S]*?media-hover-zoom-trigger:not\(\[aria-pressed="true"\]\):focus-visible \.media-hover-zoom[\s\S]*?transform: scale\(1\.15\)/, "inactive grid and suggestion media share the same hover and focus zoom contract");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*card-media__image[\s\S]*transform: none !important;/, "shared media zoom has a reduced-motion path");
assert.match(runtime, /const nextTag = browseHistory\.current\.tag === tag \? null : tag/, "clicking the current suggestion tag should toggle it off through replaceState history");
const sameCategory = selectRelated({ cards: artifact.cards, categoryOrder, heroId: samplingHero.id });
assert.ok(sameCategory.length > 0 && sameCategory.every((card) => card.id !== samplingHero.id
  && (card.category === samplingHero.category || card.productIds.includes(samplingHero.productIds[0]))));
const scoredIds = samplingHero.related.flat();
assert.deepEqual(sameCategory.slice(0, scoredIds.length).map((card) => card.id), scoredIds,
  "reset/no-tag order follows the build-time score tiers (taxonomy R7)");
assert.ok(sameCategory.slice(scoredIds.length).every((card) => card.category === samplingHero.category),
  "unscored same-category cards come last");
const samplingRelated = selectRelated({ cards: artifact.cards, categoryOrder, heroId: samplingHero.id, tag: "use-sampling" });
assert.ok(samplingRelated.some((card) => card.id === samplingCrossGroup.id), "authored sampling tag must cross category groups");
assert.ok(samplingRelated.every((card) => card.id !== samplingHero.id), "hero cannot appear in related results");
// A neighbor carrying the tag keeps the score tier order; the remaining tag-carrying cards are arranged by cluster, sourceOrder, ID.
const neighbourIds = new Set(sameCategory.map((card) => card.id));
const taggedNeighbours = samplingRelated.filter((card) => neighbourIds.has(card.id));
const taggedRest = samplingRelated.slice(taggedNeighbours.length);
assert.deepEqual(taggedNeighbours.map((card) => card.id),
  sameCategory.filter((card) => card.tagIds.includes("use-sampling")).map((card) => card.id), "tagged neighbours keep score-tier order");
assert.deepEqual(
  taggedRest.map((card) => [categoryOrder.indexOf(card.category), card.sourceOrder, card.id]),
  [...taggedRest]
    .sort((left, right) => categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category) || left.sourceOrder - right.sourceOrder || left.id.localeCompare(right.id))
    .map((card) => [categoryOrder.indexOf(card.category), card.sourceOrder, card.id]),
  "tagged related order is stable across category, source order, and ID",
);
assert.equal(new Set(samplingRelated.map((card) => card.id)).size, samplingRelated.length, "duplicate tag IDs cannot duplicate related cards");
assert.deepEqual(
  selectRelated({
    cards: artifact.cards.map((card) => card.id === samplingCrossGroup.id ? { ...card, tagIds: [...card.tagIds, "use-sampling"] } : card),
    categoryOrder,
    heroId: samplingHero.id,
    tag: "use-sampling",
  }).map((card) => card.id),
  samplingRelated.map((card) => card.id),
  "duplicate authored tags do not alter stable related order",
);
assert.deepEqual(selectRelated({ cards: artifact.cards, categoryOrder, heroId: samplingHero.id, tag: "no-result" }), [], "unknown/no-result tag yields a real empty state");
let relatedSolverCards;
const relatedLayout = compileRelatedLayout({
  cards: artifact.cards,
  categoryOrder,
  compile(options) {
    relatedSolverCards = options.cards;
    return compileMasonryLayout(options);
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
const zeroRelatedLayout = compileRelatedLayout({
  cards: artifact.cards,
  categoryOrder,
  datasetVersion: artifact.datasetVersion,
  heroId: samplingHero.id,
  layoutViewportWidth: 390,
  settings: artifact.settings,
  tag: "no-result",
});
const oneRelatedLayout = compileRelatedLayout({
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

const sparsePeek = compileRelatedLayout({
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
const tabletSpan3 = compileRelatedLayout({
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
const singleColumnPeek = compileRelatedLayout({
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
const scrollbarDesktopLayout = compileRelatedLayout({
  cards: artifact.cards,
  categoryOrder,
  columns: 3,
  compile(options) {
    scrollbarDesktopColumns = options.columns;
    return compileMasonryLayout(options);
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

// The detail's background placeholder does not load while detail is hidden; the runtime assigns the real source then switches to eager.
assert.match(index, /<img data-detail-background[^>]*loading="lazy"/, "photo background placeholder is lazy in markup");
assert.match(runtime, /photoBackground\.src = [^\n]*\n\s*photoBackground\.loading = "eager";/, "photo background goes eager after the real source is set");

// The "Xem lớn hơn" viewer has no shimmer and no 0.45s fade-in: the head script's markFrame must skip the dialog (loading-glass R5).
assert.match(index, /!frame\.closest\("[^"]*\[data-detail-dialog\][^"]*"\)/, "head markFrame excludes the photo viewer dialog from the loading shimmer");

// Built layout cache (plan T4 step 3.1): 5 whole-band files and one file per filter and band, every one importable, on
// this layout version, and each one-filter file equal to its slice of the band file.
const cacheRoot = new URL("../../.site-output/advertising-products/layout-cache/", import.meta.url);
const bandFiles = (await readdir(cacheRoot)).filter((name) => name.endsWith(".mjs")).sort();
assert.deepEqual(bandFiles, ["2-15.mjs", "3-15.mjs", "3-25.mjs", "4-25.mjs", "4-35.mjs"], "one cache file per width band");
let filterFileCount = 0;
for (const bandFile of bandFiles) {
  const band = (await import(new URL(bandFile, cacheRoot))).default;
  assert.equal(band.version, MASONRY_LAYOUT_VERSION, `${bandFile} is built for the current layout version`);
  const dir = new URL(`${bandFile.replace(".mjs", "")}/`, cacheRoot);
  const filterFiles = (await readdir(dir, { recursive: true })).filter((name) => name.endsWith(".mjs"));
  assert.deepEqual(filterFiles.map((name) => name.replace(".mjs", "")).sort(), Object.keys(band.filters).sort(), `${bandFile} has one file per filter`);
  for (const name of filterFiles) {
    const single = (await import(new URL(name, dir))).default;
    const filter = name.replace(".mjs", "");
    assert.equal(single.version, MASONRY_LAYOUT_VERSION);
    assert.equal(single.band, band.band);
    assert.deepEqual(single.filters, { [filter]: band.filters[filter] }, `${bandFile} ${filter} matches its band slice`);
    filterFileCount += 1;
  }
}
assert.equal(filterFileCount, 160, "160 one-filter cache files");

// Head preload of the one-filter cache file (plan T4b): every grid page starts it from an inline script before the deferred
// vendor scripts; card pages and Projects pages start none.
const preloadScripts = (html) => [...html.matchAll(/<script>(\(\(\)=>\{const w=document\.documentElement\.clientWidth;[\s\S]*?)<\/script>/g)].map(([, code]) => code);
const preloadHref = (code, clientWidth) => {
  let href = null;
  const link = {};
  vm.runInNewContext(code, {
    document: { documentElement: { clientWidth }, head: { append: (node) => { href = node.href; } }, createElement: () => link },
  });
  return href;
};
const gridPages = [["advertising-products/index.html", "all"], ...["vi", "en"].flatMap((locale) => [[`${locale}/advertising-products/index.html`, "all"],
  ...ADVERTISING_PAGES.map((page) => [`${locale}/advertising-products/${page[locale]}/index.html`, page.filter])])];
for (const [file, filter] of gridPages) {
  const html = await read(`.site-output/${file}`);
  const scripts = preloadScripts(html);
  assert.equal(scripts.length, 1, `${file} has exactly one cache preload script`);
  assert.ok(html.indexOf(scripts[0]) < html.indexOf('<script defer src="/assets/vendor/'), `${file} preloads before the deferred scripts`);
  assert.ok(html.indexOf(scripts[0]) < html.indexOf("<title"), `${file} preloads before the title`);
  assert.ok(!html.includes("layout-cache-preload"), `${file} keeps no build marker`);
  for (const width of [320, 384, 719, 720, 960, 961, 1004, 1005, 1200, 1201, 1440, 2560]) {
    assert.equal(preloadHref(scripts[0], width), `/advertising-products/layout-cache/${bandKey(width).replace(":", "-")}/${filter}.mjs`, `${file} ${width}px picks the band the runtime picks`);
  }
  assert.ok(existsSync(new URL(`../../.site-output${preloadHref(scripts[0], 1440)}`, import.meta.url)), `${file} preloads a file that exists`);
}
const everyWidth = preloadScripts(builtIndex)[0];
for (let width = 320; width <= 2560; width += 1) {
  assert.equal(preloadHref(everyWidth, width), `/advertising-products/layout-cache/${bandKey(width).replace(":", "-")}/all.mjs`, `${width}px: preload band equals bandKey`);
}
assert.equal(preloadHref(everyWidth, 0), null, "an unmeasured viewport preloads nothing");
const cardPage = await read(`.site-output/vi/advertising-products/p/${artifact.cards[0].id}/index.html`);
assert.equal(preloadScripts(cardPage).length, 0, "a direct card page starts no grid cache preload");
assert.equal(preloadScripts(await read(".site-output/vi/projects/index.html")).length, 0, "the Projects page embeds its layouts and starts no cache preload");

console.log(`[advertising-products-static] ${MASONRY_LAYOUT_VERSION} boundary, CTA continuation, related adapter, spacing, typography, and natural media contract passed`);
