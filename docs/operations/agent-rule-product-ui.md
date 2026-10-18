# Product và UI rule

- Trước đổi visible copy, `data-en*`, alt/ARIA, image path, card, gallery, filter: đọc hết [content/media](../../design-system/content.md), [ba trang con](../specs/detail-pages.md#r4-nội-dung-vien-và-hook) và [chuẩn file ảnh](../specs/media-delivery.md#r5-chuẩn-file-ảnh).
- Dấu câu bản EN theo bản VI (owner 2026-10-18): dấu chấm và dấu phẩy đặt cùng chỗ với câu VI tương ứng; liệt kê không dùng dấu phẩy trước `and` (VI không có dấu phẩy trước `và`), trừ khi câu VI có dấu phẩy ở đúng chỗ đó.
- Trước đổi layout, typography, header, menu, transition, reveal, gallery, montage, motion: so state đã đổi với [Design System](../../design-system/README.md) và spec sở hữu cùng viewport. Reference (`research/reference-site/`) chỉ research; không copy source, media, logo, font, SVG, URL.
- Logo, token, state, palette, motion, owner fact, route: đọc nguồn do [authority map](../index.md#authority-map) chỉ định; rule này chỉ routing.
- `PRODUCT.md` giữ confirmed product truth. Visual truth ở `design-system/`; `DESIGN.md` và `.impeccable/design.json` được sinh bằng `node scripts/docs/build-design-md.mjs`, không sửa tay và không chạy `impeccable document` ghi đè. Skill `impeccable init` chỉ ghi `PRODUCT.md` khi user explicit authorization. Đổi token/state thì sửa `design-system/`, sinh lại, và cập nhật `.impeccable/surfaces/<slug>.md` liên quan.
- Dùng descriptive Markdown slug; không numeric document code.

## Chú thích thuật ngữ

- **Authority map**: bảng chỉ nguồn chuẩn cho từng loại design fact.
- **Design token**: giá trị tái dùng định nghĩa visual system.
