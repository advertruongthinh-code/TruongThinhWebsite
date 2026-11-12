
// Kính: one glass component shared by every glass surface (docs/specs/glass-surface.md).
// The blur steps (increments in detail.css), then a white tint and grain. Levels 16.07, 57.14, 100px (ceiling 100px, owner 06/10); the arc band
// has three on phone (4.5, 12, 28px; owner, 05/10, for Android phones), and nine on PC (ARC_DESKTOP_LEVELS, owner 2026-11-01).
const ARC_STEPS = 3;
// The owner's arc (06/10): apex at -15% of the CTA group (above the title edge, owner 10/10, so the text sits inside the core), radius 3.5 viewport widths, band 1.75 group heights,
// pure white from 0.35 card width inside the batch corners, white tint 0.55 on the arc (owner 10/10, previously 0.35).
const ARC = Object.freeze({ centre: -0.15, radius: 3.5, band: 1.75, whiteRamp: 0.35, tint: 0.55 });
// Phone: core 28px (ARC_LEVEL) and one innermost band step. PC (owner 2026-11-01): nine blur steps growing geometrically from 4.5px
// up to the 100px ceiling (4.5 x (100 / 4.5)^(i / 8)), running from the outer band edge across the arc boundary and biting into ARC_DESKTOP_BITE of the band width;
// inside the arc, the core blurs uniformly at 100px (CEILING).
const ARC_LEVEL = 28;
const CEILING = 100;
export const ARC_DESKTOP_LEVELS = Object.freeze([4.5, 6.63, 9.77, 14.4, 21.21, 31.26, 46.06, 67.87, 100]);
export const ARC_DESKTOP_BITE = 1 / 3;
// Adjacent steps overlap at their edges (unit: one step) so no boundary or two-layer ghost is visible.
const ARC_DESKTOP_OVERLAP = 0.3;
// The white layer outside the arc reaches 0 at this fraction of the band width (owner 2026-11-01, previously at the band edge).
const ARC_WHITE_REACH = 0.85;
// The layer count is fixed per device type, no fps measuring (owner 10/10): PC 10 layers (core 100px, 9 bands); phone 2 layers
// (core 28px and the innermost band step; owner 10/10). An inner step (81-88% slow frames, round 26) or a second band
// step (30% slow frames, round 29) both missed the gate on Android phones. Phone is detected like the skeleton (catalog-runtime).
// Phone keeps apex 0.35: a higher apex widens the Kính area, and an old A05s swipes 7-9% slow frames (round 34).
// `width`: band width relative to the group height. PC 2.5 (owner 2026-11-07 found the glass transition harsh, previously 1.75); phone keeps 1.75 because
// a taller band-step box adds blur rows per frame on Android phones, and the phone softens by spreading the band step across the whole band.
const PHONE_LAYERS = Object.freeze({ band: 1, centre: 0.35, width: ARC.band });
const DESKTOP_LAYERS = Object.freeze({ band: ARC_DESKTOP_LEVELS.length, centre: ARC.centre, width: 2.5 });
const arcLayers = () => (globalThis.matchMedia?.("(pointer: coarse)").matches || globalThis.navigator?.maxTouchPoints > 0
  ? PHONE_LAYERS : DESKTOP_LAYERS);
const geometries = new WeakMap();
// Position in the band (0 on the arc, 1 at the band edge) where each step runs from fully on to off; neighboring steps overlap.
const RAMPS = Array.from({ length: ARC_STEPS }, (_, index) =>
  [Math.max(0, (ARC_STEPS - 1 - index) / ARC_STEPS - 0.1), Math.min(1, (ARC_STEPS - index) / ARC_STEPS + 0.1)]);
// Inside the arc every band step is fully on, so one full step (the core) replaces them there and the steps
// cover only the band. The core hands over to the steps across FADE px inside the arc, so no seam shows: the core
// fades in over the outer half while the steps are still on, the steps fade out over the inner half, so the unblurred base page
// never shows through the gap where both are only partial. Each box
// extends past the mask by one blur sigma (equal to the core's blur): a wider margin changes no pixel by more than 3/255,
// and every row of the box is one more blurred row per frame.
const FADE = 48;
const STEP_REACH = [5, 12, 26];
const GRAIN_SIZE = 160;
// The mean white the arc's grain adds (opacity 0.12 x mean alpha 0.5, detail.css); the tint carries exactly that much less.
const GRAIN_WHITE = 0.06;
let grain;
const waitingForGrain = [];

