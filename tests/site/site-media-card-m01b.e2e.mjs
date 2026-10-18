import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const base = process.env.BASE_URL || "http://localhost:8792";
const fixtureId = "signage-raised-letters-06";
const videoId = `${fixtureId}-synthetic-video`;
const fixturePrefix = "/__site_media_card_fixture__/";
const clip = path.join(root, "tests/site/fixtures/site-media-card-clip-audio-3x2.mp4");
const poster = path.join(root, "tests/site/fixtures/site-media-card-poster-3x2.webp");
const wideClip = path.join(root, "tests/site/fixtures/site-media-card-clip-audio.mp4");
const widePoster = path.join(root, "tests/site/fixtures/site-media-card-poster.webp");
const wideFixtureId = "signage-raised-letters-08";
const outputDir = process.env.SITE_MEDIA_OUTPUT_DIR;
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");

function fixtureArtifact(videoCover = false) {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  const card = artifact.cards.find((item) => item.id === fixtureId);
  assert(card, "fixture source card exists");
  card.mediaItems.push({
    id: videoId,
    kind: "video",
    src: `${fixturePrefix}clip-audio-3x2.mp4`,
    sourceId: "m00b:test-only:clip-audio-3x2",
    source: "M00b sealed synthetic fixture",
    sha256: "363907eb9b7c8da2af83cd672087ce0e2d1942e4f7a30350b06ec2583aba4ef4",
    provenance: "Synthetic test-only fixture, not public project media.",
    width: 480,
    height: 320,
    posterSrc: `${fixturePrefix}poster-3x2.webp`,
    posterWidth: 480,
    posterHeight: 320,
    durationSeconds: 3,
    hasAudio: true,
    altVi: "Video kiểm thử tổng hợp",
    altEn: "Synthetic test video",
  });
  if (videoCover) card.coverMediaId = videoId;
  return artifact;
}

function wideFixtureArtifact() {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  const card = artifact.cards.find((item) => item.id === wideFixtureId);
  assert(card && card.media.width === 1254 && card.media.height === 1254);
  const image = {
    ...card.mediaItems[0], id: `${wideFixtureId}-wide-image`, kind: "image",
    src: `${fixturePrefix}poster.webp`, width: 640, height: 360,
    sourceId: "m01d:test-only:poster", source: "M00b sealed synthetic fixture",
    sha256: "5e55b48ce48a2de66737178f32d9c19b1c175dabb4d312a7d05ef7d0e9b853ba",
    provenance: "Synthetic test-only fixture, not public media.",
  };
  const video = {
    ...image, id: `${wideFixtureId}-wide-video`, kind: "video",
    src: `${fixturePrefix}clip-audio.mp4`, sourceId: "m01d:test-only:clip",
    sha256: "853e4939e6a4627cc7777665283b2affab189132243974a4777f5a955338e827",
    posterSrc: image.src, posterWidth: 640, posterHeight: 360,
    durationSeconds: 3, hasAudio: true,
  };
  card.mediaItems = [video, image];
  card.coverMediaId = video.id;
  return artifact;
}

async function wideFrame(card) {
  return card.evaluate((node) => {
    const rect = node.querySelector(".advertising-card-media").getBoundingClientRect();
    const legacy = node.querySelector(".advertising-card-media > img:not([data-advertising-media-item])");
    return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height,
      legacyHidden: legacy.hidden, legacyDisplay: getComputedStyle(legacy).display,
      activeId: node.dataset.advertisingActiveMediaId };
  });
}

async function stableWideFrame(card) {
  let previous = null;
  let stable = 0;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const current = await wideFrame(card);
    stable = previous && ["x", "y", "width", "height"].every((key) => Math.abs(current[key] - previous[key]) <= 0.5)
      ? stable + 1 : 0;
    if (stable >= 5) return current;
    previous = current;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("M01d frame did not settle before measurement");
}

function assertWideFrame(frame, label) {
  assert(frame.legacyHidden && frame.legacyDisplay === "none", `${label} keeps square legacy metadata invisible: ${JSON.stringify(frame)}`);
  assert(Math.abs(frame.height - frame.width * 9 / 16) <= 1,
    `${label} media frame must use 16:9 authored cover: ${JSON.stringify(frame)}`);
}

function assertStableWideFrame(before, after, label) {
  for (const key of ["x", "y", "width", "height"]) {
    assert(Math.abs(before[key] - after[key]) <= 1,
      `${label} ${key} moved over 1 CSS px: ${JSON.stringify({ before, after })}`);
  }
  assertWideFrame(after, label);
}

function manyImageArtifact() {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  const card = artifact.cards.find((item) => item.id === fixtureId);
  assert(card, "many-media fixture source card exists");
  const cover = card.mediaItems[0];
  card.mediaItems = Array.from({ length: 11 }, (_, index) => index === 0 ? cover : {
    ...cover,
    id: `${fixtureId}-image-${index + 1}`,
    src: `${cover.src}?m01b-r5=${index + 1}`,
    sourceId: `${cover.sourceId}:test-only:${index + 1}`,
  });
  card.coverMediaId = cover.id;
  return artifact;
}

async function setup(page, locale, videoCover = false) {
  await page.route(`**${fixturePrefix}*`, async (route) => {
    const file = route.request().url().endsWith(".mp4") ? clip : poster;
    if (file === clip) await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({ path: file, contentType: file === clip ? "video/mp4" : "image/webp" });
  });
  await page.addInitScript((artifact) => { window.__TT_ADVERTISING_ARTIFACT__ = artifact; }, fixtureArtifact(videoCover));
  await page.goto(`${base}/${locale}/advertising-products/?category=signage-raised-letters`, { waitUntil: "domcontentloaded" });
  // Direct-load veil chặn pointer input cho đến khi trang mount xong.
  await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
  await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.()));
  await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id), fixtureId);
  const card = page.locator(`[data-advertising-card="${fixtureId}"]`);
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(450);
  await card.locator("img").first().waitFor({ state: "visible" });
  return card;
}

async function setupSingleton(page, item) {
  const artifact = fixtureArtifact();
  const record = artifact.cards.find((card) => card.id === fixtureId);
  record.mediaItems = [item];
  record.coverMediaId = item.id;
  await page.route(`**${fixturePrefix}*`, (route) => {
    const file = route.request().url().endsWith(".mp4") ? clip : poster;
    return route.fulfill({ path: file, contentType: file === clip ? "video/mp4" : "image/webp" });
  });
  await page.addInitScript((value) => { window.__TT_ADVERTISING_ARTIFACT__ = value; }, artifact);
  await page.goto(`${base}/en/advertising-products/?category=signage-raised-letters`, { waitUntil: "domcontentloaded" });
  // Direct-load veil chặn pointer input cho đến khi trang mount xong.
  await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
  await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.()));
  await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id), fixtureId);
  const card = page.locator(`[data-advertising-card="${fixtureId}"]`);
  await card.scrollIntoViewIfNeeded();
  return card;
}

async function setupMany(page, locale) {
  await page.addInitScript((artifact) => { window.__TT_ADVERTISING_ARTIFACT__ = artifact; }, manyImageArtifact());
  await page.goto(`${base}/${locale}/advertising-products/?category=signage-raised-letters`, { waitUntil: "domcontentloaded" });
  // Direct-load veil chặn pointer input cho đến khi trang mount xong.
  await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
  await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.()));
  await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id), fixtureId);
  const card = page.locator(`[data-advertising-card="${fixtureId}"]`);
  await card.locator("img").first().waitFor({ state: "visible" });
  await card.evaluate(async (node) => {
    const cta = document.querySelector("[data-advertising-grid-cta]");
    const controls = [...node.querySelectorAll("[data-advertising-media-count]")];
    if (!cta || controls.length !== 1) throw new Error("many-media CTA or numeric counter is missing");
    let previous = null;
    let stable = 0;
    for (let frame = 0; frame < 100; frame++) {
      node.scrollIntoView({ block: "center", behavior: "instant" });
      await new Promise(requestAnimationFrame);
      const rect = node.getBoundingClientRect();
      const boxes = [rect, cta.getBoundingClientRect(), ...controls.map((button) => button.getBoundingClientRect())];
      const current = [scrollY, ...boxes.flatMap((box) => [box.top, box.left, box.width, box.height])];
      stable = previous && current.every((value, index) => Math.abs(value - previous[index]) <= 0.5)
        ? stable + 1 : 0;
      if (stable >= 4 && rect.top >= 90 && rect.bottom <= innerHeight - 10) return;
      previous = current;
    }
    throw new Error(`many-media card, CTA, or controls did not settle inside the visible viewport: ${JSON.stringify({ previous, viewportHeight: innerHeight })}`);
  });
  return card;
}

