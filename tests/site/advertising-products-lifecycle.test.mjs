import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const runtime = await readFile(new URL("../../src/site/advertising-products/catalog-runtime.mjs", import.meta.url), "utf8");
const detailSource = await readFile(new URL("../../src/site/detail.js", import.meta.url), "utf8");
const motionSource = await readFile(new URL("../../src/site/motion.js", import.meta.url), "utf8");
const viewerSource = await readFile(new URL("../../src/site/advertising-products/photo-viewer.mjs", import.meta.url), "utf8");

assert.match(detailSource, /import\("\/assets\/vendor\/swiper-14\.2\.0\/swiper\.mjs"\)/, "detail runtime loads the pinned Swiper core only for carousel routes");
for (const moduleName of ["mousewheel", "pagination", "a11y"]) {
  assert.match(detailSource, new RegExp(`import\\("/assets/vendor/swiper-14\\.2\\.0/modules/${moduleName}\\.mjs"\\)`), `${moduleName} module is missing`);
}
assert.match(detailSource, /slidesPerView:\s*"auto"/);
assert.match(detailSource, /autoHeight:\s*true/);
assert.match(detailSource, /speed:\s*reduceMotion\s*\?\s*0\s*:\s*500/);
assert.match(detailSource, /spaceBetween:\s*10[\s\S]*?breakpoints:\s*\{[\s\S]*?600:\s*\{\s*spaceBetween:\s*20\s*\}/);
assert.match(detailSource, /mousewheel:\s*\{[\s\S]*?forceToAxis:\s*true[\s\S]*?releaseOnEdges:\s*true/);
assert.match(detailSource, /pagination:\s*\{[\s\S]*?clickable:\s*true/);
assert.match(detailSource, /\.destroy\(true,\s*true\)/, "carousel instances must be destroyed with their generated state");

assert.match(runtime, /export async function mountAdvertisingCatalog/);
assert.match(runtime, /import\(["']\.\/catalog-artifact\.mjs["']\)/, "runtime loads output artifact once");
assert.match(runtime, /from ["']\.\/layout-core\.mjs["']/, "runtime uses the shared pure layout core");
assert.match(runtime, /compileAdvertisingProductLayout/);
assert.match(runtime, /getVirtualWindow/);
assert.match(runtime, /layoutAlgorithmVersion[^\n]*ADVERTISING_LAYOUT_ALGORITHM_VERSION/, "runtime fails closed on artifact schema mismatch");
assert.ok(
  runtime.indexOf("artifact.layoutAlgorithmVersion") < runtime.indexOf("if (typeof window.Masonry")
    && runtime.indexOf("artifact.layoutAlgorithmVersion") < runtime.indexOf("const categories = artifact.categories"),
  "artifact version is validated before dependencies or runtime data are used",
);
assert.match(runtime, /if \(signal\?\.aborted\) return \(\) => \{\}/, "runtime checks route abort after artifact await");
assert.doesNotMatch(runtime, /from ["']\.\/catalog\.mjs["']|ADVERTISING_CARDS/, "runtime cannot read source catalog records");
assert.doesNotMatch(runtime, /artifact\.layouts|RATIO_UNITS|visibleBatches|geometry\.batches|Math\.min\(4\s*,/, "runtime has no rank-v2 layout or column cap");
assert.match(runtime, /document\.documentElement\.clientWidth/, "geometry uses full layout viewport width");
assert.match(runtime, /layoutViewportWidth: document\.documentElement\.clientWidth/, "compiler receives the layout viewport rather than grid width");
assert.match(runtime, /layoutViewportWidth/, "shared core receives the full viewport width");
assert.match(runtime, /GEOMETRY_CACHE_LIMIT/, "geometry cache has an explicit bound");
assert.ok(
  runtime.indexOf("if (hasLaidOut && !membershipChanged && !geometryChanged) return;")
    < runtime.indexOf("const nextPositions = new Map(geometry.placements.map"),
  "unchanged scroll frames return before allocating a full-dataset position map",
);
assert.match(runtime, /new window\.Masonry\(/, "Masonry remains the coordinate transition owner");
assert.match(runtime, /transitionDuration: "0\.4s"/, "Masonry keeps the accepted motion duration");
assert.match(runtime, /stagger: 0/, "Masonry has no stagger");
assert.match(runtime, /retainCohort \? new Set\(\[\.\.\.currentKeep, \.\.\.normalKeep\]\) : normalKeep/, "filter motion stays bounded");
assert.match(runtime, /const cancelMasonryTransitions = \(instance = masonry\) => \{[\s\S]*?item\.disableTransition\(\);[\s\S]*?item\._transn\.onEnd = \{\};[\s\S]*?item\.element\.style\.transform = "";/, "both grids cancel Outlayer transition state before reconciliation");
assert.match(runtime, /pendingScroll = true/, "scroll during morph is retained for one catch-up");
assert.match(runtime, /node === document\.activeElement \|\| node\.contains\(document\.activeElement\)/, "focused cards remain mounted");
assert.match(runtime, /for \(const placement of visiblePlacements\)/, "virtualization mounts direct placements instead of closed batches");
const filterClickHandler = runtime.slice(runtime.indexOf("const onRailClick = (event) => {"));
assert.ok(
  filterClickHandler.indexOf("event.preventDefault();")
    < filterClickHandler.indexOf("if (nextFilter === filter) return;"),
  "active filter clicks are canceled before the same-filter no-op",
);
assert.match(runtime, /normalizeAdvertisingProductSettings/);
assert.match(runtime, /normalizeAdvertisingProductSettings\(artifact\.settings\)/, "retired public settings are normalized before compile");
assert.match(runtime, /settings,/, "normalized settings are passed to the layout compiler");
assert.match(runtime, /advertising-tile__media--natural/, "catalog cards use a natural media surface");
assert.match(runtime, /querySelectorAll\("\.advertising-tile__foreground"\)[\s\S]*is-advertising-media-ready/, "the single foreground keeps the replayable media entrance");
assert.match(runtime, /data-advertising-span|dataset\.advertisingSpan/, "solver span is available for focused geometry QA");
assert.doesNotMatch(runtime, /presentationCanvas|fitMode|mediaCandidates|advertising-tile__backplate|data-media-fit|media--canvas/, "legacy canvas, fit, and backplate consumers are removed");
assert.match(runtime, /CAPTION_METRICS_VERSION|artifactDataHash|artifactCacheIdentity|settingsHash/, "geometry cache identity includes artifact data and caption settings");
assert.match(runtime, /diagnostics/, "invalid or incomplete compiler diagnostics are surfaced before mounting");
assert.match(runtime, /diagnosticCode && diagnosticCode !== "needs-media"/, "needs-media remains a non-fatal layout diagnostic");
assert.match(runtime, /advertisingLayoutStatus = diagnosticCode/, "runtime surfaces non-fatal diagnostics on the grid");
assert.match(runtime, /export function compileAdvertisingGeometry/, "runtime geometry diagnostics have an executable seam");
assert.doesNotMatch(runtime, /const revealedCards = new Set\(\)/, "media reveal cannot be disabled permanently at module scope");
assert.match(runtime, /new IntersectionObserver\(/, "one catalog observer owns viewport re-entry");
assert.match(runtime, /intersectionRatio === 0/, "media re-arms only after a full viewport exit");
assert.match(runtime, /\.disconnect\(\)/, "catalog cleanup disconnects its viewport observer");
assert.match(runtime, /const updateLocalizedContent = \(\) => \{[\s\S]*?querySelector\("\.advertising-tile__foreground"\)/, "foreground alone retains localized meaningful alt");
assert.match(runtime, /let cleaned = false;[\s\S]*if \(cleaned\) return;[\s\S]*signal\?\.removeEventListener\("abort", cleanup\)/, "manual cleanup is idempotent and releases the parent abort listener");
assert.match(viewerSource, /dialog\.showModal\(\)/, "expanded photo uses the native modal focus boundary");
assert.match(viewerSource, /const stops = \(\) => \[1, cover, 2 \* cover\]/, "buttons and wheel stop at fit, cover, and 2x-cover");
assert.match(viewerSource, /Math\.max\(viewport\.clientWidth \/ visualWidth, viewport\.clientHeight \/ visualHeight\)/, "cover uses the limiting viewport axis of the turned image instead of a fixed percentage");
assert.match(viewerSource, /resetButton\?\.addEventListener\("click", \(\) => \{[\s\S]*?moveTo\(1, undefined, turnTo\(0\)\)/, "reset returns directly to fit at 0 degrees");
assert.match(viewerSource, /viewport\.addEventListener\("wheel"[\s\S]*?setScale\(nextStop\(event\.deltaY < 0 \? 1 : -1\), event\)/, "wheel zoom reuses the shared scale stops and cursor anchor");
assert.match(viewerSource, /event\.button === 1[\s\S]*?setScale\(1\)/, "middle click returns the shared zoom state to fit");
assert.match(viewerSource, /pointerdown[\s\S]*setPointerCapture[\s\S]*pointermove[\s\S]*pointercancel/, "viewer supports bounded pointer and touch pan cleanup");
assert.match(viewerSource, /event\.key === "ArrowLeft"[\s\S]*renderTransform\(\)/, "zoomed viewer exposes keyboard pan");
assert.match(viewerSource, /event\.key === "Tab"[\s\S]*visibleControls/, "viewer traps focus across enabled visible controls");
assert.match(viewerSource, /event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);[\s\S]*close\(\);/, "dialog Escape closes before photo history sees it");
assert.match(motionSource, /lockLogicalScroll[\s\S]*unlockLogicalScroll/, "viewer scroll lock uses the logical-scroll owner");
assert.match(runtime, /heroImage: photoImage[\s\S]*resetButton: photoZoomReset/, "viewer receives the rendered hero and reset control");
assert.match(runtime, /advertisingPhotoLayout = primary\.mode/, "photo mode comes from viewport-aware golden geometry");
assert.match(detailSource, /mountAdvertisingCatalog\(container,[\s\S]*?softNavigation,/, "detail forwards the Barba remount context");
assert.match(motionSource, /softNavigation:\s*true/, "Barba marks destination remounts");
assert.match(runtime, /computeAdvertisingPhotoGeometry\(/, "the shared pure geometry owns responsive primary spans");
assert.doesNotMatch(runtime, /whenPhotoImageReady/, "morph feedback must not wait for a full image network request");
assert.match(detailSource, /GSAP 3\.15\.0[\s\S]*optional: true[\s\S]*SplitText 3\.15\.0[\s\S]*optional: true/, "animation-only dependencies should not block catalog mount");
assert.match(detailSource, /if \(!dependency\.optional\) throw error/, "required catalog dependencies should remain fail closed");

const previousWindow = globalThis.window;
Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: {} });
let compileAdvertisingGeometry;
let createAdvertisingBrowseHistoryController;
let isAdvertisingQueryOnlyNavigation;
let parseAdvertisingBrowseLocation;
let readAdvertisingBrowseHistoryState;
let serializeAdvertisingBrowseLocation;
try {
  ({
    compileAdvertisingGeometry,
    createAdvertisingBrowseHistoryController,
    isAdvertisingQueryOnlyNavigation,
    parseAdvertisingBrowseLocation,
    readAdvertisingBrowseHistoryState,
    serializeAdvertisingBrowseLocation,
  } = await import("../../src/site/advertising-products/catalog-runtime.mjs"));
} finally {
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: previousWindow });
}
const oneItemGrid = { dataset: /** @type {any} */ ({}) };
const oneItemLayout = compileAdvertisingGeometry({
  grid: oneItemGrid,
  options: {
    layoutViewportWidth: 390,
    cards: [{
      id: "fixture-0000",
      category: "fixture",
      sourceOrder: 0,
      rank: 0,
      layoutSpan: "auto",
      media: { src: "/fixture-0.webp", width: 300, height: 400 },
    }],
    categoryOrder: ["fixture"],
  },
});
assert.equal(oneItemLayout.placements.length, 1, "runtime keeps valid one-item geometry");
assert.equal(oneItemLayout.diagnostics.code, "needs-media", "runtime preserves non-fatal needs-media diagnostic");
assert.equal(Reflect.get(oneItemGrid.dataset, "advertisingLayoutStatus"), "needs-media");
assert.match(Reflect.get(oneItemGrid.dataset, "advertisingLayoutDiagnostic"), /needs-media/);
assert.equal(Reflect.get(oneItemGrid.dataset, "advertisingLayoutError"), undefined);

const compileFailure = Object.assign(new Error("search budget exhausted"), { code: "search-exhausted" });
const failureGrid = { dataset: /** @type {any} */ ({}) };
const originalConsoleError = console.error;
console.error = () => {};
try {
  assert.throws(
    () => compileAdvertisingGeometry({ grid: failureGrid, options: {}, compile: () => { throw compileFailure; } }),
    (error) => error === compileFailure,
    "compiler failures remain fail-closed and preserve the original error",
  );
} finally {
  console.error = originalConsoleError;
}
assert.equal(Reflect.get(failureGrid.dataset, "advertisingLayoutStatus"), "failed");
assert.equal(Reflect.get(failureGrid.dataset, "advertisingLayoutError"), "search-exhausted");

const browseFixture = {
  cards: [
    { id: "photo-a", category: "kiosk-posm", tagIds: ["shared", "tag-a"] },
    { id: "photo-b", category: "print-decals", tagIds: ["shared", "tag-b"] },
  ],
  categories: [{ slug: "kiosk-posm" }, { slug: "print-decals" }],
  tagRegistry: [{ id: "shared" }, { id: "tag-a" }, { id: "tag-b" }],
};
const parsedBrowse = parseAdvertisingBrowseLocation(
  "https://example.test/vi/advertising-products/?category=kiosk-posm&photo=photo-a&tag=shared",
  browseFixture,
);
assert.deepEqual(parsedBrowse, { category: "kiosk-posm", photo: "photo-a", tag: "shared" });
assert.deepEqual(
  parseAdvertisingBrowseLocation("https://example.test/vi/advertising-products/?category=missing&photo=missing&tag=missing", browseFixture),
  { category: "all", photo: null, tag: null },
  "invalid browse parameters fail open to the catalog",
);
assert.deepEqual(
  parseAdvertisingBrowseLocation("https://example.test/vi/advertising-products/?photo=missing&tag=shared", browseFixture),
  { category: "all", photo: null, tag: null },
  "a tag without a valid detail photo fails open with the invalid photo",
);
assert.deepEqual(
  parseAdvertisingBrowseLocation("https://example.test/vi/advertising-products/?photo=photo-a&tag=missing", browseFixture),
  { category: "kiosk-posm", photo: "photo-a", tag: null },
  "an invalid tag is removed while its valid detail photo remains active",
);
assert.deepEqual(
  parseAdvertisingBrowseLocation("https://example.test/vi/advertising-products/?category=print-decals&photo=photo-a", browseFixture),
  { category: "kiosk-posm", photo: "photo-a", tag: null },
  "valid photo identity normalizes a conflicting category to the photo's parent grid",
);
assert.equal(
  serializeAdvertisingBrowseLocation("https://example.test/en/advertising-products/?qa=1", parsedBrowse).href,
  "https://example.test/en/advertising-products/p/photo-a/?qa=1&tag=shared",
  "detail serializes to its card page path, keeping unrelated query parameters and locale",
);
assert.deepEqual(
  parseAdvertisingBrowseLocation("https://example.test/en/advertising-products/p/photo-a/?tag=shared", browseFixture),
  { category: "kiosk-posm", photo: "photo-a", tag: "shared" },
  "a card page path opens its detail",
);
assert.deepEqual(
  parseAdvertisingBrowseLocation("https://example.test/vi/advertising-products/p/missing/", browseFixture),
  { category: "all", photo: null, tag: null },
  "an unknown card path fails open to the catalog",
);
assert.equal(
  isAdvertisingQueryOnlyNavigation(
    "https://example.test/vi/advertising-products/?photo=photo-a",
    "https://example.test/vi/advertising-products/?photo=photo-b",
  ),
  true,
);
assert.equal(
  isAdvertisingQueryOnlyNavigation(
    "https://example.test/vi/advertising-products/?photo=photo-a",
    "https://example.test/vi/residential/",
  ),
  false,
);
assert.equal(
  isAdvertisingQueryOnlyNavigation(
    "https://example.test/vi/residential/",
    "https://example.test/vi/advertising-products/?photo=photo-a",
  ),
  false,
  "another page returning to Advertising remains owned by Barba",
);

let fallbackState = { from: "barba", index: 42, states: [{ data: {} }] };
let fallbackHref = "https://example.test/vi/advertising-products/";
const fallbackHistory = {
  get state() { return fallbackState; },
  pushState(state, _title, href) { fallbackState = state; fallbackHref = new URL(href, fallbackHref).href; },
  replaceState(state, _title, href) { fallbackState = state; if (href) fallbackHref = new URL(href, fallbackHref).href; },
};
const fallbackController = createAdvertisingBrowseHistoryController({
  ...browseFixture,
  browserHistory: fallbackHistory,
  getHref: () => fallbackHref,
});
fallbackController.openPhoto("photo-a");
assert.equal(fallbackState.index, 42, "native fallback merges browse data without replacing Barba's index");
assert.equal(fallbackState.from, "barba", "native fallback preserves unrelated Barba state fields");

let lateBarbaCurrent = null;
let lateBarbaHref = "https://example.test/vi/advertising-products/";
let lateBarbaAdds = 0;
let lateBarbaStores = 0;
let lateNativeState = { from: "barba", index: 3 };
let lateNativeWrites = 0;
const lateBarbaHistory = {
  get current() { return lateBarbaCurrent; },
  store(data) {
    assert.ok(this.current?.data, "Barba history is initialized before store");
    lateBarbaStores += 1;
    this.current.data = { ...this.current.data, ...data };
  },
  add(url, _trigger, _action, data) {
    assert.ok(this.current?.data, "Barba history is initialized before add");
    lateBarbaAdds += 1;
    lateBarbaHref = url;
    lateBarbaCurrent = { data: { ...data }, url };
  },
};
const lateNativeHistory = {
  get state() { return lateNativeState; },
  pushState(state, _title, url) {
    lateNativeWrites += 1;
    lateNativeState = state;
    lateBarbaHref = new URL(url, lateBarbaHref).href;
  },
  replaceState(state, _title, url) {
    lateNativeWrites += 1;
    lateNativeState = state;
    if (url) lateBarbaHref = new URL(url, lateBarbaHref).href;
  },
};
const lateAdapterController = createAdvertisingBrowseHistoryController({
  ...browseFixture,
  barbaHistory: lateBarbaHistory,
  browserHistory: lateNativeHistory,
  getHref: () => lateBarbaHref,
});
lateAdapterController.openPhoto("photo-a");
assert.equal(new URL(lateBarbaHref).pathname, "/vi/advertising-products/p/photo-a/",
  "native history works while Barba exposes its API before initialization");
assert.equal(lateBarbaAdds, 0);
assert.ok(lateNativeWrites > 0);
lateBarbaCurrent = { data: {}, url: lateBarbaHref };
lateAdapterController.openPhoto("photo-b");
assert.equal(lateBarbaStores, 1, "the adapter switches to initialized Barba for the outgoing entry");
assert.equal(lateBarbaAdds, 1, "the adapter switches to initialized Barba for the next entry");
assert.equal(new URL(lateBarbaHref).pathname, "/vi/advertising-products/p/photo-b/");

let fixtureHref = "https://example.test/vi/advertising-products/?category=kiosk-posm";
let fixtureIndex = 7;
let fixtureState = {
  from: "barba",
  index: fixtureIndex,
  states: Array.from({ length: fixtureIndex + 1 }, (_, index) => ({
    data: {},
    ns: index === fixtureIndex ? "advertising-products" : "fixture",
    scroll: { x: 0, y: index === fixtureIndex ? 420 : 0 },
    url: index === fixtureIndex ? fixtureHref : `https://example.test/fixture-${index}/`,
  })),
};
const fixtureEntries = [{ href: fixtureHref, state: structuredClone(fixtureState) }];
const fixtureApplies = [];
let logicalScroll = 420;
const fixtureBarbaHistory = {
  current: { data: {}, ns: "advertising-products", scroll: { x: 0, y: logicalScroll }, url: fixtureHref },
  store(data) {
    this.current.data = { ...this.current.data, ...data };
    fixtureState = {
      ...fixtureState,
      states: fixtureState.states.map((entry, index) => index === fixtureState.index
        ? { ...entry, data: { ...entry.data, ...data } }
        : entry),
    };
    fixtureEntries.at(-1).state = structuredClone(fixtureState);
  },
  add(url, _trigger, action, data) {
    const entry = { data: data || {}, ns: "tmp", scroll: { x: 0, y: logicalScroll }, url };
    if (action === "replace") {
      fixtureHref = url;
      this.current = entry;
      fixtureState = { ...fixtureState, states: fixtureState.states.map((item, index) => index === fixtureState.index ? entry : item) };
      fixtureEntries.at(-1).href = url;
      fixtureEntries.at(-1).state = structuredClone(fixtureState);
      return;
    }
    fixtureIndex += 1;
    fixtureHref = url;
    this.current = entry;
    fixtureState = { from: "barba", index: fixtureIndex, states: [...fixtureState.states, entry] };
    fixtureEntries.push({ href: url, state: structuredClone(fixtureState) });
  },
};
const browseController = createAdvertisingBrowseHistoryController({
  ...browseFixture,
  barbaHistory: fixtureBarbaHistory,
  browserHistory: { get state() { return fixtureState; } },
  getHref: () => fixtureHref,
  getLogicalScroll: () => logicalScroll,
  onApply: (entry) => fixtureApplies.push(entry),
});
const staleDirectController = createAdvertisingBrowseHistoryController({
  ...browseFixture,
  browserHistory: {
    state: {
      advertisingBrowse: {
        category: "print-decals",
        photo: "photo-b",
        tag: "tag-b",
        grid: { focusId: "photo-b", scrollY: 900 },
        detail: { scrollY: 300 },
      },
    },
  },
  getHref: () => "https://example.test/vi/advertising-products/?category=kiosk-posm&photo=photo-a&tag=tag-a",
});
assert.deepEqual(
  { category: staleDirectController.current.category, photo: staleDirectController.current.photo, tag: staleDirectController.current.tag },
  { category: "kiosk-posm", photo: "photo-a", tag: "tag-a" },
  "direct URL identity wins over stale history identity",
);
assert.equal(staleDirectController.current.grid.scrollY, 0, "mismatched direct history cannot donate stale supplemental scroll");
const matchingReloadController = createAdvertisingBrowseHistoryController({
  ...browseFixture,
  browserHistory: {
    state: {
      advertisingBrowse: {
        category: "kiosk-posm",
        photo: "photo-a",
        tag: "tag-a",
        grid: { anchorOffset: 25, focusId: "photo-a", scrollY: 610, viewportWidth: 390 },
        detail: { anchorId: "photo-b", anchorOffset: 170, scrollY: 92, viewportWidth: 390 },
      },
    },
  },
  getHref: () => "https://example.test/vi/advertising-products/?category=kiosk-posm&photo=photo-a&tag=tag-a",
});
assert.equal(matchingReloadController.current.grid.scrollY, 610, "matching reload restores supplemental grid state");
assert.equal(matchingReloadController.current.detail.anchorId, "photo-b", "matching reload restores supplemental detail anchor");
let directPhotoHref = "https://example.test/vi/advertising-products/?photo=photo-a";
let directPhotoState = null;
const directPhotoHistory = {
  get state() { return directPhotoState; },
  replaceState(state, _title, href) {
    directPhotoState = state;
    directPhotoHref = new URL(href, directPhotoHref).href;
  },
};
const directPhotoController = createAdvertisingBrowseHistoryController({
  ...browseFixture,
  browserHistory: directPhotoHistory,
  getHref: () => directPhotoHref,
});
directPhotoController.persistCurrent();
const reloadedDirectController = createAdvertisingBrowseHistoryController({
  ...browseFixture,
  browserHistory: directPhotoHistory,
  getHref: () => directPhotoHref,
});
assert.equal(reloadedDirectController.current.directPhotoRootId, "photo-a", "reload preserves a direct photo's parent-grid Escape marker");
assert.equal(directPhotoController.escapeDirectPhoto(), true, "a direct photo Escape is handled inside its parent Advertising view");
assert.equal(directPhotoHref, "https://example.test/vi/advertising-products/?category=kiosk-posm", "direct photo Escape replaces the orphan entry with its containing grid");
assert.equal(directPhotoController.current.photo, null);
assert.equal(directPhotoController.current.grid.focusId, "photo-a");
assert.equal(matchingReloadController.escapeDirectPhoto(), false, "a non-direct reload keeps ordinary browser Back ownership");
let cleanedDirectHref = "https://example.test/vi/advertising-products/?category=missing&photo=missing&tag=shared";
let cleanedDirectState = { from: "barba", index: 12 };
createAdvertisingBrowseHistoryController({
  ...browseFixture,
  browserHistory: {
    get state() { return cleanedDirectState; },
    replaceState(state, _title, href) {
      cleanedDirectState = state;
      cleanedDirectHref = new URL(href, cleanedDirectHref).href;
    },
  },
  getHref: () => cleanedDirectHref,
});
assert.equal(cleanedDirectHref, "https://example.test/vi/advertising-products/", "invalid direct photo/category/tag query is cleaned in place");
assert.equal(cleanedDirectState.index, 12, "invalid direct cleanup preserves the Barba history index");
const cleanedBrowseState = readAdvertisingBrowseHistoryState(cleanedDirectState);
assert.match(cleanedBrowseState.seed, /^[a-z0-9]+-[a-z0-9]+$/, "a fresh direct route receives a visit seed");
assert.deepEqual(readAdvertisingBrowseHistoryState(cleanedDirectState), {
  category: "all",
  directPhotoRootId: null,
  photo: null,
  tag: null,
  seed: cleanedBrowseState.seed,
  grid: { category: null, anchorOffset: null, focusId: null, mediaId: null, scrollY: 0, viewportWidth: null },
  detail: { anchorId: null, anchorOffset: null, mediaId: null, scrollY: 0, viewportWidth: null },
}, "invalid direct cleanup writes one usable grid state without a phantom entry");
browseController.captureGrid({ anchorOffset: 180, focusId: "photo-a", scrollY: logicalScroll, viewportWidth: 1440 });
browseController.openPhoto("photo-a");
const gridEntry = structuredClone(fixtureEntries[0]);
logicalScroll = 85;
browseController.replaceTag("shared");
let photoAEntry = structuredClone(fixtureEntries[1]);
logicalScroll = 210;
browseController.captureDetail({ anchorId: "photo-b", anchorOffset: 240, scrollY: logicalScroll, viewportWidth: 1440 });
browseController.openPhoto("photo-b");
photoAEntry = structuredClone(fixtureEntries[1]);
const photoBEntry = structuredClone(fixtureEntries[2]);
assert.equal(fixtureEntries.length, 3, "tag replace does not add a history entry");
browseController.openPhoto("photo-b");
assert.equal(fixtureEntries.length, 3, "same-photo activation does not push a duplicate entry");
assert.deepEqual(fixtureEntries.map((entry) => entry.state.index), [7, 8, 9], "Barba owns monotonically increasing history indexes");
assert.equal(readAdvertisingBrowseHistoryState(gridEntry.state).grid.focusId, "photo-a");
assert.equal(readAdvertisingBrowseHistoryState(gridEntry.state).grid.viewportWidth, 1440);
assert.equal(readAdvertisingBrowseHistoryState(gridEntry.state).grid.anchorOffset, 180);
assert.equal(readAdvertisingBrowseHistoryState(photoAEntry.state).photo, "photo-a");
assert.equal(readAdvertisingBrowseHistoryState(photoAEntry.state).tag, "shared");
assert.equal(readAdvertisingBrowseHistoryState(photoBEntry.state).photo, "photo-b");
assert.equal(readAdvertisingBrowseHistoryState(photoAEntry.state).detail.scrollY, 210, "A stores its detail scroll before B is pushed");
assert.equal(readAdvertisingBrowseHistoryState(photoAEntry.state).detail.anchorId, "photo-b");
assert.equal(readAdvertisingBrowseHistoryState(photoAEntry.state).detail.anchorOffset, 240);
assert.equal(readAdvertisingBrowseHistoryState(photoBEntry.state).detail.scrollY, 0, "B starts at the top instead of inheriting A scroll");

fixtureHref = photoAEntry.href;
fixtureState = photoAEntry.state;
assert.equal(browseController.handlePopState({ state: photoAEntry.state }, photoBEntry.href, photoAEntry.href), true);
fixtureHref = gridEntry.href;
fixtureState = gridEntry.state;
assert.equal(browseController.handlePopState({ state: gridEntry.state }, photoAEntry.href, gridEntry.href), true);
assert.deepEqual(
  fixtureApplies.slice(-2).map(({ browse, reason }) => [browse.photo, browse.grid.focusId, reason]),
  [["photo-a", "photo-a", "history"], [null, "photo-a", "history"]],
  "Back restores A before the original grid focus",
);
fixtureHref = photoAEntry.href;
fixtureState = photoAEntry.state;
assert.equal(browseController.handlePopState({ state: photoAEntry.state }, gridEntry.href, photoAEntry.href), true);
assert.equal(fixtureApplies.at(-1).browse.photo, "photo-a", "Forward restores photo A");
browseController.handlePopState({ state: photoBEntry.state }, photoAEntry.href, photoBEntry.href);
fixtureHref = photoBEntry.href;
fixtureState = photoBEntry.state;
browseController.returnToGrid({ reason: "navbar" });
assert.equal(fixtureApplies.at(-1).reason, "navbar");
assert.equal(fixtureApplies.at(-1).browse.category, "kiosk-posm", "navbar keeps the group picked on the source masonry");
assert.equal(new URL(fixtureEntries.at(-1).href).search, "?category=kiosk-posm", "navbar writes the kept group URL");
assert.equal(fixtureApplies.at(-1).browse.grid.focusId, "photo-a", "a related photo outside the kept group returns to the photo opened from it");
assert.equal(fixtureApplies.at(-1).browse.grid.anchorOffset, 180, "the origin photo keeps its old viewport offset");
assert.equal(fixtureEntries.at(-1).state.index, 10, "navbar return remains a Barba-owned push entry");

const navbarCases = [
  ["https://example.test/vi/advertising-products/?category=kiosk-posm", "photo-c", "?category=kiosk-posm", "photo-c", null],
  ["https://example.test/vi/advertising-products/", "photo-b", "", "photo-b", null],
  ["https://example.test/vi/advertising-products/?photo=photo-b", null, "", "photo-b", null],
];
for (const [startHref, related, search, focusId, anchorOffset] of navbarCases) {
  let navbarHref = startHref;
  let navbarState = null;
  const navbarController = createAdvertisingBrowseHistoryController({
    ...browseFixture,
    cards: [...browseFixture.cards, { id: "photo-c", category: "kiosk-posm", tagIds: ["shared"] }],
    browserHistory: {
      get state() { return navbarState; },
      pushState(state, _title, next) { navbarState = state; navbarHref = new URL(next, navbarHref).href; },
      replaceState(state, _title, next) { navbarState = state; navbarHref = new URL(next, navbarHref).href; },
    },
    getHref: () => navbarHref,
  });
  if (!navbarController.current.photo) {
    navbarController.captureGrid({ anchorOffset: 75, focusId: "photo-a", scrollY: 0, viewportWidth: 390 });
    navbarController.openPhoto("photo-a");
  }
  if (related) navbarController.openPhoto(related);
  const returned = navbarController.returnToGrid({ reason: "navbar" });
  assert.equal(new URL(navbarHref).search, search, `navbar from ${startHref} lands on ${search || "All"}`);
  assert.equal(returned.grid.focusId, focusId, `navbar from ${startHref} focuses ${focusId}`);
  assert.equal(returned.grid.anchorOffset, anchorOffset, `navbar from ${startHref} centers a newly viewed photo`);
  if (!related) continue;
  navbarController.replaceCategory("print-decals");
  navbarController.returnToGrid({ reason: "navbar" });
  assert.equal(new URL(navbarHref).search, "", "navbar from a group grid without a photo still lands on All");
}

let englishHref = "https://example.test/en/advertising-products/";
let englishAdds = 0;
const englishController = createAdvertisingBrowseHistoryController({
  ...browseFixture,
  barbaHistory: {
    current: { data: {} },
    add(url) { englishHref = url; englishAdds += 1; },
    store() {},
  },
  browserHistory: { state: null },
  getHref: () => englishHref,
});
englishController.openPhoto("photo-a");
englishController.captureDetail({ anchorId: "photo-b", anchorOffset: 100, scrollY: 40, viewportWidth: 390 });
englishController.openPhoto("photo-b");
assert.equal(new URL(englishHref).pathname, "/en/advertising-products/p/photo-b/", "A/B history writes the EN card path");
assert.equal(englishAdds, 2, "EN A/B creates the same two photo entries as VI");

assert.match(motionSource, /addEventListener\("popstate",[\s\S]*window\.barba\.init\(/, "query popstate listener is registered before Barba init");
assert.match(motionSource, /barba\?\.history\?\.change\?\.\(nextHref, "popstate", event\)/, "handled query popstate synchronizes Barba before suppressing its transition");
assert.match(motionSource, /advertising\?\.getCurrentHref\?\.\(\) \|\| window\.barba\?\.history\?\.current\?\.url/, "query popstate uses the runtime's current pointer when native history is active");
assert.ok(
  motionSource.indexOf('window.barba?.history?.change?.(nextHref, "popstate", event)')
    < motionSource.indexOf("advertising.handlePopState?.("),
  "Barba pointer is synchronized before the query runtime applies destination state",
);
assert.match(runtime, /event\.button !== 0 \|\| event\.altKey \|\| event\.ctrlKey \|\| event\.metaKey \|\| event\.shiftKey/, "modified card activations keep native anchor behavior");
assert.match(runtime, /retainedPhotoIds/, "catalog exposes an explicit bounded retention seam");
assert.match(detailSource, /getLogicalScroll|TruongThinhMotion/, "Advertising lifecycle receives the narrow logical-scroll facade");

console.log("[advertising-products-lifecycle] artifact-v6 core, browse history, logical scroll, lifecycle, Outlayer motion, natural media, and placement virtualization passed");
