// CTA cuối masonry ở cuối related của detail (advertising-cta-center-parallax R9). Hero chọn từ masonry lúc chạy.
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";

const ready = (page) => page.waitForFunction(() => document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingDetailReady === "true"
  && !document.documentElement.classList.contains("route-enter") && !document.body.classList.contains("is-transitioning"),
null, { timeout: 20000 });

// Cuộn tới cuối, chờ reveal và parallax về 0, đo chân chữ dòng cuối như advertising-continuation.
const measureEnd = (page) => page.evaluate(async () => {
  const motion = window.TruongThinhMotion;
  const lastScroll = document.documentElement.scrollHeight - innerHeight;
  if (!motion?.setLogicalScroll?.(lastScroll)) window.scrollTo(0, lastScroll);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const heading = document.querySelector("[data-advertising-grid-cta] h2");
  const fontSize = Number.parseFloat(getComputedStyle(heading).fontSize);
  const lines = [...heading.querySelectorAll(".motion-line")];
  for (let wait = 0; wait < 40 && lines.some((line) =>
    Math.abs(new DOMMatrixReadOnly(getComputedStyle(line).transform).m42 + 0.1 * fontSize) > 0.5); wait += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const lastLine = lines.at(-1) || [...heading.querySelectorAll("[data-motion-line-source]")].at(-1);
  const leaf = [...lastLine.querySelectorAll("*")].filter((node) => !node.children.length).at(-1) || lastLine;
  const probe = document.createElement("span");
  probe.style.cssText = "display: inline-block; width: 0; height: 0;";
  leaf.append(probe);
  const baseline = probe.getBoundingClientRect().top;
  probe.remove();
  const batch = document.querySelector("[data-advertising-cta-skeleton]");
  const cta = document.querySelector("[data-advertising-grid-cta]");
  const footer = document.querySelector("footer.site-footer").getBoundingClientRect();
  const link = cta.querySelector(".detail-cta__copy a").getBoundingClientRect();
  const primary = document.querySelector(".advertising-photo-view__primary").getBoundingClientRect();
  return {
    host: batch.dataset.advertisingCtaHost,
    inCanvas: Boolean(cta.closest("[data-advertising-photo-canvas]")),
    frames: batch.querySelectorAll("[data-advertising-cta-frame]").length,
    batchBottom: batch.getBoundingClientRect().bottom,
    ctaTop: cta.getBoundingClientRect().top,
    ctaBottom: cta.getBoundingClientRect().bottom,
    footerTop: footer.top,
    linkBottom: link.bottom,
    baseline, viewportHeight: innerHeight,
    primaryBottom: primary.bottom,
    infoCta: Boolean(document.querySelector("[data-advertising-photo-cta]")?.getClientRects().length),
    parallax: new DOMMatrixReadOnly(getComputedStyle(cta.querySelector(".detail-cta__copy")).transform).m42,
    gap: Number.parseFloat(getComputedStyle(document.querySelector("[data-advertising-photo-view]")).getPropertyValue("--advertising-photo-gap")),
    relatedCards: document.querySelectorAll("[data-advertising-related-card]:not([hidden])").length,
  };
});

const browser = await chromium.launch({ headless: true });
try {
  const probe = await browser.newPage({ viewport: { width: 1569, height: 912 } });
  await probe.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
  await probe.waitForSelector("[data-advertising-card]");
  const hero = await probe.$eval("[data-advertising-card]", (node) => node.dataset.advertisingCard);
  await probe.close();
  const errors = [];
  for (const [locale, viewport] of [["vi", { width: 1569, height: 912 }], ["en", { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport, ...(viewport.width < 500 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
    page.on("pageerror", (error) => errors.push(`${locale}: ${error.message}`));
    await page.goto(`${baseUrl}/${locale}/advertising-products/?photo=${hero}`, { waitUntil: "domcontentloaded" });
    await ready(page);
    const end = await measureEnd(page);
    const label = `${locale} ${viewport.width}x${viewport.height}`;
    assert.equal(end.host, "detail", `${label}: batch chưa chuyển sang detail`);
    assert.ok(end.inCanvas, `${label}: CTA không nằm trong canvas detail`);
    assert.ok(end.frames > 0, `${label}: batch không có khung`);
    assert.ok(end.infoCta, `${label}: mất nút CTA trong info primary`);
    assert.ok(Math.abs(end.batchBottom - end.footerTop) <= 1.5, `${label}: đáy batch không sát footer ${JSON.stringify(end)}`);
    assert.ok(Math.abs(end.batchBottom - end.ctaBottom) <= 1.5, `${label}: đáy batch khác đáy CTA ${JSON.stringify(end)}`);
    assert.ok(Math.abs(end.parallax) <= 0.5, `${label}: parallax chưa về 0 ở cuối trang`);
    const shortWindow = Math.abs(end.ctaBottom - end.linkBottom - end.gap) <= 1;
    assert.ok(shortWindow || Math.abs(end.baseline - end.viewportHeight / 2) <= 1, `${label}: chân chữ lệch giữa viewport ${JSON.stringify(end)}`);
    assert.ok(end.ctaTop >= end.primaryBottom - 1, `${label}: CTA chồng primary`);

    // Bật tag: CTA trượt cùng related.
    const tag = await page.$eval("[data-advertising-suggestion-tag]", (node) => node.dataset.advertisingSuggestionTag).catch(() => null);
    if (tag) {
      await page.evaluate(() => window.TruongThinhMotion?.setLogicalScroll?.(0) || window.scrollTo(0, 0));
      await page.waitForTimeout(800);
      // Lấy mẫu khung batch mỗi frame trong 700ms: không khung nào giao primary (R10).
      const sampled = page.evaluate(() => new Promise((resolve) => {
        const primary = document.querySelector("[data-advertising-photo-primary]");
        const overlaps = [];
        let sliding = 0;
        const start = performance.now();
        const tick = () => {
          const p = primary.getBoundingClientRect();
          sliding = Math.max(sliding, document.querySelector("[data-advertising-grid-cta]").getAnimations().length);
          for (const frame of document.querySelectorAll("[data-advertising-cta-frame]")) {
            const r = frame.getBoundingClientRect();
            const x = Math.min(r.right, p.right) - Math.max(r.left, p.left);
            const y = Math.min(r.bottom, p.bottom) - Math.max(r.top, p.top);
            if (x > 0.5 && y > 0.5) overlaps.push({ slot: frame.dataset.advertisingCtaFrame, x, y });
          }
          if (performance.now() - start < 700) requestAnimationFrame(tick);
          else resolve({ overlaps, sliding });
        };
        requestAnimationFrame(tick);
      }));
      await page.locator(`[data-advertising-suggestion-tag="${tag}"]`).dispatchEvent("click");
      const { overlaps, sliding } = await sampled;
      assert.deepEqual(overlaps, [], `${label}: khung batch giao primary khi đổi tag`);
      const after = await measureEnd(page);
      assert.ok(Math.abs(after.batchBottom - after.footerTop) <= 1.5, `${label}: sau đổi tag đáy batch lệch footer`);
      console.log(`${label}: tag ${tag}, CTA animation lúc đổi: ${sliding}`);
    }

    // Back về masonry: CTA về grid.
    await page.goto(`${baseUrl}/${locale}/advertising-products/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-advertising-cta-skeleton][data-advertising-cta-ready]");
    const grid = await page.evaluate(() => ({
      inGrid: Boolean(document.querySelector("[data-project-grid] [data-advertising-cta-skeleton]")),
      ctaInIndex: Boolean(document.querySelector(".project-index [data-advertising-grid-cta]")),
    }));
    assert.ok(grid.inGrid && grid.ctaInIndex, `${label}: CTA không ở grid khi duyệt masonry`);
    console.log(`${label}: ${end.relatedCards} card related, ${end.frames} khung batch, chân chữ ${(end.baseline - end.viewportHeight / 2).toFixed(2)}px`);
    await page.close();
  }

  // Mở detail từ masonry rồi Back trong cùng trang: host đổi qua lại.
  const page = await browser.newPage({ viewport: { width: 1569, height: 912 } });
  page.on("pageerror", (error) => errors.push(`soft: ${error.message}`));
  await page.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-advertising-card] a");
  await page.waitForTimeout(800);
  await page.locator("[data-advertising-card] a").first().click();
  await ready(page);
  assert.equal(await page.getAttribute("[data-advertising-cta-skeleton]", "data-advertising-cta-host"), "detail");
  await page.goBack();
  await page.waitForFunction(() => document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaHost === "grid"
    && document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaReady === "true", null, { timeout: 10000 });
  const gridHeight = await page.evaluate(() => {
    const grid = document.querySelector("[data-project-grid]").getBoundingClientRect();
    const cta = document.querySelector("[data-advertising-grid-cta]").getBoundingClientRect();
    return Math.abs(grid.bottom - cta.bottom);
  });
  assert.ok(gridHeight <= 1.5, "Back: chiều cao grid khác đáy CTA");
  await page.close();
  assert.deepEqual(errors, []);
  console.log("related CTA: detail và masonry dùng chung một CTA");
} finally {
  await browser.close();
}
