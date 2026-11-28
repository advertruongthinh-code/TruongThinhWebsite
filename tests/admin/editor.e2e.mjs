import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";

// Editor frame and Content panel (cms-editor R1, R2, cms-dock R1 to R4, CMS plan E12) on the local admin Worker with a
// D1 seeded from the repo: run after `pnpm prepare:site && node scripts/cms/build-admin.mjs`. The Worker and its D1 live
// in their own .wrangler/e2e-* folder, so the run never touches `pnpm cms:dev` data.
// The local Worker signs everyone in as owner (CMS_LOCAL_ADMIN_EMAIL), so the staff case answers whoami as staff in the page.
const CONFIG = "scripts/cms/wrangler.local.toml";
const persist = path.resolve(`.wrangler/e2e-${process.pid}`);
const shots = process.env.SHOTS; // optional folder for 1440px screenshots
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");

const wrangler = (...args) => {
  const result = spawnSync("pnpm", ["-s", "demo:wrangler", ...args, "--config", CONFIG, "--persist-to", persist], { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error(`wrangler ${args.join(" ")} failed`);
};
const port = await new Promise((resolve) => {
  const server = createServer().listen(0, "127.0.0.1", () => {
    const { port: free } = server.address();
    server.close(() => resolve(free));
  });
});
const baseUrl = `http://127.0.0.1:${port}`;

mkdirSync(".tmp/cms", { recursive: true });
spawnSync("node", ["scripts/cms/seed.mjs", "--out", ".tmp/cms/e2e-seed.sql"], { stdio: "inherit" });
wrangler("d1", "migrations", "apply", "DB", "--local");
wrangler("d1", "execute", "DB", "--local", "--file", ".tmp/cms/e2e-seed.sql");
const worker = spawn("pnpm", ["-s", "demo:wrangler", "dev", "--config", CONFIG, "--persist-to", persist, "--ip", "127.0.0.1", "--port", String(port)],
  { stdio: ["ignore", "ignore", "inherit"], shell: process.platform === "win32", detached: process.platform !== "win32" });
for (let i = 0; !(await fetch(`${baseUrl}/api/admin/whoami`).then((r) => r.ok, () => false)); i++) {
  if (i > 60) throw new Error(`local Worker did not start on ${baseUrl}`);
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

const { chromium } = await import("playwright");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const errors = [];

async function open({ width = 1440, height = 900, screen = { width, height }, touch = false, routes = {}, colorScheme = "light" } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, screen, colorScheme, hasTouch: touch, isMobile: touch });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(String(error)));
  for (const [command, answer] of Object.entries(routes)) await page.route(`**/api/admin/${command}*`, answer);
  await page.goto(`${baseUrl}/`);
  return page;
}
const shot = (page, name) => shots && page.screenshot({ path: path.join(shots, `${name}.png`) });
const rowNames = (page, group) => page.locator(`.group[data-group="${group}"] .row__name`).allTextContents();
const api = async (page, command, body) => (await page.request.fetch(`${baseUrl}/api/admin/${command}`, body
  ? { method: "POST", data: body, headers: { Origin: baseUrl } } : {})).json();