// Đổi media đẩy ngang 0.9s (media-card R3): chờ mọi animation hữu hạn trong card xong rồi mới đo trạng thái tĩnh.
function settlePush(card) {
  return card.evaluate((node) => Promise.all(node.getAnimations({ subtree: true })
    .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
    .map((animation) => animation.finished.catch(() => {}))));
}

async function visibleSwipePoints(card) {
  await card.scrollIntoViewIfNeeded();
  return card.evaluate((node) => {
    const link = node.querySelector(":scope > a");
    const rect = node.querySelector(".advertising-card-media").getBoundingClientRect();
    const y = rect.top + Math.min(rect.height / 2, 120);
    const x1 = rect.left + rect.width * 0.78;
    const x2 = rect.left + rect.width * 0.22;
    const hit1 = document.elementFromPoint(x1, y);
    const hit2 = document.elementFromPoint(x2, y);
    return { x1, x2, y, width: rect.width,
      visible: x1 >= 0 && x2 < innerWidth && y >= 0 && y < innerHeight,
      hitsLink: Boolean(hit1 && hit2 && link.contains(hit1) && link.contains(hit2)) };
  });
}

async function clickCardBody(card, label) {
  await card.scrollIntoViewIfNeeded();
  const link = card.locator(":scope > a");
  const hit = await link.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const candidates = [
      { x: rect.width * 0.5, y: rect.height * 0.5 },
      { x: rect.width * 0.7, y: rect.height * 0.5 },
      { x: rect.width * 0.3, y: rect.height * 0.5 },
      { x: rect.width * 0.5, y: rect.height * 0.7 },
      { x: rect.width * 0.5, y: Math.min(24, rect.height * 0.25) },
    ];
    for (const point of candidates) {
      const target = document.elementFromPoint(rect.left + point.x, rect.top + point.y);
      if (target && node.contains(target) && !target.closest("button")) {
        return { point, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          target: { tag: target.tagName, className: String(target.className) } };
      }
    }
    return { point: null, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      target: null };
  });
  assert(hit.point, `card body click needs a visible link target: ${JSON.stringify(hit)}`);
  if (outputDir) await writeFile(path.join(outputDir, `body-hit-${label}.json`), JSON.stringify(hit, null, 2));
  await link.click({ position: hit.point, timeout: 5_000 });
  return hit;
}

async function pointerSwipe(link, from, to, y, pointerId) {
  return link.evaluate((node, point) => {
    const options = { bubbles: true, cancelable: true, pointerId: point.pointerId,
      pointerType: "mouse", isPrimary: true, clientY: point.y };
    node.dispatchEvent(new PointerEvent("pointerdown", { ...options, clientX: point.from }));
    node.dispatchEvent(new PointerEvent("pointerup", { ...options, clientX: point.to }));
    return node.parentElement.dataset.advertisingActiveMediaId;
  }, { from, to, y, pointerId });
}

async function run(viewport, touch, locale) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const card = await setup(page, locale);
    await page.evaluate(() => window.TruongThinhAdvertising.getAdapter().ensurePhoto("signage-raised-letters-16"));
    assert.equal(await page.locator('[data-advertising-card="signage-raised-letters-16"] [data-advertising-media-indicator]').count(), 0,
      "image-only public card retains legacy UI");
    const legacyState = await page.locator('[data-advertising-card="signage-raised-letters-16"]').evaluate((node) => {
      const image = node.querySelector(".advertising-card-media > img");
      return { activeId: node.dataset.advertisingActiveMediaId || null,
        layers: node.querySelectorAll("[data-advertising-media-item]").length,
        imageHidden: image?.hidden, imageDisplay: image && getComputedStyle(image).display };
    });
    assert(legacyState.activeId === null && legacyState.layers === 0
      && !legacyState.imageHidden && legacyState.imageDisplay === "block",
    `image-only public card keeps the legacy renderer: ${JSON.stringify(legacyState)}`);
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(450);
    const before = await card.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { id: node.dataset.advertisingActiveMediaId || null,
        rect: { width: rect.width, height: rect.height },
        url: location.href,
        photo: (new URL(location.href).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) };
    });
    assert.equal(before.photo, null, "carousel starts in grid");
    assert.equal(await card.locator("[data-advertising-media-indicator]").count(), 1, "multi-media indicator exists");
    assert.equal(await card.locator('[data-advertising-media-select][aria-current="true"]').count(), 1,
      "one carousel dot is selected");
    if (touch) {
      const box = await card.locator(".advertising-card-media").evaluate(async (node) => {
        let previous = null;
        let stable = 0;
        for (let frame = 0; frame < 80; frame++) {
          await new Promise(requestAnimationFrame);
          const rect = node.getBoundingClientRect();
          const current = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
          stable = previous && Object.keys(current).every((key) => Math.abs(current[key] - previous[key]) <= 0.5) ? stable + 1 : 0;
          if (stable >= 4 && rect.bottom > 0 && rect.top < innerHeight) return current;
          previous = current;
        }
        throw new Error("swipe media rect did not settle inside the visible viewport");
      });
      assert(box && box.width > 100, "swipe media has geometry");
      const client = await context.newCDPSession(page);
      const y = box.y + Math.min(box.height / 2, 120);
      const x1 = box.x + box.width * 0.78;
      const x2 = box.x + box.width * 0.22;
      const hit = await page.evaluate(({ x, y, id }) => {
        const link = document.querySelector(`[data-advertising-card="${id}"] > a`);
        const target = document.elementFromPoint(x, y);
        return { insideLink: Boolean(target && link?.contains(target)), visible: x >= 0 && x < innerWidth && y >= 0 && y < innerHeight };
      }, { x: x1, y, id: fixtureId });
      assert(hit.visible && hit.insideLink, `swipe must start on visible card link: ${JSON.stringify({ box, hit })}`);
      await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x1, y, id: 1 }] });
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x2, y, id: 1 }] });
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(150);
      assert.equal(await card.getAttribute("data-advertising-active-media-id"), videoId,
        "swipe must select video");
    } else {
      await card.locator(`[data-advertising-media-select="${videoId}"]`).click();
    }
    await page.waitForFunction(({ cardId, mediaId }) => document.querySelector(`[data-advertising-card="${cardId}"]`)?.dataset.advertisingActiveMediaId === mediaId,
      { cardId: fixtureId, mediaId: videoId }, { timeout: 5_000 });
    const loadingGeometry = await card.evaluate((node) => {
      const frame = node.querySelector(".advertising-card-media").getBoundingClientRect();
      const spinner = node.querySelector("[data-advertising-media-loading]");
      const rect = spinner.getBoundingClientRect();
      return { visible: !spinner.hidden, withinFrame: rect.left >= frame.left && rect.right <= frame.right
        && rect.top >= frame.top && rect.bottom <= frame.bottom };
    });
    assert(loadingGeometry.visible && loadingGeometry.withinFrame, "loading circle stays inside the media frame");
    await card.locator("[data-advertising-media-loading]").waitFor({ state: "hidden" });
    const after = await card.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const video = node.querySelector("video");
      return { id: node.dataset.advertisingActiveMediaId,
        rect: { width: rect.width, height: rect.height },
        video: video ? { muted: video.muted, poster: video.poster, src: video.currentSrc || video.src } : null,
        duration: node.querySelector("[data-advertising-media-duration]")?.textContent?.trim() || null,
        url: location.href,
        photo: (new URL(location.href).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) };
    });
    assert.equal(after.photo, null, "media change does not open detail");
    assert.equal(after.url, before.url, "media change does not alter route");
    assert(Math.abs(after.rect.width - before.rect.width) <= 1 && Math.abs(after.rect.height - before.rect.height) <= 1,
      "media change preserves card geometry");
    assert(after.video?.muted && after.video.poster.endsWith("poster-3x2.webp") && after.video.src.endsWith("clip-audio-3x2.mp4"),
      "video keeps poster, source and grid mute");
    await settlePush(card);
    const dimensions = await card.evaluate(async (node) => {
      const cover = node.querySelector(`[data-advertising-media-item="${node.dataset.advertisingCard}"]`);
      const video = node.querySelector("video");
      const poster = new Image();
      await new Promise((resolve, reject) => {
        poster.onload = resolve;
        poster.onerror = reject;
        poster.src = video.poster;
      });
      const frame = node.querySelector(".advertising-card-media").getBoundingClientRect();
      const rect = video.getBoundingClientRect();
      return { cover: { width: cover.naturalWidth, height: cover.naturalHeight },
        video: { width: video.videoWidth, height: video.videoHeight },
        poster: { width: poster.naturalWidth, height: poster.naturalHeight },
        frame: { left: frame.left, top: frame.top, right: frame.right, bottom: frame.bottom },
        videoRect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } };
    });
    const withinFrame = dimensions.videoRect.left >= dimensions.frame.left - 1
      && dimensions.videoRect.top >= dimensions.frame.top - 1
      && dimensions.videoRect.right <= dimensions.frame.right + 1
      && dimensions.videoRect.bottom <= dimensions.frame.bottom + 1;
    if (outputDir) await writeFile(path.join(outputDir, `media-ratio-${locale}.json`),
      JSON.stringify({ dimensions, beforeRect: before.rect, afterRect: after.rect, withinFrame }, null, 2));
    assert(dimensions.cover.width > 0 && dimensions.video.width > 0 && dimensions.poster.width > 0
      // Variant responsive làm tròn mỗi cạnh về pixel nguyên, nên so ratio trong mức làm tròn đó.
      && Math.abs(dimensions.cover.width / dimensions.cover.height - dimensions.video.width / dimensions.video.height) < 0.01
      && Math.abs(dimensions.cover.width / dimensions.cover.height - dimensions.poster.width / dimensions.poster.height) < 0.01
      && withinFrame
      && Math.abs((dimensions.videoRect.right - dimensions.videoRect.left)
        / (dimensions.videoRect.bottom - dimensions.videoRect.top) - dimensions.video.width / dimensions.video.height) < 0.02,
    `actual image, video, poster ratios must match without crop: ${JSON.stringify(dimensions)}`);
    assert.equal(after.duration, "0:03", "duration badge reports clip duration");
    assert.equal(await card.locator(`[data-advertising-media-select="${videoId}"][aria-current="true"]`).count(), 1,
      "video indicator tracks active media");
    assert.deepEqual(errors, [], "no runtime page errors");
    if (touch) await page.waitForTimeout(450);
    await clickCardBody(card, `run-${locale}`);
    await page.waitForURL((next) => (next.pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) === fixtureId);
    return { before, after, dimensions };
  } finally { await context.close(); await browser.close(); }
}

