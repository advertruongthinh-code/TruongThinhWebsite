// CMS core shared by the editor and the preview (cms-editor R3, R4, R8). Classic script, not a module: the preview
// loads it synchronously at the end of <body>, while the DOM still has source order, before the hero shuffle module and the site's deferred scripts.
(() => {
  // Lists that can be added to, removed from and reordered per page (R4): [container, item, label, shuffled]. Shuffled lists (hero, page-home
  // R3) change order on every load so they only allow add and remove.
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
  // The marquee's aria-hidden copy: not edited on its own, rebuilt from the preceding group after each draft apply.
  const MIRRORS = '.marquee-line[aria-hidden="true"], .client-logo-marquee__group[aria-hidden="true"]';
  const PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="100%" height="100%" fill="#e9e6df"/>'
    + '<text x="50%" y="50%" font-family="sans-serif" font-size="64" fill="#b3261e" text-anchor="middle">Chọn ảnh</text></svg>',
  )}`;

  const isText = (node) => node.hasAttribute("data-en")
    || (!node.children.length && node.textContent.trim() && !node.closest("script, style, svg"));

  // Attach keys by source order inside <main>; the editor (DOMParser) and the preview (real DOM) produce the same keys.
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
      // A new image has no JXL variant, srcset: drop <source> and srcset so the browser shows exactly the chosen file.
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

  // A new item is cloned from the original item: child keys get an @id suffix, text and image are left blank (R4).
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

  // The original anchor of a key (R10): for a list it is the item count, for an image the path, for text the whitespace-collapsed text. The editor (DOMParser)
  // writes the anchor at edit time, the Worker (linkedom) compares it with the source HTML at save and at serve time; a key pointing elsewhere makes the anchor mismatch.
  function anchorOf(doc, key) {
    if (/^l\d/.test(key)) return doc.querySelectorAll(`[data-cms-list="${key}"] > [data-cms-item]`).length || undefined;
    const node = doc.querySelector(`[data-cms-key="${key}"]`);
    if (!node) return undefined;
    if (node.tagName === "IMG") return node.getAttribute("data-src") || node.getAttribute("src") || "";
    return (node.tagName === "META" ? node.getAttribute("content") || "" : node.textContent).replace(/\s+/g, " ").trim();
  }

  // Apply the draft to the document: lists first so keys of new items exist, then text, images, marquee copies.
  function apply(doc, draft, locale) {
    if (!draft) return;
    Object.entries(draft.list || {}).forEach(([key, order]) => applyList(doc, key, order, draft.clone || {}, locale));
    Object.entries(draft.text || {}).forEach(([key, value]) => setText(doc, key, value, locale));
    Object.entries(draft.image || {}).forEach(([key, value]) => setImage(doc, key, value, locale));
    mirror(doc);
  }

  // Patch the Advertising Products catalog by card edits (R7). The runtime receives a Promise through the existing hook
  // window.__TT_ADVERTISING_ARTIFACT__; the function is self-contained (uses no outer variables) because the Worker inlines its source into
  // the public page (R10). Changing the main product means changing the cluster: the card gets the last sourceOrder of the new cluster, rank is rearranged by the runtime.
  // Does not load catalog-detail.mjs (heavy): the runtime still loads it lazily and only attaches the card fields that are missing (related of an edited card).
  async function patchCatalog(edits) {
    const [{ default: base }, { scheduleRank }] = await Promise.all(
      ["/advertising-products/catalog-artifact.mjs", "/masonry/layout.mjs"].map((href) => import(href)),
    );
    const clusterOf = new Map(base.products.map((product) => [product.id, product.cluster]));
    const nextOrder = new Map();
    base.cards.forEach((card) => nextOrder.set(card.category, Math.max(nextOrder.get(card.category) ?? 0, card.sourceOrder + 1)));
    let moved = false;
    const cards = base.cards.map((card) => {
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
    return { ...base, cards: moved ? scheduleRank(cards, base.categories.map((entry) => entry.slug)) : cards };
  }

  // Draft (unsaved) and saved copy (cache of GET /api/admin/content, R8): the preview applies the draft, falling back to the saved copy.
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

  // globalThis: the Worker (no window) loads the same file to apply saved content exactly like the preview (R10).
  globalThis.TTCms = { LISTS, PLACEHOLDER, stamp, apply, setText, mirror, anchorOf, patchCatalog, draftKey, savedKey, readDraft, readSaved };

  // Preview in the /admin/ iframe: attach keys, apply the draft, then load the overlay. Outside the admin iframe do nothing.
  if (typeof document === "undefined") return;
  const boot = document.currentScript?.dataset.cmsBoot;
  if (!boot || !window.frameElement?.hasAttribute("data-cms-preview")) return;
  const locale = document.documentElement.dataset.routeLocale === "en" ? "en" : "vi";
  const edits = readDraft(boot) ?? readSaved(boot);
  globalThis.TTCms.page = boot;
  // Advertising Products page: only card edits (R7), the runtime builds cards from the patched catalog; other pages attach keys and apply the draft.
  if (boot === "advertising") window.__TT_ADVERTISING_ARTIFACT__ = patchCatalog(edits?.cards);
  else {
    stamp(document, boot);
    apply(document, edits, locale);
  }
  // Keep the Locomotive instance so the overlay scrolls to the spot being edited after reload (smooth scroll ignores scrollIntoView).
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
