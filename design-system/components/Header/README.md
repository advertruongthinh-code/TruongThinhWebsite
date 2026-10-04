# Header

Thanh điều hướng cố định đầu trang: brand lockup, nav ba route dịch vụ và nút
mở full menu. Markup ở mọi trang (`<header class="site-header">`), style ở
`src/site/style.css`, trạng thái do `src/site/motion.js` gắn.

## Cấu trúc

- Grid ba cột: track brand (`brand-header-track-width`), nav, nút menu 65px;
  cách cột 70px; padding `35px 35px 0`.
- Hàng cao `header-row-height`; khi thu gọn còn
  `header-collapsed-row-height`, padding dọc 10px.
- Nút menu vuông, không pill. Nav chữ hoa 700, 1rem; `motion.js` ẩn nav
  (`is-space-hidden`, `inert`) khi breakpoint tắt nó hoặc nav xuống dòng, bị
  cắt, đè lên lockup hay nút menu; nút menu luôn còn.

## Hình học

Đo trên website ngày 2026-10-04 (px).

| Width | Cao expanded | Cao sticky | Padding expanded | Padding sticky | Cách cột | Lockup expanded | Nút menu |
| --- | ---: | ---: | --- | --- | ---: | --- | --- |
| `<= 750` | 72.59 | 70.64 | `15px 15px 0` | `10px 15px` | 15 | `222.63 × 57.59` | `65 × 57.59` |
| `751–1200` | 85.39 | 81.39 | `25px 25px 0` | `10px 25px` | 25 | `222.63 × 57.59` | `65 × 60.39` |
| `> 1200` | 102.52 | 81.39 | `35px 35px 0` | `10px 35px` | 70 | `260.97 × 67.52` | `65 × 67.52` |

- Lockup sticky `191.88 × 49.64` mọi width.
- Nav ẩn tới 750px; từ 751px ba link một hàng, chữ hoa 700 16/22.4. Link
  đầu ở x 275.63 (768), 260.63 (1024), 426.28 (1440).
- Hamburger `35 × 19`, nét 3px; hover hoặc focus thì dòng trên và dưới co
  một nửa, dòng giữa giãn gấp đôi; nhấn thì nút `scale(.8)`.
- Underline nav cao 3px, cách chữ 4px; nghỉ `scaleX(0)` neo phải, hover hoặc
  đang chọn `scaleX(1)` neo trái.

## Trạng thái

| Lớp | Khi nào | Hiển thị |
| --- | --- | --- |
| mặc định | Trên hero ảnh | Nền trong, chữ trắng |
| `is-brand-inverse` | Nền tối | Lockup trắng |
| `is-ink` | Trang nền trắng | Chữ `ink` |
| `is-collapsed` | `scrollY > 100` | Nền `white`, viền dưới 1px `#d3d3d3`, chữ `#2f2f2f` |
| `is-brand-color` | Đi cùng sticky | Mark CMYK |
| `is-hidden` | Cuộn xuống giữa trang | `translateY(-100%)`; `:focus-within` luôn hiện |

Timing collapse, ẩn/hiện, FLIP lockup ở [Motion](../../motion.md#shell).

## Chú thích thuật ngữ

- **Sticky**: trạng thái header thu gọn khi đã cuộn.
- **FLIP**: đo vị trí đầu, cuối rồi nội suy bằng transform.
