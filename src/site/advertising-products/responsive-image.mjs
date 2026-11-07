// Các cỡ JXL progressive do scripts/site/build-image-variants.mjs ghi cạnh mỗi WebP nội dung (progressive-loading R1).
// Trình duyệt không giải mã được JXL dùng WebP của cùng ảnh, có cỡ 240, 480, 960 (owner 2026-10-31: mọi trình duyệt tải được).
const WIDTHS = { jxl: [240, 480, 960, 1600, 2048], webp: [240, 480, 960] };
// Cỡ tới 960 luôn là WebP: A04s giải mã WebP 480 hết 17ms, JXL 47ms; 960 là 28ms so với 87ms (owner chọn 2026-11-07).
// Cỡ lớn hơn và bản gốc giữ JXL vì WebP nặng gần gấp đôi. Trình duyệt nhận định dạng theo nội dung file nên trộn được.
const WEBP_UNTIL = 960;
const extension = (width) => width <= WEBP_UNTIL ? "webp" : format;
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
  return fit ? `${stem}-${fit}.${extension(fit)}` : `${stem}.${format}`;
}

export function responsiveSrcset(src, width) {
  if (!isContent(src) || !(width > 0)) return "";
  const stem = src.slice(0, -".webp".length);
  return [...WIDTHS[format].filter((candidate) => candidate < width).map((candidate) => `${stem}-${candidate}.${extension(candidate)} ${candidate}w`),
    `${stem}.${format} ${width}w`].join(", ");
}
