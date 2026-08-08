#!/usr/bin/env node
"use strict";

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:8787").replace(/\/+$/, "");
const ORIGIN = new URL(BASE_URL).origin;
const ROUTES = ["", "residential", "commercial", "projects-products", "about"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(pathname) {
  return fetch(`${BASE_URL}${pathname}`, { redirect: "manual" });
}

(async () => {
  const root = await request("/");
  assert(root.status === 308, `root returned ${root.status}`);
  assert(new URL(root.headers.get("location")).pathname === "/vi/", "root redirect is not canonical");

  for (const locale of ["vi", "en"]) {
    for (const segment of ROUTES) {
      const suffix = segment ? `${segment}/` : "";
      const pathname = `/${locale}/${suffix}`;
      const response = await request(pathname);
      const html = await response.text();
      assert(response.status === 200, `${pathname} returned ${response.status}`);
      assert(response.headers.get("content-language") === locale, `${pathname} has the wrong locale header`);
      assert(html.includes(`<html lang="${locale}" data-route-locale="${locale}">`), `${pathname} was not localized`);
      assert(html.includes(`rel="canonical" href="${ORIGIN}${pathname}"`), `${pathname} has no canonical URL`);
    }
  }

  const sitemap = await request("/sitemap.xml");
  const sitemapXml = await sitemap.text();
  assert(sitemap.status === 200, `sitemap returned ${sitemap.status}`);
  assert(sitemapXml.includes(`${ORIGIN}/vi/`) && sitemapXml.includes(`${ORIGIN}/en/about/`), "static sitemap is incomplete");

  const project = await request("/vi/projects/not-published/");
  assert(project.status === 404, `static project detail returned ${project.status}`);

  console.log("[worker-static-contract] static routes, locales, redirects, and sitemap passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
