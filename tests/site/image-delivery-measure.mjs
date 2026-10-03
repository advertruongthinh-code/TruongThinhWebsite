// Cold/warm image delivery measurement for the static-image-delivery spec (P0 baseline, P11 candidate).
// Usage: node tests/site/image-delivery-measure.mjs --base https://host --runs 5 [--warm] [--out dir]
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : fallback;
};
const base = (arg("base", process.env.BASE_URL || "http://127.0.0.1:8792")).replace(/\/$/, "");
const runs = Number(arg("runs", 5));
const warm = process.argv.includes("--warm");
const out = arg("out", path.join(root, ".tmp/image-delivery", new Date().toISOString().replace(/[:.]/g, "")));
const detailId = arg("detail", "kiosk-posm-07");
const allRoutes = ["", "residential/", "commercial/", "about/", "advertising-products/", `advertising-products/?photo=${detailId}`];
const only = arg("only", "");
const routes = only ? allRoutes.filter((route) => (route || "home").startsWith(only)) : allRoutes;
const viewports = [{ width: 390, height: 844, mobile: true }, { width: 1440, height: 900, mobile: false }];
// DevTools "Slow 4G" preset: 562.5 ms RTT, 1.6 Mbps down x 0.9, 750 kbps up x 0.9; CPU 4x.
const network = { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1024 * 1024 / 8) * 0.9, uploadThroughput: (750 * 1024 / 8) * 0.9 };

const probe = () => {
  const state = { lcp: null, lcpUrl: null, cls: 0, firstImageReady: null, scrollImageReady: null, scrollAt: null };
  new PerformanceObserver((list) => list.getEntries().forEach((entry) => {
    state.lcp = entry.startTime;
    state.lcpUrl = entry.url || entry.element?.tagName || null;
  })).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => list.getEntries().forEach((entry) => {
    if (!entry.hadRecentInput) state.cls += entry.value;
  })).observe({ type: "layout-shift", buffered: true });
  const visibleReady = (after) => [...document.images].some((image) => {
    const rect = image.getBoundingClientRect();
    return image.complete && image.naturalWidth > 0 && rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight
      && getComputedStyle(image).visibility !== "hidden" && (!after || image.dataset.measureSeen !== "1");
  });
  const tick = () => {
    const now = performance.now();
    if (state.firstImageReady === null && visibleReady(false)) state.firstImageReady = now;
    if (state.scrollAt !== null && state.scrollImageReady === null && visibleReady(true)) state.scrollImageReady = now - state.scrollAt;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.__imageDelivery = state;
};

