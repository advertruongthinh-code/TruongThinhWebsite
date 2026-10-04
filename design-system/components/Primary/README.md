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
- Ảnh foreground giữ trọn tỷ lệ. Khi còn chỗ trống quanh ảnh, nền khung là bản
  sao cover của chính ảnh (`aria-hidden`, không nhận pointer) dưới
  [Kính](../Glass/README.md) dạng phủ đều.
- Nút `Xem lớn hơn` vuông 48px, viền 1px, neo phải trong vùng ảnh; mở
  [Viewer](../Viewer/README.md). Video có thêm nút tiếng.
- Cột chữ: nhãn nhóm, mô tả (chia trang khi dài), CTA `Trao đổi ý tưởng`,
  [Suggestion](../Suggestion/README.md). Không có tiêu đề ảnh.
- Ảnh liên quan xếp quanh primary bằng cùng solver masonry.

## Thumbnail media

Card nhiều media (xem [Media card](../MediaCard/README.md#nhiều-media-trong-card))
có hàng thumbnail trong cột chữ, giữa nhãn nhóm và mô tả. Card một ảnh legacy
không có hàng này. Catalog hiện chưa có card nào như vậy, nên preview chưa có.

- Hàng `flex-wrap`, gap 8px, `role="group"`, nhãn `Media sản phẩm` /
  `Product media`.
- Nút vuông 52×52px, padding 2px, viền 1px `line`, nền
  `media-loading-surface`; ảnh `object-fit: cover`. Video dùng poster và tam
  giác phát 20px ở giữa, tô trắng, viền `ink`.
- Đang chọn: `aria-current="true"`, viền 2px `ink`, padding 1px để giữ cỡ nút.
  Focus: outline 2px `ink` offset 3px.
- Nhãn từng nút: `Xem ảnh 2 trên 3: <alt>` hoặc `Xem video 1 trên 3: <alt>`;
  EN `Show image 2 of 3: <alt>`.
- Bấm thumbnail đổi media primary; primary mở ở media đang xem trên card.
- Video ở primary tự phát, tắt tiếng; nút tiếng (`Bật tiếng` / `Unmute`) ẩn
  khi item ghi không có tiếng, nút `Xem lớn hơn` ẩn khi item là video.

Rule đầy đủ: [photo browse](../../../docs/specs/advertising-photo-browse.md).

Đổi ảnh diễn ra tại chính khung ảnh: ảnh đang tải mang
[skeleton](../Skeleton/README.md), ảnh có sẵn crossfade từ ảnh đang xem
([Motion](../../motion.md#suggestion-và-detail)).

Đã duyệt, chờ code: [Kính](../../approved-designs.md#kính) phủ đều khi đổi ảnh.

## Chú thích thuật ngữ

- **Primary**: ảnh đang được xem chi tiết.
- **Solver**: thuật toán xếp vị trí ảnh.
- **Thumbnail**: ảnh nhỏ đại diện một media, bấm để chọn media đó.
- **Poster**: ảnh tĩnh hiện thay video khi video chưa phát.
