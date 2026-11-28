// CMS editor start (cms-editor R1, CMS plan E12): who is signed in, the dock and its panels, the top bar, then the record
// opened last. Panels live in their own modules; the dock tools (pin, workspace and edges, layout history) live in dock-tools.js.
import { call, MESSAGES, SESSION_EVENT } from "./api.js";
import { dockOptions, EDGE_SIZE, edgeOf, icon, setupDockTools } from "./dock-tools.js";
import { draftKey, session } from "./drafts.js";
import { h, time, toast } from "./dom.js";
import { mountAccounts } from "./ops/accounts.js";
import { mountContent, nameOf } from "./panels/content.js";
import { mountDrafts } from "./panels/drafts.js";
import { mountPreview } from "./panels/preview.js";
import { mountPageProps } from "./panels/props/page.js";
import { refreshContext } from "./site-context.js";
import { hasDraft, lastOpen, selectBlock, setOpen, state } from "./state.js";
import { initTheme } from "./theme.mjs";

const { createDockview, themeLight, themeDark } = window.dockview;
const LAYOUT_KEY = "tt-cms-layout";
const PANELS = {
  content: "Nội dung", preview: "Xem trước", props: "Thuộc tính", media: "Media", drafts: "Nháp",
  missing: "Còn thiếu", status: "Trạng thái", log: "Nhật ký", trash: "Thùng rác", accounts: "Tài khoản",
};
// cms-dock R2: the workspace holds the preview and Tài khoản; every other panel lives in an edge group, by default here.
const WORKSPACE = new Set(["preview", "accounts"]);
const HOME_EDGE = { content: "left", media: "left", props: "right", drafts: "right", missing: "bottom", status: "bottom", log: "bottom", trash: "bottom" };
// Icons of the edge tabs (16px, stroked in currentColor).
const S = 'fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  content: `<path ${S} d="M3 2.5h7l3 3v8H3zM10 2.5v3h3M5.5 8h5M5.5 10.5h5"/>`,
  media: `<rect ${S} x="2" y="3" width="12" height="10" rx="1.5"/><circle ${S} cx="6" cy="6.5" r="1.2"/><path ${S} d="M2.5 12l3.5-3.5 2.5 2.5 2-2 3 3"/>`,
  props: `<path ${S} d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6"/><circle ${S} cx="10" cy="4.5" r="1.5"/><circle ${S} cx="6" cy="11.5" r="1.5"/>`,
  drafts: `<path ${S} d="M10.5 2.5l3 3L6 13H3v-3z M9 4l3 3"/>`,
  missing: `<circle ${S} cx="8" cy="8" r="5.5"/><path ${S} d="M8 5v3.5M8 10.8v.2"/>`,
  status: `<path ${S} d="M1.5 8h3l2-4.5 3 9 2-4.5h3"/>`,
  log: `<circle ${S} cx="8" cy="8" r="5.5"/><path ${S} d="M8 4.8V8l2.2 1.4"/>`,
  trash: `<path ${S} d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.7 9h6.6l.7-9"/>`,
};
const ACCOUNT_ICON = '<circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="6.3" r="2.4" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M3.6 12.8c1-1.8 2.6-2.7 4.4-2.7s3.4.9 4.4 2.7" fill="none" stroke="currentColor" stroke-width="1.2"/>';
const STATUS = { draft: "Nháp", published: "Đã đăng", trashed: "Trong thùng rác" };
const $ = (selector) => document.querySelector(selector);

// A page-wide message in place of the dock: no access, or the Access session ended.
function stop(message) {
  document.body.classList.add("is-stopped");
  $("#gate").replaceChildren(h("p", {}, message));
  $("#gate").hidden = false;
}
window.addEventListener(SESSION_EVENT, () => stop(MESSAGES.session));

const me = await call("whoami");
if (me.error) {
  stop(me.error === "forbidden" ? "Tài khoản của bạn chưa được mở trong CMS." : me.error === "session" ? MESSAGES.session : "Chưa kết nối được CMS. Tải lại trang sau ít phút.");
  throw new Error(`whoami ${me.status}`);
}
state.user = me.data;
if (me.data.role !== "owner") delete PANELS.accounts;

// Panels that later tasks fill (E14 to E16) show what they will hold, so the default layout is already the final one.
const empty = (title, text) => h("div", { className: "empty" }, h("p", { className: "empty__title" }, title), h("p", {}, text));
const panels = Object.fromEntries(Object.keys(PANELS).map((id) => [id, h("section", { className: `panel panel--${id}` })]));
mountContent(panels.content, { open });
mountPreview(panels.preview);
const props = mountPageProps(panels.props, {
  missingRoot: panels.missing,
  onCount: (count) => dock.getPanel("missing")?.api.setTitle(`${PANELS.missing}${count ? ` (${count})` : ""}`),
  reveal: (id) => focusPanel(id),
});
panels.media.append(empty("Thư viện media", "Ảnh và video của site, upload và khung crop sẽ ở đây."));
panels.status.append(empty("Trạng thái", "Trạng thái dựng staging và site chính sẽ ở đây."));
panels.log.append(empty("Nhật ký", "Ai đã sửa gì, lúc nào, sẽ ở đây."));
panels.trash.append(empty("Thùng rác", "Bản ghi đã đưa vào thùng rác sẽ ở đây, khôi phục được."));
mountDrafts(panels.drafts, { open });
if (PANELS.accounts) mountAccounts(panels.accounts, { toast });

