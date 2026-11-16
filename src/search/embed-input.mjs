// Single source of the Workers AI embedding call format: the index script, the Worker and calibration all import it.
export const MODEL = "@cf/google/embeddinggemma-2";
export const DIMS = 256;
export const TEXT_BATCH = 16;

const labelsOf = (ids, list, pick = () => true) =>
  ids.flatMap((id) => {
    const entry = list.find((item) => item.id === id);
    return entry && pick(entry) ? [entry.labelVi, entry.labelEn] : [];
  });

export const cardMedia = (card) => card.mediaItems ?? [card.media];

export function documentText(card, artifact) {
  const media = cardMedia(card);
  const parts = [
    card.descriptionVi, card.titleEn, card.descriptionEn, ...media.map((m) => m.altVi), ...media.map((m) => m.altEn),
    ...labelsOf(card.productIds, artifact.products),
    ...labelsOf(card.clusterIds, artifact.clusters),
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

export function modelRequest(inputs) {
  const messages = inputs.map((input) => {
    if (typeof input === "string") return [{ role: "user", content: [{ type: "text", text: input }] }];
    const content = [{ type: "image_url", image_url: { url: input.image } }];
    if (input.text) content.push({ type: "text", text: input.text });
    return [{ role: "user", content }];
  });
  return { messages, dimensions: DIMS };
}

// `result` is the model output; REST callers pass body.result.
export function readVectors(result, expected) {
  const vectors = result.data.map((item) => item.embedding);
  if (vectors.length !== expected || vectors.some((v) => v.length !== DIMS)) {
    throw new Error(`model returned ${vectors.length} vectors (expected ${expected} of ${DIMS} dims)`);
  }
  return vectors;
}
