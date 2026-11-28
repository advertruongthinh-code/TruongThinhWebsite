import assert from "node:assert/strict";
import test from "node:test";
import { LAYOUTS, layoutErrors } from "../../src/cms/layouts.mjs";
import { ratioErrors } from "../../src/cms/ratios.mjs";
import { blockTexts, fitCrops, kindOf, layoutChoices, pageMedia, relayout } from "../../src/cms/page-model.mjs";

const item = (n) => ({ image: { mediaId: `m${n}`, crop: [0, 0, 1200, 800] } });
const media = (count) => Array.from({ length: count }, (_, n) => item(n));
const withLayout = (kind, id, blocks) => ({ id: "p", layout: id, blocks });

test("every layout rebuilds to a chain layoutErrors accepts, at its lowest and highest media count", () => {
  for (const [id, { kind, min, max }] of Object.entries(LAYOUTS)) {
    for (const count of new Set([min, Math.min(max, min + 3), max])) {
      const { blocks, error } = relayout(kind, { blocks: [] }, id, media(count));
      assert.equal(error, undefined, `${id} ${count}`);
      assert.deepEqual(layoutErrors(kind, withLayout(kind, id, blocks)).filter((e) => e.level === "shape"), [], `${id} ${count}`);
      assert.equal(pageMedia({ blocks }).length, count, `${id} ${count}`);
      assert.equal(new Set(blocks.map((block) => block.id)).size, blocks.length, `${id} ids`);
    }
  }
});

test("switching layout keeps the text and ids of blocks of the same type, in order", () => {
  const first = relayout("news", { blocks: [] }, "news-2-5", media(3)).blocks;
  first[0].text = { vi: "mở bài", en: "intro" };
  const second = relayout("news", { blocks: first }, "news-6-11", media(7)).blocks;
  assert.equal(second[0].id, first[0].id);
  assert.deepEqual(second[0].text, { vi: "mở bài", en: "intro" });
  assert.equal(second.some((block) => block.type === "quote"), false, "no quote the page did not have");
  const withQuote = relayout("news", { blocks: [...second, { id: "q", type: "quote", text: { vi: "a", en: "b" } }] }, "news-6-11", media(7)).blocks;
  assert.ok(withQuote.some((block) => block.type === "quote"));
});

test("a count the layout cannot hold is an error, not a broken page", () => {
  assert.equal(relayout("news", { blocks: [] }, "news-2-5", media(6)).error, "over-max");
  assert.equal(relayout("news", { blocks: [] }, "news-6-11", media(5)).error, "below-min");
});

test("layoutChoices opens by count and words what is missing or too much (R4)", () => {
  const rows = Object.fromEntries(layoutChoices("news", 5).map((row) => [row.id, row]));
  assert.equal(rows["news-2-5"].open, true);
  assert.equal(rows["news-6-11"].open, false);
  assert.equal(rows["news-6-11"].note, "thêm 1 media để mở");
  assert.equal(layoutChoices("news", 7).find((row) => row.id === "news-2-5").note, "bớt 2 media hoặc chọn layout lớn hơn");
  assert.equal(layoutChoices("news", 1).find((row) => row.id === "news-2-5").open, true, "the lowest layout always opens");
  assert.equal(kindOf("project"), "projects");
});

test("fitCrops gives a new placement a centred crop at the nearest allowed ratio, one ratio per equal pair", async () => {
  const mediaById = new Map([["m0", { id: "m0", width: 3000, height: 2000, source: "upload" }], ["m1", { id: "m1", width: 2000, height: 3000, source: "upload" }]]);
  const blocks = [{ id: "a", type: "media-pair", layout: "equal", images: [{ mediaId: "m0" }, { mediaId: "m1" }] }];
  const data = { id: "p", blocks };
  fitCrops("news", data, mediaById);
  const [one, two] = blocks[0].images;
  assert.deepEqual(one.crop, [0, 0, 3000, 2000]);
  assert.equal(two.crop[2] / two.crop[3] > 1.4, true, "the second image follows the pair's 3:2");
  assert.deepEqual(ratioErrors("news", data, mediaById, "p"), []);
});

test("blockTexts lists every vi/en text of a block and skips images", () => {
  const found = blockTexts({ type: "facts-grid", items: [{ label: { vi: "a", en: "b" }, text: { vi: "c", en: "d" } }], image: { altVi: "x", altEn: "y" } });
  assert.deepEqual(found.map(({ path }) => path.join(".")), ["items.0.label", "items.0.text"]);
});

test("relayout answers an error, not a throw, for the legacy layout", () => {
  assert.equal(relayout("news", { blocks: [] }, "legacy", []).error, "layout-unknown");
});
