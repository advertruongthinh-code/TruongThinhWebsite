import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ADVERTISING_MEDIA_CATEGORY_COUNTS,
  validateAdvertisingMediaPool,
} from "../../src/site/advertising-products/media-contract.mjs";
import {
  ADVERTISING_CARDS,
  ADVERTISING_DATASET_VERSION,
  ADVERTISING_DETAIL_LAYOUTS,
  buildAdvertisingArtifact,
  validateAdvertisingDetailLayouts,
} from "../../src/site/advertising-products/catalog.mjs";
import { ADVERTISING_MEDIA_MANIFEST } from "../../src/site/advertising-products/media-manifest.mjs";
import { ADVERTISING_TAG_REGISTRY } from "../../src/site/advertising-products/photo-tags.mjs";

const categoryEntries = Object.entries(ADVERTISING_MEDIA_CATEGORY_COUNTS);
const productKeysByCategory = Object.fromEntries(
  categoryEntries.map(([category]) => [
    category,
    Array.from({ length: ["kiosk-posm", "print-decals"].includes(category) ? 13 : 12 }, (_, index) => category + "-product-" + String(index + 1).padStart(2, "0")),
  ]),
);

function makeValidPool() {
  return categoryEntries.flatMap(([category, count]) =>
    Array.from({ length: count }, (_, sourceOrder) => {
      const dimensions = [
        [1600, 900],
        [1000, 1000],
        [800, 1000],
        [1200, 800],
      ][sourceOrder % 4];
      const number = String(sourceOrder + 1).padStart(2, "0");

      return {
        id: category + "-" + number,
        category,
        productKey: productKeysByCategory[category][sourceOrder % productKeysByCategory[category].length],
        sourceOrder,
        titleVi: "Sản phẩm " + (sourceOrder + 1),
        titleEn: "Product " + (sourceOrder + 1),
        descriptionVi: "Mô tả ảnh " + (sourceOrder + 1),
        descriptionEn: "Photo description " + (sourceOrder + 1),
        tagIds: ["group-" + category, "format-landscape"],
        media: {
          src: "/assets/test/" + category + "-" + number + ".webp",
          sourceId: "source:" + category + ":" + (sourceOrder + 1),
          source: "/assets/test/" + category + "-" + number + ".webp",
          sha256: "a".repeat(64),
          provenance: "Fixture source.",
          width: dimensions[0],
          height: dimensions[1],
          altVi: "Mô tả sản phẩm " + (sourceOrder + 1),
          altEn: "Product " + (sourceOrder + 1) + " description",
        },
      };
    }),
  );
}

const validate = (records) => validateAdvertisingMediaPool(records, { productKeysByCategory, tagRegistry: ADVERTISING_TAG_REGISTRY });

test("accepts the canonical 109-record pool without a span choice", () => {
  const records = makeValidPool();

  assert.equal(records.length, 109);
  assert.equal(validate(records), records, "validation preserves source record identity and order");
  assert.ok(records.every((record) => !Object.hasOwn(record, "layoutSpan")));
});

test("accepts an extra record without requiring a span choice", () => {
  const records = makeValidPool();
  records.push({
    ...records[0],
    id: "kiosk-posm-25",
    sourceOrder: 24,
    media: {
      ...records[0].media,
      src: "/assets/test/kiosk-posm-25.webp",
      sourceId: "source:kiosk-posm:25",
    },
  });

  assert.equal(validate(records), records);
  assert.equal(records.length, 110);
});

test("detail layouts partition all canonical media sources exactly once", () => {
  assert.equal(validateAdvertisingDetailLayouts(ADVERTISING_DETAIL_LAYOUTS, ADVERTISING_MEDIA_MANIFEST), ADVERTISING_DETAIL_LAYOUTS);

  const assigned = Object.values(ADVERTISING_DETAIL_LAYOUTS).flatMap((layout) => [
    layout.heroSourceId,
    ...layout.sections.flatMap((section) => section.sourceIds ?? []),
  ]);
  assert.equal(assigned.length, 154);
  assert.equal(new Set(assigned).size, 154);
  assert.deepEqual(new Set(assigned), new Set(ADVERTISING_MEDIA_MANIFEST.map(({ media }) => media.sourceId)));
});

test("rejects duplicate card ids and media paths", () => {
  const duplicateId = makeValidPool();
  duplicateId[1].id = duplicateId[0].id;
  assert.throws(() => validate(duplicateId), /duplicate id/i);

  const duplicateSrc = makeValidPool();
  duplicateSrc[1].media.src = duplicateSrc[0].media.src;
  assert.throws(() => validate(duplicateSrc), /duplicate media\.src/i);
});