test("M01b desktop synthetic card changes media without detail navigation", async () => {
  const result = await run({ width: 1440, height: 900 }, false, "en");
  assert.equal(result.after.id, videoId);
});

test("M01b mobile synthetic card swipe changes media without detail navigation", async () => {
  const result = await run({ width: 390, height: 844 }, true, "vi");
  assert.equal(result.after.id, videoId);
});

test("M01b swipe suppresses its click but permits a fresh pointer tap", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    const card = await setup(page, "en");
    const link = card.locator(":scope > a");
    const point = await visibleSwipePoints(card);
    assert(point.visible && point.hitsLink && point.width > 100, `gesture target must be visible: ${JSON.stringify(point)}`);
    await card.evaluate((node) => {
      window.__m01bBubbledClicks = 0;
      node.addEventListener("click", () => { window.__m01bBubbledClicks += 1; });
    });
    const initialUrl = page.url();
    assert.equal(await pointerSwipe(link, point.x1, point.x2, point.y, 31), videoId);
    const compatibility = await link.evaluate((node) => {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 });
      node.dispatchEvent(event);
      return { prevented: event.defaultPrevented, bubbled: window.__m01bBubbledClicks, url: location.href };
    });
    assert(compatibility.prevented && compatibility.bubbled === 0 && compatibility.url === initialUrl,
      `same-gesture compatibility click must be suppressed: ${JSON.stringify(compatibility)}`);
    assert.equal(await pointerSwipe(link, point.x2, point.x1, point.y, 32), fixtureId);
    const beforeHistory = await page.evaluate(() => history.length);
    const freshTap = await link.evaluate((node, { x, y }) => {
      const started = performance.now();
      const options = { bubbles: true, cancelable: true, pointerId: 33,
        pointerType: "mouse", isPrimary: true, clientX: x, clientY: y };
      node.dispatchEvent(new PointerEvent("pointerdown", options));
      node.dispatchEvent(new PointerEvent("pointerup", options));
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 });
      node.dispatchEvent(event);
      return { prevented: event.defaultPrevented, bubbled: window.__m01bBubbledClicks,
        elapsedMs: performance.now() - started,
        activeId: node.parentElement.dataset.advertisingActiveMediaId };
    }, { x: point.x1, y: point.y });
    assert(freshTap.elapsedMs < 400 && freshTap.bubbled === 1 && freshTap.activeId === fixtureId,
      `new pointer gesture within suppression window must activate detail: ${JSON.stringify(freshTap)}`);
    await page.waitForURL((next) => (next.pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) === fixtureId);
    assert.equal(await page.evaluate(() => history.length), beforeHistory + 1,
      "fresh pointer tap opens detail exactly once");
  } finally { await browser.close(); }
});

test("M01b keyboard click after swipe is not suppressed", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    const card = await setup(page, "en");
    const link = card.locator(":scope > a");
    const point = await visibleSwipePoints(card);
    assert(point.visible && point.hitsLink, `keyboard case must start on visible card: ${JSON.stringify(point)}`);
    await card.evaluate((node) => {
      window.__m01bBubbledClicks = 0;
      node.addEventListener("click", () => { window.__m01bBubbledClicks += 1; });
    });
    assert.equal(await pointerSwipe(link, point.x1, point.x2, point.y, 41), videoId);
    const keyboard = await link.evaluate((node) => {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 });
      node.dispatchEvent(event);
      return { prevented: event.defaultPrevented, bubbled: window.__m01bBubbledClicks,
        activeId: node.parentElement.dataset.advertisingActiveMediaId };
    });
    assert(keyboard.bubbled === 1 && keyboard.activeId === videoId,
      `keyboard activation must bypass swipe suppression: ${JSON.stringify(keyboard)}`);
    await page.waitForURL((next) => (next.pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) === fixtureId);
  } finally { await browser.close(); }
});

test("M01b a newer swipe keeps its click guard past an older timeout", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    const card = await setup(page, "en");
    const link = card.locator(":scope > a");
    const point = await visibleSwipePoints(card);
    assert(point.visible && point.hitsLink, `timed gesture must start on visible card: ${JSON.stringify(point)}`);
    await card.evaluate((node) => {
      window.__m01bBubbledClicks = 0;
      node.addEventListener("click", () => { window.__m01bBubbledClicks += 1; });
    });
    await page.clock.install();
    assert.equal(await pointerSwipe(link, point.x1, point.x2, point.y, 51), videoId);
    await page.clock.runFor(280);
    assert.equal(await pointerSwipe(link, point.x2, point.x1, point.y, 52), fixtureId);
    await page.clock.runFor(150);
    const compatibility = await link.evaluate((node) => {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 });
      node.dispatchEvent(event);
      return { prevented: event.defaultPrevented, bubbled: window.__m01bBubbledClicks,
        activeId: node.parentElement.dataset.advertisingActiveMediaId,
        photo: (new URL(location.href).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) };
    });
    assert(compatibility.prevented && compatibility.bubbled === 0
      && compatibility.activeId === fixtureId && compatibility.photo === null,
    `newer swipe keeps its own 400ms click guard: ${JSON.stringify(compatibility)}`);
  } finally { await browser.close(); }
});

test("M01b touch swipe click stays blocked and a new touch tap opens detail", async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    const card = await setup(page, "vi");
    const link = card.locator(":scope > a");
    const point = await visibleSwipePoints(card);
    assert(point.visible && point.hitsLink, `touch gesture must start on visible card: ${JSON.stringify(point)}`);
    await card.evaluate((node) => {
      window.__m01bBubbledClicks = 0;
      node.addEventListener("click", () => { window.__m01bBubbledClicks += 1; });
    });
    // CDP touch thật tạo pointer event mà runtime lắng nghe.
    const client = await context.newCDPSession(page);
    const touchPath = async (from, to, id) => {
      await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: from, y: point.y, id }] });
      if (to !== from) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: to, y: point.y, id }] });
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };
    const swipeTouch = async (from, to, id) => {
      await touchPath(from, to, id);
      return link.evaluate((node) => node.parentElement.dataset.advertisingActiveMediaId);
    };
    assert.equal(await swipeTouch(point.x1, point.x2, 61), videoId);
    const compatibility = await link.evaluate((node) => {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 });
      node.dispatchEvent(event);
      return { prevented: event.defaultPrevented, bubbled: window.__m01bBubbledClicks };
    });
    assert(compatibility.prevented && compatibility.bubbled === 0,
      `touch swipe compatibility click must be suppressed: ${JSON.stringify(compatibility)}`);
    assert.equal(await swipeTouch(point.x2, point.x1, 62), fixtureId);
    // Tap mới trong guard 400ms cũ vẫn phải mở detail của media đang active.
    await touchPath(point.x1, point.x1, 63);
    await page.waitForURL((next) => (next.pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) === fixtureId);
  } finally { await context.close(); await browser.close(); }
});

