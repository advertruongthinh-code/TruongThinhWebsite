import {
  ADVERTISING_LAYOUT_ALGORITHM_VERSION,
  compileAdvertisingProductLayout as compileLayout,
  scheduleAdvertisingRank,
} from "./layout-core.mjs";
import { validateAdvertisingCardMedia, validateAdvertisingMediaPool } from "./media-contract.mjs";
import { ADVERTISING_MEDIA_MANIFEST } from "./media-manifest.mjs";
import { ADVERTISING_TAG_REGISTRY } from "./photo-tags.mjs";

export const ADVERTISING_DATASET_VERSION = "2026-09-24.1";

const category = ({ slug, titleVi, titleEn, statementVi, statementEn, products }) => ({
  slug,
  titleVi,
  titleEn,
  statementVi,
  statementEn,
  products: products.map(([productVi, productEn]) => ({ titleVi: productVi, titleEn: productEn })),
});

const CATEGORY_TAXONOMY = [
  category({
    slug: "kiosk-posm",
    titleVi: "Kiosk & POSM",
    titleEn: "Kiosks & POSM",
    statementVi: "Điểm chạm thương hiệu gọn, rõ và sẵn sàng vận hành.",
    statementEn: "Compact brand touchpoints, clear and ready to operate.",
    products: [
      ["Gian hàng triển lãm", "Exhibition booths"],
      ["Quầy kệ trưng bày sản phẩm", "Product display counters and shelving"],
      ["Tủ trưng bày theo yêu cầu", "Custom display cabinets"],
      ["Kệ trang trí theo yêu cầu", "Custom display shelving"],
      ["Kiosk bán hàng tại trung tâm thương mại", "Shopping-centre retail kiosks"],
      ["Kiosk quảng bá thương hiệu", "Brand activation kiosks"],
      ["Quầy sampling", "Sampling counters"],
      ["Quầy lễ tân sự kiện", "Event reception counters"],
      ["Bục trưng bày sản phẩm", "Product display plinths"],
      ["Đảo trưng bày", "Island displays"],
      ["Vách trưng bày thương hiệu", "Branded display walls"],
      ["Bộ POSM theo chiến dịch", "Campaign POSM sets"],
      ["Standee và khung quảng cáo", "Standees and advertising frames"],
    ],
  }),
  category({
    slug: "mobile-retail",
    titleVi: "Xe bán hàng",
    titleEn: "Mobile retail",
    statementVi: "Quầy bán linh hoạt cho nhịp vận hành ngoài hiện trường.",
    statementEn: "Flexible retail counters for work in the field.",
    products: [
      ["Xe bán hàng lưu động", "Mobile retail carts"],
      ["Xe bán cafe", "Mobile coffee carts"],
      ["Xe bán thức ăn", "Mobile food carts"],
      ["Quầy sampling di động", "Mobile sampling counters"],
      ["Quầy bán hàng sự kiện", "Event retail counters"],
      ["Quầy pop-up di động", "Mobile pop-up counters"],
      ["Xe đẩy trưng bày sản phẩm", "Mobile product display carts"],
      ["Quầy bán hàng gấp gọn", "Folding retail counters"],
      ["Quầy bán hàng ngoài trời", "Outdoor retail counters"],
      ["Quầy pha chế di động", "Mobile beverage counters"],
      ["Quầy bán hàng theo nhận diện", "Brand-led retail counters"],
      ["Xe bán hàng theo yêu cầu", "Custom mobile retail carts"],
    ],
  }),
  category({
    slug: "signage-raised-letters",
    titleVi: "Bảng hiệu & chữ nổi",
    titleEn: "Signage & raised letters",
    statementVi: "Nhận diện đúng vật liệu, đúng tỷ lệ và bền ngoài trời.",
    statementEn: "Identity made at the right scale, in the right material, built to last outdoors.",
    products: [
      ["Mặt dựng Aluminium", "Aluminium composite facades"],
      ["Pano tấm lớn ngoài trời", "Large outdoor advertising panels"],
      ["Bảng quảng cáo tấm lớn ngoài trời", "Large-format outdoor signs"],
      ["Hộp đèn bạt Hiflex", "Hiflex fabric light boxes"],
      ["Hộp đèn bạt 3M", "Premium 3M fabric light boxes"],
      ["Chữ nổi Inox sáng chân", "Halo-lit stainless-steel letters"],
      ["Chữ nổi Mica", "Acrylic dimensional letters"],
      ["Chữ nổi Alu và Formex", "Aluminium and Formex dimensional letters"],
      ["Logo và chữ nổi tòa nhà", "Building logos and dimensional lettering"],
      ["Bảng vẫy Mica hút nổi", "Vacuum-formed acrylic projecting signs"],
      ["Bảng vẫy LED hiệu ứng", "Animated LED projecting signs"],
      ["Bảng vẫy Inox và Hiflex", "Stainless-steel and Hiflex projecting signs"],
    ],
  }),
  category({
    slug: "office-signs-wayfinding",
    titleVi: "Bảng tên, biển văn phòng & chỉ dẫn",
    titleEn: "Nameplates, office signs & wayfinding",
    statementVi: "Chỉ dẫn rõ ràng để không gian dễ sử dụng hơn.",
    statementEn: "Clear guidance that makes a space easier to use.",
    products: [
      ["Biển số nhà Inox ăn mòn và dập nổi", "Etched and embossed stainless-steel house numbers"],
      ["Biển số nhà Mica và Alu", "Acrylic and aluminium house numbers"],
      ["Bảng tên đường", "Street-name signs"],
      ["Bảng chỉ dẫn khu đô thị", "Urban wayfinding signs"],
      ["Bảng chức danh gỗ và đồng", "Timber and brass desk nameplates"],
      ["Bảng chức danh Mica", "Acrylic desk nameplates"],
      ["Bảng chức danh Inox", "Stainless-steel desk nameplates"],
      ["Biển phòng làm việc", "Office-room signs"],
      ["Biển phòng họp", "Meeting-room signs"],
      ["Biển chỉ dẫn tầng", "Floor wayfinding signs"],
      ["Sơ đồ tòa nhà", "Building directories"],
      ["Biển cảnh báo và biển WC", "Warning and washroom signs"],
    ],
  }),
  category({
    slug: "led-displays-lightboxes",
    titleVi: "LED, màn hình & hộp đèn",
    titleEn: "LED, displays & light boxes",
    statementVi: "Ánh sáng và hiển thị được hoàn thiện theo điều kiện lắp đặt.",
    statementEn: "Light and display systems completed for their installation conditions.",
    products: [
      ["Bảng LED ma trận đơn sắc", "Single-colour matrix LED signs"],
      ["Bảng LED ma trận ba màu", "Three-colour matrix LED signs"],
      ["Bảng LED ma trận full color", "Full-colour matrix LED signs"],
      ["LED ma trận trong nhà", "Indoor matrix LED systems"],
      ["LED ma trận ngoài trời", "Outdoor matrix LED systems"],
      ["Màn hình LED sự kiện", "Event LED screens"],
      ["Màn hình LED hội trường", "Auditorium LED screens"],
      ["Màn hình LED showroom", "Showroom LED screens"],
      ["Màn hình LED khổ lớn", "Large-format LED displays"],
      ["Hộp đèn LED siêu mỏng", "Slim LED light boxes"],
      ["Tranh điện nắp hít", "Magnetic-front illuminated frames"],
      ["Tranh điện nắp bật", "Snap-frame illuminated displays"],
    ],
  }),
  category({
    slug: "print-decals",
    titleVi: "In nhanh, ấn phẩm & decal",
    titleEn: "Quick print, collateral & decals",
    statementVi: "Ấn phẩm và decal khép vòng nhận diện tại điểm bán.",
    statementEn: "Print and decals complete brand presence at the point of sale.",
    products: [
      ["Danh thiếp", "Business cards"],
      ["Tờ rơi", "Flyers"],
      ["Brochure và tờ gấp", "Brochures and folded leaflets"],
      ["Catalogue", "Catalogues"],
      ["Thiệp cưới và thiệp mời", "Wedding and invitation cards"],
      ["Giấy chứng nhận và phong bì", "Certificates and envelopes"],
      ["Menu bìa cứng, da và gỗ", "Hard-cover, leather and timber menus"],
      ["Menu nhựa chống nước", "Waterproof plastic menus"],
      ["Menu cuốn, để bàn và Mica", "Booklet, table and acrylic menus"],
      ["In bạt Hiflex", "Hiflex banner printing"],
      ["Decal dán kính, tường, xe và tem cắt bế", "Window, wall, vehicle and die-cut decals"],
      ["Tranh Canvas và tranh treo tường", "Canvas and decorative wall prints"],
      ["Bao bì và ly in F&B", "Printed food and beverage packaging"],
    ],
  }),
];

