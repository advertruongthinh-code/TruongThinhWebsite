# Brand lockup

Logo Trường Thịnh gồm mark tam giác bốn path và hai dòng chữ, dùng trong
header, full menu và footer. Markup là SVG inline `svg.brand-lockup`, không
dùng file ảnh.

## Hình học

Hình dựng tỷ lệ (H, Y = H/6, khối chữ 4Y), dạng màu, motion và state machine
màu theo [Logo](../../logo.md). Kích thước header: `brand-header-width` ×
`brand-header-height`.

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
