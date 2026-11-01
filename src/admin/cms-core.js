// Lõi CMS dùng chung cho editor và bản xem trước (cms-editor R3, R4, R8). Script classic, không module: bản xem trước
// nạp nó đồng bộ cuối <body>, lúc DOM còn đúng thứ tự nguồn, trước module xáo hero và script defer của site.
(() => {
  // Danh sách thêm, xóa, sắp lại được theo trang (R4): [container, item, nhãn, xáo]. Danh sách xáo (hero, page-home
  // R3) đổi thứ tự mỗi lần tải nên chỉ thêm, xóa.
  const LISTS = {
    home: [
      [".hero-slides", ".hero-slide", "Ảnh hero", true],
      [".project-track", ".project-card", "Rail công trình"],
      [".client-logo-marquee__group:not([aria-hidden])", ".client-logo-slot", "Logo khách hàng"],
    ],
    residential: [
      [".hero-slides", ".hero-slide", "Ảnh hero", true],
      [".detail-gallery__slides", ".detail-gallery__item", "Gallery công trình"],
    ],
    about: [
      [".about-timeline", ".about-timeline__item", "Dòng thời gian"],
      [".about-commitments", ".about-commitment", "Cam kết"],
    ],
  };
  LISTS.commercial = LISTS.residential;
  // Bản sao aria-hidden của marquee: không sửa riêng, dựng lại từ nhóm đứng trước sau mỗi lần áp nháp.
  const MIRRORS = '.marquee-line[aria-hidden="true"], .client-logo-marquee__group[aria-hidden="true"]';
  const PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="100%" height="100%" fill="#e9e6df"/>'
    + '<text x="50%" y="50%" font-family="sans-serif" font-size="64" fill="#b3261e" text-anchor="middle">Chọn ảnh</text></svg>',
  )}`;

  const isText = (node) => node.hasAttribute("data-en")
    || (!node.children.length && node.textContent.trim() && !node.closest("script, style, svg"));

  // Gắn khóa theo thứ tự nguồn trong <main>; editor (DOMParser) và bản xem trước (DOM thật) ra cùng khóa.
  function stamp(doc, page) {
    const main = doc.querySelector("main");
    if (!main) return;
    doc.querySelector("title")?.setAttribute("data-cms-key", "title");
    doc.querySelector('meta[name="description"]')?.setAttribute("data-cms-key", "description");
    const own = (node) => !node.closest(MIRRORS);
    let t = 0;
    let i = 0;
    main.querySelectorAll("*").forEach((node) => {
      if (!own(node)) return;
      if (node.tagName === "IMG") node.dataset.cmsKey = `i${i++}`;
      else if (isText(node)) node.dataset.cmsKey = `t${t++}`;
    });
    (LISTS[page] || []).forEach(([container, item, label, shuffled], index) => {
      const box = main.querySelector(container);
      if (!box) return;
      box.dataset.cmsList = `l${index}`;
      box.dataset.cmsLabel = label;
      if (shuffled) box.dataset.cmsShuffled = "";
      [...box.children].filter((child) => child.matches(item)).forEach((child, n) => (child.dataset.cmsItem = String(n)));
    });
  }

  const nodes = (doc, key) => doc.querySelectorAll(`[data-cms-key="${key}"]`);

  function setText(doc, key, { vi, en }, locale) {
    const value = locale === "en" ? en : vi;
    if (key === "title") doc.title = value;
    nodes(doc, key).forEach((node) => {
      if (node.tagName === "META") {
        node.setAttribute("content", value);
        node.setAttribute("data-en-content", en);
        return;
      }
      node.dataset.vi = vi;
      node.dataset.en = en;
      node.textContent = value;
      node.toggleAttribute("data-cms-empty", !value.trim());
    });
  }

  function setImage(doc, key, image, locale) {
    nodes(doc, key).forEach((img) => {
      // Ảnh mới không có biến thể JXL, srcset: bỏ <source> và srcset để trình duyệt hiện đúng file đã chọn.
      if (img.parentElement?.tagName === "PICTURE") img.parentElement.querySelectorAll("source").forEach((s) => s.remove());
      ["srcset", "data-srcset", "sizes", "data-sizes"].forEach((name) => img.removeAttribute(name));
      img.setAttribute(img.hasAttribute("data-src") ? "data-src" : "src", image.src || PLACEHOLDER);
      if (image.width) img.setAttribute("width", image.width);
      if (image.height) img.setAttribute("height", image.height);
      img.setAttribute("alt", (locale === "en" ? image.altEn : image.altVi) || "");
      img.setAttribute("data-en-alt", image.altEn || "");
      img.setAttribute("data-vi-alt", image.altVi || "");
      img.toggleAttribute("data-cms-empty", !image.src);
    });
  }

  // Mục mới clone từ mục gốc: khóa con thêm hậu tố @id, chữ và ảnh để trống (R4).
  function cloneItem(template, id, locale) {
    const clone = template.cloneNode(true);
    clone.dataset.cmsItem = id;
    clone.classList.remove("is-active");
    clone.querySelectorAll("[data-cms-key]").forEach((node) => {
      node.dataset.cmsKey = `${node.dataset.cmsKey.split("@")[0]}@${id}`;
      if (node.tagName === "IMG") setImage(clone, node.dataset.cmsKey, {}, locale);
      else setText(clone, node.dataset.cmsKey, { vi: "", en: "" }, locale);
    });
    return clone;
  }

  function applyList(doc, key, order, clones, locale) {
    const box = doc.querySelector(`[data-cms-list="${key}"]`);
    if (!box) return;
    const items = new Map([...box.children].filter((c) => c.dataset.cmsItem != null).map((c) => [c.dataset.cmsItem, c]));
    const marker = doc.createComment("cms");
    box.insertBefore(marker, items.values().next().value ?? null);
    items.forEach((item) => item.remove());
    order.forEach((id) => {
      const template = items.get(clones[id] ?? id);
      if (template) box.insertBefore(items.has(id) ? template : cloneItem(template, id, locale), marker);
    });
    marker.remove();
    box.querySelectorAll(":scope > .hero-slide").forEach((slide, n) => slide.classList.toggle("is-active", !n));
  }

  function mirror(doc) {
    doc.querySelectorAll(MIRRORS).forEach((copy) => {
      const source = copy.previousElementSibling;
      if (!source) return;
      copy.replaceChildren(...[...source.children].map((child) => {
        const clone = child.cloneNode(true);
        [clone, ...clone.querySelectorAll("*")].forEach((node) => {
          ["data-cms-key", "data-cms-item", "data-cms-empty"].forEach((name) => node.removeAttribute(name));
          if (node.tagName === "IMG") node.setAttribute("alt", "");
        });
        return clone;
      }));
    });
  }

  // Áp nháp lên document: danh sách trước để khóa của mục mới tồn tại, rồi chữ, ảnh, bản sao marquee.
  function apply(doc, draft, locale) {
    if (!draft) return;
    Object.entries(draft.list || {}).forEach(([key, order]) => applyList(doc, key, order, draft.clone || {}, locale));
    Object.entries(draft.text || {}).forEach(([key, value]) => setText(doc, key, value, locale));
    Object.entries(draft.image || {}).forEach(([key, value]) => setImage(doc, key, value, locale));
    mirror(doc);
  }

  // Vá catalog Sản phẩm Quảng cáo theo sửa đổi card (R7). Runtime nhận Promise qua hook có sẵn
  // window.__TT_ADVERTISING_ARTIFACT__; hàm tự chứa (không dùng biến ngoài) vì Worker chèn nguyên mã nguồn của nó vào
  // trang public (R10). Đổi sản phẩm chính là đổi cụm: card nhận sourceOrder cuối cụm mới, hạng xếp lại theo runtime.
  async function patchCatalog(edits) {
    const dir = "/advertising-products/";
    const [{ default: base }, { default: detail }, { scheduleAdvertisingRank }] = await Promise.all(
      ["catalog-artifact", "catalog-detail", "layout-core"].map((name) => import(`${dir}${name}.mjs`)),
    );
    const clusterOf = new Map(base.products.map((product) => [product.id, product.cluster]));
    const nextOrder = new Map();
    base.cards.forEach((card) => nextOrder.set(card.category, Math.max(nextOrder.get(card.category) ?? 0, card.sourceOrder + 1)));
    let moved = false;
    const cards = base.cards.map((source) => {
      const card = { ...source, ...detail[source.id] };
      const edit = edits?.[card.id];
      if (!edit) return card;
      const media = edit.mediaItems.find((item) => item.id === edit.coverMediaId) ?? edit.mediaItems[0];
      const category = clusterOf.get(edit.productIds[0]) ?? card.category;
      const next = {
        ...card,
        titleVi: edit.titleVi,
        titleEn: edit.titleEn,
        descriptionVi: edit.descriptionVi,
        descriptionEn: edit.descriptionEn,
        productIds: edit.productIds,
        clusterIds: edit.productIds.map((id) => clusterOf.get(id)),
        tagIds: [...edit.productIds, ...(card.tagIds || []).filter((id) => !card.productIds?.includes(id))],
        mediaItems: edit.mediaItems,
        coverMediaId: media.id,
        media,
        category,
      };
      if (category !== card.category) {
        moved = true;
        next.sourceOrder = nextOrder.get(category) ?? 0;
        nextOrder.set(category, next.sourceOrder + 1);
      }
      return next;
    });
    return { ...base, cards: moved ? scheduleAdvertisingRank(cards, base.categories.map((entry) => entry.slug)) : cards };
  }

  // Nháp (chưa lưu) và bản đã lưu (cache của GET /api/admin/content, R8): bản xem trước áp nháp, không có thì bản đã lưu.
  const draftKey = (page) => `tt-cms-draft:${page}`;
  const savedKey = (page) => `tt-cms-saved:${page}`;
  const read = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  };
  const readDraft = (page) => read(draftKey(page));
  const readSaved = (page) => read(savedKey(page));

  // globalThis: Worker (không có window) nạp cùng file để áp nội dung đã lưu y như bản xem trước (R10).
  globalThis.TTCms = { LISTS, PLACEHOLDER, stamp, apply, setText, mirror, patchCatalog, draftKey, savedKey, readDraft, readSaved };

  // Bản xem trước trong iframe của /admin/: gắn khóa, áp nháp, rồi nạp overlay. Ngoài iframe admin thì không làm gì.
  if (typeof document === "undefined") return;
  const boot = document.currentScript?.dataset.cmsBoot;
  if (!boot || !window.frameElement?.hasAttribute("data-cms-preview")) return;
  const locale = document.documentElement.dataset.routeLocale === "en" ? "en" : "vi";
  const edits = readDraft(boot) ?? readSaved(boot);
  globalThis.TTCms.page = boot;
  // Trang Sản phẩm Quảng cáo: chỉ sửa card (R7), runtime dựng card từ catalog đã vá; trang khác gắn khóa và áp nháp.
  if (boot === "advertising") window.__TT_ADVERTISING_ARTIFACT__ = patchCatalog(edits?.cards);
  else {
    stamp(document, boot);
    apply(document, edits, locale);
  }
  // Giữ instance Locomotive để overlay cuộn tới chỗ đang sửa sau khi tải lại (smooth scroll bỏ qua scrollIntoView).
  let Loco;
  Object.defineProperty(window, "LocomotiveScroll", {
    configurable: true,
    get: () => Loco,
    set(Base) {
      Loco = class extends Base {
        constructor(options) {
          super(options);
          window.__ttCmsScroll = this;
        }
      };
    },
  });
  document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href: "/admin/overlay.css" }));
  document.body.append(Object.assign(document.createElement("script"), { src: "/admin/overlay.js" }));
})();
