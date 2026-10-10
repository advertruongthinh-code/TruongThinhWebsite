import { responsiveSource } from "./responsive-image.mjs";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
// Tap thứ hai của double tap: chạm xuống trong 300ms và 40px từ tap trước (advertising-viewer-touch-zoom R4).
const isSecondTap = (last, event) => last && event.timeStamp - last.time <= 300
  && Math.hypot(event.clientX - last.x, event.clientY - last.y) <= 40;
// Ngón tay di quá 10px mới là kéo; dưới mức đó vẫn là tap, ảnh không pan (R3, R4).
const TOUCH_SLOP = 10;
// Hai ngón chỉ xoay khi vặn quá 20° trước khi zoom đổi quá 20%; pinch zoom thường không xoay (R11).
const TWIST_THRESHOLD = 20;
const ZOOM_LOCK = 1.2;
// Xoay vector (x, y) một góc `degrees` theo chiều kim đồng hồ của màn hình, như CSS rotate().
const rotate = (x, y, degrees) => {
  const radians = degrees * Math.PI / 180;
  return [x * Math.cos(radians) - y * Math.sin(radians), x * Math.sin(radians) + y * Math.cos(radians)];
};

export function createAdvertisingPhotoViewer({
  dialog,
  expandButton,
  expandedImage,
  heroImage,
  viewport,
  closeButton,
  resetButton,
  zoomInButton,
  zoomOutButton,
  zoomStatus,
  scroll,
  getVisibleViewport,
  signal,
} = {}) {
  if (!dialog || !expandButton || !expandedImage || !viewport || !closeButton || !zoomInButton || !zoomOutButton || !zoomStatus) {
    return { cleanup() {}, close() {}, popState: () => false, setRecord() {} };
  }
  const controller = new AbortController();
  const heroFrame = heroImage?.parentElement;
  const parent = dialog.parentNode;
  const nextSibling = dialog.nextSibling;
  let record = null;
  let scale = 1;
  // Góc xoay ảnh theo độ; tự do khi đang pinch, ngoài ra luôn là bội 90 (R11).
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
  // Tap gần nhất trên ảnh hoặc primary; tap kế trong cửa sổ double tap bị nuốt (R4, R7).
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
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  document.body.append(dialog);

  const cancelMotion = () => {
    motionGeneration += 1;
    imageAnimation?.cancel();
    imageAnimation = null;
  };
  // Fit, Cover và Max là các điểm dừng cho button và wheel; bản thân scale liên tục. Cover được đo cùng với
  // fit để resize vẫn biết scale đang ở điểm dừng nào.
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
    })) dialog.style.setProperty(`--advertising-viewer-visible-${edge}`, `${Math.max(0, value)}px`);
  };
  // Ở 90° và 270° ảnh nằm ngang thành dọc nên khung vừa và cover tính theo chiều đã đổi (R11).
  const sideways = () => Math.abs(Math.round(angle / 90)) % 2 === 1;
  const visualSize = () => (sideways() ? [fitHeight, fitWidth] : [fitWidth, fitHeight]);
  // `previousWidth`: giữ nguyên kích thước ảnh đang hiện khi đổi góc, scale tính lại theo khung mới.
  const measureFit = (previousWidth) => {
    const stop = previousWidth ? -1 : stops().findIndex((value) => near(scale, value));
    fitGeometryKey = geometryKey();
    const styles = getComputedStyle(dialog);
    const insetX = viewport.clientWidth <= 750 ? 0 : viewport.clientWidth <= 960 ? 16 : 64;
    const insetTop = Math.max(80, (parseFloat(styles.paddingTop) || 0) + 64);
    const insetBottom = Math.max(80, (parseFloat(styles.paddingBottom) || 0) + 64);
    const availableWidth = Math.max(1, viewport.clientWidth - 2 * insetX
      - (parseFloat(styles.paddingLeft) || 0) - (parseFloat(styles.paddingRight) || 0));
    const availableHeight = Math.max(1, viewport.clientHeight - insetTop - insetBottom);
    const ratio = record.media.width / record.media.height;
    const [boxWidth, boxHeight] = sideways() ? [availableHeight, availableWidth] : [availableWidth, availableHeight];
    fitWidth = Math.min(record.media.width, boxWidth, boxHeight * ratio);
    fitHeight = fitWidth / ratio;
    expandedImage.style.width = `${fitWidth}px`;
    expandedImage.style.height = `${fitHeight}px`;
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
    // Status aria-live thông báo giá trị đã đổi ở cuối một pinch, không phải mỗi frame của nó.
    const status = `${Math.round(scale * 100)}%`;
    if (!pinch && zoomStatus.textContent !== status) zoomStatus.value = zoomStatus.textContent = status;
    zoomOutButton.disabled = atFit();
    zoomInButton.disabled = atMax();
    if (resetButton) {
      resetButton.hidden = false;
      resetButton.disabled = atFit() && !angle;
    }
    expandedImage.style.cursor = atFit() ? "default" : drag ? "grabbing" : "grab";
    const active = document.activeElement;
    if (dialog.open && [resetButton, zoomInButton, zoomOutButton].includes(active)
      && (active.disabled || active.hidden)) {
      (zoomInButton.disabled ? zoomOutButton : zoomInButton).focus({ preventScroll: true });
    }
  };
  const renderTransform = () => {
    const limits = panLimits();
    panX = clamp(panX, -limits.x, limits.x);
    panY = clamp(panY, -limits.y, limits.y);
    expandedImage.style.transform = `translate3d(${panX}px, ${panY}px, 0) rotate(${angle}deg) scale(${scale})`;
    updateControls();
    return expandedImage.style.transform;
  };
  const runMotion = (from, to, duration, easing, state, finish) => {
    cancelMotion();
    const generation = motionGeneration;
    expandedImage.style.transform = to;
    dialog.dataset.advertisingViewerState = state;
    const settle = () => {
      if (generation !== motionGeneration) return;
      imageAnimation?.cancel();
      imageAnimation = null;
      expandedImage.style.transform = to;
      if (finish) finish();
      else if (dialog.open) dialog.dataset.advertisingViewerState = "open";
    };
    if (reducedMotion.matches || typeof expandedImage.animate !== "function") {
      settle();
      return;
    }
    try {
      imageAnimation = expandedImage.animate([{ transform: from }, { transform: to }], { duration, easing });
      imageAnimation.finished.then(settle, () => {});
    } catch {
      settle();
    }
  };
  const sourceTransform = () => {
    if (!heroImage?.isConnected) return null;
    const source = heroImage.getBoundingClientRect();
    const bounds = viewport.getBoundingClientRect();
    if (!source.width || !source.height) return null;
    const x = source.x + source.width / 2 - (bounds.x + bounds.width / 2);
    const y = source.y + source.height / 2 - (bounds.y + bounds.height / 2);
    return `translate3d(${x}px, ${y}px, 0) scale(${source.width / fitWidth})`;
  };
  const displayed = () => {
    const transform = getComputedStyle(expandedImage).transform;
    return new DOMMatrix(transform === "none" ? undefined : transform);
  };
  // Đổi góc và đo lại khung; trả frame đang hiện quy về kích thước phần tử mới để animation không nhảy.
  const turnTo = (degrees, from = displayed()) => {
    if (degrees === angle) return from;
    const width = fitWidth;
    angle = degrees;
    measureFit(width);
    return from.scale(width / fitWidth);
  };
  // Đưa ảnh tới `target` ở góc hiện tại; điểm ảnh dưới `anchor` (đọc từ frame `matrix`) giữ chỗ khi target > Fit.
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
    if (!dialog.open || dialog.dataset.advertisingViewerState === "closing" || target === undefined) return;
    const nextScale = clamp(target, 1, 2 * cover);
    if (nextScale !== scale) moveTo(nextScale, anchor);
  };
  // Một gesture trong lúc zoom animation tiếp tục từ frame đang trên màn hình; khi đang mở thì bắt đầu từ Fit.
  const adoptDisplayed = () => {
    if (!imageAnimation) return;
    if (dialog.dataset.advertisingViewerState === "zooming") {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(expandedImage).transform);
      scale = Math.hypot(matrix.a, matrix.b);
      angle = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
      panX = matrix.m41;
      panY = matrix.m42;
    }
    cancelMotion();
    dialog.dataset.advertisingViewerState = "open";
    renderTransform();
  };
  // Quay lại trong [Fit, Max] và hít góc về bội 90 sau gesture; `anchor` đứng yên, Fit căn lại giữa (R2, R11).
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
    // Điểm ảnh dưới trung điểm, trong hệ tọa độ ảnh chưa xoay và chưa scale.
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
    // Vặn quá ngưỡng thì xoay theo tay, tính từ ngưỡng nên không giật; zoom đổi rõ trước thì khóa xoay cả gesture (R11).
    if (pinch.turning === null) {
      if (Math.abs(turn) >= TWIST_THRESHOLD) pinch.turning = Math.sign(turn) * TWIST_THRESHOLD;
      else if (ratio > ZOOM_LOCK || ratio < 1 / ZOOM_LOCK) pinch.turning = false;
    }
    if (pinch.turning) angle = pinch.angle + turn - pinch.turning;
    const raw = pinch.scale * ratio;
    // Vượt giới hạn, ảnh đi theo một phần ba chuyển động của ngón tay, tối đa vượt 15%.
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
    if (value === 1) dialog.style.removeProperty("--advertising-viewer-backdrop-opacity");
    else dialog.style.setProperty("--advertising-viewer-backdrop-opacity", `${value}`);
  };
  // Swipe để đóng (R9): ở Fit ảnh theo ngón tay theo chiều dọc và backdrop mờ dần theo khoảng cách.
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
      dialog.dataset.advertisingViewerSwipe = "";
    }
    swipe.velocity = (event.clientY - swipe.lastY) / Math.max(1, event.timeStamp - swipe.lastTime);
    Object.assign(swipe, { dy, lastY: event.clientY, lastTime: event.timeStamp });
    expandedImage.style.transform = `translate3d(0, ${dy}px, 0) rotate(${angle}deg) scale(1)`;
    setBackdropOpacity(1 - Math.min(1, Math.abs(dy) / (0.5 * viewport.clientHeight)));
  };
  const endSwipe = (release) => {
    const { active, dy, velocity } = swipe;
    swipe = null;
    if (!active) return;
    delete dialog.dataset.advertisingViewerSwipe;
    if (release && (Math.abs(dy) >= 0.15 * viewport.clientHeight || Math.abs(velocity) >= 0.5)) {
      close();
      return;
    }
    setBackdropOpacity(1);
    const from = expandedImage.style.transform;
    runMotion(from, renderTransform(), 200, "ease-in-out", "zooming");
  };
  const finishClose = (restoreFocus) => {
    cancelMotion();
    dialog.close();
    delete dialog.dataset.advertisingViewerState;
    delete dialog.dataset.advertisingViewerSwipe;
    setBackdropOpacity(1);
    // Đóng bằng bất cứ thứ gì ngoài Back: bỏ history entry của viewer để lần Back kế tiếp rời detail (R10).
    // Một flag, không phải state key: router có thể ghi đè state của entry khi viewer đang mở.
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
    if (!restoreFocus || !expandButton.isConnected) return;
    expandButton.focus({ preventScroll: true });
    // Resize khi đang mở có thể để focus target đã khôi phục nằm ngoài màn hình; căn giữa nó ngay lập tức.
    const { top, height } = getVisibleViewport();
    const bounds = expandButton.getBoundingClientRect();
    if (bounds.top < top || bounds.bottom > top + height) {
      scroll?.setLogicalScroll?.(scroll.getLogicalScroll() + bounds.top + bounds.height / 2 - top - height / 2);
    }
  };
  const close = ({ restoreFocus = true, animate = restoreFocus } = {}) => {
    if (!dialog.open) return;
    if (!animate || reducedMotion.matches) {
      finishClose(restoreFocus);
      return;
    }
    if (dialog.dataset.advertisingViewerState === "closing") return;
    const target = sourceTransform();
    if (!target) {
      finishClose(restoreFocus);
      return;
    }
    const from = getComputedStyle(expandedImage).transform;
    runMotion(from, target, 250, "cubic-bezier(0.55, 0, 0, 1)", "closing", () => finishClose(restoreFocus));
  };
  const open = () => {
    if (!record || dialog.open) return;
    lockedScroll = scroll?.lockLogicalScroll?.() ?? scroll?.getLogicalScroll?.() ?? window.scrollY;
    expandedImage.src = responsiveSource(record.media.src);
    expandedImage.alt = document.documentElement.lang === "en" ? record.media.altEn : record.media.altVi;
    expandedImage.width = record.media.width;
    expandedImage.height = record.media.height;
    expandedImage.fetchPriority = "high";
    scale = 1;
    angle = 0;
    panX = panY = 0;
    dialog.showModal();
    history.pushState(history.state, "");
    ownEntry = true;
    updateVisibleControls();
    measureFit();
    const target = renderTransform();
    runMotion(sourceTransform() || target, target, 300, "cubic-bezier(0.55, 0, 0, 1)", "opening");
    closeButton.focus({ preventScroll: true });
  };
  const visibleControls = () => [closeButton, resetButton, zoomInButton, zoomOutButton]
    .filter((control) => control && !control.disabled && !control.hidden && control.getClientRects().length > 0);

  expandButton.addEventListener("click", open, { signal: controller.signal });
  // Màn cảm ứng mở viewer bằng một tap trên primary photo (R7).
  heroFrame?.addEventListener("pointerdown", (event) => {
    heroTap = event.pointerType === "touch" && event.isPrimary ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
  }, { signal: controller.signal });
  heroFrame?.addEventListener("pointermove", (event) => {
    if (heroTap?.id === event.pointerId && Math.hypot(event.clientX - heroTap.x, event.clientY - heroTap.y) > TOUCH_SLOP) heroTap = null;
  }, { signal: controller.signal });
  heroFrame?.addEventListener("pointerup", (event) => {
    if (heroTap?.id !== event.pointerId) return;
    heroTap = null;
    open();
    // Thói quen double tap: tap thứ hai rơi vào viewer vừa mở và bị nuốt, không zoom.
    lastTap = { time: event.timeStamp, x: event.clientX, y: event.clientY };
  }, { signal: controller.signal });
  closeButton.addEventListener("click", () => close(), { signal: controller.signal });
  zoomInButton.addEventListener("click", () => setScale(nextStop(1)), { signal: controller.signal });
  zoomOutButton.addEventListener("click", () => setScale(nextStop(-1)), { signal: controller.signal });
  // Reset về Fit và góc 0 (R5, R11).
  resetButton?.addEventListener("click", () => {
    if (!dialog.open || dialog.dataset.advertisingViewerState === "closing") return;
    moveTo(1, undefined, turnTo(0));
  }, { signal: controller.signal });
  viewport.addEventListener("wheel", (event) => {
    if (!dialog.open || dialog.dataset.advertisingViewerState === "closing" || event.deltaY === 0) return;
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
    const closing = dialog.dataset.advertisingViewerState === "closing";
    // Ngón thứ ba bị bỏ qua: nó không kéo cũng không kết thúc pinch.
    if (event.pointerType === "touch" && touches.size === 2) return;
    if (event.pointerType === "touch" && !closing && viewport.contains(event.target)) {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touches.size === 2) {
        // Hai ngón không bao giờ đóng viewer và kết thúc mọi drag, swipe hay tap một ngón.
        backdropPress = false;
        if (swipe?.active) {
          delete dialog.dataset.advertisingViewerSwipe;
          setBackdropOpacity(1);
          renderTransform();
        }
        drag = tap = swipe = null;
        adoptDisplayed();
        startPinch();
        event.preventDefault();
        return;
      }
      // Tap thứ hai của double tap chỉ đổi zoom một lần với tap đầu: không pan, không vuốt, không đóng (R4).
      if (isSecondTap(lastTap, event)) {
        lastTap = null;
        tap = null;
        backdropPress = false;
        return;
      }
      tap = event.target === expandedImage ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
    }
    backdropPress = event.target === dialog || event.target === viewport;
    if (backdropPress) return;
    if (event.target !== expandedImage || closing) return;
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
  // Chỉ đóng khi tap backdrop; một touch swipe bắt đầu ở đó (vd. giữa lúc zoom) không bắn click.
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
      // Một ngón còn lại trong [Fit, Max] ở góc bội 90 tiếp tục pan; còn lại ảnh bật về và nó bị bỏ qua.
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
    // Một tap: Fit zoom lên Cover quanh điểm tap, mọi scale khác trả về Fit (R4).
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
    if (atFit() || dialog.dataset.advertisingViewerState === "closing"
      || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    cancelMotion();
    dialog.dataset.advertisingViewerState = "open";
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
      if (dialog.dataset.advertisingViewerState === "closing") {
        finishClose(true);
        return;
      }
      cancelMotion();
      measureFit();
      renderTransform();
      dialog.dataset.advertisingViewerState = "open";
    });
  };
  const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(viewport);
  window.addEventListener("resize", resize, { passive: true, signal: controller.signal });
  window.visualViewport?.addEventListener("resize", resize, { passive: true, signal: controller.signal });
  window.visualViewport?.addEventListener("scroll", resize, { passive: true, signal: controller.signal });
  // Router của site hỏi hàm này trước khi route một popstate, nên Back khi viewer đang mở chỉ đóng nó (R10).
  const popState = () => {
    if (skipPop) {
      skipPop = false;
      return true;
    }
    if (!ownEntry || !dialog.open || dialog.dataset.advertisingViewerState === "closing") return false;
    ownEntry = false;
    close();
    return true;
  };
  const cleanup = () => {
    close({ restoreFocus: false, animate: false });
    cancelMotion();
    cancelAnimationFrame(resizeFrame);
    resizeObserver?.disconnect();
    controller.abort();
    if (parent && dialog.parentNode !== parent) parent.insertBefore(dialog, nextSibling?.isConnected ? nextSibling : null);
  };
  signal?.addEventListener("abort", cleanup, { once: true });

  return {
    cleanup,
    close,
    popState,
    setRecord(nextRecord) {
      if (record?.id !== nextRecord?.id) close({ restoreFocus: false });
      record = nextRecord || null;
      if (record) expandedImage.dataset.advertisingPhotoId = record.id;
      else delete expandedImage.dataset.advertisingPhotoId;
      if (record && dialog.open) {
        expandedImage.alt = document.documentElement.lang === "en" ? record.media.altEn : record.media.altVi;
      }
    },
  };
}
