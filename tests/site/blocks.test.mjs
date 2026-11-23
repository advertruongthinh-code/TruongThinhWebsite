// Project and News page blocks (layout-library R1, R4): node --test tests/site/blocks.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fileImageCheck } from "../../scripts/site/content-files.mjs";
import { BLOCK_TYPES, duplicatePageFields, renderBlocks, validateBlockPage } from "../../scripts/site/blocks.mjs";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/site");
const photo = { src: "/assets/content/projects/home-commercial-cafe.webp", width: 2304, height: 3072, altVi: "Quán cà phê nhà phố", altEn: "Shophouse café" };
const photo2 = { src: "/assets/content/projects/kiosk-ca-phe-luu-dong.webp", width: 2048, height: 3072, altVi: "Xe cà phê", altEn: "Coffee cart" };
const t = (vi, en) => ({ vi, en });

// The fixture uses all 16 blocks; images are real images already in the site.
const other = { id: "other", slugVi: "khac", slugEn: "other", title: t("Khác", "Other"), cover: photo2, group: "nha-o" };
const fixture = () => ({
  id: "sample",
  slugVi: "can-ho-mau",
  slugEn: "sample-apartment",
  title: t("Căn hộ mẫu", "Sample apartment"),
  description: t("Mô tả", "Description"),
  cover: photo,
  blocks: [
    { id: "hero", type: "hero-project", tagline: [t("Căn hộ", "Apartment"), t("ven *sông*", "by the *river*")], image: photo },
    { id: "title", type: "section-title", text: t("Tổng quan", "Overview") },
    { id: "intro", type: "paragraph", text: t("Đoạn một.\n\nĐoạn hai.", "One.\n\nTwo.") },
    { id: "cols", type: "paragraph-columns", text: t("Cột", "Column") },
    { id: "img", type: "media-single", position: "left-2-3", image: photo, caption: t("Chú thích", "Caption") },
    { id: "pair", type: "media-pair", layout: "equal", images: [photo, photo2] },
    { id: "video", type: "media-single", position: "wide", video: { src: "/assets/content/clip.mp4", poster: "/assets/content/clip.webp", width: 1920, height: 1080 } },
    { id: "gallery", type: "media-carousel", images: [photo, photo2] },
    { id: "facts", type: "facts-grid", items: [{ label: t("Loại", "Type"), text: t("Căn hộ", "Apartment") }, { label: t("Khu vực", "Area"), text: t("Bến Tre", "Ben Tre") }] },
    { id: "contact", type: "contact-quick", title: t("Tư vấn", "Talk to us") },
    { id: "slider", type: "project-slider", projectIds: ["other"] },
    { id: "cta", type: "cta-arrow", text: t("Xem công trình", "See projects"), hrefVi: "/residential/", hrefEn: "/en/residential/" },
    { id: "quote", type: "quote", text: t("Trích", "Quote") },
    { id: "news", type: "news-cards", newsIds: ["other"] },
    { id: "beside", type: "media-text", image: photo, text: t("Cạnh ảnh.", "Beside.") },
    { id: "banners", type: "banner-links", items: [{ title: t("Nhà ở", "Homes"), image: photo, hrefVi: "/residential/", hrefEn: "/en/residential/" }] },
  ],
});
const ctx = { checkImage: fileImageCheck(siteRoot), projects: new Map([["other", other]]), news: new Map([["other", other]]) };

test("fixture covers every block type and validates", async () => {
  const page = fixture();
  assert.deepEqual([...new Set(page.blocks.map((block) => block.type))].toSorted(), BLOCK_TYPES.toSorted());
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
  for (const rule of [/blocks\[1\]\.text: missing EN text/, /blocks\[2\]\.text: paragraph counts/, /duplicate block id title/, /position: must be/, /images: needs 2 to 2/, /id missing not found/, /hrefVi: invalid link/, /unknown block type marquee/]) {
    assert.ok(errors.some((error) => rule.test(error)), `missing ${rule}`);
  }
});

// Project hero (projects R3, owner 2026-11-14): the shared section.hero like Residential and About, project name as the small h1 kicker,
// the 1-3 line tagline as the big title with one italic word, a CTA that scrolls to the Zalo block, and the scroll cue.
test("project hero reuses the shared hero markup", () => {
  const html = renderBlocks(fixture(), ctx);
  const hero = html.slice(html.indexOf("<section"), html.indexOf("</section>") + 10);
  assert.match(hero, /^<section class="hero detail-hero project-hero" id="top" data-header-tone="inverse" aria-labelledby="project-title">/);
  assert.match(hero, /<img [^>]*fetchpriority="high"[^>]*data-motion-hero-media/);
  assert.match(hero, /<div class="hero-shade" aria-hidden="true"><\/div>/);
  assert.match(hero, /<h1 class="hero-kicker" id="project-title" data-motion-hero-kicker data-en="Sample apartment">Căn hộ mẫu<\/h1>/);
  assert.match(hero, /<p class="hero-title" id="page-title" data-motion-words data-motion-hero-title>/);
  assert.equal((hero.match(/class="detail-hero-line-mask"/g) ?? []).length, 2);
  assert.ok(hero.includes('<span data-en="by the ">ven </span><em data-en="river">sông</em>'), "italic word keeps its own VI and EN");
  assert.match(hero, /<a class="hero-cta" href="#lien-he" data-scroll-to data-motion-hero-fade data-en="Design your own space">Thiết kế không gian của bạn<\/a>/);
  assert.match(hero, /<button class="scroll-cue" type="button" data-scroll-cue/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /<section class="blk blk-contact section-gap" id="lien-he"/);
});

