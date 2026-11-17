// Search bar markup (advertising-search R7, approved prototype variant 1 "Đường kẻ") and the status line.
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
    clearSearch: "Bỏ tìm kiếm",
    searching: "Đang tìm...",
    results: (n, text) => `${n} kết quả cho “${text}”`,
    copyLink: "Sao chép link",
    linkCopied: "Đã chép link",
    empty: "Chưa thấy mẫu phù hợp",
    zalo: "Gửi câu hỏi qua Zalo",
    few: "Chưa đúng ý? Gửi qua Zalo",
    price: "Hỏi giá qua Zalo",
    zaloCopied: "Đã chép nội dung, dán vào khung chat Zalo",
    zaloPaste: "Dán câu hỏi vào khung chat Zalo",
    projects: "Xem công trình nội thất",
    quota: "Không giữ được ảnh khi tải lại trang",
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
    clearSearch: "Clear search",
    searching: "Searching...",
    results: (n, text) => `${n} results for “${text}”`,
    copyLink: "Copy link",
    linkCopied: "Link copied",
    empty: "No matching work yet",
    zalo: "Ask us on Zalo",
    few: "Not quite it? Ask on Zalo",
    price: "Ask for a price on Zalo",
    zaloCopied: "Copied, paste it into the Zalo chat",
    zaloPaste: "Paste your question into the Zalo chat",
    projects: "See interior projects",
    quota: "Images could not be kept for a reload",
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
  <div class="search-bar__status" data-search-status aria-live="polite" hidden></div>
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
    statusNode: bar.querySelector("[data-search-status]"),
  };
}

export function renderStatus(node, lines, closeLabel, onClose) {
  const list = document.createElement("div");
  list.className = "search-bar__lines";
  node.replaceChildren(list);
  node.hidden = !lines.length;
  for (const { text, actions = [] } of lines) {
    const line = document.createElement("p");
    if (text) line.append(Object.assign(document.createElement("span"), { textContent: text }));
    for (const action of actions) {
      const el = document.createElement(action.href ? "a" : "button");
      el.textContent = action.label;
      if (action.href) el.href = action.href;
      else {
        el.type = "button";
        el.addEventListener("click", action.onClick);
      }
      line.append(el);
    }
    list.append(line);
  }
  if (!lines.length || !onClose) return;
  const close = document.createElement("button");
  close.type = "button";
  close.className = "search-bar__close";
  close.setAttribute("aria-label", closeLabel);
  close.innerHTML = icon("close");
  close.addEventListener("click", onClose);
  node.append(close);
}
