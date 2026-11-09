# Masonry Advertising

Nguồn: `src/site/advertising-products/layout-core.mjs`, `src/site/advertising-products/layout-worker.mjs`, `src/site/advertising-products/mount-budget.mjs`; CSS `.advertising-grid`, `.advertising-grid--captioned`; spec [Masonry](../../../docs/specs/advertising-masonry.md).

Lưới ảnh sản phẩm so le trên trang Advertising. Vị trí do
`layout-core.mjs` tính (thuần, không đọc DOM), `catalog-runtime.mjs` mount và
ảo hóa; engine chuyển vị trí là `masonry-layout`.

## Hình học

- Lề ngoài 15/25/35px (viewport `<= 750`, `<= 1200`, lớn hơn); khoảng giữa
  cột 15/25/35px (`<= 960`, `<= 1200`, lớn hơn). Masonry rộng hết viewport trừ
  lề ngoài, không giới hạn bề rộng tối đa.
- Số cột: `C = min(4, max(2, floor((gridWidth + G) / (220 + G))))`; ảnh rộng
  một cột, cao theo tỷ lệ gốc.
- Card hai cột (owner 2026-11-09, mọi masonry kể cả related và Công trình):
  ảnh bìa ngang `w/h >= 1.618` (tỷ lệ vàng) rộng hai cột cộng một gutter khi
  `C >= 3` (1440px: 667.5px). Card đứng ở cột thấp nhất, trải sang cột kề có
  top thấp hơn; nếu phải chừa lỗ quá nửa cột (158px ở 1440) dưới card thì giữ
  một cột. Điện thoại 2 cột: mọi card một cột.

| Viewport | Lề ngoài | Cột | Gutter | Rộng card |
| ---: | ---: | ---: | ---: | ---: |
| 320 | 15 | 2 | 15 | 138 |
| 390 | 15 | 2 | 15 | 173 |
| 768 | 25 | 3 | 15 | 229 |
| 1024 | 25 | 4 | 25 | 225 |
| 1440 | 35 | 4 | 35 | 316 |

Đo trên website ngày 2026-10-04.
- Không spacer, không giãn gutter, không crop để giả so le. Rule stagger và
  chống nhịp gạch: [masonry R6](../../../docs/specs/advertising-masonry.md#r6-đặt-card-và-chuyển-vị-trí).
- Chỉ mount card gần viewport; list có `aria-posinset`, `aria-setsize`; Tab
  vẫn đi qua được phần chưa mount.
- Không có JavaScript: sáu card tĩnh trong HTML vẫn hiện.

## Tên card Công trình

Trang Công trình mount cùng masonry với `captions: true` (lưới
`.advertising-grid--captioned`, owner 2026-11-09), theo `/en/projects` của Espacio:

- Tên dưới media (dưới dải chấm nếu có), luôn hiện ở mọi viewport: chữ hoa
  `0.8rem` 700, line-height 1.4, màu `ink`, cách media 10px, canh trái, một dòng
  cắt "…".
- Chỗ tên nằm trong hình học: card cao thêm `10px + 1.12rem + 7px` (34,92px khi
  chữ gốc 16px); khung skeleton chừa cùng chiều cao dưới mỗi khung; card tạm chỉ
  phủ phần media.
- Chuột thật hover hoặc focus bàn phím: gạch chân 3px cách chữ 4px như link
  navbar ([gạch chân chạy](../../motion.md#motion-theo-bề-mặt-ui)). Không lớp tối,
  không zoom.

Chuyển vị trí ở [Motion](../../motion.md#vị-trí-card-masonry). Preview chụp
viewport 1440px với seed cố định.

## Chú thích thuật ngữ

- **Ảo hóa**: chỉ mount các card gần viewport.
- **Seed**: giá trị khởi tạo để thứ tự ngẫu nhiên lặp lại được.
