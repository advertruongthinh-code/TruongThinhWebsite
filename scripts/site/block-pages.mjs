// Trang dựng từ khối (projects R3, news R3, layout-library R4): khung header, menu, footer lấy từ một trang có sẵn,
// thân <main> là chuỗi khối của src/site/content/<kind>.json. Route theo slug VI và EN, cùng một file nguồn.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { renderBlocks } from "./blocks.mjs";

export const PUBLIC_ORIGIN = "https://truongthinhads.vn";
// sector cũng là thư mục trang mảng dùng làm khung và namespace của nó.
export const SECTORS = ["residential", "commercial"];
const SECTOR_NAME = { residential: "Không gian nhà ở", commercial: "Không gian kinh doanh" };
// Bốn nhóm News (news R1); tên hiển thị và slug chốt theo Keyword Planner, tới đó dùng tên tạm.
export const NEWS_GROUPS = {
  "nha-o": { vi: "Không gian nhà ở", en: "Residential spaces" },
  "kinh-doanh": { vi: "Không gian kinh doanh", en: "Commercial spaces" },
  "xu-huong": { vi: "Xu hướng thiết kế", en: "Design trends" },
  "quang-cao": { vi: "Sản phẩm quảng cáo", en: "Advertising products" },
};

// Mỗi loại trang: thư mục route, trang khung, namespace, kiểu JSON-LD, mục cha trong breadcrumb.
export const KINDS = {
  projects: { dir: "projects", frame: (page) => page.sector, namespace: "project", schema: "Article", parent: (page) => ({ name: SECTOR_NAME[page.sector], path: `/${page.sector}/` }) },
  // Trang Giới thiệu không có trên navbar nên khung không gạch chân mục nào; bỏ aria-current của menu.
  news: { dir: "news", frame: () => "about", namespace: "news", schema: "BlogPosting", parent: () => ({ name: "News", path: "/news/" }) },
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export const loadBlockContent = (siteRoot) => Object.fromEntries(Object.keys(KINDS).map((kind) => {
  const file = path.join(siteRoot, `content/${kind}.json`);
  return [kind, existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : []];
}));

export const pageHref = (kind, locale, page) => `/${locale}/${KINDS[kind].dir}/${locale === "vi" ? page.slugVi : page.slugEn}/`;
export const projectHref = (locale, project) => pageHref("projects", locale, project);
// Một file nguồn mỗi trang; route VI và EN cùng trỏ vào đó, localeHtml đổi ngôn ngữ.
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

// Mỗi điểm neo của trang khung phải khớp đúng số lần mong đợi; khung đổi thì build dừng thay vì ra trang thiếu SEO.
const replaceCounted = (html, pattern, replacement, name, expected = 1) => {
  const count = typeof pattern === "string" ? html.split(pattern).length - 1 : (html.match(new RegExp(pattern.source, `${pattern.flags}g`)) ?? []).length;
  if (count !== expected) throw new Error(`frame template anchor "${name}" matched ${count} times`);
  return expected ? html.replace(pattern, replacement) : html;
};

// Đầu bài News (news R3): nhóm, h1 tên bài, ngày đăng hiển thị khớp datePublished của JSON-LD.
const articleHead = (page) => {
  const group = NEWS_GROUPS[page.group];
  const [year, month, day] = page.published.split("-");
  return [
    '<header class="blk blk-article-head section-gap" data-header-tone="inverse">',
    // Nhãn nhóm dẫn tới trang nhóm: trang nhóm không có nút lọc trên trang danh sách (news R2, owner 2026-11-09).
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
    // Bỏ script chọn slide hero của trang mảng: trang dựng từ khối không có slideshow. Trang Giới thiệu không có script này.
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

// Trang danh sách News (news R2, owner 2026-11-09): bài mới nhất trước, 12 bài mỗi trang. Hàng lọc chỉ có "Tất cả" và các
// năm có bài; trang năm không cho lập chỉ mục. Trang nhóm giữ đường dẫn cho SEO nhưng không hiện thành nút lọc.
// VI và EN cùng đường dẫn, chỉ khác tiền tố locale.
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

// Thẻ News theo Espacio /en/news: một ảnh bìa, nhóm và ngày, tiêu đề; kiểu lớn (bài đầu), thường, hàng ngang.
// Class viết đủ chữ để test orphan-selectors thấy nơi sinh ra từng biến thể CSS. Thẻ lớn nằm trên màn hình đầu nên ảnh
// tải ngay (LCP); các thẻ còn lại lazy. Chữ tiêu đề bọc span inline để gạch chân rê chuột chạy theo bề rộng chữ.
const NEWS_CARD_VARIANT = { main: " blk-news-card--main", row: " blk-news-card--row" };
const newsCard = (post, variant = "") => {
  const group = NEWS_GROUPS[post.group];
  const [year, month, day] = post.published.split("-");
  // Ảnh thẻ lớn là LCP: tải sớm, sizes đúng nửa trang trên PC để không kéo bản quá lớn.
  const loading = variant === "main" ? 'loading="eager" fetchpriority="high" sizes="(max-width: 960px) 100vw, 50vw"' : 'loading="lazy"';
  return [
    `<a class="blk-news-card${NEWS_CARD_VARIANT[variant] ?? ""}" href="${pageHref("news", "vi", post)}" data-en-href="${pageHref("news", "en", post)}">`,
    `<img src="${post.cover.src}" width="${post.cover.width}" height="${post.cover.height}" alt="${escapeHtml(post.cover.altVi)}" data-en-alt="${escapeHtml(post.cover.altEn)}" ${loading} />`,
    `<span class="blk-news-card__meta"><span data-en="${escapeHtml(group.en)}">${escapeHtml(group.vi)}</span> · <time datetime="${post.published}">${day}/${month}/${year}</time></span>`,
    `<span class="blk-news-card__title"><span class="blk-news-card__text" data-en="${escapeHtml(post.title.en)}">${escapeHtml(post.title.vi)}</span></span>`,
    "</a>",
  ].join("");
};

// Khung trang danh sách (News, Công trình) dựng trên trang Giới thiệu: head SEO, namespace, link đổi ngôn ngữ, h1 và hàng lọc.
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
    // Bỏ aria-current của menu trước khi chèn thân trang, vì thanh phân trang cũng dùng aria-current="page".
    [' aria-current="page"', "", "menu current page"],
    [/<main id="noi-dung">[\s\S]*?<\/main>/, () => `<main id="noi-dung">\n${main}\n      </main>`, "main"],
  ].reduce((html, [pattern, replacement, name]) => replaceCounted(html, pattern, replacement, name), template);
};

// Bố cục Espacio: bài đầu là thẻ lớn ở cột trái, 4 bài kế là lưới 2x2 ở cột phải, còn lại là thẻ hàng ngang dưới lưới đó.
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

// Trường riêng của từng loại: mảng và loại công trình; nhóm, ngày đăng và slug không trùng trang nhóm, phân trang của News.
// Thẻ công trình (projects R2, owner 2026-11-09): người soạn đặt khung thẻ (width, height) rồi chọn ảnh cho thẻ; mọi ảnh
// khít đúng tỷ lệ khung, không vùng dư. Không có `card` thì thẻ chỉ có ảnh bìa.
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
    // id cũng là thư mục file nguồn (projects/<id>/index.html), trùng slug lọc thì ghi đè trang lọc.
    ...[...new Set([page.id, page.slugVi, page.slugEn])].filter((slug) => FILTER_SLUGS.includes(slug)).map((slug) => `${at}: id hoặc slug ${slug} trùng đường dẫn lọc công trình`),
    ...cardErrors(page.card, at),
  ];
  const errors = [];
  if (!Object.hasOwn(NEWS_GROUPS, page.group)) errors.push(`${at}: group phải là ${Object.keys(NEWS_GROUPS).join(", ")}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(page.published ?? "")) errors.push(`${at}: published phải là YYYY-MM-DD`);
  // id cũng là thư mục file nguồn (news/<id>/index.html), trùng trang nhóm, năm hoặc phân trang thì ghi đè trang danh sách.
  for (const slug of new Set([page.id, page.slugVi, page.slugEn])) if (slug === "page" || Object.hasOwn(NEWS_GROUPS, slug) || /^\d{4}$/.test(slug ?? "")) errors.push(`${at}: id hoặc slug ${slug} trùng đường dẫn nhóm, năm hoặc phân trang`);
  return errors;
};

// Trang toàn bộ công trình (projects R2): lưới so le như Sản phẩm quảng cáo, bấm thẻ mở trang công trình.
// Lọc theo mảng hoặc loại bằng trang riêng có đường dẫn crawl được; slug lọc không được trùng slug công trình.
export const PROJECT_FILTERS = { residential: "nha-o", commercial: "kinh-doanh" };
// Loại công trình (projects R2): key là slug trang lọc; menu site dẫn tới đủ sáu trang dù loại chưa có công trình.
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

// Mục tiêu biểu của menu site (content/menu.json, CMS sửa được): công trình theo thứ tự đã chọn; nhóm sản phẩm
// quảng cáo theo danh sách đã chọn, danh sách rỗng thì lấy nhóm nhiều thẻ nhất (hòa thì giữ thứ tự catalog).
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
