# Skeleton cuối masonry

Phần kết trang Advertising: các khung rỗng nối tiếp từ đáy ảnh thật mỗi cột,
CTA "Dấu ấn tiếp theo / dành cho thương hiệu của bạn" nằm trên. Runtime
`skeleton-flow.mjs` và `catalog-runtime.mjs` dựng khung
(`.advertising-grid__cta-frame`); CTA là `section.detail-cta` tĩnh.

## Hành vi

- Khung xếp tới đáy batch, cùng gutter với ảnh (2 đến 5 khung mỗi cột tùy
  chiều cao); cao bằng bề rộng card nhân một trong ba band ngang `0.72`, vuông
  `1`, đứng `1.32`, hai khung liền nhau trong cột khác band; mặt trong là
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
chờ ảnh bằng blur trên màu chủ đạo, không dùng khung này. Flow chạy cả khi đang
cuộn. Mọi khung của batch vẽ trên một canvas WebGL chung ở nửa độ phân giải,
nằm trên khung và dưới Kính, CTA; khung chờ ảnh primary dùng context riêng.
Khung chưa chạy hoặc mất context hiện một khung hình Flow đứng yên của chính
assignment.

Chi tiết chuyển động ở [Motion](../../motion.md#skeleton-tiếp-nối) và
[Ảnh trong card](../../motion.md#ảnh-trong-card).

Lúc skeleton mờ sang ảnh, [Kính](../Glass/README.md#hiện-và-tan-trên-ảnh-vừa-tải)
phủ đều hiện rồi tan trên khung.

## Chú thích thuật ngữ

- **Skeleton**: khung giữ chỗ không có nội dung.
- **CTA**: lời kêu gọi liên hệ.
