#!/usr/bin/env node

import { existsSync } from "node:fs";
import { transform } from "esbuild";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CARDS, ADVERTISING_CATEGORIES, ADVERTISING_LEGACY_CATEGORIES, ADVERTISING_PAGES, ADVERTISING_PRODUCT_CHIPS, buildAdvertisingArtifact, compileAdvertisingLayout } from "../../src/site/advertising-products/catalog.mjs";
import { matchesAdvertisingFilter } from "../../src/site/advertising-products/layout-core.mjs";
import "./sync-brand-lockup.mjs";
import { nonPublicSourceAssets } from "./non-public-source-assets.mjs";
import { renderProjectReel, validateProjectReel } from "./project-reel.mjs";
import { ROUTES, localeHtml } from "../tooling/serve-static-parity.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const sourceRoot = path.join(projectRoot, "src", "site");
const outputRoot = path.join(projectRoot, ".site-output");
const PUBLIC_GRID_WIDTHS = [320, 390, 768, 1024, 1440, 1920, 2560];
const PUBLIC_GRID_FILTERS = ["all", ...ADVERTISING_CATEGORIES.map(({ slug }) => slug), ...ADVERTISING_PRODUCT_CHIPS.map(({ filter }) => filter)];
const vendorAssets = [
  ["node_modules/masonry-layout/dist/masonry.pkgd.min.js", "assets/vendor/masonry-4.2.2.min.js"],
  ["node_modules/lazysizes/lazysizes.min.js", "assets/vendor/lazysizes-5.3.2.min.js"],
  ["node_modules/gsap/dist/gsap.min.js", "assets/vendor/gsap-3.15.0.min.js"],
  ["node_modules/gsap/dist/SplitText.min.js", "assets/vendor/SplitText-3.15.0.min.js"],
  ["node_modules/locomotive-scroll/dist/locomotive-scroll.min.js", "assets/vendor/locomotive-scroll-4.1.4.min.js"],
  ["node_modules/locomotive-scroll/dist/locomotive-scroll.min.css", "assets/vendor/locomotive-scroll-4.1.4.min.css"],
  ["node_modules/@barba/core/dist/barba.umd.js", "assets/vendor/barba-2.10.3.umd.js"],
  ["node_modules/hls.js/dist/hls.light.min.js", "assets/vendor/hls.light-1.7.3.min.js"],
  ["node_modules/@fontsource-variable/plus-jakarta-sans/LICENSE", "assets/vendor/plus-jakarta-sans-5.3.0/LICENSE"],
  ...["latin", "latin-ext", "vietnamese"].flatMap((subset) => ["normal", "italic"].map((style) => {
    const file = `plus-jakarta-sans-${subset}-wght-${style}.woff2`;
    return [`node_modules/@fontsource-variable/plus-jakarta-sans/files/${file}`, `assets/vendor/plus-jakarta-sans-5.3.0/${file}`];
  })),
  ["node_modules/swiper/swiper.mjs", "assets/vendor/swiper-14.2.0/swiper.mjs"],
  ["node_modules/swiper/shared/swiper-core.mjs", "assets/vendor/swiper-14.2.0/shared/swiper-core.mjs"],
  ["node_modules/swiper/shared/utils.mjs", "assets/vendor/swiper-14.2.0/shared/utils.mjs"],
  ["node_modules/swiper/shared/classes-to-selector.mjs", "assets/vendor/swiper-14.2.0/shared/classes-to-selector.mjs"],
  ["node_modules/swiper/shared/create-element-if-not-defined.mjs", "assets/vendor/swiper-14.2.0/shared/create-element-if-not-defined.mjs"],
  ["node_modules/swiper/modules/mousewheel.mjs", "assets/vendor/swiper-14.2.0/modules/mousewheel.mjs"],
  ["node_modules/swiper/modules/pagination.mjs", "assets/vendor/swiper-14.2.0/modules/pagination.mjs"],
  ["node_modules/swiper/modules/a11y.mjs", "assets/vendor/swiper-14.2.0/modules/a11y.mjs"],
];
const swiperStyleSources = [
  "node_modules/swiper/swiper.css",
  "node_modules/swiper/modules/pagination.css",
  "node_modules/swiper/modules/a11y.css",
];

