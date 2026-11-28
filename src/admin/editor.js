// CMS editor start (cms-editor R1, CMS plan E12): who is signed in, the dock and its panels, the top bar, then the record
// opened last. Panels live in their own modules; the dock tools (pin, edges, layout history) live in dock-tools.js.
import { call, MESSAGES, SESSION_EVENT } from "./api.js";
import { dockOptions, setupDockTools } from "./dock-tools.js";
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

// Panels that later tasks fill (E14 to E16) show what they will hold, so the default layout is already the final one.
const empty = (title, text) => h("div", { className: "empty" }, h("p", { className: "empty__title" }, title), h("p", {}, text));
const panels = Object.fromEntries(Object.keys(PANELS).map((id) => [id, h("section", { className: `panel panel--${id}` })]));
mountContent(panels.content, { open });
mountPreview(panels.preview);
const props = mountPageProps(panels.props);
panels.media.append(empty("Thư viện media", "Ảnh và video của site, upload và khung crop sẽ ở đây."));
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

const addPanel = (id, position, size) => dock.addPanel({ id, component: id, title: PANELS[id], position, ...size });

// Default layout (cms-editor R1): Nội dung left 280px, Xem trước centre, Thuộc tính right 380px with Media and Nháp as tabs.
// Side panels give way on a tablet in portrait (about 768px) so Xem trước keeps a usable centre.
function defaultLayout() {
  const width = Math.max(innerWidth, 768); // a page opened while the phone note shows must not start with tiny side panels
  dock.clear();
  addPanel("preview");
  addPanel("content", { referencePanel: "preview", direction: "left" }, { initialWidth: Math.min(280, width * 0.3) });
  addPanel("props", { referencePanel: "preview", direction: "right" }, { initialWidth: Math.min(380, width * 0.36) });
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
