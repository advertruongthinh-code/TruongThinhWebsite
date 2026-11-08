// Trang Công trình (projects R2): dựng trên khung trang Sản phẩm quảng cáo (hero chữ hai dòng, hàng lọc, masonry tràn
// bề ngang). Mỗi bộ lọc có trang riêng crawl được; trang nào cũng chứa đủ mọi công trình để src/site/projects-grid.mjs
// đổi lọc tại chỗ, card không khớp lọc mang hidden.
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
    filter, path: filter.slug ? `/projects/${filter.slug}/` : "/projects/", projects: filter.projects, allProjects: projects,
    chips: filters.filter((chip) => chip.projects.length || chip === filter),
  }));
};
export const projectListSource = (listPage) => `${listPage.path.slice(1)}index.html`;
export const projectListRoutes = (projects) => projectListPages(projects).flatMap((listPage) => ["vi", "en"].map((locale) => [`/${locale}${listPage.path}`, projectListSource(listPage)]));

const srcset = ({ src, width }) => {
  const stem = src.slice(0, -".webp".length);
  return [...IMAGE_WIDTHS.filter((size) => size < width).map((size) => `${stem}-${size}.webp ${size}w`), `${src} ${width}w`].join(", ");
};

const projectCard = (project, visible, color) => {
  const type = PROJECT_TYPES[project.type].label;
  return [
    `<figure class="project-masonry__card" role="listitem" data-project-card="${escapeHtml(project.id)}" data-project-filters="${PROJECT_FILTERS[project.sector]} ${project.type}" data-ratio="${(project.cover.height / project.cover.width).toFixed(4)}"${color ? ` data-color="${color}"` : ""}${visible ? "" : " hidden"}>`,
    `<a href="${pageHref("projects", "vi", project)}" data-en-href="${pageHref("projects", "en", project)}">`,
    `<img src="${project.cover.src}" srcset="${srcset(project.cover)}" sizes="(max-width: 960px) 50vw, 25vw" width="${project.cover.width}" height="${project.cover.height}" alt="${escapeHtml(project.cover.altVi)}" data-en-alt="${escapeHtml(project.cover.altEn)}" loading="lazy" decoding="async" />`,
    `<figcaption class="project-masonry__card-label"><span class="project-masonry__card-type" data-en="${escapeHtml(type.en)}">${escapeHtml(type.vi)}</span><span class="project-masonry__card-name" data-en="${escapeHtml(project.title.en)}">${escapeHtml(project.title.vi)}</span></figcaption>`,
    "</a></figure>",
  ].join("");
};

const line = (text, className) => `<span class="detail-hero-line-mask"><span class="${className}" data-motion-word-source data-en="${escapeHtml(text.en)}">${escapeHtml(text.vi)}</span></span>`;

const main = ({ filter, projects, allProjects, chips }, colors) => {
  // Mọi trang: kicker cố định là p, khẩu hiệu là h1; bộ lọc chỉ khác title, mô tả và URL.
  const chipLinks = chips.map((chip) => [
    `<a class="project-filter" href="${filterHref(chip)}" data-project-filter="${chip.slug ?? "all"}"`,
    ` data-title-vi="${escapeHtml(chip.name.vi)} — Trường Thịnh" data-title-en="${escapeHtml(chip.name.en)} — Trường Thịnh"`,
    ` aria-current="${chip === filter}" data-en="${escapeHtml(chip.label.en)}">${escapeHtml(chip.label.vi)}</a>`,
  ].join("")).join("\n              ");
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
        <section class="project-index projects-index" id="du-an" aria-label="Ảnh công trình" data-en-aria-label="Project photos" data-header-tone="ink">
          <div class="project-masonry" data-project-masonry role="list">${allProjects.map((project) => projectCard(project, projects.includes(project), colors[project.id])).join("")}</div>
          <div class="project-masonry__ghosts" data-project-ghosts aria-hidden="true"></div>
          <p class="project-masonry__empty" data-project-empty data-en="Projects in this category are coming soon."${projects.length ? " hidden" : ""}>Công trình loại này đang cập nhật.</p>
          <section class="detail-cta projects-cta" data-advertising-grid-cta data-project-cta aria-labelledby="cta-title" data-header-tone="ink">
            <div class="detail-cta__copy">
              <h2 id="cta-title" data-motion-lines>${CTA.map((text) => `<span data-motion-line-source data-en="${escapeHtml(text.en)}">${escapeHtml(text.vi)}</span>`).join("")}</h2>
              <a class="legacy-link" href="https://zalo.me/0949131050" target="_blank" rel="noreferrer" data-motion-fade data-motion-delay="0.3"><span class="portal-subtitle" data-en="Discuss an idea">Trao đổi ý tưởng</span></a>
            </div>
          </section>
        </section>
      </main>`;
};

// Mỗi điểm neo của khung phải khớp đúng số lần; khung quảng cáo đổi thì build dừng thay vì ra trang hỏng.
const replaceCounted = (html, pattern, replacement, name, expected = 1) => {
  const count = typeof pattern === "string" ? html.split(pattern).length - 1 : (html.match(new RegExp(pattern.source, `${pattern.flags}g`)) ?? []).length;
  if (count !== expected) throw new Error(`advertising frame anchor "${name}" matched ${count} times`);
  return typeof pattern === "string" ? html.split(pattern).join(typeof replacement === "function" ? replacement() : replacement) : html.replace(new RegExp(pattern.source, `${pattern.flags}g`), replacement);
};

// colors: màu chủ đạo ảnh bìa theo id công trình (build tính bằng sharp), tô đuôi lưới dưới CTA.
export const renderProjectListPage = (template, listPage, colors = {}) => {
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
    [/<script>\s*\/\/ Vào thẳng detail[\s\S]*?<\/script>\s*/, "", "advertising photo script"],
    ['data-barba-namespace="advertising-products"', 'data-barba-namespace="projects"', "namespace"],
    // Khung Sản phẩm quảng cáo: chuyển mục hiện tại của navbar và menu sang Công trình.
    [' aria-current="page"', "", "menu current page", 2],
    ['<li class="selected">', "<li>", "nav selected"],
    ['<li><a href="/vi/projects/"', '<li class="selected"><a href="/vi/projects/" aria-current="page"', "nav projects"],
    ['class="menu-group__title" href="/vi/projects/"', 'class="menu-group__title" href="/vi/projects/" aria-current="page"', "menu projects"],
    ['href="/vi/advertising-products/" data-language-option="vi"', `href="/vi${listPath}" data-language-option="vi"`, "language vi"],
    ['href="/en/advertising-products/" data-language-option="en"', `href="/en${listPath}" data-language-option="en"`, "language en"],
    [/<main id="noi-dung">[\s\S]*?<\/main>/, () => main(listPage, colors), "main"],
  ].reduce((html, [pattern, replacement, name, expected]) => replaceCounted(html, pattern, replacement, name, expected), template);
};
