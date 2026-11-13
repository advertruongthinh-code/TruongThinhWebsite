#!/usr/bin/env node
// Build responsive AVIF/WebP variants and progressive JXL next to every public WebP under src/site/assets/content.
// Usage: node scripts/site/build-image-variants.mjs [--originals map.json] [--force] [--check] [--jobs N]
//   map.json: { "assets/content/.../name.webp": "C:/abs/original.png" }; a missing entry is encoded from the WebP.
//   JXL needs cjxl and djxl pinned in tooling-versions.json (scripts/tooling/install-jxl.sh).
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";
import { mediaColors } from "./image-palette.mjs";
import { readJson, siteRoot as sourceRoot, walk } from "./lib.mjs";
import { nonPublicSourceAssets } from "./non-public-source-assets.mjs";

const VARIANT_WIDTHS = [240, 480, 960];
// null is the original; a size not smaller than the original is dropped (progressive-loading R1).
const JXL_WIDTHS = [240, 480, 960, 1600, 2048, null];
// Frame-fit sizes a large frame shows before it upgrades to the original (progressive-loading R2, R10).
const UPGRADE_TIERS = [960, 1600, 2048];
const arg = (name) => { const index = process.argv.indexOf(`--${name}`); return index > 0 ? process.argv[index + 1] : null; };
const force = process.argv.includes("--force");
const check = process.argv.includes("--check");
const jobs = Math.max(1, Number(arg("jobs")) || 1);
const originals = arg("originals") ? await readJson(arg("originals")) : {};
const skip = new Set(nonPublicSourceAssets);
const run = promisify(execFile);
// The pinned build is installed by scripts/tooling/install-jxl.sh; env CJXL and DJXL override it, otherwise look in PATH.
const pinned = (name) => { const file = path.resolve(sourceRoot, "../../.tooling/libjxl/tools", name); return existsSync(file) ? file : name; };
const cjxl = process.env.CJXL || pinned("cjxl");
const djxl = process.env.DJXL || pinned("djxl");
const thresholdsFile = path.join(sourceRoot, "assets/content/jxl-thresholds.json");
// Only originals carry thresholds ({ "<path>.jxl": { "<tier>": bytes } }); a plain number is the per-variant format before 2026-11-13.
const thresholds = Object.fromEntries(Object.entries(JSON.parse(await readFile(thresholdsFile, "utf8").catch(() => "{}")))
  .filter(([, value]) => typeof value === "object"));
// Colors of Advertising images: [the dominant color a card fills with before the image has received any byte (progressive-loading R9), the 4 Flow colors awaiting the
// primary image, light to dark (advertising-skeleton R3)].
const colorsFile = path.join(sourceRoot, "media-lib/colors.mjs");
const colors = { ...(await import(pathToFileURL(colorsFile)).catch(() => ({}))).MEDIA_COLORS };
const colorKey = (file) => file.includes(`${path.sep}advertising${path.sep}`) && path.basename(file, ".webp");
const relativeOf = (file) => path.relative(sourceRoot, file).replaceAll("\\", "/");

// Variant path of a WebP: name.avif (full width), name-480.webp, name-480.avif, ...
const variantPaths = (file) => {
  const stem = file.slice(0, -".webp".length);
  return [{ file: `${stem}.avif`, width: null, format: "avif" },
    ...VARIANT_WIDTHS.flatMap((width) => ["avif", "webp"].map((format) => ({ file: `${stem}-${width}.${format}`, width, format }))),
    ...JXL_WIDTHS.map((width) => ({ file: `${stem}${width ? `-${width}` : ""}.jxl`, width, format: "jxl" }))];
};

// Luma SSIM over non-overlapping 8x8 windows, like the measurement in the progressive-loading R2 spec.
const ssim = (a, b, width, height) => {
  const c1 = (0.01 * 255) ** 2, c2 = (0.03 * 255) ** 2;
  let sum = 0, count = 0;
  for (let y = 0; y + 8 <= height; y += 8) for (let x = 0; x + 8 <= width; x += 8) {
    let ma = 0, mb = 0, va = 0, vb = 0, cov = 0;
    for (let j = 0; j < 8; j += 1) for (let i = 0; i < 8; i += 1) { const k = (y + j) * width + x + i; ma += a[k]; mb += b[k]; }
    ma /= 64; mb /= 64;
    for (let j = 0; j < 8; j += 1) for (let i = 0; i < 8; i += 1) {
      const k = (y + j) * width + x + i, da = a[k] - ma, db = b[k] - mb;
      va += da * da; vb += db * db; cov += da * db;
    }
    va /= 63; vb /= 63; cov /= 63;
    sum += ((2 * ma * mb + c1) * (2 * cov + c2)) / ((ma * ma + mb * mb + c1) * (va + vb + c2));
    count += 1;
  }
  return count ? sum / count : 0;
};

