// Worker vẽ Flow của khung card trên OffscreenCanvas: rAF của worker không chờ main thread, nên khi vuốt nhanh
// main thread bận masonry thì gradient vẫn chạy đều. Ảnh tĩnh của khung cũng render ở đây (advertising-skeleton R8).
import { createSkeletonFlowRenderer, skeletonFlowStill } from "./skeleton-flow.mjs";

const renderers = new Map();
onmessage = ({ data: { id, type, canvas, options } }) => {
  if (type === "still") {
    postMessage({ id, still: skeletonFlowStill(options.preset, options.phase) });
    return;
  }
  if (type === "create") {
    const renderer = createSkeletonFlowRenderer(canvas, options);
    renderers.set(id, renderer);
    if (renderer?.backend !== "webgl") postMessage({ id, backend: "fallback" });
    return;
  }
  // draw, start, stop, destroy gọi thẳng method cùng tên của renderer.
  renderers.get(id)?.[type]?.(performance.now());
  if (type === "destroy") renderers.delete(id);
};
