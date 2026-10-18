import assert from "node:assert/strict";
import { test } from "node:test";
import { ADVERTISING_CARDS, ADVERTISING_CATEGORIES } from "../../src/site/advertising-products/catalog.mjs";
import {
  columnsForWidth,
  compileAdvertisingProductLayout,
  scoreAdvertisingOrganicRhythm,
  matchesAdvertisingFilter,
} from "../../src/site/advertising-products/layout-core.mjs";
import { shuffleWithSeed } from "../../src/site/advertising-products/random-order.mjs";
import { inspectAdvertisingGrid } from "./advertising-grid-oracle.mjs";

const previousWindow = globalThis.window;
Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: {} });
let advertisingRuntime;
try {
  advertisingRuntime = await import("../../src/site/advertising-products/catalog-runtime.mjs");
} finally {
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: previousWindow });
}

const makeCards = (count, category = "random-fixture") => Array.from({ length: count }, (_, index) => {
  const ratios = [[3, 4], [4, 3], [1, 30], [30, 1], [1, 1], [5, 7]];
  const [width, height] = ratios[index % ratios.length];
  return {
    id: category + "-" + index,
    category,
    sourceOrder: index,
    rank: index,
    layoutSpan: 1,
    tagIds: index % 2 ? ["shared"] : [],
    media: {
      src: "/" + category + "-" + index + ".webp",
      width,
      height,
      altVi: "Ảnh " + index,
      altEn: "Image " + index,
    },
  };
});

const categoryOrder = ["kiosk-posm", "led-displays-lightboxes"];
const tagRegistry = [{ id: "shared" }];
const browseCards = [
  { id: "hero", category: "kiosk-posm", sourceOrder: 0, tagIds: ["shared"] },
  { id: "photo-a", category: "kiosk-posm", sourceOrder: 1, tagIds: ["shared"] },
  { id: "photo-b", category: "led-displays-lightboxes", sourceOrder: 0, tagIds: ["shared"] },
  { id: "unrelated", category: "led-displays-lightboxes", sourceOrder: 1, tagIds: [] },
];

test("existing solver honors a noncanonical presentation order", () => {
  const cards = makeCards(6);
  const presentationOrder = cards.map(card => card.id).reverse();
  const layout = compileAdvertisingProductLayout({ cards, categoryOrder: ["random-fixture"], layoutViewportWidth: 390, presentationOrder });
  assert.deepEqual(layout.diagnostics.placementOrder, presentationOrder);
});

test("seeded card shuffle is repeatable per grid scope and preserves pool membership", () => {
  const cards = makeCards(18);
  const original = structuredClone(cards);
  const first = shuffleWithSeed(cards, "visit-a", "all");
  const repeat = shuffleWithSeed(cards, "visit-a", "all");
  const nextVisit = shuffleWithSeed(cards, "visit-b", "all");

  assert.deepEqual(first.map(({ id }) => id), repeat.map(({ id }) => id));
  assert.notDeepEqual(first.map(({ id }) => id), nextVisit.map(({ id }) => id));
  assert.deepEqual(new Set(first.map(({ id }) => id)), new Set(cards.map(({ id }) => id)));
  assert.deepEqual(cards, original, "shuffling must not mutate canonical catalog records");

  const related = advertisingRuntime.selectAdvertisingRelated({
    cards: browseCards,
    categoryOrder,
    heroId: "hero",
    tag: "shared",
  });
  const randomizedRelated = shuffleWithSeed(related, "visit-a", "related:hero:shared");
  assert.deepEqual(new Set(randomizedRelated.map(({ id }) => id)), new Set(["photo-a", "photo-b"]));
  assert.equal(randomizedRelated.some(({ id }) => id === "hero"), false);
});

