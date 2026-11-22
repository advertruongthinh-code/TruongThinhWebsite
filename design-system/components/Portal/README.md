# Portal

Nguồn: CSS `.service-portals`, `.service-portal`, `.portal-copy`; spec [trang chủ R5](../../../docs/specs/page-home.md#r5-portal-chữ-một-dòng-cùng-cỡ), [ba trang con R8](../../../docs/specs/detail-pages.md#r8-dải-quy-trình-duo-portal-loại-hình).

Card ảnh lớn, hai kiểu theo việc có link hay không (owner 2026-11-22). Markup `section.portal-stage` > `div.service-portals` > card.

- Có link (`a.service-portal`): ba lĩnh vực trang chủ `#dich-vu`, chữ ba tầng giữa card (mục Chữ dưới).
- Không link (`article.service-portal`): luôn là card cam kết, không tạo biến thể mới. Chữ góc dưới trái trong `.commitment-copy`: `.commitment-title` nhãn nhỏ in hoa, `.commitment-lead` hai `.portal-line` soạn sẵn (mask reveal dùng chung), `.commitment-body` (`.portal-subtitle`, hiện sau); nền dưới đậm dần; ảnh không zoom khi hover (owner 2026-11-22). Dùng ở: bốn cam kết trang chủ (`service-portals--four`), loại hình và hạng mục Residential, loại hình Commercial.

Preview: ba lĩnh vực trang chủ, rồi ba loại hình Residential.

## Hình học

| Viewport | Card | Lưới |
| --- | --- | --- |
| 1440 | `410 × 600` | ba cột, gap 70px, rộng tối đa 1570px, đệm ngang 35px |
| 390 | `360 × 400` | một cột |
| Bốn cam kết | 1440: bốn cột; tới 1200px hai cột cao 34rem; tới 578px một cột cao 400px | cùng gap, đệm |

## Chữ

Portal có link: ba tầng, canh giữa card, chữ trắng hoa, bóng D ([README](../../README.md#elevation--depth)):

- Kicker `portal-kicker` `min(1.125rem, 4.2cqw)` 700 (17.22px ở card 410px).
- Title `portal-title` `min(4rem, 12cqw)` 600, line-height 1.08, một dòng (49.2px ở card 410px).
- Tagline `portal-tagline` `min(1rem, 3.8cqw)` 700, một dòng.
- Copy dài thì rút gọn, không thu cỡ chữ.

Ảnh phủ `portal-shade` màu `media-label-overlay` (0.3, như Espacio). Hover và reveal ở [Motion](../../motion.md#hover).

## Chú thích thuật ngữ

- **Portal**: card ảnh lớn; có link thì dẫn sang một trang con.
- **cqw**: phần trăm bề rộng container (card), để chữ co theo card.

Weight (owner 2026-11-22, 3 mức như Espacio): tiêu đề portal 500, kicker và phụ đề chữ hoa nhỏ 600, chữ thường kiểu câu 400.
