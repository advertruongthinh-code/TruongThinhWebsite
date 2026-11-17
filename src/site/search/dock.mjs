// Float and dock (advertising-search R7, plan P6 step 3). The bar floats in a fixed host on <body> (Locomotive moves the page with a
// transform, so sticky cannot work) and moves into [data-search-dock] once that slot is above the floating bar.
export function mountDock({ host, bar, slot, input, onChange, signal }) {
  let docked = false;
  let pending = null;
  let io;

  const apply = (next) => {
    if (next === docked) return;
    docked = next;
    const focused = document.activeElement === input;
    const { selectionStart, selectionEnd } = input;
    (docked ? slot : host).append(bar);
    bar.classList.toggle("is-docked", docked);
    if (focused) {
      input.focus({ preventScroll: true });
      try { input.setSelectionRange(selectionStart, selectionEnd); } catch {}
    }
    onChange(docked);
  };
  // Moving a focused input closes the iOS keyboard, and focus() outside a tap cannot reopen it: wait for blur on touch devices.
  const request = (next) => {
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

  // The root reaches far above the viewport and stops at the top of the floating bar: the slot intersects exactly when it is above
  // the floating bar, so every jump (Home, End, back to top, scroll restore) crosses the edge and fires.
  const observe = () => {
    io?.disconnect();
    const style = getComputedStyle(host);
    const floatTop = Number.parseFloat(style.bottom) + Number.parseFloat(style.getPropertyValue("--search-row-h"));
    io = new IntersectionObserver(([entry]) => request(entry.isIntersecting), {
      rootMargin: `100000px 0px -${Math.round(floatTop)}px 0px`,
      threshold: 0,
    });
    io.observe(slot);
  };
  observe();
  let width = innerWidth;
  window.addEventListener("resize", () => {
    if (innerWidth === width) return;
    width = innerWidth;
    observe();
  }, { signal });
  signal.addEventListener("abort", () => io.disconnect(), { once: true });
  return { get docked() { return docked; } };
}