test("related detail grid randomizes its full tagged pool by visit seed", () => {
  const cards = [
    { id: "detail-hero", category: "kiosk-posm", sourceOrder: 0, tagIds: ["shared"], media: { src: "/hero.webp", width: 4, height: 3 } },
    ...makeCards(8, "detail-related").map((card, index) => ({
      ...card,
      category: "kiosk-posm",
      sourceOrder: index + 1,
      rank: index + 1,
      tagIds: ["shared"],
    })),
  ];
  const options = {
    cards,
    categoryOrder: ["kiosk-posm", "led-displays-lightboxes"],
    columns: 3,
    datasetVersion: "random-related-test",
    heroId: "detail-hero",
    layoutViewportWidth: 1024,
    viewportHeight: 900,
    headerHeight: 80,
    tag: "shared",
  };
  const first = advertisingRuntime.compileAdvertisingRelatedLayout({ ...options, seed: "visit-a" });
  const repeat = advertisingRuntime.compileAdvertisingRelatedLayout({ ...options, seed: "visit-a" });
  const nextVisit = advertisingRuntime.compileAdvertisingRelatedLayout({ ...options, seed: "visit-b" });
  const expectedIds = new Set(cards.slice(1).map(({ id }) => id));
  const firstOrder = first.layout.diagnostics.placementOrder;

  assert.deepEqual(new Set(first.cards.map(({ id }) => id)), expectedIds);
  assert.equal(first.cards.length, cards.length - 1, "related detail grid keeps every matching image");
  assert.deepEqual(firstOrder, repeat.layout.diagnostics.placementOrder, "same visit restores related order");
  assert.notDeepEqual(firstOrder, nextVisit.layout.diagnostics.placementOrder, "reload seed reshuffles the related grid");
  assert.ok(first.layout.placements.every(({ card }) => cards.includes(card)), "solver returns original canonical card records");
});

test("solver follows supplied presentation order without rewriting canonical card data", () => {
  for (const count of [0, 1, 2, 3, 10, 100]) {
    const cards = makeCards(count, "pool-" + count);
    const original = structuredClone(cards);
    const category = "pool-" + count;
    const order = shuffleWithSeed(cards, "solver-seed-1", category);
    const expectedIds = order.map(({ id }) => id);
    const layout = compileAdvertisingProductLayout({
      cards,
      categoryOrder: [category],
      columns: 4,
      layoutViewportWidth: 1024,
      presentationOrder: expectedIds,
    });

    assert.deepEqual(layout.diagnostics.placementOrder, expectedIds, "solver consumes the requested display order");
    assert.deepEqual(new Set(layout.placements.map(({ card }) => card.id)), new Set(expectedIds));
    assert.equal(layout.placements.length, count, "every eligible image appears exactly once");
    assert.ok(layout.diagnostics.operations <= 300000, "search stays inside its fixed operation budget");
    assert.equal(inspectAdvertisingGrid({ layout, placements: layout.placements }).valid, true,
      "randomized layout retains independent hard-geometry validity");
    assert.deepEqual(cards, original, "solver must not mutate canonical identity or metadata");
  }

  for (const seed of ["solver-seed-2", "solver-seed-3"]) {
    const cards = makeCards(100, "large-pool");
    const order = shuffleWithSeed(cards, seed, "large-pool").map(({ id }) => id);
    for (const layoutViewportWidth of [320, 390, 768, 1024, 1440, 1920, 2560]) {
      const layout = compileAdvertisingProductLayout({
        cards,
        categoryOrder: ["large-pool"],
        columns: columnsForWidth(layoutViewportWidth),
        layoutViewportWidth,
        presentationOrder: order,
      });
      assert.deepEqual(layout.diagnostics.placementOrder, order, seed + " at " + layoutViewportWidth + "px keeps display order");
      assert.equal(layout.placements.length, 100);
      assert.ok(layout.diagnostics.operations <= 300000);
      assert.equal(inspectAdvertisingGrid({ layout, placements: layout.placements }).valid, true);
    }
  }

  const categoryOrder = ADVERTISING_CATEGORIES.map(({ slug }) => slug);
  for (const filter of ["all", ...categoryOrder]) {
    const eligible = ADVERTISING_CARDS.filter((card) => matchesAdvertisingFilter(card, filter));
    for (const layoutViewportWidth of [320, 390, 768, 1024, 1440, 1920, 2560]) {
      const presentationOrder = shuffleWithSeed(eligible, "public-grid-seed", "filter:" + filter)
        .map(({ id }) => id);
      const layout = compileAdvertisingProductLayout({
        cards: ADVERTISING_CARDS,
        categoryOrder,
        filter,
        layoutViewportWidth,
        presentationOrder,
      });
      assert.deepEqual(layout.diagnostics.placementOrder, presentationOrder, filter + " at " + layoutViewportWidth + "px keeps requested order");
      assert.equal(layout.placements.length, eligible.length);
      assert.ok(layout.diagnostics.operations <= 300000);
      assert.equal(inspectAdvertisingGrid({ layout, placements: layout.placements }).valid, true);
    }
  }

  const cards = makeCards(3, "invalid-order");
  for (const presentationOrder of [
    ["invalid-order-0", "invalid-order-0", "invalid-order-2"],
    ["invalid-order-0", "unexpected-id", "invalid-order-2"],
    ["invalid-order-0", "invalid-order-1"],
  ]) {
    assert.throws(() => compileAdvertisingProductLayout({
      cards,
      categoryOrder: ["invalid-order"],
      columns: 2,
      layoutViewportWidth: 390,
      presentationOrder,
    }), (error) => error.code === "invalid-input" && /presentation order/i.test(error.diagnostic?.violation || ""));
  }
});

