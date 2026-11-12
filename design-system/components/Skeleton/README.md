# Skeleton cuối masonry

Nguồn: `src/site/masonry/skeleton-flow.mjs`, `src/site/masonry/skeleton-flow-worker.mjs`; CSS `.masonry-grid__cta-frame`; spec [Skeleton](../../../docs/specs/advertising-skeleton.md).

Phần kết trang Advertising: các khung rỗng nối tiếp từ đáy ảnh thật mỗi cột,
CTA "Dấu ấn tiếp theo / dành cho thương hiệu của bạn" nằm trên. Runtime
`masonry/skeleton-flow.mjs` và `masonry/runtime.mjs` dựng khung
(`.masonry-grid__cta-frame`); CTA là `section.detail-cta` tĩnh.

## Hành vi

- Khung xếp tới đáy batch, cùng gutter với ảnh (2 đến 5 khung mỗi cột tùy
  chiều cao); cao bằng bề rộng card nhân một trong ba band ngang `0.72`, vuông
  `1`, đứng `1.32`, hai khung liền nhau trong cột khác band; khung không chừa
  chỗ tên vì tên card nằm trong ảnh ở mọi lưới, kể cả trang Công trình.
  Khung rộng một cột, trừ band ngang `wide` (cao `0.5` bề rộng, tỷ lệ w/h 2,
  trên tỷ lệ vàng): ở hai trang lưới chính (Advertising, Công trình), từ lưới 3
  cột, khung `wide` trải hai cột kề theo luật hai cột của
  [Masonry](../Masonry/README.md#hình-học), chỉ khi hai đáy bằng nhau hoặc khung
  một cột cuối của cột thấp hơn kéo dài đúng phần chênh. Batch cuối related ở
  detail và điện thoại chỉ có khung một cột. Dưới card hai cột, khung đầu của cả
  hai cột bắt đầu cách đáy card một gutter. Masonry không còn lỗ nên batch không có
  khung lấp lỗ; khung không bao giờ để lỗ phía trên nó. Mặt trong là
  gradient Flow nhiều màu chảy chậm (WebGL, 12 preset). Mỗi khung bốc preset,
  pha, chiều chảy và tốc độ ngẫu nhiên lúc vào viewport, tránh preset của khung
  kề; trùng preset thì pha lệch xa. Giữ màu tới khi trang ổn định lại.
- Khung không nhận focus, `aria-hidden`; không shimmer. Chỉ khung trong viewport
  và tab đang hiện mới chuyển động.
- CTA: Plus Jakarta Sans 600, line-height 1.2, khung tối đa 78rem; EN là "The
  next mark / for your brand". Tại cuối trang, chân chữ dòng cuối nằm giữa
  viewport, nút cách một gap; tiêu đề không nhỏ hơn `1.3rem`, chừa `0.15em`
  phía trên để dấu dòng đầu không bị cắt khi CTA chỉ cao bằng chữ (chữ 200%,
  xoay ngang). Card cuối mỗi cột
  kéo tới đáy batch, ngay trên footer, không mỏng hơn `0.25` bề rộng card
  ([CTA giữa viewport](../../../docs/specs/advertising-cta-center-parallax.md)).

- [Kính](../Glass/README.md) dạng cung phủ batch làm nền cho CTA: card phía trên
  vẫn nét, nhòe tăng dần vào cụm CTA, đáy batch trắng tuyệt đối.

Cùng khung này phủ kín ảnh [primary](../Primary/README.md) đang chờ ảnh, đủ độ
đậm (không nhạt dần), gỡ sau khi ảnh hiện; bốn màu Flow lấy từ chính ảnh đó
(build trích bằng k-means), batch giữ 12 preset. [Media card](../MediaCard/README.md)
trên PC chờ ảnh bằng chính khung này, cũng với bốn màu của ảnh; điện thoại dùng lớp màu. Flow chạy cả khi đang
cuộn. Mỗi vùng vẽ trên một canvas WebGL chung ở nửa độ phân giải, là con cuối của vùng đó, nằm trên khung và dưới Kính, CTA:
batch, card lưới chính, card lưới related (tối đa 3 context); không giới hạn số khung vẽ. Khung chờ ảnh primary dùng context riêng.
Khung chưa chạy hoặc mất context hiện một khung hình Flow đứng yên của chính
assignment.

Chi tiết chuyển động ở [Motion](../../motion.md#skeleton-tiếp-nối) và
[Ảnh trong card](../../motion.md#ảnh-trong-card).

Lúc skeleton mờ sang ảnh, [Kính](../Glass/README.md#hiện-và-tan-trên-ảnh-vừa-tải)
phủ đều hiện rồi tan trên khung.

## Chú thích thuật ngữ

- **Skeleton**: khung giữ chỗ không có nội dung.
- **CTA**: lời kêu gọi liên hệ.
