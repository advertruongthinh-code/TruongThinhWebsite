// File side of the content modules (cms R7): blocks.mjs, block-pages.mjs and hero-slides.mjs stay pure, the build reads
// files and checks images on disk through here.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { KINDS } from "./block-pages.mjs";
import { validateImage } from "./lib.mjs";

export const loadBlockContent = (siteRoot) => Object.fromEntries(Object.keys(KINDS).map((kind) => {
  const file = path.join(siteRoot, `content/${kind}.json`);
  return [kind, existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : []];
}));

// For the build scripts: load data and the order script from the site source root.
export const readHeroSources = (siteRoot) => ({
  data: JSON.parse(readFileSync(path.join(siteRoot, "content", "hero-slides.json"), "utf8")),
  orderScript: readFileSync(path.join(siteRoot, "hero-order-inline.js"), "utf8"),
});

// The image check of the build: field rules plus the file under siteRoot and its real size.
export const fileImageCheck = (siteRoot) => (image, where) => validateImage(image, siteRoot, where);
