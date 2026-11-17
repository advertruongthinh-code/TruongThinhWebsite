// On-page search bar of the advertising pages (advertising-search R6 to R10, text and images). /api/search is mocked with fixed scores.
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node --test tests/site/advertising-search.e2e.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { BASE_URL, SWEEP_WIDTHS, launchBrowser, openPage, viewportAt } from "./harness.mjs";

const PAGE = `${BASE_URL}/vi/advertising-products/`;
const WIDE = { width: 1440, height: 900 };
const PHONE = { width: 384, height: 724, isMobile: true, hasTouch: true };
const VECTOR_IDS = ["kiosk-posm-01", "kiosk-posm-02", "kiosk-posm-03"];

// The Worker answer after `delay` ms: every listed id scores 1 (passes the threshold), nothing else.
const mockApi = (page, { delay = 0, ids = VECTOR_IDS, status = 200 } = {}) => page.route("**/api/search", async (route) => {
  await new Promise((resolve) => setTimeout(resolve, delay));
  const body = status === 200
    ? { status: "ok", inputs: [{ kind: "text", scores: ids.map((id) => [id, 1, 1]) }] }
    : { status: "unavailable" };
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }).catch(() => {});
});

const open = async (browser, viewport = WIDE, url = PAGE, api = { status: 503 }) => {
  const { context, page } = await openPage(browser, viewport);
  await mockApi(page, api);
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector(".search-host .search-bar, [data-search-dock] .search-bar", { timeout: 20000 });
  return { context, page };
};
const search = async (page, text) => {
  await page.fill(".search-bar input", text);
  await page.press(".search-bar input", "Enter");
};
const liveText = (page) => page.locator("[data-search-live]").textContent();
const announced = (page, pattern, timeout = 5000) => page.waitForFunction((source) => new RegExp(source, "i").test(document.querySelector("[data-search-live]")?.textContent || ""), pattern.source, { timeout });
const isDocked = (page) => page.evaluate(() => Boolean(document.querySelector("[data-search-dock] .search-bar")));
// End/Home like a visitor; repeated because the smooth scroller may still be starting after the bar mounts.
const pressUntil = async (page, key, docked) => {
  for (let i = 0; i < 10 && (await isDocked(page)) !== docked; i++) {
    await page.keyboard.press(key);
    await page.waitForTimeout(800);
  }
  assert.equal(await isDocked(page), docked, `${key}: docked ${docked}`);
};
const clickUntil = async (page, selector, arrived) => {
  for (let i = 0; i < 5; i++) {
    await page.click(selector);
    if (await page.waitForFunction(arrived, null, { timeout: 3000 }).then(() => true, () => false)) return;
  }
  assert.fail(`${selector} did not navigate`);
};
const scrollToSlot = (page) => pressUntil(page, "End", true);
const scrollToTop = (page) => pressUntil(page, "Home", false);

// Owner report 2026-11-17: the same query gave different lists because the Worker answered either side of the old 0.8 s wait.
test("R6: a Worker answering within 3 s always gives the vector results, with no keyword list first", async () => {
  const browser = await launchBrowser();
  try {
    for (const delay of [300, 2000]) {
      const { context, page } = await open(browser, WIDE, PAGE, { delay });
      const start = Date.now();
      await search(page, "hộp đèn");
      await announced(page, /kết quả/, 4000);
      const shownAt = Date.now() - start;
      assert(shownAt >= delay - 100 && shownAt < delay + 900, `results at ${shownAt} ms for a ${delay} ms Worker`);
      await page.waitForTimeout(1000);
      assert.equal(await page.locator("[data-masonry-offer]").count(), 0, `no offer button for a ${delay} ms Worker`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
});

test("R6: a Worker slower than 3 s shows keyword results at 3 s, then offers the vector results", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, PAGE, { delay: 4500 });
    const start = Date.now();
    await search(page, "hộp đèn");
    await announced(page, /kết quả/, 5000);
    const shownAt = Date.now() - start;
    assert(shownAt >= 2800 && shownAt < 4000, `keyword results at ${shownAt} ms`);
    await page.waitForSelector("[data-masonry-offer]", { timeout: 4000 });
    await context.close();
  } finally {
    await browser.close();
  }
});

