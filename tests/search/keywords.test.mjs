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

test("a synonym typed with one word off still swaps, at the typo level", () => {
  const artifact = artifactOf(card("booth", "Gian hàng triển lãm cho dừa"));
  assert.equal(kOf(artifact, "kiosk"), 0.7);
  assert.equal(kOf(artifact, "kios"), 0.6);
  assert.equal(kOf(artifact, "ki ot"), 0.7);
});

test("a merged card keeps the title and products of every media it holds", () => {
  const artifact = { cards: [card("cover", "Gian hàng triển lãm", { productIds: ["p1"], tagIds: [],
    mediaItems: [{ altVi: "Ảnh bìa" }, { titleVi: "Quầy cong veneer óc chó", altVi: "Ảnh hai", productIds: ["p2"] }] })],
  products: [{ id: "p1", labelVi: "Gian hàng hội chợ" }, { id: "p2", labelVi: "Chữ nổi" }], tagRegistry: [] };
  assert.equal(kOf(artifact, "quầy cong veneer"), 1);
  assert.equal(kOf(artifact, "chữ nổi"), 1);
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

test("phrases do not match across a comma or ampersand; all words in the card still reach the words level", () => {
  const artifact = artifactOf(card("a", "Standee, kệ & backdrop"));
  assert.equal(kOf(artifact, "standee kệ"), 0.7);
  assert.equal(kOf(artifact, "kệ"), 1);
});

// Owner review 2026-11-18: a correct extra word ("inox") or a filler word ("làm", "quảng cáo") lost every keyword match.
test("words level: every word somewhere in the card gives 0.7; filler words are dropped first", () => {
  const artifact = artifactOf(lamp);
  assert.equal(kOf(artifact, "hộp đèn inox"), 0.7);
  assert.equal(kOf(artifact, "hop den inox"), 0.7);
  assert.equal(kOf(artifact, "hộp đèn quảng cáo"), 1);
  assert.equal(kOf(artifact, "làm hộp đèn giá rẻ"), 1);
  assert.equal(kOf(artifact, "hộp đèn mica"), 0.4);
});

test("a query part with marks and part without still matches (hộp den)", () => {
  const artifact = artifactOf(lamp);
  assert.equal(kOf(artifact, "hộp den"), 0.85);
  assert.equal(kOf(artifact, "hop đèn"), 0.85);
  assert.equal(kOf(artifact, "hộp dèn"), 0.6);
});

// Owner review 2026-11-18: "quang" matched 198 of 203 cards, "banner" 92 and "tem" 98 through the typo level.
test("typo level skips words the catalog knows, needs the same first letter and two edits only from 7 letters", () => {
  const artifact = artifactOf(card("sign", "Bảng hiệu quán cà phê"), card("ad", "Pano quảng cáo dán tem"), card("shop", "Decal cho tiệm trà"));
  assert.equal(kOf(artifact, "quang", "vi", "sign"), 0);
  assert.equal(kOf(artifact, "quang", "vi", "ad"), 0.85);
  assert.equal(kOf(artifact, "banner", "vi", "sign"), 0);
  assert.equal(kOf(artifact, "tem", "vi", "shop"), 0);
  assert.equal(kOf(artifact, "bảng hiệy", "vi", "sign"), 0.6);
  assert.equal(kOf(artifact, "vang hiệu", "vi", "sign"), 0.4); // partial only: "vang" is not a typo of "bảng"
});

test("real catalog: no single word floods the results through typos", () => {
  const artifact = buildAdvertisingArtifact();
  for (const word of ["quang", "trang", "tem", "banner", "khung", "hop"]) {
    const typoOnly = [...keywordScores(word, "vi", artifact).values()].filter((k) => k === 0.6).length;
    assert.ok(typoOnly <= 10, `${word}: ${typoOnly} cards at the typo level`);
  }
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

test("real catalog recall: every card and every merged media is found by each part of its own title and product names", () => {
  const artifact = buildAdvertisingArtifact();
  const missing = [];
  for (const locale of ["vi", "en"]) {
    const suffix = locale === "en" ? "En" : "Vi";
    const products = new Map(artifact.products.map((product) => [product.id, product[`label${suffix}`]]));
    for (const entry of artifact.cards) {
      const items = entry.mediaItems ?? [];
      // Phrases end at a comma or ampersand (R2), so each part of a title or product name is one query.
      const queries = [entry[`title${suffix}`], ...items.map((item) => item[`title${suffix}`]),
        ...[...entry.productIds ?? [], ...items.flatMap((item) => item.productIds ?? [])].map((id) => products.get(id))]
        .flatMap((text) => text?.split(/[,&]/) ?? []).map((query) => query.trim()).filter(Boolean);
      for (const query of queries) if ((keywordScores(query, locale, artifact).get(entry.id) ?? 0) < 1) missing.push(`${locale} ${entry.id}: ${query}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("real catalog recall: every product, variant and use tag label finds every card that carries the tag", () => {
  const artifact = buildAdvertisingArtifact();
  const missing = [];
  for (const tag of artifact.tagRegistry.filter((entry) => ["product", "variant", "use"].includes(entry.group))) {
    const owners = artifact.cards.filter((entry) => [entry, ...entry.mediaItems ?? []].some((item) => item.tagIds?.includes(tag.id)));
    for (const [locale, query] of [["vi", tag.labelVi], ["vi", plain(tag.labelVi)], ["en", tag.labelEn]]) {
      const scores = keywordScores(query, locale, artifact);
      for (const entry of owners) if ((scores.get(entry.id) ?? 0) < 0.6) missing.push(`${locale} ${tag.id}: ${query} -> ${entry.id}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("real catalog: a group name alone reaches the whole group, with more words only the group cards matching them", () => {
  const artifact = buildAdvertisingArtifact();
  const group = new Set(artifact.cards.filter((entry) => entry.tagIds.includes("group-print-decals")).map((entry) => entry.id));
  const reached = (query, locale = "vi") => new Set([...keywordScores(query, locale, artifact)].filter(([, k]) => k >= 0.6).map(([id]) => id));
  for (const query of ["in ấn", "in aans", "in ấn giá rẻ"]) assert.deepEqual([...group].filter((id) => !reached(query).has(id)), [], query);
  assert.deepEqual([...group].filter((id) => !reached("printing", "en").has(id)), []);
  const menu = reached("in ấn menu");
  const menuCards = [...reached("menu")].filter((id) => group.has(id));
  assert.ok(menuCards.length > 0 && menuCards.every((id) => menu.has(id)));
  assert.ok(menu.size < group.size);
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

// 2026-11-18 review: 11 of 24 product names typed whole ("Bảng hiệu alu & mặt dựng") found no card in the keyword fallback.
test("real catalog: a whole product name, with or without marks, reaches every card of that product at keywordMin", () => {
  const artifact = buildAdvertisingArtifact();
  const missing = [];
  for (const locale of ["vi", "en"]) {
    const suffix = locale === "en" ? "En" : "Vi";
    for (const product of artifact.products) {
      const owners = artifact.cards.filter((c) => [c.productIds, ...(c.mediaItems ?? []).map((m) => m.productIds)].some((ids) => ids?.includes(product.id)));
      for (const query of [product[`label${suffix}`], plain(product[`label${suffix}`])]) {
        const scores = keywordScores(query, locale, artifact);
        for (const c of owners) if ((scores.get(c.id) ?? 0) < 0.6) missing.push(`${locale} ${query}: ${c.id}`);
      }
    }
  }
  assert.deepEqual(missing, []);
});

// Advisor review 2026-11-18: unaccented fillers are also real words ("cua": của or cửa, "cho": cho or chợ, "gia": giá or gia).
test("real catalog: filler words never widen an unaccented query, and fillers alone match nothing", () => {
  const artifact = buildAdvertisingArtifact();
  const atLeast = (query, k) => [...keywordScores(query, "vi", artifact).values()].filter((v) => v >= k).length;
  assert.equal(atLeast("cua hang", 0.85), atLeast("cửa hàng", 1));
  assert.equal(atLeast("hoi cho", 0.85), atLeast("hội chợ", 1));
  assert.ok(atLeast("bien cho", 0.6) <= 2);
  assert.equal(atLeast("gia cong", 0.6), 0);
  assert.equal(keywordScores("làm cho", "vi", artifact).size, 0);
  assert.equal(atLeast("den den", 0.6), 0);
  assert.ok(atLeast("lam hop den", 0.85) >= atLeast("hộp đèn", 1));
  assert.equal(atLeast("bảng quảng cáo", 1), 3);
});
