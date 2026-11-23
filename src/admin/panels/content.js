// Content panel (cms-editor R2, CMS plan E12): records by group, read with `list` per type and loaded further on scroll;
// labels, search without marks, four filters, a context menu, the Create dialog and drag to reorder (`reorder`).
import { call } from "../api.js";
import { h, time, toast } from "../dom.js";
import { slugOf } from "../slug.mjs";
import { hasDraft, state } from "../state.js";
import { ID } from "../lib/src/cms/contract.mjs";
import { ADVERTISING_CLUSTERS, ADVERTISING_PRODUCTS } from "../lib/src/site/advertising-products/taxonomy.mjs";
import { NEWS_GROUPS } from "../lib/scripts/site/blocks.mjs";
import { PROJECT_TYPES, SECTOR_LABEL, pageHref } from "../lib/scripts/site/block-pages.mjs";
import { cardHref } from "../lib/scripts/site/lib-pure.mjs";

const FIXED = {
  "page-copy": { home: ["Trang chủ", "/"], residential: ["Nhà ở", "/residential/"], commercial: ["Kinh doanh", "/commercial/"], about: ["Giới thiệu", "/about/"] },
  menu: { main: ["Menu", "/"] },
  contact: { main: ["Liên hệ", "/"] },
};
const GROUPS = [
  { key: "pages", title: "Trang chuẩn", types: ["page-copy"] },
  { key: "projects", title: "Công trình", types: ["project"], create: "project", reorder: true },
  { key: "news", title: "News", types: ["news"], create: "news" },
  { key: "cards", title: "Card Advertising", types: ["advertising-card"], create: "advertising-card", closed: true },
  { key: "site", title: "Menu và liên hệ", types: ["menu", "contact"] },
];
const FILTERS = [
  ["all", "Tất cả", () => true],
  ["draft", "Nháp", (item) => item.status === "draft"],
  ["en", "Thiếu EN", (item) => item.enMissing],
  ["error", "Có lỗi", (item) => item.variantError],
];
const CREATE_TITLE = { news: "Tạo bài News", project: "Tạo công trình", "advertising-card": "Tạo card Advertising" };
const fold = (value) => String(value ?? "").normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase();
export const nameOf = (type, item) => FIXED[type]?.[item.id]?.[0] ?? item.name ?? item.id;

