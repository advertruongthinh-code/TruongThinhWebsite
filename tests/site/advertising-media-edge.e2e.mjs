// Lằn tối ở mép card masonry (owner 2026-11-09): nền màu chủ đạo của khung không được lộ ở mép media.
// 1. Ảnh đã tải phủ đúng khung, kể cả khi file đang tải làm tròn pixel lệch tỷ lệ (480w: 437x245 của khung 3065x1725).
// 2. Ảnh mờ chờ tải phóng ra ngoài khung ít nhất bằng bán kính blur, dải mép nhạt của blur nằm ngoài vùng cắt.
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/advertising-media-edge.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const { default: sharp } = await import("sharp");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const BLEED = 24;
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

const scrollThrough = async (page, wait) => {
  await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
  for (let y = 0; y <= 4800; y += 1200) {
    await page.evaluate((value) => window.TruongThinhMotion.setLogicalScroll(value), y);
    await page.waitForTimeout(wait);
  }
};

try {
  for (const viewport of [{ width: 1920, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "networkidle" });
    await scrollThrough(page, 800);
    const edges = await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] .masonry-card")].flatMap((tile) => {
      const media = tile.querySelector(".masonry-card__media");
      const image = media?.querySelector("img.is-masonry-media-ready:not([hidden])");
      if (!image?.naturalWidth || image.style.filter) return [];
      // Hết blur thì không còn scale tràn khung: scale sót lại làm ảnh lớn hơn khung (gap âm).
      if (image.style.scale) return [{ id: tile.dataset.masonryCard, gap: Infinity, scale: image.style.scale }];
      const box = media.getBoundingClientRect();
      const rect = image.getBoundingClientRect();
      const gap = Math.max(...[rect.top - box.top, box.bottom - rect.bottom, rect.left - box.left, box.right - rect.right].map(Math.abs));
      return [{ id: tile.dataset.masonryCard, gap, natural: `${image.naturalWidth}x${image.naturalHeight}` }];
    }));
    assert.ok(edges.length > 8, `${viewport.width}px: enough loaded cards measured (${edges.length})`);
    assert.deepEqual(edges.filter(({ gap }) => gap > 0.01), [], `${viewport.width}px: loaded media leaves the frame colour visible at an edge`);
    // Lớp chặn thứ hai: ép media hụt khung 0,6px; hàng pixel đáy của card nền tối phải là màu giấy, không phải màu chủ đạo.
    await page.addStyleTag({ content: ".masonry-card img { height: calc(100% - 0.6px) !important; }" });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    // Khung nền tối đặt tay (rgb 20) trên card đã hiện ảnh, không phụ thuộc màu chủ đạo của catalog.
    const darkCards = await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] .masonry-card .masonry-card__media")].filter((media) => {
      const box = media.getBoundingClientRect();
      return media.querySelector("img.is-masonry-media-ready:not([hidden])") && box.top >= 0 && box.bottom <= innerHeight - 4 && box.width >= 60;
    }).slice(0, 4).map((media) => {
      media.style.backgroundColor = "rgb(20, 20, 20)";
      const box = media.getBoundingClientRect();
      return { x: box.left + 8, y: Math.ceil(box.bottom) - 1, width: box.width - 16, luminance: 20 };
    }));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.ok(darkCards.length >= 2, `${viewport.width}px: enough settled cards for the sub-pixel check (${darkCards.length})`);
    for (const card of darkCards) {
      const { data, info } = await sharp(await page.screenshot({ clip: { x: card.x, y: card.y, width: card.width, height: 1 } })).raw().toBuffer({ resolveWithObject: true });
      let sum = 0;
      for (let i = 0; i < info.width * info.channels; i += info.channels) sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const bottom = sum / info.width;
      assert.ok(bottom > card.luminance + 60, `${viewport.width}px: sub-pixel gap shows the frame colour (${bottom.toFixed(0)} vs frame ${card.luminance.toFixed(0)})`);
    }
    await page.close();
  }

  // Ảnh card bị giữ 8s như Slow 3G: card trong viewport đang mờ.
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.route("**/assets/content/**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 8000));
      await route.continue().catch(() => {});
    });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelectorAll("[data-project-grid] [data-masonry-media-loading]").length > 2);
    const bleeds = await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-masonry-media-loading]")].flatMap((tile) => {
      const media = tile.querySelector(".masonry-card__media");
      const image = media?.querySelector(".masonry-card__foreground:not([hidden])");
      if (!image?.style.filter.startsWith("blur(")) return [];
      const box = media.getBoundingClientRect();
      const rect = image.getBoundingClientRect();
      return [{ id: tile.dataset.masonryCard, bleed: Math.min(box.top - rect.top, rect.bottom - box.bottom, box.left - rect.left, rect.right - box.right) }];
    }));
    assert.ok(bleeds.length > 2, `${viewport.width}px: blurred cards measured (${bleeds.length})`);
    assert.deepEqual(bleeds.filter(({ bleed }) => bleed < BLEED - 0.5), [], `${viewport.width}px: blurred media must overflow the frame by the blur radius`);
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await context.close();
  }
  console.log("advertising-media-edge: ok");
} finally {
  await browser.close();
}
