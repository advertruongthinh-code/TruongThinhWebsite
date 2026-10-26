// hero-typography R7: dòng chữ chưa reveal phải nằm hẳn dưới mép clip-path của mask, kể cả chữ nhỏ (kicker portal) có vùng bóng 12px.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";

const routes = ["", "residential/", "commercial/", "about/", "advertising-products/"];
const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];

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
        const leaks = await page.evaluate(() => {
          const selector =
            ".hero-line-mask, .line-mask, .heritage-text, .portal-title-mask, .portal-title__quiet, .portal-title__strong, .detail-line, .motion-line-mask";
          return [...document.querySelectorAll(selector)].flatMap((mask) => {
            const line = mask.firstElementChild;
            if (!line || mask.getClientRects().length === 0) return [];
            const lineY = new DOMMatrixReadOnly(getComputedStyle(line).transform).m42;
            // Chỉ xét dòng đang ẩn dưới mask (y dương); dòng đã reveal hoặc chưa có transform bỏ qua.
            if (lineY < 1 || !line.textContent.trim()) return [];
            const clip = getComputedStyle(mask).clipPath.match(/-?[\d.]+px/g)?.map(Number.parseFloat);
            if (!clip) return [];
            const [top, right, bottom] = clip;
            const clipBottom = mask.getBoundingClientRect().bottom - (clip.length >= 3 ? bottom : top);
            const range = document.createRange();
            range.selectNodeContents(line);
            const textTop = range.getBoundingClientRect().top;
            return textTop < clipBottom ? [`${mask.className} "${line.textContent.trim().slice(0, 24)}" lộ ${(clipBottom - textTop).toFixed(1)}px`] : [];
          });
        });
        leaks.forEach((leak) => failures.push(`/${locale}/${route} ${viewport.width}px: ${leak}`));
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], `text mask hidden-state failures:\n${failures.join("\n")}`);
console.log("text-mask-hidden: PASS");