test("M01b synthetic video cover starts muted with poster", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let releaseVideo = () => {};
  const videoGate = new Promise((resolve) => { releaseVideo = resolve; });
  try {
    await page.route(`**${fixturePrefix}*`, async (route) => {
      const file = route.request().url().endsWith(".mp4") ? clip : poster;
      if (file === clip) await videoGate;
      await route.fulfill({ path: file, contentType: file === clip ? "video/mp4" : "image/webp" });
    });
    await page.addInitScript((artifact) => { window.__TT_ADVERTISING_ARTIFACT__ = artifact; }, fixtureArtifact(true));
    await page.goto(`${base}/en/advertising-products/?category=signage-raised-letters`, { waitUntil: "domcontentloaded" });
    // Direct-load veil chặn pointer input cho đến khi trang mount xong.
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.()));
    await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id), fixtureId);
    const card = page.locator(`[data-advertising-card="${fixtureId}"]`);
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    assert.equal(await card.getAttribute("data-advertising-active-media-id"), videoId);
    const video = card.locator("video");
    assert.equal(await video.evaluate((node) => node.muted), true);
    assert((await video.getAttribute("poster")).endsWith("poster-3x2.webp"));
    assert.equal(await card.locator("[data-advertising-media-duration]").textContent(), "0:03");
    const beforeVideoReady = await card.evaluate((node) => {
      const frame = node.querySelector(".advertising-card-media").getBoundingClientRect();
      const legacy = node.querySelector("img");
      const oldRect = legacy.getBoundingClientRect();
      const active = node.querySelector("video");
      const activeRect = active.getBoundingClientRect();
      return { mediaLoaded: node.dataset.advertisingMediaLoaded || null,
        legacyHidden: legacy.hidden, legacyDisplay: getComputedStyle(legacy).display,
        legacyRect: { width: oldRect.width, height: oldRect.height },
        videoReadyState: active.readyState,
        frame: { left: frame.left, top: frame.top, right: frame.right, bottom: frame.bottom },
        videoRect: { left: activeRect.left, top: activeRect.top, right: activeRect.right, bottom: activeRect.bottom } };
    });
    const withinFrame = beforeVideoReady.videoRect.left >= beforeVideoReady.frame.left - 1
      && beforeVideoReady.videoRect.top >= beforeVideoReady.frame.top - 1
      && beforeVideoReady.videoRect.right <= beforeVideoReady.frame.right + 1
      && beforeVideoReady.videoRect.bottom <= beforeVideoReady.frame.bottom + 1;
    assert(beforeVideoReady.legacyHidden && beforeVideoReady.legacyDisplay === "none"
      && beforeVideoReady.legacyRect.width === 0 && beforeVideoReady.legacyRect.height === 0
      && withinFrame && beforeVideoReady.videoReadyState < 2 && beforeVideoReady.mediaLoaded !== "true",
    `video cover must own its frame and loading state: ${JSON.stringify(beforeVideoReady)}`);
    releaseVideo();
    await page.waitForFunction((id) => {
      const node = document.querySelector(`[data-advertising-card="${id}"]`);
      return node?.querySelector("video")?.readyState >= 2 && node.dataset.advertisingMediaLoaded === "true";
    }, fixtureId);
  } finally { releaseVideo(); await browser.close(); }
});

test("M01b explicit singleton video cover renders without a carousel", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    const video = fixtureArtifact(true).cards.find((card) => card.id === fixtureId).mediaItems
      .find((media) => media.id === videoId);
    assert(video);
    const card = await setupSingleton(page, video);
    await page.waitForFunction((id) => {
      const node = document.querySelector(`[data-advertising-card="${id}"]`);
      return node?.querySelector("video")?.readyState >= 2;
    }, fixtureId, { timeout: 3_000 }).catch(() => {});
    const state = await card.evaluate((node) => {
      const legacy = node.querySelector(".advertising-card-media > img:not([data-advertising-media-item])");
      const active = node.querySelector("video");
      const frame = node.querySelector(".advertising-card-media").getBoundingClientRect();
      const rect = active?.getBoundingClientRect();
      return { activeId: node.dataset.advertisingActiveMediaId || null,
        legacyHidden: legacy?.hidden, legacyDisplay: legacy && getComputedStyle(legacy).display,
        legacyWidth: legacy?.getBoundingClientRect().width,
        videoReady: active?.readyState >= 2, videoMuted: active?.muted,
        videoWidth: active?.videoWidth, videoHeight: active?.videoHeight,
        poster: active?.poster, duration: node.querySelector("[data-advertising-media-duration]")?.textContent,
        noPlayback: !node.querySelector("[data-advertising-media-playback]"),
        mediaLoaded: node.dataset.advertisingMediaLoaded || null,
        indicatorCount: node.querySelectorAll("[data-advertising-media-indicator], [data-advertising-media-select]").length,
        withinFrame: Boolean(rect && rect.left >= frame.left - 1 && rect.top >= frame.top - 1
          && rect.right <= frame.right + 1 && rect.bottom <= frame.bottom + 1) };
    });
    if (outputDir) await writeFile(path.join(outputDir, "singleton-video-state.json"), JSON.stringify(state, null, 2));
    assert(state.activeId === videoId && state.legacyHidden && state.legacyDisplay === "none"
      && state.legacyWidth === 0 && state.videoReady && state.videoMuted
      && state.videoWidth === 480 && state.videoHeight === 320
      && state.poster.endsWith("poster-3x2.webp") && state.duration === "0:03"
      && state.noPlayback && state.mediaLoaded === "true" && state.indicatorCount === 0
      && state.withinFrame, `singleton video state: ${JSON.stringify(state)}`);
    await clickCardBody(card, "singleton-video");
    await page.waitForURL((next) => (next.pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) === fixtureId);
  } finally { await browser.close(); }
});

test("M01b explicit singleton nonlegacy image renders without a carousel", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const imageId = `${fixtureId}-synthetic-single-image`;
  try {
    const card = await setupSingleton(page, {
      id: imageId,
      kind: "image",
      src: `${fixturePrefix}poster-3x2.webp`,
      sourceId: "m00b:test-only:poster-3x2",
      source: "M00b sealed synthetic fixture",
      sha256: "83ba86a98fce0336acf27f4c45eb9e66dcef88fe75a80dead07bfb034721b511",
      provenance: "Synthetic test-only fixture, not public project media.",
      width: 480,
      height: 320,
      altVi: "Ảnh kiểm thử tổng hợp",
      altEn: "Synthetic test image",
    });
    await page.waitForFunction((id) => {
      const image = document.querySelector(`[data-advertising-media-item="${id}"]`);
      return image?.naturalWidth === 480;
    }, imageId, { timeout: 3_000 }).catch(() => {});
    const state = await card.evaluate((node) => {
      const legacy = node.querySelector(".advertising-card-media > img:not([data-advertising-media-item])");
      const active = node.querySelector("[data-advertising-media-item]");
      return { activeId: node.dataset.advertisingActiveMediaId || null,
        legacyHidden: legacy?.hidden, legacyDisplay: legacy && getComputedStyle(legacy).display,
        legacyWidth: legacy?.getBoundingClientRect().width,
        imageId: active?.dataset.advertisingMediaItem, imageWidth: active?.naturalWidth,
        imageHeight: active?.naturalHeight, imageHidden: active?.hidden,
        mediaLoaded: node.dataset.advertisingMediaLoaded || null,
        indicatorCount: node.querySelectorAll("[data-advertising-media-indicator], [data-advertising-media-select]").length };
    });
    if (outputDir) await writeFile(path.join(outputDir, "singleton-image-state.json"), JSON.stringify(state, null, 2));
    assert(state.activeId === imageId && state.legacyHidden && state.legacyDisplay === "none"
      && state.legacyWidth === 0 && state.imageId === imageId
      && state.imageWidth === 480 && state.imageHeight === 320 && !state.imageHidden
      && state.mediaLoaded === "true" && state.indicatorCount === 0,
    `singleton image state: ${JSON.stringify(state)}`);
    const points = await visibleSwipePoints(card);
    assert(points.visible && points.hitsLink, `singleton swipe must hit visible link: ${JSON.stringify(points)}`);
    const link = card.locator(":scope > a");
    assert.equal(await pointerSwipe(link, points.x1, points.x2, points.y, 711), imageId);
    const compatibilityClick = await link.evaluate((node, point) => {
      const click = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1,
        clientX: point.x2, clientY: point.y });
      node.dispatchEvent(click);
      return { prevented: click.defaultPrevented, activeId: node.parentElement.dataset.advertisingActiveMediaId };
    }, points);
    assert.equal(compatibilityClick.activeId, imageId);
    await page.waitForURL((next) => (next.pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) === fixtureId);
  } finally { await browser.close(); }
});

