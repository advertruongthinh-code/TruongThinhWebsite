# Banner CTA

Khối "Giữ nghề. Không ngừng làm mới." cuối trang chủ, cả khối dẫn sang About.
Rule chữ CTA chung (tiêu đề, nhãn nút, hover) dùng cho cả `.detail-cta` của Nhà ở,
Kinh doanh, Giới thiệu và CTA Advertising ([trang con R10](../../../docs/specs/detail-pages.md#r10-cta-marquee-hover-và-ảnh-dưới-chữ-trắng)).
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
- Vùng chữ rộng 85% khối, căn giữa, khối cao theo chữ khi chữ dài. Tiêu đề style
  `cta-title`: chữ thường, weight 600, cỡ `--cta-title-size`
  (`clamp(3.2rem, 6vw, 7rem)`), line-height `0.98`. Dấu chấm cuối không treo: cả dòng
  kể cả dấu nằm giữa khối. CTA Advertising giữ cỡ riêng nhỏ hơn
  (`min(clamp(2.5rem, 4.5vw, 5rem), 14svh)`) để cụm CTA và Kính không phủ hết batch.
- Nhãn nút `.legacy-link` + `.portal-subtitle` ("VỀ CHÚNG TÔI", "GỌI ZALO TƯ VẤN"):
  16px, viết hoa, không mũi tên; subtitle (nếu có) nằm trên tiêu đề.
- Hover: ảnh `scale(1.1)` `0.6s ease-out`, gạch chân 3px của nhãn chạy từ trái;
  lớp bấm phủ cả khối. CTA Advertising là ngoại lệ: không ảnh, chỉ hover nút.
  Focus giữ focus ring của Design System.
- Vào viewport: line reveal của tiêu đề ([motion](../../motion.md)), link hiện
  sau 0.3s.

Preview hiện trạng thái cuối, không motion.

## Chú thích thuật ngữ

- **CTA**: call to action, khối kêu gọi khách đi tiếp.
- **Gutter**: khoảng trống hai bên khối.
