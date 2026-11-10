import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const base = process.env.BASE_URL || "http://localhost:8792";
const outputDir = process.env.SITE_MEDIA_OUTPUT_DIR;
const cardId = "signage-raised-letters-08";
const fixturePrefix = "/__site_media_card_r6__/";
const poster = path.join(root, "tests/site/fixtures/site-media-card-poster.webp");
const clip = path.join(root, "tests/site/fixtures/site-media-card-clip-audio.mp4");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");

function fixtureArtifact(count, videoCover) {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  const card = artifact.cards.find((item) => item.id === cardId);
  assert(card && card.media.width === 3072 && card.media.height === 3072);
  const image = {
    ...card.mediaItems[0], id: `${cardId}-r6-image-1`, kind: "image",
    src: `${fixturePrefix}poster.webp`, width: 640, height: 360,
    sourceId: "r6:test-only:poster", source: "M00b sealed synthetic fixture",
    sha256: "5e55b48ce48a2de66737178f32d9c19b1c175dabb4d312a7d05ef7d0e9b853ba",
    provenance: "Synthetic test-only fixture, not public media.",
  };
  const images = Array.from({ length: count }, (_, index) => ({ ...image, id: `${cardId}-r6-image-${index + 1}` }));
  if (videoCover) {
    images[0] = {
      ...image, id: `${cardId}-r6-video`, kind: "video",
      src: `${fixturePrefix}clip-audio.mp4`, sourceId: "r6:test-only:clip",
      sha256: "853e4939e6a4627cc7777665283b2affab189132243974a4777f5a955338e827",
      posterSrc: image.src, posterWidth: 640, posterHeight: 360,
      durationSeconds: 3, hasAudio: true,
    };
  }
  card.mediaItems = images;
  card.coverMediaId = images[0].id;
  return artifact;
}

async function setup(page, locale, count, videoCover, surface = "related", mode = "normal", videoGate = null) {
  await page.route(`**${fixturePrefix}*`, async (route) => {
    const isVideo = route.request().url().endsWith(".mp4");
    if (isVideo && mode === "slow") await videoGate;
    if (isVideo && mode === "error") return route.fulfill({ status: 404, body: "missing clip" });
    await route.fulfill({ path: isVideo ? clip : poster, contentType: isVideo ? "video/mp4" : "image/webp" });
  });
  await page.addInitScript((artifact) => { window.__TT_ADVERTISING_ARTIFACT__ = artifact; }, fixtureArtifact(count, videoCover));
  const search = surface === "related"
    ? "?category=signage-raised-letters&photo=signage-raised-letters-02"
    : "?category=signage-raised-letters";
  await page.goto(`${base}/${locale}/advertising-products/${search}`,
    { waitUntil: "domcontentloaded" });
  // Direct-load veil chặn pointer input cho đến khi trang mount xong.
  await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
  await page.waitForFunction(() => Boolean(window.TruongThinhMasonry?.getAdapter?.()));
  const selector = `[data-masonry-${surface === "related" ? "related-card" : "card"}="${cardId}"]`;
  if (surface === "related") {
    await page.locator("[data-detail-related-grid]").scrollIntoViewIfNeeded();
    // Cuộn mượt của site chỉ đi khoảng 60px mỗi lần và thứ tự related xáo theo lượt xem: card có lúc nằm ở vị trí 36,
    // cần 32 lần (đo 2026-10-26), nên ngân sách 32 lần đỏ chập chờn. 120 lần phủ hết trang (khoảng 5.400px).
    for (let attempt = 0; attempt < 120 && await page.locator(selector).count() === 0; attempt += 1) {
      await page.evaluate(() => scrollBy(0, innerHeight * 0.7));
      await page.waitForTimeout(80);
    }
  } else {
    await page.evaluate((id) => window.TruongThinhMasonry.getAdapter().ensurePhoto(id), cardId);
  }
  const card = page.locator(selector);
  await card.waitFor({ state: "visible" });
  await card.scrollIntoViewIfNeeded();
  let previous = null;
  let stable = 0;
  let layoutSettled = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const positions = await page.evaluate((kind) => [...document.querySelectorAll(kind === "related"
      ? "[data-masonry-related-card]" : "[data-masonry-card]")]
      .filter((node) => !node.hidden).map((node) => {
        const rect = node.getBoundingClientRect();
        return { id: node.dataset.masonryRelatedCard ?? node.dataset.masonryCard, x: rect.x, y: rect.y };
      }), surface);
    stable = previous && positions.length === previous.length && positions.every((item, index) =>
      item.id === previous[index].id && Math.abs(item.x - previous[index].x) <= 0.5
        && Math.abs(item.y - previous[index].y) <= 0.5) ? stable + 1 : 0;
    if (stable >= 5) {
      layoutSettled = true;
      break;
    }
    previous = positions;
    await page.waitForTimeout(100);
  }
  if (!layoutSettled) throw new Error(`R6 ${surface} layout did not settle before pointer measurement`);
  await card.evaluate(async (node) => {
    let previous = null;
    let stable = 0;
    for (let frame = 0; frame < 100; frame += 1) {
      node.scrollIntoView({ block: "center", behavior: "instant" });
      await new Promise(requestAnimationFrame);
      const box = node.getBoundingClientRect();
      const current = { top: box.top, bottom: box.bottom, left: box.left, right: box.right, scrollY };
      stable = previous && Object.keys(current).every((key) => Math.abs(current[key] - previous[key]) <= 0.5)
        ? stable + 1 : 0;
      if (stable >= 4 && box.top >= 100 && box.bottom <= innerHeight - 16
        && box.left >= 0 && box.right <= innerWidth) return;
      previous = current;
    }
    throw new Error(`R6 ${node.dataset.masonryRelatedCard ? "related" : "grid"} card stayed outside the safe viewport: ${JSON.stringify({ previous, viewportHeight: innerHeight })}`);
  });
  return card;
}

