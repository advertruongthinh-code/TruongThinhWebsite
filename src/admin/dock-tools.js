// Extras for the MIT Dockview dock (cms-dock): tab pinning, layout history (undo/redo), the workspace and the edge groups
// (left, right, bottom) of an IDE. Self-written on the public `dockview` 8.8 API (edge group, collapse, setSize, moveTo,
// onWillShowOverlay, toJSON/fromJSON); does not use or unlock any module of `dockview-enterprise`.

export const EDGES = ["left", "right", "bottom"];
const HISTORY_DEPTH = 25;
const HISTORY_MERGE_MS = 400;
// cms-dock R2, R3: an edge dragged under its threshold collapses; a workspace group never gets smaller than this.
const COLLAPSE_UNDER = { left: 170, right: 170, bottom: 120 };
export const WORKSPACE_MIN = { width: 320, height: 200 };

const el = (tag, className, ...children) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
};
export const icon = (path) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = path;
  return svg;
};
const CLOSE_ICON = '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" fill="none"/>';
const PIN_ICON = '<path d="M9.5 1.5l5 5-1.4.6-2.6 2.6.3 3-1.3 1.3-3-3-3.5 3.5-.7-.7 3.5-3.5-3-3L4.1 5.2l3 .3 2.6-2.6z" fill="currentColor"/>';
const isPinned = (panel) => Boolean(panel?.params?.pinned);
export const edgeOf = (group) => (group?.api.location.type === "edge" ? group.api.location.position : null);

// Custom tab modeled on the default tab DOM (`dv-default-tab`) to keep theme styling. It carries the panel's icon and its
// name: CSS shows only the icon on the left and right edges, only the name elsewhere (cms-dock R2). A pinned tab has a pin
// icon instead of the close button.
class Tab {
  constructor(icons) {
    this.icons = icons;
    this.glyph = el("span", "dock-tab-icon");
    this.title = el("div", "dv-default-tab-content");
    this.action = el("div", "dv-default-tab-action");
    this.action.setAttribute("role", "button");
    this.action.tabIndex = -1;
    this.element = el("div", "dv-default-tab", this.glyph, this.title, this.action);
  }

