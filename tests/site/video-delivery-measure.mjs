// Đo nghiệm thu video thích ứng (docs/specs/video-delivery.md R6): bản 480 cố định (--base) so với bản HLS (--candidate)
// trên cùng máy, viewport A04s, cuộn masonry 16 nấc 400 px mỗi nấc chờ 1,5 s, tắt cache; chạy xen kẽ, in tổng. Lượt
// `switch` chỉ chạy bản HLS: 300 kbps (bậc 480 nhẹ nhất 277 kbps nên hls.js không lên 480; ở 1,6 Mbps card giữ 480) tới khi
// một card ở nửa dưới màn hình phát dưới bậc 480, rồi bỏ giới hạn và cuộn để card khác tải segment (R4).
// Chạy: node tests/site/video-delivery-measure.mjs --base <url 98f3963> --candidate <url nhánh> [--runs 9] --h2
// `--h2` đặt proxy HTTP/2 nén brotli trước mỗi server như Cloudflare: server tĩnh local không nén nên ở 4G chậm artifact
// 1,1 MB làm card đầu hiện sau 11,6 s thay vì 2,8 s và hls.js 386 KB thay vì 112 KB (đo cloud 2026-10-25). Cần openssl.
// Máy thật: DEVICE_CDP=http://127.0.0.1:9222 (sau adb forward) chạy trên Chrome của điện thoại, giữ viewport máy.
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import http2 from "node:http2";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const arg = (name, fallback) => { const index = process.argv.indexOf(`--${name}`); return index > 0 ? process.argv[index + 1] : fallback; };
const bases = { base: arg("base"), candidate: arg("candidate") };
const runs = Number(arg("runs", 9));
const output = arg("out", ".tmp/video-delivery");
const route = "/vi/advertising-products/";
const SLOW = { offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8 };
const WEAK = { ...SLOW, downloadThroughput: 300_000 / 8 };
const FAST = { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 };
const proxy = (upstream) => new Promise((resolve) => {
  const { hostname, port } = new URL(upstream);
  const server = http2.createSecureServer({ ...tls, allowHTTP1: true }, (request, response) => {
    const headers = Object.fromEntries(Object.entries(request.headers).filter(([key]) => !key.startsWith(":") && key !== "accept-encoding"));
    const forward = http.request({ hostname, port, path: request.url, method: request.method, headers }, (reply) => {
      const out = Object.fromEntries(Object.entries(reply.headers).filter(([key]) => !["connection", "keep-alive", "transfer-encoding"].includes(key)));
      if (reply.statusCode !== 200 || !/javascript|css|html|json|svg|mpegurl/.test(reply.headers["content-type"] || "")) {
        response.writeHead(reply.statusCode, out);
        reply.pipe(response);
        return;
      }
      const chunks = [];
      reply.on("data", (chunk) => chunks.push(chunk)).on("end", () => {
        const body = zlib.brotliCompressSync(Buffer.concat(chunks), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } });
        response.writeHead(200, { ...out, "content-encoding": "br", "content-length": body.length });
        response.end(body);
      });
    });
    request.pipe(forward);
  });
  server.unref().listen(0, "127.0.0.1", () => resolve(`https://127.0.0.1:${server.address().port}`));
});
let tls;
if (process.argv.includes("--h2")) {
  const key = path.join(os.tmpdir(), "video-delivery-key.pem");
  const cert = path.join(os.tmpdir(), "video-delivery-cert.pem");
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=localhost", "-days", "1", "-keyout", key, "-out", cert], { stdio: "ignore" });
  tls = { key: await fs.readFile(key), cert: await fs.readFile(cert) };
  for (const version of Object.keys(bases)) bases[version] = await proxy(bases[version]);
}
const device = process.env.DEVICE_CDP;
const browser = device ? await chromium.connectOverCDP(device)
  : await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

