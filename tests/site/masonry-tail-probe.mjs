// Dò card cuối masonry kẹt ở nền chờ ảnh (blur, màu chủ đạo). Chạy trên máy thật:
// DEVICE_CDP=http://127.0.0.1:9222 node tests/site/masonry-tail-probe.mjs --url http://127.0.0.1:8787/vi/advertising-products/ [--swipe adb|wheel] [--out .tmp/masonry-tail]
// Không có DEVICE_CDP thì chạy Chromium headless giả lập A04s (384x724, DPR 1.875).
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const arg = (name, fallback) => { const index = process.argv.indexOf(`--${name}`); return index > 0 ? process.argv[index + 1] : fallback; };
const url = arg("url", "http://127.0.0.1:8787/vi/advertising-products/");
const swipe = arg("swipe", process.env.DEVICE_CDP ? "adb" : "wheel");
const out = arg("out", ".tmp/masonry-tail");
await fs.mkdir(out, { recursive: true });
const device = process.env.DEVICE_CDP;
const browser = device ? await chromium.connectOverCDP(device)
  : await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const context = device ? browser.contexts()[0]
  : await browser.newContext({ viewport: { width: 384, height: 724 }, deviceScaleFactor: 1.875, isMobile: true, hasTouch: true });
const page = await context.newPage();
const logs = [];
page.on("console", (message) => logs.push(`${message.type()}: ${message.text()}`));
page.on("pageerror", (error) => logs.push(`pageerror: ${error.message}`));
const failed = [];
page.on("requestfailed", (request) => failed.push(`${request.failure()?.errorText} ${request.url()}`));
page.on("response", (response) => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(3000);
const gridBottom = () => page.evaluate(() => document.querySelector("[data-advertising-card]")?.parentElement.getBoundingClientRect().bottom ?? 0);
const started = Date.now();
for (let step = 0; step < 300 && Date.now() - started < 120_000; step += 1) {
  if (await gridBottom() < (await page.evaluate(() => innerHeight))) break;
  if (swipe === "adb") execFileSync("adb", ["shell", "input", "swipe", "200", "1150", "200", "350", "150"]);
  else await page.mouse.wheel(0, 700);
  await page.waitForTimeout(swipe === "adb" ? 250 : 80);
}
const snapshot = () => page.evaluate(() => {
  const cards = [...document.querySelectorAll("[data-advertising-card]")].filter((node) => !node.hidden);
  return cards.map((node) => {
    const box = node.getBoundingClientRect();
    const images = [...node.querySelectorAll("img")].map((image) => {
      const style = getComputedStyle(image);
      const resource = image.currentSrc && performance.getEntriesByName(image.currentSrc)[0];
      return {
        className: image.className, filter: image.style.filter, computedFilter: style.filter, opacity: style.opacity,
        currentSrc: image.currentSrc, src: image.getAttribute("src"), dataSrc: image.dataset.src, srcset: image.getAttribute("srcset"),
        sizes: image.getAttribute("sizes"), complete: image.complete, naturalWidth: image.naturalWidth,
        animations: image.getAnimations().map((animation) => ({ state: animation.playState, time: animation.currentTime })),
        resource: resource ? { start: Math.round(resource.startTime), end: Math.round(resource.responseEnd), size: resource.transferSize, status: resource.responseStatus } : null,
      };
    });
    return { id: node.dataset.advertisingCard, top: Math.round(box.top), bottom: Math.round(box.bottom),
      loaded: node.dataset.advertisingMediaLoaded, className: node.className, images };
  }).filter((card) => card.bottom > -1500 && card.top < innerHeight);
});
const stuck = (cards) => cards.filter((card) => card.images.some((image) => !image.complete || !image.naturalWidth
  || image.filter || image.opacity !== "1" || !image.className.includes("is-advertising-media-ready")));
const samples = [];
for (const at of [0, 5000, 15000, 25000]) {
  await page.waitForTimeout(at - (samples.at(-1)?.at ?? 0));
  const cards = await snapshot();
  samples.push({ at, inView: cards.length, stuck: stuck(cards) });
  console.log(`t+${at}ms: ${cards.length} card, ${stuck(cards).length} kẹt: ${stuck(cards).map((card) => card.id).join(", ")}`);
}
await page.screenshot({ path: path.join(out, "tail.png") });
await fs.writeFile(path.join(out, "probe.json"), JSON.stringify({ url, swipe, samples, last: await snapshot(), logs, failed }, null, 1));
console.log(`ghi ${out}/probe.json, ${failed.length} request lỗi, ${logs.length} console`);
await page.close();
if (!device) await browser.close();
else await browser.close().catch(() => {});
