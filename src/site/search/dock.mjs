// Float and dock, following the scroll (search-bar R7). The bar floats in a fixed host on <body> (Locomotive moves the page with a
// transform, so sticky cannot work) and docks in two slots: [data-search-dock-top] under the hero heading and [data-search-dock] under the
// CTA heading. Nothing runs on a timer: every frame the scroll position sets where the bar is and how far it has turned into the docked
// look (width, shadow, chip row), so it stops when the finger stops and goes back the same way.
// - Top: the bar sits in the slot and scrolls away with the page; once the slot is under the header the floating bar rises from the
//   bottom edge over RISE px of scroll (owner 2026-11-22: a bar crossing the screen hides too much content).
// - CTA: the bar floats until the slot's row reaches the floating row, then rides in the slot like `sticky` and widens over `ctaRange` px.

const RISE = 120; // px of scroll over which the floating bar rises into view once the top slot has gone
const ROW = 49; // the input row (48px) and the block's bottom border: the row's top sits this far above the block's bottom

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const lerp = (from, to, progress) => from + (to - from) * progress;

export function mountDock({ host, bar, top, cta, input, onChange, signal }) {
  const shell = bar.querySelector(".search-bar__shell");
  let place = "float"; // float | link (rising from the bottom edge after the top slot has gone) | top | cta
  let progress = 0; // 0 floating look, 1 docked look
  let off = false;
  let floatWidth = 0;
  let floatRow = 0;
  let header = 80;
  const narrow = matchMedia("(max-width: 750px)");
  // Read once per resize, not per scroll frame: where the floating row sits and how tall the header row is.
  const measure = () => {
    floatRow = innerHeight - (Number.parseFloat(getComputedStyle(host).bottom) || 0) - ROW;
    header = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-row-height")) || 80;
  };

  const phoneTyping = () => document.activeElement === input && window.TruongThinhEnv?.phone.matches;

  const setPlace = (next) => {
    if (next === place) return;
    const parent = next === "cta" ? cta : next === "top" ? top : host;
    const focused = document.activeElement === input;
    const { selectionStart, selectionEnd } = input;
    if (bar.parentElement !== parent) parent.append(bar);
    // A new place takes its look at once: the 1s morph is only for results opening while floating (search-bar R5).
    bar.classList.add("is-moving");
    requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.remove("is-moving")));
    place = next;
    const docked = next === "top" || next === "cta";
    bar.classList.toggle("is-docked", docked);
    if (docked) bar.dataset.dock = next;
    else delete bar.dataset.dock;
    if (focused && document.activeElement !== input) {
      input.focus({ preventScroll: true });
      try { input.setSelectionRange(selectionStart, selectionEnd); } catch {}
    }
    onChange(next);
  };

  // The in-between look: width, shadow and chip row follow `progress`; 0 and 1 hand back to the CSS of the place.
  const setLook = (next, dockWidth) => {
    progress = next;
    const linked = next > 0 && next < 1;
    bar.classList.toggle("is-linked", linked);
    if (!linked) {
      shell.style.removeProperty("width");
      bar.style.removeProperty("--search-lift");
      shell.style.removeProperty("grid-template-rows");
      host.style.removeProperty("transform");
      return;
    }
    // The floating width by the CSS rules (560px, 760px with results, the host's width on phones), not a measurement that a morph may be halfway through.
    floatWidth = Math.min(narrow.matches ? Infinity : bar.hasAttribute("data-results") ? 760 : 560, host.clientWidth);
    shell.style.width = `${lerp(floatWidth, dockWidth, next)}px`;
    bar.style.setProperty("--search-lift", String(1 - next));
    if (bar.hasAttribute("data-results")) shell.style.gridTemplateRows = `${1 - next}fr auto`;
    else shell.style.removeProperty("grid-template-rows");
  };

  const update = () => {
    if (off || phoneTyping() || signal?.aborted) return;
    const viewport = innerHeight;
    // CTA: the slot's row at or above the floating row.
    const ctaRect = cta.getBoundingClientRect();
    const ctaRise = floatRow - (ctaRect.bottom - ROW);
    if (ctaRect.height && ctaRise >= 0) {
      host.style.removeProperty("transform");
      setPlace("cta");
      // A quarter screen of scroll, or less when the page ends sooner: at the scroll limit the bar is always fully docked.
      const footer = cta.closest("[data-barba-namespace]")?.querySelector("footer.site-footer")?.getBoundingClientRect();
      const left = footer ? Math.max(0, footer.bottom - viewport) : Infinity;
      setLook(clamp01(ctaRise / Math.max(1, Math.min(0.25 * viewport, ctaRise + left))), Math.min(1000, ctaRect.width));
      return;
    }
    if (top?.getClientRects().length) {
      const topRect = top.getBoundingClientRect();
      // The bar stays in the slot and scrolls with the page until the slot's row has gone under the header; it never crosses the content.
      const past = header - (topRect.bottom - ROW);
      if (past <= 0) {
        host.style.removeProperty("transform");
        setPlace("top");
        setLook(1);
        return;
      }
      // Then the floating bar rises from below the screen's bottom edge over the next RISE px of scroll.
      const rise = clamp01(past / RISE);
      if (rise < 1) {
        setPlace("link");
        setLook(0);
        host.style.transform = `translate(-50%, ${(1 - rise) * (innerHeight - floatRow + 32)}px)`;
        return;
      }
    }
    host.style.removeProperty("transform");
    setPlace("float");
    setLook(0);
  };

  let frame = 0;
  const queue = () => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); });
  };
  // Locomotive reports each frame after it moves the page; native scroll (phones) on the next frame.
  window.addEventListener("site:scroll", update, { signal });
  window.addEventListener("scroll", queue, { passive: true, signal });
  window.addEventListener("resize", () => {
    measure();
    queue();
  }, { signal });
  input.addEventListener("blur", queue, { signal });
  // The phone keyboard resizes the viewport: a bar still rising drops to its floating place first.
  input.addEventListener("focus", () => {
    if (place !== "link" || !window.TruongThinhEnv?.phone.matches) return;
    host.style.removeProperty("transform");
    setPlace("float");
    setLook(0);
  }, { signal });
  // Results open or close the chip row and change the floating width: measure the floating look again.
  const results = new MutationObserver(queue);
  results.observe(bar, { attributes: true, attributeFilter: ["data-results"] });

  // Off the root grid (search-bar R8): a floating bar slides down out of view; a docked one goes with its slot.
  const setOff = (next) => {
    if (next === off) return;
    off = next;
    if (off) {
      host.classList.toggle("is-off-now", place === "top" || place === "cta");
      if (document.activeElement === input) input.blur();
      host.style.removeProperty("transform");
      setPlace("float");
      setLook(0);
      host.classList.add("is-off");
      return;
    }
    host.classList.remove("is-off", "is-off-now");
    update();
  };

  measure();
  update();
  signal?.addEventListener("abort", () => {
    cancelAnimationFrame(frame);
    results.disconnect();
  }, { once: true });
  return {
    get docked() { return place !== "float"; },
    get place() { return place; },
    get off() { return off; },
    setOff,
    update,
  };
}
