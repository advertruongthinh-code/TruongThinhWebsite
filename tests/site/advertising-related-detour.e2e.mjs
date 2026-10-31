// Card related không đi qua primary khi xếp lại (advertising-related-cta-motion R3).
// Lấy mẫu rect mỗi frame lúc bật, tắt tag suggestion và resize; hero chọn từ masonry lúc chạy.
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
const heroLimit = Number(process.env.DETOUR_HEROES || 12);

// Ghi rect primary và mọi card related mỗi frame trong `duration` ms; trả số frame có giao và số card đi vòng.
const sampleMotion = (page, duration) => page.evaluate((ms) => new Promise((resolve) => {
  const primary = document.querySelector(".advertising-photo-view__primary");
  const nodes = () => document.querySelectorAll("[data-advertising-related-card]:not([hidden]), [data-advertising-suggestion-card]:not([hidden])");
  const overlaps = [];
  let detours = 0;
  const start = performance.now();
  const tick = () => {
    const p = primary.getBoundingClientRect();
    for (const node of nodes()) {
      if (!node.closest("[data-advertising-photo-related-grid]")) continue;
      if (node.getAnimations().some((animation) => animation.effect?.getKeyframes?.()[0]?.translate)) detours += 1;
      const r = node.getBoundingClientRect();
      const x = Math.min(r.right, p.right) - Math.max(r.left, p.left);
      const y = Math.min(r.bottom, p.bottom) - Math.max(r.top, p.top);
      if (x > 0.5 && y > 0.5) overlaps.push({ id: node.dataset.advertisingRelatedItem, x, y });
    }
    if (performance.now() - start < ms) requestAnimationFrame(tick);
    else resolve({ overlaps, detours });
  };
  requestAnimationFrame(tick);
}), duration);

const openDetail = async (page, locale, hero) => {
  await page.goto(`${baseUrl}/${locale}/advertising-products/?photo=${hero}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingDetailReady === "true"
    && !document.documentElement.classList.contains("route-enter") && !document.body.classList.contains("is-transitioning"),
  null, { timeout: 20000 });
  await page.waitForTimeout(500);
};

const settledInPlace = (page) => page.evaluate(() => [...document.querySelectorAll("[data-advertising-related-card]:not([hidden])")]
  .every((node) => !node.getAnimations().some((animation) => animation.effect?.getKeyframes?.()[0]?.translate)));

const browser = await chromium.launch({ headless: true });
try {
  const probe = await browser.newPage({ viewport: { width: 1569, height: 912 } });
  await probe.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
  await probe.waitForSelector("[data-advertising-card]");
  const heroes = (await probe.$$eval("[data-advertising-card]", (nodes) => nodes.map((node) => node.dataset.advertisingCard))).slice(0, heroLimit);
  await probe.close();
  assert.ok(heroes.length, "masonry không có card");

  let totalDetours = 0;
  const errors = [];
  for (const [index, hero] of heroes.entries()) {
    const locale = index % 2 ? "en" : "vi";
    const page = await browser.newPage({ viewport: { width: 1569, height: 912 } });
    page.on("pageerror", (error) => errors.push(`${hero}: ${error.message}`));
    await openDetail(page, locale, hero);
    const tags = await page.$$eval("[data-advertising-suggestion-tag]", (nodes) => nodes.map((node) => node.dataset.advertisingSuggestionTag));
    for (const tag of tags.slice(0, 3)) {
      for (let pass = 0; pass < 2; pass++) {
        const sampled = sampleMotion(page, 600);
        await page.locator(`[data-advertising-suggestion-tag="${tag}"]`).click();
        const { overlaps, detours } = await sampled;
        assert.deepEqual(overlaps, [], `${hero} tag ${tag}: card giao primary`);
        totalDetours += detours ? 1 : 0;
      }
    }
    for (const width of [1100, 1569]) {
      const sampled = sampleMotion(page, 700);
      await page.setViewportSize({ width, height: 912 });
      const { overlaps, detours } = await sampled;
      assert.deepEqual(overlaps, [], `${hero} resize ${width}: card giao primary`);
      totalDetours += detours ? 1 : 0;
    }
    await page.waitForTimeout(200);
    assert.ok(await settledInPlace(page), `${hero}: còn animation translate sau khi xếp xong`);
    await page.close();
  }
  assert.ok(totalDetours > 0, "không ca nào đi vòng: tăng DETOUR_HEROES hoặc kiểm runtime");

  // Phone 384px: primary hết cột (pinterest), không có đường vòng nhưng vẫn không giao.
  const phone = await browser.newPage({ viewport: { width: 384, height: 854 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await openDetail(phone, "vi", heroes[0]);
  const tag = await phone.$eval("[data-advertising-suggestion-tag]", (node) => node.dataset.advertisingSuggestionTag).catch(() => null);
  if (tag) {
    const sampled = sampleMotion(phone, 600);
    await phone.locator(`[data-advertising-suggestion-tag="${tag}"]`).tap();
    assert.deepEqual((await sampled).overlaps, [], "phone: card giao primary");
  }
  await phone.close();

  // Giảm chuyển động: không có animation translate.
  const reduced = await browser.newPage({ viewport: { width: 1569, height: 912 }, reducedMotion: "reduce" });
  await openDetail(reduced, "vi", heroes[0]);
  const reducedTag = await reduced.$eval("[data-advertising-suggestion-tag]", (node) => node.dataset.advertisingSuggestionTag).catch(() => null);
  if (reducedTag) {
    const sampled = sampleMotion(reduced, 300);
    await reduced.locator(`[data-advertising-suggestion-tag="${reducedTag}"]`).click();
    const { overlaps, detours } = await sampled;
    assert.deepEqual(overlaps, []);
    assert.equal(detours, 0, "reduced motion vẫn chạy đường vòng");
  }
  await reduced.close();
  assert.deepEqual(errors, []);
  console.log(`related detour: ${heroes.length} hero, ${totalDetours} lượt có đường vòng, không frame nào giao primary`);
} finally {
  await browser.close();
}
