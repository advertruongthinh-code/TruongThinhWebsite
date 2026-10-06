import { responsiveSource } from "./responsive-image.mjs";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
// Touch double tap: both taps within 300ms and 24px, each moving at most 10px (advertising-viewer-touch-zoom R4, R7).
const isDoubleTap = (last, event) => last && event.timeStamp - last.time <= 300
  && Math.hypot(event.clientX - last.x, event.clientY - last.y) <= 24;

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
  let fitWidth = 1;
  let fitHeight = 1;
  let cover = 1;
  let panX = 0;
  let panY = 0;
  let drag = null;
  let pinch = null;
  let tap = null;
  let lastTap = null;
  let swipe = null;
  let heroTap = null;
  let heroLastTap = null;
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
  // Fit, Cover and Max are stops for buttons and wheel; scale itself is continuous. Cover is measured with
  // the fit so a resize can still tell which stop the scale was on.
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
  const measureFit = () => {
    const stop = stops().findIndex((value) => near(scale, value));
    fitGeometryKey = geometryKey();
    const styles = getComputedStyle(dialog);
    const insetX = viewport.clientWidth <= 750 ? 0 : viewport.clientWidth <= 960 ? 16 : 64;
    const insetTop = Math.max(80, (parseFloat(styles.paddingTop) || 0) + 64);
    const insetBottom = Math.max(80, (parseFloat(styles.paddingBottom) || 0) + 64);
    const availableWidth = Math.max(1, viewport.clientWidth - 2 * insetX
      - (parseFloat(styles.paddingLeft) || 0) - (parseFloat(styles.paddingRight) || 0));
    const availableHeight = Math.max(1, viewport.clientHeight - insetTop - insetBottom);
    const ratio = record.media.width / record.media.height;
    fitWidth = Math.min(record.media.width, availableWidth, availableHeight * ratio);
    fitHeight = fitWidth / ratio;
    expandedImage.style.width = `${fitWidth}px`;
    expandedImage.style.height = `${fitHeight}px`;
    cover = Math.max(viewport.clientWidth / fitWidth, viewport.clientHeight / fitHeight);
    scale = stop >= 0 ? stops()[stop] : clamp(scale, 1, 2 * cover);
  };
  const panLimits = () => ({
    x: Math.max(0, (fitWidth * scale - viewport.clientWidth) / 2),
    y: Math.max(0, (fitHeight * scale - viewport.clientHeight) / 2),
  });
  const updateControls = () => {
    // aria-live status announces a changed value at the end of a pinch, not every frame of it.
    const status = `${Math.round(scale * 100)}%`;
    if (!pinch && zoomStatus.textContent !== status) zoomStatus.value = zoomStatus.textContent = status;
    zoomOutButton.disabled = atFit();
    zoomInButton.disabled = atMax();
    if (resetButton) {
      resetButton.hidden = false;
      resetButton.disabled = atFit();
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
    expandedImage.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`;
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
  const setScale = (target, anchor) => {
    if (!dialog.open || dialog.dataset.advertisingViewerState === "closing" || target === undefined) return;
    const from = getComputedStyle(expandedImage).transform;
    const nextScale = clamp(target, 1, 2 * cover);
    if (nextScale === scale) return;
    const matrix = new DOMMatrixReadOnly(from === "none" ? undefined : from);
    if (nextScale > 1 && Number.isFinite(anchor?.clientX) && Number.isFinite(anchor?.clientY)) {
      const bounds = viewport.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      const visualScale = matrix.a || scale;
      const localX = (anchor.clientX - centerX - matrix.m41) / visualScale;
      const localY = (anchor.clientY - centerY - matrix.m42) / visualScale;
      panX = anchor.clientX - centerX - nextScale * localX;
      panY = anchor.clientY - centerY - nextScale * localY;
    }
    scale = nextScale;
    if (scale === 1) panX = panY = 0;
    const to = renderTransform();
    runMotion(from, to, 200, "ease-in-out", "zooming");
  };
  // A gesture during a zoom animation continues from the frame on screen; during opening it starts from Fit.
  const adoptDisplayed = () => {
    if (!imageAnimation) return;
    if (dialog.dataset.advertisingViewerState === "zooming") {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(expandedImage).transform);
      scale = matrix.a;
      panX = matrix.m41;
      panY = matrix.m42;
    }
    cancelMotion();
    dialog.dataset.advertisingViewerState = "open";
    renderTransform();
  };
  // Back inside [Fit, Max] after a gesture; Max keeps `anchor` still, Fit recentres.
  const settle = (anchor) => {
    const target = clamp(scale, 1, 2 * cover);
    if (target === scale) renderTransform();
    else setScale(target, anchor);
  };
  const midpoint = () => {
    const [a, b] = touches.values();
    return { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
  };
  const startPinch = () => {
    const { clientX, clientY, distance } = midpoint();
    const bounds = viewport.getBoundingClientRect();
    pinch = {
      scale, distance, clientX, clientY,
      localX: (clientX - bounds.left - bounds.width / 2 - panX) / scale,
      localY: (clientY - bounds.top - bounds.height / 2 - panY) / scale,
    };
  };
  const movePinch = () => {
    const { clientX, clientY, distance } = midpoint();
    const bounds = viewport.getBoundingClientRect();
    const max = 2 * cover;
    const raw = pinch.scale * distance / pinch.distance;
    // Past a limit the image follows a third of the fingers, up to 15% over.
    scale = raw > max ? Math.min(max + (raw - max) / 3, max * 1.15)
      : raw < 1 ? Math.max(1 - (1 - raw) / 3, 0.85) : raw;
    panX = clientX - bounds.left - bounds.width / 2 - scale * pinch.localX;
    panY = clientY - bounds.top - bounds.height / 2 - scale * pinch.localY;
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
  // Swipe to close (R9): at Fit the image follows the finger vertically and the backdrop fades with distance.
  const moveSwipe = (event) => {
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    if (!swipe.active) {
      if (Math.hypot(dx, dy) <= 10) return;
      if (Math.abs(dy) <= Math.abs(dx)) {
        swipe = null;
        return;
      }
      swipe.active = true;
      tap = lastTap = null;
      dialog.dataset.advertisingViewerSwipe = "";
    }
    swipe.velocity = (event.clientY - swipe.lastY) / Math.max(1, event.timeStamp - swipe.lastTime);
    Object.assign(swipe, { dy, lastY: event.clientY, lastTime: event.timeStamp });
    expandedImage.style.transform = `translate3d(0, ${dy}px, 0) scale(1)`;
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
    // Closed by anything but Back: drop the viewer's history entry so the next Back leaves detail (R10).
    // A flag, not a state key: the router may rewrite the entry's state while the viewer is open.
    if (ownEntry) {
      ownEntry = false;
      skipPop = true;
      history.back();
    }
    drag = pinch = tap = lastTap = swipe = null;
    touches.clear();
    scale = 1;
    panX = panY = 0;
    renderTransform();
    unlock();
    if (!restoreFocus || !expandButton.isConnected) return;
    expandButton.focus({ preventScroll: true });
    // A resize while open can leave the restored focus target off-screen; centre it instantly.
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
  // Touch screens open the viewer with a double tap on the primary photo (R7).
  heroFrame?.addEventListener("pointerdown", (event) => {
    heroTap = event.pointerType === "touch" && event.isPrimary ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
  }, { signal: controller.signal });
  heroFrame?.addEventListener("pointermove", (event) => {
    if (heroTap?.id === event.pointerId && Math.hypot(event.clientX - heroTap.x, event.clientY - heroTap.y) > 10) heroTap = null;
  }, { signal: controller.signal });
  heroFrame?.addEventListener("pointerup", (event) => {
    if (heroTap?.id !== event.pointerId) return;
    heroTap = null;
    if (isDoubleTap(heroLastTap, event)) {
      heroLastTap = null;
      open();
    } else heroLastTap = { time: event.timeStamp, x: event.clientX, y: event.clientY };
  }, { signal: controller.signal });
  closeButton.addEventListener("click", () => close(), { signal: controller.signal });
  zoomInButton.addEventListener("click", () => setScale(nextStop(1)), { signal: controller.signal });
  zoomOutButton.addEventListener("click", () => setScale(nextStop(-1)), { signal: controller.signal });
  resetButton?.addEventListener("click", () => setScale(1), { signal: controller.signal });
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
    // A third finger is ignored: it neither drags nor ends the pinch.
    if (event.pointerType === "touch" && touches.size === 2) return;
    if (event.pointerType === "touch" && !closing && viewport.contains(event.target)) {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touches.size === 2) {
        // Two fingers never close the viewer and end any one-finger drag, swipe or tap.
        backdropPress = false;
        if (swipe?.active) {
          delete dialog.dataset.advertisingViewerSwipe;
          setBackdropOpacity(1);
          renderTransform();
        }
        drag = tap = lastTap = swipe = null;
        adoptDisplayed();
        startPinch();
        event.preventDefault();
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
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, panX, panY };
    viewport.setPointerCapture?.(event.pointerId);
    renderTransform();
    event.preventDefault();
  }, { signal: controller.signal });
  // Close on a backdrop tap only; a touch swipe that starts there (e.g. mid zoom) fires no click.
  dialog.addEventListener("click", (event) => {
    if (backdropPress && (event.target === dialog || event.target === viewport)) close();
    backdropPress = false;
  }, { signal: controller.signal });
  dialog.addEventListener("pointermove", (event) => {
    const touch = touches.get(event.pointerId);
    if (touch) Object.assign(touch, { x: event.clientX, y: event.clientY });
    if (tap?.id === event.pointerId && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10) tap = null;
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
    panX = drag.panX + event.clientX - drag.x;
    panY = drag.panY + event.clientY - drag.y;
    renderTransform();
    event.preventDefault();
  }, { signal: controller.signal });
  const endPointer = (event) => {
    if (!touches.delete(event.pointerId) && (!drag || drag.id !== event.pointerId)) return;
    if (pinch) {
      const anchor = pinch;
      pinch = null;
      const [rest] = touches;
      // One finger left inside [Fit, Max] keeps panning; out of range the image springs back and it is ignored.
      if (rest && scale >= 1 && scale <= 2 * cover) {
        if (!atFit()) drag = { id: rest[0], x: rest[1].x, y: rest[1].y, panX, panY };
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
    // Double tap: Fit zooms to Cover around the tap, any other scale returns to Fit.
    if (isDoubleTap(lastTap, event)) {
      lastTap = null;
      setScale(atFit() ? cover : 1, event);
    } else lastTap = { time: event.timeStamp, x: event.clientX, y: event.clientY };
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
  // The site router asks this before routing a popstate, so Back with the viewer open only closes it (R10).
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
