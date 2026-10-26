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
  assert.equal(artifact.cards.length, 270, "fixture retains all legacy cards");
  const card = artifact.cards.find((item) => item.id === cardId);
  assert(card && card.media.width * 2 === card.media.height * 3);
  // Chỉ giữ ảnh legacy làm cover, để fixture không phụ thuộc media tạm (có thể thêm ảnh, video, đặt video làm cover).
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
  // Video thứ hai khác nguồn và khác tổng thời lượng, để đổi giữa hai video thấy được giờ của video nào đang hiện.
  if (twoVideos) {
    card.mediaItems.push({ ...card.mediaItems[1], id: `${videoId}-2`, src: `${fixturePrefix}clip-audio-3x2-b.mp4`,
      durationSeconds: 4 });
  }
  // Nhiều media hơn một dòng thumbnail và mô tả dài hơn vùng mô tả, để dãy và mô tả phải cuộn.
  if (crowded) {
    card.mediaItems.push(...Array.from({ length: 6 }, (_, index) => ({ ...card.mediaItems[0], id: `${cardId}-extra-${index}` })));
    // Artifact chỉ giữ phần grid (static-release R1), mô tả nằm ở catalog-detail.
    card.descriptionVi = card.descriptionEn = Array(8).fill(ADVERTISING_CATALOG_DETAIL[cardId].descriptionEn).join(" ");
  }
  if (singleton) {
    card.mediaItems = [card.mediaItems[1]];
    card.coverMediaId = videoId;
  }
  const related = artifact.cards.filter((item) => item.category === card.category && item.id !== card.id);
  // Related chỉ giữ ảnh legacy cộng một ảnh thay thế, để card luôn có chấm: media tạm có card 5 item, thêm một là
  // 6 item thành bộ đếm, không còn chấm để chọn.
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
  return /^\/assets\/content\/.+\.avif$|-(?:240|480|960)\.(?:avif|webp)$/.test(pathname)
    ? pathname.replace(/(?:-(?:240|480|960))?\.(?:avif|webp)$/, ".webp")
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
        const path = new URL(node.currentSrc || node.src, location.href).pathname.replace(/(?:-(?:240|480|960))?\.(?:avif|webp)$/, ".webp");
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
  // Nút mở lớn hiện cả với video (primary-video-player R8).
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
    await page.locator("[data-advertising-photo-expand]").click();
    const viewer = page.locator("[data-advertising-photo-dialog]");
    await viewer.waitFor({ state: "visible" });
    const image = await viewer.locator("[data-advertising-photo-expanded-image]").evaluate((node) => ({
      src: node.currentSrc || node.src, alt: node.alt,
    }));
    assert.equal(mediaPath(image.src), card.mediaItems[0].src);
    assert.equal(image.alt, card.mediaItems[0].altEn);
    assert.deepEqual(await viewerMediaGate(page), { frame: false, animations: [] }, "viewer image has no wait sweep or fade-in");
  });
});

// Viewer thuộc Advertising nên không có vệt sáng hay fade-in của khung chờ ảnh nội dung (loading-glass R5).
const viewerMediaGate = (page) => page.evaluate(() => ({
  frame: document.querySelector(".advertising-photo-dialog__viewport").classList.contains("media-frame"),
  animations: document.getAnimations().map(({ animationName }) => animationName).filter((name) => /^media-/.test(name)),
}));

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
    bar: opacity(".advertising-video-player__bar"),
    // Không có nút phát giữa video, kể cả khi dừng (primary-video-player R1, R9; owner 2026-10-25).
    centerIcons: player.querySelectorAll("[data-advertising-photo-play-surface] svg").length,
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
    // Nút mở lớn nằm ngoài player nên vẫn hiện khi cụm player mờ đi (R9).
    assert.deepEqual(await page.locator("[data-advertising-photo-expand]").evaluate((node) =>
      [node.hidden, getComputedStyle(node).opacity]), [false, "1"], "expand stays visible while the bar hides");
    assert.equal(state.centerIcons, 0, "no center play icon");
    assert.equal(state.playLabel, "Pause");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
    await page.waitForTimeout(300);
    assert.equal((await playerState(page)).bar, 1, "hover shows the bar");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 3);
    await page.mouse.move(box.x + box.width + 40, box.y + 10);
    await page.waitForTimeout(300);
    state = await playerState(page);
    assert.equal(state.paused, true, "clicking the video pauses it");
    assert.deepEqual([state.bar, state.centerIcons, state.playLabel], [1, 0, "Play"],
      "paused keeps the bar and shows no center icon");
    assert.match(state.time, /^0:0\d \/ 0:03$/, `time shows current / total: ${state.time}`);
    const progress = page.locator("[data-advertising-photo-progress]");
    const track = await progress.boundingBox();
    await page.mouse.click(track.x + track.width * 0.5, track.y + track.height / 2);
    state = await playerState(page);
    assert(Math.abs(state.currentTime - 1.5) < 0.3, `clicking the middle of the bar seeks: ${state.currentTime}`);
    await progress.press("ArrowLeft");
    assert((await playerState(page)).currentTime < state.currentTime, "arrow key seeks backwards");
    await page.locator("[data-advertising-photo-play]").click();
    // `paused` đổi ngay khi gọi play(), nhãn chỉ đổi ở sự kiện `play` sau đó: chờ nhãn, không đọc một lần.
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-video]").paused
      && document.querySelector("[data-advertising-photo-play]").getAttribute("aria-label") === "Pause");
    // Bấm chuột để focus lại trên nút nhưng không phải focus bàn phím: chuột rời khung thì cụm vẫn ẩn (R9).
    await page.mouse.move(box.x + box.width + 40, box.y + 10);
    await page.waitForTimeout(300);
    assert.equal((await playerState(page)).bar, 0, "a mouse click leaves no keyboard focus, so the bar hides again");
  });
});

