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
