import { shuffleWithSeed } from "./random-order.mjs";
const decks = new Map();

// Keep each group's sample set stable for the lifetime of this document.
export function suggestionDeck(key, cards) {
  if (!decks.has(key)) {
    decks.set(key, shuffleWithSeed(cards, Math.random(), key).slice(0, 9));
  }
  return decks.get(key);
}

// A slide under the viewer or an open menu only makes backdrop blur recompute every frame (decision phone-frame-budget).
const covered = () => document.querySelector("dialog[open]") !== null;

// Timing follows the home hero (motion.js): each image holds 5s, counted by one keyframe-less animation on the image (owner dropped
// zoom out 2026-10-10), so pausing when hidden stops the timing too. Horizontal push transition (owner chose D+B 2026-10-10): the new image slides in
// from the right, pushing the old image left over 0.9s power3.inOut; each later button is offset 0.4s from the previous one to form a wave. A one-image set pushes
// itself so the loop still repeats.
// Horizontal push of the suggestion button (design-system/motion.md): new media enters from the direction side, old media recedes 35% and fades 0.4.
// The card and primary media strips reuse the PUSH_TIMING timing, with no recede and no fade (media-card R3, owner 2026-10-19).
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
  // The whole cluster shares one shown/hidden state: pausing each button by viewport throws off the wave for buttons below the screen (phone).
  // IntersectionObserver reports after the frame's layout; measuring rects at mount and on every scroll forces layout in the middle of the open-detail task.
  // Without a first entry yet, treat it as hidden: the clock stops until the next frame.
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
    const tag = button.dataset.masonrySuggestionTag;
    const deck = suggestionDeck(tag, cards.filter(card => card.tagIds?.includes(tag)));
    if (!deck.length) return;
    const current = button.querySelector('[data-masonry-suggestion-image-layer="current"]');
    const index = deck.findIndex(card => card.id === current?.dataset.masonrySuggestionPhoto);
    const card = deck[(index + 1) % deck.length];
    const next = createImage(card);
    // Eager drops "auto" from sizes; pin the button width before the request starts.
    if (next.srcset) next.sizes = `${Math.ceil(button.getBoundingClientRect().width)}px`;
    next.loading = "eager";
    next.dataset.masonrySuggestionImageLayer = "next";
    next.dataset.masonrySuggestionPhoto = card.id;
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
    // Compensate for the delay from the 200ms poll and decode so the 0.4s timing between buttons does not drift each loop.
    const late = (previousClock?.currentTime ?? 0) - 5000 - (previousClock?.effect?.getTiming().delay || 0);
    if (late > 0 && late < 5000) nextClock.currentTime = late;
    clocks.set(button, nextClock);
    const { animation, pushOut } = pushSlide(next, current);
    state.animation = animation;
    state.pushOut = pushOut;
    animation.addEventListener("finish", () => {
      previousClock?.cancel();
      current?.remove();
      next.dataset.masonrySuggestionImageLayer = "current";
      animation.cancel();
      pending.delete(button);
    }, { once: true });
    onVisibility();
  };
  // Hold each image exactly 5s by the button's own clock: when the clock is paused as the button goes hidden the timing stops too, like the hero timeline.
  const timer = setInterval(() => {
    root.querySelectorAll("[data-masonry-suggestion-tag]").forEach(button => {
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
  // The first clock of button i is delayed 0.4s * i so the whole cluster changes images staggered from top to bottom. Use delay, do not wind
  // currentTime negative: play() after pause would rewind an animation with negative currentTime to 0.
  if (!isReduced()) root.querySelectorAll("[data-masonry-suggestion-tag]").forEach((button, index) => {
    const current = button.querySelector('[data-masonry-suggestion-image-layer="current"]');
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
