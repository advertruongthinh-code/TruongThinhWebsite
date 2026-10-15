export const ADVERTISING_MEDIA_CATEGORY_COUNTS = Object.freeze({
  "kiosk-posm": 24,
  "mobile-retail": 16,
  "signage-raised-letters": 22,
  "office-signs-wayfinding": 13,
  "led-displays-lightboxes": 18,
  "print-decals": 16,
});
// Số đếm category baseline vẫn dùng được cho fixture và consumer cũ; chúng không phải ràng buộc kích thước pool.

const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
const isPositiveNumber = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
const isPositiveInteger = (value) => Number.isSafeInteger(value) && value > 0;
const isSha256 = (value) => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);

function duplicateValue(records, readValue) {
  const seen = new Set();
  for (const record of records) {
    const value = readValue(record);
    if (!isNonEmptyString(value)) continue;
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return null;
}

export function validateAdvertisingCardMedia(record) {
  if (record.mediaItems === undefined) {
    if (record.coverMediaId !== undefined && record.coverMediaId !== record.id) {
      throw new Error(`${record.id} coverMediaId must name one media item`);
    }
    if (!isPositiveInteger(record.media?.width) || !isPositiveInteger(record.media?.height)) {
      throw new Error(`${record.id} media requires positive integer width and height`);
    }
    return { mediaItems: [{ id: record.id, kind: "image", ...record.media }], coverMediaId: record.id };
  }
  const mediaItems = record.mediaItems;
  if (!Array.isArray(mediaItems) || mediaItems.length === 0) {
    throw new Error(`${record.id} requires a non-empty mediaItems list`);
  }
  const coverMediaId = record.coverMediaId === undefined ? mediaItems[0]?.id : record.coverMediaId;
  if (!isNonEmptyString(coverMediaId) || !mediaItems.some((item) => item?.id === coverMediaId)) {
    throw new Error(`${record.id} coverMediaId must name one media item`);
  }
  const ids = new Set();
  let cardWidth = 0n;
  let cardHeight = 0n;
  for (const item of mediaItems) {
    if (!item || !isNonEmptyString(item.id)) throw new Error(`${record.id} media item requires an id`);
    if (ids.has(item.id)) throw new Error(`${record.id} has duplicate media id: ${item.id}`);
    ids.add(item.id);
    if (item.kind !== "image" && item.kind !== "video") throw new Error(`${record.id} media ${item.id} requires image/video kind`);
    if (!isNonEmptyString(item.src) || !isNonEmptyString(item.sourceId)) throw new Error(`${record.id} media ${item.id} requires src and sourceId`);
    if (!isPositiveInteger(item.width) || !isPositiveInteger(item.height)) throw new Error(`${record.id} media ${item.id} requires positive integer width and height`);
    if (cardWidth === 0n) {
      cardWidth = BigInt(item.width);
      cardHeight = BigInt(item.height);
    } else if (BigInt(item.width) * cardHeight !== BigInt(item.height) * cardWidth) {
      throw new Error(`${record.id} media ${item.id} ratio must match the card`);
    }
    if (!isNonEmptyString(item.altVi) || !isNonEmptyString(item.altEn)) throw new Error(`${record.id} media ${item.id} requires altVi and altEn`);
    if (!isNonEmptyString(item.source) || !isSha256(item.sha256) || !isNonEmptyString(item.provenance)) {
      throw new Error(`${record.id} media ${item.id} requires source, sha256, and provenance`);
    }
    if (item.kind === "video") {
      if (!isNonEmptyString(item.posterSrc)) throw new Error(`${record.id} media ${item.id} requires posterSrc`);
      if (!isPositiveInteger(item.posterWidth) || !isPositiveInteger(item.posterHeight)) {
        throw new Error(`${record.id} media ${item.id} requires positive integer posterWidth and posterHeight`);
      }
      if (BigInt(item.posterWidth) * cardHeight !== BigInt(item.posterHeight) * cardWidth) {
        throw new Error(`${record.id} media ${item.id} poster ratio must match the card`);
      }
      if (!isPositiveNumber(item.durationSeconds)) throw new Error(`${record.id} media ${item.id} requires durationSeconds`);
      if (typeof item.hasAudio !== "boolean") throw new Error(`${record.id} media ${item.id} requires hasAudio`);
    }
  }
  const cover = mediaItems.find((item) => item.id === coverMediaId);
  if (cover.kind === "image" && cover.src === record.media?.src) {
    if (!isPositiveInteger(record.media.width) || !isPositiveInteger(record.media.height)) {
      throw new Error(`${record.id} legacy cover requires positive integer width and height`);
    }
    if (BigInt(record.media.width) * cardHeight !== BigInt(record.media.height) * cardWidth) {
      throw new Error(`${record.id} legacy cover ratio must match the card`);
    }
  }
  return { mediaItems, coverMediaId };
}

export function validateAdvertisingMediaPool(records, options) {
  if (!Array.isArray(records)) throw new TypeError("Advertising media records must be an array");

  const tagIds = new Set(options?.tagRegistry?.map((tag) => tag.id) ?? []);
  const clusters = options?.clusters ?? [];
  const products = options?.products ?? [];
  const errors = validateAdvertisingTaxonomy(clusters, products);
  const clusterIdByProductId = new Map(products.map((product) => [product.id, product.cluster]));
  const ratiosByCluster = new Map(clusters.map((cluster) => [cluster.id, new Array()]));
  const expectedEntries = Object.entries(ADVERTISING_MEDIA_CATEGORY_COUNTS);
  const grouped = new Map(expectedEntries.map(([category]) => [category, new Array()]));

  records.forEach((record, inputIndex) => {
    if (!record || typeof record !== "object") {
      errors.push(`record ${inputIndex} must be an object`);
      return;
    }
    const categoryRecords = grouped.get(record.category);
    if (!categoryRecords) {
      errors.push(`record ${inputIndex} has unknown category ${String(record.category)}`);
      return;
    }

    categoryRecords.push(record);
    for (const legacyField of ["fitMode", "presentationCanvas"]) {
      if (Object.hasOwn(record, legacyField)) errors.push(`${record.id ?? `record ${inputIndex}`} uses legacy field ${legacyField}`);
    }
    if (!isNonEmptyString(record.id)) errors.push(`record ${inputIndex} requires a non-empty id`);
    if (!isNonEmptyString(record.productKey)) errors.push(`${record.id ?? `record ${inputIndex}`} requires a non-empty productKey`);
    if (!Array.isArray(record.productIds) || record.productIds.length === 0) {
      errors.push(`${record.id ?? `record ${inputIndex}`} requires product IDs`);
    } else {
      const ratio = record.media?.width / record.media?.height;
      for (const productId of record.productIds) {
        const clusterId = clusterIdByProductId.get(productId);
        if (clusterId === undefined) errors.push(`${record.id ?? `record ${inputIndex}`} has unknown product ID ${String(productId)}`);
        else ratiosByCluster.get(clusterId)?.push(ratio);
      }
    }
    if (!Number.isInteger(record.sourceOrder) || record.sourceOrder < 0) {
      errors.push(`${record.id ?? `record ${inputIndex}`} requires a non-negative integer sourceOrder`);
    }
    if (!record.media || !isNonEmptyString(record.media.src) || !isNonEmptyString(record.media.sourceId)) {
      errors.push(`${record.id ?? `record ${inputIndex}`} requires media.src and media.sourceId`);
    }
    if (!record.media || !isPositiveNumber(record.media.width) || !isPositiveNumber(record.media.height)) {
      errors.push(`${record.id ?? `record ${inputIndex}`} requires positive intrinsic media dimensions`);
    }
    if (
      !isNonEmptyString(record.titleVi)
      || !isNonEmptyString(record.titleEn)
      || !isNonEmptyString(record.media?.altVi)
      || !isNonEmptyString(record.media?.altEn)
    ) {
      errors.push(`${record.id ?? `record ${inputIndex}`} requires non-empty titleVi, titleEn, media.altVi, and media.altEn`);
    }
    if (!isNonEmptyString(record.descriptionVi) || !isNonEmptyString(record.descriptionEn)) {
      errors.push(String(record.id ?? ("record " + inputIndex)) + " requires non-empty bilingual descriptions");
    }
    if (!Array.isArray(record.tagIds) || record.tagIds.length === 0) {
      errors.push(String(record.id ?? ("record " + inputIndex)) + " requires authored tag IDs");
    } else {
      for (const tagId of record.tagIds) {
        if (!tagIds.has(tagId)) errors.push(String(record.id ?? ("record " + inputIndex)) + " has unknown tag ID " + String(tagId));
      }
    }
    if (!isNonEmptyString(record.media?.source) || !isSha256(record.media?.sha256) || !isNonEmptyString(record.media?.provenance)) {
      errors.push(String(record.id ?? ("record " + inputIndex)) + " requires media source, SHA-256, and provenance");
    }
    try {
      validateAdvertisingCardMedia(record);
    } catch (error) {
      errors.push(error.message);
    }
  });

  for (const [label, readValue] of [
    ["id", (record) => record?.id],
    ["media.src", (record) => record?.media?.src],
    ["media.sourceId", (record) => record?.media?.sourceId],
  ]) {
    const duplicate = duplicateValue(records, readValue);
    if (duplicate !== null) errors.push(`duplicate ${label}: ${String(duplicate)}`);
  }

  const allMediaItems = records.flatMap((record) => Array.isArray(record?.mediaItems) ? record.mediaItems : []);
  for (const [label, field] of [["id", "id"], ["src", "src"], ["sourceId", "sourceId"]]) {
    const duplicate = duplicateValue(allMediaItems, (item) => item?.[field]);
    if (duplicate !== null) errors.push(`duplicate media item ${label}: ${duplicate}`);
  }

  for (const [category] of expectedEntries) {
    grouped.get(category).forEach((record, categoryIndex) => {
      if (record.sourceOrder !== categoryIndex) {
        errors.push(`${category} sourceOrder must follow input order at index ${categoryIndex}`);
      }
    });
  }

  // Bốn loại tỷ lệ xét ở cấp cụm; card thuộc mọi cụm của các sản phẩm nó gắn.
  for (const [clusterId, ratios] of ratiosByCluster) {
    if (!ratios.some((ratio) => ratio < 0.9)) errors.push(`${clusterId} missing portrait ratio`);
    if (!ratios.some((ratio) => ratio >= 0.9 && ratio <= 1.1)) errors.push(`${clusterId} missing near-square ratio`);
    if (!ratios.some((ratio) => ratio > 1.1)) errors.push(`${clusterId} missing landscape ratio`);
    if (!ratios.some((ratio) => ratio <= 0.625 || ratio >= 1.6)) errors.push(`${clusterId} missing extreme ratio`);
  }

  if (errors.length > 0) throw new Error(`Invalid advertising media pool:\n- ${errors.join("\n- ")}`);
  return records;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRODUCT_TEXT_FIELDS = ["label", "title", "intro"];
const CLUSTER_TEXT_FIELDS = [...PRODUCT_TEXT_FIELDS, "description"];

// Kiểm cụm và sản phẩm (spec advertising-taxonomy R2); trả danh sách lỗi để gộp với lỗi của pool.
function validateAdvertisingTaxonomy(clusters, products) {
  const errors = [];
  const clusterIds = new Set(clusters.map((cluster) => cluster.id));
  const entries = [...clusters, ...products];
  for (const entry of entries) {
    // Sản phẩm dùng intro làm meta description; cụm có description riêng.
    const textFields = Object.hasOwn(entry, "cluster") ? PRODUCT_TEXT_FIELDS : CLUSTER_TEXT_FIELDS;
    for (const locale of ["Vi", "En"]) {
      if (!SLUG.test(entry[`slug${locale}`] ?? "")) errors.push(`${entry.id} slug${locale} must be lowercase ASCII words joined by hyphens`);
      for (const field of textFields) {
        if (!isNonEmptyString(entry[`${field}${locale}`])) errors.push(`${entry.id} requires ${field}${locale}`);
      }
    }
  }
  for (const product of products) {
    if (!clusterIds.has(product.cluster)) errors.push(`${product.id} has unknown cluster ${String(product.cluster)}`);
  }
  for (const [label, readValue] of [["id", (entry) => entry.id], ["slugVi", (entry) => entry.slugVi], ["slugEn", (entry) => entry.slugEn]]) {
    const duplicate = duplicateValue(entries, readValue);
    if (duplicate !== null) errors.push(`duplicate taxonomy ${label}: ${duplicate}`);
  }
  return errors;
}
