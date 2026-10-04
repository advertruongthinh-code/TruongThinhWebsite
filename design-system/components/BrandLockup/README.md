# Brand lockup

Logo Trường Thịnh gồm mark tam giác bốn path và hai dòng chữ, dùng trong
header, full menu và footer. Markup là SVG inline `svg.brand-lockup`, không
dùng file ảnh.

## Hình học

- Gọi H là chiều cao mark, Y = H/6: khối chữ cao 4Y, cách mark Y, đệm trên
  dưới Y. Kích thước header: `brand-header-width` × `brand-header-height`.
- Dòng 1 tên thương hiệu, dòng 2 phụ đề `NỘI THẤT · QUẢNG CÁO`; EN là
  `INTERIORS · ADVERTISING` cùng geometry. Font 600, dấu không bị clip.
- Mark đơn sắc theo màu chữ khi expanded; sticky và full menu dùng bốn màu
  `logo-mark-*`. Màu `logo-mark-*` chỉ dùng cho mark, không dùng cho UI.
- Favicon: `src/site/assets/brand/favicon-black.svg` (light) và
  `favicon-white.svg` (dark).

## Contract LOGO-R4

Owner duyệt LOGO-R4 ngày 2026-09-20 và correction R5 cùng ngày; đã triển khai.

- Khối chữ đo theo ink bounds của nguyên dòng, tính mọi dấu tiếng Việt. Tỷ lệ
  thân chữ (không tính dấu) subtitle/title `0.618 ± 0.005`; hai dòng cân mép
  trong `0.5px`.
- SVG VI: title cỡ `46.68365`, `textLength="390.63185"`; subtitle cỡ
  `28.85050`, baseline `147.19920`. Tracking chỉ dùng `textLength` với
  `lengthAdjust="spacing"`, không `spacingAndGlyphs`, không scale ngang.
- EN dùng đúng geometry VI, không transform hay đổi cỡ theo locale; subtitle
  EN chỉ nén tracking để rộng bằng title.
- Chiều cao ngoài: header expanded `brand-header-height` (67.515625px, còn
  57.59375px ở max-width 1200px), sticky 49.640625px, full menu 67.515625px
  (59.578125px ở max-width 1200px). Chiều ngang theo tỷ lệ logo Trường Thịnh.
- Menu: mark có màu CMYK ngay frame đầu, không có pha đen. Motion header ở
  [Motion](../../motion.md#lockup-header).

Nghiệm thu đo sau `document.fonts.ready` bằng Canvas TextMetrics (font-size
1000, scale về cỡ render) và SVG CTM: tỷ lệ ink `±0.005`; khe, đệm, mép chữ
`±0.5px`; chiều cao ngoài `±0.05px`. Phủ VI/EN, desktop/mobile, header/menu,
interrupt, soft navigation, Back/Forward, reduced motion. Không đổi font, bóp
glyph hay cắt dấu để đạt sai số. DOM và test ở
[brand shell spec](../../../docs/specs/frontend-brand-shell-responsive-runtime.md).

Preview hiện trạng thái expanded đơn sắc trên nền trắng.

## Chú thích thuật ngữ

- **Mark**: phần hình của logo.
- **Lockup**: cụm mark và chữ đi cùng nhau.
- **Ink bounds**: khung bao phần mực thật của chữ, gồm dấu.
- **CTM**: ma trận biến đổi SVG từ tọa độ nội bộ ra màn hình.
