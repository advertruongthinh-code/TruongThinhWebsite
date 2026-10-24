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
  // Bậc nhòe dựng sẵn của reveal phủ đủ frame, kể cả photo contain: left/top không nhân scale(8) từng chỉ phủ một phần.
  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 900 } });
    try {
      await page.route("**/*.avif", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await route.continue();
      });
      await page.goto(`${origin}/vi/advertising-products/?category=kiosk-posm&photo=kiosk-posm-11`);
      await page.waitForSelector(".glass-surface__step--baked > canvas", { state: "attached", timeout: 20000 });
      const boxes = await page.evaluate(() => {
        const box = (node) => { const { x, y, width, height } = node.getBoundingClientRect(); return [x, y, width, height]; };
        const frame = document.querySelector(".advertising-photo-view__hero-frame");
        const canvases = [...frame.querySelectorAll(".glass-surface__step--baked > canvas")];
        // Độ gắt hàng mép trên canvas (vùng dư, photo contain cách mép trên): tổng chênh màu giữa hai pixel kề nhau.
        const edge = (canvas) => {
          const data = canvas.getContext("2d").getImageData(0, 1, canvas.width, 1).data;
          let total = 0;
          for (let x = 4; x < data.length; x += 4) total += Math.abs(data[x] - data[x - 4]) + Math.abs(data[x + 1] - data[x - 3]);
          return total / canvas.width;
        };
        return { frame: box(frame), canvases: canvases.map(box), lightEdge: edge(canvases[0]), heavyEdge: edge(canvases.at(-1)),
          band: document.querySelector("[data-advertising-photo-view]").dataset.advertisingPhotoGlass };
      });
      check(boxes.canvases.length && boxes.canvases.every((canvas) => canvas.every((value, index) =>
        index < 2 ? Math.abs(value - boxes.frame[index]) <= 1 : value >= boxes.frame[index] - 1)),
      `baked reveal glass does not cover the primary frame ${JSON.stringify(boxes)}`);
      // Vùng zoom blur luôn blur đủ (owner 2026-10-24): vùng dư của bậc nhẹ nhòe như bậc nặng, nên lúc tan không lộ ảnh
      // zoom gần nét (trước sửa bậc nhẹ gắt gấp 5 lần).
      check(boxes.band === "true" && boxes.lightEdge <= boxes.heavyEdge * 1.5,
        `baked reveal light step shows a sharper zoom blur band ${JSON.stringify(boxes)}`);
      await page.waitForFunction(() => !document.querySelector(".glass-surface__step--baked"), null, { timeout: 20000 });
      // Mỗi frame khi mở related: hai bậc nặng còn trong suốt thì ảnh và bậc nhẹ chưa hiện, vì canvas trong suốt để lộ lớp
      // dưới, ảnh mới hiện gần nét trước rồi mới nhòe (owner 2026-10-24).
      const reveal = await page.evaluate(() => new Promise((resolve) => {
        const result = { frames: 0, leaks: [] };
        const opacity = (node) => Number(getComputedStyle(node).opacity);
        const started = performance.now();
        const tick = () => {
          const canvases = [...document.querySelectorAll(".glass-surface__step--baked > canvas")];
          if (canvases.length) {
            const heavy = Math.min(...canvases.slice(-2).map(opacity));
            const under = [document.querySelector("[data-advertising-photo-image]"), ...canvases.slice(0, -2)].map(opacity);
            result.frames += 1;
            if (heavy < 0.999 && under.some((value) => value > 0)) result.leaks.push({ heavy, under });
          } else if (result.frames) return resolve(result);
          if (performance.now() - started < 8000) requestAnimationFrame(tick);
          else resolve(result);
        };
        requestAnimationFrame(tick);
        document.querySelector("[data-advertising-related-card] a").click();
      }));
      check(reveal.frames > 5 && !reveal.leaks.length, `new photo shows through a translucent veil ${JSON.stringify(reveal).slice(0, 400)}`);
    } finally {
      await page.close();
    }
  }
  assert.deepEqual(failures, [], "Kính contract");
  process.stdout.write("[glass-surface] arc and even Kính passed\n");
} finally {
  await browser.close();
}
