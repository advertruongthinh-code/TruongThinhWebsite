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
  chỉ viền trên `line`; không viền dưới nên đường chia ô chạy tới đáy trang.
  Không có dòng bản quyền. Mỗi ô cao tối thiểu `2 × gutter + 47px` (117px,
  97px ở `≤1200px`), nội dung căn giữa dọc, nên tâm hàng trùng tâm
  [Floating CTA](../FloatingCta/README.md): ở cuối trang nút đứng cùng hàng
  icon mạng xã hội, góc phải, không đè nội dung. Địa chỉ `text-wrap: balance`.
- Từ 751 tới 1200px (cao `>640px`) ô thứ ba không đủ chỗ cho icon và nút nên
  lưới hai cột: địa chỉ | điện thoại, rồi icon mạng xã hội tràn hai cột trên
  một hàng riêng có viền trên, nút ở bên phải hàng đó.
- Dùng icon thay nhãn chữ: ghim bản đồ cho địa chỉ, điện thoại di động cho
  Hotline, ống nghe cho Văn phòng (Remix Icon 4.6.0 `map-pin-2-fill`,
  `smartphone-fill`, `phone-fill`), inline SVG một màu `muted`, `aria-hidden`.
  Icon rộng `clamp(1.25rem, 2vw, 1.75rem)`, cao bằng một dòng giá trị nên căn
  giữa dòng đầu. Nhãn "Trụ sở", "Hotline", "Văn phòng", "Mạng xã hội" (EN "Head
  office", "Hotline", "Office", "Social networks") vẫn trong DOM nhưng ẩn bằng
  mắt, làm tên cho trình đọc màn hình.
- Số điện thoại màu `ink` cùng cỡ địa chỉ, dạng `+84`, link `tel:`; cùng chuỗi
  ở VI và EN. Hover không có motion hay gạch chân; không dùng `blue`
  vì blue chỉ dành cho `::selection` và indicator route.
- Địa chỉ trụ sở giữ nguyên chuỗi ở cả VI và EN (xem
  [Content](../../content.md#song-ngữ-vien)).
- Ba icon mạng xã hội 30px theo thứ tự Facebook, TikTok, YouTube (Remix Icon
  4.6.0), inline SVG một màu; chưa có URL nên `aria-disabled`, không nhận focus.

## Footer gọn

Cửa sổ nhỏ (rộng `≤750px` hoặc cao `≤640px`) dùng footer gọn ở mọi trang, cao
không quá 38.2% viewport:

- Rộng `≤750px` và dọc: cột trái địa chỉ `1rem`, hai số điện thoại xếp dọc
  cách 8px. Cột phải rộng 57px, cách mép
  15px, thẳng trục floating CTA: ba icon mạng xã hội xếp dọc cách 12px phía
  trên nút, chừa dưới `25px + 57px + 12px` cho nút. Cao khoảng 207px.
- Cửa sổ nhỏ khác: hai hàng, địa chỉ | hai số xếp dọc (dòng cuối thẳng dòng
  địa chỉ cuối), rồi icon mạng xã hội cao 44px; lề phải chừa
  `gutter + 185px` (nút chữ) hoặc `gutter + 72px` (nút vuông `≤750px`). Cao
  khoảng 116px, 136px khi địa chỉ xuống dòng.
- Ở mọi cửa sổ, floating CTA hiện ở cuối trang không đè nội dung footer.
- Icon liên hệ 20px; icon mạng xã hội 24px cách nhau 8px. Viền trên một đường
  `line`.

Spec: [CTA giữa viewport](../../../docs/specs/advertising-cta-center-parallax.md#r4-footer-ở-cửa-sổ-nhỏ-và-điện-thoại).

## Chú thích thuật ngữ

- **Display**: cỡ chữ lớn cho tiêu đề và tuyên bố.
- **Gutter**: lề hai bên trang.
- **Footer gọn**: footer hai hàng hoặc hai cột ở cửa sổ nhỏ.
- **Placeholder**: icon giữ chỗ, chưa có link thật.