const productKeysByCategory = Object.fromEntries(CATEGORY_TAXONOMY.map((entry) => [
  entry.slug,
  entry.products.map((_, index) => `${entry.slug}-product-${String(index + 1).padStart(2, "0")}`),
]));

validateAdvertisingMediaPool(ADVERTISING_MEDIA_MANIFEST, { productKeysByCategory, tagRegistry: ADVERTISING_TAG_REGISTRY });

const mediaSourceId = (slug, index) => {
  const id = `${slug}-${String(index).padStart(2, "0")}`;
  const record = ADVERTISING_MEDIA_MANIFEST.find((item) => item.id === id);
  if (!record) throw new Error(`Missing detail media: ${id}`);
  return record.media.sourceId;
};
const mediaRange = (slug, start, end) => Array.from(
  { length: end - start + 1 },
  (_, offset) => mediaSourceId(slug, start + offset),
);
const block = (kind, sourceIds = []) => ({ kind, sourceIds });

export const ADVERTISING_DETAIL_LAYOUTS = deepFreeze({
  "kiosk-posm": {
    layoutKey: "pollenca-long-form",
    heroSourceId: mediaSourceId("kiosk-posm", 1),
    sections: [
      block("titular"), block("paragraph"), block("facts"), block("single", mediaRange("kiosk-posm", 2, 2)),
      block("paragraph"), block("double", mediaRange("kiosk-posm", 3, 4)), block("titular"),
      block("single", mediaRange("kiosk-posm", 5, 5)), block("paragraph"), block("gallery", mediaRange("kiosk-posm", 6, 17)),
      block("titular"), block("single", mediaRange("kiosk-posm", 18, 18)), block("paragraph"),
      block("double", mediaRange("kiosk-posm", 19, 20)), block("titular"), block("single", mediaRange("kiosk-posm", 21, 21)),
      block("paragraph"), block("double", mediaRange("kiosk-posm", 22, 23)), block("paragraph"),
      block("single", mediaRange("kiosk-posm", 24, 24)), block("gallery", mediaRange("kiosk-posm", 25, 37)),
    ],
  },
  "mobile-retail": {
    layoutKey: "ponent-gallery-rhythm",
    heroSourceId: mediaSourceId("mobile-retail", 1),
    sections: [
      block("titular"), block("paragraph"), block("gallery", mediaRange("mobile-retail", 2, 6)), block("facts"),
      block("paragraph"), block("gallery", mediaRange("mobile-retail", 7, 10)), block("paragraph"),
      block("double", mediaRange("mobile-retail", 11, 12)), block("paragraph"), block("gallery", mediaRange("mobile-retail", 13, 21)),
    ],
  },
  "signage-raised-letters": {
    layoutKey: "can-molteni-banner",
    heroSourceId: mediaSourceId("signage-raised-letters", 1),
    sections: [
      block("titular"), block("paragraph"), block("gallery", mediaRange("signage-raised-letters", 2, 17)), block("facts"),
      block("paragraph"), block("single", mediaRange("signage-raised-letters", 18, 18)), block("paragraph"),
      block("double", mediaRange("signage-raised-letters", 19, 20)), block("paragraph"),
      block("single", mediaRange("signage-raised-letters", 21, 21)), block("paragraph"), block("titular"),
      block("banner", mediaRange("signage-raised-letters", 22, 22)),
      block("gallery", mediaRange("signage-raised-letters", 23, 26)),
    ],
  },
  "office-signs-wayfinding": {
    layoutKey: "lonja-columns",
    heroSourceId: mediaSourceId("office-signs-wayfinding", 1),
    sections: [
      block("titular"), block("paragraph"), block("gallery", mediaRange("office-signs-wayfinding", 2, 5)), block("facts"),
      block("single", mediaRange("office-signs-wayfinding", 6, 6)), block("paragraph"),
      block("double", mediaRange("office-signs-wayfinding", 7, 8)), block("paragraph"),
      block("gallery", mediaRange("office-signs-wayfinding", 9, 12)), block("columns"),
      block("single", mediaRange("office-signs-wayfinding", 13, 13)),
      block("gallery", mediaRange("office-signs-wayfinding", 14, 31)),
    ],
  },
  "led-displays-lightboxes": {
    layoutKey: "espalmador-balanced",
    heroSourceId: mediaSourceId("led-displays-lightboxes", 1),
    sections: [
      block("titular"), block("paragraph"), block("gallery", mediaRange("led-displays-lightboxes", 2, 15)), block("facts"),
      block("paragraph"), block("single", mediaRange("led-displays-lightboxes", 16, 16)), block("paragraph"),
      block("double", mediaRange("led-displays-lightboxes", 17, 18)), block("paragraph"),
    ],
  },
  "print-decals": {
    layoutKey: "pantry-compact",
    heroSourceId: mediaSourceId("print-decals", 1),
    sections: [
      block("titular"), block("paragraph"), block("facts"), block("gallery", mediaRange("print-decals", 2, 21)), block("paragraph"),
    ],
  },
});

