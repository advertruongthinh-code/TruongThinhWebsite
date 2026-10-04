# Hero

Khối mở đầu mỗi trang, dựng như một title card: vài chữ rất lớn chiếm màn
hình, giống màn giới thiệu level hay chapter mới trong game. Markup
`section.hero` ở mọi trang, style ở `style.css` (trang chủ) và `detail.css`
(các trang còn lại).

## Ý tưởng title card

- Nguồn cảm hứng owner chọn: chữ lớn mở cảnh của
  [Resident Evil Requiem](https://www.jank.cool/resident-evil-requiems-big-text-splashes-explained/)
  và màn vào level, chapter mới của game Control Resonant. Nhịp, weight và
  motion học theo [Espacio](../../reference-espacio.md#typography).
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
| Residential, Commercial | Ảnh, `hero-shade` | Chữ hoa 600, line-height 1.4; Residential `clamp(3.05rem, 7.15vw, 7rem)`, Commercial `clamp(2.5rem, 7.5vw, 5.75rem)`; dòng 2 nhỏ hơn | Dòng 1 trái, dòng 2 phải và chồng lên `-0.35em` |
| About | Ảnh đội ngũ, shade thêm lớp ngang | `clamp(5.4rem, 9vw, 10.2rem)`, line-height 0.87, chữ thường; dòng 1 weight 500, dòng 2 700 nghiêng thụt `0.78em`; kicker 500 | Căn trái |
| Advertising | `paper`, chữ `ink` | Chữ hoa 600, `clamp(3.05rem, 7.2vw, 7rem)`, line-height 1.4; dòng 2 nhỏ hơn | Căn trái, cao `100svh - 50px` |

Đo ở 1440×900 (computed style): trang chủ 129.6px; Residential 102.96/97.2px;
Commercial 92/66.4px; About 129.6px; Advertising 103.68/87.2px.

Hero ảnh cao `100svh` (tối thiểu 42–46rem tùy trang); tới 980px chuyển sang
luồng chữ tự nhiên để chữ tăng 200% không đè header. Ảnh đầu tải ngay với
`fetchpriority="high"`.

## Motion

- Tiêu đề: word fade `data-motion-words`, `1s expo.out`, stagger `0.2s`.
- Kicker: trượt vào từ `x -60px`, `0.6s cubic-bezier(0, 0, .26, 1)`.
- Khối chữ Advertising: `scale 1.2 → 1` trong `2.5s`; ảnh About `scale 1.2 →
  1.005`, `2.5s ease` (cùng số đo hero zoom của Espacio).
- Trang chủ: slideshow zoom `scale 1.06 → 1` trong `5s sine.inOut`.
- Reduced motion hiện ngay trạng thái cuối. Chi tiết ở
  [Motion](../../motion.md#text).

Preview hiện hero trang chủ ở trạng thái cuối (`motion-fallback`).

## Chú thích thuật ngữ

- **Title card**: màn chữ lớn giới thiệu cảnh mới, như trong phim hoặc game.
- **Kicker**: dòng chữ nhỏ phía trên tiêu đề.
- **Hero shade**: lớp tối phủ ảnh để chữ trắng đọc được.
- **Word fade**: chữ hiện dần theo từng từ.
