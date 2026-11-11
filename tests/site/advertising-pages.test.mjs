import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { ADVERTISING_CATEGORIES, ADVERTISING_PAGES, ADVERTISING_ROOT_PAGE, buildAdvertisingArtifact } from "../../src/site/advertising-products/catalog.mjs";
import { ADVERTISING_PRODUCT_THRESHOLD } from "../../src/site/advertising-products/taxonomy.mjs";

// The runtime reads window at import time; the test only uses pure functions, so assign an empty window.
globalThis.window ??= {};
const { parseBrowseLocation, selectRelated, selectSuggestions, serializeBrowseLocation } = await import("../../src/site/masonry/runtime.mjs");
const read = (path) => readFile(new URL(`../../.site-output/${path}`, import.meta.url), "utf8");
const artifact = buildAdvertisingArtifact();

test("taxonomy R4, R5: one page per cluster and per product that meets the threshold, in both locales", () => {
  assert.equal(ADVERTISING_PAGES.filter(({ filter }) => !filter.includes("/")).length, 6);
  for (const page of ADVERTISING_PAGES) {
    for (const locale of ["vi", "en"]) {
      assert.ok(existsSync(new URL(`../../.site-output/${locale}/advertising-products/${page[locale]}/index.html`, import.meta.url)), `${locale} ${page.filter}`);
    }
  }
});

test("taxonomy R4: the EN product page has title, meta, canonical, hreflang, an h1 with the product name, an intro and links to every page", async () => {
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
  // The kicker keeps the root page's fixed text on every cluster page and product page (taxonomy R5, owner 2026-11-08).
  assert.deepEqual([...html.matchAll(/<h1\b[^>]*>([^<]*)<\/h1>/g)].map((match) => match[1]), [ADVERTISING_ROOT_PAGE.kickerEn], "the only h1 is the fixed kicker");
  assert.match(html, new RegExp(`<h1\\s+class="hero-kicker"[^>]*data-vi="${ADVERTISING_ROOT_PAGE.kickerVi}"`));
  assert.match(html, /<p id="page-title" class="hero-title"/);
  assert.match(html, /data-masonry-filter="printing-decals" aria-current="true"/);
  assert.match(html, /data-masonry-filter="all" aria-current="false"/);
});

test("taxonomy R4: the root page rail links to cluster pages by the locale's slug", async () => {
  const [vi, en] = await Promise.all([read("vi/advertising-products/index.html"), read("en/advertising-products/index.html")]);
  for (const { slug, slugVi, slugEn } of ADVERTISING_CATEGORIES) {
    assert.match(vi, new RegExp(`href="/vi/advertising-products/${slugVi}/"[^>]*data-masonry-filter="${slug}"`));
    assert.match(en, new RegExp(`href="/en/advertising-products/${slugEn}/"[^>]*data-masonry-filter="${slug}"`));
  }
});

