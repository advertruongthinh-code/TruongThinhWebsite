// Card waiting for its image on a slow network (progressive-loading R9): on PC the image blurs itself in place of the Flow skeleton; on the phone a flat layer
// cycles through the image's 4 dominant colors and the image fades in once loaded. Card images are held 8s like Slow 3G.
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
// Card in the viewport: an image not yet loaded without blur or without a dominant color is an empty cell; the card has no skeleton frame or Flow canvas.
const cardStates = (page, selector = "[data-project-grid] [data-masonry-card]") => page.evaluate((selector) =>
  [...document.querySelectorAll(selector)].filter((card) => {
    const { top, bottom } = card.getBoundingClientRect();
    return bottom > 0 && top < innerHeight;
  }).map((card) => {
    const image = card.querySelector("img");
    return {
      id: card.dataset.masonryCard || card.dataset.masonryRelatedCard,
      loaded: Boolean(image?.complete && image.naturalWidth),
      blur: Boolean(image?.style.filter.startsWith("blur(")),
      // A blurred card waiting for its image breathes: the runtime sets data-masonry-media-loading on the card (waiting-for-image spec S2).
      marked: card.hasAttribute("data-masonry-media-loading"),
      // The blur clears (WAAPI animate) with inline blur still present but breathing stopped.
      revealing: Boolean(image?.getAnimations().some((animation) => animation.animationName === undefined)),
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
const assertNoBlank = (label, states) => {
  assert.ok(states.length, `${label}: cards in view`);
  assert.deepEqual(states.filter(({ loaded, blur }) => !loaded && !blur), [], `${label}: loading cards without blur`);
  assert.deepEqual(states.filter(({ blur, marked, revealing }) => blur !== marked && !revealing), [],
    `${label}: every blurred card is marked to breathe, and only those (a card revealing has stopped breathing)`);
  // An image that has received no bytes has nothing for the blur to draw: the frame is filled with the image's dominant color (owner 2026-10-31).
  assert.deepEqual(states.filter(({ loaded, color }) => !loaded && !color), [], `${label}: loading cards without dominant color`);
  // Backdrop-filter Kính on cards drops FPS when dragging the scrollbar (owner 2026-10-31).
  assert.deepEqual(states.filter(({ glass }) => glass), [], `${label}: cards still carry Kính`);
  assert.deepEqual(states.filter(({ skeleton }) => skeleton), [], `${label}: cards still carry skeleton Flow`);
};

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

  // On page load: the first card image is blurred from the first frame, does not animate in, and its node is not replaced.
  for (const [label, device] of [["desktop", { viewport: { width: 1440, height: 900 } }]]) {
    const { context, page } = await open(device);
    await page.addInitScript(() => {
      const ids = new WeakMap();
      let next = 0;
      window.__blurTrace = [];
      const tick = () => {
        for (const image of document.querySelectorAll("[data-project-grid] [data-masonry-card] img[style*='blur(']")) {
          if (!ids.has(image)) ids.set(image, ++next);
          window.__blurTrace.push([image.closest("[data-masonry-card]").dataset.masonryCard, ids.get(image),
            // Breathing (CSS animation media-breathe) is not an animate-in; count only other (WAAPI) animations.
            image.getAnimations().filter((animation) => animation.animationName !== "media-breathe").length]);
        }
        if (performance.now() < 3000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => performance.now() > 3000);
    const cards = new Map();
    for (const [card, image, animations] of await page.evaluate(() => window.__blurTrace)) {
      if (!cards.has(card)) cards.set(card, []);
      cards.get(card).push({ image, animations });
    }
    assert.ok(cards.size, `${label}: first cards blur while images load`);
    for (const [card, samples] of cards) {
      assert.equal(new Set(samples.map(({ image }) => image)).size, 1, `${label}: ${card} keeps one image node`);
      assert.ok(samples.every(({ animations }) => !animations), `${label}: ${card} blur starts at full, no fade in`);
    }
    assertNoBlank(`${label} load`, await cardStates(page));
    await context.close();
  }

  // PC with cache off, dragging the scrollbar quickly up and down (owner 2026-10-27): cards flying past do not become empty cells and no Flow is built.
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
    // its blur in the next frame's IntersectionObserver.
    await page.waitForFunction(() => ![...document.querySelectorAll(".masonry-ghost")].some((ghost) => {
      const { top, bottom } = ghost.getBoundingClientRect();
      return bottom > 0 && top < innerHeight;
    }), null, { timeout: 5000 });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assertNoBlank("desktop scrollbar settle", await cardStates(page));
    await context.close();
  }

  // Tall PC: more than 12 cards waiting for images are all blurred.
  {
    const { context, page } = await open({ viewport: { width: 1920, height: 1400 } });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
    for (let y = 400; y <= 2400; y += 400) {
      await page.evaluate((value) => window.TruongThinhMotion.setLogicalScroll(value), y);
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(1500);
    const states = await cardStates(page);
    assert.ok(states.filter(({ blur }) => blur).length > 12, `desktop tall: more than 12 cards blur ${states.length}`);
    assertNoBlank("desktop tall", states);
    await context.close();
  }

  // Reduced motion: the image is still blurred while waiting but does not breathe (waiting-for-image spec S2).
  {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-project-grid] img[style*='blur(']"));
    // The global reduced-motion reset cuts animations to a single 0.01ms iteration: breathing stops at opacity 1 and does not repeat.
    await page.waitForTimeout(500);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] img[style*='blur(']")]
      .map((image) => getComputedStyle(image))
      .filter(({ opacity, animationIterationCount }) => opacity !== "1" || animationIterationCount === "infinite")
      .length), 0, "reduced motion: blurred cards do not breathe");
    await context.close();
  }

  // Breathing stops exactly when the blur clears: opacity goes from the breathing value to 1, with no frame jumping more than 0.1 from the previous one.
  {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      window.__opacityTrace = new Map();
      const tick = () => {
        for (const image of document.querySelectorAll("[data-project-grid] [data-masonry-card] img")) {
          const trace = window.__opacityTrace.get(image) || [];
          const rect = image.closest("[data-masonry-card]").getBoundingClientRect();
          trace.push([Number(getComputedStyle(image).opacity), Boolean(image.style.filter), rect.bottom > 0 && rect.top < innerHeight]);
          window.__opacityTrace.set(image, trace);
        }
        if (performance.now() < 14000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => performance.now() > 14000, null, { timeout: 30_000 });
    const jumps = await page.evaluate(() => [...window.__opacityTrace.values()]
      // Only images that were blurred then sharpened during the measurement (having both blur frames and no-blur frames).
      .filter((trace) => trace.some(([, blurred]) => blurred) && trace.some(([, blurred], i) => !blurred && trace.slice(0, i).some(([, was]) => was)))
      // Drop frames before the image starts to blur (opacity 0 waiting for lazyload).
      .map((trace) => trace.slice(trace.findIndex(([, blurred]) => blurred)))
      // When a card leaves the viewport its skeleton is dropped immediately (nobody sees the jump), so only count frame pairs where the card is still in the viewport.
      .map((trace) => trace.slice(1).reduce((max, [opacity, , visible], i) => (visible && trace[i][2] ? Math.max(max, Math.abs(opacity - trace[i][0])) : max), 0)));
    assert.ok(jumps.length, "opacity trace: some card went from blurred to sharp");
    assert.ok(jumps.every((jump) => jump <= 0.1), `opacity trace: no frame jumps over 0.1 when breathing stops ${JSON.stringify(jumps)}`);
    await context.close();
  }

  // Phone: opening detail from a scrolled masonry jumps back to y=0 without scrollend; related card images blur while waiting,
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
