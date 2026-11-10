// Project and News page blocks (layout-library R1, R4): node --test tests/site/blocks.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BLOCK_TYPES, duplicatePageFields, renderBlocks, validateBlockPage } from "../../scripts/site/blocks.mjs";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/site");
const photo = { src: "/assets/content/projects/home-commercial-cafe.webp", width: 2304, height: 3072, altVi: "Quán cà phê nhà phố", altEn: "Shophouse café" };
const photo2 = { src: "/assets/content/projects/kiosk-active-v2.webp", width: 2048, height: 3072, altVi: "Xe cà phê", altEn: "Coffee cart" };
const t = (vi, en) => ({ vi, en });

// The fixture uses all 15 blocks; images are real images already in the site.
const other = { id: "other", slugVi: "khac", slugEn: "other", title: t("Khác", "Other"), cover: photo2 };
const fixture = () => ({
  id: "sample",
  slugVi: "can-ho-mau",
  slugEn: "sample-apartment",
  title: t("Căn hộ mẫu", "Sample apartment"),
  description: t("Mô tả", "Description"),
  cover: photo,
  blocks: [
    { id: "hero", type: "hero-project", titleLine1: t("Căn hộ", "Apartment"), titleLine2: t("ven sông", "by the river"), image: photo },
    { id: "title", type: "section-title", text: t("Tổng quan", "Overview") },
    { id: "intro", type: "paragraph", text: t("Đoạn một.\n\nĐoạn hai.", "One.\n\nTwo.") },
    { id: "cols", type: "paragraph-columns", text: t("Cột", "Column") },
    { id: "img", type: "image-single", position: "left-2-3", image: photo, caption: t("Chú thích", "Caption") },
    { id: "pair", type: "image-pair", layout: "equal", images: [photo, photo2] },
    { id: "video", type: "video-single", video: { src: "/assets/content/clip.mp4", poster: "/assets/content/clip.webp", width: 1920, height: 1080 } },
    { id: "gallery", type: "gallery-carousel", images: [photo, photo2] },
    { id: "facts", type: "facts-grid", items: [{ label: t("Loại", "Type"), text: t("Căn hộ", "Apartment") }, { label: t("Khu vực", "Area"), text: t("Bến Tre", "Ben Tre") }] },
    { id: "contact", type: "contact-quick", title: t("Tư vấn", "Talk to us") },
    { id: "slider", type: "project-slider", projectIds: ["other"] },
    { id: "cta", type: "cta-arrow", text: t("Xem công trình", "See projects"), hrefVi: "/vi/residential/", hrefEn: "/en/residential/" },
    { id: "quote", type: "quote", text: t("Trích", "Quote") },
    { id: "news", type: "news-cards", newsIds: ["other"] },
    { id: "banners", type: "banner-links", items: [{ title: t("Nhà ở", "Homes"), image: photo, hrefVi: "/vi/residential/", hrefEn: "/en/residential/" }] },
  ],
});
const ctx = { siteRoot, projects: new Map([["other", other]]), news: new Map([["other", other]]) };

test("fixture covers every block type and validates", async () => {
  const page = fixture();
  assert.deepEqual(page.blocks.map((block) => block.type).toSorted(), BLOCK_TYPES.toSorted());
  assert.deepEqual(await validateBlockPage(page, ctx), []);
});

test("same data renders the same HTML and escapes text", () => {
  const page = fixture();
  page.blocks[1].text = t("<script>alert(1)</script>", "x");
  const html = renderBlocks(page, ctx);
  assert.equal(renderBlocks(page, ctx), html);
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.equal((html.match(/<p data-en="One\.">Đoạn một\.<\/p>/g) ?? []).length, 1);
});

test("validator reports every rule broken, not only the first", async () => {
  const page = fixture();
  delete page.blocks[1].text.en;
  page.blocks[2].text.en = "Only one.";
  page.blocks[3].id = "title";
  page.blocks[4].position = "center";
  page.blocks[5].images = [photo];
  page.blocks[10].projectIds = ["missing"];
  page.blocks[11].hrefVi = "javascript:alert(1)";
  page.blocks.push({ id: "odd", type: "marquee" });
  const errors = await validateBlockPage(page, ctx);
  for (const rule of [/blocks\[1\]\.text: thiếu chữ EN/, /blocks\[2\]\.text: số đoạn/, /trùng id khối title/, /position: phải là/, /images: cần 2 đến 2/, /id missing không có/, /hrefVi: link không hợp lệ/, /kiểu khối lạ marquee/]) {
    assert.ok(errors.some((error) => rule.test(error)), `missing ${rule}`);
  }
});

test("image size must match the real file", async () => {
  const page = fixture();
  page.cover = { ...photo, width: 100 };
  assert.ok((await validateBlockPage(page, ctx)).some((error) => /cover: width\/height phải là 2304x3072/.test(error)));
});

test("duplicate page id or slug in one file is reported", () => {
  const page = fixture();
  assert.deepEqual(duplicatePageFields([page, { ...page, slugEn: "other-en" }], "content/projects.json"), [
    "content/projects.json: trùng id sample",
    "content/projects.json: trùng slugVi can-ho-mau",
  ]);
});
