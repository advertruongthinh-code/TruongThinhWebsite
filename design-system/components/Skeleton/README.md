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
  next mark / for your brand". Sau CTA chỉ 1 đến 2 gutter.

Chi tiết chuyển động ở [Motion](../../motion.md#skeleton-tiếp-nối).

## Chú thích thuật ngữ

- **Skeleton**: khung giữ chỗ không có nội dung.
- **CTA**: lời kêu gọi liên hệ.
