// Compile layout grid ngoài main thread (catalog-runtime prewarmGeometry); lỗi trả null để main compile đồng bộ.
import { compileAdvertisingProductLayout } from "./layout-core.mjs";

onmessage = ({ data }) => {
  try {
    postMessage(compileAdvertisingProductLayout(data));
  } catch {
    postMessage(null);
  }
};