// Grain sits on each Kính, not on html, so its late arrival only restyles the glass and not the whole page.
const setGrain = (glass) => {
  glass.style.setProperty("--glass-grain", grain.grey);
  glass.style.setProperty("--glass-grain-white", grain.white);
  glass.style.setProperty("--glass-grain-size", `${GRAIN_SIZE / (window.devicePixelRatio || 1)}px`);
};

// Static mono noise, one texel per device pixel: gray for the overlay (an overlay kept pure white stays white), and
// the same noise as white alpha for the arc (detail.css).
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

// A static surface looks the same through one full step or three stacked steps, at lower cost;
// a surface that fades in/out step by step (spec R6) needs all three.
export function createGlassSurface(shape, steps = shape === "arc" ? Math.max(ARC_STEPS, arcLayers().band) : 1) {
  if (grain === undefined) makeGrain();
  const glass = document.createElement("div");
  glass.className = "glass-surface";
  glass.dataset.glassShape = shape;
  glass.setAttribute("aria-hidden", "true");
  if (grain) setGrain(glass);
  else waitingForGrain.push(glass);
  const layers = steps === 1 ? ["glass-surface__step glass-surface__step--full"] : Array(steps).fill("glass-surface__step");
  // The core is drawn first, so the steps blend onto it and never blur it a second time; the band steps are last,
  // so the nth-last-child rule for the last three steps in detail.css (phone) still holds.
  if (shape === "arc") layers.unshift("glass-surface__step glass-surface__step--full");
  glass.append(
    ...layers.map((className) => Object.assign(document.createElement("i"), { className })),
    Object.assign(document.createElement("i"), { className: "glass-surface__tint" }),
    Object.assign(document.createElement("i"), { className: "glass-surface__grain" }),
  );
  return glass;
}

// The arc circle in glass-box coordinates: apex yIn, radius R, band T, center (W / 2, cy),
// and dFull, the circle through the two bottom batch corners where white becomes pure white.
export function arcGlassGeometry({ width, batchBottom, realBottom, cardWidth, clusterTop, clusterBottom }) {
  const whiteRamp = ARC.whiteRamp * cardWidth;
  const clusterHeight = clusterBottom - clusterTop;
  const yIn = Math.min(clusterTop + arcLayers().centre * clusterHeight, batchBottom - 2 * whiteRamp);
  // The band edge never rises above the real photos.
  const band = Math.max(8, Math.min(arcLayers().width * clusterHeight, yIn - realBottom));
  const depth = batchBottom - yIn;
  // The smallest radius keeps both whiteRamp bottom corners inside the arc, so they stay pure white.
  const minRadius = (depth * depth - whiteRamp * whiteRamp + width * width / 4) / (2 * (depth - whiteRamp));
  const radius = Math.max(ARC.radius * width, minRadius);
  const cy = yIn + radius;
  return { width, batchBottom, yIn, band, radius, cy, dFull: Math.hypot(width / 2, cy - batchBottom) };
}

const smooth = (x) => x * x * (3 - 2 * x);
// The mask edge goes from solid (radius `solid`) to transparent (`clear`) by smoothstep rather than a straight segment, so the blur fades in
// and out smoothly, with no line visible where a step starts or reaches full (owner 2026-11-07: the glass transition was too harsh).
const RAMP_STOPS = 6;
const easedEdge = (solid, clear) => Array.from({ length: RAMP_STOPS + 1 }, (_, index) => {
  const x = index / RAMP_STOPS;
  return `rgba(0, 0, 0, ${smooth(1 - x).toFixed(4)}) ${(solid + (clear - solid) * x).toFixed(1)}px`;
}).join(", ");
const setMask = (node, value) => {
  node.style.setProperty("-webkit-mask-image", value);
  node.style.setProperty("mask-image", value);
};

// PC: nine steps by the ARC_DESKTOP_LEVELS levels. The span from the outer band edge to the end of the bite (P) is split into nine equal parts, step i reaches
// its level at the end of part i. Stacked backdrop blurs add in quadrature, so each step carries only the increment sqrt(L_i^2 - L_(i-1)^2).
// `off` is the radius where it starts transparent (outside), `on` is the radius from which inward the step is fully solid.
export function desktopArcSteps({ radius, band }) {
  const count = ARC_DESKTOP_LEVELS.length;
  const reach = band * (1 + ARC_DESKTOP_BITE);
  return ARC_DESKTOP_LEVELS.map((level, index) => {
    const blur = Math.sqrt(level ** 2 - (ARC_DESKTOP_LEVELS[index - 1] ?? 0) ** 2);
    const uOff = Math.max(0, (index - ARC_DESKTOP_OVERLAP) / count);
    const uOn = Math.min(1, (index + 1 + ARC_DESKTOP_OVERLAP) / count);
    return { blur, off: radius + band - uOff * reach, on: radius + band - uOn * reach };
  });
}

