import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";
import { ADVERTISING_CATALOG_DETAIL } from "../../.site-output/advertising-products/catalog-detail.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const base = process.env.BASE_URL || "http://localhost:8792";
const cardId = "signage-raised-letters-06";
const videoId = `${cardId}-synthetic-video`;
const fixturePrefix = "/__site_media_card_fixture__/";
const clip = path.join(root, "tests/site/fixtures/site-media-card-clip-audio-3x2.mp4");
const poster = path.join(root, "tests/site/fixtures/site-media-card-poster-3x2.webp");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");

function fixtureArtifact(videoCover = false, { singleton = false, relatedMedia = false, hasAudio = true, wideVideo = false,
  crowded = false, twoVideos = false } = {}) {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  assert.equal(artifact.cards.length, 285, "fixture retains all legacy cards");
  const card = artifact.cards.find((item) => item.id === cardId);
  assert(card && card.media.width * 2 === card.media.height * 3);
  // Keep only the legacy image as cover so the fixture does not depend on temp media (images, video can be added, a video can be set as cover).
  card.mediaItems = [{ id: cardId, kind: "image", ...card.media }];
  card.coverMediaId = cardId;
  card.mediaItems.push({
    id: videoId, kind: "video", src: `${fixturePrefix}clip-audio-3x2.mp4`,
    sourceId: "m00b:test-only:clip-audio-3x2", source: "M00b sealed synthetic fixture",
    sha256: "363907eb9b7c8da2af83cd672087ce0e2d1942e4f7a30350b06ec2583aba4ef4",
    provenance: "Synthetic test-only fixture, not public project media.",
    width: wideVideo ? 640 : 480, height: wideVideo ? 360 : 320, posterSrc: `${fixturePrefix}poster-3x2.webp`,
    posterWidth: 480, posterHeight: 320, durationSeconds: 3, hasAudio,
    altVi: "Video kiểm thử tổng hợp", altEn: "Synthetic test video",
  });
  if (videoCover) card.coverMediaId = videoId;
  // The second video has a different source and a different total duration, so switching between the two videos shows which video's time is displayed.
  if (twoVideos) {
    card.mediaItems.push({ ...card.mediaItems[1], id: `${videoId}-2`, src: `${fixturePrefix}clip-audio-3x2-b.mp4`,
      durationSeconds: 4 });
  }
  // More media than one thumbnail row and a description longer than the description area, so the strip and description must scroll.
  if (crowded) {
    card.mediaItems.push(...Array.from({ length: 6 }, (_, index) => ({ ...card.mediaItems[0], id: `${cardId}-extra-${index}` })));
    // The artifact keeps only the grid part (static-release R1), the description lives in catalog-detail.
    card.descriptionVi = card.descriptionEn = Array(8).fill(ADVERTISING_CATALOG_DETAIL[cardId].descriptionEn).join(" ");
  }
  if (singleton) {
    card.mediaItems = [card.mediaItems[1]];
    card.coverMediaId = videoId;
  }
  const related = artifact.cards.filter((item) => item.category === card.category && item.id !== card.id);
  // Related keeps only the legacy image plus one replacement image so the card always has dots: temp media has a card with 5 items, adding one makes
  // 6 items turn into a counter, leaving no dots to choose.
  if (relatedMedia) {
    related.forEach((item) => {
      const cover = { id: item.id, kind: "image", ...item.media };
      item.mediaItems = [cover, { ...cover, id: `${item.id}-alternate`,
        altVi: "Ảnh kiểm thử related đang chọn", altEn: "Selected related test image" }];
      item.coverMediaId = item.id;
    });
  }
  return { artifact, card, related };
}