export function validateAdvertisingDetailLayouts(layouts, records) {
  const recordBySource = new Map(records.map((record) => [record.media.sourceId, record]));
  const assigned = [];
  const supportedKinds = new Set(["titular", "paragraph", "facts", "gallery", "single", "double", "columns", "banner"]);

  for (const [slug, layout] of Object.entries(layouts)) {
    if (!layout.layoutKey || !recordBySource.has(layout.heroSourceId)) throw new Error(`${slug} detail layout requires a valid layoutKey and heroSourceId`);
    const categorySources = [layout.heroSourceId];
    for (const section of layout.sections) {
      if (!supportedKinds.has(section.kind)) throw new Error(`${slug} has unsupported detail block: ${section.kind}`);
      const count = section.sourceIds?.length ?? 0;
      if ((section.kind === "single" || section.kind === "banner") && count !== 1) throw new Error(`${slug} ${section.kind} requires one source`);
      if (section.kind === "double" && count !== 2) throw new Error(`${slug} double requires two sources`);
      if (section.kind === "gallery" && count < 2) throw new Error(`${slug} gallery requires at least two sources`);
      if (!["single", "double", "gallery", "banner"].includes(section.kind) && count !== 0) throw new Error(`${slug} ${section.kind} cannot own media`);
      categorySources.push(...(section.sourceIds ?? []));
    }
    for (const sourceId of categorySources) {
      const record = recordBySource.get(sourceId);
      if (!record || record.category !== slug) throw new Error(`${slug} references media outside its category: ${sourceId}`);
    }
    const expected = records.filter((record) => record.category === slug).map((record) => record.media.sourceId);
    if (categorySources.length !== expected.length || new Set(categorySources).size !== expected.length || expected.some((sourceId) => !categorySources.includes(sourceId))) {
      throw new Error(`${slug} detail layout must partition every category source exactly once`);
    }
    assigned.push(...categorySources);
  }
  if (assigned.length !== records.length || new Set(assigned).size !== records.length) throw new Error("Detail layouts must partition the canonical media pool exactly once");
  return layouts;
}

