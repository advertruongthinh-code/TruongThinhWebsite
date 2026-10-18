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
      await page.mouse.move(0, 0);
      await page.keyboard.press("Tab");
      await card.locator("a").focus();
      await page.waitForTimeout(700);
      assert.equal(await mediaScale(), 1, "Keyboard focus keeps media still");
      assert.notEqual(await card.locator("a").evaluate(e => getComputedStyle(e).outlineStyle), "none");
      const expectedPhoto = await card.locator("a").evaluate(e => new URL(e.href).searchParams.get("photo"));
      await page.keyboard.press("Enter");
      await page.waitForFunction(id => new URL(location.href).searchParams.get("photo") === id, expectedPhoto);
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
    const expectedPhoto = await card.locator("a").evaluate(e => new URL(e.href).searchParams.get("photo"));
    await card.locator("a").tap();
    await page.waitForFunction(id => new URL(location.href).searchParams.get("photo") === id, expectedPhoto);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    console.log(`mobile ${detail ? "detail" : "parent"} touch opens with no hover dependency`);
    await page.close();
  }
} finally {
  await browser.close();
}
