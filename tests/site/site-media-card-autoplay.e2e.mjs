import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";

// Lịch phát video card kiểu Pinterest (media-card R4, owner 2026-10-18): tối đa 2 video tắt tiếng cùng phát, là 2 card
// gần giữa vùng trọng tâm, tính lại ngay khi đang cuộn; hover chiếm một suất; mỗi card chạy playlist video của nó rồi lặp;
// reduced motion không tự phát.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const base = process.env.BASE_URL || "http://localhost:8792";
const fixturePrefix = "/__site_media_card_autoplay__/";
const poster = path.join(root, "tests/site/fixtures/site-media-card-poster.webp");
const clip = path.join(root, "tests/site/fixtures/site-media-card-clip-audio.mp4");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");

// Mọi card thành card video để vùng trọng tâm luôn có ứng viên, không phụ thuộc seed của grid. playlist: video, ảnh,
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

const videoState = (page) => page.evaluate(() => {
  const navBottom = Math.max(0, document.querySelector("[data-site-header]")?.getBoundingClientRect().bottom ?? 0);
  const bandTop = navBottom + (innerHeight - navBottom) * 0.3;
  const bandBottom = bandTop + (innerHeight - navBottom) * 0.4;
  const bandCenter = (bandTop + bandBottom) / 2;
  const videos = [...document.querySelectorAll("[data-advertising-card] video")].filter((video) => video.checkVisibility());
  const describe = (video) => {
    const rect = video.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const card = video.closest("[data-advertising-card]");
    return { id: card.dataset.advertisingCard, mediaId: card.dataset.advertisingActiveMediaId, muted: video.muted,
      inBand: center >= bandTop && center <= bandBottom, distance: Math.abs(center - bandCenter),
      x: rect.left + rect.width / 2, y: Math.min(Math.max(center, rect.top + 20), innerHeight - 20),
      visible: rect.top >= 80 && rect.bottom <= innerHeight };
  };
  return {
    playing: videos.filter((video) => !video.paused).map(describe),
    paused: videos.filter((video) => video.paused).map(describe),
    playbackButtons: document.querySelectorAll("[data-advertising-media-playback]").length,
  };
});

async function scroll(page, touch, distance = 4000) {
  if (touch) await page.evaluate((dy) => scrollBy(0, dy), distance);
  // Smooth scroll desktop chỉ trôi theo từng nhịp wheel (hero Advertising còn hãm cuộn), nên cần nhiều nhịp.
  else for (let moved = 0; moved < distance; moved += 250) {
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(120);
  }
}

async function scrollAndSettle(page, touch, distance = 4000) {
  await scroll(page, touch, distance);
  // Smooth scroll desktop còn trôi thêm một lúc.
  await page.waitForTimeout(1500);
}

// Suất phát là 2 card video trong vùng gần giữa vùng nhất.
function assertNearestPlaying(state, label) {
  const inBand = [...state.playing, ...state.paused].filter((video) => video.inBand)
    .sort((a, b) => a.distance - b.distance);
  assert(state.playing.length >= 1 && state.playing.length <= 2, `${label}: one or two videos play: ${JSON.stringify(state.playing)}`);
  assert(state.playing.every((video) => video.muted && video.inBand), `${label}: playing videos are muted and in band: ${JSON.stringify(state.playing)}`);
  assert.deepEqual(state.playing.map((video) => video.id).sort(), inBand.slice(0, 2).map((video) => video.id).sort(),
    `${label}: the two cards nearest the band centre play`);
}

async function playingSettled(page) {
  await page.waitForFunction(() => [...document.querySelectorAll("[data-advertising-card] video")]
    .some((video) => !video.paused), null, { timeout: 5000 });
  await page.waitForTimeout(300);
  return videoState(page);
}

for (const touch of [false, true]) {
  const label = touch ? "touch 390" : "desktop 1440";
  test(`R4 ${label}: the two cards nearest the focus band play muted, no playback button, recomputed while scrolling`, async () => {
    const { browser, page } = await open(touch ? { width: 390, height: 844, touch } : {});
    try {
      await scrollAndSettle(page, touch);
      const state = await playingSettled(page);
      assert.equal(state.playbackButtons, 0, "card video has no playback button");
      assertNearestPlaying(state, `${label} settled`);
      // Đang cuộn (chưa dừng) thì lịch phát đã đổi theo vùng mới.
      await scroll(page, touch, 900);
      await page.waitForTimeout(150);
      const moving = await videoState(page);
      assert(moving.playing.every((video) => video.inBand), `${label}: videos outside the band pause while scrolling: ${JSON.stringify(moving.playing)}`);
      await page.waitForTimeout(1500);
      assertNearestPlaying(await videoState(page), `${label} after scroll`);
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
    const card = first.playing[0];
    assert.equal(card.mediaId, `${card.id}-autoplay-video`);
    await page.waitForFunction((id) => document.querySelector(`[data-advertising-card="${id}"]`)
      ?.dataset.advertisingActiveMediaId === `${id}-autoplay-video-2`, card.id, { timeout: 6000 });
    await page.waitForFunction((id) => document.querySelector(`[data-advertising-card="${id}"]`)
      ?.dataset.advertisingActiveMediaId === `${id}-autoplay-video`, card.id, { timeout: 6000 });
    assert((await videoState(page)).playing.some((video) => video.id === card.id), "the card keeps playing after the loop");
  } finally { await browser.close(); }
});

test("R4 desktop: hover takes one of the two slots; leaving returns to the nearest cards", async () => {
  const { browser, page } = await open();
  try {
    await scrollAndSettle(page, false);
    const before = await playingSettled(page);
    const target = before.paused.find((video) => video.visible);
    assert(target, `a visible paused video card exists: ${JSON.stringify(before)}`);
    await page.mouse.move(target.x, target.y);
    await page.waitForTimeout(600);
    const hovered = await videoState(page);
    assert(hovered.playing.some((video) => video.id === target.id) && hovered.playing.length <= 2,
      `the hovered card plays within two slots: ${JSON.stringify(hovered.playing)}`);
    await page.mouse.move(8, 450);
    await page.waitForTimeout(600);
    assertNearestPlaying(await videoState(page), "after leaving");
  } finally { await browser.close(); }
});

test("R4 reduced motion: no autoplay on scroll, hover still plays", async () => {
  const { browser, page } = await open({ reducedMotion: "reduce" });
  try {
    await scrollAndSettle(page, false);
    const state = await videoState(page);
    assert.equal(state.playing.length, 0, "reduced motion does not autoplay");
    const target = state.paused.find((video) => video.visible);
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
    const { id } = (await playingSettled(page)).playing[0];
    await seekCard(id, 1.2);
    await openCard(id);
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
