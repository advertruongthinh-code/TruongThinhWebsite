import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

// Luồng chính của editor placeholder (cms-editor R1 đến R8) trên preview tĩnh sau `node scripts/cms/build-admin.mjs`:
// chọn chữ, sửa VI, đổi cỡ, thêm mục gallery bằng ảnh từ Media, nháp còn sau khi tải lại, Lưu chặn ô trống rồi báo chưa
// nối lưu trữ; panel Media lọc, chi tiết, thả ảnh vào gallery, ghi alt (R6); sửa card Sản phẩm Quảng cáo (R7).
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
// PUT /api/admin/content/ chưa có ở preview tĩnh (404) và Worker local (501): lỗi tải resource đó là đúng hợp đồng.
page.on("console", (message) => message.type() === "error" && !message.location().url?.includes("/api/admin/")
  && errors.push(`${message.text()} ${message.location().url ?? ""}`));

// Bản xem trước Sản phẩm Quảng cáo đổi URL sang path thật (replaceState): tìm iframe theo cấp, không theo URL.
const frame = () => page.frames().find((entry) => entry.parentFrame() === page.mainFrame());
const draft = () => page.evaluate(() => JSON.parse(localStorage.getItem("tt-cms-draft:residential") || "null"));
// Bản xem trước sẵn sàng: overlay đã nạp và runtime site đã chạy (cuộn, tách chữ). Worker local chuyển
// `x.html` sang `x/` (html_handling), static server giữ `.html`: so tên trang không kèm đuôi.
const previewReady = (name) => page.waitForFunction((route) => {
  const win = document.querySelector("iframe[data-cms-preview]")?.contentWindow;
  return win?.location.pathname.replace(/(\.html|\/)$/, "").endsWith(route) && win.TTCmsOverlay && win.__ttMotionRuntimeHealthy;
}, name, { timeout: 20_000 }).then(() => page.waitForTimeout(300));
const props = page.locator(".panel--props");

