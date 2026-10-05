// Kính: one glass component for every glass surface (docs/specs/glass-surface.md).
// Blur steps (increments in detail.css), then the white tint and the grain. A surface that fades step by step (spec R6)
// has five (levels 2, 4.5, 9, 16, 28px); the arc's band has three (4.5, 12, 28px; owner, 05/10, for the A05s).
const STEPS = 5;
const ARC_STEPS = 3;
// Owner's arc (05/10): apex at 45% of the CTA cluster, radius 4 viewport widths, band 1.2 cluster heights,
// white tint 0.35 on the arc.
const ARC = Object.freeze({ centre: 0.45, radius: 4, band: 1.2, tint: 0.35 });
// Band position (0 on the arc, 1 at the band edge) where each step runs from fully on to off; neighbours overlap.
const RAMPS = Array.from({ length: ARC_STEPS }, (_, index) =>
  [Math.max(0, (ARC_STEPS - 1 - index) / ARC_STEPS - 0.1), Math.min(1, (ARC_STEPS - index) / ARC_STEPS + 0.1)]);
// Inside the arc all band steps are fully on, so one full step (the core) stands in for them there and the steps
// only cover the band. The core hands over to the steps across FADE px inside the arc, so no seam shows: the core
// ramps in over the outer half while the steps stay on, the steps ramp out over the inner half, so the sharp page
// never shows through a gap where both are partial. Each box
// runs past its mask by its blur reach, 3 sigma of its increment in detail.css (28px for the core).
const FADE = 48;
const STEP_REACH = [14, 34, 76];
const CORE_REACH = 84;
const GRAIN_SIZE = 160;
let grain;
const waitingForGrain = [];

// The grain lives on each Kính, not on html, so its late arrival restyles the glass and not the whole page.
const setGrain = (glass) => {
  glass.style.setProperty("--glass-grain", grain);
  glass.style.setProperty("--glass-grain-size", `${GRAIN_SIZE / (window.devicePixelRatio || 1)}px`);
};

// Static mono noise, one texel per device pixel; overlay keeps pure white white.
function makeGrain() {
  grain = "";
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = GRAIN_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return;
  const image = context.createImageData(GRAIN_SIZE, GRAIN_SIZE);
  const pixels = new Uint32Array(image.data.buffer);
  let state = 0x9e3779b9;
  for (let index = 0; index < pixels.length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    pixels[index] = 0xff000000 | (state >>> 24) * 0x10101;
  }
  context.putImageData(image, 0, 0);
  canvas.toBlob((blob) => {
    if (!blob) return;
    grain = `url(${URL.createObjectURL(blob)})`;
    waitingForGrain.splice(0).forEach(setGrain);
  });
}

// A static even surface looks the same through one full step as through five stacked ones, at about half the cost;
// a surface that fades in or out step by step (spec R6) asks for all five.
export function createGlassSurface(shape, steps = shape === "arc" ? ARC_STEPS : 1) {
  if (grain === undefined) makeGrain();
  const glass = document.createElement("div");
  glass.className = "glass-surface";
  glass.dataset.glassShape = shape;
  glass.setAttribute("aria-hidden", "true");
  if (grain) setGrain(glass);
  else waitingForGrain.push(glass);
  const layers = steps === 1 ? ["glass-surface__step glass-surface__step--full"] : Array(steps).fill("glass-surface__step");
  // The core paints first, so the steps blend over it and never feed it a second blur.
  if (shape === "arc") layers.unshift("glass-surface__step glass-surface__step--full");
  glass.append(
    ...layers.map((className) => Object.assign(document.createElement("i"), { className })),
    Object.assign(document.createElement("i"), { className: "glass-surface__tint" }),
    Object.assign(document.createElement("i"), { className: "glass-surface__grain" }),
  );
  return glass;
}

// CSS cubic-bezier(x1, y1, x2, y2) as a function of time; x is monotonic, so bisection finds the parameter.
const cubicBezier = (x1, y1, x2, y2) => {
  const at = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    let low = 0;
    let high = 1;
    for (let pass = 0; pass < 24; pass += 1) {
      const mid = (low + high) / 2;
      if (at(x1, x2, mid) < x) low = mid;
      else high = mid;
    }
    return at(y1, y2, (low + high) / 2);
  };
};
// Approved reveal (design-system/components/Glass/README.md): in over 0.6s of 1.4s, out over the rest.
const REVEAL_PEAK = 0.6 / 1.4;
const REVEAL_IN = cubicBezier(0, 0, 0.26, 1);
const REVEAL_OUT = cubicBezier(0.86, 0, 0.07, 1);
const REVEAL_SAMPLES = 28;

// Glass strength over the reveal, 0 to 1 and back to 0; t runs over the whole reveal.
export function glassRevealLevel(t) {
  return t <= REVEAL_PEAK ? REVEAL_IN(t / REVEAL_PEAK) : 1 - REVEAL_OUT((t - REVEAL_PEAK) / (1 - REVEAL_PEAK));
}

// Spec R6: steps come in light to strong and leave strong to light, by opacity only; tint and grain follow
// the level, so the glass starts and ends with no blur and no tint. Sampled keyframes keep it on the compositor.
export function playGlassReveal(glass, duration) {
  const offsets = Array.from({ length: REVEAL_SAMPLES + 1 }, (_, index) => index / REVEAL_SAMPLES);
  return [...glass.children].map((layer, index) => {
    const step = layer.classList.contains("glass-surface__step");
    const base = Number(getComputedStyle(layer).opacity);
    return layer.animate(offsets.map((offset) => {
      const level = glassRevealLevel(offset);
      return { offset, opacity: base * (step ? Math.min(1, Math.max(0, STEPS * level - index)) : level) };
    }), { duration, fill: "both" });
  });
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
  const place = (node, top, bottom = batchBottom + 2) => Object.assign(node.style, { top: `${top}px`, height: `${bottom - top}px` });
  const circle = (top) => `circle at ${width / 2}px ${cy - top}px`;
  const core = radius - FADE;
  // The inner fade circle is lowest at the box sides.
  const seam = cy - Math.sqrt(core * core - width * width / 4);
  const top = cy - radius - band;
  const [coreStep, ...steps] = glass.querySelectorAll(".glass-surface__step");
  const coreTop = Math.max(top, cy - radius - CORE_REACH);
  place(coreStep, coreTop);
  setMask(coreStep, `radial-gradient(${circle(coreTop)}, #000 ${radius - FADE / 2}px, transparent ${radius}px)`);
  steps.forEach((step, index) => {
    const outer = radius + RAMPS[index][1] * band;
    place(step, cy - outer, Math.min(batchBottom + 2, seam + STEP_REACH[index]));
    setMask(step, `radial-gradient(${circle(cy - outer)}, transparent ${core}px, #000 ${radius - FADE / 2}px, `
      + `#000 ${radius + RAMPS[index][0] * band}px, transparent ${outer}px)`);
  });
  // White follows the same circles: pure from the corner circle, tint on the arc, none at the band edge.
  const stops = [];
  for (let index = 0; index <= 8; index += 1) {
    const x = index / 8;
    stops.push(`rgba(255, 255, 255, ${(ARC.tint + (1 - ARC.tint) * smooth(1 - x)).toFixed(4)}) ${(dFull + (radius - dFull) * x).toFixed(1)}px`);
  }
  for (let index = 1; index <= 8; index += 1) {
    const x = index / 8;
    stops.push(`rgba(255, 255, 255, ${(ARC.tint * smooth(1 - x)).toFixed(4)}) ${(radius + band * x).toFixed(1)}px`);
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
