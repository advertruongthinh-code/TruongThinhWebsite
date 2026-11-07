// Bổ sung cho dock Dockview MIT (cms-editor R11): ghim tab, lịch sử bố cục (undo/redo), mép tự ẩn và kéo panel ra
// mép. Tự viết trên API công khai của `dockview` 8.8 (edge group, collapse, moveTo, toJSON/fromJSON); không dùng hay
// mở khóa module của `dockview-enterprise`.

const EDGES = ["left", "right", "bottom"];
const HISTORY_DEPTH = 25;
const HISTORY_MERGE_MS = 400;
const PEEK_SIZE = 320;

const el = (tag, className, ...children) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
};
const icon = (path) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = path;
  return svg;
};
const CLOSE_ICON = '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" fill="none"/>';
const PIN_ICON = '<path d="M9.5 1.5l5 5-1.4.6-2.6 2.6.3 3-1.3 1.3-3-3-3.5 3.5-.7-.7 3.5-3.5-3-3L4.1 5.2l3 .3 2.6-2.6z" fill="currentColor"/>';
// Mũi tên chỉ về phía mép mà nhóm sẽ thu vào.
const COLLAPSE_ICON = {
  left: '<path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.6" fill="none"/>',
  right: '<path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" fill="none"/>',
  bottom: '<path d="M3 6l5 5 5-5" stroke="currentColor" stroke-width="1.6" fill="none"/>',
};
const isPinned = (panel) => Boolean(panel?.params?.pinned);

// Tab tự vẽ theo DOM tab mặc định (`dv-default-tab`) để giữ style theme; tab ghim có biểu tượng ghim thay nút đóng.
class Tab {
  constructor() {
    this.title = el("div", "dv-default-tab-content");
    this.action = el("div", "dv-default-tab-action");
    this.action.setAttribute("role", "button");
    this.action.tabIndex = -1;
    this.element = el("div", "dv-default-tab", this.title, this.action);
  }

  init({ api, title, params }) {
    this.api = api;
    this.pinned = Boolean(params?.pinned);
    this.title.textContent = title ?? "";
    this.render();
    this.subscriptions = [
      api.onDidTitleChange(({ title: next }) => { this.title.textContent = next; this.render(); }),
      api.onDidParametersChange((next) => { this.pinned = Boolean(next?.pinned); this.render(); }),
    ];
    this.action.addEventListener("pointerdown", (event) => event.preventDefault());
    this.action.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.pinned) setPinned(api, false);
      else api.close();
    });
  }

  render() {
    this.element.classList.toggle("is-pinned", this.pinned);
    this.action.replaceChildren(icon(this.pinned ? PIN_ICON : CLOSE_ICON));
    this.action.setAttribute("aria-label", `${this.pinned ? "Bỏ ghim" : "Đóng"} ${this.title.textContent}`);
    this.action.title = this.pinned ? "Bỏ ghim tab" : "Đóng tab";
  }

  dispose() {
    this.subscriptions?.forEach((subscription) => subscription.dispose());
  }
}

// Đổi trạng thái ghim lưu trong `params` để `toJSON()` giữ lại; sắp xếp nhóm được làm khi params đổi.
function setPinned(api, pinned) {
  api.updateParameters({ pinned: pinned || undefined });
}

export function dockOptions() {
  return { defaultTabComponent: "tab", createTabComponent: () => new Tab() };
}

