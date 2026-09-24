const FLOW_WIDTH = 240;
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

const saturate = (value) => Math.min(1, Math.max(0, value));
const smooth = (value) => {
  const clamped = saturate(value);
  return clamped * clamped * (3 - 2 * clamped);
};

const parseHex = (value) => [
  Number.parseInt(value.slice(1, 3), 16) / 255,
  Number.parseInt(value.slice(3, 5), 16) / 255,
  Number.parseInt(value.slice(5, 7), 16) / 255,
];

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  const actual = Object.keys(value);
  const unknown = actual.filter((key) => !keys.includes(key));
  if (unknown.length) throw new TypeError(`${label} has unknown field: ${unknown.join(", ")}`);
  const missing = keys.filter((key) => !actual.includes(key));
  if (missing.length) throw new TypeError(`${label} is missing field: ${missing.join(", ")}`);
}

function rangedNumber(value, minimum, maximum, label) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TypeError(`${label} must be within ${minimum}..${maximum}`);
  }
  return value;
}

function freezePreset(preset) {
  preset.colors = Object.freeze(preset.colors);
  preset.anchors = Object.freeze(preset.anchors.map((anchor) => Object.freeze(anchor)));
  preset.bands = Object.freeze(preset.bands);
  preset.field = Object.freeze(preset.field);
  preset.finish = Object.freeze(preset.finish);
  return Object.freeze(preset);
}

export function parseSkeletonFlowPreset(input) {
  const value = typeof input === "string" ? JSON.parse(input) : input;
  exactKeys(value, ["id", "colors", "anchors", "bands", "field", "finish"], "preset");
  if (typeof value.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id)) {
    throw new TypeError("preset id must be a non-empty slug");
  }
  if (!Array.isArray(value.colors) || value.colors.length !== 4
    || !value.colors.every((color) => /^#[0-9a-f]{6}$/i.test(color))) {
    throw new TypeError("preset colors must contain exactly four hex colors");
  }
  if (!Array.isArray(value.anchors) || value.anchors.length !== 4) {
    throw new TypeError("preset anchors must contain exactly four points");
  }
  const anchors = value.anchors.map((anchor, index) => {
    exactKeys(anchor, ["x", "y"], `preset anchors[${index}]`);
    return {
      x: rangedNumber(anchor.x, 0, 1, `preset anchors[${index}].x`),
      y: rangedNumber(anchor.y, 0, 1, `preset anchors[${index}].y`),
    };
  });
  if (!Array.isArray(value.bands) || value.bands.length !== 3
    || value.bands.some((band) => !Number.isFinite(band) || band <= 0 || band >= 1)
    || value.bands.some((band, index) => index > 0 && band <= value.bands[index - 1])) {
    throw new TypeError("preset bands must contain three strictly increasing values within 0..1");
  }
  exactKeys(value.field, ["scale", "distortion", "swirl", "speed"], "preset field");
  exactKeys(value.finish, ["soften", "noise"], "preset finish");
  return freezePreset({
    id: value.id,
    colors: value.colors.map((color) => color.toUpperCase()),
    anchors,
    bands: value.bands.map((band, index) => rangedNumber(band, 0, 1, `preset bands[${index}]`)),
    field: {
      scale: rangedNumber(value.field.scale, 0, 100, "preset field scale"),
      distortion: rangedNumber(value.field.distortion, 0, 100, "preset field distortion"),
      swirl: rangedNumber(value.field.swirl, 0, 100, "preset field swirl"),
      speed: rangedNumber(value.field.speed, 0, 100, "preset field speed"),
    },
    finish: {
      soften: rangedNumber(value.finish.soften, 0, 80, "preset finish soften"),
      noise: rangedNumber(value.finish.noise, 0, 100, "preset finish noise"),
    },
  });
}

export function parseSkeletonFlowPresets(input) {
  const values = typeof input === "string" ? JSON.parse(input) : input;
  if (!Array.isArray(values) || values.length !== 12) {
    throw new TypeError("Flow config must contain exactly 12 presets");
  }
  const presets = values.map(parseSkeletonFlowPreset);
  if (new Set(presets.map(({ id }) => id)).size !== presets.length) {
    throw new TypeError("Flow preset IDs must be unique");
  }
  return Object.freeze(presets);
}

const sourcePresets = RAW_PRESETS.map(({ id, colors, distortion, swirl, speed, noise }) => ({
  id,
  colors,
  anchors: P100_ANCHORS.map(([x, y]) => ({ x, y })),
  bands: [...BANDS],
  field: { scale: 100, distortion, swirl, speed },
  finish: { soften: 0, noise },
}));

export const SKELETON_FLOW_PRESETS = parseSkeletonFlowPresets(sourcePresets);

export function selectSkeletonFlowPreset(random = Math.random) {
  const value = Math.min(0.999999, Math.max(0, Number(random()) || 0));
  return SKELETON_FLOW_PRESETS[Math.floor(value * SKELETON_FLOW_PRESETS.length)];
}

const normalizedRandom = (random) => Math.min(0.999999, Math.max(0, Number(random()) || 0));

