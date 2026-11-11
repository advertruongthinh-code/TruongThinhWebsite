#!/usr/bin/env node

import { existsSync } from "node:fs";
import { transform } from "esbuild";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MERGED_CARD_REDIRECTS } from "../../src/site/advertising-products/media-manifest.mjs";
import { ADVERTISING_CARDS, ADVERTISING_CATEGORIES, ADVERTISING_LEGACY_CATEGORIES, ADVERTISING_PAGES, ADVERTISING_PRODUCT_CHIPS, ADVERTISING_ROOT_PAGE, buildAdvertisingArtifact } from "../../src/site/advertising-products/catalog.mjs";
import { MASONRY_LAYOUT_VERSION, filterRank, matchesFilter } from "../../src/site/masonry/layout.mjs";
import { buildLayoutCacheMemo } from "./layout-cache-memo.mjs";
import { LAYOUT_CACHE_PRELOAD_MARKER, LAYOUT_CACHE_ROOT, layoutCachePreload } from "./layout-cache-preload.mjs";
import "./sync-brand-lockup.mjs";
import "./sync-site-menu.mjs";
import { nonPublicSourceAssets } from "./non-public-source-assets.mjs";
import { renderProjectReel, validateProjectReel } from "./project-reel.mjs";
import { KINDS, PROJECT_FILTERS, SECTORS, loadBlockContent, newsListPages, newsListSource, pageSource, renderBlockPage, renderHomeNews, renderNewsListPage } from "./block-pages.mjs";
import { buildProjectArtifact, projectListPages, projectListSource, renderProjectListPage } from "./project-list.mjs";
import { renderBlocks } from "./blocks.mjs";
import { ROUTES, localeHtml } from "../tooling/serve-static-parity.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const sourceRoot = path.join(projectRoot, "src", "site");
const outputRoot = path.join(projectRoot, ".site-output");
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
// Masonry layout cache (advertising-masonry R6): every filter on every width band, 8 to 32 precomputed variants. Its
// self-check replays and verifies every kept layout at both band ends, so a catalog that cannot be laid out stops the build.
const layoutCache = buildLayoutCacheMemo({ cards: artifact.cards, filters: PUBLIC_GRID_FILTERS, datasetVersion: artifact.datasetVersion, rankOf: filterRank, matches: matchesFilter });

// Home page project rail: validate data and placeholders before deleting old output (page-home R8).
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
// This sheet is injected when scrolling to the carousel: `:root` (theme variables) and `@keyframes` (preloader) cause style
// recalc across the whole document of 65-146ms on an emulated phone. The site does not use it: the dot color is set in detail.css,
// and there is no preloader or web component (`:host`).
const swiperStyle = (await Promise.all(swiperStyleSources.map((source) => readFile(path.join(projectRoot, source), "utf8"))))
  .join("\n")
  .replace(/:(?:root|host)\s*\{[^}]*\}/g, "")
  .replace(/@keyframes swiper-preloader-spin\s*\{(?:[^{}]*\{[^}]*\})*\s*\}/, "");
if (/:root|:host|@keyframes/.test(swiperStyle)) throw new Error("swiper.css still has document-wide rules after strip.");
await writeFile(swiperStyleTarget, swiperStyle, { encoding: "utf8", flush: true });
await Promise.all(nonPublicSourceAssets.map((asset) => rm(path.join(outputRoot, asset), { force: true })));

