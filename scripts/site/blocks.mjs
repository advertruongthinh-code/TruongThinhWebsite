// Shared block set for project pages and News (layout-library R1, R4): validates JSON data then builds static HTML.
// VI text goes in the tag, EN goes in data-en like existing pages; the localeHtml build swaps to EN.
// The same data always yields the same HTML; text is plain text only, all HTML characters are escaped.
import { IMAGE_SRC, escapeHtml, validateImage } from "./lib.mjs";

export const BLOCK_SCHEMA_VERSION = 1;
export const ZALO_HREF = "https://zalo.me/0949131050";

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// ponytail: only internal /vi|/en links or Zalo; extend when the CMS needs checked external links.
const SAFE_HREF = /^(?:\/(?:vi|en)\/[a-z0-9/-]*|https:\/\/zalo\.me\/\d+)$/;

// ponytail: v1 text is just plain paragraphs split by blank lines; bold, italic, in-paragraph links when the CMS needs them.
const paragraphs = (text) => text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
const localized = (tag, text, attributes = "") => `<${tag}${attributes} data-en="${escapeHtml(text.en)}">${escapeHtml(text.vi)}</${tag}>`;
const localizedParagraphs = (text, attributes = "") => {
  const vi = paragraphs(text.vi);
  const en = paragraphs(text.en);
  return vi.map((part, index) => localized("p", { vi: part, en: en[index] }, attributes)).join("\n");
};
const image = (media, attributes = 'loading="lazy"') =>
  `<img src="${media.src}" width="${media.width}" height="${media.height}" alt="${escapeHtml(media.altVi)}" data-en-alt="${escapeHtml(media.altEn)}" ${attributes} />`;
// Classes are written out in full so the orphan-selectors test sees where each CSS variant is generated.
const IMAGE_POSITION = { wide: "blk-image--wide", "left-2-3": "blk-image--left-2-3", "right-2-3": "blk-image--right-2-3", "left-1-2": "blk-image--left-1-2", "right-1-2": "blk-image--right-1-2" };
const PAIR_LAYOUT = { equal: "blk-pair--equal", "left-large": "blk-pair--left-large", "right-large": "blk-pair--right-large" };
const FACTS_COLUMNS = { 2: "blk-facts--2", 3: "blk-facts--3", 4: "blk-facts--4" };
const BANNER_COLUMNS = { 1: "blk-banners--1", 2: "blk-banners--2", 3: "blk-banners--3" };
// Four News groups (news R1); display names and slugs are final per Keyword Planner, until then use the temporary names.
export const NEWS_GROUPS = {
  "nha-o": { vi: "Không gian nhà ở", en: "Residential spaces" },
  "kinh-doanh": { vi: "Không gian kinh doanh", en: "Commercial spaces" },
  "xu-huong": { vi: "Xu hướng thiết kế", en: "Design trends" },
  "quang-cao": { vi: "Sản phẩm quảng cáo", en: "Advertising products" },
};

