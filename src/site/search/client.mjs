// Text search against /api/search with the keyword fallback (advertising-search R6). Results go to the grid only (R9).
import { keywordOnly, rankSearch } from "../../search/rank.mjs";
import { keywordScores, modelQuery, plain, warmIndex } from "../../search/keywords.mjs";
import cfg from "../../search/score-config.json" with { type: "json" };

const sameIds = (a, b) => a.length === b.length && a.every((id, i) => id === b[i]);

// ui: { grid, artifact, locale, copy, announce(text), session, signal }
export function createClient(ui) {
  const { grid, artifact, locale, copy } = ui;
  const order = artifact.cards.map((card) => card.id);
  const productOfMap = new Map(artifact.cards.map((card) => [card.id, card.productIds?.[0]]));
  const productOf = (id) => productOfMap.get(id);
  let turn = 0;
  let abort;
  let timers = [];
  let inSearch = false;
  let lastText = "";

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };
  const stop = () => {
    ++turn;
    abort?.abort();
    clearTimers();
  };

  const show = (ids) => {
    grid.setResults(ids);
    inSearch = true;
    ui.announce(copy.results(ids.length, lastText));
  };
  const finishEmpty = () => {
    grid.setPending(false);
    if (inSearch) {
      inSearch = false;
      grid.clearResults(); // its masonry:search-left carries reason "clear" and is ignored
    }
    ui.announce(copy.empty);
  };

  async function submit(text) {
    text = text.trim().slice(0, 300);
    if (!text) return false;
    stop();
    const my = turn;
    lastText = text;
    ui.session.save({ text, images: [] });
    const keyword = keywordScores(text, locale, artifact);
    if ([...text].length <= 2) {
      const ids = keywordOnly(keyword, order, cfg);
      ids.length ? show(ids) : finishEmpty();
      return true;
    }
    grid.setPending(true);
    ui.announce(copy.searching);
    abort = new AbortController();
    let shown = null;
    timers.push(setTimeout(() => {
      if (my !== turn) return;
      const ids = keywordOnly(keyword, order, cfg);
      if (ids.length) {
        shown = ids;
        show(ids);
      } else {
        timers.push(setTimeout(() => my === turn && (stop(), finishEmpty()), cfg.timing.imageWaitMs - cfg.timing.textWaitMs));
      }
    }, cfg.timing.textWaitMs));
    let data = null;
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: modelQuery(text, locale, artifact), images: [] }),
        signal: abort.signal,
      });
      data = response.ok ? await response.json() : null;
    } catch (error) {
      if (error?.name === "AbortError") return true;
    }
    if (my !== turn) return true;
    clearTimers();
    if (data?.status !== "ok") {
      const ids = shown ?? keywordOnly(keyword, order, cfg);
      if (!shown) ids.length ? show(ids) : finishEmpty();
      return true;
    }
    const ranked = rankSearch({ inputs: data.inputs, keyword, config: cfg, catalogOrder: order, productOf });
    if (shown) {
      if (ranked.ids.length && !sameIds(ranked.ids, shown)) grid.offerResults(ranked.ids);
    } else {
      ranked.ids.length ? show(ranked.ids) : finishEmpty();
    }
    return true;
  }

  // Build the keyword index in idle slices once the visitor reaches for the bar, so the first Enter is not one long task.
  let warming = null;
  const warm = () => {
    if (warming) return;
    warming = warmIndex(artifact, locale);
    const idle = window.requestIdleCallback ?? ((fn) => setTimeout(() => fn({ timeRemaining: () => 8 }), 16));
    const step = (deadline) => {
      while (deadline.timeRemaining() > 4) {
        if (ui.signal?.aborted) return;
        // One small query after the build compiles the scoring path, so the first real search runs warm code too.
        if (warming.next().done) return keywordScores("hop den", locale, artifact);
      }
      idle(step);
    };
    idle(step);
  };

  // Typing during a request cancels it; search runs only on Enter or the button (no search-as-you-type in the spec).
  const cancel = () => {
    if (!abort || abort.signal.aborted) return;
    stop();
    grid.setPending(false);
  };
  // Leave search: the grid already left (filter, history) or is told to (Esc, close).
  const reset = () => {
    stop();
    inSearch = false;
    lastText = "";
    ui.session.clear();
    ui.announce("");
  };
  return { submit, cancel, reset, stop, warm, get active() { return Boolean(lastText); } };
}
