// Sân masonry (masonry-reuse bước 7): state dựng theo cửa sổ cuộn của một lưới. Masonry chính (Advertising, Công trình)
// và related ở detail là hai instance, nên ngân sách dựng, card tạm và hàng chờ LRU chỉ viết một lần (advertising-masonry R7).
import { createDetachedCards, createGhostLayer, createMountBudget, detachedCapacity } from "./mount-budget.mjs";

// Card nào được dựng thật trong frame này: card bắt buộc luôn dựng; còn lại card trong hàng chờ trước (gắn lại rẻ hơn
// dựng mới), rồi gần giữa màn hình trước, tối đa `quota` card. Vuốt rất nhanh (`fast`) thì chỉ dựng card bắt buộc.
export function pickMounts({ missing, mustMount = () => false, distance, queued = () => false, fast = false, quota }) {
  const forced = missing.filter(mustMount);
  const rest = missing.filter((id) => !mustMount(id))
    .sort((a, b) => (queued(b) - queued(a)) || distance(a) - distance(b));
  return new Set([...forced, ...rest.slice(0, fast ? 0 : quota())]);
}

// Masonry 4.2.2 chỉ lo motion: vị trí lấy từ `positions` đã tính, không tự xếp, không tự layout khi resize.
function createMasonry(grid, positions, getHeight, { itemSelector = ".advertising-tile", getId = (node) => node.dataset.advertisingCard } = {}) {
  const masonry = new window.Masonry(grid, {
    itemSelector,
    initLayout: false,
    resize: false,
    transitionDuration: "0.4s",
    stagger: 0,
  });
  masonry._getItemLayoutPosition = (item) => positions.get(getId(item.element)) || { x: 0, y: 0 };
  masonry._getContainerSize = () => ({ height: getHeight() });
  // Outlayer đọc vị trí đầu bằng getComputedStyle rồi ghi transition cho từng card, nên mỗi card ép một lượt style
  // (rAF Masonry 46-66ms trên A04s). Runtime đã ghi left/top inline bằng px; motion chỉ chạy trên transform nên
  // inline trùng computed. Card chưa có vị trí inline vẫn đọc computed như cũ.
  const itemize = masonry._itemize;
  masonry._itemize = function (elements) {
    const items = itemize.call(this, elements);
    for (const item of items) {
      const readComputed = item.getPosition;
      item.getPosition = function () {
        const { left, top } = this.element.style;
        if (!left.endsWith("px") || !top.endsWith("px")) return readComputed.call(this);
        this.position.x = parseFloat(left) - this.layout.size.paddingLeft;
        this.position.y = parseFloat(top) - this.layout.size.paddingTop;
      };
    }
    return items;
  };
  return masonry;
}

// Lượt co giãn cỡ card (morphSize) chạy trên con của card bằng `scale`.
export const isSizeMorph = (animation) => Boolean(animation.effect?.getKeyframes?.()[0]?.scale);

// Dừng transition Masonry và lượt co giãn đang chạy, đặt card ngay ở chỗ đích.
export function cancelMasonryTransitions(instance) {
  instance?.items.forEach((item) => {
    for (const child of item.element.children) child.getAnimations().forEach((animation) => isSizeMorph(animation) && animation.cancel());
    item.disableTransition();
    item._transn.ingProperties = {};
    item._transn.clean = {};
    item._transn.onEnd = {};
    item.element.style.transform = "";
    item.layoutPosition();
  });
}

