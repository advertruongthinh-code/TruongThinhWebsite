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
- Đệm bốn phía bằng `gutter`; không chừa làn
  [Floating CTA](../FloatingCta/README.md) vì nút ẩn khi footer lọt vào viewport.
- Hai cột sát nhau ở mọi cỡ: cột liên hệ (địa chỉ trên cùng, rồi Hotline, Văn
  phòng) rộng theo địa chỉ, co lại và xuống dòng khi thiếu chỗ; cột mạng xã hội
  ngay cạnh. Cả khối căn giữa, cách đều hai biên; chữ trong cột căn trái. Cao
  khoảng 204px ở 1920px, 179px ở 1440px, 150px ở 1024px.
- Nhịp theo Espacio: các dòng xếp chồng cách 16px (10px khi cửa sổ cao
  `≤640px`), line-height 1.4. Cột cách `clamp(70px, 8vw, 160px)`, 35px ở
  `≤1200px`; cùng cỡ chữ lớn dần, khối bớt lề trắng hai bên trên PC lớn.
- Hotline (cũng là số Zalo) 600 xếp trên Văn phòng 500; cùng cỡ
  `clamp(1rem, 1.25vw, 1.5rem)`, chữ số `tabular-nums` nên thẳng hàng. Số màu
  `ink`, dạng `+84`, link `tel:`, cùng chuỗi ở VI và EN. Hover không có motion
  hay gạch chân; không dùng `blue` vì blue chỉ dành cho `::selection` và
  indicator route.
- Dùng icon thay nhãn chữ, inline SVG một màu `muted`, `aria-hidden`, rộng
  `1.3em`, cao một dòng chữ: ghim bản đồ cho địa chỉ (Remix Icon 4.6.0
  `map-pin-2-fill`); bong bóng Zalo cho Hotline vì đây cũng là số Zalo (khung
  Remix `chat-4-fill`, chữ "Zalo" của Simple Icons khoét bằng `mask`); điện
  thoại bàn cho Văn phòng (vẽ theo lưới 24px, góc bo và độ đậm của Remix, vì
  Remix không có icon điện thoại bàn). Nhãn "Trụ sở", "Hotline", "Văn phòng",
  "Mạng xã hội" (EN "Head office", "Hotline", "Office", "Social networks") vẫn
  trong DOM nhưng ẩn bằng mắt, làm tên cho trình đọc màn hình.
- Địa chỉ trụ sở giữ nguyên chuỗi ở cả VI và EN (xem
  [Content](../../content.md#song-ngữ-vien)), `text-wrap: balance`.
- Ba icon mạng xã hội 28px cách nhau 1.5rem theo thứ tự Facebook, TikTok,
  YouTube (Remix Icon 4.6.0), inline SVG một màu; chưa có URL nên
  `aria-disabled`, không nhận focus.

## Footer gọn

Từ 750px trở xuống, chữ liên hệ `1rem`, cột cách 24px, lề hai bên `gutter`.
Icon mạng xã hội 24px xếp dọc, cách nhau 8px, để cột icon hẹp và không cao hơn
ba dòng liên hệ. Footer không cao quá 38.2% viewport:

- Dọc: đệm dọc 20px; địa chỉ xuống hai dòng. Cao khoảng 163px ở 390×844.
- Ngang: đệm dọc 14px; địa chỉ một dòng. Cao khoảng 117px ở 568×320.
- Floating CTA không hiện ở cuối trang vì lời mời và `.detail-cta` đã có nút
  Zalo, và ẩn khi footer lọt vào viewport (404).

Spec: [CTA giữa viewport](../../../docs/specs/advertising-cta-center-parallax.md#r4-footer-ở-cửa-sổ-nhỏ-và-điện-thoại).

## Chú thích thuật ngữ

- **Display**: cỡ chữ lớn cho tiêu đề và tuyên bố.
- **Gutter**: lề hai bên trang.
- **Tabular-nums**: chữ số cùng bề rộng để các số điện thoại thẳng hàng.
- **Footer gọn**: footer từ 750px trở xuống, một cột khi dọc, hai cột khi ngang.
- **Placeholder**: icon giữ chỗ, chưa có link thật.
