import assert from "node:assert/strict";
import { test } from "node:test";
import { anchorsFor, catalogScript, freshEdits, renderPage, validateEdits } from "../../src/worker/content.mjs";

// Worker that applies saved editor content (cms-editor R8, R10): checks the draft, original placeholders, stale keys, hero preload, old SEO.
const SOURCE = `<!doctype html><html><head><title>Gốc</title>
<script>(() => { const first = 0; document.documentElement.dataset.heroFirst = first; })();</script></head><body>
<main>
  <h1><span data-cms="hero.kicker" data-vi="Xin chào" data-en="Hello">Xin chào</span></h1>
  <div class="hero-slides">
    <figure class="hero-slide is-active" data-slide="0"><img src="/assets/content/a.webp" alt="A" width="10" height="10"></figure>
    <figure class="hero-slide" data-slide="1"><img data-src="/assets/content/b.webp" alt="B" width="10" height="10"></figure>
  </div>
  <div class="detail-gallery__slides">
    <figure class="detail-gallery__item"><img src="/assets/content/g1.webp" alt="G1"><figcaption data-en="One">Một</figcaption></figure>
    <figure class="detail-gallery__item"><img src="/assets/content/g2.webp" alt="G2"><figcaption data-en="Two">Hai</figcaption></figure>
  </div>
</main></body></html>`;
const image = (src) => ({ src, width: 20, height: 10, altVi: "Ảnh", altEn: "Image" });
// Keys follow source order: t0 h1 text, i0 i1 hero images, i2 t1 first gallery item, i3 t2 next item; l0 hero, l1 gallery.
const EDITS = {
  text: { t0: { vi: "Chào mới", en: "New hello" }, "t1@nab": { vi: "Mục mới", en: "New item" } },
  image: { i3: image("/assets/content/g9.webp"), "i2@nab": image("/assets/content/g8.webp") },
  list: { l1: ["1", "0", "nab"] },
  clone: { nab: "0" },
};

test("validateEdits accepts a valid draft, blocks empty text, images outside the library, and stray new items", () => {
  assert.equal(validateEdits("residential", EDITS), null);
  assert.match(validateEdits("residential", { text: { t0: { vi: "", en: "x" } } }), /t0/);
  assert.match(validateEdits("residential", { image: { i0: image("https://evil.test/x.webp") } }), /i0/);
  assert.match(validateEdits("residential", { image: { i0: image("/assets/content/../secret.webp") } }), /i0/);
  assert.match(validateEdits("residential", { text: { "t1@nzz": { vi: "a", en: "b" } } }), /t1@nzz/);
  assert.match(validateEdits("residential", { clone: { nab: "0" } }), /nab/);
  assert.match(validateEdits("residential", { cards: {} }), /Khóa nháp lạ/);
  const card = {
    titleVi: "Tên", titleEn: "Name", descriptionVi: "Mô tả", descriptionEn: "Description",
    productIds: ["signage/aluminium-signs-facades"], mediaItems: [{ id: "c-1", kind: "image", ...image("/assets/content/c.webp") }], coverMediaId: "c-1",
  };
  assert.equal(validateEdits("advertising", { cards: { "c-01": card } }), null);
  assert.match(validateEdits("advertising", { cards: { "c-01": { ...card, productIds: ["nope/x"] } } }), /taxonomy/);
  assert.match(validateEdits("advertising", { cards: { "c-01": { ...card, coverMediaId: "other" } } }), /bìa/);
  assert.match(validateEdits("advertising", { text: {} }), /cards/);
  assert.match(validateEdits("residential", { text: { t0: { vi: "A &amp; B", en: "A" } } }), /mã HTML/);
  assert.equal(validateEdits("residential", { text: { t0: { vi: "R&D & co", en: "R&D" } } }), null);
  // Limits count UTF-8 bytes: accented Vietnamese letters take more bytes than characters.
  const big = { text: Object.fromEntries(Array.from({ length: 40 }, (_, index) => [`t${index}`, { vi: "ệ".repeat(2500), en: "e" }])) };
  assert.ok(JSON.stringify(big).length < 256 * 1024);
  assert.match(validateEdits("residential", big), /quá lớn/);
});

test("the editor title does not go through linkedom: text closing the title tag does not become a script", () => {
  const edits = { text: { title: { vi: "</title><script>window.pwned=1</script>", en: "x" } } };
  const { anchors } = anchorsFor(SOURCE, "residential", edits);
  const { html, fresh } = renderPage(SOURCE, "residential", edits, anchors);
  assert.doesNotMatch(html, /pwned/);
  assert.match(html, /<title>Gốc<\/title>/);
  assert.equal(fresh.text.title.vi, edits.text.title.vi, "index.js writes the title with HTMLRewriter (escaped)");
});

