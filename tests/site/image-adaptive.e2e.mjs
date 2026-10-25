// Ảnh thích ứng mạng (docs/specs/image-adaptive-delivery.md R2 tới R4): mạng chậm thì bậc nhẹ, mạng nhanh lại thì nâng
// liền mạch; chạy cả khi trình duyệt không có navigator.connection (đường Safari, Firefox).
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/image-adaptive.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const SLOW = { offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8 };
const FAST = { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 };
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

const open = async ({ connection }) => {
  const context = await browser.newContext({ viewport: { width: 384, height: 724 }, deviceScaleFactor: 1.875, isMobile: true, hasTouch: true });
  if (!connection) await context.addInitScript(() => Object.defineProperty(Navigator.prototype, "connection", { get: () => undefined }));
  // Ghi mọi lần một khung ảnh đã settle bị gỡ settle, nhận is-media-error, hoặc ảnh đã hiện mất pixel (khung trống).
  await context.addInitScript(() => {
    window.__tierFaults = [];
    new MutationObserver((records) => records.forEach(({ target, oldValue }) => {
      if (oldValue?.includes("is-media-settled") && !target.classList.contains("is-media-settled")) window.__tierFaults.push(`unsettled ${target.className}`);
      if (target.classList.contains("is-media-error")) window.__tierFaults.push(`error ${target.className}`);
    })).observe(document, { subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true });
    const shown = new WeakSet();
    const sample = () => {
      document.querySelectorAll('img[src^="/assets/content/"], img[srcset]').forEach((image) => {
        const painted = image.complete && image.naturalWidth > 0;
        if (painted) shown.add(image);
        else if (shown.has(image)) window.__tierFaults.push(`blank ${image.currentSrc}`);
      });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  const requests = [];
  page.on("request", (request) => new URL(request.url()).pathname.startsWith("/assets/content/") && requests.push(new URL(request.url()).pathname));
  return { context, page, cdp, requests };
};

const variantWidth = (url) => Number(url.match(/-(\d+)\.\w+$/)?.[1]) || Infinity;

for (const connection of [true, false]) {
  const label = connection ? "có navigator.connection" : "không navigator.connection";
  const { context, page, cdp, requests } = await open({ connection });
  await cdp.send("Network.emulateNetworkConditions", SLOW);
  await page.goto(`${base}/vi/residential/`, { waitUntil: "load" });
  for (let step = 0; step < 16; step += 1) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(1500);
  }
  assert.equal(await page.evaluate(() => document.documentElement.dataset.networkTier), "slow", `${label}: mạng 1,6 Mbps phải sang slow`);
  const low = await page.$$eval("img[data-image-tier]", (images) => images.length);
  assert.ok(low > 0, `${label}: phải có ảnh tải ở bậc nhẹ`);

  // Đứng ở ảnh bậc nhẹ đầu tiên dưới hero (slide hero ẩn không tính) rồi bỏ giới hạn mạng.
  await page.evaluate(() => [...document.querySelectorAll("img[data-image-tier]")]
    .find((image) => {
      const { top, left, right } = image.getBoundingClientRect();
      return image.complete && image.naturalWidth && top + scrollY > innerHeight && left >= 0 && right <= innerWidth;
    })?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(500);
  // Đánh dấu ảnh bậc nhẹ đang hiện để đọc lại sau khi nâng.
  const before = await page.$$eval("img[data-image-tier]", (images) => images
    .filter((image) => {
      const { top, bottom, left, right } = image.getBoundingClientRect();
      return image.complete && image.naturalWidth && bottom > 0 && top < innerHeight && right > 0 && left < innerWidth;
    })
    .map((image, index) => { image.dataset.tierProbe = String(index); return image.currentSrc; }));
  assert.ok(before.length > 0, `${label}: phải có ảnh bậc nhẹ trong viewport`);
  await cdp.send("Network.emulateNetworkConditions", FAST);
  await page.waitForFunction(() => document.documentElement.dataset.networkTier === "normal", null, { timeout: 15_000 }).catch(() => {});
  assert.equal(await page.evaluate(() => document.documentElement.dataset.networkTier), "normal", `${label}: mạng không giới hạn phải về normal`);
  await page.waitForTimeout(4000);
  const after = await page.$$eval("img[data-tier-probe]", (images) => images.map((image) => ({ index: Number(image.dataset.tierProbe), tier: image.dataset.imageTier || null, src: image.currentSrc })));
  after.forEach(({ index, tier, src }) => {
    assert.equal(tier, null, `${label}: ${before[index]} phải được nâng trong 4 s`);
    assert.ok(variantWidth(src) > variantWidth(before[index]), `${label}: ${before[index]} phải lên file lớn hơn, đang ${src}`);
  });
  const faults = await page.evaluate(() => window.__tierFaults);
  assert.deepEqual(faults, [], `${label}: không được lóe, gỡ settle hay báo lỗi khi nâng`);
  const duplicates = requests.filter((url, index) => requests.indexOf(url) !== index);
  assert.deepEqual(duplicates, [], `${label}: không URL ảnh nào request hai lần`);
  console.log(`PASS ${label}: ${low} ảnh bậc nhẹ, ${before.length} ảnh trong viewport đã nâng`);
  await context.close();
}

// Advertising (R3, R4): card masonry và primary ở bậc nhẹ, nâng khi mạng nhanh lại. Trạng thái slow có sẵn từ lượt trước.
{
  const { context, page, cdp, requests } = await open({ connection: false });
  await context.addInitScript(() => { try { sessionStorage.setItem("tt-network-tier", "slow"); } catch {} });
  await cdp.send("Network.emulateNetworkConditions", SLOW);
  await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelectorAll("[data-project-grid] img.lazyloaded").length >= 4, null, { timeout: 90_000 });
  for (let step = 0; step < 4; step += 1) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(1500);
  }
  const cards = await page.$$eval("[data-project-grid] img.lazyloaded", (images) => images.map((image) => image.currentSrc));
  assert.ok(cards.length > 0 && cards.every((url) => /-240\.\w+$/.test(url)), `card masonry slow phải tải file -240: ${cards.slice(0, 3)}`);
  await cdp.send("Network.emulateNetworkConditions", FAST);
  await page.waitForFunction(() => document.documentElement.dataset.networkTier === "normal", null, { timeout: 15_000 });
  await page.waitForTimeout(4000);
  const visible = await page.$$eval("[data-project-grid] img.lazyloaded", (images) => images
    .filter((image) => { const { top, bottom } = image.getBoundingClientRect(); return bottom > 0 && top < innerHeight; })
    .map((image) => ({ src: image.currentSrc, tier: image.dataset.imageTier || null })));
  assert.ok(visible.length > 0 && visible.every(({ src, tier }) => !tier && !/-240\.\w+$/.test(src)), `card đang hiện phải lên bậc thường: ${JSON.stringify(visible.slice(0, 3))}`);
  assert.deepEqual(await page.evaluate(() => window.__tierFaults), [], "Advertising: không lóe hay báo lỗi khi nâng");
  const duplicates = requests.filter((url, index) => requests.indexOf(url) !== index);
  assert.deepEqual(duplicates, [], "Advertising: không URL ảnh nào request hai lần");
  console.log(`PASS Advertising masonry: ${cards.length} card bậc nhẹ, ${visible.length} card đang hiện đã nâng`);

  // Primary: mở detail khi slow thì tải file -960 hoặc -480, mạng nhanh lại thì lên bản gốc.
  await page.evaluate(() => sessionStorage.setItem("tt-network-tier", "slow"));
  await cdp.send("Network.emulateNetworkConditions", SLOW);
  const href = await page.$eval("[data-project-grid] a[href*='/p/']", (link) => link.href);
  await page.goto(href, { waitUntil: "load" });
  const primary = "[data-advertising-photo-image]";
  await page.waitForFunction((selector) => document.querySelector(selector)?.complete, primary, { timeout: 30_000 });
  const low = await page.$eval(primary, (image) => ({ src: image.getAttribute("src"), tier: image.dataset.imageTier || null }));
  assert.ok(/-(?:480|960)\.\w+$/.test(low.src) && low.tier === "low", `primary slow phải là biến thể nhẹ: ${JSON.stringify(low)}`);
  await cdp.send("Network.emulateNetworkConditions", FAST);
  await page.waitForFunction((selector) => !document.querySelector(selector).dataset.imageTier, primary, { timeout: 15_000 });
  const high = await page.$eval(primary, (image) => image.getAttribute("src"));
  assert.equal(high, low.src.replace(/-(?:480|960)(\.\w+)$/, "$1"), "primary phải lên bản gốc");
  assert.deepEqual(await page.evaluate(() => window.__tierFaults), [], "primary: không lóe hay báo lỗi khi nâng");
  console.log(`PASS Advertising primary: ${low.src} lên ${high}`);
  await context.close();
}

// Mạng nhanh: không ảnh nào xuống bậc nhẹ.
{
  const { context, page } = await open({ connection: true });
  await page.goto(`${base}/vi/residential/`, { waitUntil: "load" });
  for (let step = 0; step < 16; step += 1) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(300);
  }
  assert.equal(await page.evaluate(() => document.documentElement.dataset.networkTier), "normal");
  assert.equal(await page.$$eval("img[data-image-tier]", (images) => images.length), 0, "mạng nhanh không có ảnh bậc nhẹ");
  console.log("PASS mạng nhanh: không ảnh bậc nhẹ");
  await context.close();
}
await browser.close();
