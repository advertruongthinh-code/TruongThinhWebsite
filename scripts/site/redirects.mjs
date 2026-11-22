// Old public paths that moved (media-card R7, projects R2, news R2): one list feeds the Cloudflare _redirects file (real 301),
// the HTML fallback pages and the preview server routes (static-release R9).
import { ADVERTISING_PRODUCT_REDIRECTS } from "../../src/site/advertising-products/catalog.mjs";
import { MERGED_CARD_REDIRECTS } from "../../src/site/advertising-products/media-manifest.mjs";
import { KINDS, newsYearRedirects } from "./block-pages.mjs";
import { RENAMED_FILTER_SLUGS } from "./project-list.mjs";
import { localePrefix } from "./lib.mjs";

// One 301 per old slug of a page that is still in the projected files; a trashed page falls through to the static 404 (cms R3).
export const slugRedirects = (redirects, content) => redirects.flatMap(({ type, locale, slug, id }) => {
  const kind = type === "news" ? "news" : "projects";
  const page = (content[kind] ?? []).find((entry) => entry.id === id);
  const current = page && (locale === "vi" ? page.slugVi : page.slugEn);
  const at = (value) => `${localePrefix(locale)}/${KINDS[kind].dir}/${value}/`;
  return current && current !== slug ? [[at(slug), at(current)]] : [];
});

export const legacyRedirects = (content, redirects = []) => [
  ...Object.entries(MERGED_CARD_REDIRECTS).map(([from, to]) => [`/advertising-products/p/${from}/`, `/advertising-products/p/${to}/`]),
  ...Object.entries(RENAMED_FILTER_SLUGS).map(([from, to]) => [`/projects/${from}/`, `/projects/${to}/`]),
  ...newsYearRedirects(content.news),
].flatMap(([from, to]) => ["vi", "en"].map((locale) => [`${localePrefix(locale)}${from}`, `${localePrefix(locale)}${to}`])).concat(
  ADVERTISING_PRODUCT_REDIRECTS.map(([locale, from, to]) => [`${localePrefix(locale)}/advertising-products/${from}/`, `${localePrefix(locale)}/advertising-products/${to}/`]),
  slugRedirects(redirects, content),
);

// Vietnamese moved from /vi/ to the root (owner 2026-11-22): an old /vi/ path of a moved page goes straight to its final
// target (one hop), then every other /vi/ path drops the prefix. Specific lines come first: Cloudflare takes the first match.
export const redirectsFile = (content, redirects = []) => {
  const moved = legacyRedirects(content, redirects);
  const oldVi = moved.filter(([from]) => !from.startsWith("/en/")).map(([from, to]) => [`/vi${from}`, to]);
  const lines = [...moved, ...oldVi, ["/vi", "/"], ["/vi/*", "/:splat"]].map(([from, to]) => `${from} ${to} 301`);
  // Workers static assets take at most 2,000 static redirects (cms-data Q3); keep a margin for the wildcard lines.
  if (lines.length > 1900) throw new Error(`_redirects has ${lines.length} lines, limit 1900`);
  return `${lines.join("\n")}\n`;
};