test("taxonomy R3, R5: each product with 10 or more cards has a chip and its own page, a product under 10 cards has neither", async () => {
  assert.equal(ADVERTISING_PRODUCT_THRESHOLD, 10);
  const html = await read("vi/advertising-products/index.html");
  const count = (id) => artifact.cards.filter((card) => card.productIds.includes(id)).length;
  const chips = [...html.matchAll(/<a class="rail-chip" href="([^"]+)" data-en-href="([^"]+)" data-masonry-product="([^"]+)"/g)]
    .map(([, vi, en, id]) => ({ vi, en, id }));
  assert.deepEqual(chips.map(({ id }) => id).sort(), artifact.products.filter(({ id }) => count(id) >= 10).map(({ id }) => id).sort(), "one chip per product with 10 or more cards");
  assert.equal(chips.length, artifact.products.length, "every current product has 10 cards");
  for (const { vi, en, id } of chips) {
    const page = ADVERTISING_PAGES.find(({ filter }) => filter === id);
    assert.ok(page, `${id}: every chip has its own page`);
    assert.equal(vi, `/vi/advertising-products/${page.vi}/`, id);
    assert.equal(en, `/en/advertising-products/${page.en}/`, id);
  }
  // The 2026-11-10 placeholders are gone; their three products each keep one owner-approved card with three media (taxonomy R5).
  assert.equal(artifact.cards.filter((card) => card.media.sourceId.startsWith("placeholder:")).length, 0);
  assert.deepEqual(["kiosk-posm-74", "print-decals-37", "office-signs-wayfinding-56"]
    .map((id) => artifact.cards.find((card) => card.id === id)?.mediaItems?.length), [3, 3, 3]);
  const clusterPage = await read("vi/advertising-products/in-an-decal/index.html");
  assert.match(clusterPage, /<link rel="canonical" href="\/vi\/advertising-products\/in-an-decal\/"/);
  // noscript links only generated pages: a product under the threshold has no dead link
  for (const [, href] of clusterPage.match(/<noscript>([\s\S]*?)<\/noscript>/)[1].matchAll(/href="(\/vi\/advertising-products\/[^"]*)"/g)) {
    assert.ok(existsSync(new URL(`../../.site-output${href}index.html`, import.meta.url)), `noscript ${href}`);
  }
  assert.equal((html.match(/data-masonry-chips="[^"]+" hidden/g) || []).length, ADVERTISING_CATEGORIES.length, "the root page hides every chip row");
  const page = await read("vi/advertising-products/bang-hieu-quang-cao/chu-noi/index.html");
  assert.match(page, /data-masonry-chips="signage">/);
  assert.equal((page.match(/data-masonry-product="signage\/raised-letters" aria-current="true"/g) || []).length, 1);
});

test("taxonomy R4: the filter comes from the path, ?category= wins; a filter with a page writes the path", () => {
  const schema = { cards: artifact.cards, categories: artifact.categories, pages: artifact.pages };
  const parse = (href) => parseBrowseLocation(`https://local.test${href}`, schema).category;
  assert.equal(parse("/vi/advertising-products/in-an-decal/"), "printing-decals");
  assert.equal(parse("/en/advertising-products/printing-decals/office-printing/"), "printing-decals/office-printing");
  assert.equal(parse("/vi/advertising-products/in-an-decal/?category=signage"), "signage");
  assert.equal(parse("/vi/advertising-products/khong-co/"), "all");
  const serialize = (href, category) => {
    const url = serializeBrowseLocation(`https://local.test${href}`, { category }, artifact.categories, artifact.pages);
    return `${url.pathname}${url.search}`;
  };
  assert.equal(serialize("/vi/advertising-products/in-an-decal/", "printing-decals"), "/vi/advertising-products/in-an-decal/");
  assert.equal(serialize("/en/advertising-products/printing-decals/office-printing/?utm=a", "signage"), "/en/advertising-products/signage/?utm=a");
  assert.equal(serialize("/vi/advertising-products/?utm=a", "printing-decals/office-printing"), "/vi/advertising-products/in-an-decal/in-an-van-phong/?utm=a");
  assert.equal(serialize("/en/advertising-products/signage/", "all"), "/en/advertising-products/");
});

test("taxonomy R4: the root page in artifact.pages matches the title and kicker of index.html", async () => {
  const html = await readFile(new URL("../../src/site/advertising-products/index.html", import.meta.url), "utf8");
  const root = artifact.pages.find(({ filter }) => filter === "all");
  assert.match(html, new RegExp(`<title data-en="${root.titleEn}">\\s*${root.titleVi}\\s*</title>`));
  assert.match(html, new RegExp(`data-en="${root.kickerEn}"\\s*>\\s*${root.kickerVi}\\s*</p>`, "i"));
});

test("taxonomy R7: related of the Kỷ niệm chương photo puts the Kỷ niệm chương card before other cards in the same cluster; the suggestion button has a product", () => {
  const hero = artifact.cards.find((card) => card.productIds[0] === "office-signs/awards-plaques");
  const related = selectRelated({ cards: artifact.cards, heroId: hero.id, seed: "r7" });
  const isAward = (card) => card.productIds.includes("office-signs/awards-plaques");
  const firstOther = related.findIndex((card) => !isAward(card));
  assert.ok(firstOther > 0 && related.slice(firstOther).every((card) => !isAward(card) && card.category === hero.category));
  assert.equal(related.length, artifact.cards.filter((card) => card !== hero && (isAward(card) || card.category === hero.category)).length);
  const suggestions = selectSuggestions({ cards: artifact.cards, heroId: hero.id, tagRegistry: artifact.tagRegistry });
  assert.equal(suggestions[0].tag.id, "office-signs/awards-plaques");
  assert.equal(new Set(suggestions.map(({ tag }) => tag.labelVi)).size, suggestions.length, "no two buttons share a label");
});

test("taxonomy R5: a URL whose page is gone under a cluster page falls into the cluster's 404.html, canonical and redirects back to the cluster page", async () => {
  for (const page of ADVERTISING_PAGES.filter(({ filter, cluster }) => filter === cluster)) {
    for (const locale of ["vi", "en"]) {
      const html = await read(`${locale}/advertising-products/${page[locale]}/404.html`);
      assert.match(html, new RegExp(`<link rel="canonical" href="/${locale}/advertising-products/${page[locale]}/"`), `${locale} ${page.filter}`);
      assert.match(html, /location\.replace\(target\.href\)/);
    }
  }
});
