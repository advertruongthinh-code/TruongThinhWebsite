// Card mount budget while scrolling, and ghost (temporary) cards holding the place of cards not yet mounted (advertising-masonry R7).
import { mountQuota } from "./layout.mjs";
import { DUR, EASE } from "./motion-tokens.mjs";

// Media crossfade over a wait layer (temp card, phone color layer): 0.6s symmetric ease-in-out. The 0.45s expo-out it replaced did most of
// the change in its first 100ms, so on a phone the photo read as appearing at once (owner 2026-11-22: "đơn giản nhất là crossfade").
export const GHOST_FADE_MS = DUR.hover;
export const GHOST_FADE_EASING = EASE.card;
// One full color cycle of the phone image-wait layer: 4 dominant colors, 2s each (detail.css, [data-media-wait="colors"]).
const COLORS_CYCLE_MS = 8000;
// Swiping a viewport every 100ms only holds places and does not mount real cards.
const FAST_VIEWPORTS_PER_S = 10;
const JUMP_VIEWPORTS = 2;
// One third of the frame interval is for mounting cards; the rest is for style, layout, paint.
const BUDGET_SHARE = 1 / 3;
const MIN_FRAME_MS = 8;
const MAX_FRAME_MS = 34;
const INITIAL_COST_MS = 3;
const HOLD_FAST_MS = 120;
// The measured time covers only the card-mounting JS; the card's style and layout run later in the same frame so are not yet in the measurement. A hard cap
// keeps a few cards per frame even when the measurement is low (a fast machine still mounts everything within a few frames).
const MAX_MOUNTS_PER_FRAME = 8;

// Every color layer shares one phase (a negative delay equal to the current time modulo the cycle), so neighbors change color in step and a ghost card
// turning into a real card (or the primary frame) keeps its color.
// Time 0 of the shared cycle; moves forward by each scroll's length, since the cycle stands still while the page scrolls (holdColorsWhileScrolling).
let colorsStart = 0;
// CSS animations run on the document timeline, which holds the frame's time rather than the moment the script reads the clock.
const animationClock = () => globalThis.document?.timeline?.currentTime ?? performance.now();
export const colorsPhase = (now = animationClock(), start = colorsStart) => `${-((now - start) % COLORS_CYCLE_MS)}ms`;

// CSS ease-in-out, cubic-bezier(0.42, 0, 0.58, 1): the progress at time fraction x, solved by bisection on the curve's x.
const easeInOut = (x) => {
  const curve = (t, p1, p2) => 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3;
  let low = 0;
  let high = 1;
  for (let step = 0; step < 20; step++) {
    const mid = (low + high) / 2;
    if (curve(mid, 0.42, 0.58) < x) low = mid; else high = mid;
  }
  return curve((low + high) / 2, 0, 1);
};

// What the two layers show at cycle time `ms` (detail.css keyframes): base color, top color and the top layer's opacity.
// 0-2s: 1 under 2 fading in; 2-4s: 3 under 2 fading out; 4-6s: 3 under 4 fading in; 6-8s: 1 under 4 fading out.
export const colorsAt = (ms) => {
  const time = ((ms % COLORS_CYCLE_MS) + COLORS_CYCLE_MS) % COLORS_CYCLE_MS;
  const quarter = Math.floor(time / 2000);
  const progress = easeInOut((time % 2000) / 2000);
  return { pair: ["12", "32", "34", "14"][quarter], mix: quarter % 2 ? 1 - progress : progress };
};

