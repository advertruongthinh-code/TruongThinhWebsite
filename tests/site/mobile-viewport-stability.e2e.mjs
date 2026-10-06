import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const engines = await import("playwright");
const argument = (name, fallback) => process.argv[process.argv.indexOf(name) + 1] || fallback;
const phase = process.argv.includes("--phase") ? argument("--phase", "final") : "final";
const scope = process.argv.includes("--scope") ? argument("--scope", "all") : "all";
const base = process.env.BASE_URL || "http://127.0.0.1:8792";
const output = `.tmp/mobile-viewport-stability/${phase}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await fs.mkdir(output, { recursive: true });
const results = [];
const assets = {};
const runnerSha256 = createHash("sha256").update(await fs.readFile(new URL(import.meta.url))).digest("hex");
const slugs = ["kiosk-posm", "mobile-retail", "signage-raised-letters", "office-signs-wayfinding", "led-displays-lightboxes", "print-decals"];
const routes = ["vi", "en"].flatMap(locale => ["", "residential/", "commercial/", "advertising-products/", "about/", ...slugs.map(slug => `advertising-products/${slug}/`)].map(route => `/${locale}/${route}`));
for (const file of ["motion.js", "style.css", "detail.css", "advertising-products/catalog-runtime.mjs", "advertising-products/photo-viewer.mjs"]) {
  const source = await fs.readFile(`src/site/${file}`);
  const response = await fetch(`${base}/${file}`);
  const served = Buffer.from(await response.arrayBuffer());
  const hash = value => createHash("sha256").update(value).digest("hex");
  assets[file] = { source: hash(source), served: hash(served), status: response.status };
  assert.equal(response.status, 200, file);
  assert.equal(assets[file].source, assets[file].served, `${file} source/served provenance`);
}

// Fixture boundary này chỉ đổi metric hiển thị. Nó không phải evidence toolbar native.
function installVisibleFixture() {
  const native = window.visualViewport;
  const viewport = new EventTarget();
  for (const key of ["width", "height", "offsetLeft", "offsetTop", "pageLeft", "pageTop", "scale"]) {
    Object.defineProperty(viewport, key, { configurable: true, get: () => native?.[key] ?? (key === "height" ? innerHeight : key === "width" ? innerWidth : key === "scale" ? 1 : 0) });
  }
  Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
  window.__changeVisibleViewport = (change, event = "resize") => {
    const properties = typeof change === "number" ? { height: change } : change;
    for (const [key, value] of Object.entries(properties)) Object.defineProperty(viewport, key, { configurable: true, value });
    viewport.dispatchEvent(new Event(event));
    if (event === "resize") window.dispatchEvent(new Event("resize"));
  };
}

async function ready(page, photo = false) {
  await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
  await page.evaluate(() => document.fonts.ready);
  if (photo) await page.waitForFunction(() => {
    const image = document.querySelector("[data-advertising-photo-image]");
    return image?.complete && image.naturalWidth > 0;
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function snapshot(page) {
  return page.evaluate(() => {
    const selectors = [".hero", ".advertising-photo-view__primary", "[data-advertising-photo-image]", "[data-advertising-photo-info]", "[data-advertising-photo-description-page]", "[data-advertising-photo-related-grid]", "[data-advertising-cta-skeleton]", "[data-advertising-grid-cta]", ".site-footer"];
    const scroll = window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY;
    const rects = Object.fromEntries(selectors.map(selector => {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();
      return [selector, rect && rect.width > 0 && rect.height > 0 ? { left: rect.left, top: rect.top + scroll, width: rect.width, height: rect.height } : null];
    }));
    return { url: location.href, rects, clientWidth: document.documentElement.clientWidth, innerHeight, visibleHeight: visualViewport.height, metrics: window.TruongThinhMotion?.getViewportMetrics?.(), signature: document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaSignature };
  });
}

function stable(before, after, label) {
  assert.equal(after.clientWidth, before.clientWidth, `${label}: unchanged layout width`);
  for (const [selector, rect] of Object.entries(before.rects)) {
    if (!rect) continue;
    assert.ok(after.rects[selector], `${label}: ${selector} remains present`);
    for (const property of ["left", "top", "width", "height"]) {
      assert.ok(Math.abs(rect[property] - after.rects[selector][property]) <= 1,
        `${label}: ${selector} ${property} changed ${rect[property]}→${after.rects[selector][property]}`);
    }
  }
  assert.equal(after.signature, before.signature, `${label}: persistent CTA signature`);
}

for (const engine of (process.env.VIEWPORT_ENGINES || "chromium,firefox,webkit").split(",")) {
  const browser = await engines[engine].launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "no-preference" });
  await context.addInitScript(installVisibleFixture);
  const page = await context.newPage();
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext, seen = new WeakSet();
    window.__viewportContexts = []; window.__viewportLife = []; for (const event of ["pagehide","pageshow","visibilitychange"]) window.addEventListener(event,e=>window.__viewportLife.push({event,persisted:e.persisted,hidden:document.hidden}));
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      const gl = getContext.call(this, type, ...args);
      if (gl && /^(webgl|experimental-webgl)$/.test(type) && !seen.has(this)) {
        seen.add(this); window.__viewportContexts.push({ canvas: this, gl });
      }
      return gl;
    };
  });
  const issues = [];
  page.on("pageerror", error => issues.push(error.message));
  page.on("console", message => { if (message.type() === "error") issues.push(message.text()); });
  page.on("requestfailed", request => issues.push(`${request.url()}: ${request.failure()?.errorText}`));
  page.on("response", response => { if (response.status() >= 400) issues.push(`${response.status()}: ${response.url()}`); });
  try {
    if (["all", "shell"].includes(scope)) {
      await page.goto(`${base}/vi/`, { waitUntil: "networkidle" });
      await ready(page);
      const before = await snapshot(page);
      await page.evaluate(() => window.__changeVisibleViewport(650));
      const after = await snapshot(page);
      stable(before, after, "shared shell visible-only");
      assert.equal(after.metrics?.layoutHeight, 844, "shared stable CSS/JS layout height");
      assert.equal(after.metrics?.visible.height, 650, "shared actual visible height");
      await page.setViewportSize({ width: 390, height: 650 });
      await ready(page);
      const resized = await snapshot(page);
      assert.equal(resized.metrics.layoutHeight, 650, "true height resize reflows");
      assert.equal(resized.metrics.layoutWidth, 390, "layout width");
      results.push({ engine, case: "shared metrics/true resize", before, after, resized });
    }
    if (["all", "advertising"].includes(scope)) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${base}/vi/advertising-products/?category=kiosk-posm&photo=kiosk-posm-37`, { waitUntil: "networkidle" });
      await ready(page, true);
      const before = await snapshot(page);
      await page.evaluate(() => window.__changeVisibleViewport(650));
      await ready(page, true);
      const after = await snapshot(page);
      results.push({ engine, case: "visible-only detail geometry", before, after });
      assert.notEqual(after.visibleHeight, before.visibleHeight, "detail fixture must change visible height");
      stable(before, after, "visible-only detail geometry");
      await page.setViewportSize({ width: 390, height: 650 });
      await ready(page, true);
      const resized = await snapshot(page);
      assert.ok(Math.abs(resized.rects[".advertising-photo-view__primary"].height - after.rects[".advertising-photo-view__primary"].height) > 1, "true height resize refits primary");
      results.push({ engine, case: "true detail resize", resized });
    }
    assert.deepEqual(issues, [], "console/page/network/HTTP issues");
    if (["all", "viewer"].includes(scope)) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${base}/vi/advertising-products/?category=kiosk-posm&photo=kiosk-posm-37`, { waitUntil: "networkidle" });
      await ready(page, true);
      const motion = await page.evaluate(async () => {
        document.querySelector("[data-advertising-photo-expand]").click();
        const dialog = document.querySelector("#advertising-photo-dialog");
        const image = dialog.querySelector("img");
        const animation = image.getAnimations()[0];
        const before = dialog.dataset.advertisingViewerState;
        window.__changeVisibleViewport(650);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { before, after: dialog.dataset.advertisingViewerState, kept: image.getAnimations().includes(animation), animationState: animation?.playState };
      });
      results.push({ engine, case: "toolbar preserves opening motion", motion });
      assert.equal(motion.before, "opening");
      assert.equal(motion.after, "opening", "toolbar must not cancel opening");
      assert.equal(motion.kept, true, "same opening animation remains active");
      await page.waitForFunction(() => document.querySelector("#advertising-photo-dialog").dataset.advertisingViewerState === "open");
      const geometry = () => page.evaluate(() => {
        const image = document.querySelector("[data-advertising-photo-expanded-image]");
        const bounds = image.getBoundingClientRect();
        return { width: bounds.width, height: bounds.height, transform: image.style.transform,
          controls: [...document.querySelectorAll("#advertising-photo-dialog button")].filter(button => !button.disabled && !button.hidden).map(button => {
            const rect = button.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
          }) };
      });
      await page.locator("[data-advertising-photo-zoom-in]").click();
      await page.waitForFunction(() => document.querySelector("#advertising-photo-dialog").dataset.advertisingViewerState === "open");
      const beforeZoom = await geometry();
      await page.evaluate(() => window.__changeVisibleViewport(500));
      await ready(page);
      const afterZoom = await geometry();
      assert.equal(afterZoom.transform, beforeZoom.transform, "toolbar preserves zoom/pan");
      assert.equal(afterZoom.width, beforeZoom.width, "stable viewer image width");
      assert.equal(afterZoom.height, beforeZoom.height, "stable viewer image height");
      afterZoom.controls.forEach(rect => { assert.ok(rect.top >= 0 && rect.bottom <= 500 && rect.left >= 0 && rect.right <= 390, "controls in visible rect"); });
      await page.evaluate(() => window.__changeVisibleViewport({ width: 195, height: 420, offsetLeft: 195, offsetTop: 100, scale: 2 }, "scroll"));
      await ready(page);
      const panned = await geometry();
      assert.equal(panned.transform, afterZoom.transform, "native visible pan preserves image transform");
      panned.controls.forEach(rect => assert.ok(rect.left >= 195 && rect.right <= 390 && rect.top >= 100 && rect.bottom <= 520, "controls follow visible offsets"));
      await page.evaluate(() => window.__changeVisibleViewport({ width: 390, height: 500, offsetLeft: 0, offsetTop: 0, scale: 1 }));
      const closing = await page.evaluate(async () => {
        document.querySelector("[data-advertising-photo-close]").click();
        window.__changeVisibleViewport(650);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return document.querySelector("#advertising-photo-dialog").dataset.advertisingViewerState;
      });
      assert.equal(closing, "closing", "toolbar preserves closing motion");
      await page.waitForFunction(() => !document.querySelector("#advertising-photo-dialog").open);
      results.push({ engine, case: "viewer zoom/controls/closing", beforeZoom, afterZoom, panned });
    }
    if (["all", "visibility"].includes(scope)) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${base}/vi/advertising-products/?category=kiosk-posm`, { waitUntil: "networkidle" });
      await ready(page);
      await page.evaluate(() => {
        const frame = document.querySelector("[data-advertising-cta-frame]");
        window.TruongThinhMotion.setLogicalScroll(frame.getBoundingClientRect().top + scrollY - 100);
        window.__changeVisibleViewport({ width: 190, height: 420, offsetTop: 0, offsetLeft: 0, scale: 2 });
        window.__viewportFrames = new Map([...document.querySelectorAll("[data-advertising-cta-frame]")].map(frame => [frame.dataset.advertisingCtaSlot, frame]));
      });
      await page.waitForTimeout(800);
      await page.waitForFunction(() => document.querySelector('[data-advertising-flow-state="running"]'), { }, { timeout: 3000 });
      const running = () => page.evaluate(() => [...document.querySelectorAll('[data-advertising-flow-state="running"]')].map(frame => {
        const rect = frame.getBoundingClientRect(), visible = visualViewport;
        return { slot: frame.dataset.advertisingCtaSlot, visible: rect.right > visible.offsetLeft && rect.left < visible.offsetLeft + visible.width && rect.bottom > visible.offsetTop && rect.top < visible.offsetTop + visible.height };
      }));
      const before = await snapshot(page), left = await running();
      results.push({ engine, case: "visibility eligibility before assertions", before, left, state: await page.evaluate(() => ({ life:window.__viewportLife, contexts: window.__viewportContexts.map(({canvas,gl}) => ({slot:canvas.closest("[data-advertising-cta-frame]")?.dataset.advertisingCtaSlot,lost:gl.isContextLost(),connected:canvas.isConnected})), reduced: matchMedia("(prefers-reduced-motion: reduce)").matches, classes: document.body.className, hidden: document.hidden, frames: [...document.querySelectorAll("[data-advertising-cta-frame]")].map(frame => ({ slot: frame.dataset.advertisingCtaSlot, state: frame.dataset.advertisingFlowState, classes: frame.className, rect: frame.getBoundingClientRect().toJSON() })) })) });
      assert.ok(left.length > 0 && left.length <= 2, "zoomed visible frames obtain bounded leases");
      assert.ok(left.every(frame => frame.visible), "leases only inside zoomed visible rect");
      await page.evaluate(() => window.__changeVisibleViewport({ offsetLeft: 200, offsetTop: 160 }, "scroll"));
      await page.waitForTimeout(800);
      const after = await snapshot(page), right = await running();
      assert.ok(right.length > 0 && right.length <= 2, "offset-only pan reconciles leases");
      assert.ok(right.every(frame => frame.visible), "panned leases only inside actual visible rect");
      assert.notDeepEqual(right.map(frame => frame.slot), left.map(frame => frame.slot), "pan really changed eligible slots");
      stable(before, after, "visible offset/scale preserves geometry");
      assert.equal(await page.evaluate(() => [...window.__viewportFrames].every(([slot, frame]) => document.querySelector(`[data-advertising-cta-slot="${slot}"]`) === frame)), true, "pan preserves common frame identity");
      results.push({ engine, case: "offset/scale visibility", before, after, left, right });
    }
    if (["all", "fallback"].includes(scope)) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.route("**/motion.js", route => route.fulfill({ status: 200, contentType: "application/javascript", body: "/* Deliberate unavailable shell script boundary. */" }));
      await page.goto(`${base}/vi/advertising-products/?category=kiosk-posm&photo=kiosk-posm-37`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => document.querySelector("[data-advertising-photo-image]")?.complete && document.querySelector("[data-advertising-photo-related-grid]")?.style.height);
      await page.evaluate(() => document.fonts.ready);
      const before = await snapshot(page);
      assert.equal(before.metrics, undefined, "no bridge in shell-unavailable fallback");
      await page.evaluate(() => {
        Object.defineProperty(window, "innerHeight", { configurable: true, value: 650 });
        window.__changeVisibleViewport(650);
      });
      await page.waitForTimeout(250);
      const after = await snapshot(page);
      results.push({ engine, case: "native fallback visible-only", before, after });
      stable(before, after, "native fallback stable geometry");
      assert.equal(await page.locator(".site-viewport-metrics").count(), 1, "fallback keeps one document probe");
      await page.unroute("**/motion.js");
    }
    if (["all", "matrix"].includes(scope)) {
      for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(viewport);
        for (const route of routes) {
          const response = await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
          assert.equal(response.status(), 200, route);
          await ready(page);
          const before = await snapshot(page);
          await page.evaluate(height => window.__changeVisibleViewport(height), viewport.height - 80);
          await ready(page);
          const after = await snapshot(page);
          stable(before, after, `${route} ${viewport.width} visible-only`);
          assert.equal(after.metrics.layoutHeight, viewport.height, "same CSS stable basis");
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          assert.ok(overflow <= 1, `${route}: horizontal overflow ${overflow}`);
          results.push({ engine, route, viewport, case: "route geometry", before, after });
        }
      }
    }
    if (["all", "states"].includes(scope)) {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 390, height: 844 });
      for (const route of routes.filter(route => !/advertising-products\/[^/]+\/$/.test(route))) {
        try {
        await page.goto(`${base}${route}`, { waitUntil: "networkidle" }); await ready(page);
        const before = await snapshot(page);
        await page.evaluate(() => window.__changeVisibleViewport(650)); await ready(page);
        const after = await snapshot(page); stable(before, after, `${route} reduced native geometry`);
        assert.equal(await page.locator(".site-viewport-metrics").count(), 1, "one document probe");
        await page.addStyleTag({ content: "html { font-size:200% !important; }" }); await ready(page);
        assert.equal(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize)), 32, "200% root text-size fixture applied");
        const textZoom = await snapshot(page);
        assert.equal(textZoom.metrics.layoutHeight, 844, "typography keeps native layout basis");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        const menu = page.locator("[data-menu-open]"); await menu.focus();
        await page.keyboard.press("Enter"); await page.waitForFunction(() => document.body.classList.contains("menu-open"));
        await page.keyboard.press("Escape"); await page.waitForFunction(() => !document.body.classList.contains("menu-open"));
        assert.equal(await menu.evaluate(button => button === document.activeElement), true, "menu restores keyboard focus");
        results.push({ engine, route, case: "reduced/text size/menu focus", before, after, textZoom });
        assert.ok(overflow <= 1, `${route}: text size horizontal overflow ${overflow}px`);
        } catch (error) {
          results.push({ engine, route, case: "state matrix", failure: error.message, issues: [...issues] });
          await page.screenshot({ path: `${output}/${engine}-${route.replaceAll("/", "-")}-state-failure.png` });
        }
      }
      for (const width of [980, 981]) {
        await page.setViewportSize({ width, height: 650 }); await ready(page);
        assert.equal((await snapshot(page)).metrics.layoutHeight, 650, "shared breakpoint resolves actual layout height");
      }
      results.push({ engine, case: "980/981 true width resize" });
    }
    assert.deepEqual(issues, [], "all scenarios console/page/network/HTTP issues");
  } catch (error) {
    results.push({ engine, failure: error.message, issues });
    await page.screenshot({ path: `${output}/${engine}-failure.png` });
  } finally { await browser.close(); }
}
const failures = results.filter(result => result.failure);
await fs.writeFile(`${output}/results.json`, JSON.stringify({ phase, scope, runnerSha256, assets, results }, null, 2));
console.log(JSON.stringify({ output, phase, scope, samples: results.length, failures }));
if (failures.length) process.exitCode = 1;
