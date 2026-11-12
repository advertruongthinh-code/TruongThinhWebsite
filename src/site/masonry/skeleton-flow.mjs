const FLOW_WIDTH = 240;
import { shuffleWithSeed } from "./random-order.mjs";
import { canSpanTwoColumns, spanSlots } from "./layout.mjs";
// A context keeps the attributes of its first getContext call, so a prebuilt lease must use these values.
export const SKELETON_FLOW_CONTEXT_ATTRIBUTES = Object.freeze({
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
});

const FLOW_HEIGHT = 160;
const FLOW_CLOCK_START = 20.75;
const MAX_DELTA_SECONDS = 0.05;
const BANDS = [0.25, 0.5, 0.75];

const P100_ANCHORS = Object.freeze([
  Object.freeze([0.4071134869260332, 0.03]),
  Object.freeze([0.6553617423853343, 0.03]),
  Object.freeze([0.8886264187267703, 0.2744774758469444]),
  Object.freeze([0.97, 0.97]),
]);

const RAW_PRESETS = [
  { id: "iridescent-cloud", colors: ["#EAF4FC", "#1E50A2", "#F09199", "#895B8A"], scale: 50, distortion: 60, swirl: 10, speed: 30, noise: 6 },
  { id: "opal", colors: ["#F6F9FF", "#9BE0E8", "#C4B5F7", "#F8B8D9"], scale: 52, distortion: 46, swirl: 8, speed: 24, noise: 5 },
  { id: "lagoon", colors: ["#EAFBF7", "#5CE3E6", "#0F9CC2", "#274A78"], scale: 52, distortion: 44, swirl: 6, speed: 26, noise: 5 },
  { id: "emerald", colors: ["#F0FBEF", "#8FE3B0", "#22C79A", "#0B5F51"], scale: 50, distortion: 44, swirl: 6, speed: 26, noise: 5 },
  { id: "solar-flare", colors: ["#FFF6DE", "#FFC24B", "#F4664D", "#8A2E5E"], scale: 50, distortion: 52, swirl: 10, speed: 28, noise: 6 },
  { id: "orchid", colors: ["#FBEFFB", "#E794C9", "#9678CE", "#4A3894"], scale: 48, distortion: 46, swirl: 9, speed: 26, noise: 5 },
  { id: "peach-glow", colors: ["#FFF3EC", "#FFC9A3", "#F08A8C", "#B65E8C"], scale: 50, distortion: 48, swirl: 8, speed: 28, noise: 5 },
  { id: "electric-tide", colors: ["#DFFBFF", "#6FD8F2", "#4C5BE0", "#2A2450"], scale: 50, distortion: 60, swirl: 14, speed: 32, noise: 6 },
  { id: "sunset", colors: ["#FFE9C4", "#FFAE3F", "#F0574D", "#5D2A66"], scale: 46, distortion: 70, swirl: 16, speed: 34, noise: 6 },
  { id: "mint-ice", colors: ["#F2FDF9", "#A8F0DC", "#52CBB0", "#147A5F"], scale: 50, distortion: 55, swirl: 10, speed: 30, noise: 6 },
  { id: "midnight-bloom", colors: ["#12142E", "#4C3894", "#B387E8", "#F6C6E2"], scale: 46, distortion: 78, swirl: 22, speed: 36, noise: 8 },
  { id: "rose-gold", colors: ["#FFF4E8", "#FBC9AC", "#E79BA7", "#8E5A74"], scale: 52, distortion: 50, swirl: 8, speed: 26, noise: 6 },
];

const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const SKELETON_FLOW_FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUv;
uniform float uTime;
uniform float uScale;
uniform float uDistortion;
uniform float uSwirl;
uniform float uNoiseOpacity;
uniform vec2 uAnchors[4];
uniform vec3 uColors[4];
uniform vec4 uBalances;
uniform sampler2D uNoise;
uniform float uFrost;
uniform sampler2D uTiny;
uniform vec2 uTinySize;
uniform vec4 uTinyBox;
uniform vec2 uTinyCover;

float saturateValue(float value) {
  return clamp(value, 0.0, 1.0);
}

float smoothValue(float value) {
  float clamped = saturateValue(value);
  return clamped * clamped * (3.0 - 2.0 * clamped);
}

vec2 automaticAnchor(int index, float time) {
  float i = float(index);
  float anchorPhase = 0.37 * i;
  float fx = 0.6 + 0.9 * fract(i / 3.0);
  float fy = 0.8 + fract((i + 1.0) / 4.0);
  return vec2(
    0.5 + 0.5 * sin(time * fx + anchorPhase),
    0.5 + 0.5 * cos(time * fy + 1.5 * anchorPhase)
  );
}

vec3 overlayNoise(vec3 base, float noiseValue) {
  vec3 low = 2.0 * base * noiseValue;
  vec3 high = 1.0 - 2.0 * (1.0 - base) * (1.0 - noiseValue);
  return mix(low, high, step(vec3(0.5), base));
}

void main() {
  float scaleFactor = 0.4 + 1.2 * uScale / 100.0;
  vec2 point = (vUv - 0.5) / scaleFactor + 0.5;
  float radius = smoothValue(length(point - 0.5));
  float edge = 1.0 - radius;

  for (int pass = 1; pass <= 2; pass += 1) {
    float z = float(pass);
    point.x += (uDistortion / 100.0) * edge / z
      * sin(uTime + 0.4 * z * smoothValue(point.y))
      * cos(0.2 * uTime + 2.4 * z * smoothValue(point.y));
    point.y += (uDistortion / 100.0) * edge / z
      * cos(uTime + 2.0 * z * smoothValue(point.x));
  }

  float angle = -3.0 * (uSwirl / 100.0) * radius;
  float sine = sin(angle);
  float cosine = cos(angle);
  vec2 centered = point - 0.5;
  point = vec2(
    centered.x * cosine - centered.y * sine,
    centered.x * sine + centered.y * cosine
  ) + 0.5;

  vec3 color = vec3(0.0);
  float totalWeight = 0.0;
  for (int index = 0; index < 4; index += 1) {
    vec2 drift = 0.2 * (automaticAnchor(index, uTime)
      - automaticAnchor(index, 20.75)) / scaleFactor;
    vec2 anchor = (uAnchors[index] - 0.5) / scaleFactor + 0.5 + drift;
    vec2 difference = point - anchor;
    float distanceSquared = dot(difference, difference);
    float weight = uBalances[index] / (distanceSquared * distanceSquared + 0.0001);
    color += uColors[index] * weight;
    totalWeight += weight;
  }
  color /= totalWeight;

  float noiseValue = texture2D(uNoise, vUv * vec2(3.0, 2.0)).r;
  color = mix(color, overlayNoise(color, noiseValue), uNoiseOpacity);
  if (uFrost > 0.0) {
    // Frosted glass of the photo (reveal, owner 2026-11-12): a 20px copy stretched to the frame blurs by itself, a thin white veil,
    // and fine grain at one noise texel per canvas pixel. No blur filter, so the GPU compiles nothing new at reveal.
    // Inside uTinyBox the copy sits where the photo sits (contain); outside it covers the frame like the zoom blur background.
    vec2 inner = (vUv - uTinyBox.xy) / uTinyBox.zw;
    vec2 tinyUv = all(equal(inner, clamp(inner, 0.0, 1.0))) ? inner : (vUv - 0.5) * uTinyCover + 0.5;
    vec2 texel = 0.75 / uTinySize;
    vec3 tiny = 0.25 * (texture2D(uTiny, tinyUv - texel).rgb + texture2D(uTiny, tinyUv + texel).rgb
      + texture2D(uTiny, tinyUv + vec2(texel.x, -texel.y)).rgb + texture2D(uTiny, tinyUv + vec2(-texel.x, texel.y)).rgb);
    vec3 frost = mix(tiny, vec3(1.0), 0.14);
    frost = mix(frost, overlayNoise(frost, texture2D(uNoise, gl_FragCoord.xy / 256.0).r), 0.045);
    color = mix(color, frost, uFrost);
  }
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

const parseHex = (value) => [
  Number.parseInt(value.slice(1, 3), 16) / 255,
  Number.parseInt(value.slice(3, 5), 16) / 255,
  Number.parseInt(value.slice(5, 7), 16) / 255,
];

function rangedNumber(value, minimum, maximum, label) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TypeError(`${label} must be within ${minimum}..${maximum}`);
  }
  return value;
}

