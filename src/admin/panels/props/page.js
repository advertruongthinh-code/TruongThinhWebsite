// Thuộc tính panel of a News post or project page (cms-editor R4, CMS plan E13): tabs Thông tin, Media của bài, Layout, Còn thiếu.
// Every edit goes through the draft session (undo, draft in storage); the tabs only read it back.
import { call } from "../../api.js";
import { h } from "../../dom.js";
import { session } from "../../drafts.js";
import { loadContext } from "../../site-context.js";
import { selectBlock, state } from "../../state.js";
import { IMAGE_SRC, imageFieldErrors } from "../../lib/scripts/site/lib-pure.mjs";
import { NEWS_GROUPS } from "../../lib/scripts/site/blocks.mjs";
import { PROJECT_TYPES, SECTOR_LABEL } from "../../lib/scripts/site/block-pages.mjs";
import { fullErrors, shapeErrors } from "../../lib/src/cms/contract.mjs";
import { explain } from "../../lib/src/cms/errors-vi.mjs";
import { LAYOUTS, expandLayout } from "../../lib/src/cms/layouts.mjs";
import { blockTexts, fitCrops, kindOf, layoutChoices, pageMedia, relayout } from "../../lib/src/cms/page-model.mjs";
import { viewData } from "../../lib/src/cms/preview-data.mjs";

const VARIANT_SRC = /^\/v\/[0-9a-f]{32}\/[a-z0-9-]+\.webp$/;
const TABS = [["info", "Thông tin"], ["media", "Media của bài"], ["layout", "Layout"], ["missing", "Còn thiếu"]];
const BLOCK_NAMES = { paragraph: "Đoạn chữ", "section-title": "Tiêu đề phần", quote: "Trích dẫn", "facts-grid": "Bảng thông tin", "hero-project": "Đầu bài", "contact-quick": "Liên hệ nhanh", "cta-arrow": "Nút kêu gọi", "media-text": "Ảnh và chữ" };

