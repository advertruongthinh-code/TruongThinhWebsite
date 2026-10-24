(() => {
  const reduceMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  const reduceMotion = reduceMotionQuery.matches;
  const { gsap, SplitText } = window;
  const hasGsap = typeof gsap !== "undefined";
  const smoothMedia = window.matchMedia("(min-width: 981px)");
  const headerHoverMedia = window.matchMedia(
    "(any-hover: hover) and (any-pointer: fine)",
  );
  // Điện thoại cả dọc lẫn ngang: header đi theo quãng cuộn (phone-header-scroll R1).
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
  // Trang gốc Advertising và trang cụm, sản phẩm (taxonomy R4) cùng một trang masonry.
  const isAdvertisingPath = (pathname) =>
    /^\/(?:vi|en)\/advertising-products(?:\/(?:[^/]+\/){0,2})?$/.test(pathname);
  // Detail: trang card (media-seo R1) hoặc ?photo= cũ.
  const isAdvertisingPhotoUrl = (url) =>
    url.searchParams.has("photo") || /^\/(?:vi|en)\/advertising-products\/p\//.test(url.pathname);
  const localeScrollStateKey = (url) =>
    `tt-locale-scroll:${url.pathname}${url.search}`;
  const textMaskSelector =
    ".hero-line-mask, .line-mask, .heritage-text, .portal-title-mask, .portal-title__quiet, .portal-title__strong, .detail-line, .motion-line-mask";
  const whiteOverlayMediaSelector =
    ".hero-slide img, .about-hero__media img, :is(.service-portal, .detail-cta, .legacy-closer) > img, :is(.service-portal, .detail-cta, .legacy-closer) > picture > img";
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
  // Mark cỡ nhỏ (brand.md Logo): header, menu dựng lại 4 dải theo lưới device pixel để đáy
  // nằm đúng pixel, khe sọc và chu kỳ dải là số nguyên pixel; mark gốc khe 7.48 đơn vị.
  // ponytail: giả định mép trên svg nằm trên pixel nguyên (đúng ở DPR 1); DPR lẻ có thể lệch dưới 1 device pixel.
  const brandLockups = [...document.querySelectorAll("[data-site-header] .brand-lockup, #site-menu .brand-lockup")];
  const brandMarkDeviceHeight = new WeakMap();
  const snapBrandMark = (svg) => {
    const paths = [...svg.querySelectorAll(".brand-lockup__mark > path")];
    const deviceHeight = brandMarkDeviceHeight.get(svg);
    if (paths.length !== 4 || !deviceHeight) return;
    // Đơn vị mark sang device pixel: viewBox cao 153.667, mark scale 0.62.
    const unit = (deviceHeight * 0.62) / 153.667;
    // Đáy dịch tối đa nửa device pixel về pixel gần nhất; giữ chiều cao, bề rộng mark gốc.
    const base = Math.round(deviceHeight);
    const width = (2 * deviceHeight) / Math.sqrt(3);
    const gap = Math.max(2, Math.round(7.48 * unit));
    const period = Math.round((width + gap) / 4);
    // Điểm trên đường song song cạnh trái, đi từ chân x tới cạnh phải tam giác.
    const toRightEdge = (x) => {
      const t = (width - x) / 2;
      return [x + t, base - t * Math.sqrt(3)];
    };
    paths.forEach((path, index) => {
      // DOM: đen, vàng, magenta, cyan; cyan là dải trái nhất.
      const band = 3 - index;
      const left = band * period;
      const right = band === 3 ? width : left + period - gap;
      const points = [[left, base], [right, base], toRightEdge(right), toRightEdge(left)];
      path.setAttribute("d", `M${points.map(([x, y]) => `${(x / unit).toFixed(3)} ${(y / unit).toFixed(3)}`).join("L")}Z`);
    });
  };
  if (typeof ResizeObserver !== "undefined") {
    const brandMarkObserver = new ResizeObserver((entries) => entries.forEach((entry) => {
      // devicePixelContentBoxSize đã làm tròn; cần chiều cao thật để biết pixel nào là đáy.
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
  let headerOffset = 0;
  let headerFollowHeight = Infinity;
  let headerFollowStale = true;
  let currentHeaderColor = "";
  let routeTimeline;
  let routeInFlight = false;
  let routeDestinationReady = false;
  let routeMountReady = false;
  // Mount dưới veil chờ lúc veil bắt đầu mở để đếm delay intro hero (first-load-parity R2).
  let resolveRouteReveal;
  const startRouteReveal = () => {
    resolveRouteReveal?.();
    resolveRouteReveal = undefined;
  };
  let advertisingCatalogLoad;
  let lastHeaderWhiteSurface;
  let routeMarkHeld = false;
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

  // Chữ hero (hero-typography R2): đo dòng dài nhất theo em; CSS chỉ co chữ khi bề rộng khung chia số này nhỏ hơn
  // cỡ chung, nên resize không cần đo lại. Đo lại khi đổi ngôn ngữ hoặc font tải xong.
  const fitHeroLines = () => {
    document
      .querySelectorAll(".hero > .hero-content > :is(h1, p.hero-title):not(.hero-kicker), .legacy-copy h2")
      .forEach((title) => {
        title.setAttribute("data-hero-fit", "");
        // Wrapper hero có thể đang scale (zoom lúc vào trang); đổi rect về px layout.
        const scale = title.getBoundingClientRect().width / (title.offsetWidth || 1) || 1;
        // Một cỡ chữ cho cả title: dòng dài nhất vừa khung, hai dòng giữ cùng nhịp.
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
        // Chừa 1%: hinting làm bề rộng chữ không co đúng tỷ lệ cỡ chữ, dòng vừa sát khung có thể tràn 1-2px.
        // Hero ghi lên hero-content để kicker cùng đọc được (detail.css); CTA legacy ghi lên chính h2.
        const host = title.closest(".hero-content") || title;
        host.style.setProperty("--hero-line-em", (Math.max(...widths) * 1.01).toFixed(3));
        // Hai dòng lồng nhau một phần như hero trang chủ EN (hero-typography R2): cặp dòng rộng tổng hai dòng trừ 30%
        // dòng ngắn; CSS dồn hai dòng vào giữa khi khung rộng hơn cặp.
        if (widths.length === 2) {
          const pair = widths[0] + widths[1] - 0.3 * Math.min(...widths);
          host.style.setProperty("--hero-pair-em", (pair * 1.01).toFixed(3));
        }
        // Kicker cách đỉnh nét chữ thật của dòng 1 như nhau ở mọi hero, kể cả chữ có dấu chồng (Ể): dòng 1 thấp hơn
        // "Ể" bao nhiêu em thì kicker kéo xuống bấy nhiêu (detail.css).
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
    // Đọc hết rồi mới ghi: ghi biến mask xen giữa các lần getComputedStyle ép style recalc mỗi mask (phone).
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
  // Motto (page-home R7): mực dấu của ký tự nằm trong cột của ảnh dòng kề phải cách ảnh ít nhất
  // max(0.1em, 6px); thiếu thì chỉ giãn đúng cặp dòng đó. Mực từng ký tự đo bằng canvas, vị trí chữ
  // lấy ở trạng thái cuối animation (.heritage-line nâng 0.1em khi motion bật).
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
          // Tâm lấy từ rect, kích thước từ layout box để bỏ scale lúc reveal.
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
          // Bỏ transform đang chạy của dòng chữ, thay bằng vị trí cuối.
          const shift = line.getBoundingClientRect().top - mask.getBoundingClientRect().top + lift * fontSize;
          const range = document.createRange();
          [...line.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).forEach((node) => {
            const text = node.textContent;
            for (let index = 0; index < text.length; index += 1) {
              if (!text[index].trim()) continue;
              range.setStart(node, index);
              range.setEnd(node, index + 1);
              const box = range.getBoundingClientRect();
              // Motto luôn text-transform uppercase.
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
        // +1px cho viền antialias của dấu.
        const need = Math.max(0.1 * fontSize, 6) + 1;
        inks.forEach((ink) => {
          if (ink.right <= image.left || ink.left >= image.right) return;
          const below = ink.top + ink.bottom > image.top + image.bottom;
          const add = need - (below ? ink.top - image.bottom : image.top - ink.bottom);
          if (add <= 0) return;
          const upper = below ? image.row : ink.row;
          const lower = below ? ink.row : image.row;
          // Cùng hàng là dòng wrap trên phone: giãn row-gap của hàng; khác hàng: giãn margin hàng dưới.
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
  // Gộp các lần gọi cùng frame (font loadingdone, layout update, đổi trang) thành một lượt đo.
  // Layout update không đo lại chữ hero (xem fitHeroLines): đo ép style cả trang, long task khi mở detail trên phone.
  const scheduleTextMaskMeasurement = (fitHero = true) => {
    heroFitPending ||= Boolean(fitHero);
    if (textMaskFrame) return;
    textMaskFrame = window.requestAnimationFrame(() => {
      textMaskFrame = undefined;
      if (heroFitPending) fitHeroLines();
      heroFitPending = false;
      measureTextMasks();
      // Khoảng dòng motto đổi thì chiều cao trang đổi: cập nhật smooth scroll và tone header.
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
      // Link trang cụm Advertising: slug EN khác slug VI nên không đổi được chỉ bằng tiền tố locale.
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
    // Intro WAAPI của logo che transform inline của FLIP; beforeRect đã gồm scale của intro.
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

  const updateHeader = (scrollY = getPageScroll()) => {
    const routeTransitionActive =
      document.body.classList.contains("is-transitioning") ||
      document.documentElement.classList.contains("route-enter");
    const probeY = scrollY + Math.min(80, window.innerHeight * 0.12);
    const activeSection = toneRanges.find(
      ({ top, bottom }) => top <= probeY && bottom > probeY,
    )?.section;
    // Detail ảnh Advertising không có hero nên header luôn thu gọn (advertising-detail R10).
    const collapsed = scrollY > 100 || document.body.classList.contains("is-advertising-photo");
    // Tone của chính trang, bỏ qua lớp ghim route; playRouteEnter đọc để đổi mark lúc veil mở.
    pageHeaderInk = collapsed || activeSection?.dataset.headerTone === "ink";
    const ink = (routeTransitionActive && !routeDestinationReady) || pageHeaderInk;
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
    if (!routeMarkHeld && (activeSection || routeTransitionActive || collapsed)) {
      syncHeaderBrandSurface(ink);
    }
    if (collapsedChanged) {
      headerFollowStale = true;
      playHeaderLockupScaleMotion(logoBeforeRect);
    }
    lastHeaderCollapsed = collapsed;

    const pageHeight = document.documentElement.scrollHeight;
    const maxScroll = Math.max(0, pageHeight - window.innerHeight);
    // Floating CTA chỉ ở màn đầu: cuối mỗi trang đã có nút Zalo riêng (lời mời trang chủ,
    // `.detail-cta`) nên nút nổi không lặp lại ở đó (owner 12/10). Ẩn cả khi footer lọt vào
    // viewport (trang ngắn như 404) để footer không phải chừa làn nút.
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
      // Khóa cuộn: không tính delta (phone-header-scroll R4).
    } else if (follow) {
      // Lệch đúng bằng quãng cuộn, kẹp trong [0, chiều cao header] và không quá scrollY;
      // dừng cuộn thì giữ nguyên (phone-header-scroll R2, R3).
      if (headerFollowStale) {
        // Đo lại chiều cao; header đang khuất hẳn thì giữ khuất hẳn theo chiều cao mới.
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
  let headerMarkUnderlay;
  let headerMarkSlots = [];
  let headerMarkRise = 0;
  // Đổi lớp màu mark; lớp mới mọc từ chân lên đỉnh từng dải, lớp cũ lùi theo mép mọc (brand.md Motion).
  // `tween` (chuyển trang, logo-route-crossfade R1, R2): từng dải tween màu cùng tween màu chữ, như Espacio.
  const paintHeaderMark = (
    className,
    { from = headerMarkPaths.map((path) => getComputedStyle(path).fill), rise = true, tween } = {},
  ) => {
    // Đọc clip đang chạy trước khi hủy để giữ đúng phần lớp mới đã mọc khi đổi hướng giữa chừng.
    const clips = headerMarkPaths.map((path) => getComputedStyle(path).clipPath);
    header.classList.remove("is-brand-color", "is-brand-inverse", "is-brand-ink");
    header.classList.add(className);
    if (hasGsap) gsap.killTweensOf(headerMarkPaths);
    headerMarkPaths.forEach((path) => path.style.removeProperty("fill"));
    if (tween && hasGsap && !reduceMotion && headerMark) {
      // Dừng kiểu mọc đang chạy; tween đi từ màu đang hiển thị của từng dải.
      headerMarkUnderlay?.remove();
      headerMarkUnderlay = undefined;
      headerMarkSlots = [];
      headerMarkRise += 1;
      headerMarkPaths.forEach((path) => path.getAnimations().forEach((animation) => animation.cancel()));
      const to = headerMarkPaths.map((path) => getComputedStyle(path).fill);
      gsap.fromTo(
        headerMarkPaths,
        { fill: (index) => from[index] },
        { fill: (index) => to[index], ...tween, clearProps: "fill" },
      );
      return;
    }
    if (!rise || reduceMotion || !headerMark) return;
    if (!headerMarkUnderlay) {
      headerMarkUnderlay = headerMark.cloneNode(false);
      headerMarkUnderlay.removeAttribute("id");
      headerMarkUnderlay.setAttribute("class", "brand-lockup__mark-underlay");
      headerMark.before(headerMarkUnderlay);
    }
    const token = ++headerMarkRise;
    Promise.all(headerMarkPaths.map((path, index) => {
      // Mỗi dải có một slot chứa lớp cũ; slot lùi từ chân theo mép mọc nên mép trái, phải, đỉnh không chồng hai lớp.
      // Đổi hướng giữa chừng: slot cũ đứng yên ở clip hiện tại và nằm trong slot mới cùng phần dải đã mọc.
      const slot = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const previous = headerMarkSlots[index];
      if (previous) {
        const clip = getComputedStyle(previous).clipPath;
        previous.getAnimations().forEach((animation) => animation.cancel());
        previous.style.clipPath = clip;
        slot.append(previous);
      }
      const layer = path.cloneNode(false);
      layer.setAttribute("fill", from[index]);
      layer.style.clipPath = clips[index];
      slot.append(layer);
      headerMarkUnderlay.append(slot);
      headerMarkSlots[index] = slot;
      path.getAnimations().forEach((animation) => animation.cancel());
      // Dải 1 đen tới 4 cyan bắt đầu lệch 0.07s, cả bốn cùng xong ở 1s.
      const delay = index * 70;
      const timing = { delay, duration: 1000 - delay, easing: "cubic-bezier(0.16, 1, 0.3, 1)" };
      // Lớp cũ thừa 1px dưới mép mọc để không hở khe giữa hai lớp.
      slot.animate({ clipPath: ["inset(0 0 -1px 0)", "inset(0 0 calc(100% - 1px) 0)"] }, { ...timing, fill: "both" });
      return path.animate({ clipPath: ["inset(100% 0 0 0)", "inset(0)"] }, { ...timing, fill: "backwards" }).finished;
    })).then(() => {
      if (token !== headerMarkRise) return;
      headerMarkUnderlay.remove();
      headerMarkUnderlay = undefined;
      headerMarkSlots = [];
    }, () => {});
  };
  function syncHeaderBrandSurface(whiteSurface, tween) {
    if (whiteSurface) {
      if (lastHeaderWhiteSurface === undefined && !tween) {
        // Mở trang trên nền trắng: CMYK mọc lên trên lớp đen.
        paintHeaderMark("is-brand-color", { from: markBlack });
      } else if (
        lastHeaderWhiteSurface !== true ||
        !header.classList.contains("is-brand-color")
      ) {
        paintHeaderMark("is-brand-color", { tween });
      }
    } else if (
      lastHeaderWhiteSurface !== false ||
      !header.classList.contains("is-brand-inverse")
    ) {
      // Mở trang trên nền ảnh: vẽ trắng ngay, không chuyển động.
      paintHeaderMark("is-brand-inverse", { rise: lastHeaderWhiteSurface !== undefined, tween });
    }
    lastHeaderWhiteSurface = whiteSurface;
  };
  const prepareRouteDestination = (container) => {
    routeDestinationReady = true;
    const destinationWhiteSurface =
      container?.querySelector("[data-header-tone]")?.dataset.headerTone === "ink";
    // Route mềm giữ mark đậm dưới veil, đổi theo trang đích lúc veil mở (playRouteEnter).
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
    header.classList.add("is-route-pinned", "is-ink");
    routeDestinationReady = false;
    colorHeader("#2f2f2f");
    routeMarkHeld = true;
    // Mark đậm cùng chữ lúc bấm, như Espacio (logo-route-crossfade R1).
    paintHeaderMark("is-brand-ink", { rise: false, tween: { duration: 0.3, ease: "expo.out" } });
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

  const setPageScroll = (state, scrollY, { instant = false } = {}) => {
    const target = Math.max(0, Number(scrollY) || 0);
    // Về đầu trang không cần clamp: không đọc scrollHeight, nên không ép layout trong task gọi nó.
    const nextScroll = target && Math.min(
      target,
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    );
    state.smoothScrollY = nextScroll;
    if (state.smoothScroll) {
      // Không truyền behavior thì `html { scroll-behavior: smooth }` trượt native scroll lệch về 0 qua nhiều frame;
      // Chrome bỏ qua style inline mới đặt với scrollTo(0, 0) vì không cập nhật style cho tọa độ này.
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      // Điều hướng bằng query có thể thay một detail ngắn bằng grid cao hơn nhiều.
      state.smoothScroll.update();
      state.smoothScroll.scrollTo(nextScroll, {
        duration: 0,
        disableLerp: true,
      });
      // Locomotive 4.1.4 có thể hoãn một scroll zero-duration thêm một frame.
      if (instant) state.smoothScroll.setScroll(0, nextScroll);
      state.smoothScroll.update();
    } else {
      window.scrollTo({ top: nextScroll, left: 0, behavior: instant ? "instant" : "auto" });
    }
    lastScrollY = nextScroll;
    // Scroll tức thì về đầu trang (mở detail Advertising) đo header ở frame kế, trước paint, để style và layout
    // của trang mới chỉ chạy một lần thay vì bị ép thêm trong task chạm card (decision phone-frame-budget).
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
  // Resolve đơn vị viewport CSS native; số đo hiển thị không bao giờ sở hữu geometry persistent.
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
      window.scrollTo({ top: scrollY, behavior: "instant" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    state.smoothScroll = new window.LocomotiveScroll({
      el: state.container,
      smooth: true,
      lerp: 0.085,
      multiplier: 0.9,
      smartphone: { smooth: false },
      tablet: { smooth: false, breakpoint: 981 },
    });
    // Locomotive 4.1.4 bỏ timestamp bắt đầu của keyboard và chỉ đặt flag cho stop().
    const smooth = state.smoothScroll;
    const core = smooth.scroll;
    if (core.scrollbarThumb) {
      let thumbMoveFrame;
      const cancelThumbMove = () => {
        window.cancelAnimationFrame(thumbMoveFrame);
        thumbMoveFrame = undefined;
      };
      // Thay RAF vendor không có guard tại ranh giới instance, giữ một đường input.
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
          // Pixel CSS cuối cùng với tới được phải chạm giới hạn document.
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
        // Bỏ callback thumb-move được xếp hàng ngay trước overlay lock.
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
    // html có scroll-behavior: smooth; khôi phục vị trí phải tức thì, nếu không scrollY trượt dần từ 0 và
    // lần đổi mode kế tiếp (resize nhanh qua mốc 981px) đọc nhầm vị trí giữa chừng.
    window.scrollTo({ top: scrollY, behavior: "instant" });
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
        // Wrapper <picture> build-time mang variant hoãn dưới dạng data-srcset.
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

  // Vệt sáng chờ ảnh dừng khi khung ra ngoài viewport; khung đã settle thì thôi theo dõi (media-delivery R6).
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

  // Intro header (logo, mục menu, nút menu) chạy bằng WAAPI trên compositor: long task của mount và đo chữ ngay sau
  // khi tải không làm logo khựng (decision phone-frame-budget). power4.out của GSAP lấy mẫu vào linear(), cùng
  // thời lượng, delay và stagger như timeline GSAP cũ; trình duyệt chưa có linear() vẫn chạy timeline GSAP.
  const compositorEase = window.CSS?.supports?.("animation-timing-function", "linear(0, 1)")
    ? `linear(${Array.from({ length: 41 }, (_, index) => (1 - (1 - index / 40) ** 5).toFixed(4)).join(", ")})`
    : "";
  // Cùng API timeline mà mount và route dùng: play, paused, progress(1) để nhảy tới cuối, kill.
  const createHeaderIntro = () => {
    const toggle = header.querySelector("#header-toggle-svg");
    if (toggle) toggle.style.transformOrigin = "center";
    const steps = [
      [headerLogo, [{ transform: "scale(0)" }, { transform: "none" }], 0, 1500],
      ...[...header.querySelectorAll("#header-menu-items > ul > li")]
        .map((item, index) => [item, [{ transform: "translateY(-150px)" }, { transform: "none" }], 300 + index * 100, 1500]),
      [toggle, [{ transform: "scaleX(0)" }, { transform: "none" }], 1500, 1000],
    ].filter(([node]) => node);
    // fill backwards giữ giá trị đầu trong lúc chờ như from() của GSAP; xong thì trả về style gốc.
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
      // Theo dõi thay đổi preference live để CSS và motion runtime tiếp tục mà không cần reload.
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
        "residential",
        "commercial",
      ]).has(state.container.dataset.barbaNamespace);
      let scrollCueTimeline;
      const buildScrollCueTimeline = () => {
        if (!(scrollCueLabel instanceof HTMLElement)) return;
        scrollCueTimeline?.kill();
        if (scrollCueTimeline) timelines.delete(scrollCueTimeline);
        // revert() ghi lại HTML lúc split (ngôn ngữ cũ); giữ text translateTree vừa đặt.
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
              // Khoảng trắng giữ dạng plain text, khớp char split của SplitText ở các route khác.
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
      const playsHeaderIntro = !settledStartup && !softNavigation;
      // Direct load chạy intro header một lần khi veil bắt đầu lộ; soft navigation bỏ qua.
      if (playsHeaderIntro) {
        // FLIP collapse từ scroll lúc mount sẽ thành giá trị cuối của intro và để logo bị scale.
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
      // Chạy khi veil bắt đầu mở, sau long task của mount, nên không mất phần mở đầu của intro (first-load-parity R2).
      intro.pause();
      state.introStart.then(() => intro.play());
      if (document.documentElement.classList.contains("route-enter")) state.headerIntro = headerIntro;
      else window.requestAnimationFrame(() => headerIntro.play());
      // Thứ tự slide do script sau .hero-slides xáo (page-home R3); slides[0] là ảnh chiếu đầu.
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
            // Zoom kéo dài qua cả crossfade (5s hiện + 1.6s fade), để ảnh cũ còn chuyển động tới khi mờ hẳn.
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
          // Ảnh mới bắt đầu zoom từ frame đầu crossfade, chồng lên phần zoom còn lại của ảnh cũ.
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
      state.replayMotion = undefined;
      state.stopCarousel?.();
      observers.forEach((observer) => observer.disconnect());
      timelines.forEach((timeline) => timeline.kill());
      scrollCueSplit?.revert();
      context.revert();
    };
  };

  const nextTask = () => new Promise((resolve) => setTimeout(resolve));

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

    const heroMedia = container.querySelector(".hero-slides, .about-hero__media");
    // Barba dựng container bằng DOMParser nên script xáo slide hero (page-home R3) không chạy; chạy bản sao
    // classic, đồng bộ trước khi mount đọc slide.
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

    watchWhiteOverlayMedia(state);
    pauseOffscreenMediaSweeps(state);
    initSmoothScroll(state, state.smoothScrollY);
    setPageScroll(state, state.smoothScrollY, { instant: true });
    // Cỡ chữ hero chốt trước khi SplitText tách từ và motion đọc vị trí.
    fitHeroLines();
    startRouteReveal();
    const introStart = routeInFlight || document.documentElement.classList.contains("route-enter")
      ? new Promise((resolve) => { resolveRouteReveal = resolve; })
      : Promise.resolve();
    state.introStart = introStart;
    await window.TruongThinhDetail?.mount(container, { settled: settledStartup, softNavigation, introStart });
    // Motion trang là task riêng, không cộng vào task render của catalog.
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
      // Hết shutter, bắt đầu chữ menu; route đóng menu tại đây khi reverse (coverRouteFromMenu).
      .addLabel("content")
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
    // Tone trang đích đọc lúc veil mở có thể lệch khi layout còn đổi; vẫn sửa bằng tween màu, không mọc
    // (logo-route-crossfade R2).
    if (routeMarkHeld) syncHeaderBrandSurface(pageHeaderInk, { duration: 0.3, ease: "power2.out" });
    routeMarkHeld = false;
    setRouteVeil(0);
    // Intro chưa từng được chạy sẽ để header ở giá trị bắt đầu from() của nó.
    if (pageState?.headerIntro?.paused()) pageState.headerIntro.progress(1);
    pageState?.smoothScroll?.start();
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
    return fade;
  };

  // Route từ full menu: menu reverse cùng lúc veil phủ. Shutter trắng trùng veil và trang cũ nằm dưới veil, nên
  // đóng menu ngay khi veil phủ kín và chữ menu đã reverse xong, không chờ shutter và page scale.
  const coverRouteFromMenu = () => {
    const covered = coverRoute();
    const closing = closeMenu(false);
    if (dialog.open && hasGsap && !reduceMotion && menuTimeline) {
      const contentGone = new Promise((resolve) => window.gsap.delayedCall(
        // timeScale() âm khi timeline đang reverse.
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

  const playRouteEnter = () => {
    if (!hasGsap || reduceMotion) {
      clearRouteEntry();
      return Promise.resolve();
    }
    routeTimeline?.kill();
    showHeader();
    header.classList.add("is-route-pinned");
    document.body.classList.add("is-transitioning");
    setRouteVeil(1);
    startRouteReveal();
    pageState?.headerIntro?.play();
    if (routeMarkHeld) {
      // Mark tween màu theo trang đích cùng tween màu chữ lúc veil bắt đầu mở (logo-route-crossfade R2, R3);
      // vẫn giữ tới clearRouteEntry để updateHeader trong lúc veil mở không vẽ lại mark.
      updateToneRanges();
      updateHeader();
      syncHeaderBrandSurface(pageHeaderInk, { duration: 0.3, ease: "expo.out" });
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
      && isAdvertisingPath(url.pathname)
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
    // Lớp underlay do paintHeaderMark chèn lúc runtime, HTML trang mới không có; bỏ qua khi so cây.
    const currentChildren = [...current.children].filter(
      (child) => !child.classList.contains("brand-lockup__mark-underlay"),
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

    // Class màu mark là state runtime; HTML trang mới không có nên giữ lại để mark không vẽ lại.
    const brandClasses = [...header.classList].filter((name) => name.startsWith("is-brand-"));
    const persistentReady = persistentSelectors.every((selector) =>
      syncElementTree(
        document.querySelector(selector),
        nextDocument.querySelector(selector),
      ),
    );
    header.classList.add(...brandClasses);
    if (!persistentReady) return false;
    // syncAttributes vừa trả `d` của mark về bản gốc từ HTML trang mới.
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
      if (nextLanguage === currentLanguage) {
        await closeMenu(false);
        return true;
      }
      // Đổi ngôn ngữ dùng cùng veil với route mềm: phủ, đổi chữ dưới veil, rồi mở; reduced motion không veil.
      await (reduceMotion ? closeMenu(false) : coverRouteFromMenu());

      const url = new URL(window.location.href);
      const suffix = url.pathname.replace(/^\/(?:vi|en)(?=\/|$)/, "") || "/";
      // Trang cụm, sản phẩm Advertising: link ngôn ngữ đã mang path đúng slug của locale đích.
      const option = isAdvertisingPath(url.pathname)
        && document.querySelector(`[data-language-option="${nextLanguage}"][href]`);
      url.pathname = option ? new URL(option.href).pathname : `/${nextLanguage}${suffix}`;
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
      let reveal;
      try {
        await applyLanguage(nextLanguage);
        updateLocaleLinks(nextLanguage);
        updateLocaleHead(url, nextLanguage);
        await nextFrame();
        await nextFrame();
        if (!reduceMotion) reveal = playRouteEnter();
        replay = await replayVisibleSection(section);
        pageState?.smoothScroll?.update();
        setPageScroll(pageState, scrollY);
        await nextFrame();
        await nextFrame();
      } finally {
        document.documentElement.style.overflowAnchor = previousOverflowAnchor;
        // Lỗi trước khi mở veil thì gỡ veil ngay để trang không kẹt dưới lớp trắng.
        if (!reveal && !reduceMotion) clearRouteEntry();
      }
      setPageScroll(pageState, scrollY);
      requestLayoutUpdate();
      window.dispatchEvent(
        new CustomEvent("site:section-replay", { detail: replay }),
      );
      await reveal;
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
        // Detail hoặc trang cụm, sản phẩm cùng locale về masonry tại chỗ (taxonomy R4).
        && isAdvertisingPath(window.location.pathname)
        && destination.pathname.slice(0, 4) === window.location.pathname.slice(0, 4)
        && destination.search === ""
        && destination.pathname !== `${window.location.pathname}${window.location.search}`
        && window.TruongThinhAdvertising?.getAdapter?.()
      ) {
        // Từ photo, navbar về đúng chỗ trên masonry nguồn; từ masonry đang lọc thì về Tất cả ở đầu trang.
        const fromGrid = !isAdvertisingPhotoUrl(new URL(window.location.href));
        const navigateToAdvertisingParent = (instant = false) => {
          if (window.TruongThinhAdvertising?.navigateQuery?.(
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
        // Ctrl/Shift/Meta+click mở tab mới, không có route nào clear lớp ghim.
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

  // Padding header đổi dần khi thu gọn: đo lại chiều cao sau transition (phone-header-scroll R2).
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
  // Autoscroll chuột giữa kiểu Chrome (scroll-feel R6): Locomotive chặn autoscroll native nên đẩy delta
  // qua đúng đường của wheel; Locomotive không chạy hoặc đang khóa thì để trình duyệt tự lo.
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
    // Công thức autoscroll của Chrome: 0.000008 × |d|^2.2 nhân 5000 của FixedVelocityCurve, không có trần.
    const speed = Math.abs(distance) <= autoscrollDeadZone ? 0
      : Math.sign(distance) * 0.04 * Math.abs(distance) ** 2.2;
    document.documentElement.dataset.autoscroll = speed < 0 ? "up" : speed > 0 ? "down" : "idle";
    const seconds = Math.min(0.1, (time - (autoscroll.time ?? time)) / 1000);
    autoscroll.time = time;
    if (speed && seconds) {
      // updateDelta trừ deltaY × multiplier như một sự kiện wheel đảo chiều của virtual-scroll.
      core.updateDelta({ deltaX: 0, deltaY: -speed * seconds / core.multiplier });
      if (!core.isScrolling) core.startScrolling();
    }
    autoscroll.frame = window.requestAnimationFrame(stepAutoscroll);
  };
  document.addEventListener("mousedown", (event) => {
    if (autoscroll) {
      // Cú nhấn dừng autoscroll không tới link hay nút bên dưới.
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
    // Làm tròn theo pixel màn hình để cạnh icon không rơi vào nửa pixel ở tỉ lệ 125%, 150%.
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
  // Nhả chuột giữa trong vùng chết thì vào chế độ dính; đã kéo ra ngoài thì dừng.
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
  // Observer đo sau layout đầu tiên; đọc nó ở đây từng ép layout đó chạy bên trong task này.
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
      `[data-advertising-filter="${CSS.escape(intent.filter)}"]`,
    );
    if (control instanceof HTMLElement) {
      control.click();
      return;
    }
    hardNavigate(intent.href);
  };
  // Kéo chuột bôi đen số điện thoại footer để copy thì không mở link tel: (owner 12/10).
  document.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest(".footer-hotline, .footer-office")
      && getSelection().toString()) event.preventDefault();
  });
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
    // Rail trỏ tới trang cụm (taxonomy R4); cùng gốc /<locale>/advertising-products thì vẫn xếp hàng lọc tại chỗ.
    const advertisingRoot = (pathname) => pathname.split("/").slice(0, 3).join("/");
    if (
      destination.origin !== window.location.origin
      || advertisingRoot(destination.pathname) !== advertisingRoot(window.location.pathname)
    ) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pendingAdvertisingFilter = {
      filter: control.dataset.advertisingFilter || "all",
      href: destination.href,
    };
  }, { capture: true, signal: runtimeAbort.signal });
  // Mount và Barba đọc layout; sau frame đầu tiên layout đó đã xong, nên script này vẫn là task ngắn.
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
    // Back khi photo viewer đang mở chỉ đóng viewer (advertising-viewer-touch-zoom R10).
    if (advertising?.handleViewerPopState?.()) {
      event.stopImmediatePropagation();
      return;
    }
    const previousHref = advertising?.getCurrentHref?.() || window.barba?.history?.current?.url;
    const nextHref = window.location.href;
    if (!advertising?.canHandlePopState?.(previousHref, nextHref)) {
      // Barba ép native load cho traversal trong lúc transition đang chạy.
      if (window.barba?.transitions?.isRunning
        && isAdvertisingPath(location.pathname)) {
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
                // Đích Advertising: tải catalog song song với veil phủ; lỗi để beforeEnter và mount xử lý như cũ.
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
                // Chờ catalog trước khi unmount: gỡ smooth scroll làm scrollbar native hiện và đẩy header sang trái
                // suốt lúc chờ mạng.
                await advertisingCatalogLoad;
                // Unmount chạy ngoài frame vừa kết thúc veil.
                await nextTask();
                unmountPage();
                data.current.container.hidden = true;
              },
              async beforeEnter(data) {
                // Mỗi bước nặng (unmount, đồng bộ document, mount) là một task riêng để không long task > 50ms
                // trên phone Android (decision phone-frame-budget).
                await nextTask();
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
        // Barba coi mọi status khác 200 là lỗi rồi tải lại cả document, nên Back về trang 404 mất veil phủ và chạy
        // lại intro header. Trang 404 của site (status 404) vẫn đi route mềm như mọi trang khác (Shell R6).
        // barba.request là API nội bộ của bản vendor 2.10.3; nâng Barba thì chạy lại not-found-routes.e2e.mjs.
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
