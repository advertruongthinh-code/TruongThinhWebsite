// pnpm search:index: embeds every Advertising card and media with Workers AI and writes the int8 index
// into .site-output/search/ (spec advertising-search R1). Failure never blocks a deploy: it writes status "unavailable".
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { buildAdvertisingArtifact } from "../../src/site/advertising-products/catalog.mjs";
import { cardMedia, documentText, embedRest, mediaInput, IMAGE_BATCH, TEXT_BATCH } from "../../src/search/embed-input.mjs";
import { encodeIndex, unavailableMeta } from "../../src/search/index-format.mjs";
import { siblingSrc, variantKeyOf } from "../site/media-src.mjs";

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
      // An R2 image (cms-plan part 2 K4) is downloaded at its 480 width (the full file when it is not wider); a network error skips
      // that image with a warning, like a model error, so it never blocks a deploy.
      let image;
      if (variantKeyOf(file)) {
        const url = (media.width ?? 0) > 480 ? siblingSrc(file, "-480", "webp") : file;
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(CALL_TIMEOUT_MS) });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          image = await readImage(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          console.warn(`search:index skipped ${url}: ${error.message}`);
          continue;
        }
      } else image = await readImage(`src/site${file}`);
      inputs.push(mediaInput(media, image));
      slots.push([cardIndex, mediaIndex++]);
    }
  }

  // Text and images need different request shapes, so each kind is chunked on its own.
  const chunks = [];
  for (const [isText, size] of [[true, TEXT_BATCH], [false, IMAGE_BATCH]]) {
    const idx = inputs.flatMap((input, i) => ((typeof input === "string") === isText ? [i] : []));
    for (let i = 0; i < idx.length; i += size) chunks.push(idx.slice(i, i + size));
  }
  const embed = async (chunk) => {
    for (let attempt = 0; ; attempt++) {
      try {
        if (failed) throw failed;
        if (Date.now() - started > DEADLINE_MS) throw new Error("deadline of 4 minutes exceeded");
        return await embedRest({ fetch, token, account, signal: AbortSignal.timeout(CALL_TIMEOUT_MS) }, chunk.map((i) => inputs[i]));
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
  const vectors = results.flat();
  chunks.flat().forEach((inputIndex, i) => {
    const vec = vectors[i];
    const [cardIndex, mediaIndex] = slots[inputIndex];
    if (mediaIndex < 0) entries[cardIndex].text = vec;
    else entries[cardIndex].media[mediaIndex] = vec;
  });
  const { meta, bin } = encodeIndex(entries);
  await write(meta, bin);
  const seconds = Math.round((Date.now() - started) / 1000);
  console.log(`search:index ok: ${entries.length} cards, ${bin.length / 256} vectors, ${seconds}s`);
  return { status: "ok", meta };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run();
