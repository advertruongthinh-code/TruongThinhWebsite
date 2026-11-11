import { createGlassSurface } from "./glass-surface.mjs";

// Batch CTA (khung skeleton, cụm chữ, Kính cung) là một bộ node đi giữa các sân masonry: grid, canvas cuối related ở
// detail (advertising-cta-center-parallax R9). Mọi truy vấn và observer tính từ gốc batch, không từ nơi đang chứa nó,
// nên gắn vào sân nào cũng chạy cùng luật (masonry-reuse bước 3.6).
export function createCtaBatch({ skeleton, cluster, arcHome, signal, rearm }) {
  const arc = arcHome?.appendChild(Object.assign(createGlassSurface("arc"), { hidden: true }));
  let arcInView = false;
  let rearmPending = false;
  // Kính reveal bất kỳ còn trong DOM khi cung đang thấy làm Chrome bỏ blur các bậc của cung (skeleton R4): cung vào
  // viewport thì gỡ mọi Kính reveal trong trang (khung batch, primary), media chỉ còn crossfade. Lỗi #757: tìm trong grid
  // bỏ sót batch ở detail.
  const tint = arc?.querySelector(".glass-surface__tint");
  const observer = tint && new IntersectionObserver(([entry]) => {
    arcInView = entry.isIntersecting;
    if (arcInView) tint.ownerDocument.querySelectorAll(".glass-surface[data-glass-reveal]").forEach((glass) => glass.remove());
  });
  observer?.observe(tint);
  signal?.addEventListener("abort", () => {
    observer?.disconnect();
    arc?.remove();
  }, { once: true });
  const batch = {
    skeleton,
    cluster,
    arc,
    get host() { return skeleton?.dataset.masonryCtaHost; },
    // Cung đang thấy thì reveal không thêm Kính.
    get arcInView() { return arcInView; },
    // Gắn bộ node vào sân mới. `replay`: chữ và nút chạy lại motion vào view sau lần đặt chỗ kế tiếp, vì trước đó cụm
    // nằm đầu sân, trong viewport, nên observer vào view nổ sớm. Không replay thì giữ trạng thái đã hiện, kể cả khi
    // rời sân cũ trước lúc batch kịp đặt chỗ ở đó.
    attach(host, { skeletonParent, clusterParent, replay = false }) {
      if (!skeleton || batch.host === host) return;
      rearmPending = replay;
      skeletonParent.append(skeleton);
      clusterParent?.append(...[cluster, arc].filter(Boolean));
      // Biến đặt thẳng trên cụm thuộc sân cũ; sân mới đặt lại khi dựng batch.
      cluster?.style.removeProperty("--masonry-cta-top");
      cluster?.style.removeProperty("--masonry-gap");
      // Cụm chưa có top cho tới lần dựng batch kế tiếp: ẩn để không hiện ở đầu sân.
      if (replay) cluster?.style.setProperty("visibility", "hidden");
      else cluster?.style.removeProperty("visibility");
      skeleton.dataset.masonryCtaHost = host;
    },
    // Sân đổi nội dung mà batch không đổi sân (đổi ảnh ở detail): chạy lại motion vào view sau lần đặt chỗ kế tiếp.
    rearmOnPlace() { rearmPending = true; },
    // Batch vừa đặt xong ở chỗ thật.
    placed() {
      if (!rearmPending || !cluster) return;
      rearmPending = false;
      rearm?.(cluster);
    },
    clear() {
      if (!skeleton) return;
      skeleton.hidden = true;
      skeleton.replaceChildren();
      cluster?.style.removeProperty("--masonry-cta-tail-height");
      if (arc) arc.hidden = true;
      delete skeleton.dataset.masonryCtaColumns;
      delete skeleton.dataset.masonryCtaReady;
      delete skeleton.dataset.masonryCtaSignature;
    },
  };
  return batch;
}
