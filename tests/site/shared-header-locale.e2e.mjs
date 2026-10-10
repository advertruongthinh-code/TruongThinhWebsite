import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

// Hồi quy shell: nhãn cuộn và Back sau khi đổi ngôn ngữ tại chỗ, ctrl+click không ghim header.
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

const ready = page => page.waitForFunction(() => document.documentElement.classList.contains("motion-ready")
  || document.documentElement.classList.contains("motion-fallback"), null, { timeout: 12_000 });

try {
  for (const route of ["residential", "commercial"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${baseUrl}/vi/${route}/`);
    await ready(page);
    await page.locator("[data-menu-open]").click();
    await page.locator('#site-menu [data-language-option="en"]').click();
    await page.waitForFunction(() => document.documentElement.lang === "en");
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const label = await page.locator("[data-scroll-cue-label]").evaluate(node => ({
      text: node.textContent.trim(), aria: node.getAttribute("aria-label"),
    }));
    assert.equal(label.text, "SCROLL DOWN", `${route}: scroll cue text after in-place switch ${JSON.stringify(label)}`);
    assert.notEqual(label.aria, "CUỘN XUỐNG", `${route}: scroll cue aria-label after in-place switch`);
    await page.close();
  }

  // Back đầu tiên sau đổi ngôn ngữ tại chỗ trên Advertising: ngôn ngữ trang phải khớp locale của URL.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${baseUrl}/vi/advertising-products/`);
    await ready(page);
    await page.waitForFunction(() => document.querySelector("[data-project-grid] .advertising-tile a[href*='photo=']"));
    const photo = await page.locator("[data-project-grid] .advertising-tile a[href*='photo=']").first().getAttribute("href");
    await page.evaluate(href => window.TruongThinhAdvertising.navigateQuery(href), photo);
    await page.waitForFunction(() => new URL(location.href).searchParams.has("photo"));
    await page.locator("[data-menu-open]").click();
    await page.locator('#site-menu [data-language-option="en"]').click();
    await page.waitForFunction(() => document.documentElement.lang === "en" && !document.body.classList.contains("is-transitioning"));
    await page.evaluate(() => history.back());
    await page.waitForFunction(() => location.pathname.startsWith("/vi/") && !new URL(location.href).searchParams.has("photo"));
    await page.waitForTimeout(1500);
    const back = await page.evaluate(() => ({ path: location.pathname, language: document.documentElement.lang }));
    assert.equal(back.language, "vi", `Back after an in-place locale switch: ${JSON.stringify(back)}`);
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${baseUrl}/vi/`);
  await ready(page);
  const link = page.locator('.site-header a[href*="/commercial/"]').first();
  const modifier = process.platform === "darwin" ? "Meta" : "Control";
  const [popup] = await Promise.all([page.context().waitForEvent("page").catch(() => null), link.click({ modifiers: [modifier] })]);
  await popup?.close();
  const pinned = await page.evaluate(() => document.querySelector("[data-site-header]").classList.contains("is-route-pinned"));
  assert.equal(pinned, false, "ctrl+click on an internal link must not pin the header");
  await page.close();
  console.log("shared-header-locale: PASS");
} finally {
  await browser.close();
}
