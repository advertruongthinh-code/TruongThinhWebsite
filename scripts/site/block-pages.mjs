// Block-built pages (projects R3, news R3, layout-library R4): header, menu and footer frame come from an existing page,
// the <main> body is the block list from src/site/content/<kind>.json. Routes use VI and EN slugs, one shared source file.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { renderBlocks } from "./blocks.mjs";

export const PUBLIC_ORIGIN = "https://truongthinhads.vn";
// The sector is also the sector page directory, used as its frame and namespace.
export const SECTORS = ["residential", "commercial"];
const SECTOR_NAME = { residential: "Không gian nhà ở", commercial: "Không gian kinh doanh" };
// Four News groups (news R1); display names and slugs are final per Keyword Planner, until then use the temporary names.
export const NEWS_GROUPS = {
  "nha-o": { vi: "Không gian nhà ở", en: "Residential spaces" },
  "kinh-doanh": { vi: "Không gian kinh doanh", en: "Commercial spaces" },
  "xu-huong": { vi: "Xu hướng thiết kế", en: "Design trends" },
  "quang-cao": { vi: "Sản phẩm quảng cáo", en: "Advertising products" },
};

// Per page kind: route directory, frame page, namespace, JSON-LD type, parent breadcrumb entry.
export const KINDS = {
  projects: { dir: "projects", frame: (page) => page.sector, namespace: "project", schema: "Article", parent: (page) => ({ name: SECTOR_NAME[page.sector], path: `/${page.sector}/` }) },
  // The About page is not on the navbar, so the frame underlines no item; drop the menu's aria-current.
  news: { dir: "news", frame: () => "about", namespace: "news", schema: "BlogPosting", parent: () => ({ name: "News", path: "/news/" }) },
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export const loadBlockContent = (siteRoot) => Object.fromEntries(Object.keys(KINDS).map((kind) => {
  const file = path.join(siteRoot, `content/${kind}.json`);
  return [kind, existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : []];
}));

export const pageHref = (kind, locale, page) => `/${locale}/${KINDS[kind].dir}/${locale === "vi" ? page.slugVi : page.slugEn}/`;
export const projectHref = (locale, project) => pageHref("projects", locale, project);
// One source file per page; the VI and EN routes both point at it, localeHtml switches the language.
export const pageSource = (kind, page) => `${KINDS[kind].dir}/${page.id}/index.html`;
export const blockRoutes = (content) => Object.keys(KINDS).flatMap((kind) => (content[kind] ?? []).flatMap((page) => ["vi", "en"].map((locale) => [pageHref(kind, locale, page), pageSource(kind, page)])));

const jsonLd = (kind, page) => {
  const url = `${PUBLIC_ORIGIN}${pageHref(kind, "vi", page)}`;
  const parent = KINDS[kind].parent(page);
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": KINDS[kind].schema, "@id": `${url}#article`, headline: page.title.vi, description: page.description.vi,
        image: `${PUBLIC_ORIGIN}${page.cover.src}`, mainEntityOfPage: url,
        ...(page.published ? { datePublished: page.published, dateModified: page.updated ?? page.published } : {}),
        author: { "@type": "Organization", name: "Trường Thịnh", url: `${PUBLIC_ORIGIN}/` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trường Thịnh", item: `${PUBLIC_ORIGIN}/vi/` },
          { "@type": "ListItem", position: 2, name: parent.name, item: `${PUBLIC_ORIGIN}/vi${parent.path}` },
          { "@type": "ListItem", position: 3, name: page.title.vi, item: url },
        ],
      },
    ],
  }).replace(/</g, "\\u003c");
};

// Each anchor in the frame page must match exactly the expected number of times; if the frame changes the build stops instead of emitting a page missing SEO.
const replaceCounted = (html, pattern, replacement, name, expected = 1) => {
  const count = typeof pattern === "string" ? html.split(pattern).length - 1 : (html.match(new RegExp(pattern.source, `${pattern.flags}g`)) ?? []).length;
  if (count !== expected) throw new Error(`frame template anchor "${name}" matched ${count} times`);
  return expected ? html.replace(pattern, replacement) : html;
};

