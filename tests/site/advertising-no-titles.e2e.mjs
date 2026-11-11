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
      await page.waitForSelector("[data-masonry-card]");
      const evidence = await page.evaluate(() => ({
        // Owner 2026-11-09: every masonry card has a hidden name (aria-hidden), shown only on real mouse hover, taking no space.
        captions: [...document.querySelectorAll(".masonry-grid figcaption")].map((caption) => ({
          title: caption.matches(".masonry-card__title[aria-hidden=\"true\"]"), opacity: getComputedStyle(caption).opacity,
          position: getComputedStyle(caption).position,
        })),
        cardCount: document.querySelectorAll(".masonry-grid [data-masonry-card]").length,
        photoTitles: document.querySelectorAll("[data-detail-title]").length,
        gridTitle: document.querySelectorAll("#du-an-title").length,
        currentFilter: document.querySelector("[data-masonry-filter][aria-current=\"true\"]")?.getAttribute("data-masonry-filter"),
        imageAlts: [...document.querySelectorAll(".masonry-grid img")].map((image) => image.getAttribute("alt") || ""),
        infoLabel: document.querySelector("[data-detail-info]")?.getAttribute("aria-label") || "",
        tiles: [...document.querySelectorAll(".masonry-grid .masonry-card")].map((tile) => ({
          height: tile.getBoundingClientRect().height,
          imageHeight: tile.querySelector(".masonry-card__media")?.getBoundingClientRect().height || 0,
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
      await page.waitForSelector("[data-detail-view]:not([hidden])");
      await page.waitForSelector("[data-masonry-related-card]");
      const detail = await page.evaluate(() => ({
        titleCount: document.querySelectorAll("[data-detail-title]").length,
        description: document.querySelector("[data-detail-description]")?.textContent?.trim() || "",
        imageAlt: document.querySelector("[data-detail-image]")?.getAttribute("alt") || "",
        infoLabel: document.querySelector("[data-detail-info]")?.getAttribute("aria-label") || "",
        relatedCardCount: document.querySelectorAll("[data-masonry-related-card]").length,
        // Owner 2026-11-09: a related card has a hidden name like the main masonry; its id has its own prefix so it does not collide with the same-id card in the main grid.
        relatedCaptions: [...document.querySelectorAll("[data-masonry-related-card] figcaption")].map((caption) => ({
          title: caption.matches(".masonry-card__title[aria-hidden=\"true\"]"), opacity: getComputedStyle(caption).opacity,
          position: getComputedStyle(caption).position, id: caption.id,
          labelled: caption.closest("[data-masonry-related-card]").querySelector("a")?.getAttribute("aria-labelledby") === caption.id,
          unique: document.querySelectorAll(`[id="${caption.id}"]`).length === 1,
        })),
        relatedTiles: [...document.querySelectorAll("[data-masonry-related-card]")].map((tile) => ({
          height: tile.getBoundingClientRect().height,
          imageHeight: tile.querySelector(".masonry-card__media")?.getBoundingClientRect().height || 0,
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
      // The compatibility page redirects straight to the cluster page by the locale slug (taxonomy R4).
      await page.waitForURL(new RegExp(`/${locale}/advertising-products/${locale === "en" ? "displays-booths" : "standee-ke-trung-bay"}/$`));
      await page.waitForSelector("[data-masonry-card]");
      await page.close();
    }
  }
} finally {
  await browser.close();
}
