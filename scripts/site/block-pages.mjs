// Trang công trình dựng từ khối (projects R3, layout-library R4): khung header, menu, footer lấy từ trang Nhà ở,
// thân <main> là chuỗi khối của src/site/content/projects.json. Route theo slug VI và EN.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { renderBlocks } from "./blocks.mjs";

export const PUBLIC_ORIGIN = "https://truongthinhads.vn";

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export const loadBlockContent = (siteRoot) => Object.fromEntries(["projects", "news"].map((kind) => {
  const file = path.join(siteRoot, `content/${kind}.json`);
  return [kind, existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : []];
}));

export const projectHref = (locale, project) => `/${locale}/projects/${locale === "vi" ? project.slugVi : project.slugEn}/`;
// Một file nguồn mỗi công trình; route VI và EN cùng trỏ vào đó, localeHtml đổi ngôn ngữ.
export const projectSource = (project) => `projects/${project.id}/index.html`;
export const projectRoutes = (projects) => projects.flatMap((project) => ["vi", "en"].map((locale) => [projectHref(locale, project), projectSource(project)]));

const jsonLd = (project) => {
  const url = `${PUBLIC_ORIGIN}${projectHref("vi", project)}`;
  const section = { "@type": "ListItem", position: 2, name: "Công trình", item: `${PUBLIC_ORIGIN}/vi/residential/` };
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article", "@id": `${url}#article`, headline: project.title.vi, description: project.description.vi,
        image: `${PUBLIC_ORIGIN}${project.cover.src}`, mainEntityOfPage: url,
        author: { "@type": "Organization", name: "Trường Thịnh", url: `${PUBLIC_ORIGIN}/` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [{ "@type": "ListItem", position: 1, name: "Trường Thịnh", item: `${PUBLIC_ORIGIN}/vi/` }, section, { "@type": "ListItem", position: 3, name: project.title.vi, item: url }],
      },
    ],
  }).replace(/</g, "\\u003c");
};

export const renderProjectPage = (template, project, ctx) => {
  const vi = `${PUBLIC_ORIGIN}${projectHref("vi", project)}`;
  const en = `${PUBLIC_ORIGIN}${projectHref("en", project)}`;
  const page = template
    // Bỏ script chọn slide hero của trang Nhà ở: trang công trình không có slideshow.
    .replace(/<script>\s*\/\/ detail-pages R5:[\s\S]*?<\/script>\s*/, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/, [
      `<title data-en="${escapeHtml(project.title.en)} — Trường Thịnh">${escapeHtml(project.title.vi)} — Trường Thịnh</title>`,
      `<link rel="canonical" href="${vi}" data-en-href="${en}" />`,
      `<link rel="alternate" hreflang="vi" href="${vi}" />`,
      `<link rel="alternate" hreflang="en" href="${en}" />`,
      `<link rel="alternate" hreflang="x-default" href="${vi}" />`,
      `<meta property="og:image" content="${PUBLIC_ORIGIN}${project.cover.src}" />`,
      `<script type="application/ld+json">${jsonLd(project)}</script>`,
    ].join("\n    "))
    .replace(/(<meta\s+name="description"\s+content=")[^"]*("\s+data-en-content=")[^"]*"/,
      (_match, before, middle) => `${before}${escapeHtml(project.description.vi)}${middle}${escapeHtml(project.description.en)}"`)
    .replace('data-barba-namespace="residential"', 'data-barba-namespace="project"')
    .replace('href="/vi/residential/" data-language-option="vi"', `href="${projectHref("vi", project)}" data-language-option="vi"`)
    .replace('href="/en/residential/" data-language-option="en"', `href="${projectHref("en", project)}" data-language-option="en"`)
    .replace(/<main id="noi-dung">[\s\S]*?<\/main>/, () => `<main id="noi-dung">\n${renderBlocks(project, ctx)}\n      </main>`);
  if (page === template || !page.includes('data-barba-namespace="project"')) throw new Error(`project ${project.id}: residential template anchors changed`);
  return page;
};
