const RESOURCE_LABELS = {
  pages: "Trang",
  projects: "Công trình",
  products: "Sản phẩm",
  "project-categories": "Nhóm công trình",
  "product-categories": "Nhóm sản phẩm",
  settings: "Thiết lập",
};
const PAGE_IDS = ["home", "residential", "commercial", "projects-products", "about"];
const TEMPLATE_OPTIONS = ["compact-gallery", "editorial-case", "process-film"];
const MENU_PROJECT_GROUP_OPTIONS = [
  { value: "", label: "Không hiển thị trong menu" },
  { value: "residential", label: "01 · Nhà ở" },
  { value: "commercial", label: "02 · Kinh doanh" },
  { value: "projects-products", label: "03 · Công trình & sản phẩm" },
];
const state = {
  resource: "pages",
  records: [],
  selected: null,
  projectCategories: [],
  productCategories: [],
};

const statusNode = document.querySelector("#status");
const recordsNode = document.querySelector("#records");
const fieldsNode = document.querySelector("#fields");
const editor = document.querySelector("#editor");
const editorTitle = document.querySelector("#editor-title");
const recordsTitle = document.querySelector("#records-title");

function setStatus(message, error = false) {
  statusNode.textContent = message;
  statusNode.classList.toggle("is-error", error);
}

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", ...options });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

function text(node, value) {
  node.textContent = value || "";
  return node;
}

function element(name, className) {
  const node = document.createElement(name);
  if (className) node.className = className;
  return node;
}

function field(parent, { name, label, value = "", type = "text", options, wide = false, readonly = false, help }) {
  const wrap = element("div", `field${wide ? " field--wide" : ""}`);
  const labelNode = element("label");
  const id = `field-${name.replace(/[^a-z0-9]+/gi, "-")}`;
  labelNode.htmlFor = id;
  text(labelNode, label);
  const control = options ? element("select") : type === "textarea" ? element("textarea") : element("input");
  control.id = id;
  control.name = name;
  control.readOnly = readonly;
  if (options) {
    options.forEach(({ value: optionValue, label: optionLabel }) => {
      const option = element("option");
      option.value = optionValue;
      text(option, optionLabel);
      control.append(option);
    });
  } else if (control.tagName === "INPUT") {
    control.type = type;
  }
  control.value = value ?? "";
  wrap.append(labelNode, control);
  if (help) wrap.append(text(element("small"), help));
  parent.append(wrap);
  return control;
}

function sectionText(sections) {
  return Array.isArray(sections)
    ? sections.map((section) => `${section.title || ""} | ${section.body || ""}`.trim()).join("\n")
    : "";
}

function parseSections(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...body] = line.split("|");
      return { title: title.trim(), body: body.join("|").trim() };
    });
}

function parseJson(value, fallback) {
  try { return JSON.parse(value || ""); } catch { return fallback; }
}

function localizedContentFields(parent, content) {
  ["vi", "en"].forEach((locale) => {
    const group = element("section", "locale-group");
    group.append(text(element("h3"), locale === "vi" ? "Tiếng Việt" : "English"));
    const value = content[locale] || {};
    const hero = value.hero || {};
    field(group, { name: `${locale}.hero.kicker`, label: "Hero kicker", value: hero.kicker, wide: false });
    field(group, { name: `${locale}.hero.qualifier`, label: "Hero qualifier", value: hero.qualifier, wide: false });
    field(group, { name: `${locale}.hero.title`, label: "Hero title", value: hero.title, wide: false });
    field(group, { name: `${locale}.hero.motto`, label: "Hero motto", value: hero.motto, wide: false });
    field(group, { name: `${locale}.intro`, label: "Intro", value: value.intro, type: "textarea", wide: true });
    field(group, { name: `${locale}.sections`, label: "Các đoạn", value: sectionText(value.sections), type: "textarea", wide: true, help: "Mỗi dòng: tiêu đề | nội dung. Chỉ văn bản, không HTML." });
    field(group, { name: `${locale}.cta.label`, label: "CTA", value: value.cta?.label, wide: false });
    field(group, { name: `${locale}.seo.title`, label: "SEO title", value: value.seo?.title, wide: false });
    field(group, { name: `${locale}.seo.description`, label: "SEO description", value: value.seo?.description, type: "textarea", wide: true });
    parent.append(group);
  });
}

function selectedContent(record) {
  return parseJson(record?.content_json, {
    vi: { hero: {}, intro: "", sections: [], cta: {}, seo: {} },
    en: { hero: {}, intro: "", sections: [], cta: {}, seo: {} },
  });
}

