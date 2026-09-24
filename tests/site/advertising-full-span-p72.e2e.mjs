import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true });

try {
  for (const locale of ["vi", "en"]) {
    for (const [width, category, photo, capped] of [
      [756, "kiosk-posm", "kiosk-posm-28", false],
      [756, "kiosk-posm", "kiosk-posm-09", true],
      [954, "signage-raised-letters", "signage-raised-letters-07", true],
    ]) {
      const page = await browser.newPage({ viewport: { width, height: 910 } });
      try {
        await page.goto(`${origin}/${locale}/advertising-products/?category=${category}&photo=${photo}`);
        await page.waitForFunction(() => {
          const view = document.querySelector("[data-advertising-photo-view]");
          const image = document.querySelector("[data-advertising-photo-image]");
          return document.fonts.status === "loaded" && view?.dataset.advertisingPhotoLayout === "pinterest"
            && image?.complete && image.naturalWidth > 0;
        });
        const state = await page.evaluate(() => {
          const box = (selector) => document.querySelector(selector).getBoundingClientRect();
          const primary = box("[data-advertising-photo-primary]");
          const frame = box(".advertising-photo-view__hero-frame");
          const image = box("[data-advertising-photo-image]");
          const info = box("[data-advertising-photo-info]");
          const gap = Number.parseFloat(getComputedStyle(document.querySelector("[data-advertising-photo-primary]")).gap);
          return {
            primaryHeight: primary.height, primaryTop: primary.top, primaryBottom: primary.bottom,
            frameWidth: frame.width, frameHeight: frame.height,
            imageWidth: image.width, imageHeight: image.height, imageLeft: image.left,
            frameLeft: frame.left, infoHeight: info.height, gap,
            glass: document.querySelector("[data-advertising-photo-view]").dataset.advertisingPhotoGlass,
            horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });
        const label = `${locale} ${photo} ${width}x910`;
        assert(state.primaryBottom <= 911, `${label}: primary extends below viewport (${state.primaryBottom}px)`);
        assert(Math.abs(state.frameHeight - state.imageHeight) <= 1, `${label}: top/bottom overflow`);
        assert(state.infoHeight + state.gap <= 910 * 0.28 + 1, `${label}: description exceeds cap`);
        assert.equal(state.horizontalOverflow, 0, `${label}: horizontal overflow`);
        if (capped) {
          assert(Math.abs(state.primaryBottom - 910) <= 1, `${label}: tall image does not reach available viewport cap`);
          assert(state.imageWidth < state.frameWidth - 1, `${label}: side overflow is absent`);
          assert(Math.abs(state.imageLeft - state.frameLeft - (state.frameWidth - state.imageWidth) / 2) <= 1,
            `${label}: image is not horizontally centered`);
          assert.equal(state.glass, "true", `${label}: side glass is missing`);
        } else {
          assert(state.primaryHeight < 810, `${label}: landscape primary is stretched`);
          assert(Math.abs(state.frameWidth - state.imageWidth) <= 1, `${label}: image does not fill width`);
          assert.equal(state.glass, "false", `${label}: fitted image has glass`);
        }
      } finally {
        await page.close();
      }
    }
  }
  process.stdout.write("[advertising-full-span-p72] VI/EN landscape, portrait, and 954px geometry passed\n");
} finally {
  await browser.close();
}
