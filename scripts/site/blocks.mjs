// Bộ khối dùng chung cho trang công trình và News (layout-library R1, R4): kiểm dữ liệu JSON rồi dựng HTML tĩnh.
// Chữ VI nằm trong thẻ, EN nằm ở data-en như các trang hiện có; build localeHtml đổi sang EN.
// Cùng dữ liệu luôn ra cùng HTML; chữ chỉ là chữ thường, mọi ký tự HTML bị escape.
import { existsSync } from "node:fs";
import path from "node:path";

export const BLOCK_SCHEMA_VERSION = 1;
export const ZALO_HREF = "https://zalo.me/0949131050";

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_SRC = /^\/assets\/content\/[a-z0-9/-]+\.webp$/;
// ponytail: chỉ link nội bộ /vi|/en hoặc Zalo; mở rộng khi CMS cần link ngoài có kiểm.
const SAFE_HREF = /^(?:\/(?:vi|en)\/[a-z0-9/-]*|https:\/\/zalo\.me\/\d+)$/;

// ponytail: chữ v1 chỉ là đoạn thường tách bằng dòng trống; đậm, nghiêng, link trong đoạn làm khi CMS cần.
const paragraphs = (text) => text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
const localized = (tag, text, attributes = "") => `<${tag}${attributes} data-en="${escapeHtml(text.en)}">${escapeHtml(text.vi)}</${tag}>`;
const localizedParagraphs = (text, attributes = "") => {
  const vi = paragraphs(text.vi);
  const en = paragraphs(text.en);
  return vi.map((part, index) => localized("p", { vi: part, en: en[index] }, attributes)).join("\n");
};
const image = (media, attributes = 'loading="lazy"') =>
  `<img src="${media.src}" width="${media.width}" height="${media.height}" alt="${escapeHtml(media.altVi)}" data-en-alt="${escapeHtml(media.altEn)}" ${attributes} />`;
const figure = (media, className) => `<figure class="${className}">${image(media)}</figure>`;

