// File side of the content modules (cms R7): blocks.mjs, block-pages.mjs and hero-slides.mjs stay pure, the build reads
// files and checks images on disk through here.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { KINDS } from "./block-pages.mjs";
import { enMissing } from "../../src/cms/contract.mjs";
import { validateImage } from "./lib.mjs";

// TT_CONTENT_DIR points the build at a projected snapshot (cms R6, Q8); empty (the workflow passes "") means the repo. `||`, not `??`.
export const contentDirOf = (siteRoot) => process.env.TT_CONTENT_DIR || path.join(siteRoot, "content");

// A page with an empty required EN field gets noEn: true (cms-content R2, K3): the build writes its VI page only. The flag is set
// only when true, so pages with full EN keep their exact data.
export const loadBlockContent = (siteRoot) => Object.fromEntries(Object.keys(KINDS).map((kind) => {
  const file = path.join(contentDirOf(siteRoot), `${kind}.json`);
  const pages = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
  for (const page of pages) if (enMissing(kind === "projects" ? "project" : "news", page).length) page.noEn = true;
  return [kind, pages];
}));

// Old slugs of renamed pages (cms Q3); the file exists only in a projected snapshot, so a repo build gets none.
export const readRedirects = (siteRoot) => {
  const file = path.join(contentDirOf(siteRoot), "redirects.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
};

// For the build scripts: load data and the order script from the site source root.
export const readHeroSources = (siteRoot) => ({
  data: JSON.parse(readFileSync(path.join(contentDirOf(siteRoot), "hero-slides.json"), "utf8")),
  orderScript: readFileSync(path.join(siteRoot, "hero-order-inline.js"), "utf8"),
});

// The image check of the build: field rules plus the file under siteRoot and its real size.
// Manifests of the R2 images a projected snapshot uses (cms-plan part 2 K4): { "<key>": manifest }; a repo build has none.
export const loadVariants = (siteRoot) => {
  const file = path.join(contentDirOf(siteRoot), "variants.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
};
// CMS_MEDIA_ORIGIN is the media origin of the snapshot being built; an R2 src on another origin is an error.
export const fileImageCheck = (siteRoot) => {
  const options = { variants: loadVariants(siteRoot), mediaOrigin: (process.env.CMS_MEDIA_ORIGIN ?? "").replace(/\/+$/, "") };
  return (image, where) => validateImage(image, siteRoot, where, options);
};