async function geometry(card) {
  return card.evaluate((node) => {
    const rect = (item) => {
      const { x, y, width, height, top, right, bottom, left } = item.getBoundingClientRect();
      return { x, y, width, height, top, right, bottom, left };
    };
    const media = node.querySelector(".card-media");
    const mediaRect = rect(media);
    const indicator = node.querySelector("[data-masonry-media-indicator]");
    const peers = [...document.querySelectorAll(node.dataset.masonryRelatedCard
      ? "[data-masonry-related-card]" : "[data-masonry-card]")]
      .filter((item) => item !== node && !item.hidden).map(rect);
    const controls = [...node.querySelectorAll("[data-masonry-media-select]")]
      .map((button) => {
        const box = rect(button);
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        const hit = document.elementFromPoint(x, y);
        const blocker = hit?.closest("[data-masonry-related-card]");
        return { id: button.dataset.masonryMediaSelect,
          box, hitSelf: hit === button, hitTag: hit?.tagName ?? null,
          hitStack: hit === button ? null : document.elementsFromPoint(x, y).slice(0, 5)
            .map((item) => ({ tag: item.tagName, className: String(item.className || ""),
              relatedId: item.closest("[data-masonry-related-card]")?.dataset.masonryRelatedCard ?? null })),
          edgeHitStacks: [box.left + 3, box.right - 3].map((edgeX) =>
            document.elementFromPoint(edgeX, y) === button ? null : document.elementsFromPoint(edgeX, y).slice(0, 5)
              .map((item) => ({ tag: item.tagName, className: String(item.className || ""),
                relatedId: item.closest("[data-masonry-related-card]")?.dataset.masonryRelatedCard ?? null }))),
          hitCard: blocker?.dataset.masonryRelatedCard ?? null, blocker: blocker ? rect(blocker) : null,
          withinMedia: box.left >= mediaRect.left - 0.5 && box.right <= mediaRect.right + 0.5
            && box.top >= mediaRect.top - 0.5 && box.bottom <= mediaRect.bottom + 0.5 };
      });
    const playback = node.querySelector("[data-masonry-media-playback]");
    const duration = node.querySelector("[data-masonry-media-duration]");
    const loading = node.querySelector("[data-masonry-media-loading]");
    const count = node.querySelector("[data-masonry-media-count]");
    const playbackRect = playback && !playback.hidden ? rect(playback) : null;
    const edgeHitSelf = (button) => {
      const box = rect(button);
      return [box.left + 3, box.right - 3].every((x) =>
        document.elementFromPoint(x, box.top + box.height / 2) === button);
    };
    const dot = node.querySelector(".card-media__dot");
    const dotStyle = dot && getComputedStyle(dot, "::before");
    const pill = node.querySelector(".card-media__pill");
    const pillStyle = pill && getComputedStyle(pill);
    return { card: rect(node), media: mediaRect, indicator: indicator ? rect(indicator) : null, peers, controls,
      dotVisualSize: dotStyle ? { width: parseFloat(dotStyle.width) + 2 * parseFloat(dotStyle.borderLeftWidth),
        height: parseFloat(dotStyle.height) + 2 * parseFloat(dotStyle.borderTopWidth) } : null,
      customMediaHeight: getComputedStyle(node).getPropertyValue("--masonry-media-height"),
      playback: playbackRect,
      controlEdgeHitSelf: [...node.querySelectorAll("[data-masonry-media-select]")]
        .map((button) => edgeHitSelf(button)),
      duration: duration ? rect(duration) : null,
      loading: loading && !loading.hidden ? rect(loading) : null,
      count: count ? rect(count) : null,
      pill: pill && pillStyle.display !== "none"
        ? { ...rect(pill), background: pillStyle.backgroundColor, radius: pillStyle.borderRadius } : null };
  });
}

