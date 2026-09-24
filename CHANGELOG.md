# Changelog

## 2026-09-24 — Bản website hiện hành

### Thêm

- Thư viện Sản phẩm quảng cáo có154 ảnh, gồm27 ảnh thêm và COCO BREEZE thay
  ảnh mobile-retail-05. Năm ảnh ChatGPT đã duyệt nằm trong28 lựa chọn cuối.
- Duyệt ảnh chi tiết, ảnh liên quan, slideshow gợi ý và phân trang mô tả VI/EN.
- Grid ảnh có thứ tự ổn định theo bộ lọc và kích thước cửa sổ.

### Thay đổi

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
