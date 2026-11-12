// Full-menu nav (site-shell R4) built from one source then written into every source page that has the menu, the same way as sync-brand-lockup.
// Featured projects and advertising groups are read from content/menu.json via menuFeatured (editable by the CMS later).
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ADVERTISING_CARDS, ADVERTISING_CATEGORIES } from "../../src/site/advertising-products/catalog.mjs";
import { PROJECT_TYPES, menuFeatured, pageHref, projectTypeHref } from "./block-pages.mjs";
import { escapeHtml, readJson, siteRoot } from "./lib.mjs";

const consumers = ["index.html", "residential/index.html", "commercial/index.html", "advertising-products/index.html", "about/index.html", "404.html"];
const navPattern = /( *)<nav\s+class="menu-nav"[\s\S]*?<\/nav>/;
const desktopListPattern = /(class="desktop-nav"[\s\S]*?\n)( *)<ul>[\s\S]*?<\/ul>/;
// Navbar (site-shell R4): four main items in the exact order of menu groups 01-04.
const DESKTOP_LINKS = [
  { href: "/vi/residential/", vi: "Không gian Nhà ở", en: "Residential spaces" },
  { href: "/vi/commercial/", vi: "Không gian Kinh doanh", en: "Commercial spaces" },
  { href: "/vi/projects/", vi: "Công trình", en: "Projects" },
  { href: "/vi/advertising-products/", vi: "Sản phẩm Quảng cáo", en: "Advertising products" },
];
const FEATURED_PRODUCT_GROUPS = 5;
// Menu labels are longer than the taxonomy rail labels; a new group without a menu label uses its rail label.
const PRODUCT_GROUP_LABELS = {
  "displays-booths": { vi: "Kiosk & POSM", en: "Kiosk & POSM" },
  "mobile-retail": { vi: "Xe bán hàng", en: "Mobile retail" },
  signage: { vi: "Bảng hiệu & chữ nổi", en: "Signage & raised letters" },
  "office-signs": { vi: "Biển văn phòng & chỉ dẫn", en: "Office signs & wayfinding" },
  "led-displays": { vi: "LED, màn hình & hộp đèn", en: "LED, displays & light boxes" },
  "printing-decals": { vi: "In nhanh & decal", en: "Quick print & decals" },
};
// Social links do not exist yet: the item is off like the footer, fill them in here once they exist.
const SOCIAL = [
  { label: "Facebook", href: null },
  { label: "TikTok", href: null },
  { label: "YouTube", href: null },
];

// A VI-to-EN route that only changes the prefix is swapped by the runtime itself; a different slug needs data-en-href.
const hrefAttrs = (vi, en) => `href="${vi}"${en && en !== vi.replace(/^\/vi\//, "/en/") ? ` data-en-href="${en}"` : ""}`;
const option = ({ vi, en, label }) => `<a class="menu-option" ${hrefAttrs(vi, en)} data-en="${escapeHtml(label.en)}">${escapeHtml(label.vi)}</a>`;
const typeOption = (type) => option({ vi: projectTypeHref(type, "vi"), en: projectTypeHref(type, "en"), label: PROJECT_TYPES[type].label });
const typesOf = (sector) => Object.keys(PROJECT_TYPES).filter((type) => PROJECT_TYPES[type].sector === sector);

const group = (number, { title, aria, href, options }) => [
  '          <div class="menu-group">',
  `            <span class="menu-group__number">${String(number).padStart(2, "0")}</span>`,
  // aria-label keeps the full name when the title is only a short group name.
  `            <a class="menu-group__title" ${hrefAttrs(href.vi, href.en)}${aria ? ` aria-label="${escapeHtml(aria.vi)}" data-en-aria-label="${escapeHtml(aria.en)}"` : ""}>`,
  `              <span data-vi="${escapeHtml(title.vi)}" data-en="${escapeHtml(title.en)}">${escapeHtml(title.vi)}</span>`,
  "            </a>",
  '            <div class="menu-group__links">',
  ...options.map((markup) => `              ${markup}`),
  "            </div>",
  "          </div>",
].join("\n");

