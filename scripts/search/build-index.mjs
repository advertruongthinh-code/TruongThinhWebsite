// pnpm search:index: embeds every Advertising card and media with Workers AI and writes the int8 index
// into .site-output/search/ (spec advertising-search R1). Failure never blocks a deploy: it writes status "unavailable".
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { buildAdvertisingArtifact } from "../../src/site/advertising-products/catalog.mjs";
import { cardMedia, documentText, mediaInput, modelRequest, MODEL, readVectors, TEXT_BATCH } from "../../src/search/embed-input.mjs";
import { encodeIndex, unavailableMeta } from "../../src/search/index-format.mjs";

const PARALLEL = 4;
const RETRY_MS = [1000, 2000, 4000];
const CALL_TIMEOUT_MS = 30_000;
const DEADLINE_MS = 4 * 60_000; // plan P2: the deploy job has timeout-minutes 10

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function resizedJpeg(file) {
  const { default: sharp } = await import("sharp");
  const jpeg = await sharp(file).resize({ width: 768, height: 768, fit: "inside" }).jpeg({ quality: 85 }).toBuffer();
  return jpeg.toString("base64");
}

export async function run({
  fetch = globalThis.fetch, env = process.env, artifact = buildAdvertisingArtifact(),
  outDir = ".site-output/search", readImage = resizedJpeg, sleep = wait,
} = {}) {
  const started = Date.now();
  const write = async (meta, bin) => {
    await mkdir(outDir, { recursive: true });
    await writeFile(`${outDir}/advertising-index.json`, JSON.stringify(meta));
    if (bin) await writeFile(`${outDir}/advertising-index.bin`, bin);
  };
  const unavailable = async (reason) => {
    console.warn(`search:index unavailable: ${reason}`);
    await write(unavailableMeta());
    return { status: "unavailable" };
  };
  const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = env;
  if (!token || !account) return unavailable("missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID");

  const ids = new Set();
  for (const { id } of artifact.cards) {
    if (ids.has(id)) throw new Error(`duplicate card id ${id}`);
    ids.add(id);
  }
  // One flat list of model inputs; `slot` says where each vector goes: [cardIndex, mediaIndex] (mediaIndex -1 = text).
  const inputs = [];
  const slots = [];
  for (const [cardIndex, card] of artifact.cards.entries()) {
    inputs.push(documentText(card, artifact));
    slots.push([cardIndex, -1]);
    let mediaIndex = 0;
    for (const media of cardMedia(card)) {
      const file = media.kind === "video" ? media.posterSrc : media.src;
      if (!file) continue; // video without poster: indexed by the card text only
      inputs.push(mediaInput(media, await readImage(`src/site${file}`)));
      slots.push([cardIndex, mediaIndex++]);
    }
  }

  const chunks = [];
  for (let i = 0; i < inputs.length; i += TEXT_BATCH) chunks.push(inputs.slice(i, i + TEXT_BATCH));
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MODEL}`;
  const embed = async (chunk) => {
    for (let attempt = 0; ; attempt++) {
      try {
        if (failed) throw failed;
        if (Date.now() - started > DEADLINE_MS) throw new Error("deadline of 4 minutes exceeded");
        const res = await fetch(url, {
          signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(modelRequest(chunk)),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return readVectors((await res.json()).result, chunk.length);
      } catch (error) {
        if (failed || attempt === RETRY_MS.length || error.message.startsWith("deadline")) throw (failed ??= error);
        await sleep(RETRY_MS[attempt]);
      }
    }
  };
  let failed = null; // first error: stops the other workers from spending more calls
  const results = new Array(chunks.length);
  let next = 0;
  try {
    await Promise.all(Array.from({ length: PARALLEL }, async () => {
      while (next < chunks.length && !failed) {
        const i = next++;
        results[i] = await embed(chunks[i]);
      }
    }));
  } catch (error) {
    return unavailable(error.message);
  }

  const entries = artifact.cards.map(({ id }) => ({ id, text: null, media: [] }));
  results.flat().forEach((vec, i) => {
    const [cardIndex, mediaIndex] = slots[i];
    if (mediaIndex < 0) entries[cardIndex].text = vec;
    else entries[cardIndex].media[mediaIndex] = vec;
  });
  const { meta, bin } = encodeIndex(entries);
  await write(meta, bin);
  const seconds = Math.round((Date.now() - started) / 1000);
  console.log(`search:index ok: ${entries.length} cards, ${bin.length / 256} vectors, ${seconds}s`);
  return { status: "ok", meta };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await run();
