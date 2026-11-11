#!/usr/bin/env node
// Build the CMS admin into .site-output/admin after `prepare:site` (cms-editor R5, R9): copy src/admin and Dockview, write
// pages.json, media-index.json, and previews of the four editable pages (with cms-core.js). Public routes are unchanged.
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ADVERTISING_CARDS, ADVERTISING_PAGES, ADVERTISING_ROOT_PAGE } from "../../src/site/advertising-products/catalog.mjs";
import { localeHtml } from "../tooling/serve-static-parity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const output = path.join(root, ".site-output");
const admin = path.join(output, "admin");
const EDITABLE = [["home", "Trang chủ", "/", "index.html"], ["residential", "Nhà ở", "/residential/"], ["commercial", "Kinh doanh", "/commercial/"], ["about", "Giới thiệu", "/about/"]];
const VARIANT = /-(?:240|480|960|1600|2048)\.[a-z]+$/;

if (!existsSync(path.join(output, "index.html"))) throw new Error("Run `pnpm prepare:site` before building the admin.");
await rm(admin, { recursive: true, force: true });
await cp(path.join(root, "src", "admin"), admin, { recursive: true });
await mkdir(path.join(admin, "vendor"), { recursive: true });
await cp(path.join(root, "node_modules/dockview/dist/dockview.min.js"), path.join(admin, "vendor/dockview.min.js"));
await cp(path.join(root, "node_modules/dockview/dist/styles/dockview.css"), path.join(admin, "vendor/dockview.css"));

// Preview: the built HTML as the static server serves it (localeHtml), with cms-core.js added synchronously at the end of <body>.
const sources = {};
for (const [id, , route, file = `${route.slice(1)}index.html`] of EDITABLE) {
  sources[id] = await readFile(path.join(output, file), "utf8");
  for (const locale of ["vi", "en"]) {
    const html = localeHtml(sources[id], locale).replace(/<\/body>(?![\s\S]*<\/body>)/, `<script src="/admin/cms-core.js" data-cms-boot="${id}"></script>\n</body>`);
    await mkdir(path.join(admin, "preview", locale), { recursive: true });
    await writeFile(path.join(admin, "preview", locale, `${id}.html`), html);
  }
}

// Advertising Products preview (R7): one for the root page, cluster pages, product pages and card pages. The runtime routes by
// path, so a script at the start of <head> rewrites the URL to the real path (?path=) before any page script; cms-core patches the catalog from the draft.
const advertisingSource = await readFile(path.join(output, "advertising-products", "index.html"), "utf8");
for (const locale of ["vi", "en"]) {
  const route = `history.replaceState(null, "", (/^\\/${locale}\\/advertising-products\\//.test(new URLSearchParams(location.search).get("path")) && new URLSearchParams(location.search).get("path")) || "/${locale}/advertising-products/")`;
  const html = localeHtml(advertisingSource, locale)
    .replace(/<head>/, `<head>\n<script>${route};</script>`)
    .replace(/<\/body>(?![\s\S]*<\/body>)/, '<script src="/admin/cms-core.js" data-cms-boot="advertising"></script>\n</body>');
  await writeFile(path.join(admin, "preview", locale, "advertising.html"), html);
}
const cardsPage = (page) => ({
  ...page, cards: true,
  preview: Object.fromEntries(["vi", "en"].map((locale) => [locale, `/admin/preview/${locale}/advertising.html?path=${encodeURIComponent(page[locale])}`])),
});

const pages = [
  ...EDITABLE.map(([id, label, route]) => ({
    id, label, group: "Trang", vi: `/vi${route}`, en: `/en${route}`, editable: true,
    preview: { vi: `/admin/preview/vi/${id}.html`, en: `/admin/preview/en/${id}.html` },
  })),
  { id: "404", label: "Trang 404", group: "Trang", vi: "/404.html", en: "/en/404.html" },
  cardsPage({ id: "advertising-products", label: ADVERTISING_ROOT_PAGE.labelVi, group: "Sản phẩm Quảng cáo", vi: "/vi/advertising-products/", en: "/en/advertising-products/" }),
  ...ADVERTISING_PAGES.map((page) => cardsPage({
    id: `advertising-products/${page.vi}`,
    label: page.labelVi,
    group: page.cluster === page.id ? "Sản phẩm Quảng cáo" : "Trang sản phẩm",
    vi: `/vi/advertising-products/${page.vi}/`,
    en: `/en/advertising-products/${page.en}/`,
  })),
  ...ADVERTISING_CARDS.map((card) => cardsPage({
    id: `p/${card.id}`, label: `${card.titleVi} · ${card.id}`, group: "Trang card", card: card.id,
    vi: `/vi/advertising-products/p/${card.id}/`, en: `/en/advertising-products/p/${card.id}/`,
  })),
];
await writeFile(path.join(admin, "pages.json"), JSON.stringify(pages));

// Alt text available by image path: the Advertising catalog, the project rail, the <img> tags of the four pages.
const alts = new Map();
const remember = (src, altVi, altEn) => src && (altVi || altEn) && !alts.has(src) && alts.set(src, { altVi: altVi || "", altEn: altEn || altVi || "" });
ADVERTISING_CARDS.forEach((card) => [card.media, ...(card.mediaItems || [])].forEach((item) => remember(item?.src, item?.altVi, item?.altEn)));
JSON.parse(await readFile(path.join(root, "src/site/content/project-reel.json"), "utf8")).forEach((item) => remember(item.src, item.altVi, item.altEn));
const attribute = (tag, name) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
Object.values(sources).forEach((html) => html.match(/<img\b[^>]*>/g)?.forEach((tag) => {
  remember(attribute(tag, "data-src") || attribute(tag, "src"), attribute(tag, "alt"), attribute(tag, "data-en-alt"));
}));

const allFiles = (await readdir(path.join(output, "assets", "content"), { recursive: true })).map((file) => file.split(path.sep).join("/"));
const existing = new Set(allFiles);
const files = allFiles.filter((file) => /\.(?:webp|svg|png|jpe?g)$/.test(file) && !VARIANT.test(file)).sort();
const media = [];
for (const file of files) {
  const src = `/assets/content/${file}`;
  // Size and format variants available next to the original file (the Media R6 panel shows whether an image has a lighter version).
  const stem = file.replace(/\.[a-z]+$/, "");
  const variants = [".jxl", ".avif", ...[240, 480, 960, 1600, 2048].flatMap((width) => ["webp", "jxl", "avif"].map((format) => `-${width}.${format}`))]
    .filter((suffix) => existing.has(stem + suffix)).map((suffix) => suffix.replace(/^[-.]/, "").replace(".", " "));
  const { width = 0, height = 0 } = await sharp(path.join(output, "assets", "content", file)).metadata().catch(() => ({}));
  const thumb = src.replace(/\.webp$/, "-240.webp");
  media.push({
    src, width, height, folder: path.posix.dirname(src.replace("/assets/content/", "")),
    thumb: thumb !== src && existsSync(path.join(output, thumb)) ? thumb : src,
    variants,
    ...(alts.get(src) ?? { altVi: "", altEn: "" }),
  });
}
await writeFile(path.join(admin, "media-index.json"), JSON.stringify(media));
console.log(`[build-admin] ${pages.length} pages, ${media.length} media, ${EDITABLE.length * 2 + 2} preview copies`);
