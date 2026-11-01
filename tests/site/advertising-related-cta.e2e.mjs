// CTA cuối masonry ở cuối related của detail (advertising-cta-center-parallax R9). Hero chọn từ masonry lúc chạy.
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const { planDetourPath } = await import("../../src/site/advertising-products/detour-path.mjs");
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
    arc: (() => { const glass = document.querySelector('.glass-surface[data-glass-shape="arc"]');
      return glass && !glass.hidden ? glass.getBoundingClientRect().width : 0; })(),
    viewportWidth: document.documentElement.clientWidth,
  };
});

// Đưa tag lên viewport, bấm, lấy mẫu mỗi frame 900ms. Trả khung giao primary, số khung có animation translate,
// số khung đi vòng (3 keyframe), đường đi của từng khung, và số card related còn lại.
const toggleTag = async (page, tag) => {
  await page.evaluate(() => window.TruongThinhMotion?.setLogicalScroll?.(0) || window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await page.evaluate(() => new Promise((started) => {
    const primary = document.querySelector("[data-advertising-photo-primary]");
    const frames = () => [...document.querySelectorAll("[data-advertising-cta-frame]")];
    const box = (node) => node.getBoundingClientRect();
    const p0 = box(primary);
    const before = new Map(frames().map((frame) => [frame, box(frame)]));
    const state = { overlaps: [], slid: new Set(), detoured: new Set(), done: false };
    window.__ctaSample = state;
    const begin = performance.now();
    let first = true;
    const tick = () => {
      const p = box(primary);
      for (const frame of frames()) {
        const r = box(frame);
        const x = Math.min(r.right, p.right) - Math.max(r.left, p.left);
        const y = Math.min(r.bottom, p.bottom) - Math.max(r.top, p.top);
        if (x > 0.5 && y > 0.5) state.overlaps.push({ slot: frame.dataset.advertisingCtaFrame, x, y });
        for (const animation of frame.getAnimations()) {
          const keyframes = animation.effect?.getKeyframes?.() || [];
          if (!keyframes[0]?.translate) continue;
          state.slid.add(frame);
          if (keyframes.length === 3) state.detoured.add(frame);
        }
      }
      if (first) { first = false; started(); }
      if (performance.now() - begin < 900) requestAnimationFrame(tick);
      else {
        const p1 = box(primary);
        // Đường đi của từng khung, tính từ góc primary, để Node kiểm bằng slab test xem khung nào phải đi vòng.
        state.moves = [...before].filter(([frame]) => frame.isConnected).map(([frame, r]) => {
          const a = box(frame);
          return { from: { x: r.left - p0.left, y: r.top - p0.top }, to: { x: a.left - p1.left, y: a.top - p1.top },
            size: { width: Math.max(r.width, a.width), height: Math.max(r.height, a.height) },
            zone: { width: p1.width, height: p1.height }, detoured: state.detoured.has(frame) };
        });
        state.overlaps = state.overlaps.slice(0, 5);
        state.slid = state.slid.size;
        state.detoured = state.detoured.size;
        state.related = document.querySelectorAll("[data-advertising-related-card]:not([hidden])").length;
        state.done = true;
      }
    };
    requestAnimationFrame(tick);
  }));
  await page.locator(`[data-advertising-suggestion-tag="${tag}"]`).dispatchEvent("click");
  await page.waitForFunction(() => window.__ctaSample?.done, null, { timeout: 5000 });
  return page.evaluate(() => window.__ctaSample);
};

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
    assert.ok(Math.abs(end.arc - end.viewportWidth) <= 1, `${label}: Kính cung không trải hết viewport ${end.arc}/${end.viewportWidth}`);
    assert.ok(Math.abs(end.batchBottom - end.footerTop) <= 1.5, `${label}: đáy batch không sát footer ${JSON.stringify(end)}`);
    assert.ok(Math.abs(end.batchBottom - end.ctaBottom) <= 1.5, `${label}: đáy batch khác đáy CTA ${JSON.stringify(end)}`);
    assert.ok(Math.abs(end.parallax) <= 0.5, `${label}: parallax chưa về 0 ở cuối trang`);
    const shortWindow = Math.abs(end.ctaBottom - end.linkBottom - end.gap) <= 1;
    assert.ok(shortWindow || Math.abs(end.baseline - end.viewportHeight / 2) <= 1, `${label}: chân chữ lệch giữa viewport ${JSON.stringify(end)}`);
    assert.ok(end.ctaTop >= end.primaryBottom - 1, `${label}: CTA chồng primary`);

    // Bật tag: khung batch trượt cùng related, không khung nào giao primary (R9, R10).
    const tag = await page.$eval("[data-advertising-suggestion-tag]", (node) => node.dataset.advertisingSuggestionTag).catch(() => null);
    if (tag) {
      const sample = await toggleTag(page, tag);
      assert.deepEqual(sample.overlaps, [], `${label}: khung batch giao primary khi đổi tag`);
      assert.ok(sample.slid > 0, `${label}: đổi tag mà không khung batch nào trượt ${JSON.stringify(sample)}`);
      const after = await measureEnd(page);
      assert.ok(Math.abs(after.batchBottom - after.footerTop) <= 1.5, `${label}: sau đổi tag đáy batch lệch footer`);
      assert.ok(Math.abs(after.batchBottom - after.ctaBottom) <= 1.5, `${label}: sau đổi tag chiều cao canvas lệch CTA`);
      console.log(`${label}: tag ${tag}, ${sample.slid} khung trượt, ${sample.detoured} khung đi vòng`);
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

  // Tìm ca khung batch có đường thẳng cắt primary: phải đi vòng (R10). Gặp related rỗng thì CTA ngay dưới primary.
  const heroes = await (async () => {
    const list = await browser.newPage({ viewport: { width: 1569, height: 912 } });
    await list.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
    await list.waitForSelector("[data-advertising-card]");
    const ids = await list.$$eval("[data-advertising-card]", (nodes) => nodes.map((node) => node.dataset.advertisingCard));
    await list.close();
    return ids.slice(0, Number(process.env.CTA_DETOUR_HEROES || 10));
  })();
  let detourCase = null;
  let emptyCase = null;
  for (const hero of heroes) {
    if (detourCase && emptyCase) break;
    const search = await browser.newPage({ viewport: { width: 1569, height: 912 } });
    search.on("pageerror", (error) => errors.push(`${hero}: ${error.message}`));
    await search.goto(`${baseUrl}/vi/advertising-products/?photo=${hero}`, { waitUntil: "domcontentloaded" });
    await ready(search);
    const tags = await search.$$eval("[data-advertising-suggestion-tag]", (nodes) => nodes.map((node) => node.dataset.advertisingSuggestionTag));
    for (const searchTag of tags.slice(0, 4)) {
      for (let pass = 0; pass < 2; pass++) {
        const sample = await toggleTag(search, searchTag);
        assert.deepEqual(sample.overlaps, [], `${hero} tag ${searchTag}: khung batch giao primary`);
        const needs = sample.moves.filter((move) => planDetourPath(move));
        assert.deepEqual(needs.filter((move) => !move.detoured), [], `${hero} tag ${searchTag}: khung cắt primary mà không đi vòng`);
        if (needs.length && !detourCase) detourCase = `${hero} ${searchTag}`;
        if (!sample.related && !emptyCase) {
          const end = await measureEnd(search);
          assert.ok(end.frames > 0 && end.ctaTop >= end.primaryBottom - 1, `${hero} tag ${searchTag}: related rỗng mà CTA sai chỗ`);
          assert.ok(Math.abs(end.batchBottom - end.footerTop) <= 1.5, `${hero} tag ${searchTag}: related rỗng, đáy batch lệch footer`);
          emptyCase = `${hero} ${searchTag}`;
        }
      }
    }
    await search.close();
  }
  assert.ok(detourCase, `không ca nào trong ${heroes.length} hero có khung batch cần đi vòng primary`);
  console.log(`khung batch đi vòng: ${detourCase}; related rỗng: ${emptyCase || "không gặp"}`);

  // Giảm chuyển động: đổi tag đặt khung thẳng, CTA vẫn sát footer.
  const reduced = await browser.newPage({ viewport: { width: 1569, height: 912 }, reducedMotion: "reduce" });
  await reduced.goto(`${baseUrl}/vi/advertising-products/?photo=${hero}`, { waitUntil: "domcontentloaded" });
  await ready(reduced);
  const reducedTag = await reduced.$eval("[data-advertising-suggestion-tag]", (node) => node.dataset.advertisingSuggestionTag).catch(() => null);
  if (reducedTag) {
    const sample = await toggleTag(reduced, reducedTag);
    assert.equal(sample.slid, 0, "reduced motion vẫn trượt khung batch");
    const end = await measureEnd(reduced);
    assert.ok(Math.abs(end.batchBottom - end.footerTop) <= 1.5, "reduced motion: đáy batch lệch footer");
  }
  await reduced.close();
  assert.deepEqual(errors, []);
  console.log("related CTA: detail và masonry dùng chung một CTA");
} finally {
  await browser.close();
}
