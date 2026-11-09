import { createGlassSurface } from "./glass-surface.mjs";

// Batch CTA (khung skeleton, cụm chữ, Kính cung) là một bộ node đi giữa các sân masonry: grid, canvas cuối related ở
// detail (advertising-cta-center-parallax R9). Mọi truy vấn và observer tính từ gốc batch, không từ nơi đang chứa nó,
// nên gắn vào sân nào cũng chạy cùng luật (masonry-reuse bước 3.6).
export function createCtaBatch({ skeleton, cluster, arcHome, signal, rearm }) {
  const arc = arcHome?.appendChild(Object.assign(createGlassSurface("arc"), { hidden: true }));
  let arcInView = false;
  let rearmPending = false;
  // Kính reveal bất kỳ còn trong DOM khi cung đang thấy làm Chrome bỏ blur các bậc của cung (skeleton R4): cung vào
  // viewport thì gỡ Kính reveal của khung batch, khung chỉ còn crossfade. Lỗi #757: tìm trong grid bỏ sót batch ở detail.
  const tint = arc?.querySelector(".glass-surface__tint");
  const observer = tint && new IntersectionObserver(([entry]) => {
    arcInView = entry.isIntersecting;
    if (arcInView) skeleton?.querySelectorAll(".glass-surface[data-glass-reveal]").forEach((glass) => glass.remove());
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
    get host() { return skeleton?.dataset.advertisingCtaHost; },
    // Kính reveal cho khung batch, trừ khi cung đang thấy.
    revealGlass: (make, frame) => (arcInView ? null : make(frame)),
    // Gắn bộ node vào sân mới. `rearm`: chữ và nút chạy lại motion vào view sau lần đặt chỗ kế tiếp, vì trước đó cụm
    // nằm đầu sân, trong viewport, nên observer vào view nổ sớm. Không rearm thì giữ trạng thái đã hiện.
    attach(host, { skeletonParent, clusterParent, rearm: rearmOnPlace = false }) {
      if (!skeleton || batch.host === host) return;
      if (rearmOnPlace) rearmPending = true;
      skeletonParent.append(skeleton);
      clusterParent?.append(...[cluster, arc].filter(Boolean));
      // Biến đặt thẳng trên cụm thuộc sân cũ; sân mới đặt lại khi dựng batch.
      cluster?.style.removeProperty("--advertising-cta-top");
      cluster?.style.removeProperty("--advertising-gap");
      // Cụm chưa có top cho tới lần dựng batch kế tiếp: ẩn để không hiện ở đầu sân.
      if (rearmOnPlace) cluster?.style.setProperty("visibility", "hidden");
      else cluster?.style.removeProperty("visibility");
      skeleton.dataset.advertisingCtaHost = host;
    },
    // Sân đổi nội dung mà batch không đổi sân (đổi ảnh ở detail): chạy lại motion vào view sau lần đặt chỗ kế tiếp.
    rearmOnPlace() { rearmPending = true; },
    // Batch vừa đặt xong ở chỗ thật.
    placed() {
      cluster?.style.removeProperty("visibility");
      if (!rearmPending || !cluster) return;
      rearmPending = false;
      rearm?.(cluster);
    },
    clear() {
      if (!skeleton) return;
      skeleton.hidden = true;
      skeleton.replaceChildren();
      cluster?.style.removeProperty("--advertising-cta-tail-height");
      if (arc) arc.hidden = true;
      delete skeleton.dataset.advertisingCtaColumns;
      delete skeleton.dataset.advertisingCtaReady;
      delete skeleton.dataset.advertisingCtaSignature;
    },
  };
  return batch;
}