function freezePreset({ id, colors, bands, field, finish }, anchors) {
  return Object.freeze({
    id,
    colors: Object.freeze([...colors]),
    anchors: Object.freeze(anchors.map(({ x, y }) => Object.freeze({ x, y }))),
    bands: Object.freeze([...bands]),
    field: Object.freeze({ ...field }),
    finish: Object.freeze({ ...finish }),
  });
}

export const SKELETON_FLOW_PRESETS = Object.freeze(RAW_PRESETS.map(({ id, colors, distortion, swirl, speed, noise }) => freezePreset({
  id,
  colors,
  bands: BANDS,
  field: { scale: 100, distortion, swirl, speed },
  finish: { soften: 0, noise },
}, P100_ANCHORS.map(([x, y]) => ({ x, y })))));

const normalizedRandom = (random) => Math.min(0.999999, Math.max(0, Number(random()) || 0));

function permutations(values) {
  if (values.length <= 1) return [values.slice()];
  return values.flatMap((value, index) => permutations(values.filter((_, candidate) => candidate !== index))
    .map((tail) => [value, ...tail]));
}

const FULL_TURN = Math.PI * 2;
const MIN_SHARED_PRESET_PHASE_GAP = FULL_TURN / 4;
const ANCHOR_PERMUTATIONS = Object.freeze(permutations([0, 1, 2, 3]).map(Object.freeze));
const turnDistance = (a, b) => {
  const delta = ((a - b) % FULL_TURN + FULL_TURN) % FULL_TURN;
  return Math.min(delta, FULL_TURN - delta);
};
const pick = (values, random) => values[Math.floor(normalizedRandom(random) * values.length)];

// Draw one Flow frame when it first enters view; `neighbors` is the assignment of adjacent frames (allows the live phase); `colors`
// (the 4 colors of the image being awaited) replace the preset color that would be drawn (R3).
export function drawSkeletonFlowAssignment({
  neighbors = [],
  colors = null,
  presets = SKELETON_FLOW_PRESETS,
  random = Math.random,
} = {}) {
  const neighborCount = (id) => neighbors.filter(({ preset }) => preset?.id === id).length;
  const fewest = Math.min(...presets.map(({ id }) => neighborCount(id)));
  const source = pick(presets.filter(({ id }) => neighborCount(id) === fewest), random);
  const shared = neighbors.filter(({ preset }) => preset?.id === source.id).map(({ phase }) => Number(phase) || 0);
  let phase;
  let bestGap = -1;
  for (let attempt = 0; attempt < 32 && bestGap < MIN_SHARED_PRESET_PHASE_GAP; attempt += 1) {
    const candidate = FLOW_CLOCK_START + normalizedRandom(random) * FULL_TURN;
    const gap = Math.min(FULL_TURN, ...shared.map((other) => turnDistance(candidate, other)));
    if (gap > bestGap) [phase, bestGap] = [candidate, gap];
  }
  const anchorPermutation = pick(ANCHOR_PERMUTATIONS, random);
  return Object.freeze({
    preset: freezePreset(colors?.length === 4 ? { ...source, colors } : source, anchorPermutation.map((anchorIndex) => source.anchors[anchorIndex])),
    anchorPermutation,
    phase,
    direction: normalizedRandom(random) < 0.5 ? -1 : 1,
    speedScale: 0.9 + normalizedRandom(random) * 0.2,
  });
}

// Height/width ratios of the default batch frames. A page overrides them with `ratios` (skeleton R1); landscape ratios from the golden ratio up
// (height/width <= 0.618) follow the real card's span rule: span 2 columns when the grid has >= 3 columns and the hole is at most half a column.
export const SKELETON_RATIO_BANDS = Object.freeze([
  Object.freeze({ id: "landscape", ratio: 0.72 }),
  Object.freeze({ id: "square", ratio: 1 }),
  Object.freeze({ id: "portrait", ratio: 1.32 }),
]);

// Batch configuration from page attributes: `data-skeleton-ratios="landscape:0.72 square:1 wide:0.5"`,
// `data-skeleton-count="12"`. Missing or invalid values keep the default.
export function readSkeletonBatchConfig(dataset = {}) {
  const ratios = String(dataset.skeletonRatios || "").trim().split(/\s+/).filter(Boolean).map((entry) => {
    const [id, ratio] = entry.split(":");
    return Object.freeze({ id, ratio: Number(ratio) });
  });
  const valid = ratios.length > 0 && ratios.every(({ id, ratio }) => id && Number.isFinite(ratio) && ratio >= 0.1)
    && new Set(ratios.map(({ id }) => id)).size === ratios.length;
  const count = Number(dataset.skeletonCount);
  return {
    ratios: valid ? Object.freeze(ratios) : SKELETON_RATIO_BANDS,
    maxFrames: Number.isInteger(count) && count >= 1 ? count : Number.MAX_SAFE_INTEGER,
  };
}