// Lúc card đầu vào DOM (hls.js tải song song artifact nên có thể làm masonry hiện muộn hơn). Mỗi video card: lúc hiện quá
// 1/2 dưới navbar, lúc phát đầu tiên, các lần `waiting` sau khi đã phát kèm thời lượng.
function watchVideos() {
  // Giữ đủ request của cả lượt cho phần chẩn đoán video chạy muộn (mặc định trình duyệt chỉ giữ 250).
  performance.setResourceTimingBufferSize(5000);
  const log = window.__videos = [];
  const nodes = window.__videoNodes = [];
  const entries = new WeakMap();
  const tick = () => {
    if (window.__firstCard === undefined && document.querySelector("[data-advertising-card]")) window.__firstCard = performance.now();
    const navBottom = Math.max(0, document.querySelector("[data-site-header]")?.getBoundingClientRect().bottom ?? 0);
    for (const video of document.querySelectorAll("[data-advertising-card] video")) {
      let entry = entries.get(video);
      if (!entry) {
        entries.set(video, entry = { created: performance.now(), visible: null, playing: null, stalls: [] });
        log.push(entry);
        nodes.push(video);
        video.addEventListener("playing", () => {
          entry.playing ??= performance.now();
          const last = entry.stalls.at(-1);
          if (last && last.end === undefined) last.end = performance.now();
        });
        video.addEventListener("waiting", () => { if (entry.playing !== null) entry.stalls.push({ start: performance.now() }); });
      }
      const box = video.getBoundingClientRect();
      if (entry.visible === null && video.checkVisibility() && box.height
        && (Math.min(box.bottom, innerHeight) - Math.max(box.top, navBottom)) / box.height > 0.5) entry.visible = performance.now();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const open = async (base, network) => {
  const context = device ? browser.contexts()[0]
    : await browser.newContext({ viewport: { width: 384, height: 724 }, deviceScaleFactor: 1.875, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true });
  await context.addInitScript(watchVideos);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", network);
  await page.goto(`${base}${route}`, { waitUntil: "load", timeout: 180_000 });
  return { context, page, cdp, close: () => (device ? page.close() : context.close()) };
};

const scroll = async (page) => {
  for (let step = 0; step < 16; step += 1) {
    await page.evaluate(() => scrollBy(0, 400));
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(3000);
};

const playback = async (base, network) => {
  const { page, close } = await open(base, network);
  await page.waitForTimeout(3000);
  await scroll(page);
  const { videos, firstCard, late } = await page.evaluate(() => ({
    videos: window.__videos, firstCard: window.__firstCard,
    // Video chạy sau khi hiện quá 300 ms hoặc không chạy: trạng thái lúc hết lượt (readyState thấp là do tải, cao mà vẫn
    // dừng là do lịch phát) và các request media của nó [bắt đầu, xong, file] theo đồng hồ trang.
    late: window.__videos.flatMap((entry, index) => {
      if (entry.visible === null || (entry.playing !== null && entry.playing - entry.visible <= 300)) return [];
      const node = window.__videoNodes[index];
      const id = node.dataset.advertisingMediaItem;
      return [{
        id, createdMs: Math.round(entry.created), visibleMs: Math.round(entry.visible), playingMs: entry.playing && Math.round(entry.playing),
        endMs: Math.round(performance.now()), readyState: node.readyState, networkState: node.networkState, paused: node.paused,
        shown: node.checkVisibility(), hls: node.currentSrc.startsWith("blob:"),
        buffered: Array.from({ length: node.buffered.length }, (_, range) => [node.buffered.start(range), node.buffered.end(range)].map((time) => +time.toFixed(1))),
        requests: performance.getEntriesByType("resource").filter(({ name }) => name.includes(`/${id}/`) || name.includes(`/${id}-`))
          .map(({ name, startTime, responseEnd }) => [Math.round(startTime), Math.round(responseEnd), name.split("/").pop()]),
      }];
    }),
  }));
  const seen = videos.filter((entry) => entry.visible !== null);
  await close();
  const started = seen.filter((entry) => entry.playing !== null);
  const latency = started.map((entry) => Math.max(0, entry.playing - entry.visible)).sort((a, b) => a - b);
  const stalls = seen.flatMap((entry) => entry.stalls);
  return {
    firstCardMs: Math.round(firstCard), seen: seen.length, neverStarted: seen.length - started.length,
    stalls: stalls.length, stallsOver10: stalls.filter(({ start, end }) => end === undefined || end - start > 10).length,
    latencyP50: latency[Math.floor((latency.length - 1) / 2)] ?? null, latencyMax: latency.at(-1) ?? null,
    ...(late.length ? { late } : {}),
  };
};

// Đổi bậc (R4): ghi từng frame của card đang phát dưới bậc 480 trong 6 s trước và 6 s sau khi bỏ giới hạn. Luật thay chạy
// khi một video khác tải segment: cuộn đưa card lên sát navbar để card mới vào cửa sổ render; không video nào tải
// (`triggered` 0) hoặc video dừng vì card nhiều video đã chuyển sang video kế (`paused`) thì lượt này không tính. `waiting`
// chỉ tính sau lúc đổi và tách riêng `waiting` lúc lặp về giây 0.
const switching = async (base) => {
  const { page, cdp, close } = await open(base, WEAK);
  await page.waitForTimeout(3000);
  const found = await page.waitForFunction(() => {
    scrollBy(0, 20);
    const video = [...document.querySelectorAll("[data-advertising-card] video")]
      .find((node) => !node.paused && node.videoWidth && node.videoWidth < 480 && node.checkVisibility()
        && node.getBoundingClientRect().top > innerHeight / 2);
    if (!video) return false;
    window.__switchVideo = video;
    const log = window.__switch = { frames: [], waiting: [], lowReady: 0 };
    const canvas = Object.assign(document.createElement("canvas"), { width: 8, height: 8 });
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const frame = (now, meta) => {
      context.drawImage(video, 0, 0, 8, 8);
      const pixels = context.getImageData(0, 0, 8, 8).data;
      let luma = 0;
      for (let index = 0; index < pixels.length; index += 4) luma += (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
      log.frames.push({ now, time: meta.mediaTime, width: meta.width, luma: luma / 64 });
      video.requestVideoFrameCallback(frame);
    };
    video.requestVideoFrameCallback(frame);
    video.addEventListener("waiting", () => log.waiting.push({ start: performance.now(), time: video.currentTime }));
    video.addEventListener("playing", () => { const last = log.waiting.at(-1); if (last && !last.end) last.end = performance.now(); });
    const ready = () => { if (video.readyState < 2) log.lowReady += 1; requestAnimationFrame(ready); };
    requestAnimationFrame(ready);
    log.quality = () => video.getVideoPlaybackQuality().droppedVideoFrames;
    return true;
  }, null, { timeout: 90_000, polling: 500 }).then(() => true, () => false);
  if (!found) {
    await close();
    return { found: false };
  }
  await page.waitForTimeout(6000);
  const before = await page.evaluate(() => ({ at: performance.now(), dropped: window.__switch.quality(), id: window.__switchVideo.dataset.advertisingMediaItem }));
  let triggered = 0;
  cdp.on("Network.requestWillBeSent", ({ request }) => { if (/\.mp4$/.test(new URL(request.url).pathname) && !request.url.includes(`/${before.id}/`)) triggered += 1; });
  await cdp.send("Network.emulateNetworkConditions", FAST);
  await page.evaluate(() => {
    const top = window.__switchVideo.getBoundingClientRect().top - (document.querySelector("[data-site-header]")?.getBoundingClientRect().bottom ?? 0);
    scrollBy(0, Math.max(0, top));
  });
  await page.waitForTimeout(6000);
  const log = await page.evaluate(() => ({ ...window.__switch, dropped: window.__switch.quality(), at: performance.now(), paused: window.__switchVideo.paused }));
  await close();
  // Card bắt đầu ở bậc 480 (R3) nên segment đầu (giây 0 tới 2) có thể nét sẵn từ trước khi đổi mạng: chỉ xét từ giây 2.
  const lowWidth = log.frames.filter(({ now, time }) => now < before.at && time >= 2).at(-1)?.width;
  const up = log.frames.find(({ now, time, width }) => now >= before.at && time >= 2 && width > lowWidth);
  const after = log.waiting.filter(({ start }) => start >= before.at).map(({ start, end, time }) => ({ loop: time < 0.1, ms: (end ?? log.at) - start }));
  const longest = (list) => Math.round(Math.max(0, ...list.map(({ ms }) => ms)));
  const gaps = log.frames.slice(1).map((frame, index) => frame.now - log.frames[index].now);
  const jumps = log.frames.slice(1).filter((frame, index) => frame.time < log.frames[index].time && frame.time > 0.5).length;
  return {
    found: true, triggered, paused: log.paused, lowWidth, upWidth: up?.width ?? null, upAfterMs: up ? Math.round(up.now - before.at) : null,
    longestWaitingMs: longest(after.filter(({ loop }) => !loop)), loopWaitingMs: longest(after.filter(({ loop }) => loop)),
    maxFrameGapMs: Math.round(Math.max(...gaps)), backwardJumps: jumps, darkFrames: log.frames.filter(({ luma }) => luma < 8).length,
    lowReadyFrames: log.lowReady,
    droppedBefore: before.dropped, droppedAfter: log.dropped - before.dropped,
  };
};

const results = [];
for (let index = 0; index < runs; index += 1) {
  // Xen kẽ thứ tự hai bản mỗi lượt để nhiễu của máy chia đều.
  for (const version of index % 2 ? ["candidate", "base"] : ["base", "candidate"]) {
    const result = await playback(bases[version], SLOW);
    results.push({ scenario: "slow", version, index, ...result });
    console.log(`slow ${version} #${index}: ${JSON.stringify(result)}`);
  }
}
for (const version of ["base", "candidate"]) {
  const result = await playback(bases[version], FAST);
  results.push({ scenario: "fast", version, ...result });
  console.log(`fast ${version}: ${JSON.stringify(result)}`);
}
// Tối đa 3 lượt tới khi có lượt tính được: có video khác tải, video còn phát và đang dưới bậc 480 lúc đổi mạng (thang H.264
// có thể đã tự lên 480 trong 6 s chờ).
let switched;
for (let attempt = 0; attempt < 3 && !(switched?.triggered && !switched.paused && switched.lowWidth < 480); attempt += 1) {
  switched = await switching(bases.candidate);
  results.push({ scenario: "switch", version: "candidate", attempt, ...switched });
  console.log(`switch candidate #${attempt}: ${JSON.stringify(switched)}`);
}

const median = (values) => values.sort((a, b) => a - b)[Math.floor((values.length - 1) / 2)];
const total = (version, key) => results.filter((row) => row.scenario === "slow" && row.version === version).reduce((sum, row) => sum + row[key], 0);
const summary = Object.fromEntries(["base", "candidate"].map((version) => [version, {
  seen: total(version, "seen"), neverStarted: total(version, "neverStarted"),
  stallsPerVideo: +(total(version, "stalls") / total(version, "seen")).toFixed(2),
  stallsOver10PerVideo: +(total(version, "stallsOver10") / total(version, "seen")).toFixed(2),
  firstCardMedianMs: median(results.filter((row) => row.scenario === "slow" && row.version === version).map((row) => row.firstCardMs)),
}]));
summary.fast = results.filter((row) => row.scenario === "fast").map(({ version, latencyP50, latencyMax }) => ({ version, latencyP50, latencyMax }));
summary.switch = switched;
const folder = path.join(output, new Date().toISOString().replace(/[:.]/g, "-"));
await fs.mkdir(folder, { recursive: true });
await fs.writeFile(path.join(folder, "runs.json"), JSON.stringify(results, null, 2));
await fs.writeFile(path.join(folder, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
await browser.close();
