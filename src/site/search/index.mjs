// On-page search of the advertising pages (advertising-search R6 to R10), by text and by one image. Look and places: search-bar R1 to R5.
// detail.js mounts it after the grid.
import artifact from "/advertising-products/catalog-artifact.mjs";
import css from "./search.css";
import { COPY, createBar } from "./bar.mjs";
import { createClient } from "./client.mjs";
import { mountDock } from "./dock.mjs";
import { hashOf, prepareImage } from "./images.mjs";
import cfg from "../../search/score-config.json" with { type: "json" };
import * as session from "./session.mjs";

const reduced = () => window.TruongThinhEnv?.reducedMotion.matches;
// Text that slides in from below while the old text slides up (search-bar R3): tips and notices share it.
const slideText = (node, text, { animate = !reduced() } = {}) => {
  const old = node.lastElementChild;
  if (old?.textContent === text) return;
  const next = Object.assign(document.createElement("span"), { textContent: text });
  node.append(next);
  if (!animate || !old) return old?.remove();
  const timing = { duration: 450, easing: "cubic-bezier(0.16, 1, 0.3, 1)" };
  next.animate([{ transform: "translateY(60%)", opacity: 0 }, { transform: "none", opacity: 1 }], timing);
  old.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(-60%)", opacity: 0 }], { ...timing, fill: "forwards" }).finished
    .then(() => old.remove(), () => old.remove());
};