const overlap = (a, b) => a && b ? Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) : 0;
const inside = (box, parent) => box && parent && box.left >= parent.left - 0.5 && box.right <= parent.right + 0.5
  && box.top >= parent.top - 0.5 && box.bottom <= parent.bottom + 0.5;
// Pill row (owner 2026-11-10, media-card R2): cards show no video duration pill; the dots or counter stay centred.
function assertPillRow(state, label) {
  const { pill, duration, media } = state;
  const centre = (box) => (box.left + box.right) / 2;
  assert.equal(duration, null, `${label} card shows no duration pill: ${JSON.stringify(state)}`);
  assert(pill.left >= media.left + 8 - 0.5 && pill.right <= media.right - 8 + 0.5
    && Math.abs(centre(pill) - centre(media)) <= 1, `${label} centre pill is centred inside the insets: ${JSON.stringify(state)}`);
}

const stableRect = (before, after, label) => {
  for (const key of ["x", "y", "width", "height"]) {
    assert(Math.abs(before[key] - after[key]) <= 1, `${label} ${key} changed: ${JSON.stringify({ before, after })}`);
  }
};

async function runCard(locale, count, surface, width) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const card = await setup(page, locale, count, true, surface);
    const initial = await geometry(card);
    const url = page.url();
    const label = `${locale}-${width}-${surface}-${count}`;
    if (outputDir) await writeFile(path.join(outputDir, `r6-${label}-before.json`), JSON.stringify({ initial, url }, null, 2));
    assert(Math.abs(initial.media.height - initial.media.width * 9 / 16) <= 1,
      `${label} canvas must use the authored 16:9 cover: ${JSON.stringify(initial)}`);
    // Owner 2026-11-10 (media-card R2): the pill row sits inside the media, so the card is exactly as tall as its media.
    assert(Math.abs(initial.card.height - initial.media.height) <= 1,
      `${label} card adds no strip below the media: ${JSON.stringify(initial)}`);
    assert(initial.indicator && inside(initial.indicator, initial.media)
      && Math.abs(initial.indicator.bottom - initial.media.bottom) <= 1
      && Math.abs(initial.indicator.height - (count >= 6 ? 39.2 : 40)) <= 1,
    `${label} pill row must sit at the bottom inside the media: ${JSON.stringify(initial)}`);
    assertPillRow(initial, label);
    // Từ 6 media dải chỉ có bộ đếm (owner 2026-10-18); đổi media bằng vuốt, không có nút trong dải.
    assert.equal(initial.controls.length, count >= 6 ? 0 : count);
    // Owner 2026-11-10: dots or the counter sit in a Pinterest counter pill (charcoal 0.8, radius 12px), centred in the row;
    // the dots pill is 16px tall, the counter pill 4px 8px around 12px text.
    assert(initial.pill?.background === "rgba(51, 51, 51, 0.8)" && initial.pill.radius === "12px"
      && Math.abs(initial.pill.height - (count >= 6 ? 27.2 : 16)) <= 0.5
      // Pill 12px above the card edge, like the bottom buttons of a hovered Pinterest pin (owner 2026-11-10).
      && Math.abs(initial.media.bottom - initial.pill.bottom - 12) <= 0.5
      && inside(initial.pill, initial.indicator), `${label} indicator sits in a pill: ${JSON.stringify(initial.pill)}`);
    if (count >= 6) {
      assert(inside(initial.count, initial.indicator), `${label} numeric count must fit the footer`);
      assert(inside(initial.count, initial.pill), `${label} numeric count sits inside the pill`);
    } else {
      assert(initial.controls.every((control) => Math.abs(control.box.width - 16) <= 0.5
        && Math.abs(control.box.height - 40) <= 0.5),
      `${label} dots need 16x40 pointer targets: ${JSON.stringify(initial.controls)}`);
      assert(Math.abs(initial.dotVisualSize.width - 8) <= 1 && Math.abs(initial.dotVisualSize.height - 8) <= 1,
        `${label} visible dot should be about 8px: ${JSON.stringify(initial.dotVisualSize)}`);
      assert(initial.controls.every((control) => Math.abs(control.box.top - initial.controls[0].box.top) <= 1),
        `${label} dots must occupy one row: ${JSON.stringify(initial.controls)}`);
    }
    for (let i = 0; i < initial.controls.length; i += 1) {
      assert(inside(initial.controls[i].box, initial.indicator),
        `${label} control must fit owner footer: ${JSON.stringify(initial.controls[i])}`);
      for (let j = i + 1; j < initial.controls.length; j += 1) {
        assert(overlap(initial.controls[i].box, initial.controls[j].box) <= 0.5,
          `${label} media controls overlap: ${JSON.stringify(initial)}`);
      }
      assert(initial.peers.every((peer) => overlap(initial.controls[i].box, peer) <= 0.5),
        `${label} footer control overlaps another card: ${JSON.stringify(initial)}`);
    }
    assert(initial.controlEdgeHitSelf.every(Boolean), `${label} control edge must receive pointer: ${JSON.stringify(initial)}`);
    // Video card: no play button on the canvas (R4).
    assert.equal(initial.playback, null, `${label} video has no playback button: ${JSON.stringify(initial)}`);
    assert(initial.peers.every((peer) => overlap(initial.indicator, peer) <= 0.5),
      `${label} footer must not overlap another card: ${JSON.stringify(initial)}`);
    if (initial.loading) assert(inside(initial.loading, initial.media), `${label} loading circle remains inside media`);
    if (outputDir && locale === "vi" && count === 6) {
      await page.screenshot({ path: path.join(outputDir, `r6-${label}.png`) });
    }
    assert.equal(await card.getAttribute("data-masonry-active-media-id"), `${cardId}-r6-video`);
    if (count >= 6) return;
    const control = card.locator(`[data-masonry-media-select="${cardId}-r6-image-${count}"]`);
    const controlBox = initial.controls.find((item) => item.id === `${cardId}-r6-image-${count}`).box;
    let clickError = null;
    try { await page.mouse.click(controlBox.right - 3, controlBox.top + controlBox.height / 2); }
    catch (error) { clickError = error.message.split("\n").slice(0, 8).join(" "); }
    if (outputDir) await writeFile(path.join(outputDir, `r6-${label}-pointer.json`),
      JSON.stringify({ initial, clickError }, null, 2));
    assert.equal(clickError, null, `${label} real pointer click must reach its control: ${clickError}`);
    assert.equal(await card.getAttribute("data-masonry-active-media-id"), `${cardId}-r6-image-${count}`);
    assert.equal(await control.getAttribute("aria-current"), "true");
    assert.equal(page.url(), url, "media selection does not open detail or change URL");
    const after = await geometry(card);
    stableRect(initial.media, after.media, `${label} canvas`);
    stableRect(initial.card, after.card, `${label} card`);
    stableRect(initial.indicator, after.indicator, `${label} footer`);
    if (outputDir) await writeFile(path.join(outputDir, `r6-${label}-after.json`), JSON.stringify({ after, url: page.url() }, null, 2));
    assert(initial.controls.every((item) => item.hitSelf),
      `${label} controls must be hittable: ${JSON.stringify({ initial, after })}`);
  } finally { await browser.close(); }
}

