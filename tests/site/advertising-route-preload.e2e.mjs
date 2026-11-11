// A soft route to Advertising loads the vendor, catalog module and artifact in parallel while the veil covers, without waiting for the veil to finish covering,
// and the header is not pushed left by the native scrollbar while waiting (docs/specs/site-shell.md R6). Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/advertising-route-preload.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
// Show the scrollbar like desktop Chrome to measure the header shift when the native scrollbar appears.
const browser = await chromium.launch({
  headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH, ignoreDefaultArgs: ["--hide-scrollbars"],
});
const files = ["masonry-4.2.2.min.js", "masonry/runtime.mjs", "catalog-artifact.mjs"];

try {
  for (const locale of ["vi", "en"]) {
    // Fresh context: empty cache, as after Ctrl+Shift+R on the home page.
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      await page.goto(`${origin}/${locale}/`);
      await page.waitForFunction(() => window.barba?.history && !document.documentElement.classList.contains("route-enter"));
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 6_000_000, uploadThroughput: 2_000_000 });
      await page.evaluate(() => {
        const veil = document.querySelector(".route-veil");
        const width = document.documentElement.clientWidth;
        let shiftedAt;
        window.__headerShiftMs = 0;
        const watch = () => {
          const now = performance.now();
          if (window.__veilCovered === undefined && Number(getComputedStyle(veil).opacity) >= 1) window.__veilCovered = now;
          if (document.documentElement.clientWidth !== width) shiftedAt ??= now;
          else if (shiftedAt !== undefined) {
            window.__headerShiftMs += now - shiftedAt;
            shiftedAt = undefined;
          }
          if (document.body.classList.contains("is-transitioning") || window.__veilCovered === undefined) setTimeout(watch, 8);
        };
        // Timer instead of rAF: headless produces no frames when the screen does not change, so rAF misses the moment of waiting on the network.
        watch();
      });
      await page.click(`header nav a[href="/${locale}/advertising-products/"]`);
      await page.waitForFunction(() => document.querySelector('[data-barba-namespace="advertising-products"] [data-project-grid] img')
        && !document.body.classList.contains("is-transitioning"), null, { timeout: 15_000 });
      const { covered, shift, starts } = await page.evaluate((names) => ({
        covered: window.__veilCovered,
        shift: window.__headerShiftMs,
        starts: Object.fromEntries(names.map((name) => [name,
          performance.getEntriesByType("resource").find((entry) => entry.name.endsWith(`/${name}`))?.startTime])),
      }), files);
      assert(covered, `${locale}: the veil never covered`);
      // A few frames remain between inserting the new page and the smooth scroll starting, on every route (measured 31-130ms); the network wait
      // on main is 370ms or more.
      assert(shift < 250, `${locale}: native scrollbar pushed the header for ${Math.round(shift)}ms`);
      for (const name of files) {
        assert(starts[name] < covered, `${locale}: ${name} must start before the veil covers: ${JSON.stringify({ covered, starts })}`);
      }
    } finally {
      await page.close();
    }
  }
  console.log("advertising-route-preload: ok");
} finally {
  await browser.close();
}
