// Ngân sách dựng card khi cuộn và card tạm (ghost) giữ chỗ cho card chưa dựng kịp (advertising-masonry R7).
import { mountQuota } from "./layout-core.mjs";

export const GHOST_FADE_MS = 450;
export const GHOST_FADE_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
const BREATHE_MS = 2000;
// Vuốt trên một viewport mỗi 100ms thì chỉ giữ chỗ, không dựng card thật.
const FAST_VIEWPORTS_PER_S = 10;
const JUMP_VIEWPORTS = 2;
// Một phần ba khoảng frame là phần của việc dựng card; phần còn lại cho style, layout, paint.
const BUDGET_SHARE = 1 / 3;
const MIN_FRAME_MS = 8;
const MAX_FRAME_MS = 34;
const INITIAL_COST_MS = 3;

// Mọi phần tử đang thở dùng chung pha: delay âm bằng thời điểm hiện tại theo chu kỳ, nên card tạm đổi sang card mờ
// không nhảy độ sáng.
export const breathePhase = (now = performance.now()) => `${-(now % BREATHE_MS)}ms`;

// Chi phí một card và nhịp frame đo ngay trên máy; hàm thuần theo đồng hồ truyền vào để test.
export function createMountBudget(clock = () => performance.now()) {
  let costMs = INITIAL_COST_MS;
  let frameMs = 1000 / 60;
  let sample = null;
  const smooth = (previous, next) => previous + (next - previous) * 0.2;
  return {
    // Gọi mỗi lần cửa sổ được xét; trả về true khi đang vuốt rất nhanh.
    begin(y, viewportHeight) {
      const now = clock();
      let fast = false;
      if (sample) {
        const elapsed = now - sample.time;
        // Hai lần gọi trong cùng một frame không nói gì về nhịp frame; quãng nghỉ dài là cuộn đã dừng.
        if (elapsed >= 4 && elapsed < 100) frameMs = smooth(frameMs, Math.min(MAX_FRAME_MS, Math.max(MIN_FRAME_MS, elapsed)));
        const distance = Math.abs(y - sample.y);
        // Một cú nhảy xa (kéo thanh cuộn, về chỗ cũ) cũng là vuốt nhanh dù sau quãng nghỉ dài: nội dung cũ không còn dùng.
        fast = elapsed > 0 && (distance / elapsed * 1000 > viewportHeight * FAST_VIEWPORTS_PER_S || distance > viewportHeight * JUMP_VIEWPORTS);
      }
      sample = { y, time: now };
      return fast;
    },
    quota: () => mountQuota({ budgetMs: frameMs * BUDGET_SHARE, costMs }),
    record(count, elapsedMs) {
      if (count > 0) costMs = smooth(costMs, elapsedMs / count);
    },
  };
}

// Lớp card tạm nằm đầu host (dưới mọi card), cùng hệ tọa độ với card: left, top, width, height theo px.
export function createGhostLayer(host) {
  const layer = document.createElement("div");
  layer.className = "advertising-ghost-layer";
  layer.setAttribute("aria-hidden", "true");
  const pending = new Map();
  const attach = () => {
    if (layer.parentNode !== host) host.prepend(layer);
  };
  const setStyle = (element, name, value) => {
    if (element.style[name] !== value) element.style[name] = value;
  };
  return {
    layer,
    ids: () => pending.keys(),
    has: (id) => pending.has(id),
    // Đặt (hoặc cập nhật) card tạm của một placement.
    show(id, placement, color) {
      let element = pending.get(id);
      if (!element) {
        element = document.createElement("div");
        element.className = "advertising-ghost";
        element.dataset.advertisingGhost = id;
        element.style.animationDelay = breathePhase();
        pending.set(id, element);
        attach();
        layer.append(element);
      }
      setStyle(element, "left", `${placement.x}px`);
      setStyle(element, "top", `${placement.y}px`);
      setStyle(element, "width", `${placement.pixelWidth}px`);
      setStyle(element, "height", `${placement.pixelHeight}px`);
      if (color) setStyle(element, "backgroundColor", color);
    },
    // Card thật thay chỗ: trả phần tử để card crossfade lên trên nó, rồi người gọi gỡ nó.
    take(id) {
      const element = pending.get(id);
      if (!element) return null;
      pending.delete(id);
      element.style.animation = "none";
      return element;
    },
    drop(id) {
      pending.get(id)?.remove();
      pending.delete(id);
    },
    prune(keep) {
      for (const id of [...pending.keys()]) if (!keep.has(id)) this.drop(id);
    },
    clear() {
      for (const id of [...pending.keys()]) this.drop(id);
    },
    destroy() {
      this.clear();
      layer.remove();
    },
  };
}
