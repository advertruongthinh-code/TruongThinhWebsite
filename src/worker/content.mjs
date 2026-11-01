// Nội dung editor CMS đã lưu (docs/specs/cms-editor.md R8, R10): kiểm nháp gửi lên, dấu chỗ gốc, áp lên HTML nguồn bằng
// đúng code của bản xem trước (cms-core.js) trên DOM linkedom, và script vá catalog Sản phẩm Quảng cáo. index.js nạp
// module này lười (import động) nên linkedom chỉ khởi tạo khi trang có nội dung đã lưu.
import { parseHTML } from "linkedom/worker";
import { ADVERTISING_PRODUCTS } from "../site/advertising-products/taxonomy.mjs";
import "../admin/cms-core.js";

const { stamp, apply, anchorOf, patchCatalog } = globalThis.TTCms;

export const CONTENT_PAGES = new Set(["home", "residential", "commercial", "about", "advertising"]);
const PRODUCT_IDS = new Set(ADVERTISING_PRODUCTS.map(({ id }) => id));
const MAX_EDITS_BYTES = 256 * 1024;
const TEXT_KEY = /^(?:title|description|t\d{1,4}(?:@n[a-z0-9]{1,12})?)$/;
const IMAGE_KEY = /^i\d{1,4}(?:@n[a-z0-9]{1,12})?$/;
const LIST_KEY = /^l\d{1,2}$/;
const ITEM_ID = /^(?:\d{1,4}|n[a-z0-9]{1,12})$/;
const CLONE_ID = /^n[a-z0-9]{1,12}$/;
const CARD_ID = /^[a-z0-9][a-z0-9-]{0,99}$/;
// Chỉ ảnh trong thư viện media tĩnh (R5); không nhận URL ngoài, không có "..".
const MEDIA_SRC = /^\/assets\/content\/(?:[\w-]+\/)*[\w.-]+\.(?:webp|svg|png|jpe?g)$/;
const EDITOR_ATTRIBUTES = ["data-cms-key", "data-cms-list", "data-cms-label", "data-cms-item", "data-cms-shuffled", "data-cms-empty"];

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const filled = (value, max) => typeof value === "string" && value.trim() !== "" && value.length <= max;
// linkedom không thoát "&" trong thuộc tính (data-vi, data-en): chữ dạng mã HTML như "&amp;" sẽ hiện thành "&" trên web.
const ENTITY = /&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]*);/i;
const plain = (value) => !ENTITY.test(value);
const size = (value) => Number.isInteger(value) && value > 0 && value <= 20000;
const validImage = (image) => isObject(image) && MEDIA_SRC.test(image.src ?? "") && !image.src.includes("..")
  && size(image.width) && size(image.height)
  && ["altVi", "altEn"].every((field) => typeof image[field] === "string" && image[field].length <= 500);

