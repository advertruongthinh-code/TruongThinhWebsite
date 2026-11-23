#!/usr/bin/env node
// CMS variants job (CMS plan P3, P10, Q6): for each ITEMS entry { m, c, p } (image) or { m, c, k: "video" } build the public
// variants into .tmp/variants/<key>/ and, when R2_PUBLIC_BUCKET is set, upload them (files first, manifest.json last).
// Prints one line per item.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ID } from "../../src/cms/contract.mjs";
import { VARIANT_RECIPE, variantKey } from "../../src/cms/media-ref.mjs";
import { encodeJxl, findThresholds, JXL_WIDTHS, UPGRADE_TIERS, VARIANT_WIDTHS } from "../site/build-image-variants.mjs";
import { mediaColors } from "../site/image-palette.mjs";
import { IMAGE_SRC, siteRoot } from "../site/lib.mjs";

const env = process.env;
const bucket = env.R2_PUBLIC_BUCKET;
const outRoot = path.resolve(".tmp/variants");
const srcRoot = path.resolve(".tmp/variants-src");
const LADDER = fileURLToPath(new URL("../site/build-video-ladder.mjs", import.meta.url));
const isCrop = (c) => Array.isArray(c) && c.length === 4 && c.every(Number.isInteger) && c[0] >= 0 && c[1] >= 0 && c[2] >= 1 && c[3] >= 1;

// Repo media come from the checkout (sha256); R2 media from the admin Worker, re-hashed with the algorithm named in X-Hash.
async function original({ m, p }) {
  if (p !== undefined) {
    if (typeof p !== "string" || !IMAGE_SRC.test(p)) throw new Error("path");
    const bytes = await readFile(path.join(siteRoot, p));
    return { bytes, hash: `sha256:${createHash("sha256").update(bytes).digest("hex")}` };
  }
  const { response, expected, algorithm } = await fetchOriginal(m);
  const bytes = Buffer.from(await response.arrayBuffer());
  const hash = `${algorithm}:${createHash(algorithm).update(bytes).digest("hex")}`;
  if (hash !== expected) throw new Error("hash");
  return { bytes, hash };
}

async function fetchOriginal(m) {
  const response = await fetch(`${env.CMS_ADMIN_ORIGIN}/api/admin/media-original?id=${encodeURIComponent(m)}`, {
    headers: { "CF-Access-Client-Id": env.CMS_ACCESS_CLIENT_ID ?? "", "CF-Access-Client-Secret": env.CMS_ACCESS_CLIENT_SECRET ?? "", "User-Agent": "tt-cms-ci" },
  });
  if (!response.ok) throw new Error(`original ${response.status}`);
  const expected = response.headers.get("X-Hash") ?? "";
  const algorithm = expected.split(":")[0];
  if (!["md5", "sha256"].includes(algorithm)) throw new Error("hash algorithm");
  return { response, expected, algorithm };
}

// Uploads dir in passes (each pass is the extra aws arguments after the destination), manifest.json last.
function upload(dir, key, passes) {
  for (const args of [...passes, [path.join(dir, "manifest.json"), `s3://${bucket}/v/${key}/manifest.json`, "--cache-control", "no-store"]]) {
    const result = spawnSync("aws", ["s3", "cp", ...args, "--endpoint-url", env.R2_ENDPOINT], { stdio: ["ignore", "ignore", "inherit"] });
    if (result.status !== 0) throw new Error(`aws exit ${result.status}`);
  }
}

// JXL at the widths build-image-variants.mjs uses, each sized to the AVIF of the same width.
async function buildJxl(sized, stem, width) {
  for (const size of JXL_WIDTHS) {
    if (size && size >= width) continue;
    const name = `${stem}${size ? `-${size}` : ""}`;
    const tmp = await mkdtemp(path.join(os.tmpdir(), "jxl-"));
    try {
      const png = path.join(tmp, "in.png");
      await sized(size).png({ compressionLevel: 1 }).toFile(png);
      const target = (await stat(`${name}.avif`).catch(() => null))?.size ?? (await sized(size).avif({ quality: 55, effort: 6 }).toBuffer()).length;
      await encodeJxl(png, `${name}.jxl`, target, tmp);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }
}

async function build(item) {
  const { m, c } = item;
  if (typeof m !== "string" || !ID.test(m)) throw new Error("item");
  const { bytes, hash } = await original(item);
  const meta = await sharp(bytes).metadata();
  const turned = (meta.orientation ?? 1) >= 5;
  const sourceWidth = turned ? meta.height : meta.width;
  const sourceHeight = turned ? meta.width : meta.height;
  if (!isCrop(c) || c[0] + c[2] > sourceWidth || c[1] + c[3] > sourceHeight) throw new Error("crop");
  const key = await variantKey(hash, c);
  const dir = path.join(outRoot, key), stem = path.join(dir, m), width = c[2];
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  // rotate() with no argument applies the EXIF orientation before the crop; no withMetadata, so EXIF and GPS are dropped.
  const crop = () => sharp(bytes).rotate().extract({ left: c[0], top: c[1], width: c[2], height: c[3] });
  const sized = (size) => (size ? crop().resize({ width: size }) : crop());
  for (const size of [null, ...VARIANT_WIDTHS]) {
    if (size && size >= width) continue;
    const name = `${stem}${size ? `-${size}` : ""}`;
    await sized(size).webp({ quality: 78, effort: 6 }).toFile(`${name}.webp`);
    await sized(size).avif({ quality: 55, effort: 6 }).toFile(`${name}.avif`);
  }
  const jxl = await buildJxl(sized, stem, width).then(() => true, (error) => {
    // shortcut: a local run without cjxl skips JXL; an uploading run fails the item instead of publishing an incomplete set.
    if (error.code !== "ENOENT" || bucket) throw error;
    console.error("cjxl missing: JXL skipped");
    return false;
  });
  let thresholds = {};
  if (jxl && UPGRADE_TIERS.some((tier) => tier < width)) {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "jxl-"));
    try { thresholds = await findThresholds(stem, tmp); } finally { await rm(tmp, { recursive: true, force: true }); }
  }
  const [full, thumb] = await Promise.all([crop().removeAlpha().raw().toBuffer(), crop().resize(64).removeAlpha().raw().toBuffer()]);
  const names = (await readdir(dir)).sort();
  const files = await Promise.all(names.map(async (name) => ({ name, bytes: (await stat(path.join(dir, name))).size })));
  const manifest = { recipe: VARIANT_RECIPE, key, mediaId: m, hash, crop: c, sourceWidth, sourceHeight, width, height: c[3], files, colors: mediaColors({ full, thumb }), thresholds };
  await writeFile(path.join(dir, "manifest.json"), `${JSON.stringify(manifest)}\n`);
  if (bucket) upload(dir, key, [[`${dir}/`, `s3://${bucket}/v/${key}/`, "--recursive", "--exclude", "manifest.json", "--cache-control", "public, max-age=31536000, immutable"]]);
  return key;
}

