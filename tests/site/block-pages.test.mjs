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

test("kind fields: project sector, News group, date and reserved slugs", async () => {
  const { kindFieldErrors } = await import("../../scripts/site/block-pages.mjs");
  assert.deepEqual(kindFieldErrors("projects", { sector: "office" }, "p"), ["p: sector phải là residential, commercial"]);
  assert.deepEqual(kindFieldErrors("news", { group: "nha-o", published: "2026-11-07", slugVi: "a", slugEn: "b" }, "n"), []);
  assert.deepEqual(kindFieldErrors("news", { group: "khac", published: "7/11/2026", slugVi: "page", slugEn: "xu-huong" }, "n"), [
    "n: group phải là nha-o, kinh-doanh, xu-huong, quang-cao",
    "n: published phải là YYYY-MM-DD",
    "n: slug page trùng đường dẫn nhóm hoặc phân trang",
    "n: slug xu-huong trùng đường dẫn nhóm hoặc phân trang",
  ]);
});
