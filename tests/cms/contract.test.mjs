import assert from "node:assert/strict";
import test from "node:test";
import { fullErrors, recordName, recordSlugs, shapeErrors } from "../../src/cms/contract.mjs";
import { seed } from "./seed.mjs";

test("every seeded record has no shape and no missing errors", async () => {
  const { records, ctx } = seed();
  for (const { type, id, data } of records) {
    assert.deepEqual(await shapeErrors(type, data, { ...ctx, id: id === "main" ? undefined : id }), [], `${type} ${id} shape`);
    assert.deepEqual(await fullErrors(type, data, ctx), [], `${type} ${id} full`);
  }
});

test("news post without cover.width stays draft with its id and field (cms-content R1)", async () => {
  const { ctx, find } = seed();
  const post = find("news", "chon-tu-bep");
  delete post.cover.width;
  assert.deepEqual(await shapeErrors("news", post, ctx), []);
  const errors = await fullErrors("news", post, ctx);
  assert.ok(errors.some(({ message, level }) => level === "missing" && message.includes("chon-tu-bep.cover") && message.includes("width")), JSON.stringify(errors));
});

test("project card with one media is missing; card media outside the page is a shape error (cms-content R4)", async () => {
  const { ctx, find } = seed();
  const page = find("project", "can-ho-go-soi");
  page.card.media = [{ ...page.cover }];
  assert.deepEqual(await shapeErrors("project", page, ctx), []);
  assert.ok((await fullErrors("project", page, ctx)).some(({ message }) => message.endsWith("card công trình cần ít nhất 2 media")));
  const other = [...ctx.mediaById.keys()].find((id) => id !== page.cover.mediaId && !JSON.stringify(page).includes(`"${id}"`));
  page.card.media = [{ ...page.cover, mediaId: other }];
  assert.ok((await shapeErrors("project", page, ctx)).some(({ code }) => code === "card-media"));
});

test("crop outside the image, unknown media, bad id and unknown block are shape errors", async () => {
  const { ctx, find } = seed();
  const page = find("project", "can-ho-go-soi");
  const media = ctx.mediaById.get(page.cover.mediaId);
  page.cover.crop = [0, 0, media.width + 1, media.height];
  page.blocks[0].type = "nope";
  page.blocks.find((block) => block.image).image.mediaId = "missing-media";
  const codes = (await shapeErrors("project", page, { ...ctx, id: "other" })).map(({ code, message }) => code ?? message);
  assert.ok(codes.includes("crop"));
  assert.ok(codes.includes("media-unknown"));
  assert.ok(codes.some((text) => text.includes("differs from record id")));
  assert.ok(codes.some((text) => text.includes("unknown block type nope")));
  assert.deepEqual(await shapeErrors("menu", { id: "main", featuredProjects: [], featuredProductGroups: [] }), [{ message: "menu: a single record has no id field", level: "shape" }]);
  assert.deepEqual(await shapeErrors("news", { id: "draft-post", layout: "news-2-5" }), [], "a draft may lack optional fields");
});

test("record names and slugs follow Q5", () => {
  const { find } = seed();
  const post = find("news", "chon-tu-bep");
  assert.equal(recordName("news", post), post.title.vi);
  assert.deepEqual(recordSlugs("news", post), { vi: post.slugVi, en: post.slugEn });
  assert.equal(recordName("menu", {}), "main");
  assert.deepEqual(recordSlugs("media", { id: "x" }), { vi: null, en: null });
});
