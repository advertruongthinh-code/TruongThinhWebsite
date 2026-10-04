# Masonry Advertising

Lưới ảnh sản phẩm so le trên trang Advertising. Vị trí do
`layout-core.mjs` tính (thuần, không đọc DOM), `catalog-runtime.mjs` mount và
ảo hóa; engine chuyển vị trí là `masonry-layout`.

## Hình học

- Lề ngoài 15/25/35px (viewport `<= 750`, `<= 1200`, lớn hơn); khoảng giữa
  cột 15/25/35px (`<= 960`, `<= 1200`, lớn hơn). Nội dung tối đa 1500px.
- Số cột: `C = min(4, max(2, floor((gridWidth + G) / (220 + G))))`; mỗi ảnh
  rộng đúng một cột, cao theo tỷ lệ gốc.
- Không spacer, không giãn gutter, không crop để giả so le. Rule stagger và
  chống nhịp gạch: [GRID-R4](../../../docs/specs/advertising-grid-span-organic.md).
- Chỉ mount card gần viewport; list có `aria-posinset`, `aria-setsize`; Tab
  vẫn đi qua được phần chưa mount.
- Không có JavaScript: sáu card tĩnh trong HTML vẫn hiện.

Chuyển vị trí ở [Motion](../../motion.md#vị-trí-card-masonry). Preview chụp
viewport 1440px với seed cố định.

## Chú thích thuật ngữ

- **Ảo hóa**: chỉ mount các card gần viewport.
- **Seed**: giá trị khởi tạo để thứ tự ngẫu nhiên lặp lại được.
