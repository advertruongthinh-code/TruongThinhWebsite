import { createLoadingExpandIcon } from "../media-lib/loading-expand-icon.mjs";
import { responsiveSource } from "../media-lib/responsive-image.mjs";
import { env } from "./host.mjs";
import { PUSH_TIMING } from "./suggestion-slideshow.mjs";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
// The second tap of a double tap: touches down within 300ms and 40px of the previous tap (advertising-viewer-touch-zoom R4).
const isSecondTap = (last, event) => last && event.timeStamp - last.time <= 300
  && Math.hypot(event.clientX - last.x, event.clientY - last.y) <= 40;
// A finger moving past 10px is a drag; below that it is still a tap and the image does not pan (R3, R4).
const TOUCH_SLOP = 10;
// Two fingers rotate only when twisted past 20° before the zoom changes by more than 20%; an ordinary pinch zoom does not rotate (R11).
const TWIST_THRESHOLD = 20;
const ZOOM_LOCK = 1.2;
// Rotate vector (x, y) by `degrees` clockwise on screen, like CSS rotate().
const rotate = (x, y, degrees) => {
  const radians = degrees * Math.PI / 180;
  return [x * Math.cos(radians) - y * Math.sin(radians), x * Math.sin(radians) + y * Math.cos(radians)];
};

