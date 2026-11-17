# Thanh tìm kiếm

Nguồn: `src/site/search/bar.mjs`, `src/site/search/search.css`, `src/site/search/dock.mjs`; CSS `.search-host`, `.search-bar`; spec [Tìm kiếm](../../../docs/specs/advertising-search.md#r7-thanh-tìm-kiếm).

Thanh tìm kiếm trên mọi trang Advertising, theo biến thể 1 "Đường kẻ" owner duyệt. JavaScript dựng thanh sau lưới;
không có JavaScript thì CTA giữ link "Trao đổi ý tưởng" cũ. CSS nằm trong `search.css`, trang chèn một lần khi mount.

## Hành vi

- Ba chỗ (owner 2026-11-18): đầu trang trong khe `[data-search-dock-top]` thế chỗ rail của hero (rail, chip lùi một bậc);
  giữa trang nổi; cuối lưới trong khe `[data-search-dock]` dưới tiêu đề CTA.
- Nổi: lớp `.search-host` cố định ở đáy màn hình, cách đáy `--gutter`, ngang giữa; thanh rộng tối đa 760px (lớp rộng 1000px
  để thanh rời khe bắt đầu từ bề rộng lúc dừng); viền 1px `ink`, nền `paper`, hàng cao 60px (56px dưới 751px). Bên phải ô chữ:
  nút xoá chữ (chỉ khi đã gõ), vạch 26px, nút tìm bằng ảnh, kính lúp; ô vuông 44px (40px dưới 751px), icon 22px nét 1.8.
  Hai đầu theo mắt: mép trái tới chữ 21px, đầu cán kính lúp tới mép phải 18px.
- Dừng (`is-docked`, `data-dock="top"` hoặc `"cta"`): viền tan thành đường kẻ 3px dài tới 1000px, nền trong suốt, hàng 44px,
  chữ 16px như link CTA trang Công trình. Khe cao 48px; khe CTA cách tiêu đề `--masonry-gap`. Ở khe CTA "Trao đổi ý tưởng" mở
  bằng `clip-path` ở cuối đường kẻ, vạch trước nó cũng 26px (điện thoại: "Trao đổi", ẩn kính lúp); ở khe đầu trang không có.
- Đổi chỗ: morph 700ms `ease-card` cả hai chiều. Thanh dựng dáng cũ ở chỗ mới rồi đổi class, và trượt (`translateY`) từ chỗ cũ, trừ khi xa hơn một màn hình;
  vào khe CTA đúng lúc khe chạm mép trên thanh nổi nên thanh trôi theo trang như `sticky` rồi giãn ra.
- Không có dòng trạng thái trên màn hình (owner 2026-11-17): kết quả chỉ hiện trên lưới. Không ra kết quả thì khay hiện dòng
  "Chưa thấy mẫu phù hợp" chữ hoa 12.8px `muted`, tự tắt sau 4 giây (owner 2026-11-18). Screen reader đọc số kết quả qua vùng
  `aria-live` ẩn luôn có sẵn trong thanh. Đang tìm mà bấm nút xoá chữ thì bỏ tìm.
- Khay ảnh `[data-search-tray]` (khi có ảnh): thumbnail 44px kèm nút bỏ đen 20px, bên phải "n/5 ảnh" chữ hoa 12.8px `muted`;
  thông báo về ảnh (tối đa 5 ảnh, file không dùng được, đang chậm kèm "Thử lại", tạm nghỉ) là một dòng ngắn cũng ở đây, tự
  tắt sau 4 giây trừ dòng có nút. Thanh nổi và khe đầu trang: khay nằm trên hàng chữ. Khe CTA: khay treo ngay dưới đường kẻ để
  khe giữ nguyên chiều cao. Kéo file vào trang thì lớp phủ `.search-drop` "Thả ảnh vào đây để tìm" hiện toàn màn hình.
- Ô chữ đang focus: đường kẻ 3px dưới thanh hiện ra (thay outline).
- Thanh nổi đẩy nút nổi lên bằng `--search-bar-offset` ([Floating CTA](../FloatingCta/README.md)). Ẩn khi menu hoặc
  detail view mở; thanh đang ở khe thì vẫn theo CTA vào detail view.
- Giảm chuyển động: đổi trạng thái ngay.

Preview: trên là thanh nổi, dưới là thanh dừng trong khe.

## Chú thích thuật ngữ

- **Khe (dock)**: chỗ trống cố định chiều cao dưới tiêu đề CTA cuối lưới, nơi thanh dừng.
- **Thanh nổi**: thanh cố định ở đáy màn hình khi khe còn ở dưới.
