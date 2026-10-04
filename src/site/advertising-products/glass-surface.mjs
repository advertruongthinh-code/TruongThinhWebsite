// Kính: one glass component for every glass surface (docs/specs/glass-surface.md).
// Five blur steps (levels 2, 4.5, 9, 16, 28px; increments in detail.css), then the white tint and the grain.
const STEPS = 5;
// Owner's final arc (04/10): apex at half the CTA cluster, radius 4 viewport widths, band 1.2 cluster heights.
const ARC = Object.freeze({ centre: 0.5, radius: 4, band: 1.2 });
// Band position (0 on the arc, 1 at the band edge) where each step runs from fully on to off; neighbours overlap.
const RAMPS = Array.from({ length: STEPS }, (_, index) =>
  [Math.max(0, (STEPS - 1 - index) / STEPS - 0.1), Math.min(1, (STEPS - index) / STEPS + 0.1)]);
const GRAIN_SIZE = 160;
let grainReady = false;

// Static mono noise, one texel per device pixel; overlay keeps pure white white.
function ensureGrain() {
  if (grainReady) return;
  grainReady = true;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = GRAIN_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return;
  const image = context.createImageData(GRAIN_SIZE, GRAIN_SIZE);
  let state = 0x9e3779b9;
  for (let index = 0; index < GRAIN_SIZE * GRAIN_SIZE; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const value = state >>> 24;
    image.data.set([value, value, value, 255], index * 4);
  }
  context.putImageData(image, 0, 0);
  const root = document.documentElement;
  root.style.setProperty("--glass-grain-size", `${GRAIN_SIZE / (window.devicePixelRatio || 1)}px`);
  canvas.toBlob((blob) => blob && root.style.setProperty("--glass-grain", `url(${URL.createObjectURL(blob)})`));
}

export function createGlassSurface(shape) {
  ensureGrain();
  const glass = document.createElement("div");
  glass.className = "glass-surface";
  glass.dataset.glassShape = shape;
  glass.setAttribute("aria-hidden", "true");
  // A static even surface looks the same through one full step as through five stacked ones, at about half the cost.
  for (let index = 0; index < (shape === "arc" ? STEPS : 1); index += 1) {
    glass.append(Object.assign(document.createElement("i"), { className: "glass-surface__step" }));
  }
  glass.append(
    Object.assign(document.createElement("i"), { className: "glass-surface__tint" }),
    Object.assign(document.createElement("i"), { className: "glass-surface__grain" }),
  );
  return glass;
}

// Arc circle in the glass box's coordinates: apex yIn, radius R, band T, centre (W / 2, cy),
// and dFull, the circle through the two batch bottom corners where the white turns pure.
export function arcGlassGeometry({ width, batchBottom, realBottom, cardWidth, clusterTop, clusterBottom }) {
  const whiteRamp = 0.25 * cardWidth;
  const clusterHeight = clusterBottom - clusterTop;
  const yIn = Math.min(clusterTop + ARC.centre * clusterHeight, batchBottom - 2 * whiteRamp);
  // The band edge never rises above the real photos.
  const band = Math.max(8, Math.min(ARC.band * clusterHeight, yIn - realBottom));
  const depth = batchBottom - yIn;
  // Smallest radius that keeps both bottom corners a quarter card inside the arc, so they stay pure white.
  const minRadius = (depth * depth - whiteRamp * whiteRamp + width * width / 4) / (2 * (depth - whiteRamp));
  const radius = Math.max(ARC.radius * width, minRadius);
  const cy = yIn + radius;
  return { width, batchBottom, yIn, band, radius, cy, dFull: Math.hypot(width / 2, cy - batchBottom) };
}

const smooth = (x) => x * x * (3 - 2 * x);
const setMask = (node, value) => {
  node.style.setProperty("-webkit-mask-image", value);
  node.style.setProperty("mask-image", value);
};

export function layoutArcGlass(glass, { width, batchBottom, band, radius, cy, dFull }) {
  // Two pixels run under the footer so subpixel rounding never shows a frame edge.
  const place = (node, top) => Object.assign(node.style, { top: `${top}px`, height: `${batchBottom + 2 - top}px` });
  const circle = (top) => `circle at ${width / 2}px ${cy - top}px`;
  glass.querySelectorAll(".glass-surface__step").forEach((step, index) => {
    const outer = radius + RAMPS[index][1] * band;
    place(step, cy - outer);
    setMask(step, `radial-gradient(${circle(cy - outer)}, #000 ${radius + RAMPS[index][0] * band}px, transparent ${outer}px)`);
  });
  const top = cy - radius - band;
  // White follows the same circles: pure from the corner circle, tint on the arc, none at the band edge.
  const stops = [];
  for (let index = 0; index <= 8; index += 1) {
    const x = index / 8;
    stops.push(`rgba(255, 255, 255, ${(0.12 + 0.88 * smooth(1 - x)).toFixed(4)}) ${(dFull + (radius - dFull) * x).toFixed(1)}px`);
  }
  for (let index = 1; index <= 8; index += 1) {
    const x = index / 8;
    stops.push(`rgba(255, 255, 255, ${(0.12 * smooth(1 - x)).toFixed(4)}) ${(radius + band * x).toFixed(1)}px`);
  }
  const tint = glass.querySelector(".glass-surface__tint");
  place(tint, top);
  tint.style.background = `radial-gradient(${circle(top)}, #fff ${dFull.toFixed(1)}px, ${stops.join(", ")})`;
  const grain = glass.querySelector(".glass-surface__grain");
  place(grain, top);
  // Grain fades out toward the pure white circle, so pure white stays grain free.
  setMask(grain, `radial-gradient(${circle(top)}, transparent ${dFull.toFixed(1)}px, #000 ${((dFull + radius) / 2).toFixed(1)}px, `
    + `#000 ${radius}px, transparent ${radius + band}px)`);
}
