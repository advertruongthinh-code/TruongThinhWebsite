// Compile the layout off the main thread (catalog-runtime compileInWorker). A compile error is returned so main rethrows it exactly like a
// synchronous compile; a clone or load failure makes main compile synchronously.
import { compileMasonryLayout } from "./layout.mjs";

onmessage = ({ data }) => {
  try {
    postMessage({ layout: compileMasonryLayout(data) });
  } catch (error) {
    postMessage({ error: { message: error?.message, code: error?.code, diagnostic: error?.diagnostic } });
  }
};