function buildEditor(record, isNew) {
  fieldsNode.replaceChildren();
  const resource = state.resource;
  const value = record || {};
  if (resource === "pages") {
    field(fieldsNode, { name: "id", label: "Page ID", value: value.id || "home", options: PAGE_IDS.map((id) => ({ value: id, label: id })), readonly: !isNew });
    field(fieldsNode, { name: "status", label: "Trạng thái", value: value.status || "draft", options: statusOptions() });
    localizedContentFields(fieldsNode, selectedContent(value));
  }
  if (resource === "projects") {
    field(fieldsNode, { name: "id", label: "ID", value: value.id, readonly: !isNew });
    field(fieldsNode, { name: "slug", label: "Slug", value: value.slug });
    field(fieldsNode, { name: "template", label: "Template", value: value.template || TEMPLATE_OPTIONS[0], options: TEMPLATE_OPTIONS.map((item) => ({ value: item, label: item })) });
    field(fieldsNode, { name: "category_id", label: "Danh mục", value: value.category_id || state.projectCategories[0]?.id, options: categoryOptions() });
    field(fieldsNode, { name: "status", label: "Trạng thái", value: value.status || "draft", options: statusOptions() });
    field(fieldsNode, { name: "cover_media_id", label: "Media cover ID", value: value.cover_media_id || "" });
    field(fieldsNode, { name: "menu_group", label: "Nhóm dự án trong menu", value: value.menu_group || "", options: MENU_PROJECT_GROUP_OPTIONS, help: "Tuỳ chọn. Bỏ trống để giữ các slot tĩnh hiện tại." });
    field(fieldsNode, { name: "menu_order", label: "Thứ tự trong nhóm", value: value.menu_order ?? "", type: "number", help: "Tuỳ chọn, 1–999. Số nhỏ đứng trước." });
    localizedContentFields(fieldsNode, selectedContent(value));
  }
  if (resource === "products") {
    const content = selectedContent(value);
    field(fieldsNode, { name: "id", label: "ID", value: value.id, readonly: !isNew });
    field(fieldsNode, { name: "category_id", label: "Danh mục", value: value.category_id || state.productCategories[0]?.id, options: categoryOptions() });
    field(fieldsNode, { name: "position", label: "Thứ tự", value: value.position || 1, type: "number" });
    field(fieldsNode, { name: "status", label: "Trạng thái", value: value.status || "draft", options: statusOptions() });
    field(fieldsNode, { name: "image_media_id", label: "Media ID", value: value.image_media_id || "" });
    ["vi", "en"].forEach((locale) => field(fieldsNode, { name: `${locale}.name`, label: locale === "vi" ? "Tên tiếng Việt" : "English name", value: content[locale]?.name, type: "textarea", wide: true }));
  }
  if (resource === "project-categories" || resource === "product-categories") {
    const defaultPosition = resource === "project-categories" ? 101 : 1;
    field(fieldsNode, { name: "id", label: "ID", value: value.id, readonly: !isNew });
    field(fieldsNode, { name: "position", label: "Thứ tự", value: value.position || defaultPosition, type: "number" });
    field(fieldsNode, { name: "label_vi", label: "Nhãn tiếng Việt", value: value.label_vi, wide: true });
    field(fieldsNode, { name: "label_en", label: "English label", value: value.label_en, wide: true });
    field(fieldsNode, { name: "cover_path", label: "Đường dẫn ảnh cover", value: value.cover_path, wide: true, help: "Đường dẫn public bắt đầu bằng dấu /." });
  }
  if (resource === "settings") {
    field(fieldsNode, { name: "key", label: "Key", value: value.key, readonly: !isNew });
    field(fieldsNode, { name: "value", label: "JSON thiết lập", value: value.value_json || "{}", type: "textarea", wide: true, help: "Dữ liệu cấu hình kỹ thuật; không dùng để đưa HTML vào trang." });
  }
  editor.hidden = false;
  editorTitle.textContent = isNew ? `Tạo ${RESOURCE_LABELS[resource].toLowerCase()}` : `Biên tập ${recordLabel(value)}`;
  document.querySelector("#delete-record").hidden = isNew || resource === "pages";
}

function statusOptions() {
  return [{ value: "draft", label: "Nháp" }, { value: "published", label: "Xuất bản" }];
}

function categoryOptions() {
  const categories = state.resource === "projects" ? state.projectCategories : state.productCategories;
  return categories.map((category) => ({ value: category.id, label: category.label_vi }));
}

function formValue(name) {
  return editor.elements.namedItem(name)?.value?.trim() || "";
}

function contentFromForm() {
  return Object.fromEntries(["vi", "en"].map((locale) => [locale, {
    hero: Object.fromEntries(["kicker", "qualifier", "title", "motto"].map((key) => [key, formValue(`${locale}.hero.${key}`)])),
    intro: formValue(`${locale}.intro`),
    sections: parseSections(formValue(`${locale}.sections`)),
    cta: { label: formValue(`${locale}.cta.label`) },
    seo: { title: formValue(`${locale}.seo.title`), description: formValue(`${locale}.seo.description`) },
  }]));
}

