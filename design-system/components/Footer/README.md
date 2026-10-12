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
- Một dải tràn ra mép trang, chỉ viền trên `line`, không viền dưới, không dòng
  bản quyền: Hotline cỡ display (600, `clamp(2rem, 3.4vw, 3.6rem)`, tracking
  display) căn giữa dọc | cột Văn phòng, địa chỉ, icon mạng xã hội cách nhau
  12px | logo màu bên phải rộng `clamp(180px, 17vw, 260px)`. Đệm trên 48px,
  dưới 32px; footer cao tối thiểu bằng đệm trên, logo, 12px và chỗ của
  [Floating CTA](../FloatingCta/README.md) (cách đáy 35px, 25px ở `≤1200px`,
  cao 47px), nên ở cuối trang nút nằm dưới logo, không đè nội dung. Cao khoảng
  210px.
- Từ 980px trở xuống: Hotline một hàng ở trên, Văn phòng, địa chỉ, icon xếp
  dưới; logo cột phải.
- Dùng icon thay nhãn chữ: ghim bản đồ cho địa chỉ, điện thoại di động cho
  Hotline, ống nghe cho Văn phòng (Remix Icon 4.6.0 `map-pin-2-fill`,
  `smartphone-fill`, `phone-fill`), inline SVG một màu `muted`, `aria-hidden`.
  Icon `1.4em`, icon Hotline `0.62em`. Nhãn "Trụ sở", "Hotline", "Văn phòng",
  "Mạng xã hội" (EN "Head office", "Hotline", "Office", "Social networks") vẫn
  trong DOM nhưng ẩn bằng mắt, làm tên cho trình đọc màn hình.
- Số điện thoại màu `ink`, dạng `+84`, link `tel:`; cùng chuỗi ở VI và EN.
  Hotline cũng là số Zalo. Văn phòng và địa chỉ cỡ `clamp(1rem, 1.25vw,
  1.2rem)`, 500. Hover không có motion hay gạch chân; không dùng `blue` vì blue
  chỉ dành cho `::selection` và indicator route.
- Địa chỉ trụ sở giữ nguyên chuỗi ở cả VI và EN (xem
  [Content](../../content.md#song-ngữ-vien)), rộng tối đa 22rem, `text-wrap:
  balance`.
- Ba icon mạng xã hội 28px cách nhau 1.5rem theo thứ tự Facebook, TikTok,
  YouTube (Remix Icon 4.6.0), inline SVG một màu; chưa có URL nên
  `aria-disabled`, không nhận focus.
- Logo dạng bốn màu CMYK ([Brand](../../brand.md#dạng-màu)), cụm chữ `ink`.

## Footer gọn

Cửa sổ nhỏ (rộng `≤750px` hoặc cao `≤640px`) dùng footer gọn ở mọi trang, cao
không quá 38.2% viewport:

- Rộng `≤750px` và dọc: Hotline cả hàng `clamp(1.8rem, 9vw, 2.6rem)`; cột trái
  Văn phòng, địa chỉ `1rem`, logo 160px dồn đáy, tâm thẳng tâm floating CTA.
  Cột phải rộng 57px, cách mép 15px, thẳng trục nút: ba icon mạng xã hội xếp
  dọc cách 12px phía trên nút, chừa dưới `25px + 57px + 12px`. Cao khoảng
  268px.
- Cửa sổ nhỏ khác: ẩn logo (header đã có); cột trái Hotline `1.4rem` trên Văn
  phòng, cột phải địa chỉ rồi icon mạng xã hội; đệm dọc 14px; lề phải chừa
  `gutter + 185px` (nút chữ) hoặc `gutter + 72px` (nút vuông `≤750px`). Cao
  khoảng 98px, 120px khi địa chỉ xuống dòng.
- Ở mọi cửa sổ, floating CTA hiện ở cuối trang không đè nội dung footer.
- Icon liên hệ 20px; icon mạng xã hội 24px cách nhau 12px. Viền trên một
  đường `line`.

Spec: [CTA giữa viewport](../../../docs/specs/advertising-cta-center-parallax.md#r4-footer-ở-cửa-sổ-nhỏ-và-điện-thoại).

## Chú thích thuật ngữ

- **Display**: cỡ chữ lớn cho tiêu đề và tuyên bố.
- **Gutter**: lề hai bên trang.
- **Footer gọn**: footer hai cột ở cửa sổ nhỏ.
- **Placeholder**: icon giữ chỗ, chưa có link thật.
