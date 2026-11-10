// Home page project rail (page-home R8): validate src/site/content/project-reel.json then generate the
// figure.project-card elements replacing `<!-- project-reel-cards -->` in index.html. Invalid data stops the build.
import { existsSync } from "node:fs";
import path from "node:path";

// Card count: fewer than 3 loses the staggered rhythm; more than 6 makes cards in the 981px desktop grid narrower than about 130px.
const PROJECT_REEL_MIN = 3;
const PROJECT_REEL_MAX = 6;
// Variant -> class; the keys are also the list of valid variants. low and mid show the same offset.
const VARIANT_CLASS = { high: "project-card--high", mid: "project-card--mid", low: "project-card--low" };
const TEXT_FIELDS = ["altVi", "altEn", "captionVi", "captionEn"];

const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export async function validateProjectReel(items, siteRoot) {
  if (!Array.isArray(items) || items.length < PROJECT_REEL_MIN || items.length > PROJECT_REEL_MAX) {
    throw new Error(`project-reel: need ${PROJECT_REEL_MIN}-${PROJECT_REEL_MAX} items, got ${Array.isArray(items) ? items.length : typeof items}`);
  }
  // sharp is loaded at run time: the Docs job only renders previews and does not install node_modules.
  const { default: sharp } = await import("sharp");
  const errors = [];
  const ids = new Set();
  const orders = new Set();
  for (const [index, item] of items.entries()) {
    const at = `project-reel[${index}]`;
    if (typeof item.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) errors.push(`${at}: id must be kebab-case`);
    else if (ids.has(item.id)) errors.push(`${at}: duplicate id ${item.id}`);
    ids.add(item.id);
    if (!Number.isInteger(item.order) || item.order < 1) errors.push(`${at}: order must be a positive integer`);
    else if (orders.has(item.order)) errors.push(`${at}: duplicate order ${item.order}`);
    orders.add(item.order);
    if (!Object.hasOwn(VARIANT_CLASS, item.variant)) errors.push(`${at}: variant must be ${Object.keys(VARIANT_CLASS).join(", ")}`);
    for (const field of TEXT_FIELDS) {
      if (typeof item[field] !== "string" || !item[field].trim()) errors.push(`${at}: missing ${field}`);
    }
    // Only WebP under assets/content: the build wraps it in an AVIF <picture>, srcset per media-delivery R5.
    if (typeof item.src !== "string" || !/^\/assets\/content\/[a-z0-9/-]+\.webp$/.test(item.src)) {
      errors.push(`${at}: src must be /assets/content/<kebab-case>.webp`);
      continue;
    }
    const file = path.join(siteRoot, item.src);
    if (!existsSync(file)) {
      errors.push(`${at}: image not found ${item.src}`);
      continue;
    }
    const { width, height } = await sharp(file).metadata();
    if (item.width !== width || item.height !== height) errors.push(`${at}: width/height must be ${width}x${height} for ${item.src}`);
  }
  if (errors.length) throw new Error(`project-reel data invalid:\n${errors.join("\n")}`);
}

// Only call with data that passed validateProjectReel.
export const renderProjectReel = (items) => items.toSorted((left, right) => left.order - right.order).map((item) => [
  `<figure class="project-card ${VARIANT_CLASS[item.variant]}">`,
  '  <span class="project-card__media">',
  `    <img src="${item.src}" width="${item.width}" height="${item.height}" alt="${escapeHtml(item.altVi)}" data-en-alt="${escapeHtml(item.altEn)}" loading="lazy" />`,
  "  </span>",
  `  <figcaption data-en="${escapeHtml(item.captionEn)}">${escapeHtml(item.captionVi)}</figcaption>`,
  "</figure>",
].join("\n")).join("\n");