test("organic solver scores the rendered order while keeping 20 seeded hard-safe layouts", () => {
  const categoryOrder = ADVERTISING_CATEGORIES.map(({ slug }) => slug);
  const observedOrders = new Set();

  for (let seed = 0; seed < 20; seed += 1) {
    const priority = shuffleWithSeed(ADVERTISING_CARDS, `organic-seed-${seed}`, "grid:all")
      .map(({ id }) => id);
    const layout = compileAdvertisingProductLayout({
      cards: ADVERTISING_CARDS,
      categoryOrder,
      filter: "all",
      layoutViewportWidth: 390,
      presentationOrder: priority,
      organicOrder: true,
    });
    const actual = scoreAdvertisingOrganicRhythm(layout.placements);

    assert.deepEqual(new Set(layout.placements.map(({ card }) => card.id)), new Set(priority),
      "organic scoring must preserve every canonical card exactly once");
    assert.equal(inspectAdvertisingGrid({ layout, placements: layout.placements }).valid, true,
      "soft ratio scoring must not relax hard geometry");
    assert.equal(actual.targetApplicable, true);
    assert.equal(actual.targetMet, true,
      `seed ${seed} should keep both ratio classes and cap the first-12 run at four; got ${actual.firstBands.join("")}`);
    assert.equal(layout.diagnostics.organicRhythm.actual.targetMet, actual.targetMet,
      "solver diagnostics must report score from rendered placements");
    assert.ok(layout.diagnostics.operations <= layout.diagnostics.budget);
    observedOrders.add(layout.diagnostics.placementOrder.slice(0, 12).join(","));
  }

  assert.ok(observedOrders.size >= 2, "20 reload seeds should produce at least two organic layouts");
});

test("organic solver keeps all six filter pools hard-safe across supported viewport widths", () => {
  const categoryOrder = ADVERTISING_CATEGORIES.map(({ slug }) => slug);
  for (const filter of ["all", ...categoryOrder]) {
    const eligible = ADVERTISING_CARDS.filter((card) => matchesAdvertisingFilter(card, filter));
    for (const layoutViewportWidth of [320, 390, 768, 1024, 1440, 1920, 2560]) {
      const presentationOrder = shuffleWithSeed(
        eligible, "organic-matrix-seed", `filter:${filter}`,
      ).map(({ id }) => id);
      const layout = compileAdvertisingProductLayout({
        cards: ADVERTISING_CARDS,
        categoryOrder,
        filter,
        layoutViewportWidth,
        presentationOrder,
        organicOrder: true,
      });
      const actual = scoreAdvertisingOrganicRhythm(layout.placements);

      assert.equal(layout.placements.length, eligible.length, `${filter} at ${layoutViewportWidth}px keeps every image`);
      assert.deepEqual(new Set(layout.placements.map(({ card }) => card.id)), new Set(presentationOrder));
      assert.equal(inspectAdvertisingGrid({ layout, placements: layout.placements }).valid, true,
        `${filter} at ${layoutViewportWidth}px keeps hard geometry safe`);
      assert.equal(layout.diagnostics.organicRhythm.actual.score, actual.score);
      if (actual.targetApplicable) {
        assert.equal(actual.targetMet, true,
          `${filter} at ${layoutViewportWidth}px meets the soft first-12 ratio rhythm`);
      }
      assert.ok(layout.diagnostics.operations <= layout.diagnostics.budget);
    }
  }
});

