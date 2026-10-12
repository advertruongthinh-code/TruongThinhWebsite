// Route mềm sang Advertising tải vendor, module catalog và artifact song song với veil phủ, không chờ veil phủ xong,
// và header không bị scrollbar native đẩy sang trái trong lúc chờ (docs/specs/site-shell.md R6). Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/advertising-route-preload.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
// Hiện scrollbar như Chrome desktop để đo header bị đẩy khi scrollbar native hiện.
const browser = await chromium.launch({
  headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH, ignoreDefaultArgs: ["--hide-scrollbars"],
});
const files = ["masonry-4.2.2.min.js", "catalog-runtime.mjs", "catalog-artifact.mjs"];

try {
  for (const locale of ["vi", "en"]) {
    // Context mới: cache rỗng như sau Ctrl+Shift+R ở trang chủ.
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
        // Timer thay rAF: headless không tạo frame khi màn hình không đổi, nên rAF bỏ sót lúc đứng chờ mạng.
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
      // Còn một hai frame giữa lúc chèn trang mới và smooth scroll khởi động, ở mọi route.
      assert(shift < 120, `${locale}: native scrollbar pushed the header for ${Math.round(shift)}ms`);
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