test("anchorsFor: a new item needs both text and image; reject when the editor's marker differs from the source", () => {
  const gap = { list: { l1: ["0", "1", "nab"] }, clone: { nab: "0" }, image: { "i2@nab": image("/assets/content/g8.webp") } };
  assert.match(anchorsFor(SOURCE, "residential", gap).error, /nab còn ô trống: t1@nab/);
  assert.match(anchorsFor(SOURCE, "residential", { text: { t0: { vi: "a", en: "b" } } }, { t0: "Chữ cũ" }).error, /t0 đã đổi/);
  assert.ok(anchorsFor(SOURCE, "residential", { text: { t0: { vi: "a", en: "b" } } }, { t0: "Xin chào" }).anchors);
});

test("renderPage applies text, images and lists, and drops editor keys and old CMS fields where edited", () => {
  const { anchors } = anchorsFor(SOURCE, "residential", EDITS);
  assert.deepEqual(anchors, { t0: "Xin chào", t1: "Một", i3: "/assets/content/g2.webp", i2: "/assets/content/g1.webp", l1: 2 });
  const { html, stale } = renderPage(SOURCE, "residential", EDITS, anchors);
  assert.deepEqual(stale, []);
  assert.match(html, /<span data-vi="Chào mới" data-en="New hello">Chào mới<\/span>/);
  assert.doesNotMatch(html, /data-cms/);
  const gallery = html.slice(html.indexOf("detail-gallery__slides"));
  assert.ok(gallery.indexOf("g9.webp") < gallery.indexOf("g1.webp"), "item 1 (image changed) comes before item 0");
  assert.match(gallery, /g8\.webp[\s\S]*Mục mới/);
  // An unedited hero keeps its preload script.
  assert.match(html, /heroFirst = first/);
});

test("stale keys: when the source HTML changed after saving, drop the edit there, report stale, and do not apply it to the wrong place", () => {
  const { anchors } = anchorsFor(SOURCE, "residential", EDITS);
  const changed = SOURCE.replace(">Xin chào</span>", ">Chào bạn</span>")
    .replace('<figure class="detail-gallery__item"><img src="/assets/content/g2.webp"', '<figure class="detail-gallery__item"><img src="/assets/content/g3.webp" alt="G3"></figure><figure class="detail-gallery__item"><img src="/assets/content/g2.webp"');
  const { fresh, stale } = freshEdits(changed, "residential", EDITS, anchors);
  assert.deepEqual(stale.sort(), ["i2@nab", "l1", "t0", "t1@nab", "i3"].sort());
  assert.deepEqual(fresh, { text: {}, image: {}, list: {}, clone: {} });
  assert.match(anchorsFor(SOURCE, "residential", { text: { t99: { vi: "a", en: "b" } } }).error, /t99/);
  // Only the h1 text changed: just t0 is stale, the gallery stays.
  const partial = freshEdits(SOURCE.replace(">Xin chào</span>", ">Chào bạn</span>"), "residential", EDITS, anchors);
  assert.deepEqual(partial.stale, ["t0"]);
  assert.deepEqual(Object.keys(partial.fresh.text), ["t1@nab"]);
  assert.deepEqual(partial.fresh.list, EDITS.list);
});

test("hero edit: drop the hand-written preload list and renumber data-slide continuously", () => {
  const edits = { list: { l0: ["1", "0", "nh"] }, clone: { nh: "0" }, image: { "i0@nh": image("/assets/content/h.webp") } };
  const { anchors } = anchorsFor(SOURCE, "residential", edits);
  const { html } = renderPage(SOURCE, "residential", edits, anchors);
  assert.doesNotMatch(html, /heroFirst = first/);
  assert.deepEqual([...html.matchAll(/data-slide="(\d)"/g)].map((match) => match[1]), ["0", "1", "2"]);
  assert.match(html, /class="hero-slide is-active" data-slide="0"><img data-src="\/assets\/content\/b\.webp"/);
});

test("catalogScript embeds the catalog patch function and escapes < in JSON", () => {
  const script = catalogScript({ x: { titleVi: "</script><b>" } });
  assert.match(script, /^<script>window\.__TT_ADVERTISING_ARTIFACT__=\(async function patchCatalog\(/);
  assert.doesNotMatch(script.slice(8, -9), /<\/script>/);
});