if (path.dirname(outputRoot) !== projectRoot || path.dirname(sourceRoot) !== path.join(projectRoot, "src")) {
  throw new Error("Static source or output escaped the project root.");
}

const artifact = buildAdvertisingArtifact();
for (const layoutViewportWidth of PUBLIC_GRID_WIDTHS) {
  for (const filter of PUBLIC_GRID_FILTERS) {
    const layout = compileAdvertisingLayout({
      layoutViewportWidth,
      filter,
      cards: artifact.cards,
      categoryOrder: ADVERTISING_CATEGORIES.map(({ slug }) => slug),
      datasetVersion: artifact.datasetVersion,
      settings: artifact.settings,
    });
    const filterCards = artifact.cards.filter((card) => matchesAdvertisingFilter(card, filter));
    if (filterCards.length > 0 && (layout.diagnostics?.code === "needs-media" || layout.placements.length !== filterCards.length)) {
      throw new Error(`Advertising public grid preflight failed for ${filter} at ${layoutViewportWidth}px: ${layout.diagnostics?.code ?? "incomplete-geometry"}`);
    }
  }
}

// Rail công trình trang chủ: validate dữ liệu và placeholder trước khi xóa output cũ (page-home R8).
const projectReel = JSON.parse(await readFile(path.join(sourceRoot, "content", "project-reel.json"), "utf8"));
await validateProjectReel(projectReel, sourceRoot);
const projectReelCards = renderProjectReel(projectReel);
const homeTemplate = await readFile(path.join(sourceRoot, "index.html"), "utf8");
if (!homeTemplate.includes("<!-- project-reel-cards -->")) throw new Error("index.html lost <!-- project-reel-cards -->");

await rm(outputRoot, { recursive: true, force: true });
await cp(sourceRoot, outputRoot, { recursive: true });
await writeFile(path.join(outputRoot, "index.html"), homeTemplate.replace("<!-- project-reel-cards -->", () => projectReelCards), "utf8");
await Promise.all(vendorAssets.map(async ([source, destination]) => {
  const target = path.join(outputRoot, destination);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(path.join(projectRoot, source), target);
}));
const swiperStyleTarget = path.join(outputRoot, "assets/vendor/swiper-14.2.0/swiper.css");
await mkdir(path.dirname(swiperStyleTarget), { recursive: true });
// Sheet này chèn lúc cuộn tới carousel: `:root` (biến theme) và `@keyframes` (preloader) làm style
// recalc toàn document 65-146ms trên phone giả lập. Site không dùng: màu chấm đặt trong detail.css,
// không có preloader hay web component (`:host`).
const swiperStyle = (await Promise.all(swiperStyleSources.map((source) => readFile(path.join(projectRoot, source), "utf8"))))
  .join("\n")
  .replace(/:(?:root|host)\s*\{[^}]*\}/g, "")
  .replace(/@keyframes swiper-preloader-spin\s*\{(?:[^{}]*\{[^}]*\})*\s*\}/, "");
if (/:root|:host|@keyframes/.test(swiperStyle)) throw new Error("swiper.css still has document-wide rules after strip.");
await writeFile(swiperStyleTarget, swiperStyle, { encoding: "utf8", flush: true });
await Promise.all(nonPublicSourceAssets.map((asset) => rm(path.join(outputRoot, asset), { force: true })));