const luma = async (file) => sharp(file).greyscale().raw().toBuffer({ resolveWithObject: true });

// Encode progressive JXL not exceeding targetBytes: search distance by log(size) ~ log(distance) within a clamped range,
// keep the smaller build closest to the target. Size is not locally monotonic, so once both ends are bracketed, bisect on the log.
const encodeJxl = async (png, out, targetBytes, tmp) => {
  let distance = 1.5, best = null, tooBig = null, fits = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const trial = path.join(tmp, `trial-${attempt}.jxl`);
    await run(cjxl, [png, trial, "-p", "--group_order=1", "-e", "7", "-d", distance.toFixed(3), "--quiet"]);
    const size = (await stat(trial)).size;
    if (size <= targetBytes) {
      if (!best || size > best.size) best = { distance, trial, size };
      if (size >= targetBytes * 0.97) break;
      fits = Math.min(fits ?? Infinity, distance);
    } else tooBig = Math.max(tooBig ?? 0, distance);
    // Not yet bracketed: treat size as inversely proportional to distance; bracketed: geometric mean of the two ends.
    distance = tooBig && fits ? Math.sqrt(tooBig * fits)
      : Math.min(25, Math.max(0.1, distance * size / (targetBytes * 0.985)));
  }
  if (!best) throw new Error(`${out}: did not reach ${targetBytes} bytes after 10 attempts`);
  await writeFile(out, await readFile(best.trial));
  return best;
};

// djxl writes PPM (PNG encoding took 4 times the decode); sharp reads its pixels as raw RGB.
const lumaAt = async (ppm, width) => {
  const data = await readFile(ppm);
  const [header, w, h, max] = data.subarray(0, 64).toString("latin1").match(/^P6\s+(\d+)\s+(\d+)\s+(\d+)\s/) ?? [];
  if (max !== "255") throw new Error(`${ppm}: not an 8-bit PPM`);
  return sharp(data.subarray(header.length), { raw: { width: Number(w), height: Number(h), channels: 3 } })
    .greyscale().resize({ width }).raw().toBuffer({ resolveWithObject: true });
};

// For each tier the original upgrades from: the smallest number of leading bytes of the original whose partial decode, scaled to the tier
// width, is at least as close to the full original as the tier file itself (luma SSIM, progressive-loading R2). The page swaps to the
// partial original from there on, so the image never gets blurrier than the frame-fit version it replaces.
const findThresholds = async (stem, tmp) => {
  const bytes = await readFile(`${stem}.jxl`);
  const fullPng = path.join(tmp, "full.ppm");
  await run(djxl, [`${stem}.jxl`, fullPng, "--quiet"]);
  // A partial decode is shared between tiers; null when too few bytes to decode anything.
  const partials = new Map();
  const partial = (length) => {
    if (!partials.has(length)) partials.set(length, (async () => {
      const part = path.join(tmp, `part-${length}.jxl`), png = path.join(tmp, `part-${length}.ppm`);
      await writeFile(part, bytes.subarray(0, length));
      try { await run(djxl, [part, png, "--allow_partial_files", "--quiet"]); return png; } catch { return null; }
    })());
    return partials.get(length);
  };
  const result = {};
  let low = 0;
  for (const width of UPGRADE_TIERS) {
    const tier = `${stem}-${width}.jxl`;
    if (!existsSync(tier)) continue;
    const reference = await lumaAt(fullPng, width);
    const tierPng = path.join(tmp, "tier.ppm");
    await run(djxl, [tier, tierPng, "--quiet"]);
    const similarity = async (png) => {
      const image = png && await lumaAt(png, width).catch(() => null);
      return image ? ssim(reference.data, image.data, width, Math.min(reference.info.height, image.info.height)) : 0;
    };
    const target = await similarity(tierPng);
    // Thresholds rise with the tier, so each search starts from the previous tier's threshold.
    let high = bytes.length;
    while (high - low > Math.max(256, bytes.length / 200)) {
      const middle = Math.floor((low + high) / 2);
      if (await similarity(await partial(middle)) >= target) high = middle; else low = middle;
    }
    result[width] = high;
  }
  return result;
};

