import assert from "node:assert/strict";
import test from "node:test";
import { materialize, variantKey } from "../../src/cms/media-ref.mjs";
import { seed } from "./seed.mjs";

test("variantKey is a fixed 32-hex digest of hash, crop and recipe", async () => {
  assert.equal(await variantKey("sha256:ab", [0, 0, 10, 10]), "ce14db50d483a326bc2521fb79c92c61");
});

test("materialize is a no-op on seeded records", async () => {
  const { records, ctx } = seed();
  for (const { type, data } of records) assert.deepEqual((await materialize(type, data, ctx.mediaById)).data, data, `${type} ${data.id}`);
});

test("materialize overwrites client fields, keeps legacySrc and dedupes uses", async () => {
  const { ctx, find } = seed();
  const page = find("project", "can-ho-go-soi");
  const id = page.cover.mediaId;
  const media = { ...ctx.mediaById.get(id), hash: "sha256:ab" };
  const mediaById = new Map([...ctx.mediaById, [id, media]]);
  Object.assign(page.cover, { src: "https://evil.example/x.webp", width: 1, altVi: "x" });
  const image = page.blocks.find((block) => block.image)?.image ?? page.blocks.find((block) => block.images).images[0];
  Object.assign(image, { mediaId: id, crop: [0, 0, 10, 10] });
  page.blocks.find((block) => block.images).images[0] = structuredClone(image);
  const legacy = structuredClone(page.card.media[0]);
  const { data, uses } = await materialize("project", page, mediaById);
  assert.equal(data.cover.src, media.path);
  assert.equal(data.cover.width, media.width);
  assert.equal(data.cover.altVi, media.altVi);
  const key = await variantKey("sha256:ab", [0, 0, 10, 10]);
  assert.equal(data.blocks.find((block) => block.images).images[0].src, `/v/${key}/${id}.webp`);
  assert.deepEqual(data.card.media[0], legacy);
  assert.equal(uses.filter((use) => use.key === key).length, 1);
  assert.deepEqual(uses.find((use) => use.key === key), { mediaId: id, key, crop: "0,0,10,10" });
  assert.ok(uses.some((use) => use.mediaId === id && use.key === "" && use.crop === ""));
});
