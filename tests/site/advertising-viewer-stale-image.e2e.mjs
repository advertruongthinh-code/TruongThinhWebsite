// The viewer must never show the previous card's photo while the new photo is still loading.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/advertising-viewer-stale-image.e2e.mjs
// Real Android phone: adb forward tcp:9222 localabstract:chrome_devtools_remote, adb reverse tcp:8790 tcp:8790, then
// DEVICE_CDP=http://127.0.0.1:9222 PROXY_PORT=8790 node tests/site/advertising-viewer-stale-image.e2e.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
// Slow mode holds every image response for a while, so the next card's photo is still loading when the viewer opens.
let slow = false;
const proxy = createServer(async (request, response) => {
  const upstream = await fetch(base + request.url, { headers: { accept: request.headers.accept || "*/*" } });
  const headers = Object.fromEntries([...upstream.headers].filter(([name]) => !["content-encoding", "content-length", "transfer-encoding"].includes(name)));
  const body = Buffer.from(await upstream.arrayBuffer());
  if (slow && /\.(?:jxl|webp|avif|jpe?g|png)$/.test(new URL(request.url, base).pathname)) {
    await new Promise((resolve) => setTimeout(resolve, 8000));
  }
  response.writeHead(upstream.status, { ...headers, "content-length": body.length, "cache-control": "no-store" });
  response.end(body);
}).listen(Number(process.env.PROXY_PORT || 0), "127.0.0.1");
await new Promise((resolve) => proxy.once("listening", resolve));
const origin = `http://127.0.0.1:${proxy.address().port}`;
const device = process.env.DEVICE_CDP;
const browser = device ? await chromium.connectOverCDP(device)
  : await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const cases = device ? [{ label: "device", touch: true }]
  : [{ label: "1440", viewport: { width: 1440, height: 900 }, touch: false }, { label: "390", viewport: { width: 390, height: 844 }, touch: true }];
// One touch tap through CDP, which works on emulated and real touch screens alike.
const tap = async (page, x, y) => {
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await session.detach();
};

try {
  for (const { label, viewport, touch } of cases) {
    const context = device ? browser.contexts()[0] : await browser.newContext({ viewport, hasTouch: touch });
    const page = await context.newPage();
    slow = false;
    await page.goto(`${origin}/vi/advertising-products/`);
    await page.locator("[data-project-grid] [data-advertising-card] a").first().click();
    const loaded = () => {
      const image = document.querySelector("[data-advertising-photo-image]");
      return image?.complete && image.naturalWidth && !document.querySelector("[data-advertising-photo-loading=true]");
    };
    await page.waitForFunction(loaded, null, { timeout: 60_000 });

    // First zoom: the viewer image ends on card A's photo.
    await page.evaluate(() => document.querySelector("[data-advertising-photo-expand]").click());
    await page.waitForFunction(() => {
      const image = document.querySelector("[data-advertising-photo-expanded-image]");
      return image.complete && image.naturalWidth && document.querySelector("dialog[open]");
    }, null, { timeout: 60_000 });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog[open]"));

    // Card B from the related grid, with slow images: zoom before its photo arrives.
    slow = true;
    const nextId = await page.evaluate(() => {
      const current = document.querySelector("[data-advertising-photo-image]").dataset.advertisingPhotoId;
      const card = [...document.querySelectorAll("[data-advertising-related-card]")]
        .find((node) => node.dataset.advertisingRelatedCard !== current && node.querySelector(":scope > a"));
      card.querySelector(":scope > a").click();
      return card.dataset.advertisingRelatedCard;
    });
    await page.waitForFunction((id) => document.querySelector("[data-advertising-photo-image]").dataset.advertisingPhotoId === id, nextId);
    assert.ok(await page.evaluate(() => !document.querySelector("[data-advertising-photo-image]").complete),
      `${label}: card B photo must still be loading for this test`);
    // The last open's picture is gone, so no later open can paint it.
    assert.ok(await page.evaluate(() => !document.querySelector("[data-advertising-photo-expanded-image]").hasAttribute("src")),
      `${label}: closing the viewer drops its picture`);
    // Owner 2026-11-11: while the primary photo loads the expand button is locked and a tap on the photo does nothing.
    assert.ok(await page.locator("[data-advertising-photo-expand]").isDisabled(), `${label}: expand button locked while card B loads`);
    // Desktop: the icon is a spinning loader; touch screens hide the button, so the icon stays still.
    const spinning = () => document.querySelector("[data-advertising-photo-expand-icon]").getAnimations().length > 0;
    assert.equal(await page.evaluate(spinning), !touch, `${label}: loading icon spins only where the button shows`);
    await page.evaluate(() => document.querySelector("[data-advertising-photo-expand]").click());
    if (touch) {
      const frame = await page.locator("[data-advertising-photo-image]").boundingBox();
      await tap(page, frame.x + frame.width / 2, frame.y + frame.height / 2);
    }
    await page.waitForTimeout(400);
    assert.ok(await page.evaluate(() => !document.querySelector("dialog[open]")), `${label}: viewer stays closed while card B loads`);

    // Chrome keeps painting the last decoded picture of an <img> until its new src loads, while currentSrc and
    // naturalWidth already describe the new src. So the viewer image must never be visible before it is complete.
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-expand]").disabled, null, { timeout: 60_000 });
    assert.ok(await page.evaluate(() => document.querySelector("[data-advertising-photo-image]").complete), `${label}: unlocks once loaded`);
    // The spinner morphs back into the expand icon within a second and stops.
    await page.waitForFunction(() => {
      const group = document.querySelector("[data-advertising-photo-expand-icon]");
      return !group.getAnimations().length && !group.style.transform && group.querySelector("path").getAttribute("d").startsWith("M15.00 3.00");
    }, null, { timeout: 2000 });
    await page.evaluate(() => {
      const image = document.querySelector("[data-advertising-photo-expanded-image]");
      window.__staleFrames = 0;
      window.__done = false;
      const end = performance.now() + 1000;
      const tick = () => {
        if (document.querySelector("dialog[open]")) {
          const style = getComputedStyle(image);
          const visible = image.checkVisibility() && style.visibility !== "hidden" && Number(style.opacity) > 0;
          if (visible && image.getAttribute("src") && !image.complete) window.__staleFrames += 1;
        }
        if (performance.now() < end) requestAnimationFrame(tick);
        else window.__done = true;
      };
      requestAnimationFrame(tick);
      document.querySelector("[data-advertising-photo-expand]").click();
    });
    await page.waitForFunction(() => window.__done);
    assert.ok(await page.evaluate(() => document.querySelector("dialog[open]")), `${label}: viewer opens once loaded`);
    if (process.env.DEBUG) await page.screenshot({ path: `.tmp/stale-${label}.png` });
    const staleFrames = await page.evaluate(() => window.__staleFrames);
    assert.equal(staleFrames, 0, `${label}: viewer drew a stale picture for ${staleFrames} frames on card B ${nextId}`);
    if (device) await page.close();
    else await context.close();
  }
  console.log("PASS advertising viewer stale image");
} finally {
  // Connected over CDP this only disconnects; the phone keeps its Chrome.
  await browser.close();
  proxy.close();
}
