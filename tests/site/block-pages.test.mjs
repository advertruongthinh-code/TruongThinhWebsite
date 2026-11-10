// Trang công trình dựng từ khối (projects R3): node --test tests/site/block-pages.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SECTORS, loadBlockContent, renderBlockPage, renderProjectPage } from "../../scripts/site/block-pages.mjs";

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

test("News list: newest first, 12 per page, year filter pages, group pages kept without chips", async () => {
  const { newsListPages } = await import("../../scripts/site/block-pages.mjs");
  const fields = (id) => ({ slugVi: id, slugEn: id, title: { vi: id, en: id }, cover: { src: `/${id}.webp`, width: 3, height: 2, altVi: id, altEn: id } });
  const post = (index, group) => ({ id: `p${index}`, group, published: `2026-10-${String(index + 1).padStart(2, "0")}`, ...fields(`p${index}`) });
  const posts = [...Array.from({ length: 12 }, (_, index) => post(index, "nha-o")), post(12, "xu-huong"), { id: "old", group: "nha-o", published: "2025-12-31", ...fields("old") }];
  const pages = newsListPages(posts);
  assert.deepEqual(pages.map((page) => page.path), ["/news/", "/news/page/2/", "/news/2026/", "/news/2026/page/2/", "/news/2025/", "/news/nha-o/", "/news/nha-o/page/2/", "/news/xu-huong/"]);
  assert.equal(pages[0].posts[0].id, "p12");
  assert.deepEqual(pages[0].years, ["2026", "2025"]);
  assert.equal(pages[1].posts.length, 2);
  // Trang năm không cho lập chỉ mục; hàng lọc chỉ có Tất cả và các năm, không có nhóm.
  const { renderNewsListPage } = await import("../../scripts/site/block-pages.mjs");
  const frame = readFileSync(new URL("../../src/site/about/index.html", import.meta.url), "utf8");
  const yearHtml = renderNewsListPage(frame, pages[4]);
  assert.ok(yearHtml.includes('<meta name="robots" content="noindex, follow" />'));
  assert.doesNotMatch(renderNewsListPage(frame, pages[0]), /noindex/);
  const chips = [...renderNewsListPage(frame, pages[5]).matchAll(/class="blk-news-filter__chip" href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(chips, ["/vi/news/", "/vi/news/2026/", "/vi/news/2025/"]);
  // Bố cục Espacio: bài đầu là thẻ lớn (ảnh tải ngay cho LCP), 4 bài kế là lưới 2x2, còn lại là thẻ hàng ngang (lazy).
  const list = renderNewsListPage(frame, pages[0]);
  const main = list.match(/<div class="blk-news-list__main">([\s\S]*?)<\/div>/)[1];
  const quad = list.match(/<div class="blk-news-list__quad">([\s\S]*?)<\/div>/)[1];
  assert.deepEqual([...main.matchAll(/<a class="blk-news-card([^"]*)" href="([^"]+)"/g)].map((match) => [match[1], match[2]]), [[" blk-news-card--main", "/vi/news/p12/"]]);
  assert.match(main, /loading="eager" fetchpriority="high" sizes="\(max-width: 960px\) 100vw, 50vw"/);
  assert.deepEqual([...quad.matchAll(/<a class="blk-news-card" href="([^"]+)"/g)].map((match) => match[1]), ["/vi/news/p11/", "/vi/news/p10/", "/vi/news/p9/", "/vi/news/p8/"]);
  assert.equal((list.match(/class="blk-news-card blk-news-card--row"/g) ?? []).length, 7);
  const side = list.match(/<div class="blk-news-list__side">([\s\S]*)<\/div>\s*<\/div>/)[1];
  assert.equal((side.match(/loading="lazy"/g) ?? []).length, 11);
});

test("News article head: group label links to its group page in both languages", () => {
  const post = news[0];
  const html = renderBlockPage("news", readFileSync(new URL("../../src/site/about/index.html", import.meta.url), "utf8"), post, ctx);
  assert.ok(html.includes(`<a class="blk-article-head__group" href="/vi/news/${post.group}/" data-en-href="/en/news/${post.group}/"`), "group link VI and EN");
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
  assert.deepEqual(kindFieldErrors("news", { group: "nha-o", published: "2026-11-07", slugVi: "2026", slugEn: "b" }, "n"), ["n: id hoặc slug 2026 trùng đường dẫn nhóm, năm hoặc phân trang"]);
  assert.deepEqual(kindFieldErrors("news", { group: "khac", published: "7/11/2026", slugVi: "page", slugEn: "xu-huong" }, "n"), [
    "n: group phải là nha-o, kinh-doanh, xu-huong, quang-cao",
    "n: published phải là YYYY-MM-DD",
    "n: id hoặc slug page trùng đường dẫn nhóm, năm hoặc phân trang",
    "n: id hoặc slug xu-huong trùng đường dẫn nhóm, năm hoặc phân trang",
  ]);
  // id là thư mục file nguồn news/<id>/index.html: trùng trang nhóm, năm hoặc phân trang thì ghi đè trang danh sách.
  for (const id of ["page", "kinh-doanh", "2025"]) assert.deepEqual(kindFieldErrors("news", { id, group: "nha-o", published: "2026-11-07", slugVi: "a", slugEn: "b" }, "n"), [`n: id hoặc slug ${id} trùng đường dẫn nhóm, năm hoặc phân trang`]);
});

test("Projects list: all, sectors with projects, every type; filter slugs are reserved; artifact passes the advertising card contract", async () => {
  const { kindFieldErrors, projectTypeHref } = await import("../../scripts/site/block-pages.mjs");
  const { projectListPages } = await import("../../scripts/site/project-list.mjs");
  const pages = projectListPages([{ id: "a", sector: "commercial", type: "van-phong" }, { id: "b", sector: "commercial", type: "cafe-nha-hang" }]);
  assert.deepEqual(pages.map((page) => [page.path, page.projects.length]), [
    ["/projects/", 2], ["/projects/kinh-doanh/", 2], ["/projects/nha-pho/", 0], ["/projects/can-ho/", 0], ["/projects/homestay-hotel/", 0],
    ["/projects/showroom-cua-hang/", 0], ["/projects/cafe-nha-hang/", 1], ["/projects/van-phong/", 1],
  ]);
  const { buildProjectArtifact } = await import("../../scripts/site/project-list.mjs");
  const { validateAdvertisingCards } = await import("../../src/site/advertising-products/layout-core.mjs");
  const projects = [
    { id: "a", sector: "commercial", type: "van-phong", slugVi: "a", slugEn: "a-en", title: { vi: "A", en: "A" }, cover: { src: "/a.webp", width: 300, height: 200, altVi: "a", altEn: "a" },
      // Thẻ nhiều media: ảnh người soạn chọn cho thẻ (card.media), theo thứ tự đã chọn.
      card: { width: 3, height: 2, media: [{ src: "/a4.webp", width: 1536, height: 1024, altVi: "a4", altEn: "a4" }, { src: "/a2.webp", width: 3072, height: 2048, altVi: "a2", altEn: "a2" }] } },
    { id: "b", sector: "residential", type: "can-ho", slugVi: "b", slugEn: "b-en", title: { vi: "B", en: "B" }, cover: { src: "/b.webp", width: 200, height: 300, altVi: "b", altEn: "b" } },
  ];
  const artifact = buildProjectArtifact(projects, { a: "rgb(1 2 3)" });
  assert.doesNotThrow(() => validateAdvertisingCards(artifact.cards, { categoryOrder: artifact.categories.map((entry) => entry.slug), requireNonEmpty: true }));
  assert.deepEqual(artifact.cards.find((card) => card.id === "a").href, { vi: "/vi/projects/a/", en: "/en/projects/a-en/" });
  assert.deepEqual(artifact.cards.find((card) => card.id === "a").mediaItems.map((item) => item.src), ["/a4.webp", "/a2.webp"]);
  assert.equal(artifact.cards.find((card) => card.id === "a").media.src, "/a4.webp");
  // Ảnh có vùng dư so với khung thẻ (khác tỷ lệ) bị chặn.
  assert.deepEqual(kindFieldErrors("projects", { sector: "commercial", type: "van-phong", id: "x", slugVi: "x", slugEn: "x", card: { width: 3, height: 2, media: [{ src: "/x.webp", width: 200, height: 300, altVi: "x", altEn: "x" }] } }, "p"), ["p: card.media[0] khác tỷ lệ khung thẻ 3x2"]);
  assert.equal(artifact.cards.find((card) => card.id === "b").mediaItems.length, 1);
  assert.deepEqual(artifact.pages.map((page) => page.filter), ["all", "nha-o", "kinh-doanh", "nha-pho", "can-ho", "homestay-hotel", "showroom-cua-hang", "cafe-nha-hang", "van-phong"]);
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

test("Projects page: artifact JSON cannot close its script; empty type chips hidden except on their own page", async () => {
  const { buildProjectArtifact, projectListPages, renderProjectListPage } = await import("../../scripts/site/project-list.mjs");
  const template = readFileSync(new URL("../../src/site/advertising-products/index.html", import.meta.url), "utf8");
  const projects = [{ id: "a", sector: "commercial", type: "van-phong", slugVi: "a", slugEn: "a-en", title: { vi: "A </script><b>", en: "A" }, cover: { src: "/a.webp", width: 300, height: 200, altVi: "a", altEn: "a" } }];
  const artifact = buildProjectArtifact(projects);
  const pages = projectListPages(projects);
  const html = (slug) => renderProjectListPage(template, pages.find((page) => (page.filter.slug ?? null) === slug), artifact);
  const script = html(null).match(/<script type="application\/json" data-project-artifact>([\s\S]*?)<\/script>/)[1];
  assert.ok(!script.includes("</"), "no </ inside the artifact script");
  assert.equal(JSON.parse(script).cards[0].titleVi, "A </script><b>");
  const chip = (page, filter) => page.match(new RegExp(`<a class="project-filter"[^>]*data-advertising-filter="${filter}"[^>]*>`))[0];
  assert.match(chip(html(null), "can-ho"), / hidden/, "an empty type has no chip on the root page");
  assert.doesNotMatch(chip(html(null), "van-phong"), / hidden/, "a type with projects keeps its chip");
  assert.doesNotMatch(chip(html("can-ho"), "can-ho"), / hidden/, "an empty type keeps its own chip on its page");
  assert.match(html("can-ho"), /class="projects-empty"/, "the empty line is in the page; CSS shows it when the grid has no card");
  // Phần lưới lấy từ khung trang quảng cáo: nội dung quảng cáo phải được thay hết.
  assert.doesNotMatch(html(null).match(/<main[\s\S]*<\/main>/)[0], /advertising-products\/standee|Dấu ấn tiếp theo/, "no Advertising tile or CTA copy left in the grid");
  assert.match(html(null), /aria-label="Ảnh công trình"[\s\S]*Không gian tiếp theo/, "project label and CTA copy replace the Advertising ones");
  assert.match(html("van-phong"), /class="projects-empty"[^>]* hidden/, "a filter with projects hides the empty line");
});
