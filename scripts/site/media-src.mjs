// Image src on the media origin (cms-plan part 2 K4): an R2 image keeps its absolute URL `<mediaOrigin>/v/<key>/<file>`; a repo
// image stays /assets/content/…. Pure module, no Node built-ins: build, Worker and tests share it.
import { IMAGE_SRC } from "./lib-pure.mjs";

// Any file of a variant; callers check the extension they accept.
export const VARIANT_URL = /^https:\/\/[a-z0-9.-]+\/v\/([0-9a-f]{32})\/([a-z0-9.-]+)$/;
export const isRepoSrc = (src) => IMAGE_SRC.test(src);
export const variantKeyOf = (src) => VARIANT_URL.exec(src ?? "")?.[1] ?? null;
export const originOf = (src) => (variantKeyOf(src) ? new URL(src).origin : null);
// Absolute URL for og:image, JSON-LD and sitemaps: an R2 src already is one.
export const absoluteSrc = (src, publicOrigin) => (variantKeyOf(src) ? src : publicOrigin + src);
// Same folder, "<name><suffix>.<ext>": siblingSrc("/a/b.webp", "-480", "webp") is "/a/b-480.webp".
export const siblingSrc = (src, suffix, ext) => src.replace(/\.[a-z0-9]+$/, `${suffix}.${ext}`);

// The manifest of an R2 src from variants.json ({ "<key>": manifest }); a missing one names the key.
export function manifestOf(src, variants) {
  const key = variantKeyOf(src);
  const manifest = variants?.[key];
  if (!manifest) throw new Error(`variants.json has no manifest for key ${key} (${src})`);
  return manifest;
}
// Whether a variant file exists: the manifest `files` list for R2 (no disk read), onDisk(url) for a repo path.
export const hasFile = (url, variants, onDisk) => (variantKeyOf(url)
  ? (manifestOf(url, variants).files ?? []).some(({ name }) => name === VARIANT_URL.exec(url)[2])
  : onDisk(url));

// Field errors of an R2 image against its manifest: dimensions, the .jxl every image recipe makes (Q6), the build's media origin.
export function variantImageErrors(image, where, { variants, mediaOrigin }) {
  if (originOf(image.src) !== mediaOrigin) return [`${where}: src origin must be the build media origin ${mediaOrigin || "(CMS_MEDIA_ORIGIN unset)"}`];
  const manifest = variants?.[variantKeyOf(image.src)];
  if (!manifest) return [`${where}: variants.json has no manifest for key ${variantKeyOf(image.src)}`];
  const errors = [];
  if (image.width !== manifest.width || image.height !== manifest.height) errors.push(`${where}: width/height must be ${manifest.width}x${manifest.height}`);
  const name = VARIANT_URL.exec(image.src)[2];
  if (!manifest.files?.some((file) => file.name === name)) errors.push(`${where}: manifest of ${variantKeyOf(image.src)} has no ${name}`);
  if (!manifest.files?.some((file) => file.name === siblingSrc(name, "", "jxl"))) errors.push(`${where}: manifest of ${variantKeyOf(image.src)} has no .jxl`);
  // The build reads the dominant color (project grid tail) and the runtime the Flow colors from here.
  if (!Array.isArray(manifest.colors) || manifest.colors.length !== 6) errors.push(`${where}: manifest of ${variantKeyOf(image.src)} needs 6 colors`);
  return errors;
}
