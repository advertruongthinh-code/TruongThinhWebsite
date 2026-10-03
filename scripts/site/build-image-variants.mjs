#!/usr/bin/env node
// Builds AVIF/WebP responsive variants next to each public WebP under src/site/assets/content.
// Usage: node scripts/site/build-image-variants.mjs [--originals map.json] [--force] [--check]
//   map.json: { "assets/content/.../name.webp": "C:/abs/original.png" }; missing entries encode from the WebP.
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { nonPublicSourceAssets } from "./non-public-source-assets.mjs";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/site");
const VARIANT_WIDTHS = [480, 960];
const arg = (name) => { const index = process.argv.indexOf(`--${name}`); return index > 0 ? process.argv[index + 1] : null; };
const force = process.argv.includes("--force");
const check = process.argv.includes("--check");
const originals = arg("originals") ? JSON.parse(await readFile(arg("originals"), "utf8")) : {};
const skip = new Set(nonPublicSourceAssets);

const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
}))).flat();

// Variant path for a WebP: name.avif (full width), name-480.webp, name-480.avif, ...
const variantPaths = (file) => {
  const stem = file.slice(0, -".webp".length);
  return [{ file: `${stem}.avif`, width: null, format: "avif" },
    ...VARIANT_WIDTHS.flatMap((width) => ["avif", "webp"].map((format) => ({ file: `${stem}-${width}.${format}`, width, format })))];
};

const isVariant = (file) => /-(?:480|960)\.webp$/.test(file);
const files = (await walk(path.join(sourceRoot, "assets/content")))
  .filter((file) => file.endsWith(".webp") && !isVariant(file) && !skip.has(path.relative(sourceRoot, file).replaceAll("\\", "/")));

let built = 0;
const missing = [];
for (const file of files) {
  const relative = path.relative(sourceRoot, file).replaceAll("\\", "/");
  const { width, height } = await sharp(file).metadata();
  for (const variant of variantPaths(file)) {
    if (variant.width && variant.width >= width) continue;
    if (!force && await stat(variant.file).catch(() => null)) continue;
    if (check) { missing.push(path.relative(sourceRoot, variant.file)); continue; }
    // Originals are used only when they keep the published aspect ratio; otherwise the WebP stays the source.
    const original = originals[relative];
    const meta = original ? await sharp(original).metadata().catch(() => null) : null;
    const input = meta && Math.abs(meta.width / meta.height - width / height) < 0.005 ? original : file;
    const pipeline = sharp(input).resize({ width: variant.width || width, withoutEnlargement: true });
    await (variant.format === "avif" ? pipeline.avif({ quality: 55, effort: 6 }) : pipeline.webp({ quality: 78, effort: 6 }))
      .toFile(variant.file);
    built += 1;
  }
}
if (check && missing.length) {
  console.error(`missing variants (${missing.length}):\n${missing.join("\n")}`);
  process.exit(1);
}
console.log(`${files.length} public WebP, ${check ? "variants up to date" : `${built} variants written`}`);
