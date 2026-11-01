// Editor CMS: dashboard Dockview gồm cây trang, xem trước theo cỡ, thuộc tính, media, nháp (cms-editor R1, R2, R4 đến
// R8). Nháp lưu trong localStorage cùng origin nên bản xem trước (cms-core.js trong iframe) đọc được ngay.
const { createDockview, themeLight } = window.dockview;
const { stamp, draftKey, savedKey, readDraft, PLACEHOLDER } = window.TTCms;

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
// Nháp có thể lưu: bốn trang sửa chữ, ảnh, danh sách và một nháp chung cho card Sản phẩm Quảng cáo (R7).
const DRAFT_IDS = ["home", "residential", "commercial", "about", "advertising"];
const MEDIA_TYPE = "application/x-tt-media";

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
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const time = (iso) => (iso ? new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "");
const cardSelection = (card) => ({ kind: "card", card, key: `card:${card}` });

const state = {
  pages: [], media: [], page: null, base: null, draft: null, history: [], lastGroup: "",
  locale: "vi", viewport: VIEWPORTS[0], edit: true, selected: null, pick: null, overlay: null,
  saved: {}, bases: {}, catalog: null, cat: null, conflict: false,
};
const panels = Object.fromEntries(Object.keys(PANELS).map((id) => [id, h("section", { className: `panel panel--${id}` })]));

function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (node.hidden = true), 4000);
}

// ---------- Nháp và bản đã lưu (R8) ----------

const MAPS = ["text", "image", "list", "cards"];
const emptyDraft = (page) => ({ page, base: null, updatedAt: null, text: {}, image: {}, list: {}, clone: {}, cards: {} });
const draftIdOf = (page) => (page?.cards ? "advertising" : page?.editable ? page.id : null);
const editsOf = (draft) => (draft.page === "advertising" ? { cards: draft.cards }
  : { text: draft.text, image: draft.image, list: draft.list, clone: draft.clone });
const savedEdits = (id) => state.saved[id]?.edits ?? {};
// Bản đang sửa: nháp trên máy nếu có, không thì bản đã lưu (base là phiên bản D1 nó dựa vào, dùng cho 409).
const working = (id) => Object.assign(emptyDraft(id),
  readDraft(id) ?? { ...structuredClone(savedEdits(id)), base: state.saved[id]?.updatedAt ?? null });
const baseKey = (key) => key.split("@")[0];
const isNew = (key) => key.includes("@");

// Thay đổi chưa lưu: mục khác bản đã lưu (hoặc khác bản gốc khi trang chưa lưu lần nào).
function pending(draft) {
  const saved = savedEdits(draft.page);
  return MAPS.flatMap((map) => [...new Set([...Object.keys(draft[map]), ...Object.keys(saved[map] ?? {})])]
    .filter((key) => !same(draft[map][key], saved[map]?.[key]))
    .map((key) => ({ map, key })));
}

// Mục mới không còn trong danh sách nào thì bỏ cả mẫu clone lẫn chữ, ảnh @id của nó.
function prune(draft) {
  const listed = new Set(Object.values(draft.list).flat());
  Object.keys(draft.clone).forEach((id) => listed.has(id) || delete draft.clone[id]);
  [draft.text, draft.image].forEach((map) => Object.keys(map).forEach((key) => {
    const id = key.split("@")[1];
    if (id && !draft.clone[id]) delete map[key];
  }));
}

function store(draft) {
  draft.updatedAt = new Date().toISOString();
  prune(draft);
  if (pending(draft).length) localStorage.setItem(draftKey(draft.page), JSON.stringify(draft));
  else localStorage.removeItem(draftKey(draft.page));
}

function persist() {
  store(state.draft);
  renderStatus();
  renderDrafts();
}

// Mỗi thao tác lưu một mốc hoàn tác; gõ liên tục cùng một ô (cùng group) gộp thành một mốc.
function commit(mutate, { reload = false, render = true, group = "" } = {}) {
  if (!group || group !== state.lastGroup) state.history.push(JSON.stringify(state.draft));
  state.lastGroup = group;
  mutate(state.draft);
  persist();
  if (reload) {
    loadFrame();
    refreshMedia();
  }
  if (render) renderProps();
}

// Sửa nháp của trang khác (ghi alt cho mọi nơi dùng một media, R6): trang đang mở thì qua commit để hoàn tác được.
function withDraft(id, mutate) {
  if (state.draft?.page === id) return commit(mutate, { reload: true });
  const draft = working(id);
  mutate(draft);
  store(draft);
}

function undo() {
  const previous = state.history.pop();
  if (!previous) return toast("Không còn thao tác để hoàn tác.");
  state.draft = JSON.parse(previous);
  state.lastGroup = "";
  persist();
  loadFrame();
  refreshMedia();
  renderProps();
}

async function loadSaved(id) {
  const response = await fetch(`/api/admin/content/${id}`).catch(() => null);
  const body = response?.ok ? await response.json().catch(() => null) : null;
  state.saved[id] = body;
  // Cache cho bản xem trước: không có nháp thì iframe áp bản đã lưu (cms-core.js).
  if (body?.edits) localStorage.setItem(savedKey(id), JSON.stringify(body.edits));
  else localStorage.removeItem(savedKey(id));
}

