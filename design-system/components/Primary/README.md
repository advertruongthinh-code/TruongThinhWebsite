# Primary ảnh Advertising

Khối ảnh chính khi mở một ảnh (`?photo=<id>`): ảnh lớn, nhóm, mô tả, CTA trao
đổi và suggestion. Markup khung tĩnh trong `advertising-products/index.html`
(`.advertising-photo-view__primary`), runtime điền nội dung.

## Bố cục

- Rộng `min(3, số cột)` cột masonry (`computeAdvertisingPhotoGeometry` trong
  `layout-core.mjs`).
- Bốn cột hoặc màn hình ngang (`split`): ảnh bên trái, chữ một cột bên phải,
  cao bằng viewport trừ header và gutter; bốn cột thì trừ thêm 50px để lộ hàng
  ảnh dưới. Hai hoặc ba cột trên màn hình dọc (`pinterest`): ảnh trên, chữ
  dưới, chữ cao tối đa 28% viewport.
- Ảnh foreground giữ trọn tỷ lệ. Khi còn chỗ trống quanh ảnh, nền khung là bản
  sao cover của chính ảnh (`aria-hidden`, không nhận pointer) dưới
  [Kính](../Glass/README.md) dạng phủ đều.
- Nút `Xem lớn hơn` vuông 48px, viền 1px, neo phải trong vùng ảnh; mở
  [Viewer](../Viewer/README.md). Màn cảm ứng ẩn nút này, chạm đúp ảnh để mở. Video có thêm nút tiếng.
- Cột chữ: nhãn nhóm, mô tả (chia trang khi dài), CTA `Trao đổi ý tưởng`,
  [Suggestion](../Suggestion/README.md). Không có tiêu đề ảnh.
- Mô tả dài chia trang trọn dòng. Từ 2 đến 5 trang, dưới mô tả là hàng chấm:
  nút 24px, chấm tròn 8px viền 1px `ink`, trang đang xem tô `ink`; bấm chấm để
  nhảy trang, focus outline 2px `ink`. Từ 6 trang là chữ `n / N` cỡ 0.75rem.
  Quẹt ngang và phím mũi tên vẫn lật trang.
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
- Video ở primary tự phát, tắt tiếng, lặp, player theo trang pin Pinterest:
  bấm video phát/dừng; đang dừng hiện biểu tượng phát 48px trắng giữa video.
  Dải gradient đáy 128px (đen 0.4 lên trong suốt, lề 24px) gồm nút phát/dừng
  16px, thời gian `0:02 / 0:03` (16px đậm trắng, tổng mờ 0.6), nút tiếng và
  thanh âm lượng 80px bên phải, thanh tua dưới cùng (track 4px trắng 0.24,
  phần đã chạy và núm 12px trắng 0.5). Dải hiện khi chuột trên video, khi
  focus hoặc khi dừng; cảm ứng luôn hiện. Thanh âm lượng mở khi trỏ vào nút
  tiếng. Nút tiếng và thanh âm lượng ẩn khi item ghi không có tiếng, nút
  `Xem lớn hơn` ẩn khi item là video.

Rule đầy đủ: [detail](../../../docs/specs/advertising-detail.md).

Đổi ảnh diễn ra tại chính khung ảnh: ảnh đang tải mang
[skeleton](../Skeleton/README.md), ảnh có sẵn crossfade từ ảnh đang xem
([Motion](../../motion.md#suggestion-và-detail)).

Trong lúc đổi ảnh, [Kính](../Glass/README.md#hiện-và-tan-trên-ảnh-vừa-tải) phủ
đều hiện rồi tan trên khung ảnh.

## Chú thích thuật ngữ

- **Primary**: ảnh đang được xem chi tiết.
- **Solver**: thuật toán xếp vị trí ảnh.
- **Thumbnail**: ảnh nhỏ đại diện một media, bấm để chọn media đó.
- **Poster**: ảnh tĩnh hiện thay video khi video chưa phát.
