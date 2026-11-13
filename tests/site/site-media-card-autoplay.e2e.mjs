import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";

// Card video playback schedule (media-card R4, owner 2026-10-24): masonry plays every video card muted when more than 1/2 of its height shows
// below the navbar, recomputed immediately while scrolling; hover does not make a card play; related in detail autoplays like masonry (owner
// 2026-10-25); reduced motion only plays the card under the cursor; a card with several media plays its video to the end, then the card
// slideshow moves it on (owner 2026-11-13; the slideshow itself: site-media-card-slideshow.e2e.mjs).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const base = process.env.BASE_URL || "http://localhost:8792";
const fixturePrefix = "/__site_media_card_autoplay__/";
const poster = path.join(root, "tests/site/fixtures/site-media-card-poster.webp");
const clip = path.join(root, "tests/site/fixtures/site-media-card-clip-audio.mp4");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");

// Every card becomes a video card so the schedule always has candidates, independent of the grid seed. playlist: video, image,
// second video, to check the slideshow plays each video to its end and stands on the image.
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
    // Return 206 for Range so Chrome treats the clip as seekable, so the video second can carry over between card and detail.
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
  await page.waitForFunction(() => Boolean(window.TruongThinhMasonry?.getAdapter?.()));
  await page.waitForFunction(() => document.querySelectorAll("[data-masonry-card] video").length >= 4);
  // The hero intro and smooth scroll must finish mounting before they accept wheel.
  await page.waitForTimeout(2500);
  // The pointer sits at the left margin, outside every card, so hover does not interfere with the schedule.
  if (!touch) await page.mouse.move(8, height / 2);
  return { browser, page };
}

// visibleRatio: the part of the video showing below the navbar divided by the video height.
const videoState = (page, selector = "[data-masonry-card]") => page.evaluate((cardSelector) => {
  const navBottom = Math.max(0, document.querySelector("[data-site-header]")?.getBoundingClientRect().bottom ?? 0);
  const videos = [...document.querySelectorAll(`${cardSelector} video`)].filter((video) => video.checkVisibility());
  const describe = (video) => {
    const rect = video.getBoundingClientRect();
    const top = Math.max(rect.top, navBottom);
    const bottom = Math.min(rect.bottom, innerHeight);
    const card = video.closest(cardSelector);
    return { id: card.dataset.masonryCard ?? card.dataset.masonryRelatedCard,
      mediaId: card.dataset.masonryActiveMediaId, muted: video.muted, visibleRatio: (bottom - top) / rect.height,
      x: rect.left + rect.width / 2, y: (top + bottom) / 2 };
  };
  return {
    playing: videos.filter((video) => !video.paused).map(describe),
    paused: videos.filter((video) => video.paused).map(describe),
    playbackButtons: document.querySelectorAll("[data-masonry-media-playback]").length,
  };
}, selector);

async function scroll(page, touch, distance = 4000) {
  if (touch) await page.evaluate((dy) => scrollBy(0, dy), distance);
  // Desktop smooth scroll only drifts per wheel tick (the Advertising hero also damps scrolling), so many ticks are needed.
  else for (let moved = 0; moved < distance; moved += 250) {
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(120);
  }
}

async function settle(page) {
  // Desktop smooth scroll keeps drifting a while; wait for Locomotive to remove the scrolling class then a few more frames for the playback schedule.
  await page.waitForTimeout(300);
  await page.waitForFunction(() => !document.documentElement.classList.contains("has-scroll-scrolling"), null, { timeout: 10000 });
  await page.waitForTimeout(300);
}

async function scrollAndSettle(page, touch, distance = 4000) {
  await scroll(page, touch, distance);
  await settle(page);
}

// Every video showing more than 1/2 of its height below the navbar plays muted, the rest pause. margin for while scrolling: the schedule is computed in
// the frame before measuring so a video right at the threshold can be off by one frame.
function assertHalfVisiblePlaying(state, label, margin = 0) {
  assert(state.playing.length >= 3, `${label}: every half-visible card plays, not two slots: ${JSON.stringify(state.playing)}`);
  assert(state.playing.every((video) => video.muted && video.visibleRatio > 0.5 - margin),
    `${label}: playing videos are muted and more than half visible: ${JSON.stringify(state.playing)}`);
  assert(state.paused.every((video) => video.visibleRatio <= 0.5 + margin),
    `${label}: videos more than half visible are not paused: ${JSON.stringify(state.paused.filter((video) => video.visibleRatio > 0.5))}`);
}

async function playingSettled(page, selector = "[data-masonry-card]") {
  await page.waitForFunction((cardSelector) => [...document.querySelectorAll(`${cardSelector} video`)]
    .some((video) => !video.paused), selector, { timeout: 5000 });
  await page.waitForTimeout(300);
  return videoState(page, selector);
}

// The schedule starts one video per frame (R4), so several cards showing together need a few frames to all play: wait until no
// video over 1/2 is still waiting, after 5s return the state at that moment for the assert.
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
      // While scrolling (not stopped) the playback schedule has changed with the new position. Touch jumps 900px at once so many cards show together,
      // the schedule starts one video per frame (R4): wait like allStarted instead of the 150ms mark (red 2/2 runs of the full suite 2026-10-26).
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
    // The fixture clip is 3s long; wait for one full loop.
    await page.waitForTimeout(4500);
    const next = await videoState(page);
    assert.deepEqual(next.playing.map((video) => video.id).sort(), first.playing.map((video) => video.id).sort(),
      "the same cards keep playing after the clip ends");
  } finally { await browser.close(); }
});

