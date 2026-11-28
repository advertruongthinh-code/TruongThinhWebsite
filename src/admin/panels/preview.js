// Xem trước panel (cms-editor R3, CMS plan E13): the page of the open News or project as the build writes it, in an iframe at one of
// six widths. The HTML comes from the build's own pure modules (src/cms/preview-data.mjs); the iframe shell /admin/preview.html writes it.
import { h } from "../dom.js";
import { session } from "../drafts.js";
import { loadContact, loadContext, loadFrame, loadHeadInline, loadRepoFiles } from "../site-context.js";
import { selectBlock, state } from "../state.js";
import { enMissing } from "../lib/src/cms/contract.mjs";
import { kindOf } from "../lib/src/cms/page-model.mjs";
import { previewContext, previewPath, renderPreview, viewData } from "../lib/src/cms/preview-data.mjs";
import { KINDS } from "../lib/scripts/site/block-pages.mjs";

const WIDTHS = [384, 768, 1024, 1280, 1440, 1920];
const STAGING = "https://staging.truongthinhads.vn";
const DELAY = 250; // R3: rebuild this long after the last change
const KEY = "tt-cms-preview";

const saved = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
};

export function mountPreview(root) {
  const prefs = { width: 1440, locale: "vi", ...saved() };
  let html = "";
  let timer = 0;
  let token = 0;
  let editMode = true;
  let scrollY = 0;
  let recenter = false; // a new width or language puts the selected block back in the middle (R3)
  const remember = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ width: prefs.width, locale: prefs.locale }));
    } catch {}
  };

  const frame = h("iframe", { className: "preview__frame", title: "Xem trước", onload: () => attach() });
  const stage = h("div", { className: "preview__stage" }, h("div", { className: "preview__fit" }, frame));
  const note = h("p", { className: "preview__note", hidden: true, role: "status" });
  const size = h("span", { className: "preview__size" });
  const widths = WIDTHS.map((width) => h("button", { type: "button", className: "seg", onclick: () => { prefs.width = width; recenter = true; remember(); rebuild(); } }, String(width)));
  const lang = [["vi", "Tiếng Việt"], ["en", "English"]].map(([id, label]) => h("button", { type: "button", className: "seg", onclick: () => { prefs.locale = id; recenter = true; remember(); rebuild(); } }, label));
  const mode = h("button", { type: "button", className: "seg", onclick: () => { editMode = !editMode; syncBar(); } });
  const staging = h("a", { className: "link preview__staging", target: "_blank", rel: "noopener" }, "Mở trên staging");
  root.append(
    h("div", { className: "preview__bar" },
      h("div", { className: "segs", role: "group", "aria-label": "Bề rộng xem trước" }, ...widths),
      h("div", { className: "segs", role: "group", "aria-label": "Ngôn ngữ xem trước" }, ...lang),
      h("div", { className: "segs" }, mode),
      size, staging),
    note, stage,
  );

  const open = () => ["news", "project"].includes(session.state.record?.type);
  function syncBar() {
    widths.forEach((button, index) => button.setAttribute("aria-pressed", String(WIDTHS[index] === prefs.width)));
    lang.forEach((button, index) => button.setAttribute("aria-pressed", String(["vi", "en"][index] === prefs.locale)));
    mode.textContent = editMode ? "Chế độ sửa" : "Chế độ xem";
    const noEn = open() && enMissing(session.state.record.type, session.state.data).length > 0;
    lang[1].disabled = noEn;
    lang[1].title = noEn ? "Bài chưa có bản tiếng Anh" : "";
    if (noEn && prefs.locale === "en") prefs.locale = "vi";
    const published = session.state.record?.status === "published";
    staging.hidden = !open();
    staging.toggleAttribute("aria-disabled", !published);
    staging.title = published ? "" : "Bài chưa đăng";
    if (open() && published) staging.href = `${STAGING}${previewPath(session.state.record.type, session.state.data, prefs.locale)}`;
    else staging.removeAttribute("href");
    fit();
  }

  // Frame wider than the panel: scale it down (transform) and say the size and percent.
  function fit() {
    const room = stage.clientWidth - 24;
    const scale = Math.min(1, room / prefs.width) || 1;
    frame.style.width = `${prefs.width}px`;
    frame.style.height = `${(stage.clientHeight - 24) / scale}px`;
    frame.style.transform = `scale(${scale})`;
    frame.parentElement.style.width = `${prefs.width * scale}px`;
    frame.parentElement.style.height = `${stage.clientHeight - 24}px`;
    size.textContent = `${prefs.width}px · ${Math.round(scale * 100)}%`;
  }
  new ResizeObserver(fit).observe(stage);

  const say = (text) => {
    note.hidden = !text;
    note.textContent = text ?? "";
  };

  async function build() {
    const mine = ++token;
    const { record, data, mediaById } = session.state;
    if (!open()) {
      frame.hidden = true;
      return say(record ? "Xem trước loại này có ở bản sau." : "");
    }
    try {
      const [news, contact, files, headInline] = await Promise.all([loadContext(), loadContact(), loadRepoFiles(), loadHeadInline()]);
      const view = await viewData(record.type, data, mediaById);
      const frameHtml = await loadFrame(KINDS[kindOf(record.type)].frame(view));
      const context = previewContext(news, contact, record.type, view, { editor: true });
      const result = renderPreview(record.type, frameHtml, view, context, { locale: prefs.locale, finish: { hasFile: (url) => files.has(url), mediaOrigin: "", headInline } });
      if (mine !== token) return;
      html = result;
      say("");
      state.previewError = "";
      try {
        scrollY = frame.contentWindow?.scrollY ?? 0;
      } catch {
        scrollY = 0;
      }
      frame.hidden = false;
      frame.src = `/admin/preview.html?path=${encodeURIComponent(previewPath(record.type, view, prefs.locale))}&n=${mine}`;
    } catch (error) {
      if (mine !== token) return;
      state.previewError = String(error?.message ?? error);
      say("Chưa dựng được xem trước. Sửa các mục ở tab Còn thiếu rồi thử lại.");
    }
  }
  function rebuild({ soon = false } = {}) {
    clearTimeout(timer);
    syncBar();
    timer = setTimeout(build, soon ? DELAY : 0);
  }

  // After the iframe loads: put the overlay in (same origin), restore the scroll and the selection.
  function attach() {
    const doc = frame.contentDocument;
    if (!doc?.body || !html) return;
    doc.head.append(h("link", { rel: "stylesheet", href: "/admin/overlay.css" }));
    doc.body.append(h("script", { src: "/admin/overlay.js" }));
  }
  window.TTPreview = {
    html: () => html,
    editMode: () => editMode,
    select: (index) => selectBlock(index),
    undo: () => session.undo(),
    blocked: (href) => say(`Link rời trang bị chặn trong xem trước: ${href}`),
    ready: (win) => {
      const centre = recenter && state.block !== null;
      recenter = false;
      if (!centre) win.scrollTo(0, scrollY);
      win.TTOverlay.select(state.block, { scroll: centre });
    },
  };

  state.addEventListener("block", () => {
    try {
      frame.contentWindow?.TTOverlay?.select(state.block, { scroll: true });
    } catch {}
  });
  session.events.addEventListener("open", () => rebuild());
  session.events.addEventListener("change", () => rebuild({ soon: true }));
  syncBar();
}
