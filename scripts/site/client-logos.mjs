// Client logo strip of the home page (cms-plan part 2 K9): built from client-logos.json at <!-- client-logos --> in
// src/site/partials/client-logos.html. The second group is the marquee's hidden copy. Logos stay <img>, never inline SVG.
import { escapeHtml } from "./lib-pure.mjs";

const MARKER = /^( *)<!-- client-logos -->\n/m;

export const renderClientLogos = (logos, indent = "") => ["", ' aria-hidden="true"'].flatMap((hidden) => [
  `${indent}<div class="client-logo-marquee__group"${hidden}>`,
  ...logos.map(({ name, src }) => `${indent}  <span class="client-logo-slot"><img class="client-logo-image" src="${escapeHtml(src)}" width="200" height="80" loading="eager" decoding="async" alt="${hidden ? "" : escapeHtml(name)}" /></span>`),
  `${indent}</div>`,
]).join("\n") + "\n";

// A page with the strip and no marker stops the build; an empty list drops the whole section.
export function fillClientLogos(html, logos, pageId = "page") {
  if (!html.includes("client-logo-marquee")) return html;
  if (!MARKER.test(html)) throw new Error(`${pageId}: client logo strip is missing <!-- client-logos -->`);
  if (!logos.length) return html.replace(/^( *)<section\b[^>]*?client-logo-marquee[\s\S]*?^\1<\/section>\n/m, "");
  return html.replace(MARKER, (_match, indent) => renderClientLogos(logos, indent));
}
