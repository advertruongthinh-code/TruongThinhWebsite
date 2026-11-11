// Two-tier rail (taxonomy R3): hovering a cluster does not open a list; the chip row of the selected cluster on PC and phone.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CARDS } from "../../src/site/advertising-products/catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".tooling/browsers");
}

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined });
const product = "signage/raised-letters";
const productPath = "/vi/advertising-products/bang-hieu-quang-cao/chu-noi/";

const railState = (page) => page.evaluate(() => ({
  current: [...document.querySelectorAll('[aria-current="true"][data-masonry-filter], [aria-current="true"][data-masonry-product]')]
    .map((node) => node.dataset.masonryFilter || node.dataset.masonryProduct),
  chips: [...document.querySelectorAll("[data-masonry-chips]:not([hidden])")].map((node) => node.dataset.masonryChips),
  path: location.pathname,
  cards: [...document.querySelectorAll("[data-masonry-card]")].length,
}));

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-masonry-card]");
  const html = await (await page.request.get(`${baseUrl}/vi/advertising-products/`)).text();
  assert.match(html, new RegExp(`href="${productPath}"[^>]*data-masonry-product="${product}"`), "static HTML already contains the product link");
  assert.deepEqual((await railState(page)).chips, [], "Tất cả has no chip row");

  // The rail enters the screen via GSAP (slides up); hover after it settles.
  await page.waitForFunction(() => !document.querySelector('[data-masonry-filter="signage"]').style.transform
    && getComputedStyle(document.querySelector('[data-masonry-filter="signage"]')).opacity === "1");
  await page.hover('[data-masonry-filter="signage"]');
  await page.waitForTimeout(400);
  assert.equal(await page.locator(".rail-panel").count(), 0, "hovering a cluster has no product list");
  // Desktop hover: the ::after underline runs in like the header nav (taxonomy R3); other items still retract to 0.
  const underline = (selector) => page.evaluate((s) => {
    const after = getComputedStyle(document.querySelector(s), "::after");
    return { transform: after.transform, height: after.height };
  }, selector);
  assert.deepEqual(await underline('[data-masonry-filter="signage"]'), { transform: "matrix(1, 0, 0, 1, 0, 0)", height: "3px" }, "cluster hover: full 3px underline");
  assert.equal((await underline('[data-masonry-filter="printing-decals"]')).transform, "matrix(0, 0, 0, 1, 0, 0)", "non-hovered cluster: underline retracts to 0");
  const documents = [];
  page.on("request", (request) => { if (request.resourceType() === "document") documents.push(request.url()); });
  await page.locator('[data-masonry-filter="signage"]').click();
  await page.waitForFunction(() => location.pathname === "/vi/advertising-products/bang-hieu-quang-cao/");
  // Click a cluster: the just-shown chip row runs its entrance (opacity 0 before entering); the kicker stays still (taxonomy R3, owner 2026-11-08).
  const entrance = () => page.evaluate(() => ({
    kickerText: document.querySelector("[data-motion-hero-kicker]").textContent.trim(),
    kicker: document.querySelector("[data-motion-hero-kicker]").getAnimations().filter((a) => !(a instanceof CSSTransition)).length,
    chips: [...document.querySelectorAll(".rail-chips:not([hidden]) .rail-chip")].map((chip) => chip.getAnimations().filter((a) => !(a instanceof CSSTransition)).length),
  }));
  const clusterEntrance = await entrance();
  assert.equal(clusterEntrance.kickerText, "Sản phẩm tiêu biểu", "kicker unchanged when filtering a cluster");
  assert.equal(clusterEntrance.kicker, 0, "kicker runs no entrance because its text does not change");
  assert.ok(clusterEntrance.chips.length > 1 && clusterEntrance.chips.every((count) => count === 1), "each chip of the just-shown cluster has an entrance");
  const chip = `.rail-chips:not([hidden]) [data-masonry-product="${product}"]`;
  await page.hover(chip);
  await page.waitForTimeout(400);
  assert.deepEqual(await underline(`${chip} > span`), { transform: "matrix(1, 0, 0, 1, 0, 0)", height: "2px" }, "chip hover: full 2px underline");
  await page.locator(chip).click();
  await page.waitForFunction((target) => location.pathname === target, productPath);
  assert.equal((await entrance()).chips.reduce((a, b) => a + b, 0) <= clusterEntrance.chips.length, true, "switching product within the cluster does not rerun the chip entrance");
  await page.waitForTimeout(800);
  const afterChip = await railState(page);
  assert.deepEqual(documents, [], "changing filter loads no document");
  assert.deepEqual(afterChip.current, ["signage", product], "cluster and chip both marked");
  assert.deepEqual(afterChip.chips, ["signage"], "chip row of the selected cluster is shown");
  const productIds = new Set(ADVERTISING_CARDS.filter((card) => card.productIds?.includes(product)).map((card) => card.id));
  const shown = await page.evaluate(() => [...document.querySelectorAll(".masonry-grid [data-masonry-card]")].map((node) => node.dataset.masonryCard));
  assert.ok(shown.length && shown.every((id) => productIds.has(id)), "masonry has only cards of the product");
  // From 1025px the one-row rail lifts up, chips sit where the old rail was, and the "Cuộn xuống" text still shows below the chips.
  const stack = await page.evaluate(() => {
    const box = (selector) => document.querySelector(selector).getBoundingClientRect();
    const cue = document.querySelector(".scroll-cue");
    return { rail: box(".project-filters").bottom, chipsTop: box(".rail-chips:not([hidden])").top,
      chipsBottom: box(".rail-chips:not([hidden])").bottom, cueTop: box(".scroll-cue").top, cueVisibility: getComputedStyle(cue).visibility };
  });
  assert.equal(stack.cueVisibility, "visible", "Cuộn xuống text still shows when chips are present");
  assert.ok(stack.rail <= stack.chipsTop && stack.chipsBottom < stack.cueTop, `rail, chips, Cuộn xuống do not overlap: ${JSON.stringify(stack)}`);

  // Vertical anchoring (owner 2026-10-17): a one-row cluster and a multi-row cluster have their first chip row at the same position.
  const firstRowTop = async (cluster) => {
    await page.locator(`[data-masonry-filter="${cluster}"]`).click();
    await page.waitForFunction((c) => !document.querySelector(`[data-masonry-chips="${c}"]`).hidden
      && [...document.querySelectorAll(`[data-masonry-chips="${c}"] .rail-chip`)].every((chip) => !chip.getAnimations().length), cluster);
    return page.evaluate((c) => {
      const chips = [...document.querySelectorAll(`[data-masonry-chips="${c}"] .rail-chip`)].map((chip) => chip.getBoundingClientRect());
      return { top: Math.round(Math.min(...chips.map((r) => r.top))), rows: new Set(chips.map((r) => Math.round(r.top))).size,
        scroll: window.TruongThinhMotion.getLogicalScroll() };
    }, cluster);
  };
  const oneRow = await firstRowTop("signage");
  const manyRows = await firstRowTop("office-signs");
  assert.equal(oneRow.rows, 1, "Signage has one chip row");
  assert.ok(manyRows.rows > 1, "Office signs has multiple chip rows");
  assert.equal(manyRows.top, oneRow.top, `first chip row vertically fixed: ${JSON.stringify({ oneRow, manyRows })}`);

  await page.locator('[data-masonry-filter="signage"]').click();
  await page.waitForFunction(() => location.pathname === "/vi/advertising-products/bang-hieu-quang-cao/");
  await page.locator('.rail-chips:not([hidden]) [data-masonry-product="signage/light-boxes"]').click();
  await page.waitForFunction(() => location.pathname === "/vi/advertising-products/bang-hieu-quang-cao/hop-den/");
  // Every product with a chip has its own page (taxonomy R5), so the chip navigates to the product page; the kicker still stays put.
  const menus = "printing-decals/menus";
  const menuUrl = "/vi/advertising-products/in-an-decal/menu/";
  const menuIds = new Set(ADVERTISING_CARDS.filter((card) => card.productIds?.includes(menus)).map((card) => card.id));
  await page.locator('[data-masonry-filter="printing-decals"]').click();
  await page.waitForFunction(() => location.pathname === "/vi/advertising-products/in-an-decal/");
  await page.locator(`.rail-chips:not([hidden]) [data-masonry-product="${menus}"]`).click();
  await page.waitForFunction((target) => location.pathname === target, menuUrl);
  await page.waitForTimeout(800);
  const menuShown = await page.evaluate(() => [...document.querySelectorAll(".masonry-grid [data-masonry-card]")].map((node) => node.dataset.masonryCard));
  assert.ok(menuIds.size >= 10, "Menu has all 10 cards");
  assert.deepEqual(menuShown.sort(), [...menuIds].sort(), "masonry has only Menu cards");
  assert.deepEqual((await railState(page)).current, ["printing-decals", menus]);
  assert.equal((await page.locator("[data-motion-hero-kicker]").textContent()).trim(), "Sản phẩm tiêu biểu", "kicker unchanged when filtering a product");
  await page.locator('[data-masonry-filter="all"]').click();
  await page.waitForFunction(() => location.pathname === "/vi/advertising-products/");
  assert.deepEqual((await railState(page)).chips, [], "chip row hidden when returning to Tất cả");

  // Filtered and scrolled down: clicking "Sản phẩm quảng cáo" on the navbar returns to "Tất cả" and to the page top.
  await page.locator('[data-masonry-filter="office-signs"]').click();
  await page.waitForFunction(() => location.pathname === "/vi/advertising-products/bien-van-phong/");
  await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(400));
  await page.waitForFunction(() => window.TruongThinhMotion.getLogicalScroll() > 300);
  await page.locator('[data-site-header] .desktop-nav a[href="/vi/advertising-products/"]').click();
  await page.waitForFunction(() => location.pathname === "/vi/advertising-products/"
    && window.TruongThinhMotion.getLogicalScroll() < 1);
  assert.deepEqual((await railState(page)).current, ["all"], "navbar resets the filter to Tất cả");
  assert.deepEqual(documents, [], "chip, Tất cả and navbar load no document");
  // Load a product page directly: the filter is preset, canonical is that page itself.
  await page.goto(`${baseUrl}${menuUrl}`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-masonry-card]");
  assert.equal(await page.evaluate(() => location.pathname), menuUrl);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), menuUrl);
  assert.deepEqual((await railState(page)).current, ["printing-decals", menus]);
  // A lost product page URL (dropped below the R5 threshold) returns the cluster 404 and then redirects to the cluster page.
  const gone = await page.goto(`${baseUrl}/vi/advertising-products/in-an-decal/da-go/?utm=a`);
  assert.equal(gone.status(), 404);
  await page.waitForURL(`${baseUrl}/vi/advertising-products/in-an-decal/?utm=a`);
  await page.close();

  // Reduced motion: kicker and chips go straight to the final state, no animation.
  const calm = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await calm.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "networkidle" });
  await calm.waitForSelector("[data-masonry-card]");
  await calm.locator('[data-masonry-filter="signage"]').click();
  await calm.waitForFunction(() => location.pathname === "/vi/advertising-products/bang-hieu-quang-cao/");
  assert.equal(await calm.evaluate(() => [
    ...document.querySelectorAll("[data-motion-hero-kicker], .rail-chips:not([hidden]) .rail-chip"),
  ].flatMap((node) => node.getAnimations()).filter((animation) => !(animation instanceof CSSTransition)).length), 0, "reduced motion has no entrance");
  await calm.close();

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await phone.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "networkidle" });
  await phone.waitForSelector("[data-masonry-card]");
  await phone.locator('[data-masonry-filter="office-signs"]').scrollIntoViewIfNeeded();
  await phone.locator('[data-masonry-filter="office-signs"]').tap();
  await phone.waitForFunction(() => location.pathname === "/vi/advertising-products/bien-van-phong/");
  const chips = phone.locator('[data-masonry-chips="office-signs"]');
  assert.equal(await chips.evaluate((node) => getComputedStyle(node).overflowX), "auto", "chip row scrolls horizontally");
  await chips.locator('[data-masonry-product="office-signs/room-signs"]').tap();
  await phone.waitForFunction(() => location.pathname === "/vi/advertising-products/bien-van-phong/bien-phong-ban/");
  const phoneState = await railState(phone);
  assert.deepEqual(phoneState.current, ["office-signs", "office-signs/room-signs"]);
  const inView = await chips.evaluate((node) => {
    const chip = node.querySelector('[aria-current="true"]').getBoundingClientRect();
    return chip.left >= 0 && chip.right <= innerWidth;
  });
  assert.ok(inView, "selected chip is within the frame");
  // Touch devices keep text-decoration, with no running ::after underline (taxonomy R3).
  const phoneUnderline = await phone.evaluate(() => {
    const cluster = document.querySelector('[data-masonry-filter="office-signs"]');
    return { line: getComputedStyle(cluster).textDecorationLine, after: getComputedStyle(cluster, "::after").content };
  });
  assert.deepEqual(phoneUnderline, { line: "underline", after: "none" }, "phone: selected cluster underlined via text-decoration");
  await phone.close();
  console.log("advertising rail two-tier: ok");
} finally {
  await browser.close();
}
