---
version: 1
slug: "route-vi-advertising-products"
primary_target: "route:/vi/advertising-products"
related_targets: ["route:/en/advertising-products"]
---

# Surface brief: Advertising browsing

Trang `advertising-products` ở VI và EN: filter sáu nhóm, masonry ảnh và
route con `?photo=` (primary, suggestion, viewer). Sáu URL detail cũ chỉ
chuyển hướng về `?category=`. Component ở
[Design System](../../design-system/README.md#components); hành vi ở
[detail](../../docs/specs/advertising-detail.md) và
[masonry](../../docs/specs/advertising-masonry.md).

## Visitor mode

**Experience.** Khách tìm loại sản phẩm quảng cáo gần nhu cầu điểm bán; ảnh
công trình dẫn trải nghiệm, giao diện lùi lại.

## Audience and job

- Đối tượng: chủ điểm bán, team so sánh kiosk, retail, signage, wayfinding,
  LED, lightbox, sản phẩm in.
- Việc cần làm: quét catalogue, lọc một nhóm, xem bằng chứng công trình.
- Hành động: chọn `Tất cả` hoặc một nhóm, cuộn masonry, mở ảnh, dùng CTA tư vấn.

## Direction contract

**THESIS:** Sáu nhóm sản xuất dễ quét mà không biến công trình thành catalogue
card đại trà.

**OWN-WORLD:** Paper và ink editorial; filter có nhịp, masonry media-first giữ
bằng chứng xưởng ở trung tâm.

**STORY:** Nêu năng lực quảng cáo, cho khách thu hẹp nhóm, mở một ảnh, đi tiếp
qua suggestion hoặc CTA.

**FIRST VIEWPORT:** Identity trang, filter đang chọn và ảnh hợp lệ đầu tiên;
locale và đường quay lại luôn rõ.

**FORM:** Một layout engine (`layout-core.mjs`), không solver thứ hai; card
không caption, ảnh giữ trọn tỷ lệ.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Constraints

- Giữ fallback không cần script, `role=listitem`, `aria-posinset`,
  `aria-setsize`, VI/EN, reduced motion.
- Không thêm token hay card style mới ngoài Design System.

## Chú thích thuật ngữ

- **Surface brief**: chiến lược riêng của một nhóm route cho Impeccable.
- **Masonry**: lưới ảnh xếp so le theo chiều cao ảnh.
- **Fallback**: nội dung vẫn hiện khi JavaScript chưa chạy.
