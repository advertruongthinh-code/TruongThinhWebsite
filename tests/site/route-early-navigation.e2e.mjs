import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

// Site shell R6: a soft route started while the direct-load reveal still waits (fonts, veil hold) must finish.
// The stale reveal used to kill the new cover tween, so Barba's leave() never resolved and isRunning stayed true.
const cases = [
  { from: "/vi/advertising-products/", to: "/vi/projects/", viewport: { width: 1440, height: 900 } },
  { from: "/vi/", to: "/vi/residential/", viewport: { width: 390, height: 844 } },
];

try {
  for (const { from, to, viewport } of cases) {
    const page = await browser.newPage({ viewport });
    try {
      // Navigate in the same task that sets motion-ready, the earliest moment a user click can land.
      await page.addInitScript((target) => {
        const observer = new MutationObserver(() => {
          if (!document.documentElement.classList.contains("motion-ready")) return;
          observer.disconnect();
          void window.barba.go(target);
        });
        // Observe from DOMContentLoaded, as a click could, so the shell scripts have run.
        document.addEventListener("DOMContentLoaded", () => {
          observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        }, { once: true });
      }, to);
      await page.goto(`${origin}${from}`);
      await page.waitForFunction(
        (target) => location.pathname === target && window.barba && !window.barba.transitions.isRunning
          && !document.documentElement.classList.contains("route-enter"),
        to,
        { timeout: 15_000, polling: 100 },
      ).catch(async () => {
        const state = await page.evaluate(() => ({ path: location.pathname, running: window.barba?.transitions.isRunning }));
        assert.fail(`${from} -> ${to}: soft route stuck: ${JSON.stringify(state)}`);
      });
      await page.waitForFunction(() => Number(getComputedStyle(document.querySelector(".route-veil")).opacity) === 0, null, { timeout: 5_000 });
    } finally {
      await page.close();
    }
  }
  console.log("route-early-navigation: ok");
} finally {
  await browser.close();
}
