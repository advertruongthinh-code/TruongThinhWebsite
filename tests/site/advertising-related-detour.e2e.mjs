// Card related không đi qua primary khi xếp lại (advertising-cta-center-parallax R10).
// Lấy mẫu rect mỗi frame lúc bật, tắt tag suggestion và resize 1569 -> 820 -> 1569; hero chọn từ masonry lúc chạy.
// Test phải gặp ít nhất một ca card từ cột cạnh primary xuống dưới primary có chạy đường vòng, không thì fail.
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
const heroLimit = Number(process.env.DETOUR_HEROES || 10);
const detourTarget = 3;

const CARDS = "[data-advertising-related-card]:not([hidden]), [data-advertising-suggestion-card]:not([hidden])";

// Bắt đầu lấy mẫu; resolve sau frame rAF đầu để thao tác không ăn vào cửa sổ đo.
// Lấy mẫu tới khi hết animation "related-detour" và Masonry đứng yên, trần `cap` ms.
const startSampler = (page, cap) => page.evaluate(({ cap, cards }) => new Promise((started) => {
  const primary = document.querySelector(".advertising-photo-view__primary");
  const grid = document.querySelector("[data-advertising-photo-related-grid]");
  const nodes = () => [...document.querySelectorAll(cards)].filter((node) => node.closest("[data-advertising-photo-related-grid]"));
  const box = (node) => { const r = node.getBoundingClientRect(); return { x: r.left, y: r.top, right: r.right, bottom: r.bottom }; };
  const snapshot = () => Object.fromEntries(nodes().map((node) => [node.dataset.advertisingRelatedItem || "suggestion", box(node)]));
  const state = { primary: Boolean(primary && grid), overlaps: [], detours: 0, sampled: 0, before: primary ? snapshot() : {}, primaryBefore: primary && box(primary), done: false };
  window.__detourSample = state;
  if (!state.primary) { state.done = true; started(); return; }
  const start = performance.now();
  let frames = 0;
  let still = 0;
  const tick = () => {
    const p = primary.getBoundingClientRect();
    let moving = false;
    for (const node of nodes()) {
      state.sampled += 1;
      const animations = node.getAnimations();
      if (animations.some((animation) => animation.id === "related-detour")) { state.detours += 1; moving = true; }
      if (animations.length || node.style.transition) moving = true;
      const r = node.getBoundingClientRect();
      const x = Math.min(r.right, p.right) - Math.max(r.left, p.left);
      const y = Math.min(r.bottom, p.bottom) - Math.max(r.top, p.top);
      if (x > 0.5 && y > 0.5) state.overlaps.push({ id: node.dataset.advertisingRelatedItem, x, y });
    }
    frames += 1;
    if (frames === 1) started();
    still = moving ? 0 : still + 1;
    // Chờ ít nhất 6 frame để thao tác kịp kích hoạt motion, rồi dừng khi đứng yên 6 frame liền.
    if (performance.now() - start < cap && (frames < 12 || still < 6)) requestAnimationFrame(tick);
    else { state.after = snapshot(); state.primaryAfter = box(primary); state.done = true; }
  };
  requestAnimationFrame(tick);
}), { cap, cards: CARDS });

const collect = async (page) => {
  await page.waitForFunction(() => window.__detourSample?.done, null, { timeout: 5000 });
  return page.evaluate(() => window.__detourSample);
};

// Số card đi từ cột cạnh primary (trái >= mép phải primary) xuống dưới primary (trên >= đáy primary).
const besideToBelow = ({ before, after, primaryBefore, primaryAfter }) => Object.keys(after || {}).filter((id) =>
  before[id] && before[id].x >= primaryBefore.right - 1 && after[id].y >= primaryAfter.bottom - 1).length;

