// EN optional for Projects and News (cms-content R2): node --test tests/site/en-optional.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readPageSource } from "../../scripts/site/sync-site-menu.mjs";
import { loadBlockContent } from "../../scripts/site/content-files.mjs";
import { blockRoutes, newsListPages, newsListRoutes, renderBlockPage, renderHomeNews, renderNewsListPage } from "../../scripts/site/block-pages.mjs";
import { slugRedirects } from "../../scripts/site/redirects.mjs";
import { enMissing } from "../../src/cms/contract.mjs";

const siteRoot = fileURLToPath(new URL("../../src/site/", import.meta.url));
const { news } = loadBlockContent(siteRoot);
// Three posts; the newest loses its EN description, so it is VI only.
const posts = news.toSorted((left, right) => right.published.localeCompare(left.published)).slice(0, 3).map((post) => structuredClone(post));
assert.equal(posts.length, 3, "news.json has 3 posts");
const viOnly = posts[0];
delete viOnly.description.en;
viOnly.noEn = enMissing("news", viOnly).length > 0;
const ctx = { projects: new Map(), news: new Map(posts.map((post) => [post.id, post])), clusters: [], projectTypes: [], contact: null };

test("enMissing names the missing EN field", () => {
  assert.deepEqual(enMissing("news", viOnly), ["description.en"]);
  assert.deepEqual(enMissing("news", posts[1]), []);
});

test("a VI-only post has no EN route, so no EN file and no EN sitemap URL", () => {
  const routes = blockRoutes({ news: posts }).map(([route]) => route);
  assert.ok(routes.includes(`/news/${viOnly.slugVi}/`));
  assert.ok(!routes.some((route) => route.startsWith("/en/") && route.includes(viOnly.slugEn)), "no EN route");
  assert.equal(routes.filter((route) => route.startsWith("/en/")).length, 2);
});

test("the VI page of a VI-only post has no EN alternate and its language link goes to the EN news list", () => {
  const html = renderBlockPage("news", readPageSource("about/index.html"), viOnly, ctx);
  assert.doesNotMatch(html, /hreflang="en"/);
  assert.match(html, new RegExp(`<link rel="canonical" href="https://truongthinhads.vn/news/${viOnly.slugVi}/" />`));
  assert.ok(html.includes('href="/en/news/" data-language-option="en"'));
});

test("the EN list leaves out the VI-only post and the VI list keeps all three", () => {
  const vi = newsListPages(posts, "vi").find(({ path }) => path === "/news/");
  const en = newsListPages(posts, "en").find(({ path }) => path === "/news/");
  assert.equal(vi.posts.length, 3);
  assert.equal(en.posts.length, 2);
  assert.ok(!en.posts.includes(viOnly));
  assert.ok(newsListRoutes(posts).some(([route, source]) => route === "/en/news/" && source === "en/news/index.html"));
  // A VI list page without an EN twin sends its language link to the EN news root.
  const frame = readPageSource("about/index.html");
  const group = newsListPages([viOnly], "vi")[1];
  assert.equal(group.hasPair, false);
  const html = renderNewsListPage(frame, group);
  assert.doesNotMatch(html, /hreflang="en"/);
  assert.ok(html.includes('href="/en/news/" data-language-option="en"'));
});

test("home news cards: VI shows the 3 newest, EN the newest with EN", () => {
  const html = renderHomeNews(posts);
  assert.ok(html.includes(`href="/news/${viOnly.slugVi}/"`));
  assert.ok(!html.includes(`/en/news/${viOnly.slugEn}/`));
});

test("old and kept EN slugs of a VI-only post go to the EN news list", () => {
  const lines = slugRedirects([{ type: "news", locale: "en", slug: "old-slug", id: viOnly.id }], { news: posts });
  assert.deepEqual(lines, [["/en/news/old-slug/", "/en/news/"], [`/en/news/${viOnly.slugEn}/`, "/en/news/"]]);
});
