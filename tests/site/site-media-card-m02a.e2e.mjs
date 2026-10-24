import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const base = process.env.BASE_URL || "http://localhost:8792";
const cardId = "signage-raised-letters-06";
const videoId = `${cardId}-synthetic-video`;
const fixturePrefix = "/__site_media_card_fixture__/";
const clip = path.join(root, "tests/site/fixtures/site-media-card-clip-audio-3x2.mp4");
const poster = path.join(root, "tests/site/fixtures/site-media-card-poster-3x2.webp");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");

function fixtureArtifact(videoCover = false, { singleton = false, relatedMedia = false, hasAudio = true } = {}) {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  assert.equal(artifact.cards.length, 268, "fixture retains all legacy cards");
  const card = artifact.cards.find((item) => item.id === cardId);
  assert(card && card.mediaItems.length === 1 && card.media.width * 2 === card.media.height * 3);
  card.mediaItems.push({
    id: videoId, kind: "video", src: `${fixturePrefix}clip-audio-3x2.mp4`,
    sourceId: "m00b:test-only:clip-audio-3x2", source: "M00b sealed synthetic fixture",
    sha256: "363907eb9b7c8da2af83cd672087ce0e2d1942e4f7a30350b06ec2583aba4ef4",
    provenance: "Synthetic test-only fixture, not public project media.",
    width: 480, height: 320, posterSrc: `${fixturePrefix}poster-3x2.webp`,
    posterWidth: 480, posterHeight: 320, durationSeconds: 3, hasAudio,
    altVi: "Video kiểm thử tổng hợp", altEn: "Synthetic test video",
  });
  if (videoCover) card.coverMediaId = videoId;
  if (singleton) {
    card.mediaItems = [card.mediaItems[1]];
    card.coverMediaId = videoId;
  }
  const related = artifact.cards.filter((item) => item.category === card.category && item.id !== card.id);
  if (relatedMedia) {
    related.forEach((item) => item.mediaItems.push({
      ...item.mediaItems[0], id: `${item.id}-alternate`,
      altVi: "Ảnh kiểm thử related đang chọn", altEn: "Selected related test image",
    }));
  }
  return { artifact, card, related };
}