test("project hero without a Zalo block has no CTA", () => {
  const page = fixture();
  page.blocks = page.blocks.filter((block) => block.type !== "contact-quick");
  assert.ok(!renderBlocks(page, ctx).includes("hero-cta"));
});

test("project hero tagline needs 1 to 3 lines, at most one italic part and no , . ; at a line end", async () => {
  for (const [tagline, rule] of [
    [[], /tagline: needs 1 to 3 lines/],
    [[t("a", "a"), t("b", "b"), t("c", "c"), t("d", "d")], /tagline: needs 1 to 3 lines/],
    [[t("*a* và *b*", "*a* and b")], /tagline\[0\]: at most one \*italic\* part/],
    [[t("chữ *lẻ", "odd")], /tagline\[0\]: "chữ \*lẻ": \* has no closing mark/],
    [[t("Tường vuông,", "Square walls"), t("gỗ *mềm*", "soft *wood*")], /tagline\[0\]: a line must not end with , \. or ;/],
    [[t("Gỗ mềm", "Soft wood.")], /tagline\[0\]: a line must not end with , \. or ;/],
  ]) {
    const page = fixture();
    page.blocks[0].tagline = tagline;
    const errors = await validateBlockPage(page, ctx);
    assert.ok(errors.some((error) => rule.test(error)), `${JSON.stringify(tagline)}: ${errors.join("; ")}`);
  }
});

// media-single takes exactly one of image or video; a video is wide and 16:9 (cms-content R5).
test("media-single needs exactly one of image or video, and a video is wide and 16:9", async () => {
  const video = { src: "/assets/content/clip.mp4", poster: "/assets/content/clip.webp", width: 1920, height: 1080 };
  for (const [change, rule] of [
    [(block) => { block.video = video; }, /blocks\[4\]: needs exactly one of image, video/],
    [(block) => { delete block.image; }, /blocks\[4\]: needs exactly one of image, video/],
    [(block) => { delete block.image; block.video = video; }, /blocks\[4\]: a video must use position wide/],
    [(block) => { delete block.image; block.position = "wide"; block.video = { ...video, height: 1200 }; }, /blocks\[4\]: a video must be 16:9/],
    [(block) => { delete block.image; block.position = "wide"; block.video = { ...video, src: "/x.mov" }; }, /blocks\[4\]\.video: needs src \.mp4/],
  ]) {
    const page = fixture();
    change(page.blocks[4]);
    const errors = await validateBlockPage(page, ctx);
    assert.ok(errors.some((error) => rule.test(error)), `${rule}: ${errors.join("; ")}`);
  }
});

test("image size must match the real file", async () => {
  const page = fixture();
  page.cover = { ...photo, width: 100 };
  assert.ok((await validateBlockPage(page, ctx)).some((error) => /cover: width\/height must be 2304x3072/.test(error)));
});

test("duplicate page id or slug in one file is reported", () => {
  const page = fixture();
  assert.deepEqual(duplicatePageFields([page, { ...page, slugEn: "other-en" }], "content/projects.json"), [
    "content/projects.json: duplicate id sample",
    "content/projects.json: duplicate slugVi can-ho-mau",
  ]);
});

