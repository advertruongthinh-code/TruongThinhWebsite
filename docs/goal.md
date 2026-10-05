---
title: Mục tiêu dự án và hai phase
type: project
status: living
updated: 2026-10-03
related_docs:
  - STATE.md
  - ../PRODUCT.md
  - architecture/index.md
  - specs/static-release.md
  - specs/cms.md
related_decisions:
  - decisions/wrangler-deferred-until-cms.md
---

# Mục tiêu dự án và hai phase

## Mục tiêu

Xây dựng và vận hành website fullstack song ngữ VI/EN cho thương hiệu
**Nội thất, Quảng Cáo Trường Thịnh**, có hệ thống CMS để owner tự đăng nội dung.

Website là kênh thương hiệu và tạo lead: giới thiệu ba năng lực ngang hàng (nhà
ở, kinh doanh, sản phẩm quảng cáo), quy trình Khảo sát, Tư vấn, Sản xuất, Lắp
đặt, bằng chứng công trình thật, rồi dẫn khách sang Zalo hoặc đặt lịch khảo sát.
Product truth nằm ở [PRODUCT.md](../PRODUCT.md).

## Nguyên tắc hạ tầng

Ưu tiên stack free hoặc phí thấp; hướng hiện tại là Cloudflare (Workers, D1, R2)
vì khớp scaffold dormant có sẵn. Đây là ưu tiên, chưa phải provider decision:
provider, storage, region, backup và cost vẫn phải revalidate bằng tài liệu
chính thức ở CMS discovery theo [spec CMS](specs/cms.md#điều-kiện-mở-cms-phase).

Static route luôn là fallback và rollback path; CMS lỗi không được làm mất trang
public.

## Hai phase

| Phase | Trạng thái | Phạm vi | Nguồn chuẩn |
| --- | --- | --- | --- |
| 1. Static | **Đang ở phase này** | Website tĩnh VI/EN: `src/site/` build ra `.site-output/`, không cần D1, R2, Access hay CMS secret | [Static release](specs/static-release.md), [STATE](STATE.md) |
| 2. CMS | Chưa mở | Worker, D1, R2, admin private, publish bài song ngữ có ảnh và video qua layout đã duyệt | [Spec CMS](specs/cms.md) |

Việc còn mở của phase 1 (owner kiểm nhận giao diện, full-site parity, fact chưa
xác minh) được [STATE](STATE.md) theo dõi; không lặp lại ở đây.

## Điều kiện chuyển sang phase 2

Giữ nguyên năm điều kiện trong [spec CMS](specs/cms.md#điều-kiện-mở-cms-phase).
Tóm tắt: static live ổn định với rollback path đã xác nhận, owner chốt role và
workflow biên tập, kiểm lại tài liệu chính thức của provider, có accepted
decision, và owner mở explicit implementation slice. Không suy quyền activate
CMS, Wrangler hoặc đổi domain từ tài liệu này.

## Chi phí tham khảo (kiểm 2026-10-03)

Số liệu từ trang giá chính thức; kiểm lại trước khi dùng cho quyết định.

| Dịch vụ | Gói free | Ghi chú |
| --- | --- | --- |
| Workers | 100k request/ngày; file tĩnh miễn phí | Free giới hạn 10 ms CPU mỗi lượt; Workers Paid 5 USD/tháng |
| D1 | 5 GB, 5 triệu lượt đọc, 100k lượt ghi mỗi ngày | Vượt free tính theo usage |
| R2 | 10 GB, egress luôn miễn phí | Vượt free 0,015 USD/GB-tháng |

Các hướng đã xem và không chọn cho CMS: Supabase free tự pause sau một tuần
không hoạt động; Vercel Hobby chỉ cho dùng phi thương mại; Netlify không có
database và storage tích hợp.

## Chú thích thuật ngữ

- **Phase**: giai đoạn phát triển có gate riêng.
- **Static-first**: phát hành website tĩnh trước, phần dynamic sau.
- **Fallback/rollback**: đường quay về output tĩnh khi phần dynamic lỗi.
- **Dormant**: source có nhưng chưa activate.
- **Revalidate**: kiểm lại với nguồn chính thức tại thời điểm quyết định.
