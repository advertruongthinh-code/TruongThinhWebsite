# Đã duyệt, chờ code

Thiết kế owner đã duyệt nhưng website chưa chạy. Component và
[Motion](motion.md) mô tả code hiện tại. PR code chuyển từng mục vào component
và Motion, rồi xóa mục khỏi trang này.

## Cảm giác cuộn chung theo trang chủ

Owner duyệt 2026-10-06 ([spec](../docs/specs/scroll-feel.md), [card](https://app.notion.com/p/3f0332849a0e8153bb2edbde0c76b6ed)).

- Mọi trang dùng một cấu hình cuộn của trang chủ; Advertising và route con mượt như trang chủ khi đo trên PC.
- Parallax chỉ ở section có chữ lớn trên nền ảnh hoặc video: lớp media nền `data-scroll-speed="-2"` như hero trang
  chủ, chữ đi theo trang, không lộ mép ảnh. Thêm cho hero About, "Giữ nghề" trang chủ, CTA có ảnh của Residential,
  Commercial, About; bỏ ở ba ảnh About.

## Chú thích thuật ngữ

- **Component**: khối giao diện dùng lại được, có README riêng trong Design
  System.
- **Motion**: chuyển động của giao diện, ghi ở `motion.md`.
