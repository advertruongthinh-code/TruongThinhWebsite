// hero-typography R1, R3, R4: title hai dòng, không cắt dấu, không cuộn ngang, khoảng cách dòng đều.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const { default: sharp } = await import("sharp");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const widths = (process.env.HERO_WIDTHS || "320,360,375,384,390,411,768,1024,1280,1440,1920,2560")
  .split(",")
  .map(Number);

// Dòng VI theo chốt owner 2026-10-18; EN chỉ kiểm số dòng và dấu.
const titles = [
  { route: "", selector: ".hero h1", mask: ".hero-line-mask", vi: ["làm chắc", "làm khác"] },
  { route: "", selector: ".legacy-copy h2", mask: ".line-mask", vi: ["giữ nghề,", "không ngừng làm mới"] },
  { route: "residential/", selector: ".detail-hero h1", mask: ".detail-hero-line-mask", vi: ["nơi tái tạo", "năng lượng sống"] },
  { route: "commercial/", selector: ".detail-hero h1", mask: ".detail-hero-line-mask", vi: ["thiết kế tối ưu", "vận hành bền bỉ"] },
  { route: "advertising-products/", selector: ".detail-hero h1", mask: ".detail-hero-line-mask", vi: ["để thương hiệu", "luôn trong tầm mắt"] },
  { route: "about/", selector: ".detail-hero h1", mask: ".detail-hero-line-mask" },
  { route: { vi: "advertising-products/bang-hieu-quang-cao/", en: "advertising-products/signage/" }, selector: ".detail-hero p.hero-title", mask: ".detail-hero-line-mask" },
];

const inspectTitle = (page, { selector, mask }) => page.evaluate(({ selector, mask }) => {
  const title = document.querySelector(selector);
  // Chỉ lấy rect của text node; rect của span inline-block bọc cả hai dòng làm gộp sai.
  const textRects = (node) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const rects = [];
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      const range = document.createRange();
      range.selectNodeContents(text);
      rects.push(...range.getClientRects());
    }
    return rects.filter((r) => r.width > 1 && r.height > 1).sort((a, b) => a.top - b.top);
  };
  if (!title) return null;
  const lineCount = (node) => {
    // Dòng mới khi top lệch quá nửa chiều cao rect; line-height chật làm rect hai dòng chồng nhau.
    const lines = [];
    for (const rect of textRects(node)) {
      const line = lines.at(-1);
      if (line && rect.top - line.top <= Math.max(line.height, rect.height) / 2) line.height = Math.max(line.height, rect.height);
      else lines.push({ top: rect.top, height: rect.height });
    }
    return lines.length;
  };
  const masks = [...title.querySelectorAll(`:scope ${mask}`)];
  return {
    texts: masks.map((m) => m.textContent.replace(/\s+/g, " ").trim().replace(/\.$/, "").toLowerCase()),
    lines: masks.map(lineCount),
    rects: masks.map((m) => m.getBoundingClientRect().toJSON()),
    box: title.getBoundingClientRect().toJSON(),
    fontSize: Number.parseFloat(getComputedStyle(title).fontSize),
    overflowX: document.documentElement.scrollWidth - innerWidth,
  };
}, { selector, mask });

// Ảnh chụp vùng title khi mask cắt và khi bỏ cắt; khác nhau nghĩa là có nét chữ (dấu) bị cắt.
const clippedInk = async (page, { selector, mask }, box, fontSize) => {
  const pad = fontSize * 0.6;
  const viewport = page.viewportSize();
  const clip = {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    width: Math.min(viewport.width, box.width + pad * 2),
    height: box.height + pad * 2,
  };
  const shot = () => page.screenshot({ clip, animations: "disabled" });
  // So theo pixel có ngưỡng: đổi lớp compositing làm anti-alias lệch vài mức xám.
  const differs = async (...pngs) => {
    const [a, b] = await Promise.all(pngs.map((png) => sharp(png).raw().toBuffer()));
    return a.some((value, index) => Math.abs(value - b[index]) > 24);
  };
  const before = await shot();
  if (await differs(before, await shot())) return "unstable";
  const unclip = await page.addStyleTag({
    content: `${selector}, ${selector} * { overflow: visible !important; clip-path: none !important; contain: none !important; }`,
  });
  const after = await shot();
  await unclip.evaluate((tag) => tag.remove());
  if (await differs(before, after)) return "clipped";
  // Nét chữ của dòng 1 và dòng 2 (kể cả dấu) không được chồng hàng pixel lên nhau.
  const only = async (hidden) => {
    const style = await page.addStyleTag({
      content: hidden.map((index) => `${selector} ${mask}:nth-of-type(${index + 1}) { visibility: hidden !important; }`).join(""),
    });
    const image = await shot();
    await style.evaluate((tag) => tag.remove());
    return sharp(image).raw().toBuffer({ resolveWithObject: true });
  };
  const blank = await only([0, 1]);
  // Pixel có nét của từng dòng khi dòng kia ẩn; trùng pixel nghĩa là hai dòng đè lên nhau.
  const ink = async (hidden) => {
    const { data, info } = await only(hidden);
    const marked = new Uint8Array(info.width * info.height);
    for (let pixel = 0; pixel < marked.length; pixel += 1) {
      for (let channel = 0; channel < info.channels; channel += 1) {
        const offset = pixel * info.channels + channel;
        if (Math.abs(data[offset] - blank.data[offset]) > 24) { marked[pixel] = 1; break; }
      }
    }
    return marked;
  };
  const first = await ink([1]);
  const second = await ink([0]);
  if (!first.includes(1) || !second.includes(1)) return "no ink";
  const touching = first.reduce((count, value, pixel) => count + (value && second[pixel] ? 1 : 0), 0);
  return touching ? `lines overlap (${touching} px)` : "";
};

