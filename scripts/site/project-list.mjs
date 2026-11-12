// Projects page (projects R2): built on the Advertising products page shell, running that page's own masonry runtime
// (masonry/runtime.mjs) with the project card set, no detail view. Each filter has its own crawlable page; the artifact
// is embedded in the page so the runtime changes the filter in place.
import { MASONRY_LAYOUT_VERSION, filterRank, fnv1a32, matchesFilter, scheduleRank } from "../../src/site/masonry/layout.mjs";
import { buildLayoutCacheMemo } from "./layout-cache-memo.mjs";
import { PROJECT_FILTERS, PROJECT_TYPES, SECTORS, pageHref } from "./block-pages.mjs";
import { PUBLIC_ORIGIN, escapeHtml } from "./lib.mjs";

const SECTOR_LABEL = { residential: { vi: "Nhà ở", en: "Residential" }, commercial: { vi: "Kinh doanh", en: "Commercial" } };
const ROOT_NAME = { vi: "Công trình", en: "Projects" };
// Hero kicker (unchanged for every filter, owner 2026-11-08) and slogan; only the accent word of line two is bold italic (owner 2026-11-08), like the em of the Commercial hero.
const ROOT_KICKER = { vi: "Công trình tiêu biểu", en: "Our featured projects" };
const SLOGAN = { first: { vi: "Những công trình", en: "Projects" }, lead: { vi: "truyền", en: "that" }, accent: { vi: "cảm hứng", en: "inspire" } };
const CTA = [{ vi: "Không gian tiếp theo", en: "The next space" }, { vi: "dành cho bạn", en: "is yours" }];
const IMAGE_WIDTHS = [240, 480, 960];

const filterHref = (filter) => `/vi/projects/${filter.slug ? `${filter.slug}/` : ""}`;

// The "Tất cả" page, sector pages that have projects, and type pages always exist (an empty type is noindex). The filter row shows only filters
// that have projects, plus the filter of the page being viewed.
export const projectListPages = (projects) => {
  const filters = [
    { slug: null, label: { vi: "Tất cả", en: "All" }, name: ROOT_NAME, match: () => true },
    ...SECTORS.map((sector) => ({ slug: PROJECT_FILTERS[sector], label: SECTOR_LABEL[sector], name: { vi: `Công trình ${SECTOR_LABEL[sector].vi.toLowerCase()}`, en: `${SECTOR_LABEL[sector].en} projects` }, match: (project) => project.sector === sector })),
    ...Object.entries(PROJECT_TYPES).map(([type, { label }]) => ({ slug: type, type, label, name: { vi: `Công trình ${label.vi.toLowerCase()}`, en: `${label.en} projects` }, match: (project) => project.type === type })),
  ].map((filter) => ({ ...filter, projects: projects.filter(filter.match) }));
  return filters.filter((filter) => filter.type || filter.projects.length).map((filter) => ({
    filter, path: filter.slug ? `/projects/${filter.slug}/` : "/projects/", projects: filter.projects,
  }));
};
export const projectListSource = (listPage) => `${listPage.path.slice(1)}index.html`;
export const projectListRoutes = (projects) => projectListPages(projects).flatMap((listPage) => ["vi", "en"].map((locale) => [`/${locale}${listPage.path}`, projectListSource(listPage)]));

// Project card set in the Advertising masonry runtime artifact shape (projects R2): sector is the category, type is the cluster
// (clusterIds) for filtering; cards carry only an image like Advertising cards, with the detail page link and the cover image dominant color (computed at build) built in.
export const buildProjectArtifact = (projects, colors = {}) => {
  const categories = [
    ...SECTORS.map((sector) => ({ slug: PROJECT_FILTERS[sector], slugVi: PROJECT_FILTERS[sector], slugEn: PROJECT_FILTERS[sector], titleVi: SECTOR_LABEL[sector].vi, titleEn: SECTOR_LABEL[sector].en })),
    ...Object.entries(PROJECT_TYPES).map(([type, { label }]) => ({ slug: type, slugVi: type, slugEn: type, titleVi: label.vi, titleEn: label.en })),
  ];
  const nextSourceOrder = new Map();
  const cards = scheduleRank(projects.map((project) => {
    const category = PROJECT_FILTERS[project.sector];
    const sourceOrder = nextSourceOrder.get(category) ?? 0;
    nextSourceOrder.set(category, sourceOrder + 1);
    // Multi-media card (owner 2026-11-09, media-card R1): images the editor picked for the card (`card.media`, fitting the card frame, checked in
    // kindFieldErrors) in the chosen order; if none are chosen the card has only the cover image.
    const picked = project.card?.media ?? [project.cover];
    const mediaItems = picked.map((image, index) => ({ id: index ? `${project.id}-${index}` : project.id, kind: "image", src: image.src, width: image.width, height: image.height, altVi: image.altVi, altEn: image.altEn }));
    const { id: _id, kind: _kind, ...media } = mediaItems[0];
    return {
      id: project.id, category, sourceOrder, clusterIds: [project.type], titleVi: project.title.vi, titleEn: project.title.en,
      href: { vi: pageHref("projects", "vi", project), en: pageHref("projects", "en", project) },
      ...(colors[project.id] ? { color: colors[project.id] } : {}),
      media, mediaItems, coverMediaId: project.id,
    };
  }), categories.map((entry) => entry.slug));
  const pages = projectListPages(projects).map(({ filter }) => ({
    filter: filter.slug ?? "all", vi: filter.slug ?? "", en: filter.slug ?? "", labelVi: filter.name.vi, labelEn: filter.name.en,
    titleVi: `${filter.name.vi} — Trường Thịnh`, titleEn: `${filter.name.en} — Trường Thịnh`, kickerVi: ROOT_KICKER.vi, kickerEn: ROOT_KICKER.en,
  }));
  const datasetVersion = `projects-${fnv1a32(JSON.stringify(cards))}`;
  // Few cards, so the masonry layout cache rides inside the page artifact instead of separate files (advertising-masonry R6).
  const layouts = buildLayoutCacheMemo({ cards, filters: pages.map(({ filter }) => filter), datasetVersion, rankOf: filterRank, matches: matchesFilter });
  return {
    datasetVersion, layoutAlgorithmVersion: MASONRY_LAYOUT_VERSION,
    settings: {}, tagRegistry: [], categories, pages, cards, layouts,
  };
};