// Descriptions in both languages and related are used only by detail: split out of the artifact so the path to the first 8 cards is lighter (static-release R1).
const detailById = {};
// source, sha256, provenance of media are checked only at build (media-contract), the runtime does not read them.
const stripBuildMedia = ({ source, sha256, provenance, ...media }) => media;
const gridCards = artifact.cards.map(({ descriptionVi, descriptionEn, related, media, mediaItems, ...card }) => {
  detailById[card.id] = { descriptionVi, descriptionEn, related };
  return { ...card, media: stripBuildMedia(media), mediaItems: mediaItems?.map(stripBuildMedia) };
});
const gridArtifact = { ...artifact, cards: gridCards, layoutCacheFilterUrl: `${LAYOUT_CACHE_ROOT}/{band}/{filter}.mjs`, layoutCacheBandUrl: `${LAYOUT_CACHE_ROOT}/{band}.mjs` };
// One file per band (all filters, loaded after the first cards) and one per band and filter (loaded before them).
const layoutCacheModule = (band, filters) => `// Generated by scripts/site/prepare-static-assets.mjs. Do not edit.\nexport default Object.freeze(${JSON.stringify({ version: MASONRY_LAYOUT_VERSION, band, filters })});\n`;
await Promise.all(Object.entries(layoutCache).flatMap(([band, { filters }]) => {
  const bandDir = path.join(outputRoot, LAYOUT_CACHE_ROOT, band.replace(":", "-"));
  return [
    mkdir(path.dirname(bandDir), { recursive: true }).then(() => writeFile(`${bandDir}.mjs`, layoutCacheModule(band, filters), "utf8")),
    ...Object.entries(filters).map(async ([filter, entry]) => {
      const file = path.join(bandDir, `${filter}.mjs`);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, layoutCacheModule(band, { [filter]: entry }), "utf8");
    }),
  ];
}));
const artifactSource = `// Generated by scripts/site/prepare-static-assets.mjs. Do not edit.\nexport const ADVERTISING_CATALOG_ARTIFACT = Object.freeze(${JSON.stringify(gridArtifact)});\nexport default ADVERTISING_CATALOG_ARTIFACT;\n`;
await writeFile(path.join(outputRoot, "advertising-products", "catalog-artifact.mjs"), artifactSource, { encoding: "utf8", flush: true });
const detailSource = `// Generated by scripts/site/prepare-static-assets.mjs. Do not edit.\nexport const ADVERTISING_CATALOG_DETAIL = Object.freeze(${JSON.stringify(detailById)});\nexport default ADVERTISING_CATALOG_DETAIL;\n`;
await writeFile(path.join(outputRoot, "advertising-products", "catalog-detail.mjs"), detailSource, { encoding: "utf8", flush: true });

// Minify the site JS (vendor is already .min): saves about 50 KB brotli on the path to the first 8 cards (static-release R1).
// `//# allFunctionsCalledOnLoad` is a V8 compile hint on the first line of the file; esbuild drops comments so it is reattached.
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
// Compatibility pages redirecting to the new cluster page (static release R7, taxonomy R4, R5).
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
    '  <main id="noi-dung" data-masonry-compatibility-route>',
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

// Two-tier rail generated from taxonomy.mjs (taxonomy R3): clusters link to cluster pages; product chip rows that meet the chip threshold (R5) come with
// the image count of each cluster pre-hidden, and the runtime shows the row of the selected cluster. data-en-href is the EN slug URL.
const productLink = (chip) =>
  `<a class="rail-chip" href="/vi/advertising-products/${chip.vi}" data-en-href="/en/advertising-products/${chip.en}" data-masonry-product="${chip.filter}"><span data-en="${escapeHtml(chip.labelEn)}">${escapeHtml(chip.labelVi)}</span><sup>${chip.count}</sup></a>`;
const advertisingIndexPath = path.join(outputRoot, "advertising-products", "index.html");
// The runtime only learns its child modules after it loads, and the artifact only loads after detail.js: modulepreload
// folds three network rounds into one (static-release R1). The list is read from the runtime's static imports, so adding or
// removing a module needs no HTML change.
const runtimeSource = await readFile(path.join(sourceRoot, "masonry", "runtime.mjs"), "utf8");
const preloadModules = ["/masonry/runtime.mjs", "/advertising-products/catalog-artifact.mjs",
  ...new Set([...runtimeSource.matchAll(/from "(\.{1,2}\/[\w/-]+\.mjs)"/g)].map(([, specifier]) => path.posix.join("/masonry", specifier)))];
