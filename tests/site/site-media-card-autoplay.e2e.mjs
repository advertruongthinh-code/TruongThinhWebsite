import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";

// Lịch phát video card (media-card R4, owner 2026-10-24): masonry phát tắt tiếng mọi card video hiện quá 1/2 chiều cao
// dưới navbar, tính lại ngay khi đang cuộn; hover không làm card phát; related trong detail tự phát như masonry (owner
// 2026-10-25); reduced motion chỉ phát card dưới chuột; mỗi card chạy playlist video của nó rồi lặp.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const base = process.env.BASE_URL || "http://localhost:8792";
const fixturePrefix = "/__site_media_card_autoplay__/";
const poster = path.join(root, "tests/site/fixtures/site-media-card-poster.webp");
const clip = path.join(root, "tests/site/fixtures/site-media-card-clip-audio.mp4");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");

// Mọi card thành card video để lịch phát luôn có ứng viên, không phụ thuộc seed của grid. playlist: video, ảnh,
// video thứ hai, để kiểm card bỏ qua ảnh khi chạy playlist.
function fixtureArtifact(playlist = false) {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  for (const card of artifact.cards) {
    const shared = {
      ...card.mediaItems[0], width: 640, height: 360, source: "M00b sealed synthetic fixture",
      provenance: "Synthetic test-only fixture, not public media.",
    };
    const video = (suffix) => ({
      ...shared, id: `${card.id}-autoplay-${suffix}`, kind: "video", src: `${fixturePrefix}clip.mp4`,
      cardSrc: `${fixturePrefix}card.mp4`,
      sourceId: "autoplay:test-only:clip", altVi: `${shared.altVi} ${suffix}`, altEn: `${shared.altEn} ${suffix}`,
      sha256: "853e4939e6a4627cc7777665283b2affab189132243974a4777f5a955338e827",
      posterSrc: `${fixturePrefix}poster.webp`, posterWidth: 640, posterHeight: 360,
      durationSeconds: 3, hasAudio: true,
    });
    const image = { ...shared, id: `${card.id}-autoplay-image`, kind: "image", src: `${fixturePrefix}poster.webp`,
      sourceId: "autoplay:test-only:poster", altVi: `${shared.altVi} ảnh`, altEn: `${shared.altEn} image` };
    card.mediaItems = playlist ? [video("video"), image, video("video-2")] : [video("video")];
    card.coverMediaId = card.mediaItems[0].id;
  }
  return artifact;
}

async function open({ width = 1440, height = 900, touch = false, reducedMotion = "no-preference", playlist = false } = {}) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion });
  await page.route(`**${fixturePrefix}*`, async (route) => {
    if (!route.request().url().endsWith(".mp4")) return route.fulfill({ path: poster, contentType: "image/webp" });
    // Trả 206 theo Range để Chrome coi clip là seekable, giây video mới chuyển được giữa card và detail.
    const body = await readFile(clip);
    const [start, end = body.length - 1] = (/bytes=(\d+)-(\d*)/.exec(route.request().headers().range || "") || [])
      .slice(1).filter(Boolean).map(Number);
    if (start === undefined) return route.fulfill({ body, contentType: "video/mp4", headers: { "accept-ranges": "bytes" } });
    return route.fulfill({ status: 206, body: body.subarray(start, end + 1), contentType: "video/mp4",
      headers: { "accept-ranges": "bytes", "content-range": `bytes ${start}-${end}/${body.length}` } });
  });
  await page.addInitScript((artifact) => { window.__TT_ADVERTISING_ARTIFACT__ = artifact; }, fixtureArtifact(playlist));
  await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
  await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.()));
  await page.waitForFunction(() => document.querySelectorAll("[data-advertising-card] video").length >= 4);
  // Intro hero và smooth scroll cần mount xong mới nhận wheel.
  await page.waitForTimeout(2500);
  // Con trỏ nằm ở lề trái, ngoài mọi card, để hover không chen vào lịch phát.
  if (!touch) await page.mouse.move(8, height / 2);
  return { browser, page };
}

