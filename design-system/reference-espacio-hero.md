# Hero Espacio

Số đo title card ở đầu các trang Espacio, để đối chiếu
[Hero](components/Hero/README.md) của Trường Thịnh. Cách đọc `F/L` và
`x, y, w, h` ở [Tham chiếu Espacio](reference-espacio.md#cách-đọc-số-đo); số
theo width đo live ngày 2026-08-01, tải nguội.

## Chung mọi trang

- Khối `layout-hero-banner` gồm chữ, CTA, media. Khung chữ rộng 80%, tối đa
  1000px (ở 1440: x 220, rộng 1000). Dòng 1 căn trái, dòng 2 căn phải và kéo
  lên; `<= 750px` căn giữa.
- Tiêu đề: face medium, phần nghiêng medium italic, chữ hoa. Bắt đầu ở
  112/156.8 rồi `fillText` giảm từng bước `0.25em` tới khi không tràn khung,
  nên mỗi dòng có cỡ riêng. Mobile tracking `-0.03em`. Desktop khai báo
  `font-weight: 100` nhưng file Silka không mảnh hơn, độ đậm thật là medium.
- Kicker: semibold 16/22.4, chữ hoa, đặt trên tiêu đề; căn trái desktop, căn
  giữa `<= 750px`.
- Hero cao bằng viewport (đo ở `1440×900` và `390×844`); riêng Projects cao
  `calc(100vh - 50px)`, không có media.
- Media: parallax `data-scroll-speed="-2"` trên desktop; zoom `scale 1.2 →
  1.005` trong `2.5s ease`, xem [Motion Espacio](reference-espacio-motion.md#hero).
- Màu chữ hero trên nền sáng và nền tối chưa được đo. Chỉ biết header đổi
  trắng hoặc ink theo section và về `#2f2f2f` khi chuyển route.

## So nhanh ở 1440×900

| Trang Espacio (Trường Thịnh) | Dòng 1 | Dòng 2 | Trường Thịnh dòng 1 / 2 |
| --- | --- | --- | --- |
| Trang chủ | 68/95.2 | 80/112 | 129.6 (một khối) |
| Interior Design (Residential) | 112/156.8 | 112/156.8 | 102.96 / 97.2 |
| Kitchens (Commercial) | 92/128.8 | 112/156.8 | 92 / 66.4 |
| Projects (Advertising) | 112/156.8 | 112/156.8 | 103.68 / 87.2 |
| About | cap 76px | cap 73px | 129.6 |
| Can Molteni (trang dự án) | 112/156.8 | 112/156.8 | |

Font khác nhau (Silka và Plus Jakarta Sans) nên số font-size chỉ để so tỷ lệ
giữa hai dòng và giữa các trang, không so trực tiếp. Ở width này dòng 2 của
Espacio bằng hoặc lớn hơn dòng 1; dòng 2 của Trường Thịnh nhỏ hơn.

## Theo width

### Trang chủ `/en`

Slideshow Swiper toàn viewport: speed 500ms, autoplay 6000ms, ngang, cursor
grab, cuộn chuột theo trục, lazy ảnh trước và sau, bullet. Slide đang hiện
chạy reveal chữ; slide trước reset.

| Width | Dòng 1 F/L | Dòng 1 x, y, w, h | Dòng 2 F/L | Dòng 2 x, y, w, h |
| ---: | --- | --- | --- | --- |
| 320 | 24/33.6 | 31.3, 399.6, 263.5, 33.6 | 24/33.6 | 31.3, 424.8, 263.5, 33.6 |
| 390 | 20/28 | 34.5, 399.6, 321, 28 | 28/39.2 | 34.5, 417.8, 321, 39.2 |
| 768 | 40/56 | 76.8, 399.6, 614.4, 56 | 48/67.2 | 76.8, 438.8, 614.4, 67.2 |
| 1024 | 56/78.4 | 102.4, 374.4, 819.2, 78.4 | 68/95.2 | 102.4, 429, 819.2, 95.2 |
| 1440 | 68/95.2 | 220, 357.6, 1000, 95.2 | 80/112 | 220, 424.8, 1000, 112 |

### Interior Design `/en/interior-design` (Residential)

Cap dòng 1/2: mobile 62/45px, desktop 78/78px.

| Width | Dòng 1 F/L | Dòng 1 x, y, w, h | Dòng 2 F/L | Dòng 2 x, y, w, h |
| ---: | --- | --- | --- | --- |
| 320 | 72/100.8 | 31, 386.3, 258, 100.8 | 52/72.8 | 31, 468.9, 258, 72.8 |
| 390 | 88/123.2 | 34.5, 366.7, 321, 123.2 | 64/89.6 | 34.5, 467.5, 321, 89.6 |
| 768 | 112/156.8 | 76.8, 333.1, 614.4, 156.8 | 112/156.8 | 76.8, 450.7, 614.4, 156.8 |
| 1024 | 112/156.8 | 102.4, 333.1, 819.2, 156.8 | 112/156.8 | 102.4, 450.7, 819.2, 156.8 |
| 1440 | 112/156.8 | 220, 333.1, 1000, 156.8 | 112/156.8 | 220, 450.7, 1000, 156.8 |

Kicker 16/22.4: 320 `39, 340.1, 258, 44.8` (hai dòng); 390
`42.5, 286.9, 321, 44.8`; 768 `84.8, 275.7, 614.4, 22.4`; 1024
`110.4, 275.7, 819.2, 22.4`; 1440 `228, 275.7, 1000, 22.4`.

### Kitchens `/en/kitchens` (Commercial)

Cap dòng 1/2: mobile 20/28px, desktop 64/78px.

| Width | Dòng 1 F/L | Dòng 1 x, y, w, h | Dòng 2 F/L | Dòng 2 x, y, w, h |
| ---: | --- | --- | --- | --- |
| 320 | 24/33.6 | 31, 433.9, 258, 33.6 | 32/44.8 | 31, 456.3, 258, 44.8 |
| 390 | 28/39.2 | 34.5, 414.3, 321, 39.2 | 40/56 | 34.5, 439.5, 321, 56 |
| 768 | 56/78.4 | 76.8, 397.5, 614.4, 78.4 | 76/106.4 | 76.8, 449.3, 614.4, 106.4 |
| 1024 | 76/106.4 | 102.4, 363.9, 819.2, 106.4 | 104/145.6 | 102.4, 433.9, 819.2, 145.6 |
| 1440 | 92/128.8 | 220, 347.1, 1000, 128.8 | 112/156.8 | 220, 436.7, 1000, 156.8 |

Tiêu đề CTA cuối trang: 40/56 ở 320, 48/67.2 ở 390, 64/89.6 từ 768.

### Projects `/en/projects` (Advertising)

Không media; filter nằm ở đáy hero; scroll cue cách đáy viewport xa hơn đúng
50px vì hero thấp hơn viewport 50px.

| Width | Dòng 1 F/L | Dòng 1 x, y, w, h | Dòng 2 F/L | Dòng 2 x, y, w, h |
| ---: | --- | --- | --- | --- |
| 320 | 52/72.8 | 31, 355, 258, 72.8 | 40/56 | 31, 413.8, 258, 56 |
| 390 | 64/89.6 | 34.5, 338.2, 321, 89.6 | 52/72.8 | 34.5, 409.6, 321, 72.8 |
| 768 | 112/156.8 | 76.8, 304.6, 614.4, 156.8 | 92/128.8 | 76.8, 429.2, 614.4, 128.8 |
| 1024 | 112/156.8 | 101.8, 290.4, 820.4, 157 | 112/156.8 | 101.8, 408.1, 820.4, 157 |
| 1440 | 112/156.8 | 220, 290.6, 1000, 156.8 | 112/156.8 | 220, 408.2, 1000, 156.8 |

Filter đang chọn: 320 và 390 `15.36/21.504` ở `25, 671.7, 69.8, 21.5`; 768
`16/22.4` ở `159.3, 468, 72.8, 22.4`; 1024 ở `188.6, 573.1`; 1440 ở
`396.6, 572.8`.

### Can Molteni `/en/projects/can-molteni` (trang dự án)

| Width | Dòng 1 F/L | Dòng 1 x, y, w, h | Dòng 2 F/L | Dòng 2 x, y, w, h |
| ---: | --- | --- | --- | --- |
| 320 | 80/112 | 31, 329.6, 258, 112 | 68/95.2 | 31, 417.8, 258, 95.2 |
| 390 | 100/140 | 34.5, 301.6, 321, 140 | 88/123.2 | 34.5, 410.8, 321, 123.2 |
| 768 | 112/156.8 | 76.8, 304.4, 614.4, 156.8 | 112/156.8 | 76.8, 422, 614.4, 156.8 |
| 1024 | 112/156.8 | 102.4, 304.4, 819.2, 156.8 | 112/156.8 | 102.4, 422, 819.2, 156.8 |
| 1440 | 112/156.8 | 220, 304.4, 1000, 156.8 | 112/156.8 | 220, 422, 1000, 156.8 |

### About `/en/about-us`

Chỉ có cap: dòng 1/2 mobile 25/23px, desktop 76/73px. Zoom ảnh hero đo live
cùng `1.2 → 1.005`, `2.5s ease`. Chưa có bảng F/L theo width.

## Heading đầu tiên sau hero

h2 editorial giống nhau ở mọi trang đã đo; chiều cao khác nhau vì số dòng.

| Width | F/L | x | y | Rộng |
| ---: | --- | ---: | ---: | ---: |
| 320 | 40/56 | 15 | 874 | 290 |
| 390 | 40/56 | 15 | 874 | 360 |
| 768 | 48/67.2 | 25 | 960 | 718 |
| 1024 | 56/78.4 | 25 | 990 | 974 |
| 1440 | 64/89.6 | 35 | 990 | 1370 |

Đoạn văn sau đó 20.8/29.12 tới 768, 24/33.6 từ 1024.

## Scroll cue

- Chữ hoa 12.8/17.92, `pointer-events: none` (không bấm được); cách đáy 45px
  desktop, 30px tablet, 60px mobile.
- Khung hiện `opacity 0 → 1` trong 0.6s, ngay lúc khởi tạo hoặc sau 1s khi
  slide đổi xong; cue của slide trước về 0.
- Từng ký tự vào từ `top: -20px` và ra tới `top: 20px` kèm opacity; delay 3s,
  vào và ra 0.4s, stagger 0.1s, giữ 3s, lặp sau 3s. Tên ease trong source viết
  sai nên thực tế chạy tuyến tính khoảng 100ms mỗi ký tự; khoảng trắng không
  chiếm lượt stagger.
- Mờ đi khi `scrollY > 200`, `1s expo.out`. Không có nhánh reduced motion.

## Chú thích thuật ngữ

- **Title card**: màn chữ lớn mở đầu trang.
- **Kicker**: dòng chữ nhỏ trên tiêu đề.
- **F/L**: font-size/line-height computed.
- **Cap**: chiều cao chữ `H`.
- **fillText**: thuật toán của Espacio giảm cỡ chữ tới khi vừa khung.
- **Parallax**: media trôi chậm hơn trang khi scroll.
- **Scroll cue**: dòng chữ nhỏ ở đáy hero mời cuộn xuống.
- **Stagger**: độ lệch thời gian giữa các phần tử cùng chạy một hiệu ứng.
