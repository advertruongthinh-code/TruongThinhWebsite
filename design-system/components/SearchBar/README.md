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
  lấy từ chip của lưới, lọc trong kết quả, nhiều card xếp trước; bấm chip giữ đủ hàng. Tràn ngang thì mờ mép phải, chuột kéo hoặc lăn trên hàng để cuộn và nút icon mũi tên `.search-bar__more`
  (nhãn "Hiện tất cả (N)" / "Thu gọn") ghim cuối hàng mở bảng `.search-bar__all` thế chỗ hàng chip, liền hàng nhập thành một khung (mọi chip,
  xuống dòng, lúc bắt đầu mở dòng đầu đúng chỗ chip của hàng, chỗ nối là đường mảnh); mở thì hàng chip bị phủ và `inert`, không chip nào hiện hai lần. Bảng mọc lên từ đúng hàng chip và thu về bằng morph chiều cao, mũi tên đứng trên bảng, quay 180 độ cùng nhịp.
- Hàng chữ: mép trái tới chữ 18px; bên phải nút xoá chữ (khi đã gõ), vạch 22px, ô ảnh, kính lúp; nút 40px, icon 20px.
  Chữ nhập 16px. Focus: viền trong 1px `ink`; nút và link có outline 2px khi `:focus-visible`.
- Gợi ý `[data-search-hint]` đổi mỗi 3 giây bằng cú trượt dọc 450ms, dừng khi focus hoặc hover; reduced motion chỉ hiện gợi ý
  đầu. Có ảnh mà chưa gõ chữ thì hiện "Thêm chữ để lọc". Mọi câu vừa nguyên ô chữ phone 360px (khoảng 157px).
- Một ảnh: thumbnail 30px `[data-search-thumb]` thế chỗ nút ảnh, thanh không cao thêm; bấm thumbnail để thay ảnh, badge bỏ
  14px (vùng bấm 32px). Thêm ảnh khác thì thay ảnh cũ.
- Thông báo `[data-search-note]` phủ lên ô chữ 4 giây; dòng chậm, lỗi tìm ("Lỗi tìm kiếm", "Lỗi tìm ảnh") giữ lại kèm nút icon vòng xoay 40px (`aria-label` "Thử lại") ở cuối ô; nút xoá chữ ẩn trong lúc đó. Gõ chữ thì tắt.
  Screen reader đọc số kết quả qua vùng `aria-live` ẩn.
- Khe CTA: link "Trao đổi ý tưởng" dưới thanh như link trang Công trình; khoảng trên và dưới thanh bằng nhau theo mắt, cụm
  tiêu đề và thanh nằm ở tâm thị giác khi cuộn tới cuối ([R4](../../../docs/specs/search-bar.md#r4-khe-cta)).
- Đổi chỗ dứt khoát theo vị trí cuộn ([R7](../../../docs/specs/search-bar.md#r7-vào-khe-dứt-khoát)): `dock.mjs` chọn một trong ba chỗ mỗi frame cuộn. Vào và ra khe CTA: Web Animations morph bề rộng, bóng, hàng chip (CSS transition mất khi chuyển parent). Vào khe đầu trang (cả lúc tải sau lớp phủ): khối kéo dài từ ô vuông 49px ra đủ khe (`.is-stretching`, nội dung bị cắt trong viền). Khi cả thanh đã khuất dưới header, thanh nổi bay lên từ mép dưới (`.search-host.is-rising`).
- Nhịp: mọi chuyển động của thanh (bề rộng, hàng chip, bảng, khe, bay lên, trượt xuống) theo nhịp card masonry, `--search-morph` = `--dur-card` 400ms, `--search-ease` = `ease` (owner 2026-11-23); trượt về đầu lưới cùng 400ms; chữ gợi ý và thông báo `--dur-fade` `--ease-expo-out` như ảnh lưới hiện dần.
- Tìm xong về đầu lưới ([R9](../../../docs/specs/search-bar.md#r9-tìm-xong-về-đầu-lưới)): `glideToGrid` trong `masonry/runtime.mjs` gọi `TruongThinhMotion.glideTo` (`--dur-card` 400ms, đường `--ease-card`, cùng lúc card trượt).
- Trang gốc, trang nhóm, trang sản phẩm có thanh; đang lọc thì tìm trong bộ lọc ([R8](../../../docs/specs/search-bar.md#r8-thanh-khi-đang-lọc-tìm-trong-nhóm)). Trang card có `data-search-off`, khe ẩn, thanh nổi trượt xuống rồi ẩn (`.search-host.is-off`).
- Nhóm không có kết quả: thông báo "Nhóm này chưa có" kèm nút chữ "Tìm tất cả" (`.search-bar__action`, gạch chân 2px) phủ cả hàng nhập; `.has-wide-note` tạm ẩn nút ảnh và kính lúp.
- Thanh nổi đẩy nút nổi lên bằng `--search-bar-offset`; `body[data-search-place]` và `--search-block-h`
  giữ chỗ cho nút ([Floating CTA](../FloatingCta/README.md)). Mọi máy cảm ứng (phone, tablet, dọc và ngang): thanh nổi và nút chung một hàng cách đáy 16px,
  thẳng mép lưới (`--masonry-outer` đặt trên `.detail-page`), `.search-host` chừa làn nút 60px bằng padding phải. Bàn phím điện thoại mở
  thì hàng chip gập lại. Ẩn khi menu hoặc detail view mở. Giảm chuyển động: đổi trạng thái ngay.

Preview: trên là thanh nổi, dưới là thanh dừng trong khe CTA.

## Chú thích thuật ngữ

- **Khe (dock)**: chỗ trống cố định chiều cao nơi thanh dừng, ở đầu trang hoặc dưới tiêu đề CTA.
- **Thanh nổi**: thanh cố định ở đáy màn hình khi chưa tới khe.
- **Tâm thị giác**: điểm mắt thấy là giữa, hơi cao hơn tâm hình học.