export function createSkeletonFlowFrameLayout({
  columnBottoms,
  columns,
  cardWidth,
  gap,
  boundaryBottom,
  maxFrames = Number.MAX_SAFE_INTEGER,
  ratios: allRatios = SKELETON_RATIO_BANDS,
  seed,
  bandAssignments,
  spanSkeleton = true,
} = {}) {
  if (!Array.isArray(columnBottoms) || !Number.isInteger(columns) || columns < 1
    || columnBottoms.length < columns || columnBottoms.slice(0, columns).some((bottom) => !Number.isFinite(bottom))
    || !Number.isFinite(cardWidth) || cardWidth <= 0
    || !Number.isFinite(gap) || gap < 0 || !Number.isFinite(boundaryBottom)
    || !Number.isInteger(maxFrames) || maxFrames < 1
    || !Array.isArray(allRatios) || !allRatios.length || allRatios.some(({ ratio }) => !Number.isFinite(ratio) || ratio <= 0)) {
    throw new TypeError("Skeleton frame layout requires valid column geometry");
  }
  // The related batch (spanSkeleton false) drops every band that would span two columns: related cards are one column.
  const ratios = spanSkeleton ? allRatios : allRatios.filter((band) => !canSpanTwoColumns(columns, { width: 1, height: band.ratio }));
  if (!ratios.length) throw new TypeError("Skeleton frame layout needs a band that stays one column");
  const baseBands = ratios.length > 1 ? [ratios[1], ratios[0], ...ratios.slice(2)] : ratios;
  // A landscape frame spans two adjacent columns, one of them the currently lowest; with no room the frame picks another band.
  // No holes (advertising-masonry R5): when two bottoms differ, the last frame of the shorter column (a single-column frame of this batch)
  // stretches by exactly the difference; if that bottom is a real card or a two-column frame, place only when the bottoms are level.
  const wideSlot = (band, column, bottoms, lastFrames) => {
    if (!canSpanTwoColumns(columns, { width: 1, height: band.ratio })) return null;
    return spanSlots(bottoms, columns, 2, gap, cardWidth, gap)
      .filter(({ left, y }) => (left === column || left === column - 1) && y < boundaryBottom)
      .map((slot) => {
        if (slot.cavity <= 0.05) return { ...slot, stretch: null };
        const lower = bottoms[slot.left] < bottoms[slot.left + 1] ? slot.left : slot.left + 1;
        const frame = lastFrames[lower];
        return frame?.span === 1 ? { ...slot, stretch: { frame, column: lower } } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.y - b.y || a.cavity - b.cavity)[0] || null;
  };
  const buildCandidate = (candidateSeed) => {
    const frames = [];
    const bottoms = columnBottoms.slice(0, columns);
    const depths = Array(columns).fill(0);
    const previousBandByColumn = new Map();
    const rowBands = new Map();
    const lastFrames = Array(columns).fill(null);
    while (frames.length < maxFrames) {
      const column = bottoms.reduce((shortest, bottom, index) =>
        bottom < bottoms[shortest] ? index : shortest, 0);
      const top = Number(bottoms[column]) + gap;
      if (top >= boundaryBottom) break;
      // A slot is the order of frames following the masonry, not a column:depth cell: when resize changes the column count, frame k is still
      // item k of the same grid, so it slides together with the card above it (owner 10/10).
      const slot = String(frames.length);
      const assignedBand = bandAssignments?.get?.(slot);
      // Band placement: one column at the lowest column, or two columns by the real card's span rule.
      const place = (band) => {
        if (!canSpanTwoColumns(columns, { width: 1, height: band.ratio })) return { left: column, span: 1, top, depth: depths[column] };
        const wide = wideSlot(band, column, bottoms, lastFrames);
        return wide && { left: wide.left, span: 2, top: wide.y, depth: Math.max(depths[wide.left], depths[wide.left + 1]), stretch: wide.stretch };
      };
      // No column the frame covers has two adjacent frames of the same band (R1), including the neighbor column of a two-column frame.
      const fresh = (band) => {
        const at = place(band);
        return at && !Array.from({ length: at.span }, (_, offset) => previousBandByColumn.get(at.left + offset)?.id)
          .includes(band.id) ? at : null;
      };
      let source;
      // The old band is kept per slot, unless the new column places it directly below a frame of the same band.
      const preservedBand = ratios.find((band) => band.id === assignedBand && fresh(band));
      if (preservedBand) {
        source = preservedBand;
      } else if (candidateSeed === null) {
        const ordered = [...baseBands.slice((depths[column] + column) % baseBands.length), ...baseBands];
        source = ordered.find(fresh) || ordered.find(place) || ordered[0];
      } else {
        const candidates = shuffleWithSeed(ratios, candidateSeed, `frame:${column}:${depths[column]}`).filter(place);
        source = candidates.find((band) => { const at = fresh(band); return at && !rowBands.get(at.depth)?.has(band.id); })
          || candidates.find(fresh) || candidates[0] || baseBands[0];
      }
      // Every band is landscape but there is no room for two columns: the frame keeps one column.
      const { left, span, top: frameTop, depth, stretch } = place(source) || { left: column, span: 1, top, depth: depths[column] };
      if (stretch) {
        stretch.frame.height += frameTop - gap - bottoms[stretch.column];
        bottoms[stretch.column] = frameTop - gap;
      }
      const height = (span * cardWidth + (span - 1) * gap) * source.ratio;
      const frame = { slot, column: left, span, depth, band: source.id, top: frameTop, height };
      frames.push(frame);
      if (!rowBands.has(depth)) rowBands.set(depth, new Set());
      rowBands.get(depth).add(source.id);
      for (let index = left; index < left + span; index += 1) {
        lastFrames[index] = frame;
        previousBandByColumn.set(index, source);
        depths[index] = depth + 1;
        bottoms[index] = frameTop + height;
      }
    }
    return frames;
  };
  const scoreFrames = (frames) => {
    const firstBands = frames.slice(0, 12).map(({ band }) => band);
    const firstFourKinds = new Set(firstBands.slice(0, 4)).size;
    let longestRun = 0;
    let transitions = 0;
    let currentBand = null;
    let currentRun = 0;
    for (const band of firstBands) {
      if (band === currentBand) currentRun += 1;
      else {
        if (currentBand !== null) transitions += 1;
        currentBand = band;
        currentRun = 1;
      }
      longestRun = Math.max(longestRun, currentRun);
    }
    const targetApplicable = frames.length >= 2;
    const targetMet = targetApplicable ? firstFourKinds >= 2 && longestRun <= 3 : null;
    const score = firstFourKinds * 100 + transitions * 10 - longestRun * 20;
    return { firstBands, firstFourKinds, longestRun, score, targetApplicable, targetMet };
  };

  const maxCandidates = seed === undefined || seed === null ? 1 : 8;
  let selectedFrames = [];
  let selectedRhythm = null;
  let candidatesTried = 0;
  for (let candidateIndex = 0; candidateIndex < maxCandidates; candidateIndex += 1) {
    const candidateSeed = maxCandidates === 1 ? null : `${String(seed)}:organic-candidate:${candidateIndex}`;
    const frames = buildCandidate(candidateSeed);
    const rhythm = scoreFrames(frames);
    candidatesTried += 1;
    if (!selectedRhythm || (rhythm.targetMet && !selectedRhythm.targetMet) || rhythm.score > selectedRhythm.score) {
      selectedFrames = frames;
      selectedRhythm = rhythm;
    }
    if (rhythm.targetMet) break;
  }

  // The last frame of each column ends at the batch bottom; a remainder under a quarter of a card is added to the frame above. A 2
  // column frame only stretches when it is the last frame of both columns; a thin frame is dropped only when the frame above it can stretch.
  const covers = (frame, column) => column >= frame.column && column < frame.column + frame.span;
  const lastIn = (frames, column) => frames.findLast((frame) => covers(frame, column));
  const isLast = (frames, frame) => Array.from({ length: frame.span }, (_, offset) => lastIn(frames, frame.column + offset))
    .every((last) => last === frame);
  // Drop every thin frame that is currently a last frame at once, then repeat: two thin frames do not block each other. If dropping would leave a frame that cannot
  // stretch (a two-column frame with a later frame in one column), leave it as is.
  let kept = selectedFrames;
  for (;;) {
    const thin = new Set(kept.filter((frame) => isLast(kept, frame) && boundaryBottom - frame.top < cardWidth * 0.25));
    if (!thin.size) break;
    const without = kept.filter((frame) => !thin.has(frame));
    if (!Array.from({ length: columns }, (_, column) => lastIn(without, column)).every((frame) => !frame || isLast(without, frame))) break;
    kept = without;
  }
  for (const frame of kept) if (isLast(kept, frame)) frame.height = boundaryBottom - frame.top;
  const result = kept.map((frame) => Object.freeze(frame));
  Object.defineProperty(result, "diagnostics", {
    enumerable: false,
    value: Object.freeze({
      candidatesTried,
      firstFourKinds: selectedRhythm.firstFourKinds,
      longestRun: selectedRhythm.longestRun,
      targetApplicable: selectedRhythm.targetApplicable,
      targetMet: selectedRhythm.targetMet,
      fallbackReason: selectedRhythm.targetApplicable && !selectedRhythm.targetMet
        ? maxCandidates > 1 ? "bounded-seed-candidate-search-exhausted" : "deterministic-default-rhythm"
        : null,
    }),
  });
  return Object.freeze(result);
}

export function advanceSkeletonFlowPhase(phase, deltaSeconds, speed, direction = 1, maxDelta = MAX_DELTA_SECONDS) {
  const delta = Math.min(maxDelta, Math.max(0, Number(deltaSeconds) || 0));
  const signedDirection = direction < 0 ? -1 : 1;
  return phase + signedDirection * (rangedNumber(speed, 0, 100, "Flow speed") / 100) * 1.2 * delta;
}

export function staticBackground(preset) {
  const layers = preset.anchors.slice(0, 3).map((anchor, index) =>
    `radial-gradient(circle at ${(anchor.x * 100).toFixed(3)}% ${(anchor.y * 100).toFixed(3)}%, ${preset.colors[index]} 0%, transparent 62%)`);
  return [...layers, `linear-gradient(135deg, ${preset.colors[3]}, ${preset.colors[0]})`].join(", ");
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// The shader is identical for every preset (uniforms are set per lease), so each context compiles only once: a compile blocks
// the main thread about 60ms on the old A05s. When a context is lost then restored isProgram returns false and it compiles again.
const programByContext = new WeakMap();
function contextProgram(gl) {
  const cached = programByContext.get(gl);
  if (cached && gl.isProgram?.(cached) !== false) return cached;
  const program = createProgram(gl);
  if (program) programByContext.set(gl, program);
  return program;
}

// A triangle covering the viewport and the noise texture at unit 0; the dedicated renderer and the shared canvas share them.
function bindQuadAndNoise(gl, program, buffer, texture) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 256, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, createNoise());
  gl.uniform1i(gl.getUniformLocation(program, "uNoise"), 0);
}

