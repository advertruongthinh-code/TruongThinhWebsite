# Brand lockup

Nguồn: `src/site/assets/brand/truong-thinh-lockup.svg`, `scripts/site/sync-brand-lockup.mjs`, `src/site/partials/header.html`, `src/site/partials/menu.html`; CSS `.brand-lockup`; spec [Shell](../../../docs/specs/site-shell.md).

Logo Trường Thịnh gồm mark tam giác bốn path và hai dòng chữ, dùng trong
header, full menu và footer. Markup là SVG inline `svg.brand-lockup`, không
dùng file ảnh.

## Hình học

Hình dựng tỷ lệ (H, Y = H/6, khối chữ 4Y), dạng màu, motion và state machine
màu theo [Brand guideline](../../brand.md#logo); chuyển trang: chữ đổi ngay, mark lật theo veil
([logo đổi màu](../../../docs/specs/logo-route-crossfade.md)). Kích thước header: `brand-header-width` ×
`brand-header-height`.

## Số SVG và kích thước

- Khối chữ đo theo ink bounds của nguyên dòng, tính mọi dấu tiếng Việt. Tỷ lệ
  thân chữ (không tính dấu) subtitle/title `0.618 ± 0.005`; hai dòng cân mép
  trong `0.5px`.
- Chữ là đường vector (outline), không còn `<text>`: mỗi glyph một `path` trong
  nhóm `.brand-lockup__title`, `.brand-lockup__subtitle[data-lang="vi"]` và
  `[data-lang="en"]`. Mọi trình duyệt vẽ cùng một hình, không phụ thuộc bộ vẽ
  font của máy (owner 2026-11-15). Nhóm `en` mang `display="none"`; CSS hiện nó
  và ẩn nhóm `vi` khi `html[lang="en"]`.
- Outline dựng từ Plus Jakarta Sans 5.3.0 wght `600` ở đúng vị trí Chromium vẽ
  `<text>` cũ: title cỡ `46.68365`, `textLength="390.63185"`; subtitle cỡ
  `28.85050`, baseline `147.19920`, `textLength="390.87000"`,
  `lengthAdjust="spacing"`. Đổi chữ logo thì dựng lại outline từ các số này.
- EN dùng đúng cỡ và baseline VI; subtitle EN chỉ nén tracking để rộng bằng title.
- Chiều cao ngoài: header expanded `brand-header-height` (67.515625px, còn
  57.59375px ở max-width 1200px), sticky 49.640625px, full menu 67.515625px
  (59.578125px ở max-width 1200px). Chiều ngang theo tỷ lệ logo Trường Thịnh.

Hành vi, DOM và test ở
[shell spec](../../../docs/specs/site-shell.md#r2-header-tone-thu-gọn-lockup-và-nav-desktop).

Preview hiện trạng thái expanded đơn sắc trên nền trắng.

## Chú thích thuật ngữ

- **Mark**: phần hình của logo.
- **Lockup**: cụm mark và chữ đi cùng nhau.
- **Ink bounds**: khung bao phần mực thật của chữ, gồm dấu.
- **CTM**: ma trận biến đổi SVG từ tọa độ nội bộ ra màn hình.
