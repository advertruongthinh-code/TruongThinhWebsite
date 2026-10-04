# Gallery ngang

Carousel ảnh cuộn ngang trên trang Residential và Commercial.
Markup `section.detail-gallery` với `[data-gallery]`, style ở
`src/site/detail.css`.

## Cấu trúc

- Đầu khối: tiêu đề nhãn bên trái, hai nút prev/next 2.7rem, viền `line`,
  hover nền `ink` chữ `white`; nút có nhãn ARIA. Nút đang tròn, lệch ngôn ngữ
  vuông của Design System; chờ sửa ở website.
- Track cao `min(50vw, 45rem)`, padding ngang `gutter`, gap 20px, scroll snap
  giữa, kéo được bằng chuột.
- Item rộng `min(32vw, 29rem)`, nền `media-loading-surface`, caption chữ hoa
  trên ảnh; hover zoom ảnh.
- Cuộn native, không Swiper: nút gọi `scrollBy`, chuột kéo bằng pointer
  event, touch cuộn tự nhiên (`detail.js`). Gallery một item thì bỏ control.
  Quy tắc thêm, xóa `figure` ở [Content](../../content.md#gallery-và-card).

## Chú thích thuật ngữ

- **Scroll snap**: cuộn dừng đúng vào từng item.
- **Native**: dùng tính năng trình duyệt, không cần thư viện.