// While the page scrolls every color layer stands still on the color it shows (detail.css, :root[data-colors-still], one flat color mixed in CSS):
// ~40 layers each running a compositor opacity animation kept the A04s GPU too busy to raster tiles in time, so the page background showed
// through as white flashes (29-32 per scripted swipe, 4-5 with still layers; owner 2026-11-21). When scrolling stops the cycle goes on from that
// same moment, so neither edge changes a color. Without scrollend a 150ms pause counts as stopped; with it a fling's busy gaps wait for scrollend.
const COLORS_SCROLL_IDLE_MS = 150;
const COLORS_SCROLL_SETTLE_MS = 500;
let colorsWatched = false;
let colorsTimer = 0;
let colorsStill = -1;
const resumeColors = () => {
  colorsStart = animationClock() - colorsStill;
  const phase = colorsPhase();
  for (const node of document.querySelectorAll('[data-media-wait="colors"]')) node.style.setProperty("--wait-phase", phase);
  colorsStill = -1;
  delete document.documentElement.dataset.colorsStill;
};
const holdColors = (delay) => {
  if (colorsStill < 0) {
    colorsStill = (animationClock() - colorsStart) % COLORS_CYCLE_MS;
    const { pair, mix } = colorsAt(colorsStill);
    document.documentElement.style.setProperty("--wait-mix", `${(mix * 100).toFixed(1)}%`);
    document.documentElement.dataset.colorsStill = pair;
  }
  clearTimeout(colorsTimer);
  colorsTimer = setTimeout(resumeColors, delay);
};
const holdColorsWhileScrolling = () => {
  if (colorsWatched || typeof globalThis.addEventListener !== "function") return;
  colorsWatched = true;
  const settle = "onscrollend" in globalThis ? COLORS_SCROLL_SETTLE_MS : COLORS_SCROLL_IDLE_MS;
  addEventListener("scroll", () => holdColors(settle), { capture: true, passive: true });
  addEventListener("scrollend", () => colorsStill >= 0 && holdColors(COLORS_SCROLL_IDLE_MS), { capture: true });
};

// Phone image wait (progressive-loading R9): a flat layer cycling through the image's 4 dominant colors. `colors` is a list of 4 CSS colors.
export const setColorWait = (node, colors) => {
  holdColorsWhileScrolling();
  node.dataset.mediaWait = "colors";
  colors.forEach((color, index) => node.style.setProperty(`--wait-${index + 1}`, color));
  node.style.setProperty("--wait-phase", colorsPhase());
};

export const clearColorWait = (node) => {
  delete node.dataset.mediaWait;
  for (let index = 1; index <= 4; index++) node.style.removeProperty(`--wait-${index}`);
  node.style.removeProperty("--wait-phase");
};

// Per-card cost and frame cadence are measured on the device; a pure function of the clock passed in, for tests.
// Cost is measured by frame interval: the mounting JS is only a small part, the card's style, layout and paint run later in the same frame and
// delay the next frame (A04s: JS 0.5ms per card but the frame grows several ms longer per card).
export function createMountBudget(clock = () => performance.now(), nextFrame = (callback) => requestAnimationFrame(callback)) {
  let costMs = INITIAL_COST_MS;
  // Frame cadence when no cards are mounted: the baseline that separates mount cost from the frame interval.
  let frameMs = 1000 / 60;
  let sample = null;
  let lastMount = null;
  // The budget is per frame: one mount uses up that frame's share, and a second check in the same frame (ghost rAF then
  // scroll, a few ms apart because the first mount took time) mounts no more.
  let spent = false;
  const smooth = (previous, next) => previous + (next - previous) * 0.2;
  const clampFrame = (ms) => Math.min(MAX_FRAME_MS, Math.max(MIN_FRAME_MS, ms));
  // Interval up to this frame: if cards were mounted in the previous frame, the excess over the baseline cadence is their cost; otherwise it is the baseline cadence.
  const measure = (elapsed) => {
    const mounted = lastMount;
    lastMount = null;
    // A long pause means scrolling has stopped, saying nothing about frame cadence.
    if (elapsed >= 100) return;
    if (mounted) {
      const perCard = Math.max(mounted.jsMs, elapsed - frameMs) / mounted.count;
      costMs = smooth(costMs, Math.min(MAX_FRAME_MS, Math.max(0.05, perCard)));
    } else frameMs = smooth(frameMs, clampFrame(elapsed));
  };
  return {
    // Called each time the window is evaluated; returns true while swiping very fast.
    begin(y, viewportHeight) {
      const now = clock();
      let fast = false;
      if (sample) {
        const elapsed = now - sample.time;
        // Second call in the same frame (ghost rAF then scroll): there is no distance to measure, keep the previous conclusion and the old mark.
        if (elapsed < 4) return sample.fast;
        measure(elapsed);
        // The frame reran because ghost cards remain (no further scrolling): if swiping fast it stays fast, ending only after standing still long enough.
        if (y === sample.y) {
          sample.time = now;
          return sample.fast && now - sample.movedAt < HOLD_FAST_MS;
        }
        const distance = Math.abs(y - sample.y);
        // A long jump (dragging the scrollbar, returning to a previous spot) counts as fast swiping even after a long pause: the old content is no longer used.
        fast = distance / elapsed * 1000 > viewportHeight * FAST_VIEWPORTS_PER_S || distance > viewportHeight * JUMP_VIEWPORTS;
      }
      sample = { y, time: now, fast, movedAt: now };
      return fast;
    },
    quota: () => spent ? 0 : Math.min(MAX_MOUNTS_PER_FRAME, mountQuota({ budgetMs: frameMs * BUDGET_SHARE, costMs })),
    record(count, jsMs) {
      if (count > 0) {
        lastMount = { count, jsMs };
        // When the budget runs out until the next frame starts (this callback registers before any follow-up mount rAF, so it runs before them).
        if (!spent) nextFrame(() => { spent = false; });
        spent = true;
      }
    },
  };
}

