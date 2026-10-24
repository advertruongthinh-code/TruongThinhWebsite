import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ADVERTISING_CARDS,
  buildAdvertisingArtifact,
} from "../../src/site/advertising-products/catalog.mjs";
import { validateAdvertisingCardMedia, validateAdvertisingMediaPool } from "../../src/site/advertising-products/media-contract.mjs";
import { ADVERTISING_MEDIA_MANIFEST } from "../../src/site/advertising-products/media-manifest.mjs";
import { ADVERTISING_TAG_REGISTRY } from "../../src/site/advertising-products/photo-tags.mjs";
import { ADVERTISING_CLUSTERS, ADVERTISING_PRODUCTS } from "../../src/site/advertising-products/taxonomy.mjs";

const poolOptions = { tagRegistry: ADVERTISING_TAG_REGISTRY, clusters: ADVERTISING_CLUSTERS, products: ADVERTISING_PRODUCTS };

function imageItem(record) {
  return { id: record.id, kind: "image", ...record.media };
}

function videoItem(record) {
  return {
    id: `${record.id}-clip`,
    kind: "video",
    sourceId: `test:m00b:${record.id}:clip`,
    src: `/assets/test/${record.id}-clip.mp4`,
    width: 480,
    height: 320,
    altVi: "Video mẫu sản phẩm",
    altEn: "Sample product video",
    source: `test:m00b:${record.id}:clip`,
    sha256: "a".repeat(64),
    provenance: "Test-only synthetic M00b clip; no public media asset.",
    posterSrc: `/assets/test/${record.id}-poster.webp`,
    posterWidth: 480,
    posterHeight: 320,
    durationSeconds: 2.4,
    hasAudio: true,
  };
}

test("canonical 269 image cards expose one stable cover item without changing legacy media", () => {
  assert.equal(ADVERTISING_MEDIA_MANIFEST.length, 269);
  assert.equal(ADVERTISING_CARDS.length, 269);
  for (const record of ADVERTISING_MEDIA_MANIFEST) {
    assert.equal(record.coverMediaId, record.id);
    assert.deepEqual(record.mediaItems, [imageItem(record)]);
    const card = ADVERTISING_CARDS.find(({ id }) => id === record.id);
    assert.deepEqual(card.media, record.media);
    assert.deepEqual(card.mediaItems, record.mediaItems);
    assert.equal(card.coverMediaId, record.coverMediaId);
  }
});

test("parent and related cards retain ordered image/video items, cover IDs, and legacy image media", () => {
  const parentBase = ADVERTISING_MEDIA_MANIFEST.find(({ id }) => id === "kiosk-posm-04");
  const relatedBase = ADVERTISING_MEDIA_MANIFEST.find(({ id }) => id === "signage-raised-letters-06");
  const parent = {
    ...parentBase,
    coverMediaId: parentBase.id,
    mediaItems: [imageItem(parentBase), videoItem(parentBase)],
  };
  const related = {
    ...relatedBase,
    coverMediaId: `${relatedBase.id}-clip`,
    mediaItems: [videoItem(relatedBase), imageItem(relatedBase)],
  };
  const pool = ADVERTISING_MEDIA_MANIFEST.map((record) =>
    record.id === parent.id ? parent : record.id === related.id ? related : record);
  assert.equal(validateAdvertisingMediaPool(pool, poolOptions), pool);

  const artifact = buildAdvertisingArtifact({ cards: [parent, related] });
  // Artifact xếp card theo thứ tự cụm, không theo thứ tự đầu vào.
  assert.deepEqual(artifact.cards.map(({ id }) => id).sort(), [parent.id, related.id].sort());
  for (const input of [parent, related]) {
    const card = artifact.cards.find(({ id }) => id === input.id);
    assert.deepEqual(card.media, input.media);
    assert.deepEqual(card.mediaItems, input.mediaItems);
    assert.equal(card.coverMediaId, input.coverMediaId);
    assert.ok(Object.isFrozen(card.mediaItems));
  }
});

test("media contract rejects missing cover and duplicate media IDs", () => {
  const record = ADVERTISING_MEDIA_MANIFEST.find(({ id }) => id === "kiosk-posm-04");
  const good = { ...record, mediaItems: [imageItem(record), videoItem(record)] };
  assert.throws(() => buildAdvertisingArtifact({ cards: [{ ...good, coverMediaId: "missing" }] }), /coverMediaId/i);
  assert.throws(() => buildAdvertisingArtifact({ cards: [{ ...good, mediaItems: [imageItem(record), { ...videoItem(record), id: record.id }] }] }), /duplicate media id/i);
});

test("media contract rejects two media of one card sharing an alt (media-seo R3)", () => {
  const record = ADVERTISING_MEDIA_MANIFEST.find(({ id }) => id === "kiosk-posm-04");
  const twin = { ...videoItem(record), altVi: record.media.altVi };
  assert.throws(() => buildAdvertisingArtifact({ cards: [{ ...record, mediaItems: [imageItem(record), twin] }] }),
    new RegExp(`${record.id} and ${twin.id} share alt`));
});

test("video items require poster, duration, audio flag, and provenance", () => {
  const record = ADVERTISING_MEDIA_MANIFEST.find(({ id }) => id === "kiosk-posm-04");
  for (const [field, value] of Object.entries({
    posterSrc: "",
    durationSeconds: 0,
    hasAudio: undefined,
    provenance: "",
  })) {
    const item = { ...videoItem(record), [field]: value };
    const card = { ...record, mediaItems: [imageItem(record), item] };
    assert.throws(() => buildAdvertisingArtifact({ cards: [card] }), new RegExp(field, "i"));
  }
});