test("rejects reuse of one source through another filename or crop", () => {
  const records = makeValidPool();
  records[1].media.sourceId = records[0].media.sourceId;
  records[1].media.src = "/assets/test/same-source-different-crop.webp";

  assert.throws(() => validate(records), /duplicate media\.sourceId/i);
});

test("rejects missing product coverage", () => {
  const records = makeValidPool();
  const missingKey = productKeysByCategory["kiosk-posm"][11];
  for (const record of records) {
    if (record.category === "kiosk-posm" && record.productKey === missingKey) {
      record.productKey = productKeysByCategory["kiosk-posm"][10];
    }
  }

  assert.throws(() => validate(records), new RegExp("kiosk-posm.*missing product key.*" + missingKey, "i"));
});

test("rejects non-positive intrinsic dimensions", () => {
  const records = makeValidPool();
  records[0].media.width = 0;

  assert.throws(() => validate(records), /positive intrinsic media dimensions/i);
});

test("rejects missing bilingual titles or alt text", () => {
  for (const mutate of [
    (record) => { record.titleVi = ""; },
    (record) => { delete record.titleEn; },
    (record) => { record.media.altVi = ""; },
    (record) => { delete record.media.altEn; },
  ]) {
    const records = makeValidPool();
    mutate(records[0]);
    assert.throws(() => validate(records), /requires non-empty titleVi, titleEn, media\.altVi, and media\.altEn/i);
  }
});

test("rejects duplicate photo IDs, unknown tags, and missing authored metadata", () => {
  const duplicateId = makeValidPool();
  duplicateId[1].id = duplicateId[0].id;
  assert.throws(() => validate(duplicateId), /duplicate id/i);

  const unknownTag = makeValidPool();
  unknownTag[0].tagIds = ["not-a-stable-tag"];
  assert.throws(() => validate(unknownTag), /unknown tag ID/i);

  const missingMetadata = makeValidPool();
  delete missingMetadata[0].descriptionVi;
  assert.throws(() => validate(missingMetadata), /bilingual descriptions/i);
});

test("canonical records retain identity, pixels, order, titles, tags, and verified media", () => {
  assert.equal(new Set(ADVERTISING_MEDIA_MANIFEST.map((record) => record.id)).size, ADVERTISING_MEDIA_MANIFEST.length);
  assert.equal(ADVERTISING_MEDIA_MANIFEST.length, 154);
  assert.ok(ADVERTISING_MEDIA_MANIFEST.every((record) => (
    Number.isInteger(record.sourceOrder)
    && record.category
    && record.productKey
    && record.titleVi
    && record.titleEn
    && record.media.sourceId
    && record.media.src
    && record.media.width > 0
    && record.media.height > 0
    && !Object.hasOwn(record, "layoutSpan")
  )));
  assert.ok(ADVERTISING_MEDIA_MANIFEST.every((record) => (
    record.descriptionVi
    && record.descriptionEn
    && record.tagIds.length >= 2
    && record.media.source === record.media.src
    && /^[a-f0-9]{64}$/i.test(record.media.sha256)
    && record.media.provenance
  )));
  assert.ok(ADVERTISING_TAG_REGISTRY.length >= 81);
  assert.ok(ADVERTISING_TAG_REGISTRY.some((tag) => tag.id === "product-kiosk-posm-product-01"));
  assert.deepEqual(
    ADVERTISING_MEDIA_MANIFEST.find((record) => record.id === "kiosk-posm-01").tagIds,
    ["group-kiosk-posm", "product-kiosk-posm-product-01", "format-landscape"],
  );
});