// Nạp lại nguồn lúc đang phát làm video dừng mà không bắn `pause` (chỉ `abort`, `emptied`); player vẫn phải đổi sang
// trạng thái dừng: thanh hiện, nút phát trên thanh (primary-video-player R9).
test("M02a primary shows the paused bar when a source reload stops the video", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-video]").paused);
    await page.mouse.move(1, 1);
    await page.waitForTimeout(300);
    assert.equal((await playerState(page)).bar, 0, "bar hidden while playing without hover");
    await page.evaluate(() => {
      const video = document.querySelector("[data-advertising-photo-video]");
      video.src = video.currentSrc;
    });
    await page.waitForFunction(() => getComputedStyle(document.querySelector(".advertising-video-player__bar")).opacity === "1",
      null, { timeout: 2_000 }).catch(() => {});
    const state = await playerState(page);
    assert.deepEqual([state.paused, state.bar, state.playLabel], [true, 1, "Play"],
      `the stopped video shows the bar with the play button: ${JSON.stringify(state)}`);
  });
});

// Kéo tua (primary-video-player R2): video dừng khi kéo, khung theo núm, mỗi lần một lệnh tua; ngoài đoạn đã tải thì
// giữ frame, thả tay mới tua; thả tay thì phát tiếp nếu trước đó đang phát.
async function dragProgress(page, from, to, { buffered = null, during } = {}) {
  await page.evaluate((end) => {
    const video = document.querySelector("[data-advertising-photo-video]");
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
  const track = await page.locator("[data-advertising-photo-progress]").boundingBox();
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
      && !document.querySelector("[data-advertising-photo-video]").paused);
    const frame = await page.locator(".advertising-photo-view__hero-frame").boundingBox();
    await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 3);
    await dragProgress(page, 0.2, 0.8, { during: (state, audit) => {
      assert.equal(state.paused, true, "video pauses while the thumb is held");
      assert.equal(state.playLabel, "Pause", "a playing video keeps its pause label while scrubbing");
      assert(Math.abs(state.currentTime - state.progress) < 0.15, `frame follows the thumb: ${state.currentTime} vs ${state.progress}`);
      assert(audit.seeks >= 3, `frames change during the drag: ${audit.seeks} seeks`);
      assert.equal(audit.overlaps, 0, "a new seek waits for the previous seeked");
    } });
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-video]").paused);
    const state = await playerState(page);
    assert(state.currentTime >= 2.2, `release resumes from the thumb: ${state.currentTime}`);
  });
});

test("M02a primary scrub past the buffered range holds the frame and seeks on release", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
      && !document.querySelector("[data-advertising-photo-video]").paused);
    const frame = await page.locator(".advertising-photo-view__hero-frame").boundingBox();
    await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 3);
    await dragProgress(page, 0.1, 0.8, { buffered: 1.2, during: (state) => {
      assert(state.progress > 2.2, `thumb follows the hand: ${state.progress}`);
      assert(state.currentTime <= 1.2 + 1e-6, `frame holds inside the buffered range: ${state.currentTime}`);
      assert.match(state.time, /^0:02 \/ 0:03$/, `time shows the thumb: ${state.time}`);
    } });
    await page.waitForFunction(() => {
      const video = document.querySelector("[data-advertising-photo-video]");
      return !video.paused && video.currentTime > 2.2;
    });
  });
});

