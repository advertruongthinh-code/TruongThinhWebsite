import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { ADVERTISING_CARDS } from "../../src/site/advertising-products/catalog.mjs";

// Kiểm output của pnpm prepare:site (media-seo R1, R6).
const ORIGIN = "https://truongthinhads.vn";
const page = (locale, id) => readFile(new URL(`../../.site-output/${locale}/advertising-products/p/${id}/index.html`, import.meta.url), "utf8");
const cardUrl = (locale, id) => `${ORIGIN}/${locale}/advertising-products/p/${id}/`;
const cover = (card) => card.mediaItems.find(({ id }) => id === card.coverMediaId) ?? card.mediaItems[0];

test("every card has a VI and EN page with its title, absolute canonical, hreflang and og:image", async () => {
  for (const card of ADVERTISING_CARDS) {
    for (const locale of ["vi", "en"]) {
      const html = await page(locale, card.id);
      const title = locale === "en" ? card.titleEn : card.titleVi;
      assert.match(html, new RegExp(`<html[^>]*lang="${locale}"`), card.id);
      assert.ok(html.includes(`>${title.replace(/&/g, "&amp;")} — Trường Thịnh</title>`), `${locale} ${card.id} title`);
      assert.ok(html.includes(`<link rel="canonical" href="${cardUrl(locale, card.id)}"`), `${locale} ${card.id} canonical`);
      for (const lang of ["vi", "en"]) assert.ok(html.includes(`hreflang="${lang}" href="${cardUrl(lang, card.id)}"`), `${card.id} hreflang ${lang}`);
      const image = cover(card);
      assert.ok(html.includes(`<meta property="og:image" content="${ORIGIN}${image.kind === "video" ? image.posterSrc : image.src}"`), `${card.id} og:image`);
    }
  }
});

const mediaImage = (item) => (item.kind === "video" ? item.posterSrc : item.src);

test("card page HTML carries the name, description, every media with alt, and image JSON-LD without JavaScript", async () => {
  for (const card of ADVERTISING_CARDS) {
    const html = await page("vi", card.id);
    const [, article] = html.match(/<article class="advertising-card-static"[^>]*>([\s\S]*?)<\/article>/) || [];
    assert.ok(article, `${card.id} static block`);
    assert.match(article, new RegExp(`<h1[^>]*>${card.titleVi.replace(/&/g, "&amp;").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h1>`), card.id);
    const images = [...article.matchAll(/<img\b[^>]*>/g)].map(([tag]) => tag);
    assert.equal(images.length, card.mediaItems.length, `${card.id} media count`);
    images.forEach((tag, index) => {
      assert.ok(tag.includes(`src="${mediaImage(card.mediaItems[index])}"`), `${card.id} media ${index} order`);
      assert.match(tag, /\salt="[^"]+"/, `${card.id} media ${index} alt`);
    });
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${card.id} has one h1`);
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
    assert.equal(graph[0]["@type"], "WebPage");
    assert.equal(graph[0].url, cardUrl("vi", card.id));
    const objects = graph.filter((node) => node["@type"] === "ImageObject");
    assert.deepEqual(objects.map(({ contentUrl }) => contentUrl), card.mediaItems.map((item) => `${ORIGIN}${mediaImage(item)}`));
    for (const object of objects) assert.ok(object.creator?.name && object.creditText, `${card.id} image metadata`);
  }
});

test("image sitemap lists every card page with one image:loc per media (media-seo R5)", async () => {
  const xml = await readFile(new URL("../../.site-output/sitemap-advertising.xml", import.meta.url), "utf8");
  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, body]) => body);
  assert.equal(urls.length, ADVERTISING_CARDS.length * 2);
  for (const card of ADVERTISING_CARDS) {
    for (const locale of ["vi", "en"]) {
      const body = urls.find((entry) => entry.includes(`<loc>${cardUrl(locale, card.id)}</loc>`));
      assert.ok(body, `${locale} ${card.id} in sitemap`);
      assert.deepEqual([...body.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map(([, loc]) => loc),
        card.mediaItems.map((item) => `${ORIGIN}${mediaImage(item)}`), `${card.id} images`);
    }
  }
});
