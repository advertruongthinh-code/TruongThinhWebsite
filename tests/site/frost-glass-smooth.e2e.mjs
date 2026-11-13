// Frosted glass of the reveal is round, not blocky (advertising-skeleton R5, owner option B 2026-11-13): the 20px copy stretched by the
// Flow shader must have no kinks at its pixel centres. Draws the real shader at full frost over a random 20x30 copy and measures, along
// every row, the largest change of slope (second difference) relative to the largest slope. Linear stretching puts the whole slope change
// of a source pixel into one canvas pixel; the B-spline spreads it over the source pixel's width.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { SKELETON_FLOW_FRAGMENT_SHADER } from "../../src/site/masonry/skeleton-flow.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  args: ["--ignore-gpu-blocklist", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

try {
  const page = await browser.newPage();
  const kink = await page.evaluate((fragment) => {
    const width = 400;
    const height = 600;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
    const shader = (type, source) => {
      const node = gl.createShader(type);
      gl.shaderSource(node, source);
      gl.compileShader(node);
      if (!gl.getShaderParameter(node, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(node));
      return node;
    };
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER,
      "attribute vec2 aPosition; varying vec2 vUv; void main() { vUv = aPosition * 0.5 + 0.5; gl_Position = vec4(aPosition, 0.0, 1.0); }"));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = (unit, w, h, format, pixels) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, format, w, h, 0, format, gl.UNSIGNED_BYTE, pixels);
      for (const name of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, name, gl.LINEAR);
      for (const name of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, name, gl.CLAMP_TO_EDGE);
    };
    // Mid-gray grain leaves overlay blending unchanged, so only the stretched copy shows.
    texture(0, 1, 1, gl.LUMINANCE, new Uint8Array([128]));
    let seed = 7;
    const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 0x1_0000_0000;
    texture(1, 20, 30, gl.RGBA, Uint8Array.from({ length: 20 * 30 * 4 }, (_, index) => (index % 4 === 3 ? 255 : Math.round(random() * 255))));
    const uniform = (name) => gl.getUniformLocation(program, name);
    gl.uniform1i(uniform("uNoise"), 0);
    gl.uniform1i(uniform("uTiny"), 1);
    gl.uniform1f(uniform("uScale"), 50);
    gl.uniform4f(uniform("uBalances"), 1, 1, 1, 1);
    gl.uniform1f(uniform("uFrost"), 1);
    gl.uniform2f(uniform("uTinySize"), 20, 30);
    gl.uniform4f(uniform("uTinyBox"), 0, 0, 1, 1);
    gl.uniform2f(uniform("uTinyCover"), 1, 1);
    gl.viewport(0, 0, width, height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let slope = 0;
    let bend = 0;
    for (let y = 40; y < height - 40; y += 7) {
      const row = Array.from({ length: width }, (_, x) => pixels[(y * width + x) * 4 + 1]);
      for (let x = 21; x < width - 21; x += 1) {
        slope = Math.max(slope, Math.abs(row[x + 1] - row[x]));
        bend = Math.max(bend, Math.abs(row[x + 1] - 2 * row[x] + row[x - 1]));
      }
    }
    return bend / slope;
  }, SKELETON_FLOW_FRAGMENT_SHADER);
  // Measured in headless Chromium (SwiftShader): the old linear 4-tap copy 0.67, the B-spline 0.33.
  assert.ok(kink < 0.5, `frosted glass has kinks at the copy's pixel centres: bend/slope ${kink.toFixed(2)}`);
  console.log(`frost-glass-smooth: bend/slope ${kink.toFixed(2)}`);
} finally {
  await browser.close();
}
