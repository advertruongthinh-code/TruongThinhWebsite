# Primary ảnh Advertising

Khối ảnh chính khi mở một ảnh (`?photo=<id>`): ảnh lớn, nhóm, mô tả, CTA trao
đổi và suggestion. Markup khung tĩnh trong `advertising-products/index.html`
(`.advertising-photo-view__primary`), runtime điền nội dung.

## Bố cục

- Rộng `min(3, số cột)` cột masonry (`computeAdvertisingPhotoGeometry` trong
  `layout-core.mjs`).
- Bốn cột (`split`): ảnh chiếm hai cột, chữ một cột; cao bằng viewport trừ
  header, gutter và 50px để lộ hàng ảnh dưới. Hai hoặc ba cột (`pinterest`):
  ảnh trên, chữ dưới, chữ cao tối đa 28% viewport.
- Nền khung ảnh là bản sao cover và blur của chính ảnh, `aria-hidden`, không
  nhận pointer; ảnh foreground giữ trọn tỷ lệ.
- Nút `Xem lớn hơn` vuông 48px, viền 1px, neo phải trong vùng ảnh; mở
  [Viewer](../Viewer/README.md). Video có thêm nút tiếng.
- Cột chữ: nhãn nhóm, mô tả (chia trang khi dài), CTA `Trao đổi ý tưởng`,
  [Suggestion](../Suggestion/README.md). Không có tiêu đề ảnh.
- Ảnh liên quan xếp quanh primary bằng cùng solver masonry.

Rule đầy đủ: [photo browse](../../../docs/specs/advertising-photo-browse.md).

Đã duyệt, chờ code: [Mở ảnh tại chỗ](../../approved-designs.md#mở-ảnh-tại-chỗ).

## Chú thích thuật ngữ

- **Primary**: ảnh đang được xem chi tiết.
- **Solver**: thuật toán xếp vị trí ảnh.
