# Banner CTA

Khối "Giữ nghề. Không ngừng làm mới." cuối trang chủ, cả khối dẫn sang About.
Markup `section.legacy-closer` trong `src/site/index.html`; số đo và hành vi
đầy đủ ở [cảm giác cuộn R5](../../../docs/specs/scroll-feel.md#r5-khối-giữ-nghề-theo-banner-cta-của-espacio).

## Cấu trúc

| Cửa sổ | Cao khối | Gutter hai bên | Khoảng dưới khối |
| --- | --- | --- | --- |
| Trên 1200px | 600px | 35px, rộng tối đa 1500px | 90px |
| 961 tới 1200px | 500px | 25px | 90px |
| 751 tới 960px | 400px | 25px | 60px |
| 579 tới 750px | 400px | 15px | 60px |
| Tới 578px | 400px | 15px | 30px |

- Ảnh phủ kín (`object-fit: cover`), lớp đen opacity `0.2`, không parallax.
- Vùng chữ 85% khối, cách mép 7.5%, căn giữa. Tiêu đề chữ hoa, line-height
  `1.4`, bắt đầu 4rem, giảm từng 0.25rem tới khi không tràn, thấp nhất 1.5rem.
- Link "VỀ CHÚNG TÔI" cách tiêu đề 16px, dùng phụ đề portal trang chủ.
- Hover: ảnh `scale(1.1)` `0.6s ease-out`. Focus giữ focus ring của Design System.
- Vào viewport: line reveal của tiêu đề ([motion](../../motion.md)), link hiện
  sau 0.3s.

Preview hiện trạng thái cuối, không motion.

## Chú thích thuật ngữ

- **CTA**: call to action, khối kêu gọi khách đi tiếp.
- **Gutter**: khoảng trống hai bên khối.
