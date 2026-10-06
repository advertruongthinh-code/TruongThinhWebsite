// Wheel-scroll smoothness probe for docs/specs/scroll-feel.md R2.
// Usage: node tests/site/scroll-trace.mjs [--headed] [--trace]
// Env: BASE_URL (default http://127.0.0.1:8787), PLAYWRIGHT_EXECUTABLE_PATH or CHROME_CHANNEL=chrome on the PC.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");
const args = process.argv.slice(2);
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
const out = path.join(root, ".tmp/scroll-trace", new Date().toISOString().replace(/[-:.]/g, ""));
mkdirSync(out, { recursive: true });

const pages = {
  home: "/vi/",
  advertising: "/vi/advertising-products/",
  category: "/vi/advertising-products/?category=signage-raised-letters",
  photo: "/vi/advertising-products/?category=signage-raised-letters&photo=signage-raised-letters-02",
};

const browser = await chromium.launch({
  headless: !args.includes("--headed"),
  channel: process.env.CHROME_CHANNEL,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
});
const context = await browser.newContext({ viewport: null });
const rows = [];
try {
  for (const [name, route] of Object.entries(pages)) {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${baseUrl}${route}`, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
    await page.waitForTimeout(2500);
    await page.mouse.move(960, 600);
    await page.evaluate(() => {
      window.__probe = { frames: [], longTasks: [] };
      new PerformanceObserver((list) => list.getEntries().forEach((entry) => window.__probe.longTasks.push(Math.round(entry.duration))))
        .observe({ type: "longtask" });
      let last = performance.now();
      const tick = (now) => {
        window.__probe.frames.push(now - last);
        last = now;
        if (!window.__probe.stop) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const cdp = await context.newCDPSession(page);
    const chunks = [];
    if (args.includes("--trace")) {
      cdp.on("Tracing.dataCollected", ({ value }) => chunks.push(...value));
      await cdp.send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame" });
    }
    // Steady wheel input from top to the end of the page, like a person rolling the mouse.
    for (let step = 0; step < 400; step += 1) {
      const done = await page.evaluate(() => {
        const motion = window.TruongThinhMotion;
        const limit = document.documentElement.scrollHeight - innerHeight;
        return (motion?.getLogicalScroll?.() ?? scrollY) >= limit - 2;
      });
      if (done) break;
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(1200);
    if (args.includes("--trace")) {
      const finished = new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve));
      await cdp.send("Tracing.end");
      await finished;
      writeFileSync(path.join(out, `${name}.trace.json`), JSON.stringify({ traceEvents: chunks }));
    }
    const probe = await page.evaluate(() => {
      window.__probe.stop = true;
      return window.__probe;
    });
    const frames = probe.frames.slice(2);
    const sorted = [...frames].sort((a, b) => a - b);
    const budget = sorted[Math.floor(sorted.length / 2)] * 1.5;
    rows.push({
      page: name,
      frames: frames.length,
      medianMs: +sorted[Math.floor(sorted.length / 2)].toFixed(1),
      droppedPct: +((frames.filter((ms) => ms > budget).length / frames.length) * 100).toFixed(1),
      maxFrameMs: +sorted.at(-1).toFixed(1),
      longTasksOver50: probe.longTasks.filter((ms) => ms > 50).length,
      longestTaskMs: Math.max(0, ...probe.longTasks),
    });
    await page.close();
  }
} finally {
  await browser.close();
}
writeFileSync(path.join(out, "summary.json"), JSON.stringify(rows, null, 2));
console.table(rows);
const home = rows.find((row) => row.page === "home");
const failing = rows.filter((row) => row.longTasksOver50 > 0 || row.droppedPct > home.droppedPct);
console.log(failing.length ? `R2 NOT PASS: ${failing.map((row) => row.page).join(", ")}` : "R2 PASS");
console.log(`output: ${out}`);
process.exitCode = failing.length ? 1 : 0;
