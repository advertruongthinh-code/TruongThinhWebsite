# Changelog

## Chưa phát hành — demo chuyển sang Cloudflare 2026-10-03

- Thêm `wrangler.static.toml` (assets-only) và `pnpm deploy:demo`; ChatGPT Sites
  không còn là đường phát hành. CMS Worker vẫn dormant.
- CTA cuối trang Advertising: chân chữ dòng cuối tiêu đề nằm giữa viewport ở mọi
  cỡ, có parallax; batch skeleton kéo tới sát footer. Footer gọn ở cửa sổ nhỏ;
  footer mọi trang còn ba icon Facebook, TikTok, YouTube.

## 2026-09-25 — Sites version 2 (bản website hiện hành)

Đã phát hành public trên Sites version 2: source GitHub `0654dca`, mirror Sites
`557da5a` chỉ gồm `dist/` và manifest. Xem
[checkpoint](https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/a3428aaff2cf1ff2f8f5a4f6804404e23ccd349b/docs/verification/release-cleanup-2026-09-24.md).

### Thêm

- Thư viện Sản phẩm quảng cáo có154 ảnh, gồm27 ảnh thêm và COCO BREEZE thay
  ảnh mobile-retail-05. Năm ảnh ChatGPT đã duyệt nằm trong28 lựa chọn cuối.
- Duyệt ảnh chi tiết, ảnh liên quan, slideshow gợi ý và phân trang mô tả VI/EN.
- Grid ảnh có thứ tự ổn định theo bộ lọc và kích thước cửa sổ.
- Trang chủ dùng ảnh portal xanh dương owner chọn; giữ kích thước ảnh, bố cục,
  lớp phủ và motion hiện hành.

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
- Cờ one-shot theo container: route enter chạy lại reveal từng word; filter và
  đổi locale tại chỗ không khởi động lại hero. Regression VI/EN route-return,
  delayed adapter, mười filter và fallback đạt.
- Build static loại asset source-only và module media build-only khỏi output.

### Giới hạn kiểm chứng

- Các focused test không thay cho full-site parity; canonical parity còn NOT PASS.
- COCO/decal còn lỗi chữ nhỏ; giữ exact phiên bản owner đã duyệt.
- Galaxy A54 thật và owner visual của các đợt cũ chưa đóng.
- Đây là snapshot phát hành theo yêu cầu owner, không kích hoạt CMS/Worker.

## Chú thích thuật ngữ

- **Snapshot**: bản source cố định được dùng cho lần phát hành.
- **Token**: giá trị thiết kế dùng chung.
- **Parity**: mức khớp với website tham khảo trong phạm vi đo.
