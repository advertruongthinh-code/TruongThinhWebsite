// Layout off the main thread. A message with `pack` packs one candidate base order `s` of the main grid (packCandidate) and answers
// { id, candidate }; the runtime runs the candidates of one job in parallel Workers and keeps the best (bestEntries). Any other message
// compiles a related layout (catalog-runtime compileInWorker). A compile error is returned so main rethrows it exactly like a
// synchronous compile; a clone or load failure makes main compile synchronously.
import { compileMasonryLayout } from "./layout.mjs";
import { packCandidate } from "./pack.mjs";

onmessage = ({ data }) => {
  if (data?.pack) {
    try {
      postMessage({ id: data.id, candidate: packCandidate(data.pack, data.s) });
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
