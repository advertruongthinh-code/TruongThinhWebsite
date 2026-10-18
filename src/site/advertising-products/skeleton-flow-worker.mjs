// Worker vẽ Flow của khung card trên OffscreenCanvas: rAF của worker không chờ main thread, nên khi vuốt nhanh
// main thread bận masonry thì gradient vẫn chạy đều (advertising-skeleton R8).
import { createSkeletonFlowRenderer } from "./skeleton-flow.mjs";

const renderers = new Map();
onmessage = ({ data: { id, type, canvas, options } }) => {
  if (type === "create") {
    const renderer = createSkeletonFlowRenderer(canvas, options);
    renderers.set(id, renderer);
    if (renderer?.backend !== "webgl") postMessage({ id, backend: "fallback" });
    return;
  }
  const renderer = renderers.get(id);
  if (type === "draw") renderer?.draw(performance.now());
  else if (type === "start") renderer?.start();
  else if (type === "stop") renderer?.stop();
  else if (type === "destroy") {
    renderer?.destroy();
    renderers.delete(id);
  }
};