// The ghost card layer sits at the top of the host (below all cards), in the same coordinate system as cards: left, top, width, height in px.
export function createGhostLayer(host) {
  const layer = document.createElement("div");
  layer.className = "masonry-ghost-layer";
  layer.setAttribute("aria-hidden", "true");
  const pending = new Map();
  const attach = () => {
    if (layer.parentNode !== host) host.prepend(layer);
  };
  const setStyle = (element, name, value) => {
    if (element.style[name] !== value) element.style[name] = value;
  };
  return {
    layer,
    ids: () => pending.keys(),
    has: (id) => pending.has(id),
    // Place (or update) the ghost card of a placement. `waitColors` (called once, when the element is created) returns the 4 colors of its wait layer,
    // the same layer on PC and phone (owner 2026-11-15).
    show(id, placement, waitColors) {
      let element = pending.get(id);
      if (!element) {
        element = document.createElement("div");
        element.className = "masonry-ghost";
        element.dataset.masonryGhost = id;
        setColorWait(element, waitColors());
        pending.set(id, element);
        attach();
        layer.append(element);
      }
      setStyle(element, "left", `${placement.x}px`);
      setStyle(element, "top", `${placement.y}px`);
      setStyle(element, "width", `${placement.pixelWidth}px`);
      setStyle(element, "height", `${placement.pixelHeight}px`);
    },
    // The real card takes its place: return the element so the card crossfades over it, then the caller removes it.
    take(id) {
      const element = pending.get(id);
      if (!element) return null;
      pending.delete(id);
      return element;
    },
    drop(id) {
      pending.get(id)?.remove();
      pending.delete(id);
    },
    prune(keep) {
      for (const id of [...pending.keys()]) if (!keep.has(id)) this.drop(id);
    },
    clear() {
      for (const id of [...pending.keys()]) this.drop(id);
    },
    destroy() {
      this.clear();
      layer.remove();
    },
  };
}

// Capacity of the queue of recently removed cards by device RAM (navigator.deviceMemory, GB; treated as 4 if absent): weak devices keep fewer cards.
export const detachedCapacity = (deviceMemory = 4) => {
  if (!(deviceMemory > 0)) return 24;
  if (deviceMemory <= 2) return 8;
  return deviceMemory >= 8 ? 48 : 24;
};

// LRU queue of cards recently removed from the DOM whose image is still decoded: on return, attach the very same old node, no empty frame.
export function createDetachedCards(capacity) {
  const queue = new Map();
  return {
    get size() { return queue.size; },
    has: (id) => queue.has(id),
    // Enter the queue (or refresh); returns cards pushed out for exceeding capacity, oldest first.
    put(id, node) {
      queue.delete(id);
      queue.set(id, node);
      const evicted = [];
      while (queue.size > capacity) {
        const [oldest] = queue.keys();
        evicted.push(queue.get(oldest));
        queue.delete(oldest);
      }
      return evicted;
    },
    take(id) {
      const node = queue.get(id);
      queue.delete(id);
      return node ?? null;
    },
    clear() {
      queue.clear();
    },
  };
}
