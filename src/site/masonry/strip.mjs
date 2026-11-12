import { PUSH_TIMING } from "./suggestion-slideshow.mjs";

// Continuous media strip (media-card R3, R6, owner 2026-10-19): each lane is nodes of the same slot, placed side by side `width` apart,
// only translate is shifted, opacity unchanged. Releasing after a drag slides the remaining distance, with a rhythm that shortens with the distance.
export const releaseTiming = (distance, width) => ({ duration: Math.max(200, PUSH_TIMING.duration * Math.min(1, distance / width)),
  easing: "cubic-bezier(0.33, 1, 0.68, 1)", fill: "forwards" });
export function placeStrip(lanes, width, offset) {
  lanes.forEach(({ nodes, slot }) => nodes.forEach((node) => { node.style.translate = `${slot * width + offset}px 0`; }));
}
export function moveStrip(lanes, width, from, to, timing) {
  return lanes.flatMap(({ nodes, slot }) => nodes.map((node) => node.animate(
    { translate: [`${slot * width + from}px 0`, `${slot * width + to}px 0`] }, timing)));
}

// Strip offset as it is on screen now (rule 1 of the interruptible strip, media-card R3): read the first lane's computed translate before any
// animation is cancelled, minus that lane's slot.
export function stripOffset(lanes, width) {
  const [{ nodes: [node], slot }] = lanes;
  return (Number.parseFloat(getComputedStyle(node).translate) || 0) - slot * width;
}

export const isTranslate = (animation) => animation.effect?.getKeyframes().some((frame) => "translate" in frame);

// A node leaves the strip: its translate animations and offset go.
export function releaseNode(node) {
  node.getAnimations().filter(isTranslate).forEach((animation) => animation.cancel());
  node.style.translate = "";
}

// Rule 2 of the interruptible strip (media-card R3): the slot of media `index` is its lane already in the strip, else the slot right after the
// outermost lane in the press direction (1 next, -1 previous), so media in between that never showed get no lane and the new media always
// enters from the side the press points to. Each lane is { nodes, slot, index }.
export function laneSlot(lanes, index, direction) {
  const lane = lanes.find((entry) => entry.index === index);
  if (lane) return lane.slot;
  return lanes.reduce((edge, entry) => (entry.slot - edge.slot) * direction > 0 ? entry : edge).slot + direction;
}

// Rule 2 when the strip turns to the media at `index`, seen at `offset`: lanes on screen stay and every other lane goes, so at most two lanes
// on screen plus the target remain however fast the presses come. The target keeps its lane when that lane is on screen or right beside
// them, else it joins next to them (laneSlot). Returns the lanes that stay and the target's slot.
export function keepLanes(lanes, { index, direction, width, offset }) {
  const kept = lanes.filter(({ slot }) => Math.abs(slot * width + offset) < width);
  const lane = lanes.find((entry) => entry.index === index);
  const beside = lane && kept.some(({ slot }) => Math.abs(slot - lane.slot) <= 1);
  return { kept, slot: beside ? lane.slot : laneSlot(kept, index, direction) };
}

// A new press while the strip moves (media-card R3, owner 2026-11-12): the strip continues from where it is seen instead of jumping to the old
// target. Same direction runs the full PUSH_TIMING duration; turning around scales the duration by the distance left, at least 200ms. Both use
// the release curve, which starts at full speed. A strip already at rest passes its own `timing` (a plain slide). Returns the new animations;
// the strip's earlier translate animations are cancelled.
export function retargetStrip(lanes, { toPx, width, sameDirection, timing = null }) {
  const from = stripOffset(lanes, width);
  lanes.forEach(({ nodes }) => nodes.forEach(releaseNode));
  placeStrip(lanes, width, from);
  const duration = sameDirection ? PUSH_TIMING.duration
    : Math.max(200, PUSH_TIMING.duration * Math.abs(from - toPx) / width);
  const animations = moveStrip(lanes, width, from, toPx,
    timing ?? { duration, easing: "cubic-bezier(0.33, 1, 0.68, 1)", fill: "forwards" });
  // Start at once: a pending animation holds its first keyframe for a few frames, which reads as the strip stopping on the press. `from`
  // is where the strip was at the last frame time, so the strip starts there; after a long task that time is stale and starting there would
  // skip the time lost, so it starts now and the inline offset holds the place until the next frame.
  const now = performance.now();
  const frame = document.timeline.currentTime ?? now;
  const start = now - frame < 100 ? frame : now;
  animations.forEach((animation) => { animation.startTime = start; });
  return animations;
}

// A swipe drags the strip with the finger (media-card R3, owner 2026-10-19): direction locks after 10px; lifting after dragging past half
// the frame or at 0.5px/ms moves to the next media, otherwise it snaps back; at the two ends of the strip it moves only 1/3 of the finger distance. With no
// pointermove (synthetic pointer) velocity is infinite: a horizontal swipe from 10px changes media.
export function trackStripSwipe(target, { accepts = () => true, start = () => {}, width, canStep, drag, release, signal }) {
  let gesture = null;
  const offset = (dx) => canStep(dx < 0 ? 1 : -1) ? dx : dx / 3;
  target.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || !accepts(event)) return;
    const { pointerId: id, clientX: x, clientY: y, timeStamp: t } = event;
    gesture = { id, x, y, horizontal: null, lastX: x, lastT: t, prevX: x, prevT: t };
    start(event);
  }, { signal });
  target.addEventListener("pointermove", (event) => {
    if (gesture?.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (gesture.horizontal === null) {
      if (Math.hypot(dx, dy) < 10) return;
      gesture.horizontal = Math.abs(dx) > Math.abs(dy);
    }
    if (!gesture.horizontal) return;
    Object.assign(gesture, { prevX: gesture.lastX, prevT: gesture.lastT, lastX: event.clientX, lastT: event.timeStamp });
    drag(offset(dx));
  }, { signal });
  target.addEventListener("pointerup", (event) => {
    if (gesture?.id !== event.pointerId) return;
    const { x, y, horizontal, prevX, prevT } = gesture;
    gesture = null;
    const dx = event.clientX - x;
    if (horizontal === false || Math.abs(dx) < 10 || Math.abs(dx) <= Math.abs(event.clientY - y)) {
      if (horizontal) release(0, offset(dx));
      return;
    }
    const elapsed = horizontal === null ? 0 : event.timeStamp - prevT;
    const speed = elapsed > 0 ? Math.abs(event.clientX - prevX) / elapsed : Infinity;
    const step = dx < 0 ? 1 : -1;
    release(canStep(step) && (Math.abs(dx) > width() / 2 || speed >= 0.5) ? step : 0, offset(dx));
  }, { signal });
  target.addEventListener("pointercancel", (event) => {
    if (gesture?.id !== event.pointerId) return;
    if (gesture.horizontal) release(0, offset(gesture.lastX - gesture.x));
    gesture = null;
  }, { signal });
}
