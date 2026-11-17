// On-page search of the advertising pages (advertising-search R6 to R10), by text and by up to 5 images. detail.js mounts it after the grid.
import artifact from "/advertising-products/catalog-artifact.mjs";
import css from "./search.css";
import { COPY, createBar, renderThumbs } from "./bar.mjs";
import { createClient } from "./client.mjs";
import { mountDock } from "./dock.mjs";
import { MAX_IMAGES, prepareImage } from "./images.mjs";
import cfg from "../../search/score-config.json" with { type: "json" };
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
  const { bar, form, input, clearText, liveNode, imageButton, tray, thumbs, count } = createBar(copy, zaloHref);
  // Outside the bar, so the bar has one input.
  const fileInput = Object.assign(document.createElement("input"), { type: "file", accept: "image/*", multiple: true, hidden: true });
  fileInput.dataset.searchFile = "";
  const host = Object.assign(document.createElement("div"), { className: "search-host" });
  host.append(bar, fileInput);
  document.body.append(host);
  const legacy = container.querySelector(".detail-cta .legacy-link");
  legacy?.setAttribute("hidden", "");

  // No visible status (owner 2026-11-17): the outcome is only announced to screen readers. Image problems show as a short note
  // in the image tray, inside the bar.
  const announce = (text) => { liveNode.textContent = text; };
  let images = []; // { base64, hash, url }
  let note = null;
  let noteTimer;
  const renderTray = () => {
    renderThumbs(thumbs, images, copy, removeImage);
    count.replaceChildren(images.length ? copy.imageCount(images.length) : "");
    if (note) {
      count.append(Object.assign(document.createElement("span"), { className: "search-bar__note", textContent: note.text }));
      if (note.action) {
        const button = Object.assign(document.createElement("button"), { type: "button", textContent: note.action.label });
        button.addEventListener("click", note.action.onClick);
        count.append(button);
      }
    }
    tray.hidden = !images.length && !note;
    syncOffset();
  };
  const notice = (text, action) => {
    clearTimeout(noteTimer);
    note = text ? { text, action } : null;
    if (text) announce(text);
    if (text && !action) noteTimer = setTimeout(() => notice(""), 4000);
    renderTray();
  };
  const client = createClient({ grid, artifact, locale, copy, announce, notice, session, signal });
  const query = () => ({ text: input.value, images: images.map((image) => image.base64) });

  const dropImages = () => {
    images.forEach((image) => URL.revokeObjectURL(image.url));
    images = [];
  };
  const leave = (tellGrid) => {
    if (tellGrid) grid.clearResults();
    client.reset();
    input.value = "";
    dropImages();
    renderTray();
  };

  let reSearch;
  function removeImage(i) {
    URL.revokeObjectURL(images[i].url);
    images.splice(i, 1);
    renderTray();
    if (!client.active) return;
    clearTimeout(reSearch);
    reSearch = setTimeout(() => (input.value.trim() || images.length ? client.submit(query()) : leave(true)), cfg.timing.reSearchMs);
  }
  const addImage = (prepared) => {
    if (images.some((image) => image.hash === prepared.hash)) return;
    images.push({ ...prepared, url: URL.createObjectURL(prepared.blob) });
  };
  // Files in order until 5 images; the first problem is shown.
  async function addFiles(list) {
    const files = [...list];
    if (!files.length) return;
    client.cancel(); // adding images while a search runs drops that request (R6)
    let problem = null;
    for (const file of files) {
      if (images.length >= MAX_IMAGES) {
        problem ??= "tooMany";
        break;
      }
      const prepared = await prepareImage(file);
      if (signal?.aborted) return;
      if (prepared.error) problem ??= prepared.error;
      else addImage(prepared);
    }
    problem ? notice(copy[problem]) : renderTray();
  }
  imageButton.addEventListener("click", () => fileInput.click(), { signal });
  fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
  }, { signal });
  document.addEventListener("paste", (event) => {
    if (event.clipboardData?.files.length) {
      event.preventDefault();
      addFiles(event.clipboardData.files);
    }
  }, { signal });
  // Dropping files anywhere on the page: a full-screen layer says where they go.
  const overlay = Object.assign(document.createElement("div"), { className: "search-drop", hidden: true });
  overlay.append(copy.drop, Object.assign(document.createElement("small"), { textContent: copy.dropNote }));
  document.body.append(overlay);
  let depth = 0;
  const hasFiles = (event) => [...(event.dataTransfer?.types ?? [])].includes("Files");
  document.addEventListener("dragenter", (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    depth++;
    overlay.hidden = false;
  }, { signal });
  document.addEventListener("dragover", (event) => hasFiles(event) && event.preventDefault(), { signal });
  document.addEventListener("dragleave", (event) => {
    if (!hasFiles(event)) return;
    depth = Math.max(0, depth - 1);
    if (!depth) overlay.hidden = true;
  }, { signal });
  document.addEventListener("drop", (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    depth = 0;
    overlay.hidden = true;
    addFiles(event.dataTransfer.files);
  }, { signal });

  // The floating buttons stand above the floating bar.
  const syncOffset = () => {
    document.body.style.setProperty("--search-bar-offset", `${dock?.docked ? 0 : bar.offsetHeight + 12}px`);
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
    if (!input.value.trim() && !images.length) return input.focus();
    // Phones: close the keyboard so the results show (and the bar may dock).
    if (window.TruongThinhEnv?.phone.matches) input.blur();
    client.submit(query());
  }, { signal });
  input.addEventListener("input", client.cancel, { signal });
  form.addEventListener("focusin", client.warm, { once: true, signal });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") leave(true);
  }, { signal });
  // The x clears the text and, with a search on the grid, leaves the search too.
  clearText.addEventListener("click", () => {
    if (client.active) leave(true);
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
    client.stop(); // the session stays for Back and reload
    bar.remove();
    overlay.remove();
    clearTimeout(noteTimer);
    clearTimeout(reSearch);
    dropImages();
    host.remove();
    legacy?.removeAttribute("hidden");
    document.body.style.removeProperty("--search-bar-offset");
  }, { once: true });

  const restored = session.restored(softNavigation);
  if (restored) {
    input.value = restored.text;
    Promise.all(restored.images.map(async (base64) => {
      const blob = await (await fetch(`data:image/jpeg;base64,${base64}`)).blob();
      return { base64, blob, hash: base64.slice(-64) };
    })).then((list) => {
      if (signal?.aborted) return;
      list.forEach(addImage);
      renderTray();
      client.submit(query());
    });
  }
}
