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
  const byKey = (key) => key && document.querySelector(`[data-cms-key="${key}"]`);
  const visible = (node) => node.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true;
  // Phần tử trên cùng tại điểm bấm có khóa và đang hiện (slide hero ẩn có opacity 0 nên bị bỏ qua).
  const pick = (x, y) => document.elementsFromPoint(x, y)
    .map((node) => node.closest("[data-cms-key]"))
    .find((node) => node && visible(node));
  const info = (node) => ({
    key: node.dataset.cmsKey,
    kind: node.tagName === "IMG" ? "image" : "text",
    list: node.closest("[data-cms-list]")?.dataset.cmsList ?? null,
    item: node.closest("[data-cms-item]")?.dataset.cmsItem ?? null,
  });

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
    hoverNode = editMode ? pick(event.clientX, event.clientY) : null;
  }, { passive: true });
  // Chế độ xem vẫn không chuyển trang (link, Barba): iframe rời bản xem trước thì mất nháp và overlay.
  const stayOnPreview = (event) => {
    const href = event.target.closest?.("a[href]")?.getAttribute("href");
    if (!href || href.startsWith("#")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    editor.toast("Chế độ xem không chuyển trang. Mở trang khác từ bảng Trang hoặc nút Mở tab mới.");
  };
  addEventListener("click", (event) => {
    if (!editMode) return stayOnPreview(event);
    if (inline?.contains(event.target)) return;
    block(event);
    const node = pick(event.clientX, event.clientY);
    selectedKey = node?.dataset.cmsKey ?? null;
    editor.onSelect(node ? info(node) : null);
  }, true);
  addEventListener("dblclick", (event) => {
    if (!editMode) return;
    const node = pick(event.clientX, event.clientY);
    if (node && node.tagName !== "IMG") startInline(node);
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
