---
title: Typography nhìn thấy theo cap-height
status: accepted
date: 2026-08-27
scope: Public site typography VI và EN
tags:
  - ui
  - typography
supersedes: []
related_specs: []
related_reports: []
---

# Typography nhìn thấy theo cap-height

## Context

Owner yêu cầu tăng weight và độ cao của toàn bộ chữ nhìn thấy trên website
Trường Thịnh (ban đầu đo theo route tương ứng của web tham khảo). Độ cao được so bằng glyph cơ
sở không dấu, không dùng dấu tiếng Việt làm chiều cao chuẩn. Brand lockup là
ngoại lệ vì title/subtitle có contract SVG và tỷ lệ riêng.

## Decision

1. Plus Jakarta Sans tiếp tục là font chính; không tải hoặc sao chép Silka.
2. Body và copy thường dùng tối thiểu `500`; display dùng `600`; nav, label,
   caption và subtitle dùng `700`.
3. Các mốc nhỏ dùng cap-height proxy: nav khoảng `11–12px`, body khoảng
   `14–15px`, label/caption khoảng `9–10px`.
4. Riêng ba portal dịch vụ Home, dòng category phía trên là subtitle và dùng
   cùng size/weight với subtitle phía dưới. Title chính lớn hơn, có tâm Y trùng
   tâm card ở mọi breakpoint; gap category → title nhỏ hơn gap title → subtitle.
   Desktop title giữ khoảng `60px`, cap-height `45px`. Theo owner override ngày
   2026-08-27, nhãn `#bang-chung` dùng `20px/700` từ `1024px`, `16px/700` tại
   `320–768px`; body dùng `16px/500` ở mọi breakpoint. Nhãn dài được phép wrap
   theo locale nhưng không tạo horizontal overflow.
5. Cùng selector và token áp dụng cho VI/EN. Layout phải giữ document overflow
   không quá `1px` tại `390px` và `1440px`.
6. Hero Home VI dùng `Làm chắc` / `Làm khác` không dấu chấm. Khoảng cách riêng
   giữa hai dòng là `0.05em`; không đổi `line-height` dùng chung và không áp dụng
   sang detail hero. Bản EN giữ `Built solid.` / `Made different.`.
7. Statement footer dùng chung trên năm route giữ nguyên font size/weight và tăng
   riêng extra line-height từ `10px` lên `14px`, tức tăng khoảng cách hai dòng
   đúng `4px` ở mọi breakpoint.

## Alternative đã cân nhắc

| Alternative | Lợi ích | Lý do reject |
| --- | --- | --- |
| Sao chép computed weight `100/400` của Silka | Con số CSS giống reference | Named face của Silka không tương đương numeric weight của Plus Jakarta Sans |
| Đo bounding box có dấu | Phản ánh chuỗi tiếng Việt thực | Dấu làm sai mục tiêu owner về độ cao thân chữ |
| Đổi toàn bộ font sang Silka | Có thể khớp metric gần hơn | Không có quyền asset/font và tăng phụ thuộc không cần thiết |

## Kiểm chứng

Canvas TextMetrics đo glyph `H`, không dùng dấu; evidence từng lần đo nằm trong PR.

Plus Jakarta Sans tự host trong `/assets/vendor/`, không tải từ Google Fonts
([phát hành tĩnh](../specs/static-release.md#r4-font-và-thư-viện-tự-host)).

## Hệ quả

- Heading và nhãn đậm hơn quyết định portal cũ; width nav tăng theo font metric.
- Header breakpoint `751–960px` giữ một hàng, nav ẩn khi thiếu chỗ
  ([shell R2](../specs/site-shell.md#r2-header-tone-thu-gọn-lockup-và-nav-desktop));
  typography và tọa độ vẫn bất biến giữa expanded/sticky.

## Lịch sử

2026-10-03 xóa `portal-typography-weight-parity` (đã supersede); bản gốc còn
trong Git history. 2026-10-10 đổi tên từ `visible-typography-espacio-parity` (gate parity
Espacio đã gỡ ở PR #148), bỏ report và evidence đo cũ; giá trị giữ nguyên.

## Chú thích thuật ngữ

- **Cap-height**: chiều cao phần chữ hoa cơ sở, không tính dấu.
- **Named face**: file font riêng đã chứa đặc tính weight của chính nó.
- **TextMetrics**: số đo glyph do Canvas API trả về.
- **Horizontal overflow**: nội dung làm document rộng hơn viewport.
