// Kính trong Chromium (docs/specs/glass-surface.md R1-R4, R8): cung ở cuối masonry, Kính đều quanh primary.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");
const { default: sharp } = await import("sharp");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
// Pha Kính tăng của reveal 0.6s: 0 tới 0.26s (loading-glass-and-page-entry R2).
const GLASS_RISE_MS = 260;
// GPU compositing (SwiftShader) như Chrome thật; software compositing blur backdrop của từng layer riêng.
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  args: ["--enable-gpu-rasterization", "--ignore-gpu-blocklist", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

const arcState = () => {
  const glass = document.querySelector(".project-index > .glass-surface[data-glass-shape=arc]");
  const box = glass.getBoundingClientRect();
  const steps = [...glass.querySelectorAll(".glass-surface__step:not(.glass-surface__step--full):not(.glass-surface__step--inner)")];
  const top = (node) => Number.parseFloat(node.style.top);
  const copy = document.querySelector("[data-advertising-grid-cta] .detail-cta__copy");
  const parallax = new DOMMatrixReadOnly(getComputedStyle(copy).transform).m42;
  const tint = glass.querySelector(".glass-surface__tint");
  // Element được render có box riêng mang backdrop filter; Kính đều của photo view ẩn và
  // ::backdrop của viewer đóng không được render.
  const owners = [...new Set([...document.querySelectorAll("*")].filter((node) => node.checkVisibility())
    .flatMap((node) => [null, "::before", "::after"]
    .filter((pseudo) => !["none", ""].includes(getComputedStyle(node, pseudo).backdropFilter))
    .map((pseudo) => `${node.className}${pseudo || ""}`)))];
  const boxStyle = getComputedStyle(glass);
  return {
    hidden: glass.hidden, width: box.width, owners,
    box: { opacity: boxStyle.opacity, mask: boxStyle.maskImage, filter: boxStyle.filter },
    s0: top(steps[0]), sLast: top(steps.at(-1)),
    centreX: Number.parseFloat(steps[0].style.maskImage.match(/circle at ([\d.]+)px/)[1]),
    centreY: top(steps[0]) + Number.parseFloat(steps[0].style.maskImage.match(/circle at [\d.]+px ([\d.]+)px/)[1]),
    clusterTop: copy.querySelector("h2").getBoundingClientRect().top - box.top - parallax,
    clusterBottom: copy.getBoundingClientRect().bottom - box.top - parallax,
    realBottom: Number(document.querySelector("[data-advertising-cta-skeleton]").dataset.advertisingCtaRealBottom),
    cardWidth: document.querySelector("[data-advertising-cta-frame]").getBoundingClientRect().width,
    batchBottom: top(tint) + Number.parseFloat(tint.style.height) - 2,
    batchBottomOnScreen: box.top + top(tint) + Number.parseFloat(tint.style.height) - 2,
    grain: [getComputedStyle(glass).getPropertyValue("--glass-grain"), getComputedStyle(glass).getPropertyValue("--glass-grain-white")],
    grainBlend: getComputedStyle(glass.querySelector(".glass-surface__grain")).mixBlendMode,
  };
};

const failures = [];
const check = (condition, message) => condition || failures.push(message);

try {
  for (const [locale, width, height, scale, reducedMotion] of [
    ["vi", 1440, 900, 1, "no-preference"], ["en", 390, 844, 3, "no-preference"], ["vi", 844, 390, 3, "no-preference"],
    ["vi", 1280, 720, 1, "reduce"],
  ]) {
    const label = `${locale} ${width}x${height} ${reducedMotion}`;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale, reducedMotion });
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    try {
      await page.goto(`${origin}/${locale}/advertising-products/`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaReady === "true");
      // Lazy card phía trên có thể làm trang lớn thêm, nên cuộn đến cuối cho đến khi nó settle.
      for (let pass = 0, last = -1; pass < 8; pass += 1) {
        const end = await page.evaluate(() => document.documentElement.scrollHeight);
        if (end === last) break;
        last = end;
        await page.evaluate((y) => window.TruongThinhMotion.setLogicalScroll(y), end);
        await page.waitForTimeout(800);
      }
      await page.waitForTimeout(1200);
      const state = await page.evaluate(arcState);
      check(!state.hidden, `${label}: arc Kính hidden at the masonry end`);
      check(Math.abs(state.width - width) <= 1, `${label}: arc Kính does not span the viewport (${state.width}px)`);
      // Các band step, core của cung và các inner step của nó.
      check(JSON.stringify(state.owners.sort()) === JSON.stringify(["glass-surface__step", "glass-surface__step glass-surface__step--full", "glass-surface__step glass-surface__step--inner"]),
        `${label}: R1 backdrop-filter outside the Kính steps ${JSON.stringify(state.owners)}`);
      check(state.box.opacity === "1" && state.box.mask === "none" && state.box.filter === "none",
        `${label}: R1 Kính box cuts its steps off from the page ${JSON.stringify(state.box)}`);
      // Step 0 bắt đầu ở biên band, step cuối trong ba ở 1/3 + 0.1 band, cả hai trên apex yIn.
      const band = (state.sLast - state.s0) / (2 / 3 - 0.1);
      const yIn = state.s0 + band;
      const cluster = state.clusterBottom - state.clusterTop;
      // R2: apex ở -15% cụm CTA (trên mép tiêu đề), phone giữ +35%; chỉ nâng để giữ hai ramp trắng thuần
      // (mỗi ramp 0.35 độ rộng card) trên đáy batch.
      const phone = await page.evaluate(() => matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0);
      const apexShare = phone ? 0.35 : -0.15;
      check(Math.abs(yIn - Math.min(state.clusterTop + apexShare * cluster, state.batchBottom - 0.7 * state.cardWidth)) <= 2,
        `${label}: R2 apex ${yIn.toFixed(1)} is not at ${apexShare * 100}% of the CTA cluster ${state.clusterTop.toFixed(1)}..${state.clusterBottom.toFixed(1)}`);
      check(state.s0 >= state.realBottom - 1, `${label}: R2 band edge ${state.s0} rises above the real photos ${state.realBottom}`);
      check(Math.abs(band - 1.75 * cluster) <= 2 || Math.abs(state.s0 - state.realBottom) <= 1,
        `${label}: R2 band ${band.toFixed(1)} is not 1.75 cluster heights`);
      check(Math.abs(state.centreX - width / 2) <= 1, `${label}: R2 arc centre ${state.centreX} is off the middle of the screen`);
      check(Math.abs(state.centreY - yIn - 3.5 * width) <= 1 || state.centreY - yIn > 3.5 * width,
        `${label}: R2 radius ${(state.centreY - yIn).toFixed(1)} under 3.5 viewport widths`);
      // R4: grain của cung là white noise blend bình thường (layer blend làm mất blur của các step trong Chromium).
      check(state.grain.every((url) => url.startsWith("url(blob:")) && state.grainBlend === "normal", `${label}: R4 grain missing`);
      // R3, R4: hàng cuối trên đáy batch (các góc nằm trên vòng tròn trắng thuần) vẫn trắng
      // trong 1/255 và không có grain.
      const shot = await page.screenshot({ clip: { x: 0, y: Math.floor(state.batchBottomOnScreen) - 1, width, height: 1 } });
      const { data } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const darkest = data.reduce((min, value) => Math.min(min, value), 255);
      check(darkest >= 254, `${label}: R3 batch bottom is not pure white (darkest channel ${darkest})`);
      // Đường trên của footer (0.18 ink trên nền trắng) vẫn nằm trên các layer cung chạy dưới nó.
      const footerTop = await page.evaluate(() => document.querySelector(".site-footer").getBoundingClientRect().top);
      const line = await page.screenshot({ clip: { x: 0, y: footerTop, width, height: 1 } });
      const lineData = (await sharp(line).removeAlpha().raw().toBuffer()).reduce((min, value) => Math.min(min, value), 255);
      check(lineData <= 230, `${label}: footer top line hidden by the arc Kính (darkest channel ${lineData})`);
      if (width === 1440) {
        // R2: sọc đen và trắng dưới core, dưới copy CTA, bị blur mất (cạnh sắc nhảy khoảng 255).
        const stripesTop = await page.evaluate(() => {
          const skeleton = document.querySelector("[data-advertising-cta-skeleton]");
          const bottom = document.querySelector(".project-index > .glass-surface[data-glass-shape=arc] .glass-surface__tint").getBoundingClientRect().bottom;
          const node = Object.assign(document.createElement("div"), { id: "glass-stripes" });
          Object.assign(node.style, { position: "absolute", left: "0", width: "300px", height: "200px",
            top: `${bottom - skeleton.getBoundingClientRect().top - 200}px`, background: "repeating-linear-gradient(90deg, #000 0 40px, #fff 40px 80px)" });
          skeleton.append(node);
          return bottom - 200;
        });
        await page.waitForTimeout(600);
        const shot = await page.screenshot({ clip: { x: 0, y: stripesTop, width: 300, height: 160 } });
        const pixels = await sharp(shot).removeAlpha().greyscale().raw().toBuffer();
        let step = 0;
        for (let index = 0; index < pixels.length - 4; index += 1) if (index % 300 < 296) step = Math.max(step, Math.abs(pixels[index] - pixels[index + 4]));
        check(step <= 30, `${label}: R2 stripes under the arc core stay sharp (4px step ${step})`);
        await page.evaluate(() => document.getElementById("glass-stripes").remove());
      }
      check(!errors.length, `${label}: page errors ${errors.join(" | ")}`);
    } finally {
      await page.close();
    }
  }

  // Kính đều quanh primary: chỉ bật khi photo contained còn chỗ.
  for (const [width, height, photo, overflow] of [[1440, 900, "kiosk-posm-09", true], [390, 844, "kiosk-posm-28", false]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    try {
      await page.goto(`${origin}/vi/advertising-products/?category=kiosk-posm&photo=${photo}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      const state = await page.evaluate(() => {
        const glass = document.querySelector(".advertising-photo-view__hero-frame > .glass-surface");
        return { shape: glass?.dataset.glassShape, display: glass && getComputedStyle(glass).display,
          layers: glass?.children.length, flag: document.querySelector("[data-advertising-photo-view]").dataset.advertisingPhotoGlass,
          backdrop: [...(glass?.children || [])].some((layer) => getComputedStyle(layer).backdropFilter !== "none"),
          filter: getComputedStyle(document.querySelector("[data-advertising-photo-background]")).filter };
      });
      // Photo tự mang blur, nên không backdrop-filter nào có thể in tile seam vào primary (thumbnail hover của tab).
      check(state.shape === "even" && state.layers === 2 && !state.backdrop
        && state.filter === "blur(100px) saturate(1.7) brightness(1.04)", `${photo}: primary Kính is not the even component ${JSON.stringify(state)}`);
      check(state.flag === String(overflow) && state.display === (overflow ? "block" : "none"),
        `${photo}: primary Kính does not follow contain overflow ${JSON.stringify(state)}`);
    } finally {
      await page.close();
    }
  }
  // Primary đổi ảnh chạy đúng motion card tải chậm (loading-glass-and-page-entry R4): ảnh cũ ẩn ngay dưới skeleton, Kính
  // ba bậc tăng, ảnh hiện dưới Kính, Kính tan. Ảnh tải chậm (related) và ảnh có sẵn (Back) cùng chuỗi, cùng nhịp với card.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      let slow = false;
      await page.route("**/*.avif", async (route) => {
        if (slow) await new Promise((resolve) => setTimeout(resolve, 800));
        await route.continue();
      });
      // Nhịp mỗi Kính reveal lúc gắn: delay, duration, easing của từng lớp Kính, ảnh và skeleton dưới nó.
      await page.addInitScript(() => {
        window.__ttRevealTimings = [];
        new MutationObserver((records) => records.forEach(({ addedNodes }) => addedNodes.forEach((glass) => {
          if (!glass.matches?.(".glass-surface[data-glass-reveal]")) return;
          const host = glass.parentElement;
          const nodes = [...glass.children, host.querySelector("[data-advertising-photo-image]") ?? host.querySelector("img"),
            host.querySelector("[data-advertising-loading-skeleton]")];
          window.__ttRevealTimings.push({
            host: glass.closest("[data-advertising-card], [data-advertising-related-card]") ? "card" : "primary",
            timing: nodes.map((node) => node?.getAnimations().map((animation) => {
              const { delay, duration, easing } = animation.effect.getComputedTiming();
              return [delay, duration, easing];
            })),
          });
        }))).observe(document, { childList: true, subtree: true });
      });
      const settled = () => page.waitForFunction(() => {
        const photo = document.querySelector("[data-advertising-photo-image]");
        return photo.complete && photo.naturalWidth && !photo.parentElement.hasAttribute("aria-busy")
          && !photo.parentElement.querySelector(".glass-surface[data-glass-reveal]");
      }, null, { timeout: 20000 });
      await page.goto(`${origin}/vi/advertising-products/?category=kiosk-posm&photo=kiosk-posm-11`);
      await settled();
      await page.waitForFunction(() => document.querySelector("[data-advertising-related-card] a"));
      // Ghi mỗi frame của khung primary từ lúc đổi ảnh tới khi Kính gỡ.
      const record = (action) => page.evaluate((action) => new Promise((resolve) => {
        const frame = document.querySelector(".advertising-photo-view__hero-frame");
        const photo = frame.querySelector("[data-advertising-photo-image]");
        const opacity = (node) => (node ? Number(getComputedStyle(node).opacity) : 0);
        const frames = [];
        const started = performance.now();
        const tick = () => {
          const glass = frame.querySelector(".glass-surface[data-glass-reveal]");
          const tint = glass?.querySelector(".glass-surface__tint");
          frames.push({ skeleton: Boolean(frame.querySelector("[data-advertising-loading-skeleton]")), glass: Boolean(glass),
            level: opacity(tint), photo: opacity(photo), at: performance.now(), time: tint?.getAnimations()[0]?.currentTime ?? 0 });
          if ((frames.some((entry) => entry.glass) && !glass) || performance.now() - started > 8000) resolve(frames);
          else requestAnimationFrame(tick);
        };
        // Card related có cover ảnh: video không có Kính reveal (loading-glass R4).
        if (action === "related") [...document.querySelectorAll("[data-advertising-related-card]")]
          .find((card) => card.querySelector("a") && !card.querySelector("video") && card.getBoundingClientRect().height).querySelector("a").click();
        else history.back();
        requestAnimationFrame(tick);
      }), action);
      const sequence = (frames) => {
        const skeleton = frames.findIndex((entry) => entry.skeleton);
        const glass = frames.findIndex((entry) => entry.glass);
        return {
          // Thời gian skeleton đứng trước Kính (ms): đếm frame thì rAF thưa làm hụt.
          waiting: skeleton >= 0 && glass >= 0 ? frames[glass].at - frames[skeleton].at : 0,
          // Skeleton gắn trước hoặc cùng frame Kính; ảnh mới chưa lộ trước Kính, Kính bắt đầu từ không nhòe.
          order: skeleton >= 0 && glass >= skeleton && frames.slice(skeleton, glass + 1).every((entry) => entry.photo === 0)
            && frames[glass].level < 0.2,
          // Pha Kính tăng (0 tới 0.26s của animation): ảnh không bao giờ đậm hơn Kính đang phủ. Lọc theo currentTime của
          // animation chứ không theo frame được lấy mẫu: rAF thưa thì mẫu "đỉnh" rơi vào pha Kính đã tan.
          underGlass: frames.filter((entry) => entry.glass && entry.time <= GLASS_RISE_MS)
            .every((entry) => entry.photo <= entry.level + 0.02),
          settled: frames.at(-1).photo === 1 && !frames.at(-1).skeleton,
        };
      };
      slow = true;
      const loading = sequence(await record("related"));
      await settled();
      slow = false;
      const cached = sequence(await record("back"));
      check(loading.waiting >= 300 && loading.order && loading.underGlass && loading.settled,
        `slow primary does not run skeleton, Kính, photo, settle ${JSON.stringify(loading)}`);
      check(cached.order && cached.underGlass && cached.settled, `cached primary differs from the slow sequence ${JSON.stringify(cached)}`);
      const timings = await page.evaluate(() => window.__ttRevealTimings);
      const primary = timings.filter(({ host }) => host === "primary").map(({ timing }) => JSON.stringify(timing));
      // Lần mở trang, related (tải chậm) và Back (có sẵn) cùng một nhịp.
      check(primary.length >= 3 && new Set(primary).size === 1, `cached and slow primary reveals use different timing ${primary.join(" | ")}`);
      // Card tải chậm trên masonry: cùng nhịp từng lớp với primary, nên hai chuỗi lệch nhau 0 frame.
      slow = true;
      await page.goto(`${origin}/vi/advertising-products/?category=kiosk-posm`);
      await page.waitForFunction(() => window.__ttRevealTimings.some(({ host }) => host === "card"), null, { timeout: 20000 });
      const card = await page.evaluate(() => JSON.stringify(window.__ttRevealTimings.find(({ host }) => host === "card").timing));
      check(card === primary[0], `primary reveal timing differs from the card ${card} | ${primary[0]}`);
    } finally {
      await page.close();
    }
  }
  assert.deepEqual(failures, [], "Kính contract");
  process.stdout.write("[glass-surface] arc and even Kính passed\n");
} finally {
  await browser.close();
}