// Trả lỗi đầu tiên (chuỗi) hoặc null. Chữ, ảnh trống bị chặn: lưu là lên web nên không đăng placeholder rỗng.
export function validateEdits(page, edits) {
  if (!isObject(edits)) return "edits phải là object.";
  if (new TextEncoder().encode(JSON.stringify(edits)).length > MAX_EDITS_BYTES) return "Nháp quá lớn.";
  if (page === "advertising") {
    if (Object.keys(edits).some((key) => key !== "cards") || !isObject(edits.cards)) return "Trang Sản phẩm Quảng cáo chỉ nhận cards.";
    for (const [id, card] of Object.entries(edits.cards)) {
      if (!CARD_ID.test(id) || !isObject(card)) return `Card ${id} không hợp lệ.`;
      if (!filled(card.titleVi, 200) || !filled(card.titleEn, 200)) return `Card ${id}: thiếu tên VI hoặc EN.`;
      if (!filled(card.descriptionVi, 2000) || !filled(card.descriptionEn, 2000)) return `Card ${id}: thiếu mô tả VI hoặc EN.`;
      const products = card.productIds;
      if (!Array.isArray(products) || !products.length || products.length > 8 || new Set(products).size !== products.length
        || products.some((product) => !PRODUCT_IDS.has(product))) return `Card ${id}: sản phẩm không có trong taxonomy.`;
      const items = card.mediaItems;
      if (!Array.isArray(items) || !items.length || items.length > 24) return `Card ${id}: cần 1 đến 24 media.`;
      if (!items.every((item) => isObject(item) && CARD_ID.test(item.id ?? "") && item.kind === "image" && validImage(item))
        || new Set(items.map((item) => item.id)).size !== items.length) return `Card ${id}: media không hợp lệ.`;
      if (!items.some((item) => item.id === card.coverMediaId)) return `Card ${id}: ảnh bìa không thuộc media của card.`;
    }
    return null;
  }
  if (Object.keys(edits).some((key) => !["text", "image", "list", "clone"].includes(key))) return "Khóa nháp lạ.";
  const { text = {}, image = {}, list = {}, clone = {} } = edits;
  if (![text, image, list, clone].every(isObject)) return "text, image, list, clone phải là object.";
  for (const [key, value] of Object.entries(text)) {
    if (!TEXT_KEY.test(key) || !isObject(value) || !filled(value.vi, 4000) || !filled(value.en, 4000)) return `Chữ ${key}: cần đủ tiếng Việt và tiếng Anh.`;
    if (!plain(value.vi) || !plain(value.en)) return `Chữ ${key}: không gõ mã HTML dạng &amp;, gõ thẳng ký tự.`;
  }
  for (const [key, value] of Object.entries(image)) {
    if (!IMAGE_KEY.test(key) || !validImage(value)) return `Ảnh ${key}: cần ảnh trong thư viện.`;
  }
  const listed = new Set();
  for (const [key, order] of Object.entries(list)) {
    if (!LIST_KEY.test(key) || !Array.isArray(order) || order.length > 200 || new Set(order).size !== order.length
      || !order.every((id) => typeof id === "string" && ITEM_ID.test(id))) return `Danh sách ${key} không hợp lệ.`;
    order.forEach((id) => listed.add(id));
  }
  for (const [id, template] of Object.entries(clone)) {
    if (!CLONE_ID.test(id) || typeof template !== "string" || !/^\d{1,4}$/.test(template) || !listed.has(id)) return `Mục mới ${id} không hợp lệ.`;
  }
  for (const key of [...Object.keys(text), ...Object.keys(image)]) {
    const id = key.split("@")[1];
    if (id && !clone[id]) return `Khóa ${key} thuộc mục không có.`;
  }
  return null;
}

const baseKey = (key) => key.split("@")[0];
// Khóa gốc của mọi sửa đổi: chữ, ảnh (bỏ hậu tố @id của mục mới) và danh sách.
const editedKeys = (edits) => [...new Set([...Object.keys(edits.text ?? {}), ...Object.keys(edits.image ?? {})].map(baseKey)),
  ...Object.keys(edits.list ?? {})];

function stamped(html, page) {
  const { document } = parseHTML(html);
  stamp(document, page);
  return document;
}

// Lúc lưu: ghi dấu chỗ gốc của mọi khóa được sửa. Editor gửi kèm dấu nó thấy lúc sửa (seen): khác nguồn hiện tại nghĩa là
// trang đã đổi bản sau lúc sửa, khóa có thể trỏ sang chỗ khác nên không lưu. Mục mới phải đủ chữ, ảnh (không đăng ô trống).
export function anchorsFor(html, page, edits, seen = {}) {
  const document = stamped(html, page);
  const anchors = {};
  for (const key of editedKeys(edits)) {
    anchors[key] = anchorOf(document, key);
    if (anchors[key] === undefined) return { error: `Chỗ ${key} không còn trên trang, tải lại editor.` };
    if (seen[key] !== undefined && seen[key] !== anchors[key]) return { error: `Trang vừa cập nhật, chỗ ${key} đã đổi: tải lại editor rồi kiểm lại.` };
  }
  for (const [listKey, order] of Object.entries(edits.list ?? {})) {
    for (const id of order.filter((entry) => edits.clone?.[entry])) {
      const template = document.querySelector(`[data-cms-list="${listKey}"] > [data-cms-item="${edits.clone[id]}"]`);
      if (!template) return { error: `Mục mới ${id} không có mẫu.` };
      const missing = [...template.querySelectorAll("[data-cms-key]")].map((node) => `${node.dataset.cmsKey}@${id}`)
        .filter((key) => !(key in (edits.text ?? {})) && !(key in (edits.image ?? {})));
      if (missing.length) return { error: `Mục mới ${id} còn ô trống: ${missing.join(", ")}.` };
    }
  }
  return { anchors };
}

