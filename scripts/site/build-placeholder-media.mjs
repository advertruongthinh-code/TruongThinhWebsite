#!/usr/bin/env node
// Sinh media tạm cho card nhiều media (owner 2026-10-17): 1/3 số card Advertising có thêm ảnh
// nhân bản từ ảnh cùng sản phẩm và video ghép từ ảnh, chờ ảnh nhiều góc thật.
// ponytail: dữ liệu tạm, chỉ sống trên branch riêng; có media thật thì xóa script, thư mục output và placeholder-media.mjs.
// Cách dùng: node scripts/site/build-placeholder-media.mjs (cần ffmpeg, ffprobe trong PATH).
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ADVERTISING_MEDIA_MANIFEST } from "../../src/site/advertising-products/media-manifest.mjs";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/site");
const outputUrl = "/assets/placeholder-media";
const outputDir = path.join(siteRoot, outputUrl);
const moduleFile = path.join(siteRoot, "advertising-products/placeholder-media.mjs");
const MAX_EDGE = 960;
const SEGMENT_SECONDS = 2.5;
const FADE_SECONDS = 0.5;
const FPS = 24;
// Vùng crop giả lập "góc chụp khác" trên cùng một ảnh: [tỷ lệ giữ lại, neo x, neo y].
const CROPS = [[1, 0.5, 0.5], [0.82, 0.2, 0.3], [0.78, 0.8, 0.6], [0.86, 0.5, 0.1], [0.8, 0.1, 0.9], [0.84, 0.9, 0.2]];

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const ffmpeg = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);
const sourceFile = (src) => path.join(siteRoot, src);
const sameRatio = (a, b) => BigInt(a.width) * BigInt(b.height) === BigInt(a.height) * BigInt(b.width);

// Kích thước output giữ đúng tỷ lệ tối giản của cover (validator so tỷ lệ chính xác), cạnh dài tới MAX_EDGE.
// even: video H.264 yuv420p cần hai cạnh chẵn.
function outputSize({ width, height }, even = false) {
  const divisor = gcd(width, height);
  const [a, b] = [width / divisor, height / divisor];
  const step = even && (a % 2 || b % 2) ? 2 : 1;
  const k = Math.max(step, Math.floor(MAX_EDGE / Math.max(a, b) / step) * step);
  return { width: a * k, height: b * k };
}

const cropFilter = ([keep, ax, ay], { width, height }) =>
  `crop=iw*${keep}:ih*${keep}:(iw-iw*${keep})*${ax}:(ih-ih*${keep})*${ay},scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1`;

