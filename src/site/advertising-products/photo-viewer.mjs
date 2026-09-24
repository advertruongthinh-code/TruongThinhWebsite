const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

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
  signal,
} = {}) {
  if (!dialog || !expandButton || !expandedImage || !viewport || !closeButton || !zoomInButton || !zoomOutButton || !zoomStatus) {
    return { cleanup() {}, close() {}, setRecord() {} };
  }
  const controller = new AbortController();
  const parent = dialog.parentNode;
  const nextSibling = dialog.nextSibling;
  let record = null;
  let level = 0;
  let scale = 1;
  let fitWidth = 1;
  let fitHeight = 1;
  let panX = 0;
  let panY = 0;
  let drag = null;
  let lockedScroll = 0;
  let imageAnimation = null;
  let motionGeneration = 0;
  let resizeFrame = 0;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  document.body.append(dialog);

  const cancelMotion = () => {
    motionGeneration += 1;
    imageAnimation?.cancel();
    imageAnimation = null;
  };
  const coverScale = () => Math.max(viewport.clientWidth / fitWidth, viewport.clientHeight / fitHeight);
  const scaleForLevel = (nextLevel = level) => nextLevel === 0 ? 1 : coverScale() * (nextLevel === 2 ? 2 : 1);
  const measureFit = () => {
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
    scale = scaleForLevel();
  };
  const panLimits = () => ({
    x: Math.max(0, (fitWidth * scale - viewport.clientWidth) / 2),
    y: Math.max(0, (fitHeight * scale - viewport.clientHeight) / 2),
  });
  const updateControls = () => {
    zoomStatus.value = `${Math.round(scale * 100)}%`;
    zoomStatus.textContent = zoomStatus.value;
    zoomOutButton.disabled = level === 0;
    zoomInButton.disabled = level === 2;
    if (resetButton) {
      resetButton.hidden = false;
      resetButton.disabled = level === 0;
    }
    expandedImage.style.cursor = level > 0 ? (drag ? "grabbing" : "grab") : "default";
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
  const setLevel = (nextLevel, anchor) => {
    if (!dialog.open || dialog.dataset.advertisingViewerState === "closing") return;
    const from = getComputedStyle(expandedImage).transform;
    const targetLevel = clamp(nextLevel, 0, 2);
    if (targetLevel === level) return;
    const matrix = new DOMMatrixReadOnly(from === "none" ? undefined : from);
    const nextScale = scaleForLevel(targetLevel);
    level = targetLevel;
    if (level > 0 && Number.isFinite(anchor?.clientX) && Number.isFinite(anchor?.clientY)) {
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
    if (level === 0) panX = panY = 0;
    const to = renderTransform();
    runMotion(from, to, 200, "ease-in-out", "zooming");
  };
  const unlock = () => {
    scroll?.unlockLogicalScroll?.(lockedScroll);
  };
  const finishClose = (restoreFocus) => {
    cancelMotion();
    dialog.close();
    delete dialog.dataset.advertisingViewerState;
    drag = null;
    level = 0;
    scale = 1;
    panX = panY = 0;
    renderTransform();
    unlock();
    if (restoreFocus && expandButton.isConnected) expandButton.focus({ preventScroll: true });
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
    expandedImage.src = record.media.src;
    expandedImage.alt = document.documentElement.lang === "en" ? record.media.altEn : record.media.altVi;
    expandedImage.width = record.media.width;
    expandedImage.height = record.media.height;
    expandedImage.fetchPriority = "high";
    level = 0;
    panX = panY = 0;
    dialog.showModal();
    measureFit();
    const target = renderTransform();
    runMotion(sourceTransform() || target, target, 300, "cubic-bezier(0.55, 0, 0, 1)", "opening");
    closeButton.focus({ preventScroll: true });
  };
  const visibleControls = () => [closeButton, resetButton, zoomInButton, zoomOutButton]
    .filter((control) => control && !control.disabled && !control.hidden && control.getClientRects().length > 0);

  expandButton.addEventListener("click", open, { signal: controller.signal });
  closeButton.addEventListener("click", () => close(), { signal: controller.signal });
  zoomInButton.addEventListener("click", () => setLevel(level + 1), { signal: controller.signal });
  zoomOutButton.addEventListener("click", () => setLevel(level - 1), { signal: controller.signal });
  resetButton?.addEventListener("click", () => setLevel(0), { signal: controller.signal });
  viewport.addEventListener("wheel", (event) => {
    if (!dialog.open || dialog.dataset.advertisingViewerState === "closing" || event.deltaY === 0) return;
    event.preventDefault();
    setLevel(level + (event.deltaY < 0 ? 1 : -1), event);
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
      setLevel(0);
      return;
    }
    if (event.target === dialog || event.target === viewport) {
      close();
      return;
    }
    if (level === 0 || event.target !== expandedImage || dialog.dataset.advertisingViewerState === "closing") return;
    cancelMotion();
    dialog.dataset.advertisingViewerState = "open";
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, panX, panY };
    viewport.setPointerCapture?.(event.pointerId);
    renderTransform();
    event.preventDefault();
  }, { signal: controller.signal });
  dialog.addEventListener("pointermove", (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    panX = drag.panX + event.clientX - drag.x;
    panY = drag.panY + event.clientY - drag.y;
    renderTransform();
    event.preventDefault();
  }, { signal: controller.signal });
  const endDrag = (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    drag = null;
    if (viewport.hasPointerCapture?.(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    updateControls();
  };
  dialog.addEventListener("pointerup", endDrag, { signal: controller.signal });
  dialog.addEventListener("pointercancel", endDrag, { signal: controller.signal });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      const controls = visibleControls();
      const index = controls.indexOf(document.activeElement);
      const next = index < 0 ? 0 : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      controls[next]?.focus({ preventScroll: true });
      event.preventDefault();
      return;
    }
    if (level === 0 || dialog.dataset.advertisingViewerState === "closing"
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