function presetUniforms(preset) {
  const edges = [0, ...preset.bands, 1];
  return {
    colors: new Float32Array(preset.colors.flatMap(parseHex)),
    anchors: new Float32Array(preset.anchors.flatMap(({ x, y }) => [x, y])),
    balances: new Float32Array(edges.slice(0, 4).map((edge, index) => 4 * (edges[index + 1] - edge))),
  };
}

// Compile and link without reading any status: with KHR_parallel_shader_compile the driver links off the main thread until
// LINK_STATUS is read, and failed shaders fail the link anyway.
function startProgram(gl) {
  const shaders = [[gl.VERTEX_SHADER, VERTEX_SHADER], [gl.FRAGMENT_SHADER, SKELETON_FLOW_FRAGMENT_SHADER]].map(([type, source]) => {
    const shader = gl.createShader(type);
    if (shader) {
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
    }
    return shader;
  });
  const program = shaders.every(Boolean) && gl.createProgram();
  if (program) {
    for (const shader of shaders) gl.attachShader(program, shader);
    gl.linkProgram(program);
  }
  for (const shader of shaders) if (shader) gl.deleteShader(shader);
  return program || null;
}

function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, SKELETON_FLOW_FRAGMENT_SHADER);
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

// One noise shared by every renderer: grain shows only 3-4%, and recreating 256x256 on each mount costs over 10ms on the old A05s
// (decision phone-frame-budget).
let sharedNoise;
function createNoise() {
  if (sharedNoise) return sharedNoise;
  let state = 0x2f6b;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
  // A single LUMINANCE channel: the shader reads only .r, so 4 times fewer bytes to write and upload with no change to the image.
  const data = new Uint8Array(256 * 256);
  for (let offset = 0; offset < data.length; offset += 1) data[offset] = Math.round((random() + random()) * 0.5 * 255);
  return (sharedNoise = data);
}

const smoothValue = (value) => {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
};
const automaticAnchor = (index, time) => {
  const anchorPhase = 0.37 * index;
  const fx = 0.6 + 0.9 * ((index / 3) % 1);
  const fy = 0.8 + (((index + 1) / 4) % 1);
  return [0.5 + 0.5 * Math.sin(time * fx + anchorPhase), 0.5 + 0.5 * Math.cos(time * fy + 1.5 * anchorPhase)];
};

