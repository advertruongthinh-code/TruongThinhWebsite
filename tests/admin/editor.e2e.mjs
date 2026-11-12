import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

// Main flow of the placeholder editor (cms-editor R1 to R8) on the static preview after `node scripts/cms/build-admin.mjs`:
// select text, edit VI, change size, add a gallery item with an image from Media, draft survives a reload, Save blocks empty cells then reports storage
// is not connected; Media panel filters, detail, dropping an image into the gallery, writing alt (R6); edit an Advertising Products card (R7).
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
// PUT /api/admin/content/ does not exist on the static preview (404) and the local Worker (501): a resource load error there matches the contract.
page.on("console", (message) => message.type() === "error" && !message.location().url?.includes("/api/admin/")
  && errors.push(`${message.text()} ${message.location().url ?? ""}`));

// The Advertising Products preview switches its URL to a real path (replaceState): find the iframe by level, not by URL.
const frame = () => page.frames().find((entry) => entry.parentFrame() === page.mainFrame());
const draft = () => page.evaluate(() => JSON.parse(localStorage.getItem("tt-cms-draft:residential") || "null"));
// Preview ready: the overlay has loaded and the site runtime is running (scroll, text splitting). The local Worker redirects
// `x.html` to `x/` (html_handling), the static server keeps `.html`: compare page names without the extension.
const previewReady = (name) => page.waitForFunction((route) => {
  const win = document.querySelector("iframe[data-cms-preview]")?.contentWindow;
  return win?.location.pathname.replace(/(\.html|\/)$/, "").endsWith(route) && win.TTCmsOverlay && win.__ttMotionRuntimeHealthy;
}, name, { timeout: 20_000 }).then(() => page.waitForTimeout(300));
const props = page.locator(".panel--props");

