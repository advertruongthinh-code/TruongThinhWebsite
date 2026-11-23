// CMS variants job (CMS plan P3 item 6): scripts/cms/build-variants.mjs on small sharp-made images served like media-original.
import assert from "node:assert/strict";
import { execFile, execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SCRIPT = fileURLToPath(new URL("../../scripts/cms/build-variants.mjs", import.meta.url));
const originals = new Map();
let server, origin, work;

before(async () => {
  work = await mkdtemp(path.join(os.tmpdir(), "cms-variants-"));
  // A fake aws on PATH leaves a marker, so a test can prove the script never called it.
  await writeFile(path.join(work, "aws"), `#!/bin/sh\necho "$@" >> "${path.join(work, "aws-called")}"\n`);
  await chmod(path.join(work, "aws"), 0o755);
  server = createServer((request, response) => {
    const bytes = originals.get(new URL(request.url, "http://x").searchParams.get("id"));
    if (!bytes || request.headers["cf-access-client-id"] !== "client") return response.writeHead(404).end();
    response.writeHead(200, { "X-Hash": `md5:${createHash("md5").update(bytes).digest("hex")}` }).end(bytes);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.close();
  await rm(work, { recursive: true, force: true });
});

function runScript(items, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv, ITEMS: JSON.stringify(items), CMS_ADMIN_ORIGIN: origin, CMS_ACCESS_CLIENT_ID: "client", CMS_ACCESS_CLIENT_SECRET: "secret", PATH: `${work}${path.delimiter}${extraEnv.PATH ?? process.env.PATH}` };
  env.R2_PUBLIC_BUCKET = extraEnv.R2_PUBLIC_BUCKET ?? "";
  return new Promise((resolve) => execFile(process.execPath, [SCRIPT], { cwd: work, env }, (error, stdout, stderr) => resolve({ code: error ? error.code : 0, stdout, stderr })));
}

const keyOf = (stdout) => stdout.match(/^ok \S+ ([0-9a-f]{32}) [\d.]+s$/m)?.[1];
const manifestOf = async (key) => JSON.parse(await readFile(path.join(work, ".tmp/variants", key, "manifest.json"), "utf8"));
const pixels = (width, height) => sharp({ create: { width, height, channels: 3, background: { r: 180, g: 90, b: 40 } } });

test("a 1200 x 800 WebP cropped to 800 x 800 gives the Q6 files without 960, and a manifest with 6 colors; aws is never called", async () => {
  originals.set("wide-01", await pixels(1200, 800).webp().toBuffer());
  const { code, stdout, stderr } = await runScript([{ m: "wide-01", c: [100, 0, 800, 800] }]);
  assert.equal(code, 0, stdout + stderr);
  const key = keyOf(stdout);
  assert.ok(key, stdout);
  const jxl = !stderr.includes("cjxl missing");
  const expected = ["wide-01", "wide-01-240", "wide-01-480"].flatMap((stem) => ["webp", "avif", ...(jxl ? ["jxl"] : [])].map((ext) => `${stem}.${ext}`));
  assert.deepEqual((await readdir(path.join(work, ".tmp/variants", key))).sort(), [...expected, "manifest.json"].sort());
  const manifest = await manifestOf(key);
  assert.deepEqual([manifest.recipe, manifest.key, manifest.mediaId, manifest.width, manifest.height, manifest.sourceWidth, manifest.sourceHeight], [1, key, "wide-01", 800, 800, 1200, 800]);
  assert.deepEqual(manifest.crop, [100, 0, 800, 800]);
  assert.match(manifest.hash, /^md5:[0-9a-f]{32}$/);
  assert.equal(manifest.colors.length, 6);
  assert.equal(manifest.files.length, expected.length);
  assert.equal(existsSync(path.join(work, "aws-called")), false);
});

test("a JPEG stored 800 x 1200 with EXIF orientation 6 measures 1200 x 800 and its variants carry no orientation or EXIF", async () => {
  originals.set("phone-01", await pixels(800, 1200).jpeg().withMetadata({ orientation: 6 }).toBuffer());
  const { code, stdout, stderr } = await runScript([{ m: "phone-01", c: [0, 0, 1200, 800] }]);
  assert.equal(code, 0, stdout + stderr);
  const key = keyOf(stdout);
  const manifest = await manifestOf(key);
  assert.deepEqual([manifest.sourceWidth, manifest.sourceHeight, manifest.width, manifest.height], [1200, 800, 1200, 800]);
  const meta = await sharp(path.join(work, ".tmp/variants", key, "phone-01.webp")).metadata();
  assert.deepEqual([meta.width, meta.height, meta.orientation, meta.exif], [1200, 800, undefined, undefined]);
});

test("a crop beyond the image prints error and exits 1", async () => {
  originals.set("small-01", await pixels(300, 200).webp().toBuffer());
  const { code, stdout } = await runScript([{ m: "small-01", c: [0, 0, 301, 200] }]);
  assert.equal(code, 1);
  assert.equal(stdout.trim(), "error small-01 crop");
});

// Video items (P10): sources made with ffmpeg; skipped on a machine without it.
const noFfmpeg = spawnSync("ffmpeg", ["-version"]).status !== 0 && "ffmpeg not installed";
const ffmpeg = (...args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { cwd: work });

test("a 960 x 540 video with a GPS tag gives HLS rungs 240, 480, 960 without 1920, a video manifest, and no location tag; originals are removed", { skip: noFfmpeg }, async () => {
  const file = path.join(work, "gps.mp4");
  ffmpeg("-f", "lavfi", "-i", "testsrc=size=960x540:rate=30", "-t", "4", "-metadata", "location=+10.7626+106.6602/", "-pix_fmt", "yuv420p", file);
  originals.set("clip-01", await readFile(file));
  const { code, stdout, stderr } = await runScript([{ m: "clip-01", c: [0, 0, 960, 540], k: "video" }]);
  assert.equal(code, 0, stdout + stderr);
  const key = keyOf(stdout);
  assert.ok(key, stdout);
  const dir = path.join(work, ".tmp/variants", key);
  assert.deepEqual((await readdir(dir)).sort(), ["240.m3u8", "240.mp4", "480.m3u8", "480.mp4", "960.m3u8", "960.mp4", "manifest.json", "master.m3u8"]);
  const manifest = await manifestOf(key);
  assert.deepEqual([manifest.recipe, manifest.key, manifest.mediaId, manifest.kind, manifest.sourceWidth, manifest.sourceHeight, manifest.hasAudio, manifest.rungs], [1, key, "clip-01", "video", 960, 540, false, [240, 480, 960]]);
  assert.ok(Math.abs(manifest.duration - 4) < 0.5);
  assert.deepEqual(manifest.files.map((item) => item.name), (await readdir(dir)).filter((name) => name !== "manifest.json").sort());
  const tags = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-of", "json", "-show_entries", "format_tags", path.join(dir, "960.mp4")]).toString());
  assert.equal(JSON.stringify(tags).includes("location"), false, "no location tag in the output");
  assert.equal(existsSync(path.join(work, ".tmp/variants-src/clip-01.mp4")), false);
});

test("with a bucket a video uploads *.mp4, then *.m3u8, then manifest.json with no-store", { skip: noFfmpeg }, async () => {
  await rm(path.join(work, "aws-called"), { force: true });
  const { code, stdout, stderr } = await runScript([{ m: "clip-01", c: [0, 0, 960, 540], k: "video" }], { R2_PUBLIC_BUCKET: "pub", R2_ENDPOINT: "http://r2" });
  assert.equal(code, 0, stdout + stderr);
  const calls = (await readFile(path.join(work, "aws-called"), "utf8")).trim().split("\n");
  assert.equal(calls.length, 3);
  assert.match(calls[0], /--include \*\.mp4 --content-type video\/mp4 --cache-control public, max-age=31536000, immutable /);
  assert.match(calls[1], /--include \*\.m3u8 --content-type application\/vnd\.apple\.mpegurl /);
  assert.match(calls[2], /manifest\.json s3:\/\/pub\/v\/[0-9a-f]{32}\/manifest\.json --cache-control no-store /);
});

test("an audio-only file prints error no-video and exits 1", { skip: noFfmpeg }, async () => {
  const file = path.join(work, "tone.m4a");
  ffmpeg("-f", "lavfi", "-i", "sine=duration=1", "-c:a", "aac", file);
  originals.set("tone-01", await readFile(file));
  const { code, stdout } = await runScript([{ m: "tone-01", c: [0, 0, 960, 540], k: "video" }]);
  assert.equal(code, 1);
  assert.equal(stdout.trim(), "error tone-01 no-video");
});

test("a video crop other than the measured frame prints error size and uploads nothing", { skip: noFfmpeg }, async () => {
  await rm(path.join(work, "aws-called"), { force: true });
  const { code, stdout } = await runScript([{ m: "clip-01", c: [0, 0, 1920, 1080], k: "video" }], { R2_PUBLIC_BUCKET: "pub", R2_ENDPOINT: "http://r2" });
  assert.equal(code, 1);
  assert.equal(stdout.trim(), "error clip-01 size");
  assert.equal(existsSync(path.join(work, "aws-called")), false);
});

test("a video longer than 601 s prints error too-long", { skip: noFfmpeg }, async () => {
  const file = path.join(work, "long.mp4");
  ffmpeg("-f", "lavfi", "-i", "color=size=320x180:rate=1", "-t", "605", "-pix_fmt", "yuv420p", file);
  originals.set("long-01", await readFile(file));
  const { code, stdout } = await runScript([{ m: "long-01", c: [0, 0, 320, 180], k: "video" }]);
  assert.equal(code, 1);
  assert.equal(stdout.trim(), "error long-01 too-long");
});

test("ffprobe, ffmpeg and the ladder script never see the Access secret", { skip: noFfmpeg }, async () => {
  const spy = await mkdtemp(path.join(os.tmpdir(), "cms-spy-"));
  const seen = path.join(spy, "env.txt");
  for (const tool of ["ffprobe", "ffmpeg"]) {
    const real = execFileSync("sh", ["-c", `command -v ${tool}`]).toString().trim();
    await writeFile(path.join(spy, tool), `#!/bin/sh\nenv >> "${seen}"\nexec "${real}" "$@"\n`);
    await chmod(path.join(spy, tool), 0o755);
  }
  try {
    const { code, stdout, stderr } = await runScript([{ m: "clip-01", c: [0, 0, 960, 540], k: "video" }], { PATH: `${spy}${path.delimiter}${process.env.PATH}` });
    assert.equal(code, 0, stdout + stderr);
    const text = await readFile(seen, "utf8");
    assert.ok(text.includes("PATH="), "the spy ran");
    assert.equal(/secret|CMS_ACCESS|ITEMS=/.test(text), false);
  } finally {
    await rm(spy, { recursive: true, force: true });
  }
});
