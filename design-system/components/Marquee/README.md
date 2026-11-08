# Marquee

Nguồn: CSS `.capability-marquee`, `.marquee-line`, `.client-logo-marquee`; spec [ba trang con R10](../../../docs/specs/detail-pages.md#r10-cta-marquee-hover-và-ảnh-dưới-chữ-trắng), [trang chủ R9](../../../docs/specs/page-home.md#r9-closer-và-marquee-khách-hàng).

Hai dải chạy ngang vô tận. Preview: dải chữ năng lực của Residential, rồi dải logo khách hàng của trang chủ.

## Dải chữ

- `section.capability-marquee` > hai `div.marquee-line`, mỗi dòng các từ chữ hoa ngăn bằng chấm tròn `blue`,
  `orange-accent` xen kẽ.
- Chữ 600, chữ hoa: 40.32px ở 1440, 24px ở 390; gap bằng 1.1em (44.8px, 24px).
- Chạy `marquee 25s linear infinite`; dừng khi `motion-paused`.

## Dải logo khách hàng

- `section.capability-marquee--clients.client-logo-marquee` > `__track` > hai `__group` giống nhau, track chạy
  `translate3d(0 → -50%)` `25s linear`.
- Logo SVG tỷ lệ `200 / 80`: `151.2 × 79.2` ở 1440, `128 × 64` ở 390; dải cao 165px, 130px.
- Logo lỗi tải không hiện dấu lỗi media ([LoadSweep](../LoadSweep/README.md)).

Reduced motion: hai dải đứng yên.

## Chú thích thuật ngữ

- **Marquee**: dải chữ hoặc logo tự chạy ngang lặp vô tận.
