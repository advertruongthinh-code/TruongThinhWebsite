// Script chèn inline vào <head> của mọi trang lúc build (prepare-static-assets.mjs thay <!-- head-inline -->).
// Một nguồn cho 6 trang để không phân mảnh (progressive-loading R7).
try {
  // Mỗi lần tải trực tiếp (link, reload, Back/Forward) đều chạy pha enter của route-transition.
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("route-enter");
  }
  const routeLocale = document.documentElement.dataset.routeLocale;
  document.documentElement.lang = routeLocale === "en" ? "en" : "vi";
} catch {}
// Khung ảnh giữ vệt sáng tới khi ảnh load và decode xong; nghe từ head nên không sót event của ảnh nào.
document.documentElement.classList.add("media-gate");
(() => {
  // failed: ảnh lỗi tải thì khung nhận thêm .is-media-error để CSS vẽ dấu báo lỗi (media-delivery R8).
  const settle = (image, failed = false) => {
    const parent = image.parentElement;
    const frame = parent?.tagName === "PICTURE" ? parent.parentElement : parent;
    parent?.classList.add("is-media-settled");
    frame?.classList.add("is-media-settled");
    frame?.classList.toggle("is-media-error", failed);
  };
  const isImage = (target) => target.tagName === "IMG";
  // Khung chờ là cha của ảnh nội dung (hoặc của picture), trừ grid, photo view, viewer "Xem lớn hơn" của Advertising và dải logo khách:
  // gắn class khi ảnh vào DOM thay cho selector :has() toàn trang, vốn làm mỗi lần tính style chậm thêm khoảng 1/4.
  const markFrame = (image) => {
    if (!image.getAttribute("src")?.startsWith("/assets/content/")) return;
    const parent = image.parentElement;
    const frame = parent?.tagName === "PICTURE" ? parent.parentElement : parent;
    if (frame && !frame.closest("[data-project-grid], [data-advertising-photo-view], [data-advertising-photo-dialog], .client-logo-marquee")) frame.classList.add("media-frame");
  };
  document.addEventListener("load", ({ target }) => isImage(target) && target.decode().catch(() => {}).then(() => settle(target)), true);
  document.addEventListener("error", ({ target }) => isImage(target) && settle(target, true), true);
  // Service Worker báo ảnh JXL đủ ngưỡng (progressive-loading R3) thì settle sớm, trình duyệt vẽ nét dần tới hết file.
  // Chỉ Chromium vẽ JXL dần nên chỉ Chromium đăng ký; trình duyệt khác settle khi load và decode như cũ.
  if (navigator.userAgentData && navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener("message", ({ data }) => document.querySelectorAll("img").forEach((image) => {
      if (image.currentSrc && new URL(image.currentSrc).pathname === data?.url) settle(image);
    }));
    navigator.serviceWorker.startMessages();
    addEventListener("load", () => requestIdleCallback(() => navigator.serviceWorker.register("/sw.js").catch(() => {})), { once: true });
  }
  // sizes theo phần ảnh hiện ra sau crop cover (media-delivery R2). ResizeObserver chạy sau layout,
  // trước khi lazy load bắt đầu tải, và chạy lại khi khung đổi cỡ; chỉ nâng variant, không hạ.
  const fit = new ResizeObserver((entries) => entries.forEach(({ target: image }) => {
    const { width, height } = image.getBoundingClientRect();
    const ratio = image.getAttribute("width") / image.getAttribute("height");
    const needed = Math.ceil(getComputedStyle(image).objectFit === "cover" && ratio > 0 ? Math.max(width, height * ratio) : width);
    const loaded = image.currentSrc.replace(/\.\w+$/, "");
    if (!width || (loaded && (loaded === image.src.replace(/\.\w+$/, "") || loaded.match(/-(\d+)$/)?.[1] >= needed * devicePixelRatio))) return;
    [image, image.previousElementSibling].forEach((node) => node?.setAttribute("sizes", `${needed}px`));
  }));
  const fitted = 'picture > img[loading="lazy"], picture > img[data-srcset]';
  // Container Barba dựng ngoài document nên ảnh có thể load xong trước khi gắn vào, event load không tới document;
  // ảnh như vậy được settle ngay khi gắn vào.
  // Ảnh data-src nhận src khi hydrate (slide hero) thì lúc đó khung mới có vệt.
  new MutationObserver((records) => records.forEach(({ target, addedNodes }) => (isImage(target) ? markFrame(target) : addedNodes.forEach((node) => node.nodeType === 1
    && [node, ...node.querySelectorAll("img")].forEach((image) => {
      if (isImage(image)) markFrame(image);
      if (image.matches(fitted)) fit.observe(image);
      if (isImage(image) && image.complete && image.naturalWidth) image.decode().catch(() => {}).then(() => settle(image));
      else if (isImage(image) && image.complete && image.currentSrc) settle(image, true);
    })))))
    .observe(document, { childList: true, subtree: true, attributeFilter: ["src"] });
})();
