# Thanh tìm kiếm

Nguồn: `src/site/search/bar.mjs`, `src/site/search/search.css`, `src/site/search/dock.mjs`; CSS `.search-host`, `.search-bar`; spec [Tìm kiếm](../../../docs/specs/advertising-search.md#r7-thanh-tìm-kiếm).

Thanh tìm kiếm trên mọi trang Advertising, theo biến thể 1 "Đường kẻ" owner duyệt. JavaScript dựng thanh sau lưới;
không có JavaScript thì CTA giữ link "Trao đổi ý tưởng" cũ. CSS nằm trong `search.css`, trang chèn một lần khi mount.

## Hành vi

- Nổi: lớp `.search-host` cố định ở đáy màn hình, cách đáy `--gutter`, ngang giữa, rộng tối đa 760px; viền 1px `ink`,
  nền `paper`, hàng cao 60px (56px dưới 751px). Bên phải ô chữ: nút xoá chữ (chỉ khi đã gõ), vạch, nút tìm bằng ảnh,
  kính lúp; ô vuông 44px (40px dưới 751px), icon 22px nét 1.8.
- Dừng: khe `[data-search-dock]` dưới tiêu đề CTA lên trên mép thanh nổi thì thanh vào khe (`is-docked`): viền tan thành
  đường kẻ 3px, nền trong suốt trên nền CTA, chữ to hơn, "Trao đổi ý tưởng" mở bằng `clip-path` ở cuối đường kẻ (điện thoại: "Trao đổi", ẩn kính lúp).
  Thanh dừng chừa 2px phía trên và cao đúng bằng khe (72px từ 1024px, 56px dưới đó), nên CTA không đổi chiều cao.
  Vào khe 700ms `ease-card`; rời khe 150ms `ease-out`, không mờ dần.
- Không có dòng trạng thái trên màn hình (owner 2026-11-17): kết quả chỉ hiện trên lưới, không ra kết quả thì lưới giữ
  nguyên. Screen reader đọc số kết quả qua vùng `aria-live` ẩn luôn có sẵn trong thanh. Đang tìm mà bấm nút xoá chữ thì bỏ tìm.
- Khay ảnh `[data-search-tray]` (khi có ảnh): thumbnail 44px kèm nút bỏ đen 20px, bên phải "n/5 ảnh" chữ hoa 12.8px `muted`;
  thông báo về ảnh (tối đa 5 ảnh, file không dùng được, đang chậm kèm "Thử lại", tạm nghỉ) là một dòng ngắn cũng ở đây, tự
  tắt sau 4 giây trừ dòng có nút. Thanh nổi: khay nằm trong viền, trên hàng chữ. Thanh dừng: khay treo ngay dưới đường kẻ để
  khe giữ nguyên chiều cao. Kéo file vào trang thì lớp phủ `.search-drop` "Thả ảnh vào đây để tìm" hiện toàn màn hình.
- Ô chữ đang focus: đường kẻ 3px dưới thanh hiện ra (thay outline).
- Thanh nổi đẩy nút nổi lên bằng `--search-bar-offset` ([Floating CTA](../FloatingCta/README.md)). Ẩn khi menu hoặc
  detail view mở; thanh đang ở khe thì vẫn theo CTA vào detail view.
- Giảm chuyển động: đổi trạng thái ngay.

Preview: trên là thanh nổi, dưới là thanh dừng trong khe.

## Chú thích thuật ngữ

- **Khe (dock)**: chỗ trống cố định chiều cao dưới tiêu đề CTA cuối lưới, nơi thanh dừng.
- **Thanh nổi**: thanh cố định ở đáy màn hình khi khe còn ở dưới.
