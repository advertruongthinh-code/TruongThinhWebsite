// Hero slideshows of the home, Residential and Commercial pages (page-home R3, detail-pages R5): validate
// src/site/content/hero-slides.json, then generate what the pages used to hard-write three times:
//   <!-- hero-slides:KEY -->        the figure.hero-slide list inside .hero-slides
//   /* hero-slides-data:KEY */      the `slides` array of the <head> script (first-slide preload)
//   <!-- hero-order -->             the shared order script right after .hero-slides
// KEY is a top-level key of the JSON (home, residential, commercial). Invalid data stops the build.
import { escapeHtml } from "./lib-pure.mjs";

const MOVES = ["zoom-out", "pan"];
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const inRange = (value) => Number.isFinite(value) && value >= 0 && value <= 100;
const isPoint = (point) => inRange(point?.x) && inRange(point?.y);

// Errors of one slide, without the duplicate id check (that needs the whole page list). checkImage(image, where) as in validateBlockPage.
export async function heroSlideErrors(slide, at, checkImage) {
  const errors = [];
  // "@" would break the CMS clone keys (cms-core splits on it).
  if (typeof slide.id !== "string" || !KEBAB.test(slide.id)) errors.push(`${at}: id must be kebab-case`);
  // Hero images are decorative on the home page (empty alt in both languages); elsewhere both alts are required.
  if (typeof slide.altVi !== "string" || typeof slide.altEn !== "string" || !slide.altVi.trim() !== !slide.altEn.trim()) errors.push(`${at}: altVi and altEn must both be empty or both set`);
  // The image check insists on non-empty alts, so give it placeholders: the alt rule is checked above.
  errors.push(...await checkImage({ ...slide, altVi: "-", altEn: "-" }, at));
  if (!isPoint(slide.focal)) errors.push(`${at}: focal x and y must be 0-100`);
  const move = slide.phoneMove;
  if (!MOVES.includes(move?.kind)) errors.push(`${at}: phoneMove.kind must be ${MOVES.join(" or ")}`);
  else if (move.kind === "pan") {
    if (!isPoint(move.from) || !isPoint(move.to)) errors.push(`${at}: pan needs from and to points`);
    else if (move.from.x !== move.to.x && move.from.y !== move.to.y) errors.push(`${at}: pan must be horizontal or vertical (from.x === to.x or from.y === to.y)`);
    else if (move.from.x === move.to.x && move.from.y === move.to.y) errors.push(`${at}: pan from and to must differ`);
  }
  return errors;
}

export async function validateHeroSlides(data, checkImage) {
  const errors = [];
  for (const key of ["home", "residential", "commercial"]) {
    const slides = data?.[key];
    if (!Array.isArray(slides) || !slides.length) { errors.push(`hero-slides.${key}: need at least one slide`); continue; }
    const ids = new Set();
    for (const [index, slide] of slides.entries()) {
      const at = `hero-slides.${key}[${index}]`;
      const slideErrors = await heroSlideErrors(slide, at, checkImage);
      // The duplicate id error keeps its old place, right after the id check.
      if (typeof slide.id === "string" && KEBAB.test(slide.id) && ids.has(slide.id)) slideErrors.unshift(`${at}: duplicate id ${slide.id}`);
      ids.add(slide.id);
      errors.push(...slideErrors);
    }
  }
  if (errors.length) throw new Error(`hero-slides data invalid:\n${errors.join("\n")}`);
}

// Direction the view travels over the image (left, right, up, down): from and to are points on the image, so to.x > from.x is "right".
const panDir = ({ from, to }) => (from.x === to.x ? (to.y > from.y ? "down" : "up") : (to.x > from.x ? "right" : "left"));

// Only call with data that passed validateHeroSlides. Same markup the pages had, plus data-hero-move, data-hero-pan-dir (pan only)
// and the focal custom properties. A pan slide starts at its from point, so that point is the portrait object-position.
const renderSlides = (slides) => slides.map((slide, index) => {
  const pan = slide.phoneMove.kind === "pan";
  const focal = pan ? slide.phoneMove.from : slide.focal;
  return [
    `<figure class="hero-slide${index ? "" : " is-active"}" data-slide="${index}" data-hero-move="${slide.phoneMove.kind}"${pan ? ` data-hero-pan-dir="${panDir(slide.phoneMove)}"` : ""} style="--hero-focal-x: ${focal.x}%; --hero-focal-y: ${focal.y}%">`,
    `  <img data-src="${slide.src}" width="${slide.width}" height="${slide.height}" alt="${escapeHtml(slide.altVi)}"${slide.altEn ? ` data-en-alt="${escapeHtml(slide.altEn)}"` : ""} loading="eager" />`,
    "</figure>",
  ].join("\n");
}).join("\n");

// [URL without ".webp", width] pairs the head script indexes by slide position (the same order as the figures). The URL is the repo
// path or the absolute media URL of an R2 image (cms-plan part 2 K4); the preload adds "-<width>.<format>" the same way for both.
const renderData = (slides) => `[${slides.map((slide) => `["${slide.src.replace(/\.webp$/, "")}", ${slide.width}]`).join(", ")}]`;

// Replaces the three markers of one page source. A page without markers comes back unchanged.
export function expandHero(html, data, orderScript) {
  const slidesOf = (key) => {
    if (!data[key]) throw new Error(`hero-slides: no slides for "${key}"`);
    return data[key];
  };
  return html
    .replace(/<!-- hero-slides:(\w+) -->/g, (_marker, key) => renderSlides(slidesOf(key)))
    .replace(/\/\* hero-slides-data:(\w+) \*\//g, (_marker, key) => renderData(slidesOf(key)))
    .replace("<!-- hero-order -->", () => `<script type="module">\n${orderScript}</script>`);
}