test("accepted trade-fair kiosk sources retain exact provenance and existing taxonomy", () => {
  const expected = [
    ["kiosk-posm-25", "kiosk-posm-product-01", "67c25939a98a3659b7f5d8b47c3f8687828a9b551de15e7630c0f659373cda93"],
    ["kiosk-posm-26", "kiosk-posm-product-10", "56a80014d7cc4ab71bdcb8ff7c3baf1a9cfa0d30fe56db3cc0a36c2ff549bfed"],
    ["kiosk-posm-27", "kiosk-posm-product-01", "5c0a654a71025f6b1870b657429c5e4e5010ac4f929cf709849da3ce62be7f21"],
    ["kiosk-posm-28", "kiosk-posm-product-06", "6f6b2bda8a0a1b9d1feaf67be3e874f4125b792275088a738713db1f19c216cf"],
    ["kiosk-posm-29", "kiosk-posm-product-01", "30fad3bc843b5c6d2b880ec84ff699310a6a4f3d440d1b1d4171c3b218d92d11"],
    ["kiosk-posm-30", "kiosk-posm-product-01", "3e0fe6a7e1059a8d864edea3fdb09f611fc017d11486d9ded0970139fe637067"],
  ];

  for (const [id, productKey, sourceSha256] of expected) {
    const record = ADVERTISING_MEDIA_MANIFEST.find((candidate) => candidate.id === id);
    assert.ok(record, `${id} is integrated into the public media pool`);
    assert.equal(record.category, "kiosk-posm");
    assert.equal(record.productKey, productKey);
    assert.deepEqual(record.tagIds.slice(0, 2), ["group-kiosk-posm", `product-${productKey}`]);
    assert.match(record.media.provenance, new RegExp(sourceSha256, "i"));
    assert.match(record.descriptionVi, /hội chợ/i);
    assert.match(record.descriptionEn, /trade fair/i);
  }
});

test("accepts every intrinsic ratio family required by the media contract", () => {
  const records = makeValidPool();
  assert.equal(validate(records), records);
  assert.ok(records.some((record) => record.media.width / record.media.height < 0.9));
  assert.ok(records.some((record) => record.media.width / record.media.height >= 0.9 && record.media.width / record.media.height <= 1.1));
  assert.ok(records.some((record) => record.media.width / record.media.height > 1.1));
  assert.ok(records.some((record) => record.media.width / record.media.height <= 0.625 || record.media.width / record.media.height >= 1.6));
});

test("rejects sourceOrder that no longer follows input order", () => {
  const records = makeValidPool();
  [records[0], records[1]] = [records[1], records[0]];

  assert.throws(() => validate(records), /kiosk-posm.*sourceOrder.*input order/i);
});

test("rejects legacy fit and canvas fields even when null", () => {
  for (const field of ["fitMode", "presentationCanvas"]) {
    const records = makeValidPool();
    records[0][field] = null;
    assert.throws(() => validate(records), new RegExp(field + ".*legacy|legacy.*" + field, "i"));
  }
});

test("does not require or enforce a retired layoutSpan input", () => {
  const records = makeValidPool();
  records[0].layoutSpan = "legacy-value";

  assert.equal(validate(records), records);
});

test("drops legacy span and threshold inputs from the artifact without changing media identity", () => {
  assert.equal(ADVERTISING_DATASET_VERSION, "2026-09-24.1");
  assert.equal(ADVERTISING_MEDIA_MANIFEST.length, 154);
  assert.ok(ADVERTISING_MEDIA_MANIFEST.every((record) => !Object.hasOwn(record, "layoutSpan")));

  const base = buildAdvertisingArtifact();
  const thresholdLegacy = buildAdvertisingArtifact({ settings: { landscapeThreshold: 1.5 } });
  assert.deepEqual(base.settings, {});
  assert.deepEqual(thresholdLegacy.settings, {});
  assert.deepEqual(thresholdLegacy.cards, base.cards);
  assert.equal(base.cards.length, ADVERTISING_CARDS.length);
  assert.ok(base.cards.every((card) => !Object.hasOwn(card, "layoutSpan")));

  for (const legacySpan of ["auto", 1, 2]) {
    const source = { ...ADVERTISING_MEDIA_MANIFEST[0], layoutSpan: legacySpan };
    const artifact = buildAdvertisingArtifact({ cards: [source] });
    assert.ok(!Object.hasOwn(artifact.cards[0], "layoutSpan"));
    assert.equal(artifact.cards[0].id, base.cards.find((card) => card.id === source.id).id);
    assert.deepEqual(artifact.cards[0].media, base.cards.find((card) => card.id === source.id).media);
  }
});

test("producer still rejects unsupported legacy fields before selection", () => {
  const source = ADVERTISING_MEDIA_MANIFEST[0];
  for (const field of ["fitMode", "presentationCanvas", "mediaCandidates"]) {
    assert.throws(
      () => buildAdvertisingArtifact({ cards: [{ ...source, [field]: null }] }),
      new RegExp("legacy card field.*" + field, "i"),
    );
  }
});

test("artifact retains the tag registry with custom card fixtures", () => {
  const artifact = buildAdvertisingArtifact({ cards: [ADVERTISING_MEDIA_MANIFEST[0]] });
  assert.deepEqual(artifact.tagRegistry, ADVERTISING_TAG_REGISTRY);
  assert.equal(artifact.cards.length, 1);
});
