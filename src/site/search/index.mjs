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
  // One source for the Zalo link: partials/floating-cta.html.
  const zaloHref = document.querySelector(".floating-cta")?.href || "https://zalo.me/0949131050";
  const { bar, form, input, clearText, statusNode } = createBar(copy, zaloHref);
  const host = Object.assign(document.createElement("div"), { className: "search-host" });
  host.append(bar);
  document.body.append(host);
  const legacy = container.querySelector(".detail-cta .legacy-link");
  legacy?.setAttribute("hidden", "");

  let toastTimer;
  const toast = (text) => {
    renderStatus(statusNode, [{ text }]);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => setStatus(lastLines), 2400);
  };
  let lastLines = [];
  const setStatus = (lines) => {
    lastLines = lines;
    renderStatus(statusNode, lines, copy.clearSearch, () => leave(true));
  };
  const client = createClient({ grid, artifact, locale, copy, zaloHref, setStatus, toast, session });

  const leave = (tellGrid) => {
    if (tellGrid) grid.clearResults();
    client.reset();
    input.value = "";
  };

  const syncOffset = () => document.body.style.setProperty("--search-bar-offset", dock.docked ? "0px" : `${bar.offsetHeight + 12}px`);
  const dock = mountDock({
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
