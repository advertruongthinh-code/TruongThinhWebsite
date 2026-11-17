// Tests for the keyword layer (spec advertising-search R2).
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAdvertisingArtifact } from "../../src/site/advertising-products/catalog.mjs";
import { canonical, cardTerms, decodeTelex, decodeVni, keywordScores, modelQuery, plain, warmIndex } from "../../src/search/keywords.mjs";

const card = (id, titleVi, extra = {}) => ({ id, titleVi, titleEn: extra.titleEn ?? titleVi, mediaItems: [], ...extra });
const artifactOf = (...cards) => ({ cards, products: [], clusters: [], tagRegistry: [] });
const lamp = card("lamp", "Hộp đèn tròn inox cho cà phê rang xay");
const kOf = (artifact, query, locale = "vi", id = artifact.cards[0].id) => keywordScores(query, locale, artifact).get(id) ?? 0;

test("plain drops every mark and maps đ to d", () => {
  assert.equal(plain("  Đường  HỘP  đèn "), "duong hop den");
  assert.equal(plain("hoà"), "hoa");
});

test("canonical moves the tone to the end and ignores where it was placed", () => {
  assert.equal(canonical("hòa"), "hoa2");
  assert.equal(canonical("hoà"), "hoa2");
  assert.equal(canonical("hộp"), "hôp5");
  assert.equal(canonical("Đèn"), "đen2");
  assert.equal(canonical("hop"), "hop");
  assert.equal(canonical("hộp".normalize("NFD")), "hôp5");
});

test("decodeTelex reads tone keys at the word end and doubled or w letters", () => {
  assert.equal(decodeTelex("hoopj"), "hôp5");
  assert.equal(decodeTelex("ddenf"), "đen2");
  assert.equal(decodeTelex("duowcj"), "dươc5");
  assert.equal(decodeTelex("tw"), "tư");
  assert.equal(decodeTelex("hop"), "hop");
  assert.equal(decodeTelex("ss"), "ss");
  assert.equal(decodeTelex("3d"), "3d");
});

test("decodeVni reads digits for tone, hat, horn, breve and đ", () => {
  assert.equal(decodeVni("ho65p"), "hôp5");
  assert.equal(decodeVni("d9e2n"), "đen2");
  assert.equal(decodeVni("du7o7c5"), "dươc5");
  assert.equal(decodeVni("ba8ng"), "băng");
  assert.equal(decodeVni("p10"), "p10");
  assert.equal(decodeVni("hop"), "hop");
});

test("R2 table: unaccented, Telex, typo and VNI queries on one card", () => {
  const artifact = artifactOf(lamp);
  assert.equal(kOf(artifact, "hop den"), 0.85);
  assert.equal(kOf(artifact, "hoopj ddenf"), 1);
  assert.equal(kOf(artifact, "hộp đèm"), 0.6);
  assert.equal(kOf(artifact, "hộp đen"), 0.6);
  assert.equal(kOf(artifact, "ho65p d9e2n"), 1);
  assert.equal(kOf(artifact, "hộp đèn"), 1);
  assert.equal(kOf(artifact, "hop dem"), 0.6);
});

test("tone placement and letter case do not matter", () => {
  const artifact = artifactOf(card("a", "Cửa hoà bình"));
  assert.equal(kOf(artifact, "HÒA bình"), 1);
  assert.equal(kOf(artifact, "hoà   bình "), 1);
  assert.equal(kOf(artifact, "hoa binh"), 0.85);
  assert.equal(kOf(artifact, "hoà bình".normalize("NFD")), 1);
});

test("synonym match gives 0.7 and a direct match still wins", () => {
  const artifact = artifactOf(card("sign", "Biển hiệu quán trà"), card("direct", "Bảng hiệu quán cafe"));
  const scores = keywordScores("bảng hiệu", "vi", artifact);
  assert.equal(scores.get("sign"), 0.7);
  assert.equal(scores.get("direct"), 1);
  assert.equal(keywordScores("bang hieu", "vi", artifact).get("sign"), 0.7);
  assert.equal(keywordScores("bảng hiệu quán trà", "vi", artifact).get("sign"), 0.7);
});

test("English queries use the English text and keep words like coffee intact", () => {
  const artifact = artifactOf(card("c", "Quầy", { titleEn: "Coffee cart with steel frame" }), card("s", "Biển", { titleEn: "Aluminium sign for a shop" }));
  const scores = keywordScores("coffee", "en", artifact);
  assert.equal(scores.get("c"), 1);
  assert.equal(scores.has("s"), false);
  assert.equal(keywordScores("aluminum sign", "en", artifact).get("s"), 0.7);
  assert.equal(keywordScores("coffee", "vi", artifact).size, 0);
});

test("partial level needs two words and at least half of them in the card", () => {
  const artifact = artifactOf(card("a", "Hộp đèn mica cho tiệm bánh"));
  assert.equal(kOf(artifact, "đèn bảng"), 0.4);
  assert.equal(kOf(artifact, "tiệm hoa bánh kẹo"), 0.4);
  assert.equal(kOf(artifact, "xe cà phê bánh kẹo"), 0);
  assert.equal(kOf(artifact, "bảng"), 0);
});

test("fuzzy needs words of 3 or more letters and one differing word only", () => {
  const artifact = artifactOf(card("a", "Quầy bán hàng ngoài trời"));
  assert.equal(kOf(artifact, "quay ban hag"), 0.6);
  assert.equal(kOf(artifact, "quay bam hag troi"), 0.4);
  assert.equal(kOf(artifact, "xe"), 0);
  assert.equal(kOf(artifact, "quầy bán hàng ngoại trời"), 0.6);
  assert.equal(kOf(artifact, "quầy bán hàng ngoại trời xa"), 0.4);
});