// Bóng hai lớp D (primary-video-player R4) và núm đặc (R5): thanh không còn dải gradient, icon, nút phát, thanh tua có
// drop-shadow hai lớp, giờ và chữ nút gợi ý chưa chọn có text-shadow hai lớp.
test("M02a primary player and suggestion text carry the two-layer shadow and solid thumbs", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    const two = "rgba(0, 0, 0, 0.5) 0px 0px 2px, rgba(0, 0, 0, 0.4) 0px 0px 12px";
    const drop = "drop-shadow(rgba(0, 0, 0, 0.5) 0px 0px 2px) drop-shadow(rgba(0, 0, 0, 0.4) 0px 0px 12px)";
    const read = () => page.evaluate(() => {
      const style = (selector, pseudo) => getComputedStyle(document.querySelector(selector), pseudo);
      const label = (pressed) => [...document.querySelectorAll(".advertising-photo-view__suggestion-link")]
        .filter((link) => (link.getAttribute("aria-pressed") === "true") === pressed)
        .map((link) => [getComputedStyle(link.querySelector(".advertising-photo-view__suggestion-label")).textShadow,
          getComputedStyle(link, "::after").backgroundColor]);
      // getComputedStyle không đọc được ::-webkit-slider-thumb, nên đọc rule trong stylesheet.
      const thumbs = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules])
        .filter((rule) => rule.selectorText?.includes("advertising-video-player__range::-webkit-slider-thumb") && rule.style.backgroundColor)
        .map((rule) => rule.style.backgroundColor);
      return { bar: style(".advertising-video-player__bar").backgroundImage, time: style(".advertising-video-player__time").textShadow,
        filters: [".advertising-video-player__button svg", ".advertising-video-player__progress"]
          .map((selector) => style(selector).filter),
        idle: label(false), pressed: label(true), thumbs };
    });
    let state = await read();
    assert.equal(state.bar, "none", "the bar has no gradient band");
    assert.equal(state.time, two, "time carries the two-layer text shadow");
    assert.deepEqual(state.filters, [drop, drop], "bar icons and seek bar carry the two-layer drop shadow");
    assert.deepEqual(state.thumbs, ["rgb(251, 251, 249)"], "seek and volume thumbs are solid");
    assert(state.idle.length > 0, "the fixture shows suggestion buttons");
    assert(state.idle.every(([shadow, layer]) => shadow === two && layer !== "rgba(0, 0, 0, 0)"),
      `unselected suggestions keep their dark layer and gain the shadow: ${JSON.stringify(state.idle)}`);
    await page.locator(".advertising-photo-view__suggestion-link").first().click();
    await page.waitForFunction(() => document.querySelector(".advertising-photo-view__suggestion-link[aria-pressed='true']"));
    state = await read();
    assert(state.pressed.length > 0 && state.pressed.every(([shadow]) => shadow === "none"), "the selected suggestion has no shadow");
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
    // Kéo thanh bằng chuột rồi rời cụm tiếng: cột thu lại (trước đây focus của thanh giữ cột mở mãi); bàn phím vẫn mở được.
    await page.locator("[data-advertising-photo-audio-toggle]").hover();
    const slider = await volume.boundingBox();
    await page.mouse.move(slider.x + slider.width / 2, slider.y + slider.height * 0.8);
    await page.mouse.down();
    await page.mouse.move(slider.x + slider.width / 2, slider.y + slider.height * 0.3, { steps: 6 });
    await page.mouse.up();
    await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 3);
    await page.waitForTimeout(300);
    assert.equal((await playerState(page)).volumeOpen, false, "leaving after a mouse drag collapses the slider");
    // Thứ tự Tab theo hàng: phát, thanh tua, nút tiếng (owner 2026-10-25).
    await page.locator("[data-advertising-photo-play]").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    // Thanh trượt nằm trước nút tiếng và chỉ focus được khi cột đã mở (transition 150ms).
    await page.waitForTimeout(300);
    await page.keyboard.press("Shift+Tab");
    await page.waitForTimeout(300);
    assert.equal(await volume.evaluate((node) => node === document.activeElement), true, "Tab, Shift+Tab reaches the slider");
    assert.equal((await playerState(page)).volumeOpen, true, "keyboard focus keeps the slider open");
  });
});

// Màn hình cảm ứng (primary-video-player R1): một hàng 40px giờ, thanh tua, tiếng; không nút phát trên thanh,
// nút tiếng chỉ bật/tắt, không mở cột âm lượng.
test("M02a touch primary video uses one 40px row with the play button, no center icon and no volume column", async () => {
  await withPage("vi", async (page) => {
    await openFixture(page, "vi", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-video]").paused);
    assert.equal(await page.evaluate(() => matchMedia("(hover: none)").matches), true, "the phone context has no hover");
    const row = () => page.evaluate(() => {
      const player = document.querySelector("[data-advertising-photo-player]");
      const box = (selector) => (({ top, height }) => [Math.round(top + height / 2), Math.round(height)])(
        player.querySelector(selector).getBoundingClientRect());
      const left = (selector) => player.querySelector(selector).getBoundingClientRect().left;
      return { volumePop: getComputedStyle(player.querySelector(".advertising-video-player__volume-pop")).display,
        gradient: getComputedStyle(player.querySelector(".advertising-video-player__bar")).backgroundImage,
        items: ["[data-advertising-photo-play]", "[data-advertising-photo-progress]", "[data-advertising-photo-audio-toggle]"]
          .map(box),
        time: box(".advertising-video-player__time"),
        order: ["[data-advertising-photo-play]", ".advertising-video-player__time", "[data-advertising-photo-progress]",
          "[data-advertising-photo-audio-toggle]"].map(left) };
    });
    let state = await playerState(page);
    assert.deepEqual([state.bar, state.centerIcons, state.playLabel], [1, 0, "Tạm dừng"], "playing: bar visible, no center icon");
    const layout = await row();
    assert.deepEqual([layout.volumePop, layout.gradient], ["none", "none"], "no volume column, no gradient band");
    assert(layout.items.every(([centre, height]) => height === 40 && Math.abs(centre - layout.time[0]) <= 1),
      `play, time, seek bar and sound share one 40px row: ${JSON.stringify(layout)}`);
    assert(layout.order.every((value, index) => index === 0 || value > layout.order[index - 1]),
      `the row reads play, time, seek bar, sound: ${JSON.stringify(layout.order)}`);
    await page.locator("[data-advertising-photo-play-surface]").tap();
    await page.waitForTimeout(150);
    state = await playerState(page);
    assert.deepEqual([state.paused, state.centerIcons, state.playLabel], [true, 0, "Phát"],
      "tapping the video pauses it, the bar button turns to play, no center icon");
    const muted = state.muted;
    await page.locator("[data-advertising-photo-audio-toggle]").tap();
    state = await playerState(page);
    assert.equal(state.muted, !muted, "the sound button toggles sound");
    assert.equal((await row()).volumePop, "none", "the sound button never opens a volume column");
  });
});

