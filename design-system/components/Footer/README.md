# Footer

Cuối mọi trang: lưới thông tin liên hệ `footer.site-footer`. Trang chủ thêm
lời mời liên hệ và câu tuyên bố display `div.site-invitation` ngay trên footer;
Nhà ở, Kinh doanh, Giới thiệu bỏ khối này vì `.detail-cta` đã mời.

## Cấu trúc

- Lời mời: link chữ hoa 700, viền dưới 1px, cao tối thiểu 44px.
- Footer cách nội dung trên `footer-top-gap`, padding ngang `gutter`, nền
  `white`. Trang Advertising lúc duyệt dùng `0` vì batch skeleton lấp chỗ đó.
- Tuyên bố: font 600, `clamp(2.8rem, 4.5vw, 5.4rem)`, tracking và
  word-spacing display.
- Lưới liên hệ ba cột (địa chỉ, điện thoại, mạng xã hội), tràn ra mép trang,
  viền trên dưới `line`.
- Cột điện thoại: Hotline rồi Văn phòng (EN "Office"), nhãn như nhãn cột, số
  màu `ink` cùng cỡ địa chỉ, dạng `+84`, link `tel:`; cùng chuỗi ở VI và EN.
  Hover hoặc focus gạch chân 3px như nav desktop; không dùng `blue` vì blue chỉ
  dành cho `::selection` và indicator route.
- Hàng bản quyền `footer-bottom` cao tối thiểu 72px, căn giữa dọc, chữ
  `muted` 0.8rem; không thêm padding cuối hay min-height toàn khung.
- Địa chỉ trụ sở giữ nguyên chuỗi ở cả VI và EN (xem
  [Content](../../content.md#song-ngữ-vien)).
- Ba icon mạng xã hội 30px theo thứ tự Facebook, TikTok, YouTube (Remix Icon
  4.6.0), inline SVG một màu; chưa có URL nên `aria-disabled`, không nhận focus.

## Footer gọn

Cửa sổ nhỏ (rộng `≤750px` hoặc cao `≤640px`) dùng footer gọn ở mọi trang, cao
không quá 38.2% viewport:

- Rộng `≤750px` và dọc: ba hàng, khoảng 135 đến 205px. Hàng đầu nhãn "Trụ sở"
  và địa chỉ `1rem`, icon ở góc phải; hàng hai hai số điện thoại, nhãn đứng
  trước số, cách nhau 24px; hàng ba bản quyền bên trái, cao 44px.
- Cửa sổ nhỏ khác: hai hàng, địa chỉ | hai số xếp dọc (dòng cuối thẳng dòng
  địa chỉ cuối), rồi icon | bản quyền cao 44px; cao 110 đến 135px.
- Góc phải dưới là làn của [Floating CTA](../FloatingCta/README.md): ở cuối
  trang CTA không đè bản quyền hay số điện thoại. Dọc hẹp giữ chữ bên trái;
  cửa sổ khác chừa lề phải `gutter + 185px` (nút chữ) hoặc `gutter + 72px`
  (nút vuông `≤750px`).
- Icon 24px cách nhau 8px. Nhãn "Mạng xã hội" ẩn bằng mắt, nhóm giữ
  `aria-label`. Viền trên một đường `line`.

Spec: [CTA giữa viewport](../../../docs/specs/advertising-cta-center-parallax.md#r4-footer-ở-cửa-sổ-nhỏ-và-điện-thoại).

## Chú thích thuật ngữ

- **Display**: cỡ chữ lớn cho tiêu đề và tuyên bố.
- **Gutter**: lề hai bên trang.
- **Footer gọn**: footer một hoặc hai hàng ở cửa sổ nhỏ.
- **Placeholder**: icon giữ chỗ, chưa có link thật.
