import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
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

function fixtureArtifact(videoCover = false, { singleton = false, relatedMedia = false, hasAudio = true, wideVideo = false } = {}) {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  assert.equal(artifact.cards.length, 200, "fixture retains all legacy cards");
  const card = artifact.cards.find((item) => item.id === cardId);
  assert(card && card.mediaItems.length === 1 && card.media.width * 2 === card.media.height * 3);
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
  singleton = false, relatedMedia = false, hasAudio = true, wideVideo = false } = {}) {
  const { artifact, card, related } = fixtureArtifact(videoCover, { singleton, relatedMedia, hasAudio, wideVideo });
  await page.route(`**${fixturePrefix}*`, async (route) => {
    if (!route.request().url().endsWith(".mp4")) return route.fulfill({ path: poster, contentType: "image/webp" });
    // Trả 206 theo Range để Chrome coi clip là seekable, thanh tua mới đổi được currentTime.
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
  await page.waitForURL((url) => url.searchParams.get("photo") === expectedId);
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

// Player primary theo trang pin Pinterest: không controls gốc, video lặp, bấm video phát/dừng, thanh dưới hiện khi
// hover hoặc đang dừng, thanh tua, thời gian, thanh âm lượng mở khi trỏ vào cụm tiếng.
const playerState = (page) => page.evaluate(() => {
  const player = document.querySelector("[data-advertising-photo-player]");
  const video = document.querySelector("[data-advertising-photo-video]");
  const opacity = (selector) => Number(getComputedStyle(player.querySelector(selector)).opacity);
  return { hidden: player.hidden, controls: video.controls, loop: video.loop, paused: video.paused,
    muted: video.muted, volume: video.volume, currentTime: video.currentTime,
    bar: opacity(".advertising-video-player__bar"), center: opacity("[data-advertising-photo-play-surface] svg"),
    playLabel: player.querySelector("[data-advertising-photo-play]").getAttribute("aria-label"),
    time: player.querySelector(".advertising-video-player__time").textContent.replace(/\s+/g, " ").trim(),
    progress: Number(player.querySelector("[data-advertising-photo-progress]").value),
    volumeOpen: getComputedStyle(player.querySelector(".advertising-video-player__volume-pop")).visibility === "visible",
    volumeBox: (({ width, height }) => [Math.round(width), Math.round(height)])(
      player.querySelector("[data-advertising-photo-volume]").getBoundingClientRect()),
    volumeValue: Number(player.querySelector("[data-advertising-photo-volume]").value) };
});

test("M02a primary video player: surface toggles playback, bar shows on hover or pause, seek and time", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    // Màn chuyển route phủ trang lúc vào; chờ nó hết để hover chạm tới player.
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
      && !document.querySelector("[data-advertising-photo-video]").paused);
    const frame = page.locator(".advertising-photo-view__hero-frame");
    const box = await frame.boundingBox();
    await page.mouse.move(box.x + box.width + 40, box.y + 10);
    await page.waitForTimeout(300);
    let state = await playerState(page);
    assert.equal(state.controls, false, "no native controls");
    assert.equal(state.loop, true, "video loops like the Pinterest closeup");
    assert.equal(state.bar, 0, "bar hidden while playing without hover");
    assert.equal(state.center, 0, "center play icon hidden while playing");
    assert.equal(state.playLabel, "Pause");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
    await page.waitForTimeout(300);
    assert.equal((await playerState(page)).bar, 1, "hover shows the bar");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 3);
    await page.mouse.move(box.x + box.width + 40, box.y + 10);
    await page.waitForTimeout(300);
    state = await playerState(page);
    assert.equal(state.paused, true, "clicking the video pauses it");
    assert.deepEqual([state.bar, state.center, state.playLabel], [1, 1, "Play"], "paused keeps bar and center icon");
    assert.match(state.time, /^0:0\d \/ 0:03$/, `time shows current / total: ${state.time}`);
    const progress = page.locator("[data-advertising-photo-progress]");
    const track = await progress.boundingBox();
    await page.mouse.click(track.x + track.width * 0.5, track.y + track.height / 2);
    state = await playerState(page);
    assert(Math.abs(state.currentTime - 1.5) < 0.3, `clicking the middle of the bar seeks: ${state.currentTime}`);
    await progress.press("ArrowLeft");
    assert((await playerState(page)).currentTime < state.currentTime, "arrow key seeks backwards");
    await page.locator("[data-advertising-photo-play]").click();
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-video]").paused);
    assert.equal((await playerState(page)).playLabel, "Pause");
  });
});

