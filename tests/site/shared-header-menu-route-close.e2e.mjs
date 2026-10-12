// Chạm link trong full menu trên phone: menu đóng ngay khi veil phủ kín và chữ menu reverse xong, không chờ shutter
// và page scale (docs/specs/site-shell.md R4). Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/shared-header-menu-route-close.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium, devices } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

try {
  const context = await browser.newContext(devices["Pixel 7"]);
  const page = await context.newPage();
  await page.goto(`${origin}/vi/`);
  await page.waitForFunction(() => window.barba?.history && !document.documentElement.classList.contains("route-enter"));
  await page.tap("[data-menu-open]");
  // Chờ timeline mở xong (focus về nút đóng).
  await page.waitForFunction(() => document.activeElement?.matches("[data-menu-close]"));
  await page.evaluate(() => {
    const dialog = document.querySelector("#site-menu");
    const veil = document.querySelector(".route-veil");
    // setTimeout thay rAF: headless không chạy rAF khi không có gì vẽ lại.
    const watch = () => {
      if (!dialog.open) {
        window.__menuClosed = { ms: performance.now() - window.__tapAt, veil: Number(getComputedStyle(veil).opacity) };
        return;
      }
      setTimeout(watch, 8);
    };
    dialog.addEventListener("click", () => {
      window.__tapAt = performance.now();
      watch();
    }, { capture: true, once: true });
  });
  await page.tap('#site-menu .menu-group__title[href="/vi/residential/"]');
  await page.waitForFunction(() => window.__menuClosed, null, { timeout: 5_000 });
  const closed = await page.evaluate(() => window.__menuClosed);
  // Trước sửa menu đóng sau page scale, khoảng 1.6s; sau sửa khoảng 0.75-0.9s.
  assert.ok(closed.ms < 1_300, `menu closed ${Math.round(closed.ms)}ms after tap`);
  assert.ok(closed.veil >= 0.999, `menu closed before the veil covered (opacity ${closed.veil})`);
  await page.waitForURL(`${origin}/vi/residential/`);
  console.log(`[shared-header-menu-route-close] closed ${Math.round(closed.ms)}ms after tap, veil ${closed.veil}`);
} finally {
  await browser.close();
}
