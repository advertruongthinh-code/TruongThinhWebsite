// Block-built pages (projects R1-R3, news R2-R3): the browser opens a project page, a News article, the News list, and the
// Projects page on PC and phone, VI and EN. Pages are chosen from data (content-independent-tests R4), ids are not hardcoded.
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
// The phone emulates a touch device like a real one (overlay scrollbar, takes no width).
const viewports = [{ viewport: { width: 1440, height: 900 } }, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }];

// One sample per page type: the first page in the data; the link to try clicking is the link to the first detail page.
const otherLocale = (locale) => (locale === "vi" ? "en" : "vi");
const cases = ["vi", "en"].flatMap((locale) => [
  // switched: a detail page has different slugs in the two languages; clicking to switch language must land on the other slug.
  { route: pageHref("projects", locale, projects[0]), locale, switched: pageHref("projects", otherLocale(locale), projects[0]) },
  { route: pageHref("news", locale, news[0]), locale, switched: pageHref("news", otherLocale(locale), news[0]) },
  { route: `/${locale}/news/`, locale, link: pageHref("news", locale, news.toSorted((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id))[0]) },
  { route: `/${locale}${projectListPages(projects)[0].path}`, locale, link: pageHref("projects", locale, projects[0]), captions: true },
  { route: `/${locale}/${projects[0].sector}/`, locale, link: pageHref("projects", locale, projects[0]) },
  // Type page of the first project and an empty type page (if any): the site menu leads to all six types.
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
      // The Projects grid runtime mounts after a dynamic import; wait for it to place cards (up to 8s) before measuring.
      await page.waitForFunction(() => !document.querySelector("script[data-project-artifact]") || document.querySelector("[data-project-grid].masonry-grid"), null, { timeout: 8000 }).catch(() => {});
      const state = await page.evaluate(() => ({
        h1: document.querySelectorAll("main h1").length,
        lang: document.documentElement.lang,
        // Only consider blocks built from data: html already has overflow-x hidden, and the floating button sliding in from the right edge creates no scrollbar;
        // the old blocks of the Residential and Commercial pages belong to the detail-pages test.
        overflow: [...document.querySelectorAll("main .blk, main .blk *, main .blk-hero *")].filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && !element.closest("[data-gallery-track], .blk-projects__track"))
          .slice(0, 3).map((element) => `${element.tagName}.${[...element.classList].join(".")}`).join(", "),
        switchTo: [...document.querySelectorAll("[data-language-option]")].map((anchor) => new URL(anchor.href).pathname),
        // Projects page: the advertising masonry runtime has mounted (a type with no projects yet has an empty grid).
        masonry: !document.querySelector("script[data-project-artifact]") || Boolean(document.querySelector("[data-project-grid].masonry-grid")),
        // A type chip with no projects carries hidden so it must not display (the rail CSS must not override it).
        hiddenChipsShown: [...document.querySelectorAll("[data-masonry-filter][hidden]")].filter((chip) => getComputedStyle(chip).display !== "none").length,
        emptyLine: document.querySelector(".projects-empty") ? getComputedStyle(document.querySelector(".projects-empty")).display !== "none" : false,
      }));
      assert.equal(state.h1, 1, `${at}: one h1`);
      assert.equal(state.lang, locale, `${at}: lang`);
      assert.equal(state.overflow, "", `${at}: horizontal overflow`);
      assert.ok(state.masonry, `${at}: masonry not built`);
      assert.equal(state.hiddenChipsShown, 0, `${at}: empty-type chip still shown`);
      assert.equal(state.emptyLine, Boolean(empty), `${at}: the "đang cập nhật" line only on a type with no projects`);
      // Switching language leads to this same page in the other language, not to the shell page.
      assert.ok(state.switchTo.includes(route), `${at}: language link ${state.switchTo.join(", ")}`);
      if (link) {
        // The Projects grid builds only cards near the viewport (virtualized like the advertising page): scroll to the grid then wait for the card.
        if (await page.locator("[data-project-grid]").count()) {
          await page.evaluate(() => document.querySelector("[data-project-grid]").scrollIntoView());
          await page.waitForSelector(`main a[href="${link}"]`, { state: "attached", timeout: 5000 }).catch(() => {});
          // Cards are arranged randomly and are taller by the name part: the card sought may sit below the build window, keep scrolling half a screen at a time.
          for (let step = 0; step < 16 && !(await page.locator(`main a[href="${link}"]`).count()); step += 1) {
            await page.evaluate(() => window.scrollBy(0, innerHeight / 2));
            await page.waitForTimeout(250);
          }
        }
        const anchor = page.locator(`main a[href="${link}"]`).first();
        assert.equal(await page.locator(`main a[href="${link}"]`).count() > 0, true, `${at}: has link ${link}`);
        const target = await anchor.getAttribute("href");
        const reached = await page.request.get(`${origin}${target}`);
        assert.ok(reached.ok(), `${at}: ${target} HTTP ${reached.status()}`);
      }
      if (captions) {
        // projects R2, media-card R3 (owner 2026-11-10): the name sits top left inside the media, same as every masonry
        // card. Touch never shows it; a real mouse shows it on hover with the Pinterest shade. The card is exactly as tall
        // as its media, and skeleton frames reserve no caption space.
        await page.evaluate(() => document.querySelector("[data-project-grid]").scrollIntoView());
        await page.waitForSelector("[data-masonry-card] .masonry-card__title", { timeout: 5000 });
        const titles = Object.fromEntries(projects.map((project) => [project.id, project.title[locale]]));
        const grid = await page.evaluate(() => {
          const host = document.querySelector("[data-project-grid]");
          const frames = [...host.querySelectorAll("[data-masonry-cta-frame]")].map((frame) => ({
            column: frame.dataset.masonryCtaColumn, top: Number.parseFloat(frame.style.top), height: Number.parseFloat(frame.style.height),
          }));
          return {
            gap: Number.parseFloat(getComputedStyle(host).getPropertyValue("--masonry-gap")),
            strides: frames.flatMap((frame, index) => {
              const next = frames.slice(index + 1).find((other) => other.column === frame.column);
              return next ? [next.top - frame.top - frame.height] : [];
            }),
            cards: [...host.querySelectorAll("[data-masonry-card]")].map((tile) => {
              const title = tile.querySelector(".masonry-card__title");
              const media = tile.querySelector(".card-media").getBoundingClientRect();
              const box = tile.getBoundingClientRect();
              const titleBox = title.getBoundingClientRect();
              return {
                id: tile.dataset.masonryCard, text: title.textContent, hidden: title.getAttribute("aria-hidden"),
                inside: titleBox.top >= media.top + 7.5 && titleBox.left >= media.left + 7.5 && titleBox.right <= media.right - 7.5,
                flush: Math.abs(box.height - media.height) <= 0.5,
                label: tile.querySelector(".card-interactive")?.getAttribute("aria-labelledby") === title.id,
              };
            }),
          };
        });
        assert.ok(grid.cards.length > 0, `${at}: no project cards yet`);
        for (const card of grid.cards) {
          assert.equal(card.text, titles[card.id], `${at}: card name ${card.id} follows the language`);
          assert.ok(card.inside && card.flush && card.hidden === "true" && card.label,
            `${at}: name ${card.id} is inside the media, the card is exactly as tall as the media, it is the link name: ${JSON.stringify(card)}`);
        }
        assert.ok(grid.strides.every((stride) => Math.abs(stride - grid.gap) <= 0.5),
          `${at}: batch skeleton leaves no room for the name: ${JSON.stringify(grid)}`);
        const card = page.locator("[data-masonry-card]").first();
        const shownState = () => card.evaluate((tile) => {
          const scrim = getComputedStyle(tile.querySelector(".card-media"), "::after");
          return { title: getComputedStyle(tile.querySelector(".masonry-card__title")).opacity, band: scrim.opacity,
            shade: scrim.backgroundImage.startsWith("linear-gradient(rgba(17, 17, 17, 0.4) 48px"), zoom: new DOMMatrixReadOnly(getComputedStyle(tile.querySelector("img")).transform).a };
        });
        if (options.viewport.width > 960) {
          assert.deepEqual(await shownState(), { title: "0", band: "0", shade: true, zoom: 1 }, `${at}: real mouse, no name shown before hover`);
          await card.hover();
          assert.deepEqual(await shownState(), { title: "1", band: "1", shade: true, zoom: 1 }, `${at}: hover shows the name and the Pinterest dark layer together`);
        } else {
          assert.deepEqual(await shownState(), { title: "0", band: "0", shade: true, zoom: 1 }, `${at}: touch shows no name and no dark layer`);
        }
      }
      if (switched && options.viewport.width > 960) {
        await page.click("[data-menu-open]");
        await page.locator(`.menu-language [data-language-option="${otherLocale(locale)}"]`).click();
        await page.waitForURL((url) => url.pathname !== route, { timeout: 8000 }).catch(() => {});
        const pathname = new URL(page.url()).pathname;
        assert.equal(pathname, switched, `${at}: language switch to ${pathname}`);
        assert.ok((await page.request.get(`${origin}${pathname}`)).ok(), `${at}: ${pathname} does not exist`);
      }
      assert.deepEqual(errors, [], `${at}: console errors`);
    } catch (error) {
      failures.push(error.message);
    } finally {
      await context.close();
    }
  }
  // News R2: the large card sticks to the left column when scrolling with a real wheel, at the header + 40px mark, fits the screen, releases at the grid bottom.
  // 1440 and 1366x650 run smooth scroll (Locomotive moves the container by transform), 970 scrolls natively with CSS sticky.
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
      // Smooth scroll slides gradually (lerp): wait until the grid position is still.
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
      assert.ok(range > 100, `${at}: the grid must be taller than the large card to have a sticky range: ${JSON.stringify(start)}`);
      // Horizontal card like Espacio: title only (no group or date), starting about 17px below the cover top, not pushed down by a tall image.
      const rowGaps = await page.$$eval(".blk-news-card--row", (cards) => cards.map((card) => card.querySelector(".blk-news-card__title").getBoundingClientRect().top - card.querySelector("img").getBoundingClientRect().top));
      assert.ok(rowGaps.length && rowGaps.every((gap) => gap >= 15 && gap <= 20), `${at}: title offset of horizontal cards ${rowGaps.join(", ")}`);
      assert.equal(await page.locator(".blk-news-card__meta, .blk-article-head--list .blk-article-head__meta").count(), 0, `${at}: News list shows the title only`);
      await page.mouse.move(viewport.width / 2, viewport.height / 2);
      // Wheel notch by notch, wait until still, reach the middle of the sticky range: the grid top has passed the sticky mark by about half the range.
      let mid = start;
      for (let step = 0; step < 40 && mid.gridTop > start.stickyTop - range / 2; step += 1) {
        await page.mouse.wheel(0, 100);
        mid = await settle();
      }
      assert.ok(mid.gridTop < mid.stickyTop - 20 && mid.gridBottom - mid.stickyTop > mid.height + 20, `${at}: not yet in the middle of the sticky range: ${JSON.stringify(mid)}`);
      assert.ok(Math.abs(mid.top - mid.stickyTop) <= 1, `${at}: the large card must stick at ${mid.stickyTop}px: ${JSON.stringify(mid)}`);
      assert.ok(mid.bottom <= mid.innerHeight, `${at}: the large card while sticky must fit the screen: ${JSON.stringify(mid)}`);
      for (let step = 0; step < 40; step += 1) await page.mouse.wheel(0, 400);
      const end = await settle();
      // End of the page: when the grid bottom has risen above the card's bottom while sticky, the card releases, its bottom coincides with the grid bottom, not overlapping the part below.
      if (smooth) assert.ok(end.gridBottom < end.stickyTop + end.height - 20, `${at}: not yet scrolled past the grid bottom: ${JSON.stringify(end)}`);
      assert.ok(Math.abs(end.bottom - Math.min(end.gridBottom, end.stickyTop + end.height)) <= 1, `${at}: the large card must release at the grid bottom: ${JSON.stringify(end)}`);
      assert.deepEqual(errors, [], `${at}: console errors`);
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
console.log(`block-pages e2e PASS: ${cases.length * viewports.length} pages, 3 viewports of sticky News card`);
