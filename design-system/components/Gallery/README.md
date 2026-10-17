# Gallery ngang

Dải ảnh cuộn ngang trên trang Residential và Commercial, theo khối "The
balance within the spaces" của Espacio interior-design. Markup
`section.detail-gallery` với `[data-gallery]`, style ở `src/site/detail.css`.

## Cấu trúc

- Tiêu đề `h2` riêng một hàng, canh giữa, `clamp(2.5rem, 4.45vw, 4rem)`
  (64px ở 1440px), weight 300, line-height 1.1, chữ thường kiểu câu; phần cuối
  nghiêng trong `<i>`. Không nút prev/next.
- Swiper 14 cùng tham số gallery Espacio: `slidesPerView: "auto"`, speed
  500ms, khe 20px (dưới 600px 10px), grab cursor, thả tay hút về ảnh, wheel
  ngang; track thụt `gutter`, ảnh tràn ra mép.
- Dưới track hàng chấm canh giữa, cách caption 18px: chấm 8px cách 8px, chấm
  thường đen 20%, chấm active `ink`, bấm để tới ảnh; dưới 600px chấm động.
- Mọi ảnh cao `min(50vw, 45rem)` (tới 750px `75vw`), rộng theo tỷ lệ thật
  của ảnh (`height` cố định, `width: auto`, giữ `width`/`height` trên `img`),
  không crop. Khung `.detail-gallery__media` nền `media-loading-surface`;
  hover không zoom, chỉ con trỏ grab.
- Caption `figcaption` dưới ảnh 10px, label 0.8rem, 700, hoa, màu `ink`;
  không nới bề rộng figure, chữ dài xuống dòng.
- `detail.js` tải Swiper khi gallery gần viewport; mũi tên trái/phải trên
  track chuyển ảnh. Chưa có Swiper thì track cuộn native (touch, bàn phím).
  Quy tắc thêm, xóa `figure` ở [ba trang con](../../../docs/specs/detail-pages.md#r4-nội-dung-vien-và-hook).

## Chú thích thuật ngữ

- **Scroll snap**: cuộn dừng đúng vào từng item; proximity chỉ hút khi dừng gần.
- **Native**: dùng tính năng trình duyệt, không cần thư viện.
- **Chấm động**: dynamic bullets của Swiper, chỉ hiện vài chấm quanh chấm active, chấm xa thu nhỏ.