// Ngón đặt trên thanh tua chỉ tua, không kéo dải media (primary-video-player R10, owner 2026-10-24).
test("M02a touch seek drag moves the video, not the media strip", async () => {
  await withPage("vi", async (page) => {
    const card = await openFixture(page, "vi", { videoCover: true, direct: true });
    // Màn chuyển route phủ trang lúc vào; chờ nó hết để ngón chạm tới thanh tua.
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
      && document.querySelector("[data-advertising-photo-video]").readyState >= 2);
    const view = page.locator("[data-advertising-photo-view]");
    assert.equal(await view.getAttribute("data-advertising-active-media-id"), videoId);
    assert(card.mediaItems.length > 1, "the card has more than one media");
    const track = await page.locator("[data-advertising-photo-progress]").boundingBox();
    // Dừng video và về 0 để chỉ cú kéo làm giây đổi.
    const before = await page.evaluate(() => {
      const video = document.querySelector("[data-advertising-photo-video]");
      video.pause();
      video.currentTime = 0;
      return video.currentTime;
    });
    const y = track.y + track.height / 2;
    const cdp = await page.context().newCDPSession(page);
    let x = track.x + 4;
    let strip = false;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
    // Kéo 60% thanh, quá slop 10px của dải. Kéo tới cuối thanh thì video loop đã dừng vẫn tự tua về 0 khi seek xong
    // (Chrome), nên giây đọc lại là 0 (CI đỏ 0 -> 0, thanh 115px mà kéo 120px).
    for (let step = 0; step < 12; step += 1) {
      x += track.width * 0.6 / 12;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y, id: 1 }] });
      strip ||= await page.evaluate(() => Boolean(document.querySelector(".advertising-photo-view__strip")));
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => document.querySelector("[data-advertising-photo-video]").currentTime);
    assert.equal(strip, false, "the media strip never opens while seeking");
    assert.equal(await view.getAttribute("data-advertising-active-media-id"), videoId, "the media does not change");
    assert(after - before > 1, `the drag seeks the video forward: ${before} -> ${after}`);
  });
});

// Dải media theo pin Pinterest: khung giữ tỷ lệ cover nên đổi media không đổi kích thước primary, related đứng yên;
// mũi tên và thumbnail đang xem theo vị trí, media khác tỷ lệ có nền zoom blur.
// Khung primary cao theo media (primary-video-player R6): video vừa khít khung ở 1440×900. Viewport thấp chặn khung theo
// chiều cao, nên video 3:2 hay 16:9 còn vùng dư hai bên cho nền blur.
const cappedViewport = { width: 1440, height: 560 };

const stripState = (page) => page.evaluate(() => {
  const view = document.querySelector("[data-advertising-photo-view]");
  const frame = view.querySelector(".advertising-photo-view__hero-frame").getBoundingClientRect();
  return { active: view.dataset.advertisingActiveMediaId, glass: view.dataset.advertisingPhotoGlass,
    frame: [frame.width, frame.height].map(Math.round).join("x"),
    related: [...view.querySelectorAll("[data-advertising-photo-related-grid] > *")].slice(0, 6)
      .map((node) => (({ x, y }) => `${Math.round(x)},${Math.round(y)}`)(node.getBoundingClientRect())).join(" "),
    steps: [...view.querySelectorAll("[data-advertising-photo-media-step]")].map((node) => node.hidden ? 0 : 1).join(""),
    thumbs: [...view.querySelectorAll("[data-advertising-photo-media-select]")].map((node) => node.getAttribute("aria-current") === "true" ? 1 : 0).join("") };
});

// Card dọc bốn ảnh cùng tỷ lệ: media hẹp hơn khung nên có nền zoom blur; bấm thumbnail trượt thẳng tới media đó, nền
// blur trượt cùng dải (media-card R6, owner 2026-10-19). Primary không có hàng chấm, thumbnail góc vuông (owner 2026-10-24).
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
    await page.locator("[data-advertising-photo-view]").waitFor({ state: "visible" });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.waitForTimeout(1200);
    assert.equal(await page.locator("[data-advertising-photo-media-dots], .advertising-photo-view__media-dots").count(), 0,
      "primary has no dots");
    const thumbs = page.locator("[data-advertising-photo-media-select]");
    assert.deepEqual(await thumbs.evaluateAll((nodes) => nodes.map((node) => [node.getAttribute("aria-current"),
      getComputedStyle(node).borderRadius])), [["true", "0px"], ["false", "0px"], ["false", "0px"], ["false", "0px"]]);
    assert.equal(await page.locator("[data-advertising-photo-view]").getAttribute("data-advertising-photo-glass"), "true",
      "portrait media sits on the zoom blur backdrop");
    const frames = await page.evaluate(async () => {
      const hero = document.querySelector(".advertising-photo-view__hero-frame");
      const frames = [];
      let stop = false;
      const tick = () => {
        const strip = hero.querySelector(".advertising-photo-view__strip");
        frames.push(strip && {
          media: [...strip.children].map((node) => ({ src: node.getAttribute("src"), translate: getComputedStyle(node).translate,
            opacity: getComputedStyle(node).opacity })),
          live: (() => {
            const canvas = hero.querySelector(".advertising-photo-view__live-background");
            const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
            let hash = 0;
            for (let i = 0; i < data.length; i += 13) hash = (hash * 31 + data[i]) % 1e9;
            return { hidden: canvas.hidden, hash };
          })(),
          real: getComputedStyle(hero.querySelector("[data-advertising-photo-image]")).visibility,
        });
        if (!stop) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      document.querySelectorAll("[data-advertising-photo-media-select]")[2].click();
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
    assert.equal(await page.locator("[data-advertising-photo-view]").getAttribute("data-advertising-active-media-id"),
      card.mediaItems[2].id);
    assert.equal(await thumbs.nth(2).getAttribute("aria-current"), "true");
  });
});