export function createDetailViewer({
  dialog,
  expandButton,
  expandedImage,
  heroImage,
  viewport,
  closeButton,
  zoomInButton,
  zoomOutButton,
  zoomStatus,
  scroll,
  getVisibleViewport,
  signal,
  video,
  player,
  videoHost,
  onOpen,
} = {}) {
  if (!dialog || !expandButton || !expandedImage || !viewport || !closeButton || !zoomInButton || !zoomOutButton || !zoomStatus) {
    return { cleanup() {}, close() {}, popState: () => false, setRecord() {}, slideTo() {} };
  }
  const controller = new AbortController();
  const heroFrame = heroImage?.parentElement;
  const parent = dialog.parentNode;
  const nextSibling = dialog.nextSibling;
  let record = null;
  // The element currently shown in the viewer: an image, or the primary video itself borrowed in (primary-video-player R8).
  let media = expandedImage;
  // The video frame on the primary at open; page scroll is locked so this frame is still right on close, dropped on resize (so close does not fly).
  let sourceRect = null;
  let home = null;
  let homeParent = null;
  let slide = null;
  let scale = 1;
  // Image rotation angle in degrees; free during a pinch, otherwise always a multiple of 90 (R11).
  let angle = 0;
  let fitWidth = 1;
  let fitHeight = 1;
  let cover = 1;
  let panX = 0;
  let panY = 0;
  let drag = null;
  let pinch = null;
  let tap = null;
  let swipe = null;
  let heroTap = null;
  // The latest tap on the image or primary; the next tap within the double tap window is swallowed (R4, R7).
  let lastTap = null;
  let ownEntry = false;
  let skipPop = false;
  const touches = new Map();
  let backdropPress = false;
  let lockedScroll = 0;
  let imageAnimation = null;
  let motionGeneration = 0;
  let resizeFrame = 0;
  let fitGeometryKey = "";
  const reducedMotion = env.reducedMotion;
  // A touch screen hides the viewer buttons (R8) so Fit leaves no margin for them: the image touches the screen edge, in landscape too.
  const touchScreen = env.phone;

  document.body.append(dialog);

  const cancelMotion = () => {
    motionGeneration += 1;
    imageAnimation?.cancel();
    imageAnimation = null;
  };
  // Fit, Cover and Max are stops for the buttons and wheel; scale itself is continuous. Cover is measured together with
  // fit so a resize still knows which stop the scale is at.
  const stops = () => [1, cover, 2 * cover];
  const near = (value, stop) => Math.abs(value - stop) <= stop * 0.01;
  const atFit = () => near(scale, 1);
  const atMax = () => near(scale, 2 * cover);
  const nextStop = (direction) => (direction > 0 ? stops() : stops().reverse())
    .find((stop) => !near(scale, stop) && (direction > 0 ? stop > scale : stop < scale));
  const geometryKey = () => {
    const styles = getComputedStyle(dialog);
    return [viewport.clientWidth, viewport.clientHeight, styles.paddingTop, styles.paddingRight,
      styles.paddingBottom, styles.paddingLeft].join(":");
  };
  const updateVisibleControls = () => {
    const { top, left, height, width } = getVisibleViewport();
    const bounds = dialog.getBoundingClientRect();
    for (const [edge, value] of Object.entries({
      top: top - bounds.top, left: left - bounds.left,
      right: bounds.right - left - width, bottom: bounds.bottom - top - height,
    })) dialog.style.setProperty(`--viewer-visible-${edge}`, `${Math.max(0, value)}px`);
  };
  // At 90° and 270° a landscape image becomes portrait, so fit and cover are computed on the swapped dimensions (R11).
  const sideways = () => Math.abs(Math.round(angle / 90)) % 2 === 1;
  const visualSize = () => (sideways() ? [fitHeight, fitWidth] : [fitWidth, fitHeight]);
  // `previousWidth`: keep the displayed image size when the angle changes, the scale is recomputed for the new frame.
  const measureFit = (previousWidth) => {
    const stop = previousWidth ? -1 : stops().findIndex((value) => near(scale, value));
    fitGeometryKey = geometryKey();
    const styles = getComputedStyle(dialog);
    const touch = touchScreen.matches;
    const insetX = touch || viewport.clientWidth <= 750 ? 0 : viewport.clientWidth <= 960 ? 16 : 64;
    const insetTop = touch ? 0 : Math.max(80, (parseFloat(styles.paddingTop) || 0) + 64);
    const insetBottom = touch ? 0 : Math.max(80, (parseFloat(styles.paddingBottom) || 0) + 64);
    const availableWidth = Math.max(1, viewport.clientWidth - 2 * insetX
      - (parseFloat(styles.paddingLeft) || 0) - (parseFloat(styles.paddingRight) || 0));
    const availableHeight = Math.max(1, viewport.clientHeight - insetTop - insetBottom);
    const ratio = record.media.width / record.media.height;
    const [boxWidth, boxHeight] = sideways() ? [availableHeight, availableWidth] : [availableWidth, availableHeight];
    fitWidth = Math.min(record.media.width, boxWidth, boxHeight * ratio);
    fitHeight = fitWidth / ratio;
    media.style.width = `${fitWidth}px`;
    media.style.height = `${fitHeight}px`;
    videoHost?.style.setProperty("--viewer-fit-width", `${fitWidth}px`);
    videoHost?.style.setProperty("--viewer-fit-height", `${fitHeight}px`);
    const [visualWidth, visualHeight] = visualSize();
    cover = Math.max(viewport.clientWidth / visualWidth, viewport.clientHeight / visualHeight);
    scale = previousWidth ? scale * previousWidth / fitWidth : stop >= 0 ? stops()[stop] : clamp(scale, 1, 2 * cover);
  };
  const panLimits = () => {
    const [visualWidth, visualHeight] = visualSize();
    return {
      x: Math.max(0, (visualWidth * scale - viewport.clientWidth) / 2),
      y: Math.max(0, (visualHeight * scale - viewport.clientHeight) / 2),
    };
  };
  const updateControls = () => {
    // The aria-live status announces the changed value at the end of a pinch, not on every frame of it.
    const status = `${Math.round(scale * 100)}%`;
    if (!pinch && zoomStatus.textContent !== status) zoomStatus.value = zoomStatus.textContent = status;
    zoomOutButton.disabled = atFit();
    zoomInButton.disabled = atMax();
    // A video in the viewer cannot be zoomed (primary-video-player R8, owner 2026-10-25).
    zoomInButton.hidden = zoomOutButton.hidden = media === video;
    media.style.cursor = atFit() ? "default" : drag ? "grabbing" : "grab";
    const active = document.activeElement;
    if (dialog.open && [zoomInButton, zoomOutButton].includes(active)
      && (active.disabled || active.hidden)) {
      (zoomInButton.disabled ? zoomOutButton : zoomInButton).focus({ preventScroll: true });
    }
  };
  const renderTransform = () => {
    const limits = panLimits();
    panX = clamp(panX, -limits.x, limits.x);
    panY = clamp(panY, -limits.y, limits.y);
    media.style.transform = `translate3d(${panX}px, ${panY}px, 0) rotate(${angle}deg) scale(${scale})`;
    updateControls();
    return media.style.transform;
  };
  const runMotion = (from, to, duration, easing, state, finish) => {
    cancelMotion();
    const generation = motionGeneration;
    media.style.transform = to;
    dialog.dataset.viewerState = state;
    const settle = () => {
      if (generation !== motionGeneration) return;
      imageAnimation?.cancel();
      imageAnimation = null;
      media.style.transform = to;
      if (finish) finish();
      else if (dialog.open) dialog.dataset.viewerState = "open";
    };
    if (reducedMotion.matches || typeof media.animate !== "function") {
      settle();
      return;
    }
    try {
      imageAnimation = media.animate([{ transform: from }, { transform: to }], { duration, easing });
      imageAnimation.finished.then(settle, () => {});
    } catch {
      settle();
    }
  };
  const sourceTransform = () => {
    const source = media === video ? sourceRect : heroImage?.isConnected && heroImage.getBoundingClientRect();
    if (!source?.width || !source.height) return null;
    const bounds = viewport.getBoundingClientRect();
    const x = source.x + source.width / 2 - (bounds.x + bounds.width / 2);
    const y = source.y + source.height / 2 - (bounds.y + bounds.height / 2);
    return `translate3d(${x}px, ${y}px, 0) scale(${source.width / fitWidth})`;
  };
  const displayed = () => {
    const transform = getComputedStyle(media).transform;
    return new DOMMatrix(transform === "none" ? undefined : transform);
  };
  // Change the angle and re-measure the frame; return the displayed frame normalized to the new element size so the animation does not jump.
  const turnTo = (degrees, from = displayed()) => {
    if (degrees === angle) return from;
    const width = fitWidth;
    angle = degrees;
    measureFit(width);
    return from.scale(width / fitWidth);
  };
  // Bring the image to `target` at the current angle; the image point under `anchor` (read from frame `matrix`) stays put when target > Fit.
  const moveTo = (target, anchor, matrix = displayed()) => {
    if (target > 1 && Number.isFinite(anchor?.clientX) && Number.isFinite(anchor?.clientY)) {
      const bounds = viewport.getBoundingClientRect();
      const offsetX = anchor.clientX - bounds.left - bounds.width / 2;
      const offsetY = anchor.clientY - bounds.top - bounds.height / 2;
      const local = matrix.inverse().transformPoint({ x: offsetX, y: offsetY });
      const [x, y] = rotate(local.x * target, local.y * target, angle);
      panX = offsetX - x;
      panY = offsetY - y;
    }
    scale = target;
    if (scale === 1) panX = panY = 0;
    runMotion(matrix.toString(), renderTransform(), 200, "ease-in-out", "zooming");
  };
  const setScale = (target, anchor) => {
    if (!dialog.open || dialog.dataset.viewerState === "closing" || target === undefined
      || media === video) return;
    const nextScale = clamp(target, 1, 2 * cover);
    if (nextScale !== scale) moveTo(nextScale, anchor);
  };
  // A gesture during a zoom animation continues from the frame on screen; while opening it starts from Fit.
  const adoptDisplayed = () => {
    if (!imageAnimation) return;
    if (dialog.dataset.viewerState === "zooming") {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(media).transform);
      scale = Math.hypot(matrix.a, matrix.b);
      angle = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
      panX = matrix.m41;
      panY = matrix.m42;
    }
    cancelMotion();
    dialog.dataset.viewerState = "open";
    renderTransform();
  };
  // Return within [Fit, Max] and snap the angle to a multiple of 90 after the gesture; `anchor` stays still, Fit re-centers (R2, R11).
  const settle = (anchor) => {
    const snapped = ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
    const target = clamp(scale, 1, 2 * cover);
    if (snapped === angle && target === scale) renderTransform();
    else {
      const from = turnTo(snapped);
      moveTo(clamp(scale, 1, 2 * cover), anchor, from);
    }
  };
  const midpoint = () => {
    const [a, b] = touches.values();
    return { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      twist: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI };
  };
  const startPinch = () => {
    const { clientX, clientY, distance, twist } = midpoint();
    const bounds = viewport.getBoundingClientRect();
    // The image point under the midpoint, in the unrotated, unscaled image coordinate system.
    const [localX, localY] = rotate((clientX - bounds.left - bounds.width / 2 - panX) / scale,
      (clientY - bounds.top - bounds.height / 2 - panY) / scale, -angle);
    pinch = { scale, angle, distance, twist, clientX, clientY, localX, localY, turning: null };
  };
  const movePinch = () => {
    const { clientX, clientY, distance, twist } = midpoint();
    const bounds = viewport.getBoundingClientRect();
    const max = 2 * cover;
    const ratio = distance / pinch.distance;
    const turn = ((twist - pinch.twist + 540) % 360) - 180;
    // Twisting past the threshold rotates with the hand, measured from the threshold so it does not jump; if the zoom clearly changed first, rotation is locked for the whole gesture (R11).
    if (pinch.turning === null) {
      if (Math.abs(turn) >= TWIST_THRESHOLD) pinch.turning = Math.sign(turn) * TWIST_THRESHOLD;
      else if (ratio > ZOOM_LOCK || ratio < 1 / ZOOM_LOCK) pinch.turning = false;
    }
    if (pinch.turning) angle = pinch.angle + turn - pinch.turning;
    const raw = pinch.scale * ratio;
    // Past the limit, the image follows one third of the finger movement, at most 15% over.
    scale = raw > max ? Math.min(max + (raw - max) / 3, max * 1.15)
      : raw < 1 ? Math.max(1 - (1 - raw) / 3, 0.85) : raw;
    const [x, y] = rotate(scale * pinch.localX, scale * pinch.localY, angle);
    panX = clientX - bounds.left - bounds.width / 2 - x;
    panY = clientY - bounds.top - bounds.height / 2 - y;
    Object.assign(pinch, { clientX, clientY });
    renderTransform();
  };
  const unlock = () => {
    scroll?.unlockLogicalScroll?.(lockedScroll);
  };
  const setBackdropOpacity = (value) => {
    if (value === 1) dialog.style.removeProperty("--viewer-backdrop-opacity");
    else dialog.style.setProperty("--viewer-backdrop-opacity", `${value}`);
  };
  // Swipe to close (R9): at Fit the image follows the finger vertically and the backdrop fades with the distance.
  const moveSwipe = (event) => {
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    if (!swipe.active) {
      if (Math.hypot(dx, dy) <= TOUCH_SLOP) return;
      if (Math.abs(dy) <= Math.abs(dx)) {
        swipe = null;
        return;
      }
      swipe.active = true;
      tap = null;
      dialog.dataset.viewerSwipe = "";
    }
    swipe.velocity = (event.clientY - swipe.lastY) / Math.max(1, event.timeStamp - swipe.lastTime);
    Object.assign(swipe, { dy, lastY: event.clientY, lastTime: event.timeStamp });
    media.style.transform = `translate3d(0, ${dy}px, 0) rotate(${angle}deg) scale(1)`;
    setBackdropOpacity(1 - Math.min(1, Math.abs(dy) / (0.5 * viewport.clientHeight)));
  };
  const endSwipe = (release) => {
    const { active, dy, velocity } = swipe;
    swipe = null;
    if (!active) return;
    delete dialog.dataset.viewerSwipe;
    if (release && (Math.abs(dy) >= 0.15 * viewport.clientHeight || Math.abs(velocity) >= 0.5)) {
      close();
      return;
    }
    setBackdropOpacity(1);
    const from = media.style.transform;
    runMotion(from, renderTransform(), 200, "ease-in-out", "zooming");
  };
  const finishClose = (restoreFocus) => {
    cancelMotion();
    endSlide();
    dialog.close();
    if (media === video) detachVideo();
    delete dialog.dataset.viewerState;
    delete dialog.dataset.viewerSwipe;
    setBackdropOpacity(1);
    // Closing by anything other than Back: drop the viewer's history entry so the next Back leaves detail (R10).
    // A flag, not a state key: the router may overwrite the entry's state while the viewer is open.
    if (ownEntry) {
      ownEntry = false;
      skipPop = true;
      history.back();
    }
    drag = pinch = tap = swipe = null;
    touches.clear();
    scale = 1;
    angle = 0;
    panX = panY = 0;
    renderTransform();
    unlock();
    // Drop the picture so the next open never paints it; with no src attribute no error event fires.
    expandedImage.removeAttribute("src");
    if (!restoreFocus || !expandButton.isConnected) return;
    expandButton.focus({ preventScroll: true });
    // A resize while open may leave the restored focus target off screen; center it immediately.
    const { top, height } = getVisibleViewport();
    const bounds = expandButton.getBoundingClientRect();
    if (bounds.top < top || bounds.bottom > top + height) {
      scroll?.setLogicalScroll?.(scroll.getLogicalScroll() + bounds.top + bounds.height / 2 - top - height / 2);
    }
  };
  // The image loading the original for the viewer (showImage); null when not waiting.
  let pendingOriginal = null;
  // A photo opens only once the primary has it (owner 2026-11-11): the viewer starts from that picture, never from
  // the one its <img> kept from the last open, which Chrome keeps painting until a new src loads.
  const primaryReady = () => record?.media.kind === "video" || !heroImage
    || (heroImage.complete && heroImage.naturalWidth > 0);
  // Touch screens hide the button (R8), so its icon stays still there.
  const expandIcon = expandButton.querySelector("[data-detail-expand-icon]");
  const icon = expandIcon && createLoadingExpandIcon(expandIcon, { still: () => reducedMotion.matches || touchScreen.matches });
  const syncExpand = () => {
    const ready = primaryReady();
    expandButton.disabled = !ready;
    icon?.setLoading(!ready);
  };
  const close = ({ restoreFocus = true, animate = restoreFocus } = {}) => {
    if (!dialog.open) return;
    pendingOriginal = null;
    if (!animate || reducedMotion.matches) {
      finishClose(restoreFocus);
      return;
    }
    if (dialog.dataset.viewerState === "closing") return;
    const target = sourceTransform();
    if (!target) {
      finishClose(restoreFocus);
      return;
    }
    const from = getComputedStyle(media).transform;
    runMotion(from, target, 250, "cubic-bezier(0.55, 0, 0, 1)", "closing", () => finishClose(restoreFocus));
  };
  // Borrow the primary's own video and player, moved in a single task so the video does not stop; detach returns it to the exact place.
  const attachVideo = () => {
    pendingOriginal = null;
    homeParent = video.parentNode;
    home = player.nextSibling;
    videoHost.append(video, player);
    videoHost.hidden = false;
    expandedImage.hidden = true;
    media = video;
  };
  const detachVideo = () => {
    homeParent.insertBefore(video, home);
    homeParent.insertBefore(player, home);
    for (const name of ["width", "height", "transform", "cursor"]) video.style.removeProperty(name);
    videoHost.hidden = true;
    expandedImage.hidden = false;
    media = expandedImage;
  };
  // The original shows only once loaded (progressive-loading R3): the viewer shows the existing primary image, loads the original separately, and swaps src
  // only after the load finishes.
  const mediaBase = (url) => new URL(url, location.href).pathname.replace(/(?:-(?:240|480|960|1600|2048))?\.\w+$/, "");
  const swapOriginal = () => {
    if (!pendingOriginal) return;
    expandedImage.src = pendingOriginal.src;
    pendingOriginal = null;
  };
  const showImage = () => {
    const original = responsiveSource(record.media.src, record.media.width);
    const current = heroImage?.currentSrc;
    pendingOriginal = null;
    if (current && current !== new URL(original, location.href).href && mediaBase(current) === mediaBase(original)) {
      expandedImage.src = current;
      const loader = pendingOriginal = new Image();
      loader.addEventListener("load", () => pendingOriginal === loader && swapOriginal());
      loader.src = original;
    } else {
      expandedImage.src = original;
    }
    expandedImage.alt = document.documentElement.lang === "en" ? record.media.altEn : record.media.altVi;
    expandedImage.width = record.media.width;
    expandedImage.height = record.media.height;
    expandedImage.fetchPriority = "high";
  };
  const open = () => {
    if (!record || dialog.open || !primaryReady()) return;
    sourceRect = record.media.kind === "video" ? video.getBoundingClientRect() : null;
    lockedScroll = scroll?.lockLogicalScroll?.() ?? scroll?.getLogicalScroll?.() ?? window.scrollY;
    if (sourceRect) attachVideo();
    else showImage();
    scale = 1;
    angle = 0;
    panX = panY = 0;
    dialog.showModal();
    onOpen?.();
    history.pushState(history.state, "");
    ownEntry = true;
    updateVisibleControls();
    measureFit();
    const target = renderTransform();
    runMotion(sourceTransform() || target, target, 300, "cubic-bezier(0.55, 0, 0, 1)", "opening");
    closeButton.focus({ preventScroll: true });
  };
  // Every visible button and input in DOM order, so Tab reaches the thumbnail row and the video player.
  const visibleControls = () => [...dialog.querySelectorAll("button, input")]
    .filter((control) => !control.disabled && !control.hidden && control.getClientRects().length > 0
      && getComputedStyle(control).visibility !== "hidden");
  const endSlide = () => {
    if (!slide) return;
    slide.ghost.remove();
    slide.animations.forEach((animation) => animation.cancel());
    slide = null;
  };
  // The viewer thumbnail row changes the card's media (R8): a sliding layer carries the old media out, the new media slides in like the primary strip.
  // `apply` switches the primary to the new media; the video must return to the primary before the primary changes source.
  const slideTo = (nextRecord, step, apply) => {
    if (!dialog.open || dialog.dataset.viewerState === "closing") return;
    endSlide();
    cancelMotion();
    dialog.dataset.viewerState = "open";
    // Video: a canvas draws the currently shown frame, the poster if there is no frame yet; image: a copy of the image.
    const ghost = media === expandedImage ? expandedImage.cloneNode()
      : video.readyState < 2 ? Object.assign(document.createElement("img"), { src: video.poster, alt: "" })
        : Object.assign(document.createElement("canvas"), { width: video.videoWidth, height: video.videoHeight });
    ghost.getContext?.("2d").drawImage(video, 0, 0);
    ghost.removeAttribute("data-detail-expanded-image");
    ghost.className = "detail-dialog__ghost";
    ghost.setAttribute("aria-hidden", "true");
    for (const name of ["width", "height", "transform"]) ghost.style[name] = media.style[name];
    viewport.append(ghost);
    if (media === video) detachVideo();
    apply();
    record = nextRecord;
    if (record.media.kind === "video") attachVideo();
    else showImage();
    sourceRect = null;
    scale = 1;
    angle = 0;
    panX = panY = 0;
    measureFit();
    renderTransform();
    const current = slide = { ghost, animations: [] };
    const target = media;
    const ready = target === video
      ? video.readyState >= 2 || new Promise((resolve) => {
        video.addEventListener("loadeddata", resolve, { once: true });
        video.addEventListener("error", resolve, { once: true });
      })
      : expandedImage.decode().catch(() => {});
    void Promise.resolve(ready).then(() => {
      if (slide !== current) return;
      if (reducedMotion.matches) return endSlide();
      const width = viewport.clientWidth;
      current.animations = [
        ghost.animate([{ translate: "0 0" }, { translate: `${-step * width}px 0` }], PUSH_TIMING),
        target.animate([{ translate: `${step * width}px 0` }, { translate: "0 0" }], PUSH_TIMING),
      ];
      return current.animations[1].finished.then(() => { if (slide === current) endSlide(); }, () => {});
    });
  };

  expandButton.addEventListener("click", open, { signal: controller.signal });
  // A touch screen opens the viewer with one tap on the primary photo (R7); touching the video plays or pauses, open with the expand button.
  heroFrame?.addEventListener("pointerdown", (event) => {
    // Touching a button in the frame (back, change media) does not open the viewer.
    heroTap = event.pointerType === "touch" && event.isPrimary && record?.media.kind !== "video"
      && !event.target.closest("button") ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
  }, { signal: controller.signal });
  heroFrame?.addEventListener("pointermove", (event) => {
    if (heroTap?.id === event.pointerId && Math.hypot(event.clientX - heroTap.x, event.clientY - heroTap.y) > TOUCH_SLOP) heroTap = null;
  }, { signal: controller.signal });
  heroFrame?.addEventListener("pointerup", (event) => {
    if (heroTap?.id !== event.pointerId) return;
    heroTap = null;
    open();
    // Double tap habit: the second tap lands in the just-opened viewer and is swallowed, no zoom.
    lastTap = { time: event.timeStamp, x: event.clientX, y: event.clientY };
  }, { signal: controller.signal });
  heroImage?.addEventListener("load", syncExpand, { signal: controller.signal });
  heroImage?.addEventListener("error", syncExpand, { signal: controller.signal });
  closeButton.addEventListener("click", () => close(), { signal: controller.signal });
  zoomInButton.addEventListener("click", () => setScale(nextStop(1)), { signal: controller.signal });
  zoomOutButton.addEventListener("click", () => setScale(nextStop(-1)), { signal: controller.signal });
  viewport.addEventListener("wheel", (event) => {
    if (!dialog.open || dialog.dataset.viewerState === "closing" || event.deltaY === 0) return;
    event.preventDefault();
    setScale(nextStop(event.deltaY < 0 ? 1 : -1), event);
  }, { passive: false, signal: controller.signal });
  viewport.addEventListener("mousedown", (event) => {
    if (event.button === 1) event.preventDefault();
  }, { signal: controller.signal });
  viewport.addEventListener("auxclick", (event) => {
    if (event.button === 1) event.preventDefault();
  }, { signal: controller.signal });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    event.stopPropagation();
    close();
  }, { signal: controller.signal });
  dialog.addEventListener("pointerdown", (event) => {
    if (event.button === 1 && viewport.contains(event.target)) {
      event.preventDefault();
      setScale(1);
      return;
    }
    const closing = dialog.dataset.viewerState === "closing";
    // The third finger is ignored: it neither drags nor ends the pinch.
    if (event.pointerType === "touch" && touches.size === 2) return;
    // A video has no pinch and no touch zoom: touching the video only plays or pauses via the player (R8).
    if (event.pointerType === "touch" && !closing && media !== video && viewport.contains(event.target)) {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touches.size === 2) {
        // Two fingers never close the viewer and end every drag, swipe or one-finger tap.
        backdropPress = false;
        if (swipe?.active) {
          delete dialog.dataset.viewerSwipe;
          setBackdropOpacity(1);
          renderTransform();
        }
        drag = tap = swipe = null;
        adoptDisplayed();
        startPinch();
        event.preventDefault();
        return;
      }
      // The second tap of a double tap changes zoom only once with the first tap: no pan, no swipe, no close (R4).
      if (isSecondTap(lastTap, event)) {
        lastTap = null;
        tap = null;
        backdropPress = false;
        return;
      }
      tap = event.target === media ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
    }
    backdropPress = event.target === dialog || event.target === viewport;
    if (backdropPress) return;
    if (event.target !== media || closing) return;
    if (atFit()) {
      if (event.pointerType !== "touch") return;
      adoptDisplayed();
      swipe = { id: event.pointerId, x: event.clientX, y: event.clientY,
        lastY: event.clientY, lastTime: event.timeStamp, active: false };
      return;
    }
    adoptDisplayed();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, panX, panY, moved: event.pointerType !== "touch" };
    viewport.setPointerCapture?.(event.pointerId);
    renderTransform();
    event.preventDefault();
  }, { signal: controller.signal });
  // Close only on a backdrop tap; a touch swipe that starts there (e.g. mid zoom) does not fire a click.
  dialog.addEventListener("click", (event) => {
    if (backdropPress && (event.target === dialog || event.target === viewport)) close();
    backdropPress = false;
  }, { signal: controller.signal });
  dialog.addEventListener("pointermove", (event) => {
    const touch = touches.get(event.pointerId);
    if (touch) Object.assign(touch, { x: event.clientX, y: event.clientY });
    if (tap?.id === event.pointerId && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > TOUCH_SLOP) tap = null;
    if (pinch && touch) {
      movePinch();
      event.preventDefault();
      return;
    }
    if (swipe?.id === event.pointerId) {
      moveSwipe(event);
      event.preventDefault();
      return;
    }
    if (!drag || drag.id !== event.pointerId) return;
    event.preventDefault();
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) <= TOUCH_SLOP) return;
    drag.moved = true;
    panX = drag.panX + event.clientX - drag.x;
    panY = drag.panY + event.clientY - drag.y;
    renderTransform();
  }, { signal: controller.signal });
  const endPointer = (event) => {
    if (!touches.delete(event.pointerId) && (!drag || drag.id !== event.pointerId)) return;
    if (pinch) {
      const anchor = pinch;
      pinch = null;
      const [rest] = touches;
      // A remaining finger within [Fit, Max] at a multiple-of-90 angle keeps panning; otherwise the image snaps back and the finger is ignored.
      if (rest && scale >= 1 && scale <= 2 * cover && angle % 90 === 0) {
        if (!atFit()) drag = { id: rest[0], x: rest[1].x, y: rest[1].y, panX, panY, moved: true };
        renderTransform();
      } else settle(anchor);
      return;
    }
    if (swipe?.id === event.pointerId) endSwipe(event.type === "pointerup");
    if (drag?.id === event.pointerId) {
      drag = null;
      if (viewport.hasPointerCapture?.(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      settle();
    }
    if (tap?.id !== event.pointerId || event.type !== "pointerup") return;
    tap = null;
    lastTap = { time: event.timeStamp, x: event.clientX, y: event.clientY };
    // One tap: Fit zooms to Cover around the tap point, any other scale returns to Fit (R4).
    setScale(atFit() ? cover : 1, event);
  };
  dialog.addEventListener("pointerup", endPointer, { signal: controller.signal });
  dialog.addEventListener("pointercancel", endPointer, { signal: controller.signal });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      const controls = visibleControls();
      const index = controls.indexOf(document.activeElement);
      const next = index < 0 ? 0 : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      controls[next]?.focus({ preventScroll: true });
      event.preventDefault();
      return;
    }
    if (atFit() || dialog.dataset.viewerState === "closing"
      || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    cancelMotion();
    dialog.dataset.viewerState = "open";
    if (event.key === "ArrowLeft") panX += 40;
    if (event.key === "ArrowRight") panX -= 40;
    if (event.key === "ArrowUp") panY += 40;
    if (event.key === "ArrowDown") panY -= 40;
    renderTransform();
    event.preventDefault();
  }, { signal: controller.signal });
  expandedImage.addEventListener("error", () => close({ animate: false }), { signal: controller.signal });
  const resize = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      if (!dialog.open) return;
      updateVisibleControls();
      if (fitGeometryKey === geometryKey()) return;
      sourceRect = null;
      if (dialog.dataset.viewerState === "closing") {
        finishClose(true);
        return;
      }
      cancelMotion();
      measureFit();
      renderTransform();
      dialog.dataset.viewerState = "open";
    });
  };
  const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(viewport);
  window.addEventListener("resize", resize, { passive: true, signal: controller.signal });
  window.visualViewport?.addEventListener("resize", resize, { passive: true, signal: controller.signal });
  window.visualViewport?.addEventListener("scroll", resize, { passive: true, signal: controller.signal });
  // The site router asks this function before routing a popstate, so Back while the viewer is open only closes it (R10).
  const popState = () => {
    if (skipPop) {
      skipPop = false;
      return true;
    }
    if (!ownEntry || !dialog.open) return false;
    // Back during the close animation also consumes the viewer's entry; otherwise finishClose would call history.back() once more.
    ownEntry = false;
    if (dialog.dataset.viewerState !== "closing") close();
    return true;
  };
  const cleanup = () => {
    close({ restoreFocus: false, animate: false });
    cancelMotion();
    cancelAnimationFrame(resizeFrame);
    icon?.cleanup();
    resizeObserver?.disconnect();
    controller.abort();
    if (parent && dialog.parentNode !== parent) parent.insertBefore(dialog, nextSibling?.isConnected ? nextSibling : null);
  };
  signal?.addEventListener("abort", cleanup, { once: true });

  return {
    cleanup,
    close,
    popState,
    slideTo,
    setRecord(nextRecord) {
      if (record?.id !== nextRecord?.id) close({ restoreFocus: false });
      record = nextRecord || null;
      syncExpand();
      if (record) expandedImage.dataset.detailId = record.id;
      else delete expandedImage.dataset.detailId;
      if (record && dialog.open) {
        expandedImage.alt = document.documentElement.lang === "en" ? record.media.altEn : record.media.altVi;
      }
    },
  };
}
