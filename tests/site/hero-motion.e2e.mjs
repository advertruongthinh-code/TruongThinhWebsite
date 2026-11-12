// page-home R3: the home hero slide zooms out from 1.06 to 1 with no pan. Pins the motion before the phone hero changes (DRY task 0.3).
// Math.random is fixed so the slide order is stable, as in runHeroCrossFadeContinuityChecks in site.e2e.cjs.
import assert from "node:assert/strict";
import { BASE_URL, VIEWPORTS, launchBrowser, openPage } from "./harness.mjs";

const SAMPLE_MS = 200;
const DURATION_MS = 7_000;
const TOLERANCE = 0.001;
const failures = [];

const browser = await launchBrowser();
try {
  for (const name of ["desktop", "a04s"]) {
    const { context, page } = await openPage(browser, VIEWPORTS[name]);
    try {
      await page.addInitScript(() => {
        const values = [0.2, ...Array.from({ length: 63 }, (_, index) => 0.99 - index * 0.01)];
        Math.random = () => values.shift() ?? 0.5;
      });
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
      if (!(first.scale >= 1.055 && first.scale <= 1.06 + TOLERANCE)) {
        failures.push(`${label}: first scale ${first.scale.toFixed(4)} outside 1.055..1.06`);
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
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], `hero motion failures:\n${failures.join("\n")}`);
console.log("hero-motion: PASS");
