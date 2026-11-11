// Script inlined into the <head> of every page at build time (prepare-static-assets.mjs replaces <!-- head-inline -->).
// One source for 6 pages so it does not fragment (progressive-loading R7).
try {
  // Every direct load (link, reload, Back/Forward) runs the enter phase of route-transition.
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("route-enter");
  }
  const routeLocale = document.documentElement.dataset.routeLocale;
  document.documentElement.lang = routeLocale === "en" ? "en" : "vi";
} catch {}
// The image frame keeps its shimmer until the image has loaded and decoded; listening from the head so no image's event is missed.
document.documentElement.classList.add("media-gate");
(() => {
  // failed: when an image fails to load, the frame also gets .is-media-error so CSS draws the error indicator (media-delivery R8).
  const settle = (image, failed = false) => {
    const parent = image.parentElement;
    const frame = parent?.tagName === "PICTURE" ? parent.parentElement : parent;
    parent?.classList.add("is-media-settled");
    frame?.classList.add("is-media-settled");
    frame?.classList.toggle("is-media-error", failed);
  };
  const isImage = (target) => target.tagName === "IMG";
  // The waiting frame is the parent of the content image (or of the picture), except grid, photo view, the Advertising "Xem lớn hơn" viewer and the client logo strip:
  // add the class when the image enters the DOM instead of a page-wide :has() selector, which made every style recalculation about 1/4 slower.
  const markFrame = (image) => {
    if (!image.getAttribute("src")?.startsWith("/assets/content/")) return;
    const parent = image.parentElement;
    const frame = parent?.tagName === "PICTURE" ? parent.parentElement : parent;
    if (frame && !frame.closest("[data-project-grid], [data-detail-view], [data-detail-dialog], .client-logo-marquee")) frame.classList.add("media-frame");
  };
  // An in-viewport image upgrades to the original after the frame-fit version has shown (progressive-loading R10, owner 2026-10-31): load the original
  // separately and swap only once decoded; runs only when the page stops scrolling and no in-viewport image is still loading, one image per turn.
  const VARIANT = /-(?:240|480|960|1600|2048)(\.(?:jxl|webp))$/;
  const SCROLL_IDLE_MS = 250;
  // Only large frames upgrade to the original: width from 640px or wide, height from 60% of the viewport (hero, large detail images including portrait); a 4K
  // masonry card dropped the A04s from 72 to 39-47 FPS while looking no different in a small cell (owner's choice 2026-10-31).
  const LARGE_FRAME_PX = 640;
  const inView = new Set();
  let scrolledAt = 0;
  let upgrading = false;
  let upgradeTimer = 0;
  const visible = (node) => {
    const { top, bottom, width } = node.getBoundingClientRect();
    return width > 0 && bottom > 0 && top < innerHeight;
  };
  const scheduleUpgrade = (wait = SCROLL_IDLE_MS) => {
    if (!upgradeTimer && !upgrading && inView.size) upgradeTimer = setTimeout(upgradeNext, wait);
  };
  // Milliseconds still to wait before an image may load or swap; 0 means the page is idle.
  const busyFor = () => {
    const wait = scrolledAt + SCROLL_IDLE_MS - performance.now();
    if (wait > 0 || document.readyState !== "complete" || document.documentElement.classList.contains("has-scroll-scrolling")
      || [...document.images].some((node) => !node.complete && visible(node))) return Math.max(wait, SCROLL_IDLE_MS);
    return 0;
  };
  const upgradeNext = () => {
    upgradeTimer = 0;
    const wait = busyFor();
    if (wait) return scheduleUpgrade(wait);
    let image;
    let pending = false;
    for (const node of inView) {
      // A small frame waits for ResizeObserver to report it growing. A stylesheet filter is a fixed blur (primary background): skip it entirely. An
      // inline filter (blur awaiting the image), an animation, or a hidden image (hero slide not yet its turn): wait for the next turn.
      const { width, height } = node.getBoundingClientRect();
      if (width < Math.min(LARGE_FRAME_PX, innerWidth * 0.6) && height < innerHeight * 0.6) continue;
      if (getComputedStyle(node).filter !== "none" && !node.style.filter) forget(node);
      else if (node.style.filter || node.getAnimations().length
        || !(node.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true)) pending = true;
      else {
        image = node;
        break;
      }
    }
    if (!image) return pending && scheduleUpgrade();
    forget(image);
    const original = image.currentSrc.replace(VARIANT, "$1");
    const loader = Object.assign(new Image(), { src: original });
    upgrading = true;
    const done = () => {
      upgrading = false;
      scheduleUpgrade(0);
    };
    // If the page scrolled again by the time decoding finished, wait for idle before swapping: painting a 4K image for the first time costs one long frame.
    const swap = () => {
      const wait = busyFor();
      if (wait) return setTimeout(swap, wait);
      // The image still shows exactly that media: the Advertising primary reuses one img for every media, so switching media mid-load of the original
      // must drop it, otherwise the old media's original overwrites the new media.
      if (image.isConnected && image.currentSrc.replace(VARIANT, "$1") === original) {
        // Inside a picture, swap the exact source the browser is using (JXL); WebP sits on the img itself. An img with only src (Advertising
        // primary) swaps src: the runtime assigns src for later media, and a srcset assigned here would override it forever.
        const source = original.endsWith(".jxl") && image.parentElement?.querySelector('source[type="image/jxl"]');
        if (source) source.srcset = original;
        else image[image.hasAttribute("srcset") ? "srcset" : "src"] = original;
      }
      done();
    };
    loader.decode().then(swap, done);
  };
  const upgradeObserver = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
    if (!target.isConnected) forget(target);
    else if (isIntersecting && VARIANT.test(target.currentSrc)) inView.add(target);
    else inView.delete(target);
    scheduleUpgrade();
  }));
  // When the frame changes size (primary sets its size after the image loads, screen rotation), re-evaluate.
  const resized = new ResizeObserver(() => scheduleUpgrade());
  const forget = (image) => {
    upgradeObserver.unobserve(image);
    resized.unobserve(image);
    inView.delete(image);
  };
  // Masonry cards, including related cards and suggestion cards on detail, keep the frame-fit version even if a portrait card is taller than 60% of the viewport (owner
  // choice 2026-10-31): upgrading related cards to the original made the PC stall 200-480ms on each 4K JXL decode between two scrolls (measured 2026-11-09).
  // Phones do not upgrade to the 4K original (owner 2026-11-07, media query like the build's phone <source>).
  const phone = matchMedia("(hover: none) and (pointer: coarse)").matches;
  const watchUpgrade = (image) => {
    if (phone || !VARIANT.test(image.currentSrc)
      || image.closest("[data-masonry-item]")) return;
    upgradeObserver.observe(image);
    resized.observe(image);
  };
  addEventListener("scroll", () => { scrolledAt = performance.now(); }, { capture: true, passive: true });
  document.addEventListener("load", ({ target }) => {
    if (!isImage(target)) return;
    watchUpgrade(target);
    target.decode().catch(() => {}).then(() => settle(target));
  }, true);
  document.addEventListener("error", ({ target }) => isImage(target) && settle(target, true), true);
  // sizes follows the part of the image visible after the cover crop (media-delivery R2). ResizeObserver runs after layout,
  // before lazy loading starts fetching, and again when the frame changes size; only raises the variant, never lowers it.
  // The cap is the largest variant: the original loads only through the R10 upgrade step when a large frame is visible and the page is idle. Without a cap a phone at
  // DPR 1.875 needs about 2050px for a landscape slide covering a portrait screen, so 9 slides would defer loading even the original (2.5 MB).
  const MAX_VARIANT_PX = 2048;
  const fit = new ResizeObserver((entries) => entries.forEach(({ target: image }) => {
    const { width, height } = image.getBoundingClientRect();
    const ratio = image.getAttribute("width") / image.getAttribute("height");
    const needed = Math.min(Math.floor(MAX_VARIANT_PX / devicePixelRatio),
      Math.ceil(getComputedStyle(image).objectFit === "cover" && ratio > 0 ? Math.max(width, height * ratio) : width));
    const loaded = image.currentSrc.replace(/\.\w+$/, "");
    if (!width || (loaded && (loaded === image.src.replace(/\.\w+$/, "") || loaded.match(/-(\d+)$/)?.[1] >= needed * devicePixelRatio))) return;
    [image, ...image.parentElement.querySelectorAll(":scope > source")].forEach((node) => node.setAttribute("sizes", `${needed}px`));
  }));
  const fitted = 'picture > img[loading="lazy"], picture > img[data-srcset]';
  // The Barba container is built outside the document, so an image may finish loading before it is attached and the load event never reaches the document;
  // such an image is settled as soon as it is attached.
  // An image with data-src receives src on hydrate (hero slide), so the frame only gets the shimmer then.
  new MutationObserver((records) => records.forEach(({ target, addedNodes }) => (isImage(target) ? markFrame(target) : addedNodes.forEach((node) => node.nodeType === 1
    && [node, ...node.querySelectorAll("img")].forEach((image) => {
      if (isImage(image)) markFrame(image);
      if (image.matches(fitted)) fit.observe(image);
      if (isImage(image) && image.complete && image.naturalWidth) {
        watchUpgrade(image);
        image.decode().catch(() => {}).then(() => settle(image));
      } else if (isImage(image) && image.complete && image.currentSrc) settle(image, true);
    })))))
    .observe(document, { childList: true, subtree: true, attributeFilter: ["src"] });
})();
