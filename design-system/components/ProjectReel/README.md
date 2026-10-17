# Project reel

Dải card công trình xếp so le trên trang chủ (3 tới 6 card, hiện 6). Markup
`section.project-reel` trong `src/site/index.html`; card sinh lúc build từ
`src/site/content/project-reel.json` ([trang chủ R8](../../../docs/specs/page-home.md#r8-rail-công-trình)).

## Cấu trúc

- Lưới mỗi card một cột bằng nhau, cao tối thiểu 650px, tối đa 1730px; gap
  `clamp(1.5rem, 3.4vw, 4.1rem)`.
- Ảnh card cao 420px, `object-fit: cover`; card `--low` và `--mid` đẩy xuống
  180px tạo nhịp so le.
- Caption chữ hoa 700 0.8rem, ô vuông màu đầu dòng lặp ba: `blue` ở card
  1, 4; `orange-accent` ở card 2, 5; viền ở card 3, 6. Caption dài xuống dòng,
  lưới cao thêm thay vì cắt chữ.
- Desktop có hover: caption ẩn tới khi hover; ảnh `scale(1.15)` `0.6s
  ease-out`. Không shadow, không radius.
- Khi có motion, track trượt vào từ 60px bên phải lúc vào viewport.

## Chú thích thuật ngữ

- **Card**: khối ảnh và caption của một công trình.
- **So le**: các card lệch cao độ xen kẽ.
