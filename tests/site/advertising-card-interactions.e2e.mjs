import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";

const browser = await chromium.launch({ headless: true });
try {
  for (const locale of ["vi", "en"]) {
    const page = await browser.newPage({ viewport: { width: 1569, height: 912 } });
    for (const detail of [true, false]) {
      const query = detail ? "?category=signage-raised-letters&photo=signage-raised-letters-02&tag=product-signage-raised-letters-product-12" : "";
      await page.goto(`${baseUrl}/${locale}/advertising-products/${query}`, { waitUntil: "domcontentloaded" });
      // Direct-load veil chặn pointer input cho đến khi trang mount xong.
      await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
      const card = page.locator(detail ? "[data-advertising-related-card]" : "[data-advertising-card]").first();
      await card.scrollIntoViewIfNeeded();
      const image = card.locator("img");
      await page.waitForFunction(selector => {
        const image = document.querySelector(selector)?.querySelector("img");
        return image?.complete && image.naturalWidth > 0;
      }, detail ? "[data-advertising-related-card]" : "[data-advertising-card]");
      await image.evaluate(image => image.decode());
      await page.waitForTimeout(700);
      const rect = await card.boundingBox();
      await card.hover();
      await page.waitForTimeout(700);
      // Owner 2026-10-18: card masonry và related không zoom media khi hover hay focus; focus chỉ có viền.
      const mediaScale = () => image.evaluate((image) => new DOMMatrixReadOnly(getComputedStyle(image).transform).a);
      assert.equal(await mediaScale(), 1, `${locale} ${detail ? "detail" : "parent"} hover keeps media still`);
      assert.deepEqual(await card.boundingBox(), rect, "Hover must not shift the card frame");
      // Owner 2026-11-10 (media-card R3): real-mouse hover shows the Pinterest shade (48px flat 0.4, linear fade to the bottom) and the white name at once.
      const hovered = await card.evaluate(async (tile) => {
        const scrim = getComputedStyle(tile.querySelector(".advertising-card-media"), "::after");
        // Máy tải cao làm transition hover bắt đầu trễ: chờ lớp tối hiện đủ (tối đa 2s) rồi mới đọc.
        for (let frame = 0; frame < 120 && scrim.opacity !== "1"; frame += 1) await new Promise(requestAnimationFrame);
        const title = tile.querySelector(".advertising-tile__title");
        return { scrim: scrim.backgroundColor, band: scrim.backgroundImage === "linear-gradient(rgba(17, 17, 17, 0.4) 48px, rgba(17, 17, 17, 0) 100%)",
          scrimOpacity: scrim.opacity, title: title?.textContent ?? null,
          titleOpacity: title && getComputedStyle(title).opacity, alt: tile.querySelector("img").alt };
      });
      assert.equal(hovered.scrimOpacity, "1", `${locale} ${detail ? "detail" : "parent"} hover shows the overlay`);
      assert.deepEqual([hovered.scrim, hovered.band, hovered.title, hovered.titleOpacity], ["rgba(0, 0, 0, 0)", true, hovered.alt, "1"],
        `${locale} ${detail ? "related" : "parent"} hover shows the card title over the Pinterest shade: ${JSON.stringify(hovered)}`);
      await page.mouse.move(0, 0);
      await page.keyboard.press("Tab");
      await card.locator("a").focus();
      await page.waitForTimeout(700);
      assert.equal(await mediaScale(), 1, "Keyboard focus keeps media still");
      assert.notEqual(await card.locator("a").evaluate(e => getComputedStyle(e).outlineStyle), "none");
      const expectedPhoto = await card.locator("a").evaluate(e => (new URL(e.href).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null));
      await page.keyboard.press("Enter");
      await page.waitForFunction(id => (new URL(location.href).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) === id, expectedPhoto);
      // Primary dựng ở task sau cú bấm (advertising-detail R7), nên chờ photo view thay vì đọc ngay.
      await page.waitForFunction(id => document.querySelector(".advertising-photo-view")?.dataset.advertisingPhotoId === id, expectedPhoto);
      console.log(`${locale} ${detail ? "detail" : "parent"} hover/focus/Enter passed`);
    }
    await page.close();
  }
  for (const detail of [true, false]) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    });
    const query = detail ? "?category=signage-raised-letters&photo=signage-raised-letters-02&tag=product-signage-raised-letters-product-12" : "";
    await page.goto(`${baseUrl}/vi/advertising-products/${query}`, { waitUntil: "domcontentloaded" });
    // Direct-load veil chặn pointer input cho đến khi trang mount xong.
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    const selector = detail ? "[data-advertising-related-card]" : "[data-advertising-card]";
    const card = page.locator(selector).first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForFunction(selector => {
      const image = document.querySelector(selector)?.querySelector("img");
      return image?.complete && image.naturalWidth > 0;
    }, selector);
    assert.equal(await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches), false);
    assert.equal(await card.locator("img").evaluate(e => new DOMMatrixReadOnly(getComputedStyle(e).transform).a), 1);
    // Touch has no hover (owner 2026-11-10, media-card R3): a clean image, no name and no shade.
    assert.deepEqual(await card.evaluate((tile) => {
      const titles = [...tile.querySelectorAll(".advertising-tile__title")];
      const scrim = getComputedStyle(tile.querySelector(".advertising-card-media"), "::after");
      return { titles: titles.length, titleOpacity: getComputedStyle(titles[0]).opacity, scrimOpacity: scrim.opacity };
    }), { titles: 1, titleOpacity: "0", scrimOpacity: "0" },
    `mobile ${detail ? "detail" : "parent"} card shows neither its name nor the shade`);
    const expectedPhoto = await card.locator("a").evaluate(e => (new URL(e.href).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null));
    await card.locator("a").tap();
    await page.waitForFunction(id => (new URL(location.href).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) === id, expectedPhoto);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    console.log(`mobile ${detail ? "detail" : "parent"} touch opens with no hover dependency`);
    await page.close();
  }
} finally {
  await browser.close();
}
