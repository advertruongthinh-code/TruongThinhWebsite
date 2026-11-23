// Search bar markup (search-bar R1 to R5, mock approved 2026-11-22): one white block in the three places. No visible status line
// (owner 2026-11-17): results show on the grid, the outcome is announced to screen readers; short notices take the input's place.
// Tips and phone notices stay within 28 characters so they fit the phone input (search-bar R3).
export const COPY = {
  vi: {
    label: "Tìm sản phẩm quảng cáo",
    placeholder: "Tìm biển hiệu, hộp đèn, chữ nổi...",
    tips: ["Tìm hộp đèn, chữ nổi, kệ…", "Thử: chữ nổi inox", "Mẹo: tìm bằng một ảnh mẫu", "Gõ không dấu cũng được", "Thử: kệ trưng bày mỹ phẩm"],
    imageHint: "Thêm chữ để tìm sát hơn",
    chips: "Lọc kết quả",
    showAll: (n) => `Hiện tất cả (${n})`,
    clearText: "Xóa chữ",
    image: "Tìm bằng ảnh",
    replaceImage: "Đổi ảnh tìm",
    search: "Tìm",
    imageCount: () => "1 ảnh",
    removeImage: () => "Bỏ ảnh",
    imageAlt: () => "Ảnh đang tìm",
    drop: "Thả ảnh vào đây để tìm",
    dropNote: "Một ảnh mỗi lần",
    videoOnly: "Chỉ tìm bằng ảnh",
    unsupported: "Chưa dùng được file này",
    tooLarge: "Ảnh quá lớn, dưới 25 MB",
    unreadable: "Ảnh chưa đọc được, thử JPG",
    slow: "Tìm bằng ảnh đang chậm",
    retry: "Thử lại",
    trouble: "Lỗi tìm kiếm",
    imageTrouble: "Lỗi tìm ảnh",
    searching: "Đang tìm...",
    results: (n, text) => `${n} kết quả cho “${text}”`,
    empty: "Chưa thấy mẫu phù hợp",
    more: "Có thêm kết quả gợi ý",
  },
  en: {
    label: "Search advertising products",
    placeholder: "Search signs, lightboxes, raised letters...",
    tips: ["Search lightboxes, letters…", "Try: steel letters", "Tip: search with a photo", "Typos are fine", "Try: cosmetics display"],
    imageHint: "Add words to narrow it down",
    chips: "Filter results",
    showAll: (n) => `Show all (${n})`,
    clearText: "Clear text",
    image: "Search by image",
    replaceImage: "Change search image",
    search: "Search",
    imageCount: () => "1 image",
    removeImage: () => "Remove image",
    imageAlt: () => "Search image",
    drop: "Drop an image here to search",
    dropNote: "One image at a time",
    videoOnly: "Images only",
    unsupported: "This file cannot be used",
    tooLarge: "Image too large, under 25 MB",
    unreadable: "Unreadable image, try JPG",
    slow: "Image search is slow",
    retry: "Try again",
    trouble: "Search error",
    imageTrouble: "Image error",
    searching: "Searching...",
    results: (n, text) => `${n} results for “${text}”`,
    empty: "No matching work yet",
    more: "More suggested results",
  },
};

const ICON = {
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  image: '<path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/><circle cx="12" cy="12" r="3.5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>',
};
const icon = (name) => `<svg class="search-bar__icon" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;
const escape = (text) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

// Markup string, shared by the page and the Design System preview (scripts/docs/build-design-system.mjs). `place`: the preview's
// docked copy ("top" or "cta"); the page mounts it floating.
export const barMarkup = (copy, place = "") => `<div class="search-bar${place ? `" data-dock="${place}` : ""}">
  <span class="search-bar__sr" data-search-live aria-live="polite"></span>
  <div class="search-bar__shell">
    <div class="search-bar__chips" data-search-chips role="group" aria-label="${escape(copy.chips)}"></div>
    <form class="search-bar__row" role="search">
      <label class="search-bar__sr" for="search-bar-input">${escape(copy.label)}</label>
      <span class="search-bar__field">
        <input id="search-bar-input" type="search" autocomplete="off" enterkeyhint="search" maxlength="300" placeholder="${escape(copy.placeholder)}">
        <span class="search-bar__hint" data-search-hint aria-hidden="true"><span>${escape(copy.tips[0])}</span></span>
        <span class="search-bar__note" data-search-note hidden></span>
      </span>
      <button type="button" class="search-bar__tool search-bar__clear" data-search-clear-text aria-label="${escape(copy.clearText)}" title="${escape(copy.clearText)}">${icon("close")}</button>
      <span class="search-bar__sep" aria-hidden="true"></span>
      <span class="search-bar__media">
        <button type="button" class="search-bar__tool" data-search-image aria-label="${escape(copy.image)}" title="${escape(copy.image)}">${icon("image")}</button>
        <span class="search-bar__thumb" data-search-thumb hidden>
          <button type="button" class="search-bar__retake" data-search-replace aria-label="${escape(copy.replaceImage)}" title="${escape(copy.replaceImage)}"><img alt="${escape(copy.imageAlt())}"></button>
          <button type="button" class="search-bar__unthumb" data-search-remove aria-label="${escape(copy.removeImage())}">${icon("close")}</button>
        </span>
      </span>
      <button type="submit" class="search-bar__tool search-bar__go" aria-label="${escape(copy.search)}" title="${escape(copy.search)}">${icon("search")}</button>
    </form>
  </div>
</div>`;

export function createBar(copy) {
  const template = document.createElement("template");
  template.innerHTML = barMarkup(copy);
  const bar = template.content.firstElementChild;
  const $ = (selector) => bar.querySelector(selector);
  return {
    bar,
    form: $("form"),
    input: $("input"),
    clearText: $("[data-search-clear-text]"),
    imageButton: $("[data-search-image]"),
    thumb: $("[data-search-thumb]"),
    replaceButton: $("[data-search-replace]"),
    removeButton: $("[data-search-remove]"),
    chips: $("[data-search-chips]"),
    hint: $("[data-search-hint]"),
    note: $("[data-search-note]"),
    liveNode: $("[data-search-live]"),
  };
}
