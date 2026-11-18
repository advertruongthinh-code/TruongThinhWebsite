// Float and dock (advertising-search R7). The bar floats in a fixed host on <body> (Locomotive moves the page with a transform, so
// sticky cannot work) and docks in two slots: [data-search-dock-top] over the hero rail while that slot is whole under the header,
// and [data-search-dock] under the CTA heading once that slot is above the floating bar (the approved prototype's sticky stop).
// A bar moved to a new parent has no old style to transition from, so a move first lays the old look out in the new place, then
// switches class: the CSS morph runs, and a slide covers the distance between the two places (owner 2026-11-18).

export function mountDock({ host, bar, top, cta, input, onChange, signal }) {
  let place = "float";
  const want = { top: false, cta: false };
  let pending = null;
  let animate = false;
  const parentOf = (next) => (next === "cta" ? cta : next === "top" ? top : host);
  const centerY = () => {
    const rect = bar.getBoundingClientRect();
    return rect.top + rect.height / 2;
  };

  const apply = (next) => {
    if (next === place) return;
    const focused = document.activeElement === input;
    const { selectionStart, selectionEnd } = input;
    const from = centerY();
    parentOf(next).append(bar);
    // Reading the box here resolves the old look in the new place, so the class switch below transitions from it.
    // A jump longer than a screen (End, Home, a restored scroll) only morphs: a slide that long would streak across the page.
    const shift = from - centerY();
    place = next;
    bar.classList.toggle("is-docked", next !== "float");
    if (next === "float") delete bar.dataset.dock;
    else bar.dataset.dock = next;
    if (animate && !window.TruongThinhEnv?.reducedMotion.matches && Math.abs(shift) > 1 && Math.abs(shift) <= innerHeight) {
      // The slide takes the CSS morph's pace (--search-morph, --search-ease in search.css), so both stay one value.
      const style = getComputedStyle(bar);
      const morph = style.getPropertyValue("--search-morph").trim();
      bar.animate([{ transform: `translateY(${shift}px)` }, { transform: "none" }], {
        duration: Number.parseFloat(morph) * (morph.endsWith("ms") ? 1 : 1000),
        easing: style.getPropertyValue("--search-ease").trim(),
      });
    }
    if (focused) {
      input.focus({ preventScroll: true });
      try { input.setSelectionRange(selectionStart, selectionEnd); } catch {}
    }
    onChange(next);
  };
  // Moving a focused input closes the iOS keyboard, and focus() outside a tap cannot reopen it: wait for blur on touch devices.
  const request = () => {
    const next = want.cta ? "cta" : want.top ? "top" : "float";
    if (document.activeElement === input && window.TruongThinhEnv?.phone.matches) {
      pending = next;
      return;
    }
    pending = null;
    apply(next);
  };
  input.addEventListener("blur", () => {
    if (pending === null) return;
    const next = pending;
    pending = null;
    apply(next);
  }, { signal });

  const observers = [];
  const px = (style, name) => Number.parseFloat(style.getPropertyValue(name)) || 0;
  const observe = () => {
    observers.splice(0).forEach((io) => io.disconnect());
    const hostStyle = getComputedStyle(host);
    // CTA: the root reaches far above the viewport and stops at the top of the floating bar, so the slot intersects exactly when it
    // is above the floating bar and every jump (Home, End, back to top, scroll restore) crosses the edge and fires.
    const floatTop = Number.parseFloat(hostStyle.bottom) + px(hostStyle, "--search-row-h") + 2;
    const ctaIo = new IntersectionObserver(([entry]) => {
      want.cta = entry.isIntersecting;
      request();
    }, { rootMargin: `100000px 0px -${Math.round(floatTop)}px 0px`, threshold: 0 });
    ctaIo.observe(cta);
    observers.push(ctaIo);
    if (!top) return;
    // Top: docked while the whole slot shows below the header row.
    const header = px(getComputedStyle(document.documentElement), "--header-row-height") || 80;
    const topIo = new IntersectionObserver(([entry]) => {
      want.top = entry.intersectionRatio > 0.98;
      request();
    }, { rootMargin: `-${Math.round(header)}px 0px 0px 0px`, threshold: [0, 0.99, 1] });
    topIo.observe(top);
    observers.push(topIo);
  };
  observe();
  // The first placement (page load, restore) takes its place without sliding.
  requestAnimationFrame(() => requestAnimationFrame(() => { animate = true; }));
  let width = innerWidth;
  window.addEventListener("resize", () => {
    if (innerWidth === width) return;
    width = innerWidth;
    observe();
  }, { signal });
  signal.addEventListener("abort", () => observers.forEach((io) => io.disconnect()), { once: true });
  return { get docked() { return place !== "float"; }, get place() { return place; } };
}
