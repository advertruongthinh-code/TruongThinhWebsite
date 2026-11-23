// Shared block set for project pages and News (layout-library R1, R4): validates JSON data then builds static HTML.
// VI text goes in the tag, EN goes in data-en like existing pages; the localeHtml build swaps to EN.
// The same data always yields the same HTML; text is plain text only, all HTML characters are escaped.
import { IMAGE_SRC, escapeHtml } from "./lib-pure.mjs";
import { listHtml, listOf, markedInner, marksErrors, paragraphs, parseMarks, plainText, sideMarksErrors, typoWarnings } from "../../src/cms/inline-marks.mjs";

export const BLOCK_SCHEMA_VERSION = 1;
export const ZALO_HREF = "https://zalo.me/0949131050";

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// ponytail: only internal links (VI at the root, EN under /en) or Zalo; extend when the CMS needs checked external links.
const SAFE_HREF = /^(?:\/[a-z0-9/-]*|https:\/\/zalo\.me\/\d+)$/;

// Text is plain paragraphs split by blank lines; marked text (cms-plan part 2 K2) renders as leaf segments inside the element.
// Text without marks or breaks keeps the plain path, so existing data renders the same HTML.
const localized = (tag, text, attributes = "") => `<${tag}${attributes} data-en="${escapeHtml(text.en ?? "")}">${escapeHtml(text.vi)}</${tag}>`;
const marked = (tag, text, attributes, ctx) => {
  const inner = markedInner(text.vi, text.en, ctx);
  return inner === null ? localized(tag, text, attributes) : `<${tag}${attributes}>${inner}</${tag}>`;
};
// lists: a body paragraph whose every line starts with "• " or "<n>. " becomes <ul> or <ol>.
const localizedParagraphs = (text, ctx, { lists = false } = {}) => {
  const vi = paragraphs(text.vi);
  const en = paragraphs(text.en);
  return vi.map((part, index) => (lists && listOf(part) ? listHtml(part, en[index] ?? "", ctx) : marked("p", { vi: part, en: en[index] ?? "" }, "", ctx))).join("\n");
};
const image = (media, attributes = 'loading="lazy"') =>
  `<img src="${media.src}" width="${media.width}" height="${media.height}" alt="${escapeHtml(media.altVi)}" data-en-alt="${escapeHtml(media.altEn)}" ${attributes} />`;
// Classes are written out in full so the orphan-selectors test sees where each CSS variant is generated.
const IMAGE_POSITION = { wide: "blk-image--wide", "left-2-3": "blk-image--left-2-3", "right-2-3": "blk-image--right-2-3", "left-1-2": "blk-image--left-1-2", "right-1-2": "blk-image--right-1-2" };
const PAIR_LAYOUT = { equal: "blk-pair--equal", "left-large": "blk-pair--left-large", "right-large": "blk-pair--right-large" };
const FACTS_COLUMNS = { 2: "blk-facts--2", 3: "blk-facts--3", 4: "blk-facts--4" };
const BANNER_COLUMNS = { 1: "blk-banners--1", 2: "blk-banners--2", 3: "blk-banners--3" };
// Four News groups (news R1); display names and slugs are final per Keyword Planner, until then use the temporary names.
// vi/en: the group name on articles; chip: News filter label; title: group page search title, worded as advice so it does not
// compete with the Residential, Commercial and Advertising pages for the same keyword (SEO audit 2026-11-15).
export const NEWS_GROUPS = {
  "nha-o": { vi: "Không gian nhà ở", en: "Residential spaces", chip: { vi: "Nhà ở", en: "Residential" }, title: { vi: "Tư vấn nội thất nhà ở: tủ bếp, tủ áo, nhà phố", en: "Home interior advice: kitchens, wardrobes, townhouses" } },
  "kinh-doanh": { vi: "Không gian kinh doanh", en: "Commercial spaces", chip: { vi: "Kinh doanh", en: "Commercial" }, title: { vi: "Tư vấn nội thất quán cafe, cửa hàng, văn phòng", en: "Cafe, shop and office interior advice" } },
  "quang-cao": { vi: "Sản phẩm quảng cáo", en: "Advertising products", chip: { vi: "Quảng cáo", en: "Advertising" }, title: { vi: "Kinh nghiệm làm biển hiệu, màn hình LED", en: "Shop sign and LED screen advice" } },
  "xu-huong": { vi: "Xu hướng thiết kế", en: "Design trends", chip: { vi: "Xu hướng", en: "Trends" }, title: { vi: "Xu hướng thiết kế nội thất gỗ", en: "Timber interior design trends" } },
};

