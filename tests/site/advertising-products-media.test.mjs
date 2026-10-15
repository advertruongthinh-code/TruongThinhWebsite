import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ADVERTISING_MEDIA_CATEGORY_COUNTS,
  validateAdvertisingMediaPool,
} from "../../src/site/advertising-products/media-contract.mjs";
import {
  ADVERTISING_CARDS,
  ADVERTISING_DATASET_VERSION,
  buildAdvertisingArtifact,
} from "../../src/site/advertising-products/catalog.mjs";
import { ADVERTISING_MEDIA_MANIFEST } from "../../src/site/advertising-products/media-manifest.mjs";
import { ADVERTISING_TAG_REGISTRY } from "../../src/site/advertising-products/photo-tags.mjs";
import {
  ADVERTISING_CLUSTERS,
  ADVERTISING_PRODUCTS,
  ADVERTISING_THIN_PRODUCT_THRESHOLD,
} from "../../src/site/advertising-products/taxonomy.mjs";

const categoryEntries = Object.entries(ADVERTISING_MEDIA_CATEGORY_COUNTS);
// Fixture: mỗi nhóm cũ gắn sản phẩm đầu tiên của một cụm, đủ bốn loại tỷ lệ mỗi cụm.
const clusterByCategory = {
  "kiosk-posm": "displays-booths",
  "mobile-retail": "mobile-retail",
  "signage-raised-letters": "signage",
  "office-signs-wayfinding": "office-signs",
  "led-displays-lightboxes": "led-displays",
  "print-decals": "printing-decals",
};
const productIdByCategory = Object.fromEntries(Object.entries(clusterByCategory)
  .map(([category, cluster]) => [category, ADVERTISING_PRODUCTS.find((product) => product.cluster === cluster).id]));

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
        productKey: category + "-product-01",
        productIds: [productIdByCategory[category]],
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

const taxonomy = () => ({ clusters: structuredClone(ADVERTISING_CLUSTERS), products: structuredClone(ADVERTISING_PRODUCTS) });
const validate = (records, { clusters, products } = taxonomy()) => validateAdvertisingMediaPool(records, {
  tagRegistry: ADVERTISING_TAG_REGISTRY, clusters, products,
});

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

test("accepts products without photos now that the 12-product rule is gone", () => {
  const records = makeValidPool();
  assert.ok(ADVERTISING_PRODUCTS.some((product) => !records.some((record) => record.productIds.includes(product.id))));
  assert.equal(validate(records), records);
});

test("rejects a product that points to a missing cluster", () => {
  const data = taxonomy();
  data.products[1].cluster = "no-such-cluster";
  assert.throws(() => validate(makeValidPool(), data), new RegExp(data.products[1].id + " has unknown cluster no-such-cluster"));
});

test("rejects a photo that points to a missing product or has no product", () => {
  const unknown = makeValidPool();
  unknown[0].productIds = ["signage/no-such-product"];
  assert.throws(() => validate(unknown), /kiosk-posm-01 has unknown product ID signage\/no-such-product/);

  const empty = makeValidPool();
  empty[0].productIds = [];
  assert.throws(() => validate(empty), /kiosk-posm-01 requires product IDs/);
});

test("rejects a duplicate slug within one locale but allows the same word across locales", () => {
  for (const locale of ["Vi", "En"]) {
    const data = taxonomy();
    data.products[1]["slug" + locale] = data.products[0]["slug" + locale];
    assert.throws(() => validate(makeValidPool(), data), new RegExp("duplicate taxonomy slug" + locale));
  }
  // Slug VI của sản phẩm trùng slug EN của một cụm vẫn hợp lệ: hai locale là hai không gian URL.
  const data = taxonomy();
  data.products[0].slugVi = data.clusters[1].slugEn;
  assert.equal(validate(makeValidPool(), data).length, 109);
});

