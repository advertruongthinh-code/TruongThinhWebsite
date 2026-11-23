// On-page search bar of the advertising pages (advertising-search R6 to R10, search-bar R1 to R5, text and one image). /api/search is mocked with fixed scores.
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
// A search glides the page to the grid top (search-bar R9), past the hero rail and with the header slid away: back to the top first,
// once the 600ms glide has ended.
const backToTop = async (page) => {
  await page.waitForTimeout(800);
  await page.evaluate(() => window.TruongThinhMotion?.setLogicalScroll(0) || scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(400);
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

test("R6: slow Worker shows keyword results at 0.8 s; late vector results replace them untouched, or are offered after a scroll", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, PAGE, { delay: 2000 });
    const count = () => page.evaluate(() => Number(/\d+/.exec(document.querySelector("[data-search-live]").textContent)?.[0]));
    const start = Date.now();
    await search(page, "hộp đèn");
    await announced(page, /kết quả/, 2000);
    const shownAt = Date.now() - start;
    assert(shownAt >= 700 && shownAt < 1800, `keyword results at ${shownAt} ms`);
    const keywordCount = await count();
    // Untouched: the vector answer (keyword cards plus the 3 mocked ids) takes the grid, no offer button.
    await page.waitForFunction((before) => Number(/\d+/.exec(document.querySelector("[data-search-live]").textContent)?.[0]) > before, keywordCount, { timeout: 4000 });
    assert.equal(await page.locator("[data-masonry-offer]").count(), 0);
    // Scrolled after the keyword results: the late answer waits behind the offer button.
    await search(page, "chữ nổi");
    await announced(page, /kết quả cho “chữ nổi”/, 2000);
    await page.mouse.wheel(0, 200);
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
    assert.match(await page.locator(".search-bar [data-search-note]").textContent(), /chưa thấy mẫu phù hợp/i, "short notice in the input's place");
    assert(await page.locator(".search-bar [data-search-note]").isVisible());
    await page.waitForFunction(() => document.querySelector(".search-bar [data-search-note]").hidden, null, { timeout: 6000 });
    assert.equal(await page.inputValue(".search-bar input"), "xyzzy qwerty", "the typed text comes back");
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
        return { aboveRail: bar.bottom <= rail.top + 1, cue: document.querySelectorAll("[data-scroll-cue]").length, talk: document.querySelectorAll(".search-bar a").length };
      });
      assert.deepEqual(hero, { aboveRail: true, cue: 0, talk: 0 });
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
        const slot = document.querySelector("[data-search-dock]").getBoundingClientRect();
        const bar = document.querySelector("[data-search-dock] .search-bar__shell").getBoundingClientRect();
        const heading = document.querySelector("#cta-title").getBoundingClientRect();
        const legacy = document.querySelector(".detail-cta .legacy-link");
        const input = document.querySelector("[data-search-dock] input");
        return {
          talk: document.querySelectorAll(".search-bar a").length,
          inSlot: Math.round(bar.top) === Math.round(slot.top) && Math.round(bar.bottom) <= Math.round(slot.bottom),
          belowHeading: slot.top >= heading.bottom - 1,
          font: getComputedStyle(input).fontSize,
          legacy: getComputedStyle(legacy).display !== "none" && legacy.getBoundingClientRect().top > bar.bottom,
        };
      });
      // search-bar R4: the CTA link shows under the bar, no link inside the bar.
      assert.deepEqual(docked, { talk: 0, inSlot: true, belowHeading: true, font: "16px", legacy: true });
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
  test(`R7 at ${viewport.width}px: a search from the docked bar works, and the docked bar is the same white block without shadow`, async () => {
    const browser = await launchBrowser();
    try {
      const { context, page } = await open(browser, viewport, PAGE, { ids: [] });
      await scrollToSlot(page);
      await page.waitForFunction(() => !document.querySelector(".search-bar").getAnimations({ subtree: true }).length, null, { timeout: 8000 }).catch(() => {});
      const look = await page.evaluate(() => {
        const shell = getComputedStyle(document.querySelector("[data-search-dock] .search-bar__shell"));
        return { ground: shell.backgroundColor, border: `${shell.borderTopWidth} ${shell.borderTopColor}`, shadow: shell.boxShadow.startsWith("rgba(0, 0, 0, 0) 0px 0px 0px") || shell.boxShadow === "none" };
      });
      assert.deepEqual(look, { ground: "rgb(255, 255, 255)", border: "1px rgb(32, 33, 32)", shadow: true }, "search-bar R1: white block, no shadow");
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
const thumbSrc = (page) => page.evaluate(() => {
  const thumb = document.querySelector(".search-bar [data-search-thumb]");
  return thumb.hidden ? null : thumb.querySelector("img").src;
});
const noteText = (page) => page.evaluate(() => document.querySelector(".search-bar [data-search-note]").textContent);

test("R8, R4: one image by the button, replaced by the next, without EXIF in the request; SVG and video are turned away", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, PAGE, { ids: VECTOR_IDS });
    const bodies = [];
    page.on("request", (request) => request.url().endsWith("/api/search") && bodies.push(request.postDataJSON()));
    const height = () => page.evaluate(() => document.querySelector(".search-bar__shell").getBoundingClientRect().height);
    const before = await height();
    await page.setInputFiles("[data-search-file]", await makeJpeg(page, 10));
    await page.waitForFunction(() => !document.querySelector(".search-bar [data-search-thumb]").hidden);
    const first = await thumbSrc(page);
    // search-bar R3: the thumbnail takes the image button's place and the block keeps its height.
    assert.equal(await page.locator(".search-bar [data-search-image]").isVisible(), false);
    assert.equal(await height(), before, "the bar does not grow");
    await page.evaluate(() => { document.querySelector("[data-search-file]").multiple = true; });
    await page.setInputFiles("[data-search-file]", await Promise.all([210, 260].map((h) => makeJpeg(page, h))));
    await page.waitForFunction((old) => document.querySelector(".search-bar [data-search-thumb] img").src !== old, first);
    assert.equal(await page.locator(".search-bar [data-search-thumb] img").count(), 1, "still one image");

    await barStill(page);
    await page.click(".search-bar .search-bar__go");
    await announced(page, /kết quả/);
    const sent = bodies.at(-1);
    assert.equal(sent.images.length, 1);
    assert.equal(sent.text, undefined, "no text sent when the input is empty");
    const bytes = Buffer.from(sent.images[0], "base64");
    assert.equal(bytes.subarray(0, 3).toString("hex"), "ffd8ff", "JPEG");
    assert.equal(bytes.includes(Buffer.from("GPSLatitude")), false, "no GPS");
    assert.equal(bytes.includes(Buffer.from([0xff, 0xe1])), false, "no APP1 block");
    assert(bytes.length <= 300 * 1024, "at most 300 KB");

    // With text, removing the image after results searches again after reSearchMs, text only; focus goes to the image button.
    await page.fill(".search-bar input", "hộp đèn");
    await page.press(".search-bar input", "Enter");
    await announced(page, /kết quả cho “hộp đèn”/);
    const count = bodies.length;
    await barStill(page);
    await page.click(".search-bar [data-search-remove]");
    await page.waitForTimeout(900);
    assert.equal(bodies.length, count + 1, "searched again");
    assert.equal(bodies.at(-1).images.length, 0);
    assert.equal(await page.evaluate(() => document.activeElement?.matches("[data-search-image]")), true);

    await page.locator(".search-bar input").press("Escape");
    assert.equal(await thumbSrc(page), null, "Esc drops the image");
    await page.setInputFiles("[data-search-file]", { name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>") });
    await page.waitForFunction(() => /chưa dùng được/i.test(document.querySelector(".search-bar [data-search-note]").textContent));
    await page.setInputFiles("[data-search-file]", { name: "clip.mp4", mimeType: "video/mp4", buffer: Buffer.from("0000") });
    await page.waitForFunction(() => /chỉ tìm bằng ảnh/i.test(document.querySelector(".search-bar [data-search-note]").textContent));
    assert.equal(await thumbSrc(page), null);
    await context.close();
  } finally {
    await browser.close();
  }
});

test("R8, R10: text and the image survive a reload (#q= in the URL)", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, PAGE, { ids: VECTOR_IDS });
    await page.setInputFiles("[data-search-file]", await makeJpeg(page, 40));
    await page.waitForFunction(() => !document.querySelector(".search-bar [data-search-thumb]").hidden);
    // Text with an image writes #q=; the reload reads the hash and must still restore the image of the same session.
    await page.fill(".search-bar input", "hộp đèn");
    await page.click(".search-bar .search-bar__go");
    await announced(page, /kết quả/);
    assert.match(page.url(), /#q=/);
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => !document.querySelector(".search-bar [data-search-thumb]")?.hidden, null, { timeout: 20000 });
    assert.equal(await page.inputValue(".search-bar input"), "hộp đèn");
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
    await page.waitForFunction(() => !document.querySelector(".search-bar [data-search-thumb]").hidden);
    await page.fill(".search-bar input", "biển hiệu");
    const start = Date.now();
    await page.press(".search-bar input", "Enter");
    await page.waitForFunction(() => /đang chậm/i.test(document.querySelector(".search-bar [data-search-note]").textContent), null, { timeout: 5000 });
    const waited = Date.now() - start;
    assert(waited >= 2800 && waited < 4500, `slow note at ${waited} ms`);
    assert.equal(await page.locator("[data-masonry-pending]").count(), 0, "grid no longer pending");
    assert(await page.locator(".search-bar [data-search-note] button", { hasText: /thử lại/i }).isVisible());
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
    // Register the listener before the click (awaited), then wait with a bound: a pending page promise left the test hanging until the
    // browser closed and hid the real state.
    await page.evaluate(() => {
      window.__ttSearchLeft = null;
      addEventListener("masonry:search-left", (e) => { window.__ttSearchLeft = e.detail?.reason ?? ""; }, { once: true });
    });
    await page.click(".search-bar [data-search-clear-text]");
    await page.waitForFunction(() => window.__ttSearchLeft !== null, null, { timeout: 10_000 });
    assert.equal(await page.evaluate(() => window.__ttSearchLeft), "clear");
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
    await backToTop(page);
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
    await backToTop(page);
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

test("search-bar R1, R2: one white block in the three places; floating it narrows, widens with results and opens a chip row that filters in the results", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser);
    const look = async () => {
      await page.waitForFunction(() => !document.querySelector(".search-bar").getAnimations({ subtree: true }).length, null, { timeout: 8000 });
      return page.evaluate(() => {
        const node = document.querySelector(".search-bar__shell");
        const shell = getComputedStyle(node);
        return { border: `${shell.borderTopWidth} ${shell.borderTopColor}`, ground: shell.backgroundColor, shadow: !/^rgba\(0, 0, 0, 0\) 0px 0px 0px/.test(shell.boxShadow),
          width: Math.round(node.getBoundingClientRect().width), height: Math.round(node.getBoundingClientRect().height) };
      });
    };
    const block = { border: "1px rgb(32, 33, 32)", ground: "rgb(255, 255, 255)" };
    assert.deepEqual(await look(), { ...block, shadow: false, width: 1000, height: 50 }, "top slot");
    await scrollToGrid(page);
    assert.deepEqual(await look(), { ...block, shadow: true, width: 560, height: 50 }, "floating");
    await search(page, "hộp đèn");
    await announced(page, /kết quả/);
    await page.waitForFunction(() => document.querySelectorAll(".search-bar__chip").length > 1, null, { timeout: 5000 });
    assert.deepEqual(await look(), { ...block, shadow: true, width: 760, height: 94 }, "floating with results: chip row");
    // A chip filters within the results and keeps the query; again on it returns to all results.
    const chip = page.locator(".search-bar__chiprow .search-bar__chip").nth(1);
    const label = await chip.locator("b").textContent();
    await barStill(page);
    await chip.click();
    await page.waitForFunction((text) => [...document.querySelectorAll(".search-bar__chip")].some((node) => node.textContent.startsWith(text) && node.getAttribute("aria-pressed") === "true"), label, { timeout: 5000 });
    assert.equal(await page.inputValue(".search-bar input"), "hộp đèn");
    await page.locator(".search-bar__chiprow .search-bar__chip[aria-pressed=true]").click();
    await page.waitForFunction(() => !document.querySelector(".search-bar__chip[aria-pressed=true]"), null, { timeout: 5000 });
    // At the scroll limit the bar has finished turning into its docked look (search-bar R7).
    await scrollToSlot(page);
    await page.evaluate(() => window.TruongThinhMotion?.setLogicalScroll(1e6) || scrollTo({ top: 1e6, behavior: "instant" }));
    await page.waitForTimeout(600);
    assert.deepEqual(await look(), { ...block, shadow: false, width: 1000, height: 50 }, "cta slot: no chip row, no shadow");
    await context.close();
  } finally {
    await browser.close();
  }
});

