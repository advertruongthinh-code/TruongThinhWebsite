// page-home R3: a zoom-out hero slide zooms out (1.06 to 1 on desktop, 1.1 to 1 on a phone) with no pan; a phone pan slide moves straight
// along one axis by 8% of the frame height and its image edge never enters the frame (DRY tasks 0.3, 5.2).
// Math.random is fixed so the slide order is stable, as in runHeroCrossFadeContinuityChecks in site.e2e.cjs.
import assert from "node:assert/strict";
import { BASE_URL, VIEWPORTS, launchBrowser, openPage } from "./harness.mjs";

const SAMPLE_MS = 200;
const DURATION_MS = 7_000;
const TOLERANCE = 0.001;
const PAN_MS = 9_000;
const SCALE_RANGE = { desktop: [1.055, 1.06], a04s: [1.095, 1.1] };
const failures = [];

// hero-slides.json decides which slide pans, so each check rewrites every slide to the move it tests instead of trusting the data.
const rewriteMoves = (html, attributes) => html.replace(/data-hero-move="(?:zoom-out|pan)"(?: data-hero-pan-dir="\w+")?/g, attributes);
const routeMoves = (page, attributes) => page.route(`${BASE_URL}/vi/`, async (route) => {
  const response = await route.fetch();
  await route.fulfill({ response, body: rewriteMoves(await response.text(), attributes) });
});

// Fixed shuffle: the first slide is always the same one, as in runHeroCrossFadeContinuityChecks in site.e2e.cjs.
const pinOrder = (page) => page.addInitScript(() => {
  const values = [0.2, ...Array.from({ length: 63 }, (_, index) => 0.99 - index * 0.01)];
  Math.random = () => values.shift() ?? 0.5;
});

const browser = await launchBrowser();
try {
  for (const name of ["desktop", "a04s"]) {
    const { context, page } = await openPage(browser, VIEWPORTS[name]);
    try {
      await pinOrder(page);
      await routeMoves(page, 'data-hero-move="zoom-out"');
      await page.goto(`${BASE_URL}/vi/`, { waitUntil: "load" });
      await page.waitForFunction(() => document.querySelector(".hero-slide.is-active img")?.complete);

      // Sample the active slide image every 200ms; a slide change inside the window starts a new run, so a fresh zoom is not read as growth.
      const samples = await page.evaluate(async ({ interval, total }) => {
        const out = [];
        const end = performance.now() + total;
        while (performance.now() < end) {
          const slide = document.querySelector(".hero-slide.is-active");
          const matrix = new DOMMatrixReadOnly(getComputedStyle(slide.querySelector("img")).transform);
          out.push({ slide: slide.dataset.slide, scale: Math.hypot(matrix.a, matrix.b), x: matrix.e, y: matrix.f });
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
        return out;
      }, { interval: SAMPLE_MS, total: DURATION_MS });

      const label = `/vi/ ${name}`;
      if (samples.length < 20) failures.push(`${label}: only ${samples.length} samples`);
      const first = samples[0];
      const [low, high] = SCALE_RANGE[name];
      if (!(first.scale >= low && first.scale <= high + TOLERANCE)) {
        failures.push(`${label}: first scale ${first.scale.toFixed(4)} outside ${low}..${high}`);
      }
      samples.forEach((sample, index) => {
        if (sample.scale < 1 - TOLERANCE) failures.push(`${label} #${index}: scale ${sample.scale.toFixed(4)} below 1`);
        if (Math.abs(sample.x) > 0.01 || Math.abs(sample.y) > 0.01) {
          failures.push(`${label} #${index}: translate ${sample.x.toFixed(2)},${sample.y.toFixed(2)} not 0`);
        }
        const previous = samples[index - 1];
        if (previous && previous.slide === sample.slide && sample.scale > previous.scale + TOLERANCE) {
          failures.push(`${label} #${index}: scale grew ${previous.scale.toFixed(4)} -> ${sample.scale.toFixed(4)}`);
        }
      });
    } finally {
      await context.close();
    }
  }
  // Phone only: every slide is rewritten to a straight pan; the first slide is followed for the whole move.
  for (const dir of ["right", "left", "down", "up"]) {
    const { context, page } = await openPage(browser, VIEWPORTS.a04s);
    try {
      await pinOrder(page);
      await routeMoves(page, `data-hero-move="pan" data-hero-pan-dir="${dir}"`);
      await page.goto(`${BASE_URL}/vi/`, { waitUntil: "load" });
      await page.waitForFunction(() => document.querySelector(".hero-slide.is-active img")?.complete);

      const samples = await page.evaluate(async ({ interval, total }) => {
        const slide = document.querySelector(".hero-slide.is-active");
        const img = slide.querySelector("img");
        const out = [];
        const end = performance.now() + total;
        while (performance.now() < end) {
          const matrix = new DOMMatrixReadOnly(getComputedStyle(img).transform);
          const frame = slide.getBoundingClientRect();
          const box = img.getBoundingClientRect();
          out.push({
            scale: matrix.a, x: matrix.e, y: matrix.f, frameHeight: frame.height,
            gap: Math.max(box.left - frame.left, frame.right - box.right, box.top - frame.top, frame.bottom - box.bottom),
          });
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
        return out;
      }, { interval: SAMPLE_MS, total: PAN_MS });

      const label = `/vi/ a04s pan ${dir}`;
      const horizontal = dir === "left" || dir === "right";
      const axis = horizontal ? "x" : "y";
      const other = horizontal ? "y" : "x";
      const travel = 0.08 * samples[0].frameHeight;
      const reach = Math.max(...samples.map((sample) => Math.abs(sample[axis])));
      if (Math.abs(reach - travel) > 2) failures.push(`${label}: travel ${reach.toFixed(1)}px, want ${travel.toFixed(1)}px`);
      samples.forEach((sample, index) => {
        if (Math.abs(sample.scale - 1) > TOLERANCE) failures.push(`${label} #${index}: scale ${sample.scale.toFixed(4)} not 1`);
        if (Math.abs(sample[other]) > 0.01) failures.push(`${label} #${index}: moved on ${other} (${sample[other].toFixed(2)})`);
        if (sample.gap > 0.5) failures.push(`${label} #${index}: image edge ${sample.gap.toFixed(1)}px inside the frame`);
        if (sample[axis] > 0.01 || sample[axis] < -travel - 2) failures.push(`${label} #${index}: ${axis} ${sample[axis].toFixed(1)} outside 0..-${travel.toFixed(1)}`);
      });
      const last = samples.at(-1)[axis];
      if (!(dir === "right" || dir === "down" ? last < -travel / 2 : last > -travel / 2)) failures.push(`${label}: ended at ${last.toFixed(1)}px, not moving ${dir}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], `hero motion failures:\n${failures.join("\n")}`);
console.log("hero-motion: PASS");