test("R4 desktop: a card plays a video to its end, stands on the image, plays the next video, then wraps forward", async () => {
  const { browser, page } = await open({ playlist: true });
  const active = (id) => page.evaluate((cardId) => document.querySelector(`[data-masonry-card="${cardId}"]`)
    ?.dataset.masonryActiveMediaId, id);
  const waitFor = (id, suffix, timeout = 15000) => page.waitForFunction(({ cardId, mediaId }) => document
    .querySelector(`[data-masonry-card="${cardId}"]`)?.dataset.masonryActiveMediaId === mediaId,
  { cardId: id, mediaId: `${id}-autoplay-${suffix}` }, { timeout });
  try {
    await scrollAndSettle(page, false);
    const first = await playingSettled(page);
    // The card entered the schedule while scrolling so it may already be further on; pick the card that is on video 1.
    const card = first.playing.find((video) => video.mediaId === `${video.id}-autoplay-video`);
    assert(card, `a playing card is on its first video: ${JSON.stringify(first.playing)}`);
    // Every card showing over 1/2 plays together so headless Chromium decodes slowly, a 3s clip sometimes runs to 6s.
    await waitFor(card.id, "image");
    const atImage = Date.now();
    await waitFor(card.id, "video-2", 15000);
    const stood = Date.now() - atImage;
    assert(stood >= 3500, `the card stands about 4s on the image: ${stood}ms`);
    assert((await videoState(page)).playing.some((video) => video.id === card.id), "the next video plays");
    await waitFor(card.id, "video");
    assert.equal(await active(card.id), `${card.id}-autoplay-video`, "after the last media the card wraps to the first");
  } finally { await browser.close(); }
});

test("R4 desktop: hovering a masonry card at half visible or less does not play it", async () => {
  const { browser, page } = await open();
  try {
    await scrollAndSettle(page, false);
    let target;
    // Find a video card showing partly (1/2 or less) to hover over the visible part.
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
  const related = "[data-masonry-related-card]";
  try {
    await page.locator("[data-masonry-card] > a").first().click();
    await page.waitForFunction(() => document.body.classList.contains("is-detail"));
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

// Card and detail keep the same media and video second when going back and forth (owner 2026-10-18): card to detail, Back to masonry.
// A language change reloads the page like F5 (owner 2026-11-08) so it no longer keeps media or second.
test("R4 desktop: the viewed media and video time carry from card to detail and back to masonry", async () => {
  const { browser, page } = await open({ playlist: true });
  const detail = () => page.evaluate(() => {
    const view = document.querySelector("[data-detail-view]");
    const video = view.querySelector("[data-detail-video]");
    return { mediaId: view.dataset.masonryActiveMediaId, time: video.currentTime };
  });
  const card = (id) => page.evaluate((cardId) => {
    const node = document.querySelector(`[data-masonry-card="${cardId}"]`);
    return { mediaId: node.dataset.masonryActiveMediaId, time: node.advertisingActiveVideo?.()?.currentTime ?? null };
  }, id);
  const seekCard = (id, time) => page.evaluate(({ cardId, seconds }) => {
    document.querySelector(`[data-masonry-card="${cardId}"]`).advertisingActiveVideo().currentTime = seconds;
  }, { cardId: id, seconds: time });
  const seekDetail = (time) => page.evaluate(async (seconds) => {
    const video = document.querySelector("[data-detail-video]");
    video.pause();
    video.currentTime = seconds;
    await new Promise((resolve) => video.addEventListener("seeked", resolve, { once: true }));
  }, time);
  const openCard = async (id) => {
    await page.locator(`[data-masonry-card="${id}"] > a`).click();
    await page.waitForFunction(() => document.body.classList.contains("is-detail"));
    await page.waitForFunction(() => document.querySelector("[data-detail-video]").readyState >= 1);
  };
  try {
    await scrollAndSettle(page, false);
    const { id } = (await playingSettled(page)).playing.find((video) => video.mediaId === `${video.id}-autoplay-video`);
    const cardSource = await page.evaluate((cardId) =>
      document.querySelector(`[data-masonry-card="${cardId}"]`).advertisingActiveVideo().currentSrc, id);
    assert(cardSource.endsWith("/card.mp4"), `card plays cardSrc: ${cardSource}`);
    await seekCard(id, 1.2);
    await openCard(id);
    const detailSource = await page.evaluate(() => document.querySelector("[data-detail-video]").currentSrc);
    assert(detailSource.endsWith("/clip.mp4"), `detail plays src: ${detailSource}`);
    let state = await detail();
    assert.equal(state.mediaId, `${id}-autoplay-video`, "detail opens on the card's media");
    assert(state.time >= 1.2 && state.time < 3, `detail video continues from the card time: ${state.time}`);

    for (let step = 0; step < 2; step += 1) {
      await page.locator('[data-detail-media-step="1"]').click();
      // The strip releases when the target media has fully entered the frame and photoVideo has received the target video (media-card R6).
      await page.waitForFunction(() => !document.querySelector(".detail-view__strip"));
    }
    assert.equal((await detail()).mediaId, `${id}-autoplay-video-2`);
    await seekDetail(2);
    await page.goBack();
    await page.waitForFunction(() => !document.body.classList.contains("is-detail"));
    state = await card(id);
    assert.equal(state.mediaId, `${id}-autoplay-video-2`, "Back leaves the card on the media viewed in detail");
    assert(state.time >= 1.9, `the card video resumes from the detail time: ${state.time}`);

  } finally { await browser.close(); }
});
