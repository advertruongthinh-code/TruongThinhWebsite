import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SKELETON_FLOW_FRAGMENT_SHADER,
  SKELETON_FLOW_PRESETS,
  advanceSkeletonFlowPhase,
  createSkeletonFlowRenderer,
  createSkeletonFlowFrameLayout,
  drawSkeletonFlowAssignment,
  renderSkeletonFlowPixels,
  skeletonFlowProgramReady,
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
const frameRule = cssRule("^\\.advertising-grid__cta-frame");
const surfaceRule = cssRule("\\.advertising-grid__cta-surface");
const flowRule = cssRule("\\.advertising-grid__cta-flow");
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
// R8-R10 glass đã chuyển sang component Kính dùng chung: tests/site/glass-surface.test.mjs.
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

if (legacyWashRules.some((rule) => /\bbackground(?:-image)?\s*:/i.test(rule))) {
  r10ContractFailures.push("legacy skeleton-local white wash still exists outside the global glass surface");
}
assert.deepEqual(r10ContractFailures, [],
  "R10 requires Scale 100, frozen P100 anchors, and no skeleton-local white wash");

// R3: mỗi frame draw assignment riêng khi lần đầu vào view.
const draw = (seed, neighbors = []) => drawSkeletonFlowAssignment({ neighbors, random: seededRandom(seed) });
assert.deepEqual(draw(20260921), draw(20260921), "a seeded draw must be deterministic");
const stream = seededRandom(7);
const draws = Array.from({ length: 400 }, () => drawSkeletonFlowAssignment({ random: stream }));
assert.equal(new Set(draws.map(({ preset }) => preset.id)).size, 12, "draws must reach every preset");
assert.equal(new Set(draws.map(({ anchorPermutation }) => anchorPermutation.join(","))).size, 24,
  "draws must reach every anchor permutation");
assert(draws.every(({ anchorPermutation }) => [...anchorPermutation].sort().join(",") === "0,1,2,3"),
  "every frame must receive a complete four-anchor permutation");
assert(draws.every(({ direction }) => direction === -1 || direction === 1), "direction is -1 or 1");
assert(draws.some(({ direction }) => direction === -1) && draws.some(({ direction }) => direction === 1));
assert.equal(new Set(draws.map(({ phase }) => phase)).size, draws.length, "phase is continuous, not a few fixed levels");
assert(draws.every(({ phase }) => phase >= 20.75 && phase < 20.75 + Math.PI * 2), "phase covers one full turn");
assert(draws.every(({ speedScale }) => speedScale >= 0.9 && speedScale <= 1.1), "speed stays within 10%");
assert(Math.max(...draws.map(({ speedScale }) => speedScale)) - Math.min(...draws.map(({ speedScale }) => speedScale)) > 0.15,
  "speed offsets spread across the range");
