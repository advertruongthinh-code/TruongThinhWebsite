// Overlay in the preview: select, edit placeholders in place and notify the editor (cms-editor R3). cms-core.js loads this file.
(() => {
  const editor = window.parent?.TTEditor;
  if (!editor || !window.TTCms) return;
  const locale = document.documentElement.dataset.routeLocale === "en" ? "en" : "vi";
  const split = () => window.TruongThinhDetail;
  let editMode = true;
  let hoverNode = null;
  let selectedKey = null;
  let inline = null;
  let rebuildTimer = 0;

  const box = (name) => {
    const node = Object.assign(document.createElement("div"), { className: `tt-cms-box tt-cms-box--${name}`, hidden: true });
    document.documentElement.append(node);
    return node;
  };
  const hoverBox = box("hover");
  const selectedBox = box("selected");
  const visible = (node) => node.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true;
  // Advertising Products page (R7): select a whole card (grid cell, suggestion, main image frame of the detail page), key "card:<id>".
  const cardsMode = window.TTCms.page === "advertising";
  const cardPath = () => decodeURIComponent(location.pathname.match(/\/advertising-products\/p\/([^/]+)\/$/)?.[1] ?? "");
  const cardOf = (node) => {
    // A suggestion card is a masonry item but not a card: it has no card:<id> key.
    const tile = node.closest("[data-masonry-item]:not([data-masonry-kind=\"suggestion\"])");
    if (tile) return tile.dataset.masonryItem;
    return node.closest("[data-detail-primary]") ? cardPath() || null : null;
  };
  const byKey = (key) => {
    if (!key?.startsWith("card:")) return key && document.querySelector(`[data-cms-key="${key}"]`);
    const id = key.slice(5);
    return [...document.querySelectorAll(`[data-masonry-item="${CSS.escape(id)}"]:not([data-masonry-kind="suggestion"])`),
      cardPath() === id ? document.querySelector("[data-detail-primary]") : null].find((node) => node && visible(node));
  };
  const info = (node) => ({
    key: node.dataset.cmsKey,
    kind: node.tagName === "IMG" ? "image" : "text",
    list: node.closest("[data-cms-list]")?.dataset.cmsList ?? null,
    item: node.closest("[data-cms-item]")?.dataset.cmsItem ?? null,
  });
  // Topmost element at the click point that has a key (or card) and is visible (a hidden hero slide has opacity 0 so is skipped).
  const pick = (x, y) => {
    for (const node of document.elementsFromPoint(x, y)) {
      if (cardsMode) {
        const id = cardOf(node);
        if (id) return { node: byKey(`card:${id}`) ?? node, selection: { kind: "card", card: id, key: `card:${id}` } };
        continue;
      }
      const keyed = node.closest("[data-cms-key]");
      if (keyed && visible(keyed)) return { node: keyed, selection: info(keyed) };
    }
    return null;
  };
  // Dropping media from the Media panel (R6): onto a list adds an item, onto a single image replaces the image, onto a card adds media to the card.
  const MEDIA_TYPE = "application/x-tt-media";
  const dropTarget = (x, y) => {
    if (cardsMode) return pick(x, y);
    for (const node of document.elementsFromPoint(x, y)) {
      const list = node.closest("[data-cms-list]");
      if (list) return { node: list, selection: { kind: "list", list: list.dataset.cmsList } };
      if (node.tagName === "IMG" && node.dataset.cmsKey && visible(node)) return { node, selection: info(node) };
    }
    return null;
  };

  const place = (frame, node) => {
    const rect = node?.isConnected ? node.getBoundingClientRect() : null;
    frame.hidden = !editMode || !rect || (!rect.width && !rect.height);
    if (!frame.hidden) Object.assign(frame.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  };
  const loop = () => {
    place(hoverBox, hoverNode);
    place(selectedBox, byKey(selectedKey));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const scrollToNode = (node) => {
    const rect = node.getBoundingClientRect();
    if (rect.top >= 0 && rect.bottom <= innerHeight) return;
    const smooth = window.__ttCmsScroll;
    if (smooth && document.documentElement.classList.contains("has-scroll-smooth")) {
      smooth.scrollTo(node, { offset: -innerHeight / 3, duration: 0, disableLerp: true });
    } else node.scrollIntoView({ block: "center" });
  };

  // Text being split into lines (SplitText) must be merged back before changing, and split again after typing stops.
  const rebuildSoon = () => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => split()?.rebuildSplitText?.(), 250);
  };

  let inlineListeners = null;
  const finishInline = () => {
    if (!inline) return;
    inlineListeners?.abort();
    inline.removeAttribute("contenteditable");
    inline = null;
    window.TTCms.mirror(document);
    rebuildSoon();
  };
  const startInline = (node) => {
    finishInline();
    const key = node.dataset.cmsKey;
    split()?.revertSplitText?.();
    inline = byKey(key);
    if (!inline) return;
    // Drop the indentation whitespace of the source HTML so the caret sits visibly at the end of the text.
    inline.textContent = inline.textContent.replace(/\s+/g, " ").trim();
    inline.contentEditable = "plaintext-only";
    inline.focus();
    getSelection()?.selectAllChildren(inline);
    getSelection()?.collapseToEnd();
    // The listener is removed on finish so the next edit in the same place does not accumulate.
    inlineListeners = new AbortController();
    const { signal } = inlineListeners;
    inline.addEventListener("input", () => editor.onInlineInput(key, inline?.textContent ?? ""), { signal });
    inline.addEventListener("blur", finishInline, { signal });
    // Typed keys do not propagate to the site: Locomotive scrolls the page on space, arrows outside an input.
    ["keyup", "keypress"].forEach((type) => inline.addEventListener(type, (event) => event.stopPropagation(), { signal }));
    inline.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        inline?.blur();
      }
    }, { signal });
  };

  // Edit mode blocks links, gallery dragging, Barba; view mode gives the site its interactions back.
  const block = (event) => {
    if (!editMode || inline?.contains(event.target)) return;
    // preventDefault keeps focus so the in-place edit does not blur by itself: finish it manually.
    inline?.blur();
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  ["pointerdown", "mousedown", "auxclick", "submit"].forEach((type) => addEventListener(type, block, { capture: true }));
  addEventListener("mousemove", (event) => {
    hoverNode = editMode ? pick(event.clientX, event.clientY)?.node ?? null : null;
  }, { passive: true });
  addEventListener("dragover", (event) => {
    if (!event.dataTransfer?.types.includes(MEDIA_TYPE)) return;
    const target = dropTarget(event.clientX, event.clientY);
    hoverNode = target?.node ?? null;
    if (target) event.preventDefault();
  }, true);
  addEventListener("drop", (event) => {
    const src = event.dataTransfer?.getData(MEDIA_TYPE);
    const target = src && dropTarget(event.clientX, event.clientY);
    hoverNode = null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    editor.onDropMedia(src, target.selection);
  }, true);
  // View mode still does not navigate pages (links, Barba): the iframe leaving the preview loses the draft and the overlay. Only links opening a
  // card detail page are handled in place by the Advertising Products runtime (path change, no page load) so they stay clickable.
  const stayOnPreview = (event) => {
    const href = event.target.closest?.("a[href]")?.getAttribute("href");
    if (!href || href.startsWith("#") || (cardsMode && /\/advertising-products\/p\//.test(href))) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    editor.toast("Chế độ xem không chuyển trang. Mở trang khác từ bảng Trang hoặc nút Mở tab mới.");
  };
  addEventListener("click", (event) => {
    if (!editMode) return stayOnPreview(event);
    if (inline?.contains(event.target)) return;
    block(event);
    const hit = pick(event.clientX, event.clientY);
    selectedKey = hit?.selection.key ?? null;
    editor.onSelect(hit?.selection ?? null);
  }, true);
  addEventListener("dblclick", (event) => {
    if (!editMode) return;
    const hit = pick(event.clientX, event.clientY);
    if (hit?.selection.kind === "text") startInline(hit.node);
  }, true);
  addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !inline) {
      selectedKey = null;
      editor.onSelect(null);
    }
  });

  window.TTCmsOverlay = {
    setText(key, value) {
      if (inline?.dataset.cmsKey === key) return;
      split()?.revertSplitText?.();
      window.TTCms.setText(document, key, value, locale);
      window.TTCms.mirror(document);
      rebuildSoon();
    },
    select(key) {
      selectedKey = key;
      const node = byKey(key);
      if (node) scrollToNode(node);
    },
    setMode(edit) {
      editMode = edit;
      finishInline();
      document.documentElement.classList.toggle("tt-cms-edit", edit);
    },
  };
  document.documentElement.classList.add("tt-cms-edit");

  // Tell the editor when the site runtime has started (Locomotive, SplitText done), so scrolling to the place being edited is not reset to the top.
  const ready = () => editor.onPreviewReady(window);
  const start = performance.now();
  const wait = () => (window.__ttMotionRuntimeHealthy || performance.now() - start > 4000 ? setTimeout(ready, 150) : setTimeout(wait, 100));
  if (document.readyState === "complete") wait();
  else addEventListener("load", wait, { once: true });
})();
