// Acceptance measurement for adaptive video (docs/specs/video-delivery.md R6): the fixed 480 build (--base) against the HLS build (--candidate)
// on the same machine, A04s viewport, masonry scrolled in 16 steps of 400 px waiting 1.5 s each, cache off; runs interleaved, totals printed. The
// `switch` run only covers the HLS build: 300 kbps (the lightest 480 rung is 277 kbps so hls.js does not climb to 480; at 1.6 Mbps the card stays at 480) until
// a card in the lower half of the screen plays below the 480 rung, then the limit is removed and scrolling makes another card load segments (R4).
// Run: node tests/site/video-delivery-measure.mjs --base <url 98f3963> --candidate <branch url> [--runs 9] --h2
// `--h2` puts a brotli-compressing HTTP/2 proxy in front of each server like Cloudflare: the local static server does not compress, so on slow 4G the artifact
// of 1.1 MB makes the first card appear after 11.6 s instead of 2.8 s and hls.js 386 KB instead of 112 KB (measured on cloud 2026-10-25). Requires openssl
// (Windows: add C:\Program Files\Git\usr\bin to PATH).
// Real device: DEVICE_CDP=http://127.0.0.1:9222 (after adb forward) runs on the phone's Chrome, keeping the device viewport; the proxy
// listens on ports 8443, 8444 and the script runs adb reverse on those two ports itself, removed with `adb reverse --remove-all` after measuring.
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
const proxy = (upstream, port = 0) => new Promise((resolve) => {
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
  server.unref().listen(port, "127.0.0.1", () => resolve(`https://127.0.0.1:${server.address().port}`));
});
let tls;
if (process.argv.includes("--h2")) {
  const key = path.join(os.tmpdir(), "video-delivery-key.pem");
  const cert = path.join(os.tmpdir(), "video-delivery-cert.pem");
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=localhost", "-days", "1", "-keyout", key, "-out", cert], { stdio: "ignore" });
  tls = { key: await fs.readFile(key), cert: await fs.readFile(cert) };
  // Real device: fixed ports so adb reverse brings the phone back to the proxy on the PC.
  let port = process.env.DEVICE_CDP ? 8443 : 0;
  for (const version of Object.keys(bases)) {
    bases[version] = await proxy(bases[version], port);
    if (port) execFileSync("adb", ["reverse", `tcp:${port}`, `tcp:${port}`]), port += 1;
  }
}
const device = process.env.DEVICE_CDP;
const browser = device ? await chromium.connectOverCDP(device)
  : await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

// When the first card enters the DOM (hls.js downloads the artifact in parallel so it may delay masonry). For each video card: when it shows past
// the lower 1/2 under the navbar, at first play, and each later `waiting` after it has played with its duration.
function watchVideos() {
  // Keep all requests of the whole run for the video diagnostics that run late (the browser keeps only 250 by default).
  performance.setResourceTimingBufferSize(5000);
  const log = window.__videos = [];
  const nodes = window.__videoNodes = [];
  const entries = new WeakMap();
  const tick = () => {
    if (window.__firstCard === undefined && document.querySelector("[data-masonry-card]")) window.__firstCard = performance.now();
    const navBottom = Math.max(0, document.querySelector("[data-site-header]")?.getBoundingClientRect().bottom ?? 0);
    for (const video of document.querySelectorAll("[data-masonry-card] video")) {
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
  // The phone's Chrome has no context-level ignoreHTTPSErrors: skip the proxy's self-signed cert errors via CDP.
  if (device) await cdp.send("Security.setIgnoreCertificateErrors", { ignore: true });
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
    // Video that plays after showing for over 300 ms or does not play: its state at the end of the run (low readyState means loading, high but
    // still paused means scheduling) and its media requests [start, end, file] on the page clock.
    late: window.__videos.flatMap((entry, index) => {
      if (entry.visible === null || (entry.playing !== null && entry.playing - entry.visible <= 300)) return [];
      const node = window.__videoNodes[index];
      const id = node.dataset.masonryMediaItem;
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

// Rung switch (R4): record each frame of the card playing below the 480 rung for 6 s before and 6 s after the limit is removed. The replacement rule runs
// when another video loads a segment: scrolling brings the card close to the navbar so the new card enters the render window; if no video loads
// (`triggered` 0) or the video paused because a multi-video card moved to the next video (`paused`) this run does not count. `waiting`
// only counts after the switch and is kept separate from the `waiting` when looping back to second 0.
const switching = async (base) => {
  const { page, cdp, close } = await open(base, WEAK);
  await page.waitForTimeout(3000);
  const found = await page.waitForFunction(() => {
    scrollBy(0, 20);
    const video = [...document.querySelectorAll("[data-masonry-card] video")]
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
  const before = await page.evaluate(() => ({ at: performance.now(), dropped: window.__switch.quality(), id: window.__switchVideo.dataset.masonryMediaItem }));
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
  // The card starts at the 480 rung (R3) so the first segment (second 0 to 2) may already be sharp before the network switch: only consider from second 2.
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
  // Alternate the order of the two builds each run so machine noise is spread evenly.
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
// Up to 3 runs until one counts: another video loads, the video is still playing and below the 480 rung at the switch (the H.264 ladder
// may have climbed to 480 by itself during the 6 s wait).
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
// browser.close() over CDP hangs on the real device (A04s 2026-10-26): the result is already written so exit directly.
if (device) process.exit(0);
await browser.close();