// visibleRatio: phần video hiện dưới navbar chia chiều cao video.
const videoState = (page, selector = "[data-advertising-card]") => page.evaluate((cardSelector) => {
  const navBottom = Math.max(0, document.querySelector("[data-site-header]")?.getBoundingClientRect().bottom ?? 0);
  const videos = [...document.querySelectorAll(`${cardSelector} video`)].filter((video) => video.checkVisibility());
  const describe = (video) => {
    const rect = video.getBoundingClientRect();
    const top = Math.max(rect.top, navBottom);
    const bottom = Math.min(rect.bottom, innerHeight);
    const card = video.closest(cardSelector);
    return { id: card.dataset.advertisingCard ?? card.dataset.advertisingRelatedCard,
      mediaId: card.dataset.advertisingActiveMediaId, muted: video.muted, visibleRatio: (bottom - top) / rect.height,
      x: rect.left + rect.width / 2, y: (top + bottom) / 2 };
  };
  return {
    playing: videos.filter((video) => !video.paused).map(describe),
    paused: videos.filter((video) => video.paused).map(describe),
    playbackButtons: document.querySelectorAll("[data-advertising-media-playback]").length,
  };
}, selector);

async function scroll(page, touch, distance = 4000) {
  if (touch) await page.evaluate((dy) => scrollBy(0, dy), distance);
  // Smooth scroll desktop chỉ trôi theo từng nhịp wheel (hero Advertising còn hãm cuộn), nên cần nhiều nhịp.
  else for (let moved = 0; moved < distance; moved += 250) {
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(120);
  }
}

async function settle(page) {
  // Smooth scroll desktop còn trôi thêm một lúc; chờ Locomotive gỡ class đang cuộn rồi thêm vài frame cho lịch phát.
  await page.waitForTimeout(300);
  await page.waitForFunction(() => !document.documentElement.classList.contains("has-scroll-scrolling"), null, { timeout: 10000 });
  await page.waitForTimeout(300);
}

async function scrollAndSettle(page, touch, distance = 4000) {
  await scroll(page, touch, distance);
  await settle(page);
}

// Mọi video hiện quá 1/2 chiều cao dưới navbar phát tắt tiếng, còn lại dừng. margin cho lúc đang cuộn: lịch tính trong
// frame trước lúc đo nên video sát ngưỡng có thể lệch một frame.
function assertHalfVisiblePlaying(state, label, margin = 0) {
  assert(state.playing.length >= 3, `${label}: every half-visible card plays, not two slots: ${JSON.stringify(state.playing)}`);
  assert(state.playing.every((video) => video.muted && video.visibleRatio > 0.5 - margin),
    `${label}: playing videos are muted and more than half visible: ${JSON.stringify(state.playing)}`);
  assert(state.paused.every((video) => video.visibleRatio <= 0.5 + margin),
    `${label}: videos more than half visible are not paused: ${JSON.stringify(state.paused.filter((video) => video.visibleRatio > 0.5))}`);
}

async function playingSettled(page, selector = "[data-advertising-card]") {
  await page.waitForFunction((cardSelector) => [...document.querySelectorAll(`${cardSelector} video`)]
    .some((video) => !video.paused), selector, { timeout: 5000 });
  await page.waitForTimeout(300);
  return videoState(page, selector);
}

// Lịch khởi động mỗi frame một video (R4), nên nhiều card cùng hiện cần vài frame mới phát đủ: chờ tới khi không còn
// video quá 1/2 đang chờ, quá 5s thì trả trạng thái lúc đó cho assert.
async function allStarted(page, selector) {
  await playingSettled(page, selector);
  for (const until = Date.now() + 5000; Date.now() < until; await page.waitForTimeout(100)) {
    const state = await videoState(page, selector);
    if (state.paused.every((video) => video.visibleRatio <= 0.5)) return state;
  }
  return videoState(page, selector);
}

for (const touch of [false, true]) {
  const label = touch ? "touch 390" : "desktop 1440";
  test(`R4 ${label}: every card more than half visible plays muted, no playback button, recomputed while scrolling`, async () => {
    const { browser, page } = await open(touch ? { width: 390, height: 844, touch } : {});
    try {
      await scrollAndSettle(page, touch);
      const state = await allStarted(page);
      assert.equal(state.playbackButtons, 0, "card video has no playback button");
      assertHalfVisiblePlaying(state, `${label} settled`);
      // Đang cuộn (chưa dừng) thì lịch phát đã đổi theo vị trí mới. Touch nhảy 900px một lần nên nhiều card cùng hiện,
      // lịch khởi động mỗi frame một video (R4): chờ như allStarted thay vì mốc 150ms (đỏ 2/2 lượt chạy cả bộ 2026-10-26).
      await scroll(page, touch, 900);
      const moving = touch ? await allStarted(page) : (await page.waitForTimeout(150), await videoState(page));
      assertHalfVisiblePlaying(moving, `${label} while scrolling`, 0.1);
      await settle(page);
      assertHalfVisiblePlaying(await allStarted(page), `${label} after scroll`);
    } finally { await browser.close(); }
  });
}

