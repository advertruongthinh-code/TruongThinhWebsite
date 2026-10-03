---
title: Capability map cho grid Advertising và tải ảnh toàn site
type: cross-cutting
status: accepted
updated: 2026-09-25
related_docs:
  - advertising-photo-browse.md
  - advertising-skeleton-flow.md
  - ../design/content.md
---

# Capability map cho grid Advertising và tải ảnh toàn site

Owner đã duyệt intent/map ngày `2026-09-25` và duyệt cả ba module spec ngày
`2026-09-25`. [Implementation plan](../../tasks/advertising-random-media/plan.md)
và task list đã được lập, chờ owner duyệt; hành vi chưa được triển khai và chỉ
đổi khi QA đạt.

| Module id | Trách nhiệm | Phụ thuộc |
| --- | --- | --- |
| `advertising-organic-random` | Đảo vị trí card của All, sáu filter và related sau mỗi lần mở URL/F5; giữ ổn định trong cùng lượt duyệt kể cả Back dựng lại document; solver thích ứng khi catalog tăng; batch skeleton tiếp nối grid với hình học đa dạng; giữ tập ảnh gợi ý random và đổi ảnh mỗi 3 giây | — |
| `static-image-delivery` | Đo trước/sau trên Sites; tối ưu tải ảnh nội dung toàn website trong phase tĩnh, giữ kích thước và media contract | — |
| `image-loading-progress` | Dành sẵn khung đúng tỷ lệ cho ảnh nội dung toàn website; vòng tải theo byte thật không hiện số, trạng thái cache/lỗi/reduced motion; không dùng cho batch skeleton CTA | `static-image-delivery` |

Thứ tự: `advertising-organic-random` có thể đặc tả độc lập;
`static-image-delivery` xác định đường tải ảnh rồi `image-loading-progress` dùng
đường đó. Sau ba module là một lần kiểm tích hợp Advertising, các route khác,
CTA/footer, VI/EN và Sites. CMS/admin và random grid của route khác không thuộc
đợt này.

Khi ảnh mới khiến nhịp cao–thấp hoặc mức so le khó đạt, solver được chọn kết quả
gần đạt về nhịp nhìn. Đủ ảnh đúng nhóm/tag, nguyên tỷ lệ, không chồng/tràn và
CTA/footer đúng vị trí vẫn là điều kiện bắt buộc.
Trong phase tĩnh, thêm ảnh nghĩa là cập nhật catalog/media rồi build và xuất bản
lại; chưa xây giao diện upload hoặc CMS.

## Spec module đã được owner duyệt

- [`advertising-organic-random`](advertising-organic-random.md)
- [`static-image-delivery`](static-image-delivery.md)
- [`image-loading-progress`](image-loading-progress.md)

## Chú thích thuật ngữ

- **Capability map**: ranh giới trách nhiệm, phụ thuộc và thứ tự giữa các module.
- **Module id**: khóa ổn định để nối spec, plan, task và evidence.
- **Lượt duyệt**: chuỗi chuyển filter, locale và history dùng cùng thứ tự card;
  F5 hoặc mở URL trực tiếp bắt đầu lượt mới.