// Mỗi khối: các trường bắt buộc theo kiểu và hàm dựng HTML. ctx có danh sách công trình, bài News để khối tự lấy.
const BLOCKS = {
  "hero-project": {
    text: ["titleLine1", "titleLine2"],
    optionalText: ["subtitle"],
    media: ["image"],
    render: (block) => [
      '<section class="blk-hero" data-header-tone="light">',
      `  <figure class="blk-hero__media">${image(block.image, 'fetchpriority="high"')}</figure>`,
      '  <div class="blk-hero__copy">',
      `    <h1 class="blk-hero__title">${localized("span", block.titleLine1)} ${localized("span", block.titleLine2, ' class="blk-hero__line2"')}</h1>`,
      block.subtitle ? `    ${localized("p", block.subtitle, ' class="blk-hero__subtitle"')}` : "",
      "  </div>",
      "</section>",
    ].filter(Boolean).join("\n"),
  },
  "section-title": {
    text: ["text"],
    render: (block) => `<section class="blk blk-title section-gap" data-header-tone="ink">${localized("h2", block.text)}</section>`,
  },
  paragraph: {
    text: ["text"],
    render: (block) => `<section class="blk blk-paragraph section-gap" data-header-tone="ink">${localizedParagraphs(block.text)}</section>`,
  },
  "paragraph-columns": {
    text: ["text"],
    render: (block) => `<section class="blk blk-paragraph blk-paragraph--columns section-gap" data-header-tone="ink">${localizedParagraphs(block.text)}</section>`,
  },
  "image-single": {
    media: ["image"],
    optionalText: ["caption"],
    enums: { position: ["wide", "left-2-3", "right-2-3", "left-1-2", "right-1-2"] },
    render: (block) => [
      `<section class="blk blk-image blk-image--${block.position} section-gap" data-header-tone="ink">`,
      `  <figure class="blk-image__figure">${image(block.image)}${block.caption ? localized("figcaption", block.caption) : ""}</figure>`,
      "</section>",
    ].join("\n"),
  },
  "image-pair": {
    mediaList: { images: [2, 2] },
    enums: { layout: ["equal", "left-large", "right-large"] },
    render: (block) => `<section class="blk blk-pair blk-pair--${block.layout} section-gap" data-header-tone="ink">${block.images.map((media) => figure(media, "blk-pair__item")).join("")}</section>`,
  },
  "video-single": {
    video: ["video"],
    optionalText: ["caption"],
    render: (block) => [
      '<section class="blk blk-video section-gap" data-header-tone="ink">',
      `  <figure class="blk-video__figure"><video src="${block.video.src}" poster="${block.video.poster}" width="${block.video.width}" height="${block.video.height}" muted playsinline controls preload="metadata"></video>${block.caption ? localized("figcaption", block.caption) : ""}</figure>`,
      "</section>",
    ].join("\n"),
  },
  "gallery-carousel": {
    mediaList: { images: [2, 12] },
    // Dùng đúng khung Gallery của trang Nhà ở để detail.js gắn Swiper (detail-pages R5).
    render: (block) => [
      '<section class="detail-gallery blk-gallery section-gap" data-gallery data-header-tone="ink">',
      '  <div class="detail-gallery__track" data-gallery-track>',
      '    <div class="detail-gallery__slides">',
      ...block.images.map((media) => `      ${figure(media, "detail-gallery__item")}`),
      "    </div>",
      "  </div>",
      '  <div class="detail-gallery__pagination" data-gallery-pagination></div>',
      "</section>",
    ].join("\n"),
  },
  "facts-grid": {
    list: { items: [2, 4], text: ["label", "text"] },
    render: (block) => [
      `<section class="blk blk-facts blk-facts--${block.items.length} section-gap" data-header-tone="ink">`,
      '  <ol class="blk-facts__list">',
      ...block.items.map((item) => `    <li class="blk-facts__item">${localized("h3", item.label, ' class="blk-facts__label"')}${localized("p", item.text, ' class="blk-facts__text"')}</li>`),
      "  </ol>",
      "</section>",
    ].join("\n"),
  },
  "contact-quick": {
    text: ["title"],
    render: (block) => [
      '<section class="blk blk-contact section-gap" data-header-tone="ink">',
      `  ${localized("h2", block.title, ' class="blk-contact__title"')}`,
      `  <a class="blk-contact__zalo" href="${ZALO_HREF}" target="_blank" rel="noopener" data-en="Chat on Zalo">Nhắn Zalo</a>`,
      "</section>",
    ].join("\n"),
  },
  "project-slider": {
    ids: "projects",
    // Thẻ so le cao thấp như rail trang chủ (ProjectReel); bấm mở trang công trình.
    render: (block, ctx) => {
      const variants = ["high", "low"];
      return [
        '<section class="blk blk-projects section-gap" data-header-tone="ink">',
        '  <div class="blk-projects__track">',
        ...block.projectIds.map((id, index) => {
          const project = ctx.projects.get(id);
          const cover = project.cover;
          return [
            `    <a class="project-card project-card--${variants[index % 2]} blk-projects__card" href="/vi/projects/${project.slugVi}/" data-en-href="/en/projects/${project.slugEn}/">`,
            `      <span class="project-card__media">${image(cover)}</span>`,
            `      ${localized("span", project.title, ' class="blk-projects__name"')}`,
            "    </a>",
          ].join("\n");
        }),
        "  </div>",
        "</section>",
      ].join("\n");
    },
  },
  "cta-arrow": {
    text: ["text"],
    href: ["hrefVi", "hrefEn"],
    render: (block) => `<section class="blk blk-cta section-gap" data-header-tone="ink"><a class="blk-cta__link" href="${block.hrefVi}" data-en-href="${block.hrefEn}">${localized("span", block.text)}<span class="blk-cta__arrow" aria-hidden="true"></span></a></section>`,
  },
  quote: {
    text: ["text"],
    optionalText: ["author"],
    render: (block) => `<section class="blk blk-quote section-gap" data-header-tone="ink"><blockquote>${localizedParagraphs(block.text)}${block.author ? localized("cite", block.author) : ""}</blockquote></section>`,
  },
  "news-cards": {
    ids: "news",
    render: (block, ctx) => [
      '<section class="blk blk-news-cards section-gap" data-header-tone="ink">',
      '  <div class="blk-news-cards__grid">',
      ...block.newsIds.map((id) => {
        const post = ctx.news.get(id);
        return `    <a class="blk-news-card" href="/vi/news/${post.slugVi}/" data-en-href="/en/news/${post.slugEn}/">${image(post.cover)}${localized("span", post.title, ' class="blk-news-card__title"')}</a>`;
      }),
      "  </div>",
      "</section>",
    ].join("\n"),
  },
  "banner-links": {
    list: { items: [1, 3], text: ["title"], media: ["image"], href: ["hrefVi", "hrefEn"] },
    render: (block) => [
      `<section class="blk blk-banners blk-banners--${block.items.length} section-gap" data-header-tone="ink">`,
      ...block.items.map((item) => `  <a class="blk-banner" href="${item.hrefVi}" data-en-href="${item.hrefEn}">${image(item.image)}${localized("span", item.title, ' class="blk-banner__title"')}</a>`),
      "</section>",
    ].join("\n"),
  },
};
export const BLOCK_TYPES = Object.keys(BLOCKS);