test("R6, R9: no keyword match keeps the grid pending until the Worker answers empty, then shows nothing", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, PAGE, { delay: 2000, ids: [] });
    await search(page, "xyzzy qwerty");
    await page.waitForTimeout(1500);
    assert(await page.locator("[data-masonry-pending]").count(), "still pending at 1.5 s");
    await page.waitForFunction(() => !document.querySelector("[data-masonry-pending]"), null, { timeout: 4000 });
    assert.match(await liveText(page), /chưa thấy/i);
    assert.equal(await page.locator(".search-bar__status, [data-search-status]").count(), 0, "no status panel");
    await context.close();
  } finally {
    await browser.close();
  }
});

test("R9: results show on the grid only, with nothing above the bar", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, PAGE, { status: 503 });
    await search(page, "giá hộp đèn tay vẫy bao nhiêu");
    await announced(page, /kết quả/);
    assert.equal(await page.locator(".search-host > :not(.search-bar):not([data-search-file])").count(), 0, "host holds only the bar");
    assert.equal(await page.locator(".search-bar__status, [data-search-status]").count(), 0);
    await context.close();
  } finally {
    await browser.close();
  }
});

for (const viewport of [WIDE, PHONE]) {
  test(`R7 at ${viewport.width}px: the bar docks under the CTA heading, stays there to the footer and floats again above`, async () => {
    const browser = await launchBrowser();
    try {
      const { context, page } = await open(browser, viewport);
      assert.equal(await isDocked(page), false, "floats on the first screen");
      await scrollToSlot(page);
      const docked = await page.evaluate(() => {
        const talk = document.querySelector("[data-search-dock] .search-bar__talk");
        const slot = document.querySelector("[data-search-dock]").getBoundingClientRect();
        const bar = document.querySelector("[data-search-dock] .search-bar__shell").getBoundingClientRect();
        const legacy = document.querySelector(".detail-cta .legacy-link");
        return { talk: getComputedStyle(talk).visibility, below: Math.round(bar.top - slot.top) === 2 && Math.round(bar.bottom) <= Math.round(slot.bottom), legacy: legacy && getComputedStyle(legacy).display };
      });
      assert.deepEqual(docked, { talk: "visible", below: true, legacy: "none" });
      await page.fill(".search-bar input", "chữ nổi");
      assert.equal(await page.inputValue(".search-bar input"), "chữ nổi", "typeable when docked");
      await page.locator(".search-bar input").blur();
      await scrollToTop(page);
      if (viewport.hasTouch) {
        // Past the first screen the back-to-top button shows; the floating bar must not cover it.
        await page.evaluate(() => scrollTo({ top: innerHeight * 3, behavior: "instant" }));
        await page.waitForFunction(() => document.querySelector(".back-to-top.show"), null, { timeout: 4000 });
        await page.waitForTimeout(1100);
        const hit = await page.evaluate(() => {
          const rect = document.querySelector(".back-to-top").getBoundingClientRect();
          return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest(".back-to-top") !== null;
        });
        assert(hit, "back-to-top is above the bar");
      }
      await context.close();
    } finally {
      await browser.close();
    }
  });
}

for (const viewport of [WIDE, PHONE]) {
  test(`R7 at ${viewport.width}px: a search from the docked bar works, and the docked bar has no white ground`, async () => {
    const browser = await launchBrowser();
    try {
      const { context, page } = await open(browser, viewport, PAGE, { ids: [] });
      await scrollToSlot(page);
      await page.waitForTimeout(800);
      const ground = await page.evaluate(() => getComputedStyle(document.querySelector("[data-search-dock] .search-bar__shell")).backgroundColor);
      assert.equal(ground, "rgba(0, 0, 0, 0)", "transparent when docked");
      await search(page, "xqzw vbnk");
      await announced(page, /chưa thấy/);
      assert(await isDocked(page), "still docked");
      await context.close();
    } finally {
      await browser.close();
    }
  });
}

