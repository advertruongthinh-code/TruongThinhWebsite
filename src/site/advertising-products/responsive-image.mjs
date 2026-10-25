// Các variant width do scripts/site/build-image-variants.mjs ghi cạnh mỗi WebP nội dung.
const RESPONSIVE_WIDTHS = [240, 480, 960];
const AVIF_PROBE = "data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAAA+gABAAAAAAAAAB0AAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABhdjAxAAAAAA5waXRtAAAAAAABAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAlbWRhdBIACgc4AAaQENBpMhAZQmMEwAA0AACQQMkcYIpq";
// Ảnh tạo trước khi probe xong giữ WebP; probe thường xong trước khi card đầu tiên unveil.
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
