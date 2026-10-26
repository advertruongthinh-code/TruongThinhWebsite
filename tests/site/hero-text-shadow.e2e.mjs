// hero-typography R6: chữ trắng trên ảnh có bóng hai lớp D, nới mask cho quầng 12px; hero (owner 2026-10-26) và chữ ink trên giấy
// (Sản phẩm quảng cáo) không bóng.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";

const SHADOW_D = "rgba(0, 0, 0, 0.5) 0px 0px 2px, rgba(0, 0, 0, 0.4) 0px 0px 12px";
const withShadow = [
  { route: "", selectors: [".portal-copy strong", ".legacy-copy h2", ".legacy-copy > p"] },
  { route: "residential/", selectors: [".portal-copy strong", ".detail-cta h2", ".detail-cta p"] },
  { route: "commercial/", selectors: [".portal-copy strong", ".detail-cta h2", ".detail-cta p"] },
  { route: "about/", selectors: [".detail-cta h2", ".detail-cta p"] },
];
const withoutShadow = [
  { route: "", selectors: [".hero h1", ".hero [data-scroll-cue]"] },
  { route: "residential/", selectors: [".hero h1"] },
  { route: "commercial/", selectors: [".hero h1"] },
  { route: "about/", selectors: [".hero h1"] },
  { route: "advertising-products/", selectors: [".hero h1", ".detail-cta[data-advertising-grid-cta] h2"] },
];

const failures = [];
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const read = (selector) => page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const style = getComputedStyle(el);
    // Mask dòng trong khối chữ: clip-path phải chừa đủ quầng 12px mỗi cạnh.
    const mask = el.querySelector(".hero-line-mask, .line-mask, .detail-hero-line-mask, .motion-line-mask");
    const clip = mask ? getComputedStyle(mask).clipPath : null;
    return { shadow: style.textShadow, clip };
  }, selector);

  for (const { route, selectors } of withShadow) {
    await page.goto(`${origin}/vi/${route}`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    for (const selector of selectors) {
      const got = await read(selector);
      if (!got) failures.push(`/${route} ${selector}: not found`);
      else if (got.shadow !== SHADOW_D) failures.push(`/${route} ${selector}: text-shadow "${got.shadow}"`);
      else if (got.clip && got.clip !== "none") {
        const insets = [...got.clip.matchAll(/-?[\d.]+px/g)].map((m) => Number.parseFloat(m[0]));
        // inset âm: mỗi cạnh nới ra ngoài hộp ít nhất bằng bán kính quầng.
        if (insets.length && insets.some((v) => v > -12)) failures.push(`/${route} ${selector}: mask clip "${got.clip}" cắt quầng 12px`);
      }
    }
  }
  for (const { route, selectors } of withoutShadow) {
    await page.goto(`${origin}/vi/${route}`, { waitUntil: "load" });
    for (const selector of selectors) {
      const got = await read(selector);
      if (!got) failures.push(`/${route} ${selector}: not found`);
      else if (got.shadow !== "none") failures.push(`/${route} ${selector}: expected no text-shadow, got "${got.shadow}"`);
    }
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], `hero text shadow failures:\n${failures.join("\n")}`);
console.log("hero-text-shadow: PASS");
