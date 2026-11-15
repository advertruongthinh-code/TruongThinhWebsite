// Layout off the main thread. A message with `pack` packs the main grid (packLive) and answers { id, entries }; any other message
// compiles a related layout (catalog-runtime compileInWorker). A compile error is returned so main rethrows it exactly like a
// synchronous compile; a clone or load failure makes main compile synchronously.
import { compileMasonryLayout } from "./layout.mjs";
import { packLive } from "./pack.mjs";

onmessage = ({ data }) => {
  if (data?.pack) {
    try {
      postMessage({ id: data.id, entries: packLive(data.pack) });
    } catch (error) {
      postMessage({ id: data.id, error: error?.message ?? "pack failed" });
    }
    return;
  }
  try {
    postMessage({ layout: compileMasonryLayout(data) });
  } catch (error) {
    postMessage({ error: { message: error?.message, code: error?.code, diagnostic: error?.diagnostic } });
  }
};
