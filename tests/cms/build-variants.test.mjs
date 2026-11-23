// CMS variants job (CMS plan P3 item 6): scripts/cms/build-variants.mjs on small sharp-made images served like media-original.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
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
  await writeFile(path.join(work, "aws"), `#!/bin/sh\ntouch "${path.join(work, "aws-called")}"\n`);
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

function runScript(items) {
  const env = { ...process.env, ITEMS: JSON.stringify(items), CMS_ADMIN_ORIGIN: origin, CMS_ACCESS_CLIENT_ID: "client", CMS_ACCESS_CLIENT_SECRET: "secret", PATH: `${work}${path.delimiter}${process.env.PATH}` };
  delete env.R2_PUBLIC_BUCKET;
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
