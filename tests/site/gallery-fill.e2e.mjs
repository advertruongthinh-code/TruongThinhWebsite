// Project gallery carousel (detail-pages R7): when the images are too few to fill the track (light-well townhouse: three portraits
// at 1920), the row grows taller until the last image reaches the track's right edge, so no empty strip is left on the right.
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
const failures = [];
try {
  for (const width of [384, 1920, 2560]) {
    const phone = width < 600;
    const context = await browser.newContext({ viewport: { width, height: 1000 }, isMobile: phone, hasTouch: phone });
    for (const slug of slugs) {
      const page = await context.newPage();
      try {
        await page.goto(`${origin}/vi/projects/${slug}/`, { waitUntil: "load" });
        await page.locator(".blk-gallery").scrollIntoViewIfNeeded();
        await page.waitForSelector(".blk-gallery [data-gallery-track].swiper-initialized");
        const gap = await page.$eval(".blk-gallery", (section) => {
          const track = section.querySelector("[data-gallery-track]").getBoundingClientRect();
          return Math.round(track.right - [...section.querySelectorAll("img")].at(-1).getBoundingClientRect().right);
        });
        assert.ok(gap <= 1, `${slug} ${width}px: ${gap}px empty right of the last image`);
      } catch (error) {
        failures.push(error.message);
      } finally {
        await page.close();
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`gallery-fill e2e PASS: ${slugs.length} project galleries fill the track at 384, 1920 and 2560`);
