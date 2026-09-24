# Product và UI rule

## Product contract

- Trước đổi visible copy, `data-en*`, alt/ARIA, image path, card, gallery, filter: đọc hết `docs/design/content.md`.
- Trước đổi layout, typography, header, menu, transition, reveal, gallery, montage, motion: so sánh state đã đổi với local reference cùng viewport. Reference chỉ research; không copy source, media, logo, font, SVG, URL.

## Brand và HTML

- Áp dụng [style guide](../design/style-guide.md), [content/media](../design/content.md)
  và [authority map](../design/index.md#authority-map); không giữ bản copy policy tại rule này.
- Trước sửa logo/token/state, đọc nguồn được authority map chỉ định; rule chỉ routing,
  không định nghĩa tỷ lệ, palette, motion, copy, owner fact hoặc route contract.

## Impeccable

- `PRODUCT.md` giữ confirmed product truth; `$impeccable init` chỉ update khi user explicit authorization. `DESIGN.md` giữ verified visual truth; `$impeccable document` không overwrite nếu chưa explicit authorization.
- Loader đọc hai file trên nếu có, rồi `.impeccable/surfaces/<slug>.md` khớp.
  `docs/design/` hướng dẫn reuse/content/governance; `docs/reference/espacio/`
  giữ measured baseline. Không duplicate design token hoặc lẫn reference với
  target/implementation. Thay token/state thì cập nhật DESIGN và sidecar liên quan.
- Dùng descriptive Markdown slug; không numeric document code.

## Chú thích thuật ngữ

- **Canonical locale route**: route chuẩn theo ngôn ngữ, không dùng fragment.
- **Leaf node**: node HTML không còn node con cần dịch.
- **Design token**: giá trị tái dùng định nghĩa visual system.