// News teaser like the espaciohomedesign.com news block (home strip and "Other news" at the end of an article, news R3, R4, measured 2026-11-11):
// small cover left, group in capitals, title, and "Read more" that fades in on hover. The whole item is one link.
export const newsTeaser = (post) => {
  const group = NEWS_GROUPS[post.group];
  return [
    `    <a class="home-news__item" href="/vi/news/${post.slugVi}/" data-en-href="/en/news/${post.slugEn}/">`,
    `      <span class="home-news__media">${image(post.cover)}</span>`,
    '      <span class="home-news__text">',
    `        ${localized("span", group, ' class="home-news__group"')}`,
    `        ${localized("span", post.title, ' class="home-news__title"')}`,
    '        <span class="home-news__more" data-en="Read more">Đọc tiếp</span>',
    "      </span>",
    "    </a>",
  ].join("\n");
};
// Hero tagline line: "ấm như *gỗ sồi*" becomes plain text, then the italic part as <em>, then the rest; each part keeps its own EN so the locale
// swap (data-en) does not drop the italic. VI and EN may put the italic at different places in the line.
// An intentional title line break carries the pause, so a line never ends with , . or ; (owner 2026-11-14, hero-typography R7).
export const LINE_END_PUNCT = /[,.;]\s*$/;
const ITALIC = /^([^*]*)(?:\*([^*]+)\*([^*]*))?$/;
const taglineParts = (text) => {
  const [, before, italic = "", after = ""] = text.match(ITALIC);
  return [before, italic, after];
};
const taglineLine = (line) => {
  const vi = taglineParts(line.vi);
  const en = taglineParts(line.en);
  return [
    vi[0] || en[0] ? localized("span", { vi: vi[0], en: en[0] }) : "",
    vi[1] || en[1] ? localized("em", { vi: vi[1], en: en[1] }) : "",
    vi[2] || en[2] ? localized("span", { vi: vi[2], en: en[2] }) : "",
  ].join("");
};
// The hero CTA target; one Zalo block per page.
const CONTACT_ID = "lien-he";
const figure = (media, className) => `<figure class="${className}">${image(media)}</figure>`;

// Strip and News blocks without ids pick their items at build (layout-library R1 "tự lấy"), so the CMS author places the block only.
// project-slider: the other projects of the page's sector, in projects.json order (projects R3).
// news-cards: 3 other posts, the page's group first, newest first (news R3).
const NEWS_CARD_COUNT = 3;
const autoProjectIds = (ctx, page) => [...ctx.projects.values()].filter((project) => project.sector === page.sector && project.id !== page.id).map((project) => project.id);
const autoNewsIds = (ctx, page) => {
  return [...ctx.news.values()]
    .filter((post) => post.id !== page.id)
    .toSorted((left, right) => Number(right.group === page.group) - Number(left.group === page.group) || right.published.localeCompare(left.published) || left.id.localeCompare(right.id))
    .slice(0, NEWS_CARD_COUNT)
    .map((post) => post.id);
};

