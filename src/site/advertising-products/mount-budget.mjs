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
const HOLD_FAST_MS = 120;
// Thời gian đo chỉ gồm phần JS dựng card; style và layout của card chạy sau trong cùng frame nên chưa nằm trong số đo. Trần cứng
// giữ mỗi frame vài card dù số đo thấp (máy nhanh vẫn dựng hết trong vài frame).
const MAX_MOUNTS_PER_FRAME = 8;

// Mọi phần tử đang thở dùng chung pha: delay âm bằng thời điểm hiện tại theo chu kỳ, nên card tạm đổi sang card mờ
// không nhảy độ sáng.
export const breathePhase = (now = performance.now()) => `${-(now % BREATHE_MS)}ms`;

// Chi phí một card và nhịp frame đo ngay trên máy; hàm thuần theo đồng hồ truyền vào để test.
// Chi phí tính theo khoảng frame: phần JS dựng card chỉ là một phần nhỏ, style, layout và paint của card mới chạy sau
// trong cùng frame và làm frame kế tới trễ (A04s: JS 0.5ms một card nhưng frame dài thêm vài ms một card).
export function createMountBudget(clock = () => performance.now(), nextFrame = (callback) => requestAnimationFrame(callback)) {
  let costMs = INITIAL_COST_MS;
  // Nhịp frame khi không dựng card: nền để tách chi phí dựng ra khỏi khoảng frame.
  let frameMs = 1000 / 60;
  let sample = null;
  let lastMount = null;
  // Ngân sách tính theo frame: một lần dựng là hết phần của frame đó, lần xét thứ hai trong cùng frame (rAF card tạm rồi
  // tới cuộn, cách nhau vài ms vì lần đầu dựng tốn thời gian) không dựng thêm.
  let spent = false;
  const smooth = (previous, next) => previous + (next - previous) * 0.2;
  const clampFrame = (ms) => Math.min(MAX_FRAME_MS, Math.max(MIN_FRAME_MS, ms));
  // Khoảng tới frame này: có dựng card ở frame trước thì phần dôi ra so với nhịp nền là chi phí của chúng; không thì là nhịp nền.
  const measure = (elapsed) => {
    const mounted = lastMount;
    lastMount = null;
    // Quãng nghỉ dài là cuộn đã dừng, không nói gì về nhịp frame.
    if (elapsed >= 100) return;
    if (mounted) {
      const perCard = Math.max(mounted.jsMs, elapsed - frameMs) / mounted.count;
      costMs = smooth(costMs, Math.min(MAX_FRAME_MS, Math.max(0.05, perCard)));
    } else frameMs = smooth(frameMs, clampFrame(elapsed));
  };
  return {
    // Gọi mỗi lần cửa sổ được xét; trả về true khi đang vuốt rất nhanh.
    begin(y, viewportHeight) {
      const now = clock();
      let fast = false;
      if (sample) {
        const elapsed = now - sample.time;
        // Gọi lần hai trong cùng một frame (rAF card tạm rồi tới cuộn): không có quãng đường để đo, giữ kết luận trước và mốc cũ.
        if (elapsed < 4) return sample.fast;
        measure(elapsed);
        // Frame chạy lại vì còn card tạm (không cuộn thêm): đang vuốt nhanh thì vẫn nhanh, chỉ hết nhanh khi đứng yên đủ lâu.
        if (y === sample.y) {
          sample.time = now;
          return sample.fast && now - sample.movedAt < HOLD_FAST_MS;
        }
        const distance = Math.abs(y - sample.y);
        // Một cú nhảy xa (kéo thanh cuộn, về chỗ cũ) cũng là vuốt nhanh dù sau quãng nghỉ dài: nội dung cũ không còn dùng.
        fast = distance / elapsed * 1000 > viewportHeight * FAST_VIEWPORTS_PER_S || distance > viewportHeight * JUMP_VIEWPORTS;
      }
      sample = { y, time: now, fast, movedAt: now };
      return fast;
    },
    quota: () => spent ? 0 : Math.min(MAX_MOUNTS_PER_FRAME, mountQuota({ budgetMs: frameMs * BUDGET_SHARE, costMs })),
    record(count, jsMs) {
      if (count > 0) {
        lastMount = { count, jsMs };
        // Hết ngân sách tới đầu frame sau (callback này đăng ký trước mọi rAF dựng tiếp nên chạy trước chúng).
        if (!spent) nextFrame(() => { spent = false; });
        spent = true;
      }
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
      // Card có tên dưới media (projects R2): card tạm chỉ phủ phần media, chỗ tên để trống như card thật.
      setStyle(element, "height", `${placement.pixelHeight - (placement.captionPixelHeight || 0)}px`);
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

// Sức chứa hàng chờ card vừa gỡ theo RAM máy (navigator.deviceMemory, GB; không có thì coi như 4): máy yếu giữ ít card.
export const detachedCapacity = (deviceMemory = 4) => {
  if (!(deviceMemory > 0)) return 24;
  if (deviceMemory <= 2) return 8;
  return deviceMemory >= 8 ? 48 : 24;
};

// Hàng chờ LRU các card vừa gỡ khỏi DOM mà ảnh còn giải mã: quay lại thì gắn đúng node cũ, không trống frame.
export function createDetachedCards(capacity) {
  const queue = new Map();
  return {
    get size() { return queue.size; },
    has: (id) => queue.has(id),
    // Vào hàng chờ (hoặc làm mới); trả các card bị đẩy ra vì quá sức chứa, cũ nhất trước.
    put(id, node) {
      queue.delete(id);
      queue.set(id, node);
      const evicted = [];
      while (queue.size > capacity) {
        const [oldest] = queue.keys();
        evicted.push(queue.get(oldest));
        queue.delete(oldest);
      }
      return evicted;
    },
    take(id) {
      const node = queue.get(id);
      queue.delete(id);
      return node ?? null;
    },
    clear() {
      queue.clear();
    },
  };
}
