// Shared link syntax (cms-plan part 2 K1): node --test tests/cms/links.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { LINK, hrefAttrs, resolveLink } from "../../src/cms/links.mjs";

const ctx = {
  projects: new Map([["p1", { slugVi: "nha-a", slugEn: "house-a" }]]),
  news: new Map([["n1", { slugVi: "tin-a", slugEn: "post-a" }]]),
  clusters: [{ slug: "signage", slugVi: "bang-hieu-quang-cao", slugEn: "signage" }],
  projectTypes: ["can-ho"],
  contact: { channels: { zalo: { href: "https://zalo.me/0949131050" }, hotline: { href: "tel:+84949131050" }, facebook: { href: "" } } },
};
const internal = (vi, en = `/en${vi}`) => ({ vi, en, external: false });

test("every link form resolves to VI at the root and EN under /en", () => {
  assert.deepEqual(resolveLink("page:home", ctx), internal("/", "/en/"));
  assert.deepEqual(resolveLink("page:advertising", ctx), internal("/advertising-products/"));
  assert.deepEqual(resolveLink("page:project-type/can-ho", ctx), internal("/projects/can-ho/"));
  assert.deepEqual(resolveLink("page:about/process", ctx), internal("/about/?topic=process"));
  assert.deepEqual(resolveLink("page:advertising/signage", ctx), internal("/advertising-products/bang-hieu-quang-cao/", "/en/advertising-products/signage/"));
  assert.deepEqual(resolveLink("page:project/p1", ctx), internal("/projects/nha-a/", "/en/projects/house-a/"));
  assert.deepEqual(resolveLink("page:news/n1", ctx), internal("/news/tin-a/", "/en/news/post-a/"));
  assert.deepEqual(resolveLink("contact:zalo", ctx), { vi: "https://zalo.me/0949131050", en: "https://zalo.me/0949131050", external: true });
  assert.deepEqual(resolveLink("contact:hotline", ctx), { vi: "tel:+84949131050", en: "tel:+84949131050", external: false });
  assert.deepEqual(resolveLink("https://example.com/a?b=1", ctx), { vi: "https://example.com/a?b=1", en: "https://example.com/a?b=1", external: true });
});

test("a missing target returns null", () => {
  for (const link of ["page:nope", "page:project/gone", "page:news/gone", "page:project-type/nope", "page:about/nope", "page:advertising/nope", "contact:facebook", "contact:tiktok"]) {
    assert.equal(resolveLink(link, ctx), null, link);
  }
  assert.equal(resolveLink("contact:zalo", {}), null);
  for (const href of ["javascript:alert(1)", "data:text/html,x", "http://zalo.me/1", "tel:abc"]) assert.equal(resolveLink("contact:zalo", { contact: { channels: { zalo: { href } } } }), null, href);
});

test("unsafe schemes and malformed links do not match LINK", () => {
  for (const link of ["javascript:alert(1)", "http://example.com", "https://a.b/\"onload", "https://a b", "page:Home", "page:a/b/c", "/news/", "mailto:a@b.c", ""]) {
    assert.ok(!LINK.test(link), link);
    assert.equal(resolveLink(link, ctx), null, link);
  }
});

test("hrefAttrs adds data-en-href only when the EN path is not the prefixed VI path", () => {
  assert.equal(hrefAttrs("/about/", "/en/about/"), 'href="/about/"');
  assert.equal(hrefAttrs("/news/tin-a/", "/en/news/post-a/"), 'href="/news/tin-a/" data-en-href="/en/news/post-a/"');
  assert.equal(hrefAttrs("/about/"), 'href="/about/"');
});
