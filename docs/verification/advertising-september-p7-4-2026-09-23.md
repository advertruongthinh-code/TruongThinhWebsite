# Advertising P7.4 — sửa lỗi ưu tiên

Ngày: 2026-09-23. Local preview: port8787. Không commit/push/deploy.

Checkpoint lịch sử. [P7.5](advertising-september-p7-5-2026-09-24.md) thay
contract navbar bằng All/A-offset/B-center, phục hồi lingering và kiểm lại
CTA khi vào từ route khác. Không dùng PASS P7.4 để bỏ qua lỗi owner báo sau đó.

## Đã sửa và kiểm tra

1. Navbar từ photo giữ category, anchor và scroll của grid nguồn. Trước sửa,
   fixture office-wayfinding đi từ scroll1150 sang1243 và category All;
   sau sửa Back/navbar đều về1150, giữ category và batch preset.
2. Bỏ rerandom khi mở photo. Geometry skeleton vốn deterministic: chưa có
   bằng chứng random preset là nguyên nhân đổi vị trí cuộn. Native scroll
   còn chịu CSS smooth dù yêu cầu instant; sửa instant và unlock để không trôi.
3. Border nút gợi ý trong suốt từng để lộ nền đen bên dưới. Background nay
   clip tại padding-box, active vẫn border đen. Filter click được xử lý cục bộ,
   không bubble sang routing; modified click giữ hành vi browser.
4. Background blur bắt đầu sau foreground morph finish; cancel/reset giữ
   lifecycle. Contract này thay erase25%/linger của R5 trước đây.
5. Lớp trắng cuối skeleton phủ thêm2px và trắng đặc8px cuối; mask ellipse
   bán kính lớn có tâm phía footer, biên giữa nhô nhẹ. Không đổi glass tokens.

## Evidence hiện tại

- `pnpm prepare:site`: PASS.
- `node tests/site/advertising-products-lifecycle.test.mjs`: PASS.
- `node tests/site/advertising-return-p74.e2e.mjs`: PASS sáu scenario: Back/navbar
  tại1567 và920; CTA/footer/reload/white-edge tại1567 và390, cao910.
- `node tests/site/advertising-hero-once.e2e.mjs`: PASS delayed/ready/route entry,
  mười filter activation, fail-open/fallback. Chưa tái hiện hero re-arm được báo.
- `impeccable detect`: exit0.
- CTA giữ bố cục quang học hiện tại; kiểm geometry xác nhận copy nằm trước
  footer, toàn footer trong viewport và copy không trôi giữa hai random batch.

## Chưa đóng

- Chưa tái hiện chính xác vạch màu trong khoảnh khắc kéo scrollbar của owner.
  White-edge pixel proof tĩnh không thay proof compositing trong thao tác đó.
- Slideshow gợi ý4–9 ảnh và đối chiếu logo collapsed với Espacio chưa thực hiện
  trong đợt sửa ưu tiên này. Owner visual và Galaxy A54 vật lý vẫn mở.
- Case `morph-backdrop-lifecycle` trong suite transitions cũ còn assert contract
  R5 đã bị thay; không gọi suite đó là PASS. P7.4 có regression tuần tự riêng.
- Không thay kết luận full-site/parity NOT PASS bằng focused tests.

## Chú thích thuật ngữ

- **Anchor**: ảnh mốc cùng vị trí tương đối trong viewport.
- **Compositing**: trình duyệt ghép các lớp hiển thị khi cuộn/animate.