for (const locale of ["vi", "en"]) {
  for (const width of [320, 390]) {
    for (const surface of ["grid", "related"]) {
      for (const count of [5, 6, 7]) {
        test(`R6-R3 ${locale.toUpperCase()}${width} ${surface} ${count} media keep the pill row inside the media and real edge pointer`,
          async () => runCard(locale, count, surface, width));
      }
    }
  }
}

test("R6-R3 public legacy catalog keeps 285 image-only cards", () => {
  assert.equal(ADVERTISING_CATALOG_ARTIFACT.cards.length, 285);
  assert(ADVERTISING_CATALOG_ARTIFACT.cards.every((card) => card.mediaItems?.length === 1
    && card.mediaItems[0].kind === "image"));
});

async function runSingleton(locale, surface, width, videoCover) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const card = await setup(page, locale, 1, videoCover, surface);
    const state = await geometry(card);
    const label = `${locale}-${width}-${surface}-${videoCover ? "video" : "image"}-singleton`;
    if (outputDir) await writeFile(path.join(outputDir, `r6-${label}.json`), JSON.stringify(state, null, 2));
    assert(Math.abs(state.card.height - state.media.height) <= 1, `${label} must not reserve a footer`);
    // A singleton has no pill row, and a video shows no duration pill (media-card R2, owner 2026-11-10).
    assert.equal(state.indicator, null, `${label} must not render an indicator`);
    assert.equal(state.duration, null, `${label} shows no duration pill`);
    assert.equal(state.controls.length, 0);
    assert.equal(await card.getAttribute("data-masonry-active-media-id"),
      `${cardId}-r6-${videoCover ? "video" : "image-1"}`);
    assert.equal(state.playback, null);
  } finally { await browser.close(); }
}

