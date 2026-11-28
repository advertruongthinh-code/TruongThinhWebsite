// Overlay inside the preview iframe (cms-editor R3, CMS plan E13): select a block by click, outline hover and selection, show a
// media that has no variant yet by its original with the crop applied in CSS, and keep links from leaving the page.
// The parent loads this file into the iframe after each render; it talks to window.parent.TTPreview.
(() => {
  const parent = window.parent?.TTPreview;
  if (!parent) return;
  const blockOf = (node) => node.closest?.("[data-block-index]");
  let hovered = null;

  const mark = (node, name, on) => node?.classList.toggle(name, on);
  document.addEventListener("pointerover", (event) => {
    if (!parent.editMode()) return;
    mark(hovered, "tt-hover", false);
    hovered = blockOf(event.target);
    mark(hovered, "tt-hover", true);
  });
  // Capture phase: in edit mode a click selects and never navigates; in view mode only links that leave the page are stopped.
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (parent.editMode()) {
      event.preventDefault();
      event.stopPropagation();
      const block = blockOf(event.target);
      parent.select(block ? Number(block.dataset.blockIndex) : null);
    } else if (link && !link.getAttribute("href").startsWith("#")) {
      event.preventDefault();
      parent.blocked(link.getAttribute("href"));
    }
  }, true);

  // Focus inside the iframe must not take Ctrl+Z away from the editor.
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "z") {
      event.preventDefault();
      parent.undo();
    }
  });

  // Selected block: outline it, and scroll it to the middle when the editor asks.
  window.TTOverlay = {
    select(index, { scroll = false } = {}) {
      for (const node of document.querySelectorAll(".tt-selected")) node.classList.remove("tt-selected");
      const node = index === null ? null : document.querySelector(`[data-block-index="${index}"]`);
      mark(node, "tt-selected", true);
      if (node && scroll) node.scrollIntoView({ block: "center" });
    },
  };

  // media-file shows the original; the crop rides in the URL fragment as "#crop=x,y,w,h" and is applied with object-view-box.
  const crop = (img) => {
    const [x, y, w, h] = (/#crop=([\d,]+)/.exec(img.src)?.[1] ?? "").split(",").map(Number);
    if (!(w > 0 && img.naturalWidth)) return;
    img.style.objectViewBox = `inset(${y}px ${img.naturalWidth - x - w}px ${img.naturalHeight - y - h}px ${x}px)`;
    img.closest("picture, figure, div")?.classList.add("tt-original");
  };
  for (const img of document.querySelectorAll('img[src*="/api/admin/media-file"]')) {
    if (img.complete) crop(img);
    else img.addEventListener("load", () => crop(img), { once: true });
  }
  parent.ready(window);
})();
