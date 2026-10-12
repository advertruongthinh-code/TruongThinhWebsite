import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

// Hồi quy: rời trang 404 bằng route mềm, container 404 phải ẩn khi veil mở, trang đích nằm từ đỉnh và cuộn được;
// Back về 404 cũng là route mềm.
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

const routes = {
  vi: ["/vi/", "/vi/residential/", "/vi/commercial/", "/vi/advertising-products/", "/vi/about/"],
  en: ["/en/commercial/"],
};

try {
  for (const [locale, targets] of Object.entries(routes)) {
    for (const target of targets) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(`${baseUrl}/${locale}/khong-co-trang-nay/`);
      await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready")
        && !document.documentElement.classList.contains("route-enter"), null, { timeout: 12_000 });
      // Lấy mẫu mỗi frame từ lúc bấm link tới khi route xong: 404 không được chiếm chỗ lúc veil đã mở một phần.
      const leaks = await page.evaluate((href) => new Promise((resolve) => {
        const found = [];
        const started = performance.now();
        const tick = () => {
          const oldPage = document.querySelector('[data-barba-namespace="not-found"]');
          const veil = Number(getComputedStyle(document.querySelector(".route-veil")).opacity);
          if (oldPage && document.querySelectorAll("[data-barba=container]").length > 1 && veil < 1) {
            const height = oldPage.getBoundingClientRect().height;
            if (height > 0) found.push({ veil, height });
          }
          const done = !oldPage && !document.body.classList.contains("is-transitioning");
          if (done || performance.now() - started > 8000) resolve({ found, done });
          else requestAnimationFrame(tick);
        };
        document.querySelector(`a[href="${href}"]`).click();
        requestAnimationFrame(tick);
      }), target);
      assert.ok(leaks.done, `${target}: route from 404 did not finish`);
      assert.deepEqual(leaks.found.slice(0, 3), [], `${target}: 404 container visible while the veil opens`);
      const after = await page.evaluate(() => ({
        path: location.pathname,
        top: Math.round(document.querySelector("[data-barba=container]").getBoundingClientRect().top),
        scrollable: document.scrollingElement.scrollHeight > innerHeight,
      }));
      assert.deepEqual(after, { path: target, top: 0, scrollable: true }, `${target}: page after leaving 404`);
      // Back về 404 (status 404) vẫn là route mềm: cùng document, veil phủ kín, header không chạy lại intro.
      await page.evaluate(() => {
        window.__sameDocument = true;
        window.__back = { veil: 0, minLogoScale: 1 };
        const logo = document.querySelector("[data-site-header] .brand-lockup").parentElement;
        const tick = () => {
          window.__back.veil = Math.max(window.__back.veil, Number(getComputedStyle(document.querySelector(".route-veil")).opacity));
          const scale = new DOMMatrix(getComputedStyle(logo).transform).a;
          window.__back.minLogoScale = Math.min(window.__back.minLogoScale, scale);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await page.goBack();
      await page.waitForFunction(() => document.querySelector('[data-barba-namespace="not-found"]')
        && !document.body.classList.contains("is-transitioning"), null, { timeout: 8000 });
      const back = await page.evaluate(() => ({ sameDocument: window.__sameDocument === true, ...window.__back }));
      assert.deepEqual(back, { sameDocument: true, veil: 1, minLogoScale: 1 }, `${target}: Back to 404`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
