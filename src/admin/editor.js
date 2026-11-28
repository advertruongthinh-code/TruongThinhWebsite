// CMS editor start (cms-editor R1, CMS plan E12): who is signed in, the dock and its panels, the top bar, then the record
// opened last. Panels live in their own modules; the dock tools (pin, edges, layout history) live in dock-tools.js.
import { call, MESSAGES, SESSION_EVENT } from "./api.js";
import { dockOptions, setupDockTools } from "./dock-tools.js";
import { h, toast } from "./dom.js";
import { mountAccounts } from "./ops/accounts.js";
import { mountContent, nameOf } from "./panels/content.js";
import { lastOpen, setOpen, state } from "./state.js";

const { createDockview, themeLight } = window.dockview;
const LAYOUT_KEY = "tt-cms-layout";
const PANELS = { content: "Nội dung", preview: "Xem trước", props: "Thuộc tính", media: "Media", drafts: "Nháp", accounts: "Tài khoản" };
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

// Panels that later tasks fill (E13 to E16) show what they will hold, so the default layout is already the final one.
const empty = (title, text) => h("div", { className: "empty" }, h("p", { className: "empty__title" }, title), h("p", {}, text));
const panels = Object.fromEntries(Object.keys(PANELS).map((id) => [id, h("section", { className: `panel panel--${id}` })]));
mountContent(panels.content, { open });
panels.media.append(empty("Thư viện media", "Ảnh và video của site, upload và khung crop sẽ ở đây."));
panels.drafts.append(empty("Chưa có nháp", "Thay đổi chưa lưu trên máy này sẽ hiện ở đây."));
if (PANELS.accounts) mountAccounts(panels.accounts, { toast });

function renderOpen() {
  const record = state.open;
  const name = nameOf(record.type, { id: record.id, name: record.name });
  $("#record-name").textContent = name;
  $("#record-status").textContent = STATUS[record.status] ?? "";
  $("#record-status").dataset.status = record.status;
  panels.preview.replaceChildren(empty(name, "Bản xem trước của mục này sẽ hiện ở đây."));
  panels.props.replaceChildren(empty("Thuộc tính", "Các trường của mục đang mở sẽ hiện ở đây để sửa."));
}
state.addEventListener("open", renderOpen);

// Opens a record in the editor (get); a missing record falls back to Trang chủ.
async function open(type, id) {
  const result = await call("get", { query: { type, id } });
  if (result.error) {
    if (result.status === 404 && !(type === "page-copy" && id === "home")) return open("page-copy", "home");
    return toast(result.error === "forbidden" ? MESSAGES.forbidden : "Chưa mở được mục này. Thử lại sau.");
  }
  setOpen({ ...result.data, name: nameOf(type, { id, name: result.data.data?.title?.vi ?? result.data.data?.titleVi ?? result.data.data?.name }) });
}

// ---------- Dock ----------

let tools;
const dock = createDockview($("#dock"), {
  theme: themeLight,
  createComponent: ({ name }) => ({ element: panels[name], init() {} }),
  createRightHeaderActionComponent: (group) => tools.headerActions(group),
  ...dockOptions(),
});
tools = setupDockTools(dock, $("#dock"), {
  onHistoryChange: ({ canUndo, canRedo }) => {
    $("#layout-undo").disabled = !canUndo;
    $("#layout-redo").disabled = !canRedo;
  },
});

const addPanel = (id, position, size) => dock.addPanel({ id, component: id, title: PANELS[id], position, ...size });

// Default layout (cms-editor R1): Nội dung left 280px, Xem trước centre, Thuộc tính right 380px with Media and Nháp as tabs.
function defaultLayout() {
  dock.clear();
  addPanel("preview");
  addPanel("content", { referencePanel: "preview", direction: "left" }, { initialWidth: 280 });
  addPanel("props", { referencePanel: "preview", direction: "right" }, { initialWidth: 380 });
  addPanel("media", { referencePanel: "props", direction: "within" });
  addPanel("drafts", { referencePanel: "props", direction: "within" });
  dock.getPanel("props").api.setActive();
}

// Reopen a closed panel next to a main panel that is still open; Accounts needs the wide centre.
function focusPanel(id) {
  const ref = ["preview", "props", "content"].find((other) => other !== id && dock.getPanel(other));
  const direction = id === "accounts" && ref === "preview" ? "within" : "right";
  tools.reveal(dock.getPanel(id) ?? addPanel(id, ref && { referencePanel: ref, direction }));
}

// A saved layout from the old editor or with a panel this account may not see falls back to the default.
try {
  const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY));
  const ids = Object.values(saved?.panels ?? {}).map((panel) => panel.contentComponent);
  if (!ids.includes("content") || ids.some((id) => !PANELS[id])) throw new Error("layout of another editor");
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
  ...Object.entries(PANELS).map(([id, title]) => h("button", { type: "button", onclick: closeMenu(() => focusPanel(id)) }, title)),
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
