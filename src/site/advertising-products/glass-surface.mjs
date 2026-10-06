// Kính: one glass component for every glass surface (docs/specs/glass-surface.md).
// Blur steps (increments in detail.css), then the white tint and the grain. A surface that fades step by step (spec R6)
// has five (levels 7.14, 16.07, 32.14, 57.14, 100px: the 100px ceiling, owner 06/10); the arc's band has three
// (4.5, 12, 28px; owner, 05/10, for the A05s).
const STEPS = 5;
const ARC_STEPS = 3;
// Owner's arc (06/10): apex at 35% of the CTA cluster, radius 3.5 viewport widths, band 1.75 cluster heights,
// pure white from 0.35 card widths inside the batch corners, white tint 0.35 on the arc.
const ARC = Object.freeze({ centre: 0.35, radius: 3.5, band: 1.75, whiteRamp: 0.35, tint: 0.35 });
// Inside the arc the blur keeps rising from the band's 28px on the arc to the 100px ceiling on the pure white circle,
// over 1 to 5 inner steps: as many as this device draws at TARGET_FPS with the arc on screen (owner, 06/10).
const ARC_LEVEL = 28;
const CEILING = 100;
const INNER_MAX = 5;
const TARGET_FPS = 50;
let fittedInnerSteps;
const geometries = new WeakMap();
// Band position (0 on the arc, 1 at the band edge) where each step runs from fully on to off; neighbours overlap.
const RAMPS = Array.from({ length: ARC_STEPS }, (_, index) =>
  [Math.max(0, (ARC_STEPS - 1 - index) / ARC_STEPS - 0.1), Math.min(1, (ARC_STEPS - index) / ARC_STEPS + 0.1)]);
// Inside the arc all band steps are fully on, so one full step (the core) stands in for them there and the steps
// only cover the band. The core hands over to the steps across FADE px inside the arc, so no seam shows: the core
// ramps in over the outer half while the steps stay on, the steps ramp out over the inner half, so the sharp page
// never shows through a gap where both are partial. Each box
// runs past its mask by one sigma of its blur (28px for the core): a wider margin changes no pixel by more than 3/255,
// and every row of a box is one more row blurred each frame.
const FADE = 48;
const STEP_REACH = [5, 12, 26];
const CORE_REACH = 28;
const GRAIN_SIZE = 160;
// Mean white the arc's grain adds (opacity 0.16 x mean alpha 0.5, detail.css); the tint carries that much less.
const GRAIN_WHITE = 0.08;
let grain;
const waitingForGrain = [];

// The grain lives on each Kính, not on html, so its late arrival restyles the glass and not the whole page.
const setGrain = (glass) => {
  glass.style.setProperty("--glass-grain", grain.grey);
  glass.style.setProperty("--glass-grain-white", grain.white);
  glass.style.setProperty("--glass-grain-size", `${GRAIN_SIZE / (window.devicePixelRatio || 1)}px`);
};

