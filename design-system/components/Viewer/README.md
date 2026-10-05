# Viewer ảnh Advertising

Hộp thoại xem ảnh toàn cửa sổ mở từ nút `Xem lớn hơn` của
[Primary](../Primary/README.md). Markup `dialog.advertising-photo-dialog` tĩnh,
`photo-viewer.mjs` điều khiển zoom và pan.

## Hành vi

- Ảnh mở từ khung primary tới mức fit. Tỷ lệ zoom liên tục từ fit tới hai lần
  cover; nút và con lăn nhảy giữa ba nấc fit, cover, hai lần cover. Trên màn
  cảm ứng chụm hai ngón zoom theo tay, chạm đúp chuyển fit và cover
  ([spec](../../../docs/specs/advertising-viewer-touch-zoom.md)). Pan theo con
  trỏ hoặc một ngón, giới hạn trong ảnh.
- Nút đóng góc trái trên, cụm thu nhỏ, phóng to, thu về góc phải dưới; mỗi nút
  vuông 48px, viền 1px theo màu chữ, icon 24px nét 1.5.
- Nền nút `white`; hover và nhấn dùng `media-control-hover`,
  `media-control-active`; nút disabled nền `control-disabled-surface`, icon
  `control-disabled-icon`, không hover motion.
- Nền mờ vào `300ms`, ra `250ms`; reduced motion bỏ transition.

## Chú thích thuật ngữ

- **Fit**: ảnh vừa trọn trong khung, không cắt.
- **Pan**: kéo dịch ảnh khi đang phóng to.