// Kiểm một trang (công trình hoặc bài News). Trả danh sách lỗi, không dừng ở lỗi đầu.
export async function validateBlockPage(page, { siteRoot, projects = new Map(), news = new Map(), at = page?.id ?? "page" }) {
  const { default: sharp } = await import("sharp");
  const errors = [];
  const text = (value, where) => {
    if (!value || typeof value.vi !== "string" || !value.vi.trim()) errors.push(`${where}: thiếu chữ VI`);
    if (!value || typeof value.en !== "string" || !value.en.trim()) errors.push(`${where}: thiếu chữ EN`);
    else if (typeof value.vi === "string" && paragraphs(value.vi).length !== paragraphs(value.en).length) errors.push(`${where}: số đoạn VI và EN khác nhau`);
  };
  const media = async (value, where) => {
    if (!value || !IMAGE_SRC.test(value.src ?? "")) return errors.push(`${where}: src phải là /assets/content/<kebab-case>.webp`);
    for (const field of ["altVi", "altEn"]) if (typeof value[field] !== "string" || !value[field].trim()) errors.push(`${where}: thiếu ${field}`);
    const file = path.join(siteRoot, value.src);
    if (!existsSync(file)) return errors.push(`${where}: không có file ${value.src}`);
    const { width, height } = await sharp(file).metadata();
    if (value.width !== width || value.height !== height) errors.push(`${where}: width/height phải là ${width}x${height}`);
  };
  const href = (value, where) => { if (!SAFE_HREF.test(value ?? "")) errors.push(`${where}: link không hợp lệ`); };

  if (!KEBAB.test(page?.id ?? "")) errors.push(`${at}: id phải kebab-case`);
  for (const field of ["slugVi", "slugEn"]) if (!KEBAB.test(page?.[field] ?? "")) errors.push(`${at}: ${field} phải kebab-case không dấu`);
  text(page?.title, `${at}.title`);
  text(page?.description, `${at}.description`);
  await media(page?.cover, `${at}.cover`);
  if (!Array.isArray(page?.blocks) || !page.blocks.length) return [...errors, `${at}: cần ít nhất một khối`];

  const blockIds = new Set();
  for (const [index, block] of page.blocks.entries()) {
    const where = `${at}.blocks[${index}]`;
    const spec = BLOCKS[block?.type];
    if (!spec) { errors.push(`${where}: kiểu khối lạ ${block?.type}`); continue; }
    if (!KEBAB.test(block.id ?? "")) errors.push(`${where}: id khối phải kebab-case`);
    else if (blockIds.has(block.id)) errors.push(`${where}: trùng id khối ${block.id}`);
    blockIds.add(block.id);
    for (const field of spec.text ?? []) text(block[field], `${where}.${field}`);
    for (const field of spec.optionalText ?? []) if (block[field] !== undefined) text(block[field], `${where}.${field}`);
    for (const field of spec.media ?? []) await media(block[field], `${where}.${field}`);
    for (const field of spec.href ?? []) href(block[field], `${where}.${field}`);
    for (const [field, allowed] of Object.entries(spec.enums ?? {})) if (!allowed.includes(block[field])) errors.push(`${where}.${field}: phải là ${allowed.join(", ")}`);
    for (const [field, [min, max]] of Object.entries(spec.mediaList ?? {})) {
      const list = block[field];
      if (!Array.isArray(list) || list.length < min || list.length > max) { errors.push(`${where}.${field}: cần ${min} đến ${max} ảnh`); continue; }
      for (const [item, value] of list.entries()) await media(value, `${where}.${field}[${item}]`);
    }
    if (spec.list) {
      const [min, max] = spec.list.items;
      const list = block.items;
      if (!Array.isArray(list) || list.length < min || list.length > max) { errors.push(`${where}.items: cần ${min} đến ${max} mục`); continue; }
      for (const [item, value] of list.entries()) {
        for (const field of spec.list.text ?? []) text(value?.[field], `${where}.items[${item}].${field}`);
        for (const field of spec.list.media ?? []) await media(value?.[field], `${where}.items[${item}].${field}`);
        for (const field of spec.list.href ?? []) href(value?.[field], `${where}.items[${item}].${field}`);
      }
    }
    if (spec.video) {
      const value = block.video;
      if (!/^\/assets\/content\/[a-z0-9/-]+\.mp4$/.test(value?.src ?? "") || !IMAGE_SRC.test(value?.poster ?? "") || !Number.isInteger(value?.width) || !Number.isInteger(value?.height)) errors.push(`${where}.video: cần src .mp4, poster .webp, width, height`);
    }
    if (spec.ids) {
      const field = spec.ids === "projects" ? "projectIds" : "newsIds";
      const pool = spec.ids === "projects" ? projects : news;
      const list = block[field];
      if (!Array.isArray(list) || list.length < 1) errors.push(`${where}.${field}: cần ít nhất một id`);
      else for (const id of list) if (!pool.has(id) || id === page.id) errors.push(`${where}.${field}: id ${id} không có hoặc trỏ chính trang này`);
    }
  }
  return errors;
}

// Chỉ gọi với dữ liệu đã qua validateBlockPage.
export const renderBlocks = (page, ctx) => page.blocks.map((block) => BLOCKS[block.type].render(block, ctx)).join("\n");
