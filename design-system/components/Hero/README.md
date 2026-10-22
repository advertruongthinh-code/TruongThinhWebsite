# Hero

Khối mở đầu mỗi trang, dựng như một title card: vài chữ rất lớn chiếm màn
hình ([nguồn cảm hứng](../../README.md#nguồn-tham-khảo)). Markup
`section.hero` ở mọi trang, style ở `style.css` (trang chủ) và `detail.css`
(các trang còn lại).

## Ý tưởng title card

- Chữ là nhân vật chính: một kicker nhỏ phía trên, tiêu đề hai dòng rất lớn,
  không nút, không đoạn văn dài.
- Chữ trắng trên ảnh (có `hero-shade` tối để đọc được), chữ `ink` trên nền
  `paper`. Header đổi tone theo nền qua `data-header-tone`.
- Weight cân đối: tiêu đề 600, kicker 700 cỡ 1rem; riêng About ghép dòng 500
  với dòng 700 nghiêng. Tracking display `tracking-display`.

## Theo trang

| Trang | Nền | Tiêu đề | Kicker |
| --- | --- | --- | --- |
| Trang chủ | Slideshow ảnh full viewport, chữ trắng | Một cỡ cho hai dòng, dòng 2 nghiêng | Có |
| Residential, Commercial | Ảnh, `hero-shade` | Chữ hoa 600, line-height 1.4 | Có |
| About | Ảnh đội ngũ, shade thêm lớp ngang | Dòng 1 weight 500, dòng 2 700 nghiêng | Không (owner 2026-10-18) |
| Advertising | `paper`, chữ `ink`; rail và chip dưới title | Chữ hoa 600, line-height 1.4 | Có |

Hero ảnh cao `100svh`; Advertising cao `100svh - 50px`. Ảnh đầu tải ngay với
`fetchpriority="high"`; trang chủ chọn ảnh đầu ngẫu nhiên mỗi lần tải và preload nó
([trang chủ R3](../../../docs/specs/page-home.md#r3-hero-slideshow-và-nút-dừng)).

## Theo width

Quy tắc đầy đủ ở [hero-typography R2](../../../docs/specs/hero-typography.md#r2-bày-chữ-hero-kiểu-espacio).

- **Trên 750px:** khung chữ `min(80%, 62.5rem)`, mọi hero chung một cỡ
  `min(7rem, bề rộng khung / 12,5)`. Dòng 1 canh trái, dòng 2 canh phải, kéo lên
  `0,2em` và lồng nhau khoảng 30% dòng ngắn; kicker theo mép trái dòng 1.
- **Từ 750px trở xuống (phone):** khung chữ `calc(100% - 64px)` (lề 32px mỗi
  bên). Mỗi title co vừa khung theo dòng dài nhất của nó (`100cqi /
  --hero-line-em`, tối đa 7rem): ở 384px từ 26px (Commercial EN) tới 60px
  (trang chủ VI). Hai dòng canh giữa, title nằm đúng tâm hero (lệch tối đa
  3px) dù có hay không có hàng chip. Không hiện kicker.
- **Rail Advertising trên phone:** `.hero-browse` neo theo đáy hero, chừa sẵn
  một hàng chip, nên rail đứng một chỗ như trên PC.
- **Kicker:** 16/22.4, 700 hoa; cách nét chữ title như nhau ở mọi hero,
  `clamp(1.5rem, 3.8vh, 2.2rem)` trừ `--hero-ink-drop`.
- **Không JS:** về cỡ chung 12,5em, hai dòng sát hai mép khung.
- Scroll cue chữ hoa 12.8/17.92, cách đáy hero 45px (`> 1200`), 30px
  (`<= 1200`), 60px (`<= 750`); không nhận click khi đã ẩn.

## Motion

- Tiêu đề: word fade `data-motion-words`, `1s expo.out`, stagger `0.2s`.
- Kicker: trượt vào từ `x -60px`, `0.6s cubic-bezier(0, 0, .26, 1)`.
- Khối chữ Advertising: `scale 1.2 → 1` trong `2.5s`; ảnh Residential, Commercial,
  About `scale 1.2 → 1.005`, `2.5s ease`.
- Trang chủ: slideshow zoom `scale 1.06 → 1` trong `6.6s sine.inOut`; thứ tự toàn bộ slide, gồm ảnh
  đầu, ngẫu nhiên mỗi lần tải.
- Reduced motion hiện ngay trạng thái cuối. Chi tiết ở
  [Motion](../../motion.md#text).

Preview hiện hero trang chủ ở trạng thái cuối (`motion-fallback`).

## Chú thích thuật ngữ

- **Title card**: màn chữ lớn giới thiệu cảnh mới, như trong phim hoặc game.
- **Kicker**: dòng chữ nhỏ phía trên tiêu đề.
- **Hero shade**: lớp tối phủ ảnh để chữ trắng đọc được.
- **Word fade**: chữ hiện dần theo từng từ.
