// hero-typography R6: dòng chữ chưa reveal phải nằm hẳn dưới mép clip-path của mask, kể cả chữ nhỏ (kicker portal);
// lúc ẩn và lúc trồi lên mép dưới không nới vùng bóng, reveal xong mới mở lại.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";

const routes = ["", "residential/", "commercial/", "about/", "advertising-products/"];
const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];

const maskSelector =
  ".hero-line-mask, .line-mask, .heritage-text, .portal-title-mask, .portal-title__quiet, .portal-title__strong, .detail-line, .motion-line-mask";
const failures = [];
const browser = await chromium.launch();
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    for (const locale of ["vi", "en"]) {
      for (const route of routes) {
        await page.goto(`${origin}/${locale}/${route}`, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        // Chờ intro, SplitText và đo mask xong; không cuộn nên các khối dưới màn hình còn ở trạng thái ẩn.
        await page.waitForTimeout(3000);
        const leaks = await page.evaluate((selector) => {
          return [...document.querySelectorAll(selector)].flatMap((mask) => {
            const line = mask.firstElementChild;
            if (!line || mask.getClientRects().length === 0) return [];
            const lineY = new DOMMatrixReadOnly(getComputedStyle(line).transform).m42;
            // Chỉ xét dòng đang ẩn dưới mask (y dương); dòng đã reveal hoặc chưa có transform bỏ qua.
            if (lineY < 1 || !line.textContent.trim()) return [];
            const label = `${mask.className} "${line.textContent.trim().slice(0, 24)}"`;
            if (getComputedStyle(mask).getPropertyValue("--mask-shadow-bottom").trim() !== "0px") {
              return [`${label} đang ẩn nhưng mép dưới mask còn nới vùng bóng`];
            }
            const clip = getComputedStyle(mask).clipPath.match(/-?[\d.]+px/g)?.map(Number.parseFloat);
            if (!clip) return [];
            const [top, right, bottom] = clip;
            const clipBottom = mask.getBoundingClientRect().bottom - (clip.length >= 3 ? bottom : top);
            const range = document.createRange();
            range.selectNodeContents(line);
            const textTop = range.getBoundingClientRect().top;
            return textTop < clipBottom ? [`${label} lộ ${(clipBottom - textTop).toFixed(1)}px`] : [];
          });
        }, maskSelector);
        leaks.forEach((leak) => failures.push(`/${locale}/${route} ${viewport.width}px: ${leak}`));
        // Cuộn hết trang cho mọi dòng reveal; dòng đã về chỗ phải mở lại vùng bóng (không còn is-text-masked).
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.6) {
            window.scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 150));
          }
        });
        await page.waitForTimeout(3000);
        const closed = await page.evaluate((selector) =>
          [...document.querySelectorAll(selector)]
            .filter((mask) => mask.classList.contains("is-text-masked") && mask.firstElementChild)
            // Tween reveal còn chạy (power4.out gần tới đích từ sớm) thì chưa tính.
            .filter((mask) => !window.gsap?.isTweening(mask.firstElementChild))
            .filter((mask) => new DOMMatrixReadOnly(getComputedStyle(mask.firstElementChild).transform).m42 < 1)
            .map((mask) => `${mask.className} "${mask.textContent.trim().slice(0, 24)}" reveal xong vẫn cắt vùng bóng`),
        maskSelector);
        closed.forEach((item) => failures.push(`/${locale}/${route} ${viewport.width}px: ${item}`));
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], `text mask hidden-state failures:\n${failures.join("\n")}`);
console.log("text-mask-hidden: PASS");
