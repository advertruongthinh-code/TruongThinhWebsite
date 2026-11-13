import assert from "node:assert/strict";
import { test } from "node:test";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";
import { MEDIA_COLORS } from "../../src/site/media-lib/colors.mjs";
import { BASE_URL, VIEWPORTS, launchBrowser, openPage } from "./harness.mjs";

// media-card R2 (owner 2026-11-13): a card's pill takes the tone of the area under it in the media shown (a video's poster): over a dark area
// (pill luminance below 20) it turns light, over a light area it stays charcoal, and changing media fades between the two in 0.3s.
const key = (src) => src?.split("/").pop().replace(/\.\w+$/, "");
const luminance = (item) => MEDIA_COLORS[key(item.kind === "video" ? item.posterSrc : item.src)]?.[5];
const card = ADVERTISING_CATALOG_ARTIFACT.cards.find(({ mediaItems = [] }) => mediaItems.length >= 2 && mediaItems.length <= 5
  && luminance(mediaItems[0]) < 20 && luminance(mediaItems[1]) >= 20);
assert(card, "a card whose first media is dark under the pill and second is light");

for (const [label, viewport, touch] of [["PC 1440", VIEWPORTS.desktop, false], ["phone 390", VIEWPORTS.phone, true]]) {
  test(`media-card R2 ${label}: the pill follows the tone under it and fades on a media change`, async () => {
    const browser = await launchBrowser();
    const { context, page } = await openPage(browser, viewport, { hasTouch: touch, isMobile: touch });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto(`${BASE_URL}/vi/advertising-products/?category=${card.category}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => Boolean(window.TruongThinhMasonry?.getAdapter?.()));
      await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id), card.id);
      const figure = page.locator(`[data-masonry-card="${card.id}"]`);
      await figure.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
      const pill = figure.locator(".card-media__pill");
      await pill.waitFor();
      const style = () => pill.evaluate((node) => {
        const dot = node.querySelector(".card-media__dot");
        return { tone: node.parentElement.dataset.pillTone, background: getComputedStyle(node).backgroundColor,
          dot: dot ? getComputedStyle(dot, "::before").backgroundColor : null };
      });
      const first = await style();
      assert.equal(first.tone, "light", `dark area under the pill: ${JSON.stringify(first)}`);
      assert.equal(first.background, "rgba(255, 255, 255, 0.85)");
      assert.equal(first.dot, "rgb(51, 51, 51)", "dots take the pill's ink");
      // Every frame for 0.5s after the press: the pill background must pass through values between the two tones.
      const samples = await figure.evaluate(async (node) => {
        node.querySelectorAll(".card-media__dot")[1].click();
        const pill = node.querySelector(".card-media__pill");
        const seen = [];
        const end = performance.now() + 500;
        while (performance.now() < end) {
          seen.push(getComputedStyle(pill).backgroundColor);
          await new Promise(requestAnimationFrame);
        }
        return seen;
      });
      const last = await style();
      assert.equal(last.tone, "dark", `light area under the pill: ${JSON.stringify(last)}`);
      assert.equal(last.background, "rgba(51, 51, 51, 0.8)");
      assert(samples.some((value) => value !== first.background && value !== last.background), `the pill fades: ${JSON.stringify(samples.slice(0, 8))}`);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