  init({ api, title, params }) {
    this.api = api;
    this.pinned = Boolean(params?.pinned);
    this.title.textContent = title ?? "";
    const path = this.icons[api.component];
    if (path) this.glyph.append(icon(path));
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
    const name = this.title.textContent;
    this.element.classList.toggle("is-pinned", this.pinned);
    this.element.title = name; // an icon-only tab names itself on hover
    this.element.setAttribute("aria-label", name);
    this.action.replaceChildren(icon(this.pinned ? PIN_ICON : CLOSE_ICON));
    this.action.setAttribute("aria-label", `${this.pinned ? "Bỏ ghim" : "Đóng"} ${name}`);
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

// icons: { [component]: svg path markup } for the tabs.
export function dockOptions({ icons = {} } = {}) {
  return { defaultTabComponent: "tab", createTabComponent: () => new Tab(icons) };
}

// isWorkspace(panel): whether the panel belongs in the workspace (record tabs, Tài khoản) rather than an edge group.
// edgeFooter(group): an element for the end of an edge group's tab strip (the account button on the left edge), or null.
export function setupDockTools(dock, root, { isWorkspace, edgeFooter = () => null, onHistoryChange = () => {} }) {
  const later = (fn) => setTimeout(fn, 0);
  const edgeGroup = (position) => dock.groups.find((group) => edgeOf(group) === position);
  const gridGroups = () => dock.groups.filter((group) => group.api.location.type === "grid");

  // ---------- Ghim tab (workspace only) ----------
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
  dock.onDidAddPanel((panel) => {
    later(() => sortGroup(panel.group));
    panel.api.onDidParametersChange(() => later(() => sortGroup(panel.group)));
  });
  dock.onDidMovePanel(({ panel }) => later(() => {
    // A pin does not survive a move into an edge group (R1); drop rules keep that from happening, this is the backstop.
    if (edgeOf(panel.group) && isPinned(panel)) setPinned(panel.api, false);
    sortGroup(panel.group);
  }));

  function togglePin(panel) {
    if (panel && !edgeOf(panel.group)) setPinned(panel.api, !isPinned(panel));
  }

  // Right-click menu on a tab: pin or unpin (workspace), close.
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
      ...(edgeOf(panel.group) ? [] : [item(isPinned(panel) ? "Bỏ ghim tab" : "Ghim tab", () => togglePin(panel))]),
      item("Đóng tab", () => panel.api.close()),
    );
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.hidden = false;
    menu.querySelector("button").focus();
  });
  document.addEventListener("pointerdown", (event) => { if (!menu.contains(event.target)) hideMenu(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") hideMenu(); });

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
  layoutListeners.add(() => {
    clearTimeout(timer);
    timer = setTimeout(record, HISTORY_MERGE_MS);
  });
  // Resizing the window resizes every panel; it does not count as a step.
  window.addEventListener("resize", () => { quietUntil = Date.now() + HISTORY_MERGE_MS * 2; });

  function restore(from, to) {
    if (timer) record();
    if (!from.length) return;
    to.push(current);
    current = from.pop();
    quietUntil = Date.now() + HISTORY_MERGE_MS * 2;
    dock.fromJSON(current.json);
    settle();
    notify();
  }
  const undo = () => restore(undoStack, redoStack);
  const redo = () => restore(redoStack, undoStack);

  // ---------- Workspace and edge groups (R2, R3) ----------

  // Every group: workspace groups keep 320x200; an empty right or bottom edge takes no space (the left edge keeps its
  // strip for the account button); the edge position is on the element for CSS.
  function shape(group) {
    const position = edgeOf(group);
    group.element.dataset.edge = position ?? "";
    if (!position) {
      if (group.api.minimumWidth !== WORKSPACE_MIN.width || group.api.minimumHeight !== WORKSPACE_MIN.height) {
        group.api.setConstraints({ minimumWidth: WORKSPACE_MIN.width, minimumHeight: WORKSPACE_MIN.height });
      }
      return;
    }
    const visible = position === "left" || group.panels.length > 0;
    if (dock.isEdgeGroupVisible(position) !== visible) dock.setEdgeGroupVisible(position, visible);
  }
  function settle() {
    dock.groups.forEach(shape);
    sortAll();
  }
  const watchGroup = (group) => {
    group.api.onDidCollapsedChange(layoutChanged);
    later(() => shape(group));
  };
  dock.groups.forEach(watchGroup);
  dock.onDidAddGroup(watchGroup);
  const reshape = () => later(settle);
  dock.onDidAddPanel(reshape);
  dock.onDidRemovePanel(reshape);
  dock.onDidMovePanel(reshape);

  // Creates the edge group at `position` if this layout has none yet (a layout saved before the edge held panels).
  function ensureEdge(position, { size, collapsed = false } = {}) {
    if (!dock.getEdgeGroup(position)) {
      dock.addEdgeGroup(position, { id: `edge-${position}`, initialSize: size, collapsed });
      watchGroup(edgeGroup(position));
    }
    return edgeGroup(position);
  }

  // Drop rules: edge panels move only between and within edge groups (as tabs, never split); workspace tabs stay in the
  // workspace. A refused place shows no overlay and takes no drop.
  dock.onWillShowOverlay((event) => {
    const data = event.getData?.();
    const source = data?.panelId ? [dock.getPanel(data.panelId)] : dock.getGroup(data?.groupId)?.panels;
    if (!source?.length) return;
    const toWorkspace = source.every(isWorkspace);
    const target = event.group;
    if (event.kind === "edge" || !target) return event.preventDefault(); // the whole-layout edges would add a grid group
    if (edgeOf(target)) {
      if (toWorkspace || (event.kind === "content" && event.position !== "center")) event.preventDefault();
    } else if (!toWorkspace) event.preventDefault();
  });

  // Dragging an edge panel shows a band on each hidden edge (an empty right or bottom edge) to drop it there.
  let dragged = null;
  const bands = EDGES.map((position) => {
    const band = el("div", `dock-band dock-band--${position}`);
    band.hidden = true;
    band.dataset.edge = position;
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
      if (panel) moveToEdge(panel, position);
    });
    root.append(band);
    return band;
  });
  function endDrag() {
    dragged = null;
    bands.forEach((band) => { band.hidden = true; band.classList.remove("is-over"); });
  }
  dock.onWillDragPanel(({ panel }) => {
    if (isWorkspace(panel)) return;
    dragged = panel;
    // Show the bands after the browser captures the drag image, so they do not end up in the image.
    later(() => {
      if (!dragged) return;
      bands.forEach((band) => { band.hidden = dock.isEdgeGroupVisible(band.dataset.edge); });
    });
  });
  document.addEventListener("dragend", endDrag, true);
  document.addEventListener("drop", () => later(endDrag), true);

  function moveToEdge(panel, position) {
    const group = ensureEdge(position, { size: position === "bottom" ? 240 : 300 });
    if (panel.group !== group) panel.api.moveTo({ group, position: "center" });
    reveal(panel);
  }

  // Opening an edge: if the narrowest workspace group would get under its minimum, the opposite edge collapses (R3);
  // when that is not enough the edge itself gives up the missing space.
  function makeRoom(position, { pushOpposite = true } = {}) {
    const opposite = pushOpposite && { left: "right", right: "left", bottom: null }[position];
    // Workspace groups keep their minimum and overflow the workspace instead; the overflow is the missing space.
    const short = () => {
      const box = root.querySelector(".dv-grid-view")?.getBoundingClientRect();
      if (!box) return 0;
      const rects = gridGroups().map((group) => group.element.getBoundingClientRect());
      return Math.max(0, ...rects.map((rect) => (position === "bottom" ? rect.bottom - box.bottom : rect.right - box.right)));
    };
    let missing = short();
    if (missing > 0.5 && opposite) {
      const other = edgeGroup(opposite);
      if (other && !other.api.isCollapsed()) other.api.collapse();
      missing = short();
    }
    if (missing > 0.5) {
      const group = edgeGroup(position);
      const size = position === "bottom" ? group.api.height : group.api.width;
      group.api.setSize(position === "bottom" ? { height: size - missing } : { width: size - missing });
    }
  }
  function expand(group) {
    if (!group.api.isCollapsed()) return;
    group.api.expand();
    makeRoom(edgeOf(group));
  }

  // Clicking a tab of a collapsed strip opens the edge and pushes the workspace (Dockview's own behaviour, then makeRoom);
  // clicking the tab that is already open collapses the edge back into its strip.
  let pressed = null;
  root.addEventListener("pointerdown", (event) => {
    const tab = event.button === 0 && event.target.closest?.(".dv-edge-group .dv-tab[data-tab-panel-id]");
    const panel = tab && dock.getPanel(tab.dataset.tabPanelId);
    pressed = panel ? { panel, open: !panel.group.api.isCollapsed() && panel.group.activePanel === panel, collapsed: panel.group.api.isCollapsed() } : null;
  }, true);
  root.addEventListener("click", (event) => {
    const tab = event.target.closest?.(".dv-edge-group .dv-tab[data-tab-panel-id]");
    if (!tab || !pressed || pressed.panel.id !== tab.dataset.tabPanelId) return;
    const { panel, open, collapsed } = pressed;
    pressed = null;
    if (open) panel.group.api.collapse();
    else if (collapsed) {
      panel.api.setActive();
      if (panel.group.api.isCollapsed()) panel.group.api.expand();
      makeRoom(edgeOf(panel.group));
    }
  });

  // Dragging an edge under its threshold collapses it on release; reopening it brings back the size from before that drag.
  let before = null;
  root.addEventListener("pointerdown", (event) => {
    if (!event.target.closest?.(".dv-sash")) return;
    before = Object.fromEntries(EDGES.map((position) => {
      const group = edgeGroup(position);
      return [position, group && !group.api.isCollapsed() ? (position === "bottom" ? group.api.height : group.api.width) : null];
    }));
  }, true);
  document.addEventListener("pointerup", () => {
    if (!before) return;
    const sizes = before;
    before = null;
    later(() => {
      for (const position of EDGES) {
        const group = edgeGroup(position);
        if (!group || group.api.isCollapsed() || sizes[position] === null) continue;
        const size = position === "bottom" ? group.api.height : group.api.width;
        if (size >= COLLAPSE_UNDER[position]) {
          if (size !== sizes[position]) makeRoom(position, { pushOpposite: false }); // a wide drag stops at the workspace minimum
          continue;
        }
        group.api.collapse();
        group.api.setSize(position === "bottom" ? { height: sizes[position] } : { width: sizes[position] });
      }
    });
  }, true);

  // Opening a panel from the Bảng menu also opens the edge group that holds it.
  function reveal(panel) {
    panel.api.setActive();
    if (edgeOf(panel.group)) expand(panel.group);
  }

  // Header end of each group: the edge footer (account button) when the editor gives one.
  function headerActions(group) {
    const box = el("div", "dock-edge-actions");
    const sync = () => {
      const footer = edgeOf(group) ? edgeFooter(group) : null;
      if (box.firstChild !== footer) box.replaceChildren(...(footer ? [footer] : []));
    };
    return {
      element: box,
      init() {
        sync();
        later(sync); // an edge group gets its location after its header is built
        this.subscriptions = [group.api.onDidLocationChange(() => later(sync))];
      },
      dispose() {
        this.subscriptions?.forEach((subscription) => subscription.dispose());
      },
    };
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
    ensureEdge,
    edgeGroup,
    undo,
    redo,
    reveal,
    start() { settle(); current = snap(); undoStack.length = redoStack.length = 0; notify(); },
  };
}
