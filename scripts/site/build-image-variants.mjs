#!/usr/bin/env node
// Dựng biến thể AVIF/WebP responsive và JXL progressive cạnh mỗi WebP public dưới src/site/assets/content.
// Cách dùng: node scripts/site/build-image-variants.mjs [--originals map.json] [--force] [--check] [--jobs N]
//   map.json: { "assets/content/.../name.webp": "C:/abs/original.png" }; entry thiếu thì encode từ WebP.
//   JXL cần cjxl, djxl ghim trong tooling-versions.json (scripts/tooling/install-jxl.sh).
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";
import { palette } from "./image-palette.mjs";
import { nonPublicSourceAssets } from "./non-public-source-assets.mjs";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/site");
const VARIANT_WIDTHS = [240, 480, 960];
// null là bản gốc; cỡ không nhỏ hơn bản gốc thì bỏ (progressive-loading R1).
const JXL_WIDTHS = [240, 480, 960, 1600, 2048, null];
const SSIM_THRESHOLD = 0.9;
const arg = (name) => { const index = process.argv.indexOf(`--${name}`); return index > 0 ? process.argv[index + 1] : null; };
const force = process.argv.includes("--force");
const check = process.argv.includes("--check");
const jobs = Math.max(1, Number(arg("jobs")) || 1);
const originals = arg("originals") ? JSON.parse(await readFile(arg("originals"), "utf8")) : {};
const skip = new Set(nonPublicSourceAssets);
const run = promisify(execFile);
// Bản ghim do scripts/tooling/install-jxl.sh cài; env CJXL, DJXL ghi đè, không có thì tìm trong PATH.
const pinned = (name) => { const file = path.resolve(sourceRoot, "../../.tooling/libjxl/tools", name); return existsSync(file) ? file : name; };
const cjxl = process.env.CJXL || pinned("cjxl");
const djxl = process.env.DJXL || pinned("djxl");
const thresholdsFile = path.join(sourceRoot, "assets/content/jxl-thresholds.json");
const thresholds = JSON.parse(await readFile(thresholdsFile, "utf8").catch(() => "{}"));
// Màu của ảnh Advertising: [màu chủ đạo card tô khi ảnh chưa nhận byte nào (progressive-loading R9), 4 màu Flow chờ ảnh
// primary sáng tới tối (advertising-skeleton R3)].
const colorsFile = path.join(sourceRoot, "advertising-products/media-colors.mjs");
const colors = { ...(await import(pathToFileURL(colorsFile)).catch(() => ({}))).MEDIA_COLORS };
const colorKey = (file) => file.includes(`${path.sep}advertising${path.sep}`) && path.basename(file, ".webp");
const hex = ([r, g, b]) => `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
const relativeOf = (file) => path.relative(sourceRoot, file).replaceAll("\\", "/");

const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
}))).flat();

// Đường dẫn variant của một WebP: name.avif (full width), name-480.webp, name-480.avif, ...
const variantPaths = (file) => {
  const stem = file.slice(0, -".webp".length);
  return [{ file: `${stem}.avif`, width: null, format: "avif" },
    ...VARIANT_WIDTHS.flatMap((width) => ["avif", "webp"].map((format) => ({ file: `${stem}-${width}.${format}`, width, format }))),
    ...JXL_WIDTHS.map((width) => ({ file: `${stem}${width ? `-${width}` : ""}.jxl`, width, format: "jxl" }))];
};

// SSIM độ chói trên cửa sổ 8×8 không chồng nhau, như lần đo trong spec progressive-loading R2.
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

// Encode JXL progressive không vượt targetBytes: dò distance theo log(size) ~ log(distance) trong khoảng kẹp,
// giữ bản nhỏ hơn đích gần nhất. Size không đơn điệu cục bộ nên khi đã kẹp được hai đầu thì chia đôi theo log.
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
    // Chưa kẹp: coi size tỉ lệ nghịch distance; đã kẹp: trung bình nhân hai đầu.
    distance = tooBig && fits ? Math.sqrt(tooBig * fits)
      : Math.min(25, Math.max(0.1, distance * size / (targetBytes * 0.985)));
  }
  if (!best) throw new Error(`${out}: không đạt ${targetBytes} byte sau 10 lần thử`);
  await writeFile(out, await readFile(best.trial));
  return best;
};

// Số byte đầu nhỏ nhất mà bản cắt dở đạt SSIM 0,90 so với bản đủ (progressive-loading R2).
const findThreshold = async (jxl, tmp) => {
  const bytes = await readFile(jxl);
  const fullPng = path.join(tmp, "full.png");
  await run(djxl, [jxl, fullPng, "--quiet"]);
  const full = await luma(fullPng);
  const score = async (length) => {
    const part = path.join(tmp, "part.jxl"), partPng = path.join(tmp, "part.png");
    await writeFile(part, bytes.subarray(0, length));
    try { await run(djxl, [part, partPng, "--allow_partial_files", "--quiet"]); } catch { return 0; }
    const partial = await luma(partPng).catch(() => null);
    return partial && partial.info.width === full.info.width
      ? ssim(full.data, partial.data, full.info.width, full.info.height) : 0;
  };
  let low = 0, high = bytes.length;
  while (high - low > Math.max(256, bytes.length / 200)) {
    const middle = Math.floor((low + high) / 2);
    if (await score(middle) >= SSIM_THRESHOLD) high = middle; else low = middle;
  }
  return high;
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
    const jxlKey = variant.format === "jxl" ? relativeOf(variant.file) : null;
    const exists = await stat(variant.file).catch(() => null);
    if (!force && exists && (!jxlKey || thresholds[jxlKey])) continue;
    if (check) { missing.push(relativeOf(variant.file)); continue; }
    // Chỉ dùng bản gốc khi chúng giữ đúng aspect ratio đã publish; nếu không, WebP vẫn là source.
    const original = originals[relative];
    const meta = original ? await sharp(original).metadata().catch(() => null) : null;
    const input = meta && Math.abs(meta.width / meta.height - width / height) < 0.005 ? original : file;
    const pipeline = sharp(input).resize({ width: variant.width || width, withoutEnlargement: true });
    if (variant.format === "jxl") {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "jxl-"));
      try {
        const png = path.join(tmp, "in.png");
        await pipeline.clone().png({ compressionLevel: 1 }).toFile(png);
        // Đích dung lượng là AVIF quality 55 cùng cỡ; cỡ chưa có AVIF trong repo thì encode tạm trong bộ nhớ.
        const avif = variant.file.replace(/\.jxl$/, ".avif");
        const target = (await stat(avif).catch(() => null))?.size
          ?? (await pipeline.clone().avif({ quality: 55, effort: 6 }).toBuffer()).length;
        await encodeJxl(png, variant.file, target, tmp);
        thresholds[jxlKey] = await findThreshold(variant.file, tmp);
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
  // Ảnh mới, hoặc ảnh thay cùng tên (variant vừa dựng lại) thì tính lại màu, để màu không lệch ảnh.
  if (key && (colors[key]?.length !== 5 || rebuilt)) {
    if (check) missing.push(`${relative} (màu)`);
    else {
      const small = sharp(file).resize(64).removeAlpha();
      const { r, g, b } = (await small.clone().stats()).dominant;
      colors[key] = [[r, g, b], ...palette(await small.raw().toBuffer())].map(hex);
    }
  }
  // Ghi sau mỗi ảnh (nối tiếp giữa các job) để lần chạy dài bị ngắt vẫn chạy tiếp được.
  if (!check) saving = saving.then(() => Promise.all([
    writeFile(thresholdsFile, `${JSON.stringify(Object.fromEntries(Object.entries(thresholds).sort()), null, 1)}\n`),
    writeFile(colorsFile, `// Sinh bởi scripts/site/build-image-variants.mjs, không sửa tay.\nexport const MEDIA_COLORS = Object.freeze({\n${Object.entries(colors).sort()
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