test("R4 desktop: a single-video card loops its video", async () => {
  const { browser, page } = await open();
  try {
    await scrollAndSettle(page, false);
    const first = await playingSettled(page);
    // Clip fixture dài 3s; chờ hết một vòng.
    await page.waitForTimeout(4500);
    const next = await videoState(page);
    assert.deepEqual(next.playing.map((video) => video.id).sort(), first.playing.map((video) => video.id).sort(),
      "the same cards keep playing after the clip ends");
  } finally { await browser.close(); }
});

test("R4 desktop: a card plays its video playlist in order, skips images and loops", async () => {
  const { browser, page } = await open({ playlist: true });
  try {
    await scrollAndSettle(page, false);
    const first = await playingSettled(page);
    // Card vào lịch từ lúc đang cuộn nên có thể đã sang video 2; chọn card đang ở video 1.
    const card = first.playing.find((video) => video.mediaId === `${video.id}-autoplay-video`);
    assert(card, `a playing card is on its first video: ${JSON.stringify(first.playing)}`);
    // Mọi card hiện quá 1/2 cùng phát nên Chromium headless giải mã chậm, clip 3s có lúc chạy tới 6s.
    await page.waitForFunction((id) => document.querySelector(`[data-advertising-card="${id}"]`)
      ?.dataset.advertisingActiveMediaId === `${id}-autoplay-video-2`, card.id, { timeout: 15000 });
    await page.waitForFunction((id) => document.querySelector(`[data-advertising-card="${id}"]`)
      ?.dataset.advertisingActiveMediaId === `${id}-autoplay-video`, card.id, { timeout: 15000 });
    assert((await videoState(page)).playing.some((video) => video.id === card.id), "the card keeps playing after the loop");
  } finally { await browser.close(); }
});

test("R4 desktop: hovering a masonry card at half visible or less does not play it", async () => {
  const { browser, page } = await open();
  try {
    await scrollAndSettle(page, false);
    let target;
    // Tìm một card video hiện một phần (từ 1/2 trở xuống) để rê chuột vào phần đang hiện.
    for (let step = 0; step < 10 && !target; step += 1) {
      target = (await playingSettled(page)).paused.find((video) => video.visibleRatio > 0.15 && video.visibleRatio <= 0.45);
      if (!target) await scrollAndSettle(page, false, 250);
    }
    assert(target, "a partly visible paused video card exists");
    await page.mouse.move(target.x, target.y);
    await page.waitForTimeout(600);
    const hovered = await videoState(page);
    assert(hovered.paused.some((video) => video.id === target.id), `the hovered card stays paused: ${JSON.stringify(target)}`);
  } finally { await browser.close(); }
});

test("R4 desktop: related cards in detail autoplay like masonry and the pointer does not change it", async () => {
  const { browser, page } = await open();
  const related = "[data-advertising-related-card]";
  try {
    await page.locator("[data-advertising-card] > a").first().click();
    await page.waitForFunction(() => document.body.classList.contains("is-advertising-photo"));
    await page.mouse.move(8, 450);
    await page.locator(related).first().waitFor();
    await page.locator(related).first().scrollIntoViewIfNeeded();
    await scrollAndSettle(page, false, 500);
    const state = await allStarted(page, related);
    assert(state.playing.length && state.playing.every((video) => video.muted && video.visibleRatio > 0.5),
      `half-visible related videos play muted: ${JSON.stringify(state.playing)}`);
    assert(state.paused.every((video) => video.visibleRatio <= 0.5),
      `no half-visible related video waits for the pointer: ${JSON.stringify(state.paused)}`);
    const target = state.playing[0];
    await page.mouse.move(target.x, target.y);
    await page.mouse.move(8, 450);
    await page.waitForTimeout(600);
    assert((await videoState(page, related)).playing.some((video) => video.id === target.id), "leaving the related card keeps it playing");
  } finally { await browser.close(); }
});

