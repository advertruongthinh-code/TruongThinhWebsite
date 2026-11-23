// One link syntax for menu, marked text and CTA (cms-plan part 2, K1). Pure module: build, preview and Worker share it.
// VI paths sit at the root, EN under /en (static-release R5); every locale path goes through localePrefix.
import { localePrefix } from "../../scripts/site/lib-pure.mjs";

export const LINK = /^(page:[a-z0-9-]+(\/[a-z0-9-]+)?|contact:[a-z]+|https:\/\/[^\s"'<>()]+)$/;
export const CONTACT_HREF = /^(https:\/\/[^\s"'<>]+|tel:\+?[0-9]+|mailto:[^\s"'<>]+)$/;
export const ABOUT_TOPICS = ["heritage", "process", "commitment", "contact"];
const PAGES = { home: "/", residential: "/residential/", commercial: "/commercial/", projects: "/projects/", advertising: "/advertising-products/", about: "/about/", news: "/news/" };

const both = (vi, en = vi) => ({ vi: `${localePrefix("vi")}${vi}`, en: `${localePrefix("en")}${en}`, external: false });

// ctx: { projects: Map, news: Map (id -> published data), clusters: [{ slug, slugVi, slugEn }], projectTypes: [key], contact }.
// Returns { vi, en, external }, or null when the target does not exist (trashed record, empty contact channel, unknown key).
export function resolveLink(link, ctx = {}) {
  if (typeof link !== "string" || !LINK.test(link)) return null;
  if (link.startsWith("https://")) return { vi: link, en: link, external: true };
  if (link.startsWith("contact:")) {
    // Only the schemes contact.json allows (K8); anything else (javascript:, data:) reads as an empty channel.
    const href = ctx.contact?.channels?.[link.slice(8)]?.href;
    return typeof href === "string" && CONTACT_HREF.test(href) ? { vi: href, en: href, external: href.startsWith("https://") } : null;
  }
  const [page, key] = link.slice(5).split("/");
  if (key === undefined) return Object.hasOwn(PAGES, page) ? both(PAGES[page]) : null;
  if (page === "project-type") return (ctx.projectTypes ?? []).includes(key) ? both(`/projects/${key}/`) : null;
  if (page === "about") return ABOUT_TOPICS.includes(key) ? both(`/about/?topic=${key}`) : null;
  if (page === "advertising") {
    const cluster = (ctx.clusters ?? []).find(({ slug }) => slug === key);
    return cluster ? both(`/advertising-products/${cluster.slugVi}/`, `/advertising-products/${cluster.slugEn}/`) : null;
  }
  const records = page === "project" ? ctx.projects : page === "news" ? ctx.news : null;
  const record = records?.get(key);
  const base = page === "project" ? "/projects" : "/news";
  return record ? both(`${base}/${record.slugVi}/`, `${base}/${record.slugEn}/`) : null;
}

// href of a VI page, plus data-en-href only when EN differs from both the VI href and the prefixed VI path (localeHtml adds the prefix).
export const hrefAttrs = (vi, en) => `href="${vi}"${en && en !== vi && en !== `${localePrefix("en")}${vi}` ? ` data-en-href="${en}"` : ""}`;
