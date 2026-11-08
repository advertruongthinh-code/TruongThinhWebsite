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
    '<header class="blk blk-article-head section-gap" data-header-tone="ink">',
    `  <p class="blk-article-head__meta"><span data-en="${escapeHtml(group.en)}">${escapeHtml(group.vi)}</span> · <time datetime="${page.published}">${day}/${month}/${year}</time></p>`,
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

// Trang danh sách News (news R2): bài mới nhất trước, 12 bài mỗi trang, hàng lọc "Tất cả" và các nhóm có bài.
// Mỗi nhóm một trang lọc có đường dẫn riêng; VI và EN cùng đường dẫn, chỉ khác tiền tố locale.
const NEWS_PAGE_SIZE = 12;
export const newsListPages = (news) => {
  const sorted = news.toSorted((left, right) => right.published.localeCompare(left.published) || left.id.localeCompare(right.id));
  const groups = [null, ...Object.keys(NEWS_GROUPS).filter((group) => sorted.some((post) => post.group === group))];
  return groups.flatMap((group) => {
    const posts = group ? sorted.filter((post) => post.group === group) : sorted;
    const base = group ? `/news/${group}/` : "/news/";
    const count = Math.max(1, Math.ceil(posts.length / NEWS_PAGE_SIZE));
    return Array.from({ length: count }, (_, index) => ({
      group, groups, number: index + 1, count, base,
      path: index ? `${base}page/${index + 1}/` : base,
      posts: posts.slice(index * NEWS_PAGE_SIZE, (index + 1) * NEWS_PAGE_SIZE),
    }));
  });
};
export const newsListSource = (listPage) => `${listPage.path.slice(1)}index.html`;
export const newsListRoutes = (news) => newsListPages(news).flatMap((listPage) => ["vi", "en"].map((locale) => [`/${locale}${listPage.path}`, newsListSource(listPage)]));

const newsCard = (post) => {
  const group = NEWS_GROUPS[post.group];
  const [year, month, day] = post.published.split("-");
  return [
    `<a class="blk-news-card" href="${pageHref("news", "vi", post)}" data-en-href="${pageHref("news", "en", post)}">`,
    `<img src="${post.cover.src}" width="${post.cover.width}" height="${post.cover.height}" alt="${escapeHtml(post.cover.altVi)}" data-en-alt="${escapeHtml(post.cover.altEn)}" loading="lazy" />`,
    `<span class="blk-news-card__meta"><span data-en="${escapeHtml(group.en)}">${escapeHtml(group.vi)}</span> · <time datetime="${post.published}">${day}/${month}/${year}</time></span>`,
    `<span class="blk-news-card__title" data-en="${escapeHtml(post.title.en)}">${escapeHtml(post.title.vi)}</span>`,
    "</a>",
  ].join("");
};