// Mô tả hai ngôn ngữ và related chỉ detail dùng: tách khỏi artifact để đường tới 8 card đầu nhẹ hơn (static-release R1).
const detailById = {};
// source, sha256, provenance của media chỉ build kiểm (media-contract), runtime không đọc.
const stripBuildMedia = ({ source, sha256, provenance, ...media }) => media;
const gridCards = artifact.cards.map(({ descriptionVi, descriptionEn, related, media, mediaItems, ...card }) => {
  detailById[card.id] = { descriptionVi, descriptionEn, related };
  return { ...card, media: stripBuildMedia(media), mediaItems: mediaItems?.map(stripBuildMedia) };
});
const gridArtifact = { ...artifact, cards: gridCards };
const artifactSource = `// Generated by scripts/site/prepare-static-assets.mjs. Do not edit.\nexport const ADVERTISING_CATALOG_ARTIFACT = Object.freeze(${JSON.stringify(gridArtifact)});\nexport default ADVERTISING_CATALOG_ARTIFACT;\n`;
await writeFile(path.join(outputRoot, "advertising-products", "catalog-artifact.mjs"), artifactSource, { encoding: "utf8", flush: true });
const detailSource = `// Generated by scripts/site/prepare-static-assets.mjs. Do not edit.\nexport const ADVERTISING_CATALOG_DETAIL = Object.freeze(${JSON.stringify(detailById)});\nexport default ADVERTISING_CATALOG_DETAIL;\n`;
await writeFile(path.join(outputRoot, "advertising-products", "catalog-detail.mjs"), detailSource, { encoding: "utf8", flush: true });

// Minify JS của site (vendor đã .min): bớt khoảng 50 KB brotli trên đường tới 8 card đầu (static-release R1).
// `//# allFunctionsCalledOnLoad` là compile hint V8 ở dòng đầu file; esbuild bỏ comment nên gắn lại.
const COMPILE_HINT = "//# allFunctionsCalledOnLoad\n";
const advertisingOutputDir = path.join(outputRoot, "advertising-products");
const minifiedFiles = [
  path.join(outputRoot, "motion.js"),
  path.join(outputRoot, "detail.js"),
  ...(await readdir(advertisingOutputDir)).filter((name) => name.endsWith(".mjs")).map((name) => path.join(advertisingOutputDir, name)),
];
await Promise.all(minifiedFiles.map(async (file) => {
  const source = await readFile(file, "utf8");
  const { code } = await transform(source, { minify: true, target: "esnext" });
  await writeFile(file, (source.startsWith(COMPILE_HINT) ? COMPILE_HINT : "") + code, { encoding: "utf8", flush: true });
}));

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
// Trang tương thích chuyển tới trang cụm mới (phát hành tĩnh R7, taxonomy R4, R5).
const renderCompatibilityPage = (category, cluster) => {
  const titleVi = escapeHtml(category.titleVi);
  const titleEn = escapeHtml(category.titleEn);
  const statementVi = escapeHtml(category.statementVi);
  const statementEn = escapeHtml(category.statementEn);
  const targetVi = `/vi/advertising-products/${cluster.slugVi}/`;
  const targetEn = `/en/advertising-products/${cluster.slugEn}/`;
  return [
    "<!doctype html>",
    '<html lang="vi">',
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <title data-en="' + titleEn + ' | Trường Thịnh">' + titleVi + " | Trường Thịnh</title>",
    '  <meta name="description" content="' + statementVi + '" data-en-content="' + statementEn + '">',
    '  <link rel="canonical" href="' + targetVi + '" data-en-href="' + targetEn + '">',
    "  <noscript>",
    '    <meta http-equiv="refresh" content="0; url=' + targetVi + '" data-en-content="0; url=' + targetEn + '">',
    "  </noscript>",
    "  <script>",
    "  (() => {",
    "    const targets = " + JSON.stringify({ vi: targetVi, en: targetEn }) + ";",
    '    const localeMatch = location.pathname.match(new RegExp("^/(vi|en)/advertising-products/"));',
    "    const fallbackLanguage = String(document.documentElement?.lang || \"\").toLowerCase();",
    '    const locale = localeMatch?.[1] ?? (fallbackLanguage.startsWith("en") ? "en" : "vi");',
    "    const params = new URLSearchParams(location.search);",
    '    for (const key of ["category", "photo", "tag"]) params.delete(key);',
    "    const target = new URL(targets[locale], location.origin);",
    "    target.search = params.toString();",
    "    location.replace(target.href);",
    "  })();",
    "  </script>",
    "</head>",
    "<body>",
    '  <main id="noi-dung" data-advertising-compatibility-route>',
    '    <h1 data-en="' + titleEn + '">' + titleVi + "</h1>",
    '    <p data-en="' + statementEn + '">' + statementVi + "</p>",
    '    <a href="' + targetVi + '" data-en-href="' + targetEn + '" data-en="Open ' + titleEn + '">' + titleVi + "</a>",
    "  </main>",
    "</body>",
    "</html>",
  ].join("\n");
};
for (const category of ADVERTISING_LEGACY_CATEGORIES) {
  const html = renderCompatibilityPage(category, ADVERTISING_CATEGORIES.find(({ legacySlug }) => legacySlug === category.slug));
  const destination = path.join(outputRoot, "advertising-products", category.slug, "index.html");
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, html, { encoding: "utf8", flush: true });
}

