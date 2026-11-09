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
  { route: `/${locale}${projectListPages(projects)[0].path}`, locale, link: pageHref("projects", locale, projects[0]), captions: true },
  { route: `/${locale}/${projects[0].sector}/`, locale, link: pageHref("projects", locale, projects[0]) },
  // Trang loại của công trình đầu và một trang loại trống (nếu có): menu site dẫn tới đủ sáu loại.
  ...projectListPages(projects).filter((listPage) => listPage.filter.type === projects[0].type || (listPage.filter.type && !listPage.projects.length)).slice(0, 2)
    .map((listPage) => ({ route: `/${locale}${listPage.path}`, locale, link: listPage.projects.length ? pageHref("projects", locale, projects[0]) : undefined, empty: !listPage.projects.length })),
]);

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const failures = [];
try {
  for (const options of viewports) for (const { route, locale, link, switched, empty, captions } of cases) {
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
      await page.waitForFunction(() => !document.querySelector("script[data-project-artifact]") || document.querySelector("[data-project-grid].advertising-grid"), null, { timeout: 8000 }).catch(() => {});
      const state = await page.evaluate(() => ({
        h1: document.querySelectorAll("main h1").length,
        lang: document.documentElement.lang,
        // Chỉ xét khối dựng từ dữ liệu: html đã overflow-x hidden, nút nổi trượt vào từ mép phải không tạo thanh cuộn;
        // các khối cũ của trang Nhà ở, Kinh doanh thuộc test detail-pages.
        overflow: [...document.querySelectorAll("main .blk, main .blk *, main .blk-hero *")].filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && !element.closest("[data-gallery-track], .blk-projects__track"))
          .slice(0, 3).map((element) => `${element.tagName}.${[...element.classList].join(".")}`).join(", "),
        switchTo: [...document.querySelectorAll("[data-language-option]")].map((anchor) => new URL(anchor.href).pathname),
        // Trang Công trình: runtime masonry quảng cáo đã mount (loại chưa có công trình thì lưới rỗng).
        masonry: !document.querySelector("script[data-project-artifact]") || Boolean(document.querySelector("[data-project-grid].advertising-grid")),
        // Chip loại chưa có công trình mang hidden thì phải không hiển thị (CSS rail không được đè).
        hiddenChipsShown: [...document.querySelectorAll("[data-advertising-filter][hidden]")].filter((chip) => getComputedStyle(chip).display !== "none").length,
        emptyLine: document.querySelector(".projects-empty") ? getComputedStyle(document.querySelector(".projects-empty")).display !== "none" : false,
      }));
      assert.equal(state.h1, 1, `${at}: một h1`);
      assert.equal(state.lang, locale, `${at}: lang`);
      assert.equal(state.overflow, "", `${at}: tràn ngang`);
      assert.ok(state.masonry, `${at}: masonry chưa dựng`);
      assert.equal(state.hiddenChipsShown, 0, `${at}: chip loại trống vẫn hiện`);
      assert.equal(state.emptyLine, Boolean(empty), `${at}: dòng "đang cập nhật" chỉ ở loại chưa có công trình`);
      // Đổi ngôn ngữ dẫn tới chính trang này ở ngôn ngữ kia, không về trang khung.
      assert.ok(state.switchTo.includes(route), `${at}: link ngôn ngữ ${state.switchTo.join(", ")}`);
      if (link) {
        // Lưới Công trình chỉ dựng thẻ gần viewport (ảo hóa như trang quảng cáo): cuộn tới lưới rồi chờ thẻ.
        if (await page.locator("[data-project-grid]").count()) {
          await page.evaluate(() => document.querySelector("[data-project-grid]").scrollIntoView());
          await page.waitForSelector(`main a[href="${link}"]`, { state: "attached", timeout: 5000 }).catch(() => {});
          // Thẻ xếp ngẫu nhiên và cao thêm phần tên: thẻ cần tìm có thể nằm dưới cửa sổ dựng, cuộn tiếp từng nửa màn hình.
          for (let step = 0; step < 16 && !(await page.locator(`main a[href="${link}"]`).count()); step += 1) {
            await page.evaluate(() => window.scrollBy(0, innerHeight / 2));
            await page.waitForTimeout(250);
          }
        }
        const anchor = page.locator(`main a[href="${link}"]`).first();
        assert.equal(await page.locator(`main a[href="${link}"]`).count() > 0, true, `${at}: có link ${link}`);
        const target = await anchor.getAttribute("href");
        const reached = await page.request.get(`${origin}${target}`);
        assert.ok(reached.ok(), `${at}: ${target} HTTP ${reached.status()}`);
      }
      if (captions) {
        // projects R2 (owner 2026-11-09): tên luôn hiện dưới media ở mọi viewport, chỗ của nó đã chừa trong hình học card
        // và batch skeleton; không lớp tối, không zoom; gạch chân 3px chỉ khi hover chuột thật hoặc focus bàn phím.
        await page.evaluate(() => document.querySelector("[data-project-grid]").scrollIntoView());
        await page.waitForSelector("[data-advertising-card] .advertising-tile__title", { timeout: 5000 });
        const titles = Object.fromEntries(projects.map((project) => [project.id, project.title[locale]]));
        const grid = await page.evaluate(() => {
          const host = document.querySelector("[data-project-grid]");
          const frames = [...host.querySelectorAll("[data-advertising-cta-frame]")].map((frame) => ({
            column: frame.dataset.advertisingCtaColumn, top: Number.parseFloat(frame.style.top), height: Number.parseFloat(frame.style.height),
          }));
          return {
            captionHeight: 17 + 1.12 * Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
            gap: Number.parseFloat(getComputedStyle(host).getPropertyValue("--advertising-gap")),
            strides: frames.flatMap((frame, index) => {
              const next = frames.slice(index + 1).find((other) => other.column === frame.column);
              return next ? [next.top - frame.top - frame.height] : [];
            }),
            cards: [...host.querySelectorAll("[data-advertising-card]")].map((tile) => {
              const title = tile.querySelector(".advertising-tile__title");
              const media = tile.querySelector(".advertising-card-media");
              const strip = tile.querySelector(".advertising-card-media__indicator:not([hidden])");
              const box = tile.getBoundingClientRect();
              const titleBox = title.getBoundingClientRect();
              const style = getComputedStyle(title);
              return {
                id: tile.dataset.advertisingCard, text: title.textContent, hidden: title.getAttribute("aria-hidden"),
                shown: style.display !== "none" && style.opacity === "1" && style.visibility === "visible", nowrap: style.whiteSpace,
                titleHeight: titleBox.height, belowMedia: titleBox.top - (strip ?? media).getBoundingClientRect().bottom, belowTitle: box.bottom - titleBox.bottom,
                overlay: getComputedStyle(media, "::after").content,
                // Chiều cao chữ thật (padding CSS + một dòng) phải vừa chỗ chừa, không bị cắt; label của link là tên thẻ.
                fits: title.scrollHeight <= title.clientHeight, label: tile.querySelector(".advertising-card-interactive")?.getAttribute("aria-labelledby") === title.id,
              };
            }),
          };
        });
        assert.ok(grid.cards.length > 0, `${at}: chưa có thẻ công trình`);
        for (const card of grid.cards) {
          assert.equal(card.text, titles[card.id], `${at}: tên thẻ ${card.id} theo ngôn ngữ`);
          assert.ok(card.shown && card.nowrap === "nowrap" && card.hidden === "true", `${at}: tên ${card.id} luôn hiện, một dòng: ${JSON.stringify(card)}`);
          assert.ok(Math.abs(card.titleHeight - grid.captionHeight) <= 0.5 && Math.abs(card.belowMedia) <= 0.5 && Math.abs(card.belowTitle) <= 0.5,
            `${at}: tên ${card.id} nằm đúng chỗ chừa dưới media: ${JSON.stringify(card)}`);
          assert.equal(card.overlay, "none", `${at}: thẻ ${card.id} không có lớp tối`);
          assert.ok(card.fits && card.label, `${at}: tên ${card.id} vừa chỗ chừa và là tên link: ${JSON.stringify(card)}`);
        }
        assert.ok(grid.strides.every((stride) => Math.abs(stride - grid.gap - grid.captionHeight) <= 0.5),
          `${at}: batch skeleton chừa chỗ tên như thẻ thật: ${JSON.stringify(grid)}`);
        const card = page.locator("[data-advertising-card]").first();
        const hoverState = () => card.evaluate((tile) => ({
          underline: new DOMMatrixReadOnly(getComputedStyle(tile.querySelector(".advertising-tile__title"), "::after").transform).a,
          zoom: new DOMMatrixReadOnly(getComputedStyle(tile.querySelector("img")).transform).a,
          overlay: getComputedStyle(tile.querySelector(".advertising-card-media"), "::after").content,
        }));
        if (options.viewport.width > 960) {
          await card.hover();
          await page.waitForTimeout(700);
          assert.deepEqual(await hoverState(), { underline: 1, zoom: 1, overlay: "none" }, `${at}: hover chỉ chạy gạch chân`);
          await page.mouse.move(0, 0);
          await page.waitForTimeout(700);
          assert.equal((await hoverState()).underline, 0, `${at}: rời chuột thì gạch chân thu lại`);
          await page.keyboard.press("Tab");
          await card.locator("a").focus();
          await page.waitForTimeout(700);
          assert.equal((await hoverState()).underline, 1, `${at}: focus bàn phím chạy gạch chân`);
        } else {
          assert.deepEqual(await hoverState(), { underline: 0, zoom: 1, overlay: "none" }, `${at}: cảm ứng không có gạch chân`);
        }
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
