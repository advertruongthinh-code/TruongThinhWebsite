// Kính contract (docs/specs/glass-surface.md R1-R5): CSS steps and arc geometry, no browser needed.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { arcGlassGeometry } from "../../src/site/advertising-products/glass-surface.mjs";

const read = (file) => readFile(new URL(`../../src/site/${file}`, import.meta.url), "utf8");
const css = (await read("detail.css")) + (await read("style.css"));
const runtime = await read("advertising-products/catalog-runtime.mjs");

// R1: only the glass steps and the viewer's dim layer own backdrop-filter.
const owners = [...css.matchAll(/([^{}]+)\{[^}]*?backdrop-filter:/g)].map(([, selector]) => selector.trim());
assert.deepEqual([...new Set(owners)].sort(),
  [".advertising-photo-dialog::backdrop", ".glass-surface__step", ".glass-surface__step--full"],
  "R1: no surface writes its own backdrop-filter");
// A one-step surface blurs through the five steps' product.
assert.match(css, /\.glass-surface__step--full \{[^}]*backdrop-filter: blur\(28px\) saturate\(1\.7\) brightness\(1\.04\);/,
  "R2, R5: one full step equals the five steps");
assert.match(runtime, /createGlassSurface\("arc"\)/, "R1: the masonry end uses the arc Kính");
assert.match(runtime, /createGlassSurface\("even"\)/, "R1: the primary uses the even Kính");

// R2, R5: stacked steps compound in quadrature to the five levels; saturate and brightness multiply.
const increments = [...css.matchAll(/\.glass-surface__step:nth-child\(\d\) \{ --glass-step-blur: ([\d.]+)px; \}/g)]
  .map(([, value]) => Number(value));
let sum = 0;
assert.deepEqual(increments.map((value) => Math.round(Math.sqrt(sum += value * value) * 10) / 10), [2, 4.5, 9, 16, 28],
  "R2: steps reach 2, 4.5, 9, 16 and 28px");
const [, saturate, brightness] = css.match(/\.glass-surface__step \{[^}]*?saturate\(([\d.]+)\) brightness\(([\d.]+)\)/);
assert(Math.abs(saturate ** 5 - 1.7) < 0.005, "R5: saturation 1.7 across five steps");
assert(Math.abs(brightness ** 5 - 1.04) < 0.001, "R5: brightness 1.04 across five steps");
assert.match(css, /\.glass-surface__tint \{\s*background: rgba\(255, 255, 255, 0\.12\);/, "R5: tint alpha 0.12");
// R4: overlay moves a mid tone by the full noise; opacity 0.08 caps the shift at 4%.
assert.match(css, /\.glass-surface__grain \{[^}]*mix-blend-mode: overlay;[^}]*opacity: 0\.08;/, "R4: grain 4%, overlay");
assert.doesNotMatch(css, /\.glass-surface \{[^}]*(?:opacity|mask|filter)/, "R1: the Kính box has no opacity, mask or filter");

// R2, R3: owner numbers and the two limits.
const desktop = arcGlassGeometry({ width: 1440, batchBottom: 900, realBottom: 200, cardWidth: 320, clusterTop: 400, clusterBottom: 560 });
assert.equal(desktop.yIn, 480, "R2: apex at half the CTA cluster");
assert.equal(desktop.radius, 4 * 1440, "R2: radius 4 viewport widths");
assert.equal(desktop.band, 1.2 * 160, "R2: band 1.2 cluster heights");
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
  assert(arc.dFull <= arc.radius - 0.25 * cardWidth + 1e-6, `R3: batch corners stay pure white (seed ${seed})`);
}
console.log("glass-surface: PASS");