test("R4 reduced motion: no autoplay on scroll, hover still plays", async () => {
  const { browser, page } = await open({ reducedMotion: "reduce" });
  try {
    await scrollAndSettle(page, false);
    const state = await videoState(page);
    assert.equal(state.playing.length, 0, "reduced motion does not autoplay");
    const target = state.paused.find((video) => video.visibleRatio === 1);
    await page.mouse.move(target.x, target.y);
    await page.waitForTimeout(600);
    assert.deepEqual((await videoState(page)).playing.map((video) => video.id), [target.id]);
  } finally { await browser.close(); }
});

// Card và detail giữ đúng media và giây video khi đi qua lại (owner 2026-10-18): card sang detail, Back về masonry,
// đổi ngôn ngữ trong detail.
test("R4 desktop: the viewed media and video time carry from card to detail, back to masonry, and across locale", async () => {
  const { browser, page } = await open({ playlist: true });
  const detail = () => page.evaluate(() => {
    const view = document.querySelector("[data-advertising-photo-view]");
    const video = view.querySelector("[data-advertising-photo-video]");
    return { mediaId: view.dataset.advertisingActiveMediaId, time: video.currentTime };
  });
  const card = (id) => page.evaluate((cardId) => {
    const node = document.querySelector(`[data-advertising-card="${cardId}"]`);
    return { mediaId: node.dataset.advertisingActiveMediaId, time: node.advertisingActiveVideo?.()?.currentTime ?? null };
  }, id);
  const seekCard = (id, time) => page.evaluate(({ cardId, seconds }) => {
    document.querySelector(`[data-advertising-card="${cardId}"]`).advertisingActiveVideo().currentTime = seconds;
  }, { cardId: id, seconds: time });
  const seekDetail = (time) => page.evaluate(async (seconds) => {
    const video = document.querySelector("[data-advertising-photo-video]");
    video.pause();
    video.currentTime = seconds;
    await new Promise((resolve) => video.addEventListener("seeked", resolve, { once: true }));
  }, time);
  const openCard = async (id) => {
    await page.locator(`[data-advertising-card="${id}"] > a`).click();
    await page.waitForFunction(() => document.body.classList.contains("is-advertising-photo"));
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-video]").readyState >= 1);
  };
  try {
    await scrollAndSettle(page, false);
    const { id } = (await playingSettled(page)).playing.find((video) => video.mediaId === `${video.id}-autoplay-video`);
    const cardSource = await page.evaluate((cardId) =>
      document.querySelector(`[data-advertising-card="${cardId}"]`).advertisingActiveVideo().currentSrc, id);
    assert(cardSource.endsWith("/card.mp4"), `card plays cardSrc: ${cardSource}`);
    await seekCard(id, 1.2);
    await openCard(id);
    const detailSource = await page.evaluate(() => document.querySelector("[data-advertising-photo-video]").currentSrc);
    assert(detailSource.endsWith("/clip.mp4"), `detail plays src: ${detailSource}`);
    let state = await detail();
    assert.equal(state.mediaId, `${id}-autoplay-video`, "detail opens on the card's media");
    assert(state.time >= 1.2 && state.time < 3, `detail video continues from the card time: ${state.time}`);

    for (let step = 0; step < 2; step += 1) {
      await page.locator('[data-advertising-photo-media-step="1"]').click();
      // Dải gỡ khi media đích đã vào hẳn khung và photoVideo đã nhận video đích (media-card R6).
      await page.waitForFunction(() => !document.querySelector(".advertising-photo-view__strip"));
    }
    assert.equal((await detail()).mediaId, `${id}-autoplay-video-2`);
    await seekDetail(2);
    await page.goBack();
    await page.waitForFunction(() => !document.body.classList.contains("is-advertising-photo"));
    state = await card(id);
    assert.equal(state.mediaId, `${id}-autoplay-video-2`, "Back leaves the card on the media viewed in detail");
    assert(state.time >= 1.9, `the card video resumes from the detail time: ${state.time}`);

    await seekCard(id, 1.5);
    await openCard(id);
    await seekDetail(1.5);
    await page.locator("[data-menu-open]").click();
    await page.locator('[data-language-option="en"]').first().click();
    await page.waitForFunction(() => document.documentElement.lang === "en");
    state = await detail();
    assert.equal(state.mediaId, `${id}-autoplay-video-2`, "locale change keeps the media");
    assert(state.time >= 1.45 && state.time < 3, `locale change keeps the video time: ${state.time}`);
  } finally { await browser.close(); }
});
