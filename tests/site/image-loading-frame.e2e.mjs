// Evidence P8/P9: frame reserved, vệt sáng (media-delivery R6) hoặc skeleton và reveal Kính, số request và geometry khi ảnh đang tải.
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/image-loading-frame.e2e.mjs
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const output = ".tmp/image-loading-frame";
const DELAY = 1500;
const routes = ["/vi/", "/en/", "/vi/residential/", "/en/residential/", "/vi/commercial/", "/en/commercial/", "/vi/about/", "/en/about/"];
const viewports = [{ width: 390, height: 844, isMobile: true, hasTouch: true }, { width: 1440, height: 900 }];
const isContent = url => new URL(url).pathname.startsWith("/assets/content/") && !url.includes("/client-logos/");
const results = [];
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

const open = async ({ delay = DELAY, javaScriptEnabled = true, viewport = viewports[0] } = {}) => {
  const { width, height, ...device } = viewport;
  const context = await browser.newContext({ viewport: { width, height }, ...device, javaScriptEnabled });
  const page = await context.newPage();
  const counts = new Map();
  if (delay) await page.route("**/assets/content/**", async route => {
    const url = route.request().url();
    if (isContent(url)) {
      counts.set(url, (counts.get(url) || 0) + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    await route.continue().catch(() => {});
  });
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver(list => list.getEntries().forEach(entry => {
      if (!entry.hadRecentInput) window.__cls += entry.value;
    })).observe({ type: "layout-shift", buffered: true });
  });
  return { context, page, counts };
};