export function layoutArcGlass(glass, geometry) {
  const { width, batchBottom, band, radius, cy, dFull } = geometry;
  geometries.set(glass, geometry);
  // Two pixels run under the footer so subpixel rounding never exposes the frame edge.
  const place = (node, top, bottom = batchBottom + 2) => Object.assign(node.style, { top: `${top}px`, height: `${bottom - top}px` });
  const circle = (top) => `circle at ${width / 2}px ${cy - top}px`;
  const [coreStep, ...steps] = glass.querySelectorAll(".glass-surface__step");
  // The step count in the DOM decides the branch: PC has nine steps, phone three (the two outer steps hidden). Fixed at creation, while arcGlassGeometry reads
  // arcLayers() each time: if the pointer type changes after creation (DevTools emulation), PC uses the phone apex 0.35 until rebuilt.
  const desktop = steps.length > ARC_STEPS;
  // PC: the core steps back inside the arc boundary by exactly the nine steps' bite.
  const edge = desktop ? radius - band * ARC_DESKTOP_BITE : radius;
  const core = edge - FADE;
  // The lowest inner fade circle on both sides of the box.
  const seam = cy - Math.sqrt(core * core - width * width / 4);
  const top = cy - radius - band;
  const coreTop = Math.max(top, cy - edge - (desktop ? CEILING : ARC_LEVEL));
  if (desktop) coreStep.style.setProperty("--glass-full-blur", `${CEILING}px`);
  place(coreStep, coreTop);
  setMask(coreStep, `radial-gradient(${circle(coreTop)}, #000 ${edge - FADE / 2}px, transparent ${edge}px)`);
  if (desktop) {
    desktopArcSteps({ radius, band }).forEach(({ blur, on, off }, index) => {
      const step = steps[index];
      const stepTop = cy - off;
      step.hidden = false;
      step.style.setProperty("--glass-step-blur", `${blur.toFixed(2)}px`);
      place(step, stepTop, Math.min(batchBottom + 2, seam + Math.ceil(blur)));
      setMask(step, `radial-gradient(${circle(stepTop)}, transparent ${core}px, #000 ${edge - FADE / 2}px, ${easedEdge(on, off)})`);
    });
  } else {
    const { band: bandSteps } = arcLayers();
    steps.forEach((step, index) => {
      step.hidden = index < ARC_STEPS - bandSteps;
      // Phone shows only the outermost step: it spreads across the whole band (previously off at 0.43 of the band) so the blur decreases across the whole band like PC.
      const ramp = bandSteps === 1 ? [0, 1] : RAMPS[index];
      const outer = radius + ramp[1] * band;
      place(step, cy - outer, Math.min(batchBottom + 2, seam + STEP_REACH[index]));
      setMask(step, `radial-gradient(${circle(cy - outer)}, transparent ${core}px, #000 ${radius - FADE / 2}px, `
        + easedEdge(radius + ramp[0] * band, outer) + ")");
    });
  }
  // White follows the same circles: pure from the corner circle, tint on the arc, none at the band edge.
  // Grain (mask m below) adds on average GRAIN_WHITE * m, so the tint keeps that part back.
  const white = (alpha, m) => Math.max(0, (alpha - GRAIN_WHITE * m) / (1 - GRAIN_WHITE * m)).toFixed(4);
  const stops = [];
  for (let index = 0; index <= 8; index += 1) {
    const x = index / 8;
    stops.push(`rgba(255, 255, 255, ${white(ARC.tint + (1 - ARC.tint) * smooth(1 - x), Math.min(1, 2 * x))}) ${(dFull + (radius - dFull) * x).toFixed(1)}px`);
  }
  for (let index = 1; index <= 8; index += 1) {
    const x = index / 8;
    stops.push(`rgba(255, 255, 255, ${white(ARC.tint * smooth(1 - x), 1 - x)}) ${(radius + ARC_WHITE_REACH * band * x).toFixed(1)}px`);
  }
  const tint = glass.querySelector(".glass-surface__tint");
  place(tint, top);
  tint.style.background = `radial-gradient(${circle(top)}, #fff ${dFull.toFixed(1)}px, ${stops.join(", ")})`;
  const grain = glass.querySelector(".glass-surface__grain");
  place(grain, top);
  // Grain fades toward the pure white circle, so pure white has no grain.
  setMask(grain, `radial-gradient(${circle(top)}, transparent ${dFull.toFixed(1)}px, #000 ${((dFull + radius) / 2).toFixed(1)}px, `
    + `#000 ${radius}px, transparent ${radius + ARC_WHITE_REACH * band}px)`);
}
