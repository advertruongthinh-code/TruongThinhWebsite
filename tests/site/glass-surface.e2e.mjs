// Kính in Chromium (docs/specs/glass-surface.md R1-R4, R8): arc at the masonry end, even around the primary.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");
const { default: sharp } = await import("sharp");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
// GPU compositing (SwiftShader) as on a real Chrome; software compositing blurs each layer's backdrop on its own.
const browser = await chromium.launch({ headless: true,
  args: ["--enable-gpu-rasterization", "--ignore-gpu-blocklist", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

const arcState = () => {
  const glass = document.querySelector(".project-index > .glass-surface[data-glass-shape=arc]");
  const box = glass.getBoundingClientRect();
  const steps = [...glass.querySelectorAll(".glass-surface__step:not(.glass-surface__step--full)")];
  const top = (node) => Number.parseFloat(node.style.top);
  const copy = document.querySelector("[data-advertising-grid-cta] .detail-cta__copy");
  const parallax = new DOMMatrixReadOnly(getComputedStyle(copy).transform).m42;
  const tint = glass.querySelector(".glass-surface__tint");
  // Rendered elements whose own box carries a backdrop filter; the hidden photo view's even Kính and
  // the closed viewer's ::backdrop are not rendered.
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
      // Lazy cards above can grow the page, so scroll to the end until it settles.
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
      // The five steps over the band and the arc's core, one full step inside the arc.
      check(JSON.stringify(state.owners.sort()) === JSON.stringify(["glass-surface__step", "glass-surface__step glass-surface__step--full"]),
        `${label}: R1 backdrop-filter outside the Kính steps ${JSON.stringify(state.owners)}`);
      check(state.box.opacity === "1" && state.box.mask === "none" && state.box.filter === "none",
        `${label}: R1 Kính box cuts its steps off from the page ${JSON.stringify(state.box)}`);
      // Step 0 starts at the band edge, the last of three at 1/3 + 0.1 of the band, both above the apex yIn.
      const band = (state.sLast - state.s0) / (2 / 3 - 0.1);
      const yIn = state.s0 + band;
      const cluster = state.clusterBottom - state.clusterTop;
      check(Math.abs(yIn - (state.clusterTop + 0.45 * cluster)) <= 2,
        `${label}: R2 apex ${yIn.toFixed(1)} is not at 45% of the CTA cluster ${state.clusterTop.toFixed(1)}..${state.clusterBottom.toFixed(1)}`);
      check(state.s0 >= state.realBottom - 1, `${label}: R2 band edge ${state.s0} rises above the real photos ${state.realBottom}`);
      check(Math.abs(band - 1.2 * cluster) <= 2 || Math.abs(state.s0 - state.realBottom) <= 1,
        `${label}: R2 band ${band.toFixed(1)} is not 1.2 cluster heights`);
      check(Math.abs(state.centreX - width / 2) <= 1, `${label}: R2 arc centre ${state.centreX} is off the middle of the screen`);
      check(Math.abs(state.centreY - yIn - 4 * width) <= 1 || state.centreY - yIn > 4 * width,
        `${label}: R2 radius ${(state.centreY - yIn).toFixed(1)} under 4 viewport widths`);
      // R4: the arc's grain is white noise blended normally (a blended layer drops the steps' blur in Chromium).
      check(state.grain.every((url) => url.startsWith("url(blob:")) && state.grainBlend === "normal", `${label}: R4 grain missing`);
      // R3, R4: the last row above the batch bottom (its corners sit on the pure white circle) stays white
      // within 1/255 and carries no grain.
      const shot = await page.screenshot({ clip: { x: 0, y: Math.floor(state.batchBottomOnScreen) - 1, width, height: 1 } });
      const { data } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const darkest = data.reduce((min, value) => Math.min(min, value), 255);
      check(darkest >= 254, `${label}: R3 batch bottom is not pure white (darkest channel ${darkest})`);
      // The footer's top line (0.18 ink on white) stays over the arc layers that run under it.
      const footerTop = await page.evaluate(() => document.querySelector(".site-footer").getBoundingClientRect().top);
      const line = await page.screenshot({ clip: { x: 0, y: footerTop, width, height: 1 } });
      const lineData = (await sharp(line).removeAlpha().raw().toBuffer()).reduce((min, value) => Math.min(min, value), 255);
      check(lineData <= 230, `${label}: footer top line hidden by the arc Kính (darkest channel ${lineData})`);
      if (width === 1440) {
        // R2: black and white stripes under the core, below the CTA copy, blur away (sharp edges step by about 255).
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

  // Even Kính around the primary: on only when the contained photo leaves room.
  for (const [width, height, photo, overflow] of [[1440, 900, "kiosk-posm-09", true], [390, 844, "kiosk-posm-28", false]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    try {
      await page.goto(`${origin}/vi/advertising-products/?category=kiosk-posm&photo=${photo}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      const state = await page.evaluate(() => {
        const glass = document.querySelector(".advertising-photo-view__hero-frame > .glass-surface");
        return { shape: glass?.dataset.glassShape, display: glass && getComputedStyle(glass).display,
          layers: glass?.children.length, flag: document.querySelector("[data-advertising-photo-view]").dataset.advertisingPhotoGlass };
      });
      check(state.shape === "even" && state.layers === 3, `${photo}: primary Kính is not the even component ${JSON.stringify(state)}`);
      check(state.flag === String(overflow) && state.display === (overflow ? "block" : "none"),
        `${photo}: primary Kính does not follow contain overflow ${JSON.stringify(state)}`);
    } finally {
      await page.close();
    }
  }
  assert.deepEqual(failures, [], "Kính contract");
  process.stdout.write("[glass-surface] arc and even Kính passed\n");
} finally {
  await browser.close();
}
