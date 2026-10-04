# Hero

Khối mở trang chủ: slideshow ảnh full viewport, lớp tối, tiêu đề ba lĩnh vực
và scroll cue. Markup `section.hero` trong `src/site/index.html`.

## Cấu trúc

- Cao `100svh`, tối thiểu 42rem; nền `media-loading-surface` khi ảnh chưa
  tải; chữ trắng; cách section sau `section-gap`.
- Slide chồng nhau; chỉ `.is-active` hiện. Ảnh `object-fit: cover`.
- Lớp `hero-shade`: gradient tối trên và dưới cộng phủ đen alpha 0.14 để chữ
  đọc được trên mọi ảnh.
- Ảnh đầu tải ngay với `fetchpriority="high"`; slide sau dùng `data-src`.

Zoom và chuyển slide ở [Motion](../../motion.md#text). Preview hiện slide đầu
ở trạng thái cuối (`motion-fallback`).

## Chú thích thuật ngữ

- **Full viewport**: chiếm trọn chiều cao màn hình.
- **Scroll cue**: nhãn gợi ý cuộn xuống.