try {
  // Static server không có index thư mục cho /admin/; Worker local thì có.
  await page.goto(`${baseUrl}/admin/index.html`);
  await page.waitForSelector(".dv-tab");
  assert.deepEqual(await page.$$eval(".dv-tab", (tabs) => tabs.map((tab) => tab.textContent.trim()).sort()),
    ["Media", "Nháp", "Thuộc tính", "Trang", "Xem trước"]);
  await page.locator(".tree__item", { hasText: "Nhà ở" }).click();
  await previewReady("/vi/residential");

  // Tiêu đề SEO nằm trong <head>: mở từ Thuộc tính khi chưa chọn gì, đổi document.title của preview ngay.
  await props.getByRole("button", { name: "Tiêu đề trang (SEO)" }).click();
  await props.locator("textarea").first().fill("Nhà ở thử SEO");
  assert.equal(await frame().evaluate(() => document.title), "Nhà ở thử SEO");

  // Chọn H1 trong iframe, sửa tiếng Việt: iframe đổi ngay, nháp ghi vào localStorage.
  await frame().locator("main h1").first().click();
  await props.locator("textarea").first().fill("Thử CMS nhà ở");
  const key = Object.keys((await draft()).text).find((entry) => entry !== "title");
  assert.ok(key, "draft has the edited text key");
  assert.equal(await frame().locator(`[data-cms-key="${key}"]`).evaluate((node) => node.textContent.trim()), "Thử CMS nhà ở");

  // Đổi cỡ A04s: khung iframe 384px, tải lại để runtime dựng đúng breakpoint, chữ nháp vẫn hiện.
  await page.getByRole("button", { name: "A04s 384" }).click();
  assert.equal(await page.$eval("iframe[data-cms-preview]", (node) => node.style.width), "384px");
  await previewReady("/vi/residential");
  assert.equal(await frame().evaluate(() => innerWidth), 384);
  assert.equal(await frame().locator(`[data-cms-key="${key}"]`).evaluate((node) => node.textContent.trim()), "Thử CMS nhà ở");

  // Mở danh sách gallery từ một ảnh trong gallery, thêm mục, chọn ảnh từ Media.
  const gallery = await frame().evaluate(() => {
    const img = document.querySelector('[data-cms-list] .detail-gallery__item img[data-cms-key]');
    const list = img.closest("[data-cms-list]");
    window.parent.TTEditor.onSelect({ key: img.dataset.cmsKey, kind: "image", list: list.dataset.cmsList, item: img.closest("[data-cms-item]").dataset.cmsItem });
    return { list: list.dataset.cmsList, count: list.querySelectorAll(":scope > .detail-gallery__item").length };
  });
  await props.getByRole("button", { name: "Mở danh sách" }).click();
  assert.equal(await props.locator(".list-row").count(), gallery.count);
  await props.getByRole("button", { name: "Thêm mục" }).click();
  await page.locator(".pick").waitFor();
  const tile = page.locator(".media-tile").first();
  const src = (await tile.getAttribute("title")).split("\n")[0];
  await tile.click();
  await previewReady("/vi/residential");
  const saved = await draft();
  assert.equal(saved.list[gallery.list].length, gallery.count + 1);
  const added = await frame().evaluate((list) => {
    const items = document.querySelectorAll(`[data-cms-list="${list}"] > .detail-gallery__item`);
    return { count: items.length, src: items[items.length - 1].querySelector("img").getAttribute("data-src") || items[items.length - 1].querySelector("img").getAttribute("src") };
  }, gallery.list);
  assert.deepEqual(added, { count: gallery.count + 1, src });

  // Tải lại editor: nháp và bố cục còn, trang đang mở giữ nguyên.
  assert.ok(await page.evaluate(() => localStorage.getItem("tt-cms-layout")));
  await page.reload();
  await previewReady("/vi/residential");
  assert.match(await page.textContent("#draft-status"), /Chưa lưu · 4 thay đổi/);
  assert.equal(await frame().locator(`[data-cms-key="${key}"]`).evaluate((node) => node.textContent.trim()), "Thử CMS nhà ở");

  // Danh sách hero bị site xáo mỗi lần tải: chỉ thêm, xóa, không có nút sắp xếp.
  await frame().evaluate(() => {
    const img = document.querySelector('[data-cms-shuffled] img[data-cms-key]');
    const list = img.closest("[data-cms-list]").dataset.cmsList;
    window.parent.TTEditor.onSelect({ key: img.dataset.cmsKey, kind: "image", list, item: img.closest("[data-cms-item]").dataset.cmsItem });
  });
  await props.getByRole("button", { name: "Mở danh sách" }).click();
  assert.ok((await props.locator(".list-row").count()) > 1);
  assert.equal(await props.getByTitle("Lên").count(), 0);

  // Chế độ xem không cho link đưa iframe rời bản xem trước; Tải lại vẫn về đúng bản xem trước.
  await page.getByRole("button", { name: "Chế độ sửa" }).click();
  await frame().evaluate(() => document.querySelector('a[href="/vi/commercial/"]').click());
  await page.waitForSelector("#toast:not([hidden])");
  await page.waitForTimeout(500);
  assert.match(frame().url(), /\/admin\/preview\/vi\/residential/);
  await page.getByRole("button", { name: "Chế độ xem" }).click();
  await page.getByRole("button", { name: "Tải lại" }).click();
  await previewReady("/vi/residential");

  // Đóng Xem trước rồi mở lại từ menu Bảng; mở lại Media đã đóng qua "Đổi ảnh".
  await page.locator(".dv-tab", { hasText: "Xem trước" }).locator(".dv-default-tab-action").click();
  await page.locator(".dv-tab", { hasText: "Media" }).locator(".dv-default-tab-action").click();
  await page.locator(".topbar__menu > summary").click();
  await page.locator("#panel-menu").getByRole("button", { name: "Xem trước" }).click();
  await previewReady("/vi/residential");
  await frame().locator(`[data-cms-key="${key}"]`).click();
  await frame().evaluate(() => {
    const img = document.querySelector("main img[data-cms-key]");
    window.parent.TTEditor.onSelect({ key: img.dataset.cmsKey, kind: "image", list: null, item: null });
  });
  await props.getByRole("button", { name: "Đổi ảnh" }).click();
  await page.locator(".pick").waitFor();
  await page.keyboard.press("Escape");

  // Lưu khi mục mới còn chú thích trống: chặn và báo số ô trống; nhập đủ rồi Lưu khi chưa nối lưu trữ: báo rõ, nháp giữ nguyên.
  await page.click("#save");
  await page.waitForFunction(() => document.querySelector("#toast").textContent.startsWith("Còn 1 ô trống"));
  await frame().evaluate((list) => {
    const item = [...document.querySelectorAll(`[data-cms-list="${list}"] > [data-cms-item]`)].at(-1);
    const node = item.querySelector("[data-cms-key]:not(img)");
    window.parent.TTEditor.onSelect({ kind: "text", key: node.dataset.cmsKey, list, item: item.dataset.cmsItem });
  }, gallery.list);
  await props.locator("textarea").nth(0).fill("Chú thích mới");
  await props.locator("textarea").nth(1).fill("New caption");
  await page.click("#save");
  await page.waitForFunction(() => document.querySelector("#toast").textContent.startsWith("Chưa nối"));
  assert.equal(await page.textContent("#toast"), "Chưa nối lưu trữ, nháp vẫn ở máy này.");
  assert.ok(await draft());

  // Phản hồi của Worker (R8) giả bằng page.route: 400 hiện lỗi, mất kết nối, 409 hỏi trước khi ghi đè (từ chối thì giữ
  // nháp). PUT gửi kèm dấu chỗ gốc của khóa đã sửa (R10).
  const toastStarts = (prefix) => page.waitForFunction((text) => document.querySelector("#toast").textContent.startsWith(text), prefix);
  const putBodies = [];
  const respond = async (route, reply) => {
    putBodies.push(route.request().postDataJSON());
    await page.evaluate(() => (document.querySelector("#toast").textContent = ""));
    return reply(route);
  };
  await page.route("**/api/admin/content/residential", (route) => respond(route, (entry) => entry.fulfill({ status: 400, json: { error: "Trang vừa cập nhật" } })));
  await page.click("#save");
  await toastStarts("Lưu chưa được: Trang vừa cập nhật");
  assert.ok(Object.keys(putBodies[0].anchors).includes(gallery.list), "dấu danh sách gallery");
  await page.unroute("**/api/admin/content/residential");
  await page.route("**/api/admin/content/residential", (route) => respond(route, (entry) => entry.abort()));
  await page.click("#save");
  await toastStarts("Lưu chưa được (mất kết nối)");
  await page.unroute("**/api/admin/content/residential");
  await page.route("**/api/admin/content/residential", (route) => respond(route, (entry) => entry.fulfill({ status: 409, json: { updatedAt: "2026-11-01T00:00:00.000Z", updatedBy: "nv@truongthinh.vn" } })));
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.click("#save");
  await toastStarts("Chưa lưu. Xuất JSON");
  await page.unroute("**/api/admin/content/residential");
  assert.ok(await draft());

  // R6: lọc "Chưa dùng", xem chi tiết, kéo thả ảnh vào gallery trong xem trước: thêm mục, ảnh thành "đang dùng".
  await page.locator(".dv-tab", { hasText: "Media" }).click();
  await page.locator(".panel--media select").nth(1).selectOption("unused");
  const unused = page.locator(".media-tile", { hasText: "Chưa dùng" }).first();
  const unusedSrc = (await unused.getAttribute("title")).split("\n")[0];
  await unused.click();
  await page.locator(".media-detail", { hasText: "Chưa dùng ở đâu" }).waitFor();
  const target = await frame().evaluate((list) => {
    const img = document.querySelector(`[data-cms-list="${list}"] img[data-cms-key]`);
    window.TTCmsOverlay.select(img.dataset.cmsKey);
    return img.dataset.cmsKey;
  }, gallery.list);
  await page.waitForTimeout(400);
  const before = (await draft()).list[gallery.list].length;
  await frame().evaluate(({ key, src }) => {
    const rect = document.querySelector(`[data-cms-key="${key}"]`).getBoundingClientRect();
    const data = new DataTransfer();
    data.setData("application/x-tt-media", src);
    const point = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
    document.elementFromPoint(point.clientX, point.clientY).dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: data, ...point }));
  }, { key: target, src: unusedSrc });
  await previewReady("/vi/residential");
  const dropped = await draft();
  assert.equal(dropped.list[gallery.list].length, before + 1);
  assert.ok(Object.entries(dropped.image).some(([entry, value]) => entry.includes("@") && value.src === unusedSrc), "dropped media lands in a new gallery item");
  await page.locator(".panel--media select").nth(1).selectOption("used");
  await page.locator(".media-tile", { hasText: unusedSrc.split("/").pop() }).first().click();
  await page.locator(".media-detail .uses button", { hasText: "Nhà ở" }).first().waitFor();
  // Alt sửa ở Media ghi vào nháp của mọi chỗ dùng ảnh đó.
  await page.locator(".media-detail").getByLabel("Alt tiếng Việt").fill("Alt thử từ Media");
  await page.locator(".media-detail").getByRole("button", { name: /Ghi alt vào 1 chỗ dùng/ }).click();
  assert.ok(Object.values((await draft()).image).some((value) => value.src === unusedSrc && value.altVi === "Alt thử từ Media"));

  // R7: trang Sản phẩm Quảng cáo, bấm card trong xem trước, đổi tên (xem trước dựng lại từ catalog đã vá), thêm media.
  await page.locator(".panel--pages .search").fill("advertising-products");
  await page.locator(".tree__item", { hasText: "Sản phẩm quảng cáo" }).first().click();
  await previewReady("/vi/advertising-products");
  const tileLocator = frame().locator("[data-advertising-card]").first();
  await tileLocator.waitFor();
  const cardId = await tileLocator.getAttribute("data-advertising-card");
  await tileLocator.click();
  await props.getByRole("heading", { name: `Card · ${cardId}` }).waitFor();
  await props.getByLabel("Tên tiếng Việt").fill("Card thử CMS");
  await props.getByLabel("Tên tiếng Việt").blur();
  await previewReady("/vi/advertising-products");
  const patched = await frame().evaluate(async (id) => (await window.__TT_ADVERTISING_ARTIFACT__).cards.find((card) => card.id === id).titleVi, cardId);
  assert.equal(patched, "Card thử CMS");
  await props.getByRole("button", { name: "Thêm media" }).click();
  await page.locator(".pick").waitFor();
  await page.locator(".media-tile").first().click();
  const cardDraft = await page.evaluate(() => JSON.parse(localStorage.getItem("tt-cms-draft:advertising")));
  assert.equal(cardDraft.cards[cardId].titleVi, "Card thử CMS");
  assert.equal(cardDraft.cards[cardId].mediaItems.length, 2);
  assert.match(await page.textContent("#draft-status"), /Chưa lưu · 1 thay đổi/);
  // Trang card p/<id>: mở là chọn sẵn card đó.
  await page.locator(".panel--pages .search").fill(`p/${cardId}`);
  await page.locator(".tree__item", { hasText: cardId }).click();
  await previewReady(`/p/${cardId}`);
  await props.getByRole("heading", { name: `Card · ${cardId}` }).waitFor();
  assert.equal(await props.getByLabel("Tên tiếng Việt").inputValue(), "Card thử CMS");

  // Lưu thành công (200 giả): bỏ nháp, thanh trên "Đã lưu". Hoàn tác về trước lúc Lưu rồi lưu lại vẫn dựa phiên bản vừa
  // lưu (không tự gây 409).
  await props.getByLabel("Tên tiếng Việt").fill("Card thử CMS lần hai");
  await props.getByLabel("Tên tiếng Việt").blur();
  await page.route("**/api/admin/content/advertising", (route) => respond(route, (entry) => entry.fulfill({ status: 200, json: { updatedAt: "2026-11-01T01:00:00.000Z", updatedBy: "admin@localhost" } })));
  await page.click("#save");
  await toastStarts("Đã lưu");
  assert.match(await page.textContent("#draft-status"), /^Đã lưu/);
  assert.equal(await page.evaluate(() => localStorage.getItem("tt-cms-draft:advertising")), null);
  for (let step = 0; step < 4 && !/Chưa lưu/.test(await page.textContent("#draft-status")); step += 1) await page.click("#undo");
  assert.match(await page.textContent("#draft-status"), /Chưa lưu/);
  await page.click("#save");
  await toastStarts("Đã lưu");
  assert.equal(putBodies.at(-1).baseUpdatedAt, "2026-11-01T01:00:00.000Z");

  assert.deepEqual(errors, []);
  console.log("[editor.e2e] PASS");
} finally {
  await browser.close();
}
