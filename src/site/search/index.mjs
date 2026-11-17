// On-page search of the advertising pages (advertising-search R6, R7, R9, R10; text part). detail.js mounts it after the grid.
import artifact from "/advertising-products/catalog-artifact.mjs";
import css from "./search.css";
import { COPY, createBar, renderStatus } from "./bar.mjs";
import { createClient } from "./client.mjs";
import { mountDock } from "./dock.mjs";
import * as session from "./session.mjs";

export function mount(container, { signal, softNavigation = false } = {}) {
  const grid = window.TruongThinhMasonry;
  const slot = container.querySelector("[data-search-dock]");
  if (!grid || !slot || signal?.aborted) return;
  if (!document.querySelector("style[data-search-style]")) {
    document.head.append(Object.assign(document.createElement("style"), { textContent: css }));
    document.head.lastChild.dataset.searchStyle = "";
  }
  const locale = document.documentElement.lang === "en" ? "en" : "vi";
  const copy = COPY[locale];
  // One source for the Zalo link: partials/floating-cta.html (on every page); without it the plain CTA link stays.
  const zaloHref = document.querySelector(".floating-cta")?.href;
  if (!zaloHref) return;
  const { bar, form, input, clearText, statusNode, liveNode } = createBar(copy, zaloHref);
  const host = Object.assign(document.createElement("div"), { className: "search-host" });
  host.append(statusNode, bar);
  document.body.append(host);
  const legacy = container.querySelector(".detail-cta .legacy-link");
  legacy?.setAttribute("hidden", "");

  let toastTimer;
  // The live region stays in the DOM; the visible status box toggles separately so screen readers catch the first message.
  const announce = (lines) => { liveNode.textContent = lines.map((line) => line.text).filter(Boolean).join(". "); };
  const toast = (text) => {
    renderStatus(statusNode, [{ text }]);
    announce([{ text }]);
    syncOffset();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => setStatus(lastLines), 2400);
  };
  let lastLines = [];
  const setStatus = (lines) => {
    lastLines = lines;
    renderStatus(statusNode, lines, copy.clearSearch, () => leave(true));
    announce(lines);
    syncOffset();
  };
  const client = createClient({ grid, artifact, locale, copy, zaloHref, setStatus, toast, session });

  const leave = (tellGrid) => {
    if (tellGrid) grid.clearResults();
    client.reset();
    input.value = "";
  };

  // Floating buttons stand above whatever the host shows: the floating bar and the status line.
  const setOffset = () => {
    const height = (dock?.docked ? 0 : bar.offsetHeight + 12) + (statusNode.hidden ? 0 : statusNode.offsetHeight + 8) + lift;
    document.body.style.setProperty("--search-bar-offset", `${height}px`);
  };
  const syncOffset = () => {
    setOffset();
    placeStatus();
  };
  // While docked the status sits at the screen bottom; when the docked bar passes behind it, lift the status above the bar so the
  // input stays visible. Checked each frame only while both are shown (the page may scroll by transform, without scroll events).
  const shell = bar.querySelector(".search-bar__shell");
  let lift = 0;
  let frame = 0;
  const placeStatus = () => {
    cancelAnimationFrame(frame);
    if (!dock?.docked || statusNode.hidden) {
      if (lift) {
        lift = 0;
        setOffset();
      }
      statusNode.style.removeProperty("translate");
      return;
    }
    const box = shell.getBoundingClientRect();
    const own = statusNode.getBoundingClientRect();
    const top = own.top + lift;
    const bottom = own.bottom + lift;
    const next = top < box.bottom && bottom > box.top - 8 ? Math.ceil(bottom - box.top + 8) : 0;
    if (next !== lift) {
      lift = next;
      statusNode.style.translate = lift ? `0 ${-lift}px` : "";
      setOffset();
    }
    frame = requestAnimationFrame(placeStatus);
  };
  let dock;
  dock = mountDock({
    host, bar, slot, input, signal,
    onChange: (docked) => {
      input.placeholder = docked ? copy.placeholderDocked : copy.placeholder;
      syncOffset();
    },
  });
  syncOffset();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!input.value.trim()) return input.focus();
    // Phones: close the keyboard so the results show (and the bar may dock).
    if (window.TruongThinhEnv?.phone.matches) input.blur();
    client.submit(input.value);
  }, { signal });
  input.addEventListener("input", client.cancel, { signal });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") leave(true);
  }, { signal });
  clearText.addEventListener("click", () => {
    input.value = "";
    input.focus();
  }, { signal });
  // Leaving search from the grid (chip, navbar, Back/Forward) clears the bar; "clear" is our own clearResults.
  window.addEventListener("masonry:search-left", (event) => {
    if (event.detail?.reason !== "clear") leave(false);
  }, { signal });
  document.addEventListener("click", (event) => {
    if (event.target.closest?.("[data-language-option]") && client.active) session.markRestore();
  }, { capture: true, signal });

  signal?.addEventListener("abort", () => {
    clearTimeout(toastTimer);
    cancelAnimationFrame(frame);
    client.stop(); // the session stays for Back and reload
    bar.remove();
    host.remove();
    legacy?.removeAttribute("hidden");
    document.body.style.removeProperty("--search-bar-offset");
  }, { once: true });

  const restored = session.restoredText(softNavigation);
  if (restored) {
    input.value = restored;
    client.submit(restored);
  }
}
