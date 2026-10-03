# Changelog

## Chưa phát hành — demo chuyển sang Cloudflare 2026-10-03

- Thêm `wrangler.static.toml` (assets-only) và `pnpm deploy:demo`; ChatGPT Sites
  không còn là đường phát hành. CMS Worker vẫn dormant.

## Chưa phát hành — hero và portal Advertising 2026-09-24

- Sửa cờ one-shot theo container: route enter chạy lại reveal từng word;
  filter và đổi locale tại chỗ không khởi động lại hero.
- Regression VI/EN route-return, delayed adapter, mười filter và fallback đạt.
- Trang chủ dùng ảnh portal xanh dương owner chọn từ bộ ChatGPT web; giữ kích
  thước ảnh, bố cục, lớp phủ và motion hiện hành.
- Hoàn tất cleanup diagnostic theo gate review Sites; giữ các consumer runtime.

## 2026-09-24 — Bản website hiện hành

Release candidate đã push GitHub; đang hoàn tất gate nguồn Sites trước deploy.
Xem [checkpoint](docs/verification/release-cleanup-2026-09-24.md).

### Thêm

- Thư viện Sản phẩm quảng cáo có154 ảnh, gồm27 ảnh thêm và COCO BREEZE thay
  ảnh mobile-retail-05. Năm ảnh ChatGPT đã duyệt nằm trong28 lựa chọn cuối.
- Duyệt ảnh chi tiết, ảnh liên quan, slideshow gợi ý và phân trang mô tả VI/EN.
- Grid ảnh có thứ tự ổn định theo bộ lọc và kích thước cửa sổ.

### Thay đổi

- Gỡ runner diagnostic cũ và helper không có caller; giữ entrypoint đang dùng,
  test contract, giao diện và motion hiện hành.

- Backup 54 ảnh của Sites version 1 cùng source archive trước deploy; giữ carousel
  dormant để thiết kế lại cho Residential/Commercial. Nối bảy regression suite
  vào lệnh QA release và loại thao tác build/hash thừa đã đối chiếu consumer.
- Dọn cây project, gom1.267 file test lịch sử vào `.tmp/legacy-parity-20260924/`
  và kiểm SHA trước/sau; bỏ ba thư mục rỗng. Giữ ảnh gốc và evidence.
- Rút STATE về snapshot hiện tại, archive bản cũ, sửa docs index/tree và link cũ.
- Build tạo sẵn22 route HTML VI/EN để Sites phục vụ trực tiếp.
- Gỡ editor skeleton tạm khỏi public build; giữ preset hiện hành. Bỏ helper
  không dùng và gom cleanup morph; LazySizes giữ theo motion contract.

- Menu toàn trang, logo và responsive theo các contract đã chốt.
- CTA cuối grid đi cùng footer; batch skeleton organic và lớp glass dùng chung.
- Impeccable extract: màu hover/active của nút mở ảnh, đóng viewer và điều khiển
  viewer dùng token chung; giữ nguyên giá trị và bố cục.

### Sửa

- Khôi phục vị trí ảnh khi Back/navbar; navbar từ detail về Tất cả.
- Primary full-span vừa vùng viewport dưới navbar; gợi ý đổi vị trí theo layout.
- Hero không replay khi lọc; navbar không tự expand khi chạm đáy.
- Lớp blur chạy sau morph, có nhịp zoom-out kéo dài.

### Giới hạn kiểm chứng

- Các focused test không thay cho full-site parity; canonical parity còn NOT PASS.
- COCO/decal còn lỗi chữ nhỏ; giữ exact phiên bản owner đã duyệt.
- Galaxy A54 thật và owner visual của các đợt cũ chưa đóng.
- Đây là snapshot phát hành theo yêu cầu owner, không kích hoạt CMS/Worker.

## Chú thích thuật ngữ

- **Snapshot**: bản source cố định được dùng cho lần phát hành.
- **Token**: giá trị thiết kế dùng chung.
- **Parity**: mức khớp với website tham khảo trong phạm vi đo.
