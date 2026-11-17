// Scores one query vector against every card of the decoded index (advertising-search R3).
import { DIMS } from "./embed-input.mjs";

// A collapsed pair (hi <= lo) scores 0 instead of NaN.
export const normalize = (x, [lo, hi]) => (hi > lo ? Math.min(1, Math.max(0, (x - lo) / (hi - lo))) : 0);
const round3 = (x) => Math.round(x * 1000) / 1000;

const cosine = (query, q, s) => {
  let sum = 0;
  for (let i = 0; i < DIMS; i++) sum += q[i] * query[i];
  return s * sum;
};

// queryVec is L2-normalized; returns [id, sText, sMedia] per card. sMedia is the mean of the two best media.
export function scoreInput(queryVec, kind, index, anchors) {
  const textPair = anchors[`${kind}-text`];
  const imagePair = anchors[`${kind}-image`];
  return index.cards.map((card) => {
    let best = 0;
    let second = 0;
    for (const { q, s } of card.media) {
      const x = normalize(cosine(queryVec, q, s), imagePair);
      if (x > best) [best, second] = [x, best];
      else if (x > second) second = x;
    }
    const n = card.media.length;
    const sMedia = n === 0 ? 0 : n === 1 ? best : (best + second) / 2;
    return [card.id, round3(normalize(cosine(queryVec, card.text, card.ts), textPair)), round3(sMedia)];
  });
}
