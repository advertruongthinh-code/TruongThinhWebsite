// Card waiting for its image on a slow network (progressive-loading R9): on PC the image stays hidden under a Flow frame in its 4 colors, drawn on the grid's
// shared canvas, and shows through Glass once loaded; on the phone a flat layer cycles through the image's 4 dominant colors and the image fades in once loaded.
// Card images are held 8s like Slow 3G.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/advertising-skeleton-slow-network.e2e.mjs
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
// Card in the viewport: an image not yet loaded without a Flow frame (PC), the color layer (phone) or a dominant color is an empty cell.
const cardStates = (page, selector = "[data-project-grid] [data-masonry-card]") => page.evaluate((selector) =>
  [...document.querySelectorAll(selector)].filter((card) => {
    const { top, bottom } = card.getBoundingClientRect();
    return bottom > 0 && top < innerHeight;
  }).map((card) => {
    const image = card.querySelector("img");
    return {
      id: card.dataset.masonryCard || card.dataset.masonryRelatedCard,
      loaded: Boolean(image?.complete && image.naturalWidth),
      blur: Boolean(image?.style.filter),
      // The runtime marks a card waiting under Flow (just-viewed label, detail.css); it is cleared when the reveal starts.
      marked: card.hasAttribute("data-masonry-media-loading"),
      flow: card.querySelector("[data-masonry-loading-skeleton]")?.dataset.masonryFlowState ?? null,
      revealing: Boolean(image?.getAnimations().length),
      color: Boolean(card.querySelector(".card-media")?.style.backgroundColor),
      // Phone: the card waits on the color layer (progressive-loading R9); the image stays hidden, unfiltered, until it is decoded.
      wait: card.dataset.mediaWait === "colors",
      hidden: Boolean(image) && Number(getComputedStyle(image).opacity) === 0 && !image.style.filter,
      glass: Boolean(card.querySelector(".glass-surface")),
      skeleton: Boolean(card.querySelector("[data-masonry-loading-skeleton], canvas")),
    };
  }), selector);
// Number of temporary cards (loading-glass R10) intersecting the viewport.
const ghostsInView = (page) => page.evaluate(() => [...document.querySelectorAll(".masonry-ghost")].filter((ghost) => {
  const { top, bottom } = ghost.getBoundingClientRect();
  return bottom > 0 && top < innerHeight;
}).length);
// PC: every card still waiting carries a Flow frame over its hidden image, never blur; the frame sits on the dominant color (owner 2026-10-31).
const assertNoBlank = (label, states) => {
  assert.ok(states.length, `${label}: cards in view`);
  assert.deepEqual(states.filter(({ loaded, skeleton, revealing }) => !loaded && !skeleton && !revealing), [], `${label}: loading cards without a Flow frame`);
  assert.deepEqual(states.filter(({ blur }) => blur), [], `${label}: cards still blur their image`);
  assert.deepEqual(states.filter(({ skeleton, marked, revealing }) => skeleton && !revealing && !marked), [], `${label}: waiting cards are marked`);
  assert.deepEqual(states.filter(({ loaded, color }) => !loaded && !color), [], `${label}: loading cards without dominant color`);
  // Kính shows only while a card reveals, never on a waiting card.
  assert.deepEqual(states.filter(({ glass, revealing }) => glass && !revealing), [], `${label}: a waiting card carries Kính`);
};
// One shared Flow canvas for all waiting cards of the main grid, the last child of the grid (advertising-skeleton R5).
const gridCanvases = (page) => page.evaluate(() => {
  const grid = document.querySelector("[data-project-grid]");
  return { count: grid.querySelectorAll(":scope > canvas.masonry-grid__cta-shared-flow").length,
    last: grid.lastElementChild?.matches("canvas.masonry-grid__cta-shared-flow") ?? false,
    cardCanvases: grid.querySelectorAll("[data-masonry-card] canvas[data-masonry-flow-backend='webgl']").length };
});

