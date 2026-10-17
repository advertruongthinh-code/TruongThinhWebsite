// Rail hai tầng (taxonomy R3): danh sách sản phẩm khi hover ở PC, hàng chip của cụm đang chọn ở PC và điện thoại.
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

  const panel = page.locator('[data-advertising-filter="signage"] + .rail-panel');
  assert.equal(await panel.evaluate((node) => getComputedStyle(node).opacity), "0", "danh sách ẩn khi chưa hover");
  // Rail vào màn bằng GSAP (trượt lên); hover sau khi nó đứng yên.
  await page.waitForFunction(() => !document.querySelector('[data-advertising-filter="signage"]').style.transform
    && getComputedStyle(document.querySelector('[data-advertising-filter="signage"]')).opacity === "1");
  await page.hover('[data-advertising-filter="signage"]');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-advertising-filter="signage"] + .rail-panel')).opacity === "1");
  const documents = [];
  page.on("request", (request) => { if (request.resourceType() === "document") documents.push(request.url()); });
  await panel.locator(`[data-advertising-product="${product}"]`).click();
  await page.waitForFunction((target) => location.pathname === target, productPath);
  await page.waitForTimeout(800);
  const afterPanel = await railState(page);
  assert.deepEqual(documents, [], "đổi filter không tải document");
  assert.deepEqual(afterPanel.current, ["signage", product, product], "cụm, mục danh sách và chip cùng đánh dấu");
  assert.deepEqual(afterPanel.chips, ["signage"], "hàng chip của cụm đang chọn hiện");
  const productIds = new Set(ADVERTISING_CARDS.filter((card) => card.productIds?.includes(product)).map((card) => card.id));
  const shown = await page.evaluate(() => [...document.querySelectorAll(".advertising-grid [data-advertising-card]")].map((node) => node.dataset.advertisingCard));
  assert.ok(shown.length && shown.every((id) => productIds.has(id)), "masonry chỉ còn card của sản phẩm");
  assert.equal(await page.locator(".scroll-cue").evaluate((node) => getComputedStyle(node).visibility), "hidden", "chip thay chỗ chữ Cuộn xuống");

  await page.mouse.move(10, 300);
  await page.locator('.rail-chips:not([hidden]) [data-advertising-product="signage/light-boxes"]').click();
  await page.waitForFunction(() => location.pathname === "/vi/advertising-products/bang-hieu-quang-cao/hop-den/");
  await page.locator('[data-advertising-filter="all"]').click();
  await page.waitForFunction(() => location.pathname === "/vi/advertising-products/");
  assert.deepEqual((await railState(page)).chips, [], "về Tất cả thì hàng chip ẩn");
  assert.deepEqual(documents, [], "chip và Tất cả không tải document");
  await page.close();

  // Ảnh lỗi của owner: cụm đang chọn ở hàng cuối, danh sách hover phải nằm trên hàng chip theo trục z.
  const office = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await office.goto(`${baseUrl}/vi/advertising-products/bien-van-phong/`, { waitUntil: "networkidle" });
  await office.waitForFunction(() => !document.querySelector('[data-advertising-filter="office-signs"]').style.transform
    && getComputedStyle(document.querySelector('[data-advertising-filter="office-signs"]')).opacity === "1");
  await office.hover('[data-advertising-filter="office-signs"]');
  await office.waitForFunction(() => getComputedStyle(document.querySelector('[data-advertising-filter="office-signs"] + .rail-panel')).opacity === "1");
  const onTop = await office.evaluate(() => {
    const chips = document.querySelector('[data-advertising-chips="office-signs"]').getBoundingClientRect();
    const panel = document.querySelector('[data-advertising-filter="office-signs"] + .rail-panel').getBoundingClientRect();
    const left = Math.max(chips.left, panel.left);
    const right = Math.min(chips.right, panel.right);
    const top = Math.max(chips.top, panel.top);
    const bottom = Math.min(chips.bottom, panel.bottom);
    if (left >= right || top >= bottom) return "không chồng nhau";
    return document.elementFromPoint((left + right) / 2, (top + bottom) / 2)?.closest(".rail-panel, .rail-chips")?.className;
  });
  assert.equal(onTop, "rail-panel", "danh sách hover nằm trên hàng chip");
  await office.close();

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await phone.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "networkidle" });
  await phone.waitForSelector("[data-advertising-card]");
  assert.equal(await phone.locator(".rail-panel").first().evaluate((node) => getComputedStyle(node).display), "none", "điện thoại không có danh sách hover");
  await phone.locator('[data-advertising-filter="office-signs"]').scrollIntoViewIfNeeded();
  await phone.locator('[data-advertising-filter="office-signs"]').tap();
  await phone.waitForFunction(() => location.pathname === "/vi/advertising-products/bien-van-phong/");
  const chips = phone.locator('[data-advertising-chips="office-signs"]');
  assert.equal(await chips.evaluate((node) => getComputedStyle(node).overflowX), "auto", "hàng chip cuộn ngang");
  await chips.locator('[data-advertising-product="office-signs/room-signs"]').tap();
  await phone.waitForFunction(() => location.pathname === "/vi/advertising-products/bien-van-phong/bien-phong-ban/");
  const phoneState = await railState(phone);
  assert.deepEqual(phoneState.current, ["office-signs", "office-signs/room-signs", "office-signs/room-signs"]);
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
