// Lưới trang Công trình (projects R2): cùng hình học masonry Advertising (layout-core: lề, gutter, số cột) và cùng engine
// chuyển vị trí masonry-layout 0.4s. Bấm lọc thì card đổi chỗ tại trang, URL đổi sang trang lọc tương ứng (crawl được).
import { advertisingSpacing, columnsForWidth } from "/advertising-products/layout-core.mjs";

const TRANSITION = "0.4s";

// Vị trí card: card hiện đặt lần lượt vào cột thấp nhất, rộng một cột, cao theo tỷ lệ ảnh.
export function placeProjectCards(cards, viewportWidth) {
  const { outer, interCardGap: gap } = advertisingSpacing(viewportWidth);
  const columns = columnsForWidth(viewportWidth);
  const width = (viewportWidth - 2 * outer - (columns - 1) * gap) / columns;
  const heights = Array(columns).fill(0);
  const positions = new Map();
  for (const card of cards) {
    const column = heights.indexOf(Math.min(...heights));
    const height = Math.round(width * card.ratio);
    positions.set(card.id, { x: Math.round(column * (width + gap)), y: heights[column], width: Math.round(width), height });
    heights[column] += height + gap;
  }
  return { positions, height: Math.max(0, Math.max(...heights) - gap) };
}

const matches = (node, filter) => filter === "all" || node.dataset.projectFilters.split(" ").includes(filter);

export function mountProjectGrid(container, { signal } = {}) {
  const grid = container.querySelector("[data-project-masonry]");
  if (!grid) return;
  const nodes = [...grid.querySelectorAll("[data-project-card]")];
  const filters = [...container.querySelectorAll("[data-project-filter]")];
  const kicker = container.querySelector("[data-project-kicker]");
  let current = filters.find((link) => link.getAttribute("aria-current") === "true")?.dataset.projectFilter || "all";
  let positions = new Map();
  let height = 0;
  let masonry;

  const layout = (animate) => {
    const visible = nodes.filter((node) => matches(node, current));
    ({ positions, height } = placeProjectCards(visible.map((node) => ({ id: node.dataset.projectCard, ratio: Number(node.dataset.ratio) })), document.documentElement.clientWidth));
    for (const node of nodes) {
      const place = positions.get(node.dataset.projectCard);
      const wasHidden = node.hidden;
      node.hidden = !place;
      if (!place) continue;
      node.style.width = `${place.width}px`;
      node.style.height = `${place.height}px`;
      // Card mới hiện đứng sẵn tại chỗ, chỉ card đang hiện mới trượt.
      if (!animate || wasHidden || !masonry) {
        node.style.left = `${place.x}px`;
        node.style.top = `${place.y}px`;
      }
    }
    grid.style.height = `${height}px`;
    grid.classList.add("is-laid-out");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (animate && !reduced && typeof window.Masonry === "function") {
      masonry ??= Object.assign(new window.Masonry(grid, { itemSelector: "[data-project-card]", initLayout: false, resize: false, transitionDuration: TRANSITION, stagger: 0 }), {
        _getItemLayoutPosition: (item) => positions.get(item.element.dataset.projectCard) || { x: 0, y: 0 },
        _getContainerSize: () => ({ height }),
      });
      masonry.reloadItems();
      masonry.layout();
    } else if (masonry) {
      // Không motion: bỏ transform còn lại của Masonry, ghi thẳng vị trí.
      for (const node of nodes) {
        const place = positions.get(node.dataset.projectCard);
        if (place) Object.assign(node.style, { left: `${place.x}px`, top: `${place.y}px`, transform: "" });
      }
    }
    window.dispatchEvent(new CustomEvent("site:layout"));
  };

  const select = (filter, { push } = {}) => {
    const link = filters.find((item) => item.dataset.projectFilter === filter);
    if (!link || filter === current) return;
    current = filter;
    for (const item of filters) item.setAttribute("aria-current", String(item === link));
    if (kicker) kicker.textContent = (document.documentElement.lang === "en" ? link.dataset.kickerEn : link.dataset.kickerVi) || kicker.textContent;
    document.title = (document.documentElement.lang === "en" ? link.dataset.titleEn : link.dataset.titleVi) || document.title;
    if (push) history.pushState({ ttProjectFilter: filter }, "", link.href);
    layout(true);
  };

  for (const link of filters) {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      select(link.dataset.projectFilter, { push: true });
    }, { signal });
  }
  window.addEventListener("popstate", () => {
    const path = location.pathname;
    const link = filters.find((item) => new URL(item.href).pathname === path);
    if (link) select(link.dataset.projectFilter);
  }, { signal });
  let resizeFrame = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => layout(false));
  }, { signal });
  signal?.addEventListener("abort", () => {
    cancelAnimationFrame(resizeFrame);
    masonry?.destroy?.();
  });
  layout(false);
}
