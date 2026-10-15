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
        captions: document.querySelectorAll(".advertising-grid figcaption, [data-advertising-related-card] figcaption").length,
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
      assert.equal(evidence.captions, 0, `${locale} ${viewport.width}px: grid has no image captions`);
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
        relatedCaptionCount: document.querySelectorAll("[data-advertising-related-card] figcaption").length,
        relatedTiles: [...document.querySelectorAll("[data-advertising-related-card]")].map((tile) => ({
          height: tile.getBoundingClientRect().height,
          imageHeight: tile.querySelector("img")?.getBoundingClientRect().height || 0,
        })),
      }));
      assert.equal(detail.titleCount, 0, `${locale} ${viewport.width}px: active detail has no image title`);
      assert.ok(detail.description, `${locale} ${viewport.width}px: normal detail copy remains present`);
      assert.ok(detail.imageAlt, `${locale} ${viewport.width}px: detail image alternative remains readable`);
      assert.ok(detail.infoLabel.trim(), `${locale} ${viewport.width}px: detail region remains meaningfully named`);
      assert.ok(detail.relatedCardCount > 0, `${locale} ${viewport.width}px: active detail renders no related cards`);
      assert.equal(detail.relatedCaptionCount, 0, `${locale} ${viewport.width}px: related cards retain image captions`);
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