const baselineGaps = (page) => page.evaluate(() => {
  const uneven = [];
  for (const block of document.querySelectorAll("main :is(p, h1, h2, h3, li, blockquote, figcaption), footer :is(p, li)")) {
    if (!block.offsetParent || block.querySelector("img")) continue;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const rects = [];
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      const range = document.createRange();
      range.selectNodeContents(text);
      rects.push(...range.getClientRects());
    }
    const lines = [];
    for (const rect of rects.filter((r) => r.width > 2 && r.height > 2).sort((a, b) => a.top - b.top)) {
      const line = lines.at(-1);
      if (line && rect.top - line.top <= Math.max(line.bottom - line.top, rect.height) / 2) line.bottom = Math.max(line.bottom, rect.bottom);
      else lines.push({ top: rect.top, bottom: rect.bottom });
    }
    const gaps = lines.slice(1).map((line, index) => line.bottom - lines[index].bottom);
    if (gaps.length > 1 && Math.max(...gaps) - Math.min(...gaps) > 1.5) {
      uneven.push(`${block.tagName}.${block.className} "${block.textContent.trim().slice(0, 30)}" [${gaps.map(Math.round)}]`);
    }
  }
  return uneven;
});

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const failures = [];
try {
  for (const locale of ["vi", "en"]) {
    for (const route of [...new Set(titles.map((t) => t.route))]) for (const phone of [true, false]) {
      const path = typeof route === "string" ? route : route[locale];
      // Phone giả lập touch và DPR như máy đo A04s (384x724, DPR 1.875); PC không touch.
      const sizes = widths.filter((width) => phone === width < 768);
      if (!sizes.length) continue;
      const context = await browser.newContext({
        viewport: { width: sizes[0], height: phone ? 724 : 900 },
        reducedMotion: "reduce",
        ...(phone ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1.875 } : {}),
      });
      const page = await context.newPage();
      try {
        // Tải lại ở từng bề rộng như máy thật; JS đo chữ lúc mount nên resize không thay được.
        for (const width of sizes) {
          await page.setViewportSize({ width, height: phone ? 724 : 900 });
          await page.goto(`${origin}/${locale}/${path}`, { waitUntil: "load" });
          await page.evaluate(() => document.fonts.ready);
          // Ẩn ảnh nền để ảnh chụp chỉ còn chữ, không phụ thuộc slide.
          await page.addStyleTag({ content: ".hero-slides, .hero-shade, [data-motion-hero-media], .legacy-closer img, .legacy-shade, .scroll-cue { visibility: hidden !important; }" });
          await page.waitForTimeout(500);
          for (const spec of titles.filter((t) => t.route === route)) {
            const where = `${locale} /${path} ${spec.selector} @${width}`;
            await page.locator(spec.selector).scrollIntoViewIfNeeded();
            const info = await inspectTitle(page, spec);
            if (!info) { failures.push(`${where}: title missing`); continue; }
            if (info.lines.length !== 2 || info.lines.some((n) => n !== 1)) failures.push(`${where}: lines ${JSON.stringify(info.lines)}`);
            if (locale === "vi" && spec.vi && JSON.stringify(info.texts) !== JSON.stringify(spec.vi)) failures.push(`${where}: copy ${JSON.stringify(info.texts)}`);
            if (info.overflowX > 1) failures.push(`${where}: horizontal overflow ${info.overflowX}px`);
            const ink = await clippedInk(page, spec, info.box, info.fontSize);
            if (ink) failures.push(`${where}: ink ${ink}`);
          }
          if (width === 390 || width === 1440) {
            for (const block of await baselineGaps(page)) failures.push(`${locale} /${path} @${width}: uneven ${block}`);
          }
        }
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], `hero typography failures:\n${failures.join("\n")}`);
console.log("hero-typography: PASS");