// Static mono noise, one texel per device pixel: grey for overlay (overlay keeps pure white white), and the
// same noise as white alpha for the arc (detail.css).
function makeGrain() {
  grain = "";
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = GRAIN_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return;
  const [grey, white] = [0, 1].map(() => context.createImageData(GRAIN_SIZE, GRAIN_SIZE));
  const [greyPixels, whitePixels] = [grey, white].map((image) => new Uint32Array(image.data.buffer));
  let state = 0x9e3779b9;
  for (let index = 0; index < greyPixels.length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const value = state >>> 24;
    greyPixels[index] = 0xff000000 | value * 0x10101;
    whitePixels[index] = (value << 24 | 0xffffff) >>> 0;
  }
  // toBlob copies the bitmap when called, so one canvas serves both.
  const url = (image) => new Promise((resolve) => {
    context.putImageData(image, 0, 0);
    canvas.toBlob((blob) => resolve(blob && `url(${URL.createObjectURL(blob)})`));
  });
  Promise.all([url(grey), url(white)]).then(([greyUrl, whiteUrl]) => {
    if (!greyUrl || !whiteUrl) return;
    grain = { grey: greyUrl, white: whiteUrl };
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
  // The core paints first, so the steps blend over it and never feed it a second blur. Inner steps follow the core;
  // the band steps stay last, so their nth-last-child rules in detail.css still hold.
  if (shape === "arc") {
    layers.unshift("glass-surface__step glass-surface__step--full",
      ...Array(INNER_MAX).fill("glass-surface__step glass-surface__step--inner"));
    glass.dataset.glassInnerSteps = String(fittedInnerSteps || INNER_MAX);
  }
  glass.append(
    ...layers.map((className) => Object.assign(document.createElement("i"), { className })),
    Object.assign(document.createElement("i"), { className: "glass-surface__tint" }),
    Object.assign(document.createElement("i"), { className: "glass-surface__grain" }),
  );
  if (shape === "arc" && !fittedInnerSteps && typeof IntersectionObserver === "function") {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      fitInnerSteps(glass);
    });
    // The arc box spans the whole grid section, so its top enters the viewport long before the arc does; the tint
    // starts at the band edge, so it marks when the arc itself is on screen.
    observer.observe(glass.querySelector(".glass-surface__tint"));
  }
  return glass;
}

// Median rAF rate over up to `frames` frames or 1.5s. The skeleton under the arc animates every frame, so the glass
// is recomposited every frame and this rate is the cost the visitor feels.
const medianFps = (frames) => new Promise((resolve) => {
  const times = [];
  const tick = (now) => {
    times.push(now);
    if (times.length <= frames && now - times[0] < 1500) requestAnimationFrame(tick);
    else {
      const gaps = times.slice(1).map((time, index) => time - times[index]).sort((a, b) => a - b);
      resolve(1000 / gaps[gaps.length >> 1]);
    }
  };
  requestAnimationFrame(tick);
});

