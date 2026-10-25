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
  if (directContainer?.dataset.barbaNamespace === "advertising-products"
    && (navigationType === "back_forward" || historyFallback)) {
    window.__ttAdvertisingBrowseStartupHistory = {
      navigationType,
      historyFallback,
      state: nativeState,
    };
  }

  let activePage;
  let advertisingCarouselModulesPromise;
  let advertisingCarouselStylePromise;
  let advertisingDependenciesPromise;
  const advertisingHeroPlayed = new WeakSet();
  const ADVERTISING_DEPENDENCY_TIMEOUT = 4_000;

  const ADVERTISING_DEPENDENCIES = [
    { name: "GSAP 3.15.0", source: "/assets/vendor/gsap-3.15.0.min.js", ready: () => window.gsap?.version === "3.15.0", optional: true },
    { name: "SplitText 3.15.0", source: "/assets/vendor/SplitText-3.15.0.min.js", ready: () => typeof window.SplitText === "function", optional: true },
    { name: "Masonry 4.2.2", source: "/assets/vendor/masonry-4.2.2.min.js", ready: () => typeof window.Masonry === "function" },
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
    // Tải song song; script async=false vẫn chạy theo đúng thứ tự khai báo.
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

  // Vendor, module catalog và artifact tải cùng lúc. Route mềm gọi ngay lúc bấm link để mạng chạy song song với veil phủ
  // thay vì nối đuôi sau veil (Shell R6). Artifact import cùng lúc với runtime: runtime import lại đúng URL này nên dùng
  // chung module, không tải hai lần; nếu chờ runtime tải xong mới import thì artifact trễ một vòng mạng.
  const loadAdvertisingCatalog = () => Promise.all([
    ensureAdvertisingDependencies(),
    import("/advertising-products/catalog-runtime.mjs").then((runtime) => {
      runtime.preloadAdvertisingCatalog();
      return runtime;
    }),
    import("/advertising-products/catalog-artifact.mjs").catch(() => {}),
    // Vào thẳng URL photo thì detail (mô tả, related) cần ngay: tải cùng artifact, runtime dùng chung module.
    location.pathname.includes("/p/") ? import("/advertising-products/catalog-detail.mjs").catch(() => {}) : null,
  ]).then(([, runtime]) => runtime);

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
    const sections = [...container.querySelectorAll("[data-advertising-carousel]")];
    if (!sections.length) return Promise.resolve();
    const syncClientWidth = () => {
      const clientWidth = `${document.documentElement.clientWidth}px`;
      sections.forEach((section) => {
        section.style.setProperty("--advertising-carousel-client-width", clientWidth);
      });
    };
    syncClientWidth();
    window.addEventListener("resize", syncClientWidth, { signal: state.abort.signal });
    return ensureAdvertisingCarouselModules().then(({ A11y, Mousewheel, Pagination, Swiper }) => {
      if (state.abort.signal.aborted || activePage !== state) return;
      sections.forEach((section) => {
        const viewport = section.querySelector("[data-advertising-carousel-viewport]");
        const pagination = section.querySelector("[data-advertising-carousel-pagination]");
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
        section.dataset.advertisingCarouselState = "enhanced";
        state.carousels.add(carousel);
      });
    }).catch(() => {
      sections.forEach((section) => {
        section.dataset.advertisingCarouselState = "native";
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

  const mount = (
    container = document.querySelector('[data-barba="container"]'),
    { settled = false, softNavigation = false, introStart = Promise.resolve() } = {},
  ) => {
    if (!container || activePage?.container === container) return activePage?.catalogReady;
    unmount();

    const advertisingHeroSettled = container.dataset.barbaNamespace === "advertising-products"
      && advertisingHeroPlayed.has(container);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const gsap = window.gsap;
    if (
      container.dataset.barbaNamespace === "advertising-products"
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
        .then(({ mountAdvertisingCatalog }) => {
          if (!abort.signal.aborted) {
            return mountAdvertisingCatalog(container, {
              signal: abort.signal,
              scroll: window.TruongThinhMotion,
              softNavigation,
            });
          }
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

    const SplitText = window.SplitText;
    if (gsap && !reduceMotion) {
      state.gsapContext = gsap.context(() => {
        // Không có SplitText thì chữ giữ nguyên và hiện đủ; media và hero motion vẫn chạy.
        const splitRoute = Boolean(SplitText) && new Set([
          "advertising-products",
          "residential",
          "commercial",
        ]).has(container.dataset.barbaNamespace);
        const lineGroups = splitRoute ? selectAll("[data-motion-lines]") : [];
        const wordGroups = splitRoute ? selectAll("[data-motion-words]") : [];
        const fadeItems = selectAll("[data-motion-fade]");
        const upItems = selectAll("[data-motion-up]");
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
        const heroWrapperZoom = container.querySelector(
          "[data-motion-hero-wrapper-zoom]",
        );
        const heroMediaZoom = container.querySelector(
          "[data-motion-hero-media]",
        );
        // About giữ title không split, nên không có nhóm word hero để tween.
        const heroWordGroup = wordGroups.find((group) =>
          group.hasAttribute("data-motion-hero-title"),
        );
        const heroSettled = settled || advertisingHeroSettled;
        let advertisingHeroTextStarted = false;
        const isHeroGroup = (group) => group === heroWordGroup;
        const isGroupSettled = (group) => settled || (
          isHeroGroup(group) && (
            advertisingHeroSettled || (
              container.dataset.barbaNamespace === "advertising-products" && advertisingHeroTextStarted
            )
          )
        );
        const settleHeroItem = (item) => {
          if (advertisingHeroSettled) item.style.transition = "none";
          item.classList.add("is-motion-inview");
        };
        // Intro hero đếm delay từ lúc veil bắt đầu mở (first-load-parity R2): mở trực tiếp còn chờ catalog, font
        // lâu hơn chuyển mềm, đếm từ mount thì chữ chạy dưới veil.
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
          // Thay autoSplit của SplitText: nó split lại cả khi group bị ẩn (width 0), như CTA của grid lúc mở detail
          // Advertising, tốn hơn 50ms trên A05s cũ rồi lại split khi Back (decision phone-frame-budget).
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
            gsap.to(group.querySelectorAll(".motion-word"), {
              opacity: 1,
              duration: 1,
              delay,
              ease: "expo.out",
              stagger: 0.2,
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
              ? { y: isRevealed ? "-0.1em" : "2em" }
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
            // Split mỗi group ép một lần layout; chia thành nhiều task khoảng 8ms để không long task > 50ms trên phone Android
            // khi vào trang (decision phone-frame-budget). rebuildFrame giữ giá trị tới khi xong để cancel được.
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
                afterIntroStart(() => gsap.to(heroWordGroup.querySelectorAll(".motion-word"), {
                  opacity: 1,
                  duration: 1,
                  delay: getRemainingDelay(titleDelay),
                  ease: "expo.out",
                  stagger: 0.2,
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
        mediaItems.forEach((item) => {
          const markReady = () => item.classList.add("is-motion-ready");
          if (item.complete) markReady();
          else {
            // Ảnh lỗi cũng phải hiện để thấy alt, nên error đánh dấu sẵn sàng như load.
            item.addEventListener("load", markReady, { once: true, signal: abort.signal });
            item.addEventListener("error", markReady, { once: true, signal: abort.signal });
          }
        });

        const isInside = (section, element) =>
          Boolean(section && element && (section === element || section.contains(element)));
        state.replaySection = (section) => {
          if (!section) return false;
          const sectionTextGroups = [...lineGroups, ...wordGroups].filter((group) =>
            isInside(section, group) &&
              !(container.dataset.barbaNamespace === "advertising-products" && isHeroGroup(group)),
          );
          const sectionMotionItems = motionItems.filter((item) =>
            isInside(section, item) &&
              !(container.dataset.barbaNamespace === "advertising-products" && item.closest(".detail-index-hero")),
          );
          const sectionHeroItems = [
            heroKicker,
            heroWrapperZoom,
            heroMediaZoom,
          ].filter((item) =>
            isInside(section, item) && container.dataset.barbaNamespace !== "advertising-products",
          );

          sectionTextGroups.forEach((group) => {
            const parts = prepareTextGroup(group);
            gsap.killTweensOf(parts);
            gsap.set(
              parts,
              group.hasAttribute("data-motion-lines")
                ? { y: "2em" }
                : { opacity: 0 },
            );
          });
          [...sectionMotionItems, ...sectionHeroItems].forEach((item) =>
            item.classList.remove("is-motion-inview"),
          );

          scheduleFrame(() => {
            sectionTextGroups.forEach((group) => revealTextGroup(group, 0));
            [...sectionMotionItems, ...sectionHeroItems].forEach((item) =>
              item.classList.add("is-motion-inview"),
            );
          });
          return Boolean(
            sectionTextGroups.length ||
              sectionMotionItems.length ||
              sectionHeroItems.length,
          );
        };

        if (heroKicker && heroSettled) {
          settleHeroItem(heroKicker);
        } else if (heroKicker) {
          gsap.killTweensOf(heroKicker);
          gsap.set(heroKicker, {
            clearProps: "opacity,visibility,transform",
          });
          const kickerDelay = heroProfile === "words-06" ? 0.9 : 1.2;
          afterIntroStart(() => {
            heroKicker.style.setProperty(
              "--motion-delay",
              `${getRemainingDelay(kickerDelay)}s`,
            );
            scheduleHeroFrame(() =>
              heroKicker.classList.add("is-motion-inview"),
            );
          });
        }
        if (heroWrapperZoom && heroSettled) {
          settleHeroItem(heroWrapperZoom);
        } else if (heroWrapperZoom) {
          // Intro zoom xong, hoặc resize giữa intro, thì bỏ transition: qua mốc 1024px transform đổi, title phải về
          // chỗ ngay như trang khác.
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

        const filters = selectAll("[data-advertising-filter]");
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
      // Region focus được: mũi tên chuyển ảnh khi Swiper chạy; trước đó track cuộn native bằng phím.
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

      // Kéo, vuốt, chấm phân trang như gallery Espacio: Swiper cùng tham số họ dùng (detail-pages R7).
      // Tải Swiper khi gallery cách viewport một màn hình để không tranh mạng với hero.
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
                // Cả track (khe dưới caption, hàng chấm) nhận kéo, không chỉ wrapper ảnh: kéo từ đó không bôi đen caption.
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
            // Swiper tải lỗi: giữ track cuộn native.
            .catch(() => {});
        },
        { rootMargin: "100% 0px" },
      );
      observer.observe(gallery);
      observers.push(observer);
    });

    return state.catalogReady;
  };

  const replaySection = (section) => activePage?.replaySection?.(section) || false;
  const revertSplitText = () => activePage?.revertSplitText?.();
  const rebuildSplitText = () => activePage?.rebuildSplitText?.();

  window.TruongThinhDetail = { mount, replaySection, revertSplitText, rebuildSplitText, ensureAdvertisingDependencies, loadAdvertisingCatalog, unmount };
  if (document.documentElement.classList.contains("motion-fallback")) {
    mount(undefined, { settled: true });
  }
})();