export const renderMenuNav = ({ projects, productGroups }) => {
  const groups = [
    {
      title: { vi: "Nhà ở", en: "Residential" }, aria: { vi: "Không gian Nhà ở", en: "Residential spaces" }, href: { vi: "/vi/residential/" },
      options: [option({ vi: "/vi/residential/", label: { vi: "Thiết kế không gian nhà ở", en: "Residential interior design" } }), ...typesOf("residential").map(typeOption)],
    },
    {
      title: { vi: "Kinh doanh", en: "Commercial" }, aria: { vi: "Không gian Kinh doanh", en: "Commercial spaces" }, href: { vi: "/vi/commercial/" },
      options: [option({ vi: "/vi/commercial/", label: { vi: "Thiết kế không gian kinh doanh", en: "Commercial interior design" } }), ...typesOf("commercial").map(typeOption)],
    },
    {
      title: { vi: "Công trình", en: "Projects" }, href: { vi: "/vi/projects/" },
      options: [
        option({ vi: "/vi/projects/", label: { vi: "Các công trình của chúng tôi", en: "Our projects" } }),
        ...projects.map((project) => option({ vi: pageHref("projects", "vi", project), en: pageHref("projects", "en", project), label: project.title })),
      ],
    },
    {
      title: { vi: "Quảng cáo", en: "Advertising" }, aria: { vi: "Sản phẩm Quảng cáo", en: "Advertising products" }, href: { vi: "/vi/advertising-products/" },
      options: [
        option({ vi: "/vi/advertising-products/", label: { vi: "Các sản phẩm của chúng tôi", en: "Our products" } }),
        ...productGroups.slice(0, FEATURED_PRODUCT_GROUPS).map((category) => option({
          vi: `/vi/advertising-products/${category.slugVi}/`, en: `/en/advertising-products/${category.slugEn}/`,
          label: PRODUCT_GROUP_LABELS[category.slug] ?? { vi: category.titleVi, en: category.titleEn },
        })),
      ],
    },
    {
      title: { vi: "Về chúng tôi", en: "About us" }, href: { vi: "/vi/about/" },
      options: [
        ["heritage", "Di sản", "Heritage"], ["process", "Cách làm", "How we work"], ["commitment", "Cam kết", "Commitment"],
      ].map(([topic, vi, en]) => option({ vi: `/vi/about/?topic=${topic}`, label: { vi, en } })).concat(option({ vi: "/vi/news/", label: { vi: "Tin tức", en: "News" } })),
    },
    {
      title: { vi: "Liên hệ", en: "Contact" }, href: { vi: "/vi/about/?topic=contact" },
      options: SOCIAL.map(({ label, href }) => href
        ? `<a class="menu-option" href="${href}" target="_blank" rel="noreferrer">${label}</a>`
        : `<a class="menu-option" role="link" aria-disabled="true" tabindex="-1">${label}</a>`),
    },
  ];
  return [
    '<nav\n          class="menu-nav"\n          aria-label="Menu toàn trang"\n          data-en-aria-label="Full-site menu"\n        >',
    ...groups.map((entry, index) => group(index + 1, entry)),
    "        </nav>",
  ].join("\n");
};

const [menu, projects] = await Promise.all(["menu.json", "projects.json"].map((file) => readJson(path.join(siteRoot, "content", file))));
export const renderDesktopList = (indent) => [
  "<ul>",
  ...DESKTOP_LINKS.map(({ href, vi, en }) => `${indent}  <li><a href="${href}" data-vi="${escapeHtml(vi)}" data-en="${escapeHtml(en)}">${escapeHtml(vi)}</a></li>`),
  `${indent}</ul>`,
].join("\n");

const nav = renderMenuNav(menuFeatured(menu, { projects, categories: ADVERTISING_CATEGORIES, cards: ADVERTISING_CARDS }));
for (const relativePath of consumers) {
  const target = path.join(siteRoot, relativePath);
  const source = await readFile(target, "utf8");
  if (!navPattern.test(source)) throw new Error(`${relativePath} is missing <nav class="menu-nav">`);
  if (!desktopListPattern.test(source)) throw new Error(`${relativePath} is missing the navbar <ul>`);
  // A page's own group title carries a static aria-current; pages built from blocks remove it in block-pages.
  const section = relativePath.split("/")[1] ? relativePath.split("/")[0] : null;
  const current = section ? nav.replace(`class="menu-group__title" href="/vi/${section}/"`, `class="menu-group__title" href="/vi/${section}/" aria-current="page"`) : nav;
  const markCurrent = (list) => section ? list.replace(`<li><a href="/vi/${section}/"`, `<li class="selected"><a href="/vi/${section}/" aria-current="page"`) : list;
  const next = source
    .replace(navPattern, (_match, indent) => `${indent}${current}`)
    .replace(desktopListPattern, (_match, head, indent) => `${head}${indent}${markCurrent(renderDesktopList(indent))}`);
  if (next !== source) await writeFile(target, next, "utf8");
}
console.log(`[site-menu] synchronized ${consumers.length} menu consumers`);
