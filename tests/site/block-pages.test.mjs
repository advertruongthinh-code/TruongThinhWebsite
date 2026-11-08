// Trang công trình dựng từ khối (projects R3): node --test tests/site/block-pages.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SECTORS, loadBlockContent, renderProjectPage } from "../../scripts/site/block-pages.mjs";

const siteRoot = fileURLToPath(new URL("../../src/site/", import.meta.url));
const templateOf = (sector) => readFileSync(new URL(`../../src/site/${sector}/index.html`, import.meta.url), "utf8");
const template = templateOf("residential");
const { projects, news } = loadBlockContent(siteRoot);
const ctx = { projects: new Map(projects.map((page) => [page.id, page])), news: new Map(news.map((page) => [page.id, page])) };

for (const sector of SECTORS) test(`${sector} project page carries its own head, language links and blocks`, () => {
  const project = projects.find((page) => page.sector === sector);
  assert.ok(project, `projects.json has a ${sector} project`);
  const html = renderProjectPage(templateOf(sector), project, ctx);
  assert.match(html, new RegExp(`<title data-en="${project.title.en} — Trường Thịnh">${project.title.vi} — Trường Thịnh</title>`));
  assert.match(html, new RegExp(`<link rel="canonical" href="https://truongthinhads.vn/vi/projects/${project.slugVi}/" data-en-href="https://truongthinhads.vn/en/projects/${project.slugEn}/" />`));
  assert.match(html, /<link rel="alternate" hreflang="x-default"/);
  assert.match(html, /<script type="application\/ld\+json">\{"@context":"https:\/\/schema.org","@graph":\[\{"@type":"Article"/);
  assert.ok(html.includes(`content="${project.description.vi}"`));
  assert.ok(html.includes(`href="/vi/projects/${project.slugVi}/" data-language-option="vi"`));
  assert.ok(html.includes(`href="/en/projects/${project.slugEn}/" data-language-option="en"`));
  assert.ok(html.includes('data-barba-namespace="project"'));
  assert.ok(!html.includes("detail-pages R5:"), "hero slide script removed");
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, "one h1 from the hero block");
});

test("a changed template anchor stops the build instead of shipping a page without SEO", () => {
  assert.throws(() => renderProjectPage(template.replace(/<title\b/, "<titlex"), projects[0], ctx), /anchor "title" matched 0 times/);
});

test("News list: newest first, 12 per page, one page per group with posts", async () => {
  const { newsListPages } = await import("../../scripts/site/block-pages.mjs");
  const post = (index, group) => ({ id: `p${index}`, group, published: `2026-10-${String(index + 1).padStart(2, "0")}` });
  const posts = [...Array.from({ length: 12 }, (_, index) => post(index, "nha-o")), post(12, "xu-huong")];
  const pages = newsListPages(posts);
  assert.deepEqual(pages.map((page) => page.path), ["/news/", "/news/page/2/", "/news/nha-o/", "/news/xu-huong/"]);
  assert.equal(pages[0].posts[0].id, "p12");
  assert.deepEqual(pages[0].groups, [null, "nha-o", "xu-huong"]);
  assert.equal(pages[1].posts.length, 1);
});

test("every page links to News from the hamburger menu only", () => {
  for (const file of ["index.html", "about/index.html", "residential/index.html", "commercial/index.html", "advertising-products/index.html", "404.html"]) {
    const html = readFileSync(new URL(`../../src/site/${file}`, import.meta.url), "utf8");
    assert.equal((html.match(/href="\/vi\/news\/"/g) ?? []).length, 1, file);
    assert.match(html, /<a class="menu-option" href="\/vi\/news\/" data-en="News">Tin tức<\/a>/, file);
  }
});

test("kind fields: project sector and type, News group, date and reserved slugs", async () => {
  const { kindFieldErrors } = await import("../../scripts/site/block-pages.mjs");
  assert.deepEqual(kindFieldErrors("projects", { sector: "commercial", type: "van-phong", slugVi: "a", slugEn: "b" }, "p"), []);
  assert.deepEqual(kindFieldErrors("projects", { sector: "office", type: "van-phong" }, "p"), ["p: sector phải là residential, commercial", "p: type phải là loại thuộc mảng office: "]);
  assert.deepEqual(kindFieldErrors("projects", { sector: "residential", type: "van-phong" }, "p"), ["p: type phải là loại thuộc mảng residential: nha-pho, can-ho, homestay-hotel"]);
  assert.deepEqual(kindFieldErrors("news", { group: "nha-o", published: "2026-11-07", slugVi: "a", slugEn: "b" }, "n"), []);
  assert.deepEqual(kindFieldErrors("news", { group: "khac", published: "7/11/2026", slugVi: "page", slugEn: "xu-huong" }, "n"), [
    "n: group phải là nha-o, kinh-doanh, xu-huong, quang-cao",
    "n: published phải là YYYY-MM-DD",
    "n: slug page trùng đường dẫn nhóm hoặc phân trang",
    "n: slug xu-huong trùng đường dẫn nhóm hoặc phân trang",
  ]);
});

test("Projects list: all, sectors with projects, every type; chips only for filters with projects; filter slugs are reserved", async () => {
  const { kindFieldErrors, projectTypeHref } = await import("../../scripts/site/block-pages.mjs");
  const { projectListPages } = await import("../../scripts/site/project-list.mjs");
  const pages = projectListPages([{ id: "a", sector: "commercial", type: "van-phong" }, { id: "b", sector: "commercial", type: "cafe-nha-hang" }]);
  assert.deepEqual(pages.map((page) => [page.path, page.projects.length]), [
    ["/projects/", 2], ["/projects/kinh-doanh/", 2], ["/projects/nha-pho/", 0], ["/projects/can-ho/", 0], ["/projects/homestay-hotel/", 0],
    ["/projects/showroom-cua-hang/", 0], ["/projects/cafe-nha-hang/", 1], ["/projects/van-phong/", 1],
  ]);
  const chipSlugs = (page) => page.chips.map((chip) => chip.slug);
  assert.deepEqual(chipSlugs(pages[0]), [null, "kinh-doanh", "cafe-nha-hang", "van-phong"]);
  assert.deepEqual(chipSlugs(pages[2]), [null, "kinh-doanh", "nha-pho", "cafe-nha-hang", "van-phong"]);
  assert.equal(projectTypeHref("can-ho", "en"), "/en/projects/can-ho/");
  assert.deepEqual(kindFieldErrors("projects", { sector: "residential", type: "can-ho", slugVi: "nha-o", slugEn: "can-ho" }, "p"), ["p: id hoặc slug nha-o trùng đường dẫn lọc công trình", "p: id hoặc slug can-ho trùng đường dẫn lọc công trình"]);
});

test("menu featured: chosen projects in order; product groups chosen or by card count; unknown ids reported", async () => {
  const { menuErrors, menuFeatured } = await import("../../scripts/site/block-pages.mjs");
  const data = {
    projects: [{ id: "a" }, { id: "b" }],
    categories: [{ slug: "x" }, { slug: "y" }, { slug: "z" }],
    cards: [{ category: "y" }, { category: "y" }, { category: "z" }],
  };
  const auto = menuFeatured({ featuredProjects: ["b", "a"], featuredProductGroups: [] }, data);
  assert.deepEqual(auto.projects.map((project) => project.id), ["b", "a"]);
  assert.deepEqual(auto.productGroups.map((group) => group.slug), ["y", "z", "x"]);
  assert.deepEqual(menuFeatured({ featuredProjects: [], featuredProductGroups: ["x"] }, data).productGroups.map((group) => group.slug), ["x"]);
  assert.deepEqual(menuErrors({ featuredProjects: ["a", "a", "c"], featuredProductGroups: ["w"] }, data, "m"), [
    "m: featuredProjects a không có trong projects.json hoặc bị lặp",
    "m: featuredProjects c không có trong projects.json hoặc bị lặp",
    "m: featuredProductGroups w không phải nhóm Advertising hoặc bị lặp",
  ]);
});

test("Projects masonry: same columns as Advertising, shortest column first, no overlap", async () => {
  const { placeProjectCards } = await import("../../src/site/projects-grid.mjs");
  const { columnsForWidth } = await import("../../src/site/advertising-products/layout-core.mjs");
  for (const viewport of [390, 719, 720, 1004, 1005, 1440]) {
    const cards = [0.75, 1.25, 0.66, 1, 1.5, 0.8].map((ratio, index) => ({ id: String(index), ratio }));
    const { positions } = placeProjectCards(cards, viewport);
    const boxes = [...positions.values()];
    assert.equal(new Set(boxes.map((box) => box.x)).size, Math.min(cards.length, columnsForWidth(viewport)), `${viewport}px: số cột`);
    for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) {
      assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `${viewport}px: card chồng nhau`);
    }
  }
});

test("Projects masonry tail: each column continues with color blocks down to the CTA end", async () => {
  const { planProjectGhosts } = await import("../../src/site/projects-grid.mjs");
  const ghosts = planProjectGhosts({ heights: [100, 300], width: 200, gap: 20 }, ["red", "blue"], [1, 0.5], 600);
  for (const column of [0, 1]) {
    const blocks = ghosts.filter((ghost) => ghost.x === column * 220);
    assert.equal(blocks[0].y, [100, 300][column], "bắt đầu ngay dưới cột");
    assert.ok(blocks.at(-1).y < 600 && blocks.at(-1).y + blocks.at(-1).height >= 600 - 20, "phủ tới cuối CTA");
  }
  assert.deepEqual(planProjectGhosts({ heights: [0], width: 100, gap: 10 }, [], [1], 500), []);
});
