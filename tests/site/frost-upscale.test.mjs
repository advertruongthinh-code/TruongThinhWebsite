// Strip-lane frost upscale (media-card R5, owner option B 2026-11-13): the 20px copy drawn 4 times larger by a cubic B-spline is round
// (no kinks at the copy's pixel centres), keeps flat colour flat, and is cheap enough to run mid-slide.
import assert from "node:assert/strict";
import { test } from "node:test";

import { bsplineUpscale } from "../../src/site/masonry/skeleton-flow.mjs";

let seed = 7;
const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 0x1_0000_0000;
const copy = Uint8ClampedArray.from({ length: 20 * 30 * 4 }, (_, index) => (index % 4 === 3 ? 255 : Math.round(random() * 255)));

test("flat colour stays flat and alpha stays opaque", () => {
  const flat = new Uint8ClampedArray(20 * 30 * 4).fill(200);
  const out = bsplineUpscale(flat, 20, 30, 4);
  assert.equal(out.length, 80 * 120 * 4);
  assert.ok(out.every((value) => Math.abs(value - 200) <= 1));
  assert.ok(bsplineUpscale(copy, 20, 30, 4).filter((_, index) => index % 4 === 3).every((value) => value === 255));
});

test("rows bend smoothly at the copy's pixel centres", () => {
  // Upscale 4x then stretch linearly 5x more, as CSS does over a 400px lane, and bound bend/slope like frost-glass-smooth.e2e.mjs.
  const out = bsplineUpscale(copy, 20, 30, 4);
  let slope = 0;
  let bend = 0;
  for (let y = 10; y < 110; y += 7) {
    const row = Array.from({ length: 400 }, (_, x) => {
      const position = (x + 0.5) / 5 - 0.5;
      const left = Math.max(0, Math.min(79, Math.floor(position)));
      const right = Math.min(79, left + 1);
      const f = Math.min(1, Math.max(0, position - left));
      return Math.round((1 - f) * out[(y * 80 + left) * 4 + 1] + f * out[(y * 80 + right) * 4 + 1]);
    });
    for (let x = 21; x < 379; x += 1) {
      slope = Math.max(slope, Math.abs(row[x + 1] - row[x]));
      bend = Math.max(bend, Math.abs(row[x + 1] - 2 * row[x] + row[x - 1]));
    }
  }
  assert.ok(bend / slope < 0.5, `bend/slope ${(bend / slope).toFixed(2)}`);
});

test("upscale stays well under one frame", () => {
  bsplineUpscale(copy, 20, 30, 4);
  const start = performance.now();
  for (let run = 0; run < 20; run += 1) bsplineUpscale(copy, 20, 30, 4);
  const each = (performance.now() - start) / 20;
  assert.ok(each < 4, `${each.toFixed(2)}ms per upscale`);
  console.log(`frost-upscale: ${each.toFixed(2)}ms per 20x30 copy`);
});
