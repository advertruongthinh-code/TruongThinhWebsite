// Loading streak stays inside its frame (media-delivery R6): an unsettled frame below the fold used to leak its 400%-wide absolute ::before
// over the images above when the frame was position: static, leaving white bands on the project gallery (owner 2026-11-14, Indochine townhouse).
// Every project page: the first gallery image on screen must look like the decoded image itself, nothing painted on top.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const projects = JSON.parse(fs.readFileSync("src/site/content/projects.json", "utf8"));
const slugs = (Array.isArray(projects) ? projects : projects.projects)
  .filter((project) => project.blocks.some((block) => block.type === "gallery-carousel"))
  .map((project) => project.slugVi);

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const context = await browser.newContext({ viewport: { width: 1920, height: 1000 } });
const failures = [];
try {
  for (const slug of slugs) {
    const page = await context.newPage();
    try {
      await page.goto(`${origin}/vi/projects/${slug}/`, { waitUntil: "load" });
      const image = page.locator(".blk-gallery img").first();
      await page.evaluate(() => {
        const top = document.querySelector(".blk-gallery img").getBoundingClientRect().top + scrollY;
        scrollTo({ top: top - 120, behavior: "instant" });
      });
      await page.waitForFunction(() => document.querySelector(".blk-gallery .media-frame")?.classList.contains("is-media-settled"));
      // Let the fade-in finish before comparing pixels.
      await page.waitForTimeout(1200);
      const box = await image.boundingBox();
      const clip = { x: box.x, y: box.y, width: Math.min(box.width, 400), height: Math.min(box.height, 1000 - box.y) };
      const shown = await page.screenshot({ clip });
      // Mean luminance of what is painted versus the same area of the decoded image drawn on a canvas.
      const [painted, decoded] = await page.evaluate(async ({ png, clip, box }) => {
        const mean = (ctx, w, h) => {
          const data = ctx.getImageData(0, 0, w, h).data;
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          return sum / (data.length / 4);
        };
        const w = Math.round(clip.width);
        const h = Math.round(clip.height);
        const shot = new Image();
        shot.src = `data:image/png;base64,${png}`;
        await shot.decode();
        const a = new OffscreenCanvas(w, h).getContext("2d");
        a.drawImage(shot, 0, 0, w, h);
        const img = document.querySelector(".blk-gallery img");
        const b = new OffscreenCanvas(w, h).getContext("2d");
        b.drawImage(img, 0, 0, box.width, box.height);
        return [mean(a, w, h), mean(b, w, h)];
      }, { png: shown.toString("base64"), clip, box });
      assert.ok(Math.abs(painted - decoded) <= 6, `${slug}: painted luminance ${painted.toFixed(1)}, image ${decoded.toFixed(1)} (something is drawn over the gallery)`);
    } catch (error) {
      failures.push(error.message);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`media-sweep-contained e2e PASS: ${slugs.length} project galleries show the image without an overlay`);