// Start at five inner steps and drop one while the rate stays under target; the count holds for the page's life.
async function fitInnerSteps(glass) {
  let steps = INNER_MAX;
  for (;;) {
    await medianFps(10);
    if (steps === 1 || await medianFps(45) >= TARGET_FPS) break;
    steps -= 1;
    glass.dataset.glassInnerSteps = String(steps);
    if (geometries.has(glass)) layoutArcGlass(glass, geometries.get(glass));
  }
  fittedInnerSteps = steps;
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

const REVEAL_OFFSETS = Array.from({ length: REVEAL_SAMPLES + 1 }, (_, index) => index / REVEAL_SAMPLES);
const REVEAL_LEVELS = REVEAL_OFFSETS.map(glassRevealLevel);

// Spec R6: steps come in light to strong and leave strong to light, by opacity only; tint and grain follow
// the level, so the glass starts and ends with no blur and no tint. Sampled keyframes keep it on the compositor.
export function playGlassReveal(glass, duration) {
  const layers = [...glass.children];
  // Read every base opacity before the first animate, so a reveal costs one style recalc.
  const bases = layers.map((layer) => Number(getComputedStyle(layer).opacity));
  return layers.map((layer, index) => {
    const step = layer.classList.contains("glass-surface__step");
    return layer.animate(REVEAL_OFFSETS.map((offset, sample) => {
      const level = REVEAL_LEVELS[sample];
      return { offset, opacity: bases[index] * (step ? Math.min(1, Math.max(0, STEPS * level - index)) : level) };
    }), { duration, fill: "both" });
  });
}

// Arc circle in the glass box's coordinates: apex yIn, radius R, band T, centre (W / 2, cy),
// and dFull, the circle through the two batch bottom corners where the white turns pure.
export function arcGlassGeometry({ width, batchBottom, realBottom, cardWidth, clusterTop, clusterBottom }) {
  const whiteRamp = ARC.whiteRamp * cardWidth;
  const clusterHeight = clusterBottom - clusterTop;
  const yIn = Math.min(clusterTop + ARC.centre * clusterHeight, batchBottom - 2 * whiteRamp);
  // The band edge never rises above the real photos.
  const band = Math.max(8, Math.min(ARC.band * clusterHeight, yIn - realBottom));
  const depth = batchBottom - yIn;
  // Smallest radius that keeps both bottom corners whiteRamp inside the arc, so they stay pure white.
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

export function layoutArcGlass(glass, geometry) {
  const { width, batchBottom, band, radius, cy, dFull } = geometry;
  geometries.set(glass, geometry);
  // Two pixels run under the footer so subpixel rounding never shows a frame edge.
  const place = (node, top, bottom = batchBottom + 2) => Object.assign(node.style, { top: `${top}px`, height: `${bottom - top}px` });
  const circle = (top) => `circle at ${width / 2}px ${cy - top}px`;
  const core = radius - FADE;
  // The inner fade circle is lowest at the box sides.
  const seam = cy - Math.sqrt(core * core - width * width / 4);
  const top = cy - radius - band;
  const [coreStep, ...rest] = glass.querySelectorAll(".glass-surface__step");
  const inner = rest.slice(0, INNER_MAX);
  const steps = rest.slice(INNER_MAX);
  const coreTop = Math.max(top, cy - radius - CORE_REACH);
  place(coreStep, coreTop);
  setMask(coreStep, `radial-gradient(${circle(coreTop)}, #000 ${radius - FADE / 2}px, transparent ${radius}px)`);
  steps.forEach((step, index) => {
    const outer = radius + RAMPS[index][1] * band;
    place(step, cy - outer, Math.min(batchBottom + 2, seam + STEP_REACH[index]));
    setMask(step, `radial-gradient(${circle(cy - outer)}, transparent ${core}px, #000 ${radius - FADE / 2}px, `
      + `#000 ${radius + RAMPS[index][0] * band}px, transparent ${outer}px)`);
  });
  // Inner steps: level n of N is ARC_LEVEL + (CEILING - ARC_LEVEL) n / N, each adding its quadrature increment and
  // ramping in over its share of the way from the arc to the pure white circle; neighbours overlap like RAMPS.
  const count = Number(glass.dataset.glassInnerSteps) || INNER_MAX;
  const span = Math.max(1, radius - dFull);
  const level = (n) => ARC_LEVEL + (CEILING - ARC_LEVEL) * n / count;
  inner.forEach((step, index) => {
    step.hidden = index >= count;
    if (step.hidden) return;
    const increment = Math.sqrt(level(index + 1) ** 2 - level(index) ** 2);
    const from = radius - span * Math.max(0, index / count - 0.1);
    const to = radius - span * Math.min(1, (index + 1) / count + 0.1);
    const stepTop = Math.max(top, cy - from - Math.ceil(increment));
    step.style.setProperty("--glass-step-blur", `${increment.toFixed(2)}px`);
    place(step, stepTop);
    setMask(step, `radial-gradient(${circle(stepTop)}, #000 ${to.toFixed(1)}px, transparent ${from.toFixed(1)}px)`);
  });
  // White follows the same circles: pure from the corner circle, tint on the arc, none at the band edge.
  // The grain (mask m below) adds GRAIN_WHITE * m on average, so the tint holds back that share.
  const white = (alpha, m) => Math.max(0, (alpha - GRAIN_WHITE * m) / (1 - GRAIN_WHITE * m)).toFixed(4);
  const stops = [];
  for (let index = 0; index <= 8; index += 1) {
    const x = index / 8;
    stops.push(`rgba(255, 255, 255, ${white(ARC.tint + (1 - ARC.tint) * smooth(1 - x), Math.min(1, 2 * x))}) ${(dFull + (radius - dFull) * x).toFixed(1)}px`);
  }
  for (let index = 1; index <= 8; index += 1) {
    const x = index / 8;
    stops.push(`rgba(255, 255, 255, ${white(ARC.tint * smooth(1 - x), 1 - x)}) ${(radius + band * x).toFixed(1)}px`);
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