// Top bar: name, status, "Chưa lưu · n thay đổi", and the Hoàn tác and Lưu buttons (R8).
function renderTop() {
  const { record, changes } = session.state;
  if (!record) return;
  const name = nameOf(record.type, { id: record.id, name: session.state.data?.title?.vi ?? session.state.data?.titleVi ?? session.state.data?.name });
  $("#record-name").textContent = name;
  $("#record-status").textContent = STATUS[record.status] ?? "";
  $("#record-status").dataset.status = record.status;
  $("#record-unsaved").textContent = changes > 0 ? `Chưa lưu · ${changes} thay đổi` : "";
  $("#undo").disabled = !session.canUndo();
  $("#save").disabled = changes === 0 || session.saving();
  if (hasDraft(record.type, record.id) !== renderTop.had) {
    renderTop.had = hasDraft(record.type, record.id);
    state.dispatchEvent(new Event("draft"));
  }
  if (session.state.conflict) askConflict();
}
for (const name of ["open", "change", "other-tab"]) session.events.addEventListener(name, renderTop);
session.events.addEventListener("storage-full", () => toast("Bộ nhớ trình duyệt đầy, nháp chưa ghi được. Lưu bài sớm."));
window.addEventListener("storage", (event) => {
  const { record } = session.state;
  if (record && event.key === draftKey(record.type, record.id)) session.otherTab();
});
$("#undo").addEventListener("click", () => session.undo());
$("#save").addEventListener("click", async () => {
  const saving = session.save();
  renderTop(); // the button waits until this save is back
  const result = await saving;
  if (result.kind === "conflict") return renderTop(); // renderTop asks
  afterSave(result);
});
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "z" && !event.target.matches?.("input, textarea")) {
    event.preventDefault();
    session.undo();
  }
});

// R8 table: what the editor shows after a save; the record is already reloaded when it went through.
function afterSave(result) {
  toast(result.message);
  if (["saved", "draft"].includes(result.kind)) {
    refreshContext();
    setOpen({ ...session.state.record, data: session.state.data, name: $("#record-name").textContent });
    if (result.kind === "draft") props.show("missing");
  } else if (result.errors) props.showErrors(result.errors) || props.show("missing");
  else if (result.kind === "slug") props.show("info");
  renderTop();
}

// R8: the other version's author and time, then "Lấy bản mới" or "Giữ bản của tôi".
function askConflict() {
  if (document.querySelector("dialog.conflict")) return;
  const { current } = session.state.conflict;
  const finish = async (choice) => {
    dialog.close();
    const result = await session.resolve(choice);
    if (choice !== "take") afterSave(result);
    else if (result.error) toast("Chưa lấy được bản mới. Nháp vẫn ở máy này, thử lại sau.");
    else selectBlock(null);
    renderTop();
  };
  const dialog = h("dialog", { className: "conflict", onclose: () => dialog.remove() },
    h("h2", {}, "Bài này đã có bản mới hơn"),
    h("p", {}, `${current.updatedBy ?? "Một người khác"} đã lưu bản mới lúc ${time(current.updatedAt)}. Nháp của bạn chưa mất.`),
    h("menu", {},
      h("button", { type: "button", onclick: () => finish("take") }, "Lấy bản mới"),
      h("button", { type: "button", className: "is-primary", onclick: () => finish("keep") }, "Giữ bản của tôi")));
  document.body.append(dialog);
  dialog.showModal();
}

// Opens a record in the editor (get + its draft); a missing record falls back to Trang chủ.
async function open(type, id) {
  const result = await session.open(type, id);
  if (result.error) {
    if (result.status === 404 && !(type === "page-copy" && id === "home")) return open("page-copy", "home");
    return toast(result.error === "forbidden" ? MESSAGES.forbidden : "Chưa mở được mục này. Thử lại sau.");
  }
  selectBlock(null);
  setOpen({ ...session.state.record, data: session.state.data, name: nameOf(type, { id, name: session.state.data?.title?.vi ?? session.state.data?.titleVi ?? session.state.data?.name }) });
}

// ---------- Dock ----------

// The round account button at the foot of the left edge strip (cms-editor R1): everyone sees who is signed in; the owner
// opens the Tài khoản tab in the workspace.
const accountButton = h("button", {
  type: "button",
  className: "dock-account",
  title: state.user.email,
  "aria-label": `Tài khoản: ${state.user.email}`,
  onclick: () => PANELS.accounts && focusPanel("accounts"),
});
accountButton.append(icon(ACCOUNT_ICON));