export function mountPageProps(root) {
  let tab = "info";
  let typing = false;
  let pickerOpen = false; // the library picker stays open while media are added one after another
  let problems = [];
  let validating = 0;
  let original = {};
  const s = session.state;
  const isPage = () => s.record && ["news", "project"].includes(s.record.type);
  const at = (path) => path.reduce((node, key) => node?.[key], s.data);
  const edit = (path, value) => {
    typing = true;
    try {
      session.mutate((draft) => {
        const parent = path.slice(0, -1).reduce((node, key) => (node[key] ??= {}), draft.data);
        if (value === undefined) delete parent[path.at(-1)];
        else parent[path.at(-1)] = value;
      }, { group: path.join(".") });
    } catch (error) {
      typing = false;
      throw error;
    }
  };

  // ---------- Thông tin ----------

  const row = (label, field, ...controls) => {
    const node = h("label", { className: "field" }, h("span", {}, label), ...controls, h("small", { className: "field__error" }));
    if (field) node.dataset.field = field;
    return node;
  };
  const input = (path, props = {}) => h(props.rows ? "textarea" : "input", { value: at(path) ?? "", oninput: (event) => edit(path, event.target.value), ...props });
  const pair = (label, field, path, rows) => [row(`${label} (VI)`, field, input([...path, "vi"], { rows })), row(`${label} (EN)`, null, input([...path, "en"], { rows }))];
  const select = (path, options, blank, onchange = (value) => edit(path, value)) => h("select", { onchange: (event) => onchange(event.target.value) }, blank && h("option", { value: "" }, blank), ...options.map(([value, text]) => h("option", { value, selected: value === at(path) }, text)));

  // A new sector keeps the type only if it belongs there, else takes the first type of the sector; the type list is redrawn.
  function changeSector(sector) {
    typing = false;
    session.mutate((draft) => {
      draft.data.sector = sector;
      if (PROJECT_TYPES[draft.data.type]?.sector !== sector) draft.data.type = Object.keys(PROJECT_TYPES).find((id) => PROJECT_TYPES[id].sector === sector);
    });
  }

  function coverField() {
    const images = pageMedia(s.data).filter((item) => item.image);
    const same = (a, b) => (a.mediaId ?? a.src) === (b.mediaId ?? b.src);
    const current = images.findIndex((item) => s.data.cover && same(item.image, s.data.cover));
    return row("Ảnh bìa (chọn trong media của bài)", "cover", h("select", {
      onchange: (event) => {
        typing = false;
        session.mutate((draft) => {
          draft.data.cover = structuredClone(images[Number(event.target.value)].image);
          fitCrops(draft.record.type, draft.data, draft.mediaById);
        });
      },
    }, current < 0 && h("option", { value: "" }, "Ảnh bìa riêng (chưa nằm trong media của bài)"),
    ...images.map((item, index) => h("option", { value: String(index), selected: index === current }, `${index + 1}. ${labelOf(item.image)}`))));
  }

  function slugNote() {
    const changed = s.record.status === "published" && (s.data.slugVi !== original.vi || s.data.slugEn !== original.en);
    return changed && h("p", { className: "meta" }, "Link cũ sẽ tự chuyển sang link mới.");
  }

  function selectedBlock() {
    const block = s.data.blocks?.[state.block];
    if (!block) return h("p", { className: "group__hint" }, "Bấm một khối trên xem trước để sửa chữ của khối đó.");
    const texts = blockTexts(block);
    return h("section", { className: "block-fields" },
      h("h3", {}, `Khối ${state.block + 1}: ${BLOCK_NAMES[block.type] ?? block.type}`),
      texts.length ? texts.flatMap(({ path }) => {
        const where = ["blocks", state.block, ...path];
        const name = path.filter((key) => Number.isNaN(Number(key))).join(" ");
        return [row(`${name} (VI)`, null, input([...where, "vi"], { rows: 3 })), row(`${name} (EN)`, null, input([...where, "en"], { rows: 3 }))];
      }) : h("p", { className: "note" }, "Khối này không có chữ để sửa."));
  }

  function infoTab() {
    const news = s.record.type === "news";
    return [
      ...pair("Tên", "title", ["title"]),
      ...pair("Mô tả", "description", ["description"], 3),
      ...(news ? [] : pair("Tiêu đề SEO", "seoTitle", ["seoTitle"])),
      row("Link tiếng Việt", "slugVi", input(["slugVi"])),
      row("Link tiếng Anh", "slugEn", input(["slugEn"])),
      slugNote(),
      ...(news
        ? [row("Nhóm", "group", select(["group"], Object.entries(NEWS_GROUPS).map(([id, group]) => [id, group.vi]), "Chọn nhóm"))]
        : [
          row("Mảng", "sector", select(["sector"], Object.entries(SECTOR_LABEL).map(([id, label]) => [id, label.vi]), "Chọn mảng", changeSector)),
          row("Loại công trình", "type", select(["type"], Object.entries(PROJECT_TYPES).filter(([, type]) => type.sector === s.data.sector).map(([id, type]) => [id, type.label.vi]), "Chọn loại")),
        ]),
      news && row("Ngày đăng", "published", input(["published"], { type: "date" })),
      coverField(),
      selectedBlock(),
    ];
  }

  // ---------- Media của bài ----------

  const labelOf = (image) => image.altVi || s.mediaById.get(image.mediaId)?.altVi || image.mediaId || "Ảnh có sẵn";
  const thumb = (image) => (image.mediaId && !image.legacySrc ? `/api/admin/media-file?id=${encodeURIComponent(image.mediaId)}` : image.src);
  const setList = (list) => { typing = false; session.setMedia(list); };

  function mediaRow(item, index, list) {
    const image = item.image ?? { src: "" };
    const moveFrom = (from, to) => { const next = [...list]; next.splice(to, 0, ...next.splice(from, 1)); setList(next); };
    const move = (to) => () => moveFrom(index, to);
    return h("li", {
      className: "media-row", draggable: true,
      ondragstart: (event) => event.dataTransfer.setData("text/plain", String(index)),
      ondragover: (event) => event.preventDefault(),
      ondrop: (event) => { event.preventDefault(); moveFrom(Number(event.dataTransfer.getData("text/plain")), index); },
    }, h("span", { className: "media-row__n" }, String(index + 1)),
    item.video ? h("span", { className: "media-row__thumb" }, "Video") : h("img", { className: "media-row__thumb", src: thumb(image), alt: "", loading: "lazy" }),
    h("span", { className: "media-row__name" }, item.video ? "Video" : labelOf(image)),
    h("button", { type: "button", title: "Lên", disabled: index === 0, onclick: move(index - 1) }, "Lên"),
    h("button", { type: "button", title: "Xuống", disabled: index === list.length - 1, onclick: move(index + 1) }, "Xuống"),
    h("button", { type: "button", title: "Gỡ khỏi bài", onclick: () => setList(list.filter((_, i) => i !== index)) }, "Gỡ"));
  }

  // Library picker: media-list with a search box; a click adds the media at the end. Upload comes with the library panel (E15).
  function picker(onPick) {
    const list = h("div", { className: "picker__list" });
    let timer = 0;
    const load = async (q) => {
      const result = await call("media-list", { query: { q } });
      const usable = (result.data.items ?? []).filter(({ data }) => data.kind !== "video" && data.mime !== "image/svg+xml");
      list.replaceChildren(...(result.error ? [h("p", { className: "note" }, "Chưa tải được thư viện. Thử lại sau.")]
        : usable.length ? usable.map((item) => h("button", { type: "button", className: "picker__tile", title: item.data.altVi || item.id, onclick: () => onPick({ ...item.data, id: item.id }) },
          h("img", { src: `/api/admin/media-file?id=${encodeURIComponent(item.id)}`, alt: "", loading: "lazy" }), h("span", {}, item.data.altVi || item.id)))
          : [h("p", { className: "note" }, "Không có media phù hợp.")]));
    };
    load("");
    return h("div", { className: "picker" }, h("input", { className: "search", type: "search", placeholder: "Tìm media", oninput: (event) => { clearTimeout(timer); timer = setTimeout(() => load(event.target.value), 250); } }), list);
  }

  function mediaTab() {
    const list = s.media;
    const fit = session.fit();
    const pick = (record) => {
      session.addMediaRecord(record);
      setList([...s.media, { image: { mediaId: record.id } }]);
    };
    const host = h("div", {}, pickerOpen && picker(pick));
    return [
      h("p", { className: "meta" }, `${list.length} media`),
      fit && h("p", { className: "warn" }, "Số media chưa khớp layout. Chọn layout ở tab Layout."),
      h("ol", { className: "media-list" }, ...list.map((item, index) => mediaRow(item, index, list))),
      h("button", { type: "button", className: "group__create", onclick: () => { pickerOpen = !pickerOpen; host.replaceChildren(...(pickerOpen ? [picker(pick)] : [])); } }, pickerOpen ? "Xong" : "Thêm media"),
      host,
    ];
  }

  // ---------- Layout ----------

  const layoutName = (id) => (LAYOUTS[id].max >= 17 || id === "project-13" ? `${LAYOUTS[id].min} ảnh trở lên` : `${LAYOUTS[id].min} tới ${LAYOUTS[id].max} ảnh`);
  const hasOptionalQuote = () => s.data.layout !== "legacy" && !expandLayout(s.data.layout, s.media.length).error && LAYOUTS[s.data.layout].chain.some((block) => block.optional);
  function setQuote(on) {
    typing = false;
    session.mutate((draft) => {
      const blocks = draft.data.blocks.filter((block) => block.type !== "quote");
      const page = { ...draft.data, blocks: on ? [...blocks, { id: "quote-1", type: "quote", text: { vi: "", en: "" } }] : blocks };
      const result = relayout(kindOf(draft.record.type), page, draft.data.layout, draft.media);
      if (!result.error) draft.data.blocks = result.blocks;
    });
  }

  function layoutTab() {
    const kind = kindOf(s.record.type);
    return [
      s.data.layout === "legacy" && h("button", { type: "button", className: "layout is-current", disabled: true }, h("strong", {}, "Bố cục riêng (trang có trước CMS)")),
      ...layoutChoices(kind, s.media.length).map((choice) => h("button", {
        type: "button", className: `layout${choice.id === s.data.layout ? " is-current" : ""}`, disabled: !choice.open, "aria-pressed": String(choice.id === s.data.layout),
        onclick: () => { typing = false; session.setMedia(s.media, choice.id); },
      }, h("span", { className: "layout__thumb", "aria-hidden": "true" }, ...LAYOUTS[choice.id].chain.map((block) => h("i", { className: block.min === undefined ? "is-text" : "is-media" }))),
      h("strong", {}, layoutName(choice.id)), choice.note && h("small", {}, choice.note))),
      hasOptionalQuote() && h("label", { className: "switch" }, h("input", { type: "checkbox", checked: s.data.blocks.some((block) => block.type === "quote"), onchange: (event) => setQuote(event.target.checked) }), "Có trích dẫn"),
    ];
  }

  // ---------- Còn thiếu ----------

  function missingTab() {
    if (!problems.length) return h("p", { className: "note" }, "Đủ mục. Bài sẵn sàng để đăng.");
    return h("ul", { className: "problems" }, ...problems.map((problem) => h("li", {}, h("button", { type: "button", className: "problem", onclick: () => jump(problem) },
      problem.level === "shape" && h("b", {}, "Lỗi: "), problem.block !== null && `Khối ${problem.block + 1}: `, problem.text))));
  }
  function jump({ block, field }) {
    if (block !== null) selectBlock(block);
    else {
      tab = "info";
      render();
      root.querySelector(`[data-field="${field}"] :is(input, select, textarea)`)?.focus();
    }
  }

  const common = async () => {
    const context = await loadContext();
    const byId = (rows) => new Map(rows.map((entry) => [entry.id, entry]));
    return { id: s.record.id, mediaById: s.mediaById, projects: byId(context.projects), news: byId(context.news), usage: new Map(),
      checkImage: async (image, where) => imageFieldErrors(image, where, (src) => IMAGE_SRC.test(src) || VARIANT_SRC.test(src)) };
  };

  // shapeErrors and fullErrors in the browser after each change (R4); server answers (400) go through showErrors.
  async function validate() {
    const mine = ++validating;
    try {
      const { record, data } = s;
      const view = await viewData(record.type, data, s.mediaById);
      const ctx = await common();
      const errors = [...await shapeErrors(record.type, view, ctx), ...await fullErrors(record.type, view, ctx)];
      if (mine === validating) showErrors(errors);
    } catch {
      /* the context is not reachable: the list keeps what it had */
    }
  }
  function showErrors(errors) {
    const seen = new Set();
    problems = errors.map((error) => ({ ...explain(error), level: error.level })).filter((problem) => !seen.has(JSON.stringify(problem)) && seen.add(JSON.stringify(problem)));
    paint();
  }

  // Badge of the tab, the list when it is open, and the marks on the fields, in place (typing keeps its focus).
  function paint() {
    const missing = root.querySelector('[data-tab="missing"]');
    if (missing) missing.textContent = `Còn thiếu${problems.length ? ` (${problems.length})` : ""}`;
    if (tab === "missing") root.querySelector(".props__body")?.replaceChildren(missingTab());
    for (const node of root.querySelectorAll("[data-field]")) {
      const found = problems.find((problem) => problem.field === node.dataset.field);
      node.classList.toggle("field--error", Boolean(found));
      node.querySelector(".field__error").textContent = found?.text ?? "";
    }
  }

  // ---------- Panel ----------

  function render() {
    root.replaceChildren();
    if (!isPage()) return root.append(h("div", { className: "empty" }, h("p", { className: "empty__title" }, "Thuộc tính"), h("p", {}, "Các trường của loại này có ở bản sau.")));
    const body = { info: infoTab, media: mediaTab, layout: layoutTab, missing: missingTab }[tab];
    root.append(
      h("div", { className: "props__tabs", role: "tablist" }, ...TABS.map(([id, label]) => {
        const button = h("button", { type: "button", role: "tab", "aria-selected": String(id === tab), onclick: () => { tab = id; render(); } }, label);
        button.dataset.tab = id;
        return button;
      })),
      h("div", { className: "props__body", role: "tabpanel" }, body()),
    );
    paint();
  }

  session.events.addEventListener("open", () => {
    original = { vi: s.data?.slugVi, en: s.data?.slugEn };
    problems = [];
    render();
    if (isPage()) validate();
  });
  session.events.addEventListener("change", () => {
    if (!isPage()) return;
    if (typing) typing = false;
    else render();
    validate();
  });
  state.addEventListener("block", () => {
    if (!isPage()) return;
    tab = "info";
    render();
  });
  return { showErrors, show: (id) => { tab = id; render(); } };
}
