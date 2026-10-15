import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { ADVERTISING_CATEGORIES, ADVERTISING_PAGES, buildAdvertisingArtifact } from "../../src/site/advertising-products/catalog.mjs";

// Runtime đọc window lúc import; test chỉ dùng hàm thuần nên gán window rỗng.
globalThis.window ??= {};
const { parseAdvertisingBrowseLocation, serializeAdvertisingBrowseLocation } = await import("../../src/site/advertising-products/catalog-runtime.mjs");
const read = (path) => readFile(new URL(`../../.site-output/${path}`, import.meta.url), "utf8");
const artifact = buildAdvertisingArtifact();

test("taxonomy R4, R5: một trang mỗi cụm và mỗi sản phẩm đủ ngưỡng, cả hai locale", () => {
  assert.equal(ADVERTISING_PAGES.filter(({ filter }) => !filter.includes("/")).length, 6);
  assert.equal(ADVERTISING_PAGES.some(({ filter }) => filter === "printing-decals/menus"), false, "sản phẩm dưới 9 ảnh không có trang");
  for (const page of ADVERTISING_PAGES) {
    for (const locale of ["vi", "en"]) {
      assert.ok(existsSync(new URL(`../../.site-output/${locale}/advertising-products/${page[locale]}/index.html`, import.meta.url)), `${locale} ${page.filter}`);
    }
  }
});

test("taxonomy R4: trang sản phẩm EN có title, meta, canonical, hreflang, h1 tên sản phẩm, giới thiệu và link mọi trang", async () => {
  const html = await read("en/advertising-products/printing-decals/office-printing/index.html");
  assert.match(html, /<html[^>]*lang="en"/);
  assert.match(html, /<title[^>]*>Business cards, flyers and catalogues — Trường Thịnh<\/title>/);
  assert.match(html, /<meta\s+name="description"\s+content="Business cards, flyers, brochures, catalogues/);
  assert.match(html, /<link rel="canonical" href="\/en\/advertising-products\/printing-decals\/office-printing\/"/);
  assert.match(html, /<link rel="alternate" hreflang="vi" href="\/vi\/advertising-products\/in-an-decal\/in-an-van-phong\/" \/>/);
  assert.match(html, /<link rel="alternate" hreflang="x-default" href="\/vi\/advertising-products\/in-an-decal\/in-an-van-phong\/" \/>/);
  const noscript = html.match(/<noscript>([\s\S]*?)<\/noscript>/)[1];
  assert.match(noscript, /<p[^>]*>Business cards, flyers, brochures, catalogues/);
  for (const page of ADVERTISING_PAGES) assert.match(noscript, new RegExp(`href="/en/advertising-products/${page.en}/"`), page.filter);
  const page = ADVERTISING_PAGES.find(({ filter }) => filter === "printing-decals/office-printing");
  assert.deepEqual([...html.matchAll(/<h1\b[^>]*>([^<]*)<\/h1>/g)].map((match) => match[1]), [page.labelEn], "h1 duy nhất là tên sản phẩm");
  assert.match(html, /<h1\s+class="hero-kicker"[^>]*data-vi="In ấn văn phòng"/);
  assert.match(html, /<p id="page-title" class="hero-title"/);
  assert.match(html, /data-advertising-filter="printing-decals" aria-current="true"/);
  assert.match(html, /data-advertising-filter="all" aria-current="false"/);
});

test("taxonomy R4: rail trang gốc link tới trang cụm theo slug của locale", async () => {
  const [vi, en] = await Promise.all([read("vi/advertising-products/index.html"), read("en/advertising-products/index.html")]);
  for (const { slug, slugVi, slugEn } of ADVERTISING_CATEGORIES) {
    assert.match(vi, new RegExp(`href="/vi/advertising-products/${slugVi}/"[^>]*data-advertising-filter="${slug}"`));
    assert.match(en, new RegExp(`href="/en/advertising-products/${slugEn}/"[^>]*data-advertising-filter="${slug}"`));
  }
});

test("taxonomy R4: filter lấy từ path, ?category= thắng, URL trùng path không ghi ?category=", () => {
  const schema = { cards: artifact.cards, categories: artifact.categories, products: artifact.products };
  const parse = (href) => parseAdvertisingBrowseLocation(`https://local.test${href}`, schema).category;
  assert.equal(parse("/vi/advertising-products/in-an-decal/"), "printing-decals");
  assert.equal(parse("/en/advertising-products/printing-decals/office-printing/"), "printing-decals/office-printing");
  assert.equal(parse("/vi/advertising-products/in-an-decal/?category=signage"), "signage");
  assert.equal(parse("/vi/advertising-products/khong-co/"), "all");
  const serialize = (href, category) =>
    serializeAdvertisingBrowseLocation(`https://local.test${href}`, { category }, artifact.categories, artifact.products);
  const same = serialize("/vi/advertising-products/in-an-decal/", "printing-decals");
  assert.equal(`${same.pathname}${same.search}`, "/vi/advertising-products/in-an-decal/");
  const other = serialize("/en/advertising-products/printing-decals/office-printing/?utm=a", "signage");
  assert.equal(`${other.pathname}${other.search}`, "/en/advertising-products/?utm=a&category=signage");
});
