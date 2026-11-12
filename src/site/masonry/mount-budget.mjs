// Card mount budget while scrolling, and ghost (temporary) cards holding the place of cards not yet mounted (advertising-masonry R7).
import { mountQuota } from "./layout.mjs";
import { DUR, EASE } from "./motion-tokens.mjs";

export const GHOST_FADE_MS = DUR.fade;
export const GHOST_FADE_EASING = EASE.expoOut;
const BREATHE_MS = 2000;
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

// All breathing elements share one phase: a negative delay equal to the current time modulo the cycle, so a ghost card turning into a faded card
// does not jump in brightness.
export const breathePhase = (now = performance.now()) => `${-(now % BREATHE_MS)}ms`;

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
    // Place (or update) the ghost card of a placement.
    show(id, placement, color) {
      let element = pending.get(id);
      if (!element) {
        element = document.createElement("div");
        element.className = "masonry-ghost";
        element.dataset.masonryGhost = id;
        element.style.animationDelay = breathePhase();
        pending.set(id, element);
        attach();
        layer.append(element);
      }
      setStyle(element, "left", `${placement.x}px`);
      setStyle(element, "top", `${placement.y}px`);
      setStyle(element, "width", `${placement.pixelWidth}px`);
      setStyle(element, "height", `${placement.pixelHeight}px`);
      if (color) setStyle(element, "backgroundColor", color);
    },
    // The real card takes its place: return the element so the card crossfades over it, then the caller removes it.
    take(id) {
      const element = pending.get(id);
      if (!element) return null;
      pending.delete(id);
      element.style.animation = "none";
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
