import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import sharp from "sharp";

import { dominant, mediaColors, palette } from "../../scripts/site/image-palette.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { MEDIA_COLORS } = await import(pathToFileURL(path.join(root, "src/site/media-lib/colors.mjs")).href);

// advertising-skeleton R3: an image synthesizing four color patches (different areas) yields exactly four colors, ordered light to dark.
const blocks = [[[20, 30, 200], 700], [[240, 230, 210], 300], [[200, 40, 40], 500], [[30, 20, 10], 900]];
const pixels = Uint8Array.from(blocks.flatMap(([color, count]) => Array.from({ length: count }, () => color).flat()));
const result = palette(pixels);
assert.deepEqual(result, [[240, 230, 210], [200, 40, 40], [20, 30, 200], [30, 20, 10]]);
assert.deepEqual(palette(pixels), result, "running twice gives the same colours");

// An image with fewer than four colors does not break: it still returns four valid colors.
const flat = palette(Uint8Array.from(Array.from({ length: 64 }, () => [90, 90, 90]).flat()));
assert.equal(flat.length, 4);
assert(flat.every((color) => color.join() === "90,90,90"));

// Generated file: each image has a dominant card color and 4 Flow colors in hex.
const entries = Object.values(MEDIA_COLORS);
assert(entries.length > 0);
assert(entries.every((colors) => colors.length === 5 && colors.every((color) => /^#[0-9a-f]{6}$/.test(color))));

// dominant() is the sharp-free twin of sharp stats().dominant: same bins at every bin edge and the same winner on ties (fewer pixels than bins).
const solid = async (r, g, b, count = 1) => {
  const pixels = Buffer.alloc(count * 3);
  for (let index = 0; index < count; index += 1) pixels.set([r, g, b], index * 3);
  return pixels;
};
const viaSharp = async (pixels) => Object.values((await sharp(pixels, { raw: { width: pixels.length / 3, height: 1, channels: 3 } }).stats()).dominant);
for (let value = 0; value < 256; value += 1) {
  const pixels = await solid(value, 255 - value, (value * 7) % 256);
  assert.deepEqual(dominant(pixels), await viaSharp(pixels), `bin edge ${value}`);
}
const tied = Buffer.from([250, 0, 0, 0, 250, 0, 0, 0, 250, 90, 90, 90, 0, 0, 0, 0, 250, 0]);
assert.deepEqual(dominant(tied), await viaSharp(tied), "tie between bins");
const rgba = Uint8Array.from([10, 20, 30, 255, 200, 190, 180, 0]);
assert.deepEqual(dominant(rgba, 4), dominant(Uint8Array.from([10, 20, 30, 200, 190, 180])), "alpha is ignored");

// Same function on committed images gives the committed entries (the build contract: dominant from full-size pixels, Flow colors from the 64px thumbnail).
const advertising = path.join(root, "src/site/assets/content/projects/advertising");
const samples = readdirSync(advertising, { recursive: true }).filter((name) => name.endsWith(".webp") && MEDIA_COLORS[path.basename(name, ".webp")]);
assert(samples.length > 0);
for (const name of [samples[0], samples[Math.floor(samples.length / 2)], samples.at(-1)]) {
  const file = path.join(advertising, name);
  const [full, thumb] = await Promise.all([sharp(file).removeAlpha().raw().toBuffer(), sharp(file).resize(64).removeAlpha().raw().toBuffer()]);
  assert.deepEqual(mediaColors({ full, thumb }), MEDIA_COLORS[path.basename(name, ".webp")], name);
}