test("M01b failed video cover loads its unready image fallback", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.route(`**${fixturePrefix}*`, (route) => route.fulfill({ status: 404, body: "" }));
    await page.addInitScript((artifact) => { window.__TT_ADVERTISING_ARTIFACT__ = artifact; }, fixtureArtifact(true));
    const videoResponse = page.waitForResponse((response) => response.url().endsWith("clip-audio-3x2.mp4") && response.status() === 404);
    const posterResponse = page.waitForResponse((response) => response.url().endsWith("poster-3x2.webp") && response.status() === 404);
    await page.goto(`${base}/en/advertising-products/?category=signage-raised-letters`, { waitUntil: "domcontentloaded" });
    // Direct-load veil chặn pointer input cho đến khi trang mount xong.
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.()));
    await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id), fixtureId);
    const card = page.locator(`[data-advertising-card="${fixtureId}"]`);
    await card.scrollIntoViewIfNeeded();
    await Promise.all([videoResponse, posterResponse]);
    const fallbackWaitStarted = Date.now();
    await page.waitForFunction((id) => {
      const node = document.querySelector(`[data-advertising-card="${id}"]`);
      const image = node?.querySelector(`[data-advertising-media-item="${id}"]`);
      return node?.dataset.advertisingActiveMediaId === id
        && image?.complete && image.naturalWidth > 0
        && getComputedStyle(image).visibility !== "hidden"
        && Number(getComputedStyle(image).opacity) >= 0.99;
    }, fixtureId, { timeout: 6_000 }).catch(() => {});
    const fallbackWaitMs = Date.now() - fallbackWaitStarted;
    const state = await card.evaluate((node) => {
      const image = node.querySelector(`[data-advertising-media-item="${node.dataset.advertisingCard}"]`);
      return { activeId: node.dataset.advertisingActiveMediaId,
        imageReady: Boolean(image && image.complete && image.naturalWidth > 0 && !image.hidden
          && getComputedStyle(image).visibility !== "hidden"
          && image.classList.contains("is-advertising-media-ready") && Number(getComputedStyle(image).opacity) >= 0.99),
        imageNaturalWidth: image?.naturalWidth, imageHidden: image?.hidden,
        imageClass: image?.className, imageOpacity: image && getComputedStyle(image).opacity,
        imageTransitionDuration: image && getComputedStyle(image).transitionDuration,
        imageSelected: node.querySelector(`[data-advertising-media-select="${node.dataset.advertisingCard}"]`)?.getAttribute("aria-current"),
        spinnerHidden: node.querySelector("[data-advertising-media-loading]").hidden,
        mediaLoaded: node.dataset.advertisingMediaLoaded || null,
        videoHidden: node.querySelector("video").hidden,
        controls: node.querySelectorAll("[data-advertising-media-select]").length };
    });
    state.fallbackWaitMs = fallbackWaitMs;
    if (outputDir) await writeFile(path.join(outputDir, "failed-video-cover-state.json"), JSON.stringify(state, null, 2));
    assert(state.activeId === fixtureId && state.imageReady && state.imageSelected === "true"
      && state.spinnerHidden && state.mediaLoaded === "true" && state.videoHidden && state.controls === 2,
    `failed cover must load an image candidate: ${JSON.stringify(state)}`);
    if (outputDir) {
      const visualState = async () => card.evaluate((node) => ({
        scrollY, opacity: getComputedStyle(node.querySelector(`[data-advertising-media-item="${node.dataset.advertisingCard}"]`)).opacity,
      }));
      const beforeScreenshot = await visualState();
      await card.screenshot({ path: path.join(outputDir, "video-cover-double-404-card.png") });
      const afterScreenshot = await visualState();
      await writeFile(path.join(outputDir, "fallback-screenshot-state.json"),
        JSON.stringify({ beforeScreenshot, afterScreenshot }, null, 2));
    }
    await card.locator(`[data-advertising-media-select="${videoId}"]`).click();
    assert.equal(await card.getAttribute("data-advertising-active-media-id"), fixtureId,
      "failed video control retains valid fallback");
    await clickCardBody(card, "failed-video-cover");
    await page.waitForURL((next) => (next.pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) === fixtureId);
    assert.deepEqual(errors, [], "video-cover failure has no uncaught page errors");
  } finally { await browser.close(); }
});

test("M01b all failed cover assets stop without fallback recursion", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const artifact = fixtureArtifact(true);
    const imageSrc = artifact.cards.find((item) => item.id === fixtureId).media.src;
    await page.route(`**${fixturePrefix}*`, (route) => route.fulfill({ status: 404, body: "" }));
    // Làm hỏng source và mọi variant responsive (name-480.avif v.v.) mà browser có thể chọn.
    await page.route(`**${imageSrc.replace(/\.[^.]+$/, "")}*`, (route) => route.fulfill({ status: 404, body: "" }));
    await page.addInitScript((payload) => { window.__TT_ADVERTISING_ARTIFACT__ = payload; }, artifact);
    await page.goto(`${base}/en/advertising-products/?category=signage-raised-letters`, { waitUntil: "domcontentloaded" });
    // Direct-load veil chặn pointer input cho đến khi trang mount xong.
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.()));
    await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id), fixtureId);
    const card = page.locator(`[data-advertising-card="${fixtureId}"]`);
    await card.scrollIntoViewIfNeeded();
    await page.waitForFunction((id) => {
      const node = document.querySelector(`[data-advertising-card="${id}"]`);
      const image = node?.querySelector(`[data-advertising-media-item="${id}"]`);
      return image?.complete && image.naturalWidth === 0;
    }, fixtureId, { timeout: 3_000 });
    await page.waitForTimeout(100);
    const state = await card.evaluate((node) => ({
      activeId: node.dataset.advertisingActiveMediaId,
      imageSelected: node.querySelector(`[data-advertising-media-select="${node.dataset.advertisingCard}"]`)?.getAttribute("aria-current"),
      spinnerHidden: node.querySelector("[data-advertising-media-loading]").hidden,
      mediaLoaded: node.dataset.advertisingMediaLoaded || null,
    }));
    assert(state.activeId === fixtureId && state.imageSelected === "true" && state.spinnerHidden
      && state.mediaLoaded !== "true",
    `all-failed terminal state must stop without recursion: ${JSON.stringify(state)}`);
    assert.deepEqual(errors, [], "all-failed terminal state has no uncaught page errors");
  } finally { await browser.close(); }
});

