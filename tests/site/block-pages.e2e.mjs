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
        // projects R2, media-card R3 (owner 2026-11-10): the name sits top left inside the media, same as every masonry
        // card. Touch always shows it on the top band; a real mouse shows it on hover with the even layer. The card is
        // exactly as tall as its media, and skeleton frames reserve no caption space.
        await page.evaluate(() => document.querySelector("[data-project-grid]").scrollIntoView());
        await page.waitForSelector("[data-advertising-card] .advertising-tile__title", { timeout: 5000 });
        const titles = Object.fromEntries(projects.map((project) => [project.id, project.title[locale]]));
        const grid = await page.evaluate(() => {
          const host = document.querySelector("[data-project-grid]");
          const frames = [...host.querySelectorAll("[data-advertising-cta-frame]")].map((frame) => ({
            column: frame.dataset.advertisingCtaColumn, top: Number.parseFloat(frame.style.top), height: Number.parseFloat(frame.style.height),
          }));
          return {
            gap: Number.parseFloat(getComputedStyle(host).getPropertyValue("--advertising-gap")),
            strides: frames.flatMap((frame, index) => {
              const next = frames.slice(index + 1).find((other) => other.column === frame.column);
              return next ? [next.top - frame.top - frame.height] : [];
            }),
            cards: [...host.querySelectorAll("[data-advertising-card]")].map((tile) => {
              const title = tile.querySelector(".advertising-tile__title");
              const media = tile.querySelector(".advertising-card-media").getBoundingClientRect();
              const box = tile.getBoundingClientRect();
              const titleBox = title.getBoundingClientRect();
              return {
                id: tile.dataset.advertisingCard, text: title.textContent, hidden: title.getAttribute("aria-hidden"),
                inside: titleBox.top >= media.top + 7.5 && titleBox.left >= media.left + 7.5 && titleBox.right <= media.right - 7.5,
                flush: Math.abs(box.height - media.height) <= 0.5,
                label: tile.querySelector(".advertising-card-interactive")?.getAttribute("aria-labelledby") === title.id,
              };
            }),
          };
        });
        assert.ok(grid.cards.length > 0, `${at}: chưa có thẻ công trình`);
        for (const card of grid.cards) {
          assert.equal(card.text, titles[card.id], `${at}: tên thẻ ${card.id} theo ngôn ngữ`);
          assert.ok(card.inside && card.flush && card.hidden === "true" && card.label,
            `${at}: tên ${card.id} nằm trong media, card cao đúng bằng media, là tên link: ${JSON.stringify(card)}`);
        }
        assert.ok(grid.strides.every((stride) => Math.abs(stride - grid.gap) <= 0.5),
          `${at}: batch skeleton không chừa chỗ tên: ${JSON.stringify(grid)}`);
        const card = page.locator("[data-advertising-card]").first();
        const shownState = () => card.evaluate((tile) => {
          const scrim = getComputedStyle(tile.querySelector(".advertising-card-media"), "::after");
          return { title: getComputedStyle(tile.querySelector(".advertising-tile__title")).opacity, band: scrim.opacity,
            even: scrim.backgroundColor, zoom: new DOMMatrixReadOnly(getComputedStyle(tile.querySelector("img")).transform).a };
        });
        if (options.viewport.width > 960) {
          assert.deepEqual(await shownState(), { title: "0", band: "0", even: "rgba(0, 0, 0, 0)", zoom: 1 }, `${at}: chuột thật, chưa hover thì không hiện tên`);
          await card.hover();
          assert.deepEqual(await shownState(), { title: "1", band: "1", even: "rgba(0, 0, 0, 0.2)", zoom: 1 }, `${at}: hover hiện tên, dải trên và lớp đều cùng lúc`);
        } else {
          assert.deepEqual(await shownState(), { title: "1", band: "1", even: "rgba(0, 0, 0, 0)", zoom: 1 }, `${at}: cảm ứng luôn hiện tên trên dải trên`);
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
  // News R2: thẻ lớn dính cột trái khi cuộn bằng wheel thật, ở mốc header + 40px, vừa màn hình, nhả ra ở đáy lưới.
  // 1440 và 1366x650 chạy smooth scroll (Locomotive dời container bằng transform), 970 cuộn native với CSS sticky.
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 650 }, { width: 970, height: 900 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const at = `/vi/news/ sticky ${viewport.width}x${viewport.height}`;
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    try {
      await page.goto(`${origin}/vi/news/`, { waitUntil: "load" });
      const smooth = viewport.width >= 981;
      if (smooth) await page.waitForSelector("html.has-scroll-init", { state: "attached", timeout: 8000 });
      const measure = () => page.evaluate(() => {
        const main = document.querySelector(".blk-news-list__main");
        const grid = main.parentElement.getBoundingClientRect();
        const box = main.getBoundingClientRect();
        return { stickyTop: Number.parseFloat(getComputedStyle(main).top), gridTop: grid.top, gridBottom: grid.bottom, top: box.top, bottom: box.bottom, height: box.height, innerHeight };
      });
      // Smooth scroll trượt dần (lerp): chờ tới khi vị trí lưới đứng yên.
      const settle = async () => {
        let last = await measure();
        for (let step = 0; step < 40; step += 1) {
          await page.waitForTimeout(100);
          const next = await measure();
          if (Math.abs(next.gridTop - last.gridTop) < 0.5) return next;
          last = next;
        }
        return last;
      };
      const start = await measure();
      const range = start.gridBottom - start.gridTop - start.height;
      assert.ok(range > 100, `${at}: lưới phải cao hơn thẻ lớn để có quãng dính: ${JSON.stringify(start)}`);
      // Thẻ hàng ngang: chữ nhóm và ngày nằm sát trên tiêu đề (cách 0.5rem), không bị ảnh cao kéo giãn hàng.
      const rowGaps = await page.$$eval(".blk-news-card--row", (cards) => cards.map((card) => card.querySelector(".blk-news-card__title").getBoundingClientRect().top - card.querySelector(".blk-news-card__meta time").getBoundingClientRect().bottom));
      assert.ok(rowGaps.length && rowGaps.every((gap) => gap >= 0 && gap <= 10), `${at}: khoảng nhóm và tiêu đề thẻ hàng ngang ${rowGaps.join(", ")}`);
      await page.mouse.move(viewport.width / 2, viewport.height / 2);
      // Lăn từng nấc, chờ đứng yên, tới giữa quãng dính: đỉnh lưới đã qua mốc dính khoảng nửa quãng.
      let mid = start;
      for (let step = 0; step < 40 && mid.gridTop > start.stickyTop - range / 2; step += 1) {
        await page.mouse.wheel(0, 100);
        mid = await settle();
      }
      assert.ok(mid.gridTop < mid.stickyTop - 20 && mid.gridBottom - mid.stickyTop > mid.height + 20, `${at}: chưa vào giữa quãng dính: ${JSON.stringify(mid)}`);
      assert.ok(Math.abs(mid.top - mid.stickyTop) <= 1, `${at}: thẻ lớn phải dính ở ${mid.stickyTop}px: ${JSON.stringify(mid)}`);
      assert.ok(mid.bottom <= mid.innerHeight, `${at}: thẻ lớn lúc dính phải vừa màn hình: ${JSON.stringify(mid)}`);
      for (let step = 0; step < 40; step += 1) await page.mouse.wheel(0, 400);
      const end = await settle();
      // Cuối trang: đáy lưới đã lên trên đáy thẻ lúc dính thì thẻ nhả ra, đáy thẻ trùng đáy lưới, không đè phần dưới.
      if (smooth) assert.ok(end.gridBottom < end.stickyTop + end.height - 20, `${at}: chưa cuộn qua đáy lưới: ${JSON.stringify(end)}`);
      assert.ok(Math.abs(end.bottom - Math.min(end.gridBottom, end.stickyTop + end.height)) <= 1, `${at}: thẻ lớn phải nhả ra ở đáy lưới: ${JSON.stringify(end)}`);
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
console.log(`block-pages e2e PASS: ${cases.length * viewports.length} trang, 3 viewport thẻ News dính`);
