import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

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
  await page.waitForFunction(() => document.querySelector("[data-advertising-cta-frame]")?.classList.contains("is-looping"));
  await page.waitForFunction(() => {
    const visible = [...document.querySelectorAll("[data-advertising-cta-frame]")]
      .filter((frame) => {
      const rect = frame.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
      });
    const running = visible.filter((frame) => frame.dataset.advertisingFlowState === "running").length;
    return document.documentElement.clientWidth <= 750
      ? running >= 1 && running <= 2
        && visible.every((frame) => ["running", "paused"].includes(frame.dataset.advertisingFlowState))
      : visible.every((frame) => frame.dataset.advertisingFlowState === "running");
  });
  await page.waitForFunction(() => {
    const frame = document.querySelector("[data-advertising-cta-frame]");
    const transform = frame && new DOMMatrixReadOnly(getComputedStyle(frame).transform);
    return transform && Math.abs(transform.m42) <= 0.1;
  });
}

async function flowAssignments(page) {
  return page.evaluate(() => [...document.querySelectorAll("[data-advertising-cta-frame]")]
    .map((frame) => {
      const canvas = frame.querySelector("[data-advertising-flow-preset]");
      return {
        slot: `${frame.dataset.advertisingCtaColumn}:${frame.dataset.advertisingCtaDepth}`,
        preset: canvas?.dataset.advertisingFlowPreset,
        anchorPermutation: canvas?.dataset.advertisingFlowAnchorPermutation,
        phase: Number(canvas?.dataset.advertisingFlowPhase),
        direction: Number(canvas?.dataset.advertisingFlowDirection),
        ratioBand: frame.dataset.advertisingCtaRatioBand,
      };
    })
    .sort((left, right) => left.slot.localeCompare(right.slot)));
}

function assertFlowBatch(assignments, label) {
  assert(assignments.length > 0, `${label}: Flow batch is empty`);
  if (assignments.length <= SKELETON_FLOW_PRESETS.length) {
    assert.equal(new Set(assignments.map(({ preset }) => preset)).size, assignments.length,
      `${label}: Flow batch repeats a preset`);
    assert.equal(new Set(assignments.map(({ anchorPermutation }) => anchorPermutation)).size, assignments.length,
      `${label}: Flow batch repeats an anchor permutation`);
  }
  assert.equal(new Set(assignments.map(({ preset, anchorPermutation, phase, direction }) =>
    `${preset}|${anchorPermutation}|${phase}|${direction}`)).size, assignments.length,
  `${label}: Flow batch repeats one complete assignment`);
  assert(assignments.every(({ anchorPermutation }) =>
    anchorPermutation?.split(",").map(Number).sort().join(",") === "0,1,2,3"),
  `${label}: Flow batch has an invalid anchor permutation`);
  if (assignments.length <= SKELETON_FLOW_PRESETS.length) {
    assert.equal(new Set(assignments.map(({ phase }) => phase)).size, assignments.length,
      `${label}: Flow batch repeats a starting phase`);
  }
  assert(assignments.every(({ phase }) => Number.isFinite(phase)),
    `${label}: Flow batch has a non-finite starting phase`);
  assert(assignments.every(({ direction }) => direction === -1 || direction === 1),
    `${label}: Flow batch direction must be negative or positive`);
  const directionBalance = assignments.reduce((total, { direction }) => total + direction, 0);
  assert(Math.abs(directionBalance) <= 1, `${label}: Flow directions are not near-balanced`);
}

function assignmentSignature(assignments) {
  return assignments.map(({ slot, preset, anchorPermutation, phase, direction, ratioBand }) =>
    `${slot}|${preset}|${anchorPermutation}|${phase}|${direction}|${ratioBand}`).join(";");
}

function stableFlowAssignment({ slot, preset, anchorPermutation, phase, direction }) {
  return { slot, preset, anchorPermutation, phase, direction };
}

