// Text search against /api/search with the keyword fallback (advertising-search R6) and the no-result, price and interior lines (R9).
import { keywordOnly, rankSearch, suggestProducts } from "../../search/rank.mjs";
import { keywordScores, plain, warmIndex } from "../../search/keywords.mjs";
import cfg from "../../search/score-config.json" with { type: "json" };

const PRICE = { vi: /(^| )(gia|bao nhieu|bao gia|chi phi)( |$)/, en: /\b(price|cost|how much|quote)\b/i };
const INTERIOR = {
  vi: ["tu bep", "tu ao", "giuong", "sofa", "ban an", "ke tivi", "noi that"],
  en: ["kitchen cabinet", "wardrobe", "bed", "sofa", "dining table", "tv cabinet", "interior"],
};
const sameIds = (a, b) => a.length === b.length && a.every((id, i) => id === b[i]);

// ui: { grid, artifact, locale, copy, zaloHref, setStatus(lines), toast(text), session }
export function createClient(ui) {
  const { grid, artifact, locale, copy } = ui;
  const order = artifact.cards.map((card) => card.id);
  const productOfMap = new Map(artifact.cards.map((card) => [card.id, card.productIds?.[0]]));
  const productOf = (id) => productOfMap.get(id);
  const productLabel = new Map((artifact.products ?? []).map((p) => [p.id, locale === "en" ? p.labelEn : p.labelVi]));
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

  const zalo = async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(lastText);
      copied = true;
    } catch {}
    window.open(ui.zaloHref, "_blank", "noreferrer");
    ui.toast(copied ? copy.zaloCopied : copy.zaloPaste);
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}${location.pathname}#tim=${encodeURIComponent(lastText)}`);
      ui.toast(copy.linkCopied);
    } catch {}
  };
  const zaloAction = (label) => ({ label, onClick: zalo });
  const extraLines = (count) => {
    const lines = [];
    const text = locale === "en" ? lastText : plain(lastText);
    if (PRICE[locale].test(text)) lines.push({ actions: [zaloAction(copy.price)] });
    if (count === 0 && INTERIOR[locale].some((term) => plain(lastText).includes(term))) {
      lines.push({ actions: [{ label: copy.projects, href: `/${locale}/projects/` }] });
    }
    return lines;
  };

  const show = (ids, ranked) => {
    grid.setResults(ids);
    inSearch = true;
    const lines = [{ text: copy.results(ids.length, lastText), actions: [{ label: copy.copyLink, onClick: copyLink }] }];
    const groups = ranked?.groups.filter((group) => group.ids.length) ?? [];
    const nameOf = (product) => productLabel.get(product) ?? product;
    if (groups.length > 1) {
      lines.push({ actions: groups.map((group) => ({ label: nameOf(group.name), onClick: () => grid.setResults(group.ids) })) });
    } else {
      const products = suggestProducts({ ids }, productOf);
      if (products.length) {
        lines.push({ actions: products.map((product) => ({
          label: nameOf(product), onClick: () => grid.setResults(ids.filter((id) => productOf(id) === product)),
        })) });
      }
    }
    if (ids.length <= 2) lines.push({ actions: [zaloAction(copy.few)] });
    ui.setStatus([...lines, ...extraLines(ids.length)]);
  };
  const finishEmpty = () => {
    grid.setPending(false);
    if (inSearch) {
      inSearch = false;
      grid.clearResults(); // its masonry:search-left carries reason "clear" and is ignored
    }
    ui.setStatus([{ text: copy.empty, actions: [zaloAction(copy.zalo)] }, ...extraLines(0)]);
  };

  async function submit(text) {
    text = text.trim().slice(0, 300);
    if (!text) return false;
    stop();
    const my = turn;
    lastText = text;
    if (ui.session.save({ text, images: [] }) === "quota") ui.toast(copy.quota);
    const keyword = keywordScores(text, locale, artifact);
    if ([...text].length <= 2) {
      const ids = keywordOnly(keyword, order, cfg);
      ids.length ? show(ids, null) : finishEmpty();
      return true;
    }
    grid.setPending(true);
    ui.setStatus([{ text: copy.searching }]);
    abort = new AbortController();
    let shown = null;
    timers.push(setTimeout(() => {
      if (my !== turn) return;
      const ids = keywordOnly(keyword, order, cfg);
      if (ids.length) {
        shown = ids;
        show(ids, null);
      } else {
        timers.push(setTimeout(() => my === turn && (stop(), finishEmpty()), cfg.timing.imageWaitMs - cfg.timing.textWaitMs));
      }
    }, cfg.timing.textWaitMs));
    let data = null;
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, images: [] }),
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
      if (!shown) ids.length ? show(ids, null) : finishEmpty();
      return true;
    }
    const ranked = rankSearch({ inputs: data.inputs, keyword, config: cfg, catalogOrder: order, productOf });
    if (shown) {
      if (ranked.ids.length && !sameIds(ranked.ids, shown)) grid.offerResults(ranked.ids);
    } else {
      ranked.ids.length ? show(ranked.ids, ranked) : finishEmpty();
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
    ui.setStatus([]);
  };
  return { submit, cancel, reset, stop, warm, get active() { return Boolean(lastText); } };
}
