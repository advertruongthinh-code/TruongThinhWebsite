// Đo nghiệm thu ảnh thích ứng mạng (docs/specs/image-adaptive-delivery.md R5): so hai bản (thường là main và nhánh) trên
// cùng máy, mạng 1,6 Mbps RTT 150 ms, tắt cache, viewport A04s; chạy xen kẽ, in median.
// Chạy: node tests/site/image-adaptive-measure.mjs --base http://127.0.0.1:8788 --candidate http://127.0.0.1:8787 [--runs 9]
import fs from "node:fs/promises";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const arg = (name, fallback) => { const index = process.argv.indexOf(`--${name}`); return index > 0 ? process.argv[index + 1] : fallback; };
const bases = { base: arg("base"), candidate: arg("candidate") };
const runs = Number(arg("runs", 9));
const output = arg("out", ".tmp/image-adaptive");
const SLOW = { offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8 };
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null;
};

const run = async (base, route, throttled) => {
  const context = await browser.newContext({ viewport: { width: 384, height: 724 }, deviceScaleFactor: 1.875, isMobile: true, hasTouch: true });
  // Thời điểm 8 ảnh card đầu đã giải mã và hiện (masonry).
  await context.addInitScript(() => {
    const check = () => {
      const ready = [...document.querySelectorAll("[data-project-grid] img")].filter((image) => image.complete && image.naturalWidth > 0);
      if (ready.length >= 8) window.__first8 = performance.now();
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (throttled) await cdp.send("Network.emulateNetworkConditions", SLOW);
  await page.goto(`${base}${route}`, { waitUntil: "load", timeout: 180_000 });
  for (let step = 0; step < 16; step += 1) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(1500);
  }
  const result = await page.evaluate(() => {
    const images = performance.getEntriesByType("resource").filter((entry) => new URL(entry.name).pathname.startsWith("/assets/content/"));
    return {
      bytes: images.reduce((sum, entry) => sum + entry.transferSize, 0),
      urls: [...new Set(images.map((entry) => new URL(entry.name).pathname))].sort(),
      first8: window.__first8 ?? null,
      tier: document.documentElement.dataset.networkTier ?? null,
    };
  });
  await context.close();
  return result;
};

const scenarios = [
  { name: "advertising-slow", route: "/vi/advertising-products/", throttled: true },
  { name: "residential-slow", route: "/vi/residential/", throttled: true },
  { name: "advertising-fast", route: "/vi/advertising-products/", throttled: false, once: true },
];
const results = [];
for (const scenario of scenarios) {
  for (let index = 0; index < (scenario.once ? 1 : runs); index += 1) {
    // Xen kẽ thứ tự hai bản mỗi lượt để nhiễu của máy chia đều.
    const order = index % 2 ? ["candidate", "base"] : ["base", "candidate"];
    for (const version of order) {
      const result = await run(bases[version], scenario.route, scenario.throttled);
      results.push({ scenario: scenario.name, version, index, ...result });
      console.log(`${scenario.name} ${version} #${index}: ${Math.round(result.bytes / 1024)} KB, first8 ${Math.round(result.first8 ?? NaN)} ms, tier ${result.tier}`);
    }
  }
}

const summary = Object.fromEntries(scenarios.map(({ name }) => [name, Object.fromEntries(["base", "candidate"].map((version) => {
  const rows = results.filter((row) => row.scenario === name && row.version === version);
  return [version, { bytesKB: Math.round(median(rows.map((row) => row.bytes)) / 1024), first8ms: Math.round(median(rows.map((row) => row.first8)) ?? NaN), runs: rows.length }];
}))]));
// Mạng nhanh: thứ tự masonry ngẫu nhiên mỗi lượt nên so số file theo cỡ biến thể, không so từng URL.
const widths = (urls) => urls.reduce((counts, url) => {
  const width = url.match(/-(\d+)\.\w+$/)?.[1] ?? "original";
  return { ...counts, [width]: (counts[width] || 0) + 1 };
}, {});
summary.fastWidths = Object.fromEntries(results.filter((row) => row.scenario === "advertising-fast").map((row) => [row.version, widths(row.urls)]));
const folder = path.join(output, new Date().toISOString().replace(/[:.]/g, "-"));
await fs.mkdir(folder, { recursive: true });
await fs.writeFile(path.join(folder, "runs.json"), JSON.stringify(results, null, 2));
await fs.writeFile(path.join(folder, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
await browser.close();
