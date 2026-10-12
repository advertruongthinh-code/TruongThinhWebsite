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
- Không logo (header đã có), không dòng bản quyền. Viền trên `line` tràn ra
  mép trang, không viền dưới.
- Đệm dọc `clamp(40px, 3.5vw, 64px)`, lề hai bên `gutter`; không chừa làn
  [Floating CTA](../FloatingCta/README.md) vì nút ẩn khi footer lọt vào viewport.
- Ba cột như footer Espacio (`1fr auto 1fr`): địa chỉ sát lề trái, hai số điện
  thoại ở cột giữa nằm giữa trang, icon mạng xã hội xếp dọc sát lề phải. Dòng đầu
  các cột thẳng baseline. Cao khoảng 277px ở 1920px, 250px ở 1440px, 229px ở 1024px.
- Laptop cao 641-799px: đệm dọc 24px, icon cách 10px, cao 177px, để tiêu đề CTA
  Advertising không bị thu nhỏ.
- Nhịp theo Espacio: hai số cách 16px (10px khi cửa sổ cao `≤640px`),
  line-height 1.4, cột cách `clamp(35px, 4vw, 70px)`.
- Địa chỉ cùng cỡ chữ hai số: `clamp(1rem, 1.25vw, 1.375rem)` (22px ở 1920px,
  18px ở 1440px). Địa chỉ rộng tối đa 24em, `text-wrap: balance`.
- Hotline (cũng là số Zalo) 600 xếp trên Văn phòng 500, chữ số `tabular-nums`
  nên thẳng hàng. Số màu `ink`, dạng `+84`, link `tel:`, cùng chuỗi ở VI và EN.
  Kéo chuột bôi đen copy được số (`-webkit-user-drag: none`,
  `draggable="false"`); click sau khi bôi đen không mở `tel:`, bấm thường vẫn
  gọi. Hover không có motion hay gạch chân; không dùng `blue` vì blue chỉ dành
  cho `::selection` và indicator route.
- Dùng icon thay nhãn chữ, inline SVG một màu `muted`, `aria-hidden`, rộng
  `1.3em`, cao một dòng chữ: ghim bản đồ cho địa chỉ (Remix Icon 4.6.0
  `map-pin-2-fill`); icon Zalo cho Hotline vì đây cũng là số Zalo (badge app
  Zalo bản một màu: khung squircle, bong bóng chat khoét bằng `mask`, chữ "Zalo"
  bên trong; path lấy từ Wikimedia Commons `Icon_of_Zalo.svg`, khớp ảnh badge
  chính thức trên zalo.me; Zalo không công bố brand guideline); điện
  thoại bàn cho Văn phòng (vẽ theo lưới 24px, góc bo và độ đậm của Remix, vì
  Remix không có icon điện thoại bàn). Nhãn "Trụ sở", "Hotline", "Văn phòng",
  "Mạng xã hội" (EN "Head office", "Hotline", "Office", "Social networks") vẫn
  trong DOM nhưng ẩn bằng mắt, làm tên cho trình đọc màn hình.
- Địa chỉ trụ sở giữ nguyên chuỗi ở cả VI và EN (xem
  [Content](../../content.md#song-ngữ-vien)), `text-wrap: balance`.
- Ba icon mạng xã hội 36px cách nhau 20px, xếp dọc, theo thứ tự Facebook, TikTok,
  YouTube (Remix Icon 4.6.0), inline SVG một màu; chưa có URL nên
  `aria-disabled`, không nhận focus.

## Footer gọn

Từ 750px trở xuống: địa chỉ và hai số `1rem`, cột cách 24px, lề hai bên
`gutter`, đệm dọc 32px, icon mạng xã hội 28px cách 16px, xếp dọc ở cột phải.
Footer không cao quá 38.2% viewport:

- Dọc: hai cột, địa chỉ rồi hai số ở cột trái. Cao khoảng 187px ở 390×844.
- Cửa sổ cao `≤640px` nằm ngang: icon 24px cách 8px, đệm dọc 14px; dưới 750px
  địa chỉ hàng trên, hai số cạnh nhau hàng dưới. Cao 117px ở 568×320.
- Floating CTA không hiện ở cuối trang vì lời mời và `.detail-cta` đã có nút
  Zalo, và ẩn khi footer lọt vào viewport (404).

Spec: [CTA giữa viewport](../../../docs/specs/advertising-cta-center-parallax.md#r4-footer-ở-cửa-sổ-nhỏ-và-điện-thoại).

## Chú thích thuật ngữ

- **Display**: cỡ chữ lớn cho tiêu đề và tuyên bố.
- **Gutter**: lề hai bên trang.
- **Tabular-nums**: chữ số cùng bề rộng để các số điện thoại thẳng hàng.
- **Footer gọn**: footer từ 750px trở xuống, hai cột khi dọc, ba cột khi ngang.
- **Squircle**: hình vuông bo góc mềm như icon app.
- **Placeholder**: icon giữ chỗ, chưa có link thật.
