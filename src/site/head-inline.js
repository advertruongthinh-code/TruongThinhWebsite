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
  // Ảnh trong màn hình lên bản gốc sau khi bản vừa khung đã hiện (progressive-loading R10, owner 2026-10-31): tải bản gốc
  // riêng, decode xong mới đổi; chỉ chạy khi trang ngừng cuộn và không ảnh nào trong màn hình còn đang tải, mỗi lượt một ảnh.
  const VARIANT = /-(?:240|480|960|1600|2048)(\.(?:jxl|webp))$/;
  const SCROLL_IDLE_MS = 250;
  const inView = new Set();
  let scrolledAt = 0;
  let upgrading = false;
  let upgradeTimer = 0;
  const visible = (node) => {
    const { top, bottom, width } = node.getBoundingClientRect();
    return width > 0 && bottom > 0 && top < innerHeight;
  };
  const scheduleUpgrade = (wait = SCROLL_IDLE_MS) => {
    if (!upgradeTimer && !upgrading && inView.size) upgradeTimer = setTimeout(upgradeNext, wait);
  };
  // Số ms còn phải chờ trước khi được tải hoặc đổi ảnh; 0 là trang đang rảnh.
  const busyFor = () => {
    const wait = scrolledAt + SCROLL_IDLE_MS - performance.now();
    if (wait > 0 || document.readyState !== "complete" || document.documentElement.classList.contains("has-scroll-scrolling")
      || [...document.images].some((node) => !node.complete && visible(node))) return Math.max(wait, SCROLL_IDLE_MS);
    return 0;
  };
  const upgradeNext = () => {
    upgradeTimer = 0;
    const wait = busyFor();
    if (wait) return scheduleUpgrade(wait);
    let image;
    for (const node of inView) {
      // Filter từ stylesheet là mờ cố định (nền primary): bỏ hẳn. Filter inline là blur card chờ ảnh, ảnh đang ẩn
      // (slide hero chưa tới lượt, opacity 0): đợi lượt sau để không tải 4K cho ảnh người xem không thấy.
      if (getComputedStyle(node).filter !== "none") {
        if (!node.style.filter) {
          upgradeObserver.unobserve(node);
          inView.delete(node);
        }
      } else if (!node.getAnimations().length && (node.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true)) {
        image = node;
        break;
      }
    }
    if (!image) return scheduleUpgrade();
    upgradeObserver.unobserve(image);
    inView.delete(image);
    const original = image.currentSrc.replace(VARIANT, "$1");
    const loader = Object.assign(new Image(), { src: original });
    upgrading = true;
    const done = () => {
      upgrading = false;
      scheduleUpgrade(0);
    };
    // Decode xong lúc trang đã cuộn lại thì chờ rảnh mới đổi: vẽ ảnh 4K lần đầu tốn một frame dài.
    const swap = () => {
      const wait = busyFor();
      if (wait) return setTimeout(swap, wait);
      if (image.isConnected && VARIANT.test(image.currentSrc)) {
        // Trong picture, đổi đúng source trình duyệt đang dùng (JXL); WebP nằm ở chính img.
        const source = original.endsWith(".jxl") && image.parentElement?.querySelector('source[type="image/jxl"]');
        (source || image).srcset = original;
      }
      done();
    };
    loader.decode().then(swap, done);
  };
  const upgradeObserver = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
    if (!target.isConnected) upgradeObserver.unobserve(target);
    if (isIntersecting && VARIANT.test(target.currentSrc)) inView.add(target);
    else inView.delete(target);
    scheduleUpgrade();
  }));
  const watchUpgrade = (image) => VARIANT.test(image.currentSrc) && upgradeObserver.observe(image);
  addEventListener("scroll", () => { scrolledAt = performance.now(); }, { capture: true, passive: true });
  document.addEventListener("load", ({ target }) => {
    if (!isImage(target)) return;
    watchUpgrade(target);
    target.decode().catch(() => {}).then(() => settle(target));
  }, true);
  document.addEventListener("error", ({ target }) => isImage(target) && settle(target, true), true);
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
      if (isImage(image) && image.complete && image.naturalWidth) {
        watchUpgrade(image);
        image.decode().catch(() => {}).then(() => settle(image));
      } else if (isImage(image) && image.complete && image.currentSrc) settle(image, true);
    })))))
    .observe(document, { childList: true, subtree: true, attributeFilter: ["src"] });
})();
