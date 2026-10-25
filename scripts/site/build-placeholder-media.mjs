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
// Vị trí video (đếm từ 0, vị trí 0 là ảnh cover) của card video rải rác, xen kẽ hai kiểu.
const SCATTERED_SLOTS = [[2, 5], [1, 3, 6]];
let singles = 0;
let scattered = 0;
chosen.forEach((card, index) => {
  // Tỷ lệ tối giản quá lớn thì video phải gần full size; bỏ video cho card đó để giữ file nhẹ.
  const videoSize = outputSize(card.media, true);
  const videoFits = Math.max(videoSize.width, videoSize.height) <= 1280;
  // 5 card đầu 7 tới 9 ảnh; card 5 tới 9 làm được video thành 6 tới 9 item với 2 hoặc 3 video trộn ảnh (owner 2026-10-18:
  // một card có nhiều video, nhiều ảnh; từ 6 media có bộ đếm); còn lại 3 tới 5 item, mỗi card thứ ba có một video.
  // Từ card 10, card làm được video: 4 card chỉ một video, 4 card 7 media có video rải rác (owner 2026-10-24).
  const single = index >= 10 && videoFits && singles < 4 && ++singles > 0;
  const slots = !single && index >= 10 && videoFits && scattered < 4 ? SCATTERED_SLOTS[scattered++ % 2] : null;
  const rich = (index >= 5 && index < 10 && videoFits) || Boolean(slots);
  const total = single ? 1 : slots ? 7 : index < 5 ? 7 + (index % 3) : rich ? 6 + (index % 4) : 3 + (index % 3);
  const videoCount = single ? 1 : slots ? slots.length : rich ? 2 + (index % 2) : index % 3 === 0 && videoFits ? 1 : 0;
  const peers = ADVERTISING_MEDIA_MANIFEST.filter((other) => other.id !== card.id && other.productKey === card.productKey);
  const ratioPeers = peers.filter((other) => sameRatio(other.media, card.media));
  const imageSize = outputSize(card.media);
  const items = [];
  const videos = [];

  for (let n = 0; items.length < total - (single ? 0 : 1) - videoCount; n += 1) {
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

  for (let v = 0; v < videoCount; v += 1) {
    // Video thứ v xoay vòng ảnh nguồn và vùng crop để các video trong một card khác nhau.
    const pool = [card, ...peers];
    const frames = [...pool.slice(v % pool.length), ...pool.slice(0, v % pool.length)].slice(0, 4);
    const shots = frames.length > 1 ? frames.map((frame) => [frame, CROPS[v % CROPS.length]])
      : [0, 1, 2].map((i) => [card, CROPS[(i + v) % CROPS.length]]);
    const id = `${card.id}-v${v + 1}`;
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
    // -g 12: keyframe mỗi 0,5s ở 24fps để tua mượt (primary-video-player R3).
    // Video đầu của card nhiều video mang một nốt trầm nhỏ để demo hiện nút tiếng và thanh âm lượng (media-card Gate).
    const hasAudio = rich && v === 0;
    const audio = hasAudio ? ["-f", "lavfi", "-i", "sine=frequency=220:sample_rate=48000,volume=0.15"] : [];
    ffmpeg([...shots.flatMap(([frame]) => ["-i", sourceFile(frame.media.src)]), ...audio, "-filter_complex", segments.join(";"),
      "-map", `[${last}]`, ...(hasAudio ? ["-map", `${shots.length}:a`, "-c:a", "aac", "-b:a", "48k", "-shortest"] : ["-an"]),
      // yuv420p: xfade xuất 4:4:4, mà chip giải mã của GPU chỉ nhận H.264 4:2:0 (đo PC 2026-10-25: video tạm giải mã bằng CPU).
      "-c:v", "libx264", "-crf", "32", "-preset", "slow", "-g", "12", "-pix_fmt", "yuv420p", "-movflags", "+faststart", file]);
    ffmpeg(["-i", file, "-frames:v", "1", "-quality", "72", poster]);
    const durationSeconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
    videos.push({
      id, kind: "video", src: `${outputUrl}/${id}.mp4`, sourceId: `placeholder:${id}`, ...videoSize,
      altVi: `Video minh họa${v ? ` ${v + 1}` : ""}: ${card.titleVi}`, altEn: `Illustrative video${v ? ` ${v + 1}` : ""}: ${card.titleEn}`,
      source: `${outputUrl}/${id}.mp4`, sha256: sha256(file),
      provenance: `Placeholder slideshow built with ffmpeg from ${frames.map((frame) => frame.id).join(", ")}; replace with real product video.`,
      posterSrc: `${outputUrl}/${id}-poster.webp`, posterWidth: videoSize.width, posterHeight: videoSize.height,
      durationSeconds: Math.round(durationSeconds * 100) / 100, hasAudio,
    });
  }
  // Thứ tự đầy đủ, ảnh cover giữ chỗ bằng `kind: "cover"` (media-manifest.mjs thay bằng ảnh thật). Card theo luật cũ:
  // video trước, rồi cover, rồi ảnh.
  const cover = { id: card.id, kind: "cover" };
  if (single) result[card.id] = videos;
  else if (slots) {
    const order = [cover, ...items];
    slots.forEach((slot, v) => order.splice(slot, 0, videos[v]));
    result[card.id] = order;
  } else result[card.id] = [...videos, cover, ...items];
});

writeFileSync(moduleFile, [
  "// Sinh bởi scripts/site/build-placeholder-media.mjs; không sửa tay.",
  "// ponytail: media tạm cho 1/3 card, thay bằng media nhiều góc thật rồi xóa file này.",
  `export const PLACEHOLDER_MEDIA_ITEMS = ${JSON.stringify(result, null, 1)};`,
  "",
].join("\n"));
console.log(`placeholder media: ${chosen.length} cards, ${Object.values(result).flat().length} items`);