test("organic solver remains bounded and diagnostic when a future 100-image pool has extreme ratios", () => {
  const category = "future-pool";
  const cards = makeCards(100, category);
  for (const seed of ["future-a", "future-b", "future-c", "future-d"]) {
    const presentationOrder = shuffleWithSeed(cards, seed, category)
      .map(({ id }) => id);
    for (const layoutViewportWidth of [320, 390, 1024]) {
      const layout = compileAdvertisingProductLayout({
        cards,
        categoryOrder: [category],
        filter: category,
        layoutViewportWidth,
        presentationOrder,
        organicOrder: true,
      });
      const rhythm = layout.diagnostics.organicRhythm;

      assert.equal(layout.placements.length, cards.length);
      assert.deepEqual(new Set(layout.placements.map(({ card }) => card.id)), new Set(presentationOrder));
      assert.equal(inspectAdvertisingGrid({ layout, placements: layout.placements }).valid, true,
        `future pool at ${layoutViewportWidth}px keeps hard geometry safe`);
      assert.ok(layout.diagnostics.operations <= 300000);
      assert.ok(rhythm.actual.targetMet !== false || rhythm.fallbackReason,
        "a near-rhythm result must explain why the soft target could not be met");
    }
  }
});

test("related detail solver preserves the complete tagged set and scores its shuffled layout", () => {
  const categoryOrder = ADVERTISING_CATEGORIES.map(({ slug }) => slug);
  const hero = ADVERTISING_CARDS.find((card) => card.tagIds?.length);
  const tag = hero.tagIds.find((id) => !hero.productIds.includes(id));
  const related = advertisingRuntime.selectAdvertisingRelated({
    cards: ADVERTISING_CARDS,
    categoryOrder,
    heroId: hero.id,
    tag,
  });
  const first = advertisingRuntime.compileAdvertisingRelatedLayout({
    cards: ADVERTISING_CARDS,
    categoryOrder,
    heroId: hero.id,
    tag,
    layoutViewportWidth: 390,
    viewportHeight: 844,
    seed: "related-layout-seed-a",
  });
  const second = advertisingRuntime.compileAdvertisingRelatedLayout({
    cards: ADVERTISING_CARDS,
    categoryOrder,
    heroId: hero.id,
    tag,
    layoutViewportWidth: 390,
    viewportHeight: 844,
    seed: "related-layout-seed-b",
  });

  assert.equal(first.cards.length, related.length, "related layout keeps every matching image");
  assert.deepEqual(new Set(first.cards.map(({ id }) => id)), new Set(related.map(({ id }) => id)));
  assert.notDeepEqual(first.cards.map(({ id }) => id), second.cards.map(({ id }) => id),
    "related image order can change with the visit seed");
  assert.equal(first.layout.diagnostics.organicRhythm.actual.targetApplicable, true);
  assert.equal(first.layout.diagnostics.organicRhythm.actual.targetMet, true);
  assert.ok(first.layout.diagnostics.operations <= first.layout.diagnostics.budget);
});

