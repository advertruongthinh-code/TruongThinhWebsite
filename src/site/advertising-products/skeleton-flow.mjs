const FLOW_WIDTH = 240;
import { shuffleWithSeed } from "./random-order.mjs";
// Một context giữ attribute của lần getContext đầu tiên, nên lease tạo sẵn phải dùng những giá trị này.
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

// Vẽ một frame Flow khi nó lần đầu vào view; `neighbors` là assignment của các frame kề (cho phép pha live).
export function drawSkeletonFlowAssignment({
  neighbors = [],
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
    preset: freezePreset(source, anchorPermutation.map((anchorIndex) => source.anchors[anchorIndex])),
    anchorPermutation,
    phase,
    direction: normalizedRandom(random) < 0.5 ? -1 : 1,
    speedScale: 0.9 + normalizedRandom(random) * 0.2,
  });
}

const SKELETON_RATIO_BANDS = Object.freeze([
  Object.freeze({ id: "landscape", ratio: 0.72 }),
  Object.freeze({ id: "square", ratio: 1 }),
  Object.freeze({ id: "portrait", ratio: 1.32 }),
]);

export function createSkeletonFlowFrameLayout({
  columnBottoms,
  columns,
  cardWidth,
  gap,
  boundaryBottom,
  maxFrames = Number.MAX_SAFE_INTEGER,
  seed,
  bandAssignments,
} = {}) {
  if (!Array.isArray(columnBottoms) || !Number.isInteger(columns) || columns < 1
    || columnBottoms.length < columns || columnBottoms.slice(0, columns).some((bottom) => !Number.isFinite(bottom))
    || !Number.isFinite(cardWidth) || cardWidth <= 0
    || !Number.isFinite(gap) || gap < 0 || !Number.isFinite(boundaryBottom)
    || !Number.isInteger(maxFrames) || maxFrames < columns) {
    throw new TypeError("Skeleton frame layout requires valid column geometry");
  }
  const baseBands = [SKELETON_RATIO_BANDS[1], SKELETON_RATIO_BANDS[0], SKELETON_RATIO_BANDS[2]];
  const buildCandidate = (candidateSeed) => {
    const frames = [];
    const bottoms = columnBottoms.slice(0, columns);
    const depths = Array(columns).fill(0);
    const previousBandByColumn = new Map();
    const rowBands = new Map();
    while (frames.length < maxFrames) {
      const column = bottoms.reduce((shortest, bottom, index) =>
        bottom < bottoms[shortest] ? index : shortest, 0);
      const top = Number(bottoms[column]) + gap;
      if (top >= boundaryBottom) break;
      const depth = depths[column];
      const slot = `${column}:${depth}`;
      let source;
      const assignedBand = bandAssignments?.get?.(slot);
      const preservedBand = SKELETON_RATIO_BANDS.find((band) => band.id === assignedBand);
      if (preservedBand) {
        source = preservedBand;
      } else if (candidateSeed === null) {
        source = baseBands[(depth + column) % baseBands.length];
      } else {
        const candidates = shuffleWithSeed(SKELETON_RATIO_BANDS, candidateSeed, `frame:${column}:${depth}`);
        const unavailable = rowBands.get(depth) || new Set();
        source = candidates.find((band) => band.id !== previousBandByColumn.get(column)?.id && !unavailable.has(band.id))
          || candidates.find((band) => band.id !== previousBandByColumn.get(column)?.id)
          || candidates[0];
      }
      const height = cardWidth * source.ratio;
      frames.push({ slot, column, depth, band: source.id, top, height });
      previousBandByColumn.set(column, source);
      if (!rowBands.has(depth)) rowBands.set(depth, new Set());
      rowBands.get(depth).add(source.id);
      depths[column] += 1;
      bottoms[column] = top + height;
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

  // Frame cuối của mỗi cột kết thúc ở đáy batch; phần dư dưới một phần tư card được cộng vào frame phía trên.
  const dropped = new Set();
  for (let column = 0; column < columns; column += 1) {
    const own = selectedFrames.filter((frame) => frame.column === column);
    if (own.length && boundaryBottom - own.at(-1).top < cardWidth * 0.25) dropped.add(own.pop());
    if (own.length) own.at(-1).height = boundaryBottom - own.at(-1).top;
  }
  const result = selectedFrames.filter((frame) => !dropped.has(frame)).map((frame) => Object.freeze(frame));
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

export function advanceSkeletonFlowPhase(phase, deltaSeconds, speed, direction = 1) {
  const delta = Math.min(MAX_DELTA_SECONDS, Math.max(0, Number(deltaSeconds) || 0));
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
  // Không hỏi COMPILE_STATUS: lỗi compile làm link lỗi, và LINK_STATUS được hỏi khi program đã xong.
  return shader;
}

// Shader giống nhau cho mọi preset (uniform đặt riêng mỗi lease), nên mỗi context chỉ compile một lần.
// Context mất rồi khôi phục thì isProgram trả false và compile lại.
const programByContext = new WeakMap();
// Bắt đầu compile và link mà không hỏi trạng thái: câu hỏi đầu tiên chặn main thread chờ GPU process.
function startProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, SKELETON_FLOW_FRAGMENT_SHADER);
  const program = vertex && fragment && gl.createProgram();
  if (program) {
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
  }
  if (vertex) gl.deleteShader(vertex);
  if (fragment) gl.deleteShader(fragment);
  return program || null;
}

// Với KHR_parallel_shader_compile, GPU process compile nền: trả true khi program của context đã xong, không chặn
// (A05s: compile đồng bộ 30-175ms trong task mount). Không có extension thì compile ngay như trước.
export function skeletonFlowProgramReady(gl) {
  const cached = programByContext.get(gl);
  const program = cached && gl.isProgram?.(cached) !== false ? cached : startProgram(gl);
  if (!program) return true;
  programByContext.set(gl, program);
  const parallel = gl.getExtension?.("KHR_parallel_shader_compile");
  return !parallel || gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR) !== false;
}

