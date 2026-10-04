# Filter Advertising

Hàng bộ lọc nhóm sản phẩm trong hero trang Advertising: mục `Tất cả` và sáu
nhóm. Markup tĩnh trong `src/site/advertising-products/index.html`
(`.project-filters`), runtime `catalog-runtime.mjs` cập nhật trạng thái.

## Hành vi

- Link thật (`?category=<slug>`, `Tất cả` về URL gốc); `aria-current="true"` ở
  mục đang chọn. Sáu slug theo [PRODUCT.md](../../../PRODUCT.md#capabilities-and-constraints).
- Chữ hoa 700, 1rem, màu `muted`; hover, focus và mục đang chọn đổi sang `ink`
  kèm gạch chân dày 3px, cách 4px.
- Căn giữa, rộng tối đa 53.125rem, cách đáy hero 15vh; xuống dòng khi hẹp.
- Đổi filter: card bị loại ẩn ngay, card còn lại trượt về chỗ mới (xem
  [Motion](../../motion.md#vị-trí-card-masonry)). Đổi ngôn ngữ chỉ đổi text, URL,
  ARIA trên node có sẵn.

Preview chụp từ trang chạy thật, trạng thái `Tất cả`.

## Chú thích thuật ngữ

- **Slug**: tên ngắn của nhóm dùng trong URL.
