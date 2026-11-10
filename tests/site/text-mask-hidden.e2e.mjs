// hero-typography R6: a text line not yet revealed must sit fully below the mask's clip-path edge, including small text (kicker portal);
// while hidden and while rising to the bottom edge the shadow region is not widened, and only reopens after the reveal finishes.
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
        // Wait for intro, SplitText and mask measurement to finish; no scrolling, so blocks below the screen stay hidden.
        await page.waitForTimeout(3000);
        const leaks = await page.evaluate((selector) => {
          return [...document.querySelectorAll(selector)].flatMap((mask) => {
            const line = mask.firstElementChild;
            if (!line || mask.getClientRects().length === 0) return [];
            const lineY = new DOMMatrixReadOnly(getComputedStyle(line).transform).m42;
            // Only consider lines hidden under the mask (positive y); lines already revealed or without a transform are skipped.
            if (lineY < 1 || !line.textContent.trim()) return [];
            const label = `${mask.className} "${line.textContent.trim().slice(0, 24)}"`;
            const maskStyle = getComputedStyle(mask);
            if (maskStyle.getPropertyValue("--mask-shadow-bottom").trim() !== "0px") {
              return [`${label} is hidden but the mask bottom edge still extends the shadow area`];
            }
            if (getComputedStyle(line).textShadow !== "none") return [`${label} is hidden but still has a text shadow`];
            const clip = getComputedStyle(mask).clipPath.match(/-?[\d.]+px/g)?.map(Number.parseFloat);
            if (!clip) return [];
            const [top, right, bottom] = clip;
            const clipBottom = mask.getBoundingClientRect().bottom - (clip.length >= 3 ? bottom : top);
            const range = document.createRange();
            range.selectNodeContents(line);
            const textTop = range.getBoundingClientRect().top;
            return textTop < clipBottom ? [`${label} leaks ${(clipBottom - textTop).toFixed(1)}px`] : [];
          });
        }, maskSelector);
        leaks.forEach((leak) => failures.push(`/${locale}/${route} ${viewport.width}px: ${leak}`));
        // Scroll the whole page so every line reveals; lines back in place must reopen the shadow region (no more is-text-masked).
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
            // Skip while the reveal tween is still running (power4.out gets close to the end early).
            .filter((mask) => !window.gsap?.isTweening(mask.firstElementChild))
            .filter((mask) => new DOMMatrixReadOnly(getComputedStyle(mask.firstElementChild).transform).m42 < 1)
            .map((mask) => `${mask.className} "${mask.textContent.trim().slice(0, 24)}" still clips the shadow area after reveal`),
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
