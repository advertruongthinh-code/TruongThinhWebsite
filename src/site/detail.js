(() => {
  const directContainer = document.querySelector('[data-barba="container"]');
  const navigationType = window.performance?.getEntriesByType?.("navigation")?.[0]?.type;
  const nativeState = window.history.state;
  const currentUrl = new URL(window.location.href);
  currentUrl.hash = "";
  const historyFallback = navigationType === "navigate"
    && nativeState?.ttAdvertisingHistoryFallback === currentUrl.href;
  if (Object.prototype.hasOwnProperty.call(nativeState || {}, "ttAdvertisingHistoryFallback")) {
    const cleanedState = { ...nativeState };
    delete cleanedState.ttAdvertisingHistoryFallback;
    try { window.history.replaceState(cleanedState, "", window.location.href); } catch {}
  }
  if (["advertising-products", "projects"].includes(directContainer?.dataset.barbaNamespace)
    && (navigationType === "back_forward" || historyFallback)) {
    window.__ttBrowseStartupHistory = {
      navigationType,
      historyFallback,
      state: nativeState,
    };
  }

  // Page that runs the advertising masonry runtime: Advertising products and Projects (projects R2, same hero, motion, grid).
  const isCatalogNamespace = (namespace) => namespace === "advertising-products" || namespace === "projects";
  let activePage;
  let advertisingCarouselModulesPromise;
  let advertisingCarouselStylePromise;
  let advertisingDependenciesPromise;
  const advertisingHeroPlayed = new WeakSet();
  const ADVERTISING_DEPENDENCY_TIMEOUT = 4_000;

  const ADVERTISING_DEPENDENCIES = [
    { name: "GSAP 3.15.0", source: "/assets/vendor/gsap-3.15.0.min.js", ready: () => window.gsap?.version === "3.15.0", optional: true },
    { name: "SplitText 3.15.0", source: "/assets/vendor/SplitText-3.15.0.min.js", ready: () => typeof window.SplitText === "function", optional: true },
    { name: "LazySizes 5.3.2", source: "/assets/vendor/lazysizes-5.3.2.min.js", ready: () => Boolean(window.lazySizes?.loader) },
  ];

  const dependencyScript = (source) => {
    const script = document.createElement("script");
    script.src = source;
    script.async = false;
    script.dataset.ttAdvertisingDependency = source;
    script.dataset.ttAdvertisingStatus = "loading";
    return script;
  };

  const waitForAdvertisingDependency = ({ name, source, ready }, script, append) => new Promise((resolve, reject) => {
    let timer;
    const cleanup = () => {
      clearTimeout(timer);
      script.removeEventListener("load", loaded);
      script.removeEventListener("error", failed);
    };
    const finish = () => {
      cleanup();
      if (ready()) resolve();
      else reject(new Error(`${name} loaded without its required global`));
    };
    const loaded = () => {
      script.dataset.ttAdvertisingStatus = "loaded";
      finish();
    };
    const failed = () => {
      script.dataset.ttAdvertisingStatus = "failed";
      cleanup();
      reject(new Error(`Failed to load ${name} from ${source}`));
    };
    if (ready()) {
      finish();
      return;
    }
    script.addEventListener("load", loaded, { once: true });
    script.addEventListener("error", failed, { once: true });
    timer = setTimeout(() => {
      if (ready()) finish();
      else {
        cleanup();
        reject(new Error(`Timed out waiting for ${name} from ${source}`));
      }
    }, ADVERTISING_DEPENDENCY_TIMEOUT);
    if (append) document.head.append(script);
  });

  const loadAdvertisingDependency = (dependency) => {
    const { source, ready } = dependency;
    if (ready()) return Promise.resolve();
    const selector = `script[data-tt-advertising-dependency="${source}"], script[src="${source}"]`;
    const existing = document.querySelector(selector);
    const retry = () => waitForAdvertisingDependency(dependency, dependencyScript(source), true);
    if (!existing || ["failed", "loaded"].includes(existing.dataset.ttAdvertisingStatus)) return retry();
    return waitForAdvertisingDependency(dependency, existing, false).catch(retry);
  };

  const ensureAdvertisingDependencies = () => {
    if (advertisingDependenciesPromise) return advertisingDependenciesPromise;
    // Load in parallel; scripts with async=false still execute in declaration order.
    advertisingDependenciesPromise = Promise.all(ADVERTISING_DEPENDENCIES.map(
      (dependency) => loadAdvertisingDependency(dependency).catch((error) => {
        if (!dependency.optional) throw error;
        console.warn(`[advertising-products] optional dependency unavailable: ${dependency.name}`);
      }),
    )).catch((error) => {
      advertisingDependenciesPromise = undefined;
      console.error("[advertising-products] dependency readiness failed", error);
      throw error;
    });
    return advertisingDependenciesPromise;
  };

  // Vendor, catalog module and artifact load together. A soft route calls this the moment the link is clicked so the network runs in parallel with the veil
  // instead of queuing behind it (Shell R6). The artifact imports at the same time as the runtime: the runtime re-imports this exact URL so it shares
  // the module and nothing loads twice; if the import waited for the runtime to finish loading, the artifact would lag a network round trip.
  // The grid layout Workers (masonry-live-layout R3) start here (and on the Projects page mount below), in parallel with the runtime
  // module graph, so their modules are loaded by the time the runtime posts the first pack; the runtime adopts them.
  const startGridWorker = () => {
    try {
      // Below 720px (the 2-column band, pack.mjs LAYOUT_BANDS) the grid packs on the main thread.
      if (window.__TT_GRID_WORKERS__ || document.documentElement.clientWidth < 720) return;
      // One per live candidate order (pack.mjs LIVE_CANDIDATES); the runtime spreads candidates over however many start here.
      window.__TT_GRID_WORKERS__ = Array.from({ length: 4 }, () => {
        const worker = new Worker("/masonry/layout-worker.mjs", { type: "module" });
        // A load error before the runtime adopts the Worker would otherwise go unseen and leave the first pack waiting.
        worker.addEventListener("error", () => { worker.failed = true; }, { once: true });
        return worker;
      });
    } catch {}
  };
  const loadAdvertisingCatalog = () => (startGridWorker(), Promise.all([
    ensureAdvertisingDependencies(),
    import("/masonry/runtime.mjs").then((runtime) => {
      runtime.preloadMasonry();
      return runtime;
    }),
    import("/advertising-products/catalog-artifact.mjs").catch(() => {}),
    // Landing directly on a photo URL needs the detail (description, related) immediately: load it with the artifact; the runtime shares the module.
    location.pathname.includes("/p/") ? import("/advertising-products/catalog-detail.mjs").catch(() => {}) : null,
  ]).then(([, runtime]) => runtime));

  const ensureAdvertisingCarouselStyle = () => {
    if (advertisingCarouselStylePromise) return advertisingCarouselStylePromise;
    advertisingCarouselStylePromise = new Promise((resolve, reject) => {
      const source = "/assets/vendor/swiper-14.2.0/swiper.css";
      let timer;
      let link = document.querySelector(`link[data-tt-advertising-carousel-style="${source}"]`);
      if (link?.sheet) {
        resolve();
        return;
      }
      if (link?.dataset.ttAdvertisingStatus === "failed") {
        link.remove();
        link = undefined;
      }
      const loaded = () => {
        cleanup();
        link.dataset.ttAdvertisingStatus = "loaded";
        resolve();
      };
      const failed = () => {
        cleanup();
        link.dataset.ttAdvertisingStatus = "failed";
        advertisingCarouselStylePromise = undefined;
        reject(new Error("Failed to load Advertising carousel styles"));
      };
      const cleanup = () => {
        window.clearTimeout(timer);
        link.removeEventListener("load", loaded);
        link.removeEventListener("error", failed);
      };
      if (!link) {
        link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = source;
        link.dataset.ttAdvertisingCarouselStyle = source;
        link.dataset.ttAdvertisingStatus = "loading";
      }
      link.addEventListener("load", loaded, { once: true });
      link.addEventListener("error", failed, { once: true });
      timer = window.setTimeout(failed, ADVERTISING_DEPENDENCY_TIMEOUT);
      if (!link.isConnected) document.head.append(link);
    });
    return advertisingCarouselStylePromise;
  };

  const ensureAdvertisingCarouselModules = () => {
    if (advertisingCarouselModulesPromise) return advertisingCarouselModulesPromise;
    advertisingCarouselModulesPromise = Promise.all([
      ensureAdvertisingCarouselStyle(),
      import("/assets/vendor/swiper-14.2.0/swiper.mjs"),
      import("/assets/vendor/swiper-14.2.0/modules/mousewheel.mjs"),
      import("/assets/vendor/swiper-14.2.0/modules/pagination.mjs"),
      import("/assets/vendor/swiper-14.2.0/modules/a11y.mjs"),
    ]).then(([, { default: Swiper }, { default: Mousewheel }, { default: Pagination }, { default: A11y }]) => ({
      A11y,
      Mousewheel,
      Pagination,
      Swiper,
    })).catch((error) => {
      advertisingCarouselModulesPromise = undefined;
      throw error;
    });
    return advertisingCarouselModulesPromise;
  };

  const mountAdvertisingDetailCarousels = (container, state, reduceMotion) => {
    const sections = [...container.querySelectorAll("[data-masonry-carousel]")];
    if (!sections.length) return Promise.resolve();
    const syncClientWidth = () => {
      const clientWidth = `${document.documentElement.clientWidth}px`;
      sections.forEach((section) => {
        section.style.setProperty("--masonry-carousel-client-width", clientWidth);
      });
    };
    syncClientWidth();
    window.addEventListener("resize", syncClientWidth, { signal: state.abort.signal });
    return ensureAdvertisingCarouselModules().then(({ A11y, Mousewheel, Pagination, Swiper }) => {
      if (state.abort.signal.aborted || activePage !== state) return;
      sections.forEach((section) => {
        const viewport = section.querySelector("[data-masonry-carousel-viewport]");
        const pagination = section.querySelector("[data-masonry-carousel-pagination]");
        section.querySelectorAll("img").forEach((image) => {
          image.draggable = false;
        });
        const carousel = new Swiper(viewport, {
          modules: [Mousewheel, Pagination, A11y],
          slidesPerView: "auto",
          autoHeight: true,
          speed: reduceMotion ? 0 : 500,
          spaceBetween: 10,
          breakpoints: {
            600: { spaceBetween: 20 },
          },
          grabCursor: true,
          watchOverflow: true,
          mousewheel: {
            forceToAxis: true,
            releaseOnEdges: true,
          },
          pagination: {
            el: pagination,
            clickable: true,
          },
          a11y: {
            enabled: true,
          },
        });
        section.dataset.masonryCarouselState = "enhanced";
        state.carousels.add(carousel);
      });
    }).catch(() => {
      sections.forEach((section) => {
        section.dataset.masonryCarouselState = "native";
      });
    });
  };

  const unmount = () => {
    if (!activePage) return;
    activePage.abort.abort();
    activePage.observers.forEach((observer) => observer.disconnect());
    activePage.frames.forEach((frame) => window.cancelAnimationFrame(frame));
    activePage.revertSplitText?.();
    activePage.gsapContext?.revert();
    activePage.carousels?.forEach((carousel) => carousel.destroy(true, true));
    activePage = undefined;
  };

  // About R9 journey, from 981px: each milestone is a stage. When its year passes 55% of the viewport its drawing plays on its
  // own from white to complete (--p 0 to 1); scrolling back rewinds the shown drawing to white, then the previous drawing shows
  // complete. A drawing never stops halfway (owner 2026-11-24). Scrolling only compares cached year positions; style is written
  // while a drawing plays. Reduced motion keeps --p at 1 (only the swap). Below 981px the CSS shows each complete drawing.
  const mountAboutJourney = (container, state, reduceMotion) => {
    const journey = container.querySelector(".about-journey");
    if (!journey || !window.matchMedia("(min-width: 981px)").matches) return;
    const items = [...journey.querySelectorAll(".about-journey__item")];
    const years = items.map((item) => item.querySelector(".about-journey__year"));
    const arts = items.map((_, index) => journey.querySelector(`[data-journey-art="${index + 1}"]`));
    const nodes = [...journey.querySelectorAll(".about-journey__node")];
    const rail = journey.querySelector(".about-journey__rail");
    const fill = rail.querySelector(".about-journey__rail-fill");
    const list = journey.querySelector(".about-journey__list");
    const forward = 1500;
    const rewind = 800;
    // A forward drawing starts below 0: it stays plain white while the previous one fades out (owner 2026-11-23: white first frame).
    const lead = -0.15;
    const pageY = () => window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY;
    let marks = [];
    let centers = [];
    let target = -1;
    let shown = 0;
    let p = 0;
    let frame = 0;
    let last = 0;
    const setP = (index, value) => arts[index].style.setProperty("--p", Math.max(0, value).toFixed(3));
    const swap = (index, value) => {
      arts[shown].classList.remove("is-current");
      shown = index;
      p = value;
      setP(shown, p);
      arts[shown].classList.add("is-current");
    };
    const tick = (now) => {
      const dt = Math.min(now - last, 100);
      last = now;
      const goal = Math.max(target, 0);
      if (goal > shown) {
        setP(shown, 1);
        swap(goal, lead);
      }
      const back = goal < shown || target < 0;
      p = back ? Math.max(0, p - dt / rewind) : Math.min(1, p + dt / forward);
      setP(shown, p);
      if (back && p === 0 && goal < shown) swap(goal, 1);
      const settled = goal === shown && p === (target < 0 ? 0 : 1);
      frame = settled ? 0 : window.requestAnimationFrame(tick);
    };
    const update = () => {
      const line = pageY() + window.innerHeight * 0.55;
      const next = marks.filter((mark) => mark < line).length - 1;
      if (next === target) return;
      target = next;
      items.forEach((item, index) => item.classList.toggle("is-current", index === Math.max(target, 0)));
      nodes.forEach((node, index) => node.classList.toggle("is-on", index <= target));
      paintRail();
      if (reduceMotion) swap(Math.max(target, 0), 1);
      else if (!frame) {
        last = performance.now();
        frame = window.requestAnimationFrame(tick);
      }
    };
    // The rail runs from the first year's centre to the last; the fill ends at the current year's node.
    const paintRail = () => {
      const span = centers.at(-1) - centers[0];
      fill.style.setProperty("--about-journey-progress", (span > 0 ? (centers[Math.max(target, 0)] - centers[0]) / span : 0).toFixed(3));
    };
    const measure = () => {
      const y = pageY();
      const top = list.getBoundingClientRect().top;
      const boxes = years.map((year) => year.getBoundingClientRect());
      marks = boxes.map((box) => box.top + y);
      centers = boxes.map((box) => box.top + box.height / 2 - top);
      rail.style.setProperty("--about-journey-rail-top", `${centers[0].toFixed(1)}px`);
      rail.style.setProperty("--about-journey-rail-height", `${(centers.at(-1) - centers[0]).toFixed(1)}px`);
      paintRail();
      update();
    };
    arts.forEach((_, index) => setP(index, reduceMotion ? 1 : 0));
    swap(0, reduceMotion ? 1 : 0);
    journey.classList.add("is-armed");
    const { signal } = state.abort;
    window.addEventListener("site:scroll", update, { signal });
    window.addEventListener("scroll", update, { passive: true, signal });
    const observer = new ResizeObserver(measure);
    observer.observe(journey);
    state.observers.push(observer);
    signal.addEventListener("abort", () => {
      window.cancelAnimationFrame(frame);
      journey.classList.remove("is-armed");
    }, { once: true });
  };

  const mount = (
    container = document.querySelector('[data-barba="container"]'),
    { settled = false, softNavigation = false, introStart = Promise.resolve() } = {},
  ) => {
    if (!container || activePage?.container === container) return activePage?.catalogReady;
    unmount();

    const advertisingHeroSettled = isCatalogNamespace(container.dataset.barbaNamespace)
      && advertisingHeroPlayed.has(container);

    const reduceMotion = window.TruongThinhEnv.reducedMotion.matches;
    const gsap = window.gsap;
    if (
      isCatalogNamespace(container.dataset.barbaNamespace)
      && (settled || reduceMotion || (gsap && window.SplitText))
    ) advertisingHeroPlayed.add(container);
    const abort = new AbortController();
    const observers = [];
    const frames = new Set();
    const state = {
      abort,
      carousels: new Set(),
      catalogReady: Promise.resolve(),
      container,
      frames,
      gsapContext: undefined,
      observers,
      splitInstances: new Map(),
      splitObservers: new Map(),
    };
    activePage = state;

    if (container.dataset.barbaNamespace === "advertising-product-detail") {
      state.catalogReady = mountAdvertisingDetailCarousels(container, state, reduceMotion);
    }

    if (container.dataset.barbaNamespace === "advertising-products") {
      state.catalogReady = loadAdvertisingCatalog()
        .then(({ mountMasonry }) => {
          if (!abort.signal.aborted) {
            return mountMasonry(container, {
              signal: abort.signal,
              scroll: window.TruongThinhMotion,
              softNavigation,
            });
          }
        })
        .then((result) => {
          // Search bar after the grid (Barba does not rerun scripts outside the container); a failed grid keeps the plain CTA link.
          // Idle time: the bar must not compete with the first cards (plan P6 performance gate).
          const loadSearch = () => !abort.signal.aborted && import("/advertising-products/search.mjs")
            .then((search) => !abort.signal.aborted && search.mount(container, { signal: abort.signal, softNavigation }))
            .catch(() => {});
          if (window.requestIdleCallback) window.requestIdleCallback(loadSearch, { timeout: 1500 });
          else setTimeout(loadSearch, 200);
          return result;
        });
    }

    // Projects page (projects R2): the advertising masonry runtime itself, with the projects artifact embedded in the page, no
    // detail view; it does not load the advertising page's catalog-artifact or catalog-detail.
    const projectArtifact = container.dataset.barbaNamespace === "projects"
      && container.querySelector("script[data-project-artifact]");
    if (projectArtifact) {
      // Parse inside the promise chain: broken JSON goes down the error branch (static cards) instead of bubbling up to the shell and reloading the page forever.
      // EN pages leave out projects without EN (cms-content R2).
      const artifactReady = Promise.resolve().then(() => JSON.parse(projectArtifact.textContent)).then((artifact) => (document.documentElement.lang === "en"
        ? { ...artifact, cards: artifact.cards.filter((card) => !card.noEn) } : artifact));
      // The "updating" line follows the active filter (the runtime changes aria-current when filtering in place).
      const emptyLine = container.querySelector(".projects-empty");
      const rail = container.querySelector(".project-filters");
      startGridWorker();
      state.catalogReady = Promise.all([artifactReady, ensureAdvertisingDependencies(), import("/masonry/runtime.mjs")])
        .then(([artifact, , { mountMasonry }]) => {
          if (emptyLine && rail) {
            const syncEmpty = () => {
              const filter = rail.querySelector('[data-masonry-filter][aria-current="true"]')?.dataset.masonryFilter ?? "all";
              emptyLine.hidden = filter === "all" || artifact.cards.some((card) => card.category === filter || card.clusterIds?.includes(filter));
            };
            const railObserver = new MutationObserver(syncEmpty);
            railObserver.observe(rail, { subtree: true, attributes: true, attributeFilter: ["aria-current"] });
            observers.push(railObserver);
          }
          if (!abort.signal.aborted) {
            return mountMasonry(container, {
              signal: abort.signal,
              scroll: window.TruongThinhMotion,
              softNavigation,
              artifact,
              viewer: false,
            });
          }
        })
        .catch((error) => {
          console.error("[projects] catalog mount failed", error);
          const grid = container.querySelector("[data-project-grid]");
          const fallback = grid?.querySelector("noscript");
          if (fallback && !grid.querySelector(".masonry-card")) grid.insertAdjacentHTML("afterbegin", fallback.textContent);
        });
    }

    const selectAll = (selector) => [...container.querySelectorAll(selector)];
    const scheduleFrame = (callback) => {
      const frame = window.requestAnimationFrame(() => {
        frames.delete(frame);
        callback();
      });
      frames.add(frame);
      return frame;
    };
    const cancelFrame = (frame) => {
      if (frame === undefined) return;
      window.cancelAnimationFrame(frame);
      frames.delete(frame);
    };
    const scheduleHeroFrame = (callback) => {
      const run = () => scheduleFrame(() => scheduleFrame(callback));
      if (document.readyState !== "loading") {
        run();
        return;
      }
      document.addEventListener("DOMContentLoaded", run, {
        once: true,
        signal: abort.signal,
      });
    };
    const observe = (observer, targets) => {
      observers.push(observer);
      targets.forEach((target) => observer.observe(target));
    };

    // The row's hidden position inside the mask is computed by motion.js; fall back to 2em when missing.
    const hiddenY = (index, line) => window.TruongThinhMotion?.maskHiddenY?.(index, line) ?? "2em";
    const SplitText = window.SplitText;
    if (gsap && !reduceMotion) {
      state.gsapContext = gsap.context(() => {
        // Without SplitText the text stays as is and fully visible; media and hero motion still run.
        const splitRoute = Boolean(SplitText) && new Set([
          "advertising-products",
          "projects",
          "residential",
          "commercial",
          "news",
          "project",
        ]).has(container.dataset.barbaNamespace);
        const lineGroups = splitRoute ? selectAll("[data-motion-lines]") : [];
        const wordGroups = splitRoute ? selectAll("[data-motion-words]") : [];
        const fadeItems = selectAll("[data-motion-fade]");
        const upItems = selectAll("[data-motion-up], [data-motion-left]");
        const mediaItems = selectAll("[data-motion-media]");
        const motionItems = [...fadeItems, ...upItems, ...mediaItems];
        const completedTextGroups = new WeakSet();
        const observedTextGroups = new WeakSet();
        const lineTweens = new WeakMap();
        const lineStates = new WeakMap();
        const heroProfile =
          document.body.dataset.detailHeroProfile || "words-09";
        const heroKicker = container.querySelector(
          "[data-motion-hero-kicker]",
        );
        const heroFade = container.querySelector("[data-motion-hero-fade]");
        const heroWrapperZoom = container.querySelector(
          "[data-motion-hero-wrapper-zoom]",
        );
        const heroMediaZoom = container.querySelector(
          "[data-motion-hero-media]",
        );
        // About keeps its title unsplit, so there is no hero word group to tween.
        const heroWordGroup = wordGroups.find((group) =>
          group.hasAttribute("data-motion-hero-title"),
        );
        const heroSettled = settled || advertisingHeroSettled;
        let advertisingHeroTextStarted = false;
        const isHeroGroup = (group) => group === heroWordGroup;
        const isGroupSettled = (group) => settled || (
          isHeroGroup(group) && (
            advertisingHeroSettled || (
              isCatalogNamespace(container.dataset.barbaNamespace) && advertisingHeroTextStarted
            )
          )
        );
        const settleHeroItem = (item) => {
          if (advertisingHeroSettled) item.style.transition = "none";
          item.classList.add("is-motion-inview");
        };
        // The hero intro counts its delay from when the veil starts opening (first-load-parity R2): a direct open still waits for the catalog and fonts
        // longer than a soft transition, and counting from mount would make the text run under the veil.
        let startedAt = performance.now();
        const afterIntroStart = (callback) => introStart.then(() => {
          if (activePage === state) callback();
        });
        introStart.then(() => {
          startedAt = performance.now();
        });
        let rebuildFrame;
        let rebuildTimer;
        let resolveRebuild;

        const getDelay = (element) =>
          Number.parseFloat(element.dataset.motionDelay || "0") || 0;
        const getRemainingDelay = (delay) =>
          Math.max(0, delay - (performance.now() - startedAt) / 1000);
        const captureLineState = (group) => {
          const previous = lineTweens.get(group);
          const lineState = lineStates.get(group) || {
            completed: isGroupSettled(group),
            started: false,
            totalTime: 0,
          };
          if (previous) {
            lineState.totalTime = previous.totalTime();
            lineState.started = lineState.started || previous.totalTime() > 0;
            lineState.completed = lineState.completed || previous.progress() >= 1;
          }
          lineStates.set(group, lineState);
          return lineState;
        };
        const resetSplit = (group) => {
          captureLineState(group);
          lineTweens.get(group)?.kill();
          lineTweens.delete(group);
          state.splitInstances.get(group)?.revert();
          state.splitInstances.delete(group);
          state.splitObservers.get(group)?.disconnect();
          state.splitObservers.delete(group);
        };
        const syncSplitAria = (group) => {
          group.setAttribute(
            "aria-label",
            group.textContent.replace(/\s+/g, " ").trim(),
          );
        };
        const splitWords = (group) => {
          resetSplit(group);
          const split = SplitText.create(group, {
            type: "words",
            wordsClass: "motion-word",
            aria: "auto",
          });
          state.splitInstances.set(group, split);
          syncSplitAria(group);
          return split.words;
        };
        const splitLines = (group) => {
          resetSplit(group);
          const split = SplitText.create(group, {
            type: "lines",
            linesClass: "motion-line",
            mask: "lines",
            aria: "auto",
            onSplit: (self) => {
              const lineState = captureLineState(group);
              lineTweens.get(group)?.kill();
              const completed = isGroupSettled(group) || lineState.completed;
              let tween;
              tween = gsap.to(self.lines, {
                y: "-0.1em",
                duration: completed ? 0 : 1.9,
                ease: "power4.out",
                stagger: 0.1,
                paused: !completed && !lineState.started,
                overwrite: true,
                onComplete: () => {
                  self.lines.forEach((line) => window.TruongThinhMotion?.openTextMask?.(line));
                  lineState.completed = true;
                  lineState.totalTime = tween?.totalTime() ?? 1.9;
                  completedTextGroups.add(group);
                },
                onUpdate: () => {
                  if (tween) lineState.totalTime = tween.totalTime();
                },
              });
              lineTweens.set(group, tween);
              if (lineState.started && !completed) {
                tween.totalTime(
                  Math.min(lineState.totalTime, tween.totalDuration()),
                  true,
                ).play();
              }
              return tween;
            },
          });
          state.splitInstances.set(group, split);
          // Replaces SplitText's autoSplit: it re-splits even when the group is hidden (width 0), like the grid CTA when opening the Advertising detail,
          // costing over 50ms on an old A05s and splitting again on Back (decision phone-frame-budget).
          let width = group.offsetWidth;
          let timer;
          const observer = new ResizeObserver(() => {
            clearTimeout(timer);
            timer = setTimeout(() => {
              const next = group.offsetWidth;
              if (!next || next === width || state.splitInstances.get(group) !== split) return;
              width = next;
              split.split();
            }, 200);
          });
          observer.observe(group);
          state.splitObservers.set(group, observer);
          syncSplitAria(group);
          return split.lines;
        };
        const revealTextGroup = (group, delayOverride) => {
          const delay = delayOverride ?? getDelay(group);
          if (group.hasAttribute("data-motion-lines")) {
            const lineState = lineStates.get(group) || {
              completed: false,
              started: false,
              totalTime: 0,
            };
            lineState.completed = false;
            lineState.started = true;
            lineState.totalTime = 0;
            lineStates.set(group, lineState);
            completedTextGroups.delete(group);
            lineTweens.get(group)?.delay(delay).play(0);
          } else {
            window.TruongThinhMotion.revealWords(group.querySelectorAll(".motion-word"), {
              delay,
              onComplete: () => completedTextGroups.add(group),
            });
          }
        };
        const textObserver = new IntersectionObserver(
          (entries, observer) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              revealTextGroup(entry.target);
              observer.unobserve(entry.target);
            });
          },
          { threshold: 0 },
        );
        observers.push(textObserver);
        const prepareTextGroup = (group) => {
          const parts = group.hasAttribute("data-motion-lines")
            ? splitLines(group)
            : splitWords(group);
          const isRevealed =
            isGroupSettled(group) ||
            completedTextGroups.has(group) ||
            lineStates.get(group)?.completed;
          gsap.set(
            parts,
            group.hasAttribute("data-motion-lines")
              ? { y: isRevealed ? "-0.1em" : hiddenY }
              : { opacity: isRevealed ? 1 : 0 },
          );
          gsap.set(group, { opacity: 1 });
          if (isGroupSettled(group)) completedTextGroups.add(group);
          if (
            !isGroupSettled(group) &&
            group !== heroWordGroup &&
            !isRevealed &&
            !observedTextGroups.has(group)
          ) {
            observedTextGroups.add(group);
            textObserver.observe(group);
          }
          return parts;
        };
        const cancelPendingRebuild = () => {
          clearTimeout(rebuildTimer);
          if (rebuildFrame === undefined) return;
          cancelFrame(rebuildFrame);
          rebuildFrame = undefined;
          resolveRebuild?.();
          resolveRebuild = undefined;
        };
        const rebuildText = (initial = false) => {
          cancelPendingRebuild();
          return new Promise((resolve) => {
            resolveRebuild = resolve;
            const groups = [...lineGroups, ...wordGroups];
            // Each group split forces one layout; split into several ~8ms tasks to avoid long tasks > 50ms on Android phones
            // when entering the page (decision phone-frame-budget). rebuildFrame keeps the value until done so it can be cancelled.
            const prepareBatch = (index) => {
              const deadline = performance.now() + 8;
              do prepareTextGroup(groups[index++]);
              while (index < groups.length && performance.now() < deadline);
              if (index < groups.length) {
                rebuildTimer = setTimeout(() => prepareBatch(index));
                return;
              }
              finishRebuild();
            };
            const finishRebuild = () => {
              rebuildFrame = undefined;
              const startHeroText = initial && !heroSettled && !advertisingHeroTextStarted;
              if (startHeroText && heroWordGroup) advertisingHeroTextStarted = true;
              if (startHeroText && heroWordGroup) {
                const titleDelay = heroProfile === "words-06" ? 0.6 : 0.9;
                afterIntroStart(() => window.TruongThinhMotion.revealWords(heroWordGroup.querySelectorAll(".motion-word"), {
                  delay: getRemainingDelay(titleDelay),
                  onComplete: () => completedTextGroups.add(heroWordGroup),
                }));
              }
              window.dispatchEvent(new CustomEvent("site:layout"));
              resolveRebuild?.();
              resolveRebuild = undefined;
            };
            rebuildFrame = scheduleFrame(() => {
              if (groups.length) prepareBatch(0);
              else finishRebuild();
            });
          });
        };
        state.revertSplitText = () => {
          cancelPendingRebuild();
          state.splitInstances.forEach((split) => split.revert());
          state.splitInstances.clear();
          state.splitObservers.forEach((observer) => observer.disconnect());
          state.splitObservers.clear();
          [...lineGroups, ...wordGroups].forEach((group) => {
            observedTextGroups.delete(group);
          });
          lineGroups.forEach((group) => {
            captureLineState(group);
            lineTweens.get(group)?.kill();
            lineTweens.delete(group);
          });
        };
        state.rebuildSplitText = () => rebuildText(true);

        [...lineGroups, ...wordGroups].forEach((group) => {
          gsap.set(group, { opacity: isGroupSettled(group) ? 1 : 0 });
        });

        const itemObserver = new IntersectionObserver(
          (entries, observer) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("is-motion-inview");
              observer.unobserve(entry.target);
            });
          },
          { threshold: 0 },
        );
        if (settled) {
          motionItems.forEach((item) => item.classList.add("is-motion-inview"));
        } else {
          observe(itemObserver, motionItems);
        }
        motionItems.forEach((item) => {
          item.style.setProperty("--motion-delay", `${getDelay(item)}s`);
        });
        // A block is placed into a new layout (the CTA cluster moves between masonry and detail, or the detail image changes): text and buttons return to the
        // not-yet-revealed state and wait for the next view entry, like the first time in masonry (advertising-cta-center-parallax R9).
        state.rearmMotion = (root) => {
          if (settled || !root) return;
          [...lineGroups, ...wordGroups].filter((group) => root.contains(group)).forEach((group) => {
            textObserver.unobserve(group);
            observedTextGroups.delete(group);
            completedTextGroups.delete(group);
            lineStates.delete(group);
            lineTweens.get(group)?.kill();
            lineTweens.delete(group);
            prepareTextGroup(group);
          });
          motionItems.filter((item) => root.contains(item)).forEach((item) => {
            item.classList.remove("is-motion-inview");
            itemObserver.unobserve(item);
            itemObserver.observe(item);
          });
        };

        // Hero intro items wait for the veil like the title: the kicker slides in at 1.2s (0.9s on words-06), the project hero CTA fades in at 1.8s
        // (Espacio project pages, projects R3).
        [
          [heroKicker, heroProfile === "words-06" ? 0.9 : 1.2],
          [heroFade, 1.8],
        ].forEach(([item, delay]) => {
          if (!item) return;
          if (heroSettled) {
            settleHeroItem(item);
            return;
          }
          gsap.killTweensOf(item);
          gsap.set(item, {
            clearProps: "opacity,visibility,transform",
          });
          afterIntroStart(() => {
            item.style.setProperty(
              "--motion-delay",
              `${getRemainingDelay(delay)}s`,
            );
            scheduleHeroFrame(() => item.classList.add("is-motion-inview"));
          });
        });
        if (heroWrapperZoom && heroSettled) {
          settleHeroItem(heroWrapperZoom);
        } else if (heroWrapperZoom) {
          // Once the intro zoom ends, or on resize mid-intro, drop the transition: past the 1024px breakpoint the transform changes and the title must snap back
          // to its place like on other pages.
          const stopZoom = (event) => {
            if (event.type === "transitionend" && event.target !== heroWrapperZoom) return;
            heroWrapperZoom.style.transition = "none";
            heroWrapperZoom.removeEventListener("transitionend", stopZoom);
            window.removeEventListener("resize", stopZoom);
          };
          heroWrapperZoom.addEventListener("transitionend", stopZoom);
          window.addEventListener("resize", stopZoom, { signal: state.abort.signal });
          afterIntroStart(() => scheduleHeroFrame(() =>
            heroWrapperZoom.classList.add("is-motion-inview"),
          ));
        }
        if (heroMediaZoom && heroSettled) {
          settleHeroItem(heroMediaZoom);
        } else if (heroMediaZoom) {
          afterIntroStart(() => scheduleHeroFrame(() =>
            heroMediaZoom.classList.add("is-motion-inview"),
          ));
        }
        if (heroProfile === "zoom-09") {
          const heroImages = selectAll(".detail-hero .hero-slide img");
          gsap.killTweensOf(heroImages);
          gsap.set(heroImages, { clearProps: "transform" });
        }

        Promise.resolve(document.fonts?.ready)
          .catch(() => undefined)
          .then(() => {
            if (activePage === state) rebuildText(true);
          });

        const filters = selectAll("[data-masonry-filter]");
        if (filters.length && heroSettled) {
          gsap.set(filters, {
            clearProps: "transform,opacity,visibility",
          });
        } else if (filters.length) {
          gsap.set(filters, { y: 20, opacity: 0, visibility: "hidden" });
          afterIntroStart(() => state.gsapContext.add(() => gsap.to(filters, {
            y: 0,
            opacity: 1,
            visibility: "visible",
            delay: 1.3,
            duration: 1,
            stagger: 0.15,
            ease: "expo.out",
            clearProps: "transform,opacity,visibility",
          })));
        }
      }, container);
    }

    selectAll("[data-gallery]").forEach((gallery) => {
      const track = gallery.querySelector("[data-gallery-track]");
      track.querySelectorAll("img").forEach((image) => {
        image.draggable = false;
      });
      track.addEventListener("dragstart", (event) => event.preventDefault(), {
        signal: abort.signal,
      });
      // Focusable region: arrow keys switch images when Swiper is running; before that, the track scrolls natively with the keyboard.
      track.addEventListener(
        "keydown",
        (event) => {
          const step = { ArrowLeft: "slidePrev", ArrowRight: "slideNext" }[event.key];
          if (!step || !track.swiper) return;
          event.preventDefault();
          track.swiper[step]();
        },
        { signal: abort.signal },
      );

      // Drag, swipe and pagination dots like the Espacio gallery: Swiper with the same parameters they use (detail-pages R7).
      // Load Swiper when the gallery is one screen away from the viewport so it does not compete with the hero for network.
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          ensureAdvertisingCarouselModules()
            .then(({ Mousewheel, Pagination, Swiper }) => {
              if (abort.signal.aborted) return;
              state.carousels.add(new Swiper(track, {
                modules: [Mousewheel, Pagination],
                wrapperClass: "detail-gallery__slides",
                slideClass: "detail-gallery__item",
                speed: reduceMotion ? 0 : 500,
                slidesPerView: "auto",
                breakpoints: {
                  120: { spaceBetween: 10, pagination: { dynamicBullets: true } },
                  600: { spaceBetween: 20 },
                },
                grabCursor: true,
                // The whole track (gap under the caption, dot row) accepts drag, not just the image wrapper: dragging from there does not select the caption text.
                touchEventsTarget: "container",
                edgeSwipeDetection: true,
                watchOverflow: true,
                mousewheel: { forceToAxis: true },
                pagination: {
                  el: gallery.querySelector("[data-gallery-pagination]"),
                  clickable: true,
                },
              }));
            })
            // Swiper failed to load: keep the track natively scrollable.
            .catch(() => {});
        },
        { rootMargin: "100% 0px" },
      );
      observer.observe(gallery);
      observers.push(observer);
    });

    mountAboutJourney(container, state, reduceMotion);

    return state.catalogReady;
  };

  const revertSplitText = () => activePage?.revertSplitText?.();
  const rebuildSplitText = () => activePage?.rebuildSplitText?.();
  const rearmMotion = (root) => activePage?.rearmMotion?.(root);

  window.TruongThinhDetail = { mount, revertSplitText, rebuildSplitText, rearmMotion, ensureAdvertisingDependencies, loadAdvertisingCatalog, unmount };
  if (document.documentElement.classList.contains("motion-fallback")) {
    mount(undefined, { settled: true });
  }
})();
