// Page layouts locked by media count (cms-content R5, cms-plan Q5): media split, block chain, the six save rules, and the running pages.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { LAYOUTS, assignMedia, expandLayout, layoutErrors } from "../../src/cms/layouts.mjs";

const content = (kind) => JSON.parse(readFileSync(new URL(`../../src/site/content/${kind}.json`, import.meta.url), "utf8"));
const slotsOf = (id) => LAYOUTS[id].chain.filter((entry) => entry.min !== undefined).map((slot, index) => ({ ...slot, fill: slot.fill ?? index }));
const mediaOf = (signature) => Number(signature.split("#")[1] ?? 0);

// A page built from the expected chain: media blocks carry as many images as their signature says.
const pageOf = (id, count, extra = {}) => ({
  layout: id,
  blocks: expandLayout(id, count).blocks.filter(({ optional }) => !optional).map(({ signature }) => {
    const [head, media] = signature.split("#");
    const [type, variant] = head.split(":");
    const block = { type };
    if (type === "media-single") block.position = variant;
    if (type === "media-pair") block.layout = variant;
    if (media === undefined) return block;
    return Number(media) === 1 && type !== "media-carousel" && type !== "media-pair" ? { ...block, image: {} } : { ...block, images: Array.from({ length: Number(media) }, () => ({})) };
  }),
  ...extra,
});

test("(a) every layout and media count splits exactly and keeps carousels within 2 to 12", () => {
  for (const [id, row] of Object.entries(LAYOUTS)) {
    for (let count = row.min; count <= row.max; count += 1) {
      const { counts } = assignMedia(count, slotsOf(id));
      assert.ok(counts, `${id} ${count}`);
      assert.equal(counts.reduce((sum, value) => sum + value, 0), count, `${id} ${count}`);
      const { blocks } = expandLayout(id, count);
      assert.equal(blocks.reduce((sum, { signature }) => sum + mediaOf(signature), 0), count);
      for (const { signature } of blocks.filter(({ signature }) => signature.startsWith("media-carousel"))) {
        assert.ok(mediaOf(signature) >= 2 && mediaOf(signature) <= 12, `${id} ${count} ${signature}`);
      }
      assert.deepEqual(layoutErrors(row.kind, pageOf(id, count)), [], `${id} ${count}`);
    }
  }
});

test("(b) news-2-5 with 4 media drops the empty block and its paragraph", () => {
  assert.deepEqual(expandLayout("news-2-5", 4).blocks.map(({ signature }) => signature), [
    "paragraph", "media-single:wide#1", "paragraph", "media-pair:equal#2", "paragraph", "media-single:right-2-3#1", "contact-quick", "news-cards", "cta-arrow",
  ]);
});

test("(c) project-10-12 with 11 media fills the last single first, then the carousel", () => {
  const signatures = expandLayout("project-10-12", 11).blocks.map(({ signature }) => signature);
  assert.ok(signatures.includes("media-carousel#4"));
  assert.equal(signatures.filter((signature) => signature === "media-single:wide#1").length, 2);
});

test("(d) a 5-media post on news-6-11 is locked and needs 1 more media", () => {
  assert.deepEqual(layoutErrors("news", pageOf("news-2-5", 5, { layout: "news-6-11" })), [
    { message: "layout news-6-11 needs 1 more media", level: "shape", code: "layout-locked", missing: 1 },
  ]);
});

test("(e) quote is optional on news-6-11", () => {
  const withQuote = pageOf("news-6-11", 8);
  const at = withQuote.blocks.findIndex((block) => block.type === "media-pair") + 1;
  withQuote.blocks.splice(at, 0, { type: "quote" });
  assert.deepEqual(layoutErrors("news", withQuote), []);
  assert.deepEqual(layoutErrors("news", pageOf("news-6-11", 8)), []);
});

test("save rules: unknown, legacy, lowest row below min, over max, chain", () => {
  assert.equal(layoutErrors("news", { layout: "project-4-5", blocks: [] })[0].code, "layout-unknown");
  assert.equal(layoutErrors("news", { id: "nope", layout: "legacy", blocks: [] })[0].code, "layout-unknown");
  assert.deepEqual(layoutErrors("news", pageOf("news-2-5", 2, { blocks: pageOf("news-2-5", 2).blocks.slice(0, 1) })), [
    { message: "needs at least 2 media, has 0", level: "missing", code: "media-min", missing: 2 },
  ]);
  assert.deepEqual(layoutErrors("projects", { ...pageOf("project-6-7-a", 7), layout: "project-4-5" }), [
    { message: "layout project-4-5 holds at most 5 media, has 7", level: "missing", code: "media-max", extra: 2 },
  ]);
  const swapped = pageOf("project-6-7-a", 6);
  swapped.blocks.splice(3, 2, swapped.blocks[4], swapped.blocks[3]);
  assert.deepEqual(layoutErrors("projects", swapped), [{ message: "blocks do not match layout project-6-7-a at block 3", level: "shape", code: "layout-chain" }]);
});

test("(f, g) every running page passes, with 7 legacy, 5 project-6-7-a and 6 project-6-7-b pages", () => {
  const pages = [...content("projects").map((page) => ["projects", page]), ...content("news").map((page) => ["news", page])];
  for (const [kind, page] of pages) assert.deepEqual(layoutErrors(kind, page), [], page.id);
  const count = (layout) => pages.filter(([, page]) => page.layout === layout).length;
  assert.deepEqual([count("legacy"), count("project-6-7-a"), count("project-6-7-b")], [7, 5, 6]);
  const legacy = content("projects").find((page) => page.layout === "legacy");
  legacy.blocks.reverse();
  assert.equal(layoutErrors("projects", legacy)[0].code, "layout-chain");
});
