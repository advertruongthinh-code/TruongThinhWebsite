import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const runtime = await readFile(new URL("../../src/site/masonry/runtime.mjs", import.meta.url), "utf8");
const hostSource = await readFile(new URL("../../src/site/masonry/host.mjs", import.meta.url), "utf8");
const detailSource = await readFile(new URL("../../src/site/detail.js", import.meta.url), "utf8");
const motionSource = await readFile(new URL("../../src/site/motion.js", import.meta.url), "utf8");
const viewerSource = await readFile(new URL("../../src/site/masonry/detail-viewer.mjs", import.meta.url), "utf8");

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

assert.match(runtime, /export async function mountMasonry/);
assert.match(runtime, /import\(["']\.\.\/advertising-products\/catalog-artifact\.mjs["']\)/, "runtime loads output artifact once");
assert.match(runtime, /from ["']\.\/layout\.mjs["']/, "runtime uses the shared pure layout core");
assert.match(runtime, /compileMasonryLayout/);
assert.match(runtime, /getVirtualWindow/);
assert.match(runtime, /layoutAlgorithmVersion[^\n]*MASONRY_LAYOUT_VERSION/, "runtime fails closed on artifact schema mismatch");
assert.ok(
  runtime.indexOf("artifact.layoutAlgorithmVersion") < runtime.indexOf("if (typeof window.Masonry")
    && runtime.indexOf("artifact.layoutAlgorithmVersion") < runtime.indexOf("const categories = artifact.categories"),
  "artifact version is validated before dependencies or runtime data are used",
);
assert.match(runtime, /if \(signal\?\.aborted\) return \(\) => \{\}/, "runtime checks route abort after artifact await");
assert.doesNotMatch(runtime, /from ["']\.\/catalog\.mjs["']|ADVERTISING_CARDS/, "runtime cannot read source catalog records");
assert.doesNotMatch(runtime, /RATIO_UNITS|visibleBatches|geometry\.batches|Math\.min\(4\s*,/, "runtime has no rank-v2 layout or column cap");
assert.match(runtime, /document\.documentElement\.clientWidth/, "geometry uses full layout viewport width");
assert.match(runtime, /layoutViewportWidth(?::| =) document\.documentElement\.clientWidth/, "compiler receives the layout viewport rather than grid width");
assert.match(runtime, /layoutViewportWidth/, "shared core receives the full viewport width");
assert.match(runtime, /GEOMETRY_CACHE_LIMIT/, "geometry cache has an explicit bound");
// Main grid replays the build-time cache (advertising-masonry R6): embedded layouts first, then the cache files.
const mainGridRequest = runtime.slice(runtime.indexOf("const geometryRequest = "), runtime.indexOf("const cacheGeometry = "));
assert.match(runtime, /artifact\.layouts\?\.\[band\]\?\.filters\?\.\[targetFilter\]/, "runtime reads layouts embedded in the artifact");
assert.match(mainGridRequest, /variantIndex\(browseHistory\.current\.seed, entry\.variants\.length\)/, "variant follows the browse seed");
assert.match(mainGridRequest, /replayLayout\(\{/, "main grid replays a cached variant");
assert.match(mainGridRequest, /stackLayout\(\{/, "main grid falls back to the stack layout");
assert.doesNotMatch(mainGridRequest, /compileInWorker|compileMasonryLayout|takeWorker/, "main grid never runs the search solver");
assert.ok(
  runtime.indexOf("if (hasLaidOut && !membershipChanged && !geometryChanged) return;")
    < runtime.indexOf("const nextPositions = samePositions ? gridHost.positions : new Map(geometry.placements.map"),
  "unchanged scroll frames return before allocating a full-dataset position map",
);
assert.match(hostSource, /new window\.Masonry\(/, "Masonry remains the coordinate transition owner");
assert.match(hostSource, /transitionDuration: "0\.4s"/, "Masonry keeps the accepted motion duration");
assert.match(hostSource, /stagger: 0/, "Masonry has no stagger");
assert.match(runtime, /retainCohort \? new Set\(\[\.\.\.currentKeep, \.\.\.normalKeep\]\) : normalKeep/, "filter motion stays bounded");
assert.match(hostSource, /export function cancelMasonryTransitions\(instance\) \{[\s\S]*?item\.disableTransition\(\);[\s\S]*?item\._transn\.onEnd = \{\};[\s\S]*?item\.element\.style\.transform = "";/, "both grids cancel Outlayer transition state before reconciliation");
assert.match(runtime, /pendingScroll = true/, "scroll during morph is retained for one catch-up");
assert.match(runtime, /node === document\.activeElement \|\| node\.contains\(document\.activeElement\)/, "focused cards remain mounted");
assert.match(runtime, /for \(const placement of visiblePlacements\)/, "virtualization mounts direct placements instead of closed batches");
const filterClickHandler = runtime.slice(runtime.indexOf("const onRailClick = (event) => {"));
assert.ok(
  filterClickHandler.indexOf("event.preventDefault();")
    < filterClickHandler.indexOf("if (nextFilter === filter) {"),
  "active filter clicks are canceled before the same-filter no-op",
);
assert.match(runtime, /normalizeMasonrySettings/);
assert.match(runtime, /normalizeMasonrySettings\(artifact\.settings\)/, "retired public settings are normalized before compile");
assert.match(runtime, /settings,/, "normalized settings are passed to the layout compiler");
assert.match(runtime, /masonry-card__media--natural/, "catalog cards use a natural media surface");
assert.match(runtime, /querySelectorAll\("\.masonry-card__foreground"\)[\s\S]*is-masonry-media-ready/, "the single foreground keeps the replayable media entrance");
assert.match(runtime, /data-masonry-span|dataset\.masonrySpan/, "solver span is available for focused geometry QA");
assert.doesNotMatch(runtime, /presentationCanvas|fitMode|mediaCandidates|masonry-card__backplate|data-media-fit|media--canvas/, "legacy canvas, fit, and backplate consumers are removed");
assert.match(runtime, /artifactDataHash|artifactCacheIdentity|settingsHash/, "geometry cache identity includes artifact data");
assert.match(runtime, /diagnostics/, "invalid or incomplete compiler diagnostics are surfaced before mounting");
assert.match(runtime, /diagnosticCode && diagnosticCode !== "needs-media"/, "needs-media remains a non-fatal layout diagnostic");
assert.match(runtime, /masonryLayoutStatus = diagnosticCode/, "runtime surfaces non-fatal diagnostics on the grid");
assert.match(runtime, /export function compileMasonryGeometry/, "runtime geometry diagnostics have an executable seam");
assert.doesNotMatch(runtime, /const revealedCards = new Set\(\)/, "media reveal cannot be disabled permanently at module scope");
assert.match(runtime, /new IntersectionObserver\(/, "one catalog observer owns viewport re-entry");
assert.match(runtime, /intersectionRatio === 0/, "media re-arms only after a full viewport exit");
assert.match(runtime, /\.disconnect\(\)/, "catalog cleanup disconnects its viewport observer");
assert.match(runtime, /const updateLocalizedContent = \(\) => \{[\s\S]*?querySelector\("\.masonry-card__foreground"\)/, "foreground alone retains localized meaningful alt");
assert.match(runtime, /let cleaned = false;[\s\S]*if \(cleaned\) return;[\s\S]*signal\?\.removeEventListener\("abort", cleanup\)/, "manual cleanup is idempotent and releases the parent abort listener");
assert.match(viewerSource, /dialog\.showModal\(\)/, "expanded photo uses the native modal focus boundary");
assert.match(viewerSource, /const stops = \(\) => \[1, cover, 2 \* cover\]/, "buttons and wheel stop at fit, cover, and 2x-cover");
assert.match(viewerSource, /Math\.max\(viewport\.clientWidth \/ visualWidth, viewport\.clientHeight \/ visualHeight\)/, "cover uses the limiting viewport axis of the turned image instead of a fixed percentage");
assert.doesNotMatch(viewerSource, /resetButton/, "the viewer has no reset button; minus, middle click and tap return to fit (owner 2026-10-25)");
assert.match(viewerSource, /viewport\.addEventListener\("wheel"[\s\S]*?setScale\(nextStop\(event\.deltaY < 0 \? 1 : -1\), event\)/, "wheel zoom reuses the shared scale stops and cursor anchor");
assert.match(viewerSource, /event\.button === 1[\s\S]*?setScale\(1\)/, "middle click returns the shared zoom state to fit");
assert.match(viewerSource, /pointerdown[\s\S]*setPointerCapture[\s\S]*pointermove[\s\S]*pointercancel/, "viewer supports bounded pointer and touch pan cleanup");
assert.match(viewerSource, /event\.key === "ArrowLeft"[\s\S]*renderTransform\(\)/, "zoomed viewer exposes keyboard pan");
assert.match(viewerSource, /event\.key === "Tab"[\s\S]*visibleControls/, "viewer traps focus across enabled visible controls");
assert.match(viewerSource, /event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);[\s\S]*close\(\);/, "dialog Escape closes before photo history sees it");
assert.match(motionSource, /lockLogicalScroll[\s\S]*unlockLogicalScroll/, "viewer scroll lock uses the logical-scroll owner");
assert.match(runtime, /heroImage: photoImage/, "viewer receives the rendered hero");
assert.match(runtime, /detailLayout = primary\.mode/, "photo mode comes from viewport-aware golden geometry");
assert.match(detailSource, /mountMasonry\(container,[\s\S]*?softNavigation,/, "detail forwards the Barba remount context");
assert.match(motionSource, /softNavigation:\s*true/, "Barba marks destination remounts");
assert.match(runtime, /computeDetailGeometry\(/, "the shared pure geometry owns responsive primary spans");
assert.doesNotMatch(runtime, /whenPhotoImageReady/, "morph feedback must not wait for a full image network request");
assert.match(detailSource, /GSAP 3\.15\.0[\s\S]*optional: true[\s\S]*SplitText 3\.15\.0[\s\S]*optional: true/, "animation-only dependencies should not block catalog mount");
assert.match(detailSource, /if \(!dependency\.optional\) throw error/, "required catalog dependencies should remain fail closed");

const previousWindow = globalThis.window;
Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: {} });
let compileMasonryGeometry;
let createBrowseHistoryController;
let isQueryOnlyNavigation;
let parseBrowseLocation;
let readBrowseHistoryState;
let serializeBrowseLocation;
try {
  ({
    compileMasonryGeometry,
    createBrowseHistoryController,
    isQueryOnlyNavigation,
    parseBrowseLocation,
    readBrowseHistoryState,
    serializeBrowseLocation,
  } = await import("../../src/site/masonry/runtime.mjs"));
} finally {
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: previousWindow });
}
const oneItemGrid = { dataset: /** @type {any} */ ({}) };
const oneItemLayout = compileMasonryGeometry({
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
assert.equal(Reflect.get(oneItemGrid.dataset, "masonryLayoutStatus"), "needs-media");
assert.match(Reflect.get(oneItemGrid.dataset, "masonryLayoutDiagnostic"), /needs-media/);
assert.equal(Reflect.get(oneItemGrid.dataset, "masonryLayoutError"), undefined);

const compileFailure = Object.assign(new Error("search budget exhausted"), { code: "search-exhausted" });
const failureGrid = { dataset: /** @type {any} */ ({}) };
const originalConsoleError = console.error;
console.error = () => {};
try {
  assert.throws(
    () => compileMasonryGeometry({ grid: failureGrid, options: {}, compile: () => { throw compileFailure; } }),
    (error) => error === compileFailure,
    "compiler failures remain fail-closed and preserve the original error",
  );
} finally {
  console.error = originalConsoleError;
}
assert.equal(Reflect.get(failureGrid.dataset, "masonryLayoutStatus"), "failed");
assert.equal(Reflect.get(failureGrid.dataset, "masonryLayoutError"), "search-exhausted");

const browseFixture = {
  cards: [
    { id: "photo-a", category: "kiosk-posm", tagIds: ["shared", "tag-a"] },
    { id: "photo-b", category: "print-decals", tagIds: ["shared", "tag-b"] },
  ],
  categories: [{ slug: "kiosk-posm" }, { slug: "print-decals" }],
  tagRegistry: [{ id: "shared" }, { id: "tag-a" }, { id: "tag-b" }],
};
const parsedBrowse = parseBrowseLocation(
  "https://example.test/vi/advertising-products/?category=kiosk-posm&photo=photo-a&tag=shared",
  browseFixture,
);
assert.deepEqual(parsedBrowse, { category: "kiosk-posm", photo: "photo-a", tag: "shared" });
assert.deepEqual(
  parseBrowseLocation("https://example.test/vi/advertising-products/?category=missing&photo=missing&tag=missing", browseFixture),
  { category: "all", photo: null, tag: null },
  "invalid browse parameters fail open to the catalog",
);
assert.deepEqual(
  parseBrowseLocation("https://example.test/vi/advertising-products/?photo=missing&tag=shared", browseFixture),
  { category: "all", photo: null, tag: null },
  "a tag without a valid detail photo fails open with the invalid photo",
);
assert.deepEqual(
  parseBrowseLocation("https://example.test/vi/advertising-products/?photo=photo-a&tag=missing", browseFixture),
  { category: "kiosk-posm", photo: "photo-a", tag: null },
  "an invalid tag is removed while its valid detail photo remains active",
);
assert.deepEqual(
  parseBrowseLocation("https://example.test/vi/advertising-products/?category=print-decals&photo=photo-a", browseFixture),
  { category: "kiosk-posm", photo: "photo-a", tag: null },
  "valid photo identity normalizes a conflicting category to the photo's parent grid",
);
assert.equal(
  serializeBrowseLocation("https://example.test/en/advertising-products/?qa=1", parsedBrowse).href,
  "https://example.test/en/advertising-products/p/photo-a/?qa=1&tag=shared",
  "detail serializes to its card page path, keeping unrelated query parameters and locale",
);
assert.deepEqual(
  parseBrowseLocation("https://example.test/en/advertising-products/p/photo-a/?tag=shared", browseFixture),
  { category: "kiosk-posm", photo: "photo-a", tag: "shared" },
  "a card page path opens its detail",
);
assert.deepEqual(
  parseBrowseLocation("https://example.test/vi/advertising-products/p/missing/", browseFixture),
  { category: "all", photo: null, tag: null },
  "an unknown card path fails open to the catalog",
);
assert.equal(
  isQueryOnlyNavigation(
    "https://example.test/vi/advertising-products/?photo=photo-a",
    "https://example.test/vi/advertising-products/?photo=photo-b",
  ),
  true,
);
assert.equal(
  isQueryOnlyNavigation(
    "https://example.test/vi/advertising-products/?photo=photo-a",
    "https://example.test/vi/residential/",
  ),
  false,
);
// The Projects page (projects R2) shares the runtime: a different root is a page change, an unknown slug under /projects/ is a detail page.
const projectPages = [{ filter: "all", vi: "", en: "" }, { filter: "kinh-doanh", vi: "kinh-doanh", en: "kinh-doanh" }];
assert.equal(isQueryOnlyNavigation("https://example.test/vi/projects/", "https://example.test/vi/advertising-products/", projectPages), false, "Projects to Advertising is a page change");
assert.equal(isQueryOnlyNavigation("https://example.test/vi/advertising-products/", "https://example.test/vi/projects/"), false, "Advertising to Projects is a page change");
assert.equal(isQueryOnlyNavigation("https://example.test/vi/projects/", "https://example.test/vi/projects/kinh-doanh/", projectPages), true, "a Projects filter path is in place");
assert.equal(isQueryOnlyNavigation("https://example.test/vi/projects/kinh-doanh/", "https://example.test/vi/projects/can-ho-go-soi-am/", projectPages), false, "a project detail path is a page change");
assert.deepEqual(
  parseBrowseLocation("https://example.test/vi/projects/kinh-doanh/?photo=photo-a", { ...browseFixture, pages: projectPages, photos: false }),
  { category: "kinh-doanh", photo: null, tag: null },
  "without a viewer ?photo= is ignored and the filter comes from the path",
);
assert.equal(
  serializeBrowseLocation("https://example.test/en/projects/", { category: "kinh-doanh" }, [], projectPages).pathname,
  "/en/projects/kinh-doanh/",
  "Projects filter URLs keep the /projects/ root",
);
assert.equal(
  isQueryOnlyNavigation(
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
const fallbackController = createBrowseHistoryController({
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
const lateAdapterController = createBrowseHistoryController({
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
const browseController = createBrowseHistoryController({
  ...browseFixture,
  barbaHistory: fixtureBarbaHistory,
  browserHistory: { get state() { return fixtureState; } },
  getHref: () => fixtureHref,
  getLogicalScroll: () => logicalScroll,
  onApply: (entry) => fixtureApplies.push(entry),
});
const staleDirectController = createBrowseHistoryController({
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
const matchingReloadController = createBrowseHistoryController({
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
const directPhotoController = createBrowseHistoryController({
  ...browseFixture,
  browserHistory: directPhotoHistory,
  getHref: () => directPhotoHref,
});
directPhotoController.persistCurrent();
const reloadedDirectController = createBrowseHistoryController({
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
createBrowseHistoryController({
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
const cleanedBrowseState = readBrowseHistoryState(cleanedDirectState);
assert.match(cleanedBrowseState.seed, /^[a-z0-9]+-[a-z0-9]+$/, "a fresh direct route receives a visit seed");
assert.deepEqual(readBrowseHistoryState(cleanedDirectState), {
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
assert.equal(readBrowseHistoryState(gridEntry.state).grid.focusId, "photo-a");
assert.equal(readBrowseHistoryState(gridEntry.state).grid.viewportWidth, 1440);
assert.equal(readBrowseHistoryState(gridEntry.state).grid.anchorOffset, 180);
assert.equal(readBrowseHistoryState(photoAEntry.state).photo, "photo-a");
assert.equal(readBrowseHistoryState(photoAEntry.state).tag, "shared");
assert.equal(readBrowseHistoryState(photoBEntry.state).photo, "photo-b");
assert.equal(readBrowseHistoryState(photoAEntry.state).detail.scrollY, 210, "A stores its detail scroll before B is pushed");
assert.equal(readBrowseHistoryState(photoAEntry.state).detail.anchorId, "photo-b");
assert.equal(readBrowseHistoryState(photoAEntry.state).detail.anchorOffset, 240);
assert.equal(readBrowseHistoryState(photoBEntry.state).detail.scrollY, 0, "B starts at the top instead of inheriting A scroll");

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
  const navbarController = createBrowseHistoryController({
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
const englishController = createBrowseHistoryController({
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