test("scaled 3:2 image, video, and poster accept a video cover", () => {
  const record = ADVERTISING_MEDIA_MANIFEST.find(({ id }) => id === "kiosk-posm-04");
  const video = videoItem(record);
  const card = { ...record, mediaItems: [imageItem(record), video], coverMediaId: video.id };
  assert.deepEqual(validateAdvertisingCardMedia(card), { mediaItems: card.mediaItems, coverMediaId: video.id });
});

test("mixed 3:2 and 16:9 media are rejected for either cover kind", () => {
  const record = ADVERTISING_MEDIA_MANIFEST.find(({ id }) => id === "kiosk-posm-04");
  const image = imageItem(record);
  const video = { ...videoItem(record), width: 640, height: 360 };
  assert.throws(() => validateAdvertisingCardMedia({ ...record, mediaItems: [image, video], coverMediaId: image.id }), /ratio/i);
  const wideVideo = { ...video, posterWidth: 640, posterHeight: 360 };
  assert.throws(() => validateAdvertisingCardMedia({ ...record, mediaItems: [wideVideo, image], coverMediaId: video.id }), /ratio/i);
});

test("image and video intrinsic dimensions must be positive safe integers", () => {
  const record = ADVERTISING_MEDIA_MANIFEST.find(({ id }) => id === "kiosk-posm-04");
  for (const item of [imageItem(record), videoItem(record)]) {
    for (const { field, value } of [
      { field: "width", value: undefined },
      { field: "height", value: undefined },
      { field: "width", value: 1.5 },
      { field: "height", value: 0 },
      { field: "width", value: Number.MAX_SAFE_INTEGER + 1 },
    ]) {
      assert.throws(() => validateAdvertisingCardMedia({ ...record, coverMediaId: item.id, mediaItems: [{ ...item, [field]: value }] }), /width and height/i);
    }
  }
  const { mediaItems: _mediaItems, coverMediaId: _coverMediaId, ...legacy } = record;
  assert.throws(() => validateAdvertisingCardMedia({ ...legacy, media: { ...legacy.media, width: 1.5 } }), /width and height/i);
});

test("video poster dimensions are required positive safe integers with the card ratio", () => {
  const record = ADVERTISING_MEDIA_MANIFEST.find(({ id }) => id === "kiosk-posm-04");
  for (const { field, value } of [
    { field: "posterWidth", value: undefined },
    { field: "posterHeight", value: undefined },
    { field: "posterWidth", value: 1.5 },
    { field: "posterHeight", value: 0 },
  ]) {
    const item = { ...videoItem(record), [field]: value };
    assert.throws(() => validateAdvertisingCardMedia({ ...record, mediaItems: [imageItem(record), item] }), /posterWidth and posterHeight/i);
  }
  const mismatch = { ...videoItem(record), posterWidth: 640, posterHeight: 360 };
  assert.throws(() => validateAdvertisingCardMedia({ ...record, mediaItems: [imageItem(record), mismatch] }), /poster ratio/i);
});

test("exact ratio comparison handles large safe integers without float tolerance", () => {
  const record = ADVERTISING_MEDIA_MANIFEST.find(({ id }) => id === "kiosk-posm-04");
  const image = { ...imageItem(record), width: 9_000_000_000_000_000, height: 6_000_000_000_000_000 };
  const video = { ...videoItem(record), width: 9_000_000_000_000_000, height: 6_000_000_000_000_000, posterWidth: 9_000_000_000_000_000, posterHeight: 6_000_000_000_000_000 };
  assert.equal(validateAdvertisingCardMedia({ ...record, mediaItems: [image, video] }).mediaItems.length, 2);
  assert.throws(() => validateAdvertisingCardMedia({ ...record, mediaItems: [image, { ...video, width: video.width + 1 }] }), /ratio/i);
});

test("visible same-src legacy image cover requires integer dimensions and the card ratio", () => {
  const record = ADVERTISING_MEDIA_MANIFEST.find(({ id }) => id === "kiosk-posm-04");
  const mediaItems = [imageItem(record), videoItem(record)];
  assert.throws(() => validateAdvertisingCardMedia({ ...record, media: { ...record.media, width: 1200, height: 900 }, mediaItems }), /legacy cover ratio/i);
  assert.throws(() => validateAdvertisingCardMedia({ ...record, media: { ...record.media, width: 1536.5 }, mediaItems }), /legacy cover.*width and height/i);
  assert.equal(validateAdvertisingCardMedia({ ...record, media: { ...record.media, width: 480, height: 320 }, mediaItems }).mediaItems, mediaItems);
});

test("legacy image metadata may differ when a video or different image is cover", () => {
  const record = ADVERTISING_MEDIA_MANIFEST.find(({ id }) => id === "kiosk-posm-04");
  const image = imageItem(record);
  const video = videoItem(record);
  const legacy = { ...record.media, width: 1200, height: 900 };
  assert.equal(validateAdvertisingCardMedia({ ...record, media: legacy, mediaItems: [image, video], coverMediaId: video.id }).coverMediaId, video.id);
  const otherImage = { ...image, src: "/assets/test/different-cover.webp" };
  assert.equal(validateAdvertisingCardMedia({ ...record, media: legacy, mediaItems: [otherImage, video] }).mediaItems[0], otherImage);
});
