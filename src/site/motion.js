// The CSS loading ring keeps repainting under a loaded photo, so mark its frame settled.
(() => {
  // The ring selector matches both <picture> and its wrapper.
  const settle = (image) => {
    const parent = image.parentElement;
    parent?.classList.add("is-media-settled");
    if (parent?.tagName === "PICTURE") parent.parentElement?.classList.add("is-media-settled");
  };
  const onSettle = ({ target }) => target.tagName === "IMG" && settle(target);
  document.addEventListener("load", onSettle, true);
  document.addEventListener("error", onSettle, true);
  document.querySelectorAll("img[src]").forEach((image) => image.complete && settle(image));
})();

(() => {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const { gsap, SplitText } = window;
  const hasGsap = typeof gsap !== "undefined";
  const smoothMedia = window.matchMedia("(min-width: 981px)");
  const headerHoverMedia = window.matchMedia(
    "(any-hover: hover) and (any-pointer: fine)",
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
  const localeScrollStateKey = (url) =>
    `tt-locale-scroll:${url.pathname}${url.search}`;
  const textMaskSelector =
    ".hero-line-mask, .line-mask, .heritage-text, .portal-title-mask, .portal-title__quiet, .portal-title__strong, .detail-line, .motion-line-mask";
  const whiteOverlayMediaSelector =
    ".hero-slide img, .about-hero__media img, :is(.service-portal, .detail-gallery__item, .detail-cta, .legacy-closer) > img, :is(.service-portal, .detail-gallery__item, .detail-cta, .legacy-closer) > picture > img";
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
  header.setAttribute("data-logo-motion", "sequence");
  const headerLogo = header.querySelector("#header-logo");
  const desktopNav = header.querySelector("#header-menu-items");
  const desktopNavList = desktopNav?.querySelector("ul");
  const measureDesktopNav = () => {
    if (!desktopNavList) return;
    const hiddenByBreakpoint = getComputedStyle(desktopNavList).display === "none";
    const items = [...desktopNavList.children];
    const listRect = desktopNavList.getBoundingClientRect();
    const logoRect = headerLogo?.getBoundingClientRect();
    const menuRect = openButton.getBoundingClientRect();
    const wraps = items.length > 0
      && items.some((item) => Math.abs(item.offsetTop - items[0].offsetTop) > 1);
    const clips = desktopNavList.scrollWidth > desktopNavList.clientWidth + 1;
    const overlaps = logoRect && (listRect.left < logoRect.right - 1 || listRect.right > menuRect.left + 1);
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
  let currentHeaderColor = "";
  let routeTimeline;
  let routeInFlight = false;
  let routeDestinationReady = false;
  let routeMountReady = false;
  let headerBrandColorFrame;
  let headerBrandColorActivationFrame;
  let lastHeaderWhiteSurface;
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
  const getDominantSection = () => {
    const candidates = pageState
      ? [
          ...pageState.container.querySelectorAll(
            "main > section, main > figure, :scope > footer",
          ),
        ]
      : [];
    const visibleArea = (element) => {
      const rect = element.getBoundingClientRect();
      return Math.max(
        0,
        Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0),
      );
    };
    return candidates.reduce(
      (best, candidate) =>
        !best || visibleArea(candidate) > visibleArea(best) ? candidate : best,
      undefined,
    );
  };

  const measureTextMasks = () => {
    if (!maskContext) return;
    document.querySelectorAll(textMaskSelector).forEach((mask) => {
      const line = mask.firstElementChild || mask;
      const style = getComputedStyle(line);
      const fontSize = Number.parseFloat(style.fontSize);
      if (!fontSize) return;
      maskContext.font =
        style.font ||
        `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const metrics = maskContext.measureText(line.textContent.trim());
      const capMetrics = maskContext.measureText("H");
      const topOverflow = Math.max(
        fontSize * 0.22,
        metrics.actualBoundingBoxAscent -
          capMetrics.actualBoundingBoxAscent +
          fontSize * 0.1 +
          4,
      );
      const bottomOverflow = Math.max(
        fontSize * 0.2,
        metrics.actualBoundingBoxDescent + 4,
      );
      const topValue = `${Math.ceil(topOverflow)}px`;
      const bottomValue = `${Math.ceil(bottomOverflow)}px`;
      mask.style.setProperty(
        "--mask-ink-overflow",
        `${Math.max(Math.ceil(topOverflow), Math.ceil(bottomOverflow))}px`,
      );
      mask.style.setProperty("--mask-ink-overflow-top", topValue);
      mask.style.setProperty("--mask-ink-overflow-bottom", bottomValue);
    });
  };
  const scheduleTextMaskMeasurement = () =>
    window.requestAnimationFrame(measureTextMasks);

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

  const colorHeader = (color, immediate = false) => {
    if (currentHeaderColor === color && !immediate) return;
    const isInitialColor = currentHeaderColor === "";
    currentHeaderColor = color;
    const colorTargets = [
      headerLogo,
      ...header.querySelectorAll(".desktop-nav a"),
      header.querySelector(".menu-button"),
    ].filter((target) => target instanceof HTMLElement);
    const strokeTargets = [
      ...header.querySelectorAll(".menu-button line"),
    ].filter((target) => target instanceof SVGElement);
    const targets = [...colorTargets, ...strokeTargets];
    if (
      immediate ||
      isInitialColor ||
      !hasGsap ||
      reduceMotion
    ) {
      if (hasGsap) gsap.killTweensOf(targets);
      colorTargets.forEach((target) => target.style.setProperty("color", color));
      strokeTargets.forEach((target) => target.style.setProperty("stroke", color));
      return;
    }
    gsap.killTweensOf(targets);
    gsap
      .timeline({ defaults: { duration: 0.3, ease: "expo.out", overwrite: true } })
      .to(colorTargets, { color }, 0)
      .to(strokeTargets, { stroke: color }, 0);
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

  const updateHeader = (scrollY = getPageScroll()) => {
    const routeTransitionActive =
      document.body.classList.contains("is-transitioning") ||
      document.documentElement.classList.contains("route-enter");
    const probeY = scrollY + Math.min(80, window.innerHeight * 0.12);
    const activeSection = toneRanges.find(
      ({ top, bottom }) => top <= probeY && bottom > probeY,
    )?.section;
    const collapsed = scrollY > 100;
    const ink =
      (routeTransitionActive && !routeDestinationReady) ||
      collapsed ||
      activeSection?.dataset.headerTone === "ink";
    const collapsedChanged =
      lastHeaderCollapsed !== undefined && lastHeaderCollapsed !== collapsed;
    const logoBeforeRect =
      collapsedChanged && headerLogo instanceof HTMLElement
        ? headerLogo.getBoundingClientRect()
        : null;
    header.classList.toggle("is-ink", ink);
    header.classList.toggle("is-logo-ink", collapsed);
    header.classList.toggle("is-collapsed", collapsed);
    colorHeader(ink ? "#2f2f2f" : "#ffffff");
    if (activeSection || routeTransitionActive || collapsed) {
      syncHeaderBrandSurface(ink);
    }
    if (collapsedChanged) {
      playHeaderLockupScaleMotion(logoBeforeRect);
    }
    lastHeaderCollapsed = collapsed;

    const pageHeight = document.documentElement.scrollHeight;
    const maxScroll = Math.max(0, pageHeight - window.innerHeight);
    const nextCtaShown =
      scrollY <= window.innerHeight ||
      scrollY >= pageHeight - window.innerHeight * 1.75;
    if (nextCtaShown !== pageState?.floatingCtaShown) {
      if (pageState) pageState.floatingCtaShown = nextCtaShown;
      floatingCta.classList.toggle("show", nextCtaShown);
    }
    if (pageState?.scrollCue instanceof HTMLElement) {
      const cueHidden = scrollY > 200;
      pageState.scrollCue.classList.toggle("is-hidden", cueHidden);
      pageState.scrollCue.tabIndex = cueHidden ? -1 : 0;
    }

    if (routeTransitionActive) {
      header.classList.remove("is-hidden");
    } else if (!document.body.classList.contains("menu-open")) {
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
    lastScrollY = Math.min(scrollY, maxScroll);
    ticking = false;
  };

  const requestHeaderUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => updateHeader());
  };
  const cancelHeaderBrandColorFrames = () => {
    window.cancelAnimationFrame(headerBrandColorFrame);
    window.cancelAnimationFrame(headerBrandColorActivationFrame);
    headerBrandColorFrame = undefined;
    headerBrandColorActivationFrame = undefined;
  };
  const setHeaderBrandInverse = () => {
    cancelHeaderBrandColorFrames();
    header.classList.remove("is-brand-color");
    header.classList.add("is-brand-inverse");
    if (lastHeaderWhiteSurface !== undefined) {
      header.classList.remove("is-brand-color-reset");
      return;
    }
    header.classList.add("is-brand-color-reset");
    void header.offsetWidth;
    headerBrandColorFrame = window.requestAnimationFrame(() => {
      headerBrandColorFrame = undefined;
      header.classList.remove("is-brand-color-reset");
    });
  };
  const setHeaderBrandColor = () => {
    cancelHeaderBrandColorFrames();
    header.classList.remove("is-brand-color-reset", "is-brand-inverse");
    header.classList.add("is-brand-color");
  };
  const replayHeaderBrandColor = () => {
    cancelHeaderBrandColorFrames();
    header.classList.remove("is-brand-color", "is-brand-inverse");
    header.classList.add("is-brand-color-reset");
    void header.offsetWidth;
    headerBrandColorFrame = window.requestAnimationFrame(() => {
      headerBrandColorFrame = undefined;
      header.classList.remove("is-brand-color-reset");
      headerBrandColorActivationFrame = window.requestAnimationFrame(() => {
        headerBrandColorActivationFrame = undefined;
        header.classList.add("is-brand-color");
      });
    });
  };
  function syncHeaderBrandSurface(whiteSurface, { replay = false } = {}) {
    if (whiteSurface) {
      if (replay || lastHeaderWhiteSurface === undefined) {
        replayHeaderBrandColor();
      } else if (
        lastHeaderWhiteSurface !== true ||
        !header.classList.contains("is-brand-color")
      ) {
        setHeaderBrandColor();
      }
    } else if (
      lastHeaderWhiteSurface !== false ||
      !header.classList.contains("is-brand-inverse")
    ) {
      setHeaderBrandInverse();
    }
    lastHeaderWhiteSurface = whiteSurface;
  };
  const prepareRouteDestination = (container) => {
    routeDestinationReady = true;
    const destinationWhiteSurface =
      container?.querySelector("[data-header-tone]")?.dataset.headerTone === "ink";
    syncHeaderBrandSurface(destinationWhiteSurface);
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
    header.classList.add("is-route-pinned", "is-ink");
    routeDestinationReady = false;
    colorHeader("#2f2f2f");
    syncHeaderBrandSurface(true);
    void header.offsetHeight;
    header.style.removeProperty("transition-duration");
  };
  let layoutUpdateFrame;
  const requestLayoutUpdate = () => {
    if (layoutUpdateFrame) return;
    layoutUpdateFrame = window.requestAnimationFrame(() => {
      layoutUpdateFrame = undefined;
      measureDesktopNav();
      pageState?.smoothScroll?.update();
      updateToneRanges();
      updateHeader();
      scheduleTextMaskMeasurement();
    });
  };

  const setPageScroll = (state, scrollY, { instant = false } = {}) => {
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const nextScroll = Math.min(Math.max(0, Number(scrollY) || 0), maxScroll);
    state.smoothScrollY = nextScroll;
    if (state.smoothScroll) {
      window.scrollTo(0, 0);
      // Query navigation may replace a short detail with the much taller grid.
      state.smoothScroll.update();
      state.smoothScroll.scrollTo(nextScroll, {
        duration: 0,
        disableLerp: true,
      });
      // Locomotive 4.1.4 can defer a zero-duration scroll by one frame.
      if (instant) state.smoothScroll.setScroll(0, nextScroll);
      state.smoothScroll.update();
    } else {
      window.scrollTo({ top: nextScroll, left: 0, behavior: instant ? "instant" : "auto" });
    }
    lastScrollY = nextScroll;
    updateToneRanges();
    updateHeader(nextScroll);
  };
  let logicalScrollLock;
  const viewportProbe = document.querySelector(".site-viewport-metrics") || document.createElement("div");
  viewportProbe.className = "site-viewport-metrics";
  viewportProbe.setAttribute("aria-hidden", "true");
  if (!viewportProbe.isConnected) document.body.append(viewportProbe);
  // Resolve the native CSS viewport unit; visible metrics never own persistent geometry.
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
    ...(window.TruongThinhMotion || {}),
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
      window.scrollTo(0, scrollY);
      return;
    }
    window.scrollTo(0, 0);
    state.smoothScroll = new window.LocomotiveScroll({
      el: state.container,
      smooth: true,
      lerp: 0.085,
      multiplier: 0.9,
      smartphone: { smooth: false },
      tablet: { smooth: false, breakpoint: 981 },
    });
    // Locomotive 4.1.4 omits the keyboard start timestamp and only flags stop().
    const smooth = state.smoothScroll;
    const core = smooth.scroll;
    if (core.scrollbarThumb) {
      let thumbMoveFrame;
      const cancelThumbMove = () => {
        window.cancelAnimationFrame(thumbMoveFrame);
        thumbMoveFrame = undefined;
      };
      // Replace the unguarded vendor RAF at the instance boundary, keeping one input path.
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
          // The last reachable CSS pixel must reach the document limit.
          core.instance.delta.y = Math.max(0, Math.min(core.instance.limit.y,
            y >= core.scrollbarHeight - 1 ? core.instance.limit.y
              : y / core.scrollbarHeight * core.instance.limit.y));
        });
      };
      window.addEventListener("mousemove", core.moveScrollBar);
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
        // Discard a thumb-move callback queued immediately before an overlay lock.
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
        core.scrollbarThumb.removeEventListener("mousedown", blockLockedThumb, true);
        destroy();
      };
    }
    state.smoothScroll.on("scroll", ({ scroll }) => {
      state.smoothScrollY = scroll.y;
      window.dispatchEvent(
        new CustomEvent("site:scroll", { detail: { y: scroll.y } }),
      );
      updateHeader(scroll.y);
    });
    state.smoothScroll.update();
    if (logicalScrollLock) state.smoothScroll.stop();
  };

  const clearSmoothScrollStyles = (state, scrollY) => {
    document.documentElement.classList.remove(
      "has-scroll-init",
      "has-scroll-smooth",
      "has-scroll-scrolling",
      "has-scroll-dragging",
    );
    state.container.style.removeProperty("transform");
    state.container.style.removeProperty("will-change");
    state.container.querySelectorAll("[data-scroll]").forEach((element) => {
      element.style.removeProperty("transform");
      element.style.removeProperty("will-change");
    });
    document.body.style.removeProperty("height");
    window.scrollTo(0, scrollY);
  };

  const destroySmoothScroll = (state) => {
    const scrollY = state.smoothScrollY;
    if (state.smoothScroll) {
      state.smoothScroll.stop();
      state.smoothScroll.destroy();
      state.smoothScroll = undefined;
    }
    clearSmoothScrollStyles(state, scrollY);

    let cleanupFrames = 2;
    const finishNativeCleanup = () => {
      if (
        state.smoothScroll ||
        state.abort.signal.aborted ||
        !state.container.isConnected
      ) {
        return;
      }
      clearSmoothScrollStyles(state, scrollY);
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
        // Build-time <picture> wrappers carry deferred variants as data-srcset.
        [image.previousElementSibling, image].forEach((node) => {
          if (!node?.dataset.srcset) return;
          node.srcset = node.dataset.srcset;
          node.removeAttribute("data-srcset");
        });
        image.src = image.dataset.src;
        image.removeAttribute("data-src");
      });
  };

  const watchWhiteOverlayMedia = (state) => {
    state.container
      .querySelectorAll(whiteOverlayMediaSelector)
      .forEach((image) => {
        const reveal = () => {
          if (
            state.abort.signal.aborted ||
            !image.complete ||
            image.naturalWidth === 0
          ) {
            return;
          }
          image.classList.add("is-overlay-media-ready");
        };
        const decode = () => {
          if (typeof image.decode !== "function") {
            reveal();
            return;
          }
          image.decode().then(reveal, reveal);
        };
        if (image.complete && image.naturalWidth > 0) decode();
        else {
          image.addEventListener("load", decode, {
            once: true,
            signal: state.abort.signal,
          });
        }
      });
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
      document.body.classList.add("motion-paused");
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
        "residential",
        "commercial",
      ]).has(state.container.dataset.barbaNamespace);
      let scrollCueTimeline;
      const buildScrollCueTimeline = () => {
        if (!(scrollCueLabel instanceof HTMLElement)) return;
        scrollCueTimeline?.kill();
        if (scrollCueTimeline) timelines.delete(scrollCueTimeline);
        scrollCueSplit?.revert();
        const characters = splitCueRoute && SplitText
          ? (scrollCueSplit = SplitText.create(scrollCueLabel, {
              type: "chars",
              charsClass: "scroll-cue-char",
              aria: "auto",
            })).chars
          : [...scrollCueLabel.textContent].flatMap((character, index) => {
              if (index === 0) scrollCueLabel.replaceChildren();
              // Spaces stay plain text, matching SplitText's char split on the other routes.
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
          gsap.set(group.querySelectorAll(".line-mask > span"), { y: "2em" }),
        );
        if (heritageLines.length) gsap.set(heritageLines, { y: "2em" });
        portalTitles.forEach(({ card, lines }) =>
          gsap.set(
            lines.length ? lines : card.querySelectorAll(".portal-copy strong"),
            { y: "2em" },
          ),
        );
      }

      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target;
          if (target.matches(".reveal")) {
            gsap.to(target, {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: "power3.out",
            });
          } else {
            gsap.to(target.querySelectorAll(".line-mask > span"), {
              y: "-0.1em",
              duration: 1.9,
              ease: "power4.out",
              stagger: 0.1,
            });
            target.closest(".legacy-copy")?.querySelector(":scope > p")?.classList.add("is-inview");
          }
          observer.unobserve(target);
        });
      });
      observers.push(revealObserver);
      if (!settledStartup) {
        revealItems.forEach((item) => revealObserver.observe(item));
        revealGroups.forEach((group) => revealObserver.observe(group));
      }

      const heritageTextObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const line = entry.target.querySelector(".heritage-line");
          if (line) {
            gsap.fromTo(
              line,
              { y: "2em" },
              {
                y: "-0.1em",
                duration: 1.9,
                delay: line.classList.contains("heritage-line--delay") ? 0.3 : 0,
                ease: "power4.out",
              },
            );
          }
          observer.unobserve(entry.target);
        });
      });
      observers.push(heritageTextObserver);
      if (!settledStartup) {
        heritageTextMasks.forEach((mask) => heritageTextObserver.observe(mask));
      }

      const classObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-inview");
          observer.unobserve(entry.target);
        });
      });
      observers.push(classObserver);
      if (!settledStartup) {
        heritageImages.forEach((image) => classObserver.observe(image));
        if (projectTrack) classObserver.observe(projectTrack);
      }

      const portalTitleObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const portal = portalTitles.find(({ target }) => target === entry.target);
          if (portal) {
            gsap.to(
              portal.lines.length
                ? portal.lines
                : portal.card.querySelectorAll(".portal-copy strong"),
              {
                y: "-0.1em",
                duration: 1.9,
                delay: (portal.index % 3) * 0.3,
                ease: "power4.out",
              },
            );
            observer.unobserve(entry.target);
          }
        });
      });
      observers.push(portalTitleObserver);
      if (!settledStartup) {
        portalTitles.forEach(({ target }) => {
          if (target) portalTitleObserver.observe(target);
        });
      }

      const portalSubtitleObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          portalSubtitles
            .find(({ target }) => target === entry.target)
            ?.card.classList.add("is-subtitle-inview");
          observer.unobserve(entry.target);
        });
      });
      observers.push(portalSubtitleObserver);
      if (!settledStartup) {
        portalSubtitles.forEach(({ target }) => {
          if (target) portalSubtitleObserver.observe(target);
        });
      }

      const intro = gsap.timeline({ defaults: { ease: "power4.out" } });
      timelines.add(intro);
      // Direct loads play the intro under the veil; only soft navigation skips it.
      if (!settledStartup && !softNavigation) {
        intro
          .from(header.querySelector("#header-logo"), { scale: 0, duration: 1.5 })
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
      // Start on the next frame so the mount's long task does not skip the intro's opening.
      intro.pause();
      window.requestAnimationFrame(() => intro.play());
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
            { scale: 1, duration: 5, ease: "sine.inOut" },
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
          const nextImage = next.querySelector("img");
          timeline
            .set(nextImage, { scale: 1.06 }, introOffset + 4.2)
            .to(
              next,
              { autoAlpha: 1, duration: 1.6, ease: "power2.inOut" },
              introOffset + 4.2,
            )
            .to(
              slide,
              { autoAlpha: 0, duration: 1.6, ease: "power2.inOut" },
              introOffset + 4.2,
            )
            .call(() => startSlide(nextIndex), null, introOffset + 5);
        }
      };
      const syncMotionState = () => {
        const pagePaused = userPaused || document.hidden;
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
          const labelNode = motionToggle.querySelector("[data-motion-label]");
          if (labelNode) {
            labelNode.textContent =
              currentLanguage === "en"
                ? userPaused
                  ? "Play"
                  : "Pause"
                : userPaused
                  ? "Chạy"
                  : "Dừng";
          }
        }
      };
      const toggleMotion = () => {
        userPaused = !userPaused;
        syncMotionState();
      };
      const isInside = (section, element) =>
        Boolean(section && element && (section === element || section.contains(element)));
      state.replayMotion = (section) => {
        if (!section) return false;
        const sectionReveals = revealItems.filter((item) => isInside(section, item));
        const sectionGroups = revealGroups.filter((group) => isInside(section, group));
        const sectionLegacyLabels = legacyLabels.filter((label) =>
          isInside(section, label),
        );
        const sectionHeritageLines = heritageLines.filter((line) =>
          isInside(section, line),
        );
        const sectionHeritageImages = heritageImages.filter((image) =>
          isInside(section, image),
        );
        const sectionPortalTitles = portalTitles.filter(({ card }) =>
          isInside(section, card),
        );
        const sectionPortalSubtitles = portalSubtitles.filter(({ card }) =>
          isInside(section, card),
        );
        const sectionHeroWords = heroWords.filter((word) => isInside(section, word));
        const sectionProjectTrack = isInside(section, projectTrack)
          ? projectTrack
          : null;
        const hasSectionMotion = Boolean(
          sectionReveals.length ||
            sectionGroups.length ||
            sectionLegacyLabels.length ||
            sectionHeritageLines.length ||
            sectionHeritageImages.length ||
            sectionPortalTitles.length ||
            sectionPortalSubtitles.length ||
            sectionHeroWords.length ||
            sectionProjectTrack ||
            isInside(section, state.hero),
        );
        if (!hasSectionMotion) return false;
        const tweenTargets = [
          ...sectionReveals,
          ...sectionGroups.flatMap((group) => [
            ...group.querySelectorAll(".line-mask > span"),
          ]),
          ...sectionHeritageLines,
          ...sectionPortalTitles.flatMap(({ card, lines }) => [
            ...(lines.length
              ? lines
              : card.querySelectorAll(".portal-copy strong")),
          ]),
          ...sectionHeroWords,
        ];
        gsap.killTweensOf(tweenTargets);
        if (sectionReveals.length) {
          gsap.set(sectionReveals, { opacity: 0, y: 60 });
        }
        sectionGroups.forEach((group) =>
          gsap.set(group.querySelectorAll(".line-mask > span"), { y: "2em" }),
        );
        sectionLegacyLabels.forEach((label) => label.classList.remove("is-inview"));
        if (sectionHeritageLines.length) {
          gsap.set(sectionHeritageLines, { y: "2em" });
        }
        sectionPortalTitles.forEach(({ card, lines }) =>
          gsap.set(
            lines.length ? lines : card.querySelectorAll(".portal-copy strong"),
            { y: "2em" },
          ),
        );
        if (sectionHeroWords.length) gsap.set(sectionHeroWords, { opacity: 0 });
        sectionHeritageImages.forEach((image) => image.classList.remove("is-inview"));
        sectionPortalSubtitles.forEach(({ card }) =>
          card.classList.remove("is-subtitle-inview"),
        );
        sectionProjectTrack?.classList.remove("is-inview");

        window.requestAnimationFrame(() => {
          if (sectionReveals.length) {
            gsap.to(sectionReveals, {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: "power3.out",
            });
          }
          sectionGroups.forEach((group) =>
            gsap.to(group.querySelectorAll(".line-mask > span"), {
              y: "-0.1em",
              duration: 1.9,
              ease: "power4.out",
              stagger: 0.1,
            }),
          );
          sectionLegacyLabels.forEach((label) => label.classList.add("is-inview"));
          sectionHeritageLines.forEach((line) =>
            gsap.to(line, {
              y: "-0.1em",
              duration: 1.9,
              delay: line.classList.contains("heritage-line--delay") ? 0.3 : 0,
              ease: "power4.out",
            }),
          );
          sectionPortalTitles.forEach(({ card, index, lines }) =>
            gsap.to(
              lines.length ? lines : card.querySelectorAll(".portal-copy strong"),
              {
                y: "-0.1em",
                duration: 1.9,
                delay: (index % 3) * 0.3,
                ease: "power4.out",
              },
            ),
          );
          if (sectionHeroWords.length) {
            gsap.to(sectionHeroWords, {
              opacity: 1,
              duration: 1,
              stagger: 0.2,
              ease: "expo.out",
              clearProps: "opacity",
            });
          }
          sectionHeritageImages.forEach((image) => image.classList.add("is-inview"));
          sectionPortalSubtitles.forEach(({ card }) =>
            card.classList.add("is-subtitle-inview"),
          );
          sectionProjectTrack?.classList.add("is-inview");
          if (carouselEnabled && isInside(section, state.hero)) {
            heroTimelines.forEach((timeline) => {
              timeline.kill();
              timelines.delete(timeline);
            });
            heroTimelines.clear();
            if (slides.length) gsap.set(slides, { autoAlpha: 0 });
            if (slides[0]) gsap.set(slides[0], { autoAlpha: 1 });
            holdSettledSlide = false;
            startSlide(0);
            syncMotionState();
          }
        });
        return hasSectionMotion;
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
      state.replayMotion = undefined;
      state.stopCarousel?.();
      observers.forEach((observer) => observer.disconnect());
      timelines.forEach((timeline) => timeline.kill());
      scrollCueSplit?.revert();
      context.revert();
    };
  };

  const unmountPage = () => {
    if (!pageState) return;
    const state = pageState;
    state.abort.abort();
    state.motionCleanup?.();
    window.TruongThinhDetail?.unmount();
    if (state.idleCallback && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(state.idleCallback);
    }
    if (state.heroTimer) window.clearTimeout(state.heroTimer);
    destroySmoothScroll(state);
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

    const heroMedia = container.querySelector(".hero-slides");
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

    watchWhiteOverlayMedia(state);
    initSmoothScroll(state, state.smoothScrollY);
    setPageScroll(state, state.smoothScrollY, { instant: true });
    await window.TruongThinhDetail?.mount(container, { settled: settledStartup, softNavigation });
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

  const resetMenuVisuals = () => {
    menuTimeline?.kill();
    menuPageTween?.kill();
    menuTimeline = undefined;
    menuPageTween = undefined;
    if (!hasGsap) return;
    window.gsap.set(getPageChildren(), {
      clearProps: "transform,transformOrigin",
    });
    window.gsap.set(dialog.querySelectorAll(".menu-shutters i"), {
      clearProps: "height",
    });
    window.gsap.set(
      [
        dialog.querySelector(".menu-brand"),
        dialog.querySelector(".menu-language"),
        dialog.querySelector(".menu-appointment"),
        dialog.querySelector(".menu-close__icon"),
        dialog.querySelector(".menu-nav"),
        ...dialog.querySelectorAll(
          ".menu-group, .menu-group__number, .menu-group__title, .menu-option",
        ),
      ].filter(Boolean),
      { clearProps: "transform,opacity,visibility" },
    );
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
    header.classList.remove("is-hidden");
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
      resetMenuVisuals();
      dialog.querySelectorAll(".menu-shutters i").forEach((shutter) => {
        shutter.style.height = "100vh";
      });
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
      transformOrigin: "50vw 50vh",
      onComplete: () => finishClose(restoreFocus),
    });
    menuCloseTimer = window.setTimeout(() => finishClose(restoreFocus), 1750);
    return menuClosePromise;
  };

  const openMenu = () => {
    if (dialog.open || routeInFlight) return;
    if (pageState) pageState.menuContextSection = getDominantSection();
    dialog.showModal();
    dialog.focus({ preventScroll: true });
    document.body.classList.add("menu-open");
    window.requestAnimationFrame(() => {
      if (dialog.open && document.body.classList.contains("menu-open")) {
        dialog.classList.add("is-active");
      }
    });
    openButton.setAttribute("aria-expanded", "true");
    header.classList.remove("is-hidden");
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
    resetMenuVisuals();
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
    window.gsap.set(shutters, { height: 0 });
    window.gsap.set(menuBrand, { y: -140, opacity: 0 });
    window.gsap.set(menuLanguageItems, { y: -20, opacity: 0 });
    window.gsap.set(menuAppointmentItems, { y: -20, opacity: 0 });
    window.gsap.set(menuCloseIcon, { opacity: 0, rotation: 90 });
    window.gsap.set(menuNav, { opacity: 0 });
    window.gsap.set(menuGroups, { y: -140, yPercent: 0, opacity: 0 });
    window.gsap.set(menuDetailItems, { y: -20, yPercent: 0, opacity: 0 });
    menuPageTween = window.gsap.to(getPageChildren(), {
      scale: 0.9,
      duration: 0.7,
      ease: "power2.out",
      transformOrigin: "50vw 50vh",
    });
    menuTimeline = window.gsap
      .timeline({
        paused: true,
        onComplete: () => closeButton.focus({ preventScroll: true }),
      })
      .fromTo(
        shutters,
        { height: 0 },
        { height: "100vh", duration: 0.6, ease: "power4.inOut", stagger: 0.15 },
        0,
      )
      .fromTo(menuBrand, { y: -140, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out" }, 1.15)
      .fromTo(menuLanguageItems, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "expo.out" }, 1.15)
      .fromTo(menuAppointmentItems, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "expo.out" }, 1.15)
      .fromTo(menuCloseIcon, { opacity: 0, rotation: 90 }, { opacity: 1, rotation: 0, duration: 0.6, ease: "expo.out" }, 1.4)
      .fromTo(menuNav, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 1.05)
      .fromTo(menuGroups, { y: -140, yPercent: 0, opacity: 0 }, { y: 0, yPercent: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.02 }, 1.1)
      .fromTo(menuDetailItems, { y: -20, yPercent: 0, opacity: 0 }, { y: 0, yPercent: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.03 }, 1.35)
      .timeScale(1.15)
      .play(0);
  };

  const setRouteVeil = (opacity) => {
    if (hasGsap) window.gsap.set(routeVeil, { opacity });
    else routeVeil.style.opacity = String(opacity);
  };

  const clearRouteEntry = () => {
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
    setRouteVeil(0);
    pageState?.smoothScroll?.start();
  };

  const coverRoute = (waitFor) => {
    routeInFlight = true;
    routeMountReady = false;
    pinHeaderForRoute();
    document.body.classList.add("is-transitioning");
    pageState?.smoothScroll?.stop();
    const fade = new Promise((resolve) => {
      if (!hasGsap || reduceMotion) {
        setRouteVeil(1);
        resolve();
        return;
      }
      routeTimeline?.kill();
      routeTimeline = window.gsap.to(routeVeil, {
        opacity: 1,
        duration: 0.75,
        ease: "power4.inOut",
        onComplete: resolve,
      });
    });
    return Promise.all([fade, Promise.resolve(waitFor)]);
  };

  const playRouteEnter = () => {
    if (!hasGsap || reduceMotion) {
      clearRouteEntry();
      return Promise.resolve();
    }
    routeTimeline?.kill();
    header.classList.remove("is-hidden");
    header.classList.add("is-route-pinned");
    document.body.classList.add("is-transitioning");
    setRouteVeil(1);
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
      && /^\/(?:vi|en)\/advertising-products\/?$/.test(url.pathname)
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
    [...current.attributes].forEach(({ name }) => {
      if (name !== "open" && !next.hasAttribute(name)) current.removeAttribute(name);
    });
    [...next.attributes].forEach(({ name, value }) => {
      if (name !== "open") current.setAttribute(name, value);
    });
  };

  const syncElementTree = (current, next) => {
    if (!current || !next || current.tagName !== next.tagName) return false;
    syncAttributes(current, next);
    const currentChildren = [...current.children];
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

    const persistentReady = persistentSelectors.every((selector) =>
      syncElementTree(
        document.querySelector(selector),
        nextDocument.querySelector(selector),
      ),
    );
    if (!persistentReady) return false;
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
    const canonical = /^\/(vi|en)\/(?:(about|residential|commercial|advertising-products)\/)?$/;
    const currentRoute = canonical.exec(normalizePathname(window.location.pathname));
    const nextRoute = canonical.exec(normalizePathname(url.pathname));
    if (
      currentRoute &&
      nextRoute &&
      currentRoute[1] === nextRoute[1] &&
      (currentRoute[2] === "about") !== (nextRoute[2] === "about")
    ) {
      return true;
    }
    return (
      url.pathname === window.location.pathname &&
      url.search === window.location.search
    );
  };

  const updateLocaleLinks = (language) => {
    document.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      const optionLanguage = link.dataset.languageOption;
      const targetLanguage = optionLanguage === "en" ? "en" : optionLanguage === "vi" ? "vi" : language;
      const url = new URL(href, window.location.href);
      const suffix = url.pathname.replace(/^\/(?:vi|en)(?=\/|$)/, "") || "/";
      url.pathname = `/${targetLanguage}${suffix}`;
      link.setAttribute("href", `${url.pathname}${url.search}${url.hash}`);
    });
  };

  const updateLocaleHead = (url, language) => {
    const canonical = new URL(url.href);
    canonical.search = "";
    canonical.hash = "";
    document.querySelector('link[rel="canonical"]')?.setAttribute(
      "href",
      canonical.href,
    );
    document
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .forEach((link) => {
        const locale = link.hreflang === "x-default" ? "vi" : link.hreflang;
        if (locale !== "vi" && locale !== "en") return;
        const alternate = new URL(canonical.href);
        alternate.pathname = alternate.pathname.replace(
          /^\/(?:vi|en)(?=\/|$)/,
          `/${locale}`,
        );
        link.href = alternate.href;
      });
    document
      .querySelector('meta[property="og:locale"]')
      ?.setAttribute("content", language === "en" ? "en_US" : "vi_VN");
    document
      .querySelector('meta[property="og:url"]')
      ?.setAttribute("content", canonical.href);
  };

  const nextFrame = () =>
    new Promise((resolve) => window.requestAnimationFrame(resolve));

  const replayVisibleSection = async (section) => {
    const pageReplayed = Boolean(pageState?.replayMotion?.(section));
    const detailReplayed = Boolean(
      window.TruongThinhDetail?.replaySection?.(section),
    );
    const replayed = pageReplayed || detailReplayed;
    await nextFrame();
    await nextFrame();
    return {
      detailReplayed,
      pageReplayed,
      reducedMotion: reduceMotion,
      replayed: Boolean(replayed),
      section,
    };
  };

  const switchLocaleRoute = (language) => {
    const routeLocale = getRouteLocale();
    if (routeLocale !== "vi" && routeLocale !== "en") return Promise.resolve(false);
    if (localeSwitchPromise) return localeSwitchPromise;
    const nextLanguage = language === "en" ? "en" : "vi";
    localeSwitchPromise = (async () => {
      const section = pageState?.menuContextSection || getDominantSection();
      const scrollY = Math.max(0, getPageScroll());
      await closeMenu(false);
      if (nextLanguage === currentLanguage) return true;

      const url = new URL(window.location.href);
      const suffix = url.pathname.replace(/^\/(?:vi|en)(?=\/|$)/, "") || "/";
      url.pathname = `/${nextLanguage}${suffix}`;
      url.hash = "";
      if (window.barba?.history?.update && window.barba.history.store) {
        window.barba.history.update({
          scroll: { x: window.scrollX, y: scrollY },
          url: url.href,
        });
        window.barba.history.store({});
        window.history.replaceState(window.history.state, "", url.href);
      } else {
        window.history.replaceState(window.history.state, "", url.href);
      }
      document.documentElement.dataset.routeLocale = nextLanguage;
      const previousOverflowAnchor = document.documentElement.style.overflowAnchor;
      document.documentElement.style.overflowAnchor = "none";
      let replay;
      try {
        await applyLanguage(nextLanguage);
        updateLocaleLinks(nextLanguage);
        updateLocaleHead(url, nextLanguage);
        await nextFrame();
        await nextFrame();
        replay = await replayVisibleSection(section);
        pageState?.smoothScroll?.update();
        setPageScroll(pageState, scrollY);
        await nextFrame();
        await nextFrame();
      } finally {
        document.documentElement.style.overflowAnchor = previousOverflowAnchor;
      }
      setPageScroll(pageState, scrollY);
      requestLayoutUpdate();
      window.dispatchEvent(
        new CustomEvent("site:section-replay", { detail: replay }),
      );
      return true;
    })().finally(() => {
      if (pageState) pageState.menuContextSection = undefined;
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
        && !new URL(window.location.href).searchParams.has("photo");
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
        && destination.pathname === window.location.pathname
        && destination.search === ""
        && destination.search !== window.location.search
        && window.TruongThinhAdvertising?.getAdapter?.()
      ) {
        const navigateToAdvertisingParent = () => {
          if (window.TruongThinhAdvertising?.navigateQuery?.(
            destination.href,
            { reason: "navbar" },
          )) {
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
          void closeMenu(false).then(navigateToAdvertisingParent);
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
        if (
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
  smoothMedia.addEventListener(
    "change",
    () => {
      if (!pageState) return;
      const scrollY = getPageScroll();
      destroySmoothScroll(pageState);
      initSmoothScroll(pageState, scrollY);
      setPageScroll(pageState, scrollY);
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
  measureDesktopNav();
  const directUrl = new URL(window.location.href);
  window.history.replaceState(
    window.history.state,
    "",
    `${directUrl.pathname}${directUrl.search}`,
  );
  let directScroll = window.scrollY;
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
      `[data-advertising-filter="${CSS.escape(intent.filter)}"]`,
    );
    if (control instanceof HTMLElement) {
      control.click();
      return;
    }
    hardNavigate(intent.href);
  };
  document.addEventListener("click", (event) => {
    if (!advertisingFilterQueueEnabled || window.TruongThinhAdvertising?.getAdapter?.()) return;
    const control = event.target instanceof Element
      ? event.target.closest("[data-advertising-filter]")
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
    if (
      destination.origin !== window.location.origin
      || normalizePathname(destination.pathname) !== normalizePathname(window.location.pathname)
    ) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pendingAdvertisingFilter = {
      filter: control.dataset.advertisingFilter || "all",
      href: destination.href,
    };
  }, { capture: true, signal: runtimeAbort.signal });
  if (enteredViaRoute) prepareRouteDestination(directContainer);
  const directMount = mountPage(directContainer, {
    scrollY: directScroll,
    settledStartup,
  });
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
    directContainer.dataset.advertisingFallback = "failed";
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
    const advertising = window.TruongThinhAdvertising;
    const previousHref = advertising?.getCurrentHref?.() || window.barba?.history?.current?.url;
    const nextHref = window.location.href;
    if (!advertising?.canHandlePopState?.(previousHref, nextHref)) {
      // Barba forces a native load for traversal during a running transition.
      if (window.barba?.transitions?.isRunning
        && /^\/(?:vi|en)\/advertising-products\/?$/.test(location.pathname)) {
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
              releaseHeaderInteractionState();
              pinHeaderForRoute();
              routeMountReady = false;
              rememberCurrentScroll(data);
            },
            async leave(data) {
              await coverRoute(closeMenu(false));
              unmountPage();
              data.current.container.hidden = true;
            },
            async beforeEnter(data) {
              if (!syncDocumentState(data.next.html)) {
                const fallbackUrl = new URL(
                  pendingLocaleNavigation?.url.href || data.next.url.href,
                  window.location.href,
                );
                hardNavigate(fallbackUrl.href);
                return;
              }
              if (data.next.container.dataset.barbaNamespace === "advertising-products") {
                try {
                  await window.TruongThinhDetail?.ensureAdvertisingDependencies?.(data.next.url.href);
                } catch (error) {
                  console.error("[advertising-products] Barba dependency readiness failed", error);
                  hardNavigate(data.next.url.href, data.trigger);
                  return;
                }
              }
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
    } catch {
      clearRouteEntry();
    }
  }

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
      header.classList.remove("is-hidden");
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