// Rail hai tầng sinh từ taxonomy.mjs (taxonomy R3): cụm link tới trang cụm; hàng chip sản phẩm đủ ngưỡng chip (R5) kèm
// số ảnh của mỗi cụm ẩn sẵn, runtime hiện hàng của cụm đang chọn. data-en-href là URL slug EN.
const productLink = (chip) =>
  `<a class="rail-chip" href="/vi/advertising-products/${chip.vi}" data-en-href="/en/advertising-products/${chip.en}" data-advertising-product="${chip.filter}"><span data-en="${escapeHtml(chip.labelEn)}">${escapeHtml(chip.labelVi)}</span><sup>${chip.count}</sup></a>`;
const advertisingIndexPath = path.join(outputRoot, "advertising-products", "index.html");
// Runtime chỉ biết module con sau khi tải xong, artifact chỉ tải sau detail.js: modulepreload gộp ba đợt mạng làm một
// (static-release R1). Danh sách đọc từ import tĩnh của runtime nên thêm, bớt module không phải sửa HTML.
const runtimeSource = await readFile(path.join(sourceRoot, "advertising-products", "catalog-runtime.mjs"), "utf8");
const preloadModules = ["catalog-runtime.mjs", "catalog-artifact.mjs",
  ...new Set([...runtimeSource.matchAll(/from "\.\/([\w-]+\.mjs)"/g)].map(([, name]) => name))];
await Promise.all(preloadModules.map((name) => readFile(path.join(outputRoot, "advertising-products", name))));
const modulePreloads = preloadModules.map((name) => `<link rel="modulepreload" href="/advertising-products/${name}">`).join("");
const advertisingTemplate = (await readFile(advertisingIndexPath, "utf8")).replace(
  '<script defer src="/assets/vendor/', (anchor) => modulePreloads + anchor,
).replace(
  "<!-- advertising-cluster-filters -->",
  ADVERTISING_CATEGORIES.map(({ slug, slugVi, slugEn, titleVi, titleEn }) =>
    `<a class="project-filter" href="/vi/advertising-products/${slugVi}/" data-en-href="/en/advertising-products/${slugEn}/" data-advertising-filter="${slug}" data-en="${escapeHtml(titleEn)}">${escapeHtml(titleVi)}</a>`).join("\n            "),
).replace(
  "<!-- advertising-product-chips -->",
  ADVERTISING_CATEGORIES.map(({ slug, titleVi, titleEn }) =>
    `<div class="rail-chips" role="group" aria-label="${escapeHtml(titleVi)}" data-en-aria-label="${escapeHtml(titleEn)}" data-advertising-chips="${slug}" hidden>`
    + `${ADVERTISING_PRODUCT_CHIPS.filter(({ cluster }) => cluster === slug).map(productLink).join("")}</div>`).join("\n          "),
);
await writeFile(advertisingIndexPath, advertisingTemplate, "utf8");