function payloadFromForm() {
  if (state.resource === "pages") return { id: formValue("id"), status: formValue("status"), content: contentFromForm() };
  if (state.resource === "projects") return {
    id: formValue("id"), slug: formValue("slug"), template: formValue("template"), category_id: formValue("category_id"), status: formValue("status"), cover_media_id: formValue("cover_media_id"), menu_group: formValue("menu_group"), menu_order: formValue("menu_order"), content: contentFromForm(),
  };
  if (state.resource === "products") return {
    id: formValue("id"), category_id: formValue("category_id"), position: Number(formValue("position")), status: formValue("status"), image_media_id: formValue("image_media_id"),
    content: { vi: { name: formValue("vi.name") }, en: { name: formValue("en.name") } },
  };
  if (state.resource === "project-categories" || state.resource === "product-categories") return {
    id: formValue("id"),
    position: Number(formValue("position")),
    label_vi: formValue("label_vi"),
    label_en: formValue("label_en"),
    cover_path: formValue("cover_path"),
  };
  return { key: formValue("key"), value: parseJson(formValue("value"), null) };
}

function recordLabel(record) {
  if (state.resource === "products") return selectedContent(record).vi?.name || record.id;
  if (state.resource === "project-categories" || state.resource === "product-categories") return record.label_vi || record.id;
  return record.slug || record.id || record.key || "mục mới";
}

function renderRecords() {
  recordsNode.replaceChildren();
  state.records.forEach((record) => {
    const button = element("button", "record");
    button.type = "button";
    button.setAttribute("aria-current", String(state.selected === record));
    button.append(text(element("strong"), recordLabel(record)), text(element("small"), record.status || record.template || ""));
    button.addEventListener("click", () => { state.selected = record; buildEditor(record, false); renderRecords(); });
    recordsNode.append(button);
  });
}

async function loadResource() {
  setStatus("Đang tải…");
  state.selected = null;
  editor.hidden = true;
  const data = await request(`/api/admin/${state.resource}`);
  state.records = data.items || [];
  recordsTitle.textContent = RESOURCE_LABELS[state.resource];
  renderRecords();
  setStatus(state.records.length ? `${state.records.length} mục.` : "Chưa có mục nào.");
}

async function loadCategories() {
  const [projectData, productData] = await Promise.all([
    request("/api/admin/project-categories"),
    request("/api/admin/product-categories"),
  ]);
  state.projectCategories = projectData.items || [];
  state.productCategories = productData.items || [];
}

document.querySelectorAll("[data-resource]").forEach((button) => {
  button.addEventListener("click", async () => {
    state.resource = button.dataset.resource;
    document.querySelectorAll("[data-resource]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    try { await loadResource(); } catch (error) { setStatus(error.message, true); }
  });
});

document.querySelector("#new-record").addEventListener("click", () => {
  if (state.resource === "pages") return setStatus("Các page ID cố định đã được tạo sẵn; hãy chọn mục cần sửa.");
  state.selected = null;
  buildEditor(null, true);
  renderRecords();
});

editor.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = payloadFromForm();
    if (state.resource === "settings" && !payload.value) throw new Error("JSON thiết lập chưa hợp lệ.");
    const id = state.selected?.id || state.selected?.key;
    const method = id ? "PUT" : "POST";
    await request(`/api/admin/${state.resource}${id ? `/${encodeURIComponent(id)}` : ""}`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setStatus("Đã lưu.");
    await loadResource();
  } catch (error) { setStatus(error.message, true); }
});

document.querySelector("#delete-record").addEventListener("click", async () => {
  const id = state.selected?.id || state.selected?.key;
  if (!id || !confirm(`Xoá ${recordLabel(state.selected)}?`)) return;
  try {
    await request(`/api/admin/${state.resource}/${encodeURIComponent(id)}`, { method: "DELETE" });
    setStatus("Đã xoá.");
    await loadResource();
  } catch (error) { setStatus(error.message, true); }
});

async function loadMedia() {
  const data = await request("/api/admin/media");
  const list = document.querySelector("#media-list");
  list.replaceChildren();
  (data.items || []).forEach((item) => {
    const row = element("div", "media-row");
    row.append(text(element("code"), item.id), text(element("small"), `${item.kind} · ${item.status} · ${item.approved_at ? "đã duyệt" : "chưa duyệt"}`));
    const publish = element("button", "button button--quiet");
    publish.type = "button";
    text(publish, item.status === "published" && item.approved_at ? "Ẩn" : "Xuất bản + duyệt");
    publish.addEventListener("click", async () => {
      try {
        const enabled = !(item.status === "published" && item.approved_at);
        await request(`/api/admin/media/${encodeURIComponent(item.id)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: enabled ? "published" : "draft", approved: enabled }) });
        await loadMedia();
      } catch (error) { setStatus(error.message, true); }
    });
    row.append(publish);
    list.append(row);
  });
}

document.querySelector("#media-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const form = new FormData(event.currentTarget);
    await request("/api/admin/media", { method: "POST", body: form });
    event.currentTarget.reset();
    setStatus("Đã tải lên ở trạng thái nháp.");
    await loadMedia();
  } catch (error) { setStatus(error.message, true); }
});
document.querySelector("#refresh-media").addEventListener("click", () => loadMedia().catch((error) => setStatus(error.message, true)));

try {
  await loadCategories();
  await Promise.all([loadResource(), loadMedia()]);
} catch (error) {
  setStatus(`Không thể tải admin: ${error.message}`, true);
}
