---
title: Trên 60fps trên phone Android
status: accepted
date: 2026-10-11
scope: mọi trang public và hiệu ứng
tags: [performance, mobile]
supersedes:
  - https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/9bc719b/docs/decisions/a05s-frame-budget.md
related_specs:
  - ../specs/advertising-skeleton.md
  - ../specs/glass-surface.md
  - ../specs/loading-glass-and-page-entry.md
related_reports: []
---

# Trên 60fps trên phone Android

## Context

Owner thêm yêu cầu phi chức năng ngày 2026-10-10: "phải đạt trên 60 fps trên A05s". Lúc đó máy đo chuẩn là Galaxy A05s (SM-A057F, Android);
ngày 2026-10-18 owner đổi sang một phone Android khác nối adb debug, gate áp cho phone Android đang dùng đo
(số đo cũ trong repo ghi là "A05s cũ"; [phát hành tĩnh](../specs/static-release.md#gate-còn-mở)). Màn A05s tối đa 90Hz theo
[GSMArena](https://www.gsmarena.com/samsung_galaxy_a05s-review-2646p3.php). Các spec trước chỉ đặt sàn `30fps`.
Ngày 2026-10-11 owner hạ gate: "trên a05s >= 60 fps là pass", chọn fps trung bình và bỏ điều kiện long task. Bản p5
cũ: [phone-frame-budget.md tại 9bc719b](https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/9bc719b/docs/decisions/a05s-frame-budget.md).

## Decision

Trên phone Android, Chrome thật, màn chạy 90Hz: mọi trang public và mọi hiệu ứng (cuộn, mở và đóng chi tiết, viewer, menu,
skeleton, Kính) có fps trung bình của frame hiển thị (SurfaceFlinger, layer Chrome) từ `60fps` trở lên; mục tiêu
tần số quét của màn (A05s: `90fps`, `11.1ms`). Fps trung bình là số frame chia tổng khoảng present-to-present trong lượt đo, bỏ các khoảng lặng
từ `100ms` (trang đứng yên, không phải giật). Long task không còn là điều kiện pass; p5 và long task vẫn ghi để tìm
chỗ giật. Gate này thay sàn `30fps` điện thoại trong [skeleton R8](../specs/advertising-skeleton.md#r8-hiệu-năng)
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

- Cách đo: cử chỉ thật qua `adb shell input swipe`; nguồn chính `dumpsys SurfaceFlinger --timestats`
  (present-to-present của layer Chrome); phụ là probe rAF và long task như `tests/site/scroll-trace.mjs`.
  `dumpsys gfxinfo com.android.chrome` không dùng được vì Chrome vẽ qua surface riêng.
- Số đo hiện trạng 2026-10-10 (demo `main`, 3 lượt mỗi dòng) nằm ở mô tả PR thêm decision này.

## Follow-up

- Trang hoặc hiệu ứng chưa đạt: mỗi nhóm một thread sửa qua điều phối.

## Chú thích thuật ngữ

- **Decision**: lựa chọn có hiệu lực sau khi được chấp nhận.
- **Alternative**: hướng khác đã được xem xét.
- **Long task**: tác vụ chiếm main thread quá `50ms`, làm rớt frame.
- **Probe rAF**: script ghi khoảng cách giữa các `requestAnimationFrame` để tính fps.
- **p5 fps**: mức fps mà 95% frame đạt hoặc vượt.
- **Fps trung bình**: số frame chia tổng thời gian giữa các frame trong lượt đo.
- **SurfaceFlinger**: dịch vụ Android ghép và đưa frame lên màn.
- **Follow-up**: việc cần làm tiếp theo.
