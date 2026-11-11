// Saved CMS editor content (docs/specs/cms-editor.md R8, R10): validates the submitted draft, original anchors, applies it to the source HTML with
// the exact preview code (cms-core.js) on the linkedom DOM, and the script that patches the Advertising Products catalog. index.js loads
// this module lazily (dynamic import) so linkedom only initializes when a page has saved content.
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
// Only images in the static media library (R5); no external URLs, no "..".
const MEDIA_SRC = /^\/assets\/content\/(?:[\w-]+\/)*[\w.-]+\.(?:webp|svg|png|jpe?g)$/;
const EDITOR_ATTRIBUTES = ["data-cms-key", "data-cms-list", "data-cms-label", "data-cms-item", "data-cms-shuffled", "data-cms-empty"];

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const filled = (value, max) => typeof value === "string" && value.trim() !== "" && value.length <= max;
// linkedom does not escape "&" in attributes (data-vi, data-en): text in HTML-entity form like "&amp;" would show as "&" on the web.
const ENTITY = /&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]*);/i;
const plain = (value) => !ENTITY.test(value);
const size = (value) => Number.isInteger(value) && value > 0 && value <= 20000;
const validImage = (image) => isObject(image) && MEDIA_SRC.test(image.src ?? "") && !image.src.includes("..")
  && size(image.width) && size(image.height)
  && ["altVi", "altEn"].every((field) => typeof image[field] === "string" && image[field].length <= 500);

// Returns the first error (string) or null. Empty text and images are rejected: saving goes live, so no empty placeholder is published.
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
// The original key of every edit: text, images (dropping the @id suffix of new items) and lists.
const editedKeys = (edits) => [...new Set([...Object.keys(edits.text ?? {}), ...Object.keys(edits.image ?? {})].map(baseKey)),
  ...Object.keys(edits.list ?? {})];

function stamped(html, page) {
  const { document } = parseHTML(html);
  stamp(document, page);
  return document;
}

// On save: record the original anchor of every edited key. The editor sends the anchor it saw at edit time (seen): differing from the current source means
// the page changed version after the edit, a key may point elsewhere so it is not saved. A new item must have all text and images (no blank cells published).
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

// Keep edits that still match the anchor; a mismatched key (source HTML changed after save) goes to stale and is not applied, instead of applying to the wrong place.
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

// Vietnamese source HTML with saved content; index.js's locale pipeline continues as with static HTML.
export function renderPage(html, page, edits, anchors) {
  const document = stamped(html, page);
  const { fresh, stale } = freshOf(document, edits, anchors);
  // <title> is a raw-text tag: linkedom writes its textContent verbatim, without escaping "<". The editor's title is written by index.js's
  // HTMLRewriter (with escaping), not through here.
  const text = { ...fresh.text };
  delete text.title;
  apply(document, { ...fresh, text }, "vi");
  // Spots the editor edited win over the old CMS field on the same element (index.js's CmsField reads data-cms).
  Object.keys(fresh.text).forEach((key) => document.querySelectorAll(`[data-cms-key="${key}"]`).forEach((node) => node.removeAttribute("data-cms")));
  // Edited hero: the preload list hard-written in <head> no longer matches the slides (cms-editor gate); drop the preload, renumber
  // data-slide so the page's shuffle script runs correctly (the first image loads like a lazy image).
  const hero = document.querySelector(".hero-slides[data-cms-list]");
  if (hero && (fresh.list[hero.dataset.cmsList] || [...hero.querySelectorAll("img[data-cms-key]")].some((img) => fresh.image[img.dataset.cmsKey]))) {
    hero.querySelectorAll(":scope > .hero-slide").forEach((slide, index) => (slide.dataset.slide = String(index)));
    [...document.querySelectorAll("head script")].find((script) => script.textContent.includes("dataset.heroFirst = first"))?.remove();
  }
  EDITOR_ATTRIBUTES.forEach((name) => document.querySelectorAll(`[${name}]`).forEach((node) => node.removeAttribute(name)));
  return { html: document.toString(), fresh, stale };
}

// One render per page, by saved version and the source HTML's ETag: later requests do not parse again.
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

// First script in <head> of the Advertising Products page: the runtime receives the patched catalog through the existing hook (R7, R10).
export const catalogScript = (cards) =>
  `<script>window.__TT_ADVERTISING_ARTIFACT__=(${patchCatalog})(${JSON.stringify(cards).replace(/</g, "\\u003c")});</script>`;