await Promise.all(preloadModules.map((href) => readFile(path.join(outputRoot, href))));
const modulePreloads = preloadModules.map((href) => `<link rel="modulepreload" href="${href}">`).join("");
const advertisingTemplate = (await readFile(advertisingIndexPath, "utf8")).replace(
  '<script defer src="/assets/vendor/', (anchor) => modulePreloads + anchor,
).replace(
  "<!-- advertising-cluster-filters -->",
  ADVERTISING_CATEGORIES.map(({ slug, slugVi, slugEn, titleVi, titleEn }) =>
    `<a class="project-filter" href="/vi/advertising-products/${slugVi}/" data-en-href="/en/advertising-products/${slugEn}/" data-masonry-filter="${slug}" data-en="${escapeHtml(titleEn)}">${escapeHtml(titleVi)}</a>`).join("\n            "),
).replace(
  "<!-- advertising-product-chips -->",
  ADVERTISING_CATEGORIES.map(({ slug, titleVi, titleEn }) =>
    `<div class="rail-chips" role="group" aria-label="${escapeHtml(titleVi)}" data-en-aria-label="${escapeHtml(titleEn)}" data-masonry-chips="${slug}" hidden>`
    + `${ADVERTISING_PRODUCT_CHIPS.filter(({ cluster }) => cluster === slug).map(productLink).join("")}</div>`).join("\n          "),
);
// The marker stays in the template: each cluster and product page gets its own filter, the root page gets "all", card pages none.
await writeFile(advertisingIndexPath, advertisingTemplate.replace(LAYOUT_CACHE_PRELOAD_MARKER, () => layoutCachePreload("all")), "utf8");

// Cluster and product pages (taxonomy R4): the root page template, changing title, meta, canonical, hreflang, the selected rail item and
// noscript (intro, links to every page). The source file is written to both locale directories; the ROUTES loop below translates.
const pageHref = (locale, page) => `/${locale}/advertising-products/${page[locale]}/`;
const pageLinks = ADVERTISING_PAGES.map((page) =>
  `<li><a href="${pageHref("vi", page)}" data-en-href="${pageHref("en", page)}" data-en="${escapeHtml(page.labelEn)}">${escapeHtml(page.labelVi)}</a></li>`).join("");
