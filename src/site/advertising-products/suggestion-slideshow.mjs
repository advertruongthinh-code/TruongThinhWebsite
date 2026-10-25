import { shuffleWithSeed } from "./random-order.mjs";
import { tierSizes } from "./responsive-image.mjs";
const decks = new Map();

// Giữ tập mẫu của mỗi nhóm ổn định trong vòng đời document này.
export function suggestionDeck(key, cards) {
  if (!decks.has(key)) {
    decks.set(key, shuffleWithSeed(cards, Math.random(), key).slice(0, 9));
  }
  return decks.get(key);
}

// Slide dưới viewer hoặc menu đang mở chỉ bắt backdrop blur tính lại mỗi frame (decision phone-frame-budget).
const covered = () => document.querySelector("dialog[open]") !== null;

// Nhịp lấy theo hero trang chủ (motion.js): mỗi ảnh giữ 5s, đếm bằng một animation không keyframe trên ảnh (owner bỏ
// zoom out 2026-10-10) nên pause khi khuất là nhịp dừng theo. Chuyển kiểu đẩy ngang (owner chọn D+B 2026-10-10): ảnh mới trượt vào
// từ phải, đẩy ảnh cũ sang trái 0.9s power3.inOut; nút sau lệch nút trước 0.4s thành sóng. Bộ một ảnh đẩy sang
// chính nó để vòng vẫn lặp.
// Đẩy ngang của nút suggestion (design-system/motion.md): media mới vào từ phía direction, media cũ lùi 35% và mờ 0.4.
// Dải media của card và primary dùng lại nhịp PUSH_TIMING, không lùi, không mờ (media-card R3, owner 2026-10-19).
export const PUSH_TIMING = { duration: 900, easing: "cubic-bezier(0.76, 0, 0.24, 1)", fill: "forwards" };
function pushSlide(incoming, outgoing, direction = 1) {
  return {
    animation: incoming.animate([{ transform: `translateX(${100 * direction}%)` }, { transform: "translateX(0)" }], PUSH_TIMING),
    pushOut: outgoing?.animate([
      { transform: "translateX(0)", opacity: 1 }, { transform: `translateX(${-35 * direction}%)`, opacity: 0.4 },
    ], PUSH_TIMING),
  };
}

export function mountSuggestionSlides(root, { cards, createImage, isReduced, signal }) {
  const pending = new Map();
  const clocks = new Map();
  let stopped = false;
  const clock = (image, delay = 0) => image.animate([], { duration: 5000, fill: "forwards", delay });
  // Cả cụm chung một trạng thái hiện/khuất: dừng từng nút theo viewport làm nút dưới màn hình lệch sóng (điện thoại).
  // IntersectionObserver báo sau layout của frame; đo rect lúc mount và mỗi scroll ép layout giữa task mở detail.
  // Chưa có entry đầu thì coi là khuất: đồng hồ dừng tới frame kế.
  let offscreenState = true;
  const clear = () => {
    pending.forEach(({ image, animation, pushOut, previousClock }) => {
      animation?.cancel();
      pushOut?.cancel();
      previousClock?.cancel();
      image.remove();
    });
    pending.clear();
    clocks.forEach(clock => clock.cancel());
    clocks.clear();
  };
  const tick = async (button) => {
    if (stopped || isReduced() || document.hidden || root.hidden || button.getAttribute("aria-pressed") === "true"
      || offscreenState || pending.has(button)
      || document.body.classList.contains("motion-paused") || covered()) return;
    const tag = button.dataset.advertisingSuggestionTag;
    const deck = suggestionDeck(tag, cards.filter(card => card.tagIds?.includes(tag)));
    if (!deck.length) return;
    const current = button.querySelector('[data-advertising-suggestion-image-layer="current"]');
    const index = deck.findIndex(card => card.id === current?.dataset.advertisingSuggestionPhoto);
    const card = deck[(index + 1) % deck.length];
    const next = createImage(card);
    // Eager bỏ "auto" khỏi sizes; ghim width của button trước khi request bắt đầu.
    if (next.srcset) next.sizes = tierSizes(next, Math.ceil(button.getBoundingClientRect().width));
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
    const previousClock = state.previousClock = clocks.get(button);
    const nextClock = clock(next);
    // Bù phần trễ do poll 200ms và decode để nhịp 0.4s giữa các nút không trôi sau mỗi vòng.
    const late = (previousClock?.currentTime ?? 0) - 5000 - (previousClock?.effect?.getTiming().delay || 0);
    if (late > 0 && late < 5000) nextClock.currentTime = late;
    clocks.set(button, nextClock);
    const { animation, pushOut } = pushSlide(next, current);
    state.animation = animation;
    state.pushOut = pushOut;
    animation.addEventListener("finish", () => {
      previousClock?.cancel();
      current?.remove();
      next.dataset.advertisingSuggestionImageLayer = "current";
      animation.cancel();
      pending.delete(button);
    }, { once: true });
    onVisibility();
  };
  // Giữ mỗi ảnh đúng 5s theo đồng hồ của chính nút: đồng hồ bị pause khi nút khuất thì nhịp cũng dừng, như timeline hero.
  const timer = setInterval(() => {
    root.querySelectorAll("[data-advertising-suggestion-tag]").forEach(button => {
      const time = clocks.get(button);
      if (!(time?.currentTime < 5000 + (time?.effect?.getTiming().delay || 0))) void tick(button);
    });
  }, 200);
  const onVisibility = () => {
    if (isReduced() || preference.matches) { clear(); return; }
    const hidden = offscreenState;
    const sync = (animation, button) => {
      if (document.hidden || document.body.classList.contains("motion-paused") || covered()
        || button.getAttribute("aria-pressed") === "true" || hidden) animation?.pause();
      else if (animation?.playState === "paused") animation.play();
    };
    pending.forEach(({ animation, pushOut }, button) => { sync(animation, button); sync(pushOut, button); });
    clocks.forEach(sync);
  };
  document.addEventListener("visibilitychange", onVisibility, { signal });
  const viewport = new IntersectionObserver((entries) => {
    offscreenState = !entries[entries.length - 1].isIntersecting;
    onVisibility();
  });
  viewport.observe(root);
  const observer = new MutationObserver(onVisibility);
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  observer.observe(root, { attributes: true, attributeFilter: ["aria-pressed"], subtree: true });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["open"], subtree: true });
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", onVisibility, { signal });
  // Đồng hồ đầu của nút thứ i trễ 0.4s * i để cả cụm chuyển ảnh lệch nhịp từ trên xuống. Dùng delay, không lùi
  // currentTime về âm: play() sau pause sẽ tua animation có currentTime âm về 0.
  if (!isReduced()) root.querySelectorAll("[data-advertising-suggestion-tag]").forEach((button, index) => {
    const current = button.querySelector('[data-advertising-suggestion-image-layer="current"]');
    if (!current) return;
    clocks.set(button, clock(current, 400 * index));
  });
  onVisibility();
  return () => {
    stopped = true;
    clearInterval(timer);
    clear();
    observer.disconnect();
    viewport.disconnect();
    preference.removeEventListener("change", onVisibility);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
