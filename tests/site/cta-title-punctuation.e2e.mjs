// detail-pages R10: dấu câu cuối tiêu đề CTA không rơi riêng xuống dòng mới, VI và EN, phone tới PC, có SplitText.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const widths = (process.env.CTA_WIDTHS || "320,360,375,384,390,411,430,768,1024,1280,1440,1920").split(",").map(Number);
const routes = ["residential/", "commercial/", "about/"];

// Dòng của ký tự cuối (dấu câu) so với ký tự chữ ngay trước nó; lệch quá nửa cỡ chữ là dấu đã rơi dòng.
const inspect = (page) => page.evaluate(() => {
  const title = document.querySelector(".detail-cta h2");
  if (!title) return { missing: true };
  const chars = [];
  const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (let index = 0; index < node.length; index += 1) if (node.data[index].trim()) chars.push({ node, index });
  }
  const rectOf = ({ node, index }) => {
    const range = document.createRange();
    range.setStart(node, index);
    range.setEnd(node, index + 1);
    return range.getBoundingClientRect();
  };
  const last = chars.at(-1);
  const letter = chars.findLast(({ node, index }) => /[\p{L}\p{N}]/u.test(node.data[index]));
  if (!last || last === letter) return { punctuation: false };
  return {
    punctuation: true,
    drop: rectOf(last).top - rectOf(letter).top,
    fontSize: Number.parseFloat(getComputedStyle(title).fontSize),
    text: title.textContent.replace(/\s+/g, " ").trim(),
  };
});

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const failures = [];
let checked = 0;
try {
  for (const locale of ["vi", "en"]) for (const route of routes) {
    const context = await browser.newContext({ viewport: { width: widths[0], height: 900 } });
    const page = await context.newPage();
    try {
      for (const width of widths) {
        // Tải lại ở từng bề rộng: SplitText chia dòng lúc mount như máy thật.
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${origin}/${locale}/${route}`, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        await page.locator(".detail-cta h2").scrollIntoViewIfNeeded();
        // Chờ reveal xong: dòng chưa hiện còn bị dời xuống trong mask, làm sai phép so dòng.
        await page.waitForTimeout(2200);
        const info = await inspect(page);
        const where = `${locale} /${route} @${width}`;
        if (info.missing) failures.push(`${where}: CTA title missing`);
        else if (info.punctuation) {
          checked += 1;
          if (Math.abs(info.drop) > info.fontSize / 2) failures.push(`${where}: "${info.text}" punctuation on its own line (${Math.round(info.drop)}px)`);
        }
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], `CTA title punctuation failures:\n${failures.join("\n")}`);
console.log(`cta-title-punctuation: PASS (${checked} titles ending in punctuation)`);