test("history restores the seed on Back, accepts one exact full-navigation locale handoff, and reseeds on reload", () => {
  let href = "https://example.test/vi/advertising-products/";
  let state = null;
  let createdSeed = "visit-a";
  let now = 1000;
  const stored = new Map();
  const sessionStorage = {
    getItem(key) { return stored.get(key) ?? null; },
    setItem(key, value) { stored.set(key, String(value)); },
    removeItem(key) { stored.delete(key); },
  };
  const browserHistory = {
    get state() { return state; },
    replaceState(nextState, _title, nextHref) {
      state = nextState;
      href = new URL(nextHref, href).href;
    },
    pushState(nextState, _title, nextHref) {
      state = nextState;
      href = new URL(nextHref, href).href;
    },
  };
  const createController = (navigationType, options = {}) => advertisingRuntime.createAdvertisingBrowseHistoryController({
    cards: browseCards,
    categories: categoryOrder.map((slug) => ({ slug })),
    tagRegistry,
    browserHistory,
    restoredHistoryState: options.restoredHistoryState,
    getHref: () => href,
    getNavigationType: () => navigationType,
    createSeed: () => createdSeed,
    sessionStorage: options.sessionStorage || sessionStorage,
    now: () => now,
  });

  const firstVisit = createController("navigate");
  assert.equal(firstVisit.current.seed, "visit-a");
  firstVisit.captureGrid({ focusId: "photo-a", scrollY: 120, viewportWidth: 1440 });
  firstVisit.replaceCategory("kiosk-posm");
  firstVisit.replaceTag("shared");
  firstVisit.openPhoto("photo-a");
  const visitState = structuredClone(state);
  const serializedUrl = new URL(href);
  assert.equal(serializedUrl.searchParams.has("seed"), false, "random seed stays out of the URL contract");
  assert.equal(advertisingRuntime.readAdvertisingBrowseHistoryState(visitState).seed, "visit-a");
  assert.equal(advertisingRuntime.readAdvertisingBrowseHistoryState({
    from: "barba",
    index: 0,
    states: [{ data: { advertisingBrowse: visitState.advertisingBrowse } }],
  }).seed, "visit-a", "history parser reads Barba's wrapped state after a document reconstruction");

  const destinationHref = "https://example.test/en/advertising-products/" + serializedUrl.search;
  advertisingRuntime.writeAdvertisingVisitSeedHandoff(sessionStorage, destinationHref, "visit-a", { now });
  href = destinationHref;
  state = null;
  createdSeed = "destination-seed";
  const localeReconstruction = createController("navigate");
  assert.equal(localeReconstruction.current.seed, "visit-a", "a fresh locale document consumes the exact one-time seed handoff");
  assert.equal(sessionStorage.getItem(advertisingRuntime.ADVERTISING_VISIT_SEED_HANDOFF_KEY), null,
    "the locale handoff is removed immediately after its destination consumes it");

  href = "https://example.test/vi/advertising-products/" + serializedUrl.search;
  state = {
    from: "barba",
    index: 0,
    states: [{ data: {}, ns: "advertising-products", url: href }],
  };
  createdSeed = "back-forward-seed";
  const backForward = createController("back_forward", { restoredHistoryState: visitState });
  assert.equal(backForward.current.seed, "visit-a", "document reconstruction from history restores the entry seed");
  assert.equal(backForward.current.photo, "photo-a");

  advertisingRuntime.writeAdvertisingVisitSeedHandoff(sessionStorage, href, "stale-seed", { now });
  createdSeed = "visit-after-reload";
  const reload = createController("reload");
  assert.equal(reload.current.seed, "visit-after-reload", "reload chooses new randomized positions");
  assert.equal(reload.current.photo, "photo-a", "reload keeps the route identity while changing only its seed");
  assert.equal(sessionStorage.getItem(advertisingRuntime.ADVERTISING_VISIT_SEED_HANDOFF_KEY), null,
    "reload discards a pending locale handoff instead of reusing it");

  href = destinationHref;
  state = null;
  createdSeed = "direct-url-seed";
  const directOpen = createController("navigate");
  assert.equal(directOpen.current.seed, "direct-url-seed", "a direct destination open gets a fresh seed without a handoff");

  advertisingRuntime.writeAdvertisingVisitSeedHandoff(sessionStorage, `${href}?different=1`, "wrong-target", { now });
  createdSeed = "mismatch-seed";
  const mismatch = createController("navigate");
  assert.equal(mismatch.current.seed, "mismatch-seed", "a handoff for another exact URL is rejected");
  assert.equal(sessionStorage.getItem(advertisingRuntime.ADVERTISING_VISIT_SEED_HANDOFF_KEY), null,
    "mismatched handoffs are consumed and discarded");

  advertisingRuntime.writeAdvertisingVisitSeedHandoff(sessionStorage, href, "expired-seed", { now });
  now += 31_000;
  createdSeed = "expired-url-seed";
  const expired = createController("navigate");
  assert.equal(expired.current.seed, "expired-url-seed", "expired handoffs are rejected");
});

