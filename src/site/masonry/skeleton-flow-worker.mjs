// Worker that draws the card frame's Flow on an OffscreenCanvas: the worker's rAF does not wait for the main thread, so during a fast swipe
// while the main thread is busy with masonry, the gradient still runs smoothly (advertising-skeleton R8).
import { createSkeletonFlowRenderer, createSkeletonFlowSharedRenderer } from "./skeleton-flow.mjs";

const renderers = new Map();
onmessage = ({ data: { id, type, canvas, options } }) => {
  if (type === "create") {
    const renderer = (options.shared ? createSkeletonFlowSharedRenderer : createSkeletonFlowRenderer)(canvas, options);
    renderers.set(id, renderer);
    if (renderer?.backend !== "webgl") postMessage({ id, backend: "fallback" });
    return;
  }
  // draw, start, stop, destroy call the renderer's method of the same name directly.
  renderers.get(id)?.[type]?.(performance.now());
  if (type === "destroy") renderers.delete(id);
};
