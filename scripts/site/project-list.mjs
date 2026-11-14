// Projects page (projects R2): built on the Advertising products page shell, running that page's own masonry runtime
// (masonry/runtime.mjs) with the project card set, no detail view. Each filter has its own crawlable page; the artifact
// is embedded in the page so the runtime changes the filter in place.
import { MASONRY_LAYOUT_VERSION, filterRank, fnv1a32, matchesFilter, scheduleRank } from "../../src/site/masonry/layout.mjs";
import { buildLayoutCacheMemo } from "./layout-cache-memo.mjs";
import { PROJECT_FILTERS, PROJECT_TYPES, SECTORS, SECTOR_LABEL, pageHref } from "./block-pages.mjs";
import { PUBLIC_ORIGIN, escapeHtml } from "./lib.mjs";

// Hero kicker (unchanged for every filter, owner 2026-11-08) and slogan; only the accent word of line two is bold italic (owner 2026-11-08), like the em of the Commercial hero.
const ROOT_KICKER = { vi: "Công trình tiêu biểu", en: "Our featured projects" };
const SLOGAN = { first: { vi: "Những công trình", en: "Projects" }, lead: { vi: "truyền", en: "that" }, accent: { vi: "cảm hứng", en: "inspire" } };
const CTA = [{ vi: "Không gian tiếp theo", en: "The next space" }, { vi: "dành cho bạn", en: "is yours" }];
const IMAGE_WIDTHS = [240, 480, 960];

