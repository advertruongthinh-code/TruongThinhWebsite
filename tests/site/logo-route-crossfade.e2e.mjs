// Mark đổi màu bằng crossfade khi chuyển trang (docs/specs/logo-route-crossfade.md R1-R6).
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/logo-route-crossfade.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

// Ghi mỗi frame: animation clip-path (kiểu mọc) trên path của mark, lớp fade, class màu header, opacity veil.
const startRecorder = () => {
  const t0 = performance.now();
  const header = document.querySelector("[data-site-header]");
  const veil = document.querySelector(".route-veil");
  const record = { rises: 0, fades: [], veilClosed: undefined, veilOpen: undefined };
  const seen = new WeakSet();
  let fade;
  const tick = () => {
    const now = Math.round(performance.now() - t0);
    document.querySelectorAll("#header-logo .brand-lockup__mark path").forEach((item) =>
      item.getAnimations().forEach((animation) => {
        if (seen.has(animation)) return;
        seen.add(animation);
        if ("clipPath" in animation.effect.getKeyframes()[0]) record.rises += 1;
      }));
    const layer = document.querySelector("#header-logo .brand-lockup__mark-fade");
    if (layer !== fade?.layer) {
      if (fade) fade.entry.end = now;
      fade = layer ? { layer, entry: { start: now, to: [...header.classList].find((name) => name.startsWith("is-brand-")) } } : undefined;
      if (fade) record.fades.push(fade.entry);
    }
    const opacity = Number(getComputedStyle(veil).opacity);
    if (opacity === 1 && record.veilClosed === undefined) record.veilClosed = now;
    if (opacity === 0 && record.veilClosed !== undefined && record.veilOpen === undefined) record.veilOpen = now;
    if (now < 5000) requestAnimationFrame(tick);
  };
  tick();
  window.__logoRecord = record;
};
const readRecord = (page) => page.evaluate(() => ({
  ...window.__logoRecord,
  final: [...document.querySelector("[data-site-header]").classList].find((name) => name.startsWith("is-brand-")),
}));
const settle = (page) => page.waitForFunction(() =>
  !document.body.classList.contains("is-transitioning") && !document.documentElement.classList.contains("route-enter"));
const open = async (viewport, reducedMotion, route) => {
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  await page.goto(`${origin}${route}`, { waitUntil: "load" });
  await settle(page);
  await page.waitForTimeout(1500);
  return { context, page };
};
// Click bằng script để link trong menu (ẩn ở điện thoại) cũng đi qua Barba như click thật.
const go = async (page, selector) => {
  await page.evaluate(startRecorder);
  await page.evaluate((target) => document.querySelector(target).click(), selector);
  await page.waitForTimeout(400);
  await settle(page);
  await page.waitForTimeout(1200);
  return readRecord(page);
};

const scenarios = [
  { name: "home to residential", from: "/vi/", link: 'a[href="/vi/residential/"]', fades: ["is-brand-color", "is-brand-inverse"], final: "is-brand-inverse" },
  { name: "home to advertising", from: "/vi/", link: 'a[href="/vi/advertising-products/"]', fades: ["is-brand-color"], final: "is-brand-color" },
  { name: "advertising to home", from: "/vi/advertising-products/", link: 'a[href="/vi/"]', fades: ["is-brand-inverse"], final: "is-brand-inverse" },
  { name: "locale switch on home", from: "/vi/", link: '[data-language-option="en"]', fades: ["is-brand-color", "is-brand-inverse"], final: "is-brand-inverse" },
];

try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 412, height: 915 }]) {
    for (const scenario of scenarios) {
      const label = `${viewport.width}px ${scenario.name}`;
      const { context, page } = await open(viewport, "no-preference", scenario.from);
      const record = await go(page, scenario.link);
      assert.equal(record.rises, 0, `${label}: no rising bands during the route ${JSON.stringify(record)}`);
      assert.deepEqual(record.fades.map((fade) => fade.to), scenario.fades, `${label}: crossfades ${JSON.stringify(record)}`);
      assert.equal(record.final, scenario.final, `${label}: final mark colour`);
      // R2: crossfade sang trắng chạy cùng nhịp veil mở, xong cùng lúc veil gỡ.
      const last = record.fades.at(-1);
      if (last.to === "is-brand-inverse") {
        assert.ok(last.start >= record.veilClosed, `${label}: white crossfade waits for the full veil ${JSON.stringify(record)}`);
        assert.ok(Math.abs(last.end - record.veilOpen) < 200, `${label}: white crossfade ends with the veil ${JSON.stringify(record)}`);
      }
      console.log(`PASS ${label}: ${record.fades.length} crossfade(s), 0 rises`);
      await context.close();
    }
  }

  // R5: bấm link lúc mark đang mọc dở; phần đang hiển thị thành lớp fade, không còn kiểu mọc.
  {
    const { context, page } = await open({ width: 1440, height: 900 }, "no-preference", "/vi/");
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(400));
    await page.waitForFunction(() => document.querySelector("#header-logo .brand-lockup__mark-underlay"));
    await page.evaluate(() => {
      window.TruongThinhMotion.setLogicalScroll(0);
    });
    await page.waitForFunction(() => document.querySelector("[data-site-header]").classList.contains("is-brand-inverse"));
    await page.evaluate(() => document.querySelector('a[href="/vi/residential/"]').click());
    const state = await page.evaluate(() => ({
      running: [...document.querySelectorAll("#header-logo .brand-lockup__mark path")].some((item) => item.getAnimations().length),
      underlay: Boolean(document.querySelector("#header-logo .brand-lockup__mark-underlay")),
      layerPaths: document.querySelectorAll("#header-logo .brand-lockup__mark-fade path").length,
    }));
    assert.deepEqual({ running: state.running, underlay: state.underlay }, { running: false, underlay: false }, "mid-rise: rise stops at the click");
    assert.ok(state.layerPaths > 4, `mid-rise: fade layer keeps the half-risen layers ${JSON.stringify(state)}`);
    await settle(page);
    console.log("PASS mid-rise click: visible layers fade out");
    await context.close();
  }

  // R6: reduced motion đổi ngay, không crossfade, không mọc.
  {
    const { context, page } = await open({ width: 412, height: 915 }, "reduce", "/vi/");
    const record = await go(page, 'a[href="/vi/residential/"]');
    assert.deepEqual({ rises: record.rises, fades: record.fades.length, final: record.final }, { rises: 0, fades: 0, final: "is-brand-inverse" }, "reduced motion");
    console.log("PASS reduced motion: colour changes at once");
    await context.close();
  }
} finally {
  await browser.close();
}
