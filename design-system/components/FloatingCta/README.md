# Floating CTA

Nguồn: CSS `.floating-cta`, `.back-to-top`; spec [Shell](../../../docs/specs/site-shell.md).

Nút liên hệ Zalo nổi ở góc phải dưới mọi trang. Markup `a.floating-cta`; lớp
`show` do `motion.js` gắn.

## Hành vi

- Nền `cta-black`, viền 2px đen, chữ trắng 0.8rem; icon lịch 25px nét 4.
- Cách mép 35px, 25px ở `<= 1200px`; ở `<= 750px` thu thành nút vuông 35px
  chỉ còn icon.
- Hiện khi `scrollY` trong một viewport đầu; ngoài đó trượt ra phải
  (`translateX(130%)`). Cuối trang không hiện lại vì lời mời trang chủ và
  `.detail-cta` đã có nút "Gọi Zalo tư vấn". Ẩn cả khi footer lọt vào
  viewport (trang ngắn như 404), nên footer không chừa làn nút.
- Hover: nền trắng, chữ `ink`, `0.3s ease-out`.
- Trang có [thanh tìm kiếm](../SearchBar/README.md) nổi: `bottom` cộng thêm `--search-bar-offset` (cao thanh nổi) để nút
  đứng trên thanh; thanh dừng ở CTA thì offset về 0. Nút về đầu trang cũng vậy.

## Nút về đầu trang

- `button.back-to-top`, chỉ trên điện thoại, PC không có (owner 2026-11-22): ô 50px nền `paper`, viền 1px `ink`, bóng như khối [thanh tìm kiếm](../SearchBar/README.md), icon mũi tên lên 25px nét 2.4, không chữ, nhãn `aria-label`. Cách phải 16px. Nằm dưới khối tìm kiếm nổi nên bóng không phủ lên thanh.
- Trang có masonry, khi đã qua màn đầu: đúng lúc CTA trượt ra, nên hai nút không cùng hiện. Trượt vào từ phải như CTA. Có cả trên PC.
- Trang có thanh tìm kiếm nổi trên điện thoại ([search-bar R5](../../../docs/specs/search-bar.md#r5-nút-về-đầu-trang-phone-và-chuyển-động)): hàng riêng cách mép trên khối 10px, vẫn sát mép phải màn; bàn phím mở thì ẩn. Thanh dừng ở khe CTA thì ẩn ở mọi thiết bị.
- Bấm thì cuộn mượt về đầu trang; reduced motion nhảy thẳng, không trượt.

Preview hiện trạng thái `show`.

## Chú thích thuật ngữ

- **CTA**: call to action, nút kêu gọi liên hệ.
