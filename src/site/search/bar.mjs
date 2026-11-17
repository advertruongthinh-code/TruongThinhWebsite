// Search bar markup (advertising-search R7, approved prototype variant 1 "Đường kẻ"). No visible status (owner 2026-11-17):
// results show on the grid; the outcome is only announced to screen readers.
export const COPY = {
  vi: {
    label: "Tìm sản phẩm quảng cáo",
    placeholder: "Tìm biển hiệu, hộp đèn, chữ nổi...",
    placeholderDocked: "Bạn cần làm gì?",
    clearText: "Xóa chữ",
    image: "Tìm bằng ảnh",
    search: "Tìm",
    talk: "Trao đổi",
    talkLong: "\u00a0ý tưởng",
    searching: "Đang tìm...",
    results: (n, text) => `${n} kết quả cho “${text}”`,
    empty: "Chưa thấy mẫu phù hợp",
  },
  en: {
    label: "Search advertising products",
    placeholder: "Search signs, lightboxes, raised letters...",
    placeholderDocked: "What do you need?",
    clearText: "Clear text",
    image: "Search by image",
    search: "Search",
    talk: "Discuss",
    talkLong: "\u00a0an idea",
    searching: "Searching...",
    results: (n, text) => `${n} results for “${text}”`,
    empty: "No matching work yet",
  },
};

const ICON = {
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  image: '<path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/><circle cx="12" cy="12" r="3.5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>',
  arrow: '<path d="M6 18 18 6M6 6h12v12"/>',
};
const icon = (name) => `<svg class="search-bar__icon" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;
const escape = (text) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

// Markup string, shared by the page and the Design System preview (scripts/docs/build-design-system.mjs).
export const barMarkup = (copy, zaloHref, docked = false) => `<div class="search-bar${docked ? " is-docked" : ""}">
  <span class="search-bar__sr" data-search-live aria-live="polite"></span>
  <div class="search-bar__shell">
    <form class="search-bar__row" role="search">
      <label class="search-bar__sr" for="search-bar-input">${escape(copy.label)}</label>
      <input id="search-bar-input" type="search" autocomplete="off" enterkeyhint="search" maxlength="300" placeholder="${escape(docked ? copy.placeholderDocked : copy.placeholder)}">
      <button type="button" class="search-bar__tool search-bar__clear" data-search-clear-text aria-label="${escape(copy.clearText)}" title="${escape(copy.clearText)}">${icon("close")}</button>
      <span class="search-bar__sep" aria-hidden="true"></span>
      <button type="button" class="search-bar__tool" data-search-image aria-label="${escape(copy.image)}" title="${escape(copy.image)}" hidden>${icon("image")}</button>
      <button type="submit" class="search-bar__tool search-bar__go" aria-label="${escape(copy.search)}" title="${escape(copy.search)}">${icon("search")}</button>
      <a class="search-bar__talk" href="${escape(zaloHref)}" target="_blank" rel="noreferrer">${escape(copy.talk)}<span class="search-bar__long">${escape(copy.talkLong)}</span>${icon("arrow")}</a>
    </form>
    <span class="search-bar__rule" aria-hidden="true"></span>
  </div>
</div>`;

export function createBar(copy, zaloHref) {
  const template = document.createElement("template");
  template.innerHTML = barMarkup(copy, zaloHref);
  const bar = template.content.firstElementChild;
  return {
    bar,
    form: bar.querySelector("form"),
    input: bar.querySelector("input"),
    clearText: bar.querySelector("[data-search-clear-text]"),
    liveNode: bar.querySelector("[data-search-live]"),
  };
}
