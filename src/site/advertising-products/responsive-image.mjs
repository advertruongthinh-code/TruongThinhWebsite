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

// Ảnh thích ứng mạng (image-adaptive R3): mạng chậm thì chọn bậc nhẹ và đánh dấu ảnh, image-tier.js nâng lại khi mạng
// nhanh. Ảnh đã tải ở bậc thường không bao giờ bị hạ.
const isSlow = () => document.documentElement.dataset.networkTier === "slow";
const markLow = (image, normal) => Object.assign(image.dataset, { imageTier: "low", imageTierSizes: normal });
const keepNormal = (image) => image.currentSrc && !image.dataset.imageTier;

// sizes dạng px (card masonry, nút suggestion eager): bậc nhẹ cần nửa bề rộng.
export function tierSizes(image, width) {
  const normal = `${width}px`;
  if (!isSlow() || keepNormal(image)) return normal;
  markLow(image, normal);
  return `${Math.ceil(width / 2)}px`;
}

// sizes "auto, Nvw" (item card nhiều media, nút suggestion, thumbnail): bậc nhẹ dùng nửa giá trị vw dự phòng, vì không chia
// đôi được "auto"; khi nâng, image-tier.js đo bề rộng thật.
export function tierAutoSizes(image, sizes) {
  if (!isSlow() || keepNormal(image)) return sizes;
  markLow(image, sizes);
  return sizes.replace(/(\d+)vw$/, (whole, value) => `${value / 2}vw`).replace(/^auto,\s*/, "");
}

// Ảnh primary không srcset: bậc nhẹ là file -960 (hoặc -480 khi bản gốc không quá 960); đang hiện bản gốc thì giữ.
export function tierSource(image, src, width) {
  const normal = responsiveSource(src);
  const variant = width > 960 ? 960 : 480;
  if (!isSlow() || variant >= width || image.getAttribute("src") === normal) {
    ["imageTier", "imageTierSrc", "imageTierSizes"].forEach((key) => delete image.dataset[key]);
    return normal;
  }
  Object.assign(image.dataset, { imageTier: "low", imageTierSrc: normal });
  return normal.replace(/\.(avif|webp)$/, `-${variant}.$1`);
}
