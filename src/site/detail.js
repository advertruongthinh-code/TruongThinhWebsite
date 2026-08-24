(() => {
  let activePage;

  const unmount = () => {
    if (!activePage) return;
    activePage.abort.abort();
    activePage.observers.forEach((observer) => observer.disconnect());
    activePage.frames.forEach((frame) => window.cancelAnimationFrame(frame));
    activePage.timers.forEach((timer) => window.clearTimeout(timer));
    activePage.gsapContext?.revert();
    activePage = undefined;
  };

  const mount = (
    container = document.querySelector('[data-barba="container"]'),
    { settled = false } = {},
  ) => {
    if (!container || activePage?.container === container) return;
    unmount();

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const gsap = window.gsap;
    const abort = new AbortController();
    const observers = [];
    const frames = new Set();
    const timers = new Set();
    const state = {
      abort,
      container,
      frames,
      gsapContext: undefined,
      observers,
      timers,
    };
    activePage = state;

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
      if (document.readyState === "complete") {
        run();
        return;
      }
      document.addEventListener("DOMContentLoaded", run, {
        once: true,
        signal: abort.signal,
      });
    };
    const scheduleTimer = (callback, delay) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        callback();
      }, delay);
      timers.add(timer);
      return timer;
    };
    const cancelTimer = (timer) => {
      if (timer === undefined) return;
      window.clearTimeout(timer);
      timers.delete(timer);
    };
    const observe = (observer, targets) => {
      observers.push(observer);
      targets.forEach((target) => observer.observe(target));
    };

    if (gsap && !reduceMotion) {
      state.gsapContext = gsap.context(() => {
        const lineGroups = selectAll("[data-motion-lines]");
        const wordGroups = selectAll("[data-motion-words]");
        const fadeItems = selectAll("[data-motion-fade]");
        const upItems = selectAll("[data-motion-up]");
        const mediaItems = selectAll("[data-motion-media]");
        const motionItems = [...fadeItems, ...upItems, ...mediaItems];
        const revealedTextGroups = new WeakSet();
        const observedTextGroups = new WeakSet();
        const heroProfile =
          document.body.dataset.detailHeroProfile || "words-09";
        const heroKicker = container.querySelector(
          "[data-motion-hero-kicker]",
        );
        const heroZoom = container.querySelector("[data-motion-hero-zoom]");
        const heroWrapperZoom = container.querySelector(
          "[data-motion-hero-wrapper-zoom]",
        );
        const heroMediaZoom = container.querySelector(
          "[data-motion-hero-media]",
        );
        const heroWordGroup = container.querySelector(
          "[data-motion-words][data-motion-hero-title]",
        );
        const heroMotto = container.querySelector(
          "[data-motion-hero-motto]",
        );
        const startedAt = performance.now();
        let rebuildFrame;
        let rebuildTimer;

        const getDelay = (element) =>
          Number.parseFloat(element.dataset.motionDelay || "0") || 0;
        const getRemainingDelay = (delay) =>
          Math.max(0, delay - (performance.now() - startedAt) / 1000);
        const normalizeText = (value) => value.replace(/\s+/g, " ").trim();
        const getSources = (group, selector) => {
          const sources = [...group.querySelectorAll(selector)];
          return sources.length ? sources : [group];
        };
        const resetSource = (source) => {
          const text = normalizeText(source.textContent);
          source.replaceChildren(document.createTextNode(text));
          return text;
        };
        const appendWords = (source, words, className) => {
          const fragment = document.createDocumentFragment();
          words.forEach((word, index) => {
            const span = document.createElement("span");
            span.className = className;
            span.textContent = word;
            fragment.append(span);
            if (index < words.length - 1) {
              fragment.append(document.createTextNode(" "));
            }
          });
          source.replaceChildren(fragment);
        };
        const splitWords = (group) => {
          getSources(group, "[data-motion-word-source]").forEach((source) => {
            const text = resetSource(source);
            if (text) appendWords(source, text.split(" "), "motion-word");
          });
          return [...group.querySelectorAll(".motion-word")];
        };
        const splitLines = (group) => {
          getSources(group, "[data-motion-line-source]").forEach((source) => {
            const text = resetSource(source);
            if (!text) return;
            appendWords(source, text.split(" "), "motion-word-probe");
            const rows = [];
            source.querySelectorAll(".motion-word-probe").forEach((probe) => {
              const top = probe.getBoundingClientRect().top;
              const row = rows.find(
                (candidate) => Math.abs(candidate.top - top) < 2,
              );
              if (row) row.words.push(probe.textContent);
              else rows.push({ top, words: [probe.textContent] });
            });
            const fragment = document.createDocumentFragment();
            rows.forEach(({ words }, index) => {
              const mask = document.createElement("span");
              const line = document.createElement("span");
              mask.className = "motion-line-mask";
              line.className = "motion-line";
              line.textContent = words.join(" ");
              mask.append(line);
              fragment.append(mask);
              if (index < rows.length - 1) {
                fragment.append(document.createTextNode(" "));
              }
            });
            source.replaceChildren(fragment);
          });
          return [...group.querySelectorAll(".motion-line")];
        };
        const revealTextGroup = (group, delayOverride) => {
          const delay = delayOverride ?? getDelay(group);
          if (group.hasAttribute("data-motion-lines")) {
            gsap.to(group.querySelectorAll(".motion-line"), {
              y: "-0.1em",
              duration: 1.9,
              delay,
              ease: "power4.out",
              stagger: 0.1,
            });
          } else {
            gsap.to(group.querySelectorAll(".motion-word"), {
              opacity: 1,
              duration: 1,
              delay,
              ease: "expo.out",
              stagger: 0.2,
            });
          }
          revealedTextGroups.add(group);
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
          const isRevealed = settled || revealedTextGroups.has(group);
          gsap.set(
            parts,
            group.hasAttribute("data-motion-lines")
              ? { y: isRevealed ? "-0.1em" : "2em" }
              : { opacity: isRevealed ? 1 : 0 },
          );
          gsap.set(group, { opacity: 1 });
          if (settled) revealedTextGroups.add(group);
          if (
            !settled &&
            group !== heroWordGroup &&
            group !== heroMotto &&
            !isRevealed &&
            !observedTextGroups.has(group)
          ) {
            observedTextGroups.add(group);
            textObserver.observe(group);
          }
          return parts;
        };
        const rebuildText = (initial = false) => {
          cancelFrame(rebuildFrame);
          rebuildFrame = scheduleFrame(() => {
            lineGroups.forEach(prepareTextGroup);
            wordGroups.forEach(prepareTextGroup);
            if (initial && heroWordGroup && !settled) {
              const titleDelay = heroProfile === "words-06" ? 0.6 : 0.9;
              gsap.to(heroWordGroup.querySelectorAll(".motion-word"), {
                opacity: 1,
                duration: 1,
                delay: getRemainingDelay(titleDelay),
                ease: "expo.out",
                stagger: 0.2,
              });
              revealedTextGroups.add(heroWordGroup);
            }
            if (initial && heroMotto && !settled) {
              revealTextGroup(
                heroMotto,
                getRemainingDelay(getDelay(heroMotto)),
              );
            }
            window.dispatchEvent(new CustomEvent("site:layout"));
          });
        };
        const scheduleRebuild = () => {
          cancelTimer(rebuildTimer);
          rebuildTimer = scheduleTimer(() => rebuildText(false), 120);
        };

        [...lineGroups, ...wordGroups].forEach((group) => {
          gsap.set(group, { opacity: settled ? 1 : 0 });
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
          else item.addEventListener("load", markReady, { once: true, signal: abort.signal });
        });

        const isInside = (section, element) =>
          Boolean(section && element && (section === element || section.contains(element)));
        state.replaySection = (section) => {
          if (!section) return false;
          const sectionTextGroups = [...lineGroups, ...wordGroups].filter((group) =>
            isInside(section, group),
          );
          const sectionMotionItems = motionItems.filter((item) =>
            isInside(section, item),
          );
          const sectionHeroItems = [
            heroKicker,
            heroZoom,
            heroWrapperZoom,
            heroMediaZoom,
          ].filter((item) => isInside(section, item));

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

        if (heroKicker && settled) {
          heroKicker.classList.add("is-motion-inview");
        } else if (heroKicker) {
          gsap.killTweensOf(heroKicker);
          gsap.set(heroKicker, {
            clearProps: "opacity,visibility,transform",
          });
          const kickerDelay = heroProfile === "words-06" ? 0.9 : 1.2;
          heroKicker.style.setProperty(
            "--motion-delay",
            `${getRemainingDelay(kickerDelay)}s`,
          );
          scheduleHeroFrame(() =>
            heroKicker.classList.add("is-motion-inview"),
          );
        }
        if (heroZoom && settled) {
          heroZoom.classList.add("is-motion-inview");
        } else if (heroZoom) {
          heroZoom.style.setProperty(
            "--motion-delay",
            `${getRemainingDelay(0.9)}s`,
          );
          scheduleHeroFrame(() => heroZoom.classList.add("is-motion-inview"));
        }
        if (heroWrapperZoom && settled) {
          heroWrapperZoom.classList.add("is-motion-inview");
        } else if (heroWrapperZoom) {
          scheduleHeroFrame(() =>
            heroWrapperZoom.classList.add("is-motion-inview"),
          );
        }
        if (heroMediaZoom && settled) {
          heroMediaZoom.classList.add("is-motion-inview");
        } else if (heroMediaZoom) {
          scheduleHeroFrame(() =>
            heroMediaZoom.classList.add("is-motion-inview"),
          );
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
        window.addEventListener("languagechange", () => rebuildText(false), {
          signal: abort.signal,
        });
        window.addEventListener("resize", scheduleRebuild, {
          passive: true,
          signal: abort.signal,
        });

        const filters = selectAll("[data-project-filter]");
        if (filters.length && settled) {
          gsap.set(filters, {
            clearProps: "transform,opacity,visibility",
          });
        } else if (filters.length) {
          gsap.fromTo(
            filters,
            { y: 20, opacity: 0, visibility: "hidden" },
            {
              y: 0,
              opacity: 1,
              visibility: "visible",
              delay: 1.3,
              duration: 1,
              stagger: 0.15,
              ease: "expo.out",
              clearProps: "transform,opacity,visibility",
            },
          );
        }
      }, container);
    }

    selectAll("[data-gallery]").forEach((gallery) => {
      const track = gallery.querySelector("[data-gallery-track]");
      const previous = gallery.querySelector("[data-gallery-prev]");
      const next = gallery.querySelector("[data-gallery-next]");
      const move = (direction) =>
        track.scrollBy({
          left: direction * track.clientWidth * 0.82,
          behavior: reduceMotion ? "auto" : "smooth",
        });
      previous?.addEventListener("click", () => move(-1), {
        signal: abort.signal,
      });
      next?.addEventListener("click", () => move(1), {
        signal: abort.signal,
      });
      track.querySelectorAll("img").forEach((image) => {
        image.draggable = false;
      });
      track.addEventListener("dragstart", (event) => event.preventDefault(), {
        signal: abort.signal,
      });

      let startX = 0;
      let startScroll = 0;
      let dragging = false;
      track.addEventListener(
        "pointerdown",
        (event) => {
          if (event.pointerType === "touch" || event.button !== 0) return;
          dragging = true;
          startX = event.clientX;
          startScroll = track.scrollLeft;
          track.classList.add("is-dragging");
          track.setPointerCapture(event.pointerId);
        },
        { signal: abort.signal },
      );
      track.addEventListener(
        "pointermove",
        (event) => {
          if (dragging) {
            track.scrollLeft = startScroll - (event.clientX - startX);
          }
        },
        { signal: abort.signal },
      );
      const stopDragging = (event) => {
        dragging = false;
        track.classList.remove("is-dragging");
        if (track.hasPointerCapture?.(event.pointerId)) {
          track.releasePointerCapture(event.pointerId);
        }
      };
      track.addEventListener("pointerup", stopDragging, {
        signal: abort.signal,
      });
      track.addEventListener("pointercancel", stopDragging, {
        signal: abort.signal,
      });
    });

    const grid = container.querySelector("[data-project-grid]");
    if (grid) {
      const filters = selectAll("[data-project-filter]");
      filters.forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const category = button.dataset.projectFilter;
            filters.forEach((item) =>
              item.setAttribute("aria-pressed", String(item === button)),
            );
            grid.querySelectorAll("[data-project-category]").forEach((tile) => {
              tile.hidden =
                category !== "all" &&
                tile.dataset.projectCategory !== category;
            });
            window.dispatchEvent(new CustomEvent("site:layout"));
          },
          { signal: abort.signal },
        );
      });
    }
  };

  const replaySection = (section) => activePage?.replaySection?.(section) || false;

  window.TruongThinhDetail = { mount, replaySection, unmount };
  if (document.documentElement.classList.contains("motion-fallback")) {
    mount(undefined, { settled: true });
  }
})();
