// Helpers shared by the scripts in scripts/site (static-release R1). Node built-ins only: the Docs job imports
// scripts/site without installing node_modules, so sharp is loaded lazily inside validateImage.
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { phonePacks } from "../../src/site/masonry/pack.mjs";
import { IMAGE_SRC, imageFieldErrors } from "./lib-pure.mjs";

export * from "./lib-pure.mjs";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const siteRoot = path.join(projectRoot, "src", "site");

// Phone first grid (masonry-live-layout R3): the 2:15 packs of a grid page's own filter; cards = the array the runtime packs from.
export const phonePacksScript = (cards, filter) => `<script type="application/json" data-phone-packs>${JSON.stringify(phonePacks(cards, filter)).replace(/</g, "\\u003c")}</script>`;

export const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

// Every file under dir, depth first.
export const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
}))).flat();

// Checks one image reference of site data: src shape, VI and EN alt, file under root, width and height equal to the real file.
// Returns the error list (empty when valid); `where` prefixes each message.
export async function validateImage(image, root, where) {
  const errors = imageFieldErrors(image, where);
  if (!image || !IMAGE_SRC.test(image.src ?? "")) return errors;
  const file = path.join(root, image.src);
  if (!existsSync(file)) return [...errors, `${where}: image not found ${image.src}`];
  const { default: sharp } = await import("sharp");
  const { width, height } = await sharp(file).metadata();
  if (image.width !== width || image.height !== height) errors.push(`${where}: width/height must be ${width}x${height}`);
  return errors;
}