// Ô trống (viền đỏ) không được lưu: lưu là lên web.
function emptyCount() {
  const draft = state.draft;
  if (draft.page === "advertising") {
    return Object.values(draft.cards).filter((card) => !card.mediaItems.length || !card.productIds.length
      || ![card.titleVi, card.titleEn, card.descriptionVi, card.descriptionEn].every((value) => value.trim())).length;
  }
  const fresh = Object.entries(draft.list).flatMap(([listKey, order]) => order.filter((id) => draft.clone[id]).flatMap((id) => {
    const template = state.base?.lists[listKey]?.items.find((item) => item.id === draft.clone[id]);
    return (template?.keys ?? []).map((key) => `${key}@${id}`).filter((key) => !(key in draft.text) && !(key in draft.image));
  }));
  return fresh.length + Object.values(draft.text).filter((value) => !value.vi.trim() || !value.en.trim()).length
    + Object.values(draft.image).filter((value) => !value.src).length;
}

async function save() {
  if (!draftIdOf(state.page)) return;
  if (!pending(state.draft).length) return toast("Không có thay đổi để lưu.");
  const empty = emptyCount();
  if (empty) return toast(`Còn ${empty} ô trống (viền đỏ): nhập đủ chữ hai ngôn ngữ, chọn ảnh rồi mới lưu.`);
  await put(state.draft.base ?? null);
}

async function put(baseUpdatedAt) {
  const draft = state.draft;
  const edits = editsOf(draft);
  const response = await fetch(`/api/admin/content/${draft.page}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ edits, baseUpdatedAt }),
  }).catch(() => null);
  const result = (await response?.json().catch(() => null)) ?? {};
  if (response?.ok) {
    state.saved[draft.page] = { edits, updatedAt: result.updatedAt, updatedBy: result.updatedBy, stale: [] };
    localStorage.setItem(savedKey(draft.page), JSON.stringify(edits));
    draft.base = result.updatedAt;
    state.conflict = false;
    persist();
    return toast("Đã lưu, trang trên web đã đổi theo.");
  }
  // Người khác vừa lưu cùng trang: hỏi trước khi ghi đè, không ghi đè ngầm.
  if (response?.status === 409) {
    const who = `${result.updatedBy ?? "người khác"} lúc ${time(result.updatedAt)}`;
    if (confirm(`Trang này vừa được ${who} lưu. Ghi đè bằng bản của bạn?`)) return put(result.updatedAt);
    return toast("Chưa lưu. Xuất JSON để giữ bản của bạn, rồi Bỏ toàn bộ nháp để xem bản đã lưu.");
  }
  // 501 (Worker chưa có D1) và 404 (preview tĩnh) là chưa có lưu trữ; lỗi khác hiện mã để không che lỗi thật.
  toast([501, 404].includes(response?.status) ? "Chưa nối lưu trữ, nháp vẫn ở máy này."
    : response?.status === 400 ? `Lưu chưa được: ${result.error ?? "dữ liệu không hợp lệ"}`
      : `Lưu chưa được (${response ? `mã ${response.status}` : "mất kết nối"}), nháp vẫn ở máy này.`);
}

function exportDraft() {
  if (!state.draft) return;
  const blob = new Blob([JSON.stringify(state.draft, null, 2)], { type: "application/json" });
  const link = h("a", { href: URL.createObjectURL(blob), download: `tt-cms-${state.draft.page}.json` });
  link.click();
  // Firefox, Safari có thể hủy tải nếu thu hồi URL ngay trong cùng lượt.
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

// ---------- Nội dung gốc của trang: đọc bản xem trước tiếng Việt, gắn khóa như trong iframe ----------

async function loadBase(page) {
  const html = await fetch(page.preview.vi).then((response) => response.text());
  const doc = new DOMParser().parseFromString(html, "text/html");
  stamp(doc, page.id);
  const base = { text: {}, image: {}, meta: {}, lists: {} };
  doc.querySelectorAll("[data-cms-key]").forEach((node) => {
    const key = node.dataset.cmsKey;
    const section = node.closest("section[id]")?.id;
    const where = section ? ` · #${section}` : "";
    const list = node.closest("[data-cms-list]");
    base.meta[key] = { list: list?.dataset.cmsList ?? null, item: node.closest("[data-cms-item]")?.dataset.cmsItem ?? null };
    if (node.tagName === "IMG") {
      base.image[key] = {
        src: node.getAttribute("data-src") || node.getAttribute("src"),
        width: Number(node.getAttribute("width")) || 0,
        height: Number(node.getAttribute("height")) || 0,
        altVi: node.getAttribute("alt") || "",
        altEn: node.getAttribute("data-en-alt") ?? node.getAttribute("alt") ?? "",
      };
      base.meta[key].label = `${list ? list.dataset.cmsLabel : "Ảnh"}${where}`;
      return;
    }
    const vi = node.tagName === "META" ? node.getAttribute("content") : clean(node.textContent);
    const en = node.getAttribute(node.tagName === "META" ? "data-en-content" : "data-en") ?? vi;
    // Chữ trong tiêu đề thường nằm trong span con: lấy nhãn theo thẻ chứa gần nhất.
    const tag = node.closest(Object.keys(TAGS).join(", "))?.tagName;
    base.text[key] = { vi, en, label: `${TAGS[tag] ?? "Chữ"}${where}` };
  });
  doc.querySelectorAll("[data-cms-list]").forEach((box) => {
    base.lists[box.dataset.cmsList] = {
      label: box.dataset.cmsLabel,
      shuffled: box.hasAttribute("data-cms-shuffled"),
      items: [...box.children].filter((child) => child.dataset.cmsItem != null).map((item) => ({
        id: item.dataset.cmsItem,
        keys: [...item.querySelectorAll("[data-cms-key]")].map((node) => node.dataset.cmsKey),
        image: item.querySelector("img")?.dataset.cmsKey ?? null,
        // Nhãn mục: ưu tiên chữ trong tiêu đề (số thứ tự "01" không giúp nhận ra mục).
        text: (item.querySelector("h2 [data-cms-key], h3 [data-cms-key], h4 [data-cms-key], h2[data-cms-key], h3[data-cms-key], h4[data-cms-key]")
          ?? [...item.querySelectorAll("[data-cms-key]")].find((node) => node.tagName !== "IMG"))?.dataset.cmsKey ?? null,
      })),
    };
  });
  return base;
}

