import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CARDS, ADVERTISING_PAGES } from "../../src/site/advertising-products/catalog.mjs";
import { ROUTES, localeHtml } from "../../scripts/tooling/serve-static-parity.mjs";
import { loadBlockContent, newsListPages } from "../../scripts/site/block-pages.mjs";
import { projectListPages } from "../../scripts/site/project-list.mjs";
import { MERGED_CARD_REDIRECTS } from "../../src/site/advertising-products/media-manifest.mjs";

test("static hosting gets the same localized HTML as the preview server", async () => {
  // 22 fixed routes (EN mobile-retail becomes a cluster page) plus two locales of each cluster page, product, card, project, News article, the News list page and each merged card redirect.
  const { projects, news } = loadBlockContent(fileURLToPath(new URL("../../src/site/", import.meta.url)));
  assert.equal(ROUTES.size, 21 + (ADVERTISING_PAGES.length + ADVERTISING_CARDS.length + projects.length + news.length + newsListPages(news).length + projectListPages(projects).length + Object.keys(MERGED_CARD_REDIRECTS).length) * 2);
  for (const [route, source] of ROUTES) {
    const locale = route.startsWith("/en/") ? "en" : "vi";
    const original = await readFile(new URL(`../../.site-output/${source}`, import.meta.url), "utf8");
    const deployed = await readFile(new URL(`../../.site-output${route}index.html`, import.meta.url), "utf8");
    assert.equal(deployed, localeHtml(original, locale), route);
    assert.match(deployed, new RegExp(`<html[^>]*lang="${locale}"`), route);
  }
});

test("demo and preview serve the localized 404 page for unknown paths", async () => {
  const output = (file) => readFile(new URL(`../../.site-output/${file}`, import.meta.url), "utf8");
  const config = await readFile(new URL("../../wrangler.static.toml", import.meta.url), "utf8");
  assert.match(config, /^not_found_handling = "404-page"$/m);
  assert.match(await output("404.html"), /<html[^>]*lang="vi"[\s\S]*<h1 id="page-title">404<\/h1>[\s\S]*không tồn tại/);
  assert.match(await output("en/404.html"), /<html[^>]*lang="en"[\s\S]*<h1 id="page-title">404<\/h1>[\s\S]*does not exist or has moved\./);
});