export const renderNewsListPage = (template, listPage) => {
  const vi = `${PUBLIC_ORIGIN}/vi${listPage.path}`;
  const en = `${PUBLIC_ORIGIN}/en${listPage.path}`;
  const groupName = listPage.group ? NEWS_GROUPS[listPage.group] : { vi: "Tin tức", en: "News" };
  const suffix = listPage.number > 1 ? { vi: ` — trang ${listPage.number}`, en: ` — page ${listPage.number}` } : { vi: "", en: "" };
  const head = [
    `<title data-en="${escapeHtml(groupName.en + suffix.en)} — Trường Thịnh">${escapeHtml(groupName.vi + suffix.vi)} — Trường Thịnh</title>`,
    `<link rel="canonical" href="${vi}" data-en-href="${en}" />`,
    `<link rel="alternate" hreflang="vi" href="${vi}" />`,
    `<link rel="alternate" hreflang="en" href="${en}" />`,
    `<link rel="alternate" hreflang="x-default" href="${vi}" />`,
  ].join("\n    ");
  const chips = listPage.groups.map((group) => {
    const label = group ? NEWS_GROUPS[group] : { vi: "Tất cả", en: "All" };
    const current = group === listPage.group ? ' aria-current="true"' : "";
    return `<a class="blk-news-filter__chip" href="/vi/news/${group ? `${group}/` : ""}"${current} data-en="${escapeHtml(label.en)}">${escapeHtml(label.vi)}</a>`;
  }).join("");
  const pager = listPage.count > 1 ? `<nav class="blk-news-pager" aria-label="Trang" data-en-aria-label="Pages">${Array.from({ length: listPage.count }, (_, index) => {
    const path = index ? `${listPage.base}page/${index + 1}/` : listPage.base;
    return `<a href="/vi${path}"${index + 1 === listPage.number ? ' aria-current="page"' : ""}>${index + 1}</a>`;
  }).join("")}</nav>` : "";
  const main = [
    '<header class="blk blk-article-head section-gap" data-header-tone="ink">',
    `  <h1 class="blk-article-head__title" data-en="${escapeHtml(groupName.en)}">${escapeHtml(groupName.vi)}</h1>`,
    `  <nav class="blk-news-filter" aria-label="Nhóm bài viết" data-en-aria-label="Article groups">${chips}</nav>`,
    "</header>",
    `<section class="blk blk-news-list section-gap" data-header-tone="ink"><div class="blk-news-cards__grid">${listPage.posts.map(newsCard).join("")}</div>${pager}</section>`,
  ].join("\n");
  return [
    [/<title\b[^>]*>[\s\S]*?<\/title>/, () => head, "title"],
    [/(<meta\s+name="description"\s+content=")[^"]*("\s+data-en-content=")[^"]*"/, (_match, before, middle) => `${before}${escapeHtml(`Bài viết tư vấn về ${groupName.vi.toLowerCase()} từ Trường Thịnh.`)}${middle}${escapeHtml(`Advice articles on ${groupName.en.toLowerCase()} from Trường Thịnh.`)}"`, "meta description"],
    ['data-barba-namespace="about"', 'data-barba-namespace="news"', "namespace"],
    ['href="/vi/about/" data-language-option="vi"', `href="/vi${listPage.path}" data-language-option="vi"`, "language vi"],
    ['href="/en/about/" data-language-option="en"', `href="/en${listPage.path}" data-language-option="en"`, "language en"],
    // Bỏ aria-current của menu trước khi chèn thân trang, vì thanh phân trang cũng dùng aria-current="page".
    [' aria-current="page"', "", "menu current page"],
    [/<main id="noi-dung">[\s\S]*?<\/main>/, () => `<main id="noi-dung">\n${main}\n      </main>`, "main"],
  ].reduce((html, [pattern, replacement, name]) => replaceCounted(html, pattern, replacement, name), template);
};

// Trường riêng của từng loại: mảng công trình; nhóm, ngày đăng và slug không trùng trang nhóm, phân trang của News.
export const kindFieldErrors = (kind, page, at) => {
  if (kind === "projects") return [
    ...(SECTORS.includes(page.sector) ? [] : [`${at}: sector phải là ${SECTORS.join(", ")}`]),
    ...[page.slugVi, page.slugEn].filter((slug) => Object.values(PROJECT_FILTERS).includes(slug)).map((slug) => `${at}: slug ${slug} trùng đường dẫn lọc công trình`),
  ];
  const errors = [];
  if (!Object.hasOwn(NEWS_GROUPS, page.group)) errors.push(`${at}: group phải là ${Object.keys(NEWS_GROUPS).join(", ")}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(page.published ?? "")) errors.push(`${at}: published phải là YYYY-MM-DD`);
  for (const slug of [page.slugVi, page.slugEn]) if (slug === "page" || Object.hasOwn(NEWS_GROUPS, slug)) errors.push(`${at}: slug ${slug} trùng đường dẫn nhóm hoặc phân trang`);
  return errors;
};

// Trang toàn bộ công trình (projects R2): lưới so le như Sản phẩm quảng cáo, bấm thẻ mở trang công trình.
// Lọc theo mảng bằng trang riêng có đường dẫn crawl được; slug lọc không được trùng slug công trình.
export const PROJECT_FILTERS = { residential: "nha-o", commercial: "kinh-doanh" };
const SECTOR_LABEL = { residential: { vi: "Nhà ở", en: "Residential" }, commercial: { vi: "Kinh doanh", en: "Commercial" } };
export const projectListPages = (projects) => [null, ...SECTORS.filter((sector) => projects.some((project) => project.sector === sector))]
  .map((sector, _index, sectors) => ({
    sector, sectors,
    path: sector ? `/projects/${PROJECT_FILTERS[sector]}/` : "/projects/",
    projects: sector ? projects.filter((project) => project.sector === sector) : projects,
  }));
export const projectListSource = (listPage) => `${listPage.path.slice(1)}index.html`;
export const projectListRoutes = (projects) => projectListPages(projects).flatMap((listPage) => ["vi", "en"].map((locale) => [`/${locale}${listPage.path}`, projectListSource(listPage)]));

const projectTile = (project) => [
  `<a class="blk-project-tile" href="${pageHref("projects", "vi", project)}" data-en-href="${pageHref("projects", "en", project)}">`,
  `<img src="${project.cover.src}" width="${project.cover.width}" height="${project.cover.height}" alt="${escapeHtml(project.cover.altVi)}" data-en-alt="${escapeHtml(project.cover.altEn)}" loading="lazy" />`,
  `<span class="blk-project-tile__meta" data-en="${escapeHtml(SECTOR_LABEL[project.sector].en)}">${escapeHtml(SECTOR_LABEL[project.sector].vi)}</span>`,
  `<span class="blk-project-tile__title" data-en="${escapeHtml(project.title.en)}">${escapeHtml(project.title.vi)}</span>`,
  "</a>",
].join("");

export const renderProjectListPage = (template, listPage) => {
  const vi = `${PUBLIC_ORIGIN}/vi${listPage.path}`;
  const en = `${PUBLIC_ORIGIN}/en${listPage.path}`;
  const name = listPage.sector ? { vi: `Công trình ${SECTOR_LABEL[listPage.sector].vi.toLowerCase()}`, en: `${SECTOR_LABEL[listPage.sector].en} projects` } : { vi: "Công trình", en: "Projects" };
  const head = [
    `<title data-en="${escapeHtml(name.en)} — Trường Thịnh">${escapeHtml(name.vi)} — Trường Thịnh</title>`,
    `<link rel="canonical" href="${vi}" data-en-href="${en}" />`,
    `<link rel="alternate" hreflang="vi" href="${vi}" />`,
    `<link rel="alternate" hreflang="en" href="${en}" />`,
    `<link rel="alternate" hreflang="x-default" href="${vi}" />`,
  ].join("\n    ");
  const chips = listPage.sectors.map((sector) => {
    const label = sector ? SECTOR_LABEL[sector] : { vi: "Tất cả", en: "All" };
    const current = sector === listPage.sector ? ' aria-current="true"' : "";
    return `<a class="blk-news-filter__chip" href="/vi/projects/${sector ? `${PROJECT_FILTERS[sector]}/` : ""}"${current} data-en="${escapeHtml(label.en)}">${escapeHtml(label.vi)}</a>`;
  }).join("");
  const main = [
    '<header class="blk blk-article-head section-gap" data-header-tone="ink">',
    `  <h1 class="blk-article-head__title" data-en="${escapeHtml(name.en)}">${escapeHtml(name.vi)}</h1>`,
    `  <nav class="blk-news-filter" aria-label="Lọc công trình" data-en-aria-label="Filter projects">${chips}</nav>`,
    "</header>",
    `<section class="blk blk-project-grid section-gap" data-header-tone="ink">${listPage.projects.map(projectTile).join("")}</section>`,
  ].join("\n");
  return [
    [/<title\b[^>]*>[\s\S]*?<\/title>/, () => head, "title"],
    [/(<meta\s+name="description"\s+content=")[^"]*("\s+data-en-content=")[^"]*"/, (_match, before, middle) => `${before}${escapeHtml(`${name.vi} do Trường Thịnh thiết kế, sản xuất và lắp đặt.`)}${middle}${escapeHtml(`${name.en} designed, built and installed by Trường Thịnh.`)}"`, "meta description"],
    ['data-barba-namespace="about"', 'data-barba-namespace="projects"', "namespace"],
    ['href="/vi/about/" data-language-option="vi"', `href="/vi${listPage.path}" data-language-option="vi"`, "language vi"],
    ['href="/en/about/" data-language-option="en"', `href="/en${listPage.path}" data-language-option="en"`, "language en"],
    [' aria-current="page"', "", "menu current page"],
    [/<main id="noi-dung">[\s\S]*?<\/main>/, () => `<main id="noi-dung">\n${main}\n      </main>`, "main"],
  ].reduce((html, [pattern, replacement, name]) => replaceCounted(html, pattern, replacement, name), template);
};