// Phone: every card still waiting has the color layer and a hidden image, never blur, breathing, Kính or Flow.
const assertPhoneWait = (label, states) => {
  assert.ok(states.length, `${label}: cards in view`);
  assert.deepEqual(states.filter(({ loaded, wait, hidden }) => !loaded && !(wait && hidden)), [], `${label}: loading cards without the color layer`);
  assert.deepEqual(states.filter(({ blur, marked }) => blur || marked), [], `${label}: cards still blur or breathe`);
  assert.deepEqual(states.filter(({ glass }) => glass), [], `${label}: cards still carry Kính`);
  assert.deepEqual(states.filter(({ skeleton }) => skeleton), [], `${label}: cards still carry skeleton Flow`);
};

try {
  // Phone page load: cards wait on the color layer from the first frame.
  {
    const { context, page } = await open(phone);
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-project-grid] [data-masonry-card][data-media-wait='colors']"));
    assertPhoneWait("phone load", await cardStates(page));
    // First frames: every card in view whose image has not loaded carries the layer on every sampled frame (no blank frame), keeps one image node and never animates
    // its image before the image is decoded.
    const trace = await page.evaluate(async () => {
      const ids = new WeakMap();
      const samples = [];
      for (let frame = 0; frame < 60; frame += 1) {
        await new Promise(requestAnimationFrame);
        for (const card of document.querySelectorAll("[data-project-grid] [data-masonry-card]")) {
          const { top, bottom } = card.getBoundingClientRect();
          const image = card.querySelector("img");
          if (bottom <= 0 || top >= innerHeight || !image || image.complete) continue;
          if (!ids.has(image)) ids.set(image, ids.size + 1);
          samples.push({ card: card.dataset.masonryCard, wait: card.dataset.mediaWait, image: ids.get(image), animations: image.getAnimations().length });
        }
      }
      return samples;
    });
    assert.ok(trace.length, "phone: first frames sampled loading cards");
    assert.deepEqual(trace.filter(({ wait, animations }) => wait !== "colors" || animations), [], "phone: loading cards wear the layer on every frame and do not animate the image early");
    const nodes = new Map();
    for (const { card, image } of trace) nodes.set(card, new Set([...(nodes.get(card) || []), image]));
    assert.deepEqual([...nodes].filter(([, set]) => set.size > 1).map(([card]) => card), [], "phone: each card keeps one image node");
    // The layer cycles through the 4 colors: the top layer's fade runs 8s and the colors are the file's own (--wait-1..4 set).
    const layer = await page.evaluate(() => {
      const card = document.querySelector("[data-project-grid] [data-masonry-card][data-media-wait='colors']");
      const style = getComputedStyle(card);
      const timing = card.getAnimations({ subtree: true }).map((animation) => animation.effect.getComputedTiming().duration);
      return { vars: [1, 2, 3, 4].every((index) => style.getPropertyValue(`--wait-${index}`).trim()), timing };
    });
    assert.ok(layer.vars, "phone: the card carries four wait colors");
    assert.ok(layer.timing.length === 3 && layer.timing.every((duration) => duration === 8000), `phone: two layers (three animations: base, fade, shift) cycle in 8s ${JSON.stringify(layer)}`);
    await context.close();
  }

  // Phone: when the image arrives it fades in over 450ms, then the layer is removed and the image stays opaque; nothing is left waiting.
  {
    const { context, page } = await open(phone);
    await page.addInitScript(() => {
      window.__fades = new Map();
      const tick = () => {
        for (const image of document.querySelectorAll("[data-project-grid] [data-masonry-card] img")) {
          const fade = image.getAnimations().find((animation) => animation.effect.getTiming().duration === 450);
          if (!fade) continue;
          const card = image.closest("[data-masonry-card]");
          const keyframes = fade.effect.getKeyframes();
          window.__fades.set(card.dataset.masonryCard, {
            easing: fade.effect.getTiming().easing, from: keyframes[0].opacity, to: keyframes.at(-1).opacity,
            // The layer stays under the fading image and the image carries no filter.
            layer: card.dataset.mediaWait, filter: image.style.filter });
        }
        if (performance.now() < 14000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => performance.now() > 14000, null, { timeout: 30_000 });
    const fades = await page.evaluate(() => [...window.__fades.values()]);
    assert.ok(fades.length, "phone: some card image fades in over 450ms when it arrives");
    assert.deepEqual(fades.filter(({ easing, from, to, layer, filter }) => easing !== "cubic-bezier(0.16, 1, 0.3, 1)" || from !== "0" || to !== "1"
      || layer !== "colors" || filter), [], "phone: the fade is opacity 0 to 1 on the expo-out curve, over the color layer, unfiltered");
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-masonry-card]")]
      .filter((card) => card.querySelector("img")?.naturalWidth > 0)
      .filter((card) => card.hasAttribute("data-media-wait") || getComputedStyle(card.querySelector("img")).opacity !== "1"
        || card.style.getPropertyValue("--wait-1") || card.querySelector("img").style.filter)
      .map((card) => card.dataset.masonryCard)), [], "phone: loaded cards drop the color layer and show the image");
    await context.close();
  }

  // Phone with reduced motion: the layer stays still on color 1, the image is not hidden by a second layer.
  {
    const { context, page } = await open({ ...phone, reducedMotion: "reduce" });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-project-grid] [data-masonry-card][data-media-wait='colors']"));
    const still = await page.evaluate(() => {
      const card = document.querySelector("[data-project-grid] [data-masonry-card][data-media-wait='colors']");
      const base = getComputedStyle(card, "::before");
      // Resolve --wait-1 through a probe element so the comparison is between computed colors.
      const probe = document.body.appendChild(document.createElement("canvas"));
      probe.style.transition = "none";
      probe.style.backgroundColor = getComputedStyle(card).getPropertyValue("--wait-1").trim();
      const expected = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { animation: base.animationName, top: getComputedStyle(card, "::after").display, color: base.backgroundColor, expected };
    });
    assert.deepEqual([still.animation, still.top], ["none", "none"], "phone reduced motion: the layers do not animate");
    assert.ok(still.expected !== "rgba(0, 0, 0, 0)" && still.color === still.expected, `phone reduced motion: still color layer on color 1 ${JSON.stringify(still)}`);
    await context.close();
  }

  // Phone fast fling: temp cards use the color layer too, in the same phase as the card that replaces them.
  {
    const { context, page } = await open(phone);
    // Temp cards live a few frames: record each one as it enters the DOM.
    await page.addInitScript(() => {
      window.__ghosts = [];
      new MutationObserver((records) => records.forEach(({ addedNodes }) => addedNodes.forEach((node) => {
        if (node.classList?.contains("masonry-ghost")) {
          window.__ghosts.push({ wait: node.dataset.mediaWait, phase: node.style.getPropertyValue("--wait-phase"),
            animation: getComputedStyle(node).animationName });
        }
      }))).observe(document, { childList: true, subtree: true });
    });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-project-grid] [data-masonry-card]"));
    await page.waitForTimeout(500);
    for (const y of [9000, 2000, 12000]) {
      await page.evaluate((top) => scrollTo(0, top), y);
      await page.waitForTimeout(150);
    }
    const ghosts = await page.evaluate(() => window.__ghosts);
    assert.ok(ghosts.length, "phone: a fast fling shows temp cards");
    assert.deepEqual(ghosts.filter(({ wait, phase, animation }) => wait !== "colors" || !phase.endsWith("ms") || animation !== "none"), [],
      "phone: temp cards carry the color layer, no breathing");
    await context.close();
  }

  // On page load: the first cards wait under a running Flow frame on the grid's one shared canvas, the image stays hidden and does not animate before it loads,
  // and its node is not replaced.
  for (const [label, device] of [["desktop", { viewport: { width: 1440, height: 900 } }]]) {
    const { context, page } = await open(device);
    await page.addInitScript(() => {
      const ids = new WeakMap();
      let next = 0;
      window.__waitTrace = [];
      // Whether the grid's shared canvas (WebGL context, compiled shader) already existed when the first card frame arrived:
      // creating it then dropped frames on the owner's PC (2026-11-12).
      new MutationObserver((records, observer) => {
        const frame = records.flatMap(({ addedNodes }) => [...addedNodes])
          .find((node) => node.matches?.("[data-masonry-loading-skeleton]") && node.closest("[data-project-grid]"));
        if (!frame) return;
        window.__canvasBeforeFirstFrame = Boolean(frame.closest("[data-project-grid]").querySelector(":scope > canvas.masonry-grid__cta-shared-flow"));
        observer.disconnect();
      }).observe(document, { childList: true, subtree: true });
      const tick = () => {
        for (const frame of document.querySelectorAll("[data-project-grid] [data-masonry-card] [data-masonry-loading-skeleton]")) {
          const image = frame.closest("[data-masonry-card]").querySelector("img");
          if (!image || image.complete) continue;
          if (!ids.has(image)) ids.set(image, ++next);
          window.__waitTrace.push([image.closest("[data-masonry-card]").dataset.masonryCard, ids.get(image), image.getAnimations().length,
            getComputedStyle(image).opacity, image.style.filter]);
        }
        if (performance.now() < 3000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => performance.now() > 3000);
    const cards = new Map();
    for (const [card, image, animations, opacity, filter] of await page.evaluate(() => window.__waitTrace)) {
      if (!cards.has(card)) cards.set(card, []);
      cards.get(card).push({ image, animations, opacity, filter });
    }
    assert.ok(cards.size, `${label}: first cards wait under Flow while images load`);
    for (const [card, samples] of cards) {
      assert.equal(new Set(samples.map(({ image }) => image)).size, 1, `${label}: ${card} keeps one image node`);
      assert.ok(samples.every(({ animations, opacity, filter }) => !animations && opacity === "0" && !filter), `${label}: ${card} image hidden, unfiltered, not animated while waiting`);
    }
    const states = await cardStates(page);
    assertNoBlank(`${label} load`, states);
    assert.ok(states.some(({ flow }) => flow === "running"), `${label}: waiting cards run Flow ${JSON.stringify(states)}`);
    assert.deepEqual(await gridCanvases(page), { count: 1, last: true, cardCanvases: 0 }, `${label}: one shared canvas in the grid, none per card`);
    assert.equal(await page.evaluate(() => window.__canvasBeforeFirstFrame), true, `${label}: the grid's Flow canvas is created before the first card waits`);
    await context.close();
  }

  // PC load: a card frame's still image (one CPU render each) is drawn only at idle. Drawing them in the deferred CTA task doubled it
  // (19ms vs 10ms on main) and dropped frames in the first reveal burst on the owner's PC (3b.2 run 4).
  {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      window.__stills = { idle: 0, busy: 0 };
      let idle = false;
      const request = window.requestIdleCallback;
      window.requestIdleCallback = (callback, options) => request((deadline) => {
        idle = true;
        try { return callback(deadline); } finally { idle = false; }
      }, options);
      const { append } = Element.prototype;
      Element.prototype.append = function (...nodes) {
        if (nodes.some((node) => node.classList?.contains("masonry-grid__cta-flow")) && this.closest(".card-media")) window.__stills[idle ? "idle" : "busy"]++;
        return append.apply(this, nodes);
      };
    });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => performance.now() > 3000);
    const stills = await page.evaluate(() => window.__stills);
    assert.ok(stills.idle > 0 && stills.busy === 0, `desktop load: card stills drawn only at idle ${JSON.stringify(stills)}`);
    assert.ok((await cardStates(page)).some(({ flow }) => flow === "running"), "desktop load: waiting cards run Flow");
    await context.close();
  }

  // PC with KHR_parallel_shader_compile (stubbed: headless SwiftShader lacks it): the grid's shared canvas never reads LINK_STATUS in the frame it linked,
  // it polls COMPLETION_STATUS_KHR first. Reading it at once blocked the main thread 27ms in the first reveal burst on the owner's PC (3b.2 run 2).
  {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      const proto = WebGLRenderingContext.prototype;
      const { getExtension, getProgramParameter, linkProgram, drawArrays } = proto;
      const COMPLETION_STATUS_KHR = 0x91b1;
      const shared = (gl) => gl.canvas.classList?.contains("masonry-grid__cta-shared-flow");
      const linked = new WeakMap();
      let frame = 0;
      const count = () => { frame++; requestAnimationFrame(count); };
      requestAnimationFrame(count);
      window.__link = { syncReads: 0, polls: 0, draws: 0 };
      proto.getExtension = function (name) {
        return name === "KHR_parallel_shader_compile" ? { COMPLETION_STATUS_KHR, MAX_SHADER_COMPILER_THREADS_KHR: 0x91b0, maxShaderCompilerThreadsKHR() {} }
          : getExtension.call(this, name);
      };
      proto.linkProgram = function (program) { linked.set(program, frame); return linkProgram.call(this, program); };
      proto.getProgramParameter = function (program, pname) {
        if (pname === COMPLETION_STATUS_KHR) { window.__link.polls++; return frame - linked.get(program) >= 2; }
        if (pname === this.LINK_STATUS && shared(this) && linked.get(program) === frame) window.__link.syncReads++;
        return getProgramParameter.call(this, program, pname);
      };
      proto.drawArrays = function (...args) { if (shared(this)) window.__link.draws++; return drawArrays.apply(this, args); };
    });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => performance.now() > 3000);
    const link = await page.evaluate(() => window.__link);
    assert.equal(link.syncReads, 0, `desktop parallel compile: no LINK_STATUS read in the linking frame ${JSON.stringify(link)}`);
    assert.ok(link.polls > 0 && link.draws > 1, `desktop parallel compile: polls completion, then Flow draws ${JSON.stringify(link)}`);
    assert.ok((await cardStates(page)).some(({ flow }) => flow === "running"), "desktop parallel compile: waiting cards run Flow");
    await context.close();
  }

  // PC with cache off, dragging the scrollbar quickly up and down (owner 2026-10-27): cards flying past do not become empty cells.
  {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
    await page.mouse.move(1437, 200);
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector(".c-scrollbar")).opacity) === 1);
    const thumb = await page.locator(".c-scrollbar_thumb").boundingBox();
    await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
    await page.mouse.down();
    for (const y of [700, 200, 850, 400]) await page.mouse.move(1437, y, { steps: 6 });
    // During a fast drag the viewport may hold only temporary cards (loading-glass R10): a covering temporary card also counts as not empty.
    const dragging = await cardStates(page);
    if (dragging.length) assertNoBlank("desktop scrollbar drag", dragging);
    else assert.ok(await ghostsInView(page), "desktop scrollbar drag: ghost cards cover the viewport");
    await page.mouse.up();
    await page.waitForFunction(() => !document.documentElement.classList.contains("has-scroll-scrolling"), null, { timeout: 5000 });
    // After scrolling stops, temporary cards in the viewport are still upgraded to real cards gradually within the frame budget (loading-glass R10); a newly built card receives
    // its Flow frame in the next frame's IntersectionObserver.
    await page.waitForFunction(() => ![...document.querySelectorAll(".masonry-ghost")].some((ghost) => {
      const { top, bottom } = ghost.getBoundingClientRect();
      return bottom > 0 && top < innerHeight;
    }), null, { timeout: 5000 });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assertNoBlank("desktop scrollbar settle", await cardStates(page));
    await context.close();
  }

  // Tall PC: every card waiting in view runs Flow (no per-layer cap; the old context budget was 12) on the grid's one canvas.
  {
    const { context, page } = await open({ viewport: { width: 1920, height: 3000 } });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
    for (let y = 400; y <= 2400; y += 400) {
      await page.evaluate((value) => window.TruongThinhMotion.setLogicalScroll(value), y);
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(1500);
    const states = await cardStates(page);
    const running = states.filter(({ flow }) => flow === "running").length;
    assert.ok(running > 12 && running === states.filter(({ loaded, revealing }) => !loaded && !revealing).length,
      `desktop tall: every waiting card runs Flow, more than 12 ${running}/${states.length}`);
    assertNoBlank("desktop tall", states);
    assert.deepEqual(await gridCanvases(page), { count: 1, last: true, cardCanvases: 0 }, "desktop tall: one shared canvas in the grid");
    await context.close();
  }

  // Reduced motion: the card waits on the still Flow frame of its preset, not running, and nothing is blurred.
  {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-project-grid] [data-masonry-card] [data-masonry-loading-skeleton]"));
    await page.waitForTimeout(500);
    const states = await cardStates(page);
    assertNoBlank("reduced motion", states);
    assert.deepEqual(states.filter(({ flow }) => flow === "running"), [], "reduced motion: Flow does not run");
    await context.close();
  }

  // Many cards finish at once (images released together): at most CARD_GLASS_REVEAL_MAX (4) card Glass reveals run at the same time, the rest crossfade;
  // afterwards no card keeps its Flow frame, mark or Kính and no loaded image is stuck below opacity 1.
  {
    const { context, page, slow } = await open({ viewport: { width: 1920, height: 3000 } });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
    for (let y = 400; y <= 1200; y += 400) {
      await page.evaluate((value) => window.TruongThinhMotion.setLogicalScroll(value), y);
      await page.waitForTimeout(600);
    }
    await page.waitForFunction(() => document.querySelectorAll("[data-project-grid] [data-masonry-card] [data-masonry-flow-state='running']").length >= 8);
    await page.evaluate(() => {
      window.__glassMax = 0;
      const tick = () => {
        window.__glassMax = Math.max(window.__glassMax, document.querySelectorAll("[data-project-grid] [data-masonry-card] [data-glass-reveal]").length);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    slow.on = false;
    await page.waitForFunction(() => [...document.querySelectorAll("[data-project-grid] [data-masonry-card]")].filter((card) => {
      const { top, bottom } = card.getBoundingClientRect();
      return bottom > 0 && top < innerHeight;
    }).every((card) => !card.querySelector("[data-masonry-loading-skeleton]")), null, { timeout: DELAY + 15_000 });
    const glassMax = await page.evaluate(() => window.__glassMax);
    assert.ok(glassMax >= 1 && glassMax <= 4, `burst: card Glass reveals capped at 4 ${glassMax}`);
    const states = await cardStates(page);
    assert.deepEqual(states.filter(({ loaded, skeleton, marked, glass }) => loaded && (skeleton || marked || glass)), [], "burst: revealed cards drop Flow, mark and Kính");
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-masonry-card] img")]
      .filter((image) => image.naturalWidth && getComputedStyle(image).opacity !== "1").length), 0, "burst: no loaded image stuck below opacity 1");
    await context.close();
  }

  // Soft navigation fires no pagehide and replaces the grid: each mount's shared Flow layers are disposed with it, so live WebGL contexts do not grow
  // with every visit (review #875: 1, 3, 5, 7 before the fix).
  {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      window.__glContexts = [];
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        const gl = getContext.call(this, type, ...rest);
        if (gl && /webgl/.test(type) && !window.__glContexts.includes(gl)) window.__glContexts.push(gl);
        return gl;
      };
    });
    const live = () => page.evaluate(() => window.__glContexts.filter((gl) => !gl.isContextLost()).length);
    const settled = (path) => page.waitForFunction((value) => location.pathname === value && window.barba && !window.barba.transitions.isRunning, path);
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-project-grid] [data-masonry-card] [data-masonry-flow-state='running']"));
    const counts = [await live()];
    for (let round = 0; round < 2; round += 1) {
      await page.evaluate(() => window.barba.go("/vi/projects/"));
      await settled("/vi/projects/");
      await page.evaluate(() => window.barba.go("/vi/advertising-products/"));
      await settled("/vi/advertising-products/");
      await page.waitForFunction(() => document.querySelector("[data-project-grid] [data-masonry-card] [data-masonry-flow-state='running']"));
      counts.push(await live());
    }
    assert.ok(counts.every((count) => count <= 3) && counts.at(-1) <= counts[0], `soft navigation leaks WebGL contexts ${counts}`);
    await context.close();
  }

  // Phone: opening detail from a scrolled masonry jumps back to y=0 without scrollend; related card images wait on the color layer,
  // and still clear once loaded without the viewer scrolling further.
  {
    const { context, page, slow } = await open(phone);
    slow.on = false;
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "networkidle" });
    await page.evaluate(() => scrollTo(0, 1000));
    await page.waitForTimeout(1500);
    slow.on = true;
    const tap = await page.evaluate(() => {
      const link = [...document.querySelectorAll("[data-masonry-card] > a")].find((node) => {
        const { top, bottom } = node.getBoundingClientRect();
        return top > 80 && bottom < innerHeight - 20;
      });
      const { x, y, width, height } = link.getBoundingClientRect();
      return [x + width / 2, y + height / 2];
    });
    await page.touchscreen.tap(...tap);
    await page.waitForFunction(() => document.querySelectorAll("[data-masonry-related-card]").length);
    await page.waitForTimeout(2000);
    assert.equal(await page.evaluate(() => scrollY), 0, "phone: detail opens at the top");
    await page.evaluate(() => scrollTo(0, document.querySelector("[data-masonry-related-card]").getBoundingClientRect().top - 100));
    await page.waitForTimeout(500);
    const related = await cardStates(page, "[data-masonry-related-card]");
    assert.ok(related.some(({ wait }) => wait), `phone: related cards wait on the color layer ${JSON.stringify(related)}`);
    assertPhoneWait("phone related", related);
    await page.waitForFunction(() => {
      const loaded = [...document.querySelectorAll("[data-masonry-related-card]")]
        .map((card) => card.querySelector("img")).filter((image) => image?.naturalWidth > 0);
      return loaded.length && loaded.every((image) => !image.closest("[data-media-wait]"));
    }, null, { timeout: DELAY + 6000 }).catch(async () => assert.fail("phone: loaded related cards still wait "
      + JSON.stringify(await cardStates(page, "[data-masonry-related-card]"))));
    await context.close();
  }
  // PC Slow 4G with cache off, opening detail from masonry (owner 2026-11-01): related cards reserve their place first, the CTA batch follows,
  // like masonry; no frame of the batch is shown in the detail canvas without a related card.
  {
    const { context, page, slow } = await open({ viewport: { width: 1440, height: 900 } });
    slow.on = false;
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "networkidle" });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions",
      { offline: false, latency: 562.5, downloadThroughput: 180_000, uploadThroughput: 84_375 });
    await page.evaluate(() => {
      window.__batchBeforeRelated = 0;
      const tick = () => {
        const canvas = document.querySelector("[data-detail-canvas]");
        const batch = canvas?.querySelector("[data-masonry-cta-frame]");
        if (batch && !batch.closest("[hidden]") && !canvas.querySelector("[data-masonry-related-card]")) window.__batchBeforeRelated++;
        if (!canvas?.querySelector("[data-masonry-related-card]")) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.locator("[data-project-grid] [data-masonry-card] > a").first().click();
    await page.waitForFunction(() => document.querySelector("[data-detail-canvas] [data-masonry-related-card]"),
      null, { timeout: 15000 });
    assert.equal(await page.evaluate(() => window.__batchBeforeRelated), 0, "desktop detail: batch shows before related cards");
    await context.close();
  }
  console.log("PASS advertising skeleton slow network");
} finally {
  await browser.close();
}