test("M02a video stands still in the strip, its sound fades between play and pause, and the blur backdrop follows the video", async () => {
  await withPage("en", async (page) => {
    await page.setViewportSize(cappedViewport);
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-video]").readyState >= 2);
    assert.equal(await page.locator("[data-advertising-photo-view]").getAttribute("data-advertising-photo-glass"), "true");
    const backdrop = () => page.evaluate(() => {
      const canvas = document.querySelector(".advertising-photo-view__live-background");
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
      const video = document.querySelector("[data-advertising-photo-video]");
      video.muted = false;
      video.volume = 1;
      const frames = [];
      let stop = false;
      const tick = () => {
        const strip = document.querySelector(".advertising-photo-view__strip");
        frames.push({ strip: Boolean(strip), laneVideos: strip?.querySelectorAll("video").length ?? 0,
          moving: Boolean(strip?.getAnimations({ subtree: true }).some(({ playState }) => playState === "running")),
          volume: video.volume, paused: video.paused, src: video.getAttribute("src"), time: video.currentTime, at: performance.now() });
        if (!stop) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      document.querySelector(`[data-advertising-photo-media-step="${step}"]`).click();
      await new Promise((resolve) => setTimeout(resolve, 2400));
      stop = true;
      return frames;
    }, step);
    const out = await slide(-1);
    const sliding = out.filter(({ strip }) => strip);
    assert(sliding.length >= 20, `video to image slides over many frames: ${sliding.length}`);
    assert(sliding.every(({ laneVideos }) => laneVideos === 0), "no video plays inside the strip");
    // Tiếng chạy nốt và nhỏ dần trong lúc hình đứng trên dải, về 0 thì video dừng.
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

// Người xem chỉnh tiếng giữa lúc fade thì thắng (primary-video-player R11): fade dừng, mức vừa chọn giữ nguyên.
test("M02a a volume change during the sound fade wins and stays", async () => {
  await withPage("en", async (page) => {
    await page.setViewportSize(cappedViewport);
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-video]").readyState >= 2);
    await page.evaluate(() => {
      const video = document.querySelector("[data-advertising-photo-video]");
      video.muted = false;
      video.volume = 1;
      document.querySelector('[data-advertising-photo-media-step="-1"]').click();
    });
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-video]").getAttribute("src") === null,
      null, { timeout: 5_000 });
    const result = await page.evaluate(async () => {
      const video = document.querySelector("[data-advertising-photo-video]");
      const range = document.querySelector("[data-advertising-photo-volume]");
      document.querySelector('[data-advertising-photo-media-step="1"]').click();
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
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-video]").readyState >= 2
      && !document.documentElement.classList.contains("route-enter"));
    // Ẩn media và Kính rồi chụp nền blur trên hai màu nền khung: chỗ nào nền blur trong suốt thì hai ảnh khác nhau.
    await page.addStyleTag({ content: `.advertising-photo-view__hero-frame { background: var(--test-frame) !important; }
      .advertising-photo-view__hero-frame > :not([data-advertising-photo-background], .advertising-photo-view__live-background) { visibility: hidden !important; }` });
    const frame = page.locator(".advertising-photo-view__hero-frame");
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
    // Dừng video để nền realtime đứng yên giữa hai lần chụp.
    await page.evaluate(() => document.querySelector("[data-advertising-photo-video]").pause());
    await page.waitForTimeout(200);
    assert(await seeThrough() < 8, "the live video backdrop reaches the frame edge");
    await page.locator('[data-advertising-photo-media-step="-1"]').evaluate((button) => button.click());
    await page.waitForFunction(() => !document.querySelector(".advertising-photo-view__strip")
      && document.querySelector("[data-advertising-photo-video]").hidden);
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
    await page.locator(".advertising-photo-view__hero-frame").hover();
    await page.locator('[data-advertising-photo-media-step="-1"]').click();
    await page.waitForTimeout(100);
    const during = await stripState(page);
    assert.equal(during.related, before.related, "related cards stay put while the media slides");
    await page.waitForTimeout(500);
    const after = await stripState(page);
    assert.equal(after.active, card.mediaItems[0].id);
    assert.deepEqual([after.frame, after.related], [before.frame, before.related], "primary keeps the cover frame");
    assert.deepEqual([after.steps, after.thumbs], ["01", "10"]);
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

// Nút vuông trắng (primary-video-player R7): mũi tên, nút mở lớn, nút viewer cùng ô 36px; thanh tua PC thẳng đáy nút mở
// lớn và dừng trước nút đó 8px.
test("M02a primary arrows, expand and viewer buttons are 36px white squares and the player is one row beside expand", async () => {
  await withPage("en", async (page) => {
    const card = await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
    await page.locator(".advertising-photo-view__hero-frame").hover();
    await page.waitForTimeout(300);
    const square = (selector) => page.locator(selector).evaluate((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return [Math.round(box.width), Math.round(box.height), style.borderRadius, style.borderTopWidth, style.backgroundColor];
    });
    const white = [36, 36, "0px", "0px", "rgb(255, 255, 255)"];
    assert.deepEqual(await square('[data-advertising-photo-media-step="-1"]'), white, "media arrow");
    assert.deepEqual(await square("[data-advertising-photo-expand]"), white, "expand button on the video");
    // Việc 2 (owner 2026-10-25): phát, giờ, thanh tua, tiếng cùng một hàng; hàng thẳng đáy nút mở lớn, tiếng dừng trước nó 8px.
    const edges = await page.evaluate(() => {
      const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
      const parts = ["[data-advertising-photo-play]", ".advertising-video-player__time", "[data-advertising-photo-progress]",
        "[data-advertising-photo-audio-toggle]"].map(rect);
      const expand = rect("[data-advertising-photo-expand]");
      const centre = expand.top + expand.height / 2;
      const icon = [...document.querySelectorAll("[data-advertising-photo-audio-toggle] svg")]
        .find((node) => getComputedStyle(node).display !== "none").getBoundingClientRect();
      return { centres: parts.map((box) => box.top + box.height / 2 - centre), lefts: parts.map((box) => box.left),
        gap: expand.left - icon.right };
    });
    assert(edges.centres.every((offset) => Math.abs(offset) <= 1),
      `play, time, seek bar and sound sit on one row centred with expand: ${JSON.stringify(edges)}`);
    assert(edges.lefts.every((value, index) => index === 0 || value > edges.lefts[index - 1]),
      `the row reads play, time, seek bar, sound: ${JSON.stringify(edges.lefts)}`);
    assert(Math.abs(edges.gap - 8) <= 1, `the sound icon ends 8px before expand: ${JSON.stringify(edges)}`);
    await page.locator("[data-advertising-photo-expand]").hover();
    await page.waitForTimeout(300);
    assert.deepEqual((await square("[data-advertising-photo-expand]")).slice(0, 2), [36, 36], "hover does not widen expand");
    assert.equal(await page.locator("[data-advertising-photo-expand]").evaluate((node) => node.querySelector("span")), null,
      "expand has no text label");
    await choosePrimaryThumb(page, card.mediaItems[0].id);
    await assertPrimary(page, card, card.mediaItems[0].id, "en");
    await page.locator("[data-advertising-photo-expand]").click();
    await page.locator("[data-advertising-photo-dialog]").waitFor({ state: "visible" });
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
    assert.equal(await page.locator("[data-advertising-photo-zoom-reset]").count(), 0, "the viewer has no reset button");
    for (const selector of ["[data-advertising-photo-close]", "[data-advertising-photo-zoom-in]",
      "[data-advertising-photo-zoom-out]"]) {
      const [width, height, radius, border, background] = await square(selector);
      assert.deepEqual([width, height, radius, border], [36, 36, "0px", "0px"], `${selector} is a 36px square without border`);
      if (!await page.locator(selector).isDisabled()) assert.equal(background, "rgb(255, 255, 255)", `${selector} is white`);
    }
  });
});

// Mở lớn video trong viewer (primary-video-player R8): chính video primary vào viewer, phát tiếp đúng giây trên nền
// blur, không phóng to được (owner 2026-10-25), đóng thì về khung primary vẫn phát.
const videoClock = (page) => page.evaluate(() => {
  const video = document.querySelector("[data-advertising-photo-video]");
  return { time: video.currentTime, at: performance.now(), paused: video.paused,
    inHost: Boolean(video.closest("[data-advertising-photo-video-host]")),
    inPrimary: Boolean(video.closest(".advertising-photo-view__hero-frame")),
    scale: new DOMMatrix(getComputedStyle(video).transform === "none" ? undefined : getComputedStyle(video).transform).a };
});
// Giây video theo đồng hồ trang: chênh với giây dự kiến (giây trước + thời gian trôi × tốc độ phát).
const clockDrift = (before, after, rate) => Math.abs(after.time - before.time - (after.at - before.at) / 1000 * rate);

test("M02a expand opens the playing primary video in the blurred viewer without zoom and returns it on close", async () => {
  await withPage("en", async (page) => {
    await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
      && !document.querySelector("[data-advertising-photo-video]").paused);
    // Tốc độ 0.5 để clip 3s không lặp về 0 giữa ca; giây chỉ đi tới.
    await page.evaluate(() => {
      const video = document.querySelector("[data-advertising-photo-video]");
      video.playbackRate = 0.5;
      video.currentTime = 1.5;
    });
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-video]").seeking);
    const expand = page.locator("[data-advertising-photo-expand]");
    assert.equal(await expand.getAttribute("data-advertising-photo-expand-video"), "", "expand is the video expand");
    const before = await videoClock(page);
    await expand.click();
    const viewer = page.locator("[data-advertising-photo-dialog]");
    await viewer.waitFor({ state: "visible" });
    const opened = await videoClock(page);
    assert.equal(opened.inHost, true, "the primary video moves into the viewer host");
    assert.equal(opened.paused, false, "the video keeps playing");
    assert(clockDrift(before, opened, 0.5) < 0.3, `the video keeps its second: ${before.time} -> ${opened.time}`);
    assert.match(await viewer.evaluate((node) => getComputedStyle(node, "::backdrop").backdropFilter), /blur/,
      "the backdrop is blurred, not solid black");
    assert.equal(await page.locator("[data-advertising-photo-video-host] [data-advertising-photo-player]").count(), 1,
      "the player bar comes with the video");
    await page.waitForTimeout(500);
    assert.deepEqual(await viewerMediaGate(page), { frame: false, animations: [] }, "viewer video has no wait sweep behind it");
    assert.deepEqual(await page.evaluate(() => ["zoom-in", "zoom-out"].map((hook) =>
      document.querySelector(`[data-advertising-photo-${hook}]`).getBoundingClientRect().width)), [0, 0],
    "a video in the viewer shows no zoom buttons");
    const host = await page.locator("[data-advertising-photo-video-host] video").boundingBox();
    await page.mouse.move(host.x + host.width / 2, host.y + host.height / 2);
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(400);
    assert.equal((await videoClock(page)).scale, 1, "the wheel does not zoom a video");
    const beforeClose = await videoClock(page);
    await page.locator("[data-advertising-photo-close]").click();
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
      && !document.querySelector("[data-advertising-photo-video]").paused);
    const box = await page.locator("[data-advertising-photo-expand]").boundingBox();
    assert(box && box.width >= 36 && box.height >= 36, `expand is visible on a touch video: ${JSON.stringify(box)}`);
    await page.locator("[data-advertising-photo-play-surface]").tap();
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => document.querySelector("[data-advertising-photo-video]").paused), true,
      "tapping the video pauses it");
    assert.equal(await page.locator("[data-advertising-photo-dialog]").evaluate((node) => node.open), false,
      "tapping the video does not open the viewer");
    // Màn cảm ứng ẩn nút viewer và dãy thumbnail viewer khỏi mắt, vẫn còn cho screen reader (viewer R8).
    await page.locator("[data-advertising-photo-expand]").tap();
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]").dataset.advertisingViewerState
      === "open");
    assert.deepEqual(await page.locator("[data-advertising-photo-viewer-thumbs]").evaluate((node) =>
      [node.getBoundingClientRect().width <= 1, node.querySelectorAll("button").length > 1]), [true, true],
      "the viewer strip is hidden from sight on touch screens but its buttons stay for screen readers");
  });
});

