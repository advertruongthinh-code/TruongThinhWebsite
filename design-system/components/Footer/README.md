# Footer

Cuối mọi trang: lời mời liên hệ, câu tuyên bố display và lưới thông tin liên
hệ. Markup gồm `div.site-invitation` và `footer.site-footer`.

## Cấu trúc

- Lời mời: link chữ hoa 700, viền dưới 1px, cao tối thiểu 44px.
- Footer cách nội dung trên `footer-top-gap`, padding ngang `gutter`, nền
  `white`. Trang Advertising lúc duyệt dùng `0` vì batch skeleton lấp chỗ đó.
- Tuyên bố: font 600, `clamp(2.8rem, 4.5vw, 5.4rem)`, tracking và
  word-spacing display.
- Lưới liên hệ hai cột, tràn ra mép trang, viền trên dưới `line`.
- Hàng bản quyền `footer-bottom` cao tối thiểu 72px, căn giữa dọc, chữ
  `muted` 0.8rem; không thêm padding cuối hay min-height toàn khung.
- Địa chỉ trụ sở giữ nguyên chuỗi ở cả VI và EN (xem
  [Content](../../content.md#song-ngữ-vien)).
- Ba icon mạng xã hội 30px theo thứ tự Facebook, TikTok, YouTube (Remix Icon
  4.6.0), inline SVG một màu; chưa có URL nên `aria-disabled`, không nhận focus.

## Footer gọn

Cửa sổ nhỏ (rộng `≤750px` hoặc cao `≤640px`) dùng footer gọn ở mọi trang, cao
không quá 38.2% viewport:

- Rộng `≤750px` và dọc: hai hàng, khoảng 130px. Hàng đầu nhãn "Trụ sở" và địa
  chỉ `1rem`; hàng hai icon bên trái, bản quyền bên phải, cao 44px.
- Cửa sổ nhỏ khác: một hàng địa chỉ, icon, bản quyền, cao 67 đến 90px.
- Icon 24px cách nhau 8px. Nhãn "Mạng xã hội" ẩn bằng mắt, nhóm giữ
  `aria-label`. Viền trên một đường `line`.

Spec: [CTA giữa viewport](../../../docs/specs/advertising-cta-center-parallax.md#r4-footer-ở-cửa-sổ-nhỏ-và-điện-thoại).

## Chú thích thuật ngữ

- **Display**: cỡ chữ lớn cho tiêu đề và tuyên bố.
- **Gutter**: lề hai bên trang.
- **Footer gọn**: footer một hoặc hai hàng ở cửa sổ nhỏ.
- **Placeholder**: icon giữ chỗ, chưa có link thật.