validateAdvertisingDetailLayouts(ADVERTISING_DETAIL_LAYOUTS, ADVERTISING_MEDIA_MANIFEST);

export const ADVERTISING_CATEGORIES = deepFreeze(CATEGORY_TAXONOMY.map((entry) => {
  const detailMedia = ADVERTISING_MEDIA_MANIFEST.filter((record) => record.category === entry.slug);
  const [coverRecord, ...galleryRecords] = detailMedia;
  return {
    ...entry,
    cover: coverRecord.media.src,
    coverWidth: coverRecord.media.width,
    coverHeight: coverRecord.media.height,
    gallery: galleryRecords.slice(0, 2).map(({ media }) => [media.src, media.altVi, media.altEn, media.width, media.height]),
    detailLayout: ADVERTISING_DETAIL_LAYOUTS[entry.slug],
    detailMedia,
  };
}));

const CATEGORY_ORDER = ADVERTISING_CATEGORIES.map((entry) => entry.slug);
const SOURCE_ADVERTISING_CARDS = ADVERTISING_MEDIA_MANIFEST;

function selectCardMedia(record) {
  for (const legacyField of ["presentationCanvas", "fitMode", "mediaCandidates"]) {
    if (Object.hasOwn(record, legacyField)) throw new Error(`Legacy card field is not supported: ${legacyField}: ${record.id}`);
  }
  const { media, mediaItems: _mediaItems, coverMediaId: _coverMediaId, rank: _rank, layoutSpan: _legacyLayoutSpan, ...card } = record;
  if (typeof media?.src !== "string" || !media.src || !Number.isFinite(media.width) || media.width <= 0 || !Number.isFinite(media.height) || media.height <= 0) {
    throw new Error(`Invalid media: ${card.id}`);
  }
  const { id: _mediaId, sourceOrder: _mediaSourceOrder, ...selectedMedia } = media;
  const { mediaItems, coverMediaId } = validateAdvertisingCardMedia(record);
  return {
    ...card,
    media: selectedMedia,
    mediaItems,
    coverMediaId,
  };
}