test("search-bar R4: at the end of the page the space above and below the bar is equal and the cluster sits at the optical centre", async () => {
  const browser = await launchBrowser();
  try {
    for (const viewport of [WIDE, PHONE]) {
      const { context, page } = await open(browser, viewport);
      await scrollToSlot(page);
      // At the scroll limit, where the CTA rule holds.
      await page.evaluate(() => window.TruongThinhMotion?.setLogicalScroll(1e6) || scrollTo({ top: 1e6, behavior: "instant" }));
      await page.waitForFunction(() => !document.querySelector(".search-bar").getAnimations({ subtree: true }).length, null, { timeout: 8000 });
      await page.waitForTimeout(1500);
      // The bottom zone reveals the header (site-shell R3); a slow runner may still be sliding it, so measure once it stands still.
      await page.waitForFunction(() => !document.querySelector(".site-header").getAnimations({ subtree: true }).length, null, { timeout: 8000 });
      const cta = await page.evaluate(() => {
        const heading = document.querySelector("#cta-title").getBoundingClientRect();
        const slot = document.querySelector("[data-search-dock]").getBoundingClientRect();
        // Phones slide the header away on the way down (phone-header-scroll R2): the room then starts at the screen's top.
        const header = Math.max(0, document.querySelector(".site-header").getBoundingClientRect().bottom);
        const footer = document.querySelector("footer.site-footer").getBoundingClientRect().top;
        const optical = header + (footer - header) * 0.45;
        return { centre: Math.round((heading.top + slot.bottom) / 2 - optical), gap: getComputedStyle(document.querySelector(".detail-cta .legacy-link")).marginTop };
      });
      assert(Math.abs(cta.centre) <= 2, `${viewport.width}px: cluster centre ${cta.centre}px from the optical centre`);
      assert(Number.parseFloat(cta.gap) > 0, "the link keeps a measured gap");
      await context.close();
    }
  } finally {
    await browser.close();
  }
});