// A JPEG drawn in the page, with an APP1 (EXIF) block carrying a fake GPS marker spliced in after SOI.
const makeJpeg = async (page, hue) => {
  const base64 = await page.evaluate((h) => {
    const canvas = Object.assign(document.createElement("canvas"), { width: 1200, height: 900 });
    const context = canvas.getContext("2d");
    context.fillStyle = `hsl(${h} 60% 50%)`;
    context.fillRect(0, 0, 1200, 900);
    context.fillStyle = "#fff";
    context.fillRect(100 + h, 100, 300, 200);
    return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
  }, hue);
  const jpeg = Buffer.from(base64, "base64");
  const payload = Buffer.from("Exif\0\0GPSLatitude 10.2", "binary");
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, 0, payload.length + 2]), payload]);
  return { name: `photo-${hue}.jpg`, mimeType: "image/jpeg", buffer: Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]) };
};
const trayCount = (page) => page.locator(".search-bar [data-search-thumbs] img").count();

test("R8, R4: images by the button, up to 5, without EXIF in the request; SVG and video are turned away", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, PAGE, { ids: VECTOR_IDS });
    const bodies = [];
    page.on("request", (request) => request.url().endsWith("/api/search") && bodies.push(request.postDataJSON()));
    await page.setInputFiles("[data-search-file]", await Promise.all([10, 60, 110, 160].map((h) => makeJpeg(page, h))));
    await page.waitForFunction(() => document.querySelectorAll(".search-bar [data-search-thumbs] img").length === 4);
    await page.setInputFiles("[data-search-file]", await Promise.all([210, 260, 310].map((h) => makeJpeg(page, h))));
    await page.waitForFunction(() => /tối đa 5 ảnh/i.test(document.querySelector(".search-bar [data-search-count]").textContent));
    assert.equal(await trayCount(page), 5);
    assert.match(await page.locator(".search-bar [data-search-count]").textContent(), /5\/5 ảnh/i);

    await page.click(".search-bar .search-bar__go");
    await announced(page, /kết quả/);
    const sent = bodies.at(-1);
    assert.equal(sent.images.length, 5);
    assert.equal(sent.text, undefined, "no text sent when the input is empty");
    for (const image of sent.images) {
      const bytes = Buffer.from(image, "base64");
      assert.equal(bytes.subarray(0, 3).toString("hex"), "ffd8ff", "JPEG");
      assert.equal(bytes.includes(Buffer.from("GPSLatitude")), false, "no GPS");
      assert.equal(bytes.includes(Buffer.from([0xff, 0xe1])), false, "no APP1 block");
      assert(bytes.length <= 300 * 1024, "at most 300 KB");
    }

    // Removing an image after results searches again after reSearchMs.
    const before = bodies.length;
    await page.locator(".search-bar .search-bar__unthumb").first().click();
    await page.waitForTimeout(900);
    assert.equal(bodies.length, before + 1, "searched again");
    assert.equal(bodies.at(-1).images.length, 4);

    await page.locator(".search-bar input").press("Escape");
    assert.equal(await trayCount(page), 0, "Esc empties the tray");
    await page.setInputFiles("[data-search-file]", { name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>") });
    await page.waitForFunction(() => /jpg hoặc png/i.test(document.querySelector(".search-bar [data-search-count]").textContent));
    await page.setInputFiles("[data-search-file]", { name: "clip.mp4", mimeType: "video/mp4", buffer: Buffer.from("0000") });
    await page.waitForFunction(() => /chỉ tìm bằng ảnh/i.test(document.querySelector(".search-bar [data-search-count]").textContent));
    assert.equal(await trayCount(page), 0);
    await context.close();
  } finally {
    await browser.close();
  }
});

test("R8, R10: images survive a reload, and the same image added again is still dropped as a duplicate", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, PAGE, { ids: VECTOR_IDS });
    const files = await Promise.all([40, 90].map((h) => makeJpeg(page, h)));
    await page.setInputFiles("[data-search-file]", files);
    await page.waitForFunction(() => document.querySelectorAll(".search-bar [data-search-thumbs] img").length === 2);
    await page.click(".search-bar .search-bar__go");
    await announced(page, /kết quả/);
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => document.querySelectorAll(".search-bar [data-search-thumbs] img").length === 2, null, { timeout: 20000 });
    await page.setInputFiles("[data-search-file]", files[0]);
    await page.waitForTimeout(800);
    assert.equal(await trayCount(page), 2, "duplicate dropped after reload");
    await context.close();
  } finally {
    await browser.close();
  }
});

