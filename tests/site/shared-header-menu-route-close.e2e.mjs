// Tapping a link in the full menu on phone: the menu closes as soon as the veil fully covers and the menu text finishes reversing, without waiting for the shutter
// and page scale (docs/specs/site-shell.md R4). Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/shared-header-menu-route-close.e2e.mjs
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
  // Wait for the open timeline to finish (focus returns to the close button).
  await page.waitForFunction(() => document.activeElement?.matches("[data-menu-close]"));
  await page.evaluate(() => {
    const dialog = document.querySelector("#site-menu");
    const veil = document.querySelector(".route-veil");
    // setTimeout instead of rAF: headless does not run rAF when nothing repaints.
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
  // Before the fix the menu closed after page scale, about 1.6s; after the fix about 0.75-0.9s.
  assert.ok(closed.ms < 1_300, `menu closed ${Math.round(closed.ms)}ms after tap`);
  assert.ok(closed.veil >= 0.999, `menu closed before the veil covered (opacity ${closed.veil})`);
  await page.waitForURL(`${origin}/vi/residential/`);
  // Reopen the menu after the route: menu text must stay hidden until the shutter covers. syncDocumentState once cleared the menu's GSAP style
  // so all 6 groups showed immediately on the new page (owner 2026-11-08, PC).
  await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter") && !document.body.classList.contains("is-transitioning"));
  const hiddenAtOpen = await page.evaluate(() => new Promise((resolve) => {
    document.querySelector("[data-menu-open]").click();
    requestAnimationFrame(() => resolve([...document.querySelectorAll("#site-menu .menu-group")].map((group) => Number(getComputedStyle(group).opacity))));
  }));
  assert.ok(hiddenAtOpen.every((opacity) => opacity === 0), `menu groups visible at open after route: ${hiddenAtOpen}`);
  console.log(`[shared-header-menu-route-close] closed ${Math.round(closed.ms)}ms after tap, veil ${closed.veil}; reopen hidden`);
} finally {
  await browser.close();
}
