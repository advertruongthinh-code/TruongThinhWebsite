# Skeleton cuối masonry

Phần kết trang Advertising: các khung rỗng nối tiếp từ đáy ảnh thật mỗi cột,
CTA "Dấu ấn tiếp theo / dành cho thương hiệu của bạn" nằm trên. Runtime
`skeleton-flow.mjs` và `catalog-runtime.mjs` dựng khung
(`.advertising-grid__cta-frame`); CTA là `section.detail-cta` tĩnh.

## Hành vi

- Ba khung mỗi cột, cùng gutter với ảnh, tỷ lệ theo nhóm ảnh; mặt trong là
  gradient màu dịu, nhạt dần xuống dưới (opacity `0.42 → 0.16 → 0.04`).
- Khung không nhận focus, `aria-hidden`; không shimmer. Chỉ khung trong viewport
  và tab đang hiện mới chuyển động.
- CTA: Plus Jakarta Sans 600, line-height 1.2, khung tối đa 78rem; EN là "The
  next mark / for your brand". Tại cuối trang, chân chữ dòng cuối nằm giữa
  viewport, nút cách một gap; tiêu đề không nhỏ hơn `1.3rem`. Card cuối mỗi cột
  kéo tới đáy batch, ngay trên footer, không mỏng hơn `0.25` bề rộng card
  ([CTA giữa viewport](../../../docs/specs/advertising-cta-center-parallax.md)).

Cùng khung này phủ kín [media card](../MediaCard/README.md) và ảnh
[primary](../Primary/README.md) đang chờ ảnh: một khung mỗi ảnh, preset chọn
theo media id, đủ độ đậm (không nhạt dần), gỡ sau khi ảnh hiện. Điện thoại chạy
tối đa 2 khung WebGL, desktop 12; khung còn lại hiện frame tĩnh của chính
preset.

Chi tiết chuyển động ở [Motion](../../motion.md#skeleton-tiếp-nối) và
[Ảnh trong card](../../motion.md#ảnh-trong-card).

Đã duyệt, chờ code: kính phủ batch đổi sang [Kính](../../approved-designs.md#kính)
dạng cung; kính trên ảnh vừa tải.

## Chú thích thuật ngữ

- **Skeleton**: khung giữ chỗ không có nội dung.
- **CTA**: lời kêu gọi liên hệ.
