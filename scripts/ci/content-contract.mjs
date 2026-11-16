// Real-content checks (docs/specs/content-independent-tests.md R2): node scripts/ci/content-contract.mjs
// Advertising and the home rail reuse the existing validator; HTML and CSS are checked here. Image variants are
// guarded by scripts/site/build-image-variants.mjs --check, in the same fast suite.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateHeroSlides } from "../site/hero-slides.mjs";
import { validateProjectReel } from "../site/project-reel.mjs";
import { LINE_END_PUNCT, duplicatePageFields, validateBlockPage } from "../site/blocks.mjs";
import { kindFieldErrors, menuErrors } from "../site/block-pages.mjs";

// Skip `$`: paths built in inline scripts (`${name}`) are not files.
const CONTENT_PATH = /\/assets\/content\/[^"')\s?#$`]+/g;

const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

function filesUnder(root, extension) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

// Images are compared by stem so -240/-960 variants and other formats count; assets/ is skipped (variant lists are not consumers).
const imageStem = (src) => src.replace(/\.(webp|avif|jxl|png|jpe?g)$/, "").replace(/-(240|480|960|1600|2048)$/, "");
// News and project images stay on their own pages (owner 2026-11-13: project photos only on project pages): an image of one
// News article or project may appear in that page only (cover, card and blocks), and no other page, data file or style may
// use it. Shared placeholders are exempt until the real photo lands.
function ownImageReuse(siteRoot, kind, pages, label) {
  const errors = [];
  const owner = new Map();
  for (const page of pages) {
    for (const src of new Set(JSON.stringify(page).match(CONTENT_PATH) ?? [])) {
      const stem = imageStem(src);
      if (path.basename(stem).startsWith("placeholder")) continue;
      if (owner.has(stem) && owner.get(stem) !== page.id) errors.push(`content/${kind}.json:${page.id}: ${src}: ${label} image also used by ${label} ${owner.get(stem)}`);
      else owner.set(stem, page.id);
    }
  }
  if (!owner.size) return errors;
  const ownFile = path.join(siteRoot, `content/${kind}.json`);
  const assets = path.join(siteRoot, "assets") + path.sep;
  const files = [".html", ".css", ".json", ".mjs", ".js"].flatMap((extension) => filesUnder(siteRoot, extension))
    .filter((file) => file !== ownFile && !file.startsWith(assets));
  for (const file of files) {
    for (const src of new Set(readFileSync(file, "utf8").match(CONTENT_PATH) ?? [])) {
      if (owner.has(imageStem(src))) errors.push(`${path.relative(siteRoot, file)}: ${src}: ${label} image (${owner.get(imageStem(src))}) reused outside ${label}`);
    }
  }
  return errors;
}

// Returns errors as "<file>: <image path>: <rule>", without stopping at the first one.
export async function checkSiteContent(siteRoot) {
  const { default: sharp } = await import("sharp");
  const errors = [];
  const at = (file) => path.relative(siteRoot, file);
  const sizes = new Map();
  const pixelSize = async (file) => {
    if (!sizes.has(file)) sizes.set(file, await sharp(file).metadata());
    return sizes.get(file);
  };

  for (const file of [...filesUnder(siteRoot, ".html"), ...filesUnder(siteRoot, ".css")]) {
    const text = readFileSync(file, "utf8");
    for (const src of new Set(text.match(CONTENT_PATH) ?? [])) {
      if (!existsSync(path.join(siteRoot, src))) errors.push(`${at(file)}: ${src}: file does not exist`);
    }
    if (!file.endsWith(".html")) continue;
    // Hand-written title lines (hero, CTA masks): same no-punctuation rule as block taglines.
    for (const [, chunk] of text.matchAll(/class="[^"]*line-mask[^"]*"[^>]*>([\s\S]*?)(?=<[^>]*line-mask|<\/h\d>|<\/p>)/g)) {
      const vi = chunk.replace(/<[^>]*>/g, " ").replace(/<[^>]*$/, "").replace(/\s+/g, " ").trim();
      const en = [...chunk.matchAll(/data-en="([^"]*)"/g)].map((match) => match[1]).join(" ").trim();
      for (const line of [vi, en]) if (LINE_END_PUNCT.test(line)) errors.push(`${at(file)}: title line "${line}" must not end with , . or ;`);
    }
    // A heading split into styled parts, or a statement split by <br>: each part is a line, same rule.
    for (const [block, name, inner] of text.matchAll(/<(h[1-6]|p)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      const parts = [...inner.matchAll(/data-en="([^"]*)"[^>]*>([^<]*)</g)];
      if (!(name.startsWith("h") ? parts.length > 1 : inner.includes("<br"))) continue;
      for (const [, en, vi] of parts) for (const line of [en, vi.trim()]) if (LINE_END_PUNCT.test(line)) errors.push(`${at(file)}: title line "${line}" must not end with , . or ;`);
    }
    for (const tag of text.match(/<img\b[^>]*>/g) ?? []) {
      const src = attribute(tag, "src") ?? attribute(tag, "data-src");
      if (!src?.startsWith("/assets/content/")) continue;
      const alt = attribute(tag, "alt");
      if (alt === undefined) errors.push(`${at(file)}: ${src}: missing alt`);
      // SVG logos are proper names, so no EN version; a photo with alt must also have data-en-alt.
      else if (src.endsWith(".webp") && alt.trim() && !attribute(tag, "data-en-alt")?.trim()) errors.push(`${at(file)}: ${src}: VI alt present but data-en-alt missing`);
      const image = path.join(siteRoot, src);
      const width = Number(attribute(tag, "width"));
      const height = Number(attribute(tag, "height"));
      if (!src.endsWith(".webp") || !existsSync(image) || !width || !height) continue;
      const real = await pixelSize(image);
      if (real.width !== width || real.height !== height) {
        errors.push(`${at(file)}: ${src}: declared ${width}x${height}, actual pixels ${real.width}x${real.height}`);
      }
    }
  }

  const heroFile = path.join(siteRoot, "content/hero-slides.json");
  if (existsSync(heroFile)) {
    await validateHeroSlides(JSON.parse(readFileSync(heroFile, "utf8")), siteRoot).catch((error) => errors.push(error.message));
  }
  const reelFile = path.join(siteRoot, "content/project-reel.json");
  if (existsSync(reelFile)) {
    await validateProjectReel(JSON.parse(readFileSync(reelFile, "utf8")), siteRoot).catch((error) => errors.push(error.message));
  }
  // Project and News pages built from blocks (layout-library R4): blocks, VI/EN text, images, linked ids.
  const pages = {};
  for (const kind of ["projects", "news"]) {
    const file = path.join(siteRoot, `content/${kind}.json`);
    pages[kind] = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
  }
  const ctx = { siteRoot, projects: new Map(pages.projects.map((page) => [page.id, page])), news: new Map(pages.news.map((page) => [page.id, page])) };
  for (const [kind, list] of Object.entries(pages)) {
    errors.push(...duplicatePageFields(list, `content/${kind}.json`));
    for (const page of list) errors.push(...kindFieldErrors(kind, page, `content/${kind}.json:${page.id}`));
    for (const page of list) errors.push(...await validateBlockPage(page, { ...ctx, at: `content/${kind}.json:${page.id}` }));
  }
  errors.push(...ownImageReuse(siteRoot, "news", pages.news, "News"), ...ownImageReuse(siteRoot, "projects", pages.projects, "Project"));
  // Site menu featured items: project ids and Advertising group slugs must exist.
  const menuFile = path.join(siteRoot, "content/menu.json");
  if (existsSync(menuFile)) {
    const { ADVERTISING_CATEGORIES } = await import("../../src/site/advertising-products/catalog.mjs");
    errors.push(...menuErrors(JSON.parse(readFileSync(menuFile, "utf8")), { projects: pages.projects, categories: ADVERTISING_CATEGORIES }, "content/menu.json"));
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Importing the catalog runs the Advertising validator (media-contract.mjs): alt, taxonomy, size, ratio.
  await import("../../src/site/advertising-products/catalog.mjs");
  const errors = await checkSiteContent(path.resolve("src/site"));
  if (errors.length) {
    console.error(`content-contract FAIL: ${errors.length} errors\n${errors.join("\n")}`);
    process.exit(1);
  }
  console.log("content-contract PASS");
}