// Trang cụm, sản phẩm (taxonomy R4): template trang gốc, đổi title, meta, canonical, hreflang, mục rail đang chọn và
// noscript (giới thiệu, link mọi trang). File nguồn ghi vào cả hai thư mục locale; vòng ROUTES bên dưới dịch.
const pageHref = (locale, page) => `/${locale}/advertising-products/${page[locale]}/`;
const pageLinks = ADVERTISING_PAGES.map((page) =>
  `<li><a href="${pageHref("vi", page)}" data-en-href="${pageHref("en", page)}" data-en="${escapeHtml(page.labelEn)}">${escapeHtml(page.labelVi)}</a></li>`).join("");
const renderAdvertisingPage = (page) => advertisingTemplate
  .replace(/<title\b[^>]*>[\s\S]*?<\/title>/, [
    `<title data-en="${escapeHtml(page.titleEn)}">${escapeHtml(page.titleVi)}</title>`,
    `<link rel="canonical" href="${pageHref("vi", page)}" data-en-href="${pageHref("en", page)}" />`,
    `<link rel="alternate" hreflang="vi" href="${pageHref("vi", page)}" />`,
    `<link rel="alternate" hreflang="en" href="${pageHref("en", page)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${pageHref("vi", page)}" />`,
  ].join("\n    "))
  .replace(/(<meta\s+name="description"\s+content=")[^"]*("\s+data-en-content=")[^"]*"/,
    (_match, before, middle) => `${before}${escapeHtml(page.descriptionVi)}${middle}${escapeHtml(page.descriptionEn)}"`)
  // Khẩu hiệu thành p.hero-title giữ hình; kicker thành h1 mang tên cụm, sản phẩm.
  .replace(/<h1 id="page-title"([^>]*)>([\s\S]*?)<\/h1>/, '<p id="page-title" class="hero-title"$1>$2</p>')
  .replace(/<p(\s+class="hero-kicker"[\s\S]*?)data-en="[^"]*"(\s*)>[\s\S]*?<\/p>/,
    (_match, attributes, space) => `<h1${attributes}data-en="${escapeHtml(page.labelEn)}"${space}>${escapeHtml(page.labelVi)}</h1>`)
  .replace('href="/vi/advertising-products/" data-language-option="vi"', `href="${pageHref("vi", page)}" data-language-option="vi"`)
  .replace('href="/en/advertising-products/" data-language-option="en"', `href="${pageHref("en", page)}" data-language-option="en"`)
  .replace(/(data-advertising-filter="all") aria-current="true"/, "$1 aria-current=\"false\"")
  .replace(`data-advertising-filter="${page.cluster}"`, `data-advertising-filter="${page.cluster}" aria-current="true"`)
  .replace(`data-advertising-chips="${page.cluster}" hidden`, `data-advertising-chips="${page.cluster}"`)
  .replaceAll(`data-advertising-product="${page.filter}"`, `data-advertising-product="${page.filter}" aria-current="true"`)
  .replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript><p data-en="${escapeHtml(page.introEn)}">${escapeHtml(page.introVi)}</p><ul>${pageLinks}</ul></noscript>`);
for (const page of ADVERTISING_PAGES) {
  const html = renderAdvertisingPage(page);
  for (const locale of ["vi", "en"]) {
    const destination = path.join(outputRoot, locale, "advertising-products", page[locale], "index.html");
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, html, "utf8");
  }
}

// Trang card (media-seo R1, R2, R4, R6): template trang gốc mang tên, mô tả, mọi media của card trong HTML (bot AI không
// chạy JS), JSON-LD và URL tuyệt đối theo domain thật để Google Hình ảnh, bot AI dẫn về đúng card. Script ngay sau khối
// tĩnh ẩn nó khi có JS vì runtime dựng detail cùng nội dung theo path.
const PUBLIC_ORIGIN = "https://truongthinhads.vn";
const cardHref = (locale, card) => `/${locale}/advertising-products/p/${card.id}/`;
const cardUrl = (locale, card) => `${PUBLIC_ORIGIN}${cardHref(locale, card)}`;
const coverOf = (card) => card.mediaItems.find(({ id }) => id === card.coverMediaId) ?? card.mediaItems[0];
const mediaImage = (item) => (item.kind === "video" ? item.posterSrc : item.src);
const mediaSize = (item) => (item.kind === "video" ? [item.posterWidth, item.posterHeight] : [item.width, item.height]);
const renderCardStatic = (card) => {
  const pages = [...new Set([...card.clusterIds, ...card.productIds])]
    .map((id) => ADVERTISING_PAGES.find(({ filter }) => filter === id)).filter(Boolean);
  return [
    '<article class="advertising-card-static" data-advertising-card-static>',
    `<h1 data-en="${escapeHtml(card.titleEn)}">${escapeHtml(card.titleVi)}</h1>`,
    `<p data-en="${escapeHtml(card.descriptionEn)}">${escapeHtml(card.descriptionVi)}</p>`,
    ...card.mediaItems.map((item) => {
      const [width, height] = mediaSize(item);
      return `<figure><img src="${mediaImage(item)}" width="${width}" height="${height}" loading="lazy" decoding="async" alt="${escapeHtml(item.altVi)}" data-en-alt="${escapeHtml(item.altEn)}" /></figure>`;
    }),
    `<p>${pages.map((page) => `<a href="${pageHref("vi", page)}" data-en-href="${pageHref("en", page)}" data-en="${escapeHtml(page.labelEn)}">${escapeHtml(page.labelVi)}</a>`).join(" ")}</p>`,
    "</article>",
    "<script>document.currentScript.previousElementSibling.hidden = true;</script>",
  ].join("");
};
// Ảnh nào cũng là ImageObject (video lấy poster); creator và creditText đủ cho Image metadata của Google.
// ponytail: chưa có VideoObject vì media video chưa có ngày đăng thật (uploadDate bắt buộc); thêm field vào media contract khi có video thật.
const cardJsonLd = (card) => {
  const url = cardUrl("vi", card);
  const owner = { "@type": "Organization", name: "Trường Thịnh", url: `${PUBLIC_ORIGIN}/` };
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": url, url, primaryImageOfPage: { "@id": `${PUBLIC_ORIGIN}${mediaImage(coverOf(card))}` } },
      ...card.mediaItems.map((item) => ({
        "@type": "ImageObject", "@id": `${PUBLIC_ORIGIN}${mediaImage(item)}`, contentUrl: `${PUBLIC_ORIGIN}${mediaImage(item)}`,
        creator: owner, creditText: "Trường Thịnh",
      })),
    ],
  }).replace(/</g, "\\u003c");
};
const renderCardPage = (card) => advertisingTemplate
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/, [
      `<title data-en="${escapeHtml(card.titleEn)} — Trường Thịnh">${escapeHtml(card.titleVi)} — Trường Thịnh</title>`,
      `<link rel="canonical" href="${cardUrl("vi", card)}" data-en-href="${cardUrl("en", card)}" />`,
      `<link rel="alternate" hreflang="vi" href="${cardUrl("vi", card)}" />`,
      `<link rel="alternate" hreflang="en" href="${cardUrl("en", card)}" />`,
      `<link rel="alternate" hreflang="x-default" href="${cardUrl("vi", card)}" />`,
      `<meta property="og:image" content="${PUBLIC_ORIGIN}${mediaImage(coverOf(card))}" />`,
      `<script type="application/ld+json">${cardJsonLd(card)}</script>`,
    ].join("\n    "))
    .replace(/(<meta\s+name="description"\s+content=")[^"]*("\s+data-en-content=")[^"]*"/,
      (_match, before, middle) => `${before}${escapeHtml(card.descriptionVi)}${middle}${escapeHtml(card.descriptionEn)}"`)
    // Khẩu hiệu thành p.hero-title giữ hình; h1 là tên card trong khối tĩnh.
    .replace(/<h1 id="page-title"([^>]*)>([\s\S]*?)<\/h1>/, '<p id="page-title" class="hero-title"$1>$2</p>')
    .replace('<main id="noi-dung">', () => `<main id="noi-dung">${renderCardStatic(card)}`)
    .replace('href="/vi/advertising-products/" data-language-option="vi"', `href="${cardHref("vi", card)}" data-language-option="vi"`)
    .replace('href="/en/advertising-products/" data-language-option="en"', `href="${cardHref("en", card)}" data-language-option="en"`);
