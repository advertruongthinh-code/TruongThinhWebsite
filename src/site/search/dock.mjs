// Float and dock (search-bar R7). The bar floats in a fixed host on <body> (Locomotive moves the page with a transform, so sticky cannot
// work) and docks in two slots: [data-search-dock-top] under the hero heading and [data-search-dock] under the CTA heading. A place
// change is decisive, never a look halfway between two places (owner 2026-11-23):
// - Top: the bar sits in the slot and scrolls away with the page; once the whole bar is out of sight (under the header or above the
//   screen), the floating bar slides up from the bottom edge, and back in the slot as soon as the slot shows again.
// - CTA: the bar floats until the slot's row reaches the floating row, then snaps into the slot and rides in it like `sticky`.

const ROW = 49; // the input row (48px) and the block's bottom border: the row's top sits this far above the block's bottom

export function mountDock({ host, bar, top, cta, input, onChange, signal }) {
  let place = "float"; // float | top | cta
  let off = false;
  let floatRow = 0;
  const header = document.querySelector(".site-header");
  // Read once per resize, not per scroll frame: where the floating row sits.
  const measure = () => {
    floatRow = innerHeight - (Number.parseFloat(getComputedStyle(host).bottom) || 0) - ROW;
  };

  const phoneTyping = () => document.activeElement === input && window.TruongThinhEnv?.phone.matches;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  const setPlace = (next) => {
    if (next === place) return;
    const parent = next === "cta" ? cta : next === "top" ? top : host;
    const focused = document.activeElement === input;
    const { selectionStart, selectionEnd } = input;
    if (bar.parentElement !== parent) parent.append(bar);
    // A new place takes its look at once: the 1s morph is only for results opening while floating (search-bar R5).
    bar.classList.add("is-moving");
    requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.remove("is-moving")));
    // From the top slot the floating bar comes up from below the bottom edge, never across the content.
    if (next === "float" && place === "top" && !reduced.matches) host.classList.add("is-rising");
    else host.classList.remove("is-rising");
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
  host.addEventListener("animationend", () => host.classList.remove("is-rising"), { signal });

  const update = () => {
    if (off || phoneTyping() || signal?.aborted) return;
    // CTA: the slot's row at or above the floating row.
    const ctaRect = cta.getBoundingClientRect();
    if (ctaRect.height && ctaRect.bottom - ROW <= floatRow) return setPlace("cta");
    // Top: the slot while any of the bar is still in sight below the header (the phone header slides away, so read where it is now).
    if (top?.getClientRects().length) {
      const headerBottom = Math.max(0, header?.getBoundingClientRect().bottom ?? 0);
      if (top.getBoundingClientRect().bottom > headerBottom) return setPlace("top");
    }
    setPlace("float");
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

  // Off the root grid (search-bar R8): a floating bar slides down out of view; a docked one goes with its slot.
  const setOff = (next) => {
    if (next === off) return;
    off = next;
    if (off) {
      host.classList.toggle("is-off-now", place === "top" || place === "cta");
      if (document.activeElement === input) input.blur();
      setPlace("float");
      host.classList.remove("is-rising");
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
  }, { once: true });
  return {
    get docked() { return place !== "float"; },
    get place() { return place; },
    get off() { return off; },
    setOff,
    update,
  };
}