test("rejects a Vietnamese slug with diacritics", () => {
  const data = taxonomy();
  data.clusters[0].slugVi = "bảng-hiệu";
  assert.throws(() => validate(makeValidPool(), data), /signage slugVi must be lowercase ASCII/);
});

test("rejects missing Vietnamese or English text on clusters and products", () => {
  for (const [kind, field] of [["clusters", "labelVi"], ["clusters", "descriptionEn"], ["products", "titleEn"], ["products", "introVi"]]) {
    const data = taxonomy();
    data[kind][0][field] = "";
    assert.throws(() => validate(makeValidPool(), data), new RegExp(data[kind][0].id + " requires " + field));
  }
});

test("rejects a cluster that lacks one of the four ratio classes", () => {
  for (const [label, keep] of [
    ["portrait", (ratio) => ratio >= 0.9],
    ["near-square", (ratio) => ratio < 0.9 || ratio > 1.1],
    ["landscape", (ratio) => ratio <= 1.1],
    ["extreme", (ratio) => ratio > 0.625 && ratio < 1.6],
  ]) {
    // Ảnh không đạt điều kiện của cụm signage chuyển sang sản phẩm cụm khác, giữ nguyên số ảnh.
    const records = makeValidPool().map((record) => (
      record.category === "signage-raised-letters" && !keep(record.media.width / record.media.height)
        ? { ...record, productIds: [productIdByCategory["kiosk-posm"]] }
        : record
    ));
    assert.throws(() => validate(records), new RegExp("signage missing " + label + " ratio"));
  }
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
  assert.equal(ADVERTISING_MEDIA_MANIFEST.length, 192);
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
  assert.equal(ADVERTISING_MEDIA_MANIFEST.length, 192);
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

// Bảng map của plan advertising-taxonomy: sản phẩm mới <- số thứ tự sản phẩm cũ trong từng nhóm cũ.
const PLAN_MAP = {
  "signage/aluminium-signs-facades": { "signage-raised-letters": [1, 2, 3] },
  "signage/raised-letters": { "signage-raised-letters": [6, 7, 8, 9] },
  "signage/light-boxes": { "signage-raised-letters": [4, 5], "led-displays-lightboxes": [10, 11, 12] },
  "signage/projecting-signs": { "signage-raised-letters": [10, 11, 12] },
  "displays-booths/standees-backdrops-posm": { "kiosk-posm": [11, 12, 13] },
  "displays-booths/display-shelves-cabinets": { "kiosk-posm": [2, 3, 4, 9, 10] },
  "displays-booths/exhibition-booths": { "kiosk-posm": [1] },
  "displays-booths/retail-kiosks": { "kiosk-posm": [5, 6] },
  "displays-booths/sampling-booths-reception-counters": { "kiosk-posm": [7, 8] },
  "printing-decals/decals-banners-canvas": { "print-decals": [10, 11, 12] },
  "printing-decals/office-printing": { "print-decals": [1, 2, 3, 4, 5, 6] },
  "printing-decals/menus": { "print-decals": [7, 8, 9] },
  "printing-decals/packaging-cards-tickets": { "print-decals": [13] },
  "led-displays/decorative-led": {},
  "led-displays/led-screens": { "led-displays-lightboxes": [4, 5, 6, 7, 8, 9] },
  "led-displays/scrolling-led-signs": { "led-displays-lightboxes": [1, 2, 3] },
  "office-signs/house-numbers-company-nameplates": { "office-signs-wayfinding": [1, 2] },
  "office-signs/wayfinding-building-directories": { "office-signs-wayfinding": [3, 4, 10, 11, 12] },
  "office-signs/room-signs": { "office-signs-wayfinding": [8, 9] },
  "office-signs/desk-nameplates": { "office-signs-wayfinding": [5, 6, 7] },
  "office-signs/awards-plaques": { "office-signs-wayfinding": [13] },
  "mobile-retail/carts": { "mobile-retail": [1, 2, 3, 7, 12] },
  "mobile-retail/mobile-counters": { "mobile-retail": [4, 5, 6, 8, 9, 10, 11] },
};
// Bảng sửa nhãn R8 của plan; ảnh không có trong bảng giữ sản phẩm suy ra từ sản phẩm cũ.
const PLAN_RELABELS = {
  "office-signs-wayfinding-02": ["office-signs/wayfinding-building-directories"],
  "office-signs-wayfinding-13": ["office-signs/wayfinding-building-directories"],
  "led-displays-lightboxes-04": ["led-displays/led-screens"],
  "led-displays-lightboxes-09": ["led-displays/led-screens"],
  "led-displays-lightboxes-15": ["led-displays/led-screens", "led-displays/scrolling-led-signs"],
  "mobile-retail-05": ["mobile-retail/mobile-counters", "displays-booths/sampling-booths-reception-counters"],
  "print-decals-21": ["printing-decals/decals-banners-canvas", "office-signs/room-signs"],
  "signage-raised-letters-14": ["signage/aluminium-signs-facades", "signage/light-boxes"],
};
const planProductByLegacyKey = new Map(Object.entries(PLAN_MAP).flatMap(([productId, byCategory]) => Object.entries(byCategory)
  .flatMap(([category, numbers]) => numbers.map((number) => [category + "-product-" + String(number).padStart(2, "0"), productId]))));

test("taxonomy has six clusters and 23 products in plan order with a thin-page threshold of 3", () => {
  assert.deepEqual(ADVERTISING_CLUSTERS.map(({ id }) => id), ["signage", "displays-booths", "printing-decals", "led-displays", "office-signs", "mobile-retail"]);
  assert.deepEqual(ADVERTISING_PRODUCTS.map(({ id }) => id), Object.keys(PLAN_MAP));
  assert.ok(ADVERTISING_PRODUCTS.every(({ id, cluster, slugEn }) => id === cluster + "/" + slugEn), "internal id is the EN slug path");
  assert.equal(ADVERTISING_THIN_PRODUCT_THRESHOLD, 3);
});

test("every old product tag becomes a variant that maps to its plan product", () => {
  const variants = ADVERTISING_TAG_REGISTRY.filter((tag) => tag.id.startsWith("product-"));
  assert.equal(variants.length, 75);
  assert.equal(planProductByLegacyKey.size, 75);
  for (const tag of variants) {
    assert.equal(tag.group, "variant", tag.id);
    assert.equal(tag.productId, planProductByLegacyKey.get(tag.id.slice("product-".length)), tag.id);
  }
  assert.ok(!ADVERTISING_TAG_REGISTRY.some((tag) => tag.group === "product"));
});

test("card products and per-product card counts follow the plan map and R8 relabels", () => {
  const expectedIds = (record) => PLAN_RELABELS[record.id] ?? [planProductByLegacyKey.get(record.productKey)];
  for (const card of ADVERTISING_CARDS) {
    assert.deepEqual(card.productIds, expectedIds(card), card.id);
    const clusterOf = (productId) => ADVERTISING_PRODUCTS.find((product) => product.id === productId).cluster;
    assert.deepEqual(card.clusterIds, [...new Set(card.productIds.map(clusterOf))], card.id);
  }
  // Số card mỗi sản phẩm tính từ dữ liệu, không viết cứng: ảnh mới chỉ mang productKey cũ vẫn khớp.
  for (const { id } of ADVERTISING_PRODUCTS) {
    assert.equal(
      ADVERTISING_CARDS.filter((card) => card.productIds.includes(id)).length,
      ADVERTISING_MEDIA_MANIFEST.filter((record) => expectedIds(record).includes(id)).length,
      id,
    );
  }
  const artifact = buildAdvertisingArtifact();
  assert.deepEqual(artifact.clusters, ADVERTISING_CLUSTERS);
  assert.deepEqual(artifact.products, ADVERTISING_PRODUCTS);
});