for (const scenario of [
  { name: "matching history fallback", navigationType: "navigate", historyFallback: true, restore: true },
  { name: "ordinary direct navigation", navigationType: "navigate", historyFallback: false },
  { name: "reload despite a history marker", navigationType: "reload", historyFallback: true },
  { name: "different category", navigationType: "navigate", historyFallback: true, mismatch: { category: "led-displays-lightboxes" } },
  { name: "different photo", navigationType: "navigate", historyFallback: true, mismatch: { photo: "photo-b" } },
  { name: "different tag", navigationType: "navigate", historyFallback: true, mismatch: { tag: null } },
]) {
  test(`native document reconstruction restores the visit only for ${scenario.name}`, () => {
    const saved = {
      category: "kiosk-posm", photo: "photo-a", tag: "shared", seed: "original-visit",
      grid: { category: "kiosk-posm", focusId: "photo-a", scrollY: 345, viewportWidth: 1440 },
      detail: { anchorId: "photo-b", anchorOffset: 12, scrollY: 789, viewportWidth: 1440 },
      ...scenario.mismatch,
    };
    const controller = advertisingRuntime.createAdvertisingBrowseHistoryController({
      cards: browseCards,
      categories: categoryOrder.map(slug => ({ slug })),
      tagRegistry,
      browserHistory: { state: { from: "barba", index: 0, states: [{ data: {} }] } },
      restoredHistoryState: { from: "barba", index: 0, states: [{ data: { advertisingBrowse: saved } }] },
      historyFallback: scenario.historyFallback,
      getHref: () => "https://example.test/vi/advertising-products/?category=kiosk-posm&photo=photo-a&tag=shared",
      getNavigationType: () => scenario.navigationType,
      createSeed: () => "new-document-visit",
      sessionStorage: null,
    });

    assert.equal(controller.current.seed, scenario.restore ? "original-visit" : "new-document-visit");
    assert.deepEqual(
      [controller.current.category, controller.current.photo, controller.current.tag],
      ["kiosk-posm", "photo-a", "shared"],
      "URL identity always wins over a stale history snapshot",
    );
    if (scenario.restore) {
      assert.equal(controller.current.grid.scrollY, 345);
      assert.equal(controller.current.grid.focusId, "photo-a");
      assert.equal(controller.current.detail.scrollY, 789);
      assert.equal(controller.current.detail.anchorId, "photo-b");
    }
  });
}

