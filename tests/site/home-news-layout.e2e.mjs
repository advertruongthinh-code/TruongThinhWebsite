// Home News strip (news R4): left edge, width and column count of the three teasers match espaciohomedesign.com/en (layout-bloque-noticias)
// measured 2026-11-14 at every width from 384 to 1920, so the 1500px cap, the gaps and the column breakpoints cannot drift again.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";

// Espacio [left, width] of the three items per viewport width.
const ESPACIO = {
  1920: [[210, 453], [733, 453], [1257, 453]],
  1440: [[35, 410], [515, 410], [995, 410]],
  1100: [[25, 317], [392, 317], [758, 317]],
  900: [[25, 400], [475, 400], [25, 400]],
  700: [[15, 320], [365, 320], [15, 320]],
  560: [[15, 530], [15, 530], [15, 530]],
  384: [[15, 354], [15, 354], [15, 354]],
};

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const failures = [];
try {
  for (const [width, expected] of Object.entries(ESPACIO)) {
    const phone = Number(width) < 600;
    const context = await browser.newContext({ viewport: { width: Number(width), height: 900 }, isMobile: phone, hasTouch: phone });
    const page = await context.newPage();
    try {
      await page.goto(`${origin}/vi/`, { waitUntil: "load" });
      const items = await page.$$eval(".home-news__item", (links) => links.map((link) => {
        const box = link.getBoundingClientRect();
        return [Math.round(box.left), Math.round(box.width)];
      }));
      assert.equal(items.length, 3, `${width}px: three teasers`);
      items.forEach(([left, size], index) => {
        assert.ok(Math.abs(left - expected[index][0]) <= 1 && Math.abs(size - expected[index][1]) <= 1,
          `${width}px item ${index + 1}: left ${left} width ${size}, Espacio ${expected[index].join(" ")}`);
      });
    } catch (error) {
      failures.push(error.message);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`home-news-layout e2e PASS: ${Object.keys(ESPACIO).length} widths match Espacio`);
