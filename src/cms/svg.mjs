// SVG logo check (cms-plan part 2 K9): a string check, not an XML parser. It is the first line only: logos are shown with <img>,
// where scripts never run, and the media domain adds CSP sandbox (E21). Pure module: Worker and browser share it.

export const MAX_SVG_BYTES = 200 * 1024;

// Elements a drawn logo needs. Anything else (script, foreignObject, iframe, image, a, animate, set...) fails.
const ELEMENTS = new Set(["svg", "g", "defs", "path", "polygon", "polyline", "rect", "circle", "ellipse", "line", "lineargradient", "radialgradient",
  "stop", "clippath", "mask", "pattern", "symbol", "use", "title", "desc", "style", "text", "tspan", "metadata", "marker", "filter",
  "fegaussianblur", "feoffset", "feflood", "fecomposite", "femerge", "femergenode", "fecolormatrix", "feblend", "fedropshadow"]);
// Namespace declarations are identifiers, never fetched (Illustrator adds xmlns:i, xmlns:x...); prefixed elements still fail the list.
const NAMESPACES = /\sxmlns(?::[\w.-]+)?\s*=\s*(["'])https?:\/\/[^"'\s]*\1/gi;

const strip = (text) => text.replace(/^﻿/, "").replace(/^\s*<\?xml\s[^?]*\?>/i, "");
// Comments and a DOCTYPE without an internal subset (old Illustrator exports) may come before the root tag.
const rootTag = (text) => /^\s*(?:(?:<!--[\s\S]*?-->|<!doctype\s[^[>]*>)\s*)*(<svg\b[^>]*>)/i.exec(text)?.[1];

// [x, y, w, h] from the root <svg> viewBox, or null when it is missing, malformed or has no area.
export function svgViewBox(text) {
  const tag = typeof text === "string" ? rootTag(strip(text)) : undefined;
  const value = tag && /\sviewBox\s*=\s*(["'])([^"']*)\1/i.exec(tag)?.[2];
  const box = value?.trim().split(/[\s,]+/).map(Number);
  return box?.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0 ? box : null;
}

export function isSafeSvg(text) {
  if (typeof text !== "string") return false;
  const raw = strip(text);
  if (!rootTag(raw)) return false;
  // Comments and the DOCTYPE are inert; drop them so their text (a DTD URL, a generator note) is not checked as markup.
  const svg = raw.replace(/<!--[\s\S]*?-->/g, " ").replace(/<!doctype\s[^[>]*>/i, " ");
  if (!rootTag(svg) || !/<\/svg>\s*$/i.test(svg) || !svgViewBox(svg)) return false;
  // Control characters (tab, LF, CR are fine), a DOCTYPE internal subset or ENTITY (entity expansion), other processing instructions.
  // A backslash is a CSS escape (@\69mport, u\72l() that hides words from the checks below. xml:base moves where #ids resolve.
  // A < inside a quoted value or the DOCTYPE could open a comment this check strips but the browser does not.
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]|<!doctype[^>]*[[<]|<!entity|<\?|\\|xml:base|=\s*("[^"]*<|'[^']*<)/i.test(raw)) return false;
  // Character references hide words from the checks below (&#106;avascript:); only the five XML ones are allowed.
  if (/&(?!(?:amp|lt|gt|quot|apos);)/i.test(svg)) return false;
  const tags = [...svg.matchAll(/<\/?\s*([a-z][\w:.-]*)/gi)].map((match) => match[1].toLowerCase());
  if (!tags.every((tag) => ELEMENTS.has(tag))) return false;
  const body = svg.replace(NAMESPACES, " ");
  // Event handlers, script URLs, links or urls that leave the document, CSS imports.
  return !/[\s/"']on[a-z]+\s*=|javascript:|\bdata:|\b(?:xlink:)?href\s*=\s*(?!["']#)|url\s*\(\s*(?!["']?#)|@import|https?:/i.test(body);
}
