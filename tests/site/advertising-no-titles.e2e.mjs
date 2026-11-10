import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".tooling/browsers");
}

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });

try {
  for (const [locale, categoryLabel] of [["vi", "displays-booths"], ["en", "displays-booths"]]) {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      const page = await browser.newPage({ viewport });
      const browseUrl = `${baseUrl}/${locale}/advertising-products/?category=${categoryLabel}`;
      await page.goto(browseUrl, { waitUntil: "networkidle" });
      await page.waitForSelector("[data-advertising-card]");
      const evidence = await page.evaluate(() => ({
        // Owner 2026-11-09: mỗi card masonry có một tên ẩn (aria-hidden), chỉ hiện khi hover chuột thật, không chiếm chỗ.
        captions: [...document.querySelectorAll(".advertising-grid figcaption")].map((caption) => ({
          title: caption.matches(".advertising-tile__title[aria-hidden=\"true\"]"), opacity: getComputedStyle(caption).opacity,
          position: getComputedStyle(caption).position,
        })),
        cardCount: document.querySelectorAll(".advertising-grid [data-advertising-card]").length,
        photoTitles: document.querySelectorAll("[data-advertising-photo-title]").length,
        gridTitle: document.querySelectorAll("#du-an-title").length,
        currentFilter: document.querySelector("[data-advertising-filter][aria-current=\"true\"]")?.getAttribute("data-advertising-filter"),
        imageAlts: [...document.querySelectorAll(".advertising-grid img")].map((image) => image.getAttribute("alt") || ""),
        infoLabel: document.querySelector("[data-advertising-photo-info]")?.getAttribute("aria-label") || "",
        tiles: [...document.querySelectorAll(".advertising-grid .advertising-tile")].map((tile) => ({
          height: tile.getBoundingClientRect().height,
          imageHeight: tile.querySelector(".project-tile__media")?.getBoundingClientRect().height || 0,
        })),
      }));
      assert.ok(evidence.captions.length === evidence.cardCount && evidence.captions.every((caption) => caption.title && caption.opacity === "0" && caption.position === "absolute"),
        `${locale} ${viewport.width}px: grid cards carry only a hidden hover title: ${JSON.stringify(evidence.captions.slice(0, 3))}`);
      assert.equal(evidence.photoTitles, 0, `${locale} ${viewport.width}px: detail has no image title node`);
      assert.equal(evidence.gridTitle, 0, `${locale} ${viewport.width}px: browse has no grid title node`);
      assert.equal(evidence.currentFilter, categoryLabel, `${locale} ${viewport.width}px: current filter is preserved`);
      assert.ok(evidence.imageAlts.length > 0 && evidence.imageAlts.every(Boolean), `${locale} ${viewport.width}px: grid image alternatives remain readable`);
      assert.ok(evidence.infoLabel.trim(), `${locale} ${viewport.width}px: detail info region keeps a meaningful label`);
      assert.ok(evidence.tiles.length > 0 && evidence.tiles.every((tile) => Math.abs(tile.height - tile.imageHeight) <= 1), `${locale} ${viewport.width}px: tile reserves caption height`);

      await page.goto(`${browseUrl}&photo=kiosk-posm-01`, { waitUntil: "networkidle" });
      await page.waitForSelector("[data-advertising-photo-view]:not([hidden])");
      await page.waitForSelector("[data-advertising-related-card]");
      const detail = await page.evaluate(() => ({
        titleCount: document.querySelectorAll("[data-advertising-photo-title]").length,
        description: document.querySelector("[data-advertising-photo-description]")?.textContent?.trim() || "",
        imageAlt: document.querySelector("[data-advertising-photo-image]")?.getAttribute("alt") || "",
        infoLabel: document.querySelector("[data-advertising-photo-info]")?.getAttribute("aria-label") || "",
        relatedCardCount: document.querySelectorAll("[data-advertising-related-card]").length,
        // Owner 2026-11-09: card related có tên ẩn như masonry chính; id có tiền tố riêng nên không trùng card cùng id ở lưới chính.
        relatedCaptions: [...document.querySelectorAll("[data-advertising-related-card] figcaption")].map((caption) => ({
          title: caption.matches(".advertising-tile__title[aria-hidden=\"true\"]"), opacity: getComputedStyle(caption).opacity,
          position: getComputedStyle(caption).position, id: caption.id,
          labelled: caption.closest("[data-advertising-related-card]").querySelector("a")?.getAttribute("aria-labelledby") === caption.id,
          unique: document.querySelectorAll(`[id="${caption.id}"]`).length === 1,
        })),
        relatedTiles: [...document.querySelectorAll("[data-advertising-related-card]")].map((tile) => ({
          height: tile.getBoundingClientRect().height,
          imageHeight: tile.querySelector(".project-tile__media")?.getBoundingClientRect().height || 0,
        })),
      }));
      assert.equal(detail.titleCount, 0, `${locale} ${viewport.width}px: active detail has no image title`);
      assert.ok(detail.description, `${locale} ${viewport.width}px: normal detail copy remains present`);
      assert.ok(detail.imageAlt, `${locale} ${viewport.width}px: detail image alternative remains readable`);
      assert.ok(detail.infoLabel.trim(), `${locale} ${viewport.width}px: detail region remains meaningfully named`);
      assert.ok(detail.relatedCardCount > 0, `${locale} ${viewport.width}px: active detail renders no related cards`);
      assert.ok(detail.relatedCaptions.length === detail.relatedCardCount && detail.relatedCaptions.every((caption) => caption.title && caption.opacity === "0"
        && caption.position === "absolute" && caption.id.startsWith("advertising-related-title-") && caption.labelled && caption.unique),
        `${locale} ${viewport.width}px: related cards carry one hidden hover title with a unique related id: ${JSON.stringify(detail.relatedCaptions.slice(0, 3))}`);
      assert.ok(detail.relatedTiles.every((tile) => Math.abs(tile.height - tile.imageHeight) <= 1), `${locale} ${viewport.width}px: related tile reserves caption height`);

      await page.goto(`${baseUrl}/${locale}/advertising-products/kiosk-posm/`, { waitUntil: "networkidle" });
      // Trang tương thích chuyển thẳng tới trang cụm theo slug của locale (taxonomy R4).
      await page.waitForURL(new RegExp(`/${locale}/advertising-products/${locale === "en" ? "displays-booths" : "standee-ke-trung-bay"}/$`));
      await page.waitForSelector("[data-advertising-card]");
      await page.close();
    }
  }
} finally {
  await browser.close();
}
