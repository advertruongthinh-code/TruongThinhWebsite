import assert from "node:assert/strict";
import { test } from "node:test";
import { anchorsFor, catalogScript, freshEdits, renderPage, validateEdits } from "../../src/worker/content.mjs";

// Worker áp nội dung editor đã lưu (cms-editor R8, R10): kiểm nháp, dấu chỗ gốc, khóa lệch, hero preload, SEO cũ.
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
// Khóa theo thứ tự nguồn: t0 chữ h1, i0 i1 ảnh hero, i2 t1 mục gallery đầu, i3 t2 mục sau; l0 hero, l1 gallery.
const EDITS = {
  text: { t0: { vi: "Chào mới", en: "New hello" }, "t1@nab": { vi: "Mục mới", en: "New item" } },
  image: { i3: image("/assets/content/g9.webp"), "i2@nab": image("/assets/content/g8.webp") },
  list: { l1: ["1", "0", "nab"] },
  clone: { nab: "0" },
};

test("validateEdits nhận nháp đúng, chặn chữ trống, ảnh ngoài thư viện, mục mới lạc", () => {
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
});

test("renderPage áp chữ, ảnh, danh sách, bỏ khóa editor và field CMS cũ ở chỗ đã sửa", () => {
  const { anchors } = anchorsFor(SOURCE, "residential", EDITS);
  assert.deepEqual(anchors, { t0: "Xin chào", t1: "Một", i3: "/assets/content/g2.webp", i2: "/assets/content/g1.webp", l1: 2 });
  const { html, stale } = renderPage(SOURCE, "residential", EDITS, anchors);
  assert.deepEqual(stale, []);
  assert.match(html, /<span data-vi="Chào mới" data-en="New hello">Chào mới<\/span>/);
  assert.doesNotMatch(html, /data-cms/);
  const gallery = html.slice(html.indexOf("detail-gallery__slides"));
  assert.ok(gallery.indexOf("g9.webp") < gallery.indexOf("g1.webp"), "mục 1 (ảnh đã đổi) lên trước mục 0");
  assert.match(gallery, /g8\.webp[\s\S]*Mục mới/);
  // Hero không sửa thì giữ script preload.
  assert.match(html, /heroFirst = first/);
});

test("khóa lệch: HTML nguồn đổi sau lúc lưu thì bỏ sửa đổi ở đó, báo stale, không áp nhầm chỗ", () => {
  const { anchors } = anchorsFor(SOURCE, "residential", EDITS);
  const changed = SOURCE.replace(">Xin chào</span>", ">Chào bạn</span>")
    .replace('<figure class="detail-gallery__item"><img src="/assets/content/g2.webp"', '<figure class="detail-gallery__item"><img src="/assets/content/g3.webp" alt="G3"></figure><figure class="detail-gallery__item"><img src="/assets/content/g2.webp"');
  const { fresh, stale } = freshEdits(changed, "residential", EDITS, anchors);
  assert.deepEqual(stale.sort(), ["i2@nab", "l1", "t0", "t1@nab", "i3"].sort());
  assert.deepEqual(fresh, { text: {}, image: {}, list: {}, clone: {} });
  assert.match(anchorsFor(SOURCE, "residential", { text: { t99: { vi: "a", en: "b" } } }).error, /t99/);
});

test("sửa hero: bỏ danh sách preload viết sẵn, đánh lại data-slide liên tục", () => {
  const edits = { list: { l0: ["1", "0", "nh"] }, clone: { nh: "0" }, image: { "i0@nh": image("/assets/content/h.webp") } };
  const { anchors } = anchorsFor(SOURCE, "residential", edits);
  const { html } = renderPage(SOURCE, "residential", edits, anchors);
  assert.doesNotMatch(html, /heroFirst = first/);
  assert.deepEqual([...html.matchAll(/data-slide="(\d)"/g)].map((match) => match[1]), ["0", "1", "2"]);
  assert.match(html, /class="hero-slide is-active" data-slide="0"><img data-src="\/assets\/content\/b\.webp"/);
});

test("catalogScript nhúng hàm vá catalog, thoát < trong JSON", () => {
  const script = catalogScript({ x: { titleVi: "</script><b>" } });
  assert.match(script, /^<script>window\.__TT_ADVERTISING_ARTIFACT__=\(async function patchCatalog\(/);
  assert.doesNotMatch(script.slice(8, -9), /<\/script>/);
});
