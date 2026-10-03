# Product và UI rule

- Trước đổi visible copy, `data-en*`, alt/ARIA, image path, card, gallery, filter: đọc hết [content/media](../design/content.md).
- Trước đổi layout, typography, header, menu, transition, reveal, gallery, montage, motion: so sánh state đã đổi với local reference cùng viewport. Reference chỉ research; không copy source, media, logo, font, SVG, URL.
- Logo, token, state, palette, motion, owner fact, route: đọc nguồn do [authority map](../design/index.md#authority-map) chỉ định; rule này chỉ routing.
- `PRODUCT.md` giữ confirmed product truth, `DESIGN.md` giữ verified visual truth. Skill `impeccable` (`init`, `document`) chỉ ghi hai file này khi user explicit authorization. Đổi token/state thì cập nhật DESIGN và `.impeccable/surfaces/<slug>.md` liên quan.
- Dùng descriptive Markdown slug; không numeric document code.

## Chú thích thuật ngữ

- **Authority map**: bảng chỉ nguồn chuẩn cho từng loại design fact.
- **Design token**: giá trị tái dùng định nghĩa visual system.