for (const card of ADVERTISING_CARDS) {
  const html = renderCardPage(card);
  for (const locale of ["vi", "en"]) {
    const destination = path.join(outputRoot, locale, "advertising-products", "p", card.id, "index.html");
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, html, "utf8");
  }
}
// Image sitemap (media-seo R5): mỗi trang card một url, mỗi media một image:loc (video dùng poster).
const sitemapUrls = ADVERTISING_CARDS.flatMap((card) => ["vi", "en"].map((locale) =>
  `<url><loc>${cardUrl(locale, card)}</loc>${card.mediaItems.map((item) => `<image:image><image:loc>${PUBLIC_ORIGIN}${mediaImage(item)}</image:loc></image:image>`).join("")}</url>`));
await writeFile(path.join(outputRoot, "sitemap-advertising.xml"), [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ...sitemapUrls,
  "</urlset>",
  "",
].join("\n"), "utf8");

const decodeHtmlText = (value) =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

const escapeAttribute = (value) =>
  value.replace(/[&"<>]/g, (character) =>
    ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[
      character
    ],
  );

const embedVietnameseText = (html, filePath) => {
  const voidElements = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);
  const stack = [];
  const insertions = [];
  let candidates = 0;
  let covered = 0;
  const tagPattern = /<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>/gi;
  let match;
  while ((match = tagPattern.exec(html))) {
    const token = match[0];
    if (token.startsWith("<!--") || token.startsWith("<!")) continue;
    const closing = /^<\//.test(token);
    const name = token.match(/^<\/?([a-z][\w:-]*)/i)?.[1].toLowerCase();
    if (!name) continue;
    if (closing) {
      const index = stack.findLastIndex((entry) => entry.name === name);
      if (index < 0) continue;
      const [entry] = stack.splice(index, 1);
      if (!entry.needsVietnamese) continue;
      const content = html.slice(entry.contentStart, match.index);
      const vietnamese = decodeHtmlText(content).replace(/\s+/g, " ").trim();
      insertions.push({
        at: entry.tagEnd - 1,
        value: ` data-vi="${escapeAttribute(vietnamese)}"`,
      });
      covered += 1;
      continue;
    }
    const hasEnglish = /\bdata-en=(?:"[^"]*"|'[^']*')/i.test(token);
    const hasVietnamese = /\bdata-vi=(?:"[^"]*"|'[^']*')/i.test(token);
    if (hasEnglish) {
      candidates += 1;
      if (hasVietnamese) covered += 1;
    }
    if (!/\/$/.test(token.slice(0, -1).trim()) && !voidElements.has(name)) {
      stack.push({
        contentStart: tagPattern.lastIndex,
        name,
        needsVietnamese: hasEnglish && !hasVietnamese,
        tagEnd: tagPattern.lastIndex,
      });
    }
  }
  if (covered !== candidates) {
    throw new Error(
      `${filePath}: embedded ${covered} Vietnamese values for ${candidates} English text values.`,
    );
  }
  let output = html;
  insertions
    .sort((left, right) => right.at - left.at)
    .forEach(({ at, value }) => {
      output = `${output.slice(0, at)}${value}${output.slice(at)}`;
    });
  return output;
};

