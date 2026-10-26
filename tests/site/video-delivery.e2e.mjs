import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";

// Video thích ứng (video-delivery R3, R4, R5): card phát master.m3u8 bằng hls.js chặn ở bậc 480, detail tiếp đúng giây ở
// bậc đầu playlist, viewer giữ instance; không có Media Source hoặc thiếu hlsSrc thì phát file cố định; mạng nhanh lên thì
// phần bậc thấp phía trước được thay mà không khựng. Chromium của Playwright không có H.264 nên thang là bản AV1 nhỏ
// (bậc 640, 240, 480 của clip 6 s, chỉ hình) trong fixtures/video-ladder, sinh bằng ffmpeg libsvtav1 từ
// site-media-card-clip-audio.mp4 lặp hai lần, `-g 12`, HLS fMP4 segment 2 s một file mỗi bậc.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const base = process.env.BASE_URL || "http://localhost:8792";
const ladder = path.join(root, "tests/site/fixtures/video-ladder");
const clip = path.join(root, "tests/site/fixtures/site-media-card-clip-audio.mp4");
const poster = path.join(root, "tests/site/fixtures/site-media-card-poster.webp");
const filePrefix = "/__video_delivery__/";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");

// Server thang có giới hạn băng thông đổi được giữa lượt (0 là không giới hạn), gửi từng mảnh mỗi 50 ms để hls.js đo được
// băng thông; page.route trả cả thân một lần nên không giả lập được mạng chậm.
let kbps = 0;
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "range" };
const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") return response.writeHead(204, cors).end();
  let body = await readFile(path.join(ladder, path.basename(new URL(request.url, "http://x").pathname))).catch(() => null);
  if (!body) return response.writeHead(404, cors).end();
  const headers = { ...cors, "content-type": request.url.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp4" };
  const range = /bytes=(\d+)-(\d*)/.exec(request.headers.range || "");
  if (range) {
    const end = range[2] ? Number(range[2]) : body.length - 1;
    headers["content-range"] = `bytes ${range[1]}-${end}/${body.length}`;
    body = body.subarray(Number(range[1]), end + 1);
  }
  response.writeHead(range ? 206 : 200, headers);
  for (let at = 0; at < body.length;) {
    const size = kbps ? Math.ceil(kbps * 1000 / 8 / 20) : body.length;
    response.write(body.subarray(at, at += size));
    if (kbps && at < body.length) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  response.end();
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
after(() => server.close());
const hlsSrc = `http://127.0.0.1:${server.address().port}/master.m3u8`;

// Mọi card thành một video để luôn có card video trong màn, không phụ thuộc seed của grid.
function fixtureArtifact(hls) {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  for (const card of artifact.cards) {
    card.mediaItems = [{
      ...card.mediaItems[0], id: `${card.id}-ladder`, kind: "video", width: 640, height: 360,
      src: `${filePrefix}clip.mp4`, cardSrc: `${filePrefix}card.mp4`, hlsSrc: hls ? hlsSrc : undefined,
      source: "M00b sealed synthetic fixture", provenance: "Synthetic test-only fixture, not public media.",
      sourceId: "video-delivery:test-only:clip", sha256: "853e4939e6a4627cc7777665283b2affab189132243974a4777f5a955338e827",
      posterSrc: `${filePrefix}poster.webp`, posterWidth: 640, posterHeight: 360, durationSeconds: 6, hasAudio: false,
    }];
    card.coverMediaId = card.mediaItems[0].id;
  }
  return artifact;
}

async function open({ hls = true, mediaSource = true } = {}) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.route(`**${filePrefix}*`, async (route) => {
    if (!route.request().url().endsWith(".mp4")) return route.fulfill({ path: poster, contentType: "image/webp" });
    const body = await readFile(clip);
    const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range || "");
    if (!range) return route.fulfill({ body, contentType: "video/mp4", headers: { "accept-ranges": "bytes" } });
    const end = range[2] ? Number(range[2]) : body.length - 1;
    return route.fulfill({ status: 206, body: body.subarray(Number(range[1]), end + 1), contentType: "video/mp4",
      headers: { "accept-ranges": "bytes", "content-range": `bytes ${range[1]}-${end}/${body.length}` } });
  });
  await page.addInitScript(({ artifact, mediaSource }) => {
    window.__TT_ADVERTISING_ARTIFACT__ = artifact;
    if (!mediaSource) delete window.MediaSource;
  }, { artifact: fixtureArtifact(hls), mediaSource });
  await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.()));
  // Hero Advertising chiếm màn đầu; intro và smooth scroll cần mount xong mới nhận wheel, rồi cuộn để card vào màn.
  await page.waitForTimeout(2500);
  await page.mouse.move(8, 450);
  for (let moved = 0; moved < 1500; moved += 250) {
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(120);
  }
  return { browser, page, requests };
}

// Card video đang phát trong màn, kèm nguồn và bậc hiện tại.
const playingCard = (page) => page.waitForFunction(() => {
  const video = [...document.querySelectorAll("[data-advertising-card] video")].find((node) => !node.paused && node.currentTime > 0.3);
  return video && { id: video.closest("[data-advertising-card]").dataset.advertisingCard, source: video.dataset.videoSource,
    currentSrc: video.currentSrc, width: video.videoWidth, time: video.currentTime };
}, null, { timeout: 30000, polling: 50 }).then((handle) => handle.jsonValue());

