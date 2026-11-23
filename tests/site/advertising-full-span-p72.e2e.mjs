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
      // Portrait viewport: the full-span primary only stacks when the viewport is not landscape.
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      try {
        await page.goto(`${origin}${locale === "en" ? "/en" : ""}/advertising-products/?category=${category}&photo=${photo}`);
        await page.waitForFunction(() => {
          const view = document.querySelector("[data-detail-view]");
          const image = document.querySelector("[data-detail-image]");
          return document.fonts.status === "loaded" && view?.dataset.detailLayout === "pinterest"
            && image?.complete && image.naturalWidth > 0;
        });
        const state = await page.evaluate(() => {
          const box = (selector) => document.querySelector(selector).getBoundingClientRect();
          const primary = box("[data-detail-primary]");
          const frame = box(".detail-view__hero-frame");
          const image = box("[data-detail-image]");
          const info = box("[data-detail-info]");
          const gap = Number.parseFloat(getComputedStyle(document.querySelector("[data-detail-primary]")).gap);
          return {
            primaryHeight: primary.height, primaryTop: primary.top, primaryBottom: primary.bottom,
            frameWidth: frame.width, frameHeight: frame.height,
            imageWidth: image.width, imageHeight: image.height, imageLeft: image.left,
            frameLeft: frame.left, infoHeight: info.height, gap,
            glass: document.querySelector("[data-detail-view]").dataset.detailGlass,
            descriptionScrolls: (({ scrollHeight, clientHeight }) => scrollHeight > clientHeight + 1)(
              document.querySelector("[data-detail-description-scroll]")),
            horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });
        const label = `${locale} ${photo} ${width}x1000`;
        assert(state.primaryBottom <= 1001, `${label}: primary extends below viewport (${state.primaryBottom}px)`);
        assert(Math.abs(state.frameHeight - state.imageHeight) <= 1, `${label}: top/bottom overflow`);
        // Over 28% only into the gap and 50px stacked primary no longer keeps (owner 2026-11-23), or when a short image leaves
        // that room to a long description (owner 2026-11-22).
        // The short-image case: the image stands at its natural height (as wide as the frame, no side glass) and info takes the rest.
        assert(state.infoHeight + state.gap <= 1000 * 0.28 + state.gap + 50 + 1 || Math.abs(state.primaryBottom - 1000) <= 1.5
          || (!capped && state.glass !== "true" && state.primaryHeight < 900), `${label}: description exceeds cap`);
        assert.equal(state.horizontalOverflow, 0, `${label}: horizontal overflow`);
        if (capped) {
          // A tall image stops at the gap and 50px above the screen bottom; that room goes to the description, so primary ends
          // where the description fits, or at the screen bottom while it still scrolls (advertising-detail R2, owner 2026-11-23).
          const peekBottom = 1000 - state.gap - 50;
          assert(state.descriptionScrolls ? Math.abs(state.primaryBottom - 1000) <= 1
            : state.primaryBottom >= peekBottom - 1 && state.primaryBottom <= 1001, `${label}: tall image does not reach available viewport cap`);
          assert(state.imageWidth < state.frameWidth - 1, `${label}: side overflow is absent`);
          assert(Math.abs(state.imageLeft - state.frameLeft - (state.frameWidth - state.imageWidth) / 2) <= 1,
            `${label}: image is not horizontally centered`);
          assert.equal(state.glass, "true", `${label}: side glass is missing`);
        } else {
          assert(state.primaryHeight < 900, `${label}: landscape primary is stretched`);
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
