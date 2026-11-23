// Accounts panel (cms-editor-ops.md R6, CMS plan P7): owner adds a person by email, changes the role, locks or reopens.
// Emails are shown only in this panel: nothing is written to localStorage or to the dock layout.
const ROLES = { owner: "Owner", staff: "Nhân viên" };
const ROLE_NOTE = {
  owner: "Toàn quyền: thêm người, khóa, xóa hẳn, quay về bản trước.",
  staff: "Soạn, lưu, upload, phát hành; không quản lý tài khoản.",
};
const ERRORS = {
  access: "Chưa đổi được quyền đăng nhập, thử lại sau.",
  "last-owner": "Phải còn ít nhất một owner đang mở.",
  exists: "Email này đã có trong danh sách.",
  shape: "Email chưa đúng dạng.",
};

const h = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.flat().filter((child) => child != null));
  return node;
};
const time = (iso) => (iso ? new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "");

async function api(command, body) {
  const init = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const response = await fetch(`/api/admin/${command}`, init).catch(() => null);
  const data = await response?.json().catch(() => ({}));
  return { status: response?.status ?? 0, data: data ?? {} };
}

// Returns false for staff (403): the editor then leaves the panel out of the menu.
export async function mountAccounts(root, { toast }) {
  const state = { items: [], me: "", drift: null, unsynced: new Set(), error: "" };
  const first = await api("account-list");
  if (first.status === 403) return false;

  const message = h("p", { className: "warn", role: "alert" });
  const email = h("input", { type: "email", placeholder: "ten@gmail.com", autocomplete: "off", required: true, ariaLabel: "Email Google" });
  const roleInputs = Object.keys(ROLES).map((role) => h("input", { type: "radio", name: "account-role", value: role, checked: role === "staff" }));
  const addButton = h("button", { type: "submit", className: "is-primary" }, "Thêm");
  const form = h("form", { className: "acc-add", onsubmit: add },
    h("label", { className: "field" }, h("span", {}, "Email Google"), email),
    h("fieldset", { className: "acc-roles" }, h("legend", {}, "Vai trò"),
      roleInputs.map((input) => h("label", { className: "acc-role" }, input, h("strong", {}, ROLES[input.value]), h("small", {}, ROLE_NOTE[input.value])))),
    addButton);
  const list = h("ul", { className: "acc-list" });
  const drift = h("p", { className: "warn" });
  const dialogText = h("p", {});
  const dialog = h("dialog", { className: "acc-dialog" },
    h("form", { method: "dialog" }, dialogText,
      h("div", { className: "acc-dialog__actions" },
        h("button", { value: "cancel" }, "Hủy"),
        h("button", { value: "ok", className: "is-danger" }, "Khóa"))));
  root.replaceChildren(
    h("h2", {}, "Tài khoản"),
    h("p", { className: "meta" }, "Người có trong danh sách đăng nhập CMS bằng email Google. Khóa thì người đó bị chặn ngay."),
    drift, form, message, h("h3", {}, "Người dùng"), list, dialog);

  function show(result) {
    if (result.status === 0) return "Mất kết nối, thử lại sau.";
    return ERRORS[result.data.error] ?? `Lỗi ${result.status}.`;
  }

  function apply(result) {
    state.items = result.data.items ?? [];
    state.me = result.data.me ?? "";
    state.drift = result.data.accessDrift ?? null;
    render();
  }

  async function reload() {
    const result = await api("account-list");
    if (result.status === 200) apply(result);
    else message.textContent = show(result);
  }

  async function add(event) {
    event.preventDefault();
    message.textContent = "";
    addButton.disabled = true;
    const role = roleInputs.find((input) => input.checked).value;
    const result = await api("account-add", { email: email.value, role });
    addButton.disabled = false;
    if (result.status !== 201) return (message.textContent = show(result));
    email.value = "";
    toast(`Đã thêm ${result.data.email}.`);
    await reload();
  }

  async function update(item, change) {
    message.textContent = "";
    const result = await api("account-update", { email: item.email, ...change });
    if (result.status !== 200) {
      message.textContent = show(result);
      return render();
    }
    if (result.data.accessSynced === false) state.unsynced.add(item.email);
    else state.unsynced.delete(item.email);
    await reload();
  }

  function confirmLock(item) {
    dialogText.textContent = item.email === state.me
      ? "Khóa chính tài khoản của bạn? Bạn sẽ bị đăng xuất khỏi CMS ngay."
      : `Khóa ${item.email}? Người này không vào được CMS nữa cho tới khi mở lại.`;
    dialog.onclose = () => dialog.returnValue === "ok" && update(item, { status: "locked" });
    dialog.showModal();
  }

  function row(item) {
    const locked = item.status === "locked";
    const select = h("select", { ariaLabel: `Vai trò của ${item.email}`, disabled: locked, onchange: () => update(item, { role: select.value }) },
      Object.entries(ROLES).map(([value, label]) => h("option", { value, selected: value === item.role }, label)));
    return h("li", { className: `acc-row${locked ? " is-locked" : ""}` },
      h("span", { className: "acc-avatar", ariaHidden: "true" }, item.email[0].toUpperCase()),
      h("span", { className: "acc-who" },
        h("strong", {}, item.email, item.email === state.me ? h("em", { className: "acc-me" }, "Bạn") : null),
        h("small", {}, `Sửa lần cuối ${time(item.updated_at)}`),
        state.unsynced.has(item.email) ? h("small", { className: "warn" }, "Đã khóa trong CMS, chưa gỡ được khỏi đăng nhập. ",
          h("button", { type: "button", className: "link", onclick: () => update(item, { status: "locked" }) }, "Thử lại")) : null),
      h("span", { className: "acc-controls" },
        select,
        h("span", { className: `acc-badge${locked ? "" : " is-on"}` }, locked ? "Đã khóa" : "Đang mở"),
        h("button", { type: "button", className: locked ? "acc-action" : "acc-action is-danger",
          onclick: () => (locked ? update(item, { status: "active" }) : confirmLock(item)) }, locked ? "Mở lại" : "Khóa")));
  }

  function render() {
    list.replaceChildren(...state.items.map(row));
    const count = state.drift ? state.drift.onlyAccess.length + state.drift.onlyAccounts.length : 0;
    drift.textContent = count ? `Danh sách đăng nhập lệch với bảng tài khoản: ${count} email.` : "";
  }

  if (first.status === 200) apply(first);
  else message.textContent = show(first);
  return true;
}
