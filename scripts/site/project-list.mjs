// Trang Công trình (projects R2): dựng trên khung trang Sản phẩm quảng cáo, chạy chính runtime masonry của trang đó
// (catalog-runtime.mjs) với bộ thẻ công trình, không có detail view. Mỗi bộ lọc có trang riêng crawl được; artifact
// nhúng trong trang nên runtime đổi lọc tại chỗ.
import { ADVERTISING_LAYOUT_ALGORITHM_VERSION, fnv1a32, scheduleAdvertisingRank } from "../../src/site/advertising-products/layout-core.mjs";
import { PROJECT_FILTERS, PROJECT_TYPES, PUBLIC_ORIGIN, SECTORS, pageHref } from "./block-pages.mjs";

const SECTOR_LABEL = { residential: { vi: "Nhà ở", en: "Residential" }, commercial: { vi: "Kinh doanh", en: "Commercial" } };
const ROOT_NAME = { vi: "Công trình", en: "Projects" };
// Kicker hero (giữ nguyên ở mọi bộ lọc, owner 2026-11-08) và khẩu hiệu; chỉ chữ nhấn của dòng hai đậm nghiêng (owner 2026-11-08), như em của hero Kinh doanh.
const ROOT_KICKER = { vi: "Công trình tiêu biểu", en: "Our featured projects" };
const SLOGAN = { first: { vi: "Những công trình", en: "Projects" }, lead: { vi: "truyền", en: "that" }, accent: { vi: "cảm hứng", en: "inspire" } };
const CTA = [{ vi: "Không gian tiếp theo", en: "The next space" }, { vi: "dành cho bạn", en: "is yours" }];
const IMAGE_WIDTHS = [240, 480, 960];

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const filterHref = (filter) => `/vi/projects/${filter.slug ? `${filter.slug}/` : ""}`;

// Trang "Tất cả", trang mảng có công trình, trang loại luôn có (loại trống thì noindex). Hàng lọc chỉ hiện bộ lọc
// có công trình, cộng bộ lọc của chính trang đang xem.
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

// Bộ thẻ công trình theo khuôn artifact của runtime masonry quảng cáo (projects R2): mảng là category, loại là cụm
// (clusterIds) để lọc; thẻ chỉ có ảnh như thẻ quảng cáo, mang sẵn link trang chi tiết và màu chủ đạo ảnh bìa (build tính).
export const buildProjectArtifact = (projects, colors = {}) => {
  const categories = [
    ...SECTORS.map((sector) => ({ slug: PROJECT_FILTERS[sector], slugVi: PROJECT_FILTERS[sector], slugEn: PROJECT_FILTERS[sector], titleVi: SECTOR_LABEL[sector].vi, titleEn: SECTOR_LABEL[sector].en })),
    ...Object.entries(PROJECT_TYPES).map(([type, { label }]) => ({ slug: type, slugVi: type, slugEn: type, titleVi: label.vi, titleEn: label.en })),
  ];
  const nextSourceOrder = new Map();
  const cards = scheduleAdvertisingRank(projects.map((project) => {
    const category = PROJECT_FILTERS[project.sector];
    const sourceOrder = nextSourceOrder.get(category) ?? 0;
    nextSourceOrder.set(category, sourceOrder + 1);
    const media = { src: project.cover.src, width: project.cover.width, height: project.cover.height, altVi: project.cover.altVi, altEn: project.cover.altEn };
    return {
      id: project.id, category, sourceOrder, clusterIds: [project.type], titleVi: project.title.vi, titleEn: project.title.en,
      href: { vi: pageHref("projects", "vi", project), en: pageHref("projects", "en", project) },
      ...(colors[project.id] ? { color: colors[project.id] } : {}),
      media, mediaItems: [{ id: project.id, kind: "image", ...media }], coverMediaId: project.id,
    };
  }), categories.map((entry) => entry.slug));
  const pages = projectListPages(projects).map(({ filter }) => ({
    filter: filter.slug ?? "all", vi: filter.slug ?? "", en: filter.slug ?? "", labelVi: filter.name.vi, labelEn: filter.name.en,
    titleVi: `${filter.name.vi} — Trường Thịnh`, titleEn: `${filter.name.en} — Trường Thịnh`, kickerVi: ROOT_KICKER.vi, kickerEn: ROOT_KICKER.en,
  }));
  return {
    datasetVersion: `projects-${fnv1a32(JSON.stringify(cards))}`, layoutAlgorithmVersion: ADVERTISING_LAYOUT_ALGORITHM_VERSION,
    settings: {}, tagRegistry: [], categories, pages, cards,
  };
};

const srcset = ({ src, width }) => {
  const stem = src.slice(0, -".webp".length);
  return [...IMAGE_WIDTHS.filter((size) => size < width).map((size) => `${stem}-${size}.webp ${size}w`), `${src} ${width}w`].join(", ");
};

// Thẻ tĩnh trong noscript như trang quảng cáo: không JavaScript vẫn thấy công trình và link (SEO).
const noscriptCard = (project) => [
  `<figure class="project-tile"><a href="${pageHref("projects", "vi", project)}" data-en-href="${pageHref("projects", "en", project)}"><div class="project-tile__media">`,
  `<img src="${project.cover.src}" srcset="${srcset(project.cover)}" sizes="(max-width: 960px) 50vw, 25vw" width="${project.cover.width}" height="${project.cover.height}" loading="lazy" decoding="async" alt="${escapeHtml(project.cover.altVi)}" data-en-alt="${escapeHtml(project.cover.altEn)}" />`,
  "</div></a></figure>",
].join("");

