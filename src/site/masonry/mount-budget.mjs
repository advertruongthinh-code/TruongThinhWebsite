// Card mount budget while scrolling, and ghost (temporary) cards holding the place of cards not yet mounted (advertising-masonry R7).
import { mountQuota } from "./layout.mjs";
import { DUR, EASE } from "./motion-tokens.mjs";

export const GHOST_FADE_MS = DUR.fade;
export const GHOST_FADE_EASING = EASE.expoOut;
// One full color cycle of the phone image-wait layer: 4 dominant colors, 2s each (detail.css, [data-media-wait="colors"]).
const COLORS_CYCLE_MS = 8000;
// A move over two viewports in one sample is a jump: the old content is no longer used and the cost measurement may be stale.
const JUMP_VIEWPORTS = 2;
// One third of the frame interval is for mounting cards; the rest is for style, layout, paint.
const BUDGET_SHARE = 1 / 3;
const MIN_FRAME_MS = 8;
const MAX_FRAME_MS = 34;
const INITIAL_COST_MS = 3;
// A gap this long between two evaluations says nothing about frame cadence (scrolling stopped), so the cost may be stale.
const PAUSE_MS = 100;
// After a jump or a pause the quota restarts here and doubles each frame that mounts, until it reaches the measured quota: a stale or low cost
// cannot dump a burst of cards into the first frame (loading-glass R10).
const RAMP_START = 2;
// Card cost samples kept for the median.
const COST_SAMPLES = 5;

// Every color layer shares one phase (a negative delay equal to the current time modulo the cycle), so neighbors change color in step and a ghost card
// turning into a real card (or the primary frame) keeps its color.
export const colorsPhase = (now = performance.now()) => `${-(now % COLORS_CYCLE_MS)}ms`;

// Phone image wait (progressive-loading R9): a flat layer cycling through the image's 4 dominant colors. `colors` is a list of 4 CSS colors.
export const setColorWait = (node, colors) => {
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
// delay the next frame (A04s: JS 0.5ms per card but the frame grows several ms longer per card). Only newly created cards feed it: a card
// reattached from the queue is cheap and would pull the cost down.
export function createMountBudget(clock = () => performance.now(), nextFrame = (callback) => requestAnimationFrame(callback)) {
  let costMs = INITIAL_COST_MS;
  // Frame cadence when no cards are mounted: the baseline that separates mount cost from the frame interval.
  let frameMs = 1000 / 60;
  let sample = null;
  let lastMount = null;
  // Smoothed scroll speed in px/ms and the last scroll step in px, for the build zone.
  let speed = 0;
  let step = 0;
  let ramp = RAMP_START;
  // The budget is per frame: one mount uses up that frame's share, and a second check in the same frame (ghost rAF then
  // scroll, a few ms apart because the first mount took time) mounts no more.
  let spent = false;
  const smooth = (previous, next) => previous + (next - previous) * 0.2;
  const clampFrame = (ms) => Math.min(MAX_FRAME_MS, Math.max(MIN_FRAME_MS, ms));
  const measured = () => mountQuota({ budgetMs: frameMs * BUDGET_SHARE, costMs });
  // Interval up to this frame: if cards were created in the previous frame, the excess over the baseline cadence is their cost; otherwise it is the baseline cadence.
  // The cost is the median of the last few samples: one frame held by other work (image decode, a GC) does not read as several ms per card,
  // while a device whose cards really cost more moves the cost within a few frames, in either direction.
  const samples = [];
  const learn = (mounted, elapsed) => {
    const perCard = Math.max(mounted.jsMs, elapsed - frameMs) / mounted.count;
    samples.push(Math.min(MAX_FRAME_MS, Math.max(0.05, perCard)));
    if (samples.length > COST_SAMPLES) samples.shift();
    const sorted = [...samples].sort((a, b) => a - b);
    costMs = sorted[sorted.length >> 1];
    return perCard;
  };
  // The ramp opens only while a frame's cost per card agrees with the cost known so far (at most double): a cost learned at rest (idle
  // bracket) may read low, so a device whose cards stretch the frame stays at a card or two per frame until the median catches up, while a
  // fast machine, where only an odd frame is held by other work, opens up within a few frames.
  const measure = (elapsed) => {
    const mounted = lastMount;
    lastMount = null;
    if (!mounted) {
      frameMs = smooth(frameMs, clampFrame(elapsed));
      return;
    }
    const known = costMs;
    const perCard = learn(mounted, elapsed);
    if (ramp < Infinity && perCard <= 2 * known) ramp = ramp * 2 > measured() ? Infinity : ramp * 2;
  };
  return {
    // Called once per frame when the window is evaluated (an idle pass does not call it: its gap is not a frame interval); returns true on a jump.
    begin(y, viewportHeight) {
      const now = clock();
      let jump = false;
      if (sample) {
        const elapsed = now - sample.time;
        // Second call in the same frame (ghost rAF then scroll): there is no distance to measure, keep the previous verdict and the old mark.
        if (elapsed < 4) return sample.jump;
        const distance = Math.abs(y - sample.y);
        if (elapsed >= PAUSE_MS) {
          lastMount = null;
          ramp = RAMP_START;
          speed = 0;
        } else {
          measure(elapsed);
          speed = smooth(speed, distance / elapsed);
        }
        // A long jump (dragging the scrollbar, returning to a previous spot) even after a long pause; it is not a scroll step for the zone.
        jump = distance > viewportHeight * JUMP_VIEWPORTS;
        step = jump ? 0 : distance;
        if (jump) ramp = RAMP_START;
      }
      sample = { y, time: now, jump };
      return jump;
    },
    speed: () => speed,
    quota: () => (spent ? 0 : Math.min(ramp, measured())),
    // `fresh` of the `count` cards were newly created (the rest reattached from the queue); only those measure the cost. An `idle` pass has no
    // frame of its own: the cost is read from the interval of the next two frames, whose first one lays out the new cards, unless a frame
    // evaluation measured them first.
    record(count, jsMs, fresh = count, { idle = false } = {}) {
      if (count > 0) {
        const mounted = fresh > 0 ? { count: fresh, jsMs } : null;
        lastMount = mounted;
        if (idle && mounted) {
          nextFrame(() => {
            const start = clock();
            nextFrame(() => {
              if (lastMount !== mounted) return;
              lastMount = null;
              learn(mounted, clock() - start);
            });
          });
        }
        // When the budget runs out until the next frame starts (this callback registers before any follow-up mount rAF, so it runs before them).
        if (!spent) nextFrame(() => { spent = false; });
        spent = true;
      }
    },
    // Build zone beyond each viewport edge, the same above and below (advertising-masonry R7): the largest of one viewport, the distance scrolled
    // while one viewport of cards builds at the current quota (at most half the queue of removed cards), and the last scroll step.
    // At rest (no frame evaluation for a pause, only idle passes) speed and the budget's own step count as zero, so a fling's zone does not
    // stay wide. A step the caller measured between its own passes always counts: it is zero once scrolling stops, while a slow device's frame
    // can last past the pause threshold mid-fling and still move two viewports.
    zone({ viewportHeight, cardsPerViewport, capacity, step: passStep }) {
      const resting = !sample || clock() - sample.time >= PAUSE_MS;
      const perViewport = Math.max(1, cardsPerViewport);
      const fillMs = perViewport / measured() * frameMs;
      const cap = viewportHeight * (capacity / 2) / perViewport;
      return Math.max(viewportHeight, Math.min(cap, resting ? 0 : speed * fillMs), passStep ?? (resting ? 0 : step));
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
    capacity,
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
