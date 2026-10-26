// Skeleton khi mạng chậm (advertising-skeleton R5, loading-glass-and-page-entry R1): ảnh card bị giữ 8s như Slow 3G.
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

try {
  // Lúc tải trang: skeleton của card đầu fade vào một lần, không bị thay node rồi fade lại từ 0.
  for (const [label, device] of [["phone", phone], ["desktop", { viewport: { width: 1440, height: 900 } }]]) {
    const { context, page } = await open(device);
    await page.addInitScript(() => {
      const ids = new WeakMap();
      let next = 0;
      window.__skeletonTrace = [];
      const tick = () => {
        for (const frame of document.querySelectorAll("[data-project-grid] [data-advertising-loading-skeleton]")) {
          if (!ids.has(frame)) ids.set(frame, ++next);
          window.__skeletonTrace.push([frame.closest("[data-advertising-card]").dataset.advertisingCard, ids.get(frame),
            Number(getComputedStyle(frame).opacity)]);
        }
        if (performance.now() < 3000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => performance.now() > 3000);
    const cards = new Map();
    for (const [card, frame, opacity] of await page.evaluate(() => window.__skeletonTrace)) {
      if (!cards.has(card)) cards.set(card, []);
      cards.get(card).push({ frame, opacity });
    }
    assert.ok(cards.size, `${label}: first cards wear a skeleton while images load`);
    for (const [card, samples] of cards) {
      assert.equal(new Set(samples.map(({ frame }) => frame)).size, 1, `${label}: ${card} keeps one skeleton node`);
      const drop = samples.findIndex(({ opacity }, i) => i && opacity < samples[i - 1].opacity - 0.05);
      assert.equal(drop, -1, `${label}: ${card} skeleton never fades back down ${JSON.stringify(samples.slice(drop - 2, drop + 2))}`);
      const jump = samples.findIndex(({ opacity }, i) => i && opacity > samples[i - 1].opacity + 0.25);
      assert.equal(jump, -1, `${label}: ${card} skeleton fades in without a jump ${JSON.stringify(samples.slice(jump - 2, jump + 2))}`);
    }
    await context.close();
  }

  // Vuốt nhanh trên PC: card vào viewport lúc đang cuộn hiện khung và canvas Flow ngay, không fade 0.6s rồi 0.3s
  // (advertising-skeleton R4); card chỉ ở trong viewport khoảng 270ms nên fade đó chỉ để lộ ảnh tĩnh.
  {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
    await page.waitForTimeout(1500);
    for (let step = 1; step <= 60; step += 1) {
      await page.evaluate((y) => window.TruongThinhMotion.setLogicalScroll(y), step * 60);
      await page.waitForTimeout(16);
    }
    const frames = await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-advertising-loading-skeleton]")]
      .filter((frame) => frame.classList.contains("is-entry-ready"))
      .map((frame) => {
        const canvas = frame.querySelector('canvas[data-advertising-flow-backend="webgl"]');
        return { transition: frame.style.transition, canvas: canvas && { opacity: canvas.style.opacity, transition: canvas.style.transition } };
      }));
    assert.ok(frames.length >= 3, `desktop fast scroll: card frames entered ${JSON.stringify(frames)}`);
    assert.ok(frames.every(({ transition }) => transition === "none"), `desktop fast scroll: frames show at once ${JSON.stringify(frames)}`);
    const canvases = frames.flatMap(({ canvas }) => (canvas ? [canvas] : []));
    assert.ok(canvases.length, "desktop fast scroll: Flow mounted while scrolling");
    assert.ok(canvases.every(({ opacity, transition }) => opacity === "1" && transition === "none"),
      `desktop fast scroll: Flow canvas shows without fade ${JSON.stringify(canvases)}`);
    await context.close();
  }

  // PC cao: nhiều hơn 12 card chờ ảnh trong viewport thì mọi card chạy Flow trên một context chung trong worker
  // (advertising-skeleton R5); Chrome chỉ giữ 4 context mỗi worker nên context riêng cho từng card sẽ bị thu hồi.
  {
    const { context, page } = await open({ viewport: { width: 1920, height: 1400 } });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
    for (let y = 400; y <= 2400; y += 400) {
      await page.evaluate((value) => window.TruongThinhMotion.setLogicalScroll(value), y);
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(1500);
    const frames = await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-advertising-loading-skeleton]")]
      .filter((frame) => { const { top, bottom } = frame.getBoundingClientRect(); return bottom > 0 && top < innerHeight; })
      .map((frame) => ({ looping: frame.classList.contains("is-looping"), context: frame.querySelector("canvas")?.dataset.advertisingFlowContext })));
    assert.ok(frames.length > 12, `desktop tall: more than 12 loading cards in view ${frames.length}`);
    assert.ok(frames.every(({ looping }) => looping), `desktop tall: every loading card runs Flow ${JSON.stringify(frames)}`);
    assert.ok(frames.every(({ context }) => context === "shared"), `desktop tall: worker Flow uses the shared context ${JSON.stringify(frames)}`);
    await context.close();
  }

  // Điện thoại: mở detail từ masonry đã cuộn nhảy về y=0 mà không có scrollend; Flow vẫn chạy, card related
  // tải xong vẫn reveal mà không cần người xem cuộn thêm.
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
    const states = await page.evaluate(() => [...document.querySelectorAll("[data-advertising-flow-state]")]
      .map((node) => node.dataset.advertisingFlowState));
    assert.ok(states.includes("running"), `phone: Flow runs while the detail images load ${JSON.stringify(states)}`);
    await page.waitForFunction(() => {
      const loaded = [...document.querySelectorAll("[data-advertising-related-card]")]
        .filter((card) => card.querySelector("img")?.naturalWidth > 0);
      return loaded.length && loaded.every((card) => !card.querySelector("[data-advertising-loading-skeleton]"));
    }, null, { timeout: DELAY + 6000 }).catch(async () => assert.fail("phone: loaded related cards still held as skeleton "
      + JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("[data-advertising-related-card]")]
        .filter((card) => card.querySelector("img")?.naturalWidth > 0 && card.querySelector("[data-advertising-loading-skeleton]"))
        .map((card) => card.dataset.advertisingRelatedCard)))));
    await context.close();
  }
  console.log("PASS advertising skeleton slow network");
} finally {
  await browser.close();
}