async function openFixture(page, locale, { videoCover = false, direct = false, photoOnly = false,
  singleton = false, relatedMedia = false, hasAudio = true } = {}) {
  const { artifact, card, related } = fixtureArtifact(videoCover, { singleton, relatedMedia, hasAudio });
  await page.route(`**${fixturePrefix}*`, (route) => {
    const video = route.request().url().endsWith(".mp4");
    return route.fulfill({ path: video ? clip : poster, contentType: video ? "video/mp4" : "image/webp" });
  });
  await page.addInitScript((value) => { window.__TT_ADVERTISING_ARTIFACT__ = value; }, artifact);
  const query = direct ? photoOnly ? `?photo=${card.id}` : `?category=${card.category}&photo=${card.id}` : `?category=${card.category}`;
  await page.goto(`${base}/${locale}/advertising-products/${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.()), null, { timeout: 5_000 });
  if (direct) await page.locator("[data-advertising-photo-view]").waitFor({ state: "visible" });
  else await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id), card.id);
  return relatedMedia ? { card, related } : card;
}

async function selectGridMedia(page, id) {
  const card = page.locator(`[data-advertising-card="${cardId}"]`);
  await card.scrollIntoViewIfNeeded();
  await card.locator(`[data-advertising-media-select="${id}"]`).click({ timeout: 5_000 });
  await page.waitForFunction(({ cardId, id }) =>
    document.querySelector(`[data-advertising-card="${cardId}"]`)?.dataset.advertisingActiveMediaId === id,
  { cardId, id }, { timeout: 5_000 });
  return card;
}

async function openCardBody(page, card, expectedId = cardId) {
  await card.scrollIntoViewIfNeeded();
  const link = card.locator(":scope > a");
  const point = await link.evaluate((node) => {
    const box = node.getBoundingClientRect();
    for (const [x, y] of [[0.5, 0.5], [0.7, 0.5], [0.3, 0.5], [0.5, 0.25]]) {
      const target = document.elementFromPoint(box.x + box.width * x, box.y + box.height * y);
      if (target && node.contains(target) && !target.closest("button")) {
        return { x: box.width * x, y: box.height * y };
      }
    }
    return null;
  });
  assert(point, "grid card body has a visible pointer target");
  await link.click({ position: point, timeout: 5_000 });
  await page.waitForURL((url) => (url.pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null) === expectedId);
  await page.locator("[data-advertising-photo-view]").waitFor({ state: "visible" });
}

async function primaryState(page) {
  return page.locator("[data-advertising-photo-view]").evaluate((view) => {
    const hero = view.querySelector("[data-advertising-photo-hero]");
    const visible = [...hero.querySelectorAll("img, video")].filter((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return !node.hidden && !node.closest('[aria-hidden="true"]') && style.display !== "none"
        && style.visibility !== "hidden" && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
    }).map((node) => ({ kind: node.tagName.toLowerCase(),
      src: node.currentSrc || node.getAttribute("src") || "",
      poster: node.getAttribute("poster") || "", muted: node.tagName === "VIDEO" ? node.muted : null,
      alt: node.getAttribute("alt") || "", ariaLabel: node.getAttribute("aria-label") || "" }));
    const thumbs = [...view.querySelectorAll("[data-advertising-photo-media-select]")].map((node) => ({
      id: node.dataset.advertisingPhotoMediaSelect, selected: node.getAttribute("aria-current") === "true",
    }));
    const audio = view.querySelector("[data-advertising-photo-audio-toggle]");
    const expand = view.querySelector("[data-advertising-photo-expand]");
    return { photoId: view.dataset.advertisingPhotoId, visible, thumbs,
      audioLabel: audio?.getAttribute("aria-label") || "", audioHidden: audio?.hidden ?? true,
      expandHidden: expand?.hidden ?? true };
  });
}

// Variant AVIF/width responsive tính là source WebP gốc của chúng.
function mediaPath(value) {
  if (!value) return "";
  const pathname = new URL(value, base).pathname;
  return /^\/assets\/content\/.+\.avif$|-(?:480|960)\.(?:avif|webp)$/.test(pathname)
    ? pathname.replace(/(?:-(?:480|960))?\.(?:avif|webp)$/, ".webp")
    : pathname;
}

async function assertPrimary(page, card, expectedId, locale) {
  // Chờ layer của media đích hiện liên tục 700ms, hết animation trong hero, theo cùng rule visibility mà
  // primaryState đọc: layer cũ có thể cùng ảnh, và layer mới chỉ bắt đầu lộ sau mốc giải mã 100ms (loading-glass R4).
  const target = card.mediaItems.find((item) => item.id === expectedId);
  await page.evaluate(() => { window.__ttPrimaryStableSince = null; });
  await page.waitForFunction(({ kind, src }) => {
    const shown = !document.querySelector("[data-advertising-photo-hero]").getAnimations({ subtree: true }).length
      && [...document.querySelectorAll(`[data-advertising-photo-hero] ${kind === "video" ? "video" : "img"}`)].some((node) => {
        const style = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        const path = new URL(node.currentSrc || node.src, location.href).pathname.replace(/(?:-(?:480|960))?\.(?:avif|webp)$/, ".webp");
        return path === src && !node.hidden && !node.closest('[aria-hidden="true"]') && style.display !== "none"
          && style.visibility !== "hidden" && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
      });
    if (!shown) window.__ttPrimaryStableSince = null;
    else window.__ttPrimaryStableSince ??= performance.now();
    return shown && performance.now() - window.__ttPrimaryStableSince >= 700;
  }, { kind: target?.kind, src: target?.src }, { timeout: 8_000 });
  const state = await primaryState(page);
  const expected = card.mediaItems.find((item) => item.id === expectedId);
  assert(expected);
  assert.equal(state.photoId, card.id);
  assert.deepEqual(state.thumbs.map((thumb) => thumb.id), card.mediaItems.map((item) => item.id));
  assert.deepEqual(state.thumbs.filter((thumb) => thumb.selected).map((thumb) => thumb.id), [expectedId]);
  const active = state.visible.find((item) => item.kind === (expected.kind === "video" ? "video" : "img")
    && mediaPath(item.src) === expected.src);
  assert(active, `visible primary layer must be authored ${expectedId}: ${JSON.stringify(state)}`);
  assert.equal(state.visible.some((item) => mediaPath(item.src) === card.media.src && expected.src !== card.media.src), false,
    "hidden legacy image must not masquerade as active media");
  if (expected.kind === "video") {
    assert.equal(mediaPath(active.poster), expected.posterSrc);
    assert.equal(active.muted, true, "primary video starts muted");
    assert.equal(state.audioHidden, expected.hasAudio === false);
    if (expected.hasAudio !== false) {
      assert.match(state.audioLabel, locale === "en" ? /unmute|sound|audio/i : /bật.*tiếng|âm thanh/i);
    }
    assert.equal(state.expandHidden, true, "video has no image-only expand action");
  } else {
    assert.equal(active.alt, locale === "en" ? expected.altEn : expected.altVi);
    assert.equal(state.expandHidden, false, "image keeps expand action");
  }
  return state;
}

test("M02a photo-only direct URL starts cover image without media query", async () => {
  await withPage("en", async (page) => {
    const card = await openFixture(page, "en", { direct: true, photoOnly: true });
    await assertPrimary(page, card, card.coverMediaId, "en");
    assert.equal(new URL(page.url()).searchParams.get("media"), null);
  });
});

test("M02a related active image keeps its authored media ID in primary", async () => {
  await withPage("en", async (page) => {
    const { related } = await openFixture(page, "en", { direct: true, relatedMedia: true });
    const relatedCard = page.locator("[data-advertising-related-card]").first();
    await relatedCard.waitFor({ state: "visible" });
    const relatedId = await relatedCard.getAttribute("data-advertising-related-card");
    const relatedRecord = related.find((item) => item.id === relatedId);
    assert(relatedRecord, "visible related card belongs to the fixture");
    await relatedCard.scrollIntoViewIfNeeded();
    const alternateId = relatedRecord.mediaItems[1].id;
    await relatedCard.locator(`[data-advertising-media-select="${alternateId}"]`).click();
    await page.waitForFunction(({ id, mediaId }) =>
      document.querySelector(`[data-advertising-related-card="${id}"]`)?.dataset.advertisingActiveMediaId === mediaId,
    { id: relatedId, mediaId: alternateId });
    await openCardBody(page, relatedCard, relatedId);
    await assertPrimary(page, relatedRecord, alternateId, "en");
  });
});

test("M02a authored singleton video keeps its ID and hides image viewer action", async () => {
  await withPage("vi", async (page) => {
    const card = await openFixture(page, "vi", { direct: true, singleton: true });
    assert.equal(card.mediaItems.length, 1);
    await assertPrimary(page, card, videoId, "vi");
  });
});

test("M02a selected image opens image viewer bound to that image", async () => {
  await withPage("en", async (page) => {
    const card = await openFixture(page, "en", { videoCover: true, direct: true });
    await choosePrimaryThumb(page, card.mediaItems[0].id);
    await assertPrimary(page, card, card.mediaItems[0].id, "en");
    await page.locator("[data-advertising-photo-expand]").click();
    const viewer = page.locator("[data-advertising-photo-dialog]");
    await viewer.waitFor({ state: "visible" });
    const image = await viewer.locator("[data-advertising-photo-expanded-image]").evaluate((node) => ({
      src: node.currentSrc || node.src, alt: node.alt,
    }));
    assert.equal(mediaPath(image.src), card.mediaItems[0].src);
    assert.equal(image.alt, card.mediaItems[0].altEn);
  });
});

async function choosePrimaryThumb(page, id) {
  const historyBefore = await page.evaluate(() => history.length);
  const urlBefore = page.url();
  await page.locator(`[data-advertising-photo-media-select="${id}"]`).click({ timeout: 5_000 });
  await page.waitForFunction((id) =>
    document.querySelector(`[data-advertising-photo-media-select="${id}"]`)?.getAttribute("aria-current") === "true",
  id, { timeout: 5_000 });
  assert.equal(await page.evaluate(() => history.length), historyBefore, "thumbnail does not add history entry");
  assert.equal(page.url(), urlBefore, "thumbnail does not change card URL");
}

async function withPage(locale, execute) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: locale === "vi" ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    hasTouch: locale === "vi", isMobile: locale === "vi",
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await execute(page);
    assert.deepEqual(pageErrors, [], "no runtime page errors");
  } finally { await context.close(); await browser.close(); }
}

async function capturePrimary(page, name) {
  if (!process.env.SITE_MEDIA_OUTPUT_DIR) return;
  await mkdir(process.env.SITE_MEDIA_OUTPUT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(process.env.SITE_MEDIA_OUTPUT_DIR, name) });
}

test("M02a EN grid active video opens primary video with muted original audio and selected thumbnail", async () => {
  await withPage("en", async (page) => {
    const card = await openFixture(page, "en");
    await openCardBody(page, await selectGridMedia(page, videoId));
    await assertPrimary(page, card, videoId, "en");
    await capturePrimary(page, "primary-video-en-1440.png");
    assert.equal(new URL(page.url()).searchParams.has("media"), false);
    await page.locator("[data-advertising-photo-audio-toggle]").click({ timeout: 5_000 });
    await page.waitForFunction(() => [...document.querySelectorAll("[data-advertising-photo-hero] video")]
      .some((node) => !node.hidden && !node.muted && node.readyState >= 2), null, { timeout: 5_000 });
    const video = await page.locator("[data-advertising-photo-hero] video").evaluate((node) => ({
      src: node.currentSrc || node.getAttribute("src"), width: node.videoWidth, height: node.videoHeight,
    }));
    assert.equal(mediaPath(video.src), card.mediaItems[1].src, "unmuted video keeps original clip");
    assert.deepEqual([video.width, video.height], [480, 320]);
    assert.equal(await page.locator(`[data-advertising-card="${cardId}"] video`).evaluate((node) => node.muted), true,
      "grid video stays muted after detail unmute");
    await page.locator("[data-advertising-photo-audio-toggle]").click();
    assert.equal(await page.locator("[data-advertising-photo-hero] video").evaluate((node) => node.muted), true,
      "explicit mute returns detail video to muted state");
    await choosePrimaryThumb(page, card.mediaItems[0].id);
    await assertPrimary(page, card, card.mediaItems[0].id, "en");
  });
});

test("M02a native video volume and custom audio button stay synchronized", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    const video = page.locator("[data-advertising-photo-video]");
    const button = page.locator("[data-advertising-photo-audio-toggle]");
    await video.evaluate((node) => { node.muted = false; node.volume = 0; });
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-audio-toggle]")
      ?.getAttribute("aria-label") === "Unmute");
    await button.click();
    await page.waitForFunction(() => {
      const node = document.querySelector("[data-advertising-photo-video]");
      return node && !node.muted && node.volume > 0
        && document.querySelector("[data-advertising-photo-audio-toggle]")?.getAttribute("aria-label") === "Mute";
    });
    await video.evaluate((node) => { node.muted = true; });
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-audio-toggle]")
      ?.getAttribute("aria-label") === "Unmute");
    await video.evaluate((node) => { node.muted = false; node.volume = 0.4; });
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-audio-toggle]")
      ?.getAttribute("aria-label") === "Mute");
  });
});

test("M02a video without authored audio hides the custom audio button", async () => {
  await withPage("vi", async (page) => {
    const card = await openFixture(page, "vi", { videoCover: true, direct: true, hasAudio: false });
    await assertPrimary(page, card, videoId, "vi");
  });
});

test("M02a route unmount pauses and unloads the primary video", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    const video = page.locator("[data-advertising-photo-video]");
    await video.evaluate((node) => node.play());
    await page.evaluate(() => window.TruongThinhAdvertising.unmount());
    const state = await video.evaluate((node) => ({ paused: node.paused, hasSrc: node.hasAttribute("src"),
      readyState: node.readyState }));
    assert.equal(state.paused, true);
    assert.equal(state.hasSrc, false, `unmounted video retains source: ${JSON.stringify(state)}`);
    assert.equal(state.readyState, 0, `unmounted video retains decoded media: ${JSON.stringify(state)}`);
  });
});

test("M02a VI grid active image opens primary image and thumbnail switches media without history", async () => {
  await withPage("vi", async (page) => {
    const card = await openFixture(page, "vi", { videoCover: true });
    await openCardBody(page, await selectGridMedia(page, card.mediaItems[0].id));
    await assertPrimary(page, card, card.mediaItems[0].id, "vi");
    await capturePrimary(page, "primary-image-vi-390.png");
    await choosePrimaryThumb(page, videoId);
    await assertPrimary(page, card, videoId, "vi");
  });
});

for (const [locale, videoCover] of [["en", false], ["vi", true]]) {
  test(`M02a ${locale.toUpperCase()} direct URL and reload start authored cover after thumbnail change`, async () => {
    await withPage(locale, async (page) => {
      const card = await openFixture(page, locale, { videoCover, direct: true });
      const coverId = card.coverMediaId;
      const alternateId = card.mediaItems.find((item) => item.id !== coverId).id;
      await assertPrimary(page, card, coverId, locale);
      await choosePrimaryThumb(page, alternateId);
      await assertPrimary(page, card, alternateId, locale);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator("[data-advertising-photo-view]").waitFor({ state: "visible" });
      await assertPrimary(page, card, coverId, locale);
      assert.equal(new URL(page.url()).searchParams.has("media"), false);
    });
  });
}