const baseOf = (page) => (state.bases[page.id] ??= loadBase(page));

// Catalog Sản phẩm Quảng cáo gốc (R7): artifact lưới cộng mô tả, giống runtime trước khi vá.
function catalogData() {
  state.catalog ??= Promise.all(["catalog-artifact", "catalog-detail"].map((name) => import(`/advertising-products/${name}.mjs`)))
    .then(([{ default: artifact }, { default: detail }]) => (state.cat = {
      artifact,
      cards: new Map(artifact.cards.map((card) => [card.id, { ...card, ...detail[card.id] }])),
      productById: new Map(artifact.products.map((product) => [product.id, product])),
      clusterById: new Map(artifact.clusters.map((cluster) => [cluster.id, cluster])),
    }));
  return state.catalog;
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
            h("span", {}, page.label), h("small", {}, page.editable ? "Sửa" : page.cards ? "Card" : "Xem"));
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
    h("button", { type: "button", className: "chip", onclick: () => loadFrame() }, "Tải lại"), preview.open, preview.scale);
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
  if (reload) loadFrame();
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

// Tải hoặc tải lại luôn bằng cách đặt src về bản xem trước của trang đang mở, không dùng location.reload().
function loadFrame() {
  if (!state.page) return;
  state.overlay = null;
  preview.frame.src = state.page.preview?.[state.locale] ?? state.page[state.locale];
}

// ---------- Panel Thuộc tính (R3, R4, R7) ----------

const note = (text) => h("p", { className: "note" }, text);
const labelled = (label, control) => h("label", { className: "field" }, h("span", {}, label), control);

const textValue = (key) => {
  const value = state.draft.text[key] ?? (isNew(key) ? null : state.base?.text[key]);
  return { vi: value?.vi ?? "", en: value?.en ?? "" };
};
const imageOf = (base, draft, key) => draft.image[key]
  ?? (isNew(key) ? { ...base.image[baseKey(key)], src: "", altVi: "", altEn: "" } : base.image[key]);
const imageValue = (key) => imageOf(state.base, state.draft, key);
const listOrder = (key) => state.draft.list[key] ?? state.base.lists[key].items.map((item) => item.id);
const itemInfo = (listKey, id) => {
  const template = state.draft.clone[id];
  const item = state.base.lists[listKey].items.find((entry) => entry.id === (template ?? id));
  // Nháp cũ có thể giữ id mục mà HTML nguồn đã bỏ (khóa lệch, xem Gate của spec).
  if (!item) return {};
  const suffix = template ? `@${id}` : "";
  return { image: item.image && item.image + suffix, text: item.text && item.text + suffix };
};