const turnGap = (a, b) => {
  const delta = ((a - b) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  return Math.min(delta, Math.PI * 2 - delta);
};
for (let seed = 1; seed <= 200 * 7919; seed += 7919) {
  const neighbors = SKELETON_FLOW_PRESETS.slice(0, 11).map((preset, index) => ({ preset, phase: 21 + index }));
  assert.equal(draw(seed, neighbors).preset.id, SKELETON_FLOW_PRESETS[11].id, "an unused preset beats every neighbour's");
  const crowded = SKELETON_FLOW_PRESETS.map((preset, index) => ({ preset, phase: 20.75 + index * 0.5 }));
  const repeated = draw(seed, crowded);
  const shared = crowded.find(({ preset }) => preset.id === repeated.preset.id);
  assert(turnGap(repeated.phase, shared.phase) >= Math.PI / 2,
    `seed ${seed}: a repeated preset must sit at least a quarter turn from its neighbour`);
}

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
assert.equal(frameLayout.diagnostics.targetMet, true,
  "the batch solver must report a varied first-four rhythm with no long first-12 run");
assert.ok(frameLayout.diagnostics.firstFourKinds >= 2);
assert.ok(frameLayout.diagnostics.longestRun <= 3);
const seededFrameLayout = (seed) => createSkeletonFlowFrameLayout({
  ...frameLayoutInput,
  boundaryBottom: 4_000,
  seed,
});
const firstSeededFrames = seededFrameLayout("reload-a");
const secondSeededFrames = seededFrameLayout("reload-b");
assert.deepEqual(firstSeededFrames, seededFrameLayout("reload-a"),
  "the same visit seed must restore its batch frame rhythm");
assert.notDeepEqual(firstSeededFrames.map(({ band }) => band), secondSeededFrames.map(({ band }) => band),
  "a new reload seed must randomize low, square, and high skeleton placement");
assert.equal(firstSeededFrames.diagnostics.targetMet, true);
assert.equal(secondSeededFrames.diagnostics.targetMet, true);
assert.deepEqual(frameLayout.slice(0, 4).map(({ column }) => column), [0, 1, 2, 3],
  "skeleton continuation must consume the shortest existing masonry frontier before adding a second card to a column");
assert.deepEqual(frameLayout.slice(0, 4).map(({ top }) => top), [135, 195, 255, 315],
  "skeletons must start at each real-card column bottom plus the shared gap, without a batch row seam");
const seededFramesA = createSkeletonFlowFrameLayout({ ...frameLayoutInput, seed: "visit-a" });
const seededFramesARepeat = createSkeletonFlowFrameLayout({ ...frameLayoutInput, seed: "visit-a" });
const seededFramesB = createSkeletonFlowFrameLayout({ ...frameLayoutInput, seed: "visit-b" });
assert.deepEqual(seededFramesA, seededFramesARepeat, "a visit seed keeps CTA bands stable through relayout");
assert.notDeepEqual(seededFramesA.map(({ slot, band }) => [slot, band]),
  seededFramesB.map(({ slot, band }) => [slot, band]), "a new visit seed changes the CTA band distribution");
const knownRhythmGeometry = {
  columnBottoms: [100, 100, 100, 100],
  columns: 4,
  cardWidth: 200,
  gap: 35,
  boundaryBottom: 2_200,
};
const candidateLimitedFrames = createSkeletonFlowFrameLayout({ ...knownRhythmGeometry, seed: "seed-52" });
assert.equal(candidateLimitedFrames.diagnostics.targetMet, true,
  "bounded seed candidates must find an organic band order when the same geometry has a valid solution");
assert.notEqual(candidateLimitedFrames.diagnostics.fallbackReason, "ratio-pool-or-frontier-limit",
  "fallback diagnostics must not blame geometry when candidate selection caused the miss");
assert.ok(candidateLimitedFrames.diagnostics.candidatesTried >= 1
  && candidateLimitedFrames.diagnostics.candidatesTried <= 8,
"frame rhythm search must have a small explicit candidate bound");
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
for (const layout of [frameLayout, mobileFrameLayout, unevenMobile]) {
  const bottom = layout === frameLayout ? frameLayoutInput.boundaryBottom : layout === mobileFrameLayout ? 700 : 2_000;
  const columnEnds = Object.values(Object.groupBy(layout, ({ column }) => column)).map((frames) => frames.at(-1));
  assert(columnEnds.every(({ top, height }) => top + height === bottom),
    "the last frame of each column must end on the batch bottom");
}
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
const fourColumnResize = createSkeletonFlowFrameLayout({
  columnBottoms: [100, 100, 100, 100], columns: 4, cardWidth: 200, gap: 35,
  boundaryBottom: 900, seed: "visit-4",
});
const bandsBeforeResize = new Map(fourColumnResize.map(({ slot, band }) => [slot, band]));
const threeColumnResize = createSkeletonFlowFrameLayout({
  columnBottoms: [100, 100, 100], columns: 3, cardWidth: 230, gap: 25,
  boundaryBottom: 900, seed: "visit-4", bandAssignments: bandsBeforeResize,
});
assert.equal(
  threeColumnResize.find(({ slot }) => slot === "0:1")?.band,
  fourColumnResize.find(({ slot }) => slot === "0:1")?.band,
  "a persistent skeleton slot keeps its ratio band when the grid changes from four to three columns",
);
// R5: still khớp màu của frame live và chuyển theo phase.
const still = renderSkeletonFlowPixels(SKELETON_FLOW_PRESETS[0], 21);
assert.equal(still.length, 48 * 32 * 4);
assert.deepEqual(still, renderSkeletonFlowPixels(SKELETON_FLOW_PRESETS[0], 21), "a still is deterministic");
assert.notDeepEqual(still, renderSkeletonFlowPixels(SKELETON_FLOW_PRESETS[0], 22), "a still follows the phase");
assert.notDeepEqual(still, renderSkeletonFlowPixels(SKELETON_FLOW_PRESETS[8], 21), "a still follows the preset");

assert.equal(advanceSkeletonFlowPhase(20.75, 1, 30), 20.768,
  "clock delta must cap at 50ms");
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

// R8: với KHR_parallel_shader_compile, mount chờ COMPLETION_STATUS thay vì hỏi trạng thái chặn main thread.
const parallelFixture = createFakeWebGl();
let compiled = false;
const blockingQueries = [];
parallelFixture.gl.COMPLETION_STATUS_KHR = 0x91B1;
parallelFixture.gl.getExtension = (name) => name === "KHR_parallel_shader_compile" ? { COMPLETION_STATUS_KHR: 0x91B1 } : null;
parallelFixture.gl.getShaderParameter = (_shader, name) => { blockingQueries.push(name); return true; };
parallelFixture.gl.getProgramParameter = (_program, name) => {
  if (name !== 0x91B1) blockingQueries.push(name);
  return name === 0x91B1 ? compiled : true;
};
assert.equal(skeletonFlowProgramReady(parallelFixture.gl), false, "a program still compiling is not ready");
assert.deepEqual(blockingQueries, [], "starting a compile must not ask a blocking status");
compiled = true;
assert.equal(skeletonFlowProgramReady(parallelFixture.gl), true, "the same program becomes ready once compiled");

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
const scaledGl = createFakeWebGl().gl;
const scaled = createSkeletonFlowRenderer({ style: {}, getContext: (name) => name === "webgl" ? scaledGl : null },
  { preset: SKELETON_FLOW_PRESETS[0], speedScale: 1.1, requestFrame: () => 0, cancelFrame() {} });
scaled.draw(0);
scaled.draw(50);
assert.equal(scaled.phase, 20.75 + (30 * 1.1 / 100) * 1.2 * 0.05, "speedScale scales the preset speed");
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

const lostFixture = createFakeWebGl();
lostFixture.gl.isContextLost = () => true;
const lostRenderer = createSkeletonFlowRenderer({
  getContext: () => lostFixture.gl,
  style: {},
  addEventListener() {},
  removeEventListener() {},
});
lostRenderer.destroy();
lostRenderer.destroy();
assert.equal(lostFixture.calls.lost || 0, 0, "destroy never loses an already lost context");

const restoreFixture = createFakeWebGl();
const restoreListeners = new Map();
let contextLost = false;
let restoredProgram = null;
const programsUsed = [];
restoreFixture.gl.isContextLost = () => contextLost;
restoreFixture.gl.createProgram = () => (restoredProgram = {});
restoreFixture.gl.useProgram = program => {
  assert.equal(program, restoredProgram, "draw uses resources from the current generation");
  programsUsed.push(program);
};
const restoredRenderer = createSkeletonFlowRenderer({
  getContext: () => restoreFixture.gl,
  style: {}, dataset: {},
  addEventListener: (type, listener) => restoreListeners.set(type, listener),
  removeEventListener: type => restoreListeners.delete(type),
}, { requestFrame: () => 1, cancelFrame() {} });
restoredRenderer.draw(0);
const firstProgram = restoredProgram;
contextLost = true;
restoreListeners.get("webglcontextlost")({ preventDefault() {} });
assert.equal(restoredRenderer.backend, "fallback");
assert.equal(restoredRenderer.running, false);
contextLost = false;
restoreListeners.get("webglcontextrestored")();
assert.notEqual(restoredProgram, firstProgram, "restore rebuilds program generation");
assert.ok(programsUsed.includes(restoredProgram));
contextLost = true;
restoreListeners.get("webglcontextlost")({ preventDefault() {} });
restoredRenderer.destroy();
assert.equal(restoreFixture.calls.lost || 0, 0, "loss followed by teardown does not re-lose context");

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

const handoffFixture = createFakeWebGl();
let handoffProgram;
handoffFixture.gl.useProgram = program => { if (program) handoffProgram = program; };
const handoffListeners = new Map();
const handoffCanvas = {
  style: {}, dataset: {}, getContext: () => handoffFixture.gl,
  addEventListener: (type, listener) => handoffListeners.set(type, listener),
  removeEventListener: type => handoffListeners.delete(type),
};
let handoffCancelled = 0;
const lease = createSkeletonFlowRenderer(handoffCanvas, {
  initialPhase: 38, requestFrame: () => 7, cancelFrame: () => handoffCancelled++,
});
const deletedBeforeHandoff = handoffFixture.calls.deleted;
const programBeforeHandoff = handoffProgram;
lease.start();
lease.destroy({ releaseContext: false });
lease.destroy({ releaseContext: false });
assert.equal(handoffFixture.calls.lost || 0, 0, "handoff retains the native context");
assert.equal(handoffFixture.calls.deleted - deletedBeforeHandoff, 2, "handoff deletes its buffer and texture once and keeps the context program");
assert.equal(handoffListeners.size, 0, "handoff releases renderer event listeners");
assert.equal(handoffCancelled, 1, "handoff cancels its RAF once");
assert.equal(lease.draw(100), false, "released lease cannot draw again");
const nextLease = createSkeletonFlowRenderer(handoffCanvas, {
  preset: SKELETON_FLOW_PRESETS[1], initialPhase: lease.phase,
});
assert.equal(nextLease.phase, 38, "new lease starts at the saved phase");
assert.equal(nextLease.context, handoffFixture.gl, "cache receives the owned native context");
assert.equal(handoffProgram, programBeforeHandoff, "new lease reuses the compiled program of the context");
nextLease.draw(0);
nextLease.destroy(); nextLease.destroy();
assert.equal(handoffFixture.calls.lost, 1, "default destroy still disposes native context once");

console.log("advertising skeleton Flow WebGL contract passed");