// Giữ sửa đổi còn khớp dấu; khóa lệch (HTML nguồn đã đổi sau lúc lưu) vào stale và không áp, thay vì áp nhầm chỗ.
function freshOf(document, edits, anchors) {
  const fresh = { text: {}, image: {}, list: {}, clone: {} };
  const stale = [];
  for (const [key, order] of Object.entries(edits.list ?? {})) {
    if (anchorOf(document, key) === anchors[key]) fresh.list[key] = order;
    else stale.push(key);
  }
  const clones = new Set(Object.values(fresh.list).flat().filter((id) => edits.clone?.[id]));
  clones.forEach((id) => (fresh.clone[id] = edits.clone[id]));
  for (const map of ["text", "image"]) {
    for (const [key, value] of Object.entries(edits[map] ?? {})) {
      const id = key.split("@")[1];
      if ((!id || clones.has(id)) && anchorOf(document, baseKey(key)) === anchors[baseKey(key)]) fresh[map][key] = value;
      else stale.push(key);
    }
  }
  return { fresh, stale };
}

export function freshEdits(html, page, edits, anchors) {
  return freshOf(stamped(html, page), edits, anchors);
}

// HTML nguồn tiếng Việt kèm nội dung đã lưu; pipeline locale của index.js chạy tiếp như với HTML tĩnh.
export function renderPage(html, page, edits, anchors) {
  const document = stamped(html, page);
  const { fresh, stale } = freshOf(document, edits, anchors);
  // <title> là thẻ chữ thô: linkedom ghi textContent của nó nguyên văn, không thoát "<". Title của editor do HTMLRewriter
  // của index.js ghi (có thoát), không đi qua đây.
  const text = { ...fresh.text };
  delete text.title;
  apply(document, { ...fresh, text }, "vi");
  // Chỗ editor đã sửa thắng field CMS cũ cùng phần tử (CmsField của index.js đọc data-cms).
  Object.keys(fresh.text).forEach((key) => document.querySelectorAll(`[data-cms-key="${key}"]`).forEach((node) => node.removeAttribute("data-cms")));
  // Hero đã sửa: danh sách preload viết sẵn trong <head> không còn khớp slide (cms-editor gate); bỏ preload, đánh lại
  // data-slide để script xáo của trang chạy đúng (ảnh đầu tải như ảnh lazy).
  const hero = document.querySelector(".hero-slides[data-cms-list]");
  if (hero && (fresh.list[hero.dataset.cmsList] || [...hero.querySelectorAll("img[data-cms-key]")].some((img) => fresh.image[img.dataset.cmsKey]))) {
    hero.querySelectorAll(":scope > .hero-slide").forEach((slide, index) => (slide.dataset.slide = String(index)));
    [...document.querySelectorAll("head script")].find((script) => script.textContent.includes("dataset.heroFirst = first"))?.remove();
  }
  EDITOR_ATTRIBUTES.forEach((name) => document.querySelectorAll(`[${name}]`).forEach((node) => node.removeAttribute(name)));
  return { html: document.toString(), fresh, stale };
}

// Một bản render mỗi trang, theo phiên bản đã lưu và ETag của HTML nguồn: request sau không parse lại.
const rendered = new Map();
export async function renderSaved(page, row, source) {
  const etag = source.headers.get("etag");
  const key = `${row.updated_at}|${etag}`;
  const hit = rendered.get(page);
  if (etag && hit?.key === key) return hit.value;
  const { html, fresh } = renderPage(await source.text(), page, JSON.parse(row.edits_json), JSON.parse(row.anchors_json));
  const value = { html, text: fresh.text };
  if (etag) rendered.set(page, { key, value });
  return value;
}

// Script đầu <head> của trang Sản phẩm Quảng cáo: runtime nhận catalog đã vá qua hook có sẵn (R7, R10).
export const catalogScript = (cards) =>
  `<script>window.__TT_ADVERTISING_ARTIFACT__=(${patchCatalog})(${JSON.stringify(cards).replace(/</g, "\\u003c")});</script>`;
