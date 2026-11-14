// Helpers shared by the scripts in scripts/site (static-release R1). Node built-ins only: the Docs job imports
// scripts/site without installing node_modules, so sharp is loaded lazily inside validateImage.
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const siteRoot = path.join(projectRoot, "src", "site");
export const PUBLIC_ORIGIN = "https://truongthinhads.vn";
// Content images are WebP only, under assets/content, kebab-case path (media-delivery R5).
export const IMAGE_SRC = /^\/assets\/content\/[a-z0-9/-]+\.webp$/;

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

// Every file under dir, depth first.
export const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
}))).flat();

// Checks one image reference of site data: src shape, VI and EN alt, file under root, width and height equal to the real file.
// Returns the error list (empty when valid); `where` prefixes each message.
export async function validateImage(image, root, where) {
  if (!image || !IMAGE_SRC.test(image.src ?? "")) return [`${where}: src must be /assets/content/<kebab-case>.webp`];
  const errors = ["altVi", "altEn"].filter((field) => typeof image[field] !== "string" || !image[field].trim()).map((field) => `${where}: missing ${field}`);
  const file = path.join(root, image.src);
  if (!existsSync(file)) return [...errors, `${where}: image not found ${image.src}`];
  const { default: sharp } = await import("sharp");
  const { width, height } = await sharp(file).metadata();
  if (image.width !== width || image.height !== height) errors.push(`${where}: width/height must be ${width}x${height}`);
  return errors;
}

// Structured data shared by every page kind (SEO audit 2026-11-15): breadcrumb trail and list pages as CollectionPage + ItemList.
// Items are [name, path] with a /vi/... path; JSON is escaped so it cannot close its script tag.
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
