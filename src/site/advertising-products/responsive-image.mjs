// Các cỡ JXL progressive do scripts/site/build-image-variants.mjs ghi cạnh mỗi WebP nội dung (progressive-loading R1).
// Trình duyệt không giải mã được JXL dùng WebP của cùng ảnh, có cỡ 240, 480, 960 (owner 2026-10-31: mọi trình duyệt tải được).
const WIDTHS = { jxl: [240, 480, 960, 1600, 2048], webp: [240, 480, 960] };
const isContent = (src) => /^\/assets\/content\/.+\.webp$/.test(src || "");
let format = "jxl";
let formatProbe;
// Dò bằng ảnh JXL 1x1 như script preload hero, một lần; runtime chờ promise này trước khi dựng ảnh đầu tiên.
export const imageFormatReady = () => formatProbe ??= Object.assign(new Image(), {
  src: "data:image/jxl;base64,/woAEBAJCAQBACwASxiLFcJJQR6A/gA=",
}).decode().catch(() => { format = "webp"; });

// needed: số pixel thật cần vẽ; có thì lấy cỡ nhỏ nhất đủ nét, không thì bản gốc. width: bề rộng bản gốc.
export function responsiveSource(src, width, needed) {
  if (!isContent(src)) return src;
  const stem = src.slice(0, -".webp".length);
  const fit = needed > 0 && WIDTHS[format].find((candidate) => candidate < width && candidate >= needed);
  return fit ? `${stem}-${fit}.${format}` : `${stem}.${format}`;
}

export function responsiveSrcset(src, width) {
  if (!isContent(src) || !(width > 0)) return "";
  const stem = src.slice(0, -".webp".length);
  return [...WIDTHS[format].filter((candidate) => candidate < width).map((candidate) => `${stem}-${candidate}.${format} ${candidate}w`),
    `${stem}.${format} ${width}w`].join(", ");
}
