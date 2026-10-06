// P8/P9 evidence: reserved frames, loading ring or skeleton and reveal Kính, request count and geometry while images load.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/image-loading-frame.e2e.mjs
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
const browser = await chromium.launch({ headless: true });

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

// Native lazy never loads carousel slides parked off to the side, so only visible columns must settle.
// Static content images only; Advertising grid/viewer and client logos have their own loaders.
const snapshot = page => page.evaluate(() => { const seen = new Map(); return [...document.querySelectorAll("img")]
  .filter(img => img.getAttribute("src")?.startsWith("/assets/content/") && !img.closest(".client-logo-marquee, .client-logo-image, [data-project-grid], [data-advertising-photo-view]") && img.getClientRects().length)
  .map(img => {
    const frame = img.parentElement.tagName === "PICTURE" ? img.parentElement.parentElement : img.parentElement;
    let opacity = 1;
    for (let node = img; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    const src = img.getAttribute("src");
    seen.set(src, (seen.get(src) || 0) + 1);
    return {
      key: src + "#" + seen.get(src), raw: !img.hasAttribute("data-src"), src, w: img.offsetWidth, h: img.offsetHeight, alt: img.getAttribute("alt"),
      loading: img.getAttribute("loading"), priority: img.getAttribute("fetchpriority"),
      ready: img.complete && img.naturalWidth > 0, columnVisible: img.getBoundingClientRect().right > 0 && img.getBoundingClientRect().left < innerWidth, ring: getComputedStyle(frame).backgroundImage.includes("svg"), opacity,
    };
  }); });
// Node-side timers so the walk also works with JavaScript disabled.
const scrollThrough = async page => {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = (page.viewportSize()?.height || 800) / 2;
  for (let y = 0; y <= height; y += step) {
    await page.evaluate(top => scrollTo(0, top), y);
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(500);
};
// firstScreen limits the wait to images in the current viewport (no scroll walk).
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
// Attributes as shipped in the HTML, parsed natively so entities decode the same way as the DOM.
const rawAttributes = page => page.evaluate(async () => [...new DOMParser()
  .parseFromString(await (await fetch(location.href)).text(), "text/html").images]
  .map(img => JSON.stringify([img.getAttribute("src"), img.getAttribute("alt"), img.getAttribute("loading"), img.getAttribute("fetchpriority")])))
  .then(list => new Set(list));

try {
  // P8: frames reserve their final box before the request finishes, then keep it.
  for (const route of routes) {
    for (const viewport of viewports) {
      const { context, page, counts } = await open({ viewport });
      await page.goto(base + route, { waitUntil: "domcontentloaded" });
      const before = await snapshot(page);
      const raw = await rawAttributes(page);
      await scrollThrough(page);
      await settle(page);
      // load fires a task after complete flips; give a busy main thread time to drop rings.
      await page.waitForFunction(() => [...document.images].every(img => !img.complete || !img.naturalWidth
        || !getComputedStyle(img.closest(":not(img, picture)")).backgroundImage.includes("svg")), null, { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(400);
      const after = new Map((await snapshot(page)).map(item => [item.key, item]));
      const label = `${route} ${viewport.width}px`;
      for (const item of before) {
        assert.ok(item.w > 0 && item.h > 0, `${label}: ${item.src} reserves a box before load`);
        if (!item.ready) assert.ok(item.ring, `${label}: ${item.src} shows the ring while loading`);
        assert.notEqual(item.alt, null, `${label}: ${item.src} has an alt attribute`);
        // Images whose src is set by script (hero slides use data-src) have no raw src to compare.
        if (item.raw) assert.ok(raw.has(attributes(item)), `${label}: ${item.src} keeps HTML alt, request priority and lazy loading ${attributes(item)}`);
        const done = after.get(item.key);
        if (!done) continue;
        if (done.columnVisible) assert.ok(done.ready, `${label}: ${item.src} finishes loading`);
        if (done.ready) assert.ok(!done.ring, `${label}: ${item.src} drops the ring once loaded`);
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

  // P8: no-script still shows every image.
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

  // P8: Barba navigation and Back keep the same frame contract.
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

  // P9: Advertising cards, geometry and viewer while images load.
  for (const viewport of viewports) {
    // Longer delay so the entry layout settles while card images are still in flight.
    const { context, page, counts } = await open({ viewport, delay: 4000 });
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    // Reveal Kính (loading-glass-and-page-entry R2, R4; glass-surface R6): record each one as it mounts.
    await page.evaluate(() => {
      window.__ttRevealGlass = [];
      new MutationObserver((records) => records.forEach(({ addedNodes }) => addedNodes.forEach((node) => {
        if (!node.matches?.(".glass-surface[data-glass-reveal]")) return;
        window.__ttRevealGlass.push({
          host: node.closest("[data-advertising-photo-view]") ? "primary" : "card",
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
    // The reveal ends 0.6 s after the last image loads, then the skeleton node is removed.
    await page.waitForFunction(() => !document.querySelector("[data-project-grid] [data-advertising-loading-skeleton]"), null, { timeout: 5000 })
      .catch(() => assert.fail(`${viewport.width}px: loaded cards drop the skeleton`));
    const cardGlass = await revealGlass("card");
    assert.ok(cardGlass.length && cardGlass.every(({ steps, animated, end }) => steps === 5 && animated.join() === "opacity" && end <= 601),
      `${viewport.width}px: loading cards reveal through five Kính steps in 0.6 s, opacity only ${JSON.stringify(cardGlass.slice(0, 3))}`);
    assert.equal(await page.evaluate(() => document.querySelectorAll("[data-project-grid] .glass-surface[data-glass-reveal]").length), 0,
      `${viewport.width}px: the reveal Kính leaves the cards`);
    // A loaded card that left the viewport shows again at once: no Kính, no skeleton (R3).
    const loadedIds = await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-advertising-card]")]
      .filter((card) => card.querySelector("img")?.naturalWidth > 0).map((card) => card.dataset.advertisingCard));
    const revealsBefore = cardGlass.length;
    const scrollTo = (y) => page.evaluate((top) => window.TruongThinhMotion.setLogicalScroll(top), y);
    await scrollTo(4000);
    await page.waitForTimeout(600);
    await scrollTo(0);
    // Remounted cards may hold a skeleton until their cached copy arrives; then it swaps in without Kính.
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
    // Cards that finish loading right now still reveal from their skeleton; let those settle first.
    await page.waitForTimeout(700);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-advertising-loading-skeleton]")]
      .filter((frame) => frame.parentElement.querySelector("img")?.naturalWidth > 0)
      .map((frame) => [frame.closest("[data-advertising-card]").dataset.advertisingCard, frame.parentElement.querySelector("img").className,
        Boolean(frame.parentElement.querySelector("[data-glass-reveal]")), Math.round(frame.getBoundingClientRect().top)])), [],
    `${viewport.width}px: a loaded card re-enters without a skeleton`);

    // Viewer: skeleton and aria-busy follow the current photo, including a fast hero swap.
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
    assert.ok(primaryGlass.length && primaryGlass.every(({ steps, animated }) => steps === 5 && animated.join() === "opacity"),
      `${viewport.width}px: the primary reveals through five Kính steps animating opacity only ${JSON.stringify(primaryGlass)}`);
    await page.goBack();
    await page.goBack();
    await page.waitForFunction(() => window.TruongThinhAdvertising.getBrowseState().photo === null);
    assert.equal(await page.evaluate(() => document.querySelectorAll("[data-advertising-photo-view] [data-advertising-loading-skeleton]").length), 0, `${viewport.width}px: closing the viewer clears the skeleton`);
    assert.deepEqual((await geometry()).filters, loaded.filters, `${viewport.width}px: history return keeps filters`);
    results.push({ case: "p9-advertising", width: viewport.width, cardCount, cardRequests, first: first.photo, swapped: relatedId });
    await context.close();
  }
  console.log("PASS image loading frame: " + results.length + " cases");
} finally {
  await fs.writeFile(output + "/results.json", JSON.stringify(results, null, 2));
  await browser.close();
}
