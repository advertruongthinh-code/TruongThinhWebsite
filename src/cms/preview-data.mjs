// Data and HTML of the editor preview (cms-editor R3, CMS plan E13). Pure module: the editor and tests import it. The page HTML comes
// from the build's own functions (renderBlockPage, then finishPage and localeHtml), so the preview is the build HTML, not a copy of it.
import { ADVERTISING_CLUSTERS } from "../site/advertising-products/taxonomy.mjs";
import { renderBlockPage, PROJECT_TYPES, pageHref, KINDS } from "../../scripts/site/block-pages.mjs";
import { localeHtml } from "../../scripts/site/lib-pure.mjs";
import { finishPage } from "../../scripts/site/page-finish.mjs";
import { enMissing } from "./contract.mjs";
import { materialize, mediaRefs } from "./media-ref.mjs";

const VARIANT_SRC = /^\/v\/([0-9a-f]{32})\//;

// Placements of a record rewritten as the Worker saves them (src, size, alt from the media record), for validation and preview.
export async function viewData(type, data, mediaById) {
  return (await materialize(type, data, mediaById)).data;
}

// An R2 variant is public only once the media origin serves it (E21) and its variant is ready: until then (or while it is still
// being made) the preview shows the original through media-file; the crop rides in the URL fragment for the overlay to apply.
// Mutates `data`. `ready`: set of ready variant keys. Without `mediaOrigin` every variant falls back.
export function previewSrcs(type, data, { mediaOrigin = "", ready = new Set() } = {}) {
  for (const ref of mediaRefs(type, data)) {
    const key = VARIANT_SRC.exec(ref.src ?? "")?.[1];
    if (!key) continue;
    ref.src = mediaOrigin && ready.has(key) ? `${mediaOrigin}${ref.src}` : `/api/admin/media-file?id=${encodeURIComponent(ref.mediaId)}${ref.crop ? `#crop=${ref.crop.join(",")}` : ""}`;
  }
  return data;
}

// The context renderBlockPage reads (blockContext of the build): published News and projects from the `context` command, the open
// page added or replaced by its draft, the lists the links resolve against, and the contact record. noEn like the build (K3).
export function previewContext({ news, projects }, contact, type, page, { editor = false, srcs } = {}) {
  const prepare = (rowType) => (row) => {
    const copy = previewSrcs(rowType, structuredClone(row), srcs);
    if (enMissing(rowType, copy).length) copy.noEn = true;
    return [copy.id, copy];
  };
  const maps = { news: new Map(news.map(prepare("news"))), projects: new Map(projects.map(prepare("project"))) };
  const [id, entry] = prepare(type)(page);
  maps[type === "project" ? "projects" : "news"].set(id, entry);
  return {
    news: maps.news, projects: maps.projects, contact, editor,
    clusters: ADVERTISING_CLUSTERS.map(({ id: slug, slugVi, slugEn }) => ({ slug, slugVi, slugEn })),
    projectTypes: Object.keys(PROJECT_TYPES),
  };
}

// The page of the open record as the visitor sees it. frame: HTML of the kind's frame page; page: the view data (placements
// materialized, previewSrcs applied). finish: { hasFile, mediaOrigin, headInline } of finishPage.
export function renderPreview(type, frame, page, context, { locale = "vi", finish }) {
  const kind = type === "project" ? "projects" : "news";
  const entry = context[kind === "projects" ? "projects" : "news"].get(page.id);
  const html = finishPage(renderBlockPage(kind, frame, entry, context), { file: `${KINDS[kind].dir}/${page.id}`, ...finish });
  return localeHtml(html, locale);
}

// Real path of the page: the iframe shows the site's own scripts under this URL (they read location).
export const previewPath = (type, page, locale = "vi") => pageHref(type === "project" ? "projects" : "news", locale, { slugVi: page.slugVi || page.id, slugEn: page.slugEn || page.slugVi || page.id });
