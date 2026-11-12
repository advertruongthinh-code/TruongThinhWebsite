(() => {
  const reduceMotionQuery = window.TruongThinhEnv.reducedMotion;
  const reduceMotion = reduceMotionQuery.matches;
  const { gsap, SplitText } = window;
  const hasGsap = typeof gsap !== "undefined";
  const smoothMedia = window.matchMedia("(min-width: 981px)");
  // Unique id per mount: when Barba switches pages, the old (hidden) container is still in the DOM with the News grid.
  let newsGridCount = 0;
  const headerHoverMedia = window.matchMedia(
    "(any-hover: hover) and (any-pointer: fine)",
  );
  // Phones in both portrait and landscape: the header follows the scroll distance (phone-header-scroll R1).
  const headerFollowMedia = window.matchMedia(
    "(hover: none) and (pointer: coarse) and (max-width: 750px), (hover: none) and (pointer: coarse) and (max-height: 750px)",
  );
  const header = document.querySelector("[data-site-header]");
  const routeVeil = document.querySelector(".route-veil");
  const floatingCta = document.querySelector(".floating-cta");
  const dialog = document.querySelector("#site-menu");
  const openButton = document.querySelector("[data-menu-open]");
  const closeButton = document.querySelector("[data-menu-close]");
  const runtimeAbort = new AbortController();
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  // The Advertising root page and cluster and product pages (taxonomy R4) are the same masonry page.
  const isAdvertisingPath = (pathname) =>
    /^\/(?:vi|en)\/advertising-products(?:\/(?:[^/]+\/){0,2})?$/.test(pathname);
  // Barba keeps the namespace of each history entry. Projects (/projects/ and its filter pages) runs the same masonry
  // runtime, but its paths look like project detail paths, so only the entry namespace tells a grid page apart.
  const isMasonryHistoryEntry = (pathname) => isAdvertisingPath(pathname)
    || window.history.state?.states?.[window.history.state.index]?.ns === "projects";
  // Detail: card page (media-seo R1) or the old ?photo=.
  const isAdvertisingPhotoUrl = (url) =>
    url.searchParams.has("photo") || /^\/(?:vi|en)\/advertising-products\/p\//.test(url.pathname);
  const localeScrollStateKey = (url) =>
    `tt-locale-scroll:${url.pathname}${url.search}`;
  const textMaskSelector =
    ".hero-line-mask, .line-mask, .heritage-text, .portal-title-mask, .portal-title__quiet, .portal-title__strong, .detail-line, .motion-line-mask";
  const maskContext = document.createElement("canvas").getContext("2d");
  const runtimeBodyClasses = [
    "is-transitioning",
    "menu-open",
    "motion-paused",
  ];
  const persistentSelectors = [
    "[data-site-header]",
    ".floating-cta",
    "#site-menu",
  ];

  if (!header || !routeVeil || !dialog || !openButton || !closeButton) return;
  // Small-size mark (brand.md Logo): the header and menu rebuild the 4 strips on the device-pixel grid so the bottom
  // lands on a pixel, and the stripe gap and strip period are whole pixels; the original mark has a 7.48-unit gap.
  // ponytail: assumes the svg top edge sits on a whole pixel (true at DPR 1); a fractional DPR may be off by under 1 device pixel.
  const brandLockups = [...document.querySelectorAll("[data-site-header] .brand-lockup, #site-menu .brand-lockup")];
  const brandMarkDeviceHeight = new WeakMap();
  const snapBrandMark = (svg) => {
    const paths = [...svg.querySelectorAll(".brand-lockup__mark > path")];
    const deviceHeight = brandMarkDeviceHeight.get(svg);
    if (paths.length !== 4 || !deviceHeight) return;
    // Mark units to device pixels: viewBox height 153.667, mark scale 0.62.
    const unit = (deviceHeight * 0.62) / 153.667;
    // The bottom shifts at most half a device pixel to the nearest pixel; keep the height and the original mark width.
    const base = Math.round(deviceHeight);
    const width = (2 * deviceHeight) / Math.sqrt(3);
    const gap = Math.max(2, Math.round(7.48 * unit));
    const period = Math.round((width + gap) / 4);
    // Point on the line parallel to the left edge, going from the foot x to the triangle's right edge.
    const toRightEdge = (x) => {
      const t = (width - x) / 2;
      return [x + t, base - t * Math.sqrt(3)];
    };
    paths.forEach((path, index) => {
      // DOM: black, yellow, magenta, cyan; cyan is the leftmost strip.
      const band = 3 - index;
      const left = band * period;
      const right = band === 3 ? width : left + period - gap;
      const points = [[left, base], [right, base], toRightEdge(right), toRightEdge(left)];
      path.setAttribute("d", `M${points.map(([x, y]) => `${(x / unit).toFixed(3)} ${(y / unit).toFixed(3)}`).join("L")}Z`);
    });
  };
  if (typeof ResizeObserver !== "undefined") {
    const brandMarkObserver = new ResizeObserver((entries) => entries.forEach((entry) => {
      // devicePixelContentBoxSize is already rounded; the real height is needed to know which pixel is the bottom.
      const deviceHeight = entry.contentRect.height * window.devicePixelRatio;
      if (!deviceHeight) return;
      brandMarkDeviceHeight.set(entry.target, deviceHeight);
      snapBrandMark(entry.target);
    }));
    brandLockups.forEach((svg) => {
      try {
        brandMarkObserver.observe(svg, { box: "device-pixel-content-box" });
      } catch {
        brandMarkObserver.observe(svg);
      }
    });
    runtimeAbort.signal.addEventListener("abort", () => brandMarkObserver.disconnect());
  }
  const headerLogo = header.querySelector("#header-logo");
  const desktopNav = header.querySelector("#header-menu-items");
  const desktopNavList = desktopNav?.querySelector("ul");
  const measureDesktopNav = () => {
    if (!desktopNavList) return;
    const hiddenByBreakpoint = getComputedStyle(desktopNavList).display === "none";
    const items = [...desktopNavList.children];
    const listRect = desktopNavList.getBoundingClientRect();
    // The logo is measured by layout box, ignoring transform: during intro scale(0) the rect has 0 width so the nav overlaps the logo without being hidden.
    const logoParent = headerLogo?.offsetParent;
    const logoRight = logoParent
      && logoParent.getBoundingClientRect().left + logoParent.clientLeft + headerLogo.offsetLeft + headerLogo.offsetWidth;
    const menuRect = openButton.getBoundingClientRect();
    const wraps = items.length > 0
      && items.some((item) => Math.abs(item.offsetTop - items[0].offsetTop) > 1);
    const clips = desktopNavList.scrollWidth > desktopNavList.clientWidth + 1;
    const overlaps = Boolean(logoRight) && (listRect.left < logoRight - 1 || listRect.right > menuRect.left + 1);
    const hidden = hiddenByBreakpoint || items.length === 0 || wraps || clips || overlaps;
    desktopNav.classList.toggle("is-space-hidden", hidden);
    desktopNav.inert = hidden;
    desktopNav.setAttribute("aria-hidden", String(hidden));
    desktopNav.dataset.navMeasured = "true";
  };
  if (desktopNavList && typeof ResizeObserver !== "undefined") {
    const navResizeObserver = new ResizeObserver(measureDesktopNav);
    navResizeObserver.observe(header);
    navResizeObserver.observe(desktopNavList);
  }
  if (hasGsap) {
    gsap.registerEase("expo.out", (progress) =>
      progress === 1 ? 1 : 1 - 2 ** (-10 * progress),
    );
  }
  if (hasGsap && !reduceMotion) {
    document.documentElement.classList.add("motion-enabled");
  }
  const markMotionReady = () =>
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() =>
        document.documentElement.classList.add("motion-ready"),
      ),
    );
  if (document.readyState === "complete") markMotionReady();
  else document.addEventListener("DOMContentLoaded", markMotionReady, { once: true });
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  let currentLanguage = "vi";
  let pageState;
  let toneRanges = [];
  let ticking = false;
  let lastScrollY = 0;
  let directionStartY = 0;
  let lastDirection = "";
  let lastHeaderCollapsed;
  let headerOffset = 0;
  let headerFollowHeight = Infinity;
  let headerFollowStale = true;
  let currentHeaderColor = "";
  let routeTimeline;
  let routeInFlight = false;
  let routeDestinationReady = false;
  let routeMountReady = false;
  // Mount under the waiting veil when the veil starts opening, to count the hero intro delay (first-load-parity R2).
  let resolveRouteReveal;
  const startRouteReveal = () => {
    resolveRouteReveal?.();
    resolveRouteReveal = undefined;
  };
  let advertisingCatalogLoad;
  let lastHeaderWhiteSurface;
  let routeMarkHeld = false;
  // Soft route: the header is in veil tone (bold text, CMYK mark) from when the veil fully covers until it starts opening, even when the
  // destination page mounts under the veil (logo-route-crossfade R1, R2).
  let routeVeilInk = false;
  // The veil covers fully for at least 1s (owner 2026-11-09), longer than one mark flip, even when the destination page is already cached: bold text and CMYK mark
  // show long enough on the veil, the navbar does not flicker (owner 2026-11-09, logo-route-crossfade R2).
  const routeVeilHold = 1000;
  let routeVeilCoveredAt;
  let pageHeaderInk = false;
  let hardFallbackPending = false;
  let menuTimeline;
  let menuPageTween;
  let menuCloseTimer;
  let menuClosePromise;
  let resolveMenuClose;
  let localeSwitchPromise;
  const routeScrollPositions = new Map();
  let pendingLocaleNavigation;

  const getRouteLocale = () => document.documentElement.dataset.routeLocale;
  const getPageScroll = () =>
    pageState?.smoothScroll
      ? Math.max(pageState.smoothScrollY, window.scrollY)
      : window.scrollY;
  const getPageChildren = () =>
    pageState ? [...pageState.container.children] : [];

  // Hero text (hero-typography R2): measure the longest line in em; CSS only shrinks the text when the frame width divided by this number is smaller than
  // the shared size, so resize needs no re-measure. Re-measure on language change or when fonts finish loading.
  const fitHeroLines = () => {
    document
      .querySelectorAll(".hero > .hero-content > :is(h1, p.hero-title):not(.hero-kicker), .legacy-copy h2")
      .forEach((title) => {
        title.setAttribute("data-hero-fit", "");
        // The hero wrapper may be scaling (zoom on page entry); convert the rect to layout px.
        const scale = title.getBoundingClientRect().width / (title.offsetWidth || 1) || 1;
        // One font size for the whole title: the longest line fits the frame, the two lines keep the same rhythm.
        const widths = [];
        title.querySelectorAll(":scope > :is(.hero-line-mask, .detail-hero-line-mask, .line-mask)").forEach((line) => {
          let left = Infinity;
          let right = -Infinity;
          const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
          for (let text = walker.nextNode(); text; text = walker.nextNode()) {
            if (!text.textContent.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(text);
            const rect = range.getBoundingClientRect();
            left = Math.min(left, rect.left);
            right = Math.max(right, rect.right);
          }
          const size = Number.parseFloat(getComputedStyle(line).fontSize);
          if (right > left && size) widths.push((right - left) / scale / size);
        });
        if (!widths.length) return;
        // Leave 1%: hinting makes text width not shrink exactly in proportion to font size, so a line fitting tight to the frame could overflow by 1-2px.
        // Hero writes to hero-content so the kicker can read it too (detail.css); the legacy CTA writes to the h2 itself.
        const host = title.closest(".hero-content") || title;
        host.style.setProperty("--hero-line-em", (Math.max(...widths) * 1.01).toFixed(3));
        // Two partially nested lines like the EN home hero (hero-typography R2): the pair's line width is the sum of both lines minus 30% of the
        // short line; CSS pushes the two lines to the middle when the frame is wider than the pair.
        if (widths.length === 2) {
          const pair = widths[0] + widths[1] - 0.3 * Math.min(...widths);
          host.style.setProperty("--hero-pair-em", (pair * 1.01).toFixed(3));
        }
        // The kicker sits the same distance from the real ink top of line 1 in every hero, including text with stacked diacritics ("Ể"): the kicker is pulled down
        // by as many em as line 1 sits lower than "Ể" (detail.css).
        const firstLine = title.firstElementChild;
        if (host !== title && maskContext && firstLine) {
          const style = getComputedStyle(firstLine.querySelector("*") || firstLine);
          const size = Number.parseFloat(style.fontSize);
          maskContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const ink = maskContext.measureText(firstLine.textContent.trim().toLocaleUpperCase("vi")).actualBoundingBoxAscent;
          const drop = (maskContext.measureText("Ể").actualBoundingBoxAscent - ink) / size;
          if (size) host.style.setProperty("--hero-ink-drop", Math.max(0, drop).toFixed(3));
        }
      });
  };

  const measureTextMasks = () => {
    if (!maskContext) return;
    // Read everything first, then write: writing mask variables between getComputedStyle calls forces a style recalc per mask (phone).
    const overflows = [...document.querySelectorAll(textMaskSelector)].map((mask) => {
      const line = mask.firstElementChild || mask;
      const style = getComputedStyle(line);
      const fontSize = Number.parseFloat(style.fontSize);
      if (!fontSize) return undefined;
      maskContext.font =
        style.font ||
        `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const metrics = maskContext.measureText(line.textContent.trim());
      const capMetrics = maskContext.measureText("H");
      // Floor 0.24em: enough for the part of the text content box exceeding the line box (about 0.14em) plus the 0.1em lift of
      // .heritage-line / .line-mask > span, so the mask does not clip the text box on a short landscape screen.
      const topOverflow = Math.max(
        fontSize * 0.24,
        metrics.actualBoundingBoxAscent -
          capMetrics.actualBoundingBoxAscent +
          fontSize * 0.1 +
          4,
      );
      const bottomOverflow = Math.max(
        fontSize * 0.2,
        metrics.actualBoundingBoxDescent + 4,
      );
      return [mask, Math.ceil(topOverflow), Math.ceil(bottomOverflow)];
    });
    overflows.forEach((entry) => {
      if (!entry) return;
      const [mask, top, bottom] = entry;
      mask.style.setProperty("--mask-ink-overflow", `${Math.max(top, bottom)}px`);
      mask.style.setProperty("--mask-ink-overflow-top", `${top}px`);
      mask.style.setProperty("--mask-ink-overflow-bottom", `${bottom}px`);
    });
  };
  // Hidden position of a text line in the mask: dropped fully below the clip-path edge (mask bottom, bottom ink, fixed shadow zone
  // --text-shadow-reach). Dropping only 2em lets small text (portal kicker) show the top of the glyphs through the 12px shadow zone.
  // Bound 0.6em + 8px covers the ink measured later by measureTextMasks; large text still takes 2em as before.
  const maskHiddenY = (_, line) => {
    const size = Number.parseFloat(getComputedStyle(line).fontSize) || 16;
    const mask = line.parentElement;
    if (!mask?.matches(textMaskSelector)) return 2 * size;
    mask.classList.add("is-text-masked");
    const reach = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--text-shadow-reach"),
    ) || 0;
    return Math.max(2 * size, mask.offsetHeight + 0.6 * size + 8 + reach);
  };
  // Text back in place: reopen the shadow zone below the mask, the shadow fades in over 0.6s (owner 2026-10-26).
  const openTextMask = (line) => {
    const mask = line.parentElement;
    if (!mask?.classList.contains("is-text-masked")) return;
    mask.classList.remove("is-text-masked");
    mask.animate([{ textShadow: "none" }, {}], { duration: 600, easing: "ease-out" });
  };
  // onComplete of the reveal tween.
  function openTextMasks() {
    this.targets().forEach(openTextMask);
  }
  // Shared text motion (hero-typography spec, design-system motion.md). vars override the defaults; vars.from turns the tween into fromTo.
  const revealLines = (lines, { from, ...vars } = {}) => {
    const to = { y: "-0.1em", duration: 1.9, ease: "power4.out", stagger: 0.1, onComplete: openTextMasks, ...vars };
    return from ? gsap.fromTo(lines, from, to) : gsap.to(lines, to);
  };
  const revealWords = (words, vars = {}) =>
    gsap.to(words, { opacity: 1, duration: 1, ease: "expo.out", stagger: 0.2, ...vars });
  // Calls callback(target) the first time each element intersects, then stops watching it. Returns the observer for cleanup.
  const onceInView = (elements, callback, options) => {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      callback(entry.target);
      observer.unobserve(entry.target);
    }), options);
    elements.forEach((element) => element && observer.observe(element));
    return observer;
  };
  // Motto (page-home R7): the ink of a character in the column of the adjacent line's image must be at least
  // max(0.1em, 6px) from the image; if short, only that pair of lines is spread. Ink per character is measured with canvas, text positions
  // are taken at the animation's end state (.heritage-line lifts 0.1em when motion is on).
  const fitHeritageGaps = () => {
    if (!maskContext) return false;
    const root = document.documentElement;
    const lift = root.classList.contains("motion-enabled") && !root.classList.contains("motion-fallback") ? 0.1 : 0;
    let changed = false;
    document.querySelectorAll(".heritage-rows").forEach((rowsRoot) => {
      const rows = [...rowsRoot.querySelectorAll(".heritage-row")];
      const before = rows.map((row) => row.style.cssText);
      rows.forEach((row) => {
        row.style.removeProperty("margin-top");
        row.style.removeProperty("row-gap");
      });
      const images = [];
      const inks = [];
      rows.forEach((row, rowIndex) => {
        row.querySelectorAll(".heritage-image").forEach((image) => {
          // Center from the rect, size from the layout box to drop the scale during reveal.
          const { left, top, width, height } = image.getBoundingClientRect();
          const dx = (width - image.offsetWidth) / 2;
          const dy = (height - image.offsetHeight) / 2;
          images.push({ row: rowIndex, left: left + dx, right: left + width - dx, top: top + dy, bottom: top + height - dy });
        });
        row.querySelectorAll(".heritage-text").forEach((mask) => {
          const line = mask.querySelector(".heritage-line");
          if (!line) return;
          const style = getComputedStyle(line);
          const fontSize = Number.parseFloat(style.fontSize);
          maskContext.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          // Drop the text line's running transform, replacing it with the final position.
          const shift = line.getBoundingClientRect().top - mask.getBoundingClientRect().top + lift * fontSize;
          const range = document.createRange();
          [...line.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).forEach((node) => {
            const text = node.textContent;
            for (let index = 0; index < text.length; index += 1) {
              if (!text[index].trim()) continue;
              range.setStart(node, index);
              range.setEnd(node, index + 1);
              const box = range.getBoundingClientRect();
              // Motto is always text-transform uppercase.
              const metrics = maskContext.measureText(text[index].toUpperCase());
              const baseline = box.top - shift + metrics.fontBoundingBoxAscent;
              const top = baseline - metrics.actualBoundingBoxAscent;
              inks.push({ row: rowIndex, left: box.left, right: box.right, top, bottom: baseline + metrics.actualBoundingBoxDescent });
            }
          });
        });
      });
      const marginAdd = rows.map(() => 0);
      const rowGapAdd = rows.map(() => 0);
      images.forEach((image) => {
        const fontSize = Number.parseFloat(getComputedStyle(rows[image.row]).fontSize);
        // +1px for the antialiased edge of the diacritic.
        const need = Math.max(0.1 * fontSize, 6) + 1;
        inks.forEach((ink) => {
          if (ink.right <= image.left || ink.left >= image.right) return;
          const below = ink.top + ink.bottom > image.top + image.bottom;
          const add = need - (below ? ink.top - image.bottom : image.top - ink.bottom);
          if (add <= 0) return;
          const upper = below ? image.row : ink.row;
          const lower = below ? ink.row : image.row;
          // Same row is a wrapped line on phone: spread the row's row-gap; different row: spread the lower row's margin.
          if (upper === lower) rowGapAdd[upper] = Math.max(rowGapAdd[upper], add);
          else if (lower === upper + 1) marginAdd[lower] = Math.max(marginAdd[lower], add);
        });
      });
      rows.forEach((row, index) => {
        const style = getComputedStyle(row);
        if (marginAdd[index]) row.style.marginTop = `${Number.parseFloat(style.marginTop) + marginAdd[index]}px`;
        if (rowGapAdd[index]) row.style.rowGap = `${(Number.parseFloat(style.rowGap) || 0) + rowGapAdd[index]}px`;
        if (row.style.cssText !== before[index]) changed = true;
      });
    });
    return changed;
  };
  let textMaskFrame;
  let heroFitPending = false;
  // Merge calls in the same frame (font loadingdone, layout update, page change) into one measure pass.
  // Layout update does not re-measure hero text (see fitHeroLines): measuring forces a whole-page style recalc, a long task when opening detail on phone.
  const scheduleTextMaskMeasurement = (fitHero = true) => {
    heroFitPending ||= Boolean(fitHero);
    if (textMaskFrame) return;
    textMaskFrame = window.requestAnimationFrame(() => {
      textMaskFrame = undefined;
      if (heroFitPending) fitHeroLines();
      heroFitPending = false;
      measureTextMasks();
      // When the motto line gap changes, page height changes: update smooth scroll and header tone.
      if (fitHeritageGaps()) requestLayoutUpdate();
    });
  };

  const translateTree = (root, language) => {
    const textNodes = [
      ...(root.matches?.("[data-en]") ? [root] : []),
      ...root.querySelectorAll("[data-en]"),
    ];
    textNodes.forEach((node) => {
      if (!originalText.has(node)) {
        originalText.set(node, node.dataset.vi ?? node.textContent.trim());
      }
      node.textContent =
        language === "en" ? node.dataset.en : node.dataset.vi ?? originalText.get(node);
    });
    [
      ["aria-label", "enAriaLabel"],
      ["alt", "enAlt"],
      ["content", "enContent"],
      // Advertising cluster page link: the EN slug differs from the VI slug so it cannot be changed with just the locale prefix.
      ["href", "enHref"],
    ].forEach(([attribute, dataKey]) => {
      const nodes = [
        ...(root.matches?.(`[data-en-${attribute}]`) ? [root] : []),
        ...root.querySelectorAll(`[data-en-${attribute}]`),
      ];
      nodes.forEach((node) => {
        let values = originalAttributes.get(node);
        if (!values) {
          values = new Map();
          originalAttributes.set(node, values);
        }
        const viDataKey = `vi${dataKey.slice(2)}`;
        if (!values.has(attribute)) {
          values.set(
            attribute,
            node.dataset[viDataKey] ?? node.getAttribute(attribute),
          );
        }
        node.setAttribute(
          attribute,
          language === "en"
            ? node.dataset[dataKey]
            : node.dataset[viDataKey] ?? values.get(attribute),
        );
      });
    });
  };

  const updateLanguageControls = () => {
    document.querySelectorAll("[data-language-option]").forEach((link) => {
      const active = link.dataset.languageOption === currentLanguage;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  };

  const applyLanguage = (language, persist = true, translate = true) => {
    currentLanguage = language === "en" ? "en" : "vi";
    if (translate) window.TruongThinhDetail?.revertSplitText?.();
    document.documentElement.lang = currentLanguage;
    if (translate) translateTree(document.documentElement, currentLanguage);
    updateLanguageControls();
    if (persist) {
      try {
        window.localStorage.setItem("tt-lang", currentLanguage);
      } catch {}
    }
    pageState?.smoothScroll?.update();
    window.dispatchEvent(
      new CustomEvent("languagechange", {
        detail: { language: currentLanguage },
      }),
    );
    scheduleTextMaskMeasurement();
    if (!translate) return Promise.resolve();
    return Promise.resolve(document.fonts?.ready)
      .catch(() => undefined)
      .then(() => window.TruongThinhDetail?.rebuildSplitText?.());
  };

  const setLanguageFromDocument = () => {
    const routeLocale = getRouteLocale();
    const translatedByServer = routeLocale === "vi" || routeLocale === "en";
    if (translatedByServer) {
      currentLanguage = routeLocale;
    } else {
      try {
        currentLanguage =
          window.localStorage.getItem("tt-lang") === "en" ? "en" : "vi";
      } catch {
        currentLanguage = "vi";
      }
    }
    applyLanguage(currentLanguage, false, !translatedByServer);
  };

  // Logo text, nav, hamburger change color immediately, no motion (owner 2026-11-09), both while scrolling and during page transitions.
  const colorHeader = (color) => {
    currentHeaderColor = color;
    header.querySelectorAll("#header-logo, .desktop-nav a, .menu-button").forEach((target) => target.style.setProperty("color", color));
    header.querySelectorAll(".menu-button line").forEach((target) => target.style.setProperty("stroke", color));
  };

  /**
   * @param {DOMRect | null} beforeRect
   */
  function playHeaderLockupScaleMotion(beforeRect) {
    if (
      reduceMotion ||
      !hasGsap ||
      !(headerLogo instanceof HTMLElement) ||
      !beforeRect
    ) {
      return;
    }
    const afterRect = headerLogo.getBoundingClientRect();
    const sizeChanged =
      Math.abs(beforeRect.width - afterRect.width) > 0.5 ||
      Math.abs(beforeRect.height - afterRect.height) > 0.5;
    if (!sizeChanged || afterRect.width <= 0 || afterRect.height <= 0) return;

    gsap.killTweensOf(headerLogo, "transform");
    // The logo's WAAPI intro covers the inline transform of FLIP; beforeRect already includes the intro scale.
    headerLogo.getAnimations()
      .filter((animation) => animation.effect?.getKeyframes().some((frame) => "transform" in frame))
      .forEach((animation) => animation.cancel());
    gsap.fromTo(
      headerLogo,
      {
        x: beforeRect.left - afterRect.left,
        y: beforeRect.top - afterRect.top,
        scaleX: beforeRect.width / afterRect.width,
        scaleY: beforeRect.height / afterRect.height,
        transformOrigin: "top left",
      },
      {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        duration: 0.3,
        ease: "expo.out",
        overwrite: "auto",
        clearProps: "transform",
      },
    );
  }

  const headerSlideTargets = () =>
    [...header.querySelectorAll(".desktop-nav, [data-menu-open] svg")].filter((el) => el instanceof Element);

  function playHeaderSlideMotion(before) {
    if (reduceMotion || !hasGsap || !before) return;
    before.forEach(([el, top]) => {
      const dy = top - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 0.5) return;
      gsap.fromTo(el, { y: dy }, { y: 0, duration: 0.3, ease: "expo.out", overwrite: "auto", clearProps: "y" });
    });
  }

  // Header background and border are drawn in ::before (style.css), running on the same 0.3s expo.out FLIP beat, transform only. The largest size of
  // the background: the largest logo is equidistant from the top and bottom edges (owner 2026-11-09), so when the header opens the background bottom sits lower than the
  // header bottom by exactly surfaceExtra. Collapse: the background starts at the largest size then shrinks with the logo and navbar. Open: white background and
  // ink text held (headerSurfaceHeld), the background stretches from the old height to the largest size; after 0.3s the background turns off and the text changes immediately, no fade.
  const surfaceExtra = () => {
    const top = Number.parseFloat(getComputedStyle(header).paddingTop) || 0;
    return headerLogo instanceof HTMLElement ? Math.max(0, 2 * top + headerLogo.offsetHeight - header.offsetHeight) : 0;
  };
  // killTweensOf(header, "--header-surface-shift") cannot catch a CSS-variable tween: keep a reference to stop the old tween,
  // otherwise the previous beat's onComplete releases the background in the middle of the new beat.
  let headerSurfaceTween;
  function playHeaderSurfaceMotion(heightBefore, extraBefore) {
    if (!hasGsap) return;
    headerSurfaceTween?.kill();
    headerSurfaceTween = undefined;
    header.style.removeProperty("--header-surface-shift");
    const from = heightBefore + extraBefore - header.offsetHeight;
    const to = header.classList.contains("is-collapsed") ? 0 : surfaceExtra();
    if (reduceMotion || Math.abs(from - to) < 0.5) {
      releaseHeaderSurface();
      return;
    }
    headerSurfaceTween = gsap.fromTo(
      header,
      { "--header-surface-shift": `${from}px` },
      {
        "--header-surface-shift": `${to}px`,
        duration: headerBeat,
        ease: "expo.out",
        onComplete: () => {
          header.style.removeProperty("--header-surface-shift");
          releaseHeaderSurface();
        },
      },
    );
  }

  const updateToneRanges = () => {
    if (!pageState) {
      toneRanges = [];
      return;
    }
    const scrollY = getPageScroll();
    toneRanges = [
      ...pageState.container.querySelectorAll("[data-header-tone]"),
    ].map((section) => {
      const rect = section.getBoundingClientRect();
      return {
        bottom: rect.bottom + scrollY,
        section,
        top: rect.top + scrollY,
      };
    });
  };

  const showHeader = () => {
    header.classList.remove("is-hidden");
    headerOffset = 0;
    header.style.removeProperty("transform");
  };

  // Header beat (brand.md Motion): logo FLIP, navbar and background run together on 0.3s expo.out; background, border, text change immediately at the start
  // of the beat and the mark flips at the same time (owner 2026-11-09). A tone change without collapse (white-background section): the mark flips after 0.1s,
  // 0.1s is also the nav stagger beat during the intro.
  const headerBeat = 0.3;
  const headerSettle = 0.1;
  // Header collapsing or opening: the mark flips immediately (updateHeader sets 0).
  let headerMarkLeadFor = headerSettle;
  // Opening: white background, border, ink text held until the 0.3s beat ends (playHeaderSurfaceMotion releases).
  let headerSurfaceHeld = false;
  let headerSurfaceLast = [false, false];
  const paintHeaderSurface = (ink, collapsed) => {
    headerSurfaceLast = [ink, collapsed];
    const surface = collapsed || headerSurfaceHeld;
    header.classList.toggle("is-ink", ink || headerSurfaceHeld);
    header.classList.toggle("is-logo-ink", collapsed);
    header.classList.toggle("is-surface", surface);
    const color = ink || headerSurfaceHeld ? "#2f2f2f" : "#ffffff";
    if (color !== currentHeaderColor) colorHeader(color);
  };
  function releaseHeaderSurface() {
    if (!headerSurfaceHeld) return;
    headerSurfaceHeld = false;
    paintHeaderSurface(...headerSurfaceLast);
  }
  const updateHeader = (scrollY = getPageScroll()) => {
    const routeTransitionActive =
      document.body.classList.contains("is-transitioning") ||
      document.documentElement.classList.contains("route-enter");
    const probeY = scrollY + Math.min(80, window.innerHeight * 0.12);
    const activeSection = toneRanges.find(
      ({ top, bottom }) => top <= probeY && bottom > probeY,
    )?.section;
    // Advertising photo detail has no hero so the header is always collapsed (advertising-detail R10).
    const collapsed = scrollY > 100 || document.body.classList.contains("is-detail");
    // The page's own tone, ignoring the route pin layer; playRouteEnter reads it to change the mark when the veil opens.
    pageHeaderInk = collapsed || activeSection?.dataset.headerTone === "ink";
    // Soft route (routeMarkHeld): veil tone only while the veil fully covers; direct entry: until the destination page is ready.
    const ink = (routeTransitionActive && (routeMarkHeld ? routeVeilInk : !routeDestinationReady)) || pageHeaderInk;
    const collapsedChanged =
      lastHeaderCollapsed !== undefined && lastHeaderCollapsed !== collapsed;
    const logoBeforeRect =
      collapsedChanged && headerLogo instanceof HTMLElement
        ? headerLogo.getBoundingClientRect()
        : null;
    // Padding changes immediately (no layout transition); nav and menu button slide by transform from the old position.
    const slideBefore = collapsedChanged ? headerSlideTargets().map((el) => [el, el.getBoundingClientRect().top]) : null;
    const heightBefore = collapsedChanged ? header.offsetHeight : 0;
    const extraBefore = collapsedChanged ? surfaceExtra() : 0;
    header.classList.toggle("is-collapsed", collapsed);
    // Collapse (owner 2026-11-09): background, border and text color change once right when the logo FLIP and navbar start running, no fade;
    // the background shows at the old height then shrinks with the logo and navbar over 0.3s (playHeaderSurfaceMotion). Open: white background, ink text held and stretching
    // with the navbar over 0.3s, turning off only when the beat ends. In both directions the mark flips right at the start.
    if (collapsedChanged) headerSurfaceHeld = !collapsed && hasGsap && !reduceMotion && header.classList.contains("is-surface");
    paintHeaderSurface(ink, collapsed);
    if (collapsedChanged) headerMarkLeadFor = 0;
    if (!routeMarkHeld && (activeSection || routeTransitionActive || collapsed)) {
      syncHeaderBrandSurface(ink);
    }
    headerMarkLeadFor = headerSettle;
    if (collapsedChanged) {
      headerFollowStale = true;
      playHeaderLockupScaleMotion(logoBeforeRect);
      playHeaderSlideMotion(slideBefore);
      playHeaderSurfaceMotion(heightBefore, extraBefore);
    }
    lastHeaderCollapsed = collapsed;

    const pageHeight = document.documentElement.scrollHeight;
    const maxScroll = Math.max(0, pageHeight - window.innerHeight);
    // Floating CTA only on the first screen: the end of each page already has its own Zalo button (home invitation,
    // `.detail-cta`) so the floating button does not repeat there (owner 12/10). Also hidden when the footer enters the
    // viewport (short pages like 404) so the footer does not have to reserve a button lane.
    const footerTop =
      toneRanges.find(({ section }) => section.classList.contains("site-footer"))?.top ?? Infinity;
    const nextCtaShown = scrollY <= window.innerHeight && scrollY + window.innerHeight <= footerTop;
    if (nextCtaShown !== pageState?.floatingCtaShown) {
      if (pageState) pageState.floatingCtaShown = nextCtaShown;
      floatingCta?.classList.toggle("show", nextCtaShown);
    }
    if (pageState?.scrollCue instanceof HTMLElement) {
      const cueHidden = scrollY > 200;
      pageState.scrollCue.classList.toggle("is-hidden", cueHidden);
      pageState.scrollCue.tabIndex = cueHidden ? -1 : 0;
    }

    const follow = headerFollowMedia.matches;
    const settledY = Math.max(0, Math.min(scrollY, maxScroll));
    if (follow !== header.classList.contains("is-follow")) {
      header.classList.toggle("is-follow", follow);
      showHeader();
    }
    if (routeTransitionActive) {
      showHeader();
    } else if (document.body.classList.contains("menu-open")) {
      // Scroll locked: do not count delta (phone-header-scroll R4).
    } else if (follow) {
      // Offset exactly equals the scroll distance, clamped to [0, header height] and no more than scrollY;
      // when scrolling stops it stays as is (phone-header-scroll R2, R3).
      if (headerFollowStale) {
        // Re-measure the height; a header that is fully hidden stays fully hidden at the new height.
        const height = header.offsetHeight;
        if (headerOffset >= headerFollowHeight) headerOffset = height;
        headerFollowHeight = height;
        headerFollowStale = false;
      }
      headerOffset = Math.min(
        Math.max(0, Math.min(headerOffset + settledY - lastScrollY, headerFollowHeight)),
        settledY,
      );
      if (headerOffset) header.style.transform = `translateY(${-headerOffset}px)`;
      else header.style.removeProperty("transform");
    } else {
      const isMiddle =
        scrollY > window.innerHeight * 0.5 &&
        scrollY < pageHeight - window.innerHeight * 1.25;
      if (!isMiddle) header.classList.remove("is-hidden");
      const direction =
        scrollY > lastScrollY + 1
          ? "down"
          : scrollY < lastScrollY - 1
            ? "up"
            : lastDirection;
      if (direction && direction !== lastDirection) {
        directionStartY = scrollY;
        lastDirection = direction;
      }
      if (isMiddle && direction === "down" && scrollY - directionStartY > 150) {
        header.classList.add("is-hidden");
      } else if (isMiddle && direction === "up" && directionStartY - scrollY > 150) {
        header.classList.remove("is-hidden");
      }
    }
    lastScrollY = settledY;
    ticking = false;
  };

  const requestHeaderUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => updateHeader());
  };
  const headerMark = header.querySelector(".brand-lockup__mark");
  const headerMarkPaths = [...(headerMark?.querySelectorAll("path") || [])];
  const markBlack = headerMarkPaths.map(() => "rgb(43, 42, 41)");
  let headerMarkFlip;
  // Flip axis of each strip: the midpoint of the strip's foot segment, in path coordinates. The line through this point parallel to the triangle's left edge
  // also passes through the midpoint of the strip's right edge. Cached by `d` because snapBrandMark may rebuild the path.
  const bandAxis = new Map();
  const readBandAxis = (path) => {
    const d = path.getAttribute("d");
    if (!bandAxis.has(d)) {
      const length = path.getTotalLength();
      const points = Array.from({ length: 97 }, (_, step) => path.getPointAtLength((length * step) / 96));
      const base = Math.max(...points.map((point) => point.y));
      const foot = points.filter((point) => base - point.y < 0.5).map((point) => point.x);
      bandAxis.set(d, [(Math.min(...foot) + Math.max(...foot)) / 2, base]);
    }
    return bandAxis.get(d);
  };
  // Currently displayed color of each strip mid-flip: a strip whose new face has just turned out takes the new color, otherwise the old one.
  const readFlipFaces = () => headerMarkFlip.bands.map(({ front, back }) => {
    const timing = front.getAnimations()[0]?.effect.getComputedTiming();
    return timing && timing.progress !== null && timing.progress < 1 ? front.dataset.fill : back.dataset.fill;
  });
  const stopHeaderMarkFlip = () => {
    if (!headerMarkFlip) return;
    headerMarkFlip.root.remove();
    headerMark.style.removeProperty("visibility");
    headerMarkFlip = undefined;
  };
  // Remove the flip layer when all faces finish running. Each rewind increments `gen`, and the old wait is ignored.
  // Flip done: remove the flip layer, or if midway the target color switches to a third color (`flip.next`), flip on from the color just reached,
  // after the header beat of that change ends.
  const advanceHeaderMarkFlip = (flip) => {
    if (headerMarkFlip !== flip) return;
    const next = flip.next;
    if (!next) {
      stopHeaderMarkFlip();
      return;
    }
    const wait = next.at - performance.now();
    if (wait > 0 && hasGsap) {
      gsap.delayedCall(wait / 1000, () => advanceHeaderMarkFlip(flip));
      return;
    }
    stopHeaderMarkFlip();
    flipHeaderMark(flip.dest, next.target, next.backward);
  };
  const settleHeaderMarkFlip = (flip) => {
    const gen = flip.gen;
    Promise.all(flip.animations.map((animation) => animation.finished)).then(
      () => flip.gen === gen && advanceHeaderMarkFlip(flip),
      () => {},
    );
  };
  // A flip pass is a motion segment running forward (`front` to `back`, cyan first) or backward (`back` to `front`, black first).
  // Changing the target back to the other end mid-flip: rewind immediately from where it stands, like a tape rewind (owner 2026-11-09).
  const runHeaderMarkFlip = (flip, rate) => {
    flip.next = undefined;
    flip.dest = rate > 0 ? flip.back : flip.front;
    if (flip.animations[0].playbackRate === rate) return;
    flip.animations.forEach((animation) => animation.reverse());
    flip.gen += 1;
    settleHeaderMarkFlip(flip);
  };
  // Strip face shadow while tilted: color and maximum strength, reached when the face turns edge-on (90 degrees).
  const headerFlipShade = "#000";
  const headerFlipShadeMax = 0.5;
  // Build the flip layer and flip each strip from `from` to `target`. `backward` (to white): build the flip pass from `target` to `from`
  // then run backward from the end, so black flips first and cyan last, exactly white to CMYK rewound (owner 2026-11-09).
  const flipHeaderMark = (from, target, backward) => {
    const front = backward ? target : from;
    const back = backward ? from : target;
    // The flip layer frame coincides with the mark frame, computed as a % of #header-logo: the ratio does not depend on the running FLIP scale,
    // and when the header collapses or opens mid-flip the layer scales with the lockup instead of keeping the old size and overflowing the header.
    const logoRect = headerLogo.getBoundingClientRect();
    const markRect = headerMark.getBoundingClientRect();
    const box = headerMark.getBBox();
    const width = (markRect.width / logoRect.width) * headerLogo.offsetWidth;
    const percent = (value, whole) => `${(value / whole) * 100}%`;
    const root = document.createElement("span");
    root.className = "brand-lockup__mark-flip";
    root.setAttribute("aria-hidden", "true");
    Object.assign(root.style, {
      left: percent(markRect.left - logoRect.left, logoRect.width),
      top: percent(markRect.top - logoRect.top, logoRect.height),
      width: percent(markRect.width, logoRect.width),
      height: percent(markRect.height, logoRect.height),
    });
    // Each face has an extra shadow layer of the strip's shape: darkening as the face turns edge-on, brightening again as it turns toward the viewer (owner 2026-11-09:
    // a thin strip rotating about its vertical axis looks like a sweep, the shadow gives the eye depth). The shadow runs opacity only.
    const svg = (fill, d) => `<svg viewBox="${box.x} ${box.y} ${box.width} ${box.height}"><path fill="${fill}" d="${d}"/></svg>`;
    const face = (path, fill) => {
      const layer = document.createElement("span");
      layer.dataset.fill = fill;
      const d = path.getAttribute("d");
      layer.innerHTML = `${svg(fill, d)}<span>${svg(headerFlipShade, d)}</span>`;
      return layer;
    };
    const bands = headerMarkPaths.map((path, index) => {
      const [axisX, axisY] = readBandAxis(path);
      const origin = `${((axisX - box.x) / box.width) * 100}% ${((axisY - box.y) / box.height) * 100}%`;
      const band = document.createElement("span");
      // The perspective sits right on each strip's axis, the strip flips in place; perspective size follows the mark size.
      band.style.perspective = `${width * 6}px`;
      band.style.perspectiveOrigin = origin;
      const frontFace = face(path, front[index]);
      const backFace = face(path, back[index]);
      frontFace.style.transformOrigin = backFace.style.transformOrigin = origin;
      band.append(frontFace, backFace);
      root.append(band);
      return { front: frontFace, back: backFace };
    });
    // An SVG cannot contain an HTML layer; the flip layer sits inside #header-logo so it takes the same FLIP scale.
    headerLogo.prepend(root);
    headerMark.style.visibility = "hidden";
    const flip = { root, bands, front, back, dest: target, gen: 0, animations: [] };
    headerMarkFlip = flip;
    // Axis parallel to the triangle's left edge (up at 60 degrees). DOM: black, yellow, magenta, cyan; cyan flips first, each strip offset by 80ms.
    // All faces end at the pass's final mark (endDelay), so whether running backward from the end or rewinding midway the strips
    // keep exactly the 80ms offset, in reverse order.
    const total = (bands.length - 1) * 80 + 440;
    const turn = (angle) => `rotate3d(0.5, -0.866, 0, ${angle}deg)`;
    const shade = (layer, keyframes, timing) => flip.animations.push(layer.lastElementChild.animate(keyframes, timing));
    bands.forEach(({ front, back }, index) => {
      const delay = (bands.length - 1 - index) * 80;
      // The back face uses exactly the mirrored curve of the front face, same 220ms: running backward looks like running forward, no stall at the start of the pass.
      const frontTiming = { delay, duration: 220, endDelay: total - delay - 220, easing: "cubic-bezier(0.5, 0, 0.75, 0)", fill: "both" };
      const backTiming = { delay: delay + 220, duration: 220, endDelay: total - delay - 440, easing: "cubic-bezier(0.25, 1, 0.5, 1)", fill: "both" };
      shade(front, [{ opacity: 0 }, { opacity: headerFlipShadeMax }], frontTiming);
      shade(back, [{ opacity: headerFlipShadeMax }, { opacity: 0 }], backTiming);
      flip.animations.push(front.animate(
        [
          { transform: turn(0), opacity: 1 },
          { transform: turn(90), opacity: 1, offset: 0.999 },
          { transform: turn(90), opacity: 0 },
        ],
        frontTiming,
      ));
      flip.animations.push(back.animate(
        [
          { transform: turn(-90), opacity: 0 },
          { transform: turn(-90), opacity: 1, offset: 0.001 },
          { transform: turn(0), opacity: 1 },
        ],
        backTiming,
      ));
    });
    if (backward) flip.animations.forEach((animation) => animation.reverse());
    settleHeaderMarkFlip(flip);
  };
  let headerMarkLead;
  // Wait for the header beat to end before running `run`. `from`: the mark color on entering beat 1; if absent, the strips that are mid-flip
  // rest at their current angle while waiting.
  const leadHeaderMark = (className, run, from) => {
    // Not waiting for the beat (veil fully covering or starting to open): flip immediately in this frame.
    if (!hasGsap || !headerMarkLeadFor) {
      run();
      return;
    }
    const call = gsap.delayedCall(headerMarkLeadFor, () => {
      if (headerMarkLead?.call === call) headerMarkLead = undefined;
      run();
    });
    headerMarkLead = { className, call, from };
  };
  // Change the mark color layer; each strip flips about the strip's vertical axis, parallel to the triangle's left edge, cyan first and black last (brand.md Motion).
  // The four strips are separate HTML layers running only transform and opacity so the GPU runs them itself, and a busy main thread while scrolling does not cause jank.
  // `tween`: each strip tweens its color instead of flipping (direction change within beat 1). Page transitions always flip (logo-route-crossfade).
  const paintHeaderMark = (
    className,
    { from = headerMarkPaths.map((path) => getComputedStyle(path).fill), rise = true, tween } = {},
  ) => {
    const flipping = headerMarkFlip;
    const leading = headerMarkLead;
    // Waiting for the header beat to end to flip to exactly this color: keep waiting.
    if (leading && rise && !tween && leading.className === className) return;
    if (leading) {
      leading.call.kill();
      headerMarkLead = undefined;
    }
    header.classList.remove("is-brand-color", "is-brand-inverse");
    header.classList.add(className);
    // Stop the running color tween and remove the inline fill before reading the target color by class.
    if (hasGsap) gsap.killTweensOf(headerMarkPaths);
    headerMarkPaths.forEach((path) => path.style.removeProperty("fill"));
    const target = headerMarkPaths.map((path) => getComputedStyle(path).fill);
    const same = (colors) => colors.every((color, index) => color === target[index]);
    if (leading?.from && rise && !tween && !reduceMotion) {
      // Direction change within beat 1, flip layer not yet built: back to the color at beat entry, the mark just tweens back to the same text, no flip;
      // to a different color, treat beat 1 as not having run and flip from the old color.
      if (same(leading.from)) tween = { duration: headerBeat, ease: "expo.out" };
      else from = leading.from;
    }
    // To white runs backward, black flips first (owner 2026-11-09); to another color runs forward, cyan first.
    const backward = className === "is-brand-inverse";
    // Mid-flip and the target is one end of the flip pass: run forward or rewind from where it stands (if the target is approaching, keep flipping).
    // To a third color: the running pass finishes flipping, then flips on to that color after the header beat of this change.
    if (flipping && rise && !tween && !reduceMotion) {
      const rate = same(flipping.back) ? 1 : same(flipping.front) ? -1 : 0;
      if (rate) runHeaderMarkFlip(flipping, rate);
      else flipping.next = { target, at: performance.now() + headerMarkLeadFor * 1000, backward };
      return;
    }
    // Page transition or immediate draw while flipping: the old layer is the currently displayed face of each strip.
    if (flipping) from = readFlipFaces();
    stopHeaderMarkFlip();
    if (tween && hasGsap && !reduceMotion && headerMark) {
      // Same color means no motion. A linear fill tween between two solid colors of the same shape is exactly a crossfade of two layers.
      if (same(from)) return;
      gsap.fromTo(
        headerMarkPaths,
        { fill: (index) => from[index] },
        { fill: (index) => target[index], ...tween, clearProps: "fill" },
      );
      return;
    }
    if (!rise || reduceMotion || !headerMark || !(headerLogo instanceof HTMLElement)) return;
    // Mark already the right color (for example CMYK when clicking a link on a white background): no flip.
    if (same(from)) return;
    // Beat 1: the mark keeps its old color; beat 2: the header is visually done, the strips flip straight to the target color.
    headerMarkPaths.forEach((path, index) => path.style.setProperty("fill", from[index]));
    leadHeaderMark(className, () => {
      headerMarkPaths.forEach((path) => path.style.removeProperty("fill"));
      flipHeaderMark(from, target, backward);
    }, from);
  };
  function syncHeaderBrandSurface(whiteSurface) {
    if (whiteSurface) {
      if (lastHeaderWhiteSurface === undefined) {
        // Opening a page on a white background: CMYK grows over the black layer.
        paintHeaderMark("is-brand-color", { from: markBlack });
      } else if (
        lastHeaderWhiteSurface !== true ||
        !header.classList.contains("is-brand-color")
      ) {
        paintHeaderMark("is-brand-color");
      }
    } else if (
      lastHeaderWhiteSurface !== false ||
      !header.classList.contains("is-brand-inverse")
    ) {
      // Opening a page on an image background: draw white immediately, no motion.
      paintHeaderMark("is-brand-inverse", { rise: lastHeaderWhiteSurface !== undefined });
    }
    lastHeaderWhiteSurface = whiteSurface;
  };
  const prepareRouteDestination = (container) => {
    routeDestinationReady = true;
    const destinationWhiteSurface =
      container?.querySelector("[data-header-tone]")?.dataset.headerTone === "ink";
    // A soft route keeps the CMYK mark under the veil and changes to the destination page's tone when the veil opens (playRouteEnter).
    if (!routeMarkHeld) syncHeaderBrandSurface(destinationWhiteSurface);
    return destinationWhiteSurface;
  };
  const releaseHeaderInteractionState = () => {
    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      header.contains(activeElement)
    ) {
      activeElement.blur();
    }
    header.classList.remove("forceShow");
  };
  const pinHeaderForRoute = () => {
    header.style.transitionDuration = "0s";
    header.classList.remove("is-hidden");
    header.classList.add("is-route-pinned");
    routeDestinationReady = false;
    // On click, text and mark keep their color; they change when the veil fully covers (inkRouteHeader).
    routeMarkHeld = true;
    routeVeilInk = false;
    void header.offsetHeight;
    header.style.removeProperty("transition-duration");
  };
  let layoutUpdateFrame;
  const requestLayoutUpdate = () => {
    if (layoutUpdateFrame) return;
    layoutUpdateFrame = window.requestAnimationFrame(() => {
      layoutUpdateFrame = undefined;
      headerFollowStale = true;
      measureDesktopNav();
      pageState?.smoothScroll?.update();
      updateToneRanges();
      updateHeader();
      scheduleTextMaskMeasurement(false);
    });
  };

  // Locomotive emits "scroll" synchronously in update()/scrollTo() with the old y; the header following that y would collapse then switch back
  // in the same task and run the logo FLIP even though the end state is unchanged (photo view returning to masonry via navbar, owner 2026-11-08).
  // setPageScroll itself calls updateHeader with the target y at the end.
  let pageScrollSetting = false;
  const setPageScroll = (state, scrollY, { instant = false } = {}) => {
    const target = Math.max(0, Number(scrollY) || 0);
    // Going to the top needs no clamp: it does not read scrollHeight, so it does not force layout in the task that calls it.
    const nextScroll = target && Math.min(
      target,
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    );
    state.smoothScrollY = nextScroll;
    if (state.smoothScroll) try {
      pageScrollSetting = true;
      // Without passing behavior, `html { scroll-behavior: smooth }` slides native scroll off toward 0 over many frames;
      // Chrome ignores newly set inline style with scrollTo(0, 0) because it does not update style for this coordinate.
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      // Navigating by query can replace a short detail with a much taller grid.
      state.smoothScroll.update();
      state.smoothScroll.scrollTo(nextScroll, {
        duration: 0,
        disableLerp: true,
      });
      // Locomotive 4.1.4 may defer a zero-duration scroll by one more frame.
      if (instant) state.smoothScroll.setScroll(0, nextScroll);
      state.smoothScroll.update();
    } finally {
      pageScrollSetting = false;
    } else {
      window.scrollTo({ top: nextScroll, left: 0, behavior: instant ? "instant" : "auto" });
    }
    lastScrollY = nextScroll;
    // An instant scroll to the top (opening Advertising detail) measures the header in the next frame, before paint, so the new page's style and layout
    // run only once instead of being forced again in the card-tap task (decision phone-frame-budget).
    if (instant && !nextScroll && !state.smoothScroll) {
      cancelAnimationFrame(state.headerSyncFrame);
      state.headerSyncFrame = requestAnimationFrame(() => {
        updateToneRanges();
        updateHeader(getPageScroll());
      });
      return;
    }
    updateToneRanges();
    updateHeader(nextScroll);
  };
  let logicalScrollLock;
  const viewportProbe = document.querySelector(".site-viewport-metrics") || document.createElement("div");
  viewportProbe.className = "site-viewport-metrics";
  viewportProbe.setAttribute("aria-hidden", "true");
  if (!viewportProbe.isConnected) document.body.append(viewportProbe);
  // Resolve native CSS viewport units; displayed measurements never own persistent geometry.
  const getViewportMetrics = () => {
    const visible = window.visualViewport;
    return {
      layoutWidth: document.documentElement.clientWidth,
      layoutHeight: viewportProbe.getBoundingClientRect().height || window.innerHeight,
      visible: {
        width: visible?.width ?? window.innerWidth,
        height: visible?.height ?? window.innerHeight,
        left: visible?.offsetLeft ?? 0,
        top: visible?.offsetTop ?? 0,
        scale: visible?.scale ?? 1,
      },
    };
  };
  window.TruongThinhMotion = {
    maskHiddenY,
    openTextMask,
    revealLines,
    revealWords,
    onceInView,
    getLogicalScroll: getPageScroll,
    getViewportMetrics,
    lockLogicalScroll() {
      if (logicalScrollLock) return logicalScrollLock.scrollY;
      logicalScrollLock = {
        bodyOverflow: document.body.style.overflow,
        htmlOverflow: document.documentElement.style.overflow,
        scrollY: getPageScroll(),
      };
      pageState?.smoothScroll?.stop?.();
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return logicalScrollLock.scrollY;
    },
    setLogicalScroll(scrollY) {
      if (!pageState) return false;
      setPageScroll(pageState, scrollY, { instant: true });
      return true;
    },
    unlockLogicalScroll(scrollY = logicalScrollLock?.scrollY) {
      if (!logicalScrollLock) return false;
      const lock = logicalScrollLock;
      logicalScrollLock = undefined;
      document.body.style.overflow = lock.bodyOverflow;
      document.documentElement.style.overflow = lock.htmlOverflow;
      pageState?.smoothScroll?.start?.();
      if (pageState) setPageScroll(pageState, scrollY, { instant: true });
      return true;
    },
  };

  const initSmoothScroll = (state, scrollY) => {
    if (
      reduceMotion ||
      !smoothMedia.matches ||
      document.body.classList.contains("menu-open") ||
      typeof window.LocomotiveScroll === "undefined"
    ) {
      document.documentElement.classList.remove("has-scroll-smooth");
      window.scrollTo({ top: scrollY, behavior: "instant" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    // News R2: the sticky mark is read when smooth is enabled (always from 981px) so it does not drift when the header height changes with the breakpoint.
    const newsMain = state.container.querySelector(".blk-news-list__main[data-scroll-sticky]");
    if (newsMain) {
      const stickyTop = Math.round(Number.parseFloat(getComputedStyle(newsMain).top) || 0);
      newsMain.setAttribute("data-scroll-offset", `${-stickyTop},${stickyTop}`);
    }
    state.smoothScroll = new window.LocomotiveScroll({
      el: state.container,
      smooth: true,
      lerp: 0.085,
      multiplier: 0.9,
      smartphone: { smooth: false },
      tablet: { smooth: false, breakpoint: 981 },
    });
    // Locomotive 4.1.4 drops the keyboard's start timestamp and only sets a flag for stop().
    const smooth = state.smoothScroll;
    const core = smooth.scroll;
    if (core.scrollbarThumb) {
      let thumbMoveFrame;
      const cancelThumbMove = () => {
        window.cancelAnimationFrame(thumbMoveFrame);
        thumbMoveFrame = undefined;
      };
      // Replacing the vendor RAF has no guard at the instance boundary; keep a single input path.
      window.removeEventListener("mousemove", core.moveScrollBar);
      core.moveScrollBar = (event) => {
        if (core.stop || !core.isDraggingScrollbar) return;
        cancelThumbMove();
        thumbMoveFrame = window.requestAnimationFrame(() => {
          thumbMoveFrame = undefined;
          if (core.stop || !core.isDraggingScrollbar) return;
          const { clientY } = event;
          const { top } = core.scrollbarBCR;
          const y = clientY - top;
          // The final CSS pixel reached must hit the document limit.
          core.instance.delta.y = Math.max(0, Math.min(core.instance.limit.y,
            y >= core.scrollbarHeight - 1 ? core.instance.limit.y
              : y / core.scrollbarHeight * core.instance.limit.y));
        });
      };
      window.addEventListener("mousemove", core.moveScrollBar);
      // When the vendor releases the thumb it stops the lerp loop even though it has not reached the target: the page stands midway, and the next wheel notch slides the whole
      // remaining distance as a jump. The listener registers after the vendor's releaseScrollBar so it runs after it; keep sliding to the target.
      const glideAfterThumbRelease = () => {
        if (core.stop || core.isScrolling || core.isDraggingScrollbar) return;
        if (Math.abs(core.instance.delta.y - core.instance.scroll.y) >= 0.5) core.startScrolling();
      };
      window.addEventListener("mouseup", glideAfterThumbRelease);
      const checkScroll = core.checkScroll.bind(core);
      const updateDelta = core.updateDelta.bind(core);
      core.updateDelta = (event) => {
        if (!core.stop) updateDelta(event);
      };
      const startScrolling = core.startScrolling.bind(core);
      core.startScrolling = () => {
        if (!core.stop) startScrolling();
      };
      core.checkScroll = (forced = false) => {
        if (core.stop && !forced) return;
        if (core.isScrolling && core.startScrollTs === undefined) {
          core.startScrollTs = Date.now();
        }
        checkScroll(forced);
      };
      const stop = smooth.stop.bind(smooth);
      smooth.stop = () => {
        const { x, y } = core.instance.scroll;
        stop();
        cancelThumbMove();
        core.releaseScrollBar();
        core.stopScrolling();
        core.hasScrollTicking = false;
        core.animatingScroll = false;
        core.setScroll(x, y);
      };
      const start = smooth.start.bind(smooth);
      smooth.start = () => {
        // Drop the thumb-move callback queued right before the overlay lock.
        core.instance.delta = { ...core.instance.scroll };
        start();
      };
      const blockLockedThumb = (event) => {
        if (!core.stop) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      core.scrollbarThumb.addEventListener("mousedown", blockLockedThumb,
        { capture: true, signal: state.abort.signal });
      const destroy = smooth.destroy.bind(smooth);
      smooth.destroy = () => {
        cancelThumbMove();
        window.removeEventListener("mouseup", glideAfterThumbRelease);
        core.scrollbarThumb.removeEventListener("mousedown", blockLockedThumb, true);
        destroy();
      };
    }
    state.smoothScroll.on("scroll", ({ scroll }) => {
      state.smoothScrollY = scroll.y;
      window.dispatchEvent(
        new CustomEvent("site:scroll", { detail: { y: scroll.y } }),
      );
      if (!pageScrollSetting) updateHeader(scroll.y);
    });
    state.smoothScroll.update();
    if (logicalScrollLock) state.smoothScroll.stop();
  };

  const clearSmoothScrollStyles = (state, keepNativeHidden = false) => {
    document.documentElement.classList.remove(
      "has-scroll-init",
      "has-scroll-scrolling",
      "has-scroll-dragging",
    );
    // Between two pages (route), keep has-scroll-smooth's overflow hidden until the new page re-inits:
    // otherwise the native scrollbar shows for a few frames then hides, and the layout jerks by one scrollbar width.
    document.documentElement.classList.toggle("has-scroll-smooth", keepNativeHidden);
    state.container.style.removeProperty("transform");
    state.container.style.removeProperty("will-change");
    state.container.querySelectorAll("[data-scroll]").forEach((element) => {
      element.style.removeProperty("transform");
      element.style.removeProperty("will-change");
    });
    document.body.style.removeProperty("height");
    // html has scroll-behavior: smooth; restoring position must be instant, otherwise scrollY slides gradually from 0 and
    // the next mode change (fast resize across the 981px mark) misreads a mid-slide position.
    // Read the latest position on every call: cleanup frames run after destroy, when the viewer may have reset the scroll.
    window.scrollTo({ top: state.smoothScrollY, behavior: "instant" });
  };

  const destroySmoothScroll = (state, { keepNativeHidden = false } = {}) => {
    keepNativeHidden &&= Boolean(state.smoothScroll);
    if (state.smoothScroll) {
      state.smoothScroll.stop();
      state.smoothScroll.destroy();
      state.smoothScroll = undefined;
    }
    clearSmoothScrollStyles(state, keepNativeHidden);

    let cleanupFrames = 2;
    const finishNativeCleanup = () => {
      if (
        state.smoothScroll ||
        state.abort.signal.aborted ||
        !state.container.isConnected
      ) {
        return;
      }
      clearSmoothScrollStyles(state, keepNativeHidden);
      cleanupFrames -= 1;
      if (cleanupFrames > 0) {
        window.requestAnimationFrame(finishNativeCleanup);
      }
    };
    window.requestAnimationFrame(finishNativeCleanup);
  };

  const hydrateDeferredHeroImages = (state) => {
    state.container
      .querySelectorAll(".hero-slide img[data-src]")
      .forEach((image) => {
        // The build-time <picture> wrapper carries the deferred variant as data-srcset.
        [...image.parentElement.querySelectorAll(":scope > source"), image].forEach((node) => {
          if (!node?.dataset.srcset) return;
          node.srcset = node.dataset.srcset;
          node.removeAttribute("data-srcset");
        });
        image.src = image.dataset.src;
        image.removeAttribute("data-src");
      });
  };

  // The waiting shimmer stops when the frame leaves the viewport; a settled frame is no longer watched (media-delivery R6).
  const pauseOffscreenMediaSweeps = (state) => {
    const observer = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
      if (target.classList.contains("is-media-settled")) observer.unobserve(target);
      else target.classList.toggle("is-media-offscreen", !isIntersecting);
    }));
    state.container
      .querySelectorAll('.media-frame:not(.is-media-settled)')
      .forEach((frame) => observer.observe(frame));
    state.abort.signal.addEventListener("abort", () => observer.disconnect(), { once: true });
  };

  // Header intro (logo, menu items, menu button) runs with WAAPI on the compositor: the mount's long task and text measurement right after
  // load do not stall the logo (decision phone-frame-budget). GSAP's power4.out is sampled into linear(), with the same
  // duration, delay and stagger as the old GSAP timeline; a browser without linear() still runs the GSAP timeline.
  const compositorEase = window.CSS?.supports?.("animation-timing-function", "linear(0, 1)")
    ? `linear(${Array.from({ length: 41 }, (_, index) => (1 - (1 - index / 40) ** 5).toFixed(4)).join(", ")})`
    : "";
  // The same timeline API that mount and route use: play, paused, progress(1) to jump to the end, kill.
  const createHeaderIntro = () => {
    const toggle = header.querySelector("#header-toggle-svg");
    if (toggle) toggle.style.transformOrigin = "center";
    const steps = [
      [headerLogo, [{ transform: "scale(0)" }, { transform: "none" }], 0, 1500],
      ...[...header.querySelectorAll("#header-menu-items > ul > li")]
        .map((item, index) => [item, [{ transform: "translateY(-150px)" }, { transform: "none" }], 300 + index * 100, 1500]),
      [toggle, [{ transform: "scaleX(0)" }, { transform: "none" }], 1500, 1000],
    ].filter(([node]) => node);
    // fill backwards holds the initial value while waiting like GSAP's from(); when done it returns to the original style.
    const animations = steps.map(([node, keyframes, delay, duration]) => {
      const animation = node.animate(keyframes, { delay, duration, easing: compositorEase, fill: "backwards" });
      animation.pause();
      return animation;
    });
    let paused = true;
    return {
      paused: () => paused,
      play: () => {
        paused = false;
        animations.forEach((animation) => animation.play());
      },
      progress: () => animations.forEach((animation) => animation.finish()),
      kill: () => animations.forEach((animation) => animation.cancel()),
    };
  };

  const mountPageMotion = (state, softNavigation, settledStartup = false) => {
    const clientLogoTrack = state.container.querySelector(
      ".client-logo-marquee__track",
    );
    const scrollCue = state.container.querySelector("[data-scroll-cue]");
    const scrollTarget = state.hero?.nextElementSibling;
    state.scrollCue = scrollCue;
    scrollCue?.addEventListener(
      "click",
      () => {
        if (!(scrollTarget instanceof HTMLElement)) return;
        if (state.smoothScroll) {
          state.smoothScroll.scrollTo(scrollTarget, {
            duration: reduceMotion ? 0 : 900,
            disableLerp: reduceMotion,
          });
        } else {
          scrollTarget.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
          });
        }
      },
      { signal: state.abort.signal },
    );
    let clientLogoInView = false;
    const syncClientLogoMotion = () => {
      clientLogoTrack?.classList.toggle(
        "is-running",
        clientLogoInView &&
          !document.hidden &&
          !document.body.classList.contains("motion-paused"),
      );
    };
    const clientLogoObserver =
      clientLogoTrack && !reduceMotion
        ? new IntersectionObserver(([entry]) => {
            clientLogoInView = entry.isIntersecting;
            syncClientLogoMotion();
          })
        : null;
    clientLogoObserver?.observe(clientLogoTrack);
    if (!hasGsap || reduceMotion) {
      state.container.querySelector("[data-motion-toggle]")?.setAttribute("hidden", "");
      // Watch live preference changes so CSS and the motion runtime continue without a reload.
      const syncReducedPause = () =>
        document.body.classList.toggle(
          "motion-paused",
          !hasGsap || reduceMotionQuery.matches,
        );
      syncReducedPause();
      reduceMotionQuery.addEventListener("change", syncReducedPause, {
        signal: state.abort.signal,
      });
      document.addEventListener("visibilitychange", syncClientLogoMotion, {
        signal: state.abort.signal,
      });
      return () => clientLogoObserver?.disconnect();
    }
    document.body.classList.remove("motion-paused");
    const gsap = window.gsap;
    const observers = [];
    const timelines = new Set();
    let scrollCueSplit;
    const context = gsap.context(() => {
      const selectAll = (selector) => [...state.container.querySelectorAll(selector)];
      const revealItems = selectAll(".reveal");
      const revealGroups = selectAll(".legacy-copy h2");
      const legacyLabels = selectAll(".legacy-copy > p");
      const heritageTextMasks = selectAll(".heritage-text");
      const heritageImages = selectAll(".heritage-image");
      const portalCards = selectAll(".service-portal");
      const portalTitles = portalCards.map((card, index) => ({
        card,
        index,
        target:
          card.querySelector(".portal-title__quiet") ||
          card.querySelector(".portal-title-mask") ||
          card.querySelector(".portal-copy strong"),
        lines: card.querySelectorAll(".portal-line"),
      }));
      const portalSubtitles = portalCards.map((card) => ({
        card,
        target: card.querySelector(".portal-subtitle"),
      }));
      const projectTrack = state.container.querySelector(".project-track");
      const heroWords = selectAll(".hero-word");
      const heroLabels = selectAll("[data-hero-label]");
      const heroShade = state.hero?.querySelector(".hero-shade");
      const motionToggle = state.container.querySelector("[data-motion-toggle]");
      const scrollCueLabel = scrollCue?.querySelector("[data-scroll-cue-label]");
      const splitCueRoute = new Set([
        "advertising-products",
        "projects",
        "residential",
        "commercial",
      ]).has(state.container.dataset.barbaNamespace);
      let scrollCueTimeline;
      const buildScrollCueTimeline = () => {
        if (!(scrollCueLabel instanceof HTMLElement)) return;
        scrollCueTimeline?.kill();
        if (scrollCueTimeline) timelines.delete(scrollCueTimeline);
        // revert() restores the HTML from split time (old language); keep the text translateTree just set.
        const label = scrollCueLabel.textContent;
        scrollCueSplit?.revert();
        scrollCueLabel.textContent = label;
        const characters = splitCueRoute && SplitText
          ? (scrollCueSplit = SplitText.create(scrollCueLabel, {
              type: "chars",
              charsClass: "scroll-cue-char",
              aria: "auto",
            })).chars
          : [...scrollCueLabel.textContent].flatMap((character, index) => {
              if (index === 0) scrollCueLabel.replaceChildren();
              // Whitespace stays plain text, matching SplitText's char split on other routes.
              if (/\s/.test(character)) {
                scrollCueLabel.append(character);
                return [];
              }
              const item = document.createElement("span");
              item.className = "scroll-cue-char";
              item.textContent = character;
              scrollCueLabel.append(item);
              return item;
            });
        scrollCueTimeline = gsap
          .timeline({ delay: 3, repeat: -1, repeatDelay: 3 })
          .from(characters, {
            top: -20,
            opacity: 0,
            duration: 0.4,
            stagger: { each: 0.1 },
          })
          .to(characters, {
            top: 20,
            opacity: 0,
            duration: 0.4,
            delay: 3,
            stagger: { each: 0.1 },
          });
        timelines.add(scrollCueTimeline);
      };
      buildScrollCueTimeline();
      const heritageLines = heritageTextMasks
        .map((mask) => mask.querySelector(".heritage-line"))
        .filter(Boolean);
      if (settledStartup) {
        if (revealItems.length) gsap.set(revealItems, { opacity: 1, y: 0 });
        revealGroups.forEach((group) =>
          gsap.set(group.querySelectorAll(".line-mask > span"), { y: "-0.1em" }),
        );
        legacyLabels.forEach((label) => label.classList.add("is-inview"));
        if (heritageLines.length) gsap.set(heritageLines, { y: "-0.1em" });
        portalTitles.forEach(({ card, lines }) =>
          gsap.set(
            lines.length ? lines : card.querySelectorAll(".portal-copy strong"),
            { y: "-0.1em" },
          ),
        );
        heritageImages.forEach((image) => image.classList.add("is-inview"));
        portalSubtitles.forEach(({ card }) =>
          card.classList.add("is-subtitle-inview"),
        );
        projectTrack?.classList.add("is-inview");
        if (heroWords.length) gsap.set(heroWords, { opacity: 1 });
      } else {
        if (revealItems.length) gsap.set(revealItems, { opacity: 0, y: 60 });
        revealGroups.forEach((group) =>
          gsap.set(group.querySelectorAll(".line-mask > span"), { y: maskHiddenY }),
        );
        if (heritageLines.length) gsap.set(heritageLines, { y: maskHiddenY });
        portalTitles.forEach(({ card, lines }) =>
          gsap.set(
            lines.length ? lines : card.querySelectorAll(".portal-copy strong"),
            { y: maskHiddenY },
          ),
        );
      }

      // Settled startup shows everything at once, so no element is watched.
      const watch = (elements) => (settledStartup ? [] : elements);
      observers.push(
        onceInView(watch([...revealItems, ...revealGroups]), (target) => {
          if (target.matches(".reveal")) {
            gsap.to(target, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
            return;
          }
          revealLines(target.querySelectorAll(".line-mask > span"));
          target.closest(".legacy-copy")?.querySelector(":scope > p")?.classList.add("is-inview");
        }),
        onceInView(watch(heritageTextMasks), (mask) => {
          const line = mask.querySelector(".heritage-line");
          if (line) {
            revealLines(line, {
              from: { y: maskHiddenY },
              stagger: 0,
              delay: line.classList.contains("heritage-line--delay") ? 0.3 : 0,
            });
          }
        }),
        onceInView(watch([...heritageImages, projectTrack]), (target) => target.classList.add("is-inview")),
        onceInView(watch(portalTitles.map(({ target }) => target)), (target) => {
          const portal = portalTitles.find((item) => item.target === target);
          revealLines(portal.lines.length ? portal.lines : portal.card.querySelectorAll(".portal-copy strong"), {
            stagger: 0,
            delay: (portal.index % 3) * 0.3,
          });
        }),
        onceInView(watch(portalSubtitles.map(({ target }) => target)), (target) =>
          portalSubtitles.find((item) => item.target === target)?.card.classList.add("is-subtitle-inview"),
        ),
      );

      const intro = gsap.timeline({ defaults: { ease: "power4.out" } });
      timelines.add(intro);
      const playsHeaderIntro = !settledStartup && !softNavigation;
      // A direct load runs the header intro once when the veil starts to reveal; soft navigation skips it.
      if (playsHeaderIntro) {
        // the FLIP collapse from scroll at mount time would become the intro's final value and leave the logo scaled.
        gsap.killTweensOf(headerLogo, "x,y,scaleX,scaleY");
        gsap.set(headerLogo, { clearProps: "transform,transformOrigin" });
      }
      const headerIntro = playsHeaderIntro && compositorEase
        ? createHeaderIntro()
        : gsap.timeline({ defaults: { ease: "power4.out" }, paused: true });
      timelines.add(headerIntro);
      if (playsHeaderIntro && !compositorEase) {
        headerIntro
          .from(headerLogo, { scale: 0, duration: 1.5 })
          .from(
            header.querySelectorAll("#header-menu-items > ul > li"),
            { y: -150, duration: 1.5, stagger: 0.1 },
            0.3,
          )
          .from(
            header.querySelector("#header-toggle-svg"),
            { scaleX: 0, transformOrigin: "center", duration: 1 },
            1.5,
          );
      }
      if (!settledStartup && heroWords.length) {
        intro.from(
          heroWords,
          {
            opacity: 0,
            duration: 1,
            stagger: 0.2,
            ease: "expo.out",
            clearProps: "opacity",
          },
          0.9,
        );
      }
      // Runs when the veil starts opening, after the mount's long task, so the start of the intro is not lost (first-load-parity R2).
      intro.pause();
      state.introStart.then(() => intro.play());
      if (document.documentElement.classList.contains("route-enter")) state.headerIntro = headerIntro;
      else window.requestAnimationFrame(() => headerIntro.play());
      // Slide order is set by a reorder script after .hero-slides (page-home R3); slides[0] is the first image shown.
      const slides = selectAll(".hero-slide");
      const carouselEnabled = slides.length > 1;
      let heroIntroPending = Boolean(
        state.hero?.hasAttribute("data-hero-intro") &&
          !settledStartup &&
          !softNavigation,
      );
      if (slides.length) gsap.set(slides, { autoAlpha: 0 });
      if (slides[0] && !heroIntroPending) gsap.set(slides[0], { autoAlpha: 1 });
      if (heroShade) gsap.set(heroShade, { opacity: heroIntroPending ? 0 : 1 });
      const setActiveSlide = (index) => {
        slides.forEach((slide, slideIndex) =>
          slide.classList.toggle("is-active", slideIndex === index),
        );
        heroLabels.forEach((label, labelIndex) =>
          label.classList.toggle("is-active", labelIndex === index),
        );
      };
      let userPaused = false;
      let heroInView = true;
      let carouselStopped = false;
      let holdSettledSlide = settledStartup;
      const heroTimelines = new Set();
      const startSlide = (index) => {
        if (carouselStopped || !slides[index]) return;
        const slide = slides[index];
        const nextIndex = (index + 1) % slides.length;
        const next = slides[nextIndex];
        const introOffset = heroIntroPending && index === 0 ? 1 : 0;
        heroIntroPending = false;
        const timeline = gsap.timeline({
          paused: userPaused || document.hidden || !heroInView,
          onComplete: () => {
            heroTimelines.delete(timeline);
            timelines.delete(timeline);
          },
        });
        heroTimelines.add(timeline);
        timelines.add(timeline);
        setActiveSlide(index);
        if (holdSettledSlide) {
          holdSettledSlide = false;
          gsap.set(slide.querySelector("img"), { scale: 1 });
          timeline.to({}, { duration: 5 }, 0);
        } else {
          timeline.fromTo(
            slide.querySelector("img"),
            { scale: 1.06 },
            // The zoom lasts through the crossfade (5s shown + 1.6s fade), so the old image keeps moving until fully faded.
            { scale: 1, duration: 6.6, ease: "sine.inOut" },
            introOffset,
          );
        }
        if (introOffset) {
          timeline
            .to(
              slide,
              { autoAlpha: 1, duration: 1.6, ease: "power2.inOut" },
              introOffset,
            )
            .to(
              heroShade,
              { opacity: 1, duration: 1.6, ease: "power2.inOut" },
              introOffset,
            );
        }
        if (next !== slide) {
          // The new image starts zooming from the first crossfade frame, overlapping the remaining zoom of the old image.
          timeline
            .to(
              next,
              { autoAlpha: 1, duration: 1.6, ease: "power2.inOut" },
              introOffset + 5,
            )
            .to(
              slide,
              { autoAlpha: 0, duration: 1.6, ease: "power2.inOut" },
              introOffset + 5,
            )
            .call(() => startSlide(nextIndex), null, introOffset + 5);
        }
      };
      const syncMotionState = () => {
        const pagePaused =
          userPaused || document.hidden || reduceMotionQuery.matches;
        document.body.classList.toggle("motion-paused", pagePaused);
        syncClientLogoMotion();
        heroTimelines.forEach((timeline) => {
          if (pagePaused || !heroInView) timeline.pause();
          else timeline.resume();
        });
        if (scrollCueTimeline) {
          if (pagePaused || !heroInView) scrollCueTimeline.pause();
          else scrollCueTimeline.resume();
        }
        if (motionToggle) {
          const label =
            currentLanguage === "en"
              ? userPaused
                ? "Resume motion"
                : "Pause motion"
              : userPaused
                ? "Tiếp tục chuyển động"
                : "Tạm dừng chuyển động";
          motionToggle.setAttribute("aria-pressed", String(userPaused));
          motionToggle.setAttribute("aria-label", label);
        }
      };
      const toggleMotion = () => {
        userPaused = !userPaused;
        syncMotionState();
      };
      const heroObserver = state.hero
        ? new IntersectionObserver(([entry]) => {
            heroInView = entry.isIntersecting;
            syncMotionState();
          })
        : null;
      if (heroObserver) {
        observers.push(heroObserver);
        heroObserver.observe(state.hero);
      }
      motionToggle?.addEventListener("click", toggleMotion, {
        signal: state.abort.signal,
      });
      document.addEventListener("visibilitychange", syncMotionState, {
        signal: state.abort.signal,
      });
      reduceMotionQuery.addEventListener("change", syncMotionState, {
        signal: state.abort.signal,
      });
      window.addEventListener("languagechange", () => {
        buildScrollCueTimeline();
        syncMotionState();
      }, {
        signal: state.abort.signal,
      });
      if (carouselEnabled) startSlide(0);
      syncMotionState();
      state.stopCarousel = () => {
        carouselStopped = true;
        heroTimelines.forEach((timeline) => {
          timeline.kill();
          timelines.delete(timeline);
        });
        heroTimelines.clear();
      };
    }, state.container);

    return () => {
      state.stopCarousel?.();
      observers.forEach((observer) => observer.disconnect());
      timelines.forEach((timeline) => timeline.kill());
      scrollCueSplit?.revert();
      context.revert();
    };
  };

  const nextTask = () => new Promise((resolve) => setTimeout(resolve));

  const unmountPage = ({ keepNativeHidden = false } = {}) => {
    if (!pageState) return;
    const state = pageState;
    state.abort.abort();
    state.motionCleanup?.();
    window.TruongThinhDetail?.unmount();
    if (state.idleCallback && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(state.idleCallback);
    }
    if (state.heroTimer) window.clearTimeout(state.heroTimer);
    destroySmoothScroll(state, { keepNativeHidden });
    pageState = undefined;
    toneRanges = [];
  };

  const mountPage = async (
    container,
    {
      scrollY = 0,
      settledStartup = false,
      softNavigation = false,
    } = {},
  ) => {
    if (!container) return false;
    unmountPage();
    const state = {
      abort: new AbortController(),
      container,
      floatingCtaShown: undefined,
      hero: container.querySelector(".hero"),
      smoothScroll: undefined,
      smoothScrollY: Math.max(0, Number(scrollY) || 0),
    };
    pageState = state;
    lastScrollY = state.smoothScrollY;
    directionStartY = state.smoothScrollY;
    lastDirection = "";

    const heroMedia = container.querySelector(".hero-slides, .about-hero__media");
    // Barba builds the container with DOMParser so the hero slide reorder script (page-home R3) does not run; run a classic copy,
    // synchronously, before mount reads the slides.
    const heroShuffle = softNavigation && heroMedia?.nextElementSibling;
    if (heroShuffle?.tagName === "SCRIPT") {
      heroShuffle.replaceWith(Object.assign(document.createElement("script"), { textContent: heroShuffle.textContent }));
    }
    const projectTrack = container.querySelector(".project-track");
    if (heroMedia) {
      heroMedia.setAttribute("data-scroll", "");
      heroMedia.setAttribute("data-scroll-speed", "-2");
    }
    if (projectTrack) {
      projectTrack.setAttribute("data-scroll", "");
      projectTrack.setAttribute("data-scroll-speed", "4");
      projectTrack.setAttribute("data-scroll-direction", "horizontal");
    }
    // News R2: the large card sticks to the left column. Smooth scroll moves the container by transform so CSS sticky does not work; use Locomotive's
    // sticky, released at the grid bottom; the sticky mark (data-scroll-offset) is set in initSmoothScroll. Native scroll still uses CSS.
    const newsMain = container.querySelector(".blk-news-list__main");
    if (newsMain) {
      const grid = newsMain.parentElement;
      grid.id ||= `news-grid-${++newsGridCount}`;
      newsMain.setAttribute("data-scroll", "");
      newsMain.setAttribute("data-scroll-sticky", "");
      newsMain.setAttribute("data-scroll-target", `#${grid.id}`);
      // Locomotive reads the sticky range and scroll limit once; the grid still grows for a few frames after init while its cards lay out,
      // which released the card early and cut the page end short (1366x650). Re-measure whenever the grid height changes.
      if (typeof ResizeObserver !== "undefined") {
        const gridObserver = new ResizeObserver(requestLayoutUpdate);
        gridObserver.observe(grid);
        state.abort.signal.addEventListener("abort", () => gridObserver.disconnect(), { once: true });
      }
    }

    pauseOffscreenMediaSweeps(state);
    initSmoothScroll(state, state.smoothScrollY);
    setPageScroll(state, state.smoothScrollY, { instant: true });
    // Hero font size is fixed before SplitText splits words and motion reads positions.
    fitHeroLines();
    startRouteReveal();
    const introStart = routeInFlight || document.documentElement.classList.contains("route-enter")
      ? new Promise((resolve) => { resolveRouteReveal = resolve; })
      : Promise.resolve();
    state.introStart = introStart;
    await window.TruongThinhDetail?.mount(container, { settled: settledStartup, softNavigation, introStart });
    // Page motion is its own task, not added to the catalog's render task.
    if (softNavigation) await nextTask();
    if (
      pageState !== state ||
      state.abort.signal.aborted ||
      !state.container.isConnected
    ) return false;
    state.motionCleanup = mountPageMotion(
      state,
      softNavigation,
      settledStartup,
    );
    if ("requestIdleCallback" in window) {
      state.idleCallback = window.requestIdleCallback(
        () => hydrateDeferredHeroImages(state),
        { timeout: 1800 },
      );
    } else {
      state.heroTimer = window.setTimeout(
        () => hydrateDeferredHeroImages(state),
        250,
      );
    }
    updateToneRanges();
    updateHeader(state.smoothScrollY);
    scheduleTextMaskMeasurement();

    return pageState === state && !state.abort.signal.aborted && state.container.isConnected;
  };

  const setReducedMenuState = (opened) => {
    if (!reduceMotion) return;
    const setMotion = (elements, opacity, transform) => {
      elements.filter(Boolean).forEach((element) => {
        element.style.opacity = String(opacity);
        element.style.transform = transform;
      });
    };
    const menuNav = dialog.querySelector(".menu-nav");
    const menuGroups = [...dialog.querySelectorAll(".menu-group")];
    const menuDetailItems = [
      ...dialog.querySelectorAll(
        ".menu-group__number, .menu-group__title, .menu-option",
      ),
    ];
    dialog.querySelectorAll(".menu-shutters i").forEach((shutter) => {
      shutter.style.height = opened ? "100vh" : "0px";
    });
    setMotion(
      [dialog.querySelector(".menu-brand")],
      opened ? 1 : 0,
      opened ? "translateY(0px)" : "translateY(-140px)",
    );
    setMotion(
      [
        ...dialog.querySelectorAll(".menu-language > [data-language-option]"),
        dialog.querySelector(".menu-appointment"),
        ...menuDetailItems,
      ],
      opened ? 1 : 0,
      opened ? "translateY(0px)" : "translateY(-20px)",
    );
    setMotion(
      menuGroups,
      opened ? 1 : 0,
      opened ? "translateY(0px)" : "translateY(-140px)",
    );
    setMotion([menuNav], opened ? 1 : 0, "none");
    setMotion(
      [dialog.querySelector(".menu-close__icon")],
      opened ? 1 : 0,
      opened ? "rotate(0deg)" : "rotate(90deg)",
    );
  };

  setReducedMenuState(false);

  const finishClose = (restoreFocus = true) => {
    window.clearTimeout(menuCloseTimer);
    menuCloseTimer = undefined;
    if (dialog.open) dialog.close();
    dialog.classList.remove("is-active");
    document.body.classList.remove("menu-open");
    openButton.setAttribute("aria-expanded", "false");
    showHeader();
    if (pageState?.smoothScroll) {
      pageState.smoothScroll.start();
    } else if (pageState && smoothMedia.matches && !reduceMotion) {
      const scrollY = pageState.smoothScrollY;
      initSmoothScroll(pageState, scrollY);
      setPageScroll(pageState, scrollY);
    }
    if (reduceMotion) {
      setReducedMenuState(false);
    } else if (!hasGsap) {
      dialog.querySelectorAll(".menu-shutters i").forEach((shutter) => {
        shutter.style.height = "100vh";
      });
    } else {
      menuPageTween?.kill();
      menuPageTween = undefined;
      window.gsap.set(getPageChildren(), { clearProps: "transform,transformOrigin,willChange" });
    }
    const resolve = resolveMenuClose;
    resolveMenuClose = undefined;
    menuClosePromise = undefined;
    resolve?.();
    if (restoreFocus && !routeInFlight) openButton.focus({ preventScroll: true });
    window.dispatchEvent(new CustomEvent("site:menu-closed"));
  };

  const closeMenu = (restoreFocus = true) => {
    if (!dialog.open) return Promise.resolve();
    if (menuClosePromise) return menuClosePromise;
    menuClosePromise = new Promise((resolve) => {
      resolveMenuClose = resolve;
    });
    document.body.classList.remove("menu-open");
    dialog.classList.remove("is-active");
    openButton.setAttribute("aria-expanded", "false");
    if (!hasGsap || reduceMotion) {
      finishClose(restoreFocus);
      return menuClosePromise || Promise.resolve();
    }
    menuTimeline?.timeScale(2.25).reverse();
    menuPageTween?.kill();
    menuPageTween = window.gsap.to(getPageChildren(), {
      scale: 1,
      duration: 0.7,
      delay: 0.85,
      ease: "power2.out",
      onComplete: () => finishClose(restoreFocus),
    });
    menuCloseTimer = window.setTimeout(() => finishClose(restoreFocus), 1750);
    return menuClosePromise;
  };

  // The menu-open timeline is built once (when idle after page load, or on first open) then only play(0): rebuilding on every open
  // makes GSAP clear then re-read each element's style, a 60-90ms long task on the A04s. fromTo in a paused timeline still sets
  // the initial state immediately, so reversing to 0 is the waiting state for the next open. The menu sits outside the Barba container and survives routes.
  // Each fromTo target costs GSAP about 3ms of style parsing on a 6x-throttled CPU, so building all of it in one idle callback was a
  // 220-270ms long task on the A04s Advertising page. The build is a list of one-target steps (index * stagger keeps the stagger timing)
  // run while idle time remains; opening the menu runs whatever is left at once.
  let menuTimelineSteps;
  const createMenuTimelineSteps = () => {
    const shutters = [...dialog.querySelectorAll(".menu-shutters i")];
    const menuBrand = dialog.querySelector(".menu-brand");
    const menuLanguage = dialog.querySelector(".menu-language");
    const menuAppointment = dialog.querySelector(".menu-appointment");
    const menuNav = dialog.querySelector(".menu-nav");
    const menuGroups = [...menuNav.querySelectorAll(".menu-group")];
    const menuLanguageItems = [
      ...menuLanguage.querySelectorAll("[data-language-option]"),
    ];
    const menuAppointmentItems = [menuAppointment];
    const menuCloseIcon = closeButton.querySelector(".menu-close__icon");
    const menuDetailItems = [
      ...menuNav.querySelectorAll(
        ".menu-group__number, .menu-group__title, .menu-option",
      ),
    ];
    const timeline = window.gsap.timeline({
      paused: true,
      onComplete: () => closeButton.focus({ preventScroll: true }),
    });
    const steps = [];
    const fromTo = (targets, from, { stagger = 0, ...to }, position) => {
      [targets].flat().filter(Boolean).forEach((target, index) => {
        steps.push(() => timeline.fromTo(target, { ...from }, { ...to }, position + index * stagger));
      });
    };
    fromTo(shutters, { height: 0 }, { height: "100vh", duration: 0.6, ease: "power4.inOut", stagger: 0.15 }, 0);
    // Shutter done, menu text begins; a route closes the menu here when reversing (coverRouteFromMenu).
    steps.push(() => timeline.addLabel("content"));
    fromTo(menuBrand, { y: -140, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out" }, 1.15);
    fromTo(menuLanguageItems, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "expo.out" }, 1.15);
    fromTo(menuAppointmentItems, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "expo.out" }, 1.15);
    fromTo(menuCloseIcon, { opacity: 0, rotation: 90 }, { opacity: 1, rotation: 0, duration: 0.6, ease: "expo.out" }, 1.4);
    fromTo(menuNav, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 1.05);
    fromTo(menuGroups, { y: -140, yPercent: 0, opacity: 0 }, { y: 0, yPercent: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.02 }, 1.1);
    fromTo(menuDetailItems, { y: -20, yPercent: 0, opacity: 0 }, { y: 0, yPercent: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.03 }, 1.35);
    steps.push(() => { menuTimeline = timeline.timeScale(1.15); });
    return steps;
  };
  const requestIdle = window.requestIdleCallback?.bind(window) ?? ((run) => window.setTimeout(() => {
    const end = performance.now() + 10;
    run({ timeRemaining: () => end - performance.now() });
  }));
  // With a deadline: run steps while idle time remains, then continue in the next idle period. Without one: finish now.
  const buildMenuTimeline = (deadline) => {
    if (menuTimeline) return menuTimeline;
    menuTimelineSteps ||= createMenuTimelineSteps();
    do menuTimelineSteps.shift()();
    while (menuTimelineSteps.length && (!deadline || deadline.timeRemaining() > 3));
    if (!menuTimeline) requestIdle(buildMenuTimeline);
    return menuTimeline;
  };

  const openMenu = () => {
    if (dialog.open || routeInFlight) return;
    // The scale origin is the middle of the screen in each child's coordinates. "50vw 50vh" counts from the child's top so when scrolled deep the origin sits
    // far above the screen, and the whole grid flies up as if cards were dealt again (A04s, scrollY 3677: cards shifted 315-354px). Measure before
    // showModal, while layout is still clean; closing keeps this origin.
    const pageOrigins = getPageChildren().map((child) => {
      const rect = child.getBoundingClientRect();
      return `${window.innerWidth / 2 - rect.left}px ${window.innerHeight / 2 - rect.top}px`;
    });
    dialog.showModal();
    dialog.focus({ preventScroll: true });
    document.body.classList.add("menu-open");
    window.requestAnimationFrame(() => {
      if (dialog.open && document.body.classList.contains("menu-open")) {
        dialog.classList.add("is-active");
      }
    });
    openButton.setAttribute("aria-expanded", "true");
    showHeader();
    pageState?.smoothScroll?.stop();
    if (!hasGsap || reduceMotion) {
      dialog.querySelectorAll(".menu-shutters i").forEach((shutter) => {
        shutter.style.height = "100vh";
      });
      dialog.querySelector(".menu-nav")?.style.setProperty("opacity", "1");
      setReducedMenuState(true);
      closeButton.focus();
      return;
    }
    menuPageTween?.kill();
    buildMenuTimeline().timeScale(1.15).play(0);
    // will-change keeps the next page's raster scale fixed: without it, each new scale frame makes the GPU re-raster the whole page
    // (A04s: GPU busy 1.1-1.45s in the 2s menu open). Removed in finishClose.
    menuPageTween = window.gsap.fromTo(getPageChildren(), { scale: 1, willChange: "transform" }, {
      scale: 0.9,
      duration: 0.7,
      ease: "power2.out",
      transformOrigin: (index) => pageOrigins[index],
    });
  };
  if (hasGsap && !reduceMotion) {
    requestIdle(buildMenuTimeline);
  }

  const setRouteVeil = (opacity) => {
    if (hasGsap) window.gsap.set(routeVeil, { opacity });
    else routeVeil.style.opacity = String(opacity);
  };

  const clearRouteEntry = () => {
    startRouteReveal();
    routeTimeline?.kill();
    routeTimeline = undefined;
    routeInFlight = false;
    routeDestinationReady = false;
    routeMountReady = false;
    document.documentElement.classList.remove("route-enter");
    document.body.classList.remove("is-transitioning");
    header.classList.remove("is-route-pinned");
    updateToneRanges();
    updateHeader();
    // The destination page tone read when the veil opens may drift while layout is still changing; the mark flips to the right color (logo-route-crossfade R2).
    if (routeMarkHeld) syncHeaderBrandSurface(pageHeaderInk);
    routeMarkHeld = false;
    routeVeilInk = false;
    setRouteVeil(0);
    // An intro that never ran leaves the header at its from() start value.
    if (pageState?.headerIntro?.paused()) pageState.headerIntro.progress(1);
    pageState?.smoothScroll?.start();
  };

  // Veil fully covering (owner 2026-11-09): text, nav, hamburger switch to bold immediately, no motion; a white mark flips to
  // CMYK from exactly then, a CMYK mark stays (logo-route-crossfade R1).
  const inkRouteHeader = () => {
    if (!routeMarkHeld) return;
    routeVeilInk = true;
    routeVeilCoveredAt = performance.now();
    updateHeader();
    headerMarkLeadFor = 0;
    syncHeaderBrandSurface(true);
    headerMarkLeadFor = headerSettle;
  };

  const coverRoute = () => {
    routeInFlight = true;
    routeMountReady = false;
    pinHeaderForRoute();
    document.body.classList.add("is-transitioning");
    pageState?.smoothScroll?.stop();
    const fade = new Promise((resolve) => {
      if (!hasGsap || reduceMotion) {
        setRouteVeil(1);
        inkRouteHeader();
        resolve();
        return;
      }
      routeTimeline?.kill();
      routeTimeline = window.gsap.to(routeVeil, {
        opacity: 1,
        duration: 0.75,
        ease: "power4.inOut",
        onComplete: () => {
          inkRouteHeader();
          resolve();
        },
      });
    });
    return fade;
  };

  // Route from the full menu: the menu reverses at the same time the veil covers. The white shutter coincides with the veil and the old page sits under the veil, so
  // close the menu as soon as the veil fully covers and the menu text has finished reversing, without waiting for the shutter and page scale.
  const coverRouteFromMenu = () => {
    const covered = coverRoute();
    const closing = closeMenu(false);
    if (dialog.open && hasGsap && !reduceMotion && menuTimeline) {
      const contentGone = new Promise((resolve) => window.gsap.delayedCall(
        // timeScale() is negative while the timeline is reversing.
        Math.max(0, menuTimeline.time() - menuTimeline.labels.content) / Math.abs(menuTimeline.timeScale()),
        resolve,
      ));
      Promise.all([covered, contentGone]).then(() => {
        if (menuClosePromise !== closing) return;
        menuPageTween?.eventCallback("onComplete", null);
        finishClose(false);
      });
    }
    return Promise.all([covered, closing]);
  };

  const playRouteEnter = async () => {
    if (!hasGsap || reduceMotion) {
      clearRouteEntry();
      return;
    }
    // The veil also waits for fonts so hero text does not change font after being revealed; a failed font still completes ready (progressive-loading R4).
    await document.fonts.ready;
    const hold = routeMarkHeld && routeVeilInk ? routeVeilCoveredAt + routeVeilHold - performance.now() : 0;
    if (hold > 0) await new Promise((resolve) => setTimeout(resolve, hold));
    routeTimeline?.kill();
    showHeader();
    header.classList.add("is-route-pinned");
    document.body.classList.add("is-transitioning");
    setRouteVeil(1);
    startRouteReveal();
    pageState?.headerIntro?.play();
    if (routeMarkHeld) {
      // Veil starts opening: text switches immediately to the destination page's tone, the mark flips to the destination page's color from then (logo-route-crossfade R2);
      // routeMarkHeld holds until clearRouteEntry so updateHeader while the veil opens does not redraw the mark.
      routeVeilInk = false;
      updateToneRanges();
      updateHeader();
      headerMarkLeadFor = 0;
      syncHeaderBrandSurface(pageHeaderInk);
      headerMarkLeadFor = headerSettle;
    }
    return new Promise((resolve) => {
      routeTimeline = window.gsap.to(routeVeil, {
        opacity: 0,
        duration: 1,
        ease: "power4.inOut",
        onComplete: () => {
          clearRouteEntry();
          resolve();
        },
      });
    });
  };

  const hardNavigate = (destination, trigger) => {
    if (hardFallbackPending) return;
    hardFallbackPending = true;
    const url = new URL(destination, window.location.href);
    url.hash = "";
    if (["popstate", "back", "forward"].includes(trigger)
      && url.origin === location.origin && url.pathname === location.pathname && url.search === location.search
      && isMasonryHistoryEntry(url.pathname)
      && window.history.state) {
      try {
        window.history.replaceState({
          ...window.history.state,
          ttAdvertisingHistoryFallback: url.href,
        }, "", window.location.href);
      } catch {}
    }
    window.location.assign(url.href);
  };

  const syncAttributes = (current, next) => {
    // The style in the menu is the GSAP start state of the open timeline built once (buildMenuTimeline): clearing it on page change
    // would make the menu text show immediately on the previous page before the shutter covers on the next open. The header in HTML has no inline style;
    // the style in the header is runtime state (text color, FLIP, mark hidden while the flip layer runs): clearing it mid-flip makes the original CMYK mark
    // reappear under the white face, exposing a faint colored edge around each strip on the white veil (owner 2026-11-09).
    const keep = (name) => name === "open" || (name === "style" && (dialog.contains(current) || header.contains(current)));
    [...current.attributes].forEach(({ name }) => {
      if (!keep(name) && !next.hasAttribute(name)) current.removeAttribute(name);
    });
    [...next.attributes].forEach(({ name, value }) => {
      if (!keep(name)) current.setAttribute(name, value);
    });
  };

  const syncElementTree = (current, next) => {
    if (!current || !next || current.tagName !== next.tagName) return false;
    syncAttributes(current, next);
    // The flip layer is inserted at runtime by paintHeaderMark and the new page's HTML lacks it; skip it when comparing trees.
    const currentChildren = [...current.children].filter(
      (child) => !child.classList.contains("brand-lockup__mark-flip"),
    );
    const nextChildren = [...next.children];
    if (currentChildren.length !== nextChildren.length) return false;
    if (!currentChildren.length) {
      current.textContent = next.textContent;
      return true;
    }
    return currentChildren.every((child, index) =>
      syncElementTree(child, nextChildren[index]),
    );
  };

  const syncKeyedHead = (nextDocument, selector, keyFor) => {
    const currentNodes = [...document.head.querySelectorAll(selector)];
    const nextNodes = [...nextDocument.head.querySelectorAll(selector)];
    const currentByKey = new Map(currentNodes.map((node) => [keyFor(node), node]));
    const nextKeys = new Set();
    nextNodes.forEach((nextNode) => {
      const key = keyFor(nextNode);
      nextKeys.add(key);
      const current = currentByKey.get(key);
      if (current) {
        syncAttributes(current, nextNode);
        current.textContent = nextNode.textContent;
      } else {
        document.head.append(nextNode.cloneNode(true));
      }
    });
    currentNodes.forEach((node) => {
      if (!nextKeys.has(keyFor(node))) node.remove();
    });
  };

  const organizationScripts = (root) =>
    [...root.querySelectorAll('script[type="application/ld+json"]')].filter(
      (script) => {
        try {
          const value = JSON.parse(script.textContent);
          const entries = value?.["@graph"] || [value];
          return entries.some((entry) => entry?.["@type"] === "Organization");
        } catch {
          return false;
        }
      },
    );

  const syncDocumentState = (html) => {
    if (!html) return false;
    const nextDocument = new DOMParser().parseFromString(html, "text/html");
    if (!nextDocument.querySelector('[data-barba="container"]')) return false;
    document.title = nextDocument.title;
    syncKeyedHead(
      nextDocument,
      'meta[name="description"], meta[name="theme-color"], meta[property^="og:"], meta[name^="twitter:"]',
      (node) => `${node.tagName}:${node.getAttribute("name") || node.getAttribute("property")}`,
    );
    syncKeyedHead(
      nextDocument,
      'link[rel="canonical"], link[rel="alternate"][hreflang]',
      (node) => `${node.rel}:${node.hreflang || "canonical"}`,
    );
    const currentOrganizations = organizationScripts(document.head);
    const nextOrganizations = organizationScripts(nextDocument.head);
    currentOrganizations.forEach((script, index) => {
      if (nextOrganizations[index]) {
        script.textContent = nextOrganizations[index].textContent;
      } else {
        script.remove();
      }
    });
    nextOrganizations.slice(currentOrganizations.length).forEach((script) => {
      document.head.append(script.cloneNode(true));
    });

    document.documentElement.lang = nextDocument.documentElement.lang || "vi";
    const nextLocale = nextDocument.documentElement.dataset.routeLocale;
    if (nextLocale) document.documentElement.dataset.routeLocale = nextLocale;
    else delete document.documentElement.dataset.routeLocale;
    const preservedClasses = runtimeBodyClasses.filter((name) =>
      document.body.classList.contains(name),
    );
    document.body.className = nextDocument.body.className;
    preservedClasses.forEach((name) => document.body.classList.add(name));
    const nextProfile = nextDocument.body.dataset.detailHeroProfile;
    if (nextProfile) document.body.dataset.detailHeroProfile = nextProfile;
    else delete document.body.dataset.detailHeroProfile;

    // The header's `is-*` classes (mark color, tone, background) are runtime state; the new page's HTML lacks them so keep them, otherwise the logo
    // text flashes white for one frame on the veil (owner 2026-11-09). The inline style in the header is already kept by syncAttributes.
    const brandClasses = [...header.classList].filter((name) => name.startsWith("is-"));
    const persistentReady = persistentSelectors.every((selector) =>
      syncElementTree(
        document.querySelector(selector),
        nextDocument.querySelector(selector),
      ),
    );
    header.classList.add(...brandClasses);
    if (!persistentReady) return false;
    // syncAttributes just reset the mark's `d` to the original from the new page's HTML.
    brandLockups.forEach(snapBrandMark);
    setLanguageFromDocument();
    return true;
  };

  const getHistoryIndex = () => {
    const index = Number(window.history.state?.index);
    return Number.isInteger(index) ? index : undefined;
  };

  const rememberCurrentScroll = (data) => {
    const destinationIndex = getHistoryIndex();
    if (destinationIndex === undefined) return;
    const outgoingIndex =
      data.trigger === "back" ? destinationIndex + 1 : destinationIndex - 1;
    routeScrollPositions.set(outgoingIndex, Math.round(getPageScroll()));
  };

  const resolveNextScroll = (data) => {
    if (pendingLocaleNavigation) return pendingLocaleNavigation.scrollY;
    if (data.trigger === "back" || data.trigger === "forward") {
      const destinationIndex = getHistoryIndex();
      if (destinationIndex !== undefined) {
        return routeScrollPositions.get(destinationIndex) ?? 0;
      }
    }
    return 0;
  };

  const restorePendingLocaleUrl = (nextUrl) => {
    if (!pendingLocaleNavigation) return false;
    const pendingUrl = pendingLocaleNavigation.url;
    if (
      pendingUrl.pathname !== nextUrl.pathname ||
      pendingUrl.search !== nextUrl.search
    ) {
      return false;
    }
    window.history.replaceState(
      window.history.state,
      "",
      `${pendingUrl.pathname}${pendingUrl.search}`,
    );
    return true;
  };

  const clearPendingLocaleNavigation = (removeFallback = false) => {
    if (removeFallback && pendingLocaleNavigation) {
      try {
        window.sessionStorage.removeItem(
          localeScrollStateKey(pendingLocaleNavigation.url),
        );
      } catch {}
    }
    pendingLocaleNavigation = undefined;
  };

  const isExcludedRoute = (url) =>
    /^(?:\/admin|\/api|\/assets|\/media|\/downloads?)(?:\/|$)/.test(
      url.pathname,
    );
  const normalizePathname = (pathname) =>
    pathname === "/" ? "/" : `${pathname.replace(/\/+$/, "")}/`;
  const currentRouteLinkSelector =
    '[data-site-header] a[aria-current="page"], #site-menu a[aria-current="page"]';
  const isExactCurrentUrl = (url) =>
    url.origin === window.location.origin &&
    normalizePathname(url.pathname) === normalizePathname(window.location.pathname) &&
    url.search === window.location.search;
  const shouldPreventBarba = ({ el, href }) => {
    if (!href) return true;
    if (el?.matches?.("[data-language-option]")) {
      return true;
    }
    const url = new URL(href, window.location.href);
    if (
      url.origin !== window.location.origin ||
      isExcludedRoute(url) ||
      el?.target ||
      el?.hasAttribute?.("download")
    ) {
      return true;
    }
    return (
      url.pathname === window.location.pathname &&
      url.search === window.location.search
    );
  };




  const switchLocaleRoute = (language) => {
    const routeLocale = getRouteLocale();
    if (routeLocale !== "vi" && routeLocale !== "en") return Promise.resolve(false);
    if (localeSwitchPromise) return localeSwitchPromise;
    const nextLanguage = language === "en" ? "en" : "vi";
    localeSwitchPromise = (async () => {
      if (nextLanguage === currentLanguage) {
        await closeMenu(false);
        return true;
      }
      // Owner 2026-11-08: a language switch reruns all motion like F5. The veil covers then the destination page loads from scratch
      // (head-inline's route-enter opens the veil, the intro reruns, scroll returns to top); replace so no history entry is added.
      // Owner 2026-11-10: do not show the old-language header when the menu closes back on the veil; the reloaded destination page shows the new header.
      // replace() removes the old page from history so bfcache does not return the hidden header.
      header.style.visibility = "hidden";
      await (reduceMotion ? closeMenu(false) : coverRouteFromMenu());

      const url = new URL(window.location.href);
      const suffix = url.pathname.replace(/^\/(?:vi|en)(?=\/|$)/, "") || "/";
      // Advertising cluster and product pages: the language link already carries the path with the destination locale's slug.
      // Project detail and News pages have different VI and EN slugs: use the link when the current locale's link
      // points at the page being viewed (in-place filtering has not updated the link, so keep the prefix swap).
      const pathOf = (link) => link && new URL(link.href).pathname;
      const linksMatchPage = pathOf(document.querySelector(`[data-language-option="${currentLanguage}"][href]`)) === url.pathname;
      const option = (isAdvertisingPath(url.pathname) || linksMatchPage)
        && document.querySelector(`[data-language-option="${nextLanguage}"][href]`);
      url.pathname = option ? new URL(option.href).pathname : `/${nextLanguage}${suffix}`;
      url.hash = "";
      try {
        window.localStorage.setItem("tt-lang", nextLanguage);
      } catch {}
      hardFallbackPending = true;
      window.location.replace(url.href);
      return true;
    })().finally(() => {
      localeSwitchPromise = undefined;
    });
    return localeSwitchPromise;
  };

  document.addEventListener(
    "click",
    (event) => {
      const languageOption = event.target.closest("[data-language-option]");
      if (
        languageOption
        && (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      ) return;
      if (languageOption) {
        event.preventDefault();
        const nextLanguage = languageOption.dataset.languageOption;
        void switchLocaleRoute(nextLanguage).then((handled) => {
          if (!handled) applyLanguage(nextLanguage);
        });
        return;
      }

      const link = event.target.closest("a[href]");
      if (!link) return;
      if (link.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
        return;
      }
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const plainPrimaryClick = event.button === 0
        && !event.altKey
        && !event.ctrlKey
        && !event.metaKey
        && !event.shiftKey;
      const persistentNavbarLink = link.matches(
        "[data-site-header] .desktop-nav a, #site-menu .menu-group__title",
      );
      const persistentAdvertisingLink = persistentNavbarLink
        && /^\/(?:vi|en)\/advertising-products\/?$/.test(destination.pathname);
      const currentParentLink = plainPrimaryClick
        && persistentNavbarLink
        && !link.target
        && !link.hasAttribute("download")
        && /^\/(?:vi|en)\/(?:residential|commercial|advertising-products)\/?$/.test(
          window.location.pathname,
        )
        && normalizePathname(destination.pathname) === normalizePathname(window.location.pathname)
        && (!persistentAdvertisingLink || destination.search === window.location.search)
        && !isAdvertisingPhotoUrl(new URL(window.location.href));
      if (currentParentLink) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const returnToTop = () => setPageScroll(pageState, 0);
        if (link.closest("#site-menu")) {
          setPageScroll(pageState, 0, { instant: true });
          void closeMenu(false);
        } else {
          returnToTop();
        }
        return;
      }
      if (
        plainPrimaryClick
        && persistentAdvertisingLink
        && !link.target
        && !link.hasAttribute("download")
        // Detail or a cluster, product page in the same locale back to masonry in place (taxonomy R4).
        && isAdvertisingPath(window.location.pathname)
        && destination.pathname.slice(0, 4) === window.location.pathname.slice(0, 4)
        && destination.search === ""
        && destination.pathname !== `${window.location.pathname}${window.location.search}`
        && window.TruongThinhMasonry?.getAdapter?.()
      ) {
        // From photo, the navbar returns to the exact spot on the source masonry; from a filtered masonry it returns to All at the top.
        const fromGrid = !isAdvertisingPhotoUrl(new URL(window.location.href));
        const navigateToAdvertisingParent = (instant = false) => {
          if (window.TruongThinhMasonry?.navigateQuery?.(
            destination.href,
            { reason: "navbar" },
          )) {
            if (fromGrid) setPageScroll(pageState, 0, { instant });
            return true;
          }
          if (window.barba?.go) {
            window.barba.go(destination.href);
          } else {
            window.location.assign(destination.href);
          }
          return true;
        };
        if (link.closest("#site-menu")) {
          event.preventDefault();
          event.stopImmediatePropagation();
          void closeMenu(false).then(() => navigateToAdvertisingParent(true));
          return;
        }
        if (navigateToAdvertisingParent()) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
      }
      if (
        plainPrimaryClick &&
        !link.target &&
        !link.hasAttribute("download") &&
        link.matches(currentRouteLinkSelector) &&
        isExactCurrentUrl(destination)
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      const sameDocument =
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search;
      if (!sameDocument) {
        // Ctrl/Shift/Meta+click opens a new tab, no route clears the pin layer.
        if (
          plainPrimaryClick &&
          !isExcludedRoute(destination) &&
          !link.target &&
          !link.hasAttribute("download")
        ) {
          pinHeaderForRoute();
        }
        return;
      }
      if (!link.matches(".brand")) return;
      event.preventDefault();
      setPageScroll(pageState, 0);
    },
    { signal: runtimeAbort.signal },
  );

  openButton.addEventListener("click", openMenu, {
    signal: runtimeAbort.signal,
  });
  closeButton.addEventListener("click", () => closeMenu(), {
    signal: runtimeAbort.signal,
  });
  dialog.setAttribute("tabindex", "-1");
  dialog.addEventListener(
    "cancel",
    (event) => {
      event.preventDefault();
      closeMenu();
    },
    { signal: runtimeAbort.signal },
  );
  dialog.addEventListener(
    "click",
    (event) => {
      const link = event.target?.closest?.("a[href]");
      if (!link || !dialog.contains(link)) return;
      if (
        event.button !== 0 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        link.target ||
        link.hasAttribute("download")
      ) return;
      const destination = new URL(link.href, window.location.href);
      if (
        link.matches(currentRouteLinkSelector) &&
        isExactCurrentUrl(destination)
      ) {
        return;
      }
      if (link.getAttribute("aria-disabled") !== "true") closeMenu(false);
    },
    { signal: runtimeAbort.signal },
  );

  // Header padding changes gradually on collapse: re-measure height after the transition (phone-header-scroll R2).
  header.addEventListener(
    "transitionend",
    (event) => {
      if (event.target !== header || !event.propertyName.startsWith("padding")) return;
      headerFollowStale = true;
      requestHeaderUpdate();
    },
    { signal: runtimeAbort.signal },
  );
  window.addEventListener("scroll", requestHeaderUpdate, {
    passive: true,
    signal: runtimeAbort.signal,
  });
  window.addEventListener("resize", requestLayoutUpdate, {
    passive: true,
    signal: runtimeAbort.signal,
  });
  window.addEventListener("site:layout", requestLayoutUpdate, {
    signal: runtimeAbort.signal,
  });
  window.addEventListener("languagechange", requestLayoutUpdate, {
    signal: runtimeAbort.signal,
  });
  document.addEventListener(
    "mousemove",
    (event) => {
      const canForceShow = headerHoverMedia.matches && event.screenY <= 350;
      header.classList.toggle("forceShow", canForceShow);
    },
    { passive: true, signal: runtimeAbort.signal },
  );
  // Chrome-style middle-mouse autoscroll (scroll-feel R6): Locomotive blocks native autoscroll so push the delta
  // through the wheel's own path; if Locomotive is not running or is locked, leave it to the browser.
  let autoscroll;
  let swallowClick = false;
  const autoscrollDeadZone = 15;
  const stopAutoscroll = () => {
    if (!autoscroll) return;
    window.cancelAnimationFrame(autoscroll.frame);
    autoscroll.origin.remove();
    delete document.documentElement.dataset.autoscroll;
    autoscroll = undefined;
  };
  const stepAutoscroll = (time) => {
    const { core } = autoscroll;
    if (core !== pageState?.smoothScroll?.scroll || core.stop) {
      stopAutoscroll();
      return;
    }
    const distance = autoscroll.mouseY - autoscroll.y;
    // Chrome's autoscroll formula: 0.000008 × |d|^2.2 times FixedVelocityCurve's 5000, no cap.
    const speed = Math.abs(distance) <= autoscrollDeadZone ? 0
      : Math.sign(distance) * 0.04 * Math.abs(distance) ** 2.2;
    document.documentElement.dataset.autoscroll = speed < 0 ? "up" : speed > 0 ? "down" : "idle";
    const seconds = Math.min(0.1, (time - (autoscroll.time ?? time)) / 1000);
    autoscroll.time = time;
    if (speed && seconds) {
      // updateDelta subtracts deltaY × multiplier like a reversed wheel event from virtual-scroll.
      core.updateDelta({ deltaX: 0, deltaY: -speed * seconds / core.multiplier });
      if (!core.isScrolling) core.startScrolling();
    }
    autoscroll.frame = window.requestAnimationFrame(stepAutoscroll);
  };
  document.addEventListener("mousedown", (event) => {
    if (autoscroll) {
      // The tap that stops autoscroll does not reach the link or button underneath.
      stopAutoscroll();
      swallowClick = true;
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    swallowClick = false;
    const core = pageState?.smoothScroll?.scroll;
    if (event.button !== 1 || !core || core.stop
      || event.target.closest?.("a[href], button, input, textarea, select, label, dialog, [contenteditable]")) return;
    event.preventDefault();
    const origin = document.createElement("div");
    origin.className = "autoscroll-origin";
    origin.setAttribute("aria-hidden", "true");
    // Round to screen pixels so the icon edge does not fall on a half pixel at 125%, 150% scale.
    const snap = (value) => Math.round(value * window.devicePixelRatio) / window.devicePixelRatio;
    origin.style.left = `${snap(event.clientX)}px`;
    origin.style.top = `${snap(event.clientY)}px`;
    origin.innerHTML = '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="15"/><circle cx="16" cy="16" r="3"/>'
      + '<path d="M16 6l6 6H10zM16 26l6-6H10z"/></svg>';
    document.body.append(origin);
    autoscroll = { core, origin, y: event.clientY, mouseY: event.clientY, moved: false };
    autoscroll.frame = window.requestAnimationFrame(stepAutoscroll);
  }, { capture: true, signal: runtimeAbort.signal });
  document.addEventListener("mousemove", (event) => {
    if (!autoscroll) return;
    autoscroll.mouseY = event.clientY;
    if (Math.abs(event.clientY - autoscroll.y) > autoscrollDeadZone) autoscroll.moved = true;
  }, { passive: true, signal: runtimeAbort.signal });
  // Releasing the middle button inside the dead zone enters sticky mode; if dragged outside, it stops.
  document.addEventListener("mouseup", (event) => {
    if (autoscroll && event.button === 1 && autoscroll.moved) stopAutoscroll();
  }, { signal: runtimeAbort.signal });
  for (const type of ["click", "auxclick"]) {
    document.addEventListener(type, (event) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, { capture: true, signal: runtimeAbort.signal });
  }
  for (const type of ["wheel", "keydown", "blur"]) {
    window.addEventListener(type, stopAutoscroll, { capture: true, passive: true, signal: runtimeAbort.signal });
  }
  smoothMedia.addEventListener(
    "change",
    () => {
      if (!pageState) return;
      const scrollY = getPageScroll();
      destroySmoothScroll(pageState);
      initSmoothScroll(pageState, scrollY);
      setPageScroll(pageState, scrollY, { instant: true });
    },
    { signal: runtimeAbort.signal },
  );
  document.fonts?.addEventListener("loadingdone", requestLayoutUpdate, {
    signal: runtimeAbort.signal,
  });
  document.fonts?.addEventListener("loadingdone", scheduleTextMaskMeasurement, {
    signal: runtimeAbort.signal,
  });
  window.addEventListener("load", requestLayoutUpdate, {
    once: true,
    signal: runtimeAbort.signal,
  });

  setLanguageFromDocument();
  // The observer measures after the first layout; reading it here used to force that layout to run inside this task.
  if (typeof ResizeObserver === "undefined") measureDesktopNav();
  const directUrl = new URL(window.location.href);
  window.history.replaceState(
    window.history.state,
    "",
    `${directUrl.pathname}${directUrl.search}`,
  );
  let directScroll;
  try {
    const saved = window.sessionStorage.getItem(localeScrollStateKey(directUrl));
    if (saved !== null && Number.isFinite(Number(saved))) directScroll = Number(saved);
    window.sessionStorage.removeItem(localeScrollStateKey(directUrl));
  } catch {}
  const directContainer = document.querySelector('[data-barba="container"]');
  const settledStartup = window.__ttMotionBoot?.fallback === true;
  const enteredViaRoute = document.documentElement.classList.contains("route-enter");
  let pendingAdvertisingFilter;
  let advertisingFilterQueueEnabled =
    directContainer?.dataset.barbaNamespace === "advertising-products";
  const clearPendingAdvertisingFilter = () => {
    pendingAdvertisingFilter = undefined;
    advertisingFilterQueueEnabled = false;
  };
  const replayPendingAdvertisingFilter = () => {
    const intent = pendingAdvertisingFilter;
    clearPendingAdvertisingFilter();
    if (!intent) return;
    const control = directContainer.querySelector(
      `[data-masonry-filter="${CSS.escape(intent.filter)}"]`,
    );
    if (control instanceof HTMLElement) {
      control.click();
      return;
    }
    hardNavigate(intent.href);
  };
  // Dragging the mouse to select the footer phone number to copy does not open the tel: link (owner 12/10).
  document.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest(".footer-hotline, .footer-office")
      && getSelection().toString()) event.preventDefault();
  });
  document.addEventListener("click", (event) => {
    if (!advertisingFilterQueueEnabled || window.TruongThinhMasonry?.getAdapter?.()) return;
    const control = event.target instanceof Element
      ? event.target.closest("[data-masonry-filter]")
      : null;
    const link = control?.closest("a[href]");
    if (
      !control
      || !link
      || !directContainer?.contains(control)
      || event.button !== 0
      || event.altKey
      || event.ctrlKey
      || event.metaKey
      || event.shiftKey
      || link.target
      || link.hasAttribute("download")
    ) return;
    const destination = new URL(link.href, window.location.href);
    // The rail points to a cluster page (taxonomy R4); the same /<locale>/advertising-products root still queues in-place filtering.
    const advertisingRoot = (pathname) => pathname.split("/").slice(0, 3).join("/");
    if (
      destination.origin !== window.location.origin
      || advertisingRoot(destination.pathname) !== advertisingRoot(window.location.pathname)
    ) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pendingAdvertisingFilter = {
      filter: control.dataset.masonryFilter || "all",
      href: destination.href,
    };
  }, { capture: true, signal: runtimeAbort.signal });
  // Mount and Barba read layout; after the first frame that layout is done, so this script is still a short task.
  const afterFirstFrame = new Promise((resolve) => window.requestAnimationFrame(() => setTimeout(resolve)));
  if (enteredViaRoute) prepareRouteDestination(directContainer);
  const directMount = afterFirstFrame.then(() => mountPage(directContainer, {
    scrollY: directScroll ?? window.scrollY,
    settledStartup,
  }));
  const handleDirectMountFailure = (error) => {
    const intent = pendingAdvertisingFilter;
    clearPendingAdvertisingFilter();
    console.error("[advertising-products] direct dependency readiness failed", error);
    if (pageState?.container === directContainer) unmountPage();
    if (directContainer?.dataset.barbaNamespace !== "advertising-products") {
      hardNavigate(directUrl.href);
      return;
    }
    if (intent) {
      hardNavigate(intent.href);
      return;
    }
    const grid = directContainer.querySelector("[data-project-grid]");
    grid?.replaceChildren();
    if (grid) grid.hidden = true;
    directContainer.dataset.masonryFallback = "failed";
    document.documentElement.classList.add("motion-fallback");
    clearRouteEntry();
  };
  if (enteredViaRoute) {
    void directMount.then(
      (mounted) => {
        if (mounted) replayPendingAdvertisingFilter();
        else clearPendingAdvertisingFilter();
        if (mounted) return playRouteEnter();
        clearRouteEntry();
      },
      handleDirectMountFailure,
    );
  } else {
    setRouteVeil(0);
    void directMount.then(
      (mounted) => {
        if (mounted) replayPendingAdvertisingFilter();
        else clearPendingAdvertisingFilter();
      },
      handleDirectMountFailure,
    );
  }

  window.addEventListener("popstate", (event) => {
    const advertising = window.TruongThinhMasonry;
    // Back while the photo viewer is open only closes the viewer (advertising-viewer-touch-zoom R10).
    if (advertising?.handleViewerPopState?.()) {
      event.stopImmediatePropagation();
      return;
    }
    const previousHref = advertising?.getCurrentHref?.() || window.barba?.history?.current?.url;
    const nextHref = window.location.href;
    if (!advertising?.canHandlePopState?.(previousHref, nextHref)) {
      // Barba forces a native load for a traversal while a transition runs; mark the entry so the grid page
      // restores its scroll and card order from history state (Projects Back, like Advertising).
      if (window.barba?.transitions?.isRunning
        && isMasonryHistoryEntry(location.pathname)) {
        event.stopImmediatePropagation();
        hardNavigate(nextHref, "popstate");
      }
      return;
    }
    window.barba?.history?.change?.(nextHref, "popstate", event);
    const handled = advertising.handlePopState?.(
      event,
      previousHref,
      nextHref,
    );
    if (!handled) return;
    event.stopImmediatePropagation();
  }, { signal: runtimeAbort.signal });

  void afterFirstFrame.then(() => {
    if (window.barba) {
      try {
        window.barba.init({
          preventRunning: true,
          timeout: 15_000,
          prefetchIgnore: true,
          prevent: shouldPreventBarba,
          requestError: (trigger, _action, url) => {
            const fallbackUrl = new URL(
              pendingLocaleNavigation?.url.href || url,
              window.location.href,
            );
            clearPendingLocaleNavigation();
            hardNavigate(fallbackUrl.href, trigger);
            return false;
          },
          transitions: [
            {
              name: "persistent-shell",
              sync: false,
              beforeLeave(data) {
                // Advertising destination: load the catalog in parallel with the veil covering; errors are left to beforeEnter and mount to handle as before.
                advertisingCatalogLoad = isAdvertisingPath(data.next.url.path)
                  ? window.TruongThinhDetail?.loadAdvertisingCatalog?.().catch(() => {})
                  : undefined;
                releaseHeaderInteractionState();
                pinHeaderForRoute();
                routeMountReady = false;
                rememberCurrentScroll(data);
              },
              async leave(data) {
                await coverRouteFromMenu();
                // Wait for the catalog before unmount: removing smooth scroll makes the native scrollbar appear and push the header left
                // during the network wait.
                await advertisingCatalogLoad;
                // Unmount runs outside the frame that just ended the veil.
                await nextTask();
                // The new page re-mounts smooth scroll right after; keep the native scrollbar hidden across the gap (site-shell R9).
                unmountPage({ keepNativeHidden: true });
                data.current.container.hidden = true;
              },
              async beforeEnter(data) {
                // Each heavy step (unmount, document sync, mount) is its own task so there is no long task > 50ms
                // on Android phones (decision phone-frame-budget).
                await nextTask();
                if (!syncDocumentState(data.next.html)) {
                  const fallbackUrl = new URL(
                    pendingLocaleNavigation?.url.href || data.next.url.href,
                    window.location.href,
                  );
                  hardNavigate(fallbackUrl.href);
                  return;
                }
                if (["advertising-products", "projects"].includes(data.next.container.dataset.barbaNamespace)) {
                  try {
                    await window.TruongThinhDetail?.ensureAdvertisingDependencies?.(data.next.url.href);
                  } catch (error) {
                    console.error("[advertising-products] Barba dependency readiness failed", error);
                    hardNavigate(data.next.url.href, data.trigger);
                    return;
                  }
                }
                await nextTask();
                const nextUrl = new URL(data.next.url.href, window.location.href);
                restorePendingLocaleUrl(nextUrl);
                const scrollY = resolveNextScroll(data);
                prepareRouteDestination(data.next.container);
                try {
                  routeMountReady = await mountPage(data.next.container, {
                    scrollY,
                    softNavigation: true,
                  });
                } catch (error) {
                  console.error("[advertising-products] destination mount failed", error);
                  hardNavigate(data.next.url.href, data.trigger);
                }
              },
              async enter() {
                if (routeMountReady) await playRouteEnter();
              },
              after() {
                if (pendingLocaleNavigation && pageState) {
                  setPageScroll(pageState, pendingLocaleNavigation.scrollY);
                }
                clearPendingLocaleNavigation(true);
              },
            },
          ],
        });
        // Barba treats every status other than 200 as an error and reloads the whole document, so Back to the 404 page loses the veil and reruns
        // the header intro. The site's 404 page (status 404) still takes the soft route like any other page (Shell R6).
        // barba.request is an internal API of the vendored 2.10.3; when upgrading Barba, rerun not-found-routes.e2e.mjs.
        const barbaRequest = window.barba.request;
        window.barba.request = (href, timeout, onError, cache, headers) =>
          barbaRequest(href, timeout, (url, error) => error?.status === 404 || onError(url, error), cache, headers)
            .catch(async (error) => {
              if (error?.status !== 404) throw error;
              const html = await fetch(href).then((response) => response.text()).catch(() => "");
              if (!html.includes('data-barba-namespace="not-found"')) {
                onError(href, error);
                throw error;
              }
              cache.update(href, { status: "fulfilled", target: href });
              return { html, url: { href, ...window.barba.url.parse(href) } };
            });
      } catch {
        clearRouteEntry();
      }
    }
  });
  window.addEventListener(
    "pageshow",
    (event) => {
      releaseHeaderInteractionState();
      if (event.persisted) {
        hardFallbackPending = false;
        routeInFlight = false;
        finishClose(false);
        clearRouteEntry();
      }
      showHeader();
      requestLayoutUpdate();
    },
    { signal: runtimeAbort.signal },
  );

  window.__ttMotionRuntimeHealthy = true;
  window.__ttMotionBoot?.claim?.();
  window.requestAnimationFrame(() =>
    window.requestAnimationFrame(() => window.__ttMotionBoot?.release?.()),
  );
})();