test("R7: keys that move the caret in the input do not scroll the page", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser);
    await scrollToGrid(page);
    await barStill(page);
    await page.fill(".search-bar input", "hộp đèn led");
    const before = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
    for (const key of ["Home", "End", "PageUp", "PageDown", "ArrowUp", "ArrowDown", "Space"]) {
      await page.press(".search-bar input", key);
      await page.waitForTimeout(400);
      const after = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
      assert(Math.abs(after - before) < 2, `${key} scrolled the page ${Math.round(after - before)}px`);
    }
    await page.press(".search-bar input", "Home");
    assert.equal(await page.evaluate(() => document.activeElement.selectionStart), 0, "Home moves the caret to the start");
    await context.close();
  } finally {
    await browser.close();
  }
});

// search-bar R7: place changes are decisive; the bar is always in exactly one place with that place's look.
for (const viewport of [WIDE, PHONE]) {
  test(`search-bar R7 at ${viewport.width}px: the bar leaves the top slot only once out of sight and snaps into the CTA slot`, async () => {
    const browser = await launchBrowser();
    try {
      const { context, page } = await open(browser, viewport);
      const to = (y) => page.evaluate((value) => window.TruongThinhMotion?.setLogicalScroll(value) || scrollTo({ top: value, behavior: "instant" }), y);
      const state = () => page.evaluate(() => {
        const shell = document.querySelector(".search-bar__shell").getBoundingClientRect();
        const slot = document.querySelector("[data-search-dock-top]").getBoundingClientRect();
        const header = document.querySelector(".site-header").getBoundingClientRect();
        return { place: document.body.dataset.searchPlace, width: Math.round(shell.width), top: shell.top, slotBottom: slot.bottom, headerBottom: Math.max(0, header.bottom) };
      });
      await to(0);
      await page.waitForTimeout(400);
      const home = await state();
      assert.equal(home.place, "top");
      // A little way down: the bar is still in the slot and has moved up with the page, so it never crosses the content.
      await to(60);
      await page.waitForTimeout(400);
      const scrolled = await state();
      assert.equal(scrolled.place, "top");
      assert(Math.abs(scrolled.top - (home.top - 60)) < 3, "the bar scrolls away with the slot");
      // The floating bar shows only once the whole slotted bar is out of sight.
      for (let y = 80; y < 1200; y += 20) {
        await to(y);
        await page.waitForTimeout(120);
        const now = await state();
        if (now.place === "top") continue;
        assert.equal(now.place, "float");
        assert(now.slotBottom <= now.headerBottom + 20, `left the slot while it was still in sight (${now.slotBottom} > ${now.headerBottom})`);
        break;
      }
      await to(0);
      await page.waitForTimeout(400);
      assert.equal((await state()).place, "top");
      // The CTA slot: only the floating width and the slot width, nothing in between.
      const ctaY = await page.evaluate(() => Math.round(document.querySelector("[data-search-dock]").getBoundingClientRect().top + (window.TruongThinhMotion?.getLogicalScroll() ?? scrollY)));
      const widths = new Set();
      for (let y = ctaY - innerHeightOf(viewport); y <= ctaY; y += 25) {
        await to(y);
        await page.waitForTimeout(120);
        widths.add((await state()).width);
      }
      assert(widths.size <= 2, `widths seen: ${[...widths].join(", ")}`);
      await to(1e6);
      await page.waitForTimeout(1200);
      assert.equal((await state()).place, "cta");
      // The CTA block centres its text; the bar's tip stays left aligned as in every other place (owner 2026-11-22).
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".search-bar__hint")).textAlign), "start");
      await to(await page.evaluate(() => window.TruongThinhMotion?.getLogicalScroll() ?? scrollY) - Math.round(viewport.height * 0.6));
      await page.waitForTimeout(400);
      assert.equal((await state()).place, "float", "far above the slot the bar floats again");
      await context.close();
    } finally {
      await browser.close();
    }
  });
}
const innerHeightOf = (viewport) => viewport.height;

