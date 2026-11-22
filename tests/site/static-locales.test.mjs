import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CARDS, ADVERTISING_PAGES } from "../../src/site/advertising-products/catalog.mjs";
import { ROUTES, localeHtml } from "../../scripts/tooling/serve-static-parity.mjs";
import { loadBlockContent, newsListPages } from "../../scripts/site/block-pages.mjs";
import { projectListPages } from "../../scripts/site/project-list.mjs";
import { legacyRedirects } from "../../scripts/site/redirects.mjs";
import { PUBLIC_ORIGIN } from "../../scripts/site/lib.mjs";

test("static hosting gets the same localized HTML as the preview server", async () => {
  // 22 fixed routes (EN mobile-retail becomes a cluster page) plus two locales of each cluster page, product, card, project, News article, the News list page, and each moved path (legacyRedirects).
  const { projects, news } = loadBlockContent(fileURLToPath(new URL("../../src/site/", import.meta.url)));
  assert.equal(ROUTES.size, 21 + (ADVERTISING_PAGES.length + ADVERTISING_CARDS.length + projects.length + news.length + newsListPages(news).length + projectListPages(projects).length) * 2 + legacyRedirects({ projects, news }).length);
  for (const [route, source] of ROUTES) {
    const locale = route.startsWith("/en/") ? "en" : "vi";
    const original = await readFile(new URL(`../../.site-output/${source}`, import.meta.url), "utf8");
    const deployed = await readFile(new URL(`../../.site-output${route}index.html`, import.meta.url), "utf8");
    assert.equal(deployed, localeHtml(original, locale), route);
    assert.match(deployed, new RegExp(`<html[^>]*lang="${locale}"`), route);
  }
});

test("production serves the canonical host, staging its subdomain, and no workers.dev URL is public", async () => {
  const config = await readFile(new URL("../../wrangler.static.toml", import.meta.url), "utf8");
  const domains = [...config.matchAll(/^\[\[(env\.production\.)?routes\]\]\npattern = "([^"]+)"\ncustom_domain = true$/gm)]
    .map((match) => `${match[1] ? "production" : "staging"} ${match[2]}`);
  const host = new URL(PUBLIC_ORIGIN).host;
  assert.deepEqual(domains, [`staging staging.${host}`, `production ${host}`]);
  assert.equal(config.match(/^workers_dev = false$/gm)?.length, 2, "workers.dev off for staging and production");
  assert.equal(config.match(/^preview_urls = false$/gm)?.length, 2, "preview URLs off for staging and production");
  assert.doesNotMatch(config, /^workers_dev = true$/m);
});

test("demo and preview serve the localized 404 page for unknown paths", async () => {
  const output = (file) => readFile(new URL(`../../.site-output/${file}`, import.meta.url), "utf8");
  const config = await readFile(new URL("../../wrangler.static.toml", import.meta.url), "utf8");
  assert.match(config, /^not_found_handling = "404-page"$/m);
  assert.match(await output("404.html"), /<html[^>]*lang="vi"[\s\S]*<h1 id="page-title">404<\/h1>[\s\S]*không còn ở đây/);
  assert.match(await output("en/404.html"), /<html[^>]*lang="en"[\s\S]*<h1 id="page-title">404<\/h1>[\s\S]*no longer here or has\smoved/);
});

test("Vietnamese lives at the root: no built page links /vi/, and old /vi/ URLs answer 301 (owner 2026-11-22)", async () => {
  const redirects = (await readFile(new URL("../../.site-output/_redirects", import.meta.url), "utf8")).trim().split("\n");
  assert.deepEqual(redirects.slice(-2), ["/vi / 301", "/vi/* /:splat 301"], "prefix fallback comes after every specific line");
  assert.ok(redirects.slice(0, -2).every((line) => !/ \/vi\//.test(line)), "no redirect targets a /vi/ URL");
  for (const [route, source] of ROUTES) {
    assert.ok(!route.startsWith("/vi/"), route);
    const html = await readFile(new URL(`../../.site-output${route}index.html`, import.meta.url), "utf8");
    assert.ok(!/(?:href|content|url)=["']?(?:https:\/\/truongthinhads\.vn)?\/vi\//.test(html), `${route} (${source}) links /vi/`);
  }
});