test("M02a primary vertical volume slider opens above the sound button and keeps the last volume", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    const frame = await page.locator(".advertising-photo-view__hero-frame").boundingBox();
    await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 3);
    assert.equal((await playerState(page)).volumeOpen, false, "slider hidden until the sound group is hovered");
    await page.locator("[data-advertising-photo-audio-toggle]").hover();
    await page.waitForTimeout(300);
    let state = await playerState(page);
    assert.equal(state.volumeOpen, true, "hovering the sound button opens the slider");
    assert(state.volumeBox[1] > state.volumeBox[0] * 3, `slider stands vertical: ${state.volumeBox}`);
    assert.equal(state.volumeValue, 0, "muted video shows the slider at zero");
    const volume = page.locator("[data-advertising-photo-volume]");
    await volume.fill("0.4");
    state = await playerState(page);
    assert.deepEqual([state.muted, state.volume], [false, 0.4], "slider sets volume and unmutes");
    await volume.fill("0");
    state = await playerState(page);
    assert.deepEqual([state.muted, state.volumeValue], [true, 0], "slider at zero mutes");
    await page.locator("[data-advertising-photo-audio-toggle]").click();
    state = await playerState(page);
    assert.deepEqual([state.muted, state.volume, state.volumeValue], [false, 0.4, 0.4],
      "sound button restores the last volume");
    assert.equal(await page.locator("[data-advertising-photo-audio-toggle]").getAttribute("aria-label"), "Mute");
  });
});

test("M02a touch primary video keeps the bar visible", async () => {
  await withPage("vi", async (page) => {
    await openFixture(page, "vi", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-video]").paused);
    const state = await playerState(page);
    assert.deepEqual([state.bar, state.playLabel], [1, "Tạm dừng"]);
    await page.locator("[data-advertising-photo-play-surface]").tap();
    assert.equal((await playerState(page)).paused, true, "tapping the video pauses it");
  });
});

// Dải media theo pin Pinterest: khung giữ tỷ lệ cover nên đổi media không đổi kích thước primary, related đứng yên;
// mũi tên và chấm theo vị trí, media khác tỷ lệ có nền zoom blur, video có toàn màn hình nền đen.
const stripState = (page) => page.evaluate(() => {
  const view = document.querySelector("[data-advertising-photo-view]");
  const frame = view.querySelector(".advertising-photo-view__hero-frame").getBoundingClientRect();
  return { active: view.dataset.advertisingActiveMediaId, glass: view.dataset.advertisingPhotoGlass,
    frame: [frame.width, frame.height].map(Math.round).join("x"),
    related: [...view.querySelectorAll("[data-advertising-photo-related-grid] > *")].slice(0, 6)
      .map((node) => (({ x, y }) => `${Math.round(x)},${Math.round(y)}`)(node.getBoundingClientRect())).join(" "),
    steps: [...view.querySelectorAll("[data-advertising-photo-media-step]")].map((node) => node.hidden ? 0 : 1).join(""),
    dots: [...view.querySelectorAll("[data-advertising-photo-media-dots] > span")].map((dot) => dot.hasAttribute("data-active") ? 1 : 0).join("") };
});

test("M02a media strip switches by arrow and key without resizing primary or moving related", async () => {
  await withPage("en", async (page) => {
    const card = await openFixture(page, "en", { videoCover: true, direct: true, wideVideo: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.waitForTimeout(800);
    const before = await stripState(page);
    assert.equal(before.active, videoId);
    assert.deepEqual([before.steps, before.dots], ["10", "01"], "the video, last in the strip, shows only the previous arrow");
    assert.equal(before.glass, "true", "video with another ratio than the cover sits on the zoom blur backdrop");
    await page.locator(".advertising-photo-view__hero-frame").hover();
    await page.locator('[data-advertising-photo-media-step="-1"]').click();
    await page.waitForTimeout(100);
    const during = await stripState(page);
    assert.equal(during.related, before.related, "related cards stay put while the media slides");
    await page.waitForTimeout(500);
    const after = await stripState(page);
    assert.equal(after.active, card.mediaItems[0].id);
    assert.deepEqual([after.frame, after.related], [before.frame, before.related], "primary keeps the cover frame");
    assert.deepEqual([after.steps, after.dots], ["01", "10"]);
    await page.locator('[data-advertising-photo-media-step="1"]').focus();
    await page.keyboard.press("ArrowLeft");
    assert.equal((await stripState(page)).active, card.mediaItems[0].id, "left arrow key stops at the first media");
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction((id) => document.querySelector("[data-advertising-photo-view]").dataset.advertisingActiveMediaId === id,
      videoId);
    assert.equal(await page.locator("[data-advertising-photo-video]").evaluate((node) => !node.paused || node.readyState < 2), true,
      "returning to the video plays it again");
  });
});

test("M02a primary video full screen uses a black frame without the blur backdrop", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true, wideVideo: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.locator(".advertising-photo-view__hero-frame").hover();
    const button = page.locator("[data-advertising-photo-fullscreen]");
    assert.equal(await button.getAttribute("aria-label"), "Full screen");
    await button.click();
    await page.waitForFunction(() => document.fullscreenElement?.classList.contains("advertising-photo-view__hero-frame"));
    const state = await page.evaluate(() => {
      const frame = document.fullscreenElement;
      return { background: getComputedStyle(frame).backgroundColor,
        blur: getComputedStyle(frame.querySelector("[data-advertising-photo-background]")).display,
        label: frame.querySelector("[data-advertising-photo-fullscreen]").getAttribute("aria-label") };
    });
    assert.deepEqual(state, { background: "rgb(0, 0, 0)", blur: "none", label: "Exit full screen" });
    await button.click();
    await page.waitForFunction(() => !document.fullscreenElement);
    assert.equal(await button.getAttribute("aria-label"), "Full screen");
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
