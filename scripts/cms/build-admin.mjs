#!/usr/bin/env node
// Dựng admin CMS vào .site-output/admin sau `prepare:site` (cms-editor R5, R9): chép src/admin và Dockview, ghi
// pages.json, media-index.json, bản xem trước của bốn trang sửa được (có cms-core.js). Route public không đổi.
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

if (!existsSync(path.join(output, "index.html"))) throw new Error("Chạy `pnpm prepare:site` trước khi dựng admin.");
await rm(admin, { recursive: true, force: true });
await cp(path.join(root, "src", "admin"), admin, { recursive: true });
await mkdir(path.join(admin, "vendor"), { recursive: true });
await cp(path.join(root, "node_modules/dockview/dist/dockview.min.js"), path.join(admin, "vendor/dockview.min.js"));
await cp(path.join(root, "node_modules/dockview/dist/styles/dockview.css"), path.join(admin, "vendor/dockview.css"));

// Bản xem trước: HTML đã build như static server phục vụ (localeHtml), thêm cms-core.js đồng bộ cuối <body>.
const sources = {};
for (const [id, , route, file = `${route.slice(1)}index.html`] of EDITABLE) {
  sources[id] = await readFile(path.join(output, file), "utf8");
  for (const locale of ["vi", "en"]) {
    const html = localeHtml(sources[id], locale).replace(/<\/body>(?![\s\S]*<\/body>)/, `<script src="/admin/cms-core.js" data-cms-boot="${id}"></script>\n</body>`);
    await mkdir(path.join(admin, "preview", locale), { recursive: true });
    await writeFile(path.join(admin, "preview", locale, `${id}.html`), html);
  }
}

// Bản xem trước Sản phẩm Quảng cáo (R7): một bản cho trang gốc, trang cụm, sản phẩm và trang card. Runtime định tuyến theo
// path nên script đầu <head> đổi URL sang path thật (?path=) trước mọi script của trang; cms-core vá catalog theo nháp.
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

// Alt có sẵn theo đường dẫn ảnh: catalog Advertising, rail công trình, thẻ <img> của bốn trang.
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
  // Biến thể cỡ và định dạng có sẵn cạnh file gốc (panel Media R6 hiện để biết ảnh có bản nhẹ hay không).
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
