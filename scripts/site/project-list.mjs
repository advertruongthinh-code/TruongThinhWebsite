// Trang Công trình (projects R2): dựng trên khung trang Sản phẩm quảng cáo (hero chữ hai dòng, hàng lọc, masonry tràn
// bề ngang). Mỗi bộ lọc có trang riêng crawl được; trang nào cũng chứa đủ mọi công trình để src/site/projects-grid.mjs
// đổi lọc tại chỗ, card không khớp lọc mang hidden.
import { PROJECT_FILTERS, PROJECT_TYPES, PUBLIC_ORIGIN, SECTORS, pageHref } from "./block-pages.mjs";

const SECTOR_LABEL = { residential: { vi: "Nhà ở", en: "Residential" }, commercial: { vi: "Kinh doanh", en: "Commercial" } };
const ROOT_NAME = { vi: "Công trình", en: "Projects" };
// Khẩu hiệu hero, như "để thương hiệu / luôn trong tầm mắt" của trang quảng cáo.
const SLOGAN = [{ vi: "thiết kế, sản xuất", en: "Designed, built" }, { vi: "và lắp đặt trọn gói", en: "and installed in full" }];
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

const projectCard = (project, visible) => {
  const type = PROJECT_TYPES[project.type].label;
  return [
    `<figure class="project-card" role="listitem" data-project-card="${escapeHtml(project.id)}" data-project-filters="${PROJECT_FILTERS[project.sector]} ${project.type}" data-ratio="${(project.cover.height / project.cover.width).toFixed(4)}"${visible ? "" : " hidden"}>`,
    `<a href="${pageHref("projects", "vi", project)}" data-en-href="${pageHref("projects", "en", project)}">`,
    `<img src="${project.cover.src}" srcset="${srcset(project.cover)}" sizes="(max-width: 960px) 50vw, 25vw" width="${project.cover.width}" height="${project.cover.height}" alt="${escapeHtml(project.cover.altVi)}" data-en-alt="${escapeHtml(project.cover.altEn)}" loading="lazy" decoding="async" />`,
    `<figcaption class="project-card__label"><span class="project-card__type" data-en="${escapeHtml(type.en)}">${escapeHtml(type.vi)}</span><span class="project-card__name" data-en="${escapeHtml(project.title.en)}">${escapeHtml(project.title.vi)}</span></figcaption>`,
    "</a></figure>",
  ].join("");
};

const line = (text, className) => `<span class="detail-hero-line-mask"><span class="${className}" data-motion-word-source data-en="${escapeHtml(text.en)}">${escapeHtml(text.vi)}</span></span>`;

const main = ({ filter, projects, allProjects, chips }) => {
  // Trang gốc: kicker là p, khẩu hiệu là h1; trang lọc: tên bộ lọc thành h1, khẩu hiệu thành p.hero-title (như trang cụm quảng cáo).
  const [kickerTag, sloganOpen, sloganClose] = filter.slug ? ["h1", '<p id="page-title" class="hero-title"', "</p>"] : ["p", '<h1 id="page-title"', "</h1>"];
  const chipLinks = chips.map((chip) => [
    `<a class="project-filter" href="${filterHref(chip)}" data-project-filter="${chip.slug ?? "all"}"`,
    ` data-kicker-vi="${escapeHtml(chip.name.vi)}" data-kicker-en="${escapeHtml(chip.name.en)}" data-title-vi="${escapeHtml(chip.name.vi)} — Trường Thịnh" data-title-en="${escapeHtml(chip.name.en)} — Trường Thịnh"`,
    ` aria-current="${chip === filter}" data-en="${escapeHtml(chip.label.en)}">${escapeHtml(chip.label.vi)}</a>`,
  ].join("")).join("\n              ");
  return `<main id="noi-dung">
        <section class="hero detail-hero detail-index-hero" id="top" data-header-tone="ink">
          <div class="hero-content" data-motion-hero-wrapper-zoom>
            <${kickerTag} class="hero-kicker" data-project-kicker data-motion-hero-kicker data-en="${escapeHtml(filter.name.en)}">${escapeHtml(filter.name.vi)}</${kickerTag}>
            ${sloganOpen} data-motion-words data-motion-hero-title>${line(SLOGAN[0], "detail-title__quiet")}${line(SLOGAN[1], "detail-title__strong")}${sloganClose}
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
          <div class="project-masonry" data-project-masonry role="list">${allProjects.map((project) => projectCard(project, projects.includes(project))).join("")}</div>
          ${projects.length ? "" : '<p class="project-masonry__empty" data-en="Projects in this category are coming soon.">Công trình loại này đang cập nhật.</p>'}
          <section class="detail-cta" aria-labelledby="cta-title" data-header-tone="ink">
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

export const renderProjectListPage = (template, listPage) => {
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
    [' aria-current="page"', "", "menu current page", 2],
    ['<li class="selected">', "<li>", "nav selected"],
    ['href="/vi/advertising-products/" data-language-option="vi"', `href="/vi${listPath}" data-language-option="vi"`, "language vi"],
    ['href="/en/advertising-products/" data-language-option="en"', `href="/en${listPath}" data-language-option="en"`, "language en"],
    [/<main id="noi-dung">[\s\S]*?<\/main>/, () => main(listPage), "main"],
  ].reduce((html, [pattern, replacement, name, expected]) => replaceCounted(html, pattern, replacement, name, expected), template);
};