test("R8: pasting an image adds it; a slow image search stops waiting at 3 s and offers a retry", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, PHONE, PAGE, { delay: 5000, ids: VECTOR_IDS });
    const { buffer } = await makeJpeg(page, 30);
    await page.evaluate((b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const data = new DataTransfer();
      data.items.add(new File([bytes], "pasted.jpg", { type: "image/jpeg" }));
      document.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true }));
    }, buffer.toString("base64"));
    await page.waitForFunction(() => document.querySelectorAll(".search-bar [data-search-thumbs] img").length === 1);
    await page.fill(".search-bar input", "biển hiệu");
    const start = Date.now();
    await page.press(".search-bar input", "Enter");
    await page.waitForFunction(() => /đang chậm/i.test(document.querySelector(".search-bar [data-search-count]").textContent), null, { timeout: 5000 });
    const waited = Date.now() - start;
    assert(waited >= 2800 && waited < 4500, `slow note at ${waited} ms`);
    assert.equal(await page.locator("[data-masonry-pending]").count(), 0, "grid no longer pending");
    assert(await page.locator(".search-bar [data-search-count] button", { hasText: /thử lại/i }).isVisible());
    await announced(page, /kết quả/, 6000); // the late answer still applies
    await context.close();
  } finally {
    await browser.close();
  }
});

test("R10: a #tim= link searches; a language switch keeps the query; Esc and a chip clear it", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, `${PAGE}#tim=${encodeURIComponent("hộp đèn")}`);
    await announced(page, /kết quả/);
    assert.equal(await page.inputValue(".search-bar input"), "hộp đèn");

    await page.click("[data-menu-open]");
    await page.click('[data-language-option="en"]');
    await page.waitForURL(/\/en\/advertising-products\//);
    await page.waitForSelector(".search-bar", { timeout: 20000 });
    await announced(page, /results/, 6000);
    assert.equal(await page.inputValue(".search-bar input"), "hộp đèn");

    await page.press(".search-bar input", "Escape");
    assert.equal(await page.inputValue(".search-bar input"), "");
    assert.equal(await liveText(page), "");

    await search(page, "hộp đèn");
    await announced(page, /results/);
    // The x leaves the search too.
    const cleared = page.evaluate(() => new Promise((resolve) => addEventListener("masonry:search-left", (e) => resolve(e.detail?.reason), { once: true })));
    await page.click(".search-bar [data-search-clear-text]");
    assert.equal(await cleared, "clear");
    assert.equal(await page.inputValue(".search-bar input"), "");
    await search(page, "hộp đèn");
    await announced(page, /results/);
    const left = page.evaluate(() => new Promise((resolve) => addEventListener("masonry:search-left", (e) => resolve(e.detail?.reason), { once: true })));
    await page.locator("[data-masonry-filter]").nth(1).click();
    assert.equal(await left, "filter");
    await page.waitForFunction(() => document.querySelector(".search-bar input").value === "");
    await context.close();
  } finally {
    await browser.close();
  }
});

test("R10: soft navigation from the menu does not restore, and leaving the page removes the bar", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, PAGE, { status: 503 });
    await search(page, "hộp đèn");
    await announced(page, /kết quả/);
    // The grid is still sliding to the results; a click during a page transition is ignored, so click until the route changes.
    await clickUntil(page, "#header-logo", () => !location.pathname.includes("advertising-products"));
    await page.waitForFunction(() => !document.querySelector(".search-bar"), null, { timeout: 8000 });
    await clickUntil(page, '[data-site-header] .desktop-nav a[href="/vi/advertising-products/"]', () => location.pathname.includes("advertising-products"));
    await page.waitForSelector(".search-bar", { timeout: 20000 });
    await page.waitForTimeout(500);
    assert.equal(await page.locator(".search-bar").count(), 1, "exactly one bar");
    assert.equal(await page.inputValue(".search-bar input"), "", "not restored");
    await context.close();
  } finally {
    await browser.close();
  }
});

test("R7: no horizontal scroll at the six widths, floating and docked", async () => {
  const browser = await launchBrowser();
  try {
    for (const width of SWEEP_WIDTHS) {
      const { context, page } = await open(browser, viewportAt(width));
      for (const step of [null, scrollToSlot]) {
        if (step) await step(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert(overflow <= 0, `${width}px ${step ? "docked" : "floating"}: ${overflow}px wider`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
});