function renderProps() {
  const root = panels.props;
  const page = state.page;
  if (!page) return root.replaceChildren(note("Chọn một trang."));
  if (page.cards) return renderCardProps();
  if (!page.editable) return root.replaceChildren(note("Trang này chỉ xem."));
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
    h("button", { type: "button", className: "is-primary", onclick: () => startPick({ key }) }, "Đổi ảnh"),
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
  const { label: title, shuffled } = state.base.lists[listKey];
  const move = (from, to) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setOrder(listKey, next);
  };
  const rows = order.map((id, index) => {
    const item = itemInfo(listKey, id);
    const label = item.text ? textValue(item.text).vi : "";
    const row = h("li", { className: `list-row${shuffled ? " list-row--fixed" : ""}`, draggable: !shuffled },
      shuffled ? null : h("span", { className: "handle", title: "Kéo để sắp xếp", textContent: "⋮⋮" }),
      item.image ? h("img", { src: imageValue(item.image).src || PLACEHOLDER, alt: "", loading: "lazy" }) : null,
      h("button", { type: "button", className: "list-row__label", onclick: () => select({
        kind: item.image ? "image" : "text", key: item.image ?? item.text, list: listKey, item: id }) },
      short(label || fileName(item.image && imageValue(item.image).src) || `Mục ${index + 1}`)),
      shuffled ? null : h("button", { type: "button", className: "icon", title: "Lên", onclick: () => move(index, index - 1) }, "↑"),
      shuffled ? null : h("button", { type: "button", className: "icon", title: "Xuống", onclick: () => move(index, index + 1) }, "↓"),
      h("button", { type: "button", className: "icon", title: "Xóa mục", onclick: () => removeItem(listKey, id) }, "×"));
    if (shuffled) return row;
    row.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", String(index)));
    row.addEventListener("dragover", (event) => event.preventDefault());
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      move(Number(event.dataTransfer.getData("text/plain")), index);
    });
    return row;
  });
  return [
    h("h2", {}, title),
    h("p", { className: "meta" }, shuffled
      ? `${order.length} mục. Site xáo thứ tự mỗi lần tải trang nên chỉ thêm hoặc xóa.`
      : `${order.length} mục. Kéo hoặc dùng mũi tên để sắp xếp.`),
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

// Thêm mục clone mục cuối; có media (thả từ panel Media) thì đặt luôn ảnh trong cùng một mốc hoàn tác.
function addItem(listKey, media = null) {
  const order = listOrder(listKey);
  const last = order.at(-1);
  const id = `n${Date.now().toString(36)}`;
  // Danh sách đã xóa hết thì lấy mục gốc đầu tiên làm mẫu.
  const template = state.draft.clone[last] ?? last ?? state.base.lists[listKey].items[0].id;
  const image = state.base.lists[listKey].items.find((item) => item.id === template)?.image;
  commit((draft) => {
    draft.list[listKey] = [...order, id];
    draft.clone[id] = template;
    if (media && image) draft.image[`${image}@${id}`] = mediaImage(media);
  }, { reload: true, render: false });
  const item = itemInfo(listKey, id);
  if (item.image && !media) return startPick({ key: item.image }, { kind: "image", key: item.image, list: listKey, item: id });
  if (media && !image) toast("Danh sách này không có ảnh: đã thêm mục, nhập chữ ở Thuộc tính.");
  select({ kind: item.text && (!item.image || !media) ? "text" : "image", key: media && item.image ? item.image : item.text, list: listKey, item: id });
}

function removeItem(listKey, id) {
  commit((draft) => {
    draft.list[listKey] = listOrder(listKey).filter((entry) => entry !== id);
    // Mục gốc bị xóa: bỏ sửa đổi bên trong nó (mục mới do prune lo); hoàn tác vẫn trả lại.
    const own = draft.clone[id] ? [] : state.base.lists[listKey].items.find((entry) => entry.id === id)?.keys ?? [];
    own.forEach((key) => {
      delete draft.text[key];
      delete draft.image[key];
    });
  }, { reload: true });
}

function select(selection) {
  state.selected = selection;
  state.pick = null;
  if (selection?.key) state.overlay?.select(selection.key);
  renderProps();
  renderPickBanner();
}

// ---------- Card Sản phẩm Quảng cáo (R7) ----------

const mediaImage = (item) => ({ src: item.src, width: item.width, height: item.height, altVi: item.altVi || "", altEn: item.altEn || "" });
const cardBase = (id) => {
  const card = state.cat.cards.get(id);
  return {
    titleVi: card.titleVi, titleEn: card.titleEn, descriptionVi: card.descriptionVi, descriptionEn: card.descriptionEn,
    productIds: [...(card.productIds ?? [])],
    mediaItems: card.mediaItems.map(({ id: mediaId, kind, src, width, height, altVi, altEn }) => ({ id: mediaId, kind, src, width, height, altVi, altEn })),
    coverMediaId: card.coverMediaId,
  };
};
const cardOf = (draft, id) => draft.cards[id] ?? cardBase(id);
const cardValue = (id) => cardOf(state.draft, id);
// Giống bản gốc thì bỏ khỏi nháp; ảnh bìa luôn là một media còn trong card.
function setCard(draft, id, value) {
  if (!value.mediaItems.some((item) => item.id === value.coverMediaId)) value.coverMediaId = value.mediaItems[0]?.id ?? null;
  if (same(value, cardBase(id))) delete draft.cards[id];
  else draft.cards[id] = value;
}

async function renderCardProps() {
  const root = panels.props;
  const id = state.selected?.card;
  if (!id) return fill(root, note("Bấm một card trên lưới, gợi ý hoặc ảnh chính của trang chi tiết để sửa tên, mô tả, sản phẩm, media."));
  await catalogData();
  if (state.selected?.card !== id) return;
  if (!state.cat.cards.has(id)) return fill(root, note(`Không có card ${id} trong catalog.`));
  fill(root, cardEditor(id));
}

function cardEditor(id) {
  const value = cardValue(id);
  const { productById, clusterById, artifact } = state.cat;
  const update = (patch, options = { reload: true }) => commit((draft) => setCard(draft, id, { ...cardValue(id), ...patch }), options);
  const field = (name, label, rows) => {
    const control = rows ? h("textarea", { rows, value: value[name] }) : h("input", { type: "text", value: value[name] });
    control.addEventListener("input", () => update({ [name]: control.value }, { render: false, group: `card:${id}:${name}` }));
    // Runtime dựng card lúc tải: gõ xong (rời ô) mới tải lại xem trước.
    control.addEventListener("change", () => loadFrame());
    return labelled(label, control);
  };
  const products = value.productIds.map((productId, index) => h("li", { className: "list-row list-row--chip" },
    h("span", { className: "list-row__label" }, `${index ? "" : "Chính · "}${productById.get(productId)?.labelVi ?? productId}`),
    index ? h("button", { type: "button", className: "icon", title: "Đặt làm sản phẩm chính (đổi cụm theo sản phẩm này)",
      onclick: () => update({ productIds: [productId, ...value.productIds.filter((other) => other !== productId)] }) }, "↑") : h("span"),
    h("button", { type: "button", className: "icon", title: "Bỏ sản phẩm", disabled: value.productIds.length < 2,
      onclick: () => update({ productIds: value.productIds.filter((other) => other !== productId) }) }, "×")));
  const add = h("select", {}, h("option", { value: "" }, "Thêm sản phẩm"), artifact.clusters.map((cluster) => h("optgroup", { label: cluster.labelVi },
    artifact.products.filter((product) => product.cluster === cluster.id && !value.productIds.includes(product.id))
      .map((product) => h("option", { value: product.id }, product.labelVi)))));
  add.setAttribute("aria-label", "Thêm sản phẩm cho card");
  add.addEventListener("change", () => add.value && update({ productIds: [...value.productIds, add.value] }));
  const moveMedia = (from, to) => {
    if (to < 0 || to >= value.mediaItems.length) return;
    const items = [...value.mediaItems];
    items.splice(to, 0, items.splice(from, 1)[0]);
    update({ mediaItems: items });
  };
  const media = value.mediaItems.map((item, index) => {
    const alt = (field, label) => {
      const control = h("input", { type: "text", value: item[field] ?? "", placeholder: label });
      control.setAttribute("aria-label", `${label} của ${fileName(item.src)}`);
      control.addEventListener("input", () => update({ mediaItems: cardValue(id).mediaItems.map((entry) => (entry.id === item.id ? { ...entry, [field]: control.value } : entry)) },
        { render: false, group: `card:${id}:${item.id}:${field}` }));
      control.addEventListener("change", () => loadFrame());
      return control;
    };
    const cover = h("input", { type: "radio", name: `cover-${id}`, checked: item.id === value.coverMediaId, onchange: () => update({ coverMediaId: item.id }) });
    return h("li", { className: "media-row" },
      h("img", { src: thumbOf(item.src), alt: "", loading: "lazy" }),
      h("div", { className: "media-row__fields" }, alt("altVi", "Alt tiếng Việt"), alt("altEn", "Alt English"),
        h("label", { className: "media-row__cover" }, cover, " Ảnh bìa")),
      h("div", { className: "media-row__actions" },
        h("button", { type: "button", className: "icon", title: "Lên", onclick: () => moveMedia(index, index - 1) }, "↑"),
        h("button", { type: "button", className: "icon", title: "Xuống", onclick: () => moveMedia(index, index + 1) }, "↓"),
        h("button", { type: "button", className: "icon", title: "Xóa media", disabled: value.mediaItems.length < 2,
          onclick: () => update({ mediaItems: value.mediaItems.filter((entry) => entry.id !== item.id) }) }, "×")));
  });
  const cluster = clusterById.get(productById.get(value.productIds[0])?.cluster);
  const missing = ![value.titleVi, value.titleEn, value.descriptionVi, value.descriptionEn].every((text) => text.trim());
  return [
    h("h2", {}, `Card · ${id}`),
    field("titleVi", "Tên tiếng Việt"),
    field("titleEn", "Tên English"),
    field("descriptionVi", "Mô tả tiếng Việt", 4),
    field("descriptionEn", "Mô tả English", 4),
    missing ? h("p", { className: "warn" }, "Cần đủ tên và mô tả bằng cả hai ngôn ngữ.") : null,
    h("h3", {}, "Sản phẩm"),
    h("p", { className: "meta" }, `Cụm: ${cluster?.labelVi ?? "chưa có"} (theo sản phẩm chính)`),
    h("ul", { className: "list" }, products),
    add,
    h("h3", {}, `Media (${value.mediaItems.length})`),
    h("ol", { className: "list" }, media),
    h("button", { type: "button", className: "is-primary", onclick: () => startPick({ card: id }) }, "Thêm media"),
    state.draft.cards[id] ? h("button", { type: "button", className: "link", onclick: () => commit((draft) => delete draft.cards[id], { reload: true }) }, "Khôi phục card gốc") : null,
  ];
}

// ---------- Panel Media (R5, R6) ----------

const media = { usage: null, detail: null, token: 0 };
const thumbOf = (src) => state.media.find((item) => item.src === src)?.thumb ?? src;

// Ảnh đang hiện của một trang: ảnh gốc trừ mục đã xóa, cộng ảnh của mục mới; src lấy từ nháp nếu đã đổi.
function pageImages(base, edits) {
  const removed = new Set();
  const clones = [];
  Object.entries(edits.list ?? {}).forEach(([listKey, order]) => {
    const items = base.lists[listKey]?.items ?? [];
    items.filter((item) => !order.includes(item.id)).forEach((item) => item.keys.forEach((key) => removed.add(key)));
    order.filter((id) => edits.clone?.[id]).forEach((id) => {
      const image = items.find((item) => item.id === edits.clone[id])?.image;
      if (image) clones.push({ key: `${image}@${id}`, ...base.meta[image], item: id });
    });
  });
  return [...Object.keys(base.image).filter((key) => !removed.has(key)).map((key) => ({ key, ...base.meta[key] })), ...clones]
    .map((use) => ({ ...use, src: edits.image?.[use.key]?.src ?? (isNew(use.key) ? "" : base.image[use.key].src) }));
}

// Nơi dùng của mọi media: bốn trang (nháp hoặc bản đã lưu) và card Sản phẩm Quảng cáo.
async function computeUsage() {
  const usage = new Map();
  const add = (src, use) => src && (usage.get(src) ?? usage.set(src, []).get(src)).push(use);
  const current = (id) => (state.draft?.page === id ? state.draft : working(id));
  for (const page of state.pages.filter((entry) => entry.editable)) {
    pageImages(await baseOf(page), current(page.id)).forEach((use) => add(use.src, { ...use, page }));
  }
  await catalogData();
  const cards = current("advertising").cards;
  state.cat.cards.forEach((card, id) => (cards[id] ?? card).mediaItems.forEach((item) => add(item.src, {
    card: id, label: `Card ${(cards[id] ?? card).titleVi}`, page: state.pages.find((page) => page.card === id),
  })));
  return usage;
}

const usageMap = () => (media.usage ??= computeUsage());

function refreshMedia() {
  media.usage = null;
  media.draw?.();
}

function buildMedia() {
  media.banner = h("div", { className: "pick", hidden: true });
  media.search = h("input", { type: "search", className: "search", placeholder: "Tìm theo tên file hoặc alt" });
  media.search.setAttribute("aria-label", "Tìm media");
  media.folder = h("select", {}, h("option", { value: "" }, "Mọi thư mục"),
    [...new Set(state.media.map((item) => item.folder))].sort().map((folder) => h("option", { value: folder }, folder)));
  media.folder.setAttribute("aria-label", "Lọc theo thư mục");
  media.use = h("select", {}, h("option", { value: "" }, "Mọi media"), h("option", { value: "used" }, "Đang dùng"), h("option", { value: "unused" }, "Chưa dùng"));
  media.use.setAttribute("aria-label", "Lọc theo nơi dùng");
  media.detailBox = h("div", { className: "media-detail", hidden: true });
  media.count = h("p", { className: "meta" });
  media.grid = h("div", { className: "media-grid" });
  media.draw = async () => {
    const token = ++media.token;
    const usage = await usageMap();
    // Lần vẽ sau đã bắt đầu (gõ tìm liên tục): bỏ kết quả cũ.
    if (token !== media.token) return;
    const query = fold(media.search.value.trim());
    const items = state.media.filter((item) => (!media.folder.value || item.folder === media.folder.value)
      && (!media.use.value || (media.use.value === "used") === usage.has(item.src))
      && (!query || fold(`${item.src} ${item.altVi} ${item.altEn}`).includes(query)));
    media.count.textContent = `${items.length} / ${state.media.length} media`;
    media.grid.replaceChildren(...items.map((item) => {
      const uses = usage.get(item.src)?.length ?? 0;
      const tile = h("button", {
        type: "button", className: "media-tile", draggable: true,
        title: `${item.src}\n${item.width} × ${item.height}${item.altVi ? `\n${item.altVi}` : ""}\nKéo thả vào xem trước để đặt ảnh`,
        onclick: () => (state.pick ? placeMedia(item) : showDetail(item)),
      }, h("img", { src: item.thumb, alt: "", loading: "lazy" }), h("span", {}, fileName(item.src)),
      h("small", { className: uses ? "" : "is-unused" }, uses ? `${uses} chỗ dùng` : "Chưa dùng"));
      if (media.detail === item) tile.setAttribute("aria-current", "true");
      tile.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData(MEDIA_TYPE, item.src);
        event.dataTransfer.effectAllowed = "copy";
      });
      return tile;
    }));
    if (media.detail) showDetail(media.detail);
  };
  [media.search, media.folder, media.use].forEach((control) => control.addEventListener(control === media.search ? "input" : "change", media.draw));
  panels.media.append(media.banner, media.detailBox, h("div", { className: "media-filters" }, media.search, media.folder, media.use), media.count, media.grid);
  media.draw();
}

