// Pure ranking and input merging for advertising search (spec R5). No DOM, no fetch, no config import.
const TOP = 5;
// 0.7 * 0.6 is 0.41999999999999993 in floating point, so a threshold compare needs a tolerance.
const EPS = 1e-9;

// scores: [id, sText, sMedia][] of one input; kind picks the weight row. Image weights have no `k`.
// A keyword card missing from the Worker answer (an index older than the page) still scores by K alone.
function inputScores({ kind, scores }, keyword, weights) {
  const w = weights[kind];
  const map = new Map(scores.map(([id, sText, sMedia]) => [id, w.sText * sText + w.sMedia * sMedia + (w.k ?? 0) * (keyword.get(id) ?? 0)]));
  if (w.k) for (const [id, k] of keyword) if (!map.has(id)) map.set(id, w.k * k);
  return map;
}

function groupName(ids, productOf) {
  const counts = new Map();
  for (const id of ids.slice(0, TOP)) counts.set(productOf(id), (counts.get(productOf(id)) ?? 0) + 1);
  let best;
  for (const [product, n] of counts) if (!best || n > best[1]) best = [product, n];
  return best?.[0];
}

export function rankSearch({ inputs, keyword = new Map(), config, catalogOrder, productOf }) {
  const { threshold, groupTextWeight, keywordMin = Infinity, textRelativeMin = 0 } = config;
  const order = new Map(catalogOrder.map((id, i) => [id, i]));
  const sortIds = (ids, score) => [...ids].sort((a, b) => score.get(b) - score.get(a) || (order.get(a) ?? order.size) - (order.get(b) ?? order.size));
  // A card whose words match the text (K from keywordMin) always passes with a text input: weighted at 0.2 K alone it fell
  // under the threshold whenever the vectors missed it, so typed words like "kios" lost cards the keyword fallback had shown.
  // Text alone, once the keyword layer found the words, also cuts the vector tail under textRelativeMin of the best card: without it
  // "biển phòng ban" listed 48 cards, most of them other office signs. A described need ("quán mới cần bảng hiệu sáng đèn") has no
  // keyword match and keeps the plain threshold (2026-11-18 review over 157 queries: precision 0.76 -> 0.89, recall 0.84 -> 0.82).
  const anchored = [...keyword.values()].some((k) => k >= keywordMin);
  const passing = (score, withText, textOnly = false) => {
    const floor = Math.max(threshold, textOnly && anchored ? Math.max(0, ...score.values()) * textRelativeMin : 0) - EPS;
    return sortIds([...score.keys()].filter((id) => score.get(id) >= floor
      || (withText && (keyword.get(id) ?? 0) >= keywordMin)), score);
  };

  const scored = inputs.map((input) => inputScores(input, keyword, config.weights));
  const live = [];
  const unmatched = [];
  scored.forEach((score, i) => {
    if (!passing(score, inputs[i].kind === "text", inputs[i].kind === "text").length) return unmatched.push(i);
    // Top 5 ignores the threshold (spec R5.2) but not zeros: clamped-to-0 cards would tie and link unrelated inputs by catalog order.
    live.push({ i, top: new Set(sortIds([...score.keys()].filter((id) => score.get(id) > 0), score).slice(0, TOP)) });
  });

  const parent = inputs.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  live.forEach((a, n) => live.slice(n + 1).forEach((b) => {
    if ([...a.top].filter((id) => b.top.has(id)).length >= 2) parent[find(a.i)] = find(b.i);
  }));
  const members = new Map();
  for (const { i } of live) members.set(find(i), [...(members.get(find(i)) ?? []), i]);

  const groups = [...members.values()].map((inputIdx) => {
    const maps = (kind) => inputIdx.filter((i) => inputs[i].kind === kind).map((i) => scored[i]);
    const [texts, images] = [maps("text"), maps("image")];
    const best = (list, id) => Math.max(...list.map((m) => m.get(id) ?? 0));
    const score = new Map([...new Set(inputIdx.flatMap((i) => [...scored[i].keys()]))].map((id) => [id,
      texts.length && images.length ? groupTextWeight * best(texts, id) + (1 - groupTextWeight) * best(images, id) : best(texts.length ? texts : images, id)]));
    const ids = passing(score, texts.length > 0, texts.length > 0 && !images.length);
    return { ids, score, inputIdx, top: score.get(ids[0]) };
  }).sort((a, b) => b.top - a.top || a.inputIdx[0] - b.inputIdx[0]);

  let ids = groups[0]?.ids ?? [];
  if (groups.length > 1) {
    const hits = new Map(); // id -> its score in each group where it passes
    for (const g of groups) for (const id of g.ids) hits.set(id, [...(hits.get(id) ?? []), g.score.get(id)]);
    const mean = new Map([...hits].filter(([, list]) => list.length > 1).map(([id, list]) => [id, list.reduce((x, y) => x + y) / list.length]));
    const shared = sortIds(mean.keys(), mean);
    const placed = new Set(shared);
    const queues = groups.map((g) => g.ids.filter((id) => !placed.has(id)));
    ids = [...shared];
    for (let r = 0; queues.some((q) => r < q.length); r++) for (const q of queues) if (r < q.length) ids.push(q[r]);
  }
  return {
    ids,
    groups: groups.map(({ ids: gIds, inputIdx }) => ({ name: groupName(gIds, productOf), ids: gIds, inputIdx })),
    unmatched,
  };
}

// A group whose cards span 3+ main products is too generic: offer up to 4 products by card count.
export function suggestProducts({ ids }, productOf) {
  const counts = new Map();
  for (const id of ids) counts.set(productOf(id), (counts.get(productOf(id)) ?? 0) + 1);
  return counts.size < 3 ? [] : [...counts].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([product]) => product);
}

export function keywordOnly(keyword, catalogOrder, { keywordMin }) {
  return catalogOrder.filter((id) => (keyword.get(id) ?? 0) >= keywordMin).sort((a, b) => keyword.get(b) - keyword.get(a));
}
