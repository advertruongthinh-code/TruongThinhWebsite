// Masonry yard (masonry-reuse step 7): state built from one grid's scroll window. The main masonry (Advertising, Projects)
// and the related one in detail are two instances, so the build budget, placeholder cards and LRU queue are written only once (advertising-masonry R7).
import { createDetachedCards, createGhostLayer, createMountBudget, detachedCapacity } from "./mount-budget.mjs";

// Which cards are really built this frame: required cards always build; the rest are queued cards first (reattaching is cheaper than
// building new), then those nearest the screen center first, up to `quota` cards. A very fast swipe (`fast`) builds only required cards.
export function pickMounts({ missing, mustMount = () => false, distance, queued = () => false, fast = false, quota }) {
  const forced = missing.filter(mustMount);
  const rest = missing.filter((id) => !mustMount(id))
    .sort((a, b) => (queued(b) - queued(a)) || distance(a) - distance(b));
  return new Set([...forced, ...rest.slice(0, fast ? 0 : quota())]);
}

// Masonry 4.2.2 only handles motion: positions come from the computed `positions`, it does not place cards itself or lay out on resize.
function createMasonry(grid, positions, getHeight, { itemSelector = ".masonry-card", getId = (node) => node.dataset.masonryCard } = {}) {
  const masonry = new window.Masonry(grid, {
    itemSelector,
    initLayout: false,
    resize: false,
    transitionDuration: "0.4s",
    stagger: 0,
  });
  masonry._getItemLayoutPosition = (item) => positions.get(getId(item.element)) || { x: 0, y: 0 };
  masonry._getContainerSize = () => ({ height: getHeight() });
  // Outlayer reads the initial position with getComputedStyle then writes a transition for each card, so each card forces a style pass
  // (Masonry rAF 46-66ms on the A04s). The runtime already writes left/top inline in px; motion runs only on transform so
  // inline matches computed. A card without an inline position is still read from computed as before.
  const itemize = masonry._itemize;
  masonry._itemize = function (elements) {
    const items = itemize.call(this, elements);
    for (const item of items) {
      const readComputed = item.getPosition;
      item.getPosition = function () {
        const { left, top } = this.element.style;
        if (!left.endsWith("px") || !top.endsWith("px")) return readComputed.call(this);
        this.position.x = parseFloat(left) - this.layout.size.paddingLeft;
        this.position.y = parseFloat(top) - this.layout.size.paddingTop;
      };
    }
    return items;
  };
  return masonry;
}

// The card size morph (morphSize) runs on the card's child using `scale`.
export const isSizeMorph = (animation) => Boolean(animation.effect?.getKeyframes?.()[0]?.scale);

// Stop the running Masonry transition and size morph, placing the card at its target right away.
export function cancelMasonryTransitions(instance) {
  instance?.items.forEach((item) => {
    for (const child of item.element.children) child.getAnimations().forEach((animation) => isSizeMorph(animation) && animation.cancel());
    item.disableTransition();
    item._transn.ingProperties = {};
    item._transn.clean = {};
    item._transn.onEnd = {};
    item.element.style.transform = "";
    item.layoutPosition();
  });
}

// `create(placement)` builds a new card; `attach(node, placement)` attaches the observer and shared style when a card enters the yard (new or from the
// queue); `detach(id, node, queue)` removes a card from the DOM, keeping it in `queue` if it can be reused; `color(card)` is the
// placeholder card color; `masonry` is the yard's own Masonry option (`itemSelector`, `getId`).
export function createMasonryHost(root, { create, attach = () => {}, detach, color = () => undefined, masonry = {},
  deviceMemory = globalThis.navigator?.deviceMemory } = {}) {
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
    // Yard height from layout; Masonry reads it as the container size.
    pixelHeight: 0,
    // Masonry only runs layout motion; created on first need. rAF before the motion pass and a scheduled end of the pass.
    masonry: null,
    motionFrame: 0,
    motionTimer: 0,
    // One layout motion pass: cards slide from where they stand to `positions` over 0.4s; `instant(element)` places directly.
    layoutMotion(instant) {
      host.masonry ||= createMasonry(root, host.positions, () => host.pixelHeight, masonry);
      // Without this option Outlayer treats the first layout as instant: the first build loses motion from the column start.
      host.masonry.options.layoutInstant = false;
      host.masonry.options.transitionDuration = "0.4s";
      host.masonry.reloadItems();
      host.masonry.items.forEach((item) => { item.isLayoutInstant = instant(item.element); });
      host.masonry.layout();
    },
    cancelTransitions: () => cancelMasonryTransitions(host.masonry),
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
    cancelGhosts() {
      if (host.ghostFrame) cancelAnimationFrame(host.ghostFrame);
      host.ghostFrame = 0;
    },
    pickMounts: ({ missing, mustMount, distance, fast }) => pickMounts({
      missing, mustMount, distance, fast, queued: (id) => host.detached.has(id), quota: host.budget.quota,
    }),
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
    // turn has come reattach or build new, crossfading over their placeholder. Build time counts against the budget; if placeholders remain, schedule
    // `render` on the next frame. Returns the `[node, placement]` pairs that just entered the yard.
    mount(placements, { allowed = null, render } = {}) {
      const created = [];
      const fragment = document.createDocumentFragment();
      let mountMs = 0;
      for (const placement of placements) {
        const id = placement.card.id;
        if (host.rendered.has(id)) {
          host.ghosts.drop(id);
          continue;
        }
        if (allowed && !allowed.has(id)) {
          host.ghosts.show(id, placement, color(placement.card));
          continue;
        }
        const start = performance.now();
        const reattached = host.detached.has(id);
        const node = host.ensure(placement, fragment);
        // A reattached card already has its image so it needs no placeholder to crossfade.
        if (reattached) host.ghosts.drop(id);
        else node.masonryGhost = host.ghosts.take(id);
        mountMs += performance.now() - start;
        created.push([node, placement]);
      }
      if (created.length) {
        const start = performance.now();
        root.append(fragment);
        host.budget.record(created.length, mountMs + performance.now() - start);
      }
      if (render && placements.some((placement) => host.ghosts.has(placement.card.id))) host.scheduleGhosts(render);
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