// Filter page search title and meta description (SEO keyword map, owner "ok từ khóa" 2026-11-14): one target keyword per page,
// meta at most 155 characters: type, CNC panel furniture, secondary terms, service area.
const AREA_VI = "Phục vụ Vĩnh Long, Cần Thơ, miền Tây.";
const AREA_EN = "Serving Vinh Long, Can Tho and the Mekong Delta.";
// Second intro sentence shared by every filter page: who, what, where, with what (AI search reads the initial HTML).
const WORKSHOP_VI = "Trường Thịnh thiết kế, sản xuất đồ gỗ tấm MDF, MFC, HDF trên máy CNC tại xưởng và lắp đặt trọn gói ở Vĩnh Long, Cần Thơ, Đồng Tháp và miền Tây.";
const WORKSHOP_EN = "Trường Thịnh designs, CNC-builds panel furniture (MDF, MFC, HDF) in its own workshop and installs it across Vinh Long, Can Tho, Dong Thap and the Mekong Delta.";
export const FILTER_SEO = {
  all: { intro: { vi: `Các công trình nhà ở và kinh doanh Trường Thịnh đã làm: nhà phố, căn hộ, homestay, showroom, quán cafe, văn phòng. ${WORKSHOP_VI}`, en: `Residential and commercial projects by Trường Thịnh: townhouses, apartments, homestays, showrooms, cafes and offices. ${WORKSHOP_EN}` },
    title: { vi: "Công trình thiết kế thi công nội thất trọn gói", en: "Turnkey interior design and fit-out projects" },
    description: { vi: `Công trình nội thất trọn gói của Trường Thịnh: thiết kế, sản xuất đồ gỗ tấm tại xưởng CNC, lắp đặt. ${AREA_VI}`, en: `Turnkey interiors by Trường Thịnh: design, panel furniture made in our CNC workshop, installation. ${AREA_EN}` } },
  "nha-o": { intro: { vi: `Nội thất nhà phố, căn hộ chung cư và homestay: tủ bếp, tủ áo, kệ TV, giường, vách ốp đóng theo kích thước từng phòng. ${WORKSHOP_VI}`, en: `Townhouse, apartment and homestay interiors: kitchens, wardrobes, TV walls, beds and wall panels built to each room's size. ${WORKSHOP_EN}` },
    title: { vi: "Công trình nội thất nhà ở: nhà phố, căn hộ, homestay", en: "Residential interior projects: townhouses, apartments, homestays" },
    description: { vi: `Nội thất nhà phố, căn hộ, homestay do Trường Thịnh thiết kế, sản xuất đồ gỗ tấm tại xưởng CNC và lắp đặt trọn gói. ${AREA_VI}`, en: `Townhouse, apartment and homestay interiors designed, CNC-built and installed by Trường Thịnh. ${AREA_EN}` } },
  "kinh-doanh": { intro: { vi: `Nội thất quán cafe, nhà hàng, showroom, cửa hàng và văn phòng: quầy, kệ trưng bày, vách ốp và bàn làm việc theo thương hiệu. ${WORKSHOP_VI}`, en: `Cafe, restaurant, showroom, store and office interiors: counters, display shelving, wall panels and desks that fit the brand. ${WORKSHOP_EN}` },
    title: { vi: "Thiết kế quán cafe, showroom, văn phòng: công trình thực tế", en: "Cafe, showroom and office design: completed projects" },
    description: { vi: `Quán cafe, showroom, văn phòng do Trường Thịnh thiết kế, sản xuất đồ gỗ tấm tại xưởng CNC và lắp đặt trọn gói. ${AREA_VI}`, en: `Cafes, showrooms and offices designed, CNC-built and installed by Trường Thịnh. ${AREA_EN}` } },
  "nha-pho": { intro: { vi: `Nội thất nhà phố nhiều tầng theo phong cách Indochine, Japandi, hiện đại: tủ bếp, cầu thang, phòng thờ, tủ áo kịch trần. ${WORKSHOP_VI}`, en: `Multi-storey townhouse interiors in Indochine, Japandi and modern styles: kitchens, staircases, altar rooms, full-height wardrobes. ${WORKSHOP_EN}` },
    title: { vi: "Thiết kế, thi công nội thất nhà phố", en: "Townhouse interior design projects" },
    description: { vi: `Nội thất nhà phố do Trường Thịnh thiết kế, sản xuất đồ gỗ tấm tại xưởng CNC, lắp đặt trọn gói: Indochine, Japandi. ${AREA_VI}`, en: `Townhouse interiors designed, CNC-built and installed by Trường Thịnh: Indochine, Japandi. ${AREA_EN}` } },
  "can-ho": { intro: { vi: `Nội thất căn hộ chung cư 2 phòng ngủ và studio: đồ gỗ đa năng, tủ kịch trần, giường gập giúp căn nhỏ rộng hơn. ${WORKSHOP_VI}`, en: `Two-bedroom and studio apartment interiors: multi-function furniture, full-height storage and fold-away beds that make small flats feel larger. ${WORKSHOP_EN}` },
    title: { vi: "Thiết kế, thi công nội thất căn hộ chung cư", en: "Apartment interior design projects" },
    description: { vi: `Nội thất căn hộ do Trường Thịnh thiết kế, sản xuất đồ gỗ tấm tại xưởng CNC, lắp đặt trọn gói: 2 phòng ngủ, studio. ${AREA_VI}`, en: `Apartment interiors designed, CNC-built and installed by Trường Thịnh: two-bedroom, studio. ${AREA_EN}` } },
  "homestay-khach-san": { intro: { vi: `Nội thất homestay nhà vườn, nhà gỗ ven sông và khách sạn mini: quầy lễ tân, đầu giường, phòng nghỉ bền cho khách thuê. ${WORKSHOP_VI}`, en: `Garden and riverside homestay and mini hotel interiors: reception desks, headboards and guest rooms built for heavy use. ${WORKSHOP_EN}` },
    title: { vi: "Thiết kế homestay, nội thất khách sạn", en: "Homestay and boutique hotel design" },
    description: { vi: `Homestay, khách sạn do Trường Thịnh thiết kế, sản xuất đồ gỗ tấm tại xưởng CNC, lắp đặt: nhà vườn, khách sạn mini. ${AREA_VI}`, en: `Homestays and hotels designed, CNC-built and installed by Trường Thịnh: garden houses, mini hotels. ${AREA_EN}` } },
  "showroom-cua-hang": { intro: { vi: `Thiết kế showroom, shop thời trang, cửa hàng mỹ phẩm: kệ trưng bày có đèn, quầy thu ngân, đảo sản phẩm theo luồng khách. ${WORKSHOP_VI}`, en: `Showroom, fashion and cosmetics store design: lit display shelving, cash counters and product islands laid out for customer flow. ${WORKSHOP_EN}` },
    title: { vi: "Thiết kế, thi công showroom, cửa hàng, shop", en: "Showroom and retail store design" },
    description: { vi: `Showroom, cửa hàng do Trường Thịnh thiết kế, sản xuất đồ gỗ tấm tại xưởng CNC, lắp đặt: shop thời trang, mỹ phẩm. ${AREA_VI}`, en: `Showrooms and stores designed, CNC-built and installed by Trường Thịnh: fashion, cosmetics. ${AREA_EN}` } },
  "cafe-nha-hang": { intro: { vi: `Thiết kế quán cafe sân vườn, nhà hàng, tiệm bánh: quầy bar, ghế băng, vách lam gỗ và biển hiệu đồng bộ. ${WORKSHOP_VI}`, en: `Garden cafe, restaurant and bakery design: bar counters, bench seating, timber louvres and matching signage. ${WORKSHOP_EN}` },
    title: { vi: "Thiết kế thi công quán cafe, nhà hàng", en: "Cafe and restaurant design" },
    description: { vi: `Quán cafe, nhà hàng do Trường Thịnh thiết kế, sản xuất đồ gỗ tấm tại xưởng CNC, lắp đặt: sân vườn, tiệm bánh. ${AREA_VI}`, en: `Cafes and restaurants designed, CNC-built and installed by Trường Thịnh: garden cafes, bakeries. ${AREA_EN}` } },
  "van-phong": { intro: { vi: `Nội thất văn phòng công ty, phòng giám đốc, phòng họp: quầy lễ tân, bàn làm việc, vách logo theo nhận diện thương hiệu. ${WORKSHOP_VI}`, en: `Company office, director's office and meeting room interiors: reception desks, workstations and logo walls in the brand identity. ${WORKSHOP_EN}` },
    title: { vi: "Thiết kế, thi công nội thất văn phòng", en: "Office interior design" },
    description: { vi: `Nội thất văn phòng do Trường Thịnh thiết kế, sản xuất đồ gỗ tấm tại xưởng CNC, lắp đặt: phòng giám đốc, phòng họp. ${AREA_VI}`, en: `Offices designed, CNC-built and installed by Trường Thịnh: director's offices, meeting rooms. ${AREA_EN}` } },
};
// Renamed filter slugs (old -> new): the old path stays as a redirect page so shared links keep working.
export const RENAMED_FILTER_SLUGS = { "homestay-hotel": "homestay-khach-san" };

