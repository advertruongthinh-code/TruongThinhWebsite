# Portal

Nguồn: CSS `.service-portals`, `.service-portal`, `.portal-copy`; spec [trang chủ R5](../../../docs/specs/page-home.md#r5-portal-chữ-một-dòng-cùng-cỡ), [ba trang con R8](../../../docs/specs/detail-pages.md#r8-dải-quy-trình-duo-portal-loại-hình).

Ba card ảnh dẫn sang một lĩnh vực hoặc loại hình: trang chủ (ba năng lực), Residential (Nhà phố, Căn hộ,
Homestay), Commercial (loại hình kinh doanh). Markup `section.portal-stage` > `div.service-portals` >
`article.service-portal`; preview lấy từ Residential, mẫu chuẩn owner chọn (2026-10-17).

## Hình học

| Viewport | Card | Lưới |
| --- | --- | --- |
| 1440 | `410 × 600` | ba cột, gap 70px, rộng tối đa 1570px, đệm ngang 35px |
| 390 | `360 × 400` | một cột |

## Chữ

Ba tầng, canh giữa card, chữ trắng hoa, bóng D ([README](../../README.md#elevation--depth)):

- Kicker `portal-kicker` `min(1.125rem, 4.2cqw)` 700 (17.22px ở card 410px).
- Title `portal-title` `min(4rem, 12cqw)` 600, line-height 1.08, một dòng (49.2px ở card 410px).
- Tagline `portal-tagline` `min(1rem, 3.8cqw)` 700, một dòng.
- Copy dài thì rút gọn, không thu cỡ chữ. Ngoại lệ: portal loại hình Commercial không kicker, title hai dòng.

Ảnh phủ `portal-shade` màu `media-label-overlay` (0.5). Hover và reveal ở [Motion](../../motion.md#hover).

## Chú thích thuật ngữ

- **Portal**: card ảnh lớn dẫn sang một trang con.
- **cqw**: phần trăm bề rộng container (card), để chữ co theo card.
