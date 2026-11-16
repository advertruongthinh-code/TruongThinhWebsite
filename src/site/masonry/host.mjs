// Masonry yard (masonry-reuse step 7): state built from one grid's scroll window. The main masonry (Advertising, Projects)
// and the related one in detail are two instances, so the build budget, placeholder cards and LRU queue are written only once (advertising-masonry R7).
import { createDetachedCards, createGhostLayer, createMountBudget, detachedCapacity } from "./mount-budget.mjs";
import { DUR } from "./motion-tokens.mjs";

// Shared environment queries, defined once in head-inline.js. The fallback covers pages without it (admin overlay, tests that load
// modules alone); getters so importing in Node, where matchMedia does not exist, does not throw.
export const env = globalThis.TruongThinhEnv ?? {
  get reducedMotion() { return matchMedia("(prefers-reduced-motion: reduce)"); },
  get phone() { return matchMedia("(hover: none) and (pointer: coarse)"); },
};

// Which cards are really built this frame (loading-glass R10): required cards always build; the rest up to `quota()` in this order: cards
// meeting the viewport, queued cards (reattaching is cheaper than building new), then nearest the screen center. Fast mode, when more cards
// meeting the viewport are missing than the quota or on a `jump`, builds only those cards meeting the viewport, nearest the center first.
export function pickMounts({ missing, mustMount = () => false, meets = () => false, distance, queued = () => false, jump = false, quota }) {
  const forced = missing.filter(mustMount);
  const rest = missing.filter((id) => !mustMount(id));
  const required = rest.filter(meets);
  const limit = quota();
  const fast = jump || required.length > limit;
  const order = (fast ? required : rest)
    .sort((a, b) => (meets(b) - meets(a)) || (queued(b) - queued(a)) || distance(a) - distance(b));
  return new Set([...forced, ...order.slice(0, limit)]);
}

// Layout motion (masonry-live-layout R7): positions are precomputed, so a pass only slides each card from its inline left/top to its
// target. The target is written at once and a Web Animation on `transform` plays the offset back to zero (FLIP): no layout read per
// card, unlike Masonry 4.2.2 (getSize, 59-91 ms tasks on the A04s). DUR.card (0.4 s) and `ease`, as the card position
// transition has always run (design-system/motion.md).
export const SLIDE_ID = "masonry-slide";
// The card size morph (morphSize) runs on the card's child using `scale`.
export const SIZE_ID = "masonry-size";

