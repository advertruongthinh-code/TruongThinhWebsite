import assert from "node:assert/strict";
import vm from "node:vm";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { ADVERTISING_CATEGORIES, ADVERTISING_LEGACY_CATEGORIES } from "../../src/site/advertising-products/catalog.mjs";

const slugs = ADVERTISING_LEGACY_CATEGORIES.map(({ slug }) => slug);
const output = (path) => new URL("../../.site-output/" + path, import.meta.url);
const worker = await readFile(new URL("../../src/worker/index.js", import.meta.url), "utf8");

assert.equal(slugs.length, 6, "the compatibility contract covers six Advertising categories");

const runRedirect = (script, { pathname, search, lang }) => {
  let replaced;
  vm.runInNewContext(script, {
    URL,
    URLSearchParams,
    location: {
      origin: "https://local.test",
      pathname,
      search,
      replace(value) {
        replaced = value;
      },
    },
    document: { documentElement: { lang } },
  });
  assert.ok(replaced, "the compatibility script must call location.replace");
  return new URL(replaced);
};

for (const slug of slugs) {
  const path = "advertising-products/" + slug + "/index.html";
  assert.ok(existsSync(output(path)), slug + " legacy static route is missing");
  const html = await readFile(output(path), "utf8");
  // Trang tương thích chuyển tới trang cụm mới (taxonomy R4).
  const cluster = ADVERTISING_CATEGORIES.find(({ legacySlug }) => legacySlug === slug);
  const targets = { vi: "/vi/advertising-products/" + cluster.slugVi + "/", en: "/en/advertising-products/" + cluster.slugEn + "/" };
  assert.match(html, new RegExp('<link rel="canonical" href="' + targets.vi + '" data-en-href="' + targets.en + '">'));
  assert.match(html, new RegExp('<noscript>\\s*<meta http-equiv="refresh" content="0; url=' + targets.vi + '" data-en-content="0; url=' + targets.en + '">\\s*<\/noscript>'));
  assert.match(html, new RegExp('<a href="' + targets.vi + '" data-en-href="' + targets.en + '"'));
  assert.match(html, /data-en="/, slug + " fallback copy has no English data attribute");
  assert.doesNotMatch(html, /<img\b|<figure\b|swiper|data-advertising-carousel|data-advertising-source-id|advertising-detail__composition|advertising-detail__hero/i, slug + " must not inline the retired pool or carousel");
  const script = html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
  assert.ok(script, slug + " has no early redirect script");
  for (const locale of ["vi", "en"]) {
    const finalUrl = runRedirect(script, {
      pathname: "/" + locale + "/advertising-products/" + slug + "/",
      search: "?utm=%C3%A9&category=stale&photo=old%2Fone&tag=old&keep=1&keep=two%20words",
      lang: locale,
    });
    assert.equal(finalUrl.origin, "https://local.test");
    assert.equal(finalUrl.pathname, targets[locale]);
    assert.equal(finalUrl.searchParams.get("utm"), "é");
    assert.deepEqual(finalUrl.searchParams.getAll("keep"), ["1", "two words"]);
    assert.equal(finalUrl.searchParams.has("category"), false);
    assert.equal(finalUrl.searchParams.has("photo"), false);
    assert.equal(finalUrl.searchParams.has("tag"), false);
  }
  const languageFallback = runRedirect(script, {
    pathname: "/legacy/advertising-products/" + slug + "/",
    search: "?category=stale&encoded=D%C6%B0a",
    lang: "en-US",
  });
  assert.equal(languageFallback.pathname, targets.en);
  assert.equal(languageFallback.searchParams.get("encoded"), "Dưa");
  assert.equal(languageFallback.searchParams.has("category"), false);
  assert.match(worker, new RegExp('"' + slug + '"'), slug + " is not registered in the worker route set");
}

console.log("[advertising-products-detail-routes] six legacy compatibility routes and VM redirects passed");
