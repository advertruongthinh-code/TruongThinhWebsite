// Overlay trong bản xem trước: chọn, sửa tại chỗ placeholder và báo editor (cms-editor R3). cms-core.js nạp file này.
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
  // Trang Sản phẩm Quảng cáo (R7): chọn cả card (ô lưới, gợi ý, khung ảnh chính của trang chi tiết), khóa "card:<id>".
  const cardsMode = window.TTCms.page === "advertising";
  const cardPath = () => decodeURIComponent(location.pathname.match(/\/advertising-products\/p\/([^/]+)\/$/)?.[1] ?? "");
  const cardOf = (node) => {
    const tile = node.closest("[data-advertising-card], [data-advertising-related-card]");
    if (tile) return tile.dataset.advertisingCard ?? tile.dataset.advertisingRelatedCard;
    return node.closest("[data-advertising-photo-primary]") ? cardPath() || null : null;
  };
  const byKey = (key) => {
    if (!key?.startsWith("card:")) return key && document.querySelector(`[data-cms-key="${key}"]`);
    const id = key.slice(5);
    return [document.querySelector(`[data-advertising-card="${CSS.escape(id)}"]`),
      cardPath() === id ? document.querySelector("[data-advertising-photo-primary]") : null].find((node) => node && visible(node));
  };
  const info = (node) => ({
    key: node.dataset.cmsKey,
    kind: node.tagName === "IMG" ? "image" : "text",
    list: node.closest("[data-cms-list]")?.dataset.cmsList ?? null,
    item: node.closest("[data-cms-item]")?.dataset.cmsItem ?? null,
  });
  // Phần tử trên cùng tại điểm bấm có khóa (hoặc card) và đang hiện (slide hero ẩn có opacity 0 nên bị bỏ qua).
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
  // Thả media từ panel Media (R6): vào danh sách là thêm mục, vào ảnh lẻ là đổi ảnh, vào card là thêm media cho card.
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

  // Chữ đang tách dòng (SplitText) phải gộp lại trước khi đổi, tách lại sau khi ngừng gõ.
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
    // Bỏ khoảng trắng thụt dòng của HTML nguồn để con trỏ nằm cuối chữ thấy được.
    inline.textContent = inline.textContent.replace(/\s+/g, " ").trim();
    inline.contentEditable = "plaintext-only";
    inline.focus();
    getSelection()?.selectAllChildren(inline);
    getSelection()?.collapseToEnd();
    // Listener gỡ khi kết thúc để lần sửa sau cùng chỗ không cộng dồn.
    inlineListeners = new AbortController();
    const { signal } = inlineListeners;
    inline.addEventListener("input", () => editor.onInlineInput(key, inline?.textContent ?? ""), { signal });
    inline.addEventListener("blur", finishInline, { signal });
    // Phím gõ không lan ra site: Locomotive cuộn trang khi gặp phím cách, mũi tên ngoài input.
    ["keyup", "keypress"].forEach((type) => inline.addEventListener(type, (event) => event.stopPropagation(), { signal }));
    inline.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        inline?.blur();
      }
    }, { signal });
  };

  // Chế độ sửa chặn link, kéo gallery, Barba; chế độ xem trả lại tương tác của site.
  const block = (event) => {
    if (!editMode || inline?.contains(event.target)) return;
    // preventDefault giữ focus nên chỗ đang sửa tại chỗ không tự blur: kết thúc tay.
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
  // Chế độ xem vẫn không chuyển trang (link, Barba): iframe rời bản xem trước thì mất nháp và overlay. Riêng link mở
  // trang chi tiết card do runtime Sản phẩm Quảng cáo xử lý tại chỗ (đổi path, không tải trang) nên vẫn cho bấm.
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

  // Báo editor khi runtime site đã chạy (Locomotive, SplitText xong), để cuộn tới chỗ đang sửa không bị reset về đầu.
  const ready = () => editor.onPreviewReady(window);
  const start = performance.now();
  const wait = () => (window.__ttMotionRuntimeHealthy || performance.now() - start > 4000 ? setTimeout(ready, 150) : setTimeout(wait, 100));
  if (document.readyState === "complete") wait();
  else addEventListener("load", wait, { once: true });
})();