test("R3: card plays the ladder capped at 480, detail continues at the top rung, the viewer keeps the instance", async () => {
  kbps = 0;
  const { browser, page } = await open();
  try {
    const card = await playingCard(page);
    assert.equal(card.source, hlsSrc, "card loads master.m3u8 through hls.js");
    assert.equal(card.width, 480, "card is capped at the 480 rung");
    await page.locator(`[data-advertising-card="${card.id}"] > a`).click();
    const detail = await page.waitForFunction(() => {
      const video = document.querySelector("[data-advertising-photo-video]");
      return video.videoWidth && !video.paused && { source: video.dataset.videoSource, width: video.videoWidth, time: video.currentTime };
    }, null, { timeout: 15000, polling: 50 }).then((handle) => handle.jsonValue());
    assert.equal(detail.source, hlsSrc, "primary loads master.m3u8 through hls.js");
    assert.equal(detail.width, 640, "primary starts at the first rung of the playlist");
    assert(detail.time >= card.time - 0.2 && detail.time < card.time + 2, `primary continues from the card time: ${card.time} -> ${detail.time}`);
    const src = await page.locator("[data-advertising-photo-video]").evaluate((video) => video.src);
    await page.locator("[data-advertising-photo-expand]").click();
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-video]").closest("dialog[open]"));
    const viewer = await page.locator("[data-advertising-photo-video]").evaluate((video) => ({ src: video.src, paused: video.paused }));
    assert.deepEqual(viewer, { src, paused: false }, "the viewer plays the same hls.js source without reloading");
  } finally {
    await browser.close();
  }
});

test("R3, R5: without Media Source or without hlsSrc the card plays the fixed file without a playlist", async () => {
  kbps = 0;
  for (const options of [{ mediaSource: false }, { hls: false }]) {
    const { browser, page, requests } = await open(options);
    try {
      const card = await playingCard(page);
      assert(card.currentSrc.endsWith("/card.mp4"), `${JSON.stringify(options)}: card plays cardSrc: ${card.currentSrc}`);
      assert(!requests.some((url) => /\.m3u8/.test(url)), `${JSON.stringify(options)}: no playlist request`);
      // hls.js chỉ tải khi artifact có hlsSrc và trình duyệt có Media Source (R3); catalog chưa có video không tải.
      assert(!requests.some((url) => /hls\.light/.test(url)), `${JSON.stringify(options)}: hls.js never loads`);
    } finally {
      await browser.close();
    }
  }
});

test("R4: when the network speeds up the low rung ahead is replaced at 480 without a stall", async () => {
  kbps = 60;
  const { browser, page } = await open();
  try {
    // Mạng chậm: hls.js xuống bậc thấp nhất (ảnh rộng 242 px) sau segment đầu ở bậc 480 rồi tải hết clip.
    const id = await page.waitForFunction(() => {
      const video = [...document.querySelectorAll("[data-advertising-card] video")].find((node) => !node.paused
        && node.videoWidth && node.videoWidth < 480 && node.buffered.length && node.buffered.end(node.buffered.length - 1) > node.duration - 0.1);
      return video?.closest("[data-advertising-card]").dataset.advertisingCard;
    }, null, { timeout: 45000, polling: 50 }).then((handle) => handle.jsonValue());
    await page.evaluate((cardId) => {
      const video = document.querySelector(`[data-advertising-card="${cardId}"] video:not([hidden])`);
      const log = window.__ladderLog = { frames: [], waiting: [] };
      const frame = (now, meta) => {
        log.frames.push({ now, time: meta.mediaTime, width: meta.width });
        video.requestVideoFrameCallback(frame);
      };
      video.requestVideoFrameCallback(frame);
      video.addEventListener("waiting", () => log.waiting.push({ start: performance.now() }));
      video.addEventListener("playing", () => { const last = log.waiting.at(-1); if (last && !last.end) last.end = performance.now(); });
    }, id);
    // Mạng nhanh lên, rồi một video khác trên trang tải xong segment (gherkin R4).
    kbps = 0;
    await page.evaluate(async (src) => {
      const { setVideoSource } = await import("/advertising-products/video-source.mjs");
      setVideoSource(document.createElement("video"), { hlsSrc: src }, { file: "", capWidth: 480 });
    }, hlsSrc);
    await page.waitForTimeout(4000);
    const log = await page.evaluate(() => window.__ladderLog);
    assert(log.frames.some(({ time, width }) => width === 480 && time >= 2), `a frame past the first segment plays at 480 within 4 s: ${JSON.stringify(log.frames.filter((_, index) => index % 12 === 0))}`);
    const gap = Math.max(...log.frames.slice(1).map((frame, index) => frame.now - log.frames[index].now));
    assert(gap < 250, `no stall while replacing: largest frame gap ${Math.round(gap)} ms`);
    assert(log.waiting.every(({ start, end }) => end && end - start < 100), `no waiting longer than 100 ms: ${JSON.stringify(log.waiting)}`);
  } finally {
    await browser.close();
  }
});