// `create(placement)` dựng card mới; `attach(node, placement)` gắn observer và style chung khi card vào sân (mới hoặc từ
// hàng chờ); `detach(id, node, queue)` gỡ card khỏi DOM, giữ vào `queue` nếu còn dùng lại được; `color(card)` là màu
// card tạm; `masonry` là option Masonry riêng của sân (`itemSelector`, `getId`).
export function createMasonryHost(root, { create, attach = () => {}, detach, color = () => undefined, masonry = {},
  deviceMemory = globalThis.navigator?.deviceMemory } = {}) {
  const host = {
    root,
    // Card đang trong DOM và tọa độ của chúng theo id.
    rendered: new Map(),
    positions: new Map(),
    // Media đang hiện của card nhiều media: card dựng lại mở đúng media đó.
    mediaById: new Map(),
    ghosts: createGhostLayer(root),
    budget: createMountBudget(),
    // Card vừa gỡ mà ảnh còn giải mã, sức chứa theo RAM máy (R7, V4).
    detached: createDetachedCards(detachedCapacity(deviceMemory)),
    ghostFrame: 0,
    // Chiều cao sân theo layout; Masonry đọc nó làm cỡ container.
    pixelHeight: 0,
    // Masonry chỉ chạy motion layout; tạo khi cần lần đầu. rAF trước lượt motion và hẹn kết thúc lượt.
    masonry: null,
    motionFrame: 0,
    motionTimer: 0,
    // Một lượt motion layout: card trượt từ chỗ đang đứng tới `positions` trong 0.4s; `instant(element)` đặt thẳng.
    layoutMotion(instant) {
      host.masonry ||= createMasonry(root, host.positions, () => host.pixelHeight, masonry);
      // Thiếu option này Outlayer coi lần layout đầu là tức thì: lần dựng đầu mất motion từ đầu cột.
      host.masonry.options.layoutInstant = false;
      host.masonry.options.transitionDuration = "0.4s";
      host.masonry.reloadItems();
      host.masonry.items.forEach((item) => { item.isLayoutInstant = instant(item.element); });
      host.masonry.layout();
    },
    cancelTransitions: () => cancelMasonryTransitions(host.masonry),
    // Hủy lượt motion đã hẹn (rAF và hẹn kết thúc) rồi đặt card ngay ở đích.
    stopMotion() {
      if (host.motionFrame) cancelAnimationFrame(host.motionFrame);
      if (host.motionTimer) clearTimeout(host.motionTimer);
      host.motionFrame = 0;
      host.motionTimer = 0;
      host.cancelTransitions();
    },
    // Còn card tạm chờ dựng: hẹn một lượt dựng ở frame sau, không dựng dồn trong một frame.
    scheduleGhosts(render) {
      host.ghostFrame ||= requestAnimationFrame(() => {
        host.ghostFrame = 0;
        render();
      });
    },
    cancelGhosts() {
      if (host.ghostFrame) cancelAnimationFrame(host.ghostFrame);
      host.ghostFrame = 0;
    },
    pickMounts: ({ missing, mustMount, distance, fast }) => pickMounts({
      missing, mustMount, distance, fast, queued: (id) => host.detached.has(id), quota: host.budget.quota,
    }),
    // Card của placement: đã dựng thì trả node; chưa thì gắn lại từ hàng chờ hoặc dựng mới, rồi gắn vào `parent`.
    ensure(placement, parent = root) {
      const id = placement.card.id;
      let node = host.rendered.get(id);
      if (node) return node;
      node = host.detached.take(id) || create(placement);
      host.rendered.set(id, node);
      attach(node, placement);
      parent.append(node);
      return node;
    },
    // Một lượt dựng của cửa sổ cuộn: card đã có bỏ card tạm; card chưa tới lượt (`allowed`) hiện card tạm; card tới
    // lượt gắn lại hoặc dựng mới, crossfade lên card tạm của nó. Thời gian dựng vào ngân sách; còn card tạm thì hẹn
    // `render` ở frame sau. Trả các cặp `[node, placement]` vừa vào sân.
    mount(placements, { allowed = null, render } = {}) {
      const created = [];
      const fragment = document.createDocumentFragment();
      let mountMs = 0;
      for (const placement of placements) {
        const id = placement.card.id;
        if (host.rendered.has(id)) {
          host.ghosts.drop(id);
          continue;
        }
        if (allowed && !allowed.has(id)) {
          host.ghosts.show(id, placement, color(placement.card));
          continue;
        }
        const start = performance.now();
        const reattached = host.detached.has(id);
        const node = host.ensure(placement, fragment);
        // Card gắn lại đã có ảnh nên không cần card tạm để crossfade.
        if (reattached) host.ghosts.drop(id);
        else node.advertisingGhost = host.ghosts.take(id);
        mountMs += performance.now() - start;
        created.push([node, placement]);
      }
      if (created.length) {
        const start = performance.now();
        root.append(fragment);
        host.budget.record(created.length, mountMs + performance.now() - start);
      }
      if (render && placements.some((placement) => host.ghosts.has(placement.card.id))) host.scheduleGhosts(render);
      return created;
    },
    // Gỡ card ngoài `keep`, trừ card đang giữ focus; `queue` false thì không giữ vào hàng chờ (hình học hoặc phạm vi đổi).
    release(keep, { queue = true } = {}) {
      for (const [id, node] of host.rendered) {
        if (keep.has(id) || node.contains(document.activeElement)) continue;
        detach(id, node, queue ? host.detached : null);
        host.rendered.delete(id);
      }
    },
  };
  return host;
}
