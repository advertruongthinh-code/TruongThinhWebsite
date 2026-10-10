import { shuffleWithSeed } from "./random-order.mjs";
const decks = new Map();

// Giữ tập mẫu của mỗi nhóm ổn định trong vòng đời document này.
export function suggestionDeck(key, cards) {
  if (!decks.has(key)) {
    decks.set(key, shuffleWithSeed(cards, Math.random(), key).slice(0, 9));
  }
  return decks.get(key);
}

// Slide dưới viewer hoặc menu đang mở chỉ bắt backdrop blur tính lại mỗi frame (decision a05s-frame-budget).
const covered = () => document.querySelector("dialog[open]") !== null;

// Nhịp lấy theo hero trang chủ (motion.js): mỗi ảnh giữ 5s, ảnh mới zoom 1.06 -> 1 trong 6.6s sine.inOut từ frame
// đầu lúc chuyển; ảnh đầu zoom ngay lúc mount. Chuyển kiểu đẩy ngang (owner chọn D+B 2026-10-10): ảnh mới trượt vào
// từ phải, đẩy ảnh cũ sang trái 0.9s power3.inOut; nút sau lệch nút trước 0.4s thành sóng. Bộ một ảnh đẩy sang
// chính nó để vòng vẫn lặp.
export function mountSuggestionSlides(root, { cards, createImage, isReduced, signal }) {
  const pending = new Map();
  const zooms = new Map();
  let stopped = false;
  const zoom = (image, delay = 0) => image.animate([{ transform: "scale(1.06)" }, { transform: "scale(1)" }], {
    duration: 6600, easing: "cubic-bezier(0.37, 0, 0.63, 1)", fill: "both", delay,
  });
  const push = { duration: 900, easing: "cubic-bezier(0.76, 0, 0.24, 1)", composite: "add", fill: "forwards" };
  const clear = () => {
    pending.forEach(({ image, animation, pushOut, previousZoom }) => {
      animation?.cancel();
      pushOut?.cancel();
      previousZoom?.cancel();
      image.remove();
    });
    pending.clear();
    zooms.forEach(zoom => zoom.cancel());
    zooms.clear();
  };
  const tick = async (button) => {
    const rect = button.getBoundingClientRect();
    if (stopped || isReduced() || document.hidden || root.hidden || button.getAttribute("aria-pressed") === "true"
      || rect.bottom <= 0 || rect.top >= innerHeight || pending.has(button)
      || document.body.classList.contains("motion-paused") || covered()) return;
    const tag = button.dataset.advertisingSuggestionTag;
    const deck = suggestionDeck(tag, cards.filter(card => card.tagIds?.includes(tag)));
    if (!deck.length) return;
    const current = button.querySelector('[data-advertising-suggestion-image-layer="current"]');
    const index = deck.findIndex(card => card.id === current?.dataset.advertisingSuggestionPhoto);
    const card = deck[(index + 1) % deck.length];
    const next = createImage(card);
    // Eager bỏ "auto" khỏi sizes; ghim width của button trước khi request bắt đầu.
    if (next.srcset) next.sizes = `${Math.ceil(rect.width)}px`;
    next.loading = "eager";
    next.dataset.advertisingSuggestionImageLayer = "next";
    next.dataset.advertisingSuggestionPhoto = card.id;
    const state = { image: next, animation: null };
    pending.set(button, state);
    try { await next.decode(); } catch {
      if (pending.get(button) === state) pending.delete(button);
      return;
    }
    if (pending.get(button) !== state) return;
    if (stopped || isReduced() || !button.isConnected || button.getAttribute("aria-pressed") === "true") {
      pending.delete(button); return;
    }
    button.insertBefore(next, current?.nextSibling || null);
    const previousZoom = state.previousZoom = zooms.get(button);
    zooms.set(button, zoom(next));
    // composite add: translate cộng lên scale của zoom; tạo sau zoom để nằm trên zoom trong stack animation.
    const animation = next.animate([{ transform: "translateX(100%)" }, { transform: "translateX(0)" }], push);
    state.animation = animation;
    // Chỉ transform: composite add cộng cả opacity nên không làm mờ ảnh cũ được trong cùng animation.
    state.pushOut = current?.animate([{ transform: "translateX(0)" }, { transform: "translateX(-35%)" }], push);
    animation.addEventListener("finish", () => {
      previousZoom?.cancel();
      current?.remove();
      next.dataset.advertisingSuggestionImageLayer = "current";
      animation.cancel();
      pending.delete(button);
    }, { once: true });
    onVisibility();
  };
  // Giữ mỗi ảnh đúng 5s theo đồng hồ zoom của chính nút: zoom bị pause khi nút khuất thì nhịp cũng dừng, như timeline hero.
  const timer = setInterval(() => {
    root.querySelectorAll("[data-advertising-suggestion-tag]").forEach(button => {
      const clock = zooms.get(button);
      if (!(clock?.currentTime < 5000 + (clock?.effect?.getTiming().delay || 0))) void tick(button);
    });
  }, 200);
  const onVisibility = () => {
    if (isReduced() || preference.matches) { clear(); return; }
    const sync = (animation, button) => {
      const rect = button.getBoundingClientRect();
      if (document.hidden || document.body.classList.contains("motion-paused") || covered()
        || button.getAttribute("aria-pressed") === "true" || rect.bottom <= 0 || rect.top >= innerHeight) animation?.pause();
      else if (animation?.playState === "paused") animation.play();
    };
    pending.forEach(({ animation, pushOut }, button) => { sync(animation, button); sync(pushOut, button); });
    zooms.forEach(sync);
  };
  document.addEventListener("visibilitychange", onVisibility, { signal });
  addEventListener("scroll", onVisibility, { passive: true, signal });
  addEventListener("site:scroll", onVisibility, { signal });
  const observer = new MutationObserver(onVisibility);
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  observer.observe(root, { attributes: true, attributeFilter: ["aria-pressed"], subtree: true });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["open"], subtree: true });
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", onVisibility, { signal });
  // Zoom đầu của nút thứ i trễ 0.4s * i để cả cụm chuyển ảnh lệch nhịp từ trên xuống. Dùng delay, không lùi
  // currentTime về âm: play() sau pause sẽ tua animation có currentTime âm về 0.
  if (!isReduced()) root.querySelectorAll("[data-advertising-suggestion-tag]").forEach((button, index) => {
    const current = button.querySelector('[data-advertising-suggestion-image-layer="current"]');
    if (!current) return;
    zooms.set(button, zoom(current, 400 * index));
  });
  onVisibility();
  return () => {
    stopped = true;
    clearInterval(timer);
    clear();
    observer.disconnect();
    preference.removeEventListener("change", onVisibility);
    document.removeEventListener("visibilitychange", onVisibility);
    removeEventListener("scroll", onVisibility);
    removeEventListener("site:scroll", onVisibility);
  };
}