// News teaser like the espaciohomedesign.com news block (home strip and "Other news" at the end of an article, news R3, R4, measured 2026-11-11):
// small cover left, group in capitals, title, and "Read more" that fades in on hover. The whole item is one link.
// VI and EN pick lists rendered once (cms-content R2): an item only VI shows gets data-vi-only, one only EN shows gets data-en-only,
// and localeHtml drops each from the other locale. Returns [item, attribute] in VI order, then the EN-only items.
export const bilingualPicks = (vi, en) => [
  ...vi.map((item) => [item, en.includes(item) ? "" : " data-vi-only"]),
  ...en.filter((item) => !vi.includes(item)).map((item) => [item, " data-en-only"]),
];
// EN link of a page, or none for a page without EN (its EN route does not exist).
const enHrefAttr = (page, dir) => (page.noEn ? "" : ` data-en-href="/en/${dir}/${page.slugEn}/"`);
export const newsTeaser = (post, only = "") => {
  const group = NEWS_GROUPS[post.group];
  return [
    `    <a class="home-news__item" href="/news/${post.slugVi}/"${enHrefAttr(post, "news")}${only}>`,
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
// An intentional title line break carries the pause, so a line never ends with , . or ; (owner 2026-11-14, hero-typography R7, typoWarnings).
const taglineParts = (text) => {
  const tokens = parseMarks(text);
  const italic = tokens.findIndex(({ t }) => t === "i");
  if (italic < 0) return [tokens[0]?.s ?? "", "", ""];
  return [tokens[italic - 1]?.s ?? "", tokens[italic].s, tokens[italic + 1]?.s ?? ""];
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
// news-cards: the 3 most related other posts (news R3, owner 2026-11-22): same group first, then
// the closest VI text (TF-IDF cosine), then newest. The group is the editor's own relevance call, so text only ranks inside it.
const NEWS_CARD_COUNT = 3;
const autoProjectIds = (ctx, page) => [...ctx.projects.values()].filter((project) => project.sector === page.sector && project.id !== page.id).map((project) => project.id);
// Syllables plus syllable pairs, since a Vietnamese word is often two syllables ("tủ bếp"). The title counts 3 times.
const newsTokens = (post) => {
  const blockText = (post.blocks ?? []).flatMap((block) => [block.text?.vi, block.title?.vi]).filter((part) => typeof part === "string").map(plainText);
  const text = [post.title?.vi, post.title?.vi, post.title?.vi, post.description?.vi, ...blockText];
  return text.filter((part) => typeof part === "string").flatMap((part) => {
    const words = part.normalize("NFC").toLowerCase().match(/\p{L}+/gu) ?? [];
    return [...words, ...words.slice(1).map((word, index) => `${words[index]} ${word}`)];
  });
};
// Unit TF-IDF vector per post, built once per News list.
const newsVectors = new WeakMap();
const vectorsOf = (news) => {
  if (newsVectors.has(news)) return newsVectors.get(news);
  const counts = new Map([...news.values()].map((post) => [post.id, Map.groupBy(newsTokens(post), (token) => token)]));
  const df = new Map();
  for (const tokens of counts.values()) for (const token of tokens.keys()) df.set(token, (df.get(token) ?? 0) + 1);
  const vectors = new Map([...counts].map(([id, tokens]) => {
    const vector = new Map([...tokens].map(([token, list]) => [token, list.length * Math.log(news.size / df.get(token))]));
    const length = Math.hypot(...vector.values()) || 1;
    return [id, new Map([...vector].map(([token, weight]) => [token, weight / length]))];
  }));
  newsVectors.set(news, vectors);
  return vectors;
};
export const autoNewsIds = (ctx, page) => {
  const vectors = vectorsOf(ctx.news);
  const own = vectors.get(page.id) ?? new Map();
  const score = (post) => [...own].reduce((sum, [token, weight]) => sum + weight * (vectors.get(post.id).get(token) ?? 0), 0);
  // Rounded so float noise never outranks the date tie-break.
  return [...ctx.news.values()]
    .filter((post) => post.id !== page.id)
    .map((post) => ({ post, score: Math.round(score(post) * 1e6) }))
    .toSorted((left, right) => Number(right.post.group === page.group) - Number(left.post.group === page.group) || right.score - left.score || right.post.published.localeCompare(left.post.published) || left.post.id.localeCompare(right.post.id))
    .slice(0, NEWS_CARD_COUNT)
    .map(({ post }) => post.id);
};

// "Other news" for VI and EN: chosen ids minus posts without EN; picked ones are ranked again among the posts that have EN.
const enNewsMaps = new WeakMap();
const enNews = (news) => {
  if (!enNewsMaps.has(news)) enNewsMaps.set(news, new Map([...news].filter(([, post]) => !post.noEn)));
  return enNewsMaps.get(news);
};
const newsPicks = (block, ctx, page) => {
  if (block.newsIds) return [block.newsIds, block.newsIds.filter((id) => !ctx.news.get(id).noEn)];
  const vi = autoNewsIds(ctx, page);
  return [vi, enNews(ctx.news).size === ctx.news.size ? vi : autoNewsIds({ ...ctx, news: enNews(ctx.news) }, page)];
};

// Each block: required fields by type and the HTML builder. ctx holds the project and News lists so blocks can look them up.
// media-single renders an image (old image-single) or a 16:9 video (old video-single); class names are unchanged.
const renderImage = (block, ctx) => [
  `<section class="blk blk-image ${IMAGE_POSITION[block.position]} section-gap" data-header-tone="ink">`,
  `  <figure class="blk-image__figure">${image(block.image)}${block.caption ? marked("figcaption", block.caption, "", ctx) : ""}</figure>`,
  "</section>",
].join("\n");
const renderVideo = (block, ctx) => [
  '<section class="blk blk-video section-gap" data-header-tone="ink">',
  `  <figure class="blk-video__figure"><video src="${block.video.src}" poster="${block.video.poster}" width="${block.video.width}" height="${block.video.height}" muted playsinline controls preload="metadata"></video>${block.caption ? marked("figcaption", block.caption, "", ctx) : ""}</figure>`,
  "</section>",
].join("\n");

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
    marks: { text: "title" },
    // Lines rise in on view like Espacio's titular ("animate-lines", detail-pages R6).
    render: (block, ctx) => `<section class="blk blk-title section-gap" data-header-tone="ink">${marked("h2", block.text, " data-motion-lines", ctx)}</section>`,
  },
  paragraph: {
    text: ["text"],
    marks: { text: "body" },
    render: (block, ctx) => `<section class="blk blk-paragraph section-gap" data-header-tone="ink">${localizedParagraphs(block.text, ctx, { lists: true })}</section>`,
  },
  "paragraph-columns": {
    text: ["text"],
    marks: { text: "body" },
    render: (block, ctx) => `<section class="blk blk-paragraph blk-paragraph--columns section-gap" data-header-tone="ink">${localizedParagraphs(block.text, ctx, { lists: true })}</section>`,
  },
  "media-single": {
    optionalText: ["caption"],
    marks: { caption: "small" },
    enums: { position: Object.keys(IMAGE_POSITION) },
    oneOf: ["image", "video"], // exactly one; a video is always wide and 16:9 (cms-content R5)
    render: (block, ctx) => block.video ? renderVideo(block, ctx) : renderImage(block, ctx),
  },
  // Portrait image with a paragraph beside it, Espacio's most used single-image variant (".-layout-parrafo -layout-right", 22 of 48 project
  // pages, measured 2026-11-14): image one third, text in the paragraph column on the right; phone stacks image then text.
  "media-text": {
    text: ["text"],
    marks: { text: "body" },
    media: ["image"],
    render: (block, ctx) => [
      '<section class="blk blk-image-text section-gap" data-header-tone="ink">',
      `  <figure class="blk-image-text__figure">${image(block.image)}</figure>`,
      `  <div class="blk-paragraph blk-image-text__copy">${localizedParagraphs(block.text, ctx, { lists: true })}</div>`,
      "</section>",
    ].join("\n"),
  },
  "media-pair": {
    mediaList: { images: [2, 2] },
    enums: { layout: Object.keys(PAIR_LAYOUT) },
    render: (block) => `<section class="blk blk-pair ${PAIR_LAYOUT[block.layout]} section-gap" data-header-tone="ink">${block.images.map((media) => figure(media, "blk-pair__item")).join("")}</section>`,
  },
  "media-carousel": {
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
    marks: { label: "small", text: "small" },
    render: (block, ctx) => [
      `<section class="blk blk-facts ${FACTS_COLUMNS[block.items.length]} section-gap" data-header-tone="ink">`,
      '  <ol class="blk-facts__list">',
      // Each fact rises 60px and fades in, 0.15s after the previous one (Espacio "animate-up animate-opacity").
      ...block.items.map((item, index) => `    <li class="blk-facts__item" data-motion-up data-motion-delay="${index * 0.15}">${marked("h3", item.label, ' class="blk-facts__label"', ctx)}${marked("p", item.text, ' class="blk-facts__text"', ctx)}</li>`),
      "  </ol>",
      "</section>",
    ].join("\n"),
  },
  "contact-quick": {
    text: ["title"],
    marks: { title: "title" },
    render: (block, ctx) => [
      `<section class="blk blk-contact section-gap" id="${CONTACT_ID}" data-header-tone="ink">`,
      `  ${marked("h2", block.title, ' class="blk-contact__title"', ctx)}`,
      `  <a class="blk-contact__zalo" href="${ZALO_HREF}" target="_blank" rel="noopener" data-en="Chat on Zalo">Nhắn Zalo</a>`,
      "</section>",
    ].join("\n"),
  },
  "project-slider": {
    ids: "projects",
    // Cards staggered high and low like the home rail (ProjectReel); click opens the project page.
    render: (block, ctx, page) => {
      // Full class names so the design-system class check finds them.
      const variants = ["project-card--high", "project-card--low"];
      // On a project page the strip lists the other projects, so it gets Espacio's centred italic "Other projects" heading.
      const onProjectPage = ctx.projects.has(page.id);
      const ids = block.projectIds ?? autoProjectIds(ctx, page);
      return [
        // The strip slides in from 60px right (Espacio "animate-left"); motion.js adds the horizontal parallax of the home rail to the track.
        '<section class="blk blk-projects section-gap" data-header-tone="ink" data-motion-left>',
        ...(onProjectPage ? ['  <h2 class="blk-projects__title" data-motion-words data-en="Other projects">Công trình khác</h2>'] : []),
        '  <div class="blk-projects__track">',
        ...bilingualPicks(ids, ids.filter((id) => !ctx.projects.get(id).noEn)).map(([id, only], index) => {
          const project = ctx.projects.get(id);
          const cover = project.cover;
          return [
            `    <a class="project-card ${variants[index % 2]} blk-projects__card" href="/projects/${project.slugVi}/"${enHrefAttr(project, "projects")}${only}>`,
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
    marks: { text: "quote" },
    render: (block, ctx) => `<section class="blk blk-quote section-gap" data-header-tone="ink"><blockquote>${localizedParagraphs(block.text, ctx)}${block.author ? localized("cite", block.author) : ""}</blockquote></section>`,
  },
  "news-cards": {
    ids: "news",
    // "Other news" like the end of an Espacio article: centred heading, then the same teasers as the home strip.
    render: (block, ctx, page) => [
      '<section class="blk blk-news-cards section-gap" data-header-tone="ink">',
      '  <h2 class="blk-news-cards__title" data-en="Other news">Tin khác</h2>',
      '  <div class="home-news__grid">',
      ...bilingualPicks(...newsPicks(block, ctx, page)).map(([id, only]) => newsTeaser(ctx.news.get(id), only)),
      "  </div>",
      "</section>",
    ].join("\n"),
  },
  "banner-links": {
    list: { items: [1, 3], text: ["title"], media: ["image"], href: ["hrefVi", "hrefEn"] },
    marks: { title: "title" },
    render: (block, ctx) => [
      `<section class="blk blk-banners ${BANNER_COLUMNS[block.items.length]} section-gap" data-header-tone="ink">`,
      ...block.items.map((item) => `  <a class="blk-banner" href="${item.hrefVi}"${item.hrefEn ? ` data-en-href="${item.hrefEn}"` : ""}>${image(item.image)}${marked("span", item.title, ' class="blk-banner__title"', ctx)}</a>`),
      "</section>",
    ].join("\n"),
  },
};
export const BLOCK_TYPES = Object.keys(BLOCKS);

// Every text field of a page's blocks: [path, value, marks kind]; path is relative to the page ("blocks[2].text"). Hero lines
// have no marks kind (null): they keep their own italic rule. Used by the mark check and by enMissing (cms-plan part 2 K3).
// Empty EN links of list items (banner-links hrefEn): a page with one is VI only (cms-content R2).
export const blockEmptyEnHrefs = (page) => (Array.isArray(page?.blocks) ? page.blocks : []).flatMap((block, index) => (BLOCKS[block?.type]?.list?.href ?? []).includes("hrefEn") && Array.isArray(block.items)
  ? block.items.flatMap((item, line) => (item?.hrefEn ? [] : [`blocks[${index}].items[${line}].hrefEn`])) : []);
export function blockTextFields(page) {
  const fields = [];
  for (const [index, block] of (Array.isArray(page?.blocks) ? page.blocks : []).entries()) {
    const spec = BLOCKS[block?.type];
    if (!spec) continue;
    const at = `blocks[${index}]`;
    const kind = (field) => spec.marks?.[field] ?? "plain";
    for (const field of spec.text ?? []) fields.push([`${at}.${field}`, block[field], kind(field)]);
    for (const field of spec.optionalText ?? []) if (block[field] !== undefined) fields.push([`${at}.${field}`, block[field], kind(field)]);
    for (const field of Object.keys(spec.lines ?? {})) for (const [line, value] of (Array.isArray(block[field]) ? block[field] : []).entries()) fields.push([`${at}.${field}[${line}]`, value, null]);
    if (spec.list && Array.isArray(block.items)) {
      for (const [item, value] of block.items.entries()) for (const field of spec.list.text ?? []) fields.push([`${at}.items[${item}].${field}`, value?.[field], kind(field)]);
    }
  }
  return fields;
}

// Mark errors (level shape, with code) of every block text field, by the block's marks table; other fields are plain (K2).
// The Worker reports them as shape errors, the build as page errors.
export const blockMarksErrors = (page, at = page?.id ?? "page") => blockTextFields(page).flatMap(([field, value, kind]) =>
  kind && typeof value?.vi === "string" && typeof value?.en === "string" ? marksErrors(value.vi, value.en, kind).map((error) => ({ ...error, message: `${at}.${field}: ${error.message}` })) : []);

// Validate one page (project or News post). Returns the error list, does not stop at the first error.
// checkImage(image, where) returns the errors of one image reference: fileImageCheck(siteRoot) in the build, a record check in the Worker.
// en: "optional" (News and projects, cms-content R2): an empty EN field is not an error, a filled one is checked as before.
export async function validateBlockPage(page, { checkImage, projects = new Map(), news = new Map(), at = page?.id ?? "page", en = "required" }) {
  if (typeof checkImage !== "function") throw new Error("validateBlockPage: checkImage is required");
  const errors = [];
  const text = (value, where) => {
    if (!value || typeof value.vi !== "string" || !value.vi.trim()) errors.push(`${where}: missing VI text`);
    if (!value || typeof value.en !== "string" || !value.en.trim()) { if (en !== "optional") errors.push(`${where}: missing EN text`); }
    else if (typeof value.vi === "string" && paragraphs(value.vi).length !== paragraphs(value.en).length) errors.push(`${where}: paragraph counts differ between VI and EN`);
  };
  const media = async (value, where) => { errors.push(...await checkImage(value, where)); };
  const href = (value, where) => { if (!SAFE_HREF.test(value ?? "")) errors.push(`${where}: invalid link`); };

  if (!KEBAB.test(page?.id ?? "")) errors.push(`${at}: id must be kebab-case`);
  for (const field of ["slugVi", "slugEn"]) if (!(field === "slugEn" && en === "optional" && !page?.slugEn) && !KEBAB.test(page?.[field] ?? "")) errors.push(`${at}: ${field} must be unaccented kebab-case`);
  text(page?.title, `${at}.title`);
  text(page?.description, `${at}.description`);
  await media(page?.cover, `${at}.cover`);
  if (!Array.isArray(page?.blocks) || !page.blocks.length) return [...errors, `${at}: needs at least one block`];
  errors.push(...blockMarksErrors(page, at).map(({ message }) => message));

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
        for (const value of [line?.vi, line?.en].filter((side) => typeof side === "string")) {
          const found = sideMarksErrors(value, ["i"]);
          if (found.length) errors.push(...found.map(({ message }) => `${where}.${field}[${index}]: ${message}`));
          else if (parseMarks(value).filter(({ t }) => t === "i").length > 1) errors.push(`${where}.${field}[${index}]: at most one *italic* part`);
        }
        if ([line?.vi, line?.en].some((value) => typeof value === "string" && typoWarnings(`${value}\n`).some(({ code }) => code === "line-end-punct"))) errors.push(`${where}.${field}[${index}]: a line must not end with , . or ;`);
      }
    }
    for (const field of spec.media ?? []) await media(block[field], `${where}.${field}`);
    if (spec.oneOf) {
      const present = spec.oneOf.filter((field) => block[field] !== undefined);
      if (present.length !== 1) errors.push(`${where}: needs exactly one of ${spec.oneOf.join(", ")}`);
      else if (present[0] === "image") await media(block.image, `${where}.image`);
      else {
        const value = block.video;
        // Same field check the video-single spec ran before.
        if (!/^\/assets\/content\/[a-z0-9/-]+\.mp4$/.test(value?.src ?? "") || !IMAGE_SRC.test(value?.poster ?? "") || !Number.isInteger(value?.width) || !Number.isInteger(value?.height)) errors.push(`${where}.video: needs src .mp4, poster .webp, width, height`);
        else if (value.width * 9 !== value.height * 16) errors.push(`${where}: a video must be 16:9`);
        if (block.position !== "wide") errors.push(`${where}: a video must use position wide`);
      }
    }
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
        for (const field of spec.list.href ?? []) if (!(field === "hrefEn" && en === "optional" && !value?.[field])) href(value?.[field], `${where}.items[${item}].${field}`);
      }
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
  // A post without EN may have no slugEn; empty values are not duplicates of each other.
  return pages.filter((page) => page[field]).flatMap((page) => {
    const duplicate = seen.has(page[field]);
    seen.add(page[field]);
    return duplicate ? [`${at}: duplicate ${field} ${page[field]}`] : [];
  });
});

// Call only with data that passed validateBlockPage.
export const renderBlocks = (page, ctx) => page.blocks.map((block) => BLOCKS[block.type].render(block, ctx, page)).join("\n");
