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

export function createMasonryHost(root, { deviceMemory = globalThis.navigator?.deviceMemory } = {}) {
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
  };
  return host;
}
