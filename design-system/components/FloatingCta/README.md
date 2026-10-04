# Floating CTA

Nút liên hệ Zalo nổi ở góc phải dưới mọi trang. Markup `a.floating-cta`; lớp
`show` do `motion.js` gắn.

## Hành vi

- Nền `cta-black`, viền 2px đen, chữ trắng 0.8rem; icon lịch 25px nét 4.
- Cách mép 35px, 25px ở `<= 1200px`; ở `<= 750px` thu thành nút vuông 35px
  chỉ còn icon.
- Hiện khi `scrollY` trong một viewport đầu hoặc trong 1.75 viewport cuối
  trang; ngoài đó trượt ra phải (`translateX(130%)`).
- Hover: nền trắng, chữ `ink`, `0.3s ease-out`.

Preview hiện trạng thái `show`.

## Chú thích thuật ngữ

- **CTA**: call to action, nút kêu gọi liên hệ.
