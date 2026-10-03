# Pairwise layout và motion parity

## Layout parity

- Matrix: 3284 comparison contracts; 5 configured route pairs; 5 canonical viewports; 2 preferences; mouse/touch theo viewport.
- Full-page `body` và selector-pair header/nav/menu/main/hero/sections/gallery/filter/footer có contract riêng. Broad runtime DOM inventory tắt; box ngoài 864 source candidate đã khai báo không là candidate, candidate chưa map vẫn blocker.
- Full-page chỉ chấm hình học ngang; main-sections chấm hình học ngang và khoảng cách giữa section. Chênh lệch dọc do nội dung không tham gia gate.

## Motion parity

- Runtime bình thường đo trigger, event order, duration, easing, frame state, cleanup và interrupt/cancel. Reduced-outcome chỉ chấm before/end/cleanup, bỏ timing, easing và event lifecycle.
- Target tương tác nhìn thấy dùng crop gồm pixel nằm trọn trong target. Chỉ bốn shutter được so locator PNG khi offscreen; mọi offscreen khác blocker và pixel diff vẫn yêu cầu zero-pixel tuyệt đối.

## Navbar parity

- Contract gồm top, menu-open, scroll; 390 và 1440 thuộc pilot. Pseudo hover local `::after`, live `::before` nằm trong fingerprint.
- Fresh live reference ngày `2026-08-27` đã đo 180 URL sitemap, 16
  viewport/input mode và exact scroll contract; xem
  [audit navbar runtime](../archive/reports/research-espacio-navbar-runtime-2026-08-27.md). Kết quả
  này không đổi trạng thái pairwise `NOT PASS`.

## Hover/focus parity

- Mouse hover/focus có contract riêng. Hover touch là blocker, không thực thi giả.

## Missing coverage

- 864 A_M candidates thuộc đúng 5 route canonical; mỗi candidate chưa có exact runtime pair vẫn là blocker.
- Project detail là blocker cụ thể: chưa có local slug đã biết và runtime template correspondence chưa verify.
- 1:1 chưa đạt khi còn bất cứ `fail` hoặc `blocked`.

## Chú thích thuật ngữ

- **Pairwise**: so sánh local và live cùng state.
- **Blocked**: thiếu điều kiện bắt buộc, không được claim parity.
- **Contract fingerprint**: hash điều kiện comparison.
