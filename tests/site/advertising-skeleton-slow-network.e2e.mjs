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
// Card trong viewport: ảnh chưa tải mà không blur hoặc không có màu chủ đạo là ô trống; card không còn khung skeleton hay canvas Flow.
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
      // Card mờ chờ ảnh thì thở: runtime gắn data-advertising-media-loading lên card (spec chờ ảnh S2).
      marked: card.hasAttribute("data-advertising-media-loading"),
      // Blur tan (animate WAAPI) còn blur inline nhưng thở đã dừng.
      revealing: Boolean(image?.getAnimations().some((animation) => animation.animationName === undefined)),
      color: Boolean(card.querySelector(".advertising-card-media")?.style.backgroundColor),
      glass: Boolean(card.querySelector(".glass-surface")),
      skeleton: Boolean(card.querySelector("[data-advertising-loading-skeleton], canvas")),
    };
  }), selector);
const assertNoBlank = (label, states) => {
  assert.ok(states.length, `${label}: cards in view`);
  assert.deepEqual(states.filter(({ loaded, blur }) => !loaded && !blur), [], `${label}: loading cards without blur`);
  assert.deepEqual(states.filter(({ blur, marked, revealing }) => blur !== marked && !revealing), [],
    `${label}: every blurred card is marked to breathe, and only those (a card revealing has stopped breathing)`);
  // Ảnh chưa nhận byte nào thì blur chưa có gì để vẽ: khung tô màu chủ đạo của ảnh (owner 2026-10-31).
  assert.deepEqual(states.filter(({ loaded, color }) => !loaded && !color), [], `${label}: loading cards without dominant color`);
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
            // Thở (CSS animation media-breathe) không phải animate vào; chỉ đếm animation khác (WAAPI).
            image.getAnimations().filter((animation) => animation.animationName !== "media-breathe").length]);
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

  // Giảm chuyển động: ảnh vẫn mờ khi chờ nhưng không thở (spec chờ ảnh S2).
  {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-project-grid] img[style*='blur(']"));
    // Reset toàn cục của reduced motion cắt animation còn một lượt 0.01ms: thở đứng ở opacity 1, không lặp.
    await page.waitForTimeout(500);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] img[style*='blur(']")]
      .map((image) => getComputedStyle(image))
      .filter(({ opacity, animationIterationCount }) => opacity !== "1" || animationIterationCount === "infinite")
      .length), 0, "reduced motion: blurred cards do not breathe");
    await context.close();
  }

  // Thở dừng đúng lúc blur tan: opacity đi từ giá trị đang thở về 1, không frame nào nhảy quá 0.1 so với frame trước.
  {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      window.__opacityTrace = new Map();
      const tick = () => {
        for (const image of document.querySelectorAll("[data-project-grid] [data-advertising-card] img")) {
          const trace = window.__opacityTrace.get(image) || [];
          trace.push([Number(getComputedStyle(image).opacity), Boolean(image.style.filter)]);
          window.__opacityTrace.set(image, trace);
        }
        if (performance.now() < 14000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => performance.now() > 14000, null, { timeout: 30_000 });
    const jumps = await page.evaluate(() => [...window.__opacityTrace.values()]
      // Chỉ ảnh đã mờ rồi nét lại trong lúc đo (có cả frame blur lẫn frame hết blur).
      .filter((trace) => trace.some(([, blurred]) => blurred) && trace.some(([, blurred], i) => !blurred && trace.slice(0, i).some(([, was]) => was)))
      // Bỏ các frame trước lúc ảnh bắt đầu mờ (opacity 0 chờ lazyload).
      .map((trace) => trace.slice(trace.findIndex(([, blurred]) => blurred)))
      .map((trace) => trace.slice(1).reduce((max, [opacity], i) => Math.max(max, Math.abs(opacity - trace[i][0])), 0)));
    assert.ok(jumps.length, "opacity trace: some card went from blurred to sharp");
    assert.ok(jumps.every((jump) => jump <= 0.1), `opacity trace: no frame jumps over 0.1 when breathing stops ${JSON.stringify(jumps)}`);
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
    assert.deepEqual(related.filter(({ blur, marked, revealing }) => blur !== marked && !revealing), [],
      "phone: related cards breathe exactly while blurred");
    await page.waitForFunction(() => {
      const loaded = [...document.querySelectorAll("[data-advertising-related-card]")]
        .map((card) => card.querySelector("img")).filter((image) => image?.naturalWidth > 0);
      return loaded.length && loaded.every((image) => !image.style.filter.startsWith("blur("));
    }, null, { timeout: DELAY + 6000 }).catch(async () => assert.fail("phone: loaded related cards still blurred "
      + JSON.stringify(await cardStates(page, "[data-advertising-related-card]"))));
    await context.close();
  }
  // PC Slow 4G tắt cache, mở detail từ masonry (owner 2026-11-01): card related giữ chỗ trước, batch CTA nối sau,
  // như masonry; không có frame nào batch đã hiện trong canvas detail mà chưa có card related.
  {
    const { context, page, slow } = await open({ viewport: { width: 1440, height: 900 } });
    slow.on = false;
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "networkidle" });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions",
      { offline: false, latency: 562.5, downloadThroughput: 180_000, uploadThroughput: 84_375 });
    await page.evaluate(() => {
      window.__batchBeforeRelated = 0;
      const tick = () => {
        const canvas = document.querySelector("[data-advertising-photo-canvas]");
        const batch = canvas?.querySelector("[data-advertising-cta-frame]");
        if (batch && !batch.closest("[hidden]") && !canvas.querySelector("[data-advertising-related-card]")) window.__batchBeforeRelated++;
        if (!canvas?.querySelector("[data-advertising-related-card]")) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.locator("[data-project-grid] [data-advertising-card] > a").first().click();
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-canvas] [data-advertising-related-card]"),
      null, { timeout: 15000 });
    assert.equal(await page.evaluate(() => window.__batchBeforeRelated), 0, "desktop detail: batch shows before related cards");
    await context.close();
  }
  console.log("PASS advertising skeleton slow network");
} finally {
  await browser.close();
}
