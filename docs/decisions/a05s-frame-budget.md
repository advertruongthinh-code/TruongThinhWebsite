---
title: Trên 60fps trên A05s
status: accepted
date: 2026-10-10
scope: mọi trang public và hiệu ứng
tags: [performance, mobile]
supersedes: []
related_specs:
  - ../specs/advertising-skeleton.md
  - ../specs/glass-surface.md
  - ../specs/loading-glass-and-page-entry.md
related_reports: []
---

# Trên 60fps trên A05s

## Context

Owner thêm yêu cầu phi chức năng ngày 2026-10-10: "phải đạt trên 60 fps trên A05s". A05s (SM-A057F) là máy Android
đo chuẩn ([phát hành tĩnh](../specs/static-release.md#gate-còn-mở)); màn tối đa 90Hz theo
[GSMArena](https://www.gsmarena.com/samsung_galaxy_a05s-review-2646p3.php). Các spec trước chỉ đặt sàn `30fps`.

## Decision

Trên A05s, Chrome thật, màn chạy 90Hz: mọi trang public và mọi hiệu ứng (cuộn, mở và đóng chi tiết, viewer, menu,
skeleton, Kính) có median khoảng cách frame dưới `16.7ms` (trên `60fps`), mục tiêu `11.1ms` (`90fps`), không long
task trên `50ms`. Gate này thay sàn `30fps` điện thoại trong [skeleton R8](../specs/advertising-skeleton.md#r8-hiệu-năng)
và [Kính R7](../specs/glass-surface.md#r7-hiệu-năng-và-trình-duyệt).

## Alternative đã cân nhắc

| Alternative | Lợi ích | Lý do reject |
| --- | --- | --- |
| Giữ 60fps ổn định | Dễ đạt ở màn 60Hz | A05s có 90Hz; owner yêu cầu trên 60 |
| Đo bằng CDP throttling trên cloud | Không cần PC | Chỉ là ước lượng, không thay máy thật |

## Hệ quả

### Tích cực

- Một con số chung cho mọi hiệu ứng thay các sàn riêng từng spec.

### Tiêu cực hoặc cost đã chấp nhận

- Đo cần phiên PC, adb và CDP trên máy thật. Không hạ độ phân giải hay bỏ hiệu ứng đã duyệt để đạt gate; nếu phải đổi
  thiết kế, PR báo owner kèm số đo trước.

## Evidence

- Cách đo: cử chỉ thật qua `adb shell input swipe`, probe rAF và long task như `tests/site/scroll-trace.mjs`,
  `dumpsys gfxinfo com.android.chrome`. Số đo hiện trạng nằm ở mô tả PR thêm decision này.

## Follow-up

- Trang hoặc hiệu ứng chưa đạt: mỗi nhóm một thread sửa qua điều phối.

## Chú thích thuật ngữ

- **Decision**: lựa chọn có hiệu lực sau khi được chấp nhận.
- **Alternative**: hướng khác đã được xem xét.
- **Long task**: tác vụ chiếm main thread quá `50ms`, làm rớt frame.
- **Probe rAF**: script ghi khoảng cách giữa các `requestAnimationFrame` để tính fps.
- **Follow-up**: việc cần làm tiếp theo.