const srcset = ({ src, width }) => {
  const stem = src.slice(0, -".webp".length);
  return [...IMAGE_WIDTHS.filter((size) => size < width).map((size) => `${stem}-${size}.webp ${size}w`), `${src} ${width}w`].join(", ");
};

// Static cards in noscript like the Advertising page: without JavaScript projects and links are still visible (SEO).
const noscriptCard = (project) => [
  `<figure class="masonry-static-card"><a href="${pageHref("projects", "vi", project)}" data-en-href="${pageHref("projects", "en", project)}"><div class="masonry-static-card__media">`,
  `<img src="${project.cover.src}" srcset="${srcset(project.cover)}" sizes="(max-width: 960px) 50vw, 25vw" width="${project.cover.width}" height="${project.cover.height}" loading="lazy" decoding="async" alt="${escapeHtml(project.cover.altVi)}" data-en-alt="${escapeHtml(project.cover.altEn)}" />`,
  "</div></a></figure>",
].join("");

const line = (text, className) => `<span class="detail-hero-line-mask"><span class="${className}" data-motion-word-source data-en="${escapeHtml(text.en)}">${escapeHtml(text.vi)}</span></span>`;

// The grid part (grid, batch skeleton, tail CTA) is taken as-is from the Advertising page shell, changing only labels, static cards and CTA text:
// one masonry DOM contract for both pages; an attribute added on the Advertising page carries over to the Projects page (masonry-reuse step 9).
const indexSection = (template, projects) => {
  const sections = template.match(/<section\s+class="masonry-section"[\s\S]*?<\/section>\s*<\/section>/g) ?? [];
  if (sections.length !== 1) throw new Error(`advertising frame anchor "index section" matched ${sections.length} times`);
  return [
    [/aria-label="[^"]*"(\s+)data-en-aria-label="[^"]*"/, (_match, space) => `aria-label="Ảnh công trình"${space}data-en-aria-label="Project photos"`, "index label"],
    [/<noscript>[\s\S]*?<\/noscript>/, () => `<noscript>${projects.map(noscriptCard).join("")}</noscript>`, "noscript"],
    [/(<h2 id="cta-title" data-motion-lines>)[\s\S]*?(<\/h2>)/, (_match, open, close) => `${open}${CTA.map((text) => `<span data-motion-line-source data-en="${escapeHtml(text.en)}">${escapeHtml(text.vi)}</span>`).join("")}${close}`, "cta title"],
    [/(\s*)<section\s+class="detail-cta"/, (match, space) => `${space}<p class="projects-empty" data-en="Projects in this category are coming soon."${projects.length ? " hidden" : ""}>Công trình loại này đang cập nhật.</p>${match}`, "cta section"],
  ].reduce((html, [pattern, replacement, name]) => replaceCounted(html, pattern, replacement, name), sections[0]);
};

