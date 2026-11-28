// Nháp panel (cms-editor R8): every record that has a draft on this machine, each with "Mở" and "Bỏ nháp".
import { h } from "../dom.js";
import { draftKey, listDrafts, session } from "../drafts.js";

export function mountDrafts(root, { open }) {
  function render() {
    const drafts = listDrafts(localStorage);
    if (!drafts.length) {
      return root.replaceChildren(h("div", { className: "empty" }, h("p", { className: "empty__title" }, "Chưa có nháp"), h("p", {}, "Thay đổi chưa lưu trên máy này sẽ hiện ở đây.")));
    }
    root.replaceChildren(h("ul", { className: "drafts" }, ...drafts.map((draft) => h("li", { className: "drafts__row" },
      h("span", { className: "drafts__name" }, draft.name, h("small", {}, ` ${draft.type} · ${draft.changes} thay đổi`)),
      h("button", { type: "button", onclick: () => open(draft.type, draft.id) }, "Mở"),
      h("button", { type: "button", onclick: () => discard(draft) }, "Bỏ nháp")))));
  }
  async function discard({ type, id }) {
    const { record } = session.state;
    if (record?.type === type && record.id === id) {
      session.discard();
      await open(type, id);
    } else {
      localStorage.removeItem(draftKey(type, id));
      render();
    }
  }
  for (const name of ["open", "change", "other-tab"]) session.events.addEventListener(name, render);
  window.addEventListener("storage", render);
  render();
  return { render };
}
