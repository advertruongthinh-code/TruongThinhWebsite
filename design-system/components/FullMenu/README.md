# Full menu

Menu toàn màn hình mở từ nút menu của header: bốn nhóm route với 17 mục con,
chuyển ngôn ngữ và CTA hẹn Zalo. Markup là `dialog.site-menu`; mở bằng
`motion.js` (thuộc tính `open`, lớp `is-active`, lớp `menu-open` trên root).

## Cấu trúc

- Hàng đầu: brand lockup màu CMYK, locale `TIẾNG VIỆT` / `ENGLISH` (mục đang
  dùng gạch chân), CTA `Gọi Zalo tư vấn`, nút đóng.
- Bốn cột nhóm có số `01`–`04`, tiêu đề display và danh sách mục con;
  4/3/2/1 cột ở mặc định, 1200, 960, 578px; cột ngăn bằng viền `line`.
- Mục con dẫn tới URL canonical kèm query, không dùng section hash. Mục chữ
  hoa 700, 0.85rem, cao dòng tối thiểu 22.4px, cách nhau 15px; tiêu đề nhóm
  `menu-title` dài thì xuống dòng.
- Hàng đầu đệm 35px (25px ở max-width 1200px). Mobile đưa CTA xuống hàng thứ
  ba; 579–960px ẩn CTA như site tham chiếu
  ([menu parity](../../../docs/specs/full-menu-reference-parity.md)).

Timeline mở, đóng và page scale ở [Motion](../../motion.md#full-menu).
Preview hiện trạng thái cuối khi menu mở xong.

## Chú thích thuật ngữ

- **Locale**: ngôn ngữ đang hiển thị (VI hoặc EN).
- **Canonical URL**: địa chỉ chuẩn của một trang.
