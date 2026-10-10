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

// Nhịp và easing lấy theo hero trang chủ (motion.js): mỗi 5s chuyển mờ 1.6s power2.inOut, ảnh mới zoom 1.06 -> 1
// trong 6.6s sine.inOut từ frame đầu crossfade. Ảnh đầu đã settle giữ scale 1 như slide hero settle.
export function mountSuggestionSlides(root, { cards, createImage, isReduced, signal }) {
  const pending = new Map();
  const zooms = new Map();
  let stopped = false;
  const clear = () => {
    pending.forEach(({ image, animation }) => {
      animation?.cancel();
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
    // Nhóm thưa giữ tĩnh cho đến khi có bốn asset khác nhau.
    if (deck.length < 4) return;
    const current = button.querySelector('[data-advertising-suggestion-image-layer="current"]');
    const index = deck.findIndex(card => card.id === current?.dataset.advertisingSuggestionPhoto);
    const card = deck[(index + 1) % deck.length];
    const next = createImage(card);
    // Eager bỏ "auto" khỏi sizes; ghim width của button trước khi request bắt đầu.
    if (next.srcset) next.sizes = `${Math.ceil(rect.width)}px`;
    next.loading = "eager";
    next.dataset.advertisingSuggestionImageLayer = "next";
    next.dataset.advertisingSuggestionPhoto = card.id;
    next.style.opacity = "0";
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
    const animation = next.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 1600, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards",
    });
    state.animation = animation;
    const previousZoom = zooms.get(button);
    zooms.set(button, next.animate([{ transform: "scale(1.06)" }, { transform: "scale(1)" }], {
      duration: 6600, easing: "cubic-bezier(0.37, 0, 0.63, 1)", fill: "forwards",
    }));
    animation.addEventListener("finish", () => {
      previousZoom?.cancel();
      current?.remove();
      next.dataset.advertisingSuggestionImageLayer = "current";
      next.style.removeProperty("opacity");
      animation.cancel();
      pending.delete(button);
    }, { once: true });
    onVisibility();
  };
  const timer = setInterval(() => {
    root.querySelectorAll("[data-advertising-suggestion-tag]").forEach(button => { void tick(button); });
  }, 5000);
  const onVisibility = () => {
    if (isReduced() || preference.matches) { clear(); return; }
    const sync = (animation, button) => {
      const rect = button.getBoundingClientRect();
      if (document.hidden || document.body.classList.contains("motion-paused") || covered()
        || button.getAttribute("aria-pressed") === "true" || rect.bottom <= 0 || rect.top >= innerHeight) animation?.pause();
      else if (animation?.playState === "paused") animation.play();
    };
    pending.forEach(({ animation }, button) => sync(animation, button));
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