const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const browser = await chromium.launch();
const results = [];
await mkdir(out, { recursive: true });
const saveRuns = () => writeFile(path.join(out, "runs.json"), JSON.stringify({ base, runs, warm, network, cpu: 4, at: new Date().toISOString(), results }, null, 2));
for (const viewport of viewports) for (const locale of ["vi", "en"]) for (const route of routes) {
  const newContext = () => browser.newContext({ viewport, isMobile: viewport.mobile, hasTouch: viewport.mobile, deviceScaleFactor: viewport.mobile ? 3 : 1 });
  let context = await newContext();
  for (let run = 0; run < runs + (warm ? 1 : 0); run += 1) {
    const cold = !warm || run === 0;
    const url = `${base}/${locale}/${route}`;
    const row = { url, route: route || "home", locale, viewport: `${viewport.width}x${viewport.height}`, run, cache: cold ? "cold" : "warm" };
    const errors = [];
    const pending = new Map();
    const started = Date.now();
    let page;
    // One hung or crashed run is recorded and skipped; it must not abort the pass.
    try {
      page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: !warm });
      await cdp.send("Network.emulateNetworkConditions", network);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.addInitScript(probe);
      page.on("request", (request) => pending.set(request, Date.now()));
      page.on("requestfinished", (request) => pending.delete(request));
      page.on("requestfailed", (request) => { pending.delete(request); errors.push(`${request.failure()?.errorText} ${request.url()}`); });
      await page.goto(url, { waitUntil: "load", timeout: 120_000 });
      await page.waitForTimeout(1500);
      // Mark what is already visible, then scroll one viewport and time the next visible image.
      await page.evaluate(() => {
        [...document.images].forEach((image) => {
          const rect = image.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < innerHeight) image.dataset.measureSeen = "1";
        });
        window.__imageDelivery.scrollAt = performance.now();
        window.scrollBy(0, innerHeight);
      });
      await page.waitForFunction(() => window.__imageDelivery.scrollImageReady !== null, null, { timeout: 60_000 }).catch(() => {});
      const sample = await page.evaluate(() => {
        const images = performance.getEntriesByType("resource")
          .filter((entry) => entry.initiatorType === "img" || /\.(webp|avif|jpe?g|png)(\?|$)/.test(entry.name))
          .map((entry) => ({ url: new URL(entry.name).pathname, start: Math.round(entry.startTime), end: Math.round(entry.responseEnd), transfer: entry.transferSize, body: entry.encodedBodySize }));
        const cohort = [...document.querySelectorAll("[data-advertising-card], [data-advertising-related-card]")].slice(0, 8)
          .map((node) => ({ id: node.dataset.advertisingCard || node.dataset.advertisingRelatedCard, src: node.querySelector("img")?.currentSrc || null }));
        return { ...window.__imageDelivery, images, cohort };
      });
      Object.assign(row, {
        wallMs: Date.now() - started, lcp: sample.lcp, lcpUrl: sample.lcpUrl, cls: Number(sample.cls.toFixed(4)),
        firstImageReady: sample.firstImageReady, scrollImageReady: sample.scrollImageReady,
        imageRequests: sample.images.length, imageTransfer: sample.images.reduce((sum, image) => sum + image.transfer, 0),
        firstImageStart: Math.min(...sample.images.map((image) => image.start)), coldVerified: sample.images.some((image) => image.transfer > 0),
        cohort: sample.cohort, images: sample.images,
      });
    } catch (error) {
      row.failure = String(error.message || error).split("\n")[0];
      row.wallMs = Date.now() - started;
      row.pending = [...pending].map(([request, at]) => `${Math.round((Date.now() - at) / 1000)}s ${request.url()}`).slice(0, 20);
      await context.close().catch(() => {});
      context = await newContext();
      page = null;
    }
    row.errors = errors;
    results.push(row);
    console.log(row.failure
      ? `${row.cache} ${viewport.width} ${locale} ${row.route} #${run} FAILED ${row.failure}`
      : `${row.cache} ${viewport.width} ${locale} ${row.route} #${run} lcp=${Math.round(row.lcp)} first=${Math.round(row.firstImageReady)} scroll=${Math.round(row.scrollImageReady)} bytes=${row.imageTransfer}`);
    await page?.close().catch(() => {});
    await saveRuns();
  }
  await context.close();
}
await browser.close();

const groups = new Map();
for (const result of results) {
  const key = `${result.cache} ${result.viewport} ${result.locale} ${result.route}`;
  groups.set(key, [...(groups.get(key) || []), result]);
}
const summary = [...groups].map(([key, rows]) => ({
  key, runs: rows.length, failed: rows.filter((row) => row.failure).length,
  lcp: median(rows.map((row) => row.lcp)), firstImageReady: median(rows.map((row) => row.firstImageReady)),
  scrollImageReady: median(rows.map((row) => row.scrollImageReady)), cls: median(rows.map((row) => row.cls)),
  imageTransfer: median(rows.map((row) => row.imageTransfer)), excluded: rows.filter((row) => !row.failure && row.cache === "cold" && !row.coldVerified).length,
}));
await writeFile(path.join(out, "summary.json"), JSON.stringify(summary, null, 2));
console.table(summary.map(({ key, failed, lcp, firstImageReady, scrollImageReady, cls, imageTransfer, excluded }) => ({
  key, failed, lcp: Math.round(lcp), first: Math.round(firstImageReady), scroll: Math.round(scrollImageReady), cls, kb: Math.round(imageTransfer / 1024), excluded,
})));
console.log(`raw: ${out}`);
