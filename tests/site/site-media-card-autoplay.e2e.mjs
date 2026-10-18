import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";

// Lịch phát video card kiểu Pinterest (media-card R4): mỗi lúc một video tắt tiếng, tự phát trong vùng trọng tâm khi
// cuộn dừng, hover phát card đó, rời card thì dừng, reduced motion không tự phát.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const base = process.env.BASE_URL || "http://localhost:8792";
const fixturePrefix = "/__site_media_card_autoplay__/";
const poster = path.join(root, "tests/site/fixtures/site-media-card-poster.webp");
const clip = path.join(root, "tests/site/fixtures/site-media-card-clip-audio.mp4");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");

// Mọi card thành card một video để vùng trọng tâm luôn có ứng viên, không phụ thuộc seed của grid.
function fixtureArtifact() {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  for (const card of artifact.cards) {
    const video = {
      ...card.mediaItems[0], id: `${card.id}-autoplay-video`, kind: "video",
      src: `${fixturePrefix}clip.mp4`, width: 640, height: 360, sourceId: "autoplay:test-only:clip",
      source: "M00b sealed synthetic fixture",
      sha256: "853e4939e6a4627cc7777665283b2affab189132243974a4777f5a955338e827",
      provenance: "Synthetic test-only fixture, not public media.",
      posterSrc: `${fixturePrefix}poster.webp`, posterWidth: 640, posterHeight: 360,
      durationSeconds: 3, hasAudio: true,
    };
    card.mediaItems = [video];
    card.coverMediaId = video.id;
  }
  return artifact;
}

async function open({ width = 1440, height = 900, touch = false, reducedMotion = "no-preference" } = {}) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion });
  await page.route(`**${fixturePrefix}*`, (route) => {
    const isVideo = route.request().url().endsWith(".mp4");
    return route.fulfill({ path: isVideo ? clip : poster, contentType: isVideo ? "video/mp4" : "image/webp" });
  });
  await page.addInitScript((artifact) => { window.__TT_ADVERTISING_ARTIFACT__ = artifact; }, fixtureArtifact());
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
  const videos = [...document.querySelectorAll("[data-advertising-card] video")].filter((video) => video.checkVisibility());
  const describe = (video) => {
    const rect = video.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    return { id: video.closest("[data-advertising-card]").dataset.advertisingCard, muted: video.muted,
      inBand: center >= bandTop && center <= bandBottom, x: rect.left + rect.width / 2,
      y: Math.min(Math.max(center, rect.top + 20), innerHeight - 20), visible: rect.top >= 80 && rect.bottom <= innerHeight };
  };
  return {
    playing: videos.filter((video) => !video.paused).map(describe),
    paused: videos.filter((video) => video.paused).map(describe),
    playbackButtons: document.querySelectorAll("[data-advertising-media-playback]").length,
  };
});

async function scrollAndSettle(page, touch, distance = 4000) {
  if (touch) await page.evaluate((dy) => scrollBy(0, dy), distance);
  // Smooth scroll desktop chỉ trôi theo từng nhịp wheel (hero Advertising còn hãm cuộn), nên cần nhiều nhịp.
  else for (let moved = 0; moved < distance; moved += 250) {
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(120);
  }
  // Lịch phát chờ cuộn yên 200ms; smooth scroll desktop còn trôi thêm một lúc.
  await page.waitForTimeout(1500);
}

async function expectOnePlaying(page) {
  await page.waitForFunction(() => [...document.querySelectorAll("[data-advertising-card] video")]
    .filter((video) => !video.paused).length === 1, null, { timeout: 5000 });
  return videoState(page);
}

for (const touch of [false, true]) {
  const label = touch ? "touch 390" : "desktop 1440";
  test(`R4 ${label}: scroll settle plays exactly one muted video inside the focus band, no playback button`, async () => {
    const { browser, page } = await open(touch ? { width: 390, height: 844, touch } : {});
    try {
      await scrollAndSettle(page, touch);
      const state = await expectOnePlaying(page);
      assert.equal(state.playbackButtons, 0, "card video has no playback button");
      assert(state.playing[0].muted && state.playing[0].inBand, `playing video is muted and in band: ${JSON.stringify(state.playing)}`);
      await scrollAndSettle(page, touch, 900);
      const next = await expectOnePlaying(page);
      assert(next.playing[0].inBand, `after scrolling the player moves into the new band: ${JSON.stringify(next.playing)}`);
    } finally { await browser.close(); }
  });
}

test("R4 desktop: a finished round hands the player to another card in the band", async () => {
  const { browser, page } = await open();
  try {
    await scrollAndSettle(page, false);
    const first = await expectOnePlaying(page);
    const candidates = first.paused.filter((video) => video.inBand).length;
    // Clip fixture dài 3s; chờ hết vòng.
    await page.waitForTimeout(4500);
    const next = await expectOnePlaying(page);
    if (candidates > 0) assert.notEqual(next.playing[0].id, first.playing[0].id, "next round picks a card not played this cycle");
    assert(next.playing[0].inBand);
  } finally { await browser.close(); }
});

test("R4 desktop: hover plays that card and pauses the previous one; leaving pauses all until the next scroll", async () => {
  const { browser, page } = await open();
  try {
    await scrollAndSettle(page, false);
    const before = await expectOnePlaying(page);
    const target = before.paused.find((video) => video.visible);
    assert(target, `a second visible video card exists: ${JSON.stringify(before)}`);
    await page.mouse.move(target.x, target.y);
    await page.waitForTimeout(600);
    const hovered = await videoState(page);
    assert.deepEqual(hovered.playing.map((video) => video.id), [target.id], `only the hovered card plays: ${JSON.stringify(hovered.playing)}`);
    await page.mouse.move(8, 450);
    await page.waitForTimeout(1500);
    assert.equal((await videoState(page)).playing.length, 0, "leaving the card pauses every video");
    await scrollAndSettle(page, false);
    await expectOnePlaying(page);
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
