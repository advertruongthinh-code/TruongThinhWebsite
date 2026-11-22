// Pure helpers of scripts/site (cms R7): no Node built-ins, no packages, so the build, the admin Worker and the browser
// import the same code. File and size checks stay in lib.mjs.
export const PUBLIC_ORIGIN = "https://truongthinhads.vn";
// Content images are WebP only, under assets/content, kebab-case path (media-delivery R5).
export const IMAGE_SRC = /^\/assets\/content\/[a-z0-9/-]+\.webp$/;

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

// Field checks of one image reference: src shape, then VI and EN alt. isSrc lets the Worker also accept variant src (P1).
// A bad src returns only that error, the alt checks run only on a good src.
export function imageFieldErrors(image, where, isSrc = (src) => IMAGE_SRC.test(src)) {
  if (!image || !isSrc(image.src ?? "")) return [`${where}: src must be /assets/content/<kebab-case>.webp`];
  return ["altVi", "altEn"].filter((field) => typeof image[field] !== "string" || !image[field].trim()).map((field) => `${where}: missing ${field}`);
}

// Structured data shared by every page kind (SEO audit 2026-11-15): breadcrumb trail and list pages as CollectionPage + ItemList.
// Items are [name, path] with a site path; JSON is escaped so it cannot close its script tag.
const absolute = (pathname) => `${PUBLIC_ORIGIN}${pathname}`;
export const breadcrumbLd = (items) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, pathname], index) => ({ "@type": "ListItem", position: index + 1, name, item: absolute(pathname) })),
});
export const ldScript = (graph) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>`;
export const collectionLd = ({ path: pathname, name, description, items, crumbs }) => ldScript([
  { "@type": "CollectionPage", "@id": absolute(pathname), url: absolute(pathname), name, description,
    mainEntity: { "@type": "ItemList", itemListElement: items.map(([itemName, itemPath], index) => ({ "@type": "ListItem", position: index + 1, name: itemName, url: absolute(itemPath) })) } },
  breadcrumbLd(crumbs),
]);
// Absolute canonical and hreflang links for a page whose VI and EN paths are given.
export const alternateLinks = (vi, en) => [
  `<link rel="canonical" href="${absolute(vi)}" data-en-href="${absolute(en)}" />`,
  `<link rel="alternate" hreflang="vi" href="${absolute(vi)}" />`,
  `<link rel="alternate" hreflang="en" href="${absolute(en)}" />`,
  `<link rel="alternate" hreflang="x-default" href="${absolute(vi)}" />`,
];
// A page title without the brand suffix is the page's keyword name.
export const pageName = ({ titleVi, titleEn }) => ({ vi: titleVi.replace(/ — Trường Thịnh$/, ""), en: titleEn.replace(/ — Trường Thịnh$/, "") });
// The page's keyword name as its h1 (media-seo R6): screen readers and search engines read it; the visible kicker and slogan keep their look.
export const pageNameHeading = ({ vi, en }) => `<h1 class="sr-only" data-en="${escapeHtml(en)}">${escapeHtml(vi)}</h1>`;
// Public URL prefix per locale (owner 2026-11-22): Vietnamese pages live at the root, English under /en; old /vi/ URLs 301 to the root.
export const localePrefix = (locale) => (locale === "en" ? "/en" : "");
export const routeLocale = (pathname) => (/^\/en(?:\/|$)/.test(pathname) ? "en" : "vi");
