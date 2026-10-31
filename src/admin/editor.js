// Editor CMS: dashboard Dockview gồm cây trang, xem trước theo cỡ, thuộc tính, media, nháp (cms-editor R1, R2, R4,
// R5, R8). Nháp lưu trong localStorage cùng origin nên bản xem trước (cms-core.js trong iframe) đọc được ngay.
const { createDockview, themeLight } = window.dockview;
const { stamp, draftKey, readDraft, PLACEHOLDER } = window.TTCms;

const PANELS = { pages: "Trang", preview: "Xem trước", props: "Thuộc tính", media: "Media", drafts: "Nháp" };
const VIEWPORTS = [
  { label: "Máy tính", width: 1440, height: 900 },
  { label: "Laptop", width: 1280, height: 800 },
  { label: "Tablet", width: 768, height: 1024 },
  { label: "Điện thoại", width: 390, height: 844 },
  { label: "A04s", width: 384, height: 854 },
];
const LAYOUT_KEY = "tt-cms-layout";
const TAGS = { TITLE: "Tiêu đề trang (SEO)", META: "Mô tả SEO", H1: "Tiêu đề chính", H2: "Tiêu đề", H3: "Tiêu đề nhỏ", P: "Đoạn", A: "Liên kết", BUTTON: "Nút", FIGCAPTION: "Chú thích ảnh" };

const $ = (selector) => document.querySelector(selector);
const h = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.flat().filter((child) => child != null));
  return node;
};
// replaceChildren đổi null thành chữ "null"; luôn lọc trước khi gắn.
const fill = (root, ...nodes) => root.replaceChildren(...nodes.flat().filter((node) => node != null));
const fold = (value) => value.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase();
const clean = (value) => value.replace(/\s+/g, " ").trim();
const short = (value, size = 48) => (value.length > size ? `${value.slice(0, size - 1)}…` : value || "(trống)");
const fileName = (src) => (src || "").split("/").pop();

const state = {
  pages: [], media: [], page: null, base: null, draft: null, history: [], lastGroup: "",
  locale: "vi", viewport: VIEWPORTS[0], edit: true, selected: null, pick: null, overlay: null,
};
const panels = Object.fromEntries(Object.keys(PANELS).map((id) => [id, h("section", { className: `panel panel--${id}` })]));

function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (node.hidden = true), 4000);
}

// ---------- Nháp (R8) ----------

const emptyDraft = (page) => ({ page, updatedAt: null, text: {}, image: {}, list: {}, clone: {} });
const changeCount = (draft) => Object.keys(draft.text).length + Object.keys(draft.image).length + Object.keys(draft.list).length;
const baseKey = (key) => key.split("@")[0];
const isNew = (key) => key.includes("@");

const textValue = (key) => {
  const value = state.draft.text[key] ?? (isNew(key) ? null : state.base?.text[key]);
  return { vi: value?.vi ?? "", en: value?.en ?? "" };
};
const imageValue = (key) => state.draft.image[key]
  ?? (isNew(key) ? { ...state.base.image[baseKey(key)], src: "", altVi: "", altEn: "" } : state.base.image[key]);
const listOrder = (key) => state.draft.list[key] ?? state.base.lists[key].items.map((item) => item.id);
const itemInfo = (listKey, id) => {
  const template = state.draft.clone[id];
  const item = state.base.lists[listKey].items.find((entry) => entry.id === (template ?? id));
  // Nháp cũ có thể giữ id mục mà HTML nguồn đã bỏ (khóa lệch, xem Gate của spec).
  if (!item) return {};
  const suffix = template ? `@${id}` : "";
  return { image: item.image && item.image + suffix, text: item.text && item.text + suffix };
};

function persist() {
  const draft = state.draft;
  draft.updatedAt = new Date().toISOString();
  if (changeCount(draft)) localStorage.setItem(draftKey(draft.page), JSON.stringify(draft));
  else localStorage.removeItem(draftKey(draft.page));
  renderStatus();
  renderDrafts();
}

