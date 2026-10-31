// Các cỡ JXL progressive do scripts/site/build-image-variants.mjs ghi cạnh mỗi WebP nội dung (progressive-loading R1).
// Site chỉ trỏ tới JXL, không định dạng dự phòng (owner 2026-10-27).
const RESPONSIVE_WIDTHS = [240, 480, 960, 1600, 2048];
const isContent = (src) => /^\/assets\/content\/.+\.webp$/.test(src || "");

// needed: số pixel thật cần vẽ; có thì lấy cỡ nhỏ nhất đủ nét, không thì bản gốc. width: bề rộng bản gốc.
export function responsiveSource(src, width, needed) {
  if (!isContent(src)) return src;
  const stem = src.slice(0, -".webp".length);
  const fit = needed > 0 && RESPONSIVE_WIDTHS.find((candidate) => candidate < width && candidate >= needed);
  return fit ? `${stem}-${fit}.jxl` : `${stem}.jxl`;
}

export function responsiveSrcset(src, width) {
  if (!isContent(src) || !(width > 0)) return "";
  const stem = src.slice(0, -".webp".length);
  return [...RESPONSIVE_WIDTHS.filter((candidate) => candidate < width).map((candidate) => `${stem}-${candidate}.jxl ${candidate}w`),
    `${stem}.jxl ${width}w`].join(", ");
}