const isVariant = (file) => /-(?:240|480|960)\.webp$/.test(file);
const files = (await walk(path.join(sourceRoot, "assets/content")))
  .filter((file) => file.endsWith(".webp") && !isVariant(file) && !skip.has(relativeOf(file)));

let built = 0;
let saving = Promise.resolve();
const missing = [];
const buildFile = async (file) => {
  const relative = relativeOf(file);
  const { width, height } = await sharp(file).metadata();
  const key = colorKey(file);
  let rebuilt = 0;
  for (const variant of variantPaths(file)) {
    if (variant.width && variant.width >= width) continue;
    const exists = await stat(variant.file).catch(() => null);
    if (!force && exists) continue;
    if (check) { missing.push(relativeOf(variant.file)); continue; }
    // Only use the originals when they keep exactly the published aspect ratio; otherwise the WebP remains the source.
    const original = originals[relative];
    const meta = original ? await sharp(original).metadata().catch(() => null) : null;
    const input = meta && Math.abs(meta.width / meta.height - width / height) < 0.005 ? original : file;
    const pipeline = sharp(input).resize({ width: variant.width || width, withoutEnlargement: true });
    if (variant.format === "jxl") {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "jxl-"));
      try {
        const png = path.join(tmp, "in.png");
        await pipeline.clone().png({ compressionLevel: 1 }).toFile(png);
        // The size target is AVIF quality 55 at the same size; for a size with no AVIF in the repo, encode a temporary one in memory.
        const avif = variant.file.replace(/\.jxl$/, ".avif");
        const target = (await stat(avif).catch(() => null))?.size
          ?? (await pipeline.clone().avif({ quality: 55, effort: 6 }).toBuffer()).length;
        await encodeJxl(png, variant.file, target, tmp);
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    } else {
      await (variant.format === "avif" ? pipeline.avif({ quality: 55, effort: 6 }) : pipeline.webp({ quality: 78, effort: 6 }))
        .toFile(variant.file);
    }
    built += 1;
    rebuilt += 1;
  }
  // Thresholds of the original against its tiers; recomputed whenever a variant was rebuilt.
  const stem = file.slice(0, -".webp".length), originalKey = relativeOf(`${stem}.jxl`);
  if (UPGRADE_TIERS.some((tier) => tier < width) && (rebuilt || !thresholds[originalKey])) {
    if (check) missing.push(`${originalKey} (thresholds)`);
    else {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "jxl-"));
      try { thresholds[originalKey] = await findThresholds(stem, tmp); } finally { await rm(tmp, { recursive: true, force: true }); }
    }
  }
  // New image, or an image replaced under the same name (variant just rebuilt): recompute the color so the color does not drift from the image.
  if (key && (colors[key]?.length !== 5 || rebuilt)) {
    if (check) missing.push(`${relative} (color)`);
    else {
      // The dominant color reads the full-size pixels (sharp stats() ignores resize); the Flow colors read the 64px thumbnail.
      const [full, thumb] = await Promise.all([sharp(file).removeAlpha().raw().toBuffer(), sharp(file).resize(64).removeAlpha().raw().toBuffer()]);
      colors[key] = mediaColors({ full, thumb });
    }
  }
  // Write after each image (sequentially between jobs) so a long run that gets interrupted can continue.
  if (!check) saving = saving.then(() => Promise.all([
    writeFile(thresholdsFile, `${JSON.stringify(Object.fromEntries(Object.entries(thresholds).sort()), null, 1)}\n`),
    writeFile(colorsFile, `// Generated by scripts/site/build-image-variants.mjs, do not edit by hand.\nexport const MEDIA_COLORS = Object.freeze({\n${Object.entries(colors).sort()
      .map(([key, value]) => ` ${JSON.stringify(key)}: ${JSON.stringify(value)},`).join("\n")}\n});\n`),
  ]));
  await saving;
};

const queue = [...files];
await Promise.all(Array.from({ length: jobs }, async () => { while (queue.length) await buildFile(queue.shift()); }));
if (check && missing.length) {
  console.error(`missing variants (${missing.length}):\n${missing.join("\n")}`);
  process.exit(1);
}
console.log(`${files.length} public WebP, ${check ? "variants up to date" : `${built} variants written`}`);