test("R6-R3 VI320 grid singleton video has no footer", async () => runSingleton("vi", "grid", 320, true));
test("R6-R3 EN390 related singleton nonlegacy image has no footer", async () => runSingleton("en", "related", 390, false));

async function runStableDelivery(locale, surface, width, mode) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
  let releaseVideo = () => {};
  const videoGate = new Promise((resolve) => { releaseVideo = resolve; });
  try {
    const card = await setup(page, locale, 2, true, surface, mode, videoGate);
    const selector = `[data-masonry-${surface === "related" ? "related-card" : "card"}="${cardId}"]`;
    const first = await geometry(card);
    const url = page.url();
    assert(Math.abs(first.card.height - first.media.height) <= 1
      && Math.abs(first.indicator.bottom - first.media.bottom) <= 1,
    `${mode} starts with the pill row inside the media`);
    await card.locator(`[data-masonry-media-select="${cardId}-r6-image-2"]`).click();
    const slide = await geometry(card);
    await card.locator(`[data-masonry-media-select="${cardId}-r6-video"]`).click();
    const pending = await geometry(card);
    releaseVideo();
    await page.waitForFunction(({ selector, mode }) => {
      const card = document.querySelector(selector);
      const video = card?.querySelector("video");
      return mode === "slow" ? video?.readyState >= 2
        : Boolean(video?.error && card.querySelector("[data-masonry-media-loading]")?.hidden);
    }, { selector, mode }, { timeout: 5000 });
    const settled = await geometry(card);
    const label = `${locale}-${width}-${surface}-${mode}`;
    for (const [phase, state] of [["slide", slide], ["pending", pending], ["settled", settled]]) {
      stableRect(first.card, state.card, `${label} ${phase} card`);
      stableRect(first.media, state.media, `${label} ${phase} canvas`);
      stableRect(first.indicator, state.indicator, `${label} ${phase} footer`);
    }
    assert.equal(page.url(), url);
    if (outputDir) await writeFile(path.join(outputDir, `r6-${label}.json`),
      JSON.stringify({ first, slide, pending, settled, url }, null, 2));
  } finally { releaseVideo(); await browser.close(); }
}

test("R6-R3 VI320 related slow video keeps card canvas footer rects", async () =>
  runStableDelivery("vi", "related", 320, "slow"));
test("R6-R3 EN390 grid error video keeps card canvas footer rects", async () =>
  runStableDelivery("en", "grid", 390, "error"));