const main = ({ filter, projects }, artifact, template) => {
  // Every page: the kicker is fixed as p, the slogan is h1; filters differ only in title, description and URL. The filter row follows the DOM contract of
  // catalog-runtime (like the Advertising page, without the viewer and product chips).
  const chipLinks = artifact.pages.map((page) => `<a class="project-filter" href="/vi/projects/${page.vi ? `${page.vi}/` : ""}" data-masonry-filter="${page.filter}" aria-current="${page.filter === (filter.slug ?? "all")}"${page.filter === "all" || page.filter === (filter.slug ?? "all") || artifact.cards.some((card) => card.category === page.filter || card.clusterIds.includes(page.filter)) ? "" : " hidden"} data-en="${escapeHtml(page.filter === "all" ? "All" : artifact.categories.find((entry) => entry.slug === page.filter).titleEn)}">${escapeHtml(page.filter === "all" ? "Tất cả" : artifact.categories.find((entry) => entry.slug === page.filter).titleVi)}</a>`).join("\n              ");
  return `<main id="noi-dung">
        <section class="hero detail-hero detail-index-hero" id="top" data-header-tone="ink">
          <div class="hero-content" data-motion-hero-wrapper-zoom>
            <p class="hero-kicker" data-motion-hero-kicker data-en="${ROOT_KICKER.en}">${ROOT_KICKER.vi}</p>
            <h1 id="page-title" data-motion-words data-motion-hero-title>${line(SLOGAN.first, "detail-title__quiet")}<span class="detail-hero-line-mask"><span class="detail-title__quiet projects-title__accent" data-motion-word-source><span data-en="${SLOGAN.lead.en}">${SLOGAN.lead.vi}</span> <em data-en="${SLOGAN.accent.en}">${SLOGAN.accent.vi}</em></span></span></h1>
          </div>
          <div class="hero-browse">
            <div class="project-filters" role="group" aria-label="Lọc công trình" data-en-aria-label="Filter projects">
              ${chipLinks}
            </div>
          </div>
          <button class="scroll-cue detail-index-hero__scroll" type="button" data-scroll-cue aria-label="Cuộn đến phần tiếp theo" data-en-aria-label="Scroll to the next section">
            <span data-scroll-cue-label data-vi="CUỘN XUỐNG" data-en="SCROLL DOWN">CUỘN XUỐNG</span>
          </button>
        </section>
        ${indexSection(template, projects)}
        <script type="application/json" data-project-artifact>${JSON.stringify(artifact).replace(/</g, "\\u003c")}</script>
      </main>`;
};

// Each shell anchor must match exactly the expected number of times; if the Advertising shell changes, the build stops instead of producing a broken page.
const replaceCounted = (html, pattern, replacement, name, expected = 1) => {
  const count = typeof pattern === "string" ? html.split(pattern).length - 1 : (html.match(new RegExp(pattern.source, `${pattern.flags}g`)) ?? []).length;
  if (count !== expected) throw new Error(`advertising frame anchor "${name}" matched ${count} times`);
  return typeof pattern === "string" ? html.split(pattern).join(typeof replacement === "function" ? replacement() : replacement) : html.replace(new RegExp(pattern.source, `${pattern.flags}g`), replacement);
};

// artifact: buildProjectArtifact, identical on every filter page; the runtime changes the filter in place.
export const renderProjectListPage = (template, listPage, artifact) => {
  const { filter, path: listPath, projects } = listPage;
  const vi = `${PUBLIC_ORIGIN}/vi${listPath}`;
  const en = `${PUBLIC_ORIGIN}/en${listPath}`;
  const head = [
    `<title data-en="${escapeHtml(filter.name.en)} — Trường Thịnh">${escapeHtml(filter.name.vi)} — Trường Thịnh</title>`,
    `<link rel="canonical" href="${vi}" data-en-href="${en}" />`,
    `<link rel="alternate" hreflang="vi" href="${vi}" />`,
    `<link rel="alternate" hreflang="en" href="${en}" />`,
    `<link rel="alternate" hreflang="x-default" href="${vi}" />`,
    ...(projects.length ? [] : ['<meta name="robots" content="noindex" />']),
  ].join("\n    ");
  const description = { vi: `${filter.name.vi} do Trường Thịnh thiết kế, sản xuất và lắp đặt.`, en: `${filter.name.en} designed, built and installed by Trường Thịnh.` };
  return [
    [/<title\b[^>]*>[\s\S]*?<\/title>/, () => head, "title"],
    [/(<meta\s+name="description"\s+content=")[^"]*("\s+data-en-content=")[^"]*"/, (_match, before, middle) => `${before}${escapeHtml(description.vi)}${middle}${escapeHtml(description.en)}"`, "meta description"],
    [/<script>\s*\/\/ Direct entry into detail[\s\S]*?<\/script>\s*/, "", "advertising photo script"],
    ['data-barba-namespace="advertising-products"', 'data-barba-namespace="projects"', "namespace"],
    // Advertising products shell: switch the current navbar and menu item to Projects.
    [' aria-current="page"', "", "menu current page", 2],
    ['<li class="selected">', "<li>", "nav selected"],
    ['<li><a href="/vi/projects/"', '<li class="selected"><a href="/vi/projects/" aria-current="page"', "nav projects"],
    ['class="menu-group__title" href="/vi/projects/"', 'class="menu-group__title" href="/vi/projects/" aria-current="page"', "menu projects"],
    ['href="/vi/advertising-products/" data-language-option="vi"', `href="/vi${listPath}" data-language-option="vi"`, "language vi"],
    ['href="/en/advertising-products/" data-language-option="en"', `href="/en${listPath}" data-language-option="en"`, "language en"],
    [/<main id="noi-dung">[\s\S]*?<\/main>/, () => main(listPage, artifact, template), "main"],
  ].reduce((html, [pattern, replacement, name, expected]) => replaceCounted(html, pattern, replacement, name, expected), template);
};
