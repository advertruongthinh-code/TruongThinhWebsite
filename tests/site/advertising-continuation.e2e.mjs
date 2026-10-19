import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";

import { SKELETON_FLOW_PRESETS } from "../../src/site/advertising-products/skeleton-flow.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");

const { chromium } = await import("playwright");
const expectedCopy = {
  vi: ["Dấu ấn tiếp theo", "dành cho thương hiệu của bạn"],
  en: ["The next mark", "for your brand"],
};
const flowPresetIds = new Set(SKELETON_FLOW_PRESETS.map(({ id }) => id));
const output = path.join(root, ".tmp/mobile-skeleton-correction", "continuation-" + new Date().toISOString().replace(/[:.]/g, "-"));
await fs.mkdir(output, { recursive: true });
const evidence = { baseUrl, source: {}, performance: {} };
for (const file of ["motion.js", "advertising-products/catalog-runtime.mjs", "advertising-products/skeleton-flow.mjs", "style.css"]) {
  evidence.source[file] = createHash("sha256").update(await fs.readFile(path.join(root, "src/site", file))).digest("hex");
}

function matrix(transform) {
  const values = (transform.match(/matrix\(([^)]+)\)/)?.[1] || "").split(",").map(Number);
  return { x: values[4] || 0, y: values[5] || 0 };
}

function rounded(value) {
  return Math.round(value * 100) / 100;
}

async function scrollLogicalTargetIntoView(page, selector) {
  await page.locator(selector).first().evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const motion = window.TruongThinhMotion;
    const current = motion?.getLogicalScroll?.() ?? window.scrollY;
    const target = current + rect.top - Math.max(0, (innerHeight - rect.height) / 2);
    if (!motion?.setLogicalScroll?.(target)) window.scrollTo(0, target);
  });
  await page.waitForFunction((targetSelector) => {
    const rect = document.querySelector(targetSelector)?.getBoundingClientRect();
    return rect && rect.bottom > 0 && rect.top < innerHeight;
  }, selector);
}

async function ready(page) {
  await page.waitForFunction(() => document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaReady === "true");
  await page.waitForFunction(() => {
    const frame = document.querySelector("[data-advertising-cta-frame]");
    if (!frame) return false;
    const rect = frame.getBoundingClientRect();
    const motion = window.TruongThinhMotion;
    const current = motion?.getLogicalScroll?.() ?? window.scrollY;
    const target = current + rect.top - Math.max(0, (innerHeight - rect.height) / 2);
    if (!motion?.setLogicalScroll?.(target)) window.scrollTo(0, target);
    return true;
  });
  // Resize dựng lại batch và có thể đẩy khung ra ngoài viewport sau lần căn đầu, nên căn lại mỗi nhịp chờ.
  await page.waitForFunction(() => {
    const frame = document.querySelector("[data-advertising-cta-frame]");
    if (!frame) return false;
    const rect = frame.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= innerHeight) {
      const motion = window.TruongThinhMotion;
      const target = (motion?.getLogicalScroll?.() ?? window.scrollY) + rect.top - Math.max(0, (innerHeight - rect.height) / 2);
      if (!motion?.setLogicalScroll?.(target)) window.scrollTo(0, target);
    }
    return frame.classList.contains("is-looping");
  });
  await page.waitForFunction(() => {
    const visible = [...document.querySelectorAll("[data-advertising-cta-frame]")]
      .filter((frame) => {
      const rect = frame.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
      });
    const running = visible.filter((frame) => frame.dataset.advertisingFlowState === "running").length;
    return document.documentElement.clientWidth <= 750
      ? running >= 1
        && visible.every((frame) => ["running", "paused"].includes(frame.dataset.advertisingFlowState))
      : visible.every((frame) => frame.dataset.advertisingFlowState === "running");
  });
  await page.waitForFunction(() => {
    const frame = document.querySelector("[data-advertising-cta-frame]");
    const transform = frame && new DOMMatrixReadOnly(getComputedStyle(frame).transform);
    return transform && Math.abs(transform.m42) <= 0.1;
  });
}

// Frame nhận assignment khi lần đầu vào view (skeleton R3), nên chỉ frame đã draw mới có assignment.
async function flowAssignments(page) {
  return page.evaluate(() => [...document.querySelectorAll("[data-advertising-cta-frame]")]
    .filter((frame) => frame.querySelector("[data-advertising-flow-preset]"))
    .map((frame) => {
      const canvas = frame.querySelector("[data-advertising-flow-preset]");
      return {
        // Runtime giữ assignment theo slot; column:depth đổi chủ khi resize đổi số cột.
        slot: frame.dataset.advertisingCtaSlot,
        preset: canvas?.dataset.advertisingFlowPreset,
        speedScale: Number(canvas?.dataset.advertisingFlowSpeedScale),
        anchorPermutation: canvas?.dataset.advertisingFlowAnchorPermutation,
        phase: Number(canvas?.dataset.advertisingFlowPhase),
        direction: Number(canvas?.dataset.advertisingFlowDirection),
        ratioBand: frame.dataset.advertisingCtaRatioBand,
      };
    })
    .sort((left, right) => Number(left.slot) - Number(right.slot)));
}

function assertFlowBatch(assignments, label) {
  assert(assignments.length > 0, `${label}: no Flow frame has drawn an assignment`);
  assert(assignments.every(({ preset }) => flowPresetIds.has(preset)), `${label}: unknown Flow preset`);
  assert(assignments.every(({ anchorPermutation }) =>
    anchorPermutation?.split(",").map(Number).sort().join(",") === "0,1,2,3"),
  `${label}: Flow batch has an invalid anchor permutation`);
  assert(assignments.every(({ phase }) => Number.isFinite(phase)),
    `${label}: Flow batch has a non-finite starting phase`);
  assert(assignments.every(({ direction }) => direction === -1 || direction === 1),
    `${label}: Flow batch direction must be negative or positive`);
  assert(assignments.every(({ speedScale }) => speedScale >= 0.9 && speedScale <= 1.1),
    `${label}: Flow speed offset exceeds 10%`);
  const bySlot = new Map(assignments.map((assignment) => [assignment.slot, assignment]));
  for (const { slot, preset } of assignments) {
    const [column, depth] = slot.split(":").map(Number);
    assert.notEqual(bySlot.get(`${column}:${depth + 1}`)?.preset, preset,
      `${label}: ${slot} and the frame below share a preset`);
  }
}

function assignmentSignature(assignments) {
  return assignments.map(({ slot, preset, anchorPermutation, phase, direction, ratioBand }) =>
    `${slot}|${preset}|${anchorPermutation}|${phase}|${direction}|${ratioBand}`).join(";");
}

// Batch dựng thêm slot khi cuộn (frontier) và band đổi được khi dựng lại (skeleton R1); assignment của slot đã có phải giữ.
async function assertSlotsKept(page, expected, message) {
  const current = new Map((await flowAssignments(page)).map((assignment) => [assignment.slot, assignment]));
  assert.deepEqual(expected.map(({ slot }) => current.has(slot) && stableFlowAssignment(current.get(slot))),
    expected.map(stableFlowAssignment), message);
}

function stableFlowAssignment({ slot, preset, anchorPermutation, phase, direction, speedScale }) {
  return { slot, preset, anchorPermutation, phase, direction, speedScale };
}

