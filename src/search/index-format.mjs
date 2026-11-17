// Index file format (plan 0.4): a JSON meta plus a .bin of int8 vectors, DIMS bytes each, in `row` order.
import { DIMS, MODEL } from "./embed-input.mjs";

export const unit = (vec) => {
  const norm = Math.hypot(...vec) || 1;
  return vec.map((x) => x / norm);
};

// cosine(query, vector) = s * sum(q_i * query_i) with the stored vector treated as length 1.
export function quantize(vec) {
  const v = unit(vec);
  const s = Math.max(...v.map(Math.abs)) / 127 || 1;
  return { q: Int8Array.from(v, (x) => Math.round(x / s)), s };
}

// entries: [{ id, text: float[], media: float[][] }]
export function encodeIndex(entries, builtAt = new Date().toISOString()) {
  const rows = [];
  const add = (vec) => {
    const { q, s } = quantize(vec);
    rows.push(q);
    return { row: rows.length - 1, s };
  };
  const cards = entries.map(({ id, text, media }) => ({ id, text: add(text), media: media.map(add) }));
  const bin = new Int8Array(rows.length * DIMS);
  rows.forEach((q, i) => bin.set(q, i * DIMS));
  return { meta: { model: MODEL, dims: DIMS, status: "ok", builtAt, cards }, bin };
}

export const unavailableMeta = (builtAt = new Date().toISOString()) =>
  ({ model: MODEL, dims: DIMS, status: "unavailable", builtAt, cards: [] });

// Views into the buffer, no copies.
export function decodeIndex(meta, arrayBuffer) {
  const view = ({ row, s }) => ({ q: new Int8Array(arrayBuffer, row * DIMS, DIMS), s });
  return {
    cards: meta.cards.map(({ id, text, media }) => {
      const { q, s } = view(text);
      return { id, text: q, ts: s, media: media.map(view) };
    }),
  };
}