async function showDetail(item) {
  media.detail = item;
  const uses = (await usageMap()).get(item.src) ?? [];
  if (media.detail !== item) return;
  const altVi = h("input", { type: "text", value: item.altVi });
  const altEn = h("input", { type: "text", value: item.altEn });
  fill(media.detailBox,
    h("div", { className: "media-detail__head" }, h("h2", {}, fileName(item.src)),
      h("button", { type: "button", className: "link", onclick: () => {
        media.detail = null;
        media.detailBox.hidden = true;
        media.draw();
      } }, "Đóng")),
    h("img", { className: "thumb", src: item.src, alt: "" }),
    h("p", { className: "meta" }, `Cỡ gốc ${item.width} × ${item.height} · ${item.folder}`),
    h("p", { className: "meta" }, `Biến thể: ${item.variants?.length ? item.variants.join(", ") : "không có, site tải bản gốc"}`),
    labelled("Alt tiếng Việt", altVi),
    labelled("Alt English", altEn),
    h("button", { type: "button", disabled: !uses.length, onclick: () => writeAlt(item, altVi.value, altEn.value, uses) },
      uses.length ? `Ghi alt vào ${uses.length} chỗ dùng (nháp)` : "Chưa dùng ở đâu"),
    h("h3", {}, `Nơi dùng (${uses.length})`),
    uses.length
      ? h("ul", { className: "uses" }, uses.map((use) => h("li", {}, h("button", { type: "button", className: "link", onclick: () => openUse(use) },
        `${use.page?.label ?? "Trang"} · ${use.label ?? use.key}`))))
      : note("Chưa trang hay card nào dùng ảnh này."),
    h("div", { className: "media-detail__actions" }, ["Tải lên", "Đổi tên", "Xóa file"].map((label) => h("button", { type: "button", disabled: true }, label))),
    note("Tải lên, đổi tên, xóa file cần kho media R2 thật, chưa mở ở bản local."),
  );
  media.detailBox.hidden = false;
}