const line = (text, className) => `<span class="detail-hero-line-mask"><span class="${className}" data-motion-word-source data-en="${escapeHtml(text.en)}">${escapeHtml(text.vi)}</span></span>`;

const main = ({ filter, projects }, artifact, photoView) => {
  // Mọi trang: kicker cố định là p, khẩu hiệu là h1; bộ lọc chỉ khác title, mô tả và URL. Hàng lọc, lưới, batch skeleton,
  // CTA đuôi theo contract DOM của catalog-runtime (giống trang quảng cáo, bỏ viewer và chip sản phẩm).
  const chipLinks = artifact.pages.map((page) => `<a class="project-filter" href="/vi/projects/${page.vi ? `${page.vi}/` : ""}" data-advertising-filter="${page.filter}" aria-current="${page.filter === (filter.slug ?? "all")}"${page.filter === "all" || page.filter === (filter.slug ?? "all") || artifact.cards.some((card) => card.category === page.filter || card.clusterIds.includes(page.filter)) ? "" : " hidden"} data-en="${escapeHtml(page.filter === "all" ? "All" : artifact.categories.find((entry) => entry.slug === page.filter).titleEn)}">${escapeHtml(page.filter === "all" ? "Tất cả" : artifact.categories.find((entry) => entry.slug === page.filter).titleVi)}</a>`).join("\n              ");
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
        <section class="project-index" id="du-an" aria-label="Ảnh công trình" data-en-aria-label="Project photos" data-header-tone="ink">
          <div class="project-grid" data-project-grid>
            <noscript>${projects.map(noscriptCard).join("")}</noscript>
            <div class="advertising-grid__cta-skeleton" data-advertising-cta-skeleton aria-hidden="true"></div>
          </div>
          <p class="projects-empty" data-en="Projects in this category are coming soon."${projects.length ? " hidden" : ""}>Công trình loại này đang cập nhật.</p>
          <section class="detail-cta" data-advertising-grid-cta aria-labelledby="cta-title" data-header-tone="ink">
            <div class="detail-cta__copy">
              <h2 id="cta-title" data-motion-lines>${CTA.map((text) => `<span data-motion-line-source data-en="${escapeHtml(text.en)}">${escapeHtml(text.vi)}</span>`).join("")}</h2>
              <a class="legacy-link" href="https://zalo.me/0949131050" target="_blank" rel="noreferrer" data-motion-fade data-motion-delay="0.3"><span class="portal-subtitle" data-en="Discuss an idea">Trao đổi ý tưởng</span></a>
            </div>
          </section>
        </section>
        ${photoView}
        <script type="application/json" data-project-artifact>${JSON.stringify(artifact).replace(/</g, "\\u003c")}</script>
      </main>`;
};

// Mỗi điểm neo của khung phải khớp đúng số lần; khung quảng cáo đổi thì build dừng thay vì ra trang hỏng.
const replaceCounted = (html, pattern, replacement, name, expected = 1) => {
  const count = typeof pattern === "string" ? html.split(pattern).length - 1 : (html.match(new RegExp(pattern.source, `${pattern.flags}g`)) ?? []).length;
  if (count !== expected) throw new Error(`advertising frame anchor "${name}" matched ${count} times`);
  return typeof pattern === "string" ? html.split(pattern).join(typeof replacement === "function" ? replacement() : replacement) : html.replace(new RegExp(pattern.source, `${pattern.flags}g`), replacement);
};

// artifact: buildProjectArtifact, giống nhau ở mọi trang lọc; runtime đổi lọc tại chỗ.
export const renderProjectListPage = (template, listPage, artifact) => {
  const { filter, path: listPath, projects } = listPage;
  // Khung viewer ẩn của trang quảng cáo giữ nguyên: runtime dùng chung đọc các node của nó dù viewer tắt.
  const photoView = template.match(/<section\s+class="advertising-photo-view"[\s\S]*?(?=\s*<\/main>)/)?.[0];
  if (!photoView) throw new Error('advertising frame anchor "photo view" matched 0 times');
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
    [/<script>\s*\/\/ Vào thẳng detail[\s\S]*?<\/script>\s*/, "", "advertising photo script"],
    ['data-barba-namespace="advertising-products"', 'data-barba-namespace="projects"', "namespace"],
    // Khung Sản phẩm quảng cáo: chuyển mục hiện tại của navbar và menu sang Công trình.
    [' aria-current="page"', "", "menu current page", 2],
    ['<li class="selected">', "<li>", "nav selected"],
    ['<li><a href="/vi/projects/"', '<li class="selected"><a href="/vi/projects/" aria-current="page"', "nav projects"],
    ['class="menu-group__title" href="/vi/projects/"', 'class="menu-group__title" href="/vi/projects/" aria-current="page"', "menu projects"],
    ['href="/vi/advertising-products/" data-language-option="vi"', `href="/vi${listPath}" data-language-option="vi"`, "language vi"],
    ['href="/en/advertising-products/" data-language-option="en"', `href="/en${listPath}" data-language-option="en"`, "language en"],
    [/<main id="noi-dung">[\s\S]*?<\/main>/, () => main(listPage, artifact, photoView), "main"],
  ].reduce((html, [pattern, replacement, name, expected]) => replaceCounted(html, pattern, replacement, name, expected), template);
};