export function mount(container, { signal, softNavigation = false } = {}) {
  const grid = window.TruongThinhMasonry;
  const slot = container.querySelector("[data-search-dock]");
  const topSlot = container.querySelector("[data-search-dock-top]");
  if (!grid || !slot || signal?.aborted) return;
  if (!document.querySelector("style[data-search-style]")) {
    document.head.append(Object.assign(document.createElement("style"), { textContent: css }));
    document.head.lastChild.dataset.searchStyle = "";
  }
  const locale = document.documentElement.lang === "en" ? "en" : "vi";
  const copy = COPY[locale];
  const { bar, form, input, clearText, liveNode, imageButton, thumb, replaceButton, removeButton, chips, hint, note: noteNode } = createBar(copy);
  // Outside the bar, so the bar has one input.
  const fileInput = Object.assign(document.createElement("input"), { type: "file", accept: "image/*", hidden: true });
  fileInput.dataset.searchFile = "";
  const host = Object.assign(document.createElement("div"), { className: "search-host" });
  host.append(bar, fileInput);
  document.body.append(host);

  const announce = (text) => { liveNode.textContent = text; };
  // Notices take the input's place for 4 seconds (search-bar R3); slow and paused stay, with "Try again", until the visitor acts.
  let noteTimer;
  const notice = (text, action) => {
    clearTimeout(noteTimer);
    if (!text) {
      if (noteNode.hidden) return;
      const done = () => { noteNode.hidden = true; noteNode.replaceChildren(); bar.classList.remove("has-note"); syncHint(); };
      if (reduced()) return done();
      noteNode.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(-60%)", opacity: 0 }], { duration: 450, easing: "cubic-bezier(0.16, 1, 0.3, 1)" })
        .finished.then(done, done);
      return;
    }
    announce(text);
    noteNode.replaceChildren(Object.assign(document.createElement("span"), { textContent: text }));
    if (action) {
      const button = Object.assign(document.createElement("button"), { type: "button", textContent: action.label });
      button.addEventListener("click", () => { notice(""); action.onClick(); });
      noteNode.append(button);
    }
    noteNode.hidden = false;
    bar.classList.add("has-note");
    if (!reduced()) noteNode.animate([{ transform: "translateY(60%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 450, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
    if (!action) noteTimer = setTimeout(() => notice(""), 4000);
  };
  const client = createClient({ grid, artifact, locale, copy, announce, notice, session, signal });
  let image = null; // { base64, hash, url }
  const query = () => ({ text: input.value, images: image ? [image.base64] : [] });

  // Tips rotate while the input is empty, unfocused and not hovered; an image shows its own fixed hint (search-bar R3).
  let tip = 0;
  let hovered = false;
  const syncHint = () => slideText(hint, image ? copy.imageHint : copy.tips[tip], { animate: false });
  bar.addEventListener("pointerenter", () => { hovered = true; }, { signal });
  bar.addEventListener("pointerleave", () => { hovered = false; }, { signal });
  const tipTimer = setInterval(() => {
    if (reduced() || image || hovered || input.value || document.activeElement === input || !noteNode.hidden || document.hidden) return;
    tip = (tip + 1) % copy.tips.length;
    slideText(hint, copy.tips[tip]);
  }, 3000);

  const renderImage = () => {
    thumb.hidden = !image;
    imageButton.hidden = Boolean(image);
    if (image) thumb.querySelector("img").src = image.url;
    syncHint();
  };
  const dropImage = () => {
    if (image) URL.revokeObjectURL(image.url);
    image = null;
  };
  let reSearch;
  const leave = (tellGrid) => {
    clearTimeout(reSearch);
    if (tellGrid) grid.clearResults();
    client.reset();
    input.value = "";
    dropImage();
    renderImage();
    syncChips();
  };
  const removeImage = () => {
    dropImage();
    renderImage();
    imageButton.focus();
    if (!client.active) return;
    clearTimeout(reSearch);
    reSearch = setTimeout(() => (input.value.trim() ? client.submit(query()) : leave(true)), cfg.timing.reSearchMs);
  };
  // One image per search: the first usable file replaces the one in the bar (advertising-search R8).
  async function addFiles(list) {
    const files = [...list];
    if (!files.length) return;
    client.cancel(); // adding an image while a search runs drops that request (R6)
    let problem = null;
    for (const file of files) {
      const prepared = await prepareImage(file);
      if (signal?.aborted) return;
      if (prepared.error) {
        problem ??= prepared.error;
        continue;
      }
      dropImage();
      image = { ...prepared, url: URL.createObjectURL(prepared.blob) };
      problem = null;
      break;
    }
    renderImage();
    if (problem) notice(copy[problem]);
  }
  imageButton.addEventListener("click", () => fileInput.click(), { signal });
  replaceButton.addEventListener("click", () => fileInput.click(), { signal });
  removeButton.addEventListener("click", removeImage, { signal });
  fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
  }, { signal });
  document.addEventListener("paste", (event) => {
    // Office copies carry text and a picture of it: text wins, so a paste into the input stays text.
    if (event.clipboardData?.files.length && !event.clipboardData.types.includes("text/plain")) {
      event.preventDefault();
      addFiles(event.clipboardData.files);
    }
  }, { signal });

  // Floating chip row (search-bar R2): the products with results, mirrored from the page's chips, which own the filter and its counts.
  // Most cards first (owner 2026-11-23). When the row overflows, "Show all (N)" stays pinned at its right end and opens every product
  // in a panel above the bar.
  const shell = bar.querySelector(".search-bar__shell");
  const railRoot = container.querySelector("[data-masonry-filter]")?.closest(".detail-index-hero, section") ?? container;
  const allFilter = () => container.querySelector('[data-masonry-filter="all"]');
  const countOf = (product) => Number.parseInt(product.querySelector("sup")?.textContent ?? "", 10) || 0;
  const panel = Object.assign(document.createElement("div"), { className: "search-bar__all", hidden: true, id: "search-bar-all" });
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", copy.chips);
  shell.append(panel);
  const more = Object.assign(document.createElement("button"), { type: "button", className: "search-bar__chip search-bar__more", hidden: true });
  more.setAttribute("aria-controls", panel.id);
  more.setAttribute("aria-expanded", "false");
  const setPanel = (open) => {
    panel.hidden = !open;
    more.setAttribute("aria-expanded", String(open));
  };
  more.addEventListener("click", () => setPanel(panel.hidden), { signal });
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    setPanel(false);
    more.focus();
  }, { signal });
  document.addEventListener("pointerdown", (event) => !panel.hidden && !shell.contains(event.target) && setPanel(false), { signal });
  const chipFor = (product) => {
    const button = Object.assign(document.createElement("button"), { type: "button", className: "search-bar__chip" });
    const pressed = product.getAttribute("aria-current") === "true";
    button.setAttribute("aria-pressed", String(pressed));
    button.append(Object.assign(document.createElement("b"), { textContent: product.querySelector("span")?.textContent ?? product.textContent }),
      Object.assign(document.createElement("sup"), { textContent: product.querySelector("sup")?.textContent ?? "" }));
    // Again on the chip in use: back to all results, the query stays.
    button.addEventListener("click", () => {
      setPanel(false);
      (pressed ? allFilter() : product)?.click();
    });
    return button;
  };
  const rowObserver = new ResizeObserver(([entry]) => {
    const row = entry.target;
    more.hidden = true;
    more.hidden = row.scrollWidth <= row.clientWidth + 1;
    row.toggleAttribute("data-more", row.scrollLeft + row.clientWidth < row.scrollWidth - 1);
  });
  signal?.addEventListener("abort", () => rowObserver.disconnect(), { once: true });
  let chipsQueued = false;
  function syncChips() {
    chipsQueued = false;
    const cluster = [...container.querySelectorAll("[data-masonry-filter][aria-current=\"true\"]")].find((node) => node.dataset.masonryFilter !== "all");
    const scope = cluster ? container.querySelector(`[data-masonry-chips="${cluster.dataset.masonryFilter}"]`) : container;
    const products = client.active ? [...(scope ?? container).querySelectorAll("[data-masonry-product]")].filter((node) => !node.hasAttribute("data-search-empty")) : [];
    products.sort((a, b) => countOf(b) - countOf(a)); // stable: equal counts keep the rail order
    const row = Object.assign(document.createElement("div"), { className: "search-bar__chiprow" });
    row.append(...products.map(chipFor));
    panel.replaceChildren(...products.map(chipFor));
    if (!products.length) setPanel(false);
    more.textContent = copy.showAll(products.length);
    const scrollLeft = chips.querySelector(".search-bar__chiprow")?.scrollLeft ?? 0;
    chips.replaceChildren(row, more);
    row.scrollLeft = scrollLeft;
    const fade = () => row.toggleAttribute("data-more", row.scrollLeft + row.clientWidth < row.scrollWidth - 1);
    row.addEventListener("scroll", fade, { passive: true });
    // The row's width follows the bar (the 1s results morph, resize): the button shows while any chip is cut off.
    rowObserver.disconnect();
    rowObserver.observe(row);
    bar.toggleAttribute("data-results", products.length > 0);
    syncOffset();
  }
  const queueChips = () => {
    if (chipsQueued) return;
    chipsQueued = true;
    requestAnimationFrame(syncChips);
  };
  const railObserver = new MutationObserver(queueChips);
  railObserver.observe(railRoot, { subtree: true, attributes: true, attributeFilter: ["aria-current", "data-search-empty", "hidden"], characterData: true, childList: true });

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

  // The floating buttons stand above the floating bar; the phone's back-to-top sits on its own row above the block (search-bar R5).
  const syncOffset = () => {
    const floating = !dock?.docked && !dock?.off;
    document.body.dataset.searchPlace = dock?.off ? "off" : dock?.place ?? "float";
    document.body.style.setProperty("--search-bar-offset", `${floating ? bar.offsetHeight + 12 : 0}px`);
    if (!floating) return;
    const rect = shell.getBoundingClientRect();
    document.body.style.setProperty("--search-block-h", `${rect.height}px`);
  };
  // The width and chip row morph: measure again where they end.
  shell.addEventListener("transitionend", (event) => event.target === shell && syncOffset(), { signal });
  let dock;
  dock = mountDock({ host, bar, top: topSlot, cta: slot, input, signal, onChange: syncOffset });
  syncOffset();
  // The grid marks pages without search (search-bar R8): filter pages while not searching and cards.
  const syncOff = () => {
    dock.setOff(container.hasAttribute("data-search-off"));
    syncOffset();
  };
  const offObserver = new MutationObserver(syncOff);
  offObserver.observe(container, { attributes: true, attributeFilter: ["data-search-off"] });
  syncOff();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!input.value.trim() && !image) return input.focus();
    // Phones: close the keyboard so the results show (and the bar may dock).
    if (window.TruongThinhEnv?.phone.matches) input.blur();
    clearTimeout(reSearch);
    client.submit(query());
  }, { signal });
  input.addEventListener("input", () => {
    client.cancel();
    notice("");
  }, { signal });
  input.addEventListener("pointerdown", () => notice(""), { signal });
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
    clearInterval(tipTimer);
    railObserver.disconnect();
    offObserver.disconnect();
    dropImage();
    host.remove();
    ["--search-bar-offset", "--search-block-h"].forEach((name) => document.body.style.removeProperty(name));
    delete document.body.dataset.searchPlace;
  }, { once: true });

  const restored = session.restored(softNavigation);
  if (restored) {
    input.value = restored.text;
    Promise.all(restored.images.slice(0, 1).map(async (base64) => {
      const blob = await (await fetch(`data:image/jpeg;base64,${base64}`)).blob();
      return { base64, blob, hash: await hashOf(blob), url: URL.createObjectURL(blob) };
    })).then(([restoredImage]) => {
      if (signal?.aborted) return restoredImage && URL.revokeObjectURL(restoredImage.url);
      image = restoredImage ?? null;
      renderImage();
      client.submit(query());
    });
  }
}