// Dãy thumbnail dưới viewer thay hai mũi tên (R8, owner 2026-10-25): đổi media của card bằng dải trượt; video về primary,
// đóng thì primary đứng ở media vừa xem.
test("M02a viewer thumbnails slide from the video to the image and closing keeps primary on that image", async () => {
  await withPage("en", async (page) => {
    const card = await openFixture(page, "en", { videoCover: true, direct: true });
    const image = card.mediaItems[0];
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
      && document.querySelector("[data-advertising-photo-video]").readyState >= 2);
    await page.locator("[data-advertising-photo-expand]").click();
    await page.locator("[data-advertising-photo-dialog]").waitFor({ state: "visible" });
    assert.equal(await page.locator("[data-advertising-photo-viewer-step]").count(), 0, "the viewer has no arrows");
    const current = () => page.$$eval("[data-advertising-photo-viewer-select]",
      (nodes) => nodes.map((node) => `${node.dataset.advertisingPhotoViewerSelect}:${node.getAttribute("aria-current")}`));
    assert.deepEqual(await current(), card.mediaItems.map(({ id }) => `${id}:${id === videoId}`),
      "the viewer strip lists every media of the card and marks the video");
    const strip = await page.locator("[data-advertising-photo-viewer-thumbs]").boundingBox();
    const viewport = page.viewportSize();
    assert(strip && strip.y + strip.height <= viewport.height && strip.y > viewport.height / 2,
      `the strip sits at the bottom of the viewer: ${JSON.stringify(strip)}`);
    const ghost = await page.evaluate((id) => {
      document.querySelector(`[data-advertising-photo-viewer-select="${id}"]`).click();
      return Boolean(document.querySelector("[data-advertising-photo-dialog] .advertising-photo-dialog__ghost"));
    }, image.id);
    assert.equal(ghost, true, "a sliding layer carries the old media out");
    await page.waitForFunction(() => !document.querySelector(".advertising-photo-dialog__ghost"), null, { timeout: 5_000 });
    const state = await page.evaluate(() => {
      const expanded = document.querySelector("[data-advertising-photo-expanded-image]");
      const video = document.querySelector("[data-advertising-photo-video]");
      return { src: expanded.currentSrc || expanded.src, hidden: expanded.hidden,
        videoInPrimary: Boolean(video.closest(".advertising-photo-view__hero-frame")) };
    });
    assert.equal(mediaPath(state.src), image.src, "the viewer shows the image");
    assert.deepEqual([state.hidden, state.videoInPrimary], [false, true], "the image shows and the video is back in primary");
    assert.deepEqual(await current(), card.mediaItems.map(({ id }) => `${id}:${id === image.id}`),
      "the strip marks the image now on screen");
    await page.locator("[data-advertising-photo-close]").click();
    await page.locator("[data-advertising-photo-dialog]").waitFor({ state: "hidden" });
    assert.equal(await page.locator("[data-advertising-photo-view]").getAttribute("data-advertising-active-media-id"),
      image.id, "primary stays on the media seen in the viewer");
  });
});