try {
  // (a) First open: three panels by the default layout, Trang chủ open, owner sees Tài khoản in the Bảng menu.
  let page = await open();
  await page.locator('.group[data-group="projects"] .row').first().waitFor();
  // The editor is the cms root; an old /admin/ link lands there too.
  const old = await page.request.fetch(`${baseUrl}/admin/`, { maxRedirects: 0 });
  assert.equal(old.status(), 301);
  assert.equal(new URL(old.headers().location, baseUrl).pathname, "/");
  assert.deepEqual(await page.$$eval(".dv-tab", (tabs) => tabs.map((tab) => tab.textContent.trim())), ["Nội dung", "Xem trước", "Thuộc tính", "Media", "Nháp"]);
  const width = (name) => page.locator(".dv-groupview", { has: page.locator(".dv-tab", { hasText: name }) }).evaluate((node) => Math.round(node.getBoundingClientRect().width));
  assert.equal(await width("Nội dung"), 280);
  assert.equal(await width("Thuộc tính"), 380);
  assert.equal(await page.textContent("#record-name"), "Trang chủ");
  assert.equal(await page.textContent("#record-status"), "Đã đăng");
  assert.deepEqual(await rowNames(page, "pages"), ["Trang chủ", "Nhà ở", "Kinh doanh", "Giới thiệu"]);
  await page.click(".topbar__menu > summary");
  assert.ok(await page.locator("#panel-menu button", { hasText: "Tài khoản" }).isVisible());
  await page.keyboard.press("Escape");
  await shot(page, "1-mac-dinh");

  // (c) R2 Gherkin: one News without description.en; filter "Thiếu EN" shows only it with the label.
  const news = (await api(page, "list?type=news")).items[0];
  const got = await api(page, `get?type=news&id=${news.id}`);
  await api(page, "save", { type: "news", id: news.id, version: got.version, data: { ...got.data, description: { ...got.data.description, en: "" } } });
  await page.reload();
  await page.locator('.group[data-group="news"] .row').first().waitFor();
  await page.locator(".seg", { hasText: "Thiếu EN" }).click();
  assert.deepEqual(await rowNames(page, "news"), [news.name]);
  assert.deepEqual(await rowNames(page, "projects"), []);
  assert.equal(await page.locator('.group[data-group="news"] .badge').allTextContents().then((labels) => labels.join(",")), "Thiếu EN");
  await shot(page, "2-loc-thieu-en");
  await page.locator(".seg", { hasText: "Tất cả" }).click();

  // Search ignores Vietnamese marks.
  await page.getByLabel("Tìm theo tên").fill("go soi");
  assert.deepEqual(await rowNames(page, "projects"), ["Căn hộ gỗ sồi ấm"]);
  await page.getByLabel("Tìm theo tên").fill("");

  // Create a News post: id and slug come from the name; it opens as Nháp. The same name again is a 409 that keeps the dialog.
  const create = async (name) => {
    await page.locator('.group[data-group="news"] .group__create').click();
    const dialog = page.locator("dialog.dialog");
    await dialog.getByLabel("Tên tiếng Việt").fill(name);
    await dialog.getByLabel("Nhóm").selectOption("nha-o");
    return dialog;
  };
  let dialog = await create("Chọn màu gỗ cho phòng ngủ");
  assert.equal(await dialog.getByLabel("Định danh").inputValue(), "chon-mau-go-cho-phong-ngu");
  assert.equal(await dialog.getByLabel("Link tiếng Việt").inputValue(), "chon-mau-go-cho-phong-ngu");
  await shot(page, "3-tao-bai");
  await dialog.getByRole("button", { name: "Tạo" }).click();
  await page.waitForFunction(() => document.querySelector("#record-name").textContent === "Chọn màu gỗ cho phòng ngủ");
  assert.equal(await page.textContent("#record-status"), "Nháp");
  const created = page.locator('.group[data-group="news"] .row[aria-current="true"]');
  assert.equal(await created.locator(".row__name").textContent(), "Chọn màu gỗ cho phòng ngủ");
  assert.match(await created.locator(".row__line").textContent(), /Nháp/);
  assert.equal(await page.locator("dialog.dialog").count(), 0);
  dialog = await create("Chọn màu gỗ cho phòng ngủ");
  await dialog.getByRole("button", { name: "Tạo" }).click();
  await dialog.getByText("Tên định danh này đã có, đổi tên khác.").waitFor();
  assert.equal(await dialog.getByLabel("Tên tiếng Việt").inputValue(), "Chọn màu gỗ cho phòng ngủ");
  // An id typed by hand that breaks the pattern greys out Tạo and says why.
  await dialog.getByLabel("Định danh").fill("Sai Mau");
  assert.equal(await dialog.getByRole("button", { name: "Tạo" }).isDisabled(), true);
  await dialog.getByText("Định danh chỉ gồm chữ thường không dấu").waitFor();
  await dialog.getByRole("button", { name: "Hủy" }).click();

  // A name with markup stays text (no innerHTML with server strings).
  await page.locator('.group[data-group="projects"] .group__create').click();
  dialog = page.locator("dialog.dialog");
  await dialog.getByLabel("Tên tiếng Việt").fill('<img src=x onerror="window.__xss=1">Bếp');
  await dialog.getByRole("button", { name: "Tạo" }).click();
  await page.waitForFunction(() => document.querySelector("#record-name").textContent.endsWith("Bếp"));
  assert.ok((await rowNames(page, "projects")).includes('<img src=x onerror="window.__xss=1">Bếp'));
  assert.equal(await page.evaluate(() => window.__xss), undefined);

  // (d) Drag the second project above the first, move another with the keyboard, reload: the order stays.
  const before = await rowNames(page, "projects");
  const rows = page.locator('.group[data-group="projects"] .row');
  await rows.nth(1).dragTo(rows.nth(0), { targetPosition: { x: 40, y: 4 } });
  await page.waitForResponse((response) => response.url().includes("/api/admin/reorder"));
  const dragged = [before[1], before[0], ...before.slice(2)];
  assert.deepEqual(await rowNames(page, "projects"), dragged);
  await rows.nth(2).focus();
  await page.keyboard.press("Alt+ArrowDown");
  await page.waitForResponse((response) => response.url().includes("/api/admin/reorder"));
  const moved = [...dragged.slice(0, 2), dragged[3], dragged[2], ...dragged.slice(4)];
  await page.reload();
  await page.locator('.group[data-group="projects"] .row').first().waitFor();
  assert.deepEqual(await rowNames(page, "projects"), moved);
  // The record opened last opens again.
  assert.match(await page.textContent("#record-name"), /Bếp$/);
  // A filter turns dragging off.
  await page.locator(".seg", { hasText: "Nháp" }).click();
  assert.equal(await page.locator('.group[data-group="projects"] .row[draggable="true"]').count(), 0);
  await page.locator(".seg", { hasText: "Tất cả" }).click();

  // Cards by cluster then product: a product opens its own cards.
  await page.locator('.group[data-group="cards"] .group__toggle').click();
  const product = page.locator(".sub--product .sub__toggle").first();
  await product.waitFor();
  await product.click();
  assert.ok(await page.locator(".sub--product .row").count() > 0);
  await shot(page, "4-card");

  // Context menu: "Mở trên staging" links the published record on staging; a draft has it greyed out.
  const project = page.locator('.group[data-group="projects"] .row', { hasText: "Căn hộ gỗ sồi ấm" });
  await project.click({ button: "right" });
  assert.equal(await page.locator(".ctx-menu a").getAttribute("href"), "https://staging.truongthinhads.vn/projects/can-ho-go-soi-am/");
  await page.keyboard.press("Escape");
  await page.locator('.group[data-group="news"] .row', { hasText: "Chọn màu gỗ" }).focus();
  await page.keyboard.press("Shift+F10");
  assert.equal(await page.locator(".ctx-menu button", { hasText: "Mở trên staging" }).isDisabled(), true);
  await page.keyboard.press("Escape");

  // (E12 carry-over) A new Advertising card opens as Nháp; it needs a product, which the dialog preselects.
  await page.locator('.group[data-group="cards"] .group__create').click();
  dialog = page.locator("dialog.dialog");
  await dialog.getByLabel("Tên tiếng Việt").fill("Biển hiệu thử E13");
  await dialog.getByRole("button", { name: "Tạo" }).click();
  await page.waitForFunction(() => document.querySelector("#record-name").textContent === "Biển hiệu thử E13");
  assert.equal(await page.textContent("#record-status"), "Nháp");

  // (E13) R3, R4, R8 on a seeded News post.
  const post = (await api(page, "list?type=news")).items[1];
  // Two new photos (a 1x1 PNG claimed as 1500x1000), so no other page already uses them (one photo, one page).
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const upload = async (name) => (await page.request.fetch(`${baseUrl}/api/admin/upload-media?slugBase=${name}&width=1500&height=1000&altVi=${encodeURIComponent(`Ảnh ${name}`)}&altEn=${name}`,
    { method: "POST", data: png, headers: { "Content-Type": "image/png", Origin: baseUrl } })).json();
  const free = [(await upload("anh-thu-mot")).id, (await upload("anh-thu-hai")).id];
  assert.ok(free.every(Boolean), "uploads gave ids");
  await page.locator('.group[data-group="news"] .row', { hasText: post.name }).click();
  await page.waitForFunction((name) => document.querySelector("#record-name").textContent === name, post.name);
  const frame = page.frameLocator(".preview__frame");
  await frame.locator("h1").first().waitFor();
  assert.deepEqual(await page.locator(".preview__bar .segs").first().locator(".seg").allTextContents(), ["384", "768", "1024", "1280", "1440", "1920"]);
  const tabs = (name) => page.locator(".props__tabs button", { hasText: name });
  const blocks = () => frame.locator("[data-block-index]").count();
  // The site's own reveal motion finishes within a second; screenshots wait for it.
  const settle = async () => {
    await frame.locator("h1").first().waitFor();
    await page.waitForTimeout(1200);
  };

  // R3 Gherkin: a title typed before the switch to 384 is still in the reloaded preview, unsaved, and the iframe is 384px wide.
  await page.locator('[data-field="title"] input').first().fill("Tiêu đề thử E13");
  await page.locator(".preview__bar .seg", { hasText: "384" }).click();
  await page.waitForFunction(() => document.querySelector(".preview__frame")?.offsetWidth === 384);
  await frame.locator("h1", { hasText: "Tiêu đề thử E13" }).waitFor();
  await shot(page, "6-moc-384");
  assert.equal(await page.textContent("#record-unsaved"), "Chưa lưu · 1 thay đổi");
  assert.ok(await page.evaluate((id) => localStorage.getItem(`tt-cms-draft:news:${id}`), post.id));
  await page.locator(".preview__bar .seg", { hasText: "1440" }).click();
  // A click on a block selects it on the preview and opens its text fields.
  await frame.locator("[data-block-index]").first().click();
  assert.equal(await frame.locator(".tt-selected").count(), 1);
  await page.locator(".block-fields h3").waitFor();
  await shot(page, "7-chon-khoi");
  await page.keyboard.press("Control+z");
  assert.equal(await page.textContent("#record-unsaved"), "", "undo takes the title edit back");
  await page.locator('[data-field="title"] input').first().fill("Tiêu đề thử E13");

  // Markup in a bare field never reaches the same-origin preview: the old HTML stays and the note says why.
  const previewBefore = await page.evaluate(() => window.TTPreview.html());
  await page.locator('[data-field="slugVi"] input').fill('"><img src=x onerror=PWN>');
  await page.locator(".preview__note", { hasText: "giữ bản cũ" }).waitFor();
  assert.equal(await page.evaluate(() => window.TTPreview.html()), previewBefore);
  await page.click("#undo");
  await page.locator(".preview__note", { hasText: "giữ bản cũ" }).waitFor({ state: "hidden" });

  // R4 Gherkin: with 4 media the 6 to 11 layout is dimmed with its note; adding two opens it and the chain follows.
  await tabs("Layout").click();
  const six = page.locator(".layout", { hasText: "6 tới 11 ảnh" });
  assert.equal(await six.isDisabled(), true);
  assert.match(await six.textContent(), /thêm 2 media để mở/);
  await shot(page, "8-layout");
  const chain = await blocks();
  await tabs("Media của bài").click();
  await page.locator("button", { hasText: "Thêm media" }).click();
  for (const id of free) {
    await page.locator(".picker .search").fill(id);
    await page.locator(".picker__tile").first().waitFor();
    await page.locator(".picker__tile", { hasText: id.slice(0, 6) }).first().click();
  }
  assert.equal(await page.locator(".media-row").count(), 6);
  await settle();
  await shot(page, "9-media-cua-bai");
  await tabs("Layout").click();
  await six.click();
  await frame.locator("[data-block-index]").nth(chain).waitFor();
  assert.ok((await blocks()) > chain, "the 6 to 11 chain has more blocks");
  await shot(page, "5-bai-news");

  // R8: save with the new empty blocks is a 400 that keeps the draft and lists what is missing; the request carries only mediaId and crop.
  let saved;
  page.on("request", (request) => request.url().endsWith("/api/admin/save") && (saved = request.postDataJSON()));
  await page.click("#save");
  await page.getByText(/Chưa lưu được: còn thiếu/).waitFor();
  assert.ok(await page.evaluate((id) => localStorage.getItem(`tt-cms-draft:news:${id}`), post.id), "the draft stays after a 400");
  const placements = JSON.stringify(saved.data).match(/"mediaId":"[^"]+"[^{}]*/g) ?? [];
  assert.ok(placements.length >= 6 && placements.every((text) => !/"src"|"width"|"altVi"/.test(text)), "placements are mediaId and crop only");
  await tabs("Còn thiếu").click();
  assert.ok(await page.locator(".problem").count() > 0);
  await settle();
  await shot(page, "10-con-thieu");
  // Fill the empty block, then a version conflict: someone else saved first, so the dialog names them and the draft survives.
  const gaps = await page.locator(".problem", { hasText: "Chưa có chữ tiếng Việt" }).count();
  for (let index = 0; index < gaps; index += 1) {
    await page.locator(".problem", { hasText: "Chưa có chữ tiếng Việt" }).first().click();
    await page.locator(".block-fields textarea").nth(0).fill("Đoạn mới thêm.");
    await page.locator(".block-fields textarea").nth(1).fill("A new paragraph.");
    await tabs("Còn thiếu").click();
  }
  const current = await api(page, `get?type=news&id=${post.id}`);
  await api(page, "save", { type: "news", id: post.id, version: current.version, data: { ...current.data, description: { ...current.data.description, vi: `${current.data.description.vi} (người khác sửa)` } } });
  await page.click("#save");
  const conflict = page.locator("dialog.conflict");
  await conflict.waitFor();
  await shot(page, "11-xung-dot");
  assert.match(await conflict.textContent(), /admin@localhost đã lưu bản mới lúc/);
  assert.ok(await page.evaluate((id) => localStorage.getItem(`tt-cms-draft:news:${id}`), post.id));
  await conflict.getByRole("button", { name: "Giữ bản của tôi" }).click();
  await page.getByText(/^Đã lưu/).waitFor();
  assert.equal(await page.textContent("#record-unsaved"), "");
  assert.equal(await page.evaluate((id) => localStorage.getItem(`tt-cms-draft:news:${id}`), post.id), null, "a saved draft is gone");
  assert.equal((await api(page, `get?type=news&id=${post.id}`)).data.title.vi, "Tiêu đề thử E13");

  // No network: the save fails, says so and keeps the draft; the draft is listed in Nháp and survives a reload.
  await tabs("Thông tin").click();
  await page.locator('[data-field="title"] input').first().fill("Tiêu đề lần hai");
  await page.route("**/api/admin/save", (route) => route.abort());
  await page.click("#save");
  await page.getByText("Chưa lưu được, nháp vẫn ở máy này. Thử lại sau.").waitFor();
  await page.unroute("**/api/admin/save");
  await page.reload();
  await page.locator("#record-unsaved", { hasText: "Chưa lưu · 1 thay đổi" }).waitFor();
  await page.locator(".dv-tab", { hasText: "Nháp" }).first().click();
  await page.locator(".drafts__row").first().waitFor();
  assert.equal(await page.locator(".drafts__row").count(), 1);
  await page.locator(".drafts__row button", { hasText: "Bỏ nháp" }).click();
  await page.getByText("Chưa có nháp").waitFor();
  assert.equal(await page.textContent("#record-unsaved"), "");

  // A project opens the same tabs with its own fields (sector, type, SEO title) and its sector's frame.
  await page.locator('.group[data-group="projects"] .row', { hasText: "Căn hộ gỗ sồi ấm" }).click();
  await page.waitForFunction(() => document.querySelector("#record-name").textContent === "Căn hộ gỗ sồi ấm");
  await page.locator(".dv-tab", { hasText: "Thuộc tính" }).first().click();
  await tabs("Thông tin").click();
  await page.locator('[data-field="sector"] select').waitFor();
  assert.deepEqual(await page.locator('[data-field="type"] option').allTextContents(), ["Chọn loại", "Nhà phố", "Căn hộ", "Homestay"]);
  await settle();
  await shot(page, "12-cong-trinh");

  // cms-dock R1 to R4: pin a tab, drag Media to the left edge, slide it out, Esc, pin the edge group, undo the layout.
  await page.click(".topbar__menu summary");
  await page.locator("#panel-menu button", { hasText: "Bố cục mặc định" }).click();
  await page.waitForTimeout(600);
  const tab = (name) => page.locator(".dv-tab", { hasText: name }).first();
  const groupTabs = () => page.evaluate(() => [...document.querySelectorAll(".dv-groupview")].map((group) => (group.classList.contains("dv-edge-collapsed") ? "[strip]" : "")
    + [...group.querySelectorAll(".dv-tab")].map((item) => item.textContent + (item.querySelector(".is-pinned") ? "*" : "")).join(",")));
  await tab("Nháp").click({ button: "right" });
  await page.locator(".dock-menu button", { hasText: "Ghim tab" }).click();
  await page.waitForTimeout(600);
  assert.ok((await groupTabs()).includes("Nháp*,Thuộc tính,Media"), "the pinned tab leads the group");
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
  for (let step = 0; step < 3; step += 1) {
    await page.keyboard.press("Control+Alt+z");
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(600);
  assert.ok((await groupTabs()).includes("Thuộc tính,Media,Nháp"), "undo returns to the default layout");
  assert.equal(await page.locator(".dv-edge-group").count(), 0);
  await page.context().close();

  // (b) Staff: the panel menu has no accounts entry.
  page = await open({ routes: { whoami: (route) => route.fulfill({ json: { email: "staff@example.com", role: "staff", stagingOrigin: null } }) } });
  await page.locator(".group .row").first().waitFor();
  await page.click(".topbar__menu > summary");
  assert.deepEqual(await page.locator("#panel-menu button").allTextContents(),
    ["Nội dung", "Xem trước", "Thuộc tính", "Media", "Nháp", "Bố cục mặc định", "Hoàn tác bố cục", "Làm lại bố cục"]);
  await page.context().close();

  // (E12 carry-over) A group loads its next page when the end of the list scrolls into view.
  const first = async (route) => {
    const url = new URL(route.request().url());
    const more = Boolean(url.searchParams.get("cursor"));
    url.searchParams.delete("cursor");
    const real = await (await route.fetch({ url: url.href })).json();
    if (url.searchParams.get("type") !== "news") return route.fulfill({ json: real });
    const items = Array.from({ length: more ? 5 : 100 }, (_, index) => ({ ...real.items[index % real.items.length], id: `${real.items[index % real.items.length].id}-${more ? "b" : "a"}${index}` }));
    return route.fulfill({ json: { items, next: more ? null : "2026-01-01T00:00:00.000Z|zzz" } });
  };
  page = await open({ routes: { list: first } });
  const newsRows = page.locator('.group[data-group="news"] .row');
  await newsRows.first().waitFor();
  assert.equal(await newsRows.count(), 100);
  await page.locator(".rows__more").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelectorAll('.group[data-group="news"] .row').length === 105);
  await page.context().close();

  // A locked account (403) and an expired Access session (HTML instead of JSON) see one sentence and no panel.
  page = await open({ routes: { whoami: (route) => route.fulfill({ status: 403, json: { error: "Forbidden" } }) } });
  await page.getByText("Tài khoản của bạn chưa được mở trong CMS.").waitFor();
  assert.equal(await page.locator(".dock").isVisible(), false);
  await page.context().close();
  page = await open({ routes: { list: (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<html>login</html>" }) } });
  await page.getByText("Phiên đăng nhập hết hạn. Tải lại trang.").waitFor();
  await page.context().close();

  // (e) Phones get the note, tablets and PCs the editor. The screen's short side decides, so a tablet whose keyboard
  // shrinks the window still keeps the editor.
  const note = "CMS chỉ dùng trên máy tính hoặc máy tính bảng. Hãy mở lại bằng PC hoặc tablet.";
  for (const [label, size, blocked] of [
    ["phone portrait", { width: 390, height: 844, touch: true }, true],
    ["phone landscape", { width: 844, height: 390, touch: true }, true],
    ["iOS phone landscape, screen keeps portrait order", { width: 844, height: 390, screen: { width: 390, height: 844 }, touch: true }, true],
    ["PC window under 600px", { width: 500, height: 900, screen: { width: 1920, height: 1080 } }, true],
    ["low-resolution PC screen", { width: 1024, height: 500, screen: { width: 1024, height: 576 } }, false],
    ["tablet portrait", { width: 768, height: 1024, touch: true }, false],
    ["tablet landscape, keyboard open", { width: 1024, height: 420, screen: { width: 1024, height: 768 }, touch: true }, false],
  ]) {
    page = await open(size);
    assert.equal(await page.getByText(note).isVisible(), blocked, label);
    assert.equal(await page.locator(".dock").isVisible(), !blocked, label);
    await shot(page, `${blocked ? "phone" : "tablet"}-${label.replace(/\W+/g, "-")}`);
    await page.context().close();
  }

  // (f) R10 theme pill: system follows the OS, a choice survives a reload and re-colours the dock, the preview stays the public site.
  page = await open({ colorScheme: "dark" });
  await page.locator('.group[data-group="projects"] .row').first().waitFor();
  const scheme = () => page.evaluate(() => ({
    pref: document.documentElement.dataset.theme,
    pressed: [...document.querySelectorAll("[data-theme-pref]")].filter((b) => b.ariaPressed === "true").map((b) => b.dataset.themePref),
    dock: [...document.querySelector(".dock").querySelectorAll("[class*=dockview-theme]")].map((n) => n.className.match(/dockview-theme-\w+/)[0])[0],
    bg: getComputedStyle(document.body).backgroundColor,
  }));
  assert.deepEqual(await page.locator("[data-theme-pref]").evaluateAll((all) => all.map((b) => [b.dataset.themePref, b.ariaLabel, b.textContent.trim()])),
    [["light", "Giao diện sáng", ""], ["dark", "Giao diện tối", ""], ["system", "Theo hệ thống", ""]]);
  let now = await scheme();
  assert.deepEqual([now.pref, now.pressed, now.dock], ["system", ["system"], "dockview-theme-dark"]);
  await shot(page, "theme-1-he-thong-toi");
  await page.click('[data-theme-pref="light"]');
  now = await scheme();
  assert.deepEqual([now.pref, now.pressed, now.dock], ["light", ["light"], "dockview-theme-light"]);
  assert.notEqual(now.bg, "rgb(18, 22, 27)");
  await shot(page, "theme-2-sang");
  await page.reload();
  await page.locator('.group[data-group="projects"] .row').first().waitFor();
  now = await scheme();
  assert.deepEqual([now.pref, now.pressed, now.dock], ["light", ["light"], "dockview-theme-light"]);
  await page.click('[data-theme-pref="dark"]');
  now = await scheme();
  assert.deepEqual([now.pref, now.dock, now.bg], ["dark", "dockview-theme-dark", "rgb(18, 22, 27)"]);
  await shot(page, "theme-3-toi");
  await page.click('[data-theme-pref="system"]');
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForFunction(() => document.querySelector(".dockview-theme-light"));
  now = await scheme();
  assert.deepEqual([now.pref, now.dock], ["system", "dockview-theme-light"]);
  assert.equal(await page.evaluate(() => localStorage.getItem("tt-cms-theme")), "system");
  await page.context().close();

  // The two stubbed failure pages above throw on purpose (whoami 403); nothing else may.
  assert.deepEqual(errors.filter((error) => !error.includes("whoami 403")), []);
  console.log("[editor.e2e] PASS");
} finally {
  await browser.close();
  if (process.platform === "win32") worker.kill();
  else process.kill(-worker.pid);
  rmSync(persist, { recursive: true, force: true });
}
