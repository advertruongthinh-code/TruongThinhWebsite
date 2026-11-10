// Extras for the MIT Dockview dock (cms-editor R11): tab pinning, layout history (undo/redo), auto-hide edges and dragging panels to
// an edge. Self-written on the public `dockview` 8.8 API (edge group, collapse, moveTo, toJSON/fromJSON); does not use or
// unlock any module of `dockview-enterprise`.

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
// The arrow points toward the edge the group will collapse into.
const COLLAPSE_ICON = {
  left: '<path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.6" fill="none"/>',
  right: '<path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" fill="none"/>',
  bottom: '<path d="M3 6l5 5 5-5" stroke="currentColor" stroke-width="1.6" fill="none"/>',
};
const isPinned = (panel) => Boolean(panel?.params?.pinned);

// Custom tab modeled on the default tab DOM (`dv-default-tab`) to keep theme styling; a pinned tab has a pin icon instead of the close button.
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

// Switch the pin state stored in `params` so `toJSON()` keeps it; group sorting runs when params change.
function setPinned(api, pinned) {
  api.updateParameters({ pinned: pinned || undefined });
}

export function dockOptions() {
  return { defaultTabComponent: "tab", createTabComponent: () => new Tab() };
}

export function setupDockTools(dock, root, { onHistoryChange = () => {} } = {}) {
  // ---------- Ghim tab ----------
  let sorting = false;
  // Pinned tabs always sit at the group start; a regular tab dragged before a pinned tab is pushed back after the pinned block.
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

  // Right-click menu on a tab: pin, unpin, close.
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

  // ---------- Layout history ----------
  // Each step is a `toJSON()` snapshot; comparison ignores the active group and tab so switching tabs back and forth adds no step.
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
  // Collapsing or expanding an edge group does not fire `onDidLayoutChange` in Dockview 8.8; merge both sources into one layout-change signal.
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
  // Resizing the window resizes every panel; it does not count as a step.
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

  // ---------- Auto-hide edge: click a tab in the edge strip to slide the panel out, pin to open it fully ----------
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
    // If the panel is not the group's active tab Dockview has not attached its content; detach it so Dockview attaches it when needed.
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

  // MIT Dockview fully opens the group when a tab in the collapsed strip is clicked; block it in the capture phase and replace it with a temporary slide-out (peek), the strip
  // stays collapsed so the grid does not change. Dragging a tab (dragstart) is not blocked.
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

  // Button on the header of an open edge group: collapse it back into an auto-hide strip.
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

  // ---------- Drag a panel to an edge to create an edge group (collapsed) ----------
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
    // Show the strip after the browser captures the drag image, so the strip does not end up in the image.
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

  // Remove an empty edge group entirely so the edge takes no space until the next drag.
  const dropEmptyEdges = () => later(() => {
    for (const position of EDGES) {
      const group = dock.groups.find((item) => edgeOf(item) === position);
      if (dock.getEdgeGroup(position) && group && group.panels.length === 0) dock.removeEdgeGroup(position);
    }
  });
  dock.onDidRemovePanel(dropEmptyEdges);
  dock.onDidMovePanel(dropEmptyEdges);

  // Opening a panel that sits in a collapsed strip slides it out instead of only changing the hidden tab.
  function reveal(panel) {
    if (edgeOf(panel.group) && panel.group.api.isCollapsed()) showPeek(panel);
    else panel.api.setActive();
  }

  // Shortcuts: Ctrl+Alt+Z undoes the layout, Ctrl+Alt+Y or Ctrl+Alt+Shift+Z redoes, Ctrl+Shift+Enter pins the active tab.
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
