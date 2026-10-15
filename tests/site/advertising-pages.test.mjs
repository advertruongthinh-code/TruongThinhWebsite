import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { ADVERTISING_CATEGORIES, ADVERTISING_PAGES, buildAdvertisingArtifact } from "../../src/site/advertising-products/catalog.mjs";

// Runtime đọc window lúc import; test chỉ dùng hàm thuần nên gán window rỗng.
globalThis.window ??= {};
const { parseAdvertisingBrowseLocation, selectAdvertisingRelated, selectAdvertisingSuggestions, serializeAdvertisingBrowseLocation } = await import("../../src/site/advertising-products/catalog-runtime.mjs");
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

test("taxonomy R4: filter lấy từ path, ?category= thắng; filter có trang ghi path, không trang ghi ?category=", () => {
  const schema = { cards: artifact.cards, categories: artifact.categories, pages: artifact.pages };
  const parse = (href) => parseAdvertisingBrowseLocation(`https://local.test${href}`, schema).category;
  assert.equal(parse("/vi/advertising-products/in-an-decal/"), "printing-decals");
  assert.equal(parse("/en/advertising-products/printing-decals/office-printing/"), "printing-decals/office-printing");
  assert.equal(parse("/vi/advertising-products/in-an-decal/?category=signage"), "signage");
  assert.equal(parse("/vi/advertising-products/khong-co/"), "all");
  const serialize = (href, category) => {
    const url = serializeAdvertisingBrowseLocation(`https://local.test${href}`, { category }, artifact.categories, artifact.pages);
    return `${url.pathname}${url.search}`;
  };
  assert.equal(serialize("/vi/advertising-products/in-an-decal/", "printing-decals"), "/vi/advertising-products/in-an-decal/");
  assert.equal(serialize("/en/advertising-products/printing-decals/office-printing/?utm=a", "signage"), "/en/advertising-products/signage/?utm=a");
  assert.equal(serialize("/vi/advertising-products/?utm=a", "printing-decals/office-printing"), "/vi/advertising-products/in-an-decal/in-an-van-phong/?utm=a");
  assert.equal(serialize("/vi/advertising-products/in-an-decal/", "printing-decals/menus"), "/vi/advertising-products/?category=printing-decals%2Fmenus");
  assert.equal(serialize("/en/advertising-products/signage/", "all"), "/en/advertising-products/");
});

test("taxonomy R4: trang gốc trong artifact.pages khớp title và kicker của index.html", async () => {
  const html = await readFile(new URL("../../src/site/advertising-products/index.html", import.meta.url), "utf8");
  const root = artifact.pages.find(({ filter }) => filter === "all");
  assert.match(html, new RegExp(`<title data-en="${root.titleEn}">\\s*${root.titleVi}\\s*</title>`));
  assert.match(html, new RegExp(`data-en="${root.labelEn}"\\s*>\\s*${root.labelVi}\\s*</p>`, "i"));
});

test("taxonomy R7: related của ảnh Kỷ niệm chương đặt card Kỷ niệm chương trước card khác cùng cụm; nút gợi ý có sản phẩm", () => {
  const hero = artifact.cards.find((card) => card.productIds[0] === "office-signs/awards-plaques");
  const related = selectAdvertisingRelated({ cards: artifact.cards, heroId: hero.id, seed: "r7" });
  const isAward = (card) => card.productIds.includes("office-signs/awards-plaques");
  const firstOther = related.findIndex((card) => !isAward(card));
  assert.ok(firstOther > 0 && related.slice(firstOther).every((card) => !isAward(card) && card.category === hero.category));
  assert.equal(related.length, artifact.cards.filter((card) => card !== hero && (isAward(card) || card.category === hero.category)).length);
  const suggestions = selectAdvertisingSuggestions({ cards: artifact.cards, heroId: hero.id, tagRegistry: artifact.tagRegistry });
  assert.equal(suggestions[0].tag.id, "office-signs/awards-plaques");
  assert.equal(new Set(suggestions.map(({ tag }) => tag.labelVi)).size, suggestions.length, "không có hai nút trùng nhãn");
});