test("empty and punctuation-only queries return an empty map", () => {
  const artifact = artifactOf(lamp);
  for (const query of ["", "   ", "?!.,", "- - -"]) assert.equal(keywordScores(query, "vi", artifact).size, 0);
});

test("phrases do not match across a comma or ampersand", () => {
  const artifact = artifactOf(card("a", "Standee, kệ & backdrop"));
  assert.equal(kOf(artifact, "standee kệ"), 0.4);
  assert.equal(kOf(artifact, "kệ"), 1);
});

test("cardTerms reads title, every media alt, product and tag labels but not cluster or framing labels", () => {
  const artifact = {
    cards: [],
    products: [{ id: "p1", labelVi: "Hộp đèn", labelEn: "Light boxes" }],
    clusters: [{ id: "c1", labelVi: "Bảng hiệu, chữ nổi", labelEn: "Signage" }],
    tagRegistry: [{ id: "t1", group: "variant", labelVi: "Hộp đèn bạt 3M", labelEn: "3M fabric light boxes" }, { id: "t2", group: "framing", labelVi: "Khung ngang", labelEn: "Landscape framing" }],
  };
  const sample = card("x", "Tiêu đề", { category: "c1", productIds: ["p1"], tagIds: ["p1", "t1", "t2"], mediaItems: [{ altVi: "Ảnh một" }, { altVi: "Ảnh hai" }] });
  const plains = cardTerms(sample, artifact, "vi").map((term) => term.plainWords.join(" "));
  assert.deepEqual(plains, ["tieu de", "anh mot", "anh hai", "hop den", "hop den bat 3m"]);
  assert.deepEqual(cardTerms(sample, artifact, "en").map((term) => term.plainWords.join(" ")), ["tieu de", "light boxes", "3m fabric light boxes"]);
});

test("real catalog: 203 cards, keyword hits and speed under 5 ms a query", () => {
  const artifact = buildAdvertisingArtifact();
  assert.ok(artifact.cards.length >= 200);
  const hits = keywordScores("hộp đèn", "vi", artifact);
  assert.ok(hits.size > 5);
  assert.ok([...hits.values()].every((score) => score >= 0.4 && score <= 1));
  assert.ok(keywordScores("hop den", "vi", artifact).size >= hits.size);
  const queries = ["hộp đèn", "hop den", "hoopj ddenf", "bảng hiệu quán cà phê", "xe ban hang", "ho65p d9e2n", "standee", "kiosk", "biển văn phòng", "coffee", "cho tôi xem bảng led chạy chữ ngoài trời",
    "chữ nổi inox", "in tờ rơi", "decal dán kính", "menu gỗ", "gian hàng hội chợ", "bảng chức danh", "kỷ niệm chương", "quầy sampling", "hộp đèn tay vẫy"];
  for (const locale of ["vi", "en"]) keywordScores("warm up", locale, artifact);
  // One-word queries are the slowest (every card word is a typo candidate), so they are measured on their own.
  for (const list of [queries, ["inox", "standee", "đèn", "coffee", "hop", "x".repeat(300)]]) {
    const start = performance.now();
    for (let i = 0; i < 60; i++) keywordScores(list[i % list.length], "vi", artifact);
    const average = (performance.now() - start) / 60;
    assert.ok(average < 5, `average ${average.toFixed(2)} ms per query`);
  }
});

test("warmIndex builds the same index in slices, and a search during warming still scores every card", () => {
  const cards = Array.from({ length: 5 }, (_, i) => card(`c${i}`, `Hộp đèn mẫu ${i}`));
  const cold = keywordScores("hop den", "vi", artifactOf(...cards));
  const warmed = artifactOf(...cards);
  const steps = [...warmIndex(warmed, "vi", 2)];
  assert.equal(steps.length, 3);
  assert.deepEqual(keywordScores("hop den", "vi", warmed), cold);
  const midway = artifactOf(...cards);
  const warming = warmIndex(midway, "vi", 2);
  warming.next();
  assert.deepEqual(keywordScores("hop den", "vi", midway), cold);
  assert.equal(warming.next().done, true);
  assert.deepEqual(keywordScores("hop den", "vi", midway), cold);
});

test("modelQuery sends catalog words for Telex and VNI, the typed text otherwise", () => {
  const artifact = { cards: [{ id: "a", titleVi: "Hộp đèn quảng cáo", productIds: [], tagIds: [], media: {} }] };
  assert.equal(modelQuery("hoopj ddenf", "vi", artifact), "hộp đèn");
  assert.equal(modelQuery("ho65p d9e2n", "vi", artifact), "hộp đèn");
  assert.equal(modelQuery("hop den", "vi", artifact), "hop den");
  assert.equal(modelQuery("booth sampling", "vi", artifact), "booth sampling");
});

// Owner report 2026-11-17: "chữ nổi" showed a light box (led-displays-lightboxes-12) because the cluster label matched.
test("real catalog: an exact product phrase matches exactly only that product's cards", () => {
  const artifact = buildAdvertisingArtifact();
  for (const [query, product] of [["chữ nổi", "signage/raised-letters"], ["hộp đèn", "signage/light-boxes"]]) {
    const exact = [...keywordScores(query, "vi", artifact)].filter(([, k]) => k === 1).map(([id]) => artifact.cards.find((c) => c.id === id));
    assert.ok(exact.length > 0, query);
    const stray = exact.filter((c) => !c.productIds.includes(product) && !cardTerms(c, artifact, "vi").some((t) => t.typed.join(" ").includes(query)));
    assert.deepEqual(stray.map((c) => c.id), [], query);
  }
  assert.notEqual(keywordScores("chữ nổi", "vi", artifact).get("led-displays-lightboxes-12"), 1);
});
