import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// docs/specs/scroll-feel.md R6: autoscroll chuột giữa kiểu Chrome khi Locomotive chạy.
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/middle-autoscroll.e2e.mjs
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

const open = async (options) => {
  const page = await browser.newPage(options);
  await page.goto(`${baseUrl}/vi/`, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
  // Chờ ảnh và section lười tải xong để giới hạn cuộn của Locomotive đã đủ dài.
  await page.waitForTimeout(2000);
  return page;
};
const scrollY = (page) => page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());
const origin = (page) => page.locator(".autoscroll-origin").count();
// Điểm trống giữa màn hình: không nằm trong link, nút, ô nhập liệu.
const blank = (page) => page.evaluate(() => {
  for (let y = 300; y < 800; y += 20) for (let x = 200; x < 1200; x += 40) {
    const element = document.elementFromPoint(x, y);
    if (element && !element.closest("a[href], button, input, textarea, select, label, dialog, [contenteditable]")) return { x, y };
  }
  return null;
});
const rest = async (page) => {
  let previous = await scrollY(page);
  for (;;) {
    await page.waitForTimeout(250);
    const current = await scrollY(page);
    if (Math.abs(current - previous) < 1) return current;
    previous = current;
  }
};

try {
  const page = await open({ viewport: { width: 1440, height: 900 } });
  const point = await blank(page);
  assert.ok(point, "a blank point exists on the home page");

  // Chế độ dính: nhả ngay, chuột dưới gốc 216px thì cuộn khoảng 1200px mỗi giây.
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: "middle" });
  await page.mouse.up({ button: "middle" });
  assert.equal(await origin(page), 1, "sticky press shows the origin icon");
  await page.mouse.move(point.x, point.y + 216);
  await page.waitForTimeout(600);
  const before = await scrollY(page);
  await page.waitForTimeout(1000);
  const speed = (await scrollY(page)) - before;
  assert.ok(speed > 1080 && speed < 1320, `sticky speed about 1200px/s, got ${speed}`);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.autoscroll), "down", "cursor points down");

  // Lăn chuột thì dừng: biểu tượng mất, trang đứng sau quán tính.
  await page.mouse.wheel(0, 1);
  await page.waitForTimeout(100);
  assert.equal(await origin(page), 0, "wheel removes the origin icon");
  const stopped = await rest(page);
  await page.waitForTimeout(500);
  assert.ok(Math.abs((await scrollY(page)) - stopped) < 1, "page stays still after a wheel stop");
  console.log(`PASS sticky ${Math.round(speed)}px/s, wheel stop`);

  // Nhấn giữ kéo lên rồi nhả: cuộn lên trong lúc giữ, dừng khi nhả.
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(point.x, point.y - 116, { steps: 4 });
  await page.waitForTimeout(800);
  const held = await scrollY(page);
  assert.ok(held < stopped - 200, `hold-drag scrolls up, ${stopped} -> ${held}`);
  await page.mouse.up({ button: "middle" });
  assert.equal(await origin(page), 0, "releasing after a drag stops");
  console.log("PASS hold-drag");

  // Dừng bằng nút chuột trái (không kích hoạt gì bên dưới) và bằng phím.
  const url = page.url();
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: "middle" });
  await page.mouse.up({ button: "middle" });
  await page.mouse.click(point.x, point.y);
  assert.equal(await origin(page), 0, "left click stops");
  assert.equal(page.url(), url, "the stopping click does not navigate");
  await page.mouse.down({ button: "middle" });
  await page.mouse.up({ button: "middle" });
  await page.keyboard.press("Shift");
  assert.equal(await origin(page), 0, "a key press stops");
  console.log("PASS click and key stop");

  // Chuột giữa lên link không bắt đầu; cuộn logic bị khóa (viewer, menu) cũng không.
  await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
  const link = await page.locator("a[href]:visible").first().boundingBox();
  await page.mouse.move(link.x + link.width / 2, link.y + link.height / 2);
  await page.mouse.down({ button: "middle" });
  assert.equal(await origin(page), 0, "middle press on a link keeps the browser default");
  await page.mouse.up({ button: "middle" });
  await page.evaluate(() => window.TruongThinhMotion.lockLogicalScroll());
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: "middle" });
  await page.mouse.up({ button: "middle" });
  assert.equal(await origin(page), 0, "locked scroll does not start");
  await page.evaluate(() => window.TruongThinhMotion.unlockLogicalScroll());
  console.log("PASS link and lock");

  // Dưới 981px và khi giảm chuyển động trang cuộn native, không tự làm autoscroll.
  for (const options of [{ viewport: { width: 390, height: 844 } }, { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }]) {
    const other = await open(options);
    const spot = await blank(other) || { x: 100, y: 400 };
    await other.mouse.move(spot.x, spot.y);
    await other.mouse.down({ button: "middle" });
    await other.mouse.up({ button: "middle" });
    assert.equal(await origin(other), 0, `no custom autoscroll for ${JSON.stringify(options)}`);
    await other.close();
  }
  console.log("PASS native fallback");
} finally {
  await browser.close();
}
