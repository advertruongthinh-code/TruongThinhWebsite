# Viewer ảnh Advertising

Nguồn: `src/site/masonry/detail-viewer.mjs`; CSS `.detail-dialog`; spec [Viewer zoom](../../../docs/specs/advertising-viewer-touch-zoom.md).

Hộp thoại xem ảnh toàn cửa sổ mở từ nút `Xem lớn hơn` của
[Primary](../Primary/README.md), hoặc chạm ảnh primary trên màn cảm ứng. Markup `dialog.detail-dialog` tĩnh,
`masonry/detail-viewer.mjs` điều khiển zoom và pan.

## Hành vi

- Mở `300ms`, đóng `250ms`, đường cong `--ease-viewer` ([token motion](../../motion.md#token-motion)).
- Ảnh mở từ khung primary tới mức fit. Tỷ lệ zoom liên tục từ fit tới hai lần
  cover; con lăn và phím `+`, `-` nhảy giữa ba nấc fit, cover, hai lần cover. Trên màn
  cảm ứng chụm hai ngón zoom theo tay, vặn hai ngón xoay ảnh rồi buông thì hít
  về bội 90°, chạm một lần chuyển fit và cover
  ([spec](../../../docs/specs/advertising-viewer-touch-zoom.md)). Pan theo con
  trỏ hoặc một ngón, giới hạn trong ảnh.
- Không có nút đóng và nút zoom (owner 2026-11-14): đóng bằng click nền, Escape, Back; zoom bằng con lăn,
  phím `+`/`-`, chuột giữa về fit. Mở viewer thì focus vào chính hộp thoại.
- PC: ảnh cách mép màn hình 16px; có dãy thumbnail thì dãy xếp dọc sát trái (cách mép 16px, giữa theo chiều dọc),
  nút rộng 96px (owner nới từ 60px), cao theo đúng tỷ lệ media như dãy Primary (owner 2026-11-14), chỉ hiện nút nguyên;
  ảnh cách dãy ít nhất 16px, lề phải bằng lề trái nên ảnh vẫn giữa màn hình.
- Mọi máy: nền tối `rgba(32, 33, 32, 0.85)` cộng blur `50px`; điện thoại cũng blur
  (owner 2026-10-26, trước đó không blur để giữ 60fps trên phone Android).
- Màn cảm ứng (`hover: none`, `pointer: coarse`) không hiện nút: chụm hoặc
  chạm một lần để zoom, vặn để xoay; ở fit vuốt ảnh lên hoặc xuống thì ảnh theo tay, nền nhạt
  dần, quá `15%` chiều cao hoặc vuốt nhanh thì đóng, chưa tới thì về chỗ.
- Back (nút back Android, vuốt mép iOS, nút back trình duyệt) chỉ đóng viewer.
- Đổi media bằng dãy thumbnail: dải trượt ngay, cả khi ảnh đích chưa tải; ảnh chưa decode nằm dưới lớp chờ của
  [Primary](../Primary/README.md) (PC Flow mép sắc, điện thoại lớp 4 màu), cỡ bằng ảnh fit, decode xong thì
  crossfade sang ảnh; ảnh đã tải hiện ngay (owner 2026-11-13, [media-card R6](../../../docs/specs/media-card.md#r6-media-trong-primary)).
  Flow của ảnh đích đã chạy đủ sáng ngay khi làn bắt đầu trượt vào, không lộ kính mờ rồi Flow mới hiện; thumbnail của ảnh
  chưa tải có [Vệt sáng](../LoadSweep/README.md) như dãy Primary (owner 2026-11-14).
- Nền mờ vào `300ms`, ra `250ms`, cùng đường `--ease-viewer` (`cubic-bezier(0.55, 0, 0, 1)`); reduced motion bỏ transition.

## Chú thích thuật ngữ

- **Fit**: ảnh vừa trọn trong khung, không cắt.
- **Pan**: kéo dịch ảnh khi đang phóng to.