// Alt sửa ở Media ghi vào nháp của mọi trang, card đang dùng ảnh (gom theo trang: một mốc hoàn tác mỗi trang).
async function writeAlt(item, altVi, altEn, uses) {
  const byDraft = Map.groupBy(uses, (use) => (use.card ? "advertising" : use.page.id));
  for (const [id, group] of byDraft) {
    const base = id === "advertising" ? null : await baseOf(state.pages.find((page) => page.id === id));
    withDraft(id, (draft) => group.forEach((use) => {
      if (use.card) {
        const card = cardOf(draft, use.card);
        setCard(draft, use.card, { ...card, mediaItems: card.mediaItems.map((entry) => (entry.src === item.src ? { ...entry, altVi, altEn } : entry)) });
      } else draft.image[use.key] = { ...imageOf(base, draft, use.key), altVi, altEn };
    }));
  }
  Object.assign(item, { altVi, altEn });
  refreshMedia();
  renderDrafts();
  toast(`Đã ghi alt vào nháp của ${uses.length} chỗ dùng. Lưu từng trang để lên web.`);
}

async function openUse(use) {
  if (use.page && state.page !== use.page) await openPage(use.page);
  select(use.card ? cardSelection(use.card) : { kind: "image", key: use.key, list: use.list, item: use.item });
}

