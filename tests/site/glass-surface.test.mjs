// Kính contract (docs/specs/glass-surface.md R1-R6): CSS steps, arc geometry and reveal curve, no browser needed.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { arcGlassGeometry, glassRevealLevel } from "../../src/site/advertising-products/glass-surface.mjs";

const read = (file) => readFile(new URL(`../../src/site/${file}`, import.meta.url), "utf8");
const css = (await read("detail.css")) + (await read("style.css"));
const runtime = await read("advertising-products/catalog-runtime.mjs");

// R1: only the glass steps and the viewer's dim layer own backdrop-filter.
const owners = [...css.matchAll(/([^{}]+)\{[^}]*?backdrop-filter:/g)].map(([, selector]) => selector.trim());
assert.deepEqual([...new Set(owners)].sort(),
  [".advertising-photo-dialog::backdrop", ".glass-surface__step", ".glass-surface__step--full"],
  "R1: no surface writes its own backdrop-filter");
// A one-step surface blurs through the steps' product (the tone checks below).
assert.match(css, /\.glass-surface__step--full \{[^}]*backdrop-filter: blur\(100px\) saturate\(var\(--glass-saturate\)\) brightness\(var\(--glass-brightness\)\);/,
  "R2, R5: one full step equals the steps");
assert.match(runtime, /createGlassSurface\("arc"\)/, "R1: the masonry end uses the arc Kính");
assert.match(runtime, /createGlassSurface\("even", 0\)/, "R1: the primary uses the even Kính, tint and grain only");
// The primary photo carries the full step's blur itself: a backdrop-filter there bakes a tile seam into Chrome's tab thumbnail.
assert.match(css, /\.advertising-photo-view__outgoing-background \{\s*filter: blur\(100px\) saturate\(1\.7\) brightness\(1\.04\);/,
  "R1: the primary photo blurs like one full step");

// R2, R5: stacked steps compound in quadrature to their levels; saturate and brightness multiply.
const blurLevels = (scope) => {
  let sum = 0;
  return [...css.matchAll(new RegExp(`^${scope}\\.glass-surface__step:nth-last-child\\(\\d\\) \\{ --glass-step-blur: ([\\d.]+)px; \\}`, "gm"))]
    .map(([, value]) => Math.round(Math.sqrt(sum += value * value) * 10) / 10);
};
const tone = (selector) => css.match(new RegExp(`^${selector} \\{\\s*--glass-saturate: ([\\d.]+);\\s*--glass-brightness: ([\\d.]+);`
  + `\\s*--glass-step-saturate: ([\\d.]+);\\s*--glass-step-brightness: ([\\d.]+);`, "m")).slice(1).map(Number);
const arc = '\\.glass-surface\\[data-glass-shape="arc"\\]';
assert.deepEqual(blurLevels(""), [7.1, 16.1, 32.1, 57.1, 100], "R2: steps reach the 100px ceiling");
assert.deepEqual(blurLevels(`${arc} > `), [4.5, 12, 28], "R2: the arc's band steps reach 4.5, 12 and 28px");
for (const [selector, count, saturation, light] of [["\\.glass-surface", 5, 1.7, 1.04], [arc, 3, 1.55, 1.05]]) {
  const [fullSaturate, fullBrightness, saturate, brightness] = tone(selector);
  assert.deepEqual([fullSaturate, fullBrightness], [saturation, light], `R5: one full step carries ${saturation} and ${light}`);
  assert(Math.abs(saturate ** count - saturation) < 0.005, `R5: saturation ${saturation} across ${count} steps`);
  assert(Math.abs(brightness ** count - light) < 0.001, `R5: brightness ${light} across ${count} steps`);
}
assert.match(css, /\.glass-surface__tint \{\s*background: rgba\(255, 255, 255, 0\.12\);/, "R5: tint alpha 0.12");
// R4: overlay moves a mid tone by the full noise; opacity 0.08 caps the shift at 4%.
assert.match(css, /\.glass-surface__grain \{[^}]*mix-blend-mode: overlay;[^}]*opacity: 0\.08;/, "R4: grain 4%, overlay");
// R4: the arc's white grain moves light glass as overlay does, 0.16 x noise x (1 - backdrop); its mean 0.08 leaves the tint.
assert.match(css, new RegExp(`^${arc} > \\.glass-surface__grain \\{\\s*background-image: var\\(--glass-grain-white, none\\);`
  + "\\s*mix-blend-mode: normal;\\s*opacity: 0\\.16;", "m"),
  "R4: arc grain is white noise, normal blend, 0.16");
assert.doesNotMatch(css, /\.glass-surface \{[^}]*(?:opacity|mask|filter)/, "R1: the Kính box has no opacity, mask or filter");

// R2, R3: owner numbers and the two limits.
const desktop = arcGlassGeometry({ width: 1440, batchBottom: 900, realBottom: 100, cardWidth: 320, clusterTop: 400, clusterBottom: 560 });
assert.equal(desktop.yIn, 456, "R2: apex at 35% of the CTA cluster");
assert.equal(desktop.radius, 3.5 * 1440, "R2: radius 3.5 viewport widths");
assert.equal(desktop.band, 1.75 * 160, "R2: band 1.75 cluster heights");
assert.equal(desktop.cy, desktop.yIn + desktop.radius, "R2: centre under the batch, middle of the screen");
const short = arcGlassGeometry({ width: 390, batchBottom: 760, realBottom: 560, cardWidth: 172, clusterTop: 600, clusterBottom: 700 });
assert.equal(short.yIn - short.band, 560, "R2: the band edge stops at the real photos");
for (let seed = 1; seed < 400; seed += 1) {
  const random = (n) => ((seed * 9301 + n * 49297) % 233280) / 233280;
  const width = 300 + 1700 * random(1);
  const cardWidth = width / (2 + 3 * random(2));
  const batchBottom = 2000;
  const clusterBottom = batchBottom - 40 - 300 * random(3);
  const clusterTop = clusterBottom - 60 - 200 * random(4);
  const arc = arcGlassGeometry({ width, batchBottom, realBottom: clusterTop - 400 * random(5), cardWidth, clusterTop, clusterBottom });
  assert(arc.dFull <= arc.radius - 0.35 * cardWidth + 1e-6, `R3: batch corners stay pure white (seed ${seed})`);
}
// R6: the reveal surface has all five steps; its level rises to full at 0.6 of 1.4s and falls back to none.
assert.match(runtime, /createGlassSurface\("even", 5\)/, "R6: the reveal Kính has five steps");
const levels = Array.from({ length: 141 }, (_, index) => glassRevealLevel(index / 140));
const peak = 60;
assert(Math.abs(levels[0]) < 1e-3 && Math.abs(levels[peak] - 1) < 1e-3 && Math.abs(levels[140]) < 1e-3,
  "R6: no blur and no tint at the start and the end, full at 0.6s");
assert(levels.slice(0, peak + 1).every((level, index) => !index || level >= levels[index - 1] - 1e-9)
  && levels.slice(peak).every((level, index) => !index || level <= levels[peak + index - 1] + 1e-9), "R6: in, then out");
console.log("glass-surface: PASS");
