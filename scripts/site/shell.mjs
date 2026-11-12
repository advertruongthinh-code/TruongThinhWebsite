// Shared page shell (site-shell R4): each source page holds <!-- shell:NAME --> markers; renderShell puts
// src/site/partials/NAME.html in their place, filling {{key}} from the page's row in SHELL_PAGES.
import { readFileSync } from "node:fs";
import path from "node:path";
import { siteRoot } from "./lib.mjs";

const PARTIALS = ["head", "boot", "styles", "route-veil", "header", "floating-cta", "menu", "footer", "scripts"];
const partials = Object.fromEntries(PARTIALS.map((name) => [name, readFileSync(path.join(siteRoot, "partials", `${name}.html`), "utf8").trimEnd()]));

const home = { extraScripts: "", logoVi: "— về trang chủ", logoEn: "— go to homepage", ctaVi: "Gọi Zalo tư vấn", ctaEn: "Talk to us on Zalo" };
const project = { ctaAriaVi: "Trao đổi công trình qua Zalo", ctaAriaEn: "Discuss your project on Zalo", ctaVi: "Trao đổi qua Zalo", ctaEn: "Talk on Zalo" };
// Values copied as they were in each page before the shell existed (nav and Zalo labels differ by page on purpose).
export const SHELL_PAGES = {
  "index.html": { ...home, route: "", navVi: "Điều hướng chính", navEn: "Primary navigation", logoVi: "— về đầu trang", logoEn: "— back to top", ctaAriaVi: "Gọi Zalo tư vấn", ctaAriaEn: "Talk to us on Zalo" },
  "residential/index.html": { ...home, route: "residential/", navVi: "Điều hướng trang nội thất nhà ở", navEn: "Residential spaces navigation", ctaAriaVi: "Gọi Zalo tư vấn nội thất nhà ở", ctaAriaEn: "Discuss home interiors on Zalo" },
  "commercial/index.html": { ...home, route: "commercial/", navVi: "Điều hướng trang nội thất kinh doanh", navEn: "Commercial spaces navigation", ctaAriaVi: "Gọi Zalo tư vấn nội thất kinh doanh", ctaAriaEn: "Discuss commercial interiors on Zalo" },
  "advertising-products/index.html": { ...home, ...project, route: "advertising-products/", navVi: "Điều hướng công trình và sản phẩm", navEn: "Projects and products navigation", logoEn: "— back to home", ctaEn: "Discuss on Zalo",
    extraScripts: '\n<script defer src="/assets/vendor/masonry-4.2.2.min.js"></script>\n<script defer src="/assets/vendor/lazysizes-5.3.2.min.js"></script>' },
  "about/index.html": { ...home, ...project, route: "about/", navVi: "Điều hướng trang giới thiệu", navEn: "About page navigation" },
  "404.html": { ...home, ...project, route: "", navVi: "Điều hướng chính", navEn: "Primary navigation" },
};

export const renderShell = (source, pageId) => {
  const params = SHELL_PAGES[pageId];
  if (!params) throw new Error(`${pageId} has no shell row`);
  return source.replace(/^( *)<!-- shell:([a-z-]+) -->/gm, (_match, indent, name) => {
    if (!(name in partials)) throw new Error(`${pageId}: unknown shell marker ${name}`);
    return partials[name]
      .replace(/\{\{(\w+)\}\}/g, (_key, key) => {
        if (!(key in params)) throw new Error(`${pageId}: shell key ${key} missing`);
        return params[key];
      })
      .split("\n").map((line) => (line ? indent + line : line)).join("\n");
  });
};
