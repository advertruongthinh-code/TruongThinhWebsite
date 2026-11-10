// Real-content checks (docs/specs/content-independent-tests.md R2): node scripts/ci/content-contract.mjs
// Advertising and the home rail reuse the existing validator; HTML and CSS are checked here. Image variants are
// guarded by scripts/site/build-image-variants.mjs --check, in the same fast suite.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateProjectReel } from "../site/project-reel.mjs";
import { duplicatePageFields, validateBlockPage } from "../site/blocks.mjs";
import { kindFieldErrors, menuErrors } from "../site/block-pages.mjs";

// Skip `$`: paths built in inline scripts (`${name}`) are not files.
const CONTENT_PATH = /\/assets\/content\/[^"')\s?#$`]+/g;

const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

function filesUnder(root, extension) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(entry.parentPath, entry.name));
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
    // Hero slideshow (page-home R3, detail-pages R5): the head script's `slides` array picks the first image by index,
    // so it must match figure.hero-slide in name, width and order; data-slide runs from 0 without gaps.
    const slidesArray = text.match(/const slides = (\[[\s\S]*?\]);/)?.[1];
    if (slidesArray) {
      const slides = [...slidesArray.matchAll(/\["([^"]+)",\s*(\d+)\]/g)].map(([, name, width]) => `${name} ${width}`);
      const figures = [...text.matchAll(/<figure class="hero-slide(?:\s[^"]*)?" data-slide="(\d+)">\s*(<img\b[^>]*>)/g)];
      figures.forEach(([, index], position) => {
        if (Number(index) !== position) errors.push(`${at(file)}: hero-slide ${position} has data-slide="${index}"`);
      });
      const markup = figures.map(([, , tag]) => {
        const src = attribute(tag, "src") ?? attribute(tag, "data-src") ?? "";
        return `${path.basename(src, ".webp")} ${attribute(tag, "width")}`;
      });
      if (slides.join("|") !== markup.join("|")) {
        errors.push(`${at(file)}: slides array [${slides.join(", ")}] differs from figure.hero-slide [${markup.join(", ")}]`);
      }
    }
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
