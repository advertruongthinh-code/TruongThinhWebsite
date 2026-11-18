// Single source of the Workers AI embedding call format: the index script, the Worker and calibration all import it.
export const MODEL = "@cf/google/embeddinggemma-2";
export const DIMS = 256;
// Per-call input counts proven by the 2026-11-16 trial.
export const TEXT_BATCH = 50;
export const IMAGE_BATCH = 8;

const labelsOf = (ids, list, pick = () => true) =>
  ids.flatMap((id) => {
    const entry = list.find((item) => item.id === id);
    return entry && pick(entry) ? [entry.labelVi, entry.labelEn] : [];
  });

export const cardMedia = (card) => card.mediaItems ?? [card.media];

// No cluster label: one cluster names three products ("Bảng hiệu, chữ nổi & hộp đèn") and pulled every card of it toward each.
export function documentText(card, artifact) {
  const media = cardMedia(card);
  const parts = [
    card.descriptionVi, card.titleEn, card.descriptionEn, ...media.map((m) => m.altVi), ...media.map((m) => m.altEn),
    ...labelsOf(card.productIds, artifact.products),
    ...labelsOf(card.tagIds, artifact.tagRegistry, (tag) => tag.group === "product"),
  ];
  return `title: ${card.titleVi} | text: ${parts.join(" | ")}`;
}

export const queryText = (text) => `task: search result | query: ${text}`;

// An input is a string (text only) or { image, text }. Customer images pass an empty media.
export const mediaInput = (media, jpegBase64) => ({
  image: `data:image/jpeg;base64,${jpegBase64}`,
  text: [media.altVi, media.altEn].filter(Boolean).join(" | "),
});

// Text goes through `input`: the `messages` path gives different vectors (P@5 0.86 -> 0.66 in the 2026-11-17 measurement).
// Only images use `messages`. A request holds one kind: callers batch text and images separately.
export function modelRequest(inputs) {
  if (inputs.every((input) => typeof input === "string")) return { input: inputs, dimensions: DIMS };
  const messages = inputs.map((input) => {
    if (typeof input === "string") throw new Error("modelRequest: text and image inputs cannot share a request");
    const content = [{ type: "image_url", image_url: { url: input.image } }];
    if (input.text) content.push({ type: "text", text: input.text });
    return [{ role: "user", content }];
  });
  return { messages, dimensions: DIMS };
}

// `result` is the model output; REST callers pass body.result.
export function readVectors(result, expected) {
  const vectors = [...result.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((item) => item.embedding ?? item);
  if (vectors.length !== expected || vectors.some((v) => v.length !== DIMS)) {
    throw new Error(`model returned ${vectors.length} vectors (expected ${expected} of ${DIMS} dims)`);
  }
  return vectors;
}

// One Workers AI REST call (index build and calibration). Throws on HTTP errors; callers own retries.
export async function embedRest({ fetch = globalThis.fetch, token, account, signal }, inputs) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MODEL}`, {
    signal,
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(modelRequest(inputs)),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return readVectors((await res.json()).result, inputs.length);
}