function shuffled(values, random) {
  const output = values.slice();
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(normalizedRandom(random) * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

function permutations(values) {
  if (values.length <= 1) return [values.slice()];
  return values.flatMap((value, index) => permutations(values.filter((_, candidate) => candidate !== index))
    .map((tail) => [value, ...tail]));
}

export function createSkeletonFlowBatchAssignments({
  count = SKELETON_FLOW_PRESETS.length,
  presets = SKELETON_FLOW_PRESETS,
  random = Math.random,
} = {}) {
  if (!Number.isInteger(count) || count < 0 || count > presets.length || count > 24) {
    throw new TypeError("Flow batch count must be an integer within the available presets and permutations");
  }
  if (typeof random !== "function") throw new TypeError("Flow batch random must be a function");
  const presetOrder = shuffled(presets, random).slice(0, count);
  const anchorOrders = shuffled(permutations([0, 1, 2, 3]), random).slice(0, count);
  const phaseOffset = normalizedRandom(random) * Math.PI * 2;
  const phases = shuffled(Array.from({ length: count }, (_, index) =>
    FLOW_CLOCK_START + phaseOffset + index * Math.PI * 2 / Math.max(1, count)), random);
  const directionPairs = Array.from({ length: Math.floor(count / 2) }, () => {
    const first = normalizedRandom(random) < 0.5 ? -1 : 1;
    return [first, -first];
  });
  const directions = shuffled(directionPairs, random).flat();
  if (count % 2) directions.push(normalizedRandom(random) < 0.5 ? -1 : 1);
  return presetOrder.map((source, index) => {
    const anchorPermutation = anchorOrders[index];
    const preset = parseSkeletonFlowPreset({
      ...source,
      colors: [...source.colors],
      anchors: anchorPermutation.map((anchorIndex) => ({ ...source.anchors[anchorIndex] })),
      bands: [...source.bands],
      field: { ...source.field },
      finish: { ...source.finish },
    });
    return Object.freeze({
      preset,
      anchorPermutation: Object.freeze(anchorPermutation.slice()),
      phase: phases[index],
      direction: directions[index],
    });
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
} = {}) {
  if (!Array.isArray(columnBottoms) || !Number.isInteger(columns) || columns < 1
    || columnBottoms.length < columns || columnBottoms.slice(0, columns).some((bottom) => !Number.isFinite(bottom))
    || !Number.isFinite(cardWidth) || cardWidth <= 0
    || !Number.isFinite(gap) || gap < 0 || !Number.isFinite(boundaryBottom)
    || !Number.isInteger(maxFrames) || maxFrames < columns) {
    throw new TypeError("Skeleton frame layout requires valid column geometry");
  }
  const frames = [];
  const bottoms = columnBottoms.slice(0, columns);
  const depths = Array(columns).fill(0);
  const baseBands = [SKELETON_RATIO_BANDS[1], SKELETON_RATIO_BANDS[0], SKELETON_RATIO_BANDS[2]];
  while (frames.length < maxFrames) {
    const column = bottoms.reduce((shortest, bottom, index) =>
      bottom < bottoms[shortest] ? index : shortest, 0);
    const top = Number(bottoms[column]) + gap;
    if (top >= boundaryBottom) break;
    const depth = depths[column];
    const source = baseBands[(depth + column) % baseBands.length];
    const height = cardWidth * source.ratio;
    frames.push({ slot: `${column}:${depth}`, column, depth, band: source.id, top, height });
    depths[column] += 1;
    bottoms[column] = top + height;
  }
  return Object.freeze(frames.map((frame) => Object.freeze(frame)));
}

export function advanceSkeletonFlowPhase(phase, deltaSeconds, speed, direction = 1) {
  const delta = Math.min(MAX_DELTA_SECONDS, Math.max(0, Number(deltaSeconds) || 0));
  const signedDirection = direction < 0 ? -1 : 1;
  return phase + signedDirection * (rangedNumber(speed, 0, 100, "Flow speed") / 100) * 1.2 * delta;
}

function automaticAnchor(index, phase) {
  const anchorPhase = 0.37 * index;
  const fx = 0.6 + 0.9 * (index / 3 - Math.floor(index / 3));
  const fyValue = (index + 1) / 4;
  const fy = 0.8 + fyValue - Math.floor(fyValue);
  return [
    0.5 + 0.5 * Math.sin(phase * fx + anchorPhase),
    0.5 + 0.5 * Math.cos(phase * fy + 1.5 * anchorPhase),
  ];
}

function sampleValidatedPreset(preset, xInput, yInput, phase) {
  const scaleFactor = 0.4 + 1.2 * preset.field.scale / 100;
  let x = (Number(xInput) - 0.5) / scaleFactor + 0.5;
  let y = (Number(yInput) - 0.5) / scaleFactor + 0.5;
  const radius = smooth(Math.hypot(x - 0.5, y - 0.5));
  const edge = 1 - radius;
  for (let pass = 1; pass <= 2; pass += 1) {
    x += (preset.field.distortion / 100) * edge / pass
      * Math.sin(phase + 0.4 * pass * smooth(y))
      * Math.cos(0.2 * phase + 2.4 * pass * smooth(y));
    y += (preset.field.distortion / 100) * edge / pass
      * Math.cos(phase + 2 * pass * smooth(x));
  }
  const angle = -3 * (preset.field.swirl / 100) * radius;
  const centeredX = x - 0.5;
  const centeredY = y - 0.5;
  const sine = Math.sin(angle);
  const cosine = Math.cos(angle);
  x = centeredX * cosine - centeredY * sine + 0.5;
  y = centeredX * sine + centeredY * cosine + 0.5;

  const edges = [0, ...preset.bands, 1];
  const colors = preset.colors.map(parseHex);
  const output = [0, 0, 0];
  let totalWeight = 0;
  preset.anchors.forEach((ring, index) => {
    const current = automaticAnchor(index, phase);
    const baseline = automaticAnchor(index, FLOW_CLOCK_START);
    const anchorX = (ring.x - 0.5) / scaleFactor + 0.5
      + 0.2 * (current[0] - baseline[0]) / scaleFactor;
    const anchorY = (ring.y - 0.5) / scaleFactor + 0.5
      + 0.2 * (current[1] - baseline[1]) / scaleFactor;
    const distanceSquared = (x - anchorX) ** 2 + (y - anchorY) ** 2;
    const balance = 4 * (edges[index + 1] - edges[index]);
    const weight = balance / (distanceSquared ** 2 + 0.0001);
    totalWeight += weight;
    for (let channel = 0; channel < 3; channel += 1) {
      output[channel] += colors[index][channel] * weight;
    }
  });
  return output.map((channel) => saturate(channel / totalWeight)).concat(1);
}

export function sampleSkeletonFlowColor(presetInput, xInput, yInput, phase = FLOW_CLOCK_START) {
  return sampleValidatedPreset(parseSkeletonFlowPreset(presetInput), xInput, yInput, phase);
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

function createNoise(seed) {
  let state = (Number(seed) || 0) >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
  const data = new Uint8Array(256 * 256 * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    const value = Math.round((random() + random()) * 0.5 * 255);
    data[offset] = value;
    data[offset + 1] = value;
    data[offset + 2] = value;
    data[offset + 3] = 255;
  }
  return data;
}

export function createSkeletonFlowRenderer(canvas, {
  preset: presetInput = SKELETON_FLOW_PRESETS[0],
  seed = 0,
  initialPhase = FLOW_CLOCK_START,
  direction = 1,
  width = FLOW_WIDTH,
  height = FLOW_HEIGHT,
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (id) => cancelAnimationFrame(id),
  frameInterval = 0,
} = {}) {
  if (!canvas?.getContext) return null;
  const preset = parseSkeletonFlowPreset(presetInput);
  const renderWidth = Math.max(1, Math.round(Number(width) || FLOW_WIDTH));
  const renderHeight = Math.max(1, Math.round(Number(height) || FLOW_HEIGHT));
  canvas.width = renderWidth;
  canvas.height = renderHeight;
  if (canvas.style) {
    canvas.style.backgroundColor = preset.colors[3];
    canvas.style.backgroundImage = staticBackground(preset);
    canvas.style.filter = preset.finish.soften ? `blur(${preset.finish.soften}px)` : "none";
    canvas.style.transform = `scale(${1 + preset.finish.soften / 200})`;
  }

  let gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
  }) || canvas.getContext("experimental-webgl");
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
      if (texture) gl.deleteTexture(texture);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
    } catch {}
    texture = null;
    buffer = null;
    program = null;
    timeLocation = undefined;
  };

  const initializeWebGl = () => {
    if (!gl) return false;
    program = createProgram(gl);
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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, createNoise(seed));
    gl.uniform1i(uniform("uNoise"), 0);
    backend = "webgl";
    return true;
  };

  if (!initializeWebGl() && gl) {
    gl = null;
    backend = "fallback";
  }

  const draw = (timestamp = 0) => {
    if (destroyed) return false;
    if (backend === "webgl" && gl && program) {
      const currentTimestamp = Number(timestamp) || 0;
      if (lastTimestamp >= 0) {
        phase = advanceSkeletonFlowPhase(phase, (currentTimestamp - lastTimestamp) / 1000,
          preset.field.speed, flowDirection);
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
    const wasRunning = isRunning;
    stop();
    resumeAfterRestore = wasRunning;
    releaseResources();
    backend = "fallback";
  };
  const onContextRestored = () => {
    if (destroyed) return;
    gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (initializeWebGl()) {
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
    destroy() {
      if (destroyed) return;
      stop();
      destroyed = true;
      canvas.removeEventListener?.("webglcontextlost", onContextLost);
      canvas.removeEventListener?.("webglcontextrestored", onContextRestored);
      const loseContext = gl?.getExtension?.("WEBGL_lose_context");
      releaseResources();
      loseContext?.loseContext();
      gl = null;
    },
    get backend() {
      return backend;
    },
    get phase() {
      return phase;
    },
    get running() {
      return isRunning;
    },
  };
}
