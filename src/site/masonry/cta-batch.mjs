import { createGlassSurface } from "./glass-surface.mjs";

// The CTA batch (skeleton frame, text cluster, Kính arc) is one set of nodes moving between masonry yards: the grid, and the end-of-related canvas in
// detail (advertising-cta-center-parallax R9). Every query and observer is computed from the batch root, not from wherever it currently sits,
// so it follows the same rules in any yard (masonry-reuse step 3.6).
export function createCtaBatch({ skeleton, cluster, arcHome, signal, rearm }) {
  const arc = arcHome?.appendChild(Object.assign(createGlassSurface("arc"), { hidden: true }));
  let rearmPending = false;
  signal?.addEventListener("abort", () => arc?.remove(), { once: true });
  const batch = {
    skeleton,
    cluster,
    arc,
    get host() { return skeleton?.dataset.masonryCtaHost; },
    // Attach the node set to a new yard. `replay`: text and buttons rerun the in-view motion after the next placement, because before that the cluster
    // sat at the top of the yard, inside the viewport, so the in-view observer fired early. Without replay, keep the revealed state, even if
    // the old yard is left before the batch got to place itself there.
    attach(host, { skeletonParent, clusterParent, replay = false }) {
      if (!skeleton || batch.host === host) return;
      rearmPending = replay;
      skeletonParent.append(skeleton);
      clusterParent?.append(...[cluster, arc].filter(Boolean));
      // Variables set directly on the cluster belong to the old yard; the new yard sets them again when the batch is built.
      cluster?.style.removeProperty("--masonry-cta-top");
      cluster?.style.removeProperty("--masonry-gap");
      // The cluster has no top until the next batch build: hide it so it does not show at the top of the yard.
      if (replay) cluster?.style.setProperty("visibility", "hidden");
      else cluster?.style.removeProperty("visibility");
      skeleton.dataset.masonryCtaHost = host;
    },
    // The yard's content changes while the batch keeps its yard (detail image change): rerun the in-view motion after the next placement.
    rearmOnPlace() { rearmPending = true; },
    // The batch has just been placed at its real position.
    placed() {
      if (!rearmPending || !cluster) return;
      rearmPending = false;
      rearm?.(cluster);
    },
    clear() {
      if (!skeleton) return;
      skeleton.hidden = true;
      skeleton.replaceChildren();
      cluster?.style.removeProperty("--masonry-cta-tail-height");
      if (arc) arc.hidden = true;
      delete skeleton.dataset.masonryCtaColumns;
      delete skeleton.dataset.masonryCtaReady;
      delete skeleton.dataset.masonryCtaSignature;
    },
  };
  return batch;
}