let tools;
const dock = createDockview($("#dock"), {
  theme: themeLight,
  createComponent: ({ name }) => ({ element: panels[name], init() {} }),
  createRightHeaderActionComponent: (group) => tools.headerActions(group),
  ...dockOptions({ icons: ICONS }),
});
tools = setupDockTools(dock, $("#dock"), {
  isWorkspace: (panel) => WORKSPACE.has(panel.api.component),
  edgeFooter: (group) => (edgeOf(group) === "left" ? accountButton : null),
  onHistoryChange: ({ canUndo, canRedo }) => {
    $("#layout-undo").disabled = !canUndo;
    $("#layout-redo").disabled = !canRedo;
  },
});

// Colour scheme (R10): the pill in the top bar sets light, dark or system; Dockview takes its matching theme.
const theme = initTheme({
  // Reading `localStorage` itself throws when site data is blocked, so access stays inside the calls initTheme guards.
  storage: { getItem: (key) => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) },
  root: document.documentElement,
  media: matchMedia("(prefers-color-scheme: dark)"),
  onChange: (resolved, pref) => {
    dock.updateOptions({ theme: resolved === "dark" ? themeDark : themeLight });
    document.querySelectorAll("[data-theme-pref]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.themePref === pref)));
  },
});
document.querySelectorAll("[data-theme-pref]").forEach((button) => button.addEventListener("click", () => theme.set(button.dataset.themePref)));

const addPanel = (id, position) => dock.addPanel({ id, component: id, title: PANELS[id], position });

// Default layout (cms-editor R1, cms-dock R2, R3): the workspace holds the preview; Nội dung and Media on the left edge,
// Thuộc tính and Nháp on the right, the four others on the bottom edge, collapsed. Under 1024px the side edges start
// collapsed so the workspace keeps the window.
function defaultLayout() {
  const narrow = innerWidth < 1024;
  dock.clear();
  addPanel("preview");
  for (const position of ["left", "right", "bottom"]) {
    const group = tools.ensureEdge(position, { size: EDGE_SIZE[position] });
    group.api.setSize(position === "bottom" ? { height: EDGE_SIZE[position] } : { width: EDGE_SIZE[position] });
    for (const id of Object.keys(HOME_EDGE).filter((key) => HOME_EDGE[key] === position)) addPanel(id, { referenceGroup: group.id });
    group.panels[0]?.api.setActive();
    if (position === "bottom" || narrow) group.api.collapse();
    else group.api.expand();
  }
  dock.getPanel("preview").api.setActive();
}

// Opens a panel from the Bảng menu or the account button: an edge panel comes back to its edge and opens it, a workspace
// panel becomes a tab of the active workspace group.
function focusPanel(id) {
  let panel = dock.getPanel(id);
  if (!panel) {
    const workspace = dock.activeGroup?.api.location.type === "grid" ? dock.activeGroup : dock.groups.find((group) => group.api.location.type === "grid");
    panel = WORKSPACE.has(id)
      ? addPanel(id, workspace && { referenceGroup: workspace.id })
      : addPanel(id, { referenceGroup: tools.ensureEdge(HOME_EDGE[id], { size: EDGE_SIZE[HOME_EDGE[id]], collapsed: true }).id });
  }
  tools.reveal(panel);
}

// A saved layout falls back to the default when it comes from the editor before the edge groups (cms-dock R2), places a
// panel on the wrong side of the workspace/edge line, or has a panel this account may not see.
try {
  const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY));
  const inGrid = Object.values(saved?.panels ?? {}).map((panel) => panel.contentComponent);
  const edges = Object.values(saved?.edgeGroups ?? {}).flatMap((edge) => edge.group?.views ?? []).map((view) => saved.panels[view]?.contentComponent);
  if (!saved?.edgeGroups?.left || !inGrid.includes("content") || inGrid.some((id) => !Object.hasOwn(PANELS, id))) throw new Error("layout of another editor");
  if (edges.some((id) => WORKSPACE.has(id)) || inGrid.filter((id) => !edges.includes(id)).some((id) => !WORKSPACE.has(id))) throw new Error("panel on the wrong side");
  dock.fromJSON(saved);
} catch {
  defaultLayout();
}
tools.onLayoutChange(() => localStorage.setItem(LAYOUT_KEY, JSON.stringify(dock.toJSON())));

const closeMenu = (action) => () => {
  $(".topbar__menu").open = false;
  action();
};
$("#panel-menu").append(
  ...Object.entries(PANELS).filter(([id]) => id !== "accounts").map(([id, title]) => h("button", { type: "button", onclick: closeMenu(() => focusPanel(id)) }, title)),
  h("hr"),
  h("button", { type: "button", onclick: closeMenu(defaultLayout) }, "Bố cục mặc định"),
  h("button", { type: "button", id: "layout-undo", title: "Ctrl+Alt+Z", disabled: true, onclick: closeMenu(tools.undo) }, "Hoàn tác bố cục"),
  h("button", { type: "button", id: "layout-redo", title: "Ctrl+Alt+Y", disabled: true, onclick: closeMenu(tools.redo) }, "Làm lại bố cục"),
);
document.addEventListener("pointerdown", (event) => $(".topbar__menu").contains(event.target) || ($(".topbar__menu").open = false));
document.addEventListener("keydown", (event) => event.key === "Escape" && ($(".topbar__menu").open = false));
tools.start();

const { type, id } = lastOpen();
await open(type, id);