test("suggestion holds each photo 5000ms on its own zoom clock, pushes the next photo in for 900ms without zoom, and pauses hidden/reduced/active/covered", async t => {
  const { mountSuggestionSlides } = await import("../../src/site/advertising-products/suggestion-slideshow.mjs");
  const names = ["document", "innerHeight", "MutationObserver", "IntersectionObserver", "matchMedia", "addEventListener", "removeEventListener", "setInterval", "clearInterval"];
  const saved = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  let now = 0, nextTick = 0, cadence = 0, tick, reduced = false, active = false, covered = false, intersect;
  const animations = [], created = [], inserted = [];
  const document = new EventTarget(), events = new EventTarget(), preference = new EventTarget();
  document.hidden = false;
  document.body = { classList: { contains: () => false } };
  document.documentElement = {};
  document.querySelector = selector => selector === "dialog[open]" && covered ? {} : null;
  preference.matches = false;
  const button = {
    dataset: { advertisingSuggestionTag: "cadence-test" }, isConnected: true,
    getAttribute: () => active ? "true" : "false",
    querySelector: () => current,
    insertBefore: next => inserted.push(next),
  };
  // Slideshow dừng theo cả cụm (một IntersectionObserver trên root), không theo nút lẻ.
  const root = { hidden: false, querySelectorAll: () => [button] };
  let current;
  const globals = {
    document, innerHeight: 800,
    MutationObserver: class { observe() {} disconnect() {} },
    IntersectionObserver: class {
      constructor(callback) { intersect = isIntersecting => callback([{ isIntersecting }]); }
      observe() {} disconnect() {}
    },
    matchMedia: () => preference,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    setInterval: (callback, interval) => { tick = callback; cadence = interval; nextTick = now + interval; return 1; },
    clearInterval: () => { tick = null; },
  };
  for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  const cards = makeCards(6, "cadence-test").map(card => ({ ...card, tagIds: ["cadence-test"] }));
  const createImage = card => {
    const image = {
      dataset: {}, style: { removeProperty() {} }, nextSibling: null,
      decode: () => Promise.resolve(), remove() { this.removed = true; },
      animate: (frames, options) => {
        const animation = new EventTarget();
        let start = now, held = null;
        Object.assign(animation, {
          frames, options, cancel() {},
          pause() { held ??= now - start; },
          play() { if (held !== null) { start = now - held; held = null; } },
        });
        Object.defineProperty(animation, "currentTime", {
          get: () => held ?? now - start,
          set: value => { if (held === null) start = now - value; else held = value; },
        });
        Object.defineProperty(animation, "playState", { get: () => held === null ? "running" : "paused" });
        animations.push(animation);
        return animation;
      },
    };
    created.push(card.id);
    return image;
  };
  current = createImage(cards[0]);
  created.length = 0;
  const cleanup = mountSuggestionSlides(root, { cards, createImage, isReduced: () => reduced, signal: new AbortController().signal });
  intersect(true);
  t.after(() => {
    cleanup();
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  const advance = async milliseconds => {
    const end = now + milliseconds;
    while (tick && nextTick <= end) {
      now = nextTick; nextTick += cadence; tick();
      await Promise.resolve(); await Promise.resolve();
    }
    now = end;
  };
  await advance(4999);
  assert.equal(created.length, 0, "no advance before five seconds");
  await advance(1);
  assert.equal(created.length, 1, "one decoded image at the five-second tick");
  const fadeIn = animations.find(animation => animation.frames?.[0]?.transform === "translateX(100%)");
  assert.equal(fadeIn.options.duration, 900, "approved push duration");
  assert.ok(animations.some(animation => animation.frames.length === 0 && animation.options.duration === 5000),
    "new photo gets a keyframe-less five-second hold clock");
  assert.ok(!animations.some(animation => animation.frames.some(frame => frame.transform?.includes("scale"))),
    "owner removed the zoom out");
  current = inserted[0];
  fadeIn.dispatchEvent(new Event("finish"));
  await advance(2000);
  intersect(false);
  await advance(8000);
  intersect(true);
  await advance(2999);
  assert.equal(created.length, 1, "offscreen time does not count toward the five-second hold");
  await advance(1);
  assert.equal(created.length, 2, "next photo after five visible seconds");
  current = inserted[1];
  animations.findLast(animation => animation.frames?.[0]?.transform === "translateX(100%)").dispatchEvent(new Event("finish"));
  document.hidden = true; await advance(5000);
  assert.equal(created.length, 2, "hidden tab pauses the deck");
  document.hidden = false; reduced = true; await advance(5000);
  assert.equal(created.length, 2, "reduced motion remains static");
  reduced = false; active = true; await advance(5000);
  assert.equal(created.length, 2, "active suggestion remains static");
  active = false; covered = true; await advance(5000);
  assert.equal(created.length, 2, "open viewer or menu dialog keeps the deck static");
  covered = false; await advance(5000);
  assert.equal(created.length, 3, "same deck resumes at the next permitted tick");
  assert.ok(animations.some(animation => animation.frames?.[1]?.transform === "translateX(-35%)"
    && animation.options.duration === 900), "incoming photo pushes the outgoing one to the left");
  assert.ok(animations.some(animation => animation.frames?.[1]?.opacity === 0.4), "outgoing photo dims while pushed out");
});


test("stationary browse persistence avoids duplicate native history writes", () => {
  let state = null, writes = 0;
  const controller = advertisingRuntime.createAdvertisingBrowseHistoryController({
    cards: browseCards, categories: categoryOrder.map(slug => ({ slug })), tagRegistry,
    browserHistory: {
      get state() { return state; },
      replaceState(next) { state = structuredClone(next); writes++; },
    },
    getHref: () => "https://example.test/vi/advertising-products/",
    getNavigationType: () => "navigate", createSeed: () => "history-dedup", sessionStorage: null,
    getLogicalScroll: () => 0,
  });
  controller.persistCurrent();
  for (let index = 0; index < 120; index++) controller.persistCurrent();
  assert.equal(writes, 1, "unchanged scroll events must not consume browser history write quota");
  controller.captureGrid({ focusId: "photo-a", scrollY: 0 });
  controller.persistCurrent();
  assert.equal(writes, 2, "changed anchor metadata still reaches native history");
});

