// Compile layout ngoài main thread (catalog-runtime compileInWorker). Lỗi compile trả lại để main ném lại y như
// compile đồng bộ; lỗi clone hay load thì main compile đồng bộ.
import { compileAdvertisingProductLayout } from "./layout-core.mjs";

onmessage = ({ data }) => {
  try {
    postMessage({ layout: compileAdvertisingProductLayout(data) });
  } catch (error) {
    postMessage({ error: { message: error?.message, code: error?.code, diagnostic: error?.diagnostic } });
  }
};