function compileCards(cards, categories) {
  const categoryOrder = categories.map((entry) => entry.slug);
  return scheduleAdvertisingRank(cards.map(selectCardMedia), categoryOrder);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function artifactCategories(categories) {
  return categories.map(({ detailLayout: _detailLayout, detailMedia: _detailMedia, ...entry }) => ({
    ...entry,
    products: entry.products.map(({ mediaIndex: _mediaIndex, ...product }) => product),
  }));
}

export const ADVERTISING_CARDS = deepFreeze(compileCards(SOURCE_ADVERTISING_CARDS, ADVERTISING_CATEGORIES));

export function compileAdvertisingLayout(options = {}) {
  return compileLayout({
    cards: ADVERTISING_CARDS,
    categoryOrder: CATEGORY_ORDER,
    datasetVersion: ADVERTISING_DATASET_VERSION,
    ...options,
  });
}

/** @param {any} [options] */
export function buildAdvertisingArtifact(options = {}) {
  const { categories = ADVERTISING_CATEGORIES, cards = SOURCE_ADVERTISING_CARDS } = options;
  const settings = {};
  const compiledCards = compileCards(cards, categories);
  return deepFreeze({
    datasetVersion: ADVERTISING_DATASET_VERSION,
    layoutAlgorithmVersion: ADVERTISING_LAYOUT_ALGORITHM_VERSION,
    settings,
    tagRegistry: ADVERTISING_TAG_REGISTRY,
    categories: artifactCategories(categories),
    cards: compiledCards,
  });
}