const renderAdvertisingPage = (page) => advertisingTemplate
  .replace(LAYOUT_CACHE_PRELOAD_MARKER, () => layoutCachePreload(page.filter))
  .replace(/<title\b[^>]*>[\s\S]*?<\/title>/, [
    `<title data-en="${escapeHtml(page.titleEn)}">${escapeHtml(page.titleVi)}</title>`,
    `<link rel="canonical" href="${pageHref("vi", page)}" data-en-href="${pageHref("en", page)}" />`,
    `<link rel="alternate" hreflang="vi" href="${pageHref("vi", page)}" />`,
    `<link rel="alternate" hreflang="en" href="${pageHref("en", page)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${pageHref("vi", page)}" />`,
  ].join("\n    "))
  .replace(/(<meta\s+name="description"\s+content=")[^"]*("\s+data-en-content=")[^"]*"/,
    (_match, before, middle) => `${before}${escapeHtml(page.descriptionVi)}${middle}${escapeHtml(page.descriptionEn)}"`)
  // The slogan becomes p.hero-title keeping its look; the kicker becomes h1 but keeps the root page fixed text
  // (owner 2026-11-08: the kicker does not change per cluster, cluster and product names live in the title and rail).
  .replace(/<h1 id="page-title"([^>]*)>([\s\S]*?)<\/h1>/, '<p id="page-title" class="hero-title"$1>$2</p>')
  .replace(/<p(\s+class="hero-kicker"[\s\S]*?)data-en="[^"]*"(\s*)>[\s\S]*?<\/p>/,
    (_match, attributes, space) => `<h1${attributes}data-en="${escapeHtml(ADVERTISING_ROOT_PAGE.kickerEn)}"${space}>${escapeHtml(ADVERTISING_ROOT_PAGE.kickerVi)}</h1>`)
  .replace('href="/vi/advertising-products/" data-language-option="vi"', `href="${pageHref("vi", page)}" data-language-option="vi"`)
  .replace('href="/en/advertising-products/" data-language-option="en"', `href="${pageHref("en", page)}" data-language-option="en"`)
  .replace(/(data-masonry-filter="all") aria-current="true"/, "$1 aria-current=\"false\"")
  .replace(`data-masonry-filter="${page.cluster}"`, `data-masonry-filter="${page.cluster}" aria-current="true"`)
  .replace(`data-masonry-chips="${page.cluster}" hidden`, `data-masonry-chips="${page.cluster}"`)
  .replaceAll(`data-masonry-product="${page.filter}"`, `data-masonry-product="${page.filter}" aria-current="true"`)
  .replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript><p data-en="${escapeHtml(page.introEn)}">${escapeHtml(page.introVi)}</p><ul>${pageLinks}</ul></noscript>`);
for (const page of ADVERTISING_PAGES) {
  const html = renderAdvertisingPage(page);
  for (const locale of ["vi", "en"]) {
    const destination = path.join(outputRoot, locale, "advertising-products", page[locale], "index.html");
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, html, "utf8");
  }
}

// Card page (media-seo R1, R2, R4, R6): the root page template carrying the name, description, all card media in HTML (AI bots do not
// run JS), JSON-LD and absolute URLs on the real domain so Google Images and AI bots lead back to the right card. The script right after the
// static block hides it when JS is on because the runtime builds detail with the same content by path.
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
    '<article class="masonry-card-static" data-masonry-card-static>',
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
// Every image is an ImageObject (video takes its poster); creator and creditText suffice for Google Image metadata.
// ponytail: no VideoObject yet because video media has no real publish date (uploadDate is required); add the field to the media contract when real video exists.
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
    // A direct card page keeps the grid hidden; its cache waits until the grid is needed (runtime preloadMasonry).
    .replace(LAYOUT_CACHE_PRELOAD_MARKER, "")
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
    // The slogan becomes p.hero-title keeping its look; h1 is the card name in the static block.
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
// Project pages and News articles built from blocks (projects R3, news R3): content-contract already checked the data in the fast suite.
const blockContent = loadBlockContent(sourceRoot);
const blockContext = { projects: new Map(blockContent.projects.map((page) => [page.id, page])), news: new Map(blockContent.news.map((page) => [page.id, page])) };
// Project strip at the end of the Residential, Commercial pages (projects R1): projects of the same sector, in projects.json order.
for (const sector of SECTORS) {
  const file = path.join(outputRoot, sector, "index.html");
  const html = await readFile(file, "utf8");
  if (!html.includes("<!-- project-strip -->")) throw new Error(`${sector}/index.html lost <!-- project-strip -->`);
  const projectIds = blockContent.projects.filter((project) => project.sector === sector).map((project) => project.id);
  // The arrow line under the strip leads to the project page filtered by sector (projects R1, R2).
  const more = sector === "residential" ? { vi: "Xem các công trình nhà ở", en: "See our residential projects" } : { vi: "Xem các công trình kinh doanh", en: "See our commercial projects" };
  const cta = { type: "cta-arrow", text: more, hrefVi: `/vi/projects/${PROJECT_FILTERS[sector]}/`, hrefEn: `/en/projects/${PROJECT_FILTERS[sector]}/` };
  const strip = projectIds.length ? renderBlocks({ blocks: [{ type: "project-slider", projectIds }, cta] }, blockContext) : "";
  await writeFile(file, html.replace("<!-- project-strip -->", () => strip), "utf8");
}
// Home News strip under the hero (news R4).
{
  const file = path.join(outputRoot, "index.html");
  const html = await readFile(file, "utf8");
  if (!html.includes("<!-- home-news -->")) throw new Error("index.html lost <!-- home-news -->");
  await writeFile(file, html.replace("<!-- home-news -->", () => renderHomeNews(blockContent.news)), "utf8");
}
const frameTemplates = new Map();
for (const [kind, pages] of Object.entries(blockContent)) {
  for (const page of pages) {
    const frame = KINDS[kind].frame(page);
    if (!frameTemplates.has(frame)) frameTemplates.set(frame, await readFile(path.join(sourceRoot, frame, "index.html"), "utf8"));
    const destination = path.join(outputRoot, pageSource(kind, page));
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, renderBlockPage(kind, frameTemplates.get(frame), page, blockContext), "utf8");
  }
}
if (!frameTemplates.has("about")) frameTemplates.set("about", await readFile(path.join(sourceRoot, "about", "index.html"), "utf8"));
for (const listPage of newsListPages(blockContent.news)) {
  const destination = path.join(outputRoot, newsListSource(listPage));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, renderNewsListPage(frameTemplates.get("about"), listPage), "utf8");
}
// Projects page built on the src shell of the Advertising products page (projects R2).
// The Projects page embeds its layouts in the artifact, so it needs no cache preload.
const advertisingFrame = (await readFile(path.join(sourceRoot, "advertising-products", "index.html"), "utf8")).replace(LAYOUT_CACHE_PRELOAD_MARKER, "");
// Cover image dominant color (1x1 average of the 240 variant) for the grid tail under the CTA.
const { default: sharp } = await import("sharp");
const coverColors = Object.fromEntries(await Promise.all(blockContent.projects.map(async (project) => {
  const { data } = await sharp(path.join(sourceRoot, project.cover.src)).resize(1, 1).raw().toBuffer({ resolveWithObject: true });
  return [project.id, `rgb(${data[0]} ${data[1]} ${data[2]})`];
})));
const projectArtifact = buildProjectArtifact(blockContent.projects, coverColors);
for (const listPage of projectListPages(blockContent.projects)) {
  const destination = path.join(outputRoot, projectListSource(listPage));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, renderProjectListPage(advertisingFrame, listPage, projectArtifact), "utf8");
}
// Image sitemap (media-seo R5): one url per card page, one image:loc per media (video uses its poster).
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

// Wrap content WebP <img> tags in <picture>: a progressive JXL <source> (progressive-loading R1) for browsers that can read JXL,
// <img> stays WebP because Google Images does not index JXL yet. Srcset takes sizes from build-image-variants.mjs. Deferred data-src images
// get data-srcset, which motion.js copies on hydrate. Images with no JXL on disk, images that already declare srcset, and Advertising images
// managed by the runtime (the runtime changes their src, which <source> would override) are left unchanged.
const WEBP_WIDTHS = [240, 480, 960];
const JXL_WIDTHS = [240, 480, 960, 1600, 2048];
// Phone gets WebP only, capped at 960, no 4K original (owner 2026-11-07); this <source> comes first so the phone does not consider JXL.
const PHONE_MEDIA = "(hover: none) and (pointer: coarse)";
const responsivePictures = (html) =>
  html.replace(/<img\b[^>]*>/g, (tag) => {
    const [, prefix, src] = tag.match(/\s(data-)?src="(\/assets\/content\/[^"]+)\.webp"/) || [];
    if (!src || /\s(?:srcset|data-(?:masonry|detail|viewer)-[\w-]+)[\s=/>]/.test(tag) || !existsSync(path.join(outputRoot, `${src}.jxl`))) return tag;
    const srcset = `${prefix || ""}srcset`;
    const intrinsic = Number(tag.match(/\swidth="(\d+)"/)?.[1]) || Infinity;
    const set = (format, widths, original = true) => {
      const fit = widths.filter((width) => width < intrinsic && existsSync(path.join(outputRoot, `${src}-${width}.${format}`)));
      return [...fit.map((width) => `${src}-${width}.${format} ${width}w`), ...(original ? [`${src}.${format} ${intrinsic}w`] : [])].join(", ");
    };
    const phone = (attributes) => `<source media="${PHONE_MEDIA}" ${attributes}>`;
    if (!Number.isFinite(intrinsic)) return `<picture>${phone(`${srcset}="${src}.webp"`)}<source type="image/jxl" ${srcset}="${src}.jxl">${tag}</picture>`;
    // A lazy image lets the browser use the laid-out width ("auto"); 100vw is the fallback for old browsers.
    const declared = tag.match(/\ssizes="([^"]+)"/)?.[1];
    const sizes = declared || (/\sloading="lazy"/.test(tag) ? "auto, 100vw" : "100vw");
    const img = tag.replace(/^<img\b/, `<img ${srcset}="${set("webp", WEBP_WIDTHS)}"${declared ? "" : ` sizes="${sizes}"`}`);
    const phoneSet = set("webp", WEBP_WIDTHS, intrinsic <= WEBP_WIDTHS.at(-1));
    return `<picture>${phone(`${srcset}="${phoneSet}" sizes="${sizes}"`)}<source type="image/jxl" ${srcset}="${set("jxl", JXL_WIDTHS)}" sizes="${sizes}">${img}</picture>`;
  });

// Shared <head> script for every page, a single source (progressive-loading R7).
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

// A card merged into a multi-media card keeps its old p/<id> URL as a redirect to the cover card (media-card R7);
// written before localizing so the ROUTES loop below finds it.
const cardById = new Map(ADVERTISING_CARDS.map((card) => [card.id, card]));
for (const [mergedId, coverId] of Object.entries(MERGED_CARD_REDIRECTS)) {
  const cover = cardById.get(coverId);
  const html = renderCompatibilityPage({ titleVi: cover.titleVi, titleEn: cover.titleEn, statementVi: cover.descriptionVi, statementEn: cover.descriptionEn },
    { slugVi: `p/${coverId}`, slugEn: `p/${coverId}` });
  for (const locale of ["vi", "en"]) {
    const destination = path.join(outputRoot, locale, "advertising-products", "p", mergedId, "index.html");
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, html, "utf8");
  }
}
await localizeHtmlOutput(outputRoot);

for (const [route, source] of ROUTES) {
  const html = await readFile(path.join(outputRoot, source), "utf8");
  const destination = path.join(outputRoot, route, "index.html");
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, localeHtml(html, route.startsWith("/en/") ? "en" : "vi"), "utf8");
}

// not_found_handling = "404-page" takes the nearest 404.html by path: /en/* uses /en/404.html, other paths use the vi version at the root.
const notFoundHtml = await readFile(path.join(outputRoot, "404.html"), "utf8");
await writeFile(path.join(outputRoot, "en", "404.html"), localeHtml(notFoundHtml, "en"), "utf8");
await writeFile(path.join(outputRoot, "404.html"), localeHtml(notFoundHtml, "vi"), "utf8");
// An old URL under a cluster page (product dropped below the page threshold, taxonomy R5) takes the cluster folder 404.html: redirect to the cluster page.
for (const cluster of ADVERTISING_PAGES.filter(({ filter, cluster }) => filter === cluster)) {
  const html = renderCompatibilityPage({ titleVi: cluster.labelVi, titleEn: cluster.labelEn, statementVi: cluster.descriptionVi, statementEn: cluster.descriptionEn }, cluster);
  for (const locale of ["vi", "en"]) {
    const destination = path.join(outputRoot, locale, "advertising-products", cluster[locale], "404.html");
    await writeFile(destination, localeHtml(embedVietnameseText(html, destination), locale), "utf8");
  }
}

console.log(`[prepare-site] copied src/site, generated ${ADVERTISING_LEGACY_CATEGORIES.length} advertising compatibility pages, ${ADVERTISING_PAGES.length * 2} cluster and product pages, ${ADVERTISING_CARDS.length * 2} card pages, and embedded bilingual runtime text`);
