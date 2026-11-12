// Kính in Chromium (docs/specs/glass-surface.md R1-R4, R8): the arc at the end of masonry, even Kính around primary.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");
const { default: sharp } = await import("sharp");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
// GPU compositing (SwiftShader) like real Chrome; software compositing blurs the backdrop of each layer separately.
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  args: ["--enable-gpu-rasterization", "--ignore-gpu-blocklist", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

const arcState = () => {
  const glass = document.querySelector(".masonry-section > .glass-surface[data-glass-shape=arc]");
  const box = glass.getBoundingClientRect();
  const steps = [...glass.querySelectorAll(".glass-surface__step:not(.glass-surface__step--full)")];
  const top = (node) => Number.parseFloat(node.style.top);
  const copy = document.querySelector("[data-masonry-grid-cta] .detail-cta__copy");
  const parallax = new DOMMatrixReadOnly(getComputedStyle(copy).transform).m42;
  const tint = glass.querySelector(".glass-surface__tint");
  // A rendered element has its own box carrying the backdrop filter; the photo view's even Kính is hidden and
  // the ::backdrop of a closed viewer is not rendered.
  const owners = [...new Set([...document.querySelectorAll("*")].filter((node) => node.checkVisibility())
    .flatMap((node) => [null, "::before", "::after"]
    .filter((pseudo) => !["none", ""].includes(getComputedStyle(node, pseudo).backdropFilter))
    .map((pseudo) => `${node.className}${pseudo || ""}`)))];
  const boxStyle = getComputedStyle(glass);
  return {
    hidden: glass.hidden, width: box.width, owners,
    box: { opacity: boxStyle.opacity, mask: boxStyle.maskImage, filter: boxStyle.filter },
    s0: top(steps[0]), sLast: top(steps.at(-1)), visibleSteps: steps.filter((node) => getComputedStyle(node).display !== "none").length,
    tintStops: [...tint.style.background.matchAll(/rgba\(255, 255, 255, ([\d.]+)\) ([\d.]+)px/g)].map(([, alpha, px]) => [Number(alpha), Number(px)]),
    centreX: Number.parseFloat(steps[0].style.maskImage.match(/circle at ([\d.]+)px/)[1]),
    centreY: top(steps[0]) + Number.parseFloat(steps[0].style.maskImage.match(/circle at [\d.]+px ([\d.]+)px/)[1]),
    clusterTop: copy.querySelector("h2").getBoundingClientRect().top - box.top - parallax,
    clusterBottom: copy.getBoundingClientRect().bottom - box.top - parallax,
    realBottom: Number(document.querySelector("[data-masonry-cta-skeleton]").dataset.masonryCtaRealBottom),
    cardWidth: document.querySelector("[data-masonry-cta-frame]").getBoundingClientRect().width,
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
      await page.waitForFunction(() => document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaReady === "true");
      // A lazy card above can make the page grow, so scroll to the end until it settles.
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
      // The arc's band steps and core.
      check(JSON.stringify(state.owners.sort()) === JSON.stringify(["glass-surface__step", "glass-surface__step glass-surface__step--full"]),
        `${label}: R1 backdrop-filter outside the Kính steps ${JSON.stringify(state.owners)}`);
      check(state.box.opacity === "1" && state.box.mask === "none" && state.box.filter === "none",
        `${label}: R1 Kính box cuts its steps off from the page ${JSON.stringify(state.box)}`);
      // PC (non-touch branch): nine steps; step 0 starts at the band's outer edge, step 8 at off_8 = radius + band - (7.7 / 9)(4 / 3) band (the overlap is 1/3 of the band, owner 2026-11-01),
      // so sLast - s0 = (7.7 / 9)(4 / 3) band, both on the apex yIn.
      check(state.visibleSteps === 9, `${label}: R2 desktop arc shows ${state.visibleSteps} band steps, not 9`);
      const band = (state.sLast - state.s0) / ((7.7 / 9) * (4 / 3));
      const yIn = state.s0 + band;
      const cluster = state.clusterBottom - state.clusterTop;
      // R2: apex at -15% of the CTA cluster (above the title edge), phone keeps +35%; only raised to keep the two pure-white ramps
      // (each ramp 0.35 of the card width) on the batch bottom.
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
      // R3: white falls to 0 at 0.85 of the band width outside the arc, while the tint (minus grain) remains at the arc edge.
      const radius = state.centreY - yIn;
      const [lastAlpha, lastPx] = state.tintStops.at(-1);
      const atArc = state.tintStops.find(([, px]) => Math.abs(px - radius) < 0.5)?.[0];
      check(lastAlpha === 0 && Math.abs(lastPx - (radius + 0.85 * band)) <= 1, `${label}: R3 white does not reach 0 at 0.85 band (${lastAlpha} at ${lastPx}, radius ${radius})`);
      check(atArc > 0.5 && atArc < 0.55, `${label}: R3 tint at the arc is ${atArc}, not about 0.55`);
      // R4: the arc's grain is white noise with normal blend (a layer blend makes the steps lose blur in Chromium).
      check(state.grain.every((url) => url.startsWith("url(blob:")) && state.grainBlend === "normal", `${label}: R4 grain missing`);
      // R3, R4: the last row on the batch bottom (corners lie on the pure-white circle) stays white
      // within 1/255 and has no grain.
      const shot = await page.screenshot({ clip: { x: 0, y: Math.floor(state.batchBottomOnScreen) - 1, width, height: 1 } });
      const { data } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const darkest = data.reduce((min, value) => Math.min(min, value), 255);
      check(darkest >= 254, `${label}: R3 batch bottom is not pure white (darkest channel ${darkest})`);
      // The footer's top line (0.18 ink on a white background) still sits above the arc layers running beneath it.
      const footerTop = await page.evaluate(() => document.querySelector(".site-footer").getBoundingClientRect().top);
      const line = await page.screenshot({ clip: { x: 0, y: footerTop, width, height: 1 } });
      const lineData = (await sharp(line).removeAlpha().raw().toBuffer()).reduce((min, value) => Math.min(min, value), 255);
      check(lineData <= 230, `${label}: footer top line hidden by the arc Kính (darkest channel ${lineData})`);
      if (width === 1440) {
        // R2: black and white stripes under the core, under the CTA copy, are lost to blur (a sharp edge jumps about 255).
        const stripesTop = await page.evaluate(() => {
          const skeleton = document.querySelector("[data-masonry-cta-skeleton]");
          const bottom = document.querySelector(".masonry-section > .glass-surface[data-glass-shape=arc] .glass-surface__tint").getBoundingClientRect().bottom;
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

  // Phone (touch, spec S5): still two layers, the CSS 28px core (not inline 100px), one band step shown with a 25.3px increment.
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    try {
      await page.goto(`${origin}/vi/advertising-products/`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaReady === "true");
      for (let pass = 0, last = -1; pass < 8; pass += 1) {
        const end = await page.evaluate(() => document.documentElement.scrollHeight);
        if (end === last) break;
        last = end;
        await page.evaluate((y) => window.TruongThinhMotion.setLogicalScroll(y), end);
        await page.waitForTimeout(800);
      }
      await page.waitForTimeout(1200);
      const phone = await page.evaluate(() => {
        const glass = document.querySelector(".masonry-section > .glass-surface[data-glass-shape=arc]");
        const [core, ...steps] = [...glass.querySelectorAll(".glass-surface__step")];
        const visible = steps.filter((node) => getComputedStyle(node).display !== "none");
        const blur = (node) => getComputedStyle(node).backdropFilter.match(/blur\(([\d.]+)px\)/)?.[1];
        return { total: steps.length, visible: visible.length, coreInline: core.style.getPropertyValue("--glass-full-blur"),
          coreBlur: blur(core), stepBlur: visible.map(blur) };
      });
      check(JSON.stringify(phone) === JSON.stringify({ total: 3, visible: 1, coreInline: "", coreBlur: "28", stepBlur: ["25.3"] }),
        `phone arc Kính is not two layers (core 28px and one 25.3px band step) ${JSON.stringify(phone)}`);
    } finally {
      await context.close();
    }
  }

  // Even Kính around primary: only turns on when the contained photo has room.
  for (const [width, height, photo, overflow] of [[1440, 900, "kiosk-posm-09", true], [390, 844, "kiosk-posm-28", false]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    try {
      await page.goto(`${origin}/vi/advertising-products/?category=kiosk-posm&photo=${photo}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      const state = await page.evaluate(() => {
        const glass = document.querySelector(".detail-view__hero-frame > .glass-surface");
        return { shape: glass?.dataset.glassShape, display: glass && getComputedStyle(glass).display,
          layers: glass?.children.length, flag: document.querySelector("[data-detail-view]").dataset.detailGlass,
          backdrop: [...(glass?.children || [])].some((layer) => getComputedStyle(layer).backdropFilter !== "none"),
          filter: getComputedStyle(document.querySelector("[data-detail-background]")).filter };
      });
      // The photo carries its own blur, so no backdrop-filter can print a tile seam into primary (the tab's hover thumbnail).
      check(state.shape === "even" && state.layers === 2 && !state.backdrop
        && state.filter === "blur(100px) saturate(1.7) brightness(1.04)", `${photo}: primary Kính is not the even component ${JSON.stringify(state)}`);
      check(state.flag === String(overflow) && state.display === (overflow ? "block" : "none"),
        `${photo}: primary Kính does not follow contain overflow ${JSON.stringify(state)}`);
    } finally {
      await page.close();
    }
  }
  // Photos reveal without Kính (owner 2026-11-12): the primary and cards turn Flow into frosted glass on the Flow canvas instead
  // (loading-glass-and-page-entry R2, R4), so no reveal Kính attaches while a slow primary, a related photo or Back loads.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      let slow = false;
      await page.route("**/*.jxl", async (route) => {
        if (slow) await new Promise((resolve) => setTimeout(resolve, 800));
        await route.continue();
      });
      await page.addInitScript(() => {
        window.__ttRevealGlass = 0;
        new MutationObserver((records) => records.forEach(({ addedNodes }) => addedNodes.forEach((node) => {
          if (node.matches?.(".glass-surface[data-glass-reveal]") && !node.closest(".masonry-grid__cta-frame[data-masonry-cta-frame]")) window.__ttRevealGlass += 1;
        }))).observe(document, { childList: true, subtree: true });
      });
      const settled = () => page.waitForFunction(() => {
        const photo = document.querySelector("[data-detail-image]");
        return photo.dataset.detailId && photo.complete && photo.naturalWidth && !photo.parentElement.hasAttribute("aria-busy")
          && !photo.parentElement.querySelector("[data-masonry-loading-skeleton]");
      }, null, { timeout: 20000 });
      slow = true;
      await page.goto(`${origin}/vi/advertising-products/?category=kiosk-posm&photo=kiosk-posm-11`);
      await settled();
      await page.waitForFunction(() => document.querySelector("[data-masonry-related-card] a"));
      await page.evaluate(() => [...document.querySelectorAll("[data-masonry-related-card]")]
        .find((card) => card.querySelector("a") && !card.querySelector("video") && card.getBoundingClientRect().height).querySelector("a").click());
      await settled();
      slow = false;
      await page.goBack();
      await settled();
      check(await page.evaluate(() => window.__ttRevealGlass) === 0, "a photo reveal attached Kính");
    } finally {
      await page.close();
    }
  }
  assert.deepEqual(failures, [], "Kính contract");
  process.stdout.write("[glass-surface] arc and even Kính passed\n");
} finally {
  await browser.close();
}