// Each block: required fields by type and the HTML builder. ctx holds the project and News lists so blocks can look them up.
const BLOCKS = {
  "hero-project": {
    lines: { tagline: [1, 3] },
    media: ["image"],
    // The shared hero of Residential, Commercial and About (projects R3, owner 2026-11-14, like Espacio project pages): the project name is
    // the small h1 kicker, the tagline is the big title, the CTA scrolls to the page's Zalo block. hero-copy is the CSS for the 1 and 3 line variants.
    render: (block, ctx, page) => [
      '<section class="hero detail-hero project-hero" id="top" data-header-tone="inverse" aria-labelledby="project-title">',
      `  <figure class="hero-photo">${image(block.image, 'fetchpriority="high" data-motion-hero-media')}</figure>`,
      '  <div class="hero-shade" aria-hidden="true"></div>',
      '  <div class="hero-content">',
      `    ${localized("h1", page.title, ' class="hero-kicker" id="project-title" data-motion-hero-kicker')}`,
      '    <p class="hero-title" id="page-title" data-motion-words data-motion-hero-title>',
      ...block.tagline.map((line) => `      <span class="detail-hero-line-mask"><span class="detail-title__quiet" data-motion-word-source>${taglineLine(line)}</span></span>`),
      "    </p>",
      page.blocks.some((item) => item.type === "contact-quick")
        ? `    <a class="hero-cta" href="#${CONTACT_ID}" data-scroll-to data-motion-hero-fade data-en="Design your own space">Thiết kế không gian của bạn</a>`
        : "",
      "  </div>",
      '  <button class="scroll-cue" type="button" data-scroll-cue aria-label="Cuộn đến phần tiếp theo" data-en-aria-label="Scroll to the next section">',
      '    <span data-scroll-cue-label data-vi="CUỘN XUỐNG" data-en="SCROLL DOWN">CUỘN XUỐNG</span>',
      "  </button>",
      "</section>",
    ].filter(Boolean).join("\n"),
  },
  "section-title": {
    text: ["text"],
    // Lines rise in on view like Espacio's titular ("animate-lines", detail-pages R6).
    render: (block) => `<section class="blk blk-title section-gap" data-header-tone="ink">${localized("h2", block.text, " data-motion-lines")}</section>`,
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
    enums: { position: Object.keys(IMAGE_POSITION) },
    render: (block) => [
      `<section class="blk blk-image ${IMAGE_POSITION[block.position]} section-gap" data-header-tone="ink">`,
      `  <figure class="blk-image__figure">${image(block.image)}${block.caption ? localized("figcaption", block.caption) : ""}</figure>`,
      "</section>",
    ].join("\n"),
  },
  // Portrait image with a paragraph beside it, Espacio's most used single-image variant (".-layout-parrafo -layout-right", 22 of 48 project
  // pages, measured 2026-11-14): image one third, text in the paragraph column on the right; phone stacks image then text.
  "image-text": {
    text: ["text"],
    media: ["image"],
    render: (block) => [
      '<section class="blk blk-image-text section-gap" data-header-tone="ink">',
      `  <figure class="blk-image-text__figure">${image(block.image)}</figure>`,
      `  <div class="blk-paragraph blk-image-text__copy">${localizedParagraphs(block.text)}</div>`,
      "</section>",
    ].join("\n"),
  },
  "image-pair": {
    mediaList: { images: [2, 2] },
    enums: { layout: Object.keys(PAIR_LAYOUT) },
    render: (block) => `<section class="blk blk-pair ${PAIR_LAYOUT[block.layout]} section-gap" data-header-tone="ink">${block.images.map((media) => figure(media, "blk-pair__item")).join("")}</section>`,
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
    // Uses exactly the Homes page Gallery frame so detail.js attaches Swiper (detail-pages R5).
    // Summed image ratio and gap count let CSS grow the row height when the images are too few to fill the track (detail-pages R7).
    render: (block) => [
      `<section class="detail-gallery blk-gallery section-gap" style="--gallery-ratio: ${block.images.reduce((sum, media) => sum + media.width / media.height, 0).toFixed(4)}; --gallery-gaps: ${block.images.length - 1}" data-gallery data-header-tone="ink">`,
      '  <div class="detail-gallery__track" data-gallery-track>',
      '    <div class="detail-gallery__slides">',
      ...block.images.map((media) => `      <figure class="detail-gallery__item"><div class="detail-gallery__media">${image(media, 'loading="lazy" data-motion-media')}</div></figure>`),
      "    </div>",
      "  </div>",
      '  <div class="detail-gallery__pagination" data-gallery-pagination></div>',
      "</section>",
    ].join("\n"),
  },
  "facts-grid": {
    list: { items: [2, 4], text: ["label", "text"] },
    render: (block) => [
      `<section class="blk blk-facts ${FACTS_COLUMNS[block.items.length]} section-gap" data-header-tone="ink">`,
      '  <ol class="blk-facts__list">',
      // Each fact rises 60px and fades in, 0.15s after the previous one (Espacio "animate-up animate-opacity").
      ...block.items.map((item, index) => `    <li class="blk-facts__item" data-motion-up data-motion-delay="${index * 0.15}">${localized("h3", item.label, ' class="blk-facts__label"')}${localized("p", item.text, ' class="blk-facts__text"')}</li>`),
      "  </ol>",
      "</section>",
    ].join("\n"),
  },
  "contact-quick": {
    text: ["title"],
    render: (block) => [
      `<section class="blk blk-contact section-gap" id="${CONTACT_ID}" data-header-tone="ink">`,
      `  ${localized("h2", block.title, ' class="blk-contact__title"')}`,
      `  <a class="blk-contact__zalo" href="${ZALO_HREF}" target="_blank" rel="noopener" data-en="Chat on Zalo">Nhắn Zalo</a>`,
      "</section>",
    ].join("\n"),
  },
  "project-slider": {
    ids: "projects",
    // Cards staggered high and low like the home rail (ProjectReel); click opens the project page.
    render: (block, ctx, page) => {
      const variants = ["high", "low"];
      // On a project page the strip lists the other projects, so it gets Espacio's centred italic "Other projects" heading.
      const onProjectPage = ctx.projects.has(page.id);
      return [
        // The strip slides in from 60px right (Espacio "animate-left"); motion.js adds the horizontal parallax of the home rail to the track.
        '<section class="blk blk-projects section-gap" data-header-tone="ink" data-motion-left>',
        ...(onProjectPage ? ['  <h2 class="blk-projects__title" data-motion-words data-en="Other projects">Công trình khác</h2>'] : []),
        '  <div class="blk-projects__track">',
        ...(block.projectIds ?? autoProjectIds(ctx, page)).map((id, index) => {
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
    // "Other news" like the end of an Espacio article: centred heading, then the same teasers as the home strip.
    render: (block, ctx, page) => [
      '<section class="blk blk-news-cards section-gap" data-header-tone="ink">',
      '  <h2 class="blk-news-cards__title" data-en="Other news">Tin khác</h2>',
      '  <div class="home-news__grid">',
      ...(block.newsIds ?? autoNewsIds(ctx, page)).map((id) => newsTeaser(ctx.news.get(id))),
      "  </div>",
      "</section>",
    ].join("\n"),
  },
  "banner-links": {
    list: { items: [1, 3], text: ["title"], media: ["image"], href: ["hrefVi", "hrefEn"] },
    render: (block) => [
      `<section class="blk blk-banners ${BANNER_COLUMNS[block.items.length]} section-gap" data-header-tone="ink">`,
      ...block.items.map((item) => `  <a class="blk-banner" href="${item.hrefVi}" data-en-href="${item.hrefEn}">${image(item.image)}${localized("span", item.title, ' class="blk-banner__title"')}</a>`),
      "</section>",
    ].join("\n"),
  },
};
export const BLOCK_TYPES = Object.keys(BLOCKS);

// Validate one page (project or News post). Returns the error list, does not stop at the first error.
export async function validateBlockPage(page, { siteRoot, projects = new Map(), news = new Map(), at = page?.id ?? "page" }) {
  const errors = [];
  const text = (value, where) => {
    if (!value || typeof value.vi !== "string" || !value.vi.trim()) errors.push(`${where}: missing VI text`);
    if (!value || typeof value.en !== "string" || !value.en.trim()) errors.push(`${where}: missing EN text`);
    else if (typeof value.vi === "string" && paragraphs(value.vi).length !== paragraphs(value.en).length) errors.push(`${where}: paragraph counts differ between VI and EN`);
  };
  const media = async (value, where) => { errors.push(...await validateImage(value, siteRoot, where)); };
  const href = (value, where) => { if (!SAFE_HREF.test(value ?? "")) errors.push(`${where}: invalid link`); };

  if (!KEBAB.test(page?.id ?? "")) errors.push(`${at}: id must be kebab-case`);
  for (const field of ["slugVi", "slugEn"]) if (!KEBAB.test(page?.[field] ?? "")) errors.push(`${at}: ${field} must be unaccented kebab-case`);
  text(page?.title, `${at}.title`);
  text(page?.description, `${at}.description`);
  await media(page?.cover, `${at}.cover`);
  if (!Array.isArray(page?.blocks) || !page.blocks.length) return [...errors, `${at}: needs at least one block`];

  const blockIds = new Set();
  for (const [index, block] of page.blocks.entries()) {
    const where = `${at}.blocks[${index}]`;
    const spec = BLOCKS[block?.type];
    if (!spec) { errors.push(`${where}: unknown block type ${block?.type}`); continue; }
    if (!KEBAB.test(block.id ?? "")) errors.push(`${where}: block id must be kebab-case`);
    else if (blockIds.has(block.id)) errors.push(`${where}: duplicate block id ${block.id}`);
    blockIds.add(block.id);
    for (const field of spec.text ?? []) text(block[field], `${where}.${field}`);
    for (const field of spec.optionalText ?? []) if (block[field] !== undefined) text(block[field], `${where}.${field}`);
    for (const [field, [min, max]] of Object.entries(spec.lines ?? {})) {
      const list = block[field];
      if (!Array.isArray(list) || list.length < min || list.length > max) { errors.push(`${where}.${field}: needs ${min} to ${max} lines`); continue; }
      for (const [index, line] of list.entries()) {
        text(line, `${where}.${field}[${index}]`);
        if ([line?.vi, line?.en].some((value) => typeof value === "string" && !ITALIC.test(value))) errors.push(`${where}.${field}[${index}]: at most one *italic* part`);
        if ([line?.vi, line?.en].some((value) => typeof value === "string" && LINE_END_PUNCT.test(value))) errors.push(`${where}.${field}[${index}]: a line must not end with , . or ;`);
      }
    }
    for (const field of spec.media ?? []) await media(block[field], `${where}.${field}`);
    for (const field of spec.href ?? []) href(block[field], `${where}.${field}`);
    for (const [field, allowed] of Object.entries(spec.enums ?? {})) if (!allowed.includes(block[field])) errors.push(`${where}.${field}: must be ${allowed.join(", ")}`);
    for (const [field, [min, max]] of Object.entries(spec.mediaList ?? {})) {
      const list = block[field];
      if (!Array.isArray(list) || list.length < min || list.length > max) { errors.push(`${where}.${field}: needs ${min} to ${max} images`); continue; }
      for (const [item, value] of list.entries()) await media(value, `${where}.${field}[${item}]`);
    }
    if (spec.list) {
      const [min, max] = spec.list.items;
      const list = block.items;
      if (!Array.isArray(list) || list.length < min || list.length > max) { errors.push(`${where}.items: needs ${min} to ${max} items`); continue; }
      for (const [item, value] of list.entries()) {
        for (const field of spec.list.text ?? []) text(value?.[field], `${where}.items[${item}].${field}`);
        for (const field of spec.list.media ?? []) await media(value?.[field], `${where}.items[${item}].${field}`);
        for (const field of spec.list.href ?? []) href(value?.[field], `${where}.items[${item}].${field}`);
      }
    }
    if (spec.video) {
      const value = block.video;
      if (!/^\/assets\/content\/[a-z0-9/-]+\.mp4$/.test(value?.src ?? "") || !IMAGE_SRC.test(value?.poster ?? "") || !Number.isInteger(value?.width) || !Number.isInteger(value?.height)) errors.push(`${where}.video: needs src .mp4, poster .webp, width, height`);
    }
    if (spec.ids) {
      const field = spec.ids === "projects" ? "projectIds" : "newsIds";
      const pool = spec.ids === "projects" ? projects : news;
      const list = block[field];
      // No ids: picked at build (autoProjectIds, autoNewsIds).
      if (list === undefined) continue;
      if (!Array.isArray(list) || list.length < 1) errors.push(`${where}.${field}: needs at least one id`);
      else for (const id of list) if (!pool.has(id) || id === page.id) errors.push(`${where}.${field}: id ${id} not found or points to this page`);
    }
  }
  return errors;
}

// The lookup Map keeps the last entry on duplicates, so report duplicate id and slug within one file first.
export const duplicatePageFields = (pages, at) => ["id", "slugVi", "slugEn"].flatMap((field) => {
  const seen = new Set();
  return pages.flatMap((page) => {
    const duplicate = seen.has(page[field]);
    seen.add(page[field]);
    return duplicate ? [`${at}: duplicate ${field} ${page[field]}`] : [];
  });
});

// Call only with data that passed validateBlockPage.
export const renderBlocks = (page, ctx) => page.blocks.map((block) => BLOCKS[block.type].render(block, ctx, page)).join("\n");