// Child processes get PATH only, so the Access secret and R2 keys of the job never reach ffprobe, ffmpeg or the ladder script.
const CHILD_ENV = { PATH: env.PATH };
const ffprobe = (file, args) => JSON.parse(execFileSync("ffprobe", ["-v", "error", "-of", "json", ...args, file], { env: CHILD_ENV, maxBuffer: 64 * 1024 * 1024 }).toString());

// Video (P10): stream the original to disk (never into memory), build the HLS ladder with build-video-ladder.mjs, then upload.
async function buildVideo({ m, c, p }) {
  if (typeof m !== "string" || !ID.test(m) || p !== undefined || !isCrop(c)) throw new Error("item");
  const file = path.join(srcRoot, `${m}.mp4`);
  await mkdir(srcRoot, { recursive: true });
  try {
    const { response, expected, algorithm } = await fetchOriginal(m);
    const sum = createHash(algorithm);
    await pipeline(Readable.fromWeb(response.body), async function* (source) { for await (const chunk of source) { sum.update(chunk); yield chunk; } }, createWriteStream(file));
    const hash = `${algorithm}:${sum.digest("hex")}`;
    if (hash !== expected) throw new Error("hash");
    // An unreadable file makes ffprobe exit non-zero; it is reported like a file without a video stream.
    const info = (() => { try { return ffprobe(file, ["-select_streams", "v:0", "-show_entries", "stream=width,height:stream_side_data=rotation:format=duration"]); } catch { return {}; } })();
    const [stream] = info.streams ?? [];
    if (!stream) throw new Error("no-video");
    const turned = Math.abs(Number(stream.side_data_list?.find((entry) => entry.rotation !== undefined)?.rotation ?? 0)) % 180 === 90;
    const sourceWidth = turned ? stream.height : stream.width, sourceHeight = turned ? stream.width : stream.height;
    if (sourceWidth < 240) throw new Error("too-small");
    // upload-media accepts up to 600 s; 1 s of slack for container rounding.
    if (!(Number(info.format?.duration) <= 601)) throw new Error("too-long");
    // The whole frame is the only video crop: a size other than the measured one means the record lies about the file.
    if (c[0] !== 0 || c[1] !== 0 || c[2] !== sourceWidth || c[3] !== sourceHeight) throw new Error("size");
    const key = await variantKey(hash, c);
    const dir = path.join(outRoot, key);
    await rm(dir, { recursive: true, force: true });
    execFileSync(process.execPath, [LADDER, file, dir], { stdio: ["ignore", "ignore", "inherit"], env: CHILD_ENV });
    const hasAudio = ffprobe(file, ["-select_streams", "a:0", "-show_entries", "stream=codec_type"]).streams.length > 0;
    const names = (await readdir(dir)).sort();
    const rungs = names.flatMap((name) => /^(\d+)\.mp4$/.test(name) ? [Number.parseInt(name, 10)] : []).sort((a, b) => a - b);
    const files = await Promise.all(names.map(async (name) => ({ name, bytes: (await stat(path.join(dir, name))).size })));
    const manifest = { recipe: VARIANT_RECIPE, key, mediaId: m, hash, kind: "video", sourceWidth, sourceHeight, duration: Number(info.format.duration), hasAudio, rungs, files };
    await writeFile(path.join(dir, "manifest.json"), `${JSON.stringify(manifest)}\n`);
    if (bucket) {
      const copy = (include, type, cache) => [`${dir}/`, `s3://${bucket}/v/${key}/`, "--recursive", "--exclude", "*", "--include", include, "--content-type", type, "--cache-control", cache];
      upload(dir, key, [copy("*.mp4", "video/mp4", "public, max-age=31536000, immutable"), copy("*.m3u8", "application/vnd.apple.mpegurl", "public, max-age=31536000, immutable")]);
    }
    return key;
  } finally {
    await rm(file, { force: true });
  }
}

const items = JSON.parse(env.ITEMS ?? "[]");
let done = 0;
for (const item of items) {
  const start = Date.now();
  try {
    const key = await (item?.k === "video" ? buildVideo(item) : build(item));
    done += 1;
    console.log(`ok ${item.m} ${key} ${((Date.now() - start) / 1000).toFixed(1)}s`);
  } catch (error) {
    console.log(`error ${ID.test(item?.m ?? "") ? item.m : JSON.stringify(item?.m)} ${error.message}`);
  }
}
process.exit(done ? 0 : 1);
