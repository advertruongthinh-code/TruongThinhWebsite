// Allowed crop ratios per placement (layout-library R7, cms-plan part 2 E10).
import assert from "node:assert/strict";
import test from "node:test";
import { CARD_RATIOS, RATIOS, allowedRatios, matchesRatio, ratioErrors } from "../../src/cms/ratios.mjs";
import { shapeErrors } from "../../src/cms/contract.mjs";
import { seed } from "./seed.mjs";

const R = (w, h) => [w, h];
const crop = ([w, h], scale = 300) => [0, 0, w * scale, h * scale];
// Every placement of R7 with its exact list; a ratio no list has.
const TABLE = [
  [{ type: "media-single", position: "wide" }, 0, [R(3, 2), R(4, 3), R(16, 9), R(1, 1)]],
  [{ type: "media-single", position: "left-2-3" }, 0, [R(3, 2), R(4, 3), R(1, 1)]],
  [{ type: "media-single", position: "right-2-3" }, 0, [R(3, 2), R(4, 3), R(1, 1)]],
  [{ type: "media-text" }, 0, [R(2, 3), R(3, 4)]],
  [{ type: "media-pair", layout: "equal" }, 1, [R(2, 3), R(3, 4), R(3, 2)]],
  [{ type: "media-pair", layout: "left-large" }, 0, [R(3, 2), R(2, 3), R(4, 5)]],
  [{ type: "media-pair", layout: "left-large" }, 1, [R(2, 3), R(3, 4), R(1, 1)]],
  [{ type: "media-pair", layout: "right-large" }, 1, [R(3, 2), R(2, 3), R(4, 5)]],
  [{ type: "media-pair", layout: "right-large" }, 0, [R(2, 3), R(3, 4), R(1, 1)]],
  [{ type: "media-carousel" }, 3, [R(2, 3), R(3, 2), R(3, 4), R(1, 1)]],
  ["card", 0, [R(3, 2), R(2, 3), R(1, 1), R(4, 3), R(3, 4), R(4, 5), R(16, 9), R(2, 1)]],
];

test("R7: every placement allows exactly its listed ratios, within 1%, and not 21:9", () => {
  for (const [block, index, ratios] of TABLE) {
    const allowed = allowedRatios("news", block, index);
    assert.deepEqual(allowed, ratios, JSON.stringify(block));
    for (const ratio of ratios) {
      assert.ok(allowed.some((each) => matchesRatio(crop(ratio), each)));
      assert.ok(matchesRatio([0, 0, Math.round(ratio[0] * 300 * 1.008), ratio[1] * 300], ratio), "0.8% off still matches");
      assert.ok(!matchesRatio([0, 0, Math.round(ratio[0] * 300 * 1.02), ratio[1] * 300], ratio), "2% off does not");
    }
    assert.ok(!allowed.some((each) => matchesRatio(crop(R(21, 9)), each)));
  }
  assert.deepEqual(RATIOS["media-single"].video, [R(16, 9)]);
  assert.equal(CARD_RATIOS.length, 8);
});

test("R7: cover frames have no list (hero-project, half-width single, non-page types)", () => {
  assert.equal(allowedRatios("news", { type: "hero-project" }), null);
  assert.equal(allowedRatios("news", { type: "media-single", position: "left-1-2" }), null);
  assert.equal(allowedRatios("hero-slide", { type: "media-single", position: "wide" }), null);
});

const r2 = { id: "anh-moi", kind: "image", source: "r2", width: 3000, height: 3000 };
const repo = { ...r2, id: "anh-cu", source: "repo" };
const media = new Map([[r2.id, r2], [repo.id, repo]]);
const page = (block) => ({ id: "bai", blocks: [block] });

test("crop-ratio: a wrong R2 crop is a shape error; the full frame of a repo photo and a seeded placement are not checked", () => {
  const wrong = page({ type: "media-text", image: { mediaId: "anh-moi", crop: [0, 0, 3000, 1000] } });
  assert.deepEqual(ratioErrors("news", wrong, media, "bai").map(({ code, level }) => `${code} ${level}`), ["crop-ratio shape"]);
  assert.deepEqual(ratioErrors("news", page({ type: "media-text", image: { mediaId: "anh-moi", crop: [0, 0, 2000, 3000] } }), media, "bai"), []);
  // No crop is the whole frame: 1:1 is not a media-text ratio for an R2 photo, but a repo photo keeps its frame.
  assert.equal(ratioErrors("news", page({ type: "media-text", image: { mediaId: "anh-moi" } }), media, "bai").length, 1);
  assert.deepEqual(ratioErrors("news", page({ type: "media-text", image: { mediaId: "anh-cu" } }), media, "bai"), []);
  assert.equal(ratioErrors("news", page({ type: "media-text", image: { mediaId: "anh-cu", crop: [0, 0, 3000, 1000] } }), media, "bai").length, 1, "a changed crop of a repo photo is checked");
  assert.deepEqual(ratioErrors("news", page({ type: "media-text", image: { mediaId: "anh-moi", legacySrc: "/assets/content/x.webp" } }), media, "bai"), []);
});

test("crop-ratio: the two images of an equal pair share one ratio; card media of Advertising and project cards use the 8 frames", () => {
  const pair = (second) => page({ type: "media-pair", layout: "equal", images: [{ mediaId: "anh-moi", crop: [0, 0, 2000, 3000] }, { mediaId: "anh-moi", crop: second }] });
  assert.deepEqual(ratioErrors("news", pair([0, 0, 2000, 3000]), media, "bai"), []);
  assert.equal(ratioErrors("news", pair([0, 0, 3000, 2000]), media, "bai").length, 1);
  assert.equal(ratioErrors("advertising-card", { id: "c", mediaItems: [{ mediaId: "anh-moi", crop: [0, 0, 3000, 1000] }] }, media, "c").length, 1);
  assert.deepEqual(ratioErrors("project", { id: "p", card: { media: [{ mediaId: "anh-moi", crop: [0, 0, 3000, 1500] }] } }, media, "p"), []);
});

test("crop-ratio: every repo record passes shapeErrors (seeded frames outside the lists are exempt)", async () => {
  const { records, ctx } = seed();
  for (const { type, id, data } of records.filter((record) => record.type !== "media")) {
    assert.deepEqual((await shapeErrors(type, data, { ...ctx, id })).filter(({ code }) => code === "crop-ratio"), [], `${type} ${id}`);
  }
});