// Dãy thumbnail viewer tự ẩn khi chuột đứng yên 3s, rê chuột thì hiện; mũi tên trái phải đổi media như bấm thumbnail
// (owner 2026-10-26).
test("M02a viewer strip hides while the mouse rests and arrow keys step the media", async () => {
  await withPage("en", async (page) => {
    const card = await openFixture(page, "en", { videoCover: true, direct: true });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
      && document.querySelector("[data-advertising-photo-video]").readyState >= 2);
    await page.locator("[data-advertising-photo-expand]").click();
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]").dataset.advertisingViewerState
      === "open");
    const opacity = () => page.locator("[data-advertising-photo-viewer-thumbs]")
      .evaluate((node) => Number(getComputedStyle(node).opacity));
    assert.equal(await opacity(), 1, "the strip shows when the viewer opens");
    await page.waitForTimeout(3600);
    assert.equal(await opacity(), 0, "the strip hides once the mouse rests for 3s");
    await page.mouse.move(200, 200);
    await page.mouse.move(220, 220);
    await page.waitForTimeout(400);
    assert.equal(await opacity(), 1, "moving the mouse shows the strip again");
    const index = card.mediaItems.findIndex(({ id }) => id === videoId);
    const [key, target] = index > 0 ? ["ArrowLeft", card.mediaItems[index - 1]] : ["ArrowRight", card.mediaItems[index + 1]];
    await page.keyboard.press(key);
    await page.waitForFunction((id) => document.querySelector(`[data-advertising-photo-viewer-select="${id}"]`)
      .getAttribute("aria-current") === "true", target.id, { timeout: 5_000 });
    assert.equal(await page.locator("[data-advertising-photo-view]").getAttribute("data-advertising-active-media-id"),
      target.id, "the arrow key steps primary and viewer to the next media");
  });
});

