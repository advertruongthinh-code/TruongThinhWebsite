// Old public paths that moved (media-card R7, projects R2, news R2): one list feeds the Cloudflare _redirects file (real 301),
// the HTML fallback pages and the preview server routes (static-release R9).
import { ADVERTISING_PRODUCT_REDIRECTS } from "../../src/site/advertising-products/catalog.mjs";
import { MERGED_CARD_REDIRECTS } from "../../src/site/advertising-products/media-manifest.mjs";
import { newsYearRedirects } from "./block-pages.mjs";
import { RENAMED_FILTER_SLUGS } from "./project-list.mjs";
import { localePrefix } from "./lib.mjs";

export const legacyRedirects = (content) => [
  ...Object.entries(MERGED_CARD_REDIRECTS).map(([from, to]) => [`/advertising-products/p/${from}/`, `/advertising-products/p/${to}/`]),
  ...Object.entries(RENAMED_FILTER_SLUGS).map(([from, to]) => [`/projects/${from}/`, `/projects/${to}/`]),
  ...newsYearRedirects(content.news),
].flatMap(([from, to]) => ["vi", "en"].map((locale) => [`${localePrefix(locale)}${from}`, `${localePrefix(locale)}${to}`])).concat(
  ADVERTISING_PRODUCT_REDIRECTS.map(([locale, from, to]) => [`${localePrefix(locale)}/advertising-products/${from}/`, `${localePrefix(locale)}/advertising-products/${to}/`]),
);

// Vietnamese moved from /vi/ to the root (owner 2026-11-22): an old /vi/ path of a moved page goes straight to its final
// target (one hop), then every other /vi/ path drops the prefix. Specific lines come first: Cloudflare takes the first match.
export const redirectsFile = (content) => {
  const moved = legacyRedirects(content);
  const oldVi = moved.filter(([from]) => !from.startsWith("/en/")).map(([from, to]) => [`/vi${from}`, to]);
  return `${[...moved, ...oldVi, ["/vi", "/"], ["/vi/*", "/:splat"]].map(([from, to]) => `${from} ${to} 301`).join("\n")}\n`;
};
