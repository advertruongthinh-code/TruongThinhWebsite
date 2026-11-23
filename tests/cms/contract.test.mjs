import { readFileSync } from "node:fs";
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
  delete page.card;
  assert.ok((await fullErrors("project", page, ctx)).some(({ message }) => message.endsWith("card công trình cần ít nhất 2 media")), "a page without a card misses it too");
  page.card = { width: 1, height: 1, media: [] };
  const other = [...ctx.mediaById.keys()].find((id) => id !== page.cover.mediaId && !JSON.stringify(page).includes(`"${id}"`));
  page.card.media = [{ ...page.cover, mediaId: other }];
  assert.ok((await shapeErrors("project", page, ctx)).some(({ code }) => code === "card-foreign"));
});

test("a placement of a video media is a media-kind shape error, and a video media needs duration and posterId (P9)", async () => {
  const { ctx, find } = seed();
  const page = find("project", "can-ho-go-soi");
  const video = { id: "clip-01", kind: "video", mime: "video/mp4", source: "r2", width: 1920, height: 1080, altVi: "v", altEn: "v", duration: 12.5, posterId: "poster-01" };
  const mediaById = new Map([...ctx.mediaById, [video.id, video]]);
  assert.ok((await shapeErrors("project", { ...page, cover: { ...page.cover, mediaId: video.id } }, { ...ctx, mediaById })).some(({ code }) => code === "media-kind"));
  assert.deepEqual(await fullErrors("media", video, ctx), []);
  const bad = (await fullErrors("media", { ...video, duration: 0, posterId: "Bad Id" }, ctx)).map(({ message }) => message);
  assert.deepEqual(bad, ["clip-01: duration must be a positive number", "clip-01: posterId must be a media id"]);
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
  const menu = JSON.parse(readFileSync(new URL("../../src/site/content/menu.json", import.meta.url), "utf8"));
  assert.deepEqual(await shapeErrors("menu", { id: "main", ...menu }), [{ message: "menu: a single record has no id field", level: "shape" }]);
  assert.deepEqual(await shapeErrors("news", { id: "draft-post", layout: "news-2-5" }), [], "a draft may lack optional fields");
});

test("legacySrc cannot carry a client src; a placement needs mediaId or legacySrc", async () => {
  const { ctx, find } = seed();
  const page = find("project", "can-ho-go-soi");
  page.card.media[0] = { ...page.card.media[0], src: "https://evil.example/x.webp" };
  assert.ok((await shapeErrors("project", page, ctx)).some(({ code }) => code === "legacy-src"));
  page.card.media[0] = { ...page.card.media[0], src: "https://evil.example/x.webp", legacySrc: "https://evil.example/x.webp" };
  assert.ok((await shapeErrors("project", page, ctx)).some(({ code }) => code === "legacy-src"));
  const post = find("news", "chon-tu-bep");
  delete post.cover.mediaId;
  assert.ok((await shapeErrors("news", post, ctx)).some(({ code }) => code === "media-id"));
});

test("record names and slugs follow Q5", () => {
  const { find } = seed();
  const post = find("news", "chon-tu-bep");
  assert.equal(recordName("news", post), post.title.vi);
  assert.deepEqual(recordSlugs("news", post), { vi: post.slugVi, en: post.slugEn });
  assert.equal(recordName("menu", {}), "main");
  assert.deepEqual(recordSlugs("media", { id: "x" }), { vi: null, en: null });
});

test("bad marks in a block are shape errors with a code, reported once (cms-plan part 2 E1)", async () => {
  const { ctx, find } = seed();
  const post = find("news", "chon-tu-bep");
  const block = post.blocks.find(({ type }) => type === "paragraph");
  block.text = { vi: "**gỗ", en: "**wood**" };
  const shapes = await shapeErrors("news", post, ctx);
  assert.deepEqual(shapes.map(({ level, code }) => [level, code]), [["shape", "mark-unclosed"]], JSON.stringify(shapes));
  const full = await fullErrors("news", post, ctx);
  assert.ok(!full.some(({ message }) => message.includes("no closing mark")), JSON.stringify(full));
});