async function assertCanonicalAdvertisingNav(page, { locale, mobile, query }) {
  const canonicalPath = `/${locale}/advertising-products/`;
  await page.setViewportSize(mobile
    ? { width: 390, height: 844 }
    : { width: 1440, height: 900 });
  await page.goto(`${baseUrl}${canonicalPath}${query}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
  const sourceUrl = new URL(page.url());
  // URL ghi slug cụm theo locale, browse state giữ id cụm (taxonomy R4).
  const sourceBrowse = await page.evaluate(() => {
    const { category, photo, tag } = window.TruongThinhAdvertising.getBrowseState();
    return { category, photo, tag };
  });
  const selector = mobile
    ? '#site-menu .menu-group__title[href$="/advertising-products/"]'
    : '.desktop-nav a[href$="/advertising-products/"]';
  const link = page.locator(selector);
  assert.equal(await link.getAttribute("href"), canonicalPath, `${locale} nav href is not canonical`);
  assert.equal(await link.evaluate((node) => node.dispatchEvent(new MouseEvent("click", {
    bubbles: true,
    button: 0,
    cancelable: true,
    ctrlKey: true,
  }))), true, `${locale} modified nav click was canceled`);
  assert.equal(page.url(), sourceUrl.href, `${locale} modified nav click changed current page`);

  if (mobile) {
    await page.locator("[data-menu-open]").click();
    await page.locator("#site-menu").waitFor({ state: "visible" });
  }
  await link.click();
  await page.waitForFunction((path) => location.pathname === path && location.search === "", canonicalPath);
  await page.waitForFunction(() => document.querySelector('[data-advertising-filter="all"]')?.getAttribute("aria-current") === "true");

  await page.evaluate(() => history.back());
  await page.waitForFunction((href) => location.href === href, sourceUrl.href);
  await page.waitForFunction((expected) => {
    const browse = window.TruongThinhAdvertising?.getBrowseState?.();
    return browse?.category === expected.category
      && browse.photo === expected.photo
      && browse.tag === expected.tag;
  }, sourceBrowse);
  if (!sourceBrowse.photo) {
    await page.waitForFunction((filter) => document.querySelector(`[data-advertising-filter="${filter}"]`)?.getAttribute("aria-current") === "true", sourceBrowse.category);
  }
  await page.evaluate(() => history.forward());
  await page.waitForFunction((path) => location.pathname === path && location.search === "", canonicalPath);
  await page.waitForFunction(() => document.querySelector('[data-advertising-filter="all"]')?.getAttribute("aria-current") === "true");
}

async function snapshot(page) {
  return page.evaluate(() => {
    const grid = document.querySelector("[data-project-grid]");
    const section = grid?.closest(".project-index");
    const skeleton = document.querySelector("[data-advertising-cta-skeleton]");
    const cta = document.querySelector("[data-advertising-grid-cta]");
    const footer = document.querySelector("footer.site-footer");
    const gridRect = grid?.getBoundingClientRect();
    // Kính (glass-surface.md): cung trên grid section, Kính đều trong primary frame.
    const glass = section?.querySelector(":scope > .glass-surface[data-glass-shape=arc]");
    const glassRect = glass?.getBoundingClientRect();
    const glassTint = glass?.querySelector(".glass-surface__tint");
    const glassFilters = (host) => [...(host?.querySelectorAll(".glass-surface__step") || [])].map((step) => getComputedStyle(step).backdropFilter);
    const photoGlass = document.querySelector(".advertising-photo-view__hero-frame > .glass-surface");
    const ctaRect = cta?.getBoundingClientRect();
    const copyRect = cta.querySelector(".detail-cta__copy").getBoundingClientRect();
    const rootStyle = getComputedStyle(document.documentElement);
    const headerClearance = (Number.parseFloat(rootStyle.getPropertyValue("--header-collapsed-row-height")) || 0) + 20;
    const frameRects = [...document.querySelectorAll("[data-advertising-cta-frame]")]
      .map((frame) => frame.getBoundingClientRect());
    const footerRect = footer.getBoundingClientRect();
    const frameState = [...document.querySelectorAll("[data-advertising-cta-frame]")]
      .map((frame) => {
        const rect = frame.getBoundingClientRect();
        return {
          column: Number(frame.dataset.advertisingCtaColumn),
          depth: Number(frame.dataset.advertisingCtaDepth),
          band: frame.dataset.advertisingCtaRatioBand,
          top: rect.top - gridRect.top,
          bottom: rect.bottom - gridRect.top,
          ratio: rect.height / rect.width,
        };
      });
    const frameBottoms = frameRects.map((rect) => rect.bottom - gridRect.top);
    const deepestFrameBottom = Math.max(ctaRect.top, ...frameRects.map((rect) => rect.bottom));
    const firstFrames = [...skeleton.querySelectorAll('[data-advertising-cta-frame][data-advertising-cta-depth="0"]')];
    const frontierGaps = firstFrames.map((frame) => {
      const left = Number.parseFloat(frame.style.left);
      const terminal = Math.max(-Infinity, ...[...grid.querySelectorAll(".advertising-tile:not([hidden])")]
        .filter((tile) => Math.abs(tile.offsetLeft - left) <= 2)
        .map((tile) => tile.offsetTop + tile.offsetHeight));
      return Number.isFinite(terminal) ? Number.parseFloat(frame.style.top) - terminal : null;
    });
    return {
      copy: [...new Set([...cta.querySelectorAll("[data-motion-line-source]")]
        .map((node) => node.dataset[document.documentElement.lang] || node.textContent.trim()))],
      ctaBottom: ctaRect.bottom - gridRect.top,
      ctaHeight: ctaRect.height,
      copyBottom: copyRect.bottom - ctaRect.top,
      headerClearance,
      viewportHeight: innerHeight,
      layoutViewportWidth: document.documentElement.clientWidth,
      nativeGutter: innerWidth - document.documentElement.clientWidth,
      skeletonCoverageRatio: Math.max(0, deepestFrameBottom - ctaRect.top) / ctaRect.height,
      glassHidden: glass?.hidden ?? null,
      // Bậc inner chỉ có mask, không đặt top riêng: chỉ lấy lớp có top.
      glassTop: Math.min(...[...(glass?.children || [])].map((layer) => Number.parseFloat(layer.style.top)).filter(Number.isFinite)),
      glassEnd: (Number.parseFloat(glassTint?.style.top) || 0) + (Number.parseFloat(glassTint?.style.height) || 0) - 2,
      boundaryBottom: Number.parseFloat(skeleton.style.height) || 0,
      realBottom: Number.parseFloat(skeleton.dataset.advertisingCtaRealBottom) || 0,
      cardWidth: frameRects[0]?.width || 0,
      boundaryMask: getComputedStyle(skeleton).maskImage,
      boundaryBlur: glassFilters(glass),
      photoGlassActive: document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoGlass === "true",
      photoGlassDisplay: photoGlass ? getComputedStyle(photoGlass).display : "",
      photoGlassBlur: glassFilters(photoGlass),
      photoBackgroundFilter: (() => { const background = document.querySelector("[data-advertising-photo-background]"); return background ? getComputedStyle(background).filter : ""; })(),
      glassLeft: glassRect?.left ?? NaN,
      glassRight: glassRect?.right ?? NaN,
      glassBackground: glassTint ? getComputedStyle(glassTint).backgroundImage : "",
      legacyWhiteWash: getComputedStyle(skeleton, "::after").backgroundImage,
      tailSpan: footerRect.bottom - ctaRect.top,
      paintOverflow: skeleton.getBoundingClientRect().bottom - gridRect.bottom,
      frameBottom: Math.max(...frameBottoms),
      gridHeight: gridRect.height,
      gutter: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gutter")) || 0,
      gridGap: Number.parseFloat(getComputedStyle(grid).gap) || 0,
      footerTopGap: Number.parseFloat(getComputedStyle(footer).marginBlockStart) || 0,
      footerGap: footerRect.top - ctaRect.bottom,
      frameCount: frameBottoms.length,
      columns: Number(skeleton.dataset.advertisingCtaColumns),
      frontierCoverage: Math.min(...Array.from({ length: Number(skeleton.dataset.advertisingCtaColumns) }, (_, column) =>
        Math.max(...frameState.filter((frame) => frame.column === column).map((frame) => frame.bottom))
          + (Number.parseFloat(getComputedStyle(grid).gap) || 0)))
        - (Number.parseFloat(skeleton.style.height) || 0),
      physicalLines: cta.querySelectorAll("h2 > .motion-line-mask").length,
      looping: [...document.querySelectorAll("[data-advertising-cta-frame]")].filter((frame) => frame.classList.contains("is-looping")).length,
      flowCanvases: document.querySelectorAll("[data-advertising-cta-frame] canvas[data-advertising-flow-preset]").length,
      liveWebglContexts: document.querySelectorAll('.advertising-grid__cta-shared-flow, [data-advertising-cta-frame] canvas[data-advertising-flow-backend="webgl"]').length,
      flowPresets: [...document.querySelectorAll("[data-advertising-flow-preset]")].map((canvas) => canvas.dataset.advertisingFlowPreset),
      frameState,
      frontierGaps,
      flowStates: [...document.querySelectorAll("[data-advertising-cta-frame]")].map((frame) => {
        const rect = frame.getBoundingClientRect();
        return {
          inViewport: rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth,
          state: frame.dataset.advertisingFlowState,
          staticImage: Boolean(frame.querySelector("canvas"))
            && getComputedStyle(frame.querySelector("canvas")).backgroundImage.startsWith("url("),
        };
      }),
      process: document.querySelectorAll(".detail-process, .process-step").length,
      footerIntro: document.querySelectorAll("footer .footer-intro").length,
      eyebrow: cta.querySelectorAll(":scope > .detail-cta__copy > p").length,
      marquee: document.querySelectorAll(".capability-marquee").length,
      contact: document.querySelectorAll("footer .footer-contact").length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

async function collectFlowWindow(page) {
  return page.evaluate(async () => {
    const surface = document.querySelector("[data-advertising-cta-frame].is-looping .advertising-grid__cta-surface");
    const canvas = document.querySelector(".advertising-grid__cta-shared-flow") ?? surface.querySelector("canvas");
    const grid = document.querySelector("[data-project-grid]");
    const digest = () => {
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let hash = 2166136261;
      for (let index = 0; index < pixels.length; index += 4) {
        hash ^= pixels[index];
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    };
    const times = [0, 300, 600, 900];
    const started = performance.now();
    const sample = () => ({
      at: performance.now() - started,
      surface: getComputedStyle(surface).transform,
      digest: digest(),
      height: grid.getBoundingClientRect().height,
    });
    const samples = [];
    for (const target of times) {
      await new Promise((resolve) => {
        const tick = () => {
          if (performance.now() - started >= target) resolve();
          else requestAnimationFrame(tick);
        };
        tick();
      });
      samples.push(sample());
    }
    return samples;
  });
}

async function skeletonEntryContract(page) {
  return page.evaluate(() => {
    const frame = document.querySelector("[data-advertising-cta-frame]");
    const media = document.querySelector("[data-advertising-card] .advertising-card-media__image");
    const skeleton = document.querySelector("[data-advertising-cta-skeleton]");
    const surface = frame?.querySelector(".advertising-grid__cta-surface");
    if (!frame || !media) throw new Error("entry contract requires one skeleton frame and one grid media card");
    const transitionFor = (node, property) => {
      const style = getComputedStyle(node);
      const properties = style.transitionProperty.split(",").map((value) => value.trim());
      const durations = style.transitionDuration.split(",").map((value) => value.trim());
      const easings = style.transitionTimingFunction.split(",").map((value) => value.trim());
      const delays = style.transitionDelay.split(",").map((value) => value.trim());
      const index = properties.indexOf(property);
      return index < 0 ? null : {
        delay: delays[index % delays.length],
        duration: durations[index % durations.length],
        easing: easings[index % easings.length],
      };
    };
    const styleState = (node) => {
      const style = getComputedStyle(node);
      return {
        animationName: style.animationName,
        maskImage: style.maskImage,
        pointerEvents: style.pointerEvents,
        transitionProperties: style.transitionProperty.split(",").map((value) => value.trim()),
        transitionDelays: style.transitionDelay.split(",").map((value) => value.trim()),
        transform: style.transform,
      };
    };
    return {
      frame: {
        opacity: transitionFor(frame, "opacity"),
        ...styleState(frame),
      },
      media: {
        opacity: transitionFor(media, "opacity"),
        transform: transitionFor(media, "transform"),
      },
      skeleton: styleState(skeleton),
      surface: styleState(surface),
      stagger: [...document.querySelectorAll("[data-advertising-cta-frame]")]
        .map((node) => transitionFor(node, "opacity")?.delay),
    };
  });
}

async function exitSkeletonViewport(page) {
  await page.evaluate(() => {
    if (!window.TruongThinhMotion?.setLogicalScroll?.(0)) window.scrollTo(0, 0);
  });
  await page.waitForFunction(() =>
    !document.querySelector("[data-advertising-cta-frame].is-looping"));
  await page.waitForTimeout(750);
  return page.locator("[data-advertising-cta-frame]").first().evaluate((frame) => {
    const style = getComputedStyle(frame);
    return {
      opacity: Number(style.opacity),
      targetOpacity: Number(style.getPropertyValue("--advertising-cta-frame-opacity")),
      transformY: new DOMMatrixReadOnly(style.transform).m42,
    };
  });
}

// Lần vào viewport đầu tiên (skeleton R4): frame hiện bằng Kính reveal 0.6s rồi gỡ khi Kính cung chưa giao viewport;
// Kính cung đang giao viewport thì frame chỉ crossfade, không có Kính reveal. Phần vào lại nằm ở reenterSkeletonViewport.
async function firstEntryReveals(browser, scrollTarget) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 400 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const log = window.__ttFirstEntry = { added: [], lifetimes: [] };
    const born = new Map();
    new MutationObserver((records) => {
      for (const record of records) {
        if (!record.target.matches?.("[data-advertising-cta-frame]")) continue;
        for (const node of record.addedNodes) {
          if (!node.dataset || !("glassReveal" in node.dataset)) continue;
          const tint = document.querySelector(".glass-surface[data-glass-shape=arc] .glass-surface__tint")?.getBoundingClientRect();
          born.set(node, performance.now());
          log.added.push({ arcInView: Boolean(tint) && tint.bottom > 0 && tint.top < innerHeight });
        }
        for (const node of record.removedNodes) if (born.has(node)) log.lifetimes.push(performance.now() - born.get(node));
      }
    }).observe(document, { childList: true, subtree: true });
  });
  try {
    await page.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "networkidle" });
    // Trang nền trong headless không chạy rAF nên entry không bắt đầu.
    await page.bringToFront();
    await page.waitForFunction(() => document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaReady === "true");
    await page.evaluate((target) => {
      const motion = window.TruongThinhMotion;
      const frameTop = document.querySelector("[data-advertising-cta-frame]").getBoundingClientRect().top;
      // Frame đầu chỉ ló 40px ở đáy viewport: Kính cung nằm dưới frame nên chắc chắn ngoài viewport (chiều cao batch ngẫu nhiên).
      const top = target === "first-frame" ? (motion?.getLogicalScroll?.() ?? scrollY) + frameTop - (innerHeight - 40) : document.documentElement.scrollHeight;
      if (!motion?.setLogicalScroll?.(top)) window.scrollTo(0, top);
    }, scrollTarget);
    await page.waitForFunction(() => document.querySelector("[data-advertising-cta-frame].is-entry-ready"));
    // Reveal 0.6s cộng thời gian settle; chờ hết rồi mới đọc vòng đời.
    await page.waitForTimeout(1_200);
    return await page.evaluate(() => ({
      ...window.__ttFirstEntry,
      leftover: document.querySelectorAll("[data-advertising-cta-frame] [data-glass-reveal]").length,
    }));
  } finally {
    await context.close();
  }
}

// Rời hẳn vùng nhìn thấy rồi vào lại: khung hiện ngay và Kính reveal không chạy lại (skeleton R4).
async function reenterSkeletonViewport(page, label) {
  await page.locator("[data-advertising-cta-frame]").first().evaluate((frame) => {
    window.__ttSkeletonReenterReveals = 0;
    window.__ttSkeletonReenterObserver = new MutationObserver((records) => {
      window.__ttSkeletonReenterReveals += records.filter((record) => [...record.addedNodes]
        .some((node) => node.dataset && "glassReveal" in node.dataset)).length;
    });
    window.__ttSkeletonReenterObserver.observe(frame, { childList: true });
    const rect = frame.getBoundingClientRect();
    const motion = window.TruongThinhMotion;
    const current = motion?.getLogicalScroll?.() ?? window.scrollY;
    const target = current + rect.top - Math.max(0, (innerHeight - rect.height) / 2);
    if (!motion?.setLogicalScroll?.(target)) window.scrollTo(0, target);
  });
  await page.waitForFunction(() => document.querySelector("[data-advertising-cta-frame].is-looping"));
  await page.waitForTimeout(750);
  const result = await page.locator("[data-advertising-cta-frame]").first().evaluate((frame) => {
    window.__ttSkeletonReenterObserver.disconnect();
    const style = getComputedStyle(frame);
    const result = {
      reveals: window.__ttSkeletonReenterReveals,
      entryReady: frame.classList.contains("is-entry-ready"),
      opacity: Number(style.opacity),
      targetOpacity: Number(style.getPropertyValue("--advertising-cta-frame-opacity")),
      transformY: new DOMMatrixReadOnly(style.transform).m42,
    };
    delete window.__ttSkeletonReenterObserver;
    delete window.__ttSkeletonReenterReveals;
    return result;
  });
  assert.equal(result.reveals, 0, `${label}: Kinh reveal replayed on re-entry`);
  assert(result.entryReady && Math.abs(result.opacity - result.targetOpacity) <= 0.01,
    `${label}: frame was not shown immediately`);
  assert(Math.abs(result.transformY) <= 0.1, `${label}: re-entry changed frame geometry`);
}

const installSkeletonPaintProbe = (targetPage) => targetPage.addInitScript(() => {
  // Khung batch chạy Flow trên canvas chung của batch (advertising-skeleton R5); renderer riêng chỉ còn cho skeleton media card.
  window.__ttFlowLive = (frame) => frame.dataset.advertisingFlowState === "running"
    && (frame.querySelector("canvas")?.dataset.advertisingFlowBackend === "webgl"
      || Boolean(frame.closest(".advertising-grid__cta-skeleton")?.querySelector(".advertising-grid__cta-shared-flow")));
  // Canvas chung vẽ nhiều khung mỗi tick bằng scissor: một tick là một lần clear, không đếm theo drawArrays.
  const nativeClear = WebGLRenderingContext.prototype.clear;
  WebGLRenderingContext.prototype.clear = function patchedClear(...args) {
    if (this.canvas?.matches?.(".advertising-grid__cta-shared-flow")) {
      window.__ttSkeletonPaints[this.canvas.isConnected ? "connected" : "detached"] += 1;
      this.canvas.__ttSkeletonPaints = (this.canvas.__ttSkeletonPaints || 0) + 1;
    }
    return nativeClear.apply(this, args);
  };
  window.__ttSkeletonPaints = { connected: 0, detached: 0 };
  window.__ttSkeletonPaintTimeline = [];
  window.__ttSkeletonTraceEnabled = true;
  const nativeDrawArrays = WebGLRenderingContext.prototype.drawArrays;
  WebGLRenderingContext.prototype.drawArrays = function patchedDrawArrays(...args) {
    if (this.canvas?.matches?.(".advertising-grid__cta-flow")) {
      const key = this.canvas.isConnected ? "connected" : "detached";
      window.__ttSkeletonPaints[key] += 1;
      this.canvas.__ttSkeletonPaints = (this.canvas.__ttSkeletonPaints || 0) + 1;
      if (this.canvas.isConnected && window.__ttSkeletonTraceEnabled) {
        const frame = this.canvas.closest("[data-advertising-cta-frame]");
        window.__ttSkeletonPaintTimeline.push({
          at: performance.now(),
          slot: frame
            ? `${frame.dataset.advertisingCtaColumn}:${frame.dataset.advertisingCtaDepth}`
            : "unknown",
        });
      }
    }
    return nativeDrawArrays.apply(this, args);
  };
});

const measureAnimationPerformance = (targetPage, duration) => targetPage.evaluate(async (probeDuration) => {
  const wasTracing = window.__ttSkeletonTraceEnabled;
  window.__ttSkeletonTraceEnabled = false;
  const longTasks = [];
  const observer = typeof PerformanceObserver === "function"
    && PerformanceObserver.supportedEntryTypes?.includes("longtask")
    ? new PerformanceObserver((list) => longTasks.push(...list.getEntries().map(({ duration: entryDuration }) => entryDuration)))
    : null;
  observer?.observe({ type: "longtask", buffered: false });
  const paintsBefore = window.__ttSkeletonPaints.connected;
  const activeCanvases = [...document.querySelectorAll('.advertising-grid__cta-shared-flow, [data-advertising-cta-frame].is-looping canvas[data-advertising-flow-backend="webgl"]')];
  const perFrameBefore = activeCanvases.map(canvas => canvas.__ttSkeletonPaints || 0);
  const activeFrameCount = activeCanvases.length;
  const started = performance.now();
  let rafTicks = 0;
  await new Promise((resolve) => {
    const tick = () => {
      rafTicks += 1;
      if (performance.now() - started >= probeDuration) resolve();
      else requestAnimationFrame(tick);
    };
    tick();
  });
  const elapsed = performance.now() - started;
  const paints = window.__ttSkeletonPaints.connected - paintsBefore;
  const frames = activeCanvases.map((canvas, index) => ({
    slot: canvas.closest("[data-advertising-cta-frame]")?.dataset.advertisingCtaSlot ?? "shared",
    connected: canvas.isConnected,
    paints: (canvas.__ttSkeletonPaints || 0) - perFrameBefore[index],
    fps: ((canvas.__ttSkeletonPaints || 0) - perFrameBefore[index]) * 1000 / elapsed,
  }));
  observer?.disconnect();
  window.__ttSkeletonTraceEnabled = wasTracing;
  return {
    activeFrameCount,
    frames,
    elapsed,
    paints,
    fps: activeFrameCount ? paints * 1000 / elapsed / activeFrameCount : 0,
    rafFps: rafTicks * 1000 / elapsed,
    paintShare: activeFrameCount ? paints / activeFrameCount / rafTicks : 0,
    maxLongTask: longTasks.length ? Math.max(...longTasks) : 0,
    supportsLongTask: Boolean(observer),
  };
}, duration);

const launchOptions = { headless: process.env.CONTINUATION_HEADED !== "1", executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined };
if (process.env.CONTINUATION_CHANNEL) launchOptions.channel = process.env.CONTINUATION_CHANNEL;
const browser = await chromium.launch(launchOptions);
evidence.browser = { version: browser.version(), ...launchOptions };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await installSkeletonPaintProbe(page);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  for (const locale of ["vi", "en"]) {
    for (const viewport of [
      { width: 360, height: 800 },
      { width: 1440, height: 900 },
      { width: 1440, height: 400 },
      { width: 390, height: 844 },
      { width: 390, height: 568 },
    ]) {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto(`${baseUrl}/${locale}/advertising-products/`, { waitUntil: "networkidle" });
      await ready(page).catch((error) => {
        throw new Error(`${locale} ${viewport.width}x${viewport.height}: skeleton readiness failed`, { cause: error });
      });
      const state = await snapshot(page);
      (evidence.viewportBoundaries ||= []).push({ locale, viewport,
        layoutViewportWidth: state.layoutViewportWidth, nativeGutter: state.nativeGutter,
        glassLeft: state.glassLeft, glassRight: state.glassRight });
      assertFlowBatch(await flowAssignments(page), `${locale} ${viewport.width}x${viewport.height}`);
      if (viewport.width === 360 && viewport.height === 800) {
        const p7MobileFailures = [];
        if (state.frameCount <= 2 || state.frontierCoverage < -1) {
          p7MobileFailures.push(`organic DOM frames ${state.frameCount} stop ${-state.frontierCoverage}px before glass`);
        }
        if (state.liveWebglContexts < 1 || state.liveWebglContexts > 2) {
          p7MobileFailures.push(`WebGL context count ${state.liveWebglContexts}, expected 1..2`);
        }
        if (state.tailSpan > state.viewportHeight + 2) {
          p7MobileFailures.push(`tail span ${state.tailSpan}px exceeds ${state.viewportHeight}px viewport`);
        }
        if (!/^radial-gradient\(.*?, rgb\(255, 255, 255\) [\d.]+px/i.test(state.glassBackground)) {
          p7MobileFailures.push("arc Kính lacks the pure-white corner circle");
        }
        if (state.legacyWhiteWash !== "none") {
          p7MobileFailures.push("legacy local white wash remains separate from global glass");
        }
        assert.deepEqual(p7MobileFailures, [],
          `${locale} A54 360x800: P7 mobile tail and unified glass contract`);
      }
      assert.deepEqual(state.copy, expectedCopy[locale], `${locale} ${viewport.width}: CTA has exactly two intended spans`);
      if (viewport.width >= 1000) assert.equal(state.physicalLines, 2, `${locale}: desktop CTA has more than two physical lines`);
      assert.equal(state.eyebrow, 0, `${locale} ${viewport.width}: CTA eyebrow remains`);
      assert.equal(state.process, 0, `${locale} ${viewport.width}: Advertising retained a process section`);
      assert.equal(state.footerIntro, 0, `${locale} ${viewport.width}: Advertising retained the footer invitation`);
      assert.equal(state.marquee, 0, `${locale} ${viewport.width}: capability marquee remains`);
      assert.equal(state.contact, 1, `${locale} ${viewport.width}: contact footer was removed`);
      assert(state.ctaHeight > 0 && state.ctaHeight <= state.viewportHeight,
        `${locale} ${viewport.width}x${viewport.height}: tail solver emitted an invalid CTA height`);
      assert(Math.min(...state.frameState.map(({ top }) => top)) < state.ctaBottom - state.ctaHeight,
        `${locale} ${viewport.width}x${viewport.height}: skeleton starts at the CTA row instead of continuing the real-card frontier`);
      assert(state.frontierGaps.length === state.columns
        && state.frontierGaps.every((gap) => gap !== null && Math.abs(gap - state.gridGap) <= 2),
      `${locale} ${viewport.width}x${viewport.height}: skeleton does not join each real-card column at the shared gap ${JSON.stringify(state.frontierGaps)}`);
      assert(state.copyBottom <= state.ctaHeight + 1,
        `${locale} ${viewport.width}x${viewport.height}: CTA copy is clipped below the composition ${JSON.stringify({ copyBottom: state.copyBottom, ctaHeight: state.ctaHeight })}`);
      assert(state.frameCount >= state.columns && state.frontierCoverage >= -1,
        `${locale} ${viewport.width}x${viewport.height}: skeleton frontier stops before glass (${state.frontierCoverage}px)`);
      if (viewport.width === 360 && viewport.height === 800) {
        assert(state.frameCount > 2,
          `${locale} A54 360x800: mobile tail must keep organic DOM cards through glass, got ${state.frameCount}`);
        assert(state.liveWebglContexts >= 1 && state.liveWebglContexts <= 2,
          `${locale} A54 360x800: mobile tail must own at most two WebGL contexts, got ${state.liveWebglContexts}`);
      }
      assert(state.tailSpan <= state.viewportHeight + 2,
        `${locale} ${viewport.width}x${viewport.height}: skeleton, CTA, and shared footer do not fit one final viewport (${state.tailSpan}px)`);
      assert(state.frameState.every(({ ratio }) => ratio >= 0.25),
        `${locale} ${viewport.width}: skeleton layout emitted a thin residual frame`);
      for (let column = 0; column < state.columns; column += 1) {
        const frames = state.frameState.filter((frame) => frame.column === column)
          .sort((left, right) => left.depth - right.depth);
        assert(frames.slice(1).every((frame, index) => frame.band !== frames[index].band),
          `${locale} ${viewport.width}: skeleton column ${column} repeats an adjacent ratio band`);
      }
      assert.equal(state.glassHidden, false, `${locale} ${viewport.width}: arc Kính is hidden at the masonry end`);
      assert(state.glassTop >= state.realBottom - 1,
        `${locale} ${viewport.width}: arc Kính band rises above the real photos (${state.glassTop} < ${state.realBottom})`);
      // Phần core và ba bước band; các bước inner nằm giữa chúng đổi theo thiết bị (glass-surface.mjs).
      const blurs = state.boundaryBlur.map((filter) => filter.match(/blur\(([\d.]+)px\)/)?.[1]);
      assert.deepEqual([blurs[0], ...blurs.slice(-3)], ["28", "4.5", "11.12", "25.3"],
        `${locale} ${viewport.width}: arc Kính steps differ from the shared component`);
      // Primary photo tự mang blur của step đầy; Kính đều của nó chỉ giữ tint và grain.
      assert.deepEqual(state.photoGlassBlur, [], `${locale} ${viewport.width}: photo Kính still has a backdrop blur step`);
      assert.equal(state.photoBackgroundFilter, "blur(100px) saturate(1.7) brightness(1.04)",
        `${locale} ${viewport.width}: photo background does not carry the full Kính blur`);
      assert.equal(state.photoGlassDisplay, state.photoGlassActive ? "block" : "none",
        `${locale} ${viewport.width}: photo Kính does not follow contain overflow`);
      assert.equal(state.boundaryMask, "none",
        `${locale} ${viewport.width}: skeleton retained a local opacity mask outside the Kính`);
      assert(Math.abs(state.glassLeft) <= 1,
        `${locale} ${viewport.width}: skeleton glass does not reach the viewport left edge`);
      assert(Math.abs(state.glassRight - state.layoutViewportWidth) <= 1,
        `${locale} ${viewport.width}: skeleton glass does not reach the viewport right edge`);
      assert.match(state.glassBackground, /^radial-gradient\(.*?, rgb\(255, 255, 255\) [\d.]+px/i,
        `${locale} ${viewport.width}: arc Kính does not turn pure white at the batch corners`);
      assert.equal(state.legacyWhiteWash, "none",
        `${locale} ${viewport.width}: legacy local white wash remains separate from global glass`);
      assert(state.flowCanvases <= state.frameCount, `${locale} ${viewport.width}: more Flow canvases than frames`);
      assert(state.flowPresets.every((id) => flowPresetIds.has(id)), `${locale} ${viewport.width}: unknown Flow preset`);
      const visibleFlowStates = state.flowStates.filter(({ inViewport }) => inViewport);
      const hiddenFlowStates = state.flowStates.filter(({ inViewport }) => !inViewport);
      assert(visibleFlowStates.length > 0, `${locale} ${viewport.width}: no Flow frame is visible`);
      // Mọi khung trong viewport đều chạy (advertising-skeleton R8); phone hoãn dựng tới khi cuộn dừng và hiện frame tĩnh (R5).
      if (viewport.width <= 750) {
        assert(visibleFlowStates.every(({ state: flowState, staticImage }) => flowState === "running" || staticImage),
          `${locale} ${viewport.width}: paused Flow card lost its preset fallback`);
      } else {
        assert(visibleFlowStates.every(({ state: flowState }) => flowState === "running"),
          `${locale} ${viewport.width}: visible Flow is paused`);
      }
      assert(hiddenFlowStates.every(({ state: flowState }) => flowState === "paused"),
        `${locale} ${viewport.width}: offscreen Flow is running`);
      assert(Math.abs(state.paintOverflow) <= 1,
        `${locale} ${viewport.width}: the skeleton batch must end on the footer`);
      assert(Math.abs(state.boundaryBottom - state.ctaBottom) <= 1.5 && Math.abs(state.glassEnd - state.boundaryBottom) <= 0.5,
        `${locale} ${viewport.width}: Kính endpoint differs from the batch bottom`);
      assert.equal(state.footerTopGap, 0, `${locale} ${viewport.width}: Advertising keeps a gap above the footer`);
      assert(Math.abs(state.gridHeight - state.ctaBottom) <= 1.5,
        `${locale} ${viewport.width}: skeleton overflow increased the logical grid height`);
      assert(Math.abs(state.footerGap - state.footerTopGap) <= 2,
        `${locale} ${viewport.width}: footer boundary differs from the shared footer gap`);
      assert(state.overflow <= 1, `${locale} ${viewport.width}: horizontal overflow ${state.overflow}px`);
      const finalViewport = await page.evaluate(async () => {
        const motion = window.TruongThinhMotion;
        const lastScroll = document.documentElement.scrollHeight - innerHeight;
        // R6: cuộn 100px gần cuối làm copy CTA dịch 90px.
        const copyNode = document.querySelector("[data-advertising-grid-cta] .detail-cta__copy");
        const copyTopAt = async (y) => {
          if (!motion?.setLogicalScroll?.(y)) window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 500));
          return copyNode.getBoundingClientRect().top;
        };
        const parallaxStep = await copyTopAt(lastScroll - 200) - await copyTopAt(lastScroll - 100);
        if (!motion?.setLogicalScroll?.(lastScroll)) window.scrollTo(0, lastScroll);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await new Promise((resolve) => setTimeout(resolve, 900));
        const parallaxEnd = new DOMMatrixReadOnly(getComputedStyle(copyNode).transform).m42;
        // Line reveal dừng cao hơn layout box 0.1em.
        const headingNode = document.querySelector("[data-advertising-grid-cta] h2");
        const fontSize = Number.parseFloat(getComputedStyle(headingNode).fontSize);
        const lines = [...headingNode.querySelectorAll(".motion-line")];
        for (let wait = 0; wait < 40 && lines.some((line) =>
          Math.abs(new DOMMatrixReadOnly(getComputedStyle(line).transform).m42 + 0.1 * fontSize) > 0.5); wait += 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        const lastLine = lines.at(-1) || [...headingNode.querySelectorAll("[data-motion-line-source]")].at(-1);
        const leaf = [...lastLine.querySelectorAll("*")].filter((node) => !node.children.length).at(-1) || lastLine;
        const probe = document.createElement("span");
        probe.style.cssText = "display: inline-block; width: 0; height: 0;";
        leaf.append(probe);
        const baseline = probe.getBoundingClientRect().top;
        probe.remove();
        const lastLineBottom = lastLine.getBoundingClientRect().bottom;
        const cta = document.querySelector("[data-advertising-grid-cta]").getBoundingClientRect();
        const footer = document.querySelector("footer.site-footer").getBoundingClientRect();
        const heading = document.querySelector("[data-advertising-grid-cta] h2").getBoundingClientRect();
        const link = document.querySelector("[data-advertising-grid-cta] .detail-cta__copy a").getBoundingClientRect();
        return { ctaTop: cta.top, ctaBottom: cta.bottom, headingTop: heading.top, headingBottom: heading.bottom,
          baseline, lastLineBottom, fontSize, parallaxStep, parallaxEnd,
          linkTop: link.top, linkBottom: link.bottom, footerBottom: footer.bottom, viewportHeight: innerHeight,
          logical: motion?.getLogicalScroll?.(), target: lastScroll,
          scrollHeight: document.documentElement.scrollHeight,
          clientHeight: document.documentElement.clientHeight,
          bodyHeight: document.body.scrollHeight, nativeY: scrollY };
      });
      assert(finalViewport.ctaTop >= -1 && finalViewport.footerBottom <= finalViewport.viewportHeight + 1,
        `${locale} ${viewport.width}x${viewport.height}: final viewport clips CTA or footer ${JSON.stringify(finalViewport)}`);
      assert(finalViewport.headingTop >= -1 && finalViewport.linkTop >= finalViewport.headingBottom - 1
        && finalViewport.linkBottom <= finalViewport.viewportHeight + 1,
      `${locale} ${viewport.width}x${viewport.height}: final viewport clips or overlaps CTA content ${JSON.stringify(finalViewport)}`);
      // R1: baseline của dòng cuối nằm đúng tâm viewport; cửa sổ R5 giữ link cách batch một gap.
      const expectedCtaGap = viewport.width <= 960 ? 15 : viewport.width <= 1200 ? 25 : 35;
      const shortWindow = Math.abs(finalViewport.ctaBottom - finalViewport.linkBottom - expectedCtaGap) <= 1;
      assert(shortWindow || Math.abs(finalViewport.baseline - finalViewport.viewportHeight / 2) <= 1,
        `${locale} ${viewport.width}x${viewport.height}: CTA baseline is off the viewport centre ${JSON.stringify(finalViewport)}`);
      assert(Math.abs(finalViewport.linkTop - finalViewport.lastLineBottom - expectedCtaGap) <= 1,
        `${locale} ${viewport.width}x${viewport.height}: link is not one gap under the last heading line ${JSON.stringify(finalViewport)}`);
      assert(finalViewport.fontSize >= 20.8 - 0.01, `${locale} ${viewport.width}x${viewport.height}: CTA heading under 1.3rem`);
      assert(Math.abs(finalViewport.parallaxStep - 90) <= 1 && Math.abs(finalViewport.parallaxEnd) <= 0.5,
        `${locale} ${viewport.width}x${viewport.height}: CTA parallax is not 10% slower or not zero at the end ${JSON.stringify(finalViewport)}`);
    }
  }

  // R7: chuyển sang reduced motion bỏ ngay offset parallax của CTA.
  const parallaxOffset = () => page.evaluate(async () => {
    // Rule reduced-motion toàn cục để lại transition 0.01ms, nên đọc sau một khoảng chờ ngắn.
    await new Promise((resolve) => setTimeout(resolve, 200));
    const copy = document.querySelector("[data-advertising-grid-cta] .detail-cta__copy");
    const offset = () => new DOMMatrixReadOnly(getComputedStyle(copy).transform).m42;
    // Cuộn còn đang trượt thì offset chưa tới đích: chờ tới khi hai lần đọc liên tiếp khớp.
    let last = offset();
    for (let tries = 0; tries < 20; tries++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const next = offset();
      if (Math.abs(next - last) < 0.01) return next;
      last = next;
    }
    return last;
  });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight - innerHeight - 100));
  const movingOffset = await parallaxOffset();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedOffset = await parallaxOffset();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  assert(Math.abs(movingOffset + 10) <= 0.5 && reducedOffset === 0,
    `reduced motion keeps a CTA parallax offset (${movingOffset}, ${reducedOffset})`);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "networkidle" });
  await ready(page);
  const beforeFilterAssignments = await flowAssignments(page);
  const beforeFilter = await page.locator("[data-advertising-cta-skeleton]").getAttribute("data-advertising-cta-signature");
  await scrollLogicalTargetIntoView(page, '[data-advertising-filter="displays-booths"]');
  await page.locator('[data-advertising-filter="displays-booths"]').click();
  await page.waitForFunction((signature) => document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaSignature !== signature, beforeFilter);
  await ready(page);
  const filteredAssignments = await flowAssignments(page);
  assertFlowBatch(filteredAssignments, "filter lifecycle");
  assert.notEqual(assignmentSignature(filteredAssignments), assignmentSignature(beforeFilterAssignments),
    "filter lifecycle reused the previous Flow batch");
  const detachedPaints = await page.evaluate(() => window.__ttSkeletonPaints.detached);
  await page.waitForTimeout(350);
  assert.equal(await page.evaluate(() => window.__ttSkeletonPaints.detached), detachedPaints,
    "skeleton geometry rebuild left a detached canvas RAF loop");

  const beforeResizeSignature = await page.locator("[data-advertising-cta-skeleton]")
    .getAttribute("data-advertising-cta-signature");
  const beforeResizeColumns = await page.locator("[data-advertising-cta-skeleton]")
    .getAttribute("data-advertising-cta-columns");
  await page.setViewportSize({ width: 1000, height: 1000 });
  await page.waitForFunction((signature) =>
    document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaSignature !== signature,
  beforeResizeSignature);
  await ready(page);
  const narrowSignature = await page.locator("[data-advertising-cta-skeleton]").getAttribute("data-advertising-cta-signature");
  const narrowAssignments = await flowAssignments(page);
  evidence.assignmentTransitions = { filteredAssignments, narrowAssignments };
  assertFlowBatch(narrowAssignments, "N4 to N3 logical batches");
  const filteredBySlot = new Map(filteredAssignments.map((assignment) => [assignment.slot, assignment]));
  assert.equal((await snapshot(page)).columns, 3, "resize fixture did not cross from N4 to N3");
  for (const assignment of narrowAssignments) {
    const previous = filteredBySlot.get(assignment.slot);
    if (previous) assert.deepEqual(stableFlowAssignment(assignment), stableFlowAssignment(previous),
      `N4 to N3 resize changed the stable Flow assignment for ${assignment.slot}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  // Band đổi được khi đổi cỡ (skeleton R1) nên chữ ký và số khung không quay về cũ: chờ đúng số cột.
  await page.waitForFunction(({ signature, columns }) => {
    const skeleton = document.querySelector("[data-advertising-cta-skeleton]");
    return skeleton?.dataset.advertisingCtaColumns === columns
      && skeleton.dataset.advertisingCtaSignature !== signature;
  }, { signature: narrowSignature, columns: beforeResizeColumns });
  await ready(page);
  const roundTripBySlot = new Map((await flowAssignments(page)).map((assignment) => [assignment.slot, assignment]));
  // Band dựng lại có thể đổi khi cột mới đặt slot ngay dưới khung cùng band (skeleton R1); chỉ assignment Flow phải giữ.
  const keptSlots = filteredAssignments.filter(({ slot }) => roundTripBySlot.has(slot));
  assert.ok(keptSlots.length > 0, "resize round trip kept no Flow slot");
  assert.deepEqual(keptSlots.map(({ slot }) => stableFlowAssignment(roundTripBySlot.get(slot))),
    keptSlots.map(stableFlowAssignment),
    "resize round trip changed assignments within one page state");

  await page.reload({ waitUntil: "networkidle" });
  await ready(page);
  const reloadAssignments = await flowAssignments(page);
  assertFlowBatch(reloadAssignments, "reload lifecycle");
  assert.notEqual(assignmentSignature(reloadAssignments), assignmentSignature(filteredAssignments),
    "reload reused the previous Flow batch");

  await page.locator("[data-advertising-card] a").first().evaluate((node) => node.click());
  await page.waitForFunction(() => document.body.classList.contains("is-advertising-photo"));
  await page.evaluate(() => history.back());
  await page.waitForFunction(() => !document.body.classList.contains("is-advertising-photo"));
  await ready(page);
  const historyAssignments = await flowAssignments(page);
  assertFlowBatch(historyAssignments, "detail/history lifecycle");
  assert.notEqual(assignmentSignature(historyAssignments), assignmentSignature(reloadAssignments),
    "photo Back starts a new page state and draws again (skeleton R3)");

  await page.evaluate(() => history.forward());
  await page.waitForFunction(() => document.body.classList.contains("is-advertising-photo"));
  await page.evaluate(() => history.back());
  await page.waitForFunction(() => !document.body.classList.contains("is-advertising-photo"));
  await ready(page);
  const secondHistoryAssignments = await flowAssignments(page);
  assertFlowBatch(secondHistoryAssignments, "native Back/Forward lifecycle");
  assert.notEqual(assignmentSignature(secondHistoryAssignments), assignmentSignature(historyAssignments),
    "photo Forward/Back draws again (skeleton R3)");

  let stableAssignments = secondHistoryAssignments;
  const timeline = await collectFlowWindow(page);
  const drift = timeline.map((sample) => matrix(sample.surface));
  assert(drift.every(({ x, y }) => Math.abs(x) <= 0.1 && Math.abs(y) <= 0.1),
    "skeleton surface moved even though R6 assigns motion to WebGL only");
  assert.equal(new Set(drift.map(({ x, y }) => `${rounded(x)},${rounded(y)}`)).size, 1,
    "skeleton surface transform changed while visible");
  assert(new Set(timeline.map(({ digest }) => digest)).size >= 3, "skeleton canvas Flow is static within 0.9 seconds");
  assert(Math.max(...timeline.map(({ height }) => height)) - Math.min(...timeline.map(({ height }) => height)) <= 0.1,
    "skeleton loop changes grid height");

  const lossSupported = await page.evaluate(() => {
    const canvas = document.querySelector(".advertising-grid__cta-shared-flow");
    const gl = canvas?.getContext("webgl") || canvas?.getContext("experimental-webgl");
    const extension = gl?.getExtension("WEBGL_lose_context");
    if (!extension) return false;
    window.__ttSkeletonLossExtension = extension;
    extension.loseContext();
    return true;
  });
  assert(lossSupported, "Chromium does not expose WEBGL_lose_context for the restore regression");
  await page.waitForTimeout(250);
  const paintsWhileLost = await page.evaluate(() =>
    document.querySelector(".advertising-grid__cta-shared-flow")?.__ttSkeletonPaints || 0);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() =>
    document.querySelector(".advertising-grid__cta-shared-flow")?.__ttSkeletonPaints || 0), paintsWhileLost,
    "skeleton kept issuing WebGL draws while its context was lost");
  await page.evaluate(() => window.__ttSkeletonLossExtension.restoreContext());
  await page.waitForFunction((before) =>
    (document.querySelector(".advertising-grid__cta-shared-flow")?.__ttSkeletonPaints || 0) > before,
  paintsWhileLost);

  await page.setViewportSize({ width: 1569, height: 912 });
  await ready(page);
  // Cỡ mới dựng thêm slot ở đáy batch; các slot cũ giữ assignment, rồi đây là mốc mới cho các lần cuộn bên dưới.
  const resizedAssignments = await flowAssignments(page);
  const resizedBySlot = new Map(resizedAssignments.map((assignment) => [assignment.slot, assignment]));
  assert.deepEqual(stableAssignments.filter(({ slot }) => resizedBySlot.has(slot)).map(stableFlowAssignment),
    stableAssignments.filter(({ slot }) => resizedBySlot.has(slot)).map(({ slot }) => stableFlowAssignment(resizedBySlot.get(slot))),
    "viewport resize changed the Flow assignment of an existing slot");
  stableAssignments = resizedAssignments;
  await page.evaluate(() => {
    const bounds = [...document.querySelectorAll("[data-advertising-cta-frame]")]
      .map(frame => frame.getBoundingClientRect());
    const firstVisibleScroll = Math.max(...bounds.map(rect => rect.top)) - innerHeight;
    const lastVisibleScroll = Math.min(...bounds.map(rect => rect.bottom));
    const motion = window.TruongThinhMotion;
    const target = (motion?.getLogicalScroll?.() ?? scrollY) + (firstVisibleScroll + lastVisibleScroll) / 2;
    if (!motion?.setLogicalScroll?.(target)) window.scrollTo(0, target);
  });
  await page.waitForTimeout(1000);
  await page.bringToFront();
  // Flow chỉ chạy khung đang thấy (R4); chiều cao batch ngẫu nhiên nên không phải lúc nào mọi khung cũng lọt 912px.
  await page.waitForFunction(() => {
    const inView = [...document.querySelectorAll("[data-advertising-cta-frame]")].filter(frame => {
      const rect = frame.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    });
    return inView.length > 0 && inView.every(frame => frame.dataset.advertisingFlowState === "running"
      && window.__ttFlowLive(frame));
  });
  const desktopScene = await page.evaluate(() => {
    const frames = [...document.querySelectorAll("[data-advertising-cta-frame]")];
    return { width: innerWidth, height: innerHeight, frames: frames.length,
      top: Math.min(...frames.map(frame => frame.getBoundingClientRect().top)),
      bottom: Math.max(...frames.map(frame => frame.getBoundingClientRect().bottom)),
      fullyVisible: frames.filter(frame => {const rect = frame.getBoundingClientRect();return rect.top >= -1 && rect.bottom <= innerHeight + 1;}).length,
      visible: frames.filter(frame => {const rect = frame.getBoundingClientRect();return rect.bottom > 0 && rect.top < innerHeight;}).length,
      running: frames.filter(frame => {const rect = frame.getBoundingClientRect();return rect.bottom > 0 && rect.top < innerHeight
        && frame.dataset.advertisingFlowState === "running" && window.__ttFlowLive(frame);}).length };
  });
  assert.deepEqual([desktopScene.width, desktopScene.height], [1569, 912], "R4 desktop uses the accepted viewport");
  evidence.performance.desktop = { scene: desktopScene };
  assert.ok(desktopScene.visible > 0 && desktopScene.visible === desktopScene.running,
    "R4 measures every visible skeleton renderer concurrently");
  const desktopPerformanceDiagnostic = await measureAnimationPerformance(page, 5000);
  evidence.performance.desktop = { scene: desktopScene, probe: desktopPerformanceDiagnostic };
  assert.ok(desktopPerformanceDiagnostic.fps >= 30, "R4 desktop skeleton loop stays at or above 30fps");
  assert.ok(desktopPerformanceDiagnostic.frames.every(frame => frame.connected && frame.fps >= 30),
    "R4 measures at least 30fps for every visible renderer");
  if (desktopPerformanceDiagnostic.supportsLongTask) assert.ok(desktopPerformanceDiagnostic.maxLongTask <= 50, "R4 has no measured long task over 50ms");
  await exitSkeletonViewport(page);
  const mobilePerformanceContext = await browser.newContext({
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  });
  const mobilePerformancePage = await mobilePerformanceContext.newPage();
  await installSkeletonPaintProbe(mobilePerformancePage);
  await mobilePerformancePage.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "networkidle" });
  await ready(mobilePerformancePage);
  await mobilePerformancePage.waitForTimeout(1000);
  const mobileVisible = await mobilePerformancePage.evaluate(() => {
    const visible = [...document.querySelectorAll("[data-advertising-cta-frame]")].filter((frame) => {
      const rect = frame.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    });
    return {
      count: visible.length,
      running: visible.filter((frame) => frame.dataset.advertisingFlowState === "running").length,
      staticFallbacks: visible.filter((frame) => frame.querySelector("canvas")
        && getComputedStyle(frame.querySelector("canvas")).backgroundImage !== "none").length,
      contexts: document.querySelectorAll('.advertising-grid__cta-shared-flow, [data-advertising-flow-backend="webgl"]').length,
    };
  });
  assert(mobileVisible.count > 2 && mobileVisible.running >= 1 && mobileVisible.contexts === 1,
    `A54 simultaneous viewport did not keep one shared WebGL context (${JSON.stringify(mobileVisible)})`);
  assert.equal(mobileVisible.staticFallbacks, mobileVisible.count,
    "A54 viewport contains a blank preset fallback");
  const mobilePerformanceState = await mobilePerformancePage.evaluate(() => ({
    contexts: document.querySelectorAll(".advertising-grid__cta-shared-flow").length,
    devicePixelRatio,
  }));
  await mobilePerformancePage.waitForTimeout(1000);
  const mobileProbes = [];
  for (let run = 0; run < 3; run++) mobileProbes.push(await measureAnimationPerformance(mobilePerformancePage, 5000));
  const medianFps = mobileProbes.map(probe => probe.fps).sort((left, right) => left - right)[1];
  const performanceProbe = { ...mobileProbes[1], fps: medianFps,
    maxLongTask: Math.max(...mobileProbes.map(probe => probe.maxLongTask)),
    supportsLongTask: mobileProbes.every(probe => probe.supportsLongTask) };
  evidence.performance.mobile = { profile: "A54 emulation, 360x800 DPR3; physical gate remains separate", probes: mobileProbes, medianFps };
  assert.ok(mobileProbes.every(probe => probe.activeFrameCount >= 1 && probe.activeFrameCount <= 2), "R10 all three probes keep the two-context budget");
  await mobilePerformancePage.evaluate(() => {
    window.__ttMobileRenderers = [...document.querySelectorAll('.advertising-grid__cta-shared-flow, [data-advertising-flow-backend="webgl"]')];
    window.__ttMobileTransitionCount = 0;
    window.__ttMobileTransitionListener = (event) => {
      if (event.propertyName === "opacity" && event.target.matches?.(".advertising-grid__cta-flow")) {
        window.__ttMobileTransitionCount += 1;
      }
    };
    document.addEventListener("transitionrun", window.__ttMobileTransitionListener);
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await mobilePerformancePage.waitForFunction(() => !document.querySelector("[data-advertising-cta-frame].is-looping"));
  await mobilePerformancePage.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await mobilePerformancePage.waitForFunction(() => document.querySelector("[data-advertising-cta-frame].is-looping"));
  await mobilePerformancePage.emulateMedia({ reducedMotion: "reduce" });
  await mobilePerformancePage.waitForFunction(() => !document.querySelector("[data-advertising-cta-frame].is-looping"));
  await mobilePerformancePage.emulateMedia({ reducedMotion: "no-preference" });
  await mobilePerformancePage.waitForFunction(() => document.querySelector("[data-advertising-cta-frame].is-looping"));
  const retainedMobile = await mobilePerformancePage.evaluate(() => {
    document.removeEventListener("transitionrun", window.__ttMobileTransitionListener);
    const result = {
      sameCanvases: window.__ttMobileRenderers.length > 0 && window.__ttMobileRenderers.every((canvas) => canvas.isConnected),
      contexts: document.querySelectorAll('.advertising-grid__cta-shared-flow, [data-advertising-flow-backend="webgl"]').length,
      transitions: window.__ttMobileTransitionCount,
    };
    delete window.__ttMobileRenderers;
    delete window.__ttMobileTransitionCount;
    delete window.__ttMobileTransitionListener;
    return result;
  });
  assert(retainedMobile.sameCanvases && retainedMobile.contexts <= 2 && retainedMobile.transitions === 0,
    `A54 focus/reduced toggle remounted or replayed Flow (${JSON.stringify(retainedMobile)})`);
  await mobilePerformancePage.emulateMedia({ reducedMotion: "reduce" });
  await mobilePerformancePage.reload({ waitUntil: "networkidle" });
  await mobilePerformancePage.waitForFunction(() =>
    document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaReady === "true");
  const freshReduced = await mobilePerformancePage.evaluate(() => ({
    contexts: document.querySelectorAll('.advertising-grid__cta-shared-flow, [data-advertising-flow-backend="webgl"]').length,
    // Frame draw ở lần vào đầu tiên, nên chỉ frame trong view mới phải hiện still.
    staticFrames: [...document.querySelectorAll("[data-advertising-cta-frame]")].filter((frame) => {
      const rect = frame.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    }).every((frame) => frame.querySelector("canvas")
      && getComputedStyle(frame.querySelector("canvas")).backgroundImage !== "none"
        && Number.parseFloat(getComputedStyle(frame.querySelector("canvas")).transitionDuration) <= 0.001),
  }));
  assert(freshReduced.contexts === 0 && freshReduced.staticFrames,
    `A54 fresh reduced-motion load allocated WebGL or animated fallback (${JSON.stringify(freshReduced)})`);
  await mobilePerformancePage.emulateMedia({ reducedMotion: "no-preference" });
  await ready(mobilePerformancePage);
  await mobilePerformancePage.setViewportSize({ width: 1440, height: 900 });
  await mobilePerformancePage.setViewportSize({ width: 360, height: 800 });
  await ready(mobilePerformancePage);
  const resizedMobile = await mobilePerformancePage.evaluate(() => ({
    contexts: document.querySelectorAll('.advertising-grid__cta-shared-flow, [data-advertising-flow-backend="webgl"]').length,
    blanks: [...document.querySelectorAll("[data-advertising-cta-frame]")].filter((frame) => {
      const rect = frame.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight && (!frame.querySelector("canvas")
        || getComputedStyle(frame.querySelector("canvas")).backgroundImage === "none");
    }).length,
  }));
  assert(resizedMobile.contexts <= 2 && resizedMobile.blanks === 0,
    `A54 resize leaked contexts or blanked a Flow card (${JSON.stringify(resizedMobile)})`);
  await mobilePerformanceContext.close();
  assert.equal(mobilePerformanceState.devicePixelRatio, 3,
    "A54 performance probe did not retain DPR 3");
  assert(performanceProbe.activeFrameCount >= 1 && performanceProbe.activeFrameCount <= 2,
    `A54 performance probe exceeded two active WebGL contexts (${JSON.stringify(performanceProbe)})`);
  assert.equal(mobilePerformanceState.contexts, performanceProbe.activeFrameCount,
    "A54 performance probe context count changed during measurement");
  assert(performanceProbe.fps >= 30,
    `A54 skeleton WebGL probe fell below 30fps (${JSON.stringify({ performanceProbe, desktopPerformanceDiagnostic })})`);
  if (performanceProbe.supportsLongTask) {
    assert(performanceProbe.maxLongTask <= 50,
      `A54 skeleton WebGL loop produced a long task over 50ms (${performanceProbe.maxLongTask})`);
  }

  const firstExit = await exitSkeletonViewport(page);
  assert(Math.abs(firstExit.opacity - firstExit.targetOpacity) <= 0.01, "offscreen skeleton lost its settled reveal state");
  assert(Math.abs(firstExit.transformY) <= 0.1, "offscreen skeleton changed frame geometry");
  // Frame ngoài màn hình nhả lease; đọc fallback bằng getContext sẽ cấp phát một context không được quản lý.
  const pausedPaints = await page.evaluate(() => ({ ...window.__ttSkeletonPaints }));
  await page.evaluate(() => new Promise((resolve) => {
    const started = performance.now();
    const tick = () => performance.now() - started >= 450 ? resolve() : requestAnimationFrame(tick);
    tick();
  }));
  assert.deepEqual(await page.evaluate(() => ({ ...window.__ttSkeletonPaints })), pausedPaints,
    "offscreen skeleton has zero connected and detached WebGL paints");
  assert.ok(await page.evaluate(() => [...document.querySelectorAll("[data-advertising-flow-preset]")]
    .every(canvas => getComputedStyle(canvas).backgroundImage !== "none")), "released offscreen frames retain filled static fallbacks");

  const entryContract = await skeletonEntryContract(page);
  // Frame của batch vào bằng Kính reveal 0.6s từ runtime, không bao giờ là CSS opacity fade (skeleton R4).
  assert.equal(entryContract.frame.opacity, null, "skeleton frame must not fade its opacity in CSS");
  assert(entryContract.stagger.every((delay) => delay === undefined),
    "skeleton frames must not carry an opacity transition");
  assert(Math.abs(matrix(entryContract.frame.transform).y) <= 0.1,
    "skeleton frame must retain its geometry before entry");
  assert.equal(entryContract.frame.maskImage, "none", "frame retained a local fade mask");
  assert.equal(entryContract.skeleton.maskImage, "none",
    "skeleton container retained a local boundary mask instead of the shared glass surface");
  assert.equal(entryContract.skeleton.pointerEvents, "none",
    "skeleton container must not expose a hover target");
  assert.equal(entryContract.surface.animationName, "none", "skeleton surface retained float or scale animation");

  await reenterSkeletonViewport(page, "first viewport re-entry");
  await assertSlotsKept(page, stableAssignments,
    "scroll changed Flow assignments within one page load");
  const secondExit = await exitSkeletonViewport(page);
  assert(Math.abs(secondExit.opacity - secondExit.targetOpacity) <= 0.01, "second full exit lost the settled reveal state");
  assert(Math.abs(secondExit.transformY) <= 0.1, "second full exit changed frame geometry");
  await reenterSkeletonViewport(page, "second viewport re-entry");
  await assertSlotsKept(page, stableAssignments,
    "second viewport replay changed Flow assignments within one page load");

  await page.locator("[data-advertising-cta-frame]").first().evaluate((frame) => {
    window.__ttSkeletonVisibilityReplayCount = 0;
    window.__ttSkeletonVisibilityListener = new MutationObserver((records) => {
      window.__ttSkeletonVisibilityReplayCount += records.filter((record) => [...record.addedNodes]
        .some((node) => node.dataset && "glassReveal" in node.dataset)).length;
    });
    window.__ttSkeletonVisibilityListener.observe(frame, { childList: true });
  });
  for (let cycle = 0; cycle < 2; cycle += 1) {
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForFunction(() => !document.querySelector("[data-advertising-cta-frame].is-looping"));
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForFunction(() => !document.hidden && document.querySelector("[data-advertising-cta-frame].is-looping"));
  }
  const visibilityReplay = await page.locator("[data-advertising-cta-frame]").first().evaluate((frame) => {
    window.__ttSkeletonVisibilityListener.disconnect();
    const result = {
      count: window.__ttSkeletonVisibilityReplayCount,
      entryReady: frame.classList.contains("is-entry-ready"),
      opacity: Number(getComputedStyle(frame).opacity),
      targetOpacity: Number(getComputedStyle(frame).getPropertyValue("--advertising-cta-frame-opacity")),
    };
    delete window.__ttSkeletonVisibilityListener;
    delete window.__ttSkeletonVisibilityReplayCount;
    return result;
  });
  assert.equal(visibilityReplay.count, 0, "page visibility resume replayed the Kinh reveal");
  assert(visibilityReplay.entryReady && Math.abs(visibilityReplay.opacity - visibilityReplay.targetOpacity) <= 0.01,
    "page visibility resume lost the settled skeleton reveal state");
  await assertSlotsKept(page, stableAssignments,
    "page visibility resume changed Flow assignments or ratio bands");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => !document.querySelector("[data-advertising-cta-frame].is-looping")
    && document.querySelector(".advertising-grid__cta-surface")?.getAnimations().length === 0
    && document.querySelector("[data-advertising-cta-frame]")?.dataset.advertisingFlowState === "paused");
  const reducedState = await page.locator("[data-advertising-cta-frame]").first().evaluate((frame) => {
    const style = getComputedStyle(frame);
    const canvas = document.querySelector(".advertising-grid__cta-shared-flow");
    return {
      opacity: Number(style.opacity),
      paints: canvas?.__ttSkeletonPaints || 0,
      targetOpacity: Number(style.getPropertyValue("--advertising-cta-frame-opacity")),
      transformY: new DOMMatrixReadOnly(style.transform).m42,
    };
  });
  await page.waitForTimeout(250);
  assert(Math.abs(reducedState.opacity - reducedState.targetOpacity) <= 0.01,
    "reduced motion skeleton is not immediately visible");
  assert(Math.abs(reducedState.transformY) <= 0.1, "reduced motion skeleton retains an entry transform");
  assert.equal(await page.evaluate(() =>
    document.querySelector(".advertising-grid__cta-shared-flow")?.__ttSkeletonPaints || 0), reducedState.paints,
  "reduced motion skeleton kept advancing WebGL");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(() => document.querySelector("[data-advertising-cta-frame].is-looping"));

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.evaluate(async () => {
      window.TruongThinhAdvertising.unmount();
      await window.TruongThinhAdvertising.mount();
    });
    await ready(page);
  }
  const remounted = await snapshot(page);
  assert(remounted.frameCount >= remounted.columns && remounted.frontierCoverage >= -1,
    "twenty remounts lost adaptive skeleton frontier coverage");
  assert.equal(remounted.looping, remounted.flowStates.filter(({ inViewport }) => inViewport).length,
    "twenty remounts left a detached skeleton lifecycle");
  const detachedAfterRemount = await page.evaluate(() => window.__ttSkeletonPaints.detached);
  await page.waitForTimeout(350);
  assert.equal(await page.evaluate(() => window.__ttSkeletonPaints.detached), detachedAfterRemount,
    "twenty remounts left a detached canvas RAF loop");

  await page.goto(`${baseUrl}/vi/advertising-products/?photo=kiosk-posm-01`, { waitUntil: "networkidle" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(() => document.body.classList.contains("is-advertising-photo"));
  const navLink = page.locator('.desktop-nav a[aria-current="page"]');
  await navLink.waitFor();
  await page.waitForFunction(() => {
    const node = document.querySelector('.desktop-nav a[aria-current="page"]');
    return node && Math.abs(new DOMMatrixReadOnly(getComputedStyle(node, "::after").transform).a) <= 0.01;
  });
  const beforeHover = await navLink.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node, "::after").transform).a);
  assert(Math.abs(beforeHover) <= 0.01, "Advertising detail nav underline starts visible");
  await navLink.hover();
  await page.waitForFunction(() => {
    const node = document.querySelector('.desktop-nav a[aria-current="page"]');
    return Math.abs(new DOMMatrixReadOnly(getComputedStyle(node, "::after").transform).a - 1) <= 0.01;
  });
  const afterHover = await navLink.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node, "::after").transform).a);
  assert(Math.abs(afterHover - 1) <= 0.01, "Advertising detail nav underline does not reach scaleX(1)");

  for (const navCase of [
    { locale: "vi", mobile: false, query: "?category=standee-ke-trung-bay" },
    { locale: "vi", mobile: true, query: "?category=standee-ke-trung-bay&photo=kiosk-posm-01" },
    { locale: "en", mobile: false, query: "?category=displays-booths&photo=kiosk-posm-01&tag=product-kiosk-posm-product-06" },
  ]) {
    await assertCanonicalAdvertisingNav(page, navCase);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/en/advertising-products/`, { waitUntil: "networkidle" });
  // Trang nền trong headless không chạy rAF nên route-enter không gỡ.
  await page.bringToFront();
  await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
  // Direct load phủ route veil đến khi phase enter gỡ route-enter; nút menu bị veil chặn click trước đó.
  await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
  await page.locator("[data-menu-open]").click();
  await page.locator('#site-menu .menu-group__title[href="/en/advertising-products/"]').click();
  assert.equal(new URL(page.url()).pathname, "/en/advertising-products/", "parent nav changed canonical locale route");
  assert.equal(new URL(page.url()).search, "", "parent nav added query state");
  assert.equal(await page.locator('[data-advertising-filter="all"]').getAttribute("aria-current"), "true", "parent nav changed All filter");
  // Lần vào đầu tiên: reveal chạy khi Kính cung ngoài viewport, không chạy khi cung đang giao viewport.
  const revealedEntry = await firstEntryReveals(browser, "first-frame");
  assert(revealedEntry.added.length >= 1, "first entry: frame did not play the Kinh reveal");
  assert(revealedEntry.added.every(({ arcInView }) => !arcInView), "first entry: Kinh reveal played while the arc Kinh was in view");
  assert.equal(revealedEntry.lifetimes.length, revealedEntry.added.length, "first entry: Kinh reveal was not removed after playing");
  assert(revealedEntry.lifetimes.every((ms) => ms >= 500 && ms <= 1_500),
    `first entry: Kinh reveal should last about 0.6s (${revealedEntry.lifetimes.map(Math.round)}ms)`);
  assert.equal(revealedEntry.leftover, 0, "first entry: Kinh reveal stayed in the frame");
  const arcEntry = await firstEntryReveals(browser, "page-end");
  assert.equal(arcEntry.added.length, 0, "first entry under the arc Kinh must only crossfade");
  assert.deepEqual(errors, [], "continuation emitted browser errors");
  evidence.errors = errors;
  evidence.pass = true;
  await page.close();
} catch (error) {
  evidence.pass = false; evidence.failure = error.message;
  throw error;
} finally {
  await fs.writeFile(path.join(output, "results.json"), JSON.stringify(evidence, null, 2));
  console.log("Continuation evidence: " + output);
  await browser.close();
}
