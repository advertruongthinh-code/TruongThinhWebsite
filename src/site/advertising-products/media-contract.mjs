export const ADVERTISING_MEDIA_CATEGORY_COUNTS = Object.freeze({
  "kiosk-posm": 24,
  "mobile-retail": 16,
  "signage-raised-letters": 22,
  "office-signs-wayfinding": 13,
  "led-displays-lightboxes": 18,
  "print-decals": 16,
});
// Baseline category counts remain available for fixtures and backward consumers; they are not a pool-size constraint.

const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
const isPositiveNumber = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
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

export function validateAdvertisingMediaPool(records, options) {
  if (!Array.isArray(records)) throw new TypeError("Advertising media records must be an array");

  const productKeysByCategory = options?.productKeysByCategory;
  const tagIds = new Set(options?.tagRegistry?.map((tag) => tag.id) ?? []);
  const errors = new Array();
  const expectedEntries = Object.entries(ADVERTISING_MEDIA_CATEGORY_COUNTS);
  const grouped = new Map(expectedEntries.map(([category]) => [category, new Array()]));
  const expectedProducts = new Map();

  for (const [category] of expectedEntries) {
    const keys = productKeysByCategory?.[category];
    if (!Array.isArray(keys) || keys.length < 12 || new Set(keys).size !== keys.length || keys.some((key) => !isNonEmptyString(key))) {
      errors.push(`${category} must declare at least 12 unique product keys`);
      expectedProducts.set(category, new Set());
    } else {
      expectedProducts.set(category, new Set(keys));
    }
  }

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
    if (!expectedProducts.get(record.category).has(record.productKey)) {
      errors.push(`${record.category} has unknown product key ${String(record.productKey)}`);
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
  });

  for (const [label, readValue] of [
    ["id", (record) => record?.id],
    ["media.src", (record) => record?.media?.src],
    ["media.sourceId", (record) => record?.media?.sourceId],
  ]) {
    const duplicate = duplicateValue(records, readValue);
    if (duplicate !== null) errors.push(`duplicate ${label}: ${String(duplicate)}`);
  }

  for (const [category] of expectedEntries) {
    const categoryRecords = grouped.get(category) ?? [];

    categoryRecords.forEach((record, categoryIndex) => {
      if (record.sourceOrder !== categoryIndex) {
        errors.push(`${category} sourceOrder must follow input order at index ${categoryIndex}`);
      }
    });

    for (const productKey of expectedProducts.get(category)) {
      if (!categoryRecords.some((record) => record.productKey === productKey)) {
        errors.push(`${category} missing product key ${productKey}`);
      }
    }

    const ratios = categoryRecords
      .filter((record) => isPositiveNumber(record.media?.width) && isPositiveNumber(record.media?.height))
      .map((record) => record.media.width / record.media.height);
    if (!ratios.some((ratio) => ratio < 0.9)) errors.push(`${category} missing portrait ratio`);
    if (!ratios.some((ratio) => ratio >= 0.9 && ratio <= 1.1)) errors.push(`${category} missing near-square ratio`);
    if (!ratios.some((ratio) => ratio > 1.1)) errors.push(`${category} missing landscape ratio`);
    if (!ratios.some((ratio) => ratio <= 0.625 || ratio >= 1.6)) errors.push(`${category} missing extreme ratio`);
  }

  if (errors.length > 0) throw new Error(`Invalid advertising media pool:\n- ${errors.join("\n- ")}`);
  return records;
}
