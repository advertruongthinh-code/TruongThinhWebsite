// Ảnh trong màn hình lên bản gốc sau khi bản vừa khung đã hiện (progressive-loading R10).
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/image-upgrade.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const VARIANT = /-(?:240|480|960|1600|2048)\.(?:jxl|webp)$/;
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const open = async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const originals = [];
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith("/assets/content/") && /\.(?:jxl|webp)$/.test(pathname) && !VARIANT.test(pathname)) {
      originals.push({ pathname, at: Date.now() });
    }
  });
  return { page, originals };
};
const pathOf = (page, selector) => page.evaluate((selector) => {
  const image = document.querySelector(selector);
  return image?.currentSrc ? new URL(image.currentSrc).pathname : "";
}, selector);

try {
  // Trang tĩnh: hero hiện bản vừa khung trước, trang ngừng cuộn thì đổi sang bản gốc, bản gốc tải đúng một lần.
  {
    const { page, originals } = await open();
    await page.goto(`${base}/vi/residential/`, { waitUntil: "load" });
    const hero = ".detail-hero .hero-slide.is-active img";
    await page.waitForFunction((selector) => document.querySelector(selector)?.closest(".is-media-settled"), hero);
    assert.match(await pathOf(page, hero), VARIANT, "hero shows its fitted variant first");
    // Cuộn xuống liên tục 3s: mỗi lần đổi lên bản gốc (srcset chỉ còn một URL không có bề rộng) phải xảy ra khi trang
    // đã đứng yên ít nhất 200ms. Đo theo vị trí cuộn thật, vì lúc intro hero trang chưa nhận cuộn.
    await page.evaluate(() => {
      window.__upgradeTrace = [];
      let movedAt = performance.now();
      let last;
      const tick = () => {
        const y = window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY;
        if (y !== last) movedAt = performance.now();
        last = y;
        requestAnimationFrame(tick);
      };
      tick();
      new MutationObserver((records) => records.forEach(({ target }) => {
        const srcset = target.getAttribute("srcset");
        if (srcset && !/\s\d+w/.test(srcset)) window.__upgradeTrace.push(Math.round(performance.now() - movedAt));
      })).observe(document, { subtree: true, attributes: true, attributeFilter: ["srcset"] });
    });
    await page.mouse.move(720, 450);
    const started = Date.now();
    while (Date.now() - started < 3000) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(80);
    }
    const idle = await page.evaluate(() => window.__upgradeTrace);
    assert.ok(idle.every((ms) => ms >= 200), `an image upgraded while the page scrolled ${JSON.stringify(idle)}`);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction((selector) => {
      const image = document.querySelector(selector);
      return image?.currentSrc && !/-(?:240|480|960|1600|2048)\.\w+$/.test(image.currentSrc);
    }, hero, { timeout: 20_000 }).catch(async () => assert.fail(`hero stays on its variant ${await pathOf(page, hero)}`));
    const heroOriginal = await pathOf(page, hero);
    assert.equal(originals.filter(({ pathname }) => pathname === heroOriginal).length, 1, `hero original requested once ${heroOriginal}`);
    await page.close();
  }

  // Advertising: card trong màn hình đổi sang bản gốc sau khi blur tan; card ngoài màn hình giữ bản vừa khung.
  {
    const { page } = await open();
    await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelectorAll("[data-project-grid] [data-advertising-card] img").length > 8);
    const cards = () => page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-advertising-card] img")]
      .filter((image) => image.currentSrc).map((image) => {
        const { top, bottom } = image.getBoundingClientRect();
        return { visible: bottom > 0 && top < innerHeight, original: !/-(?:240|480|960|1600|2048)\.\w+$/.test(image.currentSrc) };
      }));
    await page.waitForFunction(() => {
      const shown = [...document.querySelectorAll("[data-project-grid] [data-advertising-card] img")].filter((image) => {
        const { top, bottom } = image.getBoundingClientRect();
        return image.currentSrc && bottom > 0 && top < innerHeight;
      });
      return shown.length && shown.every((image) => !/-(?:240|480|960|1600|2048)\.\w+$/.test(image.currentSrc));
    }, null, { timeout: 60_000 }).catch(async () => assert.fail(`visible cards stay on their variant ${JSON.stringify(await cards())}`));
    const state = await cards();
    assert.ok(state.some(({ visible, original }) => !visible && !original), `cards out of view keep their variant ${JSON.stringify(state)}`);
    await page.close();
  }
  console.log("PASS image upgrade");
} finally {
  await browser.close();
}