async function assertCanonicalAdvertisingNav(page, { locale, mobile, query }) {
  const canonicalPath = `/${locale}/advertising-products/`;
  await page.setViewportSize(mobile
    ? { width: 390, height: 844 }
    : { width: 1440, height: 900 });
  await page.goto(`${baseUrl}${canonicalPath}${query}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
  const sourceUrl = new URL(page.url());
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
  const sourceBrowse = {
    category: sourceUrl.searchParams.get("category") || "all",
    photo: sourceUrl.searchParams.get("photo"),
    tag: sourceUrl.searchParams.get("tag"),
  };
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
    const sectionRect = section?.getBoundingClientRect();
    const glassStyle = section ? getComputedStyle(section, "::before") : null;
    const heroFrame = document.querySelector(".advertising-photo-view__hero-frame");
    const heroStyle = heroFrame ? getComputedStyle(heroFrame, "::after") : null;
    const glassLeft = (sectionRect?.left || 0) + (Number.parseFloat(glassStyle?.left) || 0);
    const glassWidth = Number.parseFloat(glassStyle?.width) || 0;
    const ctaRect = cta?.getBoundingClientRect();
    const copyRect = cta.querySelector(".detail-cta__copy").getBoundingClientRect();
    const headingRect = cta.querySelector("h2").getBoundingClientRect();
    const linkRect = cta.querySelector(".detail-cta__copy a").getBoundingClientRect();
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
      copyTopRatio: (copyRect.top - ctaRect.top) / ctaRect.height,
      copyBottom: copyRect.bottom - ctaRect.top,
      headingLinkGap: linkRect.top - headingRect.bottom,
      headerClearance,
      viewportHeight: innerHeight,
      skeletonCoverageRatio: Math.max(0, deepestFrameBottom - ctaRect.top) / ctaRect.height,
      skeletonRatioToken: Number.parseFloat(getComputedStyle(cta).getPropertyValue("--advertising-cta-skeleton-ratio")) || 0,
      glassStart: Number.parseFloat(getComputedStyle(skeleton).getPropertyValue("--advertising-cta-skeleton-glass-start")) || 0,
      fadeStart: Number.parseFloat(getComputedStyle(skeleton).getPropertyValue("--advertising-cta-skeleton-fade-start")) || 0,
      boundaryBottom: Number.parseFloat(getComputedStyle(skeleton).getPropertyValue("--advertising-cta-skeleton-boundary-bottom")) || 0,
      realBottom: Number.parseFloat(skeleton.dataset.advertisingCtaRealBottom) || 0,
      cardWidth: frameRects[0]?.width || 0,
      boundaryMask: getComputedStyle(skeleton).maskImage,
      boundaryBlur: glassStyle?.backdropFilter || glassStyle?.getPropertyValue("-webkit-backdrop-filter") || "",
      boundaryTint: glassStyle?.backgroundColor || "",
      boundaryBlurMask: glassStyle?.maskImage || glassStyle?.getPropertyValue("-webkit-mask-image") || "",
      photoGlassActive: document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoGlass === "true",
      photoGlassBlur: heroStyle?.backdropFilter || heroStyle?.getPropertyValue("-webkit-backdrop-filter") || "",
      photoGlassTint: heroStyle?.backgroundColor || "",
      glassLeft,
      glassRight: glassLeft + glassWidth,
      glassBackground: glassStyle?.backgroundImage || "",
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
        - (Number.parseFloat(getComputedStyle(skeleton).getPropertyValue("--advertising-cta-skeleton-boundary-bottom")) || 0),
      physicalLines: cta.querySelectorAll("h2 > .motion-line-mask").length,
      looping: [...document.querySelectorAll("[data-advertising-cta-frame]")].filter((frame) => frame.classList.contains("is-looping")).length,
      flowCanvases: document.querySelectorAll("[data-advertising-cta-frame] canvas[data-advertising-flow-preset]").length,
      liveWebglContexts: document.querySelectorAll('[data-advertising-cta-frame] canvas[data-advertising-flow-backend="webgl"]').length,
      flowPresets: [...document.querySelectorAll("[data-advertising-flow-preset]")].map((canvas) => canvas.dataset.advertisingFlowPreset),
      frameState,
      frontierGaps,
      flowStates: [...document.querySelectorAll("[data-advertising-cta-frame]")].map((frame) => {
        const rect = frame.getBoundingClientRect();
        return {
          inViewport: rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth,
          state: frame.dataset.advertisingFlowState,
          staticImage: getComputedStyle(frame.querySelector("canvas")).backgroundImage !== "none",
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
    const canvas = surface.querySelector("canvas");
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

async function replaySkeletonEntry(page, label) {
  await page.locator("[data-advertising-cta-frame]").first().evaluate((frame) => {
    window.__ttSkeletonEntryEvents = [];
    window.__ttSkeletonPaintTimeline = [];
    window.__ttSkeletonEntryListener = (event) => {
      window.__ttSkeletonEntryEvents.push({ at: performance.now(), property: event.propertyName, type: event.type });
    };
    frame.addEventListener("transitionrun", window.__ttSkeletonEntryListener);
    frame.addEventListener("transitionend", window.__ttSkeletonEntryListener);
    const rect = frame.getBoundingClientRect();
    const motion = window.TruongThinhMotion;
    const current = motion?.getLogicalScroll?.() ?? window.scrollY;
    const target = current + rect.top - Math.max(0, (innerHeight - rect.height) / 2);
    if (!motion?.setLogicalScroll?.(target)) window.scrollTo(0, target);
  });
  await page.waitForFunction(() => document.querySelector("[data-advertising-cta-frame].is-looping"));
  await page.waitForTimeout(100);
  await page.waitForTimeout(750);
  const result = await page.locator("[data-advertising-cta-frame]").first().evaluate((frame) => {
    frame.removeEventListener("transitionrun", window.__ttSkeletonEntryListener);
    frame.removeEventListener("transitionend", window.__ttSkeletonEntryListener);
    delete window.__ttSkeletonEntryListener;
    const style = getComputedStyle(frame);
    return {
      endpointOpacity: Number(style.opacity),
      events: window.__ttSkeletonEntryEvents,
      firstPaintAt: window.__ttSkeletonPaintTimeline[0]?.at,
      targetOpacity: Number(style.getPropertyValue("--advertising-cta-frame-opacity")),
      transformY: new DOMMatrixReadOnly(style.transform).m42,
    };
  });
  const opacityRun = result.events.find(({ property, type }) => property === "opacity" && type === "transitionrun");
  const opacityEnd = result.events.find(({ property, type }) => property === "opacity" && type === "transitionend");
  assert(opacityRun, `${label}: opacity entry did not run`);
  assert(opacityEnd, `${label}: opacity entry did not settle`);
  assert(!result.events.some(({ property }) => property === "transform"), `${label}: entry animated transform`);
  assert(Number.isFinite(result.firstPaintAt), `${label}: WebGL did not start after viewport entry`);
  assert(result.firstPaintAt >= opacityEnd.at,
    `${label}: WebGL started before opacity entry settled`);
  assert(Math.abs(result.endpointOpacity - result.targetOpacity) <= 0.01,
    `${label}: entry opacity did not reach its endpoint`);
  assert(Math.abs(result.transformY) <= 0.1, `${label}: entry changed frame geometry`);
}

const installSkeletonPaintProbe = (targetPage) => targetPage.addInitScript(() => {
  window.__ttSkeletonPaints = { connected: 0, detached: 0 };
  window.__ttSkeletonPaintTimeline = [];
  const nativeDrawArrays = WebGLRenderingContext.prototype.drawArrays;
  WebGLRenderingContext.prototype.drawArrays = function patchedDrawArrays(...args) {
    if (this.canvas?.matches?.(".advertising-grid__cta-flow")) {
      const key = this.canvas.isConnected ? "connected" : "detached";
      window.__ttSkeletonPaints[key] += 1;
      this.canvas.__ttSkeletonPaints = (this.canvas.__ttSkeletonPaints || 0) + 1;
      if (this.canvas.isConnected) {
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
  const longTasks = [];
  const observer = typeof PerformanceObserver === "function"
    && PerformanceObserver.supportedEntryTypes?.includes("longtask")
    ? new PerformanceObserver((list) => longTasks.push(...list.getEntries().map(({ duration: entryDuration }) => entryDuration)))
    : null;
  observer?.observe({ type: "longtask", buffered: false });
  const paintsBefore = window.__ttSkeletonPaints.connected;
  const activeFrameCount = document.querySelectorAll("[data-advertising-cta-frame].is-looping").length;
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
  observer?.disconnect();
  return {
    activeFrameCount,
    elapsed,
    paints,
    fps: activeFrameCount ? paints * 1000 / elapsed / activeFrameCount : 0,
    rafFps: rafTicks * 1000 / elapsed,
    paintShare: activeFrameCount ? paints / activeFrameCount / rafTicks : 0,
    maxLongTask: longTasks.length ? Math.max(...longTasks) : 0,
    supportsLongTask: Boolean(observer),
  };
}, duration);

const browser = await chromium.launch({ headless: true });
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
        if (!/linear-gradient/i.test(state.glassBackground)
          || !/(?:rgb\(255, 255, 255\)|#fff) 100%/i.test(state.glassBackground)) {
          p7MobileFailures.push("global glass surface lacks pure-white gradient endpoint");
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
      const expectedSkeletonRatio = viewport.width <= 750 || viewport.height <= 640 ? 0.28 : 0.382;
      assert(state.ctaHeight > 0 && state.ctaHeight <= state.viewportHeight,
        `${locale} ${viewport.width}x${viewport.height}: tail solver emitted an invalid CTA height`);
      assert(Math.abs(state.skeletonRatioToken - expectedSkeletonRatio) <= 0.002,
        `${locale} ${viewport.width}x${viewport.height}: skeleton ratio token differs from the accepted composition`);
      assert(Math.min(...state.frameState.map(({ top }) => top)) < state.ctaBottom - state.ctaHeight,
        `${locale} ${viewport.width}x${viewport.height}: skeleton starts at the CTA row instead of continuing the real-card frontier`);
      assert(state.frontierGaps.length === state.columns
        && state.frontierGaps.every((gap) => gap !== null && Math.abs(gap - state.gridGap) <= 2),
      `${locale} ${viewport.width}x${viewport.height}: skeleton does not join each real-card column at the shared gap ${JSON.stringify(state.frontierGaps)}`);
      assert(state.copyTopRatio >= expectedSkeletonRatio - 0.02,
        `${locale} ${viewport.width}x${viewport.height}: CTA copy intrudes into the skeleton band`);
      assert(state.copyBottom <= state.ctaHeight + 1,
        `${locale} ${viewport.width}x${viewport.height}: CTA copy is clipped below the composition ${JSON.stringify({ copyBottom: state.copyBottom, ctaHeight: state.ctaHeight })}`);
      const expectedCtaGap = viewport.width <= 960 ? 15 : viewport.width <= 1200 ? 25 : 35;
      assert(Math.abs(state.headingLinkGap - expectedCtaGap) <= 1,
        `${locale} ${viewport.width}x${viewport.height}: CTA heading-to-link gap differs from the accepted responsive gap`);
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
      const ctaTop = state.ctaBottom - state.ctaHeight;
      const ctaHeadlineTop = ctaTop + state.ctaHeight * state.skeletonRatioToken;
      const expectedGlassStart = Math.max(state.realBottom, ctaHeadlineTop - state.cardWidth);
      const expectedFadeLead = Math.min(48, Math.max(1, (ctaHeadlineTop - expectedGlassStart) * 0.25));
      const expectedFadeStart = Math.max(
        expectedGlassStart + expectedFadeLead,
        ctaHeadlineTop - state.cardWidth * 0.5,
      );
      assert(Math.abs(state.glassStart - expectedGlassStart) <= 2,
        `${locale} ${viewport.width}: glass blur does not begin one reference card above the CTA`);
      assert(Math.abs(state.fadeStart - expectedFadeStart) <= 2,
        `${locale} ${viewport.width}: global fade does not begin half a reference card above the CTA`);
      assert(state.fadeStart > state.glassStart,
        `${locale} ${viewport.width}: global fade must start after the glass blur`);
      assert.equal(state.boundaryMask, "none",
        `${locale} ${viewport.width}: skeleton retained a local opacity mask outside global glass`);
      assert.equal(state.boundaryBlur, "blur(28px) saturate(1.08) brightness(1.04)",
        `${locale} ${viewport.width}: skeleton changed the shared glass filter`);
      if (state.photoGlassActive) {
        assert.equal(state.photoGlassBlur, state.boundaryBlur,
          `${locale} ${viewport.width}: active photo overflow no longer shares the skeleton glass filter`);
        assert.equal(state.photoGlassTint, "rgba(255, 255, 255, 0.12)",
          `${locale} ${viewport.width}: photo overflow changed the shared glass tint`);
      } else {
        assert.equal(state.photoGlassBlur, "none",
          `${locale} ${viewport.width}: photo glass must stay disabled without contain overflow`);
        assert.match(state.photoGlassTint, /rgba\(0, 0, 0, 0\)|transparent/,
          `${locale} ${viewport.width}: inactive photo glass retained a tint`);
      }
      assert.match(state.boundaryBlurMask, /linear-gradient/i,
        `${locale} ${viewport.width}: glass blur lacks one global gradient mask`);
      assert(Math.abs(state.glassLeft) <= 1,
        `${locale} ${viewport.width}: skeleton glass does not reach the viewport left edge`);
      assert(Math.abs(state.glassRight - viewport.width) <= 1,
        `${locale} ${viewport.width}: skeleton glass does not reach the viewport right edge`);
      assert.match(state.glassBackground, /linear-gradient/i,
        `${locale} ${viewport.width}: global glass surface does not own the white fade`);
      assert.match(state.glassBackground, /(?:rgb\(255, 255, 255\)|#fff) 100%/i,
        `${locale} ${viewport.width}: global glass endpoint is not pure white`);
      assert.equal(state.legacyWhiteWash, "none",
        `${locale} ${viewport.width}: legacy local white wash remains separate from global glass`);
      assert.equal(state.flowCanvases, state.frameCount, `${locale} ${viewport.width}: Flow canvas count differs from frames`);
      assert(state.flowPresets.every((id) => flowPresetIds.has(id)), `${locale} ${viewport.width}: unknown Flow preset`);
      const visibleFlowStates = state.flowStates.filter(({ inViewport }) => inViewport);
      const hiddenFlowStates = state.flowStates.filter(({ inViewport }) => !inViewport);
      assert(visibleFlowStates.length > 0, `${locale} ${viewport.width}: no Flow frame is visible`);
      if (viewport.width <= 750) {
        assert(visibleFlowStates.filter(({ state: flowState }) => flowState === "running").length <= 2,
          `${locale} ${viewport.width}: more than two mobile Flow cards are running`);
        assert(visibleFlowStates.every(({ state: flowState, staticImage }) => flowState === "running" || staticImage),
          `${locale} ${viewport.width}: paused Flow card lost its preset fallback`);
      } else {
        assert(visibleFlowStates.every(({ state: flowState }) => flowState === "running"),
          `${locale} ${viewport.width}: visible Flow is paused`);
      }
      assert(hiddenFlowStates.every(({ state: flowState }) => flowState === "paused"),
        `${locale} ${viewport.width}: offscreen Flow is running`);
      assert(state.paintOverflow > 0 && state.paintOverflow <= state.gridGap + 1,
        `${locale} ${viewport.width}: skeleton paint must cross the logical grid bottom by only one gap`);
      assert(Math.abs(state.boundaryBottom - state.ctaBottom - state.gridGap) <= 1.5,
        `${locale} ${viewport.width}: global glass endpoint does not cover the visual overflow`);
      assert(Math.abs(state.gridHeight - state.ctaBottom) <= 1.5,
        `${locale} ${viewport.width}: skeleton overflow increased the logical grid height`);
      assert(Math.abs(state.footerGap - state.footerTopGap) <= 2,
        `${locale} ${viewport.width}: footer boundary differs from the shared footer gap`);
      assert(state.overflow <= 1, `${locale} ${viewport.width}: horizontal overflow ${state.overflow}px`);
      const finalViewport = await page.evaluate(async () => {
        const motion = window.TruongThinhMotion;
        const lastScroll = document.documentElement.scrollHeight - innerHeight;
        if (!motion?.setLogicalScroll?.(lastScroll)) window.scrollTo(0, lastScroll);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await new Promise((resolve) => setTimeout(resolve, 900));
        const cta = document.querySelector("[data-advertising-grid-cta]").getBoundingClientRect();
        const footer = document.querySelector("footer.site-footer").getBoundingClientRect();
        const heading = document.querySelector("[data-advertising-grid-cta] h2").getBoundingClientRect();
        const link = document.querySelector("[data-advertising-grid-cta] .detail-cta__copy a").getBoundingClientRect();
        return { ctaTop: cta.top, headingTop: heading.top, headingBottom: heading.bottom,
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
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "networkidle" });
  await ready(page);
  const beforeFilterAssignments = await flowAssignments(page);
  const beforeFilter = await page.locator("[data-advertising-cta-skeleton]").getAttribute("data-advertising-cta-signature");
  await scrollLogicalTargetIntoView(page, '[data-advertising-filter="kiosk-posm"]');
  await page.locator('[data-advertising-filter="kiosk-posm"]').click();
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
  await page.setViewportSize({ width: 1000, height: 1000 });
  await page.waitForFunction((signature) =>
    document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaSignature !== signature,
  beforeResizeSignature);
  await ready(page);
  const narrowAssignments = await flowAssignments(page);
  const filteredBySlot = new Map(filteredAssignments.map((assignment) => [assignment.slot, assignment]));
  assert.equal((await snapshot(page)).columns, 3, "resize fixture did not cross from N4 to N3");
  for (const assignment of narrowAssignments) {
    const previous = filteredBySlot.get(assignment.slot);
    if (previous) assert.deepEqual(stableFlowAssignment(assignment), stableFlowAssignment(previous),
      `N4 to N3 resize changed the stable Flow assignment for ${assignment.slot}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForFunction(({ signature, count }) => {
    const skeleton = document.querySelector("[data-advertising-cta-skeleton]");
    return skeleton?.dataset.advertisingCtaSignature === signature
      && document.querySelectorAll("[data-advertising-cta-frame]").length === count;
  }, { signature: beforeResizeSignature, count: filteredAssignments.length });
  await ready(page);
  assert.deepEqual(await flowAssignments(page), filteredAssignments,
    "resize round trip changed assignments within one stable Flow batch");

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
    "detail close through native Back reused the previous Flow batch");

  await page.evaluate(() => history.forward());
  await page.waitForFunction(() => document.body.classList.contains("is-advertising-photo"));
  await page.evaluate(() => history.back());
  await page.waitForFunction(() => !document.body.classList.contains("is-advertising-photo"));
  await ready(page);
  const secondHistoryAssignments = await flowAssignments(page);
  assertFlowBatch(secondHistoryAssignments, "native Back/Forward lifecycle");
  assert.notEqual(assignmentSignature(secondHistoryAssignments), assignmentSignature(historyAssignments),
    "native Forward/Back reused the previous Flow batch");

  const stableAssignments = secondHistoryAssignments;
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
    const canvas = document.querySelector("[data-advertising-cta-frame].is-looping canvas");
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
    document.querySelector("[data-advertising-cta-frame].is-looping canvas")?.__ttSkeletonPaints || 0);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() =>
    document.querySelector("[data-advertising-cta-frame].is-looping canvas")?.__ttSkeletonPaints || 0), paintsWhileLost,
    "skeleton kept issuing WebGL draws while its context was lost");
  await page.evaluate(() => window.__ttSkeletonLossExtension.restoreContext());
  await page.waitForFunction((before) =>
    (document.querySelector("[data-advertising-cta-frame].is-looping canvas")?.__ttSkeletonPaints || 0) > before,
  paintsWhileLost);

  const desktopPerformanceDiagnostic = await measureAnimationPerformance(page, 5000);
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
      staticFallbacks: visible.filter((frame) =>
        getComputedStyle(frame.querySelector("canvas")).backgroundImage !== "none").length,
      contexts: document.querySelectorAll('[data-advertising-flow-backend="webgl"]').length,
    };
  });
  assert(mobileVisible.count > 2 && mobileVisible.running >= 1 && mobileVisible.running <= 2,
    `A54 simultaneous viewport did not preserve the two-context budget (${JSON.stringify(mobileVisible)})`);
  assert.equal(mobileVisible.staticFallbacks, mobileVisible.count,
    "A54 viewport contains a blank preset fallback");
  const mobilePerformanceState = await mobilePerformancePage.evaluate(() => ({
    contexts: document.querySelectorAll("[data-advertising-cta-frame].is-looping canvas").length,
    devicePixelRatio,
  }));
  const performanceProbe = await measureAnimationPerformance(mobilePerformancePage, 5000);
  await mobilePerformancePage.evaluate(() => {
    window.__ttMobileRenderers = [...document.querySelectorAll('[data-advertising-flow-backend="webgl"]')];
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
      sameCanvases: window.__ttMobileRenderers.every((canvas) =>
        canvas.isConnected && canvas.dataset.advertisingFlowBackend === "webgl"),
      contexts: document.querySelectorAll('[data-advertising-flow-backend="webgl"]').length,
      transitions: window.__ttMobileTransitionCount,
    };
    delete window.__ttMobileRenderers;
    delete window.__ttMobileTransitionCount;
    delete window.__ttMobileTransitionListener;
    return result;
  });
  assert(retainedMobile.sameCanvases && retainedMobile.contexts <= 2 && retainedMobile.transitions === 0,
    `A54 focus/reduced toggle remounted or replayed Flow (${JSON.stringify(retainedMobile)})`);
  const mobileHandoffStart = await mobilePerformancePage.evaluate(() => {
    const frames = [...document.querySelectorAll("[data-advertising-cta-frame]")];
    const spacer = document.createElement("div");
    spacer.id = "tt-skeleton-handoff-probe";
    spacer.style.height = "900px";
    document.body.append(spacer);
    window.__ttHandoffTransitions = [];
    window.__ttHandoffOpacity = [];
    const incomingCanvas = frames[2].querySelector("canvas");
    window.__ttHandoffObserver = new MutationObserver(() => {
      if (incomingCanvas.dataset.advertisingFlowBackend !== "webgl") return;
      window.__ttHandoffObserver.disconnect();
      let samples = 0;
      const sample = () => {
        window.__ttHandoffOpacity.push(Number(getComputedStyle(incomingCanvas).opacity));
        if (++samples < 25) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    window.__ttHandoffObserver.observe(incomingCanvas, {
      attributes: true, attributeFilter: ["data-advertising-flow-backend"],
    });
    window.__ttHandoffListener = (event) => {
      if (event.propertyName === "opacity" && event.target.matches?.(".advertising-grid__cta-flow")) {
        window.__ttHandoffTransitions.push(event.target.closest("[data-advertising-cta-frame]")?.dataset.advertisingCtaSlot);
      }
    };
    document.addEventListener("transitionrun", window.__ttHandoffListener);
    return {
      scroll: window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY,
      first: frames[0].dataset.advertisingCtaSlot,
      incoming: frames[2].dataset.advertisingCtaSlot,
      laterIncoming: frames[4].dataset.advertisingCtaSlot,
    };
  });
  await mobilePerformancePage.evaluate(({ scroll }) => {
    const target = scroll + 500;
    if (!window.TruongThinhMotion?.setLogicalScroll?.(target)) window.scrollTo(0, target);
  }, mobileHandoffStart);
  await mobilePerformancePage.waitForFunction(({ incoming }) =>
    document.querySelector(`[data-advertising-cta-slot="${incoming}"] canvas`)?.dataset.advertisingFlowBackend === "webgl",
  mobileHandoffStart);
  await mobilePerformancePage.waitForFunction(({ incoming }) =>
    window.__ttHandoffTransitions.includes(incoming), mobileHandoffStart);
  await mobilePerformancePage.waitForFunction(() => window.__ttHandoffOpacity.length === 25);
  const handoffDown = await mobilePerformancePage.evaluate(({ incoming }) => ({
    contexts: document.querySelectorAll('[data-advertising-flow-backend="webgl"]').length,
    firstBackend: document.querySelector("[data-advertising-cta-frame]")?.querySelector("canvas")?.dataset.advertisingFlowBackend,
    incomingFade: window.__ttHandoffTransitions.includes(incoming),
    lowestOpacity: Math.min(...window.__ttHandoffOpacity),
    finalOpacity: window.__ttHandoffOpacity.at(-1),
    staticBackground: getComputedStyle(document.querySelector(`[data-advertising-cta-slot="${incoming}"] .advertising-grid__cta-surface`)).backgroundImage,
  }), mobileHandoffStart);
  assert(handoffDown.contexts <= 2 && handoffDown.firstBackend === "none"
    && handoffDown.incomingFade && handoffDown.staticBackground !== "none"
    && handoffDown.lowestOpacity < 0.9 && handoffDown.finalOpacity > 0.95,
  `A54 incoming renderer handoff jumped or exceeded budget (${JSON.stringify(handoffDown)})`);
  await mobilePerformancePage.evaluate(({ scroll }) => {
    const target = scroll + 650;
    if (!window.TruongThinhMotion?.setLogicalScroll?.(target)) window.scrollTo(0, target);
  }, mobileHandoffStart);
  await mobilePerformancePage.waitForFunction(({ laterIncoming }) => {
    const canvas = document.querySelector(`[data-advertising-cta-slot="${laterIncoming}"] canvas`);
    const opacity = canvas && Number(getComputedStyle(canvas).opacity);
    return canvas?.dataset.advertisingFlowBackend === "webgl" && opacity > 0.1 && opacity < 0.9;
  }, mobileHandoffStart);
  await mobilePerformancePage.emulateMedia({ reducedMotion: "reduce" });
  await mobilePerformancePage.waitForFunction(() =>
    !document.querySelector("[data-advertising-cta-frame].is-looping"));
  const reducedDuringHandoff = await mobilePerformancePage.evaluate(({ laterIncoming }) => {
    const canvas = document.querySelector(`[data-advertising-cta-slot="${laterIncoming}"] canvas`);
    return {
      opacity: Number(getComputedStyle(canvas).opacity),
      opacityAnimations: canvas.getAnimations().filter((animation) => animation.transitionProperty === "opacity").length,
      contexts: document.querySelectorAll('[data-advertising-flow-backend="webgl"]').length,
    };
  }, mobileHandoffStart);
  assert(reducedDuringHandoff.opacity >= 0.99 && reducedDuringHandoff.opacityAnimations === 0
    && reducedDuringHandoff.contexts <= 2,
  `A54 Reduce Motion left an incoming canvas fade running (${JSON.stringify(reducedDuringHandoff)})`);
  await mobilePerformancePage.emulateMedia({ reducedMotion: "no-preference" });
  await mobilePerformancePage.waitForFunction(() => document.querySelector("[data-advertising-cta-frame].is-looping"));
  await mobilePerformancePage.evaluate(({ scroll }) => {
    if (!window.TruongThinhMotion?.setLogicalScroll?.(scroll)) window.scrollTo(0, scroll);
  }, mobileHandoffStart);
  const handoffUp = await mobilePerformancePage.evaluate(({ incoming }) => {
    const result = {
      contexts: document.querySelectorAll('[data-advertising-flow-backend="webgl"]').length,
      incomingStillLive: document.querySelector(`[data-advertising-cta-slot="${incoming}"] canvas`)?.dataset.advertisingFlowBackend === "webgl",
      incomingFades: window.__ttHandoffTransitions.filter((slot) => slot === incoming).length,
      transitionSlots: [...window.__ttHandoffTransitions],
    };
    document.removeEventListener("transitionrun", window.__ttHandoffListener);
    window.__ttHandoffObserver.disconnect();
    document.querySelector("#tt-skeleton-handoff-probe")?.remove();
    delete window.__ttHandoffTransitions;
    delete window.__ttHandoffOpacity;
    delete window.__ttHandoffObserver;
    delete window.__ttHandoffListener;
    return result;
  }, mobileHandoffStart);
  assert(handoffUp.contexts <= 2 && handoffUp.incomingStillLive && handoffUp.incomingFades === 1,
    `A54 reverse scroll evicted a visible renderer (${JSON.stringify(handoffUp)})`);
  await mobilePerformancePage.emulateMedia({ reducedMotion: "reduce" });
  await mobilePerformancePage.reload({ waitUntil: "networkidle" });
  await mobilePerformancePage.waitForFunction(() =>
    document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaReady === "true");
  const freshReduced = await mobilePerformancePage.evaluate(() => ({
    contexts: document.querySelectorAll('[data-advertising-flow-backend="webgl"]').length,
    staticFrames: [...document.querySelectorAll("[data-advertising-cta-frame]")].every((frame) =>
      getComputedStyle(frame.querySelector("canvas")).backgroundImage !== "none"
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
    contexts: document.querySelectorAll('[data-advertising-flow-backend="webgl"]').length,
    blanks: [...document.querySelectorAll("[data-advertising-cta-frame]")].filter((frame) => {
      const rect = frame.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight
        && getComputedStyle(frame.querySelector("canvas")).backgroundImage === "none";
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
  assert(firstExit.opacity <= 0.01, "offscreen skeleton did not reset to hidden opacity");
  assert(Math.abs(firstExit.transformY) <= 0.1, "offscreen skeleton changed frame geometry");
  const pausedDigest = await page.locator("[data-advertising-flow-preset]").first().evaluate((canvas) => {
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels.reduce((hash, value, index) => index % 4 ? hash : Math.imul(hash ^ value, 16777619), 2166136261) >>> 0;
  });
  await page.evaluate(() => new Promise((resolve) => {
    const started = performance.now();
    const tick = () => performance.now() - started >= 450 ? resolve() : requestAnimationFrame(tick);
    tick();
  }));
  const pausedAfter = await page.locator("[data-advertising-flow-preset]").first().evaluate((canvas) => {
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels.reduce((hash, value, index) => index % 4 ? hash : Math.imul(hash ^ value, 16777619), 2166136261) >>> 0;
  });
  assert.equal(pausedAfter, pausedDigest, "offscreen skeleton Flow kept rendering");

  const entryContract = await skeletonEntryContract(page);
  assert.deepEqual(entryContract.frame.opacity && {
    duration: entryContract.frame.opacity.duration,
    easing: entryContract.frame.opacity.easing,
  }, entryContract.media.opacity && {
    duration: entryContract.media.opacity.duration,
    easing: entryContract.media.opacity.easing,
  }, "skeleton opacity entry must reuse the grid media timing contract");
  assert.equal(entryContract.frame.opacity?.duration, "0.6s", "skeleton opacity entry must last 600ms");
  assert.equal(entryContract.frame.opacity?.easing, "ease-out", "skeleton opacity entry must use ease-out");
  assert.deepEqual(entryContract.frame.transitionProperties, ["opacity"],
    "skeleton entry must not transition transform, scale, or another property");
  assert(entryContract.frame.transitionDelays.every((delay) => delay === "0s"),
    "skeleton entry must not stagger frame timing");
  assert(entryContract.stagger.every((delay) => delay === "0s"),
    "skeleton opacity entry must not stagger frame timing");
  assert(Math.abs(matrix(entryContract.frame.transform).y) <= 0.1,
    "skeleton frame must retain its geometry before entry");
  assert.equal(entryContract.frame.maskImage, "none", "frame retained a local fade mask");
  assert.equal(entryContract.skeleton.maskImage, "none",
    "skeleton container retained a local boundary mask instead of the shared glass surface");
  assert.equal(entryContract.skeleton.pointerEvents, "none",
    "skeleton container must not expose a hover target");
  assert.equal(entryContract.surface.animationName, "none", "skeleton surface retained float or scale animation");

  await replaySkeletonEntry(page, "first viewport re-entry");
  assert.deepEqual(await flowAssignments(page), stableAssignments,
    "scroll changed Flow assignments within one page load");
  const secondExit = await exitSkeletonViewport(page);
  assert(secondExit.opacity <= 0.01, "second full exit did not re-arm hidden opacity");
  assert(Math.abs(secondExit.transformY) <= 0.1, "second full exit changed frame geometry");
  await replaySkeletonEntry(page, "second viewport re-entry");
  assert.deepEqual(await flowAssignments(page), stableAssignments,
    "second viewport replay changed Flow assignments within one page load");

  await page.locator("[data-advertising-cta-frame]").first().evaluate((frame) => {
    window.__ttSkeletonVisibilityReplayCount = 0;
    window.__ttSkeletonVisibilityListener = (event) => {
      if (event.propertyName === "opacity") window.__ttSkeletonVisibilityReplayCount += 1;
    };
    frame.addEventListener("transitionrun", window.__ttSkeletonVisibilityListener);
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
    frame.removeEventListener("transitionrun", window.__ttSkeletonVisibilityListener);
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
  assert.equal(visibilityReplay.count, 0, "page visibility resume replayed skeleton entry opacity");
  assert(visibilityReplay.entryReady && Math.abs(visibilityReplay.opacity - visibilityReplay.targetOpacity) <= 0.01,
    "page visibility resume lost the settled skeleton reveal state");
  assert.deepEqual(await flowAssignments(page), stableAssignments,
    "page visibility resume changed Flow assignments or ratio bands");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => !document.querySelector("[data-advertising-cta-frame].is-looping")
    && document.querySelector(".advertising-grid__cta-surface")?.getAnimations().length === 0
    && document.querySelector("[data-advertising-cta-frame]")?.dataset.advertisingFlowState === "paused");
  const reducedState = await page.locator("[data-advertising-cta-frame]").first().evaluate((frame) => {
    const style = getComputedStyle(frame);
    const canvas = frame.querySelector("canvas");
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
  assert.equal(await page.locator("[data-advertising-cta-frame]").first().evaluate((frame) =>
    frame.querySelector("canvas")?.__ttSkeletonPaints || 0), reducedState.paints,
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
    { locale: "vi", mobile: false, query: "?category=kiosk-posm" },
    { locale: "vi", mobile: true, query: "?category=kiosk-posm&photo=kiosk-posm-01" },
    { locale: "en", mobile: false, query: "?category=kiosk-posm&photo=kiosk-posm-01&tag=product-kiosk-posm-product-06" },
  ]) {
    await assertCanonicalAdvertisingNav(page, navCase);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/en/advertising-products/`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
  await page.locator("[data-menu-open]").click();
  await page.locator('#site-menu .menu-group__title[href="/en/advertising-products/"]').click();
  assert.equal(new URL(page.url()).pathname, "/en/advertising-products/", "parent nav changed canonical locale route");
  assert.equal(new URL(page.url()).search, "", "parent nav added query state");
  assert.equal(await page.locator('[data-advertising-filter="all"]').getAttribute("aria-current"), "true", "parent nav changed All filter");
  assert.deepEqual(errors, [], "continuation emitted browser errors");
  await page.close();
} finally {
  await browser.close();
}
