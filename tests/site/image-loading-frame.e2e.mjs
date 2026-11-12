// Evidence P8/P9: frame reserved, light sweep (media-delivery R6), card image self-blur or skeleton and Kính reveal, request counts and geometry while images load.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/image-loading-frame.e2e.mjs
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { BASE_URL, VIEWPORTS, launchBrowser, openPage } from "./harness.mjs";
const output = ".tmp/image-loading-frame";
const DELAY = 1500;
const routes = ["/vi/", "/en/", "/vi/residential/", "/en/residential/", "/vi/commercial/", "/en/commercial/", "/vi/about/", "/en/about/"];
const viewports = [VIEWPORTS.phone, VIEWPORTS.desktop];
const isContent = url => new URL(url).pathname.startsWith("/assets/content/") && !url.includes("/client-logos/");
const results = [];
await fs.mkdir(output, { recursive: true });
const browser = await launchBrowser();

const open = async ({ delay = DELAY, javaScriptEnabled = true, viewport = viewports[0] } = {}) => {
  const { context, page } = await openPage(browser, viewport, { javaScriptEnabled });
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

// Native lazy never loads carousel slides parked to the side, so only the visible columns must settle.
// Static content images only; the Advertising grid/viewer and client logos have their own loaders.
const snapshot = page => page.evaluate(() => { const seen = new Map(); return [...document.querySelectorAll("img")]
  .filter(img => img.getAttribute("src")?.startsWith("/assets/content/") && !img.closest(".client-logo-marquee, .client-logo-image, [data-project-grid], [data-detail-view]") && img.getClientRects().length)
  .map(img => {
    const frame = img.parentElement.tagName === "PICTURE" ? img.parentElement.parentElement : img.parentElement;
    let opacity = 1;
    for (let node = img; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    const src = img.getAttribute("src");
    seen.set(src, (seen.get(src) || 0) + 1);
    return {
      key: src + "#" + seen.get(src), raw: !img.closest(".hero-slides:has(+ script)"), src, w: img.offsetWidth, h: img.offsetHeight, alt: img.getAttribute("alt"),
      loading: img.getAttribute("loading"), priority: img.getAttribute("fetchpriority"),
      ready: img.complete && img.naturalWidth > 0, columnVisible: img.getBoundingClientRect().right > 0 && img.getBoundingClientRect().left < innerWidth, sweep: /^media-(sweep|breathe)$/.test(getComputedStyle(frame, "::before").animationName), settled: frame.classList.contains("is-media-settled"), imageOpacity: Number(getComputedStyle(img).opacity), opacity,
    };
  }); });
// Node-side timer so the walk also runs with JavaScript off.
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
      .filter(img => img.getClientRects().length && !img.closest("[data-project-grid], [data-detail-view]")
        && img.getBoundingClientRect().right > 0 && img.getBoundingClientRect().left < innerWidth
        && (!firstScreen || (img.getBoundingClientRect().bottom > 0 && img.getBoundingClientRect().top < innerHeight)))
      .every(img => img.complete), firstScreen)) return;
  }
  throw new Error("visible content images did not settle");
};
const attributes = ({ src, alt, loading, priority }) => JSON.stringify([src, alt, loading, priority]);
// Attributes as shipped in the HTML, parsed natively so entity decoding matches the DOM.
const rawAttributes = page => page.evaluate(async () => [...new DOMParser()
  .parseFromString(await (await fetch(location.href)).text(), "text/html").images]
  .map(img => JSON.stringify([img.getAttribute("src"), img.getAttribute("alt"), img.getAttribute("loading"), img.getAttribute("fetchpriority")])))
  .then(list => new Set(list));

