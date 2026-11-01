import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

// Lưu nội dung editor vào D1 local và Worker áp khi phục vụ trang (cms-editor R8, R10). Chạy tay khi `pnpm cms:dev` đang
// mở (cần wrangler, D1 local), không thuộc CI: BASE_URL=http://127.0.0.1:8788 node tests/admin/content-worker.e2e.mjs.
// Test dọn lại D1 (lưu nháp rỗng) khi xong.
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8788";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
const api = (route, method = "GET", body) => page.evaluate(async ([url, verb, payload]) => {
  const response = await fetch(url, { method: verb, headers: { "content-type": "application/json" }, body: payload && JSON.stringify(payload) });
  return { status: response.status, body: await response.json() };
}, [`/api/admin/content/${route}`, method, body]);
const html = (route) => page.evaluate((url) => fetch(url).then((response) => response.text()), route);
const reset = async (route, edits) => api(route, "PUT", { edits, baseUpdatedAt: (await api(route)).body.updatedAt });
const frame = () => page.frames().find((entry) => entry.parentFrame() === page.mainFrame());

try {
  await page.goto(`${baseUrl}/admin/`);
  await reset("residential", {});
  await reset("advertising", { cards: {} });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator(".tree__item", { hasText: "Nhà ở" }).click();
  await page.waitForFunction(() => document.querySelector("iframe[data-cms-preview]")?.contentWindow?.TTCmsOverlay, null, { timeout: 30_000 });

  // Sửa h1 trong editor rồi Lưu: D1 có bản mới, trang VI và EN do Worker phục vụ đổi theo.
  await frame().locator("main h1").first().click();
  const props = page.locator(".panel--props");
  await props.locator("textarea").nth(0).fill("Nhà lưu thật");
  await props.locator("textarea").nth(1).fill("Saved home");
  await page.click("#save");
  await page.waitForFunction(() => document.querySelector("#toast").textContent.startsWith("Đã lưu"));
  assert.match(await page.textContent("#draft-status"), /^Đã lưu/);
  assert.equal(await page.evaluate(() => localStorage.getItem("tt-cms-draft:residential")), null);
  assert.match(await html("/vi/residential/"), /Nhà lưu thật/);
  assert.match(await html("/en/residential/"), /Saved home/);
  assert.doesNotMatch(await html("/vi/residential/"), /data-cms-key/);

  // Title của editor ghi bằng HTMLRewriter (có thoát): chữ đóng thẻ title không thành script trên trang public.
  const homeBase = (await api("home")).body.updatedAt;
  const attack = "</title><script>window.pwned=1</script>";
  assert.equal((await api("home", "PUT", { edits: { text: { title: { vi: attack, en: "Safe title" } } }, baseUpdatedAt: homeBase })).status, 200);
  assert.match(await html("/vi/"), />&lt;\/title&gt;&lt;script&gt;window\.pwned=1&lt;\/script&gt;<\/title>/);
  assert.match(await html("/en/"), />Safe title<\/title>/);
  await page.goto(`${baseUrl}/vi/`);
  assert.equal(await page.evaluate(() => [window.pwned, document.title]).then(([pwned, title]) => pwned === undefined && title), attack);
  await page.goto(`${baseUrl}/admin/`);
  await reset("home", {});
  assert.notEqual(await page.evaluate(() => fetch("/vi/").then((response) => response.headers.get("etag"))), null, "nháp rỗng: giữ ETag file tĩnh");

  // Ghi có điều kiện: PUT dựa trên phiên bản cũ nhận 409, D1 giữ bản đã lưu.
  const stale = await api("residential", "PUT", { edits: {}, baseUpdatedAt: "2000-01-01T00:00:00.000Z" });
  assert.equal(stale.status, 409);
  assert.ok(Object.values((await api("residential")).body.edits.text).some((value) => value.vi === "Nhà lưu thật"));
  assert.equal((await api("residential", "PUT", { edits: { text: { t1: { vi: "", en: "x" } } }, baseUpdatedAt: null })).status, 400);

  // Card Sản phẩm Quảng cáo: Worker chèn catalog đã vá, trang card p/<id> có khối tĩnh mới cho bot.
  const id = "signage-raised-letters-01";
  const etag = await page.evaluate((url) => fetch(url).then((response) => response.headers.get("etag")), `/en/advertising-products/p/${id}/`);
  const card = {
    titleVi: "Card lưu thật", titleEn: "Saved card", descriptionVi: "Mô tả lưu", descriptionEn: "Saved description",
    productIds: ["signage/aluminium-signs-facades"],
    mediaItems: [{ id: `${id}-m1`, kind: "image", src: "/assets/content/projects/home-hero-walnut-bedroom.webp", width: 3072, height: 2048, altVi: "Phòng ngủ", altEn: "Bedroom" }],
    coverMediaId: `${id}-m1`,
  };
  assert.equal((await reset("advertising", { cards: { [id]: card } })).status, 200);
  const cardPage = await html(`/en/advertising-products/p/${id}/`);
  // Trình duyệt đã xem bản trước khi lưu hỏi lại bằng ETag cũ: phải nhận bản mới, không phải 304.
  const revalidated = await page.evaluate(async ([url, tag]) => {
    const response = await fetch(url, { headers: { "if-none-match": tag }, cache: "no-store" });
    return { status: response.status, etag: response.headers.get("etag"), body: await response.text() };
  }, [`/en/advertising-products/p/${id}/`, etag]);
  assert.equal(revalidated.status, 200);
  assert.equal(revalidated.etag, null);
  assert.match(revalidated.body, /Saved card/);
  const residential = await page.evaluate((url) => fetch(url).then((response) => response.headers.get("etag")), "/vi/residential/");
  assert.equal(residential, null, "trang có nội dung editor không giữ ETag của file tĩnh");
  assert.match(cardPage, /<title[^>]*>Saved card — Trường Thịnh/);
  assert.match(cardPage, /data-advertising-card-static><h1[^>]*>Saved card<\/h1><p[^>]*>Saved description<\/p><figure><img src="\/assets\/content\/projects\/home-hero-walnut-bedroom\.webp"/);
  await page.goto(`${baseUrl}/vi/advertising-products/`);
  const patched = await page.evaluate(async (cardId) => (await window.__TT_ADVERTISING_ARTIFACT__).cards.find((entry) => entry.id === cardId), id);
  assert.equal(patched.titleVi, "Card lưu thật");
  assert.equal(patched.media.src, card.mediaItems[0].src);
  await page.waitForSelector("[data-advertising-card]");

  await reset("residential", {});
  await reset("advertising", { cards: {} });
  assert.doesNotMatch(await html("/vi/residential/"), /Nhà lưu thật/);
  assert.deepEqual(errors, []);
  console.log("[content-worker.e2e] PASS");
} finally {
  await browser.close();
}
