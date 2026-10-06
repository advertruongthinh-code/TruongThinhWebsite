import assert from "node:assert/strict";
import process from "node:process";

// A reduced-motion change while the page is open must resume or pause motion without a reload.
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });

try {
  const page = await browser.newPage({ viewport: { width: 360, height: 800 }, reducedMotion: "reduce" });
  await page.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "networkidle" });
  const paused = () => page.evaluate(() => document.body.classList.contains("motion-paused"));
  assert.equal(await paused(), true, "reduced motion pauses the page");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(() => !document.body.classList.contains("motion-paused"));
  const frame = page.locator("[data-advertising-cta-slot]").first();
  await frame.scrollIntoViewIfNeeded();
  await page.waitForFunction(() =>
    document.querySelector('[data-advertising-cta-slot][data-advertising-flow-state="running"]'));

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => document.body.classList.contains("motion-paused"));
  assert.equal(await frame.getAttribute("data-advertising-flow-state"), "paused", "reduce pauses the skeleton again");
  console.log("reduced-motion-live: pass");
} finally {
  await browser.close();
}
