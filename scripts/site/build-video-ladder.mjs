#!/usr/bin/env node
// Generates the HLS quality ladder for one video (video-delivery R1, R2): one fMP4 file per rung with a byte-range playlist, plus
// master.m3u8. Does not modify card data (R5).
// Usage: node scripts/site/build-video-ladder.mjs <source video> <output dir> (needs ffmpeg, ffprobe in PATH).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const [source, outDir] = process.argv.slice(2).map((arg) => arg && path.resolve(arg));
if (!source || !outDir) throw new Error("usage: build-video-ladder.mjs <source video> <output dir>");
const CRF = { 240: 30, 480: 28, 960: 30, 1920: 28 };
// cwd is the output dir so playlists reference files by relative name.
const ffmpeg = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { cwd: outDir });
const probe = (file, args) => JSON.parse(execFileSync("ffprobe", ["-v", "error", "-of", "json", ...args, file]).toString());

const { streams } = probe(source, ["-show_entries", "stream=codec_type,codec_name,profile,pix_fmt,width,r_frame_rate"]);
const video = streams.find((stream) => stream.codec_type === "video");
const fps = video.r_frame_rate.split("/").reduce((num, den) => num / den);
const hasAudio = streams.some((stream) => stream.codec_type === "audio");
const keyTimes = probe(source, ["-select_streams", "v:0", "-skip_frame", "nokey", "-show_entries", "frame=pts_time"]).frames
  .map((frame) => Number(frame.pts_time));
// Copy the stream only when the source is already H.264 High 4:2:0 with keyframes at every 0.5 s multiple like the re-encoded rungs, so segments of all rungs
// cut at the same time.
const copyable = video.codec_name === "h264" && video.profile === "High" && video.pix_fmt === "yuv420p"
  && keyTimes.every((time, index) => Math.abs(time - index * 0.5) < 1e-3);
const tiers = Object.keys(CRF).map(Number).filter((width) => width <= video.width);

mkdirSync(outDir, { recursive: true });
// Audio is encoded once then copied into every rung so rung switches have no audible click (R4).
if (hasAudio) ffmpeg(["-i", source, "-vn", "-c:a", "aac", "-b:a", "48k", "audio.m4a"]);
for (const width of tiers) {
  const encode = width === video.width && copyable ? ["-c:v", "copy"] : ["-vf", `scale=${width}:-2`, "-c:v", "libx264",
    "-profile:v", "high", "-crf", String(CRF[width]), "-preset", "slow", "-pix_fmt", "yuv420p",
    // Force a keyframe at every 0.5 s multiple so segments cut at the same place; -g sets the GOP cadence for rate control (without it the file is 9% larger).
    "-force_key_frames", "expr:gte(t,n_forced*0.5)", "-g", String(Math.round(fps / 2)), "-sc_threshold", "0"];
  ffmpeg(["-i", source, ...(hasAudio ? ["-i", "audio.m4a", "-map", "1:a:0", "-c:a", "copy"] : []), "-map", "0:v:0", ...encode,
    "-f", "hls", "-hls_time", "2", "-hls_playlist_type", "vod", "-hls_segment_type", "fmp4", "-hls_flags", "single_file",
    "-hls_segment_filename", `${width}.mp4`, `${width}.m3u8`]);
}
if (hasAudio) rmSync(path.join(outDir, "audio.m4a"));

// Bitrate is computed from real segment bytes: ffmpeg only writes the audio bitrate when encoding with CRF (R2).
const variants = tiers.map((width) => {
  const segments = [...readFileSync(path.join(outDir, `${width}.m3u8`), "utf8").matchAll(/#EXTINF:([\d.]+),\s*#EXT-X-BYTERANGE:(\d+)@/g)]
    .map(([, seconds, bytes]) => [Number(seconds), Number(bytes) * 8]);
  const peak = Math.ceil(Math.max(...segments.map(([seconds, bits]) => bits / seconds)));
  const average = Math.ceil(segments.reduce((sum, [, bits]) => sum + bits, 0) / segments.reduce((sum, [seconds]) => sum + seconds, 0));
  const [stream] = probe(path.join(outDir, `${width}.mp4`), ["-select_streams", "v:0", "-show_entries", "stream=width,height,level"]).streams;
  const codecs = [`avc1.6400${stream.level.toString(16).padStart(2, "0")}`, ...(hasAudio ? ["mp4a.40.2"] : [])].join(",");
  return { width, line: `#EXT-X-STREAM-INF:BANDWIDTH=${peak},AVERAGE-BANDWIDTH=${average},CODECS="${codecs}",`
    + `RESOLUTION=${stream.width}x${stream.height},FRAME-RATE=${fps.toFixed(3)}\n${width}.m3u8` };
});
// The 960 rung (or the largest rung) goes first because hls.js loads the first playlist rung first, the rest ascending.
const first = tiers.includes(960) ? 960 : Math.max(...tiers);
const ordered = [...variants.filter(({ width }) => width === first), ...variants.filter(({ width }) => width !== first)];
writeFileSync(path.join(outDir, "master.m3u8"), ["#EXTM3U", "#EXT-X-VERSION:7", "#EXT-X-INDEPENDENT-SEGMENTS",
  ...ordered.map(({ line }) => line), ""].join("\n"));
