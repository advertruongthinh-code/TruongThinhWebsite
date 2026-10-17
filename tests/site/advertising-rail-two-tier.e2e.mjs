// Rail hai tầng (taxonomy R3): hover cụm không mở danh sách; hàng chip của cụm đang chọn ở PC và điện thoại.
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
  current: [...document.querySelectorAll('[aria-current="true"][data-advertising-filter], [aria-current="true"][data-advertising-product]')]
    .map((node) => node.dataset.advertisingFilter || node.dataset.advertisingProduct),
  chips: [...document.querySelectorAll("[data-advertising-chips]:not([hidden])")].map((node) => node.dataset.advertisingChips),
  path: location.pathname,
  cards: [...document.querySelectorAll("[data-advertising-card]")].length,
}));

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-advertising-card]");
  const html = await (await page.request.get(`${baseUrl}/vi/advertising-products/`)).text();
  assert.match(html, new RegExp(`href="${productPath}"[^>]*data-advertising-product="${product}"`), "HTML tĩnh đã chứa link sản phẩm");
  assert.deepEqual((await railState(page)).chips, [], "Tất cả không có hàng chip");

  // Rail vào màn bằng GSAP (trượt lên); hover sau khi nó đứng yên.
  await page.waitForFunction(() => !document.querySelector('[data-advertising-filter="signage"]').style.transform
    && getComputedStyle(document.querySelector('[data-advertising-filter="signage"]')).opacity === "1");
  await page.hover('[data-advertising-filter="signage"]');
  await page.waitForTimeout(400);
  assert.equal(await page.locator(".rail-panel").count(), 0, "hover cụm không có danh sách sản phẩm");
  const documents = [];
  page.on("request", (request) => { if (request.resourceType() === "document") documents.push(request.url()); });
  await page.locator('[data-advertising-filter="signage"]').click();
  await page.waitForFunction(() => location.pathname === "/vi/advertising-products/bang-hieu-quang-cao/");
  await page.locator(`.rail-chips:not([hidden]) [data-advertising-product="${product}"]`).click();
  await page.waitForFunction((target) => location.pathname === target, productPath);
  await page.waitForTimeout(800);
  const afterChip = await railState(page);
  assert.deepEqual(documents, [], "đổi filter không tải document");
  assert.deepEqual(afterChip.current, ["signage", product], "cụm và chip cùng đánh dấu");
  assert.deepEqual(afterChip.chips, ["signage"], "hàng chip của cụm đang chọn hiện");
  const productIds = new Set(ADVERTISING_CARDS.filter((card) => card.productIds?.includes(product)).map((card) => card.id));
  const shown = await page.evaluate(() => [...document.querySelectorAll(".advertising-grid [data-advertising-card]")].map((node) => node.dataset.advertisingCard));
  assert.ok(shown.length && shown.every((id) => productIds.has(id)), "masonry chỉ còn card của sản phẩm");
  // Từ 1025px rail một hàng nâng lên, chip nằm chỗ rail cũ, chữ "Cuộn xuống" vẫn hiện bên dưới chip.
  const stack = await page.evaluate(() => {
    const box = (selector) => document.querySelector(selector).getBoundingClientRect();
    const cue = document.querySelector(".scroll-cue");
    return { rail: box(".project-filters").bottom, chipsTop: box(".rail-chips:not([hidden])").top,
      chipsBottom: box(".rail-chips:not([hidden])").bottom, cueTop: box(".scroll-cue").top, cueVisibility: getComputedStyle(cue).visibility };
  });
  assert.equal(stack.cueVisibility, "visible", "chữ Cuộn xuống vẫn hiện khi có chip");
  assert.ok(stack.rail <= stack.chipsTop && stack.chipsBottom < stack.cueTop, `rail, chip, Cuộn xuống không chồng nhau: ${JSON.stringify(stack)}`);

  await page.locator('.rail-chips:not([hidden]) [data-advertising-product="signage/light-boxes"]').click();
  await page.waitForFunction(() => location.pathname === "/vi/advertising-products/bang-hieu-quang-cao/hop-den/");
  // Chip sản phẩm chưa có trang (taxonomy R5): lọc tại chỗ, URL là trang cụm kèm ?category=, kicker của cụm.
  const menus = "printing-decals/menus";
  const menuUrl = "/vi/advertising-products/in-an-decal/?category=printing-decals%2Fmenus";
  const menuIds = new Set(ADVERTISING_CARDS.filter((card) => card.productIds?.includes(menus)).map((card) => card.id));
  await page.locator('[data-advertising-filter="printing-decals"]').click();
  await page.waitForFunction(() => location.pathname === "/vi/advertising-products/in-an-decal/");
  await page.locator(`.rail-chips:not([hidden]) [data-advertising-product="${menus}"]`).click();
  await page.waitForFunction((target) => location.pathname + location.search === target, menuUrl);
  await page.waitForTimeout(800);
  const menuShown = await page.evaluate(() => [...document.querySelectorAll(".advertising-grid [data-advertising-card]")].map((node) => node.dataset.advertisingCard));
  assert.ok(menuIds.size >= 3 && menuIds.size < 9, "Menu có 3 tới 8 ảnh");
  assert.deepEqual(menuShown.sort(), [...menuIds].sort(), "masonry chỉ còn card Menu");
  assert.deepEqual((await railState(page)).current, ["printing-decals", menus]);
  assert.equal(await page.locator("[data-motion-hero-kicker]").textContent(), "In ấn, decal & menu", "kicker giữ tên cụm");
  await page.locator('[data-advertising-filter="all"]').click();
  await page.waitForFunction(() => location.pathname === "/vi/advertising-products/");
  assert.deepEqual((await railState(page)).chips, [], "về Tất cả thì hàng chip ẩn");

  // Đang lọc và đã cuộn xuống: bấm "Sản phẩm quảng cáo" trên navbar thì về Tất cả và lên đầu trang.
  await page.locator('[data-advertising-filter="office-signs"]').click();
  await page.waitForFunction(() => location.pathname === "/vi/advertising-products/bien-van-phong/");
  await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(400));
  await page.waitForFunction(() => window.TruongThinhMotion.getLogicalScroll() > 300);
  await page.locator('[data-site-header] .desktop-nav a[href="/vi/advertising-products/"]').click();
  await page.waitForFunction(() => location.pathname === "/vi/advertising-products/"
    && window.TruongThinhMotion.getLogicalScroll() < 1);
  assert.deepEqual((await railState(page)).current, ["all"], "navbar đưa bộ lọc về Tất cả");
  assert.deepEqual(documents, [], "chip, Tất cả và navbar không tải document");
  // Tải thẳng URL chip chưa có trang: filter đặt sẵn, URL giữ nguyên, canonical là trang cụm.
  await page.goto(`${baseUrl}${menuUrl}`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-advertising-card]");
  assert.equal(await page.evaluate(() => location.pathname + location.search), menuUrl);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "/vi/advertising-products/in-an-decal/");
  assert.deepEqual((await railState(page)).current, ["printing-decals", menus]);
  // URL trang sản phẩm đã mất (tụt ngưỡng R5) trả 404 của cụm rồi chuyển về trang cụm.
  const gone = await page.goto(`${baseUrl}/vi/advertising-products/in-an-decal/menu/?utm=a`);
  assert.equal(gone.status(), 404);
  await page.waitForURL(`${baseUrl}/vi/advertising-products/in-an-decal/?utm=a`);
  await page.close();

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await phone.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "networkidle" });
  await phone.waitForSelector("[data-advertising-card]");
  await phone.locator('[data-advertising-filter="office-signs"]').scrollIntoViewIfNeeded();
  await phone.locator('[data-advertising-filter="office-signs"]').tap();
  await phone.waitForFunction(() => location.pathname === "/vi/advertising-products/bien-van-phong/");
  const chips = phone.locator('[data-advertising-chips="office-signs"]');
  assert.equal(await chips.evaluate((node) => getComputedStyle(node).overflowX), "auto", "hàng chip cuộn ngang");
  await chips.locator('[data-advertising-product="office-signs/room-signs"]').tap();
  await phone.waitForFunction(() => location.pathname === "/vi/advertising-products/bien-van-phong/bien-phong-ban/");
  const phoneState = await railState(phone);
  assert.deepEqual(phoneState.current, ["office-signs", "office-signs/room-signs"]);
  const inView = await chips.evaluate((node) => {
    const chip = node.querySelector('[aria-current="true"]').getBoundingClientRect();
    return chip.left >= 0 && chip.right <= innerWidth;
  });
  assert.ok(inView, "chip đang chọn nằm trong khung");
  await phone.close();
  console.log("advertising rail two-tier: ok");
} finally {
  await browser.close();
}
