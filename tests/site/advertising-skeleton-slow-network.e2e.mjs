// Card waiting for its image on a slow network (progressive-loading R9): the image blurs itself in place of the Flow skeleton; card images are held 8s like Slow 3G.
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

try {
  // On page load: the first card image is blurred from the first frame, does not animate in, and its node is not replaced.
  for (const [label, device] of [["phone", phone], ["desktop", { viewport: { width: 1440, height: 900 } }]]) {
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
    assert.ok(related.some(({ blur }) => blur), `phone: related cards blur while loading ${JSON.stringify(related)}`);
    assert.deepEqual(related.filter(({ blur, marked, revealing }) => blur !== marked && !revealing), [],
      "phone: related cards breathe exactly while blurred");
    await page.waitForFunction(() => {
      const loaded = [...document.querySelectorAll("[data-masonry-related-card]")]
        .map((card) => card.querySelector("img")).filter((image) => image?.naturalWidth > 0);
      return loaded.length && loaded.every((image) => !image.style.filter.startsWith("blur("));
    }, null, { timeout: DELAY + 6000 }).catch(async () => assert.fail("phone: loaded related cards still blurred "
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