function renderPickBanner() {
  if (!media.banner) return;
  media.banner.hidden = !state.pick;
  media.banner.replaceChildren(h("span", {}, state.pick?.card ? "Bấm một ảnh bên dưới để thêm vào card." : "Bấm một ảnh bên dưới để đặt vào chỗ đang chọn."),
    h("button", { type: "button", className: "link", onclick: () => select(state.selected) }, "Hủy"));
}

function startPick(target, selection = state.selected) {
  state.selected = selection;
  state.pick = target;
  focusPanel("media");
  renderProps();
  renderPickBanner();
}

// Đặt media vào chỗ đang chọn: ảnh của trang, hoặc thêm vào media của card.
function placeMedia(item, target = state.pick) {
  if (target.card) {
    const card = cardValue(target.card);
    const entry = { id: `${target.card}-m${Date.now().toString(36)}`, kind: "image", ...mediaImage(item) };
    commit((draft) => setCard(draft, target.card, { ...card, mediaItems: [...card.mediaItems, entry] }), { reload: true });
  } else commit((draft) => (draft.image[target.key] = mediaImage(item)), { reload: true });
  state.pick = null;
  renderPickBanner();
  focusPanel("props");
}

// ---------- Panel Nháp (R8) ----------

function pendingLabel({ map, key }) {
  const draft = state.draft;
  if (map === "text") return draft.text[key] ? `Chữ: ${short(draft.text[key].vi)}` : `Chữ: về bản gốc (${state.base?.text[baseKey(key)]?.label ?? key})`;
  if (map === "image") return `Ảnh: ${draft.image[key] ? fileName(draft.image[key].src) || "(trống)" : "về bản gốc"}`;
  if (map === "list") return `Danh sách ${state.base?.lists[key]?.label ?? key}: ${draft.list[key] ? `${draft.list[key].length} mục` : "về bản gốc"}`;
  return `Card ${short(draft.cards[key]?.titleVi ?? state.cat?.cards.get(key)?.titleVi ?? key)}${draft.cards[key] ? "" : ": về bản gốc"}`;
}

// Bỏ một thay đổi: về giá trị đã lưu (hoặc bản gốc). Danh sách lấy lại cả mục mới, chữ, ảnh của chúng trong bản lưu.
function revert({ map, key }) {
  commit((draft) => {
    const saved = savedEdits(draft.page);
    if (saved[map]?.[key] === undefined) delete draft[map][key];
    else draft[map][key] = structuredClone(saved[map][key]);
    if (map !== "list") return;
    (saved.list?.[key] ?? []).filter((id) => saved.clone?.[id]).forEach((id) => {
      draft.clone[id] = saved.clone[id];
      ["text", "image"].forEach((name) => Object.entries(saved[name] ?? {}).filter(([entry]) => entry.endsWith(`@${id}`))
        .forEach(([entry, value]) => (draft[name][entry] = structuredClone(value))));
    });
  }, { reload: true });
  if (map === "text") state.overlay?.setText(key, textValue(key));
}

