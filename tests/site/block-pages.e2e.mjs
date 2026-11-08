// Trang dựng từ khối (projects R1-R3, news R2-R3): trình duyệt mở trang công trình, bài News, danh sách News, trang
// Công trình ở PC và phone, VI và EN. Trang chọn theo dữ liệu (content-independent-tests R4), không ghi cứng id.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadBlockContent, pageHref } from "../../scripts/site/block-pages.mjs";
import { projectListPages } from "../../scripts/site/project-list.mjs";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const { projects, news } = loadBlockContent(fileURLToPath(new URL("../../src/site/", import.meta.url)));
// Phone giả lập thiết bị cảm ứng như máy thật (thanh cuộn nổi, không chiếm bề rộng).
const viewports = [{ viewport: { width: 1440, height: 900 } }, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }];

// Mỗi loại trang một mẫu: trang đầu trong dữ liệu; link cần bấm thử là link tới trang chi tiết đầu tiên.
const otherLocale = (locale) => (locale === "vi" ? "en" : "vi");
const cases = ["vi", "en"].flatMap((locale) => [
  // switched: trang chi tiết có slug khác nhau giữa hai ngôn ngữ, bấm đổi ngôn ngữ phải tới đúng slug kia.
  { route: pageHref("projects", locale, projects[0]), locale, switched: pageHref("projects", otherLocale(locale), projects[0]) },
  { route: pageHref("news", locale, news[0]), locale, switched: pageHref("news", otherLocale(locale), news[0]) },
  { route: `/${locale}/news/`, locale, link: pageHref("news", locale, news.toSorted((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id))[0]) },
  { route: `/${locale}${projectListPages(projects)[0].path}`, locale, link: pageHref("projects", locale, projects[0]) },
  { route: `/${locale}/${projects[0].sector}/`, locale, link: pageHref("projects", locale, projects[0]) },
  // Trang loại của công trình đầu và một trang loại trống (nếu có): menu site dẫn tới đủ sáu loại.
  ...projectListPages(projects).filter((listPage) => listPage.filter.type === projects[0].type || (listPage.filter.type && !listPage.projects.length)).slice(0, 2)
    .map((listPage) => ({ route: `/${locale}${listPage.path}`, locale, link: listPage.projects.length ? pageHref("projects", locale, projects[0]) : undefined })),
]);

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const failures = [];
try {
  for (const options of viewports) for (const { route, locale, link, switched } of cases) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    const at = `${route} ${options.viewport.width}px`;
    try {
      const response = await page.goto(`${origin}${route}`, { waitUntil: "load" });
      assert.ok(response?.ok(), `${at}: HTTP ${response?.status()}`);
      // Runtime lưới Công trình mount sau import động; chờ nó đặt card (tối đa 8s) rồi mới đo.
      await page.waitForFunction(() => document.querySelector("[data-project-masonry]")?.classList.contains("is-laid-out") ?? true, null, { timeout: 8000 }).catch(() => {});
      const state = await page.evaluate(() => ({
        h1: document.querySelectorAll("main h1").length,
        lang: document.documentElement.lang,
        // Chỉ xét khối dựng từ dữ liệu: html đã overflow-x hidden, nút nổi trượt vào từ mép phải không tạo thanh cuộn;
        // các khối cũ của trang Nhà ở, Kinh doanh thuộc test detail-pages.
        overflow: [...document.querySelectorAll("main .blk, main .blk *, main .blk-hero *")].filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && !element.closest("[data-gallery-track], .blk-projects__track"))
          .slice(0, 3).map((element) => `${element.tagName}.${[...element.classList].join(".")}`).join(", "),
        switchTo: [...document.querySelectorAll("[data-language-option]")].map((anchor) => new URL(anchor.href).pathname),
        // Trang Công trình: runtime đã đặt card theo hình học masonry Advertising.
        masonry: document.querySelector("[data-project-masonry]")?.classList.contains("is-laid-out") ?? true,
      }));
      assert.equal(state.h1, 1, `${at}: một h1`);
      assert.equal(state.lang, locale, `${at}: lang`);
      assert.equal(state.overflow, "", `${at}: tràn ngang`);
      assert.ok(state.masonry, `${at}: masonry chưa dựng`);
      // Đổi ngôn ngữ dẫn tới chính trang này ở ngôn ngữ kia, không về trang khung.
      assert.ok(state.switchTo.includes(route), `${at}: link ngôn ngữ ${state.switchTo.join(", ")}`);
      if (link) {
        const anchor = page.locator(`main a[href="${link}"]`).first();
        assert.equal(await page.locator(`main a[href="${link}"]`).count() > 0, true, `${at}: có link ${link}`);
        const target = await anchor.getAttribute("href");
        const reached = await page.request.get(`${origin}${target}`);
        assert.ok(reached.ok(), `${at}: ${target} HTTP ${reached.status()}`);
      }
      if (switched && options.viewport.width > 960) {
        await page.click("[data-menu-open]");
        await page.locator(`.menu-language [data-language-option="${otherLocale(locale)}"]`).click();
        await page.waitForURL((url) => url.pathname !== route, { timeout: 8000 }).catch(() => {});
        const pathname = new URL(page.url()).pathname;
        assert.equal(pathname, switched, `${at}: đổi ngôn ngữ tới ${pathname}`);
        assert.ok((await page.request.get(`${origin}${pathname}`)).ok(), `${at}: ${pathname} không tồn tại`);
      }
      assert.deepEqual(errors, [], `${at}: lỗi console`);
    } catch (error) {
      failures.push(error.message);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(`block-pages e2e FAIL: ${failures.length}\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`block-pages e2e PASS: ${cases.length * viewports.length} trang`);
