// Project card media point at the page's own media (cms-plan part 2 E9; cms-content R4, cms-editor-media R7).
import assert from "node:assert/strict";
import test from "node:test";
import { fullErrors, pageMediaIds, shapeErrors } from "../../src/cms/contract.mjs";
import { materialize, mediaRefs } from "../../src/cms/media-ref.mjs";
import { seed } from "./seed.mjs";

const codes = (errors) => errors.map(({ code }) => code);
// A seeded project whose card media all keep legacySrc, and two of its page media.
const setup = () => {
  const { ctx, find } = seed();
  const page = find("project", "can-ho-go-soi");
  const [first, second] = [...pageMediaIds(page)];
  return { ctx, page, first, second };
};

test("pageMediaIds: cover and block images, never the card", () => {
  const { page, first } = setup();
  assert.equal(first, page.cover.mediaId);
  assert.equal(pageMediaIds({ ...page, blocks: [] }).size, 1);
  assert.ok(![...pageMediaIds({ cover: page.cover, card: { media: [{ mediaId: "x" }] } })].includes("x"));
});

test("a seeded card (legacySrc on every media) passes even when its media are not page media", async () => {
  const { ctx, page } = setup();
  assert.ok(page.card.media.every((ref) => ref.legacySrc !== undefined));
  page.card.media = page.card.media.map((ref) => ({ ...ref, mediaId: "not-on-this-page" }));
  assert.deepEqual(codes(await shapeErrors("project", page, ctx)), []);
});

test("removing a page media the card still uses is a 400 card-foreign shape error", async () => {
  const { ctx, page, first, second } = setup();
  page.card.media = [{ mediaId: first, crop: [0, 0, 10, 10] }, { mediaId: second, crop: [0, 0, 10, 10] }];
  assert.deepEqual(codes(await shapeErrors("project", page, ctx)), []);
  // Every block image of the second media now shows the cover media: the card's second media is no longer on the page.
  for (const ref of mediaRefs("news", page)) if (ref.mediaId === second) Object.assign(ref, structuredClone(page.cover));
  assert.ok(!pageMediaIds(page).has(second));
  assert.deepEqual(codes(await shapeErrors("project", page, ctx)), ["card-foreign"]);
});

test("a card with one media is missing card-min, not a shape error", async () => {
  const { ctx, page } = setup();
  page.card.media = page.card.media.slice(0, 1);
  assert.deepEqual(await shapeErrors("project", page, ctx), []);
  const errors = await fullErrors("project", page, ctx);
  assert.deepEqual(errors.filter(({ code }) => code === "card-min").map(({ level }) => level), ["missing"]);
});

test("a crop sent with legacySrc resets the placement: legacySrc goes, src and size come from the media", async () => {
  const { ctx, page, first } = setup();
  const media = ctx.mediaById.get(first);
  const seeded = page.card.media[0];
  page.card.media[0] = { ...seeded, mediaId: first, crop: [0, 0, media.width, media.height] };
  const { data } = await materialize("project", page, ctx.mediaById);
  const { legacySrc: _, ...rest } = seeded;
  assert.deepEqual(data.card.media[0], { ...rest, mediaId: first, crop: [0, 0, media.width, media.height], src: media.path, width: media.width, height: media.height,
    altVi: media.altVi, altEn: media.altEn });
  assert.deepEqual(data.card.media[1], page.card.media[1], "a seeded placement without a crop stays as it is");
  // The crop is checked like any placement's, and it must be a media of the page.
  page.card.media[0].crop = [0, 0, media.width + 1, media.height];
  assert.deepEqual(codes(await shapeErrors("project", page, ctx)), ["crop"]);
  page.card.media[0] = { ...seeded, crop: [0, 0, 1, 1] };
  assert.ok(codes(await shapeErrors("project", page, ctx)).includes("card-foreign"));
});
