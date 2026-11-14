// Detail breadcrumb (advertising-detail R3, owner 2026-11-14): root, cluster (rail name), main product, each a real link.
// A click closes detail, filters the grid in place at that level with the card in view, and Back reopens the photo.
// Every SWEEP_WIDTHS width: no crumb past the info column, and a wrap falls between crumbs or leaves at least two words per line.
import assert from "node:assert/strict";
import { BASE_URL, SWEEP_WIDTHS, launchBrowser, openPage, viewportAt } from "./harness.mjs";

const CARD = "kiosk-posm-67";
const EXPECTED = {
  vi: [
    ["all", "Sản phẩm quảng cáo", "/vi/advertising-products/"],
    ["displays-booths", "Trưng bày", "/vi/advertising-products/standee-ke-trung-bay/"],
    ["displays-booths/display-shelves-cabinets", "Kệ, tủ trưng bày", "/vi/advertising-products/standee-ke-trung-bay/ke-tu-trung-bay/"],
  ],
  en: [
    ["all", "Advertising products", "/en/advertising-products/"],
    ["displays-booths", "Displays", "/en/advertising-products/displays-booths/"],
    ["displays-booths/display-shelves-cabinets", "Display shelves & cabinets", "/en/advertising-products/displays-booths/display-shelves-cabinets/"],
  ],
};

const openPhoto = async (page, locale) => {
  await page.goto(`${BASE_URL}/${locale}/advertising-products/p/${CARD}/`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-detail-crumb]");
};

const browser = await launchBrowser();
try {
  for (const width of SWEEP_WIDTHS) {
    const { context, page } = await openPage(browser, viewportAt(width), { reducedMotion: "reduce" });
    try {
      for (const locale of ["vi", "en"]) {
        await openPhoto(page, locale);
        const crumbs = await page.$$eval("[data-detail-crumb]", (links) =>
          links.map((link) => [link.dataset.detailCrumb, link.textContent, link.getAttribute("href")]));
        assert.deepEqual(crumbs, EXPECTED[locale], `${width} ${locale}: crumbs`);
        const fit = await page.$eval("[data-detail-category]", (nav) => {
          const column = nav.getBoundingClientRect();
          const words = [...nav.querySelectorAll("a")].map((link) => {
            const range = document.createRange();
            range.selectNodeContents(link);
            const lines = new Map();
            for (const node of link.childNodes) {
              for (const match of node.textContent.matchAll(/\S+/g)) {
                range.setStart(node, match.index);
                range.setEnd(node, match.index + match[0].length);
                const top = Math.round(range.getBoundingClientRect().top);
                lines.set(top, (lines.get(top) || 0) + 1);
              }
            }
            return [...lines.values()];
          });
          const outside = [...nav.querySelectorAll("li")].some((item) => {
            const box = item.getBoundingClientRect();
            return box.left < column.left - 1 || box.right > column.right + 1;
          });
          return { outside, words };
        });
        assert.equal(fit.outside, false, `${width} ${locale}: crumb past the column`);
        for (const lines of fit.words) {
          assert.ok(lines.length === 1 || lines.every((count) => count >= 2), `${width} ${locale}: orphan word in crumb ${lines}`);
        }
      }

      for (const [filter, , href] of EXPECTED.vi) {
        await openPhoto(page, "vi");
        await page.click(`[data-detail-crumb="${filter}"]`);
        await page.waitForFunction(() => !document.body.classList.contains("is-detail"));
        await page.waitForFunction((target) => new URL(location.href).pathname === target, href);
        const state = await page.evaluate((id) => {
          const card = document.querySelector(`[data-masonry-card="${id}"]`)?.getBoundingClientRect();
          return {
            rail: [...document.querySelectorAll('[data-masonry-filter][aria-current="true"], [data-masonry-product][aria-current="true"]')]
              .map((node) => node.dataset.masonryFilter || node.dataset.masonryProduct),
            visible: Boolean(card && card.bottom > 0 && card.top < innerHeight),
          };
        }, CARD);
        assert.ok(state.rail.includes(filter), `${width} ${filter}: rail shows ${state.rail}`);
        assert.ok(state.visible, `${width} ${filter}: card in view after closing`);
        await page.goBack();
        await page.waitForFunction(() => document.body.classList.contains("is-detail"));
        assert.match(page.url(), new RegExp(`/vi/advertising-products/p/${CARD}/$`), `${width} ${filter}: Back reopens the photo`);
      }
    } finally {
      await context.close();
    }
  }
  console.log("advertising-detail-breadcrumb: PASS");
} finally {
  await browser.close();
}