// Native lazy không bao giờ tải slide carousel đỗ sang bên, nên chỉ cột visible mới phải settle.
// Chỉ ảnh content tĩnh; grid/viewer Advertising và logo client có loader riêng.
const snapshot = page => page.evaluate(() => { const seen = new Map(); return [...document.querySelectorAll("img")]
  .filter(img => img.getAttribute("src")?.startsWith("/assets/content/") && !img.closest(".client-logo-marquee, .client-logo-image, [data-project-grid], [data-advertising-photo-view]") && img.getClientRects().length)
  .map(img => {
    const frame = img.parentElement.tagName === "PICTURE" ? img.parentElement.parentElement : img.parentElement;
    let opacity = 1;
    for (let node = img; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    const src = img.getAttribute("src");
    seen.set(src, (seen.get(src) || 0) + 1);
    return {
      key: src + "#" + seen.get(src), raw: !img.closest("[data-hero-intro] .hero-slides"), src, w: img.offsetWidth, h: img.offsetHeight, alt: img.getAttribute("alt"),
      loading: img.getAttribute("loading"), priority: img.getAttribute("fetchpriority"),
      ready: img.complete && img.naturalWidth > 0, columnVisible: img.getBoundingClientRect().right > 0 && img.getBoundingClientRect().left < innerWidth, sweep: /^media-(sweep|breathe)$/.test(getComputedStyle(frame, "::before").animationName), settled: frame.classList.contains("is-media-settled"), imageOpacity: Number(getComputedStyle(img).opacity), opacity,
    };
  }); });
// Timer phía Node để việc walk cũng chạy khi tắt JavaScript.
const scrollThrough = async page => {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = (page.viewportSize()?.height || 800) / 2;
  for (let y = 0; y <= height; y += step) {
    await page.evaluate(top => scrollTo(0, top), y);
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(500);
};
// firstScreen giới hạn việc chờ ở ảnh trong viewport hiện tại (không scroll walk).
const settle = async (page, firstScreen = false) => {
  for (const started = Date.now(); Date.now() - started < 30_000; await page.waitForTimeout(250)) {
    if (await page.evaluate(firstScreen => [...document.querySelectorAll('img[src^="/assets/content/"]')]
      .filter(img => img.getClientRects().length && !img.closest("[data-project-grid], [data-advertising-photo-view]")
        && img.getBoundingClientRect().right > 0 && img.getBoundingClientRect().left < innerWidth
        && (!firstScreen || (img.getBoundingClientRect().bottom > 0 && img.getBoundingClientRect().top < innerHeight)))
      .every(img => img.complete), firstScreen)) return;
  }
  throw new Error("visible content images did not settle");
};
const attributes = ({ src, alt, loading, priority }) => JSON.stringify([src, alt, loading, priority]);
// Attribute như đã ship trong HTML, parse native để entity decode giống như DOM.
const rawAttributes = page => page.evaluate(async () => [...new DOMParser()
  .parseFromString(await (await fetch(location.href)).text(), "text/html").images]
  .map(img => JSON.stringify([img.getAttribute("src"), img.getAttribute("alt"), img.getAttribute("loading"), img.getAttribute("fetchpriority")])))
  .then(list => new Set(list));

try {
  // P8: frame reserve box cuối trước khi request xong, rồi giữ nó.
  for (const route of routes) {
    for (const viewport of viewports) {
      const { context, page, counts } = await open({ viewport });
      await page.goto(base + route, { waitUntil: "domcontentloaded" });
      const before = await snapshot(page);
      const raw = await rawAttributes(page);
      await scrollThrough(page);
      await settle(page);
      // Khung settle sau load và decode() bất đồng bộ; chờ thêm cho fade 0.45s chạy xong.
      await page.waitForFunction(() => [...document.images].every(img => !img.complete || !img.naturalWidth
        || img.closest(".is-media-settled") || !img.closest("[class]")), null, { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
      const after = new Map((await snapshot(page)).map(item => [item.key, item]));
      const label = `${route} ${viewport.width}px`;
      for (const item of before) {
        assert.ok(item.w > 0 && item.h > 0, `${label}: ${item.src} reserves a box before load`);
        if (!item.ready) assert.ok(item.sweep && item.imageOpacity === 0, `${label}: ${item.src} shows the sweep and hides the image while loading`);
        assert.notEqual(item.alt, null, `${label}: ${item.src} has an alt attribute`);
        // Slide hero trang chủ nhận src bằng script (page-home R3) nên không có raw src để so sánh.
        if (item.raw) assert.ok(raw.has(attributes(item)), `${label}: ${item.src} keeps HTML alt, request priority and lazy loading ${attributes(item)}`);
        const done = after.get(item.key);
        if (!done) continue;
        if (done.columnVisible) assert.ok(done.ready, `${label}: ${item.src} finishes loading`);
        // Opacity sau settle còn do reveal của detail.js quyết, nên chỉ kiểm khung đã settle và hết vệt.
        if (done.ready) assert.ok(done.settled && !done.sweep, `${label}: ${item.src} settles and drops the sweep once decoded`);
        assert.ok(Math.abs(done.w - item.w) <= 1 && Math.abs(done.h - item.h) <= 1,
          `${label}: ${item.src} keeps its box ${item.w}x${item.h} -> ${done.w}x${done.h}`);
      }
      const duplicates = [...counts].filter(([, count]) => count > 1);
      assert.deepEqual(duplicates, [], `${label}: no duplicate image requests`);
      const cls = await page.evaluate(() => window.__cls);
      assert.ok(cls < 0.1, `${label}: CLS ${cls} stays under 0.1`);
      results.push({ case: "p8-frame", route, width: viewport.width, images: before.length, requests: counts.size, cls: Number(cls.toFixed(4)) });
      await context.close();
    }
  }

  // R6: chụp mỗi 100ms trong lúc ảnh tải dở, không ảnh chưa xong nào được lộ ra.
  {
    const { context, page } = await open({ viewport: viewports[1], delay: 3000 });
    await page.goto(base + "/vi/residential/", { waitUntil: "domcontentloaded" });
    let samples = 0;
    for (let tick = 0; tick < 40; tick++, await page.waitForTimeout(100)) {
      const leaked = await page.evaluate(() => [...document.querySelectorAll('img[src^="/assets/content/"]')]
        .filter(img => !img.complete && img.getClientRects().length && Number(getComputedStyle(img).opacity) > 0)
        .map(img => img.getAttribute("src")));
      assert.deepEqual(leaked, [], `residential 1440px: no partially loaded image is visible at ${tick * 100}ms`);
      samples++;
    }
    results.push({ case: "r6-no-partial-image", samples });
    await context.close();
  }

  // R6: reduced motion không lướt, khung sáng tối nhẹ.
  {
    const { context, page } = await open({ viewport: viewports[1], delay: 3000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(base + "/vi/about/", { waitUntil: "domcontentloaded" });
    const frames = await page.evaluate(() => [...document.querySelectorAll(".media-gate :not(picture):has(> img[src^=\"/assets/content/\"], > picture > img[src^=\"/assets/content/\"]):not(.is-media-settled)")]
      .map(frame => { const style = getComputedStyle(frame, "::before"); return `${style.animationName} ${style.animationDuration} ${style.animationIterationCount}`; }));
    // Reset reduced motion toàn cục không được cắt nhịp thở 2s còn 0.01ms.
    assert.ok(frames.length && frames.every(value => value === "media-breathe 2s infinite"), `about reduced motion: frames breathe instead of sweeping ${JSON.stringify(frames)}`);
    results.push({ case: "r6-reduced-motion", frames: frames.length });
    await context.close();
  }

  // R6: vệt dừng ở giữa khung 1440×600, độ sáng mượt, không mép sắc hay điểm gãy.
  {
    // Lấy gradient thật từ khung đang chờ rồi vẽ lại trên probe đứng yên.
    const { context, page } = await open({ viewport: { width: 1440, height: 900 }, delay: 3000 });
    await page.goto(base + "/vi/about/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      const frame = document.querySelector(".media-gate :not(picture):has(> img[src^=\"/assets/content/\"], > picture > img[src^=\"/assets/content/\"]):not(.is-media-settled)");
      const sweep = getComputedStyle(frame, "::before").backgroundImage;
      document.body.insertAdjacentHTML("beforeend", `<style>#sweep-probe{position:fixed;inset:0 auto auto 0;z-index:2147483647;width:1440px;height:600px;overflow:clip;background:#2b2c2b}#sweep-probe::before{position:absolute;inset:0 auto 0 0;width:400%;content:"";background-image:${sweep};transform:translateX(-37.5%)}</style><div id="sweep-probe"></div>`);
    });
    const { default: sharp } = await import("sharp");
    const { data, info } = await sharp(await page.locator("#sweep-probe").screenshot()).raw().toBuffer({ resolveWithObject: true });
    const row = Array.from({ length: info.width }, (_, x) => data[(300 * info.width + x) * info.channels]);
    const peak = Math.max(...row), center = row.indexOf(peak);
    // Dither gradient khác nhau giữa headless shell, Chrome và Edge (nhiễu 1-2 mức sáng, 0.0417 slope mỗi mức ở bước 24px);
    // trung bình trượt 48px bỏ nhiễu đó mà vẫn giữ điểm gãy thật (đoạn dốc 0.3 mức/px vẫn ra 0.15).
    const smooth = row.map((_, x) => { const part = row.slice(Math.max(0, x - 24), x + 24); return part.reduce((a, b) => a + b, 0) / part.length; });
    const slopes = [];
    for (let x = 24; x < smooth.length; x += 24) slopes.push((smooth[x] - smooth[x - 24]) / 24);
    const maxStep = Math.max(...row.slice(1).map((value, x) => Math.abs(value - row[x])));
    const maxSlopeJump = Math.max(...slopes.slice(1).map((slope, i) => Math.abs(slope - slopes[i])));
    // Chromium dither gradient nên pixel kề có thể lệch ngược 1 mức; xét chiều tăng giảm với dung sai đó.
    const monotonic = row.every((value, x) => x === 0 || (x <= center ? value >= row[x - 1] - 1 : value <= row[x - 1] + 1));
    assert.ok(peak >= 75 && peak <= 79 && Math.min(...row) === 43, `sweep peak ${peak} within 75-79 on #2b2c2b`);
    assert.ok(monotonic && maxStep <= 1, `sweep rises then falls without hard edges (max step ${maxStep})`);
    assert.ok(maxSlopeJump <= 0.1, `sweep has no brightness kink (max slope jump ${maxSlopeJump})`);
    results.push({ case: "r6-sweep-smooth", peak, maxStep, maxSlopeJump });
    await context.close();
  }

  // R2: variant đủ nét cho phần ảnh hiện ra sau crop cover, hoặc ảnh gốc; không request trùng.
  for (const [route, selector, viewport] of [
    ["/vi/residential/", ".detail-gallery__item img", { ...viewports[1], deviceScaleFactor: 1 }],
    ["/vi/residential/", ".detail-gallery__item img", { ...viewports[1], deviceScaleFactor: 2 }],
    ["/vi/", ".project-card__media img", { ...viewports[0], deviceScaleFactor: 3 }],
  ]) {
    const { context, page, counts } = await open({ viewport });
    await page.goto(base + route, { waitUntil: "load" });
    await scrollThrough(page);
    await settle(page);
    const label = `${route} ${viewport.width}px DPR ${viewport.deviceScaleFactor}`;
    const images = await page.evaluate(selector => [...document.querySelectorAll(selector)].filter(img => img.currentSrc).map(img => {
      const { width, height } = img.getBoundingClientRect();
      const shown = Math.max(width, height * img.getAttribute("width") / img.getAttribute("height")) * devicePixelRatio;
      const variant = Number(img.currentSrc.match(/-(\d+)\.\w+$/)?.[1]);
      return { src: img.getAttribute("src"), shown: Math.round(shown), loaded: variant || "original", sharp: !variant || variant >= 0.9 * shown };
    }), selector);
    assert.ok(images.length, `${label}: ${selector} images loaded`);
    assert.deepEqual(images.filter(image => !image.sharp), [], `${label}: each image loads a variant of at least 0.9x its cropped visible width`);
    assert.deepEqual([...counts].filter(([, count]) => count > 1), [], `${label}: no duplicate image requests`);
    results.push({ case: "r2-crop-sizes", route, width: viewport.width, dpr: viewport.deviceScaleFactor, images: images.length });
    await context.close();
  }

  // P8: no-script vẫn hiện mọi ảnh.
  for (const route of routes.filter(route => route.startsWith("/vi/"))) {
    const { context, page } = await open({ delay: false, javaScriptEnabled: false });
    await page.goto(base + route, { waitUntil: "load" });
    await scrollThrough(page);
    await settle(page);
    const images = await snapshot(page);
    for (const item of images.filter(item => item.columnVisible)) assert.ok(item.ready && item.opacity > 0, `${route} no-script: ${item.src} is visible`);
    results.push({ case: "p8-no-script", route, images: images.length });
    await context.close();
  }

  // P8: Barba navigation và Back giữ cùng frame contract.
  {
    const { context, page } = await open();
    await page.goto(base + "/vi/", { waitUntil: "load" });
    await settle(page, true);
    const origin = await page.evaluate(() => performance.timeOrigin);
    await page.evaluate(() => document.querySelector('a[href="/vi/residential/"]').click());
    await page.waitForFunction(() => location.pathname === "/vi/residential/" && !window.barba?.transitions.isRunning);
    const soft = await snapshot(page);
    assert.ok(soft.length && soft.every(item => item.w > 0 && item.h > 0), "Barba entry reserves frames");
    assert.equal(await page.evaluate(() => performance.timeOrigin), origin, "residential entry is a soft navigation");
    await settle(page, true);
    await page.goBack();
    await page.waitForFunction(() => location.pathname === "/vi/" && !window.barba?.transitions.isRunning);
    await settle(page, true);
    const back = await snapshot(page);
    assert.ok(back.length && back.every(item => item.w > 0 && item.h > 0), "Back restores reserved frames");
    results.push({ case: "p8-barba-back", soft: soft.length, back: back.length });
    await context.close();
  }

  // P9: card Advertising, geometry và viewer trong khi ảnh đang tải.
  const primaryReveals = [];
  for (const viewport of viewports) {
    // Delay dài hơn để entry layout settle khi ảnh card còn đang bay.
    const { context, page, counts } = await open({ viewport, delay: 4000 });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    // Reveal Kính (loading-glass-and-page-entry R2, R4; glass-surface R6): record each one as it mounts.
    await page.evaluate(() => {
      window.__ttRevealGlass = [];
      new MutationObserver((records) => records.forEach(({ addedNodes }) => addedNodes.forEach((node) => {
        if (!node.matches?.(".glass-surface[data-glass-reveal]")) return;
        window.__ttRevealGlass.push({
          // Card related cũng nằm trong photo view; Kính của nó là Kính card, không phải primary.
          host: node.closest("[data-advertising-card], [data-advertising-related-card]") ? "card" : "primary",
          card: node.closest("[data-advertising-card]")?.dataset.advertisingCard,
          steps: node.querySelectorAll(".glass-surface__step").length,
          end: Math.max(...[...node.children].flatMap((layer) => layer.getAnimations()
            .map((animation) => animation.effect.getComputedTiming().endTime))),
          animated: [...new Set([...node.children].flatMap((layer) => layer.getAnimations()
            .flatMap((animation) => animation.effect.getKeyframes().flatMap((frame) => Object.keys(frame)))))]
            .filter((key) => !["offset", "computedOffset", "easing", "composite"].includes(key)),
        });
      }))).observe(document.body, { childList: true, subtree: true });
    });
    const revealGlass = (host) => page.evaluate((name) => window.__ttRevealGlass.filter((glass) => glass.host === name), host);
    await page.waitForFunction(() => window.TruongThinhAdvertising?.getBrowseState?.()?.seed
      && document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaReady === "true");
    const geometry = () => page.evaluate(() => ({
      cards: [...document.querySelectorAll("[data-advertising-card]")].map(node => [node.dataset.advertisingCard, node.style.left, node.style.top]),
      cta: document.querySelector("[data-advertising-grid-cta]")?.offsetTop,
      footer: document.querySelector("footer.site-footer")?.offsetTop,
      filters: [...document.querySelectorAll("[data-advertising-filter]")].map(node => [node.offsetLeft, node.offsetTop]),
    }));
    await page.waitForFunction(() => document.querySelector("[data-project-grid] img.lazyloading"));
    await page.waitForFunction(() => document.querySelector("[data-project-grid] [data-advertising-loading-skeleton].is-entry-ready"));
    const loading = await page.evaluate(() => {
      const frame = document.querySelector("[data-project-grid] [data-advertising-loading-skeleton].is-entry-ready");
      const box = frame.getBoundingClientRect();
      const media = frame.parentElement.getBoundingClientRect();
      return { covers: [box.left - media.left, box.top - media.top, box.width - media.width, box.height - media.height].every(gap => Math.abs(gap) <= 1),
        busy: Boolean(frame.parentElement.querySelector("img.lazyloading, img.lazyload")) };
    });
    assert.deepEqual(loading, { covers: true, busy: true }, `${viewport.width}px: loading card wears the skeleton frame as it enters view`);
    let duringLoad = await geometry();
    for (let previous; JSON.stringify(previous) !== JSON.stringify(duringLoad); duringLoad = await geometry()) {
      previous = duringLoad;
      await page.waitForTimeout(400);
    }
    assert.ok(await page.evaluate(() => document.querySelector("[data-project-grid] img.lazyloading")), `${viewport.width}px: geometry sampled while images load`);
    await page.waitForFunction(() => !document.querySelector("[data-project-grid] img.lazyloading"), null, { timeout: 30_000 });
    const loaded = await geometry();
    assert.deepEqual(loaded, duringLoad, `${viewport.width}px: grid, CTA, footer and filters keep geometry while images load`);
    const cardCount = loaded.cards.length;
    const cardRequests = counts.size;
    assert.ok(cardRequests <= cardCount && cardCount < 154, `${viewport.width}px: lazy window bounds requests (${cardRequests} for ${cardCount} rendered cards)`);
    // Reveal kết thúc 0.6 s sau khi ảnh cuối tải xong, rồi node skeleton bị gỡ.
    await page.waitForFunction(() => !document.querySelector("[data-project-grid] [data-advertising-loading-skeleton]"), null, { timeout: 5000 })
      .catch(() => assert.fail(`${viewport.width}px: loaded cards drop the skeleton`));
    const cardGlass = await revealGlass("card");
    assert.ok(cardGlass.length && cardGlass.every(({ steps, animated, end }) => steps === 5 && animated.join() === "opacity" && end <= 601),
      `${viewport.width}px: loading cards reveal through five Kính steps in 0.6 s, opacity only ${JSON.stringify(cardGlass.slice(0, 3))}`);
    assert.equal(await page.evaluate(() => document.querySelectorAll("[data-project-grid] .glass-surface[data-glass-reveal]").length), 0,
      `${viewport.width}px: the reveal Kính leaves the cards`);
    // Card đã tải xong rời viewport hiện lại ngay: không Kính, không skeleton (R3).
    const loadedIds = await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-advertising-card]")]
      .filter((card) => card.querySelector("img")?.naturalWidth > 0).map((card) => card.dataset.advertisingCard));
    const revealsBefore = cardGlass.length;
    const scrollTo = (y) => page.evaluate((top) => window.TruongThinhMotion.setLogicalScroll(top), y);
    await scrollTo(4000);
    await page.waitForTimeout(600);
    // Lấy mẫu mỗi frame trong 1 s sau khi cuộn về: card đã tải gắn lại không có frame nào mang skeleton hay opacity
    // dở dang (mờ dần), bản cache hiện thẳng ở opacity cuối (R3).
    const fades = await page.evaluate(async (ids) => {
      const seen = [];
      window.TruongThinhMotion.setLogicalScroll(0);
      const startedAt = performance.now();
      while (performance.now() - startedAt < 1000) {
        await new Promise(requestAnimationFrame);
        for (const card of document.querySelectorAll("[data-project-grid] [data-advertising-card]")) {
          const { top, bottom } = card.getBoundingClientRect();
          if (!ids.includes(card.dataset.advertisingCard) || bottom <= 0 || top >= innerHeight) continue;
          const opacity = Number.parseFloat(getComputedStyle(card.querySelector("img")).opacity);
          if (card.querySelector("[data-advertising-loading-skeleton]") || (opacity > 0.02 && opacity < 0.98)) {
            seen.push({ id: card.dataset.advertisingCard, opacity, at: Math.round(performance.now() - startedAt) });
          }
        }
      }
      return seen;
    }, loadedIds);
    assert.deepEqual(fades.slice(0, 5), [], `${viewport.width}px: a re-entering loaded card shows at once, no skeleton or fade`);
    const inView = () => page.evaluate((ids) => [...document.querySelectorAll("[data-project-grid] [data-advertising-card]")]
      .filter((card) => ids.includes(card.dataset.advertisingCard))
      .filter((card) => { const { top, bottom } = card.getBoundingClientRect(); return bottom > 0 && top < innerHeight; })
      .map((card) => ({ id: card.dataset.advertisingCard, skeleton: Boolean(card.querySelector("[data-advertising-loading-skeleton]")),
        opacity: getComputedStyle(card.querySelector("img")).opacity })), loadedIds);
    let reentry = [];
    for (let tries = 0; tries < 50; tries += 1) {
      reentry = await inView();
      if (reentry.length && reentry.every(({ skeleton, opacity }) => !skeleton && opacity === "1")) break;
      await page.waitForTimeout(200);
    }
    assert.ok(reentry.length, `${viewport.width}px: loaded cards are back in view`);
    assert.deepEqual(reentry.filter(({ skeleton, opacity }) => skeleton || opacity !== "1"), [],
      `${viewport.width}px: a re-entering loaded card shows without skeleton`);
    const reentryGlass = (await revealGlass("card")).slice(revealsBefore).filter(({ card }) => loadedIds.includes(card));
    assert.deepEqual(reentryGlass, [], `${viewport.width}px: a re-entering loaded card starts no Kính reveal`);
    // Card vừa tải xong ngay lúc này vẫn reveal từ skeleton của nó; để chúng settle trước.
    await page.waitForTimeout(700);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-advertising-loading-skeleton]")]
      .filter((frame) => frame.parentElement.querySelector("img")?.naturalWidth > 0)
      .map((frame) => [frame.closest("[data-advertising-card]").dataset.advertisingCard, frame.parentElement.querySelector("img").className,
        Boolean(frame.parentElement.querySelector("[data-glass-reveal]")), Math.round(frame.getBoundingClientRect().top)])), [],
    `${viewport.width}px: a loaded card re-enters without a skeleton`);

    // Viewer: skeleton và aria-busy theo photo hiện tại, kể cả hero swap nhanh.
    const viewer = () => page.evaluate(() => {
      const frame = document.querySelector("[data-advertising-photo-image]").parentElement;
      return { photo: window.TruongThinhAdvertising.getBrowseState().photo, busy: frame.getAttribute("aria-busy"), skeleton: Boolean(frame.querySelector("[data-advertising-loading-skeleton]")),
        glass: Boolean(frame.querySelector(".glass-surface[data-glass-reveal]")), src: document.querySelector("[data-advertising-photo-image]").currentSrc };
    });
    await page.locator("[data-advertising-card] a").first().click();
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-image]")?.parentElement.getAttribute("aria-busy") === "true"
      && document.querySelector("[data-advertising-photo-image]").parentElement.querySelector("[data-advertising-loading-skeleton]"));
    const first = await viewer();
    assert.ok(first.photo && first.skeleton, `${viewport.width}px: viewer shows the skeleton while primary loads`);
    await page.waitForFunction(() => document.querySelector("[data-advertising-related-card] > a"));
    const relatedId = await page.evaluate(() => {
      const card = [...document.querySelectorAll("[data-advertising-related-card]")].find(node => node.querySelector("a") && node.getBoundingClientRect().height);
      card.querySelector("a").click();
      return card.dataset.advertisingRelatedCard;
    });
    await page.waitForFunction(id => window.TruongThinhAdvertising.getBrowseState().photo === id, relatedId);
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-image]").parentElement.hasAttribute("aria-busy")
      && document.querySelector("[data-advertising-photo-image]").complete, null, { timeout: 30_000 });
    await page.waitForTimeout(DELAY + 300);
    const swapped = await viewer();
    assert.equal(swapped.photo, relatedId);
    assert.deepEqual({ busy: swapped.busy, skeleton: swapped.skeleton, glass: swapped.glass }, { busy: null, skeleton: false, glass: false },
      `${viewport.width}px: earlier photo leaves no stale skeleton or Kính`);
    const primaryGlass = await revealGlass("primary");
    // loading-glass-and-page-entry R4: phone và PC cùng Kính năm bậc.
    assert.ok(primaryGlass.length && primaryGlass.every(({ steps, animated }) => steps === 5 && animated.join() === "opacity"),
      `${viewport.width}px: the primary reveals through five Kính steps animating opacity only ${JSON.stringify(primaryGlass)}`);
    // Back về ảnh đầu cũng đổi ảnh tại chỗ qua Kính (R4).
    await page.goBack();
    await page.waitForFunction(id => window.TruongThinhAdvertising.getBrowseState().photo === id
      && !document.querySelector("[data-advertising-photo-image]").parentElement.hasAttribute("aria-busy"), first.photo);
    primaryReveals.push(await revealGlass("primary"));
    await page.goBack();
    await page.waitForFunction(() => window.TruongThinhAdvertising.getBrowseState().photo === null);
    assert.equal(await page.evaluate(() => document.querySelectorAll("[data-advertising-photo-view] [data-advertising-loading-skeleton]").length), 0, `${viewport.width}px: closing the viewer clears the skeleton`);
    assert.deepEqual((await geometry()).filters, loaded.filters, `${viewport.width}px: history return keeps filters`);
    results.push({ case: "p9-advertising", width: viewport.width, cardCount, cardRequests, first: first.photo, swapped: relatedId });
    await context.close();
  }
  // Phone và PC cùng chuỗi Kính trên primary: số lượt, số bậc, thời lượng, thuộc tính animate.
  assert.deepEqual(primaryReveals[0], primaryReveals[1], `phone primary reveals match PC ${JSON.stringify(primaryReveals)}`);
  // Barba dựng container ngoài document: ảnh load xong trước khi gắn vào vẫn phải settle, không kẹt vệt sáng.
  for (const route of ["/vi/commercial/", "/vi/residential/"]) {
    const { context, page } = await open({ delay: 0, viewport: viewports[1] });
    await page.goto(base + "/vi/", { waitUntil: "load" });
    // Click sớm thì ảnh có thể load sau khi gắn vào nên không tái hiện lỗi; chờ như người xem thật.
    await page.waitForTimeout(2000);
    await page.locator(`a[href="${route}"]`).first().click();
    await page.waitForFunction(() => document.querySelector(".detail-hero .hero-slide.is-active picture"));
    await page.waitForFunction(() => document.querySelector(".detail-hero .hero-slide.is-active picture").classList.contains("is-media-settled"), null, { timeout: 5000 })
      .catch(() => assert.fail(`${route}: hero after soft navigation stays unsettled`));
    results.push({ case: "soft-nav-hero-settled", route });
    await context.close();
  }
  console.log("PASS image loading frame: " + results.length + " cases");
} finally {
  await fs.writeFile(output + "/results.json", JSON.stringify(results, null, 2));
  await browser.close();
}
