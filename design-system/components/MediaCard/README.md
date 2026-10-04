# Media card

Một ô ảnh sản phẩm trong masonry Advertising. Runtime `catalog-runtime.mjs`
dựng `figure.project-tile.advertising-tile` từ `media-manifest.mjs`; không viết
tay trong HTML.

## Cấu trúc

- Link phủ cả card tới `?category=<slug>&photo=<id>`; ảnh giữ trọn tỷ lệ gốc,
  rộng đúng một cột, không crop, không caption, không tiêu đề (chỉ alt VI/EN).
- Vị trí và kích thước do masonry đặt bằng inline style (`left`, `top`,
  `width`, `height`).
- Nền `media-loading-surface` khi ảnh chưa tải; ảnh fade vào `0.6s ease-out`.
- Hover hoặc focus: ảnh `scale(1.15)` trong `600ms`, khung giữ nguyên.
- Card vừa xem có lớp phủ tối và nhãn `Vừa xem` / `Just viewed`.
- Video chạy tắt tiếng trong masonry.

Metadata ảnh ở [card nhiều media](../../../docs/specs/site-media-card-playback.md#media-card-và-detail).

Đã duyệt, chờ code: [Card đang tải](../../approved-designs.md#card-đang-tải).

## Chú thích thuật ngữ

- **Masonry**: lưới ảnh xếp so le theo chiều cao ảnh.
- **Alt**: mô tả ảnh cho người không nhìn thấy.