function renderDrafts() {
  const root = panels.drafts;
  if (!state.draft) return root.replaceChildren(note("Trang này không có nháp."));
  const draft = state.draft;
  const saved = state.saved[draft.page];
  const rows = pending(draft).map((change) => h("li", {}, h("span", {}, pendingLabel(change)),
    h("button", { type: "button", className: "link", onclick: () => revert(change) }, "Bỏ")));
  const others = DRAFT_IDS.filter((id) => id !== draft.page && localStorage.getItem(draftKey(id)))
    .map((id) => state.pages.find((page) => draftIdOf(page) === id)).filter(Boolean);
  fill(root,
    h("h2", {}, `Nháp: ${draft.page === "advertising" ? "Card Sản phẩm Quảng cáo" : state.page.label}`),
    h("p", { className: "meta" }, saved?.updatedAt ? `Bản đã lưu: ${time(saved.updatedAt)} bởi ${saved.updatedBy}.` : "Trang chưa lưu lần nào."),
    state.conflict ? h("p", { className: "warn" }, "Bản đã lưu đã đổi sau lúc bạn bắt đầu sửa. Lưu sẽ hỏi trước khi ghi đè.") : null,
    saved?.stale?.length ? h("p", { className: "warn" },
      `${saved.stale.length} sửa đổi đã lưu không còn khớp trang (HTML nguồn đã đổi): web đang bỏ qua, lưu lại sẽ xóa hẳn (${saved.stale.join(", ")}).`) : null,
    rows.length ? h("ul", { className: "drafts" }, rows) : note("Chưa có thay đổi."),
    rows.length ? h("button", { type: "button", className: "link danger", onclick: () => {
      if (confirm("Bỏ toàn bộ nháp của trang này, quay về bản đã lưu?")) {
        commit((next) => Object.assign(next, emptyDraft(next.page), structuredClone(savedEdits(next.page)), { base: saved?.updatedAt ?? null }), { reload: true });
        state.conflict = false;
        renderDrafts();
      }
    } }, "Bỏ toàn bộ nháp trang này") : null,
    others.length ? h("p", { className: "meta" }, "Trang khác có nháp: ", others.map((page) => h("button", { type: "button", className: "link", onclick: () => openPage(page) }, page.label))) : null,
  );
}

function renderStatus() {
  const node = $("#draft-status");
  const count = state.draft ? pending(state.draft).length : 0;
  const saved = state.draft && state.saved[state.draft.page];
  node.textContent = !state.draft ? "Chỉ xem" : count ? `Chưa lưu · ${count} thay đổi`
    : saved?.updatedAt ? `Đã lưu ${time(saved.updatedAt)}` : "Không có thay đổi";
  node.classList.toggle("is-dirty", Boolean(count));
}

// ---------- Mở trang ----------

async function openPage(page) {
  const id = draftIdOf(page);
  const stored = id && readDraft(id);
  state.page = page;
  state.selected = page.card ? cardSelection(page.card) : null;
  state.pick = null;
  state.history = [];
  state.lastGroup = "";
  state.base = null;
  state.draft = id ? working(id) : null;
  state.conflict = Boolean(stored) && stored.base !== (state.saved[id]?.updatedAt ?? null);
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
  const base = await baseOf(page);
  if (state.page !== page) return;
  state.base = base;
  renderProps();
  renderDrafts();
}

// API cho overlay trong iframe (cùng origin).
window.TTEditor = {
  toast,
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
  // Thả media từ panel Media vào xem trước (R6).
  onDropMedia(src, selection) {
    const item = state.media.find((entry) => entry.src === src);
    if (!item || !state.draft) return;
    if (selection.kind === "card") {
      select(selection);
      return catalogData().then(() => placeMedia(item, { card: selection.card }));
    }
    if (!state.base) return;
    if (selection.kind === "list") return addItem(selection.list, item);
    placeMedia(item, { key: selection.key });
    select(selection);
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

// Mở lại panel đã đóng cạnh một panel chính còn mở; không còn panel nào thì Dockview tự đặt.
function focusPanel(id) {
  const ref = ["preview", "props", "pages"].find((other) => other !== id && dock.getPanel(other));
  const panel = dock.getPanel(id) ?? addPanel(id, ref && { referencePanel: ref, direction: "right" });
  panel.api.setActive();
}

const [pages, mediaIndex] = await Promise.all(["./pages.json", "./media-index.json"].map((url) => fetch(url).then((r) => r.json())));
state.pages = pages;
state.media = mediaIndex;
buildPreview();

try {
  dock.fromJSON(JSON.parse(localStorage.getItem(LAYOUT_KEY)));
  if (!dock.getPanel("preview")) throw new Error("layout without preview");
} catch {
  defaultLayout();
}
dock.onDidLayoutChange(() => localStorage.setItem(LAYOUT_KEY, JSON.stringify(dock.toJSON())));

// Chọn xong một mục thì đóng menu Bảng, không để nó che tab bên dưới.
const closeMenu = (action) => () => {
  $(".topbar__menu").open = false;
  action();
};
$("#panel-menu").append(
  ...Object.entries(PANELS).map(([id, title]) => h("button", { type: "button", onclick: closeMenu(() => focusPanel(id)) }, title)),
  h("button", { type: "button", onclick: closeMenu(defaultLayout) }, "Bố cục mặc định"),
);
$("#undo").addEventListener("click", undo);
$("#save").addEventListener("click", save);
$("#export").addEventListener("click", exportDraft);

// Bản đã lưu của mọi nháp trước khi mở trang: nháp, xem trước, nơi dùng media đều dựa trên nó.
await Promise.all(DRAFT_IDS.map(loadSaved));
buildMedia();
const start = state.pages.find((page) => page.id === localStorage.getItem("tt-cms-page")) ?? state.pages[0];
openPage(start);
