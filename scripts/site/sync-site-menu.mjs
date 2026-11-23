// Full-menu nav and navbar list (site-shell R4) rendered at build time from content/menu.json and put in place of the
// <!-- menu-nav --> and <!-- desktop-nav --> markers of the source pages: nothing is written back into src/site.
// menu.json holds the 6 groups and their items (cms-plan part 2 K8); every link goes through resolveLink.
import { readFileSync } from "node:fs";
import path from "node:path";
import { ADVERTISING_CLUSTERS } from "../../src/site/advertising-products/taxonomy.mjs";
import { PROJECT_TYPES } from "./block-pages.mjs";
import { contentDirOf, loadBlockContent } from "./content-files.mjs";
import { escapeHtml, siteRoot } from "./lib.mjs";
import { hrefAttrs, resolveLink } from "../../src/cms/links.mjs";
import { renderShell } from "./shell.mjs";
import { fillContact } from "./slots.mjs";

export const MENU_PAGES = ["index.html", "residential/index.html", "commercial/index.html", "advertising-products/index.html", "about/index.html", "404.html"];
const navMarker = /( *)<!-- menu-nav -->/;
const desktopMarker = /( *)<!-- desktop-nav -->/;
// Navbar (site-shell R4): the first four menu groups, named by their aria (full name) or title.
const DESKTOP_GROUPS = 4;

// A VI-to-EN route that only changes the prefix is swapped by the runtime itself; a different slug needs data-en-href.
// viOnly: a project without EN (cms-content R2) shows in the VI menu only; localeHtml drops it from EN pages.
const option = ({ vi, en, label, viOnly = false }) => `<a class="menu-option" ${hrefAttrs(vi, viOnly ? undefined : en)}${viOnly ? " data-vi-only" : ""} data-en="${escapeHtml(label.en ?? "")}">${escapeHtml(label.vi)}</a>`;
// Outside links (https, contact channels) open in a new tab; a contact channel without a link stays as a disabled item.
const outside = (href, label) => {
  const en = label.en && label.en !== label.vi ? ` data-en="${escapeHtml(label.en)}"` : "";
  if (!href) return `<a class="menu-option" role="link" aria-disabled="true" tabindex="-1"${en}>${escapeHtml(label.vi)}</a>`;
  return `<a class="menu-option" href="${escapeHtml(href)}"${href.startsWith("https://") ? ' target="_blank" rel="noreferrer"' : ""}${en}>${escapeHtml(label.vi)}</a>`;
};

// The record a page:project/<id> or page:news/<id> link points to: its title is the label an item may leave empty.
const recordOf = (link, ctx) => {
  const [, kind, id] = link.match(/^page:(project|news)\/(.+)$/) ?? [];
  return kind ? (kind === "project" ? ctx.projects : ctx.news).get(id) : undefined;
};
const item = ({ label, link }, ctx) => {
  const target = resolveLink(link, ctx);
  if (link.startsWith("contact:") || link.startsWith("https://")) return outside(target?.vi, label);
  // A link whose target is gone (trashed project, unknown page) drops the item; the group stays.
  if (!target) return null;
  const record = recordOf(link, ctx);
  return option({ vi: target.vi, en: target.en, label: label ?? record.title, viOnly: Boolean(record?.noEn) });
};

const group = (number, { title, aria, link, items }, ctx) => {
  const target = resolveLink(link, ctx);
  return [
    '          <div class="menu-group">',
    `            <span class="menu-group__number">${String(number).padStart(2, "0")}</span>`,
    // aria-label keeps the full name when the title is only a short group name.
    `            <a class="menu-group__title"${target ? ` ${hrefAttrs(target.vi, target.en)}` : ""}${aria ? ` aria-label="${escapeHtml(aria.vi)}" data-en-aria-label="${escapeHtml(aria.en)}"` : ""}>`,
    `              <span data-vi="${escapeHtml(title.vi)}" data-en="${escapeHtml(title.en)}">${escapeHtml(title.vi)}</span>`,
    "            </a>",
    '            <div class="menu-group__links">',
    ...items.map((entry) => item(entry, ctx)).filter(Boolean).map((markup) => `              ${markup}`),
    "            </div>",
    "          </div>",
  ].join("\n");
};

export const renderMenuNav = (menu, ctx) => [
  '<nav\n          class="menu-nav"\n          aria-label="Menu toàn trang"\n          data-en-aria-label="Full-site menu"\n        >',
  ...menu.groups.map((entry, index) => group(index + 1, entry, ctx)),
  "        </nav>",
].join("\n");

export const renderDesktopList = (menu, ctx, indent) => [
  "<ul>",
  ...menu.groups.slice(0, DESKTOP_GROUPS).map(({ title, aria, link }) => {
    const { vi, en } = aria ?? title;
    return `${indent}  <li><a href="${resolveLink(link, ctx)?.vi ?? "#"}" data-vi="${escapeHtml(vi)}" data-en="${escapeHtml(en)}">${escapeHtml(vi)}</a></li>`;
  }),
  `${indent}</ul>`,
].join("\n");

const menu = JSON.parse(readFileSync(path.join(contentDirOf(siteRoot), "menu.json"), "utf8"));
// Contact links and CTA buttons (K8): every page source fills them from contact.json here, so block pages get them too.
export const contact = JSON.parse(readFileSync(path.join(contentDirOf(siteRoot), "contact.json"), "utf8"));
const { projects, news } = loadBlockContent(siteRoot);
const linkContext = {
  projects: new Map(projects.map((page) => [page.id, page])), news: new Map(news.map((page) => [page.id, page])),
  clusters: ADVERTISING_CLUSTERS.map(({ id, slugVi, slugEn }) => ({ slug: id, slugVi, slugEn })), projectTypes: Object.keys(PROJECT_TYPES), contact,
};
const nav = renderMenuNav(menu, linkContext);
const desktop = (indent) => renderDesktopList(menu, linkContext, indent);

// Source page (path relative to src/site) with the shell, menu and navbar list rendered in place of their markers.
export const readPageSource = (relativePath) => {
  const source = fillContact(renderShell(readFileSync(path.join(siteRoot, relativePath), "utf8"), relativePath), contact);
  if (!navMarker.test(source)) throw new Error(`${relativePath} is missing <!-- menu-nav -->`);
  if (!desktopMarker.test(source)) throw new Error(`${relativePath} is missing <!-- desktop-nav -->`);
  // A page's own group title carries a static aria-current; pages built from blocks remove it in block-pages.
  const section = relativePath.split("/")[1] ? relativePath.split("/")[0] : null;
  const current = section ? nav.replace(`class="menu-group__title" href="/${section}/"`, `class="menu-group__title" href="/${section}/" aria-current="page"`) : nav;
  const markCurrent = (list) => section ? list.replace(`<li><a href="/${section}/"`, `<li class="selected"><a href="/${section}/" aria-current="page"`) : list;
  return source
    .replace(navMarker, (_match, indent) => `${indent}${current}`)
    .replace(desktopMarker, (_match, indent) => `${indent}${markCurrent(desktop(indent))}`);
};
