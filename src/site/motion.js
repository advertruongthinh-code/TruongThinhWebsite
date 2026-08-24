(() => {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const hasGsap = typeof window.gsap !== "undefined";
  const smoothMedia = window.matchMedia("(min-width: 981px)");
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
    ".hero-slide img, .about-hero__media img, .service-portal > img, .detail-gallery__item > img, .detail-cta > img, .legacy-closer > img";
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
  let currentHeaderColor = "";
  let routeTimeline;
  let routeInFlight = false;
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
    pageState?.smoothScroll ? pageState.smoothScrollY : window.scrollY;
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
    const fillTargets = [...header.querySelectorAll(".brand-mark path")];
    const colorTargets = [
      header.querySelector(".brand-copy"),
      ...header.querySelectorAll(".desktop-nav a"),
      header.querySelector(".menu-button"),
    ].filter(Boolean);
    const strokeTargets = [...header.querySelectorAll(".menu-button line")];
    const targets = [...fillTargets, ...colorTargets, ...strokeTargets];
    const routeTransitionActive =
      document.body.classList.contains("is-transitioning") ||
      document.documentElement.classList.contains("route-enter");
    if (
      immediate ||
      isInitialColor ||
      routeTransitionActive ||
      !hasGsap ||
      reduceMotion
    ) {
      if (hasGsap) window.gsap.killTweensOf(targets);
      fillTargets.forEach((target) => target.style.setProperty("fill", color));
      colorTargets.forEach((target) => target.style.setProperty("color", color));
      strokeTargets.forEach((target) => target.style.setProperty("stroke", color));
      return;
    }
    window.gsap.killTweensOf(targets);
    window.gsap
      .timeline({ defaults: { duration: 0.3, ease: "expo.out", overwrite: true } })
      .to(fillTargets, { fill: color }, 0)
      .to(colorTargets, { color }, 0)
      .to(strokeTargets, { stroke: color }, 0);
  };

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
      routeTransitionActive ||
      collapsed ||
      activeSection?.dataset.headerTone === "ink";
    header.classList.toggle("is-ink", ink);
    header.classList.toggle("is-collapsed", collapsed);
    colorHeader(ink ? "#2f2f2f" : "#ffffff");

    const pageHeight = document.documentElement.scrollHeight;
    const nextCtaShown =
      scrollY <= window.innerHeight ||
      scrollY >= pageHeight - window.innerHeight * 1.75;
    if (nextCtaShown !== pageState?.floatingCtaShown) {
      if (pageState) pageState.floatingCtaShown = nextCtaShown;
      floatingCta.classList.toggle("show", nextCtaShown);
    }

    if (routeTransitionActive) {
      header.classList.remove("is-hidden");
    } else if (!document.body.classList.contains("menu-open")) {
      const direction =
        scrollY > lastScrollY
          ? "down"
          : scrollY < lastScrollY
            ? "up"
            : lastDirection;
      if (direction && direction !== lastDirection) {
        directionStartY = scrollY;
        lastDirection = direction;
      }
      const isMiddle =
        scrollY > window.innerHeight * 0.5 &&
        scrollY < pageHeight - window.innerHeight * 1.25;
      if (!isMiddle) header.classList.remove("is-hidden");
      else if (direction === "down" && scrollY - directionStartY > 150) {
        header.classList.add("is-hidden");
      } else if (direction === "up" && directionStartY - scrollY > 150) {
        header.classList.remove("is-hidden");
      }
    }
    lastScrollY = scrollY;
    ticking = false;
  };

  const requestHeaderUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => updateHeader());
  };
  const pinHeaderForRoute = () => {
    header.style.transitionDuration = "0s";
    header.classList.remove("is-hidden");
    header.classList.add("is-route-pinned", "is-ink");
    colorHeader("#2f2f2f");
    void header.offsetHeight;
    header.style.removeProperty("transition-duration");
  };
  const requestLayoutUpdate = () =>
    window.requestAnimationFrame(() => {
      pageState?.smoothScroll?.update();
      updateToneRanges();
      updateHeader();
      scheduleTextMaskMeasurement();
    });

  const setPageScroll = (state, scrollY) => {
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const nextScroll = Math.min(Math.max(0, Number(scrollY) || 0), maxScroll);
    state.smoothScrollY = nextScroll;
    if (state.smoothScroll) {
      window.scrollTo(0, 0);
      state.smoothScroll.scrollTo(nextScroll, {
        duration: 0,
        disableLerp: true,
      });
      state.smoothScroll.update();
    } else {
      window.scrollTo(0, nextScroll);
    }
    lastScrollY = nextScroll;
    updateToneRanges();
    updateHeader(nextScroll);
  };

  const initSmoothScroll = (state, scrollY) => {
    if (
      reduceMotion ||
      !smoothMedia.matches ||
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
      tablet: { smooth: false },
    });
    state.smoothScroll.on("scroll", ({ scroll }) => {
      state.smoothScrollY = scroll.y;
      updateHeader(scroll.y);
    });
    state.smoothScroll.update();
  };

  const destroySmoothScroll = (state) => {
    if (!state.smoothScroll) return;
    const scrollY = state.smoothScrollY;
    state.smoothScroll.stop();
    state.smoothScroll.destroy();
    state.smoothScroll = undefined;
    document.documentElement.classList.remove(
      "has-scroll-init",
      "has-scroll-smooth",
      "has-scroll-scrolling",
      "has-scroll-dragging",
    );
    state.container.style.transform = "";
    state.container.style.willChange = "";
    document.body.style.height = "";
    window.scrollTo(0, scrollY);
  };

  const hydrateDeferredHeroImages = (state) => {
    state.container
      .querySelectorAll(".hero-slide img[data-src]")
      .forEach((image) => {
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

  const mountPageMotion = (state, enteredViaRoute, settledStartup = false) => {
    const clientLogoTrack = state.container.querySelector(
      ".client-logo-marquee__track",
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
    const context = gsap.context(() => {
      const selectAll = (selector) => [...state.container.querySelectorAll(selector)];
      const revealItems = selectAll(".reveal");
      const revealGroups = selectAll(".legacy-copy h2");
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
      const heritageLines = heritageTextMasks
        .map((mask) => mask.querySelector(".heritage-line"))
        .filter(Boolean);
      if (settledStartup) {
        if (revealItems.length) gsap.set(revealItems, { opacity: 1, y: 0 });
        revealGroups.forEach((group) =>
          gsap.set(group.querySelectorAll(".line-mask > span"), { y: "-0.1em" }),
        );
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
            });
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
      if (!settledStartup && !enteredViaRoute) {
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
      const slides = selectAll(".hero-slide");
      let heroIntroPending = Boolean(
        state.hero?.hasAttribute("data-hero-intro") &&
          !settledStartup &&
          !enteredViaRoute,
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
        const introOffset = heroIntroPending && index === 0 ? 1.3 : 0;
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
            }),
          );
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
          if (isInside(section, state.hero)) {
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
      window.addEventListener("languagechange", syncMotionState, {
        signal: state.abort.signal,
      });
      startSlide(0);
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

  const mountPage = (
    container,
    {
      enteredViaRoute = false,
      scrollY = 0,
      settledStartup = false,
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
    setPageScroll(state, state.smoothScrollY);
    window.TruongThinhDetail?.mount(container, { settled: settledStartup });
    state.motionCleanup = mountPageMotion(
      state,
      enteredViaRoute,
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

    return true;
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

  const finishClose = (restoreFocus = true) => {
    window.clearTimeout(menuCloseTimer);
    menuCloseTimer = undefined;
    if (dialog.open) dialog.close();
    dialog.classList.remove("is-active");
    document.body.classList.remove("menu-open");
    openButton.setAttribute("aria-expanded", "false");
    header.classList.remove("is-hidden");
    pageState?.smoothScroll?.start();
    if (!hasGsap || reduceMotion) resetMenuVisuals();
    const resolve = resolveMenuClose;
    resolveMenuClose = undefined;
    menuClosePromise = undefined;
    resolve?.();
    if (restoreFocus && !routeInFlight) openButton.focus({ preventScroll: true });
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
    const menuCoverageAt = 0.6 + Math.max(0, shutters.length - 1) * 0.15;
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
      .fromTo(menuBrand, { y: -140, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out" }, menuCoverageAt)
      .fromTo(menuLanguageItems, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "expo.out" }, menuCoverageAt + 0.3)
      .fromTo(menuAppointmentItems, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "expo.out" }, menuCoverageAt + 0.3)
      .fromTo(menuCloseIcon, { opacity: 0, rotation: 90 }, { opacity: 1, rotation: 0, duration: 0.6, ease: "expo.out" }, menuCoverageAt + 0.45)
      .fromTo(menuNav, { opacity: 0 }, { opacity: 1, duration: 0.6 }, menuCoverageAt)
      .fromTo(menuGroups, { y: -140, yPercent: 0, opacity: 0 }, { y: 0, yPercent: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.02 }, menuCoverageAt)
      .fromTo(menuDetailItems, { y: -20, yPercent: 0, opacity: 0 }, { y: 0, yPercent: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.03 }, menuCoverageAt + 0.5)
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
    pinHeaderForRoute();
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

  const hardNavigate = (destination) => {
    if (hardFallbackPending) return;
    hardFallbackPending = true;
    try {
      window.sessionStorage.setItem("tt-route", "1");
    } catch {}
    const url = new URL(destination, window.location.href);
    url.hash = "";
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
        applyLanguage(nextLanguage);
        updateLocaleLinks(nextLanguage);
        updateLocaleHead(url, nextLanguage);
        await Promise.resolve(document.fonts?.ready).catch(() => undefined);
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
      if (
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
    "pointermove",
    (event) => header.classList.toggle("forceShow", event.screenY <= 350),
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
  document.fonts?.addEventListener("loadingdone", scheduleTextMaskMeasurement, {
    signal: runtimeAbort.signal,
  });
  window.addEventListener("load", requestLayoutUpdate, {
    once: true,
    signal: runtimeAbort.signal,
  });

  setLanguageFromDocument();
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
  mountPage(directContainer, {
    enteredViaRoute,
    scrollY: directScroll,
    settledStartup,
  });

  if (enteredViaRoute) playRouteEnter();
  else setRouteVeil(0);

  if (window.barba) {
    try {
      window.barba.init({
        preventRunning: true,
        timeout: 15_000,
        prefetchIgnore: true,
        prevent: shouldPreventBarba,
        requestError: (_trigger, _action, url) => {
          const fallbackUrl = new URL(
            pendingLocaleNavigation?.url.href || url,
            window.location.href,
          );
          clearPendingLocaleNavigation();
          hardNavigate(fallbackUrl.href);
          return false;
        },
        transitions: [
          {
            name: "persistent-shell",
            sync: false,
            beforeLeave(data) {
              pinHeaderForRoute();
              rememberCurrentScroll(data);
            },
            async leave(data) {
              await coverRoute(closeMenu(false));
              unmountPage();
              data.current.container.hidden = true;
            },
            beforeEnter(data) {
              if (!syncDocumentState(data.next.html)) {
                const fallbackUrl = new URL(
                  pendingLocaleNavigation?.url.href || data.next.url.href,
                  window.location.href,
                );
                hardNavigate(fallbackUrl.href);
                return;
              }
              const nextUrl = new URL(data.next.url.href, window.location.href);
              restorePendingLocaleUrl(nextUrl);
              const scrollY = resolveNextScroll(data);
              mountPage(data.next.container, {
                enteredViaRoute: true,
                scrollY,
              });
            },
            async enter() {
              await playRouteEnter();
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
      if (!event.persisted) return;
      hardFallbackPending = false;
      routeInFlight = false;
      finishClose(false);
      clearRouteEntry();
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