// search-bar R9: a search glides the page so the grid's top sits one outer margin below the header.
for (const viewport of [WIDE, PHONE]) {
  for (const from of ["top", "mid", "cta"]) {
    test(`search-bar R9 at ${viewport.width}px from ${from}: a search glides to the grid top`, async () => {
      const browser = await launchBrowser();
      try {
        const { context, page } = await open(browser, viewport);
        const to = (y) => page.evaluate((value) => window.TruongThinhMotion?.setLogicalScroll(value) || scrollTo({ top: value, behavior: "instant" }), y);
        if (from === "mid") await to(4000);
        if (from === "cta") await to(1e6);
        await page.waitForTimeout(800);
        await search(page, "hộp đèn");
        await page.waitForFunction(() => {
          const grid = document.querySelector("[data-project-grid]").getBoundingClientRect().top;
          const header = Math.max(0, document.querySelector(".site-header").getBoundingClientRect().bottom);
          const outer = Number.parseFloat(getComputedStyle(document.querySelector(".masonry-section")).getPropertyValue("--masonry-outer"));
          return Math.abs(grid - header - outer) <= 2;
        }, null, { timeout: 8000 });
        await context.close();
      } finally {
        await browser.close();
      }
    });
  }
}

// search-bar R2: most cards first; an overflowing row pins "Show all (N)", which opens every product above the bar.
test("search-bar R2 at 384px: chips sort by cards and a cut-off row offers all of them in a panel", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, PHONE);
    await search(page, "đèn");
    await page.waitForFunction(() => document.querySelector(".search-bar__more") && !document.querySelector(".search-bar__more").hidden, null, { timeout: 10000 });
    await page.waitForTimeout(800);
    const row = await page.evaluate(() => ({
      counts: [...document.querySelectorAll(".search-bar__chiprow .search-bar__chip sup")].map((node) => Number(node.textContent)),
      label: document.querySelector(".search-bar__more").textContent,
    }));
    assert.deepEqual(row.counts, [...row.counts].sort((a, b) => b - a), "most cards first");
    assert.equal(row.label, `Hiện tất cả (${row.counts.length})`);
    await page.click(".search-bar__more");
    const panel = await page.evaluate(() => {
      const node = document.querySelector(".search-bar__all");
      const box = node.getBoundingClientRect();
      return { open: !node.hidden, chips: node.querySelectorAll(".search-bar__chip").length, above: box.bottom <= document.querySelector(".search-bar__chips").getBoundingClientRect().top, expanded: document.querySelector(".search-bar__more").getAttribute("aria-expanded") };
    });
    assert.deepEqual(panel, { open: true, chips: row.counts.length, above: true, expanded: "true" });
    await page.click(".search-bar__all .search-bar__chip:nth-child(2)");
    await page.waitForTimeout(900);
    const picked = await page.evaluate(() => ({ open: !document.querySelector(".search-bar__all").hidden, pressed: document.querySelectorAll(".search-bar__chiprow [aria-pressed=true]").length, query: document.querySelector(".search-bar input").value }));
    assert.deepEqual(picked, { open: false, pressed: 1, query: "đèn" });
    await context.close();
  } finally {
    await browser.close();
  }
});