test("M01b failed next image restores the last valid card image", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const missingId = `${fixtureId}-missing-image`;
  try {
    const artifact = fixtureArtifact();
    const cardRecord = artifact.cards.find((item) => item.id === fixtureId);
    cardRecord.mediaItems.splice(1, 0, {
      id: missingId, kind: "image", src: `${fixturePrefix}missing-image.webp`,
      sourceId: "m01b:test-only:missing-image", source: "Intentional test-only 404",
      sha256: "0".repeat(64), provenance: "Intentional test-only missing image response.",
      width: 480, height: 320, altVi: "Ảnh kiểm thử không tải được", altEn: "Failed test image",
    });
    await page.addInitScript((payload) => { window.__TT_ADVERTISING_ARTIFACT__ = payload; }, artifact);
    await page.route(`**${fixturePrefix}*`, async (route) => {
      const file = route.request().url().endsWith(".mp4") ? clip : poster;
      await route.fulfill({ path: file, contentType: file === clip ? "video/mp4" : "image/webp" });
    });
    await page.route(`**${fixturePrefix}missing-image.webp`, (route) => route.fulfill({ status: 404, body: "" }));
    await page.goto(`${base}/en/advertising-products/?category=signage-raised-letters`, { waitUntil: "domcontentloaded" });
    // Direct-load veil chặn pointer input cho đến khi trang mount xong.
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.()));
    await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id), fixtureId);
    const card = page.locator(`[data-advertising-card="${fixtureId}"]`);
    await card.scrollIntoViewIfNeeded();
    await page.waitForFunction((id) => document.querySelector(`[data-advertising-card="${id}"] img`)?.naturalWidth > 0, fixtureId);
    const failedResponse = page.waitForResponse((response) => response.url().endsWith("missing-image.webp") && response.status() === 404);
    await card.locator(`[data-advertising-media-select="${missingId}"]`).click();
    await failedResponse;
    await page.waitForFunction((id) => document.querySelector(`[data-advertising-card="${id}"] [data-advertising-media-item="${id}-missing-image"]`)?.complete, fixtureId);
    if (outputDir) await card.screenshot({ path: path.join(outputDir, "image-404-card.png") });
    const state = await card.evaluate((node) => {
      const cover = node.querySelector(`[data-advertising-media-item="${node.dataset.advertisingCard}"]`);
      const spinner = node.querySelector("[data-advertising-media-loading]");
      return { activeId: node.dataset.advertisingActiveMediaId,
        coverVisible: !cover.hidden && getComputedStyle(cover).display !== "none" && cover.naturalWidth > 0,
        coverSelected: node.querySelector(`[data-advertising-media-select="${node.dataset.advertisingCard}"]`)?.getAttribute("aria-current"),
        spinnerHidden: spinner.hidden, controls: node.querySelectorAll("[data-advertising-media-select]").length };
    });
    assert(state.coverVisible && state.activeId === fixtureId && state.coverSelected === "true"
      && state.spinnerHidden && state.controls === 3,
    `failed image must restore valid cover and controls: ${JSON.stringify(state)}`);
    await card.locator(`[data-advertising-media-select="${videoId}"]`).click();
    assert.equal(await card.getAttribute("data-advertising-active-media-id"), videoId, "other media control remains usable");
    await clickCardBody(card, "failed-image");
    await page.waitForURL((next) => (next.pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) === fixtureId);
  } finally { await browser.close(); }
});

test("M01b failed video keeps its loaded poster and usable carousel", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const card = await setup(page, "en");
    const videoResponse = page.waitForResponse((response) => response.url().endsWith("clip-audio-3x2.mp4") && response.status() === 404);
    const posterResponse = page.waitForResponse((response) => response.url().endsWith("poster-3x2.webp") && response.status() === 200);
    await page.route(`**${fixturePrefix}clip-audio-3x2.mp4`, (route) => route.fulfill({ status: 404, body: "" }));
    await card.locator(`[data-advertising-media-select="${videoId}"]`).click();
    await Promise.all([videoResponse, posterResponse]);
    await page.waitForFunction((id) => Boolean(document.querySelector(`[data-advertising-card="${id}"] video`)?.error), fixtureId);
    await card.scrollIntoViewIfNeeded();
    await settlePush(card);
    if (outputDir) await card.screenshot({ path: path.join(outputDir, "video-404-poster.png") });
    const state = await card.evaluate((node) => {
      const frame = node.querySelector(".advertising-card-media").getBoundingClientRect();
      const video = node.querySelector("video");
      const rect = video.getBoundingClientRect();
      return { activeId: node.dataset.advertisingActiveMediaId, videoError: video.error?.code,
        muted: video.muted, poster: video.poster, spinnerHidden: node.querySelector("[data-advertising-media-loading]").hidden,
        videoSelected: node.querySelector(`[data-advertising-media-select="${node.dataset.advertisingCard}-synthetic-video"]`)?.getAttribute("aria-current"),
        frame: { x: frame.x, y: frame.y, width: frame.width, height: frame.height },
        videoRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        videoStyle: { width: getComputedStyle(video).width, maxWidth: getComputedStyle(video).maxWidth,
          transform: getComputedStyle(video).transform, objectFit: getComputedStyle(video).objectFit } };
    });
    const withinFrame = state.videoRect.x >= state.frame.x - 1 && state.videoRect.y >= state.frame.y - 1
      && state.videoRect.x + state.videoRect.width <= state.frame.x + state.frame.width + 1
      && state.videoRect.y + state.videoRect.height <= state.frame.y + state.frame.height + 1;
    assert(state.activeId === videoId && state.videoError && state.muted && state.poster.endsWith("poster-3x2.webp")
      && state.spinnerHidden && state.videoSelected === "true" && withinFrame,
    `failed video must keep a settled poster within frame: ${JSON.stringify(state)}`);
    await card.locator(`[data-advertising-media-select="${fixtureId}"]`).click();
    assert.equal(await card.getAttribute("data-advertising-active-media-id"), fixtureId, "cover control remains usable");
    await card.locator(`[data-advertising-media-select="${videoId}"]`).click();
    assert.equal(await card.locator("[data-advertising-media-loading]").isHidden(), true,
      "failed video re-selection must not spin indefinitely");
    assert.deepEqual(errors, [], "failed video does not cause uncaught page errors");
  } finally { await browser.close(); }
});

test("M01b failed video and poster restore the ready image cover", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const card = await setup(page, "en");
    const videoResponse = page.waitForResponse((response) => response.url().endsWith("clip-audio-3x2.mp4") && response.status() === 404);
    const posterResponse = page.waitForResponse((response) => response.url().endsWith("poster-3x2.webp") && response.status() === 404);
    await page.route(`**${fixturePrefix}clip-audio-3x2.mp4`, (route) => route.fulfill({ status: 404, body: "" }));
    await page.route(`**${fixturePrefix}poster-3x2.webp`, (route) => route.fulfill({ status: 404, body: "" }));
    await card.locator(`[data-advertising-media-select="${videoId}"]`).click();
    await Promise.all([videoResponse, posterResponse]);
    await page.waitForFunction((id) => Boolean(document.querySelector(`[data-advertising-card="${id}"] video`)?.error), fixtureId);
    await page.waitForTimeout(200);
    if (outputDir) await card.screenshot({ path: path.join(outputDir, "video-and-poster-404-card.png") });
    const state = await card.evaluate((node) => {
      const cover = node.querySelector(`[data-advertising-media-item="${node.dataset.advertisingCard}"]`);
      return { activeId: node.dataset.advertisingActiveMediaId,
        coverVisible: !cover.hidden && getComputedStyle(cover).display !== "none" && cover.naturalWidth > 0,
        coverSelected: node.querySelector(`[data-advertising-media-select="${node.dataset.advertisingCard}"]`)?.getAttribute("aria-current"),
        spinnerHidden: node.querySelector("[data-advertising-media-loading]").hidden,
        videoHidden: node.querySelector("video").hidden,
        controls: node.querySelectorAll("[data-advertising-media-select]").length };
    });
    assert(state.activeId === fixtureId && state.coverVisible && state.coverSelected === "true"
      && state.spinnerHidden && state.videoHidden && state.controls === 2,
    `double 404 must restore visible ready image: ${JSON.stringify(state)}`);
    await card.locator(`[data-advertising-media-select="${videoId}"]`).click();
    assert.equal(await card.getAttribute("data-advertising-active-media-id"), fixtureId,
      "failed video control keeps usable fallback");
    await clickCardBody(card, "failed-video-poster");
    await page.waitForURL((next) => (next.pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) === fixtureId);
    assert.deepEqual(errors, [], "double 404 has no uncaught page errors");
  } finally { await browser.close(); }
});

test("M01b stale poster failure does not override a newer image selection", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let releasePoster = () => {};
  const posterGate = new Promise((resolve) => { releasePoster = resolve; });
  let markProbeStarted = () => {};
  const probeStarted = new Promise((resolve) => { markProbeStarted = resolve; });
  let posterRequests = 0;
  try {
    const card = await setup(page, "en");
    await page.route(`**${fixturePrefix}clip-audio-3x2.mp4`, (route) => route.fulfill({ status: 404, body: "" }));
    await page.route(`**${fixturePrefix}poster-3x2.webp`, async (route) => {
      posterRequests += 1;
      if (posterRequests === 2) { markProbeStarted(); await posterGate; }
      await route.fulfill({ status: 404, body: "" });
    });
    await card.locator(`[data-advertising-media-select="${videoId}"]`).click();
    await Promise.race([probeStarted, new Promise((_, reject) => setTimeout(() => reject(new Error("poster probe request absent")), 5_000))]);
    await card.locator(`[data-advertising-media-select="${fixtureId}"]`).click();
    const probeResponse = page.waitForResponse((response) => response.url().endsWith("poster-3x2.webp") && response.status() === 404);
    releasePoster();
    await probeResponse;
    await page.waitForTimeout(100);
    await settlePush(card);
    const state = await card.evaluate((node) => ({
      activeId: node.dataset.advertisingActiveMediaId,
      coverSelected: node.querySelector(`[data-advertising-media-select="${node.dataset.advertisingCard}"]`)?.getAttribute("aria-current"),
      coverVisible: !node.querySelector(`[data-advertising-media-item="${node.dataset.advertisingCard}"]`)?.hidden,
      videoHidden: node.querySelector("video")?.hidden,
      spinnerHidden: node.querySelector("[data-advertising-media-loading]")?.hidden,
    }));
    assert(state.activeId === fixtureId && state.coverSelected === "true" && state.coverVisible
      && state.videoHidden && state.spinnerHidden,
    `stale poster failure must preserve newer cover: ${JSON.stringify({ state, posterRequests })}`);
  } finally { releasePoster(); await browser.close(); }
});

