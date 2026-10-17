import {
  ADVERTISING_LAYOUT_ALGORITHM_VERSION,
  compileAdvertisingProductLayout as compileLayout,
  scheduleAdvertisingRank,
} from "./layout-core.mjs";
import { validateAdvertisingCardMedia, validateAdvertisingMediaPool } from "./media-contract.mjs";
import { ADVERTISING_MEDIA_MANIFEST } from "./media-manifest.mjs";
import { ADVERTISING_TAG_REGISTRY } from "./photo-tags.mjs";
import { ADVERTISING_CLUSTERS, ADVERTISING_PRODUCTS, ADVERTISING_THIN_PRODUCT_THRESHOLD } from "./taxonomy.mjs";

export const ADVERTISING_DATASET_VERSION = "2026-09-24.1";

const category = ({ slug, titleVi, titleEn, statementVi, statementEn, products }) => ({
  slug,
  titleVi,
  titleEn,
  statementVi,
  statementEn,
  products: products.map(([productVi, productEn]) => ({ titleVi: productVi, titleEn: productEn })),
});

const LEGACY_CATEGORY_TAXONOMY = [
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
      ["Kỷ niệm chương", "Award plaques"],
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

validateAdvertisingMediaPool(ADVERTISING_MEDIA_MANIFEST, {
  tagRegistry: ADVERTISING_TAG_REGISTRY,
  clusters: ADVERTISING_CLUSTERS,
  products: ADVERTISING_PRODUCTS,
});

const clusterIdByProductId = new Map(ADVERTISING_PRODUCTS.map((product) => [product.id, product.cluster]));

// Sáu nhóm cũ chỉ còn cho trang tương thích /advertising-products/<slug cũ>/ (phát hành tĩnh R7).
export const ADVERTISING_LEGACY_CATEGORIES = deepFreeze(LEGACY_CATEGORY_TAXONOMY.map((entry) => {
  const [coverRecord, ...galleryRecords] = ADVERTISING_MEDIA_MANIFEST.filter((record) => record.category === entry.slug);
  return {
    ...entry,
    cover: coverRecord.media.src,
    coverWidth: coverRecord.media.width,
    coverHeight: coverRecord.media.height,
    gallery: galleryRecords.slice(0, 2).map(({ media }) => [media.src, media.altVi, media.altEn, media.width, media.height]),
  };
}));

// Filter và rail theo cụm (taxonomy R3): slug là id cụm, nhãn rail là tên ngắn railVi, railEn của taxonomy.mjs.
export const ADVERTISING_CATEGORIES = deepFreeze(ADVERTISING_CLUSTERS.map(({ id, slugVi, slugEn, legacySlug, railVi, railEn }) => ({
  slug: id, slugVi, slugEn, legacySlug, titleVi: railVi, titleEn: railEn,
})));

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
    // Card thuộc cụm của sản phẩm chính (taxonomy R1); fixture test không có productIds thì giữ category.
    category: card.productIds ? clusterIdByProductId.get(card.productIds[0]) : card.category,
    // Sản phẩm của ảnh cũng là tag nhóm product, nên ?tag= và nút gợi ý chạy với sản phẩm mới (taxonomy R7).
    ...(card.productIds ? { tagIds: [...card.productIds, ...card.tagIds] } : {}),
    media: selectedMedia,
    mediaItems,
    coverMediaId,
  };
}