export function setupDockTools(dock, root, { onHistoryChange = () => {} } = {}) {
  // ---------- Ghim tab ----------
  let sorting = false;
  // Tab ghim luôn đứng đầu nhóm; tab thường kéo lên trước tab ghim sẽ bị đẩy về sau khối ghim.
  function sortGroup(group) {
    if (sorting || !group) return;
    const order = [...group.panels.filter(isPinned), ...group.panels.filter((panel) => !isPinned(panel))];
    if (order.every((panel, index) => group.panels[index] === panel)) return;
    sorting = true;
    const active = group.activePanel;
    order.forEach((panel, index) => {
      if (group.panels[index] !== panel) panel.api.moveTo({ group, position: "center", index, skipSetActive: true });
    });
    active?.api.setActive();
    sorting = false;
  }
  const sortAll = () => dock.groups.forEach(sortGroup);
  const later = (fn) => setTimeout(fn, 0);
  dock.onDidAddPanel((panel) => {
    later(() => sortGroup(panel.group));
    panel.api.onDidParametersChange(() => later(() => sortGroup(panel.group)));
  });
  dock.onDidMovePanel(({ panel }) => later(() => sortGroup(panel.group)));

  function togglePin(panel) {
    if (panel) setPinned(panel.api, !isPinned(panel));
  }

  // Menu chuột phải trên tab: ghim, bỏ ghim, đóng.
  const menu = el("div", "dock-menu");
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  document.body.append(menu);
  const hideMenu = () => { menu.hidden = true; };
  root.addEventListener("contextmenu", (event) => {
    const tab = event.target.closest(".dv-tab[data-tab-panel-id]");
    const panel = tab && dock.getPanel(tab.dataset.tabPanelId);
    if (!panel) return;
    event.preventDefault();
    const item = (label, action) => {
      const button = el("button", "", label);
      button.type = "button";
      button.setAttribute("role", "menuitem");
      button.addEventListener("click", () => { hideMenu(); action(); });
      return button;
    };
    menu.replaceChildren(
      item(isPinned(panel) ? "Bỏ ghim tab" : "Ghim tab", () => togglePin(panel)),
      item("Đóng tab", () => panel.api.close()),
    );
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.hidden = false;
    menu.querySelector("button").focus();
  });
  document.addEventListener("pointerdown", (event) => { if (!menu.contains(event.target)) hideMenu(); });

  // ---------- Lịch sử bố cục ----------
  // Mỗi bước là ảnh chụp `toJSON()`; so sánh bỏ qua nhóm và tab đang chọn để bấm qua lại tab không tạo bước.
  const undoStack = [];
  const redoStack = [];
  const keyOf = (json) => JSON.stringify(json, (key, value) => (key === "activeGroup" || key === "activeView" ? undefined : value));
  const snap = () => { const json = dock.toJSON(); return { json, key: keyOf(json) }; };
  let current = null;
  let timer = 0;
  let quietUntil = 0;
  const notify = () => onHistoryChange({ canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });

  function record() {
    timer = 0;
    const next = snap();
    if (!current || Date.now() < quietUntil || next.key === current.key) {
      current = next;
      return;
    }
    undoStack.push(current);
    if (undoStack.length > HISTORY_DEPTH) undoStack.shift();
    redoStack.length = 0;
    current = next;
    notify();
  }
  // Thu, mở nhóm mép không phát `onDidLayoutChange` trong Dockview 8.8; gộp hai nguồn thành một tín hiệu đổi bố cục.
  const layoutListeners = new Set();
  const layoutChanged = () => layoutListeners.forEach((listener) => listener());
  dock.onDidLayoutChange(layoutChanged);
  const watchGroup = (group) => group.api.onDidCollapsedChange(layoutChanged);
  dock.groups.forEach(watchGroup);
  dock.onDidAddGroup(watchGroup);
  layoutListeners.add(() => {
    clearTimeout(timer);
    timer = setTimeout(record, HISTORY_MERGE_MS);
  });
  // Đổi cỡ cửa sổ làm đổi kích thước mọi panel; không tính là một bước.
  window.addEventListener("resize", () => { quietUntil = Date.now() + HISTORY_MERGE_MS * 2; });

  function restore(from, to) {
    if (timer) record();
    if (!from.length) return;
    hidePeek();
    to.push(current);
    current = from.pop();
    quietUntil = Date.now() + HISTORY_MERGE_MS * 2;
    dock.fromJSON(current.json);
    sortAll();
    notify();
  }
  const undo = () => restore(undoStack, redoStack);
  const redo = () => restore(redoStack, undoStack);

  // ---------- Mép tự ẩn: bấm tab ở dải mép để trượt panel ra, ghim để mở hẳn ----------
  const peek = { box: el("div", "dock-peek"), panel: null, home: null };
  const peekTitle = el("strong", "dock-peek__title");
  const pinButton = el("button", "dock-peek__button", "Ghim");
  const closeButton = el("button", "dock-peek__button", icon(CLOSE_ICON));
  const peekBody = el("div", "dock-peek__body");
  pinButton.type = closeButton.type = "button";
  pinButton.title = "Ghim ra cạnh, không tự ẩn";
  closeButton.title = "Đóng panel";
  closeButton.setAttribute("aria-label", "Đóng panel");
  peek.box.append(el("div", "dock-peek__bar", peekTitle, pinButton, closeButton), peekBody);
  peek.box.hidden = true;
  peek.box.setAttribute("role", "dialog");
  root.append(peek.box);

  const edgeOf = (group) => (group?.api.location.type === "edge" ? group.api.location.position : null);
  const edgeSize = (position) => dock.toJSON().edgeGroups?.[position]?.size || PEEK_SIZE;

  function showPeek(panel) {
    hidePeek();
    const group = panel.group;
    const position = edgeOf(group);
    const content = panel.view?.content?.element;
    if (!position || !content) return;
    const strip = group.element.getBoundingClientRect();
    const frame = root.getBoundingClientRect();
    const size = edgeSize(position);
    Object.assign(peek.box.style, { left: "", right: "", top: "", bottom: "", width: "", height: "" });
    if (position === "left") Object.assign(peek.box.style, { left: `${strip.right - frame.left}px`, top: "0", bottom: "0", width: `${size}px` });
    if (position === "right") Object.assign(peek.box.style, { right: `${frame.right - strip.left}px`, top: "0", bottom: "0", width: `${size}px` });
    if (position === "bottom") Object.assign(peek.box.style, { bottom: `${frame.bottom - strip.top}px`, left: "0", right: "0", height: `${size}px` });
    peek.box.dataset.edge = position;
    peek.panel = panel;
    peek.home = { parent: content.parentNode, next: content.nextSibling, content };
    peekTitle.textContent = panel.title;
    peekBody.append(content);
    peek.box.hidden = false;
  }

  function hidePeek() {
    if (!peek.panel) return;
    const { parent, next, content } = peek.home;
    // Panel không phải tab đang mở của nhóm thì Dockview chưa gắn nội dung; gỡ ra để Dockview tự gắn khi cần.
    if (parent?.isConnected) parent.insertBefore(content, next?.parentNode === parent ? next : null);
    else content.remove();
    peek.panel = null;
    peek.home = null;
    peek.box.hidden = true;
  }

  pinButton.addEventListener("click", () => {
    const panel = peek.panel;
    hidePeek();
    panel?.group.api.expand();
    panel?.api.setActive();
  });
  closeButton.addEventListener("click", () => {
    const panel = peek.panel;
    hidePeek();
    panel?.api.close();
  });

  // Dockview MIT mở hẳn nhóm khi bấm tab ở dải thu gọn; chặn ở pha capture để thay bằng trượt ra tạm (peek), dải
  // vẫn thu gọn nên lưới không đổi. Kéo tab (dragstart) không bị chặn.
  const stripTab = (event) => event.button === 0 && event.target.closest?.(".dv-edge-collapsed .dv-tab[data-tab-panel-id]");
  for (const type of ["pointerdown", "mousedown"]) {
    root.addEventListener(type, (event) => { if (stripTab(event)) event.stopPropagation(); }, true);
  }
  root.addEventListener("click", (event) => {
    const tab = stripTab(event);
    if (!tab) return;
    event.stopPropagation();
    const panel = dock.getPanel(tab.dataset.tabPanelId);
    const again = peek.panel === panel;
    hidePeek();
    if (!again && panel) showPeek(panel);
  }, true);
  document.addEventListener("pointerdown", (event) => {
    if (!peek.panel || peek.box.contains(event.target) || event.target.closest?.(".dv-edge-collapsed")) return;
    hidePeek();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { hidePeek(); hideMenu(); }
  });

  // Nút trên header nhóm mép đang mở: thu lại thành dải tự ẩn.
  const headerSyncs = new Set();
  layoutListeners.add(() => later(() => headerSyncs.forEach((sync) => sync())));
  function headerActions(group) {
    const button = el("button", "dock-edge-action");
    button.type = "button";
    button.title = "Tự ẩn: thu về dải bên mép, bấm tab để xem tạm";
    button.setAttribute("aria-label", "Tự ẩn nhóm mép");
    button.addEventListener("click", () => group.api.collapse());
    const sync = () => {
      const position = edgeOf(group);
      button.hidden = !position || group.api.isCollapsed();
      if (!button.hidden && button.dataset.edge !== position) {
        button.dataset.edge = position;
        button.replaceChildren(icon(COLLAPSE_ICON[position]));
      }
    };
    return {
      element: el("div", "dock-edge-actions", button),
      init() {
        sync();
        headerSyncs.add(sync);
        this.subscriptions = [group.api.onDidCollapsedChange(() => later(sync)), group.api.onDidLocationChange(() => later(sync))];
      },
      dispose() {
        headerSyncs.delete(sync);
        this.subscriptions?.forEach((subscription) => subscription.dispose());
      },
    };
  }

  // ---------- Kéo panel ra mép để tạo nhóm mép (thu gọn) ----------
  const bands = EDGES.map((position) => {
    const band = el("div", `dock-band dock-band--${position}`);
    band.hidden = true;
    band.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.stopPropagation();
      band.classList.add("is-over");
    });
    band.addEventListener("dragleave", () => band.classList.remove("is-over"));
    band.addEventListener("drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const panel = dragged;
      endDrag();
      if (panel) dockToEdge(panel, position);
    });
    root.append(band);
    return band;
  });
  let dragged = null;
  function endDrag() {
    dragged = null;
    bands.forEach((band) => { band.hidden = true; band.classList.remove("is-over"); });
  }
  dock.onWillDragPanel(({ panel }) => {
    hidePeek();
    dragged = panel;
    // Hiện dải sau khi trình duyệt chụp ảnh kéo, tránh dải lọt vào ảnh.
    later(() => { if (dragged) bands.forEach((band) => { band.hidden = false; }); });
  });
  document.addEventListener("dragend", endDrag, true);
  document.addEventListener("drop", () => later(endDrag), true);

  function dockToEdge(panel, position) {
    let group = dock.getEdgeGroup(position) && dock.groups.find((item) => edgeOf(item) === position);
    if (!group) {
      dock.addEdgeGroup(position, { id: `edge-${position}`, collapsed: true, initialSize: PEEK_SIZE });
      group = dock.getGroup(`edge-${position}`);
    }
    if (panel.group !== group) panel.api.moveTo({ group, position: "center" });
  }

  // Nhóm mép rỗng thì gỡ hẳn, mép không chiếm chỗ tới lần kéo sau.
  const dropEmptyEdges = () => later(() => {
    for (const position of EDGES) {
      const group = dock.groups.find((item) => edgeOf(item) === position);
      if (dock.getEdgeGroup(position) && group && group.panels.length === 0) dock.removeEdgeGroup(position);
    }
  });
  dock.onDidRemovePanel(dropEmptyEdges);
  dock.onDidMovePanel(dropEmptyEdges);

  // Mở một panel nằm trong dải thu gọn thì trượt nó ra thay vì chỉ đổi tab ẩn.
  function reveal(panel) {
    if (edgeOf(panel.group) && panel.group.api.isCollapsed()) showPeek(panel);
    else panel.api.setActive();
  }

  // Phím tắt: Ctrl+Alt+Z hoàn tác bố cục, Ctrl+Alt+Y hoặc Ctrl+Alt+Shift+Z làm lại, Ctrl+Shift+Enter ghim tab đang mở.
  document.addEventListener("keydown", (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    const key = event.key.toLowerCase();
    if (event.altKey && key === "z") { event.preventDefault(); (event.shiftKey ? redo : undo)(); }
    else if (event.altKey && key === "y") { event.preventDefault(); redo(); }
    else if (event.shiftKey && key === "enter") { event.preventDefault(); togglePin(dock.activePanel); }
  });

  return {
    onLayoutChange: (listener) => layoutListeners.add(listener),
    headerActions,
    undo,
    redo,
    reveal,
    hidePeek,
    start() { sortAll(); current = snap(); undoStack.length = redoStack.length = 0; notify(); },
  };
}
