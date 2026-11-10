import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// docs/specs/scroll-feel.md R6: Chrome-style middle-mouse autoscroll while Locomotive runs.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/middle-autoscroll.e2e.mjs
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

const open = async (options) => {
  const page = await browser.newPage(options);
  await page.goto(`${baseUrl}/vi/`, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
  // Wait for lazy images and sections to finish loading so Locomotive's scroll limit is long enough.
  await page.waitForTimeout(2000);
  return page;
};
const scrollY = (page) => page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
const origin = (page) => page.locator(".autoscroll-origin").count();
// Empty point at the screen center: not on a link, button or input.
const blank = (page) => page.evaluate(() => {
  for (let y = 300; y < 800; y += 20) for (let x = 200; x < 1200; x += 40) {
    const element = document.elementFromPoint(x, y);
    if (element && !element.closest("a[href], button, input, textarea, select, label, dialog, [contenteditable]")) return { x, y };
  }
  return null;
});
const rest = async (page) => {
  let previous = await scrollY(page);
  for (;;) {
    await page.waitForTimeout(250);
    const current = await scrollY(page);
    if (Math.abs(current - previous) < 1) return current;
    previous = current;
  }
};

try {
  const page = await open({ viewport: { width: 1440, height: 900 } });
  const point = await blank(page);
  assert.ok(point, "a blank point exists on the home page");

  // Sticky mode: release immediately, speed follows the Chrome formula 0.04 × d^2.2 (116px is about 1393, 216px about 5468 px/s).
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: "middle" });
  await page.mouse.up({ button: "middle" });
  assert.equal(await origin(page), 1, "sticky press shows the origin icon");
  const icon = await page.locator(".autoscroll-origin").boundingBox();
  assert.ok(icon.width === 32 && icon.height === 32, `origin icon is 32px, got ${icon.width}x${icon.height}`);
  // Measure from rest to rest: drag the mouse out and back to the origin (dead zone, speed 0), wait for inertia to stop.
  // By then the logical scroll has caught up with the target, so the distance equals formula times time exactly; measuring midway, Locomotive's
  // inertia lag varies with frame length and a busy runner skews the measured speed by 15% or more.
  const measure = async (distance, seconds) => {
    // Return to the top before each measurement so the page-bottom limit is not hit.
    await page.mouse.move(point.x, point.y);
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    const before = await rest(page);
    await page.evaluate(() => {
      if (!window.__ttMoves) addEventListener("mousemove", (event) => window.__ttMoves.push(event.timeStamp));
      window.__ttMoves = [];
    });
    await page.mouse.move(point.x, point.y + distance);
    await page.waitForTimeout(seconds * 1000);
    const cursor = await page.evaluate(() => document.documentElement.dataset.autoscroll);
    await page.mouse.move(point.x, point.y);
    const after = await rest(page);
    const [start, end] = (await page.evaluate(() => window.__ttMoves)).slice(-2);
    return { speed: ((after - before) * 1000) / (end - start), cursor };
  };
  const { speed } = await measure(116, 1.5);
  assert.ok(speed > 1250 && speed < 1530, `sticky speed at 116px about 1393px/s, got ${speed}`);
  // The home page scrolls about 4400px, so the 216px window lasts only 0.6 seconds; a one-frame error around the two large mouse moves matters more.
  const { speed: fast, cursor } = await measure(216, 0.6);
  assert.ok(fast > 4900 && fast < 6000, `sticky speed at 216px about 5468px/s, got ${fast}`);
  assert.equal(cursor, "down", "cursor points down");

  // Wheel scroll stops it: the icon disappears, the page stops after inertia.
  await page.mouse.wheel(0, 1);
  await page.waitForTimeout(100);
  assert.equal(await origin(page), 0, "wheel removes the origin icon");
  const stopped = await rest(page);
  await page.waitForTimeout(500);
  assert.ok(Math.abs((await scrollY(page)) - stopped) < 1, "page stays still after a wheel stop");
  console.log(`PASS sticky ${Math.round(speed)} and ${Math.round(fast)}px/s, wheel stop`);

  // Press and hold, drag up, then release: scrolls up while held, stops on release. The page has scrolled, so find an empty point again:
  // the old point may land on a link, and a middle click on a link does not start autoscroll.
  const holdPoint = await blank(page);
  assert.ok(holdPoint, "a blank point exists after the sticky run");
  await page.mouse.move(holdPoint.x, holdPoint.y);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(holdPoint.x, holdPoint.y - 116, { steps: 4 });
  await page.waitForTimeout(800);
  const held = await scrollY(page);
  assert.ok(held < stopped - 200, `hold-drag scrolls up, ${stopped} -> ${held}`);
  await page.mouse.up({ button: "middle" });
  assert.equal(await origin(page), 0, "releasing after a drag stops");
  console.log("PASS hold-drag");

  // Stop with the left mouse button (triggers nothing underneath) and with a key.
  const url = page.url();
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: "middle" });
  await page.mouse.up({ button: "middle" });
  await page.mouse.click(point.x, point.y);
  assert.equal(await origin(page), 0, "left click stops");
  assert.equal(page.url(), url, "the stopping click does not navigate");
  await page.mouse.down({ button: "middle" });
  await page.mouse.up({ button: "middle" });
  await page.keyboard.press("Shift");
  assert.equal(await origin(page), 0, "a key press stops");
  console.log("PASS click and key stop");

  // A middle click on a link does not start; locked logical scroll (viewer, menu) does not either.
  await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
  const link = await page.locator("a[href]:visible").first().boundingBox();
  await page.mouse.move(link.x + link.width / 2, link.y + link.height / 2);
  await page.mouse.down({ button: "middle" });
  assert.equal(await origin(page), 0, "middle press on a link keeps the browser default");
  await page.mouse.up({ button: "middle" });
  await page.evaluate(() => window.TruongThinhMotion.lockLogicalScroll());
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: "middle" });
  await page.mouse.up({ button: "middle" });
  assert.equal(await origin(page), 0, "locked scroll does not start");
  await page.evaluate(() => window.TruongThinhMotion.unlockLogicalScroll());
  console.log("PASS link and lock");

  // Below 981px and with reduced motion the page scrolls natively, autoscroll does not start itself.
  for (const options of [{ viewport: { width: 390, height: 844 } }, { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }]) {
    const other = await open(options);
    const spot = await blank(other) || { x: 100, y: 400 };
    await other.mouse.move(spot.x, spot.y);
    await other.mouse.down({ button: "middle" });
    await other.mouse.up({ button: "middle" });
    assert.equal(await origin(other), 0, `no custom autoscroll for ${JSON.stringify(options)}`);
    await other.close();
  }
  console.log("PASS native fallback");

  // The icon sticks to screen pixels at Windows 125% and 150% scaling: the top-left corner lands exactly on a device pixel.
  for (const deviceScaleFactor of [1.25, 1.5]) {
    const scaled = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor });
    const spot = await blank(scaled);
    await scaled.mouse.move(spot.x + 0.3, spot.y + 0.3);
    await scaled.mouse.down({ button: "middle" });
    await scaled.mouse.up({ button: "middle" });
    const box = await scaled.locator(".autoscroll-origin").boundingBox();
    for (const edge of [box.x, box.y]) {
      assert.ok(Math.abs(edge * deviceScaleFactor - Math.round(edge * deviceScaleFactor)) < 0.01,
        `origin icon edge ${edge} lands on a device pixel at ${deviceScaleFactor}`);
    }
    await scaled.close();
  }
  console.log("PASS icon pixel snap");
} finally {
  await browser.close();
}
