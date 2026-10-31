// Card chờ ảnh khi mạng chậm (progressive-loading R9): ảnh tự mờ thay skeleton Flow; ảnh card bị giữ 8s như Slow 3G.
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/advertising-skeleton-slow-network.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const DELAY = 8000;
const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const open = async (device) => {
  const context = await browser.newContext(device);
  const page = await context.newPage();
  const slow = { on: true };
  await page.route("**/assets/content/**", async (route) => {
    if (slow.on) await new Promise((resolve) => setTimeout(resolve, DELAY));
    await route.continue().catch(() => {});
  });
  return { context, page, slow };
};
// Card trong viewport: ảnh chưa tải mà không blur là ô trống; card không còn khung skeleton hay canvas Flow.
const cardStates = (page, selector = "[data-project-grid] [data-advertising-card]") => page.evaluate((selector) =>
  [...document.querySelectorAll(selector)].filter((card) => {
    const { top, bottom } = card.getBoundingClientRect();
    return bottom > 0 && top < innerHeight;
  }).map((card) => {
    const image = card.querySelector("img");
    return {
      id: card.dataset.advertisingCard || card.dataset.advertisingRelatedCard,
      loaded: Boolean(image?.complete && image.naturalWidth),
      blur: Boolean(image?.style.filter.startsWith("blur(")),
      glass: Boolean(card.querySelector(".glass-surface")),
      skeleton: Boolean(card.querySelector("[data-advertising-loading-skeleton], canvas")),
    };
  }), selector);
const assertNoBlank = (label, states) => {
  assert.ok(states.length, `${label}: cards in view`);
  assert.deepEqual(states.filter(({ loaded, blur }) => !loaded && !blur), [], `${label}: loading cards without blur`);
  // Kính backdrop-filter trên card làm rớt FPS khi kéo thanh cuộn (owner 2026-10-31).
  assert.deepEqual(states.filter(({ glass }) => glass), [], `${label}: cards still carry Kính`);
  assert.deepEqual(states.filter(({ skeleton }) => skeleton), [], `${label}: cards still carry skeleton Flow`);
};

try {
  // Lúc tải trang: ảnh card đầu mờ từ frame đầu, không animate vào, không bị thay node.
  for (const [label, device] of [["phone", phone], ["desktop", { viewport: { width: 1440, height: 900 } }]]) {
    const { context, page } = await open(device);
    await page.addInitScript(() => {
      const ids = new WeakMap();
      let next = 0;
      window.__blurTrace = [];
      const tick = () => {
        for (const image of document.querySelectorAll("[data-project-grid] [data-advertising-card] img[style*='blur(']")) {
          if (!ids.has(image)) ids.set(image, ++next);
          window.__blurTrace.push([image.closest("[data-advertising-card]").dataset.advertisingCard, ids.get(image),
            image.getAnimations().length]);
        }
        if (performance.now() < 3000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => performance.now() > 3000);
    const cards = new Map();
    for (const [card, image, animations] of await page.evaluate(() => window.__blurTrace)) {
      if (!cards.has(card)) cards.set(card, []);
      cards.get(card).push({ image, animations });
    }
    assert.ok(cards.size, `${label}: first cards blur while images load`);
    for (const [card, samples] of cards) {
      assert.equal(new Set(samples.map(({ image }) => image)).size, 1, `${label}: ${card} keeps one image node`);
      assert.ok(samples.every(({ animations }) => !animations), `${label}: ${card} blur starts at full, no fade in`);
    }
    assertNoBlank(`${label} load`, await cardStates(page));
    await context.close();
  }

  // PC tắt cache, kéo thanh cuộn nhanh lên xuống (owner 2026-10-27): card lướt qua không thành ô trống, không dựng Flow.
  {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
    await page.mouse.move(1437, 200);
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector(".c-scrollbar")).opacity) === 1);
    const thumb = await page.locator(".c-scrollbar_thumb").boundingBox();
    await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
    await page.mouse.down();
    for (const y of [700, 200, 850, 400]) await page.mouse.move(1437, y, { steps: 6 });
    assertNoBlank("desktop scrollbar drag", await cardStates(page));
    await page.mouse.up();
    await page.waitForFunction(() => !document.documentElement.classList.contains("has-scroll-scrolling"), null, { timeout: 5000 });
    assertNoBlank("desktop scrollbar settle", await cardStates(page));
    await context.close();
  }

  // PC cao: hơn 12 card cùng chờ ảnh đều mờ.
  {
    const { context, page } = await open({ viewport: { width: 1920, height: 1400 } });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
    for (let y = 400; y <= 2400; y += 400) {
      await page.evaluate((value) => window.TruongThinhMotion.setLogicalScroll(value), y);
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(1500);
    const states = await cardStates(page);
    assert.ok(states.filter(({ blur }) => blur).length > 12, `desktop tall: more than 12 cards blur ${states.length}`);
    assertNoBlank("desktop tall", states);
    await context.close();
  }

  // Điện thoại: mở detail từ masonry đã cuộn nhảy về y=0 mà không có scrollend; ảnh card related mờ lúc chờ,
  // tải xong vẫn tan mà không cần người xem cuộn thêm.
  {
    const { context, page, slow } = await open(phone);
    slow.on = false;
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "networkidle" });
    await page.evaluate(() => scrollTo(0, 1000));
    await page.waitForTimeout(1500);
    slow.on = true;
    const tap = await page.evaluate(() => {
      const link = [...document.querySelectorAll("[data-advertising-card] > a")].find((node) => {
        const { top, bottom } = node.getBoundingClientRect();
        return top > 80 && bottom < innerHeight - 20;
      });
      const { x, y, width, height } = link.getBoundingClientRect();
      return [x + width / 2, y + height / 2];
    });
    await page.touchscreen.tap(...tap);
    await page.waitForFunction(() => document.querySelectorAll("[data-advertising-related-card]").length);
    await page.waitForTimeout(2000);
    assert.equal(await page.evaluate(() => scrollY), 0, "phone: detail opens at the top");
    await page.evaluate(() => scrollTo(0, document.querySelector("[data-advertising-related-card]").getBoundingClientRect().top - 100));
    await page.waitForTimeout(500);
    const related = await cardStates(page, "[data-advertising-related-card]");
    assert.ok(related.some(({ blur }) => blur), `phone: related cards blur while loading ${JSON.stringify(related)}`);
    await page.waitForFunction(() => {
      const loaded = [...document.querySelectorAll("[data-advertising-related-card]")]
        .map((card) => card.querySelector("img")).filter((image) => image?.naturalWidth > 0);
      return loaded.length && loaded.every((image) => !image.style.filter.startsWith("blur("));
    }, null, { timeout: DELAY + 6000 }).catch(async () => assert.fail("phone: loaded related cards still blurred "
      + JSON.stringify(await cardStates(page, "[data-advertising-related-card]"))));
    await context.close();
  }
  console.log("PASS advertising skeleton slow network");
} finally {
  await browser.close();
}
