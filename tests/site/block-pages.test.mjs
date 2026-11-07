// Trang công trình dựng từ khối (projects R3): node --test tests/site/block-pages.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadBlockContent, renderProjectPage } from "../../scripts/site/block-pages.mjs";

const siteRoot = fileURLToPath(new URL("../../src/site/", import.meta.url));
const template = readFileSync(new URL("../../src/site/residential/index.html", import.meta.url), "utf8");
const { projects, news } = loadBlockContent(siteRoot);
const ctx = { projects: new Map(projects.map((page) => [page.id, page])), news: new Map(news.map((page) => [page.id, page])) };

test("project page carries its own head, language links and blocks", () => {
  const project = projects[0];
  const html = renderProjectPage(template, project, ctx);
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
