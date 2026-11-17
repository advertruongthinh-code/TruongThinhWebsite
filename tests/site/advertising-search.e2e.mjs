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
  await page.waitForSelector(".search-bar", { timeout: 20000 });
  // The page is ready once the entry veil lifts: until then it covers the bar in the top slot.
  await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter") && !document.body.classList.contains("is-transitioning"), null, { timeout: 20000 });
  return { context, page };
};
// Before a click: the bar is not sliding or morphing and has not moved between two frames.
const barStill = (page) => page.waitForFunction(() => new Promise((resolve) => {
  const bar = document.querySelector(".search-bar");
  const top = bar.getBoundingClientRect().top;
  requestAnimationFrame(() => requestAnimationFrame(() => resolve(!bar.getAnimations({ subtree: true }).length && bar.getBoundingClientRect().top === top)));
}), null, { timeout: 6000 });
const search = async (page, text) => {
  await page.fill(".search-bar input", text);
  await page.press(".search-bar input", "Enter");
};
const liveText = (page) => page.locator("[data-search-live]").textContent();
const announced = (page, pattern, timeout = 5000) => page.waitForFunction((source) => new RegExp(source, "i").test(document.querySelector("[data-search-live]")?.textContent || ""), pattern.source, { timeout });
// "top" (over the hero rail), "cta" (under the CTA heading) or "float".
const placeOf = (page) => page.evaluate(() => {
  const bar = document.querySelector(".search-bar");
  const place = bar.closest("[data-search-dock-top]") ? "top" : bar.closest("[data-search-dock]") ? "cta" : "float";
  return place === (bar.dataset.dock ?? "float") ? place : `mismatch ${place}/${bar.dataset.dock}`;
});
const isDocked = async (page) => (await placeOf(page)) === "cta";
// End/Home like a visitor; repeated because the smooth scroller may still be starting after the bar mounts.
const pressUntil = async (page, key, place) => {
  for (let i = 0; i < 10 && (await placeOf(page)) !== place; i++) {
    await page.keyboard.press(key);
    await page.waitForTimeout(800);
  }
  assert.equal(await placeOf(page), place, `${key}: ${place}`);
};
const clickUntil = async (page, selector, arrived) => {
  for (let i = 0; i < 5; i++) {
    await page.click(selector);
    if (await page.waitForFunction(arrived, null, { timeout: 3000 }).then(() => true, () => false)) return;
  }
  assert.fail(`${selector} did not navigate`);
};
const scrollToSlot = (page) => pressUntil(page, "End", "cta");
const scrollToTop = (page) => pressUntil(page, "Home", "top");
// Half a screen past the hero, where the bar floats.
const scrollToGrid = async (page) => {
  await page.evaluate(() => window.TruongThinhMotion?.setLogicalScroll(innerHeight * 1.5) || scrollTo({ top: innerHeight * 1.5, behavior: "instant" }));
  await page.waitForFunction(() => !document.querySelector(".search-bar").dataset.dock, null, { timeout: 5000 });
};

test("R6: slow Worker shows keyword results at 0.8 s, then offers the vector results", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, PAGE, { delay: 2000 });
    const start = Date.now();
    await search(page, "hộp đèn");
    await announced(page, /kết quả/, 2000);
    const shownAt = Date.now() - start;
    assert(shownAt >= 700 && shownAt < 1800, `keyword results at ${shownAt} ms`);
    await page.waitForSelector("[data-masonry-offer]", { timeout: 4000 });
    await context.close();
  } finally {
    await browser.close();
  }
});

test("R6, R9: no keyword match keeps the grid pending until the Worker answers empty, then says so in a short line", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, PAGE, { delay: 2000, ids: [] });
    await search(page, "xyzzy qwerty");
    await page.waitForTimeout(1500);
    assert(await page.locator("[data-masonry-pending]").count(), "still pending at 1.5 s");
    await page.waitForFunction(() => !document.querySelector("[data-masonry-pending]"), null, { timeout: 4000 });
    assert.match(await liveText(page), /chưa thấy/i);
    assert.match(await page.locator(".search-bar [data-search-count]").textContent(), /chưa thấy mẫu phù hợp/i, "short line in the bar");
    assert(await page.locator(".search-bar [data-search-tray]").isVisible());
    await page.waitForFunction(() => document.querySelector(".search-bar [data-search-tray]").hidden, null, { timeout: 6000 });
    assert.equal(await page.locator(".search-bar__status, [data-search-status]").count(), 0, "no status panel");
    await context.close();
  } finally {
    await browser.close();
  }
});

test("R9: results show on the grid only, with nothing above the bar", async () => {
  const browser = await launchBrowser();
  try {
    // keywordMin 0.6: the keyword fallback needs a whole catalog phrase, so the query is a product name.
    const { context, page } = await open(browser, WIDE, PAGE, { status: 503 });
    await search(page, "hộp đèn");
    await announced(page, /kết quả/);
    assert.equal(await page.locator(".search-host > :not(.search-bar):not([data-search-file])").count(), 0, "host holds only the bar");
    assert.equal(await page.locator(".search-bar__status, [data-search-status]").count(), 0);
    await context.close();
  } finally {
    await browser.close();
  }
});

