// Ảnh trong màn hình lên bản gốc sau khi bản vừa khung đã hiện (progressive-loading R10).
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/image-upgrade.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const VARIANT = /-(?:240|480|960|1600|2048)\.(?:jxl|webp)$/;
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const open = async (options = { viewport: { width: 1440, height: 900 } }) => {
  const page = await browser.newPage(options);
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

  // Advertising: card masonry là khung nhỏ nên giữ bản vừa khung; ảnh lớn của detail (khung lớn) lên bản gốc.
  {
    const { page, originals } = await open();
    await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelectorAll("[data-project-grid] [data-advertising-card] img").length > 8);
    await page.waitForTimeout(5000);
    const cards = await page.evaluate(() => [...document.querySelectorAll("[data-project-grid] [data-advertising-card] img")]
      .filter((image) => image.currentSrc).map((image) => new URL(image.currentSrc).pathname));
    assert.ok(cards.length && cards.every((pathname) => VARIANT.test(pathname)), `masonry cards stay on their variant ${JSON.stringify(cards)}`);
    assert.deepEqual(originals.filter(({ pathname }) => cards.some((card) => card.replace(VARIANT, "") === pathname.replace(/\.\w+$/, ""))), [],
      "no masonry card requests its original");
    // Mở detail bằng click (route mềm) để primary dùng lại cùng img khi mở media sau.
    await page.locator("[data-advertising-card] > a").first().click();
    const primary = "[data-advertising-photo-image]";
    await page.waitForFunction((selector) => {
      const image = document.querySelector(selector);
      return image?.currentSrc && !/-(?:240|480|960|1600|2048)\.\w+$/.test(image.currentSrc);
    }, primary, { timeout: 20_000 }).catch(async () => assert.fail(`detail primary stays on its variant ${await pathOf(page, primary)}`));
    // Primary dùng lại một img: mở media khác thì ảnh hiện phải là media đó, không phải bản gốc của media trước.
    await page.goBack();
    await page.locator("[data-advertising-card] > a").nth(1).click();
    await page.waitForTimeout(2000);
    const shown = await page.evaluate((selector) => {
      const image = document.querySelector(selector);
      const base = (url) => new URL(url, location.href).pathname.replace(/(?:-(?:240|480|960|1600|2048))?\.\w+$/, "");
      return { current: base(image.currentSrc), src: base(image.src) };
    }, primary);
    assert.equal(shown.current, shown.src, "the primary shows the media it was given");
    await page.close();
  }
  // Phone trang chủ: 9 slide hoãn tải variant lớn nhất 2048, không tải bản gốc (media-delivery R2, owner 2026-10-31);
  // slide gốc nhỏ hơn 2048 không có variant 2048 nên bản gốc là ứng viên lớn nhất.
  {
    const { page } = await open({ viewport: { width: 384, height: 724 }, deviceScaleFactor: 1.875, isMobile: true, hasTouch: true });
    await page.goto(`${base}/vi/`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelectorAll(".hero-slide:not(.is-active) img[srcset]").length >= 9, null, { timeout: 10_000 });
    await page.waitForTimeout(1500);
    const hidden = await page.evaluate(() => [...document.querySelectorAll(".hero-slide:not(.is-active) img")].map((image) => ({
      src: new URL(image.currentSrc, location.href).pathname,
      has2048: (image.previousElementSibling?.srcset ?? image.srcset).includes("-2048."),
    })));
    assert.deepEqual(hidden.filter(({ src, has2048 }) => has2048 && !VARIANT.test(src)), [], "hidden slides stay on a variant");
    await page.close();
  }
  console.log("PASS image upgrade");
} finally {
  await browser.close();
}