// `create(placement)` builds a new card; `attach(node, placement)` attaches the observer and shared style when a card enters the yard (new or from the
// queue); `detach(id, node, queue)` removes a card from the DOM, keeping it in `queue` if it can be reused; `waitColors(card)` the 4 colors of the
// placeholder card's wait layer; `masonry` is the yard's item option (`itemSelector`, `getId`).
export function createMasonryHost(root, { create, attach = () => {}, detach, waitColors, masonry = {},
  deviceMemory = globalThis.navigator?.deviceMemory } = {}) {
  const { itemSelector = ".masonry-card", getId = (node) => node.dataset.masonryCard } = masonry;
  // The yard's items as Outlayer found them: a root child matching the selector, or matching descendants of a child. A page
  // without this yard (no related grid on a list page) has no root and no items.
  const items = () => [...(root?.children ?? [])].flatMap((child) => (child.matches(itemSelector) ? [child] : [...child.querySelectorAll(itemSelector)]));
  // Running slides and size morphs, kept in a set: scanning getAnimations() between left/top writes forces a style update per card.
  const motions = new Set();
  const cancelMotions = (keep = () => false) => motions.forEach((animation) => {
    if (keep(animation)) return;
    motions.delete(animation);
    animation.cancel();
  });
  const host = {
    root,
    // Cards currently in the DOM and their coordinates by id.
    rendered: new Map(),
    positions: new Map(),
    // The media currently shown on a multi-media card: a rebuilt card opens that same media.
    mediaById: new Map(),
    ghosts: createGhostLayer(root),
    budget: createMountBudget(),
    // Cards just detached whose image is still decoding, capacity by machine RAM (R7, V4).
    detached: createDetachedCards(detachedCapacity(deviceMemory)),
    ghostFrame: 0,
    idleTask: 0,
    // Yard height from layout, written as the root height by a motion pass.
    pixelHeight: 0,
    // rAF before the motion pass and a scheduled end of the pass.
    motionFrame: 0,
    motionTimer: 0,
    items,
    // Register a slide or size morph so it can be cancelled and timed without scanning the DOM.
    track(animation) {
      motions.add(animation);
      const drop = () => motions.delete(animation);
      animation.finished.then(drop, drop);
      return animation;
    },
    // Time left of the running slides and size morphs.
    remainingMotion() {
      let remaining = 0;
      for (const animation of motions) {
        if (animation.playState !== "running") continue;
        remaining = Math.max(remaining, animation.effect.getComputedTiming().endTime - (Number(animation.currentTime) || 0));
      }
      return remaining;
    },
    // One layout motion pass: cards slide from where they stand (inline left/top) to `positions` over 0.4 s; `instant(element)`
    // places directly. Positions are written for every item first, then the slides start, so no write sits between two reads.
    layoutMotion(instant) {
      root.style.height = `${host.pixelHeight}px`;
      cancelMotions((animation) => animation.id !== SLIDE_ID);
      const moves = [];
      for (const element of items()) {
        const to = host.positions.get(getId(element)) || { x: 0, y: 0 };
        const { left, top } = element.style;
        const from = left.endsWith("px") && top.endsWith("px") ? { x: parseFloat(left), y: parseFloat(top) } : null;
        const x = `${to.x}px`;
        const y = `${to.y}px`;
        if (left !== x) element.style.left = x;
        if (top !== y) element.style.top = y;
        // Under half a pixel is not a move: the browser hands inline left/top back rounded to 3 decimals, so a card seeded at its
        // exact target reads back a few thousandths off.
        if (!from || instant(element) || Math.hypot(from.x - to.x, from.y - to.y) < 0.5) continue;
        moves.push([element, from.x - to.x, from.y - to.y]);
      }
      for (const [element, dx, dy] of moves) {
        host.track(element.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { id: SLIDE_ID, duration: DUR.card, easing: "ease" }));
      }
    },
    // Stop running slides and size morphs: each card stands at its target at once (left/top already hold it).
    cancelTransitions: () => cancelMotions(),
    // Cancel the scheduled motion pass (rAF and scheduled end) then place cards right at the target.
    stopMotion() {
      if (host.motionFrame) cancelAnimationFrame(host.motionFrame);
      if (host.motionTimer) clearTimeout(host.motionTimer);
      host.motionFrame = 0;
      host.motionTimer = 0;
      host.cancelTransitions();
    },
    // Placeholder cards still waiting to build: schedule a build pass on the next frame, do not build all in one frame.
    scheduleGhosts(render) {
      host.ghostFrame ||= requestAnimationFrame(() => {
        host.ghostFrame = 0;
        render();
      });
    },
    // Only placeholder cards off screen remain: build them when the main thread is idle, yielding to input (loading-glass R10). The pass
    // `render({ idle: true })` does not measure the frame clock.
    scheduleIdle(render) {
      if (host.ghostFrame || host.idleTask) return;
      const run = () => {
        host.idleTask = 0;
        if (!document.hidden) render({ idle: true });
      };
      host.idleTask = globalThis.requestIdleCallback ? requestIdleCallback(run, { timeout: 500 }) : -setTimeout(run, 50);
    },
    cancelGhosts() {
      if (host.ghostFrame) cancelAnimationFrame(host.ghostFrame);
      host.ghostFrame = 0;
      if (host.idleTask > 0) cancelIdleCallback(host.idleTask);
      else if (host.idleTask < 0) clearTimeout(-host.idleTask);
      host.idleTask = 0;
    },
    pickMounts: ({ missing, mustMount, meets, distance, jump }) => pickMounts({
      missing, mustMount, meets, distance, jump, queued: (id) => host.detached.has(id), quota: host.budget.quota,
    }),
    // Build zone beyond each viewport edge for this frame (advertising-masonry R7), shared by both yards.
    zone: (viewportHeight, cardsPerViewport, step) => host.budget.zone({ viewportHeight, cardsPerViewport, capacity: host.detached.capacity, step }),
    // The placement's card: if built return the node; otherwise reattach from the queue or build new, then attach to `parent`.
    ensure(placement, parent = root) {
      const id = placement.card.id;
      let node = host.rendered.get(id);
      if (node) return node;
      node = host.detached.take(id) || create(placement);
      host.rendered.set(id, node);
      attach(node, placement);
      parent.append(node);
      return node;
    },
    // One build pass of the scroll window: existing cards drop their placeholder; cards not yet their turn (`allowed`) show a placeholder; cards whose
    // turn has come reattach or build new, crossfading over their placeholder. Build time counts against the budget; if placeholders remain,
    // schedule `render` on the next frame when one meets the viewport (`meets`), otherwise when idle. Returns the `[node, placement]` pairs that
    // just entered the yard.
    mount(placements, { allowed = null, render, meets = () => true, idle = false } = {}) {
      const created = [];
      const fragment = document.createDocumentFragment();
      let mountMs = 0;
      let fresh = 0;
      for (const placement of placements) {
        const id = placement.card.id;
        if (host.rendered.has(id)) {
          host.ghosts.drop(id);
          continue;
        }
        if (allowed && !allowed.has(id)) {
          host.ghosts.show(id, placement, () => waitColors(placement.card));
          continue;
        }
        const start = performance.now();
        const reattached = host.detached.has(id);
        const node = host.ensure(placement, fragment);
        // A reattached card already has its image so it needs no placeholder to crossfade.
        if (reattached) host.ghosts.drop(id);
        else {
          node.masonryGhost = host.ghosts.take(id);
          fresh += 1;
        }
        mountMs += performance.now() - start;
        created.push([node, placement]);
      }
      if (created.length) {
        const start = performance.now();
        root.append(fragment);
        host.budget.record(created.length, mountMs + performance.now() - start, fresh, { idle });
      }
      const waiting = render ? placements.filter((placement) => host.ghosts.has(placement.card.id)) : [];
      // While scrolling there is no idle time: zone ghosts would still wait when they reach the viewport, so they build on frames too.
      if (waiting.some(meets) || (waiting.length && host.budget.moving())) host.scheduleGhosts(render);
      else if (waiting.length) host.scheduleIdle(render);
      return created;
    },
    // Remove cards outside `keep`, except the card holding focus; `queue` false means do not keep them in the queue (geometry or range changed).
    release(keep, { queue = true } = {}) {
      for (const [id, node] of host.rendered) {
        if (keep.has(id) || node.contains(document.activeElement)) continue;
        detach(id, node, queue ? host.detached : null);
        host.rendered.delete(id);
      }
    },
  };
  return host;
}
