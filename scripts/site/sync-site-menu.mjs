// Nav full menu (site-shell R4) dựng từ một nguồn rồi ghi vào mọi trang nguồn có menu, cùng cách sync-brand-lockup.
// Công trình và nhóm quảng cáo tiêu biểu đọc từ content/menu.json qua menuFeatured (sau này CMS sửa được).
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CARDS, ADVERTISING_CATEGORIES } from "../../src/site/advertising-products/catalog.mjs";
import { PROJECT_TYPES, menuFeatured, pageHref, projectTypeHref } from "./block-pages.mjs";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "site");
const consumers = ["index.html", "residential/index.html", "commercial/index.html", "advertising-products/index.html", "about/index.html", "404.html"];
const navPattern = /( *)<nav\s+class="menu-nav"[\s\S]*?<\/nav>/;
const FEATURED_PRODUCT_GROUPS = 5;
// Nhãn menu dài hơn nhãn rail của taxonomy; nhóm mới chưa có nhãn menu thì dùng nhãn rail.
const PRODUCT_GROUP_LABELS = {
  "displays-booths": { vi: "Kiosk & POSM", en: "Kiosk & POSM" },
  "mobile-retail": { vi: "Xe bán hàng", en: "Mobile retail" },
  signage: { vi: "Bảng hiệu & chữ nổi", en: "Signage & raised letters" },
  "office-signs": { vi: "Biển văn phòng & chỉ dẫn", en: "Office signs & wayfinding" },
  "led-displays": { vi: "LED, màn hình & hộp đèn", en: "LED, displays & light boxes" },
  "printing-decals": { vi: "In nhanh & decal", en: "Quick print & decals" },
};
// Link mạng xã hội chưa có: mục tắt giống footer, có link thì điền vào đây.
const SOCIAL = [
  { label: "Facebook", href: null },
  { label: "TikTok", href: null },
  { label: "YouTube", href: null },
];

const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
// Route VI sang EN chỉ đổi tiền tố thì runtime tự đổi; khác slug mới cần data-en-href.
const hrefAttrs = (vi, en) => `href="${vi}"${en && en !== vi.replace(/^\/vi\//, "/en/") ? ` data-en-href="${en}"` : ""}`;
const option = ({ vi, en, label }) => `<a class="menu-option" ${hrefAttrs(vi, en)} data-en="${escapeHtml(label.en)}">${escapeHtml(label.vi)}</a>`;
const typeOption = (type) => option({ vi: projectTypeHref(type, "vi"), en: projectTypeHref(type, "en"), label: PROJECT_TYPES[type].label });
const typesOf = (sector) => Object.keys(PROJECT_TYPES).filter((type) => PROJECT_TYPES[type].sector === sector);

const group = (number, { title, href, options }) => [
  '          <div class="menu-group">',
  `            <span class="menu-group__number">${String(number).padStart(2, "0")}</span>`,
  `            <a class="menu-group__title" ${hrefAttrs(href.vi, href.en)}>`,
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
      title: { vi: "Nhà ở", en: "Residential" }, href: { vi: "/vi/residential/" },
      options: [option({ vi: "/vi/residential/", label: { vi: "Thiết kế không gian nhà ở", en: "Residential interior design" } }), ...typesOf("residential").map(typeOption)],
    },
    {
      title: { vi: "Kinh doanh", en: "Commercial" }, href: { vi: "/vi/commercial/" },
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
      title: { vi: "Quảng cáo", en: "Advertising" }, href: { vi: "/vi/advertising-products/" },
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
        ["heritage", "Di sản", "Heritage"], ["process", "Cách làm", "How we work"], ["commitment", "Cam kết", "Commitment"], ["contact", "Liên hệ", "Contact"],
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

const [menu, projects] = await Promise.all(["menu.json", "projects.json"].map(async (file) => JSON.parse(await readFile(path.join(siteRoot, "content", file), "utf8"))));
const nav = renderMenuNav(menuFeatured(menu, { projects, categories: ADVERTISING_CATEGORIES, cards: ADVERTISING_CARDS }));
for (const relativePath of consumers) {
  const target = path.join(siteRoot, relativePath);
  const source = await readFile(target, "utf8");
  if (!navPattern.test(source)) throw new Error(`${relativePath} mất <nav class="menu-nav">`);
  // Tiêu đề nhóm của chính trang mang aria-current tĩnh (trang dựng từ khối gỡ nó trong block-pages).
  const section = relativePath.split("/")[1] ? relativePath.split("/")[0] : null;
  const current = section ? nav.replace(`class="menu-group__title" href="/vi/${section}/"`, `class="menu-group__title" href="/vi/${section}/" aria-current="page"`) : nav;
  const next = source.replace(navPattern, (_match, indent) => `${indent}${current}`);
  if (next !== source) await writeFile(target, next, "utf8");
}
console.log(`[site-menu] synchronized ${consumers.length} menu consumers`);
