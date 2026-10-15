# Filter Advertising

Rail hai tầng trong hero trang Advertising: hàng cụm (`Tất cả` và sáu cụm) và tầng
sản phẩm có trang ([taxonomy R3, R5](../../../docs/specs/advertising-taxonomy.md#r3-rail-cụm-và-sản-phẩm)).
Build sinh markup tĩnh từ `taxonomy.mjs` vào `.project-filters` và các `.rail-chips`;
runtime `catalog-runtime.mjs` cập nhật trạng thái.

## Hành vi

- Mọi mục là link thật tới trang cụm, sản phẩm; `aria-current="true"` ở cụm
  đang chọn (cả khi lọc một sản phẩm của nó) và ở sản phẩm đang lọc.
- Cụm: chữ hoa 700, 1rem, màu `muted`; hover, focus và mục đang chọn đổi sang
  `ink` kèm gạch chân dày 3px, cách 4px. Căn giữa, rộng tối đa 53.125rem, cách
  đáy hero 15vh; xuống dòng khi hẹp.
- Sản phẩm: chữ thường 500, `muted`; hover, focus, mục đang chọn đổi `ink`, gạch
  chân 2px dưới tên. Số ảnh 0.6875rem, 700, `tabular-nums`.
- PC từ 1025px có chuột: hover hoặc focus bàn phím vào cụm hiện danh sách sản
  phẩm ngay dưới tên cụm (nền `paper`, bóng mờ, số ảnh bên phải), mờ dần và
  trượt 6px trong 0.3s `--ease`, đè lên đầu masonry. Màn khác không có danh sách.
- Chọn cụm hoặc sản phẩm: hàng chip sản phẩm của cụm hiện dưới rail, mỗi chip có
  số ảnh nhỏ. Từ 1025px hàng chip căn giữa, thay chỗ chữ "Cuộn xuống"; tới 1024px
  nằm trong luồng ngay dưới rail. `Tất cả` không có hàng chip.
- Tới 680px: rail cụm và hàng chip là hai hàng cuộn ngang tràn bề rộng màn,
  chừa 25px hai bên; chip đang chọn tự cuộn vào khung, mục nhận focus bàn phím
  tự cuộn vào trọn khung.
- Đổi filter: card bị loại ẩn ngay, card còn lại trượt về chỗ mới (xem
  [Motion](../../motion.md#vị-trí-card-masonry)). Đổi ngôn ngữ chỉ đổi text, URL,
  ARIA trên node có sẵn.

Preview chụp từ trang chạy thật, trạng thái `Tất cả` (danh sách sản phẩm ẩn tới khi hover).

## Chú thích thuật ngữ

- **Slug**: tên ngắn của nhóm dùng trong URL.
- **Cụm, sản phẩm**: tầng một và tầng hai của phân loại Advertising.
- **Chip**: link sản phẩm nhỏ trong hàng ngang dưới rail.