export function mountContent(root, { open }) {
  const store = new Map(); // type -> { items, next, loading, error, done }
  const view = { query: "", filter: "all", expanded: new Set(GROUPS.filter((group) => !group.closed).map((group) => group.key)), products: new Set() };
  const bodies = new Map();
  const counts = new Map();
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && load(entry.target.dataset.type)));

  const entry = (type) => store.get(type) ?? store.set(type, { items: [], next: null, loading: false, error: null, done: false }).get(type);
  const live = (type) => entry(type).items.filter((item) => item.status !== "trashed");
  const filtering = () => view.query !== "" || view.filter !== "all";
  const matches = (type, item) => FILTERS.find(([key]) => key === view.filter)[2](item) && fold(nameOf(type, item)).includes(fold(view.query));

  // One more page of a type; `all` keeps going until the list ends (reorder and card products need the full list).
  async function load(type, { all = false, reset = false } = {}) {
    const slot = entry(type);
    if (reset) Object.assign(slot, { items: [], next: null, done: false, error: null });
    if (slot.loading || slot.done) return;
    slot.loading = true;
    do {
      const result = await call("list", { query: { type, cursor: slot.next } });
      if (result.error) {
        slot.error = result.error;
        break;
      }
      slot.error = null;
      slot.items.push(...result.data.items);
      slot.next = result.data.next;
      slot.done = !slot.next;
    } while (all && !slot.done);
    slot.loading = false;
    renderAll();
  }

  // ---------- Rows ----------

  function badges(type, item) {
    return [
      item.status === "draft" && ["Nháp", "draft"],
      item.pending > 0 && ["Đang xử lý media", "pending"],
      item.variantError && ["Lỗi media", "error"],
      item.enMissing && ["Thiếu EN", "en"],
      hasDraft(type, item.id) && ["Chưa lưu", "unsaved"],
    ].filter(Boolean).map(([text, kind]) => h("span", { className: `badge badge--${kind}` }, text));
  }

  // list: the ordered items a drag moves within (null: no reorder), scope: main product of a card list.
  function row(type, item, list = null, scope) {
    const current = state.open?.type === type && state.open?.id === item.id;
    const draggable = Boolean(list) && !filtering();
    const button = h("button", {
      type: "button", className: "row", draggable,
      ariaCurrent: current ? "true" : null,
      title: draggable ? "Kéo để xếp thứ tự (hoặc Alt + mũi tên lên, xuống)" : "",
      onclick: () => open(type, item.id),
      oncontextmenu: (event) => {
        event.preventDefault();
        menu(type, item, event.clientX, event.clientY);
      },
      onkeydown: (event) => {
        if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
          event.preventDefault();
          const box = button.getBoundingClientRect();
          menu(type, item, box.left + 24, box.bottom);
        } else if (draggable && event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
          event.preventDefault();
          const index = list.indexOf(item);
          move(type, list, index, index + (event.key === "ArrowUp" ? -1 : 1), scope);
        }
      },
    },
    draggable && h("span", { className: "row__handle", ariaHidden: "true" }),
    h("span", { className: "row__main" },
      h("span", { className: "row__name" }, nameOf(type, item)),
      h("span", { className: "row__meta" }, [item.updatedBy, time(item.updatedAt)].filter(Boolean).join(" · "))),
    h("span", { className: "row__badges" }, badges(type, item)));
    if (draggable) {
      button.addEventListener("dragstart", (event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.id);
        drag = { type, list, item, scope };
        button.classList.add("is-dragging");
      });
      button.addEventListener("dragend", () => {
        drag = null;
        button.classList.remove("is-dragging");
        root.querySelectorAll(".is-drop-before, .is-drop-after").forEach((node) => node.classList.remove("is-drop-before", "is-drop-after"));
      });
      button.addEventListener("dragover", (event) => {
        if (drag?.list !== list || drag.item === item) return;
        event.preventDefault();
        const after = event.offsetY > button.offsetHeight / 2;
        button.classList.toggle("is-drop-after", after);
        button.classList.toggle("is-drop-before", !after);
      });
      button.addEventListener("dragleave", () => button.classList.remove("is-drop-before", "is-drop-after"));
      button.addEventListener("drop", (event) => {
        if (drag?.list !== list) return;
        event.preventDefault();
        const from = list.indexOf(drag.item);
        let to = list.indexOf(item) + (button.classList.contains("is-drop-after") ? 1 : 0);
        if (from < to) to -= 1;
        move(type, list, from, to, scope);
      });
    }
    return h("li", {}, button);
  }

  let drag = null;
  // Reorder sends the full id list of the type (or of one card product); 409 reloads the group (cms-editor R2).
  async function move(type, list, from, to, scope) {
    if (to < 0 || to >= list.length || from === to) return;
    const order = [...list];
    order.splice(to, 0, ...order.splice(from, 1));
    const slot = entry(type);
    const before = slot.items;
    const position = new Map(order.map((item, index) => [item.id, index]));
    const moved = new Set(order.map((item) => item.id));
    // Items outside the reordered list (other card products) keep their places; the moved ones take the new order.
    const queue = [...order];
    slot.items = before.map((item) => (moved.has(item.id) ? queue.shift() : item));
    renderAll();
    root.querySelector(`[data-row="${CSS.escape(`${type}:${order[to].id}`)}"] .row`)?.focus();
    const result = await call("reorder", { body: { type, ids: order.map((item) => item.id), ...(scope ? { scope } : {}) } });
    if (!result.error) return void position;
    slot.items = before;
    if (result.status === 409) {
      toast("Danh sách vừa đổi, xếp lại giúp.");
      await load(type, { all: true, reset: true });
    } else {
      toast(result.error === "forbidden" ? "Tài khoản không có quyền này." : "Chưa xếp được thứ tự. Thử lại sau.");
      renderAll();
    }
  }

  // ---------- Context menu ----------

  const menuNode = h("div", { className: "ctx-menu", role: "menu", hidden: true });
  document.body.append(menuNode);
  const closeMenu = () => (menuNode.hidden = true);
  document.addEventListener("pointerdown", (event) => menuNode.contains(event.target) || closeMenu());
  document.addEventListener("keydown", (event) => event.key === "Escape" && closeMenu());

  function stagingPath(type, item) {
    if (FIXED[type]) return FIXED[type][item.id]?.[1] ?? "/";
    if (type === "news") return pageHref("news", "vi", item);
    if (type === "project") return pageHref("projects", "vi", item);
    if (type === "advertising-card") return cardHref("vi", item);
    return null;
  }

  function menu(type, item, x, y) {
    const path = stagingPath(type, item);
    const origin = state.user?.stagingOrigin;
    const ready = item.status === "published" && path && origin && (FIXED[type] || item.slugVi || type === "advertising-card");
    menuNode.replaceChildren(
      ready
        ? h("a", { role: "menuitem", href: `${origin}${path}`, target: "_blank", rel: "noopener", onclick: closeMenu }, "Mở trên staging")
        : h("button", { type: "button", role: "menuitem", disabled: true, title: "Bản Nháp chưa có trên staging" }, "Mở trên staging"),
    );
    menuNode.hidden = false;
    const box = menuNode.getBoundingClientRect();
    menuNode.style.left = `${Math.min(x, innerWidth - box.width - 8)}px`;
    menuNode.style.top = `${Math.min(y, innerHeight - box.height - 8)}px`;
    menuNode.querySelector("a, button:not(:disabled)")?.focus();
  }

  // ---------- Groups ----------

  function listBody(type, items, { reorder = false, scope } = {}) {
    const slot = entry(type);
    const ordered = type === "news" ? [...items].sort((a, b) => String(b.published ?? "").localeCompare(String(a.published ?? ""))) : items;
    const shown = ordered.filter((item) => matches(type, item));
    const ul = h("ul", { className: "rows" }, shown.map((item) => {
      const li = row(type, item, reorder ? items : null, scope);
      li.dataset.row = `${type}:${item.id}`;
      return li;
    }));
    if (slot.next && !slot.loading && !slot.error) {
      const sentinel = h("li", { className: "rows__more", dataset: { type } }, "Đang tải thêm");
      sentinel.dataset.type = type;
      ul.append(sentinel);
      observer.observe(sentinel);
    }
    return [ul, shown.length];
  }

  function state_(type) {
    const slot = entry(type);
    if (slot.error) return h("p", { className: "group__note" }, "Chưa tải được danh sách. ", h("button", { type: "button", className: "link", onclick: () => load(type) }, "Thử lại"));
    if (!slot.done && !slot.items.length) return h("p", { className: "group__note" }, "Đang tải");
    return null;
  }

  function renderGroup(group) {
    const body = bodies.get(group.key);
    if (!view.expanded.has(group.key)) return void body.replaceChildren();
    if (group.key === "cards") return renderCards(body);
    const parts = [];
    let shown = 0;
    let total = 0;
    for (const type of group.types) {
      const items = live(type);
      total += items.length;
      if (type === "page-copy") items.sort((a, b) => Object.keys(FIXED["page-copy"]).indexOf(a.id) - Object.keys(FIXED["page-copy"]).indexOf(b.id));
      const [ul, count] = listBody(type, items, { reorder: group.reorder && entry(type).done });
      shown += count;
      parts.push(ul, state_(type));
    }
    if (group.reorder && filtering() && total) parts.unshift(h("p", { className: "group__hint" }, "Bỏ lọc và ô tìm để kéo thả xếp thứ tự."));
    const loading = group.types.some((type) => !entry(type).done && !entry(type).error);
    if (!loading && !shown) parts.push(h("p", { className: "group__empty" }, total ? "Không có mục nào khớp." : "Chưa có mục nào"));
    counts.get(group.key).textContent = filtering() && total ? `${shown}/${total}` : String(total || "");
    body.replaceChildren(...parts.filter(Boolean));
  }

  // Cards by cluster then product (cms-editor R2): every card page loads once, then each product shows its own cards.
  function renderCards(body) {
    const type = "advertising-card";
    const slot = entry(type);
    const cards = live(type);
    counts.get("cards").textContent = slot.done ? String(cards.length) : "";
    if (!slot.done) return void body.replaceChildren(state_(type) ?? h("p", { className: "group__note" }, "Đang tải"));
    const byProduct = Map.groupBy(cards, (card) => card.product);
    const clusters = ADVERTISING_CLUSTERS.map((cluster) => {
      const products = ADVERTISING_PRODUCTS.filter((product) => product.cluster === cluster.id).map((product) => {
        const items = byProduct.get(product.id) ?? [];
        const shown = items.filter((item) => matches(type, item)).length;
        if (filtering() && !shown) return null;
        const openNow = view.products.has(product.id) || (view.query !== "" && shown > 0);
        const toggle = h("button", { type: "button", className: "sub__toggle", ariaExpanded: String(openNow), onclick: () => flip(view.products, product.id) },
          h("span", { className: "sub__title" }, product.labelVi), h("span", { className: "count" }, filtering() ? `${shown}/${items.length}` : String(items.length)));
        const inner = openNow ? listBody(type, items, { reorder: true, scope: product.id })[0] : null;
        return h("div", { className: "sub sub--product" }, toggle, inner,
          openNow && !items.length ? h("p", { className: "group__empty" }, "Chưa có mục nào") : null);
      }).filter(Boolean);
      return products.length ? h("div", { className: "sub" }, h("p", { className: "sub__cluster" }, cluster.labelVi), products) : null;
    }).filter(Boolean);
    body.replaceChildren(
      filtering() ? h("p", { className: "group__hint" }, "Bỏ lọc và ô tìm để kéo thả xếp thứ tự.") : null,
      ...(clusters.length ? clusters : [h("p", { className: "group__empty" }, cards.length ? "Không có mục nào khớp." : "Chưa có mục nào")]),
    );
  }

  const flip = (set, key) => {
    if (set.has(key)) set.delete(key);
    else set.add(key);
    renderAll();
  };

  function renderAll() {
    GROUPS.forEach(renderGroup);
    root.querySelectorAll(".group").forEach((node) => {
      const expanded = view.expanded.has(node.dataset.group);
      node.querySelector(".group__toggle").ariaExpanded = String(expanded);
    });
  }

  function toggleGroup(group) {
    flip(view.expanded, group.key);
    if (view.expanded.has(group.key)) group.types.forEach((type) => load(type, { all: group.reorder || group.key === "cards" }));
  }

  // ---------- Toolbar and frame ----------

  const search = h("input", { type: "search", className: "search", placeholder: "Tìm theo tên", ariaLabel: "Tìm theo tên" });
  search.addEventListener("input", () => {
    view.query = search.value.trim();
    renderAll();
  });
  const filterButtons = FILTERS.map(([key, label]) => h("button", {
    type: "button", className: "seg", ariaPressed: String(key === view.filter),
    onclick: () => {
      view.filter = key;
      filterButtons.forEach((button, index) => (button.ariaPressed = String(FILTERS[index][0] === key)));
      renderAll();
    },
  }, label));

  const groups = GROUPS.map((group) => {
    const body = h("div", { className: "group__body", id: `group-${group.key}` });
    const count = h("span", { className: "count" });
    bodies.set(group.key, body);
    counts.set(group.key, count);
    return h("section", { className: "group", dataset: { group: group.key } },
      h("div", { className: "group__head" },
        h("button", { type: "button", className: "group__toggle", ariaExpanded: "false", onclick: () => toggleGroup(group) },
          h("span", { className: "group__title" }, group.title), count),
        group.create && h("button", { type: "button", className: "group__create", title: CREATE_TITLE[group.create], onclick: () => createDialog(group.create) }, "Tạo")),
      body);
  });
  groups.forEach((node, index) => (node.dataset.group = GROUPS[index].key));
  root.replaceChildren(
    h("div", { className: "content__tools" }, search, h("div", { className: "segs", role: "group", ariaLabel: "Bộ lọc" }, filterButtons)),
    h("div", { className: "content__groups" }, groups),
  );
  state.addEventListener("open", renderAll);
  GROUPS.filter((group) => view.expanded.has(group.key)).forEach((group) => group.types.forEach((type) => load(type, { all: group.reorder })));
  renderAll();

  // ---------- Create (cms-editor R2) ----------

  function createDialog(type) {
    const name = h("input", { type: "text", required: true, autocomplete: "off" });
    const id = h("input", { type: "text", autocomplete: "off", spellcheck: false });
    const slug = h("input", { type: "text", autocomplete: "off", spellcheck: false });
    const touched = { id: false, slug: false };
    const select = (label, options) => h("select", { ariaLabel: label }, options);
    const option = (value, text) => h("option", { value }, text);
    const fields = {};
    if (type === "news") fields.group = select("Nhóm", Object.entries(NEWS_GROUPS).map(([key, group]) => option(key, group.vi)));
    if (type === "project") {
      fields.sector = select("Mảng", Object.entries(SECTOR_LABEL).map(([key, label]) => option(key, label.vi)));
      fields.type = select("Loại", []);
      const types = () => fields.type.replaceChildren(...Object.entries(PROJECT_TYPES).filter(([, value]) => value.sector === fields.sector.value).map(([key, value]) => option(key, value.label.vi)));
      fields.sector.addEventListener("change", types);
      types();
    }
    if (type === "advertising-card") {
      fields.product = select("Sản phẩm chính", ADVERTISING_CLUSTERS.map((cluster) => h("optgroup", { label: cluster.labelVi },
        ADVERTISING_PRODUCTS.filter((product) => product.cluster === cluster.id).map((product) => option(product.id, product.labelVi)))));
    }
    const labels = { group: "Nhóm", sector: "Mảng", type: "Loại", product: "Sản phẩm chính" };
    const pages = type === "news" || type === "project";
    const reason = h("p", { className: "dialog__reason", id: "create-reason" });
    const error = h("p", { className: "dialog__error", role: "alert" });
    const submit = h("button", { type: "submit", className: "is-primary", ariaDescribedBy: "create-reason" }, "Tạo");
    const field = (label, control, hint) => h("label", { className: "field" }, h("span", {}, label), control, hint && h("small", {}, hint));
    const form = h("form", { method: "dialog", className: "dialog__form" },
      h("h2", {}, CREATE_TITLE[type]),
      field("Tên tiếng Việt", name),
      Object.entries(fields).map(([key, control]) => field(labels[key], control)),
      field("Định danh", id, "Tự sinh từ tên, không đổi được sau khi tạo."),
      pages && field("Link tiếng Việt", slug),
      error,
      h("div", { className: "dialog__actions" }, reason, h("button", { type: "button", onclick: () => dialog.close() }, "Hủy"), submit));
    const dialog = h("dialog", { className: "dialog" }, form);
    const check = () => {
      const problem = !name.value.trim() ? "Nhập tên tiếng Việt."
        : !ID.test(id.value) ? "Định danh chỉ gồm chữ thường không dấu, số và gạch ngang, tối đa 80 ký tự."
          : pages && !ID.test(slug.value) ? "Link chỉ gồm chữ thường không dấu, số và gạch ngang, tối đa 80 ký tự." : "";
      reason.textContent = problem;
      submit.disabled = Boolean(problem);
    };
    name.addEventListener("input", () => {
      if (!touched.id) id.value = slugOf(name.value);
      if (!touched.slug) slug.value = slugOf(name.value);
      error.textContent = "";
      check();
    });
    id.addEventListener("input", () => (touched.id = true) && check());
    slug.addEventListener("input", () => (touched.slug = true) && check());
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = true;
      const title = name.value.trim();
      const data = type === "news" ? { id: id.value, group: fields.group.value, slugVi: slug.value, title: { vi: title, en: "" } }
        : type === "project" ? { id: id.value, sector: fields.sector.value, type: fields.type.value, slugVi: slug.value, title: { vi: title, en: "" } }
          : { id: id.value, productIds: [fields.product.value], titleVi: title };
      const result = await call("create", { body: { type, id: id.value, data } });
      if (result.error) {
        error.textContent = result.status === 409 && result.error === "slug" ? "Link này đã có bài khác dùng."
          : result.status === 409 ? "Tên định danh này đã có, đổi tên khác."
            : result.error === "forbidden" ? "Tài khoản không có quyền này." : "Chưa tạo được. Thử lại sau.";
        return check();
      }
      dialog.close();
      const group = GROUPS.find((entry) => entry.types.includes(type));
      view.expanded.add(group.key);
      if (type === "advertising-card") view.products.add(fields.product.value);
      await load(type, { all: true, reset: true });
      open(type, id.value);
    });
    dialog.addEventListener("close", () => dialog.remove());
    document.body.append(dialog);
    check();
    dialog.showModal();
    name.focus();
  }
}