// Đổi <img> WebP content sang JXL progressive kèm srcset các cỡ từ build-image-variants.mjs (progressive-loading R1),
// bọc <picture> như trước vì script head và CSS dựa vào khung picture. Ảnh deferred data-src nhận data-srcset,
// motion.js chép khi hydrate. Ảnh không có JXL trên disk, ảnh đã khai báo srcset và ảnh Advertising do runtime
// quản lý giữ nguyên.
const RESPONSIVE_WIDTHS = [240, 480, 960, 1600, 2048];
const responsivePictures = (html) =>
  html.replace(/<img\b[^>]*>/g, (tag) => {
    const [, prefix, src] = tag.match(/\s(data-)?src="(\/assets\/content\/[^"]+)\.webp"/) || [];
    if (!src || /\s(?:srcset|data-advertising-[\w-]+)[\s=/>]/.test(tag) || !existsSync(path.join(outputRoot, `${src}.jxl`))) return tag;
    const jxl = tag.replace(`${src}.webp"`, `${src}.jxl"`);
    const srcset = `${prefix || ""}srcset`;
    const intrinsic = Number(tag.match(/\swidth="(\d+)"/)?.[1]) || Infinity;
    const widths = RESPONSIVE_WIDTHS.filter((width) => width < intrinsic && existsSync(path.join(outputRoot, `${src}-${width}.jxl`)));
    if (!Number.isFinite(intrinsic) || !widths.length) return `<picture>${jxl}</picture>`;
    // Ảnh lazy để browser dùng width đã layout ("auto"); 100vw là fallback cho browser cũ.
    const declared = tag.match(/\ssizes="([^"]+)"/)?.[1];
    const sizes = declared || (/\sloading="lazy"/.test(tag) ? "auto, 100vw" : "100vw");
    const set = [...widths.map((width) => `${src}-${width}.jxl ${width}w`), `${src}.jxl ${intrinsic}w`].join(", ");
    return `<picture>${jxl.replace(/^<img\b/, `<img ${srcset}="${set}"${declared ? "" : ` sizes="${sizes}"`}`)}</picture>`;
  });

