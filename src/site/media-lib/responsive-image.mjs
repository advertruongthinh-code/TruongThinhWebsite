// Progressive JXL sizes written by scripts/site/build-image-variants.mjs next to each content WebP (progressive-loading R1).
// Browsers that cannot decode JXL use the WebP of the same image, in sizes 240, 480, 960 (owner 2026-10-31: every browser can load them).
const WIDTHS = { jxl: [240, 480, 960, 1600, 2048], webp: [240, 480, 960] };
const isContent = (src) => /^\/assets\/content\/.+\.webp$/.test(src || "");
// Phone uses WebP only, capped at size 960, and never loads the 4K original (owner 2026-11-07): the A04s decodes WebP 480 in 17ms, JXL in 47ms.
// Same media query as the build's phone <source> (prepare-static-assets.mjs) and the <head> script.
const PHONE = globalThis.matchMedia?.("(hover: none) and (pointer: coarse)").matches ?? false;
const PHONE_MAX = 960;
let format = PHONE ? "webp" : "jxl";
let formatProbe;
// Probe once with a 1x1 JXL image like the hero preload script; the runtime waits on this promise before building the first image.
export const imageFormatReady = () => formatProbe ??= PHONE ? Promise.resolve() : Object.assign(new Image(), {
  src: "data:image/jxl;base64,/woAEBAJCAQBACwASxiLFcJJQR6A/gA=",
}).decode().catch(() => { format = "webp"; });

// needed: real pixel count to paint; when set, pick the smallest size that is sharp enough, otherwise the original. width: original width.
// Phone: if the original is wider than 960 return size 960; if width is unknown still return the original.
export function responsiveSource(src, width, needed) {
  if (!isContent(src)) return src;
  const stem = src.slice(0, -".webp".length);
  const fit = needed > 0 && WIDTHS[format].find((candidate) => candidate < width && candidate >= needed)
    || (PHONE && width > PHONE_MAX && PHONE_MAX);
  return fit ? `${stem}-${fit}.${format}` : `${stem}.${format}`;
}

export function responsiveSrcset(src, width) {
  if (!isContent(src) || !(width > 0)) return "";
  const stem = src.slice(0, -".webp".length);
  return [...WIDTHS[format].filter((candidate) => candidate < width).map((candidate) => `${stem}-${candidate}.${format} ${candidate}w`),
    ...(PHONE && width > PHONE_MAX ? [] : [`${stem}.${format} ${width}w`])].join(", ");
}