try {
  // The static server has no directory index for /admin/; the local Worker does.
  await page.goto(`${baseUrl}/admin/index.html`);
  await page.waitForSelector(".dv-tab");
  assert.deepEqual(await page.$$eval(".dv-tab", (tabs) => tabs.map((tab) => tab.textContent.trim()).sort()),
    ["Media", "Nháp", "Thuộc tính", "Trang", "Xem trước"]);
  await page.locator(".tree__item", { hasText: "Nhà ở" }).click();
  await previewReady("/vi/residential");

  // The SEO title lives in <head>: open it from Properties with nothing selected, and the preview's document.title changes immediately.
  await props.getByRole("button", { name: "Tiêu đề trang (SEO)" }).click();
  await props.locator("textarea").first().fill("Nhà ở thử SEO");
  assert.equal(await frame().evaluate(() => document.title), "Nhà ở thử SEO");

  // Select the H1 in the iframe, edit Vietnamese: the iframe changes immediately and the draft is written to localStorage.
  await frame().locator("main h1").first().click();
  await props.locator("textarea").first().fill("Thử CMS nhà ở");
  const key = Object.keys((await draft()).text).find((entry) => entry !== "title");
  assert.ok(key, "draft has the edited text key");
  assert.equal(await frame().locator(`[data-cms-key="${key}"]`).evaluate((node) => node.textContent.trim()), "Thử CMS nhà ở");

  // Change to size A04s: iframe frame 384px, reload so the runtime builds the right breakpoint, the draft text still shows.
  await page.getByRole("button", { name: "A04s 384" }).click();
  assert.equal(await page.$eval("iframe[data-cms-preview]", (node) => node.style.width), "384px");
  await previewReady("/vi/residential");
  assert.equal(await frame().evaluate(() => innerWidth), 384);
  assert.equal(await frame().locator(`[data-cms-key="${key}"]`).evaluate((node) => node.textContent.trim()), "Thử CMS nhà ở");

  // Open the gallery list from an image in the gallery, add an item, pick an image from Media.
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

  // Reload the editor: draft and layout remain, the open page stays as is.
  assert.ok(await page.evaluate(() => localStorage.getItem("tt-cms-layout")));
  await page.reload();
  await previewReady("/vi/residential");
  assert.match(await page.textContent("#draft-status"), /Chưa lưu · 4 thay đổi/);
  assert.equal(await frame().locator(`[data-cms-key="${key}"]`).evaluate((node) => node.textContent.trim()), "Thử CMS nhà ở");

  // The hero list is shuffled by the site on each load: only add and delete, no reorder buttons.
  await frame().evaluate(() => {
    const img = document.querySelector('[data-cms-shuffled] img[data-cms-key]');
    const list = img.closest("[data-cms-list]").dataset.cmsList;
    window.parent.TTEditor.onSelect({ key: img.dataset.cmsKey, kind: "image", list, item: img.closest("[data-cms-item]").dataset.cmsItem });
  });
  await props.getByRole("button", { name: "Mở danh sách" }).click();
  assert.ok((await props.locator(".list-row").count()) > 1);
  assert.equal(await props.getByTitle("Lên").count(), 0);

  // View mode does not let a link take the iframe away from the preview; Reload still returns to the right preview.
  await page.getByRole("button", { name: "Chế độ sửa" }).click();
  await frame().evaluate(() => document.querySelector('a[href="/vi/commercial/"]').click());
  await page.waitForSelector("#toast:not([hidden])");
  await page.waitForTimeout(500);
  assert.match(frame().url(), /\/admin\/preview\/vi\/residential/);
  await page.getByRole("button", { name: "Chế độ xem" }).click();
  await page.getByRole("button", { name: "Tải lại" }).click();
  await previewReady("/vi/residential");

  // Close Preview then reopen it from the Panels menu; reopen the closed Media via "Đổi ảnh".
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

  // Save with a new item whose caption is still empty: block and report the number of empty cells; fill in then Save while storage is not connected: report clearly, draft kept as is.
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

  // Worker responses (R8) faked with page.route: 400 shows an error, connection lost, 409 asks before overwriting (declining keeps
  // the draft). PUT carries the original placeholders of the edited keys (R10).
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
  assert.ok(Object.keys(putBodies[0].anchors).includes(gallery.list), "gallery list marker");
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

  // R6: filter "Chưa dùng", view detail, drag and drop an image into the gallery in the preview: add an item, the image becomes "in use".
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
  // Alt edited in Media is written into the draft of every place that uses the image.
  await page.locator(".media-detail").getByLabel("Alt tiếng Việt").fill("Alt thử từ Media");
  await page.locator(".media-detail").getByRole("button", { name: /Ghi alt vào 1 chỗ dùng/ }).click();
  assert.ok(Object.values((await draft()).image).some((value) => value.src === unusedSrc && value.altVi === "Alt thử từ Media"));

  // R7: Advertising Products page, click a card in the preview, rename (the preview rebuilds from the patched catalog), add media.
  await page.locator(".panel--pages .search").fill("advertising-products");
  await page.locator(".tree__item", { hasText: "Sản phẩm quảng cáo" }).first().click();
  await previewReady("/vi/advertising-products");
  const tileLocator = frame().locator("[data-masonry-card]").first();
  await tileLocator.waitFor();
  const cardId = await tileLocator.getAttribute("data-masonry-card");
  await tileLocator.click();
  await props.getByRole("heading", { name: `Card · ${cardId}` }).waitFor();
  await props.getByLabel("Tên tiếng Việt").fill("Card thử CMS");
  await props.getByLabel("Tên tiếng Việt").blur();
  await previewReady("/vi/advertising-products");
  const patched = await frame().evaluate(async (id) => (await window.__TT_ADVERTISING_ARTIFACT__).cards.find((card) => card.id === id).titleVi, cardId);
  assert.equal(patched, "Card thử CMS");
  // The first card may already be a multi-media card (media-card R7), so count from its current items.
  const itemsBefore = await frame().evaluate(async (id) => (await window.__TT_ADVERTISING_ARTIFACT__).cards.find((card) => card.id === id).mediaItems.length, cardId);
  await props.getByRole("button", { name: "Thêm media" }).click();
  await page.locator(".pick").waitFor();
  await page.locator(".media-tile").first().click();
  const cardDraft = await page.evaluate(() => JSON.parse(localStorage.getItem("tt-cms-draft:advertising")));
  assert.equal(cardDraft.cards[cardId].titleVi, "Card thử CMS");
  assert.equal(cardDraft.cards[cardId].mediaItems.length, itemsBefore + 1);
  assert.match(await page.textContent("#draft-status"), /Chưa lưu · 1 thay đổi/);
  // Card page p/<id>: opening it preselects that card.
  await page.locator(".panel--pages .search").fill(`p/${cardId}`);
  await page.locator(".tree__item", { hasText: cardId }).click();
  await previewReady(`/p/${cardId}`);
  await props.getByRole("heading", { name: `Card · ${cardId}` }).waitFor();
  assert.equal(await props.getByLabel("Tên tiếng Việt").inputValue(), "Card thử CMS");

  // Successful save (fake 200): drop the draft, top bar shows "Đã lưu". Undo to before the save then save again still builds on the version just
  // saved (does not cause a 409 by itself).
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

  // R11: pin a tab, drag a panel to the edge to become an auto-hide strip, click the tab on the strip to slide it out, pin opens it fully, undo the layout.
  await page.click(".topbar__menu summary");
  await page.locator("#panel-menu button", { hasText: "Bố cục mặc định" }).click();
  await page.waitForTimeout(600);
  const tab = (name) => page.locator(".dv-tab", { hasText: name }).first();
  const groupTabs = () => page.evaluate(() => [...document.querySelectorAll(".dv-groupview")].map((group) => (group.classList.contains("dv-edge-collapsed") ? "[strip]" : "")
    + [...group.querySelectorAll(".dv-tab")].map((item) => item.textContent + (item.querySelector(".is-pinned") ? "*" : "")).join(",")));
  await tab("Nháp").click({ button: "right" });
  await page.locator(".dock-menu button", { hasText: "Ghim tab" }).click();
  await page.waitForTimeout(600);
  assert.ok((await groupTabs()).includes("Nháp*,Media"), "the pinned tab leads the group");
  const from = await tab("Media").boundingBox();
  await page.mouse.move(from.x + 10, from.y + 10);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y + 40, { steps: 5 });
  await page.waitForTimeout(100);
  await page.mouse.move(8, 450, { steps: 10 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(600);
  assert.ok((await groupTabs()).includes("[strip]Media"), "dragging to the edge creates a collapsed strip");
  await tab("Media").click();
  await page.locator(".dock-peek .panel--media").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".dock-peek").isHidden(), true);
  await tab("Media").click();
  await page.locator(".dock-peek__button", { hasText: "Ghim" }).click();
  await page.waitForTimeout(600);
  assert.ok((await groupTabs()).includes("Media"), "pin fully opens the edge group");
  for (let step = 0; step < 3; step += 1) {
    await page.keyboard.press("Control+Alt+z");
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(600);
  assert.ok((await groupTabs()).includes("Media,Nháp"), "undo returns to the default layout");
  assert.equal(await page.locator(".dv-edge-group").count(), 0);

  assert.deepEqual(errors, []);
  console.log("[editor.e2e] PASS");
} finally {
  await browser.close();
}