// Đổi từ video sang video (việc 3, owner 2026-10-25): suốt lúc dải trượt, giờ, tổng và thanh tua đứng ở video cũ; video mới
// bắt đầu chạy (`playing`) thì mới đổi sang giờ, tổng của video mới. Áp dụng cho dải primary và viewer.
const sampleVideoSwitch = (page, selector) => page.evaluate(async (selector) => {
  const video = document.querySelector("[data-advertising-photo-video]");
  const player = document.querySelector("[data-advertising-photo-player]");
  const read = () => ({ time: player.querySelector(".advertising-video-player__time").textContent.replace(/\s+/g, " ").trim(),
    progress: Number(player.querySelector("[data-advertising-photo-progress]").value) });
  const before = read();
  let started = false;
  // Video cũ đang phát không bắn lại `playing`; chỉ video mới sau khi đổi nguồn mới bắn.
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
      && !document.querySelector("[data-advertising-photo-video]").paused);
    await page.waitForTimeout(500);
    const primary = await sampleVideoSwitch(page, '[data-advertising-photo-media-step="1"]');
    assert(primary.started && primary.held.length > 2, `the new video plays after the strip: ${JSON.stringify(primary)}`);
    assert.match(primary.before.time, /\/ 0:03$/, "the first video shows its own total");
    assert(primary.held.every((sample) => sample.time === primary.before.time && sample.progress === primary.before.progress),
      `the time and seek bar stand still on the old video during the strip: ${JSON.stringify(primary)}`);
    assert.match(primary.after.time, /\/ 0:04$/, `the new video shows its total once it plays: ${primary.after.time}`);

    await page.locator("[data-advertising-photo-expand]").click();
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]").dataset.advertisingViewerState
      === "open");
    const viewer = await sampleVideoSwitch(page,
      `[data-advertising-photo-viewer-select="${videoId}"]`);
    assert(viewer.started && viewer.held.length > 0, `the viewer video plays after the switch: ${JSON.stringify(viewer)}`);
    assert(viewer.held.every((sample) => sample.time === viewer.before.time && sample.progress === viewer.before.progress),
      `the viewer keeps the old time until the new video plays: ${JSON.stringify(viewer)}`);
    assert.match(viewer.after.time, /\/ 0:03$/, `the viewer shows the new total once it plays: ${viewer.after.time}`);
  });
});

// Dãy thumbnail một dòng, mô tả cuộn (owner 2026-10-24): còn nội dung thì mép mờ về trắng; thanh cuộn mô tả chỉ hiện khi
// hover, kéo được, chữ căn đều; cảm ứng không có thanh.
const scrollHints = (page) => page.evaluate(() => {
  const strip = document.querySelector("[data-advertising-photo-media-thumbs]");
  const scroll = document.querySelector("[data-advertising-photo-description-scroll]");
  const bar = document.querySelector("[data-advertising-photo-description-bar]");
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
    align: getComputedStyle(document.querySelector("[data-advertising-photo-description]")).textAlign,
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
    const description = await page.locator("[data-advertising-photo-description-scroll]").boundingBox();
    await page.mouse.move(description.x + description.width / 2, description.y + description.height / 2);
    await page.waitForFunction(() => getComputedStyle(document.querySelector("[data-advertising-photo-description-bar]")).opacity === "1");
    // Wheel và End trong mô tả còn chữ chỉ cuộn mô tả, Locomotive không cuộn trang theo.
    const primaryTop = () => page.locator("[data-advertising-photo-primary]").evaluate((node) => node.getBoundingClientRect().top);
    const topBefore = await primaryTop();
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(600);
    await page.locator("[data-advertising-photo-description-scroll]").focus();
    await page.keyboard.press("End");
    await page.waitForTimeout(600);
    state = await scrollHints(page);
    assert(state.scrollTop > 0 && Math.abs(await primaryTop() - topBefore) <= 1,
      `wheel and End scroll the description, not the page: ${JSON.stringify(state)}`);
    await page.locator("[data-advertising-photo-description-scroll]").evaluate((node) => { node.scrollTop = 0; node.blur(); });
    const bar = await page.locator("[data-advertising-photo-description-bar]").boundingBox();
    await page.mouse.move(bar.x + bar.width / 2, bar.y + 8);
    await page.mouse.down();
    await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height, { steps: 6 });
    await page.mouse.up();
    state = await scrollHints(page);
    assert(state.scrollTop > 0, "dragging the scrollbar scrolls the description");
    assert.deepEqual(state.description, [true, false], "at the end only the first line fades");
    await page.mouse.move(5, 5);
    await page.waitForFunction(() => getComputedStyle(document.querySelector("[data-advertising-photo-description-bar]")).opacity === "0");
    await page.locator(".advertising-photo-view__hero-frame").hover();
    for (let step = 1; step < card.mediaItems.length; step += 1) {
      await page.locator('[data-advertising-photo-media-step="1"]').click();
      await page.waitForTimeout(150);
    }
    await page.waitForFunction((id) => document.querySelector("[data-advertising-photo-view]").dataset.advertisingActiveMediaId === id,
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
