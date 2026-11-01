import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
try {
  for (const width of [1567, 920]) {
    const page = await browser.newPage({ viewport: { width, height: 910 } });
    for (const via of ["back", "navbar", "navbar-related"]) {
      await page.goto(`${base}/vi/advertising-products/?category=bien-van-phong`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
      await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(1150));
      await page.waitForTimeout(500);
      const read = () => ({
        y: window.TruongThinhMotion.getLogicalScroll(), url: location.href,
      });
      const before = await page.evaluate(read);
      const rect = await page.evaluate(() => [...document.querySelectorAll("[data-advertising-card] > a")]
        .map(x => ({ ...x.getBoundingClientRect().toJSON(), id: x.parentElement.dataset.advertisingCard })).find(r => r.top > 110 && r.top < innerHeight - 100));
      assert(rect, "visible grid card is available");
      await page.mouse.click(rect.x + rect.width / 2, Math.min(rect.bottom - 10, rect.top + 100));
      await page.waitForTimeout(1000);
      assert(/\/p\/[^/]+\/$/.test(new URL(page.url()).pathname), "card opens detail");
      const clip = await page.locator('.advertising-photo-view__suggestion-link[aria-pressed="false"]').first()
        .evaluate(el => ({ clip: getComputedStyle(el).backgroundClip, border: getComputedStyle(el).borderTopColor }));
      assert.equal(clip.clip, "padding-box");
      assert.equal(clip.border, "rgba(0, 0, 0, 0)");
      let returnId = rect.id;
      if (via === "navbar-related") {
        const related = page.locator('[data-advertising-related-card^="office-signs-wayfinding-"] > a').first();
        returnId = await related.evaluate(el => el.parentElement.dataset.advertisingRelatedCard);
        await related.scrollIntoViewIfNeeded();
        await related.click();
        await page.waitForTimeout(900);
      }
      if (via === "back") await page.goBack();
      else await page.evaluate(() => document.querySelector('.desktop-nav a[href*="advertising-products"]').click());
      await page.waitForTimeout(900);
      const after = await page.evaluate(read);
      if (via === "back") {
        assert.equal(after.url, before.url);
        assert(Math.abs(after.y - before.y) <= 1, `${width}/${via}: ${before.y} -> ${after.y}`);
        // Skeleton R3: Back là một page state mới, nên frame Flow draw assignment mới; chỉ scroll được khôi phục.
      } else {
        assert.equal(new URL(after.url).search, new URL(before.url).search, "navbar keeps the picked group");
        const returned = await page.locator(`[data-advertising-card="${returnId}"]`).boundingBox();
        assert(returned);
        const targetTop = via === "navbar-related" ? Math.max(0, (910 - returned.height) / 2) : rect.top;
        assert(Math.abs(returned.y - targetTop) <= 2, `${width}/${via}: ${returned.y} != ${targetTop}`);
      }
      console.log(`PASS ${width}/${via}: restored target, scroll, border`);
    }
    await page.close();
  }
  // Nút quay lại (R10): góc trên trái khung primary, lùi từng entry như Back; ảnh vào thẳng về masonry nhóm.
  for (const [width, touch] of [[1440, false], [390, true]]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: touch, isMobile: touch });
    const press = () => touch ? page.locator("[data-advertising-photo-back]").tap() : page.locator("[data-advertising-photo-back]").click();
    await page.goto(`${base}/vi/advertising-products/?category=bien-van-phong`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(600));
    await page.waitForTimeout(500);
    const gridUrl = page.url();
    const gridY = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
    const card = page.locator("[data-advertising-card] > a").filter({ visible: true }).nth(1);
    const cardId = await card.evaluate(el => el.parentElement.dataset.advertisingCard);
    await card.click();
    await page.waitForTimeout(1000);
    const place = await page.evaluate(() => {
      const frame = document.querySelector(".advertising-photo-view__hero-frame").getBoundingClientRect();
      const back = document.querySelector("[data-advertising-photo-back]").getBoundingClientRect();
      return { dx: back.left - frame.left, dy: back.top - frame.top, w: back.width, label: document.querySelector("[data-advertising-photo-back]").getAttribute("aria-label") };
    });
    const inset = width > 750 ? 16 : 8;
    assert.deepEqual([Math.round(place.dx), Math.round(place.dy), place.w, place.label], [inset, inset, 36, "Quay lại"], JSON.stringify(place));
    const aUrl = page.url();
    const related = page.locator("[data-advertising-related-card] > a").first();
    await related.scrollIntoViewIfNeeded();
    await related.click();
    await page.waitForTimeout(1000);
    assert.notEqual(page.url(), aUrl, "related opens B");
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(400);
    await press();
    await page.waitForTimeout(900);
    assert.equal(page.url(), aUrl, `${width}: first press returns to A`);
    assert.equal(await page.locator("dialog#advertising-photo-dialog").evaluate(d => d.open), false, "press does not open viewer");
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(400);
    await press();
    await page.waitForTimeout(900);
    assert.equal(page.url(), gridUrl, `${width}: second press returns to masonry`);
    const y = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
    assert(Math.abs(y - gridY) <= 1, `${width}: masonry scroll ${gridY} -> ${y}`);
    assert.equal(await page.evaluate(() => document.activeElement?.parentElement?.dataset.advertisingCard), cardId, "focus on card A");
    await page.goto(aUrl, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
    await press();
    await page.waitForTimeout(900);
    assert(!/\/p\/[^/]+\/$/.test(new URL(page.url()).pathname), `${width}: direct photo leaves detail`);
    console.log(`PASS ${width}: back button place, step back, direct photo`);
    await page.close();
  }
  for (const width of [1567, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 910 } });
    let previous;
    for (let run = 0; run < 2; run++) {
      await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
      await page.waitForTimeout(1600);
      await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(document.documentElement.scrollHeight));
      await page.waitForTimeout(700);
      const geometry = await page.evaluate(() => {
        const copy = document.querySelector("[data-advertising-grid-ta], [data-advertising-grid-cta] .detail-cta__copy").getBoundingClientRect();
        const footer = document.querySelector("footer").getBoundingClientRect();
        const skeleton = document.querySelector(".advertising-grid__cta-skeleton").getBoundingClientRect();
        const section = document.querySelector(".project-index:has(.advertising-grid__cta-skeleton)");
        const tint = section.querySelector(":scope > .glass-surface .glass-surface__tint");
        return { copy: copy.toJSON(), footer: footer.toJSON(), edge: skeleton.bottom,
          overlap: section.getBoundingClientRect().top + parseFloat(tint.style.top) + parseFloat(tint.style.height) - skeleton.bottom };
      });
      assert(geometry.copy.top >= 0 && geometry.copy.bottom < geometry.footer.top, JSON.stringify(geometry));
      assert(geometry.footer.bottom <= 911 && geometry.footer.top >= 0, JSON.stringify(geometry));
      assert(geometry.overlap >= 1.9, "white cover overlaps the clipped skeleton edge");
      if (previous) assert(Math.abs(previous.copy.top - geometry.copy.top) <= 1, "CTA stays fixed across random batches");
      previous = geometry;
      const png = await page.screenshot();
      const pixels = await page.evaluate(async ({ data, edge }) => {
        const bitmap = await createImageBitmap(await (await fetch(data)).blob());
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext("2d"); ctx.drawImage(bitmap, 0, 0);
        // Đường trên của footer (glass-surface R2) có thể rơi vào hàng biên, nên kiểm các hàng phía trên.
        return [0.1, 0.35, 0.65, 0.9].flatMap(fraction => [-2, -1].map(offset =>
          [...ctx.getImageData(Math.floor(bitmap.width * fraction), Math.floor(edge) + offset, 1, 1).data].slice(0, 3)));
      }, { data: `data:image/png;base64,${png.toString("base64")}`, edge: geometry.edge });
      assert(pixels.every(rgb => rgb.every(channel => channel >= 253)), JSON.stringify(pixels));
    }
    console.log(`PASS ${width}: CTA/footer fit, stable reload position, white skeleton edge`);
    await page.close();
  }
  // Back khi Worker còn tính geometry grid sau lần vào thẳng ?photo=, rồi resize: grid theo bề rộng mới như lần tải mới.
  {
    const columns = () => {
      const grid = document.querySelector("[data-project-grid]").getBoundingClientRect();
      const cards = [...document.querySelectorAll("[data-advertising-card]:not([hidden])")]
        .map((node) => node.getBoundingClientRect()).filter((rect) => rect.width);
      return { columns: new Set(cards.map((rect) => Math.round(rect.left))).size, gridWidth: grid.width };
    };
    const page = await browser.newPage({ viewport: { width: 1329, height: 912 } });
    await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "networkidle" });
    const hero = await page.$eval("[data-advertising-card]", (node) => node.dataset.advertisingCard);
    // Hoãn mọi message gửi Worker 3 s: lượt prewarm grid sau detail còn chạy lúc bấm navbar.
    await page.addInitScript(() => {
      const post = Worker.prototype.postMessage;
      Worker.prototype.postMessage = function (...args) { setTimeout(() => post.apply(this, args), 3000); };
    });
    await page.goto(`${base}/vi/advertising-products/?photo=${hero}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingDetailReady === "true",
      null, { timeout: 30000 });
    await page.evaluate(() => document.querySelector('.desktop-nav a[href*="advertising-products"]').click());
    await page.waitForTimeout(300);
    await page.setViewportSize({ width: 800, height: 900 });
    const fresh = await browser.newPage({ viewport: { width: 800, height: 900 } });
    await fresh.goto(`${base}/vi/advertising-products/`, { waitUntil: "networkidle" });
    await fresh.waitForTimeout(900);
    const expected = await fresh.evaluate(columns);
    // Card trượt 0.4s tới layout mới (chậm hơn khi máy bận); bản lỗi kẹt layout cũ cả sau khi Worker trả kết quả.
    let returned;
    for (const until = Date.now() + 5000; Date.now() < until;) {
      returned = await page.evaluate(columns);
      if (returned.columns === expected.columns) break;
      await page.waitForTimeout(150);
    }
    assert.equal(returned.columns, expected.columns, `resize sau Back khi Worker còn tính: ${JSON.stringify({ returned, expected })}`);
    // shortcut: chưa kiểm bề rộng từng card; ca này có lúc để một card giữ bề rộng cũ, cả trên main (đã báo điều phối),
    // thêm khi bug đó được sửa.
    console.log(`PASS direct photo, Back while grid Worker pending, resize: ${returned.columns} columns`);
    await Promise.all([page.close(), fresh.close()]);
  }
} finally {
  await browser.close();
}