// News article head (news R3): group, h1 article title, display date matching the JSON-LD datePublished.
const articleHead = (page) => {
  const group = NEWS_GROUPS[page.group];
  const [year, month, day] = page.published.split("-");
  return [
    '<header class="blk blk-article-head section-gap" data-header-tone="inverse">',
    // The group label links to the group page: group pages have no filter chip on the list page (news R2, owner 2026-11-09).
    `  <p class="blk-article-head__meta"><a class="blk-article-head__group" href="/vi/news/${page.group}/" data-en-href="/en/news/${page.group}/" data-en="${escapeHtml(group.en)}">${escapeHtml(group.vi)}</a> · <time datetime="${page.published}">${day}/${month}/${year}</time></p>`,
    `  <h1 class="blk-article-head__title" data-en="${escapeHtml(page.title.en)}">${escapeHtml(page.title.vi)}</h1>`,
    "</header>\n",
  ].join("\n");
};

export const renderBlockPage = (kind, template, page, ctx) => {
  const frame = KINDS[kind].frame(page);
  const vi = `${PUBLIC_ORIGIN}${pageHref(kind, "vi", page)}`;
  const en = `${PUBLIC_ORIGIN}${pageHref(kind, "en", page)}`;
  const head = [
    `<title data-en="${escapeHtml(page.title.en)} — Trường Thịnh">${escapeHtml(page.title.vi)} — Trường Thịnh</title>`,
    `<link rel="canonical" href="${vi}" data-en-href="${en}" />`,
    `<link rel="alternate" hreflang="vi" href="${vi}" />`,
    `<link rel="alternate" hreflang="en" href="${en}" />`,
    `<link rel="alternate" hreflang="x-default" href="${vi}" />`,
    `<meta property="og:image" content="${PUBLIC_ORIGIN}${page.cover.src}" />`,
    `<script type="application/ld+json">${jsonLd(kind, page)}</script>`,
  ].join("\n    ");
  const heroScript = /<script>\s*\/\/ detail-pages R5:[\s\S]*?<\/script>\s*/;
  return [
    // Drop the hero slide-picker script of the sector page: block-built pages have no slideshow. The About page has no such script.
    [heroScript, "", "hero slide script", heroScript.test(template) ? 1 : 0],
    [/<title\b[^>]*>[\s\S]*?<\/title>/, () => head, "title"],
    [/(<meta\s+name="description"\s+content=")[^"]*("\s+data-en-content=")[^"]*"/, (_match, before, middle) => `${before}${escapeHtml(page.description.vi)}${middle}${escapeHtml(page.description.en)}"`, "meta description"],
    [`data-barba-namespace="${frame}"`, `data-barba-namespace="${KINDS[kind].namespace}"`, "namespace"],
    [`href="/vi/${frame}/" data-language-option="vi"`, `href="${pageHref(kind, "vi", page)}" data-language-option="vi"`, "language vi"],
    [`href="/en/${frame}/" data-language-option="en"`, `href="${pageHref(kind, "en", page)}" data-language-option="en"`, "language en"],
    [/<main id="noi-dung">[\s\S]*?<\/main>/, () => `<main id="noi-dung">\n${kind === "news" ? articleHead(page) : ""}${renderBlocks(page, ctx)}\n      </main>`, "main"],
    ...(kind === "news" ? [[' aria-current="page"', "", "menu current page"]] : []),
  ].reduce((html, [pattern, replacement, name, expected]) => replaceCounted(html, pattern, replacement, name, expected), template);
};
export const renderProjectPage = (template, project, ctx) => renderBlockPage("projects", template, project, ctx);

// News list page (news R2, owner 2026-11-09): newest first, 12 posts per page. The filter row has only "Tất cả" and the
// years that have posts; year pages are not indexable. Group pages keep their path for SEO but do not appear as filter chips.
// VI and EN share the path, differing only in the locale prefix.
const NEWS_PAGE_SIZE = 12;
export const newsListPages = (news) => {
  const sorted = news.toSorted((left, right) => right.published.localeCompare(left.published) || left.id.localeCompare(right.id));
  const years = [...new Set(sorted.map((post) => post.published.slice(0, 4)))];
  const lists = [
    { posts: sorted, base: "/news/" },
    ...years.map((year) => ({ year, posts: sorted.filter((post) => post.published.startsWith(year)), base: `/news/${year}/` })),
    ...Object.keys(NEWS_GROUPS).map((group) => ({ group, posts: sorted.filter((post) => post.group === group), base: `/news/${group}/` })).filter((list) => list.posts.length),
  ];
  return lists.flatMap(({ group = null, year = null, posts, base }) => {
    const count = Math.max(1, Math.ceil(posts.length / NEWS_PAGE_SIZE));
    return Array.from({ length: count }, (_, index) => ({
      group, year, years, number: index + 1, count, base,
      path: index ? `${base}page/${index + 1}/` : base,
      posts: posts.slice(index * NEWS_PAGE_SIZE, (index + 1) * NEWS_PAGE_SIZE),
    }));
  });
};
export const newsListSource = (listPage) => `${listPage.path.slice(1)}index.html`;
export const newsListRoutes = (news) => newsListPages(news).flatMap((listPage) => ["vi", "en"].map((locale) => [`/${locale}${listPage.path}`, newsListSource(listPage)]));

// News card following Espacio /en/news: one cover image, group and date, title; large (first post), regular and horizontal variants.
// Classes are written out in full so the orphan-selectors test sees where each CSS variant is produced. The large card is above the fold, so its image
// loads immediately (LCP); the other cards are lazy. The title text is wrapped in an inline span so the hover underline follows the text width.
const NEWS_CARD_VARIANT = { main: " blk-news-card--main", row: " blk-news-card--row" };
const newsCard = (post, variant = "") => {
  const group = NEWS_GROUPS[post.group];
  const [year, month, day] = post.published.split("-");
  // The large card image is the LCP: load early, sizes set to half the page on desktop so an oversized variant is not fetched.
  const loading = variant === "main" ? 'loading="eager" fetchpriority="high" sizes="(max-width: 960px) 100vw, 50vw"' : 'loading="lazy"';
  return [
    `<a class="blk-news-card${NEWS_CARD_VARIANT[variant] ?? ""}" href="${pageHref("news", "vi", post)}" data-en-href="${pageHref("news", "en", post)}">`,
    `<img src="${post.cover.src}" width="${post.cover.width}" height="${post.cover.height}" alt="${escapeHtml(post.cover.altVi)}" data-en-alt="${escapeHtml(post.cover.altEn)}" ${loading} />`,
    `<span class="blk-news-card__meta"><span data-en="${escapeHtml(group.en)}">${escapeHtml(group.vi)}</span> · <time datetime="${post.published}">${day}/${month}/${year}</time></span>`,
    `<span class="blk-news-card__title"><span class="blk-news-card__text" data-en="${escapeHtml(post.title.en)}">${escapeHtml(post.title.vi)}</span></span>`,
    "</a>",
  ].join("");
};

// List page frame (News, Projects) built on the About page: SEO head, namespace, language-switch link, h1 and filter row.
const renderListFrame = (template, { path: listPath, title, h1, description, namespace, filterLabel, chips, body, noindex = false }) => {
  const vi = `${PUBLIC_ORIGIN}/vi${listPath}`;
  const en = `${PUBLIC_ORIGIN}/en${listPath}`;
  const head = [
    `<title data-en="${escapeHtml(title.en)} — Trường Thịnh">${escapeHtml(title.vi)} — Trường Thịnh</title>`,
    `<link rel="canonical" href="${vi}" data-en-href="${en}" />`,
    `<link rel="alternate" hreflang="vi" href="${vi}" />`,
    `<link rel="alternate" hreflang="en" href="${en}" />`,
    `<link rel="alternate" hreflang="x-default" href="${vi}" />`,
    ...(noindex ? ['<meta name="robots" content="noindex, follow" />'] : []),
  ].join("\n    ");
  const chipLinks = chips.map(({ href, label, current }) => `<a class="blk-news-filter__chip" href="${href}"${current ? ' aria-current="true"' : ""} data-en="${escapeHtml(label.en)}">${escapeHtml(label.vi)}</a>`).join("");
  const main = [
    '<header class="blk blk-article-head section-gap" data-header-tone="inverse">',
    `  <h1 class="blk-article-head__title" data-en="${escapeHtml(h1.en)}">${escapeHtml(h1.vi)}</h1>`,
    `  <nav class="blk-news-filter" aria-label="${escapeHtml(filterLabel.vi)}" data-en-aria-label="${escapeHtml(filterLabel.en)}">${chipLinks}</nav>`,
    "</header>",
    body,
  ].join("\n");
  return [
    [/<title\b[^>]*>[\s\S]*?<\/title>/, () => head, "title"],
    [/(<meta\s+name="description"\s+content=")[^"]*("\s+data-en-content=")[^"]*"/, (_match, before, middle) => `${before}${escapeHtml(description.vi)}${middle}${escapeHtml(description.en)}"`, "meta description"],
    ['data-barba-namespace="about"', `data-barba-namespace="${namespace}"`, "namespace"],
    ['href="/vi/about/" data-language-option="vi"', `href="/vi${listPath}" data-language-option="vi"`, "language vi"],
    ['href="/en/about/" data-language-option="en"', `href="/en${listPath}" data-language-option="en"`, "language en"],
    // Drop the menu's aria-current before inserting the page body, because the pagination bar also uses aria-current="page".
    [' aria-current="page"', "", "menu current page"],
    [/<main id="noi-dung">[\s\S]*?<\/main>/, () => `<main id="noi-dung">\n${main}\n      </main>`, "main"],
  ].reduce((html, [pattern, replacement, name]) => replaceCounted(html, pattern, replacement, name), template);
};

// Espacio layout: the first post is a large card in the left column, the next 4 posts form a 2x2 grid in the right column, the rest are horizontal cards below that grid.
const newsListBody = (posts) => {
  const [first, ...rest] = posts;
  if (!first) return "";
  return [
    '<div class="blk-news-list__grid">',
    `<div class="blk-news-list__main">${newsCard(first, "main")}</div>`,
    '<div class="blk-news-list__side">',
    `<div class="blk-news-list__quad">${rest.slice(0, 4).map((post) => newsCard(post)).join("")}</div>`,
    ...rest.slice(4).map((post) => newsCard(post, "row")),
    "</div>",
    "</div>",
  ].join("");
};

export const renderNewsListPage = (template, listPage) => {
  const name = listPage.group ? NEWS_GROUPS[listPage.group] : listPage.year ? { vi: `Tin tức ${listPage.year}`, en: `News ${listPage.year}` } : { vi: "Tin tức", en: "News" };
  const suffix = listPage.number > 1 ? { vi: ` — trang ${listPage.number}`, en: ` — page ${listPage.number}` } : { vi: "", en: "" };
  const pager = listPage.count > 1 ? `<nav class="blk-news-pager" aria-label="Trang" data-en-aria-label="Pages">${Array.from({ length: listPage.count }, (_, index) => {
    const pagePath = index ? `${listPage.base}page/${index + 1}/` : listPage.base;
    return `<a href="/vi${pagePath}"${index + 1 === listPage.number ? ' aria-current="page"' : ""}>${index + 1}</a>`;
  }).join("")}</nav>` : "";
  return renderListFrame(template, {
    path: listPage.path, h1: name, namespace: "news", noindex: Boolean(listPage.year),
    title: { vi: name.vi + suffix.vi, en: name.en + suffix.en },
    description: { vi: `Bài viết tư vấn về ${name.vi.toLowerCase()} từ Trường Thịnh.`, en: `Advice articles on ${name.en.toLowerCase()} from Trường Thịnh.` },
    filterLabel: { vi: "Năm đăng bài", en: "Year published" },
    chips: [null, ...listPage.years].map((year) => ({ href: `/vi/news/${year ? `${year}/` : ""}`, label: year ? { vi: year, en: year } : { vi: "Tất cả", en: "All" }, current: !listPage.group && year === listPage.year })),
    body: `<section class="blk blk-news-list section-gap" data-header-tone="ink">${newsListBody(listPage.posts)}${pager}</section>`,
  });
};

// Fields specific to each kind: sector and project type; group, publish date and slug must not collide with News group and pagination pages.
// Project card (projects R2, owner 2026-11-09): the author sets the card frame (width, height) then picks the card images; every image
// fits the frame ratio exactly, no leftover area. Without `card` the card has only the cover image.
const isSize = (value) => Number.isSafeInteger(value) && value > 0;
const cardErrors = (card, at) => {
  if (card === undefined) return [];
  if (!isSize(card?.width) || !isSize(card?.height)) return [`${at}: card.width, card.height phải là số nguyên dương`];
  if (!Array.isArray(card.media) || !card.media.length) return [`${at}: card.media phải có ít nhất một ảnh`];
  return card.media.flatMap((media, index) => [
    ...(media?.src && media.altVi && media.altEn ? [] : [`${at}: card.media[${index}] thiếu src, altVi hoặc altEn`]),
    ...(isSize(media?.width) && isSize(media?.height) && BigInt(media.width) * BigInt(card.height) === BigInt(media.height) * BigInt(card.width)
      ? [] : [`${at}: card.media[${index}] khác tỷ lệ khung thẻ ${card.width}x${card.height}`]),
  ]);
};
export const kindFieldErrors = (kind, page, at) => {
  if (kind === "projects") return [
    ...(SECTORS.includes(page.sector) ? [] : [`${at}: sector phải là ${SECTORS.join(", ")}`]),
    ...(PROJECT_TYPES[page.type]?.sector === page.sector ? [] : [`${at}: type phải là loại thuộc mảng ${page.sector}: ${Object.keys(PROJECT_TYPES).filter((type) => PROJECT_TYPES[type].sector === page.sector).join(", ")}`]),
    // id is also the source file directory (projects/<id>/index.html); colliding with a filter slug would overwrite the filter page.
    ...[...new Set([page.id, page.slugVi, page.slugEn])].filter((slug) => FILTER_SLUGS.includes(slug)).map((slug) => `${at}: id hoặc slug ${slug} trùng đường dẫn lọc công trình`),
    ...cardErrors(page.card, at),
  ];
  const errors = [];
  if (!Object.hasOwn(NEWS_GROUPS, page.group)) errors.push(`${at}: group phải là ${Object.keys(NEWS_GROUPS).join(", ")}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(page.published ?? "")) errors.push(`${at}: published phải là YYYY-MM-DD`);
  // id is also the source file directory (news/<id>/index.html); colliding with a group, year or pagination page would overwrite the list page.
  for (const slug of new Set([page.id, page.slugVi, page.slugEn])) if (slug === "page" || Object.hasOwn(NEWS_GROUPS, slug) || /^\d{4}$/.test(slug ?? "")) errors.push(`${at}: id hoặc slug ${slug} trùng đường dẫn nhóm, năm hoặc phân trang`);
  return errors;
};

// All-projects page (projects R2): staggered grid like Advertising products, clicking a card opens the project page.
// Filtering by sector or type uses dedicated pages with crawlable paths; filter slugs must not collide with project slugs.
export const PROJECT_FILTERS = { residential: "nha-o", commercial: "kinh-doanh" };
// Project types (projects R2): key is the filter page slug; the site menu links to all six pages even if a type has no projects yet.
export const PROJECT_TYPES = {
  "nha-pho": { sector: "residential", label: { vi: "Nhà phố", en: "Townhouses" } },
  "can-ho": { sector: "residential", label: { vi: "Căn hộ", en: "Apartments" } },
  "homestay-hotel": { sector: "residential", label: { vi: "Homestay & hotel", en: "Homestays & hotels" } },
  "showroom-cua-hang": { sector: "commercial", label: { vi: "Showroom & cửa hàng", en: "Showrooms & stores" } },
  "cafe-nha-hang": { sector: "commercial", label: { vi: "Cafe & nhà hàng", en: "Cafes & restaurants" } },
  "van-phong": { sector: "commercial", label: { vi: "Văn phòng & khu làm việc", en: "Offices & workspaces" } },
};
export const projectTypeHref = (type, locale) => `/${locale}/projects/${type}/`;
const FILTER_SLUGS = [...Object.values(PROJECT_FILTERS), ...Object.keys(PROJECT_TYPES)];

// Featured items of the site menu (content/menu.json, CMS-editable): projects in the chosen order; advertising
// product groups follow the chosen list, an empty list picks the group with the most cards (ties keep catalog order).
export const menuFeatured = (menu, { projects, categories, cards }) => {
  const count = (slug) => cards.filter((card) => card.category === slug).length;
  const groups = menu.featuredProductGroups.length ? menu.featuredProductGroups : categories.map((category) => category.slug).toSorted((left, right) => count(right) - count(left));
  return {
    projects: menu.featuredProjects.map((id) => projects.find((project) => project.id === id)),
    productGroups: groups.map((slug) => categories.find((category) => category.slug === slug)),
  };
};
export const menuErrors = (menu, { projects, categories }, at) => [
  ...menu.featuredProjects.filter((id, index, ids) => !projects.some((project) => project.id === id) || ids.indexOf(id) !== index).map((id) => `${at}: featuredProjects ${id} không có trong projects.json hoặc bị lặp`),
  ...menu.featuredProductGroups.filter((slug, index, slugs) => !categories.some((category) => category.slug === slug) || slugs.indexOf(slug) !== index).map((slug) => `${at}: featuredProductGroups ${slug} không phải nhóm Advertising hoặc bị lặp`),
];
