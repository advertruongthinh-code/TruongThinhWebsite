// Body steps of a built page after renderBlockPage and expandHero (CMS plan E13): share meta, bilingual text, orphan ties, responsive
// pictures, media preconnect and the shared head script. One function for the build and the editor preview, so the preview HTML is the
// build HTML. Pure module: no Node built-ins; the caller says which files exist and passes the head script.
import { htmlElements } from "./html-elements.mjs";
import { tieOrphans } from "./tie-orphans.mjs";

// Share preview tags (SEO audit 2026-11-15): og:title, og:description, og:url and twitter:card mirror the page's own title,
// description and canonical, carrying the data-en-* twin so localeHtml switches them with the page language.
const enContent = (value) => (value === undefined ? "" : ` data-en-content="${value}"`);
const socialMeta = (html) => {
  const title = /<title\b([^>]*)>([\s\S]*?)<\/title>/.exec(html);
  if (!title || html.includes('property="og:title"')) return html;
  const description = /<meta\s+name="description"\s+content="([^"]*)"(?:\s+data-en-content="([^"]*)")?/.exec(html);
  const canonical = /<link rel="canonical" href="(https:[^"]*)"(?: data-en-href="([^"]*)")?/.exec(html);
  const tags = [
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Trường Thịnh" />',
    `<meta property="og:locale" content="vi_VN"${enContent("en_US")} />`,
    `<meta property="og:title" content="${title[2].trim()}"${enContent(/data-en="([^"]*)"/.exec(title[1])?.[1])} />`,
    ...(description ? [`<meta property="og:description" content="${description[1]}"${enContent(description[2])} />`] : []),
    ...(canonical ? [`<meta property="og:url" content="${canonical[1]}"${enContent(canonical[2])} />`] : []),
    '<meta name="twitter:card" content="summary_large_image" />',
  ];
  return html.replace(title[0], () => `${title[0]}\n    ${tags.join("\n    ")}`);
};

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

export const embedVietnameseText = (html, filePath) => {
  const english = /\bdata-en=(?:"[^"]*"|'[^']*')/i;
  const vietnamese = /\bdata-vi=(?:"[^"]*"|'[^']*')/i;
  const candidates = htmlElements(html).filter(({ tag }) => english.test(tag));
  const insertions = candidates.filter(({ tag, contentEnd }) => !vietnamese.test(tag) && contentEnd !== undefined).map(({ contentStart, contentEnd }) => ({
    at: contentStart - 1,
    value: ` data-vi="${escapeAttribute(decodeHtmlText(html.slice(contentStart, contentEnd)).replace(/\s+/g, " ").trim())}"`,
  }));
  const covered = candidates.filter(({ tag }) => vietnamese.test(tag)).length + insertions.length;
  if (covered !== candidates.length) {
    throw new Error(
      `${filePath}: embedded ${covered} Vietnamese values for ${candidates.length} English text values.`,
    );
  }
  return insertions.reduceRight((output, { at, value }) => `${output.slice(0, at)}${value}${output.slice(at)}`, html);
};

// Wrap content WebP <img> tags in <picture>: a progressive JXL <source> (progressive-loading R1) for browsers that can read JXL,
// <img> stays WebP because Google Images does not index JXL yet. Srcset takes sizes from build-image-variants.mjs. Deferred data-src images
// get data-srcset, which motion.js copies on hydrate. Images with no JXL on disk, images that already declare srcset, and Advertising images
// managed by the runtime (the runtime changes their src, which <source> would override) are left unchanged.
const WEBP_WIDTHS = [240, 480, 960];
const JXL_WIDTHS = [240, 480, 960, 1600, 2048];
// Phone gets WebP only, capped at 960, no 4K original (owner 2026-11-07); this <source> comes first so the phone does not consider JXL.
const PHONE_MEDIA = "(hover: none) and (pointer: coarse)";
// variantExists(url): whether the variant file exists. The build reads the disk or the R2 manifest (cms-plan part 2 K4); the preview reads repo-files.json.
const responsivePictures = (html, variantExists) =>
  html.replace(/<img\b[^>]*>/g, (tag) => {
    const [, prefix, src] = tag.match(/\s(data-)?src="((?:\/assets\/content\/|https:\/\/[a-z0-9.-]+\/v\/[0-9a-f]{32}\/)[^"]+)\.webp"/) || [];
    if (!src || /\s(?:srcset|data-(?:masonry|detail|viewer)-[\w-]+)[\s=/>]/.test(tag) || !variantExists(`${src}.jxl`)) return tag;
    const srcset = `${prefix || ""}srcset`;
    const intrinsic = Number(tag.match(/\swidth="(\d+)"/)?.[1]) || Infinity;
    const set = (format, widths, original = true) => {
      const fit = widths.filter((width) => width < intrinsic && variantExists(`${src}-${width}.${format}`));
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

// A page that shows an R2 image opens the connection to the media origin first thing in <head> (cms-plan part 2 K4).
const mediaPreconnect = (html, mediaOrigin) => (mediaOrigin && html.includes(`${mediaOrigin}/v/`)
  ? html.replace(/<meta charset="[^"]*" \/>|<head\b[^>]*>/i, (first) => `${first}\n    <link rel="preconnect" href="${mediaOrigin}" />`) : html);

// ctx: { file (name for error messages), hasFile(url), mediaOrigin, headInline }.
export const finishPage = (html, ctx) =>
  mediaPreconnect(responsivePictures(tieOrphans(embedVietnameseText(socialMeta(html), ctx.file)), ctx.hasFile), ctx.mediaOrigin)
    .replace("<!-- head-inline -->", () => ctx.headInline);
