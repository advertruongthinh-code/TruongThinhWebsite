// Ma trận chung cho mọi nơi có masonry (masonry-reuse bước 2, owner duyệt 2026-11-09): cùng kịch bản chạy trên masonry
// Advertising, masonry Công trình và related ở detail. Sửa ở một nơi mà nơi khác không hưởng thì ma trận đỏ ở nơi đó.
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/masonry-hosts.e2e.mjs
// MASONRY_HOSTS=advertising,related và MASONRY_VIEWPORTS=1920x940 để chạy một phần.
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const VARIANT = /-(?:240|480|960|1600|2048)\.(?:jxl|webp)$/;

const detailReady = (page) => page.waitForFunction(() => document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingDetailReady === "true"
  && !document.documentElement.classList.contains("route-enter") && !document.body.classList.contains("is-transitioning"), null, { timeout: 20000 });
const gridReady = (page) => page.waitForFunction(() => document.documentElement.classList.contains("motion-ready")
  && document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaReady === "true", null, { timeout: 20000 });

// Mỗi nơi: cách mở, gốc lưới; mọi item masonry mang đánh dấu chung data-masonry-item (masonry-reuse bước 3).
const HOSTS = {
  advertising: { root: "[data-project-grid]", card: "[data-masonry-item]",
    open: async (page) => { await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "domcontentloaded" }); await gridReady(page); } },
  projects: { root: "[data-project-grid]", card: "[data-masonry-item]",
    open: async (page) => { await page.goto(`${base}/vi/projects/`, { waitUntil: "domcontentloaded" }); await gridReady(page); } },
  // Như owner dùng: bấm card trên masonry (route mềm, CTA chuyển sang detail). Bước 5 tải lại trang, tức vào thẳng.
  related: { root: "[data-advertising-photo-related-grid]", card: "[data-masonry-item]",
    open: async (page) => {
      await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
      await gridReady(page);
      await page.waitForTimeout(800);
      await page.locator("[data-advertising-card]:not([hidden]) > a").first().click();
      await detailReady(page);
    } },
};
// 1920x940: màn PC của owner, nơi card dọc cao quá 60% viewport (ngưỡng lên bản gốc).
const VIEWPORTS = { "1920x940": { width: 1920, height: 940 }, "384x724": { width: 384, height: 724, isMobile: true, hasTouch: true, deviceScaleFactor: 1.875 } };
const pick = (env, all) => {
  const ids = process.env[env] ? process.env[env].split(",") : Object.keys(all);
  ids.forEach((id) => assert.ok(all[id], `${env}: không có ${id}`));
  return ids;
};

