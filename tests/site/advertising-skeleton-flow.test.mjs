import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as skeletonFlow from "../../src/site/advertising-products/skeleton-flow.mjs";
import {
  SKELETON_FLOW_FRAGMENT_SHADER,
  SKELETON_FLOW_PRESETS,
  advanceSkeletonFlowPhase,
  createSkeletonFlowRenderer,
  createSkeletonFlowFrameLayout,
  parseSkeletonFlowPreset,
  parseSkeletonFlowPresets,
  sampleSkeletonFlowColor,
  selectSkeletonFlowPreset,
} from "../../src/site/advertising-products/skeleton-flow.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const detailCss = await readFile(path.join(root, "src/site/detail.css"), "utf8");
const cssRule = (selector, occurrence = 0) => {
  const matches = [...detailCss.matchAll(new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`, "gm"))];
  const match = matches.at(occurrence);
  assert(match, `missing CSS rule ${selector}`);
  return match[1];
};
const skeletonRule = cssRule("\\.advertising-grid__cta-skeleton");
const frameRule = cssRule("\\.advertising-grid__cta-frame");
const surfaceRule = cssRule("\\.advertising-grid__cta-surface");
const flowRule = cssRule("\\.advertising-grid__cta-flow");
const globalBlurRule = cssRule("\\.detail-page \\.project-index:has\\(\\.advertising-grid__cta-skeleton:not\\(\\[hidden\\]\\)\\)::before");
const sharedGlassRule = cssRule("\\.detail-page \\.project-index:has\\(\\.advertising-grid__cta-skeleton:not\\(\\[hidden\\]\\)\\)::before,\\s*\\[data-advertising-photo-glass=\\\"true\\\"\\] \\.advertising-photo-view__hero-frame::after");
const sharedGlassTokensRule = cssRule("\\.detail-page \\.project-index:has\\(\\.advertising-grid__cta-skeleton\\),\\s*\\.advertising-photo-view__hero-frame");
const legacyWashRules = [...detailCss.matchAll(/\.advertising-grid__cta-skeleton::after\s*\{([\s\S]*?)\n\}/gm)]
  .map((match) => match[1]);

assert.doesNotMatch(skeletonRule, /(?:-webkit-)?mask-image/i,
  "R10 moves the skeleton opacity boundary into the global glass surface");
assert.match(skeletonRule, /pointer-events:\s*none\s*;/i,
  "R6 removes skeleton hover interaction at the container boundary");
assert.match(frameRule, /transition:\s*opacity 600ms ease-out(?:\s+0ms)?\s*;/i,
  "R6 requires the skeleton frame to reveal with opacity-only 600ms ease-out");
assert.doesNotMatch(frameRule, /\btransform\b|(?:-webkit-)?mask-image/i,
  "R6 forbids frame transform and per-frame mask");
assert.doesNotMatch(surfaceRule, /\banimation\b/i,
  "R6 forbids floating, scale, and hover-like skeleton surface motion");
assert.doesNotMatch(flowRule, /\bfilter\s*:/i,
  "R6 forbids a local blur/filter on each skeleton card");
assert.match(sharedGlassTokensRule, /--advertising-glass-blur:\s*28px;[\s\S]*--advertising-glass-saturation:\s*1\.08;[\s\S]*--advertising-glass-brightness:\s*1\.04;[\s\S]*--advertising-glass-tint:\s*rgba\(255, 255, 255, 0\.12\);/i,
  "R8 locks the exact shared glass tokens for both consumers");
assert.match(sharedGlassRule, /backdrop-filter:\s*blur\(var\(--advertising-glass-blur\)\)\s+saturate\(var\(--advertising-glass-saturation\)\)\s+brightness\(var\(--advertising-glass-brightness\)\)/i,
  "R8 requires the full shared glass filter before the skeleton-to-white boundary");
assert.match(globalBlurRule, /mask-image:\s*radial-gradient\(ellipse 150% 100% at 50% 100%, #000 72%, transparent 100%\)/i,
  "P7.4 requires a broad curved global glass boundary centered toward the footer");
assert.match(globalBlurRule, /left:\s*calc\(-1 \* var\(--advertising-outer\)\);/i,
  "R9 requires the skeleton glass to reach the viewport left edge");
assert.match(globalBlurRule, /width:\s*calc\(100% \+ \(2 \* var\(--advertising-outer\)\)\);/i,
  "R9 requires the skeleton glass to reach the viewport right edge");
assert.doesNotMatch(detailCss, /@keyframes\s+advertising-skeleton-float/i,
  "R6 removes the legacy floating skeleton keyframes");

const seededRandom = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x1_0000_0000;
};

const expectedPresets = [
  ["iridescent-cloud", ["#EAF4FC", "#1E50A2", "#F09199", "#895B8A"], [60, 10, 30], [0, 6]],
  ["opal", ["#F6F9FF", "#9BE0E8", "#C4B5F7", "#F8B8D9"], [46, 8, 24], [0, 5]],
  ["lagoon", ["#EAFBF7", "#5CE3E6", "#0F9CC2", "#274A78"], [44, 6, 26], [0, 5]],
  ["emerald", ["#F0FBEF", "#8FE3B0", "#22C79A", "#0B5F51"], [44, 6, 26], [0, 5]],
  ["solar-flare", ["#FFF6DE", "#FFC24B", "#F4664D", "#8A2E5E"], [52, 10, 28], [0, 6]],
  ["orchid", ["#FBEFFB", "#E794C9", "#9678CE", "#4A3894"], [46, 9, 26], [0, 5]],
  ["peach-glow", ["#FFF3EC", "#FFC9A3", "#F08A8C", "#B65E8C"], [48, 8, 28], [0, 5]],
  ["electric-tide", ["#DFFBFF", "#6FD8F2", "#4C5BE0", "#2A2450"], [60, 14, 32], [0, 6]],
  ["sunset", ["#FFE9C4", "#FFAE3F", "#F0574D", "#5D2A66"], [70, 16, 34], [0, 6]],
  ["mint-ice", ["#F2FDF9", "#A8F0DC", "#52CBB0", "#147A5F"], [55, 10, 30], [0, 6]],
  ["midnight-bloom", ["#12142E", "#4C3894", "#B387E8", "#F6C6E2"], [78, 22, 36], [0, 8]],
  ["rose-gold", ["#FFF4E8", "#FBC9AC", "#E79BA7", "#8E5A74"], [50, 8, 26], [0, 6]],
];

const expectedP100Anchors = [
  { x: 0.4071134869260332, y: 0.03 },
  { x: 0.6553617423853343, y: 0.03 },
  { x: 0.8886264187267703, y: 0.2744774758469444 },
  { x: 0.97, y: 0.97 },
];
const r10ContractFailures = [];

assert.equal(SKELETON_FLOW_PRESETS.length, 12, "Flow must expose the 12 accepted presets");
assert.equal(new Set(SKELETON_FLOW_PRESETS.map(({ id }) => id)).size, 12,
  "Flow preset IDs must be unique");
SKELETON_FLOW_PRESETS.forEach((preset, index) => {
  const [id, colors, field, finish] = expectedPresets[index];
  assert.deepEqual(Object.keys(preset).sort(), ["anchors", "bands", "colors", "field", "finish", "id"]);
  assert.equal(preset.id, id);
  assert.deepEqual(preset.colors, colors);
  assert.deepEqual(
    [preset.field.distortion, preset.field.swirl, preset.field.speed],
    field,
    `${preset.id}: R10 must preserve the accepted Feral Field values other than Scale`,
  );
  assert.deepEqual(Object.values(preset.finish), finish);
  assert.equal(preset.anchors.length, 4);
  assert.deepEqual(preset.bands, [0.25, 0.5, 0.75]);
  assert(Object.isFrozen(preset) && Object.isFrozen(preset.field)
    && Object.isFrozen(preset.anchors) && preset.anchors.every(Object.isFrozen),
  `${preset.id}: config must be immutable`);
  if (preset.field.scale !== 100) r10ContractFailures.push(`${preset.id}: Scale ${preset.field.scale}, expected 100`);
  if (JSON.stringify(preset.anchors) !== JSON.stringify(expectedP100Anchors)) {
    r10ContractFailures.push(`${preset.id}: anchors do not match frozen P100`);
  }
});

const unifiedGlassBackground = globalBlurRule.match(/\bbackground(?:-image)?\s*:\s*([^;]+);/i)?.[1] || "";
if (!/linear-gradient/i.test(unifiedGlassBackground)
  || !/--advertising-glass-tint/i.test(unifiedGlassBackground)
  || !/--advertising-cta-skeleton-fade-start/i.test(unifiedGlassBackground)
  || !/--advertising-cta-skeleton-glass-start/i.test(unifiedGlassBackground)
  || !/(?:#fff|rgb\(255,\s*255,\s*255\))\s+100%/i.test(unifiedGlassBackground)) {
  r10ContractFailures.push("global glass surface does not own clear-to-tint-to-pure-white background");
}
if (legacyWashRules.some((rule) => /\bbackground(?:-image)?\s*:/i.test(rule))) {
  r10ContractFailures.push("legacy skeleton-local white wash still exists outside the global glass surface");
}
assert.deepEqual(r10ContractFailures, [],
  "R10 requires Scale 100, frozen P100 anchors, and one global blur-before-white surface");

const exportedJson = JSON.stringify(SKELETON_FLOW_PRESETS);
assert.deepEqual(parseSkeletonFlowPresets(exportedJson), SKELETON_FLOW_PRESETS,
  "source presets must round-trip through the dev JSON parser");
assert.deepEqual(parseSkeletonFlowPreset(JSON.stringify(SKELETON_FLOW_PRESETS[0])),
  SKELETON_FLOW_PRESETS[0]);

const invalid = structuredClone(SKELETON_FLOW_PRESETS[0]);
invalid.colors.pop();
assert.throws(() => parseSkeletonFlowPreset(invalid), /colors/i);
invalid.colors.push("#000000");
invalid.anchors[0].x = 1.01;
assert.throws(() => parseSkeletonFlowPreset(invalid), /anchors/i);
invalid.anchors[0].x = 0.5;
invalid.bands = [0.25, 0.25, 0.75];
assert.throws(() => parseSkeletonFlowPreset(invalid), /bands/i);
invalid.bands = [0.25, 0.5, 0.75];
invalid.field.speed = 101;
assert.throws(() => parseSkeletonFlowPreset(invalid), /speed/i);
invalid.field.speed = 30;
invalid.finish.soften = 81;
assert.throws(() => parseSkeletonFlowPreset(invalid), /soften/i);
invalid.finish.soften = 0;
invalid.unknown = true;
assert.throws(() => parseSkeletonFlowPreset(invalid), /unknown/i);
assert.throws(() => parseSkeletonFlowPresets([SKELETON_FLOW_PRESETS[0]]), /12/);

const sequence = (seed) => {
  const random = seededRandom(seed);
  return Array.from({ length: 12 }, () => selectSkeletonFlowPreset(random).id);
};
assert.deepEqual(sequence(20260921), sequence(20260921),
  "seeded preset selection must be deterministic");
assert(new Set(sequence(20260921)).size > 1, "preset selection never varies");
assert.equal(selectSkeletonFlowPreset(() => -1).id, SKELETON_FLOW_PRESETS[0].id);
assert.equal(selectSkeletonFlowPreset(() => 1).id,
  SKELETON_FLOW_PRESETS[SKELETON_FLOW_PRESETS.length - 1].id);

assert.equal(typeof skeletonFlow.createSkeletonFlowBatchAssignments, "function",
  "Flow must expose a pure batch allocator for the accepted R5 invariants");
const createBatch = (seed) => skeletonFlow.createSkeletonFlowBatchAssignments({
  count: 12,
  presets: SKELETON_FLOW_PRESETS,
  random: seededRandom(seed),
});
const batch = createBatch(20260921);
assert.deepEqual(batch, createBatch(20260921), "seeded batch allocation must be deterministic");
assert.equal(batch.length, 12, "one full Advertising batch must allocate 12 frames");
assert.equal(new Set(batch.map(({ preset }) => preset.id)).size, 12,
  "one full batch must consume every preset exactly once");
assert(batch.every(({ anchorPermutation }) =>
  Array.isArray(anchorPermutation)
    && anchorPermutation.length === 4
    && [...anchorPermutation].sort().join(",") === "0,1,2,3"),
"every frame must receive a complete four-anchor permutation");
assert.equal(new Set(batch.map(({ anchorPermutation }) => anchorPermutation.join(","))).size, 12,
  "one full batch must not repeat an anchor permutation");
assert.equal(new Set(batch.map(({ phase }) => phase)).size, 12,
  "one full batch must not repeat a starting phase");
assert(batch.every(({ direction }) => direction === -1 || direction === 1),
  "Flow direction must be either negative or positive");
const directionCounts = batch.reduce((counts, { direction }) => {
  counts[direction] = (counts[direction] || 0) + 1;
  return counts;
}, {});
assert(Math.abs((directionCounts[1] || 0) - (directionCounts[-1] || 0)) <= 1,
  "positive and negative Flow directions must be near-balanced");
assert.equal(batch.slice(1).some(({ direction }, index) => direction === batch[index].direction), true,
  "balanced Flow directions must be shuffled instead of locked to alternating slots");

const frameLayoutInput = {
  columnBottoms: [100, 160, 220, 280],
  columns: 4,
  cardWidth: 300,
  gap: 35,
  boundaryBottom: 1_250,
};
const frameLayout = createSkeletonFlowFrameLayout(frameLayoutInput);
assert.deepEqual(frameLayout, createSkeletonFlowFrameLayout(frameLayoutInput),
  "skeleton ratio layout must be deterministic");
assert.deepEqual(frameLayout.slice(0, 4).map(({ column }) => column), [0, 1, 2, 3],
  "skeleton continuation must consume the shortest existing masonry frontier before adding a second card to a column");
assert.deepEqual(frameLayout.slice(0, 4).map(({ top }) => top), [135, 195, 255, 315],
  "skeletons must start at each real-card column bottom plus the shared gap, without a batch row seam");
const continuationBottoms = frameLayoutInput.columnBottoms.slice();
for (const frame of frameLayout) {
  const shortest = continuationBottoms.indexOf(Math.min(...continuationBottoms));
  assert.equal(frame.column, shortest, "each skeleton must occupy the shortest current masonry frontier");
  assert.equal(frame.top, continuationBottoms[shortest] + frameLayoutInput.gap,
    "skeleton placement must continue its column without overlap or an extra row offset");
  continuationBottoms[shortest] = frame.top + frame.height;
}
assert(Math.min(...continuationBottoms.map((bottom) => bottom + frameLayoutInput.gap)) >= frameLayoutInput.boundaryBottom,
  "the adaptive batch must reach its visual boundary");
const mobileFrameLayout = createSkeletonFlowFrameLayout({
  columnBottoms: [100, 114], columns: 2, cardWidth: 220, gap: 15,
  boundaryBottom: 700,
});
assert(mobileFrameLayout.length > 2, "mobile must keep enough DOM cards to reach the glass boundary");
assert.deepEqual(mobileFrameLayout.slice(0, 2).map(({ column }) => column), [0, 1],
  "mobile continuation must first fill both real-card column frontiers");
const mobileBottoms = [100, 114];
for (const frame of mobileFrameLayout) mobileBottoms[frame.column] = frame.top + frame.height;
assert(Math.min(...mobileBottoms.map((bottom) => bottom + 15)) >= 700,
  "mobile DOM placement must cover the glass boundary independently of the two-context limit");
const unevenMobile = createSkeletonFlowFrameLayout({
  columnBottoms: [100, 1_800], columns: 2, cardWidth: 220, gap: 15,
  boundaryBottom: 2_000,
});
const unevenBottoms = [100, 1_800];
for (const frame of unevenMobile) unevenBottoms[frame.column] = frame.top + frame.height;
assert(Math.min(...unevenBottoms.map((bottom) => bottom + 15)) >= 2_000,
  "an uneven mobile frontier must not stop at a fixed card-count budget");
assert(frameLayout.every(({ height }) => height >= frameLayoutInput.cardWidth * 0.25),
  "skeleton ratio layout must omit thin residual frames");
for (let column = 0; column < frameLayoutInput.columns; column += 1) {
  const columnFrames = frameLayout.filter((frame) => frame.column === column);
  assert(new Set(columnFrames.map(({ band }) => band)).size >= Math.min(3, columnFrames.length),
    `column ${column} must expose varied landscape, square, and portrait bands`);
  assert(columnFrames.slice(1).every((frame, index) => frame.band !== columnFrames[index].band),
    `column ${column} must not repeat adjacent ratio bands`);
}
const alignedFrameLayout = createSkeletonFlowFrameLayout({
  ...frameLayoutInput,
  columnBottoms: [100, 100, 100, 100],
  boundaryBottom: 1_117,
});
for (let depth = 0; depth < 3; depth += 1) {
  const row = alignedFrameLayout.filter((frame) => frame.depth === depth)
    .sort((left, right) => left.column - right.column);
  assert.equal(row.length, 4, `aligned skeleton row ${depth} must fill all columns`);
  assert(row.slice(1).every((frame, index) => frame.band !== row[index].band),
    `aligned skeleton row ${depth} must vary adjacent ratio bands across columns`);
}
const twoColumnLayout = createSkeletonFlowFrameLayout({
  ...frameLayoutInput,
  columnBottoms: frameLayoutInput.columnBottoms.slice(0, 2),
  columns: 2,
});
assert.deepEqual(
  twoColumnLayout.filter(({ slot }) => frameLayout.some((frame) => frame.slot === slot))
    .map(({ slot, band }) => [slot, band]),
  frameLayout.filter(({ slot }) => twoColumnLayout.some((frame) => frame.slot === slot))
    .map(({ slot, band }) => [slot, band]),
  "shared skeleton slots must preserve ratio bands across responsive column counts",
);

assert.equal(advanceSkeletonFlowPhase(20.75, 1, 30), 20.768,
  "clock delta must cap at 50ms");
for (const preset of SKELETON_FLOW_PRESETS) {
  for (const phase of [20.75, 20.768, 21.2]) {
    for (const [x, y] of [[0, 0], [0.5, 0.5], [1, 1], [0.2, 0.8]]) {
      const color = sampleSkeletonFlowColor(preset, x, y, phase);
      assert.equal(color.length, 4);
      assert(color.every(Number.isFinite), `${preset.id}: shader oracle returned a non-finite channel`);
      assert(color.slice(0, 3).every((channel) => channel >= 0 && channel <= 1));
      assert.equal(color[3], 1, `${preset.id}: shader oracle returned empty alpha`);
    }
  }
}

assert.match(SKELETON_FLOW_FRAGMENT_SHADER, /distanceSquared \* distanceSquared \+ 0\.0001/);
assert.match(SKELETON_FLOW_FRAGMENT_SHADER, /for \(int pass = 1; pass <= 2; pass \+= 1\)/);

function createFakeWebGl() {
  const calls = { draw: 0, deleted: 0 };
  let next = 1;
  const gl = {
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88E4,
    FLOAT: 0x1406,
    TRIANGLES: 0x0004,
    VERTEX_SHADER: 0x8B31,
    FRAGMENT_SHADER: 0x8B30,
    COMPILE_STATUS: 0x8B81,
    LINK_STATUS: 0x8B82,
    TEXTURE_2D: 0x0DE1,
    TEXTURE0: 0x84C0,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    NEAREST: 0x2600,
    REPEAT: 0x2901,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    UNPACK_ALIGNMENT: 0x0CF5,
    createShader: (type) => ({ id: next++, type }),
    shaderSource() {},
    compileShader() {},
    getShaderParameter: () => true,
    getShaderInfoLog: () => "",
    deleteShader() { calls.deleted += 1; },
    createProgram: () => ({ id: next++ }),
    attachShader() {},
    linkProgram() {},
    getProgramParameter: () => true,
    getProgramInfoLog: () => "",
    deleteProgram() { calls.deleted += 1; },
    createBuffer: () => ({ id: next++ }),
    bindBuffer() {},
    bufferData() {},
    deleteBuffer() { calls.deleted += 1; },
    getAttribLocation: () => 0,
    enableVertexAttribArray() {},
    vertexAttribPointer() {},
    getUniformLocation: (_program, name) => name,
    useProgram() {},
    viewport() {},
    uniform1f() {},
    uniform1i() {},
    uniform2fv() {},
    uniform3fv() {},
    uniform4fv() {},
    createTexture: () => ({ id: next++ }),
    activeTexture() {},
    bindTexture() {},
    pixelStorei() {},
    texParameteri() {},
    texImage2D() {},
    deleteTexture() { calls.deleted += 1; },
    getExtension(name) {
      return name === "WEBGL_lose_context" ? { loseContext() { calls.lost = (calls.lost || 0) + 1; } } : null;
    },
    drawArrays() { calls.draw += 1; },
  };
  return { calls, gl };
}

const { calls, gl } = createFakeWebGl();
const listeners = new Map();
const canvas = {
  width: 0,
  height: 0,
  style: { backgroundImage: "" },
  getContext: (name) => name === "webgl" ? gl : null,
  addEventListener(type, listener) { listeners.set(type, listener); },
  removeEventListener(type) { listeners.delete(type); },
};
let queued;
let cancelled;
const renderer = createSkeletonFlowRenderer(canvas, {
  preset: SKELETON_FLOW_PRESETS[0],
  seed: 17,
  requestFrame(callback) {
    queued = callback;
    return 91;
  },
  cancelFrame(id) {
    cancelled = id;
  },
});
if (!renderer) throw new Error("expected WebGL renderer");

assert.equal(canvas.width, 240);
assert.equal(canvas.height, 160);
assert.equal(canvas.style.filter, "none", "Soften 0 must override the legacy CSS blur");
assert.equal(canvas.style.transform, "scale(1)");
assert.equal(renderer.backend, "webgl");
renderer.draw(0);
renderer.draw(1000);
assert.equal(calls.draw, 2);
assert.equal(renderer.phase, 20.75 + (30 / 100) * 1.2 * 0.05);
renderer.start();
assert.equal(typeof queued, "function", "start must request an animation frame");
queued(1016);
renderer.stop();
assert.equal(cancelled, 91, "stop must cancel the active animation frame");
assert.equal(renderer.running, false);

renderer.start();
assert.equal(renderer.running, true);
let prevented = false;
listeners.get("webglcontextlost")({ preventDefault() { prevented = true; } });
assert.equal(prevented, true);
assert.equal(renderer.backend, "fallback");
assert.equal(renderer.running, false, "context loss must stop the WebGL loop");
assert(canvas.style.backgroundImage, "context loss must leave a static fallback");
listeners.get("webglcontextrestored")();
assert.equal(renderer.backend, "webgl", "context restore must rebuild the WebGL backend");
assert.equal(renderer.running, true, "context restore must resume a loop that was running before loss");
listeners.get("webglcontextlost")({ preventDefault() {} });
renderer.stop();
listeners.get("webglcontextrestored")();
assert.equal(renderer.running, false,
  "visibility or reduced-motion pause during context loss must cancel automatic resume");
renderer.destroy();
renderer.destroy();
assert.equal(listeners.size, 0, "destroy must remove context listeners");
assert(calls.deleted >= 3, "destroy must release WebGL resources");
assert.equal(calls.lost, 1, "destroy must release the browser WebGL context");

let fallbackQueued = false;
const fallbackContexts = [];
const fallbackCanvas = {
  width: 0,
  height: 0,
  style: {},
  getContext(name) {
    fallbackContexts.push(name);
    return null;
  },
  addEventListener() {},
  removeEventListener() {},
};
const fallback = createSkeletonFlowRenderer(fallbackCanvas, {
  requestFrame() { fallbackQueued = true; return 1; },
});
if (!fallback) throw new Error("expected static renderer");
assert.equal(fallback.backend, "fallback");
fallback.draw(500);
fallback.start();
assert(fallbackCanvas.style.backgroundImage, "fallback must expose the static CSS gradient");
assert(!fallbackContexts.includes("2d"), "fallback must not synchronously rasterize a CPU frame");
assert.equal(fallbackQueued, false, "static fallback must not start a RAF loop");
fallback.destroy();

console.log("advertising skeleton Flow WebGL contract passed");
