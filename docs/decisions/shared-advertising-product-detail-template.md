---
title: Sáu trang nhóm Sản phẩm quảng cáo dùng một shared detail template
status: accepted
date: 2026-08-30
updated: 2026-09-02
scope: UI architecture for advertising product category detail pages
supersedes: []
related_specs:
  - ../specs/advertising-detail.md
  - ../specs/advertising-masonry.md
related_reports:
  - ../archive/reports/research-espacio-project-detail-templates-2026-08-30.md
  - ../archive/reports/verification-advertising-detail-compositions-109-media-2026-09-02.md
---

# Sáu trang nhóm Sản phẩm quảng cáo dùng một shared detail template

## Bối cảnh

Sản phẩm quảng cáo có sáu nhóm, mỗi nhóm cần một trang chi tiết. Nghiên cứu 45
trang con Espacio xác nhận chúng cùng dùng template family `proyecto`; khác biệt
đến từ dữ liệu, hero media và tổ hợp block nội dung.

## Decision

Sáu trang nhóm Sản phẩm quảng cáo của Trường Thịnh dùng một shared detail
template family. Mỗi trang có một composition config với thứ tự block và media
riêng; không tạo sáu template HTML/CSS/JavaScript độc lập.

Refinement được owner xác nhận intent ngày `2026-09-02` chọn sáu composition
hero ảnh từ Espacio:

| Nhóm | Reference composition |
| --- | --- |
| Kiosk & POSM | `pollenca-project` |
| Xe bán hàng | `ponent` |
| Bảng hiệu & chữ nổi | `can-molteni` |
| Bảng tên, biển văn phòng & chỉ dẫn | `lonja-de-mar-project` |
| LED, màn hình & hộp đèn | `espalmador-project` |
| In nhanh, ấn phẩm & decal | `pantry-project` |

Config partition toàn bộ pool `109` theo category; hero thuộc partition và mỗi
source xuất hiện đúng một lần trong editorial content của route tương ứng.

Reference chỉ cung cấp nhịp layout và cách tổ chức nội dung. Trường Thịnh giữ
visual language, typography, header, footer, motion, copy và media riêng; không
copy source, logo, font hoặc asset của Espacio.

## Hệ quả

- Sửa shared template phải được kiểm tra trên cả sáu trang nhóm.
- Sáu route phải khác nhau về composition nhưng cùng dùng shared block renderer.
- Build phải từ chối config thiếu, lặp hoặc tham chiếu chéo category trong pool
  `109`.
- Chỉ tách template khi shared block không còn biểu đạt đúng cấu trúc và owner
  chấp nhận một decision thay thế.
- Taxonomy, copy, facts và media từng nhóm vẫn được chốt riêng; decision này
  không tự xác nhận các nội dung đó.

## Bằng chứng

- [Report template trang chi tiết Espacio](../archive/reports/research-espacio-project-detail-templates-2026-08-30.md)
  parse toàn bộ 45 trang archive; audit live ngày `2026-09-02` xác nhận lại đủ
  `45/45` route, `38` chuỗi block, `39` hero ảnh và `6` hero video.
- Owner xác nhận hướng shared template trong discovery ngày `2026-08-30`.
- Owner xác nhận sáu composition và media partition trong interview ngày
  `2026-09-02`; owner duyệt spec/plan và implementation đạt scoped current-hash
  cùng ngày. Xem [report sáu composition](../archive/reports/verification-advertising-detail-compositions-109-media-2026-09-02.md).

## Chú thích thuật ngữ

- **Shared detail template**: một khung trang chi tiết dùng chung cho nhiều bộ
  dữ liệu.
- **Template family**: nhóm trang dùng cùng cấu trúc code nền.
- **Composition**: thứ tự và tổ hợp block tạo nhịp trình bày của một route.
- **Partition**: chia toàn bộ media thành các slot không thiếu và không lặp.
- **Block**: module nội dung có thể bật, tắt hoặc đổi thứ tự theo dữ liệu.
- **Baseline**: mốc tham chiếu để định hướng, không phải bản sao bắt buộc.
- **Owner**: người sở hữu và phê duyệt định hướng sản phẩm.