test("M01b stale image error preserves newer selection and failed reselect falls back", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const missingId = `${fixtureId}-missing-image`;
  let releaseError = () => {};
  const errorGate = new Promise((resolve) => { releaseError = resolve; });
  try {
    const artifact = fixtureArtifact();
    artifact.cards.find((item) => item.id === fixtureId).mediaItems.splice(1, 0, {
      id: missingId, kind: "image", src: `${fixturePrefix}missing-image.webp`,
      sourceId: "m01b:test-only:missing-image", source: "Intentional test-only 404",
      sha256: "0".repeat(64), provenance: "Intentional test-only missing image response.",
      width: 480, height: 320, altVi: "Ảnh kiểm thử không tải được", altEn: "Failed test image",
    });
    await page.addInitScript((payload) => { window.__TT_ADVERTISING_ARTIFACT__ = payload; }, artifact);
    await page.route(`**${fixturePrefix}*`, async (route) => {
      const file = route.request().url().endsWith(".mp4") ? clip : poster;
      await route.fulfill({ path: file, contentType: file === clip ? "video/mp4" : "image/webp" });
    });
    await page.route(`**${fixturePrefix}missing-image.webp`, async (route) => {
      await errorGate;
      await route.fulfill({ status: 404, body: "" });
    });
    await page.goto(`${base}/en/advertising-products/?category=signage-raised-letters`, { waitUntil: "domcontentloaded" });
    // Direct-load veil chặn pointer input cho đến khi trang mount xong.
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.()));
    await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id), fixtureId);
    const card = page.locator(`[data-advertising-card="${fixtureId}"]`);
    await card.scrollIntoViewIfNeeded();
    await page.waitForFunction((id) => document.querySelector(`[data-advertising-card="${id}"] img`)?.naturalWidth > 0, fixtureId);
    const request = page.waitForRequest((item) => item.url().endsWith("missing-image.webp"));
    await card.locator(`[data-advertising-media-select="${missingId}"]`).click();
    await request;
    await card.locator(`[data-advertising-media-select="${videoId}"]`).click();
    assert.equal(await card.getAttribute("data-advertising-active-media-id"), videoId);
    const response = page.waitForResponse((item) => item.url().endsWith("missing-image.webp") && item.status() === 404);
    releaseError();
    await response;
    await page.waitForFunction(({ cardId, mediaId }) => {
      const node = document.querySelector(`[data-advertising-card="${cardId}"]`);
      return node?.querySelector(`[data-advertising-media-item="${mediaId}"]`)?.complete;
    }, { cardId: fixtureId, mediaId: missingId });
    const afterError = await card.evaluate((node) => ({
      activeId: node.dataset.advertisingActiveMediaId,
      videoSelected: node.querySelector(`[data-advertising-media-select="${node.dataset.advertisingCard}-synthetic-video"]`)?.getAttribute("aria-current"),
      videoVisible: !node.querySelector("video")?.hidden,
    }));
    assert(afterError.activeId === videoId && afterError.videoSelected === "true" && afterError.videoVisible,
      `stale error must not displace newer video: ${JSON.stringify(afterError)}`);
    await card.locator(`[data-advertising-media-select="${missingId}"]`).click();
    const afterReselect = await card.evaluate((node) => ({
      activeId: node.dataset.advertisingActiveMediaId,
      coverSelected: node.querySelector(`[data-advertising-media-select="${node.dataset.advertisingCard}"]`)?.getAttribute("aria-current"),
      coverVisible: !node.querySelector(`[data-advertising-media-item="${node.dataset.advertisingCard}"]`)?.hidden,
      spinnerHidden: node.querySelector("[data-advertising-media-loading]")?.hidden,
    }));
    assert(afterReselect.activeId === fixtureId && afterReselect.coverSelected === "true"
      && afterReselect.coverVisible && afterReselect.spinnerHidden,
    `failed image reselect must return to ready cover: ${JSON.stringify(afterReselect)}`);
  } finally { releaseError(); await browser.close(); }
});

async function runNumericIndicator(locale, viewport, mobile) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, hasTouch: mobile, isMobile: mobile });
  const page = await context.newPage();
  try {
    const card = await setupMany(page, locale);
    const count = card.locator("[data-advertising-media-count]");
    const initial = await card.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const strip = node.querySelector("[data-advertising-media-indicator]").getBoundingClientRect();
      const counter = node.querySelector("[data-advertising-media-count]").getBoundingClientRect();
      return { width: rect.width, height: rect.height,
        layers: node.querySelectorAll("[data-advertising-media-item]").length,
        activeId: node.dataset.advertisingActiveMediaId,
        dots: node.querySelectorAll("[data-advertising-media-select]").length,
        stripButtons: node.querySelectorAll("[data-advertising-media-indicator] button").length,
        centerOffset: Math.abs((strip.left + strip.right) / 2 - (counter.left + counter.right) / 2) };
    });
    assert.equal(initial.layers, 1, "eleven items are not instantiated eagerly");
    assert.equal(initial.dots, 0, "six or more items use no dot controls");
    // Owner 2026-10-18: từ 6 media dải chỉ còn bộ đếm ở chỗ hàng chấm, đổi media bằng mũi tên hover hoặc vuốt.
    assert.equal(initial.stripButtons, 0, "the strip carries only the counter");
    assert(initial.centerOffset <= 1, `counter sits centred where the dots would be: ${JSON.stringify(initial)}`);
    assert.equal(initial.activeId, fixtureId);
    assert.equal(await count.textContent(), "1/11");
    assert.equal(await count.getAttribute("role"), "status");
    assert.equal(await count.getAttribute("aria-live"), "polite");
    assert.equal(await count.getAttribute("aria-label"), locale === "en" ? "Media 1 of 11" : "Media 1 trên 11");
    let pointerId = 40;
    const link = card.locator(":scope > a");
    const step = async (direction) => {
      if (mobile) {
        const points = await visibleSwipePoints(card);
        await (direction > 0 ? pointerSwipe(link, points.x1, points.x2, points.y, pointerId++)
          : pointerSwipe(link, points.x2, points.x1, points.y, pointerId++));
        await page.waitForTimeout(450);
      } else {
        await card.locator(".advertising-card-media").hover();
        await card.locator(`[data-advertising-media-hover-step="${direction}"]`).click();
      }
    };
    for (let index = 2; index <= 6; index++) await step(1);
    assert.equal(await count.textContent(), "6/11");
    if (!mobile) {
      await card.locator('[data-advertising-media-hover-step="1"]').focus();
      await page.keyboard.press("Enter");
    } else await step(1);
    assert.equal(await count.textContent(), "7/11");
    assert.equal(await card.getAttribute("data-advertising-active-media-id"), `${fixtureId}-image-7`);
    await step(-1);
    assert.equal(await count.textContent(), "6/11");
    for (let index = 7; index <= 11; index++) await step(1);
    assert.equal(await count.textContent(), "11/11");
    if (!mobile) assert(await card.locator('[data-advertising-media-hover-step="1"]').isHidden(), "next arrow hides at the last media");
    assert.equal((new URL(page.url()).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null), null, "media controls never open detail");
    const final = await card.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { width: rect.width, height: rect.height,
        activeId: node.dataset.advertisingActiveMediaId,
        layers: node.querySelectorAll("[data-advertising-media-item]").length };
    });
    assert(Math.abs(final.width - initial.width) <= 1 && Math.abs(final.height - initial.height) <= 1,
      `media selection keeps card geometry: ${JSON.stringify({ initial, final })}`);
    if (outputDir) await writeFile(path.join(outputDir, `numeric-indicator-${locale}-${mobile ? "mobile" : "desktop"}.json`),
      JSON.stringify({ initial, final }, null, 2));
    await page.waitForTimeout(950);
    await clickCardBody(card, `numeric-${locale}-${mobile ? "mobile" : "desktop"}`);
    await page.waitForURL((url) => (url.pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) === fixtureId);
  } finally { await context.close(); await browser.close(); }
}

