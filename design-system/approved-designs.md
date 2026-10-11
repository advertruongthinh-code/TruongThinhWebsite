# Đã duyệt, chờ code

Thiết kế owner đã duyệt nhưng website chưa chạy. Component và
[Motion](motion.md) mô tả code hiện tại. PR code chuyển từng mục vào component
và Motion, rồi xóa mục khỏi trang này.

## Logo crossfade khi chuyển trang

Owner duyệt 2026-10-11 ([spec](../docs/specs/logo-route-crossfade.md)). Khi chuyển trang và đổi ngôn ngữ,
mark đổi trắng và CMYK bằng crossfade opacity thay cho bốn dải mọc: trắng sang CMYK cùng veil phủ
`0.75s power4.inOut`, CMYK sang trắng cùng veil mở `1s power4.inOut` (chỉ khi trang đích có hero ảnh).
Trang hero trắng đổi tối đa một lần. Cuộn trong trang, lần vẽ đầu và full menu giữ [Brand](brand.md#motion).

## Chú thích thuật ngữ

- **Component**: khối giao diện dùng lại được, có README riêng trong Design
  System.
- **Motion**: chuyển động của giao diện, ghi ở `motion.md`.
