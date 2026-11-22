import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { ROUTES } from "../../scripts/tooling/serve-static-parity.mjs";

// Checks the output of pnpm prepare:site: every route that is not a redirect page has a self canonical and the vi, en and
// x-default hreflang of its own pair, and every indexable non-card route is in sitemap-pages.xml.
const ORIGIN = "https://truongthinhads.vn";
const output = (file) => readFile(new URL(`../../.site-output/${file}`, import.meta.url), "utf8");
const twin = new Map();
for (const [route, source] of ROUTES) twin.set(source, { ...twin.get(source), [route.slice(1, 3)]: route });

test("every non-redirect route has a self canonical and vi, en, x-default hreflang", async () => {
  for (const [route, source] of ROUTES) {
    const html = await output(`${route.slice(1)}index.html`);
    if (/http-equiv="refresh"/.test(html)) continue;
    assert.equal(/<link rel="canonical" href="([^"]*)"/.exec(html)?.[1], `${ORIGIN}${route}`, `${route} canonical`);
    const { vi, en } = twin.get(source);
    // Pages built per locale (cluster, card, block pages) pair their own slugs; only shared templates are checked against ROUTES.
    for (const [lang, expected] of [["vi", vi], ["en", en], ["x-default", vi]]) {
      const href = new RegExp(`<link rel="alternate" hreflang="${lang}" href="([^"]*)"`).exec(html)?.[1];
      assert.ok(href?.startsWith(`${ORIGIN}/`), `${route} hreflang ${lang}`);
      if (vi && en) assert.equal(href, `${ORIGIN}${expected}`, `${route} hreflang ${lang}`);
    }
  }
});

test("sitemap-pages.xml lists every indexable route except card pages", async () => {
  const sitemap = await output("sitemap-pages.xml");
  for (const route of ROUTES.keys()) {
    if (route.includes("/advertising-products/p/")) continue;
    const html = await output(`${route.slice(1)}index.html`);
    if (/http-equiv="refresh"|<meta name="robots" content="noindex/.test(html)) continue;
    assert.ok(sitemap.includes(`<loc>${ORIGIN}${route}</loc>`), `${route} missing from sitemap-pages.xml`);
  }
});