for (const viewport of [WIDE, PHONE]) {
  test(`R7 at ${viewport.width}px: the bar sits over the rail on the first screen, floats over the grid, docks under the CTA heading and goes back`, async () => {
    const browser = await launchBrowser();
    try {
      const { context, page } = await open(browser, viewport);
      assert.equal(await placeOf(page), "top", "over the rail on the first screen");
      const hero = await page.evaluate(() => {
        const bar = document.querySelector(".search-bar__shell").getBoundingClientRect();
        const rail = document.querySelector(".project-filters").getBoundingClientRect();
        return { aboveRail: bar.bottom <= rail.top + 1, cue: document.querySelectorAll("[data-scroll-cue]").length, talk: getComputedStyle(document.querySelector(".search-bar__talk")).visibility };
      });
      assert.deepEqual(hero, { aboveRail: true, cue: 0, talk: "hidden" });
      await scrollToGrid(page);
      await scrollToSlot(page);
      // The smooth scroller eases for about 2 s: wait until the slide and morph end and the shell rests in the slot.
      await page.waitForFunction(() => {
        const bar = document.querySelector("[data-search-dock] .search-bar");
        if (!bar || bar.getAnimations({ subtree: true }).length) return false;
        const slot = document.querySelector("[data-search-dock]").getBoundingClientRect();
        return Math.round(bar.querySelector(".search-bar__shell").getBoundingClientRect().top) === Math.round(slot.top);
      }, null, { timeout: 6000 });
      const docked = await page.evaluate(() => {
        const talk = document.querySelector("[data-search-dock] .search-bar__talk");
        const slot = document.querySelector("[data-search-dock]").getBoundingClientRect();
        const bar = document.querySelector("[data-search-dock] .search-bar__shell").getBoundingClientRect();
        const heading = document.querySelector("#cta-title").getBoundingClientRect();
        const legacy = document.querySelector(".detail-cta .legacy-link");
        const input = document.querySelector("[data-search-dock] input");
        return {
          talk: getComputedStyle(talk).visibility,
          inSlot: Math.round(bar.top) === Math.round(slot.top) && Math.round(bar.bottom) <= Math.round(slot.bottom),
          belowHeading: slot.top >= heading.bottom - 1,
          font: getComputedStyle(input).fontSize,
          legacy: legacy && getComputedStyle(legacy).display,
        };
      });
      assert.deepEqual(docked, { talk: "visible", inSlot: true, belowHeading: true, font: "16px", legacy: "none" });
      await page.fill(".search-bar input", "chữ nổi");
      assert.equal(await page.inputValue(".search-bar input"), "chữ nổi", "typeable when docked");
      await page.locator(".search-bar input").blur();
      await scrollToTop(page);
      await scrollToGrid(page);
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
      // The morph runs 0.7 s; a busy runner may need longer.
      const ground = () => page.evaluate(() => getComputedStyle(document.querySelector("[data-search-dock] .search-bar__shell")).backgroundColor);
      await page.waitForFunction(() => getComputedStyle(document.querySelector("[data-search-dock] .search-bar__shell")).backgroundColor === "rgba(0, 0, 0, 0)", null, { timeout: 5000 }).catch(() => {});
      assert.equal(await ground(), "rgba(0, 0, 0, 0)", "transparent when docked");
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

    await barStill(page);
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
    await barStill(page);
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

test("R10: a #q= link searches and the bar writes #q=; an older #tim= link still opens", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, `${PAGE}#tim=${encodeURIComponent("chữ nổi")}`, {});
    await announced(page, /kết quả/);
    assert.equal(await page.inputValue(".search-bar input"), "chữ nổi");
    await page.waitForFunction(() => location.hash === `#q=${encodeURIComponent("chữ nổi")}`, null, { timeout: 4000 });
    await page.press(".search-bar input", "Escape");
    await page.waitForFunction(() => location.hash === "");
    await search(page, "hộp đèn");
    await announced(page, /kết quả/);
    assert.equal(await page.evaluate(() => location.hash), `#q=${encodeURIComponent("hộp đèn")}`);
    await context.close();
  } finally {
    await browser.close();
  }
});

test("R10: a language switch keeps the query; Esc and the x clear it; the rail filters inside the results", async () => {
  const browser = await launchBrowser();
  try {
    // A working Worker: with keywordMin 0.6 a Vietnamese query on the EN page has no keyword fallback.
    const { context, page } = await open(browser, WIDE, `${PAGE}#q=${encodeURIComponent("hộp đèn")}`, {});
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
    // Only entries with a result show; a click narrows the results and keeps the search.
    await page.waitForTimeout(600);
    const rail = await page.evaluate(() => [...document.querySelectorAll("[data-masonry-filter]")].map((node) => ({
      filter: node.dataset.masonryFilter, empty: node.hasAttribute("data-search-empty"), shown: getComputedStyle(node).display !== "none",
    })));
    assert(rail.every((entry) => entry.empty !== entry.shown), "hidden exactly when empty");
    assert(rail.some((entry) => entry.empty), "some cluster has no result");
    const target = rail.find((entry) => entry.shown && entry.filter !== "all").filter;
    const total = await page.locator("[data-masonry-card]").count();
    let left = false;
    await page.evaluate(() => addEventListener("masonry:search-left", () => { window.__left = true; }, { once: true }));
    await page.click(`[data-masonry-filter="${target}"]`);
    await page.waitForTimeout(900);
    left = await page.evaluate(() => Boolean(window.__left));
    assert.equal(left, false, "still searching");
    assert.equal(await page.inputValue(".search-bar input"), "hộp đèn");
    assert.equal(await page.getAttribute(`[data-masonry-filter="${target}"]`, "aria-current"), "true");
    const narrowed = await page.evaluate((slug) => {
      const ids = [...document.querySelectorAll("[data-masonry-card]")].map((node) => node.dataset.masonryCard);
      return { count: ids.length };
    }, target);
    assert(narrowed.count <= total, "narrowed");
    await page.click('[data-masonry-filter="all"]');
    await page.waitForTimeout(900);
    assert.equal(await page.inputValue(".search-bar input"), "hộp đèn");
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
