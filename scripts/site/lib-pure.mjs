// Pure helpers of scripts/site (cms R7): no Node built-ins, no packages, so the build, the admin Worker and the browser
// import the same code. File and size checks stay in lib.mjs.
import { dropElements } from "./html-elements.mjs";

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
// en null: the page has VI only (cms-content R2), so no EN alternate.
export const alternateLinks = (vi, en) => en ? [
  `<link rel="canonical" href="${absolute(vi)}" data-en-href="${absolute(en)}" />`,
  `<link rel="alternate" hreflang="vi" href="${absolute(vi)}" />`,
  `<link rel="alternate" hreflang="en" href="${absolute(en)}" />`,
  `<link rel="alternate" hreflang="x-default" href="${absolute(vi)}" />`,
] : [`<link rel="canonical" href="${absolute(vi)}" />`];
// A page title without the brand suffix is the page's keyword name.
export const pageName = ({ titleVi, titleEn }) => ({ vi: titleVi.replace(/ — Trường Thịnh$/, ""), en: titleEn.replace(/ — Trường Thịnh$/, "") });
// The page's keyword name as its h1 (media-seo R6): screen readers and search engines read it; the visible kicker and slogan keep their look.
export const pageNameHeading = ({ vi, en }) => `<h1 class="sr-only" data-en="${escapeHtml(en)}">${escapeHtml(vi)}</h1>`;
// Public URL prefix per locale (owner 2026-11-22): Vietnamese pages live at the root, English under /en; old /vi/ URLs 301 to the root.
export const localePrefix = (locale) => (locale === "en" ? "/en" : "");
// Route of one Advertising card page (build and the editor's staging links).
export const cardHref = (locale, card) => `${localePrefix(locale)}/advertising-products/p/${card.id}/`;
export const routeLocale = (pathname) => (/^\/en(?:\/|$)/.test(pathname) ? "en" : "vi");

function attribute(tag, name) {
  return new RegExp(`(?<![\\w-])${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&") }="([^"]*)"`, "i").exec(tag)?.[1] ?? null;
}

function setAttribute(tag, name, value) {
  const pattern = new RegExp(`(?<![\\w-])${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&") }="[^"]*"`, "i");
  if (pattern.test(tag)) return tag.replace(pattern, () => `${name}="${value}"`);
  return tag.replace(/\s*\/?\s*>$/, (ending) => ` ${name}="${value}"${ending}`);
}

const ATTRIBUTE = String.raw`(?:\s+[\w:-]+(?:="[^"]*")?)`;
const EN_TEXT_ELEMENT = new RegExp(String.raw`<([a-z][\w:-]*)(${ATTRIBUTE}*?\s+data-en="([^"]*)"${ATTRIBUTE}*\s*)>[\s\S]*?<\/\1\s*>`, "gi");
// Switches a built page to one locale (cms-content R2): drops the other locale's only-items, swaps data-en text and attributes, prefixes links.
export function localeHtml(source, locale = "vi") {
  // A post without EN shows only on VI pages (data-vi-only), its EN-only replacement only on EN pages (cms-content R2).
  const other = locale === "en" ? "data-vi-only" : "data-en-only";
  let html = (source.includes(other) ? dropElements(source, other) : source).replace(/<html\b[^>]*>/i, (tag) => setAttribute(setAttribute(tag, "lang", locale), "data-route-locale", locale));
  if (locale === "en") {
    html = html.replace(/<[^>]+>/g, (tag) => {
      let output = tag;
      for (const name of ["alt", "aria-label", "content", "href"]) {
        const english = attribute(output, `data-en-${name}`);
        if (english === null) continue;
        const vietnamese = attribute(output, name);
        if (vietnamese !== null && attribute(output, `data-vi-${name}`) === null) output = setAttribute(output, `data-vi-${name}`, vietnamese);
        output = setAttribute(output, name, english);
      }
      return output;
    });
    // Attributes match as whole name="value" tokens, so text such as "data-en=" inside another attribute value is not read as one.
    html = html.replace(EN_TEXT_ELEMENT, (_match, tag, attributes, english) => `<${tag}${attributes}>${english}</${tag}>`);
  }
  return html.replace(/<a\b[^>]*>/gi, (tag) => {
    if (/\bdata-language-option\s*=/.test(tag)) return tag;
    const href = attribute(tag, "href");
    if (!href?.startsWith("/") || href.startsWith("//")) return tag;
    const path = href.replace(/^\/(?:vi|en)(?=\/|$)/, "");
    return setAttribute(tag, "href", `${localePrefix(locale)}${path || "/"}`);
  });
}
