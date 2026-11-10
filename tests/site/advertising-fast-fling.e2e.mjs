// Vuốt cực nhanh masonry không khựng (advertising-masonry R7, loading-glass R3): card chưa dựng kịp hiện card tạm màu chủ đạo,
// mỗi frame chỉ dựng vài card thật, card chỉ bị gỡ khi ra xa hơn hai viewport.
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/advertising-fast-fling.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const scrollTo = (page, top) => page.evaluate((y) => window.TruongThinhMotion.setLogicalScroll(y), top);
try {
  const context = await browser.newContext({ viewport: { width: 384, height: 724 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  // Máy 0.5 GB: hàng chờ card vừa gỡ chỉ 8 card, nên đoạn nhảy về chỗ cũ vẫn phần lớn là card tạm lên card thật.
  await page.addInitScript(() => Object.defineProperty(navigator, "deviceMemory", { value: 0.5, configurable: true }));
  await page.addInitScript(() => {
    // Mỗi frame: phần viewport được card thật hoặc card tạm phủ (lấy mẫu lưới 12px), số card thêm vào, số card tạm.
    const probe = { frames: [], added: [], ghosts: new Map(), crossfades: 0, running: false };
    window.__probe = probe;
    let added = 0;
    new MutationObserver((records) => records.forEach(({ addedNodes }) => addedNodes.forEach((node) => {
      // Card chỉ bị dời chỗ trong DOM (insertBefore) không phải card mới.
      if (node.dataset?.masonryCard !== undefined && !node.__seen) {
        node.__seen = true;
        added += 1;
      }
    }))).observe(document, { childList: true, subtree: true });
    const step = 12;
    const tick = () => {
      if (probe.running) {
        const rects = [...document.querySelectorAll("[data-project-grid] [data-masonry-card], .masonry-ghost")]
          .map((node) => node.getBoundingClientRect()).filter((rect) => rect.bottom > 0 && rect.top < innerHeight && rect.height > 0);
        let covered = 0;
        let total = 0;
        for (let y = step / 2; y < innerHeight; y += step) {
          for (let x = step / 2; x < innerWidth; x += step) {
            total += 1;
            if (rects.some((rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)) covered += 1;
          }
        }
        probe.frames.push(covered / total);
        probe.added.push(added);
        for (const ghost of document.querySelectorAll(".masonry-ghost")) {
          probe.ghosts.set(ghost.dataset.masonryGhost, getComputedStyle(ghost).backgroundColor);
        }
        probe.crossfades = Math.max(probe.crossfades, document.getAnimations().filter((animation) => {
          const timing = animation.effect?.getTiming?.();
          const frames = animation.effect?.getKeyframes?.() ?? [];
          return timing?.duration === 450 && frames.length === 2 && frames.every((frame) => "opacity" in frame);
        }).length);
      }
      added = 0;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
  await page.waitForTimeout(1500);
  const { limit, viewport } = await page.evaluate(() => ({ limit: document.documentElement.scrollHeight - innerHeight, viewport: innerHeight }));
  // Dừng trước batch CTA cuối: ở đó không còn card.
  const top = Math.max(0, limit - 3 * viewport);
  assert.ok(top > 20 * viewport, `masonry long enough for a 20 viewport fling, ${Math.round(top / viewport)} viewports`);
  const settle = (ms = 3500) => page.waitForTimeout(ms);
  const coverageHere = async () => {
    await page.evaluate(() => { window.__probe.frames = []; window.__probe.running = true; });
    await page.waitForTimeout(300);
    return page.evaluate(() => { window.__probe.running = false; return Math.min(...window.__probe.frames); });
  };

  // Mức phủ khi mọi card đã dựng, ở vài vị trí: nền so sánh cho lúc vuốt.
  const settled = [];
  for (const y of [0.2, 0.5, 0.8]) {
    await scrollTo(page, top * y);
    await settle(2500);
    settled.push(await coverageHere());
  }
  // Khe giữa card và vị trí cuộn làm mức phủ dao động vài phần trăm; vùng trống thật làm mức phủ tụt rất xa.
  const floor = Math.min(...settled) - 0.08;
  assert.ok(floor > 0.5, `steady coverage is meaningful, ${settled.map((value) => value.toFixed(3)).join(", ")}`);

  // Vùng trễ: cuộn xuống 2.2 viewport; card đã dựng ở vị trí trước nằm cao hơn viewport quá một viewport vẫn còn.
  await scrollTo(page, viewport * 4);
  await settle(2500);
  await page.evaluate(() => document.querySelectorAll("[data-project-grid] [data-masonry-card]").forEach((node) => { node.__before = true; }));
  await scrollTo(page, viewport * 6.2);
  await settle(1500);
  const kept = await page.evaluate(() => {
    const vh = innerHeight;
    const cards = [...document.querySelectorAll("[data-project-grid] [data-masonry-card]")];
    return {
      sameNodeBeyondOneViewport: cards.filter((node) => node.__before && node.getBoundingClientRect().bottom < -vh).length,
      farthest: Math.max(...cards.map((node) => Math.max(-node.getBoundingClientRect().bottom, node.getBoundingClientRect().top - vh))),
    };
  });
  assert.ok(kept.sameNodeBeyondOneViewport > 0, "cards between one and two viewports away keep their node (release zone)");
  assert.ok(kept.farthest <= 2 * viewport + 1, `no card is mounted beyond two viewports, farthest ${Math.round(kept.farthest)}px`);

  // Vuốt cực nhanh: 20 viewport trong 1s, CPU chậm 4 lần.
  const cdp = await context.newCDPSession(page);
  const start = top * 0.1;
  await scrollTo(page, 0);
  await settle(1500);
  await scrollTo(page, start);
  await settle(2500);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(() => {
    window.__probe.frames = [];
    window.__probe.added = [];
    window.__probe.running = true;
  });
  // Cuộn theo đồng hồ ngay trong trang (20 viewport/s, gấp đôi ngưỡng vuốt nhanh), không phụ thuộc độ trễ của Playwright.
  await page.evaluate(([from, distance]) => new Promise((resolve) => {
    const begin = performance.now();
    const frame = (now) => {
      const progress = Math.min(1, (now - begin) / 1000);
      window.TruongThinhMotion.setLogicalScroll(from + distance * progress);
      if (progress < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  }), [start, 20 * viewport]);
  await page.evaluate(() => { window.__probe.running = false; });
  const fling = await page.evaluate(() => ({
    frames: window.__probe.frames, added: window.__probe.added, ghosts: [...window.__probe.ghosts.entries()],
  }));
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const worst = Math.min(...fling.frames);
  assert.ok(fling.frames.length > 10, `probe saw frames, ${fling.frames.length}`);
  assert.ok(worst >= floor, `every frame keeps the viewport covered by cards or ghosts, worst ${worst.toFixed(3)} below floor ${floor.toFixed(3)}`);
  assert.ok(fling.ghosts.length > 0, "ghost cards held the places of cards not yet mounted");
  const mostAdded = Math.max(...fling.added);
  assert.ok(mostAdded <= 8, `a frame mounts at most a handful of real cards, most ${mostAdded}`);
  // Vuốt trên ngưỡng thì gần như chỉ có card tạm: card thật chỉ được dựng khi tốc độ cuộn nhìn thấy được tụt xuống dưới ngưỡng
  // trong một frame (tối đa 8 card), nên tổng số card thật dựng khi vuốt chỉ là một phần nhỏ số card đi qua.
  const mounted = fling.added.reduce((sum, value) => sum + value, 0);
  assert.ok(mounted * 4 <= fling.ghosts.length, `swiping above the fast threshold mounts a small share of the cards that pass, ${mounted} real vs ${fling.ghosts.length} ghosts`);

  // Dừng: mọi card tạm trong vùng dựng thành card thật, màu đúng màu chủ đạo của card.
  await settle(5000);
  const after = await page.evaluate((entries) => {
    const vh = innerHeight;
    const strayGhosts = [...document.querySelectorAll(".masonry-ghost")].filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.bottom > -vh && rect.top < 2 * vh;
    }).length;
    const wrong = [];
    for (const [id, color] of entries) {
      const media = document.querySelector(`[data-masonry-card="${id}"] .card-media`);
      if (media && getComputedStyle(media).backgroundColor !== color) wrong.push(id);
    }
    const blank = [...document.querySelectorAll("[data-project-grid] [data-masonry-card]")].filter((card) => {
      const rect = card.getBoundingClientRect();
      const image = [...card.querySelectorAll("img")].find((node) => !node.hidden);
      return rect.bottom > 0 && rect.top < vh && !image?.classList.contains("is-masonry-media-ready");
    }).length;
    return { strayGhosts, wrong, blank };
  }, fling.ghosts);
  assert.equal(after.strayGhosts, 0, "no card tạm left in the mount zone once scrolling stops");
  assert.deepEqual(after.wrong, [], "ghost colour is the dominant colour of the card it holds");
  assert.equal(after.blank, 0, "every visible card shows its image once scrolling stops");

  // Ảnh đã có: nhảy một cú tới đoạn vừa xem, card tạm lên card thật thì ảnh hiện dần 0.45s.
  const back = start + 6 * viewport;
  await scrollTo(page, back);
  await settle(2500);
  await scrollTo(page, 0);
  await settle(1500);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(() => { window.__probe.crossfades = 0; window.__probe.running = true; });
  await scrollTo(page, back);
  await page.waitForTimeout(2500);
  const crossfades = await page.evaluate(() => window.__probe.crossfades);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  assert.ok(crossfades > 0, "cached image fades in over 0.45s when a ghost becomes a real card");
  await context.close();
  console.log(`advertising fast fling: worst coverage ${worst.toFixed(3)} (floor ${floor.toFixed(3)}), ${fling.ghosts.length} ghosts, most ${mostAdded} cards mounted per frame, crossfades ${crossfades}`);
} finally {
  await browser.close();
}
