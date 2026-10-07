# Đã duyệt, chờ code

Thiết kế owner đã duyệt nhưng website chưa chạy. Component và
[Motion](motion.md) mô tả code hiện tại. PR code chuyển từng mục vào component
và Motion, rồi xóa mục khỏi trang này.

## Mark đổi màu: các dải mọc lên

Owner duyệt 2026-10-07 trên bản chạy thử
[Motion logo và loading ảnh](https://claude.ai/artifact/1UpyHLJCE44zNUtjvPxv9j)
(phiên bản 6). Thay chuỗi đổi `fill` hiện tại ở [Brand guideline](brand.md#motion);
state machine màu giữ nguyên.

- Mỗi lần mark đổi màu (trắng sang CMYK hoặc CMYK sang trắng), lớp màu mới
  mọc từ chân lên tới đỉnh của từng dải, phủ lớp cũ. Hình dải và góc nghiêng
  không đổi; mép lớp mới nằm ngang.
- Hai chiều giống hệt nhau về hướng, thứ tự và timing, chỉ khác màu.
- Thứ tự bắt đầu từ tam giác đen góc phải: path 1 đen, 2 vàng, 3 magenta,
  4 cyan.
- Timing giữ như chuỗi hiện tại: delay `0`, `0.07s`, `0.14s`, `0.21s`,
  duration `1s` trừ delay, đường cong `cubic-bezier(0.16, 1, 0.3, 1)`; cả bốn
  dải cùng xong ở `1s`. Mỗi dải chạy trong chiều cao riêng của nó (đỉnh path
  1 tới 4 ở `y` 190.58, 126.66, 62.73, 0 trong `viewBox` mark; chân chung
  247.85).
- Đổi hướng giữa chừng: lớp đang hiển thị thành lớp cũ, lớp mới mọc lại từ
  chân.
- Reduced motion: đổi màu ngay.

## Loading ảnh: vệt sáng lướt qua

Owner duyệt 2026-10-07 trên cùng bản chạy thử, kiểu 1. Thay vòng xoay SVG
của ảnh nội dung trong `style.css` và thanh chạy dưới đáy nút "Có thể bạn
thích" (`.advertising-photo-view__suggestion-link`). Skeleton của masonry
Advertising giữ nguyên.

- Khung giữ nền `media-loading-surface` `#2b2c2b`; một dải sáng mờ đối xứng,
  trắng `16%` ở tâm, nghiêng 60 độ (cùng góc dải mark), rộng khoảng một phần
  ba khung.
- Vệt vào từ ngoài mép trái, ra hẳn mép phải, lặp liên tục không nghỉ, mỗi
  lượt `1.6s` linear. Chỉ animate `transform`; dừng khi khung rời viewport.
- Ảnh chỉ hiện sau `load` và `decode()`: opacity `0` sang `1` trong `0.45s`
  `cubic-bezier(0.16, 1, 0.3, 1)`, để không lộ ảnh tải dở bị vỡ khối.
- Reduced motion: không lướt; khung sáng tối nhẹ trong `2s`.

## Chú thích thuật ngữ

- **Component**: khối giao diện dùng lại được, có README riêng trong Design
  System.
- **Motion**: chuyển động của giao diện, ghi ở `motion.md`.
