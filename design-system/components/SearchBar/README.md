# Thanh tìm kiếm

Nguồn: `src/site/search/bar.mjs`, `src/site/search/search.css`, `src/site/search/dock.mjs`; CSS `.search-host`, `.search-bar`;
spec [Thanh tìm kiếm](../../../docs/specs/search-bar.md), mock owner duyệt v8 (2026-11-21).

Thanh tìm kiếm trên mọi trang Advertising. JavaScript dựng thanh sau lưới; không có JavaScript thì CTA giữ link
"Trao đổi ý tưởng". CSS nằm trong `search.css`, trang chèn một lần khi mount.

## Hành vi

- Một khối ở ba chỗ: khe đầu trang `[data-search-dock-top]`, nổi ở đáy màn hình, khe CTA `[data-search-dock]`. Khối luôn
  nền `paper`, viền 1px `ink`, hàng chữ cao 48px (khe cao 50px); chỉ vị trí, bề rộng và bóng đổi.
- Bề rộng: dừng ở khe tới 1000px, không bóng; nổi 560px khi chưa có kết quả, 760px khi có, bóng
  `0 12px 32px rgb(0 0 0 / 18%)`; điện thoại nổi rộng màn hình trừ 16px mỗi bên. Cách đáy 35px (điện thoại 16px cộng safe-area).
- Hàng chip `[data-search-chips]` (chỉ thanh nổi, chỉ khi có kết quả): cao 44px trên hàng chữ, chữ 13px/600, khoảng 18px,
  chip đang chọn gạch chân 2px; số kết quả `sup` 10px. Không có chip "Tất cả": bấm lại chip đang chọn để về tất cả. Chip
  lấy từ chip của lưới, lọc trong kết quả. Tràn ngang thì mờ mép phải.
- Hàng chữ: mép trái tới chữ 18px; bên phải nút xoá chữ (khi đã gõ), vạch 22px, ô ảnh, kính lúp; nút 40px, icon 20px.
  Chữ nhập 16px. Focus: viền trong 1px `ink`; nút và link có outline 2px khi `:focus-visible`.
- Gợi ý `[data-search-hint]` đổi mỗi 3 giây bằng cú trượt dọc 450ms, dừng khi focus hoặc hover; reduced motion chỉ hiện gợi ý
  đầu. Có ảnh mà chưa gõ chữ thì hiện "Thêm chữ để tìm sát hơn".
- Một ảnh: thumbnail 30px `[data-search-thumb]` thế chỗ nút ảnh, thanh không cao thêm; bấm thumbnail để thay ảnh, badge bỏ
  14px (vùng bấm 32px). Thêm ảnh khác thì thay ảnh cũ.
- Thông báo `[data-search-note]` phủ lên ô chữ 4 giây; dòng chậm, tạm nghỉ giữ lại kèm nút "Thử lại". Gõ chữ thì tắt.
  Screen reader đọc số kết quả qua vùng `aria-live` ẩn.
- Khe CTA: link "Trao đổi ý tưởng" dưới thanh như link trang Công trình; khoảng trên và dưới thanh bằng nhau theo mắt, cụm
  tiêu đề và thanh nằm ở tâm thị giác khi cuộn tới cuối ([R4](../../../docs/specs/search-bar.md#r4-khe-cta)).
- Đổi chỗ theo quãng cuộn ([R7](../../../docs/specs/search-bar.md#r7-vào-khe-theo-quãng-cuộn)): `dock.mjs` tính độ vào khe `p` mỗi frame, bề rộng, bóng (`--search-lift`) và hàng chip đi theo `p`, không có morph chạy theo thời gian; ở khe, thanh treo từ đáy khe. Khe đầu trang: thanh cuộn đi cùng khe, rồi thanh nổi trồi lên từ mép dưới trong 120px cuộn, không đi ngang giữa màn hình.
- Chỉ trang gốc có thanh ([R8](../../../docs/specs/search-bar.md#r8-chỉ-trang-gốc-có-thanh)): trang con và card có `data-search-off`, khe ẩn, thanh nổi trượt xuống rồi ẩn (`.search-host.is-off`).
- Thanh nổi đẩy nút nổi lên bằng `--search-bar-offset`; `body[data-search-place]` và `--search-block-h`,
  `--search-block-right` đặt nút về đầu trang trên điện thoại ([Floating CTA](../FloatingCta/README.md)). Bàn phím điện thoại mở
  thì hàng chip gập lại. Ẩn khi menu hoặc detail view mở. Giảm chuyển động: đổi trạng thái ngay.

Preview: trên là thanh nổi, dưới là thanh dừng trong khe CTA.

## Chú thích thuật ngữ

- **Khe (dock)**: chỗ trống cố định chiều cao nơi thanh dừng, ở đầu trang hoặc dưới tiêu đề CTA.
- **Thanh nổi**: thanh cố định ở đáy màn hình khi chưa tới khe.
- **Tâm thị giác**: điểm mắt thấy là giữa, hơi cao hơn tâm hình học.
