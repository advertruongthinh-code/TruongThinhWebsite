# Full menu

Menu toàn màn hình mở từ nút menu của header: bốn nhóm route với 17 mục con,
chuyển ngôn ngữ và CTA hẹn Zalo. Markup là `dialog.site-menu`; mở bằng
`motion.js` (thuộc tính `open`, lớp `is-active`, lớp `menu-open` trên root).

## Cấu trúc

- Hàng đầu: brand lockup màu CMYK, locale `TIẾNG VIỆT` / `ENGLISH` (mục đang
  dùng gạch chân), CTA `Gọi Zalo tư vấn`, nút đóng.
- Bốn cột nhóm có số `01`–`04` cùng tiêu đề nhỏ (loại nhóm: Không gian,
  Sản phẩm, Về chúng tôi; 700 chữ hoa), tiêu đề lớn chỉ tên nhóm (Nhà ở, Kinh
  doanh, Quảng cáo, Trường Thịnh) nên gọn một dòng, và danh sách mục con;
  4/3/2/1 cột ở mặc định, 1200, 960, 578px; cột ngăn bằng viền `line`.
- Mục con dẫn tới URL canonical kèm query, không dùng section hash. Mục chữ
  hoa 700, 0.85rem, cao dòng tối thiểu 22.4px, cách nhau 15px; tiêu đề nhóm
  `menu-title` vẫn được xuống dòng nếu cửa sổ quá hẹp.
- Hàng đầu đệm 35px (25px ở max-width 1200px). Mobile đưa CTA xuống hàng thứ
  ba; 579–960px ẩn CTA
  ([shell spec](../../../docs/specs/site-shell.md#r4-full-menu)).

## Hình học

Đo khi menu mở xong, ngày 2026-10-04 (px).

| Viewport | Cao hàng đầu | Lockup | Cột nhóm | Ghi chú |
| --- | ---: | --- | ---: | --- |
| 320, 390 | 226.97 | `230.3 × 59.58` ở 25, 25 | 1 | Locale và CTA thành hai hàng dưới lockup |
| 768 | 109.58 | `230.3 × 59.58` ở 25, 25 | 2 | Ẩn CTA |
| 1024 | 109.58 | `230.3 × 59.58` ở 25, 25 | 3 | |
| 1440 | 137.52 | `260.97 × 67.52` ở 35, 35 | 4 | |

- Nút đóng `50 × 50`. CTA `166.63 × 50`.
- Nhóm: số 12.8/17.92 weight 500, tiêu đề nhỏ cùng dòng weight 700; tiêu đề 28.8/40.32 600 chữ hoa; mục con
  13.6/22.4 700 chữ hoa. Số tới tiêu đề 15px, tiêu đề tới danh sách 30px,
  bước giữa hai mục 37.41px.
- Đường kẻ dưới hàng đầu và giữa các cột màu `line`, mở dần theo
  [Motion](../../motion.md#full-menu).

Timeline mở, đóng và page scale ở [Motion](../../motion.md#full-menu).
Preview hiện trạng thái cuối khi menu mở xong.

## Chú thích thuật ngữ

- **Locale**: ngôn ngữ đang hiển thị (VI hoặc EN).
- **Canonical URL**: địa chỉ chuẩn của một trang.