// Đo trong trang từ lần tải đầu: thời gian Kính reveal của batch còn trong DOM khi cung đang thấy, và CTA hiện
// trước khi vào view.
const firstEntryProbe = () => {
  window.__masonry = { arcOverlap: 0, arcSeen: false, since: null, ctaEarly: false, frames: [], running: false };
  const state = window.__masonry;
  const tick = () => {
    const now = performance.now();
    const tint = document.querySelector('.glass-surface[data-glass-shape="arc"]:not([hidden]) .glass-surface__tint')?.getBoundingClientRect();
    const arcInView = Boolean(tint) && tint.bottom > 0 && tint.top < innerHeight;
    if (arcInView) state.arcSeen = true;
    state.since = arcInView && document.querySelector("[data-advertising-cta-skeleton] .glass-surface[data-glass-reveal]") ? (state.since ?? now) : null;
    state.arcOverlap = Math.max(state.arcOverlap, state.since == null ? 0 : now - state.since);
    const cta = document.querySelector("[data-advertising-grid-cta]");
    // Đo chính nút: phần trên của cụm CTA là đuôi batch, nằm trong viewport trước nút rất xa.
    // Chỉ xét lúc nút vừa nhận lớp hiện; sau đó cuộn đi nơi khác thì nút đã hiện là đúng.
    const link = cta?.querySelector("[data-motion-fade]");
    const shown = Boolean(link?.classList.contains("is-motion-inview"));
    // Cụm ẩn chờ dựng batch ở detail có thể nhận lớp hiện rồi được đặt lại sau lần dựng (R9), nên không xét lúc ẩn;
    // lỗi #755 do ctaShownNow bắt ở thời điểm trước khi CTA vào view.
    if (shown && !state.shown && link.getBoundingClientRect().top > innerHeight) {
      state.ctaEarly = `${Math.round(link.getBoundingClientRect().top - innerHeight)}px (${state.phase || "load"})`;
    }
    state.shown = shown;
    if (state.running) {
      // Phần vùng card trong viewport (từ đầu gốc lưới tới đầu cụm CTA) được card thật, card tạm hoặc primary phủ
      // (lưới mẫu 16px). Frame trống hoàn toàn tính là 0, không bỏ qua.
      const root = document.querySelector(state.root)?.getBoundingClientRect();
      const rects = [...document.querySelectorAll(`${state.root} :is(${state.card}), ${state.root} .advertising-ghost, [data-advertising-photo-primary]`)]
        .map((node) => node.getBoundingClientRect()).filter((rect) => rect.bottom > 0 && rect.top < innerHeight && rect.height > 0);
      const zoneBottom = state.zoneBottom - (window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY);
      const bottom = Math.min(innerHeight, root.bottom, zoneBottom);
      let covered = 0;
      let total = 0;
      for (let y = Math.max(0, root.top) + 8; y < bottom; y += 16) {
        for (let x = root.left + 8; x < root.right; x += 16) {
          total += 1;
          if (rects.some((rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)) covered += 1;
        }
      }
      if (total > 0) state.frames.push(covered / total);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
const scrollTo = (page, top) => page.evaluate((y) => window.TruongThinhMotion?.setLogicalScroll?.(y) || window.scrollTo(0, y), top);
// Nút CTA đã nhận lớp hiện chưa. Trước khi CTA vào view lần đầu nó phải chưa hiện, kể cả khi cụm CTA từng nằm tạm
// trong viewport lúc chờ dựng batch (lỗi #755 ở detail: motion chạy lúc cụm còn ẩn ở đầu canvas).
const ctaShownNow = (page) => page.evaluate(() => Boolean(document.querySelector("[data-advertising-grid-cta] [data-motion-fade]")?.classList.contains("is-motion-inview")));
const coverage = async (page, ms = 300) => {
  await page.evaluate(() => { window.__masonry.frames = []; window.__masonry.running = true; });
  await page.waitForTimeout(ms);
  return page.evaluate(() => { window.__masonry.running = false; return window.__masonry.frames; });
};

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const failures = [];
const check = (label, ok, detail) => { if (!ok) failures.push(`${label}: ${detail}`); };
try {
  for (const viewportId of pick("MASONRY_VIEWPORTS", VIEWPORTS)) {
    for (const hostId of pick("MASONRY_HOSTS", HOSTS)) {
      const host = HOSTS[hostId];
      const label = `${hostId} ${viewportId}`;
      const { width, height, ...device } = VIEWPORTS[viewportId];
      const context = await browser.newContext({ viewport: { width, height }, ...device });
      await context.addInitScript(firstEntryProbe);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await host.open(page);
      const sel = { root: host.root, card: host.card };
      await page.evaluate((value) => Object.assign(window.__masonry, value), sel);
      await page.waitForTimeout(1500);
      // Đáy vùng card là đầu cụm CTA: vuốt và đứng yên chỉ trong vùng card, để CTA vào view lần đầu ở bước 5.
      const { rootTop, rootBottom, viewport } = await page.evaluate((root) => {
        const rect = document.querySelector(root).getBoundingClientRect();
        const y = window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY;
        const cta = document.querySelector("[data-advertising-grid-cta]")?.getBoundingClientRect();
        return { rootTop: rect.top + y, rootBottom: Math.min(rect.bottom, cta?.top ?? Infinity) + y, viewport: innerHeight };
      }, host.root);

      await page.evaluate((zoneBottom) => { window.__masonry.zoneBottom = zoneBottom; }, rootBottom);
      const phase = (name) => page.evaluate((value) => { window.__masonry.phase = value; }, name);
      await phase("settled");
      // 1. Mức phủ khi đứng yên ở vài vị trí trong lưới: nền so sánh cho lúc vuốt.
      const span = Math.max(0, rootBottom - rootTop - viewport);
      const settled = [];
      for (const share of [0, 0.5, 1]) {
        await scrollTo(page, rootTop + span * share);
        await page.waitForTimeout(2000);
        settled.push(Math.min(...await coverage(page)));
      }
      const floor = Math.min(...settled) - 0.08;
      // Nền tự hạ khi lưới có khoảng trống lúc đứng yên: chặn bằng một mức tối thiểu (đáy lưới so le còn khoảng 0.6).
      check(label, Math.min(...settled) >= 0.5, `đứng yên đã có khoảng trống, phủ ${settled.map((value) => value.toFixed(2)).join("/")}`);

      await phase("fling");
      // 2. Vuốt cực nhanh qua cả lưới (20 viewport/s, CPU chậm 4 lần): mọi frame giữ được mức phủ như lúc đứng yên.
      await scrollTo(page, rootTop);
      await page.waitForTimeout(1500);
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.evaluate(() => { window.__masonry.frames = []; window.__masonry.running = true; });
      await page.evaluate(([from, distance, perSecond]) => new Promise((resolve) => {
        const begin = performance.now();
        const frame = (now) => {
          const progress = Math.min(1, (now - begin) / Math.max(1000, 1000 * distance / perSecond));
          window.TruongThinhMotion?.setLogicalScroll?.(from + distance * progress) || window.scrollTo(0, from + distance * progress);
          if (progress < 1) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      }), [rootTop, span, 20 * viewport]);
      const fling = await page.evaluate(() => { window.__masonry.running = false; return window.__masonry.frames; });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      // Lưới ngắn hơn hai viewport không có gì để vuốt: ghi rõ trong log, không lặng lẽ bỏ qua.
      const flingRan = span > viewport;
      if (flingRan) {
        check(label, fling.length > 5, `vuốt nhanh chỉ đo được ${fling.length} frame`);
        // Frame tệ thứ hai: một frame rơi lẻ trên runner bận không phải khoảng trống thật.
        const worstTwo = [...fling].sort((a, b) => a - b)[1] ?? 0;
        check(label, worstTwo >= floor, `vuốt nhanh để lộ khoảng trống, tệ nhì ${worstTwo.toFixed(3)} dưới ${floor.toFixed(3)}`);
      }

      // 3. Dừng lại: không card nào được giữ quá hai viewport (vùng giữ của cửa sổ cuộn).
      await page.waitForTimeout(3000);
      const farthest = await page.evaluate(({ root, card }) => Math.max(0, ...[...document.querySelectorAll(`${root} :is(${card})`)]
        .filter((node) => !node.hidden && node.getClientRects().length)
        .map((node) => { const rect = node.getBoundingClientRect(); return Math.max(-rect.bottom, rect.top - innerHeight); })), sel);
      check(label, farthest <= 2 * viewport + 1, `card còn gắn cách viewport ${Math.round(farthest)}px`);

      // 4. Card là khung nhỏ: đứng yên vẫn giữ bản vừa khung, không lên bản gốc lớn (progressive-loading R10).
      await page.waitForTimeout(3000);
      const upgraded = await page.evaluate(({ root, card, variant }) => [...document.querySelectorAll(`${root} :is(${card}) img`)]
        .filter((image) => image.currentSrc && image.clientWidth > 0 && !new RegExp(variant).test(new URL(image.currentSrc).pathname)
          && image.naturalWidth > 1.5 * image.clientWidth * devicePixelRatio)
        .map((image) => new URL(image.currentSrc).pathname), { ...sel, variant: VARIANT.source });
      check(label, !upgraded.length, `card lên bản gốc ${JSON.stringify(upgraded)}`);

      // 5. Tải lại (F5) rồi kéo từ đầu tới cuối: khung batch vào view lần đầu trước cung (lỗi #757 chỉ lộ theo đường
      // này), Kính reveal của batch không chồng cung, CTA không hiện trước khi vào view.
      check(label, !await ctaShownNow(page), "CTA đã hiện trước khi vào view");
      // Đường mở đầu tiên (route mềm với related) cũng phải sạch: F5 bên dưới khởi tạo lại bộ đo.
      const opened = await page.evaluate(() => ({ arcOverlap: window.__masonry.arcOverlap, ctaEarly: window.__masonry.ctaEarly }));
      check(label, opened.arcOverlap <= 100, `Kính reveal còn trong DOM ${Math.round(opened.arcOverlap)}ms khi cung đang thấy (trước F5)`);
      check(label, !opened.ctaEarly, `CTA hiện sớm trước F5: ${opened.ctaEarly}`);
      check(label, !errors.length, `lỗi runtime ${JSON.stringify(errors)}`);
      errors.length = 0;
      await page.reload({ waitUntil: "domcontentloaded" });
      await (host.root === "[data-project-grid]" ? gridReady(page) : detailReady(page));
      await page.evaluate((value) => Object.assign(window.__masonry, value, { phase: "end" }), sel);
      await page.waitForTimeout(1500);
      check(label, !await ctaShownNow(page), "sau F5: CTA đã hiện trước khi vào view");
      await page.evaluate(async () => {
        const end = () => document.documentElement.scrollHeight - innerHeight;
        let y = 0;
        if (!window.TruongThinhMotion?.setLogicalScroll?.(0)) window.scrollTo(0, 0);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // Đáy tính lại mỗi bước: batch và related có thể làm trang dài thêm khi đang cuộn.
        while (y < end()) {
          y = Math.min(end(), y + innerHeight / 2);
          if (!window.TruongThinhMotion?.setLogicalScroll?.(y)) window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
      });
      await page.waitForTimeout(2000);
      const end = await page.evaluate(() => ({ arcOverlap: window.__masonry.arcOverlap, arcSeen: window.__masonry.arcSeen, ctaEarly: window.__masonry.ctaEarly,
        ctaShown: Boolean(document.querySelector("[data-advertising-grid-cta] [data-motion-fade]")?.classList.contains("is-motion-inview")) }));
      check(label, end.arcSeen, "cung Kính không vào view, kiểm Kính reveal không có nghĩa");
      check(label, end.arcOverlap <= 100, `Kính reveal còn trong DOM ${Math.round(end.arcOverlap)}ms khi cung đang thấy`);
      check(label, !end.ctaEarly, `CTA đã hiện khi nút còn dưới viewport ${end.ctaEarly}`);
      check(label, end.ctaShown, "CTA không hiện khi vào view");
      check(label, !errors.length, `lỗi runtime sau F5 ${JSON.stringify(errors)}`);
      console.log(`${label}: phủ đứng yên ${settled.map((value) => value.toFixed(2)).join("/")}, vuốt ${flingRan ? `tệ nhất ${Math.min(...fling).toFixed(2)} (${fling.length} frame)` : `bỏ qua, lưới chỉ ${((span + viewport) / viewport).toFixed(1)} viewport`}, xa nhất ${Math.round(farthest)}px, Kính chồng cung ${Math.round(end.arcOverlap)}ms`);
      await context.close();
    }
  }
  assert.deepEqual(failures, [], `ma trận masonry đỏ:\n${failures.join("\n")}`);
  console.log("PASS masonry hosts");
} finally {
  await browser.close();
}