async function openFixture(page, locale, { videoCover = false, direct = false, photoOnly = false,
  singleton = false, relatedMedia = false, hasAudio = true, wideVideo = false, crowded = false, twoVideos = false } = {}) {
  const { artifact, card, related } = fixtureArtifact(videoCover,
    { singleton, relatedMedia, hasAudio, wideVideo, crowded, twoVideos });
  await page.route(`**${fixturePrefix}*`, async (route) => {
    if (!route.request().url().endsWith(".mp4")) return route.fulfill({ path: poster, contentType: "image/webp" });
    // Return 206 for Range so Chrome treats the clip as seekable, otherwise the seek bar cannot change currentTime.
    const body = await readFile(clip);
    const [start, end = body.length - 1] = (/bytes=(\d+)-(\d*)/.exec(route.request().headers().range || "") || [])
      .slice(1).filter(Boolean).map(Number);
    if (start === undefined) return route.fulfill({ body, contentType: "video/mp4", headers: { "accept-ranges": "bytes" } });
    return route.fulfill({ status: 206, body: body.subarray(start, end + 1), contentType: "video/mp4",
      headers: { "accept-ranges": "bytes", "content-range": `bytes ${start}-${end}/${body.length}` } });
  });
  await page.addInitScript((value) => { window.__TT_ADVERTISING_ARTIFACT__ = value; }, artifact);
  const query = direct ? photoOnly ? `?photo=${card.id}` : `?category=${card.category}&photo=${card.id}` : `?category=${card.category}`;
  await page.goto(`${base}/${locale}/advertising-products/${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.TruongThinhMasonry?.getAdapter?.()), null, { timeout: 5_000 });
  if (direct) await page.locator("[data-detail-view]").waitFor({ state: "visible" });
  else await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id), card.id);
  return relatedMedia ? { card, related } : card;
}

async function selectGridMedia(page, id) {
  const card = page.locator(`[data-masonry-card="${cardId}"]`);
  await card.scrollIntoViewIfNeeded();
  await card.locator(`[data-masonry-media-select="${id}"]`).click({ timeout: 5_000 });
  await page.waitForFunction(({ cardId, id }) =>
    document.querySelector(`[data-masonry-card="${cardId}"]`)?.dataset.masonryActiveMediaId === id,
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
  await page.locator("[data-detail-view]").waitFor({ state: "visible" });
}

async function primaryState(page) {
  return page.locator("[data-detail-view]").evaluate((view) => {
    const hero = view.querySelector("[data-detail-hero]");
    const visible = [...hero.querySelectorAll("img, video")].filter((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return !node.hidden && !node.closest('[aria-hidden="true"]') && style.display !== "none"
        && style.visibility !== "hidden" && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
    }).map((node) => ({ kind: node.tagName.toLowerCase(),
      src: node.currentSrc || node.getAttribute("src") || "",
      poster: node.getAttribute("poster") || "", muted: node.tagName === "VIDEO" ? node.muted : null,
      alt: node.getAttribute("alt") || "", ariaLabel: node.getAttribute("aria-label") || "" }));
    const thumbs = [...view.querySelectorAll("[data-detail-media-select]")].map((node) => ({
      id: node.dataset.detailMediaSelect, selected: node.getAttribute("aria-current") === "true",
    }));
    const audio = view.querySelector("[data-detail-audio-toggle]");
    const expand = view.querySelector("[data-detail-expand]");
    return { photoId: view.dataset.detailId, visible, thumbs,
      audioLabel: audio?.getAttribute("aria-label") || "", audioHidden: audio?.hidden ?? true,
      expandHidden: expand?.hidden ?? true };
  });
}

// AVIF/responsive-width variants count as their original WebP source.
function mediaPath(value) {
  if (!value) return "";
  const pathname = new URL(value, base).pathname;
  return /^\/assets\/content\/.+\.(?:avif|jxl)$|-(?:240|480|960|1600|2048)\.(?:avif|webp|jxl)$/.test(pathname)
    ? pathname.replace(/(?:-(?:240|480|960|1600|2048))?\.(?:avif|webp|jxl)$/, ".webp")
    : pathname;
}

async function assertPrimary(page, card, expectedId, locale) {
  // Wait for the target media layer to show continuously for 700ms, past the animation in the hero, by the same visibility rule that
  // primaryState reads: the old layer may be the same image, and the new layer only starts revealing after the 100ms decode mark (loading-glass R4).
  const target = card.mediaItems.find((item) => item.id === expectedId);
  await page.evaluate(() => { window.__ttPrimaryStableSince = null; });
  await page.waitForFunction(({ kind, src }) => {
    const shown = !document.querySelector("[data-detail-hero]").getAnimations({ subtree: true }).length
      && [...document.querySelectorAll(`[data-detail-hero] ${kind === "video" ? "video" : "img"}`)].some((node) => {
        const style = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        const path = new URL(node.currentSrc || node.src, location.href).pathname.replace(/(?:-(?:240|480|960|1600|2048))?\.(?:avif|webp|jxl)$/, ".webp");
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
  } else {
    assert.equal(active.alt, locale === "en" ? expected.altEn : expected.altVi);
  }
  // The expand button also shows for video (primary-video-player R8).
  assert.equal(state.expandHidden, false, "image and video keep the expand action");
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
    const relatedCard = page.locator("[data-masonry-related-card]").first();
    await relatedCard.waitFor({ state: "visible" });
    const relatedId = await relatedCard.getAttribute("data-masonry-related-card");
    const relatedRecord = related.find((item) => item.id === relatedId);
    assert(relatedRecord, "visible related card belongs to the fixture");
    await relatedCard.scrollIntoViewIfNeeded();
    const alternateId = relatedRecord.mediaItems[1].id;
    await relatedCard.locator(`[data-masonry-media-select="${alternateId}"]`).click();
    await page.waitForFunction(({ id, mediaId }) =>
      document.querySelector(`[data-masonry-related-card="${id}"]`)?.dataset.masonryActiveMediaId === mediaId,
    { id: relatedId, mediaId: alternateId });
    await openCardBody(page, relatedCard, relatedId);
    await assertPrimary(page, relatedRecord, alternateId, "en");
  });
});

test("M02a authored singleton video keeps its ID and shows the expand action", async () => {
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
    await page.locator("[data-detail-expand]").click();
    const viewer = page.locator("[data-detail-dialog]");
    await viewer.waitFor({ state: "visible" });
    const image = await viewer.locator("[data-detail-expanded-image]").evaluate((node) => ({
      src: node.currentSrc || node.src, alt: node.alt,
    }));
    assert.equal(mediaPath(image.src), card.mediaItems[0].src);
    assert.equal(image.alt, card.mediaItems[0].altEn);
    assert.deepEqual(await viewerMediaGate(page), { frame: false, animations: [] }, "viewer image has no wait sweep or fade-in");
    assert.deepEqual(await underViewer(page), { image: "hidden", background: true, live: false, glass: true },
      "under the viewer the primary frame shows only its zoom blur");
    await page.keyboard.press("Escape");
    await viewer.waitFor({ state: "hidden" });
    assert.equal((await underViewer(page)).image, "visible", "closing the viewer shows the primary image again");
  });
});

// When the viewer opens, the primary frame under the backdrop keeps only the fully covering zoom blur (advertising-detail R9, owner 2026-10-26).
const underViewer = (page) => page.evaluate(() => {
  const frame = document.querySelector(".detail-view__hero-frame");
  const shown = (selector) => getComputedStyle(frame.querySelector(selector)).display !== "none";
  return { image: getComputedStyle(frame.querySelector("[data-detail-image]")).visibility,
    background: shown(":scope > [data-detail-background]"), live: shown(":scope > .detail-view__live-background"),
    glass: shown(":scope > .glass-surface") };
});

// The viewer belongs to Advertising so it has no light streak or fade-in of the content image placeholder frame (loading-glass R5).
const viewerMediaGate = (page) => page.evaluate(() => ({
  frame: document.querySelector(".detail-dialog__viewport").classList.contains("media-frame"),
  animations: document.getAnimations().map(({ animationName }) => animationName).filter((name) => /^media-/.test(name)),
}));

async function choosePrimaryThumb(page, id) {
  const historyBefore = await page.evaluate(() => history.length);
  const urlBefore = page.url();
  await page.locator(`[data-detail-media-select="${id}"]`).click({ timeout: 5_000 });
  await page.waitForFunction((id) =>
    document.querySelector(`[data-detail-media-select="${id}"]`)?.getAttribute("aria-current") === "true",
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

// Wait for running CSS transitions (hover, fade) to finish instead of a fixed sleep: two frames for style recalculation to start the
// transition, then wait until no transition is running (including the delay phase).
const settleTransitions = async (page) => {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(() => !document.getAnimations()
    .some((animation) => animation instanceof CSSTransition && animation.playState === "running"), null, { timeout: 5_000 });
};

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
    await page.locator("[data-detail-audio-toggle]").click({ timeout: 5_000 });
    await page.waitForFunction(() => [...document.querySelectorAll("[data-detail-hero] video")]
      .some((node) => !node.hidden && !node.muted && node.readyState >= 2), null, { timeout: 5_000 });
    const video = await page.locator("[data-detail-hero] video").evaluate((node) => ({
      src: node.currentSrc || node.getAttribute("src"), width: node.videoWidth, height: node.videoHeight,
    }));
    assert.equal(mediaPath(video.src), card.mediaItems[1].src, "unmuted video keeps original clip");
    assert.deepEqual([video.width, video.height], [480, 320]);
    assert.equal(await page.locator(`[data-masonry-card="${cardId}"] video`).evaluate((node) => node.muted), true,
      "grid video stays muted after detail unmute");
    await page.locator("[data-detail-audio-toggle]").click();
    assert.equal(await page.locator("[data-detail-hero] video").evaluate((node) => node.muted), true,
      "explicit mute returns detail video to muted state");
    await choosePrimaryThumb(page, card.mediaItems[0].id);
    await assertPrimary(page, card, card.mediaItems[0].id, "en");
  });
});

test("M02a native video volume and custom audio button stay synchronized", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    const video = page.locator("[data-detail-video]");
    const button = page.locator("[data-detail-audio-toggle]");
    await video.evaluate((node) => { node.muted = false; node.volume = 0; });
    await page.waitForFunction(() => document.querySelector("[data-detail-audio-toggle]")
      ?.getAttribute("aria-label") === "Unmute");
    await button.click();
    await page.waitForFunction(() => {
      const node = document.querySelector("[data-detail-video]");
      return node && !node.muted && node.volume > 0
        && document.querySelector("[data-detail-audio-toggle]")?.getAttribute("aria-label") === "Mute";
    });
    await video.evaluate((node) => { node.muted = true; });
    await page.waitForFunction(() => document.querySelector("[data-detail-audio-toggle]")
      ?.getAttribute("aria-label") === "Unmute");
    await video.evaluate((node) => { node.muted = false; node.volume = 0.4; });
    await page.waitForFunction(() => document.querySelector("[data-detail-audio-toggle]")
      ?.getAttribute("aria-label") === "Mute");
  });
});

// Primary player per the Pinterest pin page: no native controls, looping video, click the video to play/pause, bottom bar shows on
// hover or while paused, seek bar, time, volume bar opens when pointing at the sound cluster.
const playerState = (page) => page.evaluate(() => {
  const player = document.querySelector("[data-detail-player]");
  const video = document.querySelector("[data-detail-video]");
  const opacity = (selector) => Number(getComputedStyle(player.querySelector(selector)).opacity);
  return { hidden: player.hidden, controls: video.controls, loop: video.loop, paused: video.paused,
    muted: video.muted, volume: video.volume, currentTime: video.currentTime,
    bar: opacity(".video-player__bar"),
    // No center play button on the video, even when paused (primary-video-player R1, R9; owner 2026-10-25).
    centerIcons: player.querySelectorAll("[data-detail-play-surface] svg").length,
    playLabel: player.querySelector("[data-detail-play]").getAttribute("aria-label"),
    time: player.querySelector(".video-player__time").textContent.replace(/\s+/g, " ").trim(),
    progress: Number(player.querySelector("[data-detail-progress]").value),
    volumeOpen: getComputedStyle(player.querySelector(".video-player__volume-pop")).visibility === "visible",
    volumeBox: (({ width, height }) => [Math.round(width), Math.round(height)])(
      player.querySelector("[data-detail-volume]").getBoundingClientRect()),
    volumeValue: Number(player.querySelector("[data-detail-volume]").value) };
});

test("M02a primary video player: surface toggles playback, bar shows on hover or pause, seek and time", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    // The route transition screen covers the page on entry; wait for it to end so hover reaches the player.
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
      && !document.querySelector("[data-detail-video]").paused);
    const frame = page.locator(".detail-view__hero-frame");
    const box = await frame.boundingBox();
    await page.mouse.move(box.x + box.width + 40, box.y + 10);
    await settleTransitions(page);
    let state = await playerState(page);
    assert.equal(state.controls, false, "no native controls");
    assert.equal(state.loop, true, "video loops like the Pinterest closeup");
    assert.equal(state.bar, 0, "bar hidden while playing without hover");
    // The expand button sits outside the player so it still shows when the player cluster fades (R9).
    assert.deepEqual(await page.locator("[data-detail-expand]").evaluate((node) =>
      [node.hidden, getComputedStyle(node).opacity]), [false, "1"], "expand stays visible while the bar hides");
    assert.equal(state.centerIcons, 0, "no center play icon");
    assert.equal(state.playLabel, "Pause");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
    await settleTransitions(page);
    assert.equal((await playerState(page)).bar, 1, "hover shows the bar");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 3);
    await page.mouse.move(box.x + box.width + 40, box.y + 10);
    await settleTransitions(page);
    state = await playerState(page);
    assert.equal(state.paused, true, "clicking the video pauses it");
    assert.deepEqual([state.bar, state.centerIcons, state.playLabel], [1, 0, "Play"],
      "paused keeps the bar and shows no center icon");
    assert.match(state.time, /^0:0\d \/ 0:03$/, `time shows current / total: ${state.time}`);
    const progress = page.locator("[data-detail-progress]");
    const track = await progress.boundingBox();
    await page.mouse.click(track.x + track.width * 0.5, track.y + track.height / 2);
    state = await playerState(page);
    assert(Math.abs(state.currentTime - 1.5) < 0.3, `clicking the middle of the bar seeks: ${state.currentTime}`);
    await progress.press("ArrowLeft");
    // A keyboard command waits for the `seeked` of the bar-click command if that command is still running (R2).
    await page.waitForFunction((before) => document.querySelector("[data-detail-video]").currentTime < before,
      state.currentTime);
    await page.locator("[data-detail-play]").click();
    // `paused` changes immediately on play(), the label only changes at the later `play` event: wait for the label, do not read once.
    await page.waitForFunction(() => !document.querySelector("[data-detail-video]").paused
      && document.querySelector("[data-detail-play]").getAttribute("aria-label") === "Pause");
    // A mouse click refocuses the button but it is not keyboard focus: when the mouse leaves the frame the cluster stays hidden (R9).
    await page.mouse.move(box.x + box.width + 40, box.y + 10);
    await settleTransitions(page);
    assert.equal((await playerState(page)).bar, 0, "a mouse click leaves no keyboard focus, so the bar hides again");
  });
});

// Reloading the source while playing stops the video without firing `pause` (only `abort`, `emptied`); the player must still switch to the
// paused state: bar shows, play button on the bar (primary-video-player R9).
test("M02a primary shows the paused bar when a source reload stops the video", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.querySelector("[data-detail-video]").paused);
    await page.mouse.move(1, 1);
    await settleTransitions(page);
    assert.equal((await playerState(page)).bar, 0, "bar hidden while playing without hover");
    await page.evaluate(() => {
      const video = document.querySelector("[data-detail-video]");
      video.src = video.currentSrc;
    });
    await page.waitForFunction(() => getComputedStyle(document.querySelector(".video-player__bar")).opacity === "1",
      null, { timeout: 2_000 }).catch(() => {});
    const state = await playerState(page);
    assert.deepEqual([state.paused, state.bar, state.playLabel], [true, 1, "Play"],
      `the stopped video shows the bar with the play button: ${JSON.stringify(state)}`);
  });
});

// Drag seek (primary-video-player R2): the video pauses while dragging, the frame follows the thumb, one seek command at a time; outside the loaded range
// keep the frame, seek only on release; on release resume playing if it was playing before.
async function dragProgress(page, from, to, { buffered = null, during } = {}) {
  await page.evaluate((end) => {
    const video = document.querySelector("[data-detail-video]");
    if (end !== null) Object.defineProperty(video, "buffered", { configurable: true, get: () => ({ length: 1, start: () => 0, end: () => end }) });
    window.__seekAudit = { seeks: 0, overlaps: 0, inFlight: false };
    video.addEventListener("seeking", () => {
      const audit = window.__seekAudit;
      audit.seeks += 1;
      if (audit.inFlight) audit.overlaps += 1;
      audit.inFlight = true;
    });
    video.addEventListener("seeked", () => { window.__seekAudit.inFlight = false; });
  }, buffered);
  const track = await page.locator("[data-detail-progress]").boundingBox();
  const at = (fraction) => [track.x + track.width * fraction, track.y + track.height / 2];
  await page.mouse.move(...at(from));
  await page.mouse.down();
  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(...at(from + (to - from) * step / 12));
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(200);
  await during(await playerState(page), await page.evaluate(() => window.__seekAudit));
  await page.mouse.up();
}

test("M02a primary scrub shows frames under the thumb, pauses while dragging and resumes on release", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
      && !document.querySelector("[data-detail-video]").paused);
    const frame = await page.locator(".detail-view__hero-frame").boundingBox();
    await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 3);
    await dragProgress(page, 0.2, 0.8, { during: (state, audit) => {
      assert.equal(state.paused, true, "video pauses while the thumb is held");
      assert.equal(state.playLabel, "Pause", "a playing video keeps its pause label while scrubbing");
      assert(Math.abs(state.currentTime - state.progress) < 0.15, `frame follows the thumb: ${state.currentTime} vs ${state.progress}`);
      assert(audit.seeks >= 3, `frames change during the drag: ${audit.seeks} seeks`);
      assert.equal(audit.overlaps, 0, "a new seek waits for the previous seeked");
    } });
    await page.waitForFunction(() => !document.querySelector("[data-detail-video]").paused);
    const state = await playerState(page);
    assert(state.currentTime >= 2.2, `release resumes from the thumb: ${state.currentTime}`);
  });
});

// A paused video can still be scrubbed with preview, on release it stays at the frame under the thumb (owner 2026-10-26: phone and PC).
test("M02a paused primary scrub shows frames under the thumb and stays paused on release", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
      && !document.querySelector("[data-detail-video]").paused);
    await page.locator(".detail-view__hero-frame [data-detail-play-surface]").click();
    await page.waitForFunction(() => document.querySelector("[data-detail-video]").paused);
    await dragProgress(page, 0.2, 0.8, { during: (state, audit) => {
      assert.equal(state.playLabel, "Play", "a paused video keeps its play label while scrubbing");
      assert(Math.abs(state.currentTime - state.progress) < 0.15, `frame follows the thumb: ${state.currentTime} vs ${state.progress}`);
      assert(audit.seeks >= 3, `frames change during the drag: ${audit.seeks} seeks`);
      assert.equal(audit.overlaps, 0, "a new seek waits for the previous seeked");
    } });
    await page.waitForFunction(() => !document.querySelector("[data-detail-video]").seeking);
    const state = await playerState(page);
    assert.equal(state.paused, true, "release keeps the video paused");
    assert(Math.abs(state.currentTime - state.progress) < 0.15 && state.currentTime >= 2.2,
      `release stays on the thumb frame: ${state.currentTime} vs ${state.progress}`);
  });
});

test("M02a primary scrub past the buffered range holds the frame and seeks on release", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
      && !document.querySelector("[data-detail-video]").paused);
    const frame = await page.locator(".detail-view__hero-frame").boundingBox();
    await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 3);
    await dragProgress(page, 0.1, 0.8, { buffered: 1.2, during: (state) => {
      assert(state.progress > 2.2, `thumb follows the hand: ${state.progress}`);
      assert(state.currentTime <= 1.2 + 1e-6, `frame holds inside the buffered range: ${state.currentTime}`);
      assert.match(state.time, /^0:02 \/ 0:03$/, `time shows the thumb: ${state.time}`);
    } });
    await page.waitForFunction(() => {
      const video = document.querySelector("[data-detail-video]");
      return !video.paused && video.currentTime > 2.2;
    });
  });
});

// Release while a drag seek command is still running: the release command waits for `seeked` before seeking, no overlapping commands; releasing exactly where the last
// drag command is seeking does not seek a second time (R2; A04s 2026-10-26).
test("M02a primary release during an in-flight scrub seek waits for seeked", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => {
      const video = document.querySelector("[data-detail-video]");
      return !video.paused && video.buffered.length && video.buffered.end(0) >= video.duration - 0.05;
    });
    for (const [releaseAt, seeks] of [[0.7, 2], [0.3, 1]]) {
      const result = await page.evaluate((releaseAt) => new Promise((resolve) => {
        const video = document.querySelector("[data-detail-video]");
        const progress = document.querySelector("[data-detail-progress]");
        const audit = { seeks: 0, overlaps: 0, inFlight: false };
        video.addEventListener("seeking", () => {
          audit.seeks += 1;
          if (audit.inFlight) audit.overlaps += 1;
          audit.inFlight = true;
        });
        video.addEventListener("seeked", () => { audit.inFlight = false; });
        const target = video.duration * releaseAt;
        progress.value = String(video.duration * 0.3);
        progress.dispatchEvent(new Event("input"));
        const seeking = video.seeking;
        progress.value = String(target);
        progress.dispatchEvent(new Event("change"));
        // currentTime changes immediately on sending the command, before the `seeking` event: wait for the seek command to finish (seeking false) before reading.
        const done = () => audit.seeks > 0 && !audit.inFlight && !video.seeking && !video.paused
          && video.currentTime >= target - 0.05;
        const poll = () => done() ? resolve({ ...audit, seeking, time: video.currentTime, target }) : requestAnimationFrame(poll);
        setTimeout(() => resolve({ ...audit, seeking, time: video.currentTime, target, timeout: true }), 3000);
        poll();
      }), releaseAt);
      assert.equal(result.seeking, true, `the scrub seek is still in flight at release: ${JSON.stringify(result)}`);
      assert.equal(result.overlaps, 0, `the release seek waits for seeked: ${JSON.stringify(result)}`);
      assert.equal(result.seeks, seeks, `scrub seek, then a release seek only to a new point: ${JSON.stringify(result)}`);
      assert(!result.timeout, `playback resumes from the release point: ${JSON.stringify(result)}`);
    }
  });
});

// Two-layer shadow D (primary-video-player R4) and solid thumb (R5): the bar no longer has a gradient strip, the icon and play button have a two-layer drop-shadow
// on their own layer, the seek bar has a two-layer box-shadow, the time and the unselected hint button text have a two-layer text-shadow.
test("M02a primary player and suggestion text carry the two-layer shadow and solid thumbs", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    const two = "rgba(0, 0, 0, 0.5) 0px 0px 2px, rgba(0, 0, 0, 0.4) 0px 0px 12px";
    const drop = "drop-shadow(rgba(0, 0, 0, 0.5) 0px 0px 2px) drop-shadow(rgba(0, 0, 0, 0.4) 0px 0px 12px)";
    // The seek bar draws its shadow with box-shadow on the track and thumb, no filter (A04s 2026-10-26), numbers tuned to look like the
    // old drop-shadow; Chromium drops the -moz rule.
    const seekShadows = ["-webkit-slider-runnable-track", "-webkit-slider-thumb"]
      .map((pseudo) => `.video-player__progress::${pseudo}`);
    const read = () => page.evaluate(() => {
      const style = (selector, pseudo) => getComputedStyle(document.querySelector(selector), pseudo);
      const label = (pressed) => [...document.querySelectorAll(".detail-view__suggestion-link")]
        .filter((link) => (link.getAttribute("aria-pressed") === "true") === pressed)
        .map((link) => [getComputedStyle(link.querySelector(".detail-view__suggestion-label")).textShadow,
          getComputedStyle(link, "::after").backgroundColor]);
      // getComputedStyle cannot read ::-webkit-slider-thumb, so read the rule in the stylesheet.
      const rules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]);
      const thumbs = rules
        .filter((rule) => rule.selectorText?.includes("video-player__range::-webkit-slider-thumb") && rule.style.backgroundColor)
        .map((rule) => rule.style.backgroundColor);
      const seek = Object.fromEntries(rules.filter((rule) => rule.style?.boxShadow)
        .map((rule) => [rule.selectorText, rule.style.boxShadow]));
      // A button carrying an icon with drop-shadow is its own layer so the shadow draws once (owner 2026-10-26 "Giữ bóng, tách lớp").
      const tileStep = rules.find((rule) => rule.selectorText === ".masonry-card > .detail-view__media-step");
      // The card arrow and the play thumbnail icon use the same two-layer drop-shadow D (S4); the card chevron is read from the rule because it shows only on hover.
      const dropOf = (selector) => rules.find((rule) => rule.selectorText === selector)?.style.filter;
      const layers = [style(".video-player__button").willChange,
        getComputedStyle(document.querySelector(".detail-view__media-thumbs svg").parentElement).willChange,
        tileStep?.style.willChange];
      return { bar: style(".video-player__bar").backgroundImage, time: style(".video-player__time").textShadow,
        filters: [".video-player__button svg", ".video-player__progress"]
          .map((selector) => style(selector).filter), layers,
        cardArrow: dropOf(".masonry-card > .detail-view__media-step svg"),
        thumbIcon: style(".detail-view__media-thumbs svg").filter,
        idle: label(false), pressed: label(true), thumbs, seek };
    });
    let state = await read();
    assert.equal(state.bar, "none", "the bar has no gradient band");
    assert.equal(state.time, two, "time carries the two-layer text shadow");
    assert.deepEqual(state.filters, [drop, "none"], "bar icons carry the two-layer drop shadow, the seek bar no filter");
    assert.equal(state.cardArrow, drop, "card arrows carry the two-layer drop shadow");
    assert.equal(state.thumbIcon, drop, "the thumbnail play icon carries the two-layer drop shadow");
    assert.deepEqual(state.layers, ["transform", "transform", "transform"],
      "player buttons, the thumb play icon and the card arrows are their own layers");
    assert.deepEqual(seekShadows.map((selector) => state.seek[selector]),
      ["rgba(0, 0, 0, 0.12) 0px 0px 4px, rgba(0, 0, 0, 0.22) 0px 0px 24px", "rgba(0, 0, 0, 0.5) 0px 0px 4px, rgba(0, 0, 0, 0.45) 0px 0px 28px"],
      "seek track and thumb carry the two-layer box shadow tuned to the old drop shadow");
    assert.deepEqual(state.thumbs, ["rgb(251, 251, 249)"], "seek and volume thumbs are solid");
    assert(state.idle.length > 0, "the fixture shows suggestion buttons");
    assert(state.idle.every(([shadow, layer]) => shadow === two && layer !== "rgba(0, 0, 0, 0)"),
      `unselected suggestions keep their dark layer and gain the shadow: ${JSON.stringify(state.idle)}`);
    await page.locator(".detail-view__suggestion-link").first().click();
    await page.waitForFunction(() => document.querySelector(".detail-view__suggestion-link[aria-pressed='true']"));
    state = await read();
    assert(state.pressed.length > 0 && state.pressed.every(([shadow]) => shadow === "none"), "the selected suggestion has no shadow");
  });
});

test("M02a primary vertical volume slider opens above the sound button and keeps the last volume", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    const frame = await page.locator(".detail-view__hero-frame").boundingBox();
    await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 3);
    assert.equal((await playerState(page)).volumeOpen, false, "slider hidden until the sound group is hovered");
    await page.locator("[data-detail-audio-toggle]").hover();
    await settleTransitions(page);
    let state = await playerState(page);
    assert.equal(state.volumeOpen, true, "hovering the sound button opens the slider");
    assert(state.volumeBox[1] > state.volumeBox[0] * 3, `slider stands vertical: ${state.volumeBox}`);
    assert.equal(state.volumeValue, 0, "muted video shows the slider at zero");
    const volume = page.locator("[data-detail-volume]");
    await volume.fill("0.4");
    state = await playerState(page);
    assert.deepEqual([state.muted, state.volume], [false, 0.4], "slider sets volume and unmutes");
    await volume.fill("0");
    state = await playerState(page);
    assert.deepEqual([state.muted, state.volumeValue], [true, 0], "slider at zero mutes");
    await page.locator("[data-detail-audio-toggle]").click();
    state = await playerState(page);
    assert.deepEqual([state.muted, state.volume, state.volumeValue], [false, 0.4, 0.4],
      "sound button restores the last volume");
    assert.equal(await page.locator("[data-detail-audio-toggle]").getAttribute("aria-label"), "Mute");
    // Drag the bar with the mouse then leave the sound cluster: the column retracts (previously bar focus kept the column open forever); the keyboard can still open it.
    await page.locator("[data-detail-audio-toggle]").hover();
    const slider = await volume.boundingBox();
    await page.mouse.move(slider.x + slider.width / 2, slider.y + slider.height * 0.8);
    await page.mouse.down();
    await page.mouse.move(slider.x + slider.width / 2, slider.y + slider.height * 0.3, { steps: 6 });
    await page.mouse.up();
    await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 3);
    await settleTransitions(page);
    assert.equal((await playerState(page)).volumeOpen, false, "leaving after a mouse drag collapses the slider");
    // Tab order by row: play, seek bar, sound button (owner 2026-10-25).
    await page.locator("[data-detail-play]").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    // The slider sits before the sound button and can be focused only once the column is open (150ms transition).
    await settleTransitions(page);
    await page.keyboard.press("Shift+Tab");
    await settleTransitions(page);
    assert.equal(await volume.evaluate((node) => node === document.activeElement), true, "Tab, Shift+Tab reaches the slider");
    assert.equal((await playerState(page)).volumeOpen, true, "keyboard focus keeps the slider open");
  });
});

// Touch screens (primary-video-player R1): one 40px row of time, seek bar, sound; no play button on the bar,
// the sound button only toggles, and does not open the volume column.
test("M02a touch primary video uses one 40px row with the play button, no center icon and no volume column", async () => {
  await withPage("vi", async (page) => {
    await openFixture(page, "vi", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.querySelector("[data-detail-video]").paused);
    assert.equal(await page.evaluate(() => matchMedia("(hover: none)").matches), true, "the phone context has no hover");
    const row = () => page.evaluate(() => {
      const player = document.querySelector("[data-detail-player]");
      const box = (selector) => (({ top, height }) => [Math.round(top + height / 2), Math.round(height)])(
        player.querySelector(selector).getBoundingClientRect());
      const left = (selector) => player.querySelector(selector).getBoundingClientRect().left;
      return { volumePop: getComputedStyle(player.querySelector(".video-player__volume-pop")).display,
        gradient: getComputedStyle(player.querySelector(".video-player__bar")).backgroundImage,
        items: ["[data-detail-play]", "[data-detail-progress]", "[data-detail-audio-toggle]"]
          .map(box),
        time: box(".video-player__time"),
        order: ["[data-detail-play]", ".video-player__time", "[data-detail-progress]",
          "[data-detail-audio-toggle]"].map(left) };
    });
    let state = await playerState(page);
    assert.deepEqual([state.bar, state.centerIcons, state.playLabel], [1, 0, "Tạm dừng"], "playing: bar visible, no center icon");
    const layout = await row();
    assert.deepEqual([layout.volumePop, layout.gradient], ["none", "none"], "no volume column, no gradient band");
    assert(layout.items.every(([centre, height]) => height === 40 && Math.abs(centre - layout.time[0]) <= 1),
      `play, time, seek bar and sound share one 40px row: ${JSON.stringify(layout)}`);
    assert(layout.order.every((value, index) => index === 0 || value > layout.order[index - 1]),
      `the row reads play, time, seek bar, sound: ${JSON.stringify(layout.order)}`);
    await page.locator("[data-detail-play-surface]").tap();
    await page.waitForTimeout(150);
    state = await playerState(page);
    assert.deepEqual([state.paused, state.centerIcons, state.playLabel], [true, 0, "Phát"],
      "tapping the video pauses it, the bar button turns to play, no center icon");
    const muted = state.muted;
    await page.locator("[data-detail-audio-toggle]").tap();
    state = await playerState(page);
    assert.equal(state.muted, !muted, "the sound button toggles sound");
    assert.equal((await row()).volumePop, "none", "the sound button never opens a volume column");
  });
});

// A finger on the seek bar only seeks, it does not drag the media strip (primary-video-player R10, owner 2026-10-24).
test("M02a touch seek drag moves the video, not the media strip", async () => {
  await withPage("vi", async (page) => {
    const card = await openFixture(page, "vi", { videoCover: true, direct: true });
    // The route transition screen covers the page on entry; wait for it to end so the finger reaches the seek bar.
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
      && document.querySelector("[data-detail-video]").readyState >= 2);
    const view = page.locator("[data-detail-view]");
    assert.equal(await view.getAttribute("data-masonry-active-media-id"), videoId);
    assert(card.mediaItems.length > 1, "the card has more than one media");
    const track = await page.locator("[data-detail-progress]").boundingBox();
    // Pause the video and go to 0 so only the drag changes the seconds.
    const before = await page.evaluate(() => {
      const video = document.querySelector("[data-detail-video]");
      video.pause();
      video.currentTime = 0;
      return video.currentTime;
    });
    const y = track.y + track.height / 2;
    const cdp = await page.context().newCDPSession(page);
    let x = track.x + 4;
    let strip = false;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
    // Drag 60% of the bar, past the strip 10px slop. Dragging to the bar end makes a stopped looping video seek back to 0 on its own once seek completes
    // (Chrome), so the read seconds are 0 (CI red 0 -> 0, bar 115px but dragged 120px).
    for (let step = 0; step < 12; step += 1) {
      x += track.width * 0.6 / 12;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y, id: 1 }] });
      strip ||= await page.evaluate(() => Boolean(document.querySelector(".detail-view__strip")));
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(600);
    const [after, paused] = await page.evaluate(() => (({ currentTime, paused }) => [currentTime, paused])(
      document.querySelector("[data-detail-video]")));
    assert.equal(paused, true, "a paused video stays paused after the drag");
    assert.equal(strip, false, "the media strip never opens while seeking");
    assert.equal(await view.getAttribute("data-masonry-active-media-id"), videoId, "the media does not change");
    assert(after - before > 1, `the drag seeks the video forward: ${before} -> ${after}`);
  });
});

// Media strip per the Pinterest pin: the frame keeps the cover ratio so switching media does not resize primary, related stays still;
// the arrows and the viewed thumbnail follow position, media of a different ratio has a zoom blur backdrop.
// The primary frame is as tall as the media (primary-video-player R6): the video fits the frame exactly at 1440×900. A short viewport caps the frame by
// height, so a 3:2 or 16:9 video leaves spare area on both sides for the blur backdrop.
const cappedViewport = { width: 1440, height: 560 };

const stripState = (page) => page.evaluate(() => {
  const view = document.querySelector("[data-detail-view]");
  const frame = view.querySelector(".detail-view__hero-frame").getBoundingClientRect();
  return { active: view.dataset.masonryActiveMediaId, glass: view.dataset.detailGlass,
    frame: [frame.width, frame.height].map(Math.round).join("x"),
    related: [...view.querySelectorAll("[data-detail-related-grid] > *")].slice(0, 6)
      .map((node) => (({ x, y }) => `${Math.round(x)},${Math.round(y)}`)(node.getBoundingClientRect())).join(" "),
    steps: [...view.querySelectorAll("[data-detail-media-step]")].map((node) => node.hidden ? 0 : 1).join(""),
    thumbs: [...view.querySelectorAll("[data-detail-media-select]")].map((node) => node.getAttribute("aria-current") === "true" ? 1 : 0).join("") };
});

// A portrait card with four images of the same ratio: media narrower than the frame so it has a zoom blur backdrop; clicking a thumbnail slides straight to that media, the
// blur backdrop slides with the strip (media-card R6, owner 2026-10-19). Primary has no dot row, thumbnails have square corners (owner 2026-10-24).
test("M02a primary thumbnails jump straight to a media without dots and the blur backdrop mirrors the strip live", async () => {
  await withPage("en", async (page) => {
    const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
    const card = artifact.cards.find((item) => item.media.height > item.media.width * 1.3);
    assert(card, "a portrait card exists");
    const cover = card.mediaItems[0];
    card.mediaItems = [0, 1, 2, 3].map((index) => index ? { ...cover, id: `${card.id}-strip-${index + 1}`,
      src: `${cover.src}?m02a-strip=${index + 1}`, sourceId: `${cover.sourceId}:test-only:${index + 1}` } : cover);
    card.coverMediaId = cover.id;
    await page.addInitScript((value) => { window.__TT_ADVERTISING_ARTIFACT__ = value; }, artifact);
    await page.goto(`${base}/en/advertising-products/?category=${card.category}&photo=${card.id}`, { waitUntil: "domcontentloaded" });
    await page.locator("[data-detail-view]").waitFor({ state: "visible" });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.waitForTimeout(1200);
    assert.equal(await page.locator("[data-detail-media-dots], .detail-view__media-dots").count(), 0,
      "primary has no dots");
    const thumbs = page.locator("[data-detail-media-select]");
    assert.deepEqual(await thumbs.evaluateAll((nodes) => nodes.map((node) => [node.getAttribute("aria-current"),
      getComputedStyle(node).borderRadius])), [["true", "0px"], ["false", "0px"], ["false", "0px"], ["false", "0px"]]);
    assert.equal(await page.locator("[data-detail-view]").getAttribute("data-detail-glass"), "true",
      "portrait media sits on the zoom blur backdrop");
    const frames = await page.evaluate(async () => {
      const hero = document.querySelector(".detail-view__hero-frame");
      const frames = [];
      let stop = false;
      const tick = () => {
        const strip = hero.querySelector(".detail-view__strip");
        frames.push(strip && {
          media: [...strip.children].map((node) => ({ src: node.getAttribute("src"), translate: getComputedStyle(node).translate,
            opacity: getComputedStyle(node).opacity })),
          live: (() => {
            const canvas = hero.querySelector(".detail-view__live-background");
            const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
            let hash = 0;
            for (let i = 0; i < data.length; i += 13) hash = (hash * 31 + data[i]) % 1e9;
            return { hidden: canvas.hidden, hash };
          })(),
          real: getComputedStyle(hero.querySelector("[data-detail-image]")).visibility,
        });
        if (!stop) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      document.querySelectorAll("[data-detail-media-select]")[2].click();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      stop = true;
      return frames;
    });
    const sliding = frames.filter(Boolean);
    assert(sliding.length >= 20, `strip slides over many frames: ${sliding.length}`);
    for (const frame of sliding) {
      assert.equal(frame.media.length, 2, "strip holds only the current and the chosen media");
      assert(frame.media.every(({ src }) => !src?.includes("m02a-strip=2")), "the media in between never shows");
      assert(frame.media.some(({ src }) => src?.includes("m02a-strip=3")), "the chosen media slides in");
      assert.equal(frame.real, "hidden", "the real media waits under the strip");
      assert(frame.media.every(({ opacity }) => opacity === "1"), "nothing fades");
      assert.equal(frame.live.hidden, false, "the live blur backdrop covers the frame while the strip moves");
    }
    assert(new Set(sliding.map((frame) => frame.media[0].translate)).size > 10, "the strip moves");
    assert(new Set(sliding.map((frame) => frame.live.hash)).size > 10, "the blur backdrop is redrawn as the strip moves");
    assert.equal(frames.at(-1), null, "strip is removed once the chosen media is shown");
    assert.equal(await page.locator("[data-detail-view]").getAttribute("data-masonry-active-media-id"),
      card.mediaItems[2].id);
    assert.equal(await thumbs.nth(2).getAttribute("aria-current"), "true");
  });
});

test("M02a video stands still in the strip, its sound fades between play and pause, and the blur backdrop follows the video", async () => {
  await withPage("en", async (page) => {
    await page.setViewportSize(cappedViewport);
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => document.querySelector("[data-detail-video]").readyState >= 2);
    assert.equal(await page.locator("[data-detail-view]").getAttribute("data-detail-glass"), "true");
    const backdrop = () => page.evaluate(() => {
      const canvas = document.querySelector(".detail-view__live-background");
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let hash = 0;
      for (let i = 0; i < data.length; i += 13) hash = (hash * 31 + data[i]) % 1e9;
      return { hidden: canvas.hidden, hash };
    });
    const first = await backdrop();
    await page.waitForTimeout(400);
    const later = await backdrop();
    assert.equal(first.hidden, false, "a playing video draws the blur backdrop live");
    assert.notEqual(later.hash, first.hash, "the blur backdrop changes with the video frames");
    const slide = (step) => page.evaluate(async (step) => {
      const video = document.querySelector("[data-detail-video]");
      video.muted = false;
      video.volume = 1;
      const frames = [];
      let stop = false;
      const tick = () => {
        const strip = document.querySelector(".detail-view__strip");
        frames.push({ strip: Boolean(strip), laneVideos: strip?.querySelectorAll("video").length ?? 0,
          moving: Boolean(strip?.getAnimations({ subtree: true }).some(({ playState }) => playState === "running")),
          volume: video.volume, paused: video.paused, src: video.getAttribute("src"), time: video.currentTime, at: performance.now() });
        if (!stop) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      document.querySelector(`[data-detail-media-step="${step}"]`).click();
      await new Promise((resolve) => setTimeout(resolve, 2400));
      stop = true;
      return frames;
    }, step);
    const out = await slide(-1);
    const sliding = out.filter(({ strip }) => strip);
    assert(sliding.length >= 20, `video to image slides over many frames: ${sliding.length}`);
    assert(sliding.every(({ laneVideos }) => laneVideos === 0), "no video plays inside the strip");
    // Sound keeps playing and fades while the picture stays on the strip, at 0 the video stops.
    const fading = sliding.filter(({ paused }) => !paused);
    const span = fading.at(-1).at - fading[0].at;
    assert(span > 600 && fading[0].volume > 0.9, `the sound fades over the slide rhythm from the viewer volume: ${span}`);
    assert(fading.every((frame, index) => !index || frame.volume <= fading[index - 1].volume + 1e-6), "the fade only goes down");
    assert(fading.at(-1).volume < 0.1, `the sound fades out before the video pauses: ${fading.at(-1).volume}`);
    assert.equal(out.at(-1).src, null, "the video stops once the image is in the frame");
    assert.equal(out.at(-1).volume, 1, "the viewer volume comes back");
    const back = await slide(1);
    const inStrip = back.filter(({ strip }) => strip);
    assert(inStrip.length >= 20, `image to video slides over many frames: ${inStrip.length}`);
    assert(inStrip.every(({ laneVideos }) => laneVideos === 0), "no video plays inside the strip");
    const end = back.indexOf(inStrip.at(-1));
    assert(back.filter(({ moving }) => moving).every(({ paused }) => paused), "the video waits for the strip to stop");
    const after = back.slice(end + 1);
    assert(after.length >= 20 && after.every(({ paused }) => !paused), "the video plays once it is in the frame");
    assert(after[0].time < 0.5, `the video starts from the beginning: ${after[0].time}`);
    assert(after[0].volume < 0.2 && after.at(-1).volume === 1, "its sound fades in to the viewer volume");
    assert(after.every((frame, index) => !index || frame.volume >= after[index - 1].volume - 1e-6), "the fade only goes up");
  });
});

// The live glass backdrop and the seek bar draw per video frame rather than per screen refresh; the backdrop stays still under the viewer (A04s
// 2026-10-26: a rAF-driven seek bar pushed primary video to 44 frames/s for a 24 frames/s clip).
test("M02a live blur backdrop and seek bar redraw once per video frame, the backdrop stands still under the viewer", async () => {
  await withPage("en", async (page) => {
    await page.setViewportSize(cappedViewport);
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.querySelector("[data-detail-video]").paused);
    // Count draws onto the backdrop canvas and video frames in 1 s (headless refreshes 30 times/s, 24 fps clip: drawing per rAF makes the number of
    // draws exceed the number of frames).
    const count = () => page.evaluate(() => new Promise((resolve) => {
      const video = document.querySelector("[data-detail-video]");
      const live = document.querySelector(".detail-view__live-background");
      const progress = document.querySelector("[data-detail-progress]");
      const { drawImage } = CanvasRenderingContext2D.prototype;
      const { setProperty } = CSSStyleDeclaration.prototype;
      const tally = { draws: 0, bar: 0, frames: 0 };
      let stop = false;
      CanvasRenderingContext2D.prototype.drawImage = function (...args) {
        if (this.canvas === live) tally.draws += 1;
        return drawImage.apply(this, args);
      };
      CSSStyleDeclaration.prototype.setProperty = function (...args) {
        if (this === progress.style && args[0] === "--range-fill") tally.bar += 1;
        return setProperty.apply(this, args);
      };
      const onFrame = () => {
        tally.frames += 1;
        if (!stop) video.requestVideoFrameCallback(onFrame);
      };
      video.requestVideoFrameCallback(onFrame);
      setTimeout(() => {
        stop = true;
        CanvasRenderingContext2D.prototype.drawImage = drawImage;
        CSSStyleDeclaration.prototype.setProperty = setProperty;
        resolve(tally);
      }, 1000);
    }));
    const playing = await count();
    assert(playing.draws > 0 && playing.draws <= playing.frames + 1, `one draw per video frame: ${JSON.stringify(playing)}`);
    assert(playing.bar > 0 && playing.bar <= playing.frames + 1, `one seek bar update per video frame: ${JSON.stringify(playing)}`);
    await page.locator("[data-detail-expand]").click();
    await page.waitForFunction(() => document.querySelector("[data-detail-video]").closest("dialog[open]"));
    const viewer = await count();
    assert(viewer.frames > 0, `the video keeps playing in the viewer: ${JSON.stringify(viewer)}`);
    assert.equal(viewer.draws, 0, `the backdrop under the viewer stands still: ${JSON.stringify(viewer)}`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("[data-detail-dialog]").open);
    assert((await count()).draws > 0, "closing the viewer resumes the live backdrop");
  });
});

// A viewer adjusting sound mid-fade wins (primary-video-player R11): the fade stops, the level just chosen is kept.
test("M02a a volume change during the sound fade wins and stays", async () => {
  await withPage("en", async (page) => {
    await page.setViewportSize(cappedViewport);
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => document.querySelector("[data-detail-video]").readyState >= 2);
    await page.evaluate(() => {
      const video = document.querySelector("[data-detail-video]");
      video.muted = false;
      video.volume = 1;
      document.querySelector('[data-detail-media-step="-1"]').click();
    });
    await page.waitForFunction(() => document.querySelector("[data-detail-video]").getAttribute("src") === null,
      null, { timeout: 5_000 });
    const result = await page.evaluate(async () => {
      const video = document.querySelector("[data-detail-video]");
      const range = document.querySelector("[data-detail-volume]");
      document.querySelector('[data-detail-media-step="1"]').click();
      const deadline = performance.now() + 5000;
      while (performance.now() < deadline) {
        await new Promise(requestAnimationFrame);
        if (video.paused || video.volume <= 0.05 || video.volume >= 0.9) continue;
        const fading = video.volume;
        range.value = "0.3";
        range.dispatchEvent(new Event("input", { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return { fading, volume: video.volume, muted: video.muted, range: Number(range.value) };
      }
      return null;
    });
    assert(result, "the sound fades in after the strip stops");
    assert(Math.abs(result.volume - 0.3) < 0.01 && !result.muted && result.range === 0.3,
      `the chosen volume stays instead of fading on: ${JSON.stringify(result)}`);
  });
});

test("M02a blur backdrop has no vignette: its edges are as opaque as its centre", async () => {
  await withPage("en", async (page) => {
    await page.setViewportSize(cappedViewport);
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => document.querySelector("[data-detail-video]").readyState >= 2
      && !document.documentElement.classList.contains("route-enter"));
    // Hide media and Glass then capture the blur backdrop over two frame background colors: wherever the blur backdrop is transparent the two images differ.
    await page.addStyleTag({ content: `.detail-view__hero-frame { background: var(--test-frame) !important; }
      .detail-view__hero-frame > :not([data-detail-background], .detail-view__live-background) { visibility: hidden !important; }` });
    const frame = page.locator(".detail-view__hero-frame");
    const pixels = async (color) => {
      await frame.evaluate((node, color) => node.style.setProperty("--test-frame", color), color);
      const shot = await frame.screenshot();
      return page.evaluate(async (base64) => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const context = new OffscreenCanvas(image.width, image.height).getContext("2d");
        context.drawImage(image, 0, 0);
        const { width: w, height: h } = image;
        return [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2], [1, h >> 1], [w >> 1, 1]]
          .map(([x, y]) => context.getImageData(x, y, 1, 1).data[1]);
      }, shot.toString("base64"));
    };
    const seeThrough = async () => {
      const [black, green] = [await pixels("#000"), await pixels("#0f0")];
      return Math.max(...green.map((value, index) => value - black[index]));
    };
    // Pause the video so the realtime backdrop stays still between the two captures.
    await page.evaluate(() => document.querySelector("[data-detail-video]").pause());
    await page.waitForTimeout(200);
    assert(await seeThrough() < 8, "the live video backdrop reaches the frame edge");
    await page.locator('[data-detail-media-step="-1"]').evaluate((button) => button.click());
    await page.waitForFunction(() => !document.querySelector(".detail-view__strip")
      && document.querySelector("[data-detail-video]").hidden);
    await page.waitForTimeout(400);
    const still = await seeThrough();
    assert(still < 8, `the still image backdrop reaches the frame edge: ${still}`);
  });
});

test("M02a media strip switches by arrow and key without resizing primary or moving related", async () => {
  await withPage("en", async (page) => {
    await page.setViewportSize(cappedViewport);
    const card = await openFixture(page, "en", { videoCover: true, direct: true, wideVideo: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.waitForTimeout(800);
    const before = await stripState(page);
    assert.equal(before.active, videoId);
    assert.deepEqual([before.steps, before.thumbs], ["10", "01"], "the video, last in the strip, shows only the previous arrow");
    assert.equal(before.glass, "true", "video with another ratio than the cover sits on the zoom blur backdrop");
    await page.locator(".detail-view__hero-frame").hover();
    await page.locator('[data-detail-media-step="-1"]').click();
    await page.waitForTimeout(100);
    const during = await stripState(page);
    assert.equal(during.related, before.related, "related cards stay put while the media slides");
    await page.waitForTimeout(500);
    const after = await stripState(page);
    assert.equal(after.active, card.mediaItems[0].id);
    assert.deepEqual([after.frame, after.related], [before.frame, before.related], "primary keeps the cover frame");
    assert.deepEqual([after.steps, after.thumbs], ["01", "10"]);
    await page.locator('[data-detail-media-step="1"]').focus();
    await page.keyboard.press("ArrowLeft");
    assert.equal((await stripState(page)).active, card.mediaItems[0].id, "left arrow key stops at the first media");
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction((id) => document.querySelector("[data-detail-view]").dataset.masonryActiveMediaId === id,
      videoId);
    assert.equal(await page.locator("[data-detail-video]").evaluate((node) => !node.paused || node.readyState < 2), true,
      "returning to the video plays it again");
  });
});

// White square buttons (primary-video-player R7): arrow, expand button, viewer button share a 36px cell; the PC seek bar is flush with the bottom of the expand
// button and stops 8px before it.
test("M02a primary arrows, expand and viewer buttons are 36px white squares and the player is one row beside expand", async () => {
  await withPage("en", async (page) => {
    const card = await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.locator(".detail-view__hero-frame").hover();
    await settleTransitions(page);
    const square = (selector) => page.locator(selector).evaluate((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return [Math.round(box.width), Math.round(box.height), style.borderRadius, style.borderTopWidth, style.backgroundColor];
    });
    const white = [36, 36, "0px", "0px", "rgb(255, 255, 255)"];
    assert.deepEqual(await square('[data-detail-media-step="-1"]'), white, "media arrow");
    assert.deepEqual(await square("[data-detail-expand]"), white, "expand button on the video");
    // Task 2 (owner 2026-10-25): play, time, seek bar, sound in one row; the row is flush with the bottom of the expand button, sound stops 8px before it.
    const edges = await page.evaluate(() => {
      const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
      const parts = ["[data-detail-play]", ".video-player__time", "[data-detail-progress]",
        "[data-detail-audio-toggle]"].map(rect);
      const expand = rect("[data-detail-expand]");
      const centre = expand.top + expand.height / 2;
      const icon = [...document.querySelectorAll("[data-detail-audio-toggle] svg")]
        .find((node) => getComputedStyle(node).display !== "none").getBoundingClientRect();
      return { centres: parts.map((box) => box.top + box.height / 2 - centre), lefts: parts.map((box) => box.left),
        gap: expand.left - icon.right };
    });
    assert(edges.centres.every((offset) => Math.abs(offset) <= 1),
      `play, time, seek bar and sound sit on one row centred with expand: ${JSON.stringify(edges)}`);
    assert(edges.lefts.every((value, index) => index === 0 || value > edges.lefts[index - 1]),
      `the row reads play, time, seek bar, sound: ${JSON.stringify(edges.lefts)}`);
    assert(Math.abs(edges.gap - 8) <= 1, `the sound icon ends 8px before expand: ${JSON.stringify(edges)}`);
    await page.locator("[data-detail-expand]").hover();
    await settleTransitions(page);
    assert.deepEqual((await square("[data-detail-expand]")).slice(0, 2), [36, 36], "hover does not widen expand");
    assert.equal(await page.locator("[data-detail-expand]").evaluate((node) => node.querySelector("span")), null,
      "expand has no text label");
    await choosePrimaryThumb(page, card.mediaItems[0].id);
    await assertPrimary(page, card, card.mediaItems[0].id, "en");
    await page.locator("[data-detail-expand]").click();
    await page.locator("[data-detail-dialog]").waitFor({ state: "visible" });
    await page.mouse.move(5, 5);
    await settleTransitions(page);
    assert.equal(await page.locator("[data-detail-zoom-reset]").count(), 0, "the viewer has no reset button");
    for (const selector of ["[data-detail-close]", "[data-detail-zoom-in]",
      "[data-detail-zoom-out]"]) {
      const [width, height, radius, border, background] = await square(selector);
      assert.deepEqual([width, height, radius, border], [36, 36, "0px", "0px"], `${selector} is a 36px square without border`);
      if (!await page.locator(selector).isDisabled()) assert.equal(background, "rgb(255, 255, 255)", `${selector} is white`);
    }
  });
});

// Expand video in the viewer (primary-video-player R8): the primary video itself enters the viewer, continuing at the exact second over the
// blur backdrop, not zoomable (owner 2026-10-25), on close it returns to the primary frame still playing.
const videoClock = (page) => page.evaluate(() => {
  const video = document.querySelector("[data-detail-video]");
  return { time: video.currentTime, at: performance.now(), paused: video.paused,
    inHost: Boolean(video.closest("[data-detail-video-host]")),
    inPrimary: Boolean(video.closest(".detail-view__hero-frame")),
    scale: new DOMMatrix(getComputedStyle(video).transform === "none" ? undefined : getComputedStyle(video).transform).a };
});
// Video seconds by the page clock: the difference from the expected seconds (previous seconds + elapsed time × playback rate).
const clockDrift = (before, after, rate) => Math.abs(after.time - before.time - (after.at - before.at) / 1000 * rate);

test("M02a expand opens the playing primary video in the blurred viewer without zoom and returns it on close", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
      && !document.querySelector("[data-detail-video]").paused);
    // Rate 0.5 so a 3s clip does not loop back to 0 mid-case; seconds only move forward.
    await page.evaluate(() => {
      const video = document.querySelector("[data-detail-video]");
      video.playbackRate = 0.5;
      video.currentTime = 1.5;
    });
    await page.waitForFunction(() => !document.querySelector("[data-detail-video]").seeking);
    const expand = page.locator("[data-detail-expand]");
    assert.equal(await expand.getAttribute("data-detail-expand-video"), "", "expand is the video expand");
    const before = await videoClock(page);
    await expand.click();
    const viewer = page.locator("[data-detail-dialog]");
    await viewer.waitFor({ state: "visible" });
    const opened = await videoClock(page);
    assert.equal(opened.inHost, true, "the primary video moves into the viewer host");
    assert.equal(opened.paused, false, "the video keeps playing");
    assert(clockDrift(before, opened, 0.5) < 0.3, `the video keeps its second: ${before.time} -> ${opened.time}`);
    assert.match(await viewer.evaluate((node) => getComputedStyle(node, "::backdrop").backdropFilter), /blur/,
      "the backdrop is blurred, not solid black");
    assert.equal(await page.locator("[data-detail-video-host] [data-detail-player]").count(), 1,
      "the player bar comes with the video");
    assert.deepEqual(await underViewer(page), { image: "hidden", background: true, live: true, glass: true },
      "under the viewer the primary frame shows the still blur of the video frame");
    await page.waitForTimeout(500);
    assert.deepEqual(await viewerMediaGate(page), { frame: false, animations: [] }, "viewer video has no wait sweep behind it");
    assert.deepEqual(await page.evaluate(() => ["zoom-in", "zoom-out"].map((hook) =>
      document.querySelector(`[data-detail-${hook}]`).getBoundingClientRect().width)), [0, 0],
    "a video in the viewer shows no zoom buttons");
    const host = await page.locator("[data-detail-video-host] video").boundingBox();
    await page.mouse.move(host.x + host.width / 2, host.y + host.height / 2);
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(400);
    assert.equal((await videoClock(page)).scale, 1, "the wheel does not zoom a video");
    const beforeClose = await videoClock(page);
    await page.locator("[data-detail-close]").click();
    await viewer.waitFor({ state: "hidden" });
    await page.waitForTimeout(200);
    const closed = await videoClock(page);
    assert.deepEqual([closed.inPrimary, closed.inHost, closed.paused], [true, false, false],
      "closing puts the playing video back in primary");
    assert(closed.time >= beforeClose.time && clockDrift(beforeClose, closed, 0.5) < 0.3,
      `the second does not go back: ${beforeClose.time} -> ${closed.time}`);
  });
});

test("M02a touch primary video shows the expand button and a tap on the video pauses without opening the viewer", async () => {
  await withPage("vi", async (page) => {
    await openFixture(page, "vi", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
      && !document.querySelector("[data-detail-video]").paused);
    const box = await page.locator("[data-detail-expand]").boundingBox();
    assert(box && box.width >= 36 && box.height >= 36, `expand is visible on a touch video: ${JSON.stringify(box)}`);
    await page.locator("[data-detail-play-surface]").tap();
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => document.querySelector("[data-detail-video]").paused), true,
      "tapping the video pauses it");
    assert.equal(await page.locator("[data-detail-dialog]").evaluate((node) => node.open), false,
      "tapping the video does not open the viewer");
    // Touch screens hide the viewer button and viewer thumbnail row from sight, still available to screen readers (viewer R8).
    await page.locator("[data-detail-expand]").tap();
    await page.waitForFunction(() => document.querySelector("[data-detail-dialog]").dataset.viewerState
      === "open");
    assert.deepEqual(await page.locator("[data-detail-viewer-thumbs]").evaluate((node) =>
      [node.getBoundingClientRect().width <= 1, node.querySelectorAll("button").length > 1]), [true, true],
      "the viewer strip is hidden from sight on touch screens but its buttons stay for screen readers");
  });
});

// The thumbnail row under the viewer replaces the two arrows (R8, owner 2026-10-25): change the card media with a sliding strip; video goes to primary,
// on close primary stays at the media just viewed.
test("M02a viewer thumbnails slide from the video to the image and closing keeps primary on that image", async () => {
  await withPage("en", async (page) => {
    const card = await openFixture(page, "en", { videoCover: true, direct: true });
    const image = card.mediaItems[0];
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
      && document.querySelector("[data-detail-video]").readyState >= 2);
    await page.locator("[data-detail-expand]").click();
    await page.locator("[data-detail-dialog]").waitFor({ state: "visible" });
    assert.equal(await page.locator("[data-detail-viewer-step]").count(), 0, "the viewer has no arrows");
    const current = () => page.$$eval("[data-detail-viewer-select]",
      (nodes) => nodes.map((node) => `${node.dataset.detailViewerSelect}:${node.getAttribute("aria-current")}`));
    assert.deepEqual(await current(), card.mediaItems.map(({ id }) => `${id}:${id === videoId}`),
      "the viewer strip lists every media of the card and marks the video");
    const strip = await page.locator("[data-detail-viewer-thumbs]").boundingBox();
    const viewport = page.viewportSize();
    assert(strip && strip.y + strip.height <= viewport.height && strip.y > viewport.height / 2,
      `the strip sits at the bottom of the viewer: ${JSON.stringify(strip)}`);
    const ghost = await page.evaluate((id) => {
      document.querySelector(`[data-detail-viewer-select="${id}"]`).click();
      return Boolean(document.querySelector("[data-detail-dialog] .detail-dialog__ghost"));
    }, image.id);
    assert.equal(ghost, true, "a sliding layer carries the old media out");
    await page.waitForFunction(() => !document.querySelector(".detail-dialog__ghost"), null, { timeout: 5_000 });
    const state = await page.evaluate(() => {
      const expanded = document.querySelector("[data-detail-expanded-image]");
      const video = document.querySelector("[data-detail-video]");
      return { src: expanded.currentSrc || expanded.src, hidden: expanded.hidden,
        videoInPrimary: Boolean(video.closest(".detail-view__hero-frame")) };
    });
    assert.equal(mediaPath(state.src), image.src, "the viewer shows the image");
    assert.deepEqual([state.hidden, state.videoInPrimary], [false, true], "the image shows and the video is back in primary");
    assert.deepEqual(await current(), card.mediaItems.map(({ id }) => `${id}:${id === image.id}`),
      "the strip marks the image now on screen");
    await page.locator("[data-detail-close]").click();
    await page.locator("[data-detail-dialog]").waitFor({ state: "hidden" });
    assert.equal(await page.locator("[data-detail-view]").getAttribute("data-masonry-active-media-id"),
      image.id, "primary stays on the media seen in the viewer");
  });
});

// The viewer thumbnail row auto-hides when the mouse is still for 3s, moving the mouse shows it; the left/right arrows change media like clicking a thumbnail
// (owner 2026-10-26).
test("M02a viewer strip hides while the mouse rests and arrow keys step the media", async () => {
  await withPage("en", async (page) => {
    const card = await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
      && document.querySelector("[data-detail-video]").readyState >= 2);
    await page.locator("[data-detail-expand]").click();
    await page.waitForFunction(() => document.querySelector("[data-detail-dialog]").dataset.viewerState
      === "open");
    const opacity = () => page.locator("[data-detail-viewer-thumbs]")
      .evaluate((node) => Number(getComputedStyle(node).opacity));
    assert.equal(await opacity(), 1, "the strip shows when the viewer opens");
    // The `data-viewer-idle` state signal is set by the runtime 3s timer; wait for it then wait for the fade to finish.
    const idle = (expected) => page.waitForFunction((expected) => document.querySelector("[data-detail-viewer-thumbs]")
      .hasAttribute("data-viewer-idle") === expected, expected, { timeout: 10_000 });
    await idle(true);
    await settleTransitions(page);
    assert.equal(await opacity(), 0, "the strip hides once the mouse rests for 3s");
    await page.mouse.move(200, 200);
    await page.mouse.move(220, 220);
    await idle(false);
    await settleTransitions(page);
    assert.equal(await opacity(), 1, "moving the mouse shows the strip again");
    const index = card.mediaItems.findIndex(({ id }) => id === videoId);
    const [key, target] = index > 0 ? ["ArrowLeft", card.mediaItems[index - 1]] : ["ArrowRight", card.mediaItems[index + 1]];
    await page.keyboard.press(key);
    await page.waitForFunction((id) => document.querySelector(`[data-detail-viewer-select="${id}"]`)
      .getAttribute("aria-current") === "true", target.id, { timeout: 5_000 });
    assert.equal(await page.locator("[data-detail-view]").getAttribute("data-masonry-active-media-id"),
      target.id, "the arrow key steps primary and viewer to the next media");
  });
});

// Switching from video to video (task 3, owner 2026-10-25): while the strip slides, the time, total and seek bar stay on the old video; the new video
// switches the time and total to the new video only once it starts playing (`playing`). Applies to the primary strip and the viewer.
const sampleVideoSwitch = (page, selector) => page.evaluate(async (selector) => {
  const video = document.querySelector("[data-detail-video]");
  const player = document.querySelector("[data-detail-player]");
  const read = () => ({ time: player.querySelector(".video-player__time").textContent.replace(/\s+/g, " ").trim(),
    progress: Number(player.querySelector("[data-detail-progress]").value) });
  const before = read();
  let started = false;
  // The old playing video does not fire `playing` again; only the new video fires it after the source changes.
  video.addEventListener("playing", () => { started = true; }, { once: true });
  document.querySelector(selector).click();
  const held = [];
  const deadline = performance.now() + 5_000;
  while (!started && performance.now() < deadline) {
    held.push(read());
    await new Promise(requestAnimationFrame);
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { before, held, started, after: read() };
}, selector);

test("M02a switching between two videos holds the old time until the new video plays, in primary and viewer", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true, twoVideos: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
      && !document.querySelector("[data-detail-video]").paused);
    await page.waitForTimeout(500);
    const primary = await sampleVideoSwitch(page, '[data-detail-media-step="1"]');
    assert(primary.started && primary.held.length > 2, `the new video plays after the strip: ${JSON.stringify(primary)}`);
    assert.match(primary.before.time, /\/ 0:03$/, "the first video shows its own total");
    assert(primary.held.every((sample) => sample.time === primary.before.time && sample.progress === primary.before.progress),
      `the time and seek bar stand still on the old video during the strip: ${JSON.stringify(primary)}`);
    assert.match(primary.after.time, /\/ 0:04$/, `the new video shows its total once it plays: ${primary.after.time}`);

    await page.locator("[data-detail-expand]").click();
    await page.waitForFunction(() => document.querySelector("[data-detail-dialog]").dataset.viewerState
      === "open");
    const viewer = await sampleVideoSwitch(page,
      `[data-detail-viewer-select="${videoId}"]`);
    assert(viewer.started && viewer.held.length > 0, `the viewer video plays after the switch: ${JSON.stringify(viewer)}`);
    assert(viewer.held.every((sample) => sample.time === viewer.before.time && sample.progress === viewer.before.progress),
      `the viewer keeps the old time until the new video plays: ${JSON.stringify(viewer)}`);
    assert.match(viewer.after.time, /\/ 0:03$/, `the viewer shows the new total once it plays: ${viewer.after.time}`);
  });
});

// Thumbnail row on one line, description scrolls (owner 2026-10-24): while content remains the edge fades to white; the description scrollbar shows only on
// hover, is draggable, text is justified; touch has no scrollbar.
const scrollHints = (page) => page.evaluate(() => {
  const strip = document.querySelector("[data-detail-media-thumbs]");
  const scroll = document.querySelector("[data-detail-description-scroll]");
  const bar = document.querySelector("[data-detail-description-bar]");
  const active = strip.querySelector('[aria-current="true"]').getBoundingClientRect();
  const box = strip.getBoundingClientRect();
  return {
    rows: new Set([...strip.children].map((node) => node.offsetTop)).size,
    wholeThumbs: (strip.clientWidth + 8) % 68 === 0,
    strip: [strip.hasAttribute("data-fade-start"), strip.hasAttribute("data-fade-end")],
    activeClear: active.left >= box.left + (strip.hasAttribute("data-fade-start") ? 60 : 0) - 1
      && active.right <= box.right - (strip.hasAttribute("data-fade-end") ? 60 : 0) + 1,
    overflow: scroll.scrollHeight > scroll.clientHeight + 1,
    description: [scroll.hasAttribute("data-fade-start"), scroll.hasAttribute("data-fade-end")],
    scrollTop: scroll.scrollTop,
    bar: { hidden: bar.hidden, display: getComputedStyle(bar).display, opacity: getComputedStyle(bar).opacity },
    align: getComputedStyle(document.querySelector("[data-detail-description]")).textAlign,
  };
});

test("M02a crowded primary keeps one thumbnail row and scrolls the description behind a hover scrollbar", async () => {
  await withPage("en", async (page) => {
    const card = await openFixture(page, "en", { direct: true, crowded: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
    let state = await scrollHints(page);
    assert.deepEqual([state.rows, state.wholeThumbs, state.strip], [1, true, [false, true]],
      `one row of whole thumbnails, the last one fading: ${JSON.stringify(state)}`);
    assert.deepEqual([state.overflow, state.description, state.align], [true, [false, true], "start"],
      `long description scrolls, its last line fades, text left aligned: ${JSON.stringify(state)}`);
    assert.deepEqual([state.bar.hidden, state.bar.opacity], [false, "0"], "scrollbar waits for hover");
    const description = await page.locator("[data-detail-description-scroll]").boundingBox();
    await page.mouse.move(description.x + description.width / 2, description.y + description.height / 2);
    await page.waitForFunction(() => getComputedStyle(document.querySelector("[data-detail-description-bar]")).opacity === "1");
    // Wheel and End within a description that still has text scroll only the description, Locomotive does not scroll the page along.
    const primaryTop = () => page.locator("[data-detail-primary]").evaluate((node) => node.getBoundingClientRect().top);
    const topBefore = await primaryTop();
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(600);
    await page.locator("[data-detail-description-scroll]").focus();
    await page.keyboard.press("End");
    await page.waitForTimeout(600);
    state = await scrollHints(page);
    assert(state.scrollTop > 0 && Math.abs(await primaryTop() - topBefore) <= 1,
      `wheel and End scroll the description, not the page: ${JSON.stringify(state)}`);
    await page.locator("[data-detail-description-scroll]").evaluate((node) => { node.scrollTop = 0; node.blur(); });
    const bar = await page.locator("[data-detail-description-bar]").boundingBox();
    await page.mouse.move(bar.x + bar.width / 2, bar.y + 8);
    await page.mouse.down();
    await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height, { steps: 6 });
    await page.mouse.up();
    state = await scrollHints(page);
    assert(state.scrollTop > 0, "dragging the scrollbar scrolls the description");
    assert.deepEqual(state.description, [true, false], "at the end only the first line fades");
    await page.mouse.move(5, 5);
    await page.waitForFunction(() => getComputedStyle(document.querySelector("[data-detail-description-bar]")).opacity === "0");
    await page.locator(".detail-view__hero-frame").hover();
    for (let step = 1; step < card.mediaItems.length; step += 1) {
      await page.locator('[data-detail-media-step="1"]').click();
      await page.waitForTimeout(150);
    }
    await page.waitForFunction((id) => document.querySelector("[data-detail-view]").dataset.masonryActiveMediaId === id,
      card.mediaItems.at(-1).id);
    await page.waitForTimeout(600);
    state = await scrollHints(page);
    assert.deepEqual([state.strip, state.activeClear], [[true, false], true], "the strip follows the active thumbnail to its end");
  });
  await withPage("vi", async (page) => {
    await openFixture(page, "vi", { direct: true, crowded: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.waitForTimeout(300);
    const state = await scrollHints(page);
    assert.deepEqual([state.rows, state.description, state.bar.display], [1, [false, true], "none"],
      "touch keeps the row and the fade but has no scrollbar");
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
    const video = page.locator("[data-detail-video]");
    await video.evaluate((node) => node.play());
    await page.evaluate(() => window.TruongThinhMasonry.unmount());
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
      await page.locator("[data-detail-view]").waitFor({ state: "visible" });
      await assertPrimary(page, card, coverId, locale);
      assert.equal(new URL(page.url()).searchParams.has("media"), false);
    });
  });
}

// "Vừa xem" (media-card): text has shadow D; the 0.7 black layer shows only when the card media is ready, so a card still faded waiting for its image
// (data-masonry-media-loading) has a transparent background, removing the attribute returns it to 0.7 (spec wait-for-image S3).
test("M02a Just viewed label keeps its text shadow and the black layer waits for the card media", async () => {
  await withPage("vi", async (page) => {
    await openFixture(page, "vi");
    const state = await page.evaluate(async (id) => {
      const card = document.querySelector(`[data-masonry-card="${id}"]`);
      const media = card.querySelector(".card-media");
      const marker = document.createElement("span");
      marker.className = "card-media__just-viewed";
      marker.dataset.masonryJustViewed = "";
      marker.textContent = "Vừa xem";
      media.append(marker);
      const read = () => ({ background: getComputedStyle(marker).backgroundColor, shadow: getComputedStyle(marker).textShadow });
      const settle = () => Promise.all(marker.getAnimations().map(({ finished }) => finished)).then(() => new Promise((resolve) => setTimeout(resolve, 700)));
      card.dataset.masonryMediaLoading = "";
      await settle();
      const loading = read();
      delete card.dataset.masonryMediaLoading;
      await settle();
      return { loading, ready: read() };
    }, cardId);
    const two = "rgba(0, 0, 0, 0.5) 0px 0px 2px, rgba(0, 0, 0, 0.4) 0px 0px 12px";
    assert.deepEqual(state, {
      loading: { background: "rgba(0, 0, 0, 0)", shadow: two },
      ready: { background: "rgba(0, 0, 0, 0.7)", shadow: two },
    });
  });
});
