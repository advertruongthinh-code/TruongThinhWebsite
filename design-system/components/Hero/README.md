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

| Trang | Nền | Tiêu đề | Bố cục |
| --- | --- | --- | --- |
| Trang chủ | Slideshow ảnh full viewport | `clamp(5rem, 9vw, 10rem)`, line-height 0.86, chữ trắng | Căn giữa |
| Residential, Commercial | Ảnh, `hero-shade` | Chữ hoa 600, line-height 1.4; Residential `clamp(3.05rem, 7.15vw, 7rem)`, Commercial `clamp(2.5rem, 7.4vw, 5.75rem)` (VI vừa khung `80%` từ 680px); dòng 2 nhỏ hơn | Dòng 1 trái, dòng 2 phải và chồng lên `-0.35em` |
| About | Ảnh đội ngũ, shade thêm lớp ngang | `clamp(5.4rem, 9vw, 10.2rem)`, line-height 0.87, chữ thường; dòng 1 weight 500, dòng 2 700 nghiêng thụt `0.78em`; kicker 500 | Căn trái |
| Advertising | `paper`, chữ `ink` | Chữ hoa 600, `clamp(3.05rem, 7.2vw, 7rem)`, line-height 1.4; dòng 2 nhỏ hơn | Dòng 1 trái, dòng 2 phải và chồng lên `-0.35em`, cao `100svh - 50px` |

Hero ảnh cao `100svh` (tối thiểu 42–46rem tùy trang); tới 980px chuyển sang
luồng chữ tự nhiên để chữ tăng 200% không đè header. Ảnh đầu tải ngay với
`fetchpriority="high"`.

## Theo width

Font-size/line-height dòng 1 | dòng 2 (px) và chiều cao hero, đo trên website
ngày 2026-10-04 với viewport cao 844 (320, 390) hoặc 900.

| Trang | 320 | 390 | 768 | 1024 | 1440 |
| --- | --- | --- | --- | --- | --- |
| Trang chủ | 65.6/56.42 | 74.1/63.73 | 80/68.8 | 92.16/79.26 | 129.6/111.46 |
| Residential | 40/56 \| 26.24/36.74 | 46.8/65.52 \| 31.98/44.77 | 54.91/76.88 \| 51.84/72.58 | 73.22/102.5 \| 69.12/96.77 | 102.96/144.14 \| 97.2/136.08 |
| Commercial | 24/33.6 \| 17.6/24.64 | 29.25/40.95 \| 21.45/30.03 | 57.6/80.64 \| 40.7/56.99 | 76.8/107.52 \| 54.27/75.98 | 92/128.8 \| 66.4/92.96 |
| About | 70.4/61.25 | 78/67.86 | 86.4/75.17 | 92.16/80.18 | 129.6/112.75 |
| Advertising | 29.12/40.77 \| 22.08/30.91 | 35.49/49.69 \| 26.91/37.67 | 55.3/77.41 \| 48.38/67.74 | 73.73/103.22 \| 64.51/90.32 | 103.68/145.15 \| 87.2/122.08 |

| Trang | Cao hero 320–390 | 768 | 1024–1440 |
| --- | ---: | ---: | ---: |
| Trang chủ | 560 | 608 | 900 |
| Residential, Commercial | 844 | 900 | 900 |
| About | 704 | 736 | 900 |
| Advertising | 794 | 850 | 850 |

- Trang chủ và About dùng một cỡ cho hai dòng; dòng 2 nghiêng.
- Khung chữ ở 1440: x 220, rộng 1000 (Residential, Commercial, Advertising);
  trang chủ x 35; About x 64.
- Kicker 16/22.4 (14/19.6 ở Residential, Commercial tới 390px).
- Advertising tới 680px căn giữa hai dòng; từ 1025px dòng 2 rộng hơn khung
  vẫn giữ mép phải đúng mép khung.
- Scroll cue chữ hoa 12.8/17.92, cách đáy hero 45px (`> 1200`), 30px
  (`<= 1200`), 60px (`<= 750`); không nhận click khi đã ẩn.

## Motion

- Tiêu đề: word fade `data-motion-words`, `1s expo.out`, stagger `0.2s`.
- Kicker: trượt vào từ `x -60px`, `0.6s cubic-bezier(0, 0, .26, 1)`.
- Khối chữ Advertising: `scale 1.2 → 1` trong `2.5s`; ảnh About `scale 1.2 →
  1.005`, `2.5s ease`.
- Trang chủ: slideshow zoom `scale 1.06 → 1` trong `5s sine.inOut`.
- Reduced motion hiện ngay trạng thái cuối. Chi tiết ở
  [Motion](../../motion.md#text).

Preview hiện hero trang chủ ở trạng thái cuối (`motion-fallback`).

## Chú thích thuật ngữ

- **Title card**: màn chữ lớn giới thiệu cảnh mới, như trong phim hoặc game.
- **Kicker**: dòng chữ nhỏ phía trên tiêu đề.
- **Hero shade**: lớp tối phủ ảnh để chữ trắng đọc được.
- **Word fade**: chữ hiện dần theo từng từ.