test("M01b eleven media use numeric navigation on EN desktop", async () => {
  await runNumericIndicator("en", { width: 1440, height: 900 }, false);
});

test("M01b eleven media use numeric navigation on VI mobile", async () => {
  await runNumericIndicator("vi", { width: 390, height: 844 }, true);
});

test("M01b five media still use dot controls", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    const artifact = manyImageArtifact();
    artifact.cards.find((card) => card.id === fixtureId).mediaItems.length = 5;
    await page.addInitScript((value) => { window.__TT_ADVERTISING_ARTIFACT__ = value; }, artifact);
    await page.goto(`${base}/en/advertising-products/?category=signage-raised-letters`, { waitUntil: "domcontentloaded" });
    // Direct-load veil chặn pointer input cho đến khi trang mount xong.
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.()));
    await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id), fixtureId);
    const card = page.locator(`[data-advertising-card="${fixtureId}"]`);
    await card.scrollIntoViewIfNeeded();
    assert.equal(await card.locator("[data-advertising-media-select]").count(), 5);
    assert.equal(await card.locator("[data-advertising-media-count]").count(), 0);
  } finally { await browser.close(); }
});

// Owner 2026-10-18: hover card nhiều media hiện mũi tên theo vị trí như pin Pinterest, card không zoom media;
// cảm ứng không có mũi tên.
test("M01b hover arrows step card media by position and the card media never zooms", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const touch of [false, true]) {
      const context = await browser.newContext(touch
        ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
        : { viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const artifact = manyImageArtifact();
      const items = artifact.cards.find((card) => card.id === fixtureId).mediaItems;
      items.length = 3;
      await page.addInitScript((value) => { window.__TT_ADVERTISING_ARTIFACT__ = value; }, artifact);
      await page.goto(`${base}/en/advertising-products/?category=signage-raised-letters`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
      await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.()));
      await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id), fixtureId);
      const card = page.locator(`[data-advertising-card="${fixtureId}"]`);
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(450);
      const arrows = () => card.evaluate((node) => [...node.querySelectorAll("[data-advertising-media-hover-step]")]
        .map((button) => getComputedStyle(button).display === "none" ? "-" : getComputedStyle(button).opacity).join(" "));
      if (touch) {
        assert.equal(await arrows(), "- -", "touch cards have no arrows");
        await context.close();
        continue;
      }
      assert.equal(await arrows(), "- 0", "arrows stay hidden until hover; first media has no previous arrow");
      await card.locator(".advertising-card-media").hover();
      await page.waitForTimeout(700);
      assert.equal(await arrows(), "- 1", "hover shows only the next arrow on the first media");
      assert.equal(await card.locator("[data-advertising-media-item]:not([hidden])").first()
        .evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).a), 1, "hover keeps card media still");
      await card.locator('[data-advertising-media-hover-step="1"]').click();
      await card.locator('[data-advertising-media-hover-step="1"]').click();
      assert.equal(await card.getAttribute("data-advertising-active-media-id"), items[2].id);
      assert.equal(await arrows(), "1 -", "last media shows only the previous arrow");
      assert.doesNotMatch(new URL(page.url()).pathname, /\/p\/[^/]+\/$/, "arrows never open detail");
      await context.close();
    }
  } finally { await browser.close(); }
});

async function runWideCover(locale, related = false, mode = "normal") {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: locale === "vi" ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
  let releaseVideo = () => {};
  const videoGate = new Promise((resolve) => { releaseVideo = resolve; });
  try {
    await page.route(`**${fixturePrefix}*`, async (route) => {
      const isVideo = route.request().url().endsWith(".mp4");
      if (isVideo && mode === "slow") await videoGate;
      if (isVideo && mode === "error") return route.fulfill({ status: 404, body: "missing clip" });
      await route.fulfill({ path: isVideo ? wideClip : widePoster, contentType: isVideo ? "video/mp4" : "image/webp" });
    });
    await page.addInitScript((artifact) => { window.__TT_ADVERTISING_ARTIFACT__ = artifact; }, wideFixtureArtifact());
    const search = related
      ? "?category=signage-raised-letters&photo=signage-raised-letters-02"
      : "?category=signage-raised-letters";
    await page.goto(`${base}/${locale}/advertising-products/${search}`, { waitUntil: "domcontentloaded" });
    // Direct-load veil chặn pointer input cho đến khi trang mount xong.
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.waitForLoadState("load");
    await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.()));
    const selector = related ? `[data-advertising-related-card="${wideFixtureId}"]` : `[data-advertising-card="${wideFixtureId}"]`;
    if (!related) await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id), wideFixtureId);
    else {
      await page.locator("[data-advertising-photo-related-grid]").scrollIntoViewIfNeeded();
      for (let i = 0; i < 32 && await page.locator(selector).count() === 0; i += 1) {
        await page.evaluate(() => scrollBy(0, innerHeight * 0.7));
        await page.waitForTimeout(80);
      }
    }
    const card = page.locator(selector);
    await card.waitFor({ state: "visible" });
    await card.scrollIntoViewIfNeeded();
    const imageId = `${wideFixtureId}-wide-image`;
    const videoId = `${wideFixtureId}-wide-video`;
    if (related) await card.locator(`[data-advertising-media-select="${imageId}"]`).scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts?.ready);
    const first = await stableWideFrame(card);
    assertWideFrame(first, `${locale} ${related ? "related" : "grid"} initial`);
    const imageButton = card.locator(`[data-advertising-media-select="${imageId}"]`);
    if (related && mode === "normal") {
      const hit = await imageButton.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        const owner = node.closest("[data-advertising-related-card]");
        const blocker = target?.closest("[data-advertising-related-card]");
        const box = (item) => {
          if (!item) return null;
          const value = item.getBoundingClientRect();
          return { x: value.x, y: value.y, width: value.width, height: value.height,
            transform: getComputedStyle(item).transform, zIndex: getComputedStyle(item).zIndex };
        };
        return { buttonRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          ownerRect: box(owner), blockerRect: box(blocker),
          hitRelatedId: blocker?.dataset.advertisingRelatedCard ?? null,
          hitTag: target?.tagName ?? null, hitClass: target?.className ?? null };
      });
      let clickError = null;
      try { await imageButton.click({ timeout: 1500 }); }
      catch (error) { clickError = error.message.split("\n").slice(0, 5).join(" "); }
      if (outputDir) await writeFile(path.join(outputDir, "m01d-related-pointer-diagnostic.json"),
        JSON.stringify({ hit, clickError }, null, 2));
      if (clickError) await imageButton.evaluate((node) => node.click());
    } else await imageButton.evaluate((node) => node.click());
    await page.waitForFunction(({ selector, id }) => document.querySelector(selector)?.dataset.advertisingActiveMediaId === id,
      { selector, id: imageId });
    const slide = await wideFrame(card);
    assertStableWideFrame(first, slide, `${locale} ${related ? "related" : "grid"} slide`);
    await card.locator(`[data-advertising-media-select="${videoId}"]`).evaluate((node) => node.click());
    const pending = await wideFrame(card);
    assertStableWideFrame(first, pending, `${locale} ${related ? "related" : "grid"} ${mode} pending`);
    releaseVideo();
    if (mode === "error") await page.waitForTimeout(250);
    else await card.locator("video").evaluate((node) => new Promise((resolve) => {
      if (node.readyState >= 2) resolve();
      else node.addEventListener("loadeddata", resolve, { once: true });
    }));
    const settled = await wideFrame(card);
    assertStableWideFrame(first, settled, `${locale} ${related ? "related" : "grid"} ${mode} settled`);
    if (outputDir) await writeFile(path.join(outputDir, `m01d-${locale}-${related ? "related" : "grid"}-${mode}.json`),
      JSON.stringify({ first, slide, pending, settled }, null, 2));
    return { first, slide, pending, settled };
  } finally { releaseVideo(); await browser.close(); }
}

for (const mode of ["normal", "slow", "error"]) {
  test(`M01d EN grid 16:9 frame stays stable across slide and ${mode} video`, async () => {
    await runWideCover("en", false, mode);
  });
  test(`M01d VI related 16:9 frame stays stable across slide and ${mode} video`, async () => {
    await runWideCover("vi", true, mode);
  });
}
