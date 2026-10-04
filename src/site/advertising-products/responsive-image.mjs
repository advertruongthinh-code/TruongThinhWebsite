// Width variants written by scripts/site/build-image-variants.mjs next to each content WebP.
const RESPONSIVE_WIDTHS = [480, 960];
const AVIF_PROBE = "data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAAA+gABAAAAAAAAAB0AAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABhdjAxAAAAAA5waXRtAAAAAAABAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAlbWRhdBIACgc4AAaQENBpMhAZQmMEwAA0AACQQMkcYIpq";
// Images created before the probe settles keep WebP; the probe usually settles before the first card unveils.
let responsiveFormat = "webp";
if (typeof Image === "function") {
  const probe = new Image();
  probe.onload = () => { if (probe.naturalWidth > 0) responsiveFormat = "avif"; };
  probe.src = AVIF_PROBE;
}

export function responsiveSource(src) {
  return responsiveFormat === "avif" && /^\/assets\/content\/.+\.webp$/.test(src || "") ? src.replace(/\.webp$/, ".avif") : src;
}

export function responsiveSrcset(src, width) {
  if (!/^\/assets\/content\/.+\.webp$/.test(src || "") || !(width > 0)) return "";
  const stem = src.slice(0, -".webp".length);
  return [...RESPONSIVE_WIDTHS.filter((candidate) => candidate < width).map((candidate) => `${stem}-${candidate}.${responsiveFormat} ${candidate}w`),
    `${responsiveSource(src)} ${width}w`].join(", ");
}