// Mỗi thao tác lưu một mốc hoàn tác; gõ liên tục cùng một ô (cùng group) gộp thành một mốc.
function commit(mutate, { reload = false, render = true, group = "" } = {}) {
  if (!group || group !== state.lastGroup) state.history.push(JSON.stringify(state.draft));
  state.lastGroup = group;
  mutate(state.draft);
  persist();
  if (reload) reloadPreview();
  if (render) renderProps();
}

function undo() {
  const previous = state.history.pop();
  if (!previous) return toast("Không còn thao tác để hoàn tác.");
  state.draft = JSON.parse(previous);
  state.lastGroup = "";
  persist();
  reloadPreview();
  renderProps();
}

async function save() {
  if (!state.page?.editable) return;
  const response = await fetch(`/api/admin/content/${state.page.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(state.draft),
  }).catch(() => null);
  toast(response?.ok ? "Đã lưu." : "Chưa nối lưu trữ, nháp vẫn ở máy này.");
}

function exportDraft() {
  const blob = new Blob([JSON.stringify(state.draft, null, 2)], { type: "application/json" });
  const link = h("a", { href: URL.createObjectURL(blob), download: `tt-cms-${state.draft.page}.json` });
  link.click();
  URL.revokeObjectURL(link.href);
}

// ---------- Nội dung gốc của trang: đọc bản xem trước tiếng Việt, gắn khóa như trong iframe ----------

async function loadBase(page) {
  const html = await fetch(page.preview.vi).then((response) => response.text());
  const doc = new DOMParser().parseFromString(html, "text/html");
  stamp(doc, page.id);
  const base = { text: {}, image: {}, lists: {} };
  doc.querySelectorAll("[data-cms-key]").forEach((node) => {
    const key = node.dataset.cmsKey;
    if (node.tagName === "IMG") {
      base.image[key] = {
        src: node.getAttribute("data-src") || node.getAttribute("src"),
        width: Number(node.getAttribute("width")) || 0,
        height: Number(node.getAttribute("height")) || 0,
        altVi: node.getAttribute("alt") || "",
        altEn: node.getAttribute("data-en-alt") ?? node.getAttribute("alt") ?? "",
      };
      return;
    }
    const vi = node.tagName === "META" ? node.getAttribute("content") : clean(node.textContent);
    const en = node.getAttribute(node.tagName === "META" ? "data-en-content" : "data-en") ?? vi;
    const section = node.closest("section[id]")?.id;
    // Chữ trong tiêu đề thường nằm trong span con: lấy nhãn theo thẻ chứa gần nhất.
    const tag = node.closest(Object.keys(TAGS).join(", "))?.tagName;
    base.text[key] = { vi, en, label: `${TAGS[tag] ?? "Chữ"}${section ? ` · #${section}` : ""}` };
  });
  doc.querySelectorAll("[data-cms-list]").forEach((box) => {
    base.lists[box.dataset.cmsList] = {
      label: box.dataset.cmsLabel,
      items: [...box.children].filter((child) => child.dataset.cmsItem != null).map((item) => ({
        id: item.dataset.cmsItem,
        image: item.querySelector("img")?.dataset.cmsKey ?? null,
        // Nhãn mục: ưu tiên chữ trong tiêu đề (số thứ tự "01" không giúp nhận ra mục).
        text: (item.querySelector("h2 [data-cms-key], h3 [data-cms-key], h4 [data-cms-key], h2[data-cms-key], h3[data-cms-key], h4[data-cms-key]")
          ?? [...item.querySelectorAll("[data-cms-key]")].find((node) => node.tagName !== "IMG"))?.dataset.cmsKey ?? null,
      })),
    };
  });
  return base;
}

// ---------- Panel Trang ----------

function renderPages() {
  const root = panels.pages;
  const search = h("input", { type: "search", className: "search", placeholder: "Tìm trang, sản phẩm, card" });
  search.setAttribute("aria-label", "Tìm trang");
  const tree = h("div", { className: "tree" });
  const groups = [...new Set(state.pages.map((page) => page.group))];
  const draw = () => {
    const query = fold(search.value.trim());
    fill(tree, groups.map((group) => {
      const pages = state.pages.filter((page) => page.group === group && (!query || fold(`${page.label} ${page.id}`).includes(query)));
      if (!pages.length) return null;
      return h("details", { open: group === groups[0] || Boolean(query) },
        h("summary", {}, `${group} (${pages.length})`),
        pages.slice(0, 300).map((page) => {
          const button = h("button", { type: "button", className: "tree__item", onclick: () => openPage(page) },
            h("span", {}, page.label), h("small", {}, page.editable ? "Sửa" : "Xem"));
          if (state.page?.id === page.id) button.setAttribute("aria-current", "page");
          return button;
        }));
    }));
  };
  search.addEventListener("input", draw);
  root.replaceChildren(search, tree);
  draw();
}

// ---------- Panel Xem trước (R2) ----------

const preview = {};

function buildPreview() {
  const bar = h("div", { className: "preview-bar" });
  preview.sizes = VIEWPORTS.map((viewport) => {
    const button = h("button", { type: "button", className: "chip", title: `${viewport.width} × ${viewport.height}`, onclick: () => setViewport(viewport) },
      `${viewport.label} ${viewport.width}`);
    button.viewport = viewport;
    return button;
  });
  preview.width = h("input", { type: "number", className: "width", min: 320, max: 2560, placeholder: "Rộng" });
  preview.width.setAttribute("aria-label", "Bề rộng tự do, 320 đến 2560");
  preview.width.addEventListener("change", () => {
    const width = Math.min(2560, Math.max(320, Math.round(Number(preview.width.value)) || 1440));
    setViewport({ label: "Tự do", width, height: 0 });
  });
  preview.locale = h("button", { type: "button", className: "chip", onclick: () => setLocale(state.locale === "vi" ? "en" : "vi") });
  preview.mode = h("button", { type: "button", className: "chip", onclick: () => setMode(!state.edit) });
  preview.open = h("a", { className: "chip", target: "_blank", rel: "noopener", textContent: "Mở tab mới" });
  preview.scale = h("span", { className: "scale" });
  bar.append(...preview.sizes, preview.width, h("span", { className: "preview-bar__gap" }), preview.locale, preview.mode,
    h("button", { type: "button", className: "chip", onclick: () => reloadPreview() }, "Tải lại"), preview.open, preview.scale);
  preview.frame = h("iframe", { title: "Xem trước trang" });
  preview.frame.setAttribute("data-cms-preview", "");
  preview.sizer = h("div", { className: "sizer" }, preview.frame);
  preview.stage = h("div", { className: "stage" }, preview.sizer);
  panels.preview.append(bar, preview.stage);
  new ResizeObserver(fit).observe(preview.stage);
  renderPreviewBar();
}

// Đổi cỡ chỉ đổi kích thước iframe, không tải lại; khung lớn hơn panel thì thu nhỏ bằng scale, giữ layout thật.
function fit() {
  const { stage, sizer, frame } = preview;
  const { width, height } = state.viewport;
  if (!stage.clientWidth) return;
  const scale = Math.min(1, stage.clientWidth / width, height ? stage.clientHeight / height : 1);
  const frameHeight = height || stage.clientHeight / scale;
  Object.assign(frame.style, { width: `${width}px`, height: `${frameHeight}px`, transform: `scale(${scale})` });
  Object.assign(sizer.style, { width: `${width * scale}px`, height: `${frameHeight * scale}px` });
  preview.scale.textContent = `${width} × ${Math.round(frameHeight)} · ${Math.round(scale * 100)}%`;
}

function renderPreviewBar() {
  preview.sizes.forEach((button) => button.setAttribute("aria-pressed", String(button.viewport === state.viewport)));
  preview.locale.textContent = state.locale === "vi" ? "Tiếng Việt" : "English";
  preview.locale.title = "Đổi ngôn ngữ xem trước";
  preview.mode.textContent = state.edit ? "Chế độ sửa" : "Chế độ xem";
  preview.mode.title = state.edit ? "Bấm để tương tác như khách (link, kéo gallery)" : "Bấm để chọn và sửa nội dung";
  preview.mode.setAttribute("aria-pressed", String(state.edit));
  if (state.page) preview.open.href = state.page[state.locale];
}

// Đổi bề rộng thì tải lại bản xem trước: runtime site (Locomotive, breakpoint) chỉ dựng đúng lúc tải trang,
// đổi cỡ tại chỗ khi đang cuộn có thể để trang trắng. Chỗ đang chọn được cuộn lại sau khi tải.
function setViewport(viewport) {
  const reload = viewport.width !== state.viewport.width;
  state.viewport = viewport;
  if (viewport.height) preview.width.value = "";
  renderPreviewBar();
  fit();
  if (reload) reloadPreview();
}

function setLocale(locale) {
  state.locale = locale;
  renderPreviewBar();
  loadFrame();
  renderProps();
}

function setMode(edit) {
  state.edit = edit;
  state.overlay?.setMode(edit);
  renderPreviewBar();
}

function loadFrame() {
  if (!state.page) return;
  state.overlay = null;
  preview.frame.src = state.page.editable ? state.page.preview[state.locale] : state.page[state.locale];
}

function reloadPreview() {
  state.overlay = null;
  if (preview.frame.contentWindow?.location.href.startsWith(location.origin)) preview.frame.contentWindow.location.reload();
  else loadFrame();
}

// ---------- Panel Thuộc tính (R3, R4) ----------

const note = (text) => h("p", { className: "note" }, text);
const labelled = (label, control) => h("label", { className: "field" }, h("span", {}, label), control);

function renderProps() {
  const root = panels.props;
  const page = state.page;
  if (!page) return root.replaceChildren(note("Chọn một trang."));
  if (!page.editable) return root.replaceChildren(note("Trang này chỉ xem ở bước này. Sửa card Sản phẩm Quảng cáo có ở bước sau."));
  if (!state.base) return root.replaceChildren(note("Đang tải nội dung trang."));
  const selected = state.selected;
  // title và meta description nằm trong <head>, không bấm được trên trang: mở từ đây.
  const seo = (key) => state.base.text[key]
    && h("button", { type: "button", className: "link", onclick: () => select({ kind: "text", key }) }, state.base.text[key].label);
  if (!selected) return fill(root, note("Bấm một chỗ trên trang để sửa. Nhấn đúp vào chữ để sửa tại chỗ."),
    h("p", { className: "crumb" }, "SEO: ", seo("title"), " · ", seo("description")));
  if (selected.kind === "list") return fill(root, listEditor(selected.list));
  fill(root, selected.kind === "image" ? imageEditor(selected.key) : textEditor(selected.key), breadcrumb(selected));
}

function breadcrumb({ list, item }) {
  if (!list || !state.base.lists[list]) return [];
  const order = listOrder(list);
  return [h("p", { className: "crumb" },
    `Thuộc "${state.base.lists[list].label}" · mục ${order.indexOf(item) + 1}/${order.length} `,
    h("button", { type: "button", className: "link", onclick: () => select({ kind: "list", list, key: null }) }, "Mở danh sách"))];
}

function textEditor(key) {
  const value = textValue(key);
  const missing = h("p", { className: "warn" });
  const check = (next) => {
    missing.textContent = !next.vi.trim() || !next.en.trim() ? "Cần nhập đủ chữ tiếng Việt và tiếng Anh." : "";
  };
  const area = (lang, label) => {
    const control = h("textarea", { rows: 4, value: value[lang] });
    control.addEventListener("input", () => {
      const next = { ...textValue(key), [lang]: control.value };
      commit((draft) => (draft.text[key] = next), { render: false, group: `text:${key}` });
      state.overlay?.setText(key, next);
      check(next);
    });
    return labelled(label, control);
  };
  check(value);
  return [
    h("h2", {}, state.base.text[baseKey(key)]?.label ?? "Chữ"),
    area("vi", "Tiếng Việt"),
    area("en", "English"),
    missing,
    restoreButton(state.draft.text[key], () => {
      commit((draft) => delete draft.text[key]);
      state.overlay?.setText(key, textValue(key));
    }),
  ];
}

function imageEditor(key) {
  const value = imageValue(key);
  const alt = (field, label) => {
    const control = h("input", { type: "text", value: value[field] || "" });
    control.addEventListener("input", () => commit(
      (draft) => (draft.image[key] = { ...imageValue(key), [field]: control.value }),
      { render: false, group: `alt:${key}:${field}` },
    ));
    return labelled(label, control);
  };
  return [
    h("h2", {}, "Ảnh"),
    h("img", { className: "thumb", src: value.src || PLACEHOLDER, alt: "" }),
    h("p", { className: "meta" }, value.src ? `${fileName(value.src)} · ${value.width} × ${value.height}` : "Chưa chọn ảnh"),
    h("button", { type: "button", className: "is-primary", onclick: () => startPick(key) }, "Đổi ảnh"),
    alt("altVi", "Alt tiếng Việt"),
    alt("altEn", "Alt English"),
    !value.altVi || !value.altEn ? h("p", { className: "warn" }, "Ảnh cần alt mô tả bằng cả hai ngôn ngữ.") : null,
    restoreButton(state.draft.image[key], () => commit((draft) => delete draft.image[key], { reload: true })),
  ];
}

const restoreButton = (changed, onclick) => (changed && !isNew(state.selected?.key ?? "")
  ? h("button", { type: "button", className: "link", onclick }, "Khôi phục bản gốc")
  : null);

function listEditor(listKey) {
  const order = listOrder(listKey);
  const move = (from, to) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setOrder(listKey, next);
  };
  const rows = order.map((id, index) => {
    const item = itemInfo(listKey, id);
    const label = item.text ? textValue(item.text).vi : "";
    const row = h("li", { className: "list-row", draggable: true },
      h("span", { className: "handle", title: "Kéo để sắp xếp", textContent: "⋮⋮" }),
      item.image ? h("img", { src: imageValue(item.image).src || PLACEHOLDER, alt: "", loading: "lazy" }) : null,
      h("button", { type: "button", className: "list-row__label", onclick: () => select({
        kind: item.image ? "image" : "text", key: item.image ?? item.text, list: listKey, item: id }) },
      short(label || fileName(item.image && imageValue(item.image).src) || `Mục ${index + 1}`)),
      h("button", { type: "button", className: "icon", title: "Lên", onclick: () => move(index, index - 1) }, "↑"),
      h("button", { type: "button", className: "icon", title: "Xuống", onclick: () => move(index, index + 1) }, "↓"),
      h("button", { type: "button", className: "icon", title: "Xóa mục", onclick: () => removeItem(listKey, id) }, "×"));
    row.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", String(index)));
    row.addEventListener("dragover", (event) => event.preventDefault());
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      move(Number(event.dataTransfer.getData("text/plain")), index);
    });
    return row;
  });
  return [
    h("h2", {}, state.base.lists[listKey].label),
    h("p", { className: "meta" }, `${order.length} mục. Kéo hoặc dùng mũi tên để sắp xếp.`),
    h("ol", { className: "list" }, rows),
    h("button", { type: "button", className: "is-primary", onclick: () => addItem(listKey) }, "Thêm mục"),
  ];
}

function setOrder(listKey, order) {
  const base = state.base.lists[listKey].items.map((item) => item.id);
  commit((draft) => {
    if (order.join() === base.join()) delete draft.list[listKey];
    else draft.list[listKey] = order;
  }, { reload: true });
}

function addItem(listKey) {
  const order = listOrder(listKey);
  const last = order.at(-1);
  const id = `n${Date.now().toString(36)}`;
  commit((draft) => {
    draft.list[listKey] = [...order, id];
    // Danh sách đã xóa hết thì lấy mục gốc đầu tiên làm mẫu.
    draft.clone[id] = draft.clone[last] ?? last ?? state.base.lists[listKey].items[0].id;
  }, { reload: true, render: false });
  const item = itemInfo(listKey, id);
  if (item.image) startPick(item.image, { kind: "image", key: item.image, list: listKey, item: id });
  else select({ kind: "text", key: item.text, list: listKey, item: id });
}

function removeItem(listKey, id) {
  commit((draft) => {
    draft.list[listKey] = listOrder(listKey).filter((entry) => entry !== id);
    if (!draft.clone[id]) return;
    delete draft.clone[id];
    [draft.text, draft.image].forEach((map) => Object.keys(map).filter((key) => key.endsWith(`@${id}`)).forEach((key) => delete map[key]));
  }, { reload: true });
}

function select(selection) {
  state.selected = selection;
  state.pick = null;
  if (selection?.key) state.overlay?.select(selection.key);
  renderProps();
  renderPickBanner();
}

// ---------- Panel Media (R5, R6) ----------

const media = {};

function buildMedia() {
  media.banner = h("div", { className: "pick", hidden: true });
  media.search = h("input", { type: "search", className: "search", placeholder: "Tìm theo tên file hoặc alt" });
  media.search.setAttribute("aria-label", "Tìm media");
  media.folder = h("select", {}, h("option", { value: "" }, "Mọi thư mục"),
    [...new Set(state.media.map((item) => item.folder))].sort().map((folder) => h("option", { value: folder }, folder)));
  media.folder.setAttribute("aria-label", "Lọc theo thư mục");
  media.count = h("p", { className: "meta" });
  media.grid = h("div", { className: "media-grid" });
  const draw = () => {
    const query = fold(media.search.value.trim());
    const items = state.media.filter((item) => (!media.folder.value || item.folder === media.folder.value)
      && (!query || fold(`${item.src} ${item.altVi} ${item.altEn}`).includes(query)));
    media.count.textContent = `${items.length} / ${state.media.length} media`;
    media.grid.replaceChildren(...items.map((item) => h("button", {
      type: "button", className: "media-tile", title: `${item.src}\n${item.width} × ${item.height}${item.altVi ? `\n${item.altVi}` : ""}`,
      onclick: () => (state.pick ? replaceImage(item) : toast(`${item.src} · ${item.width} × ${item.height}`)),
    }, h("img", { src: item.thumb, alt: "", loading: "lazy" }), h("span", {}, fileName(item.src)))));
  };
  media.search.addEventListener("input", draw);
  media.folder.addEventListener("change", draw);
  panels.media.append(media.banner, h("div", { className: "media-filters" }, media.search, media.folder), media.count, media.grid);
  draw();
}

function renderPickBanner() {
  if (!media.banner) return;
  media.banner.hidden = !state.pick;
  media.banner.replaceChildren(h("span", {}, "Bấm một ảnh bên dưới để đặt vào chỗ đang chọn."),
    h("button", { type: "button", className: "link", onclick: () => select(state.selected) }, "Hủy"));
}

function startPick(key, selection = state.selected) {
  state.selected = selection;
  state.pick = { key };
  focusPanel("media");
  renderProps();
  renderPickBanner();
}

function replaceImage(item) {
  const { key } = state.pick;
  commit((draft) => (draft.image[key] = { src: item.src, width: item.width, height: item.height, altVi: item.altVi || "", altEn: item.altEn || "" }), { reload: true });
  state.pick = null;
  renderPickBanner();
  focusPanel("props");
}

// ---------- Panel Nháp (R8) ----------

function renderDrafts() {
  const root = panels.drafts;
  if (!state.page?.editable) return root.replaceChildren(note("Trang này không có nháp."));
  const draft = state.draft;
  const entry = (label, drop) => h("li", {}, h("span", {}, label), h("button", { type: "button", className: "link", onclick: drop }, "Bỏ"));
  const rows = [
    ...Object.entries(draft.text).map(([key, value]) => entry(`Chữ: ${short(value.vi)}`, () => {
      commit((next) => delete next.text[key]);
      state.overlay?.setText(key, textValue(key));
    })),
    ...Object.entries(draft.image).map(([key, value]) => entry(`Ảnh: ${fileName(value.src) || "(trống)"}`, () => commit((next) => delete next.image[key], { reload: true }))),
    ...Object.entries(draft.list).map(([key, order]) => entry(`Danh sách ${state.base?.lists[key]?.label ?? key}: ${order.length} mục`, () => commit((next) => {
      next.list[key].filter((id) => next.clone[id]).forEach((id) => {
        delete next.clone[id];
        [next.text, next.image].forEach((map) => Object.keys(map).filter((k) => k.endsWith(`@${id}`)).forEach((k) => delete map[k]));
      });
      delete next.list[key];
    }, { reload: true }))),
  ];
  const others = state.pages.filter((page) => page.editable && page.id !== draft.page && localStorage.getItem(draftKey(page.id)));
  fill(root,
    h("h2", {}, `Nháp: ${state.page.label}`),
    rows.length ? h("ul", { className: "drafts" }, rows) : note("Chưa có thay đổi."),
    rows.length ? h("button", { type: "button", className: "link danger", onclick: () => {
      if (confirm("Bỏ toàn bộ nháp của trang này?")) commit((next) => Object.assign(next, emptyDraft(next.page)), { reload: true });
    } }, "Bỏ toàn bộ nháp trang này") : null,
    others.length ? h("p", { className: "meta" }, "Trang khác có nháp: ", others.map((page) => h("button", { type: "button", className: "link", onclick: () => openPage(page) }, page.label))) : null,
  );
}

function renderStatus() {
  const count = state.draft && changeCount(state.draft);
  $("#draft-status").textContent = !state.page?.editable ? "Chỉ xem" : count ? `Chưa lưu · ${count} thay đổi` : "Không có thay đổi";
  $("#draft-status").classList.toggle("is-dirty", Boolean(count));
}

// ---------- Mở trang ----------

async function openPage(page) {
  state.page = page;
  state.selected = null;
  state.pick = null;
  state.history = [];
  state.lastGroup = "";
  state.base = null;
  state.draft = Object.assign(emptyDraft(page.id), page.editable ? readDraft(page.id) : null);
  localStorage.setItem("tt-cms-page", page.id);
  $("#page-label").textContent = `${page.group} · ${page.label}`;
  renderPreviewBar();
  loadFrame();
  renderPages();
  renderStatus();
  renderDrafts();
  renderProps();
  renderPickBanner();
  if (!page.editable) return;
  const base = await loadBase(page);
  if (state.page !== page) return;
  state.base = base;
  renderProps();
  renderDrafts();
}

// API cho overlay trong iframe (cùng origin).
window.TTEditor = {
  onSelect: (selection) => {
    if (state.pick) state.pick = null;
    select(selection);
  },
  onInlineInput(key, value) {
    const next = { ...textValue(key), [state.locale]: clean(value) };
    commit((draft) => (draft.text[key] = next), { render: false, group: `text:${key}` });
    if (state.selected?.key === key) renderProps();
  },
  onPreviewReady(win) {
    state.overlay = win.TTCmsOverlay ?? null;
    state.overlay?.setMode(state.edit);
    if (state.selected?.key) state.overlay?.select(state.selected.key);
  },
};

// ---------- Dock (R1) ----------

const dock = createDockview($("#dock"), {
  theme: themeLight,
  createComponent: ({ name }) => ({ element: panels[name], init() {} }),
});

function addPanel(id, position, size) {
  return dock.addPanel({ id, component: id, title: PANELS[id], position, ...size });
}

function defaultLayout() {
  dock.clear();
  addPanel("preview");
  addPanel("pages", { referencePanel: "preview", direction: "left" }, { initialWidth: 260 });
  addPanel("props", { referencePanel: "preview", direction: "right" }, { initialWidth: 360 });
  addPanel("media", { referencePanel: "props", direction: "below" });
  addPanel("drafts", { referencePanel: "media", direction: "within" });
  dock.getPanel("props").api.setActive();
}

function focusPanel(id) {
  const panel = dock.getPanel(id) ?? addPanel(id, { referencePanel: "preview", direction: "right" });
  panel.api.setActive();
}

const [pages, mediaIndex] = await Promise.all(["./pages.json", "./media-index.json"].map((url) => fetch(url).then((r) => r.json())));
state.pages = pages;
state.media = mediaIndex;
buildPreview();
buildMedia();

try {
  dock.fromJSON(JSON.parse(localStorage.getItem(LAYOUT_KEY)));
  if (!dock.getPanel("preview")) throw new Error("layout without preview");
} catch {
  defaultLayout();
}
dock.onDidLayoutChange(() => localStorage.setItem(LAYOUT_KEY, JSON.stringify(dock.toJSON())));

$("#panel-menu").append(
  ...Object.entries(PANELS).map(([id, title]) => h("button", { type: "button", onclick: () => focusPanel(id) }, title)),
  h("button", { type: "button", onclick: defaultLayout }, "Bố cục mặc định"),
);
$("#undo").addEventListener("click", undo);
$("#save").addEventListener("click", save);
$("#export").addEventListener("click", exportDraft);

const start = state.pages.find((page) => page.id === localStorage.getItem("tt-cms-page")) ?? state.pages[0];
openPage(start);