// CPU copy of SKELETON_FLOW_FRAGMENT_SHADER at `phase`, rows from top to bottom. Grain is dropped: at
// this size it would upscale into streaks, and at 3-4% opacity the live frame still matches without it.
export function renderSkeletonFlowPixels(preset, phase, { width = 48, height = 32 } = {}) {
  const colors = preset.colors.map(parseHex);
  const edges = [0, ...preset.bands, 1];
  const balances = edges.slice(0, 4).map((edge, index) => 4 * (edges[index + 1] - edge));
  const { scale, distortion, swirl } = preset.field;
  const scaleFactor = 0.4 + 1.2 * scale / 100;
  const anchors = preset.anchors.map(({ x, y }, index) => {
    const now = automaticAnchor(index, phase);
    const start = automaticAnchor(index, FLOW_CLOCK_START);
    return [(x - 0.5) / scaleFactor + 0.5 + 0.2 * (now[0] - start[0]) / scaleFactor,
      (y - 0.5) / scaleFactor + 0.5 + 0.2 * (now[1] - start[1]) / scaleFactor];
  });
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const u = (column + 0.5) / width;
      const v = 1 - (row + 0.5) / height;
      let px = (u - 0.5) / scaleFactor + 0.5;
      let py = (v - 0.5) / scaleFactor + 0.5;
      const radius = smoothValue(Math.hypot(px - 0.5, py - 0.5));
      const edge = 1 - radius;
      for (let z = 1; z <= 2; z += 1) {
        px += (distortion / 100) * edge / z * Math.sin(phase + 0.4 * z * smoothValue(py))
          * Math.cos(0.2 * phase + 2.4 * z * smoothValue(py));
        py += (distortion / 100) * edge / z * Math.cos(phase + 2 * z * smoothValue(px));
      }
      const angle = -3 * (swirl / 100) * radius;
      const [cx, cy] = [px - 0.5, py - 0.5];
      px = cx * Math.cos(angle) - cy * Math.sin(angle) + 0.5;
      py = cx * Math.sin(angle) + cy * Math.cos(angle) + 0.5;
      let [red, green, blue, total] = [0, 0, 0, 0];
      for (let index = 0; index < 4; index += 1) {
        const distanceSquared = (px - anchors[index][0]) ** 2 + (py - anchors[index][1]) ** 2;
        const weight = balances[index] / (distanceSquared * distanceSquared + 0.0001);
        red += colors[index][0] * weight;
        green += colors[index][1] * weight;
        blue += colors[index][2] * weight;
        total += weight;
      }
      const offset = (row * width + column) * 4;
      pixels[offset] = red / total * 255;
      pixels[offset + 1] = green / total * 255;
      pixels[offset + 2] = blue / total * 255;
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

// Static frame for frames without a live renderer: the same Flow at `phase`, as a CSS image.
// Hand-encoded as an uncompressed 24-bit BMP: canvas.toDataURL forces a GPU readback and PNG encode for every static image.
const STILL_WIDTH = 48;
const STILL_HEIGHT = 32;
export function skeletonFlowStill(preset, phase) {
  const pixels = renderSkeletonFlowPixels(preset, phase, { width: STILL_WIDTH, height: STILL_HEIGHT });
  const rowBytes = STILL_WIDTH * 3;
  const bytes = new Uint8Array(54 + rowBytes * STILL_HEIGHT);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0x42;
  bytes[1] = 0x4d;
  view.setUint32(2, bytes.length, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, STILL_WIDTH, true);
  view.setInt32(22, STILL_HEIGHT, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  for (let row = 0; row < STILL_HEIGHT; row += 1) {
    // BMP rows run bottom to top in BGR order; 48 * 3 bytes needs no row padding.
    const target = 54 + (STILL_HEIGHT - 1 - row) * rowBytes;
    for (let column = 0; column < STILL_WIDTH; column += 1) {
      const source = (row * STILL_WIDTH + column) * 4;
      bytes[target + column * 3] = pixels[source + 2];
      bytes[target + column * 3 + 1] = pixels[source + 1];
      bytes[target + column * 3 + 2] = pixels[source];
    }
  }
  return `url("data:image/bmp;base64,${btoa(String.fromCharCode(...bytes))}")`;
}

export function createSkeletonFlowRenderer(canvas, {
  preset = SKELETON_FLOW_PRESETS[0],
  initialPhase = FLOW_CLOCK_START,
  direction = 1,
  speedScale = 1,
  width = FLOW_WIDTH,
  height = FLOW_HEIGHT,
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (id) => cancelAnimationFrame(id),
  frameInterval = 0,
} = {}) {
  if (!canvas?.getContext) return null;
  const renderWidth = Math.max(1, Math.round(Number(width) || FLOW_WIDTH));
  const renderHeight = Math.max(1, Math.round(Number(height) || FLOW_HEIGHT));
  canvas.width = renderWidth;
  canvas.height = renderHeight;
  if (canvas.style) {
    // Keep the static image the caller already drew; otherwise fall back to a static gradient.
    canvas.style.backgroundColor ||= preset.colors[3];
    canvas.style.backgroundImage ||= staticBackground(preset);
    canvas.style.filter = preset.finish.soften ? `blur(${preset.finish.soften}px)` : "none";
    canvas.style.transform = `scale(${1 + preset.finish.soften / 200})`;
  }

  // OffscreenCanvas in a worker does not accept "experimental-webgl": WebKit throws a TypeError instead of returning null.
  let gl = canvas.getContext("webgl", SKELETON_FLOW_CONTEXT_ATTRIBUTES)
    || (globalThis.OffscreenCanvas && canvas instanceof OffscreenCanvas ? null : canvas.getContext("experimental-webgl"));
  let program = null;
  let buffer = null;
  let texture = null;
  let timeLocation;
  let backend = gl ? "webgl" : "fallback";
  let phase = Number.isFinite(Number(initialPhase)) ? Number(initialPhase) : FLOW_CLOCK_START;
  const flowDirection = direction < 0 ? -1 : 1;
  let frameId = 0;
  let lastTimestamp = -1;
  let lastPaint = Number.NEGATIVE_INFINITY;
  let isRunning = false;
  let resumeAfterRestore = false;
  let destroyed = false;

  const releaseResources = () => {
    if (!gl) return;
    try {
      if (!gl.isContextLost?.()) {
        gl.useProgram(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        if (texture) gl.deleteTexture(texture);
        if (buffer) gl.deleteBuffer(buffer);
      }
    } catch {}
    texture = null;
    buffer = null;
    program = null;
    timeLocation = undefined;
  };

  const initializeWebGl = () => {
    if (!gl || gl.isContextLost?.()) return false;
    program = contextProgram(gl);
    buffer = program && gl.createBuffer();
    texture = program && gl.createTexture();
    if (!program || !buffer || !texture) {
      releaseResources();
      backend = "fallback";
      return false;
    }
    gl.useProgram(program);
    bindQuadAndNoise(gl, program, buffer, texture);
    const uniform = (name) => gl.getUniformLocation(program, name);
    timeLocation = uniform("uTime");
    const { colors, anchors, balances } = presetUniforms(preset);
    gl.uniform1f(uniform("uScale"), preset.field.scale);
    gl.uniform1f(uniform("uDistortion"), preset.field.distortion);
    gl.uniform1f(uniform("uSwirl"), preset.field.swirl);
    gl.uniform1f(uniform("uNoiseOpacity"), 0.5 * preset.finish.noise / 100);
    gl.uniform2fv(uniform("uAnchors[0]"), anchors);
    gl.uniform3fv(uniform("uColors[0]"), colors);
    gl.uniform4fv(uniform("uBalances"), balances);
    backend = "webgl";
    return true;
  };

  if (!initializeWebGl()) backend = "fallback";

  const draw = (timestamp = 0) => {
    if (destroyed) return false;
    if (backend === "webgl" && gl && program && !gl.isContextLost?.()) {
      const currentTimestamp = Number(timestamp) || 0;
      if (lastTimestamp >= 0) {
        phase = advanceSkeletonFlowPhase(phase, (currentTimestamp - lastTimestamp) / 1000,
          preset.field.speed * speedScale, flowDirection);
      }
      lastTimestamp = currentTimestamp;
      gl.viewport(0, 0, renderWidth, renderHeight);
      gl.useProgram(program);
      gl.uniform1f(timeLocation, phase);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return true;
    }
    return backend === "fallback";
  };

  const tick = (timestamp) => {
    if (!isRunning || backend !== "webgl") return;
    if (timestamp - lastPaint >= frameInterval) {
      draw(timestamp);
      lastPaint = timestamp;
    }
    frameId = requestFrame(tick);
  };

  const stop = () => {
    resumeAfterRestore = false;
    if (!isRunning) return;
    isRunning = false;
    cancelFrame(frameId);
    frameId = 0;
    lastTimestamp = -1;
  };

  const start = () => {
    if (destroyed || isRunning) return;
    if (backend !== "webgl") {
      draw();
      return;
    }
    isRunning = true;
    lastTimestamp = -1;
    lastPaint = Number.NEGATIVE_INFINITY;
    frameId = requestFrame(tick);
  };

  const onContextLost = (event) => {
    event.preventDefault();
    programByContext.delete(gl);
    const wasRunning = isRunning;
    stop();
    resumeAfterRestore = wasRunning;
    releaseResources();
    backend = "fallback";
    if (canvas.dataset) canvas.dataset.masonryFlowBackend = "fallback";
  };
  const onContextRestored = () => {
    if (destroyed) return;
    gl = canvas.getContext("webgl", SKELETON_FLOW_CONTEXT_ATTRIBUTES);
    if (initializeWebGl()) {
      if (canvas.dataset) canvas.dataset.masonryFlowBackend = "webgl";
      draw();
      if (resumeAfterRestore) start();
    }
    resumeAfterRestore = false;
  };
  canvas.addEventListener?.("webglcontextlost", onContextLost);
  canvas.addEventListener?.("webglcontextrestored", onContextRestored);

  return {
    draw,
    start,
    stop,
    destroy({ releaseContext = true } = {}) {
      if (destroyed) return;
      stop();
      destroyed = true;
      canvas.removeEventListener?.("webglcontextlost", onContextLost);
      canvas.removeEventListener?.("webglcontextrestored", onContextRestored);
      const loseContext = releaseContext && gl && !gl.isContextLost?.() ? gl.getExtension?.("WEBGL_lose_context") : null;
      releaseResources();
      loseContext?.loseContext();
      gl = null;
    },
    get backend() {
      return backend;
    },
    get context() {
      return gl;
    },
    get phase() {
      return phase;
    },
    get running() {
      return isRunning;
    },
  };
}

// Chrome keeps only 4 live WebGL contexts per worker (measured on PC and A04s), so renderers with their own context are spread over several
// workers, at most 4 contexts each; the shared hub (end of file) always sits in the first worker and does not count toward the 4. `flowWorkersFailed`
// is set when a worker cannot be created, so the caller falls back to the main-thread renderer.
const FLOW_WORKER_CONTEXTS = 4;
const flowWorkers = [];
let flowWorkersFailed = false;
let flowWorkerId = 0;
const flowWorkerBackends = new Map();
function flowWorkerSlot(shared) {
  let slot = shared ? flowWorkers[0] : flowWorkers.find(({ live }) => live < FLOW_WORKER_CONTEXTS);
  if (!slot) {
    try {
      const worker = new Worker(new URL("./skeleton-flow-worker.mjs", import.meta.url), { type: "module" });
      worker.onmessage = ({ data }) => flowWorkerBackends.get(data.id)?.(data.backend);
      slot = { worker, live: 0 };
      flowWorkers.push(slot);
    } catch {
      flowWorkersFailed = true;
      return null;
    }
  }
  if (!shared) slot.live++;
  return slot;
}
export const skeletonFlowWorkerSupported = () => !flowWorkersFailed && typeof Worker === "function"
  && typeof OffscreenCanvas === "function" && "transferControlToOffscreen" in HTMLCanvasElement.prototype;

// Renderer running in a worker, same API as createSkeletonFlowRenderer. The main-thread phase is computed from the run time
// to save on release; it only differs from the worker when a worker frame takes longer than 50ms.
export function createSkeletonFlowWorkerRenderer(canvas, options) {
  if (!skeletonFlowWorkerSupported()) return null;
  const slot = flowWorkerSlot(options.shared);
  if (!slot) return null;
  const { worker } = slot;
  const id = ++flowWorkerId;
  const offscreen = canvas.transferControlToOffscreen();
  worker.postMessage({ id, type: "create", canvas: offscreen, options }, [offscreen]);
  // The only caller (catalog-runtime) always passes preset, phase, dimensions and speed in full.
  const { preset, speedScale, direction } = options;
  let phase = options.initialPhase;
  let startedAt = null;
  let destroyed = false;
  flowWorkerBackends.set(id, (value) => { canvas.dataset.masonryFlowBackend = value; });
  const send = (type) => !destroyed && worker.postMessage({ id, type });
  const settlePhase = () => {
    if (startedAt === null) return;
    const now = performance.now();
    phase = advanceSkeletonFlowPhase(phase, (now - startedAt) / 1000, preset.field.speed * speedScale, direction, Infinity);
    startedAt = now;
  };
  const stop = () => {
    settlePhase();
    startedAt = null;
    send("stop");
  };
  return {
    draw: () => send("draw"),
    start() {
      if (destroyed || startedAt !== null) return;
      startedAt = performance.now();
      send("start");
    },
    stop,
    destroy() {
      if (destroyed) return;
      stop();
      send("destroy");
      destroyed = true;
      if (!options.shared) slot.live--;
      flowWorkerBackends.delete(id);
    },
    backend: "webgl",
    get phase() {
      settlePhase();
      return phase;
    },
  };
}

// Chrome keeps only 4 live WebGL contexts per worker (advertising-skeleton R5): the worker keeps one shared context, and each frame
// draws every running frame in turn then copies the bitmap to the frame's bitmaprenderer canvas, so the number of running frames is not capped.
let flowHub;
function sharedFlowHub() {
  if (flowHub !== undefined) return flowHub;
  const surface = new OffscreenCanvas(FLOW_WIDTH, FLOW_HEIGHT);
  const attributes = SKELETON_FLOW_CONTEXT_ATTRIBUTES;
  let gl = surface.getContext("webgl", attributes);
  let locations = null;
  // Build program, buffer, noise; called again after webglcontextrestored.
  const setup = () => {
    const program = gl && contextProgram(gl);
    if (!program) return false;
    gl.useProgram(program);
    bindQuadAndNoise(gl, program, gl.createBuffer(), gl.createTexture());
    const uniform = (name) => gl.getUniformLocation(program, name);
    locations = {
      time: uniform("uTime"), scale: uniform("uScale"), distortion: uniform("uDistortion"), swirl: uniform("uSwirl"),
      noise: uniform("uNoiseOpacity"), anchors: uniform("uAnchors[0]"), colors: uniform("uColors[0]"), balances: uniform("uBalances"),
    };
    return true;
  };
  if (!setup()) return (flowHub = null);
  const entries = new Set();
  let frameId = 0;
  let lastTimestamp = -1;
  let lost = false;
  // The context-loss event arrives one task later, during which transferToImageBitmap already threw.
  const paint = (entry) => {
    if (lost || gl.isContextLost()) return;
    const { field, finish } = entry.preset;
    gl.uniform1f(locations.time, entry.phase);
    gl.uniform1f(locations.scale, field.scale);
    gl.uniform1f(locations.distortion, field.distortion);
    gl.uniform1f(locations.swirl, field.swirl);
    gl.uniform1f(locations.noise, 0.5 * finish.noise / 100);
    gl.uniform2fv(locations.anchors, entry.anchors);
    gl.uniform3fv(locations.colors, entry.colors);
    gl.uniform4fv(locations.balances, entry.balances);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    entry.target.transferFromImageBitmap(surface.transferToImageBitmap());
  };
  const tick = (timestamp) => {
    frameId = 0;
    if (lost) return;
    const delta = lastTimestamp < 0 ? 0 : (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    for (const entry of entries) {
      entry.phase = advanceSkeletonFlowPhase(entry.phase, delta, entry.preset.field.speed * entry.speedScale, entry.direction);
      paint(entry);
    }
    if (entries.size) frameId = requestAnimationFrame(tick);
    else lastTimestamp = -1;
  };
  const resume = () => {
    if (!frameId && !lost && entries.size) frameId = requestAnimationFrame(tick);
  };
  // The shared context is the worker's only context so it is not dropped by the limit of 4; when lost to a GPU reset the frames keep their last image,
  // and on restore it rebuilds and continues running.
  surface.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    programByContext.delete(gl);
    lost = true;
    cancelAnimationFrame(frameId);
    frameId = 0;
    lastTimestamp = -1;
  });
  surface.addEventListener("webglcontextrestored", () => {
    gl = surface.getContext("webgl", attributes);
    lost = !setup();
    resume();
  });
  return (flowHub = { entries, paint, resume });
}

// Same API as createSkeletonFlowRenderer; runs only in a worker.
export function createSkeletonFlowSharedRenderer(canvas, { preset, initialPhase = FLOW_CLOCK_START, direction = 1, speedScale = 1 }) {
  const hub = sharedFlowHub();
  const target = hub && canvas.getContext("bitmaprenderer");
  if (!target) return null;
  const entry = {
    target, preset, speedScale, direction: direction < 0 ? -1 : 1, phase: Number(initialPhase) || FLOW_CLOCK_START,
    ...presetUniforms(preset),
  };
  const stop = () => hub.entries.delete(entry);
  return {
    backend: "webgl",
    draw: () => hub.paint(entry),
    start() {
      hub.entries.add(entry);
      hub.resume();
    },
    stop,
    destroy: stop,
    get phase() { return entry.phase; },
    get running() { return hub.entries.has(entry); },
  };
}

// One WebGL context draws every batch frame: 7-8 dedicated contexts overload the old A05s GPU (round 18), a shared canvas at half
// resolution passes the gate (round 20, advertising-skeleton R5). The canvas is 2 viewports tall and only shifts when the viewport leaves it.
// One layer for the whole document: the runtime attaches the canvas to the current batch, and a remounting controller reuses the context.
// Share of a reveal spent turning Flow into frosted glass; the rest clears the glass (sample 10 the owner chose, 2026-11-12).
const FROST_SHARE = 0.45;
export function createSharedSkeletonFlowLayer() {
  const scale = 0.5;
  const canvas = document.createElement("canvas");
  canvas.className = "masonry-grid__cta-shared-flow";
  canvas.setAttribute("aria-hidden", "true");
  const attributes = { ...SKELETON_FLOW_CONTEXT_ATTRIBUTES, alpha: true, premultipliedAlpha: true };
  let gl = canvas.getContext("webgl", attributes);
  if (!gl) return null;
  let locations = null;
  let linkFrame = 0;
  const entries = new Set();
  let frameId = 0;
  let lost = false;
  let lastTimestamp = -1;
  let bandTop = -1;
  let bandHeight = 0;
  let container = null;

  const placeBand = () => {
    const viewport = innerHeight;
    if (container !== canvas.parentElement) {
      container = canvas.parentElement;
      bandHeight = 0;
    }
    const height = Math.min(container.offsetHeight, viewport * 2);
    const visibleTop = -container.getBoundingClientRect().top;
    // A window resize changes the batch width while the band does not move, so compare the canvas width too.
    const width = Math.round(container.offsetWidth * scale);
    if (height !== bandHeight || width !== canvas.width
      || visibleTop < bandTop || visibleTop + viewport > bandTop + bandHeight) {
      bandTop = Math.max(0, Math.min(container.offsetHeight - height, visibleTop - viewport / 2));
      bandHeight = height;
      canvas.style.height = `${height}px`;
      canvas.style.transform = `translateY(${bandTop}px)`;
      const pixels = Math.round(height * scale);
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== pixels) canvas.height = pixels;
    }
  };
  const clear = () => {
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };
  const halt = () => {
    cancelAnimationFrame(frameId);
    frameId = 0;
    lastTimestamp = -1;
  };
  const resume = () => {
    if (!frameId && !lost && locations && entries.size) frameId = requestAnimationFrame(tick);
  };

  // Build program, buffer, noise texture; called again after webglcontextrestored. Where KHR_parallel_shader_compile exists the
  // link status is read only once the driver reports it done, a later frame: reading it at once blocked the main thread 27ms in the
  // first reveal burst on the owner's PC (3b.2 run 2). Until then the canvas stays clear and each frame shows its still image.
  const setup = () => {
    cancelAnimationFrame(linkFrame);
    locations = null;
    const parallel = gl.getExtension("KHR_parallel_shader_compile");
    const program = startProgram(gl);
    if (!program) return false;
    const finish = () => {
      linkFrame = 0;
      if (lost) return false;
      if (parallel && !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) {
        linkFrame = requestAnimationFrame(finish);
        return true;
      }
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        lost = true;
        return false;
      }
      gl.useProgram(program);
      bindQuadAndNoise(gl, program, gl.createBuffer(), gl.createTexture());
      const uniform = (name) => gl.getUniformLocation(program, name);
      locations = {
        time: uniform("uTime"), scale: uniform("uScale"), distortion: uniform("uDistortion"), swirl: uniform("uSwirl"),
        noise: uniform("uNoiseOpacity"), anchors: uniform("uAnchors[0]"), colors: uniform("uColors[0]"), balances: uniform("uBalances"),
        frost: uniform("uFrost"), tinySize: uniform("uTinySize"), tinyBox: uniform("uTinyBox"), tinyCover: uniform("uTinyCover"),
      };
      // The photo's 20px copy sits at unit 1 while a frame reveals; unit 0 keeps the noise.
      gl.uniform1i(uniform("uTiny"), 1);
      // Alpha reveal through a constant blend: the shader is shared with the dedicated renderer so no extra uniform is added.
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.CONSTANT_ALPHA, gl.ZERO);
      // Warm-up draw: the GPU compiles the program on its first draw. With the blend constant at its default alpha 0 nothing shows.
      gl.viewport(0, 0, 1, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      resume();
      return true;
    };
    return parallel ? Boolean(linkFrame = requestAnimationFrame(finish)) : finish();
  };
  if (!setup()) return null;

  function tick(timestamp) {
    frameId = 0;
    if (!entries.size || lost || !locations || !canvas.parentElement) return;
    const delta = lastTimestamp < 0 ? 0 : (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    placeBand();
    clear();
    gl.enable(gl.SCISSOR_TEST);
    // Rect instead of offsetTop: frames slide by `translate` when masonry shifts, and the canvas draws at the visible position.
    const origin = container.getBoundingClientRect();
    for (const entry of entries) {
      entry.phase = advanceSkeletonFlowPhase(entry.phase, delta, entry.preset.field.speed * entry.speedScale, entry.direction);
      const { frame } = entry;
      // A frame not yet entered is not drawn; a frame entering is drawn by the reveal opacity (R4).
      if (!frame.isConnected || !frame.classList.contains("is-entry-ready")) continue;
      const { reveal } = entry;
      let alpha;
      let frost = 0;
      if (reveal) {
        // Reveal: Flow turns into frosted glass of the photo over the first 45%, then the glass clears to the photo under it.
        reveal.start ??= timestamp;
        const progress = Math.min(1, (timestamp - reveal.start) / reveal.duration);
        frost = reveal.texture ? smoothValue(progress / FROST_SHARE) : 0;
        alpha = reveal.texture ? 1 - smoothValue((progress - FROST_SHARE) / (1 - FROST_SHARE)) : 1 - smoothValue(progress);
        // Stays clear until the runtime stops the frame.
        if (progress >= 1) reveal.resolve();
      } else alpha = entry.alpha();
      const box = frame.getBoundingClientRect();
      const top = box.top - origin.top - bandTop;
      const { height } = box;
      if (alpha <= 0 || top + height < 0 || top > bandHeight) continue;
      const x = Math.round((box.left - origin.left) * scale);
      const w = Math.round(box.width * scale);
      const h = Math.round(height * scale);
      const y = canvas.height - Math.round(top * scale) - h;
      gl.viewport(x, y, w, h);
      gl.scissor(x, y, w, h);
      gl.blendColor(0, 0, 0, alpha);
      gl.uniform1f(locations.frost, frost);
      if (frost > 0) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, reveal.texture);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform2f(locations.tinySize, reveal.width, reveal.height);
        gl.uniform4fv(locations.tinyBox, reveal.box);
        gl.uniform2fv(locations.tinyCover, reveal.cover);
      }
      const { field, finish } = entry.preset;
      gl.uniform1f(locations.time, entry.phase);
      gl.uniform1f(locations.scale, field.scale);
      gl.uniform1f(locations.distortion, field.distortion);
      gl.uniform1f(locations.swirl, field.swirl);
      gl.uniform1f(locations.noise, 0.5 * finish.noise / 100);
      gl.uniform2fv(locations.anchors, entry.anchors);
      gl.uniform3fv(locations.colors, entry.colors);
      gl.uniform4fv(locations.balances, entry.balances);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    frameId = requestAnimationFrame(tick);
  }

  // Context lost: the canvas is blank so the static frame under each frame shows through; on restore it rebuilds and continues running.
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    halt();
  });
  canvas.addEventListener("webglcontextrestored", () => {
    gl = canvas.getContext("webgl", attributes);
    lost = false;
    lost = !setup();
    resume();
  });

  return {
    canvas,
    // Leaving the document does not enter BFCache: return the context exactly once.
    dispose() {
      entries.clear();
      halt();
      cancelAnimationFrame(linkFrame);
      if (!gl.isContextLost()) gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
    attach(frame, { preset, initialPhase = FLOW_CLOCK_START, direction = 1, speedScale = 1, alpha }) {
      const entry = {
        frame, preset, alpha, direction: direction < 0 ? -1 : 1, speedScale, phase: Number(initialPhase) || FLOW_CLOCK_START,
        ...presetUniforms(preset),
      };
      const endReveal = () => {
        if (!entry.reveal) return;
        if (entry.reveal.texture && !gl.isContextLost()) gl.deleteTexture(entry.reveal.texture);
        entry.reveal.resolve();
        entry.reveal = null;
      };
      const stop = () => {
        endReveal();
        entries.delete(entry);
        if (entries.size || !frameId) return;
        halt();
        clear();
      };
      return {
        backend: "webgl",
        context: null,
        draw() { return true; },
        start() {
          entries.add(entry);
          resume();
        },
        stop,
        destroy: stop,
        get phase() { return entry.phase; },
        get running() { return entries.has(entry); },
        // Reveal the photo under this frame in `duration` ms through frosted glass made from `tiny` (an ImageBitmap of about 20px, flipped
        // for WebGL; null fades Flow out). `box` is the photo's rect in the frame (x, y from the bottom left, width, height, all 0..1) and `cover`
        // the share of the photo the spare area shows. Resolves when done or when the frame stops; null when the layer cannot draw.
        reveal(tiny, duration, { box = [0, 0, 1, 1], cover = [1, 1] } = {}) {
          if (lost || !locations || !entries.has(entry)) return null;
          endReveal();
          let texture = null;
          if (tiny) {
            texture = gl.createTexture();
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tiny);
            gl.activeTexture(gl.TEXTURE0);
          }
          return new Promise((resolve) => {
            entry.reveal = { texture, width: tiny?.width || 1, height: tiny?.height || 1, box, cover, duration, start: null, resolve };
            resume();
          });
        },
      };
    },
  };
}