try {
  // P8: the frame reserves its final box before the request finishes, then keeps it.
  for (const route of routes) {
    for (const viewport of viewports) {
      const { context, page, counts } = await open({ viewport });
      await page.goto(BASE_URL + route, { waitUntil: "domcontentloaded" });
      const before = await snapshot(page);
      const raw = await rawAttributes(page);
      await scrollThrough(page);
      await settle(page);
      // The frame settles after load and the async decode(); wait extra for the 0.45s fade to finish.
      await page.waitForFunction(() => [...document.images].every(img => !img.complete || !img.naturalWidth
        || img.closest(".is-media-settled") || !img.closest("[class]")), null, { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
      const after = new Map((await snapshot(page)).map(item => [item.key, item]));
      const label = `${route} ${viewport.width}px`;
      for (const item of before) {
        assert.ok(item.w > 0 && item.h > 0, `${label}: ${item.src} reserves a box before load`);
        if (!item.ready) assert.ok(item.sweep && item.imageOpacity === 0, `${label}: ${item.src} shows the sweep and hides the image while loading`);
        assert.notEqual(item.alt, null, `${label}: ${item.src} has an alt attribute`);
        // The home, Residential and Commercial hero slides get src from a script after .hero-slides (page-home R3, detail-pages R5) so there is no raw src to compare.
        if (item.raw) assert.ok(raw.has(attributes(item)), `${label}: ${item.src} keeps HTML alt, request priority and lazy loading ${attributes(item)}`);
        const done = after.get(item.key);
        if (!done) continue;
        if (done.columnVisible) assert.ok(done.ready, `${label}: ${item.src} finishes loading`);
        // Opacity after settle is also decided by detail.js's reveal, so only check that the frame settled and the sweep is gone.
        if (done.ready) assert.ok(done.settled && !done.sweep, `${label}: ${item.src} settles and drops the sweep once decoded`);
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

  // R6: capture every 100ms while an image is half loaded, no unfinished image may show.
  {
    const { context, page } = await open({ viewport: viewports[1], delay: 3000 });
    await page.goto(BASE_URL + "/vi/residential/", { waitUntil: "domcontentloaded" });
    let samples = 0;
    for (let tick = 0; tick < 40; tick++, await page.waitForTimeout(100)) {
      const leaked = await page.evaluate(() => [...document.querySelectorAll('img[src^="/assets/content/"]')]
        .filter(img => !img.complete && img.getClientRects().length && Number(getComputedStyle(img).opacity) > 0)
        .map(img => img.getAttribute("src")));
      assert.deepEqual(leaked, [], `residential 1440px: no partially loaded image is visible at ${tick * 100}ms`);
      samples++;
    }
    results.push({ case: "r6-no-partial-image", samples });
    await context.close();
  }

  // R6: reduced motion has no sweep, the frame brightens and dims gently.
  {
    const { context, page } = await open({ viewport: viewports[1], delay: 3000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(BASE_URL + "/vi/about/", { waitUntil: "domcontentloaded" });
    const frames = await page.evaluate(() => [...document.querySelectorAll(".media-gate .media-frame:not(.is-media-settled)")]
      .map(frame => { const style = getComputedStyle(frame, "::before"); return `${style.animationName} ${style.animationDuration} ${style.animationIterationCount}`; }));
    // The global reduced-motion reset must not cut the 2s breathing rhythm down to 0.01ms.
    assert.ok(frames.length && frames.every(value => value === "media-breathe 2s infinite"), `about reduced motion: frames breathe instead of sweeping ${JSON.stringify(frames)}`);
    results.push({ case: "r6-reduced-motion", frames: frames.length });
    await context.close();
  }

  // R6: the sweep stops mid-frame at 1440×600, brightness is smooth, no sharp edge or kink.
  {
    // Take the real gradient from the waiting frame then redraw it on a still probe.
    const { context, page } = await open({ viewport: VIEWPORTS.desktop, delay: 3000 });
    await page.goto(BASE_URL + "/vi/about/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      const frame = document.querySelector(".media-gate .media-frame:not(.is-media-settled)");
      const sweep = getComputedStyle(frame, "::before").backgroundImage;
      document.body.insertAdjacentHTML("beforeend", `<style>#sweep-probe{position:fixed;inset:0 auto auto 0;z-index:2147483647;width:1440px;height:600px;overflow:clip;background:#2b2c2b}#sweep-probe::before{position:absolute;inset:0 auto 0 0;width:400%;content:"";background-image:${sweep};transform:translateX(-37.5%)}</style><div id="sweep-probe"></div>`);
    });
    const { default: sharp } = await import("sharp");
    const { data, info } = await sharp(await page.locator("#sweep-probe").screenshot()).raw().toBuffer({ resolveWithObject: true });
    const row = Array.from({ length: info.width }, (_, x) => data[(300 * info.width + x) * info.channels]);
    const peak = Math.max(...row), center = row.indexOf(peak);
    // Gradient dither differs between headless shell, Chrome and Edge (1-2 levels of brightness noise, 0.0417 slope per level at 24px steps);
    // a 48px sliding average removes that noise while keeping a real kink (a 0.3 level/px slope still yields 0.15).
    const smooth = row.map((_, x) => { const part = row.slice(Math.max(0, x - 24), x + 24); return part.reduce((a, b) => a + b, 0) / part.length; });
    const slopes = [];
    for (let x = 24; x < smooth.length; x += 24) slopes.push((smooth[x] - smooth[x - 24]) / 24);
    const maxStep = Math.max(...row.slice(1).map((value, x) => Math.abs(value - row[x])));
    const maxSlopeJump = Math.max(...slopes.slice(1).map((slope, i) => Math.abs(slope - slopes[i])));
    // Chromium dithers gradients so neighboring pixels can be off by 1 level in reverse; check rise and fall with that tolerance.
    const monotonic = row.every((value, x) => x === 0 || (x <= center ? value >= row[x - 1] - 1 : value <= row[x - 1] + 1));
    assert.ok(peak >= 84 && peak <= 87 && Math.min(...row) === 43, `sweep peak ${peak} within 84-87 on #2b2c2b`);
    assert.ok(monotonic && maxStep <= 1, `sweep rises then falls without hard edges (max step ${maxStep})`);
    assert.ok(maxSlopeJump <= 0.1, `sweep has no brightness kink (max slope jump ${maxSlopeJump})`);
    results.push({ case: "r6-sweep-smooth", peak, maxStep, maxSlopeJump });
    await context.close();
  }

  // R2: a variant sharp enough for the part of the image shown after cover crop, or the original; no duplicate request.
  for (const [route, selector, viewport] of [
    ["/vi/residential/", ".detail-gallery__item img", { ...viewports[1], deviceScaleFactor: 1 }],
    ["/vi/residential/", ".detail-gallery__item img", { ...viewports[1], deviceScaleFactor: 2 }],
    ["/vi/", ".project-card__media img", { ...viewports[0], deviceScaleFactor: 3 }],
  ]) {
    const { context, page, counts } = await open({ viewport });
    await page.goto(BASE_URL + route, { waitUntil: "load" });
    await scrollThrough(page);
    await settle(page);
    const label = `${route} ${viewport.width}px DPR ${viewport.deviceScaleFactor}`;
    const images = await page.evaluate(selector => [...document.querySelectorAll(selector)].filter(img => img.currentSrc).map(img => {
      const { width, height } = img.getBoundingClientRect();
      const shown = Math.max(width, height * img.getAttribute("width") / img.getAttribute("height")) * devicePixelRatio;
      const variant = Number(img.currentSrc.match(/-(\d+)\.\w+$/)?.[1]);
      // Phone loads WebP only up to size 960 (owner 2026-11-07, media-delivery): sharp enough means reaching 0.9x or already at the 960 ceiling.
      const cap = matchMedia("(hover: none) and (pointer: coarse)").matches ? 960 : Infinity;
      return { src: img.getAttribute("src"), shown: Math.round(shown), loaded: variant || "original", sharp: !variant || variant >= Math.min(0.9 * shown, cap) };
    }), selector);
    assert.ok(images.length, `${label}: ${selector} images loaded`);
    assert.deepEqual(images.filter(image => !image.sharp), [], `${label}: each image loads a variant of at least 0.9x its cropped visible width`);
    assert.deepEqual([...counts].filter(([, count]) => count > 1), [], `${label}: no duplicate image requests`);
    results.push({ case: "r2-crop-sizes", route, width: viewport.width, dpr: viewport.deviceScaleFactor, images: images.length });
    await context.close();
  }

  // P8: no-script still shows every image.
  for (const route of routes.filter(route => route.startsWith("/vi/"))) {
    const { context, page } = await open({ delay: false, javaScriptEnabled: false });
    await page.goto(BASE_URL + route, { waitUntil: "load" });
    await scrollThrough(page);
    await settle(page);
    const images = await snapshot(page);
    for (const item of images.filter(item => item.columnVisible)) assert.ok(item.ready && item.opacity > 0, `${route} no-script: ${item.src} is visible`);
    results.push({ case: "p8-no-script", route, images: images.length });
    await context.close();
  }

  // R8: a static image that fails to load settles the frame at once, draws the error mark, hides the image, and the frame keeps its size as in a normal load.
  {
    // Hero, CTA and portal background images have their own case below (dark background, white text).
    const overlay = ".hero-slide img, .about-hero__media img, :is(.service-portal, .detail-cta, .legacy-closer) > img, :is(.service-portal, .detail-cta, .legacy-closer) > picture > img";
    const measure = async block => {
      const { context, page } = await open({ delay: 0 });
      if (block) await page.route("**/assets/content/**", route => isContent(route.request().url()) ? route.abort() : route.continue());
      await page.goto(BASE_URL + "/vi/about/", { waitUntil: "load" });
      await scrollThrough(page);
      await page.waitForTimeout(500);
      const images = await page.evaluate(overlay => [...document.querySelectorAll("img")]
        .filter(img => img.getAttribute("src")?.startsWith("/assets/content/") && !img.closest(".client-logo-marquee, .client-logo-image, [data-project-grid], [data-detail-view]") && img.getClientRects().length && !img.matches(overlay))
        .map(img => {
          const frame = img.parentElement.tagName === "PICTURE" ? img.parentElement.parentElement : img.parentElement;
          const box = img.getBoundingClientRect();
          return { key: img.getAttribute("src") + "@" + Math.round(box.top + scrollY), w: box.width, h: box.height, broken: img.complete && img.naturalWidth === 0, settled: frame.classList.contains("is-media-settled"), errored: frame.classList.contains("is-media-error"), visibility: getComputedStyle(img).visibility, line: getComputedStyle(frame, "::before").content, surface: getComputedStyle(frame, "::before").backgroundColor, hasAlt: img.hasAttribute("alt") };
        }), overlay);
      await context.close();
      return images;
    };
    const normal = new Map((await measure(false)).map(item => [item.key, item]));
    const failed = await measure(true);
    assert.ok(failed.length > 0, "about: has static images to test load errors");
    assert.deepEqual(failed.filter(item => !item.broken), [], "about: every blocked image is in the error state");
    assert.deepEqual(failed.filter(item => !item.settled || !item.errored || item.visibility !== "hidden"), [], "about: a failed image settles at once, the frame has is-media-error, the image is hidden");
    assert.deepEqual(failed.filter(item => item.line !== '"Không tải được"' || item.surface !== "rgb(228, 228, 226)"), [], "about: the failed image frame draws one line of text on a flat gray background");
    assert.deepEqual(failed.filter(item => !item.hasAlt), [], "about: a failed image still has the alt attribute");
    assert.deepEqual(failed.filter(item => { const ref = normal.get(item.key); return ref && (Math.abs(ref.w - item.w) > 1 || Math.abs(ref.h - item.h) > 1); }).map(item => item.key), [], "about: the failed image frame keeps its size as when the image loads");
    results.push({ case: "r8-image-error", images: failed.length });
  }

  // R8: hero, CTA and portal load failures draw the error mark on a dark background (white text stays readable), EN changes the text.
  for (const [route, line] of [["/vi/", '"Không tải được"'], ["/en/residential/", '"Couldn\'t load"']]) {
    const { context, page } = await open({ delay: 0 });
    await page.route("**/assets/content/**", route => isContent(route.request().url()) ? route.abort() : route.continue());
    await page.goto(BASE_URL + route, { waitUntil: "load" });
    await scrollThrough(page);
    await page.waitForTimeout(500);
    const frames = await page.evaluate(() => [...document.querySelectorAll(".hero-slide.is-active, .about-hero__media, .service-portal, .detail-cta, .legacy-closer")]
      .map(frame => ({ name: frame.className.split(" ")[0], errored: frame.classList.contains("is-media-error"), line: getComputedStyle(frame, "::before").content, surface: getComputedStyle(frame, "::before").backgroundColor })));
    assert.ok(frames.length > 0, `${route}: has overlay frames to test load errors`);
    assert.deepEqual(frames.filter(item => !item.errored || item.line !== line || item.surface !== "rgb(43, 44, 43)"), [], `${route}: the overlay frame draws the error mark on a dark background`);
    results.push({ case: "r8-overlay-error", route, frames: frames.length });
    await context.close();
  }

  // P8: Barba navigation and Back keep the same frame contract.
  {
    const { context, page } = await open();
    await page.goto(BASE_URL + "/vi/", { waitUntil: "load" });
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
  const primaryReveals = [];
  for (const viewport of viewports) {
    // Phone: cards and the primary wait on the dominant-color layer instead of blur, Flow and Kính (progressive-loading R9).
    const phoneView = viewport.width <= 750;
    // Longer delay so the entry layout settles while the card image is still in flight.
    const { context, page, counts } = await open({ viewport, delay: 4000 });
    await page.goto(BASE_URL + "/vi/advertising-products/", { waitUntil: "domcontentloaded" });
    // Reveal Kính (none left on cards and the primary, owner 2026-11-12), the 20px frosted-glass copies the PC reveal makes
    // (loading-glass-and-page-entry R2, R4) and card image blur (progressive-loading R9): record each one.
    await page.evaluate(() => {
      window.__ttRevealGlass = [];
      window.__ttFrost = [];
      const copy = window.createImageBitmap;
      window.createImageBitmap = function (source, ...rest) {
        if (rest.at(-1)?.resizeWidth === 20) window.__ttFrost.push(source.closest("[data-masonry-card], [data-masonry-related-card]") ? "card" : "primary");
        return copy.call(this, source, ...rest);
      };
      window.__ttCardBlur = [];
      new MutationObserver((records) => records.forEach(({ target, oldValue }) => {
        if (!target.style.filter.startsWith("blur(") || oldValue?.includes("blur(")) return;
        window.__ttCardBlur.push(target.closest("[data-masonry-card]")?.dataset.masonryCard);
      })).observe(document.body, { attributes: true, attributeFilter: ["style"], attributeOldValue: true, subtree: true });
      new MutationObserver((records) => records.forEach(({ addedNodes }) => addedNodes.forEach((node) => {
        if (!node.matches?.(".glass-surface[data-glass-reveal]")) return;
        // Related cards are also in the photo view; their Kính would be card Kính, not the primary's.
        window.__ttRevealGlass.push({ host: node.closest("[data-masonry-card], [data-masonry-related-card]") ? "card" : "primary" });
      }))).observe(document.body, { childList: true, subtree: true });
    });
    const revealGlass = (host) => page.evaluate((name) => window.__ttRevealGlass.filter((glass) => glass.host === name), host);
    const frostCopies = (host) => page.evaluate((name) => window.__ttFrost.filter((value) => value === name).length, host);
    await page.waitForFunction(() => window.TruongThinhMasonry?.getBrowseState?.()?.seed
      && document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaReady === "true");
    const geometry = () => page.evaluate(() => ({
      cards: [...document.querySelectorAll("[data-masonry-card]")].map(node => [node.dataset.masonryCard, node.style.left, node.style.top]),
      cta: document.querySelector("[data-masonry-grid-cta]")?.offsetTop,
      footer: document.querySelector("footer.site-footer")?.offsetTop,
      filters: [...document.querySelectorAll("[data-masonry-filter]")].map(node => [node.offsetLeft, node.offsetTop]),
    }));
    await page.waitForFunction(() => document.querySelector("[data-project-grid] img.lazyloading"));
    // A card image waiting to load stays hidden under a Flow frame (PC) or the color layer (phone) (progressive-loading R9).
    const waitingImage = phoneView ? "[data-project-grid] [data-media-wait='colors'] img.lazyloading"
      : "[data-project-grid] [data-masonry-card]:has([data-masonry-loading-skeleton]) img.lazyloading";
    await page.waitForFunction((selector) => document.querySelector(selector), waitingImage);
    const loading = await page.evaluate((selector) => {
      const image = document.querySelector(selector);
      const card = image.closest("[data-masonry-card]");
      const { filter, opacity, animationName } = getComputedStyle(image);
      return { blur: filter.startsWith("blur("), animationName, opacity: Number(opacity),
        marked: card.hasAttribute("data-masonry-media-loading"), layer: getComputedStyle(card, "::after").animationName };
    }, waitingImage);
    if (phoneView) {
      // The image stays hidden (no blur, no breathing) over a color layer that cycles through its 4 colors.
      assert.deepEqual(loading, { blur: false, animationName: "none", opacity: 0, marked: false, layer: "media-colors-fade, media-colors-shift" },
        `${viewport.width}px: loading card waits on the color layer, image hidden`);
    } else {
      // The image stays hidden, unblurred and still under the card's Flow frame; the card is marked as waiting.
      assert.deepEqual(loading, { blur: false, animationName: "none", opacity: 0, marked: true, layer: "none" },
        `${viewport.width}px: loading card waits under Flow, image hidden`);
    }
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
    // The Flow frame or color layer goes within 0.6 s after the last image finishes loading.
    await page.waitForFunction((selector) => !document.querySelector(selector), phoneView ? "[data-project-grid] [data-masonry-card][data-media-wait]"
      : "[data-project-grid] [data-masonry-card] [data-masonry-loading-skeleton]", { timeout: 5000 })
      .catch(() => assert.fail(`${viewport.width}px: loaded cards drop the Flow frame or color layer`));
    // When loading finishes the breathing stops: no attribute, animation or half-done opacity remains (image-wait spec S2).
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-masonry-card]")]
      .filter((card) => card.hasAttribute("data-masonry-media-loading")
        || [...card.querySelectorAll("img")].some((image) => getComputedStyle(image).animationName !== "none")).length), 0,
      `${viewport.width}px: loaded cards stop breathing`);
    // No card wears Kính; a PC card reveals from its Flow frame through frosted glass of its photo, the phone through the color layer.
    assert.deepEqual(await revealGlass("card"), [], `${viewport.width}px: loading cards wear no Kính`);
    const cardFrost = await frostCopies("card");
    assert.ok(phoneView ? cardFrost === 0 : cardFrost > 0, `${viewport.width}px: ${phoneView ? "phone cards make no" : "PC cards reveal through a"} frosted copy (${cardFrost})`);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] img")]
      .filter((image) => getComputedStyle(image).filter !== "none").length), 0, `${viewport.width}px: loaded card images end sharp`);
    // A card that finished loading and left the viewport shows again at once: no blur, no skeleton (R3).
    const loadedIds = await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-masonry-card]")]
      .filter((card) => card.querySelector("img")?.naturalWidth > 0).map((card) => card.dataset.masonryCard));
    const blursBefore = await page.evaluate(() => window.__ttCardBlur.length);
    const scrollTo = (y) => page.evaluate((top) => window.TruongThinhMotion.setLogicalScroll(top), y);
    await scrollTo(4000);
    await page.waitForTimeout(600);
    // Sample every frame for 1 s after scrolling back: a loaded card reattached has no frame carrying a skeleton or half-done
    // opacity (fading), the cached copy shows straight at final opacity (R3).
    const fades = await page.evaluate(async (ids) => {
      const seen = [];
      window.TruongThinhMotion.setLogicalScroll(0);
      const startedAt = performance.now();
      while (performance.now() - startedAt < 1000) {
        await new Promise(requestAnimationFrame);
        for (const card of document.querySelectorAll("[data-project-grid] [data-masonry-card]")) {
          const { top, bottom } = card.getBoundingClientRect();
          if (!ids.includes(card.dataset.masonryCard) || bottom <= 0 || top >= innerHeight) continue;
          const opacity = Number.parseFloat(getComputedStyle(card.querySelector("img")).opacity);
          if (card.querySelector("[data-masonry-loading-skeleton]") || (opacity > 0.02 && opacity < 0.98)) {
            seen.push({ id: card.dataset.masonryCard, opacity, at: Math.round(performance.now() - startedAt) });
          }
        }
      }
      return seen;
    }, loadedIds);
    assert.deepEqual(fades.slice(0, 5), [], `${viewport.width}px: a re-entering loaded card shows at once, no skeleton or fade`);
    const inView = () => page.evaluate((ids) => [...document.querySelectorAll("[data-project-grid] [data-masonry-card]")]
      .filter((card) => ids.includes(card.dataset.masonryCard))
      .filter((card) => { const { top, bottom } = card.getBoundingClientRect(); return bottom > 0 && top < innerHeight; })
      .map((card) => ({ id: card.dataset.masonryCard, wait: card.hasAttribute("data-media-wait"),
        skeleton: Boolean(card.querySelector("[data-masonry-loading-skeleton]")),
        opacity: getComputedStyle(card.querySelector("img")).opacity })), loadedIds);
    let reentry = [];
    for (let tries = 0; tries < 50; tries += 1) {
      reentry = await inView();
      if (reentry.length && reentry.every(({ skeleton, wait, opacity }) => !skeleton && !wait && opacity === "1")) break;
      await page.waitForTimeout(200);
    }
    assert.ok(reentry.length, `${viewport.width}px: loaded cards are back in view`);
    assert.deepEqual(reentry.filter(({ skeleton, wait, opacity }) => skeleton || wait || opacity !== "1"), [],
      `${viewport.width}px: a re-entering loaded card shows without skeleton`);
    const reentryBlur = (await page.evaluate(() => window.__ttCardBlur)).slice(blursBefore).filter((card) => loadedIds.includes(card));
    assert.deepEqual(reentryBlur, [], `${viewport.width}px: a re-entering loaded card starts no blur`);
    // A card that just finished loading still reveals from its skeleton; let them settle first.
    await page.waitForTimeout(700);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-masonry-loading-skeleton]")]
      .filter((frame) => frame.parentElement.querySelector("img")?.naturalWidth > 0)
      .map((frame) => [frame.closest("[data-masonry-card]").dataset.masonryCard, frame.parentElement.querySelector("img").className,
        Math.round(frame.getBoundingClientRect().top)])), [],
    `${viewport.width}px: a loaded card re-enters without a skeleton`);

    // Viewer: skeleton and aria-busy follow the current photo, including a fast hero swap.
    const viewer = () => page.evaluate(() => {
      const frame = document.querySelector("[data-detail-image]").parentElement;
      return { photo: window.TruongThinhMasonry.getBrowseState().photo, busy: frame.getAttribute("aria-busy"), skeleton: Boolean(frame.querySelector("[data-masonry-loading-skeleton]")), wait: frame.dataset.mediaWait ?? null,
        glass: Boolean(frame.querySelector(".glass-surface[data-glass-reveal]")), src: document.querySelector("[data-detail-image]").currentSrc };
    });
    // The Kính reveal belongs to the image; a card opened with video (temporary multi-media) has no image skeleton so pick a card opened with an image.
    await page.locator("[data-masonry-card]:not(:has(video)) a").first().click();
    await page.waitForFunction((colors) => {
      const frame = document.querySelector("[data-detail-image]")?.parentElement;
      return frame?.getAttribute("aria-busy") === "true"
        && (colors ? frame.dataset.mediaWait === "colors" : frame.querySelector("[data-masonry-loading-skeleton]"));
    }, phoneView);
    const first = await viewer();
    assert.ok(first.photo && (phoneView ? first.wait === "colors" && !first.skeleton : first.skeleton),
      `${viewport.width}px: viewer shows the ${phoneView ? "color layer" : "skeleton"} while primary loads`);
    await page.waitForFunction(() => document.querySelector("[data-masonry-related-card] > a"));
    const relatedId = await page.evaluate(() => {
      const card = [...document.querySelectorAll("[data-masonry-related-card]")].find(node => node.querySelector("a") && !node.querySelector("video") && node.getBoundingClientRect().height);
      card.querySelector("a").click();
      return card.dataset.masonryRelatedCard;
    });
    await page.waitForFunction(id => window.TruongThinhMasonry.getBrowseState().photo === id, relatedId);
    await page.waitForFunction(() => !document.querySelector("[data-detail-image]").parentElement.hasAttribute("aria-busy")
      && document.querySelector("[data-detail-image]").complete, null, { timeout: 30_000 });
    await page.waitForTimeout(DELAY + 300);
    const swapped = await viewer();
    assert.equal(swapped.photo, relatedId);
    assert.deepEqual({ busy: swapped.busy, skeleton: swapped.skeleton, glass: swapped.glass, wait: swapped.wait },
      { busy: null, skeleton: false, glass: false, wait: null },
      `${viewport.width}px: earlier photo leaves no stale skeleton or Kính`);
    // loading-glass-and-page-entry R4: the PC primary reveals like cards, through frosted glass of its photo on its own shared Flow canvas;
    // the phone primary uses the color layer, then a 0.45 s fade. Neither wears Kính.
    assert.deepEqual(await revealGlass("primary"), [], `${viewport.width}px: the primary wears no Kính`);
    const primaryFrost = await frostCopies("primary");
    assert.ok(phoneView ? primaryFrost === 0 : primaryFrost > 0, `${viewport.width}px: primary frosted copies ${primaryFrost}`);
    // Back to the first image also swaps the image in place (R4).
    await page.goBack();
    await page.waitForFunction(id => window.TruongThinhMasonry.getBrowseState().photo === id
      && !document.querySelector("[data-detail-image]").parentElement.hasAttribute("aria-busy"), first.photo);
    primaryReveals.push({ glass: await revealGlass("primary"), frost: await frostCopies("primary") });
    await page.goBack();
    await page.waitForFunction(() => window.TruongThinhMasonry.getBrowseState().photo === null);
    assert.equal(await page.evaluate(() => document.querySelectorAll("[data-detail-view] [data-masonry-loading-skeleton], [data-detail-view] [data-media-wait]").length), 0,
      `${viewport.width}px: closing the viewer clears the skeleton and the color layer`);
    assert.deepEqual((await geometry()).filters, loaded.filters, `${viewport.width}px: history return keeps filters`);
    results.push({ case: "p9-advertising", width: viewport.width, cardCount, cardRequests, first: first.photo, swapped: relatedId });
    await context.close();
  }
  // Only the PC primary reveals through frosted glass; the phone primary uses the color layer; neither wears Kính.
  assert.deepEqual(primaryReveals[0], { glass: [], frost: 0 }, "phone primary reveals through no Kính and no frosted glass");
  assert.ok(primaryReveals[1].glass.length === 0 && primaryReveals[1].frost > 0, `PC primary reveals through frosted glass ${JSON.stringify(primaryReveals[1])}`);
  // Barba builds the container outside the document: an image that finishes loading before attaching must still settle, with no stuck sweep.
  for (const route of ["/vi/commercial/", "/vi/residential/"]) {
    const { context, page } = await open({ delay: 0, viewport: viewports[1] });
    await page.goto(BASE_URL + "/vi/", { waitUntil: "load" });
    // Click early and the image may load after attaching so the load error is not reproduced; wait like a real viewer.
    await page.waitForTimeout(2000);
    await page.locator(`a[href="${route}"]`).first().click();
    await page.waitForFunction(() => document.querySelector(".detail-hero .hero-slide.is-active picture"));
    await page.waitForFunction(() => document.querySelector(".detail-hero .hero-slide.is-active picture").classList.contains("is-media-settled"), null, { timeout: 5000 })
      .catch(() => assert.fail(`${route}: hero after soft navigation stays unsettled`));
    results.push({ case: "soft-nav-hero-settled", route });
    await context.close();
  }
  // A frame opts in with data-media-frame (media-delivery R6): any image source, no exclusion list, also when added after mount; the sweep pauses off screen.
  {
    const { context, page } = await open({ delay: 0, viewport: viewports[1] });
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await page.route("**/slow-frame-*.png", async route => {
      await new Promise(resolve => setTimeout(resolve, DELAY));
      await route.fulfill({ contentType: "image/png", body: png });
    });
    await page.goto(BASE_URL + "/vi/", { waitUntil: "load" });
    const add = (id, margin) => page.evaluate(({ id, margin }) => {
      const frame = document.createElement("div");
      frame.id = id;
      frame.dataset.mediaFrame = "";
      frame.style.cssText = `position:relative;width:200px;height:100px;margin-top:${margin}px`;
      const image = document.createElement("img");
      image.alt = "";
      image.src = `/slow-frame-${id}.png`;
      frame.append(image);
      document.body.append(frame);
    }, { id, margin });
    const state = id => page.evaluate(id => {
      const frame = document.getElementById(id);
      return { marked: frame.classList.contains("media-frame"), sweep: getComputedStyle(frame, "::before").animationName,
        settled: frame.classList.contains("is-media-settled"), offscreen: frame.classList.contains("is-media-offscreen") };
    }, id);
    await add("frame-visible", 0);
    await page.evaluate(() => document.getElementById("frame-visible").scrollIntoView());
    await page.waitForFunction(() => { const frame = document.getElementById("frame-visible"); return frame.classList.contains("media-frame") && !frame.classList.contains("is-media-offscreen"); });
    assert.deepEqual(await state("frame-visible"), { marked: true, sweep: "media-sweep", settled: false, offscreen: false }, "data-media-frame frame outside /assets/content/ shows the sweep");
    await add("frame-far", 8000);
    await page.waitForFunction(() => document.getElementById("frame-far").classList.contains("is-media-offscreen"), null, { timeout: 5000 })
      .catch(() => assert.fail("a frame added after mount and off screen pauses its sweep"));
    await page.waitForFunction(() => document.getElementById("frame-visible").classList.contains("is-media-settled"), null, { timeout: 5000 });
    assert.equal((await state("frame-visible")).sweep, "none", "data-media-frame frame drops the sweep once settled");
    results.push({ case: "data-media-frame", marked: true });
    await context.close();
  }
  console.log("PASS image loading frame: " + results.length + " cases");
} finally {
  await fs.writeFile(output + "/results.json", JSON.stringify(results, null, 2));
  await browser.close();
}