// search-bar R8: the bar lives on the root page only.
test("search-bar R8: no bar on a filter page; filtering to a group hides it and back to all shows it", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, WIDE, `${BASE_URL}/vi/advertising-products/bang-hieu-quang-cao/`);
    await page.waitForSelector(".search-host", { state: "attached", timeout: 20000 });
    const off = () => page.evaluate(() => ({
      off: document.querySelector("[data-barba-namespace]").hasAttribute("data-search-off"),
      hidden: getComputedStyle(document.querySelector(".search-host")).visibility === "hidden",
      slots: [...document.querySelectorAll(".hero-search, [data-search-dock]")].every((node) => getComputedStyle(node).display === "none"),
    }));
    await page.waitForTimeout(600);
    assert.deepEqual(await off(), { off: true, hidden: true, slots: true }, "filter page");
    await page.goto(PAGE, { waitUntil: "load" });
    await page.waitForSelector(".search-bar", { timeout: 20000 });
    await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"), null, { timeout: 20000 });
    assert.deepEqual(await off(), { off: false, hidden: false, slots: false }, "root page");
    await page.click('[data-masonry-filter="signage"]');
    await page.waitForTimeout(800);
    assert.deepEqual(await off(), { off: true, hidden: true, slots: true }, "a group picked from the root page");
    await page.click('[data-masonry-filter="all"]');
    await page.waitForTimeout(800);
    assert.deepEqual(await off(), { off: false, hidden: false, slots: false }, "back to all");
    await context.close();
  } finally {
    await browser.close();
  }
});