function compileCards(cards, categories) {
  const categoryOrder = categories.map((entry) => entry.slug);
  // sourceOrder của manifest đếm theo nhóm cũ; đánh lại theo cụm, giữ thứ tự manifest.
  const nextSourceOrder = new Map();
  return scheduleAdvertisingRank(cards.map(selectCardMedia).map((card) => {
    const sourceOrder = nextSourceOrder.get(card.category) ?? 0;
    nextSourceOrder.set(card.category, sourceOrder + 1);
    return { ...card, sourceOrder };
  }), categoryOrder);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export const ADVERTISING_CARDS = deepFreeze(compileCards(SOURCE_ADVERTISING_CARDS, ADVERTISING_CATEGORIES));

// Khớp <title> và kicker của advertising-products/index.html (test advertising-pages giữ đồng bộ).
export const ADVERTISING_ROOT_PAGE = deepFreeze({
  filter: "all", vi: "", en: "", labelVi: "Sản phẩm quảng cáo", labelEn: "Advertising products",
  titleVi: "Sản phẩm Quảng cáo — Trường Thịnh", titleEn: "Advertising products — Trường Thịnh",
});
// Trang tĩnh cụm và sản phẩm (taxonomy R4); sản phẩm dưới ngưỡng trang mỏng không có trang (R5).
// vi, en là path sau /<locale>/advertising-products/; filter là id cụm hoặc id sản phẩm.
const clusterById = new Map(ADVERTISING_CLUSTERS.map((cluster) => [cluster.id, cluster]));
export const ADVERTISING_PAGES = deepFreeze([
  ...ADVERTISING_CLUSTERS.map((cluster) => ({ ...cluster, filter: cluster.id, cluster: cluster.id, vi: cluster.slugVi, en: cluster.slugEn })),
  ...ADVERTISING_PRODUCTS
    .filter(({ id }) => ADVERTISING_CARDS.filter((card) => card.productIds?.includes(id)).length >= ADVERTISING_THIN_PRODUCT_THRESHOLD)
    .map((product) => {
      const cluster = clusterById.get(product.cluster);
      return {
        ...product, filter: product.id, descriptionVi: product.introVi, descriptionEn: product.introEn,
        vi: `${cluster.slugVi}/${product.slugVi}`, en: `${cluster.slugEn}/${product.slugEn}`,
      };
    }),
]);

export function compileAdvertisingLayout(options = {}) {
  return compileLayout({
    cards: ADVERTISING_CARDS,
    categoryOrder: CATEGORY_ORDER,
    datasetVersion: ADVERTISING_DATASET_VERSION,
    ...options,
  });
}

// Tag nhóm product sinh từ taxonomy, đứng trước tag cũ trong artifact.
const ARTIFACT_TAG_REGISTRY = [
  ...ADVERTISING_PRODUCTS.map(({ id, labelVi, labelEn }) => ({ id, group: "product", labelVi, labelEn })),
  ...ADVERTISING_TAG_REGISTRY,
];
const RELATED_TAG_GROUPS = new Set(["product", "variant", "use", "service"]);
const tagGroupById = new Map(ARTIFACT_TAG_REGISTRY.map((tag) => [tag.id, tag.group]));

// Láng giềng related (taxonomy R7): card chứa sản phẩm chính của ảnh trước, rồi card cùng cụm; trong mỗi phần
// điểm là số tag chung (bỏ tag khung hình). Ghi id card theo tầng điểm giảm dần; runtime chỉ xáo trong một tầng.
// Tầng điểm 0 (cùng cụm, không tag chung) không ghi để artifact không phình theo n²; runtime tự nối vào cuối.
function attachRelated(cards) {
  return cards.map((hero) => {
    const heroTags = new Set((hero.tagIds || []).filter((id) => RELATED_TAG_GROUPS.has(tagGroupById.get(id))));
    const primary = hero.productIds?.[0];
    const tiers = new Map();
    for (const card of cards) {
      const samePrimary = Boolean(primary && card.productIds?.includes(primary));
      if (card === hero || (!samePrimary && card.category !== hero.category)) continue;
      // 1000 lớn hơn mọi số tag chung, nên card cùng sản phẩm chính luôn đứng trước.
      const score = (samePrimary ? 1000 : 0) + (card.tagIds || []).filter((id) => heroTags.has(id)).length;
      if (!score) continue;
      tiers.set(score, [...(tiers.get(score) || []), card.id]);
    }
    return { ...hero, related: [...tiers].sort(([left], [right]) => right - left).map(([, ids]) => ids) };
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
    tagRegistry: ARTIFACT_TAG_REGISTRY,
    categories,
    clusters: ADVERTISING_CLUSTERS,
    products: ADVERTISING_PRODUCTS,
    // Trang gốc (filter "all", path rỗng) cùng trang cụm, sản phẩm: runtime đổi path, title và kicker theo filter.
    pages: [ADVERTISING_ROOT_PAGE, ...ADVERTISING_PAGES]
      .map(({ filter, vi, en, labelVi, labelEn, titleVi, titleEn }) => ({ filter, vi, en, labelVi, labelEn, titleVi, titleEn })),
    cards: attachRelated(compiledCards),
  });
}
