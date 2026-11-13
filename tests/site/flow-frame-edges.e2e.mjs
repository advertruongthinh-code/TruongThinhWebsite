// Flow frames have no seam at their edges (advertising-skeleton R5, owner 2026-11-13): the shared half-resolution canvas must cover every
// frame up to its edge and show nothing outside it. Before the fix each frame was drawn only over its own rounded texels, so the bilinear
// upscale left a 1-2px band on all four edges where the still image under the canvas showed through, and a faint fringe outside.
// PC cards wait under Flow while their images are held; the test compares each edge pixel row with the row 3px inside, and the row just
// outside with the page background.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/flow-frame-edges.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  args: ["--ignore-gpu-blocklist", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.route("**/assets/content/**", () => {});
  await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: "instant" }));
  await page.waitForFunction(() => document.querySelectorAll("[data-project-grid] .masonry-grid__cta-frame.is-entry-ready").length >= 3
    && document.querySelector("[data-project-grid] > .masonry-grid__cta-shared-flow"), null, { timeout: 30000 });
  // Let the live Flow drift away from the still image under it, so a gap at an edge shows as a color step.
  await page.waitForTimeout(6000);
  const rects = () => page.evaluate(() => [...document.querySelectorAll("[data-project-grid] .masonry-grid__cta-frame.is-entry-ready")]
    .map((frame) => frame.getBoundingClientRect()).filter(({ top, bottom }) => top >= 4 && bottom <= innerHeight - 4)
    .map(({ left, top, right, bottom }) => [left, top, right, bottom].join(" ")));
  const before = await rects();
  const shot = (await page.screenshot()).toString("base64");
  // Frames that moved while the screenshot was taken are skipped.
  const frames = (await rects()).filter((rect) => before.includes(rect)).map((rect) => rect.split(" ").map(Number));
  assert.ok(frames.length >= 2, `frames in view: ${frames.length}`);
  const result = await page.evaluate(async ({ shot, frames }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${shot}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixel = (x, y) => data.subarray((y * canvas.width + x) * 4, (y * canvas.width + x) * 4 + 3);
    const step = (a, b) => (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3;
    const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const range = (from, to) => Array.from({ length: Math.floor((to - from) / 3) }, (_, index) => from + index * 3);
    const white = [255, 255, 255];
    let seam = 0;
    let fringe = 0;
    for (const [left, top, right, bottom] of frames) {
      // First and last whole device pixel inside the frame; Chrome snaps the box, so a fractional edge is skipped.
      const x0 = Math.ceil(left);
      const y0 = Math.ceil(top);
      const x1 = Math.floor(right) - 1;
      const y1 = Math.floor(bottom) - 1;
      const xs = range(x0 + 6, x1 - 6);
      const ys = range(y0 + 6, y1 - 6);
      seam = Math.max(seam,
        mean(xs.map((x) => step(pixel(x, y0), pixel(x, y0 + 3)))), mean(xs.map((x) => step(pixel(x, y1), pixel(x, y1 - 3)))),
        mean(ys.map((y) => step(pixel(x0, y), pixel(x0 + 3, y)))), mean(ys.map((y) => step(pixel(x1, y), pixel(x1 - 3, y)))));
      fringe = Math.max(fringe,
        mean(xs.map((x) => step(pixel(x, Math.floor(top) - 1), white))), mean(xs.map((x) => step(pixel(x, Math.ceil(bottom)), white))),
        mean(ys.map((y) => step(pixel(Math.floor(left) - 1, y), white))), mean(ys.map((y) => step(pixel(Math.ceil(right), y), white))));
    }
    return { seam, fringe };
  }, { shot, frames });
  // Grain and the Flow gradient alone move a 3px step by about 1-3 levels; the old seam reached 15-22.
  assert.ok(result.seam <= 6, `Flow frame edge differs from 3px inside by ${result.seam.toFixed(1)} levels (seam)`);
  assert.ok(result.fringe <= 3, `Flow paints ${result.fringe.toFixed(1)} levels outside a frame (fringe)`);
  console.log(`flow-frame-edges: ${frames.length} frames, edge step ${result.seam.toFixed(1)}, outside ${result.fringe.toFixed(1)}`);
} finally {
  await browser.close();
}
