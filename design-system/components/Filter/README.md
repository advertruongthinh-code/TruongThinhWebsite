# Filter Advertising

Rail hai tầng trong hero trang Advertising: hàng cụm (`Tất cả` và sáu cụm) và tầng
sản phẩm có trang ([taxonomy R3, R5](../../../docs/specs/advertising-taxonomy.md#r3-rail-cụm-và-sản-phẩm)).
Build sinh markup tĩnh từ `taxonomy.mjs` vào `.project-filters` và các `.rail-chips`;
runtime `catalog-runtime.mjs` cập nhật trạng thái.

## Hành vi

- Mọi mục là link thật tới trang cụm, sản phẩm; `aria-current="true"` ở cụm
  đang chọn (cả khi lọc một sản phẩm của nó) và ở sản phẩm đang lọc.
- Cụm: chữ hoa 700, 1rem, màu `muted`; hover, focus và mục đang chọn đổi sang
  `ink` kèm gạch chân dày 3px, cách 4px. Căn giữa, rộng tối đa 62.5rem, cách
  đáy hero 15vh cộng 3.25rem (một bậc trên hàng chip); xuống dòng khi hẹp.
- Sản phẩm: chữ thường 500, `muted`; hover, focus, mục đang chọn đổi `ink`, gạch
  chân 2px dưới tên. Số ảnh 0.8125rem (sàn chữ 12.5px), 700, `tabular-nums`.
- Hover cụm không mở danh sách sản phẩm (owner bỏ 2026-10-17); tầng sản phẩm
  chỉ là hàng chip.
- Chọn cụm hoặc sản phẩm: hàng chip sản phẩm của cụm hiện dưới rail, mỗi chip có
  số ảnh nhỏ. Từ 1025px hàng chip căn giữa, cách đáy hero 15vh, chữ "Cuộn xuống" vẫn
  hiện bên dưới (owner 2026-10-17); tới 1024px nằm trong luồng ngay dưới rail. `Tất cả` không có hàng chip.
- Tới 680px: rail cụm và hàng chip là hai hàng cuộn ngang tràn bề rộng màn,
  chừa 25px hai bên; chip đang chọn tự cuộn vào khung, mục nhận focus bàn phím
  tự cuộn vào trọn khung.
- Bấm cụm hoặc chip: kicker đổi chữ và hàng chip vừa hiện chạy entrance có sẵn
  ([Motion](../../motion.md#kicker-và-hàng-chip-khi-đổi-filter)).
- Đổi filter: card bị loại ẩn ngay, card còn lại trượt về chỗ mới (xem
  [Motion](../../motion.md#vị-trí-card-masonry)). Đổi ngôn ngữ chỉ đổi text, URL,
  ARIA trên node có sẵn.

Preview chụp từ trang chạy thật, trạng thái `Tất cả` (chưa có hàng chip).

## Chú thích thuật ngữ

- **Slug**: tên ngắn của nhóm dùng trong URL.
- **Cụm, sản phẩm**: tầng một và tầng hai của phân loại Advertising.
- **Chip**: link sản phẩm nhỏ trong hàng ngang dưới rail.