// Chọn 1/3 card theo hash id để trải đều các cụm và ổn định giữa các lần chạy.
const hashOf = (id) => createHash("sha1").update(id).digest("hex");
const chosen = [...ADVERTISING_MEDIA_MANIFEST].sort((a, b) => hashOf(a.id).localeCompare(hashOf(b.id)))
  .slice(0, Math.ceil(ADVERTISING_MEDIA_MANIFEST.length / 3));

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const result = {};
chosen.forEach((card, index) => {
  // 5 card đầu từ 7 item để có bộ đếm; còn lại 3 tới 5 item để có hàng chấm. Mỗi card thứ ba có một video.
  const total = index < 5 ? 7 + (index % 3) : 3 + (index % 3);
  // Tỷ lệ tối giản quá lớn thì video phải gần full size; bỏ video cho card đó để giữ file nhẹ.
  const videoSize = outputSize(card.media, true);
  const withVideo = index % 3 === 0 && Math.max(videoSize.width, videoSize.height) <= 1280;
  const peers = ADVERTISING_MEDIA_MANIFEST.filter((other) => other.id !== card.id && other.productKey === card.productKey);
  const ratioPeers = peers.filter((other) => sameRatio(other.media, card.media));
  const imageSize = outputSize(card.media);
  const items = [];

  for (let n = 0; items.length < total - 1 - (withVideo ? 1 : 0); n += 1) {
    // Ưu tiên ảnh khác cùng sản phẩm, cùng tỷ lệ; hết thì nhân bản cover với vùng crop khác.
    const base = ratioPeers[n] ?? card;
    const crop = base === card ? CROPS[(n % (CROPS.length - 1)) + 1] : CROPS[0];
    const id = `${card.id}-p${items.length + 2}`;
    const file = path.join(outputDir, `${id}.webp`);
    ffmpeg(["-i", sourceFile(base.media.src), "-vf", cropFilter(crop, imageSize), "-quality", "72", file]);
    items.push({
      id, kind: "image", src: `${outputUrl}/${id}.webp`, sourceId: `placeholder:${id}`, ...imageSize,
      // Alt riêng từng media (media-seo R3): thêm số ảnh vào alt gốc.
      altVi: `${base.media.altVi} (ảnh ${items.length + 2})`, altEn: `${base.media.altEn} (photo ${items.length + 2})`, source: `${outputUrl}/${id}.webp`, sha256: sha256(file),
      provenance: `Placeholder; re-encoded from ${base.media.src}; replace with real product media.`,
    });
  }

  if (withVideo) {
    const frames = [card, ...peers].slice(0, 4);
    const shots = frames.length > 1 ? frames.map((frame) => [frame, CROPS[0]]) : CROPS.slice(0, 3).map((crop) => [card, crop]);
    const id = `${card.id}-v1`;
    const file = path.join(outputDir, `${id}.mp4`);
    const poster = path.join(outputDir, `${id}-poster.webp`);
    const segmentFrames = Math.round(SEGMENT_SECONDS * FPS);
    // Mỗi ảnh zoom chậm trong một đoạn, các đoạn nối bằng crossfade.
    const segments = shots.map(([frame, crop], i) =>
      `[${i}:v]${cropFilter(crop, { width: videoSize.width * 2, height: videoSize.height * 2 })},zoompan=z='min(zoom+0.0012,1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${segmentFrames}:s=${videoSize.width}x${videoSize.height}:fps=${FPS},format=yuv420p[s${i}]`);
    let last = "s0";
    shots.slice(1).forEach((_, i) => {
      const offset = (i + 1) * (SEGMENT_SECONDS - FADE_SECONDS);
      segments.push(`[${last}][s${i + 1}]xfade=transition=fade:duration=${FADE_SECONDS}:offset=${offset.toFixed(2)}[x${i + 1}]`);
      last = `x${i + 1}`;
    });
    ffmpeg([...shots.flatMap(([frame]) => ["-i", sourceFile(frame.media.src)]), "-filter_complex", segments.join(";"),
      "-map", `[${last}]`, "-an", "-c:v", "libx264", "-crf", "32", "-preset", "slow", "-movflags", "+faststart", file]);
    ffmpeg(["-i", file, "-frames:v", "1", "-quality", "72", poster]);
    const durationSeconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
    items.splice(0, 0, {
      id, kind: "video", src: `${outputUrl}/${id}.mp4`, sourceId: `placeholder:${id}`, ...videoSize,
      altVi: `Video minh họa: ${card.titleVi}`, altEn: `Illustrative video: ${card.titleEn}`,
      source: `${outputUrl}/${id}.mp4`, sha256: sha256(file),
      provenance: `Placeholder slideshow built with ffmpeg from ${frames.map((frame) => frame.id).join(", ")}; replace with real product video.`,
      posterSrc: `${outputUrl}/${id}-poster.webp`, posterWidth: videoSize.width, posterHeight: videoSize.height,
      durationSeconds: Math.round(durationSeconds * 100) / 100, hasAudio: false,
    });
  }
  result[card.id] = items;
});

writeFileSync(moduleFile, [
  "// Sinh bởi scripts/site/build-placeholder-media.mjs; không sửa tay.",
  "// ponytail: media tạm cho 1/3 card, thay bằng media nhiều góc thật rồi xóa file này.",
  `export const PLACEHOLDER_MEDIA_ITEMS = ${JSON.stringify(result, null, 1)};`,
  "",
].join("\n"));
console.log(`placeholder media: ${chosen.length} cards, ${Object.values(result).flat().length} items`);