const filterHref = (filter) => `/vi/projects/${filter.slug ? `${filter.slug}/` : ""}`;

// The "Tất cả" page, sector pages that have projects, and type pages always exist (an empty type is noindex). The filter row shows only filters
// that have projects, plus the filter of the page being viewed.
export const projectListPages = (projects) => {
  const filters = [
    { slug: null, label: { vi: "Tất cả", en: "All" }, match: () => true },
    ...SECTORS.map((sector) => ({ slug: PROJECT_FILTERS[sector], label: SECTOR_LABEL[sector], match: (project) => project.sector === sector })),
    ...Object.entries(PROJECT_TYPES).map(([type, { label }]) => ({ slug: type, type, label, match: (project) => project.type === type })),
  ].map((filter) => ({ ...filter, name: FILTER_SEO[filter.slug ?? "all"].title, description: FILTER_SEO[filter.slug ?? "all"].description, intro: FILTER_SEO[filter.slug ?? "all"].intro, projects: projects.filter(filter.match) }));
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

// Static cards in noscript like the Advertising page: without JavaScript projects and links are still visible (SEO); the filter intro
// rides in the same noscript like the Advertising cluster intro, so crawlers and AI search read it without a visible layout change.
const noscriptCard = (project) => [
  `<figure class="masonry-static-card"><a href="${pageHref("projects", "vi", project)}" data-en-href="${pageHref("projects", "en", project)}"><div class="masonry-static-card__media">`,
  `<img src="${project.cover.src}" srcset="${srcset(project.cover)}" sizes="(max-width: 960px) 50vw, 25vw" width="${project.cover.width}" height="${project.cover.height}" loading="lazy" decoding="async" alt="${escapeHtml(project.cover.altVi)}" data-en-alt="${escapeHtml(project.cover.altEn)}" />`,
  "</div></a></figure>",
].join("");

const line = (text, className) => `<span class="detail-hero-line-mask"><span class="${className}" data-motion-word-source data-en="${escapeHtml(text.en)}">${escapeHtml(text.vi)}</span></span>`;

// The grid part (grid, batch skeleton, tail CTA) is taken as-is from the Advertising page shell, changing only labels, static cards and CTA text:
// one masonry DOM contract for both pages; an attribute added on the Advertising page carries over to the Projects page (masonry-reuse step 9).
const indexSection = (template, projects, intro) => {
  const sections = template.match(/<section\s+class="masonry-section"[\s\S]*?<\/section>\s*<\/section>/g) ?? [];
  if (sections.length !== 1) throw new Error(`advertising frame anchor "index section" matched ${sections.length} times`);
  return [
    [/aria-label="[^"]*"(\s+)data-en-aria-label="[^"]*"/, (_match, space) => `aria-label="Ảnh công trình"${space}data-en-aria-label="Project photos"`, "index label"],
    [/<noscript>[\s\S]*?<\/noscript>/, () => `<noscript><p data-en="${escapeHtml(intro.en)}">${escapeHtml(intro.vi)}</p>${projects.map(noscriptCard).join("")}</noscript>`, "noscript"],
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
        ${indexSection(template, projects, filter.intro)}
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
  const { description } = filter;
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

// Old filter path: noindex page that sends the visitor to the renamed filter page.
export const renderRedirectPage = (href) => [
  "<!doctype html>", '<html lang="vi">', "<head>", '  <meta charset="utf-8">', '  <meta name="robots" content="noindex">',
  `  <link rel="canonical" href="${PUBLIC_ORIGIN}${href}">`, `  <meta http-equiv="refresh" content="0; url=${href}">`, "  <title>Trường Thịnh</title>",
  "</head>", `<body><a href="${href}">${href}</a></body>`, "</html>", "",
].join("\n");