test("strip and News blocks without ids pick their items at build", () => {
  const post = (id, group, published) => ({ id, group, published, slugVi: id, slugEn: id, title: t(id, id), cover: photo });
  const project = (id, sector) => ({ id, sector, slugVi: id, slugEn: id, title: t(id, id), cover: photo });
  const auto = {
    projects: new Map(["a", "b", "c", "d"].map((id, index) => [id, project(id, index === 2 ? "commercial" : "residential")])),
    news: new Map([post("old-home", "nha-o", "2026-01-01"), post("new-trend", "xu-huong", "2026-03-01"), post("new-home", "nha-o", "2026-02-01"), post("self", "nha-o", "2026-04-01"), post("older-trend", "xu-huong", "2025-12-01")].map((item) => [item.id, item])),
  };
  const links = (html) => [...html.matchAll(/href="\/(?:projects|news)\/([^/]+)\//g)].map((match) => match[1]);
  // Project page: other projects of the same sector in data order.
  const page = { ...project("a", "residential"), blocks: [{ type: "project-slider" }] };
  assert.deepEqual(links(renderBlocks(page, auto)), ["b", "d"]);
  // On a project page the strip carries the "Other projects" heading; on a sector page it does not.
  assert.match(renderBlocks(page, auto), /<h2 class="blk-projects__title" data-motion-words data-en="Other projects">Công trình khác<\/h2>/);
  assert.doesNotMatch(renderBlocks({ id: "residential", sector: "residential", blocks: [{ type: "project-slider" }] }, auto), /blk-projects__title/);
  // News post: never itself, same group first, newest first, filled up to 3 from other groups.
  const article = { ...post("self", "nha-o", "2026-04-01"), blocks: [{ type: "news-cards" }] };
  assert.deepEqual(links(renderBlocks(article, auto)), ["new-home", "old-home", "new-trend"]);
  // Relevance (owner 2026-11-22): inside a group and among the rest, the post with the closest text beats a newer one.
  const about = (id, group, published, title) => ({ ...post(id, group, published), title: t(title, title) });
  const related = { projects: auto.projects, news: new Map([
    about("self", "nha-o", "2026-04-01", "Chọn tủ bếp gỗ công nghiệp"),
    about("newest-home", "nha-o", "2026-03-01", "Giếng trời cho nhà phố"),
    about("kitchen-home", "nha-o", "2026-01-01", "Phụ kiện tủ bếp gỗ công nghiệp"),
    about("newest-sign", "quang-cao", "2026-03-15", "Biển hiệu hộp đèn"),
    about("panel-trend", "xu-huong", "2025-12-01", "Cạnh ván gỗ công nghiệp"),
  ].map((item) => [item.id, item])) };
  assert.deepEqual(links(renderBlocks({ ...related.news.get("self"), blocks: [{ type: "news-cards" }] }, related)), ["kitchen-home", "newest-home", "panel-trend"]);
});

test("strip and News blocks may omit ids", async () => {
  const page = fixture();
  delete page.blocks[10].projectIds;
  delete page.blocks[13].newsIds;
  assert.deepEqual(await validateBlockPage(page, ctx), []);
});

test("validateBlockPage without checkImage names the missing option instead of a TypeError", async () => {
  await assert.rejects(validateBlockPage(fixture(), {}), /validateBlockPage: checkImage is required/);
});

// Marked text in blocks (cms-plan part 2 E1, K2): every mark, both list kinds, and the plain path kept for unmarked text.
test("marked text and lists render as leaf segments; unmarked text keeps the old HTML", async () => {
  const page = fixture();
  page.blocks[2].text = t("Gỗ **sồi** cho m^2^\n\n• một\n• *hai*\n\n2. ba\n3. [bốn](page:news/other)", "**Oak** wood per m^2^\n\n• one\n• *two*\n\n2. three\n3. [four](page:news/other)");
  page.blocks[1].text = t("Tổng *quan*\ncông trình", "The *overview*\nof the project");
  assert.deepEqual(await validateBlockPage(page, ctx), []);
  const html = renderBlocks(page, ctx);
  const s = (tag, vi, en, attributes = "") => `<${tag}${attributes} data-en="${en}" data-vi="${vi}" data-seg>${vi}</${tag}>`;
  assert.ok(html.includes(`<p>${s("span", "Gỗ ", "")}${s("strong", "sồi", "Oak")}${s("span", " cho m", " wood per m")}${s("sup", "2", "2")}</p>`), html);
  assert.ok(html.includes(`<ul><li>${s("span", "một", "one")}</li><li>${s("em", "hai", "two")}</li></ul>`));
  assert.ok(html.includes(`<ol start="2"><li>${s("span", "ba", "three")}</li><li>${s("a", "bốn", "four", ' href="/news/khac/" data-en-href="/en/news/other/"')}</li></ol>`));
  assert.ok(html.includes(`<h2 data-motion-lines>${s("span", "Tổng ", "The ")}${s("em", "quan", "overview")}<br>${s("span", "công trình", "of the project")}</h2>`));
  assert.ok(html.includes('<p data-en="Beside.">Cạnh ảnh.</p>'), "unmarked text keeps the plain path");
});

test("mark errors carry the block field and the kind of text slot", async () => {
  const page = fixture();
  page.blocks[2].text = t("**sồi", "**oak**");
  page.blocks[8].items[0].label = t("**Loại**", "**Type**");
  page.blocks[11].text = t("Xem *thêm*", "See *more*");
  const errors = await validateBlockPage(page, ctx);
  assert.ok(errors.some((error) => error.startsWith("sample.blocks[2].text:") && error.includes("no closing mark")), errors.join("\n"));
  assert.ok(errors.some((error) => error.startsWith("sample.blocks[8].items[0].label:") && error.includes("not allowed")), errors.join("\n"));
  assert.ok(errors.some((error) => error.startsWith("sample.blocks[11].text:") && error.includes("not allowed")), errors.join("\n"));
});
