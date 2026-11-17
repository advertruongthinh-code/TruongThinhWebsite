// Entry of the demo Worker: only /api/* reaches this script (run_worker_first in wrangler.static.toml).
// No console.*, no storage: queries and images live only in memory for the request (advertising-search R4).
import { MODEL, mediaInput, modelRequest, queryText, readVectors } from "./embed-input.mjs";
import { decodeIndex, unit } from "./index-format.mjs";
import { jpegSize } from "./jpeg.mjs";
import { scoreInput } from "./score.mjs";
import config from "./score-config.json" with { type: "json" };

const MAX_BODY = 2_200_000;
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 300 * 1024;
const MAX_SIDE = 768;
const MAX_TEXT = 300;
// Only this many leading base64 chars (6 KB) are decoded, for the CPU budget: the SOF segment must sit there, as it does in
// canvas JPEGs. The rest is not validated here; invalid base64 makes the model call fail (503).
const HEAD_CHARS = 8192;

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

// One decode per isolate; a failed load is retried by the next request.
let indexPromise;
const loadIndex = (env) =>
  (indexPromise ??= (async () => {
    const meta = await (await env.ASSETS.fetch("https://assets/search/advertising-index.json")).json();
    if (meta.status !== "ok") return null;
    const bin = await (await env.ASSETS.fetch("https://assets/search/advertising-index.bin")).arrayBuffer();
    return decodeIndex(meta, bin);
  })().catch(() => {
    indexPromise = undefined;
    return null;
  }));

const validImage = (b64) => {
  if (typeof b64 !== "string" || b64.length % 4 !== 0) return false;
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  if ((b64.length / 4) * 3 - padding > MAX_IMAGE_BYTES) return false;
  let head;
  try {
    head = atob(b64.slice(0, HEAD_CHARS));
  } catch {
    return false;
  }
  const bytes = new Uint8Array(head.length);
  for (let i = 0; i < head.length; i++) bytes[i] = head.charCodeAt(i);
  const size = jpegSize(bytes);
  return Boolean(size && size.width > 0 && size.height > 0 && Math.max(size.width, size.height) <= MAX_SIDE);
};

// Returns { text, images } or null when the body is malformed.
function parse(raw) {
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const { text = "", images = [] } = body;
  if (typeof text !== "string" || !Array.isArray(images) || images.length > MAX_IMAGES) return null;
  if (!images.every(validImage)) return null;
  const query = text.trim().slice(0, MAX_TEXT);
  return query || images.length ? { text: query, images } : null;
}

// Text goes through `input` and images through `messages` (see modelRequest), so both kinds mean two parallel calls.
const embed = (env, inputs) => env.AI.run(MODEL, modelRequest(inputs)).then((result) => readVectors(result, inputs.length));

async function search(request, env) {
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY) return json({ status: "too_large" }, 413);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ status: "too_large" }, 413);
  const body = parse(raw);
  if (!body) return json({ status: "bad_request" }, 400);
  const { text, images } = body;

  const limiter = images.length ? env.SEARCH_IMAGE_LIMIT : env.SEARCH_TEXT_LIMIT;
  const key = request.headers.get("CF-Connecting-IP") || "unknown";
  if (limiter && !(await limiter.limit({ key })).success) return json({ status: "rate_limited" }, 429);

  const index = await loadIndex(env);
  if (!index) return json({ status: "unavailable" }, 503);

  let textVectors;
  let imageVectors;
  try {
    [textVectors, imageVectors] = await Promise.all([
      text ? embed(env, [queryText(text)]) : [],
      images.length ? embed(env, images.map((b64) => mediaInput({}, b64))) : [],
    ]);
  } catch {
    return json({ status: "model_error" }, 503);
  }
  const inputs = [
    ...textVectors.map((vec) => ({ kind: "text", vec })),
    ...imageVectors.map((vec) => ({ kind: "image", vec })),
  ];
  return json({
    status: "ok",
    inputs: inputs.map(({ kind, vec }) => ({ kind, scores: scoreInput(unit(vec), kind, index, config.anchors) })),
  });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname !== "/api/search") return json({ status: "not_found" }, 404);
    if (request.method !== "POST") return json({ status: "method_not_allowed" }, 405);
    return search(request, env);
  },
};