// Script <head> chung của mọi trang, một nguồn (progressive-loading R7).
const headInline = `<script>\n${await readFile(path.join(sourceRoot, "head-inline.js"), "utf8")}</script>`;
const localizeHtmlOutput = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return localizeHtmlOutput(target);
      if (!entry.isFile() || path.extname(entry.name) !== ".html") return;
      const html = await readFile(target, "utf8");
      await writeFile(target, responsivePictures(embedVietnameseText(html, target)).replace("<!-- head-inline -->", () => headInline), "utf8");
    }),
  );
};

await localizeHtmlOutput(outputRoot);

for (const [route, source] of ROUTES) {
  const html = await readFile(path.join(outputRoot, source), "utf8");
  const destination = path.join(outputRoot, route, "index.html");
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, localeHtml(html, route.startsWith("/en/") ? "en" : "vi"), "utf8");
}

// not_found_handling = "404-page" lấy 404.html gần nhất theo path: /en/* dùng /en/404.html, path khác dùng bản vi ở root.
const notFoundHtml = await readFile(path.join(outputRoot, "404.html"), "utf8");
await writeFile(path.join(outputRoot, "en", "404.html"), localeHtml(notFoundHtml, "en"), "utf8");
await writeFile(path.join(outputRoot, "404.html"), localeHtml(notFoundHtml, "vi"), "utf8");
// URL cũ dưới trang cụm (sản phẩm tụt ngưỡng trang, taxonomy R5) lấy 404.html của thư mục cụm: chuyển về trang cụm.
for (const cluster of ADVERTISING_PAGES.filter(({ filter, cluster }) => filter === cluster)) {
  const html = renderCompatibilityPage({ titleVi: cluster.labelVi, titleEn: cluster.labelEn, statementVi: cluster.descriptionVi, statementEn: cluster.descriptionEn }, cluster);
  for (const locale of ["vi", "en"]) {
    const destination = path.join(outputRoot, locale, "advertising-products", cluster[locale], "404.html");
    await writeFile(destination, localeHtml(embedVietnameseText(html, destination), locale), "utf8");
  }
}

console.log(`[prepare-site] copied src/site, generated ${ADVERTISING_LEGACY_CATEGORIES.length} advertising compatibility pages, ${ADVERTISING_PAGES.length * 2} cluster and product pages, ${ADVERTISING_CARDS.length * 2} card pages, and embedded bilingual runtime text`);