const openDetail = async (page, locale, hero) => {
  await page.goto(`${baseUrl}/${locale}/advertising-products/?photo=${hero}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingDetailReady === "true"
    && !document.documentElement.classList.contains("route-enter") && !document.body.classList.contains("is-transitioning"),
  null, { timeout: 20000 });
  await page.waitForTimeout(500);
};

// Sau khi xếp xong mọi card nằm đúng left/top inline của Masonry (sai số 1px) và không còn animation đi vòng.
const assertSettled = async (page, label) => {
  await page.waitForTimeout(500);
  const wrong = await page.evaluate((cards) => {
    const grid = document.querySelector("[data-advertising-photo-related-grid]");
    const origin = grid.getBoundingClientRect();
    return [...document.querySelectorAll(cards)].filter((node) => grid.contains(node)).flatMap((node) => {
      const r = node.getBoundingClientRect();
      const dx = r.left - origin.left - grid.clientLeft - Number.parseFloat(node.style.left || 0);
      const dy = r.top - origin.top - grid.clientTop - Number.parseFloat(node.style.top || 0);
      const detour = node.getAnimations().some((animation) => animation.id === "related-detour");
      return Math.abs(dx) > 1 || Math.abs(dy) > 1 || detour ? [{ id: node.dataset.advertisingRelatedItem, dx, dy, detour }] : [];
    });
  }, CARDS);
  assert.deepEqual(wrong, [], `${label}: card chưa về đúng placement`);
};

const browser = await chromium.launch({ headless: true });
try {
  const probe = await browser.newPage({ viewport: { width: 1569, height: 912 } });
  await probe.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
  await probe.waitForSelector("[data-advertising-card]");
  const heroes = (await probe.$$eval("[data-advertising-card]", (nodes) => nodes.map((node) => node.dataset.advertisingCard))).slice(0, heroLimit);
  await probe.close();
  assert.ok(heroes.length, "masonry không có card");

  const detourHeroes = [];
  const errors = [];
  for (const [index, hero] of heroes.entries()) {
    if (detourHeroes.length >= detourTarget) break;
    const locale = index % 2 ? "en" : "vi";
    const page = await browser.newPage({ viewport: { width: 1569, height: 912 } });
    page.on("pageerror", (error) => errors.push(`${hero}: ${error.message}`));
    await openDetail(page, locale, hero);
    const tags = await page.$$eval("[data-advertising-suggestion-tag]", (nodes) => nodes.map((node) => node.dataset.advertisingSuggestionTag));
    let heroDetour = false;
    for (const tag of tags.slice(0, 3)) {
      for (let pass = 0; pass < 2; pass++) {
        await startSampler(page, 1500);
        await page.locator(`[data-advertising-suggestion-tag="${tag}"]`).click();
        const sample = await collect(page);
        const label = `${hero} tag ${tag} lượt ${pass + 1}`;
        assert.ok(sample.primary, `${label}: không thấy primary hoặc related grid`);
        assert.ok(sample.sampled > 0, `${label}: không lấy mẫu được card nào`);
        assert.deepEqual(sample.overlaps, [], `${label}: card giao primary`);
        if (besideToBelow(sample) && sample.detours) heroDetour = true;
        await assertSettled(page, label);
      }
    }
    for (const width of [820, 1569]) {
      await startSampler(page, 1500);
      await page.setViewportSize({ width, height: 912 });
      const sample = await collect(page);
      assert.deepEqual(sample.overlaps, [], `${hero} resize ${width}: card giao primary`);
      await assertSettled(page, `${hero} resize ${width}`);
    }
    if (heroDetour) detourHeroes.push(hero);
    await page.close();
  }
  assert.ok(detourHeroes.length, `không hero nào trong ${heroes.length} hero có card từ cột cạnh primary xuống dưới primary chạy đường vòng`);

  // Phone 384px: primary hết cột (pinterest), không có đường vòng nhưng vẫn không giao.
  const phone = await browser.newPage({ viewport: { width: 384, height: 854 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await openDetail(phone, "vi", heroes[0]);
  const tag = await phone.$eval("[data-advertising-suggestion-tag]", (node) => node.dataset.advertisingSuggestionTag).catch(() => null);
  if (tag) {
    await startSampler(phone, 1500);
    await phone.locator(`[data-advertising-suggestion-tag="${tag}"]`).tap();
    assert.deepEqual((await collect(phone)).overlaps, [], "phone: card giao primary");
  }
  await phone.close();

  // Giảm chuyển động: không có animation đi vòng.
  const reduced = await browser.newPage({ viewport: { width: 1569, height: 912 }, reducedMotion: "reduce" });
  await openDetail(reduced, "vi", heroes[0]);
  const reducedTag = await reduced.$eval("[data-advertising-suggestion-tag]", (node) => node.dataset.advertisingSuggestionTag).catch(() => null);
  if (reducedTag) {
    await startSampler(reduced, 600);
    await reduced.locator(`[data-advertising-suggestion-tag="${reducedTag}"]`).click();
    const { overlaps, detours } = await collect(reduced);
    assert.deepEqual(overlaps, []);
    assert.equal(detours, 0, "reduced motion vẫn chạy đường vòng");
  }
  await reduced.close();
  assert.deepEqual(errors, []);
  console.log(`related detour: ${detourHeroes.length} hero có ca cột cạnh xuống dưới primary (${detourHeroes.join(", ")}), không frame nào giao primary`);
} finally {
  await browser.close();
}