function contextProgram(gl) {
  skeletonFlowProgramReady(gl);
  const program = programByContext.get(gl);
  if (program && gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  if (program) gl.deleteProgram(program);
  programByContext.delete(gl);
  return null;
}

// Một noise chung cho mọi renderer: grain chỉ hiện 3-4%, còn tạo lại 256x256 mỗi lần mount tốn hơn 10ms trên A05s
// (decision a05s-frame-budget).
let sharedNoise;
function createNoise() {
  if (sharedNoise) return sharedNoise;
  let state = 0x2f6b;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
  // Một kênh LUMINANCE: shader chỉ đọc .r, nên ít hơn 4 lần byte phải ghi và upload mà ảnh không đổi.
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

// Bản sao CPU của SKELETON_FLOW_FRAGMENT_SHADER tại `phase`, các hàng từ trên xuống. Grain bị bỏ: ở
// kích thước này nó sẽ upscale thành vệt, và ở opacity 3-4% frame live vẫn khớp khi không có nó.
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

// Frame tĩnh cho frame không có renderer live: cùng Flow tại `phase`, dạng CSS image.
// Mã hóa tay thành BMP 24-bit không nén: canvas.toDataURL ép GPU readback và PNG encode cho mỗi ảnh tĩnh.
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
    // Hàng BMP chạy từ dưới lên theo thứ tự BGR; 48 * 3 byte không cần row padding.
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
    // Giữ ảnh tĩnh mà caller đã vẽ; nếu không thì fallback về gradient tĩnh.
    canvas.style.backgroundColor ||= preset.colors[3];
    canvas.style.backgroundImage ||= staticBackground(preset);
    canvas.style.filter = preset.finish.soften ? `blur(${preset.finish.soften}px)` : "none";
    canvas.style.transform = `scale(${1 + preset.finish.soften / 200})`;
  }

  let gl = canvas.getContext("webgl", SKELETON_FLOW_CONTEXT_ATTRIBUTES) || canvas.getContext("experimental-webgl");
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
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniform = (name) => gl.getUniformLocation(program, name);
    timeLocation = uniform("uTime");
    const colors = new Float32Array(preset.colors.flatMap(parseHex));
    const anchors = new Float32Array(preset.anchors.flatMap(({ x, y }) => [x, y]));
    const edges = [0, ...preset.bands, 1];
    const balances = new Float32Array(edges.slice(0, 4).map((edge, index) =>
      4 * (edges[index + 1] - edge)));
    gl.uniform1f(uniform("uScale"), preset.field.scale);
    gl.uniform1f(uniform("uDistortion"), preset.field.distortion);
    gl.uniform1f(uniform("uSwirl"), preset.field.swirl);
    gl.uniform1f(uniform("uNoiseOpacity"), 0.5 * preset.finish.noise / 100);
    gl.uniform2fv(uniform("uAnchors[0]"), anchors);
    gl.uniform3fv(uniform("uColors[0]"), colors);
    gl.uniform4fv(uniform("uBalances"), balances);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 256, 0,
      gl.LUMINANCE, gl.UNSIGNED_BYTE, createNoise());
    gl.uniform1i(uniform("uNoise"), 0);
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
    if (canvas.dataset) canvas.dataset.advertisingFlowBackend = "fallback";
  };
  const onContextRestored = () => {
    if (destroyed) return;
    gl = canvas.getContext("webgl", SKELETON_FLOW_CONTEXT_ATTRIBUTES);
    if (initializeWebGl()) {
      if (canvas.dataset) canvas.dataset.advertisingFlowBackend = "webgl";
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
